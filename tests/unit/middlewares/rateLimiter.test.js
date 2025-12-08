/**
 * Rate Limiter Middleware Tests
 */

const {
    authRateLimiter,
    apiRateLimiter,
    publicRateLimiter,
    createRateLimiter
} = require('../../../src/middlewares/rateLimiter.middleware');

describe('Rate Limiter Middleware', () => {
    describe('createRateLimiter', () => {
        it('should create a rate limiter with default options', () => {
            const limiter = createRateLimiter();
            expect(limiter).toBeDefined();
            expect(typeof limiter).toBe('function');
        });

        it('should create a rate limiter with custom options', () => {
            const limiter = createRateLimiter({
                windowMs: 60000,
                max: 10
            });
            expect(limiter).toBeDefined();
        });
    });

    describe('Pre-configured limiters', () => {
        it('authRateLimiter should be defined', () => {
            expect(authRateLimiter).toBeDefined();
            expect(typeof authRateLimiter).toBe('function');
        });

        it('apiRateLimiter should be defined', () => {
            expect(apiRateLimiter).toBeDefined();
            expect(typeof apiRateLimiter).toBe('function');
        });

        it('publicRateLimiter should be defined', () => {
            expect(publicRateLimiter).toBeDefined();
            expect(typeof publicRateLimiter).toBe('function');
        });
    });

    describe('Rate limiter behavior', () => {
        it('should call next() when under limit', async () => {
            const limiter = createRateLimiter({ windowMs: 1000, max: 100 });
            const req = testUtils.mockRequest();
            const res = testUtils.mockResponse();
            const next = testUtils.mockNext();

            await new Promise((resolve) => {
                limiter(req, res, () => {
                    next();
                    resolve();
                });
            });

            expect(next).toHaveBeenCalled();
        });
    });
});
