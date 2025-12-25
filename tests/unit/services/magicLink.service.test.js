/**
 * Magic Link Service Unit Tests
 *
 * Tests for passwordless authentication via magic links including:
 * - Secure token generation
 * - Token format validation (64-character hex)
 * - Link expiration (15 minutes)
 * - Link verification
 * - Expired link rejection
 * - One-time use enforcement
 * - Purpose tracking (login, register, verify_email)
 * - Rate limiting
 */

const MagicLinkService = require('../../../src/services/magicLink.service');
const MagicLink = require('../../../src/models/magicLink.model');
const { User } = require('../../../src/models');
const EmailService = require('../../../src/services/email.service');
const EmailTemplateService = require('../../../src/services/emailTemplate.service');
const logger = require('../../../src/utils/logger');
const crypto = require('crypto');

// Mock dependencies
jest.mock('bcrypt', () => ({
    hash: jest.fn(),
    compare: jest.fn(),
    genSalt: jest.fn()
}));
jest.mock('nanoid', () => ({
    nanoid: jest.fn(() => 'mock-nano-id-123456789')
}));
jest.mock('../../../src/models/magicLink.model');
jest.mock('../../../src/models', () => ({
    User: {
        findOne: jest.fn(),
        findById: jest.fn()
    }
}));
jest.mock('../../../src/services/email.service');
jest.mock('../../../src/services/emailTemplate.service', () => ({
    render: jest.fn(),
    formatDate: jest.fn()
}));
jest.mock('../../../src/utils/logger', () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
}));

