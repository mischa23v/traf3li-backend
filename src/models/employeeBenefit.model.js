const mongoose = require('mongoose');

// ═══════════════════════════════════════════════════════════════
// SUB-SCHEMAS
// ═══════════════════════════════════════════════════════════════

// Provider Contact Schema
const providerContactSchema = new mongoose.Schema({
    contactPerson: String,
    email: String,
    phone: String,
    website: String,
    customerServiceNumber: String,
    emergencyNumber: String
}, { _id: false });

// Covered Dependent Schema
const coveredDependentSchema = new mongoose.Schema({
    memberId: String,
    name: { type: String, required: false },
    nameAr: String,
    relationship: {
        type: String,
        enum: ['spouse', 'child', 'parent', 'other'],
        required: false
    },
    dateOfBirth: Date,
    age: Number,
    gender: { type: String, enum: ['male', 'female'] },
    nationalId: String,
    startDate: Date,
    endDate: Date,
    active: { type: Boolean, default: true },
    documentsVerified: { type: Boolean, default: false },
    verificationDate: Date,
    documents: [{
        documentType: {
            type: String,
            enum: ['birth_certificate', 'marriage_certificate', 'family_card', 'student_id', 'disability_certificate', 'other']
        },
        documentUrl: String,
        expiryDate: Date,
        verified: { type: Boolean, default: false }
    }]
}, { _id: true });

// Beneficiary Schema (for life insurance, pension)
const beneficiarySchema = new mongoose.Schema({
    beneficiaryId: String,
    beneficiaryType: {
        type: String,
        enum: ['primary', 'contingent'],
        required: false
    },
    name: { type: String, required: false },
    nameAr: String,
    relationship: String,
    dateOfBirth: Date,
    nationalId: String,
    contactPhone: String,
    contactEmail: String,
    address: String,
    percentage: { type: Number, min: 0, max: 100, required: false },
    designation: Number,
    documents: [{
        documentType: String,
        documentUrl: String,
        verified: { type: Boolean, default: false }
    }]
}, { _id: true });

// Health Insurance Claim Schema
const healthClaimSchema = new mongoose.Schema({
    claimId: String,
    claimNumber: String,
    claimDate: Date,
    serviceDate: Date,
    claimType: {
        type: String,
        enum: ['inpatient', 'outpatient', 'emergency', 'pharmacy', 'dental', 'optical', 'maternity', 'other']
    },
    provider: String,
    diagnosis: String,
    claimedAmount: { type: Number, default: 0 },
    approvedAmount: Number,
    paidAmount: Number,
    employeeShare: Number,
    insuranceShare: Number,
    claimStatus: {
        type: String,
        enum: ['submitted', 'under_review', 'approved', 'partially_approved', 'rejected', 'paid'],
        default: 'submitted'
    },
    statusDate: Date,
    rejectionReason: String,
    claimDocument: String,
    approvalNumber: String,
    paidDate: Date
}, { _id: true });

// Pre-Authorization Schema
const preAuthorizationSchema = new mongoose.Schema({
    authId: String,
    authNumber: String,
    authDate: Date,
    procedure: String,
    provider: String,
    estimatedCost: Number,
    approvedAmount: Number,
    validFrom: Date,
    validUntil: Date,
    used: { type: Boolean, default: false },
    usedDate: Date,
    status: {
        type: String,
        enum: ['pending', 'approved', 'denied', 'expired'],
        default: 'pending'
    }
}, { _id: true });

