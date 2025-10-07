# Scripts Directory

This directory contains utility scripts for testing, maintenance, and development.

## Testing Scripts

### API Testing
- `test-api-auth.js` - Test authentication endpoints
- `test-activities-api.js` - Test activities API
- `test-auth-direct.js` - Direct authentication testing

### Feature Testing
- `test-analytics-export.js` - Test analytics export functionality
- `test-anti-plagiarism-protection.js` - Test anti-plagiarism features
- `test-timezone-activities.js` - Test timezone handling

### Comprehensive Testing
- `test fonctionnalites SIGB UdM/` - Complete test suite directory
  - `test-suite-complete.js` - Full system test
  - `test-interfaces.js` - UI interface tests
  - `test-quick-check.js` - Quick health check
  - `test-exhaustif-detaille.js` - Detailed exhaustive tests
  - `test-verification-quotidienne.js` - Daily verification tests

## Maintenance Scripts

- `create-recent-activities.js` - Generate test activity data
- `create-test-user.js` - Create test user accounts
- `delete-all-activities.js` - Clean up activity logs
- `fix-user-creation-issues.js` - Fix user creation problems

## Usage

Run any script with Node.js:

```bash
# Example: Test API authentication
node scripts/test-api-auth.js

# Example: Run comprehensive tests
node "scripts/test fonctionnalites SIGB UdM/test-suite-complete.js"

# Example: Create test data
node scripts/create-recent-activities.js
```

## Prerequisites

- Node.js installed
- Database connection configured in `.env.local`
- Application running (for API tests)

## Notes

- These scripts are for development and testing purposes
- Always backup your database before running maintenance scripts
- Some scripts may require specific environment variables to be set
