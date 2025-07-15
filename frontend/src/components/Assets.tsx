import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Chip,
  Tooltip,
  FormControlLabel,
  Switch,
  Alert,
  Snackbar,
  Stack,
  Card,
  CardContent,
  CardHeader,
  Collapse,
  Checkbox,
  FormControl,
  InputLabel,
  Select,
  LinearProgress,
  CircularProgress,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  PlayArrow,
  Visibility,
  CloudDownload,
  CloudUpload,
  CheckCircle,
  FilterList,
  Group,
  ExpandMore,
  ExpandLess,
  Security,
  Refresh,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { assetsAPI, teamsAPI, insightVMAPI } from '../api';
import { Asset, Team } from '../types';

const Assets: React.FC = () => {
  const { user } = useAuth();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    ip_address: '',
    os_version: '',
    public_facing: false,
    team_id: '',
    owner_id: '',
    environment: 'dev',
    criticality: 'medium',
    business_impact: '',
    asset_type: '',
    location: '',
    compliance_requirements: '',
  });
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertSeverity, setAlertSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('info');
  const [overdueAssets, setOverdueAssets] = useState<any[]>([]);
  const [groupedAssets, setGroupedAssets] = useState<any>(null);
  const [showGroupedView, setShowGroupedView] = useState(false);
  const [expandedTeams, setExpandedTeams] = useState<Set<number>>(new Set());
  const [exportFilters, setExportFilters] = useState({
    team_id: '',
    public_facing: '',
    review_status: '',
    include_services: false,
    include_vulnerabilities: false
  });
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [selectedAssets, setSelectedAssets] = useState<Set<number>>(new Set());
  const [showBulkReviewDialog, setShowBulkReviewDialog] = useState(false);
  const [showInsightVMAssets, setShowInsightVMAssets] = useState(false);
  const [insightVMAssets, setInsightVMAssets] = useState<any[]>([]);
  const [insightVMSummary, setInsightVMSummary] = useState<any>(null);
  const [loadingInsightVM, setLoadingInsightVM] = useState(false);

  useEffect(() => {
    fetchAssets();
    fetchTeams();
    fetchOverdueAssets();
    if (user?.is_admin) {
      fetchGroupedAssets();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchAssets = async () => {
    try {
      const data = await assetsAPI.getAssets();
      setAssets(data);
    } catch (error) {
      console.error('Failed to fetch assets:', error);
    }
  };

  const fetchTeams = async () => {
    try {
      const data = await teamsAPI.getTeams();
      setTeams(data);
    } catch (error) {
      console.error('Failed to fetch teams:', error);
    }
  };

  const fetchOverdueAssets = async () => {
    try {
      const response = await fetch('/api/assets/overdue-reviews', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Expected JSON but received:', text);
        setOverdueAssets([]);
        return;
      }
      
      const data = await response.json();
      setOverdueAssets(data.assets || []);
    } catch (error) {
      console.error('Failed to fetch overdue assets:', error);
      setOverdueAssets([]);
    }
  };

  const fetchGroupedAssets = async () => {
    if (!user?.is_admin) return;
    
    try {
      const response = await fetch('/api/assets/grouped-by-team', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Expected JSON but received:', text);
        setGroupedAssets(null);
        return;
      }
      
      const data = await response.json();
      setGroupedAssets(data);
    } catch (error) {
      console.error('Failed to fetch grouped assets:', error);
      setGroupedAssets(null);
    }
  };

  const fetchInsightVMAssets = async () => {
    setLoadingInsightVM(true);
    try {
      console.log('Fetching InsightVM assessed assets...');
      const data = await insightVMAPI.getAssessedAssets(0, 100);
      console.log('InsightVM API response:', data);
      
      if (data.error) {
        console.error('InsightVM API error:', data.error);
        setAlertMessage(`InsightVM Error: ${data.error}`);
        setAlertSeverity('error');
        setInsightVMAssets([]);
        setInsightVMSummary(null);
      } else {
        setInsightVMAssets(data.assets || []);
        setInsightVMSummary(data.summary || null);
        setAlertMessage(`Successfully loaded ${data.assets?.length || 0} assessed assets from InsightVM`);
        setAlertSeverity('success');
      }
    } catch (error: any) {
      console.error('Failed to fetch InsightVM assets:', error);
      
      // More detailed error message
      let errorMessage = 'Failed to fetch InsightVM assets';
      if (error.response) {
        const responseData = error.response.data;
        if (typeof responseData === 'string') {
          errorMessage += ` (HTTP ${error.response.status}: ${responseData})`;
        } else if (responseData && responseData.detail) {
          errorMessage += ` (HTTP ${error.response.status}: ${responseData.detail})`;
        } else if (responseData && responseData.error) {
          errorMessage += ` (HTTP ${error.response.status}: ${responseData.error})`;
        } else {
          errorMessage += ` (HTTP ${error.response.status}: ${error.response.statusText})`;
        }
      } else if (error.message) {
        errorMessage += ` (${error.message})`;
      }
      
      setAlertMessage(errorMessage);
      setAlertSeverity('error');
      setInsightVMAssets([]);
      setInsightVMSummary(null);
    } finally {
      setLoadingInsightVM(false);
    }
  };

  const handleOpenDialog = (asset?: Asset) => {
    if (asset) {
      setEditingAsset(asset);
      setFormData({
        name: asset.name,
        ip_address: asset.ip_address,
        os_version: asset.os_version || '',
        public_facing: asset.public_facing || false,
        team_id: asset.team_id.toString(),
        owner_id: asset.owner_id?.toString() || '',
        environment: asset.environment || 'dev',
        criticality: asset.criticality || 'medium',
        business_impact: asset.business_impact || '',
        asset_type: asset.asset_type || '',
        location: asset.location || '',
        compliance_requirements: asset.compliance_requirements || '',
      });
    } else {
      setEditingAsset(null);
      setFormData({
        name: '',
        ip_address: '',
        os_version: '',
        public_facing: false,
        team_id: user?.team_id?.toString() || '',
        owner_id: user?.id.toString() || '',
        environment: 'dev',
        criticality: 'medium',
        business_impact: '',
        asset_type: '',
        location: '',
        compliance_requirements: '',
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingAsset(null);
  };

  const handleSubmit = async () => {
    try {
      const assetData = {
        name: formData.name,
        ip_address: formData.ip_address,
        os_version: formData.os_version || undefined,
        public_facing: formData.public_facing,
        team_id: parseInt(formData.team_id),
        owner_id: formData.owner_id ? parseInt(formData.owner_id) : undefined,
        environment: formData.environment,
        criticality: formData.criticality,
        business_impact: formData.business_impact || undefined,
        asset_type: formData.asset_type || undefined,
        location: formData.location || undefined,
        compliance_requirements: formData.compliance_requirements || undefined,
      };

      if (editingAsset) {
        await assetsAPI.updateAsset(editingAsset.id, assetData);
      } else {
        await assetsAPI.createAsset(assetData);
      }

      fetchAssets();
      handleCloseDialog();
    } catch (error) {
      console.error('Failed to save asset:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this asset?')) {
      try {
        await assetsAPI.deleteAsset(id);
        fetchAssets();
      } catch (error) {
        console.error('Failed to delete asset:', error);
      }
    }
  };

  const handleStartScan = async (assetId: number) => {
    try {
      await assetsAPI.startAssetScan(assetId);
      alert('Scan started successfully!');
    } catch (error) {
      console.error('Failed to start scan:', error);
      alert('Failed to start scan. Please try again.');
    }
  };

  const canManageAsset = (asset: Asset) => {
    return user?.is_admin || user?.team_id === asset.team_id;
  };

  const handleExportCSV = async () => {
    try {
      // Build query parameters from filters
      const params = new URLSearchParams();
      
      if (exportFilters.team_id) params.append('team_id', exportFilters.team_id);
      if (exportFilters.public_facing !== '') params.append('public_facing', exportFilters.public_facing);
      if (exportFilters.review_status) params.append('review_status', exportFilters.review_status);
      if (exportFilters.include_services) params.append('include_services', 'true');
      if (exportFilters.include_vulnerabilities) params.append('include_vulnerabilities', 'true');
      
      const queryString = params.toString();
      const url = `/api/assets/export${queryString ? `?${queryString}` : ''}`;
      
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        
        // Get filename from response headers
        const contentDisposition = response.headers.get('Content-Disposition');
        const filename = contentDisposition 
          ? contentDisposition.split('filename=')[1].replace(/"/g, '')
          : `assets_export_${new Date().toISOString().split('T')[0]}.csv`;
        
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(downloadUrl);
        setAlertMessage('Assets exported successfully!');
        setAlertSeverity('success');
        setShowExportDialog(false);
      } else {
        throw new Error('Export failed');
      }
    } catch (error) {
      console.error('Failed to export assets:', error);
      setAlertMessage('Failed to export assets');
      setAlertSeverity('error');
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await fetch('/api/assets/download-template', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'assets_template.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        setAlertMessage('Template downloaded successfully!');
        setAlertSeverity('success');
      } else {
        throw new Error('Download failed');
      }
    } catch (error) {
      console.error('Failed to download template:', error);
      setAlertMessage('Failed to download template');
      setAlertSeverity('error');
    }
  };

  const handleFileUpload = async () => {
    if (!uploadFile) {
      setAlertMessage('Please select a file to upload');
      setAlertSeverity('warning');
      return;
    }

    const formData = new FormData();
    formData.append('file', uploadFile);

    try {
      const response = await fetch('/api/assets/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        setAlertMessage(`Successfully uploaded ${result.created_count} assets. ${result.error_count > 0 ? `${result.error_count} errors occurred.` : ''}`);
        setAlertSeverity(result.error_count > 0 ? 'warning' : 'success');
        fetchAssets();
        setUploadDialogOpen(false);
        setUploadFile(null);
      } else {
        throw new Error(result.detail || 'Upload failed');
      }
    } catch (error) {
      console.error('Failed to upload assets:', error);
      setAlertMessage('Failed to upload assets');
      setAlertSeverity('error');
    }
  };

  const handleMarkAsReviewed = async (assetId: number) => {
    try {
      const response = await fetch(`/api/assets/${assetId}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        setAlertMessage('Asset marked as reviewed');
        setAlertSeverity('success');
        fetchAssets();
        fetchOverdueAssets();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to mark as reviewed');
      }
    } catch (error: any) {
      console.error('Failed to mark asset as reviewed:', error);
      setAlertMessage(error.message || 'Failed to mark asset as reviewed');
      setAlertSeverity('error');
    }
  };

  const handleBulkReview = async () => {
    if (selectedAssets.size === 0) {
      setAlertMessage('Please select assets to review');
      setAlertSeverity('warning');
      return;
    }

    try {
      const promises = Array.from(selectedAssets).map(assetId => 
        fetch(`/api/assets/${assetId}/review`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        })
      );

      const results = await Promise.allSettled(promises);
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      if (successful > 0) {
        setAlertMessage(`Successfully reviewed ${successful} asset(s)${failed > 0 ? `, ${failed} failed` : ''}`);
        setAlertSeverity(failed > 0 ? 'warning' : 'success');
        fetchAssets();
        fetchOverdueAssets();
        setSelectedAssets(new Set());
        setShowBulkReviewDialog(false);
      } else {
        throw new Error('All review operations failed');
      }
    } catch (error: any) {
      console.error('Failed to bulk review assets:', error);
      setAlertMessage('Failed to review assets');
      setAlertSeverity('error');
    }
  };

  const handleSelectAsset = (assetId: number) => {
    const newSelected = new Set(selectedAssets);
    if (newSelected.has(assetId)) {
      newSelected.delete(assetId);
    } else {
      newSelected.add(assetId);
    }
    setSelectedAssets(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedAssets.size === assets.length) {
      setSelectedAssets(new Set());
    } else {
      setSelectedAssets(new Set(assets.map(asset => asset.id)));
    }
  };

  const getReviewStatus = (asset: Asset) => {
    if (!asset.last_reviewed_date) {
      return { status: 'never', color: 'error', label: 'Never Reviewed' };
    }
    
    const lastReviewed = new Date(asset.last_reviewed_date);
    const daysSince = Math.floor((Date.now() - lastReviewed.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysSince > 60) {
      return { status: 'overdue', color: 'error', label: `${daysSince} days overdue` };
    } else if (daysSince > 45) {
      return { status: 'warning', color: 'warning', label: `${daysSince} days ago` };
    } else {
      return { status: 'current', color: 'success', label: `${daysSince} days ago` };
    }
  };

  const toggleTeamExpansion = (teamId: number) => {
    const newExpanded = new Set(expandedTeams);
    if (newExpanded.has(teamId)) {
      newExpanded.delete(teamId);
    } else {
      newExpanded.add(teamId);
    }
    setExpandedTeams(newExpanded);
  };

  const renderTeamCard = (team: any) => {
    const isExpanded = expandedTeams.has(team.team_id);
    
    return (
      <Card key={team.team_id} sx={{ mb: 2 }}>
        <CardHeader
          title={
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="h6">{team.team_name}</Typography>
              <Box display="flex" gap={1}>
                <Chip label={`${team.total_assets} assets`} size="small" />
                <Chip 
                  label={`${team.compliance_rate}% compliant`} 
                  size="small" 
                  color={team.compliance_rate >= 80 ? 'success' : 'error'}
                />
              </Box>
            </Box>
          }
          action={
            <IconButton onClick={() => toggleTeamExpansion(team.team_id)}>
              {isExpanded ? <ExpandLess /> : <ExpandMore />}
            </IconButton>
          }
        />
        <Collapse in={isExpanded}>
          <CardContent>
            <Box display="flex" justifyContent="space-between" sx={{ mb: 2 }}>
              <Box textAlign="center">
                <Typography variant="body2" color="text.secondary">Public Facing</Typography>
                <Typography variant="h6">{team.public_facing_assets}</Typography>
              </Box>
              <Box textAlign="center">
                <Typography variant="body2" color="text.secondary">Private</Typography>
                <Typography variant="h6">{team.private_assets}</Typography>
              </Box>
              <Box textAlign="center">
                <Typography variant="body2" color="text.secondary">Overdue Reviews</Typography>
                <Typography variant="h6" color="error">{team.review_status.overdue}</Typography>
              </Box>
              <Box textAlign="center">
                <Typography variant="body2" color="text.secondary">Never Reviewed</Typography>
                <Typography variant="h6" color="warning">{team.review_status.never_reviewed}</Typography>
              </Box>
            </Box>
            
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Asset Name</TableCell>
                    <TableCell>IP Address</TableCell>
                    <TableCell>Environment</TableCell>
                    <TableCell>Criticality</TableCell>
                    <TableCell>Public Facing</TableCell>
                    <TableCell>Owner</TableCell>
                    <TableCell>Last Reviewed</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {team.assets.map((asset: any) => (
                    <TableRow key={asset.id}>
                      <TableCell>{asset.name}</TableCell>
                      <TableCell>{asset.ip_address}</TableCell>
                      <TableCell>
                        <Chip 
                          label={asset.environment?.toUpperCase() || 'DEV'} 
                          size="small" 
                          color={asset.environment === 'prod' ? 'error' : asset.environment === 'uat' ? 'warning' : 'info'}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={asset.criticality?.toUpperCase() || 'MEDIUM'} 
                          size="small" 
                          color={asset.criticality === 'critical' ? 'error' : asset.criticality === 'high' ? 'warning' : asset.criticality === 'medium' ? 'info' : 'default'}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={asset.public_facing ? 'Public' : 'Private'} 
                          size="small" 
                          color={asset.public_facing ? 'warning' : 'success'}
                        />
                      </TableCell>
                      <TableCell>{asset.owner_name}</TableCell>
                      <TableCell>
                        {asset.last_reviewed_date 
                          ? new Date(asset.last_reviewed_date).toLocaleDateString()
                          : 'Never'
                        }
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Collapse>
      </Card>
    );
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4">
            Assets
          </Typography>
          {user?.is_admin && groupedAssets && (
            <Typography variant="subtitle1" color="text.secondary">
              {groupedAssets.total_assets} assets across {groupedAssets.total_teams} teams
            </Typography>
          )}
        </Box>
        <Stack direction="row" spacing={2}>
          {user?.is_admin && (
            <Button
              variant={showGroupedView ? "contained" : "outlined"}
              startIcon={<Group />}
              onClick={() => setShowGroupedView(!showGroupedView)}
            >
              {showGroupedView ? "List View" : "Team View"}
            </Button>
          )}
          <Button
            variant={showInsightVMAssets ? "contained" : "outlined"}
            startIcon={<Security />}
            onClick={() => {
              setShowInsightVMAssets(!showInsightVMAssets);
              if (!showInsightVMAssets && insightVMAssets.length === 0) {
                fetchInsightVMAssets();
              }
            }}
            disabled={loadingInsightVM}
          >
            {showInsightVMAssets ? "Local Assets" : "InsightVM Assets"}
          </Button>
          <Button
            variant="outlined"
            startIcon={<CloudDownload />}
            onClick={handleDownloadTemplate}
          >
            Template
          </Button>
          <Button
            variant="outlined"
            startIcon={<CloudUpload />}
            onClick={() => setUploadDialogOpen(true)}
          >
            Upload CSV
          </Button>
          <Button
            variant="outlined"
            startIcon={<FilterList />}
            onClick={() => setShowExportDialog(true)}
          >
            Export with Filters
          </Button>
          <Button
            variant="outlined"
            startIcon={<CheckCircle />}
            onClick={() => setShowBulkReviewDialog(true)}
            disabled={selectedAssets.size === 0}
          >
            Bulk Review ({selectedAssets.size})
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleOpenDialog()}
          >
            Add Asset
          </Button>
        </Stack>
      </Box>

      {overdueAssets.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <strong>{overdueAssets.length} assets</strong> haven't been reviewed in over 60 days and need attention.
        </Alert>
      )}

      {/* InsightVM Assets View */}
      {showInsightVMAssets ? (
        <Box>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">
              InsightVM Assessed Assets
            </Typography>
            <Box display="flex" gap={1}>
              <Button
                variant="outlined"
                startIcon={<Refresh />}
                onClick={fetchInsightVMAssets}
                disabled={loadingInsightVM}
              >
                Refresh
              </Button>
              <Button
                variant="outlined"
                color="secondary"
                onClick={async () => {
                  try {
                    const response = await fetch('/api/insightvm/test-assessed-assets', {
                      headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                      }
                    });
                    const data = await response.json();
                    console.log('Test endpoint response:', data);
                    setAlertMessage(`Test: ${JSON.stringify(data)}`);
                    setAlertSeverity('info');
                  } catch (error) {
                    console.error('Test failed:', error);
                    setAlertMessage('Test failed - check console');
                    setAlertSeverity('error');
                  }
                }}
              >
                Test Debug
              </Button>
            </Box>
          </Box>
          
          {/* InsightVM Summary */}
          {insightVMSummary && (
            <Box display="flex" gap={2} mb={3}>
              <Chip label={`Total: ${insightVMSummary.total_assessed}`} color="primary" />
              <Chip label={`Avg Risk: ${Math.round(insightVMSummary.avg_risk_score)}`} color="info" />
              <Chip label={`High Risk: ${insightVMSummary.high_risk_count}`} color="warning" />
              <Chip label={`Critical Vulns: ${insightVMSummary.critical_vulns}`} color="error" />
              <Chip label={`Total Vulns: ${insightVMSummary.total_vulns}`} color="secondary" />
            </Box>
          )}
          
          {loadingInsightVM ? (
            <Box display="flex" justifyContent="center" p={4}>
              <CircularProgress />
            </Box>
          ) : (
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
                    <TableCell>Tags</TableCell>
                    <TableCell>Last Scan</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {insightVMAssets.map((asset) => (
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
                          label={asset.vulnerabilities.severe}
                          color="warning"
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={asset.vulnerabilities.moderate}
                          color="info"
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Box display="flex" gap={0.5} flexWrap="wrap">
                          {asset.tags.slice(0, 3).map((tag: string, index: number) => (
                            <Chip key={index} label={tag} size="small" variant="outlined" />
                          ))}
                          {asset.tags.length > 3 && (
                            <Chip label={`+${asset.tags.length - 3}`} size="small" variant="outlined" />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        {asset.lastScanDate ? new Date(asset.lastScanDate).toLocaleDateString() : 'Never'}
                      </TableCell>
                      <TableCell>
                        <Tooltip title="View Details">
                          <IconButton size="small">
                            <Visibility />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Start Scan">
                          <IconButton size="small">
                            <PlayArrow />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      ) : (
        /* Regular Asset Views */
        <>
          {/* Team Grouped View for Admins */}
          {user?.is_admin && showGroupedView && groupedAssets ? (
            <Box>
              <Typography variant="h6" gutterBottom>
                Assets by Team
              </Typography>
              {groupedAssets.teams.map((team: any) => renderTeamCard(team))}
            </Box>
          ) : (
            /* Regular List View */
            <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selectedAssets.size === assets.length && assets.length > 0}
                      indeterminate={selectedAssets.size > 0 && selectedAssets.size < assets.length}
                      onChange={handleSelectAll}
                    />
                  </TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>IP Address</TableCell>
                  <TableCell>OS Version</TableCell>
                  <TableCell>Environment</TableCell>
                  <TableCell>Criticality</TableCell>
                  <TableCell>Public Facing</TableCell>
                  <TableCell>Team</TableCell>
                  <TableCell>Owner</TableCell>
                  <TableCell>Review Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {assets.map((asset) => {
                  const reviewStatus = getReviewStatus(asset);
                  return (
                  <TableRow key={asset.id}>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selectedAssets.has(asset.id)}
                        onChange={() => handleSelectAsset(asset.id)}
                      />
                    </TableCell>
                    <TableCell>{asset.name}</TableCell>
                    <TableCell>{asset.ip_address}</TableCell>
                    <TableCell>{asset.os_version || 'N/A'}</TableCell>
                    <TableCell>
                      <Chip 
                        label={asset.environment?.toUpperCase() || 'DEV'} 
                        size="small" 
                        color={asset.environment === 'prod' ? 'error' : asset.environment === 'uat' ? 'warning' : 'info'}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={asset.criticality?.toUpperCase() || 'MEDIUM'} 
                        size="small" 
                        color={asset.criticality === 'critical' ? 'error' : asset.criticality === 'high' ? 'warning' : asset.criticality === 'medium' ? 'info' : 'default'}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={asset.public_facing ? 'Public' : 'Private'} 
                        size="small" 
                        color={asset.public_facing ? 'warning' : 'success'}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip label={asset.team?.name || 'Unknown'} size="small" />
                    </TableCell>
                    <TableCell>{asset.owner?.full_name || asset.owner?.username || 'Unassigned'}</TableCell>
                    <TableCell>
                      <Chip 
                        label={reviewStatus.label} 
                        size="small" 
                        color={reviewStatus.color as any}
                      />
                    </TableCell>
                    <TableCell>
                      <Tooltip title="View Details">
                        <IconButton size="small">
                          <Visibility />
                        </IconButton>
                      </Tooltip>
                      {canManageAsset(asset) && (
                        <>
                          <Tooltip title="Edit">
                            <IconButton size="small" onClick={() => handleOpenDialog(asset)}>
                              <Edit />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton size="small" onClick={() => handleDelete(asset.id)}>
                              <Delete />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Start Scan">
                            <IconButton size="small" onClick={() => handleStartScan(asset.id)}>
                              <PlayArrow />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Mark as Reviewed">
                            <IconButton size="small" onClick={() => handleMarkAsReviewed(asset.id)}>
                              <CheckCircle />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
          )}
        </>
      )}

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingAsset ? 'Edit Asset' : 'Add New Asset'}
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Asset Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            margin="normal"
            required
          />
          <TextField
            fullWidth
            label="IP Address"
            value={formData.ip_address}
            onChange={(e) => setFormData({ ...formData, ip_address: e.target.value })}
            margin="normal"
            required
          />
          <TextField
            fullWidth
            label="OS Version"
            value={formData.os_version}
            onChange={(e) => setFormData({ ...formData, os_version: e.target.value })}
            margin="normal"
          />
          <FormControlLabel
            control={
              <Switch
                checked={formData.public_facing}
                onChange={(e) => setFormData({ ...formData, public_facing: e.target.checked })}
                color="warning"
              />
            }
            label="Public Facing (accessible from internet)"
            sx={{ mt: 2, mb: 1 }}
          />
          <TextField
            fullWidth
            select
            label="Team"
            value={formData.team_id}
            onChange={(e) => setFormData({ ...formData, team_id: e.target.value })}
            margin="normal"
            required
          >
            {teams.map((team) => (
              <MenuItem key={team.id} value={team.id}>
                {team.name}
              </MenuItem>
            ))}
          </TextField>
          
          {/* Environment Categorization Fields */}
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mt: 2 }}>
            <TextField
              select
              label="Environment"
              value={formData.environment}
              onChange={(e) => setFormData({ ...formData, environment: e.target.value })}
              required
            >
              <MenuItem value="dev">Development</MenuItem>
              <MenuItem value="uat">UAT/Testing</MenuItem>
              <MenuItem value="prod">Production</MenuItem>
            </TextField>
            <TextField
              select
              label="Criticality"
              value={formData.criticality}
              onChange={(e) => setFormData({ ...formData, criticality: e.target.value })}
              required
            >
              <MenuItem value="low">Low</MenuItem>
              <MenuItem value="medium">Medium</MenuItem>
              <MenuItem value="high">High</MenuItem>
              <MenuItem value="critical">Critical</MenuItem>
            </TextField>
          </Box>
          
          <TextField
            fullWidth
            label="Asset Type"
            value={formData.asset_type}
            onChange={(e) => setFormData({ ...formData, asset_type: e.target.value })}
            margin="normal"
            placeholder="e.g., Web Server, Database, Application"
          />
          
          <TextField
            fullWidth
            label="Location"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            margin="normal"
            placeholder="e.g., Data Center A, Cloud Region"
          />
          
          <TextField
            fullWidth
            label="Business Impact"
            value={formData.business_impact}
            onChange={(e) => setFormData({ ...formData, business_impact: e.target.value })}
            margin="normal"
            multiline
            rows={2}
            placeholder="Describe the business impact if this asset is compromised"
          />
          
          <TextField
            fullWidth
            label="Compliance Requirements"
            value={formData.compliance_requirements}
            onChange={(e) => setFormData({ ...formData, compliance_requirements: e.target.value })}
            margin="normal"
            placeholder="e.g., PCI-DSS, GDPR, SOX"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingAsset ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* CSV Upload Dialog */}
      <Dialog open={uploadDialogOpen} onClose={() => setUploadDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Upload Assets from CSV</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Upload a CSV file with asset data. Download the template first to see the required format.
          </Typography>
          <Box sx={{ mt: 2 }}>
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
              style={{ display: 'none' }}
              id="csv-upload-input"
            />
            <label htmlFor="csv-upload-input">
              <Button variant="outlined" component="span" startIcon={<CloudUpload />}>
                Choose CSV File
              </Button>
            </label>
            {uploadFile && (
              <Typography variant="body2" sx={{ mt: 1 }}>
                Selected: {uploadFile.name}
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleFileUpload} variant="contained" disabled={!uploadFile}>
            Upload
          </Button>
        </DialogActions>
      </Dialog>

      {/* Export Filters Dialog */}
      <Dialog open={showExportDialog} onClose={() => setShowExportDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Export Assets with Filters</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Apply filters to customize your export data. The filename will reflect your selected filters.
          </Typography>
          
          <Box sx={{ mt: 1 }}>
            {user?.is_admin && (
              <Box sx={{ mb: 2 }}>
                <FormControl fullWidth>
                  <InputLabel>Team</InputLabel>
                  <Select
                    value={exportFilters.team_id}
                    onChange={(e) => setExportFilters({...exportFilters, team_id: e.target.value})}
                    label="Team"
                  >
                    <MenuItem value="">All Teams</MenuItem>
                    {teams.map((team) => (
                      <MenuItem key={team.id} value={team.id.toString()}>
                        {team.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            )}
            
            <Box display="flex" gap={2} sx={{ mb: 2 }}>
              <FormControl fullWidth>
                <InputLabel>Public Facing</InputLabel>
                <Select
                  value={exportFilters.public_facing}
                  onChange={(e) => setExportFilters({...exportFilters, public_facing: e.target.value})}
                  label="Public Facing"
                >
                  <MenuItem value="">All Assets</MenuItem>
                  <MenuItem value="true">Public Only</MenuItem>
                  <MenuItem value="false">Private Only</MenuItem>
                </Select>
              </FormControl>
              
              <FormControl fullWidth>
                <InputLabel>Review Status</InputLabel>
                <Select
                  value={exportFilters.review_status}
                  onChange={(e) => setExportFilters({...exportFilters, review_status: e.target.value})}
                  label="Review Status"
                >
                  <MenuItem value="">All Statuses</MenuItem>
                  <MenuItem value="current">Current (within 45 days)</MenuItem>
                  <MenuItem value="warning">Warning (45-60 days)</MenuItem>
                  <MenuItem value="overdue">Overdue (&gt;60 days)</MenuItem>
                  <MenuItem value="never">Never Reviewed</MenuItem>
                </Select>
              </FormControl>
            </Box>
            
            <Box>
              <Typography variant="subtitle2" gutterBottom>Additional Data</Typography>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={exportFilters.include_services}
                    onChange={(e) => setExportFilters({...exportFilters, include_services: e.target.checked})}
                  />
                }
                label="Include Services Data"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={exportFilters.include_vulnerabilities}
                    onChange={(e) => setExportFilters({...exportFilters, include_vulnerabilities: e.target.checked})}
                  />
                }
                label="Include Vulnerabilities Data"
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowExportDialog(false)}>Cancel</Button>
          <Button onClick={handleExportCSV} variant="contained" startIcon={<CloudDownload />}>
            Export CSV
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bulk Review Dialog */}
      <Dialog open={showBulkReviewDialog} onClose={() => setShowBulkReviewDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Bulk Review Assets</DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            Are you sure you want to mark {selectedAssets.size} selected asset(s) as reviewed?
          </Typography>
          <Typography variant="body2" color="text.secondary">
            This action will update the last reviewed date for all selected assets to the current date and time.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowBulkReviewDialog(false)}>Cancel</Button>
          <Button onClick={handleBulkReview} variant="contained" color="primary">
            Mark as Reviewed
          </Button>
        </DialogActions>
      </Dialog>

      {/* Alert Snackbar */}
      <Snackbar
        open={!!alertMessage}
        autoHideDuration={6000}
        onClose={() => setAlertMessage('')}
      >
        <Alert severity={alertSeverity} onClose={() => setAlertMessage('')}>
          {alertMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Assets;