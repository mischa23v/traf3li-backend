/**
 * Lock Date Model - Fiscal Period Management System
 *
 * Odoo-inspired lock date system for controlling when accounting entries can be edited.
 * Provides multiple lock types (fiscal, tax, purchase, sale) and hard locks for closed periods.
 * Maintains comprehensive audit trail for period locks and reopening.
 */

const mongoose = require('mongoose');

// Lock date entry schema for granular control
const lockDateEntrySchema = new mongoose.Schema({
    lock_type: {
        type: String,
        enum: ['all', 'sale', 'purchase', 'bank', 'expense', 'journal'],
        required: true
    },
    lock_date: {
        type: Date,
        required: true
    },
    locked_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    locked_at: {
        type: Date,
        default: Date.now
    },
    reason: {
        type: String,
        trim: true
    }
}, { _id: true });

// Period lock history schema for audit trail
const periodLockHistorySchema = new mongoose.Schema({
    period_name: {
        type: String,
        required: true,
        trim: true
    },
    start_date: {
        type: Date,
        required: true
    },
    end_date: {
        type: Date,
        required: true
    },
    locked_at: {
        type: Date,
        required: true
    },
    locked_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    reopened_at: {
        type: Date
    },
    reopened_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    reopen_reason: {
        type: String,
        trim: true
    }
}, { _id: true });

