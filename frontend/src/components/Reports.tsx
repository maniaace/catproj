import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Download,
  Assessment,
  PictureAsPdf,
  TableChart,
  Security,
  Computer,
  Group,
  Warning,
  TrendingUp,
  Analytics,
  Refresh,
  CloudDownload,
  PlayArrow,
  Visibility,
  GetApp,
  Report,
  History,
  Schedule,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { assetsAPI, vulnerabilitiesAPI, teamsAPI, insightVMAPI } from '../api';
import { Asset, Vulnerability, Team } from '../types';

interface ReportData {
  totalAssets: number;
  totalVulnerabilities: number;
  totalTeams: number;
  criticalVulns: number;
  highVulns: number;
  mediumVulns: number;
  lowVulns: number;
  assetsByTeam: { [key: string]: number };
  vulnsByTeam: { [key: string]: number };
  assetsByCriticality: { [key: string]: number };
  assetsByEnvironment: { [key: string]: number };
}

interface InsightVMReport {
  id: number;
  name: string;
  format: string;
  template: string;
  description: string;
  created: string;
  last_generated: string;
  status: string;
  scope: any;
}

interface ReportInstance {
  id: string;
  report_id: number;
  name: string;
  status: string;
  created: string;
  started: string;
  completed: string;
  size: number;
  format: string;
}

