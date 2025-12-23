const mongoose = require('mongoose');
const logger = require('../utils/logger');

const smtpConfigSchema = new mongoose.Schema({
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        required: true,
        unique: true,
        index: true
    },

    // SMTP Server
    host: {
        type: String,
        required: true,
        trim: true
    },
    port: {
        type: Number,
        default: 587
    },

    // Authentication
    username: {
        type: String,
        trim: true
    },
    passwordEncrypted: {
        type: String,
        select: false
    },

    // Security
    encryption: {
        type: String,
        enum: ['none', 'ssl', 'tls'],
        default: 'tls'
    },

    // From address
    fromEmail: {
        type: String,
        required: true,
        lowercase: true,
        trim: true
    },
    fromName: {
        type: String,
        trim: true
    },
    replyTo: {
        type: String,
        lowercase: true,
        trim: true
    },

    // Rate limiting
    maxEmailsPerHour: {
        type: Number,
        default: 100
    },

    // Verification
    isVerified: {
        type: Boolean,
        default: false
    },
    verifiedAt: Date,
    lastTestedAt: Date,
    lastTestResult: {
        type: String,
        trim: true
    },

    // Status
    isEnabled: {
        type: Boolean,
        default: false
    },

    // Audit
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true,
    versionKey: false
});

// Indexes
smtpConfigSchema.index({ firmId: 1, isEnabled: 1 });
smtpConfigSchema.index({ isVerified: 1 });

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Get SMTP configuration for a firm
 * @param {ObjectId} firmId - Firm ID
 * @returns {Promise<Object>} SMTP configuration
 */
smtpConfigSchema.statics.getConfig = async function(firmId) {
    if (!firmId) {
        throw new Error('Firm ID is required');
    }

    const config = await this.findOne({ firmId, isEnabled: true })
        .select('+passwordEncrypted'); // Include password for sending emails

    if (!config) {
        throw new Error('No SMTP configuration found for this firm');
    }

    if (!config.isVerified) {
        logger.warn(`SMTP config for firm ${firmId} is not verified`);
    }

    return config;
};

/**
 * Test SMTP connection
 * @param {Object} config - SMTP configuration object
 * @returns {Promise<Object>} Test result { success: boolean, message: string, error?: string }
 */
smtpConfigSchema.statics.testConnection = async function(config) {
    const nodemailer = require('nodemailer');

    try {
        // Build transporter config
        const transportConfig = {
            host: config.host,
            port: config.port,
            secure: config.encryption === 'ssl', // true for SSL (port 465), false for other ports
            auth: config.username ? {
                user: config.username,
                pass: config.passwordEncrypted // Should be decrypted before passing to this method
            } : undefined,
            tls: {
                rejectUnauthorized: config.encryption === 'tls'
            }
        };

        // Create transporter
        const transporter = nodemailer.createTransport(transportConfig);

        // Verify connection
        await transporter.verify();

        // Update test result if this is a saved config
        if (config._id) {
            await this.findByIdAndUpdate(config._id, {
                lastTestedAt: new Date(),
                lastTestResult: 'Connection successful',
                isVerified: true,
                verifiedAt: new Date()
            });
        }

        return {
            success: true,
            message: 'SMTP connection successful'
        };
    } catch (error) {
        // Update test result if this is a saved config
        if (config._id) {
            await this.findByIdAndUpdate(config._id, {
                lastTestedAt: new Date(),
                lastTestResult: error.message,
                isVerified: false
            });
        }

        return {
            success: false,
            message: 'SMTP connection failed',
            error: error.message
        };
    }
};

/**
 * Get or create default config for firm (for backward compatibility)
 * @param {ObjectId} firmId - Firm ID
 * @returns {Promise<Object>} SMTP configuration or null
 */
smtpConfigSchema.statics.getOrDefault = async function(firmId) {
    try {
        return await this.getConfig(firmId);
    } catch (error) {
        // Return null if no config found instead of throwing
        return null;
    }
};

// ═══════════════════════════════════════════════════════════════
// INSTANCE METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Test this configuration
 * @returns {Promise<Object>} Test result
 */
smtpConfigSchema.methods.test = async function() {
    return this.constructor.testConnection(this);
};

/**
 * Get safe config (without password) for API responses
 * @returns {Object} Safe config object
 */
smtpConfigSchema.methods.toSafeObject = function() {
    const obj = this.toObject();
    delete obj.passwordEncrypted;
    return obj;
};

module.exports = mongoose.model('SmtpConfig', smtpConfigSchema);
