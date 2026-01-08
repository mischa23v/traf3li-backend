/**
 * Fleet Management Model
 *
 * Enterprise fleet and vehicle management
 * Inspired by: SAP Fleet Management, Oracle Fleet, Fleetio, Samsara, Geotab
 *
 * Features:
 * - Vehicle CRUD with detailed specifications
 * - Driver assignment with license tracking
 * - Fuel logs with efficiency analytics
 * - Maintenance scheduling with predictive alerts
 * - Insurance & registration tracking with alerts
 * - Vehicle inspections (pre-trip/post-trip)
 * - GPS location history and geofencing
 * - Trip/route logging
 * - Incident/accident reporting
 * - Cost analysis and TCO tracking
 * - Recall tracking
 * - Document management
 */

const mongoose = require('mongoose');
const Counter = require('./counter.model');

// ═══════════════════════════════════════════════════════════════
// CONSTANTS & ENUMS
// ═══════════════════════════════════════════════════════════════

const VEHICLE_TYPES = ['sedan', 'suv', 'pickup', 'van', 'truck', 'bus', 'motorcycle', 'heavy_equipment', 'trailer', 'other'];
const OWNERSHIP_TYPES = ['owned', 'leased', 'rented', 'financed'];
const FUEL_TYPES = ['petrol', 'diesel', 'hybrid', 'electric', 'lpg', 'cng', 'hydrogen'];
const VEHICLE_STATUSES = ['active', 'maintenance', 'out_of_service', 'reserved', 'disposed', 'impounded', 'stolen'];
const COVERAGE_TYPES = ['basic', 'comprehensive', 'third_party', 'full'];
const INSPECTION_TYPES = ['pre_trip', 'post_trip', 'daily', 'weekly', 'monthly', 'annual', 'dvir', 'dot'];
const INSPECTION_STATUSES = ['passed', 'failed', 'passed_with_defects'];
const TRIP_TYPES = ['business', 'personal', 'commute', 'delivery', 'service_call', 'client_visit'];
const INCIDENT_TYPES = ['accident', 'theft', 'vandalism', 'breakdown', 'traffic_violation', 'near_miss', 'injury', 'property_damage'];
const INCIDENT_SEVERITIES = ['minor', 'moderate', 'major', 'critical'];
const DRIVER_LICENSE_TYPES = ['private', 'public_light', 'public_heavy', 'motorcycle', 'commercial', 'hazmat'];

// Standard inspection checklist items (DVIR compliant)
const INSPECTION_CHECKLIST_ITEMS = [
    { code: 'EXT_LIGHTS', name: 'Exterior Lights', nameAr: 'الأضواء الخارجية', category: 'exterior' },
    { code: 'TURN_SIGNALS', name: 'Turn Signals', nameAr: 'إشارات الانعطاف', category: 'exterior' },
    { code: 'BRAKE_LIGHTS', name: 'Brake Lights', nameAr: 'أضواء الفرامل', category: 'exterior' },
    { code: 'MIRRORS', name: 'Mirrors', nameAr: 'المرايا', category: 'exterior' },
    { code: 'WINDSHIELD', name: 'Windshield', nameAr: 'الزجاج الأمامي', category: 'exterior' },
    { code: 'WIPERS', name: 'Windshield Wipers', nameAr: 'مساحات الزجاج', category: 'exterior' },
    { code: 'TIRES', name: 'Tires & Wheels', nameAr: 'الإطارات والعجلات', category: 'exterior' },
    { code: 'BODY_DAMAGE', name: 'Body Damage', nameAr: 'أضرار الهيكل', category: 'exterior' },
    { code: 'HORN', name: 'Horn', nameAr: 'البوق', category: 'interior' },
    { code: 'SEAT_BELTS', name: 'Seat Belts', nameAr: 'أحزمة الأمان', category: 'interior' },
    { code: 'DASHBOARD', name: 'Dashboard Indicators', nameAr: 'مؤشرات لوحة القيادة', category: 'interior' },
    { code: 'AC_HEATING', name: 'AC/Heating', nameAr: 'التكييف/التدفئة', category: 'interior' },
    { code: 'BRAKES', name: 'Brakes', nameAr: 'الفرامل', category: 'mechanical' },
    { code: 'STEERING', name: 'Steering', nameAr: 'التوجيه', category: 'mechanical' },
    { code: 'ENGINE', name: 'Engine', nameAr: 'المحرك', category: 'mechanical' },
    { code: 'OIL_LEVEL', name: 'Oil Level', nameAr: 'مستوى الزيت', category: 'fluids' },
    { code: 'COOLANT', name: 'Coolant Level', nameAr: 'مستوى سائل التبريد', category: 'fluids' },
    { code: 'FUEL_LEVEL', name: 'Fuel Level', nameAr: 'مستوى الوقود', category: 'fluids' },
    { code: 'FIRST_AID', name: 'First Aid Kit', nameAr: 'صندوق الإسعافات', category: 'safety' },
    { code: 'FIRE_EXT', name: 'Fire Extinguisher', nameAr: 'طفاية الحريق', category: 'safety' },
    { code: 'WARNING_TRIANGLE', name: 'Warning Triangle', nameAr: 'مثلث التحذير', category: 'safety' },
    { code: 'SPARE_TIRE', name: 'Spare Tire', nameAr: 'الإطار الاحتياطي', category: 'safety' }
];

// ═══════════════════════════════════════════════════════════════
// VEHICLE SCHEMA (Enhanced)
// ═══════════════════════════════════════════════════════════════

