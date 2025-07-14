import requests
from typing import List, Dict, Optional
from config import settings
import logging

logger = logging.getLogger(__name__)

class Rapid7Client:
    def __init__(self):
        self.base_url = settings.rapid7_base_url
        self.api_key = settings.rapid7_api_key
        self.headers = {
            "X-Api-Key": self.api_key,
            "Content-Type": "application/json"
        }
    
    def _make_request(self, method: str, endpoint: str, data: Optional[Dict] = None) -> Dict:
        url = f"{self.base_url}/{endpoint}"
        try:
            response = requests.request(method, url, headers=self.headers, json=data)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            logger.error(f"Rapid7 API request failed: {e}")
            raise Exception(f"Rapid7 API error: {str(e)}")
    
    def get_sites(self) -> List[Dict]:
        return self._make_request("GET", "api/3/sites")
    
    def get_site_assets(self, site_id: int) -> List[Dict]:
        return self._make_request("GET", f"api/3/sites/{site_id}/assets")
    
    def get_asset_vulnerabilities(self, asset_id: int) -> List[Dict]:
        return self._make_request("GET", f"api/3/assets/{asset_id}/vulnerabilities")
    
    def search_assets_by_ip(self, ip_address: str) -> List[Dict]:
        search_criteria = {
            "match": "all",
            "filters": [
                {
                    "field": "ip-address",
                    "operator": "is",
                    "value": ip_address
                }
            ]
        }
        return self._make_request("POST", "api/3/assets/search", search_criteria)
    
    def start_asset_scan(self, site_id: int, asset_ids: List[int]) -> Dict:
        scan_config = {
            "name": f"Asset Scan - {len(asset_ids)} assets",
            "assets": {
                "includedAssets": {
                    "assets": asset_ids
                }
            }
        }
        return self._make_request("POST", f"api/3/sites/{site_id}/scans", scan_config)
    
    def get_scan_status(self, scan_id: int) -> Dict:
        return self._make_request("GET", f"api/3/scans/{scan_id}")
    
    def get_vulnerability_details(self, vuln_id: str) -> Dict:
        return self._make_request("GET", f"api/3/vulnerabilities/{vuln_id}")

rapid7_client = Rapid7Client()