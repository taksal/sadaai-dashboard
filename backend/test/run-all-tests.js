/**
 * Test Runner - Runs all test scripts sequentially
 *
 * Usage: node backend/test/run-all-tests.js
 */

const { execSync } = require('child_process');
const path = require('path');

const tests = [
  {
    name: 'Quick Health Check',
    file: 'quick-health-check.js',
    description: 'Verify all critical endpoints are accessible',
    critical: true,
  },
  {
    name: 'Vapi Functions Test',
    file: 'test-vapi-functions.js',
    description: 'Test all 5 Vapi calendar webhook functions',
    critical: true,
  },
  {
    name: 'Timezone Handling Test',
    file: 'test-timezone-handling.js',
    description: 'Test Sydney timezone conversion (AEDT/AEST)',
    critical: true,
  },
];

function runTest(test) {
  console.log('\n' + '='.repeat(80));
  console.log(`🧪 Running: ${test.name}`);
  console.log(`📝 Description: ${test.description}`);
  console.log('='.repeat(80));

  const testPath = path.join(__dirname, test.file);

  try {
    execSync(`node "${testPath}"`, {
      stdio: 'inherit',
      cwd: process.cwd(),
    });
    console.log(`\n✅ ${test.name} - PASSED\n`);
    return { name: test.name, passed: true, critical: test.critical };
  } catch (error) {
    console.log(`\n❌ ${test.name} - FAILED\n`);
    return { name: test.name, passed: false, critical: test.critical };
  }
}

async function runAllTests() {
  console.log('\n');
  console.log('🚀 RUNNING ALL TESTS');
  console.log('='.repeat(80));
  console.log('\n');

  const startTime = Date.now();
  const results = [];

  for (const test of tests) {
    const result = runTest(test);
    results.push(result);

    // Stop if critical test fails
    if (test.critical && !result.passed) {
      console.log(`\n⚠️  Critical test "${test.name}" failed. Stopping test run.\n`);
      break;
    }

    // Wait between tests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  const duration = Math.round((Date.now() - startTime) / 1000);

  // Final Summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 FINAL TEST SUMMARY');
  console.log('='.repeat(80));
  console.log('\n');

  results.forEach(result => {
    const icon = result.passed ? '✅' : '❌';
    const critical = result.critical ? '🔴 CRITICAL' : '';
    console.log(`${icon} ${result.name} ${critical}`);
  });

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const criticalFailed = results.filter(r => !r.passed && r.critical).length;

  console.log('\n');
  console.log(`Total Tests Run: ${results.length} / ${tests.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⏱️  Total Duration: ${duration}s`);
  console.log('\n');

  if (criticalFailed > 0) {
    console.log('❌ CRITICAL TESTS FAILED - System is not ready for production');
  } else if (failed === 0) {
    console.log('🎉 ALL TESTS PASSED - System is healthy and ready!');
  } else {
    console.log('⚠️  Some non-critical tests failed - Review before production');
  }

  console.log('\n');
  console.log('='.repeat(80));
  console.log('\n');

  process.exit(failed === 0 ? 0 : 1);
}

// Run all tests
runAllTests().catch(error => {
  console.error('💥 Fatal Error:', error);
  process.exit(1);
});
