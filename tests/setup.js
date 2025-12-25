/**
 * Jest Test Setup
 *
 * This file runs before all tests and sets up the testing environment.
 */

const mongoose = require('mongoose');
const crypto = require('crypto');

// Set test environment
process.env.NODE_ENV = 'test';

// Set test encryption key (32 bytes = 64 hex characters)
process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');

// Set other required environment variables for tests
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing-only';
process.env.FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
process.env.BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';

// Mock nanoid to avoid ESM import issues in tests
jest.mock('nanoid', () => ({
    nanoid: (size = 21) => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < size; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }
}));

// Increase timeout for database operations
jest.setTimeout(30000);

// MongoDB Memory Server for isolated testing
let mongoServer;

/**
 * Connect to in-memory database before all tests
 */
beforeAll(async () => {
    // Use MongoDB Memory Server for isolated tests
    const { MongoMemoryServer } = require('mongodb-memory-server');
    mongoServer = await MongoMemoryServer.create({
        binary: {
            version: '7.0.14' // Use a stable version that's available
        }
    });
    const mongoUri = mongoServer.getUri();

    // Disconnect from any existing connection
    if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
    }

    // Connect to in-memory database
    await mongoose.connect(mongoUri, {
        maxPoolSize: 10
    });

    console.log('✅ Connected to in-memory MongoDB for testing');
});

/**
 * Clear database between tests
 */
afterEach(async () => {
    if (mongoose.connection.readyState === 1) {
        const collections = mongoose.connection.collections;
        for (const key in collections) {
            await collections[key].deleteMany({});
        }
    }
});

/**
 * Disconnect and stop server after all tests
 */
afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
    }
    if (mongoServer) {
        await mongoServer.stop();
    }
    console.log('✅ Disconnected from test database');
});

// Suppress console.log in tests (optional - comment out for debugging)
if (process.env.SUPPRESS_LOGS !== 'false') {
    global.console = {
        ...console,
        log: jest.fn(),
        debug: jest.fn(),
        info: jest.fn(),
        // Keep warn and error for debugging
        warn: console.warn,
        error: console.error
    };
}

/**
 * Test Utilities
 */
global.testUtils = {
    /**
     * Create a mock request object
     */
    mockRequest: (overrides = {}) => ({
        body: {},
        params: {},
        query: {},
        headers: {},
        userID: new mongoose.Types.ObjectId().toString(),
        firmId: new mongoose.Types.ObjectId().toString(),
        ip: '127.0.0.1',
        ...overrides
    }),

    /**
     * Create a mock response object
     */
    mockResponse: () => {
        const res = {};
        res.status = jest.fn().mockReturnValue(res);
        res.json = jest.fn().mockReturnValue(res);
        res.send = jest.fn().mockReturnValue(res);
        res.setHeader = jest.fn().mockReturnValue(res);
        return res;
    },

    /**
     * Create a mock next function
     */
    mockNext: () => jest.fn(),

    /**
     * Wait for a condition
     */
    waitFor: (condition, timeout = 5000) => {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            const check = () => {
                if (condition()) {
                    resolve();
                } else if (Date.now() - startTime > timeout) {
                    reject(new Error('Timeout waiting for condition'));
                } else {
                    setTimeout(check, 100);
                }
            };
            check();
        });
    },

    /**
     * Generate random test data
     */
    generateTestData: {
        email: () => `test_${Date.now()}@example.com`,
        phone: () => `+966${Math.floor(Math.random() * 900000000 + 100000000)}`,
        objectId: () => new mongoose.Types.ObjectId().toString()
    }
};
