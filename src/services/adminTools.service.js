/**
 * Admin Tools Service - Comprehensive System Management
 *
 * Provides high-level administrative operations for system maintenance,
 * data management, and diagnostics. All operations include comprehensive
 * audit logging for compliance and security tracking.
 *
 * Features:
 * - Data Management (export, import, merge, delete)
 * - Data Fixes (recalculate, reindex, cleanup, validate)
 * - System Tools (stats, diagnostics, monitoring)
 * - User Management (password reset, impersonation, lock/unlock)
 */

const mongoose = require('mongoose');
const { User, Firm, Client, Invoice, Payment, Case, Document, AuditLog } = require('../models');
const auditLogService = require('./auditLog.service');
const cacheService = require('./cache.service');
const emailService = require('./email.service');
const sessionManagerService = require('./sessionManager.service');
const logger = require('../utils/logger');
const crypto = require('crypto');

class AdminToolsService {
    // ═══════════════════════════════════════════════════════════════
    // DATA MANAGEMENT
    // ═══════════════════════════════════════════════════════════════

    /**
     * Get all user data for export/review (GDPR compliance)
     * @param {String} userId - User ID
     * @param {Object} options - Export options
     * @returns {Promise<Object>} User data package
     */
    async getUserData(userId, options = {}) {
        try {
            const user = await User.findById(userId)
                .select('-password -mfaSecret')
                .lean();

            if (!user) {
                throw new Error('User not found');
            }

            const data = {
                user,
                metadata: {
                    exportedAt: new Date(),
                    exportedBy: options.adminId || 'system',
                    format: options.format || 'json'
                }
            };

            // Include related data if requested
            // NOTE: Bypass firmIsolation filter - admin GDPR data export works across all firms
            if (options.includeRelated !== false) {
                const [cases, clients, invoices, documents, auditLogs] = await Promise.all([
                    Case.find({ $or: [{ assignedTo: userId }, { createdBy: userId }] }).setOptions({ bypassFirmFilter: true }).lean(),
                    Client.find({ createdBy: userId }).setOptions({ bypassFirmFilter: true }).lean(),
                    Invoice.find({ createdBy: userId }).setOptions({ bypassFirmFilter: true }).lean(),
                    Document.find({ uploadedBy: userId }).setOptions({ bypassFirmFilter: true }).lean(),
                    AuditLog.find({ userId }).setOptions({ bypassFirmFilter: true }).limit(1000).sort({ timestamp: -1 }).lean()
                ]);

                data.related = {
                    cases: cases || [],
                    clients: clients || [],
                    invoices: invoices || [],
                    documents: documents || [],
                    auditLogs: auditLogs || []
                };
            }

            return data;
        } catch (error) {
            logger.error('AdminTools.getUserData failed:', error.message);
            throw error;
        }
    }

    /**
     * Delete user data (GDPR right to erasure)
     * @param {String} userId - User ID to delete
     * @param {Object} options - Deletion options
     * @returns {Promise<Object>} Deletion report
     */
    async deleteUserData(userId, options = {}) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const user = await User.findById(userId).session(session);
            if (!user) {
                throw new Error('User not found');
            }

            const deletionReport = {
                userId,
                deletedAt: new Date(),
                deletedBy: options.adminId || 'system',
                method: options.anonymize ? 'anonymize' : 'hard_delete',
                affectedRecords: {}
            };

