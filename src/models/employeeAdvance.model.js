const mongoose = require('mongoose');

/**
 * Employee Advance Model - HR Management
 * Module 11: السلف (Employee Advances)
 * Islamic Finance Compliant (Interest-free)
 * Key Differences from Loans: Shorter term (1-6 months), smaller amounts (50% salary), faster processing
 */

// ═══════════════════════════════════════════════════════════════
// SUB-SCHEMAS
// ═══════════════════════════════════════════════════════════════

// Repayment installment schema
const repaymentInstallmentSchema = new mongoose.Schema({
    installmentNumber: { type: Number, required: false },
    dueDate: { type: Date, required: false },
    installmentAmount: { type: Number, required: false },
    status: {
        type: String,
        enum: ['pending', 'paid', 'partial', 'missed', 'waived'],
        default: 'pending'
    },
    paidAmount: { type: Number, default: 0 },
    paidDate: Date,
    paymentMethod: {
        type: String,
        enum: ['payroll_deduction', 'bank_transfer', 'cash', 'final_settlement', 'lump_sum']
    },
    paymentReference: String,
    remainingBalance: Number,
    daysMissed: { type: Number, default: 0 },
    notes: String
}, { _id: true });

// Recovery history schema
const recoveryHistorySchema = new mongoose.Schema({
    recoveryId: { type: String, required: false },
    recoveryDate: { type: Date, required: false },
    installmentNumber: Number,
    recoveredAmount: { type: Number, required: false },
    recoveryMethod: {
        type: String,
        enum: ['payroll_deduction', 'bank_transfer', 'cash', 'final_settlement', 'lump_sum'],
        required: false
    },
    recoveryReference: String,
    processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    remainingBalance: { type: Number, required: false },
    receiptNumber: String,
    receiptUrl: String,
    notes: String
}, { _id: true });

// Approval step schema
const approvalStepSchema = new mongoose.Schema({
    stepNumber: { type: Number, required: false },
    stepName: { type: String, required: false },
    stepNameAr: String,
    approverRole: { type: String, required: false },
    approverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approverName: String,
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'skipped'],
        default: 'pending'
    },
    actionDate: Date,
    decision: {
        type: String,
        enum: ['approve', 'reject', 'reduce_amount']
    },
    approvedAmount: Number,
    approvedInstallments: Number,
    comments: String,
    responseTime: Number, // Hours
    notificationSent: { type: Boolean, default: false },
    notificationDate: Date
}, { _id: true });

// Eligibility check schema
const eligibilityCheckSchema = new mongoose.Schema({
    checkType: {
        type: String,
        enum: ['minimum_service', 'maximum_advances', 'advance_limit',
            'salary_ratio', 'probation', 'existing_deductions',
            'previous_defaults', 'employment_type', 'disciplinary']
    },
    checkName: String,
    checkNameAr: String,
    passed: Boolean,
    requirement: String,
    actualValue: String,
    notes: String
}, { _id: false });

// Supporting document schema
const supportingDocumentSchema = new mongoose.Schema({
    documentType: {
        type: String,
        enum: ['medical_report', 'hospital_bill', 'police_report',
            'death_certificate', 'travel_booking', 'rental_agreement',
            'request_form', 'approval_letter', 'disbursement_receipt',
            'recovery_receipt', 'acknowledgment', 'clearance_letter', 'other']
    },
    documentName: String,
    documentNameAr: String,
    fileUrl: String,
    uploadedOn: { type: Date, default: Date.now },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    verified: { type: Boolean, default: false },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    verifiedDate: Date,
    signed: { type: Boolean, default: false },
    signedDate: Date,
    expiryDate: Date,
    notes: String
}, { _id: true });

// Communication schema
const communicationSchema = new mongoose.Schema({
    communicationId: String,
    communicationType: {
        type: String,
        enum: ['email', 'sms', 'system_notification', 'meeting', 'phone']
    },
    date: { type: Date, default: Date.now },
    purpose: {
        type: String,
        enum: ['request_received', 'approval', 'rejection', 'disbursement',
            'recovery_reminder', 'missed_recovery', 'completion', 'other']
    },
    subject: String,
    message: String,
    sentTo: String,
    sentBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    attachments: [String],
    responseReceived: { type: Boolean, default: false },
    responseDate: Date,
    automated: { type: Boolean, default: false }
}, { _id: true });

