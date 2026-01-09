#!/usr/bin/env node
/**
 * Frontend vs Backend Contract Comparison
 *
 * Compares frontend-structure.json with backend endpoints/models
 * to find all mismatches, missing items, and inconsistencies.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const FRONTEND_JSON_FILE = path.join(__dirname, '../docs/frontend-structure.json');
const BACKEND_ENDPOINTS_FILE = path.join(__dirname, '../docs/api-endpoints.json');
const BACKEND_MODELS_DIR = path.join(__dirname, '../src/models');
const BACKEND_VALIDATORS_DIR = path.join(__dirname, '../src/validators');
const OUTPUT_FILE = path.join(__dirname, '../docs/CONTRACT_MISMATCHES.md');

// Load frontend JSON from local file
function fetchFrontendJson() {
    return new Promise((resolve, reject) => {
        console.log('📥 Loading frontend structure from local file...');
        try {
            const content = fs.readFileSync(FRONTEND_JSON_FILE, 'utf-8');
            resolve(JSON.parse(content));
        } catch (e) {
            reject(new Error('Failed to load frontend JSON: ' + e.message));
        }
    });
}

// Load backend endpoints - flatten from modules structure
function loadBackendEndpoints() {
    console.log('📥 Loading backend endpoints...');
    const content = fs.readFileSync(BACKEND_ENDPOINTS_FILE, 'utf-8');
    const data = JSON.parse(content);

    // Flatten all module arrays into single endpoints array
    const endpoints = [];
    if (data.modules) {
        for (const [moduleName, moduleEndpoints] of Object.entries(data.modules)) {
            if (Array.isArray(moduleEndpoints)) {
                endpoints.push(...moduleEndpoints);
            }
        }
    }

    return {
        ...data,
        endpoints
    };
}

// Extract Mongoose schema fields
function extractMongooseFields(modelPath) {
    try {
        const content = fs.readFileSync(modelPath, 'utf-8');
        const fields = {};

        // Match field definitions
        const schemaMatch = content.match(/new\s+(?:mongoose\.)?Schema\s*\(\s*\{([\s\S]*?)\}\s*,/);
        if (!schemaMatch) return fields;

        const schemaContent = schemaMatch[1];

        // Extract field names and types
        const fieldPattern = /(\w+)\s*:\s*(?:\{[^}]*type\s*:\s*(\w+|mongoose\.\w+\.\w+)[^}]*(?:enum\s*:\s*\[([^\]]+)\])?[^}]*\}|(\w+)|\[([^\]]+)\])/g;
        let match;
        while ((match = fieldPattern.exec(schemaContent)) !== null) {
            const fieldName = match[1];
            const type = match[2] || match[4] || 'Mixed';
            const enumValues = match[3];

            fields[fieldName] = {
                type: type.replace('mongoose.Schema.Types.', '').replace('Schema.Types.', ''),
                enum: enumValues ? enumValues.split(',').map(v => v.trim().replace(/['"]/g, '')) : null
            };
        }

        return fields;
    } catch (e) {
        return {};
    }
}

// Normalize endpoint path for comparison
function normalizeEndpoint(endpoint) {
    return endpoint
        // Remove query strings
        .replace(/\?.*$/, '')
        // Remove /api/v1, /api/v2 prefixes
        .replace(/^\/api\/v\d+/, '')
        // Remove /api prefix (frontend often omits this)
        .replace(/^\/api/, '')
        // Normalize template literals: ${id}, ${taskId}, ${recordId} → :param
        .replace(/\$\{[^}]+\}/g, ':param')
        // Normalize path params: /:id, /:taskId → :param
        .replace(/\/:(\w+)/g, '/:param')
        // Normalize $param syntax
        .replace(/\/\$(\w+)/g, '/:param')
        // Collapse multiple consecutive :param
        .replace(/(\/:\w+)+/g, match => {
            const count = (match.match(/\/:/g) || []).length;
            return Array(count).fill('/:param').join('');
        })
        .toLowerCase()
        // Remove trailing slashes
        .replace(/\/+$/, '')
        // Ensure starts with /
        .replace(/^([^/])/, '/$1');
}

// Check if endpoint is valid API path (not error message or text)
function isValidEndpoint(endpoint) {
    if (!endpoint || typeof endpoint !== 'string') return false;
    // Must start with / (after trimming)
    if (!endpoint.trim().startsWith('/')) return false;
    // Skip Arabic text (error messages)
    if (/[\u0600-\u06FF]/.test(endpoint)) return false;
    // Skip if it's just a parameter placeholder
    if (endpoint.match(/^:?\w+$/)) return false;
    return true;
}

// Compare endpoints
function compareEndpoints(frontendEndpoints, backendEndpoints) {
    const mismatches = {
        frontendOnly: [],
        backendOnly: [],
        methodMismatch: []
    };

    const frontendNormalized = new Map();
    const backendNormalized = new Map();

    // Track unique paths seen
    const seenFrontend = new Set();
    const seenBackend = new Set();

    // Normalize frontend endpoints
    for (const ep of frontendEndpoints) {
        if (!isValidEndpoint(ep.endpoint)) continue;
        const normalizedPath = normalizeEndpoint(ep.endpoint);
        const key = `${ep.method}|${normalizedPath}`;
        // Skip duplicates
        if (seenFrontend.has(key)) continue;
        seenFrontend.add(key);
        frontendNormalized.set(key, ep);
    }

    // Normalize backend endpoints
    for (const ep of backendEndpoints) {
        const normalizedPath = normalizeEndpoint(ep.fullPath);
        const key = `${ep.method}|${normalizedPath}`;
        // Skip duplicates
        if (seenBackend.has(key)) continue;
        seenBackend.add(key);
        backendNormalized.set(key, ep);
    }

    // Find frontend-only endpoints
    for (const [key, ep] of frontendNormalized) {
        if (!backendNormalized.has(key)) {
            // Check if path exists with different method
            const pathOnly = key.split('|')[1];
            let foundWithDifferentMethod = false;
            for (const [bKey, bEp] of backendNormalized) {
                if (bKey.split('|')[1] === pathOnly) {
                    mismatches.methodMismatch.push({
                        path: ep.endpoint,
                        frontendMethod: ep.method,
                        backendMethod: bKey.split('|')[0]
                    });
                    foundWithDifferentMethod = true;
                    break;
                }
            }
            if (!foundWithDifferentMethod) {
                mismatches.frontendOnly.push(ep);
            }
        }
    }

    // Find backend-only endpoints
    for (const [key, ep] of backendNormalized) {
        if (!frontendNormalized.has(key)) {
            const pathOnly = key.split('|')[1];
            let foundInFrontend = false;
            for (const [fKey] of frontendNormalized) {
                if (fKey.split('|')[1] === pathOnly) {
                    foundInFrontend = true;
                    break;
                }
            }
            if (!foundInFrontend) {
                mismatches.backendOnly.push(ep);
            }
        }
    }

    return mismatches;
}

// Compare interfaces/entities
function compareInterfaces(frontendInterfaces, backendModels) {
    const mismatches = {
        frontendOnly: [],
        backendOnly: [],
        fieldMismatches: []
    };

    const frontendByName = new Map();
    const backendByName = new Map();

    // Index frontend interfaces
    for (const iface of frontendInterfaces) {
        const name = iface.name.toLowerCase().replace(/schema$|type$/i, '');
        frontendByName.set(name, iface);
    }

    // Index backend models
    for (const [name, fields] of Object.entries(backendModels)) {
        const normalizedName = name.toLowerCase().replace(/\.model$/i, '');
        backendByName.set(normalizedName, { name, fields });
    }

    // Find frontend-only
    for (const [name, iface] of frontendByName) {
        if (!backendByName.has(name)) {
            // Try variations
            const variations = [name + 's', name.slice(0, -1), name.replace(/-/g, '')];
            let found = false;
            for (const v of variations) {
                if (backendByName.has(v)) {
                    found = true;
                    break;
                }
            }
            if (!found) {
                mismatches.frontendOnly.push(iface);
            }
        }
    }

    // Find backend-only
    for (const [name, model] of backendByName) {
        if (!frontendByName.has(name)) {
            const variations = [name + 's', name.slice(0, -1), name.replace(/-/g, '')];
            let found = false;
            for (const v of variations) {
                if (frontendByName.has(v)) {
                    found = true;
                    break;
                }
            }
            if (!found) {
                mismatches.backendOnly.push(model);
            }
        }
    }

    return mismatches;
}

// Compare enums
function compareEnums(frontendEnums, backendEnums) {
    const mismatches = {
        frontendOnly: [],
        backendOnly: [],
        valueMismatches: []
    };

    const frontendByName = new Map();
    for (const e of frontendEnums) {
        frontendByName.set(e.name.toLowerCase(), e);
    }

    const backendByName = new Map();
    for (const [name, values] of Object.entries(backendEnums)) {
        backendByName.set(name.toLowerCase(), { name, values });
    }

    // Find frontend-only
    for (const [name, e] of frontendByName) {
        if (!backendByName.has(name)) {
            mismatches.frontendOnly.push(e);
        } else {
            // Compare values
            const backend = backendByName.get(name);
            const frontendValues = new Set(Object.values(e.values || {}));
            const backendValues = new Set(backend.values);

            const onlyInFrontend = [...frontendValues].filter(v => !backendValues.has(v));
            const onlyInBackend = [...backendValues].filter(v => !frontendValues.has(v));

            if (onlyInFrontend.length > 0 || onlyInBackend.length > 0) {
                mismatches.valueMismatches.push({
                    name,
                    frontendOnly: onlyInFrontend,
                    backendOnly: onlyInBackend
                });
            }
        }
    }

    // Find backend-only
    for (const [name, e] of backendByName) {
        if (!frontendByName.has(name)) {
            mismatches.backendOnly.push(e);
        }
    }

    return mismatches;
}

// Extract backend enums from models
function extractBackendEnums() {
    const enums = {};
    const modelFiles = fs.readdirSync(BACKEND_MODELS_DIR).filter(f => f.endsWith('.model.js'));

    for (const file of modelFiles) {
        const content = fs.readFileSync(path.join(BACKEND_MODELS_DIR, file), 'utf-8');
        const enumPattern = /enum\s*:\s*\[([^\]]+)\]/g;
        let match;

        while ((match = enumPattern.exec(content)) !== null) {
            // Find the field name before this enum
            const beforeMatch = content.substring(0, match.index);
            const fieldMatch = beforeMatch.match(/(\w+)\s*:\s*\{[^}]*$/);
            if (fieldMatch) {
                const fieldName = fieldMatch[1];
                const modelName = file.replace('.model.js', '');
                const enumName = `${modelName}_${fieldName}`;
                const values = match[1].split(',').map(v => v.trim().replace(/['"]/g, ''));
                enums[enumName] = values;
            }
        }
    }

    return enums;
}

// Generate markdown report
function generateReport(comparison) {
    let md = `# Frontend vs Backend Contract Mismatch Report

> Generated: ${new Date().toISOString()}

## Summary

| Category | Frontend Only | Backend Only | Mismatches |
|----------|--------------|--------------|------------|
| API Endpoints | ${comparison.endpoints.frontendOnly.length} | ${comparison.endpoints.backendOnly.length} | ${comparison.endpoints.methodMismatch.length} |
| Interfaces/Entities | ${comparison.interfaces.frontendOnly.length} | ${comparison.interfaces.backendOnly.length} | ${comparison.interfaces.fieldMismatches.length} |
| Enums | ${comparison.enums.frontendOnly.length} | ${comparison.enums.backendOnly.length} | ${comparison.enums.valueMismatches.length} |
| Type Aliases | ${comparison.types.frontendOnly.length} | ${comparison.types.backendOnly.length} | - |

---

## 🔴 Critical: API Endpoints Frontend Expects But Backend Doesn't Have

These endpoints are called by frontend but don't exist in backend - **will cause 404 errors**.

`;

    // Group frontend-only endpoints by module
    const frontendOnlyByModule = {};
    for (const ep of comparison.endpoints.frontendOnly) {
        const module = ep.endpoint.split('/')[1] || 'root';
        if (!frontendOnlyByModule[module]) frontendOnlyByModule[module] = [];
        frontendOnlyByModule[module].push(ep);
    }

    for (const [module, endpoints] of Object.entries(frontendOnlyByModule).sort((a, b) => b[1].length - a[1].length)) {
        md += `### ${module} (${endpoints.length} missing)\n\n`;
        md += '| Method | Endpoint | Source File |\n';
        md += '|--------|----------|-------------|\n';
        for (const ep of endpoints.slice(0, 50)) {
            md += `| ${ep.method} | \`${ep.endpoint}\` | ${ep.source || '-'} |\n`;
        }
        if (endpoints.length > 50) {
            md += `| ... | *${endpoints.length - 50} more* | - |\n`;
        }
        md += '\n';
    }

    md += `---

## 🟡 Backend Endpoints Not Used by Frontend

These endpoints exist in backend but frontend doesn't call them - potentially dead code or undocumented features.

`;

    const backendOnlyByModule = {};
    for (const ep of comparison.endpoints.backendOnly) {
        const parts = ep.fullPath.split('/').filter(Boolean);
        const module = parts[1] || parts[0] || 'root';
        if (!backendOnlyByModule[module]) backendOnlyByModule[module] = [];
        backendOnlyByModule[module].push(ep);
    }

    for (const [module, endpoints] of Object.entries(backendOnlyByModule).sort((a, b) => b[1].length - a[1].length).slice(0, 20)) {
        md += `### ${module} (${endpoints.length} unused)\n\n`;
        md += '| Method | Endpoint |\n';
        md += '|--------|----------|\n';
        for (const ep of endpoints.slice(0, 30)) {
            md += `| ${ep.method} | \`${ep.fullPath}\` |\n`;
        }
        if (endpoints.length > 30) {
            md += `| ... | *${endpoints.length - 30} more* |\n`;
        }
        md += '\n';
    }

    md += `---

## 🔴 Method Mismatches

Frontend calls with different HTTP method than backend expects.

| Path | Frontend Method | Backend Method |
|------|-----------------|----------------|
`;
    for (const m of comparison.endpoints.methodMismatch) {
        md += `| \`${m.path}\` | ${m.frontendMethod} | ${m.backendMethod} |\n`;
    }

    md += `

---

## 🟡 Interfaces Frontend Has But Backend Doesn't Define

`;
    for (const iface of comparison.interfaces.frontendOnly.slice(0, 100)) {
        md += `- \`${iface.name}\` (${iface.fields || '?'} fields) - ${iface.path || '-'}\n`;
    }
    if (comparison.interfaces.frontendOnly.length > 100) {
        md += `- ... and ${comparison.interfaces.frontendOnly.length - 100} more\n`;
    }

    md += `

---

## 🟡 Backend Models Not Exposed to Frontend

`;
    for (const model of comparison.interfaces.backendOnly.slice(0, 100)) {
        md += `- \`${model.name}\`\n`;
    }
    if (comparison.interfaces.backendOnly.length > 100) {
        md += `- ... and ${comparison.interfaces.backendOnly.length - 100} more\n`;
    }

    md += `

---

## 🔴 Enum Value Mismatches

Same enum name but different values between frontend and backend.

`;
    for (const e of comparison.enums.valueMismatches) {
        md += `### ${e.name}\n\n`;
        if (e.frontendOnly.length > 0) {
            md += `**Frontend-only values:** ${e.frontendOnly.map(v => `\`${v}\``).join(', ')}\n\n`;
        }
        if (e.backendOnly.length > 0) {
            md += `**Backend-only values:** ${e.backendOnly.map(v => `\`${v}\``).join(', ')}\n\n`;
        }
    }

    md += `

---

## 🟡 Frontend-Only Enums

Enums defined in frontend but not in backend.

`;
    for (const e of comparison.enums.frontendOnly.slice(0, 50)) {
        md += `- \`${e.name}\` - ${e.path || '-'}\n`;
    }

    md += `

---

## 🟡 Backend-Only Enums

Enums in backend models not exposed to frontend.

`;
    for (const [name, values] of Object.entries(comparison.enums.backendOnlyRaw || {}).slice(0, 50)) {
        md += `- \`${name}\`: ${values.slice(0, 5).map(v => `\`${v}\``).join(', ')}${values.length > 5 ? '...' : ''}\n`;
    }

    md += `

---

## 🟡 Type Aliases Frontend Uses

`;
    for (const t of comparison.types.frontendOnly.slice(0, 50)) {
        md += `- \`${t.name}\` (${t.kind}) - ${t.path || '-'}\n`;
    }

    md += `

---

## Action Items

### 🔴 Critical (Will Break App)
1. Add ${comparison.endpoints.frontendOnly.length} missing backend endpoints
2. Fix ${comparison.endpoints.methodMismatch.length} HTTP method mismatches
3. Sync ${comparison.enums.valueMismatches.length} enum value differences

### 🟡 Important (May Cause Issues)
1. Review ${comparison.interfaces.frontendOnly.length} frontend-only interfaces
2. Document ${comparison.endpoints.backendOnly.length} unused backend endpoints

### 📝 Housekeeping
1. Remove dead code or add tests for unused endpoints
2. Create shared types package for consistency

`;

    return md;
}

// Main execution
async function main() {
    console.log('🔍 Frontend vs Backend Contract Comparison\n');

    try {
        // Fetch data
        const frontend = await fetchFrontendJson();
        const backendEndpoints = loadBackendEndpoints();
        const backendEnums = extractBackendEnums();

        console.log(`\n📊 Data loaded:`);
        console.log(`   Frontend endpoints: ${frontend.apiEndpoints?.length || 0}`);
        console.log(`   Frontend interfaces: ${frontend.interfaces?.length || 0}`);
        console.log(`   Frontend enums: ${frontend.enums?.length || 0}`);
        console.log(`   Frontend types: ${frontend.types?.length || 0}`);
        console.log(`   Backend endpoints: ${backendEndpoints.endpoints?.length || 0}`);
        console.log(`   Backend enums: ${Object.keys(backendEnums).length}`);

        // Run comparisons
        console.log('\n🔄 Comparing endpoints...');
        const endpointComparison = compareEndpoints(
            frontend.apiEndpoints || [],
            backendEndpoints.endpoints || []
        );

        console.log('🔄 Comparing interfaces...');
        // Load backend model names
        const modelFiles = fs.readdirSync(BACKEND_MODELS_DIR).filter(f => f.endsWith('.model.js'));
        const backendModels = {};
        for (const file of modelFiles) {
            const name = file.replace('.model.js', '');
            backendModels[name] = extractMongooseFields(path.join(BACKEND_MODELS_DIR, file));
        }

        const interfaceComparison = compareInterfaces(
            frontend.interfaces || [],
            backendModels
        );

        console.log('🔄 Comparing enums...');
        const enumComparison = compareEnums(
            frontend.enums || [],
            backendEnums
        );
        enumComparison.backendOnlyRaw = backendEnums;

        // Type aliases (frontend only has these)
        const typeComparison = {
            frontendOnly: frontend.types || [],
            backendOnly: []
        };

        // Compile results
        const comparison = {
            endpoints: endpointComparison,
            interfaces: interfaceComparison,
            enums: enumComparison,
            types: typeComparison
        };

        // Print summary
        console.log('\n📋 Summary:');
        console.log(`   Endpoints frontend-only: ${endpointComparison.frontendOnly.length}`);
        console.log(`   Endpoints backend-only: ${endpointComparison.backendOnly.length}`);
        console.log(`   Method mismatches: ${endpointComparison.methodMismatch.length}`);
        console.log(`   Interfaces frontend-only: ${interfaceComparison.frontendOnly.length}`);
        console.log(`   Interfaces backend-only: ${interfaceComparison.backendOnly.length}`);
        console.log(`   Enums frontend-only: ${enumComparison.frontendOnly.length}`);
        console.log(`   Enums backend-only: ${enumComparison.backendOnly.length}`);
        console.log(`   Enum value mismatches: ${enumComparison.valueMismatches.length}`);

        // Generate report
        console.log('\n📝 Generating report...');
        const report = generateReport(comparison);
        fs.writeFileSync(OUTPUT_FILE, report);
        console.log(`\n✅ Report saved to: ${OUTPUT_FILE}`);

        // Also save raw JSON for further analysis
        const jsonOutput = path.join(__dirname, '../docs/contract-mismatches.json');
        fs.writeFileSync(jsonOutput, JSON.stringify(comparison, null, 2));
        console.log(`✅ JSON data saved to: ${jsonOutput}`);

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

main();
