from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import List, Optional
import models
import schemas
from auth import get_password_hash

def create_team(db: Session, team: schemas.TeamCreate):
    db_team = models.Team(**team.dict())
    db.add(db_team)
    db.commit()
    db.refresh(db_team)
    return db_team

def get_teams(db: Session, skip: int = 0, limit: int = 100, parent_team_id: Optional[int] = None):
    query = db.query(models.Team)
    if parent_team_id is not None:
        query = query.filter(models.Team.parent_team_id == parent_team_id)
    return query.offset(skip).limit(limit).all()

def get_main_teams(db: Session, skip: int = 0, limit: int = 100):
    """Get only main teams (no parent)"""
    return db.query(models.Team).filter(models.Team.parent_team_id.is_(None)).offset(skip).limit(limit).all()

def get_sub_teams(db: Session, parent_team_id: int):
    """Get sub-teams for a specific parent team"""
    return db.query(models.Team).filter(models.Team.parent_team_id == parent_team_id).all()

def get_team_hierarchy(db: Session, team_id: int):
    """Get team with all its sub-teams"""
    team = db.query(models.Team).filter(models.Team.id == team_id).first()
    if team:
        # Load sub-teams recursively
        team.sub_teams = get_sub_teams(db, team_id)
    return team

def get_team(db: Session, team_id: int):
    return db.query(models.Team).filter(models.Team.id == team_id).first()

def update_team(db: Session, team_id: int, team_update: schemas.TeamCreate):
    db_team = db.query(models.Team).filter(models.Team.id == team_id).first()
    if db_team:
        for key, value in team_update.dict(exclude_unset=True).items():
            setattr(db_team, key, value)
        db.commit()
        db.refresh(db_team)
    return db_team

def delete_team(db: Session, team_id: int):
    db_team = db.query(models.Team).filter(models.Team.id == team_id).first()
    if db_team:
        # Check if team has sub-teams
        sub_teams = get_sub_teams(db, team_id)
        if sub_teams:
            sub_team_names = [team.name for team in sub_teams]
            raise ValueError(f"Cannot delete team with sub-teams: {', '.join(sub_team_names)}. Delete sub-teams first.")
        
        # Check if team has assets
        assets_count = db.query(models.Asset).filter(models.Asset.team_id == team_id).count()
        if assets_count > 0:
            raise ValueError(f"Cannot delete team with {assets_count} assets. Reassign assets first.")
        
        # Check if team has users assigned
        users_count = db.query(models.User).filter(models.User.team_id == team_id).count()
        if users_count > 0:
            raise ValueError(f"Cannot delete team with {users_count} users assigned. Reassign users first.")
        
        try:
            db.delete(db_team)
            db.commit()
        except Exception as e:
            db.rollback()
            raise ValueError(f"Database error during deletion: {str(e)}")
    return db_team

