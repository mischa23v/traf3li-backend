const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * Quality Template Model
 *
 * Defines reusable quality inspection templates with parameters
 * and acceptance criteria. Can be item-specific or generic.
 */

// ============ PARAMETER SCHEMA ============
const ParameterSchema = new Schema({
    parameterName: {
        type: String,
        required: true
    },
    parameterNameAr: String,
    specification: String,
    acceptanceCriteria: String,
    minValue: Number,
    maxValue: Number,
    formula: String, // For calculated parameters
    mandatory: {
        type: Boolean,
        default: true
    }
}, { _id: true });

// ============ MAIN SCHEMA ============
const qualityTemplateSchema = new Schema({
    // ============ IDENTIFIERS ============
    templateId: {
        type: String,
        unique: true,
        sparse: true,
        index: true
    },

    // ============ TEMPLATE INFO ============
    name: {
        type: String,
        required: true
    },
    nameAr: String,
    description: String,

    // ============ ITEM ASSOCIATION ============
    // Optional - if null, it's a generic template
    itemId: {
        type: Schema.Types.ObjectId,
        ref: 'Item',
        index: true
    },
    itemGroup: String, // For group-level templates

    // ============ PARAMETERS ============
    parameters: [ParameterSchema],

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
qualityTemplateSchema.index({ firmId: 1, isActive: 1 });
qualityTemplateSchema.index({ firmId: 1, itemId: 1 });
qualityTemplateSchema.index({ name: 1 });

// ============ VIRTUALS ============
qualityTemplateSchema.virtual('parameterCount').get(function() {
    return this.parameters ? this.parameters.length : 0;
});

qualityTemplateSchema.virtual('mandatoryParameterCount').get(function() {
    if (!this.parameters || this.parameters.length === 0) return 0;
    return this.parameters.filter(p => p.mandatory).length;
});

// ============ PRE-SAVE MIDDLEWARE ============
qualityTemplateSchema.pre('save', async function(next) {
    // Auto-generate template ID if not provided
    if (this.isNew && !this.templateId) {
        const Counter = require('./counter.model');
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const dateStr = `${year}${month}${day}`;

        // Create counter ID: quality_template_{firmId}_{date}
        const counterId = this.firmId
            ? `quality_template_${this.firmId}_${dateStr}`
            : `quality_template_global_${dateStr}`;

        const seq = await Counter.getNextSequence(counterId);
        this.templateId = `QT-${dateStr}-${String(seq).padStart(4, '0')}`;
    }

    next();
});

// ============ STATIC METHODS ============
qualityTemplateSchema.statics.getActiveTemplates = async function(firmId, filters = {}) {
    const query = { isActive: true, ...filters };

    if (firmId) {
        query.firmId = firmId;
    }

    return this.find(query)
        .sort({ name: 1 })
        .populate('itemId', 'itemCode itemName');
};

qualityTemplateSchema.statics.getTemplateByItem = async function(firmId, itemId) {
    const query = { itemId, isActive: true };

    if (firmId) {
        query.firmId = firmId;
    }

    // First try to find item-specific template
    let template = await this.findOne(query);

    // If no item-specific template, look for generic template (no itemId)
    if (!template && firmId) {
        template = await this.findOne({
            firmId,
            itemId: null,
            isActive: true,
            isDefault: true
        });
    }

    return template;
};

qualityTemplateSchema.statics.duplicateTemplate = async function(templateId, newName, userId) {
    const original = await this.findById(templateId);

    if (!original) {
        throw new Error('Template not found');
    }

    const duplicate = new this({
        name: newName || `${original.name} (Copy)`,
        nameAr: original.nameAr,
        description: original.description,
        itemId: original.itemId,
        itemGroup: original.itemGroup,
        parameters: original.parameters.map(p => ({
            parameterName: p.parameterName,
            parameterNameAr: p.parameterNameAr,
            specification: p.specification,
            acceptanceCriteria: p.acceptanceCriteria,
            minValue: p.minValue,
            maxValue: p.maxValue,
            formula: p.formula,
            mandatory: p.mandatory
        })),
        isActive: true,
        firmId: original.firmId,
        createdBy: userId
    });

    await duplicate.save();
    return duplicate;
};

// ============ METHODS ============
qualityTemplateSchema.methods.addParameter = function(parameter) {
    this.parameters.push(parameter);
    return this.save();
};

qualityTemplateSchema.methods.removeParameter = function(parameterName) {
    this.parameters = this.parameters.filter(p => p.parameterName !== parameterName);
    return this.save();
};

qualityTemplateSchema.methods.updateParameter = function(parameterName, updates) {
    const param = this.parameters.find(p => p.parameterName === parameterName);
    if (param) {
        Object.assign(param, updates);
    }
    return this.save();
};

module.exports = mongoose.model('QualityTemplate', qualityTemplateSchema);
