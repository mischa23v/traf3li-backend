/**
 * Cookie Security Configuration Unit Tests
 *
 * Comprehensive tests for cookie security settings:
 * 1. HttpOnly flag - verify httpOnly is set to true
 * 2. Secure flag in production - verify secure flag set when NODE_ENV=production
 * 3. SameSite attribute - verify correct SameSite values (lax/none)
 * 4. Same-origin proxy detection - verify proxy detection works
 * 5. Cross-origin cookie config - verify sameSite=none with secure for cross-origin
 * 6. Cookie domain - verify domain is set correctly for subdomains
 * 7. Access token expiry - verify 15-minute maxAge
 * 8. Refresh token expiry - verify 7-day maxAge
 * 9. Logout clears cookies - verify cookies cleared on logout
 */

// Mock dependencies before importing the controller
jest.mock('mongoose', () => ({
    connect: jest.fn(),
    connection: {
        readyState: 0,
        collections: {}
    },
    disconnect: jest.fn(),
    Types: {
        ObjectId: jest.fn()
    }
}));

jest.mock('bcrypt', () => ({
    hash: jest.fn(),
    compare: jest.fn(),
    hashSync: jest.fn()
}));

jest.mock('../../../src/models', () => ({
    User: {
        findOne: jest.fn(),
        findById: jest.fn(),
        findByIdAndUpdate: jest.fn()
    },
    Firm: {
        findById: jest.fn()
    },
    FirmInvitation: {
        findValidByCode: jest.fn()
    }
}));

jest.mock('../../../src/utils/passwordPolicy', () => ({
    validatePassword: jest.fn()
}));

jest.mock('../../../src/services/auditLog.service', () => ({
    log: jest.fn().mockResolvedValue({})
}));

jest.mock('../../../src/services/accountLockout.service', () => ({
    isAccountLocked: jest.fn(),
    recordFailedAttempt: jest.fn(),
    clearFailedAttempts: jest.fn()
}));

jest.mock('../../../src/services/sessionManager.service', () => ({
    createSession: jest.fn(),
    getSessionLimit: jest.fn(),
    enforceSessionLimit: jest.fn()
}));

jest.mock('../../../src/utils/contextLogger', () => ({
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    audit: jest.fn()
}));

jest.mock('../../../src/services/refreshToken.service', () => ({
    createRefreshToken: jest.fn(),
    revokeRefreshToken: jest.fn()
}));

jest.mock('../../../src/utils/generateToken', () => ({
    generateAccessToken: jest.fn()
}));

jest.mock('../../../src/services/mfa.service', () => ({
    useBackupCode: jest.fn(),
    decryptMFASecret: jest.fn(),
    verifyTOTP: jest.fn()
}));

jest.mock('../../../src/services/magicLink.service', () => ({
    sendMagicLink: jest.fn(),
    verifyMagicLink: jest.fn()
}));

jest.mock('../../../src/services/emailVerification.service', () => ({
    sendVerificationEmail: jest.fn(),
    verifyEmail: jest.fn(),
    resendVerificationEmail: jest.fn()
}));

jest.mock('../../../src/middlewares/sessionTimeout.middleware', () => ({
    recordActivity: jest.fn(),
    clearSessionActivity: jest.fn()
}));

jest.mock('../../../src/utils/backupCodes', () => ({
    validateBackupCodeFormat: jest.fn()
}));

