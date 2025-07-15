# Security Configuration

## Environment Variables

This application requires several environment variables for proper operation. **NEVER commit actual credentials to version control.**

### Setup Instructions

1. Copy the example environment files:
   ```bash
   cp .env.example .env
   cp backend/.env.example backend/.env
   ```

2. Edit the `.env` files with your actual credentials:
   - `RAPID7_INSIGHTVM_USERNAME`: Your InsightVM username
   - `RAPID7_INSIGHTVM_PASSWORD`: Your InsightVM password  
   - `DATABASE_URL`: Your PostgreSQL connection string
   - `JWT_SECRET_KEY`: Generate a secure random key

### Security Notes

- Environment files (`.env`) are ignored by git
- Use strong, unique passwords
- Rotate credentials regularly
- Never share credentials in chat, email, or documentation
- Use environment-specific credentials for dev/staging/production

### Generating Secure Keys

For JWT_SECRET_KEY, use a cryptographically secure random string:
```bash
openssl rand -hex 32
```