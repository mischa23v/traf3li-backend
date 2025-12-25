const mongoose = require('mongoose');
const logger = require('../utils/logger');

/**
 * Custom Field Model - Field Definitions
 *
 * Allows extending entities dynamically with custom fields.
 * Supports various field types, validation, dependencies, and conditional logic.
 */

const customFieldSchema = new mongoose.Schema({
    // ═══════════════════════════════════════════════════════════════
    // FIRM (Multi-Tenancy)
    // ═══════════════════════════════════════════════════════════════
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        required: true,
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // FIELD DEFINITION
    // ═══════════════════════════════════════════════════════════════

    // Field name (English)
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },

    // Field name (Arabic)
    nameAr: {
        type: String,
        trim: true,
        maxlength: 100
    },

    // Field key (slug, unique within entity type and firm)
    // Auto-generated from name if not provided
    fieldKey: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
        match: /^[a-z0-9_]+$/,
        maxlength: 50
    },

    // Field description
    description: {
        type: String,
        trim: true,
        maxlength: 500
    },

    // Entity type this field applies to
    entityType: {
        type: String,
        required: true,
        enum: ['client', 'case', 'invoice', 'contact', 'lead', 'deal', 'task', 'project', 'document', 'expense', 'bill', 'payment'],
        index: true
    },

    // Field type
    fieldType: {
        type: String,
        required: true,
        enum: [
            'text',           // Short text input
            'textarea',       // Long text input
            'number',         // Numeric input
            'decimal',        // Decimal number
            'date',           // Date picker
            'datetime',       // Date and time picker
            'boolean',        // Checkbox/toggle
            'select',         // Single select dropdown
            'multiselect',    // Multiple select
            'email',          // Email input
            'phone',          // Phone number input
            'url',            // URL input
            'currency',       // Currency input
            'file',           // File upload
            'user',           // User reference
            'client',         // Client reference
            'case',           // Case reference
            'contact'         // Contact reference
        ]
    },

    // Options for select/multiselect types
    options: [{
        label: {
            type: String,
            required: true,
            trim: true
        },
        labelAr: String,
        value: {
            type: String,
            required: true,
            trim: true
        },
        color: String,      // For visual distinction
        order: Number,
        isActive: {
            type: Boolean,
            default: true
        }
    }],

    // Default value (type varies based on fieldType)
    defaultValue: mongoose.Schema.Types.Mixed,

    // ═══════════════════════════════════════════════════════════════
    // VALIDATION
    // ═══════════════════════════════════════════════════════════════

    // Is this field required?
    isRequired: {
        type: Boolean,
        default: false
    },

    // Is this field unique within the entity type?
    isUnique: {
        type: Boolean,
        default: false
    },

    // Validation rules
    validation: {
        // Minimum value (for number/decimal)
        min: Number,

        // Maximum value (for number/decimal)
        max: Number,

        // Minimum length (for text/textarea)
        minLength: Number,

        // Maximum length (for text/textarea)
        maxLength: Number,

        // Pattern (regex for text validation)
        pattern: String,

        // Custom validation message
        message: String,

        // Min date (for date/datetime fields)
        minDate: Date,

        // Max date (for date/datetime fields)
        maxDate: Date,

        // Allowed file types (for file field)
        allowedFileTypes: [String],

        // Max file size in bytes (for file field)
        maxFileSize: Number
    },

    // ═══════════════════════════════════════════════════════════════
    // CONDITIONAL LOGIC & DEPENDENCIES
    // ═══════════════════════════════════════════════════════════════

    // Dependencies - show this field only if conditions are met
    dependencies: [{
        // Field key that this field depends on
        fieldKey: {
            type: String,
            required: true
        },

        // Operator (equals, not_equals, contains, greater_than, etc.)
        operator: {
            type: String,
            enum: ['equals', 'not_equals', 'contains', 'not_contains', 'greater_than', 'less_than', 'is_empty', 'is_not_empty'],
            default: 'equals'
        },

        // Value to compare against
        value: mongoose.Schema.Types.Mixed
    }],

    // Conditional validation - apply validation only if conditions are met
    conditionalValidation: [{
        // Condition to check
        condition: {
            fieldKey: String,
            operator: String,
            value: mongoose.Schema.Types.Mixed
        },

        // Validation to apply if condition is met
        validation: {
            isRequired: Boolean,
            min: Number,
            max: Number,
            pattern: String,
            message: String
        }
    }],

    // ═══════════════════════════════════════════════════════════════
    // DISPLAY & BEHAVIOR
    // ═══════════════════════════════════════════════════════════════

    // Is this field searchable?
    isSearchable: {
        type: Boolean,
        default: false
    },

    // Is this field filterable in list views?
    isFilterable: {
        type: Boolean,
        default: false
    },

    // Show in list views (tables)?
    showInList: {
        type: Boolean,
        default: false
    },

    // Show in detail views?
    showInDetail: {
        type: Boolean,
        default: true
    },

    // Show in create form?
    showInCreate: {
        type: Boolean,
        default: true
    },

    // Show in edit form?
    showInEdit: {
        type: Boolean,
        default: true
    },

    // Display order (lower numbers appear first)
    order: {
        type: Number,
        default: 0
    },

    // Field group/section (for organizing fields)
    group: {
        type: String,
        trim: true,
        default: 'custom_fields'
    },

    // Placeholder text
    placeholder: String,
    placeholderAr: String,

    // Help text
    helpText: String,
    helpTextAr: String,

    // ═══════════════════════════════════════════════════════════════
    // FORMULA & COMPUTATION
    // ═══════════════════════════════════════════════════════════════

    // Is this field computed/calculated?
    isComputed: {
        type: Boolean,
        default: false
    },

    // Formula for computed fields (simple expressions)
    // Example: "{field1} + {field2}" or "SUM({items.*.price})"
    formula: String,

    // ═══════════════════════════════════════════════════════════════
    // STATUS & METADATA
    // ═══════════════════════════════════════════════════════════════

    // Is this field active?
    isActive: {
        type: Boolean,
        default: true
    },

    // Is this a system field (cannot be deleted)?
    isSystem: {
        type: Boolean,
        default: false
    },

    // Created by
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },

    // Updated by
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true,
    versionKey: false
});

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════

