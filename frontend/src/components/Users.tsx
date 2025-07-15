import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Tooltip,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Person,
  AdminPanelSettings,
  Group,
  Refresh,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { usersAPI, teamsAPI } from '../api';
import { User, Team } from '../types';

interface UserFormData {
  username: string;
  email: string;
  full_name: string;
  password: string;
  team_id: number | '';
  is_admin: boolean;
  is_active: boolean;
}

const Users: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<UserFormData>({
    username: '',
    email: '',
    full_name: '',
    password: '',
    team_id: '',
    is_admin: false,
    is_active: true,
  });

  useEffect(() => {
    fetchUsers();
    fetchTeams();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await usersAPI.getUsers();
      setUsers(response.data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const fetchTeams = async () => {
    try {
      const response = await teamsAPI.getTeams();
      setTeams(response);
    } catch (error) {
      console.error('Failed to fetch teams:', error);
    }
  };

  const handleOpenDialog = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        username: user.username,
        email: user.email,
        full_name: user.full_name || '',
        password: '',
        team_id: user.team_id || '',
        is_admin: user.is_admin,
        is_active: user.is_active,
      });
    } else {
      setEditingUser(null);
      setFormData({
        username: '',
        email: '',
        full_name: '',
        password: '',
        team_id: '',
        is_admin: false,
        is_active: true,
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingUser(null);
    setError(null);
  };

  const handleSubmit = async () => {
    try {
      const userData = {
        username: formData.username,
        email: formData.email,
        full_name: formData.full_name,
        password: formData.password,
        team_id: formData.team_id || undefined,
        is_admin: formData.is_admin,
        is_active: formData.is_active,
      };

      if (editingUser) {
        await usersAPI.updateUser(editingUser.id, userData);
      } else {
        await usersAPI.createUser(userData);
      }

      fetchUsers();
      handleCloseDialog();
    } catch (error: any) {
      console.error('Failed to save user:', error);
      const errorMessage = error?.response?.data?.detail || 'Failed to save user. Please try again.';
      setError(errorMessage);
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (userId === currentUser?.id) {
      setError('You cannot delete your own account.');
      return;
    }

    if (window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      try {
        await usersAPI.deleteUser(userId);
        fetchUsers();
      } catch (error: any) {
        console.error('Failed to delete user:', error);
        const errorMessage = error?.response?.data?.detail || 'Failed to delete user.';
        setError(errorMessage);
      }
    }
  };

  const getTeamName = (teamId?: number) => {
    if (!teamId) return 'No Team';
    const team = teams.find(t => t.id === teamId);
    return team ? team.name : 'Unknown Team';
  };

  if (!currentUser?.is_admin) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          You don't have permission to access user management.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" gutterBottom>
          User Management
        </Typography>
        <Box display="flex" gap={2}>
          <Tooltip title="Refresh">
            <IconButton onClick={fetchUsers} disabled={loading}>
              <Refresh />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleOpenDialog()}
          >
            Add User
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Card>
        <CardContent>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Username</TableCell>
                  <TableCell>Full Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Team</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <Box display="flex" alignItems="center">
                        <Person sx={{ mr: 1, color: 'action.active' }} />
                        {user.username}
                      </Box>
                    </TableCell>
                    <TableCell>{user.full_name || '-'}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{getTeamName(user.team_id)}</TableCell>
                    <TableCell>
                      <Chip
                        icon={user.is_admin ? <AdminPanelSettings /> : <Person />}
                        label={user.is_admin ? 'Admin' : 'User'}
                        color={user.is_admin ? 'primary' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={user.is_active ? 'Active' : 'Inactive'}
                        color={user.is_active ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => handleOpenDialog(user)}
                        color="primary"
                      >
                        <Edit />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteUser(user.id)}
                        color="error"
                        disabled={user.id === currentUser?.id}
                      >
                        <Delete />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* User Form Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingUser ? 'Edit User' : 'Add New User'}
        </DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField
              label="Username"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              required
              fullWidth
            />
            <TextField
              label="Full Name"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              fullWidth
            />
            <TextField
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              fullWidth
            />
            <TextField
              label={editingUser ? "New Password (leave blank to keep current)" : "Password"}
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required={!editingUser}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>Team</InputLabel>
              <Select
                value={formData.team_id}
                onChange={(e) => setFormData({ ...formData, team_id: e.target.value as number })}
                label="Team"
              >
                <MenuItem value="">No Team</MenuItem>
                {teams.map((team) => (
                  <MenuItem key={team.id} value={team.id}>
                    {team.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.is_admin}
                  onChange={(e) => setFormData({ ...formData, is_admin: e.target.checked })}
                />
              }
              label="Administrator"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                />
              }
              label="Active"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingUser ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Users;