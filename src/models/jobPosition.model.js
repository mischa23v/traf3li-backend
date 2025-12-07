const mongoose = require('mongoose');

// ═══════════════════════════════════════════════════════════════
// SUB-SCHEMAS
// ═══════════════════════════════════════════════════════════════

// Responsibility Schema
const responsibilitySchema = new mongoose.Schema({
    responsibilityId: String,
    responsibility: { type: String, required: true },
    responsibilityAr: String,
    category: {
        type: String,
        enum: ['primary', 'secondary', 'occasional']
    },
    priority: Number,
    timeAllocation: Number,                // % of time
    essentialFunction: { type: Boolean, default: false },
    keyDeliverables: [String],
    successMetrics: [String]
}, { _id: true });

// Bar Admission Schema
const barAdmissionSchema = new mongoose.Schema({
    jurisdiction: String,
    jurisdictionAr: String,
    dateAdmitted: Date,
    status: {
        type: String,
        enum: ['active', 'inactive', 'suspended', 'retired']
    },
    barNumber: String,
    expiryDate: Date,
    goodStanding: { type: Boolean, default: true }
}, { _id: true });

// Court Experience Schema
const courtExperienceSchema = new mongoose.Schema({
    courtType: {
        type: String,
        enum: ['general', 'commercial', 'labor', 'administrative', 'family',
               'criminal', 'appeals', 'supreme', 'arbitration']
    },
    courtTypeAr: String,
    minimumCases: Number,
    minimumYears: Number,
    required: { type: Boolean, default: false }
}, { _id: true });

// Language Requirement Schema
const languageRequirementSchema = new mongoose.Schema({
    language: String,
    languageAr: String,
    proficiencyLevel: {
        type: String,
        enum: ['basic', 'intermediate', 'advanced', 'fluent', 'native']
    },
    speaking: { type: String, enum: ['basic', 'intermediate', 'advanced', 'fluent', 'native'] },
    writing: { type: String, enum: ['basic', 'intermediate', 'advanced', 'fluent', 'native'] },
    reading: { type: String, enum: ['basic', 'intermediate', 'advanced', 'fluent', 'native'] },
    required: { type: Boolean, default: false },
    certificationRequired: Boolean,
    certificationName: String,
    minimumScore: Number
}, { _id: true });

// Technical Skill Schema
const technicalSkillSchema = new mongoose.Schema({
    skill: String,
    skillAr: String,
    category: {
        type: String,
        enum: ['technical', 'software', 'systems', 'tools', 'methodology', 'legal']
    },
    proficiencyLevel: {
        type: String,
        enum: ['basic', 'intermediate', 'advanced', 'expert']
    },
    required: { type: Boolean, default: false },
    yearsExperience: Number
}, { _id: true });

// Certification Schema
const certificationSchema = new mongoose.Schema({
    certificationName: String,
    certificationNameAr: String,
    certificationBody: String,
    required: { type: Boolean, default: false },
    mustHaveBeforeHire: { type: Boolean, default: false },
    obtainmentTimeline: String,
    renewalRequired: Boolean,
    renewalPeriod: Number,
    companySponsored: Boolean
}, { _id: true });

// Competency Schema
const competencySchema = new mongoose.Schema({
    competencyId: String,
    competencyName: String,
    competencyNameAr: String,
    competencyDescription: String,
    category: {
        type: String,
        enum: ['core', 'functional', 'leadership', 'technical']
    },
    requiredLevel: {
        type: String,
        enum: ['basic', 'proficient', 'advanced', 'expert']
    },
    weight: Number,
    criticalCompetency: { type: Boolean, default: false },
    assessmentMethod: {
        type: String,
        enum: ['interview', 'test', 'simulation', 'assessment_center', 'reference']
    }
}, { _id: true });

// Direct Report Schema
const directReportSchema = new mongoose.Schema({
    positionId: { type: mongoose.Schema.Types.ObjectId, ref: 'JobPosition' },
    positionNumber: String,
    positionTitle: String,
    positionTitleAr: String,
    incumbentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    incumbentName: String,
    incumbentNameAr: String,
    filled: { type: Boolean, default: false },
    fte: { type: Number, default: 1.0 }
}, { _id: true });

// Career Path Position Schema
const careerPathPositionSchema = new mongoose.Schema({
    positionId: { type: mongoose.Schema.Types.ObjectId, ref: 'JobPosition' },
    positionNumber: String,
    positionTitle: String,
    positionTitleAr: String,
    typicalTimeframe: String,
    requiredExperience: Number,
    keyRequirements: [String]
}, { _id: true });

// Incumbent Schema
const incumbentSchema = new mongoose.Schema({
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    employeeNumber: String,
    employeeName: String,
    employeeNameAr: String,
    assignmentType: {
        type: String,
        enum: ['permanent', 'acting', 'temporary', 'probation', 'secondment']
    },
    assignmentDate: Date,
    probationEnd: Date,
    performanceRating: String,
    flightRisk: { type: String, enum: ['low', 'medium', 'high'] }
}, { _id: false });

