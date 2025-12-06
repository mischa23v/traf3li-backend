const mongoose = require('mongoose');

/**
 * Leave Request Model - Leave Management
 * Implements Saudi Labor Law leave types and policies
 */

// ═══════════════════════════════════════════════════════════════
// LEAVE TYPE CONFIGURATION (Saudi Labor Law)
// ═══════════════════════════════════════════════════════════════

const LEAVE_TYPES = {
    annual: { name: 'Annual Leave', nameAr: 'إجازة سنوية', article: 'المادة 109', maxDays: 30, paid: true },
    sick: { name: 'Sick Leave', nameAr: 'إجازة مرضية', article: 'المادة 117', maxDays: 120, paid: true },
    hajj: { name: 'Hajj Leave', nameAr: 'إجازة حج', article: 'المادة 114', maxDays: 15, paid: true },
    marriage: { name: 'Marriage Leave', nameAr: 'إجازة زواج', article: 'المادة 113', maxDays: 3, paid: true },
    birth: { name: 'Birth Leave', nameAr: 'إجازة ولادة', article: 'المادة 113', maxDays: 1, paid: true },
    death: { name: 'Death Leave', nameAr: 'إجازة وفاة', article: 'المادة 113', maxDays: 3, paid: true },
    eid: { name: 'Eid Leave', nameAr: 'إجازة عيد', article: 'المادة 112', maxDays: null, paid: true },
    maternity: { name: 'Maternity Leave', nameAr: 'إجازة وضع', article: 'المادة 151', maxDays: 70, paid: true },
    paternity: { name: 'Paternity Leave', nameAr: 'إجازة أبوة', article: null, maxDays: 3, paid: true },
    exam: { name: 'Exam Leave', nameAr: 'إجازة امتحان', article: 'المادة 115', maxDays: null, paid: true },
    unpaid: { name: 'Unpaid Leave', nameAr: 'إجازة بدون راتب', article: null, maxDays: null, paid: false }
};

// ═══════════════════════════════════════════════════════════════
// SUB-SCHEMAS
// ═══════════════════════════════════════════════════════════════

const datesSchema = new mongoose.Schema({
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    totalDays: { type: Number, default: 0 },
    workingDays: { type: Number, default: 0 },
    halfDay: { type: Boolean, default: false },
    halfDayPeriod: { type: String, enum: ['first_half', 'second_half'] },
    returnDate: Date
}, { _id: false });

const workHandoverSchema = new mongoose.Schema({
    required: { type: Boolean, default: false },
    handoverTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    handoverToName: String,
    handoverNotes: String,
    handoverCompleted: { type: Boolean, default: false },
    handoverCompletedOn: Date,
    tasks: [{
        taskDescription: String,
        assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
        assignedToName: String,
        status: { type: String, enum: ['pending', 'completed'] }
    }]
}, { _id: false });

const approvalStepSchema = new mongoose.Schema({
    stepNumber: Number,
    stepName: String,
    approverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approverName: String,
    status: { type: String, enum: ['pending', 'approved', 'rejected', 'skipped'], default: 'pending' },
    actionDate: Date,
    comments: String
}, { _id: false });

const approvalWorkflowSchema = new mongoose.Schema({
    required: { type: Boolean, default: true },
    steps: [approvalStepSchema],
    currentStep: { type: Number, default: 1 },
    totalSteps: { type: Number, default: 1 }
}, { _id: false });

const balanceImpactSchema = new mongoose.Schema({
    leaveType: String,
    balanceBefore: { type: Number, default: 0 },
    daysDeducted: { type: Number, default: 0 },
    balanceAfter: { type: Number, default: 0 },
    carryForward: { type: Number, default: 0 },
    encashmentEligible: { type: Boolean, default: false }
}, { _id: false });

const payrollImpactSchema = new mongoose.Schema({
    affectsPayroll: { type: Boolean, default: false },
    deductionAmount: { type: Number, default: 0 },
    deductionDays: { type: Number, default: 0 },
    salaryPercentage: { type: Number, default: 100 },
    month: Number,
    year: Number,
    processed: { type: Boolean, default: false }
}, { _id: false });