def create_user(db: Session, user: schemas.UserCreate):
    hashed_password = get_password_hash(user.password)
    db_user = models.User(
        username=user.username,
        email=user.email,
        hashed_password=hashed_password,
        full_name=user.full_name,
        team_id=user.team_id,
        is_admin=user.is_admin,
        is_active=user.is_active
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def get_user(db: Session, user_id: int):
    return db.query(models.User).filter(models.User.id == user_id).first()

def get_user_by_username(db: Session, username: str):
    return db.query(models.User).filter(models.User.username == username).first()

def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()

def get_users(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.User).offset(skip).limit(limit).all()

def update_user(db: Session, user_id: int, user_update: schemas.UserUpdate):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if db_user is None:
        return None
    
    update_data = user_update.dict(exclude_unset=True)
    if 'password' in update_data and update_data['password']:
        update_data['hashed_password'] = get_password_hash(update_data['password'])
        del update_data['password']
    
    for key, value in update_data.items():
        setattr(db_user, key, value)
    
    db.commit()
    db.refresh(db_user)
    return db_user

def delete_user(db: Session, user_id: int):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if db_user is None:
        return None
    
    db.delete(db_user)
    db.commit()
    return db_user

def create_asset(db: Session, asset: schemas.AssetCreate):
    db_asset = models.Asset(**asset.dict())
    db.add(db_asset)
    db.commit()
    db.refresh(db_asset)
    return db_asset

def get_assets(db: Session, skip: int = 0, limit: int = 100, team_id: Optional[int] = None, 
               environment: Optional[str] = None, criticality: Optional[str] = None):
    query = db.query(models.Asset)
    if team_id:
        query = query.filter(models.Asset.team_id == team_id)
    if environment:
        query = query.filter(models.Asset.environment == environment)
    if criticality:
        query = query.filter(models.Asset.criticality == criticality)
    return query.offset(skip).limit(limit).all()

def get_assets_by_environment(db: Session, environment: str, team_id: Optional[int] = None):
    """Get assets by environment (dev, uat, prod)"""
    query = db.query(models.Asset).filter(models.Asset.environment == environment)
    if team_id:
        query = query.filter(models.Asset.team_id == team_id)
    return query.all()

def get_assets_by_criticality(db: Session, criticality: str, team_id: Optional[int] = None):
    """Get assets by criticality level"""
    query = db.query(models.Asset).filter(models.Asset.criticality == criticality)
    if team_id:
        query = query.filter(models.Asset.team_id == team_id)
    return query.all()

def get_critical_assets(db: Session, team_id: Optional[int] = None):
    """Get all critical assets"""
    return get_assets_by_criticality(db, "critical", team_id)

def get_prod_assets(db: Session, team_id: Optional[int] = None):
    """Get all production assets"""
    return get_assets_by_environment(db, "prod", team_id)

def get_assets_stats(db: Session, team_id: Optional[int] = None):
    """Get asset statistics by environment and criticality"""
    query = db.query(models.Asset)
    if team_id:
        query = query.filter(models.Asset.team_id == team_id)
    
    assets = query.all()
    
    stats = {
        "total": len(assets),
        "by_environment": {},
        "by_criticality": {},
        "by_type": {}
    }
    
    for asset in assets:
        # Environment stats
        env = asset.environment
        if env not in stats["by_environment"]:
            stats["by_environment"][env] = 0
        stats["by_environment"][env] += 1
        
        # Criticality stats
        crit = asset.criticality
        if crit not in stats["by_criticality"]:
            stats["by_criticality"][crit] = 0
        stats["by_criticality"][crit] += 1
        
        # Asset type stats
        asset_type = asset.asset_type or "unknown"
        if asset_type not in stats["by_type"]:
            stats["by_type"][asset_type] = 0
        stats["by_type"][asset_type] += 1
    
    return stats

def get_asset(db: Session, asset_id: int):
    return db.query(models.Asset).filter(models.Asset.id == asset_id).first()

def update_asset(db: Session, asset_id: int, asset_update: schemas.AssetCreate):
    db_asset = db.query(models.Asset).filter(models.Asset.id == asset_id).first()
    if db_asset:
        for key, value in asset_update.dict(exclude_unset=True).items():
            setattr(db_asset, key, value)
        db.commit()
        db.refresh(db_asset)
    return db_asset

def delete_asset(db: Session, asset_id: int):
    db_asset = db.query(models.Asset).filter(models.Asset.id == asset_id).first()
    if db_asset:
        db.delete(db_asset)
        db.commit()
    return db_asset

def create_service(db: Session, service: schemas.ServiceCreate):
    db_service = models.Service(**service.dict())
    db.add(db_service)
    db.commit()
    db.refresh(db_service)
    return db_service

def get_services_by_asset(db: Session, asset_id: int):
    return db.query(models.Service).filter(models.Service.asset_id == asset_id).all()

def create_vulnerability(db: Session, vulnerability: schemas.VulnerabilityCreate):
    db_vulnerability = models.Vulnerability(**vulnerability.dict())
    db.add(db_vulnerability)
    db.commit()
    db.refresh(db_vulnerability)
    return db_vulnerability

def get_vulnerabilities_by_asset(db: Session, asset_id: int):
    return db.query(models.Vulnerability).filter(models.Vulnerability.asset_id == asset_id).all()

def get_vulnerabilities_by_team(db: Session, team_id: int):
    return db.query(models.Vulnerability).join(models.Asset).filter(models.Asset.team_id == team_id).all()

def create_scan(db: Session, scan: schemas.ScanCreate, user_id: int):
    db_scan = models.Scan(**scan.dict(), initiated_by=user_id)
    db.add(db_scan)
    db.commit()
    db.refresh(db_scan)
    return db_scan

def get_scans_by_asset(db: Session, asset_id: int):
    return db.query(models.Scan).filter(models.Scan.asset_id == asset_id).all()