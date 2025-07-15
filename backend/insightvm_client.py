import requests
import base64
from typing import List, Dict, Optional, Any
from config import settings
import logging
from datetime import datetime, timedelta
import json
import urllib3
from urllib.parse import urlencode

# Disable SSL warnings for self-signed certificates
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

logger = logging.getLogger(__name__)

class InsightVMClient:
    """
    Rapid7 InsightVM API Client
    Documentation: https://help.rapid7.com/insightvm/en-us/api/index.html
    """
    
    def __init__(self):
        self.base_url = settings.rapid7_insightvm_base_url
        self.username = settings.rapid7_insightvm_username
        self.password = settings.rapid7_insightvm_password
        
        if not self.username or not self.password:
            raise Exception("InsightVM credentials not configured. Set RAPID7_INSIGHTVM_USERNAME and RAPID7_INSIGHTVM_PASSWORD environment variables.")
        
        # Create basic auth header
        credentials = f"{self.username}:{self.password}"
        encoded_credentials = base64.b64encode(credentials.encode()).decode()
        
        self.headers = {
            "Authorization": f"Basic {encoded_credentials}",
            "Content-Type": "application/json",
            "Accept": "application/json"
        }
    
    def _make_request(self, method: str, endpoint: str, params: Optional[Dict] = None, data: Optional[Dict] = None, timeout: int = 30) -> Dict:
        """Make HTTP request to InsightVM API"""
        url = f"{self.base_url}/{endpoint.lstrip('/')}"
        
        # Add query parameters if provided
        if params:
            url += f"?{urlencode(params)}"
        
        try:
            response = requests.request(
                method, 
                url, 
                headers=self.headers, 
                json=data if data else None,
                timeout=timeout,
                verify=False  # Disable SSL verification for internal endpoints
            )
            
            # Handle different response codes
            if response.status_code == 401:
                return {"error": "Invalid InsightVM credentials or unauthorized access"}
            elif response.status_code == 403:
                return {"error": "Insufficient permissions for this InsightVM operation"}
            elif response.status_code == 404:
                return {"error": "InsightVM resource not found"}
            elif response.status_code == 422:
                error_detail = "Invalid request parameters"
                try:
                    error_json = response.json()
                    error_detail = error_json.get("message", error_detail)
                    logger.error(f"InsightVM 422 error details: {error_json}")
                except:
                    pass
                logger.error(f"InsightVM 422 error for {method} {endpoint}: {error_detail}")
                return {"error": f"InsightVM API 422 error: {error_detail}"}
            elif response.status_code == 429:
                return {"error": "InsightVM API rate limit exceeded. Please try again later"}
            elif response.status_code >= 500:
                return {"error": f"InsightVM API server error: {response.status_code}"}
                
            try:
                response.raise_for_status()
            except requests.exceptions.HTTPError as e:
                return {"error": f"InsightVM API HTTP error: {e}"}
            
            if response.content:
                try:
                    return response.json()
                except json.JSONDecodeError:
                    return {"raw_response": response.text}
            else:
                return {"message": "Operation completed successfully"}
                
        except requests.exceptions.Timeout:
            logger.error(f"InsightVM API request timed out for {endpoint}")
            return {"error": "InsightVM API request timed out"}
        except requests.exceptions.ConnectionError:
            logger.error(f"Failed to connect to InsightVM API for {endpoint}")
            return {"error": "Failed to connect to InsightVM API"}
        except requests.exceptions.RequestException as e:
            logger.error(f"InsightVM API request failed for {endpoint}: {e}")
            return {"error": f"InsightVM API error: {str(e)}"}
    
    def test_connection(self) -> Dict:
        """Test connectivity to InsightVM API"""
        try:
            response = self._make_request("GET", "administration/info")
            return {
                "status": "connected",
                "message": "Successfully connected to InsightVM",
                "server_info": response
            }
        except Exception as e:
            return {
                "status": "failed",
                "message": f"Failed to connect to InsightVM: {str(e)}"
            }
    
    # Asset Management APIs
    def get_assets(self, page: int = 0, size: int = 500, filters: Optional[Dict] = None) -> Dict:
        """Get assets from InsightVM"""
        params = {"page": page, "size": size}
        if filters:
            params.update(filters)
        return self._make_request("GET", "assets", params=params)
    
    def get_assessed_assets(self, page: int = 0, size: int = 500) -> Dict:
        """Get assessed assets from InsightVM (assets that have been scanned/assessed)"""
        try:
            # First try to get all assets and filter for those with scan dates
            params = {"page": page, "size": size}
            assets_response = self._make_request("GET", "assets", params=params)
            
            # If the basic assets call fails, try the search method
            if assets_response.get("error"):
                logger.warning(f"Basic assets call failed: {assets_response.get('error')}, trying search method")
                search_data = {
                    "match": "all",
                    "filters": [
                        {
                            "field": "last-scan-date",
                            "operator": "is-not-empty"
                        }
                    ]
                }
                params = {"page": page, "size": size}
                return self._make_request("POST", "assets/search", params=params, data=search_data)
            
            return assets_response
            
        except Exception as e:
            logger.error(f"Failed to get assessed assets: {e}")
            return {"error": f"Failed to get assessed assets: {str(e)}"}
    
    def get_asset(self, asset_id: int) -> Dict:
        """Get specific asset details"""
        return self._make_request("GET", f"assets/{asset_id}")
    
    def search_assets(self, query: str, page: int = 0, size: int = 500) -> Dict:
        """Search assets using query"""
        search_data = {
            "match": "all",
            "filters": [
                {
                    "field": "ip-address",
                    "operator": "contains",
                    "value": query
                }
            ]
        }
        params = {"page": page, "size": size}
        return self._make_request("POST", "assets/search", params=params, data=search_data)
    
    def search_assets_by_ip(self, ip_address: str) -> Dict:
        """Search assets by IP address"""
        search_data = {
            "match": "all",
            "filters": [
                {
                    "field": "ip-address",
                    "operator": "is",
                    "value": ip_address
                }
            ]
        }
        return self._make_request("POST", "assets/search", data=search_data)
    
    # Site Management APIs
    def get_sites(self, page: int = 0, size: int = 500) -> Dict:
        """Get all sites"""
        params = {"page": page, "size": size}
        return self._make_request("GET", "sites", params=params)
    
    def get_site(self, site_id: int) -> Dict:
        """Get specific site details"""
        return self._make_request("GET", f"sites/{site_id}")
    
    def get_site_assets(self, site_id: int, page: int = 0, size: int = 500) -> Dict:
        """Get assets for a specific site"""
        params = {"page": page, "size": size}
        return self._make_request("GET", f"sites/{site_id}/assets", params=params)
    
    # Scan Management APIs
    def get_scans(self, page: int = 0, size: int = 500, active: Optional[bool] = None) -> Dict:
        """Get scans"""
        params = {"page": page, "size": size}
        if active is not None:
            params["active"] = str(active).lower()
        return self._make_request("GET", "scans", params=params)
    
    def get_scan(self, scan_id: int) -> Dict:
        """Get specific scan details"""
        return self._make_request("GET", f"scans/{scan_id}")
    
    def start_site_scan(self, site_id: int, scan_name: Optional[str] = None) -> Dict:
        """Start a scan for a site"""
        scan_data = {
            "name": scan_name or f"Scan_{site_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            "engineId": None  # Use default scan engine
        }
        return self._make_request("POST", f"sites/{site_id}/scans", data=scan_data)
    
    def start_asset_scan(self, site_id: int, asset_ids: List[int], scan_name: Optional[str] = None) -> Dict:
        """Start a scan for specific assets"""
        scan_data = {
            "name": scan_name or f"Asset_Scan_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            "assets": asset_ids
        }
        return self._make_request("POST", f"sites/{site_id}/scans", data=scan_data)
    
    def pause_scan(self, scan_id: int) -> Dict:
        """Pause a running scan"""
        return self._make_request("POST", f"scans/{scan_id}/pause")
    
    def resume_scan(self, scan_id: int) -> Dict:
        """Resume a paused scan"""
        return self._make_request("POST", f"scans/{scan_id}/resume")
    
    def stop_scan(self, scan_id: int) -> Dict:
        """Stop a running scan"""
        return self._make_request("POST", f"scans/{scan_id}/stop")
    
    # Vulnerability Management APIs
    def get_vulnerabilities(self, page: int = 0, size: int = 500, severity: Optional[str] = None) -> Dict:
        """Get vulnerabilities"""
        params = {"page": page, "size": size}
        if severity:
            params["severity"] = severity
        return self._make_request("GET", "vulnerabilities", params=params)
    
    def get_vulnerability(self, vuln_id: str) -> Dict:
        """Get specific vulnerability details"""
        return self._make_request("GET", f"vulnerabilities/{vuln_id}")
    
    def get_asset_vulnerabilities(self, asset_id: int, page: int = 0, size: int = 500) -> Dict:
        """Get vulnerabilities for a specific asset"""
        params = {"page": page, "size": size}
        return self._make_request("GET", f"assets/{asset_id}/vulnerabilities", params=params)
    
    def search_vulnerabilities_by_severity(self, severity: str = "critical", page: int = 0, size: int = 500) -> Dict:
        """Search vulnerabilities by severity level"""
        search_data = {
            "match": "all",
            "filters": [
                {
                    "field": "severity",
                    "operator": "is",
                    "value": severity.lower()
                }
            ]
        }
        params = {"page": page, "size": size}
        return self._make_request("POST", "vulnerabilities/search", params=params, data=search_data)
    
    def get_exploitable_vulnerabilities(self, page: int = 0, size: int = 500) -> Dict:
        """Get vulnerabilities with known exploits"""
        search_data = {
            "match": "all",
            "filters": [
                {
                    "field": "exploits",
                    "operator": "is-greater-than",
                    "value": 0
                }
            ]
        }
        params = {"page": page, "size": size}
        return self._make_request("POST", "vulnerabilities/search", params=params, data=search_data)
    
    # Reporting APIs
    def get_reports(self, page: int = 0, size: int = 500) -> Dict:
        """Get available reports"""
        params = {"page": page, "size": size}
        return self._make_request("GET", "reports", params=params)
    
    def get_report_instances(self, report_id: int, page: int = 0, size: int = 500) -> Dict:
        """Get instances of a specific report"""
        params = {"page": page, "size": size}
        return self._make_request("GET", f"reports/{report_id}/history", params=params)
    
    def get_report_details(self, report_id: int) -> Dict:
        """Get details of a specific report"""
        return self._make_request("GET", f"reports/{report_id}")
    
    def generate_report(self, report_id: int, name: str = None, format: str = "pdf") -> Dict:
        """Generate a report instance"""
        data = {
            "name": name or f"Report_{report_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            "format": format
        }
        return self._make_request("POST", f"reports/{report_id}/generate", data=data)
    
    def get_report_status(self, report_id: int, instance_id: str) -> Dict:
        """Get status of a report instance"""
        return self._make_request("GET", f"reports/{report_id}/history/{instance_id}")
    
    def download_report(self, report_id: int, instance_id: str) -> Dict:
        """Download a completed report"""
        return self._make_request("GET", f"reports/{report_id}/history/{instance_id}/output")
    
    def get_report_templates(self, page: int = 0, size: int = 500) -> Dict:
        """Get available report templates"""
        params = {"page": page, "size": size}
        return self._make_request("GET", "report_templates", params=params)
    
    def generate_report(self, template_id: str, scope: Dict, name: Optional[str] = None) -> Dict:
        """Generate a report"""
        report_data = {
            "name": name or f"Report_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            "template": template_id,
            "scope": scope,
            "format": "pdf"
        }
        return self._make_request("POST", "reports", data=report_data)
    
    # Discovery APIs
    def get_discovery_connections(self, page: int = 0, size: int = 500) -> Dict:
        """Get discovery connections"""
        params = {"page": page, "size": size}
        return self._make_request("GET", "discovery_connections", params=params)
    
    def create_discovery_connection(self, name: str, address: str, port: int = 22, credentials: Dict = None) -> Dict:
        """Create a discovery connection"""
        connection_data = {
            "name": name,
            "address": address,
            "port": port
        }
        if credentials:
            connection_data["credentials"] = credentials
        return self._make_request("POST", "discovery_connections", data=connection_data)
    
    # Asset Group APIs
    def get_asset_groups(self, page: int = 0, size: int = 500) -> Dict:
        """Get asset groups"""
        params = {"page": page, "size": size}
        return self._make_request("GET", "asset_groups", params=params)
    
    def get_asset_group(self, group_id: int) -> Dict:
        """Get specific asset group"""
        return self._make_request("GET", f"asset_groups/{group_id}")
    
    def create_asset_group(self, name: str, description: str = None, search_criteria: Dict = None) -> Dict:
        """Create asset group"""
        group_data = {
            "name": name,
            "description": description or f"Asset group created on {datetime.now().strftime('%Y-%m-%d')}",
            "type": "dynamic" if search_criteria else "static"
        }
        if search_criteria:
            group_data["searchCriteria"] = search_criteria
        return self._make_request("POST", "asset_groups", data=group_data)

# Create global instance
insightvm_client = InsightVMClient()