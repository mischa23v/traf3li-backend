const mongoose = require('mongoose');

/**
 * Asset Assignment Model - HR Management
 * Module 14: الأصول والمعدات (Assets & Equipment)
 * Comprehensive asset assignment and tracking for employees
 */

// ═══════════════════════════════════════════════════════════════
// ASSET POLICIES (Configurable)
// ═══════════════════════════════════════════════════════════════

const ASSET_POLICIES = {
    depreciationRates: {
        laptop: 33.33, // 3 years
        desktop: 33.33,
        mobile_phone: 50, // 2 years
        tablet: 33.33,
        monitor: 20, // 5 years
        furniture: 10, // 10 years
        vehicle: 20, // 5 years
        other: 20
    },
    maintenanceIntervals: {
        laptop: 365, // days
        desktop: 365,
        vehicle: 90,
        printer: 180
    },
    returnGracePeriod: 7, // days after due date
    liabilityThresholds: {
        fullLiability: 10000, // Above this, may require investigation
        partialLiability: 5000
    }
};

// ═══════════════════════════════════════════════════════════════
// SUB-SCHEMAS
// ═══════════════════════════════════════════════════════════════

// Photo schema
const photoSchema = new mongoose.Schema({
    photoType: {
        type: String,
        enum: ['asset', 'serial_number', 'damage', 'accessories', 'return_condition']
    },
    photoUrl: String,
    capturedDate: { type: Date, default: Date.now },
    notes: String
}, { _id: true });

// Custom specification schema
const customSpecSchema = new mongoose.Schema({
    specName: { type: String },
    specValue: { type: String }
}, { _id: false });

// Accessory schema
const accessorySchema = new mongoose.Schema({
    accessoryType: { type: String },
    description: String,
    serialNumber: String,
    quantity: { type: Number, default: 1 },
    returned: { type: Boolean, default: false },
    returnedDate: Date,
    condition: String
}, { _id: true });

// Checklist item schema
const checklistItemSchema = new mongoose.Schema({
    item: { type: String },
    checked: { type: Boolean, default: false },
    notes: String
}, { _id: true });

// Maintenance history schema
const maintenanceHistorySchema = new mongoose.Schema({
    maintenanceId: { type: String },
    maintenanceType: {
        type: String,
        enum: ['preventive', 'corrective', 'inspection', 'upgrade']
    },
    maintenanceDate: { type: Date },
    performedBy: {
        type: String,
        enum: ['internal', 'vendor', 'manufacturer']
    },
    technician: String,
    vendorName: String,
    workOrder: String,
    description: { type: String },
    mileageAtMaintenance: Number, // For vehicles
    partsReplaced: [{
        partName: String,
        partNumber: String,
        quantity: Number,
        cost: Number
    }],
    laborCost: { type: Number, default: 0 },
    totalCost: { type: Number, default: 0 },
    downtime: Number, // Hours
    warranty: {
        underWarranty: Boolean,
        coveragePercentage: Number
    },
    nextServiceDue: Date,
    invoiceNumber: String,
    invoiceUrl: String,
    maintenanceReport: String,
    notes: String
}, { _id: true });

// Repair schema
const repairSchema = new mongoose.Schema({
    repairId: { type: String },
    reportedDate: { type: Date },
    reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    issueDescription: { type: String },
    severity: {
        type: String,
        enum: ['minor', 'moderate', 'major', 'critical']
    },
    causeOfDamage: {
        type: String,
        enum: ['normal_wear', 'accident', 'misuse', 'manufacturing_defect', 'external_factors', 'unknown']
    },
    employeeLiable: { type: Boolean, default: false },
    liabilityAmount: Number,
    repairStatus: {
        type: String,
        enum: ['reported', 'assessed', 'approved', 'in_progress', 'completed', 'unrepairable'],
        default: 'reported'
    },
    assessment: {
        assessedDate: Date,
        assessedBy: String,
        diagnosis: String,
        repairEstimate: Number,
        repairRecommendation: {
            type: String,
            enum: ['repair', 'replace', 'write_off']
        },
        repairTimeEstimate: Number // Days
    },
    approvalRequired: { type: Boolean, default: false },
    approved: Boolean,
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvalDate: Date,
    repairStartDate: Date,
    repairCompletionDate: Date,
    repairedBy: String,
    vendorName: String,
    workOrder: String,
    partsUsed: [{
        partName: String,
        partNumber: String,
        quantity: Number,
        cost: Number
    }],
    laborCost: { type: Number, default: 0 },
    totalRepairCost: { type: Number, default: 0 },
    employeeCharge: {
        chargeAmount: Number,
        deductedFromSalary: Boolean,
        deductionDate: Date,
        paymentPlan: {
            installments: Number,
            installmentAmount: Number
        },
        paid: { type: Boolean, default: false },
        paymentDate: Date
    },
    repairWarranty: {
        hasWarranty: Boolean,
        warrantyPeriod: Number, // Days
        warrantyExpiry: Date
    },
    assetFunctional: Boolean,
    invoiceNumber: String,
    invoiceUrl: String,
    repairReport: String,
    photos: [String],
    notes: String
}, { _id: true });

