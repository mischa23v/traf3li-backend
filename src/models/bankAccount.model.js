const mongoose = require('mongoose');
const crypto = require('crypto');
const logger = require('../utils/logger');

// ============================================
// SECURITY: AES-256-GCM Encryption for Bank Tokens
// Encrypts accessToken and refreshToken at rest
// ============================================
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;

const getEncryptionKey = () => {
    const key = process.env.BANK_TOKEN_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY;
    if (!key || key.length !== 64) {
        throw new Error('BANK_TOKEN_ENCRYPTION_KEY or ENCRYPTION_KEY must be 64 hex characters');
    }
    return Buffer.from(key, 'hex');
};

const encryptToken = (token) => {
    if (!token) return null;
    // Skip if already encrypted (contains colons)
    if (token.includes(':') && token.split(':').length === 3) return token;
    try {
        const iv = crypto.randomBytes(IV_LENGTH);
        const key = getEncryptionKey();
        const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
        let encrypted = cipher.update(token, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        const authTag = cipher.getAuthTag().toString('hex');
        // Format: iv:authTag:encrypted (authenticated encryption)
        return `${iv.toString('hex')}:${authTag}:${encrypted}`;
    } catch (error) {
        logger.error('Bank token encryption failed:', error.message);
        throw new Error('Token encryption failed');
    }
};

const decryptToken = (encryptedToken) => {
    if (!encryptedToken) return null;
    // Check if it's encrypted (format: iv:authTag:encrypted)
    if (!encryptedToken.includes(':')) return encryptedToken; // Legacy unencrypted
    const parts = encryptedToken.split(':');
    if (parts.length !== 3) return encryptedToken; // Not our format
    try {
        const [ivHex, authTagHex, encrypted] = parts;
        const iv = Buffer.from(ivHex, 'hex');
        const authTag = Buffer.from(authTagHex, 'hex');
        const key = getEncryptionKey();
        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(authTag);
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (error) {
        logger.error('Bank token decryption failed:', error.message);
        throw new Error('Token decryption failed - data may be corrupted');
    }
};

const bankConnectionSchema = new mongoose.Schema({
    provider: {
        type: String,
        enum: [
            // International Providers
            'plaid', 'yodlee', 'saltedge',
            // Regional Saudi/GCC Providers
            'lean',              // Lean Technologies - Saudi Arabia
            'tarabut',           // Tarabut Gateway - MENA
            'fintech_galaxy',    // Fintech Galaxy - GCC
            'sama_open_banking', // SAMA Open Banking
            // Direct Bank APIs
            'alrajhi_direct', 'snb_direct', 'riyad_direct',
            'sabb_direct', 'alinma_direct', 'fab_direct', 'enbd_direct'
        ]
    },
    institutionId: String,
    institutionName: String,
    institutionNameAr: String,
    countryCode: {
        type: String,
        maxlength: 2
    },
    bicCode: String,
    status: {
        type: String,
        enum: ['connected', 'disconnected', 'error', 'expired', 'pending', 'requires_reauth'],
        default: 'disconnected'
    },
    lastSyncedAt: Date,
    expiresAt: Date,
    error: String,
    errorCode: String,
    accessToken: String,
    refreshToken: String,
    entityId: String,       // Provider-specific entity/link ID
    consentId: String,      // Open banking consent ID
    permissions: [String],  // Granted permissions (accounts, transactions, etc.)
    metadata: mongoose.Schema.Types.Mixed // Provider-specific data
}, { _id: true });

const bankAccountSchema = new mongoose.Schema({
    accountNumber: {
        type: String,
        trim: true,
        index: true
    },
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        index: true,
        required: false
    },
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },
    nameAr: {
        type: String,
        trim: true,
        maxlength: 200
    },
    type: {
        type: String,
        enum: ['checking', 'savings', 'credit_card', 'cash', 'investment', 'loan', 'other'],
        required: true,
        default: 'checking'
    },
    bankName: {
        type: String,
        trim: true,
        maxlength: 200
    },
    bankCode: {
        type: String,
        trim: true
    },
    currency: {
        type: String,
        default: 'SAR'
    },
    balance: {
        type: Number,
        default: 0
    },
    availableBalance: {
        type: Number,
        default: 0
    },
    openingBalance: {
        type: Number,
        default: 0
    },
    isDefault: {
        type: Boolean,
        default: false,
        index: true
    },
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },
    iban: {
        type: String,
        trim: true,
        maxlength: 34
    },
    swiftCode: {
        type: String,
        trim: true,
        maxlength: 11
    },
    routingNumber: {
        type: String,
        trim: true
    },
    branchName: {
        type: String,
        trim: true,
        maxlength: 200
    },
    branchCode: {
        type: String,
        trim: true
    },
    accountHolder: {
        type: String,
        trim: true,
        maxlength: 300
    },
    accountHolderAddress: {
        type: String,
        trim: true,
        maxlength: 500
    },
    minBalance: {
        type: Number,
        default: 0
    },
    overdraftLimit: {
        type: Number,
        default: 0
    },
    interestRate: {
        type: Number,
        default: 0
    },
    description: {
        type: String,
        trim: true,
        maxlength: 1000
    },
    notes: {
        type: String,
        trim: true,
        maxlength: 2000
    },
    color: {
        type: String,
        default: '#0f766e'
    },
    icon: {
        type: String,
        default: 'bank'
    },
    connection: bankConnectionSchema,
    lastSyncedAt: Date,
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    }
}, {
    versionKey: false,
    timestamps: true
});

