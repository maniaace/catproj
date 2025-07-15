import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  CircularProgress,
  Alert,
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Tabs,
  Tab,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
} from '@mui/material';
import {
  Security,
  Computer,
  Assessment,
  PlayArrow,
  Pause,
  Stop,
  Refresh,
  Warning,
  CheckCircle,
  Error,
  Info,
  ExpandMore,
  Visibility,
  BugReport,
  Storage,
  NetworkCheck,
  Timeline,
  TrendingUp,
  Settings,
  Sync,
  Launch,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { insightVMAPI } from '../api';

interface InsightVMStats {
  vulnerabilities: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    exploitable: number;
  };
  assets: {
    total: number;
    scanned: number;
    unscanned: number;
  };
  sites: {
    total: number;
    active: number;
  };
  scans: {
    total: number;
    active: number;
    completed: number;
    failed: number;
  };
}

interface Site {
  id: number;
  name: string;
  description?: string;
  riskScore: number;
  assets: number;
  vulnerabilities: number;
  lastScan?: string;
  scanStatus: string;
}

interface Asset {
  id: number;
  ip: string;
  hostName?: string;
  os?: string;
  riskScore: number;
  vulnerabilities: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  lastScan?: string;
  scanStatus: string;
}

interface Vulnerability {
  id: string;
  title: string;
  severity: string;
  cvssScore: number;
  description: string;
  solution: string;
  published: string;
  modified: string;
  exploits: number;
  malwareKits: number;
  affectedAssets: number;
}

interface Scan {
  id: number;
  name: string;
  status: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  assetsScanned: number;
  vulnerabilitiesFound: number;
  siteId: number;
  siteName: string;
}

