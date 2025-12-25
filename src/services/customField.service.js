/**
 * Custom Field Service
 *
 * Business logic for managing custom fields and their values.
 * Provides high-level API for creating, updating, and querying custom fields.
 */

const mongoose = require('mongoose');
const CustomField = require('../models/customField.model');
const CustomFieldValue = require('../models/customFieldValue.model');
const logger = require('../utils/logger');

class CustomFieldService {
    /**
     * Create a new custom field
     * @param {Object} data - Field definition data
     * @param {String} userId - User ID
     * @param {String} firmId - Firm ID
     * @returns {Promise<Object>} - Created field
     */
    async createField(data, userId, firmId) {
        try {
            // Validate required fields
            if (!data.name || !data.entityType || !data.fieldType) {
                throw new Error('Name, entity type, and field type are required');
            }

            // Generate fieldKey if not provided
            let fieldKey = data.fieldKey;
            if (!fieldKey) {
                fieldKey = data.name
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, '_')
                    .replace(/^_|_$/g, '');
            }

            // Check uniqueness
            const isUnique = await CustomField.isFieldKeyUnique(
                fieldKey,
                data.entityType,
                firmId
            );

            if (!isUnique) {
                throw new Error(`Field key "${fieldKey}" already exists for this entity type`);
            }

            // Validate options for select/multiselect
            if (['select', 'multiselect'].includes(data.fieldType)) {
                if (!data.options || data.options.length === 0) {
                    throw new Error('Select and multiselect fields must have at least one option');
                }
            }

            // Create field
            const field = await CustomField.create({
                ...data,
                fieldKey,
                firmId: new mongoose.Types.ObjectId(firmId),
                createdBy: new mongoose.Types.ObjectId(userId),
                updatedBy: new mongoose.Types.ObjectId(userId)
            });

            logger.info(`Custom field created: ${field._id} (${field.name})`);

            return field;
        } catch (error) {
            logger.error('CustomFieldService.createField failed:', error.message);
            throw error;
        }
    }

    /**
     * Update a custom field
     * @param {String} fieldId - Field ID
     * @param {Object} data - Updated field data
     * @param {String} userId - User ID
     * @param {String} firmId - Firm ID
     * @returns {Promise<Object>} - Updated field
     */
    async updateField(fieldId, data, userId, firmId) {
        try {
            // Find field
            const field = await CustomField.findOne({
                _id: new mongoose.Types.ObjectId(fieldId),
                firmId: new mongoose.Types.ObjectId(firmId)
            });

            if (!field) {
                throw new Error('Custom field not found');
            }

            // Prevent updating system fields
            if (field.isSystem) {
                throw new Error('Cannot modify system fields');
            }

            // Check fieldKey uniqueness if changed
            if (data.fieldKey && data.fieldKey !== field.fieldKey) {
                const isUnique = await CustomField.isFieldKeyUnique(
                    data.fieldKey,
                    field.entityType,
                    firmId,
                    fieldId
                );

                if (!isUnique) {
                    throw new Error(`Field key "${data.fieldKey}" already exists for this entity type`);
                }
            }

            // Validate options for select/multiselect
            if (data.fieldType && ['select', 'multiselect'].includes(data.fieldType)) {
                if (!data.options || data.options.length === 0) {
                    throw new Error('Select and multiselect fields must have at least one option');
                }
            }

            // Update field
            Object.keys(data).forEach(key => {
                if (key !== '_id' && key !== 'firmId' && key !== 'createdBy') {
                    field[key] = data[key];
                }
            });

            field.updatedBy = new mongoose.Types.ObjectId(userId);
            await field.save();

            logger.info(`Custom field updated: ${field._id} (${field.name})`);

            return field;
        } catch (error) {
            logger.error('CustomFieldService.updateField failed:', error.message);
            throw error;
        }
    }

    /**
     * Delete a custom field
     * @param {String} fieldId - Field ID
     * @param {String} firmId - Firm ID
     * @returns {Promise<Boolean>} - Success status
     */
    async deleteField(fieldId, firmId) {
        try {
            // Find field
            const field = await CustomField.findOne({
                _id: new mongoose.Types.ObjectId(fieldId),
                firmId: new mongoose.Types.ObjectId(firmId)
            });

            if (!field) {
                throw new Error('Custom field not found');
            }

            // Prevent deleting system fields
            if (field.isSystem) {
                throw new Error('Cannot delete system fields');
            }

            // Delete field (this will cascade delete values via post hook)
            await CustomField.findByIdAndDelete(fieldId);

            logger.info(`Custom field deleted: ${fieldId}`);

            return true;
        } catch (error) {
            logger.error('CustomFieldService.deleteField failed:', error.message);
            throw error;
        }
    }

    /**
     * Get all fields for an entity type
     * @param {String} entityType - Entity type
     * @param {String} firmId - Firm ID
     * @param {Object} options - Query options
     * @returns {Promise<Array>} - Custom fields
     */
    async getFields(entityType, firmId, options = {}) {
        try {
            return await CustomField.getFieldsForEntity(entityType, firmId, options);
        } catch (error) {
            logger.error('CustomFieldService.getFields failed:', error.message);
            throw error;
        }
    }

    /**
     * Get fields with values for a specific entity
     * @param {String} entityType - Entity type
     * @param {String} entityId - Entity ID
     * @param {String} firmId - Firm ID
     * @returns {Promise<Array>} - Fields with values
     */
    async getFieldsWithValues(entityType, entityId, firmId) {
        try {
            // Get all fields for entity type
            const fields = await CustomField.getFieldsForEntity(entityType, firmId);

            // Get all values for entity
            const values = await CustomFieldValue.getValuesForEntity(
                entityType,
                entityId,
                firmId
            );

            // Create value map by fieldId
            const valueMap = {};
            for (const value of values) {
                valueMap[value.fieldId._id.toString()] = value;
            }

            // Merge fields with values
            const fieldsWithValues = fields.map(field => {
                const value = valueMap[field._id.toString()];
                return {
                    ...field,
                    value: value ? value.value : field.defaultValue,
                    valueId: value ? value._id : null,
                    updatedAt: value ? value.updatedAt : null,
                    updatedBy: value ? value.updatedBy : null
                };
            });

            return fieldsWithValues;
        } catch (error) {
            logger.error('CustomFieldService.getFieldsWithValues failed:', error.message);
            throw error;
        }
    }

    /**
     * Set a custom field value
     * @param {String} fieldId - Field ID
     * @param {String} entityId - Entity ID
     * @param {*} value - Value to set
     * @param {String} userId - User ID
     * @param {String} firmId - Firm ID
     * @param {String} entityType - Entity type
     * @returns {Promise<Object>} - Updated value
     */
    async setValue(fieldId, entityId, value, userId, firmId, entityType) {
        try {
            return await CustomFieldValue.setValue(
                fieldId,
                entityId,
                value,
                userId,
                firmId,
                entityType
            );
        } catch (error) {
            logger.error('CustomFieldService.setValue failed:', error.message);
            throw error;
        }
    }

    /**
     * Set multiple custom field values for an entity
     * @param {String} entityType - Entity type
     * @param {String} entityId - Entity ID
     * @param {Object} fieldValues - Map of fieldKey -> value
     * @param {String} userId - User ID
     * @param {String} firmId - Firm ID
     * @returns {Promise<Object>} - Results and errors
     */
    async setValues(entityType, entityId, fieldValues, userId, firmId) {
        try {
            return await CustomFieldValue.setMultipleValues(
                entityType,
                entityId,
                fieldValues,
                userId,
                firmId
            );
        } catch (error) {
            logger.error('CustomFieldService.setValues failed:', error.message);
            throw error;
        }
    }

    /**
     * Get a single custom field value
     * @param {String} fieldId - Field ID
     * @param {String} entityId - Entity ID
     * @param {String} firmId - Firm ID
     * @returns {Promise<Object|null>} - Field value or null
     */
    async getValue(fieldId, entityId, firmId) {
        try {
            const value = await CustomFieldValue.findOne({
                firmId: new mongoose.Types.ObjectId(firmId),
                fieldId: new mongoose.Types.ObjectId(fieldId),
                entityId: new mongoose.Types.ObjectId(entityId)
            })
                .populate('fieldId')
                .populate('updatedBy', 'firstName lastName email')
                .lean();

            return value;
        } catch (error) {
            logger.error('CustomFieldService.getValue failed:', error.message);
            throw error;
        }
    }

    /**
     * Get all custom field values for an entity
     * @param {String} entityType - Entity type
     * @param {String} entityId - Entity ID
     * @param {String} firmId - Firm ID
     * @returns {Promise<Array>} - Field values
     */
    async getValues(entityType, entityId, firmId) {
        try {
            return await CustomFieldValue.getValuesForEntity(
                entityType,
                entityId,
                firmId
            );
        } catch (error) {
            logger.error('CustomFieldService.getValues failed:', error.message);
            throw error;
        }
    }

    /**
     * Search entities by custom field value
     * @param {String} fieldId - Field ID
     * @param {*} value - Value to search for
     * @param {String} firmId - Firm ID
     * @param {Object} options - Search options
     * @returns {Promise<Array>} - Entity IDs matching the search
     */
    async searchByCustomField(fieldId, value, firmId, options = {}) {
        try {
            return await CustomFieldValue.searchByValue(
                fieldId,
                value,
                firmId,
                options
            );
        } catch (error) {
            logger.error('CustomFieldService.searchByCustomField failed:', error.message);
            throw error;
        }
    }

    /**
     * Validate a value against field definition
     * @param {Object} field - Field definition
     * @param {*} value - Value to validate
     * @returns {Object} - { valid: Boolean, error: String }
     */
    validateValue(field, value) {
        try {
            // If field is an ID, fetch the field definition
            if (typeof field === 'string' || field instanceof mongoose.Types.ObjectId) {
                throw new Error('Please provide field definition object, not ID');
            }

            // Use field's validation method
            if (field.validateValue) {
                return field.validateValue(value);
            }

            // Fallback basic validation
            if (field.isRequired && (value === null || value === undefined || value === '')) {
                return {
                    valid: false,
                    error: `${field.name} is required`
                };
            }

            return { valid: true };
        } catch (error) {
            logger.error('CustomFieldService.validateValue failed:', error.message);
            return { valid: false, error: error.message };
        }
    }

    /**
     * Bulk update custom field values for multiple entities
     * @param {String} entityType - Entity type
     * @param {Array<String>} entityIds - Entity IDs
     * @param {String} fieldId - Field ID
     * @param {*} value - Value to set
     * @param {String} userId - User ID
     * @param {String} firmId - Firm ID
     * @returns {Promise<Object>} - Bulk operation results
     */
    async bulkSetValues(entityType, entityIds, fieldId, value, userId, firmId) {
        try {
            return await CustomFieldValue.bulkSetValue(
                entityType,
                entityIds,
                fieldId,
                value,
                userId,
                firmId
            );
        } catch (error) {
            logger.error('CustomFieldService.bulkSetValues failed:', error.message);
            throw error;
        }
    }

    /**
     * Delete all custom field values for an entity
     * @param {String} entityType - Entity type
     * @param {String} entityId - Entity ID
     * @param {String} firmId - Firm ID
     * @returns {Promise<Number>} - Number of deleted values
     */
    async deleteEntityValues(entityType, entityId, firmId) {
        try {
            return await CustomFieldValue.deleteEntityValues(
                entityType,
                entityId,
                firmId
            );
        } catch (error) {
            logger.error('CustomFieldService.deleteEntityValues failed:', error.message);
            throw error;
        }
    }

    /**
     * Get field statistics
     * @param {String} fieldId - Field ID
     * @param {String} firmId - Firm ID
     * @returns {Promise<Object>} - Field statistics
     */
    async getFieldStats(fieldId, firmId) {
        try {
            const field = await CustomField.findOne({
                _id: new mongoose.Types.ObjectId(fieldId),
                firmId: new mongoose.Types.ObjectId(firmId)
            });

            if (!field) {
                throw new Error('Custom field not found');
            }

            // Count total values
            const totalValues = await CustomFieldValue.countDocuments({
                firmId: new mongoose.Types.ObjectId(firmId),
                fieldId: new mongoose.Types.ObjectId(fieldId)
            });

            // Count non-null values
            const filledValues = await CustomFieldValue.countDocuments({
                firmId: new mongoose.Types.ObjectId(firmId),
                fieldId: new mongoose.Types.ObjectId(fieldId),
                value: { $ne: null, $exists: true }
            });

            // Get value distribution for select fields
            let distribution = null;
            if (['select', 'multiselect'].includes(field.fieldType)) {
                distribution = await CustomFieldValue.aggregate([
                    {
                        $match: {
                            firmId: new mongoose.Types.ObjectId(firmId),
                            fieldId: new mongoose.Types.ObjectId(fieldId),
                            value: { $ne: null }
                        }
                    },
                    {
                        $group: {
                            _id: '$value',
                            count: { $sum: 1 }
                        }
                    },
                    { $sort: { count: -1 } }
                ]).option('bypassFirmFilter', true);
            }

            return {
                field: {
                    id: field._id,
                    name: field.name,
                    fieldKey: field.fieldKey,
                    fieldType: field.fieldType,
                    entityType: field.entityType
                },
                stats: {
                    totalValues,
                    filledValues,
                    emptyValues: totalValues - filledValues,
                    fillRate: totalValues > 0 ? (filledValues / totalValues) * 100 : 0,
                    distribution
                }
            };
        } catch (error) {
            logger.error('CustomFieldService.getFieldStats failed:', error.message);
            throw error;
        }
    }

    /**
     * Export custom field configuration
     * @param {String} entityType - Entity type
     * @param {String} firmId - Firm ID
     * @returns {Promise<Array>} - Field definitions for export
     */
    async exportFields(entityType, firmId) {
        try {
            const fields = await CustomField.find({
                firmId: new mongoose.Types.ObjectId(firmId),
                entityType
            }).lean();

            // Remove internal fields
            return fields.map(field => {
                const { _id, firmId, createdBy, updatedBy, createdAt, updatedAt, ...exportData } = field;
                return exportData;
            });
        } catch (error) {
            logger.error('CustomFieldService.exportFields failed:', error.message);
            throw error;
        }
    }

    /**
     * Import custom field configuration
     * @param {String} entityType - Entity type
     * @param {Array} fields - Field definitions to import
     * @param {String} userId - User ID
     * @param {String} firmId - Firm ID
     * @param {Object} options - Import options
     * @returns {Promise<Object>} - Import results
     */
    async importFields(entityType, fields, userId, firmId, options = {}) {
        try {
            const results = {
                created: [],
                updated: [],
                errors: []
            };

            for (const fieldData of fields) {
                try {
                    // Check if field exists
                    const existingField = await CustomField.findOne({
                        firmId: new mongoose.Types.ObjectId(firmId),
                        entityType,
                        fieldKey: fieldData.fieldKey
                    });

                    if (existingField) {
                        if (options.overwrite) {
                            // Update existing field
                            const updated = await this.updateField(
                                existingField._id.toString(),
                                fieldData,
                                userId,
                                firmId
                            );
                            results.updated.push(updated);
                        } else {
                            results.errors.push({
                                fieldKey: fieldData.fieldKey,
                                error: 'Field already exists (use overwrite option to update)'
                            });
                        }
                    } else {
                        // Create new field
                        const created = await this.createField(
                            { ...fieldData, entityType },
                            userId,
                            firmId
                        );
                        results.created.push(created);
                    }
                } catch (error) {
                    results.errors.push({
                        fieldKey: fieldData.fieldKey,
                        error: error.message
                    });
                }
            }

            logger.info(`Custom fields import completed: ${results.created.length} created, ${results.updated.length} updated, ${results.errors.length} errors`);

            return results;
        } catch (error) {
            logger.error('CustomFieldService.importFields failed:', error.message);
            throw error;
        }
    }

    /**
     * Check field dependencies for an entity
     * @param {String} entityType - Entity type
     * @param {String} entityId - Entity ID
     * @param {String} firmId - Firm ID
     * @returns {Promise<Object>} - Map of fieldKey -> shouldShow
     */
    async checkDependencies(entityType, entityId, firmId) {
        try {
            // Get all fields for entity type
            const fields = await CustomField.getFieldsForEntity(entityType, firmId);

            // Get all values for entity
            const values = await CustomFieldValue.getValuesForEntity(
                entityType,
                entityId,
                firmId
            );

            // Create value map by fieldKey
            const valueMap = {};
            for (const value of values) {
                if (value.fieldId) {
                    valueMap[value.fieldId.fieldKey] = value.value;
                }
            }

            // Check dependencies
            const visibility = {};

            for (const field of fields) {
                let shouldShow = true;

                if (field.dependencies && field.dependencies.length > 0) {
                    shouldShow = this._evaluateDependencies(field.dependencies, valueMap);
                }

                visibility[field.fieldKey] = shouldShow;
            }

            return visibility;
        } catch (error) {
            logger.error('CustomFieldService.checkDependencies failed:', error.message);
            throw error;
        }
    }

    /**
     * Evaluate field dependencies
     * @private
     * @param {Array} dependencies - Dependency rules
     * @param {Object} valueMap - Map of fieldKey -> value
     * @returns {Boolean} - True if all dependencies are met
     */
    _evaluateDependencies(dependencies, valueMap) {
        for (const dep of dependencies) {
            const value = valueMap[dep.fieldKey];
            let conditionMet = false;

            switch (dep.operator) {
                case 'equals':
                    conditionMet = value === dep.value;
                    break;
                case 'not_equals':
                    conditionMet = value !== dep.value;
                    break;
                case 'contains':
                    conditionMet = value && value.toString().includes(dep.value);
                    break;
                case 'not_contains':
                    conditionMet = !value || !value.toString().includes(dep.value);
                    break;
                case 'greater_than':
                    conditionMet = value > dep.value;
                    break;
                case 'less_than':
                    conditionMet = value < dep.value;
                    break;
                case 'is_empty':
                    conditionMet = !value || value === '' || value === null || value === undefined;
                    break;
                case 'is_not_empty':
                    conditionMet = value && value !== '' && value !== null && value !== undefined;
                    break;
                default:
                    conditionMet = false;
            }

            // If any dependency is not met, field should not be shown
            if (!conditionMet) {
                return false;
            }
        }

        // All dependencies met
        return true;
    }
}

// Export singleton instance
module.exports = new CustomFieldService();
