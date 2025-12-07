const mongoose = require('mongoose');

/**
 * Employee Loan Model - HR Management
 * Module 10: القروض الموظفين (Employee Loans)
 * Islamic Finance Compliant (Interest-free, Sharia-compliant)
 */

// ═══════════════════════════════════════════════════════════════
// SUB-SCHEMAS
// ═══════════════════════════════════════════════════════════════

// Installment schema for repayment schedule
const installmentSchema = new mongoose.Schema({
    installmentNumber: { type: Number, required: true },
    dueDate: { type: Date, required: true },
    principalAmount: { type: Number, required: true },
    interestAmount: { type: Number, default: 0 }, // Usually 0 for Islamic finance
    processingFeeAmount: { type: Number, default: 0 },
    installmentAmount: { type: Number, required: true },
    status: {
        type: String,
        enum: ['pending', 'paid', 'partial', 'missed', 'waived'],
        default: 'pending'
    },
    paidAmount: { type: Number, default: 0 },
    paidDate: Date,
    paymentMethod: {
        type: String,
        enum: ['payroll_deduction', 'bank_transfer', 'cash', 'check']
    },
    paymentReference: String,
    remainingBalance: { type: Number, required: true },
    lateFee: { type: Number, default: 0 },
    lateDays: { type: Number, default: 0 },
    notes: String
}, { _id: true });

// Approval step schema for workflow
const approvalStepSchema = new mongoose.Schema({
    stepNumber: { type: Number, required: true },
    stepName: { type: String, required: true },
    stepNameAr: String,
    approverRole: { type: String, required: true },
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
        enum: ['approve', 'reject', 'request_changes', 'escalate']
    },
    approvedAmount: Number,
    approvedInstallments: Number,
    comments: String,
    conditions: [String],
    notificationSent: { type: Boolean, default: false },
    notificationDate: Date
}, { _id: true });

// Payment history schema
const paymentHistorySchema = new mongoose.Schema({
    paymentId: { type: String, required: true },
    paymentDate: { type: Date, required: true },
    installmentNumber: Number,
    principalPaid: { type: Number, required: true },
    interestPaid: { type: Number, default: 0 },
    feesPaid: { type: Number, default: 0 },
    lateFeesPaid: { type: Number, default: 0 },
    totalPaid: { type: Number, required: true },
    paymentMethod: {
        type: String,
        enum: ['payroll_deduction', 'bank_transfer', 'cash', 'check'],
        required: true
    },
    paymentReference: String,
    processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    remainingBalance: { type: Number, required: true },
    receiptNumber: String,
    receiptUrl: String,
    notes: String
}, { _id: true });

