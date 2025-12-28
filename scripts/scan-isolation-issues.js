#!/usr/bin/env node
/**
 * Scanner to find models and controllers with isolation issues
 *
 * Models: Checks for firmId field but missing lawyerId field
 * Controllers: Checks for patterns that bypass req.firmQuery
 */

const fs = require('fs');
const path = require('path');

const MODELS_DIR = path.join(__dirname, '../src/models');
const CONTROLLERS_DIR = path.join(__dirname, '../src/controllers');
const SERVICES_DIR = path.join(__dirname, '../src/services');

// Models that should be skipped (system models in globalFirmIsolation.plugin.js)
const SKIP_MODELS = new Set([
    'user.model.js',
    'firm.model.js',
    'firmInvitation.model.js',
    'session.model.js',
    'refreshToken.model.js',
    'revokedToken.model.js',
    'emailOtp.model.js',
    'phoneOtp.model.js',
    'magicLink.model.js',
    'emailVerification.model.js',
    'passwordHistory.model.js',
    'counter.model.js',
    'migrationLog.model.js',
    'ssoProvider.model.js',
    'ssoUserLink.model.js',
    'webauthnCredential.model.js',
    'reauthChallenge.model.js',
    'account.model.js',
    'subscriptionPlan.model.js',
    'plugin.model.js',
]);

const results = {
    modelsMissingLawyerId: [],
    controllersWithBadPatterns: [],
    servicesWithBadPatterns: []
};

// Scan models
console.log('=== Scanning Models ===\n');

if (fs.existsSync(MODELS_DIR)) {
    const modelFiles = fs.readdirSync(MODELS_DIR).filter(f => f.endsWith('.model.js'));

    for (const file of modelFiles) {
        if (SKIP_MODELS.has(file)) continue;

        const content = fs.readFileSync(path.join(MODELS_DIR, file), 'utf8');
        const hasFirmId = content.includes('firmId:') || content.includes('firmId :');
        const hasLawyerId = content.includes('lawyerId:') || content.includes('lawyerId :');

        if (hasFirmId && !hasLawyerId) {
            results.modelsMissingLawyerId.push(file);
            console.log(`❌ ${file} - has firmId but MISSING lawyerId`);
        }
    }
}