// Physical Activity Schema
const physicalActivitySchema = new mongoose.Schema({
    activity: {
        type: String,
        enum: ['sitting', 'standing', 'walking', 'lifting', 'carrying',
               'bending', 'climbing', 'reaching', 'typing', 'driving', 'other']
    },
    frequency: {
        type: String,
        enum: ['rarely', 'occasionally', 'frequently', 'constantly']
    },
    duration: String,
    weight: Number                          // For lifting/carrying (kg)
}, { _id: true });

// Document Schema
const documentSchema = new mongoose.Schema({
    documentType: {
        type: String,
        enum: ['job_description', 'position_charter', 'competency_profile',
               'job_posting', 'evaluation_report', 'approval_form',
               'organizational_chart', 'other']
    },
    documentName: String,
    documentNameAr: String,
    fileUrl: String,
    version: String,
    effectiveDate: Date,
    expiryDate: Date,
    uploadedOn: { type: Date, default: Date.now },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    signed: { type: Boolean, default: false },
    signedBy: [String],
    signedDate: Date,
    confidential: { type: Boolean, default: false }
}, { _id: true });

// Position History Entry Schema
const positionHistorySchema = new mongoose.Schema({
    historyId: String,
    eventType: {
        type: String,
        enum: ['created', 'modified', 'filled', 'vacated', 'frozen',
               'unfrozen', 'eliminated', 'reinstated', 'title_change',
               'level_change', 'salary_change', 'reporting_change']
    },
    eventDate: { type: Date, default: Date.now },
    eventBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    eventByName: String,
    fieldChanged: String,
    oldValue: mongoose.Schema.Types.Mixed,
    newValue: mongoose.Schema.Types.Mixed,
    reason: String,
    notes: String
}, { _id: true });

// Incumbent History Schema
const incumbentHistorySchema = new mongoose.Schema({
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    employeeNumber: String,
    employeeName: String,
    employeeNameAr: String,
    startDate: Date,
    endDate: Date,
    duration: Number,                       // Days
    assignmentType: String,
    separationReason: String,
    performanceSummary: String
}, { _id: true });

// ═══════════════════════════════════════════════════════════════
// MAIN SCHEMA
// ═══════════════════════════════════════════════════════════════