// Eligibility check schema
const eligibilityCheckSchema = new mongoose.Schema({
    checkType: {
        type: String,
        enum: ['minimum_service', 'maximum_loans', 'credit_limit',
            'salary_ratio', 'employment_type', 'probation', 'performance',
            'disciplinary', 'existing_defaults', 'overdue']
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
        enum: ['salary_certificate', 'quotation', 'invoice', 'medical_report',
            'admission_letter', 'marriage_contract', 'application_form',
            'approval_letter', 'loan_agreement', 'disbursement_receipt',
            'payment_receipt', 'guarantor_agreement', 'clearance_letter',
            'legal_notice', 'other']
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

// Guarantor schema
const guarantorSchema = new mongoose.Schema({
    guarantorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    guarantorName: { type: String, required: true },
    guarantorNameAr: String,
    relationship: String,
    nationalId: String,
    employer: String,
    jobTitle: String,
    monthlySalary: Number,
    contactPhone: String,
    contactEmail: String,
    address: String,
    guaranteeAmount: Number,
    documents: [{
        documentType: {
            type: String,
            enum: ['national_id', 'salary_certificate', 'bank_statement', 'other']
        },
        documentName: String,
        fileUrl: String,
        verified: { type: Boolean, default: false }
    }],
    consentGiven: { type: Boolean, default: false },
    consentDate: Date,
    consentDocument: String,
    guarantorSignature: String,
    notifiedOfDefault: { type: Boolean, default: false },
    notificationDate: Date
}, { _id: false });

// Recovery action schema
const recoveryActionSchema = new mongoose.Schema({
    actionId: String,
    actionType: {
        type: String,
        enum: ['reminder', 'warning', 'meeting', 'salary_attachment',
            'guarantor_contact', 'legal_notice', 'legal_action', 'other']
    },
    actionDate: { type: Date, default: Date.now },
    actionBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    description: String,
    response: String,
    effective: { type: Boolean, default: false }
}, { _id: true });

// Restructuring schema
const restructuringSchema = new mongoose.Schema({
    restructureId: String,
    restructureDate: { type: Date, default: Date.now },
    restructureReason: {
        type: String,
        enum: ['financial_hardship', 'salary_reduction', 'emergency',
            'mutual_agreement', 'other']
    },
    requestedBy: {
        type: String,
        enum: ['employee', 'employer']
    },
    originalTerms: {
        remainingBalance: Number,
        installmentAmount: Number,
        remainingInstallments: Number,
        endDate: Date
    },
    newTerms: {
        newInstallmentAmount: Number,
        newInstallments: Number,
        newEndDate: Date,
        additionalInterest: Number,
        totalNewPayable: Number
    },
    approved: { type: Boolean, default: false },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvalDate: Date,
    restructureAgreement: {
        signed: { type: Boolean, default: false },
        documentUrl: String,
        signedDate: Date
    },
    effectiveDate: Date
}, { _id: true });

// Communication schema
const communicationSchema = new mongoose.Schema({
    communicationId: String,
    communicationType: {
        type: String,
        enum: ['email', 'sms', 'letter', 'meeting', 'phone']
    },
    date: { type: Date, default: Date.now },
    purpose: {
        type: String,
        enum: ['application_received', 'approval', 'rejection', 'disbursement',
            'payment_reminder', 'missed_payment', 'default_warning',
            'clearance', 'other']
    },
    subject: String,
    message: String,
    sentTo: String,
    sentBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    attachments: [String],
    responseReceived: { type: Boolean, default: false },
    responseDate: Date
}, { _id: true });

// ═══════════════════════════════════════════════════════════════
// MAIN SCHEMA
// ═══════════════════════════════════════════════════════════════

const employeeLoanSchema = new mongoose.Schema({
    // ═══════════════════════════════════════════════════════════════
    // IDENTIFICATION
    // ═══════════════════════════════════════════════════════════════
    loanId: {
        type: String,
        unique: true,
        sparse: true
    },
    loanNumber: {
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
        required: true
    },
    employeeNumber: String,
    employeeName: { type: String, required: true },
    employeeNameAr: String,
    nationalId: String,
    department: String,
    jobTitle: String,

    // ═══════════════════════════════════════════════════════════════
    // LOAN DETAILS
    // ═══════════════════════════════════════════════════════════════
    loanType: {
        type: String,
        enum: ['personal', 'housing', 'vehicle', 'education', 'emergency',
            'marriage', 'medical', 'hajj', 'furniture', 'computer',
            'travel', 'debt_consolidation', 'other'],
        required: true
    },
    loanTypeAr: String,
    loanCategory: {
        type: String,
        enum: ['regular', 'emergency', 'special'],
        default: 'regular'
    },
    loanAmount: { type: Number, required: true, min: 0 },
    approvedAmount: Number,
    currency: { type: String, default: 'SAR' },

    // Purpose
    purpose: String,
    purposeAr: String,
    detailedPurpose: String,
    urgency: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'medium'
    },

    // ═══════════════════════════════════════════════════════════════
    // REPAYMENT SCHEDULE
    // ═══════════════════════════════════════════════════════════════
    repayment: {
        installments: { type: Number, required: true },
        installmentAmount: { type: Number, required: true },
        installmentFrequency: {
            type: String,
            enum: ['monthly', 'bi_weekly', 'quarterly'],
            default: 'monthly'
        },
        firstInstallmentDate: { type: Date, required: true },
        lastInstallmentDate: Date,
        paymentDay: { type: Number, min: 1, max: 28 },
        deductionMethod: {
            type: String,
            enum: ['payroll_deduction', 'bank_transfer', 'cash', 'check'],
            default: 'payroll_deduction'
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // CURRENT BALANCE
    // ═══════════════════════════════════════════════════════════════
    balance: {
        originalAmount: { type: Number, required: true },
        paidAmount: { type: Number, default: 0 },
        remainingBalance: { type: Number, required: true },
        completionPercentage: { type: Number, default: 0 }
    },

    // ═══════════════════════════════════════════════════════════════
    // STATUS
    // ═══════════════════════════════════════════════════════════════
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'active', 'completed',
            'defaulted', 'cancelled'],
        default: 'pending'
    },
    applicationStatus: {
        type: String,
        enum: ['draft', 'submitted', 'under_review', 'approved', 'rejected', 'cancelled'],
        default: 'submitted'
    },

    // ═══════════════════════════════════════════════════════════════
    // DATES
    // ═══════════════════════════════════════════════════════════════
    applicationDate: { type: Date, default: Date.now },
    approvalDate: Date,
    disbursementDate: Date,

    // ═══════════════════════════════════════════════════════════════
    // LOAN TERMS (Islamic Finance - Interest-free)
    // ═══════════════════════════════════════════════════════════════
    loanTerms: {
        principalAmount: Number,
        interestRate: { type: Number, default: 0 }, // Usually 0 for Sharia compliance
        interestType: {
            type: String,
            enum: ['simple', 'compound', 'flat', 'none'],
            default: 'none'
        },

        // Islamic finance details
        islamicFinance: {
            shariaCompliant: { type: Boolean, default: true },
            financingType: {
                type: String,
                enum: ['murabaha', 'tawarruq', 'qard_hassan', 'musharaka'],
                default: 'qard_hassan' // Interest-free loan
            },
            profitRate: { type: Number, default: 0 },
            notes: String
        },

        // Processing fee
        processingFee: {
            applicable: { type: Boolean, default: false },
            feeAmount: { type: Number, default: 0 },
            feePercentage: { type: Number, default: 0 },
            deductedFrom: {
                type: String,
                enum: ['loan_amount', 'salary', 'separate_payment'],
                default: 'loan_amount'
            }
        },

        // Total amount payable
        totalAmountPayable: Number,

        // Early repayment
        earlyRepayment: {
            allowed: { type: Boolean, default: true },
            penaltyApplicable: { type: Boolean, default: false },
            penaltyPercentage: { type: Number, default: 0 },
            penaltyAmount: { type: Number, default: 0 },
            minimumMonthsBeforeEarly: { type: Number, default: 0 }
        },

        // Late payment
        latePayment: {
            gracePeriodDays: { type: Number, default: 5 },
            lateFeeApplicable: { type: Boolean, default: false },
            lateFeeAmount: { type: Number, default: 0 },
            lateFeePercentage: { type: Number, default: 0 }
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // ELIGIBILITY
    // ═══════════════════════════════════════════════════════════════
    eligibility: {
        eligible: { type: Boolean, default: true },
        eligibilityChecks: [eligibilityCheckSchema],
        ineligibilityReasons: [String],

        // Credit limit info
        creditLimit: {
            employeeCreditLimit: Number,
            availableCredit: Number,
            requestedAmount: Number,
            withinLimit: { type: Boolean, default: true }
        },

        // Salary deduction ratio
        salaryDeductionRatio: {
            netSalary: Number,
            existingDeductions: Number,
            proposedInstallment: Number,
            totalDeductions: Number,
            deductionPercentage: Number,
            maximumAllowed: { type: Number, default: 30 }, // 30% max
            withinLimit: { type: Boolean, default: true }
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // INSTALLMENTS SCHEDULE
    // ═══════════════════════════════════════════════════════════════
    installments: [installmentSchema],

    // ═══════════════════════════════════════════════════════════════
    // APPROVAL WORKFLOW
    // ═══════════════════════════════════════════════════════════════
    approvalWorkflow: {
        required: { type: Boolean, default: true },
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
        rejectionReason: String
    },

    // ═══════════════════════════════════════════════════════════════
    // DISBURSEMENT
    // ═══════════════════════════════════════════════════════════════
    disbursement: {
        disbursementMethod: {
            type: String,
            enum: ['bank_transfer', 'cash', 'check', 'third_party_payment']
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
            failureReason: String
        },
        check: {
            checkNumber: String,
            checkDate: Date,
            issued: { type: Boolean, default: false },
            issuedDate: Date,
            cleared: { type: Boolean, default: false },
            clearanceDate: Date
        },
        cash: {
            disbursedOn: Date,
            disbursedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            receiptNumber: String,
            receiptUrl: String,
            employeeSignature: String
        },
        thirdPartyPayment: {
            payeeName: String,
            payeeAccount: String,
            purpose: String,
            paymentDate: Date,
            paymentReference: String,
            invoiceNumber: String,
            invoiceUrl: String
        },
        disbursed: { type: Boolean, default: false },
        disbursementDate: Date,
        actualDisbursedAmount: Number,
        disbursementDeductions: [{
            deductionType: {
                type: String,
                enum: ['processing_fee', 'insurance', 'advance_installment', 'other']
            },
            deductionAmount: Number,
            description: String
        }],
        netDisbursedAmount: Number,
        confirmationRequired: { type: Boolean, default: true },
        confirmed: { type: Boolean, default: false },
        confirmedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        confirmationDate: Date
    },

    // ═══════════════════════════════════════════════════════════════
    // PAYMENT HISTORY
    // ═══════════════════════════════════════════════════════════════
    paymentHistory: [paymentHistorySchema],

    // ═══════════════════════════════════════════════════════════════
    // PAYMENT PERFORMANCE
    // ═══════════════════════════════════════════════════════════════
    paymentPerformance: {
        onTimePayments: { type: Number, default: 0 },
        latePayments: { type: Number, default: 0 },
        missedPayments: { type: Number, default: 0 },
        onTimePercentage: { type: Number, default: 100 },
        averageDelayDays: { type: Number, default: 0 },
        totalLateFees: { type: Number, default: 0 },
        paymentRating: {
            type: String,
            enum: ['excellent', 'good', 'fair', 'poor']
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // GUARANTOR / COLLATERAL
    // ═══════════════════════════════════════════════════════════════
    guarantee: {
        guaranteeRequired: { type: Boolean, default: false },
        guaranteeType: {
            type: String,
            enum: ['personal_guarantee', 'collateral', 'salary_assignment',
                'bank_guarantee', 'insurance']
        },
        personalGuarantor: guarantorSchema,
        salaryAssignment: {
            assignmentPercentage: Number,
            assignmentAmount: Number,
            assignmentDocument: String,
            signed: { type: Boolean, default: false },
            signedDate: Date
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // DEFAULT MANAGEMENT
    // ═══════════════════════════════════════════════════════════════
    default: {
        inDefault: { type: Boolean, default: false },
        defaultDate: Date,
        defaultReason: {
            type: String,
            enum: ['non_payment', 'employment_termination', 'bankruptcy',
                'whereabouts_unknown', 'other']
        },
        consecutiveMissedPayments: { type: Number, default: 0 },
        totalMissedPayments: { type: Number, default: 0 },
        outstandingAmount: { type: Number, default: 0 },
        penaltiesAccrued: { type: Number, default: 0 },
        totalAmountDue: { type: Number, default: 0 },
        recoveryActions: [recoveryActionSchema],
        guarantorNotified: { type: Boolean, default: false },
        guarantorNotificationDate: Date,
        guarantorPayment: {
            paymentMade: { type: Boolean, default: false },
            paymentAmount: Number,
            paymentDate: Date
        },
        legalAction: {
            initiated: { type: Boolean, default: false },
            initiationDate: Date,
            legalCaseNumber: String,
            court: String,
            status: {
                type: String,
                enum: ['filed', 'ongoing', 'judgment', 'settled', 'closed']
            },
            judgmentDate: Date,
            judgmentAmount: Number,
            enforcementActions: [String]
        },
        recovered: { type: Boolean, default: false },
        recoveryDate: Date,
        recoveryAmount: { type: Number, default: 0 },
        writeOff: {
            writtenOff: { type: Boolean, default: false },
            writeOffDate: Date,
            writeOffAmount: { type: Number, default: 0 },
            writeOffReason: String,
            approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // EARLY SETTLEMENT
    // ═══════════════════════════════════════════════════════════════
    earlySettlement: {
        requested: { type: Boolean, default: false },
        requestDate: Date,
        calculation: {
            remainingPrincipal: Number,
            remainingInterest: Number,
            interestWaiver: Number,
            earlySettlementPenalty: Number,
            totalSettlementAmount: Number,
            savings: Number
        },
        approved: { type: Boolean, default: false },
        approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        approvalDate: Date,
        settlement: {
            settlementDate: Date,
            paymentMethod: {
                type: String,
                enum: ['lump_sum', 'from_settlement', 'from_salary', 'bank_transfer']
            },
            paymentReference: String,
            settled: { type: Boolean, default: false },
            settlementCompletionDate: Date
        },
        postSettlement: {
            clearanceLetter: {
                issued: { type: Boolean, default: false },
                issueDate: Date,
                letterUrl: String
            },
            guaranteeReleased: { type: Boolean, default: false },
            releaseDate: Date,
            collateralReturned: { type: Boolean, default: false },
            returnDate: Date
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // EXIT SETTLEMENT (Employee Exit)
    // ═══════════════════════════════════════════════════════════════
    exitSettlement: {
        employeeExiting: { type: Boolean, default: false },
        exitDate: Date,
        exitType: {
            type: String,
            enum: ['resignation', 'termination', 'retirement', 'death']
        },
        outstandingBalance: Number,
        settledFromFinalSettlement: { type: Boolean, default: false },
        settlementAmount: Number,
        settlementDate: Date,
        shortfall: {
            hasShortfall: { type: Boolean, default: false },
            shortfallAmount: Number,
            recoveryPlan: String,
            guarantorInvoked: { type: Boolean, default: false }
        },
        deathSettlement: {
            beneficiary: String,
            insuranceClaim: {
                applicable: { type: Boolean, default: false },
                claimed: { type: Boolean, default: false },
                claimAmount: Number,
                settled: { type: Boolean, default: false }
            },
            waiver: {
                balanceWaived: { type: Boolean, default: false },
                waivedAmount: Number,
                waiverReason: String,
                approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
            }
        },
        clearanceLetter: {
            issued: { type: Boolean, default: false },
            issueDate: Date,
            letterUrl: String
        },
        offboardingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Offboarding' }
    },

    // ═══════════════════════════════════════════════════════════════
    // RESTRUCTURING HISTORY
    // ═══════════════════════════════════════════════════════════════
    restructuring: [restructuringSchema],

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
            manualOverrideAllowed: { type: Boolean, default: false }
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
        failedDeductions: [{
            payrollRunId: { type: mongoose.Schema.Types.ObjectId, ref: 'PayrollRun' },
            payrollDate: Date,
            failureReason: {
                type: String,
                enum: ['insufficient_salary', 'employee_on_leave',
                    'salary_not_processed', 'manual_hold', 'other']
            },
            scheduledAmount: Number,
            resolved: { type: Boolean, default: false },
            resolutionDate: Date,
            resolutionMethod: String
        }]
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
    // COMPLETION
    // ═══════════════════════════════════════════════════════════════
    completion: {
        loanCompleted: { type: Boolean, default: false },
        completionDate: Date,
        completionMethod: {
            type: String,
            enum: ['full_repayment', 'early_settlement', 'write_off',
                'exit_settlement', 'guarantor_payment', 'legal_recovery']
        },
        finalPayment: {
            paymentDate: Date,
            paymentAmount: Number,
            paymentReference: String
        },
        clearanceLetter: {
            issued: { type: Boolean, default: false },
            issueDate: Date,
            letterUrl: String,
            delivered: { type: Boolean, default: false },
            deliveryDate: Date
        },
        guaranteeReleased: { type: Boolean, default: false },
        releaseDate: Date,
        collateralReturned: { type: Boolean, default: false },
        caseClosed: { type: Boolean, default: false },
        closedDate: Date,
        closedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    },

    // ═══════════════════════════════════════════════════════════════
    // NOTES
    // ═══════════════════════════════════════════════════════════════
    notes: {
        employeeNotes: String,
        hrNotes: String,
        financeNotes: String,
        internalNotes: String,
        concerns: String,
        specialConditions: String
    },

    // ═══════════════════════════════════════════════════════════════
    // ANALYTICS
    // ═══════════════════════════════════════════════════════════════
    analytics: {
        loanDuration: Number, // Days
        actualRepaymentPeriod: Number, // Days
        totalInterestPaid: { type: Number, default: 0 },
        totalFeesPaid: { type: Number, default: 0 },
        totalLateFeesPaid: { type: Number, default: 0 },
        totalAmountRepaid: { type: Number, default: 0 },
        effectiveInterestRate: { type: Number, default: 0 },
        paymentPerformanceScore: Number, // 0-100
        costOfLoan: { type: Number, default: 0 }
    },

    // ═══════════════════════════════════════════════════════════════
    // RELATED RECORDS
    // ═══════════════════════════════════════════════════════════════
    relatedRecords: {
        payrollDeductionIds: [String],
        guarantorEmployeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
        exitProcessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Offboarding' },
        legalCaseId: String
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
employeeLoanSchema.index({ firmId: 1, status: 1 });
employeeLoanSchema.index({ lawyerId: 1, status: 1 });
employeeLoanSchema.index({ employeeId: 1, status: 1 });
employeeLoanSchema.index({ loanId: 1 });
employeeLoanSchema.index({ loanNumber: 1 });
employeeLoanSchema.index({ status: 1, applicationDate: -1 });
employeeLoanSchema.index({ 'installments.dueDate': 1, 'installments.status': 1 });
employeeLoanSchema.index({ 'repayment.firstInstallmentDate': 1 });
employeeLoanSchema.index({ loanType: 1 });

// ═══════════════════════════════════════════════════════════════
// PRE-SAVE HOOKS
// ═══════════════════════════════════════════════════════════════

// Generate loan ID and calculate fields
employeeLoanSchema.pre('save', async function(next) {
    // Generate loan ID
    if (!this.loanId) {
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
        this.loanId = `LOAN-${year}-${String(count + 1).padStart(3, '0')}`;
        this.loanNumber = this.loanId;
    }

    // Calculate balance if not set
    if (!this.balance.originalAmount) {
        this.balance.originalAmount = this.loanAmount;
    }
    if (!this.balance.remainingBalance) {
        this.balance.remainingBalance = this.balance.originalAmount - this.balance.paidAmount;
    }

    // Calculate completion percentage
    if (this.balance.originalAmount > 0) {
        this.balance.completionPercentage = Math.round(
            (this.balance.paidAmount / this.balance.originalAmount) * 100
        );
    }

    // Calculate loan terms
    if (!this.loanTerms.principalAmount) {
        this.loanTerms.principalAmount = this.loanAmount;
    }
    if (!this.loanTerms.totalAmountPayable) {
        this.loanTerms.totalAmountPayable = this.loanAmount; // Interest-free
    }

    // Calculate last installment date
    if (this.repayment.firstInstallmentDate && this.repayment.installments && !this.repayment.lastInstallmentDate) {
        const lastDate = new Date(this.repayment.firstInstallmentDate);
        lastDate.setMonth(lastDate.getMonth() + this.repayment.installments - 1);
        this.repayment.lastInstallmentDate = lastDate;
    }

    next();
});

// ═══════════════════════════════════════════════════════════════
// INSTANCE METHODS
// ═══════════════════════════════════════════════════════════════

// Calculate next installment
employeeLoanSchema.methods.getNextInstallment = function() {
    const pendingInstallments = this.installments
        .filter(i => i.status === 'pending')
        .sort((a, b) => a.installmentNumber - b.installmentNumber);
    return pendingInstallments.length > 0 ? pendingInstallments[0] : null;
};

// Calculate overdue amount
employeeLoanSchema.methods.getOverdueAmount = function() {
    const today = new Date();
    return this.installments
        .filter(i => i.status !== 'paid' && i.status !== 'waived' && new Date(i.dueDate) < today)
        .reduce((sum, i) => sum + (i.installmentAmount - (i.paidAmount || 0)), 0);
};

// Calculate payment performance
employeeLoanSchema.methods.calculatePaymentPerformance = function() {
    const totalPayments = this.paymentPerformance.onTimePayments +
        this.paymentPerformance.latePayments;

    if (totalPayments > 0) {
        this.paymentPerformance.onTimePercentage = Math.round(
            (this.paymentPerformance.onTimePayments / totalPayments) * 100
        );
    }

    // Determine rating
    const percentage = this.paymentPerformance.onTimePercentage;
    if (percentage >= 95) {
        this.paymentPerformance.paymentRating = 'excellent';
    } else if (percentage >= 80) {
        this.paymentPerformance.paymentRating = 'good';
    } else if (percentage >= 60) {
        this.paymentPerformance.paymentRating = 'fair';
    } else {
        this.paymentPerformance.paymentRating = 'poor';
    }

    return this.paymentPerformance;
};

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

// Get loans for firm or solo lawyer
employeeLoanSchema.statics.getLoans = function(firmId, lawyerId, filters = {}) {
    const query = firmId ? { firmId } : { lawyerId };
    return this.find({ ...query, ...filters })
        .populate('employeeId', 'employeeId personalInfo.fullNameArabic personalInfo.fullNameEnglish compensation.basicSalary')
        .populate('createdBy', 'firstName lastName')
        .sort({ createdAt: -1 });
};

// Get stats
employeeLoanSchema.statics.getStats = async function(firmId, lawyerId) {
    const query = firmId ? { firmId } : { lawyerId };

    const [stats] = await this.aggregate([
        { $match: query },
        {
            $facet: {
                totalLoans: [{ $count: 'count' }],
                byStatus: [
                    { $group: { _id: '$status', count: { $sum: 1 } } }
                ],
                byType: [
                    { $group: { _id: '$loanType', count: { $sum: 1 } } }
                ],
                financials: [
                    {
                        $group: {
                            _id: null,
                            totalDisbursed: {
                                $sum: {
                                    $cond: [
                                        { $eq: ['$disbursement.disbursed', true] },
                                        '$loanAmount',
                                        0
                                    ]
                                }
                            },
                            totalOutstanding: {
                                $sum: {
                                    $cond: [
                                        { $eq: ['$status', 'active'] },
                                        '$balance.remainingBalance',
                                        0
                                    ]
                                }
                            },
                            totalRepaid: { $sum: '$balance.paidAmount' }
                        }
                    }
                ],
                thisMonth: [
                    {
                        $match: {
                            applicationDate: { $gte: new Date(new Date().setDate(1)) }
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            applications: { $sum: 1 },
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
                ]
            }
        }
    ]);

    // Get active and defaulted counts
    const activeLoans = await this.countDocuments({ ...query, status: 'active' });
    const defaultedLoans = await this.countDocuments({ ...query, status: 'defaulted' });
    const pendingApprovals = await this.countDocuments({ ...query, status: 'pending' });

    // Get overdue installments
    const today = new Date();
    const overdueLoans = await this.countDocuments({
        ...query,
        status: 'active',
        'installments': {
            $elemMatch: {
                status: { $nin: ['paid', 'waived'] },
                dueDate: { $lt: today }
            }
        }
    });

    // Calculate average repayment rate
    const completedLoans = await this.find({ ...query, status: 'completed' });
    const avgRepaymentRate = completedLoans.length > 0
        ? completedLoans.reduce((sum, l) => sum + (l.paymentPerformance?.onTimePercentage || 100), 0) / completedLoans.length
        : 100;

    return {
        totalLoans: stats.totalLoans[0]?.count || 0,
        byStatus: stats.byStatus.map(s => ({ status: s._id, count: s.count })),
        byType: stats.byType.map(t => ({ loanType: t._id, count: t.count })),
        totalDisbursed: stats.financials[0]?.totalDisbursed || 0,
        totalOutstanding: stats.financials[0]?.totalOutstanding || 0,
        totalRepaid: stats.financials[0]?.totalRepaid || 0,
        activeLoans,
        defaultedLoans,
        pendingApprovals,
        overdueLoans,
        thisMonth: {
            applications: stats.thisMonth[0]?.applications || 0,
            approvals: stats.thisMonth[0]?.approvals || 0,
            disbursements: stats.thisMonth[0]?.disbursements || 0,
            completions: 0
        },
        averageRepaymentRate: Math.round(avgRepaymentRate)
    };
};

// Get overdue installments
employeeLoanSchema.statics.getOverdueInstallments = async function(firmId, lawyerId) {
    const query = firmId ? { firmId } : { lawyerId };
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const loans = await this.find({
        ...query,
        status: 'active'
    }).populate('employeeId', 'employeeId personalInfo.fullNameArabic personalInfo.fullNameEnglish');

    const overdueList = [];

    for (const loan of loans) {
        for (const installment of loan.installments) {
            if (installment.status !== 'paid' && installment.status !== 'waived') {
                const dueDate = new Date(installment.dueDate);
                dueDate.setHours(0, 0, 0, 0);

                if (today > dueDate) {
                    const daysOverdue = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));

                    overdueList.push({
                        loanId: loan._id,
                        loanNumber: loan.loanNumber,
                        employeeId: loan.employeeId?._id,
                        employeeName: loan.employeeName,
                        employeeNameAr: loan.employeeNameAr,
                        installmentNumber: installment.installmentNumber,
                        dueDate: installment.dueDate,
                        amount: installment.installmentAmount,
                        paidAmount: installment.paidAmount || 0,
                        outstandingAmount: installment.installmentAmount - (installment.paidAmount || 0),
                        daysOverdue,
                        loanType: loan.loanType
                    });
                }
            }
        }
    }

    return overdueList.sort((a, b) => b.daysOverdue - a.daysOverdue);
};

// Get pending approvals
employeeLoanSchema.statics.getPendingApprovals = async function(firmId, lawyerId) {
    const query = firmId ? { firmId } : { lawyerId };

    return this.find({
        ...query,
        status: 'pending',
        applicationStatus: { $in: ['submitted', 'under_review'] }
    })
        .populate('employeeId', 'employeeId personalInfo.fullNameArabic personalInfo.fullNameEnglish')
        .sort({ applicationDate: 1 });
};

// Get loans by employee
employeeLoanSchema.statics.getByEmployee = async function(employeeId, firmId, lawyerId) {
    const query = firmId ? { firmId, employeeId } : { lawyerId, employeeId };

    return this.find(query)
        .populate('createdBy', 'firstName lastName')
        .sort({ createdAt: -1 });
};

// Ensure virtuals are included in JSON
employeeLoanSchema.set('toJSON', { virtuals: true });
employeeLoanSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('EmployeeLoan', employeeLoanSchema);
