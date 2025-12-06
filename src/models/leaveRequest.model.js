const mongoose = require('mongoose');
const Schema = mongoose.Schema;

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

// Medical Certificate Sub-Schema
const medicalCertificateSchema = new Schema({
    required: { type: Boolean, default: false },
    provided: { type: Boolean, default: false },
    certificateUrl: String,
    issuingDoctor: String,
    doctorLicenseNumber: String,
    issuingClinic: String,
    clinicLicenseNumber: String,
    issueDate: Date,
    certificateNumber: String,
    diagnosis: String,
    diagnosisCode: String,
    recommendedRestPeriod: Number,
    restrictions: String,
    verified: { type: Boolean, default: false },
    verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    verificationDate: Date
}, { _id: false });

// Work Handover Task Sub-Schema
const handoverTaskSchema = new Schema({
    taskId: String,
    taskName: { type: String, required: true },
    taskDescription: String,
    priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
    dueDate: Date,
    status: { type: String, enum: ['pending', 'in_progress', 'completed'], default: 'pending' },
    handedOver: { type: Boolean, default: false },
    handoverDate: Date,
    instructions: String
}, { _id: false });

// Work Handover Sub-Schema
const workHandoverSchema = new Schema({
    required: { type: Boolean, default: false },
    delegateTo: {
        employeeId: { type: Schema.Types.ObjectId, ref: 'Employee' },
        employeeName: String,
        jobTitle: String,
        department: String,
        notified: { type: Boolean, default: false },
        notificationDate: Date,
        accepted: { type: Boolean, default: false },
        acceptanceDate: Date,
        rejectionReason: String
    },
    tasks: [handoverTaskSchema],
    handoverCompleted: { type: Boolean, default: false },
    handoverCompletionDate: Date,
    handoverApprovedByManager: { type: Boolean, default: false }
}, { _id: false });

// Approval Step Sub-Schema
const approvalStepSchema = new Schema({
    stepNumber: Number,
    stepName: String,
    stepNameAr: String,
    approverRole: String,
    approverId: { type: Schema.Types.ObjectId, ref: 'User' },
    approverName: String,
    status: { type: String, enum: ['pending', 'approved', 'rejected', 'skipped'], default: 'pending' },
    actionDate: Date,
    comments: String,
    notificationSent: { type: Boolean, default: false },
    notificationDate: Date,
    remindersSent: { type: Number, default: 0 },
    autoApproved: { type: Boolean, default: false },
    autoApprovalReason: String
}, { _id: false });

// Approval Workflow Sub-Schema
const approvalWorkflowSchema = new Schema({
    required: { type: Boolean, default: true },
    steps: [approvalStepSchema],
    currentStep: { type: Number, default: 1 },
    totalSteps: Number,
    finalStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    escalated: { type: Boolean, default: false },
    escalationDate: Date,
    escalatedTo: { type: Schema.Types.ObjectId, ref: 'User' }
}, { _id: false });

// Leave Document Sub-Schema
const leaveDocumentSchema = new Schema({
    documentType: {
        type: String,
        enum: ['medical_certificate', 'marriage_certificate', 'birth_certificate',
            'death_certificate', 'hajj_permit', 'exam_proof',
            'handover_document', 'approval_letter', 'extension_request',
            'medical_clearance', 'other']
    },
    documentName: String,
    documentNameAr: String,
    fileName: String,
    fileUrl: String,
    fileSize: Number,
    fileType: String,
    uploadedOn: { type: Date, default: Date.now },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    required: { type: Boolean, default: false },
    verified: { type: Boolean, default: false },
    verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    verificationDate: Date,
    expiryDate: Date
}, { _id: false });

// Dates Sub-Schema
const datesSchema = new Schema({
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    totalDays: { type: Number, required: true },
    workingDays: Number,
    halfDay: { type: Boolean, default: false },
    halfDayPeriod: { type: String, enum: ['first_half', 'second_half'] },
    returnDate: Date
}, { _id: false });