// Incident schema
const incidentSchema = new mongoose.Schema({
    incidentId: { type: String },
    incidentType: {
        type: String,
        enum: ['loss', 'theft', 'damage', 'malfunction', 'data_breach', 'unauthorized_access', 'misuse', 'accident']
    },
    incidentDate: { type: Date },
    reportedDate: { type: Date, default: Date.now },
    reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    incidentDescription: { type: String },
    location: String,
    circumstances: {
        howItHappened: String,
        witnessPresent: { type: Boolean, default: false },
        witnesses: [{
            witnessName: String,
            witnessContact: String,
            statement: String
        }],
        policeReportFiled: Boolean,
        policeReportNumber: String,
        policeStation: String,
        cctv: {
            cctvAvailable: Boolean,
            cctvReviewed: Boolean,
            cctvFootage: String
        }
    },
    investigation: {
        conducted: { type: Boolean, default: false },
        investigatedBy: String,
        investigationDate: Date,
        findings: String,
        rootCause: String,
        employeeFault: Boolean,
        faultPercentage: Number,
        investigationReport: String
    },
    impact: {
        severity: {
            type: String,
            enum: ['minor', 'moderate', 'major', 'critical']
        },
        assetRecoverable: Boolean,
        dataLoss: Boolean,
        dataType: String,
        businessImpact: String,
        financialLoss: Number,
        reputationalImpact: Boolean
    },
    insuranceClaim: {
        claimFiled: Boolean,
        claimDate: Date,
        claimNumber: String,
        claimAmount: Number,
        claimStatus: {
            type: String,
            enum: ['pending', 'approved', 'rejected', 'settled']
        },
        approvedAmount: Number,
        deductiblePaid: Number,
        settlementDate: Date,
        settlementAmount: Number,
        claimDocuments: [String]
    },
    liability: {
        employeeLiable: Boolean,
        liabilityAmount: Number,
        recoveryMethod: {
            type: String,
            enum: ['salary_deduction', 'payment_plan', 'insurance', 'write_off', 'legal_action']
        },
        recovered: { type: Boolean, default: false },
        recoveryAmount: Number,
        recoveryDate: Date
    },
    resolution: {
        resolved: { type: Boolean, default: false },
        resolutionDate: Date,
        resolutionAction: {
            type: String,
            enum: ['asset_recovered', 'asset_replaced', 'asset_repaired', 'insurance_settled', 'employee_charged', 'written_off']
        },
        replacementAssetId: String,
        lessonsLearned: String,
        preventiveMeasures: [String]
    },
    disciplinaryAction: {
        actionTaken: Boolean,
        actionType: {
            type: String,
            enum: ['verbal_warning', 'written_warning', 'suspension', 'termination', 'legal_action']
        },
        violationCode: String,
        actionDate: Date,
        actionDetails: String
    },
    incidentReport: String,
    photos: [String],
    notes: String
}, { _id: true });

