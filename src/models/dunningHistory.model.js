const mongoose = require('mongoose');
const { Schema } = mongoose;

// ============ STAGE HISTORY SCHEMA ============
const StageHistorySchema = new Schema({
    stage: {
        type: Number,
        required: true,
        min: 0
    },
    enteredAt: {
        type: Date,
        required: true,
        default: Date.now
    },
    action: {
        type: String,
        required: true,
        enum: ['email', 'sms', 'call', 'collection_agency']
    },
    result: {
        type: String,
        required: true,
        enum: ['sent', 'failed', 'responded', 'skipped'],
        default: 'sent'
    },
    notes: {
        type: String,
        trim: true,
        maxlength: 1000
    },
    sentTo: {
        type: String,
        trim: true,
        comment: 'Email address or phone number where action was sent'
    },
    lateFeeApplied: {
        type: Number,
        default: 0,
        min: 0,
        comment: 'Late fee amount applied at this stage (in halalas)'
    },
    escalatedTo: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        comment: 'User this stage was escalated to'
    }
}, { _id: true });

// ============ MAIN DUNNING HISTORY SCHEMA ============
const dunningHistorySchema = new Schema({
    // ============ FIRM (Multi-Tenancy) ============
    firmId: {
        type: Schema.Types.ObjectId,
        ref: 'Firm',
        required: true,
        index: true
    },,


    // For solo lawyers (no firm) - enables row-level security
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    // ============ REFERENCES ============
    invoiceId: {
        type: Schema.Types.ObjectId,
        ref: 'Invoice',
        required: true,
        index: true
    },
    policyId: {
        type: Schema.Types.ObjectId,
        ref: 'DunningPolicy',
        required: true
    },

    // ============ CURRENT STATE ============
    currentStage: {
        type: Number,
        default: 0,
        min: 0,
        index: true,
        comment: 'Current dunning stage (0 = not started, 1+ = stage number)'
    },

    // ============ STAGE HISTORY ============
    stageHistory: {
        type: [StageHistorySchema],
        default: []
    },

    // ============ PAUSE STATE ============
    isPaused: {
        type: Boolean,
        default: false,
        index: true
    },
    pauseReason: {
        type: String,
        trim: true,
        maxlength: 500
    },
    pausedAt: {
        type: Date
    },
    pausedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },

    // ============ SCHEDULING ============
    nextActionDate: {
        type: Date,
        index: true,
        comment: 'When the next dunning action should be executed'
    },
    lastActionDate: {
        type: Date,
        comment: 'When the last dunning action was executed'
    },

    // ============ LATE FEES ============
    totalLateFees: {
        type: Number,
        default: 0,
        min: 0,
        comment: 'Total late fees accumulated across all stages (in halalas)'
    },

    // ============ STATUS ============
    status: {
        type: String,
        enum: ['active', 'completed', 'cancelled', 'collected'],
        default: 'active',
        index: true
    },
    completedAt: {
        type: Date
    },
    completedReason: {
        type: String,
        trim: true,
        maxlength: 500
    },

    // ============ METADATA ============
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    updatedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true,
    versionKey: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// ============ INDEXES ============
// Core query indexes
dunningHistorySchema.index({ invoiceId: 1 });
dunningHistorySchema.index({ policyId: 1 });
dunningHistorySchema.index({ firmId: 1, status: 1 });
dunningHistorySchema.index({ firmId: 1, isPaused: 1 });
dunningHistorySchema.index({ nextActionDate: 1, status: 1 });
dunningHistorySchema.index({ createdAt: -1 });

// Compound indexes for efficient overdue invoice queries
dunningHistorySchema.index({ firmId: 1, status: 1, nextActionDate: 1 });
dunningHistorySchema.index({ firmId: 1, status: 1, isPaused: 1, nextActionDate: 1 });
dunningHistorySchema.index({ firmId: 1, invoiceId: 1 });
dunningHistorySchema.index({ status: 1, isPaused: 1, nextActionDate: 1 });
dunningHistorySchema.index({ firmId: 1, currentStage: 1, status: 1 });

// ============ VIRTUALS ============
dunningHistorySchema.virtual('totalStagesExecuted').get(function() {
    return this.stageHistory ? this.stageHistory.length : 0;
});

dunningHistorySchema.virtual('lastStage').get(function() {
    if (!this.stageHistory || this.stageHistory.length === 0) return null;
    return this.stageHistory[this.stageHistory.length - 1];
});

dunningHistorySchema.virtual('daysSinceLastAction').get(function() {
    if (!this.lastActionDate) return null;
    const diff = new Date() - this.lastActionDate;
    return Math.floor(diff / (1000 * 60 * 60 * 24));
});

dunningHistorySchema.virtual('isOverdue').get(function() {
    if (!this.nextActionDate || this.isPaused || this.status !== 'active') {
        return false;
    }
    return new Date() >= this.nextActionDate;
});

// ============ STATICS ============

/**
 * Get or create dunning history for an invoice
 * @param {ObjectId} invoiceId - Invoice ID
 * @param {ObjectId} policyId - Dunning policy ID
 * @param {ObjectId} firmId - Firm ID
 * @param {ObjectId} userId - User creating the record
 * @returns {Promise<DunningHistory>} - Dunning history record
 */
dunningHistorySchema.statics.getOrCreate = async function(invoiceId, policyId, firmId, userId = null) {
    let history = await this.findOne({ invoiceId, status: 'active' });

    if (!history) {
        history = new this({
            invoiceId,
            policyId,
            firmId,
            currentStage: 0,
            status: 'active',
            createdBy: userId
        });
        await history.save();
    }

    return history;
};

/**
 * Get overdue invoices that need dunning actions
 * @param {ObjectId} firmId - Firm ID
 * @returns {Promise<Array>} - List of dunning histories ready for action
 */
dunningHistorySchema.statics.getOverdueActions = async function(firmId = null) {
    const query = {
        status: 'active',
        isPaused: false,
        nextActionDate: { $lte: new Date() }
    };

    if (firmId) {
        query.firmId = firmId;
    }

    return await this.find(query)
        .populate('invoiceId')
        .populate('policyId')
        .sort({ nextActionDate: 1 });
};

/**
 * Get dunning statistics for a firm
 * @param {ObjectId} firmId - Firm ID
 * @returns {Promise<Object>} - Statistics object
 */
dunningHistorySchema.statics.getStatistics = async function(firmId) {
    const result = await this.aggregate([
        { $match: { firmId: new mongoose.Types.ObjectId(firmId) } },
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 },
                totalLateFees: { $sum: '$totalLateFees' }
            }
        }
    ]);

    const stats = {
        active: 0,
        completed: 0,
        cancelled: 0,
        collected: 0,
        paused: 0,
        totalLateFees: 0
    };

    result.forEach(item => {
        stats[item._id] = item.count;
        stats.totalLateFees += item.totalLateFees;
    });

    // Get paused count separately
    const pausedCount = await this.countDocuments({ firmId, isPaused: true, status: 'active' });
    stats.paused = pausedCount;

    return stats;
};

