const mongoose = require('mongoose');

/**
 * Offboarding Model - HR Management
 * Module 9: إنهاء الخدمة والمغادرة
 * Saudi Labor Law Compliance (Articles 75, 80, 84-87, 109)
 */

// ═══════════════════════════════════════════════════════════════
// SUB-SCHEMAS
// ═══════════════════════════════════════════════════════════════

// Clearance item schema
const clearanceItemSchema = new mongoose.Schema({
    itemId: String,
    itemType: {
        type: String,
        enum: ['id_badge', 'laptop', 'mobile', 'tablet', 'keys', 'access_card',
            'vehicle', 'parking_card', 'uniform', 'equipment', 'documents',
            'credit_card', 'other']
    },
    itemDescription: String,
    itemDescriptionAr: String,
    serialNumber: String,
    assetId: String,
    condition: {
        type: String,
        enum: ['good', 'fair', 'damaged', 'lost']
    },
    returned: { type: Boolean, default: false },
    returnedDate: Date,
    returnedTo: String,
    damageNotes: String,
    damageCharge: Number,
    notReturnedReason: String,
    replacementCost: Number
}, { _id: true });

// Clearance task schema
const clearanceTaskSchema = new mongoose.Schema({
    taskId: String,
    task: String,
    taskName: String,
    taskNameAr: String,
    completed: { type: Boolean, default: false },
    completedDate: Date,
    completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    notes: String,
    outstandingAmount: Number
}, { _id: true });

// Clearance section schema
const clearanceSectionSchema = new mongoose.Schema({
    required: { type: Boolean, default: true },
    tasks: [clearanceTaskSchema],
    cleared: { type: Boolean, default: false },
    clearedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    clearanceDate: Date,
    notes: String
}, { _id: false });

// Timeline event schema
const timelineEventSchema = new mongoose.Schema({
    eventId: String,
    eventType: {
        type: String,
        enum: ['resignation_submitted', 'termination_issued', 'notice_started',
            'exit_interview', 'last_working_day', 'clearance_started',
            'clearance_completed', 'settlement_calculated', 'settlement_approved',
            'settlement_paid', 'documents_issued', 'offboarding_completed',
            'status_changed', 'section_cleared']
    },
    eventDate: { type: Date, default: Date.now },
    description: String,
    descriptionAr: String,
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: {
        type: String,
        enum: ['scheduled', 'completed', 'pending', 'overdue'],
        default: 'completed'
    },
    notes: String
}, { _id: true });

// Loan/Advance deduction schema
const loanDeductionSchema = new mongoose.Schema({
    loanId: String,
    loanType: String,
    originalAmount: Number,
    remainingBalance: Number,
    deductFromSettlement: { type: Boolean, default: true }
}, { _id: false });

// Approval schema
const approvalSchema = new mongoose.Schema({
    approverRole: String,
    approverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approverName: String,
    approved: { type: Boolean, default: false },
    approvalDate: Date,
    comments: String
}, { _id: true });

// ═══════════════════════════════════════════════════════════════
// MAIN SCHEMA
// ═══════════════════════════════════════════════════════════════

