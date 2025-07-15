#!/usr/bin/env python3
"""
Test script to verify InsightVM integration
"""

import sys
import os
import json

# Add the backend directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

try:
    from backend.insightvm_client import InsightVMClient
    from backend.config import settings
    
    def test_insightvm_connection():
        """Test basic connection to InsightVM API"""
        print("Testing InsightVM Connection...")
        print(f"Base URL: {settings.rapid7_insightvm_base_url}")
        print(f"Username configured: {'Yes' if settings.rapid7_insightvm_username else 'No'}")
        print(f"Password configured: {'Yes' if settings.rapid7_insightvm_password else 'No'}")
        
        if not settings.rapid7_insightvm_username or not settings.rapid7_insightvm_password:
            print("❌ InsightVM credentials not configured. Please set RAPID7_INSIGHTVM_USERNAME and RAPID7_INSIGHTVM_PASSWORD environment variables.")
            return False
        
        try:
            client = InsightVMClient()
            result = client.test_connection()
            
            if result.get('status') == 'connected':
                print("✅ InsightVM connection successful!")
                print(f"Server info: {json.dumps(result.get('server_info', {}), indent=2)}")
                return True
            else:
                print(f"❌ InsightVM connection failed: {result.get('message')}")
                return False
                
        except Exception as e:
            print(f"❌ Error testing InsightVM connection: {e}")
            return False
    
    def test_insightvm_endpoints():
        """Test various InsightVM endpoints"""
        print("\nTesting InsightVM Endpoints...")
        
        try:
            client = InsightVMClient()
            
            # Test getting sites
            print("Testing sites endpoint...")
            sites = client.get_sites(page=0, size=5)
            print(f"✅ Sites endpoint working. Found {sites.get('page', {}).get('totalResources', 0)} total sites")
            
            # Test getting assets
            print("Testing assets endpoint...")
            assets = client.get_assets(page=0, size=5)
            print(f"✅ Assets endpoint working. Found {assets.get('page', {}).get('totalResources', 0)} total assets")
            
            # Test getting vulnerabilities
            print("Testing vulnerabilities endpoint...")
            vulns = client.get_vulnerabilities(page=0, size=5)
            print(f"✅ Vulnerabilities endpoint working. Found {vulns.get('page', {}).get('totalResources', 0)} total vulnerabilities")
            
            # Test getting scans
            print("Testing scans endpoint...")
            scans = client.get_scans(page=0, size=5)
            print(f"✅ Scans endpoint working. Found {scans.get('page', {}).get('totalResources', 0)} total scans")
            
            return True
            
        except Exception as e:
            print(f"❌ Error testing endpoints: {e}")
            return False
    
    def main():
        """Main test function"""
        print("=" * 60)
        print("InsightVM Integration Test")
        print("=" * 60)
        
        # Test connection
        connection_ok = test_insightvm_connection()
        
        if connection_ok:
            # Test endpoints
            endpoints_ok = test_insightvm_endpoints()
            
            if endpoints_ok:
                print("\n✅ All InsightVM integration tests passed!")
                return True
            else:
                print("\n❌ Some endpoint tests failed.")
                return False
        else:
            print("\n❌ Connection test failed. Cannot proceed with endpoint tests.")
            return False
    
    if __name__ == "__main__":
        success = main()
        sys.exit(0 if success else 1)
        
except ImportError as e:
    print(f"❌ Import error: {e}")
    print("Make sure you're running this from the project root directory and all dependencies are installed.")
    sys.exit(1)
except Exception as e:
    print(f"❌ Unexpected error: {e}")
    sys.exit(1)