/**
 * Get dunning history by stage distribution
 * @param {ObjectId} firmId - Firm ID
 * @returns {Promise<Array>} - Stage distribution
 */
dunningHistorySchema.statics.getStageDistribution = async function(firmId) {
    return await this.aggregate([
        { $match: { firmId: new mongoose.Types.ObjectId(firmId), status: 'active' } },
        {
            $group: {
                _id: '$currentStage',
                count: { $sum: 1 },
                totalLateFees: { $sum: '$totalLateFees' }
            }
        },
        { $sort: { _id: 1 } }
    ]);
};

// ============ METHODS ============

/**
 * Advance to the next dunning stage
 * @param {Object} stageData - Data for the stage history entry
 * @param {Number} stageData.stage - Stage number
 * @param {String} stageData.action - Action type (email, sms, call, collection_agency)
 * @param {String} stageData.result - Result (sent, failed, responded, skipped)
 * @param {String} stageData.notes - Optional notes
 * @param {String} stageData.sentTo - Email/phone where action was sent
 * @param {Number} stageData.lateFeeApplied - Late fee applied at this stage
 * @param {ObjectId} stageData.escalatedTo - User escalated to
 * @param {ObjectId} userId - User performing the action
 * @returns {Promise<DunningHistory>} - Updated dunning history
 */
dunningHistorySchema.methods.advanceStage = async function(stageData, userId = null) {
    const {
        stage,
        action,
        result = 'sent',
        notes = '',
        sentTo = '',
        lateFeeApplied = 0,
        escalatedTo = null
    } = stageData;

    // Add to stage history
    this.stageHistory.push({
        stage,
        enteredAt: new Date(),
        action,
        result,
        notes,
        sentTo,
        lateFeeApplied,
        escalatedTo
    });

    // Update current stage
    this.currentStage = stage;
    this.lastActionDate = new Date();

    // Accumulate late fees
    if (lateFeeApplied > 0) {
        this.totalLateFees += lateFeeApplied;
    }

    // Update metadata
    if (userId) {
        this.updatedBy = userId;
    }

    await this.save();
    return this;
};

