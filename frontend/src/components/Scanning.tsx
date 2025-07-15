import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  PlayArrow,
  Pause,
  Stop,
  Refresh,
  Assessment,
  Security,
  Computer,
  Schedule,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { rapid7API, assetsAPI } from '../api';
import { ScanEngine, ScanTemplate, ScanResult, Asset } from '../types';

const Scanning: React.FC = () => {
  const { user } = useAuth();
  const [apps, setApps] = useState<any[]>([]);
  const [attackTemplates, setAttackTemplates] = useState<ScanTemplate[]>([]);
  const [scans, setScans] = useState<ScanResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanDialogOpen, setScanDialogOpen] = useState(false);
  const [selectedAppId, setSelectedAppId] = useState<string>('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [scanConfigName, setScanConfigName] = useState('');
  const [alert, setAlert] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [appsData, templatesData, scansData] = await Promise.all([
        rapid7API.getApps().catch(() => []),
        rapid7API.getAttackTemplates().catch(() => []),
        rapid7API.getScans().catch(() => []),
      ]);
      
      setApps(appsData);
      setAttackTemplates(templatesData);
      setScans(scansData);
    } catch (error) {
      console.error('Failed to fetch scanning data:', error);
      setAlert({ type: 'error', message: 'Failed to load scanning data' });
    } finally {
      setLoading(false);
    }
  };

  const handleStartScan = async () => {
    if (!selectedAppId) {
      setAlert({ type: 'error', message: 'Please select an application to scan' });
      return;
    }

    if (!scanConfigName) {
      setAlert({ type: 'error', message: 'Please enter a scan configuration name' });
      return;
    }

    try {
      // First create a scan configuration
      const scanConfigResult = await rapid7API.createScanConfig(
        selectedAppId,
        scanConfigName,
        selectedTemplate || undefined
      );
      
      // Then start a scan with the created configuration
      const scanResult = await rapid7API.startScan(scanConfigResult.scan_config.id);
      
      setAlert({ type: 'success', message: `${scanConfigResult.message} and ${scanResult.message}` });
      setScanDialogOpen(false);
      setSelectedAppId('');
      setSelectedTemplate('');
      setScanConfigName('');
      
      // Refresh scan list
      fetchInitialData();
    } catch (error) {
      console.error('Failed to start scan:', error);
      setAlert({ type: 'error', message: 'Failed to start scan' });
    }
  };

  const handleScanControl = async (scanId: string, action: 'pause' | 'resume' | 'stop') => {
    try {
      let result;
      switch (action) {
        case 'pause':
          result = await rapid7API.pauseScan(scanId);
          break;
        case 'resume':
          result = await rapid7API.resumeScan(scanId);
          break;
        case 'stop':
          result = await rapid7API.stopScan(scanId);
          break;
      }
      
      setAlert({ type: 'success', message: result.message });
      fetchInitialData(); // Refresh all data
    } catch (error) {
      console.error(`Failed to ${action} scan:`, error);
      setAlert({ type: 'error', message: `Failed to ${action} scan` });
    }
  };

  const getSeverityColor = (status: string) => {
    switch (status.toLowerCase()) {
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

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Rapid7 Scanning</Typography>
        <Button
          variant="contained"
          startIcon={<PlayArrow />}
          onClick={() => setScanDialogOpen(true)}
          disabled={!user?.is_admin}
        >
          Start New Scan
        </Button>
      </Box>

      {alert && (
        <Alert severity={alert.type} onClose={() => setAlert(null)} sx={{ mb: 2 }}>
          {alert.message}
        </Alert>
      )}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3, mb: 3 }}>
        {/* Applications Card */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              <Computer sx={{ mr: 1, verticalAlign: 'bottom' }} />
              Applications ({apps.length})
            </Typography>
            {apps.length > 0 ? (
              apps.slice(0, 5).map((app) => (
                <Box key={app.id} sx={{ mb: 1 }}>
                  <Typography variant="body2">
                    <strong>{app.name}</strong>
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    {app.description || 'No description available'}
                  </Typography>
                </Box>
              ))
            ) : (
              <Typography variant="body2" color="textSecondary">
                No applications available
              </Typography>
            )}
          </CardContent>
        </Card>

        {/* Attack Templates Card */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              <Assessment sx={{ mr: 1, verticalAlign: 'bottom' }} />
              Attack Templates ({attackTemplates.length})
            </Typography>
            {attackTemplates.length > 0 ? (
              attackTemplates.slice(0, 5).map((template) => (
                <Box key={template.id} sx={{ mb: 1 }}>
                  <Typography variant="body2">
                    <strong>{template.name}</strong>
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    {template.description || 'No description available'}
                  </Typography>
                </Box>
              ))
            ) : (
              <Typography variant="body2" color="textSecondary">
                No attack templates available
              </Typography>
            )}
          </CardContent>
        </Card>
      </Box>

      {/* Recent Scans */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            <Schedule sx={{ mr: 1, verticalAlign: 'bottom' }} />
            Recent Scans
          </Typography>
          {scans.length > 0 ? (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Scan ID</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Start Time</TableCell>
                    <TableCell>End Time</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {scans.map((scan) => (
                    <TableRow key={scan.id}>
                      <TableCell>{scan.id}</TableCell>
                      <TableCell>
                        <Chip 
                          label={scan.status} 
                          color={getSeverityColor(scan.status) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{scan.startTime || 'N/A'}</TableCell>
                      <TableCell>{scan.endTime || 'N/A'}</TableCell>
                      <TableCell>
                        {scan.status === 'running' && user?.is_admin && (
                          <>
                            <Tooltip title="Pause Scan">
                              <IconButton 
                                size="small" 
                                onClick={() => handleScanControl(String(scan.id), 'pause')}
                              >
                                <Pause />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Stop Scan">
                              <IconButton 
                                size="small" 
                                onClick={() => handleScanControl(String(scan.id), 'stop')}
                              >
                                <Stop />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                        {scan.status === 'paused' && user?.is_admin && (
                          <Tooltip title="Resume Scan">
                            <IconButton 
                              size="small" 
                              onClick={() => handleScanControl(String(scan.id), 'resume')}
                            >
                              <PlayArrow />
                            </IconButton>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Typography variant="body2" color="textSecondary">
              No recent scans available
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* Start Scan Dialog */}
      <Dialog open={scanDialogOpen} onClose={() => setScanDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Start New Application Scan</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <FormControl fullWidth margin="normal">
              <InputLabel>Application</InputLabel>
              <Select
                value={selectedAppId}
                onChange={(e) => setSelectedAppId(e.target.value)}
                label="Application"
              >
                {apps.map((app) => (
                  <MenuItem key={app.id} value={app.id}>
                    {app.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              margin="normal"
              label="Scan Configuration Name"
              value={scanConfigName}
              onChange={(e) => setScanConfigName(e.target.value)}
              placeholder="Enter scan configuration name"
              required
            />

            <FormControl fullWidth margin="normal">
              <InputLabel>Attack Template (Optional)</InputLabel>
              <Select
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(e.target.value)}
                label="Attack Template (Optional)"
              >
                <MenuItem value="">Default Template</MenuItem>
                {attackTemplates.map((template) => (
                  <MenuItem key={template.id} value={template.id}>
                    {template.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setScanDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleStartScan} variant="contained">
            Create Config & Start Scan
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Scanning;