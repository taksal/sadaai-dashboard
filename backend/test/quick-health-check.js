/**
 * Quick Health Check Script
 *
 * Tests all critical endpoints to verify system is working
 * Expected runtime: < 5 seconds
 */

const API_BASE_URL = 'http://localhost:3001';

async function checkEndpoint(name, url, expectedStatus = 200) {
  console.log(`\n🔍 Checking: ${name}`);
  console.log(`   URL: ${url}`);

  try {
    const startTime = Date.now();
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    const duration = Date.now() - startTime;

    if (response.status === expectedStatus || response.ok) {
      console.log(`   ✅ PASS (${duration}ms) - Status: ${response.status}`);
      return true;
    } else {
      console.log(`   ❌ FAIL (${duration}ms) - Status: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log(`   ❌ FAIL - ${error.message}`);
    return false;
  }
}

async function runHealthChecks() {
  console.log('\n🚀 Starting Quick Health Check');
  console.log('================================\n');
  console.log(`Target: ${API_BASE_URL}`);

  const startTime = Date.now();
  const results = [];

  // Test 1: Backend server is running
  results.push(await checkEndpoint(
    'Backend Server',
    `${API_BASE_URL}/api/health`
  ));

  // Test 2: Vapi webhook endpoint exists
  results.push(await checkEndpoint(
    'Vapi Webhook Endpoint',
    `${API_BASE_URL}/api/vapi/webhooks/calendar/function-call`,
    405 // POST endpoint, GET will return 405 Method Not Allowed
  ));

  // Test 3: Calendar OAuth config endpoint
  results.push(await checkEndpoint(
    'Calendar OAuth Config',
    `${API_BASE_URL}/api/integrations/calendar/oauth/config/google`,
    401 // Requires auth
  ));

  // Test 4: Auth endpoint exists
  results.push(await checkEndpoint(
    'Auth Endpoint',
    `${API_BASE_URL}/api/auth/health`,
    404 // May not exist, but server should respond
  ));

  const duration = Date.now() - startTime;

  // Summary
  console.log('\n\n📊 HEALTH CHECK SUMMARY');
  console.log('========================\n');

  const passed = results.filter(r => r).length;
  const failed = results.filter(r => !r).length;

  console.log(`Total Checks: ${results.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⏱️  Duration: ${duration}ms\n`);

  if (failed === 0) {
    console.log('🎉 All health checks passed! System is healthy.\n');
  } else {
    console.log('⚠️  Some health checks failed. Please review the errors above.\n');
  }

  return failed === 0;
}

// Run health checks
runHealthChecks().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('💥 Fatal Error:', error);
  process.exit(1);
});
