/**
 * DocType Registry - Metadata-Driven Schema Framework
 *
 * This provides an ERPNext-like DocType system for Node.js/Mongoose
 * allowing JSON-based schema definitions that auto-generate:
 * - Mongoose schemas with validation
 * - Express CRUD routes
 * - Permission checks
 * - Audit trails
 *
 * @module framework/doctype-registry
 */

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

/**
 * Field type mappings from DocType to Mongoose
 */
const FIELD_TYPE_MAP = {
    // Basic Types
    'Data': { type: String, trim: true },
    'Text': { type: String },
    'LongText': { type: String },
    'SmallText': { type: String, maxlength: 140 },
    'Int': { type: Number },
    'Float': { type: Number },
    'Currency': { type: Number }, // Stored as halalas (integer cents)
    'Percent': { type: Number, min: 0, max: 100 },
    'Check': { type: Boolean, default: false },
    'Date': { type: Date },
    'Datetime': { type: Date },
    'Time': { type: String },

    // Reference Types
    'Link': { type: mongoose.Schema.Types.ObjectId },
    'DynamicLink': { type: mongoose.Schema.Types.ObjectId },

    // Select Types
    'Select': { type: String },

    // Special Types
    'Password': { type: String, select: false },
    'Attach': { type: String }, // File URL
    'AttachImage': { type: String },
    'Signature': { type: String },
    'Color': { type: String },
    'Barcode': { type: String },
    'Geolocation': {
        type: { type: String, enum: ['Point'] },
        coordinates: [Number]
    },
    'JSON': { type: mongoose.Schema.Types.Mixed },
    'Code': { type: String },
    'HTMLEditor': { type: String },
    'MarkdownEditor': { type: String },
    'Rating': { type: Number, min: 0, max: 5 },
    'Duration': { type: Number }, // Stored in seconds
    'Phone': { type: String },
    'ReadOnly': { type: String },
    'Table': { type: Array },
    'TableMultiSelect': { type: Array }
};

/**
 * DocType Registry - Singleton to manage all registered DocTypes
 */
class DocTypeRegistry {
    constructor() {
        this.docTypes = new Map();
        this.schemas = new Map();
        this.models = new Map();
        this.hooks = new Map();
        this.childTables = new Map();
    }

    /**
     * Register a DocType from JSON definition
     * @param {Object} docType - DocType definition
     * @returns {mongoose.Model} Generated Mongoose model
     */
    register(docType) {
        const { name, module } = docType;

        if (!name) {
            throw new Error('DocType must have a name');
        }

        // Store the raw definition
        this.docTypes.set(name, docType);

        // Generate Mongoose schema
        const schema = this._generateSchema(docType);
        this.schemas.set(name, schema);

        // Create and store Mongoose model
        const modelName = this._toModelName(name);

        // Check if model already exists
        if (mongoose.models[modelName]) {
            this.models.set(name, mongoose.models[modelName]);
            return mongoose.models[modelName];
        }

        const model = mongoose.model(modelName, schema);
        this.models.set(name, model);

        return model;
    }

    /**
     * Register a child table DocType
     * @param {Object} docType - Child DocType definition
     */
    registerChildTable(docType) {
        const { name } = docType;
        docType.isChildTable = true;
        this.childTables.set(name, docType);
        return this.register(docType);
    }

