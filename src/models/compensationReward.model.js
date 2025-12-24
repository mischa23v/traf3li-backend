const mongoose = require('mongoose');

// ═══════════════════════════════════════════════════════════════
// SUB-SCHEMAS
// ═══════════════════════════════════════════════════════════════

// Allowance Schema
const AllowanceSchema = new mongoose.Schema({
    allowanceId: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
    allowanceType: {
        type: String,
        enum: ['housing', 'transportation', 'mobile', 'education', 'meal', 'clothing',
               'hazard', 'technical', 'responsibility', 'travel', 'remote_work',
               'shift', 'overtime_base', 'cost_of_living', 'professional', 'language',
               'relocation', 'utilities', 'other'],
        required: false
    },
    allowanceName: { type: String, required: false },
    allowanceNameAr: String,
    amount: { type: Number, required: false },
    calculationType: {
        type: String,
        enum: ['fixed', 'percentage_of_basic', 'percentage_of_gross', 'daily_rate', 'hourly_rate'],
        default: 'fixed'
    },
    percentage: Number,
    frequency: { type: String, default: 'monthly' },
    taxable: { type: Boolean, default: false },
    includedInGOSI: { type: Boolean, default: false },
    includedInEOSB: { type: Boolean, default: false },
    startDate: Date,
    endDate: Date,
    temporary: { type: Boolean, default: false },
    eligibilityCriteria: String
}, { _id: false });

// Bonus History Schema
const BonusHistorySchema = new mongoose.Schema({
    bonusId: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
    year: { type: Number, required: false },
    fiscalYear: String,
    targetBonus: Number,
    actualBonus: Number,
    payoutPercentage: Number,
    payoutDate: Date,
    performanceRating: String,
    individualPerformance: Number,
    departmentPerformance: Number,
    companyPerformance: Number,
    paid: { type: Boolean, default: false },
    notes: String
}, { _id: false });

// Salary History Schema
const SalaryHistorySchema = new mongoose.Schema({
    changeId: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
    effectiveDate: { type: Date, required: false },
    previousBasicSalary: Number,
    newBasicSalary: Number,
    previousGrossSalary: Number,
    grossSalary: Number,
    increaseAmount: Number,
    increasePercentage: Number,
    changeType: {
        type: String,
        enum: ['new_hire', 'merit_increase', 'promotion', 'demotion', 'cost_of_living',
               'market_adjustment', 'equity_adjustment', 'annual_review', 'probation_completion',
               'contract_renewal', 'transfer', 'retention', 'reclassification', 'correction', 'other']
    },
    changeReason: String,
    performanceRating: Number,
    promotionToJobTitle: String,
    promotionFromJobLevel: String,
    promotionToJobLevel: String,
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: Date,
    annualizedImpact: Number,
    notes: String
}, { _id: false });

// Recognition Award Schema
const RecognitionAwardSchema = new mongoose.Schema({
    awardId: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
    programId: String,
    programName: String,
    programNameAr: String,
    programType: {
        type: String,
        enum: ['peer_recognition', 'manager_recognition', 'service_award', 'performance_award',
               'innovation_award', 'values_award', 'spot_award', 'other']
    },
    awardName: String,
    awardDate: Date,
    awardedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    awardCategory: String,
    monetaryValue: Number,
    nonMonetaryBenefit: String,
    rewardType: {
        type: String,
        enum: ['certificate', 'trophy', 'gift', 'points', 'experience', 'time_off', 'cash']
    },
    nominatedBy: String,
    description: String,
    publicRecognition: { type: Boolean, default: false },
    certificateUrl: String
}, { _id: false });

// Service Award Schema
const ServiceAwardSchema = new mongoose.Schema({
    awardId: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
    yearsOfService: Number,
    milestoneDate: Date,
    awardValue: Number,
    gift: String,
    ceremonyHeld: { type: Boolean, default: false },
    ceremonyDate: Date
}, { _id: false });

// Compensation Document Schema
const CompensationDocumentSchema = new mongoose.Schema({
    documentId: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
    documentType: {
        type: String,
        enum: ['employment_contract', 'offer_letter', 'salary_review_form', 'increase_letter',
               'bonus_statement', 'total_rewards_statement', 'compensation_plan', 'commission_agreement',
               'stock_option_agreement', 'partner_agreement', 'receipt', 'other']
    },
    documentName: String,
    documentNameAr: String,
    documentUrl: String,
    version: String,
    effectiveDate: Date,
    expiryDate: Date,
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    uploadedAt: { type: Date, default: Date.now },
    signed: { type: Boolean, default: false },
    signedDate: Date,
    confidential: { type: Boolean, default: true }
}, { _id: false });

// Loan Deduction Schema
const LoanDeductionSchema = new mongoose.Schema({
    loanId: String,
    loanType: String,
    monthlyDeduction: Number,
    remainingBalance: Number,
    startDate: Date,
    endDate: Date
}, { _id: false });

