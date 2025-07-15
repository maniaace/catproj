import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  TextField,
  MenuItem,
  InputAdornment,
  Button,
  Card,
  CardContent,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Search,
  Security,
  BugReport,
  CheckCircle,
  Warning,
  Info,
  Sync,
  CloudSync,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { vulnerabilitiesAPI, rapid7API, insightVMAPI } from '../api';
import { Vulnerability, VulnerabilityExploit } from '../types';

const getSeverityColor = (severity: string) => {
  switch (severity.toLowerCase()) {
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

const Vulnerabilities: React.FC = () => {
  const { user } = useAuth();
  const [vulnerabilities, setVulnerabilities] = useState<Vulnerability[]>([]);
  const [filteredVulns, setFilteredVulns] = useState<Vulnerability[]>([]);
  const [exploitableVulns, setExploitableVulns] = useState<Vulnerability[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [alert, setAlert] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [exploitsDialog, setExploitsDialog] = useState<{ open: boolean; vulnId: string; exploits: VulnerabilityExploit[] }>({
    open: false,
    vulnId: '',
    exploits: []
  });
  const [syncDialog, setSyncDialog] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [insightVMData, setInsightVMData] = useState<any>(null);

  useEffect(() => {
    fetchVulnerabilities();
  }, [user]);

  useEffect(() => {
    filterVulnerabilities();
  }, [vulnerabilities, searchTerm, severityFilter]);

  const fetchVulnerabilities = async () => {
    if (!user?.team_id) {
      setLoading(false);
      return;
    }

    try {
      const [vulnData, exploitableData, insightVMStats] = await Promise.all([
        vulnerabilitiesAPI.getTeamVulnerabilities(user.team_id),
        rapid7API.getExploitableVulnerabilities().catch(() => []),
        insightVMAPI.getDashboardStats().catch(() => null)
      ]);
      setVulnerabilities(vulnData);
      setExploitableVulns(Array.isArray(exploitableData) ? exploitableData : []);
      setInsightVMData(insightVMStats);
    } catch (error) {
      console.error('Failed to fetch vulnerabilities:', error);
      setAlert({ type: 'error', message: 'Failed to fetch vulnerabilities' });
    } finally {
      setLoading(false);
    }
  };

  const filterVulnerabilities = () => {
    let filtered = vulnerabilities;

    if (searchTerm) {
      filtered = filtered.filter(vuln =>
        vuln.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vuln.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (severityFilter !== 'all') {
      filtered = filtered.filter(vuln =>
        vuln.severity.toLowerCase() === severityFilter.toLowerCase()
      );
    }

    setFilteredVulns(filtered);
  };

  const handleViewExploits = async (vulnId: string) => {
    try {
      const exploits = await rapid7API.getVulnerabilityExploits(vulnId);
      setExploitsDialog({
        open: true,
        vulnId,
        exploits
      });
    } catch (error) {
      console.error('Failed to fetch exploits:', error);
      setAlert({ type: 'error', message: 'Failed to fetch exploit information' });
    }
  };

  const handleValidateVulnerability = async (assetId: number, vulnId: string, status: string) => {
    if (!user?.is_admin) {
      setAlert({ type: 'error', message: 'Admin privileges required for vulnerability validation' });
      return;
    }

    try {
      await rapid7API.validateVulnerability(vulnId, status);
      setAlert({ type: 'success', message: 'Vulnerability validation updated successfully' });
      fetchVulnerabilities(); // Refresh data
    } catch (error) {
      console.error('Failed to validate vulnerability:', error);
      setAlert({ type: 'error', message: 'Failed to validate vulnerability' });
    }
  };

  const getExploitableCount = () => {
    return exploitableVulns.length;
  };

  const getCriticalHighCount = () => {
    return vulnerabilities.filter(v => 
      v.severity.toLowerCase() === 'critical' || v.severity.toLowerCase() === 'high'
    ).length;
  };

  const handleSyncFromInsightVM = async (syncAll: boolean = false) => {
    if (!user?.is_admin) {
      setAlert({ type: 'error', message: 'Admin privileges required to sync vulnerabilities' });
      return;
    }

    setSyncing(true);
    try {
      const result = await insightVMAPI.syncVulnerabilities(undefined, syncAll);
      setAlert({ 
        type: 'success', 
        message: `Successfully synced ${result.synced_count} vulnerabilities from InsightVM` 
      });
      fetchVulnerabilities(); // Refresh data
    } catch (error) {
      console.error('Failed to sync vulnerabilities:', error);
      setAlert({ type: 'error', message: 'Failed to sync vulnerabilities from InsightVM' });
    } finally {
      setSyncing(false);
      setSyncDialog(false);
    }
  };

  if (loading) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>
          Vulnerabilities
        </Typography>
        <Typography>Loading...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Vulnerabilities
          </Typography>
          <Typography variant="subtitle1" color="textSecondary" gutterBottom>
            Security vulnerabilities for {user?.team?.name || 'your team'}
          </Typography>
        </Box>
        {user?.is_admin && (
          <Button
            variant="outlined"
            startIcon={<CloudSync />}
            onClick={() => setSyncDialog(true)}
            disabled={syncing}
          >
            {syncing ? 'Syncing...' : 'Sync from InsightVM'}
          </Button>
        )}
      </Box>

      {alert && (
        <Alert severity={alert.type} onClose={() => setAlert(null)} sx={{ mb: 2 }}>
          {alert.message}
        </Alert>
      )}

      {/* Summary Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' }, gap: 2, mb: 3 }}>
        <Card>
          <CardContent sx={{ textAlign: 'center' }}>
            <Security sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
            <Typography variant="h4" color="primary">
              {vulnerabilities.length}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Total Vulnerabilities
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent sx={{ textAlign: 'center' }}>
            <Warning sx={{ fontSize: 40, color: 'error.main', mb: 1 }} />
            <Typography variant="h4" color="error">
              {getCriticalHighCount()}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Critical / High
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent sx={{ textAlign: 'center' }}>
            <BugReport sx={{ fontSize: 40, color: 'warning.main', mb: 1 }} />
            <Typography variant="h4" color="warning.main">
              {getExploitableCount()}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Exploitable
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent sx={{ textAlign: 'center' }}>
            <CheckCircle sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
            <Typography variant="h4" color="success.main">
              {vulnerabilities.filter(v => v.status === 'closed').length}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Resolved
            </Typography>
          </CardContent>
        </Card>
      </Box>

      <Box display="flex" gap={2} mb={3} sx={{ flexWrap: 'wrap' }}>
        <TextField
          placeholder="Search vulnerabilities..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
          sx={{ minWidth: 250 }}
        />
        
        <TextField
          select
          label="Severity"
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          sx={{ minWidth: 120 }}
        >
          <MenuItem value="all">All</MenuItem>
          <MenuItem value="critical">Critical</MenuItem>
          <MenuItem value="high">High</MenuItem>
          <MenuItem value="medium">Medium</MenuItem>
          <MenuItem value="low">Low</MenuItem>
        </TextField>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Title</TableCell>
              <TableCell>Severity</TableCell>
              <TableCell>CVSS Score</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Discovered</TableCell>
              <TableCell>Last Seen</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredVulns.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Box py={4}>
                    <Security sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
                    <Typography variant="h6" color="textSecondary">
                      {vulnerabilities.length === 0 ? 'No vulnerabilities found' : 'No matching vulnerabilities'}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      {vulnerabilities.length === 0 
                        ? 'This is good news! No security vulnerabilities detected for your team.'
                        : 'Try adjusting your search criteria.'
                      }
                    </Typography>
                  </Box>
                </TableCell>
              </TableRow>
            ) : (
              filteredVulns.map((vuln) => (
                <TableRow key={vuln.id}>
                  <TableCell>
                    <Typography variant="subtitle2" fontWeight="medium">
                      {vuln.title}
                    </Typography>
                    {vuln.description && (
                      <Typography variant="caption" color="textSecondary" display="block">
                        {vuln.description.length > 100 
                          ? `${vuln.description.substring(0, 100)}...` 
                          : vuln.description
                        }
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={vuln.severity} 
                      color={getSeverityColor(vuln.severity) as any}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {vuln.cvss_score || 'N/A'}
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={vuln.status}
                      variant="outlined"
                      size="small"
                      color={vuln.status === 'open' ? 'error' : 'success'}
                    />
                  </TableCell>
                  <TableCell>
                    {vuln.discovered_date 
                      ? new Date(vuln.discovered_date).toLocaleDateString()
                      : 'Unknown'
                    }
                  </TableCell>
                  <TableCell>
                    {vuln.last_seen 
                      ? new Date(vuln.last_seen).toLocaleDateString()
                      : 'Unknown'
                    }
                  </TableCell>
                  <TableCell>
                    <Box display="flex" gap={1}>
                      {vuln.rapid7_vuln_id && (
                        <Tooltip title="View Exploits">
                          <IconButton 
                            size="small" 
                            onClick={() => handleViewExploits(vuln.rapid7_vuln_id!)}
                          >
                            <BugReport />
                          </IconButton>
                        </Tooltip>
                      )}
                      {user?.is_admin && vuln.rapid7_vuln_id && (
                        <Tooltip title="Validate as False Positive">
                          <IconButton 
                            size="small" 
                            onClick={() => handleValidateVulnerability(vuln.asset_id, vuln.rapid7_vuln_id!, 'false_positive')}
                          >
                            <CheckCircle />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {filteredVulns.length > 0 && (
        <Box mt={2}>
          <Typography variant="body2" color="textSecondary">
            Showing {filteredVulns.length} of {vulnerabilities.length} vulnerabilities
          </Typography>
        </Box>
      )}

      {/* Exploits Dialog */}
      <Dialog 
        open={exploitsDialog.open} 
        onClose={() => setExploitsDialog({ open: false, vulnId: '', exploits: [] })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Exploits for Vulnerability: {exploitsDialog.vulnId}
        </DialogTitle>
        <DialogContent>
          {exploitsDialog.exploits.length > 0 ? (
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Title</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Source</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {exploitsDialog.exploits.map((exploit, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      {exploit.link ? (
                        <a href={exploit.link} target="_blank" rel="noopener noreferrer">
                          {exploit.title}
                        </a>
                      ) : (
                        exploit.title
                      )}
                    </TableCell>
                    <TableCell>
                      {exploit.description || 'No description available'}
                    </TableCell>
                    <TableCell>
                      {exploit.source || 'Unknown'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <Box textAlign="center" py={4}>
              <Info sx={{ fontSize: 60, color: 'grey.400', mb: 2 }} />
              <Typography variant="h6" color="textSecondary">
                No exploits found
              </Typography>
              <Typography variant="body2" color="textSecondary">
                This vulnerability has no known exploits in the database.
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExploitsDialog({ open: false, vulnId: '', exploits: [] })}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Sync Dialog */}
      <Dialog open={syncDialog} onClose={() => setSyncDialog(false)}>
        <DialogTitle>
          <CloudSync sx={{ mr: 1, verticalAlign: 'middle' }} />
          Sync Vulnerabilities from InsightVM
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            This will sync vulnerability data from InsightVM to the local database.
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            • New vulnerabilities will be added to the database
            • Existing vulnerabilities will be updated with latest data
            • Asset information will be synchronized as needed
          </Typography>
          {insightVMData && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                InsightVM Statistics:
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1 }}>
                <Typography variant="body2">
                  Total Vulnerabilities: {insightVMData.vulnerabilities?.total || 0}
                </Typography>
                <Typography variant="body2">
                  Critical: {insightVMData.vulnerabilities?.critical || 0}
                </Typography>
                <Typography variant="body2">
                  High: {insightVMData.vulnerabilities?.high || 0}
                </Typography>
                <Typography variant="body2">
                  Exploitable: {insightVMData.vulnerabilities?.exploitable || 0}
                </Typography>
              </Box>
            </Box>
          )}
          <Alert severity="info" sx={{ mt: 2 }}>
            This operation may take several minutes depending on the amount of data.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSyncDialog(false)} disabled={syncing}>
            Cancel
          </Button>
          <Button 
            onClick={() => handleSyncFromInsightVM(true)}
            variant="contained"
            color="primary"
            disabled={syncing}
            startIcon={syncing ? <CircularProgress size={20} /> : <Sync />}
          >
            {syncing ? 'Syncing...' : 'Sync All Vulnerabilities'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Vulnerabilities;