// Leave Details Sub-Schema (Type-Specific)
const leaveDetailsSchema = new Schema({
    leaveCategory: { type: String, enum: ['paid', 'unpaid', 'partial_pay'] },
    payPercentage: { type: Number, default: 100 },
    isEmergency: { type: Boolean, default: false },
    emergencyReason: String,
    emergencyVerified: Boolean,

    legalEntitlement: {
        entitled: Boolean,
        entitlementArticle: String,
        maximumDays: Number,
        conditions: [String],
        requiresDocumentation: Boolean
    },

    contactDuringLeave: {
        available: { type: Boolean, default: true },
        contactNumber: String,
        alternateNumber: String,
        email: String,
        emergencyContact: {
            name: String,
            relationship: String,
            phone: String
        }
    },

    // Annual Leave Specific
    annualLeave: {
        entitlement: Number,
        serviceYears: Number,
        balanceBefore: Number,
        balanceAfter: Number,
        carriedForward: Number,
        isSplitLeave: Boolean
    },

    // Sick Leave Specific
    sickLeave: {
        sickLeaveType: { type: String, enum: ['full_pay', 'partial_pay', 'unpaid'] },
        payPercentage: Number,
        ytdFullPayDaysUsed: Number,
        ytdPartialPayDaysUsed: Number,
        ytdUnpaidDaysUsed: Number,
        ytdTotalUsed: Number,
        ytdRemaining: Number,
        medicalCertificate: medicalCertificateSchema,
        hospitalized: Boolean,
        hospitalName: String,
        medicalClearanceRequired: Boolean
    },

    // Hajj Leave Specific
    hajjLeave: {
        eligibility: {
            serviceYears: Number,
            eligible: Boolean,
            previouslyTaken: Boolean
        },
        hajjDuration: Number,
        hajjPermit: {
            required: Boolean,
            provided: Boolean,
            permitNumber: String,
            permitUrl: String,
            verified: Boolean
        }
    },

    // Maternity Leave Specific
    maternityLeave: {
        totalDuration: Number,
        preBirthLeave: Number,
        postBirthLeave: Number,
        expectedDeliveryDate: Date,
        actualDeliveryDate: Date,
        payPercentage: Number,
        serviceYears: Number,
        birthCertificate: {
            required: Boolean,
            provided: Boolean,
            certificateUrl: String
        },
        nursingBreaksEligible: Boolean
    },

    // Marriage Leave Specific
    marriageLeave: {
        duration: Number,
        marriageDate: Date,
        marriageCertificate: {
            required: Boolean,
            provided: Boolean,
            certificateUrl: String
        },
        previouslyUsed: Boolean
    },

    // Death Leave Specific
    deathLeave: {
        duration: Number,
        relationship: { type: String, enum: ['spouse', 'parent', 'child', 'sibling', 'grandparent', 'other'] },
        deceasedName: String,
        dateOfDeath: Date,
        deathCertificate: {
            required: Boolean,
            provided: Boolean,
            certificateUrl: String
        }
    },

    // Exam Leave Specific
    examLeave: {
        examType: String,
        institution: String,
        examDate: Date,
        paid: Boolean,
        attemptNumber: Number,
        examProof: {
            required: Boolean,
            provided: Boolean,
            documentUrl: String
        }
    },

    // Unpaid Leave Specific
    unpaidLeave: {
        reason: String,
        reasonCategory: { type: String, enum: ['personal', 'family', 'health', 'education', 'other'] },
        detailedReason: String,
        impactOnBenefits: {
            affectsSalary: { type: Boolean, default: true },
            affectsGOSI: { type: Boolean, default: true },
            affectsSeniority: { type: Boolean, default: true },
            affectsAnnualLeave: { type: Boolean, default: true },
            affectsEOSB: { type: Boolean, default: true }
        }
    }
}, { _id: false });

// Balance Impact Sub-Schema
const balanceImpactSchema = new Schema({
    balanceBefore: {
        annualLeave: Number,
        sickLeave: Number,
        hajjLeave: Boolean
    },
    deducted: {
        annualLeave: Number,
        sickLeave: Number,
        unpaidLeave: Number
    },
    balanceAfter: {
        annualLeave: Number,
        sickLeave: Number,
        hajjLeave: Boolean
    }
}, { _id: false });

// Payroll Impact Sub-Schema
const payrollImpactSchema = new Schema({
    affectsPayroll: { type: Boolean, default: false },
    paidDays: Number,
    paidAmount: Number,
    payPercentage: Number,
    unpaidDays: Number,
    deductionAmount: Number,
    processedInPayrollRun: { type: Schema.Types.ObjectId, ref: 'PayrollRun' },
    processedDate: Date
}, { _id: false });

// Return from Leave Sub-Schema
const returnFromLeaveSchema = new Schema({
    expectedReturnDate: Date,
    actualReturnDate: Date,
    returned: { type: Boolean, default: false },
    returnConfirmedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    returnConfirmationDate: Date,
    lateReturn: { type: Boolean, default: false },
    lateDays: Number,
    lateReason: String,
    extensionRequested: { type: Boolean, default: false },
    extensionDays: Number,
    extensionReason: String,
    extensionApproved: Boolean,
    extensionApprovedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    medicalClearanceRequired: { type: Boolean, default: false },
    medicalClearanceProvided: Boolean,
    clearanceDate: Date
}, { _id: false });