const vehicleSchema = new mongoose.Schema({
    vehicleId: {
        type: String,
        unique: true,
        index: true
    },

    // Basic Info
    plateNumber: {
        type: String,
        required: [true, 'Plate number is required'],
        trim: true,
        index: true
    },
    plateNumberAr: String,

    make: { type: String, required: true },
    model: { type: String, required: true },
    year: { type: Number, required: true },
    color: String,
    colorAr: String,
    vin: { type: String, trim: true }, // Vehicle Identification Number
    engineNumber: String,
    chassisNumber: String,

    // Type & Class
    vehicleType: {
        type: String,
        enum: VEHICLE_TYPES,
        required: true
    },
    vehicleClass: String, // e.g., Class A, Class B for commercial
    grossWeight: Number, // kg
    netWeight: Number, // kg
    loadCapacity: Number, // kg

    // Ownership & Finance
    ownershipType: {
        type: String,
        enum: OWNERSHIP_TYPES,
        default: 'owned'
    },
    purchaseDate: Date,
    purchasePrice: Number,
    currentValue: Number, // Depreciated value
    depreciationMethod: {
        type: String,
        enum: ['straight_line', 'declining_balance', 'sum_of_years'],
        default: 'straight_line'
    },
    depreciationRate: { type: Number, default: 20 }, // % per year
    leaseEndDate: Date,
    monthlyLeaseCost: Number,
    financingDetails: {
        lender: String,
        loanAmount: Number,
        monthlyPayment: Number,
        interestRate: Number,
        startDate: Date,
        endDate: Date,
        remainingBalance: Number
    },

    // Specifications
    fuelType: {
        type: String,
        enum: FUEL_TYPES,
        default: 'petrol'
    },
    engineCapacity: Number, // in CC
    horsepower: Number,
    torque: Number, // Nm
    transmission: {
        type: String,
        enum: ['manual', 'automatic', 'cvt', 'dct'],
        default: 'automatic'
    },
    driveType: {
        type: String,
        enum: ['fwd', 'rwd', 'awd', '4wd'],
        default: 'fwd'
    },
    tankCapacity: Number, // in liters
    batteryCapacity: Number, // kWh for electric vehicles
    seatingCapacity: Number,
    doors: Number,

    // Odometer & Usage
    currentOdometer: { type: Number, default: 0 },
    odometerUnit: { type: String, enum: ['km', 'mi'], default: 'km' },
    averageDailyKm: Number,
    lifetimeDistance: { type: Number, default: 0 },
    engineHours: { type: Number, default: 0 }, // For heavy equipment

    // Status
    status: {
        type: String,
        enum: VEHICLE_STATUSES,
        default: 'active',
        index: true
    },
    statusReason: String,
    statusChangedAt: Date,
    statusHistory: [{
        status: String,
        reason: String,
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        changedAt: { type: Date, default: Date.now }
    }],

    // Current Assignment
    currentDriverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
        index: true
    },
    currentDriverName: String,
    currentDriverNameAr: String,
    assignedDepartmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
    assignedDepartmentName: String,
    costCenter: String, // For accounting

    // Registration
    registration: {
        number: String,
        issuedDate: Date,
        expiryDate: Date,
        issuedBy: String,
        registrationType: { type: String, enum: ['private', 'commercial', 'government', 'diplomatic'] },
        documentUrl: String,
        renewalAlertDays: { type: Number, default: 30 }
    },

    // Insurance
    insurance: {
        provider: String,
        providerAr: String,
        policyNumber: String,
        startDate: Date,
        expiryDate: Date,
        premium: Number,
        premiumFrequency: { type: String, enum: ['monthly', 'quarterly', 'annual'], default: 'annual' },
        coverageType: { type: String, enum: COVERAGE_TYPES },
        coverageAmount: Number,
        deductible: Number,
        beneficiaries: [String],
        documentUrl: String,
        renewalAlertDays: { type: Number, default: 30 },
        claimsHistory: [{
            claimNumber: String,
            incidentDate: Date,
            claimDate: Date,
            amount: Number,
            status: { type: String, enum: ['pending', 'approved', 'rejected', 'paid'] },
            description: String
        }]
    },

    // Maintenance Schedule
    lastServiceDate: Date,
    nextServiceDue: Date,
    nextServiceOdometer: Number,
    serviceIntervalDays: { type: Number, default: 180 }, // 6 months
    serviceIntervalKm: { type: Number, default: 10000 },
    maintenanceAlertDays: { type: Number, default: 14 },

    // Inspection
    lastInspectionDate: Date,
    lastInspectionStatus: { type: String, enum: INSPECTION_STATUSES },
    nextInspectionDue: Date,
    inspectionFrequency: { type: String, enum: ['daily', 'weekly', 'monthly'], default: 'daily' },

    // GPS Tracking
    gpsEnabled: { type: Boolean, default: false },
    gpsDeviceId: String,
    lastKnownLocation: {
        latitude: Number,
        longitude: Number,
        altitude: Number,
        heading: Number, // Direction in degrees
        speed: Number, // km/h
        address: String,
        addressAr: String,
        geofenceStatus: { type: String, enum: ['inside', 'outside', 'unknown'] },
        updatedAt: Date
    },

    // Geofencing
    geofences: [{
        name: String,
        nameAr: String,
        type: { type: String, enum: ['circle', 'polygon'] },
        center: { // For circle
            latitude: Number,
            longitude: Number
        },
        radius: Number, // meters, for circle
        coordinates: [{ // For polygon
            latitude: Number,
            longitude: Number
        }],
        alertOnEntry: { type: Boolean, default: true },
        alertOnExit: { type: Boolean, default: true },
        isActive: { type: Boolean, default: true }
    }],

    // Recalls
    activeRecalls: [{
        recallId: String,
        manufacturer: String,
        description: String,
        descriptionAr: String,
        severity: { type: String, enum: ['low', 'medium', 'high', 'critical'] },
        recallDate: Date,
        remedy: String,
        remedyAr: String,
        status: { type: String, enum: ['open', 'scheduled', 'completed'], default: 'open' },
        completedDate: Date,
        completedBy: String
    }],

    // Documents
    documents: [{
        documentType: {
            type: String,
            enum: ['registration', 'insurance', 'inspection', 'title', 'service_record', 'manual', 'warranty', 'other']
        },
        name: String,
        nameAr: String,
        url: String,
        expiryDate: Date,
        uploadedAt: { type: Date, default: Date.now },
        uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    }],

    // Images
    images: [{
        url: String,
        caption: String,
        captionAr: String,
        imageType: { type: String, enum: ['exterior', 'interior', 'damage', 'document', 'other'] },
        uploadedAt: { type: Date, default: Date.now }
    }],

    // Telematics/OBD Data
    telematics: {
        lastDtcCodes: [String], // Diagnostic Trouble Codes
        batteryVoltage: Number,
        engineTemperature: Number,
        oilPressure: Number,
        fuelLevel: Number, // percentage
        tiresPressure: {
            frontLeft: Number,
            frontRight: Number,
            rearLeft: Number,
            rearRight: Number
        },
        lastUpdated: Date
    },

    // Performance Metrics (Calculated)
    metrics: {
        totalFuelCost: { type: Number, default: 0 },
        totalMaintenanceCost: { type: Number, default: 0 },
        totalIncidentCost: { type: Number, default: 0 },
        costPerKm: { type: Number, default: 0 },
        avgFuelEfficiency: { type: Number, default: 0 },
        utilizationRate: { type: Number, default: 0 }, // percentage
        downtime: { type: Number, default: 0 }, // days
        incidentCount: { type: Number, default: 0 },
        lastCalculated: Date
    },

    // Disposal
    disposalInfo: {
        disposalDate: Date,
        disposalMethod: { type: String, enum: ['sold', 'traded', 'scrapped', 'donated', 'stolen'] },
        disposalPrice: Number,
        buyer: String,
        disposalNotes: String,
        documentUrl: String
    },

    // Notes
    notes: String,
    notesAr: String,
    tags: [String],
    isActive: { type: Boolean, default: true },

    // Multi-tenant
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        required: true,
        index: true
    },
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
    timestamps: true
});

