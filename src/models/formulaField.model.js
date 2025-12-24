/**
 * Formula Field Model
 *
 * Stores calculated/formula fields for dynamic computed values.
 * Supports formulas that reference other fields, caching, and dependency tracking.
 */

const mongoose = require('mongoose');

// ═══════════════════════════════════════════════════════════════
// SUB-SCHEMAS
// ═══════════════════════════════════════════════════════════════

/**
 * Format Schema
 * Defines how to display the calculated value
 */
const formatSchema = new mongoose.Schema({
    decimals: {
        type: Number,
        min: 0,
        max: 10,
        default: 2
    },
    prefix: {
        type: String,
        trim: true,
        maxlength: 10
    },
    suffix: {
        type: String,
        trim: true,
        maxlength: 10
    },
    dateFormat: {
        type: String,
        trim: true,
        default: 'YYYY-MM-DD'
    }
}, { _id: false });

/**
 * Field Dependency Item Schema
 * Tracks individual field dependencies
 */
const dependencyItemSchema = new mongoose.Schema({
    fieldName: {
        type: String,
        required: true,
        trim: true
    },
    entityType: {
        type: String,
        required: true,
        trim: true
    },
    relationshipPath: {
        type: String,
        trim: true
    }
}, { _id: false });

/**
 * Used By Reference Schema
 * Tracks what uses this field
 */
const usedByReferenceSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['formula', 'validation', 'workflow', 'report'],
        required: true
    },
    referenceId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    referenceName: {
        type: String,
        trim: true
    }
}, { _id: false });

// ═══════════════════════════════════════════════════════════════
// FORMULA FIELD SCHEMA
// ═══════════════════════════════════════════════════════════════

const formulaFieldSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        index: true
    },

    entityType: {
        type: String,
        required: true,
        trim: true,
        index: true
    },

    formula: {
        type: String,
        required: true,
        trim: true
    },

    returnType: {
        type: String,
        enum: ['number', 'text', 'date', 'boolean', 'currency'],
        required: true,
        default: 'number'
    },

    dependencies: {
        type: [String],
        default: []
    },

    cacheEnabled: {
        type: Boolean,
        default: true
    },

    cacheInvalidateOn: {
        type: [String],
        default: []
    },

    format: {
        type: formatSchema,
        default: () => ({})
    },

    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        required: true,
        index: true
    },

    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    isActive: {
        type: Boolean,
        default: true,
        index: true
    },

    description: {
        type: String,
        trim: true
    }
}, {
    timestamps: true,
    versionKey: false
});

// ═══════════════════════════════════════════════════════════════
// FIELD DEPENDENCY SCHEMA
// ═══════════════════════════════════════════════════════════════

const fieldDependencySchema = new mongoose.Schema({
    entityType: {
        type: String,
        required: true,
        trim: true,
        index: true
    },

    fieldName: {
        type: String,
        required: true,
        trim: true,
        index: true
    },

    dependsOn: {
        type: [dependencyItemSchema],
        default: []
    },

    usedBy: {
        type: [usedByReferenceSchema],
        default: []
    },

    canDelete: {
        type: Boolean,
        default: true,
        index: true
    },

    deleteBlockedBy: {
        type: [String],
        default: []
    },

    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        required: true,
        index: true
    }
}, {
    timestamps: true,
    versionKey: false
});

// ═══════════════════════════════════════════════════════════════
// INDEXES - FORMULA FIELD
// ═══════════════════════════════════════════════════════════════

formulaFieldSchema.index({ firmId: 1, entityType: 1, name: 1 }, { unique: true });
formulaFieldSchema.index({ firmId: 1, entityType: 1, isActive: 1 });
formulaFieldSchema.index({ firmId: 1, createdBy: 1 });
formulaFieldSchema.index({ dependencies: 1 });
formulaFieldSchema.index({ cacheEnabled: 1, cacheInvalidateOn: 1 });

// ═══════════════════════════════════════════════════════════════
// INDEXES - FIELD DEPENDENCY
// ═══════════════════════════════════════════════════════════════

