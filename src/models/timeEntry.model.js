const mongoose = require('mongoose');

// ═══════════════════════════════════════════════════════════════
// UTBMS ACTIVITY CODES - Legal Industry Standard
// ═══════════════════════════════════════════════════════════════
const UTBMS_CODES = {
    // L100 - Case Assessment & Strategy
    'L110': { category: 'case_assessment', description: 'Legal consultation', descriptionAr: 'استشارة قانونية' },
    'L120': { category: 'case_assessment', description: 'Legal research', descriptionAr: 'بحث قانوني' },
    'L130': { category: 'case_assessment', description: 'Drafting documents', descriptionAr: 'صياغة مستندات' },
    'L140': { category: 'case_assessment', description: 'Document review', descriptionAr: 'مراجعة مستندات' },
    'L150': { category: 'case_assessment', description: 'Case analysis', descriptionAr: 'تحليل قضية' },

    // L200 - Court & Legal Proceedings
    'L210': { category: 'proceedings', description: 'Court attendance', descriptionAr: 'حضور جلسة محكمة' },
    'L220': { category: 'proceedings', description: 'Client meeting', descriptionAr: 'اجتماع مع العميل' },
    'L230': { category: 'proceedings', description: 'Phone call/conference', descriptionAr: 'مكالمة هاتفية/مؤتمر' },
    'L240': { category: 'proceedings', description: 'Correspondence', descriptionAr: 'مراسلات' },
    'L250': { category: 'proceedings', description: 'Negotiations', descriptionAr: 'مفاوضات' },
    'L260': { category: 'proceedings', description: 'Mediation', descriptionAr: 'وساطة' },
    'L270': { category: 'proceedings', description: 'Arbitration', descriptionAr: 'تحكيم' },

    // L300 - Travel & Waiting
    'L310': { category: 'travel', description: 'Travel time', descriptionAr: 'وقت السفر' },
    'L320': { category: 'travel', description: 'Waiting time', descriptionAr: 'وقت الانتظار' },

    // L400 - Administrative
    'L410': { category: 'administrative', description: 'Administrative tasks', descriptionAr: 'أعمال إدارية' },
    'L420': { category: 'administrative', description: 'File organization', descriptionAr: 'تنظيم ملفات' },

    // L500 - Training & Development
    'L510': { category: 'training', description: 'Training & development', descriptionAr: 'تدريب وتطوير' },
    'L520': { category: 'training', description: 'Legal research (educational)', descriptionAr: 'بحث قانوني (تعليمي)' }
};

// Time type classification
const TIME_TYPES = ['billable', 'non_billable', 'pro_bono', 'internal'];

// Bill status
const BILL_STATUSES = ['draft', 'unbilled', 'billed', 'written_off'];

// Entry status
const ENTRY_STATUSES = ['pending', 'approved', 'rejected'];

// Legacy activity codes for backwards compatibility
const LEGACY_ACTIVITY_CODES = [
    'court_appearance',
    'client_meeting',
    'research',
    'document_preparation',
    'phone_call',
    'email',
    'travel',
    'administrative',
    'other'
];

