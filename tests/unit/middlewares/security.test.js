/**
 * Security Middleware Unit Tests
 * Tests for CSRF validation, origin check, sanitization, and security headers
 */

const crypto = require('crypto');
const {
    originCheck,
    noCache,
    validateContentType,
    setCsrfToken,
    validateCsrfToken,
    securityHeaders,
    sanitizeRequest
} = require('../../../src/middlewares/security.middleware');

describe('Security Middleware Unit Tests', () => {
    let req, res, next;

    beforeEach(() => {
        req = testUtils.mockRequest();
        res = testUtils.mockResponse();
        next = testUtils.mockNext();
    });

    // ============ CSRF VALIDATION ============

    describe('CSRF Token Validation', () => {
        it('should generate CSRF token if not exists', () => {
            req.cookies = {};

            setCsrfToken(req, res, next);

            expect(res.cookie).toHaveBeenCalled();
            const cookieCall = res.cookie.mock.calls[0];
            expect(cookieCall[0]).toBe('csrf-token');
            expect(cookieCall[1]).toHaveLength(64); // 32 bytes = 64 hex chars
            expect(res.locals.csrfToken).toBeDefined();
            expect(next).toHaveBeenCalled();
        });

        it('should not regenerate CSRF token if exists', () => {
            const existingToken = crypto.randomBytes(32).toString('hex');
            req.cookies = { 'csrf-token': existingToken };

            setCsrfToken(req, res, next);

            expect(res.cookie).not.toHaveBeenCalled();
            expect(res.locals.csrfToken).toBe(existingToken);
            expect(next).toHaveBeenCalled();
        });

        it('should skip CSRF validation for GET requests', () => {
            req.method = 'GET';
            req.cookies = {};

            validateCsrfToken(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(res.status).not.toHaveBeenCalled();
        });

        it('should skip CSRF validation for HEAD requests', () => {
            req.method = 'HEAD';
            req.cookies = {};

            validateCsrfToken(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(res.status).not.toHaveBeenCalled();
        });

        it('should skip CSRF validation for OPTIONS requests', () => {
            req.method = 'OPTIONS';
            req.cookies = {};

            validateCsrfToken(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(res.status).not.toHaveBeenCalled();
        });

        it('should validate matching CSRF tokens', () => {
            const token = crypto.randomBytes(32).toString('hex');
            req.method = 'POST';
            req.cookies = { 'csrf-token': token };
            req.headers = { 'x-csrf-token': token };

            validateCsrfToken(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(res.status).not.toHaveBeenCalled();
        });

        it('should reject request with missing cookie token', () => {
            req.method = 'POST';
            req.cookies = {};
            req.headers = { 'x-csrf-token': 'some-token' };

            validateCsrfToken(req, res, next);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    error: true,
                    message: expect.stringContaining('CSRF token missing')
                })
            );
            expect(next).not.toHaveBeenCalled();
        });

        it('should reject request with missing header token', () => {
            const token = crypto.randomBytes(32).toString('hex');
            req.method = 'POST';
            req.cookies = { 'csrf-token': token };
            req.headers = {};

            validateCsrfToken(req, res, next);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    error: true,
                    message: expect.stringContaining('CSRF token required')
                })
            );
            expect(next).not.toHaveBeenCalled();
        });

        it('should reject mismatched CSRF tokens', () => {
            const token1 = crypto.randomBytes(32).toString('hex');
            const token2 = crypto.randomBytes(32).toString('hex');
            req.method = 'POST';
            req.cookies = { 'csrf-token': token1 };
            req.headers = { 'x-csrf-token': token2 };

            validateCsrfToken(req, res, next);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    error: true,
                    message: 'Invalid CSRF token'
                })
            );
            expect(next).not.toHaveBeenCalled();
        });

        it('should accept x-xsrf-token header', () => {
            const token = crypto.randomBytes(32).toString('hex');
            req.method = 'POST';
            req.cookies = { 'csrf-token': token };
            req.headers = { 'x-xsrf-token': token };

            validateCsrfToken(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(res.status).not.toHaveBeenCalled();
        });

        it('should use constant-time comparison for tokens', () => {
            const token = crypto.randomBytes(32).toString('hex');
            const differentToken = token.slice(0, -1) + '0';

            req.method = 'POST';
            req.cookies = { 'csrf-token': token };
            req.headers = { 'x-csrf-token': differentToken };

            validateCsrfToken(req, res, next);

            expect(res.status).toHaveBeenCalledWith(403);
        });
    });

    // ============ ORIGIN CHECK ============

    describe('Origin Check', () => {
        it('should allow requests from allowed origins', () => {
            req.method = 'POST';
            req.headers.origin = 'http://localhost:5173';

            originCheck(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(res.status).not.toHaveBeenCalled();
        });

        it('should allow requests from production origin', () => {
            req.method = 'POST';
            req.headers.origin = 'https://traf3li.com';

            originCheck(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(res.status).not.toHaveBeenCalled();
        });

        it('should skip origin check for GET requests', () => {
            req.method = 'GET';
            req.headers.origin = 'https://malicious-site.com';

            originCheck(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(res.status).not.toHaveBeenCalled();
        });

        it('should skip origin check for HEAD requests', () => {
            req.method = 'HEAD';

            originCheck(req, res, next);

            expect(next).toHaveBeenCalled();
        });

        it('should skip origin check for OPTIONS requests', () => {
            req.method = 'OPTIONS';

            originCheck(req, res, next);

            expect(next).toHaveBeenCalled();
        });

        it('should allow requests without origin header', () => {
            req.method = 'POST';
            req.headers = {};

            originCheck(req, res, next);

            expect(next).toHaveBeenCalled();
        });

        it('should reject requests from disallowed origins', () => {
            req.method = 'POST';
            req.headers.origin = 'https://malicious-site.com';

            originCheck(req, res, next);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    error: true,
                    message: 'Origin not allowed'
                })
            );
            expect(next).not.toHaveBeenCalled();
        });

        it('should reject requests with invalid origin URL', () => {
            req.method = 'POST';
            req.headers.origin = 'not-a-valid-url';

            originCheck(req, res, next);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    error: true,
                    message: 'Invalid origin'
                })
            );
            expect(next).not.toHaveBeenCalled();
        });

        it('should allow Vercel preview deployments', () => {
            req.method = 'POST';
            req.headers.origin = 'https://my-app-abc123.vercel.app';

            originCheck(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(res.status).not.toHaveBeenCalled();
        });

        it('should check referer header if origin not present', () => {
            req.method = 'POST';
            req.headers = { referer: 'http://localhost:5173/dashboard' };

            originCheck(req, res, next);

            expect(next).toHaveBeenCalled();
        });
    });

    // ============ NO CACHE MIDDLEWARE ============

    describe('No Cache Middleware', () => {
        it('should set no-cache headers', () => {
            noCache(req, res, next);

            expect(res.setHeader).toHaveBeenCalledWith(
                'Cache-Control',
                'no-store, no-cache, must-revalidate, private'
            );
            expect(res.setHeader).toHaveBeenCalledWith('Pragma', 'no-cache');
            expect(res.setHeader).toHaveBeenCalledWith('Expires', '0');
            expect(res.setHeader).toHaveBeenCalledWith('Surrogate-Control', 'no-store');
            expect(next).toHaveBeenCalled();
        });

        it('should call next after setting headers', () => {
            noCache(req, res, next);

            expect(next).toHaveBeenCalled();
        });
    });

    // ============ CONTENT TYPE VALIDATION ============

    describe('Content Type Validation', () => {
        it('should accept application/json for POST', () => {
            req.method = 'POST';
            req.headers['content-type'] = 'application/json';

            validateContentType(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(res.status).not.toHaveBeenCalled();
        });

        it('should accept application/json with charset for POST', () => {
            req.method = 'POST';
            req.headers['content-type'] = 'application/json; charset=utf-8';

            validateContentType(req, res, next);

            expect(next).toHaveBeenCalled();
        });

        it('should accept multipart/form-data for file uploads', () => {
            req.method = 'POST';
            req.headers['content-type'] = 'multipart/form-data; boundary=----WebKitFormBoundary';

            validateContentType(req, res, next);

            expect(next).toHaveBeenCalled();
        });

        it('should skip validation for GET requests', () => {
            req.method = 'GET';
            req.headers = {};

            validateContentType(req, res, next);

            expect(next).toHaveBeenCalled();
        });

        it('should skip validation for requests with Content-Length: 0', () => {
            req.method = 'POST';
            req.headers['content-length'] = '0';

            validateContentType(req, res, next);

            expect(next).toHaveBeenCalled();
        });

        it('should reject POST with missing Content-Type', () => {
            req.method = 'POST';
            req.headers = {};
            req.headers['content-length'] = '100';

            validateContentType(req, res, next);

            expect(res.status).toHaveBeenCalledWith(415);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    error: true,
                    message: expect.stringContaining('Content-Type must be')
                })
            );
            expect(next).not.toHaveBeenCalled();
        });

        it('should reject POST with invalid Content-Type', () => {
            req.method = 'POST';
            req.headers['content-type'] = 'text/plain';
            req.headers['content-length'] = '100';

            validateContentType(req, res, next);

            expect(res.status).toHaveBeenCalledWith(415);
            expect(next).not.toHaveBeenCalled();
        });

        it('should validate PUT requests', () => {
            req.method = 'PUT';
            req.headers['content-type'] = 'application/json';

            validateContentType(req, res, next);

            expect(next).toHaveBeenCalled();
        });

        it('should validate PATCH requests', () => {
            req.method = 'PATCH';
            req.headers['content-type'] = 'application/json';

            validateContentType(req, res, next);

            expect(next).toHaveBeenCalled();
        });
    });

    // ============ SECURITY HEADERS ============

    describe('Security Headers', () => {
        it('should set X-Content-Type-Options header', () => {
            securityHeaders(req, res, next);

            expect(res.setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
        });

        it('should set X-Frame-Options header', () => {
            securityHeaders(req, res, next);

            expect(res.setHeader).toHaveBeenCalledWith('X-Frame-Options', 'DENY');
        });

        it('should set X-XSS-Protection header', () => {
            securityHeaders(req, res, next);

            expect(res.setHeader).toHaveBeenCalledWith('X-XSS-Protection', '1; mode=block');
        });

        it('should remove X-Powered-By header', () => {
            securityHeaders(req, res, next);

            expect(res.removeHeader).toHaveBeenCalledWith('X-Powered-By');
        });

        it('should call next after setting headers', () => {
            securityHeaders(req, res, next);

            expect(next).toHaveBeenCalled();
        });
    });

    // ============ REQUEST SANITIZATION ============

    describe('Request Sanitization', () => {
        it('should remove null bytes from strings', () => {
            req.body = { username: 'test\0user' };

            sanitizeRequest(req, res, next);

            expect(req.body.username).toBe('testuser');
            expect(next).toHaveBeenCalled();
        });

        it('should sanitize nested objects', () => {
            req.body = {
                user: {
                    name: 'test\0name',
                    profile: {
                        bio: 'bio\0text'
                    }
                }
            };

            sanitizeRequest(req, res, next);

            expect(req.body.user.name).toBe('testname');
            expect(req.body.user.profile.bio).toBe('biotext');
        });

        it('should sanitize query parameters', () => {
            req.query = { search: 'term\0value' };

            sanitizeRequest(req, res, next);

            expect(req.query.search).toBe('termvalue');
        });

        it('should sanitize route params', () => {
            req.params = { id: 'value\0test' };

            sanitizeRequest(req, res, next);

            expect(req.params.id).toBe('valuetest');
        });

        it('should limit string length to prevent DoS', () => {
            const longString = 'a'.repeat(2000000); // 2MB
            req.body = { data: longString };

            sanitizeRequest(req, res, next);

            expect(req.body.data.length).toBe(1000000); // Trimmed to 1MB
        });

        it('should not modify non-string values', () => {
            req.body = {
                number: 123,
                boolean: true,
                nullValue: null,
                undefined: undefined
            };

            sanitizeRequest(req, res, next);

            expect(req.body.number).toBe(123);
            expect(req.body.boolean).toBe(true);
            expect(req.body.nullValue).toBeNull();
        });

        it('should sanitize arrays', () => {
            req.body = {
                items: ['value1\0', 'value2\0', 'value3']
            };

            sanitizeRequest(req, res, next);

            expect(req.body.items[0]).toBe('value1');
            expect(req.body.items[1]).toBe('value2');
            expect(req.body.items[2]).toBe('value3');
        });

        it('should handle empty objects', () => {
            req.body = {};
            req.query = {};
            req.params = {};

            sanitizeRequest(req, res, next);

            expect(next).toHaveBeenCalled();
        });

        it('should handle missing body/query/params', () => {
            delete req.body;
            delete req.query;
            delete req.params;

            sanitizeRequest(req, res, next);

            expect(next).toHaveBeenCalled();
        });
    });

    // ============ COMBINED MIDDLEWARE FLOW ============

    describe('Combined Middleware Flow', () => {
        it('should pass through all security middlewares', () => {
            const token = crypto.randomBytes(32).toString('hex');

            // Set CSRF token
            req.cookies = {};
            setCsrfToken(req, res, next);
            expect(next).toHaveBeenCalledTimes(1);

            // Validate CSRF
            req.method = 'POST';
            req.cookies = { 'csrf-token': token };
            req.headers['x-csrf-token'] = token;
            req.headers.origin = 'http://localhost:5173';
            req.headers['content-type'] = 'application/json';
            req.body = { data: 'test\0value' };

            next.mockClear();
            validateCsrfToken(req, res, next);
            expect(next).toHaveBeenCalledTimes(1);

            next.mockClear();
            originCheck(req, res, next);
            expect(next).toHaveBeenCalledTimes(1);

            next.mockClear();
            validateContentType(req, res, next);
            expect(next).toHaveBeenCalledTimes(1);

            next.mockClear();
            sanitizeRequest(req, res, next);
            expect(next).toHaveBeenCalledTimes(1);
            expect(req.body.data).toBe('testvalue');

            next.mockClear();
            securityHeaders(req, res, next);
            expect(next).toHaveBeenCalledTimes(1);

            next.mockClear();
            noCache(req, res, next);
            expect(next).toHaveBeenCalledTimes(1);
        });

        it('should block request if any middleware fails', () => {
            req.method = 'POST';
            req.cookies = {};
            req.headers = {};

            validateCsrfToken(req, res, next);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(next).not.toHaveBeenCalled();
        });
    });

    // ============ EDGE CASES ============

    describe('Edge Cases', () => {
        it('should handle very long CSRF tokens', () => {
            const longToken = 'a'.repeat(1000);
            req.method = 'POST';
            req.cookies = { 'csrf-token': longToken };
            req.headers = { 'x-csrf-token': longToken };

            validateCsrfToken(req, res, next);

            expect(next).toHaveBeenCalled();
        });

        it('should handle special characters in origin', () => {
            req.method = 'POST';
            req.headers.origin = 'http://localhost:5173/?query=value&foo=bar';

            originCheck(req, res, next);

            expect(next).toHaveBeenCalled();
        });

        it('should handle multiple null bytes', () => {
            req.body = { text: 'test\0\0\0value' };

            sanitizeRequest(req, res, next);

            expect(req.body.text).toBe('testvalue');
        });

        it('should handle Unicode characters', () => {
            req.body = { text: 'مرحبا بك في النظام' };

            sanitizeRequest(req, res, next);

            expect(req.body.text).toBe('مرحبا بك في النظام');
            expect(next).toHaveBeenCalled();
        });

        it('should handle empty strings', () => {
            req.body = { field1: '', field2: '   ' };

            sanitizeRequest(req, res, next);

            expect(req.body.field1).toBe('');
            expect(req.body.field2).toBe('   ');
        });
    });
});