    /**
     * Load DocTypes from a directory
     * @param {string} dir - Directory containing JSON DocType files
     */
    loadFromDirectory(dir) {
        if (!fs.existsSync(dir)) {
            logger.warn('DocType directory does not exist', { directory: dir });
            return;
        }

        const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));

        // First pass: Load child tables
        for (const file of files) {
            const filePath = path.join(dir, file);
            const docType = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            if (docType.isChildTable) {
                this.registerChildTable(docType);
            }
        }

        // Second pass: Load regular DocTypes
        for (const file of files) {
            const filePath = path.join(dir, file);
            const docType = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            if (!docType.isChildTable) {
                this.register(docType);
            }
        }
    }

    /**
     * Get a registered DocType definition
     * @param {string} name - DocType name
     * @returns {Object} DocType definition
     */
    getDocType(name) {
        return this.docTypes.get(name);
    }

    /**
     * Get a Mongoose model for a DocType
     * @param {string} name - DocType name
     * @returns {mongoose.Model} Mongoose model
     */
    getModel(name) {
        return this.models.get(name);
    }

    /**
     * Get all registered DocType names
     * @returns {string[]} Array of DocType names
     */
    getAllDocTypes() {
        return Array.from(this.docTypes.keys());
    }

    /**
     * Generate Mongoose schema from DocType definition
     * @private
     */
    _generateSchema(docType) {
        const schemaDefinition = {};
        const { fields = [], permissions = [] } = docType;

        // Add standard multi-tenancy fields
        if (!docType.isChildTable) {
            schemaDefinition.firmId = {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Firm',
                required: true,
                index: true
            };
            schemaDefinition.lawyerId = {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
                index: true
            };
        }

        // Process each field
        for (const field of fields) {
            if (field.fieldtype === 'Section Break' ||
                field.fieldtype === 'Column Break' ||
                field.fieldtype === 'HTML' ||
                field.fieldtype === 'Button') {
                continue; // Skip layout fields
            }

            const schemaField = this._convertField(field);
            if (schemaField) {
                schemaDefinition[field.fieldname] = schemaField;
            }
        }

        // Add audit fields if track_changes is enabled
        if (docType.track_changes !== false) {
            schemaDefinition.createdBy = {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            };
            schemaDefinition.updatedBy = {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            };
        }

        // Add soft delete support
        if (docType.allow_trash !== false) {
            schemaDefinition.isDeleted = {
                type: Boolean,
                default: false,
                index: true
            };
            schemaDefinition.deletedAt = Date;
            schemaDefinition.deletedBy = {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            };
        }

        // Add status field if docstatus is enabled
        if (docType.is_submittable) {
            schemaDefinition.docstatus = {
                type: Number,
                default: 0, // 0: Draft, 1: Submitted, 2: Cancelled
                enum: [0, 1, 2]
            };
        }

        // Add name/ID field with autoname support
        if (docType.autoname) {
            schemaDefinition.name = {
                type: String,
                unique: true,
                sparse: true
            };
        }

        // Create schema with options
        const schema = new mongoose.Schema(schemaDefinition, {
            timestamps: docType.track_changes !== false,
            collection: this._toCollectionName(docType.name)
        });

        // Add autoname pre-save hook
        if (docType.autoname) {
            this._addAutonameHook(schema, docType);
        }

        // Add indexes
        this._addIndexes(schema, docType);

        // Add validation hooks
        this._addValidationHooks(schema, docType);

        // Store permissions for route generation
        schema._docTypePermissions = permissions;
        schema._docTypeDefinition = docType;

        return schema;
    }

    /**
     * Convert a DocType field to Mongoose schema field
     * @private
     */
    _convertField(field) {
        const { fieldtype, fieldname, options, reqd, unique, default: defaultValue } = field;

        const baseType = FIELD_TYPE_MAP[fieldtype];
        if (!baseType) {
            logger.warn('Unknown field type in DocType', { fieldtype, fieldname });
            return null;
        }

        const schemaField = { ...baseType };

        // Handle Link fields (references)
        if (fieldtype === 'Link' && options) {
            schemaField.ref = this._toModelName(options);
        }

        // Handle DynamicLink fields
        if (fieldtype === 'DynamicLink' && field.options) {
            // The options field name contains the field that stores the doctype
            schemaField.refPath = field.options;
        }

        // Handle Select fields with options
        if (fieldtype === 'Select' && options) {
            const selectOptions = options.split('\n').filter(o => o.trim());
            schemaField.enum = selectOptions;
        }

        // Handle Table fields (child tables)
        if (fieldtype === 'Table' && options) {
            const childDocType = this.childTables.get(options);
            if (childDocType) {
                const childSchema = this._generateChildSchema(childDocType);
                return [childSchema];
            }
            return [mongoose.Schema.Types.Mixed];
        }

        // Handle TableMultiSelect
        if (fieldtype === 'TableMultiSelect' && options) {
            return [{
                type: mongoose.Schema.Types.ObjectId,
                ref: this._toModelName(options)
            }];
        }

        // Add required validation
        if (reqd) {
            schemaField.required = true;
        }

        // Add unique constraint
        if (unique) {
            schemaField.unique = true;
            schemaField.sparse = true;
        }

        // Add default value
        if (defaultValue !== undefined) {
            if (fieldtype === 'Check') {
                schemaField.default = defaultValue === 1 || defaultValue === true;
            } else if (fieldtype === 'Int' || fieldtype === 'Float' || fieldtype === 'Currency') {
                schemaField.default = Number(defaultValue);
            } else {
                schemaField.default = defaultValue;
            }
        }

        // Add max length for Data fields
        if (field.max_length && (fieldtype === 'Data' || fieldtype === 'Text')) {
            schemaField.maxlength = field.max_length;
        }

        // Add number range validation
        if (fieldtype === 'Int' || fieldtype === 'Float' || fieldtype === 'Currency') {
            if (field.min !== undefined) schemaField.min = field.min;
            if (field.max !== undefined) schemaField.max = field.max;
        }

        return schemaField;
    }

    /**
     * Generate a sub-schema for child tables
     * @private
     */
    _generateChildSchema(docType) {
        const schemaDefinition = {};

        for (const field of docType.fields || []) {
            if (field.fieldtype === 'Section Break' ||
                field.fieldtype === 'Column Break') {
                continue;
            }

            const schemaField = this._convertField(field);
            if (schemaField) {
                schemaDefinition[field.fieldname] = schemaField;
            }
        }

        // Add idx for ordering
        schemaDefinition.idx = { type: Number, default: 0 };

        return new mongoose.Schema(schemaDefinition, { _id: true });
    }

    /**
     * Add autoname pre-save hook
     * @private
     */
    _addAutonameHook(schema, docType) {
        const autoname = docType.autoname;

        schema.pre('save', async function(next) {
            if (!this.isNew || this.name) {
                return next();
            }

            try {
                // Parse autoname pattern
                // Formats: "naming_series:", "field:title", "hash", "format:INV-.YYYY.-.#####"
                if (autoname === 'hash') {
                    this.name = new mongoose.Types.ObjectId().toString();
                } else if (autoname.startsWith('field:')) {
                    const fieldName = autoname.replace('field:', '');
                    this.name = this[fieldName];
                } else if (autoname.startsWith('format:') || autoname === 'naming_series:') {
                    const pattern = autoname === 'naming_series:'
                        ? (this.naming_series || docType.name.toUpperCase().substring(0, 3) + '-.YYYY.-.#####')
                        : autoname.replace('format:', '');

                    this.name = await generateSeriesName(this, pattern);
                } else if (autoname.startsWith('prompt')) {
                    // User must provide name - validation will catch missing
                    if (!this.name) {
                        return next(new Error('Name is required'));
                    }
                }

                next();
            } catch (error) {
                next(error);
            }
        });
    }

    /**
     * Add indexes based on DocType definition
     * @private
     */
    _addIndexes(schema, docType) {
        const { fields = [], search_fields } = docType;

        // Add index for search fields
        if (search_fields) {
            const searchFieldNames = search_fields.split(',').map(f => f.trim());
            for (const fieldName of searchFieldNames) {
                const field = fields.find(f => f.fieldname === fieldName);
                if (field && field.fieldtype !== 'Table') {
                    schema.index({ [fieldName]: 1 });
                }
            }
        }

        // Add index for fields marked with in_filter
        for (const field of fields) {
            if (field.in_filter || field.in_standard_filter || field.in_list_view) {
                if (field.fieldtype !== 'Table' && field.fieldtype !== 'Text') {
                    schema.index({ [field.fieldname]: 1 });
                }
            }
        }

        // Add compound index for common queries
        if (!docType.isChildTable) {
            schema.index({ firmId: 1, createdAt: -1 });
            if (docType.is_submittable) {
                schema.index({ firmId: 1, docstatus: 1 });
            }
        }
    }

    /**
     * Add validation hooks
     * @private
     */
    _addValidationHooks(schema, docType) {
        // Validate mandatory fields
        schema.pre('validate', function(next) {
            const errors = [];

            for (const field of docType.fields || []) {
                if (field.reqd && field.depends_on) {
                    // Conditional mandatory - evaluate depends_on
                    const shouldBeRequired = evaluateDependsOn(this, field.depends_on);
                    if (shouldBeRequired && !this[field.fieldname]) {
                        errors.push(`${field.label || field.fieldname} is required`);
                    }
                }
            }

            if (errors.length) {
                next(new Error(errors.join(', ')));
            } else {
                next();
            }
        });

        // Prevent modification of submitted documents
        if (docType.is_submittable) {
            schema.pre('save', function(next) {
                if (!this.isNew && this.isModified() && this.docstatus === 1) {
                    // Check if only docstatus is being modified (for cancel)
                    const modifiedPaths = this.modifiedPaths();
                    const allowedPaths = ['docstatus', 'updatedAt', 'updatedBy'];
                    const hasUnallowedChanges = modifiedPaths.some(p => !allowedPaths.includes(p));

                    if (hasUnallowedChanges) {
                        return next(new Error('Cannot modify a submitted document'));
                    }
                }
                next();
            });
        }
    }

    /**
     * Convert DocType name to Mongoose model name
     * @private
     */
    _toModelName(name) {
        // "Sales Invoice" -> "SalesInvoice"
        return name.replace(/\s+/g, '');
    }

    /**
     * Convert DocType name to MongoDB collection name
     * @private
     */
    _toCollectionName(name) {
        // "Sales Invoice" -> "salesinvoices"
        return name.toLowerCase().replace(/\s+/g, '') + 's';
    }
}