const jobPositionSchema = new mongoose.Schema({
    // ==================== IDENTIFICATION ====================
    positionId: { type: String, unique: true, sparse: true },
    positionNumber: { type: String, unique: true, sparse: true },
    positionCode: String,
    requisitionNumber: String,

    // ==================== MULTI-TENANCY ====================
    firmId: { type: mongoose.Schema.Types.ObjectId, ref: 'Firm', index: true },
    lawyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },

    // ==================== JOB IDENTIFICATION ====================
    jobId: String,                          // Link to job template
    jobCode: String,
    jobTitle: { type: String, required: true },
    jobTitleAr: String,
    workingTitle: String,                   // If different from official
    workingTitleAr: String,
    alternativeJobTitles: [{
        title: String,
        titleAr: String,
        context: String                     // "Internal", "External posting", "Previous"
    }],

    // ==================== POSITION TYPE ====================
    positionType: {
        type: String,
        enum: ['regular', 'temporary', 'project_based', 'seasonal',
               'acting', 'secondment', 'pool_position'],
        default: 'regular'
    },
    employmentType: {
        type: String,
        enum: ['full_time', 'part_time', 'contract', 'freelance', 'temporary', 'internship'],
        default: 'full_time'
    },
    temporaryDetails: {
        temporaryReason: {
            type: String,
            enum: ['replacement', 'project', 'seasonal_demand', 'trial_period', 'other']
        },
        startDate: Date,
        endDate: Date,
        duration: Number,                   // Months
        convertibleToPermanent: Boolean
    },

    // ==================== JOB CLASSIFICATION ====================
    jobFamily: {
        type: String,
        enum: ['legal', 'finance', 'hr', 'it', 'operations', 'marketing',
               'sales', 'administration', 'management', 'support', 'other'],
        required: true
    },
    jobFamilyAr: String,
    jobSubFamily: String,
    jobSubFamilyAr: String,
    occupationalCategory: {
        type: String,
        enum: ['executive', 'management', 'professional', 'technical',
               'administrative', 'operational', 'support'],
        required: true
    },
    occupationalCategoryAr: String,
    iscoCode: String,                       // International Standard Classification
    iscoTitle: String,
    saudiOccupationCode: String,            // Ministry of Labor classification

    // Job Level & Grade
    jobLevel: {
        type: String,
        enum: ['entry', 'junior', 'mid', 'senior', 'lead', 'manager',
               'senior_manager', 'director', 'senior_director', 'vp',
               'svp', 'evp', 'c_level'],
        required: true
    },
    jobLevelAr: String,
    levelNumber: Number,                    // 1-15 scale
    jobGrade: { type: String, required: true },
    gradeNumber: Number,
    careerBand: {
        type: String,
        enum: ['individual_contributor', 'professional', 'management', 'leadership', 'executive']
    },
    exemptStatus: {
        type: String,
        enum: ['exempt', 'non_exempt'],
        default: 'non_exempt'
    },
    exemptionReason: String,

    // Job Evaluation
    jobEvaluation: {
        evaluationMethod: {
            type: String,
            enum: ['point_factor', 'ranking', 'classification', 'factor_comparison', 'market_pricing']
        },
        totalPoints: Number,
        factorScores: [{
            factor: {
                type: String,
                enum: ['skill', 'effort', 'responsibility', 'working_conditions', 'other']
            },
            subfactor: String,
            points: Number,
            weight: Number
        }],
        evaluationDate: Date,
        evaluatedBy: String,
        benchmarkJobs: [String],
        marketPricing: {
            marketRate: Number,
            percentile: Number              // Market positioning (e.g., 50th percentile)
        }
    },

    // ==================== ORGANIZATIONAL PLACEMENT ====================
    organizationalUnitId: { type: mongoose.Schema.Types.ObjectId, ref: 'OrganizationalUnit', index: true },
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'OrganizationalUnit', index: true },
    departmentName: String,
    departmentNameAr: String,
    divisionId: { type: mongoose.Schema.Types.ObjectId, ref: 'OrganizationalUnit' },
    divisionName: String,
    teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'OrganizationalUnit' },
    teamName: String,
    costCenter: String,
    costCenterName: String,
    businessUnit: String,
    function: {
        type: String,
        enum: ['core', 'support', 'shared_services', 'overhead']
    },
    geographicScope: {
        type: String,
        enum: ['local', 'regional', 'national', 'international']
    },

    // Location
    location: {
        locationId: String,
        primaryLocation: String,
        primaryLocationAr: String,
        city: String,
        region: String,
        country: { type: String, default: 'Saudi Arabia' },
        building: String,
        floor: String,
        officeNumber: String,
        remoteEligible: { type: Boolean, default: false },
        remoteWorkType: {
            type: String,
            enum: ['fully_remote', 'hybrid', 'on_site']
        },
        hybridSchedule: String,
        travelRequired: { type: Boolean, default: false },
        travelPercentage: Number,
        travelDescription: String
    },

    // ==================== REPORTING RELATIONSHIPS ====================
    reportsTo: {
        positionId: { type: mongoose.Schema.Types.ObjectId, ref: 'JobPosition' },
        positionNumber: String,
        jobTitle: String,
        jobTitleAr: String,
        incumbentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
        incumbentName: String,
        reportingRelationship: {
            type: String,
            enum: ['direct', 'solid_line', 'dotted_line', 'functional', 'matrix'],
            default: 'direct'
        },
        locationSameAsPosition: { type: Boolean, default: true }
    },
    functionalReportsTo: [{
        positionId: { type: mongoose.Schema.Types.ObjectId, ref: 'JobPosition' },
        jobTitle: String,
        incumbentName: String,
        reportingType: {
            type: String,
            enum: ['dotted_line', 'functional', 'matrix']
        },
        reportingPercentage: Number,
        reportingPurpose: String
    }],
    supervisoryPosition: { type: Boolean, default: false },
    directReports: [directReportSchema],
    directReportsCount: { type: Number, default: 0 },
    indirectReportsCount: { type: Number, default: 0 },
    spanOfControl: { type: Number, default: 0 },
    managementLevel: Number,                // Levels from CEO (0 = CEO)

    // ==================== JOB DESCRIPTION ====================
    jobSummary: String,
    jobSummaryAr: String,
    jobPurpose: String,
    jobPurposeAr: String,
    keyResponsibilities: [responsibilitySchema],
    totalTimeAllocation: Number,            // Should equal 100%
    dutiesTasks: [{
        duty: String,
        dutyAr: String,
        frequency: {
            type: String,
            enum: ['daily', 'weekly', 'monthly', 'quarterly', 'annual', 'as_needed']
        },
        category: String
    }],
    decisionAuthority: {
        decisionMakingLevel: {
            type: String,
            enum: ['strategic', 'tactical', 'operational', 'limited']
        },
        decisions: [{
            decisionType: String,
            autonomyLevel: {
                type: String,
                enum: ['full_autonomy', 'recommend', 'input_only']
            },
            approvalRequired: Boolean,
            approvalLevel: String,
            financialLimit: Number
        }]
    },
    keyChallenges: [String],
    successFactors: [String],
    performanceExpectations: String,

    // ==================== QUALIFICATIONS ====================
    qualifications: {
        // Education
        education: {
            minimumEducation: {
                type: String,
                enum: ['high_school', 'diploma', 'bachelors', 'masters', 'doctorate', 'professional'],
                required: true
            },
            minimumEducationAr: String,
            requiredDegrees: [{
                degreeLevel: String,
                fieldOfStudy: [String],
                fieldOfStudyAr: [String],
                required: { type: Boolean, default: true },
                accreditation: String,
                equivalencyCertificate: Boolean
            }],
            preferredDegrees: [{
                degreeLevel: String,
                fieldOfStudy: [String]
            }],
            educationalInstitutions: {
                specificInstitutionsRequired: Boolean,
                institutions: [String]
            }
        },

        // Experience
        experience: {
            minimumYears: { type: Number, required: true, default: 0 },
            preferredYears: Number,
            experienceTypes: [{
                type: {
                    type: String,
                    enum: ['general', 'industry_specific', 'role_specific', 'functional']
                },
                description: String,
                descriptionAr: String,
                years: Number,
                required: { type: Boolean, default: false },
                specificExperience: [{
                    area: String,
                    years: Number,
                    required: Boolean
                }]
            }],
            industryExperience: {
                required: Boolean,
                industries: [String],
                minimumYears: Number
            },
            managementExperience: {
                required: Boolean,
                minimumYears: Number,
                teamSize: Number,
                budgetSize: Number
            }
        },

        // Certifications & Licenses
        certifications: {
            requiredCertifications: [certificationSchema],
            preferredCertifications: [{
                certificationName: String,
                certificationBody: String
            }],
            professionalLicenses: [{
                licenseType: String,
                licensingBody: String,
                jurisdictions: [String],
                required: Boolean,
                mustBeActive: Boolean,
                goodStandingRequired: Boolean
            }],
            professionalMemberships: [{
                organizationName: String,
                membershipType: String,
                required: Boolean
            }]
        },

        // Skills
        skills: {
            technicalSkills: [technicalSkillSchema],
            softSkills: [{
                skill: String,
                skillAr: String,
                category: {
                    type: String,
                    enum: ['communication', 'leadership', 'interpersonal',
                           'analytical', 'organizational', 'creative']
                },
                proficiencyLevel: {
                    type: String,
                    enum: ['basic', 'intermediate', 'advanced', 'expert']
                },
                required: Boolean
            }],
            languageSkills: [languageRequirementSchema],
            computerSkills: [{
                software: String,
                proficiencyLevel: {
                    type: String,
                    enum: ['basic', 'intermediate', 'advanced', 'expert']
                },
                required: Boolean
            }]
        },

        // Other Requirements
        otherRequirements: {
            physicalRequirements: [{
                requirement: String,
                frequency: {
                    type: String,
                    enum: ['rarely', 'occasionally', 'frequently', 'constantly']
                },
                essentialFunction: Boolean
            }],
            backgroundCheck: {
                required: Boolean,
                checkTypes: [{
                    type: String,
                    enum: ['criminal', 'credit', 'employment', 'education',
                           'professional_license', 'reference']
                }],
                clearanceLevel: String,
                securityClearance: {
                    required: Boolean,
                    level: String,
                    country: String
                }
            },
            medicalRequirements: {
                medicalExamRequired: Boolean,
                specificRequirements: [String],
                drugTestRequired: Boolean
            },
            ageRequirements: {
                minimumAge: Number,
                maximumAge: Number,
                justification: String
            },
            nationalityRequirements: {
                saudiOnly: Boolean,
                specificNationalities: [String],
                workPermitSponsorship: Boolean,
                iqamaTransferAllowed: Boolean
            },
            availability: {
                flexibleHours: Boolean,
                shiftsRequired: Boolean,
                shifts: [String],
                weekendWork: Boolean,
                overtimeExpected: Boolean,
                onCallRequired: Boolean
            }
        }
    },

    // ==================== ATTORNEY-SPECIFIC REQUIREMENTS ====================
    attorneyRequirements: {
        isAttorneyPosition: { type: Boolean, default: false },
        barAdmission: {
            required: Boolean,
            jurisdictions: [barAdmissionSchema],
            saudiBar: {
                admissionRequired: Boolean,
                admissionDate: Date,
                licenseNumber: String,
                specializations: [String],
                trainingPeriodCompleted: Boolean
            },
            barNumberVerification: Boolean,
            disciplinaryHistoryCheck: Boolean
        },
        practiceAreas: {
            primaryPracticeAreas: [{
                practiceArea: {
                    type: String,
                    enum: ['corporate', 'litigation', 'real_estate', 'family',
                           'criminal', 'labor', 'intellectual_property', 'tax',
                           'banking', 'insurance', 'administrative', 'commercial',
                           'arbitration', 'sharia_compliant', 'other']
                },
                practiceAreaAr: String,
                yearsExperience: Number,
                expertiseLevel: {
                    type: String,
                    enum: ['basic', 'intermediate', 'advanced', 'expert']
                }
            }],
            secondaryPracticeAreas: [String]
        },
        courtExperience: {
            required: Boolean,
            courtTypes: [courtExperienceSchema],
            trialExperience: Boolean,
            firstChairExperience: Boolean,
            minimumCasesHandled: Number
        },
        caseExperience: {
            minimumCases: Number,
            caseTypes: [String],
            caseValueRange: {
                minimum: Number,
                average: Number
            },
            winRate: Number,
            settlementExperience: Boolean,
            arbitrationExperience: Boolean,
            mediationExperience: Boolean
        },
        legalWriting: {
            experienceRequired: Boolean,
            documentTypes: [{
                documentType: {
                    type: String,
                    enum: ['contracts', 'briefs', 'motions', 'memoranda',
                           'opinions', 'pleadings', 'agreements', 'other']
                },
                proficiencyLevel: {
                    type: String,
                    enum: ['basic', 'intermediate', 'advanced', 'expert']
                }
            }],
            publicationsPreferred: Boolean,
            writingSampleRequired: Boolean
        },
        legalResearch: {
            proficiencyRequired: {
                type: String,
                enum: ['basic', 'intermediate', 'advanced', 'expert']
            },
            researchTools: [{
                tool: String,
                proficiencyLevel: String,
                required: Boolean
            }],
            saudiLawResearch: Boolean,
            islamicLawKnowledge: Boolean,
            shariaCompliance: Boolean
        },
        clientManagement: {
            experienceRequired: Boolean,
            clientTypes: [{
                type: String,
                enum: ['individual', 'corporate', 'government', 'international']
            }],
            minimumClients: Number,
            businessDevelopmentSkills: Boolean,
            portfolioManagement: Boolean
        },
        ethicalRequirements: {
            ethicsTraining: Boolean,
            cleCompliance: Boolean,
            cleHoursAnnual: Number,
            conflictsCheck: Boolean,
            professionalConduct: {
                noMalpracticeClaims: Boolean,
                noDisciplinaryActions: Boolean,
                goodMoralCharacter: Boolean
            }
        }
    },

    // ==================== COMPETENCIES ====================
    competencies: [competencySchema],

    // ==================== WORKING CONDITIONS ====================
    workingConditions: {
        workEnvironment: {
            environmentType: {
                type: String,
                enum: ['office', 'field', 'hybrid', 'remote', 'client_site',
                       'court', 'manufacturing', 'outdoor', 'laboratory', 'mixed']
            },
            environmentDescription: String,
            officeConditions: {
                privateOffice: Boolean,
                cubicle: Boolean,
                openPlan: Boolean,
                deskProvided: Boolean,
                ergonomicSetup: Boolean
            },
            environmentalFactors: [{
                factor: {
                    type: String,
                    enum: ['noise', 'temperature_extremes', 'outdoor_elements',
                           'confined_spaces', 'heights', 'hazardous_materials', 'other']
                },
                exposure: {
                    type: String,
                    enum: ['rare', 'occasional', 'frequent', 'constant']
                }
            }],
            safetyConsiderations: {
                ppeRequired: Boolean,
                ppeTypes: [String],
                safetyTrainingRequired: Boolean,
                hazardousEnvironment: Boolean,
                hazards: [String]
            }
        },
        workSchedule: {
            standardHours: { type: Number, default: 48 },
            scheduleType: {
                type: String,
                enum: ['standard', 'flexible', 'shift', 'compressed', 'variable']
            },
            standardWorkDays: [String],
            standardWorkHours: String,
            ramadanHours: String,
            flexibleHours: {
                allowed: Boolean,
                coreHours: String,
                flexibleRange: String
            },
            shiftWork: {
                required: Boolean,
                shifts: [String],
                rotatingShifts: Boolean
            },
            weekendWork: {
                required: Boolean,
                frequency: String
            },
            overtimeExpected: Boolean,
            overtimeFrequency: {
                type: String,
                enum: ['rare', 'occasional', 'frequent', 'regular']
            },
            onCallDuty: {
                required: Boolean,
                frequency: String,
                compensation: String
            }
        },
        travelRequirements: {
            travelRequired: Boolean,
            travelPercentage: Number,
            travelTypes: [{
                type: {
                    type: String,
                    enum: ['local', 'domestic', 'international']
                },
                frequency: {
                    type: String,
                    enum: ['rare', 'occasional', 'frequent', 'regular']
                },
                averageDuration: String
            }],
            overnightTravel: Boolean,
            hasPassport: Boolean,
            willingToRelocate: Boolean
        },
        physicalDemands: {
            sedentaryWork: Boolean,
            physicalActivities: [physicalActivitySchema],
            visualRequirements: {
                closeVision: Boolean,
                distanceVision: Boolean,
                colorVision: Boolean,
                peripheralVision: Boolean,
                depthPerception: Boolean
            },
            hearingRequirements: Boolean,
            communicationRequirements: {
                speaking: Boolean,
                writing: Boolean,
                reading: Boolean
            },
            manualDexterity: Boolean
        },
        mentalDemands: {
            stressLevel: {
                type: String,
                enum: ['low', 'moderate', 'high', 'very_high']
            },
            concentrationRequired: {
                type: String,
                enum: ['minimal', 'moderate', 'high', 'intense']
            },
            multitaskingRequired: Boolean,
            deadlinePressure: {
                type: String,
                enum: ['low', 'moderate', 'high', 'constant']
            },
            decisionComplexity: {
                type: String,
                enum: ['simple', 'moderate', 'complex', 'highly_complex']
            },
            problemSolving: {
                type: String,
                enum: ['routine', 'moderate', 'complex', 'highly_complex']
            }
        }
    },

    // ==================== COMPENSATION ====================
    compensation: {
        salaryGrade: { type: String, required: true },
        gradeLevel: Number,
        salaryRange: {
            minimum: Number,
            midpoint: Number,
            maximum: Number,
            currency: { type: String, default: 'SAR' },
            period: {
                type: String,
                enum: ['hourly', 'monthly', 'annual'],
                default: 'monthly'
            }
        },
        marketPositioning: {
            targetPercentile: Number,
            competitiveRatio: Number
        },
        compaRatio: Number,
        rangePenetration: Number,
        allowances: {
            housingAllowance: {
                provided: Boolean,
                amount: Number,
                percentage: Number
            },
            transportationAllowance: {
                provided: Boolean,
                amount: Number
            },
            mobileAllowance: {
                provided: Boolean,
                amount: Number
            },
            educationAllowance: {
                provided: Boolean,
                amount: Number,
                dependentsCount: Number
            },
            otherAllowances: [{
                allowanceName: String,
                amount: Number
            }]
        },
        variableCompensation: {
            bonusEligible: Boolean,
            targetBonus: {
                amount: Number,
                percentage: Number,
                frequency: {
                    type: String,
                    enum: ['annual', 'quarterly', 'project_based']
                }
            },
            commissionEligible: Boolean,
            commissionStructure: String,
            profitSharing: Boolean,
            stockOptions: Boolean
        },
        benefits: {
            standardBenefits: { type: Boolean, default: true },
            enhancedBenefits: [{
                benefitType: String,
                benefitDescription: String
            }],
            executivePerks: Boolean,
            perks: [String]
        }
    },

    // ==================== CAREER PATH ====================
    careerPath: {
        careerLadder: {
            currentLevel: String,
            previousLevel: {
                jobTitle: String,
                jobLevel: String,
                typicalYearsInRole: Number
            },
            nextLevel: {
                jobTitle: String,
                jobLevel: String,
                typicalPromotionTime: Number,
                requirementsForPromotion: [String]
            }
        },
        verticalPath: [careerPathPositionSchema],
        lateralMoves: [careerPathPositionSchema],
        alternativePaths: [{
            pathType: {
                type: String,
                enum: ['specialist', 'management', 'leadership', 'technical']
            },
            description: String,
            nextRoles: [String]
        }],
        developmentNeeds: {
            currentRoleDevelopment: [String],
            nextLevelPreparation: [{
                developmentArea: String,
                developmentType: {
                    type: String,
                    enum: ['training', 'experience', 'education', 'certification', 'mentoring']
                },
                priority: {
                    type: String,
                    enum: ['immediate', 'short_term', 'medium_term', 'long_term']
                }
            }]
        }
    },

    // ==================== POSITION STATUS ====================
    status: {
        type: String,
        enum: ['active', 'vacant', 'frozen', 'eliminated', 'pending_approval', 'proposed'],
        default: 'active',
        index: true
    },
    statusEffectiveDate: Date,
    statusReason: String,
    filled: { type: Boolean, default: false, index: true },
    incumbent: incumbentSchema,
    vacantSince: Date,
    vacancyReason: {
        type: String,
        enum: ['new_position', 'resignation', 'termination', 'promotion',
               'transfer', 'retirement', 'leave', 'other']
    },
    previousIncumbent: {
        employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
        employeeName: String,
        lastWorkingDate: Date,
        knowledgeTransferCompleted: Boolean
    },
    recruitmentStatus: {
        recruitmentInitiated: Boolean,
        initiatedDate: Date,
        requisitionId: String,
        expectedFillDate: Date,
        interimCoverage: {
            coveredBy: String,
            coverageType: { type: String, enum: ['full', 'partial'] },
            coverageStartDate: Date
        }
    },
    successionPlan: {
        hasSuccessor: Boolean,
        successors: [{
            employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
            employeeName: String,
            readinessLevel: {
                type: String,
                enum: ['ready_now', 'ready_1_year', 'ready_2_3_years', 'developing']
            },
            developmentNeeds: [String],
            rank: Number
        }]
    },

    // FTE & Budget
    fte: { type: Number, default: 1.0 },
    headcountImpact: { type: Number, default: 1 },
    budgeted: { type: Boolean, default: true },
    fiscalYear: Number,
    budgetedSalary: Number,

    // Approval
    approvalStatus: {
        type: String,
        enum: ['draft', 'pending_approval', 'approved', 'rejected'],
        default: 'draft'
    },
    approvals: [{
        approverRole: String,
        approverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        approverName: String,
        approved: Boolean,
        approvalDate: Date,
        comments: String
    }],

    // ==================== EFFECTIVE DATES ====================
    effectiveDate: Date,
    expirationDate: Date,
    establishedDate: Date,

    // ==================== POSITION HISTORY ====================
    positionHistory: [positionHistorySchema],
    incumbentHistory: [incumbentHistorySchema],

    // ==================== JOB POSTING ====================
    jobPosting: {
        postable: { type: Boolean, default: true },
        postingTitle: String,
        postingTitleAr: String,
        postingSummary: String,
        postingSummaryAr: String,
        postingDescription: String,
        sellingPoints: [String],
        applicationProcess: {
            applicationMethod: {
                type: String,
                enum: ['online', 'email', 'in_person', 'agency']
            },
            applicationUrl: String,
            applicationEmail: String,
            resumeRequired: { type: Boolean, default: true },
            coverLetterRequired: Boolean,
            additionalDocuments: [String],
            assessmentsRequired: [String]
        },
        postingChannels: [{
            channel: {
                type: String,
                enum: ['company_website', 'job_board', 'linkedin', 'social_media',
                       'university', 'agency', 'employee_referral', 'internal_only']
            },
            channelName: String,
            postedDate: Date,
            expiryDate: Date,
            viewsCount: Number,
            applicationsCount: Number
        }],
        eeoStatement: String,
        diversityStatement: String
    },

    // ==================== COMPLIANCE ====================
    compliance: {
        adaCompliance: {
            essentialFunctionsIdentified: Boolean,
            reasonableAccommodationsPossible: Boolean,
            undueBurdenAssessed: Boolean
        },
        flsaCompliant: { type: Boolean, default: true },
        equalPayCompliant: { type: Boolean, default: true },
        saudiLaborLawCompliance: {
            compliant: { type: Boolean, default: true },
            saudizationCompliant: Boolean,
            saudiPreferred: Boolean,
            saudiRequired: Boolean,
            nitaqatCategory: {
                type: String,
                enum: ['platinum', 'high_green', 'mid_green', 'low_green', 'yellow', 'red']
            },
            workingHoursCompliant: { type: Boolean, default: true },
            ramadanHoursCompliant: { type: Boolean, default: true },
            contractType: {
                type: String,
                enum: ['indefinite', 'fixed_term']
            },
            probationPeriod: Number,
            noticePeriod: Number
        },
        jobDescriptionCompliance: {
            upToDate: { type: Boolean, default: true },
            lastReviewDate: Date,
            nextReviewDate: Date,
            reviewFrequency: {
                type: String,
                enum: ['annual', 'biennial', 'as_needed'],
                default: 'annual'
            },
            incumbentReviewed: Boolean,
            supervisorApproved: Boolean,
            hrApproved: Boolean
        }
    },

    // ==================== DOCUMENTS ====================
    documents: [documentSchema],

    // ==================== NOTES ====================
    notes: {
        generalNotes: String,
        hrNotes: String,
        hiringManagerNotes: String,
        incumbentNotes: String,
        recruitmentNotes: String,
        specialInstructions: String
    },
    internalNotes: String,
    tags: [String],

    // ==================== ANALYTICS ====================
    analytics: {
        timeToFill: {
            daysVacant: Number,
            averageTimeToFill: Number,
            vsAverage: { type: String, enum: ['faster', 'average', 'slower'] }
        },
        positionTurnover: {
            incumbentsLast5Years: Number,
            averageTenure: Number,
            turnoverRate: Number
        },
        marketCompetitiveness: {
            salaryCompetitiveness: { type: String, enum: ['below', 'at', 'above'] },
            marketPercentile: Number,
            lastBenchmarked: Date
        }
    },

    // ==================== RELATED RECORDS ====================
    relatedRecords: {
        jobId: String,
        departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'OrganizationalUnit' },
        supervisorPositionId: { type: mongoose.Schema.Types.ObjectId, ref: 'JobPosition' },
        incumbentEmployeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
        requisitionId: String,
        budgetLineItemId: String,
        relatedPositions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'JobPosition' }]
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

