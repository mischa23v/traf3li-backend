#!/usr/bin/env node
/**
 * API Endpoint Extractor
 *
 * Automatically scans all route files and extracts endpoints.
 * Outputs to docs/API_ENDPOINTS.md and docs/api-endpoints.json
 *
 * Usage: node scripts/extractEndpoints.js
 */

const fs = require('fs');
const path = require('path');

const ROUTES_DIR = path.join(__dirname, '../src/routes');
const OUTPUT_MD = path.join(__dirname, '../docs/API_ENDPOINTS.md');
const OUTPUT_JSON = path.join(__dirname, '../docs/api-endpoints.json');

// Ensure docs directory exists
const docsDir = path.join(__dirname, '../docs');
if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
}

/**
 * Extract endpoints from a route file
 */
function extractEndpointsFromFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const fileName = path.basename(filePath, '.js').replace('.route', '').replace('.routes', '');
    const endpoints = [];

    // Match router.METHOD('path', ...) or app.METHOD('path', ...) patterns
    const routeRegex = /(?:router|app)\.(get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]+)['"`]/gi;

    let match;
    while ((match = routeRegex.exec(content)) !== null) {
        const method = match[1].toUpperCase();
        const routePath = match[2];

        // Try to extract controller function name
        const lineStart = content.lastIndexOf('\n', match.index) + 1;
        const lineEnd = content.indexOf('\n', match.index);
        const line = content.substring(lineStart, lineEnd);

        // Extract function name from the line
        const funcMatch = line.match(/,\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\)?;?\s*$/);
        const controller = funcMatch ? funcMatch[1] : 'unknown';

        endpoints.push({
            method,
            path: routePath,
            controller,
            file: path.basename(filePath)
        });
    }

    return { module: fileName, endpoints };
}

/**
 * Get base path from index.js route registration
 */