describe('Cookie Security Configuration Tests', () => {
    let originalEnv;
    let getCookieConfig;
    let getCookieDomain;

    /**
     * Helper to reload the auth controller with new environment variables
     * This is necessary because isProductionEnv is computed at module load time
     */
    const reloadAuthController = () => {
        jest.resetModules();
        const authController = require('../../../src/controllers/auth.controller');
        getCookieConfig = authController.getCookieConfig;
        getCookieDomain = authController.getCookieDomain;
    };

    beforeAll(() => {
        // Save original environment variables
        originalEnv = { ...process.env };
    });

    beforeEach(() => {
        // Reset environment to test defaults
        process.env.NODE_ENV = 'test';
        delete process.env.RENDER;
        delete process.env.VERCEL_ENV;
        delete process.env.RAILWAY_ENVIRONMENT;

        // Reload module with test environment
        reloadAuthController();
    });

    afterAll(() => {
        // Restore original environment
        process.env = originalEnv;
    });

    // ========================================================================
    // 1. HTTPONLY FLAG - Verify httpOnly is ALWAYS set to true
    // ========================================================================

    describe('1. HttpOnly Flag Security', () => {
        it('should set httpOnly to true for same-origin proxy requests', () => {
            const request = {
                headers: {
                    origin: 'https://dashboard.traf3li.com',
                    'x-forwarded-host': 'dashboard.traf3li.com',
                    host: 'api.traf3li.com'
                }
            };

            const config = getCookieConfig(request, 'access');

            expect(config.httpOnly).toBe(true);
        });

        it('should set httpOnly to true for cross-origin requests', () => {
            const request = {
                headers: {
                    origin: 'https://dashboard.traf3li.com',
                    host: 'api.traf3li.com'
                }
            };

            const config = getCookieConfig(request, 'access');

            expect(config.httpOnly).toBe(true);
        });

        it('should set httpOnly to true in production environment', () => {
            process.env.NODE_ENV = 'production';
            reloadAuthController();

            const request = {
                headers: {
                    origin: 'https://dashboard.traf3li.com',
                    host: 'api.traf3li.com'
                }
            };

            const config = getCookieConfig(request, 'access');

            expect(config.httpOnly).toBe(true);
        });

        it('should set httpOnly to true in development environment', () => {
            process.env.NODE_ENV = 'development';

            const request = {
                headers: {
                    origin: 'http://localhost:3000',
                    host: 'localhost:5000'
                }
            };

            const config = getCookieConfig(request, 'access');

            expect(config.httpOnly).toBe(true);
        });
    });

    // ========================================================================
    // 2. SECURE FLAG IN PRODUCTION - Verify secure flag for HTTPS
    // ========================================================================

    describe('2. Secure Flag in Production', () => {
        it('should set secure to true when NODE_ENV=production', () => {
            process.env.NODE_ENV = 'production';
            reloadAuthController();

            const request = {
                headers: {
                    origin: 'https://dashboard.traf3li.com',
                    host: 'api.traf3li.com'
                }
            };

            const config = getCookieConfig(request, 'access');

            expect(config.secure).toBe(true);
        });

        it('should set secure to true when RENDER=true (production indicator)', () => {
            process.env.RENDER = 'true';
            reloadAuthController();

            const request = {
                headers: {
                    origin: 'https://dashboard.traf3li.com',
                    host: 'api.traf3li.com'
                }
            };

            const config = getCookieConfig(request, 'access');

            expect(config.secure).toBe(true);
        });

        it('should set secure to true when VERCEL_ENV=production', () => {
            process.env.VERCEL_ENV = 'production';
            reloadAuthController();

            const request = {
                headers: {
                    origin: 'https://dashboard.traf3li.com',
                    host: 'api.traf3li.com'
                }
            };

            const config = getCookieConfig(request, 'access');

            expect(config.secure).toBe(true);
        });

        it('should set secure to true when RAILWAY_ENVIRONMENT=production', () => {
            process.env.RAILWAY_ENVIRONMENT = 'production';
            reloadAuthController();

            const request = {
                headers: {
                    origin: 'https://dashboard.traf3li.com',
                    host: 'api.traf3li.com'
                }
            };

            const config = getCookieConfig(request, 'access');

            expect(config.secure).toBe(true);
        });

        it('should set secure to false in development/test environment', () => {
            process.env.NODE_ENV = 'development';

            const request = {
                headers: {
                    origin: 'http://localhost:3000',
                    host: 'localhost:5000'
                }
            };

            const config = getCookieConfig(request, 'access');

            expect(config.secure).toBe(false);
        });
    });

    // ========================================================================
    // 3. SAMESITE ATTRIBUTE - Verify correct SameSite values
    // ========================================================================

    describe('3. SameSite Attribute Configuration', () => {
        it('should set sameSite to "lax" for same-origin proxy requests', () => {
            const request = {
                headers: {
                    origin: 'https://dashboard.traf3li.com',
                    'x-forwarded-host': 'dashboard.traf3li.com',
                    host: 'backend.render.com'
                }
            };

            const config = getCookieConfig(request, 'access');

            expect(config.sameSite).toBe('lax');
        });

        it('should set sameSite to "none" for cross-origin requests in production', () => {
            process.env.NODE_ENV = 'production';
            reloadAuthController();

            const request = {
                headers: {
                    origin: 'https://dashboard.traf3li.com',
                    host: 'api.traf3li.com'
                }
            };

            const config = getCookieConfig(request, 'access');

            expect(config.sameSite).toBe('none');
        });

        it('should set sameSite to "lax" for cross-origin requests in development', () => {
            process.env.NODE_ENV = 'development';

            const request = {
                headers: {
                    origin: 'http://localhost:3000',
                    host: 'localhost:5000'
                }
            };

            const config = getCookieConfig(request, 'access');

            expect(config.sameSite).toBe('lax');
        });

        it('should set sameSite to "lax" for localhost development', () => {
            process.env.NODE_ENV = 'test';

            const request = {
                headers: {
                    origin: 'http://localhost:3000',
                    host: 'localhost:5000'
                }
            };

            const config = getCookieConfig(request, 'access');

            expect(config.sameSite).toBe('lax');
        });
    });

    // ========================================================================
    // 4. SAME-ORIGIN PROXY DETECTION - Verify proxy detection logic
    // ========================================================================

    describe('4. Same-Origin Proxy Detection', () => {
        it('should detect same-origin when x-forwarded-host matches origin host', () => {
            const request = {
                headers: {
                    origin: 'https://dashboard.traf3li.com',
                    'x-forwarded-host': 'dashboard.traf3li.com',
                    host: 'backend.render.com'
                }
            };

            const config = getCookieConfig(request, 'access');

            // Same-origin proxy should use 'lax' sameSite
            expect(config.sameSite).toBe('lax');
            expect(config.domain).toBeUndefined();
        });

        it('should detect cross-origin when host does not match origin', () => {
            process.env.NODE_ENV = 'production';
            reloadAuthController();

            const request = {
                headers: {
                    origin: 'https://dashboard.traf3li.com',
                    host: 'api.traf3li.com'
                }
            };

            const config = getCookieConfig(request, 'access');

            // Cross-origin in production should use 'none', not 'lax'
            expect(config.sameSite).toBe('none');
            expect(config.sameSite).not.toBe('lax');
        });

        it('should handle missing origin header as cross-origin', () => {
            const request = {
                headers: {
                    host: 'api.traf3li.com'
                }
            };

            const config = getCookieConfig(request, 'access');

            // No origin means potentially cross-origin, should be safe
            expect(config).toBeDefined();
            expect(config.httpOnly).toBe(true);
        });

        it('should prioritize x-forwarded-host over host header', () => {
            const request = {
                headers: {
                    origin: 'https://app.vercel.app',
                    'x-forwarded-host': 'app.vercel.app',
                    host: 'backend.render.com'
                }
            };

            const config = getCookieConfig(request, 'access');

            // Should use x-forwarded-host for comparison
            expect(config.sameSite).toBe('lax');
        });
    });

    // ========================================================================
    // 5. CROSS-ORIGIN COOKIE CONFIG - Verify sameSite=none with secure
    // ========================================================================

    describe('5. Cross-Origin Cookie Configuration', () => {
        it('should set sameSite=none and secure=true for cross-origin in production', () => {
            process.env.NODE_ENV = 'production';
            reloadAuthController();

            const request = {
                headers: {
                    origin: 'https://dashboard.traf3li.com',
                    host: 'api.traf3li.com'
                }
            };

            const config = getCookieConfig(request, 'access');

            expect(config.sameSite).toBe('none');
            expect(config.secure).toBe(true);
        });

        it('should set partitioned=true for cross-origin in production (CHIPS)', () => {
            process.env.NODE_ENV = 'production';
            reloadAuthController();

            const request = {
                headers: {
                    origin: 'https://dashboard.traf3li.com',
                    host: 'api.traf3li.com'
                }
            };

            const config = getCookieConfig(request, 'access');

            expect(config.partitioned).toBe(true);
        });

        it('should NOT set partitioned for same-origin proxy', () => {
            const request = {
                headers: {
                    origin: 'https://dashboard.traf3li.com',
                    'x-forwarded-host': 'dashboard.traf3li.com',
                    host: 'backend.render.com'
                }
            };

            const config = getCookieConfig(request, 'access');

            expect(config.partitioned).toBeUndefined();
        });

        it('should NOT set partitioned in development', () => {
            process.env.NODE_ENV = 'development';

            const request = {
                headers: {
                    origin: 'http://localhost:3000',
                    host: 'localhost:5000'
                }
            };

            const config = getCookieConfig(request, 'access');

            expect(config.partitioned).toBe(false);
        });
    });

    // ========================================================================
    // 6. COOKIE DOMAIN - Verify domain set correctly for subdomains
    // ========================================================================

    describe('6. Cookie Domain Configuration', () => {
        it('should set domain to .traf3li.com for traf3li.com subdomains in production', () => {
            process.env.NODE_ENV = 'production';
            reloadAuthController();

            const request = {
                headers: {
                    origin: 'https://dashboard.traf3li.com',
                    host: 'api.traf3li.com'
                }
            };

            const domain = getCookieDomain(request);

            expect(domain).toBe('.traf3li.com');
        });

        it('should set domain to .traf3li.com for www.traf3li.com in production', () => {
            process.env.NODE_ENV = 'production';
            reloadAuthController();

            const request = {
                headers: {
                    origin: 'https://www.traf3li.com',
                    host: 'api.traf3li.com'
                }
            };

            const domain = getCookieDomain(request);

            expect(domain).toBe('.traf3li.com');
        });

        it('should NOT set domain for same-origin proxy requests', () => {
            process.env.NODE_ENV = 'production';
            reloadAuthController();

            const request = {
                headers: {
                    origin: 'https://dashboard.vercel.app',
                    'x-forwarded-host': 'dashboard.vercel.app',
                    host: 'backend.render.com'
                }
            };

            const domain = getCookieDomain(request);

            expect(domain).toBeUndefined();
        });

        it('should NOT set domain for non-traf3li.com origins', () => {
            process.env.NODE_ENV = 'production';
            reloadAuthController();

            const request = {
                headers: {
                    origin: 'https://dashboard.vercel.app',
                    host: 'api.vercel.app'
                }
            };

            const domain = getCookieDomain(request);

            expect(domain).toBeUndefined();
        });

        it('should NOT set domain in development environment', () => {
            process.env.NODE_ENV = 'development';

            const request = {
                headers: {
                    origin: 'http://localhost:3000',
                    host: 'localhost:5000'
                }
            };

            const domain = getCookieDomain(request);

            expect(domain).toBeUndefined();
        });

        it('should handle referer header if origin is missing', () => {
            process.env.NODE_ENV = 'production';
            reloadAuthController();

            const request = {
                headers: {
                    referer: 'https://dashboard.traf3li.com/login',
                    host: 'api.traf3li.com'
                }
            };

            const domain = getCookieDomain(request);

            expect(domain).toBe('.traf3li.com');
        });
    });

    // ========================================================================
    // 7. ACCESS TOKEN EXPIRY - Verify 15-minute maxAge
    // ========================================================================

    describe('7. Access Token Expiry (15 minutes)', () => {
        const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;

        it('should set maxAge to 15 minutes for access token', () => {
            const request = {
                headers: {
                    origin: 'https://dashboard.traf3li.com',
                    host: 'api.traf3li.com'
                }
            };

            const config = getCookieConfig(request, 'access');

            expect(config.maxAge).toBe(FIFTEEN_MINUTES_MS);
        });

        it('should set maxAge to 15 minutes (900000ms) for access token', () => {
            const request = {
                headers: {
                    origin: 'https://dashboard.traf3li.com',
                    host: 'api.traf3li.com'
                }
            };

            const config = getCookieConfig(request, 'access');

            expect(config.maxAge).toBe(900000); // 15 * 60 * 1000
        });

        it('should default to access token expiry when tokenType is not specified', () => {
            const request = {
                headers: {
                    origin: 'https://dashboard.traf3li.com',
                    host: 'api.traf3li.com'
                }
            };

            const configDefault = getCookieConfig(request);
            const configAccess = getCookieConfig(request, 'access');

            expect(configDefault.maxAge).toBe(configAccess.maxAge);
            expect(configDefault.maxAge).toBe(FIFTEEN_MINUTES_MS);
        });

        it('should set path to / for access token cookie', () => {
            const request = {
                headers: {
                    origin: 'https://dashboard.traf3li.com',
                    host: 'api.traf3li.com'
                }
            };

            const config = getCookieConfig(request, 'access');

            expect(config.path).toBe('/');
        });
    });

    // ========================================================================
    // 8. REFRESH TOKEN EXPIRY - Verify 7-day maxAge
    // ========================================================================

    describe('8. Refresh Token Expiry (7 days)', () => {
        const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

        it('should set maxAge to 7 days for refresh token', () => {
            const request = {
                headers: {
                    origin: 'https://dashboard.traf3li.com',
                    host: 'api.traf3li.com'
                }
            };

            const config = getCookieConfig(request, 'refresh');

            expect(config.maxAge).toBe(SEVEN_DAYS_MS);
        });

        it('should set maxAge to 7 days (604800000ms) for refresh token', () => {
            const request = {
                headers: {
                    origin: 'https://dashboard.traf3li.com',
                    host: 'api.traf3li.com'
                }
            };

            const config = getCookieConfig(request, 'refresh');

            expect(config.maxAge).toBe(604800000); // 7 * 24 * 60 * 60 * 1000
        });

        it('should set refresh token maxAge longer than access token', () => {
            const request = {
                headers: {
                    origin: 'https://dashboard.traf3li.com',
                    host: 'api.traf3li.com'
                }
            };

            const accessConfig = getCookieConfig(request, 'access');
            const refreshConfig = getCookieConfig(request, 'refresh');

            expect(refreshConfig.maxAge).toBeGreaterThan(accessConfig.maxAge);
        });

        it('should set path to / for refresh token cookie', () => {
            const request = {
                headers: {
                    origin: 'https://dashboard.traf3li.com',
                    host: 'api.traf3li.com'
                }
            };

            const config = getCookieConfig(request, 'refresh');

            expect(config.path).toBe('/');
        });
    });

    // ========================================================================
    // 9. LOGOUT CLEARS COOKIES - Verify cookie clearing config
    // ========================================================================

    describe('9. Logout Cookie Clearing Configuration', () => {
        it('should return same config for clearing cookies on logout', () => {
            const request = {
                headers: {
                    origin: 'https://dashboard.traf3li.com',
                    host: 'api.traf3li.com'
                }
            };

            const loginConfig = getCookieConfig(request, 'access');
            const logoutConfig = getCookieConfig(request, 'access');

            // Config should be identical for proper cookie clearing
            expect(logoutConfig.httpOnly).toBe(loginConfig.httpOnly);
            expect(logoutConfig.sameSite).toBe(loginConfig.sameSite);
            expect(logoutConfig.secure).toBe(loginConfig.secure);
            expect(logoutConfig.path).toBe(loginConfig.path);
        });

        it('should maintain domain consistency between login and logout', () => {
            process.env.NODE_ENV = 'production';
            reloadAuthController();

            const request = {
                headers: {
                    origin: 'https://dashboard.traf3li.com',
                    host: 'api.traf3li.com'
                }
            };

            const loginConfig = getCookieConfig(request, 'access');
            const logoutConfig = getCookieConfig(request, 'access');

            expect(loginConfig.domain).toBe(logoutConfig.domain);
        });

        it('should maintain sameSite consistency for same-origin proxy', () => {
            const request = {
                headers: {
                    origin: 'https://dashboard.traf3li.com',
                    'x-forwarded-host': 'dashboard.traf3li.com',
                    host: 'backend.render.com'
                }
            };

            const loginConfig = getCookieConfig(request, 'access');
            const logoutConfig = getCookieConfig(request, 'access');

            expect(loginConfig.sameSite).toBe('lax');
            expect(logoutConfig.sameSite).toBe('lax');
        });

        it('should maintain config for cross-origin logout in production', () => {
            process.env.NODE_ENV = 'production';
            reloadAuthController();

            const request = {
                headers: {
                    origin: 'https://dashboard.traf3li.com',
                    host: 'api.traf3li.com'
                }
            };

            const loginConfig = getCookieConfig(request, 'access');
            const logoutConfig = getCookieConfig(request, 'access');

            // Cross-origin production settings
            expect(logoutConfig.sameSite).toBe('none');
            expect(logoutConfig.secure).toBe(true);
            expect(logoutConfig.partitioned).toBe(true);

            // Should match login config exactly
            expect(JSON.stringify(logoutConfig)).toBe(JSON.stringify(loginConfig));
        });

        it('should clear both access and refresh tokens with consistent config', () => {
            process.env.NODE_ENV = 'production';
            reloadAuthController();

            const request = {
                headers: {
                    origin: 'https://dashboard.traf3li.com',
                    host: 'api.traf3li.com'
                }
            };

            const accessConfig = getCookieConfig(request, 'access');
            const refreshConfig = getCookieConfig(request, 'refresh');

            // Both should have same security settings except maxAge
            expect(accessConfig.httpOnly).toBe(refreshConfig.httpOnly);
            expect(accessConfig.sameSite).toBe(refreshConfig.sameSite);
            expect(accessConfig.secure).toBe(refreshConfig.secure);
            expect(accessConfig.path).toBe(refreshConfig.path);
            expect(accessConfig.domain).toBe(refreshConfig.domain);

            // Only maxAge should differ
            expect(accessConfig.maxAge).not.toBe(refreshConfig.maxAge);
        });
    });

    // ========================================================================
    // INTEGRATION TESTS - Combined scenarios
    // ========================================================================

    describe('Integration: Combined Security Scenarios', () => {
        it('should handle complete production cross-origin flow', () => {
            process.env.NODE_ENV = 'production';
            reloadAuthController();

            const request = {
                headers: {
                    origin: 'https://dashboard.traf3li.com',
                    host: 'api.traf3li.com'
                }
            };

            const accessConfig = getCookieConfig(request, 'access');
            const refreshConfig = getCookieConfig(request, 'refresh');

            // Verify all security flags for access token
            expect(accessConfig).toMatchObject({
                httpOnly: true,
                sameSite: 'none',
                secure: true,
                maxAge: 15 * 60 * 1000,
                path: '/',
                domain: '.traf3li.com',
                partitioned: true
            });

            // Verify all security flags for refresh token
            expect(refreshConfig).toMatchObject({
                httpOnly: true,
                sameSite: 'none',
                secure: true,
                maxAge: 7 * 24 * 60 * 60 * 1000,
                path: '/',
                domain: '.traf3li.com',
                partitioned: true
            });
        });

        it('should handle complete development localhost flow', () => {
            process.env.NODE_ENV = 'development';

            const request = {
                headers: {
                    origin: 'http://localhost:3000',
                    host: 'localhost:5000'
                }
            };

            const accessConfig = getCookieConfig(request, 'access');

            expect(accessConfig).toMatchObject({
                httpOnly: true,
                sameSite: 'lax',
                secure: false,
                maxAge: 15 * 60 * 1000,
                path: '/'
            });
        });

        it('should handle complete same-origin proxy flow (Vercel)', () => {
            process.env.NODE_ENV = 'production';
            reloadAuthController();

            const request = {
                headers: {
                    origin: 'https://app.vercel.app',
                    'x-forwarded-host': 'app.vercel.app',
                    host: 'backend.render.com'
                }
            };

            const config = getCookieConfig(request, 'access');

            expect(config).toMatchObject({
                httpOnly: true,
                sameSite: 'lax',
                secure: true,
                maxAge: 15 * 60 * 1000,
                path: '/'
            });

            // Should NOT have domain or partitioned for same-origin
            expect(config.domain).toBeUndefined();
            expect(config.partitioned).toBeUndefined();
        });
    });
});