/**
 * Generate series name based on pattern
 * Patterns: INV-.YYYY.-.##### (year and 5-digit counter)
 */
async function generateSeriesName(doc, pattern) {
    const now = new Date();
    let name = pattern;

    // Replace date placeholders
    name = name.replace('.YYYY.', `.${now.getFullYear()}.`);
    name = name.replace('.YY.', `.${String(now.getFullYear()).slice(-2)}.`);
    name = name.replace('.MM.', `.${String(now.getMonth() + 1).padStart(2, '0')}.`);
    name = name.replace('.DD.', `.${String(now.getDate()).padStart(2, '0')}.`);

    // Handle counter (# symbols)
    const counterMatch = name.match(/#+/);
    if (counterMatch) {
        const counterPattern = counterMatch[0];
        const counterLength = counterPattern.length;
        const prefix = name.substring(0, name.indexOf(counterPattern));

        // Get next counter value
        const Model = doc.constructor;
        const regex = new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`);

        const lastDoc = await Model.findOne({
            name: regex,
            firmId: doc.firmId
        }).sort({ name: -1 }).select('name').lean();

        let counter = 1;
        if (lastDoc && lastDoc.name) {
            const lastNumber = lastDoc.name.match(/(\d+)$/);
            if (lastNumber) {
                counter = parseInt(lastNumber[1], 10) + 1;
            }
        }

        name = name.replace(counterPattern, String(counter).padStart(counterLength, '0'));
    }

    return name;
}

/**
 * Safe expression evaluator for depends_on expressions
 * Handles patterns like: doc.status == 'Active', doc.amount > 0
 * Uses whitelist approach - NO eval/new Function
 */
function evaluateDependsOn(doc, expression) {
    if (!expression) return true;

    // Simple field reference: depends_on: "fieldname"
    if (!expression.startsWith('eval:')) {
        return !!doc[expression];
    }

    const expr = expression.replace('eval:', '').trim();

    try {
        const safeDoc = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };
        return safeEvaluateExpression(expr, safeDoc);
    } catch (e) {
        logger.warn('Failed to evaluate depends_on expression', { expression, error: e.message });
        return true;
    }
}

/**
 * Safe expression evaluator using whitelist approach
 * Supports: doc.field, comparisons (==, !=, >, <, >=, <=), logical (&&, ||, !)
 * NO dynamic code execution
 */
function safeEvaluateExpression(expr, doc) {
    // Tokenize and parse the expression safely
    const tokens = tokenizeExpression(expr);
    return evaluateTokens(tokens, doc);
}

/**
 * Tokenize expression into safe tokens
 */
function tokenizeExpression(expr) {
    const tokens = [];
    let i = 0;

    while (i < expr.length) {
        // Skip whitespace
        if (/\s/.test(expr[i])) {
            i++;
            continue;
        }

        // String literal
        if (expr[i] === "'" || expr[i] === '"') {
            const quote = expr[i];
            let str = '';
            i++;
            while (i < expr.length && expr[i] !== quote) {
                str += expr[i];
                i++;
            }
            i++; // skip closing quote
            tokens.push({ type: 'string', value: str });
            continue;
        }

        // Number
        if (/\d/.test(expr[i]) || (expr[i] === '-' && /\d/.test(expr[i + 1]))) {
            let num = '';
            if (expr[i] === '-') {
                num = '-';
                i++;
            }
            while (i < expr.length && /[\d.]/.test(expr[i])) {
                num += expr[i];
                i++;
            }
            tokens.push({ type: 'number', value: parseFloat(num) });
            continue;
        }

        // Operators
        const operators = ['===', '!==', '==', '!=', '>=', '<=', '&&', '||', '>', '<', '!', '(', ')'];
        let matched = false;
        for (const op of operators) {
            if (expr.substring(i, i + op.length) === op) {
                tokens.push({ type: 'operator', value: op });
                i += op.length;
                matched = true;
                break;
            }
        }
        if (matched) continue;

        // Identifier (doc.field or field)
        if (/[a-zA-Z_]/.test(expr[i])) {
            let id = '';
            while (i < expr.length && /[a-zA-Z0-9_.]/.test(expr[i])) {
                id += expr[i];
                i++;
            }
            // Handle boolean literals
            if (id === 'true') {
                tokens.push({ type: 'boolean', value: true });
            } else if (id === 'false') {
                tokens.push({ type: 'boolean', value: false });
            } else if (id === 'null' || id === 'undefined') {
                tokens.push({ type: 'null', value: null });
            } else {
                tokens.push({ type: 'identifier', value: id });
            }
            continue;
        }

        // Unknown character, skip
        i++;
    }

    return tokens;
}

/**
 * Evaluate tokens safely
 */
function evaluateTokens(tokens, doc) {
    // Simple recursive descent parser for: expr -> comparison ((&&, ||) comparison)*
    let pos = 0;

    function getValue(token) {
        if (!token) return null;
        switch (token.type) {
            case 'string':
            case 'number':
            case 'boolean':
                return token.value;
            case 'null':
                return null;
            case 'identifier': {
                const path = token.value.replace(/^doc\./, '');
                // Safely access nested properties
                const parts = path.split('.');
                let value = doc;
                for (const part of parts) {
                    if (value == null) return null;
                    // Prevent prototype pollution
                    if (part === '__proto__' || part === 'constructor' || part === 'prototype') {
                        return null;
                    }
                    value = value[part];
                }
                return value;
            }
            default:
                return null;
        }
    }

    function parseComparison() {
        // Handle NOT operator
        if (tokens[pos] && tokens[pos].type === 'operator' && tokens[pos].value === '!') {
            pos++;
            return !parseComparison();
        }

        // Handle parentheses
        if (tokens[pos] && tokens[pos].type === 'operator' && tokens[pos].value === '(') {
            pos++;
            const result = parseOr();
            if (tokens[pos] && tokens[pos].value === ')') pos++;
            return result;
        }

        const left = getValue(tokens[pos]);
        pos++;

        if (!tokens[pos] || tokens[pos].type !== 'operator') {
            return !!left;
        }

        const op = tokens[pos].value;
        if (!['==', '===', '!=', '!==', '>', '<', '>=', '<='].includes(op)) {
            return !!left;
        }

        pos++;
        const right = getValue(tokens[pos]);
        pos++;

        switch (op) {
            case '==':
            case '===':
                return left === right;
            case '!=':
            case '!==':
                return left !== right;
            case '>':
                return left > right;
            case '<':
                return left < right;
            case '>=':
                return left >= right;
            case '<=':
                return left <= right;
            default:
                return false;
        }
    }

    function parseAnd() {
        let result = parseComparison();
        while (tokens[pos] && tokens[pos].value === '&&') {
            pos++;
            result = result && parseComparison();
        }
        return result;
    }

    function parseOr() {
        let result = parseAnd();
        while (tokens[pos] && tokens[pos].value === '||') {
            pos++;
            result = result || parseAnd();
        }
        return result;
    }

    return parseOr();
}

// Create singleton instance
const registry = new DocTypeRegistry();

module.exports = {
    DocTypeRegistry,
    registry,
    FIELD_TYPE_MAP
};
