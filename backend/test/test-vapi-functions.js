/**
 * Comprehensive Test Script for Vapi Webhook Functions
 *
 * This script tests all 5 calendar functions with various scenarios:
 * 1. check_availability
 * 2. create_event
 * 3. read_events
 * 4. reschedule_appointment
 * 5. cancel_appointment
 *
 * Usage:
 * 1. Make sure your backend is running: npm run start:dev
 * 2. Update USER_ID below with your actual user ID from the database
 * 3. Run: node test-vapi-functions.js
 */

const API_BASE_URL = 'http://localhost:3001';
const WEBHOOK_ENDPOINT = `${API_BASE_URL}/api/vapi/webhooks/calendar/function-call`;

// ⚠️ IMPORTANT: Replace this with your actual user ID from the database
const USER_ID = '59ddcbdf-baa5-4237-989c-7526398629a5'; // Get this from your User table

// Test data
let testBookingReference = null;

// Helper to make Vapi webhook call
async function callVapiFunction(functionName, parameters) {
  const payload = {
    message: {
      type: 'function-call',
      functionCall: {
        name: functionName,
        parameters: parameters,
      },
    },
    call: {
      id: `test-call-${Date.now()}`,
      customer: {
        number: '+61412345678',
      },
    },
  };

  console.log(`\n${'='.repeat(80)}`);
  console.log(`🧪 Testing: ${functionName}`);
  console.log(`${'='.repeat(80)}`);
  console.log('📤 Request:', JSON.stringify(parameters, null, 2));

  try {
    const response = await fetch(WEBHOOK_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (response.ok) {
      console.log('✅ Success!');
      console.log('📥 Response:', JSON.stringify(data, null, 2));
      return { success: true, data };
    } else {
      console.log('❌ Failed!');
      console.log('📥 Error Response:', JSON.stringify(data, null, 2));
      return { success: false, error: data };
    }
  } catch (error) {
    console.log('❌ Request Failed!');
    console.log('Error:', error.message);
    return { success: false, error: error.message };
  }
}

// Helper to pause between tests
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Test 1: Check Availability (Available Time)
async function testCheckAvailabilityAvailable() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(14, 0, 0, 0); // 2 PM tomorrow

  const dateTime = tomorrow.toISOString().split('.')[0]; // Remove milliseconds

  return await callVapiFunction('check_availability', {
    userId: USER_ID,
    dateTime: dateTime,
    duration: 60,
  });
}

// Test 2: Create Event (Book Appointment)
async function testCreateEvent() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(14, 0, 0, 0); // 2 PM tomorrow

  const dateTime = tomorrow.toISOString().split('.')[0];

  const result = await callVapiFunction('create_event', {
    userId: USER_ID,
    customerName: 'Test Customer',
    customerPhone: '+61412345678',
    customerEmail: 'test@example.com',
    dateTime: dateTime,
    duration: 60,
    description: 'Test appointment via script',
  });

  // Extract booking reference from response
  if (result.success) {
    const match = result.data.results?.[0]?.result?.match(/BK-\d{4}-\d{6}/);
    if (match) {
      testBookingReference = match[0];
      console.log(`\n📝 Saved booking reference: ${testBookingReference}`);
    }
  }

  return result;
}

// Test 3: Check Availability (Conflicting Time)
async function testCheckAvailabilityConflict() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(14, 0, 0, 0); // Same as booked appointment

  const dateTime = tomorrow.toISOString().split('.')[0];

  return await callVapiFunction('check_availability', {
    userId: USER_ID,
    dateTime: dateTime,
    duration: 60,
  });
}

// Test 4: Read Events (List Appointments)
async function testReadEvents() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  nextWeek.setHours(23, 59, 59, 999);

  return await callVapiFunction('read_events', {
    userId: USER_ID,
    startDate: today.toISOString(),
    endDate: nextWeek.toISOString(),
  });
}

// Test 5: Reschedule Appointment (Valid)
async function testRescheduleAppointment() {
  if (!testBookingReference) {
    console.log('⚠️  Skipping: No booking reference available');
    return { success: false, error: 'No booking reference' };
  }

  const dayAfterTomorrow = new Date();
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
  dayAfterTomorrow.setHours(15, 0, 0, 0); // 3 PM day after tomorrow

  const dateTime = dayAfterTomorrow.toISOString().split('.')[0];

  return await callVapiFunction('reschedule_appointment', {
    userId: USER_ID,
    bookingReference: testBookingReference,
    dateTime: dateTime,
    duration: 60,
  });
}

