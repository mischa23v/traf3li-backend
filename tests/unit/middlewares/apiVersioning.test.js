/**
 * API Versioning Middleware Tests
 *
 * Tests for API versioning and deprecation middleware
 *
 * Note: These tests don't require database connection
 */

// Mock logger to prevent console spam during tests
jest.mock('../../../src/utils/logger', () => ({
    warn: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
}));

const request = require('supertest');
const express = require('express');
const {
    apiVersionMiddleware,
    addNonVersionedDeprecationWarning,
    getVersionInfo,
    getSupportedVersions,
    SUPPORTED_VERSIONS
} = require('../../../src/middlewares/apiVersion.middleware');
const {
    deprecationWarning,
    softDeprecationWarning,
    endpointRemovalWarning,
    getDeprecationStatus
} = require('../../../src/middlewares/deprecation.middleware');

// Skip global test setup for these tests
jest.setTimeout(10000);

describe('API Versioning Middleware', () => {
    let app;

    beforeEach(() => {
        app = express();
        app.use(express.json());
        app.use(apiVersionMiddleware);
    });

    describe('Version Detection', () => {
        test('should extract version from URL path', async () => {
            app.get('/api/v1/test', (req, res) => {
                res.json({ apiVersion: req.apiVersion });
            });

            const response = await request(app)
                .get('/api/v1/test')
                .expect(200);

            expect(response.body.apiVersion).toBe('v1');
            expect(response.headers['x-api-version']).toBe('v1');
        });

        test('should extract version from API-Version header', async () => {
            app.get('/api/test', (req, res) => {
                res.json({ apiVersion: req.apiVersion });
            });

            const response = await request(app)
                .get('/api/test')
                .set('API-Version', 'v2')
                .expect(200);

            expect(response.body.apiVersion).toBe('v2');
            expect(response.headers['x-api-version']).toBe('v2');
        });

        test('should extract version from Accept header', async () => {
            app.get('/api/test', (req, res) => {
                res.json({ apiVersion: req.apiVersion });
            });

            const response = await request(app)
                .get('/api/test')
                .set('Accept', 'application/vnd.traf3li.v2+json')
                .expect(200);

            expect(response.body.apiVersion).toBe('v2');
            expect(response.headers['x-api-version']).toBe('v2');
        });

        test('should default to v1 when no version specified', async () => {
            app.get('/api/test', (req, res) => {
                res.json({ apiVersion: req.apiVersion });
            });

            const response = await request(app)
                .get('/api/test')
                .expect(200);

            expect(response.body.apiVersion).toBe('v1');
            expect(response.headers['x-api-version']).toBe('v1');
        });

        test('should prioritize URL path over headers', async () => {
            app.get('/api/v1/test', (req, res) => {
                res.json({ apiVersion: req.apiVersion });
            });

            const response = await request(app)
                .get('/api/v1/test')
                .set('API-Version', 'v2')
                .expect(200);

            expect(response.body.apiVersion).toBe('v1');
        });
    });

    describe('Version Validation', () => {
        test('should reject invalid version', async () => {
            app.get('/api/test', (req, res) => {
                res.json({ success: true });
            });

            const response = await request(app)
                .get('/api/test')
                .set('API-Version', 'v99')
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.code).toBe('INVALID_API_VERSION');
            expect(response.body.supportedVersions).toEqual(SUPPORTED_VERSIONS);
        });

        test('should accept all supported versions', async () => {
            app.get('/api/test', (req, res) => {
                res.json({ success: true });
            });

            for (const version of SUPPORTED_VERSIONS) {
                const response = await request(app)
                    .get('/api/test')
                    .set('API-Version', version)
                    .expect(200);

                expect(response.body.success).toBe(true);
                expect(response.headers['x-api-version']).toBe(version);
            }
        });
    });

    describe('API Status Headers', () => {
        test('should include version status in headers', async () => {
            app.get('/api/v1/test', (req, res) => {
                res.json({ success: true });
            });

            const response = await request(app)
                .get('/api/v1/test')
                .expect(200);

            expect(response.headers['x-api-version']).toBe('v1');
            expect(response.headers['x-api-status']).toBeDefined();
        });
    });
});

describe('Non-Versioned Route Deprecation', () => {
    let app;

    beforeEach(() => {
        app = express();
        app.use(express.json());
        app.use(addNonVersionedDeprecationWarning);
    });

    test('should add deprecation warning to non-versioned routes', async () => {
        app.get('/api/test', (req, res) => {
            res.json({ success: true });
        });

        const response = await request(app)
            .get('/api/test')
            .expect(200);

        expect(response.headers['x-api-warning']).toContain('Non-versioned endpoint');
        expect(response.headers['x-api-migration-info']).toBeDefined();
    });

    test('should not add warning to versioned routes', async () => {
        app.get('/api/v1/test', (req, res) => {
            res.json({ success: true });
        });

        const response = await request(app)
            .get('/api/v1/test')
            .expect(200);

        expect(response.headers['x-api-warning']).toBeUndefined();
    });
});

