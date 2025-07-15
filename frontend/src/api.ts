import axios from 'axios';
import { 
  Asset, Team, User, Service, Vulnerability, AuthToken, 
  ScanEngine, ScanTemplate, ScanResult, AssetGroup, 
  VulnerabilityExploit, LogSearchResult, AssetStats 
} from './types';

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

export const usersAPI = {
  getUsers: async (): Promise<{ data: User[] }> => {
    const response = await api.get('/users/');
    return { data: response.data };
  },

  createUser: async (user: {
    username: string;
    email: string;
    full_name?: string;
    password: string;
    team_id?: number;
    is_admin?: boolean;
    is_active?: boolean;
  }): Promise<User> => {
    const response = await api.post('/users/', user);
    return response.data;
  },

  updateUser: async (userId: number, user: {
    username?: string;
    email?: string;
    full_name?: string;
    password?: string;
    team_id?: number;
    is_admin?: boolean;
    is_active?: boolean;
  }): Promise<User> => {
    const response = await api.put(`/users/${userId}/`, user);
    return response.data;
  },

  deleteUser: async (userId: number): Promise<void> => {
    await api.delete(`/users/${userId}/`);
  },
};

export const teamsAPI = {
  getTeams: async (parentTeamId?: number): Promise<Team[]> => {
    const params = parentTeamId ? { parent_team_id: parentTeamId } : {};
    const response = await api.get('/teams/', { params });
    return response.data;
  },
  
  getMainTeams: async (): Promise<Team[]> => {
    const response = await api.get('/teams/main/');
    return response.data;
  },
  
  getSubTeams: async (teamId: number): Promise<Team[]> => {
    const response = await api.get(`/teams/${teamId}/sub-teams/`);
    return response.data;
  },
  
  getTeamHierarchy: async (teamId: number): Promise<Team> => {
    const response = await api.get(`/teams/${teamId}/hierarchy/`);
    return response.data;
  },
  
  createTeam: async (team: Omit<Team, 'id' | 'created_at' | 'parent_team' | 'sub_teams'>): Promise<Team> => {
    const response = await api.post('/teams/', team);
    return response.data;
  },
  
  updateTeam: async (teamId: number, team: Omit<Team, 'id' | 'created_at' | 'parent_team' | 'sub_teams'>): Promise<Team> => {
    const response = await api.put(`/teams/${teamId}/`, team);
    return response.data;
  },
  
  deleteTeam: async (teamId: number): Promise<void> => {
    await api.delete(`/teams/${teamId}/`);
  },
};

