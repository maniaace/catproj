from fastapi import FastAPI, Depends, HTTPException, status, Form, UploadFile, File
from fastapi.security import HTTPBearer
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Optional
import models
import schemas
import crud
from database import SessionLocal, engine, get_db
from auth import create_access_token, verify_password, get_current_active_user
from rapid7_client import rapid7_client
from insightvm_client import insightvm_client
import logging
import csv
import io
import pandas as pd
from datetime import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

models.Base.metadata.create_all(bind=engine)

# Create default admin user on startup
def create_default_admin():
    db = SessionLocal()
    try:
        admin = db.query(models.User).filter(models.User.username == "admin").first()
        if not admin:
            from auth import get_password_hash
            default_team = models.Team(name="Admin Team", description="Default admin team")
            db.add(default_team)
            db.commit()
            db.refresh(default_team)
            
            admin_user = models.User(
                username="admin",
                email="admin@safaricom.co.ke",
                hashed_password=get_password_hash("admin123"),
                full_name="System Administrator",
                is_active=True,
                is_admin=True,
                team_id=default_team.id
            )
            db.add(admin_user)
            db.commit()
            logger.info("Default admin user created: admin/admin123")
    except Exception as e:
        logger.error(f"Error creating default admin: {e}")
    finally:
        db.close()

create_default_admin()

app = FastAPI(title="Safaricom Asset Inventory API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

security = HTTPBearer()

@app.post("/auth/login", response_model=schemas.Token)
def login(
    username: str = Form(...),
    password: str = Form(...),
    db: Session = Depends(get_db)
):
    user = crud.get_user_by_username(db, username=username)
    if not user or not verify_password(password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/teams/", response_model=schemas.Team)
def create_team(team: schemas.TeamCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_active_user)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return crud.create_team(db=db, team=team)

@app.get("/teams/", response_model=List[schemas.Team])
def read_teams(skip: int = 0, limit: int = 100, parent_team_id: Optional[int] = None, 
               db: Session = Depends(get_db), current_user: models.User = Depends(get_current_active_user)):
    teams = crud.get_teams(db, skip=skip, limit=limit, parent_team_id=parent_team_id)
    return teams

@app.get("/teams/main/", response_model=List[schemas.Team])
def read_main_teams(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_active_user)):
    """Get only main teams (no parent teams)"""
    teams = crud.get_main_teams(db, skip=skip, limit=limit)
    return teams

@app.get("/teams/{team_id}/sub-teams/", response_model=List[schemas.Team])
def read_sub_teams(team_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_active_user)):
    """Get sub-teams for a specific parent team"""
    if not current_user.is_admin and current_user.team_id != team_id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    sub_teams = crud.get_sub_teams(db, team_id)
    return sub_teams

@app.get("/teams/{team_id}/hierarchy/", response_model=schemas.Team)
def read_team_hierarchy(team_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_active_user)):
    """Get team with all its sub-teams"""
    if not current_user.is_admin and current_user.team_id != team_id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    team = crud.get_team_hierarchy(db, team_id)
    if team is None:
        raise HTTPException(status_code=404, detail="Team not found")
    return team

@app.put("/teams/{team_id}/", response_model=schemas.Team)
def update_team(team_id: int, team: schemas.TeamCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_active_user)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    # If creating a sub-team, verify parent exists
    if team.parent_team_id:
        parent = crud.get_team(db, team.parent_team_id)
        if not parent:
            raise HTTPException(status_code=404, detail="Parent team not found")
    
    db_team = crud.update_team(db, team_id, team)
    if db_team is None:
        raise HTTPException(status_code=404, detail="Team not found")
    return db_team

@app.delete("/teams/{team_id}/")
def delete_team(team_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_active_user)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    logger.info(f"Attempting to delete team {team_id}")
    try:
        db_team = crud.delete_team(db, team_id)
        if db_team is None:
            logger.error(f"Team {team_id} not found")
            raise HTTPException(status_code=404, detail="Team not found")
        logger.info(f"Team {team_id} deleted successfully")
        return {"message": "Team deleted successfully"}
    except ValueError as e:
        logger.error(f"Failed to delete team {team_id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error deleting team {team_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.post("/users/", response_model=schemas.User)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_active_user)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    db_user = crud.get_user_by_email(db, email=user.email)
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    return crud.create_user(db=db, user=user)

@app.get("/users/me", response_model=schemas.User)
def read_users_me(current_user: models.User = Depends(get_current_active_user)):
    return current_user

@app.get("/users/", response_model=List[schemas.User])
def read_users(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_active_user)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return crud.get_users(db, skip=skip, limit=limit)

@app.put("/users/{user_id}/", response_model=schemas.User)
def update_user(user_id: int, user: schemas.UserUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_active_user)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    db_user = crud.get_user(db, user_id=user_id)
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return crud.update_user(db=db, user_id=user_id, user_update=user)

@app.delete("/users/{user_id}/")
def delete_user(user_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_active_user)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    db_user = crud.get_user(db, user_id=user_id)
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    crud.delete_user(db=db, user_id=user_id)
    return {"message": "User deleted successfully"}

@app.post("/assets/", response_model=schemas.Asset)
def create_asset(asset: schemas.AssetCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_active_user)):
    if not current_user.is_admin and current_user.team_id != asset.team_id:
        raise HTTPException(status_code=403, detail="Can only create assets for your own team")
    return crud.create_asset(db=db, asset=asset)

@app.get("/assets/", response_model=List[schemas.Asset])
def read_assets(skip: int = 0, limit: int = 100, environment: Optional[str] = None, 
                criticality: Optional[str] = None, db: Session = Depends(get_db), 
                current_user: models.User = Depends(get_current_active_user)):
    team_id = None if current_user.is_admin else current_user.team_id
    assets = crud.get_assets(db, skip=skip, limit=limit, team_id=team_id, 
                            environment=environment, criticality=criticality)
    return assets

@app.get("/assets/stats/")
def get_assets_stats(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_active_user)):
    """Get asset statistics by environment and criticality"""
    team_id = None if current_user.is_admin else current_user.team_id
    stats = crud.get_assets_stats(db, team_id)
    return stats

@app.get("/assets/critical/", response_model=List[schemas.Asset])
def read_critical_assets(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_active_user)):
    """Get all critical assets"""
    team_id = None if current_user.is_admin else current_user.team_id
    assets = crud.get_critical_assets(db, team_id)
    return assets

@app.get("/assets/prod/", response_model=List[schemas.Asset])
def read_prod_assets(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_active_user)):
    """Get all production assets"""
    team_id = None if current_user.is_admin else current_user.team_id
    assets = crud.get_prod_assets(db, team_id)
    return assets

@app.get("/assets/environment/{environment}/", response_model=List[schemas.Asset])
def read_assets_by_environment(environment: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_active_user)):
    """Get assets by environment (dev, uat, prod)"""
    team_id = None if current_user.is_admin else current_user.team_id
    assets = crud.get_assets_by_environment(db, environment, team_id)
    return assets

@app.get("/assets/criticality/{criticality}/", response_model=List[schemas.Asset])
def read_assets_by_criticality(criticality: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_active_user)):
    """Get assets by criticality level"""
    team_id = None if current_user.is_admin else current_user.team_id
    assets = crud.get_assets_by_criticality(db, criticality, team_id)
    return assets

@app.get("/assets/grouped-by-team")
def get_assets_grouped_by_team(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_active_user)):
    """Get assets grouped by team for admin dashboard"""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin privileges required")
    
    from sqlalchemy import func
    
    # Get all teams with their asset counts and details
    teams_with_assets = db.query(models.Team).all()
    
    result = []
    total_assets = 0
    
    for team in teams_with_assets:
        team_assets = db.query(models.Asset).filter(models.Asset.team_id == team.id).all()
        
        # Calculate team statistics
        public_facing_count = len([a for a in team_assets if a.public_facing])
        private_count = len([a for a in team_assets if not a.public_facing])
        
        # Review status counts
        never_reviewed = len([a for a in team_assets if not a.last_reviewed_date])
        overdue_count = 0
        warning_count = 0
        current_count = 0
        
        cutoff_date_60 = datetime.now() - pd.Timedelta(days=60)
        cutoff_date_45 = datetime.now() - pd.Timedelta(days=45)
        
        for asset in team_assets:
            if asset.last_reviewed_date:
                days_since = (datetime.now() - asset.last_reviewed_date).days
                if days_since > 60:
                    overdue_count += 1
                elif days_since > 45:
                    warning_count += 1
                else:
                    current_count += 1
        
        team_data = {
            "team_id": team.id,
            "team_name": team.name,
            "team_description": team.description,
            "total_assets": len(team_assets),
            "public_facing_assets": public_facing_count,
            "private_assets": private_count,
            "review_status": {
                "current": current_count,
                "warning": warning_count, 
                "overdue": overdue_count,
                "never_reviewed": never_reviewed
            },
            "compliance_rate": round(((current_count + warning_count) / len(team_assets) * 100) if team_assets else 100, 2),
            "assets": [
                {
                    "id": asset.id,
                    "name": asset.name,
                    "ip_address": asset.ip_address,
                    "public_facing": asset.public_facing,
                    "last_reviewed_date": asset.last_reviewed_date,
                    "owner_name": asset.owner.full_name if asset.owner else "Unassigned"
                }
                for asset in team_assets
            ]
        }
        
        result.append(team_data)
        total_assets += len(team_assets)
    
    return {
        "total_teams": len(teams_with_assets),
        "total_assets": total_assets,
        "teams": result
    }