function getBasePaths() {
    const basePaths = {};
    const indexPath = path.join(ROUTES_DIR, 'index.js');

    if (fs.existsSync(indexPath)) {
        const content = fs.readFileSync(indexPath, 'utf8');

        // Match app.use('/path', require('./file'))
        const useRegex = /app\.use\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*(?:require\s*\(\s*['"`]\.\/([^'"`]+)['"`]\s*\)|(\w+))/gi;

        let match;
        while ((match = useRegex.exec(content)) !== null) {
            const basePath = match[1];
            const routeFile = match[2] || match[3];
            if (routeFile) {
                const normalizedFile = routeFile.replace('.route', '').replace('.routes', '').replace(/^\.\//, '');
                basePaths[normalizedFile] = basePath;
            }
        }
    }

    return basePaths;
}

/**
 * Scan all route files
 */
function scanRoutes() {
    const allEndpoints = [];
    const basePaths = getBasePaths();

    function scanDirectory(dir, prefix = '') {
        const files = fs.readdirSync(dir);

        for (const file of files) {
            const filePath = path.join(dir, file);
            const stat = fs.statSync(filePath);

            if (stat.isDirectory()) {
                // Skip v1, v2, server directories for now - handle separately
                if (!['v1', 'v2', 'server'].includes(file)) {
                    scanDirectory(filePath, prefix + file + '/');
                }
            } else if (file.endsWith('.route.js') || file.endsWith('.routes.js')) {
                const result = extractEndpointsFromFile(filePath);
                if (result.endpoints.length > 0) {
                    // Try to find base path
                    const basePath = basePaths[result.module] || `/api/${result.module}`;

                    result.endpoints.forEach(ep => {
                        ep.fullPath = basePath + (ep.path === '/' ? '' : ep.path);
                        ep.module = result.module;
                    });

                    allEndpoints.push(...result.endpoints);
                }
            }
        }
    }

    scanDirectory(ROUTES_DIR);
    return allEndpoints;
}

/**
 * Group endpoints by module
 */
function groupByModule(endpoints) {
    const grouped = {};

    for (const ep of endpoints) {
        if (!grouped[ep.module]) {
            grouped[ep.module] = [];
        }
        grouped[ep.module].push(ep);
    }

    // Sort modules alphabetically
    const sortedGrouped = {};
    Object.keys(grouped).sort().forEach(key => {
        sortedGrouped[key] = grouped[key];
    });

    return sortedGrouped;
}

/**
 * Generate Markdown documentation
 */
function generateMarkdown(grouped) {
    const lines = [];
    const now = new Date().toISOString().split('T')[0];

    lines.push('# Traf3li API Endpoints');
    lines.push('');
    lines.push(`> Auto-generated on ${now}`);
    lines.push('> ');
    lines.push('> Regenerate with: `npm run docs:api`');
    lines.push('');
    lines.push('## Table of Contents');
    lines.push('');

    // TOC
    for (const module of Object.keys(grouped)) {
        const count = grouped[module].length;
        lines.push(`- [${module}](#${module.toLowerCase()}) (${count} endpoints)`);
    }

    lines.push('');
    lines.push('---');
    lines.push('');

    // Stats
    const totalEndpoints = Object.values(grouped).flat().length;
    const totalModules = Object.keys(grouped).length;

    lines.push('## Summary');
    lines.push('');
    lines.push(`| Metric | Count |`);
    lines.push(`|--------|-------|`);
    lines.push(`| Total Endpoints | ${totalEndpoints} |`);
    lines.push(`| Total Modules | ${totalModules} |`);
    lines.push('');
    lines.push('---');
    lines.push('');

    // Endpoints by module
    for (const [module, endpoints] of Object.entries(grouped)) {
        lines.push(`## ${module}`);
        lines.push('');
        lines.push('| Method | Path | Controller | File |');
        lines.push('|--------|------|------------|------|');

        for (const ep of endpoints) {
            const method = `\`${ep.method}\``;
            const pathCell = `\`${ep.fullPath}\``;
            lines.push(`| ${method} | ${pathCell} | ${ep.controller} | ${ep.file} |`);
        }

        lines.push('');
    }

    // Quick reference by method
    lines.push('---');
    lines.push('');
    lines.push('## Quick Reference by Method');
    lines.push('');

    const byMethod = { GET: [], POST: [], PUT: [], PATCH: [], DELETE: [] };
    for (const endpoints of Object.values(grouped)) {
        for (const ep of endpoints) {
            if (byMethod[ep.method]) {
                byMethod[ep.method].push(ep);
            }
        }
    }

    for (const [method, endpoints] of Object.entries(byMethod)) {
        if (endpoints.length > 0) {
            lines.push(`### ${method} (${endpoints.length})`);
            lines.push('');
            lines.push('<details>');
            lines.push('<summary>Click to expand</summary>');
            lines.push('');
            lines.push('```');
            for (const ep of endpoints.sort((a, b) => a.fullPath.localeCompare(b.fullPath))) {
                lines.push(`${method.padEnd(6)} ${ep.fullPath}`);
            }
            lines.push('```');
            lines.push('');
            lines.push('</details>');
            lines.push('');
        }
    }

    return lines.join('\n');
}

/**
 * Main execution
 */
function main() {
    console.log('🔍 Scanning route files...');

    const endpoints = scanRoutes();
    console.log(`📊 Found ${endpoints.length} endpoints`);

    const grouped = groupByModule(endpoints);
    console.log(`📁 Organized into ${Object.keys(grouped).length} modules`);

    // Generate Markdown
    const markdown = generateMarkdown(grouped);
    fs.writeFileSync(OUTPUT_MD, markdown);
    console.log(`📝 Generated: ${OUTPUT_MD}`);

    // Generate JSON
    const jsonOutput = {
        generated: new Date().toISOString(),
        totalEndpoints: endpoints.length,
        totalModules: Object.keys(grouped).length,
        modules: grouped
    };
    fs.writeFileSync(OUTPUT_JSON, JSON.stringify(jsonOutput, null, 2));
    console.log(`📋 Generated: ${OUTPUT_JSON}`);

    // Print summary
    console.log('\n✅ API documentation generated successfully!');
    console.log('\nEndpoint counts by module:');

    const sortedModules = Object.entries(grouped)
        .sort((a, b) => b[1].length - a[1].length)
        .slice(0, 15);

    for (const [module, eps] of sortedModules) {
        console.log(`  ${module.padEnd(25)} ${eps.length} endpoints`);
    }

    if (Object.keys(grouped).length > 15) {
        console.log(`  ... and ${Object.keys(grouped).length - 15} more modules`);
    }
}

main();
