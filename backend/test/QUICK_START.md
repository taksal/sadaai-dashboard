# Test Suite Quick Start Guide

## Overview

The `/backend/test` folder contains all test scripts to verify your call analytics platform is working correctly.

## Test Files

```
backend/test/
├── README.md                    # Detailed documentation
├── QUICK_START.md              # This file
├── index.js                    # List all available tests
├── run-all-tests.js            # Run all tests sequentially
├── quick-health-check.js       # Fast health check (< 5 sec)
├── test-vapi-functions.js      # Test all Vapi functions (MAIN TEST)
├── test-timezone-handling.js   # Test timezone conversion
└── cleanup-test-data.js        # Clean up test appointments
```

## Quick Commands

### 1. See All Available Tests
```bash
node backend/test/index.js
```

### 2. Run Quick Health Check
```bash
node backend/test/quick-health-check.js
```
Expected: 2-4 tests pass in < 5 seconds

### 3. Run Main Vapi Functions Test
```bash
node backend/test/test-vapi-functions.js
```
Expected: All 10 tests pass

### 4. Run All Tests
```bash
node backend/test/run-all-tests.js
```
Expected: All tests pass sequentially

### 5. Clean Up Test Data
```bash
node backend/test/cleanup-test-data.js
```
Removes test appointments from database

## Before Running Tests

### Step 1: Get Your User ID

```bash
# Open Prisma Studio
cd backend && npx prisma studio
```

1. Click on **User** table
2. Copy your **ID** (looks like: `59ddcbdf-baa5-4237-989c-7526398629a5`)

### Step 2: Update Test Scripts

Open each test file and replace:
```javascript
const USER_ID = 'YOUR_USER_ID_HERE';
```

With your actual user ID:
```javascript
const USER_ID = '59ddcbdf-baa5-4237-989c-7526398629a5';
```

### Step 3: Ensure Backend is Running

```bash
cd backend && npm run start:dev
```

Verify it's running at: http://localhost:3001

### Step 4: Connect Calendar

Go to your frontend and connect Google Calendar or Outlook before running tests.

## Test Results

### ✅ All Tests Passed
```
Total Tests: 10
✅ Passed: 10
❌ Failed: 0
```
**Meaning**: Your system is production-ready!

### ❌ Some Tests Failed
```
Total Tests: 10
✅ Passed: 8
❌ Failed: 2
```
**Action**:
1. Check backend logs for errors
2. Verify calendar is connected
3. Ensure USER_ID is correct
4. Review failed test output

## Common Issues

### Issue: "No calendar connected"
**Solution**: Go to frontend and connect Google Calendar

### Issue: "User ID not found"
**Solution**: Update USER_ID in test script with actual ID from database

### Issue: "Connection refused"
**Solution**: Start backend with `npm run start:dev`

### Issue: "Port 4000 not found"
**Solution**: Backend runs on port 3001, already configured correctly

## What Each Test Does

### 1. quick-health-check.js
- ⚡ Checks if backend is responding
- ⚡ Verifies critical endpoints exist
- ⚡ Takes < 5 seconds

### 2. test-vapi-functions.js ⭐ MAIN TEST
- 📞 Tests all 5 Vapi calendar functions
- 📞 10 comprehensive test scenarios
- 📞 Includes:
  - Check availability
  - Create appointments
  - Reschedule with booking reference
  - Cancel appointments
  - Handle conflicts
  - Timezone with Z suffix
  - Invalid booking references

### 3. test-timezone-handling.js
- 🌏 Tests Sydney timezone (AEDT/AEST)
- 🌏 Verifies Z suffix handling
- 🌏 Tests DST transitions

### 4. run-all-tests.js
- 🚀 Runs all tests in order
- 🚀 Shows final summary
- 🚀 Stops on critical failures

## Reading Test Output

### Success Example
```
✅ Test 1: Check Availability (Available)
   Response: Yes, the calendar is available...
```

### Failure Example
```
❌ Test 2: Create Event
   Error: No calendar connected
   Fix: Connect Google Calendar first
```

## After Tests Complete

### Clean Up Test Data
```bash
# Option 1: Use cleanup script
node backend/test/cleanup-test-data.js

# Option 2: Manual cleanup via Prisma Studio
npx prisma studio
# Go to Appointment table
# Filter: customerName = "Test Customer"
# Delete test appointments
```

### Check Your Calendar
- Test appointments may appear in your Google Calendar
- Look for appointments with "Test Customer" name
- Delete them manually if needed

## CI/CD Integration

Add to your GitHub Actions workflow:

```yaml
- name: Run Tests
  run: |
    cd backend
    npm run start:dev &
    sleep 5
    node test/run-all-tests.js
```

## Next Steps After All Tests Pass

1. ✅ Connect Vapi to your backend webhook
2. ✅ Test with real voice calls
3. ✅ Add structured outputs to Vapi
4. ✅ Deploy to production

## Support

- 📖 Full docs: `backend/test/README.md`
- 🔧 Troubleshooting: Check backend logs
- 💬 Issues: Review test output for specific errors

---

**Pro Tip**: Run `node backend/test/index.js` anytime to see all available tests!
