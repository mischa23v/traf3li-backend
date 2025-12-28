#!/usr/bin/env node
/**
 * Scanner to find models and controllers with isolation issues
 *
 * Models: Checks for firmId field but missing lawyerId field
 * Controllers: Checks for patterns that bypass req.firmQuery
 *
 * EXCLUDED (intentional patterns):
 * - Admin controllers (super admin bypass is intentional)
 * - Logging patterns (logger.error, TeamActivityLog)
 * - Record ownership (userId in .create() calls)
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

// Controllers that intentionally have different access patterns
const SKIP_CONTROLLERS = new Set([
    'adminAudit.controller.js',      // Super admin bypass is intentional
    'adminDashboard.controller.js',  // Super admin bypass is intentional
    'adminUsers.controller.js',      // Super admin bypass is intentional
    'adminFirms.controller.js',      // Super admin bypass is intentional
    'adminCustomClaims.controller.js', // Super admin bypass is intentional
    'audit.controller.js',           // Audit logging uses userId for ownership
    'auth.controller.js',            // Auth flows have special handling
    'cspReport.controller.js',       // CSP reports use userId for logging only
    'cloudStorage.controller.js',    // Uses userId for error logging only
    'discord.controller.js',         // Uses userId for notification context
    'fieldHistory.controller.js',    // Uses userId for audit trail
    'message.controller.js',         // Uses userId for messaging context
    'notification.controller.js',    // Uses userId for notification targeting
    'permission.controller.js',      // Uses userId for permission checks
    'preparedReport.controller.js',  // Uses userId for report ownership
    'question.controller.js',        // Uses userId for question ownership
    'ssoConfig.controller.js',       // Uses userId for SSO config ownership
    'ssoRouting.controller.js',      // Uses userId for SSO routing
    'stepUpAuth.controller.js',      // Uses userId for step-up auth
    'transaction.controller.js',     // Uses userId within session context
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
// These are patterns that indicate manual query building instead of using req.firmQuery
const BAD_PATTERNS = [
    // Pattern: $or: [{ assignedTo ... patterns - indicates user-based filtering instead of firm
    { pattern: /\$or:\s*\[\s*\{\s*assignedTo/, desc: '$or: [{ assignedTo...' },
    // Pattern: $or: [{ createdBy ... patterns - indicates user-based filtering instead of firm
    { pattern: /\$or:\s*\[\s*\{\s*createdBy/, desc: '$or: [{ createdBy...' },
    // Pattern: firmId ? { firmId } : { $or... } - mixing firm and user-based filtering
    { pattern: /firmId\s*\?\s*\{.*firmId.*\}\s*:\s*\{.*\$or/, desc: 'firmId ? {...} : { $or...' },
    // Pattern: const baseQuery = firmId ? - manual query building
    { pattern: /const\s+baseQuery\s*=\s*firmId\s*\?/, desc: 'const baseQuery = firmId ?' },
    // Pattern: firmId ? { firmId } : {} - empty fallback allows access to ALL data
    { pattern: /firmId\s*\?\s*\{\s*firmId[^}]*\}\s*:\s*\{\s*\}/, desc: 'firmId ? { firmId } : {} (empty fallback!)' },
];

// Lines to exclude from matches (logging, error handling, etc.)
const EXCLUDE_LINE_PATTERNS = [
    /logger\.\w+\s*\(/,     // logger.error, logger.info, etc.
    /\.log\s*\(/,           // TeamActivityLog.log, console.log, etc.
    /\.create\s*\(/,        // Model.create() calls (ownership)
    /sanitizeForLog/,       // Sanitization for logging
    /\/\/.*userId/,         // Commented out code
];

function shouldExcludeLine(line) {
    return EXCLUDE_LINE_PATTERNS.some(pattern => pattern.test(line));
}

// Scan controllers
console.log('\n=== Scanning Controllers ===\n');

if (fs.existsSync(CONTROLLERS_DIR)) {
    const controllerFiles = fs.readdirSync(CONTROLLERS_DIR).filter(f => f.endsWith('.js'));

    for (const file of controllerFiles) {
        // Skip intentionally different controllers
        if (SKIP_CONTROLLERS.has(file)) continue;

        const content = fs.readFileSync(path.join(CONTROLLERS_DIR, file), 'utf8');
        const lines = content.split('\n');
        const issues = [];

        for (const { pattern, desc } of BAD_PATTERNS) {
            // Check each line individually to allow exclusions
            lines.forEach((line, idx) => {
                if (pattern.test(line) && !shouldExcludeLine(line)) {
                    issues.push(`Line ${idx + 1}: ${desc}`);
                }
            });
        }

        // Check for firmId ? { firmId } : { userId } - should use req.firmQuery
        // EXCLUDE: firmId ? { firmId } : { lawyerId: userId } which is correct
        lines.forEach((line, idx) => {
            // Pattern: firmId ? { firmId } : { userId } without lawyerId
            const badTernaryPattern = /firmId\s*\?\s*\{[^}]*firmId[^}]*\}\s*:\s*\{[^}]*userId[^}]*\}/;
            if (badTernaryPattern.test(line) && !shouldExcludeLine(line)) {
                // Exclude if it's using lawyerId: userId (which is correct)
                if (!line.includes('lawyerId')) {
                    issues.push(`Line ${idx + 1}: firmId ? {...firmId...} : {...userId...} (should use req.firmQuery)`);
                }
            }
        });

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
        // Skip admin tools service (has intentional super admin bypass)
        if (file === 'adminTools.service.js') continue;

        const content = fs.readFileSync(path.join(SERVICES_DIR, file), 'utf8');
        const lines = content.split('\n');
        const issues = [];

        for (const { pattern, desc } of BAD_PATTERNS) {
            lines.forEach((line, idx) => {
                if (pattern.test(line) && !shouldExcludeLine(line)) {
                    issues.push(`Line ${idx + 1}: ${desc}`);
                }
            });
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

if (SKIP_CONTROLLERS.size > 0) {
    console.log(`\nNOTE: ${SKIP_CONTROLLERS.size} controllers skipped (admin/auth/logging contexts)`);
}

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
    output += '_None found_ ✅\n';
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
    output += '_None found_ ✅\n';
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
## Skipped Controllers

These controllers are intentionally skipped (admin/auth/logging contexts):

${Array.from(SKIP_CONTROLLERS).map(c => `- \`${c}\``).join('\n')}

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
const baseQuery = { ...req.firmQuery }; // Already set by firmFilter middleware
\`\`\`
`;

fs.writeFileSync(outputPath, output);
console.log(`\nReport written to: ${outputPath}`);

// Exit with error code if issues found
const totalIssues = results.modelsMissingLawyerId.length +
                    results.controllersWithBadPatterns.length +
                    results.servicesWithBadPatterns.length;
process.exit(totalIssues > 0 ? 1 : 0);
