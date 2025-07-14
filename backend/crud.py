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

def get_teams(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Team).offset(skip).limit(limit).all()

def get_team(db: Session, team_id: int):
    return db.query(models.Team).filter(models.Team.id == team_id).first()

def create_user(db: Session, user: schemas.UserCreate):
    hashed_password = get_password_hash(user.password)
    db_user = models.User(
        username=user.username,
        email=user.email,
        hashed_password=hashed_password,
        full_name=user.full_name,
        team_id=user.team_id
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

def create_asset(db: Session, asset: schemas.AssetCreate):
    db_asset = models.Asset(**asset.dict())
    db.add(db_asset)
    db.commit()
    db.refresh(db_asset)
    return db_asset

def get_assets(db: Session, skip: int = 0, limit: int = 100, team_id: Optional[int] = None):
    query = db.query(models.Asset)
    if team_id:
        query = query.filter(models.Asset.team_id == team_id)
    return query.offset(skip).limit(limit).all()

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