// Qualifying Event Schema
const qualifyingEventSchema = new mongoose.Schema({
    eventId: String,
    eventType: {
        type: String,
        enum: ['marriage', 'birth', 'adoption', 'death', 'divorce', 'dependent_age_out',
               'employment_status_change', 'loss_of_other_coverage', 'residence_change', 'other']
    },
    eventDate: Date,
    reportedDate: Date,
    eventDescription: String,
    documentsRequired: { type: Boolean, default: false },
    documents: [{
        documentType: String,
        documentUrl: String,
        verified: { type: Boolean, default: false },
        verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        verificationDate: Date
    }],
    allowsBenefitChange: { type: Boolean, default: true },
    changeDeadline: Date,
    changesMade: [{
        changeType: {
            type: String,
            enum: ['add_dependent', 'remove_dependent', 'change_coverage_level',
                   'enroll_new_benefit', 'terminate_benefit']
        },
        changeDescription: String,
        effectiveDate: Date,
        previousCost: Number,
        newCost: Number
    }],
    processed: { type: Boolean, default: false },
    processedDate: Date,
    processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { _id: true });

// Communication Schema
const communicationSchema = new mongoose.Schema({
    communicationId: String,
    communicationType: {
        type: String,
        enum: ['email', 'sms', 'mail', 'portal_notification']
    },
    date: { type: Date, default: Date.now },
    purpose: {
        type: String,
        enum: ['enrollment_confirmation', 'card_delivery', 'premium_change', 'coverage_change',
               'renewal_notice', 'termination_notice', 'claim_status', 'document_request', 'other']
    },
    subject: String,
    message: String,
    attachments: [String],
    sent: { type: Boolean, default: false },
    sentDate: Date,
    delivered: { type: Boolean, default: false },
    read: { type: Boolean, default: false },
    readDate: Date
}, { _id: true });

// Document Schema
const benefitDocumentSchema = new mongoose.Schema({
    documentType: {
        type: String,
        enum: ['enrollment_form', 'beneficiary_designation', 'insurance_card', 'policy_document',
               'summary_of_benefits', 'claim_form', 'medical_certificate', 'dependent_proof',
               'termination_notice', 'continuation_notice', 'receipt', 'other']
    },
    documentName: String,
    documentNameAr: String,
    fileUrl: String,
    fileName: String,
    fileSize: Number,
    uploadedOn: { type: Date, default: Date.now },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    expiryDate: Date,
    verified: { type: Boolean, default: false },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    verificationDate: Date
}, { _id: true });

// ═══════════════════════════════════════════════════════════════
// MAIN SCHEMA
// ═══════════════════════════════════════════════════════════════

const employeeBenefitSchema = new mongoose.Schema({
    // ==================== IDENTIFICATION ====================
    benefitEnrollmentId: { type: String, unique: true, sparse: true },
    enrollmentNumber: String,

    // ==================== MULTI-TENANCY ====================
    firmId: { type: mongoose.Schema.Types.ObjectId, ref: 'Firm', index: true },
    lawyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },

    // ==================== EMPLOYEE REFERENCE ====================
    employeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
        required: false,
        index: true
    },
    employeeNumber: String,
    employeeName: { type: String, required: false },
    employeeNameAr: String,
    department: String,

    // ==================== BENEFIT DETAILS ====================
    benefitType: {
        type: String,
        enum: ['health_insurance', 'life_insurance', 'disability_insurance', 'dental_insurance',
               'vision_insurance', 'pension', 'savings_plan', 'education_allowance',
               'transportation', 'housing', 'meal_allowance', 'mobile_allowance',
               'gym_membership', 'professional_membership', 'other'],
        required: false,
        index: true
    },
    benefitCategory: {
        type: String,
        enum: ['insurance', 'allowance', 'retirement', 'perks', 'flexible_benefits', 'mandatory', 'voluntary'],
        required: false
    },
    benefitName: { type: String, required: false },
    benefitNameAr: String,
    benefitDescription: String,
    benefitDescriptionAr: String,

    // ==================== PLAN DETAILS ====================
    planId: String,
    planCode: String,
    planName: String,
    planNameAr: String,

    // ==================== PROVIDER ====================
    providerType: {
        type: String,
        enum: ['insurance_company', 'fund', 'company_managed', 'third_party']
    },
    providerName: String,
    providerNameAr: String,
    providerContact: providerContactSchema,
    contractNumber: String,
    contractStartDate: Date,
    contractEndDate: Date,
    policyNumber: String,

    // ==================== ENROLLMENT ====================
    enrollmentType: {
        type: String,
        enum: ['new_hire', 'annual_enrollment', 'qualifying_event', 'mid_year_change', 're_enrollment'],
        required: false
    },
    enrollmentDate: { type: Date, required: false },
    effectiveDate: { type: Date, required: false, index: true },
    coverageEndDate: Date,
    enrolledBy: {
        type: String,
        enum: ['employee', 'hr', 'auto_enrollment'],
        default: 'hr'
    },

    // ==================== COVERAGE LEVEL ====================
    coverageLevel: {
        type: String,
        enum: ['employee_only', 'employee_spouse', 'employee_children', 'employee_family', 'employee_parents']
    },

    // ==================== COVERED DEPENDENTS ====================
    coveredDependents: [coveredDependentSchema],

    // ==================== BENEFICIARIES ====================
    beneficiaries: [beneficiarySchema],
    totalBeneficiaryPercentage: { type: Number, default: 0 },

    // ==================== STATUS ====================
    status: {
        type: String,
        enum: ['pending', 'active', 'suspended', 'terminated', 'expired'],
        default: 'pending',
        index: true
    },
    statusDate: { type: Date, default: Date.now },
    statusReason: String,

    // ==================== COST ====================
    employerCost: { type: Number, required: false, default: 0 },
    employeeCost: { type: Number, required: false, default: 0 },
    totalCost: Number,
    currency: { type: String, default: 'SAR' },

    costBreakdown: {
        employeeCost: {
            monthlyDeduction: Number,
            annualCost: Number,
            preTaxDeduction: { type: Boolean, default: false },
            deductedFromPayroll: { type: Boolean, default: true },
            ytdDeductions: { type: Number, default: 0 }
        },
        employerCost: {
            monthlyCost: Number,
            annualCost: Number,
            ytdCost: { type: Number, default: 0 }
        },
        totalBenefitValue: Number,
        employerSharePercentage: Number,
        employeeSharePercentage: Number
    },

    // ==================== HEALTH INSURANCE DETAILS ====================
    healthInsurance: {
        insuranceProvider: String,
        policyNumber: String,
        groupNumber: String,
        memberNumber: String,
        memberId: String,
        cardNumber: String,
        cardIssueDate: Date,
        cardExpiryDate: Date,
        coverageType: { type: String, enum: ['individual', 'family'] },
        planType: { type: String, enum: ['basic', 'standard', 'premium', 'executive'] },
        networkType: { type: String, enum: ['in_network', 'out_of_network', 'both'] },

        // Cost sharing
        annualDeductible: Number,
        deductibleMet: { type: Number, default: 0 },
        deductibleRemaining: Number,
        copayPercentage: Number,
        outOfPocketMaximum: Number,
        outOfPocketMet: { type: Number, default: 0 },
        annualMaximum: Number,

        // Coverage details
        inpatientCoverage: { type: Boolean, default: true },
        inpatientLimit: Number,
        roomType: { type: String, enum: ['shared', 'semi_private', 'private', 'suite'] },
        outpatientCoverage: { type: Boolean, default: true },
        outpatientLimit: Number,
        emergencyCoverage: { type: Boolean, default: true },
        emergencyLimit: Number,
        maternityCoverage: { type: Boolean, default: false },
        maternityLimit: Number,
        maternityWaitingPeriod: Number,
        dentalCoverage: { type: Boolean, default: false },
        dentalLimit: Number,
        visionCoverage: { type: Boolean, default: false },
        visionLimit: Number,
        pharmacyCoverage: { type: Boolean, default: true },
        pharmacyLimit: Number,
        prescriptionCopay: Number,
        mentalHealthCoverage: { type: Boolean, default: false },
        therapySessions: Number,
        chronicDiseaseCoverage: { type: Boolean, default: true },
        preExistingConditions: { type: Boolean, default: false },
        preExistingWaitingPeriod: Number,
        preventiveCare: { type: Boolean, default: true },
        geographicCoverage: { type: String, enum: ['saudi_only', 'gcc', 'mena', 'worldwide'], default: 'saudi_only' },
        emergencyTravelCoverage: { type: Boolean, default: false },

        preAuthRequired: { type: Boolean, default: true },
        preAuthorizations: [preAuthorizationSchema],
        claims: [healthClaimSchema],

        totalClaimsSubmitted: { type: Number, default: 0 },
        totalClaimsPaid: { type: Number, default: 0 },
        totalClaimsAmount: { type: Number, default: 0 },

        // Insurance card
        insuranceCard: {
            physicalCardIssued: { type: Boolean, default: false },
            cardUrl: String,
            digitalCardAvailable: { type: Boolean, default: false },
            digitalCardUrl: String,
            qrCode: String,
            delivered: { type: Boolean, default: false },
            deliveryDate: Date
        }
    },

    // ==================== LIFE INSURANCE DETAILS ====================
    lifeInsurance: {
        insuranceProvider: String,
        policyNumber: String,
        certificateNumber: String,
        coverageAmount: Number,
        coverageMultiple: Number,
        coverageType: { type: String, enum: ['term', 'whole_life', 'group_term'] },

        // Additional benefits
        accidentalDeath: { type: Boolean, default: false },
        accidentalDeathMultiplier: Number,
        dismemberment: { type: Boolean, default: false },
        dismembermentSchedule: [{
            injury: String,
            percentage: Number
        }],
        criticalIllness: { type: Boolean, default: false },
        criticalIllnessBenefit: Number,
        terminalIllness: { type: Boolean, default: false },
        terminalIllnessAdvance: Number,
        waiversOfPremium: { type: Boolean, default: false },

        primaryBeneficiaries: { type: Number, default: 0 },
        contingentBeneficiaries: { type: Number, default: 0 },

        claims: [{
            claimId: String,
            claimDate: Date,
            eventDate: Date,
            claimType: {
                type: String,
                enum: ['death', 'accidental_death', 'critical_illness', 'terminal_illness', 'dismemberment']
            },
            claimAmount: Number,
            claimant: String,
            relationship: String,
            claimStatus: {
                type: String,
                enum: ['submitted', 'under_review', 'approved', 'paid', 'denied'],
                default: 'submitted'
            },
            documents: [String],
            approvedAmount: Number,
            paidAmount: Number,
            paidDate: Date,
            denialReason: String
        }]
    },

    // ==================== PENSION/RETIREMENT PLAN ====================
    pensionPlan: {
        planType: { type: String, enum: ['defined_benefit', 'defined_contribution', 'hybrid'] },
        planName: String,

        // Vesting
        vesting: {
            vestingSchedule: { type: String, enum: ['immediate', 'graded', 'cliff'] },
            vestingPeriod: Number,
            vestedPercentage: { type: Number, default: 0 },
            fullyVestedDate: Date,
            vestedAmount: { type: Number, default: 0 }
        },

        // Contributions
        contributions: {
            employeeContribution: {
                required: { type: Boolean, default: false },
                contributionType: { type: String, enum: ['percentage', 'fixed_amount'] },
                contributionRate: Number,
                contributionAmount: Number,
                minimumContribution: Number,
                maximumContribution: Number,
                totalContributedToDate: { type: Number, default: 0 }
            },
            employerContribution: {
                contributionType: { type: String, enum: ['percentage', 'fixed_amount', 'matching'] },
                contributionRate: Number,
                contributionAmount: Number,
                matchPercentage: Number,
                maxMatchPercentage: Number,
                totalContributedToDate: { type: Number, default: 0 }
            },
            totalAccountValue: { type: Number, default: 0 }
        },

        // Retirement eligibility
        retirementEligibility: {
            normalRetirementAge: Number,
            earlyRetirementAge: Number,
            currentAge: Number,
            yearsUntilRetirement: Number,
            eligibleForEarlyRetirement: { type: Boolean, default: false },
            projectedMonthlyBenefit: Number
        }
    },

    // ==================== ALLOWANCE DETAILS ====================
    allowance: {
        allowanceType: {
            type: String,
            enum: ['housing', 'transportation', 'meal', 'mobile', 'education',
                   'professional_development', 'relocation', 'cost_of_living',
                   'hazard', 'shift', 'other']
        },
        allowanceName: String,
        allowanceNameAr: String,
        allowanceAmount: { type: Number, default: 0 },
        calculationType: {
            type: String,
            enum: ['fixed', 'percentage_of_salary', 'tiered', 'reimbursement']
        },
        percentageOfSalary: Number,
        tierDetails: {
            basedOn: { type: String, enum: ['job_level', 'location', 'dependents', 'performance'] },
            tiers: [{
                tierName: String,
                condition: String,
                amount: Number
            }]
        },
        paymentFrequency: {
            type: String,
            enum: ['monthly', 'quarterly', 'annual', 'one_time', 'as_incurred'],
            default: 'monthly'
        },
        annualLimit: Number,
        usedToDate: { type: Number, default: 0 },
        remainingLimit: Number,

        // Tax treatment
        taxable: { type: Boolean, default: true },
        includedInGOSI: { type: Boolean, default: false },
        includedInEOSB: { type: Boolean, default: false },

        // Reimbursements
        reimbursements: [{
            reimbursementId: String,
            reimbursementDate: Date,
            claimPeriod: String,
            claimedAmount: Number,
            approvedAmount: Number,
            receipts: [String],
            status: {
                type: String,
                enum: ['pending', 'approved', 'rejected', 'paid'],
                default: 'pending'
            },
            paidDate: Date
        }]
    },

    // ==================== WELLNESS & PERKS ====================
    wellnessPerks: {
        gymMembership: {
            provided: { type: Boolean, default: false },
            gymName: String,
            membershipType: { type: String, enum: ['individual', 'family'] },
            annualCost: Number,
            employeeContribution: Number,
            membershipCard: String,
            validFrom: Date,
            validUntil: Date
        },
        professionalMemberships: [{
            organizationName: String,
            membershipType: String,
            membershipNumber: String,
            annualFee: Number,
            companyPaid: { type: Boolean, default: true },
            validFrom: Date,
            validUntil: Date,
            renewalDue: { type: Boolean, default: false }
        }],
        wellnessPrograms: [{
            programName: String,
            programNameAr: String,
            programType: {
                type: String,
                enum: ['fitness', 'nutrition', 'mental_health', 'smoking_cessation',
                       'weight_management', 'stress_management', 'other']
            },
            enrolled: { type: Boolean, default: false },
            enrollmentDate: Date,
            completed: { type: Boolean, default: false },
            completionDate: Date,
            incentive: {
                incentiveType: { type: String, enum: ['cash', 'points', 'discount'] },
                incentiveAmount: Number,
                earned: { type: Boolean, default: false }
            }
        }],
        otherPerks: [{
            perkType: String,
            perkName: String,
            perkValue: Number,
            description: String,
            active: { type: Boolean, default: true }
        }]
    },

    // ==================== QUALIFYING EVENTS ====================
    qualifyingEvents: [qualifyingEventSchema],

    // ==================== CONTINUATION COVERAGE ====================
    continuationCoverage: {
        eligible: { type: Boolean, default: false },
        eligibilityReason: { type: String, enum: ['termination', 'hours_reduction', 'other'] },
        eligibleBenefits: [{
            benefitType: String,
            benefitName: String,
            continuationPeriod: Number,
            monthlyCost: Number,
            elected: { type: Boolean, default: false },
            effectiveDate: Date,
            expiryDate: Date
        }],
        electionDeadline: Date,
        elected: { type: Boolean, default: false },
        electionDate: Date,
        payments: [{
            paymentMonth: String,
            dueDate: Date,
            amountDue: Number,
            paid: { type: Boolean, default: false },
            paidDate: Date,
            late: { type: Boolean, default: false },
            terminatedForNonPayment: { type: Boolean, default: false }
        }],
        continuationStatus: {
            type: String,
            enum: ['active', 'terminated', 'expired'],
            default: 'active'
        }
    },

    // ==================== TERMINATION ====================
    termination: {
        terminated: { type: Boolean, default: false },
        terminationDate: Date,
        terminationReason: {
            type: String,
            enum: ['employee_resignation', 'employee_termination', 'retirement',
                   'death', 'contract_end', 'other']
        },
        terminationTriggeredBy: {
            type: String,
            enum: ['employment_end', 'employee_request', 'dependent_ineligibility',
                   'non_payment', 'plan_termination']
        },
        coverageEndDate: Date,
        gracePeriod: {
            gracePeriodDays: Number,
            gracePeriodEnd: Date
        },
        finalCosts: {
            proratedEmployeeCost: Number,
            proratedEmployerCost: Number,
            outstandingBalance: Number,
            refundDue: Number
        },
        continuationOffered: { type: Boolean, default: false },
        continuationNoticeDate: Date,
        conversionOption: {
            available: { type: Boolean, default: false },
            conversionDeadline: Date,
            converted: { type: Boolean, default: false },
            conversionDate: Date
        },
        benefitClearance: {
            cleared: { type: Boolean, default: false },
            clearanceDate: Date,
            cardReturned: { type: Boolean, default: false },
            cardReturnDate: Date,
            outstandingClaims: Number,
            finalSettlement: {
                settled: { type: Boolean, default: false },
                settlementAmount: Number,
                settlementDate: Date
            }
        }
    },

    // ==================== COMPLIANCE ====================
    compliance: {
        saudiCompliance: {
            cchiCompliant: { type: Boolean, default: false },
            cchiRegistrationNumber: String,
            gosiReported: { type: Boolean, default: false },
            compliesWithLaborLaw: { type: Boolean, default: true },
            complianceChecks: [{
                requirement: String,
                compliant: { type: Boolean, default: false },
                notes: String
            }]
        },
        planCompliance: {
            enrollmentTimely: { type: Boolean, default: true },
            documentsComplete: { type: Boolean, default: false },
            missingDocuments: [String],
            eligibilityVerified: { type: Boolean, default: false },
            costSharingCorrect: { type: Boolean, default: true },
            overallCompliant: { type: Boolean, default: false }
        },
        auditLog: [{
            auditDate: Date,
            auditor: String,
            findings: [String],
            correctiveActions: [String],
            passed: { type: Boolean, default: false }
        }]
    },

    // ==================== COMMUNICATIONS ====================
    communications: [communicationSchema],

    // ==================== DOCUMENTS ====================
    documents: [benefitDocumentSchema],

    // ==================== PORTAL ACCESS ====================
    portalAccess: {
        portalAvailable: { type: Boolean, default: false },
        portalUrl: String,
        loginCredentials: {
            username: String,
            passwordSet: { type: Boolean, default: false },
            lastLogin: Date
        },
        selfServiceFeatures: {
            viewCoverage: { type: Boolean, default: true },
            downloadCards: { type: Boolean, default: true },
            submitClaims: { type: Boolean, default: true },
            trackClaims: { type: Boolean, default: true },
            findProviders: { type: Boolean, default: true },
            updateBeneficiaries: { type: Boolean, default: true },
            viewStatements: { type: Boolean, default: true }
        }
    },

    // ==================== NOTES ====================
    notes: {
        employeeNotes: String,
        hrNotes: String,
        providerNotes: String,
        internalNotes: String,
        specialInstructions: String
    },

    // ==================== ANALYTICS ====================
    analytics: {
        utilizationRate: Number,
        costPerUse: Number,
        roi: Number,
        vsCompanyAverage: {
            cost: { type: String, enum: ['above', 'at', 'below'] },
            utilization: { type: String, enum: ['above', 'at', 'below'] }
        },
        satisfactionRating: Number
    },

    // ==================== AUDIT ====================
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
    timestamps: { createdAt: 'createdOn', updatedAt: 'updatedOn' },
    versionKey: false
});

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════