const timeEntrySchema = new mongoose.Schema({
    // ═══════════════════════════════════════════════════════════════
    // FIRM (Multi-Tenancy)
    // ═══════════════════════════════════════════════════════════════
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        index: true,
        required: false  // Optional for backwards compatibility
    },

    // Auto-generated entry ID (TE-YYYY-NNNN)
    entryId: {
        type: String,
        unique: true,
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // DESCRIPTION
    // ═══════════════════════════════════════════════════════════════
    description: {
        type: String,
        required: [true, 'Description is required'],
        minlength: [10, 'Description must be at least 10 characters'],
        maxlength: 500,
        trim: true
    },

    // ═══════════════════════════════════════════════════════════════
    // ASSIGNMENT
    // ═══════════════════════════════════════════════════════════════
    // Attorney who performed the work
    assigneeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    // User who created the entry (may be different from assignee)
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    // Legacy field - kept for backwards compatibility (alias for assigneeId)
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // RELATED ENTITIES
    // ═══════════════════════════════════════════════════════════════
    clientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Client',
        required: [true, 'Client is required'],
        index: true
    },
    caseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Case',
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // TIME DATA
    // ═══════════════════════════════════════════════════════════════
    date: {
        type: Date,
        required: [true, 'Date is required'],
        index: true,
        validate: {
            validator: function(v) {
                // Cannot be in the future
                return v <= new Date();
            },
            message: 'Date cannot be in the future'
        }
    },
    startTime: {
        type: String,  // HH:mm format
        validate: {
            validator: function(v) {
                if (!v) return true;
                return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
            },
            message: 'Start time must be in HH:mm format'
        }
    },
    endTime: {
        type: String,  // HH:mm format
        validate: {
            validator: function(v) {
                if (!v) return true;
                return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
            },
            message: 'End time must be in HH:mm format'
        }
    },
    breakMinutes: {
        type: Number,
        default: 0,
        min: 0
    },
    duration: {
        type: Number,  // In minutes
        required: [true, 'Duration is required'],
        min: [1, 'Duration must be at least 1 minute'],
        max: [1440, 'Duration cannot exceed 24 hours (1440 minutes)']
    },
    hours: {
        type: Number,  // Computed: duration / 60
        default: 0
    },

    // ═══════════════════════════════════════════════════════════════
    // ACTIVITY & CLASSIFICATION
    // ═══════════════════════════════════════════════════════════════
    activityCode: {
        type: String,
        index: true,
        validate: {
            validator: function(v) {
                if (!v) return true;
                // Accept both UTBMS codes and legacy codes
                return UTBMS_CODES[v] || LEGACY_ACTIVITY_CODES.includes(v);
            },
            message: 'Invalid activity code'
        }
    },
    timeType: {
        type: String,
        enum: TIME_TYPES,
        default: 'billable',
        index: true
    },
    // Legacy taskType for backwards compatibility
    taskType: {
        type: String,
        enum: [
            'consultation', 'research', 'document_review', 'document_drafting',
            'court_appearance', 'meeting', 'phone_call', 'email_correspondence',
            'negotiation', 'contract_review', 'filing', 'travel', 'administrative', 'other'
        ],
        default: 'other'
    },

    // ═══════════════════════════════════════════════════════════════
    // BILLING
    // ═══════════════════════════════════════════════════════════════
    hourlyRate: {
        type: Number,  // In halalas (SAR * 100)
        required: [true, 'Hourly rate is required'],
        min: 0
    },
    totalAmount: {
        type: Number,  // Computed: (duration / 60) * hourlyRate
        default: 0
    },
    isBillable: {
        type: Boolean,
        default: true,
        index: true
    },
    isBilled: {
        type: Boolean,
        default: false,
        index: true
    },
    billStatus: {
        type: String,
        enum: BILL_STATUSES,
        default: 'draft',
        index: true
    },
    invoiceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Invoice',
        index: true
    },
    invoicedAt: Date,

    // ═══════════════════════════════════════════════════════════════
    // WRITE-OFF / WRITE-DOWN
    // ═══════════════════════════════════════════════════════════════
    writeOff: {
        type: Boolean,
        default: false
    },
    writeOffReason: {
        type: String,
        maxlength: 500,
        validate: {
            validator: function(v) {
                // Required if writeOff is true
                if (this.writeOff && !v) return false;
                return true;
            },
            message: 'Write-off reason is required when writing off time'
        }
    },
    writeOffBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    writeOffAt: Date,

    writeDown: {
        type: Boolean,
        default: false
    },
    writeDownAmount: {
        type: Number,  // In halalas
        min: 0,
        validate: {
            validator: function(v) {
                // Required if writeDown is true
                if (this.writeDown && (!v || v <= 0)) return false;
                return true;
            },
            message: 'Write-down amount is required and must be positive'
        }
    },
    writeDownReason: {
        type: String,
        maxlength: 500,
        validate: {
            validator: function(v) {
                // Required if writeDown is true
                if (this.writeDown && !v) return false;
                return true;
            },
            message: 'Write-down reason is required when writing down time'
        }
    },
    writeDownBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    writeDownAt: Date,

    // Final amount after write-down (computed)
    finalAmount: {
        type: Number,
        default: 0
    },

    // ═══════════════════════════════════════════════════════════════
    // ORGANIZATION
    // ═══════════════════════════════════════════════════════════════
    departmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Department',
        index: true
    },
    locationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Location'
    },
    practiceArea: {
        type: String,
        trim: true
    },
    phase: {
        type: String,
        trim: true
    },
    taskId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Task',
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // TIMER
    // ═══════════════════════════════════════════════════════════════
    wasTimerBased: {
        type: Boolean,
        default: false
    },
    timerStartedAt: Date,
    timerPausedDuration: {
        type: Number,  // In milliseconds
        default: 0
    },

    // ═══════════════════════════════════════════════════════════════
    // STATUS & APPROVAL
    // ═══════════════════════════════════════════════════════════════
    status: {
        type: String,
        enum: ENTRY_STATUSES,
        default: 'pending',
        index: true
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    approvedAt: Date,
    rejectedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    rejectedAt: Date,
    rejectionReason: {
        type: String,
        maxlength: 500
    },

    // ═══════════════════════════════════════════════════════════════
    // NOTES & ATTACHMENTS
    // ═══════════════════════════════════════════════════════════════
    notes: {
        type: String,
        maxlength: 2000
    },
    attachments: [{
        fileName: String,
        fileUrl: String,
        fileType: String,
        fileSize: Number,
        uploadedAt: {
            type: Date,
            default: Date.now
        }
    }],

    // ═══════════════════════════════════════════════════════════════
    // HISTORY / AUDIT
    // ═══════════════════════════════════════════════════════════════
    history: [{
        action: {
            type: String,
            enum: ['created', 'updated', 'approved', 'rejected', 'billed', 'written_off', 'written_down', 'unbilled']
        },
        performedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        timestamp: {
            type: Date,
            default: Date.now
        },
        details: mongoose.Schema.Types.Mixed
    }],
    // Legacy editHistory for backwards compatibility
    editHistory: [{
        editedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        editedAt: Date,
        changes: mongoose.Schema.Types.Mixed
    }],

    // Created by (for audit)
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    versionKey: false,
    timestamps: true
});

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════
// Multi-tenancy indexes
timeEntrySchema.index({ firmId: 1, date: -1 });
timeEntrySchema.index({ firmId: 1, assigneeId: 1, date: -1 });
timeEntrySchema.index({ firmId: 1, clientId: 1, date: -1 });
timeEntrySchema.index({ firmId: 1, caseId: 1, date: -1 });
timeEntrySchema.index({ firmId: 1, billStatus: 1, isBillable: 1 });
timeEntrySchema.index({ firmId: 1, status: 1 });
timeEntrySchema.index({ firmId: 1, timeType: 1 });

