const mongoose = require('mongoose');
const csv = require('csv-parser');
const { Parser } = require('json2csv');
const XLSX = require('xlsx');
const { Readable } = require('stream');
const Lead = require('../models/lead.model');
const Contact = require('../models/contact.model');
const Client = require('../models/client.model');
const logger = require('../utils/logger');

/**
 * Import/Export Service
 * Handles bulk data import and export for CRM entities
 */
class ImportExportService {
    constructor() {
        // Field mappings for each entity type
        this.fieldMappings = {
            lead: {
                'First Name': 'firstName',
                'Last Name': 'lastName',
                'Email': 'email',
                'Phone': 'phone',
                'Mobile': 'mobile',
                'Company': 'companyName',
                'Status': 'status',
                'Source': 'source.type',
                'Expected Revenue': 'estimatedValue',
                'Probability': 'probability',
                'Industry': 'industry',
                'Website': 'website',
                'Address': 'address.street',
                'City': 'address.city',
                'State': 'address.state',
                'Country': 'address.country',
                'Postal Code': 'address.postalCode',
                'Notes': 'notes'
            },
            contact: {
                'First Name': 'firstName',
                'Last Name': 'lastName',
                'Email': 'email',
                'Phone': 'phone',
                'Mobile': 'mobile',
                'Company': 'company',
                'Title': 'title',
                'Type': 'type',
                'Role': 'primaryRole',
                'Address': 'address',
                'City': 'city',
                'Notes': 'notes'
            },
            client: {
                'Client Number': 'clientNumber',
                'First Name': 'firstName',
                'Last Name': 'lastName',
                'Company Name': 'companyName',
                'Client Type': 'clientType',
                'Email': 'email',
                'Phone': 'phone',
                'Mobile': 'mobile',
                'National ID': 'nationalId',
                'CR Number': 'crNumber',
                'Status': 'status',
                'Notes': 'generalNotes'
            }
        };
    }

    /**
     * Import data from CSV
     * @param {Buffer|string} csvData - CSV file content
     * @param {string} entityType - 'lead', 'contact', or 'client'
     * @param {Object} options - Import options
     */
    async importFromCsv(csvData, entityType, options = {}) {
        const { firmId, lawyerId, userId, fieldMapping, duplicateHandling = 'skip' } = options;

        if (!firmId) throw new Error('firmId is required');

        const Model = this.getModel(entityType);
        const results = {
            total: 0,
            imported: 0,
            skipped: 0,
            errors: [],
            duplicates: []
        };

        // Parse CSV
        const records = await this.parseCsv(csvData);
        results.total = records.length;

        // Get field mapping
        const mapping = fieldMapping || this.fieldMappings[entityType];

        // Process each record
        for (let i = 0; i < records.length; i++) {
            try {
                const row = records[i];
                const data = this.mapFields(row, mapping);

                // Add required fields
                data.firmId = firmId;
                data.lawyerId = lawyerId;
                data.createdBy = userId;

                // Check for duplicates
                const duplicate = await this.checkDuplicate(Model, entityType, data, firmId);

                if (duplicate) {
                    if (duplicateHandling === 'skip') {
                        results.skipped++;
                        results.duplicates.push({ row: i + 1, reason: 'Duplicate found', data: row });
                        continue;
                    } else if (duplicateHandling === 'update') {
                        await Model.findOneAndUpdate(
                            { _id: duplicate._id, firmId },
                            { $set: data }
                        );
                        results.imported++;
                        continue;
                    }
                    // 'create' - create anyway
                }

                // Create new record
                await Model.create(data);
                results.imported++;

            } catch (error) {
                results.errors.push({
                    row: i + 1,
                    error: error.message,
                    data: records[i]
                });
            }
        }

        logger.info(`Import completed: ${results.imported}/${results.total} ${entityType}s imported`);
        return results;
    }

