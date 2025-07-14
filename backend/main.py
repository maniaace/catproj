from fastapi import FastAPI, Depends, HTTPException, status, Form
from fastapi.security import HTTPBearer
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
import models
import schemas
import crud
from database import SessionLocal, engine, get_db
from auth import create_access_token, verify_password, get_current_active_user
from rapid7_client import rapid7_client
import logging

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
def read_teams(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_active_user)):
    teams = crud.get_teams(db, skip=skip, limit=limit)
    return teams

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

@app.post("/assets/", response_model=schemas.Asset)
def create_asset(asset: schemas.AssetCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_active_user)):
    if not current_user.is_admin and current_user.team_id != asset.team_id:
        raise HTTPException(status_code=403, detail="Can only create assets for your own team")
    return crud.create_asset(db=db, asset=asset)

@app.get("/assets/", response_model=List[schemas.Asset])
def read_assets(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_active_user)):
    team_id = None if current_user.is_admin else current_user.team_id
    assets = crud.get_assets(db, skip=skip, limit=limit, team_id=team_id)
    return assets

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

@app.get("/")
def read_root():
    return {"message": "Safaricom Asset Inventory API", "version": "1.0.0"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)