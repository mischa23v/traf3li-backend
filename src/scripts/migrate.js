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
    logger.info(`
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
    logger.info('\n' + '='.repeat(90));
    logger.info('MIGRATION STATUS');
    logger.info('='.repeat(90));

    logger.info('\nSummary:');
    logger.info(`  Total:     ${statusData.summary.total}`);
    logger.info(`  Applied:   ${statusData.summary.applied}`);
    logger.info(`  Pending:   ${statusData.summary.pending}`);
    logger.info(`  Failed:    ${statusData.summary.failed}`);
    logger.info(`  Reverted:  ${statusData.summary.reverted}`);
    logger.info(`  Modified:  ${statusData.summary.modified}`);

    if (statusData.migrations.length > 0) {
        logger.info('\nMigrations:');
        logger.info('─'.repeat(90));
        logger.info(
            'Status'.padEnd(12) +
            'Name'.padEnd(40) +
            'Version'.padEnd(12) +
            'Applied At'.padEnd(20) +
            'Duration'
        );
        logger.info('─'.repeat(90));

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

            logger.info(`${statusStr}${nameStr}${versionStr}${appliedStr}  ${durationStr}`);

            if (!migration.checksumMatch && migration.status === 'applied') {
                logger.warn(`  ⚠️  WARNING: Migration file has been modified after being applied!`);
            }

            if (migration.error) {
                logger.error(`  ERROR: ${migration.error}`);
            }
        }
    }

    logger.info('='.repeat(90) + '\n');
};

// Display validation results
const displayValidation = (validationData) => {
    logger.info('\n' + '='.repeat(90));
    logger.info('MIGRATION VALIDATION');
    logger.info('='.repeat(90));

    logger.info(`\nTotal migrations checked: ${validationData.totalChecked}`);
    logger.info(`Status: ${validationData.valid ? '✓ VALID' : '✗ INVALID'}\n`);

    if (validationData.issues.modified.length > 0) {
        logger.warn('⚠️  Modified Migrations (checksum mismatch):');
        logger.info('─'.repeat(90));
        for (const issue of validationData.issues.modified) {
            logger.warn(`  • ${issue.name}`);
            logger.info(`    Applied at: ${new Date(issue.appliedAt).toISOString()}`);
            logger.info(`    Message: ${issue.message}`);
            logger.info(`    Old checksum: ${issue.oldChecksum}`);
            logger.info(`    New checksum: ${issue.newChecksum}`);
            logger.info('');
        }
    }

    if (validationData.issues.missing.length > 0) {
        logger.error('✗ Missing Migrations:');
        logger.info('─'.repeat(90));
        for (const issue of validationData.issues.missing) {
            logger.error(`  • ${issue.name}`);
            logger.info(`    Applied at: ${new Date(issue.appliedAt).toISOString()}`);
            logger.info(`    Message: ${issue.message}`);
            logger.info('');
        }
    }

    if (validationData.valid) {
        logger.info('✓ All migrations are valid. No issues detected.');
    }

    logger.info('='.repeat(90) + '\n');
};

// Display migration history
const displayHistory = (history) => {
    logger.info('\n' + '='.repeat(90));
    logger.info('MIGRATION HISTORY');
    logger.info('='.repeat(90));

    if (history.length === 0) {
        logger.info('\nNo migration history found.\n');
        return;
    }

    logger.info('\n' + '─'.repeat(90));
    logger.info(
        'Status'.padEnd(12) +
        'Name'.padEnd(40) +
        'Applied At'.padEnd(22) +
        'By'
    );
    logger.info('─'.repeat(90));

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

        logger.info(`${statusStr}${nameStr}${appliedStr}  ${byStr}`);

        if (entry.error) {
            logger.error(`  ERROR: ${entry.error}`);
        }

        if (entry.revertedAt) {
            logger.info(`  Reverted at: ${new Date(entry.revertedAt).toISOString()} by ${entry.revertedBy}`);
        }
    }

    logger.info('='.repeat(90) + '\n');
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
