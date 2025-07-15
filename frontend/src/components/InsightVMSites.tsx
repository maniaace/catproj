import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  CircularProgress,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  Alert,
  TextField,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
} from '@mui/material';
import {
  Search,
  PlayArrow,
  Visibility,
  Security,
  Computer,
  BugReport,
  Warning,
  CheckCircle,
  Schedule,
  Refresh,
  Scanner,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { insightVMAPI } from '../api';

interface Site {
  id: number;
  name: string;
  description: string;
  type: string;
  importance: string;
  scan_template: string;
  assets_count: number;
  vulnerabilities: {
    critical: number;
    severe: number;
    moderate: number;
    total: number;
  };
  last_scan: string;
  risk_score: number;
  created: string;
  targets: string[];
}

const InsightVMSites: React.FC = () => {
  const { user } = useAuth();
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);
  const [scanDialog, setScanDialog] = useState(false);
  const [totalSites, setTotalSites] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize] = useState(25);

  const fetchSites = async () => {
    try {
      setError(null);
      
      const response = await insightVMAPI.getSitesOverview(page, pageSize);
      setSites(response.sites || []);
      setTotalSites(response.totalResources || 0);
    } catch (error) {
      console.error('Failed to fetch InsightVM sites:', error);
      setError('Failed to load InsightVM sites. Please check the API connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSites();
  }, [page]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchSites();
  };

  const handleStartScan = async (site: Site) => {
    if (!user?.is_admin) {
      setError('Admin privileges required to start scans');
      return;
    }

    try {
      const result = await insightVMAPI.startSiteScan(site.id, `Manual_Scan_${Date.now()}`);
      setError(null);
      alert(`Scan started successfully for ${site.name}. Scan ID: ${result.id || 'N/A'}`);
      setScanDialog(false);
      handleRefresh();
    } catch (error) {
      console.error('Failed to start scan:', error);
      setError('Failed to start scan. Please try again.');
    }
  };

  const filteredSites = sites.filter(site =>
    site.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    site.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatTimeAgo = (timestamp: string) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return 'Just now';
  };

  const getSeverityColor = (severity: string, value: number) => {
    if (value === 0) return 'default';
    switch (severity) {
      case 'critical': return 'error';
      case 'severe': return 'warning';
      case 'moderate': return 'info';
      default: return 'default';
    }
  };

  const getRiskLevel = (score: number) => {
    if (score >= 800) return { level: 'Critical', color: 'error' };
    if (score >= 600) return { level: 'High', color: 'warning' };
    if (score >= 400) return { level: 'Medium', color: 'info' };
    return { level: 'Low', color: 'success' };
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            InsightVM Sites
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Manage and monitor vulnerability scanning sites ({totalSites} total)
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            placeholder="Search sites..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            size="small"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
          />
          <Tooltip title="Refresh Sites">
            <IconButton onClick={handleRefresh} disabled={refreshing}>
              <Refresh sx={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Statistics Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 3, mb: 3 }}>
        <Card>
          <CardContent sx={{ textAlign: 'center' }}>
            <Security sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
            <Typography variant="h4" color="primary">
              {totalSites}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total Sites
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent sx={{ textAlign: 'center' }}>
            <Computer sx={{ fontSize: 40, color: 'info.main', mb: 1 }} />
            <Typography variant="h4" color="info.main">
              {sites.reduce((sum, site) => sum + (site.assets_count || 0), 0)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total Assets
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent sx={{ textAlign: 'center' }}>
            <BugReport sx={{ fontSize: 40, color: 'error.main', mb: 1 }} />
            <Typography variant="h4" color="error.main">
              {sites.reduce((sum, site) => sum + (site.vulnerabilities?.critical || 0), 0)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Critical Vulnerabilities
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent sx={{ textAlign: 'center' }}>
            <Warning sx={{ fontSize: 40, color: 'warning.main', mb: 1 }} />
            <Typography variant="h4" color="warning.main">
              {sites.reduce((sum, site) => sum + (site.vulnerabilities?.severe || 0), 0)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              High Vulnerabilities
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Sites Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Site Details
          </Typography>
          
          {filteredSites.length === 0 ? (
            <Box textAlign="center" py={8}>
              <Security sx={{ fontSize: 80, color: 'grey.400', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                {searchTerm ? 'No sites match your search' : 'No sites found'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {searchTerm ? 'Try adjusting your search terms' : 'InsightVM sites will appear here once configured'}
              </Typography>
            </Box>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Site Information</TableCell>
                    <TableCell align="center">Assets</TableCell>
                    <TableCell align="center">Vulnerabilities</TableCell>
                    <TableCell align="center">Risk Score</TableCell>
                    <TableCell align="center">Last Scan</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredSites.map((site) => {
                    const riskLevel = getRiskLevel(site.risk_score || 0);
                    return (
                      <TableRow key={site.id} hover>
                        <TableCell>
                          <Box>
                            <Typography variant="body1" fontWeight="bold">
                              {site.name || `Site ${site.id}`}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {site.description || 'No description available'}
                            </Typography>
                            <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                              <Chip 
                                label={site.type || 'Unknown'} 
                                size="small" 
                                variant="outlined"
                              />
                              <Chip 
                                label={site.importance || 'Normal'} 
                                size="small" 
                                color={site.importance === 'high' ? 'error' : 'default'}
                              />
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell align="center">
                          <Chip 
                            label={site.assets_count || 0}
                            color="primary"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                              <Chip 
                                label={`C: ${site.vulnerabilities?.critical || 0}`}
                                size="small"
                                color={getSeverityColor('critical', site.vulnerabilities?.critical || 0) as any}
                              />
                              <Chip 
                                label={`H: ${site.vulnerabilities?.severe || 0}`}
                                size="small"
                                color={getSeverityColor('severe', site.vulnerabilities?.severe || 0) as any}
                              />
                            </Box>
                            <Typography variant="caption" color="text.secondary">
                              Total: {site.vulnerabilities?.total || 0}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="center">
                          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <Typography variant="h6" color={`${riskLevel.color}.main`}>
                              {Math.round(site.risk_score || 0)}
                            </Typography>
                            <Chip 
                              label={riskLevel.level}
                              size="small"
                              color={riskLevel.color as any}
                              variant="outlined"
                            />
                          </Box>
                        </TableCell>
                        <TableCell align="center">
                          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <Typography variant="body2">
                              {formatTimeAgo(site.last_scan)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {site.last_scan ? new Date(site.last_scan).toLocaleDateString() : 'Never scanned'}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="center">
                          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                            <Tooltip title="View Details">
                              <IconButton 
                                size="small" 
                                color="primary"
                                onClick={() => setSelectedSite(site)}
                              >
                                <Visibility />
                              </IconButton>
                            </Tooltip>
                            {user?.is_admin && (
                              <Tooltip title="Start Scan">
                                <IconButton 
                                  size="small" 
                                  color="secondary"
                                  onClick={() => {
                                    setSelectedSite(site);
                                    setScanDialog(true);
                                  }}
                                >
                                  <PlayArrow />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* Pagination would go here */}
          {filteredSites.length > 0 && (
            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Showing {filteredSites.length} of {totalSites} sites
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Scan Confirmation Dialog */}
      <Dialog open={scanDialog} onClose={() => setScanDialog(false)}>
        <DialogTitle>
          <Scanner sx={{ mr: 1, verticalAlign: 'middle' }} />
          Start Vulnerability Scan
        </DialogTitle>
        <DialogContent>
          {selectedSite && (
            <Box>
              <Typography variant="body1" gutterBottom>
                Are you sure you want to start a vulnerability scan for:
              </Typography>
              <Typography variant="h6" color="primary" gutterBottom>
                {selectedSite.name}
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                This will scan {selectedSite.assets_count || 0} assets in this site.
                The scan may take several minutes to hours depending on the scope.
              </Typography>
              <Alert severity="info">
                Only administrators can start vulnerability scans.
              </Alert>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setScanDialog(false)}>
            Cancel
          </Button>
          <Button 
            onClick={() => selectedSite && handleStartScan(selectedSite)}
            variant="contained"
            color="primary"
            startIcon={<PlayArrow />}
          >
            Start Scan
          </Button>
        </DialogActions>
      </Dialog>

      {/* Site Details Dialog */}
      <Dialog 
        open={!!selectedSite && !scanDialog} 
        onClose={() => setSelectedSite(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Site Details: {selectedSite?.name}
        </DialogTitle>
        <DialogContent>
          {selectedSite && (
            <Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Basic Information
                  </Typography>
                  <Typography variant="body2" paragraph>
                    <strong>Description:</strong> {selectedSite.description || 'No description'}
                  </Typography>
                  <Typography variant="body2" paragraph>
                    <strong>Type:</strong> {selectedSite.type || 'Unknown'}
                  </Typography>
                  <Typography variant="body2" paragraph>
                    <strong>Importance:</strong> {selectedSite.importance || 'Normal'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Scan Information
                  </Typography>
                  <Typography variant="body2" paragraph>
                    <strong>Last Scan:</strong> {formatTimeAgo(selectedSite.last_scan)}
                  </Typography>
                  <Typography variant="body2" paragraph>
                    <strong>Assets:</strong> {selectedSite.assets_count || 0}
                  </Typography>
                  <Typography variant="body2" paragraph>
                    <strong>Risk Score:</strong> {Math.round(selectedSite.risk_score || 0)}
                  </Typography>
                </Box>
              </Box>
              
              {selectedSite.targets && selectedSite.targets.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Scan Targets
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {selectedSite.targets.slice(0, 10).map((target, index) => (
                      <Chip 
                        key={index}
                        label={target}
                        size="small"
                        variant="outlined"
                      />
                    ))}
                    {selectedSite.targets.length > 10 && (
                      <Chip 
                        label={`+${selectedSite.targets.length - 10} more`}
                        size="small"
                        color="secondary"
                      />
                    )}
                  </Box>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedSite(null)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default InsightVMSites;