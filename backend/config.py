from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    database_url: str = "postgresql://admin:password123@localhost:5432/asset_inventory"
    rapid7_api_key: Optional[str] = None
    rapid7_base_url: str = "https://us.api.insight.rapid7.com"
    jwt_secret_key: str = "your-secret-key-here"
    jwt_algorithm: str = "HS256"
    jwt_expiration_hours: int = 24

    class Config:
        env_file = ".env"

settings = Settings()