// Other Deduction Schema
const OtherDeductionSchema = new mongoose.Schema({
    deductionId: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
    deductionType: {
        type: String,
        enum: ['loan_repayment', 'advance_recovery', 'pension_contribution', 'savings_plan',
               'insurance_premium', 'union_dues', 'charity', 'other']
    },
    deductionName: String,
    amount: Number,
    frequency: {
        type: String,
        enum: ['monthly', 'bi_weekly', 'one_time'],
        default: 'monthly'
    },
    description: String,
    startDate: Date,
    endDate: Date,
    relatedRecordId: String
}, { _id: false });

// Communication Schema
const CommunicationSchema = new mongoose.Schema({
    communicationId: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
    communicationType: {
        type: String,
        enum: ['email', 'letter', 'meeting', 'portal_notification']
    },
    date: { type: Date, default: Date.now },
    purpose: {
        type: String,
        enum: ['offer_letter', 'salary_review', 'increase_notification', 'bonus_notification',
               'total_rewards_statement', 'promotion_letter', 'adjustment_notification', 'other']
    },
    subject: String,
    sentTo: String,
    sentBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    attachments: [String],
    delivered: { type: Boolean, default: false },
    acknowledged: { type: Boolean, default: false },
    acknowledgmentDate: Date
}, { _id: false });

// Origination Credit Schema (for attorneys)
const OriginationCreditSchema = new mongoose.Schema({
    clientId: String,
    clientName: String,
    creditPercentage: Number,
    ytdRevenue: Number
}, { _id: false });

// ═══════════════════════════════════════════════════════════════
// MAIN SCHEMA
// ═══════════════════════════════════════════════════════════════

