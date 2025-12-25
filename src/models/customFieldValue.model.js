const mongoose = require('mongoose');

/**
 * Custom Field Value Model - Store Values
 *
 * Stores the actual values for custom fields on entities.
 * Uses a flexible schema to accommodate different value types.
 */

const customFieldValueSchema = new mongoose.Schema({
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
    // FIELD REFERENCE
    // ═══════════════════════════════════════════════════════════════

    // Reference to custom field definition
    fieldId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CustomField',
        required: true,
        index: true
    },

    // Entity type (for quick filtering without joining)
    entityType: {
        type: String,
        required: true,
        enum: ['client', 'case', 'invoice', 'contact', 'lead', 'deal', 'task', 'project', 'document', 'expense', 'bill', 'payment'],
        index: true
    },

    // Entity ID (the record this value belongs to)
    entityId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // VALUE STORAGE
    // ═══════════════════════════════════════════════════════════════

    // Actual value (type varies based on field type)
    // For simple types: string, number, boolean, date
    // For complex types: arrays, objects
    value: {
        type: mongoose.Schema.Types.Mixed,
        default: null
    },

    // Text representation (for search/indexing)
    valueText: {
        type: String,
        index: true
    },

    // Numeric representation (for filtering/sorting number fields)
    valueNumber: {
        type: Number,
        index: true,
        sparse: true
    },

    // Date representation (for filtering/sorting date fields)
    valueDate: {
        type: Date,
        index: true,
        sparse: true
    },

    // Boolean representation (for filtering boolean fields)
    valueBoolean: {
        type: Boolean,
        index: true,
        sparse: true
    },

    // Array representation (for multiselect fields)
    valueArray: [{
        type: String
    }],

    // Reference representation (for user/client/case reference fields)
    valueRef: {
        type: mongoose.Schema.Types.ObjectId,
        index: true,
        sparse: true
    },

    // ═══════════════════════════════════════════════════════════════
    // METADATA
    // ═══════════════════════════════════════════════════════════════

    // Last updated by
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },

    // Updated at
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true,
    versionKey: false
});

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════

// Compound unique index: one value per field per entity
customFieldValueSchema.index({ firmId: 1, fieldId: 1, entityId: 1 }, { unique: true });

// Query optimization indexes
customFieldValueSchema.index({ firmId: 1, entityType: 1, entityId: 1 });
customFieldValueSchema.index({ firmId: 1, entityType: 1, fieldId: 1 });
customFieldValueSchema.index({ firmId: 1, entityType: 1, valueText: 1 });

// Search indexes for different value types
customFieldValueSchema.index({ valueText: 'text' });

// ═══════════════════════════════════════════════════════════════
// MIDDLEWARE HOOKS
// ═══════════════════════════════════════════════════════════════

/**
 * Populate indexed value fields based on value type
 * This allows efficient querying on different value types
 */
customFieldValueSchema.pre('save', async function(next) {
    // Reset all indexed fields
    this.valueText = null;
    this.valueNumber = null;
    this.valueDate = null;
    this.valueBoolean = null;
    this.valueArray = [];
    this.valueRef = null;

    if (this.value === null || this.value === undefined) {
        return next();
    }

    // Get field definition to determine type
    const CustomField = mongoose.model('CustomField');
    const field = await CustomField.findById(this.fieldId).lean();

    if (!field) {
        return next(new Error('Custom field not found'));
    }

    // Populate appropriate indexed field based on field type
    switch (field.fieldType) {
        case 'text':
        case 'textarea':
        case 'email':
        case 'phone':
        case 'url':
        case 'select':
            this.valueText = String(this.value);
            break;

        case 'number':
        case 'decimal':
        case 'currency':
            this.valueNumber = Number(this.value);
            this.valueText = String(this.value);
            break;

        case 'date':
        case 'datetime':
            this.valueDate = new Date(this.value);
            this.valueText = this.valueDate.toISOString();
            break;

        case 'boolean':
            this.valueBoolean = Boolean(this.value);
            this.valueText = String(this.value);
            break;

        case 'multiselect':
            if (Array.isArray(this.value)) {
                this.valueArray = this.value;
                this.valueText = this.value.join(', ');
            }
            break;

        case 'user':
        case 'client':
        case 'case':
        case 'contact':
            if (mongoose.Types.ObjectId.isValid(this.value)) {
                this.valueRef = new mongoose.Types.ObjectId(this.value);
            }
            break;

        case 'file':
            // Store file URL/path as text
            if (typeof this.value === 'object' && this.value.url) {
                this.valueText = this.value.url;
            } else {
                this.valueText = String(this.value);
            }
            break;
    }

    next();
});

