from pydantic_settings import BaseSettings
from typing import Optional
import os
import logging
from crypto_utils import get_secure_config

logger = logging.getLogger(__name__)

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

class SecureSettings:
    """
    Secure settings manager that loads encrypted credentials
    """
    
    def __init__(self):
        # Load encrypted configuration
        try:
            secure_config = get_secure_config()
        except Exception as e:
            logger.warning(f"Failed to load encrypted config, falling back to environment: {e}")
            secure_config = {}
        
        # Database configuration
        self.database_url = (
            secure_config.get('DATABASE_URL') or 
            os.getenv('DATABASE_URL') or 
            "postgresql://admin:password123@localhost:5432/asset_inventory"
        )
        
        # Rapid7 InsightVM API Configuration
        self.rapid7_insightvm_base_url = "https://10.184.38.148:3780/api/3"
        self.rapid7_insightvm_username = (
            secure_config.get('RAPID7_INSIGHTVM_USERNAME') or 
            os.getenv('RAPID7_INSIGHTVM_USERNAME')
        )
        self.rapid7_insightvm_password = (
            secure_config.get('RAPID7_INSIGHTVM_PASSWORD') or 
            os.getenv('RAPID7_INSIGHTVM_PASSWORD')
        )
        
        # Legacy Rapid7 AppSec Configuration (deprecated)
        self.rapid7_api_key = (
            secure_config.get('RAPID7_API_KEY') or 
            os.getenv('RAPID7_API_KEY')
        )
        self.rapid7_base_url = (
            secure_config.get('RAPID7_BASE_URL') or 
            os.getenv('RAPID7_BASE_URL') or 
            "https://us.api.insight.rapid7.com"
        )
        self.rapid7_log_search_url = os.getenv('RAPID7_LOG_SEARCH_URL')
        
        # JWT Configuration
        self.jwt_secret_key = (
            secure_config.get('JWT_SECRET_KEY') or 
            os.getenv('JWT_SECRET_KEY') or 
            "your-secret-key-here"
        )
        self.jwt_algorithm = "HS256"
        self.jwt_expiration_hours = 24
        
        # Encryption master key
        self.encryption_master_key = os.getenv('ENCRYPTION_MASTER_KEY')
        
        # Validate critical settings
        self._validate_settings()
    
    def _validate_settings(self):
        """
        Validate that critical settings are properly configured
        """
        if self.jwt_secret_key == "your-secret-key-here":
            logger.warning("JWT secret key is using default value - this is insecure!")
        
        if not self.rapid7_insightvm_username or not self.rapid7_insightvm_password:
            logger.warning("InsightVM credentials not configured")
        
        if not self.encryption_master_key:
            logger.warning("ENCRYPTION_MASTER_KEY not set - encrypted config cannot be used")

# Use secure settings by default, fallback to legacy if encryption fails
try:
    settings = SecureSettings()
except Exception as e:
    logger.error(f"Failed to initialize secure settings: {e}")
    logger.info("Falling back to legacy settings")
    settings = Settings()