const CompensationRewardSchema = new mongoose.Schema({
    // ==================== IDENTIFICATION ====================
    compensationId: { type: String, unique: true, sparse: true },
    recordNumber: { type: String, unique: true, sparse: true },

    // ==================== MULTI-TENANCY ====================
    firmId: { type: mongoose.Schema.Types.ObjectId, ref: 'Firm', index: true },
    lawyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    officeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Office' },

    // ==================== EMPLOYEE REFERENCE ====================
    employeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
        required: false,
        index: true
    },
    employeeNumber: { type: String, required: false },
    employeeName: { type: String, required: false },
    employeeNameAr: String,

    // ==================== POSITION INFO ====================
    department: String,
    departmentId: String,
    jobTitle: String,
    jobTitleAr: String,
    positionId: String,

    // ==================== CURRENT COMPENSATION ====================
    basicSalary: { type: Number, required: false },
    totalAllowances: { type: Number, default: 0 },
    grossSalary: { type: Number, required: false },
    currency: { type: String, default: 'SAR' },

    // ==================== PAY GRADE ====================
    payGrade: { type: String, required: false },
    salaryRangeMin: { type: Number, required: false },
    salaryRangeMid: Number,
    salaryRangeMax: { type: Number, required: false },

    // ==================== POSITION IN RANGE ====================
    compaRatio: { type: Number, default: 1 },
    compaRatioCategory: {
        type: String,
        enum: ['below_range', 'in_range_low', 'in_range_mid', 'in_range_high', 'above_range'],
        default: 'in_range_mid'
    },
    rangePenetration: { type: Number, default: 0.5 },
    distanceToMidpoint: {
        amount: Number,
        percentage: Number
    },
    distanceToMaximum: {
        amount: Number,
        percentage: Number
    },

    // ==================== STATUS ====================
    status: {
        type: String,
        enum: ['active', 'pending', 'historical', 'cancelled'],
        default: 'active',
        index: true
    },

    // ==================== DATES ====================
    effectiveDate: { type: Date, required: false, index: true },
    reviewDate: Date,
    nextReviewDate: Date,

    // ==================== PAYMENT DETAILS ====================
    paymentFrequency: {
        type: String,
        enum: ['monthly', 'bi_weekly', 'weekly'],
        default: 'monthly'
    },
    paymentMethod: {
        type: String,
        enum: ['bank_transfer', 'check', 'cash'],
        default: 'bank_transfer'
    },
    salaryBasis: {
        type: String,
        enum: ['monthly', 'hourly', 'daily', 'annual'],
        default: 'monthly'
    },
    hourlyRate: Number,
    dailyRate: Number,
    bankAccountNumber: String,
    bankName: String,
    iban: String,

    // ==================== EMPLOYEE DETAILS ====================
    employeeDetails: {
        employmentType: {
            type: String,
            enum: ['full_time', 'part_time', 'contract', 'temporary', 'intern', 'consultant']
        },
        contractType: {
            type: String,
            enum: ['indefinite', 'fixed_term']
        },
        hireDate: Date,
        serviceYears: Number,
        serviceMonths: Number,
        isSaudi: { type: Boolean, default: true },
        nationality: String,
        maritalStatus: {
            type: String,
            enum: ['single', 'married', 'divorced', 'widowed']
        },
        numberOfDependents: { type: Number, default: 0 },
        seniorityLevel: String,
        managerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
        managerName: String
    },

    // ==================== HOUSING ALLOWANCE (Saudi-specific) ====================
    housingAllowance: {
        provided: { type: Boolean, default: true },
        amount: Number,
        calculationType: {
            type: String,
            enum: ['fixed', 'percentage_of_basic']
        },
        percentage: Number,
        companyProvided: { type: Boolean, default: false },
        taxable: { type: Boolean, default: false },
        includedInGOSI: { type: Boolean, default: true },
        includedInEOSB: { type: Boolean, default: true },
        rentSubsidy: {
            applicable: Boolean,
            maximumRent: Number,
            reimbursementPercentage: Number,
            leaseRequired: Boolean,
            leaseUrl: String
        },
        companyHousing: {
            offered: Boolean,
            accepted: Boolean,
            housingType: {
                type: String,
                enum: ['apartment', 'villa', 'compound', 'shared']
            },
            location: String,
            furnishing: {
                type: String,
                enum: ['furnished', 'unfurnished', 'semi_furnished']
            }
        }
    },

    // ==================== TRANSPORTATION ALLOWANCE ====================
    transportationAllowance: {
        provided: { type: Boolean, default: true },
        amount: Number,
        calculationType: {
            type: String,
            enum: ['fixed', 'percentage_of_basic']
        },
        percentage: Number,
        taxable: { type: Boolean, default: false },
        includedInGOSI: { type: Boolean, default: false },
        includedInEOSB: { type: Boolean, default: false },
        companyVehicle: { type: Boolean, default: false },
        vehicleId: String,
        vehicleMake: String,
        vehicleModel: String,
        vehicleValue: Number,
        fuelAllowance: Number,
        fuelProvided: Boolean,
        maintenanceCovered: Boolean
    },

    // ==================== MOBILE ALLOWANCE ====================
    mobileAllowance: {
        provided: Boolean,
        amount: Number,
        companyProvided: Boolean,
        phoneNumber: String,
        dataAllowance: String,
        internationalRoaming: Boolean,
        billReimbursement: {
            applicable: Boolean,
            monthlyLimit: Number,
            requiresReceipts: Boolean
        }
    },

    // ==================== EDUCATION ALLOWANCE ====================
    educationAllowance: {
        provided: Boolean,
        totalAmount: Number,
        amountPerChild: Number,
        maxChildren: Number,
        eligibleDependents: Number,
        taxable: { type: Boolean, default: false },
        includedInGOSI: { type: Boolean, default: false },
        includedInEOSB: { type: Boolean, default: false },
        dependentAllowances: [{
            dependentId: String,
            dependentName: String,
            age: Number,
            educationLevel: {
                type: String,
                enum: ['kindergarten', 'primary', 'intermediate', 'secondary', 'university', 'postgraduate']
            },
            schoolName: String,
            annualAllowance: Number,
            totalClaimed: { type: Number, default: 0 }
        }],
        totalClaimed: { type: Number, default: 0 },
        remainingAllowance: Number
    },

    // ==================== MEAL ALLOWANCE ====================
    mealAllowance: {
        provided: Boolean,
        dailyRate: Number,
        monthlyAmount: Number,
        taxable: { type: Boolean, default: false },
        includedInGOSI: { type: Boolean, default: false },
        includedInEOSB: { type: Boolean, default: false },
        cafeteriaProvided: Boolean,
        mealVouchers: {
            provided: Boolean,
            voucherValue: Number,
            frequency: String
        }
    },

    // ==================== ADDITIONAL ALLOWANCES ARRAY ====================
    allowances: [AllowanceSchema],

    // ==================== VARIABLE COMPENSATION ====================
    variableCompensation: {
        eligibleForVariablePay: { type: Boolean, default: false },

        // Annual Bonus
        annualBonus: {
            eligible: Boolean,
            bonusType: {
                type: String,
                enum: ['discretionary', 'performance_based', 'profit_sharing', 'guaranteed']
            },
            targetPercentage: Number,
            targetAmount: Number,
            maxPercentage: Number,
            maxAmount: Number,
            paymentSchedule: String,
            paymentTiming: {
                type: String,
                enum: ['calendar_year_end', 'fiscal_year_end', 'anniversary', 'other']
            },
            prorationRules: {
                newHires: {
                    type: String,
                    enum: ['full_year', 'prorated', 'not_eligible']
                },
                terminatedEmployees: {
                    type: String,
                    enum: ['full_amount', 'prorated', 'forfeited']
                },
                minimumServiceMonths: Number
            },
            performanceCriteria: {
                individualWeight: Number,
                departmentWeight: Number,
                companyWeight: Number
            },
            bonusHistory: [BonusHistorySchema]
        },

        // Commission (for sales/BD roles)
        commission: {
            eligible: Boolean,
            commissionStructure: {
                type: String,
                enum: ['percentage', 'tiered', 'flat_rate', 'hybrid']
            },
            commissionPlan: String,
            commissionRate: Number,
            commissionBase: {
                type: String,
                enum: ['revenue', 'gross_profit', 'net_profit', 'billable_hours', 'collections']
            },
            tiers: [{
                tierNumber: Number,
                from: Number,
                to: Number,
                rate: Number,
                flatAmount: Number
            }],
            draw: {
                hasDrawAgainstCommission: Boolean,
                drawType: {
                    type: String,
                    enum: ['recoverable', 'non_recoverable']
                },
                monthlyDraw: Number,
                drawReconciliation: {
                    type: String,
                    enum: ['monthly', 'quarterly', 'annual']
                }
            },
            commissionCap: {
                hasCap: Boolean,
                capType: {
                    type: String,
                    enum: ['monthly', 'quarterly', 'annual']
                },
                capAmount: Number,
                capPercentage: Number
            },
            paymentTiming: {
                type: String,
                enum: ['upon_sale', 'upon_invoice', 'upon_collection', 'monthly', 'quarterly']
            },
            ytdCommission: Number,
            lastYearCommission: Number
        },

        // Profit Sharing
        profitSharing: {
            eligible: Boolean,
            planName: String,
            allocationMethod: {
                type: String,
                enum: ['equal', 'proportional_to_salary', 'performance_based', 'tenure_based']
            },
            sharingPercentage: Number,
            poolPercentage: Number,
            vestingSchedule: String,
            vestingPercentage: Number,
            minimumProfitThreshold: Number
        },

        // Stock Options
        stockOptions: {
            eligible: Boolean,
            optionType: {
                type: String,
                enum: ['stock_options', 'restricted_stock', 'stock_appreciation_rights', 'phantom_stock']
            },
            grantedOptions: Number,
            vestedOptions: Number,
            strikePrice: Number,
            grantDate: Date,
            vestingSchedule: String,
            vestingPeriod: Number,
            currentValue: Number
        },

        // Attorney Variable Pay
        attorneyVariablePay: {
            eligible: Boolean,
            billableHoursBonus: {
                eligible: Boolean,
                annualTargetHours: Number,
                bonusPerHour: Number,
                ytdBillableHours: Number,
                ytdBonus: Number
            },
            originationBonus: {
                eligible: Boolean,
                originationPercentage: Number,
                minimumThreshold: Number,
                paymentTiming: {
                    type: String,
                    enum: ['upon_engagement', 'upon_collection', 'annual']
                },
                ytdOrigination: Number,
                ytdBonus: Number
            },
            realizationBonus: {
                eligible: Boolean,
                targetRealizationRate: Number,
                ytdRealizationRate: Number,
                ytdBonus: Number
            },
            caseSuccessBonus: {
                eligible: Boolean,
                bonusType: {
                    type: String,
                    enum: ['per_case', 'percentage_of_recovery', 'tiered']
                },
                ytdCases: Number,
                ytdBonus: Number
            }
        },

        // Total variable
        totalVariableTarget: Number,
        totalVariableActual: Number,
        variablePayRatio: Number
    },

    // ==================== LONG-TERM INCENTIVES ====================
    longTermIncentives: {
        eligible: Boolean,

        // End of Service Benefit (Saudi)
        endOfServiceBenefit: {
            accrued: Number,
            projectedAtRetirement: Number,
            calculationMethod: String,
            yearsOfService: Number,
            eosbBase: Number
        },

        // Retirement Plan
        retirementPlan: {
            enrolled: Boolean,
            planType: {
                type: String,
                enum: ['defined_benefit', 'defined_contribution', 'hybrid']
            },
            employeeContribution: Number,
            employeeContributionRate: Number,
            employerMatch: Number,
            matchPercentage: Number,
            vestedAmount: Number,
            vestedPercentage: Number,
            totalAccountValue: Number
        },

        // Savings Plan
        savingsPlan: {
            enrolled: Boolean,
            monthlyContribution: Number,
            employerContribution: Number,
            totalBalance: Number
        },

        // LTI Programs
        ltiPrograms: [{
            programId: String,
            programName: String,
            programType: {
                type: String,
                enum: ['stock_options', 'restricted_stock', 'performance_shares',
                       'phantom_stock', 'sars', 'retention_bonus', 'deferred_compensation']
            },
            awardValue: Number,
            grantDate: Date,
            vestingPeriod: Number,
            vestingType: {
                type: String,
                enum: ['time_based', 'performance_based', 'hybrid']
            },
            vestedValue: Number,
            unvestedValue: Number,
            status: {
                type: String,
                enum: ['active', 'vested', 'forfeited', 'cancelled']
            }
        }],

        totalLTIValue: Number
    },

    // ==================== ATTORNEY COMPENSATION ====================
    attorneyCompensation: {
        isAttorney: { type: Boolean, default: false },
        compensationModel: {
            type: String,
            enum: ['salary', 'salary_plus_bonus', 'eat_what_you_kill', 'hybrid', 'lockstep', 'modified_lockstep']
        },
        partnershipTier: {
            type: String,
            enum: ['equity_partner', 'non_equity_partner', 'income_partner', 'of_counsel',
                   'senior_associate', 'associate', 'junior_associate', 'trainee']
        },
        equityPercentage: Number,
        votingRights: Boolean,
        capitalContribution: {
            required: Boolean,
            amount: Number,
            contributed: Boolean,
            contributionDate: Date
        },
        partnerDraw: Number,
        distributionSchedule: String,

        // Billable Hours
        billableHoursTarget: Number,
        minimumExpected: Number,
        ytdBillableHours: Number,
        ytdNonBillableHours: Number,
        percentageOfTarget: Number,
        averageHourlyRate: Number,
        ytdBillings: Number,

        // Realization & Collection
        ytdRealizationRate: Number,
        targetRealizationRate: Number,
        ytdCollectionRate: Number,
        ytdCollections: Number,
        realizationRate: Number,

        // Origination
        originationCredits: [OriginationCreditSchema],
        ytdOrigination: Number,
        bookOfBusinessValue: Number,
        clientCount: Number,

        // Distributions
        ytdDistributions: Number,
        expectedAnnualDistribution: Number
    },

    // ==================== SALARY HISTORY ====================
    salaryHistory: [SalaryHistorySchema],

    // ==================== SALARY REVIEW ====================
    salaryReview: {
        eligibleForReview: { type: Boolean, default: true },
        lastReviewDate: Date,
        nextReviewDate: Date,
        reviewCycle: {
            type: String,
            enum: ['annual', 'anniversary', 'quarterly', 'other']
        },
        reviewOverdue: { type: Boolean, default: false },
        reviewStatus: {
            type: String,
            enum: ['not_started', 'in_progress', 'pending_approval', 'approved', 'implemented', 'deferred', 'declined'],
            default: 'not_started'
        },

        // Current Review
        currentReview: {
            reviewId: String,
            reviewPeriod: String,
            performanceRating: Number,
            performanceRatingLabel: String,
            meetsExpectations: Boolean,

            // Recommendation
            recommendedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            recommendationDate: Date,
            recommendationType: {
                type: String,
                enum: ['merit', 'promotion', 'market', 'equity', 'retention', 'none']
            },
            recommendedIncrease: Number,
            recommendedPercentage: Number,
            recommendedNewSalary: Number,
            justification: String,

            // Budget
            budgetPool: Number,
            budgetUsed: Number,
            budgetRemaining: Number,
            withinBudget: Boolean
        },

        // Approval
        approvedIncrease: Number,
        approvedPercentage: Number,
        approvalDate: Date,
        approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        implementationStatus: {
            type: String,
            enum: ['pending', 'processed', 'paid']
        },
        implementationDate: Date,

        // Notes
        managerRecommendation: String,
        hrRecommendation: String,
        budgetImpact: Number,

        // Communication
        communicated: Boolean,
        communicationDate: Date,
        communicationMethod: {
            type: String,
            enum: ['meeting', 'letter', 'email']
        },
        employeeAcknowledged: Boolean,
        acknowledgmentDate: Date
    },

    // ==================== TOTAL REWARDS ====================
    totalRewards: {
        // Cash Compensation
        totalCashCompensation: Number,
        annualBasicSalary: Number,
        annualAllowances: Number,
        targetBonus: Number,
        targetCommission: Number,
        totalTargetCash: Number,
        totalActualCash: Number,

        // Direct Compensation
        totalDirectCompensation: Number,
        longTermIncentivesValue: Number,

        // Benefits
        benefitsValue: Number,
        healthInsuranceValue: Number,
        lifeInsuranceValue: Number,
        pensionContribution: Number,
        gosiEmployerContribution: Number,
        otherBenefitsValue: Number,

        // Perks
        perksValue: Number,
        companyVehicleValue: Number,
        gymMembershipValue: Number,
        professionalDevelopmentValue: Number,
        otherPerksValue: Number,

        // Total
        totalRewardsValue: Number,
        totalRewardsRatio: Number,
        cashPercentage: Number,
        benefitsPercentage: Number,
        perksPercentage: Number,

        // Market
        marketPositioning: {
            type: String,
            enum: ['significantly_below', 'below', 'competitive', 'above', 'significantly_above']
        },

        // Statement
        lastStatementDate: Date,
        statementUrl: String,
        delivered: Boolean,
        deliveryDate: Date
    },

    // ==================== MARKET POSITIONING ====================
    marketPositioning: {
        marketDataAvailable: Boolean,
        marketDataSource: String,
        marketDataDate: Date,
        marketPercentile: Number,
        marketP25: Number,
        marketP50Median: Number,
        marketP75: Number,
        marketMean: Number,
        vsMarketMedianDifference: Number,
        vsMarketMedianPercentage: Number,
        competitivePosition: {
            type: String,
            enum: ['significantly_below', 'below', 'competitive', 'above', 'significantly_above']
        }
    },

    // ==================== INTERNAL EQUITY ====================
    internalEquity: {
        peerGroup: String,
        numberOfPeers: Number,
        peerMinSalary: Number,
        peerAvgSalary: Number,
        peerMedianSalary: Number,
        peerMaxSalary: Number,
        employeePercentile: Number,
        withinNormalRange: Boolean,
        varianceFromAverage: Number,
        concerns: [String],

        // Pay Equity
        genderPayGap: {
            applicable: Boolean,
            gapPercentage: Number,
            adjusted: Boolean,
            adjustedGap: Number,
            compliant: Boolean
        },
        nationalityPayGap: {
            applicable: Boolean,
            gapPercentage: Number,
            saudiVsNonSaudi: Number,
            justification: String
        }
    },

    // ==================== RECOGNITION AWARDS ====================
    recognitionAwards: [RecognitionAwardSchema],
    serviceAwards: [ServiceAwardSchema],
    totalRecognitions: { type: Number, default: 0 },
    totalAwardValue: { type: Number, default: 0 },

    // ==================== DEDUCTIONS ====================
    deductions: {
        // GOSI (Saudi)
        gosiEmployeeContribution: Number,
        gosiEmployerContribution: Number,
        gosiContributionBase: Number,
        gosiEmployeeRate: Number,
        gosiEmployerRate: Number,
        gosiRegistrationNumber: String,

        // Income Tax (if applicable)
        incomeTax: {
            applicable: { type: Boolean, default: false },
            taxableIncome: Number,
            taxRate: Number,
            monthlyTax: Number,
            annualTax: Number
        },

        // Loan Deductions
        loanDeductions: [LoanDeductionSchema],

        // Other Deductions
        otherDeductions: [OtherDeductionSchema],

        // Totals
        totalStatutoryDeductions: Number,
        totalVoluntaryDeductions: Number,
        totalDeductions: Number,
        netPay: Number
    },

    // ==================== COMPLIANCE ====================
    compliance: {
        saudiLaborLawCompliant: { type: Boolean, default: true },
        minimumWageCompliant: { type: Boolean, default: true },
        currentMinimumWage: Number,
        overtimeCompliant: Boolean,
        overtimeRate: Number,
        eosbCompliant: { type: Boolean, default: true },
        eosbCalculationCorrect: { type: Boolean, default: true },
        timelyPayment: { type: Boolean, default: true },
        paymentDay: Number,
        complianceIssues: [String],
        violations: [String],
        lastAuditDate: Date,
        nextAuditDate: Date,
        auditedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

        // Pay Equity
        payEquityCompliant: Boolean,
        genderPayEquity: Boolean,
        equalPayForEqualWork: Boolean,

        // Contract Compliance
        salaryMatchesContract: Boolean,
        allowancesMatchContract: Boolean,
        contractUrl: String
    },

    // ==================== TAX & ACCOUNTING ====================
    taxAccounting: {
        taxResidency: String,
        taxStatus: String,
        annualTaxableIncome: Number,
        taxExemptions: [String],
        costCenter: String,
        glAccount: String,
        budgetCode: String,
        payrollFrequency: {
            type: String,
            enum: ['monthly', 'bi_weekly', 'weekly']
        },
        payrollCycle: String,
        lastPayrollRunId: String,
        lastPaymentDate: Date,
        nextPayrollDate: Date
    },

    // ==================== COMMUNICATIONS ====================
    communications: [CommunicationSchema],
    offerLetterSent: Boolean,
    offerLetterDate: Date,
    compensationStatementSent: Boolean,
    lastStatementDate: Date,
    increaseLetterSent: Boolean,
    increaseLetterDate: Date,

    // ==================== DOCUMENTS ====================
    documents: [CompensationDocumentSchema],

    // ==================== NOTES ====================
    notes: {
        compensationNotes: String,
        confidentialNotes: String,
        approvalNotes: String,
        hrNotes: String,
        managerNotes: String,
        specialArrangements: String
    },

    // ==================== ANALYTICS ====================
    analytics: {
        costToCompany: Number,
        totalEmploymentCost: Number,
        costPerHour: Number,
        revenuePerEmployee: Number,
        revenuePerEmployeeCost: Number,
        laborCostRatio: Number,
        compensationIndex: Number,
        timeInGrade: Number,
        averageIncreasePerYear: Number,
        yearsToMidpoint: Number,
        yearsToMaximum: Number,

        // Comparison
        vsCompanyAverage: {
            position: {
                type: String,
                enum: ['below', 'average', 'above']
            },
            variance: Number
        },
        vsDepartmentAverage: {
            position: {
                type: String,
                enum: ['below', 'average', 'above']
            },
            variance: Number
        },

        // Market
        marketComparison: {
            percentile: Number,
            comparisonDate: Date,
            source: String
        },

        // Equity
        equityAnalysis: {
            internalEquityScore: Number,
            externalEquityScore: Number,
            genderPayGap: Number,
            tenureAdjusted: Boolean
        }
    },

    // ==================== RELATED RECORDS ====================
    relatedRecords: {
        evaluationIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Evaluation' }],
        payrollIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Payroll' }],
        benefitsEnrollmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'EmployeeBenefit' },
        jobPositionId: { type: mongoose.Schema.Types.ObjectId, ref: 'JobPosition' },
        contractId: String,
        performanceReviewIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'PerformanceReview' }],
        loanIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'EmployeeLoan' }],
        advanceIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'EmployeeAdvance' }]
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

