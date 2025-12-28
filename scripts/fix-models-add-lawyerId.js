#!/usr/bin/env node
/**
 * Script to add lawyerId field to all models that have firmId
 *
 * This adds the lawyerId field right after firmId in each model schema
 * to support solo lawyer row-level security.
 */

const fs = require('fs');
const path = require('path');

const MODELS_DIR = path.join(__dirname, '../src/models');

// Models that should be skipped (system models)
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
    // Already fixed
    'notification.model.js',
    'reminder.model.js',
    'task.model.js',
]);

const lawyerIdField = `
    // For solo lawyers (no firm) - enables row-level security
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },`;

let fixedCount = 0;
let skippedCount = 0;
let errorCount = 0;

const modelFiles = fs.readdirSync(MODELS_DIR).filter(f => f.endsWith('.model.js'));

for (const file of modelFiles) {
    if (SKIP_MODELS.has(file)) {
        console.log(`⏭️  Skipping ${file} (in skip list)`);
        skippedCount++;
        continue;
    }

    const filePath = path.join(MODELS_DIR, file);
    let content = fs.readFileSync(filePath, 'utf8');

    // Check if has firmId but not lawyerId
    const hasFirmId = content.includes('firmId:') || content.includes('firmId :');
    const hasLawyerId = content.includes('lawyerId:') || content.includes('lawyerId :');

    if (!hasFirmId) {
        console.log(`⏭️  Skipping ${file} (no firmId)`);
        skippedCount++;
        continue;
    }

    if (hasLawyerId) {
        console.log(`✅ ${file} already has lawyerId`);
        skippedCount++;
        continue;
    }

    // Find the firmId field definition and add lawyerId after it
    // Pattern: firmId: { ... },
    const firmIdPattern = /(firmId:\s*\{[^}]+\})(,?\s*\n)/;
    const match = content.match(firmIdPattern);

    if (!match) {
        console.log(`⚠️  ${file} - Could not find firmId pattern to insert after`);
        errorCount++;
        continue;
    }

    // Insert lawyerId after firmId
    const newContent = content.replace(firmIdPattern, `$1,$2${lawyerIdField}\n`);

    // Verify the replacement happened
    if (newContent === content) {
        console.log(`⚠️  ${file} - Replacement failed`);
        errorCount++;
        continue;
    }

    // Write the updated file
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`✅ Fixed ${file}`);
    fixedCount++;
}

console.log(`\n=== SUMMARY ===`);
console.log(`Fixed: ${fixedCount}`);
console.log(`Skipped: ${skippedCount}`);
console.log(`Errors: ${errorCount}`);

if (fixedCount > 0) {
    console.log(`\n⚠️  Remember to also:`);
    console.log(`   1. Update controllers to use req.firmQuery`);
    console.log(`   2. Update code that creates data to set lawyerId for solo lawyers`);
    console.log(`   3. Run a migration to backfill lawyerId for existing solo lawyer data`);
}