// Legacy indexes
timeEntrySchema.index({ caseId: 1, date: -1 });
timeEntrySchema.index({ lawyerId: 1, date: -1 });
timeEntrySchema.index({ isBilled: 1, isBillable: 1 });
timeEntrySchema.index({ date: -1 });

// ═══════════════════════════════════════════════════════════════
// PRE-SAVE HOOK
// ═══════════════════════════════════════════════════════════════
timeEntrySchema.pre('save', async function(next) {
    // Generate entry ID (TE-YYYY-NNNN)
    if (this.isNew && !this.entryId) {
        const year = new Date().getFullYear();
        const count = await this.constructor.countDocuments({
            entryId: new RegExp(`^TE-${year}-`)
        });
        this.entryId = `TE-${year}-${String(count + 1).padStart(4, '0')}`;
    }

    // Sync lawyerId with assigneeId for backwards compatibility
    if (this.assigneeId && !this.lawyerId) {
        this.lawyerId = this.assigneeId;
    }
    if (this.lawyerId && !this.assigneeId) {
        this.assigneeId = this.lawyerId;
    }

    // Calculate hours from duration (duration is in minutes)
    this.hours = this.duration / 60;

    // Auto-set isBillable based on timeType
    if (this.isModified('timeType')) {
        this.isBillable = this.timeType === 'billable';
    }

    // Calculate amounts
    if (this.isModified('duration') || this.isModified('hourlyRate') ||
        this.isModified('writeOff') || this.isModified('writeDownAmount') ||
        this.isModified('timeType')) {

        const baseAmount = Math.round((this.duration / 60) * this.hourlyRate);

        if (this.writeOff) {
            // Written off - no amount
            this.totalAmount = baseAmount;
            this.finalAmount = 0;
            this.isBillable = false;
            this.billStatus = 'written_off';
        } else if (this.writeDown && this.writeDownAmount > 0) {
            // Written down - reduced amount
            this.totalAmount = baseAmount;
            this.finalAmount = Math.max(0, baseAmount - this.writeDownAmount);
        } else if (this.timeType === 'billable') {
            // Normal billable
            this.totalAmount = baseAmount;
            this.finalAmount = baseAmount;
        } else {
            // Non-billable types
            this.totalAmount = baseAmount;
            this.finalAmount = 0;
        }
    }

    // Sync billStatus with isBillable
    if (this.isModified('billStatus')) {
        if (this.billStatus === 'written_off') {
            this.isBillable = false;
        } else if (this.billStatus === 'billed') {
            this.isBilled = true;
        }
    }

    // Calculate duration from start/end time if both provided
    if (this.isModified('startTime') || this.isModified('endTime') || this.isModified('breakMinutes')) {
        if (this.startTime && this.endTime) {
            const [startHour, startMin] = this.startTime.split(':').map(Number);
            const [endHour, endMin] = this.endTime.split(':').map(Number);

            let calculatedMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin);
            if (calculatedMinutes < 0) calculatedMinutes += 24 * 60; // Handle overnight

            // Subtract break
            calculatedMinutes -= (this.breakMinutes || 0);

            if (calculatedMinutes > 0) {
                this.duration = calculatedMinutes;
            }
        }
    }

    next();
});

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Get time entry statistics with time type breakdown
 */
