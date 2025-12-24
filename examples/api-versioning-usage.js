/**
 * API Versioning Usage Examples
 *
 * This file demonstrates how to use the API versioning and deprecation middleware
 * in your routes.
 */

const express = require('express');
const router = express.Router();
const {
    deprecationWarning,
    softDeprecationWarning,
    endpointRemovalWarning
} = require('../src/middlewares/deprecation.middleware');
const { authenticate } = require('../src/middlewares/authenticate');

// ============================================
// EXAMPLE 1: Standard Endpoint (No Deprecation)
// ============================================
// Current stable endpoint with no deprecation
router.get('/api/v1/cases', authenticate, (req, res) => {
    res.json({
        success: true,
        data: {
            cases: []
        },
        meta: {
            apiVersion: req.apiVersion,
            timestamp: new Date().toISOString()
        }
    });
});

// ============================================
// EXAMPLE 2: Deprecated Endpoint
// ============================================
// Endpoint that is deprecated and will be removed soon
router.get('/api/v1/old-cases',
    authenticate,
    deprecationWarning('v1', '2025-12-31', '/api/v2/cases'),
    (req, res) => {
        res.json({
            success: true,
            data: {
                cases: []
            },
            meta: {
                apiVersion: req.apiVersion,
                deprecated: true,
                sunsetDate: '2025-12-31',
                alternateEndpoint: '/api/v2/cases',
                timestamp: new Date().toISOString()
            }
        });
    }
);

// ============================================
// EXAMPLE 3: Soft Deprecation (Future Warning)
// ============================================
// Endpoint that will be deprecated in the future
// Give clients advance notice to plan migration
router.get('/api/v1/clients',
    authenticate,
    softDeprecationWarning('v1', '2025-06-30', '2025-12-31', '/api/v2/clients'),
    (req, res) => {
        res.json({
            success: true,
            data: {
                clients: []
            },
            meta: {
                apiVersion: req.apiVersion,
                futureDeprecation: '2025-06-30',
                plannedSunset: '2025-12-31',
                recommendedAlternative: '/api/v2/clients',
                timestamp: new Date().toISOString()
            }
        });
    }
);

// ============================================
// EXAMPLE 4: Sunset Endpoint (Removed)
// ============================================
// Endpoint that has been removed - returns 410 Gone
router.get('/api/v0/legacy-endpoint',
    endpointRemovalWarning('v0', '2024-12-31', '/api/v2/new-endpoint'),
    (req, res) => {
        // This handler won't be reached - middleware returns 410
        res.json({ success: false });
    }
);

// ============================================
// EXAMPLE 5: Sunset with Automatic Redirect
// ============================================
// Endpoint that redirects to new version
router.get('/api/v0/redirect-endpoint',
    endpointRemovalWarning('v0', '2024-12-31', '/api/v2/new-endpoint', true),
    (req, res) => {
        // This handler won't be reached - middleware returns 301
        res.json({ success: false });
    }
);

// ============================================
// EXAMPLE 6: Version-Specific Implementation
// ============================================
// Same endpoint, different implementations for v1 and v2

// V1 implementation - deprecated
router.get('/api/v1/invoices',
    authenticate,
    deprecationWarning('v1', '2025-12-31', '/api/v2/invoices'),
    (req, res) => {
        // Old format
        res.json({
            success: true,
            invoices: [
                { id: 1, amount: 100, date: '2024-01-01' }
            ]
        });
    }
);

// V2 implementation - new format with enhanced data
router.get('/api/v2/invoices',
    authenticate,
    (req, res) => {
        // New format with additional fields
        res.json({
            success: true,
            data: {
                invoices: [
                    {
                        id: 1,
                        amount: 100,
                        currency: 'USD',
                        date: '2024-01-01',
                        status: 'paid',
                        client: {
                            id: 1,
                            name: 'John Doe'
                        }
                    }
                ],
                pagination: {
                    page: 1,
                    limit: 10,
                    total: 1,
                    hasMore: false
                }
            },
            meta: {
                apiVersion: 'v2',
                timestamp: new Date().toISOString()
            }
        });
    }
);

// ============================================
// EXAMPLE 7: Conditional Deprecation
// ============================================
// Deprecate only for certain query parameters
router.get('/api/v1/reports',
    authenticate,
    (req, res, next) => {
        // Apply deprecation only when using old filter parameter
        if (req.query.oldFilter) {
            return deprecationWarning('v1', '2025-12-31', '/api/v2/reports?filter=new')(req, res, next);
        }
        next();
    },
    (req, res) => {
        res.json({
            success: true,
            data: {
                reports: []
            }
        });
    }
);

// ============================================
// EXAMPLE 8: Multiple Version Support
// ============================================
// Support multiple versions with shared logic

