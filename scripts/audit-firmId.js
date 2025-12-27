#!/usr/bin/env node
/**
 * FirmId Audit Script
 *
 * READ-ONLY SCRIPT - Does NOT modify any files!
 *
 * Scans all model files and identifies which ones are missing the firmId field.
 * This helps identify models that bypass the globalFirmIsolation plugin.
 *
 * Usage: node scripts/audit-firmId.js
 */

const fs = require('fs');
const path = require('path');

// Models that SHOULD skip firm isolation (system/global models)
// These are copied from globalFirmIsolation.plugin.js
const SKIP_MODELS = new Set([
    'User',              // Users are looked up during auth before firm context
    'Firm',              // Firms are the tenant themselves
    'FirmInvitation',    // Invitations checked before user joins firm
    'Session',           // Auth sessions
    'RefreshToken',      // Auth tokens
    'RevokedToken',      // Auth tokens
    'EmailOtp',          // Auth OTPs
    'PhoneOtp',          // Auth OTPs
    'MagicLink',         // Auth magic links
    'EmailVerification', // Auth verification
    'PasswordHistory',   // Auth password history
    'Counter',           // System counters
    'MigrationLog',      // System migrations
    'SsoProvider',       // SSO configuration
    'SsoUserLink',       // SSO user links (checked during OAuth)
    'WebauthnCredential', // Auth credentials
    'ReauthChallenge',   // Auth challenges
    'Account',           // Chart of accounts (shared)
    'SubscriptionPlan',  // Global subscription plans
    'Plugin',            // Global plugins
]);

// Additional models that might be legitimately global
const LIKELY_GLOBAL_MODELS = new Set([
    'Country',
    'City',
    'Currency',
    'Language',
    'Timezone',
    'ExchangeRate',
]);

const modelsDir = path.join(__dirname, '..', 'src', 'models');

function getModelNameFromFile(filename) {
    // Convert case.model.js -> Case
    // Convert trustAccount.model.js -> TrustAccount
    const baseName = filename.replace('.model.js', '');
    return baseName.charAt(0).toUpperCase() + baseName.slice(1);
}

function checkForFirmId(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');

        // Check if firmId is defined in the schema
        // Look for patterns like:
        // firmId: { type: ... }
        // firmId: mongoose.Schema.Types.ObjectId
        // firmId: ObjectId
        const hasFirmId = /firmId\s*:\s*(\{|mongoose|ObjectId|Schema)/i.test(content);

        // Also check for lawyerId as an alternative isolation field
        const hasLawyerId = /lawyerId\s*:\s*(\{|mongoose|ObjectId|Schema)/i.test(content);

        return { hasFirmId, hasLawyerId };
    } catch (err) {
        console.error(`Error reading ${filePath}:`, err.message);
        return { hasFirmId: false, hasLawyerId: false, error: true };
    }
}

function scanModels() {
    const results = {
        withFirmId: [],
        withLawyerIdOnly: [],
        missingFirmId: [],
        skippedGlobal: [],
        likelyGlobal: [],
        errors: []
    };

    // Get all .model.js files
    const files = fs.readdirSync(modelsDir)
        .filter(f => f.endsWith('.model.js'));

    console.log('\n╔══════════════════════════════════════════════════════════════════╗');
    console.log('║           FirmId Audit Report - READ ONLY SCAN                   ║');
    console.log('╚══════════════════════════════════════════════════════════════════╝\n');
    console.log(`Scanning ${files.length} model files...\n`);

    for (const file of files) {
        const filePath = path.join(modelsDir, file);
        const modelName = getModelNameFromFile(file);

        // Check if it's a known skip model
        if (SKIP_MODELS.has(modelName)) {
            results.skippedGlobal.push({ file, modelName, reason: 'In SKIP_MODELS list' });
            continue;
        }

        // Check if it's likely a global model
        if (LIKELY_GLOBAL_MODELS.has(modelName)) {
            results.likelyGlobal.push({ file, modelName, reason: 'Likely global/lookup table' });
            continue;
        }

        const { hasFirmId, hasLawyerId, error } = checkForFirmId(filePath);

        if (error) {
            results.errors.push({ file, modelName });
            continue;
        }

        if (hasFirmId) {
            results.withFirmId.push({ file, modelName });
        } else if (hasLawyerId) {
            results.withLawyerIdOnly.push({ file, modelName });
        } else {
            results.missingFirmId.push({ file, modelName });
        }
    }

    // Print report
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('                           SUMMARY');
    console.log('═══════════════════════════════════════════════════════════════════\n');

    console.log(`✅ Models WITH firmId:           ${results.withFirmId.length}`);
    console.log(`⚠️  Models with lawyerId only:    ${results.withLawyerIdOnly.length}`);
    console.log(`❌ Models MISSING firmId:         ${results.missingFirmId.length}`);
    console.log(`⏭️  Skipped (global models):      ${results.skippedGlobal.length}`);
    console.log(`❓ Errors reading files:          ${results.errors.length}`);
    console.log('');

    // Models missing firmId - THE CRITICAL LIST
    if (results.missingFirmId.length > 0) {
        console.log('\n═══════════════════════════════════════════════════════════════════');
        console.log('     ⚠️  CRITICAL: MODELS MISSING firmId (need to be fixed)');
        console.log('═══════════════════════════════════════════════════════════════════\n');

        results.missingFirmId.forEach((item, idx) => {
            console.log(`  ${(idx + 1).toString().padStart(3)}. ${item.file}`);
        });
        console.log('');
    }

    // Models with only lawyerId
    if (results.withLawyerIdOnly.length > 0) {
        console.log('\n═══════════════════════════════════════════════════════════════════');
        console.log('     ⚠️  Models with lawyerId only (review if firmId needed)');
        console.log('═══════════════════════════════════════════════════════════════════\n');

        results.withLawyerIdOnly.forEach((item, idx) => {
            console.log(`  ${(idx + 1).toString().padStart(3)}. ${item.file}`);
        });
        console.log('');
    }

    // Skipped global models
    if (results.skippedGlobal.length > 0) {
        console.log('\n═══════════════════════════════════════════════════════════════════');
        console.log('     ⏭️  Skipped (System/Global Models - no firmId needed)');
        console.log('═══════════════════════════════════════════════════════════════════\n');

        results.skippedGlobal.forEach((item, idx) => {
            console.log(`  ${(idx + 1).toString().padStart(3)}. ${item.file} - ${item.reason}`);
        });
        console.log('');
    }

    // Save detailed results to JSON for further processing
    const outputPath = path.join(__dirname, 'firmId-audit-results.json');
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
    console.log(`\n📄 Detailed results saved to: ${outputPath}`);

    console.log('\n═══════════════════════════════════════════════════════════════════');
    console.log('                         NEXT STEPS');
    console.log('═══════════════════════════════════════════════════════════════════\n');
    console.log('1. Review the "MISSING firmId" list above');
    console.log('2. For each model, decide if it needs firm isolation or is global');
    console.log('3. Add firmId field to models that need isolation');
    console.log('4. Add truly global models to SKIP_MODELS in globalFirmIsolation.plugin.js');
    console.log('');

    return results;
}

// Run the scan
scanModels();