employeeBenefitSchema.index({ firmId: 1, status: 1 });
employeeBenefitSchema.index({ lawyerId: 1, status: 1 });
employeeBenefitSchema.index({ employeeId: 1, benefitType: 1 });
employeeBenefitSchema.index({ benefitCategory: 1 });
employeeBenefitSchema.index({ enrollmentDate: 1 });
employeeBenefitSchema.index({ 'healthInsurance.cardExpiryDate': 1 });

// ═══════════════════════════════════════════════════════════════
// VIRTUALS
// ═══════════════════════════════════════════════════════════════

// Calculate total monthly cost
employeeBenefitSchema.virtual('totalMonthlyCost').get(function() {
    const employerMonthly = this.costBreakdown?.employerCost?.monthlyCost || this.employerCost / 12;
    const employeeMonthly = this.costBreakdown?.employeeCost?.monthlyDeduction || this.employeeCost / 12;
    return employerMonthly + employeeMonthly;
});

// Check if benefit is active
employeeBenefitSchema.virtual('isActive').get(function() {
    return this.status === 'active';
});

// Calculate days until expiry
employeeBenefitSchema.virtual('daysUntilExpiry').get(function() {
    if (!this.coverageEndDate) return null;
    const now = new Date();
    const endDate = new Date(this.coverageEndDate);
    const diffMs = endDate - now;
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
});

