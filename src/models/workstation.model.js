const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * Workstation Model
 * Represents a physical or logical location where manufacturing operations are performed.
 * Tracks capacity, costs, and scheduling information.
 */

// ============ SUB-SCHEMAS ============

const OperatingCostsSchema = new Schema({
    hourRate: {
        type: Number,
        default: 0,
        min: 0
    },
    electricityCost: {
        type: Number,
        default: 0,
        min: 0
    },
    consumableCost: {
        type: Number,
        default: 0,
        min: 0
    },
    rentCost: {
        type: Number,
        default: 0,
        min: 0
    }
}, { _id: false });

const WorkingHoursSchema = new Schema({
    start: {
        type: String,
        default: '08:00'
    },
    end: {
        type: String,
        default: '17:00'
    }
}, { _id: false });

// ============ MAIN WORKSTATION SCHEMA ============

const workstationSchema = new Schema({
    // ═══════════════════════════════════════════════════════════════
    // FIRM (Multi-Tenancy)
    // ═══════════════════════════════════════════════════════════════
    firmId: {
        type: Schema.Types.ObjectId,
        ref: 'Firm',
        index: true,
        required: false
    },,


    // For solo lawyers (no firm) - enables row-level security
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    // Auto-generated Workstation ID (Format: WS-YYYYMMDD-XXXX)
    workstationId: {
        type: String,
        unique: true,
        sparse: true,
        index: true
    },

    // Workstation name
    name: {
        type: String,
        required: true,
        trim: true
    },
    nameAr: {
        type: String,
        trim: true
    },

    description: {
        type: String,
        maxlength: 1000
    },

    // Capacity and type
    productionCapacity: {
        type: Number,
        default: 1,
        min: 0,
        comment: 'Units per hour or per day'
    },
    workstationType: {
        type: String,
        enum: ['manual', 'semi_automatic', 'automatic', 'assembly', 'quality_control', 'packaging'],
        default: 'manual'
    },

    // Operating costs
    operatingCosts: OperatingCostsSchema,

    // Working hours
    workingHours: WorkingHoursSchema,

    // Holiday list reference
    holidayList: {
        type: Schema.Types.ObjectId,
        ref: 'HolidayList'
    },

    // Location
    location: {
        type: String,
        trim: true
    },

    // Status
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },

    // Ownership
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    updatedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    }

}, {
    timestamps: true,
    versionKey: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// ============ INDEXES ============
workstationSchema.index({ firmId: 1, isActive: 1 });
workstationSchema.index({ workstationId: 1 });
workstationSchema.index({ name: 1 });

// ============ VIRTUALS ============

// Total operating cost per hour
workstationSchema.virtual('totalOperatingCostPerHour').get(function() {
    if (!this.operatingCosts) return 0;
    return (this.operatingCosts.hourRate || 0) +
           (this.operatingCosts.electricityCost || 0) +
           (this.operatingCosts.consumableCost || 0) +
           (this.operatingCosts.rentCost || 0);
});

// Working hours per day
workstationSchema.virtual('workingHoursPerDay').get(function() {
    if (!this.workingHours || !this.workingHours.start || !this.workingHours.end) return 8;

    const start = this.workingHours.start.split(':');
    const end = this.workingHours.end.split(':');

    const startMinutes = parseInt(start[0]) * 60 + parseInt(start[1]);
    const endMinutes = parseInt(end[0]) * 60 + parseInt(end[1]);

    return (endMinutes - startMinutes) / 60;
});

// ============ PRE-SAVE MIDDLEWARE ============

workstationSchema.pre('save', async function(next) {
    // Auto-generate Workstation ID if not provided
    if (this.isNew && !this.workstationId) {
        const Counter = require('./counter.model');
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');

        const counterId = this.firmId
            ? `workstation_${this.firmId}_${year}${month}${day}`
            : `workstation_global_${year}${month}${day}`;

        const seq = await Counter.getNextSequence(counterId);
        this.workstationId = `WS-${year}${month}${day}-${String(seq).padStart(4, '0')}`;
    }

    next();
});

// ============ STATIC METHODS ============

/**
 * Get active workstations
 */
workstationSchema.statics.getActiveWorkstations = function(firmId = null) {
    const query = { isActive: true };
    if (firmId) query.firmId = firmId;

    return this.find(query).sort({ name: 1 });
};

/**
 * Get workstation capacity
 */
workstationSchema.statics.getWorkstationCapacity = async function(workstationId, date) {
    const workstation = await this.findById(workstationId);
    if (!workstation) throw new Error('Workstation not found');

    // Calculate available hours for the date
    // This is a simplified version - in production you'd check holidays, schedules, etc.
    const availableHours = workstation.workingHoursPerDay;
    const capacityPerHour = workstation.productionCapacity || 1;

    return {
        workstationId: workstation.workstationId,
        name: workstation.name,
        date,
        availableHours,
        totalCapacity: availableHours * capacityPerHour,
        operatingCostPerHour: workstation.totalOperatingCostPerHour
    };
};

module.exports = mongoose.model('Workstation', workstationSchema);