const returnFromLeaveSchema = new mongoose.Schema({
    expectedReturnDate: Date,
    actualReturnDate: Date,
    returnConfirmed: { type: Boolean, default: false },
    confirmedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    confirmedOn: Date,
    earlyReturn: { type: Boolean, default: false },
    lateReturn: { type: Boolean, default: false },
    lateDays: { type: Number, default: 0 },
    notes: String
}, { _id: false });

const conflictSchema = new mongoose.Schema({
    hasConflicts: { type: Boolean, default: false },
    conflicts: [{
        conflictType: { type: String, enum: ['overlap', 'team_minimum', 'blackout', 'approval_pending'] },
        description: String,
        conflictWith: { type: mongoose.Schema.Types.ObjectId, ref: 'LeaveRequest' },
        conflictEmployeeName: String,
        severity: { type: String, enum: ['warning', 'error'] }
    }]
}, { _id: false });

const cancellationSchema = new mongoose.Schema({
    cancelled: { type: Boolean, default: false },
    cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    cancelledByName: String,
    cancelledOn: Date,
    reason: String,
    balanceRestored: { type: Boolean, default: false }
}, { _id: false });

const documentSchema = new mongoose.Schema({
    documentType: { type: String, enum: ['medical_certificate', 'hajj_permit', 'marriage_certificate', 'death_certificate', 'birth_certificate', 'other'] },
    documentName: String,
    fileUrl: String,
    uploadedOn: { type: Date, default: Date.now },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    verified: { type: Boolean, default: false },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    verifiedOn: Date
}, { _id: false });

const notesSchema = new mongoose.Schema({
    employeeNotes: String,
    approverNotes: String,
    hrNotes: String,
    internalNotes: String
}, { _id: false });

const statisticsSchema = new mongoose.Schema({
    totalLeaveDays: { type: Number, default: 0 },
    paidDays: { type: Number, default: 0 },
    unpaidDays: { type: Number, default: 0 },
    extensionDays: { type: Number, default: 0 }
}, { _id: false });

const leaveDetailsSchema = new mongoose.Schema({
    // For sick leave
    medicalDiagnosis: String,
    hospitalName: String,
    doctorName: String,

    // For hajj leave
    hajjYear: Number,
    hajjType: { type: String, enum: ['first_time', 'repeat'] },

    // For death leave
    deceasedRelationship: String,
    deceasedName: String,

    // For maternity
    expectedDeliveryDate: Date,
    actualDeliveryDate: Date,
    prenatalDays: Number,
    postnatalDays: Number,

    // For exam leave
    examType: String,
    institutionName: String,
    examDates: [Date]
}, { _id: false });

// ═══════════════════════════════════════════════════════════════
// MAIN SCHEMA
// ═══════════════════════════════════════════════════════════════

