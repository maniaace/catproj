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
} from '@mui/material';
import {
  Search,
  Security,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { vulnerabilitiesAPI } from '../api';
import { Vulnerability } from '../types';

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
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');

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
      const data = await vulnerabilitiesAPI.getTeamVulnerabilities(user.team_id);
      setVulnerabilities(data);
    } catch (error) {
      console.error('Failed to fetch vulnerabilities:', error);
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
      <Typography variant="h4" gutterBottom>
        Vulnerabilities
      </Typography>
      
      <Typography variant="subtitle1" color="textSecondary" gutterBottom>
        Security vulnerabilities for {user?.team?.name || 'your team'}
      </Typography>

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
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredVulns.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
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
    </Box>
  );
};

export default Vulnerabilities;