const lockDateSchema = new mongoose.Schema({
    // Multi-tenancy - one lock date configuration per firm
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        required: true,
        unique: true,
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // SIMPLE LOCK DATES (Odoo-style)
    // ═══════════════════════════════════════════════════════════════

    // No one can edit accounting entries before this date
    fiscalLockDate: {
        type: Date
    },

    // No one can edit tax-related entries before this date
    taxLockDate: {
        type: Date
    },

    // Lock date for purchase entries
    purchaseLockDate: {
        type: Date
    },

    // Lock date for sale entries
    saleLockDate: {
        type: Date
    },

    // Hard lock - even admins cannot edit before this date (for closed periods)
    hardLockDate: {
        type: Date
    },

    // ═══════════════════════════════════════════════════════════════
    // GRANULAR LOCK DATES (Advanced)
    // ═══════════════════════════════════════════════════════════════

    lockDates: [lockDateEntrySchema],

    // ═══════════════════════════════════════════════════════════════
    // FISCAL YEAR CONFIGURATION
    // ═══════════════════════════════════════════════════════════════

    fiscalYearEnd: {
        month: {
            type: Number,
            min: 1,
            max: 12
        },
        day: {
            type: Number,
            min: 1,
            max: 31
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // PERIOD LOCK HISTORY (Audit Trail)
    // ═══════════════════════════════════════════════════════════════

    periodLockHistory: [periodLockHistorySchema],

    // ═══════════════════════════════════════════════════════════════
    // AUDIT FIELDS
    // ═══════════════════════════════════════════════════════════════

    created_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    updated_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true,
    versionKey: false
});

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════

lockDateSchema.index({ firmId: 1 });
lockDateSchema.index({ 'lockDates.lock_type': 1, 'lockDates.lock_date': 1 });

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Get lock dates for a firm
 * Creates default configuration if none exists
 */
lockDateSchema.statics.getLockDates = async function(firmId) {
    let lockDates = await this.findOne({ firmId });

    if (!lockDates) {
        // Create default lock date configuration
        lockDates = new this({
            firmId,
            lockDates: [],
            periodLockHistory: []
        });
        await lockDates.save();
    }

    return lockDates;
};

/**
 * Update a specific lock date
 * @param {ObjectId} firmId - Firm ID
 * @param {String} lockType - Type of lock (fiscal, tax, purchase, sale, hard)
 * @param {Date} lockDate - New lock date
 * @param {ObjectId} userId - User making the change
 * @param {String} reason - Reason for lock date change
 */
lockDateSchema.statics.updateLockDate = async function(firmId, lockType, lockDate, userId, reason = null) {
    const validTypes = ['fiscal', 'tax', 'purchase', 'sale', 'hard'];

    if (!validTypes.includes(lockType)) {
        throw new Error(`Invalid lock type. Must be one of: ${validTypes.join(', ')}`);
    }

    const lockDates = await this.getLockDates(firmId);

    // Update the appropriate lock date field
    const fieldName = `${lockType}LockDate`;
    lockDates[fieldName] = lockDate;
    lockDates.updated_by = userId;

    // Add to granular lock dates for audit trail
    const lockTypeMapping = {
        fiscal: 'all',
        tax: 'all',
        purchase: 'purchase',
        sale: 'sale',
        hard: 'all'
    };

    lockDates.lockDates.push({
        lock_type: lockTypeMapping[lockType],
        lock_date: lockDate,
        locked_by: userId,
        locked_at: new Date(),
        reason
    });

    await lockDates.save();
    return lockDates;
};

/**
 * Check if a date is locked
 * @param {ObjectId} firmId - Firm ID
 * @param {Date} date - Date to check
 * @param {String} lockType - Type of entry (sale, purchase, bank, expense, journal, all)
 * @returns {Object} { isLocked: Boolean, lockDate: Date, lockType: String }
 */
lockDateSchema.statics.checkDateLocked = async function(firmId, date, lockType = 'all') {
    const lockDates = await this.getLockDates(firmId);
    const checkDate = new Date(date);

    // Check hard lock first (highest priority)
    if (lockDates.hardLockDate && checkDate < lockDates.hardLockDate) {
        return {
            isLocked: true,
            lockDate: lockDates.hardLockDate,
            lockType: 'hard',
            message: 'This date is hard-locked. Even administrators cannot edit entries before this date.'
        };
    }

    // Check fiscal lock date
    if (lockDates.fiscalLockDate && checkDate < lockDates.fiscalLockDate) {
        return {
            isLocked: true,
            lockDate: lockDates.fiscalLockDate,
            lockType: 'fiscal',
            message: 'This date is locked for all accounting entries.'
        };
    }

    // Check type-specific lock dates
    if (lockType === 'sale' && lockDates.saleLockDate && checkDate < lockDates.saleLockDate) {
        return {
            isLocked: true,
            lockDate: lockDates.saleLockDate,
            lockType: 'sale',
            message: 'This date is locked for sale entries.'
        };
    }

    if (lockType === 'purchase' && lockDates.purchaseLockDate && checkDate < lockDates.purchaseLockDate) {
        return {
            isLocked: true,
            lockDate: lockDates.purchaseLockDate,
            lockType: 'purchase',
            message: 'This date is locked for purchase entries.'
        };
    }

    if (lockDates.taxLockDate && checkDate < lockDates.taxLockDate) {
        return {
            isLocked: true,
            lockDate: lockDates.taxLockDate,
            lockType: 'tax',
            message: 'This date is locked for tax-related entries.'
        };
    }

    // Check granular lock dates
    for (const lock of lockDates.lockDates) {
        if ((lock.lock_type === lockType || lock.lock_type === 'all') && checkDate < lock.lock_date) {
            return {
                isLocked: true,
                lockDate: lock.lock_date,
                lockType: lock.lock_type,
                message: `This date is locked for ${lock.lock_type} entries.`,
                reason: lock.reason
            };
        }
    }

    return {
        isLocked: false,
        lockDate: null,
        lockType: null,
        message: 'This date is not locked.'
    };
};

/**
 * Lock a fiscal period
 * @param {ObjectId} firmId - Firm ID
 * @param {Date} startDate - Period start date
 * @param {Date} endDate - Period end date
 * @param {String} periodName - Name of the period (e.g., "Q1 2024")
 * @param {ObjectId} userId - User locking the period
 */
lockDateSchema.statics.lockPeriod = async function(firmId, startDate, endDate, periodName, userId) {
    const lockDates = await this.getLockDates(firmId);

    // Add to period lock history
    lockDates.periodLockHistory.push({
        period_name: periodName,
        start_date: startDate,
        end_date: endDate,
        locked_at: new Date(),
        locked_by: userId
    });

    // Update fiscal lock date to the end of this period
    if (!lockDates.fiscalLockDate || endDate > lockDates.fiscalLockDate) {
        lockDates.fiscalLockDate = endDate;
    }

    lockDates.updated_by = userId;
    await lockDates.save();

    return lockDates;
};

/**
 * Reopen a locked period (with audit trail)
 * @param {ObjectId} firmId - Firm ID
 * @param {String} periodName - Name of the period to reopen
 * @param {ObjectId} userId - User reopening the period
 * @param {String} reason - Reason for reopening
 */
lockDateSchema.statics.reopenPeriod = async function(firmId, periodName, userId, reason) {
    const lockDates = await this.getLockDates(firmId);

    // Find the period in history
    const periodIndex = lockDates.periodLockHistory.findIndex(
        p => p.period_name === periodName && !p.reopened_at
    );

    if (periodIndex === -1) {
        throw new Error(`Period "${periodName}" not found or already reopened.`);
    }

    // Mark period as reopened
    lockDates.periodLockHistory[periodIndex].reopened_at = new Date();
    lockDates.periodLockHistory[periodIndex].reopened_by = userId;
    lockDates.periodLockHistory[periodIndex].reopen_reason = reason;

    // Adjust fiscal lock date if necessary
    const reopenedPeriod = lockDates.periodLockHistory[periodIndex];
    if (lockDates.fiscalLockDate && lockDates.fiscalLockDate >= reopenedPeriod.end_date) {
        // Find the most recent locked period that hasn't been reopened
        const activeLocks = lockDates.periodLockHistory.filter(p => !p.reopened_at);
        if (activeLocks.length > 0) {
            const mostRecentLock = activeLocks.reduce((latest, current) =>
                current.end_date > latest.end_date ? current : latest
            );
            lockDates.fiscalLockDate = mostRecentLock.end_date;
        } else {
            lockDates.fiscalLockDate = null;
        }
    }

    lockDates.updated_by = userId;
    await lockDates.save();

    return lockDates;
};

// ═══════════════════════════════════════════════════════════════
// INSTANCE METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Check if a date is locked for this firm
 * @param {Date} date - Date to check
 * @param {String} lockType - Type of entry (sale, purchase, bank, expense, journal, all)
 * @returns {Boolean}
 */
lockDateSchema.methods.isDateLocked = function(date, lockType = 'all') {
    const checkDate = new Date(date);

    // Check hard lock first
    if (this.hardLockDate && checkDate < this.hardLockDate) {
        return true;
    }

    // Check fiscal lock
    if (this.fiscalLockDate && checkDate < this.fiscalLockDate) {
        return true;
    }

    // Check type-specific locks
    if (lockType === 'sale' && this.saleLockDate && checkDate < this.saleLockDate) {
        return true;
    }

    if (lockType === 'purchase' && this.purchaseLockDate && checkDate < this.purchaseLockDate) {
        return true;
    }

    if (this.taxLockDate && checkDate < this.taxLockDate) {
        return true;
    }

    // Check granular lock dates
    for (const lock of this.lockDates) {
        if ((lock.lock_type === lockType || lock.lock_type === 'all') && checkDate < lock.lock_date) {
            return true;
        }
    }

    return false;
};

/**
 * Get the applicable lock date for a given date and type
 * @param {Date} date - Date to check
 * @param {String} lockType - Type of entry
 * @returns {Date|null} The lock date that applies, or null if not locked
 */
lockDateSchema.methods.getApplicableLockDate = function(date, lockType = 'all') {
    const checkDate = new Date(date);
    let applicableLockDate = null;

    // Check hard lock first (highest priority)
    if (this.hardLockDate && checkDate < this.hardLockDate) {
        applicableLockDate = this.hardLockDate;
    }

    // Check fiscal lock
    if (this.fiscalLockDate && checkDate < this.fiscalLockDate) {
        if (!applicableLockDate || this.fiscalLockDate > applicableLockDate) {
            applicableLockDate = this.fiscalLockDate;
        }
    }

    // Check type-specific locks
    if (lockType === 'sale' && this.saleLockDate && checkDate < this.saleLockDate) {
        if (!applicableLockDate || this.saleLockDate > applicableLockDate) {
            applicableLockDate = this.saleLockDate;
        }
    }

    if (lockType === 'purchase' && this.purchaseLockDate && checkDate < this.purchaseLockDate) {
        if (!applicableLockDate || this.purchaseLockDate > applicableLockDate) {
            applicableLockDate = this.purchaseLockDate;
        }
    }

    if (this.taxLockDate && checkDate < this.taxLockDate) {
        if (!applicableLockDate || this.taxLockDate > applicableLockDate) {
            applicableLockDate = this.taxLockDate;
        }
    }

    // Check granular lock dates
    for (const lock of this.lockDates) {
        if ((lock.lock_type === lockType || lock.lock_type === 'all') && checkDate < lock.lock_date) {
            if (!applicableLockDate || lock.lock_date > applicableLockDate) {
                applicableLockDate = lock.lock_date;
            }
        }
    }

    return applicableLockDate;
};

module.exports = mongoose.model('LockDate', lockDateSchema);
