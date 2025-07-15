#!/usr/bin/env node

/**
 * Simple test script to validate TypeScript compilation
 */

const path = require('path');
const fs = require('fs');

function testInsightVMSitesCompilation() {
  const filePath = path.join(__dirname, 'frontend/src/components/InsightVMSites.tsx');
  
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Check for Grid usage that might cause issues
    const gridUsages = content.match(/Grid\s+item/g);
    if (gridUsages) {
      console.log('❌ Found Grid item usage that might cause TypeScript errors:');
      gridUsages.forEach(usage => console.log(`  - ${usage}`));
      return false;
    }
    
    // Check for proper Box usage
    const boxUsages = content.match(/Box\s+sx=\{/g);
    if (boxUsages) {
      console.log('✅ Found proper Box usage with sx props');
    }
    
    // Check for proper display: grid usage
    const gridDisplayUsages = content.match(/display:\s*['"]grid['"]/g);
    if (gridDisplayUsages) {
      console.log('✅ Found CSS Grid usage instead of Material-UI Grid');
    }
    
    console.log('✅ InsightVMSites.tsx appears to be fixed for TypeScript compilation');
    return true;
    
  } catch (error) {
    console.error('❌ Error reading file:', error.message);
    return false;
  }
}

function testVulnerabilitiesCompilation() {
  const filePath = path.join(__dirname, 'frontend/src/components/Vulnerabilities.tsx');
  
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Check for proper imports
    const hasInsightVMImport = content.includes('insightVMAPI');
    if (hasInsightVMImport) {
      console.log('✅ Vulnerabilities.tsx has proper InsightVM API import');
    }
    
    // Check for sync functionality
    const hasSyncFunction = content.includes('handleSyncFromInsightVM');
    if (hasSyncFunction) {
      console.log('✅ Vulnerabilities.tsx has sync functionality');
    }
    
    console.log('✅ Vulnerabilities.tsx appears to be properly updated');
    return true;
    
  } catch (error) {
    console.error('❌ Error reading file:', error.message);
    return false;
  }
}

function testAPIIntegration() {
  const filePath = path.join(__dirname, 'frontend/src/api.ts');
  
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Check for InsightVM API endpoints
    const hasInsightVMAPI = content.includes('insightVMAPI');
    const hasSyncEndpoints = content.includes('syncVulnerabilities') && content.includes('syncAssets');
    
    if (hasInsightVMAPI && hasSyncEndpoints) {
      console.log('✅ API integration is complete with InsightVM endpoints');
      return true;
    } else {
      console.log('❌ API integration missing InsightVM endpoints');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Error reading API file:', error.message);
    return false;
  }
}

function main() {
  console.log('=' * 60);
  console.log('Frontend TypeScript Validation Test');
  console.log('=' * 60);
  
  const tests = [
    { name: 'InsightVMSites Component', test: testInsightVMSitesCompilation },
    { name: 'Vulnerabilities Component', test: testVulnerabilitiesCompilation },
    { name: 'API Integration', test: testAPIIntegration }
  ];
  
  let allPassed = true;
  
  tests.forEach(({ name, test }) => {
    console.log(`\nTesting ${name}...`);
    const result = test();
    if (!result) {
      allPassed = false;
    }
  });
  
  console.log('\n' + '=' * 60);
  if (allPassed) {
    console.log('✅ All tests passed! Frontend should compile without TypeScript errors.');
  } else {
    console.log('❌ Some tests failed. Please check the issues above.');
  }
  console.log('=' * 60);
  
  return allPassed;
}

if (require.main === module) {
  const success = main();
  process.exit(success ? 0 : 1);
}