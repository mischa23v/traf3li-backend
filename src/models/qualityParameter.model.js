const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * Quality Parameter Model
 *
 * Master list of quality parameters that can be used
 * across multiple templates. Provides standardization
 * for quality control measurements.
 */

const qualityParameterSchema = new Schema({
    // ============ IDENTIFIERS ============
    parameterId: {
        type: String,
        unique: true,
        sparse: true,
        index: true
    },

    // ============ PARAMETER INFO ============
    name: {
        type: String,
        required: true,
        index: true
    },
    nameAr: String,
    description: String,

    // ============ PARAMETER TYPE ============
    parameterType: {
        type: String,
        enum: ['numeric', 'text', 'boolean'],
        required: true,
        default: 'numeric'
    },

    // ============ VALUE CONSTRAINTS ============
    minValue: {
        type: Number
    },
    maxValue: {
        type: Number
    },
    defaultValue: Schema.Types.Mixed, // Can be number, string, or boolean

    // ============ UNIT OF MEASUREMENT ============
    uom: {
        type: String // e.g., 'mm', 'kg', '%', 'ppm'
    },

    // ============ STATUS ============
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },

    // ============ MULTI-TENANCY ============
    firmId: {
        type: Schema.Types.ObjectId,
        ref: 'Firm',
        required: false,
        index: true
    },,


    // For solo lawyers (no firm) - enables row-level security
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    // ============ AUDIT ============
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
qualityParameterSchema.index({ firmId: 1, isActive: 1 });
qualityParameterSchema.index({ firmId: 1, name: 1 });
qualityParameterSchema.index({ parameterType: 1 });

// ============ VIRTUALS ============
qualityParameterSchema.virtual('hasConstraints').get(function() {
    return this.minValue !== undefined || this.maxValue !== undefined;
});

qualityParameterSchema.virtual('displayName').get(function() {
    if (this.uom) {
        return `${this.name} (${this.uom})`;
    }
    return this.name;
});

// ============ PRE-SAVE MIDDLEWARE ============
qualityParameterSchema.pre('save', async function(next) {
    // Auto-generate parameter ID if not provided
    if (this.isNew && !this.parameterId) {
        const Counter = require('./counter.model');

        // Create counter ID: quality_parameter_{firmId}
        const counterId = this.firmId
            ? `quality_parameter_${this.firmId}`
            : `quality_parameter_global`;

        const seq = await Counter.getNextSequence(counterId);
        this.parameterId = `QP-${String(seq).padStart(6, '0')}`;
    }

    // Validate min/max values for numeric parameters
    if (this.parameterType === 'numeric' && this.minValue !== undefined && this.maxValue !== undefined) {
        if (this.minValue > this.maxValue) {
            return next(new Error('minValue cannot be greater than maxValue'));
        }
    }

    next();
});

// ============ STATIC METHODS ============
qualityParameterSchema.statics.getActiveParameters = async function(firmId, parameterType = null) {
    const query = { isActive: true };

    if (firmId) {
        query.firmId = firmId;
    }

    if (parameterType) {
        query.parameterType = parameterType;
    }

    return this.find(query).sort({ name: 1 });
};

qualityParameterSchema.statics.findByName = async function(firmId, name) {
    const query = { name, isActive: true };

    if (firmId) {
        query.firmId = firmId;
    }

    return this.findOne(query);
};

qualityParameterSchema.statics.getParametersByType = async function(firmId) {
    const query = { isActive: true };

    if (firmId) {
        query.firmId = firmId;
    }

    const parameters = await this.find(query);

    return {
        numeric: parameters.filter(p => p.parameterType === 'numeric'),
        text: parameters.filter(p => p.parameterType === 'text'),
        boolean: parameters.filter(p => p.parameterType === 'boolean')
    };
};

// ============ METHODS ============
qualityParameterSchema.methods.validateValue = function(value) {
    switch (this.parameterType) {
        case 'numeric':
            if (typeof value !== 'number') {
                return { valid: false, error: 'Value must be a number' };
            }
            if (this.minValue !== undefined && value < this.minValue) {
                return { valid: false, error: `Value must be at least ${this.minValue}` };
            }
            if (this.maxValue !== undefined && value > this.maxValue) {
                return { valid: false, error: `Value must not exceed ${this.maxValue}` };
            }
            return { valid: true };

        case 'boolean':
            if (typeof value !== 'boolean') {
                return { valid: false, error: 'Value must be a boolean' };
            }
            return { valid: true };

        case 'text':
            if (typeof value !== 'string') {
                return { valid: false, error: 'Value must be a string' };
            }
            return { valid: true };

        default:
            return { valid: true };
    }
};

module.exports = mongoose.model('QualityParameter', qualityParameterSchema);
