/**
 * MFA Service
 *
 * Handles Multi-Factor Authentication operations including:
 * - TOTP (Time-based One-Time Password) generation and verification
 * - QR code generation for authenticator apps
 * - Backup code generation and management
 * - Backup code verification
 *
 * NCA ECC-2:2024 Compliance: Section 2-3-1
 * Implements MFA for privileged access with TOTP and backup codes
 */

const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const { User } = require('../models');
const { generateBackupCodes, hashBackupCode, verifyBackupCode } = require('../utils/backupCodes');
const { encrypt, decrypt } = require('../utils/encryption');
const auditLogService = require('./auditLog.service');

const APP_NAME = process.env.APP_NAME || 'Traf3li';

// ========================================================================
// TOTP (Time-based One-Time Password) Functions
// ========================================================================

/**
 * Generate TOTP secret for a user
 * @param {string} userEmail - User email for QR code label
 * @returns {Object} - { secret, otpauthUrl, qrCodeUrl }
 */
const generateTOTPSecret = (userEmail) => {
  try {
    const secret = speakeasy.generateSecret({
      name: `${APP_NAME} (${userEmail})`,
      issuer: APP_NAME,
      length: 32, // 256-bit secret
    });

    return {
      secret: secret.base32, // Base32 encoded secret for storage
      otpauthUrl: secret.otpauth_url, // URL for QR code
      qrCodeUrl: secret.otpauth_url
    };
  } catch (error) {
    console.error('Error generating TOTP secret:', error.message);
    throw new Error('Failed to generate MFA secret');
  }
};

/**
 * Generate QR code for authenticator apps
 * @param {String} secret - TOTP secret (base32 encoded)
 * @param {String} email - User email
 * @returns {Promise<String>} - QR code as data URL
 */
const generateQRCode = async (secret, email) => {
  try {
    // Generate otpauth URL
    const otpauthUrl = speakeasy.otpauthURL({
      secret: secret,
      label: email,
      issuer: APP_NAME,
      encoding: 'base32',
    });

    // Generate QR code as data URL (PNG image embedded in data URL)
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

    return qrCodeDataUrl;
  } catch (error) {
    console.error('Error generating QR code:', error.message);
    throw new Error('Failed to generate QR code');
  }
};

/**
 * Verify TOTP token
 * @param {String} secret - TOTP secret (base32 encoded)
 * @param {String} token - 6-digit code from authenticator app
 * @param {Number} window - Time window tolerance (default: 1 = 30 seconds before/after)
 * @returns {Boolean} - True if token is valid
 */
const verifyTOTP = (secret, token, window = 1) => {
  try {
    if (!secret || !token) {
      return false;
    }

    // Remove spaces and ensure 6-digit format
    const cleanToken = token.toString().replace(/\s/g, '');

    if (!/^\d{6}$/.test(cleanToken)) {
      return false;
    }

    // Verify token with time window tolerance
    // Window = 1 means we accept tokens from 30 seconds before and after current time
    const verified = speakeasy.totp.verify({
      secret: secret,
      encoding: 'base32',
      token: cleanToken,
      window: window, // Accept tokens from +/- window * 30 seconds
    });

    return verified;
  } catch (error) {
    console.error('Error verifying TOTP token:', error.message);
    return false;
  }
};

/**
 * Encrypt MFA secret for storage
 * @param {String} secret - TOTP secret to encrypt
 * @returns {String} - Encrypted secret
 */
const encryptMFASecret = (secret) => {
  try {
    return encrypt(secret);
  } catch (error) {
    console.error('Error encrypting MFA secret:', error.message);
    throw new Error('Failed to encrypt MFA secret');
  }
};

/**
 * Decrypt MFA secret from storage
 * @param {String} encryptedSecret - Encrypted TOTP secret
 * @returns {String} - Decrypted secret
 */
const decryptMFASecret = (encryptedSecret) => {
  try {
    return decrypt(encryptedSecret);
  } catch (error) {
    console.error('Error decrypting MFA secret:', error.message);
    throw new Error('Failed to decrypt MFA secret');
  }
};

/**
 * Validate MFA setup is complete and working
 * @param {String} secret - TOTP secret
 * @param {String} token - 6-digit verification code
 * @returns {Boolean} - True if setup is valid
 */
const validateMFASetup = (secret, token) => {
  try {
    // First verification during setup should be strict (no extra window)
    return verifyTOTP(secret, token, 1);
  } catch (error) {
    console.error('Error validating MFA setup:', error.message);
    return false;
  }
};