// Document schema
const documentSchema = new mongoose.Schema({
    documentType: {
        type: String,
        enum: ['assignment_form', 'acknowledgment', 'handover_checklist', 'warranty',
            'insurance_policy', 'invoice', 'receipt', 'maintenance_record', 'repair_invoice',
            'incident_report', 'return_inspection', 'clearance_certificate',
            'destruction_certificate', 'photo', 'other']
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
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { _id: true });

// Transfer schema
const transferSchema = new mongoose.Schema({
    transferId: { type: String },
    transferType: {
        type: String,
        enum: ['employee_transfer', 'department_transfer', 'location_transfer', 'temporary_reassignment']
    },
    transferDate: { type: Date },
    transferFrom: {
        employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
        employeeName: String,
        department: String,
        location: String
    },
    transferTo: {
        employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
        employeeName: String,
        department: String,
        location: String
    },
    transferReason: String,
    temporary: { type: Boolean, default: false },
    expectedReturnDate: Date,
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvalDate: Date,
    transferCompleted: { type: Boolean, default: false },
    notes: String
}, { _id: true });

// Communication schema
const communicationSchema = new mongoose.Schema({
    communicationId: String,
    communicationType: {
        type: String,
        enum: ['email', 'sms', 'system_notification', 'letter']
    },
    date: { type: Date, default: Date.now },
    purpose: {
        type: String,
        enum: ['assignment_notification', 'return_reminder', 'maintenance_due',
            'warranty_expiry', 'insurance_renewal', 'violation_notice',
            'damage_charge', 'clearance_issued', 'other']
    },
    recipient: String,
    subject: String,
    message: String,
    attachments: [String],
    sent: { type: Boolean, default: false },
    sentDate: Date,
    delivered: { type: Boolean, default: false },
    read: Boolean,
    readDate: Date,
    responded: Boolean,
    responseDate: Date
}, { _id: true });

// ═══════════════════════════════════════════════════════════════
// MAIN ASSET ASSIGNMENT SCHEMA
// ═══════════════════════════════════════════════════════════════

const assetAssignmentSchema = new mongoose.Schema({
    // Multi-tenancy
    firmId: { type: mongoose.Schema.Types.ObjectId, ref: 'Firm' },
    lawyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // ═══════════════════════════════════════════════════════════════
    // IDENTIFICATION
    // ═══════════════════════════════════════════════════════════════
    assignmentId: { type: String, unique: true },
    assignmentNumber: { type: String, unique: true },

    // ═══════════════════════════════════════════════════════════════
    // EMPLOYEE INFORMATION
    // ═══════════════════════════════════════════════════════════════
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    employeeNumber: { type: String },
    employeeName: { type: String },
    employeeNameAr: String,
    nationalId: String,
    email: String,
    phone: String,
    department: String,
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
    jobTitle: String,
    location: String,
    workType: {
        type: String,
        enum: ['on_site', 'remote', 'hybrid', 'field']
    },
    managerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    managerName: String,
    employmentStatus: {
        type: String,
        enum: ['active', 'on_notice', 'terminated'],
        default: 'active'
    },
    lastWorkingDay: Date,

    // ═══════════════════════════════════════════════════════════════
    // ASSET DETAILS
    // ═══════════════════════════════════════════════════════════════
    assetId: String,
    assetTag: { type: String, index: true },
    assetNumber: String,
    serialNumber: String,
    modelNumber: String,
    assetName: { type: String },
    assetNameAr: String,
    assetType: {
        type: String,
        enum: ['laptop', 'desktop', 'mobile_phone', 'tablet', 'monitor', 'keyboard',
            'mouse', 'headset', 'printer', 'scanner', 'vehicle', 'access_card',
            'id_badge', 'keys', 'uniform', 'tools', 'equipment', 'furniture',
            'books', 'software_license', 'other']
    },
    assetTypeAr: String,
    assetCategory: {
        type: String,
        enum: ['IT_equipment', 'office_equipment', 'vehicle', 'security_items',
            'tools', 'furniture', 'mobile_devices', 'software', 'other']
    },
    assetCategoryAr: String,
    brand: String,
    model: String,
    specifications: {
        // IT Equipment
        processor: String,
        ram: String,
        storage: String,
        screenSize: String,
        operatingSystem: String,
        // Mobile devices
        imei: String,
        phoneNumber: String,
        simCardNumber: String,
        dataAllowance: String,
        // Vehicle
        vehicleMake: String,
        vehicleModel: String,
        vehicleYear: Number,
        licensePlate: String,
        chassisNumber: String,
        engineNumber: String,
        fuelType: {
            type: String,
            enum: ['petrol', 'diesel', 'hybrid', 'electric']
        },
        // Other
        color: String,
        size: String,
        capacity: String,
        customSpecs: [customSpecSchema]
    },
    conditionAtAssignment: {
        type: String,
        enum: ['new', 'excellent', 'good', 'fair', 'poor']
    },
    conditionNotes: String,
    photos: [photoSchema],

    // Asset value
    purchasePrice: Number,
    purchaseDate: Date,
    currentValue: Number,
    currency: { type: String, default: 'SAR' },
    depreciationRate: Number,

    // Warranty
    warranty: {
        hasWarranty: { type: Boolean, default: false },
        warrantyProvider: String,
        warrantyStartDate: Date,
        warrantyEndDate: Date,
        warrantyDuration: Number, // Months
        warrantyType: {
            type: String,
            enum: ['manufacturer', 'extended', 'insurance']
        },
        warrantyNumber: String,
        warrantyDocument: String,
        coverageDetails: String,
        expired: { type: Boolean, default: false }
    },

    // Insurance
    insurance: {
        insured: { type: Boolean, default: false },
        insuranceProvider: String,
        policyNumber: String,
        coverageAmount: Number,
        deductible: Number,
        policyStartDate: Date,
        policyEndDate: Date,
        policyDocument: String,
        expired: { type: Boolean, default: false }
    },

    // Ownership
    ownership: {
        type: String,
        enum: ['company_owned', 'leased', 'rented', 'employee_owned_reimbursed'],
        default: 'company_owned'
    },
    leaseDetails: {
        leaseProvider: String,
        leaseAgreementNumber: String,
        leaseStartDate: Date,
        leaseEndDate: Date,
        leaseDuration: Number,
        monthlyLeasePayment: Number,
        leaseDocument: String,
        returnRequiredAtEnd: { type: Boolean, default: true }
    },

    // Default location
    defaultLocation: {
        locationName: String,
        building: String,
        floor: String,
        room: String,
        coordinates: {
            latitude: Number,
            longitude: Number
        }
    },

    // GPS Tracking
    tracking: {
        gpsEnabled: { type: Boolean, default: false },
        lastKnownLocation: {
            latitude: Number,
            longitude: Number,
            timestamp: Date
        },
        trackingDeviceId: String
    },

    // ═══════════════════════════════════════════════════════════════
    // ASSIGNMENT REQUEST
    // ═══════════════════════════════════════════════════════════════
    assignmentRequest: {
        requestId: String,
        requestDate: Date,
        requestedBy: {
            type: String,
            enum: ['employee', 'manager', 'it', 'hr', 'admin']
        },
        requestReason: String,
        requestReasonCategory: {
            type: String,
            enum: ['new_hire', 'replacement', 'upgrade', 'additional', 'temporary_need', 'project', 'business_requirement']
        },
        urgency: {
            type: String,
            enum: ['low', 'medium', 'high', 'critical'],
            default: 'medium'
        },
        justification: String,
        requestedSpecs: {
            assetType: String,
            minimumSpecs: String,
            preferredBrand: String,
            budget: Number
        },
        approvalRequired: { type: Boolean, default: true },
        approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        approverName: String,
        approvalDate: Date,
        rejectionReason: String,
        requestStatus: {
            type: String,
            enum: ['pending', 'approved', 'rejected', 'fulfilled', 'cancelled'],
            default: 'pending'
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // ASSIGNMENT DETAILS
    // ═══════════════════════════════════════════════════════════════
    assignmentType: {
        type: String,
        enum: ['permanent', 'temporary', 'project_based', 'pool']
    },
    assignedDate: { type: Date },
    expectedReturnDate: Date,
    indefiniteAssignment: { type: Boolean, default: false },
    assignmentPurpose: String,
    assignmentPurposeCategory: {
        type: String,
        enum: ['job_requirement', 'project', 'training', 'replacement', 'temporary_need']
    },

    // Project assignment
    projectAssignment: {
        projectId: String,
        projectName: String,
        projectStartDate: Date,
        projectEndDate: Date,
        returnAfterProject: { type: Boolean, default: true }
    },

    // Assignment location
    assignmentLocation: {
        primaryLocation: String,
        mobileAsset: { type: Boolean, default: false },
        allowedLocations: [String],
        homeUseAllowed: { type: Boolean, default: false },
        internationalTravelAllowed: { type: Boolean, default: false }
    },

    // Handover details
    handover: {
        handedOverBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        handedOverByName: String,
        handoverDate: Date,
        handoverTime: String,
        handoverMethod: {
            type: String,
            enum: ['in_person', 'courier', 'mail']
        },
        handoverLocation: String,
        accessories: [accessorySchema],
        handoverChecklist: [checklistItemSchema],
        employeeSignature: String,
        handoverOfficerSignature: String,
        handoverDocument: String,
        handoverPhotos: [String]
    },

    // Employee acknowledgment
    acknowledgment: {
        acknowledged: { type: Boolean, default: false },
        acknowledgmentDate: Date,
        acknowledgmentMethod: {
            type: String,
            enum: ['digital_signature', 'physical_signature', 'email_confirmation', 'system_acceptance']
        },
        acknowledgedTerms: [{
            term: String,
            termAr: String,
            accepted: { type: Boolean, default: false }
        }],
        signature: String,
        signatureUrl: String,
        witnessName: String,
        witnessSignature: String
    },

    // ═══════════════════════════════════════════════════════════════
    // TERMS & CONDITIONS
    // ═══════════════════════════════════════════════════════════════
    termsAndConditions: {
        acceptableUse: {
            policyAccepted: { type: Boolean, default: false },
            acceptanceDate: Date,
            policyVersion: String,
            policyUrl: String,
            businessUseOnly: { type: Boolean, default: true },
            personalUseAllowed: Boolean,
            personalUseLimits: String,
            prohibitedActivities: [String]
        },
        careResponsibilities: {
            employeeResponsibilities: [String],
            maintenanceRequired: Boolean,
            maintenanceSchedule: String,
            cleaningRequired: Boolean,
            cleaningFrequency: String,
            storageRequirements: String,
            damageReporting: {
                reportImmediately: { type: Boolean, default: true },
                reportingMethod: String,
                reportingContact: String
            }
        },
        liability: {
            employeeLiableForLoss: { type: Boolean, default: true },
            employeeLiableForDamage: { type: Boolean, default: true },
            exceptionsToLiability: [String],
            replacementCostRecovery: { type: Boolean, default: true },
            maxLiabilityAmount: Number,
            insuranceDeductible: Number,
            liabilityWaiverConditions: [String]
        },
        returnConditions: {
            returnRequired: { type: Boolean, default: true },
            returnTriggers: [{
                trigger: {
                    type: String,
                    enum: ['resignation', 'termination', 'project_end', 'replacement', 'request', 'lease_end']
                },
                returnTimeline: String
            }],
            returnConditionRequired: {
                type: String,
                enum: ['same_as_received', 'good_working_order', 'normal_wear_accepted'],
                default: 'good_working_order'
            },
            cleaningRequired: Boolean,
            dataWipingRequired: Boolean,
            accessoriesReturnRequired: { type: Boolean, default: true },
            penaltyForLateReturn: {
                applicable: Boolean,
                penaltyType: {
                    type: String,
                    enum: ['daily_charge', 'salary_deduction', 'warning']
                },
                penaltyAmount: Number
            }
        },
        confidentiality: {
            confidentialDataAccess: Boolean,
            dataClassification: {
                type: String,
                enum: ['public', 'internal', 'confidential', 'restricted']
            },
            encryptionRequired: Boolean,
            backupRequired: Boolean,
            backupFrequency: String,
            dataRetentionPolicy: String,
            dataDestructionOnReturn: {
                required: Boolean,
                method: {
                    type: String,
                    enum: ['software_wipe', 'physical_destruction', 'secure_erase']
                },
                verificationRequired: Boolean,
                certificateIssued: Boolean
            }
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // STATUS & TRACKING
    // ═══════════════════════════════════════════════════════════════
    status: {
        type: String,
        enum: ['assigned', 'in_use', 'returned', 'lost', 'damaged', 'maintenance', 'stolen', 'retired'],
        default: 'assigned'
    },
    statusDate: { type: Date, default: Date.now },

    currentLocation: {
        locationType: {
            type: String,
            enum: ['office', 'home', 'field', 'transit', 'storage', 'other']
        },
        locationName: String,
        building: String,
        floor: String,
        room: String,
        desk: String,
        coordinates: {
            latitude: Number,
            longitude: Number,
            accuracy: Number,
            timestamp: Date
        },
        lastUpdated: Date
    },
    locationHistory: [{
        location: String,
        movedOn: Date,
        movedBy: String,
        reason: String
    }],

    usageTracking: {
        trackingMethod: {
            type: String,
            enum: ['manual', 'automatic', 'software_agent']
        },
        lastLoginDate: Date,
        activeHoursPerDay: Number,
        lastAccessDate: Date,
        accessCount: Number,
        // For vehicles
        currentMileage: Number,
        lastServiceMileage: Number,
        fuelLevel: Number,
        trips: [{
            tripDate: Date,
            startLocation: String,
            endLocation: String,
            distance: Number,
            purpose: String
        }],
        utilizationRate: Number,
        idleDays: Number
    },

    checkInOut: [{
        checkType: {
            type: String,
            enum: ['check_out', 'check_in']
        },
        checkDate: Date,
        checkTime: String,
        checkedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        checkedByName: String,
        location: String,
        purpose: String,
        expectedReturnDate: Date,
        actualReturnDate: Date,
        condition: String,
        notes: String
    }],

    // ═══════════════════════════════════════════════════════════════
    // MAINTENANCE & REPAIRS
    // ═══════════════════════════════════════════════════════════════
    maintenanceSchedule: {
        required: { type: Boolean, default: false },
        maintenanceType: {
            type: String,
            enum: ['preventive', 'periodic', 'condition_based']
        },
        frequency: {
            type: String,
            enum: ['daily', 'weekly', 'monthly', 'quarterly', 'annual', 'mileage_based']
        },
        maintenanceMileageInterval: Number,
        lastMaintenanceDate: Date,
        lastMaintenanceMileage: Number,
        nextMaintenanceDue: Date,
        nextMaintenanceMileage: Number,
        overdue: { type: Boolean, default: false },
        daysOverdue: Number
    },

    maintenanceHistory: [maintenanceHistorySchema],
    repairs: [repairSchema],
    totalMaintenanceCost: { type: Number, default: 0 },
    totalRepairCost: { type: Number, default: 0 },
    totalCostToDate: { type: Number, default: 0 },

    // ═══════════════════════════════════════════════════════════════
    // INCIDENTS
    // ═══════════════════════════════════════════════════════════════
    incidents: [incidentSchema],

    // ═══════════════════════════════════════════════════════════════
    // SOFTWARE LICENSE (if applicable)
    // ═══════════════════════════════════════════════════════════════
    softwareLicense: {
        isSoftwareLicense: { type: Boolean, default: false },
        licenseType: {
            type: String,
            enum: ['perpetual', 'subscription', 'concurrent', 'named_user', 'device']
        },
        softwareName: String,
        softwareVersion: String,
        vendor: String,
        licenseKey: String,
        activationCode: String,
        licensedTo: String,
        subscriptionStartDate: Date,
        subscriptionEndDate: Date,
        subscriptionDuration: Number,
        autoRenew: Boolean,
        renewalDate: Date,
        renewalCost: Number,
        installationsAllowed: Number,
        installationsUsed: { type: Number, default: 0 },
        installedOn: [{
            deviceId: String,
            deviceName: String,
            installDate: Date,
            activated: Boolean,
            activationDate: Date,
            deactivated: Boolean,
            deactivationDate: Date
        }],
        compliant: { type: Boolean, default: true },
        complianceIssues: [String],
        auditRequired: Boolean,
        lastAuditDate: Date,
        nextAuditDue: Date
    },

    // ═══════════════════════════════════════════════════════════════
    // VEHICLE SPECIFIC (if applicable)
    // ═══════════════════════════════════════════════════════════════
    vehicleDetails: {
        isVehicle: { type: Boolean, default: false },
        vehicleType: {
            type: String,
            enum: ['car', 'van', 'truck', 'motorcycle', 'bus']
        },
        registration: {
            registeredOwner: String,
            registrationDate: Date,
            registrationExpiry: Date,
            registrationDocument: String,
            renewalDue: Boolean,
            renewalCost: Number
        },
        vehicleInsurance: {
            insuranceProvider: String,
            policyNumber: String,
            policyType: {
                type: String,
                enum: ['comprehensive', 'third_party', 'third_party_fire_theft']
            },
            coverageAmount: Number,
            policyStartDate: Date,
            policyEndDate: Date,
            premium: Number,
            paymentFrequency: {
                type: String,
                enum: ['annual', 'semi_annual', 'quarterly', 'monthly']
            },
            policyDocument: String,
            renewalDue: Boolean
        },
        permittedDrivers: [{
            driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
            driverName: String,
            licenseNumber: String,
            licenseExpiry: Date,
            licenseVerified: Boolean,
            authorizedDate: Date,
            restrictions: String
        }],
        usageLimits: {
            personalUseAllowed: Boolean,
            geographicLimits: [String],
            mileageLimit: Number,
            currentMileage: Number,
            fuelCard: {
                provided: Boolean,
                cardNumber: String,
                monthlyLimit: Number
            }
        },
        fuelExpenses: [{
            date: Date,
            fuelType: String,
            liters: Number,
            pricePerLiter: Number,
            totalCost: Number,
            mileage: Number,
            receiptUrl: String,
            paidBy: {
                type: String,
                enum: ['company_card', 'employee_reimbursed']
            }
        }],
        totalFuelCost: { type: Number, default: 0 },
        trafficViolations: [{
            violationDate: Date,
            violationType: String,
            location: String,
            fineAmount: Number,
            driverAtFault: String,
            employeeLiable: Boolean,
            paid: Boolean,
            paidBy: {
                type: String,
                enum: ['company', 'employee']
            },
            receiptUrl: String,
            points: Number
        }]
    },

    // ═══════════════════════════════════════════════════════════════
    // RETURN PROCESS
    // ═══════════════════════════════════════════════════════════════
    returnProcess: {
        returnInitiated: { type: Boolean, default: false },
        returnInitiatedDate: Date,
        returnInitiatedBy: {
            type: String,
            enum: ['employee', 'manager', 'hr', 'it', 'system']
        },
        returnReason: {
            type: String,
            enum: ['resignation', 'termination', 'upgrade', 'project_end',
                'replacement', 'no_longer_needed', 'defective', 'lease_end']
        },
        returnReasonDetails: String,
        returnDueDate: Date,
        returnReminders: [{
            reminderDate: Date,
            reminderMethod: {
                type: String,
                enum: ['email', 'sms', 'system_notification']
            },
            acknowledged: Boolean
        }],
        actualReturnDate: Date,
        returnedBy: String,
        returnMethod: {
            type: String,
            enum: ['hand_delivery', 'courier', 'mail', 'pickup']
        },
        returnLocation: String,
        receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        receivedByName: String,

        // Return inspection
        inspection: {
            inspected: { type: Boolean, default: false },
            inspectionDate: Date,
            inspectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            inspectedByName: String,
            conditionAtReturn: {
                type: String,
                enum: ['excellent', 'good', 'fair', 'poor', 'damaged', 'not_functional']
            },
            damageAssessment: {
                hasDamage: Boolean,
                damages: [{
                    damageType: String,
                    description: String,
                    photos: [String],
                    repairCost: Number
                }],
                totalDamage: { type: Number, default: 0 },
                beyondNormalWear: Boolean
            },
            completenessCheck: {
                complete: Boolean,
                missingItems: [{
                    itemType: String,
                    description: String,
                    replacementCost: Number
                }],
                totalMissing: { type: Number, default: 0 }
            },
            dataCheck: {
                dataWiped: Boolean,
                wipingMethod: {
                    type: String,
                    enum: ['software', 'physical_destruction']
                },
                verificationCertificate: String,
                personalDataFound: Boolean,
                companyDataFound: Boolean,
                dataRecovered: Boolean
            },
            functionalityTest: {
                tested: Boolean,
                functional: Boolean,
                issues: [String],
                usableForReassignment: Boolean
            },
            inspectionReport: String,
            inspectionPhotos: [String],
            inspectionNotes: String
        },

        // Charges
        returnCharges: {
            hasCharges: { type: Boolean, default: false },
            charges: [{
                chargeType: {
                    type: String,
                    enum: ['damage', 'missing_item', 'cleaning', 'data_recovery', 'late_return', 'lost_asset']
                },
                description: String,
                amount: Number
            }],
            totalCharges: { type: Number, default: 0 },
            recoveryMethod: {
                type: String,
                enum: ['salary_deduction', 'final_settlement', 'payment', 'waived']
            },
            recovered: { type: Boolean, default: false },
            recoveryAmount: Number,
            recoveryDate: Date,
            waived: Boolean,
            waiverReason: String,
            waivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
        },

        // Clearance
        clearance: {
            cleared: { type: Boolean, default: false },
            clearanceDate: Date,
            clearanceBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            clearanceByName: String,
            clearanceCertificate: String,
            outstandingIssues: [String]
        },

        // Asset next steps
        nextSteps: {
            assetStatus: {
                type: String,
                enum: ['available_for_reassignment', 'needs_repair', 'needs_maintenance', 'retired', 'disposed']
            },
            reassignmentDate: Date,
            retirementDate: Date,
            retirementReason: String,
            disposalDate: Date,
            disposalMethod: {
                type: String,
                enum: ['sale', 'donation', 'recycling', 'destruction']
            }
        },

        returnCompleted: { type: Boolean, default: false },
        returnCompletionDate: Date
    },

    // ═══════════════════════════════════════════════════════════════
    // TRANSFERS
    // ═══════════════════════════════════════════════════════════════
    transfers: [transferSchema],

    // ═══════════════════════════════════════════════════════════════
    // DISPOSAL/RETIREMENT
    // ═══════════════════════════════════════════════════════════════
    disposal: {
        retired: { type: Boolean, default: false },
        retirementDate: Date,
        retirementReason: {
            type: String,
            enum: ['end_of_life', 'obsolete', 'damaged_beyond_repair', 'upgrade', 'lease_end', 'cost_ineffective']
        },
        retirementApproved: Boolean,
        approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        approvalDate: Date,
        bookValue: Number,
        disposalMethod: {
            type: String,
            enum: ['sale', 'donation', 'recycling', 'trade_in', 'return_to_vendor', 'destruction', 'storage']
        },
        disposalDate: Date,
        sale: {
            soldTo: String,
            salePrice: Number,
            saleDate: Date,
            saleReceipt: String,
            profit: Number,
            loss: Number
        },
        donation: {
            donatedTo: String,
            donationValue: Number,
            donationDate: Date,
            taxDeductible: Boolean,
            donationReceipt: String
        },
        recycling: {
            recyclingCompany: String,
            recyclingDate: Date,
            certificateOfDestruction: String,
            recycleFee: Number
        },
        tradeIn: {
            vendor: String,
            tradeInValue: Number,
            newAssetId: String,
            tradeInDate: Date
        },
        dataDestruction: {
            required: Boolean,
            destructionMethod: {
                type: String,
                enum: ['software_wipe', 'degaussing', 'physical_destruction', 'shredding']
            },
            destructionDate: Date,
            certificateOfDestruction: String,
            witnessedBy: String
        },
        accounting: {
            assetRemovedFromBooks: Boolean,
            removalDate: Date,
            journalEntryNumber: String,
            gainLossOnDisposal: Number
        },
        disposalDocument: String,
        notes: String
    },

    // ═══════════════════════════════════════════════════════════════
    // COMPLIANCE
    // ═══════════════════════════════════════════════════════════════
    compliance: {
        itSecurityCompliance: {
            encryptionEnabled: Boolean,
            antivirusInstalled: Boolean,
            antivirusUpdated: Boolean,
            firewallEnabled: Boolean,
            osUpdated: Boolean,
            lastOSUpdate: Date,
            securityPatchesApplied: Boolean,
            unauthorizedSoftware: Boolean,
            lastSecurityScan: Date,
            compliant: { type: Boolean, default: true },
            complianceIssues: [String]
        },
        assetTaggingCompliance: {
            tagged: { type: Boolean, default: true },
            tagType: {
                type: String,
                enum: ['barcode', 'qr_code', 'rfid', 'serial_number']
            },
            tagLocation: String,
            tagReadable: { type: Boolean, default: true },
            physicalVerificationDate: Date
        },
        auditCompliance: {
            lastAuditDate: Date,
            nextAuditDue: Date,
            auditFrequency: {
                type: String,
                enum: ['monthly', 'quarterly', 'semi_annual', 'annual']
            },
            auditFindings: [{
                finding: String,
                severity: {
                    type: String,
                    enum: ['low', 'medium', 'high']
                },
                correctionRequired: Boolean,
                corrected: Boolean,
                correctionDate: Date
            }],
            compliant: { type: Boolean, default: true }
        },
        legalCompliance: {
            licensesValid: Boolean,
            registrationCurrent: Boolean,
            insuranceCurrent: Boolean,
            complianceChecks: [{
                checkType: String,
                requirement: String,
                compliant: Boolean,
                expiryDate: Date
            }],
            overallCompliant: { type: Boolean, default: true }
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // DOCUMENTS & COMMUNICATIONS
    // ═══════════════════════════════════════════════════════════════
    documents: [documentSchema],
    communications: [communicationSchema],

    // ═══════════════════════════════════════════════════════════════
    // NOTES
    // ═══════════════════════════════════════════════════════════════
    notes: {
        employeeNotes: String,
        itNotes: String,
        adminNotes: String,
        maintenanceNotes: String,
        internalNotes: String,
        specialInstructions: String
    },

    // ═══════════════════════════════════════════════════════════════
    // ANALYTICS
    // ═══════════════════════════════════════════════════════════════
    analytics: {
        assignmentDuration: Number, // Days
        utilizationRate: Number, // %
        totalCostOfOwnership: Number,
        costPerDay: Number,
        maintenanceCostPercentage: Number,
        uptimePercentage: Number,
        meanTimeBetweenFailures: Number, // Days
        vsAssetTypeAverage: {
            cost: {
                type: String,
                enum: ['above', 'at', 'below']
            },
            reliability: {
                type: String,
                enum: ['above', 'at', 'below']
            },
            lifespan: {
                type: String,
                enum: ['above', 'at', 'below']
            }
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // RELATED RECORDS
    // ═══════════════════════════════════════════════════════════════
    relatedRecords: {
        previousAssignmentIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'AssetAssignment' }],
        maintenanceRecordIds: [String],
        incidentIds: [String],
        expenseClaimIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ExpenseClaim' }],
        exitProcessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Offboarding' }
    },

    // ═══════════════════════════════════════════════════════════════
    // AUDIT FIELDS
    // ═══════════════════════════════════════════════════════════════
    createdOn: { type: Date, default: Date.now },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    lastModifiedOn: Date,
    lastModifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════

// Multi-tenancy indexes
assetAssignmentSchema.index({ firmId: 1 });
assetAssignmentSchema.index({ lawyerId: 1 });
assetAssignmentSchema.index({ firmId: 1, status: 1 });

// Primary lookup indexes
assetAssignmentSchema.index({ assignmentNumber: 1 });
assetAssignmentSchema.index({ assignmentId: 1 });
assetAssignmentSchema.index({ assetTag: 1 });
assetAssignmentSchema.index({ serialNumber: 1 });
assetAssignmentSchema.index({ employeeId: 1, status: 1 });

// Filter indexes
assetAssignmentSchema.index({ status: 1 });
assetAssignmentSchema.index({ assetType: 1 });
assetAssignmentSchema.index({ assetCategory: 1 });
assetAssignmentSchema.index({ assignmentType: 1 });
assetAssignmentSchema.index({ department: 1 });

// Date indexes
assetAssignmentSchema.index({ assignedDate: -1 });
assetAssignmentSchema.index({ 'returnProcess.returnDueDate': 1 });
assetAssignmentSchema.index({ 'maintenanceSchedule.nextMaintenanceDue': 1 });
assetAssignmentSchema.index({ createdOn: -1 });

// Compliance indexes
assetAssignmentSchema.index({ 'warranty.warrantyEndDate': 1 });
assetAssignmentSchema.index({ 'insurance.policyEndDate': 1 });

// ═══════════════════════════════════════════════════════════════
// VIRTUAL FIELDS
// ═══════════════════════════════════════════════════════════════

assetAssignmentSchema.virtual('daysAssigned').get(function () {
    if (!this.assignedDate) return 0;
    const endDate = this.returnProcess?.actualReturnDate || new Date();
    return Math.ceil((endDate - this.assignedDate) / (1000 * 60 * 60 * 24));
});

assetAssignmentSchema.virtual('isOverdueReturn').get(function () {
    if (!this.returnProcess?.returnDueDate) return false;
    if (this.returnProcess.returnCompleted) return false;
    return new Date() > this.returnProcess.returnDueDate;
});

assetAssignmentSchema.virtual('daysOverdueReturn').get(function () {
    if (!this.isOverdueReturn) return 0;
    return Math.ceil((new Date() - this.returnProcess.returnDueDate) / (1000 * 60 * 60 * 24));
});

assetAssignmentSchema.virtual('warrantyExpired').get(function () {
    if (!this.warranty?.warrantyEndDate) return false;
    return new Date() > this.warranty.warrantyEndDate;
});

assetAssignmentSchema.virtual('insuranceExpired').get(function () {
    if (!this.insurance?.policyEndDate) return false;
    return new Date() > this.insurance.policyEndDate;
});

// ═══════════════════════════════════════════════════════════════
// MIDDLEWARE
// ═══════════════════════════════════════════════════════════════

// Pre-save middleware
assetAssignmentSchema.pre('save', function (next) {
    // Update last modified date
    this.lastModifiedOn = new Date();

    // Calculate total costs
    this.totalCostToDate = (this.totalMaintenanceCost || 0) + (this.totalRepairCost || 0);

    // Update warranty expired status
    if (this.warranty?.warrantyEndDate) {
        this.warranty.expired = new Date() > this.warranty.warrantyEndDate;
    }

    // Update insurance expired status
    if (this.insurance?.policyEndDate) {
        this.insurance.expired = new Date() > this.insurance.policyEndDate;
    }

    // Update maintenance overdue status
    if (this.maintenanceSchedule?.nextMaintenanceDue) {
        const dueDate = new Date(this.maintenanceSchedule.nextMaintenanceDue);
        this.maintenanceSchedule.overdue = new Date() > dueDate;
        if (this.maintenanceSchedule.overdue) {
            this.maintenanceSchedule.daysOverdue = Math.ceil((new Date() - dueDate) / (1000 * 60 * 60 * 24));
        }
    }

    // Calculate analytics
    if (this.assignedDate) {
        const endDate = this.returnProcess?.actualReturnDate || new Date();
        this.analytics.assignmentDuration = Math.ceil((endDate - this.assignedDate) / (1000 * 60 * 60 * 24));

        if (this.purchasePrice && this.analytics.assignmentDuration > 0) {
            this.analytics.totalCostOfOwnership = (this.purchasePrice || 0) + this.totalCostToDate;
            this.analytics.costPerDay = this.analytics.totalCostOfOwnership / this.analytics.assignmentDuration;
        }
    }

    // Calculate current value with depreciation
    if (this.purchasePrice && this.purchaseDate && this.depreciationRate) {
        const yearsSincePurchase = (new Date() - new Date(this.purchaseDate)) / (1000 * 60 * 60 * 24 * 365);
        const depreciation = (this.depreciationRate / 100) * yearsSincePurchase * this.purchasePrice;
        this.currentValue = Math.max(0, this.purchasePrice - depreciation);
    }

    next();
});

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

// Generate assignment number
assetAssignmentSchema.statics.generateAssignmentNumber = async function (firmId) {
    const year = new Date().getFullYear();
    const prefix = `ASG-${year}-`;

    const query = firmId
        ? { firmId, assignmentNumber: new RegExp(`^${prefix}`) }
        : { assignmentNumber: new RegExp(`^${prefix}`) };

    const lastAssignment = await this.findOne(query)
        .sort({ assignmentNumber: -1 })
        .select('assignmentNumber');

    let sequence = 1;
    if (lastAssignment) {
        const lastNum = parseInt(lastAssignment.assignmentNumber.split('-')[2]);
        sequence = lastNum + 1;
    }

    return `${prefix}${sequence.toString().padStart(4, '0')}`;
};

// Generate assignment ID
assetAssignmentSchema.statics.generateAssignmentId = async function () {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 9);
    return `ASG-${timestamp}-${random}`.toUpperCase();
};

// Get asset policies
assetAssignmentSchema.statics.getAssetPolicies = function () {
    return ASSET_POLICIES;
};

// ═══════════════════════════════════════════════════════════════
// INSTANCE METHODS
// ═══════════════════════════════════════════════════════════════

// Check if asset requires maintenance
assetAssignmentSchema.methods.requiresMaintenance = function () {
    if (!this.maintenanceSchedule?.nextMaintenanceDue) return false;
    return new Date() >= this.maintenanceSchedule.nextMaintenanceDue;
};

// Get total charges
assetAssignmentSchema.methods.getTotalCharges = function () {
    let total = 0;

    // Damage charges from return
    if (this.returnProcess?.returnCharges?.totalCharges) {
        total += this.returnProcess.returnCharges.totalCharges;
    }

    // Repair charges attributed to employee
    this.repairs?.forEach(repair => {
        if (repair.employeeLiable && repair.employeeCharge?.chargeAmount) {
            total += repair.employeeCharge.chargeAmount;
        }
    });

    // Incident liabilities
    this.incidents?.forEach(incident => {
        if (incident.liability?.employeeLiable && incident.liability?.liabilityAmount) {
            total += incident.liability.liabilityAmount;
        }
    });

    return total;
};

// Get assignment summary
assetAssignmentSchema.methods.getSummary = function () {
    return {
        assignmentId: this.assignmentId,
        assetName: this.assetName,
        assetTag: this.assetTag,
        assetType: this.assetType,
        employeeName: this.employeeName,
        department: this.department,
        status: this.status,
        assignedDate: this.assignedDate,
        daysAssigned: this.daysAssigned,
        currentValue: this.currentValue,
        warrantyExpired: this.warrantyExpired,
        insuranceExpired: this.insuranceExpired,
        maintenanceOverdue: this.maintenanceSchedule?.overdue,
        returnDue: this.returnProcess?.returnDueDate,
        isOverdueReturn: this.isOverdueReturn
    };
};

const AssetAssignment = mongoose.model('AssetAssignment', assetAssignmentSchema);

module.exports = AssetAssignment;