/**
 * Pause dunning process
 * @param {String} reason - Reason for pausing
 * @param {ObjectId} userId - User pausing the process
 * @returns {Promise<DunningHistory>} - Updated dunning history
 */
dunningHistorySchema.methods.pause = async function(reason, userId = null) {
    if (this.isPaused) {
        throw new Error('Dunning process is already paused');
    }

    this.isPaused = true;
    this.pauseReason = reason;
    this.pausedAt = new Date();

    if (userId) {
        this.pausedBy = userId;
        this.updatedBy = userId;
    }

    await this.save();
    return this;
};

/**
 * Resume dunning process
 * @param {ObjectId} userId - User resuming the process
 * @returns {Promise<DunningHistory>} - Updated dunning history
 */
dunningHistorySchema.methods.resume = async function(userId = null) {
    if (!this.isPaused) {
        throw new Error('Dunning process is not paused');
    }

    this.isPaused = false;
    this.pauseReason = null;
    this.pausedAt = null;
    this.pausedBy = null;

    if (userId) {
        this.updatedBy = userId;
    }

    await this.save();
    return this;
};

/**
 * Mark dunning as completed
 * @param {String} reason - Reason for completion (e.g., 'paid', 'settled', 'written_off')
 * @param {ObjectId} userId - User completing the process
 * @returns {Promise<DunningHistory>} - Updated dunning history
 */
dunningHistorySchema.methods.complete = async function(reason, userId = null) {
    if (this.status !== 'active') {
        throw new Error(`Cannot complete dunning with status: ${this.status}`);
    }

    this.status = 'completed';
    this.completedAt = new Date();
    this.completedReason = reason;

    if (userId) {
        this.updatedBy = userId;
    }

    await this.save();
    return this;
};

/**
 * Mark dunning as collected
 * @param {String} reason - Reason for collection (e.g., 'payment_received')
 * @param {ObjectId} userId - User marking as collected
 * @returns {Promise<DunningHistory>} - Updated dunning history
 */
dunningHistorySchema.methods.markCollected = async function(reason, userId = null) {
    if (this.status !== 'active') {
        throw new Error(`Cannot mark as collected with status: ${this.status}`);
    }

    this.status = 'collected';
    this.completedAt = new Date();
    this.completedReason = reason;

    if (userId) {
        this.updatedBy = userId;
    }

    await this.save();
    return this;
};

/**
 * Cancel dunning process
 * @param {String} reason - Reason for cancellation
 * @param {ObjectId} userId - User cancelling the process
 * @returns {Promise<DunningHistory>} - Updated dunning history
 */
dunningHistorySchema.methods.cancel = async function(reason, userId = null) {
    if (this.status !== 'active') {
        throw new Error(`Cannot cancel dunning with status: ${this.status}`);
    }

    this.status = 'cancelled';
    this.completedAt = new Date();
    this.completedReason = reason;

    if (userId) {
        this.updatedBy = userId;
    }

    await this.save();
    return this;
};

/**
 * Set the next action date
 * @param {Date} date - Next action date
 * @returns {Promise<DunningHistory>} - Updated dunning history
 */
dunningHistorySchema.methods.setNextActionDate = async function(date) {
    this.nextActionDate = date;
    await this.save();
    return this;
};

/**
 * Get the stage history for a specific stage number
 * @param {Number} stageNumber - Stage number
 * @returns {Array} - Array of stage history entries for that stage
 */
dunningHistorySchema.methods.getStageEntries = function(stageNumber) {
    if (!this.stageHistory || this.stageHistory.length === 0) return [];
    return this.stageHistory.filter(entry => entry.stage === stageNumber);
};

/**
 * Check if a specific stage has been executed
 * @param {Number} stageNumber - Stage number
 * @returns {Boolean} - Whether the stage has been executed
 */
dunningHistorySchema.methods.hasExecutedStage = function(stageNumber) {
    if (!this.stageHistory || this.stageHistory.length === 0) return false;
    return this.stageHistory.some(entry => entry.stage === stageNumber);
};

module.exports = mongoose.model('DunningHistory', dunningHistorySchema);