const InsightVM: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [stats, setStats] = useState<InsightVMStats | null>(null);
  const [sites, setSites] = useState<Site[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [vulnerabilities, setVulnerabilities] = useState<Vulnerability[]>([]);
  const [scans, setScans] = useState<Scan[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<string>('unknown');
  const [selectedSite, setSelectedSite] = useState<number | null>(null);
  const [scanDialog, setScanDialog] = useState(false);
  const [syncDialog, setSyncDialog] = useState(false);
  const [scanName, setScanName] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      // First test connection to provide better error messages
      await fetchConnectionStatus();
      
      // Then fetch all data with individual error handling
      const results = await Promise.allSettled([
        fetchStats(),
        fetchSites(),
        fetchAssets(),
        fetchVulnerabilities(),
        fetchScans(),
      ]);
      
      // Log results for debugging
      console.log('InsightVM Data Fetch Results:', results);
      
      // Check for any failures and provide specific error messages
      const failures = results.filter(result => result.status === 'rejected');
      if (failures.length > 0) {
        console.error('Some InsightVM API calls failed:', failures);
        setError(`Failed to load some InsightVM data. Check console for details. Connection: ${connectionStatus}`);
      }
      
    } catch (error: any) {
      console.error('Failed to fetch InsightVM dashboard data:', error);
      setError(`Failed to load InsightVM data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchConnectionStatus = async () => {
    try {
      const response = await insightVMAPI.testConnection();
      console.log('Connection test response:', response);
      setConnectionStatus(response.status);
      if (response.status !== 'connected') {
        console.warn('InsightVM connection failed:', response.message);
      }
    } catch (error: any) {
      console.error('Connection test failed:', error);
      setConnectionStatus('failed');
    }
  };

  const fetchStats = async () => {
    try {
      const response = await insightVMAPI.getDashboardStats();
      console.log('Stats response:', response);
      setStats(response);
      if (!response || response.error) {
        throw new globalThis.Error('Invalid stats response');
      }
    } catch (error: any) {
      console.error('Failed to fetch stats:', error);
      throw error;
    }
  };

  const fetchSites = async () => {
    try {
      const response = await insightVMAPI.getSitesOverview();
      console.log('Sites response:', response);
      const sitesData = response.resources || response.sites || [];
      setSites(sitesData);
      console.log(`Loaded ${sitesData.length} sites`);
    } catch (error: any) {
      console.error('Failed to fetch sites:', error);
      throw error;
    }
  };

  const fetchAssets = async () => {
    try {
      const response = await insightVMAPI.getAssetsWithVulnerabilities();
      console.log('Assets response:', response);
      const assetsData = response.resources || response.assets || [];
      setAssets(assetsData);
      console.log(`Loaded ${assetsData.length} assets`);
    } catch (error: any) {
      console.error('Failed to fetch assets:', error);
      throw error;
    }
  };

  const fetchVulnerabilities = async () => {
    try {
      const response = await insightVMAPI.getVulnerabilitiesSummary();
      console.log('Vulnerabilities response:', response);
      const vulnData = response.resources || response.vulnerabilities || [];
      setVulnerabilities(vulnData);
      console.log(`Loaded ${vulnData.length} vulnerabilities`);
    } catch (error: any) {
      console.error('Failed to fetch vulnerabilities:', error);
      throw error;
    }
  };

  const fetchScans = async () => {
    try {
      const response = await insightVMAPI.getScans();
      console.log('Scans response:', response);
      const scansData = response.resources || response.scans || [];
      setScans(scansData);
      console.log(`Loaded ${scansData.length} scans`);
    } catch (error: any) {
      console.error('Failed to fetch scans:', error);
      throw error;
    }
  };

  const handleStartScan = async (siteId: number) => {
    try {
      await insightVMAPI.startSiteScan(siteId, scanName);
      setScanDialog(false);
      setScanName('');
      fetchScans();
      setError(null);
    } catch (error: any) {
      setError(error.message || 'Failed to start scan');
    }
  };

  const handleSyncAssets = async () => {
    try {
      await insightVMAPI.syncAssets(undefined, true);
      setSyncDialog(false);
      fetchAssets();
      setError(null);
    } catch (error: any) {
      setError(error.message || 'Failed to sync assets');
    }
  };

  const handleSyncVulnerabilities = async () => {
    try {
      await insightVMAPI.syncVulnerabilities(undefined, true);
      setSyncDialog(false);
      fetchVulnerabilities();
      setError(null);
    } catch (error: any) {
      setError(error.message || 'Failed to sync vulnerabilities');
    }
  };

  const getSeverityColor = (severity: string | undefined) => {
    if (!severity) return 'default';
    switch (severity.toLowerCase()) {
      case 'critical': return 'error';
      case 'severe': 
      case 'high': return 'warning';
      case 'moderate':
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  const getSeverityIcon = (severity: string | undefined) => {
    if (!severity) return <Info />;
    switch (severity.toLowerCase()) {
      case 'critical': return <Error />;
      case 'severe':
      case 'high': return <Warning />;
      case 'moderate':
      case 'medium': return <Info />;
      case 'low': return <CheckCircle />;
      default: return <Info />;
    }
  };

  const getStatusColor = (status: string | undefined) => {
    if (!status) return 'default';
    switch (status.toLowerCase()) {
      case 'running': return 'info';
      case 'completed': return 'success';
      case 'failed': return 'error';
      case 'paused': return 'warning';
      default: return 'default';
    }
  };

  const renderOverviewTab = () => (
    <Box>
      {/* Connection Status */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Box display="flex" alignItems="center">
              <NetworkCheck sx={{ mr: 2 }} />
              <Typography variant="h6">InsightVM Connection</Typography>
            </Box>
            <Box display="flex" alignItems="center">
              <Chip
                label={connectionStatus === 'connected' ? 'Connected' : 'Disconnected'}
                color={connectionStatus === 'connected' ? 'success' : 'error'}
                icon={connectionStatus === 'connected' ? <CheckCircle /> : <Error />}
              />
              <Tooltip title="Test Connection">
                <IconButton onClick={fetchConnectionStatus} sx={{ ml: 1 }}>
                  <Refresh />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
          
          {/* Troubleshooting Info */}
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="textSecondary">
              <strong>Endpoint:</strong> https://10.184.38.148:3780/api/3
            </Typography>
            <Typography variant="body2" color="textSecondary">
              <strong>Status:</strong> {connectionStatus}
            </Typography>
            {connectionStatus === 'failed' && (
              <Alert severity="warning" sx={{ mt: 1 }}>
                <Typography variant="body2">
                  <strong>Troubleshooting Steps:</strong>
                </Typography>
                <Typography variant="body2" component="div">
                  1. Check if InsightVM credentials are set in environment variables<br/>
                  2. Verify InsightVM server is accessible at https://10.184.38.148:3780<br/>
                  3. Ensure SSL certificates are properly configured<br/>
                  4. Check backend logs for detailed error messages<br/>
                  5. Verify user has sufficient permissions in InsightVM
                </Typography>
              </Alert>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Data Summary */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Data Summary
          </Typography>
          <Box display="flex" flexWrap="wrap" gap={2}>
            <Chip label={`${sites.length} Sites`} color="info" />
            <Chip label={`${assets.length} Assets`} color="primary" />
            <Chip label={`${vulnerabilities.length} Vulnerabilities`} color="warning" />
            <Chip label={`${scans.length} Scans`} color="secondary" />
          </Box>
          {(sites.length === 0 && assets.length === 0 && vulnerabilities.length === 0 && scans.length === 0) && (
            <Alert severity="info" sx={{ mt: 2 }}>
              No data loaded yet. This could indicate:
              <ul>
                <li>InsightVM connection issues</li>
                <li>No data available in the InsightVM instance</li>
                <li>Authentication or permission problems</li>
                <li>Network connectivity issues</li>
              </ul>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Statistics Cards */}
      {stats && stats.vulnerabilities && (
        <Box display="flex" flexWrap="wrap" gap={2} mb={3}>
          <Card sx={{ flex: '1 1 200px', minWidth: 200 }}>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Security color="error" sx={{ mr: 2 }} />
                <Box>
                  <Typography variant="h4">{stats.vulnerabilities.total || 0}</Typography>
                  <Typography variant="body2" color="textSecondary">
                    Total Vulnerabilities
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>

          <Card sx={{ flex: '1 1 200px', minWidth: 200 }}>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Warning color="error" sx={{ mr: 2 }} />
                <Box>
                  <Typography variant="h4">{stats.vulnerabilities.critical || 0}</Typography>
                  <Typography variant="body2" color="textSecondary">
                    Critical Vulnerabilities
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>

          <Card sx={{ flex: '1 1 200px', minWidth: 200 }}>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Computer color="primary" sx={{ mr: 2 }} />
                <Box>
                  <Typography variant="h4">{stats.assets?.total || 0}</Typography>
                  <Typography variant="body2" color="textSecondary">
                    Total Assets
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>

          <Card sx={{ flex: '1 1 200px', minWidth: 200 }}>
            <CardContent>
              <Box display="flex" alignItems="center">
                <BugReport color="warning" sx={{ mr: 2 }} />
                <Box>
                  <Typography variant="h4">{stats.vulnerabilities.exploitable || 0}</Typography>
                  <Typography variant="body2" color="textSecondary">
                    Exploitable Vulnerabilities
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* Vulnerability Distribution */}
      {stats && stats.vulnerabilities && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Vulnerability Distribution
            </Typography>
            <Box display="flex" flexWrap="wrap" gap={2}>
              <Box display="flex" alignItems="center" gap={1}>
                <Chip
                  label={`Critical: ${stats.vulnerabilities.critical || 0}`}
                  color="error"
                  size="small"
                />
              </Box>
              <Box display="flex" alignItems="center" gap={1}>
                <Chip
                  label={`High: ${stats.vulnerabilities.high || 0}`}
                  color="warning"
                  size="small"
                />
              </Box>
              <Box display="flex" alignItems="center" gap={1}>
                <Chip
                  label={`Medium: ${stats.vulnerabilities.medium || 0}`}
                  color="info"
                  size="small"
                />
              </Box>
              <Box display="flex" alignItems="center" gap={1}>
                <Chip
                  label={`Low: ${stats.vulnerabilities.low || 0}`}
                  color="success"
                  size="small"
                />
              </Box>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Recent Scans */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Recent Scans
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Scan Name</TableCell>
                  <TableCell>Site</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Assets</TableCell>
                  <TableCell>Vulnerabilities</TableCell>
                  <TableCell>Start Time</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {scans.slice(0, 10).map((scan) => (
                  <TableRow key={scan.id}>
                    <TableCell>{scan.name}</TableCell>
                    <TableCell>{scan.siteName}</TableCell>
                    <TableCell>
                      <Chip
                        label={scan.status || 'Unknown'}
                        color={getStatusColor(scan.status) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{scan.assetsScanned}</TableCell>
                    <TableCell>{scan.vulnerabilitiesFound}</TableCell>
                    <TableCell>{new Date(scan.startTime).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );

  const renderSitesTab = () => (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">Sites Management</Typography>
        <Tooltip title={!user?.is_admin ? "Admin privileges required" : "Start Scan"}>
          <span>
            <Button
              variant="contained"
              startIcon={<PlayArrow />}
              onClick={() => setScanDialog(true)}
              disabled={!user?.is_admin}
            >
              Start Scan
            </Button>
          </span>
        </Tooltip>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Site Name</TableCell>
              <TableCell>Risk Score</TableCell>
              <TableCell>Assets</TableCell>
              <TableCell>Vulnerabilities</TableCell>
              <TableCell>Last Scan</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sites.map((site) => (
              <TableRow key={site.id}>
                <TableCell>
                  <Box>
                    <Typography variant="subtitle2">{site.name}</Typography>
                    {site.description && (
                      <Typography variant="body2" color="textSecondary">
                        {site.description}
                      </Typography>
                    )}
                  </Box>
                </TableCell>
                <TableCell>
                  <Box display="flex" alignItems="center">
                    <Typography variant="body2" sx={{ mr: 1 }}>
                      {site.riskScore}
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={(site.riskScore / 1000) * 100}
                      sx={{ width: 100 }}
                    />
                  </Box>
                </TableCell>
                <TableCell>{site.assets}</TableCell>
                <TableCell>{site.vulnerabilities}</TableCell>
                <TableCell>
                  {site.lastScan ? new Date(site.lastScan).toLocaleDateString() : 'Never'}
                </TableCell>
                <TableCell>
                  <Chip
                    label={site.scanStatus || 'Unknown'}
                    color={getStatusColor(site.scanStatus) as any}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Tooltip title="Start Scan">
                    <span>
                      <IconButton
                        onClick={() => {
                          setSelectedSite(site.id);
                          setScanDialog(true);
                        }}
                        disabled={!user?.is_admin}
                      >
                        <PlayArrow />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title="View Details">
                    <IconButton>
                      <Visibility />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );

  const renderAssetsTab = () => (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">Assets Management</Typography>
        <Tooltip title={!user?.is_admin ? "Admin privileges required" : "Sync Assets"}>
          <span>
            <Button
              variant="outlined"
              startIcon={<Sync />}
              onClick={() => setSyncDialog(true)}
              disabled={!user?.is_admin}
            >
              Sync Assets
            </Button>
          </span>
        </Tooltip>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>IP Address</TableCell>
              <TableCell>Hostname</TableCell>
              <TableCell>OS</TableCell>
              <TableCell>Risk Score</TableCell>
              <TableCell>Critical</TableCell>
              <TableCell>High</TableCell>
              <TableCell>Medium</TableCell>
              <TableCell>Low</TableCell>
              <TableCell>Last Scan</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {assets.map((asset) => (
              <TableRow key={asset.id}>
                <TableCell>
                  <Typography variant="body2" fontFamily="monospace">
                    {asset.ip}
                  </Typography>
                </TableCell>
                <TableCell>{asset.hostName || '-'}</TableCell>
                <TableCell>{asset.os || '-'}</TableCell>
                <TableCell>
                  <Box display="flex" alignItems="center">
                    <Typography variant="body2" sx={{ mr: 1 }}>
                      {asset.riskScore}
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={(asset.riskScore / 1000) * 100}
                      sx={{ width: 80 }}
                    />
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip
                    label={asset.vulnerabilities.critical}
                    color="error"
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={asset.vulnerabilities.high}
                    color="warning"
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={asset.vulnerabilities.medium}
                    color="info"
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={asset.vulnerabilities.low}
                    color="success"
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  {asset.lastScan ? new Date(asset.lastScan).toLocaleDateString() : 'Never'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );

  const renderVulnerabilitiesTab = () => (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">Vulnerabilities Management</Typography>
        <Tooltip title={!user?.is_admin ? "Admin privileges required" : "Sync Vulnerabilities"}>
          <span>
            <Button
              variant="outlined"
              startIcon={<Sync />}
              onClick={() => setSyncDialog(true)}
              disabled={!user?.is_admin}
            >
              Sync Vulnerabilities
            </Button>
          </span>
        </Tooltip>
      </Box>

      {vulnerabilities.map((vuln) => (
        <Accordion key={vuln.id} sx={{ mb: 1 }}>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Box display="flex" alignItems="center" width="100%">
              <Box display="flex" alignItems="center" sx={{ mr: 2 }}>
                {getSeverityIcon(vuln.severity)}
                <Chip
                  label={vuln.severity}
                  color={getSeverityColor(vuln.severity) as any}
                  size="small"
                  sx={{ ml: 1 }}
                />
              </Box>
              <Box flexGrow={1}>
                <Typography variant="subtitle1">{vuln.title}</Typography>
                <Typography variant="body2" color="textSecondary">
                  CVSS: {vuln.cvssScore} | Assets: {vuln.affectedAssets}
                </Typography>
              </Box>
              {vuln.exploits > 0 && (
                <Chip
                  label={`${vuln.exploits} exploits`}
                  color="error"
                  size="small"
                  sx={{ mr: 1 }}
                />
              )}
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Box>
              <Typography variant="body2" paragraph>
                <strong>Description:</strong> {vuln.description}
              </Typography>
              <Typography variant="body2" paragraph>
                <strong>Solution:</strong> {vuln.solution}
              </Typography>
              <Box display="flex" gap={2} mt={2}>
                <Typography variant="body2">
                  <strong>Published:</strong> {new Date(vuln.published).toLocaleDateString()}
                </Typography>
                <Typography variant="body2">
                  <strong>Modified:</strong> {new Date(vuln.modified).toLocaleDateString()}
                </Typography>
              </Box>
            </Box>
          </AccordionDetails>
        </Accordion>
      ))}
    </Box>
  );

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">InsightVM Security Dashboard</Typography>
        <Box display="flex" gap={2}>
          <Tooltip title="Refresh Data">
            <IconButton onClick={fetchDashboardData} disabled={loading}>
              <Refresh />
            </IconButton>
          </Tooltip>
          <Tooltip title="Open InsightVM Console">
            <IconButton
              onClick={() => window.open('https://10.184.38.148:3780', '_blank')}
            >
              <Launch />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {loading && (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      )}

      {!loading && (
        <Box>
          <Tabs
            value={activeTab}
            onChange={(_, newValue) => setActiveTab(newValue)}
            sx={{ mb: 3 }}
          >
            <Tab label="Overview" />
            <Tab label="Sites" />
            <Tab label="Assets" />
            <Tab label="Vulnerabilities" />
          </Tabs>

          {activeTab === 0 && renderOverviewTab()}
          {activeTab === 1 && renderSitesTab()}
          {activeTab === 2 && renderAssetsTab()}
          {activeTab === 3 && renderVulnerabilitiesTab()}
        </Box>
      )}

      {/* Scan Dialog */}
      <Dialog open={scanDialog} onClose={() => setScanDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Start Site Scan</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Scan Name"
            fullWidth
            variant="outlined"
            value={scanName}
            onChange={(e) => setScanName(e.target.value)}
            sx={{ mb: 2 }}
          />
          <Typography variant="body2" color="textSecondary">
            Leave empty for auto-generated name
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setScanDialog(false)}>Cancel</Button>
          <Button
            onClick={() => selectedSite && handleStartScan(selectedSite)}
            variant="contained"
            disabled={!selectedSite}
          >
            Start Scan
          </Button>
        </DialogActions>
      </Dialog>

      {/* Sync Dialog */}
      <Dialog open={syncDialog} onClose={() => setSyncDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Sync InsightVM Data</DialogTitle>
        <DialogContent>
          <Typography variant="body2" paragraph>
            Choose what data to synchronize from InsightVM:
          </Typography>
          <Box display="flex" flexDirection="column" gap={2}>
            <Button
              variant="outlined"
              startIcon={<Computer />}
              onClick={handleSyncAssets}
              fullWidth
            >
              Sync Assets
            </Button>
            <Button
              variant="outlined"
              startIcon={<Security />}
              onClick={handleSyncVulnerabilities}
              fullWidth
            >
              Sync Vulnerabilities
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSyncDialog(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default InsightVM;