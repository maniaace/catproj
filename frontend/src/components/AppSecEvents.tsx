import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  Divider,
} from '@mui/material';
import {
  Search,
  ExpandMore,
  Timeline,
  Event,
  Security,
  BugReport,
  Assessment,
  Warning,
  Refresh,
  Info,
  Close,
} from '@mui/icons-material';
import { rapid7API } from '../api';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const AppSecEvents: React.FC = () => {
  const [apps, setApps] = useState<any[]>([]);
  const [selectedApp, setSelectedApp] = useState<string>('');
  const [scans, setScans] = useState<any[]>([]);
  const [vulnerabilities, setVulnerabilities] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [activeTab, setActiveTab] = useState<number>(0);
  const [selectedVulnerability, setSelectedVulnerability] = useState<any>(null);
  const [vulnerabilityDialogOpen, setVulnerabilityDialogOpen] = useState(false);

  useEffect(() => {
    fetchApps();
    fetchRecentScans();
    fetchRecentVulnerabilities();
  }, []);

  useEffect(() => {
    if (selectedApp) {
      fetchRecentScans();
      fetchRecentVulnerabilities();
    }
  }, [selectedApp]);

  const fetchApps = async () => {
    try {
      const appsData = await rapid7API.getApps();
      setApps(appsData);
    } catch (error) {
      console.error('Failed to fetch apps:', error);
      setAlert({ type: 'error', message: 'Failed to load applications' });
    }
  };

  const fetchRecentScans = async () => {
    try {
      const scansData = await rapid7API.getScans(selectedApp || undefined);
      setScans(scansData.slice(0, 20)); // Show last 20 scans
    } catch (error) {
      console.error('Failed to fetch scans:', error);
    }
  };

  const fetchRecentVulnerabilities = async () => {
    try {
      const vulnsData = await rapid7API.getExploitableVulnerabilities(selectedApp || undefined);
      setVulnerabilities(vulnsData.slice(0, 20)); // Show last 20 vulnerabilities
    } catch (error) {
      console.error('Failed to fetch vulnerabilities:', error);
    }
  };

  const handleAppChange = async (appId: string) => {
    setSelectedApp(appId);
    setLoading(true);
    try {
      await Promise.all([
        fetchRecentScans(),
        fetchRecentVulnerabilities()
      ]);
    } catch (error) {
      setAlert({ type: 'error', message: 'Failed to fetch data for selected application' });
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchRecentScans(),
        fetchRecentVulnerabilities()
      ]);
      setAlert({ type: 'success', message: 'Data refreshed successfully' });
    } catch (error) {
      setAlert({ type: 'error', message: 'Failed to refresh data' });
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (timestamp: string | number) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleString();
    } catch {
      return timestamp?.toString() || 'N/A';
    }
  };

  const getScanStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'running':
        return 'primary';
      case 'completed':
        return 'success';
      case 'failed':
        return 'error';
      case 'paused':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getVulnSeverityColor = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'critical':
        return 'error';
      case 'high':
        return 'warning';
      case 'medium':
        return 'info';
      case 'low':
        return 'success';
      default:
        return 'default';
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleVulnerabilityClick = async (vuln: any) => {
    setSelectedVulnerability(vuln);
    setVulnerabilityDialogOpen(true);
    
    // Fetch additional vulnerability details if needed
    if (vuln.id) {
      try {
        const detailedVuln = await rapid7API.getVulnerabilityDetails?.(vuln.id);
        if (detailedVuln) {
          setSelectedVulnerability({ ...vuln, ...detailedVuln });
        }
      } catch (error) {
        console.error('Failed to fetch vulnerability details:', error);
      }
    }
  };

  const handleCloseVulnerabilityDialog = () => {
    setVulnerabilityDialogOpen(false);
    setSelectedVulnerability(null);
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Application Security Events
      </Typography>
      <Typography variant="subtitle1" color="textSecondary" gutterBottom>
        Monitor scan activity and vulnerability findings from Rapid7 InsightAppSec
      </Typography>

      {/* Filter Controls */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>Application</InputLabel>
              <Select
                value={selectedApp}
                onChange={(e) => handleAppChange(e.target.value)}
                label="Application"
              >
                <MenuItem value="">All Applications</MenuItem>
                {apps.map((app) => (
                  <MenuItem key={app.id} value={app.id}>
                    {app.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Tooltip title="Refresh Data">
              <IconButton onClick={refreshData} disabled={loading}>
                {loading ? <CircularProgress size={20} /> : <Refresh />}
              </IconButton>
            </Tooltip>
          </Box>
        </CardContent>
      </Card>

      {alert && (
        <Alert severity={alert.type} onClose={() => setAlert(null)} sx={{ mb: 2 }}>
          {alert.message}
        </Alert>
      )}

      {/* Tabs */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={activeTab} onChange={handleTabChange} aria-label="AppSec events tabs">
            <Tab label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Assessment />
                Scan Activity ({scans.length})
              </Box>
            } />
            <Tab label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <BugReport />
                Vulnerability Findings ({vulnerabilities.length})
              </Box>
            } />
          </Tabs>
        </Box>

        <TabPanel value={activeTab} index={0}>
          {/* Scan Activity */}
          {scans.length > 0 ? (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Scan ID</TableCell>
                    <TableCell>Application</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Start Time</TableCell>
                    <TableCell>End Time</TableCell>
                    <TableCell>Duration</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {scans.map((scan) => (
                    <TableRow key={scan.id}>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                          {scan.id}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {scan.app?.name || 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={scan.status || 'Unknown'} 
                          color={getScanStatusColor(scan.status) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{formatTimestamp(scan.started_at || scan.created_at)}</TableCell>
                      <TableCell>{formatTimestamp(scan.completed_at || scan.ended_at)}</TableCell>
                      <TableCell>
                        {scan.duration ? `${scan.duration}s` : 'N/A'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Box textAlign="center" py={4}>
              <Assessment sx={{ fontSize: 60, color: 'grey.400', mb: 2 }} />
              <Typography variant="h6" color="textSecondary">
                No scan activity found
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Start a scan to see activity here
              </Typography>
            </Box>
          )}
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
          {/* Vulnerability Findings */}
          {vulnerabilities.length > 0 ? (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Vulnerability</TableCell>
                    <TableCell>Severity</TableCell>
                    <TableCell>Application</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Found Date</TableCell>
                    <TableCell>Details</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {vulnerabilities.map((vuln, index) => (
                    <TableRow 
                      key={vuln.id || index} 
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => handleVulnerabilityClick(vuln)}
                    >
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          {vuln.title || vuln.name || 'Unknown Vulnerability'}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {vuln.type || 'Security Finding'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={vuln.severity || 'Unknown'} 
                          color={getVulnSeverityColor(vuln.severity) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{vuln.app?.name || 'N/A'}</TableCell>
                      <TableCell>
                        <Chip 
                          label={vuln.status || 'Open'} 
                          color={vuln.status === 'Fixed' ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{formatTimestamp(vuln.found_date || vuln.created_at)}</TableCell>
                      <TableCell>
                        <Box sx={{ maxWidth: 300 }}>
                          {vuln.description && vuln.description.length > 100 ? (
                            <Accordion>
                              <AccordionSummary expandIcon={<ExpandMore />}>
                                <Typography variant="body2">
                                  {vuln.description.substring(0, 100)}...
                                </Typography>
                              </AccordionSummary>
                              <AccordionDetails>
                                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                                  {vuln.description}
                                </Typography>
                              </AccordionDetails>
                            </Accordion>
                          ) : (
                            <Typography variant="body2">
                              {vuln.description || 'No description available'}
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Box textAlign="center" py={4}>
              <BugReport sx={{ fontSize: 60, color: 'grey.400', mb: 2 }} />
              <Typography variant="h6" color="textSecondary">
                No vulnerability findings
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Run scans to discover vulnerabilities
              </Typography>
            </Box>
          )}
        </TabPanel>
      </Card>

      {/* Summary Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 2, mt: 3 }}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Assessment sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6">Active Scans</Typography>
            </Box>
            <Typography variant="h4" color="primary">
              {scans.filter(s => s.status === 'running').length}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Currently running
            </Typography>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Warning sx={{ mr: 1, color: 'warning.main' }} />
              <Typography variant="h6">High Severity</Typography>
            </Box>
            <Typography variant="h4" color="warning.main">
              {vulnerabilities.filter(v => v.severity?.toLowerCase() === 'high').length}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              High severity findings
            </Typography>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Security sx={{ mr: 1, color: 'error.main' }} />
              <Typography variant="h6">Critical Issues</Typography>
            </Box>
            <Typography variant="h4" color="error">
              {vulnerabilities.filter(v => v.severity?.toLowerCase() === 'critical').length}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Critical vulnerabilities
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Vulnerability Details Dialog */}
      <Dialog 
        open={vulnerabilityDialogOpen} 
        onClose={handleCloseVulnerabilityDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <BugReport />
              <Typography variant="h6">
                Vulnerability Details
              </Typography>
            </Box>
            <IconButton onClick={handleCloseVulnerabilityDialog}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedVulnerability && (
            <Box>
              <List>
                <ListItem>
                  <ListItemText
                    primary="Title"
                    secondary={selectedVulnerability.title || selectedVulnerability.name || 'Unknown Vulnerability'}
                  />
                </ListItem>
                <Divider />
                <ListItem>
                  <ListItemText
                    primary="Severity"
                    secondary={
                      <Chip 
                        label={selectedVulnerability.severity || 'Unknown'} 
                        color={getVulnSeverityColor(selectedVulnerability.severity) as any}
                        size="small"
                      />
                    }
                  />
                </ListItem>
                <Divider />
                <ListItem>
                  <ListItemText
                    primary="Status"
                    secondary={
                      <Chip 
                        label={selectedVulnerability.status || 'Open'} 
                        color={selectedVulnerability.status === 'Fixed' ? 'success' : 'default'}
                        size="small"
                      />
                    }
                  />
                </ListItem>
                <Divider />
                <ListItem>
                  <ListItemText
                    primary="Application"
                    secondary={selectedVulnerability.app?.name || 'N/A'}
                  />
                </ListItem>
                <Divider />
                <ListItem>
                  <ListItemText
                    primary="Found Date"
                    secondary={formatTimestamp(selectedVulnerability.found_date || selectedVulnerability.created_at)}
                  />
                </ListItem>
                <Divider />
                <ListItem>
                  <ListItemText
                    primary="Description"
                    secondary={
                      <Typography variant="body2" sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>
                        {selectedVulnerability.description || 'No description available'}
                      </Typography>
                    }
                  />
                </ListItem>
                {selectedVulnerability.solution && (
                  <>
                    <Divider />
                    <ListItem>
                      <ListItemText
                        primary="Solution"
                        secondary={
                          <Typography variant="body2" sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>
                            {selectedVulnerability.solution}
                          </Typography>
                        }
                      />
                    </ListItem>
                  </>
                )}
                {selectedVulnerability.proof && (
                  <>
                    <Divider />
                    <ListItem>
                      <ListItemText
                        primary="Proof of Concept"
                        secondary={
                          <Typography variant="body2" sx={{ mt: 1, whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
                            {selectedVulnerability.proof}
                          </Typography>
                        }
                      />
                    </ListItem>
                  </>
                )}
                {selectedVulnerability.references && selectedVulnerability.references.length > 0 && (
                  <>
                    <Divider />
                    <ListItem>
                      <ListItemText
                        primary="References"
                        secondary={
                          <Box sx={{ mt: 1 }}>
                            {selectedVulnerability.references.map((ref: any, index: number) => (
                              <Typography key={index} variant="body2" sx={{ mb: 0.5 }}>
                                • {ref.title || ref.name || ref.url || ref}
                              </Typography>
                            ))}
                          </Box>
                        }
                      />
                    </ListItem>
                  </>
                )}
              </List>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseVulnerabilityDialog}>Close</Button>
          {selectedVulnerability?.id && (
            <Button 
              variant="contained" 
              startIcon={<Info />}
              onClick={() => {
                // You can add additional actions here like navigating to more details
                console.log('View more details for:', selectedVulnerability.id);
              }}
            >
              View More Details
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AppSecEvents;