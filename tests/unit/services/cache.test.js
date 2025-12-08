/**
 * Cache Service Unit Tests
 * Tests for Redis cache operations: get/set, TTL expiration, pattern deletion, cache-aside pattern
 */

const redis = require('../../../src/configs/redis');

// Mock ioredis
jest.mock('ioredis', () => {
    const mockRedis = {
        connect: jest.fn().mockResolvedValue(undefined),
        quit: jest.fn().mockResolvedValue(undefined),
        ping: jest.fn().mockResolvedValue('PONG'),
        setex: jest.fn().mockResolvedValue('OK'),
        get: jest.fn(),
        del: jest.fn().mockResolvedValue(1),
        exists: jest.fn().mockResolvedValue(1),
        set: jest.fn().mockResolvedValue('OK'),
        on: jest.fn(),
        keys: jest.fn().mockResolvedValue([]),
        pipeline: jest.fn().mockReturnValue({
            del: jest.fn().mockReturnThis(),
            exec: jest.fn().mockResolvedValue([])
        })
    };

    return jest.fn(() => mockRedis);
});

describe('Cache Service Unit Tests', () => {
    let mockRedisClient;

    beforeEach(() => {
        jest.clearAllMocks();
        const Redis = require('ioredis');
        mockRedisClient = new Redis();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    // ============ GET/SET OPERATIONS ============

    describe('Get/Set Operations', () => {
        it('should set value with expiry', async () => {
            const key = 'test:key';
            const value = 'test value';
            const ttl = 3600;

            await redis.setWithExpiry(key, value, ttl);

            expect(mockRedisClient.setex).toHaveBeenCalledWith(key, ttl, value);
        });

        it('should set object value with expiry', async () => {
            const key = 'test:object';
            const value = { name: 'test', age: 25 };
            const ttl = 1800;

            await redis.setWithExpiry(key, value, ttl);

            expect(mockRedisClient.setex).toHaveBeenCalledWith(
                key,
                ttl,
                JSON.stringify(value)
            );
        });

        it('should get value and parse JSON', async () => {
            const key = 'test:json';
            const value = { name: 'test', count: 10 };
            mockRedisClient.get.mockResolvedValue(JSON.stringify(value));

            const result = await redis.getValue(key);

            expect(mockRedisClient.get).toHaveBeenCalledWith(key);
            expect(result).toEqual(value);
        });

        it('should get string value without parsing', async () => {
            const key = 'test:string';
            const value = 'simple string';
            mockRedisClient.get.mockResolvedValue(value);

            const result = await redis.getValue(key, false);

            expect(mockRedisClient.get).toHaveBeenCalledWith(key);
            expect(result).toBe(value);
        });

        it('should return null for non-existent key', async () => {
            const key = 'test:nonexistent';
            mockRedisClient.get.mockResolvedValue(null);

            const result = await redis.getValue(key);

            expect(result).toBeNull();
        });

        it('should handle JSON parse error gracefully', async () => {
            const key = 'test:invalid';
            const invalidJson = '{invalid json}';
            mockRedisClient.get.mockResolvedValue(invalidJson);

            const result = await redis.getValue(key, true);

            expect(result).toBe(invalidJson);
        });

        it('should use default TTL when not specified', async () => {
            const key = 'test:default';
            const value = 'test';

            await redis.setWithExpiry(key, value);

            expect(mockRedisClient.setex).toHaveBeenCalledWith(key, 86400, value);
        });
    });

    // ============ TTL EXPIRATION ============

    describe('TTL Expiration', () => {
        it('should set short TTL (60 seconds)', async () => {
            const key = 'session:user123';
            const value = 'session data';
            const ttl = 60;

            await redis.setWithExpiry(key, value, ttl);

            expect(mockRedisClient.setex).toHaveBeenCalledWith(key, ttl, value);
        });

        it('should set medium TTL (1 hour)', async () => {
            const key = 'cache:data';
            const value = 'cached data';
            const ttl = 3600;

            await redis.setWithExpiry(key, value, ttl);

            expect(mockRedisClient.setex).toHaveBeenCalledWith(key, ttl, value);
        });

        it('should set long TTL (1 day)', async () => {
            const key = 'config:settings';
            const value = { setting: 'value' };
            const ttl = 86400;

            await redis.setWithExpiry(key, value, ttl);

            expect(mockRedisClient.setex).toHaveBeenCalledWith(
                key,
                ttl,
                JSON.stringify(value)
            );
        });

        it('should handle zero TTL', async () => {
            const key = 'test:zero';
            const value = 'test';
            const ttl = 0;

            await redis.setWithExpiry(key, value, ttl);

            expect(mockRedisClient.setex).toHaveBeenCalledWith(key, 0, value);
        });
    });

    // ============ PATTERN DELETION ============

    describe('Pattern Deletion', () => {
        it('should delete single key', async () => {
            const key = 'test:single';

            await redis.deleteKey(key);

            expect(mockRedisClient.del).toHaveBeenCalledWith(key);
        });

        it('should delete key and return count', async () => {
            const key = 'test:key';
            mockRedisClient.del.mockResolvedValue(1);

            const result = await redis.deleteKey(key);

            expect(mockRedisClient.del).toHaveBeenCalledWith(key);
        });

        it('should handle deletion of non-existent key', async () => {
            const key = 'test:nonexistent';
            mockRedisClient.del.mockResolvedValue(0);

            await redis.deleteKey(key);

            expect(mockRedisClient.del).toHaveBeenCalledWith(key);
        });
    });

    // ============ KEY EXISTENCE ============

    describe('Key Existence', () => {
        it('should check if key exists (true)', async () => {
            const key = 'test:exists';
            mockRedisClient.exists.mockResolvedValue(1);

            const result = await redis.keyExists(key);

            expect(mockRedisClient.exists).toHaveBeenCalledWith(key);
            expect(result).toBe(true);
        });

        it('should check if key exists (false)', async () => {
            const key = 'test:notexists';
            mockRedisClient.exists.mockResolvedValue(0);

            const result = await redis.keyExists(key);

            expect(mockRedisClient.exists).toHaveBeenCalledWith(key);
            expect(result).toBe(false);
        });
    });

    // ============ CACHE-ASIDE PATTERN ============

    describe('Cache-Aside Pattern', () => {
        it('should return cached value if exists', async () => {
            const key = 'user:123';
            const cachedValue = { id: 123, name: 'John' };
            mockRedisClient.get.mockResolvedValue(JSON.stringify(cachedValue));

            const result = await redis.getValue(key);

            expect(result).toEqual(cachedValue);
            expect(mockRedisClient.get).toHaveBeenCalledWith(key);
        });

        it('should cache value if not exists (cache-aside)', async () => {
            const key = 'user:456';
            const value = { id: 456, name: 'Jane' };

            // First call returns null (cache miss)
            mockRedisClient.get.mockResolvedValue(null);

            const cachedResult = await redis.getValue(key);
            expect(cachedResult).toBeNull();

            // Then we set the value
            await redis.setWithExpiry(key, value, 3600);

            expect(mockRedisClient.setex).toHaveBeenCalledWith(
                key,
                3600,
                JSON.stringify(value)
            );

            // Next call should return the value
            mockRedisClient.get.mockResolvedValue(JSON.stringify(value));
            const newResult = await redis.getValue(key);
            expect(newResult).toEqual(value);
        });

        it('should implement setIfNotExists for idempotency', async () => {
            const key = 'idempotency:request123';
            const value = 'processed';
            const ttl = 86400;

            mockRedisClient.set.mockResolvedValue('OK');

            const result = await redis.setIfNotExists(key, value, ttl);

            expect(mockRedisClient.set).toHaveBeenCalledWith(
                key,
                value,
                'EX',
                ttl,
                'NX'
            );
            expect(result).toBe(true);
        });

        it('should return false if key already exists (setIfNotExists)', async () => {
            const key = 'idempotency:request456';
            const value = 'processed';
            const ttl = 86400;

            mockRedisClient.set.mockResolvedValue(null);

            const result = await redis.setIfNotExists(key, value, ttl);

            expect(result).toBe(false);
        });

        it('should handle object in setIfNotExists', async () => {
            const key = 'request:789';
            const value = { status: 'completed', timestamp: Date.now() };
            const ttl = 3600;

            mockRedisClient.set.mockResolvedValue('OK');

            await redis.setIfNotExists(key, value, ttl);

            expect(mockRedisClient.set).toHaveBeenCalledWith(
                key,
                JSON.stringify(value),
                'EX',
                ttl,
                'NX'
            );
        });
    });

    // ============ CONNECTION MANAGEMENT ============

    describe('Connection Management', () => {
        it('should connect to Redis', async () => {
            await redis.connectRedis();

            expect(mockRedisClient.connect).toHaveBeenCalled();
        });

        it('should disconnect from Redis', async () => {
            await redis.disconnectRedis();

            expect(mockRedisClient.quit).toHaveBeenCalled();
        });

        it('should perform health check', async () => {
            mockRedisClient.ping.mockResolvedValue('PONG');

            const health = await redis.healthCheck();

            expect(health.status).toBe('healthy');
            expect(health.ping).toBe(true);
        });

        it('should handle health check failure', async () => {
            mockRedisClient.ping.mockRejectedValue(new Error('Connection failed'));

            const health = await redis.healthCheck();

            expect(health.status).toBe('unhealthy');
            expect(health.connected).toBe(false);
            expect(health.error).toBe('Connection failed');
        });

        it('should check if Redis is connected', () => {
            const isConnected = redis.isRedisConnected();
            expect(typeof isConnected).toBe('boolean');
        });
    });

    // ============ ERROR HANDLING ============

    describe('Error Handling', () => {
        it('should handle get error', async () => {
            const key = 'test:error';
            mockRedisClient.get.mockRejectedValue(new Error('Redis error'));

            await expect(redis.getValue(key)).rejects.toThrow('Redis error');
        });

        it('should handle set error', async () => {
            const key = 'test:error';
            const value = 'test';
            mockRedisClient.setex.mockRejectedValue(new Error('Set failed'));

            await expect(redis.setWithExpiry(key, value, 3600)).rejects.toThrow('Set failed');
        });

        it('should handle delete error', async () => {
            const key = 'test:error';
            mockRedisClient.del.mockRejectedValue(new Error('Delete failed'));

            await expect(redis.deleteKey(key)).rejects.toThrow('Delete failed');
        });
    });

    // ============ MULTIPLE KEYS OPERATIONS ============

    describe('Multiple Keys Operations', () => {
        it('should set multiple values with same prefix', async () => {
            const prefix = 'user:';
            const users = [
                { id: 1, name: 'User 1' },
                { id: 2, name: 'User 2' },
                { id: 3, name: 'User 3' }
            ];

            for (const user of users) {
                await redis.setWithExpiry(`${prefix}${user.id}`, user, 3600);
            }

            expect(mockRedisClient.setex).toHaveBeenCalledTimes(3);
        });

        it('should check existence of multiple keys', async () => {
            const keys = ['key1', 'key2', 'key3'];

            mockRedisClient.exists
                .mockResolvedValueOnce(1)
                .mockResolvedValueOnce(0)
                .mockResolvedValueOnce(1);

            const results = await Promise.all(
                keys.map(key => redis.keyExists(key))
            );

            expect(results).toEqual([true, false, true]);
        });
    });

    // ============ COMPLEX DATA STRUCTURES ============

    describe('Complex Data Structures', () => {
        it('should cache nested object', async () => {
            const key = 'complex:data';
            const value = {
                user: {
                    id: 1,
                    name: 'Test User',
                    profile: {
                        age: 30,
                        city: 'Riyadh'
                    }
                },
                metadata: {
                    created: new Date().toISOString(),
                    version: 1
                }
            };

            await redis.setWithExpiry(key, value, 3600);

            expect(mockRedisClient.setex).toHaveBeenCalledWith(
                key,
                3600,
                JSON.stringify(value)
            );
        });

        it('should cache array of objects', async () => {
            const key = 'list:items';
            const value = [
                { id: 1, name: 'Item 1' },
                { id: 2, name: 'Item 2' },
                { id: 3, name: 'Item 3' }
            ];

            await redis.setWithExpiry(key, value, 1800);

            expect(mockRedisClient.setex).toHaveBeenCalledWith(
                key,
                1800,
                JSON.stringify(value)
            );
        });

        it('should retrieve and parse array', async () => {
            const key = 'list:users';
            const value = [
                { id: 1, name: 'User 1' },
                { id: 2, name: 'User 2' }
            ];
            mockRedisClient.get.mockResolvedValue(JSON.stringify(value));

            const result = await redis.getValue(key);

            expect(result).toEqual(value);
            expect(Array.isArray(result)).toBe(true);
        });
    });

    // ============ SPECIAL USE CASES ============

    describe('Special Use Cases', () => {
        it('should cache empty object', async () => {
            const key = 'empty:obj';
            const value = {};

            await redis.setWithExpiry(key, value, 3600);

            expect(mockRedisClient.setex).toHaveBeenCalledWith(
                key,
                3600,
                JSON.stringify(value)
            );
        });

        it('should cache empty array', async () => {
            const key = 'empty:arr';
            const value = [];

            await redis.setWithExpiry(key, value, 3600);

            expect(mockRedisClient.setex).toHaveBeenCalledWith(
                key,
                3600,
                JSON.stringify(value)
            );
        });

        it('should cache boolean value', async () => {
            const key = 'flag:feature';
            const value = true;

            await redis.setWithExpiry(key, value, 3600);

            expect(mockRedisClient.setex).toHaveBeenCalledWith(
                key,
                3600,
                'true'
            );
        });

        it('should cache number value', async () => {
            const key = 'counter:views';
            const value = 42;

            await redis.setWithExpiry(key, value, 3600);

            expect(mockRedisClient.setex).toHaveBeenCalledWith(
                key,
                3600,
                '42'
            );
        });
    });
});