@app.get("/assets/{asset_id}", response_model=schemas.Asset)
def read_asset(asset_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_active_user)):
    asset = crud.get_asset(db, asset_id=asset_id)
    if asset is None:
        raise HTTPException(status_code=404, detail="Asset not found")
    if not current_user.is_admin and current_user.team_id != asset.team_id:
        raise HTTPException(status_code=403, detail="Access denied")
    return asset

@app.put("/assets/{asset_id}", response_model=schemas.Asset)
def update_asset(asset_id: int, asset: schemas.AssetCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_active_user)):
    db_asset = crud.get_asset(db, asset_id=asset_id)
    if db_asset is None:
        raise HTTPException(status_code=404, detail="Asset not found")
    if not current_user.is_admin and current_user.team_id != db_asset.team_id:
        raise HTTPException(status_code=403, detail="Access denied")
    return crud.update_asset(db=db, asset_id=asset_id, asset_update=asset)

@app.delete("/assets/{asset_id}")
def delete_asset(asset_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_active_user)):
    db_asset = crud.get_asset(db, asset_id=asset_id)
    if db_asset is None:
        raise HTTPException(status_code=404, detail="Asset not found")
    if not current_user.is_admin and current_user.team_id != db_asset.team_id:
        raise HTTPException(status_code=403, detail="Access denied")
    crud.delete_asset(db=db, asset_id=asset_id)
    return {"message": "Asset deleted successfully"}

@app.post("/assets/{asset_id}/services/", response_model=schemas.Service)
def create_service(asset_id: int, service: schemas.ServiceBase, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_active_user)):
    asset = crud.get_asset(db, asset_id=asset_id)
    if asset is None:
        raise HTTPException(status_code=404, detail="Asset not found")
    if not current_user.is_admin and current_user.team_id != asset.team_id:
        raise HTTPException(status_code=403, detail="Access denied")
    service_create = schemas.ServiceCreate(**service.dict(), asset_id=asset_id)
    return crud.create_service(db=db, service=service_create)

@app.get("/assets/{asset_id}/services/", response_model=List[schemas.Service])
def read_asset_services(asset_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_active_user)):
    asset = crud.get_asset(db, asset_id=asset_id)
    if asset is None:
        raise HTTPException(status_code=404, detail="Asset not found")
    if not current_user.is_admin and current_user.team_id != asset.team_id:
        raise HTTPException(status_code=403, detail="Access denied")
    return crud.get_services_by_asset(db, asset_id=asset_id)

@app.get("/assets/{asset_id}/vulnerabilities/", response_model=List[schemas.Vulnerability])
def read_asset_vulnerabilities(asset_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_active_user)):
    asset = crud.get_asset(db, asset_id=asset_id)
    if asset is None:
        raise HTTPException(status_code=404, detail="Asset not found")
    if not current_user.is_admin and current_user.team_id != asset.team_id:
        raise HTTPException(status_code=403, detail="Access denied")
    return crud.get_vulnerabilities_by_asset(db, asset_id=asset_id)

@app.post("/assets/{asset_id}/scan/")
def start_asset_scan(asset_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_active_user)):
    asset = crud.get_asset(db, asset_id=asset_id)
    if asset is None:
        raise HTTPException(status_code=404, detail="Asset not found")
    if not current_user.is_admin and current_user.team_id != asset.team_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    try:
        rapid7_assets = rapid7_client.search_assets_by_ip(asset.ip_address)
        if not rapid7_assets.get("resources"):
            raise HTTPException(status_code=404, detail="Asset not found in Rapid7")
        
        rapid7_asset = rapid7_assets["resources"][0]
        site_id = rapid7_asset.get("siteId")
        
        scan_result = rapid7_client.start_asset_scan(site_id, [rapid7_asset["id"]])
        
        scan_create = schemas.ScanCreate(asset_id=asset_id)
        db_scan = crud.create_scan(db=db, scan=scan_create, user_id=current_user.id)
        
        return {"message": "Scan started successfully", "scan_id": db_scan.id, "rapid7_scan_id": scan_result.get("id")}
    except Exception as e:
        logger.error(f"Failed to start scan: {e}")
        raise HTTPException(status_code=500, detail="Failed to start scan")

@app.get("/vulnerabilities/team/{team_id}", response_model=List[schemas.Vulnerability])
def read_team_vulnerabilities(team_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_active_user)):
    if not current_user.is_admin and current_user.team_id != team_id:
        raise HTTPException(status_code=403, detail="Access denied")
    return crud.get_vulnerabilities_by_team(db, team_id=team_id)

