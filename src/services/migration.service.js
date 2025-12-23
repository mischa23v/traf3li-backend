/**
 * Migration Service - Database Migration Management
 *
 * This service provides a comprehensive migration system for MongoDB/Mongoose.
 * It tracks migration execution, validates integrity, and provides rollback capabilities.
 *
 * Features:
 * - Migration execution tracking
 * - Checksum validation for integrity
 * - Rollback support
 * - Migration status reporting
 * - Modified migration detection
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');
const MigrationLog = require('../models/migrationLog.model');
const logger = require('../utils/logger');

class MigrationService {
    constructor() {
        this.migrationsDir = path.join(process.cwd(), 'src', 'migrations');
    }

    /**
     * Calculate checksum of a file
     * @private
     */
    async _calculateChecksum(filePath) {
        try {
            const content = await fs.readFile(filePath, 'utf8');
            return crypto.createHash('sha256').update(content).digest('hex');
        } catch (error) {
            logger.error(`Failed to calculate checksum for ${filePath}:`, error);
            throw error;
        }
    }

    /**
     * Get all migration files from the migrations directory
     * @private
     */
    async _getMigrationFiles() {
        try {
            const files = await fs.readdir(this.migrationsDir);
            const migrationFiles = files
                .filter(file => file.endsWith('.js') && !file.startsWith('.'))
                .sort(); // Sort alphabetically for consistent ordering

            const migrations = [];
            for (const file of migrationFiles) {
                const filePath = path.join(this.migrationsDir, file);
                const checksum = await this._calculateChecksum(filePath);
                const stats = await fs.stat(filePath);

                migrations.push({
                    name: file,
                    path: filePath,
                    checksum,
                    version: this._extractVersion(file),
                    createdAt: stats.birthtime
                });
            }

            return migrations;
        } catch (error) {
            logger.error('Failed to read migration files:', error);
            throw error;
        }
    }

    /**
     * Extract version from migration filename
     * @private
     */
    _extractVersion(filename) {
        // Try to extract version like "v1.0.0" or "001" from filename
        const versionMatch = filename.match(/^(\d+|v\d+\.\d+\.\d+)/);
        return versionMatch ? versionMatch[1] : '1.0.0';
    }

    /**
     * Load and execute a migration file
     * @private
     */
    async _executeMigration(migration, direction = 'up') {
        try {
            // Clear require cache to ensure fresh load
            delete require.cache[require.resolve(migration.path)];

            const migrationModule = require(migration.path);

            // Check if migration exports the required function
            if (typeof migrationModule[direction] !== 'function' && direction === 'up') {
                // If no 'up' function, check if it's a legacy migration that runs on require
                logger.warn(`Migration ${migration.name} does not export an '${direction}' function. Assuming legacy format.`);
                return true;
            }

            if (typeof migrationModule[direction] !== 'function') {
                throw new Error(`Migration ${migration.name} does not export an '${direction}' function`);
            }

            // Execute the migration function
            await migrationModule[direction]();
            return true;
        } catch (error) {
            logger.error(`Failed to execute migration ${migration.name}:`, error);
            throw error;
        }
    }

    /**
     * Run all pending migrations
     * @param {Object} options - Options for migration execution
     * @returns {Promise<Object>} - Migration results
     */
    async runMigrations(options = {}) {
        const { dryRun = false, appliedBy = 'system' } = options;
        const timer = logger.startTimer();

        try {
            logger.info('='.repeat(70));
            logger.info('Starting migration process...');
            logger.info('='.repeat(70));

            if (dryRun) {
                logger.info('DRY RUN MODE - No changes will be made');
            }

            // Get all migration files
            const allMigrations = await this._getMigrationFiles();
            logger.info(`Found ${allMigrations.length} migration file(s)`);

            // Get pending migrations
            const pendingMigrations = await MigrationLog.getPendingMigrations(allMigrations);

            if (pendingMigrations.length === 0) {
                logger.info('No pending migrations to run');
                return {
                    success: true,
                    executed: 0,
                    failed: 0,
                    skipped: 0,
                    migrations: []
                };
            }

            logger.info(`Found ${pendingMigrations.length} pending migration(s) to run`);

            const results = {
                success: true,
                executed: 0,
                failed: 0,
                skipped: 0,
                migrations: []
            };

            // Execute each pending migration
            for (const migration of pendingMigrations) {
                try {
                    logger.info(`\nExecuting migration: ${migration.name}`);

                    if (dryRun) {
                        logger.info(`[DRY RUN] Would execute: ${migration.name}`);
                        results.skipped++;
                        results.migrations.push({
                            name: migration.name,
                            status: 'skipped',
                            reason: 'dry-run'
                        });
                        continue;
                    }

                    const startTime = Date.now();

                    // Execute the migration
                    await this._executeMigration(migration, 'up');

                    const duration = Date.now() - startTime;

                    // Mark as applied
                    await MigrationLog.markApplied(
                        migration.name,
                        migration.version,
                        migration.checksum,
                        duration,
                        appliedBy
                    );

                    logger.info(`✓ Migration ${migration.name} completed successfully (${duration}ms)`);

                    results.executed++;
                    results.migrations.push({
                        name: migration.name,
                        status: 'applied',
                        duration
                    });

                } catch (error) {
                    logger.error(`✗ Migration ${migration.name} failed:`, error);

                    // Mark as failed
                    await MigrationLog.markFailed(
                        migration.name,
                        migration.version,
                        migration.checksum,
                        error,
                        Date.now() - startTime,
                        appliedBy
                    );

                    results.failed++;
                    results.success = false;
                    results.migrations.push({
                        name: migration.name,
                        status: 'failed',
                        error: error.message
                    });

                    // Stop on first failure
                    logger.error('Migration failed. Stopping execution.');
                    break;
                }
            }

            logger.info('\n' + '='.repeat(70));
            logger.info('Migration process completed');
            logger.info(`Executed: ${results.executed}, Failed: ${results.failed}, Skipped: ${results.skipped}`);
            logger.info('='.repeat(70));

            timer.done({ operation: 'runMigrations', ...results });

            return results;
        } catch (error) {
            logger.error('Migration process failed:', error);
            throw error;
        }
    }

    /**
     * Run a specific migration by name
     * @param {String} name - Migration name/filename
     * @param {Object} options - Options for migration execution
     * @returns {Promise<Object>} - Migration result
     */
    async runMigration(name, options = {}) {
        const { appliedBy = 'system' } = options;

        try {
            logger.info(`Running migration: ${name}`);

            // Check if already applied
            const isApplied = await MigrationLog.isApplied(name);
            if (isApplied) {
                logger.warn(`Migration ${name} has already been applied`);
                return { success: false, reason: 'already-applied' };
            }

            // Get migration file
            const allMigrations = await this._getMigrationFiles();
            const migration = allMigrations.find(m => m.name === name);

            if (!migration) {
                throw new Error(`Migration ${name} not found`);
            }

            const startTime = Date.now();

            // Execute the migration
            await this._executeMigration(migration, 'up');

            const duration = Date.now() - startTime;

            // Mark as applied
            await MigrationLog.markApplied(
                migration.name,
                migration.version,
                migration.checksum,
                duration,
                appliedBy
            );

            logger.info(`✓ Migration ${name} completed successfully (${duration}ms)`);

            return {
                success: true,
                name: migration.name,
                duration
            };

        } catch (error) {
            logger.error(`Failed to run migration ${name}:`, error);

            // Mark as failed
            const allMigrations = await this._getMigrationFiles();
            const migration = allMigrations.find(m => m.name === name);

            if (migration) {
                await MigrationLog.markFailed(
                    migration.name,
                    migration.version,
                    migration.checksum,
                    error,
                    Date.now() - startTime,
                    appliedBy
                );
            }

            throw error;
        }
    }

    /**
     * Revert a specific migration
     * @param {String} name - Migration name/filename
     * @param {Object} options - Options for revert
     * @returns {Promise<Object>} - Revert result
     */
    async revertMigration(name, options = {}) {
        const { revertedBy = 'system' } = options;

        try {
            logger.info(`Reverting migration: ${name}`);

            // Check if migration was applied
            const isApplied = await MigrationLog.isApplied(name);
            if (!isApplied) {
                logger.warn(`Migration ${name} has not been applied or was already reverted`);
                return { success: false, reason: 'not-applied' };
            }

            // Get migration file
            const allMigrations = await this._getMigrationFiles();
            const migration = allMigrations.find(m => m.name === name);

            if (!migration) {
                throw new Error(`Migration ${name} not found`);
            }

            const startTime = Date.now();

            // Execute the revert
            await this._executeMigration(migration, 'down');

            const duration = Date.now() - startTime;

            // Mark as reverted
            await MigrationLog.markReverted(migration.name, revertedBy);

            logger.info(`✓ Migration ${name} reverted successfully (${duration}ms)`);

            return {
                success: true,
                name: migration.name,
                duration
            };

        } catch (error) {
            logger.error(`Failed to revert migration ${name}:`, error);
            throw error;
        }
    }

    /**
     * Get status of all migrations
     * @returns {Promise<Object>} - Migration status
     */
    async getMigrationStatus() {
        try {
            const allMigrations = await this._getMigrationFiles();
            const migrationLogs = await MigrationLog.find({}).sort({ appliedAt: 1 });

            const logMap = new Map(migrationLogs.map(log => [log.name, log]));

            const status = allMigrations.map(migration => {
                const log = logMap.get(migration.name);

                return {
                    name: migration.name,
                    version: migration.version,
                    status: log ? log.status : 'pending',
                    appliedAt: log?.appliedAt || null,
                    revertedAt: log?.revertedAt || null,
                    duration: log?.duration || null,
                    error: log?.error || null,
                    checksum: migration.checksum,
                    appliedBy: log?.appliedBy || null,
                    checksumMatch: log ? log.checksum === migration.checksum : true
                };
            });

            const summary = {
                total: allMigrations.length,
                applied: status.filter(s => s.status === 'applied').length,
                pending: status.filter(s => s.status === 'pending').length,
                failed: status.filter(s => s.status === 'failed').length,
                reverted: status.filter(s => s.status === 'reverted').length,
                modified: status.filter(s => !s.checksumMatch && s.status === 'applied').length
            };

            return {
                summary,
                migrations: status
            };

        } catch (error) {
            logger.error('Failed to get migration status:', error);
            throw error;
        }
    }

    /**
     * Validate migrations - check for missing or modified migrations
     * @returns {Promise<Object>} - Validation results
     */
    async validateMigrations() {
        try {
            logger.info('Validating migrations...');

            const allMigrations = await this._getMigrationFiles();
            const migrationLogs = await MigrationLog.find({ status: 'applied' });

            const issues = {
                modified: [],
                missing: [],
                valid: true
            };

            // Check for modified migrations (checksum mismatch)
            for (const log of migrationLogs) {
                const migration = allMigrations.find(m => m.name === log.name);

                if (!migration) {
                    issues.missing.push({
                        name: log.name,
                        appliedAt: log.appliedAt,
                        message: 'Migration file is missing but was previously applied'
                    });
                    issues.valid = false;
                } else if (migration.checksum !== log.checksum) {
                    issues.modified.push({
                        name: migration.name,
                        appliedAt: log.appliedAt,
                        oldChecksum: log.checksum,
                        newChecksum: migration.checksum,
                        message: 'Migration file has been modified after being applied'
                    });
                    issues.valid = false;
                }
            }

            if (!issues.valid) {
                logger.warn(`Validation failed: ${issues.modified.length} modified, ${issues.missing.length} missing`);
            } else {
                logger.info('✓ All migrations are valid');
            }

            return {
                valid: issues.valid,
                issues,
                totalChecked: migrationLogs.length
            };

        } catch (error) {
            logger.error('Failed to validate migrations:', error);
            throw error;
        }
    }

    /**
     * Get migration history
     * @param {Object} options - Query options
     * @returns {Promise<Array>} - Migration history
     */
    async getMigrationHistory(options = {}) {
        try {
            const { limit = 50, status = null } = options;

            const query = status ? { status } : {};

            return await MigrationLog.find(query)
                .sort({ appliedAt: -1 })
                .limit(limit);
        } catch (error) {
            logger.error('Failed to get migration history:', error);
            throw error;
        }
    }
}

// Export singleton instance
module.exports = new MigrationService();