// Bad patterns to look for in controllers/services
const BAD_PATTERNS = [
    /\$or:\s*\[\s*\{\s*assignedTo/,  // $or: [{ assignedTo patterns
    /\$or:\s*\[\s*\{\s*createdBy/,   // $or: [{ createdBy patterns
    /firmId\s*\?\s*\{.*firmId.*\}\s*:\s*\{.*\$or/,  // firmId ? { firmId } : { $or... }
    /const\s+baseQuery\s*=\s*firmId\s*\?/,  // const baseQuery = firmId ?
    /const\s+matchFilter\s*=\s*firmId\s*\?.*\$or/,  // matchFilter with $or fallback
    /userId:\s*.*userID.*(?!.*firmQuery)/,  // userId queries without firmQuery
];

// Scan controllers
console.log('\n=== Scanning Controllers ===\n');

if (fs.existsSync(CONTROLLERS_DIR)) {
    const controllerFiles = fs.readdirSync(CONTROLLERS_DIR).filter(f => f.endsWith('.js'));

    for (const file of controllerFiles) {
        const content = fs.readFileSync(path.join(CONTROLLERS_DIR, file), 'utf8');
        const issues = [];

        for (const pattern of BAD_PATTERNS) {
            if (pattern.test(content)) {
                const match = content.match(pattern);
                if (match) {
                    issues.push(match[0].substring(0, 50) + '...');
                }
            }
        }

        // Also check for firmId ? { firmId } : { not using lawyerId }
        const firmIdTernaryPattern = /firmId\s*\?\s*\{[^}]*firmId[^}]*\}\s*:\s*\{[^}]*\}/g;
        const matches = content.match(firmIdTernaryPattern);
        if (matches) {
            for (const match of matches) {
                if (!match.includes('lawyerId')) {
                    issues.push('Ternary without lawyerId: ' + match.substring(0, 60) + '...');
                }
            }
        }

        if (issues.length > 0) {
            results.controllersWithBadPatterns.push({ file, issues });
            console.log(`❌ ${file}`);
            issues.forEach(i => console.log(`   - ${i}`));
        }
    }
}

// Scan services
console.log('\n=== Scanning Services ===\n');

if (fs.existsSync(SERVICES_DIR)) {
    const serviceFiles = fs.readdirSync(SERVICES_DIR).filter(f => f.endsWith('.js'));

    for (const file of serviceFiles) {
        const content = fs.readFileSync(path.join(SERVICES_DIR, file), 'utf8');
        const issues = [];

        for (const pattern of BAD_PATTERNS) {
            if (pattern.test(content)) {
                const match = content.match(pattern);
                if (match) {
                    issues.push(match[0].substring(0, 50) + '...');
                }
            }
        }

        if (issues.length > 0) {
            results.servicesWithBadPatterns.push({ file, issues });
            console.log(`❌ ${file}`);
            issues.forEach(i => console.log(`   - ${i}`));
        }
    }
}

// Summary
console.log('\n=== SUMMARY ===\n');
console.log(`Models missing lawyerId: ${results.modelsMissingLawyerId.length}`);
console.log(`Controllers with bad patterns: ${results.controllersWithBadPatterns.length}`);
console.log(`Services with bad patterns: ${results.servicesWithBadPatterns.length}`);

// Write results to file
const outputPath = path.join(__dirname, '../ISOLATION_ISSUES.md');
let output = `# Firm Isolation Issues Report

Generated: ${new Date().toISOString()}

## Models Missing lawyerId Field

These models have \`firmId\` but are missing \`lawyerId\` for solo lawyer support:

`;

if (results.modelsMissingLawyerId.length === 0) {
    output += '_None found_\n';
} else {
    results.modelsMissingLawyerId.forEach(m => {
        output += `- [ ] \`${m}\`\n`;
    });
}

output += `
## Controllers with Isolation Issues

These controllers build their own queries instead of using \`req.firmQuery\`:

`;

if (results.controllersWithBadPatterns.length === 0) {
    output += '_None found_\n';
} else {
    results.controllersWithBadPatterns.forEach(({ file, issues }) => {
        output += `### ${file}\n`;
        issues.forEach(i => {
            output += `- [ ] ${i}\n`;
        });
        output += '\n';
    });
}

output += `
## Services with Isolation Issues

`;

if (results.servicesWithBadPatterns.length === 0) {
    output += '_None found_\n';
} else {
    results.servicesWithBadPatterns.forEach(({ file, issues }) => {
        output += `### ${file}\n`;
        issues.forEach(i => {
            output += `- [ ] ${i}\n`;
        });
        output += '\n';
    });
}

output += `
## How to Fix

### Models
Add \`lawyerId\` field to each model:
\`\`\`javascript
// For solo lawyers (no firm) - enables row-level security
lawyerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
},
\`\`\`

### Controllers
Replace custom query building with \`req.firmQuery\`:
\`\`\`javascript
// BEFORE (bad)
const baseQuery = firmId
    ? { firmId: new mongoose.Types.ObjectId(firmId) }
    : { $or: [{ assignedTo: userId }, { createdBy: userId }] };

// AFTER (good)
const baseQuery = req.firmQuery; // Already set by firmFilter middleware
\`\`\`
`;

fs.writeFileSync(outputPath, output);
console.log(`\nReport written to: ${outputPath}`);

// Exit with error code if issues found
const totalIssues = results.modelsMissingLawyerId.length +
                    results.controllersWithBadPatterns.length +
                    results.servicesWithBadPatterns.length;
process.exit(totalIssues > 0 ? 1 : 0);
