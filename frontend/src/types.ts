export interface Team {
  id: number;
  name: string;
  description?: string;
  created_at: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  full_name?: string;
  is_active: boolean;
  is_admin: boolean;
  team_id?: number;
  created_at: string;
  team?: Team;
}

export interface Asset {
  id: number;
  name: string;
  ip_address: string;
  os_version?: string;
  team_id: number;
  owner_id?: number;
  created_at: string;
  updated_at?: string;
  team?: Team;
  owner?: User;
}

export interface Service {
  id: number;
  asset_id: number;
  service_name: string;
  port?: number;
  version?: string;
  protocol: string;
  created_at: string;
}

export interface Vulnerability {
  id: number;
  asset_id: number;
  rapid7_vuln_id?: string;
  title: string;
  description?: string;
  severity: string;
  cvss_score?: string;
  status: string;
  discovered_date?: string;
  last_seen?: string;
  created_at: string;
}

export interface Scan {
  id: number;
  asset_id: number;
  initiated_by: number;
  scan_type: string;
  status: string;
  rapid7_scan_id?: string;
  scan_date: string;
  completed_date?: string;
  results?: string;
}

export interface AuthToken {
  access_token: string;
  token_type: string;
}