// Test 6: Reschedule to Conflicting Time (Should Fail)
async function testRescheduleConflict() {
  if (!testBookingReference) {
    console.log('⚠️  Skipping: No booking reference available');
    return { success: false, error: 'No booking reference' };
  }

  // Try to reschedule to a time with another appointment
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(14, 0, 0, 0);

  const dateTime = tomorrow.toISOString().split('.')[0];

  return await callVapiFunction('reschedule_appointment', {
    userId: USER_ID,
    bookingReference: testBookingReference,
    dateTime: dateTime,
    duration: 60,
  });
}

// Test 7: Cancel Appointment (Valid)
async function testCancelAppointment() {
  if (!testBookingReference) {
    console.log('⚠️  Skipping: No booking reference available');
    return { success: false, error: 'No booking reference' };
  }

  return await callVapiFunction('cancel_appointment', {
    userId: USER_ID,
    bookingReference: testBookingReference,
    reason: 'Testing cancellation functionality',
  });
}

// Test 8: Cancel Already Cancelled (Should Handle Gracefully)
async function testCancelAlreadyCancelled() {
  if (!testBookingReference) {
    console.log('⚠️  Skipping: No booking reference available');
    return { success: false, error: 'No booking reference' };
  }

  return await callVapiFunction('cancel_appointment', {
    userId: USER_ID,
    bookingReference: testBookingReference,
    reason: 'Attempting to cancel again',
  });
}

// Test 9: Invalid Booking Reference
async function testInvalidBookingReference() {
  return await callVapiFunction('reschedule_appointment', {
    userId: USER_ID,
    bookingReference: 'BK-2025-999999', // Non-existent reference
    dateTime: '2025-12-10T15:00:00',
    duration: 60,
  });
}

// Test 10: Timezone Handling (Z suffix)
async function testTimezoneSuffix() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(13, 0, 0, 0); // 1 PM

  // Send with Z suffix (as Vapi does)
  const dateTime = tomorrow.toISOString().split('.')[0] + 'Z';

  return await callVapiFunction('check_availability', {
    userId: USER_ID,
    dateTime: dateTime,
    duration: 60,
  });
}

// Main test runner
async function runAllTests() {
  console.log('\n');
  console.log('🚀 Starting Vapi Function Tests');
  console.log('================================\n');
  console.log(`📍 Webhook URL: ${WEBHOOK_ENDPOINT}`);
  console.log(`👤 User ID: ${USER_ID}\n`);

  if (USER_ID === 'YOUR_USER_ID_HERE') {
    console.error('❌ ERROR: Please update USER_ID in the script with your actual user ID from the database!');
    console.log('\n💡 To find your user ID:');
    console.log('   1. Open Prisma Studio: npx prisma studio');
    console.log('   2. Go to the User table');
    console.log('   3. Copy the ID field of your user\n');
    return;
  }

  const tests = [
    { name: '1️⃣  Check Availability (Available)', fn: testCheckAvailabilityAvailable },
    { name: '2️⃣  Create Event (Book)', fn: testCreateEvent },
    { name: '3️⃣  Check Availability (Conflict)', fn: testCheckAvailabilityConflict },
    { name: '4️⃣  Read Events (List)', fn: testReadEvents },
    { name: '5️⃣  Reschedule Appointment', fn: testRescheduleAppointment },
    { name: '6️⃣  Reschedule (Conflict)', fn: testRescheduleConflict },
    { name: '7️⃣  Cancel Appointment', fn: testCancelAppointment },
    { name: '8️⃣  Cancel (Already Cancelled)', fn: testCancelAlreadyCancelled },
    { name: '9️⃣  Invalid Booking Reference', fn: testInvalidBookingReference },
    { name: '🔟 Timezone with Z Suffix', fn: testTimezoneSuffix },
  ];

  const results = [];

  for (const test of tests) {
    console.log(`\n\n📋 ${test.name}`);
    const result = await test.fn();
    results.push({ name: test.name, ...result });
    await sleep(1000); // Wait 1 second between tests
  }

  // Summary
  console.log('\n\n');
  console.log('📊 TEST SUMMARY');
  console.log('===============\n');

  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  results.forEach(result => {
    const icon = result.success ? '✅' : '❌';
    console.log(`${icon} ${result.name}`);
  });

  console.log('\n');
  console.log(`Total Tests: ${results.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log('\n');

  if (testBookingReference) {
    console.log(`📝 Test Booking Reference: ${testBookingReference}`);
    console.log('   (This appointment was created and then cancelled during testing)\n');
  }
}

// Run tests
runAllTests().catch(error => {
  console.error('💥 Fatal Error:', error);
  process.exit(1);
});
