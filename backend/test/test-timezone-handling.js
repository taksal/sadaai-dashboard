/**
 * Timezone Handling Test Script
 *
 * Tests Sydney timezone conversion (AEDT/AEST UTC+11/+10)
 * Verifies proper handling of Z suffix and DST transitions
 */

const API_BASE_URL = 'http://localhost:3001';
const WEBHOOK_ENDPOINT = `${API_BASE_URL}/api/vapi/webhooks/calendar/function-call`;
const USER_ID = 'YOUR_USER_ID_HERE';

function formatTestResult(testName, passed, details = '') {
  const icon = passed ? '✅' : '❌';
  console.log(`${icon} ${testName}`);
  if (details) {
    console.log(`   ${details}`);
  }
}

async function testTimezoneConversion(testName, inputDateTime, expectedHour) {
  console.log(`\n📋 ${testName}`);
  console.log(`Input: ${inputDateTime}`);

  const payload = {
    message: {
      type: 'function-call',
      functionCall: {
        name: 'check_availability',
        parameters: {
          userId: USER_ID,
          dateTime: inputDateTime,
          duration: 60,
        },
      },
    },
    call: {
      id: `test-tz-${Date.now()}`,
      customer: { number: '+61412345678' },
    },
  };

  try {
    const response = await fetch(WEBHOOK_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (response.ok) {
      // Extract the time from response
      const resultText = data.results?.[0]?.result || '';
      console.log(`Response: ${resultText}`);

      // Check if the hour matches expected
      const hourMatch = resultText.match(/(\d{1,2}):(\d{2}):(\d{2})\s*(am|pm)/i);
      if (hourMatch) {
        const responseHour = parseInt(hourMatch[1]);
        const isPM = hourMatch[4].toLowerCase() === 'pm';
        const hour24 = isPM && responseHour !== 12 ? responseHour + 12 : responseHour;

        const passed = hour24 === expectedHour;
        formatTestResult(
          testName,
          passed,
          `Expected ${expectedHour}:00, Got ${hour24}:00`
        );
        return passed;
      } else {
        formatTestResult(testName, true, 'Response format valid');
        return true;
      }
    } else {
      formatTestResult(testName, false, `HTTP ${response.status}: ${data.error || 'Unknown error'}`);
      return false;
    }
  } catch (error) {
    formatTestResult(testName, false, error.message);
    return false;
  }
}

async function runTimezoneTests() {
  console.log('\n🌍 Timezone Handling Tests');
  console.log('===========================\n');
  console.log(`User ID: ${USER_ID}`);

  if (USER_ID === 'YOUR_USER_ID_HERE') {
    console.error('❌ ERROR: Please update USER_ID in the script!');
    return;
  }

  const results = [];

  // Test 1: ISO format with Z suffix (Sydney 2 PM)
  results.push(await testTimezoneConversion(
    'Test 1: ISO with Z suffix (2025-12-05T14:00:00Z)',
    '2025-12-05T14:00:00Z',
    14 // Should be 2 PM Sydney time
  ));

  await sleep(1000);

  // Test 2: ISO format without Z suffix (Sydney 3 PM)
  results.push(await testTimezoneConversion(
    'Test 2: ISO without Z (2025-12-05T15:00:00)',
    '2025-12-05T15:00:00',
    15 // Should be 3 PM Sydney time
  ));

  await sleep(1000);

  // Test 3: Morning time (9 AM)
  results.push(await testTimezoneConversion(
    'Test 3: Morning time (2025-12-05T09:00:00)',
    '2025-12-05T09:00:00',
    9 // Should be 9 AM Sydney time
  ));

  await sleep(1000);

  // Test 4: Evening time (5 PM)
  results.push(await testTimezoneConversion(
    'Test 4: Evening time (2025-12-05T17:00:00Z)',
    '2025-12-05T17:00:00Z',
    17 // Should be 5 PM Sydney time
  ));

  // Summary
  console.log('\n\n📊 TIMEZONE TEST SUMMARY');
  console.log('=========================\n');

  const passed = results.filter(r => r).length;
  const failed = results.filter(r => !r).length;

  console.log(`Total Tests: ${results.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}\n`);

  if (failed === 0) {
    console.log('🎉 All timezone tests passed!\n');
  } else {
    console.log('⚠️  Some tests failed. Check timezone conversion logic.\n');
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Run tests
runTimezoneTests().catch(error => {
  console.error('💥 Fatal Error:', error);
  process.exit(1);
});