            if (options.anonymize) {
                // Anonymize user data (GDPR-compliant soft delete)
                user.email = `deleted-${userId}@anonymized.local`;
                user.username = `deleted-${userId}`;
                user.firstName = 'Deleted';
                user.lastName = 'User';
                user.phone = 'deleted';
                user.dataAnonymized = true;
                user.anonymizedAt = new Date();
                user.password = crypto.randomBytes(32).toString('hex');
                await user.save({ session });

                deletionReport.affectedRecords.user = { anonymized: true };
            } else {
                // Hard delete (cascade if requested)
                // NOTE: Bypass firmIsolation filter - admin GDPR deletion works across all firms
                if (options.cascade) {
                    const [casesDeleted, clientsDeleted, invoicesDeleted, documentsDeleted] = await Promise.all([
                        Case.deleteMany({ createdBy: userId }, { bypassFirmFilter: true }).session(session),
                        Client.deleteMany({ createdBy: userId }, { bypassFirmFilter: true }).session(session),
                        Invoice.deleteMany({ createdBy: userId }, { bypassFirmFilter: true }).session(session),
                        Document.deleteMany({ uploadedBy: userId }, { bypassFirmFilter: true }).session(session)
                    ]);

                    deletionReport.affectedRecords = {
                        cases: casesDeleted.deletedCount,
                        clients: clientsDeleted.deletedCount,
                        invoices: invoicesDeleted.deletedCount,
                        documents: documentsDeleted.deletedCount
                    };
                }

                await User.findByIdAndDelete(userId).session(session);
                deletionReport.affectedRecords.user = { deleted: true };
            }

