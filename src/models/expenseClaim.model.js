const mongoose = require('mongoose');

/**
 * Expense Claim Model - HR Management
 * Module 12: مطالبات النفقات (Expense Claims)
 * Comprehensive expense tracking with Saudi labor law compliance
 * VAT Rate: 15% (Saudi Arabia)
 */

// ═══════════════════════════════════════════════════════════════
// EXPENSE POLICIES (Configurable)
// ═══════════════════════════════════════════════════════════════

const EXPENSE_POLICIES = {
    dailyLimits: {
        meals: 150, // SAR per day
        transportation: 200,
        accommodation: 500,
        entertainment: 300
    },
    requiresReceipt: {
        threshold: 100, // SAR - receipts required above this
        always: ['travel', 'accommodation', 'professional_services']
    },
    requiresApproval: {
        level1: 1000, // Manager approval
        level2: 5000, // Department head
        level3: 10000 // Finance director
    },
    mileageRates: {
        personal_car: 0.50, // SAR per km
        company_car: 0.25,
        rental: 0.40
    },
    travelPolicies: {
        domesticPerDiem: 350,
        internationalPerDiem: 600,
        maxHotelRate: 800,
        allowedTravelClasses: ['economy', 'business']
    },
    submissionDeadline: 30, // days after expense date
    vatRate: 15 // 15% VAT in Saudi Arabia
};

// ═══════════════════════════════════════════════════════════════
// SUB-SCHEMAS
// ═══════════════════════════════════════════════════════════════

// Line item schema for individual expenses
const lineItemSchema = new mongoose.Schema({
    lineItemId: { type: String, required: true },
    category: {
        type: String,
        enum: ['travel', 'meals', 'accommodation', 'transportation',
               'office_supplies', 'communication', 'professional_services',
               'training', 'entertainment', 'court_fees', 'legal_research',
               'client_expenses', 'mileage', 'parking', 'tolls', 'other']
    },
    description: String,
    descriptionAr: String,
    expenseDate: Date,
    vendor: String,
    vendorAr: String,
    amount: { type: Number, required: true },
    vatAmount: { type: Number, default: 0 },
    totalAmount: Number,
    currency: { type: String, default: 'SAR' },
    exchangeRate: Number,
    amountInSAR: Number,
    receiptStatus: {
        type: String,
        enum: ['attached', 'missing', 'invalid', 'verified'],
        default: 'missing'
    },
    receiptUrl: String,
    receiptNumber: String,
    isBillable: { type: Boolean, default: false },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
    clientName: String,
    caseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Case' },
    caseNumber: String,
    projectCode: String,
    costCenter: String,
    notes: String,

    // Mileage specific fields
    mileage: {
        startLocation: String,
        endLocation: String,
        distance: Number, // kilometers
        mileageRate: Number, // SAR per km
        mileageAmount: Number,
        purpose: String,
        vehicleType: { type: String, enum: ['personal', 'rental', 'company'] },
        vehicleRegistration: String
    },

    // Per diem specific fields
    perDiem: {
        perDiemType: { type: String, enum: ['breakfast', 'lunch', 'dinner', 'daily_allowance'] },
        perDiemRate: Number,
        numberOfDays: Number,
        perDiemAmount: Number,
        location: String,
        policyCompliant: { type: Boolean, default: true }
    },

    // Policy compliance
    policyCompliance: {
        withinPolicy: { type: Boolean, default: true },
        policyLimit: Number,
        amountOverLimit: Number,
        requiresJustification: { type: Boolean, default: false },
        justification: String,
        exceptionRequired: { type: Boolean, default: false },
        exceptionGranted: Boolean,
        exceptionGrantedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    },

    // Approval
    approved: { type: Boolean, default: false },
    approvedAmount: Number,
    rejectionReason: String,

    // Flags
    flagged: { type: Boolean, default: false },
    flagReason: String
}, { _id: true });

// Flight schema for travel expenses
const flightSchema = new mongoose.Schema({
    flightNumber: String,
    airline: String,
    departureCity: String,
    arrivalCity: String,
    departureDate: Date,
    departureTime: String,
    class: { type: String, enum: ['economy', 'premium_economy', 'business', 'first'] },
    ticketCost: Number,
    baggageCost: { type: Number, default: 0 },
    bookingReference: String,
    policyCompliant: { type: Boolean, default: true },
    policyClass: String,
    ticketUrl: String,
    boardingPassUrl: String
}, { _id: true });

// Accommodation schema
const accommodationSchema = new mongoose.Schema({
    hotelName: String,
    city: String,
    country: String,
    checkInDate: Date,
    checkOutDate: Date,
    nights: Number,
    roomRate: Number,
    totalCost: Number,
    bookingReference: String,
    policyCompliant: { type: Boolean, default: true },
    policyRate: Number,
    invoiceUrl: String
}, { _id: true });

// Ground transportation schema
const groundTransportSchema = new mongoose.Schema({
    type: { type: String, enum: ['taxi', 'uber', 'rental', 'company_driver', 'train', 'bus', 'metro', 'other'] },
    date: Date,
    description: String,
    from: String,
    to: String,
    amount: Number,
    purpose: String,
    receiptUrl: String
}, { _id: true });

// Mileage journey schema
const journeySchema = new mongoose.Schema({
    journeyId: String,
    journeyDate: Date,
    fromLocation: String,
    toLocation: String,
    purpose: String,
    purposeAr: String,
    distanceKm: Number,
    roundTrip: { type: Boolean, default: false },
    vehicleType: { type: String, enum: ['personal_car', 'company_car', 'rental'] },
    vehiclePlate: String,
    mileageRate: Number,
    mileageAmount: Number,
    routeVerified: { type: Boolean, default: false },
    actualDistance: Number,
    googleMapsUrl: String,
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
    clientName: String,
    caseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Case' },
    billable: { type: Boolean, default: false },
    notes: String
}, { _id: true });

