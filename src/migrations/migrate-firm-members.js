/**
 * Migration: Migrate Firm Members to FirmMember Collection
 *
 * This migration moves member data from the embedded firm.members[] array
 * to the new standalone FirmMember collection.
 *
 * Benefits of the new structure:
 * - Faster queries (direct lookup vs. array search)
 * - Simpler permission management
 * - Better indexing capabilities
 * - Cleaner separation of concerns
 *
 * Run with:
 *   node src/scripts/migrate.js run migrate-firm-members.js
 *
 * Revert with:
 *   node src/scripts/migrate.js down migrate-firm-members.js
 */

const mongoose = require('mongoose');
const logger = require('../utils/logger');
const { getDefaultPermissions } = require('../config/permissions.config');

// Module keys to check for permission overrides
const MODULE_KEYS = [
    'clients', 'cases', 'leads', 'invoices', 'payments', 'expenses',
    'documents', 'tasks', 'events', 'timeTracking', 'reports', 'settings', 'team', 'hr'
];

// Special permission keys
const SPECIAL_KEYS = [
    'canApproveInvoices', 'canManageRetainers', 'canExportData',
    'canDeleteRecords', 'canViewFinance', 'canManageTeam', 'canAccessHR'
];

/**
 * Compare permissions and return only overrides (values different from role default)
 */
function getPermissionOverrides(role, permissions) {
    const defaults = getDefaultPermissions(role);
    const overrides = {};
    let hasOverrides = false;

    // Check module permissions
    for (const key of MODULE_KEYS) {
        const value = permissions?.[key];
        const defaultValue = defaults?.modules?.[key];

        // Only store if explicitly set and different from default
        if (value !== undefined && value !== null && value !== defaultValue) {
            overrides[key] = value;
            hasOverrides = true;
        }
    }

    // Check special permissions
    for (const key of SPECIAL_KEYS) {
        const value = permissions?.[key];
        const defaultValue = defaults?.special?.[key];

        // Only store if explicitly set and different from default
        if (value !== undefined && value !== null && value !== defaultValue) {
            overrides[key] = value;
            hasOverrides = true;
        }
    }

    return hasOverrides ? overrides : {};
}

/**
 * Apply migration - Create FirmMember records from firm.members[]
 */
const up = async () => {
    logger.info('Starting migration: Migrate firm members to FirmMember collection');

    try {
        // Get FirmMember model
        const FirmMember = require('../models/firmMember.model');

        // Get all firms with members using raw MongoDB to avoid any plugins
        const db = mongoose.connection.db;
        const firmsCollection = db.collection('firms');

        // Count firms with members
        const firmCount = await firmsCollection.countDocuments({
            'members.0': { $exists: true }
        });

        if (firmCount === 0) {
            logger.info('No firms with members found');
            return { firmsProcessed: 0, membersCreated: 0 };
        }

        logger.info(`Found ${firmCount} firms with members to migrate`);

        // Process firms in batches
        const batchSize = 50;
        let firmsProcessed = 0;
        let membersCreated = 0;
        let membersSkipped = 0;

        const cursor = firmsCollection.find({
            'members.0': { $exists: true }
        }).batchSize(batchSize);

        while (await cursor.hasNext()) {
            const firm = await cursor.next();
            const firmId = firm._id;

            if (!firm.members || firm.members.length === 0) {
                continue;
            }

            // Process each member
            for (const member of firm.members) {
                if (!member.userId) {
                    logger.warn(`Skipping member without userId in firm ${firmId}`);
                    membersSkipped++;
                    continue;
                }

                // Check if already migrated
                const existingMember = await FirmMember.findOne({
                    userId: member.userId,
                    firmId: firmId
                }).lean();

                if (existingMember) {
                    logger.debug(`Member ${member.userId} in firm ${firmId} already exists, skipping`);
                    membersSkipped++;
                    continue;
                }

                // Calculate permission overrides
                const overrides = getPermissionOverrides(member.role, member.permissions);

                // Create FirmMember document
                const firmMemberData = {
                    userId: member.userId,
                    firmId: firmId,
                    role: member.role || 'lawyer',
                    status: member.status || 'active',
                    permissionOverrides: overrides,
                    resourcePermissions: [], // Start fresh - can be populated later
                    department: member.department,
                    title: member.title,
                    joinedAt: member.joinedAt || new Date(),
                    departedAt: member.departedAt,
                    departureReason: member.departureReason || member.departureNotes,
                    assignedCases: member.assignedCases || [],
                    previousRole: member.previousRole,
                    createdBy: firm.ownerId,
                    updatedBy: member.departureProcessedBy
                };

                try {
                    await FirmMember.create(firmMemberData);
                    membersCreated++;
                } catch (err) {
                    if (err.code === 11000) {
                        // Duplicate key - already exists
                        logger.debug(`Member ${member.userId} already exists in firm ${firmId}`);
                        membersSkipped++;
                    } else {
                        logger.error(`Failed to create member ${member.userId} in firm ${firmId}:`, err.message);
                        throw err;
                    }
                }
            }

            firmsProcessed++;

            if (firmsProcessed % 10 === 0) {
                logger.info(`Progress: ${firmsProcessed}/${firmCount} firms, ${membersCreated} members created`);
            }
        }

        await cursor.close();

        logger.info(`✓ Migration completed successfully`);
        logger.info(`  - Firms processed: ${firmsProcessed}`);
        logger.info(`  - Members created: ${membersCreated}`);
        logger.info(`  - Members skipped: ${membersSkipped}`);

        return { firmsProcessed, membersCreated, membersSkipped };

    } catch (error) {
        logger.error('Migration failed:', error);
        throw error;
    }
};

