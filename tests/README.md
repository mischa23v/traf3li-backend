# Test Suite Documentation

This directory contains comprehensive API integration tests and unit tests for the Traf3li backend application.

## Test Structure

```
tests/
├── setup.js                          # Global test setup and utilities
├── integration/                      # API integration tests
│   ├── auth.test.js                 # Authentication & OTP tests
│   ├── lead.test.js                 # Lead management tests
│   └── health.test.js               # Health check tests
└── unit/                            # Unit tests
    ├── validators/                  # Validator tests
    │   └── payment.test.js         # Payment validator tests
    ├── middlewares/                # Middleware tests
    │   └── rateLimiter.test.js
    └── utils/                      # Utility tests
        └── logger.test.js
```

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- tests/integration/auth.test.js

# Run tests matching a pattern
npm test -- --testNamePattern="should login"
```

## Test Setup

### Global Setup (tests/setup.js)

The setup file provides:
- **MongoDB Memory Server**: Isolated in-memory database for testing
- **Test Utilities**: Helper functions for creating mock objects
- **Automatic Cleanup**: Database cleanup between tests

### Test Utilities

Available via `global.testUtils`:

```javascript
const { mockRequest, mockResponse, mockNext, generateTestData } = global.testUtils;

// Create mock request
const req = mockRequest({
    body: { key: 'value' },
    params: { id: '123' },
    userID: 'user-id'
});

// Create mock response
const res = mockResponse();

// Create mock next function
const next = mockNext();

// Generate test data
const email = generateTestData.email();
const phone = generateTestData.phone();
const objectId = generateTestData.objectId();
```

## Test Files

### 1. Authentication Tests (tests/integration/auth.test.js)

Tests for authentication endpoints including login, registration, OTP flow, and rate limiting.

#### Test Coverage:

**Registration (`POST /api/auth/register`)**
- ✅ Register with valid credentials
- ✅ Reject duplicate email
- ✅ Reject duplicate username
- ✅ Reject short password (< 8 chars)
- ✅ Reject missing required fields
- ✅ Register as solo lawyer
- ✅ Register lawyer and create firm

**Login (`POST /api/auth/login`)**
- ✅ Login with email/password
- ✅ Login with username/password
- ✅ Reject invalid password
- ✅ Reject non-existent user
- ✅ Return firm information for firm members

**Logout (`POST /api/auth/logout`)**
- ✅ Clear authentication cookie

**Availability Check (`POST /api/auth/check-availability`)**
- ✅ Check email availability
- ✅ Check username availability
- ✅ Check phone availability

**OTP Flow**
- ✅ Send OTP for existing user (`POST /api/auth/send-otp`)
- ✅ Reject OTP for non-existent user
- ✅ Validate OTP format
- ✅ Verify valid OTP (`POST /api/auth/verify-otp`)
- ✅ Check OTP status (`GET /api/auth/otp-status`)

**Rate Limiting**
- ✅ Enforce 5 login attempts per 15 minutes
- ✅ Enforce 5 registration attempts per 15 minutes
- ✅ Enforce 3 OTP requests per hour (sensitive)
- ✅ Return 429 status when limit exceeded

### 2. Lead Management Tests (tests/integration/lead.test.js)

Tests for lead CRUD operations, conversion to client, and stage updates.

#### Test Coverage:

**CRUD Operations**
- ✅ Create lead with valid data (`POST /api/leads`)
- ✅ Create company lead
- ✅ Get all leads (`GET /api/leads`)
- ✅ Filter leads by status
- ✅ Paginate lead list
- ✅ Search leads
- ✅ Get single lead (`GET /api/leads/:id`)
- ✅ Update lead (`PUT /api/leads/:id`)
- ✅ Delete lead (`DELETE /api/leads/:id`)
- ✅ Prevent deletion of converted leads

**Pipeline & Stages**
- ✅ Assign lead to default pipeline
- ✅ Move lead to new stage (`POST /api/leads/:id/move`)
- ✅ Update status when moving to won stage
- ✅ Log stage change activity
- ✅ Validate stage exists

**Lead Conversion**
- ✅ Convert lead to client (`POST /api/leads/:id/convert`)
- ✅ Convert lead and create case
- ✅ Prevent converting already converted leads
- ✅ Log conversion activity
- ✅ Preview conversion data (`GET /api/leads/:id/conversion-preview`)

**Activities & Follow-ups**
- ✅ Log activity for lead (`POST /api/leads/:id/activities`)
- ✅ Update lead stats (call count, last contacted)
- ✅ Schedule follow-up (`POST /api/leads/:id/follow-up`)
- ✅ Get lead statistics (`GET /api/leads/stats`)

**Authorization**
- ✅ Block departed users from lead operations

### 3. Payment Validator Tests (tests/unit/validators/payment.test.js)

Unit tests for payment validation schemas and error messages.

#### Test Coverage:

**Create Payment Schema**
- ✅ Validate valid payment data
- ✅ Require clientId, amount, method
- ✅ Reject negative/zero amounts
- ✅ Reject invalid payment methods
- ✅ Accept all valid payment methods (cash, check, credit_card, etc.)
- ✅ Default status to 'pending'
- ✅ Reject future payment dates
- ✅ Limit reference and notes length
- ✅ Require checkNumber for check payments
- ✅ Require checkDate for check payments
- ✅ Validate invoice application
- ✅ Strip unknown fields

**Update Payment Schema**
- ✅ Validate partial updates
- ✅ Require at least one field
- ✅ Reject negative amounts

**Apply Payment Schema**
- ✅ Validate invoice application
- ✅ Require invoices array
- ✅ Require at least one invoice
- ✅ Validate invoice structure (invoiceId, amount)
- ✅ Reject negative amounts

**Create Refund Schema**
- ✅ Require amount and reason
- ✅ Reject negative amounts
- ✅ Limit reason length

**Update Check Status Schema**
- ✅ Require status field
- ✅ Accept all valid check statuses
- ✅ Reject invalid statuses
- ✅ Require bounceReason for bounced checks
- ✅ Default statusDate to current date

**Reconcile Payment Schema**
- ✅ Require bankTransactionId
- ✅ Validate reconciliation data

**Payment Query Schema**
- ✅ Validate query parameters
- ✅ Default page to 1, limit to 50
- ✅ Validate date range (endDate >= startDate)
- ✅ Validate amount range (maxAmount >= minAmount)
- ✅ Limit maximum page size to 100

**Bulk Delete Schema**
- ✅ Require IDs array
- ✅ Require at least one ID
- ✅ Limit maximum IDs to 100

**Validation Middleware**
- ✅ Create validation middleware function
- ✅ Validate request body
- ✅ Return errors for invalid data
- ✅ Call next() for valid data

**Enums**
- ✅ Export payment methods
- ✅ Export payment statuses
- ✅ Export check statuses

## Writing New Tests

### Integration Test Template

```javascript
const request = require('supertest');
const express = require('express');
const { Model } = require('../../src/models');
const route = require('../../src/routes/myroute.route');

