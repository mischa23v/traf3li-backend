#!/usr/bin/env node

/**
 * Test Validation Script
 *
 * This script tests the environment variable validation by temporarily
 * unsetting variables and checking if validation catches them.
 *
 * Usage:
 *   node scripts/test-validation.js
 */

console.log('\n' + '='.repeat(70));
console.log('🧪 TESTING ENVIRONMENT VALIDATION');
console.log('='.repeat(70) + '\n');

// Save original env vars
const originalEnv = {
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
  MONGODB_URI: process.env.MONGODB_URI,
};

const tests = [
  {
    name: 'Missing JWT_SECRET',
    setup: () => {
      delete process.env.JWT_SECRET;
    },
    expectedError: 'JWT_SECRET'
  },
  {
    name: 'Missing JWT_REFRESH_SECRET',
    setup: () => {
      process.env.JWT_SECRET = 'a'.repeat(64);
      delete process.env.JWT_REFRESH_SECRET;
    },
    expectedError: 'JWT_REFRESH_SECRET'
  },
  {
    name: 'JWT_SECRET too short',
    setup: () => {
      process.env.JWT_SECRET = 'short';
      process.env.JWT_REFRESH_SECRET = 'a'.repeat(64);
    },
    expectedError: 'at least 32 characters'
  },
  {
    name: 'Missing ENCRYPTION_KEY',
    setup: () => {
      process.env.JWT_SECRET = 'a'.repeat(64);
      process.env.JWT_REFRESH_SECRET = 'b'.repeat(64);
      delete process.env.ENCRYPTION_KEY;
    },
    expectedError: 'ENCRYPTION_KEY'
  },
  {
    name: 'ENCRYPTION_KEY wrong length',
    setup: () => {
      process.env.JWT_SECRET = 'a'.repeat(64);
      process.env.JWT_REFRESH_SECRET = 'b'.repeat(64);
      process.env.ENCRYPTION_KEY = 'short';
    },
    expectedError: '64 hexadecimal characters'
  },
  {
    name: 'ENCRYPTION_KEY invalid characters',
    setup: () => {
      process.env.JWT_SECRET = 'a'.repeat(64);
      process.env.JWT_REFRESH_SECRET = 'b'.repeat(64);
      process.env.ENCRYPTION_KEY = 'x'.repeat(64); // x is not valid hex
    },
    expectedError: 'hexadecimal characters'
  },
  {
    name: 'Missing MONGODB_URI',
    setup: () => {
      process.env.JWT_SECRET = 'a'.repeat(64);
      process.env.JWT_REFRESH_SECRET = 'b'.repeat(64);
      process.env.ENCRYPTION_KEY = '0'.repeat(64);
      delete process.env.MONGODB_URI;
    },
    expectedError: 'MONGODB_URI'
  },
];

let passedTests = 0;
let failedTests = 0;

console.log('Running validation tests...\n');

tests.forEach((test, index) => {
  // Clear module cache to force re-require
  delete require.cache[require.resolve('../src/utils/startupValidation')];
  delete require.cache[require.resolve('../src/utils/generateToken')];

  // Setup test environment
  test.setup();

  try {
    // Try to validate (should throw error)
    const { validateRequiredEnvVars } = require('../src/utils/startupValidation');
    validateRequiredEnvVars();

    // If we got here, validation didn't catch the error
    console.log(`❌ Test ${index + 1}: ${test.name} - FAILED`);
    console.log(`   Expected error containing: "${test.expectedError}"`);
    console.log(`   But validation passed when it shouldn't have\n`);
    failedTests++;
  } catch (error) {
    // Check if error message contains expected text
    if (error.message.includes(test.expectedError)) {
      console.log(`✅ Test ${index + 1}: ${test.name} - PASSED`);
      console.log(`   Correctly caught: "${test.expectedError}"\n`);
      passedTests++;
    } else {
      console.log(`❌ Test ${index + 1}: ${test.name} - FAILED`);
      console.log(`   Expected error containing: "${test.expectedError}"`);
      console.log(`   Got error: "${error.message}"\n`);
      failedTests++;
    }
  }

  // Restore original env vars
  Object.assign(process.env, originalEnv);
});

// Test with valid configuration
console.log('Testing with VALID configuration...\n');
process.env.JWT_SECRET = 'a'.repeat(64);
process.env.JWT_REFRESH_SECRET = 'b'.repeat(64);
process.env.ENCRYPTION_KEY = '0123456789abcdef'.repeat(4);
process.env.MONGODB_URI = 'mongodb://localhost:27017/test';

delete require.cache[require.resolve('../src/utils/startupValidation')];
delete require.cache[require.resolve('../src/utils/generateToken')];

try {
  const { validateRequiredEnvVars } = require('../src/utils/startupValidation');
  validateRequiredEnvVars();
  console.log('✅ Valid configuration test - PASSED\n');
  passedTests++;
} catch (error) {
  console.log('❌ Valid configuration test - FAILED');
  console.log(`   Validation rejected valid config: ${error.message}\n`);
  failedTests++;
}

// Restore original environment
Object.assign(process.env, originalEnv);

// Summary
console.log('='.repeat(70));
console.log('TEST SUMMARY');
console.log('='.repeat(70));
console.log(`Total tests: ${passedTests + failedTests}`);
console.log(`✅ Passed: ${passedTests}`);
console.log(`❌ Failed: ${failedTests}`);
console.log('='.repeat(70) + '\n');

process.exit(failedTests > 0 ? 1 : 0);
