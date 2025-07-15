from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    database_url: str = "postgresql://admin:password123@localhost:5432/asset_inventory"
    
    # Rapid7 InsightVM API Configuration
    rapid7_insightvm_base_url: str = "https://10.184.38.148:3780/api/3"
    rapid7_insightvm_username: Optional[str] = None
    rapid7_insightvm_password: Optional[str] = None
    
    # Legacy Rapid7 AppSec Configuration (deprecated)
    rapid7_api_key: Optional[str] = None
    rapid7_base_url: str = "https://us.api.insight.rapid7.com"
    rapid7_log_search_url: Optional[str] = None
    
    # JWT Configuration
    jwt_secret_key: str = "your-secret-key-here"
    jwt_algorithm: str = "HS256"
    jwt_expiration_hours: int = 24

    class Config:
        env_file = ".env"

settings = Settings()