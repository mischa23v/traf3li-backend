/**
 * Jest Configuration for Unit Tests Only
 * This config is for pure unit tests that don't require database connections
 */

module.exports = {
    // Test environment
    testEnvironment: 'node',

    // Root directory
    rootDir: '.',

    // Test file patterns
    testMatch: [
        '**/tests/unit/**/*.test.js',
    ],

    // Files to ignore
    testPathIgnorePatterns: [
        '/node_modules/',
        '/dist/',
        '/build/',
    ],

    // Coverage configuration
    collectCoverageFrom: [
        'src/**/*.js',
        '!src/server.js',
        '!src/configs/**',
        '!src/scripts/**',
        '!**/node_modules/**'
    ],

    // Coverage output
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov', 'html'],

    // Timeout for async tests
    testTimeout: 10000,

    // Clear mocks between tests
    clearMocks: true,

    // Verbose output
    verbose: true,

    // Force exit after tests complete
    forceExit: true,

    // Module name mapping
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^@models/(.*)$': '<rootDir>/src/models/$1',
        '^@services/(.*)$': '<rootDir>/src/services/$1',
        '^@controllers/(.*)$': '<rootDir>/src/controllers/$1',
        '^@middlewares/(.*)$': '<rootDir>/src/middlewares/$1',
        '^@utils/(.*)$': '<rootDir>/src/utils/$1'
    },

    // Global variables available in tests
    globals: {
        'process.env.NODE_ENV': 'test'
    }
};
