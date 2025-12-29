const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * Maintenance Schedule Model - Asset Maintenance Planning
 * Tracks preventive and corrective maintenance schedules for assets
 */

const maintenanceScheduleSchema = new Schema({
    // ═══════════════════════════════════════════════════════════════
    // IDENTIFIERS
    // ═══════════════════════════════════════════════════════════════
    scheduleId: {
        type: String,
        unique: true,
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // ASSET REFERENCE
    // ═══════════════════════════════════════════════════════════════
    assetId: {
        type: Schema.Types.ObjectId,
        ref: 'Asset',
        required: true,
        index: true
    },
    assetName: {
        type: String
    },

    // ═══════════════════════════════════════════════════════════════
    // MAINTENANCE TYPE & FREQUENCY
    // ═══════════════════════════════════════════════════════════════
    maintenanceType: {
        type: String,
        enum: ['preventive', 'corrective', 'calibration'],
        required: true,
        index: true
    },
    frequency: {
        type: String,
        enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'],
        default: 'monthly'
    },

    // ═══════════════════════════════════════════════════════════════
    // SCHEDULE DATES
    // ═══════════════════════════════════════════════════════════════
    lastMaintenanceDate: {
        type: Date
    },
    nextMaintenanceDate: {
        type: Date,
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // ASSIGNMENT
    // ═══════════════════════════════════════════════════════════════
    assignTo: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    assignToName: {
        type: String
    },

    // ═══════════════════════════════════════════════════════════════
    // STATUS
    // ═══════════════════════════════════════════════════════════════
    maintenanceStatus: {
        type: String,
        enum: ['planned', 'overdue', 'completed', 'cancelled'],
        default: 'planned',
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // DETAILS
    // ═══════════════════════════════════════════════════════════════
    description: {
        type: String,
        maxlength: 1000
    },
    certificateRequired: {
        type: Boolean,
        default: false
    },

    // ═══════════════════════════════════════════════════════════════
    // MULTI-TENANCY
    // ═══════════════════════════════════════════════════════════════
    firmId: {
        type: Schema.Types.ObjectId,
        ref: 'Firm',
        index: true,
        required: false
     },


    // For solo lawyers (no firm) - enables row-level security
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    // ═══════════════════════════════════════════════════════════════
    // AUDIT
    // ═══════════════════════════════════════════════════════════════
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

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════
maintenanceScheduleSchema.index({ assetId: 1, maintenanceStatus: 1 });
maintenanceScheduleSchema.index({ nextMaintenanceDate: 1, maintenanceStatus: 1 });
maintenanceScheduleSchema.index({ assignTo: 1, maintenanceStatus: 1 });
maintenanceScheduleSchema.index({ firmId: 1, maintenanceStatus: 1 });
maintenanceScheduleSchema.index({ maintenanceType: 1 });

// ═══════════════════════════════════════════════════════════════
// VIRTUALS
// ═══════════════════════════════════════════════════════════════
maintenanceScheduleSchema.virtual('isOverdue').get(function() {
    if (!this.nextMaintenanceDate || this.maintenanceStatus !== 'planned') return false;
    return new Date() > this.nextMaintenanceDate;
});

maintenanceScheduleSchema.virtual('daysUntilMaintenance').get(function() {
    if (!this.nextMaintenanceDate) return null;
    const today = new Date();
    const diff = this.nextMaintenanceDate - today;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

// ═══════════════════════════════════════════════════════════════
// PRE-SAVE HOOKS
// ═══════════════════════════════════════════════════════════════
maintenanceScheduleSchema.pre('save', async function(next) {
    // Generate schedule ID (AMS-YYYYMMDD-XXXX)
    if (this.isNew && !this.scheduleId) {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');

        const count = await this.constructor.countDocuments({
            createdAt: {
                $gte: new Date(year, date.getMonth(), date.getDate()),
                $lt: new Date(year, date.getMonth(), date.getDate() + 1)
            }
        });

        this.scheduleId = `AMS-${year}${month}${day}-${String(count + 1).padStart(4, '0')}`;
    }

    // Update status based on dates
    if (this.nextMaintenanceDate && this.maintenanceStatus === 'planned') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const nextDate = new Date(this.nextMaintenanceDate);
        nextDate.setHours(0, 0, 0, 0);

        if (nextDate < today) {
            this.maintenanceStatus = 'overdue';
        }
    }

    next();
});

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Get maintenance statistics
 */
maintenanceScheduleSchema.statics.getMaintenanceStats = async function(filters = {}) {
    const matchStage = {};

    if (filters.firmId) matchStage.firmId = new mongoose.Types.ObjectId(filters.firmId);
    if (filters.assetId) matchStage.assetId = new mongoose.Types.ObjectId(filters.assetId);
    if (filters.maintenanceType) matchStage.maintenanceType = filters.maintenanceType;

    const stats = await this.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: null,
                total: { $sum: 1 },
                planned: {
                    $sum: { $cond: [{ $eq: ['$maintenanceStatus', 'planned'] }, 1, 0] }
                },
                overdue: {
                    $sum: { $cond: [{ $eq: ['$maintenanceStatus', 'overdue'] }, 1, 0] }
                },
                completed: {
                    $sum: { $cond: [{ $eq: ['$maintenanceStatus', 'completed'] }, 1, 0] }
                },
                cancelled: {
                    $sum: { $cond: [{ $eq: ['$maintenanceStatus', 'cancelled'] }, 1, 0] }
                }
            }
        }
    ]);

    return stats[0] || {
        total: 0,
        planned: 0,
        overdue: 0,
        completed: 0,
        cancelled: 0
    };
};

/**
 * Get upcoming maintenance
 */
maintenanceScheduleSchema.statics.getUpcomingMaintenance = async function(daysAhead = 30, firmId = null) {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + daysAhead);

    const query = {
        nextMaintenanceDate: {
            $gte: today,
            $lte: futureDate
        },
        maintenanceStatus: { $in: ['planned', 'overdue'] }
    };

    if (firmId) query.firmId = firmId;

    return await this.find(query)
        .populate('assetId', 'assetName assetNumber')
        .populate('assignTo', 'name')
        .sort({ nextMaintenanceDate: 1 });
};

/**
 * Get overdue maintenance
 */
maintenanceScheduleSchema.statics.getOverdueMaintenance = async function(firmId = null) {
    const today = new Date();

    const query = {
        nextMaintenanceDate: { $lt: today },
        maintenanceStatus: { $in: ['planned', 'overdue'] }
    };

    if (firmId) query.firmId = firmId;

    return await this.find(query)
        .populate('assetId', 'assetName assetNumber')
        .populate('assignTo', 'name')
        .sort({ nextMaintenanceDate: 1 });
};

/**
 * Get maintenance by type
 */
maintenanceScheduleSchema.statics.getMaintenanceByType = async function(filters = {}) {
    const matchStage = {};

    if (filters.firmId) matchStage.firmId = new mongoose.Types.ObjectId(filters.firmId);

    return await this.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: '$maintenanceType',
                count: { $sum: 1 },
                planned: {
                    $sum: { $cond: [{ $eq: ['$maintenanceStatus', 'planned'] }, 1, 0] }
                },
                overdue: {
                    $sum: { $cond: [{ $eq: ['$maintenanceStatus', 'overdue'] }, 1, 0] }
                },
                completed: {
                    $sum: { $cond: [{ $eq: ['$maintenanceStatus', 'completed'] }, 1, 0] }
                }
            }
        },
        {
            $project: {
                type: '$_id',
                count: 1,
                planned: 1,
                overdue: 1,
                completed: 1,
                _id: 0
            }
        },
        { $sort: { count: -1 } }
    ]);
};

