const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * Quality Action Model
 *
 * Tracks corrective and preventive actions (CAPA)
 * resulting from quality inspections. Includes
 * problem identification, root cause analysis,
 * and action tracking with verification.
 */

const qualityActionSchema = new Schema({
    // ============ IDENTIFIERS ============
    actionId: {
        type: String,
        unique: true,
        sparse: true,
        index: true
    },

    // ============ ACTION TYPE ============
    actionType: {
        type: String,
        enum: ['corrective', 'preventive'],
        required: true,
        index: true
    },

    // ============ REFERENCE ============
    inspectionId: {
        type: Schema.Types.ObjectId,
        ref: 'QualityInspection',
        index: true
    },
    itemId: {
        type: Schema.Types.ObjectId,
        ref: 'Item',
        index: true
    },

    // ============ PROBLEM & ANALYSIS ============
    problem: {
        type: String,
        required: true
    },
    rootCause: String,

    // ============ ACTION ============
    action: {
        type: String,
        required: true
    },

    // ============ RESPONSIBILITY ============
    responsiblePerson: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    responsibleName: String,

    // ============ DATES ============
    targetDate: {
        type: Date,
        required: true,
        index: true
    },
    completionDate: Date,

    // ============ STATUS ============
    status: {
        type: String,
        enum: ['open', 'in_progress', 'completed', 'cancelled'],
        default: 'open',
        index: true
    },

    // ============ VERIFICATION ============
    verification: String,
    verifiedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    verifiedDate: Date,

    // ============ REMARKS ============
    remarks: String,

    // ============ MULTI-TENANCY ============
    firmId: {
        type: Schema.Types.ObjectId,
        ref: 'Firm',
        required: false,
        index: true
    },

    // ============ AUDIT ============
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
qualityActionSchema.index({ firmId: 1, status: 1, targetDate: 1 });
qualityActionSchema.index({ firmId: 1, actionType: 1 });
qualityActionSchema.index({ firmId: 1, responsiblePerson: 1 });
qualityActionSchema.index({ inspectionId: 1 });

// ============ VIRTUALS ============
qualityActionSchema.virtual('isOverdue').get(function() {
    if (this.status === 'completed' || this.status === 'cancelled') {
        return false;
    }
    return new Date() > this.targetDate;
});

qualityActionSchema.virtual('daysOverdue').get(function() {
    if (!this.isOverdue) return 0;
    const diff = new Date() - this.targetDate;
    return Math.floor(diff / (1000 * 60 * 60 * 24));
});

qualityActionSchema.virtual('daysToTarget').get(function() {
    if (this.status === 'completed' || this.status === 'cancelled') {
        return 0;
    }
    const diff = this.targetDate - new Date();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

qualityActionSchema.virtual('isVerified').get(function() {
    return !!(this.verifiedBy && this.verifiedDate);
});

// ============ PRE-SAVE MIDDLEWARE ============
qualityActionSchema.pre('save', async function(next) {
    // Auto-generate action ID if not provided
    if (this.isNew && !this.actionId) {
        const Counter = require('./counter.model');
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const dateStr = `${year}${month}${day}`;

        // Create counter ID: quality_action_{firmId}_{date}
        const counterId = this.firmId
            ? `quality_action_${this.firmId}_${dateStr}`
            : `quality_action_global_${dateStr}`;

        const seq = await Counter.getNextSequence(counterId);
        this.actionId = `QA-${dateStr}-${String(seq).padStart(4, '0')}`;
    }

    // Auto-set completion date when status changes to completed
    if (this.isModified('status') && this.status === 'completed' && !this.completionDate) {
        this.completionDate = new Date();
    }

    next();
});

// ============ STATIC METHODS ============
qualityActionSchema.statics.getActionStats = async function(firmId, filters = {}) {
    const query = { ...filters };

    if (firmId) {
        query.firmId = firmId;
    }

    const [stats] = await this.aggregate([
        { $match: query },
        {
            $group: {
                _id: null,
                totalActions: { $sum: 1 },
                open: { $sum: { $cond: [{ $eq: ['$status', 'open'] }, 1, 0] } },
                inProgress: { $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] } },
                completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
                cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
                corrective: { $sum: { $cond: [{ $eq: ['$actionType', 'corrective'] }, 1, 0] } },
                preventive: { $sum: { $cond: [{ $eq: ['$actionType', 'preventive'] }, 1, 0] } }
            }
        }
    ]);

    // Count overdue actions
    const today = new Date();
    const overdueCount = await this.countDocuments({
        ...query,
        status: { $in: ['open', 'in_progress'] },
        targetDate: { $lt: today }
    });

    return {
        ...(stats || {
            totalActions: 0,
            open: 0,
            inProgress: 0,
            completed: 0,
            cancelled: 0,
            corrective: 0,
            preventive: 0
        }),
        overdue: overdueCount
    };
};

qualityActionSchema.statics.getOverdueActions = async function(firmId, limit = 10) {
    const query = {
        status: { $in: ['open', 'in_progress'] },
        targetDate: { $lt: new Date() }
    };

    if (firmId) {
        query.firmId = firmId;
    }

    return this.find(query)
        .sort({ targetDate: 1 })
        .limit(limit)
        .populate('responsiblePerson', 'name email')
        .populate('inspectionId', 'inspectionNumber itemName');
};

qualityActionSchema.statics.getActionsByResponsible = async function(firmId, userId, status = null) {
    const query = { responsiblePerson: userId };

    if (firmId) {
        query.firmId = firmId;
    }

    if (status) {
        query.status = status;
    }

    return this.find(query)
        .sort({ targetDate: 1 })
        .populate('inspectionId', 'inspectionNumber itemName');
};

// ============ METHODS ============
qualityActionSchema.methods.complete = async function(userId, verificationNotes) {
    this.status = 'completed';
    this.completionDate = new Date();
    this.updatedBy = userId;

    if (verificationNotes) {
        this.verification = verificationNotes;
    }

    return this.save();
};

qualityActionSchema.methods.verify = async function(userId, verificationNotes) {
    this.verifiedBy = userId;
    this.verifiedDate = new Date();
    this.verification = verificationNotes;
    this.updatedBy = userId;

    return this.save();
};

qualityActionSchema.methods.reassign = async function(newResponsiblePerson, userId) {
    this.responsiblePerson = newResponsiblePerson;
    this.updatedBy = userId;

    return this.save();
};

qualityActionSchema.methods.extendDeadline = async function(newTargetDate, userId, reason) {
    this.targetDate = newTargetDate;
    this.updatedBy = userId;

    if (reason) {
        this.remarks = `${this.remarks || ''}\nDeadline extended: ${reason}`;
    }

    return this.save();
};

module.exports = mongoose.model('QualityAction', qualityActionSchema);
