from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class Team(Base):
    __tablename__ = "teams"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, index=True, nullable=False)
    description = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    assets = relationship("Asset", back_populates="team")
    users = relationship("User", back_populates="team")

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(100))
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
    team_id = Column(Integer, ForeignKey("teams.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    team = relationship("Team", back_populates="users")
    owned_assets = relationship("Asset", back_populates="owner")

class Asset(Base):
    __tablename__ = "assets"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, index=True)
    ip_address = Column(String(45), nullable=False, index=True)
    os_version = Column(String(100))
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=False)
    owner_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    team = relationship("Team", back_populates="assets")
    owner = relationship("User", back_populates="owned_assets")
    services = relationship("Service", back_populates="asset")
    vulnerabilities = relationship("Vulnerability", back_populates="asset")
    scans = relationship("Scan", back_populates="asset")

class Service(Base):
    __tablename__ = "services"
    
    id = Column(Integer, primary_key=True, index=True)
    asset_id = Column(Integer, ForeignKey("assets.id"), nullable=False)
    service_name = Column(String(100), nullable=False)
    port = Column(Integer)
    version = Column(String(100))
    protocol = Column(String(10), default="TCP")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    asset = relationship("Asset", back_populates="services")

class Vulnerability(Base):
    __tablename__ = "vulnerabilities"
    
    id = Column(Integer, primary_key=True, index=True)
    asset_id = Column(Integer, ForeignKey("assets.id"), nullable=False)
    rapid7_vuln_id = Column(String(100), index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    severity = Column(String(20), nullable=False)
    cvss_score = Column(String(10))
    status = Column(String(20), default="open")
    discovered_date = Column(DateTime(timezone=True))
    last_seen = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    asset = relationship("Asset", back_populates="vulnerabilities")

class Scan(Base):
    __tablename__ = "scans"
    
    id = Column(Integer, primary_key=True, index=True)
    asset_id = Column(Integer, ForeignKey("assets.id"), nullable=False)
    initiated_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    scan_type = Column(String(50), default="vulnerability")
    status = Column(String(20), default="pending")
    rapid7_scan_id = Column(String(100))
    scan_date = Column(DateTime(timezone=True), server_default=func.now())
    completed_date = Column(DateTime(timezone=True))
    results = Column(Text)
    
    asset = relationship("Asset", back_populates="scans")
    user = relationship("User")