/**
 * CRM Transaction Service
 *
 * Enterprise-grade transaction logging and querying.
 * Provides audit trail for all CRM operations.
 *
 * Features:
 * - Comprehensive transaction logging
 * - Timeline generation
 * - Activity summaries
 * - Export capabilities
 */

const mongoose = require('mongoose');
const CRMTransaction = require('../models/crmTransaction.model');

class CRMTransactionService {
    /**
     * Log a CRM transaction
     */
    async log(data) {
        return CRMTransaction.log(data);
    }

    /**
     * Log lead creation
     */
    async logLeadCreated(lead, createdBy, source = 'web') {
        return this.log({
            firmId: lead.firmId,
            lawyerId: lead.lawyerId,
            type: 'lead_created',
            category: 'lead',
            entityType: 'lead',
            entityId: lead._id,
            entityName: `${lead.firstName} ${lead.lastName}`,
            value: lead.estimatedValue,
            performedBy: createdBy,
            source,
            metadata: {
                email: lead.email,
                phone: lead.phone,
                source: lead.source
            }
        });
    }

    /**
     * Log lead update
     */
    async logLeadUpdated(lead, changedFields, updatedBy) {
        return this.log({
            firmId: lead.firmId,
            lawyerId: lead.lawyerId,
            type: 'lead_updated',
            category: 'lead',
            entityType: 'lead',
            entityId: lead._id,
            entityName: `${lead.firstName} ${lead.lastName}`,
            changedFields,
            performedBy: updatedBy
        });
    }

    /**
     * Log stage change
     */
    async logStageChange(lead, fromStage, toStage, changedBy, timeInPreviousStage = null) {
        return this.log({
            firmId: lead.firmId,
            lawyerId: lead.lawyerId,
            type: 'stage_changed',
            category: 'deal',
            entityType: 'lead',
            entityId: lead._id,
            entityName: `${lead.firstName} ${lead.lastName}`,
            value: lead.estimatedValue,
            fromStage: {
                stageId: fromStage?._id,
                stageName: fromStage?.name
            },
            toStage: {
                stageId: toStage?._id,
                stageName: toStage?.name
            },
            timeInPreviousStage,
            performedBy: changedBy,
            description: `Moved from ${fromStage?.name || 'None'} to ${toStage?.name}`
        });
    }

    /**
     * Log deal won
     */
    async logDealWon(lead, wonBy, metadata = {}) {
        return this.log({
            firmId: lead.firmId,
            lawyerId: lead.lawyerId,
            type: 'deal_won',
            category: 'deal',
            entityType: 'lead',
            entityId: lead._id,
            entityName: `${lead.firstName} ${lead.lastName}`,
            value: lead.estimatedValue,
            performedBy: wonBy,
            description: `Deal won: ${lead.estimatedValue} SAR`,
            metadata
        });
    }

    /**
     * Log deal lost
     */
    async logDealLost(lead, lostBy, lostReason = null, metadata = {}) {
        return this.log({
            firmId: lead.firmId,
            lawyerId: lead.lawyerId,
            type: 'deal_lost',
            category: 'deal',
            entityType: 'lead',
            entityId: lead._id,
            entityName: `${lead.firstName} ${lead.lastName}`,
            value: lead.estimatedValue,
            performedBy: lostBy,
            description: `Deal lost${lostReason ? `: ${lostReason}` : ''}`,
            metadata: { ...metadata, lostReason }
        });
    }

    /**
     * Log activity
     */
    async logActivity(activity, performedBy) {
        const typeMap = {
            call: 'call_logged',
            email: 'email_logged',
            meeting: 'meeting_logged',
            note: 'note_added'
        };

        return this.log({
            firmId: activity.firmId,
            lawyerId: activity.lawyerId,
            type: typeMap[activity.type] || 'activity_created',
            category: 'activity',
            entityType: activity.entityType,
            entityId: activity.entityId,
            entityName: activity.entityName,
            performedBy,
            description: activity.title,
            metadata: {
                activityType: activity.type,
                duration: activity.duration
            }
        });
    }