@app.get("/assets/download-template")
def download_assets_template(current_user: models.User = Depends(get_current_active_user)):
    """Download CSV template for asset upload"""
    # Create CSV template with sample data
    template_data = [
        {
            "name": "Example Server",
            "ip_address": "192.168.1.100",
            "os_version": "Ubuntu 20.04",
            "public_facing": "false",
            "team_id": "1"
        }
    ]
    
    output = io.StringIO()
    fieldnames = ["name", "ip_address", "os_version", "public_facing", "team_id"]
    writer = csv.DictWriter(output, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(template_data)
    
    response = StreamingResponse(
        io.BytesIO(output.getvalue().encode('utf-8')),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=assets_template.csv"}
    )
    return response

@app.get("/assets/export")
def export_assets(
    team_id: Optional[int] = None,
    public_facing: Optional[bool] = None,
    review_status: Optional[str] = None,  # 'current', 'warning', 'overdue', 'never'
    include_services: bool = False,
    include_vulnerabilities: bool = False,
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_active_user)
):
    """Export assets to CSV with filters"""
    from sqlalchemy import and_, or_
    
    # Build query with filters
    query = db.query(models.Asset)
    
    # Apply team filter
    if not current_user.is_admin:
        # Non-admin users can only see their team's assets
        query = query.filter(models.Asset.team_id == current_user.team_id)
    elif team_id:
        # Admin user filtering by specific team
        query = query.filter(models.Asset.team_id == team_id)
    
    # Apply public facing filter
    if public_facing is not None:
        query = query.filter(models.Asset.public_facing == public_facing)
    
    # Apply review status filter
    if review_status:
        cutoff_date_60 = datetime.now() - pd.Timedelta(days=60)
        cutoff_date_45 = datetime.now() - pd.Timedelta(days=45)
        
        if review_status == "never":
            query = query.filter(models.Asset.last_reviewed_date.is_(None))
        elif review_status == "overdue":
            query = query.filter(models.Asset.last_reviewed_date < cutoff_date_60)
        elif review_status == "warning":
            query = query.filter(and_(
                models.Asset.last_reviewed_date >= cutoff_date_60,
                models.Asset.last_reviewed_date < cutoff_date_45
            ))
        elif review_status == "current":
            query = query.filter(models.Asset.last_reviewed_date >= cutoff_date_45)
    
    assets = query.all()
    
    output = io.StringIO()
    
    # Enhanced fieldnames to match portal display
    fieldnames = [
        "Asset ID", "Asset Name", "IP Address", "OS Version", 
        "Public Facing Status", "Team ID", "Team Name", 
        "Owner Name", "Owner Email", "Last Reviewed Date", 
        "Days Since Review", "Review Status", "Created Date", 
        "Last Updated", "Services Count", "Vulnerabilities Count"
    ]
    
    if include_services:
        fieldnames.extend(["Services", "Service Ports"])
    if include_vulnerabilities:
        fieldnames.extend(["Critical Vulnerabilities", "High Vulnerabilities", "Total Vulnerabilities"])
    
    writer = csv.DictWriter(output, fieldnames=fieldnames)
    writer.writeheader()
    
    for asset in assets:
        # Calculate days since review and status
        days_since_review = "Never reviewed"
        review_status_text = "Never Reviewed"
        
        if asset.last_reviewed_date:
            days_since_review = (datetime.now() - asset.last_reviewed_date).days
            if days_since_review > 60:
                review_status_text = "Overdue"
            elif days_since_review > 45:
                review_status_text = "Warning"
            else:
                review_status_text = "Current"
        
        # Get services and vulnerabilities count
        services_count = len(asset.services) if asset.services else 0
        vulnerabilities_count = len(asset.vulnerabilities) if asset.vulnerabilities else 0
        
        row_data = {
            "Asset ID": asset.id,
            "Asset Name": asset.name,
            "IP Address": asset.ip_address,
            "OS Version": asset.os_version or "Not specified",
            "Public Facing Status": "Public (Internet Accessible)" if asset.public_facing else "Private (LAN Only)",
            "Team ID": asset.team_id,
            "Team Name": asset.team.name if asset.team else "Unknown",
            "Owner Name": asset.owner.full_name if asset.owner else "Unassigned",
            "Owner Email": asset.owner.email if asset.owner else "",
            "Last Reviewed Date": asset.last_reviewed_date.strftime('%Y-%m-%d %H:%M:%S') if asset.last_reviewed_date else "",
            "Days Since Review": days_since_review,
            "Review Status": review_status_text,
            "Created Date": asset.created_at.strftime('%Y-%m-%d %H:%M:%S') if asset.created_at else "",
            "Last Updated": asset.updated_at.strftime('%Y-%m-%d %H:%M:%S') if asset.updated_at else "",
            "Services Count": services_count,
            "Vulnerabilities Count": vulnerabilities_count
        }
        
        if include_services and asset.services:
            services_list = ", ".join([s.service_name for s in asset.services])
            ports_list = ", ".join([str(s.port) for s in asset.services if s.port])
            row_data["Services"] = services_list
            row_data["Service Ports"] = ports_list
        elif include_services:
            row_data["Services"] = "No services detected"
            row_data["Service Ports"] = ""
        
        if include_vulnerabilities and asset.vulnerabilities:
            critical_vulns = len([v for v in asset.vulnerabilities if v.severity.lower() == 'critical'])
            high_vulns = len([v for v in asset.vulnerabilities if v.severity.lower() == 'high'])
            row_data["Critical Vulnerabilities"] = critical_vulns
            row_data["High Vulnerabilities"] = high_vulns
            row_data["Total Vulnerabilities"] = vulnerabilities_count
        elif include_vulnerabilities:
            row_data["Critical Vulnerabilities"] = 0
            row_data["High Vulnerabilities"] = 0
            row_data["Total Vulnerabilities"] = 0
        
        writer.writerow(row_data)
    
    # Generate filename with filters
    filename_parts = ["assets_export"]
    if team_id:
        team_name = db.query(models.Team).filter(models.Team.id == team_id).first()
        if team_name:
            filename_parts.append(f"team_{team_name.name.replace(' ', '_')}")
    if public_facing is not None:
        filename_parts.append("public" if public_facing else "private")
    if review_status:
        filename_parts.append(f"review_{review_status}")
    
    filename_parts.append(datetime.now().strftime('%Y%m%d_%H%M%S'))
    filename = "_".join(filename_parts) + ".csv"
    
    response = StreamingResponse(
        io.BytesIO(output.getvalue().encode('utf-8')),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
    return response

@app.post("/assets/upload")
def upload_assets(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Upload assets from CSV file"""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin privileges required for bulk upload")
    
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be a CSV")
    
    try:
        # Read CSV file
        contents = file.file.read()
        df = pd.read_csv(io.BytesIO(contents))
        
        # Validate required columns
        required_columns = ["name", "ip_address", "team_id"]
        missing_columns = [col for col in required_columns if col not in df.columns]
        if missing_columns:
            raise HTTPException(
                status_code=400, 
                detail=f"Missing required columns: {', '.join(missing_columns)}"
            )
        
        created_assets = []
        errors = []
        
        for index, row in df.iterrows():
            try:
                # Convert public_facing to boolean
                public_facing = False
                if 'public_facing' in row and pd.notna(row['public_facing']):
                    public_facing_str = str(row['public_facing']).lower()
                    public_facing = public_facing_str in ['true', '1', 'yes', 'y']
                
                asset_data = schemas.AssetCreate(
                    name=str(row['name']),
                    ip_address=str(row['ip_address']),
                    os_version=str(row['os_version']) if pd.notna(row.get('os_version')) else None,
                    public_facing=public_facing,
                    team_id=int(row['team_id']),
                    owner_id=current_user.id
                )
                
                # Check if team exists
                team = db.query(models.Team).filter(models.Team.id == asset_data.team_id).first()
                if not team:
                    errors.append(f"Row {index + 2}: Team with ID {asset_data.team_id} not found")
                    continue
                
                # Check if asset with same IP already exists
                existing_asset = db.query(models.Asset).filter(models.Asset.ip_address == asset_data.ip_address).first()
                if existing_asset:
                    errors.append(f"Row {index + 2}: Asset with IP {asset_data.ip_address} already exists")
                    continue
                
                created_asset = crud.create_asset(db=db, asset=asset_data)
                created_assets.append(created_asset)
                
            except Exception as e:
                errors.append(f"Row {index + 2}: {str(e)}")
        
        return {
            "message": f"Successfully created {len(created_assets)} assets",
            "created_count": len(created_assets),
            "error_count": len(errors),
            "errors": errors[:10]  # Limit to first 10 errors
        }
        
    except Exception as e:
        logger.error(f"Failed to process CSV upload: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to process CSV file: {str(e)}")
    finally:
        file.file.close()

@app.get("/insightvm/test-connection")
def test_insightvm_connection(current_user: models.User = Depends(get_current_active_user)):
    """Test connectivity to InsightVM API"""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin privileges required")
    
    try:
        result = insightvm_client.test_connection()
        return result
    except Exception as e:
        logger.error(f"Failed to test InsightVM connection: {e}")
        return {
            "status": "failed",
            "message": f"Failed to connect to InsightVM: {str(e)}"
        }

@app.get("/insightvm/assets/")
def get_insightvm_assets(
    page: int = 0, 
    size: int = 100,
    current_user: models.User = Depends(get_current_active_user)
):
    """Get assets from InsightVM"""
    try:
        assets = insightvm_client.get_assets(page=page, size=size)
        return assets
    except Exception as e:
        logger.error(f"Failed to get InsightVM assets: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve assets: {str(e)}")

@app.post("/insightvm/assets/search")
def search_insightvm_assets(
    query: str,
    page: int = 0,
    size: int = 100,
    current_user: models.User = Depends(get_current_active_user)
):
    """Search assets in InsightVM"""
    try:
        results = insightvm_client.search_assets(query=query, page=page, size=size)
        return results
    except Exception as e:
        logger.error(f"Failed to search InsightVM assets: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to search assets: {str(e)}")

@app.get("/insightvm/assets/{asset_id}")
def get_insightvm_asset(
    asset_id: int,
    current_user: models.User = Depends(get_current_active_user)
):
    """Get specific asset from InsightVM"""
    try:
        asset = insightvm_client.get_asset(asset_id)
        return asset
    except Exception as e:
        logger.error(f"Failed to get InsightVM asset {asset_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve asset: {str(e)}")

@app.get("/insightvm/sites/")
def get_insightvm_sites(
    page: int = 0,
    size: int = 100,
    current_user: models.User = Depends(get_current_active_user)
):
    """Get sites from InsightVM"""
    try:
        sites = insightvm_client.get_sites(page=page, size=size)
        return sites
    except Exception as e:
        logger.error(f"Failed to get InsightVM sites: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve sites: {str(e)}")

@app.get("/insightvm/vulnerabilities/")
def get_insightvm_vulnerabilities(
    page: int = 0,
    size: int = 100,
    severity: Optional[str] = None,
    current_user: models.User = Depends(get_current_active_user)
):
    """Get vulnerabilities from InsightVM"""
    try:
        vulns = insightvm_client.get_vulnerabilities(page=page, size=size, severity=severity)
        return vulns
    except Exception as e:
        logger.error(f"Failed to get InsightVM vulnerabilities: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve vulnerabilities: {str(e)}")

@app.get("/insightvm/vulnerabilities/exploitable")
def get_insightvm_exploitable_vulnerabilities(
    page: int = 0,
    size: int = 100,
    current_user: models.User = Depends(get_current_active_user)
):
    """Get exploitable vulnerabilities from InsightVM"""
    try:
        vulns = insightvm_client.get_exploitable_vulnerabilities(page=page, size=size)
        return vulns
    except Exception as e:
        logger.error(f"Failed to get exploitable vulnerabilities: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve exploitable vulnerabilities: {str(e)}")

@app.post("/insightvm/scans/site/{site_id}")
def start_insightvm_site_scan(
    site_id: int,
    scan_name: Optional[str] = None,
    current_user: models.User = Depends(get_current_active_user)
):
    """Start a scan for a site in InsightVM"""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin privileges required")
    
    try:
        result = insightvm_client.start_site_scan(site_id, scan_name)
        return {"message": "Site scan started successfully", "scan_data": result}
    except Exception as e:
        logger.error(f"Failed to start site scan: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to start site scan: {str(e)}")

@app.get("/insightvm/scans/")
def get_insightvm_scans(
    page: int = 0,
    size: int = 100,
    active: Optional[bool] = None,
    current_user: models.User = Depends(get_current_active_user)
):
    """Get scans from InsightVM"""
    try:
        scans = insightvm_client.get_scans(page=page, size=size, active=active)
        return scans
    except Exception as e:
        logger.error(f"Failed to get InsightVM scans: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve scans: {str(e)}")

@app.get("/rapid7/apps/")
def get_apps(current_user: models.User = Depends(get_current_active_user)):
    try:
        apps = rapid7_client.get_apps()
        return apps
    except Exception as e:
        logger.error(f"Failed to get applications: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve applications")

@app.post("/rapid7/apps/")
def create_app(
    name: str, 
    description: str = None,
    current_user: models.User = Depends(get_current_active_user)
):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin privileges required")
    try:
        app = rapid7_client.create_app(name, description)
        return {"message": "Application created", "app": app}
    except Exception as e:
        logger.error(f"Failed to create application: {e}")
        raise HTTPException(status_code=500, detail="Failed to create application")

@app.get("/rapid7/attack-templates/")
def get_attack_templates(current_user: models.User = Depends(get_current_active_user)):
    try:
        templates = rapid7_client.get_attack_templates()
        return templates
    except Exception as e:
        logger.error(f"Failed to get attack templates: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve attack templates")

@app.post("/rapid7/scan-configs/")
def create_scan_config(
    app_id: str,
    name: str,
    attack_template_id: str = None,
    current_user: models.User = Depends(get_current_active_user)
):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin privileges required")
    try:
        scan_config = rapid7_client.create_scan_config(app_id, name, attack_template_id)
        return {"message": "Scan configuration created", "scan_config": scan_config}
    except Exception as e:
        logger.error(f"Failed to create scan configuration: {e}")
        raise HTTPException(status_code=500, detail="Failed to create scan configuration")

@app.post("/rapid7/scans/")
def start_scan(
    scan_config_id: str,
    current_user: models.User = Depends(get_current_active_user)
):
    try:
        scan_result = rapid7_client.start_scan(scan_config_id)
        return {"message": "Scan started", "scan_data": scan_result}
    except Exception as e:
        logger.error(f"Failed to start scan: {e}")
        raise HTTPException(status_code=500, detail="Failed to start scan")

@app.post("/rapid7/scans/{scan_id}/pause/")
def pause_scan(scan_id: str, current_user: models.User = Depends(get_current_active_user)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin privileges required")
    try:
        result = rapid7_client.pause_scan(scan_id)
        return {"message": "Scan paused", "result": result}
    except Exception as e:
        logger.error(f"Failed to pause scan: {e}")
        raise HTTPException(status_code=500, detail="Failed to pause scan")

@app.post("/rapid7/scans/{scan_id}/resume/")
def resume_scan(scan_id: str, current_user: models.User = Depends(get_current_active_user)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin privileges required")
    try:
        result = rapid7_client.resume_scan(scan_id)
        return {"message": "Scan resumed", "result": result}
    except Exception as e:
        logger.error(f"Failed to resume scan: {e}")
        raise HTTPException(status_code=500, detail="Failed to resume scan")

@app.post("/rapid7/scans/{scan_id}/stop/")
def stop_scan(scan_id: str, current_user: models.User = Depends(get_current_active_user)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin privileges required")
    try:
        result = rapid7_client.stop_scan(scan_id)
        return {"message": "Scan stopped", "result": result}
    except Exception as e:
        logger.error(f"Failed to stop scan: {e}")
        raise HTTPException(status_code=500, detail="Failed to stop scan")

@app.get("/rapid7/scans/{scan_id}/status/")
def get_scan_status(scan_id: str, current_user: models.User = Depends(get_current_active_user)):
    try:
        status = rapid7_client.get_scan_status(scan_id)
        return status
    except Exception as e:
        logger.error(f"Failed to get scan status: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve scan status")

@app.get("/rapid7/apps/{app_id}/scan-history/")
def get_app_scan_history(app_id: str, current_user: models.User = Depends(get_current_active_user)):
    try:
        history = rapid7_client.get_app_scan_history(app_id)
        return history
    except Exception as e:
        logger.error(f"Failed to get app scan history: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve scan history")

@app.get("/rapid7/scans/")
def get_scans(app_id: str = None, current_user: models.User = Depends(get_current_active_user)):
    try:
        scans = rapid7_client.get_scans(app_id)
        return scans
    except Exception as e:
        logger.error(f"Failed to get scans: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve scans")

@app.get("/rapid7/vulnerabilities/exploitable/")
def get_exploitable_vulnerabilities(
    app_id: str = None, 
    current_user: models.User = Depends(get_current_active_user)
):
    try:
        vulns = rapid7_client.get_exploitable_vulnerabilities(app_id)
        return vulns
    except Exception as e:
        logger.error(f"Failed to get exploitable vulnerabilities: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve exploitable vulnerabilities")

@app.get("/rapid7/vulnerabilities/{vuln_id}/exploits/")
def get_vulnerability_exploits(vuln_id: str, current_user: models.User = Depends(get_current_active_user)):
    try:
        exploits = rapid7_client.get_vulnerability_exploits(vuln_id)
        return exploits
    except Exception as e:
        logger.error(f"Failed to get vulnerability exploits: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve vulnerability exploits")

@app.post("/rapid7/vulnerabilities/{vuln_id}/validate/")
def validate_vulnerability(
    vuln_id: str, 
    validation_status: str,
    current_user: models.User = Depends(get_current_active_user)
):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin privileges required for vulnerability validation")
    try:
        result = rapid7_client.validate_vulnerability(vuln_id, validation_status)
        return {"message": "Vulnerability validation updated", "result": result}
    except Exception as e:
        logger.error(f"Failed to validate vulnerability: {e}")
        raise HTTPException(status_code=500, detail="Failed to validate vulnerability")

@app.get("/rapid7/apps/{app_id}/vulnerabilities/")
def get_app_vulnerabilities(app_id: str, current_user: models.User = Depends(get_current_active_user)):
    try:
        vulns = rapid7_client.get_app_vulnerabilities(app_id)
        return vulns
    except Exception as e:
        logger.error(f"Failed to get app vulnerabilities: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve app vulnerabilities")

@app.post("/rapid7/logs/search/")
def search_logs(
    query: str, 
    time_range: str = "1h", 
    log_sets: List[str] = None,
    current_user: models.User = Depends(get_current_active_user)
):
    try:
        results = rapid7_client.search_logs(query, time_range, log_sets)
        return results
    except Exception as e:
        logger.error(f"Failed to search logs: {e}")
        raise HTTPException(status_code=500, detail="Failed to search logs")

@app.get("/rapid7/targets/")
def get_targets(app_id: str = None, current_user: models.User = Depends(get_current_active_user)):
    try:
        targets = rapid7_client.get_targets(app_id)
        return targets
    except Exception as e:
        logger.error(f"Failed to get targets: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve targets")

@app.post("/rapid7/targets/")
def create_target(
    app_id: str,
    address: str,
    name: str = None,
    current_user: models.User = Depends(get_current_active_user)
):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin privileges required")
    try:
        target = rapid7_client.create_target(app_id, address, name)
        return {"message": "Target created", "target": target}
    except Exception as e:
        logger.error(f"Failed to create target: {e}")
        raise HTTPException(status_code=500, detail="Failed to create target")

@app.post("/rapid7/scans/{scan_id}/report/")
def generate_scan_report(
    scan_id: str, 
    report_format: str = "pdf",
    current_user: models.User = Depends(get_current_active_user)
):
    try:
        report = rapid7_client.generate_scan_report(scan_id, report_format)
        return {"message": "Report generation initiated", "report": report}
    except Exception as e:
        logger.error(f"Failed to generate scan report: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate scan report")

@app.get("/rapid7/vulnerabilities/categories/")
def get_vulnerability_categories(current_user: models.User = Depends(get_current_active_user)):
    try:
        categories = rapid7_client.get_vulnerability_categories()
        return categories
    except Exception as e:
        logger.error(f"Failed to get vulnerability categories: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve vulnerability categories")

@app.post("/rapid7/vulnerabilities/search-by-severity/")
def search_vulnerabilities_by_severity(
    severity: str = "HIGH",
    app_id: str = None,
    current_user: models.User = Depends(get_current_active_user)
):
    try:
        vulns = rapid7_client.search_vulnerabilities_by_severity(severity, app_id)
        return vulns
    except Exception as e:
        logger.error(f"Failed to search vulnerabilities by severity: {e}")
        raise HTTPException(status_code=500, detail="Failed to search vulnerabilities by severity")

@app.get("/rapid7/vulnerabilities/{vuln_id}/details/")
def get_vulnerability_details(vuln_id: str, current_user: models.User = Depends(get_current_active_user)):
    try:
        details = rapid7_client.get_vulnerability_details(vuln_id)
        return details
    except Exception as e:
        logger.error(f"Failed to get vulnerability details: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve vulnerability details")


@app.post("/assets/{asset_id}/review")
def mark_asset_reviewed(
    asset_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Mark an asset as reviewed"""
    asset = crud.get_asset(db, asset_id=asset_id)
    if asset is None:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    if not current_user.is_admin and current_user.team_id != asset.team_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    asset.last_reviewed_date = datetime.now()
    db.commit()
    
    return {"message": "Asset marked as reviewed", "last_reviewed_date": asset.last_reviewed_date}

@app.get("/assets/overdue-reviews")
def get_overdue_assets(
    days_threshold: int = 60,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Get assets that haven't been reviewed in specified days"""
    from sqlalchemy import or_
    
    cutoff_date = datetime.now() - pd.Timedelta(days=days_threshold)
    
    query = db.query(models.Asset).filter(
        or_(
            models.Asset.last_reviewed_date.is_(None),
            models.Asset.last_reviewed_date < cutoff_date
        )
    )
    
    if not current_user.is_admin:
        query = query.filter(models.Asset.team_id == current_user.team_id)
    
    overdue_assets = query.all()
    
    return {
        "overdue_count": len(overdue_assets),
        "threshold_days": days_threshold,
        "assets": [
            {
                "id": asset.id,
                "name": asset.name,
                "ip_address": asset.ip_address,
                "team_name": asset.team.name if asset.team else "Unknown",
                "owner_name": asset.owner.full_name if asset.owner else "Unassigned",
                "last_reviewed_date": asset.last_reviewed_date,
                "days_overdue": (datetime.now() - asset.last_reviewed_date).days if asset.last_reviewed_date else "Never reviewed"
            }
            for asset in overdue_assets
        ]
    }

@app.get("/teams/review-compliance")
def get_team_review_compliance(
    days_threshold: int = 60,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Get team compliance status for asset reviews"""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin privileges required")
    
    from sqlalchemy import func, or_
    
    cutoff_date = datetime.now() - pd.Timedelta(days=days_threshold)
    
    # Get team stats
    team_stats = db.query(
        models.Team.id,
        models.Team.name,
        func.count(models.Asset.id).label('total_assets'),
        func.sum(
            func.case(
                (or_(
                    models.Asset.last_reviewed_date.is_(None),
                    models.Asset.last_reviewed_date < cutoff_date
                ), 1),
                else_=0
            )
        ).label('overdue_assets')
    ).outerjoin(models.Asset).group_by(models.Team.id, models.Team.name).all()
    
    compliance_data = []
    flagged_teams = []
    
    for team_id, team_name, total_assets, overdue_assets in team_stats:
        total_assets = total_assets or 0
        overdue_assets = overdue_assets or 0
        compliance_rate = ((total_assets - overdue_assets) / total_assets * 100) if total_assets > 0 else 100
        
        team_data = {
            "team_id": team_id,
            "team_name": team_name,
            "total_assets": total_assets,
            "overdue_assets": overdue_assets,
            "compliance_rate": round(compliance_rate, 2),
            "status": "compliant" if compliance_rate >= 80 else "flagged"
        }
        
        compliance_data.append(team_data)
        
        if compliance_rate < 80:
            flagged_teams.append(team_data)
    
    return {
        "threshold_days": days_threshold,
        "total_teams": len(compliance_data),
        "flagged_teams_count": len(flagged_teams),
        "teams": compliance_data,
        "flagged_teams": flagged_teams
    }

# =============================================
# InsightVM Integration Endpoints 
# =============================================

# Dashboard Data Aggregation
@app.get("/insightvm/dashboard/stats")
def get_insightvm_dashboard_stats(current_user: models.User = Depends(get_current_active_user)):
    """Get aggregated dashboard statistics from InsightVM"""
    try:
        # Get vulnerability statistics
        vuln_stats = insightvm_client.get_vulnerabilities(size=0)  # Get just counts
        critical_vulns = insightvm_client.search_vulnerabilities_by_severity("critical", size=0)
        high_vulns = insightvm_client.search_vulnerabilities_by_severity("high", size=0)
        exploitable_vulns = insightvm_client.get_exploitable_vulnerabilities(size=0)
        
        # Get site statistics
        sites_data = insightvm_client.get_sites(size=0)
        
        # Get asset statistics
        assets_data = insightvm_client.get_assets(size=0)
        
        # Get scan statistics
        scans_data = insightvm_client.get_scans(size=0, active=True)
        
        return {
            "vulnerabilities": {
                "total": vuln_stats.get("page", {}).get("totalResources", 0),
                "critical": critical_vulns.get("page", {}).get("totalResources", 0),
                "high": high_vulns.get("page", {}).get("totalResources", 0),
                "exploitable": exploitable_vulns.get("page", {}).get("totalResources", 0)
            },
            "sites": {
                "total": sites_data.get("page", {}).get("totalResources", 0)
            },
            "assets": {
                "total": assets_data.get("page", {}).get("totalResources", 0)
            },
            "scans": {
                "active": scans_data.get("page", {}).get("totalResources", 0)
            }
        }
    except Exception as e:
        logger.error(f"Failed to get InsightVM dashboard stats: {e}")
        return {"error": str(e)}

@app.get("/insightvm/vulnerabilities/summary")
def get_vulnerabilities_summary(
    page: int = 0, 
    size: int = 100,
    severity: Optional[str] = None,
    current_user: models.User = Depends(get_current_active_user)
):
    """Get vulnerability summary with filtering"""
    try:
        # Limit size to prevent 422 errors
        size = min(size, 500)
        
        if severity:
            result = insightvm_client.search_vulnerabilities_by_severity(severity, page, size)
        else:
            result = insightvm_client.get_vulnerabilities(page, size)
        
        # Check if result contains error
        if isinstance(result, dict) and result.get("error"):
            logger.error(f"InsightVM API error: {result['error']}")
            return {
                "error": result["error"],
                "vulnerabilities": [],
                "page": {"number": page, "size": size, "totalResources": 0},
                "totalResources": 0
            }
        
        # Process and enrich vulnerability data
        vulnerabilities = []
        resources = result.get("resources", []) if result else []
        
        for vuln in resources:
            try:
                vulnerability_data = {
                    "id": vuln.get("id"),
                    "title": vuln.get("title", "Unknown Vulnerability"),
                    "description": (vuln.get("description", {}).get("text", "") or "")[:200] + "...",
                    "severity": vuln.get("severity", "Unknown"),
                    "cvss_score": vuln.get("cvss", {}).get("v3", {}).get("score", 0),
                    "published": vuln.get("published"),
                    "modified": vuln.get("modified"),
                    "exploits": len(vuln.get("exploits", {}).get("resources", [])),
                    "malware_kits": len(vuln.get("malwareKits", {}).get("resources", [])),
                    "risk_score": vuln.get("riskScore", 0),
                    "categories": [cat.get("name") for cat in vuln.get("categories", [])]
                }
                vulnerabilities.append(vulnerability_data)
            except Exception as ve:
                logger.error(f"Error processing vulnerability {vuln.get('id', 'unknown')}: {ve}")
                continue
        
        return {
            "vulnerabilities": vulnerabilities,
            "page": result.get("page", {"number": page, "size": size, "totalResources": len(vulnerabilities)}),
            "totalResources": result.get("page", {}).get("totalResources", len(vulnerabilities))
        }
    except Exception as e:
        logger.error(f"Failed to get vulnerabilities summary: {e}")
        return {
            "error": f"InsightVM API error: {str(e)}",
            "vulnerabilities": [],
            "page": {"number": page, "size": size, "totalResources": 0},
            "totalResources": 0
        }

@app.get("/insightvm/sites/overview")
def get_sites_overview(
    page: int = 0, 
    size: int = 100,
    current_user: models.User = Depends(get_current_active_user)
):
    """Get sites overview with vulnerability and scan statistics"""
    try:
        sites_result = insightvm_client.get_sites(page, size)
        
        sites_overview = []
        for site in sites_result.get("resources", []):
            site_id = site.get("id")
            
            # Get site assets count
            assets_count = 0
            if site_id:
                try:
                    assets_result = insightvm_client.get_site_assets(site_id, size=0)
                    assets_count = assets_result.get("page", {}).get("totalResources", 0)
                except:
                    pass
            
            site_data = {
                "id": site_id,
                "name": site.get("name"),
                "description": site.get("description", ""),
                "type": site.get("type"),
                "importance": site.get("importance", "normal"),
                "scan_template": site.get("scanTemplate"),
                "assets_count": assets_count,
                "vulnerabilities": {
                    "critical": site.get("vulnerabilities", {}).get("critical", 0),
                    "severe": site.get("vulnerabilities", {}).get("severe", 0),
                    "moderate": site.get("vulnerabilities", {}).get("moderate", 0),
                    "total": site.get("vulnerabilities", {}).get("total", 0)
                },
                "last_scan": site.get("lastScanTime"),
                "risk_score": site.get("riskScore", 0),
                "created": site.get("createdTime"),
                "targets": site.get("includedTargets", {}).get("addresses", [])
            }
            sites_overview.append(site_data)
        
        return {
            "sites": sites_overview,
            "page": sites_result.get("page", {}),
            "totalResources": sites_result.get("page", {}).get("totalResources", 0)
        }
    except Exception as e:
        logger.error(f"Failed to get sites overview: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/insightvm/assets/vulnerabilities")
def get_assets_with_vulnerabilities(
    page: int = 0, 
    size: int = 100,
    severity_filter: Optional[str] = None,
    current_user: models.User = Depends(get_current_active_user)
):
    """Get assets with their vulnerability details"""
    try:
        # Limit size to prevent 422 errors
        size = min(size, 100)
        
        assets_result = insightvm_client.get_assets(page, size)
        
        # Check if result contains error
        if isinstance(assets_result, dict) and assets_result.get("error"):
            logger.error(f"InsightVM API error: {assets_result['error']}")
            return {
                "error": assets_result["error"],
                "assets": [],
                "page": {"number": page, "size": size, "totalResources": 0},
                "totalResources": 0
            }
        
        assets_with_vulns = []
        resources = assets_result.get("resources", []) if assets_result else []
        
        for asset in resources:
            try:
                asset_id = asset.get("id")
                
                # Get asset vulnerabilities
                vulns_summary = {"critical": 0, "high": 0, "medium": 0, "low": 0, "total": 0}
                recent_vulns = []
                
                if asset_id:
                    try:
                        vulns_result = insightvm_client.get_asset_vulnerabilities(asset_id, size=50)
                        
                        if vulns_result and not vulns_result.get("error"):
                            for vuln in vulns_result.get("resources", []):
                                severity = vuln.get("severity", "").lower()
                                if severity == "critical":
                                    vulns_summary["critical"] += 1
                                elif severity in ["severe", "high"]:
                                    vulns_summary["high"] += 1
                                elif severity in ["moderate", "medium"]:
                                    vulns_summary["medium"] += 1
                                elif severity == "low":
                                    vulns_summary["low"] += 1
                                vulns_summary["total"] += 1
                                
                                if len(recent_vulns) < 5:
                                    recent_vulns.append({
                                        "id": vuln.get("id"),
                                        "title": vuln.get("title", "Unknown Vulnerability"),
                                        "severity": vuln.get("severity", "Unknown"),
                                        "cvss_score": vuln.get("cvss", {}).get("v3", {}).get("score", 0)
                                    })
                    except Exception as e:
                        logger.error(f"Failed to get vulnerabilities for asset {asset_id}: {e}")
                
                # Skip assets with no vulnerabilities if severity filter is applied
                if severity_filter and vulns_summary["total"] == 0:
                    continue
                
                asset_data = {
                    "id": asset_id,
                    "ip": asset.get("ip", "Unknown"),
                    "hostName": asset.get("hostName") or asset.get("hostname", ""),
                    "os": asset.get("os") or asset.get("operatingSystem", "Unknown"),
                    "riskScore": asset.get("riskScore", 0),
                    "vulnerabilities": vulns_summary,
                    "recentVulnerabilities": recent_vulns,
                    "lastScan": asset.get("lastScanTime") or asset.get("lastScanDate"),
                    "scanStatus": asset.get("scanStatus", "unknown"),
                    "services": [
                        {
                            "name": service.get("name", ""),
                            "port": service.get("port", 0),
                            "protocol": service.get("protocol", "")
                        }
                        for service in asset.get("services", {}).get("resources", [])[:5]
                    ]
                }
                assets_with_vulns.append(asset_data)
                
            except Exception as ae:
                logger.error(f"Error processing asset {asset.get('id', 'unknown')}: {ae}")
                continue
        
        return {
            "assets": assets_with_vulns,
            "page": assets_result.get("page", {"number": page, "size": size, "totalResources": len(assets_with_vulns)}),
            "totalResources": assets_result.get("page", {}).get("totalResources", len(assets_with_vulns))
        }
    except Exception as e:
        logger.error(f"Failed to get assets with vulnerabilities: {e}")
        return {
            "error": f"InsightVM API error: {str(e)}",
            "assets": [],
            "page": {"number": page, "size": size, "totalResources": 0},
            "totalResources": 0
        }

@app.get("/insightvm/assets/assessed")
def get_assessed_assets_from_insightvm(
    page: int = 0, 
    size: int = 100,
    current_user: models.User = Depends(get_current_active_user)
):
    """Get assessed assets from InsightVM with detailed information"""
    try:
        # Limit size to prevent 422 errors
        size = min(size, 500)
        
        logger.info(f"Fetching assessed assets from InsightVM: page={page}, size={size}")
        
        # First test the connection
        connection_test = insightvm_client.test_connection()
        if connection_test.get("status") != "connected":
            logger.error(f"InsightVM connection failed: {connection_test}")
            return {
                "error": f"InsightVM connection failed: {connection_test.get('message', 'Unknown error')}",
                "assets": [],
                "page": {"number": page, "size": size, "totalResources": 0},
                "totalResources": 0
            }
        
        assessed_assets_result = insightvm_client.get_assessed_assets(page, size)
        logger.info(f"InsightVM assessed assets response: {type(assessed_assets_result)}")
        
        # Check if result contains error
        if isinstance(assessed_assets_result, dict) and assessed_assets_result.get("error"):
            logger.error(f"InsightVM API error: {assessed_assets_result['error']}")
            return {
                "error": assessed_assets_result["error"],
                "assets": [],
                "page": {"number": page, "size": size, "totalResources": 0},
                "totalResources": 0
            }
        
        enhanced_assets = []
        resources = assessed_assets_result.get("resources", []) if assessed_assets_result else []
        
        for asset in resources:
            try:
                asset_id = asset.get("id")
                
                # Get basic asset info
                asset_details = {
                    "id": asset_id,
                    "ip": asset.get("ip", "Unknown"),
                    "hostName": asset.get("hostName") or asset.get("hostname", ""),
                    "mac": asset.get("mac", ""),
                    "os": asset.get("os") or asset.get("operatingSystem", {}).get("description", "Unknown"),
                    "osFamily": asset.get("operatingSystem", {}).get("family", ""),
                    "riskScore": asset.get("riskScore", 0),
                    "assessments": asset.get("assessments", {}),
                    "lastScanDate": asset.get("lastScanDate"),
                    "lastScanId": asset.get("lastScanId"),
                    "scanStatus": asset.get("scanStatus", "unknown"),
                    
                    # Additional InsightVM specific data
                    "type": asset.get("type", "unknown"),
                    "criticalityTag": asset.get("criticalityTag"),
                    "rawRiskScore": asset.get("rawRiskScore", 0),
                    "tags": [tag.get("name") for tag in asset.get("tags", [])],
                    
                    # Vulnerability summary
                    "vulnerabilities": {
                        "critical": asset.get("vulnerabilities", {}).get("critical", 0),
                        "severe": asset.get("vulnerabilities", {}).get("severe", 0),
                        "moderate": asset.get("vulnerabilities", {}).get("moderate", 0),
                        "total": asset.get("vulnerabilities", {}).get("total", 0)
                    },
                    
                    # Service information
                    "services": [
                        {
                            "name": service.get("name", ""),
                            "port": service.get("port", 0),
                            "protocol": service.get("protocol", ""),
                            "product": service.get("product", ""),
                            "version": service.get("version", "")
                        }
                        for service in asset.get("services", [])[:10]  # Limit to 10 services
                    ],
                    
                    # Software information
                    "software": [
                        {
                            "name": software.get("product", ""),
                            "vendor": software.get("vendor", ""),
                            "version": software.get("version", ""),
                            "family": software.get("family", "")
                        }
                        for software in asset.get("software", [])[:10]  # Limit to 10 software items
                    ],
                    
                    # Network interfaces
                    "addresses": [
                        {
                            "ip": addr.get("ip", ""),
                            "mac": addr.get("mac", "")
                        }
                        for addr in asset.get("addresses", [])
                    ]
                }
                
                enhanced_assets.append(asset_details)
                
            except Exception as ae:
                logger.error(f"Error processing assessed asset {asset.get('id', 'unknown')}: {ae}")
                continue
        
        return {
            "assets": enhanced_assets,
            "page": assessed_assets_result.get("page", {"number": page, "size": size, "totalResources": len(enhanced_assets)}),
            "totalResources": assessed_assets_result.get("page", {}).get("totalResources", len(enhanced_assets)),
            "summary": {
                "total_assessed": len(enhanced_assets),
                "avg_risk_score": sum(asset.get("riskScore", 0) for asset in enhanced_assets) / len(enhanced_assets) if enhanced_assets else 0,
                "high_risk_count": len([asset for asset in enhanced_assets if asset.get("riskScore", 0) > 750]),
                "critical_vulns": sum(asset.get("vulnerabilities", {}).get("critical", 0) for asset in enhanced_assets),
                "total_vulns": sum(asset.get("vulnerabilities", {}).get("total", 0) for asset in enhanced_assets)
            }
        }
    except Exception as e:
        logger.error(f"Failed to get assessed assets: {e}")
        return {
            "error": f"InsightVM API error: {str(e)}",
            "assets": [],
            "page": {"number": page, "size": size, "totalResources": 0},
            "totalResources": 0
        }

@app.get("/insightvm/test-assessed-assets")
def test_assessed_assets_endpoint(current_user: models.User = Depends(get_current_active_user)):
    """Test endpoint to debug assessed assets functionality"""
    try:
        # Test connection first
        connection_test = insightvm_client.test_connection()
        if connection_test.get("status") != "connected":
            return {"error": "InsightVM connection failed", "details": connection_test}
        
        # Test basic assets call
        basic_assets = insightvm_client.get_assets(0, 10)
        
        # Test assessed assets call
        assessed_assets = insightvm_client.get_assessed_assets(0, 10)
        
        return {
            "connection": connection_test,
            "basic_assets_response": basic_assets,
            "basic_assets_count": len(basic_assets.get("resources", [])),
            "basic_assets_error": basic_assets.get("error"),
            "assessed_assets_response": assessed_assets,
            "assessed_assets_count": len(assessed_assets.get("resources", [])),
            "assessed_assets_error": assessed_assets.get("error"),
            "sample_asset": basic_assets.get("resources", [{}])[0] if basic_assets.get("resources") else None
        }
    except Exception as e:
        logger.error(f"Test endpoint failed: {e}")
        return {"error": f"Test failed: {str(e)}"}

@app.get("/insightvm/reports")
def get_insightvm_reports(
    page: int = 0,
    size: int = 100,
    current_user: models.User = Depends(get_current_active_user)
):
    """Get available reports from InsightVM"""
    try:
        size = min(size, 500)
        
        # Test connection first
        connection_test = insightvm_client.test_connection()
        if connection_test.get("status") != "connected":
            return {
                "error": f"InsightVM connection failed: {connection_test.get('message', 'Unknown error')}",
                "reports": [],
                "page": {"number": page, "size": size, "totalResources": 0}
            }
        
        reports_result = insightvm_client.get_reports(page, size)
        
        if reports_result.get("error"):
            return {
                "error": reports_result["error"],
                "reports": [],
                "page": {"number": page, "size": size, "totalResources": 0}
            }
        
        reports = []
        for report in reports_result.get("resources", []):
            reports.append({
                "id": report.get("id"),
                "name": report.get("name"),
                "format": report.get("format"),
                "template": report.get("template"),
                "description": report.get("description", ""),
                "created": report.get("created"),
                "last_generated": report.get("last_generated"),
                "scope": report.get("scope", {}),
                "status": report.get("status", "unknown")
            })
        
        return {
            "reports": reports,
            "page": reports_result.get("page", {"number": page, "size": size, "totalResources": len(reports)}),
            "totalResources": reports_result.get("page", {}).get("totalResources", len(reports))
        }
    except Exception as e:
        logger.error(f"Failed to get InsightVM reports: {e}")
        return {
            "error": f"Failed to get InsightVM reports: {str(e)}",
            "reports": [],
            "page": {"number": page, "size": size, "totalResources": 0}
        }

@app.get("/insightvm/reports/{report_id}/history")
def get_insightvm_report_history(
    report_id: int,
    page: int = 0,
    size: int = 100,
    current_user: models.User = Depends(get_current_active_user)
):
    """Get history/instances of a specific report"""
    try:
        size = min(size, 500)
        
        history_result = insightvm_client.get_report_instances(report_id, page, size)
        
        if history_result.get("error"):
            return {
                "error": history_result["error"],
                "instances": [],
                "page": {"number": page, "size": size, "totalResources": 0}
            }
        
        instances = []
        for instance in history_result.get("resources", []):
            instances.append({
                "id": instance.get("id"),
                "report_id": report_id,
                "name": instance.get("name"),
                "status": instance.get("status"),
                "created": instance.get("created"),
                "started": instance.get("started"),
                "completed": instance.get("completed"),
                "size": instance.get("size"),
                "format": instance.get("format")
            })
        
        return {
            "instances": instances,
            "page": history_result.get("page", {"number": page, "size": size, "totalResources": len(instances)}),
            "totalResources": history_result.get("page", {}).get("totalResources", len(instances))
        }
    except Exception as e:
        logger.error(f"Failed to get report history: {e}")
        return {
            "error": f"Failed to get report history: {str(e)}",
            "instances": [],
            "page": {"number": page, "size": size, "totalResources": 0}
        }

@app.post("/insightvm/reports/{report_id}/generate")
def generate_insightvm_report(
    report_id: int,
    request_data: dict,
    current_user: models.User = Depends(get_current_active_user)
):
    """Generate a new instance of a report"""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin privileges required")
    
    try:
        report_name = request_data.get("name")
        report_format = request_data.get("format", "pdf")
        
        result = insightvm_client.generate_report(report_id, report_name, report_format)
        
        if result.get("error"):
            return {"error": result["error"]}
        
        return {
            "message": "Report generation started",
            "instance_id": result.get("id"),
            "status": result.get("status"),
            "report_id": report_id
        }
    except Exception as e:
        logger.error(f"Failed to generate report: {e}")
        return {"error": f"Failed to generate report: {str(e)}"}

@app.get("/insightvm/reports/{report_id}/templates")
def get_insightvm_report_templates(
    page: int = 0,
    size: int = 100,
    current_user: models.User = Depends(get_current_active_user)
):
    """Get available report templates"""
    try:
        size = min(size, 500)
        
        templates_result = insightvm_client.get_report_templates(page, size)
        
        if templates_result.get("error"):
            return {
                "error": templates_result["error"],
                "templates": [],
                "page": {"number": page, "size": size, "totalResources": 0}
            }
        
        templates = []
        for template in templates_result.get("resources", []):
            templates.append({
                "id": template.get("id"),
                "name": template.get("name"),
                "description": template.get("description", ""),
                "type": template.get("type"),
                "builtin": template.get("builtin", False),
                "created": template.get("created"),
                "scope": template.get("scope", {})
            })
        
        return {
            "templates": templates,
            "page": templates_result.get("page", {"number": page, "size": size, "totalResources": len(templates)}),
            "totalResources": templates_result.get("page", {}).get("totalResources", len(templates))
        }
    except Exception as e:
        logger.error(f"Failed to get report templates: {e}")
        return {
            "error": f"Failed to get report templates: {str(e)}",
            "templates": [],
            "page": {"number": page, "size": size, "totalResources": 0}
        }

@app.get("/insightvm/vulnerability-trends")
def get_vulnerability_trends(
    days: int = 30,
    current_user: models.User = Depends(get_current_active_user)
):
    """Get vulnerability trends over time"""
    try:
        # Get vulnerabilities by severity
        critical_vulns = insightvm_client.search_vulnerabilities_by_severity("critical", size=1000)
        high_vulns = insightvm_client.search_vulnerabilities_by_severity("severe", size=1000)
        medium_vulns = insightvm_client.search_vulnerabilities_by_severity("moderate", size=1000)
        
        # Get exploitable vulnerabilities
        exploitable_vulns = insightvm_client.get_exploitable_vulnerabilities(size=1000)
        
        # Calculate trend data (simplified - in production you'd want historical data)
        trends = {
            "critical": {
                "current": critical_vulns.get("page", {}).get("totalResources", 0),
                "trend": "stable",  # Would calculate from historical data
                "change": 0
            },
            "high": {
                "current": high_vulns.get("page", {}).get("totalResources", 0),
                "trend": "stable",
                "change": 0
            },
            "medium": {
                "current": medium_vulns.get("page", {}).get("totalResources", 0),
                "trend": "stable",
                "change": 0
            },
            "exploitable": {
                "current": exploitable_vulns.get("page", {}).get("totalResources", 0),
                "trend": "stable",
                "change": 0
            }
        }
        
        # Top vulnerability categories
        all_vulns = critical_vulns.get("resources", []) + high_vulns.get("resources", [])
        categories = {}
        for vuln in all_vulns:
            for cat in vuln.get("categories", []):
                cat_name = cat.get("name", "Unknown")
                categories[cat_name] = categories.get(cat_name, 0) + 1
        
        top_categories = sorted(categories.items(), key=lambda x: x[1], reverse=True)[:10]
        
        return {
            "trends": trends,
            "top_categories": [{"name": cat, "count": count} for cat, count in top_categories],
            "period_days": days
        }
    except Exception as e:
        logger.error(f"Failed to get vulnerability trends: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/insightvm/sites/{site_id}/scan")
def start_site_scan(
    site_id: int,
    scan_name: Optional[str] = None,
    current_user: models.User = Depends(get_current_active_user)
):
    """Start a scan for a specific site"""
    try:
        if not current_user.is_admin:
            raise HTTPException(status_code=403, detail="Admin privileges required to start scans")
        
        result = insightvm_client.start_site_scan(site_id, scan_name)
        return result
    except Exception as e:
        logger.error(f"Failed to start site scan: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/insightvm/scans/active")
def get_active_scans(current_user: models.User = Depends(get_current_active_user)):
    """Get currently active scans"""
    try:
        result = insightvm_client.get_scans(active=True, size=100)
        
        active_scans = []
        for scan in result.get("resources", []):
            scan_data = {
                "id": scan.get("id"),
                "name": scan.get("name"),
                "status": scan.get("status"),
                "site_id": scan.get("siteId"),
                "site_name": scan.get("siteName"),
                "started": scan.get("startTime"),
                "assets_found": scan.get("assets", 0),
                "vulnerabilities_found": scan.get("vulnerabilities", {}).get("total", 0),
                "engine_id": scan.get("engineId"),
                "scan_type": scan.get("scanType")
            }
            active_scans.append(scan_data)
        
        return {
            "active_scans": active_scans,
            "total_active": len(active_scans)
        }
    except Exception as e:
        logger.error(f"Failed to get active scans: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/insightvm/reports/available")
def get_available_reports(current_user: models.User = Depends(get_current_active_user)):
    """Get available report templates"""
    try:
        templates = insightvm_client.get_report_templates()
        reports = insightvm_client.get_reports()
        
        return {
            "templates": templates.get("resources", []),
            "recent_reports": reports.get("resources", [])[:10]
        }
    except Exception as e:
        logger.error(f"Failed to get available reports: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/insightvm/sync/vulnerabilities")
def sync_insightvm_vulnerabilities(
    asset_ip: Optional[str] = None,
    sync_all: bool = False,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Sync vulnerability data from InsightVM to local database"""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin privileges required")
    
    try:
        synced_count = 0
        error_count = 0
        errors = []
        
        # First test the connection
        connection_test = insightvm_client.test_connection()
        if connection_test.get("status") != "connected":
            raise HTTPException(status_code=503, detail=f"InsightVM connection failed: {connection_test.get('message', 'Unknown error')}")
        
        if sync_all:
            # Get all assets from InsightVM
            assets_response = insightvm_client.get_assets(size=1000)
            if assets_response.get("error"):
                raise HTTPException(status_code=502, detail=f"Failed to get assets from InsightVM: {assets_response.get('error')}")
            assets = assets_response.get("resources", [])
        elif asset_ip:
            # Search for specific asset by IP
            search_response = insightvm_client.search_assets_by_ip(asset_ip)
            if search_response.get("error"):
                raise HTTPException(status_code=502, detail=f"Failed to search assets by IP: {search_response.get('error')}")
            assets = search_response.get("resources", [])
        else:
            raise HTTPException(status_code=400, detail="Either asset_ip or sync_all must be provided")
        
        for asset in assets:
            try:
                asset_id = asset.get("id")
                asset_ip_addr = asset.get("ip")
                
                if not asset_id or not asset_ip_addr:
                    continue
                
                # Find matching local asset
                local_asset = db.query(models.Asset).filter(
                    models.Asset.ip_address == asset_ip_addr
                ).first()
                
                if not local_asset:
                    # Create asset if it doesn't exist
                    default_team = db.query(models.Team).first()
                    if not default_team:
                        continue
                    
                    local_asset = models.Asset(
                        name=asset.get("hostName", f"Asset_{asset_ip_addr}"),
                        ip_address=asset_ip_addr,
                        os_version=asset.get("os", "Unknown"),
                        public_facing=False,
                        team_id=default_team.id,
                        owner_id=current_user.id
                    )
                    db.add(local_asset)
                    db.commit()
                    db.refresh(local_asset)
                
                # Get vulnerabilities for this asset
                vulns_response = insightvm_client.get_asset_vulnerabilities(asset_id, size=1000)
                if vulns_response.get("error"):
                    error_count += 1
                    errors.append(f"Failed to get vulnerabilities for asset {asset_ip_addr}: {vulns_response.get('error')}")
                    continue
                vulnerabilities = vulns_response.get("resources", [])
                
                for vuln in vulnerabilities:
                    try:
                        vuln_id = vuln.get("id")
                        if not vuln_id:
                            continue
                        
                        # Check if vulnerability already exists
                        existing_vuln = db.query(models.Vulnerability).filter(
                            models.Vulnerability.asset_id == local_asset.id,
                            models.Vulnerability.rapid7_vuln_id == vuln_id
                        ).first()
                        
                        if not existing_vuln:
                            # Create new vulnerability
                            new_vuln = models.Vulnerability(
                                asset_id=local_asset.id,
                                rapid7_vuln_id=vuln_id,
                                title=vuln.get("title", "Unknown Vulnerability"),
                                description=vuln.get("description", {}).get("text", "")[:1000],
                                severity=vuln.get("severity", "Unknown").lower(),
                                cvss_score=str(vuln.get("cvss", {}).get("v3", {}).get("score", 0)),
                                status="open",
                                discovered_date=datetime.now(),
                                last_seen=datetime.now()
                            )
                            db.add(new_vuln)
                            synced_count += 1
                        else:
                            # Update existing vulnerability
                            existing_vuln.title = vuln.get("title", existing_vuln.title)
                            existing_vuln.description = vuln.get("description", {}).get("text", existing_vuln.description)[:1000]
                            existing_vuln.severity = vuln.get("severity", existing_vuln.severity).lower()
                            existing_vuln.cvss_score = str(vuln.get("cvss", {}).get("v3", {}).get("score", 0))
                            existing_vuln.last_seen = datetime.now()
                            synced_count += 1
                    
                    except Exception as e:
                        error_count += 1
                        errors.append(f"Error syncing vulnerability {vuln.get('id', 'unknown')}: {str(e)}")
                        logger.error(f"Error syncing vulnerability: {e}")
                
                db.commit()
                
            except Exception as e:
                error_count += 1
                errors.append(f"Error syncing asset {asset.get('ip', 'unknown')}: {str(e)}")
                logger.error(f"Error syncing asset: {e}")
        
        return {
            "message": f"Vulnerability sync completed",
            "synced_count": synced_count,
            "error_count": error_count,
            "errors": errors[:10]  # Limit to first 10 errors
        }
        
    except Exception as e:
        logger.error(f"Failed to sync InsightVM vulnerabilities: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/insightvm/sync/assets")
def sync_insightvm_assets(
    site_id: Optional[int] = None,
    sync_all: bool = False,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Sync asset data from InsightVM to local database"""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin privileges required")
    
    try:
        synced_count = 0
        error_count = 0
        errors = []
        
        if sync_all:
            # Get all assets from InsightVM
            assets_response = insightvm_client.get_assets(size=1000)
            assets = assets_response.get("resources", [])
        elif site_id:
            # Get assets for specific site
            assets_response = insightvm_client.get_site_assets(site_id, size=1000)
            assets = assets_response.get("resources", [])
        else:
            raise HTTPException(status_code=400, detail="Either site_id or sync_all must be provided")
        
        # Get default team for unassigned assets
        default_team = db.query(models.Team).first()
        if not default_team:
            raise HTTPException(status_code=500, detail="No default team found")
        
        for asset in assets:
            try:
                asset_ip = asset.get("ip")
                if not asset_ip:
                    continue
                
                # Check if asset already exists
                existing_asset = db.query(models.Asset).filter(
                    models.Asset.ip_address == asset_ip
                ).first()
                
                if not existing_asset:
                    # Create new asset
                    new_asset = models.Asset(
                        name=asset.get("hostName", f"Asset_{asset_ip}"),
                        ip_address=asset_ip,
                        os_version=asset.get("os", "Unknown"),
                        public_facing=False,  # Default to false, can be updated manually
                        team_id=default_team.id,
                        owner_id=current_user.id
                    )
                    db.add(new_asset)
                    synced_count += 1
                else:
                    # Update existing asset
                    existing_asset.name = asset.get("hostName", existing_asset.name)
                    existing_asset.os_version = asset.get("os", existing_asset.os_version)
                    existing_asset.updated_at = datetime.now()
                    synced_count += 1
                
                db.commit()
                
            except Exception as e:
                error_count += 1
                errors.append(f"Error syncing asset {asset.get('ip', 'unknown')}: {str(e)}")
                logger.error(f"Error syncing asset: {e}")
        
        return {
            "message": f"Asset sync completed",
            "synced_count": synced_count,
            "error_count": error_count,
            "errors": errors[:10]  # Limit to first 10 errors
        }
        
    except Exception as e:
        logger.error(f"Failed to sync InsightVM assets: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/insightvm/assets/{asset_id}/vulnerabilities")
def get_insightvm_asset_vulnerabilities(
    asset_id: int,
    current_user: models.User = Depends(get_current_active_user)
):
    """Get vulnerabilities for a specific InsightVM asset"""
    try:
        vulnerabilities = insightvm_client.get_asset_vulnerabilities(asset_id, size=1000)
        
        # Process and enrich vulnerability data
        processed_vulns = []
        for vuln in vulnerabilities.get("resources", []):
            vulnerability_data = {
                "id": vuln.get("id"),
                "title": vuln.get("title"),
                "description": vuln.get("description", {}).get("text", "")[:500],
                "severity": vuln.get("severity", "Unknown"),
                "cvss_score": vuln.get("cvss", {}).get("v3", {}).get("score", 0),
                "cvss_vector": vuln.get("cvss", {}).get("v3", {}).get("vector", ""),
                "published": vuln.get("published"),
                "modified": vuln.get("modified"),
                "exploits": len(vuln.get("exploits", {}).get("resources", [])),
                "malware_kits": len(vuln.get("malwareKits", {}).get("resources", [])),
                "risk_score": vuln.get("riskScore", 0),
                "categories": [cat.get("name") for cat in vuln.get("categories", [])],
                "cves": [cve.get("id") for cve in vuln.get("cves", [])],
                "references": [ref.get("source") for ref in vuln.get("references", [])]
            }
            processed_vulns.append(vulnerability_data)
        
        return {
            "asset_id": asset_id,
            "vulnerabilities": processed_vulns,
            "total_vulnerabilities": len(processed_vulns),
            "page": vulnerabilities.get("page", {})
        }
        
    except Exception as e:
        logger.error(f"Failed to get InsightVM asset vulnerabilities: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
def read_root():
    return {"message": "Safaricom Asset Inventory API", "version": "1.0.0"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)