// ═══════════════════════════════════════════════════════════════
// FUEL LOG SCHEMA (Enhanced)
// ═══════════════════════════════════════════════════════════════

const fuelLogSchema = new mongoose.Schema({
    logId: {
        type: String,
        unique: true,
        index: true
    },

    vehicleId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vehicle',
        required: true,
        index: true
    },
    driverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
        index: true
    },

    date: { type: Date, required: true, default: Date.now },
    time: String, // HH:MM format
    odometerReading: { type: Number, required: true },
    previousOdometer: Number,
    distanceTraveled: Number,

    // Fuel details
    fuelType: {
        type: String,
        enum: FUEL_TYPES,
        required: true
    },
    quantity: { type: Number, required: true }, // liters
    pricePerUnit: { type: Number, required: true }, // SAR per liter
    totalCost: { type: Number, required: true },
    fullTank: { type: Boolean, default: false },
    missedFillups: { type: Number, default: 0 }, // For accurate efficiency calc

    // Efficiency
    fuelEfficiency: Number, // km per liter (calculated)
    co2Emissions: Number, // kg CO2 (calculated: liters * emission factor)

    // Station
    station: String,
    stationAr: String,
    stationBrand: String,
    stationLocation: String,
    stationLatitude: Number,
    stationLongitude: Number,

    // Payment
    paymentMethod: {
        type: String,
        enum: ['cash', 'card', 'fuel_card', 'corporate_account', 'mobile'],
        default: 'cash'
    },
    fuelCardNumber: String,
    receiptNumber: String,
    receiptUrl: String,

    // Verification
    isVerified: { type: Boolean, default: false },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    verifiedAt: Date,

    notes: String,

    // Multi-tenant
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        required: true,
        index: true
    },
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
    timestamps: true
});

// ═══════════════════════════════════════════════════════════════
// MAINTENANCE RECORD SCHEMA (Enhanced)
// ═══════════════════════════════════════════════════════════════

const maintenanceRecordSchema = new mongoose.Schema({
    recordId: {
        type: String,
        unique: true,
        index: true
    },

    vehicleId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vehicle',
        required: true,
        index: true
    },

    // Maintenance type
    maintenanceType: {
        type: String,
        enum: [
            'scheduled_service',
            'oil_change',
            'tire_rotation',
            'tire_replacement',
            'brake_service',
            'brake_replacement',
            'battery_replacement',
            'air_filter',
            'cabin_filter',
            'spark_plugs',
            'transmission_service',
            'transmission_repair',
            'engine_repair',
            'body_repair',
            'ac_service',
            'alignment',
            'suspension',
            'exhaust',
            'electrical',
            'inspection',
            'recall',
            'accident_repair',
            'windshield',
            'detailing',
            'other'
        ],
        required: true
    },
    maintenanceTypeAr: String,
    maintenanceCategory: {
        type: String,
        enum: ['preventive', 'corrective', 'predictive', 'emergency'],
        default: 'preventive'
    },

    // Priority
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'medium'
    },

    // Details
    description: { type: String, required: true },
    descriptionAr: String,
    workPerformed: String,
    workPerformedAr: String,

    // Scheduling
    status: {
        type: String,
        enum: ['scheduled', 'in_progress', 'completed', 'cancelled', 'deferred'],
        default: 'scheduled',
        index: true
    },
    requestedDate: Date,
    scheduledDate: Date,
    startDate: Date,
    completionDate: Date,
    deferredReason: String,

    // Odometer
    odometerAtService: Number,

    // Cost breakdown
    laborCost: { type: Number, default: 0 },
    laborHours: { type: Number, default: 0 },
    laborRate: Number, // SAR per hour
    partsCost: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    totalCost: { type: Number, default: 0 },

    // Parts replaced
    partsReplaced: [{
        partName: String,
        partNameAr: String,
        partNumber: String,
        manufacturer: String,
        quantity: Number,
        unitCost: Number,
        totalCost: Number,
        warrantyMonths: Number,
        isOem: { type: Boolean, default: true } // Original Equipment Manufacturer
    }],

    // Service provider
    serviceProvider: String,
    serviceProviderAr: String,
    serviceLocation: String,
    serviceLocationAr: String,
    technicianName: String,
    invoiceNumber: String,
    invoiceUrl: String,
    workOrderNumber: String,

    // Warranty
    isWarrantyClaim: { type: Boolean, default: false },
    warrantyClaimNumber: String,
    warrantyPeriodDays: Number,
    warrantyExpiryDate: Date,
    warrantyMileage: Number,

    // Quality check
    qualityCheck: {
        passed: Boolean,
        checkedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        checkedAt: Date,
        notes: String
    },

    // Follow-up
    followUpRequired: { type: Boolean, default: false },
    followUpDate: Date,
    followUpNotes: String,

    // Approval workflow
    requiresApproval: { type: Boolean, default: false },
    approvalStatus: { type: String, enum: ['pending', 'approved', 'rejected'] },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: Date,
    approvalNotes: String,

    // Attachments
    attachments: [{
        name: String,
        url: String,
        type: { type: String, enum: ['invoice', 'photo', 'report', 'warranty', 'other'] },
        uploadedAt: { type: Date, default: Date.now }
    }],

    notes: String,

    // Multi-tenant
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        required: true,
        index: true
    },
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
    timestamps: true
});

// ═══════════════════════════════════════════════════════════════
// VEHICLE ASSIGNMENT SCHEMA (Enhanced)
// ═══════════════════════════════════════════════════════════════

