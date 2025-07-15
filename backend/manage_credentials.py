#!/usr/bin/env python3
"""
Credential Management Utility

This script helps encrypt and manage credentials securely.
Usage:
    python manage_credentials.py encrypt     # Encrypt current .env file
    python manage_credentials.py decrypt     # Decrypt and view credentials
    python manage_credentials.py generate    # Generate new encryption key
"""

import sys
import os
import json
from getpass import getpass
from crypto_utils import CredentialEncryption, SecureConfigManager
import secrets
import string

def generate_master_key():
    """Generate a new secure master key"""
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    key = ''.join(secrets.choice(alphabet) for _ in range(64))
    return key

def encrypt_credentials():
    """Encrypt credentials from .env file"""
    print("🔐 Encrypting credentials...")
    
    # Check if master key is set
    master_key = os.getenv('ENCRYPTION_MASTER_KEY')
    if not master_key:
        print("❌ ENCRYPTION_MASTER_KEY environment variable not set.")
        print("💡 Generate a new key with: python manage_credentials.py generate")
        return False
    
    # Load credentials from .env file
    env_file = '.env'
    if not os.path.exists(env_file):
        print(f"❌ {env_file} file not found.")
        print("💡 Create .env file from .env.example first")
        return False
    
    credentials = {}
    with open(env_file, 'r') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                credentials[key.strip()] = value.strip()
    
    # Encrypt and save
    try:
        config_manager = SecureConfigManager()
        config_manager.save_config(credentials)
        print("✅ Credentials encrypted successfully!")
        print(f"📁 Encrypted file: {config_manager.config_file}")
        print("⚠️  You can now delete the .env file for security")
        return True
    except Exception as e:
        print(f"❌ Failed to encrypt credentials: {e}")
        return False

def decrypt_credentials():
    """Decrypt and display credentials"""
    print("🔓 Decrypting credentials...")
    
    try:
        config_manager = SecureConfigManager()
        credentials = config_manager.load_config()
        
        print("📋 Decrypted credentials:")
        print("-" * 40)
        for key, value in credentials.items():
            if value:
                # Mask sensitive values
                if any(word in key.lower() for word in ['password', 'secret', 'key']):
                    masked_value = value[:4] + '*' * (len(value) - 8) + value[-4:] if len(value) > 8 else '****'
                    print(f"{key}: {masked_value}")
                else:
                    print(f"{key}: {value}")
        print("-" * 40)
        return True
    except Exception as e:
        print(f"❌ Failed to decrypt credentials: {e}")
        return False

def generate_key():
    """Generate a new master encryption key"""
    print("🔑 Generating new master encryption key...")
    
    key = generate_master_key()
    print(f"✅ Generated master key: {key}")
    print()
    print("🔒 Add this to your environment:")
    print(f"export ENCRYPTION_MASTER_KEY='{key}'")
    print()
    print("📝 Or add to your .env file:")
    print(f"ENCRYPTION_MASTER_KEY={key}")
    print()
    print("⚠️  IMPORTANT: Store this key securely and never commit it to version control!")

def setup_encryption():
    """Interactive setup for encryption"""
    print("🚀 Setting up credential encryption...")
    print()
    
    # Check if master key exists
    master_key = os.getenv('ENCRYPTION_MASTER_KEY')
    if not master_key:
        print("❓ No master key found. Would you like to generate one? (y/n): ", end="")
        if input().lower().startswith('y'):
            generate_key()
            print()
            print("🔄 Please set the ENCRYPTION_MASTER_KEY and run this script again.")
            return
    
    # Check if .env exists
    if not os.path.exists('.env'):
        print("❓ No .env file found. Would you like to create one from .env.example? (y/n): ", end="")
        if input().lower().startswith('y'):
            if os.path.exists('.env.example'):
                import shutil
                shutil.copy('.env.example', '.env')
                print("✅ Created .env from .env.example")
                print("📝 Please edit .env with your actual credentials, then run encryption again.")
            else:
                print("❌ .env.example not found")
        return
    
    # Encrypt credentials
    if encrypt_credentials():
        print()
        print("🎉 Credential encryption setup complete!")
        print("💡 Your application will now use encrypted credentials automatically.")

def main():
    """Main CLI interface"""
    if len(sys.argv) < 2:
        print("🔐 Credential Management Utility")
        print()
        print("Usage:")
        print("  python manage_credentials.py setup      # Interactive setup")
        print("  python manage_credentials.py encrypt    # Encrypt .env file")
        print("  python manage_credentials.py decrypt    # View encrypted credentials")
        print("  python manage_credentials.py generate   # Generate master key")
        return
    
    command = sys.argv[1].lower()
    
    if command == 'setup':
        setup_encryption()
    elif command == 'encrypt':
        encrypt_credentials()
    elif command == 'decrypt':
        decrypt_credentials()
    elif command == 'generate':
        generate_key()
    else:
        print(f"❌ Unknown command: {command}")
        print("💡 Use 'setup', 'encrypt', 'decrypt', or 'generate'")

if __name__ == '__main__':
    main()