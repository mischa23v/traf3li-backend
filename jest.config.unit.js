/**
 * Jest Configuration for Unit Tests (No Database)
 *
 * Use this for pure utility tests that don't need MongoDB
 */

module.exports = {
    testEnvironment: 'node',
    rootDir: '.',
    testMatch: [
        '**/tests/unit/**/*.test.js',
    ],
    testPathIgnorePatterns: [
        '/node_modules/',
        '/dist/',
        '/build/',
    ],
    // No setup files - skip MongoDB
    setupFilesAfterEnv: [],
    testTimeout: 10000,
    clearMocks: true,
    verbose: true,
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^@models/(.*)$': '<rootDir>/src/models/$1',
        '^@services/(.*)$': '<rootDir>/src/services/$1',
        '^@controllers/(.*)$': '<rootDir>/src/controllers/$1',
        '^@middlewares/(.*)$': '<rootDir>/src/middlewares/$1',
        '^@utils/(.*)$': '<rootDir>/src/utils/$1'
    },
    globals: {
        'process.env.NODE_ENV': 'test'
    }
};