const offboardingSchema = new mongoose.Schema({
    // ═══════════════════════════════════════════════════════════════
    // IDENTIFICATION
    // ═══════════════════════════════════════════════════════════════
    offboardingId: {
        type: String,
        unique: true,
        sparse: true
    },
    offboardingNumber: String,

    // ═══════════════════════════════════════════════════════════════
    // EMPLOYEE INFO
    // ═══════════════════════════════════════════════════════════════
    employeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee'
    },
    employeeNumber: String,
    employeeName: { type: String },
    employeeNameAr: String,
    nationalId: { type: String },
    email: String,
    phone: String,

    department: String,
    jobTitle: { type: String },
    jobTitleAr: String,
    location: String,

    employmentType: {
        type: String,
        enum: ['full_time', 'part_time', 'contract', 'temporary'],
        default: 'full_time'
    },
    contractType: {
        type: String,
        enum: ['indefinite', 'fixed_term'],
        default: 'indefinite'
    },

    hireDate: Date,

    // Manager info
    managerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    managerName: String,

    // ═══════════════════════════════════════════════════════════════
    // EXIT TYPE
    // ═══════════════════════════════════════════════════════════════
    exitType: {
        type: String,
        enum: ['resignation', 'termination', 'contract_end', 'retirement',
            'death', 'mutual_agreement', 'medical', 'other']
    },

    exitCategory: {
        type: String,
        enum: ['voluntary', 'involuntary'],
        default: 'voluntary'
    },

    initiatedBy: {
        type: String,
        enum: ['employee', 'employer', 'mutual'],
        default: 'employee'
    },

    // ═══════════════════════════════════════════════════════════════
    // KEY DATES
    // ═══════════════════════════════════════════════════════════════
    dates: {
        noticeDate: Date,
        lastWorkingDay: { type: Date },
        exitEffectiveDate: Date
    },

    // ═══════════════════════════════════════════════════════════════
    // NOTICE PERIOD (Article 75)
    // ═══════════════════════════════════════════════════════════════
    noticePeriod: {
        requiredDays: { type: Number, default: 30 }, // 30 or 60 days
        noticeDaysServed: { type: Number, default: 0 },
        buyoutApplied: { type: Boolean, default: false },
        buyoutAmount: Number
    },

    // ═══════════════════════════════════════════════════════════════
    // SERVICE DURATION
    // ═══════════════════════════════════════════════════════════════
    serviceDuration: {
        years: { type: Number, default: 0 },
        months: { type: Number, default: 0 },
        days: { type: Number, default: 0 },
        totalMonths: { type: Number, default: 0 },
        totalDays: { type: Number, default: 0 }
    },

    // ═══════════════════════════════════════════════════════════════
    // STATUS
    // ═══════════════════════════════════════════════════════════════
    status: {
        type: String,
        enum: ['initiated', 'in_progress', 'clearance_pending', 'completed', 'cancelled'],
        default: 'initiated'
    },

    // ═══════════════════════════════════════════════════════════════
    // RESIGNATION DETAILS
    // ═══════════════════════════════════════════════════════════════
    resignation: {
        resignationDate: Date,
        resignationLetter: {
            submitted: { type: Boolean, default: false },
            submittedDate: Date,
            letterUrl: String
        },
        resignationReason: String,
        resignationReasonCategory: {
            type: String,
            enum: ['better_opportunity', 'relocation', 'personal', 'compensation',
                'career_growth', 'work_environment', 'health', 'family',
                'retirement', 'other']
        },
        detailedReason: String,
        withdrawalRequested: Boolean,
        withdrawalDate: Date,
        withdrawalApproved: Boolean
    },

    // ═══════════════════════════════════════════════════════════════
    // TERMINATION DETAILS
    // ═══════════════════════════════════════════════════════════════
    termination: {
        terminationDate: Date,
        terminationType: {
            type: String,
            enum: ['with_cause', 'without_cause']
        },
        terminationReason: String,
        terminationReasonCategory: {
            type: String,
            enum: ['performance', 'misconduct', 'violation', 'redundancy',
                'restructuring', 'business_closure', 'project_completion', 'other']
        },
        detailedReason: String,
        saudiLaborLawArticle: String, // Article 77, 80, etc.

        // Article 80 violations (immediate termination)
        article80Violation: {
            applies: { type: Boolean, default: false },
            violationType: {
                type: String,
                enum: ['fraud', 'assault', 'disobedience', 'absence',
                    'breach_of_trust', 'intoxication', 'gross_negligence', 'other']
            },
            violationDetails: String,
            evidenceProvided: Boolean,
            evidenceUrls: [String],
            investigationConducted: Boolean,
            investigationReport: String
        },

        notice: {
            required: { type: Boolean, default: true },
            noticePeriod: Number,
            noticeGiven: Boolean,
            noticeDate: Date,
            paymentInLieuOfNotice: {
                applicable: Boolean,
                amount: Number
            }
        },

        approvals: [approvalSchema],

        terminationLetter: {
            issued: { type: Boolean, default: false },
            issueDate: Date,
            letterUrl: String
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // CONTRACT END DETAILS
    // ═══════════════════════════════════════════════════════════════
    contractEnd: {
        contractEndDate: Date,
        contractDuration: Number, // Months
        renewalOffered: Boolean,
        renewalAccepted: Boolean,
        nonRenewalReason: String,
        earlyTermination: {
            terminatedEarly: Boolean,
            terminationReason: String,
            compensationPayable: Boolean,
            compensationAmount: Number
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // RETIREMENT DETAILS
    // ═══════════════════════════════════════════════════════════════
    retirement: {
        retirementDate: Date,
        retirementType: {
            type: String,
            enum: ['voluntary', 'mandatory', 'early', 'medical']
        },
        retirementAge: Number,
        eligibleForRetirement: Boolean,
        pensionEligible: Boolean,
        pensionDetails: String,
        gosiRetirement: {
            eligible: Boolean,
            serviceYears: Number,
            gosiPensionAmount: Number
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // DEATH DETAILS
    // ═══════════════════════════════════════════════════════════════
    death: {
        dateOfDeath: Date,
        deathCertificate: {
            provided: Boolean,
            certificateUrl: String,
            certificateNumber: String
        },
        beneficiary: {
            name: String,
            relationship: String,
            nationalId: String,
            contactPhone: String,
            contactEmail: String
        },
        settlementPayableTo: String,
        employerCondolences: Boolean
    },

    // ═══════════════════════════════════════════════════════════════
    // MUTUAL AGREEMENT DETAILS
    // ═══════════════════════════════════════════════════════════════
    mutualAgreement: {
        agreementDate: Date,
        agreementReason: String,
        terms: {
            noticePeriodWaived: Boolean,
            severancePayment: Number,
            otherBenefits: String
        },
        agreementDocument: {
            signed: Boolean,
            documentUrl: String
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // EXIT INTERVIEW
    // ═══════════════════════════════════════════════════════════════
    exitInterview: {
        required: { type: Boolean, default: true },
        scheduled: { type: Boolean, default: false },
        scheduledDate: Date,
        conducted: { type: Boolean, default: false },
        conductedDate: Date,
        interviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        interviewerRole: String,
        interviewMethod: {
            type: String,
            enum: ['in_person', 'video', 'phone', 'online_form']
        },

        responses: {
            primaryReason: String,
            primaryReasonCategory: {
                type: String,
                enum: ['compensation', 'career_growth', 'management',
                    'work_environment', 'work_life_balance', 'relocation',
                    'personal', 'health', 'better_opportunity', 'other']
            },
            detailedReason: String,

            ratings: {
                overallSatisfaction: { type: Number, min: 1, max: 5 },
                jobRole: { type: Number, min: 1, max: 5 },
                compensation: { type: Number, min: 1, max: 5 },
                benefits: { type: Number, min: 1, max: 5 },
                workLifeBalance: { type: Number, min: 1, max: 5 },
                careerDevelopment: { type: Number, min: 1, max: 5 },
                training: { type: Number, min: 1, max: 5 },
                management: { type: Number, min: 1, max: 5 },
                teamwork: { type: Number, min: 1, max: 5 },
                workEnvironment: { type: Number, min: 1, max: 5 },
                facilities: { type: Number, min: 1, max: 5 },
                recognition: { type: Number, min: 1, max: 5 }
            },

            whatYouLikedMost: String,
            whatCouldBeImproved: String,

            managerRelationship: {
                rating: { type: Number, min: 1, max: 5 },
                feedback: String
            },

            teamDynamics: String,

            companyPolicies: {
                clear: Boolean,
                fair: Boolean,
                feedback: String
            },

            trainingAndDevelopment: {
                adequate: Boolean,
                feedback: String
            },

            compensationAndBenefits: {
                competitive: Boolean,
                feedback: String
            },

            workload: {
                manageable: Boolean,
                feedback: String
            },

            suggestions: String,
            wouldRecommendCompany: Boolean,
            wouldConsiderReturning: Boolean,
            additionalComments: String
        },

        interviewerNotes: String,
        keyInsights: [String],

        actionItems: [{
            action: String,
            category: {
                type: String,
                enum: ['retention', 'improvement', 'policy', 'training', 'management']
            },
            priority: {
                type: String,
                enum: ['low', 'medium', 'high']
            },
            assignedTo: String
        }],

        interviewDocument: String,
        completed: { type: Boolean, default: false },
        completionDate: Date
    },

    // ═══════════════════════════════════════════════════════════════
    // CLEARANCE PROCESS
    // ═══════════════════════════════════════════════════════════════
    clearance: {
        required: { type: Boolean, default: true },

        itemsToReturn: [clearanceItemSchema],
        allItemsReturned: { type: Boolean, default: false },

        itClearance: {
            required: { type: Boolean, default: true },
            tasks: [clearanceTaskSchema],
            dataBackup: {
                required: Boolean,
                completed: { type: Boolean, default: false },
                backupLocation: String,
                backupDate: Date
            },
            filesTransferred: {
                required: Boolean,
                completed: { type: Boolean, default: false },
                transferredTo: String,
                transferDate: Date
            },
            emailDeactivationDate: Date,
            cleared: { type: Boolean, default: false },
            clearedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            clearanceDate: Date
        },

        financeClearance: {
            required: { type: Boolean, default: true },
            tasks: [clearanceTaskSchema],
            outstandingLoans: { type: Number, default: 0 },
            outstandingAdvances: { type: Number, default: 0 },
            outstandingExpenses: { type: Number, default: 0 },
            totalOutstanding: { type: Number, default: 0 },
            cleared: { type: Boolean, default: false },
            clearedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            clearanceDate: Date
        },

        hrClearance: {
            required: { type: Boolean, default: true },
            tasks: [clearanceTaskSchema],
            cleared: { type: Boolean, default: false },
            clearedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            clearanceDate: Date
        },

        departmentClearance: {
            required: { type: Boolean, default: true },
            tasks: [clearanceTaskSchema],
            cleared: { type: Boolean, default: false },
            clearedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            clearanceDate: Date
        },

        managerClearance: {
            required: { type: Boolean, default: true },
            tasks: [clearanceTaskSchema],
            cleared: { type: Boolean, default: false },
            clearedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            clearanceDate: Date
        },

        allClearancesObtained: { type: Boolean, default: false },
        finalClearanceDate: Date,

        clearanceCertificate: {
            issued: { type: Boolean, default: false },
            issueDate: Date,
            certificateUrl: String
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // KNOWLEDGE TRANSFER
    // ═══════════════════════════════════════════════════════════════
    knowledgeTransfer: {
        required: { type: Boolean, default: true },

        handoverPlan: {
            created: { type: Boolean, default: false },
            createdDate: Date,
            handoverTo: [{
                employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
                employeeName: String,
                role: String,
                responsibilities: [{
                    responsibility: String,
                    priority: { type: String, enum: ['high', 'medium', 'low'] },
                    handedOver: { type: Boolean, default: false },
                    handoverDate: Date
                }]
            }],
            handoverDocument: String
        },

        tasksHandover: {
            tasks: [{
                taskId: String,
                taskName: String,
                taskDescription: String,
                priority: { type: String, enum: ['high', 'medium', 'low'] },
                status: { type: String, enum: ['ongoing', 'completed', 'on_hold'] },
                handedOverTo: String,
                handoverDate: Date,
                instructions: String,
                documents: [String]
            }],
            allTasksHandedOver: { type: Boolean, default: false }
        },

        projectsHandover: {
            projects: [{
                projectId: String,
                projectName: String,
                projectStatus: String,
                completionPercentage: Number,
                handedOverTo: String,
                handoverDate: Date,
                handoverNotes: String,
                documents: [String]
            }],
            allProjectsHandedOver: { type: Boolean, default: false }
        },

        clientMattersHandover: {
            matters: [{
                clientId: String,
                clientName: String,
                matterType: String,
                matterStatus: String,
                upcomingDeadlines: [Date],
                courtDates: [Date],
                handedOverTo: String,
                handoverDate: Date,
                clientNotified: { type: Boolean, default: false },
                clientNotificationDate: Date,
                handoverNotes: String,
                documents: [String]
            }],
            allMattersHandedOver: { type: Boolean, default: false }
        },

        handoverComplete: { type: Boolean, default: false },
        handoverCompletionDate: Date,
        managerApproved: { type: Boolean, default: false },
        managerApprovalDate: Date,
        managerComments: String
    },

    // ═══════════════════════════════════════════════════════════════
    // FINAL SETTLEMENT (Articles 84-87)
    // ═══════════════════════════════════════════════════════════════
    finalSettlement: {
        calculated: { type: Boolean, default: false },
        calculationDate: Date,
        calculatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

        // Calculation base
        calculationBase: {
            lastBasicSalary: Number,
            lastGrossSalary: Number,
            dailyWage: Number, // Basic salary / 30
            serviceYears: Number,
            serviceMonths: Number,
            serviceDays: Number,
            totalServiceMonths: Number
        },

        // EARNINGS
        earnings: {
            // Outstanding salary
            outstandingSalary: {
                applicable: { type: Boolean, default: false },
                workingDaysInLastMonth: Number,
                paidDaysInLastMonth: Number,
                unpaidDays: Number,
                amount: { type: Number, default: 0 }
            },

            // Unused annual leave (Article 109)
            unusedAnnualLeave: {
                applicable: { type: Boolean, default: false },
                totalEntitlement: Number, // 21 or 30 days
                daysUsed: Number,
                daysRemaining: Number,
                carriedForwardDays: Number,
                totalUnusedDays: Number,
                dailyRate: Number, // Basic salary / 30
                amount: { type: Number, default: 0 }
            },

            // EOSB - End of Service Benefit (Articles 84-87)
            eosb: {
                applicable: { type: Boolean, default: true },
                calculation: {
                    years1to5: {
                        years: Number,
                        months: Number,
                        rate: { type: Number, default: 0.5 }, // Half month per year
                        amount: Number
                    },
                    yearsOver5: {
                        years: Number,
                        months: Number,
                        rate: { type: Number, default: 1.0 }, // Full month per year
                        amount: Number
                    },
                    totalEOSB: Number
                },

                // Resignation adjustments (Article 87)
                resignationAdjustment: {
                    exitType: String,
                    serviceYears: Number,
                    // < 2 years: 0%, 2-5 years: 33.33%, 5-10 years: 66.67%, 10+ years: 100%
                    entitlementPercentage: Number,
                    fullEOSB: Number,
                    adjustedEOSB: Number
                },

                finalEOSB: Number,
                calculationFormula: String
            },

            // Unpaid overtime
            unpaidOvertime: {
                applicable: { type: Boolean, default: false },
                overtimeHours: Number,
                hourlyRate: Number,
                overtimeRate: { type: Number, default: 1.5 }, // Article 107
                amount: { type: Number, default: 0 }
            },

            // Unpaid bonuses
            unpaidBonuses: {
                applicable: { type: Boolean, default: false },
                bonusType: String,
                amount: { type: Number, default: 0 }
            },

            // Other allowances
            otherAllowances: {
                applicable: { type: Boolean, default: false },
                allowances: [{
                    allowanceName: String,
                    amount: Number
                }],
                totalAmount: { type: Number, default: 0 }
            },

            totalEarnings: { type: Number, default: 0 }
        },

        // DEDUCTIONS
        deductions: {
            // Outstanding loans
            outstandingLoans: {
                applicable: { type: Boolean, default: false },
                loans: [loanDeductionSchema],
                totalLoansDeduction: { type: Number, default: 0 }
            },

            // Outstanding advances
            outstandingAdvances: {
                applicable: { type: Boolean, default: false },
                advances: [loanDeductionSchema],
                totalAdvancesDeduction: { type: Number, default: 0 }
            },

            // Notice period shortfall
            noticeShortfall: {
                applicable: { type: Boolean, default: false },
                requiredNoticeDays: Number,
                servedNoticeDays: Number,
                shortfallDays: Number,
                dailyWage: Number,
                deductionAmount: { type: Number, default: 0 }
            },

            // Unreturned company property
            unreturnedProperty: {
                applicable: { type: Boolean, default: false },
                items: [{
                    itemType: String,
                    itemDescription: String,
                    itemValue: Number,
                    returned: Boolean
                }],
                totalDeduction: { type: Number, default: 0 }
            },

            // Damages/liabilities
            damages: {
                applicable: { type: Boolean, default: false },
                damageType: String,
                description: String,
                amount: { type: Number, default: 0 },
                evidenceProvided: Boolean,
                evidenceUrl: String,
                employeeAcknowledged: Boolean
            },

            // Other deductions
            otherDeductions: {
                applicable: { type: Boolean, default: false },
                deductions: [{
                    deductionType: String,
                    description: String,
                    amount: Number
                }],
                totalAmount: { type: Number, default: 0 }
            },

            totalDeductions: { type: Number, default: 0 }
        },

        // NET SETTLEMENT
        netSettlement: {
            grossAmount: { type: Number, default: 0 },
            totalDeductions: { type: Number, default: 0 },
            netPayable: { type: Number, default: 0 },
            netPayableInWords: String,
            netPayableInWordsAr: String
        },

        // Payment
        payment: {
            paymentMethod: {
                type: String,
                enum: ['bank_transfer', 'check', 'cash']
            },
            bankDetails: {
                bankName: String,
                iban: String,
                accountNumber: String
            },
            checkDetails: {
                checkNumber: String,
                checkDate: Date
            },
            paymentStatus: {
                type: String,
                enum: ['pending', 'processed', 'paid', 'failed'],
                default: 'pending'
            },
            paymentDate: Date,
            paymentReference: String,
            paymentProof: String,
            receiptIssued: { type: Boolean, default: false },
            receiptNumber: String,
            receiptUrl: String
        },

        // Settlement letter
        settlementLetter: {
            generated: { type: Boolean, default: false },
            generatedDate: Date,
            letterUrl: String,
            issued: { type: Boolean, default: false },
            issuedDate: Date,
            employeeSigned: { type: Boolean, default: false },
            signedDate: Date,
            signedLetterUrl: String
        },

        // Approvals
        approvals: [approvalSchema],

        finalApproved: { type: Boolean, default: false },
        finalApprovalDate: Date,
        approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    },

    // ═══════════════════════════════════════════════════════════════
    // FINAL DOCUMENTS
    // ═══════════════════════════════════════════════════════════════
    finalDocuments: {
        // Experience certificate (REQUIRED by Saudi law)
        experienceCertificate: {
            required: { type: Boolean, default: true },
            requested: { type: Boolean, default: false },
            requestDate: Date,
            prepared: { type: Boolean, default: false },
            preparedDate: Date,
            preparedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            certificateContent: {
                employeeName: String,
                nationalId: String,
                jobTitle: String,
                department: String,
                joinDate: Date,
                exitDate: Date,
                serviceDuration: String,
                jobDescription: String,
                skills: [String],
                goodConduct: { type: Boolean, default: true },
                reasonForLeaving: String
            },
            issued: { type: Boolean, default: false },
            issueDate: Date,
            certificateNumber: String,
            arabicVersion: {
                generated: { type: Boolean, default: false },
                certificateUrl: String
            },
            englishVersion: {
                generated: { type: Boolean, default: false },
                certificateUrl: String
            },
            officialStamp: { type: Boolean, default: false },
            authorizedSignature: { type: Boolean, default: false },
            delivered: { type: Boolean, default: false },
            deliveryDate: Date,
            deliveryMethod: {
                type: String,
                enum: ['hand', 'email', 'mail', 'courier']
            }
        },

        // Reference letter (optional)
        referenceLetter: {
            requested: { type: Boolean, default: false },
            approved: Boolean,
            approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            prepared: Boolean,
            letterUrl: String,
            issued: Boolean,
            issueDate: Date,
            delivered: Boolean
        },

        // Salary certificate
        salaryCertificate: {
            requested: { type: Boolean, default: false },
            prepared: Boolean,
            certificateUrl: String,
            issued: Boolean,
            issueDate: Date
        },

        // NOC - No Objection Certificate
        noc: {
            requested: { type: Boolean, default: false },
            approved: Boolean,
            approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            issued: Boolean,
            issueDate: Date,
            certificateUrl: String
        },

        // GOSI clearance
        gosiClearance: {
            required: { type: Boolean, default: true },
            finalMonthSubmitted: { type: Boolean, default: false },
            submissionDate: Date,
            clearanceCertificate: {
                issued: Boolean,
                certificateUrl: String
            }
        },

        // Other documents
        otherDocuments: [{
            documentType: String,
            documentName: String,
            requested: Boolean,
            prepared: Boolean,
            documentUrl: String,
            issued: Boolean,
            issueDate: Date
        }]
    },

    // ═══════════════════════════════════════════════════════════════
    // REHIRE ELIGIBILITY
    // ═══════════════════════════════════════════════════════════════
    rehireEligibility: {
        eligible: Boolean,
        eligibilityCategory: {
            type: String,
            enum: ['eligible', 'not_eligible', 'conditional', 'blacklisted']
        },
        eligibilityReason: String,
        conditions: [String],
        notes: String,
        evaluatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        evaluationDate: Date,
        coolingOffPeriod: {
            required: Boolean,
            periodMonths: Number,
            earliestRehireDate: Date
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // TIMELINE
    // ═══════════════════════════════════════════════════════════════
    timeline: [timelineEventSchema],

    // ═══════════════════════════════════════════════════════════════
    // NOTES
    // ═══════════════════════════════════════════════════════════════
    notes: {
        hrNotes: String,
        managerNotes: String,
        financeNotes: String,
        internalNotes: String,
        legalNotes: String,
        concerns: String,
        specialInstructions: String
    },

    // ═══════════════════════════════════════════════════════════════
    // COMPLETION
    // ═══════════════════════════════════════════════════════════════
    completion: {
        exitInterviewCompleted: { type: Boolean, default: false },
        clearanceCompleted: { type: Boolean, default: false },
        knowledgeTransferCompleted: { type: Boolean, default: false },
        finalSettlementCompleted: { type: Boolean, default: false },
        documentsIssued: { type: Boolean, default: false },
        allTasksCompleted: { type: Boolean, default: false },
        offboardingCompleted: { type: Boolean, default: false },
        completionDate: Date,

        finalApproval: {
            required: { type: Boolean, default: true },
            approved: { type: Boolean, default: false },
            approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            approvalDate: Date
        },

        caseClosed: { type: Boolean, default: false },
        closedDate: Date,
        closedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    },

    // ═══════════════════════════════════════════════════════════════
    // RELATED RECORDS
    // ═══════════════════════════════════════════════════════════════
    relatedRecords: {
        finalPayrollRunId: String,
        replacementRequisitionId: String,
        grievanceIds: [String],
        legalCaseIds: [String]
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
offboardingSchema.index({ firmId: 1, status: 1 });
offboardingSchema.index({ lawyerId: 1, status: 1 });
offboardingSchema.index({ employeeId: 1 });
offboardingSchema.index({ offboardingId: 1 });
offboardingSchema.index({ exitType: 1 });
offboardingSchema.index({ 'dates.lastWorkingDay': 1 });
offboardingSchema.index({ 'dates.exitEffectiveDate': 1 });
offboardingSchema.index({ 'completion.offboardingCompleted': 1 });

// ═══════════════════════════════════════════════════════════════
// PRE-SAVE HOOKS
// ═══════════════════════════════════════════════════════════════

// Generate offboarding ID
offboardingSchema.pre('save', async function(next) {
    // Generate offboarding ID
    if (!this.offboardingId) {
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
        this.offboardingId = `OFF-${year}-${String(count + 1).padStart(3, '0')}`;
        this.offboardingNumber = this.offboardingId;
    }

    // Set exit effective date if not provided
    if (!this.dates.exitEffectiveDate && this.dates.lastWorkingDay) {
        const effectiveDate = new Date(this.dates.lastWorkingDay);
        effectiveDate.setDate(effectiveDate.getDate() + 1);
        this.dates.exitEffectiveDate = effectiveDate;
    }

    // Set exit category based on exit type
    if (this.exitType && !this.exitCategory) {
        if (['resignation', 'retirement', 'mutual_agreement'].includes(this.exitType)) {
            this.exitCategory = 'voluntary';
            this.initiatedBy = this.exitType === 'mutual_agreement' ? 'mutual' : 'employee';
        } else {
            this.exitCategory = 'involuntary';
            this.initiatedBy = 'employer';
        }
    }

    // Check all clearances
    this.checkAllClearances();

    // Check all tasks completed
    this.checkAllTasksCompleted();

    next();
});

// ═══════════════════════════════════════════════════════════════
// INSTANCE METHODS
// ═══════════════════════════════════════════════════════════════

// Calculate service duration
offboardingSchema.methods.calculateServiceDuration = function(hireDate, exitDate) {
    const hire = new Date(hireDate);
    const exit = new Date(exitDate);

    const totalDays = Math.floor((exit - hire) / (1000 * 60 * 60 * 24));
    const years = Math.floor(totalDays / 365);
    const remainingDays = totalDays % 365;
    const months = Math.floor(remainingDays / 30);
    const days = remainingDays % 30;

    this.serviceDuration = {
        years,
        months,
        days,
        totalMonths: years * 12 + months,
        totalDays
    };

    return this.serviceDuration;
};

// Check all clearances
offboardingSchema.methods.checkAllClearances = function() {
    if (this.clearance) {
        this.clearance.allClearancesObtained =
            (this.clearance.itClearance?.cleared ?? true) &&
            (this.clearance.financeClearance?.cleared ?? true) &&
            (this.clearance.hrClearance?.cleared ?? true) &&
            (this.clearance.departmentClearance?.cleared ?? true) &&
            (this.clearance.managerClearance?.cleared ?? true);

        if (this.clearance.allClearancesObtained && !this.clearance.finalClearanceDate) {
            this.clearance.finalClearanceDate = new Date();
            this.completion.clearanceCompleted = true;
        }
    }
};

// Check all tasks completed
offboardingSchema.methods.checkAllTasksCompleted = function() {
    const exitInterviewDone = this.exitType === 'death' || this.completion.exitInterviewCompleted;
    const clearanceDone = this.completion.clearanceCompleted;
    const settlementDone = this.completion.finalSettlementCompleted;
    const documentsDone = this.completion.documentsIssued;

    this.completion.allTasksCompleted = exitInterviewDone && clearanceDone && settlementDone && documentsDone;
};

// Calculate EOSB (Articles 84-87)
offboardingSchema.methods.calculateEOSB = function(basicSalary) {
    const years = this.serviceDuration.years || 0;
    const months = this.serviceDuration.months || 0;
    const totalYears = years + months / 12;

    let years1to5 = { years: 0, months: 0, rate: 0.5, amount: 0 };
    let yearsOver5 = { years: 0, months: 0, rate: 1.0, amount: 0 };

    if (totalYears <= 5) {
        years1to5 = {
            years: years,
            months: months,
            rate: 0.5,
            amount: totalYears * 0.5 * basicSalary
        };
    } else {
        years1to5 = {
            years: 5,
            months: 0,
            rate: 0.5,
            amount: 5 * 0.5 * basicSalary
        };
        yearsOver5 = {
            years: years - 5,
            months: months,
            rate: 1.0,
            amount: (totalYears - 5) * 1.0 * basicSalary
        };
    }

    const totalEOSB = years1to5.amount + yearsOver5.amount;

    // Apply resignation adjustment (Article 87)
    let resignationAdjustment = null;
    let finalEOSB = totalEOSB;

    if (this.exitType === 'resignation') {
        let entitlementPercentage = 0;

        if (totalYears < 2) {
            entitlementPercentage = 0;
        } else if (totalYears >= 2 && totalYears < 5) {
            entitlementPercentage = 33.33;
        } else if (totalYears >= 5 && totalYears < 10) {
            entitlementPercentage = 66.67;
        } else {
            entitlementPercentage = 100;
        }

        finalEOSB = totalEOSB * (entitlementPercentage / 100);

        resignationAdjustment = {
            exitType: 'resignation',
            serviceYears: totalYears,
            entitlementPercentage,
            fullEOSB: totalEOSB,
            adjustedEOSB: finalEOSB
        };
    }

    // Article 80 - No EOSB for serious violations
    if (this.termination?.article80Violation?.applies) {
        finalEOSB = 0;
        resignationAdjustment = {
            exitType: 'termination_article_80',
            serviceYears: totalYears,
            entitlementPercentage: 0,
            fullEOSB: totalEOSB,
            adjustedEOSB: 0
        };
    }

    const calculationFormula = `
Years 1-5: ${years1to5.years} years × 0.5 × ${basicSalary} SAR = ${years1to5.amount.toFixed(2)} SAR
Years 5+: ${yearsOver5.years} years × 1.0 × ${basicSalary} SAR = ${yearsOver5.amount.toFixed(2)} SAR
Total EOSB: ${totalEOSB.toFixed(2)} SAR
${resignationAdjustment ? `Adjustment (${resignationAdjustment.entitlementPercentage}%): ${finalEOSB.toFixed(2)} SAR` : ''}
    `.trim();

    return {
        applicable: true,
        calculation: { years1to5, yearsOver5, totalEOSB },
        resignationAdjustment,
        finalEOSB,
        calculationFormula
    };
};

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

// Get offboardings for firm or solo lawyer
offboardingSchema.statics.getOffboardings = function(firmId, lawyerId, filters = {}) {
    const query = firmId ? { firmId } : { lawyerId };
    return this.find({ ...query, ...filters })
        .populate('employeeId', 'employeeId personalInfo.fullNameArabic personalInfo.fullNameEnglish')
        .populate('managerId', 'firstName lastName email')
        .populate('createdBy', 'firstName lastName')
        .sort({ createdAt: -1 });
};

// Get stats
offboardingSchema.statics.getStats = async function(firmId, lawyerId) {
    const query = firmId ? { firmId } : { lawyerId };

    const [stats] = await this.aggregate([
        { $match: query },
        {
            $group: {
                _id: null,
                totalOffboardings: { $sum: 1 },
                byStatus: { $push: '$status' },
                byExitType: { $push: '$exitType' }
            }
        }
    ]);

    if (!stats) {
        return {
            totalOffboardings: 0,
            byStatus: [],
            byExitType: [],
            pendingClearances: 0,
            pendingSettlements: 0,
            thisMonth: { initiated: 0, completed: 0, cancelled: 0 },
            averageProcessingDays: 0
        };
    }

    // Count by status
    const statusCounts = {};
    stats.byStatus.forEach(s => {
        statusCounts[s] = (statusCounts[s] || 0) + 1;
    });

    // Count by exit type
    const exitTypeCounts = {};
    stats.byExitType.forEach(t => {
        exitTypeCounts[t] = (exitTypeCounts[t] || 0) + 1;
    });

    // Pending clearances
    const pendingClearances = await this.countDocuments({
        ...query,
        status: 'clearance_pending'
    });

    // Pending settlements
    const pendingSettlements = await this.countDocuments({
        ...query,
        status: { $in: ['in_progress', 'clearance_pending'] },
        'finalSettlement.calculated': true,
        'finalSettlement.payment.paymentStatus': { $ne: 'paid' }
    });

    // This month stats
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const thisMonthInitiated = await this.countDocuments({
        ...query,
        createdAt: { $gte: startOfMonth }
    });

    const thisMonthCompleted = await this.countDocuments({
        ...query,
        status: 'completed',
        'completion.completionDate': { $gte: startOfMonth }
    });

    const thisMonthCancelled = await this.countDocuments({
        ...query,
        status: 'cancelled',
        updatedAt: { $gte: startOfMonth }
    });

    // Average processing days
    const completedOffboardings = await this.find({
        ...query,
        status: 'completed',
        'completion.completionDate': { $exists: true }
    }).select('createdAt completion.completionDate');

    let avgDays = 0;
    if (completedOffboardings.length > 0) {
        const totalDays = completedOffboardings.reduce((sum, off) => {
            const days = Math.floor((new Date(off.completion.completionDate) - new Date(off.createdAt)) / (1000 * 60 * 60 * 24));
            return sum + days;
        }, 0);
        avgDays = Math.round(totalDays / completedOffboardings.length);
    }

    return {
        totalOffboardings: stats.totalOffboardings,
        byStatus: Object.entries(statusCounts).map(([status, count]) => ({ status, count })),
        byExitType: Object.entries(exitTypeCounts).map(([exitType, count]) => ({ exitType, count })),
        pendingClearances,
        pendingSettlements,
        thisMonth: {
            initiated: thisMonthInitiated,
            completed: thisMonthCompleted,
            cancelled: thisMonthCancelled
        },
        averageProcessingDays: avgDays
    };
};

// Get pending clearances
offboardingSchema.statics.getPendingClearances = async function(firmId, lawyerId) {
    const query = firmId ? { firmId } : { lawyerId };
    query.status = 'clearance_pending';
    query['clearance.allClearancesObtained'] = false;

    return this.find(query)
        .select('offboardingId employeeName employeeNameAr dates.lastWorkingDay clearance')
        .sort({ 'dates.lastWorkingDay': 1 });
};

// Get pending settlements
offboardingSchema.statics.getPendingSettlements = async function(firmId, lawyerId) {
    const query = firmId ? { firmId } : { lawyerId };
    query['finalSettlement.calculated'] = true;
    query['finalSettlement.payment.paymentStatus'] = { $in: ['pending', 'processed'] };

    return this.find(query)
        .select('offboardingId employeeName employeeNameAr finalSettlement.netSettlement.netPayable finalSettlement.payment.paymentStatus')
        .sort({ 'finalSettlement.calculationDate': 1 });
};

// Ensure virtuals are included in JSON
offboardingSchema.set('toJSON', { virtuals: true });
offboardingSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Offboarding', offboardingSchema);
