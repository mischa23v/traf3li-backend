const mongoose = require('mongoose');

/**
 * Payroll Run Model - Batch Payroll Processing
 * Manages payroll cycles for all employees
 */

// ═══════════════════════════════════════════════════════════════
// SUB-SCHEMAS
// ═══════════════════════════════════════════════════════════════

const excludedEmployeeSchema = new mongoose.Schema({
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    employeeName: String,
    exclusionReason: String,
    excludedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    excludedOn: Date
}, { _id: false });

const employeeEarningsSchema = new mongoose.Schema({
    basicSalary: { type: Number, default: 0 },
    allowances: { type: Number, default: 0 },
    overtime: { type: Number, default: 0 },
    bonus: { type: Number, default: 0 },
    commission: { type: Number, default: 0 },
    otherEarnings: { type: Number, default: 0 },
    grossPay: { type: Number, default: 0 }
}, { _id: false });

const employeeDeductionsSchema = new mongoose.Schema({
    gosi: { type: Number, default: 0 },
    loans: { type: Number, default: 0 },
    advances: { type: Number, default: 0 },
    absences: { type: Number, default: 0 },
    lateDeductions: { type: Number, default: 0 },
    violations: { type: Number, default: 0 },
    otherDeductions: { type: Number, default: 0 },
    totalDeductions: { type: Number, default: 0 }
}, { _id: false });

const employeeErrorSchema = new mongoose.Schema({
    errorCode: String,
    errorMessage: String,
    errorField: String
}, { _id: false });

const employeeWarningSchema = new mongoose.Schema({
    warningCode: String,
    warningMessage: String
}, { _id: false });

const employeeListItemSchema = new mongoose.Schema({
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: false },
    employeeNumber: String,
    employeeName: String,
    employeeNameAr: String,
    nationalId: String,
    department: String,
    location: String,
    jobTitle: String,
    slipId: { type: mongoose.Schema.Types.ObjectId, ref: 'SalarySlip' },
    slipNumber: String,
    earnings: employeeEarningsSchema,
    deductions: employeeDeductionsSchema,
    netPay: { type: Number, default: 0 },
    status: {
        type: String,
        enum: ['pending', 'calculating', 'calculated', 'approved', 'paid', 'failed', 'on_hold'],
        default: 'pending'
    },
    isNewJoiner: { type: Boolean, default: false },
    joiningDate: Date,
    isSeparation: { type: Boolean, default: false },
    separationDate: Date,
    isProrated: { type: Boolean, default: false },
    proratedDays: Number,
    proratedFactor: Number,
    onProbation: { type: Boolean, default: false },
    hasErrors: { type: Boolean, default: false },
    errorMessages: [employeeErrorSchema],
    hasWarnings: { type: Boolean, default: false },
    warnings: [employeeWarningSchema],
    onHold: { type: Boolean, default: false },
    onHoldReason: String,
    onHoldBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    onHoldDate: Date,
    paymentMethod: {
        type: String,
        enum: ['bank_transfer', 'cash', 'check'],
        default: 'bank_transfer'
    },
    bankName: String,
    iban: String,
    paymentStatus: {
        type: String,
        enum: ['pending', 'processing', 'paid', 'failed']
    },
    paymentReference: String,
    paidOn: Date,
    failureReason: String,
    wpsIncluded: { type: Boolean, default: true },
    wpsStatus: {
        type: String,
        enum: ['pending', 'submitted', 'accepted', 'rejected']
    },
    wpsRejectionReason: String,
    calculatedOn: Date,
    calculationDuration: Number,
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedOn: Date
}, { _id: true });

const departmentBreakdownSchema = new mongoose.Schema({
    departmentId: String,
    departmentName: String,
    employeeCount: Number,
    totalBasicSalary: Number,
    totalAllowances: Number,
    totalGrossPay: Number,
    totalDeductions: Number,
    totalNetPay: Number,
    averageSalary: Number,
    averageNetPay: Number,
    percentOfTotalPayroll: Number
}, { _id: false });

const approvalStepSchema = new mongoose.Schema({
    stepNumber: Number,
    stepName: String,
    stepNameAr: String,
    approverRole: String,
    approverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approverName: String,
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'skipped'],
        default: 'pending'
    },
    actionDate: Date,
    comments: String,
    notificationSent: { type: Boolean, default: false },
    notificationDate: Date,
    remindersSent: Number,
    lastReminderDate: Date
}, { _id: false });

