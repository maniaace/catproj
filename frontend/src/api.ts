import axios from 'axios';
import { Asset, Team, User, Service, Vulnerability, AuthToken } from './types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authAPI = {
  login: async (username: string, password: string): Promise<AuthToken> => {
    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);
    const response = await api.post('/auth/login', formData);
    return response.data;
  },
  
  getCurrentUser: async (): Promise<User> => {
    const response = await api.get('/users/me');
    return response.data;
  },
};

export const teamsAPI = {
  getTeams: async (): Promise<Team[]> => {
    const response = await api.get('/teams/');
    return response.data;
  },
  
  createTeam: async (team: Omit<Team, 'id' | 'created_at'>): Promise<Team> => {
    const response = await api.post('/teams/', team);
    return response.data;
  },
};

export const assetsAPI = {
  getAssets: async (): Promise<Asset[]> => {
    const response = await api.get('/assets/');
    return response.data;
  },
  
  getAsset: async (id: number): Promise<Asset> => {
    const response = await api.get(`/assets/${id}`);
    return response.data;
  },
  
  createAsset: async (asset: Omit<Asset, 'id' | 'created_at' | 'updated_at' | 'team' | 'owner'>): Promise<Asset> => {
    const response = await api.post('/assets/', asset);
    return response.data;
  },
  
  updateAsset: async (id: number, asset: Omit<Asset, 'id' | 'created_at' | 'updated_at' | 'team' | 'owner'>): Promise<Asset> => {
    const response = await api.put(`/assets/${id}`, asset);
    return response.data;
  },
  
  deleteAsset: async (id: number): Promise<void> => {
    await api.delete(`/assets/${id}`);
  },
  
  getAssetServices: async (assetId: number): Promise<Service[]> => {
    const response = await api.get(`/assets/${assetId}/services/`);
    return response.data;
  },
  
  createAssetService: async (assetId: number, service: Omit<Service, 'id' | 'asset_id' | 'created_at'>): Promise<Service> => {
    const response = await api.post(`/assets/${assetId}/services/`, service);
    return response.data;
  },
  
  getAssetVulnerabilities: async (assetId: number): Promise<Vulnerability[]> => {
    const response = await api.get(`/assets/${assetId}/vulnerabilities/`);
    return response.data;
  },
  
  startAssetScan: async (assetId: number): Promise<{ message: string; scan_id: number; rapid7_scan_id?: string }> => {
    const response = await api.post(`/assets/${assetId}/scan/`);
    return response.data;
  },
};

export const vulnerabilitiesAPI = {
  getTeamVulnerabilities: async (teamId: number): Promise<Vulnerability[]> => {
    const response = await api.get(`/vulnerabilities/team/${teamId}`);
    return response.data;
  },
};

export default api;