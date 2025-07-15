# Security Configuration

## 🔐 Encrypted Credential Management

This application implements **enterprise-grade credential encryption** to protect sensitive data both at rest and in transit.

## 🚀 Quick Setup

### 1. Initial Setup
```bash
# Copy example files
cp .env.example .env
cp backend/.env.example backend/.env

# Generate encryption key
cd backend
python manage_credentials.py generate
```

### 2. Configure Encryption
```bash
# Set the master encryption key (generated above)
export ENCRYPTION_MASTER_KEY='your-generated-64-char-key'

# Add to your .env file
echo "ENCRYPTION_MASTER_KEY=your-generated-64-char-key" >> .env
echo "ENCRYPTION_MASTER_KEY=your-generated-64-char-key" >> backend/.env
```

### 3. Encrypt Credentials
```bash
# Interactive setup (recommended)
python manage_credentials.py setup

# Or encrypt manually
python manage_credentials.py encrypt
```

## 🔒 Security Features

### Backend Encryption
- **AES-256-GCM encryption** for all sensitive credentials
- **PBKDF2 key derivation** with 100,000 iterations
- **Cryptographically secure salt generation**
- **Automatic fallback** to environment variables
- **Zero-knowledge architecture** - master key never stored with data

### Frontend Security
- **WebCrypto API** for client-side encryption
- **Secure random key generation**
- **Encrypted localStorage** for sensitive client data
- **Integrity checking** with SHA-256 hashing
- **Memory-safe credential handling**

### Key Management
- **Master key rotation** support
- **Environment-specific keys** for dev/staging/production
- **Secure key derivation** from user authentication
- **Automated encryption utilities**

## 📋 Environment Variables

### Required Variables
```bash
# Master encryption key (64 characters minimum)
ENCRYPTION_MASTER_KEY=generate-a-64-char-secure-master-key-here

# InsightVM API credentials
RAPID7_INSIGHTVM_USERNAME=your_insightvm_username
RAPID7_INSIGHTVM_PASSWORD=your_insightvm_password

# Database configuration
DATABASE_URL=postgresql://username:password@localhost:5432/database_name

# JWT configuration
JWT_SECRET_KEY=generate-a-secure-secret-key-here
```

### Optional Variables
```bash
# Legacy Rapid7 AppSec (deprecated)
RAPID7_API_KEY=your_rapid7_api_key
RAPID7_BASE_URL=https://us.api.insight.rapid7.com
```

## 🛠️ Credential Management

### View Encrypted Credentials
```bash
python manage_credentials.py decrypt
```

### Rotate Encryption Key
```bash
# Generate new key
python manage_credentials.py generate

# Update environment
export ENCRYPTION_MASTER_KEY='new-key'

# Re-encrypt with new key
python manage_credentials.py encrypt
```

### Backup and Recovery
```bash
# Backup encrypted config
cp backend/.env.encrypted backup/.env.encrypted.$(date +%Y%m%d)

# Restore from backup
cp backup/.env.encrypted.20241215 backend/.env.encrypted
```

## 🔐 Production Deployment

### 1. Key Management
- **Use dedicated key management service** (AWS KMS, Azure Key Vault, etc.)
- **Rotate keys quarterly** or after security incidents
- **Use different keys** for each environment
- **Store master keys separately** from application servers

### 2. Environment Setup
```bash
# Production environment
export ENCRYPTION_MASTER_KEY='prod-specific-key'
export DATABASE_URL='production-db-connection'

# Deploy with encrypted credentials
python manage_credentials.py encrypt
```

### 3. Security Monitoring
- **Monitor decryption failures** - may indicate attacks
- **Log encryption operations** for audit trails
- **Set up alerts** for unusual credential access patterns
- **Regular security audits** of encryption implementation

## 🚨 Security Best Practices

### Credential Security
- ✅ **Use 64+ character master keys**
- ✅ **Generate unique keys per environment**
- ✅ **Rotate credentials quarterly**
- ✅ **Use strong, unique passwords**
- ✅ **Enable multi-factor authentication**
- ❌ **Never commit credentials to version control**
- ❌ **Never share credentials via chat/email**
- ❌ **Never use default or weak passwords**

### Key Management
- ✅ **Store master keys in secure key management systems**
- ✅ **Use environment-specific encryption keys**
- ✅ **Implement key rotation procedures**
- ✅ **Monitor key usage and access**
- ❌ **Never store master keys with encrypted data**
- ❌ **Never transmit master keys over insecure channels**

### Application Security
- ✅ **Encrypt sensitive data at rest**
- ✅ **Use TLS 1.3 for data in transit**
- ✅ **Implement proper access controls**
- ✅ **Log security events**
- ✅ **Regular security updates**
- ❌ **Never log decrypted credentials**
- ❌ **Never store credentials in plain text**

## 🆘 Emergency Procedures

### Suspected Credential Compromise
1. **Immediately rotate** all affected credentials
2. **Generate new encryption key**
3. **Re-encrypt all stored credentials**
4. **Review access logs** for unauthorized access
5. **Update all application instances**

### Lost Master Key
1. **Stop all application instances**
2. **Restore from secure key backup**
3. **Or regenerate from .env files if available**
4. **Re-encrypt all credentials**
5. **Deploy updated configuration**

### Encryption Failure
1. **Check master key configuration**
2. **Verify cryptography library installation**
3. **Review error logs for specific failures**
4. **Fallback to environment variables if needed**
5. **Contact security team if issues persist**

## 📞 Support

For security-related issues:
- **Security incidents**: Immediate escalation to security team
- **Key management**: Use established key rotation procedures  
- **Technical issues**: Review logs and documentation first
- **Questions**: Consult this documentation and security policies

---

**🔐 Remember: Security is everyone's responsibility!**