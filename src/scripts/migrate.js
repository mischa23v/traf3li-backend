#!/usr/bin/env node

/**
 * Migration CLI Script
 *
 * Usage:
 *   node src/scripts/migrate.js up              - Run all pending migrations
 *   node src/scripts/migrate.js down [name]     - Revert a specific migration
 *   node src/scripts/migrate.js status          - Show migration status
 *   node src/scripts/migrate.js validate        - Validate migrations
 *   node src/scripts/migrate.js history         - Show migration history
 *   node src/scripts/migrate.js run [name]      - Run a specific migration
 *
 * Options:
 *   --dry-run                                   - Run in dry-run mode (no changes)
 *   --by [name]                                 - Set who is running the migration
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const migrationService = require('../services/migration.service');
const logger = require('../utils/logger');

// Parse command line arguments
const args = process.argv.slice(2);
const command = args[0];
const migrationName = args[1];

// Parse options
const options = {
    dryRun: args.includes('--dry-run'),
    appliedBy: 'cli'
};

// Get --by option if provided
const byIndex = args.indexOf('--by');
if (byIndex !== -1 && args[byIndex + 1]) {
    options.appliedBy = args[byIndex + 1];
}

// Connect to database
const connectDB = async () => {
    try {
        const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;

        if (!mongoUri) {
            throw new Error('MONGODB_URI or MONGO_URI environment variable is not set');
        }

        await mongoose.connect(mongoUri);
        logger.info('✓ Connected to MongoDB');
    } catch (error) {
        logger.error('MongoDB connection error:', error);
        process.exit(1);
    }
};

// Display help
const showHelp = () => {
    console.log(`
Migration CLI

Usage:
  node src/scripts/migrate.js <command> [options]

Commands:
  up                      Run all pending migrations
  down <name>             Revert a specific migration
  run <name>              Run a specific migration
  status                  Show migration status
  validate                Validate migrations (check for modifications)
  history                 Show migration history
  help                    Show this help message

Options:
  --dry-run               Run in dry-run mode (no changes will be made)
  --by <name>             Set who is running the migration (default: cli)

Examples:
  node src/scripts/migrate.js up
  node src/scripts/migrate.js up --dry-run
  node src/scripts/migrate.js down add-najiz-fields.js
  node src/scripts/migrate.js run 001-add-user-fields.js
  node src/scripts/migrate.js status
  node src/scripts/migrate.js validate
  node src/scripts/migrate.js history --by admin
    `);
};

// Display migration status
const displayStatus = (statusData) => {
    console.log('\n' + '='.repeat(90));
    console.log('MIGRATION STATUS');
    console.log('='.repeat(90));

    console.log('\nSummary:');
    console.log(`  Total:     ${statusData.summary.total}`);
    console.log(`  Applied:   ${statusData.summary.applied}`);
    console.log(`  Pending:   ${statusData.summary.pending}`);
    console.log(`  Failed:    ${statusData.summary.failed}`);
    console.log(`  Reverted:  ${statusData.summary.reverted}`);
    console.log(`  Modified:  ${statusData.summary.modified}`);

    if (statusData.migrations.length > 0) {
        console.log('\nMigrations:');
        console.log('─'.repeat(90));
        console.log(
            'Status'.padEnd(12) +
            'Name'.padEnd(40) +
            'Version'.padEnd(12) +
            'Applied At'.padEnd(20) +
            'Duration'
        );
        console.log('─'.repeat(90));

        for (const migration of statusData.migrations) {
            const statusIcon = {
                'applied': '✓',
                'pending': '○',
                'failed': '✗',
                'reverted': '↶'
            }[migration.status] || '?';

            const statusStr = `${statusIcon} ${migration.status}`.padEnd(12);
            const nameStr = migration.name.padEnd(40);
            const versionStr = (migration.version || '-').padEnd(12);
            const appliedStr = migration.appliedAt
                ? new Date(migration.appliedAt).toISOString().replace('T', ' ').substr(0, 19)
                : '-'.padEnd(19);
            const durationStr = migration.duration ? `${migration.duration}ms` : '-';

            console.log(`${statusStr}${nameStr}${versionStr}${appliedStr}  ${durationStr}`);

            if (!migration.checksumMatch && migration.status === 'applied') {
                console.log(`  ⚠️  WARNING: Migration file has been modified after being applied!`);
            }

            if (migration.error) {
                console.log(`  ERROR: ${migration.error}`);
            }
        }
    }

    console.log('='.repeat(90) + '\n');
};

// Display validation results
const displayValidation = (validationData) => {
    console.log('\n' + '='.repeat(90));
    console.log('MIGRATION VALIDATION');
    console.log('='.repeat(90));

    console.log(`\nTotal migrations checked: ${validationData.totalChecked}`);
    console.log(`Status: ${validationData.valid ? '✓ VALID' : '✗ INVALID'}\n`);

    if (validationData.issues.modified.length > 0) {
        console.log('⚠️  Modified Migrations (checksum mismatch):');
        console.log('─'.repeat(90));
        for (const issue of validationData.issues.modified) {
            console.log(`  • ${issue.name}`);
            console.log(`    Applied at: ${new Date(issue.appliedAt).toISOString()}`);
            console.log(`    Message: ${issue.message}`);
            console.log(`    Old checksum: ${issue.oldChecksum}`);
            console.log(`    New checksum: ${issue.newChecksum}`);
            console.log('');
        }
    }

    if (validationData.issues.missing.length > 0) {
        console.log('✗ Missing Migrations:');
        console.log('─'.repeat(90));
        for (const issue of validationData.issues.missing) {
            console.log(`  • ${issue.name}`);
            console.log(`    Applied at: ${new Date(issue.appliedAt).toISOString()}`);
            console.log(`    Message: ${issue.message}`);
            console.log('');
        }
    }

    if (validationData.valid) {
        console.log('✓ All migrations are valid. No issues detected.');
    }

    console.log('='.repeat(90) + '\n');
};

// Display migration history
const displayHistory = (history) => {
    console.log('\n' + '='.repeat(90));
    console.log('MIGRATION HISTORY');
    console.log('='.repeat(90));

    if (history.length === 0) {
        console.log('\nNo migration history found.\n');
        return;
    }

    console.log('\n' + '─'.repeat(90));
    console.log(
        'Status'.padEnd(12) +
        'Name'.padEnd(40) +
        'Applied At'.padEnd(22) +
        'By'
    );
    console.log('─'.repeat(90));

    for (const entry of history) {
        const statusIcon = {
            'applied': '✓',
            'pending': '○',
            'failed': '✗',
            'reverted': '↶'
        }[entry.status] || '?';

        const statusStr = `${statusIcon} ${entry.status}`.padEnd(12);
        const nameStr = entry.name.padEnd(40);
        const appliedStr = entry.appliedAt
            ? new Date(entry.appliedAt).toISOString().replace('T', ' ').substr(0, 19)
            : '-'.padEnd(19);
        const byStr = entry.appliedBy || '-';

        console.log(`${statusStr}${nameStr}${appliedStr}  ${byStr}`);

        if (entry.error) {
            console.log(`  ERROR: ${entry.error}`);
        }

        if (entry.revertedAt) {
            console.log(`  Reverted at: ${new Date(entry.revertedAt).toISOString()} by ${entry.revertedBy}`);
        }
    }

    console.log('='.repeat(90) + '\n');
};

// Main execution
const main = async () => {
    try {
        // Show help
        if (!command || command === 'help' || command === '--help' || command === '-h') {
            showHelp();
            process.exit(0);
        }

        // Connect to database
        await connectDB();

        // Execute command
        switch (command) {
            case 'up': {
                logger.info('Running all pending migrations...');
                const result = await migrationService.runMigrations(options);

                if (result.success) {
                    logger.info(`✓ Successfully executed ${result.executed} migration(s)`);
                    process.exit(0);
                } else {
                    logger.error(`✗ Migration process failed. ${result.executed} succeeded, ${result.failed} failed`);
                    process.exit(1);
                }
                break;
            }

            case 'down': {
                if (!migrationName) {
                    logger.error('Migration name is required for down command');
                    logger.info('Usage: node src/scripts/migrate.js down <migration-name>');
                    process.exit(1);
                }

                logger.info(`Reverting migration: ${migrationName}`);
                const result = await migrationService.revertMigration(migrationName, {
                    revertedBy: options.appliedBy
                });

                if (result.success) {
                    logger.info(`✓ Successfully reverted migration: ${migrationName}`);
                    process.exit(0);
                } else {
                    logger.warn(`Migration ${migrationName} was not reverted: ${result.reason}`);
                    process.exit(1);
                }
                break;
            }

            case 'run': {
                if (!migrationName) {
                    logger.error('Migration name is required for run command');
                    logger.info('Usage: node src/scripts/migrate.js run <migration-name>');
                    process.exit(1);
                }

                logger.info(`Running migration: ${migrationName}`);
                const result = await migrationService.runMigration(migrationName, options);

                if (result.success) {
                    logger.info(`✓ Successfully executed migration: ${migrationName}`);
                    process.exit(0);
                } else {
                    logger.warn(`Migration ${migrationName} was not executed: ${result.reason}`);
                    process.exit(1);
                }
                break;
            }

            case 'status': {
                const status = await migrationService.getMigrationStatus();
                displayStatus(status);
                process.exit(0);
                break;
            }

            case 'validate': {
                const validation = await migrationService.validateMigrations();
                displayValidation(validation);
                process.exit(validation.valid ? 0 : 1);
                break;
            }

            case 'history': {
                const history = await migrationService.getMigrationHistory();
                displayHistory(history);
                process.exit(0);
                break;
            }

            default: {
                logger.error(`Unknown command: ${command}`);
                showHelp();
                process.exit(1);
            }
        }

    } catch (error) {
        logger.error('Migration script failed:', error);
        process.exit(1);
    } finally {
        // Disconnect from database
        if (mongoose.connection.readyState === 1) {
            await mongoose.disconnect();
            logger.info('✓ Disconnected from MongoDB');
        }
    }
};

// Handle uncaught errors
process.on('unhandledRejection', (error) => {
    logger.error('Unhandled rejection:', error);
    process.exit(1);
});

process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception:', error);
    process.exit(1);
});

// Run the script
main();
