/**
 * Vehicle Model
 *
 * Tracks company vehicles and vehicle assignments to employees.
 * Includes insurance, maintenance tracking, and fuel management.
 *
 * Features:
 * - Vehicle registration and details
 * - Employee assignment
 * - Insurance and registration expiry tracking
 * - Maintenance history
 * - Fuel consumption tracking
 */

const mongoose = require('mongoose');
const Counter = require('./counter.model');

const maintenanceRecordSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  type: {
    type: String,
    enum: ['scheduled', 'repair', 'accident', 'inspection', 'tire_change', 'oil_change', 'other'],
    required: true
  },
  description: String,
  vendor: String,
  cost: { type: Number, default: 0 },
  odometer: Number,
  nextServiceDue: Date,
  nextServiceOdometer: Number,
  attachments: [{
    name: String,
    url: String
  }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

const vehicleSchema = new mongoose.Schema({
  // Unique identifier
  vehicleId: {
    type: String,
    unique: true,
    index: true
  },

  // Basic vehicle info
  vehicleType: {
    type: String,
    enum: ['sedan', 'suv', 'truck', 'van', 'motorcycle', 'bus', 'other'],
    required: true
  },
  make: {
    type: String,
    required: [true, 'Vehicle make is required'],
    trim: true
  },
  model: {
    type: String,
    required: [true, 'Vehicle model is required'],
    trim: true
  },
  year: {
    type: Number,
    required: true
  },
  color: String,
  vin: {
    type: String,
    trim: true,
    index: true
  },

  // Saudi registration
  plateNumber: {
    type: String,
    required: [true, 'Plate number is required'],
    trim: true,
    index: true
  },
  plateType: {
    type: String,
    enum: ['private', 'commercial', 'diplomatic', 'temporary', 'other'],
    default: 'commercial'
  },
  registrationNumber: String,
  registrationExpiry: {
    type: Date,
    index: true
  },

  // Ownership
  ownershipType: {
    type: String,
    enum: ['owned', 'leased', 'rented'],
    default: 'owned'
  },
  purchaseDate: Date,
  purchasePrice: Number,
  leaseDetails: {
    leasingCompany: String,
    leaseStartDate: Date,
    leaseEndDate: Date,
    monthlyPayment: Number,
    contractNumber: String
  },

  // Insurance
  insuranceCompany: String,
  insurancePolicyNumber: String,
  insuranceType: {
    type: String,
    enum: ['comprehensive', 'third_party', 'basic'],
    default: 'comprehensive'
  },
  insuranceStartDate: Date,
  insuranceExpiry: {
    type: Date,
    index: true
  },
  insurancePremium: Number,

  // Technical specs
  engineNumber: String,
  fuelType: {
    type: String,
    enum: ['petrol', 'diesel', 'hybrid', 'electric', 'lpg'],
    default: 'petrol'
  },
  engineCapacity: Number, // in cc
  seatingCapacity: Number,
  loadCapacity: Number, // in kg

  // Current status
  currentOdometer: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['available', 'assigned', 'in_maintenance', 'out_of_service', 'sold'],
    default: 'available',
    index: true
  },

  // Assignment
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    index: true
  },
  assignmentDate: Date,
  assignmentType: {
    type: String,
    enum: ['permanent', 'temporary', 'pool'],
    default: 'permanent'
  },
  assignmentEndDate: Date,

  // Assignment history
  assignmentHistory: [{
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    startDate: Date,
    endDate: Date,
    reason: String,
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }],

  // Location tracking (if GPS enabled)
  hasGPS: {
    type: Boolean,
    default: false
  },
  gpsDeviceId: String,
  lastKnownLocation: {
    latitude: Number,
    longitude: Number,
    timestamp: Date
  },

  // Maintenance
  maintenanceRecords: [maintenanceRecordSchema],
  lastServiceDate: Date,
  lastServiceOdometer: Number,
  nextServiceDue: Date,
  nextServiceOdometer: Number,

  // Fuel
  fuelCardNumber: String,
  averageFuelConsumption: Number, // km per liter
  totalFuelCost: {
    type: Number,
    default: 0
  },

  // Documents
  documents: [{
    name: String,
    type: {
      type: String,
      enum: ['registration', 'insurance', 'inspection', 'other']
    },
    url: String,
    expiryDate: Date,
    uploadedAt: { type: Date, default: Date.now }
  }],

  // Cost tracking
  totalMaintenanceCost: {
    type: Number,
    default: 0
  },
  yearlyBudget: {
    type: Number,
    default: 0
  },

  // Department assignment
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department'
  },
  branch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch'
  },

  // Notes
  notes: String,

  // Firm reference (multi-tenant)
  firmId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Firm',
    required: true,
    index: true
   },


    // For solo lawyers (no firm) - enables row-level security
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
  // Metadata
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Compound indexes
vehicleSchema.index({ firmId: 1, plateNumber: 1 }, { unique: true });
vehicleSchema.index({ firmId: 1, status: 1 });
vehicleSchema.index({ firmId: 1, assignedTo: 1 });

// Generate vehicle ID before saving
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

  // Calculate total maintenance cost
  if (this.maintenanceRecords && this.maintenanceRecords.length > 0) {
    this.totalMaintenanceCost = this.maintenanceRecords.reduce((sum, r) => sum + (r.cost || 0), 0);
  }

  next();
});