// Calculate coverage duration in months
employeeBenefitSchema.virtual('coverageDurationMonths').get(function() {
    const startDate = new Date(this.effectiveDate);
    const endDate = this.coverageEndDate ? new Date(this.coverageEndDate) : new Date();
    const diffMs = endDate - startDate;
    return Math.round(diffMs / (1000 * 60 * 60 * 24 * 30));
});

// Enable virtuals in JSON
employeeBenefitSchema.set('toJSON', { virtuals: true });
employeeBenefitSchema.set('toObject', { virtuals: true });

// ═══════════════════════════════════════════════════════════════
// PRE-SAVE HOOKS
// ═══════════════════════════════════════════════════════════════

employeeBenefitSchema.pre('save', async function(next) {
    // Auto-generate benefitEnrollmentId
    if (!this.benefitEnrollmentId) {
        const year = new Date().getFullYear();
        const query = this.firmId ? { firmId: this.firmId } : { lawyerId: this.lawyerId };
        const count = await this.constructor.countDocuments({
            ...query,
            benefitEnrollmentId: new RegExp(`^BEN-${year}-`)
        });
        this.benefitEnrollmentId = `BEN-${year}-${String(count + 1).padStart(3, '0')}`;
    }

    // Calculate total cost
    this.totalCost = (this.employerCost || 0) + (this.employeeCost || 0);

    // Calculate cost breakdown percentages
    if (this.totalCost > 0) {
        if (!this.costBreakdown) this.costBreakdown = {};
        this.costBreakdown.totalBenefitValue = this.totalCost;
        this.costBreakdown.employerSharePercentage = Math.round((this.employerCost / this.totalCost) * 100);
        this.costBreakdown.employeeSharePercentage = Math.round((this.employeeCost / this.totalCost) * 100);
    }

    // Calculate beneficiary totals
    if (this.beneficiaries && this.beneficiaries.length > 0) {
        this.totalBeneficiaryPercentage = this.beneficiaries.reduce((sum, b) => sum + (b.percentage || 0), 0);

        if (this.lifeInsurance) {
            this.lifeInsurance.primaryBeneficiaries = this.beneficiaries.filter(b => b.beneficiaryType === 'primary').length;
            this.lifeInsurance.contingentBeneficiaries = this.beneficiaries.filter(b => b.beneficiaryType === 'contingent').length;
        }
    }

    // Calculate remaining allowance limit
    if (this.allowance && this.allowance.annualLimit) {
        this.allowance.remainingLimit = this.allowance.annualLimit - (this.allowance.usedToDate || 0);
    }

    // Calculate deductible remaining
    if (this.healthInsurance && this.healthInsurance.annualDeductible) {
        this.healthInsurance.deductibleRemaining =
            this.healthInsurance.annualDeductible - (this.healthInsurance.deductibleMet || 0);
    }

    next();
});

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