fieldDependencySchema.index({ firmId: 1, entityType: 1, fieldName: 1 }, { unique: true });
fieldDependencySchema.index({ firmId: 1, canDelete: 1 });
fieldDependencySchema.index({ 'dependsOn.fieldName': 1 });
fieldDependencySchema.index({ 'dependsOn.entityType': 1 });
fieldDependencySchema.index({ 'usedBy.type': 1, 'usedBy.referenceId': 1 });

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS - FORMULA FIELD
// ═══════════════════════════════════════════════════════════════

/**
 * Get all active formulas for an entity type
 * @param {ObjectId} firmId - Firm ID
 * @param {String} entityType - Entity type
 * @returns {Promise<Array>} List of formula fields
 */
formulaFieldSchema.statics.getActiveFormulas = async function(firmId, entityType) {
    return await this.find({
        firmId,
        entityType,
        isActive: true
    }).sort({ name: 1 });
};

/**
 * Get formulas by dependency
 * @param {ObjectId} firmId - Firm ID
 * @param {String} fieldName - Field name that formulas depend on
 * @returns {Promise<Array>} List of formula fields
 */
formulaFieldSchema.statics.getFormulasByDependency = async function(firmId, fieldName) {
    return await this.find({
        firmId,
        dependencies: fieldName,
        isActive: true
    });
};

/**
 * Get formulas that need cache invalidation
 * @param {ObjectId} firmId - Firm ID
 * @param {String} event - Event that occurred
 * @returns {Promise<Array>} List of formula fields
 */
formulaFieldSchema.statics.getFormulasToInvalidate = async function(firmId, event) {
    return await this.find({
        firmId,
        cacheEnabled: true,
        cacheInvalidateOn: event,
        isActive: true
    });
};

/**
 * Validate formula syntax
 * @param {String} formula - Formula to validate
 * @returns {Object} Validation result with isValid and errors
 */
formulaFieldSchema.statics.validateFormula = function(formula) {
    // Basic validation - can be extended with actual formula parser
    const result = {
        isValid: true,
        errors: []
    };

    if (!formula || formula.trim().length === 0) {
        result.isValid = false;
        result.errors.push('Formula cannot be empty');
    }

    // Check for balanced parentheses
    let balance = 0;
    for (const char of formula) {
        if (char === '(') balance++;
        if (char === ')') balance--;
        if (balance < 0) {
            result.isValid = false;
            result.errors.push('Unbalanced parentheses');
            break;
        }
    }
    if (balance !== 0 && result.isValid) {
        result.isValid = false;
        result.errors.push('Unbalanced parentheses');
    }

    return result;
};

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS - FIELD DEPENDENCY
// ═══════════════════════════════════════════════════════════════

/**
 * Get or create field dependency
 * @param {ObjectId} firmId - Firm ID
 * @param {String} entityType - Entity type
 * @param {String} fieldName - Field name
 * @returns {Promise<Object>} Field dependency document
 */
fieldDependencySchema.statics.getOrCreate = async function(firmId, entityType, fieldName) {
    let dependency = await this.findOne({ firmId, entityType, fieldName });

    if (!dependency) {
        dependency = await this.create({ firmId, entityType, fieldName });
    }

    return dependency;
};

/**
 * Check if field can be deleted
 * @param {ObjectId} firmId - Firm ID
 * @param {String} entityType - Entity type
 * @param {String} fieldName - Field name
 * @returns {Promise<Object>} Object with canDelete flag and blockers
 */
fieldDependencySchema.statics.checkCanDelete = async function(firmId, entityType, fieldName) {
    const dependency = await this.findOne({ firmId, entityType, fieldName });

    if (!dependency) {
        return { canDelete: true, blockers: [] };
    }

    return {
        canDelete: dependency.canDelete,
        blockers: dependency.deleteBlockedBy,
        usedBy: dependency.usedBy
    };
};