CompensationRewardSchema.index({ firmId: 1, status: 1 });
CompensationRewardSchema.index({ lawyerId: 1, status: 1 });
CompensationRewardSchema.index({ employeeId: 1, status: 1 });
CompensationRewardSchema.index({ officeId: 1, status: 1 });
CompensationRewardSchema.index({ payGrade: 1 });
CompensationRewardSchema.index({ compaRatioCategory: 1 });
CompensationRewardSchema.index({ 'salaryReview.reviewStatus': 1 });
CompensationRewardSchema.index({ effectiveDate: -1 });
CompensationRewardSchema.index({ department: 1 });

// ═══════════════════════════════════════════════════════════════
// VIRTUALS
// ═══════════════════════════════════════════════════════════════

// Calculate annual basic salary
CompensationRewardSchema.virtual('annualBasicSalary').get(function() {
    return this.basicSalary * 12;
});

// Calculate annual gross salary
CompensationRewardSchema.virtual('annualGrossSalary').get(function() {
    return this.grossSalary * 12;
});

// Check if active
CompensationRewardSchema.virtual('isActive').get(function() {
    return this.status === 'active';
});

// Check if review is due
CompensationRewardSchema.virtual('reviewIsDue').get(function() {
    if (!this.salaryReview?.nextReviewDate) return false;
    return new Date() >= new Date(this.salaryReview.nextReviewDate);
});

