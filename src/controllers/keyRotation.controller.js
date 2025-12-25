/**
 * Key Rotation Controller
 *
 * Provides admin endpoints for managing JWT key rotation:
 * - View key rotation status
 * - Manually trigger key rotation
 * - View rotation history
 * - Configure rotation settings
 */

const keyRotationService = require('../services/keyRotation.service');
const logger = require('../utils/logger');

/**
 * Get current key rotation status
 * GET /api/admin/tools/key-rotation/status
 */
const getKeyRotationStatus = async (req, res) => {
    try {
        const status = keyRotationService.getStatus();

        return res.status(200).json({
            success: true,
            data: status,
            message: 'Key rotation status retrieved successfully'
        });
    } catch (error) {
        logger.error('Get key rotation status failed:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Failed to retrieve key rotation status',
            error: error.message
        });
    }
};

/**
 * Manually trigger key rotation
 * POST /api/admin/tools/key-rotation/rotate
 */
const rotateKeys = async (req, res) => {
    try {
        // Check if key rotation is enabled
        if (!keyRotationService.isEnabled()) {
            return res.status(400).json({
                success: false,
                message: 'Key rotation is not enabled. Set ENABLE_JWT_KEY_ROTATION=true in .env'
            });
        }

        logger.info('Manual key rotation triggered by admin', {
            adminId: req.userId,
            adminEmail: req.email
        });

        const result = await keyRotationService.rotateKeys();

        logger.info('Manual key rotation completed successfully', {
            adminId: req.userId,
            newKeyId: result.newKey.kid,
            oldKeyId: result.oldKey?.kid
        });

        return res.status(200).json({
            success: true,
            data: result,
            message: 'Key rotation completed successfully'
        });
    } catch (error) {
        logger.error('Manual key rotation failed:', error.message, {
            adminId: req.userId,
            error: error.stack
        });

        return res.status(500).json({
            success: false,
            message: 'Key rotation failed',
            error: error.message
        });
    }
};

/**
 * Generate a new key without rotating
 * POST /api/admin/tools/key-rotation/generate
 */
const generateNewKey = async (req, res) => {
    try {
        if (!keyRotationService.isEnabled()) {
            return res.status(400).json({
                success: false,
                message: 'Key rotation is not enabled'
            });
        }

        const newKey = keyRotationService.generateNewKey();

        logger.info('New signing key generated', {
            adminId: req.userId,
            keyId: newKey.kid,
            version: newKey.version
        });

        return res.status(200).json({
            success: true,
            data: {
                kid: newKey.kid,
                version: newKey.version,
                createdAt: newKey.createdAt,
                status: newKey.status
            },
            message: 'New signing key generated successfully'
        });
    } catch (error) {
        logger.error('Key generation failed:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Failed to generate new key',
            error: error.message
        });
    }
};

/**
 * Clean up expired keys
 * POST /api/admin/tools/key-rotation/cleanup
 */
const cleanupExpiredKeys = async (req, res) => {
    try {
        if (!keyRotationService.isEnabled()) {
            return res.status(400).json({
                success: false,
                message: 'Key rotation is not enabled'
            });
        }

        const removedCount = await keyRotationService.cleanupExpiredKeys();

        logger.info('Expired keys cleanup completed', {
            adminId: req.userId,
            removedCount
        });

        return res.status(200).json({
            success: true,
            data: {
                removedCount
            },
            message: `Cleaned up ${removedCount} expired key(s)`
        });
    } catch (error) {
        logger.error('Key cleanup failed:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Failed to cleanup expired keys',
            error: error.message
        });
    }
};

/**
 * Check if automatic rotation is needed
 * GET /api/admin/tools/key-rotation/check
 */
const checkRotationNeeded = async (req, res) => {
    try {
        if (!keyRotationService.isEnabled()) {
            return res.status(200).json({
                success: true,
                data: {
                    enabled: false,
                    rotationNeeded: false,
                    message: 'Key rotation is not enabled'
                }
            });
        }

        const needsRotation = keyRotationService.needsRotation();
        const status = keyRotationService.getStatus();

        return res.status(200).json({
            success: true,
            data: {
                enabled: true,
                rotationNeeded: needsRotation,
                currentKey: status.currentKey,
                rotationInterval: status.rotationInterval,
                message: needsRotation
                    ? 'Key rotation is recommended'
                    : 'Current key is still valid'
            }
        });
    } catch (error) {
        logger.error('Rotation check failed:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Failed to check rotation status',
            error: error.message
        });
    }
};

/**
 * Initialize key rotation service
 * POST /api/admin/tools/key-rotation/initialize
 */
const initializeKeyRotation = async (req, res) => {
    try {
        await keyRotationService.initialize();

        const status = keyRotationService.getStatus();

        logger.info('Key rotation service initialized', {
            adminId: req.userId,
            enabled: status.enabled,
            totalKeys: status.totalKeys
        });

        return res.status(200).json({
            success: true,
            data: status,
            message: 'Key rotation service initialized successfully'
        });
    } catch (error) {
        logger.error('Key rotation initialization failed:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Failed to initialize key rotation service',
            error: error.message
        });
    }
};

/**
 * Perform automatic rotation if needed
 * POST /api/admin/tools/key-rotation/auto-rotate
 */
const autoRotate = async (req, res) => {
    try {
        if (!keyRotationService.isEnabled()) {
            return res.status(400).json({
                success: false,
                message: 'Key rotation is not enabled'
            });
        }

        const result = await keyRotationService.autoRotate();

        logger.info('Automatic rotation check completed', {
            adminId: req.userId,
            rotated: result.rotated,
            reason: result.reason
        });

        return res.status(200).json({
            success: true,
            data: result,
            message: result.rotated
                ? 'Automatic rotation completed successfully'
                : 'No rotation needed at this time'
        });
    } catch (error) {
        logger.error('Automatic rotation failed:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Automatic rotation failed',
            error: error.message
        });
    }
};

module.exports = {
    getKeyRotationStatus,
    rotateKeys,
    generateNewKey,
    cleanupExpiredKeys,
    checkRotationNeeded,
    initializeKeyRotation,
    autoRotate
};
