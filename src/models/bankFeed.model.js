const mongoose = require('mongoose');
const crypto = require('crypto');
const logger = require('../utils/logger');

const columnMappingSchema = new mongoose.Schema({
    date: { type: String, trim: true },
    description: { type: String, trim: true },
    amount: { type: String, trim: true },
    reference: { type: String, trim: true },
    type: { type: String, trim: true },
    balance: { type: String, trim: true }
}, { _id: false });

const importSettingsSchema = new mongoose.Schema({
    fileFormat: {
        type: String,
        enum: ['csv', 'ofx', 'qif', 'mt940'],
        default: 'csv'
    },
    dateFormat: {
        type: String,
        default: 'YYYY-MM-DD'
    },
    delimiter: {
        type: String,
        default: ','
    },
    columnMapping: {
        type: columnMappingSchema,
        default: () => ({
            date: 'Date',
            description: 'Description',
            amount: 'Amount',
            reference: 'Reference',
            type: 'Type',
            balance: 'Balance'
        })
    },
    skipRows: {
        type: Number,
        default: 0,
        min: 0
    },
    debitColumn: {
        type: String,
        trim: true
    },
    creditColumn: {
        type: String,
        trim: true
    },
    hasHeader: {
        type: Boolean,
        default: true
    },
    encoding: {
        type: String,
        default: 'utf-8'
    }
}, { _id: false });

const credentialsSchema = new mongoose.Schema({
    accessToken: { type: String },
    refreshToken: { type: String },
    expiresAt: { type: Date },
    itemId: { type: String },
    metadata: { type: mongoose.Schema.Types.Mixed }
}, { _id: false });

const bankFeedSchema = new mongoose.Schema({
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        required: true,
        index: true
    },
    bankAccountId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'BankAccount',
        required: true,
        index: true
    },
    provider: {
        type: String,
        enum: ['manual', 'csv_import', 'ofx_import', 'plaid', 'open_banking', 'api'],
        required: true,
        default: 'manual'
    },
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },
    description: {
        type: String,
        trim: true,
        maxlength: 1000
    },
    importSettings: {
        type: importSettingsSchema,
        default: () => ({})
    },
    lastImportAt: {
        type: Date,
        index: true
    },
    lastImportCount: {
        type: Number,
        default: 0
    },
    totalImported: {
        type: Number,
        default: 0
    },
    lastImportBatchId: {
        type: String
    },
    credentials: credentialsSchema,
    status: {
        type: String,
        enum: ['active', 'error', 'disconnected', 'pending'],
        default: 'active',
        index: true
    },
    errorMessage: {
        type: String,
        trim: true
    },
    errorCount: {
        type: Number,
        default: 0
    },
    lastErrorAt: {
        type: Date
    },
    autoImport: {
        type: Boolean,
        default: false
    },
    importFrequency: {
        type: String,
        enum: ['manual', 'daily', 'weekly', 'monthly'],
        default: 'manual'
    },
    nextImportAt: {
        type: Date
    },
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    isActive: {
        type: Boolean,
        default: true,
        index: true
    }
}, {
    versionKey: false,
    timestamps: true
});

// Indexes
bankFeedSchema.index({ firmId: 1, bankAccountId: 1 });
bankFeedSchema.index({ lawyerId: 1, status: 1 });
bankFeedSchema.index({ status: 1, nextImportAt: 1 });

// Encryption key for credentials (in production, use env variable)
const ENCRYPTION_KEY = process.env.FEED_ENCRYPTION_KEY || 'traf3li-bank-feed-encryption-key-32b';
const ALGORITHM = 'aes-256-cbc';

