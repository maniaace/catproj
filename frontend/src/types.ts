export interface Team {
  id: number;
  name: string;
  description?: string;
  parent_team_id?: number;
  team_type: string; // main, sub, shared
  created_at: string;
  parent_team?: Team;
  sub_teams?: Team[];
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
  public_facing: boolean;
  team_id: number;
  owner_id?: number;
  last_reviewed_date?: string;
  created_at: string;
  updated_at?: string;
  team?: Team;
  owner?: User;
  // Environment categorization
  environment: string; // dev, uat, prod
  criticality: string; // low, medium, high, critical
  business_impact?: string;
  asset_type?: string;
  location?: string;
  compliance_requirements?: string;
}

export interface AssetStats {
  total: number;
  by_environment: Record<string, number>;
  by_criticality: Record<string, number>;
  by_type: Record<string, number>;
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

export interface ScanEngine {
  id: number;
  name: string;
  address: string;
  port: number;
  status: string;
}

export interface ScanTemplate {
  id: string;
  name: string;
  description?: string;
  checks: any[];
}

export interface ScanResult {
  id: number;
  status: string;
  engineId?: number;
  startTime?: string;
  endTime?: string;
  vulnerabilities?: number;
  assets?: number[];
}

export interface AssetGroup {
  id: number;
  name: string;
  description?: string;
  assetCount?: number;
  searchCriteria?: any;
}

export interface VulnerabilityExploit {
  id: number;
  title: string;
  description?: string;
  link?: string;
  source?: string;
}

export interface LogSearchResult {
  events: any[];
  statistics: {
    count: number;
    from: number;
    to: number;
  };
  leql: string;
}