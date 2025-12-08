/**
 * Jest Configuration for Traf3li Backend
 *
 * Run tests with: npm test
 * Run with coverage: npm run test:coverage
 * Run in watch mode: npm run test:watch
 */

module.exports = {
    // Test environment
    testEnvironment: 'node',

    // Root directory
    rootDir: '.',

    // Test file patterns
    testMatch: [
        '**/tests/**/*.test.js',
        '**/tests/**/*.spec.js',
        '**/__tests__/**/*.js'
    ],

    // Files to ignore
    testPathIgnorePatterns: [
        '/node_modules/',
        '/dist/',
        '/build/',
        '/CaseAce-law-firm-management-system-frontend-main/'
    ],

    // Coverage configuration
    collectCoverageFrom: [
        'src/**/*.js',
        '!src/server.js', // Entry point
        '!src/configs/**', // Configuration files
        '!src/scripts/**', // Migration scripts
        '!**/node_modules/**'
    ],

    // Coverage thresholds (start low, increase over time)
    coverageThreshold: {
        global: {
            branches: 20,
            functions: 20,
            lines: 20,
            statements: 20
        }
    },

    // Coverage output
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov', 'html'],

    // Setup files
    setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],

    // Timeout for async tests
    testTimeout: 30000,

    // Clear mocks between tests
    clearMocks: true,

    // Verbose output
    verbose: true,

    // Force exit after tests complete
    forceExit: true,

    // Detect open handles (useful for debugging async issues)
    detectOpenHandles: true,

    // Module name mapping (if using aliases)
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
