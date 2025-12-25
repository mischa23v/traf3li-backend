/**
 * Custom Field Plugin - Mongoose Plugin for Custom Fields Support
 *
 * This plugin adds custom field support to any Mongoose schema.
 * It provides virtual fields, automatic population, and helper methods.
 *
 * Features:
 * - Virtual 'customFields' property with auto-population
 * - Helper methods for getting/setting custom field values
 * - Automatic cascade deletion of custom field values
 * - Integration with custom field service
 *
 * Usage:
 *   const customFieldPlugin = require('../plugins/customFieldPlugin');
 *   mySchema.plugin(customFieldPlugin, { entityType: 'client' });
 *
 * @param {Schema} schema - Mongoose schema to apply plugin to
 * @param {Object} options - Plugin configuration options
 * @param {String} options.entityType - Entity type name (required)
 */

const mongoose = require('mongoose');

module.exports = function customFieldPlugin(schema, options = {}) {
    const { entityType } = options;

    if (!entityType) {
        throw new Error('customFieldPlugin requires "entityType" option');
    }

    // ═══════════════════════════════════════════════════════════════
    // VIRTUAL FIELD - customFields
    // Populates custom field values for this entity
    // ═══════════════════════════════════════════════════════════════

    schema.virtual('customFields', {
        ref: 'CustomFieldValue',
        localField: '_id',
        foreignField: 'entityId',
        match: { entityType },
        justOne: false
    });

    // ═══════════════════════════════════════════════════════════════
    // VIRTUAL FIELD - customFieldsMap
    // Returns custom fields as a map for easier access
    // ═══════════════════════════════════════════════════════════════

    schema.virtual('customFieldsMap').get(function() {
        if (!this.customFields || !Array.isArray(this.customFields)) {
            return {};
        }

        const map = {};
        for (const fieldValue of this.customFields) {
            if (fieldValue.fieldId) {
                const fieldKey = fieldValue.fieldId.fieldKey || fieldValue.fieldId._id.toString();
                map[fieldKey] = fieldValue.value;
            }
        }
        return map;
    });

    // ═══════════════════════════════════════════════════════════════
    // INSTANCE METHODS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Get custom field value by field key
     * @param {String} fieldKey - Field key
     * @returns {*} - Field value or undefined
     */
    schema.methods.getCustomFieldValue = function(fieldKey) {
        if (!this.customFields || !Array.isArray(this.customFields)) {
            return undefined;
        }

        for (const fieldValue of this.customFields) {
            if (fieldValue.fieldId && fieldValue.fieldId.fieldKey === fieldKey) {
                return fieldValue.value;
            }
        }

        return undefined;
    };

    /**
     * Set custom field value by field key
     * @param {String} fieldKey - Field key
     * @param {*} value - Value to set
     * @param {String} userId - User ID
     * @returns {Promise<Object>} - Updated field value
     */
    schema.methods.setCustomFieldValue = async function(fieldKey, value, userId) {
        const CustomField = mongoose.model('CustomField');
        const CustomFieldValue = mongoose.model('CustomFieldValue');

        // Get firmId from this document
        const firmId = this.firmId;
        if (!firmId) {
            throw new Error('Document must have firmId to use custom fields');
        }

        // Find field definition
        const field = await CustomField.findOne({
            firmId,
            entityType,
            fieldKey,
            isActive: true
        });

        if (!field) {
            throw new Error(`Custom field "${fieldKey}" not found`);
        }

        // Validate value
        const validation = field.validateValue(value);
        if (!validation.valid) {
            throw new Error(validation.error);
        }

        // Set value
        return await CustomFieldValue.setValue(
            field._id.toString(),
            this._id.toString(),
            value,
            userId,
            firmId.toString(),
            entityType
        );
    };

    /**
     * Set multiple custom field values
     * @param {Object} fieldValues - Map of fieldKey -> value
     * @param {String} userId - User ID
     * @returns {Promise<Object>} - Results and errors
     */
    schema.methods.setCustomFieldValues = async function(fieldValues, userId) {
        const CustomFieldValue = mongoose.model('CustomFieldValue');

        // Get firmId from this document
        const firmId = this.firmId;
        if (!firmId) {
            throw new Error('Document must have firmId to use custom fields');
        }

        return await CustomFieldValue.setMultipleValues(
            entityType,
            this._id.toString(),
            fieldValues,
            userId,
            firmId.toString()
        );
    };

    /**
     * Get all custom field values with field definitions
     * @returns {Promise<Array>} - Custom field values with definitions
     */
    schema.methods.getCustomFieldsWithDefinitions = async function() {
        const CustomField = mongoose.model('CustomField');
        const CustomFieldValue = mongoose.model('CustomFieldValue');

        // Get firmId from this document
        const firmId = this.firmId;
        if (!firmId) {
            return [];
        }

        // Get all fields for entity type
        const fields = await CustomField.getFieldsForEntity(entityType, firmId.toString());

        // Get all values for this entity
        const values = await CustomFieldValue.getValuesForEntity(
            entityType,
            this._id.toString(),
            firmId.toString()
        );

        // Create value map
        const valueMap = {};
        for (const value of values) {
            valueMap[value.fieldId._id.toString()] = value;
        }

        // Merge fields with values
        return fields.map(field => {
            const value = valueMap[field._id.toString()];
            return {
                ...field,
                value: value ? value.value : field.defaultValue,
                valueId: value ? value._id : null,
                updatedAt: value ? value.updatedAt : null,
                updatedBy: value ? value.updatedBy : null
            };
        });
    };

    /**
     * Delete all custom field values for this entity
     * @returns {Promise<Number>} - Number of deleted values
     */
    schema.methods.deleteCustomFieldValues = async function() {
        const CustomFieldValue = mongoose.model('CustomFieldValue');

        // Get firmId from this document
        const firmId = this.firmId;
        if (!firmId) {
            return 0;
        }

        return await CustomFieldValue.deleteEntityValues(
            entityType,
            this._id.toString(),
            firmId.toString()
        );
    };

    /**
     * Check which custom fields should be visible based on dependencies
     * @returns {Promise<Object>} - Map of fieldKey -> shouldShow
     */
    schema.methods.checkCustomFieldDependencies = async function() {
        const customFieldService = require('../services/customField.service');

        // Get firmId from this document
        const firmId = this.firmId;
        if (!firmId) {
            return {};
        }

        return await customFieldService.checkDependencies(
            entityType,
            this._id.toString(),
            firmId.toString()
        );
    };

    // ═══════════════════════════════════════════════════════════════
    // STATIC METHODS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Find entities by custom field value
     * @param {String} fieldKey - Field key
     * @param {*} value - Value to search for
     * @param {String} firmId - Firm ID
     * @param {Object} options - Search options
     * @returns {Promise<Array>} - Matching entities
     */
    schema.statics.findByCustomField = async function(fieldKey, value, firmId, options = {}) {
        const CustomField = mongoose.model('CustomField');
        const CustomFieldValue = mongoose.model('CustomFieldValue');

        // Find field definition
        const field = await CustomField.findOne({
            firmId: new mongoose.Types.ObjectId(firmId),
            entityType,
            fieldKey,
            isActive: true
        });

        if (!field) {
            throw new Error(`Custom field "${fieldKey}" not found`);
        }

        // Search by value
        const results = await CustomFieldValue.searchByValue(
            field._id.toString(),
            value,
            firmId,
            options
        );

        // Get entity IDs
        const entityIds = results.map(r => r.entityId);

        if (entityIds.length === 0) {
            return [];
        }

        // Find entities
        return await this.find({
            _id: { $in: entityIds },
            firmId: new mongoose.Types.ObjectId(firmId)
        });
    };

    /**
     * Get all custom fields for this entity type
     * @param {String} firmId - Firm ID
     * @param {Object} options - Query options
     * @returns {Promise<Array>} - Custom fields
     */
    schema.statics.getCustomFields = async function(firmId, options = {}) {
        const CustomField = mongoose.model('CustomField');

        return await CustomField.getFieldsForEntity(entityType, firmId, options);
    };

    // ═══════════════════════════════════════════════════════════════
    // QUERY HELPERS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Populate custom fields in query
     * Usage: Model.find().populateCustomFields()
     */
    schema.query.populateCustomFields = function() {
        return this.populate({
            path: 'customFields',
            populate: {
                path: 'fieldId',
                select: 'name nameAr fieldKey fieldType options order group'
            }
        });
    };

    // ═══════════════════════════════════════════════════════════════
    // MIDDLEWARE HOOKS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Cascade delete custom field values when entity is deleted
     */
    schema.post('findOneAndDelete', async function(doc) {
        if (doc) {
            try {
                const CustomFieldValue = mongoose.model('CustomFieldValue');

                await CustomFieldValue.deleteMany({
                    entityType,
                    entityId: doc._id
                });

                // logger would be nice here but we avoid requiring it to prevent circular deps
                console.log(`Deleted custom field values for ${entityType} ${doc._id}`);
            } catch (error) {
                console.error('Error deleting custom field values:', error);
            }
        }
    });

    /**
     * Cascade delete custom field values when entities are bulk deleted
     */
    schema.pre('deleteMany', async function() {
        try {
            const CustomFieldValue = mongoose.model('CustomFieldValue');

            // Get the filter conditions
            const filter = this.getFilter();

            // Find entities that will be deleted
            const entities = await this.model.find(filter).select('_id');
            const entityIds = entities.map(e => e._id);

            if (entityIds.length > 0) {
                await CustomFieldValue.deleteMany({
                    entityType,
                    entityId: { $in: entityIds }
                });

                console.log(`Deleted custom field values for ${entityIds.length} ${entityType}(s)`);
            }
        } catch (error) {
            console.error('Error deleting custom field values in bulk:', error);
        }
    });

    // ═══════════════════════════════════════════════════════════════
    // ENABLE VIRTUALS IN JSON/OBJECT
    // ═══════════════════════════════════════════════════════════════

    // Ensure virtuals are included when converting to JSON
    schema.set('toJSON', {
        virtuals: true,
        transform: function(doc, ret) {
            // Optionally transform customFields for cleaner API response
            if (ret.customFields && Array.isArray(ret.customFields)) {
                // Convert to a more user-friendly format
                const customFieldsFormatted = {};
                ret.customFields.forEach(fieldValue => {
                    if (fieldValue.fieldId) {
                        const fieldKey = fieldValue.fieldId.fieldKey || fieldValue.fieldId._id;
                        customFieldsFormatted[fieldKey] = {
                            name: fieldValue.fieldId.name,
                            nameAr: fieldValue.fieldId.nameAr,
                            value: fieldValue.value,
                            fieldType: fieldValue.fieldId.fieldType,
                            updatedAt: fieldValue.updatedAt
                        };
                    }
                });
                ret.customFieldsFormatted = customFieldsFormatted;
            }
            return ret;
        }
    });

    schema.set('toObject', { virtuals: true });
};