// Conflicts Sub-Schema
const conflictsSchema = new Schema({
    hasConflicts: { type: Boolean, default: false },
    overlappingLeaves: [{
        conflictType: String,
        conflictDetails: String,
        severity: { type: String, enum: ['low', 'medium', 'high', 'critical'] },
        conflictingLeaveId: { type: Schema.Types.ObjectId, ref: 'LeaveRequest' },
        conflictingEmployee: String
    }],
    teamImpact: {
        teamSize: Number,
        onLeaveCount: Number,
        availableCount: Number,
        coveragePercentage: Number,
        acceptable: Boolean
    },
    blackoutPeriod: {
        inBlackoutPeriod: Boolean,
        blackoutPeriodName: String,
        exceptionGranted: Boolean
    }
}, { _id: false });

// Cancellation Sub-Schema
const cancellationSchema = new Schema({
    cancelled: { type: Boolean, default: false },
    cancellationDate: Date,
    cancelledBy: { type: Schema.Types.ObjectId, ref: 'User' },
    cancellationReason: String,
    balanceRestored: { type: Boolean, default: false },
    restoredAmount: Number
}, { _id: false });

// Notes Sub-Schema
const notesSchema = new Schema({
    employeeNotes: String,
    managerNotes: String,
    hrNotes: String,
    internalNotes: String
}, { _id: false });

// Statistics Sub-Schema
const statisticsSchema = new Schema({
    employeeYTDStats: {
        totalLeaveDaysTaken: Number,
        totalPaidLeaveDays: Number,
        totalUnpaidLeaveDays: Number,
        annualLeaveDaysTaken: Number,
        sickLeaveDaysTaken: Number,
        leaveRequestsSubmitted: Number,
        leaveRequestsApproved: Number
    }
}, { _id: false });

// ═══════════════════════════════════════════════════════════════
// MAIN SCHEMA
// ═══════════════════════════════════════════════════════════════

const leaveRequestSchema = new Schema({
    // Identifiers
    requestId: { type: String, unique: true, sparse: true },
    requestNumber: { type: String, unique: true, sparse: true },

    // Employee Information
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    employeeNumber: String,
    employeeName: String,
    employeeNameAr: String,
    nationalId: String,
    department: String,
    jobTitle: String,

    // Leave Type (Saudi Labor Law)
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
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approverName: String,
    approvedOn: Date,
    approvalComments: String,
    rejectedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    rejectorName: String,
    rejectedOn: Date,
    rejectionReason: String,

    // Balance Impact (Simple)
    balanceBefore: Number,
    balanceAfter: Number,

    // Leave Details (Type-Specific)
    leaveDetails: leaveDetailsSchema,

    // Work Handover
    workHandover: workHandoverSchema,

    // Approval Workflow
    approvalWorkflow: approvalWorkflowSchema,

    // Balance Impact (Detailed)
    balanceImpact: balanceImpactSchema,

    // Payroll Impact
    payrollImpact: payrollImpactSchema,

    // Return from Leave
    returnFromLeave: returnFromLeaveSchema,

    // Conflicts
    conflicts: conflictsSchema,

    // Cancellation
    cancellation: cancellationSchema,

    // Documents
    documents: [leaveDocumentSchema],

    // Notes
    notes: notesSchema,

    // Statistics
    statistics: statisticsSchema,

    // Multi-tenancy
    firmId: {
        type: Schema.Types.ObjectId,
        ref: 'Firm',
        index: true
    },
    lawyerId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },

    // Audit
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    lastModifiedBy: { type: Schema.Types.ObjectId, ref: 'User' }

}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════

leaveRequestSchema.index({ employeeId: 1, status: 1 });
leaveRequestSchema.index({ leaveType: 1 });
leaveRequestSchema.index({ 'dates.startDate': 1, 'dates.endDate': 1 });
leaveRequestSchema.index({ department: 1 });
leaveRequestSchema.index({ firmId: 1, status: 1 });
leaveRequestSchema.index({ lawyerId: 1, status: 1 });

// ═══════════════════════════════════════════════════════════════
// PRE-SAVE HOOKS
// ═══════════════════════════════════════════════════════════════