const vehicleAssignmentSchema = new mongoose.Schema({
    assignmentId: {
        type: String,
        unique: true,
        index: true
    },

    vehicleId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vehicle',
        required: true,
        index: true
    },
    driverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
        required: true,
        index: true
    },
    driverName: String,
    driverNameAr: String,

    // Assignment period
    startDate: { type: Date, required: true, default: Date.now },
    endDate: Date,
    expectedEndDate: Date,
    status: {
        type: String,
        enum: ['active', 'ended', 'cancelled', 'suspended'],
        default: 'active',
        index: true
    },

    // Purpose
    assignmentType: {
        type: String,
        enum: ['permanent', 'temporary', 'trip', 'pool', 'project', 'replacement'],
        default: 'permanent'
    },
    purpose: String,
    purposeAr: String,
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
    caseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Case' },

    // Odometer
    startOdometer: Number,
    endOdometer: Number,
    distanceTraveled: Number,

    // Driver License Verification
    driverLicenseVerified: { type: Boolean, default: false },
    driverLicenseNumber: String,
    driverLicenseExpiry: Date,

    // Terms
    dailyKmLimit: Number,
    personalUseAllowed: { type: Boolean, default: false },
    weekendUseAllowed: { type: Boolean, default: false },
    fuelCardProvided: { type: Boolean, default: false },
    fuelCardNumber: String,

    // Acknowledgments
    termsAccepted: { type: Boolean, default: false },
    termsAcceptedAt: Date,
    keyHandedOver: { type: Boolean, default: false },
    keyHandedOverAt: Date,
    documentsHandedOver: { type: Boolean, default: false },

    // Initial condition
    initialCondition: {
        exteriorCondition: { type: String, enum: ['excellent', 'good', 'fair', 'poor'] },
        interiorCondition: { type: String, enum: ['excellent', 'good', 'fair', 'poor'] },
        fuelLevel: Number, // percentage
        damages: [String],
        photos: [String],
        notes: String
    },

    // Return condition
    returnCondition: {
        exteriorCondition: { type: String, enum: ['excellent', 'good', 'fair', 'poor'] },
        interiorCondition: { type: String, enum: ['excellent', 'good', 'fair', 'poor'] },
        fuelLevel: Number,
        newDamages: [String],
        photos: [String],
        notes: String,
        chargesApplied: Number
    },

    // Approval
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvalDate: Date,
    approvalNotes: String,

    notes: String,

    // Multi-tenant
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        required: true,
        index: true
    },
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
    timestamps: true
});

// ═══════════════════════════════════════════════════════════════
// VEHICLE INSPECTION SCHEMA (NEW)
// ═══════════════════════════════════════════════════════════════

const vehicleInspectionSchema = new mongoose.Schema({
    inspectionId: {
        type: String,
        unique: true,
        index: true
    },

    vehicleId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vehicle',
        required: true,
        index: true
    },
    inspectorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
        required: true
    },
    inspectorName: String,

    // Inspection type
    inspectionType: {
        type: String,
        enum: INSPECTION_TYPES,
        required: true
    },

    // Timing
    inspectionDate: { type: Date, required: true, default: Date.now },
    odometerReading: Number,
    engineHours: Number,

    // Location
    location: String,
    locationAr: String,
    latitude: Number,
    longitude: Number,

    // Overall result
    overallStatus: {
        type: String,
        enum: INSPECTION_STATUSES,
        required: true
    },

    // Checklist items
    checklistItems: [{
        code: String,
        name: String,
        nameAr: String,
        category: String,
        status: { type: String, enum: ['pass', 'fail', 'na', 'needs_attention'] },
        severity: { type: String, enum: ['minor', 'major', 'critical'] },
        notes: String,
        photoUrl: String
    }],

    // Defects found
    defectsFound: [{
        description: String,
        descriptionAr: String,
        severity: { type: String, enum: ['minor', 'major', 'critical'] },
        category: String,
        photoUrl: String,
        requiresImmediate: { type: Boolean, default: false },
        workOrderCreated: { type: Boolean, default: false },
        workOrderId: { type: mongoose.Schema.Types.ObjectId, ref: 'MaintenanceRecord' }
    }],

    // Driver verification
    driverCertification: {
        driverConfirmed: { type: Boolean, default: false },
        driverSignature: String, // URL or base64
        confirmationTime: Date
    },

    // Photos
    photos: [{
        url: String,
        caption: String,
        category: String,
        takenAt: { type: Date, default: Date.now }
    }],

    // Follow-up
    followUpRequired: { type: Boolean, default: false },
    followUpNotes: String,
    maintenanceScheduled: { type: Boolean, default: false },

    // Duration
    startTime: Date,
    endTime: Date,
    duration: Number, // minutes

    notes: String,
    notesAr: String,

    // Multi-tenant
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        required: true,
        index: true
    },
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
    timestamps: true
});

// ═══════════════════════════════════════════════════════════════
// TRIP LOG SCHEMA (NEW)
// ═══════════════════════════════════════════════════════════════

const tripLogSchema = new mongoose.Schema({
    tripId: {
        type: String,
        unique: true,
        index: true
    },

    vehicleId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vehicle',
        required: true,
        index: true
    },
    driverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
        required: true,
        index: true
    },

    // Trip type
    tripType: {
        type: String,
        enum: TRIP_TYPES,
        required: true
    },

    // Purpose
    purpose: String,
    purposeAr: String,
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
    caseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Case' },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },

    // Timing
    startTime: { type: Date, required: true },
    endTime: Date,
    status: {
        type: String,
        enum: ['planned', 'in_progress', 'completed', 'cancelled'],
        default: 'planned'
    },

    // Locations
    startLocation: {
        name: String,
        nameAr: String,
        address: String,
        latitude: Number,
        longitude: Number
    },
    endLocation: {
        name: String,
        nameAr: String,
        address: String,
        latitude: Number,
        longitude: Number
    },
    stops: [{
        name: String,
        nameAr: String,
        address: String,
        latitude: Number,
        longitude: Number,
        arrivalTime: Date,
        departureTime: Date,
        duration: Number, // minutes
        purpose: String
    }],

    // GPS Route (for tracking)
    routePoints: [{
        latitude: Number,
        longitude: Number,
        speed: Number,
        heading: Number,
        timestamp: Date
    }],

    // Distance & Odometer
    startOdometer: Number,
    endOdometer: Number,
    distance: Number, // km
    estimatedDistance: Number,

    // Driving metrics
    drivingMetrics: {
        avgSpeed: Number,
        maxSpeed: Number,
        idleTime: Number, // minutes
        harshBraking: { type: Number, default: 0 },
        harshAcceleration: { type: Number, default: 0 },
        harshCornering: { type: Number, default: 0 },
        speedingEvents: { type: Number, default: 0 },
        drivingScore: Number // 0-100
    },

    // Cost
    fuelUsed: Number, // liters
    fuelCost: Number,
    tollCost: Number,
    parkingCost: Number,
    otherCosts: Number,
    totalCost: Number,
    costPerKm: Number,

    // Reimbursement
    isReimbursable: { type: Boolean, default: false },
    reimbursementRate: Number, // SAR per km
    reimbursementAmount: Number,
    reimbursementStatus: {
        type: String,
        enum: ['not_requested', 'pending', 'approved', 'rejected', 'paid'],
        default: 'not_requested'
    },
    reimbursementApprovedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // Receipts
    receipts: [{
        type: { type: String, enum: ['fuel', 'toll', 'parking', 'other'] },
        amount: Number,
        url: String,
        description: String
    }],

    notes: String,
    notesAr: String,

    // Multi-tenant
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        required: true,
        index: true
    },
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
    timestamps: true
});