// Indexes for performance
bankAccountSchema.index({ lawyerId: 1, type: 1 });
bankAccountSchema.index({ lawyerId: 1, isActive: 1 });
bankAccountSchema.index({ lawyerId: 1, currency: 1 });
bankAccountSchema.index({ firmId: 1, isActive: 1 });
bankAccountSchema.index({ name: 'text', accountNumber: 'text', bankName: 'text' });

// Pre-save hook to ensure only one default account per user
bankAccountSchema.pre('save', async function(next) {
    if (this.isDefault && this.isModified('isDefault')) {
        await this.constructor.updateMany(
            { lawyerId: this.lawyerId, _id: { $ne: this._id } },
            { isDefault: false }
        );
    }

    // Set balance from opening balance for new accounts
    if (this.isNew && this.openingBalance) {
        this.balance = this.openingBalance;
        this.availableBalance = this.openingBalance;
    }

    // SECURITY: Encrypt bank connection tokens before saving
    if (this.connection) {
        if (this.connection.accessToken && this.isModified('connection.accessToken')) {
            this.connection.accessToken = encryptToken(this.connection.accessToken);
        }
        if (this.connection.refreshToken && this.isModified('connection.refreshToken')) {
            this.connection.refreshToken = encryptToken(this.connection.refreshToken);
        }
    }

    next();
});

// Instance method: Get decrypted connection credentials
bankAccountSchema.methods.getDecryptedConnection = function() {
    if (!this.connection) return null;
    return {
        ...this.connection.toObject(),
        accessToken: decryptToken(this.connection.accessToken),
        refreshToken: decryptToken(this.connection.refreshToken)
    };
};

// Static method: Get account summary
// SECURITY FIX: Accept firmQuery for proper tenant isolation
bankAccountSchema.statics.getSummary = async function(firmQuery) {
    // Build match query from firmQuery
    const matchQuery = { isActive: true };
    if (firmQuery.firmId) {
        matchQuery.firmId = new mongoose.Types.ObjectId(firmQuery.firmId);
    } else if (firmQuery.lawyerId) {
        matchQuery.lawyerId = new mongoose.Types.ObjectId(firmQuery.lawyerId);
    }

    const summary = await this.aggregate([
        { $match: matchQuery },
        {
            $facet: {
                totals: [
                    {
                        $group: {
                            _id: null,
                            totalBalance: { $sum: '$balance' },
                            totalAccounts: { $sum: 1 }
                        }
                    }
                ],
                byType: [
                    {
                        $group: {
                            _id: '$type',
                            count: { $sum: 1 },
                            balance: { $sum: '$balance' }
                        }
                    },
                    {
                        $project: {
                            type: '$_id',
                            count: 1,
                            balance: 1,
                            _id: 0
                        }
                    }
                ],
                byCurrency: [
                    {
                        $group: {
                            _id: '$currency',
                            balance: { $sum: '$balance' }
                        }
                    },
                    {
                        $project: {
                            currency: '$_id',
                            balance: 1,
                            _id: 0
                        }
                    }
                ]
            }
        }
    ]);

    const result = summary[0];
    return {
        totalBalance: result.totals[0]?.totalBalance || 0,
        totalAccounts: result.totals[0]?.totalAccounts || 0,
        byType: result.byType,
        byCurrency: result.byCurrency
    };
};

// Static method: Update balance
bankAccountSchema.statics.updateBalance = async function(accountId, amount, type = 'add') {
    const update = type === 'add'
        ? { $inc: { balance: amount, availableBalance: amount } }
        : { $inc: { balance: -amount, availableBalance: -amount } };

    return await this.findByIdAndUpdate(accountId, update, { new: true });
};

// Static method: Get balance history (placeholder for aggregated transaction data)
bankAccountSchema.statics.getBalanceHistory = async function(accountId, period = 'month') {
    const BankTransaction = mongoose.model('BankTransaction');

    const periodDays = {
        week: 7,
        month: 30,
        quarter: 90,
        year: 365
    };

    const days = periodDays[period] || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const transactions = await BankTransaction.aggregate([
        {
            $match: {
                accountId: new mongoose.Types.ObjectId(accountId),
                date: { $gte: startDate }
            }
        },
        {
            $sort: { date: 1 }
        },
        {
            $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
                lastBalance: { $last: '$balance' }
            }
        },
        {
            $project: {
                date: '$_id',
                balance: '$lastBalance',
                _id: 0
            }
        },
        { $sort: { date: 1 } }
    ]);

    return transactions;
};

module.exports = mongoose.model('BankAccount', bankAccountSchema);