leaveRequestSchema.pre('save', async function (next) {
    if (this.isNew) {
        // Generate request IDs
        const year = new Date().getFullYear();
        const count = await this.constructor.countDocuments({
            createdAt: {
                $gte: new Date(year, 0, 1),
                $lt: new Date(year + 1, 0, 1)
            },
            $or: [{ firmId: this.firmId }, { lawyerId: this.lawyerId }]
        });
        this.requestId = `LR-${year}-${String(count + 1).padStart(5, '0')}`;
        this.requestNumber = this.requestId;

        // Set leave type names
        if (this.leaveType && LEAVE_TYPES[this.leaveType]) {
            this.leaveTypeName = LEAVE_TYPES[this.leaveType].name;
            this.leaveTypeNameAr = LEAVE_TYPES[this.leaveType].nameAr;
        }
    }

    // Calculate return date (next working day after end date)
    if (this.dates?.startDate && this.dates?.endDate && !this.dates.returnDate) {
        const returnDate = new Date(this.dates.endDate);
        returnDate.setDate(returnDate.getDate() + 1);
        // Skip weekends (Friday = 5, Saturday = 6)
        while (returnDate.getDay() === 5 || returnDate.getDay() === 6) {
            returnDate.setDate(returnDate.getDate() + 1);
        }
        this.dates.returnDate = returnDate;

        // Set expected return date
        if (!this.returnFromLeave) {
            this.returnFromLeave = {};
        }
        this.returnFromLeave.expectedReturnDate = returnDate;
    }

    // Calculate working days if not set
    if (this.dates?.startDate && this.dates?.endDate && !this.dates.workingDays) {
        const start = new Date(this.dates.startDate);
        const end = new Date(this.dates.endDate);
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
    }

    next();
});

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

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

    // Count on leave today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const onLeaveToday = await this.countDocuments({
        ...baseQuery,
        status: 'approved',
        'dates.startDate': { $lte: today },
        'dates.endDate': { $gte: today }
    });

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
        onLeaveToday,
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
leaveRequestSchema.statics.checkConflicts = async function (employeeId, startDate, endDate, excludeRequestId, firmId, lawyerId, department) {
    const baseQuery = firmId ? { firmId } : { lawyerId };
    const conflicts = [];

    // Check for overlapping leaves for the same employee
    const overlappingQuery = {
        ...baseQuery,
        employeeId: new mongoose.Types.ObjectId(employeeId),
        status: { $in: ['submitted', 'pending_approval', 'approved'] },
        $or: [
            { 'dates.startDate': { $lte: endDate, $gte: startDate } },
            { 'dates.endDate': { $lte: endDate, $gte: startDate } },
            {
                'dates.startDate': { $lte: startDate },
                'dates.endDate': { $gte: endDate }
            }
        ]
    };

    if (excludeRequestId) {
        overlappingQuery._id = { $ne: new mongoose.Types.ObjectId(excludeRequestId) };
    }

    const overlapping = await this.find(overlappingQuery);

    overlapping.forEach(leave => {
        conflicts.push({
            conflictType: 'Overlapping Leave',
            conflictDetails: `You already have a ${leave.leaveTypeName} leave from ${leave.dates.startDate.toISOString().split('T')[0]} to ${leave.dates.endDate.toISOString().split('T')[0]}`,
            severity: 'high',
            conflictingLeaveId: leave._id,
            conflictingEmployee: leave.employeeName
        });
    });

    // Get team members on leave during this period
    let teamImpact = null;
    if (department) {
        const teamOnLeave = await this.find({
            ...baseQuery,
            department,
            employeeId: { $ne: new mongoose.Types.ObjectId(employeeId) },
            status: 'approved',
            'dates.startDate': { $lte: endDate },
            'dates.endDate': { $gte: startDate }
        });

        // Get team size (would need Employee model)
        const Employee = mongoose.model('Employee');
        const teamSize = await Employee.countDocuments({
            ...baseQuery,
            'organization.departmentName': department,
            'employment.employmentStatus': 'active'
        });

        const onLeaveCount = teamOnLeave.length + 1; // +1 for current request
        const coveragePercentage = teamSize > 0 ? ((teamSize - onLeaveCount) / teamSize) * 100 : 100;

        teamImpact = {
            teamSize,
            onLeaveCount,
            availableCount: teamSize - onLeaveCount,
            coveragePercentage: Math.round(coveragePercentage),
            acceptable: coveragePercentage >= 50
        };
    }

    return {
        hasConflicts: conflicts.length > 0,
        overlappingLeaves: conflicts,
        teamImpact
    };
};

// Export LEAVE_TYPES for use in controllers
leaveRequestSchema.statics.LEAVE_TYPES = LEAVE_TYPES;

module.exports = mongoose.model('LeaveRequest', leaveRequestSchema);