/**
 * Add a dependency relationship
 * @param {ObjectId} firmId - Firm ID
 * @param {String} entityType - Entity type of the field
 * @param {String} fieldName - Field that depends on another
 * @param {Object} dependsOnField - Field being depended on
 * @returns {Promise<Object>} Updated field dependency
 */
fieldDependencySchema.statics.addDependency = async function(
    firmId,
    entityType,
    fieldName,
    dependsOnField
) {
    const dependency = await this.getOrCreate(firmId, entityType, fieldName);

    // Check if dependency already exists
    const exists = dependency.dependsOn.some(
        dep => dep.fieldName === dependsOnField.fieldName &&
               dep.entityType === dependsOnField.entityType
    );

    if (!exists) {
        dependency.dependsOn.push(dependsOnField);
        await dependency.save();
    }

    // Update the field being depended on
    if (dependsOnField.entityType && dependsOnField.fieldName) {
        const targetDependency = await this.getOrCreate(
            firmId,
            dependsOnField.entityType,
            dependsOnField.fieldName
        );

        targetDependency.canDelete = false;
        targetDependency.deleteBlockedBy.addToSet(`${entityType}.${fieldName}`);
        await targetDependency.save();
    }

    return dependency;
};

/**
 * Add a usage reference
 * @param {ObjectId} firmId - Firm ID
 * @param {String} entityType - Entity type
 * @param {String} fieldName - Field name
 * @param {Object} usageRef - Usage reference object
 * @returns {Promise<Object>} Updated field dependency
 */
fieldDependencySchema.statics.addUsage = async function(firmId, entityType, fieldName, usageRef) {
    const dependency = await this.getOrCreate(firmId, entityType, fieldName);

    // Check if usage already exists
    const exists = dependency.usedBy.some(
        usage => usage.type === usageRef.type &&
                 usage.referenceId.toString() === usageRef.referenceId.toString()
    );

    if (!exists) {
        dependency.usedBy.push(usageRef);
        dependency.canDelete = false;
        dependency.deleteBlockedBy.addToSet(`${usageRef.type}:${usageRef.referenceName || usageRef.referenceId}`);
        await dependency.save();
    }

    return dependency;
};

/**
 * Remove a usage reference
 * @param {ObjectId} firmId - Firm ID
 * @param {String} entityType - Entity type
 * @param {String} fieldName - Field name
 * @param {String} usageType - Usage type
 * @param {ObjectId} referenceId - Reference ID
 * @returns {Promise<Object>} Updated field dependency
 */
fieldDependencySchema.statics.removeUsage = async function(
    firmId,
    entityType,
    fieldName,
    usageType,
    referenceId
) {
    const dependency = await this.findOne({ firmId, entityType, fieldName });

    if (!dependency) {
        return null;
    }

    dependency.usedBy = dependency.usedBy.filter(
        usage => !(usage.type === usageType &&
                   usage.referenceId.toString() === referenceId.toString())
    );

    // Recalculate canDelete
    dependency.canDelete = dependency.usedBy.length === 0;
    dependency.deleteBlockedBy = dependency.usedBy.map(
        usage => `${usage.type}:${usage.referenceName || usage.referenceId}`
    );

    await dependency.save();
    return dependency;
};

/**
 * Get dependency tree for a field
 * @param {ObjectId} firmId - Firm ID
 * @param {String} entityType - Entity type
 * @param {String} fieldName - Field name
 * @param {Number} depth - Max depth to traverse (default: 5)
 * @returns {Promise<Object>} Dependency tree
 */
fieldDependencySchema.statics.getDependencyTree = async function(
    firmId,
    entityType,
    fieldName,
    depth = 5
) {
    if (depth === 0) {
        return null;
    }

    const dependency = await this.findOne({ firmId, entityType, fieldName });

    if (!dependency) {
        return {
            entityType,
            fieldName,
            dependsOn: [],
            usedBy: []
        };
    }

    const tree = {
        entityType: dependency.entityType,
        fieldName: dependency.fieldName,
        canDelete: dependency.canDelete,
        dependsOn: [],
        usedBy: dependency.usedBy
    };

    // Recursively get dependencies
    for (const dep of dependency.dependsOn) {
        const subTree = await this.getDependencyTree(
            firmId,
            dep.entityType,
            dep.fieldName,
            depth - 1
        );
        if (subTree) {
            tree.dependsOn.push(subTree);
        }
    }

    return tree;
};