// ========================================================================
// Backup Codes Functions
// ========================================================================

/**
 * Generate new backup codes for a user
 *
 * @param {string} userId - User ID
 * @param {number} count - Number of backup codes to generate (default: 10)
 * @returns {Promise<Object>} - {codes: string[], user: Object}
 *
 * @throws {Error} - If user not found or backup code generation fails
 *
 * @example
 * const result = await generateBackupCodesForUser('60d5ec49f1b2c8b1f8c8e4e1');
 * console.log(result.codes); // ['ABCD-1234', 'EFGH-5678', ...]
 */
const generateBackupCodesForUser = async (userId, count = 10) => {
    try {
        // Find the user
        const user = await User.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }

        // Generate plain text backup codes
        const plainCodes = generateBackupCodes(count);

        // Hash each code for storage
        const hashedCodes = [];
        for (const code of plainCodes) {
            const hashedCode = await hashBackupCode(code);
            hashedCodes.push({
                code: hashedCode,
                used: false,
                usedAt: null
            });
        }

        // Store hashed codes in user document
        user.mfaBackupCodes = hashedCodes;
        await user.save();

        // Log backup code generation
        await auditLogService.log(
            'mfa_backup_codes_generated',
            'user',
            userId,
            null,
            {
                userId,
                userEmail: user.email,
                userRole: user.role,
                count,
                severity: 'medium',
                details: {
                    totalCodes: count
                }
            }
        );

        // Return plain codes (only shown once to user)
        return {
            codes: plainCodes,
            user
        };
    } catch (error) {
        console.error('Generate backup codes error:', error.message);
        throw error;
    }
};

/**
 * Use a backup code for MFA verification
 *
 * @param {string} userId - User ID
 * @param {string} code - Backup code to verify
 * @returns {Promise<Object>} - {valid: boolean, remainingCodes: number}
 *
 * @throws {Error} - If user not found or verification fails
 *
 * @example
 * const result = await useBackupCode('60d5ec49f1b2c8b1f8c8e4e1', 'ABCD-1234');
 * if (result.valid) {
 *   console.log('Backup code verified. Remaining codes:', result.remainingCodes);
 * }
 */
const useBackupCode = async (userId, code) => {
    try {
        // Find the user
        const user = await User.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }

        // Check if user has any backup codes
        if (!user.mfaBackupCodes || user.mfaBackupCodes.length === 0) {
            await auditLogService.log(
                'mfa_backup_code_failed',
                'user',
                userId,
                null,
                {
                    userId,
                    userEmail: user.email,
                    userRole: user.role,
                    reason: 'No backup codes available',
                    severity: 'medium'
                }
            );

            return {
                valid: false,
                remainingCodes: 0,
                error: 'No backup codes available'
            };
        }

        // Verify the code
        const verificationResult = await verifyBackupCode(code, user.mfaBackupCodes);

        if (!verificationResult.valid) {
            await auditLogService.log(
                'mfa_backup_code_failed',
                'user',
                userId,
                null,
                {
                    userId,
                    userEmail: user.email,
                    userRole: user.role,
                    reason: 'Invalid backup code',
                    severity: 'medium'
                }
            );

            return {
                valid: false,
                remainingCodes: getRemainingBackupCodesCount(user.mfaBackupCodes),
                error: 'Invalid backup code'
            };
        }

        // Mark the code as used
        user.mfaBackupCodes[verificationResult.codeIndex].used = true;
        user.mfaBackupCodes[verificationResult.codeIndex].usedAt = new Date();

        // Update MFA verified timestamp
        user.mfaVerifiedAt = new Date();

        await user.save();

        // Get remaining codes count
        const remainingCodes = getRemainingBackupCodesCount(user.mfaBackupCodes);

        // Log successful backup code usage
        await auditLogService.log(
            'mfa_backup_code_used',
            'user',
            userId,
            null,
            {
                userId,
                userEmail: user.email,
                userRole: user.role,
                remainingCodes,
                severity: 'low',
                details: {
                    codeIndex: verificationResult.codeIndex
                }
            }
        );

        return {
            valid: true,
            remainingCodes,
            user
        };
    } catch (error) {
        console.error('Use backup code error:', error.message);
        throw error;
    }
};

/**
 * Regenerate backup codes for a user (invalidates all old codes)
 *
 * @param {string} userId - User ID
 * @param {number} count - Number of backup codes to generate (default: 10)
 * @returns {Promise<Object>} - {codes: string[], user: Object}
 *
 * @throws {Error} - If user not found or regeneration fails
 *
 * @example
 * const result = await regenerateBackupCodes('60d5ec49f1b2c8b1f8c8e4e1');
 * console.log(result.codes); // New backup codes
 */
