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
  Chip,
  Card,
  CardContent,
  Collapse,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Alert,
  Tooltip,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  People,
  ExpandMore,
  ChevronRight,
  AccountTree,
  Groups,
  Business,
  Share,
  Folder,
  FolderOpen,
  GroupAdd,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { teamsAPI } from '../api';
import { Team } from '../types';

const Teams: React.FC = () => {
  const { user } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [mainTeams, setMainTeams] = useState<Team[]>([]);
  const [expandedTeams, setExpandedTeams] = useState<number[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    parent_team_id: '',
    team_type: 'main',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'hierarchy' | 'table'>('hierarchy');

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    try {
      const [allTeams, mainTeamsData] = await Promise.all([
        teamsAPI.getTeams(),
        teamsAPI.getMainTeams()
      ]);
      setTeams(allTeams);
      setMainTeams(mainTeamsData);
      setError(null);
    } catch (error) {
      console.error('Failed to fetch teams:', error);
      setError('Failed to load teams. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (team?: Team, parentTeamId?: number) => {
    if (team) {
      setEditingTeam(team);
      setFormData({
        name: team.name,
        description: team.description || '',
        parent_team_id: team.parent_team_id?.toString() || '',
        team_type: team.team_type,
      });
    } else {
      setEditingTeam(null);
      setFormData({
        name: '',
        description: '',
        parent_team_id: parentTeamId?.toString() || '',
        team_type: parentTeamId ? 'sub' : 'main',
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingTeam(null);
  };

  const handleSubmit = async () => {
    try {
      const teamData = {
        name: formData.name,
        description: formData.description,
        parent_team_id: formData.parent_team_id ? parseInt(formData.parent_team_id) : undefined,
        team_type: formData.team_type,
      };

      if (editingTeam) {
        await teamsAPI.updateTeam(editingTeam.id, teamData);
      } else {
        await teamsAPI.createTeam(teamData);
      }

      fetchTeams();
      handleCloseDialog();
    } catch (error) {
      console.error('Failed to save team:', error);
      setError('Failed to save team. Please try again.');
    }
  };

  const handleDeleteTeam = async (teamId: number) => {
    if (window.confirm('Are you sure you want to delete this team? This action cannot be undone.')) {
      try {
        await teamsAPI.deleteTeam(teamId);
        fetchTeams();
      } catch (error: any) {
        console.error('Failed to delete team:', error);
        const errorMessage = error?.response?.data?.detail || 'Failed to delete team. Check if it has sub-teams or assets.';
        setError(errorMessage);
      }
    }
  };

  const toggleExpanded = (teamId: number) => {
    setExpandedTeams(prev => 
      prev.includes(teamId) 
        ? prev.filter(id => id !== teamId)
        : [...prev, teamId]
    );
  };

  const getSubTeams = (parentId: number): Team[] => {
    return teams.filter(team => team.parent_team_id === parentId);
  };

  const getTeamIcon = (teamType: string) => {
    switch (teamType) {
      case 'main': return <Business />;
      case 'sub': return <Groups />;
      case 'shared': return <Share />;
      default: return <People />;
    }
  };

  const getTeamTypeColor = (teamType: string) => {
    switch (teamType) {
      case 'main': return 'primary';
      case 'sub': return 'secondary';
      case 'shared': return 'warning';
      default: return 'default';
    }
  };

  const renderTeamHierarchy = (team: Team, level: number = 0) => {
    const subTeams = getSubTeams(team.id);
    const isExpanded = expandedTeams.includes(team.id);
    
    return (
      <Box key={team.id} sx={{ ml: level * 3 }}>
        <Card sx={{ mb: 1, bgcolor: level === 0 ? 'background.paper' : 'background.default' }}>
          <CardContent sx={{ py: 2 }}>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box display="flex" alignItems="center" gap={1}>
                {subTeams.length > 0 && (
                  <IconButton
                    size="small"
                    onClick={() => toggleExpanded(team.id)}
                  >
                    {isExpanded ? <ExpandMore /> : <ChevronRight />}
                  </IconButton>
                )}
                {getTeamIcon(team.team_type)}
                <Typography variant="h6" component="span">
                  {team.name}
                </Typography>
                <Chip
                  label={team.team_type.toUpperCase()}
                  size="small"
                  color={getTeamTypeColor(team.team_type) as any}
                  variant="outlined"
                />
              </Box>
              <Box display="flex" gap={1}>
                <Tooltip title="Add Sub-Team">
                  <IconButton 
                    size="small" 
                    onClick={() => handleOpenDialog(undefined, team.id)}
                    color="primary"
                  >
                    <GroupAdd />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Edit Team">
                  <IconButton 
                    size="small" 
                    onClick={() => handleOpenDialog(team)}
                  >
                    <Edit />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Delete Team">
                  <IconButton 
                    size="small" 
                    color="error"
                    onClick={() => handleDeleteTeam(team.id)}
                  >
                    <Delete />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
            {team.description && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {team.description}
              </Typography>
            )}
          </CardContent>
        </Card>
        
        <Collapse in={isExpanded}>
          <Box>
            {subTeams.map(subTeam => renderTeamHierarchy(subTeam, level + 1))}
          </Box>
        </Collapse>
      </Box>
    );
  };

  const renderTableView = () => (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Type</TableCell>
            <TableCell>Parent Team</TableCell>
            <TableCell>Description</TableCell>
            <TableCell>Created</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {teams.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} align="center">
                <Box py={4}>
                  <People sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
                  <Typography variant="h6" color="textSecondary">
                    No teams found
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Create your first team to get started
                  </Typography>
                </Box>
              </TableCell>
            </TableRow>
          ) : (
            teams.map((team) => (
              <TableRow key={team.id}>
                <TableCell>
                  <Box display="flex" alignItems="center" gap={1}>
                    {getTeamIcon(team.team_type)}
                    <Typography variant="subtitle1" fontWeight="medium">
                      {team.name}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip
                    label={team.team_type.toUpperCase()}
                    size="small"
                    color={getTeamTypeColor(team.team_type) as any}
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>
                  {team.parent_team_id ? (
                    <Typography variant="body2">
                      {teams.find(t => t.id === team.parent_team_id)?.name || 'Unknown'}
                    </Typography>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      Root Team
                    </Typography>
                  )}
                </TableCell>
                <TableCell>{team.description || 'No description'}</TableCell>
                <TableCell>
                  <Chip 
                    label={new Date(team.created_at).toLocaleDateString()} 
                    size="small" 
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>
                  <Tooltip title="Add Sub-Team">
                    <IconButton 
                      size="small" 
                      onClick={() => handleOpenDialog(undefined, team.id)}
                      color="primary"
                    >
                      <GroupAdd />
                    </IconButton>
                  </Tooltip>
                  <IconButton size="small" onClick={() => handleOpenDialog(team)}>
                    <Edit />
                  </IconButton>
                  <IconButton 
                    size="small" 
                    color="error"
                    onClick={() => handleDeleteTeam(team.id)}
                  >
                    <Delete />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );

  if (!user?.is_admin) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>
          Teams
        </Typography>
        <Typography variant="body1" color="textSecondary">
          You don't have permission to view teams. Admin access required.
        </Typography>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>
          Teams
        </Typography>
        <Typography>Loading...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">
          Teams Management
        </Typography>
        <Box display="flex" gap={2}>
          <Button
            variant={viewMode === 'hierarchy' ? 'contained' : 'outlined'}
            startIcon={<AccountTree />}
            onClick={() => setViewMode('hierarchy')}
          >
            Hierarchy
          </Button>
          <Button
            variant={viewMode === 'table' ? 'contained' : 'outlined'}
            startIcon={<People />}
            onClick={() => setViewMode('table')}
          >
            Table
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleOpenDialog()}
          >
            Add Team
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Team Statistics */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 3, mb: 3 }}>
        <Card>
          <CardContent sx={{ textAlign: 'center' }}>
            <Business sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
            <Typography variant="h4" color="primary">
              {mainTeams.length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Main Teams
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent sx={{ textAlign: 'center' }}>
            <Groups sx={{ fontSize: 40, color: 'secondary.main', mb: 1 }} />
            <Typography variant="h4" color="secondary">
              {teams.filter(t => t.team_type === 'sub').length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Sub Teams
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent sx={{ textAlign: 'center' }}>
            <Share sx={{ fontSize: 40, color: 'warning.main', mb: 1 }} />
            <Typography variant="h4" color="warning.main">
              {teams.filter(t => t.team_type === 'shared').length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Shared Teams
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent sx={{ textAlign: 'center' }}>
            <People sx={{ fontSize: 40, color: 'info.main', mb: 1 }} />
            <Typography variant="h4" color="info.main">
              {teams.length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total Teams
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Teams Display */}
      {viewMode === 'hierarchy' ? (
        <Box>
          <Typography variant="h6" gutterBottom>
            Team Hierarchy
          </Typography>
          {mainTeams.length === 0 ? (
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 8 }}>
                <AccountTree sx={{ fontSize: 80, color: 'grey.400', mb: 2 }} />
                <Typography variant="h6" color="textSecondary" gutterBottom>
                  No teams found
                </Typography>
                <Typography variant="body2" color="textSecondary" paragraph>
                  Create your first main team to get started with the hierarchy
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => handleOpenDialog()}
                >
                  Create Main Team
                </Button>
              </CardContent>
            </Card>
          ) : (
            mainTeams.map(team => renderTeamHierarchy(team))
          )}
        </Box>
      ) : (
        renderTableView()
      )}

      {/* Add/Edit Team Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingTeam ? 'Edit Team' : 'Add New Team'}
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Team Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            margin="normal"
            required
          />
          <TextField
            fullWidth
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            margin="normal"
            multiline
            rows={3}
          />
          <FormControl fullWidth margin="normal">
            <InputLabel>Team Type</InputLabel>
            <Select
              value={formData.team_type}
              onChange={(e) => setFormData({ ...formData, team_type: e.target.value })}
              label="Team Type"
            >
              <MenuItem value="main">Main Team</MenuItem>
              <MenuItem value="sub">Sub Team</MenuItem>
              <MenuItem value="shared">Shared Team</MenuItem>
            </Select>
          </FormControl>
          {(formData.team_type === 'sub' || formData.parent_team_id) && (
            <FormControl fullWidth margin="normal">
              <InputLabel>Parent Team</InputLabel>
              <Select
                value={formData.parent_team_id}
                onChange={(e) => setFormData({ ...formData, parent_team_id: e.target.value })}
                label="Parent Team"
              >
                <MenuItem value="">None</MenuItem>
                {teams.filter(t => t.team_type === 'main' || t.team_type === 'shared').map(team => (
                  <MenuItem key={team.id} value={team.id.toString()}>
                    {team.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" disabled={!formData.name.trim()}>
            {editingTeam ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Teams;