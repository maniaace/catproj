# InsightVM Integration Documentation

## Overview
This document describes the complete InsightVM integration implementation for the Safaricom Asset Inventory system. The integration enables bidirectional data synchronization between the local database and Rapid7 InsightVM for vulnerability management.

## Architecture

### Backend Integration (`backend/`)

#### 1. InsightVM Client (`insightvm_client.py`)
- **Purpose**: Comprehensive API client for Rapid7 InsightVM
- **Authentication**: Basic authentication with username/password
- **Key Features**:
  - Asset management (get, search, create)
  - Site management (get sites, assets per site)
  - Vulnerability management (get, search by severity, exploitable)
  - Scan management (start, pause, resume, stop)
  - Reporting (templates, generation)
  - Discovery and asset groups

#### 2. API Endpoints (`main.py`)
- **Connection Testing**: `GET /insightvm/test-connection`
- **Asset Management**:
  - `GET /insightvm/assets/` - List assets
  - `POST /insightvm/assets/search` - Search assets
  - `GET /insightvm/assets/{id}` - Get asset details
- **Site Management**:
  - `GET /insightvm/sites/` - List sites
  - `GET /insightvm/sites/{id}` - Get site details
  - `POST /insightvm/sites/{id}/scan` - Start site scan
- **Vulnerability Management**:
  - `GET /insightvm/vulnerabilities/` - List vulnerabilities
  - `GET /insightvm/vulnerabilities/exploitable` - Get exploitable vulnerabilities
  - `GET /insightvm/vulnerabilities/summary` - Get vulnerability summary
- **Data Synchronization**:
  - `POST /insightvm/sync/vulnerabilities` - Sync vulnerabilities to local DB
  - `POST /insightvm/sync/assets` - Sync assets to local DB
- **Dashboard Integration**:
  - `GET /insightvm/dashboard/stats` - Get dashboard statistics
  - `GET /insightvm/vulnerability-trends` - Get vulnerability trends

#### 3. Configuration (`config.py`)
```python
# InsightVM Configuration
rapid7_insightvm_base_url: str = "https://10.184.38.148:3780/api/3"
rapid7_insightvm_username: Optional[str] = None
rapid7_insightvm_password: Optional[str] = None
```

### Frontend Integration (`frontend/src/`)

#### 1. API Integration (`api.ts`)
- **InsightVM API Object**: `insightVMAPI`
- **Key Methods**:
  - `getDashboardStats()` - Get dashboard statistics
  - `getVulnerabilitiesSummary()` - Get vulnerability summary
  - `getSitesOverview()` - Get sites overview
  - `getAssetsWithVulnerabilities()` - Get assets with vulnerabilities
  - `syncVulnerabilities()` - Sync vulnerabilities from InsightVM
  - `syncAssets()` - Sync assets from InsightVM
  - `startSiteScan()` - Start site scan
  - `testConnection()` - Test connection

#### 2. Components

##### InsightVM Sites (`components/InsightVMSites.tsx`)
- **Purpose**: Manage and monitor InsightVM sites
- **Features**:
  - Site listing with vulnerability statistics
  - Asset counts per site
  - Risk score visualization
  - Scan initiation capabilities
  - Real-time scan status
  - Search and filtering

##### Vulnerabilities (`components/Vulnerabilities.tsx`)
- **Purpose**: Display and manage vulnerabilities
- **Features**:
  - Combined local and InsightVM vulnerability data
  - Sync functionality for admin users
  - Real-time vulnerability statistics
  - Exploit information display
  - Severity-based filtering
  - Vulnerability validation

##### Dashboard (`components/Dashboard.tsx`)
- **Purpose**: Centralized dashboard with InsightVM integration
- **Features**:
  - Combined statistics from local DB and InsightVM
  - Vulnerability trends
  - Active scan monitoring
  - Asset and site summaries

## Key Features

### 1. Data Synchronization
- **Bidirectional Sync**: Local database ↔ InsightVM
- **Asset Synchronization**: Automatic asset discovery and creation
- **Vulnerability Synchronization**: Real-time vulnerability data updates
- **Incremental Updates**: Only sync changed data