const Reports: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [reportType, setReportType] = useState('overview');
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [vulnerabilities, setVulnerabilities] = useState<Vulnerability[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [insightVMReports, setInsightVMReports] = useState<InsightVMReport[]>([]);
  const [reportInstances, setReportInstances] = useState<ReportInstance[]>([]);
  const [selectedReport, setSelectedReport] = useState<InsightVMReport | null>(null);
  const [loadingInsightVM, setLoadingInsightVM] = useState(false);

  useEffect(() => {
    fetchData();
    if (reportType === 'insightvm') {
      fetchInsightVMReports();
    }
  }, [reportType]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [teamsResponse, assetsResponse] = await Promise.all([
        teamsAPI.getTeams(),
        assetsAPI.getAssets(),
      ]);

      setTeams(teamsResponse);
      setAssets(assetsResponse);
      
      // Get vulnerabilities for all teams
      const allVulns: Vulnerability[] = [];
      for (const team of teamsResponse) {
        try {
          const teamVulns = await vulnerabilitiesAPI.getTeamVulnerabilities(team.id);
          allVulns.push(...teamVulns);
        } catch (error) {
          console.warn(`Failed to fetch vulnerabilities for team ${team.id}:`, error);
        }
      }
      setVulnerabilities(allVulns);

      generateReportData(teamsResponse, assetsResponse, allVulns);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      setError('Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  const generateReportData = (teams: Team[], assets: Asset[], vulnerabilities: Vulnerability[]) => {
    const assetsByTeam: { [key: string]: number } = {};
    const vulnsByTeam: { [key: string]: number } = {};
    const assetsByCriticality: { [key: string]: number } = {};
    const assetsByEnvironment: { [key: string]: number } = {};

    // Count assets by team
    teams.forEach(team => {
      assetsByTeam[team.name] = assets.filter(asset => asset.team_id === team.id).length;
    });

    // Count vulnerabilities by team
    teams.forEach(team => {
      const teamAssets = assets.filter(asset => asset.team_id === team.id);
      vulnsByTeam[team.name] = vulnerabilities.filter(vuln => 
        teamAssets.some(asset => asset.id === vuln.asset_id)
      ).length;
    });

    // Count assets by criticality
    assets.forEach(asset => {
      assetsByCriticality[asset.criticality] = (assetsByCriticality[asset.criticality] || 0) + 1;
    });

    // Count assets by environment
    assets.forEach(asset => {
      assetsByEnvironment[asset.environment] = (assetsByEnvironment[asset.environment] || 0) + 1;
    });

    const reportData: ReportData = {
      totalAssets: assets.length,
      totalVulnerabilities: vulnerabilities.length,
      totalTeams: teams.length,
      criticalVulns: vulnerabilities.filter(v => v.severity === 'critical').length,
      highVulns: vulnerabilities.filter(v => v.severity === 'high').length,
      mediumVulns: vulnerabilities.filter(v => v.severity === 'medium').length,
      lowVulns: vulnerabilities.filter(v => v.severity === 'low').length,
      assetsByTeam,
      vulnsByTeam,
      assetsByCriticality,
      assetsByEnvironment,
    };

    setReportData(reportData);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  const getCriticalityColor = (criticality: string) => {
    switch (criticality) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  const exportReport = (format: 'csv' | 'pdf') => {
    if (!reportData) return;

    if (format === 'csv') {
      const csvContent = generateCSV();
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `security_report_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    }
  };

  const generateCSV = () => {
    if (!reportData) return '';

    let csv = 'Security Report\n\n';
    csv += 'Summary\n';
    csv += `Total Assets,${reportData.totalAssets}\n`;
    csv += `Total Vulnerabilities,${reportData.totalVulnerabilities}\n`;
    csv += `Total Teams,${reportData.totalTeams}\n\n`;
    
    csv += 'Vulnerabilities by Severity\n';
    csv += `Critical,${reportData.criticalVulns}\n`;
    csv += `High,${reportData.highVulns}\n`;
    csv += `Medium,${reportData.mediumVulns}\n`;
    csv += `Low,${reportData.lowVulns}\n\n`;

    csv += 'Assets by Team\n';
    Object.entries(reportData.assetsByTeam).forEach(([team, count]) => {
      csv += `${team},${count}\n`;
    });

    return csv;
  };

  const fetchInsightVMReports = async () => {
    setLoadingInsightVM(true);
    setError(null);
    try {
      const reportsResponse = await insightVMAPI.getReports(0, 100);
      if (reportsResponse.error) {
        setError(`InsightVM Error: ${reportsResponse.error}`);
        setInsightVMReports([]);
      } else {
        setInsightVMReports(reportsResponse.reports || []);
      }
    } catch (error) {
      console.error('Failed to fetch InsightVM reports:', error);
      setError('Failed to load InsightVM reports');
      setInsightVMReports([]);
    } finally {
      setLoadingInsightVM(false);
    }
  };

  const fetchReportHistory = async (reportId: number) => {
    setLoadingInsightVM(true);
    try {
      const historyResponse = await insightVMAPI.getReportHistory(reportId, 0, 50);
      if (historyResponse.error) {
        setError(`Failed to load report history: ${historyResponse.error}`);
        setReportInstances([]);
      } else {
        setReportInstances(historyResponse.instances || []);
      }
    } catch (error) {
      console.error('Failed to fetch report history:', error);
      setError('Failed to load report history');
      setReportInstances([]);
    } finally {
      setLoadingInsightVM(false);
    }
  };

  const generateInsightVMReport = async (reportId: number, reportName?: string) => {
    setLoadingInsightVM(true);
    try {
      const generateResponse = await insightVMAPI.generateReport(reportId, reportName);
      if (generateResponse.error) {
        setError(`Failed to generate report: ${generateResponse.error}`);
      } else {
        setError(null);
        // Refresh the report history to show the new instance
        await fetchReportHistory(reportId);
      }
    } catch (error) {
      console.error('Failed to generate report:', error);
      setError('Failed to generate report');
    } finally {
      setLoadingInsightVM(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'complete':
      case 'completed':
        return 'success';
      case 'running':
      case 'generating':
        return 'primary';
      case 'failed':
      case 'error':
        return 'error';
      case 'pending':
      case 'queued':
        return 'warning';
      default:
        return 'default';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return 'N/A';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  const renderOverviewReport = () => {
    if (!reportData) return null;

    return (
      <Box>
        {/* Summary Cards */}
        <Box display="flex" flexWrap="wrap" gap={2} mb={3}>
          <Card sx={{ flex: '1 1 200px', minWidth: 200 }}>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Computer color="primary" sx={{ mr: 2 }} />
                <Box>
                  <Typography variant="h4">{reportData.totalAssets}</Typography>
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
                <Security color="error" sx={{ mr: 2 }} />
                <Box>
                  <Typography variant="h4">{reportData.totalVulnerabilities}</Typography>
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
                <Group color="info" sx={{ mr: 2 }} />
                <Box>
                  <Typography variant="h4">{reportData.totalTeams}</Typography>
                  <Typography variant="body2" color="textSecondary">
                    Total Teams
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
                  <Typography variant="h4">{reportData.criticalVulns}</Typography>
                  <Typography variant="body2" color="textSecondary">
                    Critical Vulnerabilities
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>

        {/* Data Tables */}
        <Box display="flex" flexWrap="wrap" gap={2}>
          {/* Vulnerabilities by Severity */}
          <Card sx={{ flex: '1 1 300px', minWidth: 300 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Vulnerabilities by Severity
              </Typography>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Severity</TableCell>
                    <TableCell align="right">Count</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell>
                      <Chip label="Critical" color="error" size="small" />
                    </TableCell>
                    <TableCell align="right">{reportData.criticalVulns}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>
                      <Chip label="High" color="warning" size="small" />
                    </TableCell>
                    <TableCell align="right">{reportData.highVulns}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>
                      <Chip label="Medium" color="info" size="small" />
                    </TableCell>
                    <TableCell align="right">{reportData.mediumVulns}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>
                      <Chip label="Low" color="success" size="small" />
                    </TableCell>
                    <TableCell align="right">{reportData.lowVulns}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Assets by Team */}
          <Card sx={{ flex: '1 1 300px', minWidth: 300 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Assets by Team
              </Typography>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Team</TableCell>
                    <TableCell align="right">Assets</TableCell>
                    <TableCell align="right">Vulnerabilities</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Object.entries(reportData.assetsByTeam).map(([team, assetCount]) => (
                    <TableRow key={team}>
                      <TableCell>{team}</TableCell>
                      <TableCell align="right">{assetCount}</TableCell>
                      <TableCell align="right">{reportData.vulnsByTeam[team] || 0}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Assets by Environment */}
          <Card sx={{ flex: '1 1 300px', minWidth: 300 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Assets by Environment
              </Typography>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Environment</TableCell>
                    <TableCell align="right">Count</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Object.entries(reportData.assetsByEnvironment).map(([env, count]) => (
                    <TableRow key={env}>
                      <TableCell>
                        <Chip label={env.toUpperCase()} variant="outlined" size="small" />
                      </TableCell>
                      <TableCell align="right">{count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Assets by Criticality */}
          <Card sx={{ flex: '1 1 300px', minWidth: 300 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Assets by Criticality
              </Typography>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Criticality</TableCell>
                    <TableCell align="right">Count</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Object.entries(reportData.assetsByCriticality).map(([criticality, count]) => (
                    <TableRow key={criticality}>
                      <TableCell>
                        <Chip 
                          label={criticality.charAt(0).toUpperCase() + criticality.slice(1)} 
                          color={getCriticalityColor(criticality) as any}
                          size="small" 
                        />
                      </TableCell>
                      <TableCell align="right">{count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </Box>
      </Box>
    );
  };

  const renderInsightVMReports = () => {
    return (
      <Box>
        {/* InsightVM Reports List */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">
                <Report sx={{ mr: 1, verticalAlign: 'middle' }} />
                InsightVM Reports ({insightVMReports.length})
              </Typography>
              <Button
                variant="outlined"
                startIcon={<Refresh />}
                onClick={fetchInsightVMReports}
                disabled={loadingInsightVM}
              >
                Refresh
              </Button>
            </Box>
            
            {loadingInsightVM ? (
              <Box display="flex" justifyContent="center" p={4}>
                <CircularProgress />
              </Box>
            ) : insightVMReports.length > 0 ? (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Report Name</TableCell>
                      <TableCell>Template</TableCell>
                      <TableCell>Format</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Last Generated</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {insightVMReports.map((report) => (
                      <TableRow key={report.id}>
                        <TableCell>
                          <Typography variant="body2" fontWeight="bold">
                            {report.name || `Report ${report.id}`}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {report.description || 'No description'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={report.template || 'Default'} 
                            size="small" 
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={report.format?.toUpperCase() || 'PDF'} 
                            size="small" 
                            color="primary"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={report.status || 'Unknown'} 
                            size="small"
                            color={getStatusColor(report.status) as any}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {formatDate(report.last_generated)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box display="flex" gap={1}>
                            <Tooltip title="View History">
                              <IconButton 
                                size="small" 
                                color="primary"
                                onClick={() => {
                                  setSelectedReport(report);
                                  fetchReportHistory(report.id);
                                }}
                              >
                                <History />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Generate Report">
                              <IconButton 
                                size="small" 
                                color="secondary"
                                onClick={() => generateInsightVMReport(report.id)}
                                disabled={loadingInsightVM}
                              >
                                <PlayArrow />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Box textAlign="center" py={4}>
                <Report sx={{ fontSize: 60, color: 'grey.400', mb: 2 }} />
                <Typography variant="body2" color="text.secondary">
                  No InsightVM reports available
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Check InsightVM configuration or create reports in InsightVM console
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Report History */}
        {selectedReport && (
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <History sx={{ mr: 1, verticalAlign: 'middle' }} />
                Report History: {selectedReport.name}
              </Typography>
              
              {loadingInsightVM ? (
                <Box display="flex" justifyContent="center" p={4}>
                  <CircularProgress />
                </Box>
              ) : reportInstances.length > 0 ? (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Instance ID</TableCell>
                        <TableCell>Name</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Created</TableCell>
                        <TableCell>Started</TableCell>
                        <TableCell>Completed</TableCell>
                        <TableCell>Size</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {reportInstances.map((instance) => (
                        <TableRow key={instance.id}>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                              {instance.id.substring(0, 8)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {instance.name || `Instance ${instance.id.substring(0, 8)}`}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={instance.status || 'Unknown'} 
                              size="small"
                              color={getStatusColor(instance.status) as any}
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">
                              {formatDate(instance.created)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">
                              {formatDate(instance.started)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">
                              {formatDate(instance.completed)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {formatFileSize(instance.size)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Tooltip title="Download Report">
                              <IconButton 
                                size="small" 
                                color="primary"
                                disabled={instance.status?.toLowerCase() !== 'complete'}
                              >
                                <CloudDownload />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Box textAlign="center" py={4}>
                  <Schedule sx={{ fontSize: 60, color: 'grey.400', mb: 2 }} />
                  <Typography variant="body2" color="text.secondary">
                    No report instances found
                  </Typography>
                  <Button 
                    variant="contained" 
                    startIcon={<PlayArrow />}
                    onClick={() => generateInsightVMReport(selectedReport.id)}
                    disabled={loadingInsightVM}
                    sx={{ mt: 2 }}
                  >
                    Generate Report
                  </Button>
                </Box>
              )}
            </CardContent>
          </Card>
        )}
      </Box>
    );
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" gutterBottom>
          Security Reports
        </Typography>
        <Box display="flex" gap={2}>
          <Tooltip title="Refresh Data">
            <IconButton onClick={fetchData} disabled={loading}>
              <Refresh />
            </IconButton>
          </Tooltip>
          <Button
            variant="outlined"
            startIcon={<TableChart />}
            onClick={() => exportReport('csv')}
            disabled={!reportData}
          >
            Export CSV
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Report Type Selection */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" alignItems="center" gap={2}>
            <Assessment />
            <FormControl variant="outlined" sx={{ minWidth: 200 }}>
              <InputLabel>Report Type</InputLabel>
              <Select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                label="Report Type"
              >
                <MenuItem value="overview">Security Overview</MenuItem>
                <MenuItem value="vulnerabilities">Vulnerability Report</MenuItem>
                <MenuItem value="assets">Asset Report</MenuItem>
                <MenuItem value="teams">Team Report</MenuItem>
                <MenuItem value="insightvm">InsightVM Reports</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </CardContent>
      </Card>

      {/* Report Content */}
      {loading ? (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {reportType === 'overview' && renderOverviewReport()}
          {reportType === 'insightvm' && renderInsightVMReports()}
        </>
      )}
    </Box>
  );
};

export default Reports;