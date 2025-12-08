/**
 * Logger Utility Tests
 */

const logger = require('../../../src/utils/logger');

describe('Logger Utility', () => {
    describe('Basic logging', () => {
        it('should have info method', () => {
            expect(typeof logger.info).toBe('function');
        });

        it('should have error method', () => {
            expect(typeof logger.error).toBe('function');
        });

        it('should have debug method', () => {
            expect(typeof logger.debug).toBe('function');
        });

        it('should have warn method', () => {
            expect(typeof logger.warn).toBe('function');
        });
    });

    describe('Custom helpers', () => {
        it('should have withRequest method', () => {
            expect(typeof logger.withRequest).toBe('function');
        });

        it('withRequest should create child logger with context', () => {
            const req = testUtils.mockRequest({
                id: 'test-123',
                method: 'GET',
                originalUrl: '/api/test'
            });

            const childLogger = logger.withRequest(req);
            expect(childLogger).toBeDefined();
            expect(typeof childLogger.info).toBe('function');
        });

        it('should have startTimer method', () => {
            expect(typeof logger.startTimer).toBe('function');
        });

        it('startTimer should return timer with done method', () => {
            const timer = logger.startTimer();
            expect(timer).toBeDefined();
            expect(typeof timer.done).toBe('function');
        });

        it('should have audit method', () => {
            expect(typeof logger.audit).toBe('function');
        });

        it('should have logError method', () => {
            expect(typeof logger.logError).toBe('function');
        });
    });

    describe('Request middleware', () => {
        it('should have requestMiddleware', () => {
            expect(typeof logger.requestMiddleware).toBe('function');
        });

        it('requestMiddleware should set request ID', () => {
            const req = testUtils.mockRequest({ headers: {} });
            const res = testUtils.mockResponse();
            res.on = jest.fn();

            logger.requestMiddleware(req, res, jest.fn());

            expect(req.id).toBeDefined();
            expect(res.setHeader).toHaveBeenCalledWith('X-Request-Id', req.id);
        });
    });

    describe('Database logging', () => {
        it('should have db.query method', () => {
            expect(typeof logger.db.query).toBe('function');
        });

        it('should have db.error method', () => {
            expect(typeof logger.db.error).toBe('function');
        });
    });
});
