/**
 * Account Lockout Service Unit Tests
 *
 * Comprehensive tests for account lockout security features:
 * - Failed login attempt tracking
 * - Account lockout after maximum attempts
 * - Lockout duration enforcement
 * - IP-based lockout tracking
 * - Email-based lockout tracking
 * - Automatic unlock after lockout period
 * - Counter reset after inactivity window
 * - Failed attempt clearing on successful login
 */

// Mock mongoose model before requiring the service
const mockFailedLoginAttempt = {
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
    updateOne: jest.fn(),
    deleteOne: jest.fn(),
    create: jest.fn()
};

// Mock mongoose to return our mock model
jest.mock('mongoose', () => {
    const actualMongoose = jest.requireActual('mongoose');
    return {
        ...actualMongoose,
        model: jest.fn((modelName) => {
            if (modelName === 'FailedLoginAttempt') {
                return mockFailedLoginAttempt;
            }
            return actualMongoose.model(modelName);
        }),
        Schema: jest.fn().mockImplementation(function(schema) {
            this.index = jest.fn();
            return this;
        })
    };
});

// Mock logger
jest.mock('../../../src/utils/logger', () => ({
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn()
}));

const accountLockoutService = require('../../../src/services/accountLockout.service');
const logger = require('../../../src/utils/logger');