const validationErrorSchema = new mongoose.Schema({
    errorId: String,
    errorCode: String,
    errorType: {
        type: String,
        enum: ['critical', 'error', 'warning', 'info']
    },
    errorMessage: String,
    errorMessageAr: String,
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    employeeName: String,
    field: String,
    value: mongoose.Schema.Types.Mixed,
    expectedValue: mongoose.Schema.Types.Mixed,
    suggestion: String,
    resolution: String,
    resolved: { type: Boolean, default: false },
    resolvedDate: Date,
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { _id: false });

const processingLogSchema = new mongoose.Schema({
    logId: String,
    timestamp: { type: Date, default: Date.now },
    action: String,
    actionType: {
        type: String,
        enum: ['creation', 'calculation', 'validation', 'approval', 'payment', 'notification', 'error', 'other']
    },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    performedByName: String,
    details: String,
    status: {
        type: String,
        enum: ['success', 'failure', 'warning', 'info']
    },
    errorMessage: String,
    duration: Number,
    affectedEmployees: Number,
    affectedAmount: Number
}, { _id: false });

const wpsRejectedEmployeeSchema = new mongoose.Schema({
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    employeeName: String,
    nationalId: String,
    rejectionReason: String,
    rejectionCode: String,
    resolved: { type: Boolean, default: false },
    resolutionDate: Date,
    resolutionNotes: String
}, { _id: false });

const failedPaymentSchema = new mongoose.Schema({
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    employeeName: String,
    amount: Number,
    iban: String,
    failureReason: String,
    failureCode: String,
    retried: { type: Boolean, default: false },
    retryCount: Number,
    lastRetryDate: Date,
    resolved: { type: Boolean, default: false },
    resolutionMethod: String
}, { _id: false });

// ═══════════════════════════════════════════════════════════════
// MAIN SCHEMA
// ═══════════════════════════════════════════════════════════════

const payrollRunSchema = new mongoose.Schema({
    // Identification
    runId: { type: String, unique: true, sparse: true },
    runNumber: String,
    runName: { type: String, required: false },
    runNameAr: String,

    // Period
    payPeriod: {
        month: { type: Number, required: false, min: 1, max: 12 },
        year: { type: Number, required: false },
        calendarType: { type: String, enum: ['hijri', 'gregorian'], default: 'gregorian' },
        periodStart: { type: Date, required: false },
        periodEnd: { type: Date, required: false },
        paymentDate: { type: Date, required: false },
        cutoffDate: Date
    },

    // Employee Summary
    employees: {
        totalEmployees: { type: Number, default: 0 },
        processedEmployees: { type: Number, default: 0 },
        pendingEmployees: { type: Number, default: 0 },
        failedEmployees: { type: Number, default: 0 },
        onHoldEmployees: { type: Number, default: 0 }
    },

    // Financial Summary
    financialSummary: {
        totalBasicSalary: { type: Number, default: 0 },
        totalAllowances: { type: Number, default: 0 },
        totalGrossPay: { type: Number, default: 0 },
        totalGOSI: { type: Number, default: 0 },
        totalDeductions: { type: Number, default: 0 },
        totalNetPay: { type: Number, default: 0 },
        totalEmployerGOSI: { type: Number, default: 0 }
    },

    // Status
    status: {
        type: String,
        enum: ['draft', 'calculating', 'calculated', 'approved', 'processing_payment', 'paid', 'cancelled'],
        default: 'draft'
    },

    // Configuration
    configuration: {
        calendarType: { type: String, enum: ['hijri', 'gregorian'], default: 'gregorian' },
        fiscalYear: Number,
        includedEmployeeTypes: [{
            type: String,
            enum: ['full_time', 'part_time', 'contract', 'temporary']
        }],
        includedDepartments: [String],
        includedLocations: [String],
        includedEmploymentStatuses: [{
            type: String,
            enum: ['active', 'on_leave', 'suspended']
        }],
        excludedEmployees: [excludedEmployeeSchema],
        processNewJoiners: { type: Boolean, default: true },
        processSeparations: { type: Boolean, default: true },
        processSuspensions: { type: Boolean, default: false },
        prorateSalaries: { type: Boolean, default: true },
        prorateMethod: { type: String, enum: ['calendar_days', 'working_days'], default: 'calendar_days' },
        includeOvertime: { type: Boolean, default: true },
        overtimeCalculationMethod: { type: String, enum: ['actual', 'approved'], default: 'approved' },
        overtimeApprovalRequired: { type: Boolean, default: true },
        includeBonuses: { type: Boolean, default: true },
        includeCommissions: { type: Boolean, default: true },
        includeIncentives: { type: Boolean, default: true },
        processLoans: { type: Boolean, default: true },
        processAdvances: { type: Boolean, default: true },
        processViolations: { type: Boolean, default: true },
        attendanceBasedDeductions: { type: Boolean, default: true },
        lateDeductions: { type: Boolean, default: true },
        absenceDeductions: { type: Boolean, default: true },
        calculateGOSI: { type: Boolean, default: true },
        gosiRate: { type: Number, default: 9.75 },
        roundingMethod: { type: String, enum: ['none', 'nearest', 'up', 'down'], default: 'nearest' },
        roundingPrecision: { type: Number, default: 2 }
    },

    // Employee List
    employeeList: [employeeListItemSchema],

    // Financial Breakdown
    financialBreakdown: {
        earnings: {
            totalBasicSalary: Number,
            allowancesBreakdown: {
                housingAllowance: { type: Number, default: 0 },
                transportationAllowance: { type: Number, default: 0 },
                foodAllowance: { type: Number, default: 0 },
                mobileAllowance: { type: Number, default: 0 },
                otherAllowances: { type: Number, default: 0 },
                totalAllowances: { type: Number, default: 0 }
            },
            variablePayBreakdown: {
                totalOvertime: { type: Number, default: 0 },
                overtimeHours: { type: Number, default: 0 },
                averageOvertimeRate: { type: Number, default: 0 },
                totalBonus: { type: Number, default: 0 },
                bonusRecipients: { type: Number, default: 0 },
                totalCommission: { type: Number, default: 0 },
                commissionRecipients: { type: Number, default: 0 },
                totalIncentives: { type: Number, default: 0 },
                totalVariablePay: { type: Number, default: 0 }
            },
            adjustments: {
                arrears: { type: Number, default: 0 },
                retroactivePay: { type: Number, default: 0 },
                reimbursements: { type: Number, default: 0 },
                otherAdditions: { type: Number, default: 0 },
                totalAdjustments: { type: Number, default: 0 }
            },
            grossPay: Number
        },
        deductions: {
            statutory: {
                totalEmployeeGOSI: { type: Number, default: 0 },
                totalEmployerGOSI: { type: Number, default: 0 },
                totalGOSI: { type: Number, default: 0 },
                gosiBreakdown: {
                    saudiEmployees: { type: Number, default: 0 },
                    saudiEmployeeContribution: { type: Number, default: 0 },
                    saudiEmployerContribution: { type: Number, default: 0 },
                    nonSaudiEmployees: { type: Number, default: 0 },
                    nonSaudiEmployerContribution: { type: Number, default: 0 }
                },
                totalStatutory: { type: Number, default: 0 }
            },
            loans: {
                totalLoanRepayments: { type: Number, default: 0 },
                numberOfLoans: { type: Number, default: 0 },
                employeesWithLoans: { type: Number, default: 0 }
            },
            advances: {
                totalAdvanceRecoveries: { type: Number, default: 0 },
                numberOfAdvances: { type: Number, default: 0 },
                employeesWithAdvances: { type: Number, default: 0 }
            },
            attendance: {
                totalAbsenceDeductions: { type: Number, default: 0 },
                totalLateDeductions: { type: Number, default: 0 },
                totalAttendanceDeductions: { type: Number, default: 0 },
                employeesWithAbsenceDeductions: { type: Number, default: 0 },
                employeesWithLateDeductions: { type: Number, default: 0 },
                totalAbsentDays: { type: Number, default: 0 },
                totalLateMinutes: { type: Number, default: 0 }
            },
            violations: {
                totalViolationDeductions: { type: Number, default: 0 },
                numberOfViolations: { type: Number, default: 0 },
                employeesWithViolations: { type: Number, default: 0 }
            },
            other: {
                totalOtherDeductions: { type: Number, default: 0 }
            },
            totalDeductions: Number
        },
        netPay: Number,
        costToCompany: {
            totalSalaries: { type: Number, default: 0 },
            totalEmployerGOSI: { type: Number, default: 0 },
            totalBenefits: { type: Number, default: 0 },
            otherCosts: { type: Number, default: 0 },
            totalCost: { type: Number, default: 0 },
            averageCostPerEmployee: { type: Number, default: 0 }
        }
    },

    // Breakdowns by Category
    breakdowns: {
        byDepartment: [departmentBreakdownSchema],
        byEmployeeType: [{
            employeeType: String,
            employeeCount: Number,
            totalGrossPay: Number,
            totalNetPay: Number,
            averageGrossPay: Number,
            averageNetPay: Number
        }],
        byPaymentMethod: [{
            paymentMethod: String,
            employeeCount: Number,
            totalAmount: Number,
            percentOfTotal: Number
        }]
    },

    // WPS
    wps: {
        required: { type: Boolean, default: true },
        sifFile: {
            generated: { type: Boolean, default: false },
            generatedDate: Date,
            generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            fileName: String,
            fileUrl: String,
            fileSize: Number,
            recordCount: Number,
            totalAmount: Number,
            fileFormat: { type: String, default: 'MOL_SIF' },
            fileVersion: String
        },
        submission: {
            submitted: { type: Boolean, default: false },
            submissionDate: Date,
            submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            submissionMethod: { type: String, enum: ['mol_portal', 'bank_portal', 'api'] },
            submissionReference: String,
            batchNumber: String,
            status: {
                type: String,
                enum: ['pending', 'accepted', 'rejected', 'partially_accepted'],
                default: 'pending'
            },
            statusDate: Date,
            statusMessage: String,
            acceptedCount: Number,
            rejectedCount: Number,
            rejectedEmployees: [wpsRejectedEmployeeSchema]
        },
        molDetails: {
            establishmentId: String,
            establishmentNameAr: String,
            laborOfficeId: String,
            sequenceNumber: Number
        }
    },

    // Payment Processing
    paymentProcessing: {
        bankTransfer: {
            employeeCount: { type: Number, default: 0 },
            totalAmount: { type: Number, default: 0 },
            batchFile: {
                generated: Boolean,
                generatedDate: Date,
                fileName: String,
                fileUrl: String,
                fileFormat: String
            },
            processed: { type: Boolean, default: false },
            processedDate: Date,
            processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            successCount: Number,
            failedCount: Number,
            pendingCount: Number,
            failedPayments: [failedPaymentSchema]
        },
        cash: {
            employeeCount: { type: Number, default: 0 },
            totalAmount: { type: Number, default: 0 },
            cashList: {
                generated: Boolean,
                fileUrl: String
            },
            disbursed: { type: Boolean, default: false },
            disbursedDate: Date,
            disbursedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
        },
        check: {
            employeeCount: { type: Number, default: 0 },
            totalAmount: { type: Number, default: 0 },
            checksIssued: { type: Boolean, default: false },
            issueDate: Date,
            issuedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            checkNumbers: [String],
            checkStartNumber: String,
            checkEndNumber: String,
            checksDistributed: Number,
            checksCollected: Number,
            checksPending: Number
        },
        paymentStatus: {
            type: String,
            enum: ['not_started', 'processing', 'completed', 'partially_completed'],
            default: 'not_started'
        },
        paidEmployees: { type: Number, default: 0 },
        pendingPayments: { type: Number, default: 0 },
        failedPayments: { type: Number, default: 0 },
        totalPaid: { type: Number, default: 0 },
        totalPending: { type: Number, default: 0 },
        totalFailed: { type: Number, default: 0 },
        paymentCompletionPercentage: { type: Number, default: 0 }
    },

    // Approval Workflow
    approvalWorkflow: {
        required: { type: Boolean, default: true },
        steps: [approvalStepSchema],
        currentStep: { type: Number, default: 1 },
        totalSteps: Number,
        finalStatus: {
            type: String,
            enum: ['pending', 'approved', 'rejected'],
            default: 'pending'
        },
        finalApprover: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        finalApprovalDate: Date,
        rejectionReason: String,
        rejectionStep: Number,
        escalated: { type: Boolean, default: false },
        escalationDate: Date,
        escalatedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        escalationReason: String
    },

    // Validation
    validation: {
        validated: { type: Boolean, default: false },
        validationDate: Date,
        validatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        errorMessages: [validationErrorSchema],
        criticalErrorCount: { type: Number, default: 0 },
        errorCount: { type: Number, default: 0 },
        warningCount: { type: Number, default: 0 },
        infoCount: { type: Number, default: 0 },
        hasBlockingErrors: { type: Boolean, default: false },
        canProceed: { type: Boolean, default: true },
        preRunValidation: {
            allEmployeesHaveBank: Boolean,
            allSalariesPositive: Boolean,
            noNegativeDeductions: Boolean,
            gosiCalculationCorrect: Boolean,
            totalBalanced: Boolean
        }
    },

    // Comparison with Previous Run
    comparison: {
        previousRunId: { type: mongoose.Schema.Types.ObjectId, ref: 'PayrollRun' },
        previousRunName: String,
        previousRunDate: Date,
        employeeCountChange: Number,
        employeeCountChangePercentage: Number,
        newEmployees: Number,
        separatedEmployees: Number,
        grossPayChange: Number,
        grossPayChangePercentage: Number,
        netPayChange: Number,
        netPayChangePercentage: Number,
        deductionsChange: Number,
        deductionsChangePercentage: Number,
        significantChanges: [{
            employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
            employeeName: String,
            changeType: String,
            changeAmount: Number,
            changePercentage: Number,
            reason: String,
            previousAmount: Number,
            currentAmount: Number
        }]
    },

    // Notes
    notes: {
        internalNotes: String,
        approverNotes: String,
        employeeMessage: String,
        employeeMessageAr: String,
        importantNotices: [{
            noticeType: {
                type: String,
                enum: ['deduction', 'bonus', 'policy_change', 'holiday', 'other']
            },
            noticeText: String,
            noticeTextAr: String
        }]
    },

    // Processing Log
    processingLog: [processingLogSchema],

    // Statistics
    statistics: {
        totalProcessingTime: Number,
        averageTimePerEmployee: Number,
        calculationsPerformed: Number,
        recalculations: Number,
        employeesByStatus: {
            active: Number,
            onLeave: Number,
            suspended: Number
        },
        employeesByNationality: {
            saudi: Number,
            nonSaudi: Number
        },
        employeesByGender: {
            male: Number,
            female: Number
        },
        highestSalary: Number,
        lowestSalary: Number,
        averageSalary: Number,
        medianSalary: Number,
        highestDeduction: Number,
        averageDeduction: Number,
        totalAbsentDays: Number,
        totalLateDays: Number,
        totalOvertimeHours: Number,
        totalViolations: Number,
        totalViolationDeductions: Number
    },

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
        ref: 'User',
        required: false
    },
    lastModifiedBy: {
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

payrollRunSchema.index({ firmId: 1, 'payPeriod.year': 1, 'payPeriod.month': 1 });
payrollRunSchema.index({ lawyerId: 1, 'payPeriod.year': 1, 'payPeriod.month': 1 });
payrollRunSchema.index({ status: 1 });
payrollRunSchema.index({ 'payPeriod.year': 1, 'payPeriod.month': 1 });

// ═══════════════════════════════════════════════════════════════
// PRE-SAVE HOOKS
// ═══════════════════════════════════════════════════════════════

payrollRunSchema.pre('save', async function (next) {
    if (!this.runId) {
        const year = this.payPeriod.year;
        const count = await this.constructor.countDocuments({
            'payPeriod.year': year,
            $or: [{ firmId: this.firmId }, { lawyerId: this.lawyerId }]
        });
        this.runId = `RUN-${year}-${String(count + 1).padStart(3, '0')}`;
    }
    next();
});

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

payrollRunSchema.statics.getStats = async function (firmId, lawyerId) {
    const baseQuery = {};
    if (firmId) {
        baseQuery.firmId = firmId;
    } else if (lawyerId) {
        baseQuery.lawyerId = lawyerId;
    }
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const [totalRuns, draftRuns, pendingApproval, paidThisMonth] = await Promise.all([
        this.countDocuments(baseQuery),
        this.countDocuments({ ...baseQuery, status: 'draft' }),
        this.countDocuments({ ...baseQuery, status: 'calculated' }),
        this.aggregate([
            {
                $match: {
                    ...baseQuery,
                    status: 'paid',
                    'payPeriod.month': currentMonth,
                    'payPeriod.year': currentYear
                }
            },
            { $group: { _id: null, total: { $sum: '$financialSummary.totalNetPay' }, count: { $sum: 1 } } }
        ])
    ]);

    return {
        totalRuns,
        draftRuns,
        pendingApproval,
        completedThisMonth: paidThisMonth[0]?.count || 0,
        totalPaidThisMonth: paidThisMonth[0]?.total || 0
    };
};

module.exports = mongoose.model('PayrollRun', payrollRunSchema);