// Encrypt credentials before saving
bankFeedSchema.pre('save', function(next) {
    if (this.credentials && this.credentials.accessToken && !this.credentials.accessToken.includes(':')) {
        try {
            const iv = crypto.randomBytes(16);
            const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY.slice(0, 32)), iv);
            let encrypted = cipher.update(this.credentials.accessToken, 'utf8', 'hex');
            encrypted += cipher.final('hex');
            this.credentials.accessToken = iv.toString('hex') + ':' + encrypted;
        } catch (error) {
            logger.error('Error encrypting access token:', error);
        }
    }

    if (this.credentials && this.credentials.refreshToken && !this.credentials.refreshToken.includes(':')) {
        try {
            const iv = crypto.randomBytes(16);
            const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY.slice(0, 32)), iv);
            let encrypted = cipher.update(this.credentials.refreshToken, 'utf8', 'hex');
            encrypted += cipher.final('hex');
            this.credentials.refreshToken = iv.toString('hex') + ':' + encrypted;
        } catch (error) {
            logger.error('Error encrypting refresh token:', error);
        }
    }

    next();
});

// Instance method: Decrypt credentials
bankFeedSchema.methods.decryptCredentials = function() {
    const decrypted = { ...this.credentials.toObject() };

    if (decrypted.accessToken && decrypted.accessToken.includes(':')) {
        try {
            const parts = decrypted.accessToken.split(':');
            const iv = Buffer.from(parts[0], 'hex');
            const encryptedText = parts[1];
            const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY.slice(0, 32)), iv);
            let decryptedToken = decipher.update(encryptedText, 'hex', 'utf8');
            decryptedToken += decipher.final('utf8');
            decrypted.accessToken = decryptedToken;
        } catch (error) {
            logger.error('Error decrypting access token:', error);
        }
    }

    if (decrypted.refreshToken && decrypted.refreshToken.includes(':')) {
        try {
            const parts = decrypted.refreshToken.split(':');
            const iv = Buffer.from(parts[0], 'hex');
            const encryptedText = parts[1];
            const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY.slice(0, 32)), iv);
            let decryptedToken = decipher.update(encryptedText, 'hex', 'utf8');
            decryptedToken += decipher.final('utf8');
            decrypted.refreshToken = decryptedToken;
        } catch (error) {
            logger.error('Error decrypting refresh token:', error);
        }
    }

    return decrypted;
};

// Instance method: Record import
bankFeedSchema.methods.recordImport = function(count, batchId) {
    this.lastImportAt = new Date();
    this.lastImportCount = count;
    this.totalImported += count;
    this.lastImportBatchId = batchId;

    if (this.importFrequency !== 'manual') {
        this.nextImportAt = this.calculateNextImport();
    }

    // Clear error on successful import
    if (count > 0) {
        this.status = 'active';
        this.errorMessage = null;
        this.errorCount = 0;
        this.lastErrorAt = null;
    }
};

// Instance method: Record error
bankFeedSchema.methods.recordError = function(errorMessage) {
    this.status = 'error';
    this.errorMessage = errorMessage;
    this.errorCount += 1;
    this.lastErrorAt = new Date();

    // Disable auto-import after 3 consecutive errors
    if (this.errorCount >= 3) {
        this.autoImport = false;
    }
};

// Instance method: Calculate next import time
bankFeedSchema.methods.calculateNextImport = function() {
    const now = new Date();
    switch (this.importFrequency) {
        case 'daily':
            return new Date(now.getTime() + 24 * 60 * 60 * 1000);
        case 'weekly':
            return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        case 'monthly':
            const nextMonth = new Date(now);
            nextMonth.setMonth(nextMonth.getMonth() + 1);
            return nextMonth;
        default:
            return null;
    }
};

// Static method: Get feeds due for import
bankFeedSchema.statics.getFeedsDueForImport = async function() {
    return await this.find({
        autoImport: true,
        status: 'active',
        nextImportAt: { $lte: new Date() }
    });
};

// Static method: Get feed statistics
bankFeedSchema.statics.getStatistics = async function(lawyerId, firmId) {
    const match = { lawyerId };
    if (firmId) match.firmId = firmId;

    return await this.aggregate([
        { $match: match },
        {
            $group: {
                _id: null,
                totalFeeds: { $sum: 1 },
                activeFeeds: {
                    $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
                },
                errorFeeds: {
                    $sum: { $cond: [{ $eq: ['$status', 'error'] }, 1, 0] }
                },
                totalImported: { $sum: '$totalImported' },
                avgImportCount: { $avg: '$lastImportCount' }
            }
        }
    ]);
};

module.exports = mongoose.model('BankFeed', bankFeedSchema);