// ═══════════════════════════════════════════════════════════════
// INCIDENT SCHEMA (NEW)
// ═══════════════════════════════════════════════════════════════

const vehicleIncidentSchema = new mongoose.Schema({
    incidentId: {
        type: String,
        unique: true,
        index: true
    },

    vehicleId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vehicle',
        required: true,
        index: true
    },
    driverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
        index: true
    },
    driverName: String,

    // Incident type
    incidentType: {
        type: String,
        enum: INCIDENT_TYPES,
        required: true
    },
    severity: {
        type: String,
        enum: INCIDENT_SEVERITIES,
        required: true
    },

    // Timing & Location
    incidentDate: { type: Date, required: true },
    incidentTime: String, // HH:MM
    reportedDate: { type: Date, default: Date.now },
    location: String,
    locationAr: String,
    latitude: Number,
    longitude: Number,
    address: String,
    city: String,
    country: String,

    // Odometer
    odometerReading: Number,

    // Description
    description: { type: String, required: true },
    descriptionAr: String,
    driverStatement: String,

    // For accidents
    accidentDetails: {
        weatherConditions: { type: String, enum: ['clear', 'rain', 'fog', 'sandstorm', 'other'] },
        roadConditions: { type: String, enum: ['dry', 'wet', 'icy', 'construction', 'other'] },
        lightConditions: { type: String, enum: ['daylight', 'dusk', 'night_lit', 'night_unlit'] },
        policeReportFiled: { type: Boolean, default: false },
        policeReportNumber: String,
        policeStation: String,
        faultDetermination: { type: String, enum: ['our_driver', 'other_party', 'shared', 'unknown'] },
        otherVehiclesInvolved: [{
            plateNumber: String,
            make: String,
            model: String,
            color: String,
            driverName: String,
            driverPhone: String,
            driverLicense: String,
            insuranceCompany: String,
            insurancePolicyNumber: String,
            damages: String
        }],
        witnesses: [{
            name: String,
            phone: String,
            statement: String
        }]
    },

    // For traffic violations
    violationDetails: {
        violationType: String,
        ticketNumber: String,
        fineAmount: Number,
        points: Number,
        dueDate: Date,
        paidDate: Date,
        contestStatus: { type: String, enum: ['not_contested', 'pending', 'won', 'lost'] }
    },

    // Injuries
    injuries: [{
        personName: String,
        personType: { type: String, enum: ['driver', 'passenger', 'pedestrian', 'other_driver'] },
        injurySeverity: { type: String, enum: ['minor', 'moderate', 'serious', 'fatal'] },
        description: String,
        medicalTreatment: String,
        hospitalized: { type: Boolean, default: false }
    }],

    // Damages
    vehicleDamages: {
        description: String,
        descriptionAr: String,
        affectedAreas: [String],
        isDriveable: { type: Boolean, default: true },
        estimatedRepairCost: Number,
        actualRepairCost: Number,
        repairStatus: { type: String, enum: ['pending', 'in_progress', 'completed'] },
        maintenanceRecordId: { type: mongoose.Schema.Types.ObjectId, ref: 'MaintenanceRecord' }
    },

    propertyDamages: [{
        description: String,
        owner: String,
        estimatedCost: Number,
        claimFiled: { type: Boolean, default: false }
    }],

    // Insurance
    insuranceClaim: {
        claimFiled: { type: Boolean, default: false },
        claimNumber: String,
        claimDate: Date,
        claimAmount: Number,
        approvedAmount: Number,
        status: { type: String, enum: ['not_filed', 'pending', 'approved', 'rejected', 'paid'] },
        adjusterName: String,
        adjusterPhone: String,
        notes: String
    },

    // Investigation
    investigation: {
        isRequired: { type: Boolean, default: false },
        investigatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        startDate: Date,
        completionDate: Date,
        findings: String,
        findingsAr: String,
        recommendations: [String],
        disciplinaryAction: String,
        preventiveMeasures: [String],
        status: { type: String, enum: ['pending', 'in_progress', 'completed'] }
    },

    // Photos & Documents
    photos: [{
        url: String,
        caption: String,
        category: { type: String, enum: ['scene', 'vehicle_damage', 'other_vehicle', 'document', 'other'] },
        uploadedAt: { type: Date, default: Date.now }
    }],

    documents: [{
        name: String,
        url: String,
        type: { type: String, enum: ['police_report', 'medical', 'insurance', 'witness_statement', 'other'] },
        uploadedAt: { type: Date, default: Date.now }
    }],

    // Status
    status: {
        type: String,
        enum: ['reported', 'under_investigation', 'resolved', 'closed'],
        default: 'reported'
    },
    resolution: String,
    resolutionDate: Date,
    closedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // Costs
    totalCost: { type: Number, default: 0 },
    costBreakdown: {
        repairCost: { type: Number, default: 0 },
        medicalCost: { type: Number, default: 0 },
        legalCost: { type: Number, default: 0 },
        rentalCost: { type: Number, default: 0 },
        fineCost: { type: Number, default: 0 },
        otherCost: { type: Number, default: 0 }
    },

    notes: String,
    notesAr: String,

    // Multi-tenant
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        required: true,
        index: true
    },
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
    timestamps: true
});

// ═══════════════════════════════════════════════════════════════
// GPS LOCATION HISTORY SCHEMA (NEW)
// ═══════════════════════════════════════════════════════════════

