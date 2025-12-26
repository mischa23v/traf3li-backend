/**
 * Migration: Create Solo Firms for Existing Solo Users
 *
 * This migration creates a personal/solo firm for all existing lawyers who don't
 * have a firmId. This ensures consistent data isolation using firmId across the
 * entire codebase.
 *
 * Background:
 * - Previously, solo lawyers had no firmId, which caused the RLS plugin to fail
 * - The "Personal Firm" pattern gives each solo lawyer their own firm
 * - All queries can now consistently use firmId for data isolation
 *
 * Run with:
 *   node src/scripts/migrate.js run create-solo-firms-for-existing-users.js
 *
 * Revert with:
 *   node src/scripts/migrate.js down create-solo-firms-for-existing-users.js
 */

const mongoose = require('mongoose');
const logger = require('../utils/logger');

/**
 * Apply migration - Create solo firms for existing solo users
 */
const up = async () => {
    logger.info('Starting migration: Create solo firms for existing solo users');

    try {
        const User = require('../models/user.model');
        const Firm = require('../models/firm.model');

        // Find all lawyers without a firmId
        const soloLawyers = await User.find({
            $or: [
                { role: 'lawyer', firmId: { $exists: false } },
                { role: 'lawyer', firmId: null },
                { isSeller: true, firmId: { $exists: false } },
                { isSeller: true, firmId: null },
                { isSoloLawyer: true, firmId: { $exists: false } },
                { isSoloLawyer: true, firmId: null }
            ]
        }).setOptions({ bypassFirmFilter: true });

        if (soloLawyers.length === 0) {
            logger.info('No solo lawyers without firms found');
            return;
        }

        logger.info(`Found ${soloLawyers.length} solo lawyers without firms`);

        let created = 0;
        let failed = 0;
        const failedUsers = [];

        // Process each solo lawyer
        for (const user of soloLawyers) {
            try {
                // Double-check user doesn't already have a firm
                if (user.firmId) {
                    logger.info(`Skipping user ${user._id} - already has firmId`);
                    continue;
                }

                // Create a solo firm for this user
                const soloFirm = await Firm.createSoloFirm(user);

                created++;
                logger.info(`Created solo firm for user ${user._id}: ${soloFirm.name} (${soloFirm._id})`);

            } catch (error) {
                failed++;
                failedUsers.push({ userId: user._id, email: user.email, error: error.message });
                logger.error(`Failed to create solo firm for user ${user._id}:`, error.message);
            }
        }

        logger.info(`\n======== MIGRATION SUMMARY ========`);
        logger.info(`Total solo lawyers found: ${soloLawyers.length}`);
        logger.info(`Solo firms created: ${created}`);
        logger.info(`Failed: ${failed}`);

        if (failedUsers.length > 0) {
            logger.warn('Failed users:', failedUsers);
        }

        logger.info(`\n✓ Migration completed: Created ${created} solo firms`);

    } catch (error) {
        logger.error('Migration failed:', error);
        throw error;
    }
};

/**
 * Revert migration - Delete solo firms created by this migration
 *
 * WARNING: This will delete all solo firms and remove firmId from users.
 * Only use this if you need to completely revert to the old system.
 */
const down = async () => {
    logger.info('Reverting migration: Delete solo firms');

    try {
        const User = require('../models/user.model');
        const Firm = require('../models/firm.model');

        // Find all solo firms
        const soloFirms = await Firm.find({
            isSoloFirm: true
        });

        if (soloFirms.length === 0) {
            logger.info('No solo firms found to delete');
            return;
        }

        logger.info(`Found ${soloFirms.length} solo firms to delete`);

        let deleted = 0;

        for (const firm of soloFirms) {
            try {
                // Remove firmId from the owner
                await User.findByIdAndUpdate(firm.ownerId, {
                    $unset: { firmId: '', firmRole: '', firmStatus: '' },
                    isSoloLawyer: true,
                    lawyerWorkMode: 'solo'
                }).setOptions({ bypassFirmFilter: true });

                // Delete the solo firm
                await Firm.findByIdAndDelete(firm._id);

                deleted++;
                logger.info(`Deleted solo firm ${firm._id} for user ${firm.ownerId}`);

            } catch (error) {
                logger.error(`Failed to delete solo firm ${firm._id}:`, error.message);
            }
        }

        logger.info(`✓ Revert completed: Deleted ${deleted} solo firms`);

    } catch (error) {
        logger.error('Revert failed:', error);
        throw error;
    }
};

// Export migration functions
module.exports = {
    up,
    down
};