// Enable virtuals in JSON
CompensationRewardSchema.set('toJSON', { virtuals: true });
CompensationRewardSchema.set('toObject', { virtuals: true });

// ═══════════════════════════════════════════════════════════════
// PRE-SAVE HOOKS
// ═══════════════════════════════════════════════════════════════

CompensationRewardSchema.pre('save', async function(next) {
    // Auto-generate compensationId
    if (!this.compensationId) {
        const year = new Date().getFullYear();
        const query = {};
        if (this.firmId) {
            query.firmId = this.firmId;
        } else if (this.lawyerId) {
            query.lawyerId = this.lawyerId;
        }
        const count = await this.constructor.countDocuments({
            ...query,
            compensationId: new RegExp(`^COMP-${year}-`)
        });
        this.compensationId = `COMP-${year}-${String(count + 1).padStart(3, '0')}`;
    }

    // Auto-generate recordNumber
    if (this.isNew && !this.recordNumber) {
        const count = await this.constructor.countDocuments();
        this.recordNumber = `COMP-${String(count + 1).padStart(6, '0')}`;
    }

    // Calculate total allowances
    let totalAllowances = 0;
    if (this.housingAllowance?.provided && this.housingAllowance?.amount) {
        totalAllowances += this.housingAllowance.amount;
    }
    if (this.transportationAllowance?.provided && this.transportationAllowance?.amount) {
        totalAllowances += this.transportationAllowance.amount;
    }
    if (this.mobileAllowance?.provided && this.mobileAllowance?.amount) {
        totalAllowances += this.mobileAllowance.amount;
    }
    if (this.educationAllowance?.provided && this.educationAllowance?.totalAmount) {
        totalAllowances += this.educationAllowance.totalAmount;
    }
    if (this.mealAllowance?.provided && this.mealAllowance?.monthlyAmount) {
        totalAllowances += this.mealAllowance.monthlyAmount;
    }
    if (this.allowances && this.allowances.length > 0) {
        totalAllowances += this.allowances.reduce((sum, a) => sum + (a.amount || 0), 0);
    }
    this.totalAllowances = totalAllowances;

    // Calculate gross salary
    this.grossSalary = this.basicSalary + this.totalAllowances;

    // Calculate compa-ratio
    if (this.salaryRangeMid && this.salaryRangeMid > 0) {
        this.compaRatio = parseFloat((this.basicSalary / this.salaryRangeMid).toFixed(2));

        // Determine compa-ratio category
        if (this.compaRatio < 0.85) {
            this.compaRatioCategory = 'below_range';
        } else if (this.compaRatio < 0.95) {
            this.compaRatioCategory = 'in_range_low';
        } else if (this.compaRatio <= 1.05) {
            this.compaRatioCategory = 'in_range_mid';
        } else if (this.compaRatio <= 1.15) {
            this.compaRatioCategory = 'in_range_high';
        } else {
            this.compaRatioCategory = 'above_range';
        }
    }

    // Calculate range penetration
    if (this.salaryRangeMax > this.salaryRangeMin) {
        this.rangePenetration = parseFloat(
            ((this.basicSalary - this.salaryRangeMin) / (this.salaryRangeMax - this.salaryRangeMin)).toFixed(2)
        );
    }

    // Calculate distance to midpoint
    if (this.salaryRangeMid) {
        const diff = this.salaryRangeMid - this.basicSalary;
        this.distanceToMidpoint = {
            amount: diff,
            percentage: parseFloat(((diff / this.basicSalary) * 100).toFixed(2))
        };
    }

    // Calculate distance to maximum
    if (this.salaryRangeMax) {
        const diff = this.salaryRangeMax - this.basicSalary;
        this.distanceToMaximum = {
            amount: diff,
            percentage: parseFloat(((diff / this.basicSalary) * 100).toFixed(2))
        };
    }

    // Calculate total rewards
    if (!this.totalRewards) this.totalRewards = {};
    this.totalRewards.annualBasicSalary = this.basicSalary * 12;
    this.totalRewards.annualAllowances = this.totalAllowances * 12;
    this.totalRewards.totalCashCompensation = (this.basicSalary + this.totalAllowances) * 12;

    // Update recognition counts
    if (this.recognitionAwards) {
        this.totalRecognitions = this.recognitionAwards.length;
        this.totalAwardValue = this.recognitionAwards.reduce((sum, a) => sum + (a.monetaryValue || 0), 0);
    }

    // Calculate net pay
    if (this.deductions) {
        const totalDeductions = (this.deductions.gosiEmployeeContribution || 0) +
            (this.deductions.loanDeductions?.reduce((sum, l) => sum + (l.monthlyDeduction || 0), 0) || 0) +
            (this.deductions.otherDeductions?.reduce((sum, d) => sum + (d.amount || 0), 0) || 0);
        this.deductions.totalDeductions = totalDeductions;
        this.deductions.netPay = this.grossSalary - totalDeductions;
    }

    next();
});

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