jobPositionSchema.index({ firmId: 1, status: 1 });
jobPositionSchema.index({ lawyerId: 1, status: 1 });
jobPositionSchema.index({ positionNumber: 1 });
jobPositionSchema.index({ jobFamily: 1, jobLevel: 1 });
jobPositionSchema.index({ departmentId: 1 });
jobPositionSchema.index({ 'reportsTo.positionId': 1 });
jobPositionSchema.index({ 'incumbent.employeeId': 1 });
jobPositionSchema.index({ filled: 1, status: 1 });

// ═══════════════════════════════════════════════════════════════
// VIRTUALS
// ═══════════════════════════════════════════════════════════════

// Check if position is supervisory based on direct reports
jobPositionSchema.virtual('isSupervisory').get(function() {
    return this.directReportsCount > 0 || this.supervisoryPosition;
});

// Calculate days vacant
jobPositionSchema.virtual('daysVacant').get(function() {
    if (!this.vacantSince || this.filled) return 0;
    return Math.floor((new Date() - this.vacantSince) / (1000 * 60 * 60 * 24));
});

// Get salary midpoint
jobPositionSchema.virtual('salaryMidpoint').get(function() {
    if (this.compensation?.salaryRange) {
        const { minimum, maximum } = this.compensation.salaryRange;
        if (minimum && maximum) {
            return Math.round((minimum + maximum) / 2);
        }
    }
    return null;
});

