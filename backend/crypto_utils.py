"""
Cryptographic utilities for secure credential management
"""
import os
import base64
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import logging

logger = logging.getLogger(__name__)

class CredentialEncryption:
    """
    Handles encryption and decryption of sensitive credentials
    """
    
    def __init__(self, master_key: str = None):
        """
        Initialize encryption with master key
        """
        self.master_key = master_key or os.getenv('ENCRYPTION_MASTER_KEY')
        if not self.master_key:
            raise ValueError("ENCRYPTION_MASTER_KEY environment variable must be set")
        
        # Derive encryption key from master key
        self.fernet = self._create_fernet_key()
    
    def _create_fernet_key(self) -> Fernet:
        """
        Create Fernet encryption key from master key
        """
        # Use a fixed salt for consistency (in production, use app-specific salt)
        salt = b'catproj_salt_2024'
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000,
        )
        key = base64.urlsafe_b64encode(kdf.derive(self.master_key.encode()))
        return Fernet(key)
    
    def encrypt_credential(self, credential: str) -> str:
        """
        Encrypt a credential string
        """
        try:
            encrypted_bytes = self.fernet.encrypt(credential.encode())
            return base64.urlsafe_b64encode(encrypted_bytes).decode()
        except Exception as e:
            logger.error(f"Failed to encrypt credential: {e}")
            raise
    
    def decrypt_credential(self, encrypted_credential: str) -> str:
        """
        Decrypt a credential string
        """
        try:
            encrypted_bytes = base64.urlsafe_b64decode(encrypted_credential.encode())
            decrypted_bytes = self.fernet.decrypt(encrypted_bytes)
            return decrypted_bytes.decode()
        except Exception as e:
            logger.error(f"Failed to decrypt credential: {e}")
            raise
    
    def encrypt_dict(self, credentials_dict: dict) -> dict:
        """
        Encrypt all values in a dictionary
        """
        encrypted_dict = {}
        for key, value in credentials_dict.items():
            if isinstance(value, str) and value:
                encrypted_dict[key] = self.encrypt_credential(value)
            else:
                encrypted_dict[key] = value
        return encrypted_dict
    
    def decrypt_dict(self, encrypted_dict: dict) -> dict:
        """
        Decrypt all values in a dictionary
        """
        decrypted_dict = {}
        for key, value in encrypted_dict.items():
            if isinstance(value, str) and value:
                try:
                    decrypted_dict[key] = self.decrypt_credential(value)
                except:
                    # If decryption fails, assume it's not encrypted
                    decrypted_dict[key] = value
            else:
                decrypted_dict[key] = value
        return decrypted_dict

class SecureConfigManager:
    """
    Manages secure loading and storage of encrypted configuration
    """
    
    def __init__(self, config_file: str = None):
        self.config_file = config_file or os.path.join(os.path.dirname(__file__), '.env.encrypted')
        self.encryption = CredentialEncryption()
    
    def load_config(self) -> dict:
        """
        Load and decrypt configuration from file
        """
        try:
            if not os.path.exists(self.config_file):
                logger.warning(f"Encrypted config file {self.config_file} not found, using environment variables")
                return self._load_from_env()
            
            with open(self.config_file, 'r') as f:
                import json
                encrypted_config = json.load(f)
            
            return self.encryption.decrypt_dict(encrypted_config)
        except Exception as e:
            logger.error(f"Failed to load encrypted config: {e}")
            return self._load_from_env()
    
    def save_config(self, config: dict):
        """
        Encrypt and save configuration to file
        """
        try:
            encrypted_config = self.encryption.encrypt_dict(config)
            with open(self.config_file, 'w') as f:
                import json
                json.dump(encrypted_config, f, indent=2)
            logger.info(f"Encrypted configuration saved to {self.config_file}")
        except Exception as e:
            logger.error(f"Failed to save encrypted config: {e}")
            raise
    
    def _load_from_env(self) -> dict:
        """
        Fallback to load from environment variables
        """
        return {
            'RAPID7_INSIGHTVM_USERNAME': os.getenv('RAPID7_INSIGHTVM_USERNAME'),
            'RAPID7_INSIGHTVM_PASSWORD': os.getenv('RAPID7_INSIGHTVM_PASSWORD'),
            'DATABASE_URL': os.getenv('DATABASE_URL'),
            'JWT_SECRET_KEY': os.getenv('JWT_SECRET_KEY'),
            'RAPID7_API_KEY': os.getenv('RAPID7_API_KEY'),
            'RAPID7_BASE_URL': os.getenv('RAPID7_BASE_URL')
        }

# Global instance for easy access
_config_manager = None

def get_config_manager() -> SecureConfigManager:
    """
    Get global configuration manager instance
    """
    global _config_manager
    if _config_manager is None:
        _config_manager = SecureConfigManager()
    return _config_manager

def get_secure_config() -> dict:
    """
    Get decrypted configuration
    """
    return get_config_manager().load_config()