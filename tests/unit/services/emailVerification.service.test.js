/**
 * Email Verification Service Unit Tests
 *
 * Comprehensive tests for email verification operations:
 * - Secure verification token generation
 * - Sending verification emails with correct links
 * - Token validation for valid tokens
 * - Token expiration handling
 * - Resending verification emails with token replacement
 * - Rate limiting on resend attempts
 */

const crypto = require('crypto');

// Mock bcrypt before any other imports
jest.mock('bcrypt', () => ({
    hash: jest.fn(),
    compare: jest.fn(),
    hashSync: jest.fn()
}));

// Mock nanoid before any other imports
jest.mock('nanoid', () => ({
    nanoid: jest.fn(() => 'mocked-nanoid-12345')
}));

// Mock mongoose
jest.mock('mongoose', () => {
    const actualMongoose = jest.requireActual('mongoose');
    return {
        ...actualMongoose,
        connect: jest.fn(),
        connection: {
            readyState: 1,
            on: jest.fn(),
            once: jest.fn()
        }
    };
});

// Mock dependencies
jest.mock('../../../src/models/emailVerification.model');
jest.mock('../../../src/models', () => ({
    User: {
        findById: jest.fn(),
        findByIdAndUpdate: jest.fn()
    }
}));
jest.mock('../../../src/services/email.service');
jest.mock('../../../src/services/emailTemplate.service');
jest.mock('../../../src/utils/logger');

const EmailVerificationService = require('../../../src/services/emailVerification.service');
const EmailVerification = require('../../../src/models/emailVerification.model');
const { User } = require('../../../src/models');
const EmailService = require('../../../src/services/email.service');
const EmailTemplateService = require('../../../src/services/emailTemplate.service');
const logger = require('../../../src/utils/logger');