// Enable virtuals in JSON
jobPositionSchema.set('toJSON', { virtuals: true });
jobPositionSchema.set('toObject', { virtuals: true });

// ═══════════════════════════════════════════════════════════════
// PRE-SAVE HOOKS
// ═══════════════════════════════════════════════════════════════

jobPositionSchema.pre('save', async function(next) {
    // Auto-generate positionId
    if (!this.positionId) {
        const year = new Date().getFullYear();
        const query = this.firmId ? { firmId: this.firmId } : { lawyerId: this.lawyerId };
        const count = await this.constructor.countDocuments({
            ...query,
            positionId: new RegExp(`^POS-${year}-`)
        });
        this.positionId = `POS-${year}-${String(count + 1).padStart(3, '0')}`;
    }

    // Auto-generate positionNumber if not provided
    if (!this.positionNumber) {
        const query = this.firmId ? { firmId: this.firmId } : { lawyerId: this.lawyerId };
        const lastPosition = await this.constructor.findOne(query)
            .sort({ positionNumber: -1 })
            .select('positionNumber');

        const lastNum = lastPosition?.positionNumber
            ? parseInt(lastPosition.positionNumber.replace(/\D/g, ''))
            : 0;
        this.positionNumber = `POS-${String(lastNum + 1).padStart(5, '0')}`;
    }

    // Calculate salary midpoint if not provided
    if (this.compensation?.salaryRange) {
        const { minimum, maximum } = this.compensation.salaryRange;
        if (minimum && maximum && !this.compensation.salaryRange.midpoint) {
            this.compensation.salaryRange.midpoint = Math.round((minimum + maximum) / 2);
        }
    }

    // Calculate total time allocation for responsibilities
    if (this.keyResponsibilities?.length > 0) {
        this.totalTimeAllocation = this.keyResponsibilities.reduce(
            (sum, r) => sum + (r.timeAllocation || 0), 0
        );
    }

    // Update span of control
    this.spanOfControl = this.directReportsCount;

    // Set status based on filled flag
    if (this.isModified('filled')) {
        if (this.filled && this.status === 'vacant') {
            this.status = 'active';
            this.vacantSince = null;
        } else if (!this.filled && this.status === 'active') {
            this.status = 'vacant';
            this.vacantSince = this.vacantSince || new Date();
        }
    }

    next();
});

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