export const assetsAPI = {
  getAssets: async (environment?: string, criticality?: string): Promise<Asset[]> => {
    const params: any = {};
    if (environment) params.environment = environment;
    if (criticality) params.criticality = criticality;
    const response = await api.get('/assets/', { params });
    return response.data;
  },
  
  getAssetStats: async (): Promise<AssetStats> => {
    const response = await api.get('/assets/stats/');
    return response.data;
  },
  
  getCriticalAssets: async (): Promise<Asset[]> => {
    const response = await api.get('/assets/critical/');
    return response.data;
  },
  
  getProdAssets: async (): Promise<Asset[]> => {
    const response = await api.get('/assets/prod/');
    return response.data;
  },
  
  getAssetsByEnvironment: async (environment: string): Promise<Asset[]> => {
    const response = await api.get(`/assets/environment/${environment}/`);
    return response.data;
  },
  
  getAssetsByCriticality: async (criticality: string): Promise<Asset[]> => {
    const response = await api.get(`/assets/criticality/${criticality}/`);
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

export const rapid7API = {
  getApps: async (): Promise<any[]> => {
    const response = await api.get('/rapid7/apps/');
    return response.data;
  },

  createApp: async (name: string, description?: string): Promise<{ message: string; app: any }> => {
    const response = await api.post('/rapid7/apps/', {
      name,
      description
    });
    return response.data;
  },

  getAttackTemplates: async (): Promise<ScanTemplate[]> => {
    const response = await api.get('/rapid7/attack-templates/');
    return response.data;
  },

  createScanConfig: async (appId: string, name: string, attackTemplateId?: string): Promise<{ message: string; scan_config: any }> => {
    const response = await api.post('/rapid7/scan-configs/', {
      app_id: appId,
      name,
      attack_template_id: attackTemplateId
    });
    return response.data;
  },

  startScan: async (scanConfigId: string): Promise<{ message: string; scan_data: any }> => {
    const response = await api.post('/rapid7/scans/', {
      scan_config_id: scanConfigId
    });
    return response.data;
  },

  pauseScan: async (scanId: string): Promise<{ message: string; result: any }> => {
    const response = await api.post(`/rapid7/scans/${scanId}/pause/`);
    return response.data;
  },

  resumeScan: async (scanId: string): Promise<{ message: string; result: any }> => {
    const response = await api.post(`/rapid7/scans/${scanId}/resume/`);
    return response.data;
  },

  stopScan: async (scanId: string): Promise<{ message: string; result: any }> => {
    const response = await api.post(`/rapid7/scans/${scanId}/stop/`);
    return response.data;
  },

  getScanStatus: async (scanId: string): Promise<ScanResult> => {
    const response = await api.get(`/rapid7/scans/${scanId}/status/`);
    return response.data;
  },

  getScans: async (appId?: string): Promise<ScanResult[]> => {
    const url = appId 
      ? `/rapid7/scans/?app_id=${appId}`
      : '/rapid7/scans/';
    const response = await api.get(url);
    return response.data;
  },

  getAppScanHistory: async (appId: string): Promise<ScanResult[]> => {
    const response = await api.get(`/rapid7/apps/${appId}/scan-history/`);
    return response.data;
  },

  getExploitableVulnerabilities: async (appId?: string): Promise<Vulnerability[]> => {
    const url = appId 
      ? `/rapid7/vulnerabilities/exploitable/?app_id=${appId}`
      : '/rapid7/vulnerabilities/exploitable/';
    const response = await api.get(url);
    return response.data;
  },

  getAppVulnerabilities: async (appId: string): Promise<Vulnerability[]> => {
    const response = await api.get(`/rapid7/apps/${appId}/vulnerabilities/`);
    return response.data;
  },

  getVulnerabilityExploits: async (vulnId: string): Promise<VulnerabilityExploit[]> => {
    const response = await api.get(`/rapid7/vulnerabilities/${vulnId}/exploits/`);
    return response.data;
  },

  validateVulnerability: async (vulnId: string, status: string): Promise<{ message: string; result: any }> => {
    const response = await api.post(`/rapid7/vulnerabilities/${vulnId}/validate/`, {
      validation_status: status
    });
    return response.data;
  },

  searchLogs: async (query: string, timeRange: string = '1h', logSets?: string[]): Promise<LogSearchResult> => {
    const response = await api.post('/rapid7/logs/search/', {
      query,
      time_range: timeRange,
      log_sets: logSets
    });
    return response.data;
  },

  getTargets: async (appId?: string): Promise<any[]> => {
    const url = appId 
      ? `/rapid7/targets/?app_id=${appId}`
      : '/rapid7/targets/';
    const response = await api.get(url);
    return response.data;
  },

  createTarget: async (appId: string, address: string, name?: string): Promise<{ message: string; target: any }> => {
    const response = await api.post('/rapid7/targets/', {
      app_id: appId,
      address,
      name
    });
    return response.data;
  },

  generateScanReport: async (scanId: string, format: string = 'pdf'): Promise<{ message: string; report: any }> => {
    const response = await api.post(`/rapid7/scans/${scanId}/report/`, {
      report_format: format
    });
    return response.data;
  },

  getVulnerabilityCategories: async (): Promise<any[]> => {
    const response = await api.get('/rapid7/vulnerabilities/categories/');
    return response.data;
  },

  searchVulnerabilitiesBySeverity: async (severity: string = 'HIGH', appId?: string): Promise<Vulnerability[]> => {
    const response = await api.post('/rapid7/vulnerabilities/search-by-severity/', {
      severity,
      app_id: appId
    });
    return response.data;
  },

  getVulnerabilityDetails: async (vulnId: string): Promise<any> => {
    const response = await api.get(`/rapid7/vulnerabilities/${vulnId}/details/`);
    return response.data;
  },
};

// InsightVM API endpoints
export const insightVMAPI = {
  getDashboardStats: async (): Promise<any> => {
    const response = await api.get('/insightvm/dashboard/stats');
    return response.data;
  },

  getVulnerabilitiesSummary: async (page: number = 0, size: number = 100, severity?: string): Promise<any> => {
    const params = new URLSearchParams({
      page: page.toString(),
      size: size.toString(),
    });
    if (severity) params.append('severity', severity);
    
    const response = await api.get(`/insightvm/vulnerabilities/summary?${params}`);
    return response.data;
  },

  getSitesOverview: async (page: number = 0, size: number = 100): Promise<any> => {
    const params = new URLSearchParams({
      page: page.toString(),
      size: size.toString(),
    });
    
    const response = await api.get(`/insightvm/sites/overview?${params}`);
    return response.data;
  },

  getAssetsWithVulnerabilities: async (page: number = 0, size: number = 100, severityFilter?: string): Promise<any> => {
    const params = new URLSearchParams({
      page: page.toString(),
      size: size.toString(),
    });
    if (severityFilter) params.append('severity_filter', severityFilter);
    
    const response = await api.get(`/insightvm/assets/vulnerabilities?${params}`);
    return response.data;
  },

  getVulnerabilityTrends: async (days: number = 30): Promise<any> => {
    const response = await api.get(`/insightvm/vulnerability-trends?days=${days}`);
    return response.data;
  },

  startSiteScan: async (siteId: number, scanName?: string): Promise<any> => {
    const response = await api.post(`/insightvm/sites/${siteId}/scan`, {
      scan_name: scanName
    });
    return response.data;
  },

  getActiveScans: async (): Promise<any> => {
    const response = await api.get('/insightvm/scans/active');
    return response.data;
  },

  getAvailableReports: async (): Promise<any> => {
    const response = await api.get('/insightvm/reports/available');
    return response.data;
  },

  syncVulnerabilities: async (assetIp?: string, syncAll: boolean = false): Promise<any> => {
    const response = await api.post('/insightvm/sync/vulnerabilities', {
      asset_ip: assetIp,
      sync_all: syncAll
    });
    return response.data;
  },

  syncAssets: async (siteId?: number, syncAll: boolean = false): Promise<any> => {
    const response = await api.post('/insightvm/sync/assets', {
      site_id: siteId,
      sync_all: syncAll
    });
    return response.data;
  },

  getAssetVulnerabilities: async (assetId: number): Promise<any> => {
    const response = await api.get(`/insightvm/assets/${assetId}/vulnerabilities`);
    return response.data;
  },

  testConnection: async (): Promise<any> => {
    const response = await api.get('/insightvm/test-connection');
    return response.data;
  },
  
  getScans: async (page: number = 0, size: number = 100, active?: boolean): Promise<any> => {
    const params = new URLSearchParams({
      page: page.toString(),
      size: size.toString(),
    });
    if (active !== undefined) params.append('active', active.toString());
    
    const response = await api.get(`/insightvm/scans/?${params}`);
    return response.data;
  },
  
  getAssets: async (page: number = 0, size: number = 100): Promise<any> => {
    const params = new URLSearchParams({
      page: page.toString(),
      size: size.toString(),
    });
    
    const response = await api.get(`/insightvm/assets/?${params}`);
    return response.data;
  },
  
  getVulnerabilities: async (page: number = 0, size: number = 100, severity?: string): Promise<any> => {
    const params = new URLSearchParams({
      page: page.toString(),
      size: size.toString(),
    });
    if (severity) params.append('severity', severity);
    
    const response = await api.get(`/insightvm/vulnerabilities/?${params}`);
    return response.data;
  },
  
  getAssessedAssets: async (page: number = 0, size: number = 100): Promise<any> => {
    const params = new URLSearchParams({
      page: page.toString(),
      size: size.toString(),
    });
    
    console.log('Making API call to:', `/insightvm/assets/assessed?${params}`);
    const response = await api.get(`/insightvm/assets/assessed?${params}`);
    console.log('API response:', response.data);
    return response.data;
  },
  
  getReports: async (page: number = 0, size: number = 100): Promise<any> => {
    const params = new URLSearchParams({
      page: page.toString(),
      size: size.toString(),
    });
    
    const response = await api.get(`/insightvm/reports?${params}`);
    return response.data;
  },
  
  getReportHistory: async (reportId: number, page: number = 0, size: number = 100): Promise<any> => {
    const params = new URLSearchParams({
      page: page.toString(),
      size: size.toString(),
    });
    
    const response = await api.get(`/insightvm/reports/${reportId}/history?${params}`);
    return response.data;
  },
  
  generateReport: async (reportId: number, reportName?: string, reportFormat: string = 'pdf'): Promise<any> => {
    const response = await api.post(`/insightvm/reports/${reportId}/generate`, {
      report_name: reportName,
      report_format: reportFormat
    });
    return response.data;
  },
  
  getReportTemplates: async (page: number = 0, size: number = 100): Promise<any> => {
    const params = new URLSearchParams({
      page: page.toString(),
      size: size.toString(),
    });
    
    const response = await api.get(`/insightvm/reports/${1}/templates?${params}`);
    return response.data;
  },
};

export default api;