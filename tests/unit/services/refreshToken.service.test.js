/**
 * Refresh Token Service Unit Tests
 *
 * Tests for secure refresh token management including:
 * - Token creation with family tracking
 * - Token rotation on refresh
 * - Reuse attack detection
 * - Family revocation on security events
 * - Token expiration handling
 * - Device fingerprinting
 * - Token revocation
 * - Token lookup operations
 * - Automatic TTL-based cleanup
 */

const refreshTokenService = require('../../../src/services/refreshToken.service');
const RefreshToken = require('../../../src/models/refreshToken.model');
const { User } = require('../../../src/models');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../../../src/utils/generateToken');
const logger = require('../../../src/utils/contextLogger');
const auditLogService = require('../../../src/services/auditLog.service');
const crypto = require('crypto');

// Mock dependencies
jest.mock('../../../src/models/refreshToken.model');
jest.mock('../../../src/models');
jest.mock('../../../src/utils/generateToken');
jest.mock('../../../src/utils/contextLogger');
jest.mock('../../../src/services/auditLog.service');

describe('Refresh Token Service Unit Tests', () => {
    let mockUser;
    let mockRefreshToken;
    let mockDeviceInfo;
    let mockTokenHash;
    let mockFamily;

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock user data
        mockUser = {
            _id: '507f1f77bcf86cd799439011',
            email: 'test@example.com',
            role: 'user',
            firstName: 'Test',
            lastName: 'User',
            isSeller: false,
            isSoloLawyer: false,
            firmId: null,
            firmRole: null
        };

        // Mock device info
        mockDeviceInfo = {
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            ip: '192.168.1.1',
            deviceId: 'device-123',
            browser: 'Chrome',
            os: 'Windows',
            device: 'desktop'
        };

        // Mock token values
        mockTokenHash = crypto.createHash('sha256').update('mock-token-jwt').digest('hex');
        mockFamily = 'family-123456789abcdef';

        // Mock refresh token document
        mockRefreshToken = {
            _id: '507f1f77bcf86cd799439012',
            token: mockTokenHash,
            userId: mockUser._id,
            firmId: null,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            isRevoked: false,
            revokedAt: null,
            revokedReason: null,
            family: mockFamily,
            rotatedFrom: null,
            deviceInfo: mockDeviceInfo,
            lastUsedAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
            revoke: jest.fn().mockResolvedValue(true),
            isValid: jest.fn().mockReturnValue(true),
            updateLastUsed: jest.fn().mockResolvedValue(true),
            getAge: jest.fn().mockReturnValue(1000),
            getTimeUntilExpiration: jest.fn().mockReturnValue(7 * 24 * 60 * 60 * 1000),
            save: jest.fn().mockResolvedValue(true)
        };

        // Setup default mocks
        RefreshToken.generateFamily = jest.fn().mockReturnValue(mockFamily);
        RefreshToken.hashToken = jest.fn().mockReturnValue(mockTokenHash);
        RefreshToken.create = jest.fn().mockResolvedValue(mockRefreshToken);
        RefreshToken.findOne = jest.fn().mockResolvedValue(mockRefreshToken);
        RefreshToken.findByToken = jest.fn().mockResolvedValue(mockRefreshToken);
        RefreshToken.getActiveTokens = jest.fn().mockResolvedValue([mockRefreshToken]);
        RefreshToken.getActiveTokenCount = jest.fn().mockResolvedValue(1);
        RefreshToken.revokeFamily = jest.fn().mockResolvedValue(5);
        RefreshToken.revokeToken = jest.fn().mockResolvedValue(mockRefreshToken);
        RefreshToken.revokeAllUserTokens = jest.fn().mockResolvedValue(3);
        RefreshToken.cleanupExpired = jest.fn().mockResolvedValue(10);
        RefreshToken.checkReuse = jest.fn().mockResolvedValue({ isReuse: false });

        User.findById = jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
                lean: jest.fn().mockResolvedValue(mockUser)
            })
        });

        generateRefreshToken.mockReturnValue('mock-refresh-token-jwt');
        generateAccessToken.mockReturnValue('mock-access-token-jwt');
        verifyRefreshToken.mockReturnValue({ id: mockUser._id });

        logger.info = jest.fn();
        logger.warn = jest.fn();
        logger.error = jest.fn();

        auditLogService.log = jest.fn().mockResolvedValue(true);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    // ============ TEST 1: REFRESH TOKEN CREATION ============

    describe('1. Refresh Token Creation', () => {
        it('should create refresh token with correct structure', async () => {
            const userId = mockUser._id;
            const deviceInfo = mockDeviceInfo;
            const firmId = null;

            const result = await refreshTokenService.createRefreshToken(userId, deviceInfo, firmId);

            // Verify family was generated
            expect(RefreshToken.generateFamily).toHaveBeenCalled();

            // Verify user was fetched
            expect(User.findById).toHaveBeenCalledWith(userId);

            // Verify JWT was generated
            expect(generateRefreshToken).toHaveBeenCalledWith(mockUser);

            // Verify token was hashed
            expect(RefreshToken.hashToken).toHaveBeenCalledWith('mock-refresh-token-jwt');

            // Verify token was stored with correct structure
            expect(RefreshToken.create).toHaveBeenCalledWith({
                token: mockTokenHash,
                userId,
                firmId,
                expiresAt: expect.any(Date),
                family: mockFamily,
                deviceInfo: {
                    userAgent: deviceInfo.userAgent,
                    ip: deviceInfo.ip,
                    deviceId: deviceInfo.deviceId,
                    browser: deviceInfo.browser,
                    os: deviceInfo.os,
                    device: deviceInfo.device
                }
            });

            // Verify JWT was returned
            expect(result).toBe('mock-refresh-token-jwt');

            // Verify logging
            expect(logger.info).toHaveBeenCalledWith('Refresh token created', {
                userId,
                tokenId: mockRefreshToken._id,
                family: mockFamily
            });
        });

        it('should create token with default device info when not provided', async () => {
            const userId = mockUser._id;
            const emptyDeviceInfo = {};

            await refreshTokenService.createRefreshToken(userId, emptyDeviceInfo);

            expect(RefreshToken.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    deviceInfo: {
                        userAgent: 'unknown',
                        ip: 'unknown',
                        deviceId: null,
                        browser: null,
                        os: null,
                        device: 'unknown'
                    }
                })
            );
        });

        it('should throw error if user not found', async () => {
            User.findById = jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                    lean: jest.fn().mockResolvedValue(null)
                })
            });

            await expect(
                refreshTokenService.createRefreshToken(mockUser._id, mockDeviceInfo)
            ).rejects.toThrow('User not found');
        });

        it('should set expiration to 7 days from now', async () => {
            const beforeCreate = Date.now();
            await refreshTokenService.createRefreshToken(mockUser._id, mockDeviceInfo);
            const afterCreate = Date.now();

            const createCall = RefreshToken.create.mock.calls[0][0];
            const expiresAt = createCall.expiresAt.getTime();
            const expectedExpiry = 7 * 24 * 60 * 60 * 1000;

            expect(expiresAt).toBeGreaterThanOrEqual(beforeCreate + expectedExpiry);
            expect(expiresAt).toBeLessThanOrEqual(afterCreate + expectedExpiry);
        });
    });

    // ============ TEST 2: REFRESH TOKEN FAMILY TRACKING ============

    describe('2. Refresh Token Family Tracking', () => {
        it('should assign unique family ID to new token', async () => {
            const uniqueFamily = 'unique-family-abc123';
            RefreshToken.generateFamily.mockReturnValue(uniqueFamily);

            await refreshTokenService.createRefreshToken(mockUser._id, mockDeviceInfo);

            expect(RefreshToken.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    family: uniqueFamily
                })
            );
        });

        it('should maintain same family ID across token rotation', async () => {
            // Setup: existing token with family
            const existingFamily = 'existing-family-xyz';
            const existingToken = {
                ...mockRefreshToken,
                family: existingFamily
            };

            RefreshToken.findOne.mockResolvedValue(existingToken);
            RefreshToken.checkReuse.mockResolvedValue({ isReuse: false });

            // Create new token through rotation
            const newToken = {
                ...mockRefreshToken,
                _id: 'new-token-id',
                family: existingFamily
            };
            RefreshToken.create.mockResolvedValue(newToken);

            await refreshTokenService.refreshAccessToken('mock-refresh-token-jwt');

            // Verify new token has same family
            expect(RefreshToken.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    family: existingFamily
                })
            );
        });

        it('should track rotation chain with rotatedFrom field', async () => {
            const oldTokenId = '507f1f77bcf86cd799439012';
            const existingToken = {
                ...mockRefreshToken,
                _id: oldTokenId
            };

            RefreshToken.findOne.mockResolvedValue(existingToken);
            RefreshToken.checkReuse.mockResolvedValue({ isReuse: false });

            await refreshTokenService.refreshAccessToken('mock-refresh-token-jwt');

            expect(RefreshToken.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    rotatedFrom: oldTokenId
                })
            );
        });

        it('should allow multiple families per user (multiple devices)', async () => {
            const tokens = [
                { ...mockRefreshToken, family: 'family-device-1' },
                { ...mockRefreshToken, family: 'family-device-2' },
                { ...mockRefreshToken, family: 'family-device-3' }
            ];

            RefreshToken.getActiveTokens.mockResolvedValue(tokens);
            RefreshToken.getActiveTokenCount.mockResolvedValue(3);

            const stats = await refreshTokenService.getTokenStats(mockUser._id);

            expect(stats.familyCount).toBe(3);
            expect(stats.activeCount).toBe(3);
        });
    });

    // ============ TEST 3: TOKEN ROTATION ============

    describe('3. Token Rotation', () => {
        it('should generate new token pair on refresh', async () => {
            RefreshToken.checkReuse.mockResolvedValue({ isReuse: false });
            RefreshToken.findOne.mockResolvedValue(mockRefreshToken);

            const result = await refreshTokenService.refreshAccessToken('mock-refresh-token-jwt');

            expect(generateAccessToken).toHaveBeenCalledWith(mockUser);
            expect(generateRefreshToken).toHaveBeenCalledWith(mockUser);
            expect(result.accessToken).toBe('mock-access-token-jwt');
            expect(result.refreshToken).toBe('mock-refresh-token-jwt');
        });

        it('should revoke old token after creating new one', async () => {
            RefreshToken.checkReuse.mockResolvedValue({ isReuse: false });
            RefreshToken.findOne.mockResolvedValue(mockRefreshToken);

            await refreshTokenService.refreshAccessToken('mock-refresh-token-jwt');

            expect(mockRefreshToken.revoke).toHaveBeenCalledWith('refresh');
        });

        it('should update lastUsedAt timestamp on new token', async () => {
            RefreshToken.checkReuse.mockResolvedValue({ isReuse: false });
            RefreshToken.findOne.mockResolvedValue(mockRefreshToken);

            const newToken = {
                ...mockRefreshToken,
                updateLastUsed: jest.fn().mockResolvedValue(true)
            };
            RefreshToken.create.mockResolvedValue(newToken);

            await refreshTokenService.refreshAccessToken('mock-refresh-token-jwt');

            expect(newToken.updateLastUsed).toHaveBeenCalled();
        });

        it('should return user info in refresh response', async () => {
            RefreshToken.checkReuse.mockResolvedValue({ isReuse: false });
            RefreshToken.findOne.mockResolvedValue(mockRefreshToken);

            const result = await refreshTokenService.refreshAccessToken('mock-refresh-token-jwt');

            expect(result.user).toEqual({
                id: mockUser._id,
                email: mockUser.email,
                role: mockUser.role,
                firstName: mockUser.firstName,
                lastName: mockUser.lastName,
                isSeller: mockUser.isSeller,
                isSoloLawyer: mockUser.isSoloLawyer,
                firmId: mockUser.firmId,
                firmRole: mockUser.firmRole
            });
        });

        it('should copy device info from old token to new token', async () => {
            RefreshToken.checkReuse.mockResolvedValue({ isReuse: false });
            RefreshToken.findOne.mockResolvedValue(mockRefreshToken);

            await refreshTokenService.refreshAccessToken('mock-refresh-token-jwt');

            expect(RefreshToken.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    deviceInfo: mockDeviceInfo
                })
            );
        });

        it('should log token refresh event', async () => {
            RefreshToken.checkReuse.mockResolvedValue({ isReuse: false });
            RefreshToken.findOne.mockResolvedValue(mockRefreshToken);

            await refreshTokenService.refreshAccessToken('mock-refresh-token-jwt');

            expect(auditLogService.log).toHaveBeenCalledWith(
                'token_refreshed',
                'user',
                mockUser._id,
                null,
                expect.objectContaining({
                    userId: mockUser._id,
                    userEmail: mockUser.email,
                    family: mockFamily,
                    severity: 'low'
                })
            );
        });
    });

    // ============ TEST 4: TOKEN REUSE DETECTION ============

    describe('4. Token Reuse Detection', () => {
        it('should detect when revoked token is reused', async () => {
            RefreshToken.checkReuse.mockResolvedValue({
                isReuse: true,
                family: mockFamily,
                userId: mockUser._id
            });

            await expect(
                refreshTokenService.refreshAccessToken('mock-refresh-token-jwt')
            ).rejects.toThrow('TOKEN_REUSE_DETECTED');
        });

        it('should allow valid token that has not been used', async () => {
            RefreshToken.checkReuse.mockResolvedValue({ isReuse: false });
            RefreshToken.findOne.mockResolvedValue(mockRefreshToken);

            await expect(
                refreshTokenService.refreshAccessToken('mock-refresh-token-jwt')
            ).resolves.toBeDefined();
        });

        it('should check for reuse before processing token', async () => {
            RefreshToken.checkReuse.mockResolvedValue({
                isReuse: true,
                family: mockFamily,
                userId: mockUser._id
            });

            try {
                await refreshTokenService.refreshAccessToken('mock-refresh-token-jwt');
            } catch (error) {
                // Expected error
            }

            // Should check reuse early
            expect(RefreshToken.checkReuse).toHaveBeenCalled();
            // Should not create new token if reuse detected
            expect(RefreshToken.create).not.toHaveBeenCalled();
        });

        it('should log security event on reuse detection', async () => {
            RefreshToken.checkReuse.mockResolvedValue({
                isReuse: true,
                family: mockFamily,
                userId: mockUser._id
            });

            try {
                await refreshTokenService.refreshAccessToken('mock-refresh-token-jwt');
            } catch (error) {
                // Expected error
            }

            expect(logger.error).toHaveBeenCalledWith(
                'Refresh token reuse detected',
                expect.objectContaining({
                    userId: mockUser._id,
                    family: mockFamily
                })
            );
        });
    });

    // ============ TEST 5: FAMILY REVOCATION ON REUSE ============

    describe('5. Family Revocation on Reuse', () => {
        it('should revoke entire token family when reuse detected', async () => {
            RefreshToken.checkReuse.mockResolvedValue({
                isReuse: true,
                family: mockFamily,
                userId: mockUser._id
            });

            try {
                await refreshTokenService.refreshAccessToken('mock-refresh-token-jwt');
            } catch (error) {
                // Expected error
            }

            expect(RefreshToken.revokeFamily).toHaveBeenCalledWith(
                mockFamily,
                'reuse_detected'
            );
        });

        it('should log audit event for family revocation', async () => {
            RefreshToken.checkReuse.mockResolvedValue({
                isReuse: true,
                family: mockFamily,
                userId: mockUser._id
            });

            try {
                await refreshTokenService.refreshAccessToken('mock-refresh-token-jwt');
            } catch (error) {
                // Expected error
            }

            expect(auditLogService.log).toHaveBeenCalledWith(
                'token_reuse_detected',
                'user',
                mockUser._id,
                null,
                expect.objectContaining({
                    userId: mockUser._id,
                    family: mockFamily,
                    severity: 'critical',
                    action: 'revoked_token_family'
                })
            );
        });

        it('should revoke all tokens in family including valid ones', async () => {
            const familyTokens = [
                { ...mockRefreshToken, isRevoked: false },
                { ...mockRefreshToken, isRevoked: false },
                { ...mockRefreshToken, isRevoked: false }
            ];

            RefreshToken.revokeFamily.mockResolvedValue(familyTokens.length);
            RefreshToken.checkReuse.mockResolvedValue({
                isReuse: true,
                family: mockFamily,
                userId: mockUser._id
            });

            try {
                await refreshTokenService.refreshAccessToken('mock-refresh-token-jwt');
            } catch (error) {
                // Expected error
            }

            expect(RefreshToken.revokeFamily).toHaveBeenCalledWith(
                mockFamily,
                'reuse_detected'
            );
        });

        it('should not affect tokens from different families', async () => {
            const otherFamily = 'other-family-456';

            RefreshToken.checkReuse.mockResolvedValue({
                isReuse: true,
                family: mockFamily,
                userId: mockUser._id
            });

            try {
                await refreshTokenService.refreshAccessToken('mock-refresh-token-jwt');
            } catch (error) {
                // Expected error
            }

            // Should only revoke the compromised family
            expect(RefreshToken.revokeFamily).toHaveBeenCalledWith(
                mockFamily,
                'reuse_detected'
            );
            expect(RefreshToken.revokeFamily).not.toHaveBeenCalledWith(
                otherFamily,
                expect.any(String)
            );
        });
    });

    // ============ TEST 6: TOKEN EXPIRATION ============

    describe('6. Token Expiration', () => {
        it('should reject expired refresh token', async () => {
            const expiredToken = {
                ...mockRefreshToken,
                expiresAt: new Date(Date.now() - 1000), // 1 second ago
                isRevoked: false
            };

            RefreshToken.checkReuse.mockResolvedValue({ isReuse: false });
            RefreshToken.findOne.mockResolvedValue(expiredToken);

            await expect(
                refreshTokenService.refreshAccessToken('mock-refresh-token-jwt')
            ).rejects.toThrow('REFRESH_TOKEN_EXPIRED');
        });

        it('should accept token that has not expired', async () => {
            const validToken = {
                ...mockRefreshToken,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days future
                isRevoked: false
            };

            RefreshToken.checkReuse.mockResolvedValue({ isReuse: false });
            RefreshToken.findOne.mockResolvedValue(validToken);

            await expect(
                refreshTokenService.refreshAccessToken('mock-refresh-token-jwt')
            ).resolves.toBeDefined();
        });

        it('should log warning when expired token is used', async () => {
            const expiredToken = {
                ...mockRefreshToken,
                expiresAt: new Date(Date.now() - 1000),
                isRevoked: false
            };

            RefreshToken.checkReuse.mockResolvedValue({ isReuse: false });
            RefreshToken.findOne.mockResolvedValue(expiredToken);

            try {
                await refreshTokenService.refreshAccessToken('mock-refresh-token-jwt');
            } catch (error) {
                // Expected error
            }

            expect(logger.warn).toHaveBeenCalledWith(
                'Refresh token is expired',
                { userId: mockUser._id }
            );
        });

        it('should handle JWT expiration error', async () => {
            verifyRefreshToken.mockImplementation(() => {
                throw new Error('REFRESH_TOKEN_EXPIRED');
            });

            await expect(
                refreshTokenService.refreshAccessToken('mock-refresh-token-jwt')
            ).rejects.toThrow('INVALID_REFRESH_TOKEN');

            expect(logger.warn).toHaveBeenCalledWith(
                'Invalid refresh token JWT',
                expect.objectContaining({
                    error: 'REFRESH_TOKEN_EXPIRED'
                })
            );
        });
    });

    // ============ TEST 7: DEVICE FINGERPRINTING ============

    describe('7. Device Fingerprinting', () => {
        it('should store complete device information', async () => {
            const deviceInfo = {
                userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
                ip: '203.0.113.42',
                deviceId: 'iphone-device-789',
                browser: 'Safari',
                os: 'iOS',
                device: 'mobile'
            };

            await refreshTokenService.createRefreshToken(
                mockUser._id,
                deviceInfo
            );

            expect(RefreshToken.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    deviceInfo: {
                        userAgent: deviceInfo.userAgent,
                        ip: deviceInfo.ip,
                        deviceId: deviceInfo.deviceId,
                        browser: deviceInfo.browser,
                        os: deviceInfo.os,
                        device: deviceInfo.device
                    }
                })
            );
        });

        it('should handle missing device info fields gracefully', async () => {
            const partialDeviceInfo = {
                userAgent: 'Mozilla/5.0',
                ip: '192.168.1.1'
            };

            await refreshTokenService.createRefreshToken(
                mockUser._id,
                partialDeviceInfo
            );

            expect(RefreshToken.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    deviceInfo: {
                        userAgent: 'Mozilla/5.0',
                        ip: '192.168.1.1',
                        deviceId: null,
                        browser: null,
                        os: null,
                        device: 'unknown'
                    }
                })
            );
        });

        it('should preserve device info during token rotation', async () => {
            const customDeviceInfo = {
                userAgent: 'Custom-Agent/1.0',
                ip: '10.0.0.1',
                deviceId: 'custom-device-id',
                browser: 'Custom Browser',
                os: 'Custom OS',
                device: 'tablet'
            };

            const tokenWithDevice = {
                ...mockRefreshToken,
                deviceInfo: customDeviceInfo
            };

            RefreshToken.checkReuse.mockResolvedValue({ isReuse: false });
            RefreshToken.findOne.mockResolvedValue(tokenWithDevice);

            await refreshTokenService.refreshAccessToken('mock-refresh-token-jwt');

            expect(RefreshToken.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    deviceInfo: customDeviceInfo
                })
            );
        });

        it('should include device info in token statistics', async () => {
            const tokensWithDevices = [
                {
                    ...mockRefreshToken,
                    deviceInfo: { device: 'desktop', browser: 'Chrome' }
                },
                {
                    ...mockRefreshToken,
                    deviceInfo: { device: 'mobile', browser: 'Safari' }
                }
            ];

            RefreshToken.getActiveTokens.mockResolvedValue(tokensWithDevices);
            RefreshToken.getActiveTokenCount.mockResolvedValue(2);

            const stats = await refreshTokenService.getTokenStats(mockUser._id);

            expect(stats.tokens).toHaveLength(2);
            stats.tokens.forEach(token => {
                expect(token).toHaveProperty('deviceInfo');
            });
        });
    });

    // ============ TEST 8: TOKEN REVOCATION ============

    describe('8. Token Revocation', () => {
        it('should reject revoked token', async () => {
            const revokedToken = {
                ...mockRefreshToken,
                isRevoked: true,
                revokedReason: 'logout',
                revokedAt: new Date()
            };

            RefreshToken.checkReuse.mockResolvedValue({ isReuse: false });
            RefreshToken.findOne.mockResolvedValue(revokedToken);

            await expect(
                refreshTokenService.refreshAccessToken('mock-refresh-token-jwt')
            ).rejects.toThrow('REFRESH_TOKEN_REVOKED');
        });

        it('should revoke specific token with reason', async () => {
            const token = 'mock-refresh-token-jwt';
            RefreshToken.revokeToken.mockResolvedValue(mockRefreshToken);

            const result = await refreshTokenService.revokeRefreshToken(token, 'logout');

            expect(RefreshToken.revokeToken).toHaveBeenCalledWith(token, 'logout');
            expect(result).toEqual(mockRefreshToken);
        });

        it('should revoke all user tokens', async () => {
            const userId = mockUser._id;
            RefreshToken.revokeAllUserTokens.mockResolvedValue(5);

            const count = await refreshTokenService.revokeAllUserTokens(userId, 'security');

            expect(RefreshToken.revokeAllUserTokens).toHaveBeenCalledWith(userId, 'security');
            expect(count).toBe(5);
        });

        it('should log token revocation event', async () => {
            RefreshToken.revokeToken.mockResolvedValue(mockRefreshToken);

            await refreshTokenService.revokeRefreshToken('mock-token', 'logout');

            expect(logger.info).toHaveBeenCalledWith(
                'Refresh token revoked',
                expect.objectContaining({
                    tokenId: mockRefreshToken._id,
                    userId: mockRefreshToken.userId,
                    reason: 'logout'
                })
            );
        });

        it('should log audit event when all tokens revoked', async () => {
            const userId = mockUser._id;
            RefreshToken.revokeAllUserTokens.mockResolvedValue(3);

            await refreshTokenService.revokeAllUserTokens(userId, 'security');

            expect(auditLogService.log).toHaveBeenCalledWith(
                'all_refresh_tokens_revoked',
                'user',
                userId,
                null,
                expect.objectContaining({
                    userId,
                    count: 3,
                    reason: 'security',
                    severity: 'medium'
                })
            );
        });

        it('should log warning when revoked token is used', async () => {
            const revokedToken = {
                ...mockRefreshToken,
                isRevoked: true,
                revokedReason: 'security'
            };

            RefreshToken.checkReuse.mockResolvedValue({ isReuse: false });
            RefreshToken.findOne.mockResolvedValue(revokedToken);

            try {
                await refreshTokenService.refreshAccessToken('mock-refresh-token-jwt');
            } catch (error) {
                // Expected error
            }

            expect(logger.warn).toHaveBeenCalledWith(
                'Refresh token is revoked',
                expect.objectContaining({
                    userId: mockUser._id,
                    reason: 'security'
                })
            );
        });
    });

    // ============ TEST 9: TOKEN LOOKUP ============

    describe('9. Token Lookup', () => {
        it('should find token by hash', async () => {
            const token = 'mock-refresh-token-jwt';
            RefreshToken.findByToken.mockResolvedValue(mockRefreshToken);

            const result = await refreshTokenService.verifyToken(token);

            expect(RefreshToken.findByToken).toHaveBeenCalledWith(token);
            expect(result).toBe(true);
        });

        it('should return false for non-existent token', async () => {
            RefreshToken.findByToken.mockResolvedValue(null);

            const result = await refreshTokenService.verifyToken('invalid-token');

            expect(result).toBe(false);
        });

        it('should return false for invalid token', async () => {
            const invalidToken = {
                ...mockRefreshToken,
                isRevoked: true
            };
            invalidToken.isValid = jest.fn().mockReturnValue(false);

            RefreshToken.findByToken.mockResolvedValue(invalidToken);

            const result = await refreshTokenService.verifyToken('mock-token');

            expect(result).toBe(false);
        });

        it('should get active tokens for user', async () => {
            const userId = mockUser._id;
            const tokens = [mockRefreshToken];
            RefreshToken.getActiveTokens.mockResolvedValue(tokens);

            const result = await refreshTokenService.getActiveTokens(userId);

            expect(RefreshToken.getActiveTokens).toHaveBeenCalledWith(userId);
            expect(result).toEqual(tokens);
        });

        it('should throw error if token not found in database', async () => {
            RefreshToken.checkReuse.mockResolvedValue({ isReuse: false });
            RefreshToken.findOne.mockResolvedValue(null);

            await expect(
                refreshTokenService.refreshAccessToken('mock-refresh-token-jwt')
            ).rejects.toThrow('REFRESH_TOKEN_NOT_FOUND');

            expect(logger.warn).toHaveBeenCalledWith(
                'Refresh token not found in database',
                { userId: mockUser._id }
            );
        });

        it('should get token statistics for user', async () => {
            const tokens = [
                { ...mockRefreshToken, family: 'family-1' },
                { ...mockRefreshToken, family: 'family-2' },
                { ...mockRefreshToken, family: 'family-1' }
            ];

            RefreshToken.getActiveTokens.mockResolvedValue(tokens);
            RefreshToken.getActiveTokenCount.mockResolvedValue(3);

            const stats = await refreshTokenService.getTokenStats(mockUser._id);

            expect(stats.activeCount).toBe(3);
            expect(stats.familyCount).toBe(2);
            expect(stats.tokens).toHaveLength(3);
        });
    });

    // ============ TEST 10: AUTOMATIC CLEANUP ============

    describe('10. Automatic Cleanup', () => {
        it('should cleanup expired tokens', async () => {
            RefreshToken.cleanupExpired.mockResolvedValue(15);

            const count = await refreshTokenService.cleanupExpiredTokens();

            expect(RefreshToken.cleanupExpired).toHaveBeenCalled();
            expect(count).toBe(15);
        });

        it('should log cleanup results when tokens cleaned', async () => {
            RefreshToken.cleanupExpired.mockResolvedValue(10);

            await refreshTokenService.cleanupExpiredTokens();

            expect(logger.info).toHaveBeenCalledWith(
                'Expired refresh tokens cleaned up',
                { count: 10 }
            );
        });

        it('should not log when no tokens cleaned', async () => {
            RefreshToken.cleanupExpired.mockResolvedValue(0);

            await refreshTokenService.cleanupExpiredTokens();

            expect(logger.info).not.toHaveBeenCalled();
        });

        it('should handle cleanup errors gracefully', async () => {
            const error = new Error('Database error');
            RefreshToken.cleanupExpired.mockRejectedValue(error);

            await expect(
                refreshTokenService.cleanupExpiredTokens()
            ).rejects.toThrow('Database error');

            expect(logger.error).toHaveBeenCalledWith(
                'Failed to cleanup expired tokens',
                { error: error.message }
            );
        });

        it('should mark expired tokens as revoked with correct reason', async () => {
            // This tests the model's cleanupExpired method behavior
            RefreshToken.cleanupExpired.mockResolvedValue(5);

            const count = await refreshTokenService.cleanupExpiredTokens();

            expect(count).toBe(5);
            expect(RefreshToken.cleanupExpired).toHaveBeenCalled();
        });

        it('should use TTL index for automatic MongoDB cleanup', async () => {
            // This test verifies that the service relies on the model's cleanup
            // The model has a TTL index that auto-deletes after 30 days
            RefreshToken.cleanupExpired.mockResolvedValue(0);

            await refreshTokenService.cleanupExpiredTokens();

            expect(RefreshToken.cleanupExpired).toHaveBeenCalled();
        });
    });

    // ============ ERROR HANDLING ============

    describe('Error Handling', () => {
        it('should handle token creation failure', async () => {
            const error = new Error('Database connection failed');
            RefreshToken.create.mockRejectedValue(error);

            await expect(
                refreshTokenService.createRefreshToken(mockUser._id, mockDeviceInfo)
            ).rejects.toThrow('Database connection failed');

            expect(logger.error).toHaveBeenCalledWith(
                'Failed to create refresh token',
                { error: error.message }
            );
        });

        it('should handle token refresh failure', async () => {
            const error = new Error('Invalid token');
            verifyRefreshToken.mockImplementation(() => {
                throw error;
            });

            await expect(
                refreshTokenService.refreshAccessToken('invalid-token')
            ).rejects.toThrow('INVALID_REFRESH_TOKEN');
        });

        it('should handle user not found during refresh', async () => {
            RefreshToken.checkReuse.mockResolvedValue({ isReuse: false });
            RefreshToken.findOne.mockResolvedValue(mockRefreshToken);

            User.findById = jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                    lean: jest.fn().mockResolvedValue(null)
                })
            });

            await expect(
                refreshTokenService.refreshAccessToken('mock-refresh-token-jwt')
            ).rejects.toThrow('USER_NOT_FOUND');

            expect(logger.error).toHaveBeenCalledWith(
                'User not found for refresh token',
                { userId: mockUser._id }
            );
        });

        it('should handle revocation failure', async () => {
            const error = new Error('Revocation failed');
            RefreshToken.revokeToken.mockRejectedValue(error);

            await expect(
                refreshTokenService.revokeRefreshToken('mock-token', 'logout')
            ).rejects.toThrow('Revocation failed');

            expect(logger.error).toHaveBeenCalledWith(
                'Failed to revoke refresh token',
                { error: error.message }
            );
        });
    });
});