const gpsLocationHistorySchema = new mongoose.Schema({
    vehicleId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vehicle',
        required: true,
        index: true
    },

    timestamp: { type: Date, required: true, index: true },

    location: {
        latitude: { type: Number, required: true },
        longitude: { type: Number, required: true },
        altitude: Number,
        accuracy: Number // meters
    },

    speed: Number, // km/h
    heading: Number, // degrees (0-360)

    // Engine status
    engineStatus: { type: String, enum: ['on', 'off', 'idle'] },
    ignitionOn: Boolean,

    // Odometer at this point
    odometer: Number,

    // Address (reverse geocoded)
    address: String,

    // Events at this location
    events: [{
        type: { type: String, enum: ['speeding', 'harsh_braking', 'harsh_acceleration', 'idle', 'geofence_entry', 'geofence_exit'] },
        value: Number,
        threshold: Number
    }],

    // Multi-tenant
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        required: true,
        index: true
    },
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    }
}, {
    timestamps: false // Use timestamp field instead
});

// ═══════════════════════════════════════════════════════════════
// DRIVER PROFILE SCHEMA (NEW)
// ═══════════════════════════════════════════════════════════════

const driverProfileSchema = new mongoose.Schema({
    profileId: {
        type: String,
        unique: true,
        index: true
    },

    employeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
        required: true,
        unique: true,
        index: true
    },
    employeeName: String,
    employeeNameAr: String,

    // License information
    license: {
        number: { type: String, required: true },
        type: { type: String, enum: DRIVER_LICENSE_TYPES },
        issuedDate: Date,
        expiryDate: Date,
        issuingAuthority: String,
        endorsements: [String],
        restrictions: [String],
        documentUrl: String,
        isVerified: { type: Boolean, default: false },
        verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        verifiedAt: Date
    },

    // Additional licenses (international, hazmat, etc.)
    additionalLicenses: [{
        type: String,
        number: String,
        issuedDate: Date,
        expiryDate: Date,
        issuingAuthority: String,
        documentUrl: String
    }],

    // Medical fitness
    medicalCertificate: {
        isRequired: { type: Boolean, default: false },
        issueDate: Date,
        expiryDate: Date,
        restrictions: [String],
        documentUrl: String
    },

    // Driving history
    drivingHistory: {
        yearsOfExperience: Number,
        previousEmployers: [{
            company: String,
            from: Date,
            to: Date,
            vehicleTypes: [String],
            reference: String
        }]
    },

    // Safety record
    safetyRecord: {
        totalIncidents: { type: Number, default: 0 },
        atFaultIncidents: { type: Number, default: 0 },
        trafficViolations: { type: Number, default: 0 },
        points: { type: Number, default: 0 },
        lastIncidentDate: Date,
        suspensions: [{
            reason: String,
            startDate: Date,
            endDate: Date,
            notes: String
        }]
    },

    // Training
    training: [{
        name: String,
        nameAr: String,
        type: { type: String, enum: ['defensive_driving', 'first_aid', 'hazmat', 'passenger', 'eco_driving', 'other'] },
        provider: String,
        completedDate: Date,
        expiryDate: Date,
        certificateUrl: String,
        score: Number
    }],

    // Performance metrics
    performanceMetrics: {
        overallScore: { type: Number, default: 100 }, // 0-100
        safetyScore: { type: Number, default: 100 },
        efficiencyScore: { type: Number, default: 100 },
        totalTrips: { type: Number, default: 0 },
        totalDistance: { type: Number, default: 0 },
        avgFuelEfficiency: Number,
        harshEvents: {
            braking: { type: Number, default: 0 },
            acceleration: { type: Number, default: 0 },
            cornering: { type: Number, default: 0 },
            speeding: { type: Number, default: 0 }
        },
        idleTime: { type: Number, default: 0 }, // minutes
        lastCalculated: Date
    },

    // Certifications
    certifications: [{
        name: String,
        nameAr: String,
        issuedBy: String,
        issuedDate: Date,
        expiryDate: Date,
        documentUrl: String
    }],

    // Availability
    availability: {
        isAvailable: { type: Boolean, default: true },
        unavailableReason: String,
        unavailableUntil: Date,
        preferredVehicleTypes: [{ type: String, enum: VEHICLE_TYPES }],
        maxDailyHours: { type: Number, default: 8 }
    },

    // Documents
    documents: [{
        type: { type: String, enum: ['license', 'medical', 'training', 'id', 'other'] },
        name: String,
        url: String,
        expiryDate: Date,
        uploadedAt: { type: Date, default: Date.now }
    }],

    // Status
    status: {
        type: String,
        enum: ['active', 'suspended', 'inactive', 'terminated'],
        default: 'active'
    },
    statusReason: String,

    notes: String,
    notesAr: String,

    // Multi-tenant
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        required: true,
        index: true
    },
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
    timestamps: true
});

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════

// Vehicle indexes
vehicleSchema.index({ firmId: 1, status: 1, vehicleType: 1 });
vehicleSchema.index({ firmId: 1, currentDriverId: 1 });
vehicleSchema.index({ firmId: 1, 'registration.expiryDate': 1 });
vehicleSchema.index({ firmId: 1, 'insurance.expiryDate': 1 });
vehicleSchema.index({ firmId: 1, nextServiceDue: 1 });

// Fuel log indexes
fuelLogSchema.index({ firmId: 1, vehicleId: 1, date: -1 });
fuelLogSchema.index({ firmId: 1, driverId: 1, date: -1 });

// Maintenance indexes
maintenanceRecordSchema.index({ firmId: 1, vehicleId: 1, status: 1 });
maintenanceRecordSchema.index({ firmId: 1, scheduledDate: 1, status: 1 });

// Assignment indexes
vehicleAssignmentSchema.index({ firmId: 1, vehicleId: 1, status: 1 });
vehicleAssignmentSchema.index({ firmId: 1, driverId: 1, status: 1 });

// Inspection indexes
vehicleInspectionSchema.index({ firmId: 1, vehicleId: 1, inspectionDate: -1 });
vehicleInspectionSchema.index({ firmId: 1, inspectorId: 1, inspectionDate: -1 });

// Trip indexes
tripLogSchema.index({ firmId: 1, vehicleId: 1, startTime: -1 });
tripLogSchema.index({ firmId: 1, driverId: 1, startTime: -1 });
tripLogSchema.index({ firmId: 1, tripType: 1, status: 1 });