const leaveRequestSchema = new mongoose.Schema({
    // Identification
    requestId: { type: String, unique: true, sparse: true },
    requestNumber: { type: String, unique: true, sparse: true },

    // Employee Reference
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    employeeNumber: String,
    employeeName: String,
    employeeNameAr: String,
    nationalId: String,
    department: String,
    jobTitle: String,

    // Leave Type
    leaveType: {
        type: String,
        enum: ['annual', 'sick', 'hajj', 'marriage', 'birth', 'death', 'eid', 'maternity', 'paternity', 'exam', 'unpaid'],
        required: true
    },
    leaveTypeName: String,
    leaveTypeNameAr: String,

    // Dates
    dates: datesSchema,

    // Reason
    reason: String,
    reasonAr: String,

    // Status
    status: {
        type: String,
        enum: ['draft', 'submitted', 'pending_approval', 'approved', 'rejected', 'cancelled', 'completed'],
        default: 'draft'
    },
    requestedOn: { type: Date, default: Date.now },
    submittedOn: Date,

    // Approval
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approverName: String,
    approvedOn: Date,
    approvalComments: String,
    rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rejectorName: String,
    rejectedOn: Date,
    rejectionReason: String,

    // Balance
    balanceBefore: { type: Number, default: 0 },
    balanceAfter: { type: Number, default: 0 },

    // Extended details
    leaveDetails: leaveDetailsSchema,
    workHandover: workHandoverSchema,
    approvalWorkflow: approvalWorkflowSchema,
    balanceImpact: balanceImpactSchema,
    payrollImpact: payrollImpactSchema,
    returnFromLeave: returnFromLeaveSchema,
    conflicts: conflictSchema,
    cancellation: cancellationSchema,
    documents: [documentSchema],
    notes: notesSchema,
    statistics: statisticsSchema,

    // Extension
    isExtension: { type: Boolean, default: false },
    originalRequestId: { type: mongoose.Schema.Types.ObjectId, ref: 'LeaveRequest' },
    extensionDays: { type: Number, default: 0 },

    // Multi-tenancy
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        index: true
    },
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    createdBy: {
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

leaveRequestSchema.index({ employeeId: 1, 'dates.startDate': 1, 'dates.endDate': 1 });
leaveRequestSchema.index({ firmId: 1, status: 1 });
leaveRequestSchema.index({ lawyerId: 1, status: 1 });
leaveRequestSchema.index({ leaveType: 1, status: 1 });
leaveRequestSchema.index({ 'dates.startDate': 1, 'dates.endDate': 1 });

// ═══════════════════════════════════════════════════════════════
// PRE-SAVE HOOKS
// ═══════════════════════════════════════════════════════════════

leaveRequestSchema.pre('save', async function (next) {
    // Generate request IDs
    if (!this.requestId) {
        const year = new Date().getFullYear();
        const count = await this.constructor.countDocuments({
            createdAt: {
                $gte: new Date(year, 0, 1),
                $lt: new Date(year + 1, 0, 1)
            },
            $or: [{ firmId: this.firmId }, { lawyerId: this.lawyerId }]
        });
        this.requestId = `LR-${year}-${String(count + 1).padStart(4, '0')}`;
    }

    if (!this.requestNumber) {
        const count = await this.constructor.countDocuments({
            $or: [{ firmId: this.firmId }, { lawyerId: this.lawyerId }]
        });
        this.requestNumber = `LEAVE-${String(count + 1).padStart(5, '0')}`;
    }

    // Set leave type names
    if (this.leaveType && LEAVE_TYPES[this.leaveType]) {
        this.leaveTypeName = LEAVE_TYPES[this.leaveType].name;
        this.leaveTypeNameAr = LEAVE_TYPES[this.leaveType].nameAr;
    }

    // Calculate days
    if (this.dates?.startDate && this.dates?.endDate) {
        const start = new Date(this.dates.startDate);
        const end = new Date(this.dates.endDate);
        const diffTime = Math.abs(end - start);
        this.dates.totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

        // Calculate working days (excluding Fridays and Saturdays)
        let workingDays = 0;
        const current = new Date(start);
        while (current <= end) {
            const dayOfWeek = current.getDay();
            if (dayOfWeek !== 5 && dayOfWeek !== 6) { // Not Friday or Saturday
                workingDays++;
            }
            current.setDate(current.getDate() + 1);
        }
        this.dates.workingDays = this.dates.halfDay ? 0.5 : workingDays;

        // Set expected return date
        if (!this.returnFromLeave?.expectedReturnDate) {
            const returnDate = new Date(end);
            returnDate.setDate(returnDate.getDate() + 1);
            // Skip weekends
            while (returnDate.getDay() === 5 || returnDate.getDay() === 6) {
                returnDate.setDate(returnDate.getDate() + 1);
            }
            if (!this.returnFromLeave) this.returnFromLeave = {};
            this.returnFromLeave.expectedReturnDate = returnDate;
        }
    }

    next();
});

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

// Get leave balance for an employee
leaveRequestSchema.statics.getBalance = async function (employeeId, firmId, lawyerId) {
    const baseQuery = firmId ? { firmId } : { lawyerId };

    const currentYear = new Date().getFullYear();
    const yearStart = new Date(currentYear, 0, 1);
    const yearEnd = new Date(currentYear, 11, 31);

    // Get approved leaves for current year
    const approvedLeaves = await this.aggregate([
        {
            $match: {
                ...baseQuery,
                employeeId: new mongoose.Types.ObjectId(employeeId),
                status: { $in: ['approved', 'completed'] },
                'dates.startDate': { $gte: yearStart, $lte: yearEnd }
            }
        },
        {
            $group: {
                _id: '$leaveType',
                totalDays: { $sum: '$dates.workingDays' },
                count: { $sum: 1 }
            }
        }
    ]);

    // Build balance object
    const balance = {};
    Object.keys(LEAVE_TYPES).forEach(type => {
        const used = approvedLeaves.find(l => l._id === type);
        balance[type] = {
            type,
            name: LEAVE_TYPES[type].name,
            nameAr: LEAVE_TYPES[type].nameAr,
            entitled: LEAVE_TYPES[type].maxDays || 0,
            used: used?.totalDays || 0,
            remaining: (LEAVE_TYPES[type].maxDays || 0) - (used?.totalDays || 0),
            requests: used?.count || 0
        };
    });

    return balance;
};

// Get leave statistics
leaveRequestSchema.statics.getStats = async function (firmId, lawyerId, month, year) {
    const baseQuery = firmId ? { firmId } : { lawyerId };

    const query = { ...baseQuery };
    if (month && year) {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);
        query['dates.startDate'] = { $gte: startDate, $lte: endDate };
    } else if (year) {
        const startDate = new Date(year, 0, 1);
        const endDate = new Date(year, 11, 31);
        query['dates.startDate'] = { $gte: startDate, $lte: endDate };
    }

    const [stats] = await this.aggregate([
        { $match: query },
        {
            $group: {
                _id: null,
                totalRequests: { $sum: 1 },
                pendingRequests: { $sum: { $cond: [{ $in: ['$status', ['submitted', 'pending_approval']] }, 1, 0] } },
                approvedRequests: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } },
                rejectedRequests: { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } },
                totalDays: { $sum: '$dates.workingDays' }
            }
        }
    ]);

    // By leave type
    const byType = await this.aggregate([
        { $match: { ...query, status: { $in: ['approved', 'completed'] } } },
        {
            $group: {
                _id: '$leaveType',
                count: { $sum: 1 },
                totalDays: { $sum: '$dates.workingDays' }
            }
        }
    ]);

    return {
        totalRequests: stats?.totalRequests || 0,
        pendingRequests: stats?.pendingRequests || 0,
        approvedRequests: stats?.approvedRequests || 0,
        rejectedRequests: stats?.rejectedRequests || 0,
        totalDays: stats?.totalDays || 0,
        byType: byType.map(t => ({
            type: t._id,
            name: LEAVE_TYPES[t._id]?.name,
            nameAr: LEAVE_TYPES[t._id]?.nameAr,
            count: t.count,
            totalDays: t.totalDays
        }))
    };
};

