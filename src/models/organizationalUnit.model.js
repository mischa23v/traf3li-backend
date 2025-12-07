const mongoose = require('mongoose');

// ═══════════════════════════════════════════════════════════════
// SUB-SCHEMAS
// ═══════════════════════════════════════════════════════════════

// Leadership Position Schema
const leadershipPositionSchema = new mongoose.Schema({
    positionId: String,
    positionTitle: String,
    positionTitleAr: String,
    positionType: {
        type: String,
        enum: ['manager', 'director', 'head', 'supervisor', 'lead', 'coordinator', 'acting']
    },
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    employeeName: String,
    employeeNameAr: String,
    isPrimary: { type: Boolean, default: false },
    startDate: Date,
    endDate: Date,
    actingFor: String,
    reportingTo: String
}, { _id: true });

// KPI Schema
const kpiSchema = new mongoose.Schema({
    kpiId: String,
    kpiName: String,
    kpiNameAr: String,
    category: {
        type: String,
        enum: ['financial', 'customer', 'process', 'people', 'growth']
    },
    measurementUnit: String,
    targetValue: Number,
    actualValue: Number,
    achievementRate: Number,
    period: {
        type: String,
        enum: ['monthly', 'quarterly', 'yearly']
    },
    frequency: {
        type: String,
        enum: ['daily', 'weekly', 'monthly', 'quarterly', 'annual']
    },
    trend: { type: String, enum: ['improving', 'stable', 'declining'] },
    status: {
        type: String,
        enum: ['on_track', 'at_risk', 'behind', 'achieved']
    },
    owner: String,
    lastUpdated: Date
}, { _id: true });

// Position Schema
const positionSchema = new mongoose.Schema({
    positionId: String,
    positionCode: String,
    jobTitle: String,
    jobTitleAr: String,
    jobLevel: String,
    filled: { type: Boolean, default: false },
    incumbentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    incumbentName: String,
    reportsToPositionId: String,
    fte: { type: Number, default: 1.0 },
    essential: { type: Boolean, default: false },
    budgetedSalary: Number,
    actualSalary: Number
}, { _id: true });

// Audit Entry Schema
const auditEntrySchema = new mongoose.Schema({
    auditDate: Date,
    auditType: {
        type: String,
        enum: ['internal', 'external', 'regulatory', 'financial', 'operational']
    },
    auditor: String,
    scope: String,
    findings: [{
        findingType: { type: String, enum: ['major', 'minor', 'observation'] },
        description: String,
        correctionRequired: { type: Boolean, default: false },
        corrected: { type: Boolean, default: false },
        correctionDate: Date
    }],
    overallRating: String,
    reportUrl: String,
    followUpRequired: { type: Boolean, default: false },
    followUpDate: Date
}, { _id: true });

// Risk Entry Schema
const riskEntrySchema = new mongoose.Schema({
    riskId: String,
    riskDescription: String,
    riskCategory: {
        type: String,
        enum: ['operational', 'financial', 'strategic', 'compliance', 'reputational', 'safety', 'cybersecurity']
    },
    likelihood: { type: String, enum: ['low', 'medium', 'high'] },
    impact: { type: String, enum: ['low', 'medium', 'high'] },
    riskLevel: { type: String, enum: ['low', 'medium', 'high', 'critical'] },
    mitigationStrategies: [String],
    riskOwner: String,
    lastReviewed: Date
}, { _id: true });

// Restructuring History Schema
const restructuringHistorySchema = new mongoose.Schema({
    restructureId: String,
    restructureDate: Date,
    restructureType: {
        type: String,
        enum: ['merger', 'split', 'reorganization', 'downsizing', 'expansion', 'relocation', 'process_change']
    },
    description: String,
    reason: String,
    impactedEmployees: Number,
    headcountChange: Number,
    budgetImpact: Number,
    approvedBy: String,
    implementationDate: Date,
    completionDate: Date,
    successful: Boolean,
    lessonsLearned: String
}, { _id: true });

// Communication Schema
const communicationSchema = new mongoose.Schema({
    communicationId: String,
    communicationType: {
        type: String,
        enum: ['announcement', 'policy_update', 'restructure_notice', 'performance_update', 'newsletter', 'meeting_minutes']
    },
    date: { type: Date, default: Date.now },
    subject: String,
    communicatedBy: String,
    audience: {
        type: String,
        enum: ['all_employees', 'management', 'specific_roles', 'external']
    },
    messageUrl: String,
    readReceipts: Number
}, { _id: true });

