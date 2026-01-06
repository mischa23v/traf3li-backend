#!/usr/bin/env node

/**
 * API Contract Coverage Checker v2
 *
 * This script scans all route files and compares them against
 * the documented contracts to find undocumented endpoints.
 *
 * Usage:
 *   node contract2/scripts/check-coverage.js
 *   node contract2/scripts/check-coverage.js --verbose
 *   node contract2/scripts/check-coverage.js --output coverage-report.json
 */

const fs = require('fs');
const path = require('path');

// Configuration
const ROUTES_DIR = path.join(__dirname, '../../src/routes');
const CONTRACTS_DIR = path.join(__dirname, '../types');
const VERBOSE = process.argv.includes('--verbose');
const OUTPUT_FILE = process.argv.find(arg => arg.startsWith('--output='))?.split('=')[1];

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
};

/**
 * Extract endpoints from a route file
 */
function extractEndpointsFromRoute(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const endpoints = [];
  const fileName = path.basename(filePath);

  // Extract base route from filename
  let basePath = fileName
    .replace('.route.js', '')
    .replace('.routes.js', '')
    .replace('.js', '');

  // Convert camelCase to kebab-case
  basePath = basePath.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();

  // Common route patterns
  const patterns = [
    // router.get('/path', handler)
    /router\.(get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]+)['"`]/gi,
    // app.get('/path', handler)
    /app\.(get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]+)['"`]/gi,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const method = match[1].toUpperCase();
      let routePath = match[2];

      // Build full path
      let fullPath;
      if (routePath === '/') {
        fullPath = `/api/${basePath}`;
      } else if (routePath.startsWith('/')) {
        fullPath = `/api/${basePath}${routePath}`;
      } else {
        fullPath = `/api/${basePath}/${routePath}`;
      }

      // Normalize path
      fullPath = fullPath
        .replace(/\/+/g, '/') // Remove double slashes
        .replace(/\/$/, '');   // Remove trailing slash

      endpoints.push({
        method,
        path: fullPath,
        file: fileName,
        basePath,
      });
    }
  }

  return endpoints;
}

/**
 * Extract documented namespaces and modules from contract files
 */