const regenerateBackupCodes = async (userId, count = 10) => {
    try {
        // Find the user
        const user = await User.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }

        // Check if MFA is enabled
        if (!user.mfaEnabled) {
            throw new Error('MFA must be enabled to regenerate backup codes');
        }

        // Store old codes count for audit log
        const oldCodesCount = user.mfaBackupCodes ? user.mfaBackupCodes.length : 0;

        // Generate new backup codes (this will replace all old codes)
        const result = await generateBackupCodesForUser(userId, count);

        // Log backup code regeneration
        await auditLogService.log(
            'mfa_backup_codes_regenerated',
            'user',
            userId,
            null,
            {
                userId,
                userEmail: user.email,
                userRole: user.role,
                severity: 'medium',
                details: {
                    oldCodesCount,
                    newCodesCount: count
                }
            }
        );

        return result;
    } catch (error) {
        console.error('Regenerate backup codes error:', error.message);
        throw error;
    }
};

/**
 * Get the count of remaining (unused) backup codes for a user
 *
 * @param {string} userId - User ID
 * @returns {Promise<number>} - Count of remaining backup codes
 *
 * @example
 * const count = await getBackupCodesCount('60d5ec49f1b2c8b1f8c8e4e1');
 * console.log('Remaining codes:', count);
 */
const getBackupCodesCount = async (userId) => {
    try {
        // Find the user
        const user = await User.findById(userId).select('mfaBackupCodes');
        if (!user) {
            throw new Error('User not found');
        }

        return getRemainingBackupCodesCount(user.mfaBackupCodes);
    } catch (error) {
        console.error('Get backup codes count error:', error.message);
        throw error;
    }
};

/**
 * Helper: Get remaining codes count from backup codes array
 *
 * @param {Array} backupCodes - Array of backup code objects
 * @returns {number} - Count of unused codes
 */
const getRemainingBackupCodesCount = (backupCodes) => {
    if (!backupCodes || backupCodes.length === 0) {
        return 0;
    }

    return backupCodes.filter(code => !code.used).length;
};

/**
 * Verify if a user has MFA enabled and has backup codes
 *
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - {mfaEnabled: boolean, hasBackupCodes: boolean, remainingCodes: number}
 *
 * @example
 * const status = await getMFAStatus('60d5ec49f1b2c8b1f8c8e4e1');
 * console.log(status); // {mfaEnabled: true, hasBackupCodes: true, remainingCodes: 8}
 */
const getMFAStatus = async (userId) => {
    try {
        const user = await User.findById(userId).select('mfaEnabled mfaSecret mfaBackupCodes');
        if (!user) {
            throw new Error('User not found');
        }

        const remainingCodes = getRemainingBackupCodesCount(user.mfaBackupCodes);

        return {
            mfaEnabled: user.mfaEnabled || false,
            hasTOTP: !!user.mfaSecret,
            hasBackupCodes: remainingCodes > 0,
            remainingCodes
        };
    } catch (error) {
        console.error('Get MFA status error:', error.message);
        throw error;
    }
};

/**
 * Disable MFA for a user (removes TOTP secret and backup codes)
 *
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - Updated user object
 *
 * @example
 * const user = await disableMFA('60d5ec49f1b2c8b1f8c8e4e1');
 */
const disableMFA = async (userId) => {
    try {
        const user = await User.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }

        user.mfaEnabled = false;
        user.mfaSecret = null;
        user.mfaBackupCodes = [];
        user.mfaVerifiedAt = null;

        await user.save();

        // Log MFA disable
        await auditLogService.log(
            'mfa_disabled',
            'user',
            userId,
            null,
            {
                userId,
                userEmail: user.email,
                userRole: user.role,
                severity: 'high'
            }
        );

        return user;
    } catch (error) {
        console.error('Disable MFA error:', error.message);
        throw error;
    }
};

module.exports = {
    // TOTP functions
    generateTOTPSecret,
    generateQRCode,
    verifyTOTP,
    encryptMFASecret,
    decryptMFASecret,
    validateMFASetup,

    // Backup code functions
    generateBackupCodesForUser,
    useBackupCode,
    regenerateBackupCodes,
    getBackupCodesCount,
    getMFAStatus,
    disableMFA,
    getRemainingBackupCodesCount
};