timeEntrySchema.statics.getTimeStats = async function(filters = {}) {
    const matchStage = {};

    if (filters.firmId) matchStage.firmId = new mongoose.Types.ObjectId(filters.firmId);
    if (filters.lawyerId) matchStage.lawyerId = new mongoose.Types.ObjectId(filters.lawyerId);
    if (filters.assigneeId) matchStage.assigneeId = new mongoose.Types.ObjectId(filters.assigneeId);
    if (filters.clientId) matchStage.clientId = new mongoose.Types.ObjectId(filters.clientId);
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
                totalDuration: { $sum: '$duration' },
                totalBillable: {
                    $sum: { $cond: [{ $eq: ['$timeType', 'billable'] }, '$duration', 0] }
                },
                totalAmount: { $sum: '$finalAmount' },
                entryCount: { $sum: 1 },
                byTimeType: {
                    $push: {
                        timeType: '$timeType',
                        duration: '$duration',
                        amount: '$finalAmount'
                    }
                }
            }
        }
    ]);

    // Process byTimeType into proper format
    const result = stats[0] || {
        totalDuration: 0,
        totalBillable: 0,
        totalAmount: 0,
        entryCount: 0,
        byTimeType: []
    };

    // Aggregate byTimeType
    const typeBreakdown = {
        billable: 0,
        non_billable: 0,
        pro_bono: 0,
        internal: 0
    };

    if (result.byTimeType) {
        result.byTimeType.forEach(entry => {
            if (typeBreakdown[entry.timeType] !== undefined) {
                typeBreakdown[entry.timeType] += entry.duration;
            }
        });
    }

    return {
        totalDuration: result.totalDuration,
        totalBillable: result.totalBillable,
        totalAmount: result.totalAmount,
        entryCount: result.entryCount,
        byTimeType: typeBreakdown
    };
};

/**
 * Get time entries grouped by case
 */