const generateCaseData = (version) => {
    const baseData = {
        id: 1,
        title: 'Case Title',
        status: 'open'
    };

    // Add version-specific fields
    if (version === 'v2') {
        return {
            ...baseData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            tags: ['legal', 'urgent'],
            assignees: [{ id: 1, name: 'John Doe' }]
        };
    }

    return baseData;
};

router.get('/api/:version(v1|v2)/cases/:id',
    authenticate,
    (req, res, next) => {
        // Apply deprecation warning for v1
        if (req.params.version === 'v1') {
            return deprecationWarning('v1', '2025-12-31', '/api/v2/cases/:id')(req, res, next);
        }
        next();
    },
    (req, res) => {
        const version = req.params.version;
        res.json({
            success: true,
            data: generateCaseData(version),
            meta: {
                apiVersion: version,
                timestamp: new Date().toISOString()
            }
        });
    }
);

// ============================================
// EXAMPLE 9: Gradual Migration Pattern
// ============================================
// Use feature flags to gradually migrate endpoints

router.get('/api/v1/analytics',
    authenticate,
    (req, res, next) => {
        // Check if client is ready for v2 (via header or database flag)
        const isV2Ready = req.headers['x-api-prefer-v2'] === 'true';

        if (isV2Ready) {
            // Soft deprecation for clients that can migrate
            return softDeprecationWarning('v1', '2025-06-30', '2025-12-31', '/api/v2/analytics')(req, res, next);
        } else {
            // Regular deprecation warning
            return deprecationWarning('v1', '2025-12-31', '/api/v2/analytics')(req, res, next);
        }
    },
    (req, res) => {
        res.json({
            success: true,
            data: {
                analytics: []
            }
        });
    }
);

// ============================================
// EXAMPLE 10: Version Negotiation
// ============================================
// Let clients request their preferred version with fallback

router.get('/api/flexible/data',
    authenticate,
    (req, res) => {
        // Get version from request (already set by apiVersionMiddleware)
        const version = req.apiVersion || 'v1';

        // Apply deprecation based on version
        if (version === 'v1') {
            res.setHeader('Deprecation', 'true');
            res.setHeader('X-API-Deprecated-Version', 'v1');
            res.setHeader('X-API-Alternate', '/api/v2/flexible/data');
        }

        // Return version-appropriate response
        const response = {
            success: true,
            data: {
                items: []
            },
            meta: {
                apiVersion: version,
                timestamp: new Date().toISOString()
            }
        };

        res.json(response);
    }
);

// ============================================
// CLIENT-SIDE USAGE EXAMPLES
// ============================================

/*
// Example 1: Handling deprecation headers in client

async function fetchCases() {
    const response = await fetch('/api/v1/cases', {
        headers: {
            'Authorization': 'Bearer token'
        }
    });

    // Check for deprecation warnings
    if (response.headers.get('Deprecation')) {
        const sunsetDate = response.headers.get('X-API-Sunset-Date');
        const alternateUrl = response.headers.get('X-API-Alternate');

        console.warn(`⚠️ API Deprecated! Will be removed on ${sunsetDate}`);
        console.warn(`Please migrate to: ${alternateUrl}`);

        // Optional: Send telemetry to track deprecation usage
        sendTelemetry('deprecated_api_used', {
            endpoint: '/api/v1/cases',
            sunsetDate,
            alternateUrl
        });
    }

    return response.json();
}

// Example 2: Automatic version upgrade

class APIClient {
    constructor() {
        this.preferredVersion = 'v2';
        this.fallbackVersion = 'v1';
    }

    async request(endpoint, options = {}) {
        // Try preferred version first
        let response = await fetch(`/api/${this.preferredVersion}${endpoint}`, options);

        // If not found, fallback to v1
        if (response.status === 404) {
            response = await fetch(`/api/${this.fallbackVersion}${endpoint}`, options);
        }

        // Check for sunset/deprecation
        if (response.status === 410) {
            const alternateUrl = response.headers.get('X-API-Alternate');
            if (alternateUrl) {
                // Retry with alternate URL
                response = await fetch(alternateUrl, options);
            } else {
                throw new Error('API endpoint has been removed');
            }
        }

        return response.json();
    }
}

const api = new APIClient();
const cases = await api.request('/cases');

// Example 3: Version-aware caching

class CachedAPIClient {
    constructor() {
        this.cache = new Map();
    }

    getCacheKey(url) {
        // Include version in cache key
        const version = url.match(/\/api\/(v\d+)/)?.[1] || 'v1';
        return `${version}:${url}`;
    }

    async get(url) {
        const cacheKey = this.getCacheKey(url);

        // Check cache
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        // Fetch and cache
        const response = await fetch(url);
        const data = await response.json();

        // Check if deprecated - shorter cache TTL
        const isDeprecated = response.headers.get('Deprecation') === 'true';
        const ttl = isDeprecated ? 60000 : 300000; // 1min vs 5min

        this.cache.set(cacheKey, data);
        setTimeout(() => this.cache.delete(cacheKey), ttl);

        return data;
    }
}
*/

module.exports = router;