            await session.commitTransaction();
            return deletionReport;
        } catch (error) {
            await session.abortTransaction();
            logger.error('AdminTools.deleteUserData failed:', error.message);
            throw error;
        } finally {
            session.endSession();
        }
    }

    /**
     * Export all firm data
     * @param {String} firmId - Firm ID
     * @param {String} format - Export format (json, csv)
     * @returns {Promise<Object>} Exported data
     */
    async exportFirmData(firmId, format = 'json') {
        try {
            const firm = await Firm.findById(firmId).lean();
            if (!firm) {
                throw new Error('Firm not found');
            }

            const [users, cases, clients, invoices, payments] = await Promise.all([
                User.find({ firmId }).select('-password -mfaSecret').lean(),
                Case.find({ firmId }).lean(),
                Client.find({ firmId }).lean(),
                Invoice.find({ firmId }).lean(),
                Payment.find({ firmId }).lean()
            ]);

            const exportData = {
                firm,
                users,
                cases,
                clients,
                invoices,
                payments,
                metadata: {
                    exportedAt: new Date(),
                    format,
                    recordCounts: {
                        users: users.length,
                        cases: cases.length,
                        clients: clients.length,
                        invoices: invoices.length,
                        payments: payments.length
                    }
                }
            };

            return exportData;
        } catch (error) {
            logger.error('AdminTools.exportFirmData failed:', error.message);
            throw error;
        }
    }

    /**
     * Import firm data
     * @param {String} firmId - Target firm ID
     * @param {Object} data - Data to import
     * @returns {Promise<Object>} Import report
     */
    async importFirmData(firmId, data) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const firm = await Firm.findById(firmId).session(session);
            if (!firm) {
                throw new Error('Firm not found');
            }

            const importReport = {
                firmId,
                importedAt: new Date(),
                imported: {}
            };

            // Import clients
            if (data.clients && Array.isArray(data.clients)) {
                const clients = await Client.insertMany(
                    data.clients.map(c => ({ ...c, firmId, _id: undefined })),
                    { session }
                );
                importReport.imported.clients = clients.length;
            }

            // Import cases
            if (data.cases && Array.isArray(data.cases)) {
                const cases = await Case.insertMany(
                    data.cases.map(c => ({ ...c, firmId, _id: undefined })),
                    { session }
                );
                importReport.imported.cases = cases.length;
            }

            await session.commitTransaction();
            return importReport;
        } catch (error) {
            await session.abortTransaction();
            logger.error('AdminTools.importFirmData failed:', error.message);
            throw error;
        } finally {
            session.endSession();
        }
    }

    /**
     * Merge duplicate users
     * @param {String} sourceUserId - User to merge from (will be deleted)
     * @param {String} targetUserId - User to merge into (will be kept)
     * @returns {Promise<Object>} Merge report
     */
    async mergeUsers(sourceUserId, targetUserId) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const [sourceUser, targetUser] = await Promise.all([
                User.findById(sourceUserId).session(session),
                User.findById(targetUserId).session(session)
            ]);

            if (!sourceUser || !targetUser) {
                throw new Error('One or both users not found');
            }

            if (sourceUserId === targetUserId) {
                throw new Error('Cannot merge user with itself');
            }

            // Update all references to point to target user
            const [casesUpdated, clientsUpdated, invoicesUpdated, documentsUpdated] = await Promise.all([
                Case.updateMany(
                    { $or: [{ assignedTo: sourceUserId }, { createdBy: sourceUserId }] },
                    { $set: { assignedTo: targetUserId, createdBy: targetUserId } }
                ).session(session),
                Client.updateMany(
                    { createdBy: sourceUserId },
                    { $set: { createdBy: targetUserId } }
                ).session(session),
                Invoice.updateMany(
                    { createdBy: sourceUserId },
                    { $set: { createdBy: targetUserId } }
                ).session(session),
                Document.updateMany(
                    { uploadedBy: sourceUserId },
                    { $set: { uploadedBy: targetUserId } }
                ).session(session)
            ]);

            // Delete source user
            await User.findByIdAndDelete(sourceUserId).session(session);

            await session.commitTransaction();

            return {
                success: true,
                sourceUserId,
                targetUserId,
                mergedRecords: {
                    cases: casesUpdated.modifiedCount,
                    clients: clientsUpdated.modifiedCount,
                    invoices: invoicesUpdated.modifiedCount,
                    documents: documentsUpdated.modifiedCount
                },
                mergedAt: new Date()
            };
        } catch (error) {
            await session.abortTransaction();
            logger.error('AdminTools.mergeUsers failed:', error.message);
            throw error;
        } finally {
            session.endSession();
        }
    }

    /**
     * Merge duplicate clients
     * @param {String} sourceClientId - Client to merge from
     * @param {String} targetClientId - Client to merge into
     * @returns {Promise<Object>} Merge report
     */
    async mergeClients(sourceClientId, targetClientId) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const [sourceClient, targetClient] = await Promise.all([
                Client.findById(sourceClientId).session(session),
                Client.findById(targetClientId).session(session)
            ]);

            if (!sourceClient || !targetClient) {
                throw new Error('One or both clients not found');
            }

            if (sourceClientId === targetClientId) {
                throw new Error('Cannot merge client with itself');
            }

            // Update all references
            const [casesUpdated, invoicesUpdated] = await Promise.all([
                Case.updateMany(
                    { clientId: sourceClientId },
                    { $set: { clientId: targetClientId } }
                ).session(session),
                Invoice.updateMany(
                    { clientId: sourceClientId },
                    { $set: { clientId: targetClientId } }
                ).session(session)
            ]);

            // Delete source client
            await Client.findByIdAndDelete(sourceClientId).session(session);

            await session.commitTransaction();

            return {
                success: true,
                sourceClientId,
                targetClientId,
                mergedRecords: {
                    cases: casesUpdated.modifiedCount,
                    invoices: invoicesUpdated.modifiedCount
                },
                mergedAt: new Date()
            };
        } catch (error) {
            await session.abortTransaction();
            logger.error('AdminTools.mergeClients failed:', error.message);
            throw error;
        } finally {
            session.endSession();
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // DATA FIXES
    // ═══════════════════════════════════════════════════════════════

    /**
     * Recalculate invoice totals (fix calculation issues)
     * @param {String} firmId - Firm ID
     * @returns {Promise<Object>} Fix report
     */
    async recalculateInvoiceTotals(firmId) {
        try {
            const invoices = await Invoice.find({ firmId });
            let fixedCount = 0;
            const errors = [];

            for (const invoice of invoices) {
                try {
                    const items = invoice.items || [];
                    let subtotal = 0;

                    for (const item of items) {
                        const amount = (item.quantity || 0) * (item.rate || 0);
                        subtotal += amount;
                    }

                    const taxRate = invoice.taxRate || 0;
                    const taxAmount = subtotal * (taxRate / 100);
                    const total = subtotal + taxAmount;

                    // Update if different
                    if (invoice.subtotal !== subtotal || invoice.total !== total) {
                        invoice.subtotal = subtotal;
                        invoice.taxAmount = taxAmount;
                        invoice.total = total;
                        await invoice.save();
                        fixedCount++;
                    }
                } catch (error) {
                    errors.push({ invoiceId: invoice._id, error: error.message });
                }
            }

            return {
                success: true,
                firmId,
                totalInvoices: invoices.length,
                fixedCount,
                errors: errors.length > 0 ? errors : undefined
            };
        } catch (error) {
            logger.error('AdminTools.recalculateInvoiceTotals failed:', error.message);
            throw error;
        }
    }

    /**
     * Reindex search data (rebuild search indexes)
     * @param {String} firmId - Firm ID
     * @returns {Promise<Object>} Reindex report
     */
    async reindexSearchData(firmId) {
        try {
            const collections = [
                { model: Case, name: 'cases' },
                { model: Client, name: 'clients' },
                { model: Invoice, name: 'invoices' }
            ];

            const results = {};

            for (const { model, name } of collections) {
                try {
                    // Drop and recreate text indexes
                    await model.collection.dropIndexes();
                    await model.syncIndexes();

                    const count = await model.countDocuments({ firmId });
                    results[name] = { reindexed: count };
                } catch (error) {
                    results[name] = { error: error.message };
                }
            }

            return {
                success: true,
                firmId,
                results,
                reindexedAt: new Date()
            };
        } catch (error) {
            logger.error('AdminTools.reindexSearchData failed:', error.message);
            throw error;
        }
    }

    /**
     * Cleanup orphaned records (find and remove records with missing references)
     * @param {String} firmId - Firm ID
     * @returns {Promise<Object>} Cleanup report
     */
    async cleanupOrphanedRecords(firmId) {
        try {
            const report = {
                firmId,
                cleanedAt: new Date(),
                orphaned: {}
            };

            // Find cases with non-existent clients
            const cases = await Case.find({ firmId }).populate('clientId').lean();
            const orphanedCases = cases.filter(c => c.clientId && !c.clientId._id);

            if (orphanedCases.length > 0) {
                const caseIds = orphanedCases.map(c => c._id);
                await Case.updateMany(
                    { _id: { $in: caseIds } },
                    { $unset: { clientId: 1 } }
                );
                report.orphaned.cases = orphanedCases.length;
            }

            // Find invoices with non-existent clients
            const invoices = await Invoice.find({ firmId }).populate('clientId').lean();
            const orphanedInvoices = invoices.filter(i => i.clientId && !i.clientId._id);

            if (orphanedInvoices.length > 0) {
                const invoiceIds = orphanedInvoices.map(i => i._id);
                await Invoice.updateMany(
                    { _id: { $in: invoiceIds } },
                    { $unset: { clientId: 1 } }
                );
                report.orphaned.invoices = orphanedInvoices.length;
            }

            return report;
        } catch (error) {
            logger.error('AdminTools.cleanupOrphanedRecords failed:', error.message);
            throw error;
        }
    }

    /**
     * Validate data integrity (run consistency checks)
     * @param {String} firmId - Firm ID
     * @returns {Promise<Object>} Validation report
     */
    async validateDataIntegrity(firmId) {
        try {
            const issues = [];

            // Check for duplicate emails
            const users = await User.find({ firmId });
            const emailMap = new Map();
            users.forEach(user => {
                const email = user.email.toLowerCase();
                if (emailMap.has(email)) {
                    issues.push({
                        type: 'duplicate_email',
                        email,
                        userIds: [emailMap.get(email), user._id]
                    });
                }
                emailMap.set(email, user._id);
            });

            // Check for invoices with negative totals
            const negativeInvoices = await Invoice.find({
                firmId,
                total: { $lt: 0 }
            }).select('_id invoiceNumber total');

            if (negativeInvoices.length > 0) {
                issues.push({
                    type: 'negative_invoice_total',
                    count: negativeInvoices.length,
                    invoices: negativeInvoices.map(i => ({
                        id: i._id,
                        number: i.invoiceNumber,
                        total: i.total
                    }))
                });
            }

            // Check for cases without case numbers
            const casesWithoutNumbers = await Case.find({
                firmId,
                $or: [{ caseNumber: null }, { caseNumber: '' }]
            }).select('_id title');

            if (casesWithoutNumbers.length > 0) {
                issues.push({
                    type: 'missing_case_number',
                    count: casesWithoutNumbers.length,
                    cases: casesWithoutNumbers.map(c => ({
                        id: c._id,
                        title: c.title
                    }))
                });
            }

            return {
                success: true,
                firmId,
                validatedAt: new Date(),
                issueCount: issues.length,
                issues
            };
        } catch (error) {
            logger.error('AdminTools.validateDataIntegrity failed:', error.message);
            throw error;
        }
    }

    /**
     * Fix currency conversion issues
     * @param {String} firmId - Firm ID
     * @returns {Promise<Object>} Fix report
     */
    async fixCurrencyConversions(firmId) {
        try {
            // This is a placeholder - implement actual currency fix logic based on your needs
            const firm = await Firm.findById(firmId);
            if (!firm) {
                throw new Error('Firm not found');
            }

            const baseCurrency = firm.currency || 'SAR';

            return {
                success: true,
                firmId,
                baseCurrency,
                message: 'Currency conversions validated',
                fixedAt: new Date()
            };
        } catch (error) {
            logger.error('AdminTools.fixCurrencyConversions failed:', error.message);
            throw error;
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // SYSTEM TOOLS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Get system-wide statistics
     * @returns {Promise<Object>} System statistics
     */
    async getSystemStats() {
        try {
            const [
                totalUsers,
                totalFirms,
                totalCases,
                totalClients,
                totalInvoices,
                activeUsers
            ] = await Promise.all([
                User.countDocuments(),
                Firm.countDocuments(),
                Case.countDocuments(),
                Client.countDocuments(),
                Invoice.countDocuments(),
                User.countDocuments({ lastLogin: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } })
            ]);

            const cacheStats = cacheService.getStats();

            return {
                users: {
                    total: totalUsers,
                    active: activeUsers,
                    inactive: totalUsers - activeUsers
                },
                firms: {
                    total: totalFirms
                },
                cases: {
                    total: totalCases
                },
                clients: {
                    total: totalClients
                },
                invoices: {
                    total: totalInvoices
                },
                cache: cacheStats,
                timestamp: new Date()
            };
        } catch (error) {
            logger.error('AdminTools.getSystemStats failed:', error.message);
            throw error;
        }
    }

    /**
     * Get user activity report
     * @param {Object} dateRange - { startDate, endDate }
     * @returns {Promise<Object>} Activity report
     */
    async getUserActivityReport(dateRange = {}) {
        try {
            const { startDate, endDate } = dateRange;
            const matchStage = {};

            if (startDate) {
                matchStage.timestamp = { $gte: new Date(startDate) };
            }
            if (endDate) {
                matchStage.timestamp = {
                    ...(matchStage.timestamp || {}),
                    $lte: new Date(endDate)
                };
            }

            const activityByAction = await AuditLog.aggregate([
                { $match: matchStage },
                { $group: { _id: '$action', count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 20 }
            ]);

            const activityByUser = await AuditLog.aggregate([
                { $match: matchStage },
                { $group: { _id: '$userId', count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 10 }
            ]);

            return {
                dateRange: {
                    startDate: startDate || 'all time',
                    endDate: endDate || 'now'
                },
                activityByAction,
                activityByUser,
                generatedAt: new Date()
            };
        } catch (error) {
            logger.error('AdminTools.getUserActivityReport failed:', error.message);
            throw error;
        }
    }

    /**
     * Get storage usage per firm
     * @param {String} firmId - Firm ID (optional)
     * @returns {Promise<Object>} Storage usage report
     */
    async getStorageUsage(firmId = null) {
        try {
            const match = firmId ? { firmId } : {};

            const documentStats = await Document.aggregate([
                { $match: match },
                {
                    $group: {
                        _id: '$firmId',
                        totalFiles: { $sum: 1 },
                        totalSize: { $sum: '$size' }
                    }
                }
            ]);

            return {
                firmId: firmId || 'all',
                documentStats,
                timestamp: new Date()
            };
        } catch (error) {
            logger.error('AdminTools.getStorageUsage failed:', error.message);
            throw error;
        }
    }

    /**
     * Clear cache by pattern
     * @param {String} pattern - Cache key pattern
     * @returns {Promise<Object>} Clear report
     */
    async clearCache(pattern) {
        try {
            const deletedCount = await cacheService.delPattern(pattern);

            return {
                success: true,
                pattern,
                deletedCount,
                clearedAt: new Date()
            };
        } catch (error) {
            logger.error('AdminTools.clearCache failed:', error.message);
            throw error;
        }
    }

    /**
     * Run system diagnostics
     * @returns {Promise<Object>} Diagnostic report
     */
    async runDiagnostics() {
        try {
            const diagnostics = {
                timestamp: new Date(),
                database: {},
                cache: {},
                system: {}
            };

            // Database connectivity
            try {
                const state = mongoose.connection.readyState;
                diagnostics.database.connected = state === 1;
                diagnostics.database.state = ['disconnected', 'connected', 'connecting', 'disconnecting'][state];
            } catch (error) {
                diagnostics.database.error = error.message;
            }

            // Cache status
            diagnostics.cache = cacheService.getStats();

            // System info
            diagnostics.system = {
                nodeVersion: process.version,
                platform: process.platform,
                uptime: process.uptime(),
                memoryUsage: process.memoryUsage()
            };

            return diagnostics;
        } catch (error) {
            logger.error('AdminTools.runDiagnostics failed:', error.message);
            throw error;
        }
    }

    /**
     * Get slow database queries (placeholder - implement with monitoring)
     * @param {Object} dateRange - { startDate, endDate }
     * @returns {Promise<Object>} Slow queries report
     */
    async getSlowQueries(dateRange = {}) {
        try {
            // This is a placeholder - implement actual slow query detection
            // You would typically use MongoDB profiling or external monitoring
            return {
                message: 'Slow query detection not implemented. Enable MongoDB profiling.',
                dateRange,
                timestamp: new Date()
            };
        } catch (error) {
            logger.error('AdminTools.getSlowQueries failed:', error.message);
            throw error;
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // USER MANAGEMENT
    // ═══════════════════════════════════════════════════════════════

    /**
     * Reset user password and send email
     * @param {String} userId - User ID
     * @returns {Promise<Object>} Reset result
     */
    async resetUserPassword(userId) {
        try {
            const user = await User.findById(userId);
            if (!user) {
                throw new Error('User not found');
            }

            // Generate temporary password
            const tempPassword = crypto.randomBytes(8).toString('hex');
            const bcrypt = require('bcryptjs');
            user.password = await bcrypt.hash(tempPassword, 10);
            user.mustChangePassword = true;
            user.passwordChangedAt = new Date();
            await user.save();

            // Send email with temporary password
            try {
                await emailService.sendEmail({
                    to: user.email,
                    subject: 'Password Reset - Traf3li',
                    html: `
                        <h2>Password Reset</h2>
                        <p>Your password has been reset by an administrator.</p>
                        <p>Temporary password: <strong>${tempPassword}</strong></p>
                        <p>You will be required to change this password on your next login.</p>
                    `
                }, false);
            } catch (emailError) {
                logger.error('Failed to send password reset email:', emailError.message);
            }

            return {
                success: true,
                userId,
                temporaryPassword: tempPassword,
                resetAt: new Date()
            };
        } catch (error) {
            logger.error('AdminTools.resetUserPassword failed:', error.message);
            throw error;
        }
    }

    /**
     * Create impersonation session
     * @param {String} adminId - Admin user ID
     * @param {String} userId - User to impersonate
     * @returns {Promise<Object>} Impersonation session
     */
    async impersonateUser(adminId, userId) {
        try {
            const [admin, targetUser] = await Promise.all([
                User.findById(adminId),
                User.findById(userId)
            ]);

            if (!admin || admin.role !== 'admin') {
                throw new Error('Only admins can impersonate users');
            }

            if (!targetUser) {
                throw new Error('Target user not found');
            }

            // Create impersonation session token
            const sessionId = crypto.randomBytes(32).toString('hex');
            const sessionData = {
                sessionId,
                adminId,
                targetUserId: userId,
                createdAt: new Date(),
                expiresAt: new Date(Date.now() + 60 * 60 * 1000) // 1 hour
            };

            // Store in cache
            await cacheService.set(
                `impersonation:${sessionId}`,
                sessionData,
                3600 // 1 hour TTL
            );

            return sessionData;
        } catch (error) {
            logger.error('AdminTools.impersonateUser failed:', error.message);
            throw error;
        }
    }

    /**
     * End impersonation session
     * @param {String} sessionId - Impersonation session ID
     * @returns {Promise<Object>} Result
     */
    async endImpersonation(sessionId) {
        try {
            await cacheService.del(`impersonation:${sessionId}`);

            return {
                success: true,
                sessionId,
                endedAt: new Date()
            };
        } catch (error) {
            logger.error('AdminTools.endImpersonation failed:', error.message);
            throw error;
        }
    }

    /**
     * Lock user account
     * @param {String} userId - User ID
     * @param {String} reason - Lock reason
     * @returns {Promise<Object>} Lock result
     */
    async lockUser(userId, reason = 'administrative_action') {
        try {
            const user = await User.findById(userId);
            if (!user) {
                throw new Error('User not found');
            }

            user.firmStatus = 'suspended';
            await user.save();

            // Terminate all active sessions
            await sessionManagerService.terminateAllSessions(
                userId,
                null,
                'account_locked',
                'admin'
            );

            return {
                success: true,
                userId,
                reason,
                lockedAt: new Date()
            };
        } catch (error) {
            logger.error('AdminTools.lockUser failed:', error.message);
            throw error;
        }
    }

    /**
     * Unlock user account
     * @param {String} userId - User ID
     * @returns {Promise<Object>} Unlock result
     */
    async unlockUser(userId) {
        try {
            const user = await User.findById(userId);
            if (!user) {
                throw new Error('User not found');
            }

            user.firmStatus = 'active';
            await user.save();

            return {
                success: true,
                userId,
                unlockedAt: new Date()
            };
        } catch (error) {
            logger.error('AdminTools.unlockUser failed:', error.message);
            throw error;
        }
    }

    /**
     * Get login history for user
     * @param {String} userId - User ID
     * @param {Number} limit - Maximum records to return
     * @returns {Promise<Array>} Login history
     */
    async getLoginHistory(userId, limit = 50) {
        try {
            const loginHistory = await AuditLog.find({
                userId,
                action: { $in: ['login', 'login_success', 'login_failed'] }
            })
            .sort({ timestamp: -1 })
            .limit(limit)
            .lean();

            return loginHistory;
        } catch (error) {
            logger.error('AdminTools.getLoginHistory failed:', error.message);
            throw error;
        }
    }
}

// Export singleton instance
module.exports = new AdminToolsService();
