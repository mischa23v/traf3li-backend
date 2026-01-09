#!/usr/bin/env node
/**
 * Contract Generator for Frontend Team
 *
 * Automates TypeScript contract generation from:
 * 1. Mongoose schemas → TypeScript interfaces (ACCURATE)
 * 2. Controller ALLOWED_FIELDS → Request types (for reference only)
 *
 * NOTE: Stub generation has been removed - stubs contained guessed types
 * that could break API connections. Use generateContractsV2.js for
 * accurate request types from Joi validators.
 *
 * Usage:
 *   npm run contracts:generate          # Generate model types
 *   npm run contracts:models            # Only model types
 *   npm run contracts:coverage          # Coverage report
 *   npm run contracts:sync              # Check if contracts are stale
 */

const fs = require('fs');
const path = require('path');

const MODELS_DIR = path.join(__dirname, '../src/models');
const CONTROLLERS_DIR = path.join(__dirname, '../src/controllers');
const OUTPUT_DIR = path.join(__dirname, '../contract2/generated');
const ENDPOINTS_FILE = path.join(__dirname, '../docs/api-endpoints.json');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * Map Mongoose types to TypeScript types
 */
const mongooseToTS = {
    'String': 'string',
    'Number': 'number',
    'Boolean': 'boolean',
    'Date': 'string', // ISO date string in JSON
    'ObjectId': 'string',
    'Schema.Types.ObjectId': 'string',
    'mongoose.Schema.Types.ObjectId': 'string',
    'Mixed': 'any',
    'Schema.Types.Mixed': 'any',
    'Buffer': 'string', // Base64 in JSON
    'Map': 'Record<string, any>',
    'Array': 'any[]',
};

/**
 * Extract schema fields from a model file
 */
function extractSchemaFromFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const fileName = path.basename(filePath, '.js').replace('.model', '');

    const fields = [];
    const enums = {};

    // Match field definitions in schema
    // Pattern: fieldName: { type: Type, ... } or fieldName: Type
    const schemaRegex = /(\w+):\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}|(\w+):\s*\[?\s*(String|Number|Boolean|Date|ObjectId|Schema\.Types\.ObjectId|mongoose\.Schema\.Types\.ObjectId)/g;

    let match;
    while ((match = schemaRegex.exec(content)) !== null) {
        const fieldName = match[1] || match[3];
        const fieldDef = match[2] || '';
        const simpleType = match[4];

        // Skip internal mongoose fields
        if (['timestamps', 'versionKey', '_id', '__v'].includes(fieldName)) continue;

        // Skip if inside a function or method
        if (content.substring(Math.max(0, match.index - 50), match.index).includes('function')) continue;

        let tsType = 'any';
        let isRequired = false;
        let isArray = false;
        let enumValues = null;
        let ref = null;

        if (simpleType) {
            tsType = mongooseToTS[simpleType] || 'any';
        } else if (fieldDef) {
            // Extract type
            const typeMatch = fieldDef.match(/type:\s*(\[?\s*)?(\w+(?:\.\w+)*)/);
            if (typeMatch) {
                isArray = typeMatch[1]?.includes('[') || fieldDef.includes('[{');
                const mongoType = typeMatch[2];
                tsType = mongooseToTS[mongoType] || 'any';
            }

            // Check if required
            isRequired = /required:\s*true/.test(fieldDef);

            // Extract enum values
            const enumMatch = fieldDef.match(/enum:\s*\[([^\]]+)\]/);
            if (enumMatch) {
                enumValues = enumMatch[1]
                    .split(',')
                    .map(v => v.trim().replace(/['"]/g, ''))
                    .filter(v => v);
                tsType = enumValues.map(v => `'${v}'`).join(' | ');
            }

            // Extract ref for ObjectId
            const refMatch = fieldDef.match(/ref:\s*['"](\w+)['"]/);
            if (refMatch) {
                ref = refMatch[1];
            }
        }

        // Check if array from outer context
        const beforeField = content.substring(Math.max(0, match.index - 5), match.index);
        if (beforeField.includes('[') && !beforeField.includes(']')) {
            isArray = true;
        }

        fields.push({
            name: fieldName,
            type: tsType,
            isRequired,
            isArray,
            ref,
            enumValues
        });
    }

    return {
        modelName: fileName,
        fields: fields.filter(f => !['firmId', 'lawyerId', 'createdBy', 'updatedBy', 'isDeleted', 'deletedAt'].includes(f.name))
    };
}

/**
 * Generate TypeScript interface from schema
 */
function generateInterface(schema) {
    const lines = [];
    const interfaceName = schema.modelName.charAt(0).toUpperCase() + schema.modelName.slice(1);

    lines.push(`export interface ${interfaceName} {`);
    lines.push(`  _id: string;`);

    for (const field of schema.fields) {
        const optional = field.isRequired ? '' : '?';
        let type = field.type;

        if (field.isArray) {
            type = `${type}[]`;
        }

        const comment = field.ref ? ` // Ref: ${field.ref}` : '';
        lines.push(`  ${field.name}${optional}: ${type};${comment}`);
    }

    lines.push(`  createdAt: string;`);
    lines.push(`  updatedAt: string;`);
    lines.push(`}`);

    return lines.join('\n');
}

/**
 * Extract ALLOWED_FIELDS from controller
 */
function extractAllowedFields(controllerPath) {
    if (!fs.existsSync(controllerPath)) return null;

    const content = fs.readFileSync(controllerPath, 'utf8');
    const result = {
        CREATE: [],
        UPDATE: []
    };

    // Match ALLOWED_FIELDS or ALLOWED_CREATE_FIELDS patterns
    const createMatch = content.match(/(?:ALLOWED_(?:CREATE_)?FIELDS|CREATE)\s*[=:]\s*\[([^\]]+)\]/);
    const updateMatch = content.match(/(?:ALLOWED_UPDATE_FIELDS|UPDATE)\s*[=:]\s*\[([^\]]+)\]/);

    if (createMatch) {
        result.CREATE = createMatch[1]
            .split(',')
            .map(f => f.trim().replace(/['"]/g, ''))
            .filter(f => f);
    }

    if (updateMatch) {
        result.UPDATE = updateMatch[1]
            .split(',')
            .map(f => f.trim().replace(/['"]/g, ''))
            .filter(f => f);
    }

    return result;
}

/**
 * Generate request types from allowed fields
 */
function generateRequestTypes(modelName, allowedFields, schema) {
    const lines = [];
    const baseName = modelName.charAt(0).toUpperCase() + modelName.slice(1);

    if (allowedFields.CREATE.length > 0) {
        lines.push(`export interface Create${baseName}Request {`);
        for (const fieldName of allowedFields.CREATE) {
            const schemaField = schema?.fields?.find(f => f.name === fieldName);
            const type = schemaField?.type || 'any';
            const optional = schemaField?.isRequired ? '' : '?';
            lines.push(`  ${fieldName}${optional}: ${type};`);
        }
        lines.push(`}`);
        lines.push('');
    }

    if (allowedFields.UPDATE.length > 0) {
        lines.push(`export interface Update${baseName}Request {`);
        for (const fieldName of allowedFields.UPDATE) {
            const schemaField = schema?.fields?.find(f => f.name === fieldName);
            const type = schemaField?.type || 'any';
            lines.push(`  ${fieldName}?: ${type};`);
        }
        lines.push(`}`);
    }

    return lines.join('\n');
}

/**
 * Generate coverage report
 */
function generateCoverageReport() {
    if (!fs.existsSync(ENDPOINTS_FILE)) {
        console.log('⚠️  Run npm run docs:api first to generate endpoints');
        return;
    }

    const endpoints = JSON.parse(fs.readFileSync(ENDPOINTS_FILE, 'utf8'));
    const existingContracts = new Set();

    // Scan existing contract files for defined interfaces
    const contractDir = path.join(__dirname, '../contract2/types');
    if (fs.existsSync(contractDir)) {
        const files = fs.readdirSync(contractDir).filter(f => f.endsWith('.ts'));
        for (const file of files) {
            const content = fs.readFileSync(path.join(contractDir, file), 'utf8');
            // Extract interface names and their associated endpoints from comments
            const endpointMatches = content.matchAll(/\/\/\s*(GET|POST|PUT|PATCH|DELETE)\s+([^\s-]+)/g);
            for (const match of endpointMatches) {
                existingContracts.add(`${match[1]} ${match[2]}`);
            }
        }
    }

    const coverage = {
        total: endpoints.totalEndpoints,
        covered: 0,
        missing: [],
        byModule: {}
    };

    for (const [module, moduleEndpoints] of Object.entries(endpoints.modules)) {
        coverage.byModule[module] = {
            total: moduleEndpoints.length,
            covered: 0,
            missing: []
        };

        for (const ep of moduleEndpoints) {
            const key = `${ep.method} ${ep.fullPath}`;
            if (existingContracts.has(key)) {
                coverage.covered++;
                coverage.byModule[module].covered++;
            } else {
                coverage.missing.push(ep);
                coverage.byModule[module].missing.push(ep);
            }
        }
    }

    coverage.percentage = ((coverage.covered / coverage.total) * 100).toFixed(1);

    return coverage;
}

/**
 * Generate model types
 */
function generateModelTypes() {
    console.log('📦 Generating TypeScript types from Mongoose models...\n');

    const files = fs.readdirSync(MODELS_DIR).filter(f => f.endsWith('.model.js'));
    const allInterfaces = [];
    const allEnums = [];

    for (const file of files) {
        try {
            const schema = extractSchemaFromFile(path.join(MODELS_DIR, file));
            if (schema.fields.length > 0) {
                const interface_ = generateInterface(schema);
                allInterfaces.push(interface_);
                console.log(`  ✓ ${schema.modelName} (${schema.fields.length} fields)`);
            }
        } catch (err) {
            console.log(`  ⚠ ${file}: ${err.message}`);
        }
    }

    // Write to file
    const header = `/**
 * Auto-generated TypeScript types from Mongoose models
 * Generated: ${new Date().toISOString()}
 *
 * DO NOT EDIT - Regenerate with: npm run contracts:models
 */

`;

    const output = header + allInterfaces.join('\n\n');
    fs.writeFileSync(path.join(OUTPUT_DIR, 'models.ts'), output);

    console.log(`\n✅ Generated ${allInterfaces.length} interfaces`);
    console.log(`📁 Output: contract2/generated/models.ts`);
}

/**
 * Generate endpoint contract stubs
 */
function generateContractStubs() {
    if (!fs.existsSync(ENDPOINTS_FILE)) {
        console.log('⚠️  Run npm run docs:api first');
        return;
    }

    console.log('📝 Generating contract stubs from endpoints...\n');

    const endpoints = JSON.parse(fs.readFileSync(ENDPOINTS_FILE, 'utf8'));
    const stubs = {};

    for (const [module, moduleEndpoints] of Object.entries(endpoints.modules)) {
        const lines = [];
        const baseName = module.charAt(0).toUpperCase() + module.slice(1);

        lines.push(`/**`);
        lines.push(` * ${baseName} API Contracts`);
        lines.push(` * Auto-generated stub - fill in request/response types`);
        lines.push(` * Generated: ${new Date().toISOString().split('T')[0]}`);
        lines.push(` */`);
        lines.push('');
        lines.push(`import { ApiResponse, PaginatedResponse } from './common';`);
        lines.push('');

        for (const ep of moduleEndpoints) {
            const funcName = ep.controller || 'unknown';
            const methodUpper = ep.method.toUpperCase();

            lines.push(`// ${methodUpper} ${ep.fullPath}`);

            if (methodUpper === 'GET' && !ep.path.includes(':id')) {
                // List endpoint
                lines.push(`export interface ${baseName}ListParams {`);
                lines.push(`  page?: number;`);
                lines.push(`  limit?: number;`);
                lines.push(`  search?: string;`);
                lines.push(`  // TODO: Add filters`);
                lines.push(`}`);
                lines.push(`export type ${baseName}ListResponse = PaginatedResponse<${baseName}>;`);
            } else if (methodUpper === 'POST') {
                // Create endpoint
                lines.push(`export interface Create${baseName}Request {`);
                lines.push(`  // TODO: Add fields from controller ALLOWED_FIELDS`);
                lines.push(`}`);
                lines.push(`export type Create${baseName}Response = ApiResponse<${baseName}>;`);
            } else if (methodUpper === 'PATCH' || methodUpper === 'PUT') {
                // Update endpoint
                lines.push(`export interface Update${baseName}Request {`);
                lines.push(`  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS`);
                lines.push(`}`);
                lines.push(`export type Update${baseName}Response = ApiResponse<${baseName}>;`);
            } else if (methodUpper === 'GET' && ep.path.includes(':id')) {
                // Get by ID
                lines.push(`export type Get${baseName}Response = ApiResponse<${baseName}>;`);
            } else if (methodUpper === 'DELETE') {
                // Delete
                lines.push(`export type Delete${baseName}Response = ApiResponse<{ deleted: boolean }>;`);
            }

            lines.push('');
        }

        stubs[module] = lines.join('\n');
    }

    // Write stub files (only for modules without existing contracts)
    let generated = 0;
    for (const [module, content] of Object.entries(stubs)) {
        const outputPath = path.join(OUTPUT_DIR, `${module}.stub.ts`);
        fs.writeFileSync(outputPath, content);
        generated++;
    }

    console.log(`✅ Generated ${generated} contract stub files`);
    console.log(`📁 Output: contract2/generated/*.stub.ts`);
    console.log(`\n💡 Review stubs and move completed ones to contract2/types/`);
}

/**
 * Main execution
 */
function main() {
    const args = process.argv.slice(2);
    const command = args[0] || 'all';

    console.log('🔄 Traf3li Contract Generator\n');

    switch (command) {
        case 'models':
            generateModelTypes();
            break;

        case 'stubs':
            console.log('⚠️  Stub generation has been disabled.');
            console.log('   Stubs contained guessed types that could break API connections.');
            console.log('   Use "npm run contracts:full" for accurate request types from Joi validators.');
            break;

        case 'coverage':
            const coverage = generateCoverageReport();
            if (coverage) {
                console.log(`📊 Contract Coverage Report\n`);
                console.log(`Total Endpoints: ${coverage.total}`);
                console.log(`With Contracts:  ${coverage.covered}`);
                console.log(`Missing:         ${coverage.missing.length}`);
                console.log(`Coverage:        ${coverage.percentage}%\n`);

                console.log(`Top modules missing contracts:`);
                const sorted = Object.entries(coverage.byModule)
                    .filter(([_, v]) => v.missing.length > 0)
                    .sort((a, b) => b[1].missing.length - a[1].missing.length)
                    .slice(0, 10);

                for (const [module, data] of sorted) {
                    console.log(`  ${module.padEnd(25)} ${data.missing.length}/${data.total} missing`);
                }

                // Write full report
                fs.writeFileSync(
                    path.join(OUTPUT_DIR, 'coverage-report.json'),
                    JSON.stringify(coverage, null, 2)
                );
                console.log(`\n📁 Full report: contract2/generated/coverage-report.json`);
            }
            break;

        case 'sync':
            console.log('🔍 Checking for stale contracts...\n');
            // Compare endpoints with existing contracts
            const syncCoverage = generateCoverageReport();
            if (syncCoverage && syncCoverage.missing.length > 0) {
                console.log(`⚠️  ${syncCoverage.missing.length} endpoints have no contracts\n`);
                console.log('New endpoints without contracts:');
                for (const ep of syncCoverage.missing.slice(0, 20)) {
                    console.log(`  ${ep.method.padEnd(6)} ${ep.fullPath}`);
                }
                if (syncCoverage.missing.length > 20) {
                    console.log(`  ... and ${syncCoverage.missing.length - 20} more`);
                }
            } else {
                console.log('✅ All endpoints have contracts!');
            }
            break;

        case 'all':
        default:
            generateModelTypes();
            console.log('');
            console.log('💡 For request/response types, run: npm run contracts:full');
            console.log('   This generates accurate types from Joi validators.');
            break;
    }
}

main();