/**
 * Update timestamp
 */
customFieldValueSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Get all values for an entity
 * @param {String} entityType - Entity type
 * @param {String} entityId - Entity ID
 * @param {String} firmId - Firm ID
 * @returns {Promise<Array>} - Custom field values with field definitions
 */
customFieldValueSchema.statics.getValuesForEntity = async function(entityType, entityId, firmId) {
    return await this.find({
        firmId: new mongoose.Types.ObjectId(firmId),
        entityType,
        entityId: new mongoose.Types.ObjectId(entityId)
    })
        .populate('fieldId')
        .populate('updatedBy', 'firstName lastName email')
        .lean();
};

/**
 * Get all values for multiple entities (bulk operation)
 * @param {String} entityType - Entity type
 * @param {Array<String>} entityIds - Entity IDs
 * @param {String} firmId - Firm ID
 * @returns {Promise<Object>} - Map of entityId -> values
 */
customFieldValueSchema.statics.getBulkValues = async function(entityType, entityIds, firmId) {
    const values = await this.find({
        firmId: new mongoose.Types.ObjectId(firmId),
        entityType,
        entityId: { $in: entityIds.map(id => new mongoose.Types.ObjectId(id)) }
    })
        .populate('fieldId')
        .lean();

    // Group by entityId
    const grouped = {};
    for (const value of values) {
        const entityIdStr = value.entityId.toString();
        if (!grouped[entityIdStr]) {
            grouped[entityIdStr] = [];
        }
        grouped[entityIdStr].push(value);
    }

    return grouped;
};

/**
 * Set or update a value
 * @param {String} fieldId - Field ID
 * @param {String} entityId - Entity ID
 * @param {*} value - Value to set
 * @param {String} userId - User ID
 * @param {String} firmId - Firm ID
 * @param {String} entityType - Entity type
 * @returns {Promise<Object>} - Updated value
 */
customFieldValueSchema.statics.setValue = async function(fieldId, entityId, value, userId, firmId, entityType) {
    // Validate field exists and is active
    const CustomField = mongoose.model('CustomField');
    const field = await CustomField.findOne({
        _id: new mongoose.Types.ObjectId(fieldId),
        firmId: new mongoose.Types.ObjectId(firmId),
        entityType,
        isActive: true
    });

    if (!field) {
        throw new Error('Custom field not found or inactive');
    }

    // Validate value
    const validation = field.validateValue(value);
    if (!validation.valid) {
        throw new Error(validation.error);
    }

    // Upsert value
    const result = await this.findOneAndUpdate(
        {
            firmId: new mongoose.Types.ObjectId(firmId),
            fieldId: new mongoose.Types.ObjectId(fieldId),
            entityId: new mongoose.Types.ObjectId(entityId)
        },
        {
            $set: {
                value,
                entityType,
                updatedBy: new mongoose.Types.ObjectId(userId),
                updatedAt: new Date()
            },
            $setOnInsert: {
                firmId: new mongoose.Types.ObjectId(firmId),
                fieldId: new mongoose.Types.ObjectId(fieldId),
                entityId: new mongoose.Types.ObjectId(entityId),
                entityType
            }
        },
        {
            upsert: true,
            new: true,
            runValidators: true
        }
    );

    return result;
};

/**
 * Set multiple values for an entity
 * @param {String} entityType - Entity type
 * @param {String} entityId - Entity ID
 * @param {Object} fieldValues - Map of fieldKey -> value
 * @param {String} userId - User ID
 * @param {String} firmId - Firm ID
 * @returns {Promise<Array>} - Updated values
 */
customFieldValueSchema.statics.setMultipleValues = async function(entityType, entityId, fieldValues, userId, firmId) {
    const CustomField = mongoose.model('CustomField');

    // Get all fields for entity type
    const fields = await CustomField.find({
        firmId: new mongoose.Types.ObjectId(firmId),
        entityType,
        isActive: true
    }).lean();

    // Create field key -> field ID map
    const fieldKeyMap = {};
    for (const field of fields) {
        fieldKeyMap[field.fieldKey] = field;
    }

    const results = [];
    const errors = [];

    // Process each field value
    for (const [fieldKey, value] of Object.entries(fieldValues)) {
        const field = fieldKeyMap[fieldKey];

        if (!field) {
            errors.push({ fieldKey, error: 'Field not found' });
            continue;
        }

        try {
            const result = await this.setValue(
                field._id.toString(),
                entityId,
                value,
                userId,
                firmId,
                entityType
            );
            results.push(result);
        } catch (error) {
            errors.push({ fieldKey, error: error.message });
        }
    }

    return { results, errors };
};