// Compound unique index: fieldKey must be unique within entity type and firm
customFieldSchema.index({ firmId: 1, entityType: 1, fieldKey: 1 }, { unique: true });

// Query optimization indexes
customFieldSchema.index({ firmId: 1, entityType: 1, isActive: 1 });
customFieldSchema.index({ firmId: 1, entityType: 1, order: 1 });
customFieldSchema.index({ firmId: 1, entityType: 1, isSearchable: 1 });
customFieldSchema.index({ firmId: 1, entityType: 1, isFilterable: 1 });

// ═══════════════════════════════════════════════════════════════
// MIDDLEWARE HOOKS
// ═══════════════════════════════════════════════════════════════

/**
 * Generate fieldKey from name if not provided
 */
customFieldSchema.pre('save', function(next) {
    if (!this.fieldKey && this.name) {
        // Generate slug: "Field Name" -> "field_name"
        this.fieldKey = this.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_|_$/g, '');
    }
    next();
});

/**
 * Validate options for select/multiselect fields
 */
customFieldSchema.pre('save', function(next) {
    if (['select', 'multiselect'].includes(this.fieldType)) {
        if (!this.options || this.options.length === 0) {
            return next(new Error('Select and multiselect fields must have at least one option'));
        }
    }
    next();
});

/**
 * Validate dependencies
 */
customFieldSchema.pre('save', async function(next) {
    if (this.dependencies && this.dependencies.length > 0) {
        // Validate that dependent fields exist
        for (const dep of this.dependencies) {
            const dependentField = await this.constructor.findOne({
                firmId: this.firmId,
                entityType: this.entityType,
                fieldKey: dep.fieldKey,
                isActive: true
            });

            if (!dependentField) {
                return next(new Error(`Dependent field "${dep.fieldKey}" not found`));
            }
        }
    }
    next();
});

/**
 * Cascade delete field values when field is deleted
 */
customFieldSchema.post('findOneAndDelete', async function(doc) {
    if (doc) {
        try {
            const CustomFieldValue = mongoose.model('CustomFieldValue');
            await CustomFieldValue.deleteMany({ fieldId: doc._id });
            logger.info(`Deleted custom field values for field ${doc._id}`);
        } catch (error) {
            logger.error('Error deleting custom field values:', error);
        }
    }
});

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Get active fields for entity type
 * @param {String} entityType - Entity type
 * @param {String} firmId - Firm ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>} - Custom fields
 */
customFieldSchema.statics.getFieldsForEntity = async function(entityType, firmId, options = {}) {
    const query = {
        firmId: new mongoose.Types.ObjectId(firmId),
        entityType,
        isActive: true
    };

    if (options.showInList !== undefined) {
        query.showInList = options.showInList;
    }

    if (options.showInDetail !== undefined) {
        query.showInDetail = options.showInDetail;
    }

    return await this.find(query).sort({ order: 1, createdAt: 1 }).lean();
};

/**
 * Get searchable fields for entity type
 * @param {String} entityType - Entity type
 * @param {String} firmId - Firm ID
 * @returns {Promise<Array>} - Searchable custom fields
 */
customFieldSchema.statics.getSearchableFields = async function(entityType, firmId) {
    return await this.find({
        firmId: new mongoose.Types.ObjectId(firmId),
        entityType,
        isActive: true,
        isSearchable: true
    }).sort({ order: 1 }).lean();
};

/**
 * Get filterable fields for entity type
 * @param {String} entityType - Entity type
 * @param {String} firmId - Firm ID
 * @returns {Promise<Array>} - Filterable custom fields
 */