// ═══════════════════════════════════════════════════════════════
// INSTANCE METHODS - FORMULA FIELD
// ═══════════════════════════════════════════════════════════════

/**
 * Extract field names from formula
 * @returns {Array<String>} List of field names referenced in formula
 */
formulaFieldSchema.methods.extractDependencies = function() {
    // Basic extraction - matches {fieldName} pattern
    const regex = /\{([^}]+)\}/g;
    const matches = [];
    let match;

    while ((match = regex.exec(this.formula)) !== null) {
        matches.push(match[1].trim());
    }

    return [...new Set(matches)]; // Remove duplicates
};

/**
 * Update dependencies based on formula
 * @returns {Promise<void>}
 */
formulaFieldSchema.methods.updateDependencies = async function() {
    const extractedDeps = this.extractDependencies();
    this.dependencies = extractedDeps;
    await this.save();
};

/**
 * Format value according to returnType and format settings
 * @param {*} value - Value to format
 * @returns {String} Formatted value
 */
formulaFieldSchema.methods.formatValue = function(value) {
    if (value === null || value === undefined) {
        return '';
    }

    const fmt = this.format || {};

    switch (this.returnType) {
        case 'number':
        case 'currency':
            const numValue = typeof value === 'number' ? value : parseFloat(value);
            if (isNaN(numValue)) return '';

            const decimals = fmt.decimals !== undefined ? fmt.decimals : 2;
            let formatted = numValue.toFixed(decimals);

            if (fmt.prefix) formatted = fmt.prefix + formatted;
            if (fmt.suffix) formatted = formatted + fmt.suffix;

            return formatted;

        case 'date':
            // Basic date formatting - can be enhanced with moment/dayjs
            if (value instanceof Date) {
                return value.toISOString().split('T')[0];
            }
            return value.toString();

        case 'boolean':
            return value ? 'Yes' : 'No';

        case 'text':
        default:
            return value.toString();
    }
};

// ═══════════════════════════════════════════════════════════════
// INSTANCE METHODS - FIELD DEPENDENCY
// ═══════════════════════════════════════════════════════════════

/**
 * Check if this field has any dependencies
 * @returns {Boolean}
 */
fieldDependencySchema.methods.hasDependencies = function() {
    return this.dependsOn && this.dependsOn.length > 0;
};

/**
 * Check if this field is used by anything
 * @returns {Boolean}
 */
fieldDependencySchema.methods.isUsed = function() {
    return this.usedBy && this.usedBy.length > 0;
};

/**
 * Get formatted delete blocker message
 * @returns {String}
 */
fieldDependencySchema.methods.getDeleteBlockerMessage = function() {
    if (this.canDelete) {
        return 'Field can be deleted';
    }

    const blockers = this.deleteBlockedBy.join(', ');
    return `Cannot delete field. It is used by: ${blockers}`;
};

// ═══════════════════════════════════════════════════════════════
// FIRM ISOLATION PLUGIN (RLS-like enforcement)
// ═══════════════════════════════════════════════════════════════
const firmIsolationPlugin = require('./plugins/firmIsolation.plugin');

/**
 * Apply Row-Level Security (RLS) plugin to enforce firm-level data isolation.
 * This ensures all queries automatically filter by firmId from the request context.
 */
formulaFieldSchema.plugin(firmIsolationPlugin);
fieldDependencySchema.plugin(firmIsolationPlugin);

// ═══════════════════════════════════════════════════════════════
// MODELS
// ═══════════════════════════════════════════════════════════════

const FormulaField = mongoose.model('FormulaField', formulaFieldSchema);
const FieldDependency = mongoose.model('FieldDependency', fieldDependencySchema);

module.exports = {
    FormulaField,
    FieldDependency
};
