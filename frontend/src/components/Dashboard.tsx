import React, { useState, useEffect } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  CircularProgress,
} from '@mui/material';
import {
  Computer,
  Security,
  Group,
  Warning,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { assetsAPI, vulnerabilitiesAPI } from '../api';
import { Asset, Vulnerability } from '../types';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [vulnerabilities, setVulnerabilities] = useState<Vulnerability[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [assetsData, vulnData] = await Promise.all([
          assetsAPI.getAssets(),
          user?.team_id ? vulnerabilitiesAPI.getTeamVulnerabilities(user.team_id) : [],
        ]);
        setAssets(assetsData);
        setVulnerabilities(Array.isArray(vulnData) ? vulnData : []);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const highSeverityVulns = vulnerabilities.filter(v => 
    v.severity.toLowerCase() === 'critical' || v.severity.toLowerCase() === 'high'
  ).length;

  const dashboardCards = [
    {
      title: 'Total Assets',
      value: assets.length,
      icon: <Computer sx={{ fontSize: 40 }} />,
      color: '#1976d2',
    },
    {
      title: 'Team Assets',
      value: user?.team_id ? assets.filter(a => a.team_id === user.team_id).length : 0,
      icon: <Group sx={{ fontSize: 40 }} />,
      color: '#388e3c',
    },
    {
      title: 'Total Vulnerabilities',
      value: vulnerabilities.length,
      icon: <Security sx={{ fontSize: 40 }} />,
      color: '#f57c00',
    },
    {
      title: 'High/Critical Vulns',
      value: highSeverityVulns,
      icon: <Warning sx={{ fontSize: 40 }} />,
      color: '#d32f2f',
    },
  ];

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      <Typography variant="subtitle1" color="textSecondary" gutterBottom>
        Welcome back, {user?.full_name || user?.username}!
      </Typography>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 3, mt: 2 }}>
        {dashboardCards.map((card, index) => (
          <Card key={index} sx={{ height: '100%' }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="h6">
                    {card.title}
                  </Typography>
                  <Typography variant="h3" component="div">
                    {card.value}
                  </Typography>
                </Box>
                <Box sx={{ color: card.color }}>
                  {card.icon}
                </Box>
              </Box>
            </CardContent>
          </Card>
        ))}
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3, mt: 3 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Recent Assets
            </Typography>
            {assets.slice(0, 5).map((asset) => (
              <Box key={asset.id} sx={{ mb: 1 }}>
                <Typography variant="body2">
                  <strong>{asset.name}</strong> - {asset.ip_address}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  {asset.team?.name} | {asset.os_version}
                </Typography>
              </Box>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Recent Vulnerabilities
            </Typography>
            {vulnerabilities.slice(0, 5).map((vuln) => (
              <Box key={vuln.id} sx={{ mb: 1 }}>
                <Typography variant="body2">
                  <strong>{vuln.title}</strong>
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  Severity: {vuln.severity} | Status: {vuln.status}
                </Typography>
              </Box>
            ))}
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};

export default Dashboard;