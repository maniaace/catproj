import requests
from typing import List, Dict, Optional, Any
from config import settings
import logging
from datetime import datetime, timedelta
import json

logger = logging.getLogger(__name__)

class Rapid7Client:
    def __init__(self):
        self.base_url = settings.rapid7_base_url
        self.log_search_url = settings.rapid7_log_search_url
        self.api_key = settings.rapid7_api_key
        self.headers = {
            "X-Api-Key": self.api_key,
            "Content-Type": "application/json"
        }
    
    def _make_request(self, method: str, endpoint: str, data: Optional[Dict] = None, timeout: int = 30) -> Dict:
        if not self.api_key:
            raise Exception("Rapid7 API key not configured")
            
        # For IAS API, construct URL with v1 version if not already included
        if endpoint.startswith('v1/'):
            url = f"{self.base_url}/{endpoint}"
        else:
            url = f"{self.base_url}/v1/{endpoint}"
        
        try:
            response = requests.request(
                method, 
                url, 
                headers=self.headers, 
                json=data, 
                timeout=timeout
            )
            
            if response.status_code == 401:
                raise Exception("Invalid Rapid7 API key or unauthorized access")
            elif response.status_code == 403:
                raise Exception("Insufficient permissions for this Rapid7 API operation")
            elif response.status_code == 404:
                raise Exception("Rapid7 resource not found")
            elif response.status_code == 429:
                raise Exception("Rapid7 API rate limit exceeded. Please try again later")
            elif response.status_code >= 500:
                raise Exception(f"Rapid7 API server error: {response.status_code}")
                
            response.raise_for_status()
            
            if response.content:
                return response.json()
            else:
                return {"message": "Operation completed successfully"}
                
        except requests.exceptions.Timeout:
            logger.error(f"Rapid7 API request timed out for {endpoint}")
            raise Exception("Rapid7 API request timed out")
        except requests.exceptions.ConnectionError:
            logger.error(f"Failed to connect to Rapid7 API for {endpoint}")
            raise Exception("Failed to connect to Rapid7 API")
        except requests.exceptions.RequestException as e:
            logger.error(f"Rapid7 API request failed for {endpoint}: {e}")
            raise Exception(f"Rapid7 API error: {str(e)}")
        except ValueError as e:
            logger.error(f"Invalid JSON response from Rapid7 API for {endpoint}: {e}")
            raise Exception("Invalid response format from Rapid7 API")
    
    def get_apps(self) -> List[Dict]:
        """Get all applications in InsightAppSec"""
        response = self._make_request("GET", "apps")
        return response.get("data", [])
    
    def create_app(self, name: str, description: str = None) -> Dict:
        """Create a new application"""
        app_data = {
            "name": name,
            "description": description or f"Application created on {datetime.now().strftime('%Y-%m-%d')}"
        }
        return self._make_request("POST", "apps", app_data)
    
    def get_app_vulnerabilities(self, app_id: str) -> List[Dict]:
        """Get vulnerabilities for a specific application"""
        response = self._make_request("GET", f"apps/{app_id}/vulnerabilities")
        return response.get("data", [])
    
    def get_scans(self, app_id: str = None) -> List[Dict]:
        """Get scans, optionally filtered by application"""
        if app_id:
            response = self._make_request("GET", f"apps/{app_id}/scans")
        else:
            response = self._make_request("GET", "scans")
        return response.get("data", [])
    
    def create_scan_config(self, app_id: str, name: str, attack_template_id: str = None) -> Dict:
        """Create a scan configuration for an application"""
        scan_config = {
            "name": name,
            "app": {"id": app_id}
        }
        if attack_template_id:
            scan_config["attack_template"] = {"id": attack_template_id}
            
        return self._make_request("POST", "scan-configs", scan_config)
    
    def start_scan(self, scan_config_id: str) -> Dict:
        """Start a scan using a scan configuration"""
        scan_data = {
            "scan_config": {"id": scan_config_id}
        }
        return self._make_request("POST", "scans", scan_data)
    
    def get_scan_status(self, scan_id: str) -> Dict:
        """Get the status of a specific scan"""
        return self._make_request("GET", f"scans/{scan_id}")
    
    def get_vulnerability_details(self, vuln_id: str) -> Dict:
        """Get details for a specific vulnerability"""
        return self._make_request("GET", f"vulnerabilities/{vuln_id}")
    
    def get_attack_templates(self) -> List[Dict]:
        """Get available attack templates"""
        response = self._make_request("GET", "attack-templates")
        return response.get("data", [])
    
    def get_scan_configs(self, app_id: str = None) -> List[Dict]:
        """Get scan configurations, optionally filtered by application"""
        if app_id:
            response = self._make_request("GET", f"apps/{app_id}/scan-configs")
        else:
            response = self._make_request("GET", "scan-configs")
        return response.get("data", [])
    
    def create_target(self, app_id: str, address: str, name: str = None) -> Dict:
        """Create a target for an application"""
        target_data = {
            "app": {"id": app_id},
            "address": address,
            "name": name or f"Target for {address}"
        }
        return self._make_request("POST", "targets", target_data)
    
    def pause_scan(self, scan_id: str) -> Dict:
        """Pause a running scan"""
        return self._make_request("POST", f"scans/{scan_id}/pause")
    
    def resume_scan(self, scan_id: str) -> Dict:
        """Resume a paused scan"""
        return self._make_request("POST", f"scans/{scan_id}/resume")
    
    def stop_scan(self, scan_id: str) -> Dict:
        """Stop a running scan"""
        return self._make_request("POST", f"scans/{scan_id}/stop")
    
    def get_app_scan_history(self, app_id: str) -> List[Dict]:
        """Get scan history for an application"""
        response = self._make_request("GET", f"apps/{app_id}/scans")
        return response.get("data", [])
    
    def get_exploitable_vulnerabilities(self, app_id: str = None) -> List[Dict]:
        """Get vulnerabilities that are exploitable, optionally filtered by application"""
        if app_id:
            response = self._make_request("GET", f"apps/{app_id}/vulnerabilities")
        else:
            response = self._make_request("GET", "vulnerabilities")
        
        vulnerabilities = response.get("data", [])
        # Filter for exploitable vulnerabilities (those with high severity or known exploits)
        exploitable = [v for v in vulnerabilities if v.get("severity", "").lower() in ["high", "critical"]]
        return exploitable
    
    def get_vulnerability_exploits(self, vuln_id: str) -> List[Dict]:
        """Get exploit information for a vulnerability"""
        vuln_details = self._make_request("GET", f"vulnerabilities/{vuln_id}")
        # Extract exploit information from vulnerability details
        exploits = vuln_details.get("exploits", [])
        return exploits
    
    def validate_vulnerability(self, vuln_id: str, validation_status: str) -> Dict:
        """Update vulnerability validation status"""
        validation_data = {
            "status": validation_status,
            "comment": f"Validated via API on {datetime.now().isoformat()}"
        }
        return self._make_request("PUT", f"vulnerabilities/{vuln_id}/validation", validation_data)
    
    def search_logs(self, query: str, time_range: str = "1h", log_sets: List[str] = None) -> Dict:
        if not self.log_search_url:
            raise Exception("Log search URL not configured")
            
        search_payload = {
            "leql": query,
            "time_range": time_range
        }
        
        if log_sets:
            search_payload["logs"] = log_sets
            
        try:
            response = requests.post(
                self.log_search_url,
                headers=self.headers,
                json=search_payload,
                timeout=30
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            logger.error(f"Log search request failed: {e}")
            raise Exception(f"Log search error: {str(e)}")
    
    def get_schedules(self, app_id: str = None) -> List[Dict]:
        """Get scheduled scans, optionally filtered by application"""
        if app_id:
            response = self._make_request("GET", f"apps/{app_id}/schedules")
        else:
            response = self._make_request("GET", "schedules")
        return response.get("data", [])
    
    def create_schedule(self, scan_config_id: str, schedule_data: Dict) -> Dict:
        """Create a scan schedule"""
        schedule = {
            "scan_config": {"id": scan_config_id},
            **schedule_data
        }
        return self._make_request("POST", "schedules", schedule)
    
    def get_scan_reports(self, scan_id: str) -> List[Dict]:
        """Get reports for a specific scan"""
        response = self._make_request("GET", f"scans/{scan_id}/reports")
        return response.get("data", [])
    
    def generate_scan_report(self, scan_id: str, report_format: str = "pdf") -> Dict:
        """Generate a scan report"""
        report_config = {
            "scan": {"id": scan_id},
            "format": report_format,
            "name": f"Scan Report - {scan_id} - {datetime.now().strftime('%Y%m%d_%H%M%S')}"
        }
        return self._make_request("POST", "reports", report_config)
    
    def get_vulnerability_categories(self) -> List[Dict]:
        """Get available vulnerability categories"""
        response = self._make_request("GET", "vulnerability-categories")
        return response.get("data", [])
    
    def search_vulnerabilities_by_severity(self, severity: str = "HIGH", app_id: str = None) -> List[Dict]:
        """Search vulnerabilities by severity level"""
        if app_id:
            response = self._make_request("GET", f"apps/{app_id}/vulnerabilities")
        else:
            response = self._make_request("GET", "vulnerabilities")
            
        vulnerabilities = response.get("data", [])
        # Filter by severity
        filtered = [v for v in vulnerabilities if v.get("severity", "").upper() == severity.upper()]
        return filtered
    
    def get_targets(self, app_id: str = None) -> List[Dict]:
        """Get targets, optionally filtered by application"""
        if app_id:
            response = self._make_request("GET", f"apps/{app_id}/targets")
        else:
            response = self._make_request("GET", "targets")
        return response.get("data", [])
    
    def create_blackout(self, name: str, start_time: str, end_time: str, app_ids: List[str] = None) -> Dict:
        """Create a blackout period"""
        blackout_data = {
            "name": name,
            "start_time": start_time,
            "end_time": end_time
        }
        if app_ids:
            blackout_data["apps"] = [{"id": app_id} for app_id in app_ids]
            
        return self._make_request("POST", "blackouts", blackout_data)

rapid7_client = Rapid7Client()