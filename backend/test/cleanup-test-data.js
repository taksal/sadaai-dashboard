/**
 * Cleanup Test Data Script
 *
 * Removes test appointments created during testing
 * Useful for cleaning up your calendar after running tests
 */

const API_BASE_URL = 'http://localhost:3001';
const USER_ID = 'YOUR_USER_ID_HERE';

async function cleanupTestAppointments() {
  console.log('\n🧹 Test Data Cleanup');
  console.log('====================\n');
  console.log(`User ID: ${USER_ID}\n`);

  if (USER_ID === 'YOUR_USER_ID_HERE') {
    console.error('❌ ERROR: Please update USER_ID in the script!');
    console.log('\n💡 To find your user ID:');
    console.log('   1. Run: npx prisma studio');
    console.log('   2. Open the User table');
    console.log('   3. Copy your user ID\n');
    return;
  }

  console.log('⚠️  WARNING: This will delete all appointments with:');
  console.log('   - Customer name: "Test Customer"');
  console.log('   - Description containing: "Test appointment"');
  console.log('   - Created via test scripts\n');

  console.log('Note: This is a direct database operation.');
  console.log('You may need to run this via Prisma Studio instead.\n');

  console.log('🔍 To manually clean up test data:');
  console.log('   1. Run: npx prisma studio');
  console.log('   2. Go to Appointment table');
  console.log('   3. Filter by customerName = "Test Customer"');
  console.log('   4. Select and delete test appointments');
  console.log('   5. Also check your Google Calendar for test events\n');

  console.log('💡 Alternative: Use the Prisma CLI:');
  console.log('   npx prisma studio\n');
}

cleanupTestAppointments().catch(error => {
  console.error('💥 Fatal Error:', error);
  process.exit(1);
});
