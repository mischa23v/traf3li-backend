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
const logger = require('../utils/logger');
const emailService = require('./email.service');

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
    logger.error('Error generating TOTP secret', {
      error: error.message,
      email: userEmail ? '***' : undefined // Sanitize email in logs
    });
    const err = new Error('Failed to generate MFA secret');
    err.code = 'MFA_SECRET_GENERATION_FAILED';
    throw err;
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
    logger.error('Error generating QR code', {
      error: error.message,
      email: email ? '***' : undefined // Sanitize email in logs
    });
    const err = new Error('Failed to generate QR code');
    err.code = 'QR_CODE_GENERATION_FAILED';
    throw err;
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
      logger.debug('TOTP verification failed: missing secret or token');
      return false;
    }

    // Remove spaces and ensure 6-digit format
    const cleanToken = token.toString().replace(/\s/g, '');

    if (!/^\d{6}$/.test(cleanToken)) {
      logger.debug('TOTP verification failed: invalid token format', {
        tokenLength: cleanToken.length
      });
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

    if (!verified) {
      logger.debug('TOTP verification failed: token mismatch');
    }

    return verified;
  } catch (error) {
    logger.error('Error verifying TOTP token', {
      error: error.message,
      tokenProvided: !!token
    });
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
    logger.error('Error encrypting MFA secret', {
      error: error.message
    });
    const err = new Error('Failed to encrypt MFA secret');
    err.code = 'MFA_ENCRYPTION_FAILED';
    throw err;
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
    logger.error('Error decrypting MFA secret', {
      error: error.message,
      hasEncryptedSecret: !!encryptedSecret
    });
    const err = new Error('Failed to decrypt MFA secret');
    err.code = 'MFA_DECRYPTION_FAILED';
    throw err;
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
    logger.error('Error validating MFA setup', { error: error.message });
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
        // NOTE: Bypass firmIsolation filter - MFA operations need to work for solo lawyers without firmId
        const user = await User.findById(userId).setOptions({ bypassFirmFilter: true });
        if (!user) {
            const err = new Error('User not found');
            err.code = 'USER_NOT_FOUND';
            throw err;
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
        logger.error('Generate backup codes error', {
            error: error.message,
            userId,
            count
        });
        // Re-throw with code if not already set
        if (!error.code) {
            error.code = 'BACKUP_CODE_GENERATION_FAILED';
        }
        throw error;
    }
};

/**
 * Use a backup code for MFA verification
 *
 * SECURITY: Uses atomic findOneAndUpdate to prevent TOCTOU race conditions.
 * Two concurrent requests with the same backup code cannot both succeed.
 *
 * @param {string} userId - User ID
 * @param {string} code - Backup code to verify
 * @param {Object} context - Optional context with IP, user agent, location
 * @returns {Promise<Object>} - {valid: boolean, remainingCodes: number}
 *
 * @throws {Error} - If user not found or verification fails
 *
 * @example
 * const result = await useBackupCode('60d5ec49f1b2c8b1f8c8e4e1', 'ABCD-1234', { ipAddress, userAgent });
 * if (result.valid) {
 *   console.log('Backup code verified. Remaining codes:', result.remainingCodes);
 * }
 */