    /**
     * Get transactions with filters
     */
    async getTransactions(firmId, options = {}) {
        const {
            type,
            category,
            entityType,
            entityId,
            performedBy,
            startDate,
            endDate,
            page = 1,
            limit = 50,
            sort = '-createdAt'
        } = options;

        const query = { firmId: new mongoose.Types.ObjectId(firmId) };

        if (type) query.type = Array.isArray(type) ? { $in: type } : type;
        if (category) query.category = category;
        if (entityType) query.entityType = entityType;
        if (entityId) query.entityId = new mongoose.Types.ObjectId(entityId);
        if (performedBy) query.performedBy = new mongoose.Types.ObjectId(performedBy);

        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) query.createdAt.$lte = new Date(endDate);
        }

        const [transactions, total] = await Promise.all([
            CRMTransaction.find(query)
                .populate('performedBy', 'firstName lastName email avatar')
                .sort(sort)
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            CRMTransaction.countDocuments(query)
        ]);

        return {
            data: transactions,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
                hasMore: page * limit < total
            }
        };
    }

    /**
     * Get entity timeline
     */
    async getEntityTimeline(entityType, entityId, firmId, options = {}) {
        return CRMTransaction.getEntityTimeline(entityType, entityId, firmId, options);
    }

    /**
     * Get transaction summary
     */
    async getSummary(firmId, options = {}) {
        const { startDate, endDate, entityType } = options;

        const summary = await CRMTransaction.getSummary(firmId, { startDate, endDate, entityType });

        // Group by category
        const byCategory = {};
        for (const item of summary) {
            const category = CRMTransaction.getCategoryFromType(item._id);
            if (!byCategory[category]) {
                byCategory[category] = { count: 0, value: 0, types: [] };
            }
            byCategory[category].count += item.count;
            byCategory[category].value += item.totalValue || 0;
            byCategory[category].types.push({
                type: item._id,
                count: item.count,
                value: item.totalValue || 0
            });
        }

        return {
            byType: summary,
            byCategory: Object.entries(byCategory).map(([category, data]) => ({
                category,
                ...data
            }))
        };
    }

    /**
     * Get user activity summary
     */
    async getUserActivitySummary(userId, firmId, options = {}) {
        const { days = 30 } = options;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const activities = await CRMTransaction.aggregate([
            {
                $match: {
                    performedBy: new mongoose.Types.ObjectId(userId),
                    firmId: new mongoose.Types.ObjectId(firmId),
                    createdAt: { $gte: startDate }
                }
            },
            {
                $group: {
                    _id: {
                        type: '$type',
                        date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }
                    },
                    count: { $sum: 1 },
                    value: { $sum: { $ifNull: ['$value', 0] } }
                }
            },
            {
                $group: {
                    _id: '$_id.type',
                    total: { $sum: '$count' },
                    totalValue: { $sum: '$value' },
                    byDate: {
                        $push: {
                            date: '$_id.date',
                            count: '$count',
                            value: '$value'
                        }
                    }
                }
            },
            { $sort: { total: -1 } }
        ]);

        return {
            period: `${days} days`,
            activities,
            totalActions: activities.reduce((sum, a) => sum + a.total, 0)
        };
    }

    /**
     * Get revenue events
     */
    async getRevenueEvents(firmId, options = {}) {
        return CRMTransaction.getRevenueEvents(firmId, options);
    }

    /**
     * Export transactions
     */
    async exportTransactions(firmId, options = {}) {
        const { format = 'json', ...queryOptions } = options;

        const { data } = await this.getTransactions(firmId, {
            ...queryOptions,
            limit: 10000 // Max export limit
        });

        if (format === 'csv') {
            return this._convertToCSV(data);
        }

        return data;
    }

    /**
     * Get daily activity report
     */
    async getDailyReport(firmId, date = new Date()) {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        const [transactions, deals, activities] = await Promise.all([
            CRMTransaction.countDocuments({
                firmId: new mongoose.Types.ObjectId(firmId),
                createdAt: { $gte: startOfDay, $lte: endOfDay }
            }),
            CRMTransaction.aggregate([
                {
                    $match: {
                        firmId: new mongoose.Types.ObjectId(firmId),
                        type: { $in: ['deal_won', 'deal_lost'] },
                        createdAt: { $gte: startOfDay, $lte: endOfDay }
                    }
                },
                {
                    $group: {
                        _id: '$type',
                        count: { $sum: 1 },
                        value: { $sum: '$value' }
                    }
                }
            ]),
            CRMTransaction.aggregate([
                {
                    $match: {
                        firmId: new mongoose.Types.ObjectId(firmId),
                        category: 'activity',
                        createdAt: { $gte: startOfDay, $lte: endOfDay }
                    }
                },
                {
                    $group: {
                        _id: '$type',
                        count: { $sum: 1 }
                    }
                }
            ])
        ]);

        const dealStats = {
            won: deals.find(d => d._id === 'deal_won') || { count: 0, value: 0 },
            lost: deals.find(d => d._id === 'deal_lost') || { count: 0, value: 0 }
        };

        return {
            date: date.toISOString().split('T')[0],
            totalTransactions: transactions,
            deals: {
                won: dealStats.won.count,
                wonValue: dealStats.won.value,
                lost: dealStats.lost.count,
                lostValue: dealStats.lost.value
            },
            activities: activities.map(a => ({ type: a._id, count: a.count })),
            currency: 'SAR'
        };
    }

    // Private helper methods

    _convertToCSV(data) {
        if (data.length === 0) return '';

        const headers = [
            'Date',
            'Type',
            'Category',
            'Entity Type',
            'Entity Name',
            'Description',
            'Value',
            'Performed By'
        ];

        const rows = data.map(t => [
            new Date(t.createdAt).toISOString(),
            t.type,
            t.category,
            t.entityType,
            t.entityName || '',
            t.description || '',
            t.value || '',
            t.performedByName || t.performedBy?.email || ''
        ]);

        return [
            headers.join(','),
            ...rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
        ].join('\n');
    }
}

module.exports = new CRMTransactionService();