const app = express();
app.use(express.json());
app.use('/api/myroute', route);

describe('My Route Integration Tests', () => {
    const { generateTestData } = global.testUtils;
    
    beforeEach(async () => {
        // Setup test data
    });
    
    describe('POST /api/myroute', () => {
        it('should do something', async () => {
            const response = await request(app)
                .post('/api/myroute')
                .send({ data: 'test' })
                .expect(200);
                
            expect(response.body.success).toBe(true);
        });
    });
});
```

### Unit Test Template

```javascript
const { schemas } = require('../../../src/validators/my.validator');

describe('My Validator Tests', () => {
    describe('My Schema', () => {
        const schema = schemas.mySchema;
        
        it('should validate valid data', () => {
            const valid = { field: 'value' };
            const { error } = schema.validate(valid);
            expect(error).toBeUndefined();
        });
        
        it('should reject invalid data', () => {
            const invalid = { field: 123 };
            const { error } = schema.validate(invalid);
            expect(error).toBeDefined();
        });
    });
});
```

## Best Practices

1. **Isolation**: Each test should be independent and not rely on other tests
2. **Cleanup**: Use `afterEach` to clean up test data
3. **Descriptive Names**: Use clear, descriptive test names that explain what is being tested
4. **Arrange-Act-Assert**: Structure tests with setup, execution, and verification
5. **Mock External Services**: Use mocks for external APIs, email services, etc.
6. **Test Edge Cases**: Test both happy paths and error scenarios
7. **Use Factories**: Create reusable factory functions for test data

## Troubleshooting

### MongoDB Memory Server Issues

If you encounter issues with MongoDB Memory Server:

```bash
# The setup.js specifies MongoDB version 7.0.14
# If this version is not available, update it in tests/setup.js:

mongoServer = await MongoMemoryServer.create({
    binary: {
        version: '6.0.9' // Change to an available version
    }
});
```

### Timeout Issues

If tests timeout:

```javascript
// Increase timeout in specific test
it('should do something', async () => {
    // test code
}, 10000); // 10 second timeout

// Or globally in setup.js
jest.setTimeout(30000);
```

### Rate Limiting in Tests

Rate limiting can cause tests to fail when running multiple times. If needed:

1. Mock the rate limiter middleware
2. Use different IPs for each test
3. Clear rate limit data between tests

## CI/CD Integration

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test -- --ci --coverage --forceExit
```

## Coverage Reports

After running `npm run test:coverage`, view the coverage report:

```bash
open coverage/lcov-report/index.html
```

## Additional Resources

- [Jest Documentation](https://jestjs.io/)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [MongoDB Memory Server](https://github.com/nodkz/mongodb-memory-server)
- [Joi Validation](https://joi.dev/)