/**
 * Revert migration - Remove FirmMember records
 *
 * WARNING: This only removes FirmMember records. It does NOT restore
 * any data that was in the original firm.members[] array (that data is preserved).
 */
const down = async () => {
    logger.info('Reverting migration: Remove FirmMember records');

    try {
        const db = mongoose.connection.db;
        const firmMembersCollection = db.collection('firmmembers');

        // Count existing records
        const count = await firmMembersCollection.countDocuments({});

        if (count === 0) {
            logger.info('No FirmMember records to remove');
            return { removed: 0 };
        }

        logger.info(`Found ${count} FirmMember records to remove`);

        // Confirm this is intentional (in production, you might want to add a safety check)
        logger.warn('WARNING: This will delete all FirmMember records!');

        // Delete all records
        const result = await firmMembersCollection.deleteMany({});

        logger.info(`✓ Revert completed: Removed ${result.deletedCount} FirmMember records`);

        return { removed: result.deletedCount };

    } catch (error) {
        logger.error('Revert failed:', error);
        throw error;
    }
};

/**
 * Validate migration - Check that all firm members have corresponding FirmMember records
 */
const validate = async () => {
    logger.info('Validating migration: Checking FirmMember records');

    try {
        const FirmMember = require('../models/firmMember.model');
        const db = mongoose.connection.db;
        const firmsCollection = db.collection('firms');

        let issues = [];
        let validated = 0;

        const cursor = firmsCollection.find({
            'members.0': { $exists: true }
        });

        while (await cursor.hasNext()) {
            const firm = await cursor.next();

            for (const member of firm.members || []) {
                if (!member.userId) continue;

                const firmMember = await FirmMember.findOne({
                    userId: member.userId,
                    firmId: firm._id
                }).lean();

                if (!firmMember) {
                    issues.push({
                        firmId: firm._id,
                        firmName: firm.name,
                        userId: member.userId,
                        issue: 'Missing FirmMember record'
                    });
                } else {
                    // Verify role matches
                    if (firmMember.role !== member.role) {
                        issues.push({
                            firmId: firm._id,
                            userId: member.userId,
                            issue: `Role mismatch: expected ${member.role}, got ${firmMember.role}`
                        });
                    }
                    validated++;
                }
            }
        }

        await cursor.close();

        if (issues.length > 0) {
            logger.warn(`Validation found ${issues.length} issues:`);
            issues.slice(0, 10).forEach(issue => {
                logger.warn(`  - Firm ${issue.firmId}: ${issue.issue}`);
            });
            if (issues.length > 10) {
                logger.warn(`  ... and ${issues.length - 10} more`);
            }
        } else {
            logger.info(`✓ Validation passed: ${validated} members verified`);
        }

        return { validated, issues };

    } catch (error) {
        logger.error('Validation failed:', error);
        throw error;
    }
};

// Export migration functions
module.exports = {
    up,
    down,
    validate
};