// ═══════════════════════════════════════════════════════════════
// INSTANCE METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Complete maintenance
 */
maintenanceScheduleSchema.methods.completeMaintenance = async function(userId) {
    this.maintenanceStatus = 'completed';
    this.lastMaintenanceDate = new Date();
    this.updatedBy = userId;

    // Calculate next maintenance date based on frequency
    if (this.frequency) {
        const nextDate = new Date(this.lastMaintenanceDate);

        switch (this.frequency) {
            case 'daily':
                nextDate.setDate(nextDate.getDate() + 1);
                break;
            case 'weekly':
                nextDate.setDate(nextDate.getDate() + 7);
                break;
            case 'monthly':
                nextDate.setMonth(nextDate.getMonth() + 1);
                break;
            case 'quarterly':
                nextDate.setMonth(nextDate.getMonth() + 3);
                break;
            case 'yearly':
                nextDate.setFullYear(nextDate.getFullYear() + 1);
                break;
        }

        this.nextMaintenanceDate = nextDate;
        this.maintenanceStatus = 'planned';
    }

    await this.save();
    return this;
};

/**
 * Cancel maintenance
 */
maintenanceScheduleSchema.methods.cancelMaintenance = async function(userId) {
    this.maintenanceStatus = 'cancelled';
    this.updatedBy = userId;
    await this.save();
    return this;
};

/**
 * Reschedule maintenance
 */
maintenanceScheduleSchema.methods.reschedule = async function(newDate, userId) {
    this.nextMaintenanceDate = newDate;
    this.maintenanceStatus = 'planned';
    this.updatedBy = userId;
    await this.save();
    return this;
};

module.exports = mongoose.model('MaintenanceSchedule', maintenanceScheduleSchema);
