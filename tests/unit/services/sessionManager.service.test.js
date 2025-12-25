/**
 * Session Manager Service Unit Tests
 *
 * Comprehensive tests for session management including:
 * - Session creation with device fingerprinting
 * - Session termination (single and bulk)
 * - Session limit enforcement
 * - Device fingerprinting and detection
 * - Session activity tracking
 * - Session timeout validation
 * - Active session listing
 * - Concurrent session control
 */

const crypto = require('crypto');

// Mock dependencies BEFORE requiring the service
jest.mock('../../../src/models/session.model');
jest.mock('../../../src/models/notification.model');
jest.mock('../../../src/models/firm.model');
jest.mock('ua-parser-js');
jest.mock('../../../src/utils/logger', () => ({
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
}));

// Require after mocks are set up
const SessionManagerService = require('../../../src/services/sessionManager.service');
const Session = require('../../../src/models/session.model');
const Notification = require('../../../src/models/notification.model');
const Firm = require('../../../src/models/firm.model');
const UAParser = require('ua-parser-js');
const logger = require('../../../src/utils/logger');

describe('SessionManager Service Unit Tests', () => {
    let mockUserId;
    let mockToken;
    let mockTokenHash;
    let mockDeviceInfo;
    let mockSession;
    let mockUAParser;
    let mockFirm;

    beforeEach(() => {
        // Clear all mocks before each test
        jest.clearAllMocks();
        jest.resetAllMocks();

        // Mock user ID
        mockUserId = '507f1f77bcf86cd799439011';

        // Mock token
        mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';
        mockTokenHash = crypto.createHash('sha256').update(mockToken).digest('hex');

        // Mock device info
        mockDeviceInfo = {
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            ip: '192.168.1.100',
            firmId: '507f1f77bcf86cd799439012',
            country: 'US',
            city: 'New York',
            region: 'NY',
            timezone: 'America/New_York',
            metadata: { source: 'web' }
        };

        // Mock UA Parser
        mockUAParser = {
            getResult: jest.fn().mockReturnValue({
                browser: { name: 'Chrome', version: '91.0.4472.124' },
                os: { name: 'Windows', version: '10' },
                device: { type: undefined, model: undefined }
            })
        };
        UAParser.mockImplementation(() => mockUAParser);

        // Mock session document
        mockSession = {
            _id: '507f1f77bcf86cd799439013',
            userId: mockUserId,
            firmId: mockDeviceInfo.firmId,
            tokenHash: mockTokenHash,
            deviceInfo: {
                userAgent: mockDeviceInfo.userAgent,
                ip: mockDeviceInfo.ip,
                device: 'desktop',
                browser: 'Chrome',
                os: 'Windows',
                platform: '10'
            },
            location: {
                ip: mockDeviceInfo.ip,
                country: mockDeviceInfo.country,
                city: mockDeviceInfo.city,
                region: mockDeviceInfo.region,
                timezone: mockDeviceInfo.timezone
            },
            createdAt: new Date(),
            lastActivityAt: new Date(),
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            isActive: true,
            isNewDevice: false,
            metadata: mockDeviceInfo.metadata,
            updateActivity: jest.fn().mockResolvedValue(true),
            terminate: jest.fn().mockResolvedValue(true),
            isValid: jest.fn().mockReturnValue(true),
            save: jest.fn().mockResolvedValue(true)
        };

        // Mock firm
        mockFirm = {
            _id: mockDeviceInfo.firmId,
            enterpriseSettings: {
                maxSessionsPerUser: 5
            }
        };

        // Setup default Session model mocks
        Session.hashToken = jest.fn().mockReturnValue(mockTokenHash);
        Session.isKnownDevice = jest.fn().mockResolvedValue(false);
        Session.mockImplementation(() => mockSession);
        Session.prototype.save = jest.fn().mockResolvedValue(mockSession);
        Session.findByToken = jest.fn().mockResolvedValue(mockSession);
        Session.getActiveSessions = jest.fn().mockResolvedValue([mockSession]);
        Session.terminateSession = jest.fn().mockResolvedValue(mockSession);
        Session.terminateAllExcept = jest.fn().mockResolvedValue({ modifiedCount: 2 });
        Session.terminateAll = jest.fn().mockResolvedValue({ modifiedCount: 3 });
        Session.findById = jest.fn().mockResolvedValue(mockSession);
        Session.findOne = jest.fn().mockResolvedValue(mockSession);
        Session.find = jest.fn().mockReturnValue({
            sort: jest.fn().mockResolvedValue([])
        });
        Session.cleanupExpired = jest.fn().mockResolvedValue(5);
        Session.getSessionsByIP = jest.fn().mockResolvedValue([mockSession]);
        Session.getUserStats = jest.fn().mockResolvedValue({
            activeCount: 1,
            totalCount: 5,
            recentSessions: [mockSession]
        });

        // Setup Notification mock
        Notification.createNotification = jest.fn().mockResolvedValue({ _id: 'notification-123' });

        // Setup Firm mock with chaining support
        Firm.findById = jest.fn().mockReturnValue({
            select: jest.fn().mockResolvedValue(mockFirm)
        });

        // Mock logger methods
        logger.error.mockClear();
        logger.info.mockClear();
        logger.warn.mockClear();
        logger.debug.mockClear();
    });

    afterEach(() => {
        // Clean up any pending timers or async operations
        jest.clearAllTimers();
    });

    // ═══════════════════════════════════════════════════════════════
    // TEST 1: SESSION CREATION
    // ═══════════════════════════════════════════════════════════════

    describe('1. Session Creation', () => {
        it('should create a session with correct structure', async () => {
            // Arrange
            Session.isKnownDevice.mockResolvedValue(false);
            const mockSave = jest.fn().mockResolvedValue(mockSession);
            Session.mockImplementation(function(data) {
                this.userId = data.userId;
                this.firmId = data.firmId;
                this.tokenHash = data.tokenHash;
                this.deviceInfo = data.deviceInfo;
                this.location = data.location;
                this.createdAt = data.createdAt;
                this.lastActivityAt = data.lastActivityAt;
                this.expiresAt = data.expiresAt;
                this.isActive = data.isActive;
                this.isNewDevice = data.isNewDevice;
                this.metadata = data.metadata;
                this.save = mockSave;
                return this;
            });

            // Act
            const result = await SessionManagerService.createSession(mockUserId, mockToken, mockDeviceInfo);

            // Assert
            expect(Session.hashToken).toHaveBeenCalledWith(mockToken);
            expect(UAParser).toHaveBeenCalledWith(mockDeviceInfo.userAgent);
            expect(mockUAParser.getResult).toHaveBeenCalled();
            expect(mockSave).toHaveBeenCalled();

            // Verify session structure
            expect(result.userId).toBe(mockUserId);
            expect(result.firmId).toBe(mockDeviceInfo.firmId);
            expect(result.tokenHash).toBe(mockTokenHash);
            expect(result.deviceInfo).toMatchObject({
                userAgent: mockDeviceInfo.userAgent,
                ip: mockDeviceInfo.ip,
                device: 'desktop',
                browser: 'Chrome',
                os: 'Windows'
            });
            expect(result.location).toMatchObject({
                ip: mockDeviceInfo.ip,
                country: mockDeviceInfo.country,
                city: mockDeviceInfo.city,
                region: mockDeviceInfo.region,
                timezone: mockDeviceInfo.timezone
            });
            expect(result.isActive).toBe(true);
            expect(result.metadata).toEqual(mockDeviceInfo.metadata);
        });

        it('should detect and flag new device during session creation', async () => {
            // Arrange
            Session.isKnownDevice.mockResolvedValue(false);
            const mockSave = jest.fn().mockResolvedValue(mockSession);
            Session.mockImplementation(function(data) {
                this.isNewDevice = data.isNewDevice;
                this.save = mockSave;
                return this;
            });

            // Act
            await SessionManagerService.createSession(mockUserId, mockToken, mockDeviceInfo);

            // Assert
            expect(Session.isKnownDevice).toHaveBeenCalledWith(
                mockUserId,
                expect.objectContaining({
                    userAgent: mockDeviceInfo.userAgent,
                    ip: mockDeviceInfo.ip,
                    device: 'desktop',
                    browser: 'Chrome',
                    os: 'Windows'
                })
            );
        });

        it('should not flag known device during session creation', async () => {
            // Arrange
            Session.isKnownDevice.mockResolvedValue(true);
            const mockSave = jest.fn().mockResolvedValue({ ...mockSession, isNewDevice: false });
            Session.mockImplementation(function(data) {
                this.isNewDevice = data.isNewDevice;
                this.save = mockSave;
                return this;
            });

            // Act
            const result = await SessionManagerService.createSession(mockUserId, mockToken, mockDeviceInfo);

            // Assert
            expect(result.isNewDevice).toBe(false);
        });

        it('should set session expiration to 7 days from creation', async () => {
            // Arrange
            const mockSave = jest.fn().mockResolvedValue(mockSession);
            Session.mockImplementation(function(data) {
                this.expiresAt = data.expiresAt;
                this.save = mockSave;
                return this;
            });

            const beforeCreate = Date.now();

            // Act
            const result = await SessionManagerService.createSession(mockUserId, mockToken, mockDeviceInfo);

            // Assert
            const expectedExpiration = 7 * 24 * 60 * 60 * 1000; // 7 days in ms
            const actualExpiration = result.expiresAt - beforeCreate;
            expect(actualExpiration).toBeGreaterThan(expectedExpiration - 1000); // Allow 1 second tolerance
            expect(actualExpiration).toBeLessThan(expectedExpiration + 1000);
        });

        it('should handle missing device info gracefully', async () => {
            // Arrange
            const minimalDeviceInfo = {};
            const mockSave = jest.fn().mockResolvedValue(mockSession);
            Session.mockImplementation(function(data) {
                this.deviceInfo = data.deviceInfo;
                this.location = data.location;
                this.save = mockSave;
                return this;
            });

            // Act
            const result = await SessionManagerService.createSession(mockUserId, mockToken, minimalDeviceInfo);

            // Assert
            expect(result.deviceInfo.userAgent).toBe('unknown');
            expect(result.deviceInfo.ip).toBe('unknown');
            expect(result.location.ip).toBe('unknown');
            expect(mockSave).toHaveBeenCalled();
        });

        it('should throw error on session creation failure', async () => {
            // Arrange
            const error = new Error('Database connection failed');
            Session.mockImplementation(() => {
                throw error;
            });

            // Act & Assert
            await expect(
                SessionManagerService.createSession(mockUserId, mockToken, mockDeviceInfo)
            ).rejects.toThrow('Database connection failed');
            expect(logger.error).toHaveBeenCalledWith(
                'SessionManager.createSession failed:',
                error.message
            );
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // TEST 2: SESSION TERMINATION
    // ═══════════════════════════════════════════════════════════════

    describe('2. Session Termination', () => {
        it('should terminate a session successfully', async () => {
            // Arrange
            const sessionId = mockSession._id;
            const reason = 'user_terminated';
            const terminatedBy = mockUserId;

            Session.terminateSession.mockResolvedValue({
                ...mockSession,
                isActive: false,
                terminatedAt: new Date(),
                terminatedReason: reason,
                terminatedBy
            });

            // Act
            const result = await SessionManagerService.terminateSession(sessionId, reason, terminatedBy);

            // Assert
            expect(Session.terminateSession).toHaveBeenCalledWith(sessionId, reason, terminatedBy);
            expect(result.isActive).toBe(false);
            expect(result.terminatedReason).toBe(reason);
            expect(result.terminatedBy).toBe(terminatedBy);
        });

        it('should use default reason when not provided', async () => {
            // Arrange
            const sessionId = mockSession._id;

            // Act
            await SessionManagerService.terminateSession(sessionId);

            // Assert
            expect(Session.terminateSession).toHaveBeenCalledWith(
                sessionId,
                'user_terminated',
                null
            );
        });

        it('should send notification for security-related termination', async () => {
            // Arrange
            const sessionId = mockSession._id;
            const reason = 'security';
            Session.terminateSession.mockResolvedValue({
                ...mockSession,
                terminatedReason: reason
            });

            // Act
            await SessionManagerService.terminateSession(sessionId, reason, mockUserId);

            // Give async notification time to execute
            await new Promise(resolve => setTimeout(resolve, 100));

            // Assert
            expect(Notification.createNotification).toHaveBeenCalledWith(
                expect.objectContaining({
                    userId: mockUserId,
                    type: 'alert',
                    title: 'Session Terminated',
                    priority: 'high'
                })
            );
        });

        it('should not send notification for user-initiated termination', async () => {
            // Arrange
            const sessionId = mockSession._id;
            const reason = 'user_terminated';
            Session.terminateSession.mockResolvedValue({
                ...mockSession,
                terminatedReason: reason
            });

            // Act
            await SessionManagerService.terminateSession(sessionId, reason, mockUserId);

            // Give async notification time (if any) to execute
            await new Promise(resolve => setTimeout(resolve, 100));

            // Assert
            expect(Notification.createNotification).not.toHaveBeenCalled();
        });

        it('should handle termination errors gracefully', async () => {
            // Arrange
            const sessionId = mockSession._id;
            const error = new Error('Session not found');
            Session.terminateSession.mockRejectedValue(error);

            // Act & Assert
            await expect(
                SessionManagerService.terminateSession(sessionId)
            ).rejects.toThrow('Session not found');
            expect(logger.error).toHaveBeenCalledWith(
                'SessionManager.terminateSession failed:',
                error.message
            );
        });

        it('should return null when session does not exist', async () => {
            // Arrange
            const sessionId = 'non-existent-id';
            Session.terminateSession.mockResolvedValue(null);

            // Act
            const result = await SessionManagerService.terminateSession(sessionId);

            // Assert
            expect(result).toBeNull();
            expect(Notification.createNotification).not.toHaveBeenCalled();
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // TEST 3: SESSION LIMIT ENFORCEMENT
    // ═══════════════════════════════════════════════════════════════

    describe('3. Session Limit Enforcement', () => {
        it('should terminate oldest sessions when limit is exceeded', async () => {
            // Arrange
            const maxSessions = 3;
            const olderDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
            const newerDate = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);

            const mockSessions = [
                { _id: 'session-1', createdAt: olderDate, userId: mockUserId, isActive: true },
                { _id: 'session-2', createdAt: olderDate, userId: mockUserId, isActive: true },
                { _id: 'session-3', createdAt: newerDate, userId: mockUserId, isActive: true },
                { _id: 'session-4', createdAt: newerDate, userId: mockUserId, isActive: true },
                { _id: 'session-5', createdAt: new Date(), userId: mockUserId, isActive: true }
            ];

            Session.find.mockReturnValue({
                sort: jest.fn().mockResolvedValue(mockSessions)
            });

            Session.terminateSession.mockResolvedValue({ isActive: false });

            // Act
            const result = await SessionManagerService.enforceSessionLimit(mockUserId, maxSessions);

            // Assert
            expect(Session.find).toHaveBeenCalledWith({
                userId: mockUserId,
                isActive: true,
                expiresAt: { $gt: expect.any(Date) }
            });
            expect(Session.terminateSession).toHaveBeenCalledTimes(2); // Should terminate 2 oldest
            expect(Session.terminateSession).toHaveBeenCalledWith('session-1', 'limit_exceeded', mockUserId);
            expect(Session.terminateSession).toHaveBeenCalledWith('session-2', 'limit_exceeded', mockUserId);
            expect(result.success).toBe(true);
            expect(result.terminatedCount).toBe(2);
            expect(result.currentCount).toBe(maxSessions);
        });

        it('should not terminate any sessions when within limit', async () => {
            // Arrange
            const maxSessions = 5;
            const mockSessions = [
                { _id: 'session-1', createdAt: new Date(), userId: mockUserId, isActive: true },
                { _id: 'session-2', createdAt: new Date(), userId: mockUserId, isActive: true }
            ];

            Session.find.mockReturnValue({
                sort: jest.fn().mockResolvedValue(mockSessions)
            });

            // Act
            const result = await SessionManagerService.enforceSessionLimit(mockUserId, maxSessions);

            // Assert
            expect(Session.terminateSession).not.toHaveBeenCalled();
            expect(result.success).toBe(true);
            expect(result.terminatedCount).toBe(0);
            expect(result.message).toBe('Session count within limit');
        });

        it('should use default limit of 5 when not specified', async () => {
            // Arrange
            Session.find.mockReturnValue({
                sort: jest.fn().mockResolvedValue([])
            });

            // Act
            await SessionManagerService.enforceSessionLimit(mockUserId);

            // Assert
            expect(Session.find).toHaveBeenCalledWith({
                userId: mockUserId,
                isActive: true,
                expiresAt: { $gt: expect.any(Date) }
            });
        });

        it('should handle enforcement errors gracefully', async () => {
            // Arrange
            const error = new Error('Database error');
            Session.find.mockReturnValue({
                sort: jest.fn().mockRejectedValue(error)
            });

            // Act & Assert
            await expect(
                SessionManagerService.enforceSessionLimit(mockUserId, 3)
            ).rejects.toThrow('Database error');
            expect(logger.error).toHaveBeenCalledWith(
                'SessionManager.enforceSessionLimit failed:',
                error.message
            );
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // TEST 4: DEVICE FINGERPRINTING
    // ═══════════════════════════════════════════════════════════════

    describe('4. Device Fingerprinting', () => {
        it('should correctly parse desktop device', async () => {
            // Arrange
            mockUAParser.getResult.mockReturnValue({
                browser: { name: 'Chrome', version: '91.0' },
                os: { name: 'Windows', version: '10' },
                device: { type: undefined }
            });

            const mockSave = jest.fn().mockResolvedValue(mockSession);
            Session.mockImplementation(function(data) {
                this.deviceInfo = data.deviceInfo;
                this.save = mockSave;
                return this;
            });

            // Act
            const result = await SessionManagerService.createSession(mockUserId, mockToken, mockDeviceInfo);

            // Assert
            expect(result.deviceInfo.device).toBe('desktop');
            expect(result.deviceInfo.browser).toBe('Chrome');
            expect(result.deviceInfo.os).toBe('Windows');
            expect(result.deviceInfo.platform).toBe('10');
        });

        it('should correctly parse mobile device', async () => {
            // Arrange
            mockUAParser.getResult.mockReturnValue({
                browser: { name: 'Safari', version: '14.0' },
                os: { name: 'iOS', version: '14.4' },
                device: { type: 'mobile', model: 'iPhone' }
            });

            const mockSave = jest.fn().mockResolvedValue(mockSession);
            Session.mockImplementation(function(data) {
                this.deviceInfo = data.deviceInfo;
                this.save = mockSave;
                return this;
            });

            // Act
            const result = await SessionManagerService.createSession(mockUserId, mockToken, {
                ...mockDeviceInfo,
                userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_4 like Mac OS X)'
            });

            // Assert
            expect(result.deviceInfo.device).toBe('mobile');
            expect(result.deviceInfo.browser).toBe('Safari');
            expect(result.deviceInfo.os).toBe('iOS');
        });

        it('should correctly parse tablet device', async () => {
            // Arrange
            mockUAParser.getResult.mockReturnValue({
                browser: { name: 'Safari', version: '14.0' },
                os: { name: 'iOS', version: '14.4' },
                device: { type: 'tablet', model: 'iPad' }
            });

            const mockSave = jest.fn().mockResolvedValue(mockSession);
            Session.mockImplementation(function(data) {
                this.deviceInfo = data.deviceInfo;
                this.save = mockSave;
                return this;
            });

            // Act
            const result = await SessionManagerService.createSession(mockUserId, mockToken, mockDeviceInfo);

            // Assert
            expect(result.deviceInfo.device).toBe('tablet');
        });

        it('should capture IP address in device info', async () => {
            // Arrange
            const mockSave = jest.fn().mockResolvedValue(mockSession);
            Session.mockImplementation(function(data) {
                this.deviceInfo = data.deviceInfo;
                this.location = data.location;
                this.save = mockSave;
                return this;
            });

            // Act
            const result = await SessionManagerService.createSession(mockUserId, mockToken, mockDeviceInfo);

            // Assert
            expect(result.deviceInfo.ip).toBe(mockDeviceInfo.ip);
            expect(result.location.ip).toBe(mockDeviceInfo.ip);
        });

        it('should capture location information', async () => {
            // Arrange
            const mockSave = jest.fn().mockResolvedValue(mockSession);
            Session.mockImplementation(function(data) {
                this.location = data.location;
                this.save = mockSave;
                return this;
            });

            // Act
            const result = await SessionManagerService.createSession(mockUserId, mockToken, mockDeviceInfo);

            // Assert
            expect(result.location).toMatchObject({
                ip: mockDeviceInfo.ip,
                country: mockDeviceInfo.country,
                city: mockDeviceInfo.city,
                region: mockDeviceInfo.region,
                timezone: mockDeviceInfo.timezone
            });
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // TEST 5: SESSION ACTIVITY TRACKING
    // ═══════════════════════════════════════════════════════════════

    describe('5. Session Activity Tracking', () => {
        it('should update lastActivityAt when updating session activity by ID', async () => {
            // Arrange
            const sessionId = mockSession._id;
            const beforeUpdate = new Date();
            mockSession.updateActivity.mockResolvedValue({
                ...mockSession,
                lastActivityAt: new Date()
            });

            // Act
            const result = await SessionManagerService.updateSessionActivity(sessionId);

            // Assert
            expect(Session.findById).toHaveBeenCalledWith(sessionId);
            expect(mockSession.updateActivity).toHaveBeenCalled();
            expect(result.lastActivityAt.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime());
        });

        it('should update lastActivityAt when updating session activity by token', async () => {
            // Arrange
            const beforeUpdate = new Date();
            Session.findOne.mockResolvedValue({
                ...mockSession,
                updateActivity: jest.fn().mockResolvedValue({
                    ...mockSession,
                    lastActivityAt: new Date()
                })
            });

            // Act
            const result = await SessionManagerService.updateSessionActivityByToken(mockToken);

            // Assert
            expect(Session.hashToken).toHaveBeenCalledWith(mockToken);
            expect(Session.findOne).toHaveBeenCalledWith({
                tokenHash: mockTokenHash,
                isActive: true,
                expiresAt: { $gt: expect.any(Date) }
            });
            expect(result.lastActivityAt.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime());
        });

        it('should return null when session not found by ID', async () => {
            // Arrange
            Session.findById.mockResolvedValue(null);

            // Act
            const result = await SessionManagerService.updateSessionActivity('non-existent-id');

            // Assert
            expect(result).toBeNull();
        });

        it('should return null when session not found by token', async () => {
            // Arrange
            Session.findOne.mockResolvedValue(null);

            // Act
            const result = await SessionManagerService.updateSessionActivityByToken('invalid-token');

            // Assert
            expect(result).toBeNull();
        });

        it('should not update activity for inactive session', async () => {
            // Arrange
            Session.findById.mockResolvedValue({
                ...mockSession,
                isActive: false
            });

            // Act
            const result = await SessionManagerService.updateSessionActivity(mockSession._id);

            // Assert
            expect(result).toBeNull();
            expect(mockSession.updateActivity).not.toHaveBeenCalled();
        });

        it('should handle activity update errors gracefully', async () => {
            // Arrange
            const error = new Error('Update failed');
            Session.findById.mockRejectedValue(error);

            // Act
            const result = await SessionManagerService.updateSessionActivity(mockSession._id);

            // Assert
            expect(result).toBeNull();
            expect(logger.error).toHaveBeenCalledWith(
                'SessionManager.updateSessionActivity failed:',
                error.message
            );
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // TEST 6: SESSION TIMEOUT
    // ═══════════════════════════════════════════════════════════════

    describe('6. Session Timeout', () => {
        it('should reject expired session when getting by token', async () => {
            // Arrange
            const expiredSession = {
                ...mockSession,
                expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
                isActive: true
            };
            Session.findByToken.mockResolvedValue(null); // Model should filter expired

            // Act
            const result = await SessionManagerService.getSessionByToken(mockToken);

            // Assert
            expect(result).toBeNull();
        });

        it('should accept valid non-expired session', async () => {
            // Arrange
            const validSession = {
                ...mockSession,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
                isActive: true
            };
            Session.findByToken.mockResolvedValue(validSession);

            // Act
            const result = await SessionManagerService.getSessionByToken(mockToken);

            // Assert
            expect(result).not.toBeNull();
            expect(result.isActive).toBe(true);
        });

        it('should clean up expired sessions', async () => {
            // Arrange
            Session.cleanupExpired.mockResolvedValue(10);

            // Act
            const count = await SessionManagerService.cleanupExpired();

            // Assert
            expect(Session.cleanupExpired).toHaveBeenCalled();
            expect(count).toBe(10);
        });

        it('should handle cleanup errors gracefully', async () => {
            // Arrange
            const error = new Error('Cleanup failed');
            Session.cleanupExpired.mockRejectedValue(error);

            // Act
            const count = await SessionManagerService.cleanupExpired();

            // Assert
            expect(count).toBe(0);
            expect(logger.error).toHaveBeenCalledWith(
                'SessionManager.cleanupExpired failed:',
                error.message
            );
        });

        it('should not allow activity update on expired session', async () => {
            // Arrange
            const expiredSession = {
                ...mockSession,
                expiresAt: new Date(Date.now() - 1000),
                isActive: true
            };
            Session.findOne.mockResolvedValue(null); // Model should filter expired

            // Act
            const result = await SessionManagerService.updateSessionActivityByToken(mockToken);

            // Assert
            expect(result).toBeNull();
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // TEST 7: GET ACTIVE SESSIONS
    // ═══════════════════════════════════════════════════════════════

    describe('7. Get Active Sessions', () => {
        it('should retrieve all active sessions for a user', async () => {
            // Arrange
            const mockActiveSessions = [
                { ...mockSession, _id: 'session-1' },
                { ...mockSession, _id: 'session-2' },
                { ...mockSession, _id: 'session-3' }
            ];
            Session.getActiveSessions.mockResolvedValue(mockActiveSessions);

            // Act
            const result = await SessionManagerService.getActiveSessions(mockUserId);

            // Assert
            expect(Session.getActiveSessions).toHaveBeenCalledWith(mockUserId);
            expect(result).toHaveLength(3);
            expect(result).toEqual(mockActiveSessions);
        });

        it('should return empty array when user has no active sessions', async () => {
            // Arrange
            Session.getActiveSessions.mockResolvedValue([]);

            // Act
            const result = await SessionManagerService.getActiveSessions(mockUserId);

            // Assert
            expect(result).toEqual([]);
            expect(result).toHaveLength(0);
        });

        it('should handle errors when retrieving active sessions', async () => {
            // Arrange
            const error = new Error('Database error');
            Session.getActiveSessions.mockRejectedValue(error);

            // Act
            const result = await SessionManagerService.getActiveSessions(mockUserId);

            // Assert
            expect(result).toEqual([]);
            expect(logger.error).toHaveBeenCalledWith(
                'SessionManager.getActiveSessions failed:',
                error.message
            );
        });

        it('should get user session statistics', async () => {
            // Arrange
            const mockStats = {
                activeCount: 3,
                totalCount: 10,
                recentSessions: [mockSession]
            };
            Session.getUserStats.mockResolvedValue(mockStats);

            // Act
            const result = await SessionManagerService.getUserSessionStats(mockUserId);

            // Assert
            expect(Session.getUserStats).toHaveBeenCalledWith(mockUserId);
            expect(result).toEqual(mockStats);
            expect(result.activeCount).toBe(3);
            expect(result.totalCount).toBe(10);
        });

        it('should get sessions by IP address', async () => {
            // Arrange
            const ipAddress = '192.168.1.100';
            const mockIPSessions = [mockSession];
            Session.getSessionsByIP.mockResolvedValue(mockIPSessions);

            // Act
            const result = await SessionManagerService.getSessionsByIP(ipAddress);

            // Assert
            expect(Session.getSessionsByIP).toHaveBeenCalledWith(ipAddress, 100);
            expect(result).toEqual(mockIPSessions);
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // TEST 8: TERMINATE ALL SESSIONS
    // ═══════════════════════════════════════════════════════════════

    describe('8. Terminate All Sessions', () => {
        it('should terminate all sessions except current', async () => {
            // Arrange
            const currentSessionId = 'current-session-id';
            const reason = 'user_terminated';
            Session.terminateAllExcept.mockResolvedValue({ modifiedCount: 4 });

            // Act
            const result = await SessionManagerService.terminateAllSessions(
                mockUserId,
                currentSessionId,
                reason,
                mockUserId
            );

            // Assert
            expect(Session.terminateAllExcept).toHaveBeenCalledWith(
                mockUserId,
                currentSessionId,
                reason,
                mockUserId
            );
            expect(result.success).toBe(true);
            expect(result.terminatedCount).toBe(4);
            expect(result.message).toBe('4 session(s) terminated');
        });

        it('should terminate all sessions when no exception specified', async () => {
            // Arrange
            const reason = 'security';
            Session.terminateAll.mockResolvedValue({ modifiedCount: 5 });

            // Act
            const result = await SessionManagerService.terminateAllSessions(
                mockUserId,
                null,
                reason,
                mockUserId
            );

            // Assert
            expect(Session.terminateAll).toHaveBeenCalledWith(
                mockUserId,
                reason,
                mockUserId
            );
            expect(result.success).toBe(true);
            expect(result.terminatedCount).toBe(5);
            expect(result.message).toBe('5 session(s) terminated');
        });

        it('should send notification when sessions are terminated', async () => {
            // Arrange
            const reason = 'user_terminated';
            Session.terminateAllExcept.mockResolvedValue({ modifiedCount: 3 });

            // Act
            await SessionManagerService.terminateAllSessions(
                mockUserId,
                'current-session',
                reason,
                mockUserId
            );

            // Give async notification time to execute
            await new Promise(resolve => setTimeout(resolve, 100));

            // Assert
            expect(Notification.createNotification).toHaveBeenCalledWith(
                expect.objectContaining({
                    userId: mockUserId,
                    type: 'system',
                    title: 'Sessions Terminated',
                    priority: 'normal'
                })
            );
        });

        it('should not send notification when no sessions terminated', async () => {
            // Arrange
            Session.terminateAll.mockResolvedValue({ modifiedCount: 0 });

            // Act
            await SessionManagerService.terminateAllSessions(mockUserId);

            // Give async notification time (if any) to execute
            await new Promise(resolve => setTimeout(resolve, 100));

            // Assert
            expect(Notification.createNotification).not.toHaveBeenCalled();
        });

        it('should handle termination errors gracefully', async () => {
            // Arrange
            const error = new Error('Termination failed');
            Session.terminateAll.mockRejectedValue(error);

            // Act & Assert
            await expect(
                SessionManagerService.terminateAllSessions(mockUserId)
            ).rejects.toThrow('Termination failed');
            expect(logger.error).toHaveBeenCalledWith(
                'SessionManager.terminateAllSessions failed:',
                error.message
            );
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // ADDITIONAL TESTS: SESSION LIMITS & FIRM SETTINGS
    // ═══════════════════════════════════════════════════════════════

    describe('9. Session Limit from Firm Settings', () => {
        it('should get session limit from firm settings', async () => {
            // Arrange
            const firmId = mockDeviceInfo.firmId;
            Firm.findById.mockReturnValue({
                select: jest.fn().mockResolvedValue({
                    enterpriseSettings: { maxSessionsPerUser: 10 }
                })
            });

            // Act
            const limit = await SessionManagerService.getSessionLimit(mockUserId, firmId);

            // Assert
            expect(Firm.findById).toHaveBeenCalledWith(firmId);
            expect(limit).toBe(10);
        });

        it('should return default limit when firm not found', async () => {
            // Arrange
            Firm.findById.mockReturnValue({
                select: jest.fn().mockResolvedValue(null)
            });

            // Act
            const limit = await SessionManagerService.getSessionLimit(mockUserId, 'non-existent-firm');

            // Assert
            expect(limit).toBe(5);
        });

        it('should return default limit when firm has no setting', async () => {
            // Arrange
            Firm.findById.mockReturnValue({
                select: jest.fn().mockResolvedValue({
                    enterpriseSettings: {}
                })
            });

            // Act
            const limit = await SessionManagerService.getSessionLimit(mockUserId, mockDeviceInfo.firmId);

            // Assert
            expect(limit).toBe(5);
        });

        it('should lookup firmId from session when not provided', async () => {
            // Arrange
            Session.findOne.mockReturnValue({
                select: jest.fn().mockResolvedValue({ firmId: mockDeviceInfo.firmId })
            });
            Firm.findById.mockReturnValue({
                select: jest.fn().mockResolvedValue({
                    enterpriseSettings: { maxSessionsPerUser: 8 }
                })
            });

            // Act
            const limit = await SessionManagerService.getSessionLimit(mockUserId);

            // Assert
            expect(Session.findOne).toHaveBeenCalledWith({ userId: mockUserId });
            expect(Firm.findById).toHaveBeenCalledWith(mockDeviceInfo.firmId);
            expect(limit).toBe(8);
        });

        it('should handle errors when getting session limit', async () => {
            // Arrange
            const error = new Error('Database error');
            Firm.findById.mockReturnValue({
                select: jest.fn().mockRejectedValue(error)
            });

            // Act
            const limit = await SessionManagerService.getSessionLimit(mockUserId, mockDeviceInfo.firmId);

            // Assert
            expect(limit).toBe(5);
            expect(logger.error).toHaveBeenCalledWith(
                'SessionManager.getSessionLimit failed:',
                error.message
            );
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // ADDITIONAL TESTS: SESSION LOOKUP
    // ═══════════════════════════════════════════════════════════════

    describe('10. Session Lookup Operations', () => {
        it('should find session by token', async () => {
            // Arrange
            Session.findByToken.mockResolvedValue(mockSession);

            // Act
            const result = await SessionManagerService.getSessionByToken(mockToken);

            // Assert
            expect(Session.findByToken).toHaveBeenCalledWith(mockToken);
            expect(result).toEqual(mockSession);
        });

        it('should return null when session not found by token', async () => {
            // Arrange
            Session.findByToken.mockResolvedValue(null);

            // Act
            const result = await SessionManagerService.getSessionByToken('invalid-token');

            // Assert
            expect(result).toBeNull();
        });

        it('should handle errors when getting session by token', async () => {
            // Arrange
            const error = new Error('Database error');
            Session.findByToken.mockRejectedValue(error);

            // Act
            const result = await SessionManagerService.getSessionByToken(mockToken);

            // Assert
            expect(result).toBeNull();
            expect(logger.error).toHaveBeenCalledWith(
                'SessionManager.getSessionByToken failed:',
                error.message
            );
        });
    });
});
