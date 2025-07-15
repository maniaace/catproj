import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  CircularProgress,
  Button,
  LinearProgress,
  Chip,
  Alert,
  IconButton,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Avatar,
  Divider,
} from '@mui/material';
import {
  Computer,
  Security,
  Group,
  Warning,
  Scanner,
  Event,
  Assessment,
  TrendingUp,
  BugReport,
  Refresh,
  PlayArrow,
  Visibility,
  Shield,
  Error,
  CheckCircle,
  AccessTime,
  Speed,
  Analytics,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { assetsAPI, vulnerabilitiesAPI, insightVMAPI } from '../api';
import { Asset, Vulnerability } from '../types';
import { useNavigate } from 'react-router-dom';

interface DashboardStats {
  totalAssets: number;
  teamAssets: number;
  totalVulnerabilities: number;
  highCriticalVulns: number;
  exploitableVulns: number;
  activeScans: number;
  applications: number;
  recentScans: any[];
  recentVulns: any[];
  apps: any[];
  // InsightVM data
  insightVMStats?: {
    vulnerabilities: {
      total: number;
      critical: number;
      high: number;
      exploitable: number;
    };
    sites: {
      total: number;
    };
    assets: {
      total: number;
    };
    scans: {
      active: number;
    };
  };
  sites: any[];
  vulnerabilityTrends?: any;
}

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalAssets: 0,
    teamAssets: 0,
    totalVulnerabilities: 0,
    highCriticalVulns: 0,
    exploitableVulns: 0,
    activeScans: 0,
    applications: 0,
    recentScans: [],
    recentVulns: [],
    apps: [],
    sites: [],
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      setError(null);
      
      // Fetch all data in parallel focusing on InsightVM data
      const [
        assetsData,
        vulnData,
        insightVMStats,
        sitesData,
        vulnTrends,
        scansData,
      ] = await Promise.all([
        assetsAPI.getAssets().catch(() => []),
        user?.team_id ? vulnerabilitiesAPI.getTeamVulnerabilities(user.team_id).catch(() => []) : [],
        insightVMAPI.getDashboardStats().catch(() => null),
        insightVMAPI.getSitesOverview(0, 10).catch(() => ({ sites: [] })),
        insightVMAPI.getVulnerabilityTrends(7).catch(() => null),
        insightVMAPI.getScans(0, 10).catch(() => ({ resources: [] })),
      ]);

      const assets = Array.isArray(assetsData) ? assetsData : [];
      const vulnerabilities = Array.isArray(vulnData) ? vulnData : [];
      const scans = Array.isArray(scansData?.resources) ? scansData.resources : [];

      // Use InsightVM data as primary source, fallback to local data
      const totalVulns = insightVMStats?.vulnerabilities?.total || vulnerabilities.length;
      const criticalHighVulns = (insightVMStats?.vulnerabilities?.critical || 0) + 
                               (insightVMStats?.vulnerabilities?.high || 0) ||
                               vulnerabilities.filter(v => 
                                 v.severity && (v.severity.toLowerCase() === 'critical' || v.severity.toLowerCase() === 'high')
                               ).length;

      const activeScans = insightVMStats?.scans?.active || 
                         scans.filter((s: any) => s.status === 'running').length;

      setStats({
        totalAssets: insightVMStats?.assets?.total || assets.length,
        teamAssets: user?.team_id ? assets.filter(a => a.team_id === user.team_id).length : 0,
        totalVulnerabilities: totalVulns,
        highCriticalVulns: criticalHighVulns,
        exploitableVulns: insightVMStats?.vulnerabilities?.exploitable || 0,
        activeScans,
        sites: sitesData?.resources || sitesData?.sites || [], // InsightVM sites data
        recentScans: scans.slice(0, 5),
        recentVulns: vulnerabilities.slice(0, 5),
        apps: [], // Replaced with InsightVM sites
        insightVMStats: insightVMStats && !insightVMStats.error ? insightVMStats : undefined,
        vulnerabilityTrends: vulnTrends,
      });

    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const getVulnSeverityColor = (severity: string | undefined) => {
    if (!severity) return 'default';
    switch (severity.toLowerCase()) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  const getScanStatusColor = (status: string | undefined) => {
    if (!status) return 'default';
    switch (status.toLowerCase()) {
      case 'running': return 'primary';
      case 'completed': return 'success';
      case 'failed': return 'error';
      case 'paused': return 'warning';
      default: return 'default';
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return 'Just now';
  };

  const dashboardCards = [
    {
      title: 'Total Assets',
      value: stats.totalAssets,
      icon: <Computer sx={{ fontSize: 40 }} />,
      color: '#00A651',
      subtitle: 'InsightVM + Local assets',
      trend: '+2.5%',
    },
    {
      title: 'InsightVM Sites',
      value: stats.insightVMStats?.sites?.total || stats.sites?.length || 0,
      icon: <Analytics sx={{ fontSize: 40 }} />,
      color: '#1976d2',
      subtitle: 'Managed scan sites',
      trend: stats.sites?.length > 0 ? 'Active' : 'Setup needed',
    },
    {
      title: 'Active Scans',
      value: stats.activeScans,
      icon: <Scanner sx={{ fontSize: 40 }} />,
      color: '#ff9800',
      subtitle: 'InsightVM scans running',
      trend: stats.activeScans > 0 ? 'Active' : 'Idle',
    },
    {
      title: 'Vulnerabilities',
      value: stats.totalVulnerabilities,
      icon: <BugReport sx={{ fontSize: 40 }} />,
      color: '#e91e63',
      subtitle: `${stats.highCriticalVulns} high/critical`,
      trend: stats.highCriticalVulns > 0 ? 'Action needed' : 'Good',
    },
  ];

  const quickActions = [
    {
      title: 'Start New Scan',
      icon: <Scanner />,
      action: () => navigate('/scanning'),
      color: 'primary',
      description: 'Launch vulnerability scan',
    },
    {
      title: 'AppSec Events',
      icon: <Event />,
      action: () => navigate('/appsec-events'),
      color: 'secondary',
      description: 'View security events',
    },
    {
      title: 'View Assets',
      icon: <Computer />,
      action: () => navigate('/assets'),
      color: 'success',
      description: 'Manage asset inventory',
    },
    {
      title: 'Vulnerabilities',
      icon: <Security />,
      action: () => navigate('/vulnerabilities'),
      color: 'error',
      description: 'Review security findings',
    },
  ];

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
            Security Dashboard
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Welcome back, {user?.full_name || user?.username}! Here's your security overview.
          </Typography>
        </Box>
        <Tooltip title="Refresh Dashboard">
          <IconButton onClick={handleRefresh} disabled={refreshing}>
            <Refresh sx={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
          </IconButton>
        </Tooltip>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Stats Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 3, mb: 4 }}>
        {dashboardCards.map((card, index) => (
          <Card key={index} sx={{ height: '100%', transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-2px)' } }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                <Avatar sx={{ bgcolor: card.color, width: 60, height: 60 }}>
                  {card.icon}
                </Avatar>
                <Box textAlign="right">
                  <Typography variant="h3" component="div" color={card.color} fontWeight="bold">
                    {card.value}
                  </Typography>
                  <Chip 
                    label={card.trend} 
                    size="small" 
                    color={card.trend.includes('+') ? 'success' : card.trend === 'Active' ? 'primary' : 'default'}
                  />
                </Box>
              </Box>
              <Typography variant="h6" gutterBottom>
                {card.title}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {card.subtitle}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Box>

      {/* Quick Actions */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            <Speed sx={{ mr: 1, verticalAlign: 'middle' }} />
            Quick Actions
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2, mt: 2 }}>
            {quickActions.map((action, index) => (
              <Button
                key={index}
                variant="outlined"
                startIcon={action.icon}
                onClick={action.action}
                color={action.color as any}
                sx={{ 
                  p: 2, 
                  height: 'auto', 
                  justifyContent: 'flex-start',
                  '&:hover': { transform: 'translateY(-1px)' }
                }}
              >
                <Box textAlign="left">
                  <Typography variant="body2" fontWeight="bold">
                    {action.title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {action.description}
                  </Typography>
                </Box>
              </Button>
            ))}
          </Box>
        </CardContent>
      </Card>

      {/* Data Tables */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 3 }}>
        {/* Recent Scans */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              <Analytics sx={{ mr: 1, verticalAlign: 'middle' }} />
              Recent Scans
            </Typography>
            {stats.recentScans.length > 0 ? (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>ID</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Started</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {stats.recentScans.map((scan, index) => (
                      <TableRow key={scan.id || index}>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                            {scan.id ? String(scan.id).substring(0, 8) : 'N/A'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={scan.status || 'Unknown'} 
                            size="small"
                            color={getScanStatusColor(scan.status) as any}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {formatTimeAgo(scan.started_at || scan.created_at)}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Box textAlign="center" py={4}>
                <Scanner sx={{ fontSize: 60, color: 'grey.400', mb: 2 }} />
                <Typography variant="body2" color="text.secondary">
                  No recent scans found
                </Typography>
                <Button 
                  variant="contained" 
                  startIcon={<PlayArrow />}
                  onClick={() => navigate('/scanning')}
                  sx={{ mt: 2 }}
                >
                  Start First Scan
                </Button>
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Recent Vulnerabilities */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              <Shield sx={{ mr: 1, verticalAlign: 'middle' }} />
              Recent Vulnerabilities
            </Typography>
            {stats.recentVulns.length > 0 ? (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Title</TableCell>
                      <TableCell>Severity</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {stats.recentVulns.map((vuln, index) => (
                      <TableRow key={vuln.id || index}>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                            {vuln.title || vuln.name || 'Unknown Vulnerability'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={vuln.severity || 'Unknown'} 
                            size="small"
                            color={getVulnSeverityColor(vuln.severity) as any}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={vuln.status || 'Open'} 
                            size="small"
                            color={vuln.status === 'Fixed' ? 'success' : 'default'}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Box textAlign="center" py={4}>
                <CheckCircle sx={{ fontSize: 60, color: 'success.main', mb: 2 }} />
                <Typography variant="body2" color="text.secondary">
                  No vulnerabilities found
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Your systems appear to be secure
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      </Box>

      {/* InsightVM Sites Overview */}
      {stats.sites && stats.sites.length > 0 && (
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              <Security sx={{ mr: 1, verticalAlign: 'middle' }} />
              InsightVM Sites ({stats.sites.length})
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Site Name</TableCell>
                    <TableCell>Assets</TableCell>
                    <TableCell>Critical</TableCell>
                    <TableCell>High</TableCell>
                    <TableCell>Risk Score</TableCell>
                    <TableCell>Last Scan</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {stats.sites.slice(0, 5).map((site, index) => (
                    <TableRow key={site.id || index}>
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold">
                          {site.name || `Site ${site.id}`}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {site.description || 'No description'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={site.assets_count || 0} 
                          size="small" 
                          color="primary"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={site.vulnerabilities?.critical || 0} 
                          size="small" 
                          color="error"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={site.vulnerabilities?.severe || 0} 
                          size="small" 
                          color="warning"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {site.risk_score ? Math.round(site.risk_score) : 'N/A'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {site.last_scan ? formatTimeAgo(site.last_scan) : 'Never'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Tooltip title="Start Scan">
                          <IconButton size="small" color="primary">
                            <PlayArrow />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="View Details">
                          <IconButton size="small" color="secondary">
                            <Visibility />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            {stats.sites.length > 5 && (
              <Box textAlign="center" mt={2}>
                <Button 
                  variant="outlined" 
                  onClick={() => navigate('/sites')}
                  startIcon={<Security />}
                >
                  View All Sites ({stats.sites.length})
                </Button>
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      {/* Vulnerability Trends (InsightVM) */}
      {stats.vulnerabilityTrends && (
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              <TrendingUp sx={{ mr: 1, verticalAlign: 'middle' }} />
              Vulnerability Trends (7 days)
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2, mt: 2 }}>
              {Object.entries(stats.vulnerabilityTrends.trends || {}).map(([severity, data]: [string, any]) => (
                <Card key={severity} variant="outlined">
                  <CardContent sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h4" color={
                      severity === 'critical' ? 'error.main' :
                      severity === 'high' ? 'warning.main' :
                      severity === 'exploitable' ? 'error.main' : 'info.main'
                    }>
                      {data.current || 0}
                    </Typography>
                    <Typography variant="body2" fontWeight="bold" textTransform="capitalize">
                      {severity}
                    </Typography>
                    <Chip 
                      label={data.trend || 'stable'} 
                      size="small" 
                      color={data.trend === 'increasing' ? 'error' : 'success'}
                      sx={{ mt: 1 }}
                    />
                  </CardContent>
                </Card>
              ))}
            </Box>
            
            {stats.vulnerabilityTrends.top_categories && stats.vulnerabilityTrends.top_categories.length > 0 && (
              <Box mt={3}>
                <Typography variant="subtitle1" gutterBottom>
                  Top Vulnerability Categories
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                  {stats.vulnerabilityTrends.top_categories.slice(0, 8).map((category: any, index: number) => (
                    <Chip 
                      key={index}
                      label={`${category.name} (${category.count})`}
                      size="small"
                      variant="outlined"
                      color="secondary"
                    />
                  ))}
                </Box>
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      {/* InsightVM Overview */}
      {stats.insightVMStats ? (
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              <Security sx={{ mr: 1, verticalAlign: 'middle' }} />
              InsightVM Security Overview
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 2, mt: 2 }}>
              <Card variant="outlined">
                <CardContent sx={{ p: 2, textAlign: 'center' }}>
                  <CheckCircle sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
                  <Typography variant="h6" fontWeight="bold">
                    Connected
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    InsightVM API is accessible
                  </Typography>
                </CardContent>
              </Card>
              <Card variant="outlined">
                <CardContent sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h4" color="primary.main">
                    {stats.insightVMStats.assets?.total || 0}
                  </Typography>
                  <Typography variant="body2" fontWeight="bold">
                    Total Assets
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Managed by InsightVM
                  </Typography>
                </CardContent>
              </Card>
              <Card variant="outlined">
                <CardContent sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h4" color="error.main">
                    {(stats.insightVMStats.vulnerabilities?.critical || 0) + (stats.insightVMStats.vulnerabilities?.high || 0)}
                  </Typography>
                  <Typography variant="body2" fontWeight="bold">
                    Critical/High Vulns
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Require immediate attention
                  </Typography>
                </CardContent>
              </Card>
              <Card variant="outlined">
                <CardContent sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h4" color="warning.main">
                    {stats.insightVMStats.scans?.active || 0}
                  </Typography>
                  <Typography variant="body2" fontWeight="bold">
                    Active Scans
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Currently running
                  </Typography>
                </CardContent>
              </Card>
            </Box>
            
            {/* Quick InsightVM Actions */}
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                Quick Actions
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<Scanner />}
                  onClick={() => navigate('/scanning')}
                  color="primary"
                >
                  Start Scan
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<Assessment />}
                  onClick={() => navigate('/reports')}
                  color="secondary"
                >
                  Generate Report
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<Computer />}
                  onClick={() => navigate('/assets')}
                  color="success"
                >
                  View Assets
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<Security />}
                  onClick={() => navigate('/insightvm')}
                  color="info"
                >
                  InsightVM Console
                </Button>
              </Box>
            </Box>
          </CardContent>
        </Card>
      ) : (
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              <Warning sx={{ mr: 1, verticalAlign: 'middle' }} />
              InsightVM Configuration Required
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              InsightVM integration is not configured. Please configure the InsightVM connection to access advanced vulnerability management features.
            </Typography>
            <Button
              variant="contained"
              startIcon={<Security />}
              onClick={() => navigate('/insightvm')}
              color="primary"
            >
              Configure InsightVM
            </Button>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default Dashboard;