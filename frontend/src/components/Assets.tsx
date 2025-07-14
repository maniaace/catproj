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
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  PlayArrow,
  Visibility,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { assetsAPI, teamsAPI } from '../api';
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
    team_id: '',
    owner_id: '',
  });

  useEffect(() => {
    fetchAssets();
    fetchTeams();
  }, []);

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

  const handleOpenDialog = (asset?: Asset) => {
    if (asset) {
      setEditingAsset(asset);
      setFormData({
        name: asset.name,
        ip_address: asset.ip_address,
        os_version: asset.os_version || '',
        team_id: asset.team_id.toString(),
        owner_id: asset.owner_id?.toString() || '',
      });
    } else {
      setEditingAsset(null);
      setFormData({
        name: '',
        ip_address: '',
        os_version: '',
        team_id: user?.team_id?.toString() || '',
        owner_id: user?.id.toString() || '',
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
        team_id: parseInt(formData.team_id),
        owner_id: formData.owner_id ? parseInt(formData.owner_id) : undefined,
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

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">
          Assets
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpenDialog()}
        >
          Add Asset
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>IP Address</TableCell>
              <TableCell>OS Version</TableCell>
              <TableCell>Team</TableCell>
              <TableCell>Owner</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {assets.map((asset) => (
              <TableRow key={asset.id}>
                <TableCell>{asset.name}</TableCell>
                <TableCell>{asset.ip_address}</TableCell>
                <TableCell>{asset.os_version || 'N/A'}</TableCell>
                <TableCell>
                  <Chip label={asset.team?.name || 'Unknown'} size="small" />
                </TableCell>
                <TableCell>{asset.owner?.full_name || asset.owner?.username || 'Unassigned'}</TableCell>
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
                    </>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

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
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingAsset ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Assets;