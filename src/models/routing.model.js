const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * Routing Model
 * Defines a template of manufacturing operations and their sequence.
 * Can be reused across multiple BOMs for similar manufacturing processes.
 */

// ============ SUB-SCHEMAS ============

const RoutingOperationSchema = new Schema({
    sequence: {
        type: Number,
        required: true,
        min: 0
    },
    operation: {
        type: String,
        required: true,
        trim: true
    },
    operationAr: {
        type: String,
        trim: true
    },
    workstation: {
        type: Schema.Types.ObjectId,
        ref: 'Workstation'
    },
    timeInMins: {
        type: Number,
        default: 0,
        min: 0,
        comment: 'Standard time in minutes'
    },
    operatingCost: {
        type: Number,
        default: 0,
        min: 0
    },
    description: {
        type: String,
        maxlength: 500
    }
}, { _id: true });

// ============ MAIN ROUTING SCHEMA ============

const routingSchema = new Schema({
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
    // Auto-generated Routing ID
    routingId: {
        type: String,
        unique: true,
        sparse: true,
        index: true
    },

    // Routing name
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

    // Operations sequence
    operations: [RoutingOperationSchema],

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
routingSchema.index({ firmId: 1, isActive: 1 });
routingSchema.index({ routingId: 1 });
routingSchema.index({ name: 1 });

// ============ VIRTUALS ============

// Total standard time
routingSchema.virtual('totalTime').get(function() {
    if (!this.operations || this.operations.length === 0) return 0;
    return this.operations.reduce((sum, op) => sum + (op.timeInMins || 0), 0);
});

// Total operating cost
routingSchema.virtual('totalCost').get(function() {
    if (!this.operations || this.operations.length === 0) return 0;
    return this.operations.reduce((sum, op) => sum + (op.operatingCost || 0), 0);
});

// Number of operations
routingSchema.virtual('operationCount').get(function() {
    return this.operations ? this.operations.length : 0;
});

// ============ PRE-SAVE MIDDLEWARE ============

routingSchema.pre('save', async function(next) {
    // Auto-generate Routing ID if not provided
    if (this.isNew && !this.routingId) {
        const Counter = require('./counter.model');
        const date = new Date();
        const year = date.getFullYear();

        const counterId = this.firmId
            ? `routing_${this.firmId}_${year}`
            : `routing_global_${year}`;

        const seq = await Counter.getNextSequence(counterId);
        this.routingId = `RTG-${year}-${String(seq).padStart(4, '0')}`;
    }

    // Sort operations by sequence
    if (this.operations && this.operations.length > 0) {
        this.operations.sort((a, b) => (a.sequence || 0) - (b.sequence || 0));
    }

    next();
});

// ============ STATIC METHODS ============

/**
 * Get active routings
 */
routingSchema.statics.getActiveRoutings = function(firmId = null) {
    const query = { isActive: true };
    if (firmId) query.firmId = firmId;

    return this.find(query)
        .populate('operations.workstation', 'name nameAr workstationId')
        .sort({ name: 1 });
};

/**
 * Clone routing
 */
routingSchema.statics.cloneRouting = async function(routingId, newName = null) {
    const routing = await this.findById(routingId);
    if (!routing) throw new Error('Routing not found');

    const cloned = new this({
        firmId: routing.firmId,
        name: newName || `${routing.name} (Copy)`,
        nameAr: routing.nameAr ? `${routing.nameAr} (نسخة)` : null,
        description: routing.description,
        operations: routing.operations.map(op => ({
            sequence: op.sequence,
            operation: op.operation,
            operationAr: op.operationAr,
            workstation: op.workstation,
            timeInMins: op.timeInMins,
            operatingCost: op.operatingCost,
            description: op.description
        })),
        isActive: true,
        createdBy: routing.createdBy
    });

    return cloned;
};

// ============ INSTANCE METHODS ============

/**
 * Add operation to routing
 */
routingSchema.methods.addOperation = async function(operationData) {
    // Calculate next sequence number
    const maxSequence = this.operations.reduce((max, op) =>
        Math.max(max, op.sequence || 0), 0
    );

    this.operations.push({
        ...operationData,
        sequence: operationData.sequence || maxSequence + 10
    });

    await this.save();
    return this;
};

/**
 * Remove operation from routing
 */
routingSchema.methods.removeOperation = async function(operationId) {
    this.operations = this.operations.filter(op =>
        op._id.toString() !== operationId.toString()
    );

    await this.save();
    return this;
};

/**
 * Reorder operations
 */
routingSchema.methods.reorderOperations = async function(operationSequences) {
    // operationSequences should be an array of { operationId, sequence }
    operationSequences.forEach(({ operationId, sequence }) => {
        const operation = this.operations.find(op =>
            op._id.toString() === operationId.toString()
        );
        if (operation) {
            operation.sequence = sequence;
        }
    });

    await this.save();
    return this;
};

module.exports = mongoose.model('Routing', routingSchema);
