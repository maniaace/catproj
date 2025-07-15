from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

class TeamBase(BaseModel):
    name: str
    description: Optional[str] = None
    parent_team_id: Optional[int] = None
    team_type: str = "main"  # main, sub, shared

class TeamCreate(TeamBase):
    pass

class TeamSimple(TeamBase):
    """Simple team without relationships to avoid recursion"""
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class Team(TeamBase):
    """Team with parent but no sub_teams to avoid recursion"""
    id: int
    created_at: datetime
    parent_team: Optional[TeamSimple] = None
    
    class Config:
        from_attributes = True

class TeamWithSubTeams(TeamBase):
    """Team with sub_teams but no parent to avoid recursion"""
    id: int
    created_at: datetime
    sub_teams: List[TeamSimple] = []
    
    class Config:
        from_attributes = True

class UserBase(BaseModel):
    username: str
    email: EmailStr
    full_name: Optional[str] = None
    team_id: Optional[int] = None

class UserCreate(UserBase):
    password: str
    is_admin: Optional[bool] = False
    is_active: Optional[bool] = True

class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    password: Optional[str] = None
    team_id: Optional[int] = None
    is_admin: Optional[bool] = None
    is_active: Optional[bool] = None

class User(UserBase):
    id: int
    is_active: bool
    is_admin: bool
    created_at: datetime
    team: Optional[TeamSimple] = None
    
    class Config:
        from_attributes = True

class AssetBase(BaseModel):
    name: str
    ip_address: str
    os_version: Optional[str] = None
    public_facing: bool = False
    team_id: int
    owner_id: Optional[int] = None
    environment: str = "dev"  # dev, uat, prod
    criticality: str = "medium"  # low, medium, high, critical
    business_impact: Optional[str] = None
    asset_type: Optional[str] = None
    location: Optional[str] = None
    compliance_requirements: Optional[str] = None

class AssetCreate(AssetBase):
    pass

class Asset(AssetBase):
    id: int
    last_reviewed_date: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    team: Optional[TeamSimple] = None
    owner: Optional[User] = None
    
    class Config:
        from_attributes = True

class ServiceBase(BaseModel):
    service_name: str
    port: Optional[int] = None
    version: Optional[str] = None
    protocol: str = "TCP"

class ServiceCreate(ServiceBase):
    asset_id: int

class Service(ServiceBase):
    id: int
    asset_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class VulnerabilityBase(BaseModel):
    rapid7_vuln_id: Optional[str] = None
    title: str
    description: Optional[str] = None
    severity: str
    cvss_score: Optional[str] = None
    status: str = "open"

class VulnerabilityCreate(VulnerabilityBase):
    asset_id: int

class Vulnerability(VulnerabilityBase):
    id: int
    asset_id: int
    discovered_date: Optional[datetime] = None
    last_seen: Optional[datetime] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

class ScanBase(BaseModel):
    scan_type: str = "vulnerability"
    
class ScanCreate(ScanBase):
    asset_id: int

class Scan(ScanBase):
    id: int
    asset_id: int
    initiated_by: int
    status: str
    rapid7_scan_id: Optional[str] = None
    scan_date: datetime
    completed_date: Optional[datetime] = None
    results: Optional[str] = None
    
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None