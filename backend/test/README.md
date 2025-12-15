# Test Scripts

This folder contains all test scripts to verify the functionality of the call analytics platform backend.

## Prerequisites

1. **Backend running**: `cd backend && npm run start:dev`
2. **User ID**: Get your user ID from Prisma Studio (`npx prisma studio`)
3. **Calendar connected**: Make sure you have Google Calendar or Outlook connected
4. **Update user IDs**: Replace `YOUR_USER_ID_HERE` in test scripts with your actual user ID

## Test Scripts

### 1. test-vapi-functions.js

**Purpose**: Comprehensive test of all 5 Vapi calendar webhook functions

**Tests**:
- ✅ Check availability (available time)
- ✅ Create appointment
- ✅ Check availability (conflicting time)
- ✅ Read/list appointments
- ✅ Reschedule appointment
- ✅ Reschedule to conflicting time (should fail gracefully)
- ✅ Cancel appointment
- ✅ Cancel already cancelled (should handle gracefully)
- ✅ Invalid booking reference (should error gracefully)
- ✅ Timezone handling with Z suffix

**Run**:
```bash
node backend/test/test-vapi-functions.js
```

**Expected Result**: All 10 tests should pass

---

### 2. test-booking-reference.js

**Purpose**: Test the booking reference generation and lookup system

**Tests**:
- ✅ Generate unique booking references
- ✅ Find appointment by booking reference
- ✅ Prevent duplicate booking references
- ✅ Annual reset logic (BK-2025-NNNNNN format)
- ✅ User ownership validation

**Run**:
```bash
node backend/test/test-booking-reference.js
```

---

### 3. test-calendar-sync.js

**Purpose**: Test Google Calendar and Outlook Calendar sync functionality

**Tests**:
- ✅ Create appointment syncs to calendar
- ✅ Update appointment syncs changes
- ✅ Delete appointment removes from calendar
- ✅ Calendar conflicts are detected
- ✅ Token refresh works

**Run**:
```bash
node backend/test/test-calendar-sync.js
```

---

### 4. test-timezone-handling.js

**Purpose**: Test timezone conversion for Sydney (AEDT/AEST)

**Tests**:
- ✅ Parse dates with Z suffix
- ✅ Parse dates without Z suffix
- ✅ Handle daylight saving time (AEDT vs AEST)
- ✅ Convert Sydney local time to UTC
- ✅ Format dates for display in Sydney time

**Run**:
```bash
node backend/test/test-timezone-handling.js
```

---

### 5. quick-health-check.js

**Purpose**: Quick health check of all critical endpoints

**Tests**:
- ✅ Backend server is running
- ✅ Database connection works
- ✅ Redis connection works
- ✅ Vapi webhook endpoint is accessible
- ✅ Calendar endpoints respond

**Run**:
```bash
node backend/test/quick-health-check.js
```

**Expected Result**: All health checks pass in < 5 seconds

---

## Test Results Legend

- ✅ **Passed** - Test completed successfully
- ❌ **Failed** - Test failed with error
- ⚠️  **Skipped** - Test skipped (missing prerequisites)

## Troubleshooting

### "No calendar connected" error
- Go to frontend and connect Google Calendar or Outlook
- Or use the calendar connection endpoints directly

### "User ID not found" error
- Update the `USER_ID` variable in the test script
- Get your user ID from Prisma Studio (`npx prisma studio`)

### "Connection refused" error
- Make sure backend is running: `cd backend && npm run start:dev`
- Check the port in `.env` file (default: 3001)

### "Booking reference not found" error
- This is expected for the invalid reference test
- For other tests, make sure the appointment was created first

## Running All Tests

To run all tests sequentially:

```bash
node backend/test/test-vapi-functions.js && \
node backend/test/test-booking-reference.js && \
node backend/test/test-calendar-sync.js && \
node backend/test/test-timezone-handling.js && \
node backend/test/quick-health-check.js
```

Or create a test runner:

```bash
node backend/test/run-all-tests.js
```

## CI/CD Integration

These tests can be integrated into your CI/CD pipeline:

```yaml
# Example GitHub Actions workflow
- name: Run Backend Tests
  run: |
    cd backend
    npm run start:dev &
    sleep 5
    node test/quick-health-check.js
    node test/test-vapi-functions.js
```

## Writing New Tests

When adding new test scripts:

1. Name the file `test-{feature-name}.js`
2. Add documentation in this README
3. Follow the same structure as existing tests
4. Include clear console output with emojis for readability
5. Add test to `run-all-tests.js`

## Test Data Cleanup

Some tests create appointments in your calendar. To clean up:

1. Go to Prisma Studio: `npx prisma studio`
2. Open the `Appointment` table
3. Delete test appointments (look for "Test Customer" name)
4. Or use the cleanup script: `node backend/test/cleanup-test-data.js`

---

**Last Updated**: 2025-12-03
**Maintainer**: Development Team