const useBackupCode = async (userId, code, context = {}) => {
    const mongoose = require('mongoose');
    const session = await mongoose.startSession();

    try {
        session.startTransaction();

        // Find the user with session for transaction
        // NOTE: Bypass firmIsolation filter - MFA operations need to work for solo lawyers without firmId
        const user = await User.findById(userId)
            .setOptions({ bypassFirmFilter: true })
            .session(session);

        if (!user) {
            await session.abortTransaction();
            session.endSession();
            const err = new Error('User not found');
            err.code = 'USER_NOT_FOUND';
            throw err;
        }

        // Check if user has any backup codes
        if (!user.mfaBackupCodes || user.mfaBackupCodes.length === 0) {
            await session.abortTransaction();
            session.endSession();

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

        // Verify the code against UNUSED codes only
        // SECURITY: Filter to only check unused codes to prevent race conditions
        const unusedCodes = user.mfaBackupCodes
            .map((bc, index) => ({ ...bc.toObject(), index }))
            .filter(bc => !bc.used);

        const verificationResult = await verifyBackupCode(code, unusedCodes);

        if (!verificationResult.valid) {
            await session.abortTransaction();
            session.endSession();

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

        // Get the original index from the mapped unused codes
        const originalIndex = unusedCodes[verificationResult.codeIndex].index;

        // SECURITY: Atomic update - mark the specific code as used
        // Use findOneAndUpdate with array filter to atomically mark the code
        const updateResult = await User.findOneAndUpdate(
            {
                _id: userId,
                [`mfaBackupCodes.${originalIndex}.used`]: false // Only update if still unused
            },
            {
                $set: {
                    [`mfaBackupCodes.${originalIndex}.used`]: true,
                    [`mfaBackupCodes.${originalIndex}.usedAt`]: new Date(),
                    mfaVerifiedAt: new Date()
                }
            },
            {
                new: true,
                session,
                // IMPORTANT: bypassFirmFilter for MFA operations
                bypassFirmFilter: true
            }
        ).setOptions({ bypassFirmFilter: true });

        // If update failed (code was used by concurrent request), reject
        if (!updateResult) {
            await session.abortTransaction();
            session.endSession();

            logger.warn('Backup code race condition detected - code already used', {
                userId,
                codeIndex: originalIndex
            });

            await auditLogService.log(
                'mfa_backup_code_failed',
                'user',
                userId,
                null,
                {
                    userId,
                    userEmail: user.email,
                    userRole: user.role,
                    reason: 'Backup code already used (concurrent request)',
                    severity: 'high'
                }
            );

            return {
                valid: false,
                remainingCodes: getRemainingBackupCodesCount(user.mfaBackupCodes),
                error: 'Backup code already used'
            };
        }

        await session.commitTransaction();
        session.endSession();

        // Get remaining codes count from updated user
        const remainingCodes = getRemainingBackupCodesCount(updateResult.mfaBackupCodes);

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

        // Send email notification (fire-and-forget, non-blocking)
        (async () => {
            try {
                // Get last 4 characters of the backup code for security
                const backupCodeLastDigits = code.replace('-', '').slice(-4);

                const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;

                // Prepare usage info for email
                const usageInfo = {
                    backupCodeLastDigits,
                    remainingCodes,
                    ipAddress: context.ipAddress || null,
                    deviceInfo: context.userAgent || null,
                    location: context.location || null,
                    usedAt: new Date()
                };

                // Send notification email
                await emailService.sendMFABackupCodeUsed(
                    { email: user.email, name: userName },
                    usageInfo,
                    'ar' // Default to Arabic, can be made configurable
                );

                logger.info('MFA backup code usage notification sent', {
                    userId,
                    email: user.email,
                    remainingCodes
                });
            } catch (emailError) {
                // Log error but don't fail the login process
                logger.error('Failed to send MFA backup code notification email', {
                    error: emailError.message,
                    userId,
                    email: user.email
                });
            }
        })();

        return {
            valid: true,
            remainingCodes,
            user: updateResult
        };
    } catch (error) {
        // Ensure session is cleaned up on error
        try {
            if (session.inTransaction()) {
                await session.abortTransaction();
            }
            session.endSession();
        } catch {
            // Session cleanup failed, but we still want to throw the original error
        }

        logger.error('Use backup code error', {
            error: error.message,
            userId
        });
        // Re-throw with code if not already set
        if (!error.code) {
            error.code = 'BACKUP_CODE_USE_FAILED';
        }
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
        // NOTE: Bypass firmIsolation filter - MFA operations need to work for solo lawyers without firmId
        const user = await User.findById(userId).setOptions({ bypassFirmFilter: true });
        if (!user) {
            const err = new Error('User not found');
            err.code = 'USER_NOT_FOUND';
            throw err;
        }

        // Check if MFA is enabled
        if (!user.mfaEnabled) {
            const err = new Error('MFA must be enabled to regenerate backup codes');
            err.code = 'MFA_NOT_ENABLED';
            throw err;
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
        logger.error('Regenerate backup codes error', {
            error: error.message,
            userId,
            count
        });
        // Re-throw with code if not already set
        if (!error.code) {
            error.code = 'BACKUP_CODE_REGENERATION_FAILED';
        }
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
        // NOTE: Bypass firmIsolation filter - MFA operations need to work for solo lawyers without firmId
        const user = await User.findById(userId)
            .select('mfaBackupCodes')
            .setOptions({ bypassFirmFilter: true });
        if (!user) {
            const err = new Error('User not found');
            err.code = 'USER_NOT_FOUND';
            throw err;
        }

        return getRemainingBackupCodesCount(user.mfaBackupCodes);
    } catch (error) {
        logger.error('Get backup codes count error', {
            error: error.message,
            userId
        });
        // Re-throw with code if not already set
        if (!error.code) {
            error.code = 'BACKUP_CODE_COUNT_FAILED';
        }
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
        // NOTE: Bypass firmIsolation filter - MFA operations need to work for solo lawyers without firmId
        const user = await User.findById(userId)
            .select('mfaEnabled mfaSecret mfaBackupCodes')
            .setOptions({ bypassFirmFilter: true });
        if (!user) {
            const err = new Error('User not found');
            err.code = 'USER_NOT_FOUND';
            throw err;
        }

        const remainingCodes = getRemainingBackupCodesCount(user.mfaBackupCodes);

        return {
            mfaEnabled: user.mfaEnabled || false,
            hasTOTP: !!user.mfaSecret,
            hasBackupCodes: remainingCodes > 0,
            remainingCodes
        };
    } catch (error) {
        logger.error('Get MFA status error', {
            error: error.message,
            userId
        });
        // Re-throw with code if not already set
        if (!error.code) {
            error.code = 'MFA_STATUS_FAILED';
        }
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
        // NOTE: Bypass firmIsolation filter - MFA operations need to work for solo lawyers without firmId
        const user = await User.findById(userId).setOptions({ bypassFirmFilter: true });
        if (!user) {
            const err = new Error('User not found');
            err.code = 'USER_NOT_FOUND';
            throw err;
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
        logger.error('Disable MFA error', {
            error: error.message,
            userId
        });
        // Re-throw with code if not already set
        if (!error.code) {
            error.code = 'MFA_DISABLE_FAILED';
        }
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
