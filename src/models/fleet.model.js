/**
 * Fleet Management Model
 *
 * Enterprise fleet and vehicle management
 * Inspired by: SAP Fleet Management, Oracle Fleet, Fleetio
 *
 * Features:
 * - Vehicle CRUD with specifications
 * - Driver assignment
 * - Fuel logs
 * - Maintenance scheduling
 * - Insurance & registration tracking
 */

const mongoose = require('mongoose');
const Counter = require('./counter.model');

// ═══════════════════════════════════════════════════════════════
// VEHICLE SCHEMA
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

    // Type
    vehicleType: {
        type: String,
        enum: ['sedan', 'suv', 'pickup', 'van', 'truck', 'bus', 'motorcycle', 'other'],
        required: true
    },

    // Ownership
    ownershipType: {
        type: String,
        enum: ['owned', 'leased', 'rented'],
        default: 'owned'
    },
    purchaseDate: Date,
    purchasePrice: Number,
    leaseEndDate: Date,
    monthlyLeaseCost: Number,

    // Specifications
    fuelType: {
        type: String,
        enum: ['petrol', 'diesel', 'hybrid', 'electric', 'lpg'],
        default: 'petrol'
    },
    engineCapacity: Number, // in CC
    tankCapacity: Number, // in liters
    seatingCapacity: Number,
    currentOdometer: { type: Number, default: 0 },

    // Status
    status: {
        type: String,
        enum: ['active', 'maintenance', 'out_of_service', 'reserved', 'disposed'],
        default: 'active',
        index: true
    },

    // Current Assignment
    currentDriverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
        index: true
    },
    currentDriverName: String,
    currentDriverNameAr: String,
    assignedDepartmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },

    // Registration & Insurance
    registration: {
        number: String,
        expiryDate: Date,
        issuedBy: String,
        documentUrl: String
    },
    insurance: {
        provider: String,
        policyNumber: String,
        startDate: Date,
        expiryDate: Date,
        premium: Number,
        coverageType: { type: String, enum: ['basic', 'comprehensive', 'third_party'] },
        documentUrl: String
    },

    // Maintenance
    lastServiceDate: Date,
    nextServiceDue: Date,
    nextServiceOdometer: Number,

    // Location (GPS tracking)
    lastKnownLocation: {
        latitude: Number,
        longitude: Number,
        address: String,
        updatedAt: Date
    },

    // Images
    images: [{
        url: String,
        caption: String,
        uploadedAt: { type: Date, default: Date.now }
    }],

    // Notes
    notes: String,
    notesAr: String,
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
// FUEL LOG SCHEMA
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
    odometerReading: { type: Number, required: true },
    previousOdometer: Number,
    distanceTraveled: Number,

    // Fuel details
    fuelType: {
        type: String,
        enum: ['petrol', 'diesel', 'hybrid_petrol', 'electric', 'lpg'],
        required: true
    },
    quantity: { type: Number, required: true }, // liters
    pricePerUnit: { type: Number, required: true }, // SAR per liter
    totalCost: { type: Number, required: true },
    fullTank: { type: Boolean, default: false },

    // Efficiency
    fuelEfficiency: Number, // km per liter (calculated)

    // Station
    station: String,
    stationLocation: String,
    receiptNumber: String,
    receiptUrl: String,

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
// MAINTENANCE RECORD SCHEMA
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
            'brake_service',
            'battery_replacement',
            'air_filter',
            'transmission',
            'engine_repair',
            'body_repair',
            'ac_service',
            'inspection',
            'recall',
            'accident_repair',
            'other'
        ],
        required: true
    },
    maintenanceTypeAr: String,

    // Details
    description: { type: String, required: true },
    descriptionAr: String,

    // Scheduling
    status: {
        type: String,
        enum: ['scheduled', 'in_progress', 'completed', 'cancelled'],
        default: 'scheduled',
        index: true
    },
    scheduledDate: Date,
    startDate: Date,
    completionDate: Date,

    // Odometer
    odometerAtService: Number,

    // Cost
    laborCost: { type: Number, default: 0 },
    partsCost: { type: Number, default: 0 },
    totalCost: { type: Number, default: 0 },

    // Parts replaced
    partsReplaced: [{
        partName: String,
        partNameAr: String,
        partNumber: String,
        quantity: Number,
        unitCost: Number
    }],

    // Service provider
    serviceProvider: String,
    serviceProviderAr: String,
    serviceLocation: String,
    invoiceNumber: String,
    invoiceUrl: String,

    // Warranty
    warrantyPeriodDays: Number,
    warrantyExpiryDate: Date,

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
// VEHICLE ASSIGNMENT SCHEMA
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
    status: {
        type: String,
        enum: ['active', 'ended', 'cancelled'],
        default: 'active',
        index: true
    },

    // Purpose
    assignmentType: {
        type: String,
        enum: ['permanent', 'temporary', 'trip', 'pool'],
        default: 'permanent'
    },
    purpose: String,
    purposeAr: String,

    // Odometer
    startOdometer: Number,
    endOdometer: Number,

    // Approval
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvalDate: Date,

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
// INDEXES
// ═══════════════════════════════════════════════════════════════

vehicleSchema.index({ firmId: 1, status: 1, vehicleType: 1 });
vehicleSchema.index({ firmId: 1, currentDriverId: 1 });
fuelLogSchema.index({ firmId: 1, vehicleId: 1, date: -1 });
maintenanceRecordSchema.index({ firmId: 1, vehicleId: 1, status: 1 });
vehicleAssignmentSchema.index({ firmId: 1, vehicleId: 1, status: 1 });
vehicleAssignmentSchema.index({ firmId: 1, driverId: 1, status: 1 });

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
        if (this.quantity > 0 && this.distanceTraveled > 0) {
            this.fuelEfficiency = parseFloat((this.distanceTraveled / this.quantity).toFixed(2));
        }
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
    this.totalCost = (this.laborCost || 0) + (this.partsCost || 0);

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
    next();
});

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

const Vehicle = mongoose.model('Vehicle', vehicleSchema);
const FuelLog = mongoose.model('FuelLog', fuelLogSchema);
const MaintenanceRecord = mongoose.model('MaintenanceRecord', maintenanceRecordSchema);
const VehicleAssignment = mongoose.model('VehicleAssignment', vehicleAssignmentSchema);

module.exports = { Vehicle, FuelLog, MaintenanceRecord, VehicleAssignment };