    /**
     * Import from Excel
     */
    async importFromExcel(excelBuffer, entityType, options = {}) {
        const workbook = XLSX.read(excelBuffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        // Convert to JSON
        const records = XLSX.utils.sheet_to_json(sheet);

        // Convert to CSV format and use CSV import
        const csvData = this.jsonToCsv(records);
        return this.importFromCsv(csvData, entityType, options);
    }

    /**
     * Export to CSV
     * @param {string} entityType - Entity type to export
     * @param {ObjectId} firmId - Firm ID
     * @param {Object} options - Export options
     */
    async exportToCsv(entityType, firmId, options = {}) {
        const Model = this.getModel(entityType);
        const { filters = {}, fields, limit = 10000 } = options;

        const query = { firmId, status: { $ne: 'archived' }, ...filters };

        const records = await Model.find(query)
            .limit(limit)
            .lean();

        if (records.length === 0) {
            return '';
        }

        // Get fields to export
        const exportFields = fields || this.getExportFields(entityType);

        // Transform records for export
        const transformedRecords = records.map(record =>
            this.transformForExport(record, entityType, exportFields)
        );

        // Generate CSV
        const parser = new Parser({ fields: exportFields });
        const csv = parser.parse(transformedRecords);

        return csv;
    }

    /**
     * Export to Excel
     */
    async exportToExcel(entityType, firmId, options = {}) {
        const Model = this.getModel(entityType);
        const { filters = {}, fields, limit = 10000 } = options;

        const query = { firmId, status: { $ne: 'archived' }, ...filters };

        const records = await Model.find(query)
            .limit(limit)
            .lean();

        if (records.length === 0) {
            return null;
        }

        // Get fields to export
        const exportFields = fields || this.getExportFields(entityType);

        // Transform records
        const transformedRecords = records.map(record =>
            this.transformForExport(record, entityType, exportFields)
        );

        // Create workbook
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(transformedRecords);

        XLSX.utils.book_append_sheet(workbook, worksheet, entityType.charAt(0).toUpperCase() + entityType.slice(1) + 's');

        // Return buffer
        return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    }

    /**
     * Get field mapping template for an entity
     */
    getFieldMappingTemplate(entityType) {
        const mapping = this.fieldMappings[entityType];
        if (!mapping) throw new Error(`Unknown entity type: ${entityType}`);

        return {
            entityType,
            requiredFields: this.getRequiredFields(entityType),
            availableFields: Object.keys(mapping),
            fieldMapping: mapping,
            sampleRow: this.getSampleRow(entityType)
        };
    }

    /**
     * Validate import data before processing
     */
    async validateImportData(csvData, entityType, options = {}) {
        const records = await this.parseCsv(csvData);
        const mapping = options.fieldMapping || this.fieldMappings[entityType];
        const requiredFields = this.getRequiredFields(entityType);

        const validation = {
            totalRows: records.length,
            validRows: 0,
            invalidRows: 0,
            errors: [],
            warnings: [],
            preview: []
        };

        // Check if CSV has required columns
        if (records.length > 0) {
            const csvColumns = Object.keys(records[0]);
            const mappedColumns = Object.keys(mapping);

            const missingRequired = requiredFields.filter(field => {
                const mappedField = Object.entries(mapping).find(([k, v]) => v === field);
                return mappedField && !csvColumns.includes(mappedField[0]);
            });

            if (missingRequired.length > 0) {
                validation.errors.push({
                    type: 'missing_columns',
                    message: `Missing required columns: ${missingRequired.join(', ')}`
                });
            }
        }

        // Validate each row
        for (let i = 0; i < Math.min(records.length, 100); i++) {
            const row = records[i];
            const data = this.mapFields(row, mapping);
            const rowErrors = this.validateRow(data, entityType, requiredFields);

            if (rowErrors.length > 0) {
                validation.invalidRows++;
                validation.errors.push({
                    row: i + 1,
                    errors: rowErrors
                });
            } else {
                validation.validRows++;
            }

            // Add to preview
            if (i < 5) {
                validation.preview.push(data);
            }
        }

        if (records.length > 100) {
            validation.warnings.push({
                type: 'partial_validation',
                message: `Only first 100 rows were validated. Total rows: ${records.length}`
            });
        }

        return validation;
    }

    // Helper methods

    getModel(entityType) {
        switch (entityType.toLowerCase()) {
            case 'lead': return Lead;
            case 'contact': return Contact;
            case 'client': return Client;
            default: throw new Error(`Unknown entity type: ${entityType}`);
        }
    }

    async parseCsv(csvData) {
        return new Promise((resolve, reject) => {
            const records = [];
            const stream = Readable.from(csvData.toString());

            stream
                .pipe(csv())
                .on('data', row => records.push(row))
                .on('end', () => resolve(records))
                .on('error', reject);
        });
    }

    mapFields(row, mapping) {
        const result = {};

        for (const [csvField, modelField] of Object.entries(mapping)) {
            if (row[csvField] !== undefined && row[csvField] !== '') {
                this.setNestedValue(result, modelField, row[csvField]);
            }
        }

        return result;
    }

    setNestedValue(obj, path, value) {
        const parts = path.split('.');
        let current = obj;

        for (let i = 0; i < parts.length - 1; i++) {
            if (!current[parts[i]]) {
                current[parts[i]] = {};
            }
            current = current[parts[i]];
        }

        current[parts[parts.length - 1]] = value;
    }

    async checkDuplicate(Model, entityType, data, firmId) {
        const query = { firmId };

        // Check by email
        if (data.email) {
            const emailMatch = await Model.findOne({ ...query, email: data.email.toLowerCase() });
            if (emailMatch) return emailMatch;
        }

        // Check by phone
        if (data.phone) {
            const phoneMatch = await Model.findOne({ ...query, phone: data.phone });
            if (phoneMatch) return phoneMatch;
        }

        // Check by national ID
        if (data.nationalId) {
            const idMatch = await Model.findOne({ ...query, nationalId: data.nationalId });
            if (idMatch) return idMatch;
        }

        return null;
    }

    getRequiredFields(entityType) {
        switch (entityType) {
            case 'lead':
                return ['firstName', 'email'];
            case 'contact':
                return ['firstName'];
            case 'client':
                return ['clientType'];
            default:
                return [];
        }
    }

    getExportFields(entityType) {
        const mapping = this.fieldMappings[entityType];
        return Object.keys(mapping);
    }

    transformForExport(record, entityType, fields) {
        const mapping = this.fieldMappings[entityType];
        const result = {};

        for (const field of fields) {
            const modelField = mapping[field];
            if (modelField) {
                result[field] = this.getNestedValue(record, modelField) || '';
            }
        }

        // Add ID for reference
        result['ID'] = record._id?.toString() || '';
        result['Created At'] = record.createdAt ? new Date(record.createdAt).toISOString() : '';

        return result;
    }

    getNestedValue(obj, path) {
        const parts = path.split('.');
        let current = obj;

        for (const part of parts) {
            if (current === null || current === undefined) return undefined;
            current = current[part];
        }

        return current;
    }

    validateRow(data, entityType, requiredFields) {
        const errors = [];

        for (const field of requiredFields) {
            const value = this.getNestedValue(data, field);
            if (!value || value.toString().trim() === '') {
                errors.push(`Missing required field: ${field}`);
            }
        }

        // Email validation
        if (data.email && !this.isValidEmail(data.email)) {
            errors.push('Invalid email format');
        }

        // Phone validation
        if (data.phone && !this.isValidPhone(data.phone)) {
            errors.push('Invalid phone format');
        }

        return errors;
    }

    isValidEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    isValidPhone(phone) {
        const cleaned = phone.replace(/\D/g, '');
        return cleaned.length >= 9 && cleaned.length <= 15;
    }

    jsonToCsv(records) {
        if (records.length === 0) return '';
        const parser = new Parser();
        return parser.parse(records);
    }

    getSampleRow(entityType) {
        const samples = {
            lead: {
                'First Name': 'John',
                'Last Name': 'Doe',
                'Email': 'john@example.com',
                'Phone': '+966501234567',
                'Company': 'Acme Corp',
                'Status': 'new',
                'Source': 'website'
            },
            contact: {
                'First Name': 'Jane',
                'Last Name': 'Smith',
                'Email': 'jane@example.com',
                'Phone': '+966509876543',
                'Company': 'Smith & Co',
                'Title': 'Manager'
            },
            client: {
                'First Name': 'Ahmed',
                'Last Name': 'Al-Saud',
                'Email': 'ahmed@company.sa',
                'Phone': '+966551234567',
                'Client Type': 'individual',
                'National ID': '1234567890'
            }
        };

        return samples[entityType] || {};
    }
}

module.exports = new ImportExportService();
