#!/usr/bin/env node
/**
 * Contract Generator V2 - Full Automation
 *
 * Extracts TypeScript contracts from:
 * 1. Mongoose models → Entity interfaces
 * 2. Joi validators → Request/Response types
 * 3. Controllers → Additional context
 *
 * Usage: npm run contracts:full
 */

const fs = require('fs');
const path = require('path');

const MODELS_DIR = path.join(__dirname, '../src/models');
const VALIDATORS_DIR = path.join(__dirname, '../src/validators');
const CONTROLLERS_DIR = path.join(__dirname, '../src/controllers');
const OUTPUT_DIR = path.join(__dirname, '../contract2/generated');
const ENDPOINTS_FILE = path.join(__dirname, '../docs/api-endpoints.json');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * Map Joi types to TypeScript
 */
const joiToTS = {
    'string': 'string',
    'number': 'number',
    'boolean': 'boolean',
    'date': 'string', // ISO string
    'array': 'any[]',
    'object': 'Record<string, any>',
    'hex': 'string', // ObjectId
    'alternatives': 'any',
};

/**
 * Extract fields from Joi schema definition
 */
function extractJoiFields(content, schemaName) {
    const fields = [];

    // Find the schema definition
    const schemaRegex = new RegExp(`const\\s+${schemaName}\\s*=\\s*Joi\\.object\\(\\{([\\s\\S]*?)\\}\\)(?:\\.\\w+\\([^)]*\\))*;`, 'm');
    const match = content.match(schemaRegex);

    if (!match) return fields;

    const schemaBody = match[1];

    // Extract field definitions
    // Pattern: fieldName: Joi.type().modifiers()
    const fieldRegex = /(\w+):\s*Joi\.(\w+)\(\)([^,\n]*(?:\n\s*\.[^,\n]*)*)/g;

    let fieldMatch;
    while ((fieldMatch = fieldRegex.exec(schemaBody)) !== null) {
        const fieldName = fieldMatch[1];
        const joiType = fieldMatch[2];
        const modifiers = fieldMatch[3] || '';

        let tsType = joiToTS[joiType] || 'any';
        let isRequired = !modifiers.includes('.allow(') && !modifiers.includes('.optional()');
        let isArray = joiType === 'array';
        let enumValues = null;

        // Extract .valid() enum values
        const validMatch = modifiers.match(/\.valid\(([^)]+)\)/);
        if (validMatch) {
            const values = validMatch[1]
                .split(',')
                .map(v => v.trim().replace(/['"]/g, ''))
                .filter(v => v && !v.includes('null'));
            if (values.length > 0) {
                tsType = values.map(v => `'${v}'`).join(' | ');
            }
        }

        // Extract .items() for arrays
        const itemsMatch = modifiers.match(/\.items\((\w+)\)/);
        if (itemsMatch && isArray) {
            const itemType = itemsMatch[1];
            if (itemType.endsWith('Schema')) {
                // Reference to another schema
                const typeName = itemType.replace('Schema', '');
                tsType = `${typeName.charAt(0).toUpperCase() + typeName.slice(1)}Item[]`;
            }
        }

        // Check for .hex().length(24) = ObjectId
        if (modifiers.includes('.hex()') && modifiers.includes('.length(24)')) {
            tsType = 'string'; // ObjectId
        }

        // Check for .default()
        const defaultMatch = modifiers.match(/\.default\(([^)]+)\)/);
        if (defaultMatch) {
            isRequired = false; // Has default, so not required in request
        }

        fields.push({
            name: fieldName,
            type: tsType,
            isRequired,
            isArray,
            enumValues
        });
    }

    return fields;
}

/**
 * Extract all schemas from a validator file
 */
function extractValidatorSchemas(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const fileName = path.basename(filePath, '.js').replace('.validator', '');
    const schemas = {};

    // Find all exported schema names
    const schemaNames = [];

    // Match: const xyzSchema = Joi.object({
    const schemaDefRegex = /const\s+(\w+Schema)\s*=\s*Joi\.object\(/g;
    let match;
    while ((match = schemaDefRegex.exec(content)) !== null) {
        schemaNames.push(match[1]);
    }

    // Also check exports
    const exportsMatch = content.match(/module\.exports\s*=\s*\{([^}]+)\}/);
    if (exportsMatch) {
        const exportedNames = exportsMatch[1].match(/\w+Schema/g) || [];
        schemaNames.push(...exportedNames);
    }

    // Extract fields for each schema
    for (const schemaName of [...new Set(schemaNames)]) {
        const fields = extractJoiFields(content, schemaName);
        if (fields.length > 0) {
            schemas[schemaName] = {
                name: schemaName,
                fields,
                module: fileName
            };
        }
    }

    return schemas;
}

/**
 * Generate TypeScript interface from Joi schema
 */
function generateInterfaceFromSchema(schema, baseName) {
    const lines = [];
    const interfaceName = schema.name
        .replace('Schema', '')
        .replace(/^create/i, 'Create')
        .replace(/^update/i, 'Update')
        .replace(/^record/i, 'Record');

    // Capitalize first letter
    const finalName = interfaceName.charAt(0).toUpperCase() + interfaceName.slice(1);

    lines.push(`export interface ${finalName}Request {`);

    for (const field of schema.fields) {
        const optional = field.isRequired ? '' : '?';
        lines.push(`  ${field.name}${optional}: ${field.type};`);
    }

    lines.push(`}`);

    return lines.join('\n');
}

/**
 * Process all validators and generate complete contracts
 */
function generateFullContracts() {
    console.log('🔍 Scanning validators for Joi schemas...\n');

    const validatorFiles = fs.existsSync(VALIDATORS_DIR)
        ? fs.readdirSync(VALIDATORS_DIR).filter(f => f.endsWith('.validator.js'))
        : [];

    const allSchemas = {};
    const moduleContracts = {};

    // Extract schemas from all validators
    for (const file of validatorFiles) {
        try {
            const schemas = extractValidatorSchemas(path.join(VALIDATORS_DIR, file));
            const moduleName = file.replace('.validator.js', '');

            if (Object.keys(schemas).length > 0) {
                allSchemas[moduleName] = schemas;
                console.log(`  ✓ ${moduleName}: ${Object.keys(schemas).length} schemas`);
            }
        } catch (err) {
            console.log(`  ⚠ ${file}: ${err.message}`);
        }
    }

    console.log(`\n📊 Found ${Object.keys(allSchemas).length} modules with validators\n`);

    // Generate contracts per module
    for (const [moduleName, schemas] of Object.entries(allSchemas)) {
        const lines = [];
        const baseName = moduleName.charAt(0).toUpperCase() + moduleName.slice(1);

        lines.push(`/**`);
        lines.push(` * ${baseName} API Contracts`);
        lines.push(` * Auto-generated from Joi validators`);
        lines.push(` * Generated: ${new Date().toISOString().split('T')[0]}`);
        lines.push(` */`);
        lines.push('');
        lines.push(`import { ApiResponse, PaginatedResponse } from './common';`);
        lines.push(`import { ${baseName} } from './models';`);
        lines.push('');

        // Add standard response types
        lines.push(`// Standard Response Types`);
        lines.push(`export type ${baseName}Response = ApiResponse<${baseName}>;`);
        lines.push(`export type ${baseName}ListResponse = PaginatedResponse<${baseName}>;`);
        lines.push('');

        // Generate interfaces for each schema
        for (const schema of Object.values(schemas)) {
            lines.push(`// From: ${schema.name}`);
            lines.push(generateInterfaceFromSchema(schema, baseName));
            lines.push('');
        }

        moduleContracts[moduleName] = lines.join('\n');
    }

    // Write contract files
    let generated = 0;
    for (const [moduleName, content] of Object.entries(moduleContracts)) {
        const outputPath = path.join(OUTPUT_DIR, `${moduleName}.contracts.ts`);
        fs.writeFileSync(outputPath, content);
        generated++;
    }

    console.log(`✅ Generated ${generated} complete contract files`);
    console.log(`📁 Output: contract2/generated/*.contracts.ts`);

    return moduleContracts;
}

/**
 * Generate common types file
 */
function generateCommonTypes() {
    const content = `/**
 * Common API Types
 * Auto-generated - shared across all modules
 * Generated: ${new Date().toISOString().split('T')[0]}
 */

// ═══════════════════════════════════════════════════════════════
// STANDARD API RESPONSE TYPES
// ═══════════════════════════════════════════════════════════════

export interface ApiResponse<T = any> {
  success: boolean;
  error?: boolean;
  message?: string;
  messageEn?: string;
  messageAr?: string;
  data?: T;
  code?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface ErrorResponse {
  error: boolean;
  success: false;
  message: string;
  messageEn?: string;
  messageAr?: string;
  code?: string;
  details?: any[];
  errors?: string[];
}

// ═══════════════════════════════════════════════════════════════
// COMMON REQUEST TYPES
// ═══════════════════════════════════════════════════════════════

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface SearchParams extends PaginationParams {
  search?: string;
  q?: string;
}

export interface DateRangeParams {
  startDate?: string;
  endDate?: string;
  period?: 'week' | 'month' | 'quarter' | 'year';
}

export interface IdParam {
  id: string;
}

// ═══════════════════════════════════════════════════════════════
// COMMON FIELD TYPES
// ═══════════════════════════════════════════════════════════════

export type ObjectId = string;
export type ISODateString = string;
export type Currency = 'SAR' | 'USD' | 'EUR' | 'GBP' | 'AED';

// ═══════════════════════════════════════════════════════════════
// AUDIT FIELDS (included in most entities)
// ═══════════════════════════════════════════════════════════════

export interface AuditFields {
  createdAt: ISODateString;
  updatedAt: ISODateString;
  createdBy?: ObjectId;
  updatedBy?: ObjectId;
}

export interface SoftDeleteFields {
  isDeleted?: boolean;
  deletedAt?: ISODateString;
  deletedBy?: ObjectId;
}

// ═══════════════════════════════════════════════════════════════
// STATUS ENUMS (commonly used across modules)
// ═══════════════════════════════════════════════════════════════

export type CommonStatus = 'active' | 'inactive' | 'pending' | 'archived';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
export type PaymentStatus = 'pending' | 'partial' | 'paid' | 'overdue' | 'refunded';

// ═══════════════════════════════════════════════════════════════
// BULK OPERATION TYPES
// ═══════════════════════════════════════════════════════════════

export interface BulkDeleteRequest {
  ids: string[];
}

export interface BulkUpdateRequest<T> {
  ids: string[];
  data: Partial<T>;
}

export interface BulkOperationResponse {
  success: boolean;
  processed: number;
  failed: number;
  errors?: Array<{ id: string; error: string }>;
}
`;

    fs.writeFileSync(path.join(OUTPUT_DIR, 'common.ts'), content);
    console.log('📝 Generated: contract2/generated/common.ts');
}

/**
 * Generate index file that exports all contracts
 */
function generateIndexFile() {
    const files = fs.readdirSync(OUTPUT_DIR)
        .filter(f => f.endsWith('.ts') && f !== 'index.ts');

    const lines = [`/**`, ` * Auto-generated index - exports all contracts`, ` */`, ''];

    for (const file of files.sort()) {
        const moduleName = file.replace('.ts', '');
        lines.push(`export * from './${moduleName}';`);
    }

    fs.writeFileSync(path.join(OUTPUT_DIR, 'index.ts'), lines.join('\n'));
    console.log('📝 Generated: contract2/generated/index.ts');
}

/**
 * Main execution
 */
function main() {
    console.log('🔄 Contract Generator V2 - Full Automation\n');

    // Generate common types first
    generateCommonTypes();
    console.log('');

    // Generate contracts from validators
    generateFullContracts();
    console.log('');

    // Generate index file
    generateIndexFile();

    console.log('\n✅ Contract generation complete!');
    console.log('\n📋 Generated files:');
    console.log('   - common.ts (shared types)');
    console.log('   - *.contracts.ts (request/response types from validators)');
    console.log('   - index.ts (barrel export)');
    console.log('\n💡 Combine with models.ts for complete type coverage');
}

main();
