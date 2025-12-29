const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * Job Card Model
 * Tracks individual manufacturing operations and their execution.
 * Records time, employee, and completion details for each operation in a work order.
 */

const jobCardSchema = new Schema({
    // ═══════════════════════════════════════════════════════════════
    // FIRM (Multi-Tenancy)
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
    // Auto-generated Job Card ID (Format: JC-YYYYMMDD-XXXX)
    jobCardId: {
        type: String,
        unique: true,
        sparse: true,
        index: true
    },

    jobCardNumber: {
        type: String,
        trim: true
    },

    // Work Order reference
    workOrderId: {
        type: Schema.Types.ObjectId,
        ref: 'WorkOrder',
        required: true,
        index: true
    },
    workOrderNumber: String,

    // Operation details
    operation: {
        type: String,
        required: true,
        trim: true
    },

    // Workstation
    workstation: {
        type: Schema.Types.ObjectId,
        ref: 'Workstation',
        index: true
    },

    // Item being manufactured
    itemId: {
        type: Schema.Types.ObjectId,
        ref: 'Item'
    },
    itemCode: String,
    itemName: String,

    // Quantity
    forQty: {
        type: Number,
        default: 0,
        min: 0,
        comment: 'Target quantity for this operation'
    },
    completedQty: {
        type: Number,
        default: 0,
        min: 0
    },

    // Time tracking
    plannedStartTime: Date,
    plannedEndTime: Date,
    actualStartTime: Date,
    actualEndTime: Date,

    // Calculated total time in minutes
    totalTime: {
        type: Number,
        default: 0,
        min: 0,
        comment: 'Total time in minutes'
    },

    // Employee/operator
    employee: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    employeeName: String,

    // Status
    status: {
        type: String,
        enum: ['pending', 'work_in_progress', 'completed', 'on_hold'],
        default: 'pending',
        index: true
    },

    remarks: {
        type: String,
        maxlength: 1000
    },

    // Ownership
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
jobCardSchema.index({ firmId: 1, status: 1 });
jobCardSchema.index({ jobCardId: 1 });
jobCardSchema.index({ workOrderId: 1, status: 1 });
jobCardSchema.index({ workstation: 1, status: 1 });
jobCardSchema.index({ employee: 1, status: 1 });
jobCardSchema.index({ actualStartTime: 1 });

// ============ VIRTUALS ============

// Check if completed
jobCardSchema.virtual('isCompleted').get(function() {
    return this.status === 'completed';
});

// Check if in progress
jobCardSchema.virtual('isInProgress').get(function() {
    return this.status === 'work_in_progress';
});

// Calculate completion percentage
jobCardSchema.virtual('completionPercentage').get(function() {
    if (!this.forQty || this.forQty === 0) return 0;
    return Math.min(100, Math.round((this.completedQty / this.forQty) * 100));
});

// ============ PRE-SAVE MIDDLEWARE ============

jobCardSchema.pre('save', async function(next) {
    // Auto-generate Job Card ID if not provided
    if (this.isNew && !this.jobCardId) {
        const Counter = require('./counter.model');
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');

        const counterId = this.firmId
            ? `jobcard_${this.firmId}_${year}${month}${day}`
            : `jobcard_global_${year}${month}${day}`;

        const seq = await Counter.getNextSequence(counterId);
        this.jobCardId = `JC-${year}${month}${day}-${String(seq).padStart(4, '0')}`;
    }

    // Auto-generate jobCardNumber if not provided
    if (!this.jobCardNumber) {
        this.jobCardNumber = this.jobCardId;
    }

    // Calculate total time if both start and end times are set
    if (this.actualStartTime && this.actualEndTime) {
        const diff = this.actualEndTime - this.actualStartTime;
        this.totalTime = Math.round(diff / (1000 * 60)); // Convert to minutes
    }

    next();
});

// ============ STATIC METHODS ============

/**
 * Get job cards by work order
 */
jobCardSchema.statics.getByWorkOrder = function(workOrderId, firmId = null) {
    const query = { workOrderId };
    if (firmId) query.firmId = firmId;

    return this.find(query)
        .populate('workstation', 'name nameAr workstationId')
        .populate('employee', 'personalInfo.fullNameEnglish personalInfo.fullNameArabic')
        .sort({ createdAt: 1 });
};

/**
 * Get job cards by status
 */
jobCardSchema.statics.getByStatus = function(status, firmId = null) {
    const query = { status };
    if (firmId) query.firmId = firmId;

    return this.find(query)
        .populate('workOrderId', 'workOrderNumber itemName')
        .populate('workstation', 'name nameAr')
        .populate('employee', 'personalInfo.fullNameEnglish personalInfo.fullNameArabic')
        .sort({ plannedStartTime: 1 });
};

/**
 * Get active job cards for a workstation
 */
jobCardSchema.statics.getActiveByWorkstation = function(workstationId, firmId = null) {
    const query = {
        workstation: workstationId,
        status: { $in: ['pending', 'work_in_progress'] }
    };
    if (firmId) query.firmId = firmId;

    return this.find(query)
        .populate('workOrderId', 'workOrderNumber itemName')
        .populate('employee', 'personalInfo.fullNameEnglish personalInfo.fullNameArabic')
        .sort({ plannedStartTime: 1 });
};

// ============ INSTANCE METHODS ============

/**
 * Start job card
 */
jobCardSchema.methods.start = async function(employeeId = null) {
    if (this.status !== 'pending') {
        throw new Error('Job card must be in pending status to start');
    }

    this.status = 'work_in_progress';
    this.actualStartTime = new Date();

    if (employeeId) {
        this.employee = employeeId;
    }

    await this.save();
    return this;
};

/**
 * Complete job card
 */
jobCardSchema.methods.complete = async function(completedQty = null) {
    if (this.status !== 'work_in_progress') {
        throw new Error('Job card must be in progress to complete');
    }

    this.status = 'completed';
    this.actualEndTime = new Date();

    if (completedQty !== null) {
        this.completedQty = completedQty;
    } else {
        this.completedQty = this.forQty;
    }

    await this.save();
    return this;
};

/**
 * Put on hold
 */
jobCardSchema.methods.hold = async function(reason = null) {
    this.status = 'on_hold';

    if (reason) {
        this.remarks = `On hold: ${reason}`;
    }

    await this.save();
    return this;
};

/**
 * Resume from hold
 */
jobCardSchema.methods.resume = async function() {
    if (this.status !== 'on_hold') {
        throw new Error('Job card must be on hold to resume');
    }

    this.status = 'work_in_progress';
    await this.save();
    return this;
};

module.exports = mongoose.model('JobCard', jobCardSchema);