// Failed deduction schema
const failedDeductionSchema = new mongoose.Schema({
    payrollRunId: { type: mongoose.Schema.Types.ObjectId, ref: 'PayrollRun' },
    payrollDate: Date,
    failureReason: {
        type: String,
        enum: ['insufficient_salary', 'employee_on_leave', 'unpaid_leave',
            'salary_on_hold', 'manual_hold', 'other']
    },
    scheduledAmount: Number,
    resolved: { type: Boolean, default: false },
    resolutionDate: Date,
    resolutionMethod: {
        type: String,
        enum: ['next_payroll', 'manual_payment', 'adjusted_schedule']
    },
    impact: String
}, { _id: true });

// ═══════════════════════════════════════════════════════════════
// MAIN SCHEMA
// ═══════════════════════════════════════════════════════════════

const employeeAdvanceSchema = new mongoose.Schema({
    // ═══════════════════════════════════════════════════════════════
    // IDENTIFICATION
    // ═══════════════════════════════════════════════════════════════
    advanceId: {
        type: String,
        unique: true,
        sparse: true
    },
    advanceNumber: {
        type: String,
        unique: true,
        sparse: true
    },

    // ═══════════════════════════════════════════════════════════════
    // EMPLOYEE INFO
    // ═══════════════════════════════════════════════════════════════
    employeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
        required: false
    },
    employeeNumber: String,
    employeeName: { type: String, required: false },
    employeeNameAr: String,
    nationalId: String,
    department: String,
    jobTitle: String,

    // ═══════════════════════════════════════════════════════════════
    // ADVANCE DETAILS
    // ═══════════════════════════════════════════════════════════════
    advanceType: {
        type: String,
        enum: ['salary', 'emergency', 'travel', 'relocation', 'medical',
            'education', 'housing', 'end_of_year', 'other'],
        required: false
    },
    advanceTypeAr: String,
    advanceCategory: {
        type: String,
        enum: ['regular', 'emergency', 'special'],
        default: 'regular'
    },
    advanceAmount: { type: Number, required: false, min: 0 },
    approvedAmount: Number,
    currency: { type: String, default: 'SAR' },

    // Reason/Purpose
    reason: String,
    reasonAr: String,
    detailedReason: String,
    urgency: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'medium'
    },
    isEmergency: { type: Boolean, default: false },

    // Emergency details
    emergencyDetails: {
        emergencyType: {
            type: String,
            enum: ['medical', 'family', 'accident', 'death', 'natural_disaster', 'legal', 'other']
        },
        description: String,
        evidenceProvided: { type: Boolean, default: false },
        evidenceUrls: [String],
        fastTrackApproval: { type: Boolean, default: false }
    },

    // ═══════════════════════════════════════════════════════════════
    // REPAYMENT TERMS
    // ═══════════════════════════════════════════════════════════════
    repayment: {
        installments: { type: Number, required: false, min: 1, max: 6 },
        installmentAmount: { type: Number, required: false },
        repaymentFrequency: {
            type: String,
            enum: ['monthly', 'bi_weekly'],
            default: 'monthly'
        },
        startDate: { type: Date, required: false },
        endDate: Date,
        deductionDay: { type: Number, min: 1, max: 28 },
        deductionMethod: {
            type: String,
            enum: ['payroll_deduction', 'bank_transfer', 'cash'],
            default: 'payroll_deduction'
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // CURRENT BALANCE
    // ═══════════════════════════════════════════════════════════════
    balance: {
        originalAmount: { type: Number, required: false },
        recoveredAmount: { type: Number, default: 0 },
        remainingBalance: { type: Number, required: false },
        completionPercentage: { type: Number, default: 0 }
    },

    // ═══════════════════════════════════════════════════════════════
    // STATUS
    // ═══════════════════════════════════════════════════════════════
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'disbursed', 'recovering',
            'completed', 'cancelled'],
        default: 'pending'
    },
    requestStatus: {
        type: String,
        enum: ['draft', 'submitted', 'under_review', 'approved', 'rejected', 'cancelled'],
        default: 'submitted'
    },

    // ═══════════════════════════════════════════════════════════════
    // DATES
    // ═══════════════════════════════════════════════════════════════
    requestDate: { type: Date, default: Date.now },
    approvalDate: Date,
    disbursementDate: Date,

    // ═══════════════════════════════════════════════════════════════
    // ELIGIBILITY
    // ═══════════════════════════════════════════════════════════════
    eligibility: {
        eligible: { type: Boolean, default: true },
        eligibilityChecks: [eligibilityCheckSchema],
        ineligibilityReasons: [String],

        // Service requirement
        serviceRequirement: {
            minimumMonths: { type: Number, default: 3 },
            actualMonths: Number,
            meetsRequirement: Boolean,
            waiverApplied: { type: Boolean, default: false },
            waiverReason: String
        },

        // Probation check
        probationCheck: {
            onProbation: Boolean,
            advanceAllowed: Boolean,
            maximumAllowedIfProbation: Number
        },

        // Active advances
        activeAdvances: {
            count: { type: Number, default: 0 },
            maximumAllowed: { type: Number, default: 1 },
            withinLimit: Boolean,
            totalOutstanding: { type: Number, default: 0 }
        },

        // Advance limit
        advanceLimit: {
            maximumAdvanceAmount: Number,
            calculationBasis: {
                type: String,
                enum: ['percentage_of_salary', 'fixed_amount', 'tenure_based'],
                default: 'percentage_of_salary'
            },
            maximumPercentage: { type: Number, default: 50 },
            employeeNetSalary: Number,
            availableLimit: Number,
            requestedAmount: Number,
            withinLimit: Boolean
        },

        // Deductions check
        deductionsCheck: {
            currentMonthlyDeductions: Number,
            proposedInstallment: Number,
            totalDeductions: Number,
            netSalaryAfterDeductions: Number,
            deductionPercentage: Number,
            maximumAllowed: { type: Number, default: 50 },
            withinLimit: Boolean
        },

        // Payment history
        paymentHistory: {
            previousAdvances: { type: Number, default: 0 },
            completedOnTime: { type: Number, default: 0 },
            delayed: { type: Number, default: 0 },
            defaulted: { type: Number, default: 0 },
            paymentRating: {
                type: String,
                enum: ['excellent', 'good', 'fair', 'poor']
            },
            eligible: Boolean
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // APPROVAL WORKFLOW
    // ═══════════════════════════════════════════════════════════════
    approvalWorkflow: {
        required: { type: Boolean, default: true },
        fastTrack: { type: Boolean, default: false },
        workflowSteps: [approvalStepSchema],
        currentStep: { type: Number, default: 1 },
        totalSteps: { type: Number, default: 1 },
        finalStatus: {
            type: String,
            enum: ['pending', 'approved', 'rejected'],
            default: 'pending'
        },
        finalApprover: String,
        finalApprovalDate: Date,
        rejectionReason: String,

        // Auto-approval for small amounts
        autoApproval: {
            applicable: { type: Boolean, default: false },
            thresholdAmount: Number,
            conditions: [{
                condition: String,
                met: Boolean
            }],
            autoApproved: { type: Boolean, default: false },
            autoApprovalDate: Date
        },

        // Total approval time
        totalApprovalTime: Number // Hours
    },

    // ═══════════════════════════════════════════════════════════════
    // DISBURSEMENT
    // ═══════════════════════════════════════════════════════════════
    disbursement: {
        disbursementMethod: {
            type: String,
            enum: ['bank_transfer', 'cash', 'check', 'payroll_addition']
        },
        bankTransfer: {
            bankName: String,
            accountNumber: String,
            iban: String,
            transferDate: Date,
            transferReference: String,
            transferStatus: {
                type: String,
                enum: ['pending', 'processed', 'completed', 'failed']
            },
            failureReason: String,
            sameDayTransfer: { type: Boolean, default: false }
        },
        cash: {
            disbursedOn: Date,
            disbursedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            receiptNumber: String,
            receiptUrl: String,
            employeeSignature: String,
            witnessName: String,
            witnessSignature: String
        },
        check: {
            checkNumber: String,
            checkDate: Date,
            issued: { type: Boolean, default: false },
            issuedDate: Date,
            cleared: { type: Boolean, default: false },
            clearanceDate: Date
        },
        payrollAddition: {
            payrollMonth: String,
            payrollYear: Number,
            addedToPayroll: { type: Boolean, default: false },
            payrollRunId: { type: mongoose.Schema.Types.ObjectId, ref: 'PayrollRun' }
        },
        disbursed: { type: Boolean, default: false },
        disbursementDate: Date,
        actualDisbursedAmount: Number,
        disbursementDeductions: [{
            deductionType: {
                type: String,
                enum: ['processing_fee', 'existing_advance', 'other']
            },
            deductionAmount: Number,
            description: String
        }],
        netDisbursedAmount: Number,
        urgentDisbursement: { type: Boolean, default: false },
        disbursementTargetTime: Number, // Hours
        actualDisbursementTime: Number, // Hours from approval
        confirmationRequired: { type: Boolean, default: true },
        confirmed: { type: Boolean, default: false },
        confirmedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        confirmationDate: Date
    },

    // ═══════════════════════════════════════════════════════════════
    // REPAYMENT SCHEDULE
    // ═══════════════════════════════════════════════════════════════
    repaymentSchedule: {
        scheduleGenerated: { type: Boolean, default: false },
        generatedDate: Date,
        installments: [repaymentInstallmentSchema],
        summary: {
            totalInstallments: Number,
            paidInstallments: { type: Number, default: 0 },
            pendingInstallments: Number,
            missedInstallments: { type: Number, default: 0 },
            totalPayable: Number,
            amountPaid: { type: Number, default: 0 },
            remainingAmount: Number
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // RECOVERY HISTORY
    // ═══════════════════════════════════════════════════════════════
    recoveryHistory: [recoveryHistorySchema],

    // ═══════════════════════════════════════════════════════════════
    // RECOVERY PERFORMANCE
    // ═══════════════════════════════════════════════════════════════
    recoveryPerformance: {
        onTimeRecoveries: { type: Number, default: 0 },
        delayedRecoveries: { type: Number, default: 0 },
        missedRecoveries: { type: Number, default: 0 },
        onTimePercentage: { type: Number, default: 100 },
        averageDelayDays: { type: Number, default: 0 },
        performanceRating: {
            type: String,
            enum: ['excellent', 'good', 'fair', 'poor']
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // PAYROLL INTEGRATION
    // ═══════════════════════════════════════════════════════════════
    payrollIntegration: {
        payrollDeduction: {
            active: { type: Boolean, default: false },
            deductionCode: String,
            deductionAmount: Number,
            deductionStartDate: Date,
            deductionEndDate: Date,
            deductionFrequency: {
                type: String,
                enum: ['monthly', 'bi_weekly'],
                default: 'monthly'
            },
            priority: Number,
            automaticDeduction: { type: Boolean, default: true },
            manualOverrideAllowed: { type: Boolean, default: false },
            requiresApproval: { type: Boolean, default: false }
        },
        payrollDeductions: [{
            payrollRunId: { type: mongoose.Schema.Types.ObjectId, ref: 'PayrollRun' },
            payrollMonth: Number,
            payrollYear: Number,
            deductionDate: Date,
            installmentNumber: Number,
            deductedAmount: Number,
            remainingBalance: Number,
            processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            salarySlipReference: String
        }],
        failedDeductions: [failedDeductionSchema],
        insufficientSalary: {
            occurrences: { type: Number, default: 0 },
            lastOccurrence: Date,
            handlingMethod: {
                type: String,
                enum: ['defer_to_next_month', 'partial_recovery', 'extend_schedule', 'lump_sum_later']
            },
            notes: String
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // EARLY RECOVERY
    // ═══════════════════════════════════════════════════════════════
    earlyRecovery: {
        requested: { type: Boolean, default: false },
        requestDate: Date,
        requestedBy: {
            type: String,
            enum: ['employee', 'employer']
        },
        recoveryOption: {
            type: String,
            enum: ['lump_sum', 'from_bonus', 'from_allowance', 'from_final_settlement', 'accelerated_schedule']
        },
        lumpSum: {
            amount: Number,
            paymentMethod: {
                type: String,
                enum: ['bank_transfer', 'cash', 'check']
            },
            paymentDate: Date,
            paymentReference: String,
            paid: { type: Boolean, default: false }
        },
        fromBonus: {
            bonusType: String,
            bonusMonth: String,
            recoveryAmount: Number,
            recovered: { type: Boolean, default: false },
            recoveryDate: Date
        },
        approved: { type: Boolean, default: false },
        approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        approvalDate: Date,
        completed: { type: Boolean, default: false },
        completionDate: Date
    },

    // ═══════════════════════════════════════════════════════════════
    // EXIT SETTLEMENT
    // ═══════════════════════════════════════════════════════════════
    exitSettlement: {
        employeeExiting: { type: Boolean, default: false },
        exitDate: Date,
        exitType: {
            type: String,
            enum: ['resignation', 'termination', 'contract_end', 'retirement', 'death']
        },
        outstandingBalance: Number,
        recoveryFromFinalSettlement: {
            applicable: { type: Boolean, default: false },
            finalSettlementAmount: Number,
            recoveredAmount: Number,
            recoveryDate: Date,
            fullRecovery: { type: Boolean, default: false }
        },
        shortfall: {
            hasShortfall: { type: Boolean, default: false },
            shortfallAmount: Number,
            shortfallReason: {
                type: String,
                enum: ['insufficient_settlement', 'negative_balance', 'multiple_advances']
            },
            recoveryPlan: {
                method: {
                    type: String,
                    enum: ['payment_plan', 'guarantor', 'legal_recovery', 'write_off']
                },
                details: String,
                implemented: { type: Boolean, default: false }
            }
        },
        deathCase: {
            balanceWaived: { type: Boolean, default: false },
            waivedAmount: Number,
            waiverReason: String,
            approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            approvalDate: Date
        },
        clearanceLetter: {
            issued: { type: Boolean, default: false },
            issueDate: Date,
            letterUrl: String
        },
        offboardingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Offboarding' }
    },

    // ═══════════════════════════════════════════════════════════════
    // SPECIAL CASES
    // ═══════════════════════════════════════════════════════════════
    specialCases: {
        leaveWithoutPay: {
            onUnpaidLeave: { type: Boolean, default: false },
            leaveStartDate: Date,
            leaveEndDate: Date,
            recoveryPaused: { type: Boolean, default: false },
            pauseStartDate: Date,
            resumeDate: Date,
            scheduleAdjustment: {
                required: { type: Boolean, default: false },
                originalEndDate: Date,
                adjustedEndDate: Date,
                additionalMonths: Number
            }
        },
        salaryReduction: {
            salaryReduced: { type: Boolean, default: false },
            reductionDate: Date,
            reductionPercentage: Number,
            newNetSalary: Number,
            installmentAdjustment: {
                required: { type: Boolean, default: false },
                originalInstallment: Number,
                adjustedInstallment: Number,
                scheduleExtension: Number
            }
        },
        suspension: {
            suspended: { type: Boolean, default: false },
            suspensionStartDate: Date,
            suspensionEndDate: Date,
            recoveryDuringSuspension: { type: Boolean, default: false },
            scheduleImpact: String
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // WRITE-OFF
    // ═══════════════════════════════════════════════════════════════
    writeOff: {
        writtenOff: { type: Boolean, default: false },
        writeOffDate: Date,
        writeOffReason: {
            type: String,
            enum: ['death', 'absconding', 'bankruptcy', 'uncollectible', 'compassionate', 'legal_settlement', 'other']
        },
        writeOffAmount: Number,
        detailedReason: String,
        approvals: [{
            approverRole: String,
            approverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            approverName: String,
            approved: { type: Boolean, default: false },
            approvalDate: Date,
            comments: String
        }],
        finalApproved: { type: Boolean, default: false },
        finalApprovalBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        finalApprovalDate: Date,
        accountingEntry: {
            journalEntryNumber: String,
            entryDate: Date,
            debitAccount: String,
            creditAccount: String,
            posted: { type: Boolean, default: false }
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // ADVANCE HISTORY
    // ═══════════════════════════════════════════════════════════════
    advanceHistory: {
        previousAdvances: [{
            advanceId: String,
            advanceDate: Date,
            advanceType: String,
            advanceAmount: Number,
            repaymentStatus: {
                type: String,
                enum: ['completed', 'ongoing', 'defaulted']
            },
            completionDate: Date,
            paymentPerformance: {
                type: String,
                enum: ['excellent', 'good', 'fair', 'poor']
            }
        }],
        statistics: {
            totalAdvancesTaken: { type: Number, default: 0 },
            totalAmountAdvanced: { type: Number, default: 0 },
            totalAmountRepaid: { type: Number, default: 0 },
            averageAdvanceAmount: { type: Number, default: 0 },
            completedOnTime: { type: Number, default: 0 },
            completedLate: { type: Number, default: 0 },
            defaulted: { type: Number, default: 0 },
            reliabilityScore: Number // 0-100
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // SUPPORTING DOCUMENTS
    // ═══════════════════════════════════════════════════════════════
    documents: [supportingDocumentSchema],

    // ═══════════════════════════════════════════════════════════════
    // COMMUNICATIONS
    // ═══════════════════════════════════════════════════════════════
    communications: [communicationSchema],

    // ═══════════════════════════════════════════════════════════════
    // NOTES
    // ═══════════════════════════════════════════════════════════════
    notes: {
        employeeNotes: String,
        managerNotes: String,
        hrNotes: String,
        financeNotes: String,
        internalNotes: String,
        specialInstructions: String,
        concerns: String
    },

    // ═══════════════════════════════════════════════════════════════
    // COMPLETION
    // ═══════════════════════════════════════════════════════════════
    completion: {
        advanceCompleted: { type: Boolean, default: false },
        completionDate: Date,
        completionMethod: {
            type: String,
            enum: ['full_recovery', 'early_recovery', 'exit_settlement', 'write_off', 'waived']
        },
        finalRecovery: {
            recoveryDate: Date,
            recoveryAmount: Number,
            recoveryReference: String
        },
        clearanceLetter: {
            issued: { type: Boolean, default: false },
            issueDate: Date,
            letterUrl: String,
            delivered: { type: Boolean, default: false },
            deliveryDate: Date
        },
        impactOnFutureEligibility: {
            performanceRating: {
                type: String,
                enum: ['excellent', 'good', 'fair', 'poor']
            },
            affectsFutureAdvances: { type: Boolean, default: false },
            coolingPeriodRequired: { type: Boolean, default: false },
            coolingPeriodDays: Number,
            notes: String
        },
        caseClosed: { type: Boolean, default: false },
        closedDate: Date,
        closedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    },

    // ═══════════════════════════════════════════════════════════════
    // ANALYTICS
    // ═══════════════════════════════════════════════════════════════
    analytics: {
        requestToApprovalTime: Number, // Hours
        approvalToDisbursementTime: Number, // Hours
        totalProcessingTime: Number, // Hours
        recoveryPeriod: Number, // Days
        onTimeRecoveryPercentage: Number,
        averageDelayDays: Number,
        riskLevel: {
            type: String,
            enum: ['low', 'medium', 'high']
        },
        riskFactors: [String]
    },

    // ═══════════════════════════════════════════════════════════════
    // RELATED RECORDS
    // ═══════════════════════════════════════════════════════════════
    relatedRecords: {
        payrollDeductionIds: [String],
        exitProcessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Offboarding' },
        previousAdvanceIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'EmployeeAdvance' }],
        relatedLoanIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'EmployeeLoan' }]
    },

    // ═══════════════════════════════════════════════════════════════
    // OWNERSHIP - Multi-tenancy
    // ═══════════════════════════════════════════════════════════════
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
employeeAdvanceSchema.index({ firmId: 1, status: 1 });
employeeAdvanceSchema.index({ lawyerId: 1, status: 1 });
employeeAdvanceSchema.index({ employeeId: 1, status: 1 });
employeeAdvanceSchema.index({ advanceId: 1 });
employeeAdvanceSchema.index({ advanceNumber: 1 });
employeeAdvanceSchema.index({ status: 1, requestDate: -1 });
employeeAdvanceSchema.index({ 'repaymentSchedule.installments.dueDate': 1, 'repaymentSchedule.installments.status': 1 });
employeeAdvanceSchema.index({ isEmergency: 1, urgency: 1 });
employeeAdvanceSchema.index({ advanceType: 1 });

// ═══════════════════════════════════════════════════════════════
// PRE-SAVE HOOKS
// ═══════════════════════════════════════════════════════════════

// Generate advance ID and calculate fields
employeeAdvanceSchema.pre('save', async function(next) {
    // Generate advance ID
    if (!this.advanceId) {
        const year = new Date().getFullYear();
        const count = await this.constructor.countDocuments({
            $or: [
                { firmId: this.firmId },
                { lawyerId: this.lawyerId }
            ],
            createdAt: {
                $gte: new Date(year, 0, 1),
                $lt: new Date(year + 1, 0, 1)
            }
        });
        this.advanceId = `ADV-${year}-${String(count + 1).padStart(3, '0')}`;
        this.advanceNumber = this.advanceId;
    }

    // Calculate balance if not set
    if (!this.balance.originalAmount) {
        this.balance.originalAmount = this.advanceAmount;
    }
    if (this.balance.remainingBalance === undefined) {
        this.balance.remainingBalance = this.balance.originalAmount - this.balance.recoveredAmount;
    }

    // Calculate completion percentage
    if (this.balance.originalAmount > 0) {
        this.balance.completionPercentage = Math.round(
            (this.balance.recoveredAmount / this.balance.originalAmount) * 100
        );
    }

    // Calculate end date
    if (this.repayment.startDate && this.repayment.installments && !this.repayment.endDate) {
        const endDate = new Date(this.repayment.startDate);
        endDate.setMonth(endDate.getMonth() + this.repayment.installments - 1);
        this.repayment.endDate = endDate;
    }

    next();
});

// ═══════════════════════════════════════════════════════════════
// INSTANCE METHODS
// ═══════════════════════════════════════════════════════════════

// Get next installment
employeeAdvanceSchema.methods.getNextInstallment = function() {
    const pendingInstallments = this.repaymentSchedule?.installments
        ?.filter(i => i.status === 'pending')
        .sort((a, b) => a.installmentNumber - b.installmentNumber);
    return pendingInstallments?.length > 0 ? pendingInstallments[0] : null;
};

// Calculate overdue amount
employeeAdvanceSchema.methods.getOverdueAmount = function() {
    const today = new Date();
    return this.repaymentSchedule?.installments
        ?.filter(i => i.status !== 'paid' && i.status !== 'waived' && new Date(i.dueDate) < today)
        .reduce((sum, i) => sum + (i.installmentAmount - (i.paidAmount || 0)), 0) || 0;
};

// Calculate recovery performance
employeeAdvanceSchema.methods.calculateRecoveryPerformance = function() {
    const totalRecoveries = this.recoveryPerformance.onTimeRecoveries +
        this.recoveryPerformance.delayedRecoveries;

    if (totalRecoveries > 0) {
        this.recoveryPerformance.onTimePercentage = Math.round(
            (this.recoveryPerformance.onTimeRecoveries / totalRecoveries) * 100
        );
    }

    // Determine rating
    const percentage = this.recoveryPerformance.onTimePercentage;
    if (percentage >= 95) {
        this.recoveryPerformance.performanceRating = 'excellent';
    } else if (percentage >= 80) {
        this.recoveryPerformance.performanceRating = 'good';
    } else if (percentage >= 60) {
        this.recoveryPerformance.performanceRating = 'fair';
    } else {
        this.recoveryPerformance.performanceRating = 'poor';
    }

    return this.recoveryPerformance;
};

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

// Get advances for firm or solo lawyer
employeeAdvanceSchema.statics.getAdvances = function(firmId, lawyerId, filters = {}, options = {}) {
    const query = {};

    // Models receive context as parameter, so check for isSoloLawyer in the context/options
    if (options.isSoloLawyer || !firmId) {
        query.lawyerId = lawyerId;
    } else {
        query.firmId = firmId;
    }

    return this.find({ ...query, ...filters })
        .populate('employeeId', 'employeeId personalInfo.fullNameArabic personalInfo.fullNameEnglish compensation.basicSalary')
        .populate('createdBy', 'firstName lastName')
        .sort({ createdAt: -1 });
};

// Get stats
employeeAdvanceSchema.statics.getStats = async function(firmId, lawyerId, options = {}) {
    const query = {};

    // Models receive context as parameter, so check for isSoloLawyer in the context/options
    if (options.isSoloLawyer || !firmId) {
        query.lawyerId = lawyerId;
    } else {
        query.firmId = firmId;
    }

    const [stats] = await this.aggregate([
        { $match: query },
        {
            $facet: {
                totalAdvances: [{ $count: 'count' }],
                byStatus: [
                    { $group: { _id: '$status', count: { $sum: 1 } } }
                ],
                byType: [
                    { $group: { _id: '$advanceType', count: { $sum: 1 } } }
                ],
                financials: [
                    {
                        $group: {
                            _id: null,
                            totalDisbursed: {
                                $sum: {
                                    $cond: [
                                        { $eq: ['$disbursement.disbursed', true] },
                                        '$advanceAmount',
                                        0
                                    ]
                                }
                            },
                            totalOutstanding: {
                                $sum: {
                                    $cond: [
                                        { $in: ['$status', ['disbursed', 'recovering']] },
                                        '$balance.remainingBalance',
                                        0
                                    ]
                                }
                            },
                            totalRecovered: { $sum: '$balance.recoveredAmount' }
                        }
                    }
                ],
                thisMonth: [
                    {
                        $match: {
                            requestDate: { $gte: new Date(new Date().setDate(1)) }
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            requests: { $sum: 1 },
                            approvals: {
                                $sum: {
                                    $cond: [{ $eq: ['$status', 'approved'] }, 1, 0]
                                }
                            },
                            disbursements: {
                                $sum: {
                                    $cond: [{ $eq: ['$disbursement.disbursed', true] }, 1, 0]
                                }
                            }
                        }
                    }
                ],
                emergencyAdvances: [
                    {
                        $match: { isEmergency: true }
                    },
                    { $count: 'count' }
                ]
            }
        }
    ]);

    // Get active and pending counts
    const activeAdvances = await this.countDocuments({
        ...query,
        status: { $in: ['disbursed', 'recovering'] }
    });
    const pendingApproval = await this.countDocuments({ ...query, status: 'pending' });

    // Get overdue installments
    const today = new Date();
    const overdueAdvances = await this.countDocuments({
        ...query,
        status: { $in: ['disbursed', 'recovering'] },
        'repaymentSchedule.installments': {
            $elemMatch: {
                status: { $nin: ['paid', 'waived'] },
                dueDate: { $lt: today }
            }
        }
    });

    // Calculate average recovery rate
    const completedAdvances = await this.find({ ...query, status: 'completed' });
    const avgRecoveryRate = completedAdvances.length > 0
        ? completedAdvances.reduce((sum, a) => sum + (a.recoveryPerformance?.onTimePercentage || 100), 0) / completedAdvances.length
        : 100;

    return {
        totalAdvances: stats.totalAdvances[0]?.count || 0,
        byStatus: stats.byStatus.map(s => ({ status: s._id, count: s.count })),
        byType: stats.byType.map(t => ({ advanceType: t._id, count: t.count })),
        totalDisbursed: stats.financials[0]?.totalDisbursed || 0,
        totalOutstanding: stats.financials[0]?.totalOutstanding || 0,
        totalRecovered: stats.financials[0]?.totalRecovered || 0,
        activeAdvances,
        pendingApproval,
        overdueAdvances,
        emergencyAdvances: stats.emergencyAdvances[0]?.count || 0,
        thisMonth: {
            requests: stats.thisMonth[0]?.requests || 0,
            approvals: stats.thisMonth[0]?.approvals || 0,
            disbursements: stats.thisMonth[0]?.disbursements || 0,
            recoveries: 0
        },
        averageRecoveryRate: Math.round(avgRecoveryRate)
    };
};

// Get overdue recoveries
employeeAdvanceSchema.statics.getOverdueRecoveries = async function(firmId, lawyerId, options = {}) {
    const query = {};

    // Models receive context as parameter, so check for isSoloLawyer in the context/options
    if (options.isSoloLawyer || !firmId) {
        query.lawyerId = lawyerId;
    } else {
        query.firmId = firmId;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const advances = await this.find({
        ...query,
        status: { $in: ['disbursed', 'recovering'] }
    }).populate('employeeId', 'employeeId personalInfo.fullNameArabic personalInfo.fullNameEnglish');

    const overdueList = [];

    for (const advance of advances) {
        for (const installment of advance.repaymentSchedule?.installments || []) {
            if (installment.status !== 'paid' && installment.status !== 'waived') {
                const dueDate = new Date(installment.dueDate);
                dueDate.setHours(0, 0, 0, 0);

                if (today > dueDate) {
                    const daysOverdue = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));

                    overdueList.push({
                        advanceId: advance._id,
                        advanceNumber: advance.advanceNumber,
                        employeeId: advance.employeeId?._id,
                        employeeName: advance.employeeName,
                        employeeNameAr: advance.employeeNameAr,
                        installmentNumber: installment.installmentNumber,
                        dueDate: installment.dueDate,
                        amount: installment.installmentAmount,
                        paidAmount: installment.paidAmount || 0,
                        outstandingAmount: installment.installmentAmount - (installment.paidAmount || 0),
                        daysOverdue,
                        advanceType: advance.advanceType,
                        isEmergency: advance.isEmergency
                    });
                }
            }
        }
    }

    return overdueList.sort((a, b) => b.daysOverdue - a.daysOverdue);
};

// Get pending approvals
employeeAdvanceSchema.statics.getPendingApprovals = async function(firmId, lawyerId, options = {}) {
    const query = {};

    // Models receive context as parameter, so check for isSoloLawyer in the context/options
    if (options.isSoloLawyer || !firmId) {
        query.lawyerId = lawyerId;
    } else {
        query.firmId = firmId;
    }

    return this.find({
        ...query,
        status: 'pending',
        requestStatus: { $in: ['submitted', 'under_review'] }
    })
        .populate('employeeId', 'employeeId personalInfo.fullNameArabic personalInfo.fullNameEnglish')
        .sort({ isEmergency: -1, urgency: -1, requestDate: 1 }); // Emergency first, then by urgency
};

// Get emergency advances
employeeAdvanceSchema.statics.getEmergencyAdvances = async function(firmId, lawyerId, options = {}) {
    const query = {};

    // Models receive context as parameter, so check for isSoloLawyer in the context/options
    if (options.isSoloLawyer || !firmId) {
        query.lawyerId = lawyerId;
    } else {
        query.firmId = firmId;
    }

    return this.find({
        ...query,
        isEmergency: true,
        status: { $in: ['pending', 'approved', 'disbursed', 'recovering'] }
    })
        .populate('employeeId', 'employeeId personalInfo.fullNameArabic personalInfo.fullNameEnglish')
        .sort({ requestDate: -1 });
};

// Get advances by employee
employeeAdvanceSchema.statics.getByEmployee = async function(employeeId, firmId, lawyerId, options = {}) {
    const query = { employeeId };

    // Models receive context as parameter, so check for isSoloLawyer in the context/options
    if (options.isSoloLawyer || !firmId) {
        query.lawyerId = lawyerId;
    } else {
        query.firmId = firmId;
    }

    return this.find(query)
        .populate('createdBy', 'firstName lastName')
        .sort({ createdAt: -1 });
};

// Ensure virtuals are included in JSON
employeeAdvanceSchema.set('toJSON', { virtuals: true });
employeeAdvanceSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('EmployeeAdvance', employeeAdvanceSchema);