describe('Deprecation Warning Middleware', () => {
    let app;

    beforeEach(() => {
        app = express();
        app.use(express.json());
    });

    test('should add deprecation headers', async () => {
        app.get('/api/deprecated',
            deprecationWarning('v1', '2025-12-31', '/api/v2/new'),
            (req, res) => {
                res.json({ success: true });
            }
        );

        const response = await request(app)
            .get('/api/deprecated')
            .expect(200);

        expect(response.headers['deprecation']).toBe('true');
        expect(response.headers['x-api-deprecated-version']).toBe('v1');
        expect(response.headers['sunset']).toBe('2025-12-31');
        expect(response.headers['x-api-sunset-date']).toBe('2025-12-31');
        expect(response.headers['x-api-alternate']).toBe('/api/v2/new');
        expect(response.headers['warning']).toContain('Deprecated API version v1');
    });

    test('should add deprecation without sunset date', async () => {
        app.get('/api/deprecated',
            deprecationWarning('v1', null, '/api/v2/new'),
            (req, res) => {
                res.json({ success: true });
            }
        );

        const response = await request(app)
            .get('/api/deprecated')
            .expect(200);

        expect(response.headers['deprecation']).toBe('true');
        expect(response.headers['sunset']).toBeUndefined();
    });
});

describe('Soft Deprecation Warning Middleware', () => {
    let app;

    beforeEach(() => {
        app = express();
        app.use(express.json());
    });

    test('should add future deprecation headers', async () => {
        app.get('/api/soon-deprecated',
            softDeprecationWarning('v1', '2025-06-30', '2025-12-31', '/api/v2/new'),
            (req, res) => {
                res.json({ success: true });
            }
        );

        const response = await request(app)
            .get('/api/soon-deprecated')
            .expect(200);

        expect(response.headers['x-api-future-deprecation']).toBe('2025-06-30');
        expect(response.headers['x-api-planned-sunset']).toBe('2025-12-31');
        expect(response.headers['x-api-recommended-alternative']).toBe('/api/v2/new');
        expect(response.headers['warning']).toContain('will be deprecated on 2025-06-30');
    });
});

describe('Endpoint Removal Warning Middleware', () => {
    let app;

    beforeEach(() => {
        app = express();
        app.use(express.json());
    });

    test('should return 410 Gone for removed endpoint', async () => {
        app.get('/api/removed',
            endpointRemovalWarning('v1', '2024-12-31', '/api/v2/new'),
            (req, res) => {
                // This should not be reached
                res.json({ success: true });
            }
        );

        const response = await request(app)
            .get('/api/removed')
            .expect(410);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('ENDPOINT_GONE');
        expect(response.body.meta.sunsetDate).toBe('2024-12-31');
        expect(response.body.meta.alternateUrl).toBe('/api/v2/new');
        expect(response.headers['sunset']).toBe('2024-12-31');
    });

    test('should redirect when redirect flag is true', async () => {
        app.get('/api/moved',
            endpointRemovalWarning('v1', '2024-12-31', '/api/v2/new', true),
            (req, res) => {
                // This should not be reached
                res.json({ success: true });
            }
        );

        const response = await request(app)
            .get('/api/moved')
            .expect(301);

        expect(response.body.error.code).toBe('ENDPOINT_MOVED');
        expect(response.headers['location']).toBe('/api/v2/new');
    });
});

describe('Version Info Helper', () => {
    test('should return version info', () => {
        const v1Info = getVersionInfo('v1');

        expect(v1Info).toBeDefined();
        expect(v1Info.released).toBeDefined();
        expect(v1Info.status).toBeDefined();
    });

    test('should return null for unknown version', () => {
        const unknownInfo = getVersionInfo('v99');

        expect(unknownInfo).toBeNull();
    });

    test('should return supported versions', () => {
        const versions = getSupportedVersions();

        expect(Array.isArray(versions)).toBe(true);
        expect(versions.length).toBeGreaterThan(0);
        expect(versions).toContain('v1');
    });
});

describe('Deprecation Status Helper', () => {
    test('should determine deprecation status', () => {
        const status = getDeprecationStatus('v1', {
            v1: {
                released: '2024-01-01',
                deprecationDate: '2024-06-01',
                sunsetDate: '2025-01-01',
                status: 'deprecated'
            }
        });

        expect(status).toBeDefined();
        expect(status.status).toBe('deprecated');
        expect(status.deprecationDate).toBe('2024-06-01');
        expect(status.sunsetDate).toBe('2025-01-01');
    });

    test('should return unknown for missing version', () => {
        const status = getDeprecationStatus('v99', {});

        expect(status.status).toBe('unknown');
        expect(status.isDeprecated).toBe(false);
        expect(status.isSunset).toBe(false);
    });
});

describe('Integration Tests', () => {
    let app;

    beforeEach(() => {
        app = express();
        app.use(express.json());
        app.use(apiVersionMiddleware);
    });

    test('should handle complete versioning workflow', async () => {
        // V1 - deprecated endpoint
        app.get('/api/v1/resource',
            deprecationWarning('v1', '2025-12-31', '/api/v2/resource'),
            (req, res) => {
                res.json({
                    version: 'v1',
                    data: { id: 1, name: 'Test' }
                });
            }
        );

        // V2 - current endpoint
        app.get('/api/v2/resource', (req, res) => {
            res.json({
                version: 'v2',
                data: {
                    id: 1,
                    name: 'Test',
                    createdAt: new Date().toISOString()
                }
            });
        });

        // Test v1 with deprecation
        const v1Response = await request(app)
            .get('/api/v1/resource')
            .expect(200);

        expect(v1Response.body.version).toBe('v1');
        expect(v1Response.headers['deprecation']).toBe('true');
        expect(v1Response.headers['x-api-alternate']).toBe('/api/v2/resource');

        // Test v2 without deprecation
        const v2Response = await request(app)
            .get('/api/v2/resource')
            .expect(200);

        expect(v2Response.body.version).toBe('v2');
        expect(v2Response.headers['deprecation']).toBeUndefined();
        expect(v2Response.body.data.createdAt).toBeDefined();
    });
});
