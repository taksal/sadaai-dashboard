/**
 * Test Suite Index
 *
 * Quick reference for all available test scripts
 */

console.log('\n📦 Available Test Scripts');
console.log('=========================\n');

const tests = [
  {
    name: 'Quick Health Check',
    file: 'quick-health-check.js',
    command: 'node backend/test/quick-health-check.js',
    description: 'Fast health check of all critical endpoints (< 5 seconds)',
    icon: '⚡',
  },
  {
    name: 'Vapi Functions Test',
    file: 'test-vapi-functions.js',
    command: 'node backend/test/test-vapi-functions.js',
    description: 'Comprehensive test of all 5 Vapi calendar functions (10 scenarios)',
    icon: '📞',
  },
  {
    name: 'Timezone Handling Test',
    file: 'test-timezone-handling.js',
    command: 'node backend/test/test-timezone-handling.js',
    description: 'Test Sydney timezone conversion and DST handling',
    icon: '🌏',
  },
  {
    name: 'Run All Tests',
    file: 'run-all-tests.js',
    command: 'node backend/test/run-all-tests.js',
    description: 'Run all tests sequentially with detailed summary',
    icon: '🚀',
  },
  {
    name: 'Cleanup Test Data',
    file: 'cleanup-test-data.js',
    command: 'node backend/test/cleanup-test-data.js',
    description: 'Remove test appointments from database and calendar',
    icon: '🧹',
  },
];

tests.forEach((test, index) => {
  console.log(`${test.icon} ${index + 1}. ${test.name}`);
  console.log(`   File: ${test.file}`);
  console.log(`   Description: ${test.description}`);
  console.log(`   Run: ${test.command}\n`);
});

console.log('📖 For detailed documentation, see: backend/test/README.md\n');
console.log('💡 Quick Start:');
console.log('   1. Update USER_ID in test scripts');
console.log('   2. Ensure backend is running (npm run start:dev)');
console.log('   3. Run: node backend/test/run-all-tests.js\n');
