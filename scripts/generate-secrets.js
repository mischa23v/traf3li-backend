#!/usr/bin/env node

/**
 * Generate Secrets Script
 *
 * This script generates all required cryptographic secrets for the application.
 * Run this script to quickly generate secure values for your .env file.
 *
 * Usage:
 *   node scripts/generate-secrets.js
 *
 * This will output three secure random values:
 *   1. JWT_SECRET (for access tokens)
 *   2. JWT_REFRESH_SECRET (for refresh tokens)
 *   3. ENCRYPTION_KEY (for data encryption)
 */

const crypto = require('crypto');

console.log('\n' + '='.repeat(70));
console.log('🔐 TRAF3LI SECRET GENERATOR');
console.log('='.repeat(70));
console.log('\nGenerating cryptographically secure secrets for your .env file...\n');

// Generate JWT secrets (32 bytes = 64 hex characters)
const jwtSecret = crypto.randomBytes(32).toString('hex');
const jwtRefreshSecret = crypto.randomBytes(32).toString('hex');
const encryptionKey = crypto.randomBytes(32).toString('hex');

console.log('📋 Copy and paste these values into your .env file:\n');
console.log('-'.repeat(70));
console.log(`JWT_SECRET=${jwtSecret}`);
console.log(`JWT_REFRESH_SECRET=${jwtRefreshSecret}`);
console.log(`ENCRYPTION_KEY=${encryptionKey}`);
console.log('-'.repeat(70));

console.log('\n✅ Secrets generated successfully!');
console.log('\n⚠️  IMPORTANT SECURITY NOTES:');
console.log('   • Keep these secrets private and secure');
console.log('   • Never commit .env file to git');
console.log('   • Never share secrets via Slack, email, or other channels');
console.log('   • Generate different secrets for each environment (dev, staging, prod)');
console.log('   • Store production secrets in secure vault (AWS Secrets Manager, etc.)');

console.log('\n📝 NEXT STEPS:');
console.log('   1. Copy the values above');
console.log('   2. Paste them into your .env file');
console.log('   3. Set MONGODB_URI to your database connection string');
console.log('   4. Configure optional services (Redis, Sentry, etc.)');
console.log('   5. Start the server: npm start\n');

console.log('='.repeat(70) + '\n');