// Document Schema
const documentSchema = new mongoose.Schema({
    documentType: {
        type: String,
        enum: ['org_chart', 'charter', 'policy', 'procedure', 'budget', 'strategic_plan',
               'business_plan', 'performance_report', 'audit_report', 'license', 'registration', 'other']
    },
    documentName: String,
    documentNameAr: String,
    fileUrl: String,
    version: String,
    effectiveDate: Date,
    expiryDate: Date,
    uploadedOn: { type: Date, default: Date.now },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    confidential: { type: Boolean, default: false },
    accessLevel: {
        type: String,
        enum: ['public', 'internal', 'management', 'restricted'],
        default: 'internal'
    }
}, { _id: true });

// ═══════════════════════════════════════════════════════════════
// MAIN SCHEMA
// ═══════════════════════════════════════════════════════════════

const organizationalUnitSchema = new mongoose.Schema({
    // ==================== IDENTIFICATION ====================
    unitId: { type: String, unique: true, sparse: true },
    unitCode: { type: String, required: true },

    // ==================== MULTI-TENANCY ====================
    firmId: { type: mongoose.Schema.Types.ObjectId, ref: 'Firm', index: true },
    lawyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },

    // ==================== UNIT DETAILS ====================
    unitType: {
        type: String,
        enum: ['company', 'legal_entity', 'division', 'business_unit', 'department',
               'subdepartment', 'team', 'section', 'branch', 'office', 'subsidiary',
               'region', 'project_team', 'committee', 'other'],
        required: true
    },
    unitTypeAr: String,
    unitCategory: {
        type: String,
        enum: ['operational', 'support', 'administrative', 'strategic', 'project_based', 'temporary', 'permanent'],
        default: 'permanent'
    },
    unitName: { type: String, required: true },
    unitNameAr: String,
    officialName: String,
    officialNameAr: String,
    shortName: String,
    abbreviation: String,

    // ==================== DESCRIPTION ====================
    description: String,
    descriptionAr: String,
    mission: String,
    missionAr: String,
    vision: String,
    visionAr: String,
    objectives: [String],
    objectivesAr: [String],
    functions: [String],
    functionsAr: [String],

    // ==================== LEGAL ENTITY ====================
    legalEntity: {
        isLegalEntity: { type: Boolean, default: false },
        legalEntityType: {
            type: String,
            enum: ['limited_liability', 'joint_stock', 'partnership', 'sole_proprietorship',
                   'branch', 'holding_company', 'subsidiary']
        },
        registrationNumber: String,
        taxNumber: String,
        commercialRegistration: String,
        registrationDate: Date,
        registeredAddress: String,
        saudiEntityNumber: String,
        authorizedCapital: Number,
        paidUpCapital: Number
    },

    // ==================== HIERARCHY ====================
    parentUnitId: { type: mongoose.Schema.Types.ObjectId, ref: 'OrganizationalUnit', index: true },
    parentUnitCode: String,
    parentUnitName: String,
    parentUnitNameAr: String,
    topLevelParentId: { type: mongoose.Schema.Types.ObjectId, ref: 'OrganizationalUnit' },
    topLevelParentName: String,
    level: { type: Number, default: 0 },
    path: String,
    hierarchyPath: String,
    hasChildren: { type: Boolean, default: false },
    childUnitsCount: { type: Number, default: 0 },

    // Reporting relationships
    reportsTo: {
        directReportingUnit: {
            unitId: { type: mongoose.Schema.Types.ObjectId, ref: 'OrganizationalUnit' },
            unitName: String
        },
        functionalReportingUnit: {
            unitId: { type: mongoose.Schema.Types.ObjectId, ref: 'OrganizationalUnit' },
            unitName: String
        },
        dottedLineReporting: [{
            unitId: { type: mongoose.Schema.Types.ObjectId, ref: 'OrganizationalUnit' },
            unitName: String,
            relationshipType: String
        }]
    },

    // Chart position
    chartPosition: {
        xCoordinate: Number,
        yCoordinate: Number,
        displayOrder: Number
    },

    // ==================== LEADERSHIP ====================
    leadership: [leadershipPositionSchema],
    managerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    managerName: String,
    managerNameAr: String,
    headOfUnit: {
        employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
        employeeNumber: String,
        employeeName: String,
        employeeNameAr: String,
        jobTitle: String,
        jobTitleAr: String,
        appointmentDate: Date,
        reportingRelationship: { type: String, enum: ['direct', 'functional', 'dotted_line'] },
        reportsToEmployeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
        reportsToEmployeeName: String,
        email: String,
        phone: String,
        actingHead: { type: Boolean, default: false },
        actingStartDate: Date,
        actingEndDate: Date
    },
    deputyHead: {
        employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
        employeeName: String,
        jobTitle: String,
        appointmentDate: Date
    },
    managementTeam: [{
        employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
        employeeName: String,
        jobTitle: String,
        role: { type: String, enum: ['head', 'deputy', 'manager', 'supervisor', 'lead', 'member'] },
        responsibilityArea: String,
        votingMember: { type: Boolean, default: false }
    }],
    successionPlan: {
        hasPlan: { type: Boolean, default: false },
        successors: [{
            employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
            employeeName: String,
            readinessLevel: { type: String, enum: ['ready_now', 'ready_1_year', 'ready_2_3_years', 'developing'] },
            developmentNeeds: [String],
            rank: Number
        }],
        lastReviewDate: Date,
        nextReviewDate: Date
    },

    // ==================== HEADCOUNT ====================
    headcount: {
        // Current headcount
        approvedHeadcount: { type: Number, default: 0 },
        currentHeadcount: { type: Number, default: 0 },
        vacancies: { type: Number, default: 0 },
        vacancyRate: Number,

        // By employment type
        fullTimeEmployees: { type: Number, default: 0 },
        partTimeEmployees: { type: Number, default: 0 },
        contractors: { type: Number, default: 0 },
        temporaryWorkers: { type: Number, default: 0 },
        interns: { type: Number, default: 0 },
        consultants: { type: Number, default: 0 },

        // By nationality (Saudi context)
        saudiCount: Number,
        nonSaudiCount: Number,
        saudizationRate: Number,

        // By gender
        maleCount: Number,
        femaleCount: Number,
        genderRatio: Number,

        // By level
        byLevel: {
            executive: { type: Number, default: 0 },
            management: { type: Number, default: 0 },
            professional: { type: Number, default: 0 },
            administrative: { type: Number, default: 0 },
            operational: { type: Number, default: 0 }
        },

        // Approved headcount details
        approvedBy: String,
        approvalDate: Date,
        fiscalYear: String,

        // Turnover
        turnover: {
            newHires: { type: Number, default: 0 },
            terminations: { type: Number, default: 0 },
            netChange: { type: Number, default: 0 },
            turnoverRate: Number,
            retentionRate: Number,
            terminationReasons: [{
                reason: String,
                count: Number
            }]
        }
    },

    // Positions
    positions: {
        totalPositions: { type: Number, default: 0 },
        filledPositions: { type: Number, default: 0 },
        vacantPositions: { type: Number, default: 0 },
        positionsList: [positionSchema]
    },

    // Headcount planning
    headcountPlan: {
        planningPeriod: String,
        plannedHeadcount: Number,
        plannedHires: Number,
        anticipatedAttrition: Number,
        projectedEndHeadcount: Number,
        rationaleForChanges: String,
        approvalStatus: { type: String, enum: ['draft', 'submitted', 'approved', 'rejected'] }
    },

    // ==================== BUDGET ====================
    budget: {
        hasBudget: { type: Boolean, default: false },
        fiscalYear: String,
        annualBudget: Number,
        currentYearBudget: Number,
        budgetUtilization: Number,
        salaryBudget: Number,
        operationalBudget: Number,
        capitalBudget: Number,
        trainingBudget: Number,
        spentToDate: { type: Number, default: 0 },
        remainingBudget: Number,
        currency: { type: String, default: 'SAR' },
        budgetApprovalDate: Date,
        budgetApprovedBy: String,
        forecastedSpend: Number,
        varianceExplanation: String,

        // Revenue (if applicable)
        revenue: {
            revenueTarget: Number,
            revenueToDate: Number,
            projectedRevenue: Number,
            achievementRate: Number
        },

        // Budget holder
        budgetHolder: {
            employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
            employeeName: String,
            jobTitle: String
        }
    },

    // ==================== COST CENTER ====================
    costCenter: {
        isCostCenter: { type: Boolean, default: false },
        costCenterId: String,
        costCenterCode: String,
        costCenterName: String,
        costCenterNameAr: String,
        costCenterType: {
            type: String,
            enum: ['revenue_generating', 'cost_center', 'profit_center', 'investment_center', 'shared_services', 'support']
        },
        profitCenter: String,
        businessUnit: String,
        responsibleManager: String
    },

    // GL allocation
    glAllocation: {
        defaultGLAccount: String,
        allocationRules: [{
            expenseType: String,
            glAccount: String,
            percentage: Number
        }]
    },

    // ==================== FUNCTIONS & RESPONSIBILITIES ====================
    functionsResponsibilities: {
        primaryFunction: String,
        primaryFunctionAr: String,
        functionCategory: {
            type: String,
            enum: ['revenue_generating', 'cost_center', 'support', 'overhead', 'profit_center', 'investment_center']
        },
        coreResponsibilities: [{
            responsibility: String,
            responsibilityAr: String,
            priority: { type: String, enum: ['primary', 'secondary', 'tertiary'] },
            description: String
        }],
        keyActivities: [{
            activity: String,
            activityAr: String,
            frequency: { type: String, enum: ['daily', 'weekly', 'monthly', 'quarterly', 'annual', 'ad_hoc'] }
        }],
        servicesProvided: [{
            service: String,
            serviceAr: String,
            providedTo: { type: String, enum: ['internal', 'external', 'both'] },
            clients: [String]
        }]
    },

    // Authority & decision rights
    approvalAuthority: {
        financialApproval: { type: String, enum: ['unlimited', 'high', 'medium', 'low', 'none'], default: 'none' },
        financialLimit: Number,
        hiringApproval: { type: Boolean, default: false },
        terminationApproval: { type: Boolean, default: false },
        leaveApproval: { type: Boolean, default: false },
        procurementApproval: { type: Boolean, default: false },
        procurementLimit: Number,
        contractApproval: { type: Boolean, default: false },
        contractLimit: Number,
        travelApproval: { type: Boolean, default: false },
        overtimeApproval: { type: Boolean, default: false }
    },

    delegatedAuthorities: [{
        authorityType: String,
        delegatedTo: String,
        effectiveDate: Date,
        expiryDate: Date,
        limitations: String
    }],

    // ==================== KPIs ====================
    kpis: [kpiSchema],

    // ==================== LOCATION ====================
    location: {
        locationType: {
            type: String,
            enum: ['headquarters', 'branch', 'office', 'plant', 'warehouse', 'retail', 'remote', 'virtual']
        },
        locationName: String,
        locationNameAr: String,
        address: {
            building: String,
            floor: String,
            street: String,
            district: String,
            city: String,
            region: String,
            country: { type: String, default: 'Saudi Arabia' },
            postalCode: String,
            poBox: String,
            coordinates: {
                latitude: Number,
                longitude: Number
            }
        },
        phoneNumber: String,
        faxNumber: String,
        email: String,
        officeHours: {
            weekdays: String,
            weekends: String,
            ramadanHours: String
        }
    },

    // Additional locations
    additionalLocations: [{
        locationId: String,
        locationName: String,
        locationType: String,
        city: String,
        country: String,
        headcount: Number,
        primary: { type: Boolean, default: false }
    }],

    // Facilities
    facilities: {
        officeSpace: {
            totalSquareMeters: Number,
            workstations: Number,
            privateOffices: Number,
            meetingRooms: Number,
            amenities: [String]
        },
        equipment: [{
            equipmentType: String,
            quantity: Number
        }],
        accessibility: {
            wheelchairAccessible: { type: Boolean, default: false },
            accommodations: [String]
        }
    },

    // Remote work
    remoteWork: {
        allowsRemoteWork: { type: Boolean, default: false },
        remoteWorkPolicy: { type: String, enum: ['fully_remote', 'hybrid', 'on_site_only', 'flexible'] },
        remoteEmployees: Number,
        hybridSchedule: String
    },

    // ==================== OPERATIONS ====================
    operations: {
        workingHours: {
            standardWorkWeek: Number,
            workDays: [String],
            standardHours: String,
            ramadanHours: String,
            flexibleHours: { type: Boolean, default: false },
            coreHours: String,
            shiftWork: { type: Boolean, default: false },
            shifts: [{
                shiftName: String,
                shiftHours: String,
                employeesOnShift: Number
            }]
        },
        slas: [{
            slaName: String,
            serviceProvided: String,
            client: String,
            responseTime: String,
            resolutionTime: String,
            availabilityTarget: String,
            currentPerformance: {
                responseTimeMet: Number,
                resolutionTimeMet: Number,
                availability: Number
            }
        }],
        criticalProcesses: [{
            processName: String,
            processNameAr: String,
            processOwner: String,
            documentedProcess: { type: Boolean, default: false },
            processDocumentUrl: String,
            lastReviewDate: Date,
            nextReviewDate: Date,
            certifications: [String]
        }],
        businessContinuity: {
            bcpInPlace: { type: Boolean, default: false },
            bcpLastReviewed: Date,
            criticalityLevel: { type: String, enum: ['essential', 'important', 'standard', 'low'] },
            rto: Number,
            rpo: Number,
            backupLocation: String,
            crossTrainedStaff: Number
        }
    },

    // ==================== TECHNOLOGY ====================
    technologySystems: {
        primarySystems: [{
            systemName: String,
            systemType: { type: String, enum: ['erp', 'crm', 'hrms', 'finance', 'operations', 'communication', 'collaboration', 'specialized'] },
            vendor: String,
            userLicenses: Number,
            systemOwner: String,
            criticalSystem: { type: Boolean, default: false }
        }],
        itInfrastructure: {
            networkConnectivity: { type: Boolean, default: true },
            secureAccess: { type: Boolean, default: true },
            vpnRequired: { type: Boolean, default: false },
            dataStorageLocation: String,
            backupFrequency: String
        },
        digitalTransformation: {
            digitizationLevel: { type: String, enum: ['low', 'medium', 'high', 'fully_digital'] },
            ongoingProjects: [String],
            aiAdoption: { type: Boolean, default: false },
            aiUseCases: [String]
        }
    },

    // ==================== COMPLIANCE ====================
    compliance: {
        laborLawCompliant: { type: Boolean, default: true },
        saudizationCompliant: { type: Boolean, default: true },
        healthSafetyCompliant: { type: Boolean, default: true },
        lastAuditDate: Date,
        nextAuditDate: Date,
        auditFindings: String,
        complianceScore: Number,
        certifications: [String],
        regulatoryRequirements: [String],

        // Saudi-specific
        saudiCompliance: {
            nitaqatCompliant: { type: Boolean, default: true },
            gosiRegistered: { type: Boolean, default: true },
            laborOfficeRegistered: { type: Boolean, default: true },
            chamberOfCommerceRegistered: Boolean,
            moiPermits: {
                hasWorkPermits: { type: Boolean, default: false },
                expatCount: Number,
                iqamaRenewals: Number
            }
        },

        // Governance
        governance: {
            governanceModel: { type: String, enum: ['hierarchical', 'matrix', 'flat', 'network'] },
            decisionMakingProcess: String,
            escalationPath: [{
                level: Number,
                role: String,
                approvalLimit: Number
            }],
            committees: [{
                committeeName: String,
                committeeType: String,
                purpose: String,
                meetingFrequency: String,
                chairperson: String,
                members: [{
                    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
                    employeeName: String,
                    role: { type: String, enum: ['chair', 'member', 'secretary'] }
                }]
            }]
        },

        // Applicable policies
        applicablePolicies: [{
            policyName: String,
            policyNameAr: String,
            policyType: { type: String, enum: ['hr', 'finance', 'operations', 'it', 'safety', 'compliance', 'ethics'] },
            policyReference: String,
            policyUrl: String,
            mandatoryCompliance: { type: Boolean, default: true },
            lastReviewDate: Date,
            nextReviewDate: Date
        }],

        // Regulatory compliance
        applicableRegulations: [{
            regulation: String,
            regulatoryBody: String,
            requiresReporting: { type: Boolean, default: false },
            reportingFrequency: String,
            lastAudit: Date,
            nextAudit: Date,
            compliant: { type: Boolean, default: true },
            complianceOfficer: String
        }]
    },

    // Risk management
    riskManagement: {
        riskRegister: [riskEntrySchema],
        riskScore: Number
    },

    // Audit history
    auditHistory: [auditEntrySchema],

    // ==================== PERFORMANCE ====================
    performance: {
        overallPerformance: {
            performanceRating: { type: String, enum: ['exceeds', 'meets', 'below', 'unsatisfactory'] },
            ratingPeriod: String,
            ratedBy: String,
            ratingDate: Date,
            strengthsAreas: [String],
            improvementAreas: [String]
        },
        departmentalKPIs: [kpiSchema],
        benchmarking: {
            industryBenchmarks: [{
                metric: String,
                companyValue: Number,
                industryAverage: Number,
                industryBest: Number,
                percentile: Number,
                gap: Number
            }]
        },
        employeeSatisfaction: {
            lastSurveyDate: Date,
            satisfactionScore: Number,
            engagementScore: Number,
            responseRate: Number,
            topStrengths: [String],
            topConcerns: [String],
            actionPlanDeveloped: { type: Boolean, default: false },
            actionItems: [String]
        }
    },

    // ==================== CHANGE MANAGEMENT ====================
    changeManagement: {
        restructuringHistory: [restructuringHistorySchema],
        ongoingChanges: [{
            changeId: String,
            changeName: String,
            changeType: String,
            startDate: Date,
            expectedEndDate: Date,
            changeLeader: String,
            status: { type: String, enum: ['planning', 'in_progress', 'completed', 'on_hold'] },
            percentComplete: Number,
            impactLevel: { type: String, enum: ['low', 'medium', 'high'] },
            stakeholders: [String],
            communicationPlan: { type: Boolean, default: false },
            resistanceLevel: { type: String, enum: ['low', 'medium', 'high'] }
        }]
    },

    // ==================== RELATIONSHIPS ====================
    relationships: {
        internalRelationships: [{
            relatedUnitId: { type: mongoose.Schema.Types.ObjectId, ref: 'OrganizationalUnit' },
            relatedUnitName: String,
            relationshipType: { type: String, enum: ['parent', 'child', 'sibling', 'partner', 'customer', 'supplier'] },
            relationshipDescription: String,
            interactionFrequency: { type: String, enum: ['daily', 'weekly', 'monthly', 'quarterly', 'as_needed'] },
            slaInPlace: { type: Boolean, default: false }
        }],
        externalRelationships: [{
            entityName: String,
            entityType: { type: String, enum: ['vendor', 'client', 'partner', 'regulatory_body', 'professional_association', 'competitor', 'other'] },
            relationshipDescription: String,
            keyContactPerson: String,
            contractInPlace: { type: Boolean, default: false },
            contractExpiry: Date
        }],
        interdependencies: [{
            dependsOnUnit: String,
            dependencyType: { type: String, enum: ['critical', 'important', 'moderate', 'low'] },
            dependencyDescription: String,
            slaInPlace: { type: Boolean, default: false },
            backupPlan: String
        }]
    },

    // ==================== TRAINING ====================
    trainingDevelopment: {
        requiredTraining: [{
            trainingName: String,
            trainingNameAr: String,
            trainingType: { type: String, enum: ['mandatory', 'recommended', 'optional'] },
            applicableToRoles: [String],
            frequency: { type: String, enum: ['one_time', 'annual', 'biennial', 'as_needed'] },
            provider: String,
            completionRate: Number,
            nextScheduledDate: Date
        }],
        developmentInitiatives: [{
            initiativeName: String,
            initiativeType: { type: String, enum: ['technical_skills', 'leadership', 'soft_skills', 'certification', 'degree_program'] },
            targetAudience: String,
            budget: Number,
            participantsEnrolled: Number,
            completionRate: Number,
            roi: String
        }],
        trainingBudget: {
            annualBudget: Number,
            spentToDate: Number,
            utilizationRate: Number,
            budgetPerEmployee: Number
        }
    },

    // ==================== EFFECTIVE DATES & STATUS ====================
    status: {
        type: String,
        enum: ['active', 'inactive', 'planned', 'suspended', 'dissolved', 'merged', 'restructuring'],
        default: 'active',
        index: true
    },
    statusEffectiveDate: Date,
    establishedDate: Date,
    effectiveDate: Date,
    endDate: Date,
    endReason: { type: String, enum: ['merger', 'dissolution', 'reorganization', 'closure'] },
    successorUnitId: { type: mongoose.Schema.Types.ObjectId, ref: 'OrganizationalUnit' },
    successorUnitName: String,

    plannedChanges: [{
        changeType: { type: String, enum: ['name_change', 'structure_change', 'relocation', 'merger', 'split', 'dissolution'] },
        plannedEffectiveDate: Date,
        description: String,
        approvalStatus: { type: String, enum: ['proposed', 'approved', 'rejected'] }
    }],

    // ==================== COMMUNICATIONS ====================
    communications: [communicationSchema],

    // ==================== DOCUMENTS ====================
    documents: [documentSchema],

    // ==================== NOTES ====================
    notes: {
        generalNotes: String,
        hrNotes: String,
        financeNotes: String,
        managementNotes: String,
        historicalNotes: String,
        specialInstructions: String
    },
    internalNotes: String,

    // ==================== ANALYTICS ====================
    analytics: {
        headcountGrowth: {
            growthRate: Number,
            growthTrend: { type: String, enum: ['growing', 'stable', 'shrinking'] },
            projectedGrowth: Number
        },
        efficiency: {
            revenuePerEmployee: Number,
            profitPerEmployee: Number,
            costPerEmployee: Number,
            spanOfControl: Number
        },
        vsCompanyAverage: {
            turnover: { type: String, enum: ['lower', 'average', 'higher'] },
            satisfaction: { type: String, enum: ['lower', 'average', 'higher'] },
            productivity: { type: String, enum: ['lower', 'average', 'higher'] }
        }
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

organizationalUnitSchema.index({ firmId: 1, status: 1 });
organizationalUnitSchema.index({ lawyerId: 1, status: 1 });
organizationalUnitSchema.index({ parentUnitId: 1 });
organizationalUnitSchema.index({ unitCode: 1 });
organizationalUnitSchema.index({ unitType: 1 });
organizationalUnitSchema.index({ level: 1 });
organizationalUnitSchema.index({ 'costCenter.costCenterCode': 1 });

// ═══════════════════════════════════════════════════════════════
// VIRTUALS
// ═══════════════════════════════════════════════════════════════

// Virtual for child units
organizationalUnitSchema.virtual('childUnits', {
    ref: 'OrganizationalUnit',
    localField: '_id',
    foreignField: 'parentUnitId'
});

// Calculate if unit is a root unit (no parent)
organizationalUnitSchema.virtual('isRootUnit').get(function() {
    return !this.parentUnitId;
});

// Calculate vacancy percentage
organizationalUnitSchema.virtual('vacancyPercentage').get(function() {
    if (!this.headcount?.approvedHeadcount || this.headcount.approvedHeadcount === 0) return 0;
    return Math.round(((this.headcount.approvedHeadcount - (this.headcount.currentHeadcount || 0)) / this.headcount.approvedHeadcount) * 100);
});

// Enable virtuals in JSON
organizationalUnitSchema.set('toJSON', { virtuals: true });
organizationalUnitSchema.set('toObject', { virtuals: true });

// ═══════════════════════════════════════════════════════════════
// PRE-SAVE HOOKS
// ═══════════════════════════════════════════════════════════════

organizationalUnitSchema.pre('save', async function(next) {
    // Auto-generate unitId
    if (!this.unitId) {
        const year = new Date().getFullYear();
        const query = this.firmId ? { firmId: this.firmId } : { lawyerId: this.lawyerId };
        const count = await this.constructor.countDocuments({
            ...query,
            unitId: new RegExp(`^OU-${year}-`)
        });
        this.unitId = `OU-${year}-${String(count + 1).padStart(3, '0')}`;
    }

    // Calculate level based on parent
    if (this.isNew || this.isModified('parentUnitId')) {
        if (this.parentUnitId) {
            const parent = await this.constructor.findById(this.parentUnitId);
            if (parent) {
                this.level = parent.level + 1;
                this.path = parent.path ? `${parent.path}/${this.unitCode}` : `/${parent.unitCode}/${this.unitCode}`;
                this.hierarchyPath = parent.hierarchyPath ? `${parent.hierarchyPath}.${this.level}` : `0.${this.level}`;
                this.parentUnitCode = parent.unitCode;
                this.parentUnitName = parent.unitName;
                this.parentUnitNameAr = parent.unitNameAr;

                // Find top-level parent
                let topParent = parent;
                while (topParent.parentUnitId) {
                    topParent = await this.constructor.findById(topParent.parentUnitId);
                }
                this.topLevelParentId = topParent._id;
                this.topLevelParentName = topParent.unitName;
            }
        } else {
            this.level = 0;
            this.path = `/${this.unitCode}`;
            this.hierarchyPath = '0';
        }
    }

    // Calculate headcount metrics
    if (this.headcount) {
        // Calculate vacancies
        this.headcount.vacancies = Math.max(0, (this.headcount.approvedHeadcount || 0) - (this.headcount.currentHeadcount || 0));

        // Calculate vacancy rate
        if (this.headcount.approvedHeadcount > 0) {
            this.headcount.vacancyRate = Math.round((this.headcount.vacancies / this.headcount.approvedHeadcount) * 100);
        }

        // Calculate saudization rate
        const totalNationality = (this.headcount.saudiCount || 0) + (this.headcount.nonSaudiCount || 0);
        if (totalNationality > 0) {
            this.headcount.saudizationRate = Math.round(((this.headcount.saudiCount || 0) / totalNationality) * 100);
        }

        // Calculate gender ratio
        const totalGender = (this.headcount.maleCount || 0) + (this.headcount.femaleCount || 0);
        if (totalGender > 0 && this.headcount.femaleCount) {
            this.headcount.genderRatio = Math.round(((this.headcount.femaleCount || 0) / totalGender) * 100);
        }

        // Calculate turnover net change
        if (this.headcount.turnover) {
            this.headcount.turnover.netChange = (this.headcount.turnover.newHires || 0) - (this.headcount.turnover.terminations || 0);
        }
    }

    // Calculate budget metrics
    if (this.budget && this.budget.annualBudget > 0) {
        this.budget.remainingBudget = this.budget.annualBudget - (this.budget.spentToDate || 0);
        this.budget.budgetUtilization = Math.round(((this.budget.spentToDate || 0) / this.budget.annualBudget) * 100);
    }

    // Calculate positions metrics
    if (this.positions?.positionsList?.length > 0) {
        this.positions.totalPositions = this.positions.positionsList.length;
        this.positions.filledPositions = this.positions.positionsList.filter(p => p.filled).length;
        this.positions.vacantPositions = this.positions.totalPositions - this.positions.filledPositions;
    }

    next();
});

// Update parent's hasChildren and childUnitsCount after save
organizationalUnitSchema.post('save', async function(doc) {
    if (doc.parentUnitId) {
        await this.constructor.findByIdAndUpdate(doc.parentUnitId, {
            hasChildren: true,
            $inc: { childUnitsCount: 1 }
        });
    }
});

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

// Generate unit code
organizationalUnitSchema.statics.generateUnitCode = async function(firmId, lawyerId, unitType) {
    const prefix = unitType.substring(0, 3).toUpperCase();
    const query = firmId ? { firmId } : { lawyerId };
    const count = await this.countDocuments({
        ...query,
        unitType
    });
    return `${prefix}-${String(count + 1).padStart(3, '0')}`;
};

// Build hierarchy tree
organizationalUnitSchema.statics.buildTree = async function(firmId, lawyerId, parentId = null) {
    const query = firmId ? { firmId, parentUnitId: parentId } : { lawyerId, parentUnitId: parentId };

    const units = await this.find(query).sort({ level: 1, 'chartPosition.displayOrder': 1 });

    const tree = await Promise.all(units.map(async (unit) => ({
        _id: unit._id,
        unitId: unit.unitId,
        unitCode: unit.unitCode,
        unitName: unit.unitName,
        unitNameAr: unit.unitNameAr,
        unitType: unit.unitType,
        status: unit.status,
        level: unit.level,
        headcount: unit.headcount?.currentHeadcount || 0,
        managerName: unit.managerNameAr || unit.managerName,
        children: await this.buildTree(firmId, lawyerId, unit._id)
    })));

    return tree;
};

// Get unit path (ancestors)
organizationalUnitSchema.statics.getUnitPath = async function(unitId) {
    const path = [];
    let current = await this.findById(unitId);

    while (current) {
        path.unshift({
            _id: current._id,
            unitId: current.unitId,
            unitCode: current.unitCode,
            unitName: current.unitName,
            unitType: current.unitType,
            level: current.level
        });

        if (current.parentUnitId) {
            current = await this.findById(current.parentUnitId);
        } else {
            current = null;
        }
    }

    return path;
};

// Get all descendants
organizationalUnitSchema.statics.getAllDescendants = async function(unitId) {
    const descendants = [];

    const getChildren = async (parentId) => {
        const children = await this.find({ parentUnitId: parentId });
        for (const child of children) {
            descendants.push(child);
            await getChildren(child._id);
        }
    };

    await getChildren(unitId);
    return descendants;
};

module.exports = mongoose.model('OrganizationalUnit', organizationalUnitSchema);
