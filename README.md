# Safaricom PVMG Portal - Asset Inventory System

A web application for asset inventory management with Rapid7 integration for vulnerability scanning and reporting.

## Features

- **Asset Management**: Track assets with details like IP address, OS version, team ownership
- **Team-based Access Control**: Users can only access assets within their team (unless admin)
- **Rapid7 Integration**: Pull vulnerability data and initiate scans
- **Real-time Dashboard**: View asset counts, vulnerability statistics
- **Self-Service Scanning**: Asset owners can trigger their own scans

## Technology Stack

### Backend
- **FastAPI**: Modern Python web framework
- **SQLAlchemy**: ORM for database operations
- **PostgreSQL**: Primary database
- **JWT Authentication**: Secure token-based auth
- **Rapid7 API**: Vulnerability data integration

### Frontend
- **React + TypeScript**: Modern web framework
- **Material-UI**: Professional UI components
- **Axios**: API client
- **React Router**: Client-side routing

## Setup Instructions

### Prerequisites
- Docker and Docker Compose
- Rapid7 API credentials

### Environment Setup

1. Copy environment template:
```bash
cp .env.example .env
```

2. Update `.env` with your Rapid7 credentials:
```
RAPID7_API_KEY=your_rapid7_api_key_here
RAPID7_BASE_URL=https://us.api.insight.rapid7.com
JWT_SECRET_KEY=your_secure_jwt_secret_here
```

### Run with Docker Compose

```bash
docker-compose up -d
```

This will start:
- PostgreSQL database on port 5432
- Backend API on port 8000
- Frontend application on port 3000

### Manual Setup

#### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

#### Frontend
```bash
cd frontend
npm install
npm start
```

## API Endpoints

### Authentication
- `POST /auth/login` - User login

### Teams
- `GET /teams/` - List teams
- `POST /teams/` - Create team (admin only)

### Assets
- `GET /assets/` - List assets (filtered by team)
- `POST /assets/` - Create asset
- `GET /assets/{id}` - Get asset details
- `PUT /assets/{id}` - Update asset
- `DELETE /assets/{id}` - Delete asset
- `POST /assets/{id}/scan/` - Start vulnerability scan

### Vulnerabilities
- `GET /assets/{id}/vulnerabilities/` - Get asset vulnerabilities
- `GET /vulnerabilities/team/{team_id}` - Get team vulnerabilities

## Database Schema

### Core Tables
- **teams**: Team information
- **users**: User accounts with team association
- **assets**: Asset inventory with team ownership
- **services**: Services running on assets
- **vulnerabilities**: Vulnerability data from Rapid7
- **scans**: Scan history and status

## Rapid7 Integration

The application integrates with Rapid7 InsightVM/Nexpose API to:
- Search for assets by IP address
- Retrieve vulnerability data
- Initiate vulnerability scans
- Track scan status and results

### Required Rapid7 Permissions
- Asset search and view
- Vulnerability data access
- Scan initiation
- Site management

## Security Features

- **JWT Authentication**: Secure token-based authentication
- **Role-based Access Control**: Admin vs regular user permissions
- **Team-based Data Isolation**: Users only see their team's data
- **API Key Security**: Rapid7 credentials stored securely
- **Input Validation**: All inputs validated and sanitized

## Usage

1. **Login**: Use your credentials to access the system
2. **Dashboard**: View asset and vulnerability overview
3. **Assets**: Manage your team's asset inventory
4. **Scanning**: Initiate vulnerability scans on assets
5. **Reporting**: View vulnerability reports and trends

## Development

### Adding New Features
1. Backend: Add models, schemas, CRUD operations, and API endpoints
2. Frontend: Create components and integrate with API
3. Update types and interfaces as needed

### Testing
```bash
# Backend tests
cd backend
pytest

# Frontend tests
cd frontend
npm test
```

## Troubleshooting

### Common Issues
1. **Database Connection**: Ensure PostgreSQL is running
2. **Rapid7 API**: Verify API key and permissions
3. **CORS Issues**: Check frontend URL in backend CORS settings
4. **Authentication**: Ensure JWT secret is consistent

### Logs
- Backend logs: Available in Docker container or console
- Frontend logs: Browser developer console
- Database logs: PostgreSQL container logs

## License

Proprietary - Safaricom Internal Use Only