// Incident indexes
vehicleIncidentSchema.index({ firmId: 1, vehicleId: 1, incidentDate: -1 });
vehicleIncidentSchema.index({ firmId: 1, driverId: 1, incidentDate: -1 });
vehicleIncidentSchema.index({ firmId: 1, status: 1 });

// GPS location indexes
gpsLocationHistorySchema.index({ firmId: 1, vehicleId: 1, timestamp: -1 });
gpsLocationHistorySchema.index({ vehicleId: 1, timestamp: -1 }); // For time-series queries

// Driver profile indexes
driverProfileSchema.index({ firmId: 1, status: 1 });
driverProfileSchema.index({ firmId: 1, 'license.expiryDate': 1 });

// ═══════════════════════════════════════════════════════════════
// PRE-SAVE HOOKS
// ═══════════════════════════════════════════════════════════════

vehicleSchema.pre('save', async function(next) {
    if (this.isNew && !this.vehicleId) {
        try {
            const counter = await Counter.findOneAndUpdate(
                { model: 'Vehicle', firmId: this.firmId },
                { $inc: { seq: 1 } },
                { new: true, upsert: true }
            );
            this.vehicleId = `VH-${String(counter.seq).padStart(4, '0')}`;
        } catch (error) {
            return next(error);
        }
    }

    // Track status changes
    if (this.isModified('status') && !this.isNew) {
        this.statusChangedAt = new Date();
        this.statusHistory.push({
            status: this.status,
            reason: this.statusReason,
            changedAt: new Date()
        });
    }

    // Calculate depreciated value
    if (this.purchaseDate && this.purchasePrice && this.depreciationRate) {
        const yearsOwned = (Date.now() - this.purchaseDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
        if (this.depreciationMethod === 'straight_line') {
            const totalDepreciation = (this.depreciationRate / 100) * this.purchasePrice * yearsOwned;
            this.currentValue = Math.max(0, this.purchasePrice - totalDepreciation);
        }
    }

    next();
});

fuelLogSchema.pre('save', async function(next) {
    if (this.isNew && !this.logId) {
        try {
            const counter = await Counter.findOneAndUpdate(
                { model: 'FuelLog', firmId: this.firmId },
                { $inc: { seq: 1 } },
                { new: true, upsert: true }
            );
            this.logId = `FL-${String(counter.seq).padStart(5, '0')}`;
        } catch (error) {
            return next(error);
        }
    }

    // Calculate distance and efficiency
    if (this.previousOdometer && this.odometerReading) {
        this.distanceTraveled = this.odometerReading - this.previousOdometer;
        if (this.quantity > 0 && this.distanceTraveled > 0 && this.fullTank) {
            this.fuelEfficiency = parseFloat((this.distanceTraveled / this.quantity).toFixed(2));
        }
    }

    // Calculate CO2 emissions (kg CO2 per liter: petrol ~2.31, diesel ~2.68)
    if (this.quantity > 0) {
        const emissionFactors = {
            petrol: 2.31,
            diesel: 2.68,
            lpg: 1.51,
            cng: 2.0,
            hybrid: 1.8,
            electric: 0,
            hydrogen: 0
        };
        this.co2Emissions = parseFloat((this.quantity * (emissionFactors[this.fuelType] || 2.31)).toFixed(2));
    }

    next();
});

maintenanceRecordSchema.pre('save', async function(next) {
    if (this.isNew && !this.recordId) {
        try {
            const counter = await Counter.findOneAndUpdate(
                { model: 'MaintenanceRecord', firmId: this.firmId },
                { $inc: { seq: 1 } },
                { new: true, upsert: true }
            );
            this.recordId = `MR-${String(counter.seq).padStart(5, '0')}`;
        } catch (error) {
            return next(error);
        }
    }

    // Calculate total cost
    const partsTotal = this.partsReplaced?.reduce((sum, p) => sum + (p.totalCost || p.quantity * p.unitCost || 0), 0) || 0;
    this.partsCost = partsTotal;
    this.totalCost = (this.laborCost || 0) + partsTotal + (this.taxAmount || 0) - (this.discount || 0);

    // Calculate warranty expiry
    if (this.completionDate && this.warrantyPeriodDays) {
        this.warrantyExpiryDate = new Date(this.completionDate.getTime() + this.warrantyPeriodDays * 24 * 60 * 60 * 1000);
    }

    next();
});

vehicleAssignmentSchema.pre('save', async function(next) {
    if (this.isNew && !this.assignmentId) {
        try {
            const counter = await Counter.findOneAndUpdate(
                { model: 'VehicleAssignment', firmId: this.firmId },
                { $inc: { seq: 1 } },
                { new: true, upsert: true }
            );
            this.assignmentId = `VA-${String(counter.seq).padStart(5, '0')}`;
        } catch (error) {
            return next(error);
        }
    }

    // Calculate distance traveled
    if (this.endOdometer && this.startOdometer) {
        this.distanceTraveled = this.endOdometer - this.startOdometer;
    }

    next();
});

vehicleInspectionSchema.pre('save', async function(next) {
    if (this.isNew && !this.inspectionId) {
        try {
            const counter = await Counter.findOneAndUpdate(
                { model: 'VehicleInspection', firmId: this.firmId },
                { $inc: { seq: 1 } },
                { new: true, upsert: true }
            );
            this.inspectionId = `VI-${String(counter.seq).padStart(5, '0')}`;
        } catch (error) {
            return next(error);
        }
    }

    // Calculate duration
    if (this.startTime && this.endTime) {
        this.duration = Math.round((this.endTime.getTime() - this.startTime.getTime()) / 60000);
    }

    // Determine overall status from checklist
    if (this.checklistItems && this.checklistItems.length > 0) {
        const hasFailure = this.checklistItems.some(item => item.status === 'fail' && item.severity === 'critical');
        const hasDefects = this.checklistItems.some(item => item.status === 'fail' || item.status === 'needs_attention');

        if (hasFailure) {
            this.overallStatus = 'failed';
        } else if (hasDefects) {
            this.overallStatus = 'passed_with_defects';
        } else {
            this.overallStatus = 'passed';
        }
    }

    next();
});

tripLogSchema.pre('save', async function(next) {
    if (this.isNew && !this.tripId) {
        try {
            const counter = await Counter.findOneAndUpdate(
                { model: 'TripLog', firmId: this.firmId },
                { $inc: { seq: 1 } },
                { new: true, upsert: true }
            );
            this.tripId = `TR-${String(counter.seq).padStart(5, '0')}`;
        } catch (error) {
            return next(error);
        }
    }

    // Calculate distance
    if (this.endOdometer && this.startOdometer) {
        this.distance = this.endOdometer - this.startOdometer;
    }

    // Calculate total cost
    this.totalCost = (this.fuelCost || 0) + (this.tollCost || 0) + (this.parkingCost || 0) + (this.otherCosts || 0);

    // Calculate cost per km
    if (this.distance > 0 && this.totalCost > 0) {
        this.costPerKm = parseFloat((this.totalCost / this.distance).toFixed(2));
    }

    // Calculate reimbursement
    if (this.isReimbursable && this.distance > 0 && this.reimbursementRate) {
        this.reimbursementAmount = parseFloat((this.distance * this.reimbursementRate).toFixed(2));
    }

    next();
});

vehicleIncidentSchema.pre('save', async function(next) {
    if (this.isNew && !this.incidentId) {
        try {
            const counter = await Counter.findOneAndUpdate(
                { model: 'VehicleIncident', firmId: this.firmId },
                { $inc: { seq: 1 } },
                { new: true, upsert: true }
            );
            this.incidentId = `INC-${String(counter.seq).padStart(5, '0')}`;
        } catch (error) {
            return next(error);
        }
    }

    // Calculate total cost
    this.totalCost =
        (this.costBreakdown?.repairCost || 0) +
        (this.costBreakdown?.medicalCost || 0) +
        (this.costBreakdown?.legalCost || 0) +
        (this.costBreakdown?.rentalCost || 0) +
        (this.costBreakdown?.fineCost || 0) +
        (this.costBreakdown?.otherCost || 0);

    next();
});

driverProfileSchema.pre('save', async function(next) {
    if (this.isNew && !this.profileId) {
        try {
            const counter = await Counter.findOneAndUpdate(
                { model: 'DriverProfile', firmId: this.firmId },
                { $inc: { seq: 1 } },
                { new: true, upsert: true }
            );
            this.profileId = `DR-${String(counter.seq).padStart(4, '0')}`;
        } catch (error) {
            return next(error);
        }
    }
    next();
});

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Get vehicles with expiring documents
 */
vehicleSchema.statics.getExpiringDocuments = async function(firmQuery, days = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() + days);

    return this.find({
        ...firmQuery,
        isActive: true,
        $or: [
            { 'registration.expiryDate': { $lte: cutoffDate, $gt: new Date() } },
            { 'insurance.expiryDate': { $lte: cutoffDate, $gt: new Date() } }
        ]
    }).select('vehicleId plateNumber registration.expiryDate insurance.expiryDate');
};