// Virtual for display name
vehicleSchema.virtual('displayName').get(function() {
  return `${this.make} ${this.model} (${this.plateNumber})`;
});

// Virtual for days until registration expiry
vehicleSchema.virtual('daysUntilRegistrationExpiry').get(function() {
  if (!this.registrationExpiry) return null;
  const now = new Date();
  const diffTime = this.registrationExpiry - now;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for days until insurance expiry
vehicleSchema.virtual('daysUntilInsuranceExpiry').get(function() {
  if (!this.insuranceExpiry) return null;
  const now = new Date();
  const diffTime = this.insuranceExpiry - now;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Methods
vehicleSchema.methods.assignToEmployee = async function(employeeId, assignmentType, userId, endDate = null) {
  // Save current assignment to history
  if (this.assignedTo) {
    this.assignmentHistory.push({
      employee: this.assignedTo,
      startDate: this.assignmentDate,
      endDate: new Date(),
      reason: 'Reassignment',
      assignedBy: userId
    });
  }

  this.assignedTo = employeeId;
  this.assignmentDate = new Date();
  this.assignmentType = assignmentType;
  this.assignmentEndDate = endDate;
  this.status = 'assigned';
  this.updatedBy = userId;

  return this.save();
};

vehicleSchema.methods.unassign = async function(userId, reason = 'Released') {
  if (this.assignedTo) {
    this.assignmentHistory.push({
      employee: this.assignedTo,
      startDate: this.assignmentDate,
      endDate: new Date(),
      reason,
      assignedBy: userId
    });
  }

  this.assignedTo = null;
  this.assignmentDate = null;
  this.assignmentEndDate = null;
  this.status = 'available';
  this.updatedBy = userId;

  return this.save();
};

vehicleSchema.methods.addMaintenanceRecord = async function(record, userId) {
  record.createdBy = userId;
  this.maintenanceRecords.push(record);

  this.lastServiceDate = record.date;
  this.lastServiceOdometer = record.odometer;
  if (record.nextServiceDue) {
    this.nextServiceDue = record.nextServiceDue;
  }
  if (record.nextServiceOdometer) {
    this.nextServiceOdometer = record.nextServiceOdometer;
  }

  this.updatedBy = userId;
  return this.save();
};

vehicleSchema.methods.updateOdometer = async function(odometer, userId) {
  if (odometer < this.currentOdometer) {
    throw new Error('New odometer reading cannot be less than current reading');
  }
  this.currentOdometer = odometer;
  this.updatedBy = userId;
  return this.save();
};

// Statics
vehicleSchema.statics.getAvailableVehicles = function(firmId) {
  return this.find({
    firmId,
    status: 'available'
  }).sort({ make: 1, model: 1 });
};

vehicleSchema.statics.getAssignedVehicles = function(firmId) {
  return this.find({
    firmId,
    status: 'assigned'
  })
    .populate('assignedTo', 'employeeId firstName lastName')
    .sort({ make: 1, model: 1 });
};

vehicleSchema.statics.getEmployeeVehicle = function(firmId, employeeId) {
  return this.findOne({
    firmId,
    assignedTo: employeeId,
    status: 'assigned'
  });
};

vehicleSchema.statics.getExpiringRegistrations = function(firmId, daysThreshold = 30) {
  const now = new Date();
  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);

  return this.find({
    firmId,
    status: { $ne: 'sold' },
    registrationExpiry: { $gte: now, $lte: thresholdDate }
  }).sort({ registrationExpiry: 1 });
};

vehicleSchema.statics.getExpiringInsurance = function(firmId, daysThreshold = 30) {
  const now = new Date();
  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);

  return this.find({
    firmId,
    status: { $ne: 'sold' },
    insuranceExpiry: { $gte: now, $lte: thresholdDate }
  }).sort({ insuranceExpiry: 1 });
};

vehicleSchema.statics.getMaintenanceDue = function(firmId) {
  const now = new Date();
  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() + 14); // 2 weeks

  return this.find({
    firmId,
    status: { $nin: ['sold', 'out_of_service'] },
    $or: [
      { nextServiceDue: { $lte: thresholdDate } },
      { nextServiceOdometer: { $lte: '$currentOdometer' } }
    ]
  }).sort({ nextServiceDue: 1 });
};

vehicleSchema.statics.getFleetSummary = async function(firmId) {
  const result = await this.aggregate([
    { $match: { firmId: mongoose.Types.ObjectId(firmId), status: { $ne: 'sold' } } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  const byType = await this.aggregate([
    { $match: { firmId: mongoose.Types.ObjectId(firmId), status: { $ne: 'sold' } } },
    {
      $group: {
        _id: '$vehicleType',
        count: { $sum: 1 }
      }
    }
  ]);

  const costs = await this.aggregate([
    { $match: { firmId: mongoose.Types.ObjectId(firmId) } },
    {
      $group: {
        _id: null,
        totalMaintenanceCost: { $sum: '$totalMaintenanceCost' },
        totalFuelCost: { $sum: '$totalFuelCost' },
        totalVehicles: { $sum: 1 }
      }
    }
  ]);

  return {
    byStatus: result,
    byType,
    costs: costs[0] || { totalMaintenanceCost: 0, totalFuelCost: 0, totalVehicles: 0 }
  };
};

vehicleSchema.set('toJSON', { virtuals: true });
vehicleSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Vehicle', vehicleSchema);