function extractDocumentedModules(contractsDir) {
  const documented = {
    modules: new Set(),      // Module names like "CorporateCard", "Dunning"
    basePaths: new Set(),    // Base paths like "/api/corporate-cards"
    interfaces: new Set(),   // Interface names
  };

  const files = fs.readdirSync(contractsDir).filter(f => f.endsWith('.ts'));

  for (const file of files) {
    const filePath = path.join(contractsDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');

    // Extract namespace names
    const namespaceMatches = content.matchAll(/export\s+namespace\s+(\w+)/g);
    for (const match of namespaceMatches) {
      documented.modules.add(match[1]);
      // Convert to kebab-case for path matching
      const kebab = match[1].replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
      documented.basePaths.add(kebab);
    }

    // Extract base routes from comments
    const baseRouteMatches = content.matchAll(/Base route:\s*\/api\/([^\s\n*]+)/gi);
    for (const match of baseRouteMatches) {
      documented.basePaths.add(match[1].replace(/\/$/, ''));
    }

    // Extract interface names
    const interfaceMatches = content.matchAll(/(?:export\s+)?interface\s+(\w+)/g);
    for (const match of interfaceMatches) {
      documented.interfaces.add(match[1]);
    }

    // Extract endpoint comments like: // GET /api/corporate-cards
    const commentEndpoints = content.matchAll(/\/\/\s*(GET|POST|PUT|PATCH|DELETE)\s+\/api\/([^\s\n]+)/gi);
    for (const match of commentEndpoints) {
      const pathParts = match[2].split('/');
      if (pathParts[0]) {
        documented.basePaths.add(pathParts[0]);
      }
    }

    // Extract from JSDoc @route comments
    const jsdocRoutes = content.matchAll(/@route\s+(GET|POST|PUT|PATCH|DELETE)\s+\/api\/([^\s\n]+)/gi);
    for (const match of jsdocRoutes) {
      const pathParts = match[2].split('/');
      if (pathParts[0]) {
        documented.basePaths.add(pathParts[0]);
      }
    }
  }

  return documented;
}

/**
 * Check if a module/basePath is documented
 */
function isModuleDocumented(basePath, documented) {
  // Direct match
  if (documented.basePaths.has(basePath)) return true;

  // Try without hyphens
  const noHyphen = basePath.replace(/-/g, '');
  for (const doc of documented.basePaths) {
    if (doc.replace(/-/g, '') === noHyphen) return true;
  }

  // Try module name match (PascalCase)
  const pascalCase = basePath
    .split('-')
    .map(s => s.charAt(0).toUpperCase() + s.slice(1))
    .join('');

  if (documented.modules.has(pascalCase)) return true;

  // Try variations
  const variations = [
    basePath,
    basePath.replace(/-/g, ''),
    basePath.replace(/-(\w)/g, (_, c) => c.toUpperCase()), // camelCase
    pascalCase,
    pascalCase.toLowerCase(),
  ];

  for (const variation of variations) {
    if (documented.modules.has(variation)) return true;
    if (documented.basePaths.has(variation)) return true;
  }

  return false;
}

/**
 * Main function
 */
function main() {
  console.log(`${colors.cyan}╔════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.cyan}║        API Contract Coverage Checker v2                    ║${colors.reset}`);
  console.log(`${colors.cyan}╚════════════════════════════════════════════════════════════╝${colors.reset}\n`);

  // Get all route files
  const routeFiles = [];

  function scanDir(dir) {
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        scanDir(fullPath);
      } else if (item.endsWith('.js') && !item.startsWith('index')) {
        routeFiles.push(fullPath);
      }
    }
  }

  scanDir(ROUTES_DIR);
  console.log(`${colors.blue}Found ${routeFiles.length} route files${colors.reset}\n`);

  // Extract all endpoints from routes
  const allEndpoints = [];
  const moduleEndpoints = {}; // Group by module

  for (const file of routeFiles) {
    const endpoints = extractEndpointsFromRoute(file);
    allEndpoints.push(...endpoints);

    for (const ep of endpoints) {
      if (!moduleEndpoints[ep.basePath]) {
        moduleEndpoints[ep.basePath] = [];
      }
      moduleEndpoints[ep.basePath].push(ep);
    }
  }
  console.log(`${colors.blue}Found ${allEndpoints.length} total endpoints${colors.reset}`);
  console.log(`${colors.blue}Found ${Object.keys(moduleEndpoints).length} unique modules${colors.reset}\n`);

  // Extract documented modules from contracts
  const documented = extractDocumentedModules(CONTRACTS_DIR);
  console.log(`${colors.blue}Found ${documented.modules.size} documented namespaces${colors.reset}`);
  console.log(`${colors.blue}Found ${documented.basePaths.size} documented base paths${colors.reset}\n`);

  // Categorize modules
  const documentedModules = [];
  const undocumentedModules = [];

  for (const [module, endpoints] of Object.entries(moduleEndpoints)) {
    if (isModuleDocumented(module, documented)) {
      documentedModules.push({ module, endpoints, count: endpoints.length });
    } else {
      undocumentedModules.push({ module, endpoints, count: endpoints.length });
    }
  }

  // Calculate totals
  const documentedEndpointCount = documentedModules.reduce((sum, m) => sum + m.count, 0);
  const undocumentedEndpointCount = undocumentedModules.reduce((sum, m) => sum + m.count, 0);
  const coverage = ((documentedEndpointCount / allEndpoints.length) * 100).toFixed(1);

  // Print results
  console.log(`${colors.cyan}═══════════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.cyan}                        RESULTS                               ${colors.reset}`);
  console.log(`${colors.cyan}═══════════════════════════════════════════════════════════════${colors.reset}\n`);

  console.log(`${colors.green}✓ Documented Modules:${colors.reset}     ${documentedModules.length} modules (${documentedEndpointCount} endpoints)`);
  console.log(`${colors.red}✗ Undocumented Modules:${colors.reset}   ${undocumentedModules.length} modules (${undocumentedEndpointCount} endpoints)`);
  console.log(`${colors.yellow}Module Coverage:${colors.reset}          ${((documentedModules.length / Object.keys(moduleEndpoints).length) * 100).toFixed(1)}%`);
  console.log(`${colors.yellow}Endpoint Coverage:${colors.reset}        ${coverage}%\n`);

  if (undocumentedModules.length > 0) {
    console.log(`${colors.yellow}╔════════════════════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.yellow}║              UNDOCUMENTED MODULES                          ║${colors.reset}`);
    console.log(`${colors.yellow}╚════════════════════════════════════════════════════════════╝${colors.reset}\n`);

    // Sort by endpoint count (most endpoints first)
    undocumentedModules.sort((a, b) => b.count - a.count);

    for (const { module, endpoints, count } of undocumentedModules) {
      console.log(`${colors.red}✗${colors.reset} ${colors.cyan}${module}${colors.reset} (${count} endpoints)`);

      if (VERBOSE) {
        for (const ep of endpoints.slice(0, 5)) {
          const methodColor = {
            GET: colors.green,
            POST: colors.blue,
            PUT: colors.yellow,
            PATCH: colors.yellow,
            DELETE: colors.red,
          }[ep.method] || colors.reset;
          console.log(`    ${methodColor}${ep.method.padEnd(7)}${colors.reset} ${ep.path}`);
        }
        if (endpoints.length > 5) {
          console.log(`    ${colors.dim}... and ${endpoints.length - 5} more${colors.reset}`);
        }
      }
    }

    if (!VERBOSE) {
      console.log(`\n${colors.dim}Run with --verbose to see endpoint details${colors.reset}`);
    }
  }

  // Print documented modules
  console.log(`\n${colors.green}╔════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.green}║              DOCUMENTED MODULES                            ║${colors.reset}`);
  console.log(`${colors.green}╚════════════════════════════════════════════════════════════╝${colors.reset}\n`);

  documentedModules.sort((a, b) => b.count - a.count);
  for (const { module, count } of documentedModules) {
    console.log(`${colors.green}✓${colors.reset} ${module} (${count} endpoints)`);
  }

  // Summary
  console.log(`\n${colors.cyan}═══════════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.cyan}                        SUMMARY                               ${colors.reset}`);
  console.log(`${colors.cyan}═══════════════════════════════════════════════════════════════${colors.reset}\n`);

  console.log(`Total Route Files:       ${routeFiles.length}`);
  console.log(`Total Endpoints:         ${allEndpoints.length}`);
  console.log(`Total Modules:           ${Object.keys(moduleEndpoints).length}`);
  console.log(`Documented Modules:      ${documentedModules.length}`);
  console.log(`Undocumented Modules:    ${undocumentedModules.length}`);
  console.log(`Module Coverage:         ${((documentedModules.length / Object.keys(moduleEndpoints).length) * 100).toFixed(1)}%`);
  console.log(`Endpoint Coverage:       ${coverage}%`);

  // Output to file if requested
  if (OUTPUT_FILE) {
    const report = {
      generatedAt: new Date().toISOString(),
      summary: {
        totalRouteFiles: routeFiles.length,
        totalEndpoints: allEndpoints.length,
        totalModules: Object.keys(moduleEndpoints).length,
        documentedModules: documentedModules.length,
        undocumentedModules: undocumentedModules.length,
        moduleCoveragePercent: parseFloat(((documentedModules.length / Object.keys(moduleEndpoints).length) * 100).toFixed(1)),
        endpointCoveragePercent: parseFloat(coverage),
      },
      undocumentedModulesList: undocumentedModules.map(m => ({
        module: m.module,
        endpointCount: m.count,
        sampleEndpoints: m.endpoints.slice(0, 3).map(e => `${e.method} ${e.path}`),
      })),
      documentedModulesList: documentedModules.map(m => ({
        module: m.module,
        endpointCount: m.count,
      })),
    };

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(report, null, 2));
    console.log(`\n${colors.green}Report saved to: ${OUTPUT_FILE}${colors.reset}`);
  }

  console.log(`\n${colors.cyan}═══════════════════════════════════════════════════════════════${colors.reset}`);

  // Return coverage info
  return {
    moduleCoverage: (documentedModules.length / Object.keys(moduleEndpoints).length) * 100,
    endpointCoverage: parseFloat(coverage),
    undocumentedModules,
  };
}

const result = main();

// Exit with error if coverage is below threshold
if (result.moduleCoverage < 50) {
  process.exit(1);
}