// Check for conflicts
leaveRequestSchema.statics.checkConflicts = async function (employeeId, startDate, endDate, excludeRequestId, firmId, lawyerId) {
    const baseQuery = firmId ? { firmId } : { lawyerId };

    const conflicts = [];

    // Check for overlapping leaves for the same employee
    const overlappingQuery = {
        ...baseQuery,
        employeeId: new mongoose.Types.ObjectId(employeeId),
        status: { $in: ['submitted', 'pending_approval', 'approved'] },
        $or: [
            { 'dates.startDate': { $lte: endDate }, 'dates.endDate': { $gte: startDate } }
        ]
    };

    if (excludeRequestId) {
        overlappingQuery._id = { $ne: new mongoose.Types.ObjectId(excludeRequestId) };
    }

    const overlapping = await this.find(overlappingQuery);

    overlapping.forEach(leave => {
        conflicts.push({
            conflictType: 'overlap',
            description: `Overlaps with existing ${leave.leaveTypeName} request`,
            conflictWith: leave._id,
            conflictEmployeeName: leave.employeeName,
            severity: 'error'
        });
    });

    return {
        hasConflicts: conflicts.length > 0,
        conflicts
    };
};

// Export LEAVE_TYPES for use in controllers
leaveRequestSchema.statics.LEAVE_TYPES = LEAVE_TYPES;

module.exports = mongoose.model('LeaveRequest', leaveRequestSchema);