// Generate enrollment number
employeeBenefitSchema.statics.generateEnrollmentNumber = async function(firmId, lawyerId) {
    const year = new Date().getFullYear();
    const query = firmId ? { firmId } : { lawyerId };
    const count = await this.countDocuments({
        ...query,
        benefitEnrollmentId: new RegExp(`^BEN-${year}-`)
    });
    return `BEN-${year}-${String(count + 1).padStart(3, '0')}`;
};

// Get employee benefits
employeeBenefitSchema.statics.getEmployeeBenefits = function(employeeId, status = null) {
    const query = { employeeId };
    if (status) query.status = status;
    return this.find(query)
        .populate('employeeId', 'employeeId personalInfo')
        .sort({ effectiveDate: -1 });
};

// Get active benefits for employee
employeeBenefitSchema.statics.getActiveBenefits = function(employeeId) {
    return this.find({
        employeeId,
        status: 'active',
        $or: [
            { coverageEndDate: { $exists: false } },
            { coverageEndDate: { $gte: new Date() } }
        ]
    }).sort({ benefitType: 1 });
};

// Get benefits expiring soon
employeeBenefitSchema.statics.getExpiringBenefits = function(firmId, lawyerId, daysAhead = 30) {
    const query = firmId ? { firmId } : { lawyerId };
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    return this.find({
        ...query,
        status: 'active',
        coverageEndDate: {
            $gte: new Date(),
            $lte: futureDate
        }
    }).populate('employeeId', 'employeeId personalInfo').sort({ coverageEndDate: 1 });
};

// Get total benefit costs by type
employeeBenefitSchema.statics.getCostsByType = function(firmId, lawyerId) {
    const match = firmId ? { firmId: new mongoose.Types.ObjectId(firmId) } : { lawyerId: new mongoose.Types.ObjectId(lawyerId) };
    match.status = 'active';

    return this.aggregate([
        { $match: match },
        {
            $group: {
                _id: '$benefitType',
                totalEmployerCost: { $sum: '$employerCost' },
                totalEmployeeCost: { $sum: '$employeeCost' },
                totalCost: { $sum: '$totalCost' },
                count: { $sum: 1 }
            }
        },
        { $sort: { totalCost: -1 } }
    ]);
};

module.exports = mongoose.model('EmployeeBenefit', employeeBenefitSchema);