describe('Account Lockout Service Unit Tests', () => {
    let mockEmail;
    let mockIp;
    let mockUserAgent;

    beforeEach(() => {
        jest.clearAllMocks();

        // Reset mock data
        mockEmail = 'test@example.com';
        mockIp = '192.168.1.100';
        mockUserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)';
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('1. Track Failed Login', () => {
        it('should record a failed login attempt for email', async () => {
            // Mock findOneAndUpdate to return a new record with 1 attempt
            mockFailedLoginAttempt.findOneAndUpdate
                .mockResolvedValueOnce({
                    identifier: mockEmail.toLowerCase(),
                    type: 'email',
                    attempts: 1,
                    lastAttempt: new Date(),
                    ipAddress: mockIp,
                    userAgent: mockUserAgent
                })
                .mockResolvedValueOnce({
                    identifier: mockIp,
                    type: 'ip',
                    attempts: 1,
                    lastAttempt: new Date(),
                    ipAddress: mockIp,
                    userAgent: mockUserAgent
                });

            const result = await accountLockoutService.recordFailedAttempt(
                mockEmail,
                mockIp,
                mockUserAgent
            );

            // Verify findOneAndUpdate was called for email
            expect(mockFailedLoginAttempt.findOneAndUpdate).toHaveBeenCalledWith(
                { identifier: mockEmail.toLowerCase(), type: 'email' },
                expect.objectContaining({
                    $inc: { attempts: 1 },
                    $set: expect.objectContaining({
                        ipAddress: mockIp,
                        userAgent: mockUserAgent
                    })
                }),
                expect.objectContaining({ upsert: true, new: true })
            );

            // Verify result
            expect(result.locked).toBe(false);
            expect(result.attemptsRemaining).toBe(4); // 5 - 1 = 4 remaining
        });

        it('should record a failed login attempt for IP address', async () => {
            // Mock findOneAndUpdate to return records for both email and IP
            mockFailedLoginAttempt.findOneAndUpdate
                .mockResolvedValueOnce({
                    identifier: mockEmail.toLowerCase(),
                    type: 'email',
                    attempts: 1
                })
                .mockResolvedValueOnce({
                    identifier: mockIp,
                    type: 'ip',
                    attempts: 1
                });

            const result = await accountLockoutService.recordFailedAttempt(
                mockEmail,
                mockIp,
                mockUserAgent
            );

            // Verify findOneAndUpdate was called for both email and IP
            expect(mockFailedLoginAttempt.findOneAndUpdate).toHaveBeenCalledTimes(2);
            expect(mockFailedLoginAttempt.findOneAndUpdate).toHaveBeenCalledWith(
                { identifier: mockIp, type: 'ip' },
                expect.objectContaining({
                    $inc: { attempts: 1 }
                }),
                expect.objectContaining({ upsert: true, new: true })
            );

            expect(result.locked).toBe(false);
        });

        it('should increment attempt counter on subsequent failures', async () => {
            // Mock findOneAndUpdate to return increasing attempt counts
            mockFailedLoginAttempt.findOneAndUpdate
                .mockResolvedValueOnce({ attempts: 2 })
                .mockResolvedValueOnce({ attempts: 2 });

            const result = await accountLockoutService.recordFailedAttempt(
                mockEmail,
                mockIp,
                mockUserAgent
            );

            expect(result.locked).toBe(false);
            expect(result.attemptsRemaining).toBe(3); // 5 - 2 = 3 remaining
        });
    });

    describe('2. Lock After 5 Attempts', () => {
        it('should lock account after 5 failed attempts', async () => {
            // Mock findOneAndUpdate to return 5 attempts
            mockFailedLoginAttempt.findOneAndUpdate
                .mockResolvedValueOnce({ attempts: 5 })
                .mockResolvedValueOnce({ attempts: 5 });

            // Mock updateOne for setting lockedUntil
            mockFailedLoginAttempt.updateOne.mockResolvedValue({ nModified: 1 });

            const result = await accountLockoutService.recordFailedAttempt(
                mockEmail,
                mockIp,
                mockUserAgent
            );

            // Verify account is locked
            expect(result.locked).toBe(true);
            expect(result.remainingTime).toBe(15); // 15 minutes

            // Verify updateOne was called to set lockedUntil
            expect(mockFailedLoginAttempt.updateOne).toHaveBeenCalledWith(
                { identifier: mockEmail.toLowerCase(), type: 'email' },
                { $set: { lockedUntil: expect.any(Date) } }
            );
        });

        it('should not allow login when locked', async () => {
            const lockedUntil = new Date(Date.now() + 10 * 60 * 1000); // Locked for 10 more minutes

            mockFailedLoginAttempt.findOne.mockResolvedValue({
                identifier: mockEmail.toLowerCase(),
                type: 'email',
                attempts: 5,
                lockedUntil,
                lastAttempt: new Date()
            });

            const result = await accountLockoutService.isAccountLocked(mockEmail, mockIp);

            expect(result.locked).toBe(true);
            expect(result.remainingTime).toBeGreaterThan(0);
            expect(result.message).toContain('مقفل');
            expect(result.messageEn).toContain('locked');
        });

        it('should return attempts remaining before lockout', async () => {
            // 3 attempts made, 2 remaining before lockout
            mockFailedLoginAttempt.findOneAndUpdate
                .mockResolvedValueOnce({ attempts: 3 })
                .mockResolvedValueOnce({ attempts: 3 });

            const result = await accountLockoutService.recordFailedAttempt(
                mockEmail,
                mockIp,
                mockUserAgent
            );

            expect(result.locked).toBe(false);
            expect(result.attemptsRemaining).toBe(2); // 5 - 3 = 2
        });
    });

    describe('3. Lockout Duration', () => {
        it('should enforce 15-minute lockout duration', async () => {
            const lockoutStart = Date.now();
            const lockedUntil = new Date(lockoutStart + 15 * 60 * 1000);

            mockFailedLoginAttempt.findOne.mockResolvedValue({
                identifier: mockEmail.toLowerCase(),
                type: 'email',
                attempts: 5,
                lockedUntil,
                lastAttempt: new Date()
            });

            const result = await accountLockoutService.isAccountLocked(mockEmail, mockIp);

            expect(result.locked).toBe(true);
            expect(result.remainingTime).toBeLessThanOrEqual(15);
            expect(result.remainingTime).toBeGreaterThan(14); // Should be close to 15 minutes
        });

        it('should calculate remaining lockout time correctly', async () => {
            const lockedUntil = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes remaining

            mockFailedLoginAttempt.findOne.mockResolvedValue({
                identifier: mockEmail.toLowerCase(),
                type: 'email',
                attempts: 5,
                lockedUntil,
                lastAttempt: new Date()
            });

            const result = await accountLockoutService.isAccountLocked(mockEmail, mockIp);

            expect(result.locked).toBe(true);
            expect(result.remainingTime).toBeLessThanOrEqual(5);
            expect(result.remainingTime).toBeGreaterThan(4);
        });

        it('should include lockout messages in both languages', async () => {
            const lockedUntil = new Date(Date.now() + 10 * 60 * 1000);

            mockFailedLoginAttempt.findOne.mockResolvedValue({
                identifier: mockEmail.toLowerCase(),
                type: 'email',
                attempts: 5,
                lockedUntil,
                lastAttempt: new Date()
            });

            const result = await accountLockoutService.isAccountLocked(mockEmail, mockIp);

            expect(result.message).toBeDefined();
            expect(result.messageEn).toBeDefined();
            expect(result.message).toContain('10'); // Should mention remaining time
            expect(result.messageEn).toContain('10');
        });
    });

    describe('4. IP-based Lockout', () => {
        it('should track failed attempts by IP address', async () => {
            mockFailedLoginAttempt.findOneAndUpdate
                .mockResolvedValueOnce({ identifier: mockEmail.toLowerCase(), type: 'email', attempts: 1 })
                .mockResolvedValueOnce({ identifier: mockIp, type: 'ip', attempts: 3 });

            await accountLockoutService.recordFailedAttempt(
                mockEmail,
                mockIp,
                mockUserAgent
            );

            // Verify IP tracking
            expect(mockFailedLoginAttempt.findOneAndUpdate).toHaveBeenCalledWith(
                { identifier: mockIp, type: 'ip' },
                expect.any(Object),
                expect.any(Object)
            );
        });

        it('should lock IP after 5 failed attempts from different emails', async () => {
            mockFailedLoginAttempt.findOne.mockImplementation((query) => {
                if (query.type === 'ip') {
                    return Promise.resolve({
                        identifier: mockIp,
                        type: 'ip',
                        attempts: 5,
                        lockedUntil: new Date(Date.now() + 15 * 60 * 1000),
                        lastAttempt: new Date()
                    });
                }
                return Promise.resolve(null);
            });

            const result = await accountLockoutService.isAccountLocked('different@example.com', mockIp);

            expect(result.locked).toBe(true);
        });

        it('should apply IP lockout even with valid email', async () => {
            // Email has no attempts, but IP is locked
            mockFailedLoginAttempt.findOne.mockImplementation((query) => {
                if (query.type === 'ip') {
                    return Promise.resolve({
                        identifier: mockIp,
                        type: 'ip',
                        attempts: 5,
                        lockedUntil: new Date(Date.now() + 10 * 60 * 1000),
                        lastAttempt: new Date()
                    });
                }
                return Promise.resolve(null); // No email record
            });

            const result = await accountLockoutService.isAccountLocked(mockEmail, mockIp);

            expect(result.locked).toBe(true);
            expect(result.remainingTime).toBeGreaterThan(0);
        });

        it('should track IP and email independently', async () => {
            mockFailedLoginAttempt.findOneAndUpdate
                .mockResolvedValueOnce({ identifier: mockEmail.toLowerCase(), type: 'email', attempts: 2 })
                .mockResolvedValueOnce({ identifier: mockIp, type: 'ip', attempts: 4 });

            await accountLockoutService.recordFailedAttempt(mockEmail, mockIp, mockUserAgent);

            // Both should be tracked separately
            expect(mockFailedLoginAttempt.findOneAndUpdate).toHaveBeenCalledWith(
                { identifier: mockEmail.toLowerCase(), type: 'email' },
                expect.any(Object),
                expect.any(Object)
            );
            expect(mockFailedLoginAttempt.findOneAndUpdate).toHaveBeenCalledWith(
                { identifier: mockIp, type: 'ip' },
                expect.any(Object),
                expect.any(Object)
            );
        });
    });

    describe('5. Email-based Lockout', () => {
        it('should track failed attempts by email address', async () => {
            mockFailedLoginAttempt.findOneAndUpdate
                .mockResolvedValueOnce({
                    identifier: mockEmail.toLowerCase(),
                    type: 'email',
                    attempts: 2
                })
                .mockResolvedValueOnce({
                    identifier: mockIp,
                    type: 'ip',
                    attempts: 2
                });

            await accountLockoutService.recordFailedAttempt(mockEmail, mockIp, mockUserAgent);

            expect(mockFailedLoginAttempt.findOneAndUpdate).toHaveBeenCalledWith(
                { identifier: mockEmail.toLowerCase(), type: 'email' },
                expect.any(Object),
                expect.any(Object)
            );
        });

        it('should normalize email to lowercase', async () => {
            const upperCaseEmail = 'TEST@EXAMPLE.COM';

            mockFailedLoginAttempt.findOneAndUpdate
                .mockResolvedValueOnce({
                    identifier: upperCaseEmail.toLowerCase(),
                    type: 'email',
                    attempts: 1
                })
                .mockResolvedValueOnce({
                    identifier: mockIp,
                    type: 'ip',
                    attempts: 1
                });

            await accountLockoutService.recordFailedAttempt(upperCaseEmail, mockIp, mockUserAgent);

            expect(mockFailedLoginAttempt.findOneAndUpdate).toHaveBeenCalledWith(
                { identifier: upperCaseEmail.toLowerCase(), type: 'email' },
                expect.any(Object),
                expect.any(Object)
            );
        });

        it('should lock email after 5 failed attempts from different IPs', async () => {
            mockFailedLoginAttempt.findOne.mockImplementation((query) => {
                if (query.type === 'email' && query.identifier === mockEmail.toLowerCase()) {
                    return Promise.resolve({
                        identifier: mockEmail.toLowerCase(),
                        type: 'email',
                        attempts: 5,
                        lockedUntil: new Date(Date.now() + 15 * 60 * 1000),
                        lastAttempt: new Date()
                    });
                }
                return Promise.resolve(null);
            });

            const result = await accountLockoutService.isAccountLocked(mockEmail, '10.0.0.1');

            expect(result.locked).toBe(true);
        });

        it('should apply email lockout even from different IP', async () => {
            // Email is locked, but different IP
            mockFailedLoginAttempt.findOne.mockImplementation((query) => {
                if (query.type === 'email') {
                    return Promise.resolve({
                        identifier: mockEmail.toLowerCase(),
                        type: 'email',
                        attempts: 5,
                        lockedUntil: new Date(Date.now() + 8 * 60 * 1000),
                        lastAttempt: new Date()
                    });
                }
                return Promise.resolve(null);
            });

            const result = await accountLockoutService.isAccountLocked(mockEmail, '10.0.0.2');

            expect(result.locked).toBe(true);
            expect(result.remainingTime).toBeGreaterThan(0);
        });
    });

    describe('6. Automatic Unlock', () => {
        it('should automatically unlock after 15 minutes', async () => {
            // Locked time has passed
            const pastLockout = new Date(Date.now() - 1000); // 1 second ago

            mockFailedLoginAttempt.findOne.mockResolvedValue({
                identifier: mockEmail.toLowerCase(),
                type: 'email',
                attempts: 5,
                lockedUntil: pastLockout,
                lastAttempt: new Date()
            });

            const result = await accountLockoutService.isAccountLocked(mockEmail, mockIp);

            expect(result.locked).toBe(false);
        });

        it('should remain locked if lockout period not expired', async () => {
            const futureLockout = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes in future

            mockFailedLoginAttempt.findOne.mockResolvedValue({
                identifier: mockEmail.toLowerCase(),
                type: 'email',
                attempts: 5,
                lockedUntil: futureLockout,
                lastAttempt: new Date()
            });

            const result = await accountLockoutService.isAccountLocked(mockEmail, mockIp);

            expect(result.locked).toBe(true);
            expect(result.remainingTime).toBeGreaterThan(4);
        });

        it('should allow login immediately after lockout expires', async () => {
            // Exactly at expiration (within 1 second past)
            const justExpired = new Date(Date.now() - 100);

            mockFailedLoginAttempt.findOne.mockResolvedValue({
                identifier: mockEmail.toLowerCase(),
                type: 'email',
                attempts: 5,
                lockedUntil: justExpired,
                lastAttempt: new Date()
            });

            const result = await accountLockoutService.isAccountLocked(mockEmail, mockIp);

            expect(result.locked).toBe(false);
        });
    });

    describe('7. Counter Reset', () => {
        it('should reset counter after 30 minutes of inactivity', async () => {
            const oldAttempt = new Date(Date.now() - 31 * 60 * 1000); // 31 minutes ago

            mockFailedLoginAttempt.findOne.mockResolvedValue({
                identifier: mockEmail.toLowerCase(),
                type: 'email',
                attempts: 3,
                lastAttempt: oldAttempt,
                lockedUntil: null
            });

            mockFailedLoginAttempt.deleteOne.mockResolvedValue({ deletedCount: 1 });

            const result = await accountLockoutService.isAccountLocked(mockEmail, mockIp);

            // Should delete the old record
            expect(mockFailedLoginAttempt.deleteOne).toHaveBeenCalledWith(
                { identifier: mockEmail.toLowerCase(), type: 'email' }
            );
            expect(result.locked).toBe(false);
        });

        it('should not reset counter if within 30-minute window', async () => {
            const recentAttempt = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes ago

            mockFailedLoginAttempt.findOne.mockResolvedValue({
                identifier: mockEmail.toLowerCase(),
                type: 'email',
                attempts: 3,
                lastAttempt: recentAttempt,
                lockedUntil: null
            });

            mockFailedLoginAttempt.deleteOne.mockClear();

            const result = await accountLockoutService.isAccountLocked(mockEmail, mockIp);

            // Should NOT delete - counter is maintained within the 30-minute window
            expect(mockFailedLoginAttempt.deleteOne).not.toHaveBeenCalled();
            expect(result.locked).toBe(false);

            // Verify counter is still maintained by checking via getLockoutStatus
            const status = await accountLockoutService.getLockoutStatus(mockEmail);
            expect(status.attempts).toBe(3);
        });

        it('should maintain counter for attempts within window', async () => {
            const recentAttempt = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago

            mockFailedLoginAttempt.findOne.mockResolvedValue({
                identifier: mockEmail.toLowerCase(),
                type: 'email',
                attempts: 4,
                lastAttempt: recentAttempt,
                lockedUntil: null
            });

            const result = await accountLockoutService.isAccountLocked(mockEmail, mockIp);

            expect(result.locked).toBe(false);

            // Verify counter is maintained by checking via getLockoutStatus
            const status = await accountLockoutService.getLockoutStatus(mockEmail);
            expect(status.attempts).toBe(4);
        });

        it('should reset both email and IP counters after inactivity', async () => {
            const oldAttempt = new Date(Date.now() - 35 * 60 * 1000); // 35 minutes ago

            mockFailedLoginAttempt.findOne.mockImplementation((query) => {
                return Promise.resolve({
                    identifier: query.identifier,
                    type: query.type,
                    attempts: 3,
                    lastAttempt: oldAttempt,
                    lockedUntil: null
                });
            });

            mockFailedLoginAttempt.deleteOne.mockResolvedValue({ deletedCount: 1 });

            await accountLockoutService.isAccountLocked(mockEmail, mockIp);

            // Should delete both email and IP records
            expect(mockFailedLoginAttempt.deleteOne).toHaveBeenCalledWith(
                { identifier: mockEmail.toLowerCase(), type: 'email' }
            );
            expect(mockFailedLoginAttempt.deleteOne).toHaveBeenCalledWith(
                { identifier: mockIp, type: 'ip' }
            );
        });
    });

    describe('8. Successful Login Clears Attempts', () => {
        it('should clear email attempts after successful login', async () => {
            mockFailedLoginAttempt.deleteOne.mockResolvedValue({ deletedCount: 1 });

            await accountLockoutService.clearFailedAttempts(mockEmail, mockIp);

            expect(mockFailedLoginAttempt.deleteOne).toHaveBeenCalledWith(
                { identifier: mockEmail.toLowerCase(), type: 'email' }
            );
        });

        it('should normalize email when clearing attempts', async () => {
            const upperCaseEmail = 'TEST@EXAMPLE.COM';

            mockFailedLoginAttempt.deleteOne.mockResolvedValue({ deletedCount: 1 });

            await accountLockoutService.clearFailedAttempts(upperCaseEmail, mockIp);

            expect(mockFailedLoginAttempt.deleteOne).toHaveBeenCalledWith(
                { identifier: upperCaseEmail.toLowerCase(), type: 'email' }
            );
        });

        it('should not clear IP attempts on successful login', async () => {
            mockFailedLoginAttempt.deleteOne.mockResolvedValue({ deletedCount: 1 });

            await accountLockoutService.clearFailedAttempts(mockEmail, mockIp);

            // Should only be called once for email, not for IP
            expect(mockFailedLoginAttempt.deleteOne).toHaveBeenCalledTimes(1);
            expect(mockFailedLoginAttempt.deleteOne).toHaveBeenCalledWith(
                { identifier: mockEmail.toLowerCase(), type: 'email' }
            );
        });

        it('should handle clearing when no attempts exist', async () => {
            mockFailedLoginAttempt.deleteOne.mockResolvedValue({ deletedCount: 0 });

            await expect(
                accountLockoutService.clearFailedAttempts(mockEmail, mockIp)
            ).resolves.not.toThrow();

            expect(mockFailedLoginAttempt.deleteOne).toHaveBeenCalled();
        });

        it('should reset counter to zero after successful login', async () => {
            mockFailedLoginAttempt.deleteOne.mockResolvedValue({ deletedCount: 1 });
            mockFailedLoginAttempt.findOne.mockResolvedValue(null);

            await accountLockoutService.clearFailedAttempts(mockEmail, mockIp);

            const result = await accountLockoutService.isAccountLocked(mockEmail, mockIp);

            expect(result.locked).toBe(false);
            expect(mockFailedLoginAttempt.findOne).toHaveBeenCalled();
        });

        it('should handle errors gracefully when clearing attempts', async () => {
            mockFailedLoginAttempt.deleteOne.mockRejectedValue(new Error('Database error'));

            await expect(
                accountLockoutService.clearFailedAttempts(mockEmail, mockIp)
            ).resolves.not.toThrow();

            expect(logger.error).toHaveBeenCalledWith(
                'Clear failed attempts error:',
                'Database error'
            );
        });
    });

    describe('Additional Edge Cases', () => {
        it('should handle null email gracefully', async () => {
            mockFailedLoginAttempt.findOne.mockResolvedValue(null);

            const result = await accountLockoutService.isAccountLocked(null, mockIp);

            expect(result.locked).toBe(false);
        });

        it('should handle null IP gracefully', async () => {
            mockFailedLoginAttempt.findOne.mockResolvedValue(null);

            const result = await accountLockoutService.isAccountLocked(mockEmail, null);

            expect(result).toBeDefined();
        });

        it('should fail open on database errors', async () => {
            mockFailedLoginAttempt.findOne.mockRejectedValue(new Error('DB connection failed'));

            const result = await accountLockoutService.isAccountLocked(mockEmail, mockIp);

            // Should not lock users on system errors
            expect(result.locked).toBe(false);
            expect(logger.error).toHaveBeenCalled();
        });

        it('should get lockout status for monitoring', async () => {
            const lastAttemptDate = new Date();

            mockFailedLoginAttempt.findOne.mockResolvedValue({
                identifier: mockEmail.toLowerCase(),
                type: 'email',
                attempts: 3,
                lockedUntil: null,
                lastAttempt: lastAttemptDate
            });

            const status = await accountLockoutService.getLockoutStatus(mockEmail);

            expect(status.attempts).toBe(3);
            expect(status.locked).toBeFalsy(); // Could be false or null when lockedUntil is null
            expect(status.maxAttempts).toBe(5);
            expect(status.lastAttempt).toEqual(lastAttemptDate);
        });

        it('should manually unlock account', async () => {
            mockFailedLoginAttempt.deleteOne.mockResolvedValue({ deletedCount: 1 });

            const result = await accountLockoutService.unlockAccount(mockEmail);

            expect(result.success).toBe(true);
            expect(mockFailedLoginAttempt.deleteOne).toHaveBeenCalledWith(
                { identifier: mockEmail.toLowerCase(), type: 'email' }
            );
        });

        it('should return lockout policy configuration', () => {
            const policy = accountLockoutService.LOCKOUT_POLICY;

            expect(policy.maxAttempts).toBe(5);
            expect(policy.lockoutDuration).toBe(15 * 60 * 1000);
            expect(policy.attemptWindow).toBe(30 * 60 * 1000);
        });
    });
});