// Get active compensation for employee
CompensationRewardSchema.statics.getActiveCompensation = function(employeeId) {
    return this.findOne({
        employeeId,
        status: 'active'
    }).sort({ effectiveDate: -1 });
};

// Get compensation history for employee
CompensationRewardSchema.statics.getCompensationHistory = function(employeeId) {
    return this.find({ employeeId })
        .sort({ effectiveDate: -1 });
};

// Get records pending review
CompensationRewardSchema.statics.getPendingReviews = function(firmId, lawyerId) {
    const query = {};
    if (firmId) {
        query.firmId = firmId;
    } else if (lawyerId) {
        query.lawyerId = lawyerId;
    }
    return this.find({
        ...query,
        status: 'active',
        'salaryReview.reviewStatus': { $in: ['in_progress', 'pending_approval'] }
    }).populate('employeeId', 'employeeId personalInfo');
};

// Get pay grade analysis
CompensationRewardSchema.statics.getPayGradeAnalysis = function(firmId, lawyerId, payGrade) {
    const match = firmId
        ? { firmId: new mongoose.Types.ObjectId(firmId) }
        : { lawyerId: new mongoose.Types.ObjectId(lawyerId) };

    if (payGrade) {
        match.payGrade = payGrade;
    }
    match.status = 'active';

    return this.aggregate([
        { $match: match },
        {
            $group: {
                _id: '$payGrade',
                count: { $sum: 1 },
                averageSalary: { $avg: '$basicSalary' },
                minSalary: { $min: '$basicSalary' },
                maxSalary: { $max: '$basicSalary' },
                averageCompaRatio: { $avg: '$compaRatio' },
                belowRange: { $sum: { $cond: [{ $eq: ['$compaRatioCategory', 'below_range'] }, 1, 0] } },
                aboveRange: { $sum: { $cond: [{ $eq: ['$compaRatioCategory', 'above_range'] }, 1, 0] } },
                totalPayroll: { $sum: '$grossSalary' }
            }
        },
        { $sort: { _id: 1 } }
    ]);
};

