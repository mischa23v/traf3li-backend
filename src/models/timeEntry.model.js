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

// Entry status (extended for full workflow)
const ENTRY_STATUSES = ['draft', 'pending', 'submitted', 'approved', 'rejected', 'billed', 'locked'];

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
        required: false,
        minlength: 1,
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
        required: false,
        index: true
    },
    // User who created the entry (may be different from assignee)
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false,
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
        required: false,
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
        required: false,
        index: true
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
        required: false,
        min: 0,
        max: 1440
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
        required: false,
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
    // SALES INVOICE REFERENCE (ERPNext: sales_invoice)
    // ═══════════════════════════════════════════════════════════════
    salesInvoiceRef: {
        type: String,
        trim: true,
        index: true
        // Stores invoice number for quick reference
    },
    billedDate: {
        type: Date
    },
    billedAmount: {
        type: Number,
        min: 0
        // Amount included in invoice (may differ from totalAmount due to discounts)
    },

    // ═══════════════════════════════════════════════════════════════
    // BILLING HOURS OVERRIDE (ERPNext: billing_hours)
    // ═══════════════════════════════════════════════════════════════
    billingHours: {
        type: Number,
        min: 0
        // Override hours for billing (may differ from actual)
    },
    billingMinutes: {
        type: Number,
        min: 0,
        max: 59,
        default: 0
    },
    isBillableOverride: {
        type: Boolean,
        default: false
        // True when billing hours differ from actual hours
    },

    // ═══════════════════════════════════════════════════════════════
    // COSTING (ERPNext: costing_rate, costing_amount)
    // ═══════════════════════════════════════════════════════════════
    costingRate: {
        type: Number,
        min: 0,
        default: 0
        // Internal cost rate per hour (in halalas)
    },
    costingAmount: {
        type: Number,
        min: 0,
        default: 0
        // Calculated: actualHours * costingRate
    },

    // ═══════════════════════════════════════════════════════════════
    // EXPECTED HOURS (ERPNext: expected_hours)
    // ═══════════════════════════════════════════════════════════════
    expectedHours: {
        type: Number,
        min: 0,
        default: 0
    },
    expectedMinutes: {
        type: Number,
        min: 0,
        max: 59,
        default: 0
    },

    // ═══════════════════════════════════════════════════════════════
    // COMPLETION STATUS (ERPNext: completed)
    // ═══════════════════════════════════════════════════════════════
    isCompleted: {
        type: Boolean,
        default: false,
        index: true
    },
    completedAt: {
        type: Date
    },
    completedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },

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
        default: 'draft',
        index: true
    },
    // Submission tracking
    submittedAt: Date,
    submittedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    // Manager assigned for approval
    assignedManager: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    // Approval tracking
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    approvedAt: Date,
    // Rejection tracking
    rejectedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    rejectedAt: Date,
    rejectionReason: {
        type: String,
        maxlength: 500
    },
    // Locking tracking (for closed fiscal periods)
    lockedAt: Date,
    lockedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    lockReason: {
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
// ERPNext parity indexes
timeEntrySchema.index({ isBilled: 1, caseId: 1, date: -1 });
timeEntrySchema.index({ isCompleted: 1, caseId: 1 });
timeEntrySchema.index({ salesInvoiceRef: 1 });

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
        this.isModified('timeType') || this.isModified('billingHours') ||
        this.isModified('billingMinutes') || this.isModified('isBillableOverride') ||
        this.isModified('costingRate')) {

        // Calculate base amount from actual duration
        const baseAmount = Math.round((this.duration / 60) * this.hourlyRate);

        // Calculate billing amount (may use override hours)
        let billableMinutes;
        if (this.isBillableOverride && (this.billingHours !== undefined || this.billingMinutes)) {
            billableMinutes = ((this.billingHours || 0) * 60) + (this.billingMinutes || 0);
        } else {
            billableMinutes = this.duration;
        }
        const billingAmount = Math.round((billableMinutes / 60) * this.hourlyRate);

        // Calculate costing amount (always uses actual hours)
        if (this.costingRate > 0) {
            this.costingAmount = Math.round((this.duration / 60) * this.costingRate);
        } else {
            this.costingAmount = 0;
        }

        if (this.writeOff) {
            // Written off - no amount
            this.totalAmount = baseAmount;
            this.finalAmount = 0;
            this.isBillable = false;
            this.billStatus = 'written_off';
        } else if (this.writeDown && this.writeDownAmount > 0) {
            // Written down - reduced amount
            this.totalAmount = this.isBillableOverride ? billingAmount : baseAmount;
            this.finalAmount = Math.max(0, this.totalAmount - this.writeDownAmount);
        } else if (this.timeType === 'billable') {
            // Normal billable (use billing override if enabled)
            this.totalAmount = this.isBillableOverride ? billingAmount : baseAmount;
            this.finalAmount = this.totalAmount;
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
 * Mark entries as billed (ERPNext parity: includes sales_invoice reference)
 */
timeEntrySchema.statics.markAsBilled = async function(entryIds, invoiceId, invoiceNumber, userId, session = null) {
    const options = session ? { session } : {};
    const result = await this.updateMany(
        { _id: { $in: entryIds } },
        {
            $set: {
                isBilled: true,
                billStatus: 'billed',
                invoiceId: invoiceId,
                salesInvoiceRef: invoiceNumber,
                invoicedAt: new Date(),
                billedDate: new Date()
            },
            $push: {
                history: {
                    action: 'billed',
                    performedBy: userId,
                    timestamp: new Date(),
                    details: { invoiceId, invoiceNumber }
                }
            }
        },
        options
    );
    return result;
};

/**
 * Reverse billing when invoice is cancelled/voided (ERPNext parity)
 */
timeEntrySchema.statics.unmarkAsBilled = async function(invoiceId, session = null) {
    const options = session ? { session } : {};
    return await this.updateMany(
        { invoiceId: invoiceId },
        {
            $set: {
                isBilled: false,
                billStatus: 'unbilled'
            },
            $unset: {
                salesInvoiceRef: '',
                billedDate: '',
                billedAmount: ''
            }
        },
        options
    );
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

/**
 * Get unbilled entries grouped by case for invoice creation (ERPNext parity)
 */
timeEntrySchema.statics.getUnbilledEntriesGrouped = async function(filters = {}) {
    const matchStage = {
        isBillable: true,
        isBilled: false,
        billStatus: { $nin: ['written_off', 'billed'] }
    };

    if (filters.firmId) matchStage.firmId = new mongoose.Types.ObjectId(filters.firmId);
    if (filters.clientId) matchStage.clientId = new mongoose.Types.ObjectId(filters.clientId);
    if (filters.caseId) matchStage.caseId = new mongoose.Types.ObjectId(filters.caseId);

    const entries = await this.find(matchStage)
        .populate('assigneeId', 'firstName lastName hourlyRate')
        .populate('caseId', 'caseNumber title')
        .sort({ date: -1 });

    // Group by case
    const grouped = entries.reduce((acc, entry) => {
        const key = entry.caseId?._id?.toString() || 'no-case';
        if (!acc[key]) {
            acc[key] = {
                caseId: entry.caseId?._id,
                caseNumber: entry.caseId?.caseNumber,
                caseName: entry.caseId?.title,
                entries: [],
                totalAmount: 0,
                totalHours: 0
            };
        }
        acc[key].entries.push(entry);
        acc[key].totalAmount += entry.finalAmount || entry.totalAmount || 0;
        acc[key].totalHours += (entry.duration || 0) / 60;
        return acc;
    }, {});

    return Object.values(grouped);
};

/**
 * Bulk mark entries as completed (ERPNext parity)
 */
timeEntrySchema.statics.bulkMarkCompleted = async function(entryIds, userId) {
    return await this.updateMany(
        { _id: { $in: entryIds } },
        {
            $set: {
                isCompleted: true,
                completedAt: new Date(),
                completedBy: userId
            }
        }
    );
};

/**
 * Bulk mark entries as incomplete (ERPNext parity)
 */
timeEntrySchema.statics.bulkMarkIncomplete = async function(entryIds) {
    return await this.updateMany(
        { _id: { $in: entryIds } },
        {
            $set: { isCompleted: false },
            $unset: { completedAt: '', completedBy: '' }
        }
    );
};

/**
 * Get case completion statistics (ERPNext parity)
 */
timeEntrySchema.statics.getCaseCompletionStats = async function(caseId) {
    const stats = await this.aggregate([
        { $match: { caseId: new mongoose.Types.ObjectId(caseId) } },
        {
            $group: {
                _id: null,
                totalEntries: { $sum: 1 },
                completedEntries: { $sum: { $cond: ['$isCompleted', 1, 0] } },
                totalHours: { $sum: { $add: [{ $ifNull: ['$duration', 0] }] } },
                completedHours: {
                    $sum: {
                        $cond: [
                            '$isCompleted',
                            { $add: [{ $ifNull: ['$duration', 0] }] },
                            0
                        ]
                    }
                },
                totalAmount: { $sum: { $ifNull: ['$finalAmount', 0] } },
                billedAmount: {
                    $sum: {
                        $cond: [
                            '$isBilled',
                            { $ifNull: ['$finalAmount', 0] },
                            0
                        ]
                    }
                }
            }
        }
    ]);

    if (!stats.length) return null;

    const result = stats[0];
    return {
        totalEntries: result.totalEntries,
        completedEntries: result.completedEntries,
        completionPercentage: result.totalEntries > 0
            ? Math.round((result.completedEntries / result.totalEntries) * 100)
            : 0,
        totalHours: Math.round((result.totalHours / 60) * 10) / 10,
        completedHours: Math.round((result.completedHours / 60) * 10) / 10,
        totalAmount: result.totalAmount,
        billedAmount: result.billedAmount,
        unbilledAmount: result.totalAmount - result.billedAmount
    };
};

/**
 * Get billing history for a time entry (ERPNext parity)
 */
timeEntrySchema.statics.getBillingHistory = async function(entryId) {
    const entry = await this.findById(entryId)
        .populate('invoiceId', 'invoiceNumber issueDate status totalAmount');

    if (!entry) return null;

    return {
        isBilled: entry.isBilled,
        billedDate: entry.billedDate,
        salesInvoiceRef: entry.salesInvoiceRef,
        billedAmount: entry.billedAmount,
        invoice: entry.invoiceId
    };
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

/**
 * Submit this time entry for approval
 */
timeEntrySchema.methods.submit = async function(userId, managerId = null) {
    if (this.status !== 'draft' && this.status !== 'rejected') {
        throw new Error('Only draft or rejected entries can be submitted');
    }

    this.status = 'submitted';
    this.submittedAt = new Date();
    this.submittedBy = userId;

    if (managerId) {
        this.assignedManager = managerId;
    }

    this.history.push({
        action: 'submitted',
        performedBy: userId,
        timestamp: new Date()
    });

    return await this.save();
};

/**
 * Lock this time entry (for closed fiscal periods)
 */
timeEntrySchema.methods.lock = async function(reason, userId) {
    if (this.status === 'locked') {
        throw new Error('Time entry already locked');
    }

    if (this.status !== 'approved' && this.status !== 'billed') {
        throw new Error('Only approved or billed entries can be locked');
    }

    this.status = 'locked';
    this.lockedAt = new Date();
    this.lockedBy = userId;
    this.lockReason = reason;

    this.history.push({
        action: 'locked',
        performedBy: userId,
        timestamp: new Date(),
        details: { reason }
    });

    return await this.save();
};

/**
 * Unlock this time entry (admin only)
 */
timeEntrySchema.methods.unlock = async function(userId) {
    if (this.status !== 'locked') {
        throw new Error('Time entry is not locked');
    }

    // Restore to approved status
    this.status = 'approved';

    this.history.push({
        action: 'unlocked',
        performedBy: userId,
        timestamp: new Date(),
        details: { previousLockReason: this.lockReason }
    });

    this.lockedAt = null;
    this.lockedBy = null;
    this.lockReason = null;

    return await this.save();
};

/**
 * Get pending approval entries for a manager
 */
timeEntrySchema.statics.getPendingApproval = async function(firmId, managerId = null) {
    const query = {
        firmId: new mongoose.Types.ObjectId(firmId),
        status: 'submitted'
    };

    if (managerId) {
        query.assignedManager = new mongoose.Types.ObjectId(managerId);
    }

    return await this.find(query)
        .populate('assigneeId', 'name email')
        .populate('clientId', 'firstName lastName companyName')
        .populate('caseId', 'caseNumber title')
        .sort({ submittedAt: -1 });
};

/**
 * Bulk approve time entries
 */
timeEntrySchema.statics.bulkApprove = async function(entryIds, userId) {
    const result = await this.updateMany(
        {
            _id: { $in: entryIds },
            status: 'submitted'
        },
        {
            $set: {
                status: 'approved',
                approvedAt: new Date(),
                approvedBy: userId,
                billStatus: 'unbilled'
            },
            $push: {
                history: {
                    action: 'approved',
                    performedBy: userId,
                    timestamp: new Date(),
                    details: { bulkApproval: true }
                }
            }
        }
    );
    return result;
};

/**
 * Bulk reject time entries
 */
timeEntrySchema.statics.bulkReject = async function(entryIds, reason, userId) {
    const result = await this.updateMany(
        {
            _id: { $in: entryIds },
            status: 'submitted'
        },
        {
            $set: {
                status: 'rejected',
                rejectedAt: new Date(),
                rejectedBy: userId,
                rejectionReason: reason
            },
            $push: {
                history: {
                    action: 'rejected',
                    performedBy: userId,
                    timestamp: new Date(),
                    details: { reason, bulkRejection: true }
                }
            }
        }
    );
    return result;
};

/**
 * Lock entries for a closed fiscal period
 */
timeEntrySchema.statics.lockForPeriod = async function(firmId, startDate, endDate, reason, userId) {
    const result = await this.updateMany(
        {
            firmId: new mongoose.Types.ObjectId(firmId),
            date: { $gte: startDate, $lte: endDate },
            status: { $in: ['approved', 'billed'] },
            lockedAt: { $exists: false }
        },
        {
            $set: {
                status: 'locked',
                lockedAt: new Date(),
                lockedBy: userId,
                lockReason: reason
            },
            $push: {
                history: {
                    action: 'locked',
                    performedBy: userId,
                    timestamp: new Date(),
                    details: { reason, periodLock: true }
                }
            }
        }
    );
    return result;
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