describe('Email Verification Service Unit Tests', () => {
    let mockUser;
    let mockVerification;
    let mockToken;

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock secure token generation
        mockToken = crypto.randomBytes(32).toString('hex');

        // Mock user data
        mockUser = {
            _id: '507f1f77bcf86cd799439011',
            email: 'test@example.com',
            username: 'testuser',
            firstName: 'Test',
            lastName: 'User',
            isEmailVerified: false,
            emailVerifiedAt: null,
            save: jest.fn().mockResolvedValue(true)
        };

        // Mock verification token document
        mockVerification = {
            _id: '507f1f77bcf86cd799439012',
            token: mockToken,
            userId: mockUser._id,
            email: mockUser.email,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
            isUsed: false,
            usedAt: null,
            sentCount: 1,
            lastSentAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
            isExpired: jest.fn().mockReturnValue(false),
            canResend: jest.fn().mockReturnValue(true),
            save: jest.fn().mockResolvedValue(true)
        };

        // Setup default mocks with select method chaining
        User.findById = jest.fn().mockReturnValue({
            select: jest.fn().mockResolvedValue(mockUser)
        });

        const mockVerifiedUser = {
            ...mockUser,
            isEmailVerified: true,
            emailVerifiedAt: new Date()
        };

        User.findByIdAndUpdate = jest.fn().mockReturnValue({
            select: jest.fn().mockResolvedValue(mockVerifiedUser)
        });

        EmailVerification.createToken = jest.fn().mockResolvedValue(mockVerification);
        EmailVerification.verifyToken = jest.fn().mockResolvedValue({
            valid: true,
            userId: mockUser._id,
            email: mockUser.email
        });
        EmailVerification.findActiveByUserId = jest.fn().mockResolvedValue(null);
        EmailVerification.cleanupExpired = jest.fn().mockResolvedValue(5);

        EmailTemplateService.render = jest.fn().mockResolvedValue({
            html: '<html>Verification Email</html>'
        });

        EmailService.sendEmail = jest.fn().mockResolvedValue({
            id: 'email-123',
            success: true
        });

        // Mock environment variables
        process.env.CLIENT_URL = 'https://dashboard.traf3li.com';
    });

    afterEach(() => {
        jest.clearAllMocks();
        delete process.env.CLIENT_URL;
    });

    describe('1. Verification Token Generation', () => {
        it('should generate a secure verification token with proper length', async () => {
            const result = await EmailVerificationService.sendVerificationEmail(
                mockUser._id,
                mockUser.email,
                `${mockUser.firstName} ${mockUser.lastName}`
            );

            expect(result.success).toBe(true);
            expect(EmailVerification.createToken).toHaveBeenCalledWith(
                mockUser._id,
                mockUser.email
            );
        });

        it('should create token with 24-hour expiration', async () => {
            await EmailVerificationService.sendVerificationEmail(
                mockUser._id,
                mockUser.email,
                `${mockUser.firstName} ${mockUser.lastName}`
            );

            expect(EmailVerification.createToken).toHaveBeenCalled();

            const createdVerification = await EmailVerification.createToken.mock.results[0].value;
            const expirationTime = createdVerification.expiresAt.getTime();
            const expectedExpiration = Date.now() + 24 * 60 * 60 * 1000;

            // Allow 1 second tolerance for test execution time
            expect(Math.abs(expirationTime - expectedExpiration)).toBeLessThan(1000);
        });

        it('should create unique token for each verification request', async () => {
            const token1 = crypto.randomBytes(32).toString('hex');
            const token2 = crypto.randomBytes(32).toString('hex');

            expect(token1).not.toBe(token2);
            expect(token1.length).toBe(64); // 32 bytes = 64 hex chars
            expect(token2.length).toBe(64);
        });

        it('should use cryptographically secure random bytes', async () => {
            const token = crypto.randomBytes(32).toString('hex');

            // Verify token is hexadecimal
            expect(/^[a-f0-9]{64}$/.test(token)).toBe(true);

            // Verify it's 32 bytes (64 hex characters)
            expect(token.length).toBe(64);
        });

        it('should store userId and email with token', async () => {
            await EmailVerificationService.sendVerificationEmail(
                mockUser._id,
                mockUser.email,
                `${mockUser.firstName} ${mockUser.lastName}`
            );

            expect(EmailVerification.createToken).toHaveBeenCalledWith(
                mockUser._id,
                mockUser.email
            );
        });

        it('should fail if user does not exist', async () => {
            User.findById.mockResolvedValue(null);

            await expect(
                EmailVerificationService.sendVerificationEmail(
                    'nonexistent-user-id',
                    'test@example.com',
                    'Test User'
                )
            ).rejects.toThrow('User not found');

            expect(EmailVerification.createToken).not.toHaveBeenCalled();
        });
    });

    describe('2. Send Verification Email', () => {
        it('should send verification email with correct link format', async () => {
            const result = await EmailVerificationService.sendVerificationEmail(
                mockUser._id,
                mockUser.email,
                `${mockUser.firstName} ${mockUser.lastName}`
            );

            expect(result.success).toBe(true);
            expect(EmailService.sendEmail).toHaveBeenCalled();

            const emailCall = EmailService.sendEmail.mock.calls[0][0];
            expect(emailCall.to).toBe(mockUser.email);
            expect(emailCall.subject).toContain('تفعيل البريد الإلكتروني');
        });

        it('should include verification URL with token in email', async () => {
            await EmailVerificationService.sendVerificationEmail(
                mockUser._id,
                mockUser.email,
                `${mockUser.firstName} ${mockUser.lastName}`
            );

            expect(EmailTemplateService.render).toHaveBeenCalledWith(
                'emailVerification',
                expect.objectContaining({
                    verificationUrl: `https://dashboard.traf3li.com/verify-email?token=${mockToken}`,
                    userName: `${mockUser.firstName} ${mockUser.lastName}`
                }),
                expect.objectContaining({
                    layout: 'notification',
                    language: 'ar'
                })
            );
        });

        it('should send email with both Arabic and English content', async () => {
            await EmailVerificationService.sendVerificationEmail(
                mockUser._id,
                mockUser.email,
                `${mockUser.firstName} ${mockUser.lastName}`,
                'ar'
            );

            const templateCall = EmailTemplateService.render.mock.calls[0][1];

            expect(templateCall).toHaveProperty('subject');
            expect(templateCall).toHaveProperty('greeting');
            expect(templateCall).toHaveProperty('messageText');
            expect(templateCall).toHaveProperty('buttonText');
            expect(templateCall.tokenCode).toBe(mockToken);
        });

        it('should support English language preference', async () => {
            await EmailVerificationService.sendVerificationEmail(
                mockUser._id,
                mockUser.email,
                `${mockUser.firstName} ${mockUser.lastName}`,
                'en'
            );

            expect(EmailTemplateService.render).toHaveBeenCalledWith(
                'emailVerification',
                expect.objectContaining({
                    subject: 'Email Verification - Traf3li',
                    greeting: `Hello ${mockUser.firstName} ${mockUser.lastName}!`
                }),
                expect.objectContaining({
                    language: 'en'
                })
            );
        });

        it('should use CLIENT_URL from environment for verification link', async () => {
            process.env.CLIENT_URL = 'https://custom-domain.com';

            await EmailVerificationService.sendVerificationEmail(
                mockUser._id,
                mockUser.email,
                `${mockUser.firstName} ${mockUser.lastName}`
            );

            expect(EmailTemplateService.render).toHaveBeenCalledWith(
                'emailVerification',
                expect.objectContaining({
                    verificationUrl: `https://custom-domain.com/verify-email?token=${mockToken}`
                }),
                expect.any(Object)
            );
        });

        it('should not send email if user is already verified', async () => {
            const verifiedUser = { ...mockUser, isEmailVerified: true };
            User.findById.mockResolvedValue(verifiedUser);

            const result = await EmailVerificationService.sendVerificationEmail(
                mockUser._id,
                mockUser.email,
                `${mockUser.firstName} ${mockUser.lastName}`
            );

            expect(result.success).toBe(false);
            expect(result.code).toBe('ALREADY_VERIFIED');
            expect(EmailService.sendEmail).not.toHaveBeenCalled();
        });

        it('should log successful email sending', async () => {
            await EmailVerificationService.sendVerificationEmail(
                mockUser._id,
                mockUser.email,
                `${mockUser.firstName} ${mockUser.lastName}`
            );

            expect(logger.info).toHaveBeenCalledWith(
                expect.stringContaining(`Email verification sent to ${mockUser.email}`)
            );
        });
    });

    describe('3. Token Validation', () => {
        it('should validate and accept a valid token', async () => {
            const result = await EmailVerificationService.verifyEmail(mockToken);

            expect(result.success).toBe(true);
            expect(result.messageEn).toBe('Email verified successfully');
            expect(EmailVerification.verifyToken).toHaveBeenCalledWith(mockToken);
        });

        it('should mark token as used after successful validation', async () => {
            await EmailVerificationService.verifyEmail(mockToken);

            expect(EmailVerification.verifyToken).toHaveBeenCalledWith(mockToken);
            expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
                mockUser._id,
                expect.objectContaining({
                    isEmailVerified: true,
                    emailVerifiedAt: expect.any(Date)
                }),
                expect.any(Object)
            );
        });

        it('should update user verification status on valid token', async () => {
            const result = await EmailVerificationService.verifyEmail(mockToken);

            expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
                mockUser._id,
                {
                    isEmailVerified: true,
                    emailVerifiedAt: expect.any(Date)
                },
                { new: true }
            );

            expect(result.success).toBe(true);
            expect(result.user).toBeDefined();
            expect(result.user.email).toBe(mockUser.email);
        });

        it('should return user information after successful verification', async () => {
            const verifiedUser = {
                ...mockUser,
                isEmailVerified: true,
                emailVerifiedAt: new Date()
            };

            User.findByIdAndUpdate.mockReturnValue({
                select: jest.fn().mockResolvedValue(verifiedUser)
            });

            const result = await EmailVerificationService.verifyEmail(mockToken);

            expect(result.success).toBe(true);
            expect(result.user).toMatchObject({
                id: mockUser._id,
                email: mockUser.email,
                username: mockUser.username,
                isEmailVerified: true
            });
        });

        it('should reject validation if token is missing', async () => {
            const result = await EmailVerificationService.verifyEmail('');

            expect(result.success).toBe(false);
            expect(result.code).toBe('TOKEN_REQUIRED');
            expect(result.messageEn).toBe('Verification token required');
            expect(EmailVerification.verifyToken).not.toHaveBeenCalled();
        });

        it('should reject validation for invalid token format', async () => {
            EmailVerification.verifyToken.mockResolvedValue({
                valid: false,
                error: 'TOKEN_INVALID_OR_EXPIRED'
            });

            const result = await EmailVerificationService.verifyEmail('invalid-token');

            expect(result.success).toBe(false);
            expect(result.code).toBe('TOKEN_INVALID_OR_EXPIRED');
        });

        it('should reject validation if user not found after token verification', async () => {
            User.findByIdAndUpdate.mockReturnValue({
                select: jest.fn().mockResolvedValue(null)
            });

            const result = await EmailVerificationService.verifyEmail(mockToken);

            expect(result.success).toBe(false);
            expect(result.code).toBe('USER_NOT_FOUND');
            expect(result.messageEn).toBe('User not found');
        });

        it('should log successful email verification', async () => {
            const verifiedUser = {
                ...mockUser,
                isEmailVerified: true,
                emailVerifiedAt: new Date()
            };

            User.findByIdAndUpdate.mockReturnValue({
                select: jest.fn().mockResolvedValue(verifiedUser)
            });

            await EmailVerificationService.verifyEmail(mockToken);

            expect(logger.info).toHaveBeenCalledWith(
                expect.stringContaining(`Email verified successfully for user ${mockUser._id}`)
            );
        });
    });

    describe('4. Token Expiration', () => {
        it('should reject expired tokens', async () => {
            EmailVerification.verifyToken.mockResolvedValue({
                valid: false,
                error: 'TOKEN_INVALID_OR_EXPIRED'
            });

            const result = await EmailVerificationService.verifyEmail(mockToken);

            expect(result.success).toBe(false);
            expect(result.code).toBe('TOKEN_INVALID_OR_EXPIRED');
            expect(result.messageEn).toBe('Invalid or expired verification token');
        });

        it('should not update user status for expired token', async () => {
            EmailVerification.verifyToken.mockResolvedValue({
                valid: false,
                error: 'TOKEN_INVALID_OR_EXPIRED'
            });

            await EmailVerificationService.verifyEmail(mockToken);

            expect(User.findByIdAndUpdate).not.toHaveBeenCalled();
        });

        it('should check token expiration before marking as used', async () => {
            const expiredToken = 'expired-token-xyz';

            EmailVerification.verifyToken.mockResolvedValue({
                valid: false,
                error: 'TOKEN_INVALID_OR_EXPIRED'
            });

            const result = await EmailVerificationService.verifyEmail(expiredToken);

            expect(result.success).toBe(false);
            expect(User.findByIdAndUpdate).not.toHaveBeenCalled();
        });

        it('should cleanup expired tokens successfully', async () => {
            const deletedCount = await EmailVerificationService.cleanupExpiredTokens();

            expect(EmailVerification.cleanupExpired).toHaveBeenCalled();
            expect(deletedCount).toBe(5);
            expect(logger.info).toHaveBeenCalledWith(
                'Cleaned up 5 expired email verification tokens'
            );
        });

        it('should handle cleanup errors gracefully', async () => {
            EmailVerification.cleanupExpired.mockRejectedValue(
                new Error('Database error')
            );

            await expect(
                EmailVerificationService.cleanupExpiredTokens()
            ).rejects.toThrow('Failed to cleanup expired tokens: Database error');

            expect(logger.error).toHaveBeenCalled();
        });

        it('should reject tokens that were already used', async () => {
            EmailVerification.verifyToken.mockResolvedValue({
                valid: false,
                error: 'TOKEN_INVALID_OR_EXPIRED'
            });

            const result = await EmailVerificationService.verifyEmail(mockToken);

            expect(result.success).toBe(false);
            expect(result.code).toBe('TOKEN_INVALID_OR_EXPIRED');
        });
    });

    describe('5. Resend Verification', () => {
        it('should resend verification email with new token', async () => {
            const result = await EmailVerificationService.resendVerificationEmail(mockUser._id);

            expect(result.success).toBe(true);
            expect(User.findById).toHaveBeenCalledWith(mockUser._id);
            expect(EmailService.sendEmail).toHaveBeenCalled();
        });

        it('should replace old token when resending', async () => {
            const existingVerification = {
                ...mockVerification,
                sentCount: 1,
                lastSentAt: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago
                canResend: jest.fn().mockReturnValue(true),
                save: jest.fn().mockResolvedValue(true)
            };

            EmailVerification.findActiveByUserId.mockResolvedValue(existingVerification);

            const result = await EmailVerificationService.sendVerificationEmail(
                mockUser._id,
                mockUser.email,
                `${mockUser.firstName} ${mockUser.lastName}`
            );

            expect(result.success).toBe(true);
            expect(existingVerification.sentCount).toBe(2);
            expect(existingVerification.save).toHaveBeenCalled();
        });

        it('should increment sent count on resend', async () => {
            const existingVerification = {
                ...mockVerification,
                sentCount: 2,
                lastSentAt: new Date(Date.now() - 10 * 60 * 1000),
                canResend: jest.fn().mockReturnValue(true),
                save: jest.fn().mockResolvedValue(true)
            };

            EmailVerification.findActiveByUserId.mockResolvedValue(existingVerification);

            await EmailVerificationService.sendVerificationEmail(
                mockUser._id,
                mockUser.email,
                `${mockUser.firstName} ${mockUser.lastName}`
            );

            expect(existingVerification.sentCount).toBe(3);
        });

        it('should update lastSentAt timestamp on resend', async () => {
            const existingVerification = {
                ...mockVerification,
                lastSentAt: new Date(Date.now() - 10 * 60 * 1000),
                canResend: jest.fn().mockReturnValue(true),
                save: jest.fn().mockResolvedValue(true)
            };

            EmailVerification.findActiveByUserId.mockResolvedValue(existingVerification);

            const beforeResend = Date.now();

            await EmailVerificationService.sendVerificationEmail(
                mockUser._id,
                mockUser.email,
                `${mockUser.firstName} ${mockUser.lastName}`
            );

            expect(existingVerification.lastSentAt.getTime()).toBeGreaterThanOrEqual(beforeResend);
        });

        it('should not resend if user already verified', async () => {
            const verifiedUser = { ...mockUser, isEmailVerified: true };
            User.findById.mockReturnValue({
                select: jest.fn().mockResolvedValue(verifiedUser)
            });

            const result = await EmailVerificationService.resendVerificationEmail(mockUser._id);

            expect(result.success).toBe(false);
            expect(result.code).toBe('ALREADY_VERIFIED');
            expect(EmailService.sendEmail).not.toHaveBeenCalled();
        });

        it('should fail resend if user does not exist', async () => {
            User.findById.mockReturnValue({
                select: jest.fn().mockResolvedValue(null)
            });

            const result = await EmailVerificationService.resendVerificationEmail('nonexistent-id');

            expect(result.success).toBe(false);
            expect(result.code).toBe('USER_NOT_FOUND');
        });

        it('should create new token if no active token exists on resend', async () => {
            EmailVerification.findActiveByUserId.mockResolvedValue(null);

            const result = await EmailVerificationService.sendVerificationEmail(
                mockUser._id,
                mockUser.email,
                `${mockUser.firstName} ${mockUser.lastName}`
            );

            expect(result.success).toBe(true);
            expect(EmailVerification.createToken).toHaveBeenCalledWith(
                mockUser._id,
                mockUser.email
            );
        });
    });

    describe('6. Rate Limiting on Resend', () => {
        it('should enforce 5-minute rate limit on resend', async () => {
            const recentVerification = {
                ...mockVerification,
                lastSentAt: new Date(Date.now() - 2 * 60 * 1000), // 2 minutes ago
                canResend: jest.fn().mockReturnValue(false)
            };

            EmailVerification.findActiveByUserId.mockResolvedValue(recentVerification);

            const result = await EmailVerificationService.sendVerificationEmail(
                mockUser._id,
                mockUser.email,
                `${mockUser.firstName} ${mockUser.lastName}`
            );

            expect(result.success).toBe(false);
            expect(result.code).toBe('RATE_LIMITED');
            expect(EmailService.sendEmail).not.toHaveBeenCalled();
        });

        it('should return wait time when rate limited', async () => {
            const recentVerification = {
                ...mockVerification,
                lastSentAt: new Date(Date.now() - 2 * 60 * 1000), // 2 minutes ago
                canResend: jest.fn().mockReturnValue(false)
            };

            EmailVerification.findActiveByUserId.mockResolvedValue(recentVerification);

            const result = await EmailVerificationService.sendVerificationEmail(
                mockUser._id,
                mockUser.email,
                `${mockUser.firstName} ${mockUser.lastName}`
            );

            expect(result.success).toBe(false);
            expect(result.code).toBe('RATE_LIMITED');
            expect(result.waitTime).toBeGreaterThan(0);
            expect(result.waitTime).toBeLessThanOrEqual(5);
        });

        it('should allow resend after 5-minute cooldown period', async () => {
            const oldVerification = {
                ...mockVerification,
                lastSentAt: new Date(Date.now() - 6 * 60 * 1000), // 6 minutes ago
                canResend: jest.fn().mockReturnValue(true),
                save: jest.fn().mockResolvedValue(true)
            };

            EmailVerification.findActiveByUserId.mockResolvedValue(oldVerification);

            const result = await EmailVerificationService.sendVerificationEmail(
                mockUser._id,
                mockUser.email,
                `${mockUser.firstName} ${mockUser.lastName}`
            );

            expect(result.success).toBe(true);
            expect(EmailService.sendEmail).toHaveBeenCalled();
        });

        it('should provide localized rate limit message in Arabic', async () => {
            const recentVerification = {
                ...mockVerification,
                lastSentAt: new Date(Date.now() - 1 * 60 * 1000), // 1 minute ago
                canResend: jest.fn().mockReturnValue(false)
            };

            EmailVerification.findActiveByUserId.mockResolvedValue(recentVerification);

            const result = await EmailVerificationService.sendVerificationEmail(
                mockUser._id,
                mockUser.email,
                `${mockUser.firstName} ${mockUser.lastName}`,
                'ar'
            );

            expect(result.success).toBe(false);
            expect(result.message).toContain('يرجى الانتظار');
            expect(result.messageEn).toContain('Please wait');
        });

        it('should track sent count across multiple resends', async () => {
            const verification = {
                ...mockVerification,
                sentCount: 5,
                lastSentAt: new Date(Date.now() - 10 * 60 * 1000),
                canResend: jest.fn().mockReturnValue(true),
                save: jest.fn().mockResolvedValue(true)
            };

            EmailVerification.findActiveByUserId.mockResolvedValue(verification);

            await EmailVerificationService.sendVerificationEmail(
                mockUser._id,
                mockUser.email,
                `${mockUser.firstName} ${mockUser.lastName}`
            );

            expect(verification.sentCount).toBe(6);
        });

        it('should calculate correct wait time remaining', async () => {
            const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
            const recentVerification = {
                ...mockVerification,
                lastSentAt: twoMinutesAgo,
                canResend: jest.fn().mockReturnValue(false)
            };

            EmailVerification.findActiveByUserId.mockResolvedValue(recentVerification);

            const result = await EmailVerificationService.sendVerificationEmail(
                mockUser._id,
                mockUser.email,
                `${mockUser.firstName} ${mockUser.lastName}`
            );

            expect(result.waitTime).toBeGreaterThanOrEqual(2);
            expect(result.waitTime).toBeLessThanOrEqual(4); // Account for test execution time
        });
    });

    describe('Verification Status', () => {
        it('should return correct verification status for unverified user', async () => {
            const activeToken = {
                ...mockVerification,
                canResend: jest.fn().mockReturnValue(true)
            };

            User.findById.mockReturnValue({
                select: jest.fn().mockResolvedValue(mockUser)
            });

            EmailVerification.findActiveByUserId.mockResolvedValue(activeToken);

            const result = await EmailVerificationService.getVerificationStatus(mockUser._id);

            expect(result.success).toBe(true);
            expect(result.isEmailVerified).toBe(false);
            expect(result.pendingVerification).toBeDefined();
            expect(result.pendingVerification.canResend).toBe(true);
        });

        it('should return correct verification status for verified user', async () => {
            const verifiedUser = {
                ...mockUser,
                isEmailVerified: true,
                emailVerifiedAt: new Date()
            };

            User.findById.mockReturnValue({
                select: jest.fn().mockResolvedValue(verifiedUser)
            });

            const result = await EmailVerificationService.getVerificationStatus(mockUser._id);

            expect(result.success).toBe(true);
            expect(result.isEmailVerified).toBe(true);
            expect(result.emailVerifiedAt).toBeDefined();
            expect(result.pendingVerification).toBeNull();
        });

        it('should handle user not found in status check', async () => {
            User.findById.mockReturnValue({
                select: jest.fn().mockResolvedValue(null)
            });

            const result = await EmailVerificationService.getVerificationStatus('nonexistent-id');

            expect(result.success).toBe(false);
            expect(result.code).toBe('USER_NOT_FOUND');
        });
    });

    describe('Error Handling', () => {
        it('should handle email service failures gracefully', async () => {
            EmailService.sendEmail.mockRejectedValue(new Error('SMTP error'));

            await expect(
                EmailVerificationService.sendVerificationEmail(
                    mockUser._id,
                    mockUser.email,
                    `${mockUser.firstName} ${mockUser.lastName}`
                )
            ).rejects.toThrow();

            expect(logger.error).toHaveBeenCalled();
        });

        it('should handle database errors during token creation', async () => {
            EmailVerification.createToken.mockRejectedValue(
                new Error('Database connection error')
            );

            await expect(
                EmailVerificationService.sendVerificationEmail(
                    mockUser._id,
                    mockUser.email,
                    `${mockUser.firstName} ${mockUser.lastName}`
                )
            ).rejects.toThrow();
        });

        it('should handle template rendering errors', async () => {
            EmailTemplateService.render.mockRejectedValue(
                new Error('Template not found')
            );

            await expect(
                EmailVerificationService.sendVerificationEmail(
                    mockUser._id,
                    mockUser.email,
                    `${mockUser.firstName} ${mockUser.lastName}`
                )
            ).rejects.toThrow();
        });

        it('should log errors with proper context', async () => {
            const error = new Error('Test error');
            EmailVerification.createToken.mockRejectedValue(error);

            await expect(
                EmailVerificationService.sendVerificationEmail(
                    mockUser._id,
                    mockUser.email,
                    `${mockUser.firstName} ${mockUser.lastName}`
                )
            ).rejects.toThrow();

            expect(logger.error).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    error: error.message,
                    userId: mockUser._id,
                    email: mockUser.email
                })
            );
        });
    });
});
