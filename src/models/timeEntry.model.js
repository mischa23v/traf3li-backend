const mongoose = require('mongoose');

const timeEntrySchema = new mongoose.Schema({
    entryId: {
        type: String,
        unique: true,
        index: true
    },
    description: {
        type: String,
        required: true,
        maxlength: 500,
        trim: true
    },
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    clientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    caseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Case',
        required: true,
        index: true
    },
    date: {
        type: Date,
        required: true,
        index: true
    },
    startTime: {
        type: String,
        required: true
    },
    endTime: {
        type: String
    },
    duration: {
        type: Number,
        required: true,
        min: 1
    },
    hourlyRate: {
        type: Number,
        required: true,
        min: 0
    },
    totalAmount: {
        type: Number,
        required: true,
        min: 0
    },
    isBillable: {
        type: Boolean,
        default: true
    },
    isBilled: {
        type: Boolean,
        default: false
    },
    activityCode: {
        type: String,
        enum: [
            'court_appearance',
            'client_meeting',
            'research',
            'document_preparation',
            'phone_call',
            'email',
            'travel',
            'administrative',
            'other'
        ]
    },
    status: {
        type: String,
        enum: ['draft', 'pending_approval', 'approved', 'invoiced', 'rejected'],
        default: 'draft',
        index: true
    },
    invoiceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Invoice'
    },
    invoicedAt: Date,
    wasTimerBased: {
        type: Boolean,
        default: false
    },
    timerStartedAt: Date,
    timerPausedDuration: {
        type: Number,
        default: 0
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    approvedAt: Date,
    rejectionReason: String,
    editHistory: [{
        editedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        editedAt: Date,
        changes: mongoose.Schema.Types.Mixed
    }],
    attachments: [{
        fileName: String,
        fileUrl: String,
        fileType: String
    }],
    notes: {
        type: String,
        maxlength: 1000
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    versionKey: false,
    timestamps: true
});

// Indexes for performance
timeEntrySchema.index({ caseId: 1, date: -1 });
timeEntrySchema.index({ userId: 1, date: -1 });
timeEntrySchema.index({ isBilled: 1, isBillable: 1 });
timeEntrySchema.index({ date: -1 });

// Generate entry ID before saving
timeEntrySchema.pre('save', function(next) {
    if (!this.entryId) {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        this.entryId = `TIME-${year}${month}-${random}`;
    }

    // Calculate total amount if duration or hourlyRate changed
    if (this.isModified('duration') || this.isModified('hourlyRate')) {
        const hours = this.duration / 60;
        this.totalAmount = Math.round(hours * this.hourlyRate * 100) / 100;
    }

    next();
});

// Static method: Get time stats
timeEntrySchema.statics.getTimeStats = async function(filters = {}) {
    const matchStage = {};

    if (filters.userId) matchStage.userId = new mongoose.Types.ObjectId(filters.userId);
    if (filters.caseId) matchStage.caseId = new mongoose.Types.ObjectId(filters.caseId);
    if (filters.startDate || filters.endDate) {
        matchStage.date = {};
        if (filters.startDate) matchStage.date.$gte = new Date(filters.startDate);
        if (filters.endDate) matchStage.date.$lte = new Date(filters.endDate);
    }

    const stats = await this.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: null,
                totalMinutes: { $sum: '$duration' },
                billableMinutes: {
                    $sum: { $cond: ['$isBillable', '$duration', 0] }
                },
                nonBillableMinutes: {
                    $sum: { $cond: ['$isBillable', 0, '$duration'] }
                },
                totalAmount: { $sum: '$totalAmount' },
                billedAmount: {
                    $sum: { $cond: ['$isBilled', '$totalAmount', 0] }
                },
                unbilledAmount: {
                    $sum: { $cond: ['$isBilled', 0, '$totalAmount'] }
                },
                entryCount: { $sum: 1 }
            }
        }
    ]);

    return stats[0] || {
        totalMinutes: 0,
        billableMinutes: 0,
        nonBillableMinutes: 0,
        totalAmount: 0,
        billedAmount: 0,
        unbilledAmount: 0,
        entryCount: 0
    };
};

// Static method: Get time by case
timeEntrySchema.statics.getTimeByCase = async function(userId, filters = {}) {
    const matchStage = { userId: new mongoose.Types.ObjectId(userId) };

    if (filters.startDate || filters.endDate) {
        matchStage.date = {};
        if (filters.startDate) matchStage.date.$gte = new Date(filters.startDate);
        if (filters.endDate) matchStage.date.$lte = new Date(filters.endDate);
    }

    return await this.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: '$caseId',
                totalMinutes: { $sum: '$duration' },
                totalAmount: { $sum: '$totalAmount' },
                entryCount: { $sum: 1 }
            }
        },
        {
            $lookup: {
                from: 'cases',
                localField: '_id',
                foreignField: '_id',
                as: 'case'
            }
        },
        { $unwind: '$case' },
        {
            $project: {
                caseId: '$_id',
                caseNumber: '$case.caseNumber',
                caseTitle: '$case.title',
                totalMinutes: 1,
                totalAmount: 1,
                entryCount: 1,
                _id: 0
            }
        },
        { $sort: { totalAmount: -1 } }
    ]);
};

// Static method: Mark entries as billed
timeEntrySchema.statics.markAsBilled = async function(entryIds, invoiceId) {
    return await this.updateMany(
        { _id: { $in: entryIds } },
        {
            $set: {
                isBilled: true,
                invoiceId: invoiceId
            }
        }
    );
};

module.exports = mongoose.model('TimeEntry', timeEntrySchema);