/**
 * Delete all values for an entity
 * @param {String} entityType - Entity type
 * @param {String} entityId - Entity ID
 * @param {String} firmId - Firm ID
 * @returns {Promise<Number>} - Number of deleted values
 */
customFieldValueSchema.statics.deleteEntityValues = async function(entityType, entityId, firmId) {
    const result = await this.deleteMany({
        firmId: new mongoose.Types.ObjectId(firmId),
        entityType,
        entityId: new mongoose.Types.ObjectId(entityId)
    });

    return result.deletedCount;
};

/**
 * Search entities by custom field value
 * @param {String} fieldId - Field ID
 * @param {*} value - Value to search for
 * @param {String} firmId - Firm ID
 * @param {Object} options - Search options
 * @returns {Promise<Array>} - Entity IDs matching the search
 */
customFieldValueSchema.statics.searchByValue = async function(fieldId, value, firmId, options = {}) {
    const query = {
        firmId: new mongoose.Types.ObjectId(firmId),
        fieldId: new mongoose.Types.ObjectId(fieldId)
    };

    // Determine search strategy based on value type
    if (typeof value === 'string') {
        // Text search
        if (options.exact) {
            query.valueText = value;
        } else {
            query.valueText = { $regex: value, $options: 'i' };
        }
    } else if (typeof value === 'number') {
        // Numeric search
        query.valueNumber = value;
    } else if (typeof value === 'boolean') {
        // Boolean search
        query.valueBoolean = value;
    } else if (value instanceof Date) {
        // Date search
        query.valueDate = value;
    } else if (Array.isArray(value)) {
        // Array search (multiselect)
        query.valueArray = { $in: value };
    }

    const results = await this.find(query)
        .select('entityId entityType')
        .limit(options.limit || 100)
        .lean();

    return results.map(r => ({ entityId: r.entityId, entityType: r.entityType }));
};

/**
 * Bulk update values for multiple entities
 * @param {String} entityType - Entity type
 * @param {Array<String>} entityIds - Entity IDs
 * @param {String} fieldId - Field ID
 * @param {*} value - Value to set
 * @param {String} userId - User ID
 * @param {String} firmId - Firm ID
 * @returns {Promise<Object>} - Bulk operation results
 */
customFieldValueSchema.statics.bulkSetValue = async function(entityType, entityIds, fieldId, value, userId, firmId) {
    // Validate field
    const CustomField = mongoose.model('CustomField');
    const field = await CustomField.findOne({
        _id: new mongoose.Types.ObjectId(fieldId),
        firmId: new mongoose.Types.ObjectId(firmId),
        entityType,
        isActive: true
    });

    if (!field) {
        throw new Error('Custom field not found or inactive');
    }

    // Validate value
    const validation = field.validateValue(value);
    if (!validation.valid) {
        throw new Error(validation.error);
    }

    // Bulk upsert
    const bulkOps = entityIds.map(entityId => ({
        updateOne: {
            filter: {
                firmId: new mongoose.Types.ObjectId(firmId),
                fieldId: new mongoose.Types.ObjectId(fieldId),
                entityId: new mongoose.Types.ObjectId(entityId)
            },
            update: {
                $set: {
                    value,
                    entityType,
                    updatedBy: new mongoose.Types.ObjectId(userId),
                    updatedAt: new Date()
                },
                $setOnInsert: {
                    firmId: new mongoose.Types.ObjectId(firmId),
                    fieldId: new mongoose.Types.ObjectId(fieldId),
                    entityId: new mongoose.Types.ObjectId(entityId),
                    entityType
                }
            },
            upsert: true
        }
    }));

    const result = await this.bulkWrite(bulkOps);

    return {
        modified: result.modifiedCount,
        inserted: result.upsertedCount,
        total: entityIds.length
    };
};

// ═══════════════════════════════════════════════════════════════
// FIRM ISOLATION PLUGIN
// ═══════════════════════════════════════════════════════════════
const firmIsolationPlugin = require('./plugins/firmIsolation.plugin');
customFieldValueSchema.plugin(firmIsolationPlugin);

module.exports = mongoose.model('CustomFieldValue', customFieldValueSchema);