// Generate position number
jobPositionSchema.statics.generatePositionNumber = async function(firmId, lawyerId) {
    const query = firmId ? { firmId } : { lawyerId };
    const lastPosition = await this.findOne(query)
        .sort({ positionNumber: -1 })
        .select('positionNumber');

    const lastNum = lastPosition?.positionNumber
        ? parseInt(lastPosition.positionNumber.replace(/\D/g, ''))
        : 0;
    return `POS-${String(lastNum + 1).padStart(5, '0')}`;
};

// Get reporting hierarchy (upward chain)
jobPositionSchema.statics.getReportingChain = async function(positionId) {
    const chain = [];
    let currentPosition = await this.findById(positionId);

    while (currentPosition?.reportsTo?.positionId) {
        const parent = await this.findById(currentPosition.reportsTo.positionId)
            .select('positionId positionNumber jobTitle jobTitleAr incumbent reportsTo');

        if (parent) {
            chain.push({
                _id: parent._id,
                positionId: parent.positionId,
                positionNumber: parent.positionNumber,
                jobTitle: parent.jobTitle,
                jobTitleAr: parent.jobTitleAr,
                incumbentName: parent.incumbent?.employeeName
            });
            currentPosition = parent;
        } else {
            break;
        }
    }

    return chain;
};