// Corporate card transaction schema
const cardTransactionSchema = new mongoose.Schema({
    transactionId: String,
    cardLastFour: String,
    transactionDate: Date,
    postingDate: Date,
    merchantName: String,
    merchantCategory: String,
    originalAmount: Number,
    originalCurrency: String,
    billedAmount: Number,
    billedCurrency: String,
    isReconciled: { type: Boolean, default: false },
    reconciledLineItemId: String,
    reconciledDate: Date,
    isDisputed: { type: Boolean, default: false },
    disputeReason: String,
    status: { type: String, enum: ['matched', 'unmatched', 'disputed', 'personal'], default: 'unmatched' },
    personalTransaction: {
        isPersonal: { type: Boolean, default: false },
        reimbursementRequired: { type: Boolean, default: false },
        reimbursed: Boolean,
        reimbursementDate: Date
    },
    notes: String
}, { _id: true });

// Receipt schema
const receiptSchema = new mongoose.Schema({
    receiptId: String,
    lineItemId: String,
    fileName: String,
    fileUrl: String,
    fileType: String,
    fileSize: Number,
    uploadedOn: { type: Date, default: Date.now },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    ocrExtracted: { type: Boolean, default: false },
    extractedData: {
        vendor: String,
        amount: Number,
        date: Date,
        vatNumber: String,
        confidence: Number
    },
    verified: { type: Boolean, default: false },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    verifiedOn: Date,
    thumbnail: String
}, { _id: true });

// Approval step schema
const approvalStepSchema = new mongoose.Schema({
    stepNumber: Number,
    stepName: String,
    stepNameAr: String,
    approverRole: String, // 'manager', 'finance', 'senior_partner', 'cfo'
    approvalThreshold: {
        minimumAmount: Number,
        maximumAmount: Number
    },
    approverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approverName: String,
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'returned', 'skipped'],
        default: 'pending'
    },
    actionDate: Date,
    decision: {
        type: String,
        enum: ['approve', 'reject', 'reduce_amount', 'request_clarification']
    },
    itemApprovals: [{
        itemId: String,
        approved: Boolean,
        approvedAmount: Number,
        rejectionReason: String
    }],
    totalApprovedAmount: Number,
    comments: String,
    commentsAr: String,
    clarificationsRequested: [{
        question: String,
        response: String,
        respondedDate: Date
    }],
    attachments: [String],
    notificationSent: { type: Boolean, default: false },
    notificationDate: Date,
    responseTime: Number // Hours
}, { _id: true });

