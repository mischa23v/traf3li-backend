/**
 * Sandbox Service
 *
 * Manages sandbox/demo environments for users to test the platform.
 * Handles creation, deletion, reset, and lifecycle management.
 */

const mongoose = require('mongoose');
const Sandbox = require('../models/sandbox.model');
const { Firm, User, Client, Case, Invoice, Expense } = require('../models');
const sampleDataService = require('./sampleData.service');
const logger = require('../utils/logger');

class SandboxService {
    /**
     * Create a new sandbox environment
     * @param {string} userId - User ID
     * @param {Object} options - Sandbox options
     * @returns {Promise<Object>} Created sandbox
     */
    static async createSandbox(userId, options = {}) {
        try {
            const {
                templateId = 'basic_law_firm',
                dataProfile = 'sample_data',
                expirationDays = 7,
                firmName = 'مكتب المحاماة التجريبي'
            } = options;

            // Check if user already has an active sandbox
            const existingSandbox = await Sandbox.getActiveSandbox(userId);
            if (existingSandbox) {
                throw new Error('User already has an active sandbox environment');
            }

            // Get user details
            const user = await User.findById(userId);
            if (!user) {
                throw new Error('User not found');
            }

            // Create sandbox firm
            const firm = await Firm.create({
                name: firmName,
                nameArabic: firmName,
                nameEnglish: 'Demo Law Firm',
                description: 'بيئة تجريبية للتعرف على النظام',
                ownerId: userId,
                members: [{
                    userId: userId,
                    role: 'owner',
                    status: 'active',
                    permissions: this._getOwnerPermissions()
                }],
                status: 'active',
                subscription: {
                    plan: 'professional',
                    status: 'trial',
                    trialEndsAt: new Date(Date.now() + expirationDays * 24 * 60 * 60 * 1000),
                    features: {
                        zatcaIntegration: true,
                        advancedReports: true,
                        multiCurrency: true,
                        apiAccess: false,
                        customBranding: false
                    }
                },
                settings: {
                    timezone: 'Asia/Riyadh',
                    language: 'ar',
                    dateFormat: 'DD/MM/YYYY'
                },
                address: {
                    city: 'الرياض',
                    region: 'منطقة الرياض',
                    country: 'Saudi Arabia'
                }
            });

            // Calculate expiration date
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + expirationDays);

            // Create sandbox record
            const sandbox = await Sandbox.create({
                userId,
                firmId: firm._id,
                status: 'creating',
                templateId,
                dataProfile,
                expiresAt,
                isDemo: true,
                features: ['clients', 'cases', 'invoices', 'time_tracking', 'documents', 'reports']
            });

            logger.info(`[Sandbox] Created sandbox ${sandbox._id} for user ${userId}`);

            // Populate sample data based on dataProfile
            if (dataProfile !== 'empty') {
                try {
                    await this.populateSampleData(sandbox._id, templateId);
                    sandbox.status = 'active';
                    await sandbox.save();
                    logger.info(`[Sandbox] Populated sample data for sandbox ${sandbox._id}`);
                } catch (error) {
                    logger.error(`[Sandbox] Failed to populate sample data:`, error);
                    sandbox.status = 'active'; // Continue anyway
                    await sandbox.save();
                }
            } else {
                sandbox.status = 'active';
                await sandbox.save();
            }

            return {
                sandbox: await sandbox.populate('firmId'),
                firm
            };
        } catch (error) {
            logger.error('[Sandbox] Error creating sandbox:', error);
            throw error;
        }
    }

    /**
     * Get user's sandbox
     * @param {string} userId - User ID
     * @returns {Promise<Object>} Sandbox
     */
    static async getSandbox(userId) {
        const sandbox = await Sandbox.getActiveSandbox(userId);
        if (!sandbox) {
            return null;
        }

        // Update last accessed
        await sandbox.updateLastAccessed();

        return sandbox;
    }

    /**
     * Reset sandbox to initial state
     * @param {string} sandboxId - Sandbox ID
     * @returns {Promise<Object>} Updated sandbox
     */
    static async resetSandbox(sandboxId) {
        try {
            const sandbox = await Sandbox.findById(sandboxId).populate('firmId');
            if (!sandbox) {
                throw new Error('Sandbox not found');
            }

            if (sandbox.status === 'deleted') {
                throw new Error('Cannot reset deleted sandbox');
            }

            const firmId = sandbox.firmId._id;

            logger.info(`[Sandbox] Resetting sandbox ${sandboxId} for firm ${firmId}`);

            // Clear all data
            await sampleDataService.clearAllData(firmId);

            // Repopulate sample data
            await this.populateSampleData(sandboxId, sandbox.templateId);

            // Update stats
            sandbox.stats.totalResets += 1;
            sandbox.stats.lastResetAt = new Date();
            await sandbox.save();

            logger.info(`[Sandbox] Successfully reset sandbox ${sandboxId}`);

            return sandbox;
        } catch (error) {
            logger.error('[Sandbox] Error resetting sandbox:', error);
            throw error;
        }
    }

    /**
     * Delete sandbox environment
     * @param {string} sandboxId - Sandbox ID
     * @param {string} reason - Deletion reason
     * @returns {Promise<Object>} Deletion result
     */
    static async deleteSandbox(sandboxId, reason = 'user_requested') {
        try {
            const sandbox = await Sandbox.findById(sandboxId).populate('firmId');
            if (!sandbox) {
                throw new Error('Sandbox not found');
            }

            const firmId = sandbox.firmId._id;

            logger.info(`[Sandbox] Deleting sandbox ${sandboxId} for firm ${firmId}`);

            // Clear all data
            await sampleDataService.clearAllData(firmId);

            // Mark firm as inactive
            await Firm.findByIdAndUpdate(firmId, { status: 'inactive' });

            // Mark sandbox as deleted
            await sandbox.markAsDeleted(reason);

            logger.info(`[Sandbox] Successfully deleted sandbox ${sandboxId}`);

            return { success: true, sandboxId, firmId };
        } catch (error) {
            logger.error('[Sandbox] Error deleting sandbox:', error);
            throw error;
        }
    }

    /**
     * Extend sandbox expiration
     * @param {string} sandboxId - Sandbox ID
     * @param {number} days - Days to extend
     * @returns {Promise<Object>} Updated sandbox
     */
    static async extendSandbox(sandboxId, days = 7) {
        try {
            const sandbox = await Sandbox.findById(sandboxId);
            if (!sandbox) {
                throw new Error('Sandbox not found');
            }

            if (sandbox.status === 'deleted') {
                throw new Error('Cannot extend deleted sandbox');
            }

            if (sandbox.status === 'expired') {
                sandbox.status = 'active';
            }

            await sandbox.extend(days);

            logger.info(`[Sandbox] Extended sandbox ${sandboxId} by ${days} days`);

            return sandbox;
        } catch (error) {
            logger.error('[Sandbox] Error extending sandbox:', error);
            throw error;
        }
    }

    /**
     * Populate sandbox with sample data
     * @param {string} sandboxId - Sandbox ID
     * @param {string} template - Template ID
     * @returns {Promise<void>}
     */
    static async populateSampleData(sandboxId, template = 'basic_law_firm') {
        try {
            const sandbox = await Sandbox.findById(sandboxId).populate('firmId');
            if (!sandbox) {
                throw new Error('Sandbox not found');
            }

            const firmId = sandbox.firmId._id;

            logger.info(`[Sandbox] Populating sample data for sandbox ${sandboxId} with template ${template}`);

            let stats;

            switch (template) {
                case 'empty':
                    stats = { clients: 0, cases: 0, invoices: 0, expenses: 0, timeEntries: 0 };
                    break;

                case 'solo_practitioner':
                    stats = await sampleDataService.generateFullDemoData(firmId, {
                        clients: 5,
                        cases: 3,
                        invoices: 8,
                        expenses: 5,
                        timeEntries: 15
                    });
                    break;

                case 'corporate_legal':
                    stats = await sampleDataService.generateFullDemoData(firmId, {
                        clients: 15,
                        cases: 10,
                        invoices: 25,
                        expenses: 15,
                        timeEntries: 40
                    });
                    break;

                case 'full_demo':
                    stats = await sampleDataService.generateFullDemoData(firmId, {
                        clients: 30,
                        cases: 20,
                        invoices: 50,
                        expenses: 30,
                        timeEntries: 80
                    });
                    break;

                case 'basic_law_firm':
                default:
                    stats = await sampleDataService.generateFullDemoData(firmId, {
                        clients: 10,
                        cases: 7,
                        invoices: 15,
                        expenses: 10,
                        timeEntries: 25
                    });
                    break;
            }

            // Update sandbox stats
            sandbox.stats.clientsGenerated = stats.clients;
            sandbox.stats.casesGenerated = stats.cases;
            sandbox.stats.invoicesGenerated = stats.invoices;
            sandbox.stats.expensesGenerated = stats.expenses;
            sandbox.stats.timeEntriesGenerated = stats.timeEntries;
            await sandbox.save();

            logger.info(`[Sandbox] Sample data populated for sandbox ${sandboxId}:`, stats);
        } catch (error) {
            logger.error('[Sandbox] Error populating sample data:', error);
            throw error;
        }
    }

    /**
     * Get sandbox statistics
     * @returns {Promise<Object>} Statistics
     */
    static async getSandboxStats() {
        try {
            const stats = await Sandbox.getStats();

            // Get expiring soon count (within 3 days)
            const expiringSoon = await Sandbox.countDocuments({
                status: 'active',
                expiresAt: {
                    $lte: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
                    $gt: new Date()
                }
            });

            return {
                ...stats,
                expiringSoon
            };
        } catch (error) {
            logger.error('[Sandbox] Error getting sandbox stats:', error);
            throw error;
        }
    }

    /**
     * Cleanup expired sandboxes
     * @returns {Promise<Object>} Cleanup result
     */
    static async cleanupExpiredSandboxes() {
        try {
            const expiredSandboxes = await Sandbox.getExpiredSandboxes();

            logger.info(`[Sandbox] Found ${expiredSandboxes.length} expired sandboxes to cleanup`);

            let deleted = 0;
            let failed = 0;

            for (const sandbox of expiredSandboxes) {
                try {
                    // Mark as expired first
                    sandbox.status = 'expired';
                    await sandbox.save();

                    // Delete after a grace period (e.g., 7 days after expiration)
                    const gracePeriodEnd = new Date(sandbox.expiresAt);
                    gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 7);

                    if (new Date() > gracePeriodEnd) {
                        await this.deleteSandbox(sandbox._id.toString(), 'expired_auto_cleanup');
                        deleted++;
                    }
                } catch (error) {
                    logger.error(`[Sandbox] Failed to cleanup sandbox ${sandbox._id}:`, error);
                    failed++;
                }
            }

            logger.info(`[Sandbox] Cleanup complete: ${deleted} deleted, ${failed} failed`);

            return { total: expiredSandboxes.length, deleted, failed };
        } catch (error) {
            logger.error('[Sandbox] Error during cleanup:', error);
            throw error;
        }
    }

    /**
     * Send expiration warnings
     * @param {number} daysBeforeExpiration - Days before expiration
     * @returns {Promise<Object>} Warning result
     */
    static async sendExpirationWarnings(daysBeforeExpiration = 3) {
        try {
            const sandboxes = await Sandbox.getSandboxesNeedingWarning(daysBeforeExpiration);

            logger.info(`[Sandbox] Found ${sandboxes.length} sandboxes needing ${daysBeforeExpiration}-day warning`);

            let sent = 0;
            const warningKey = `${daysBeforeExpiration}_days`;

            for (const sandbox of sandboxes) {
                try {
                    // TODO: Send email notification to user
                    // await emailService.sendSandboxExpirationWarning(sandbox.userId, daysBeforeExpiration);

                    // Mark warning as sent
                    sandbox.expirationWarningsSent.push(warningKey);
                    await sandbox.save();

                    sent++;
                } catch (error) {
                    logger.error(`[Sandbox] Failed to send warning for sandbox ${sandbox._id}:`, error);
                }
            }

            logger.info(`[Sandbox] Sent ${sent} expiration warnings`);

            return { total: sandboxes.length, sent };
        } catch (error) {
            logger.error('[Sandbox] Error sending expiration warnings:', error);
            throw error;
        }
    }

    /**
     * Clone sandbox configuration to production firm
     * @param {string} sandboxId - Sandbox ID
     * @param {string} targetFirmId - Target firm ID
     * @returns {Promise<Object>} Clone result
     */
    static async cloneSandboxToProduction(sandboxId, targetFirmId) {
        try {
            const sandbox = await Sandbox.findById(sandboxId).populate('firmId');
            if (!sandbox) {
                throw new Error('Sandbox not found');
            }

            const targetFirm = await Firm.findById(targetFirmId);
            if (!targetFirm) {
                throw new Error('Target firm not found');
            }

            logger.info(`[Sandbox] Cloning sandbox ${sandboxId} to firm ${targetFirmId}`);

            // Clone only settings, not data
            const sandboxFirm = sandbox.firmId;

            targetFirm.settings = {
                ...targetFirm.settings,
                timezone: sandboxFirm.settings.timezone,
                language: sandboxFirm.settings.language,
                dateFormat: sandboxFirm.settings.dateFormat
            };

            targetFirm.billingSettings = {
                ...targetFirm.billingSettings,
                defaultCurrency: sandboxFirm.billingSettings?.defaultCurrency || 'SAR',
                defaultPaymentTerms: sandboxFirm.billingSettings?.defaultPaymentTerms || 30
            };

            await targetFirm.save();

            logger.info(`[Sandbox] Successfully cloned settings from sandbox ${sandboxId} to firm ${targetFirmId}`);

            return { success: true, sandboxId, targetFirmId };
        } catch (error) {
            logger.error('[Sandbox] Error cloning sandbox:', error);
            throw error;
        }
    }

    /**
     * Get owner permissions
     * @private
     */
    static _getOwnerPermissions() {
        return {
            clients: 'full',
            cases: 'full',
            leads: 'full',
            invoices: 'full',
            payments: 'full',
            expenses: 'full',
            documents: 'full',
            tasks: 'full',
            events: 'full',
            timeTracking: 'full',
            reports: 'full',
            settings: 'full',
            team: 'full',
            canApproveInvoices: true,
            canManageRetainers: true,
            canExportData: true,
            canDeleteRecords: true,
            canViewFinance: true,
            canManageTeam: true
        };
    }
}

module.exports = SandboxService;