// Get all direct and indirect reports
jobPositionSchema.statics.getAllReports = async function(positionId, firmId, lawyerId) {
    const query = firmId ? { firmId } : { lawyerId };
    const allReports = [];

    const getReports = async (parentId, level = 1) => {
        const directReports = await this.find({
            ...query,
            'reportsTo.positionId': parentId,
            status: { $in: ['active', 'vacant'] }
        }).select('positionId positionNumber jobTitle jobTitleAr incumbent filled');

        for (const report of directReports) {
            allReports.push({
                ...report.toObject(),
                level
            });
            await getReports(report._id, level + 1);
        }
    };

    await getReports(positionId);
    return allReports;
};

// Build org chart tree from a position
jobPositionSchema.statics.buildOrgChart = async function(firmId, lawyerId, rootPositionId = null) {
    const query = firmId ? { firmId } : { lawyerId };

    const buildTree = async (parentId) => {
        const positions = await this.find({
            ...query,
            'reportsTo.positionId': parentId,
            status: { $in: ['active', 'vacant'] }
        }).select('positionId positionNumber jobTitle jobTitleAr incumbent filled directReportsCount');

        return Promise.all(positions.map(async (pos) => ({
            _id: pos._id,
            positionId: pos.positionId,
            positionNumber: pos.positionNumber,
            jobTitle: pos.jobTitle,
            jobTitleAr: pos.jobTitleAr,
            incumbentName: pos.incumbent?.employeeName,
            filled: pos.filled,
            directReportsCount: pos.directReportsCount,
            children: await buildTree(pos._id)
        })));
    };

    if (rootPositionId) {
        const root = await this.findById(rootPositionId);
        return {
            _id: root._id,
            positionId: root.positionId,
            positionNumber: root.positionNumber,
            jobTitle: root.jobTitle,
            jobTitleAr: root.jobTitleAr,
            incumbentName: root.incumbent?.employeeName,
            filled: root.filled,
            children: await buildTree(rootPositionId)
        };
    }

    // Find top-level positions (no reportsTo)
    const topPositions = await this.find({
        ...query,
        'reportsTo.positionId': null,
        status: { $in: ['active', 'vacant'] }
    });

    return Promise.all(topPositions.map(async (pos) => ({
        _id: pos._id,
        positionId: pos.positionId,
        positionNumber: pos.positionNumber,
        jobTitle: pos.jobTitle,
        jobTitleAr: pos.jobTitleAr,
        incumbentName: pos.incumbent?.employeeName,
        filled: pos.filled,
        children: await buildTree(pos._id)
    })));
};

module.exports = mongoose.model('JobPosition', jobPositionSchema);