// Policy violation schema
const violationSchema = new mongoose.Schema({
    violationType: String,
    violationTypeAr: String,
    description: String,
    descriptionAr: String,
    severity: { type: String, enum: ['warning', 'violation', 'exception_required'] },
    lineItemId: String,
    amount: Number,
    requiresJustification: { type: Boolean, default: false },
    justificationProvided: Boolean,
    justification: String,
    requiresException: { type: Boolean, default: false },
    exceptionGranted: Boolean,
    exceptionGrantedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { _id: false });

// Communication schema
const communicationSchema = new mongoose.Schema({
    communicationId: String,
    communicationType: { type: String, enum: ['email', 'sms', 'system_notification', 'comment'] },
    date: { type: Date, default: Date.now },
    purpose: {
        type: String,
        enum: ['submission_confirmation', 'approval_request', 'clarification_request',
               'approval_notification', 'rejection_notification', 'payment_notification',
               'reminder', 'other']
    },
    from: String,
    to: String,
    subject: String,
    message: String,
    attachments: [String],
    read: { type: Boolean, default: false },
    readDate: Date,
    responseRequired: { type: Boolean, default: false },
    responseReceived: Boolean,
    responseDate: Date
}, { _id: true });

// Document schema
const documentSchema = new mongoose.Schema({
    documentType: {
        type: String,
        enum: ['receipt', 'invoice', 'ticket', 'boarding_pass', 'hotel_bill',
               'taxi_receipt', 'expense_report', 'approval_email', 'travel_authorization',
               'affidavit', 'other']
    },
    documentName: String,
    documentNameAr: String,
    fileUrl: String,
    fileName: String,
    fileSize: Number,
    fileType: String,
    uploadedOn: { type: Date, default: Date.now },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    linkedToItem: String, // Item ID
    verified: { type: Boolean, default: false },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    verificationDate: Date,
    ocrProcessed: { type: Boolean, default: false },
    ocrData: {
        merchantName: String,
        amount: Number,
        date: Date,
        confidence: Number
    },
    thumbnail: String
}, { _id: true });

// Attorney expenses sub-schemas
const courtFeeSchema = new mongoose.Schema({
    court: String,
    caseNumber: String,
    feeType: { type: String, enum: ['filing_fee', 'hearing_fee', 'judgment_fee', 'execution_fee', 'other'] },
    amount: Number,
    receiptNumber: String,
    receiptUrl: String,
    billableToClient: { type: Boolean, default: false }
}, { _id: true });

const professionalServiceSchema = new mongoose.Schema({
    serviceType: {
        type: String,
        enum: ['expert_witness', 'translator', 'notary', 'court_reporter',
               'process_server', 'investigator', 'appraiser', 'other']
    },
    providerName: String,
    serviceDate: Date,
    amount: Number,
    caseNumber: String,
    billableToClient: { type: Boolean, default: false },
    invoiceNumber: String,
    invoiceUrl: String
}, { _id: true });

// ═══════════════════════════════════════════════════════════════
// MAIN SCHEMA
// ═══════════════════════════════════════════════════════════════

const expenseClaimSchema = new mongoose.Schema({
    // ═══════════════════════════════════════════════════════════════
    // IDENTIFICATION
    // ═══════════════════════════════════════════════════════════════
    claimId: {
        type: String,
        unique: true,
        sparse: true
    },
    claimNumber: {
        type: String,
        unique: true,
        sparse: true
    },

    // ═══════════════════════════════════════════════════════════════
    // EMPLOYEE REFERENCE
    // ═══════════════════════════════════════════════════════════════
    employeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
        required: true
    },
    employeeNumber: String,
    employeeName: { type: String, required: true },
    employeeNameAr: String,
    department: String,
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
    jobTitle: String,
    costCenter: String,
    managerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    managerName: String,

    // Employee bank details for reimbursement
    bankDetails: {
        bankName: String,
        accountNumber: String,
        iban: String
    },

    // Corporate card info
    hasCorporateCard: { type: Boolean, default: false },
    corporateCardNumber: String,

    // ═══════════════════════════════════════════════════════════════
    // CLAIM HEADER
    // ═══════════════════════════════════════════════════════════════
    claimTitle: { type: String, required: true },
    claimTitleAr: String,
    expenseType: {
        type: String,
        enum: ['reimbursement', 'corporate_card', 'petty_cash', 'advance_settlement'],
        required: true
    },
    claimCategory: {
        type: String,
        enum: ['business_travel', 'client_related', 'professional_development',
               'office_operations', 'legal_professional', 'personal_reimbursement'],
        default: 'business_travel'
    },
    claimPeriod: {
        startDate: Date,
        endDate: Date
    },
    description: String,
    descriptionAr: String,
    businessPurpose: String,
    businessPurposeAr: String,

    // Project/case allocation
    allocation: {
        allocationType: {
            type: String,
            enum: ['project', 'case', 'client', 'department', 'cost_center', 'none'],
            default: 'none'
        },
        projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
        projectName: String,
        caseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Case' },
        caseNumber: String,
        caseName: String,
        clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
        clientName: String,
        billable: { type: Boolean, default: false },
        allocationPercentage: Number
    },

    urgency: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium'
    },

    // ═══════════════════════════════════════════════════════════════
    // LINE ITEMS
    // ═══════════════════════════════════════════════════════════════
    lineItems: [lineItemSchema],
    lineItemsCount: { type: Number, default: 0 },

    // ═══════════════════════════════════════════════════════════════
    // TOTALS
    // ═══════════════════════════════════════════════════════════════
    totals: {
        subtotal: { type: Number, default: 0 },
        vatTotal: { type: Number, default: 0 },
        grandTotal: { type: Number, default: 0 },
        currency: { type: String, default: 'SAR' },
        approvedAmount: Number,
        paidAmount: Number,
        pendingAmount: Number,

        // By category breakdown
        amountsByCategory: [{
            category: String,
            amount: Number,
            itemCount: Number
        }],

        // Corporate card vs personal
        corporateCardAmount: { type: Number, default: 0 },
        personalAmount: { type: Number, default: 0 },

        // Billable vs non-billable
        billableAmount: { type: Number, default: 0 },
        nonBillableAmount: { type: Number, default: 0 },

        // Policy compliance
        withinPolicyAmount: { type: Number, default: 0 },
        overPolicyAmount: { type: Number, default: 0 },
        exceptionsCount: { type: Number, default: 0 }
    },

    // ═══════════════════════════════════════════════════════════════
    // TRAVEL DETAILS
    // ═══════════════════════════════════════════════════════════════
    travelDetails: {
        isTravelClaim: { type: Boolean, default: false },
        tripPurpose: String,
        tripPurposeAr: String,
        tripType: { type: String, enum: ['domestic', 'international'] },
        destination: String,
        destinationCity: String,
        destinationCountry: String,
        departureCity: String,
        arrivalCity: String,
        departureDate: Date,
        returnDate: Date,
        tripDays: Number,

        // Travel approval
        travelApprovalRequired: { type: Boolean, default: false },
        travelApproved: Boolean,
        travelApprovalNumber: String,
        approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

        flights: [flightSchema],
        totalFlightCost: { type: Number, default: 0 },

        accommodation: [accommodationSchema],
        totalAccommodationCost: { type: Number, default: 0 },

        groundTransport: [groundTransportSchema],
        totalTransportationCost: { type: Number, default: 0 },

        // Per diem allowance
        perDiem: {
            applicable: { type: Boolean, default: false },
            dailyRate: Number,
            days: Number,
            totalPerDiem: Number,
            policyRate: Number,
            mealsDeducted: Number
        },

        // Visa fees
        visaFees: {
            visaCost: { type: Number, default: 0 },
            entryPermit: { type: Number, default: 0 },
            exitPermit: { type: Number, default: 0 },
            totalVisaFees: { type: Number, default: 0 },
            visaDocumentUrl: String
        },

        totalTravelCost: { type: Number, default: 0 }
    },

    // ═══════════════════════════════════════════════════════════════
    // MILEAGE CLAIM
    // ═══════════════════════════════════════════════════════════════
    mileageClaim: {
        isMileageClaim: { type: Boolean, default: false },
        journeys: [journeySchema],
        totalDistance: { type: Number, default: 0 },
        ratePerKm: Number,
        totalMileageAmount: { type: Number, default: 0 },
        vehicleType: { type: String, enum: ['personal_car', 'company_car', 'rental'] },
        vehiclePlate: String,

        // Period summary
        mileageSummary: {
            periodStart: Date,
            periodEnd: Date,
            totalJourneys: Number,
            totalDistance: Number,
            averageRatePerKm: Number,
            totalAmount: Number
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // CORPORATE CARD RECONCILIATION
    // ═══════════════════════════════════════════════════════════════
    corporateCard: {
        hasCardTransactions: { type: Boolean, default: false },
        cardNumber: String, // Last 4 digits
        cardholderName: String,
        statementPeriod: {
            startDate: Date,
            endDate: Date
        },
        transactions: [cardTransactionSchema],

        reconciliationSummary: {
            totalTransactions: { type: Number, default: 0 },
            totalAmount: { type: Number, default: 0 },
            reconciledTransactions: { type: Number, default: 0 },
            reconciledAmount: { type: Number, default: 0 },
            unreconciledTransactions: { type: Number, default: 0 },
            unreconciledAmount: { type: Number, default: 0 },
            personalTransactions: { type: Number, default: 0 },
            personalAmount: { type: Number, default: 0 },
            disputedTransactions: { type: Number, default: 0 },
            disputedAmount: { type: Number, default: 0 },
            reconciliationComplete: { type: Boolean, default: false }
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // ADVANCE SETTLEMENT
    // ═══════════════════════════════════════════════════════════════
    advanceSettlement: {
        isAdvanceSettlement: { type: Boolean, default: false },
        advanceId: { type: mongoose.Schema.Types.ObjectId, ref: 'EmployeeAdvance' },
        advanceNumber: String,
        advanceAmount: { type: Number, default: 0 },
        spentAmount: { type: Number, default: 0 },
        refundDue: { type: Number, default: 0 },
        additionalClaim: { type: Number, default: 0 },
        settled: { type: Boolean, default: false },
        settlementDate: Date
    },

    // ═══════════════════════════════════════════════════════════════
    // BILLABLE EXPENSES
    // ═══════════════════════════════════════════════════════════════
    billable: {
        isBillable: { type: Boolean, default: false },
        billableAmount: { type: Number, default: 0 },
        clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
        clientName: String,
        caseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Case' },
        caseNumber: String,
        invoiced: { type: Boolean, default: false },
        invoiceNumber: String,
        invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },
        invoiceDate: Date,
        markupPercentage: { type: Number, default: 0 },
        markupAmount: { type: Number, default: 0 },
        totalBilledAmount: { type: Number, default: 0 }
    },

    // ═══════════════════════════════════════════════════════════════
    // ATTORNEY-SPECIFIC EXPENSES
    // ═══════════════════════════════════════════════════════════════
    attorneyExpenses: {
        isAttorneyExpense: { type: Boolean, default: false },

        courtExpenses: {
            courtFees: [courtFeeSchema],
            totalCourtFees: { type: Number, default: 0 }
        },

        professionalServices: {
            services: [professionalServiceSchema],
            totalProfessionalServices: { type: Number, default: 0 }
        },

        legalResearch: {
            subscriptions: [{
                serviceName: String,
                subscriptionType: { type: String, enum: ['monthly', 'annual', 'per_use'] },
                amount: Number,
                billingPeriod: String,
                allocated: Boolean,
                allocationMethod: { type: String, enum: ['per_case', 'department', 'firm_wide'] }
            }],
            totalResearchCosts: { type: Number, default: 0 }
        },

        filingFees: {
            fees: [{
                feeType: {
                    type: String,
                    enum: ['document_filing', 'certified_copy', 'authentication',
                           'registration', 'publication', 'other']
                },
                description: String,
                amount: Number,
                officeName: String,
                caseNumber: String,
                billableToClient: { type: Boolean, default: false }
            }],
            totalFilingFees: { type: Number, default: 0 }
        },

        clientDevelopment: {
            expenses: [{
                expenseType: {
                    type: String,
                    enum: ['client_meal', 'client_entertainment', 'client_gift',
                           'conference', 'networking_event', 'sponsorship']
                },
                clientName: String,
                purpose: String,
                amount: Number,
                attendees: [String],
                numberOfAttendees: Number,
                billable: { type: Boolean, default: false }
            }],
            totalClientDevelopment: { type: Number, default: 0 }
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // STATUS
    // ═══════════════════════════════════════════════════════════════
    status: {
        type: String,
        enum: ['draft', 'submitted', 'under_review', 'pending_approval',
               'approved', 'rejected', 'processing', 'paid', 'cancelled'],
        default: 'draft'
    },

    // ═══════════════════════════════════════════════════════════════
    // VAT DETAILS
    // ═══════════════════════════════════════════════════════════════
    vatDetails: {
        vatApplicable: { type: Boolean, default: true },
        vatRate: { type: Number, default: 15 }, // 15% in Saudi Arabia
        totalVatAmount: { type: Number, default: 0 },
        vatBreakdown: [{
            vatRate: Number,
            baseAmount: Number,
            vatAmount: Number
        }],
        vatReceiptAttached: { type: Boolean, default: false },
        vendorVatNumbers: [String],

        // VAT recovery
        vatRecovery: {
            totalVATRecoverable: { type: Number, default: 0 },
            vatRecovered: { type: Boolean, default: false },
            accountingTreatment: String
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // RECEIPTS
    // ═══════════════════════════════════════════════════════════════
    receipts: [receiptSchema],
    allReceiptsAttached: { type: Boolean, default: false },
    missingReceiptsCount: { type: Number, default: 0 },
    missingReceipts: {
        count: { type: Number, default: 0 },
        totalAmount: { type: Number, default: 0 },
        items: [{
            itemId: String,
            expenseType: String,
            amount: Number,
            missingReason: { type: String, enum: ['lost', 'electronic_only', 'vendor_no_receipt', 'other'] },
            affidavitProvided: Boolean,
            affidavitUrl: String
        }],
        withinThreshold: { type: Boolean, default: true },
        thresholdAmount: Number
    },

    // ═══════════════════════════════════════════════════════════════
    // POLICY COMPLIANCE
    // ═══════════════════════════════════════════════════════════════
    policyCompliance: {
        compliant: { type: Boolean, default: true },
        complianceChecks: [{
            checkType: {
                type: String,
                enum: ['receipt_requirement', 'approval_limit', 'expense_limit',
                       'travel_class', 'hotel_rate', 'meal_allowance',
                       'per_diem_rate', 'mileage_rate', 'entertainment_limit',
                       'advance_booking', 'preferred_vendor']
            },
            checkName: String,
            checkNameAr: String,
            passed: Boolean,
            policyRequirement: String,
            actualValue: String,
            variance: Number,
            notes: String
        }],
        overallCompliant: { type: Boolean, default: true },
        violations: [violationSchema],
        violationCount: { type: Number, default: 0 },

        // Exceptions granted
        exceptions: [{
            exceptionType: String,
            exceptionReason: String,
            requestedBy: String,
            requestDate: Date,
            grantedBy: String,
            grantedDate: Date,
            conditions: [String],
            amount: Number
        }],
        exceptionsCount: { type: Number, default: 0 },

        // Advance approval
        advanceApproval: {
            required: { type: Boolean, default: false },
            obtained: Boolean,
            approvalNumber: String,
            approvalDate: Date,
            approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
        }
    },

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
            enum: ['pending', 'approved', 'partially_approved', 'rejected'],
            default: 'pending'
        },
        finalApprover: String,
        finalApprovalDate: Date,
        totalApprovedAmount: { type: Number, default: 0 },
        totalRejectedAmount: { type: Number, default: 0 },
        rejectionReason: String,
        changesRequested: String,

        // Escalation
        escalated: { type: Boolean, default: false },
        escalationDate: Date,
        escalatedTo: String,
        escalationReason: String,

        // Delegation
        delegated: [{
            originalApprover: String,
            delegatedTo: String,
            delegationDate: Date,
            reason: String
        }]
    },

    // ═══════════════════════════════════════════════════════════════
    // PAYMENT / REIMBURSEMENT
    // ═══════════════════════════════════════════════════════════════
    payment: {
        paymentMethod: {
            type: String,
            enum: ['bank_transfer', 'cash', 'check', 'payroll_addition', 'corporate_card_credit']
        },
        paymentStatus: {
            type: String,
            enum: ['pending', 'processing', 'paid', 'failed', 'cancelled'],
            default: 'pending'
        },
        paymentDate: Date,
        paymentReference: String,

        // Amounts
        approvedAmount: { type: Number, default: 0 },
        deductions: [{
            deductionType: {
                type: String,
                enum: ['advance_recovered', 'personal_card_transaction',
                       'policy_violation', 'tax_withholding', 'other']
            },
            deductionAmount: Number,
            description: String
        }],
        totalDeductions: { type: Number, default: 0 },
        netReimbursementAmount: { type: Number, default: 0 },

        // Bank transfer details
        bankTransfer: {
            bankName: String,
            accountNumber: String,
            iban: String,
            transferReference: String,
            transferDate: Date,
            transferStatus: {
                type: String,
                enum: ['pending', 'processed', 'completed', 'failed']
            },
            failureReason: String
        },

        // Check details
        check: {
            checkNumber: String,
            checkDate: Date,
            issued: { type: Boolean, default: false },
            issuedDate: Date,
            collected: { type: Boolean, default: false },
            collectionDate: Date,
            cleared: { type: Boolean, default: false },
            clearanceDate: Date
        },

        // Payroll addition
        payrollAddition: {
            payrollMonth: String,
            payrollYear: Number,
            addedToPayroll: { type: Boolean, default: false },
            payrollRunId: { type: mongoose.Schema.Types.ObjectId, ref: 'PayrollRun' },
            paymentDate: Date
        },

        // Card offset
        cardOffset: {
            applicable: { type: Boolean, default: false },
            cardBalance: Number,
            offsetAmount: Number,
            processed: { type: Boolean, default: false }
        },

        processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        processedOn: Date,

        // Confirmation
        employeeConfirmed: { type: Boolean, default: false },
        confirmationDate: Date,

        // Receipt
        reimbursementReceipt: {
            issued: { type: Boolean, default: false },
            receiptNumber: String,
            receiptUrl: String
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // ACCOUNTING INTEGRATION
    // ═══════════════════════════════════════════════════════════════
    accountingIntegration: {
        // GL coding
        glCoding: [{
            itemId: String,
            glAccount: String,
            glAccountName: String,
            costCenter: String,
            department: String,
            project: String,
            amount: Number,
            vatCode: String,
            vatAmount: Number
        }],

        // Journal entry
        journalEntry: {
            required: { type: Boolean, default: true },
            generated: { type: Boolean, default: false },
            generatedDate: Date,
            journalEntryNumber: String,
            journalEntryId: { type: mongoose.Schema.Types.ObjectId, ref: 'JournalEntry' },
            journalEntryDate: Date,
            entries: [{
                accountCode: String,
                accountName: String,
                debit: Number,
                credit: Number,
                description: String
            }],
            totalDebit: { type: Number, default: 0 },
            totalCredit: { type: Number, default: 0 },
            balanced: { type: Boolean, default: false },
            posted: { type: Boolean, default: false },
            postingDate: Date,
            postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
        },

        // Invoice tracking (for billable expenses)
        invoiceTracking: {
            billableExpenses: { type: Number, default: 0 },
            invoiced: { type: Boolean, default: false },
            invoices: [{
                invoiceNumber: String,
                invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },
                invoiceDate: Date,
                clientName: String,
                expenseItems: [String], // Item IDs
                totalBilled: Number,
                paymentReceived: Boolean,
                paymentDate: Date
            }]
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // TAX COMPLIANCE
    // ═══════════════════════════════════════════════════════════════
    taxCompliance: {
        vatSummary: {
            totalVATAmount: { type: Number, default: 0 },
            vatByRate: [{
                rate: Number,
                baseAmount: Number,
                vatAmount: Number
            }],
            vatRecoverable: { type: Number, default: 0 },
            vatNonRecoverable: { type: Number, default: 0 },
            vatReturnPeriod: String
        },

        withholdingTax: {
            applicable: { type: Boolean, default: false },
            taxRate: Number,
            taxAmount: Number,
            certificateRequired: { type: Boolean, default: false },
            certificateProvided: Boolean,
            certificateUrl: String
        },

        internationalTax: {
            foreignExpenses: { type: Boolean, default: false },
            countries: [{
                country: String,
                amount: Number,
                taxWithheld: Number,
                treatyApplicable: Boolean
            }]
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // DATES
    // ═══════════════════════════════════════════════════════════════
    submissionDate: Date,
    reviewDate: Date,
    approvalDate: Date,
    paymentDate: Date,

    // ═══════════════════════════════════════════════════════════════
    // DOCUMENTS
    // ═══════════════════════════════════════════════════════════════
    documents: [documentSchema],

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
        managerComments: String,
        financeNotes: String,
        financeComments: String,
        internalNotes: String,
        itemComments: [{
            itemId: String,
            commentBy: String,
            commentDate: Date,
            comment: String,
            visibility: { type: String, enum: ['internal', 'employee', 'all'], default: 'all' }
        }]
    },

    // ═══════════════════════════════════════════════════════════════
    // AUDIT TRAIL
    // ═══════════════════════════════════════════════════════════════
    auditTrail: {
        submission: {
            submittedOn: Date,
            submittedBy: String,
            submissionMethod: { type: String, enum: ['web', 'mobile', 'email', 'paper'] },
            ipAddress: String,
            deviceInfo: String
        },
        modifications: [{
            modificationId: String,
            modifiedOn: Date,
            modifiedBy: String,
            modificationType: {
                type: String,
                enum: ['edit', 'add_item', 'remove_item', 'update_amount',
                       'add_receipt', 'status_change']
            },
            field: String,
            oldValue: mongoose.Schema.Types.Mixed,
            newValue: mongoose.Schema.Types.Mixed,
            reason: String,
            approvedBy: String
        }],
        statusHistory: [{
            status: String,
            changedOn: Date,
            changedBy: String,
            reason: String,
            duration: Number // Time in this status (hours)
        }],
        approvalsLog: [{
            stepNumber: Number,
            approver: String,
            decision: String,
            actionDate: Date,
            comments: String
        }],
        paymentLog: [{
            action: String,
            actionDate: Date,
            actionBy: String,
            amount: Number,
            reference: String,
            status: String
        }]
    },

    // ═══════════════════════════════════════════════════════════════
    // ANALYTICS
    // ═══════════════════════════════════════════════════════════════
    analytics: {
        submissionToApprovalTime: Number, // Hours
        approvalToPaymentTime: Number, // Hours
        totalProcessingTime: Number, // Hours
        policyComplianceRate: Number, // %
        receiptComplianceRate: Number, // %
        firstTimeApprovalRate: { type: Boolean, default: false },
        numberOfRevisions: { type: Number, default: 0 },
        averageExpenseAmount: Number,
        largestExpenseAmount: Number,
        vsEmployeeAverage: {
            higherThan: Boolean,
            percentageDifference: Number
        },
        vsDepartmentAverage: {
            higherThan: Boolean,
            percentageDifference: Number
        },
        isRecurring: { type: Boolean, default: false },
        frequency: String
    },

    // ═══════════════════════════════════════════════════════════════
    // RELATED RECORDS
    // ═══════════════════════════════════════════════════════════════
    relatedRecords: {
        employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
        travelRequestId: String,
        corporateCardStatementId: String,
        advanceId: { type: mongoose.Schema.Types.ObjectId, ref: 'EmployeeAdvance' },
        projectIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Project' }],
        caseIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Case' }],
        clientIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Client' }],
        invoiceIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' }],
        payrollRunId: { type: mongoose.Schema.Types.ObjectId, ref: 'PayrollRun' }
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
    createdOn: { type: Date, default: Date.now },
    lastModifiedOn: Date,
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
expenseClaimSchema.index({ firmId: 1, status: 1 });
expenseClaimSchema.index({ lawyerId: 1, status: 1 });
expenseClaimSchema.index({ claimNumber: 1 });
expenseClaimSchema.index({ claimId: 1 });
expenseClaimSchema.index({ employeeId: 1, status: 1 });
expenseClaimSchema.index({ status: 1 });
expenseClaimSchema.index({ expenseType: 1 });
expenseClaimSchema.index({ 'claimPeriod.startDate': 1, 'claimPeriod.endDate': 1 });
expenseClaimSchema.index({ 'totals.grandTotal': 1 });
expenseClaimSchema.index({ submissionDate: 1 });
expenseClaimSchema.index({ 'billable.clientId': 1 });
expenseClaimSchema.index({ 'approvalWorkflow.finalStatus': 1 });
expenseClaimSchema.index({ 'payment.paymentStatus': 1 });

// ═══════════════════════════════════════════════════════════════
// PRE-SAVE HOOKS
// ═══════════════════════════════════════════════════════════════

// Generate claim ID and calculate totals
expenseClaimSchema.pre('save', async function(next) {
    // Generate claim ID: EXP-{YYYYMM}-{####}
    if (!this.claimId) {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');

        const count = await this.constructor.countDocuments({
            $or: [
                { firmId: this.firmId },
                { lawyerId: this.lawyerId }
            ],
            createdAt: {
                $gte: new Date(year, now.getMonth(), 1),
                $lt: new Date(year, now.getMonth() + 1, 1)
            }
        });

        this.claimId = `EXP-${year}${month}-${String(count + 1).padStart(4, '0')}`;
        this.claimNumber = this.claimId;
    }

    // Calculate line items count
    this.lineItemsCount = this.lineItems?.length || 0;

    // Calculate totals from line items
    if (this.lineItems && this.lineItems.length > 0) {
        let subtotal = 0;
        let vatTotal = 0;
        let corporateCardAmount = 0;
        let personalAmount = 0;
        let billableAmount = 0;
        let nonBillableAmount = 0;
        let missingReceiptsCount = 0;
        const categoryAmounts = {};

        for (const item of this.lineItems) {
            // Calculate item totals
            const itemAmount = item.amount || 0;
            const itemVat = item.vatAmount || 0;
            item.totalAmount = itemAmount + itemVat;

            // Convert to SAR if needed
            if (item.currency && item.currency !== 'SAR' && item.exchangeRate) {
                item.amountInSAR = item.totalAmount * item.exchangeRate;
            } else {
                item.amountInSAR = item.totalAmount;
            }

            subtotal += itemAmount;
            vatTotal += itemVat;

            // Track by category
            const category = item.category || 'other';
            if (!categoryAmounts[category]) {
                categoryAmounts[category] = { amount: 0, count: 0 };
            }
            categoryAmounts[category].amount += item.totalAmount;
            categoryAmounts[category].count += 1;

            // Track billable
            if (item.isBillable) {
                billableAmount += item.totalAmount;
            } else {
                nonBillableAmount += item.totalAmount;
            }

            // Track missing receipts
            if (item.receiptStatus === 'missing' && itemAmount > EXPENSE_POLICIES.requiresReceipt.threshold) {
                missingReceiptsCount += 1;
            }
        }

        this.totals.subtotal = subtotal;
        this.totals.vatTotal = vatTotal;
        this.totals.grandTotal = subtotal + vatTotal;
        this.totals.billableAmount = billableAmount;
        this.totals.nonBillableAmount = nonBillableAmount;
        this.totals.amountsByCategory = Object.entries(categoryAmounts).map(([category, data]) => ({
            category,
            amount: data.amount,
            itemCount: data.count
        }));

        this.missingReceiptsCount = missingReceiptsCount;
        this.allReceiptsAttached = missingReceiptsCount === 0;

        // Calculate pending amount
        this.totals.pendingAmount = this.totals.grandTotal - (this.totals.paidAmount || 0);
    }

    // Calculate travel totals
    if (this.travelDetails?.isTravelClaim) {
        this.travelDetails.totalFlightCost = (this.travelDetails.flights || [])
            .reduce((sum, f) => sum + (f.ticketCost || 0) + (f.baggageCost || 0), 0);

        this.travelDetails.totalAccommodationCost = (this.travelDetails.accommodation || [])
            .reduce((sum, a) => sum + (a.totalCost || 0), 0);

        this.travelDetails.totalTransportationCost = (this.travelDetails.groundTransport || [])
            .reduce((sum, t) => sum + (t.amount || 0), 0);

        this.travelDetails.totalTravelCost =
            this.travelDetails.totalFlightCost +
            this.travelDetails.totalAccommodationCost +
            this.travelDetails.totalTransportationCost +
            (this.travelDetails.perDiem?.totalPerDiem || 0) +
            (this.travelDetails.visaFees?.totalVisaFees || 0);
    }

    // Calculate mileage totals
    if (this.mileageClaim?.isMileageClaim) {
        const journeys = this.mileageClaim.journeys || [];
        this.mileageClaim.totalDistance = journeys.reduce((sum, j) => {
            const distance = j.distanceKm || 0;
            return sum + (j.roundTrip ? distance * 2 : distance);
        }, 0);

        this.mileageClaim.totalMileageAmount = journeys.reduce((sum, j) => {
            return sum + (j.mileageAmount || 0);
        }, 0);
    }

    // Calculate corporate card reconciliation
    if (this.corporateCard?.hasCardTransactions) {
        const transactions = this.corporateCard.transactions || [];
        const summary = {
            totalTransactions: transactions.length,
            totalAmount: 0,
            reconciledTransactions: 0,
            reconciledAmount: 0,
            unreconciledTransactions: 0,
            unreconciledAmount: 0,
            personalTransactions: 0,
            personalAmount: 0,
            disputedTransactions: 0,
            disputedAmount: 0,
            reconciliationComplete: false
        };

        for (const txn of transactions) {
            summary.totalAmount += txn.billedAmount || 0;

            if (txn.isReconciled) {
                summary.reconciledTransactions += 1;
                summary.reconciledAmount += txn.billedAmount || 0;
            } else {
                summary.unreconciledTransactions += 1;
                summary.unreconciledAmount += txn.billedAmount || 0;
            }

            if (txn.personalTransaction?.isPersonal) {
                summary.personalTransactions += 1;
                summary.personalAmount += txn.billedAmount || 0;
            }

            if (txn.isDisputed) {
                summary.disputedTransactions += 1;
                summary.disputedAmount += txn.billedAmount || 0;
            }
        }

        summary.reconciliationComplete = summary.unreconciledTransactions === 0;
        this.corporateCard.reconciliationSummary = summary;
    }

    // Calculate advance settlement
    if (this.advanceSettlement?.isAdvanceSettlement) {
        const spent = this.advanceSettlement.spentAmount || 0;
        const advance = this.advanceSettlement.advanceAmount || 0;

        if (spent <= advance) {
            this.advanceSettlement.refundDue = advance - spent;
            this.advanceSettlement.additionalClaim = 0;
        } else {
            this.advanceSettlement.refundDue = 0;
            this.advanceSettlement.additionalClaim = spent - advance;
        }
    }

    // Calculate VAT details
    this.vatDetails.totalVatAmount = this.totals.vatTotal;

    // Update last modified
    this.lastModifiedOn = new Date();

    next();
});

// ═══════════════════════════════════════════════════════════════
// INSTANCE METHODS
// ═══════════════════════════════════════════════════════════════

// Calculate policy compliance
expenseClaimSchema.methods.checkPolicyCompliance = function() {
    const violations = [];

    for (const item of this.lineItems || []) {
        // Check receipt requirement
        if (item.amount > EXPENSE_POLICIES.requiresReceipt.threshold &&
            item.receiptStatus === 'missing') {
            violations.push({
                violationType: 'missing_receipt',
                description: `Receipt required for expenses over ${EXPENSE_POLICIES.requiresReceipt.threshold} SAR`,
                severity: 'violation',
                lineItemId: item.lineItemId,
                amount: item.amount
            });
        }

        // Check daily limits
        const category = item.category;
        if (EXPENSE_POLICIES.dailyLimits[category]) {
            const limit = EXPENSE_POLICIES.dailyLimits[category];
            if (item.amount > limit) {
                violations.push({
                    violationType: 'daily_limit_exceeded',
                    description: `${category} expense exceeds daily limit of ${limit} SAR`,
                    severity: 'warning',
                    lineItemId: item.lineItemId,
                    amount: item.amount - limit
                });
            }
        }
    }

    this.policyCompliance.violations = violations;
    this.policyCompliance.violationCount = violations.length;
    this.policyCompliance.compliant = violations.length === 0;

    return this.policyCompliance;
};

// Get approval level required based on amount
expenseClaimSchema.methods.getRequiredApprovalLevel = function() {
    const amount = this.totals.grandTotal || 0;

    if (amount >= EXPENSE_POLICIES.requiresApproval.level3) {
        return { level: 3, role: 'finance_director', amount: EXPENSE_POLICIES.requiresApproval.level3 };
    } else if (amount >= EXPENSE_POLICIES.requiresApproval.level2) {
        return { level: 2, role: 'department_head', amount: EXPENSE_POLICIES.requiresApproval.level2 };
    } else if (amount >= EXPENSE_POLICIES.requiresApproval.level1) {
        return { level: 1, role: 'manager', amount: EXPENSE_POLICIES.requiresApproval.level1 };
    }
    return { level: 0, role: 'auto_approve', amount: 0 };
};

// Calculate mileage amount
expenseClaimSchema.methods.calculateMileage = function(vehicleType, distanceKm) {
    const rate = EXPENSE_POLICIES.mileageRates[vehicleType] || EXPENSE_POLICIES.mileageRates.personal_car;
    return distanceKm * rate;
};

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

// Get claims for firm or solo lawyer
expenseClaimSchema.statics.getClaims = function(firmId, lawyerId, filters = {}) {
    const query = firmId ? { firmId } : { lawyerId };
    return this.find({ ...query, ...filters })
        .populate('employeeId', 'employeeId personalInfo.fullNameArabic personalInfo.fullNameEnglish')
        .populate('createdBy', 'firstName lastName')
        .sort({ createdAt: -1 });
};

// Get stats
expenseClaimSchema.statics.getStats = async function(firmId, lawyerId) {
    const query = firmId ? { firmId } : { lawyerId };

    const [stats] = await this.aggregate([
        { $match: query },
        {
            $facet: {
                totalClaims: [{ $count: 'count' }],
                byStatus: [
                    { $group: { _id: '$status', count: { $sum: 1 }, amount: { $sum: '$totals.grandTotal' } } }
                ],
                byType: [
                    { $group: { _id: '$expenseType', count: { $sum: 1 }, amount: { $sum: '$totals.grandTotal' } } }
                ],
                financials: [
                    {
                        $group: {
                            _id: null,
                            totalClaimed: { $sum: '$totals.grandTotal' },
                            totalApproved: { $sum: '$totals.approvedAmount' },
                            totalPaid: { $sum: '$totals.paidAmount' },
                            totalPending: {
                                $sum: {
                                    $cond: [
                                        { $in: ['$status', ['submitted', 'under_review', 'pending_approval']] },
                                        '$totals.grandTotal',
                                        0
                                    ]
                                }
                            },
                            totalBillable: { $sum: '$totals.billableAmount' }
                        }
                    }
                ],
                thisMonth: [
                    {
                        $match: {
                            submissionDate: { $gte: new Date(new Date().setDate(1)) }
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            submissions: { $sum: 1 },
                            amount: { $sum: '$totals.grandTotal' },
                            approvals: {
                                $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] }
                            },
                            payments: {
                                $sum: { $cond: [{ $eq: ['$status', 'paid'] }, 1, 0] }
                            }
                        }
                    }
                ],
                byCategory: [
                    { $unwind: '$totals.amountsByCategory' },
                    {
                        $group: {
                            _id: '$totals.amountsByCategory.category',
                            amount: { $sum: '$totals.amountsByCategory.amount' },
                            count: { $sum: '$totals.amountsByCategory.itemCount' }
                        }
                    }
                ]
            }
        }
    ]);

    // Get pending approvals count
    const pendingApprovals = await this.countDocuments({
        ...query,
        status: { $in: ['submitted', 'under_review', 'pending_approval'] }
    });

    // Get pending payments count
    const pendingPayments = await this.countDocuments({
        ...query,
        status: 'approved',
        'payment.paymentStatus': { $ne: 'paid' }
    });

    return {
        totalClaims: stats.totalClaims[0]?.count || 0,
        byStatus: stats.byStatus.map(s => ({ status: s._id, count: s.count, amount: s.amount })),
        byType: stats.byType.map(t => ({ expenseType: t._id, count: t.count, amount: t.amount })),
        byCategory: stats.byCategory.map(c => ({ category: c._id, count: c.count, amount: c.amount })),
        totalClaimed: stats.financials[0]?.totalClaimed || 0,
        totalApproved: stats.financials[0]?.totalApproved || 0,
        totalPaid: stats.financials[0]?.totalPaid || 0,
        totalPending: stats.financials[0]?.totalPending || 0,
        totalBillable: stats.financials[0]?.totalBillable || 0,
        pendingApprovals,
        pendingPayments,
        thisMonth: {
            submissions: stats.thisMonth[0]?.submissions || 0,
            amount: stats.thisMonth[0]?.amount || 0,
            approvals: stats.thisMonth[0]?.approvals || 0,
            payments: stats.thisMonth[0]?.payments || 0
        }
    };
};

// Get pending approvals
expenseClaimSchema.statics.getPendingApprovals = async function(firmId, lawyerId) {
    const query = firmId ? { firmId } : { lawyerId };

    return this.find({
        ...query,
        status: { $in: ['submitted', 'under_review', 'pending_approval'] }
    })
        .populate('employeeId', 'employeeId personalInfo.fullNameArabic personalInfo.fullNameEnglish')
        .sort({ submissionDate: 1 });
};

// Get pending payments
expenseClaimSchema.statics.getPendingPayments = async function(firmId, lawyerId) {
    const query = firmId ? { firmId } : { lawyerId };

    return this.find({
        ...query,
        status: 'approved',
        'payment.paymentStatus': { $in: ['pending', 'processing'] }
    })
        .populate('employeeId', 'employeeId personalInfo.fullNameArabic personalInfo.fullNameEnglish')
        .sort({ approvalDate: 1 });
};

// Get claims by employee
expenseClaimSchema.statics.getByEmployee = async function(employeeId, firmId, lawyerId) {
    const query = firmId ? { firmId, employeeId } : { lawyerId, employeeId };

    return this.find(query)
        .populate('createdBy', 'firstName lastName')
        .sort({ createdAt: -1 });
};

// Get mileage rates
expenseClaimSchema.statics.getMileageRates = function() {
    return EXPENSE_POLICIES.mileageRates;
};

// Get expense policies
expenseClaimSchema.statics.getPolicies = function() {
    return EXPENSE_POLICIES;
};

// Ensure virtuals are included in JSON
expenseClaimSchema.set('toJSON', { virtuals: true });
expenseClaimSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('ExpenseClaim', expenseClaimSchema);