describe('Magic Link Service Unit Tests', () => {
    let mockUser;
    let mockMagicLink;
    let mockToken;

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock user data
        mockUser = {
            _id: '507f1f77bcf86cd799439011',
            email: 'test@example.com',
            firstName: 'Test',
            lastName: 'User',
            role: 'user'
        };

        // Mock token
        mockToken = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

        // Mock magic link document
        mockMagicLink = {
            _id: '507f1f77bcf86cd799439012',
            token: mockToken,
            email: 'test@example.com',
            userId: mockUser._id,
            expiresAt: new Date(Date.now() + 15 * 60 * 1000),
            isUsed: false,
            usedAt: null,
            purpose: 'login',
            metadata: {
                ip: '192.168.1.1',
                userAgent: 'Mozilla/5.0',
                redirectUrl: null
            },
            markAsUsed: jest.fn().mockResolvedValue(true),
            save: jest.fn().mockResolvedValue(true)
        };

        // Setup default mocks
        MagicLink.create = jest.fn().mockResolvedValue(mockMagicLink);
        MagicLink.findValidByToken = jest.fn().mockResolvedValue(mockMagicLink);
        MagicLink.cleanupExpired = jest.fn().mockResolvedValue(10);

        User.findOne.mockReturnValue({
            select: jest.fn().mockReturnValue({
                lean: jest.fn().mockResolvedValue(mockUser)
            })
        });

        User.findById.mockReturnValue({
            select: jest.fn().mockReturnValue({
                lean: jest.fn().mockResolvedValue(mockUser)
            })
        });

        EmailService.sendEmail = jest.fn().mockResolvedValue(true);

        EmailTemplateService.render.mockResolvedValue({
            html: '<html>Magic link email</html>'
        });
        EmailTemplateService.formatDate.mockReturnValue('formatted date');

        logger.info.mockClear();
        logger.warn.mockClear();
        logger.error.mockClear();

        // Mock environment variable
        process.env.CLIENT_URL = 'https://traf3li.com';
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    // ============ TEST 1: MAGIC LINK GENERATION ============

    describe('1. Magic Link Generation - Secure Token Generation', () => {
        it('should generate a secure random token using crypto.randomBytes', async () => {
            const spy = jest.spyOn(crypto, 'randomBytes');

            MagicLinkService.generateToken();

            expect(spy).toHaveBeenCalledWith(32);
            spy.mockRestore();
        });

        it('should generate unique tokens for multiple calls', () => {
            const token1 = MagicLinkService.generateToken();
            const token2 = MagicLinkService.generateToken();
            const token3 = MagicLinkService.generateToken();

            expect(token1).not.toBe(token2);
            expect(token2).not.toBe(token3);
            expect(token1).not.toBe(token3);
        });

        it('should create magic link with generated token', async () => {
            const email = 'test@example.com';
            const purpose = 'login';
            const metadata = {
                ip: '192.168.1.1',
                userAgent: 'Mozilla/5.0'
            };

            await MagicLinkService.sendMagicLink(email, purpose, null, metadata);

            expect(MagicLink.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    token: expect.any(String),
                    email: email.toLowerCase(),
                    userId: mockUser._id,
                    expiresAt: expect.any(Date),
                    purpose,
                    metadata: expect.objectContaining({
                        ip: metadata.ip,
                        userAgent: metadata.userAgent
                    })
                })
            );
        });

        it('should use cryptographically secure randomness', () => {
            const token = MagicLinkService.generateToken();

            // Verify token is not predictable (no patterns like 0000... or 1111...)
            const allSame = /^(.)\1+$/.test(token);
            expect(allSame).toBe(false);

            // Verify token has good entropy (mix of characters)
            const uniqueChars = new Set(token.split('')).size;
            expect(uniqueChars).toBeGreaterThan(8); // Should have variety
        });

        it('should log magic link creation', async () => {
            const email = 'test@example.com';
            const purpose = 'login';

            await MagicLinkService.sendMagicLink(email, purpose);

            expect(logger.info).toHaveBeenCalledWith(
                expect.stringContaining('Magic link sent')
            );
        });
    });

    // ============ TEST 2: TOKEN FORMAT ============

    describe('2. Token Format - 64-Character Hex Token', () => {
        it('should generate token with exactly 64 characters', () => {
            const token = MagicLinkService.generateToken();

            expect(token).toHaveLength(64);
        });

        it('should generate token containing only hexadecimal characters', () => {
            const token = MagicLinkService.generateToken();

            // Hex characters are 0-9 and a-f
            const hexPattern = /^[0-9a-f]+$/;
            expect(hexPattern.test(token)).toBe(true);
        });

        it('should generate lowercase hex string', () => {
            const token = MagicLinkService.generateToken();

            expect(token).toBe(token.toLowerCase());
            expect(token).not.toMatch(/[A-F]/); // No uppercase hex
        });

        it('should use 32 bytes that convert to 64 hex characters', () => {
            // 32 bytes = 256 bits = 64 hex characters
            const spy = jest.spyOn(crypto, 'randomBytes');

            const token = MagicLinkService.generateToken();

            expect(spy).toHaveBeenCalledWith(32);
            expect(token).toHaveLength(64);

            spy.mockRestore();
        });

        it('should produce tokens with high entropy', () => {
            const tokens = [];
            for (let i = 0; i < 100; i++) {
                tokens.push(MagicLinkService.generateToken());
            }

            // All tokens should be unique
            const uniqueTokens = new Set(tokens);
            expect(uniqueTokens.size).toBe(100);
        });
    });

    // ============ TEST 3: LINK EXPIRATION ============

    describe('3. Link Expiration - 15-Minute Expiration', () => {
        it('should set expiration to exactly 15 minutes from creation', async () => {
            const beforeCreate = Date.now();

            await MagicLinkService.sendMagicLink('test@example.com', 'login');

            const afterCreate = Date.now();
            const createCall = MagicLink.create.mock.calls[0][0];
            const expiresAt = createCall.expiresAt.getTime();

            const expectedExpiry = 15 * 60 * 1000; // 15 minutes in milliseconds

            expect(expiresAt).toBeGreaterThanOrEqual(beforeCreate + expectedExpiry);
            expect(expiresAt).toBeLessThanOrEqual(afterCreate + expectedExpiry);
        });

        it('should return expiration info in response', async () => {
            const result = await MagicLinkService.sendMagicLink('test@example.com', 'login');

            expect(result).toHaveProperty('expiresAt');
            expect(result).toHaveProperty('expiresInMinutes', 15);
            expect(result.expiresAt).toBeInstanceOf(Date);
        });

        it('should calculate expiration correctly for different timezones', async () => {
            const now = Date.now();

            await MagicLinkService.sendMagicLink('test@example.com', 'login');

            const createCall = MagicLink.create.mock.calls[0][0];
            const expiresAt = createCall.expiresAt.getTime();
            const diff = expiresAt - now;

            // Should be approximately 15 minutes (900,000 ms)
            expect(diff).toBeGreaterThanOrEqual(14.5 * 60 * 1000);
            expect(diff).toBeLessThanOrEqual(15.5 * 60 * 1000);
        });

        it('should store expiration as Date object', async () => {
            await MagicLinkService.sendMagicLink('test@example.com', 'login');

            const createCall = MagicLink.create.mock.calls[0][0];
            expect(createCall.expiresAt).toBeInstanceOf(Date);
        });

        it('should include expiration in email notification', async () => {
            await MagicLinkService.sendMagicLink('test@example.com', 'login');

            expect(EmailService.sendEmail).toHaveBeenCalledWith(
                expect.objectContaining({
                    to: 'test@example.com',
                    subject: expect.any(String),
                    html: expect.any(String)
                })
            );
        });
    });

    // ============ TEST 4: LINK VERIFICATION ============

    describe('4. Link Verification - Valid Link Passes', () => {
        it('should verify valid magic link successfully', async () => {
            const validToken = mockToken;
            MagicLink.findValidByToken.mockResolvedValue(mockMagicLink);

            const result = await MagicLinkService.verifyMagicLink(validToken);

            expect(result.valid).toBe(true);
            expect(result.user).toBeDefined();
            expect(result.user._id).toBe(mockUser._id);
        });

        it('should return user data on successful verification', async () => {
            MagicLink.findValidByToken.mockResolvedValue(mockMagicLink);

            const result = await MagicLinkService.verifyMagicLink(mockToken);

            expect(result.valid).toBe(true);
            expect(result.user).toEqual(mockUser);
            expect(result.purpose).toBe('login');
        });

        it('should mark link as used after verification', async () => {
            MagicLink.findValidByToken.mockResolvedValue(mockMagicLink);

            await MagicLinkService.verifyMagicLink(mockToken);

            expect(mockMagicLink.markAsUsed).toHaveBeenCalled();
        });

        it('should return redirect URL if provided', async () => {
            const linkWithRedirect = {
                ...mockMagicLink,
                metadata: {
                    ...mockMagicLink.metadata,
                    redirectUrl: 'https://traf3li.com/dashboard'
                }
            };

            MagicLink.findValidByToken.mockResolvedValue(linkWithRedirect);

            const result = await MagicLinkService.verifyMagicLink(mockToken);

            expect(result.valid).toBe(true);
            expect(result.redirectUrl).toBe('https://traf3li.com/dashboard');
        });

        it('should log successful verification', async () => {
            MagicLink.findValidByToken.mockResolvedValue(mockMagicLink);

            await MagicLinkService.verifyMagicLink(mockToken);

            expect(logger.info).toHaveBeenCalledWith(
                expect.stringContaining('verified successfully')
            );
        });

        it('should handle register purpose correctly', async () => {
            const registerLink = {
                ...mockMagicLink,
                purpose: 'register',
                userId: null
            };

            MagicLink.findValidByToken.mockResolvedValue(registerLink);

            const result = await MagicLinkService.verifyMagicLink(mockToken);

            expect(result.valid).toBe(true);
            expect(result.purpose).toBe('register');
            expect(result.email).toBe(registerLink.email);
        });
    });

    // ============ TEST 5: EXPIRED LINK REJECTION ============

    describe('5. Expired Link Rejection - Expired Links Fail', () => {
        it('should reject expired magic link', async () => {
            const expiredLink = {
                ...mockMagicLink,
                expiresAt: new Date(Date.now() - 1000) // 1 second ago
            };

            MagicLink.findValidByToken.mockResolvedValue(expiredLink);

            const result = await MagicLinkService.verifyMagicLink(mockToken);

            expect(result.valid).toBe(false);
            expect(result.code).toBe('EXPIRED');
        });

        it('should return appropriate error message for expired link', async () => {
            const expiredLink = {
                ...mockMagicLink,
                expiresAt: new Date(Date.now() - 60000) // 1 minute ago
            };

            MagicLink.findValidByToken.mockResolvedValue(expiredLink);

            const result = await MagicLinkService.verifyMagicLink(mockToken);

            expect(result.valid).toBe(false);
            expect(result.messageEn).toContain('expired');
        });

        it('should not mark expired link as used', async () => {
            const expiredLink = {
                ...mockMagicLink,
                expiresAt: new Date(Date.now() - 1000)
            };

            MagicLink.findValidByToken.mockResolvedValue(expiredLink);

            await MagicLinkService.verifyMagicLink(mockToken);

            expect(mockMagicLink.markAsUsed).not.toHaveBeenCalled();
        });

        it('should accept link that has not reached expiration time', async () => {
            const notYetExpiredLink = {
                ...mockMagicLink,
                expiresAt: new Date(Date.now() + 1000) // 1 second in future
            };

            MagicLink.findValidByToken.mockResolvedValue(notYetExpiredLink);

            const result = await MagicLinkService.verifyMagicLink(mockToken);

            expect(result.valid).toBe(true);
        });

        it('should return invalid token when not found', async () => {
            MagicLink.findValidByToken.mockResolvedValue(null);

            const result = await MagicLinkService.verifyMagicLink(mockToken);

            expect(result.valid).toBe(false);
            expect(result.code).toBe('INVALID_TOKEN');
        });
    });

    // ============ TEST 6: ONE-TIME USE ============

    describe('6. One-Time Use - Link Cannot Be Reused', () => {
        it('should reject already used magic link', async () => {
            const usedLink = {
                ...mockMagicLink,
                isUsed: true,
                usedAt: new Date(Date.now() - 5000)
            };

            MagicLink.findValidByToken.mockResolvedValue(usedLink);

            const result = await MagicLinkService.verifyMagicLink(mockToken);

            expect(result.valid).toBe(false);
            expect(result.code).toBe('ALREADY_USED');
        });

        it('should return appropriate error message for used link', async () => {
            const usedLink = {
                ...mockMagicLink,
                isUsed: true
            };

            MagicLink.findValidByToken.mockResolvedValue(usedLink);

            const result = await MagicLinkService.verifyMagicLink(mockToken);

            expect(result.valid).toBe(false);
            expect(result.messageEn).toContain('already been used');
        });

        it('should not allow second verification after first use', async () => {
            // First use
            MagicLink.findValidByToken.mockResolvedValue(mockMagicLink);
            const firstResult = await MagicLinkService.verifyMagicLink(mockToken);
            expect(firstResult.valid).toBe(true);
            expect(mockMagicLink.markAsUsed).toHaveBeenCalled();

            // Second attempt - link is now used
            const usedLink = {
                ...mockMagicLink,
                isUsed: true
            };
            MagicLink.findValidByToken.mockResolvedValue(usedLink);

            const secondResult = await MagicLinkService.verifyMagicLink(mockToken);
            expect(secondResult.valid).toBe(false);
            expect(secondResult.code).toBe('ALREADY_USED');
        });

        it('should track when link was used', async () => {
            MagicLink.findValidByToken.mockResolvedValue(mockMagicLink);

            await MagicLinkService.verifyMagicLink(mockToken);

            expect(mockMagicLink.markAsUsed).toHaveBeenCalled();
        });

        it('should not mark used link as used again', async () => {
            const usedLink = {
                ...mockMagicLink,
                isUsed: true,
                markAsUsed: jest.fn()
            };

            MagicLink.findValidByToken.mockResolvedValue(usedLink);

            await MagicLinkService.verifyMagicLink(mockToken);

            expect(usedLink.markAsUsed).not.toHaveBeenCalled();
        });
    });

    // ============ TEST 7: PURPOSE TRACKING ============

    describe('7. Purpose Tracking - Login, Register, Verify Email', () => {
        it('should handle login purpose', async () => {
            const email = 'test@example.com';
            User.findOne = jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                    lean: jest.fn().mockResolvedValue(mockUser)
                })
            });

            const result = await MagicLinkService.sendMagicLink(email, 'login');

            expect(MagicLink.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    purpose: 'login',
                    userId: mockUser._id
                })
            );
            expect(result.success).toBe(true);
        });

        it('should handle register purpose for new users', async () => {
            const email = 'newuser@example.com';
            User.findOne = jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                    lean: jest.fn().mockResolvedValue(null) // No existing user
                })
            });

            const result = await MagicLinkService.sendMagicLink(email, 'register');

            expect(MagicLink.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    purpose: 'register',
                    userId: null
                })
            );
            expect(result.success).toBe(true);
        });

        it('should reject register purpose for existing users', async () => {
            const email = 'test@example.com';
            User.findOne = jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                    lean: jest.fn().mockResolvedValue(mockUser)
                })
            });

            const result = await MagicLinkService.sendMagicLink(email, 'register');

            expect(result.success).toBe(false);
            expect(result.code).toBe('EMAIL_EXISTS');
        });

        it('should handle verify_email purpose', async () => {
            const email = 'test@example.com';
            User.findOne = jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                    lean: jest.fn().mockResolvedValue(mockUser)
                })
            });

            await MagicLinkService.sendMagicLink(email, 'verify_email');

            expect(MagicLink.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    purpose: 'verify_email',
                    userId: mockUser._id
                })
            );
        });

        it('should default to login purpose when not specified', async () => {
            const email = 'test@example.com';

            await MagicLinkService.sendMagicLink(email);

            expect(MagicLink.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    purpose: 'login'
                })
            );
        });

        it('should return purpose in verification response', async () => {
            const linkWithPurpose = {
                ...mockMagicLink,
                purpose: 'verify_email'
            };

            MagicLink.findValidByToken.mockResolvedValue(linkWithPurpose);

            const result = await MagicLinkService.verifyMagicLink(mockToken);

            expect(result.valid).toBe(true);
            expect(result.purpose).toBe('verify_email');
        });

        it('should prevent login for non-existent users', async () => {
            const email = 'nonexistent@example.com';
            User.findOne = jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                    lean: jest.fn().mockResolvedValue(null)
                })
            });

            const result = await MagicLinkService.sendMagicLink(email, 'login');

            // Should not reveal user doesn't exist (security)
            expect(result.success).toBe(true);
            expect(result.messageEn).toContain('If the email is registered');
        });
    });

    // ============ TEST 8: RATE LIMITING ============

    describe('8. Rate Limiting - Request Limits', () => {
        it('should allow multiple magic link requests for same email', async () => {
            const email = 'test@example.com';

            const result1 = await MagicLinkService.sendMagicLink(email, 'login');
            const result2 = await MagicLinkService.sendMagicLink(email, 'login');
            const result3 = await MagicLinkService.sendMagicLink(email, 'login');

            expect(result1.success).toBe(true);
            expect(result2.success).toBe(true);
            expect(result3.success).toBe(true);
            expect(MagicLink.create).toHaveBeenCalledTimes(3);
        });

        it('should create new token for each request', async () => {
            const email = 'test@example.com';
            const tokens = [];

            MagicLink.create.mockImplementation((data) => {
                tokens.push(data.token);
                return Promise.resolve(mockMagicLink);
            });

            await MagicLinkService.sendMagicLink(email, 'login');
            await MagicLinkService.sendMagicLink(email, 'login');
            await MagicLinkService.sendMagicLink(email, 'login');

            expect(tokens).toHaveLength(3);
            expect(tokens[0]).not.toBe(tokens[1]);
            expect(tokens[1]).not.toBe(tokens[2]);
        });

        it('should allow requests for different emails simultaneously', async () => {
            const emails = ['user1@example.com', 'user2@example.com', 'user3@example.com'];

            const results = await Promise.all(
                emails.map(email => MagicLinkService.sendMagicLink(email, 'login'))
            );

            results.forEach(result => {
                expect(result.success).toBe(true);
            });
            expect(MagicLink.create).toHaveBeenCalledTimes(3);
        });

        it('should normalize email addresses to lowercase', async () => {
            const email = 'Test@Example.COM';

            await MagicLinkService.sendMagicLink(email, 'login');

            expect(MagicLink.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    email: 'test@example.com'
                })
            );
        });

        it('should trim whitespace from email addresses', async () => {
            const email = '  test@example.com  ';

            await MagicLinkService.sendMagicLink(email, 'login');

            expect(User.findOne).toHaveBeenCalledWith({
                email: 'test@example.com'
            });
        });

        it('should track metadata for rate limiting analysis', async () => {
            const email = 'test@example.com';
            const metadata = {
                ip: '192.168.1.1',
                userAgent: 'Mozilla/5.0'
            };

            await MagicLinkService.sendMagicLink(email, 'login', null, metadata);

            expect(MagicLink.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    metadata: expect.objectContaining({
                        ip: '192.168.1.1',
                        userAgent: 'Mozilla/5.0'
                    })
                })
            );
        });

        it('should allow cleanup of old magic links', async () => {
            MagicLink.cleanupExpired.mockResolvedValue(10);

            const result = await MagicLinkService.cleanupExpiredLinks();

            expect(MagicLink.cleanupExpired).toHaveBeenCalled();
            expect(result).toBe(10);
            expect(logger.info).toHaveBeenCalledWith(
                expect.stringContaining('Cleaned up')
            );
        });

        it('should handle metadata with redirect URL', async () => {
            const email = 'test@example.com';
            const redirectUrl = 'https://traf3li.com/dashboard';
            const metadata = {
                ip: '192.168.1.1',
                userAgent: 'Mozilla/5.0'
            };

            await MagicLinkService.sendMagicLink(email, 'login', redirectUrl, metadata);

            expect(MagicLink.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    metadata: expect.objectContaining({
                        redirectUrl
                    })
                })
            );
        });
    });

    // ============ ERROR HANDLING ============

    describe('Error Handling', () => {
        it('should handle database errors during link creation', async () => {
            const error = new Error('Database connection failed');
            MagicLink.create.mockRejectedValue(error);

            await expect(
                MagicLinkService.sendMagicLink('test@example.com', 'login')
            ).rejects.toThrow('Failed to send magic link');

            expect(logger.error).toHaveBeenCalledWith(
                'Failed to send magic link',
                expect.objectContaining({
                    error: error.message
                })
            );
        });

        it('should handle email service errors', async () => {
            const error = new Error('Email service unavailable');
            EmailService.sendEmail.mockRejectedValue(error);

            await expect(
                MagicLinkService.sendMagicLink('test@example.com', 'login')
            ).rejects.toThrow('Failed to send magic link');
        });

        it('should handle user lookup errors', async () => {
            const error = new Error('User database error');
            User.findOne.mockImplementation(() => {
                throw error;
            });

            await expect(
                MagicLinkService.sendMagicLink('test@example.com', 'login')
            ).rejects.toThrow();
        });

        it('should handle verification errors gracefully', async () => {
            const error = new Error('Verification failed');
            MagicLink.findValidByToken.mockRejectedValue(error);

            await expect(
                MagicLinkService.verifyMagicLink(mockToken)
            ).rejects.toThrow('Failed to verify magic link');

            expect(logger.error).toHaveBeenCalledWith(
                'Failed to verify magic link',
                expect.objectContaining({
                    error: error.message
                })
            );
        });

        it('should handle cleanup errors', async () => {
            const error = new Error('Cleanup failed');
            MagicLink.cleanupExpired.mockRejectedValue(error);

            await expect(
                MagicLinkService.cleanupExpiredLinks()
            ).rejects.toThrow(error);

            expect(logger.error).toHaveBeenCalledWith(
                'Failed to cleanup expired magic links',
                expect.objectContaining({
                    error: error.message
                })
            );
        });

        it('should handle missing user during verification', async () => {
            User.findById = jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                    lean: jest.fn().mockResolvedValue(null)
                })
            });

            MagicLink.findValidByToken.mockResolvedValue(mockMagicLink);

            const result = await MagicLinkService.verifyMagicLink(mockToken);

            expect(result.valid).toBe(false);
            expect(result.code).toBe('USER_NOT_FOUND');
        });
    });

    // ============ SECURITY TESTS ============

    describe('Security', () => {
        it('should not reveal user existence for login attempts', async () => {
            const nonExistentEmail = 'notfound@example.com';
            User.findOne = jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                    lean: jest.fn().mockResolvedValue(null)
                })
            });

            const result = await MagicLinkService.sendMagicLink(nonExistentEmail, 'login');

            // Should return success even if user doesn't exist
            expect(result.success).toBe(true);
            expect(result.messageEn).toContain('If the email is registered');
        });

        it('should generate unique tokens to prevent collision attacks', async () => {
            const tokens = new Set();
            const iterations = 1000;

            for (let i = 0; i < iterations; i++) {
                const token = MagicLinkService.generateToken();
                tokens.add(token);
            }

            expect(tokens.size).toBe(iterations);
        });

        it('should include security metadata in magic link', async () => {
            const metadata = {
                ip: '192.168.1.1',
                userAgent: 'Mozilla/5.0'
            };

            await MagicLinkService.sendMagicLink('test@example.com', 'login', null, metadata);

            expect(MagicLink.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    metadata: expect.objectContaining({
                        ip: metadata.ip,
                        userAgent: metadata.userAgent
                    })
                })
            );
        });

        it('should use secure token storage', async () => {
            await MagicLinkService.sendMagicLink('test@example.com', 'login');

            const createCall = MagicLink.create.mock.calls[0][0];
            expect(createCall.token).toBeDefined();
            expect(createCall.token).toHaveLength(64);
            expect(/^[0-9a-f]+$/.test(createCall.token)).toBe(true);
        });
    });
});