/**
 * Get vehicles due for maintenance
 */
vehicleSchema.statics.getMaintenanceDue = async function(firmQuery, days = 14) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() + days);

    return this.find({
        ...firmQuery,
        isActive: true,
        status: { $ne: 'disposed' },
        $or: [
            { nextServiceDue: { $lte: cutoffDate } },
            { nextServiceOdometer: { $lte: '$currentOdometer' } }
        ]
    }).select('vehicleId plateNumber nextServiceDue nextServiceOdometer currentOdometer');
};

/**
 * Calculate fleet statistics
 */
vehicleSchema.statics.getFleetAnalytics = async function(firmQuery) {
    const ObjectId = mongoose.Types.ObjectId;
    const matchQuery = { ...firmQuery };
    if (matchQuery.firmId && typeof matchQuery.firmId === 'string') {
        matchQuery.firmId = new ObjectId(matchQuery.firmId);
    }

    return this.aggregate([
        { $match: { ...matchQuery, isActive: true } },
        {
            $group: {
                _id: null,
                totalVehicles: { $sum: 1 },
                activeVehicles: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
                inMaintenance: { $sum: { $cond: [{ $eq: ['$status', 'maintenance'] }, 1, 0] } },
                outOfService: { $sum: { $cond: [{ $eq: ['$status', 'out_of_service'] }, 1, 0] } },
                assigned: { $sum: { $cond: [{ $ne: ['$currentDriverId', null] }, 1, 0] } },
                unassigned: { $sum: { $cond: [{ $eq: ['$currentDriverId', null] }, 1, 0] } },
                totalValue: { $sum: { $ifNull: ['$currentValue', '$purchasePrice'] } },
                avgOdometer: { $avg: '$currentOdometer' },
                byType: {
                    $push: {
                        type: '$vehicleType',
                        count: 1
                    }
                }
            }
        }
    ]);
};

/**
 * Get driver safety scores
 */
driverProfileSchema.statics.getDriverRankings = async function(firmQuery, limit = 10) {
    return this.find({
        ...firmQuery,
        status: 'active'
    })
        .select('employeeId employeeName employeeNameAr performanceMetrics.overallScore performanceMetrics.safetyScore performanceMetrics.totalTrips safetyRecord')
        .sort({ 'performanceMetrics.overallScore': -1 })
        .limit(limit);
};

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

const Vehicle = mongoose.model('Vehicle', vehicleSchema);
const FuelLog = mongoose.model('FuelLog', fuelLogSchema);
const MaintenanceRecord = mongoose.model('MaintenanceRecord', maintenanceRecordSchema);
const VehicleAssignment = mongoose.model('VehicleAssignment', vehicleAssignmentSchema);
const VehicleInspection = mongoose.model('VehicleInspection', vehicleInspectionSchema);
const TripLog = mongoose.model('TripLog', tripLogSchema);
const VehicleIncident = mongoose.model('VehicleIncident', vehicleIncidentSchema);
const GpsLocationHistory = mongoose.model('GpsLocationHistory', gpsLocationHistorySchema);
const DriverProfile = mongoose.model('DriverProfile', driverProfileSchema);

module.exports = {
    Vehicle,
    FuelLog,
    MaintenanceRecord,
    VehicleAssignment,
    VehicleInspection,
    TripLog,
    VehicleIncident,
    GpsLocationHistory,
    DriverProfile,
    // Constants
    VEHICLE_TYPES,
    OWNERSHIP_TYPES,
    FUEL_TYPES,
    VEHICLE_STATUSES,
    COVERAGE_TYPES,
    INSPECTION_TYPES,
    INSPECTION_STATUSES,
    INSPECTION_CHECKLIST_ITEMS,
    TRIP_TYPES,
    INCIDENT_TYPES,
    INCIDENT_SEVERITIES,
    DRIVER_LICENSE_TYPES
};