customFieldSchema.statics.getFilterableFields = async function(entityType, firmId) {
    return await this.find({
        firmId: new mongoose.Types.ObjectId(firmId),
        entityType,
        isActive: true,
        isFilterable: true
    }).sort({ order: 1 }).lean();
};

/**
 * Validate field key uniqueness
 * @param {String} fieldKey - Field key
 * @param {String} entityType - Entity type
 * @param {String} firmId - Firm ID
 * @param {String} excludeId - Exclude this ID from check (for updates)
 * @returns {Promise<Boolean>} - True if unique, false otherwise
 */
customFieldSchema.statics.isFieldKeyUnique = async function(fieldKey, entityType, firmId, excludeId = null) {
    const query = {
        firmId: new mongoose.Types.ObjectId(firmId),
        entityType,
        fieldKey
    };

    if (excludeId) {
        query._id = { $ne: new mongoose.Types.ObjectId(excludeId) };
    }

    const existing = await this.findOne(query);
    return !existing;
};

// ═══════════════════════════════════════════════════════════════
// INSTANCE METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Validate a value against field definition
 * @param {*} value - Value to validate
 * @returns {Object} - { valid: Boolean, error: String }
 */
customFieldSchema.methods.validateValue = function(value) {
    // Check required
    if (this.isRequired && (value === null || value === undefined || value === '')) {
        return {
            valid: false,
            error: this.validation?.message || `${this.name} is required`
        };
    }

    // If value is empty and not required, it's valid
    if (value === null || value === undefined || value === '') {
        return { valid: true };
    }

    // Type-specific validation
    switch (this.fieldType) {
        case 'number':
        case 'decimal':
            if (isNaN(value)) {
                return { valid: false, error: `${this.name} must be a number` };
            }
            if (this.validation?.min !== undefined && value < this.validation.min) {
                return { valid: false, error: `${this.name} must be at least ${this.validation.min}` };
            }
            if (this.validation?.max !== undefined && value > this.validation.max) {
                return { valid: false, error: `${this.name} must be at most ${this.validation.max}` };
            }
            break;

        case 'text':
        case 'textarea':
            if (typeof value !== 'string') {
                return { valid: false, error: `${this.name} must be a string` };
            }
            if (this.validation?.minLength && value.length < this.validation.minLength) {
                return { valid: false, error: `${this.name} must be at least ${this.validation.minLength} characters` };
            }
            if (this.validation?.maxLength && value.length > this.validation.maxLength) {
                return { valid: false, error: `${this.name} must be at most ${this.validation.maxLength} characters` };
            }
            if (this.validation?.pattern) {
                const regex = new RegExp(this.validation.pattern);
                if (!regex.test(value)) {
                    return { valid: false, error: this.validation.message || `${this.name} format is invalid` };
                }
            }
            break;

        case 'email':
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
                return { valid: false, error: `${this.name} must be a valid email` };
            }
            break;

        case 'url':
            try {
                new URL(value);
            } catch (e) {
                return { valid: false, error: `${this.name} must be a valid URL` };
            }
            break;

        case 'date':
        case 'datetime':
            const date = new Date(value);
            if (isNaN(date.getTime())) {
                return { valid: false, error: `${this.name} must be a valid date` };
            }
            if (this.validation?.minDate && date < new Date(this.validation.minDate)) {
                return { valid: false, error: `${this.name} must be after ${this.validation.minDate}` };
            }
            if (this.validation?.maxDate && date > new Date(this.validation.maxDate)) {
                return { valid: false, error: `${this.name} must be before ${this.validation.maxDate}` };
            }
            break;

        case 'select':
            const validValues = this.options.filter(opt => opt.isActive).map(opt => opt.value);
            if (!validValues.includes(value)) {
                return { valid: false, error: `${this.name} must be one of the allowed options` };
            }
            break;

        case 'multiselect':
            if (!Array.isArray(value)) {
                return { valid: false, error: `${this.name} must be an array` };
            }
            const validMultiValues = this.options.filter(opt => opt.isActive).map(opt => opt.value);
            const invalidValues = value.filter(v => !validMultiValues.includes(v));
            if (invalidValues.length > 0) {
                return { valid: false, error: `${this.name} contains invalid options: ${invalidValues.join(', ')}` };
            }
            break;

        case 'boolean':
            if (typeof value !== 'boolean') {
                return { valid: false, error: `${this.name} must be true or false` };
            }
            break;
    }

    return { valid: true };
};

// ═══════════════════════════════════════════════════════════════
// FIRM ISOLATION PLUGIN
// ═══════════════════════════════════════════════════════════════
const firmIsolationPlugin = require('./plugins/firmIsolation.plugin');
customFieldSchema.plugin(firmIsolationPlugin);

module.exports = mongoose.model('CustomField', customFieldSchema);