### 2. Security Features
- **Admin-Only Operations**: Sync operations restricted to admin users
- **Secure Authentication**: Basic auth with credentials validation
- **SSL/TLS Support**: Secure communication with InsightVM
- **Permission-Based Access**: Role-based access control

### 3. Real-time Monitoring
- **Live Dashboard**: Real-time vulnerability statistics
- **Scan Status**: Active scan monitoring
- **Trend Analysis**: Vulnerability trend visualization
- **Alert System**: Error and success notifications

### 4. Error Handling
- **Comprehensive Logging**: Detailed error logging
- **Graceful Degradation**: Fallback when InsightVM unavailable
- **User Feedback**: Clear error messages to users
- **Retry Logic**: Automatic retry for transient failures

## Configuration

### Environment Variables
```bash
# InsightVM Configuration
RAPID7_INSIGHTVM_BASE_URL=https://your-insightvm-host:3780/api/3
RAPID7_INSIGHTVM_USERNAME=your-username
RAPID7_INSIGHTVM_PASSWORD=your-password
```

### Database Schema
The integration uses existing database models:
- `Asset` - Enhanced with InsightVM asset ID mapping
- `Vulnerability` - Enhanced with InsightVM vulnerability ID mapping
- `Team` - Asset assignment for synchronized data
- `User` - Permission-based access control

## Usage

### 1. Initial Setup
1. Configure InsightVM credentials in environment variables
2. Test connection using the test endpoint
3. Run initial asset synchronization
4. Run initial vulnerability synchronization

### 2. Regular Operations
- **Dashboard Monitoring**: View combined statistics
- **Vulnerability Management**: Sync and manage vulnerabilities
- **Site Management**: Monitor and scan sites
- **Asset Discovery**: Automatic asset discovery and updates

### 3. Administrative Tasks
- **Sync Operations**: Manual synchronization triggers
- **Scan Management**: Start, pause, resume scans
- **Configuration**: Update credentials and settings
- **Monitoring**: Track sync success/failure rates

## Testing

### Test Script (`test_insightvm.py`)
```bash
python test_insightvm.py
```

### Frontend Validation (`test_typescript.js`)
```bash
node test_typescript.js
```

## Performance Considerations

### 1. API Rate Limiting
- InsightVM API has rate limits
- Implement exponential backoff
- Batch operations where possible

### 2. Data Volume Management
- Paginated API requests
- Incremental synchronization
- Configurable batch sizes

### 3. Database Optimization
- Indexed vulnerability lookups
- Efficient query patterns
- Connection pooling

## Security Considerations

### 1. Credential Management
- Store credentials securely
- Rotate credentials regularly
- Use environment variables

### 2. Network Security
- SSL/TLS for all communications
- VPN/private network recommended
- Firewall rules for InsightVM access

### 3. Data Protection
- Encrypt sensitive data in transit
- Audit trail for all operations
- Regular security reviews

## Troubleshooting

### Common Issues
1. **Connection Failures**: Check credentials and network connectivity
2. **Sync Failures**: Review logs for detailed error messages
3. **Performance Issues**: Monitor API rate limits and batch sizes
4. **Data Inconsistencies**: Run full resynchronization

### Monitoring
- Check application logs for errors
- Monitor API response times
- Track sync success rates
- Review vulnerability trends

## Future Enhancements

### Planned Features
1. **Automated Scheduling**: Scheduled synchronization
2. **Advanced Filtering**: Enhanced search and filtering
3. **Custom Reports**: InsightVM report integration
4. **Webhook Support**: Real-time notifications
5. **Mobile Support**: Mobile-responsive interface

### Performance Improvements
1. **Caching**: Redis caching for frequently accessed data
2. **Background Jobs**: Async synchronization tasks
3. **Compression**: API response compression
4. **Database Optimization**: Query optimization and indexing

## Support

For issues or questions regarding the InsightVM integration:
1. Check the application logs for detailed error messages
2. Run the test scripts to validate configuration
3. Review the network connectivity to InsightVM
4. Verify credentials and permissions