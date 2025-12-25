/**
 * MFA Service Unit Tests
 * Comprehensive tests for Multi-Factor Authentication operations:
 * - TOTP secret generation and verification
 * - QR code generation
 * - Backup code generation, hashing, and verification
 * - MFA secret encryption/decryption
 */

const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

// Mock dependencies
jest.mock('bcrypt', () => ({
    hash: jest.fn(),
    compare: jest.fn(),
    hashSync: jest.fn()
}));
jest.mock('speakeasy');
jest.mock('qrcode');
jest.mock('../../../src/models', () => ({
    User: {
        findById: jest.fn()
    }
}));
jest.mock('../../../src/utils/backupCodes');
jest.mock('../../../src/utils/encryption');
jest.mock('../../../src/services/auditLog.service', () => ({
    log: jest.fn().mockResolvedValue({})
}));
jest.mock('../../../src/utils/logger', () => ({
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn()
}));

const mfaService = require('../../../src/services/mfa.service');
const { User } = require('../../../src/models');
const { generateBackupCodes, hashBackupCode, verifyBackupCode } = require('../../../src/utils/backupCodes');
const { encrypt, decrypt } = require('../../../src/utils/encryption');
const auditLogService = require('../../../src/services/auditLog.service');

describe('MFA Service Unit Tests', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    // ========================================================================
    // 1. TOTP SECRET GENERATION - Verify it generates 32-char base32 secret
    // ========================================================================

    describe('TOTP Secret Generation', () => {
        it('should generate a 32-character base32 TOTP secret', () => {
            const mockSecret = {
                base32: 'JBSWY3DPEHPK3PXP7HGURJFKRE2AAAAA', // 32 characters
                otpauth_url: 'otpauth://totp/Traf3li%20(test@example.com)?secret=JBSWY3DPEHPK3PXP7HGURJFKRE2AAAAA&issuer=Traf3li'
            };

            speakeasy.generateSecret.mockReturnValue(mockSecret);

            const result = mfaService.generateTOTPSecret('test@example.com');

            expect(speakeasy.generateSecret).toHaveBeenCalledWith({
                name: expect.stringContaining('test@example.com'),
                issuer: expect.any(String),
                length: 32
            });
            expect(result.secret).toBe(mockSecret.base32);
            expect(result.secret).toHaveLength(32);
            expect(result.secret).toMatch(/^[A-Z2-7]+$/); // Base32 format
            expect(result.otpauthUrl).toBe(mockSecret.otpauth_url);
        });

        it('should include user email in TOTP secret name', () => {
            const userEmail = 'admin@traf3li.com';
            const mockSecret = {
                base32: 'JBSWY3DPEHPK3PXP7HGURJFKRE2AAAA',
                otpauth_url: 'otpauth://totp/Traf3li%20(admin@traf3li.com)?secret=JBSWY3DPEHPK3PXP7HGURJFKRE2AAAA&issuer=Traf3li'
            };

            speakeasy.generateSecret.mockReturnValue(mockSecret);

            mfaService.generateTOTPSecret(userEmail);

            expect(speakeasy.generateSecret).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: expect.stringContaining(userEmail)
                })
            );
        });

        it('should throw error if secret generation fails', () => {
            speakeasy.generateSecret.mockImplementation(() => {
                throw new Error('Secret generation error');
            });

            expect(() => mfaService.generateTOTPSecret('test@example.com'))
                .toThrow('Failed to generate MFA secret');
        });
    });

    // ========================================================================
    // 2. QR CODE GENERATION - Verify it returns valid data URL
    // ========================================================================

    describe('QR Code Generation', () => {
        it('should generate a valid QR code data URL', async () => {
            const secret = 'JBSWY3DPEHPK3PXP7HGURJFKRE2AAAA';
            const email = 'test@example.com';
            const mockDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA';
            const mockOtpauthUrl = 'otpauth://totp/test@example.com?secret=JBSWY3DPEHPK3PXP7HGURJFKRE2AAAA&issuer=Traf3li';

            speakeasy.otpauthURL.mockReturnValue(mockOtpauthUrl);
            QRCode.toDataURL.mockResolvedValue(mockDataUrl);

            const result = await mfaService.generateQRCode(secret, email);

            expect(speakeasy.otpauthURL).toHaveBeenCalledWith({
                secret: secret,
                label: email,
                issuer: expect.any(String),
                encoding: 'base32'
            });
            expect(QRCode.toDataURL).toHaveBeenCalledWith(mockOtpauthUrl);
            expect(result).toBe(mockDataUrl);
            expect(result).toMatch(/^data:image\/png;base64,/); // Valid data URL format
        });

        it('should throw error if QR code generation fails', async () => {
            speakeasy.otpauthURL.mockReturnValue('otpauth://totp/test@example.com');
            QRCode.toDataURL.mockRejectedValue(new Error('QR generation failed'));

            await expect(mfaService.generateQRCode('SECRET', 'test@example.com'))
                .rejects
                .toThrow('Failed to generate QR code');
        });
    });

    // ========================================================================
    // 3. TOTP VERIFICATION - Verify correct code passes, wrong code fails
    // ========================================================================

    describe('TOTP Verification', () => {
        it('should verify correct TOTP token', () => {
            const secret = 'JBSWY3DPEHPK3PXP7HGURJFKRE2AAAA';
            const token = '123456';

            speakeasy.totp.verify.mockReturnValue(true);

            const result = mfaService.verifyTOTP(secret, token);

            expect(speakeasy.totp.verify).toHaveBeenCalledWith({
                secret: secret,
                encoding: 'base32',
                token: token,
                window: 1
            });
            expect(result).toBe(true);
        });

        it('should reject incorrect TOTP token', () => {
            const secret = 'JBSWY3DPEHPK3PXP7HGURJFKRE2AAAA';
            const token = '999999';

            speakeasy.totp.verify.mockReturnValue(false);

            const result = mfaService.verifyTOTP(secret, token);

            expect(result).toBe(false);
        });

        it('should reject non-6-digit token', () => {
            const secret = 'JBSWY3DPEHPK3PXP7HGURJFKRE2AAAA';
            const token = '12345'; // Only 5 digits

            const result = mfaService.verifyTOTP(secret, token);

            expect(result).toBe(false);
            expect(speakeasy.totp.verify).not.toHaveBeenCalled();
        });

        it('should reject token with non-numeric characters', () => {
            const secret = 'JBSWY3DPEHPK3PXP7HGURJFKRE2AAAA';
            const token = '12ABC6';

            const result = mfaService.verifyTOTP(secret, token);

            expect(result).toBe(false);
            expect(speakeasy.totp.verify).not.toHaveBeenCalled();
        });

        it('should handle token with spaces by removing them', () => {
            const secret = 'JBSWY3DPEHPK3PXP7HGURJFKRE2AAAA';
            const token = '123 456';

            speakeasy.totp.verify.mockReturnValue(true);

            const result = mfaService.verifyTOTP(secret, token);

            expect(speakeasy.totp.verify).toHaveBeenCalledWith({
                secret: secret,
                encoding: 'base32',
                token: '123456',
                window: 1
            });
            expect(result).toBe(true);
        });

        it('should return false if secret is missing', () => {
            const result = mfaService.verifyTOTP('', '123456');

            expect(result).toBe(false);
            expect(speakeasy.totp.verify).not.toHaveBeenCalled();
        });

        it('should return false if token is missing', () => {
            const result = mfaService.verifyTOTP('JBSWY3DPEHPK3PXP7HGURJFKRE2AAAA', '');

            expect(result).toBe(false);
            expect(speakeasy.totp.verify).not.toHaveBeenCalled();
        });
    });

    // ========================================================================
    // 4. TOTP TIME WINDOW - Verify 1-window tolerance works
    // ========================================================================

    describe('TOTP Time Window Tolerance', () => {
        it('should accept tokens within 1-window tolerance (30 seconds before/after)', () => {
            const secret = 'JBSWY3DPEHPK3PXP7HGURJFKRE2AAAA';
            const token = '123456';

            speakeasy.totp.verify.mockReturnValue(true);

            const result = mfaService.verifyTOTP(secret, token, 1);

            expect(speakeasy.totp.verify).toHaveBeenCalledWith({
                secret: secret,
                encoding: 'base32',
                token: token,
                window: 1 // Accept tokens from +/- 30 seconds
            });
            expect(result).toBe(true);
        });

        it('should use default window of 1 if not specified', () => {
            const secret = 'JBSWY3DPEHPK3PXP7HGURJFKRE2AAAA';
            const token = '123456';

            speakeasy.totp.verify.mockReturnValue(true);

            mfaService.verifyTOTP(secret, token);

            expect(speakeasy.totp.verify).toHaveBeenCalledWith(
                expect.objectContaining({
                    window: 1
                })
            );
        });

        it('should allow custom time window for stricter verification', () => {
            const secret = 'JBSWY3DPEHPK3PXP7HGURJFKRE2AAAA';
            const token = '123456';

            speakeasy.totp.verify.mockReturnValue(true);

            mfaService.verifyTOTP(secret, token, 0);

            expect(speakeasy.totp.verify).toHaveBeenCalledWith(
                expect.objectContaining({
                    window: 0 // Strict: only current time window
                })
            );
        });
    });

    // ========================================================================
    // 5. BACKUP CODE GENERATION - Verify 10 codes in XXXX-XXXX format
    // ========================================================================

    describe('Backup Code Generation', () => {
        it('should generate 10 backup codes in XXXX-XXXX format', async () => {
            const userId = 'user123';
            const mockPlainCodes = [
                'ABCD-2345',
                'EFGH-6789',
                'JKLM-9ABC',
                'NPQR-DEFG',
                'STUV-HJKL',
                'WXYZ-MNPQ',
                'A2B3-C4D5',
                'E6F7-G8H9',
                'J2K3-L4M5',
                'N6P7-Q8R9'
            ];

            const mockHashedCodes = mockPlainCodes.map(code => ({
                code: `$2b$12$hashedCode${code}`,
                used: false,
                usedAt: null
            }));

            const mockUser = {
                _id: userId,
                email: 'test@example.com',
                role: 'admin',
                mfaBackupCodes: [],
                save: jest.fn().mockResolvedValue(true)
            };

            User.findById.mockResolvedValue(mockUser);
            generateBackupCodes.mockReturnValue(mockPlainCodes);
            hashBackupCode.mockImplementation(async (code) => `$2b$12$hashedCode${code}`);

            const result = await mfaService.generateBackupCodesForUser(userId);

            expect(generateBackupCodes).toHaveBeenCalledWith(10);
            expect(result.codes).toHaveLength(10);
            expect(result.codes).toEqual(mockPlainCodes);

            // Verify all codes match XXXX-XXXX format
            result.codes.forEach(code => {
                expect(code).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
            });

            expect(mockUser.save).toHaveBeenCalled();
            expect(auditLogService.log).toHaveBeenCalledWith(
                'mfa_backup_codes_generated',
                'user',
                userId,
                null,
                expect.objectContaining({
                    count: 10
                })
            );
        });

        it('should allow custom count of backup codes', async () => {
            const userId = 'user123';
            const customCount = 5;
            const mockPlainCodes = ['ABCD-2345', 'EFGH-6789', 'JKLM-9ABC', 'NPQR-DEFG', 'STUV-HJKL'];

            const mockUser = {
                _id: userId,
                email: 'test@example.com',
                role: 'admin',
                mfaBackupCodes: [],
                save: jest.fn().mockResolvedValue(true)
            };

            User.findById.mockResolvedValue(mockUser);
            generateBackupCodes.mockReturnValue(mockPlainCodes);
            hashBackupCode.mockImplementation(async (code) => `$2b$12$hashedCode${code}`);

            const result = await mfaService.generateBackupCodesForUser(userId, customCount);

            expect(generateBackupCodes).toHaveBeenCalledWith(customCount);
            expect(result.codes).toHaveLength(customCount);
        });

        it('should throw error if user not found', async () => {
            User.findById.mockResolvedValue(null);

            await expect(mfaService.generateBackupCodesForUser('invalidUserId'))
                .rejects
                .toThrow('User not found');
        });
    });

    // ========================================================================
    // 6. BACKUP CODE HASHING - Verify codes are hashed with bcrypt
    // ========================================================================

    describe('Backup Code Hashing', () => {
        it('should hash backup codes with bcrypt before storage', async () => {
            const userId = 'user123';
            const mockPlainCodes = ['ABCD-2345', 'EFGH-6789'];
            const mockHashedCode1 = '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqfuihgb';
            const mockHashedCode2 = '$2b$12$X9v7c2yqBWVHxkd0LHAkCOYz6TtxMQJqfuihgb';

            const mockUser = {
                _id: userId,
                email: 'test@example.com',
                role: 'admin',
                mfaBackupCodes: [],
                save: jest.fn().mockResolvedValue(true)
            };

            User.findById.mockResolvedValue(mockUser);
            generateBackupCodes.mockReturnValue(mockPlainCodes);
            hashBackupCode
                .mockResolvedValueOnce(mockHashedCode1)
                .mockResolvedValueOnce(mockHashedCode2);

            await mfaService.generateBackupCodesForUser(userId, 2);

            expect(hashBackupCode).toHaveBeenCalledTimes(2);
            expect(hashBackupCode).toHaveBeenCalledWith('ABCD-2345');
            expect(hashBackupCode).toHaveBeenCalledWith('EFGH-6789');

            // Verify stored codes are hashed (not plain text)
            expect(mockUser.mfaBackupCodes).toHaveLength(2);
            expect(mockUser.mfaBackupCodes[0].code).toBe(mockHashedCode1);
            expect(mockUser.mfaBackupCodes[1].code).toBe(mockHashedCode2);
            expect(mockUser.mfaBackupCodes[0].code).toMatch(/^\$2b\$12\$/); // Bcrypt hash format
        });

        it('should store hashed codes with used flag and timestamp', async () => {
            const userId = 'user123';
            const mockPlainCodes = ['ABCD-2345'];
            const mockHashedCode = '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqfuihgb';

            const mockUser = {
                _id: userId,
                email: 'test@example.com',
                role: 'admin',
                mfaBackupCodes: [],
                save: jest.fn().mockResolvedValue(true)
            };

            User.findById.mockResolvedValue(mockUser);
            generateBackupCodes.mockReturnValue(mockPlainCodes);
            hashBackupCode.mockResolvedValue(mockHashedCode);

            await mfaService.generateBackupCodesForUser(userId, 1);

            expect(mockUser.mfaBackupCodes[0]).toMatchObject({
                code: mockHashedCode,
                used: false,
                usedAt: null
            });
        });
    });

    // ========================================================================
    // 7. BACKUP CODE VERIFICATION - Verify correct code passes
    // ========================================================================

    describe('Backup Code Verification', () => {
        it('should verify correct backup code', async () => {
            const userId = 'user123';
            const validCode = 'ABCD-2345';
            const hashedCode = '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqfuihgb';

            const mockUser = {
                _id: userId,
                email: 'test@example.com',
                role: 'admin',
                mfaBackupCodes: [
                    { code: hashedCode, used: false, usedAt: null }
                ],
                mfaVerifiedAt: null,
                save: jest.fn().mockResolvedValue(true)
            };

            User.findById.mockResolvedValue(mockUser);
            verifyBackupCode.mockResolvedValue({
                valid: true,
                codeIndex: 0
            });

            const result = await mfaService.useBackupCode(userId, validCode);

            expect(verifyBackupCode).toHaveBeenCalledWith(validCode, mockUser.mfaBackupCodes);
            expect(result.valid).toBe(true);
            expect(mockUser.save).toHaveBeenCalled();
            expect(auditLogService.log).toHaveBeenCalledWith(
                'mfa_backup_code_used',
                'user',
                userId,
                null,
                expect.any(Object)
            );
        });

        it('should reject invalid backup code', async () => {
            const userId = 'user123';
            const invalidCode = 'WRONG-CODE';

            const mockUser = {
                _id: userId,
                email: 'test@example.com',
                role: 'admin',
                mfaBackupCodes: [
                    { code: '$2b$12$hashedCode', used: false, usedAt: null }
                ],
                save: jest.fn().mockResolvedValue(true)
            };

            User.findById.mockResolvedValue(mockUser);
            verifyBackupCode.mockResolvedValue({
                valid: false,
                codeIndex: null
            });

            const result = await mfaService.useBackupCode(userId, invalidCode);

            expect(result.valid).toBe(false);
            expect(result.error).toBe('Invalid backup code');
            expect(mockUser.save).not.toHaveBeenCalled();
            expect(auditLogService.log).toHaveBeenCalledWith(
                'mfa_backup_code_failed',
                'user',
                userId,
                null,
                expect.objectContaining({
                    reason: 'Invalid backup code'
                })
            );
        });

        it('should reject verification if no backup codes available', async () => {
            const userId = 'user123';

            const mockUser = {
                _id: userId,
                email: 'test@example.com',
                role: 'admin',
                mfaBackupCodes: [],
                save: jest.fn().mockResolvedValue(true)
            };

            User.findById.mockResolvedValue(mockUser);

            const result = await mfaService.useBackupCode(userId, 'ABCD-2345');

            expect(result.valid).toBe(false);
            expect(result.error).toBe('No backup codes available');
            expect(result.remainingCodes).toBe(0);
        });
    });

    // ========================================================================
    // 8. BACKUP CODE ONE-TIME USE - Verify used code fails second time
    // ========================================================================

    describe('Backup Code One-Time Use', () => {
        it('should mark backup code as used after successful verification', async () => {
            const userId = 'user123';
            const validCode = 'ABCD-2345';
            const hashedCode = '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqfuihgb';

            const mockUser = {
                _id: userId,
                email: 'test@example.com',
                role: 'admin',
                mfaBackupCodes: [
                    { code: hashedCode, used: false, usedAt: null }
                ],
                mfaVerifiedAt: null,
                save: jest.fn().mockResolvedValue(true)
            };

            User.findById.mockResolvedValue(mockUser);
            verifyBackupCode.mockResolvedValue({
                valid: true,
                codeIndex: 0
            });

            await mfaService.useBackupCode(userId, validCode);

            // Verify code is marked as used
            expect(mockUser.mfaBackupCodes[0].used).toBe(true);
            expect(mockUser.mfaBackupCodes[0].usedAt).toBeInstanceOf(Date);
            expect(mockUser.mfaVerifiedAt).toBeInstanceOf(Date);
        });

        it('should not allow reuse of already-used backup code', async () => {
            const userId = 'user123';
            const usedCode = 'ABCD-2345';
            const hashedCode = '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqfuihgb';

            const mockUser = {
                _id: userId,
                email: 'test@example.com',
                role: 'admin',
                mfaBackupCodes: [
                    {
                        code: hashedCode,
                        used: true, // Already used
                        usedAt: new Date('2024-01-01')
                    }
                ],
                save: jest.fn().mockResolvedValue(true)
            };

            User.findById.mockResolvedValue(mockUser);
            // verifyBackupCode should return false for used codes
            verifyBackupCode.mockResolvedValue({
                valid: false,
                codeIndex: null
            });

            const result = await mfaService.useBackupCode(userId, usedCode);

            expect(result.valid).toBe(false);
            expect(mockUser.save).not.toHaveBeenCalled();
        });

        it('should decrease remaining codes count after use', async () => {
            const userId = 'user123';
            const validCode = 'ABCD-2345';

            const mockUser = {
                _id: userId,
                email: 'test@example.com',
                role: 'admin',
                mfaBackupCodes: [
                    { code: '$2b$12$hash1', used: false, usedAt: null },
                    { code: '$2b$12$hash2', used: false, usedAt: null },
                    { code: '$2b$12$hash3', used: false, usedAt: null }
                ],
                mfaVerifiedAt: null,
                save: jest.fn().mockResolvedValue(true)
            };

            User.findById.mockResolvedValue(mockUser);
            verifyBackupCode.mockResolvedValue({
                valid: true,
                codeIndex: 0
            });

            const result = await mfaService.useBackupCode(userId, validCode);

            expect(result.valid).toBe(true);
            expect(result.remainingCodes).toBe(2); // 3 total - 1 used = 2 remaining
        });
    });

    // ========================================================================
    // 9. MFA SECRET ENCRYPTION - Verify secret is encrypted before storage
    // ========================================================================

    describe('MFA Secret Encryption', () => {
        it('should encrypt MFA secret for storage', () => {
            const plainSecret = 'JBSWY3DPEHPK3PXP7HGURJFKRE2AAAA';
            const mockEncrypted = 'abc123:def456:ghi789';

            encrypt.mockReturnValue(mockEncrypted);

            const result = mfaService.encryptMFASecret(plainSecret);

            expect(encrypt).toHaveBeenCalledWith(plainSecret);
            expect(result).toBe(mockEncrypted);
            expect(result).toContain(':'); // Should be in format iv:authTag:encrypted
        });

        it('should throw error if encryption fails', () => {
            const plainSecret = 'JBSWY3DPEHPK3PXP7HGURJFKRE2AAAA';

            encrypt.mockImplementation(() => {
                throw new Error('Encryption error');
            });

            expect(() => mfaService.encryptMFASecret(plainSecret))
                .toThrow('Failed to encrypt MFA secret');
        });

        it('should use AES-256-GCM encryption for MFA secret', () => {
            const plainSecret = 'JBSWY3DPEHPK3PXP7HGURJFKRE2AAAA';
            const mockEncrypted = 'iv123:tag456:encrypted789';

            encrypt.mockReturnValue(mockEncrypted);

            mfaService.encryptMFASecret(plainSecret);

            expect(encrypt).toHaveBeenCalledWith(plainSecret);
            // The encrypt function should use AES-256-GCM as defined in encryption utility
        });
    });

    // ========================================================================
    // 10. MFA SECRET DECRYPTION - Verify secret can be decrypted
    // ========================================================================

    describe('MFA Secret Decryption', () => {
        it('should decrypt MFA secret from storage', () => {
            const encryptedSecret = 'abc123:def456:ghi789';
            const plainSecret = 'JBSWY3DPEHPK3PXP7HGURJFKRE2AAAA';

            decrypt.mockReturnValue(plainSecret);

            const result = mfaService.decryptMFASecret(encryptedSecret);

            expect(decrypt).toHaveBeenCalledWith(encryptedSecret);
            expect(result).toBe(plainSecret);
            expect(result).toMatch(/^[A-Z2-7]+$/); // Base32 format
        });

        it('should throw error if decryption fails', () => {
            const encryptedSecret = 'abc123:def456:ghi789';

            decrypt.mockImplementation(() => {
                throw new Error('Decryption error');
            });

            expect(() => mfaService.decryptMFASecret(encryptedSecret))
                .toThrow('Failed to decrypt MFA secret');
        });

        it('should successfully decrypt previously encrypted secret', () => {
            const originalSecret = 'JBSWY3DPEHPK3PXP7HGURJFKRE2AAAA';
            const encryptedSecret = 'iv123:tag456:encrypted789';

            // Simulate encrypt -> decrypt flow
            encrypt.mockReturnValue(encryptedSecret);
            decrypt.mockReturnValue(originalSecret);

            const encrypted = mfaService.encryptMFASecret(originalSecret);
            const decrypted = mfaService.decryptMFASecret(encrypted);

            expect(decrypted).toBe(originalSecret);
        });

        it('should handle corrupted encrypted data', () => {
            const corruptedSecret = 'invalid_data';

            decrypt.mockImplementation(() => {
                throw new Error('Invalid encrypted data format');
            });

            expect(() => mfaService.decryptMFASecret(corruptedSecret))
                .toThrow('Failed to decrypt MFA secret');
        });
    });

    // ========================================================================
    // ADDITIONAL TESTS - Bonus coverage
    // ========================================================================

    describe('MFA Status and Management', () => {
        it('should get MFA status correctly', async () => {
            const userId = 'user123';
            const mockUser = {
                _id: userId,
                mfaEnabled: true,
                mfaSecret: 'encryptedSecret',
                mfaBackupCodes: [
                    { code: 'hash1', used: false, usedAt: null },
                    { code: 'hash2', used: true, usedAt: new Date() },
                    { code: 'hash3', used: false, usedAt: null }
                ]
            };

            User.findById.mockReturnValue({
                select: jest.fn().mockResolvedValue(mockUser)
            });

            const result = await mfaService.getMFAStatus(userId);

            expect(result.mfaEnabled).toBe(true);
            expect(result.hasTOTP).toBe(true);
            expect(result.hasBackupCodes).toBe(true);
            expect(result.remainingCodes).toBe(2); // 2 unused codes
        });

        it('should validate MFA setup with correct token', () => {
            const secret = 'JBSWY3DPEHPK3PXP7HGURJFKRE2AAAA';
            const token = '123456';

            speakeasy.totp.verify.mockReturnValue(true);

            const result = mfaService.validateMFASetup(secret, token);

            expect(result).toBe(true);
            expect(speakeasy.totp.verify).toHaveBeenCalledWith(
                expect.objectContaining({
                    window: 1
                })
            );
        });

        it('should disable MFA and clear all settings', async () => {
            const userId = 'user123';
            const mockUser = {
                _id: userId,
                email: 'test@example.com',
                role: 'admin',
                mfaEnabled: true,
                mfaSecret: 'encryptedSecret',
                mfaBackupCodes: [{ code: 'hash', used: false }],
                mfaVerifiedAt: new Date(),
                save: jest.fn().mockResolvedValue(true)
            };

            User.findById.mockResolvedValue(mockUser);

            const result = await mfaService.disableMFA(userId);

            expect(mockUser.mfaEnabled).toBe(false);
            expect(mockUser.mfaSecret).toBeNull();
            expect(mockUser.mfaBackupCodes).toEqual([]);
            expect(mockUser.mfaVerifiedAt).toBeNull();
            expect(mockUser.save).toHaveBeenCalled();
            expect(auditLogService.log).toHaveBeenCalledWith(
                'mfa_disabled',
                'user',
                userId,
                null,
                expect.objectContaining({
                    severity: 'high'
                })
            );
        });

        it('should regenerate backup codes and invalidate old ones', async () => {
            const userId = 'user123';
            const newCodes = ['NEW1-NEW1', 'NEW2-NEW2', 'NEW3-NEW3'];

            const mockUser = {
                _id: userId,
                email: 'test@example.com',
                role: 'admin',
                mfaEnabled: true,
                mfaBackupCodes: [
                    { code: 'oldHash1', used: false },
                    { code: 'oldHash2', used: true }
                ],
                save: jest.fn().mockResolvedValue(true)
            };

            User.findById.mockResolvedValue(mockUser);
            generateBackupCodes.mockReturnValue(newCodes);
            hashBackupCode.mockImplementation(async (code) => `hashed_${code}`);

            const result = await mfaService.regenerateBackupCodes(userId, 3);

            expect(result.codes).toEqual(newCodes);
            expect(auditLogService.log).toHaveBeenCalledWith(
                'mfa_backup_codes_regenerated',
                'user',
                userId,
                null,
                expect.objectContaining({
                    details: {
                        oldCodesCount: 2,
                        newCodesCount: 3
                    }
                })
            );
        });

        it('should throw error when regenerating codes if MFA not enabled', async () => {
            const userId = 'user123';

            const mockUser = {
                _id: userId,
                email: 'test@example.com',
                role: 'admin',
                mfaEnabled: false
            };

            User.findById.mockResolvedValue(mockUser);

            await expect(mfaService.regenerateBackupCodes(userId))
                .rejects
                .toThrow('MFA must be enabled to regenerate backup codes');
        });

        it('should get remaining backup codes count', async () => {
            const userId = 'user123';

            const mockUser = {
                _id: userId,
                mfaBackupCodes: [
                    { code: 'hash1', used: false },
                    { code: 'hash2', used: true },
                    { code: 'hash3', used: false },
                    { code: 'hash4', used: true },
                    { code: 'hash5', used: false }
                ]
            };

            User.findById.mockReturnValue({
                select: jest.fn().mockResolvedValue(mockUser)
            });

            const count = await mfaService.getBackupCodesCount(userId);

            expect(count).toBe(3); // 3 unused codes
        });
    });

    describe('Edge Cases and Error Handling', () => {
        it('should handle speakeasy verification errors gracefully', () => {
            const secret = 'JBSWY3DPEHPK3PXP7HGURJFKRE2AAAA';
            const token = '123456';

            speakeasy.totp.verify.mockImplementation(() => {
                throw new Error('Verification error');
            });

            const result = mfaService.verifyTOTP(secret, token);

            expect(result).toBe(false);
        });

        it('should handle numeric token as string', () => {
            const secret = 'JBSWY3DPEHPK3PXP7HGURJFKRE2AAAA';
            const token = 123456; // Number instead of string

            speakeasy.totp.verify.mockReturnValue(true);

            const result = mfaService.verifyTOTP(secret, token);

            expect(speakeasy.totp.verify).toHaveBeenCalledWith({
                secret: secret,
                encoding: 'base32',
                token: '123456',
                window: 1
            });
            expect(result).toBe(true);
        });

        it('should return 0 for empty backup codes array', () => {
            const result = mfaService.getRemainingBackupCodesCount([]);

            expect(result).toBe(0);
        });

        it('should return 0 for null backup codes', () => {
            const result = mfaService.getRemainingBackupCodesCount(null);

            expect(result).toBe(0);
        });

        it('should return 0 for undefined backup codes', () => {
            const result = mfaService.getRemainingBackupCodesCount(undefined);

            expect(result).toBe(0);
        });
    });
});