// Get compensation statistics
CompensationRewardSchema.statics.getCompensationStats = function(firmId, lawyerId) {
    const match = firmId
        ? { firmId: new mongoose.Types.ObjectId(firmId) }
        : { lawyerId: new mongoose.Types.ObjectId(lawyerId) };
    match.status = 'active';

    return this.aggregate([
        { $match: match },
        {
            $group: {
                _id: null,
                totalRecords: { $sum: 1 },
                averageBasicSalary: { $avg: '$basicSalary' },
                averageGrossSalary: { $avg: '$grossSalary' },
                averageCompaRatio: { $avg: '$compaRatio' },
                belowRangeCount: { $sum: { $cond: [{ $eq: ['$compaRatioCategory', 'below_range'] }, 1, 0] } },
                aboveRangeCount: { $sum: { $cond: [{ $eq: ['$compaRatioCategory', 'above_range'] }, 1, 0] } },
                pendingReviews: {
                    $sum: {
                        $cond: [
                            { $in: ['$salaryReview.reviewStatus', ['in_progress', 'pending_approval']] },
                            1,
                            0
                        ]
                    }
                },
                totalPayroll: { $sum: '$grossSalary' },
                minSalary: { $min: '$basicSalary' },
                maxSalary: { $max: '$basicSalary' }
            }
        }
    ]);
};

module.exports = mongoose.model('CompensationReward', CompensationRewardSchema);