timeEntrySchema.statics.getTimeByCase = async function(filters = {}) {
    const matchStage = {};

    if (filters.firmId) matchStage.firmId = new mongoose.Types.ObjectId(filters.firmId);
    if (filters.lawyerId) matchStage.lawyerId = new mongoose.Types.ObjectId(filters.lawyerId);
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
                totalAmount: { $sum: '$finalAmount' },
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
        { $unwind: { path: '$case', preserveNullAndEmptyArrays: true } },
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

/**
 * Mark entries as billed
 */
timeEntrySchema.statics.markAsBilled = async function(entryIds, invoiceId, userId) {
    const result = await this.updateMany(
        { _id: { $in: entryIds } },
        {
            $set: {
                isBilled: true,
                billStatus: 'billed',
                invoiceId: invoiceId,
                invoicedAt: new Date()
            },
            $push: {
                history: {
                    action: 'billed',
                    performedBy: userId,
                    timestamp: new Date(),
                    details: { invoiceId }
                }
            }
        }
    );
    return result;
};

/**
 * Get unbilled entries for a client/case
 */
timeEntrySchema.statics.getUnbilledEntries = async function(filters = {}) {
    const matchStage = {
        isBillable: true,
        isBilled: false,
        billStatus: { $in: ['draft', 'unbilled'] },
        status: 'approved'
    };

    if (filters.firmId) matchStage.firmId = new mongoose.Types.ObjectId(filters.firmId);
    if (filters.clientId) matchStage.clientId = new mongoose.Types.ObjectId(filters.clientId);
    if (filters.caseId) matchStage.caseId = new mongoose.Types.ObjectId(filters.caseId);

    return await this.find(matchStage)
        .populate('assigneeId', 'name email')
        .populate('clientId', 'firstName lastName companyName')
        .populate('caseId', 'caseNumber title')
        .sort({ date: -1 });
};

/**
 * Generate entry ID
 */
timeEntrySchema.statics.generateEntryId = async function(firmId) {
    const year = new Date().getFullYear();
    const count = await this.countDocuments({
        entryId: new RegExp(`^TE-${year}-`)
    });
    return `TE-${year}-${String(count + 1).padStart(4, '0')}`;
};

// ═══════════════════════════════════════════════════════════════
// INSTANCE METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Write off this time entry
 */
timeEntrySchema.methods.writeOffEntry = async function(reason, userId) {
    if (this.writeOff) {
        throw new Error('Time entry already written off');
    }

    if (this.isBilled) {
        throw new Error('Cannot write off billed time entry');
    }

    this.writeOff = true;
    this.writeOffReason = reason;
    this.writeOffBy = userId;
    this.writeOffAt = new Date();
    this.isBillable = false;
    this.billStatus = 'written_off';
    this.finalAmount = 0;

    this.history.push({
        action: 'written_off',
        performedBy: userId,
        timestamp: new Date(),
        details: { reason }
    });

    return await this.save();
};

/**
 * Write down this time entry
 */
timeEntrySchema.methods.writeDownEntry = async function(amount, reason, userId) {
    if (this.writeOff) {
        throw new Error('Cannot write down a written-off entry');
    }

    if (this.isBilled) {
        throw new Error('Cannot write down billed time entry');
    }

    if (amount <= 0) {
        throw new Error('Write-down amount must be positive');
    }

    if (amount >= this.totalAmount) {
        throw new Error('Write-down amount cannot exceed total amount');
    }

    this.writeDown = true;
    this.writeDownAmount = amount;
    this.writeDownReason = reason;
    this.writeDownBy = userId;
    this.writeDownAt = new Date();
    this.finalAmount = Math.max(0, this.totalAmount - amount);

    this.history.push({
        action: 'written_down',
        performedBy: userId,
        timestamp: new Date(),
        details: { amount, reason, newFinalAmount: this.finalAmount }
    });

    return await this.save();
};

/**
 * Approve this time entry
 */
timeEntrySchema.methods.approve = async function(userId) {
    if (this.status === 'approved') {
        throw new Error('Time entry already approved');
    }

    this.status = 'approved';
    this.approvedBy = userId;
    this.approvedAt = new Date();
    this.billStatus = 'unbilled'; // Ready for invoicing

    this.history.push({
        action: 'approved',
        performedBy: userId,
        timestamp: new Date()
    });

    return await this.save();
};

/**
 * Reject this time entry
 */
timeEntrySchema.methods.reject = async function(reason, userId) {
    if (this.status === 'rejected') {
        throw new Error('Time entry already rejected');
    }

    this.status = 'rejected';
    this.rejectedBy = userId;
    this.rejectedAt = new Date();
    this.rejectionReason = reason;

    this.history.push({
        action: 'rejected',
        performedBy: userId,
        timestamp: new Date(),
        details: { reason }
    });

    return await this.save();
};

// ═══════════════════════════════════════════════════════════════
// EXPORT CONSTANTS
// ═══════════════════════════════════════════════════════════════
timeEntrySchema.statics.UTBMS_CODES = UTBMS_CODES;
timeEntrySchema.statics.TIME_TYPES = TIME_TYPES;
timeEntrySchema.statics.BILL_STATUSES = BILL_STATUSES;
timeEntrySchema.statics.ENTRY_STATUSES = ENTRY_STATUSES;
timeEntrySchema.statics.LEGACY_ACTIVITY_CODES = LEGACY_ACTIVITY_CODES;

module.exports = mongoose.model('TimeEntry', timeEntrySchema);
