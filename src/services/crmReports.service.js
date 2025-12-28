/**
 * CRM Reports Service
 *
 * Comprehensive analytics and reporting for CRM system.
 * Follows enterprise patterns with firmId isolation.
 */

const mongoose = require('mongoose');
const Lead = require('../models/lead.model');
const CrmActivity = require('../models/crmActivity.model');
const Pipeline = require('../models/pipeline.model');
const SalesQuota = require('../models/salesQuota.model');
const CRMTransaction = require('../models/crmTransaction.model');
const logger = require('../utils/logger');

class CRMReportsService {

    // ═══════════════════════════════════════════════════════════════
    // QUICK STATS DASHBOARD
    // ═══════════════════════════════════════════════════════════════

    /**
     * Get quick stats for dashboard
     */
    async getQuickStats(firmQuery, options = {}) {
        const { startDate, endDate } = this.getDateRange(options.period || 'month');
        const previousStart = new Date(startDate);
        previousStart.setMonth(previousStart.getMonth() - 1);
        const previousEnd = new Date(endDate);
        previousEnd.setMonth(previousEnd.getMonth() - 1);

        const [currentStats, previousStats] = await Promise.all([
            this._getPeriodStats(firmQuery, startDate, endDate),
            this._getPeriodStats(firmQuery, previousStart, previousEnd)
        ]);

        return {
            totalPipeline: {
                value: currentStats.pipelineValue,
                formatted: this.formatCurrency(currentStats.pipelineValue),
                change: this.calculateChange(currentStats.pipelineValue, previousStats.pipelineValue)
            },
            dealsWon: {
                value: currentStats.wonCount,
                change: this.calculateChange(currentStats.wonCount, previousStats.wonCount)
            },
            winRate: {
                value: currentStats.winRate,
                formatted: `${currentStats.winRate}%`,
                change: currentStats.winRate - previousStats.winRate
            },
            avgDealSize: {
                value: currentStats.avgDealSize,
                formatted: this.formatCurrency(currentStats.avgDealSize),
                change: this.calculateChange(currentStats.avgDealSize, previousStats.avgDealSize)
            },
            activities: {
                value: currentStats.activityCount,
                change: this.calculateChange(currentStats.activityCount, previousStats.activityCount)
            },
            leads: {
                value: currentStats.leadCount,
                change: this.calculateChange(currentStats.leadCount, previousStats.leadCount)
            }
        };
    }

    async _getPeriodStats(firmQuery, startDate, endDate) {
        const dateFilter = { createdAt: { $gte: startDate, $lte: endDate } };

        const [leads, wonLeads, lostLeads, activities] = await Promise.all([
            Lead.find({ ...firmQuery, ...dateFilter }).lean(),
            Lead.find({ ...firmQuery, status: 'won', ...dateFilter }).lean(),
            Lead.find({ ...firmQuery, status: 'lost', ...dateFilter }).lean(),
            CrmActivity.countDocuments({ ...firmQuery, ...dateFilter })
        ]);

        const pipelineValue = leads.reduce((sum, l) => sum + (l.expectedValue || 0), 0);
        const wonValue = wonLeads.reduce((sum, l) => sum + (l.expectedValue || 0), 0);
        const totalClosed = wonLeads.length + lostLeads.length;
        const winRate = totalClosed > 0 ? Math.round((wonLeads.length / totalClosed) * 100) : 0;
        const avgDealSize = wonLeads.length > 0 ? Math.round(wonValue / wonLeads.length) : 0;

        return {
            leadCount: leads.length,
            wonCount: wonLeads.length,
            lostCount: lostLeads.length,
            pipelineValue,
            wonValue,
            winRate,
            avgDealSize,
            activityCount: activities
        };
    }

    // ═══════════════════════════════════════════════════════════════
    // SALES FUNNEL REPORT
    // ═══════════════════════════════════════════════════════════════

    /**
     * Get sales funnel overview
     */
    async getFunnelOverview(firmQuery, filters = {}) {
        const { startDate, endDate, pipelineId } = filters;
        const dateFilter = this.buildDateFilter(startDate, endDate);

        const matchStage = {
            ...firmQuery,
            ...dateFilter,
            ...(pipelineId && { pipelineId: new mongoose.Types.ObjectId(pipelineId) })
        };

        // Get pipeline stages
        const pipeline = pipelineId
            ? await Pipeline.findOne({ _id: pipelineId, ...firmQuery }).lean()
            : await Pipeline.findOne({ ...firmQuery, isDefault: true }).lean();

        if (!pipeline) {
            return { stages: [], totalDeals: 0, totalValue: 0, overallConversion: 0, avgCycleTime: 0 };
        }

        const stages = pipeline.stages || [];

        // Aggregate leads by stage
        const stageStats = await Lead.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: '$stageId',
                    count: { $sum: 1 },
                    value: { $sum: { $ifNull: ['$expectedValue', 0] } },
                    avgDays: {
                        $avg: {
                            $divide: [
                                { $subtract: ['$$NOW', { $ifNull: ['$stageEnteredAt', '$createdAt'] }] },
                                1000 * 60 * 60 * 24
                            ]
                        }
                    }
                }
            }
        ]);

        // Map stats to stages
        let previousCount = 0;
        const stageResults = stages.map((stage, index) => {
            const stats = stageStats.find(s => s._id?.toString() === stage._id?.toString()) || {
                count: 0, value: 0, avgDays: 0
            };
            const conversionRate = index === 0 ? 100 :
                previousCount > 0 ? Math.round((stats.count / previousCount) * 100) : 0;
            previousCount = stats.count || previousCount;

            return {
                id: stage._id,
                name: stage.name,
                nameAr: stage.nameAr,
                order: stage.order || index,
                count: stats.count,
                value: stats.value,
                conversionRate,
                avgDaysInStage: Math.round(stats.avgDays || 0)
            };
        });

        const totalDeals = stageResults.reduce((sum, s) => sum + s.count, 0);
        const totalValue = stageResults.reduce((sum, s) => sum + s.value, 0);
        const wonStage = stageResults.find(s => s.name?.toLowerCase().includes('won') || s.name === 'فوز');
        const firstStageCount = stageResults[0]?.count || 1;
        const overallConversion = wonStage ? Math.round((wonStage.count / firstStageCount) * 100) : 0;
        const avgCycleTime = Math.round(stageResults.reduce((sum, s) => sum + s.avgDaysInStage, 0));

        return {
            stages: stageResults,
            totalDeals,
            totalValue,
            overallConversion,
            avgCycleTime
        };
    }

    /**
     * Get funnel velocity (time in each stage)
     */
    async getFunnelVelocity(firmQuery, filters = {}) {
        const { startDate, endDate } = filters;
        const dateFilter = this.buildDateFilter(startDate, endDate);

        const pipeline = await Pipeline.findOne({ ...firmQuery, isDefault: true }).lean();
        if (!pipeline) return [];

        const velocityData = await Lead.aggregate([
            { $match: { ...firmQuery, ...dateFilter, status: 'won' } },
            {
                $group: {
                    _id: '$stageId',
                    avgDays: {
                        $avg: {
                            $divide: [
                                { $subtract: ['$$NOW', { $ifNull: ['$stageEnteredAt', '$createdAt'] }] },
                                1000 * 60 * 60 * 24
                            ]
                        }
                    },
                    deals: { $sum: 1 }
                }
            }
        ]);

        return pipeline.stages.map(stage => {
            const data = velocityData.find(v => v._id?.toString() === stage._id?.toString()) || {};
            return {
                stage: stage.name,
                stageAr: stage.nameAr,
                avgDays: Math.round(data.avgDays || 0),
                deals: data.deals || 0
            };
        });
    }

    /**
     * Get funnel bottlenecks
     */
    async getFunnelBottlenecks(firmQuery) {
        const pipeline = await Pipeline.findOne({ ...firmQuery, isDefault: true }).lean();
        if (!pipeline) return [];

        const stageStats = await Lead.aggregate([
            { $match: { ...firmQuery, status: { $nin: ['won', 'lost'] } } },
            {
                $group: {
                    _id: '$stageId',
                    count: { $sum: 1 },
                    avgDays: {
                        $avg: {
                            $divide: [
                                { $subtract: ['$$NOW', { $ifNull: ['$stageEnteredAt', '$createdAt'] }] },
                                1000 * 60 * 60 * 24
                            ]
                        }
                    }
                }
            },
            { $sort: { avgDays: -1 } }
        ]);

        const overallAvg = stageStats.length > 0
            ? stageStats.reduce((sum, s) => sum + (s.avgDays || 0), 0) / stageStats.length
            : 0;

        return stageStats
            .filter(s => (s.avgDays || 0) > overallAvg * 1.5)
            .map(s => {
                const stage = pipeline.stages.find(st => st._id?.toString() === s._id?.toString());
                return {
                    stage: stage?.name || 'Unknown',
                    stageAr: stage?.nameAr || 'غير معروف',
                    avgDays: Math.round(s.avgDays || 0),
                    count: s.count,
                    dropRate: 0, // Calculate from stage transitions
                    recommendation: s.avgDays > 30
                        ? 'Review process - leads spending too long in this stage'
                        : 'Monitor closely - above average time'
                };
            });
    }

    // ═══════════════════════════════════════════════════════════════
    // DEAL AGING REPORT
    // ═══════════════════════════════════════════════════════════════

    /**
     * Get deal aging overview
     */
    async getDealAgingOverview(firmQuery, filters = {}) {
        const { stageId, ownerId, threshold = 7 } = filters;

        const matchStage = {
            ...firmQuery,
            status: { $nin: ['won', 'lost', 'converted'] },
            ...(stageId && { stageId: new mongoose.Types.ObjectId(stageId) }),
            ...(ownerId && { assignedTo: new mongoose.Types.ObjectId(ownerId) })
        };

        const leads = await Lead.find(matchStage)
            .populate('stageId', 'name nameAr')
            .populate('assignedTo', 'firstName lastName')
            .lean();

        const buckets = [
            { range: '0-7', label: 'On Track', labelAr: 'في المسار', color: '#10b981', min: 0, max: 7 },
            { range: '8-14', label: 'Monitor', labelAr: 'مراقبة', color: '#fbbf24', min: 8, max: 14 },
            { range: '15-30', label: 'At Risk', labelAr: 'في خطر', color: '#f59e0b', min: 15, max: 30 },
            { range: '31-60', label: 'Critical', labelAr: 'حرج', color: '#ef4444', min: 31, max: 60 },
            { range: '60+', label: 'Overdue', labelAr: 'متأخر', color: '#991b1b', min: 61, max: Infinity }
        ];

        const now = new Date();
        const distribution = buckets.map(bucket => ({
            ...bucket,
            count: 0,
            value: 0,
            percentage: 0
        }));

        let totalValue = 0;
        let totalDays = 0;

        for (const lead of leads) {
            const stageEnteredAt = lead.stageEnteredAt || lead.createdAt;
            const days = Math.floor((now - new Date(stageEnteredAt)) / (1000 * 60 * 60 * 24));
            const value = lead.expectedValue || 0;

            totalValue += value;
            totalDays += days;

            const bucket = distribution.find(b => days >= b.min && days <= b.max);
            if (bucket) {
                bucket.count++;
                bucket.value += value;
            }
        }

        // Calculate percentages
        distribution.forEach(bucket => {
            bucket.percentage = leads.length > 0 ? Math.round((bucket.count / leads.length) * 100) : 0;
        });

        const totalStale = distribution.slice(1).reduce((sum, b) => sum + b.count, 0);
        const valueAtRisk = distribution.slice(2).reduce((sum, b) => sum + b.value, 0);
        const avgDaysStuck = leads.length > 0 ? Math.round(totalDays / leads.length) : 0;
        const needsAttention = distribution.slice(3).reduce((sum, b) => sum + b.count, 0);

        return {
            summary: {
                totalStaleDeals: totalStale,
                valueAtRisk,
                avgDaysStuck,
                needsAttention
            },
            agingBuckets: distribution
        };
    }

    /**
     * Get aging by stage
     */
    async getAgingByStage(firmQuery, filters = {}) {
        const { threshold = 14 } = filters;
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - threshold);

        const leads = await Lead.find({
            ...firmQuery,
            status: { $nin: ['won', 'lost', 'converted'] },
            stageEnteredAt: { $lt: cutoffDate }
        })
            .populate('stageId', 'name nameAr')
            .populate('assignedTo', 'firstName lastName')
            .lean();

        const byStage = {};
        const now = new Date();

        for (const lead of leads) {
            const stageKey = lead.stageId?._id?.toString() || 'unassigned';
            if (!byStage[stageKey]) {
                byStage[stageKey] = {
                    stage: lead.stageId?.name || 'Unassigned',
                    stageAr: lead.stageId?.nameAr || 'غير محدد',
                    deals: [],
                    totalValue: 0,
                    avgDays: 0
                };
            }

            const days = Math.floor((now - new Date(lead.stageEnteredAt || lead.createdAt)) / (1000 * 60 * 60 * 24));

            byStage[stageKey].deals.push({
                id: lead._id,
                name: `${lead.firstName || ''} ${lead.lastName || ''}`.trim(),
                company: lead.company,
                value: lead.expectedValue || 0,
                daysInStage: days,
                owner: lead.assignedTo ? `${lead.assignedTo.firstName} ${lead.assignedTo.lastName}` : null
            });
            byStage[stageKey].totalValue += lead.expectedValue || 0;
        }

        // Calculate averages
        Object.values(byStage).forEach(stage => {
            stage.avgDays = stage.deals.length > 0
                ? Math.round(stage.deals.reduce((sum, d) => sum + d.daysInStage, 0) / stage.deals.length)
                : 0;
        });

        return Object.values(byStage).sort((a, b) => b.avgDays - a.avgDays);
    }

    // ═══════════════════════════════════════════════════════════════
    // LEADS BY SOURCE REPORT
    // ═══════════════════════════════════════════════════════════════

    /**
     * Get leads by source overview
     */
    async getLeadsBySourceOverview(firmQuery, filters = {}) {
        const { startDate, endDate } = filters;
        const dateFilter = this.buildDateFilter(startDate, endDate);

        const sourceStats = await Lead.aggregate([
            { $match: { ...firmQuery, ...dateFilter } },
            {
                $group: {
                    _id: '$source',
                    count: { $sum: 1 },
                    converted: {
                        $sum: { $cond: [{ $eq: ['$status', 'won'] }, 1, 0] }
                    },
                    value: {
                        $sum: {
                            $cond: [{ $eq: ['$status', 'won'] }, { $ifNull: ['$expectedValue', 0] }, 0]
                        }
                    }
                }
            },
            { $sort: { count: -1 } }
        ]);

        const totalLeads = sourceStats.reduce((sum, s) => sum + s.count, 0);
        const totalConverted = sourceStats.reduce((sum, s) => sum + s.converted, 0);
        const conversionRate = totalLeads > 0 ? Math.round((totalConverted / totalLeads) * 100) : 0;

        const bySource = sourceStats.map(s => ({
            source: s._id || 'direct',
            count: s.count,
            converted: s.converted,
            conversionRate: s.count > 0 ? Math.round((s.converted / s.count) * 100) : 0,
            value: s.value,
            percentage: totalLeads > 0 ? Math.round((s.count / totalLeads) * 100) : 0
        }));

        const bestSource = bySource.reduce((best, s) =>
            s.conversionRate > (best?.conversionRate || 0) ? s : best, null);

        return {
            summary: {
                totalLeads,
                conversionRate,
                bestSource: bestSource?.source || 'N/A'
            },
            bySource
        };
    }

    /**
     * Get leads by source trend
     */
    async getLeadsBySourceTrend(firmQuery, filters = {}) {
        const { startDate, endDate, source } = filters;
        const dateFilter = this.buildDateFilter(startDate, endDate);

        const matchStage = {
            ...firmQuery,
            ...dateFilter,
            ...(source && { source })
        };

        const trend = await Lead.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: {
                        year: { $year: '$createdAt' },
                        month: { $month: '$createdAt' },
                        source: '$source'
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]);

        // Group by month
        const months = {};
        trend.forEach(t => {
            const key = `${t._id.year}-${String(t._id.month).padStart(2, '0')}`;
            if (!months[key]) {
                months[key] = { month: key };
            }
            months[key][t._id.source || 'direct'] = t.count;
        });

        return Object.values(months);
    }

    // ═══════════════════════════════════════════════════════════════
    // WIN/LOSS ANALYSIS REPORT
    // ═══════════════════════════════════════════════════════════════

    /**
     * Get win/loss overview
     */
    async getWinLossOverview(firmQuery, filters = {}) {
        const { startDate, endDate, ownerId } = filters;
        const dateFilter = this.buildDateFilter(startDate, endDate);

        const matchStage = {
            ...firmQuery,
            status: { $in: ['won', 'lost'] },
            ...dateFilter,
            ...(ownerId && { assignedTo: new mongoose.Types.ObjectId(ownerId) })
        };

        const stats = await Lead.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                    value: { $sum: { $ifNull: ['$expectedValue', 0] } }
                }
            }
        ]);

        const won = stats.find(s => s._id === 'won') || { count: 0, value: 0 };
        const lost = stats.find(s => s._id === 'lost') || { count: 0, value: 0 };
        const total = won.count + lost.count;
        const winRate = total > 0 ? Math.round((won.count / total) * 100) : 0;

        return {
            summary: {
                winRate,
                wonValue: won.value,
                lostValue: lost.value,
                wonCount: won.count,
                lostCount: lost.count
            },
            distribution: [
                { type: 'won', count: won.count, value: won.value, percentage: total > 0 ? Math.round((won.count / total) * 100) : 0 },
                { type: 'lost', count: lost.count, value: lost.value, percentage: total > 0 ? Math.round((lost.count / total) * 100) : 0 }
            ]
        };
    }

    /**
     * Get lost reasons analysis
     */
    async getLostReasons(firmQuery, filters = {}) {
        const { startDate, endDate } = filters;
        const dateFilter = this.buildDateFilter(startDate, endDate);

        const reasons = await Lead.aggregate([
            {
                $match: {
                    ...firmQuery,
                    status: 'lost',
                    ...dateFilter
                }
            },
            {
                $group: {
                    _id: '$lostReasonId',
                    count: { $sum: 1 },
                    value: { $sum: { $ifNull: ['$expectedValue', 0] } }
                }
            },
            {
                $lookup: {
                    from: 'lostreasons',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'reason'
                }
            },
            { $unwind: { path: '$reason', preserveNullAndEmptyArrays: true } },
            { $sort: { count: -1 } }
        ]);

        const total = reasons.reduce((sum, r) => sum + r.count, 0);

        return reasons.map(r => ({
            reason: r.reason?.name || 'Other',
            reasonAr: r.reason?.nameAr || 'أخرى',
            count: r.count,
            value: r.value,
            percentage: total > 0 ? Math.round((r.count / total) * 100) : 0
        }));
    }

    /**
     * Get win/loss trend
     */
    async getWinLossTrend(firmQuery, filters = {}) {
        const { startDate, endDate } = filters;
        const dateFilter = this.buildDateFilter(startDate, endDate);

        const trend = await Lead.aggregate([
            {
                $match: {
                    ...firmQuery,
                    status: { $in: ['won', 'lost'] },
                    ...dateFilter
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: '$updatedAt' },
                        month: { $month: '$updatedAt' }
                    },
                    wonCount: {
                        $sum: { $cond: [{ $eq: ['$status', 'won'] }, 1, 0] }
                    },
                    lostCount: {
                        $sum: { $cond: [{ $eq: ['$status', 'lost'] }, 1, 0] }
                    }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]);

        return trend.map(t => ({
            month: `${t._id.year}-${String(t._id.month).padStart(2, '0')}`,
            winRate: t.wonCount + t.lostCount > 0
                ? Math.round((t.wonCount / (t.wonCount + t.lostCount)) * 100)
                : 0,
            wonCount: t.wonCount,
            lostCount: t.lostCount
        }));
    }

    // ═══════════════════════════════════════════════════════════════
    // ACTIVITY ANALYTICS REPORT
    // ═══════════════════════════════════════════════════════════════

    /**
     * Get activity analytics overview
     */
    async getActivityOverview(firmQuery, filters = {}) {
        const { startDate, endDate, ownerId, type } = filters;
        const dateFilter = this.buildDateFilter(startDate, endDate);

        const matchStage = {
            ...firmQuery,
            ...dateFilter,
            ...(ownerId && { performedBy: new mongoose.Types.ObjectId(ownerId) }),
            ...(type && { type })
        };

        const stats = await CrmActivity.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: '$type',
                    count: { $sum: 1 }
                }
            }
        ]);

        const total = stats.reduce((sum, s) => sum + s.count, 0);

        const byType = stats.map(s => ({
            type: s._id || 'other',
            count: s.count,
            percentage: total > 0 ? Math.round((s.count / total) * 100) : 0
        }));

        const calls = byType.find(t => t.type === 'call')?.count || 0;
        const emails = byType.find(t => t.type === 'email')?.count || 0;
        const meetings = byType.find(t => t.type === 'meeting')?.count || 0;
        const tasks = byType.find(t => t.type === 'task')?.count || 0;

        return {
            summary: {
                totalActivities: total,
                calls,
                emails,
                meetings,
                tasks
            },
            byType
        };
    }

    /**
     * Get activity by day of week
     */
    async getActivityByDayOfWeek(firmQuery, filters = {}) {
        const { startDate, endDate } = filters;
        const dateFilter = this.buildDateFilter(startDate, endDate);

        const byDay = await CrmActivity.aggregate([
            { $match: { ...firmQuery, ...dateFilter } },
            {
                $group: {
                    _id: {
                        dayOfWeek: { $dayOfWeek: '$createdAt' },
                        type: '$type'
                    },
                    count: { $sum: 1 }
                }
            }
        ]);

        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const result = days.map((day, index) => {
            const dayData = byDay.filter(d => d._id.dayOfWeek === index + 1);
            return {
                day,
                dayIndex: index,
                calls: dayData.find(d => d._id.type === 'call')?.count || 0,
                emails: dayData.find(d => d._id.type === 'email')?.count || 0,
                meetings: dayData.find(d => d._id.type === 'meeting')?.count || 0,
                tasks: dayData.find(d => d._id.type === 'task')?.count || 0
            };
        });

        return result;
    }

    /**
     * Get activity by hour
     */
    async getActivityByHour(firmQuery, filters = {}) {
        const { startDate, endDate } = filters;
        const dateFilter = this.buildDateFilter(startDate, endDate);

        const byHour = await CrmActivity.aggregate([
            { $match: { ...firmQuery, ...dateFilter } },
            {
                $group: {
                    _id: { $hour: '$createdAt' },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        const maxCount = Math.max(...byHour.map(h => h.count), 1);

        return Array(24).fill(null).map((_, hour) => {
            const data = byHour.find(h => h._id === hour);
            return {
                hour,
                count: data?.count || 0,
                intensity: data ? data.count / maxCount : 0
            };
        });
    }

    /**
     * Get activity leaderboard
     */
    async getActivityLeaderboard(firmQuery, filters = {}) {
        const { startDate, endDate } = filters;
        const dateFilter = this.buildDateFilter(startDate, endDate);

        const leaderboard = await CrmActivity.aggregate([
            { $match: { ...firmQuery, ...dateFilter, performedBy: { $exists: true } } },
            {
                $group: {
                    _id: '$performedBy',
                    total: { $sum: 1 },
                    calls: { $sum: { $cond: [{ $eq: ['$type', 'call'] }, 1, 0] } },
                    emails: { $sum: { $cond: [{ $eq: ['$type', 'email'] }, 1, 0] } },
                    meetings: { $sum: { $cond: [{ $eq: ['$type', 'meeting'] }, 1, 0] } },
                    tasks: { $sum: { $cond: [{ $eq: ['$type', 'task'] }, 1, 0] } }
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'user'
                }
            },
            { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
            { $sort: { total: -1 } }
        ]);

        const teamAvg = leaderboard.length > 0
            ? leaderboard.reduce((sum, l) => sum + l.total, 0) / leaderboard.length
            : 0;

        return leaderboard.map((l, index) => ({
            rank: index + 1,
            user: {
                id: l._id,
                name: l.user ? `${l.user.firstName || ''} ${l.user.lastName || ''}`.trim() : 'Unknown',
                avatar: l.user?.avatar
            },
            totalActivities: l.total,
            calls: l.calls,
            emails: l.emails,
            meetings: l.meetings,
            tasks: l.tasks,
            vsTeamAvg: teamAvg > 0 ? Math.round(((l.total - teamAvg) / teamAvg) * 100) : 0
        }));
    }

    // ═══════════════════════════════════════════════════════════════
    // REVENUE FORECAST REPORT
    // ═══════════════════════════════════════════════════════════════

    /**
     * Get revenue forecast overview
     */
    async getRevenueForecastOverview(firmQuery, filters = {}) {
        const { period = 'quarter', ownerId, territoryId } = filters;
        const { startDate, endDate } = this.getDateRange(period);

        const matchStage = {
            ...firmQuery,
            status: { $nin: ['lost', 'unqualified'] },
            ...(ownerId && { assignedTo: new mongoose.Types.ObjectId(ownerId) }),
            ...(territoryId && { territoryId: new mongoose.Types.ObjectId(territoryId) })
        };

        const leads = await Lead.find(matchStage)
            .populate('assignedTo', 'firstName lastName')
            .lean();

        // Get quota for period
        const quota = await SalesQuota.findOne({
            ...firmQuery,
            status: 'active',
            startDate: { $lte: endDate },
            endDate: { $gte: startDate }
        }).lean();

        // Categorize deals
        const categories = [
            { id: 'closed_won', label: 'Closed Won', minProb: 100, maxProb: 100 },
            { id: 'commit', label: 'Commit', minProb: 90, maxProb: 99 },
            { id: 'best_case', label: 'Best Case', minProb: 50, maxProb: 89 },
            { id: 'pipeline', label: 'Pipeline', minProb: 20, maxProb: 49 },
            { id: 'upside', label: 'Upside', minProb: 0, maxProb: 19 }
        ];

        const result = categories.map(cat => {
            const deals = leads.filter(l => {
                if (cat.id === 'closed_won') return l.status === 'won';
                return l.status !== 'won' && l.probability >= cat.minProb && l.probability <= cat.maxProb;
            });

            return {
                category: cat.id,
                label: cat.label,
                count: deals.length,
                value: deals.reduce((sum, d) => sum + (d.expectedValue || 0), 0),
                weightedValue: deals.reduce((sum, d) => sum + (d.weightedValue || 0), 0)
            };
        });

        const committed = result[0].value + result[1].value;
        const bestCase = committed + result[2].value;
        const pipeline = leads.reduce((sum, l) => sum + (l.expectedValue || 0), 0);
        const quotaTarget = quota?.target || 0;

        return {
            summary: {
                committed,
                bestCase,
                pipeline,
                quota: quotaTarget,
                gapToQuota: Math.max(0, quotaTarget - committed)
            },
            categories: result
        };
    }

    /**
     * Get forecast by month
     */
    async getForecastByMonth(firmQuery, filters = {}) {
        const { year = new Date().getFullYear() } = filters;

        const results = [];
        for (let month = 1; month <= 12; month++) {
            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 0);

            const leads = await Lead.find({
                ...firmQuery,
                expectedCloseDate: { $gte: startDate, $lte: endDate }
            }).lean();

            const closedWon = leads.filter(l => l.status === 'won');
            const committed = leads.filter(l => l.probability >= 90);
            const bestCase = leads.filter(l => l.probability >= 50);
            const pipeline = leads;

            const quota = await SalesQuota.findOne({
                ...firmQuery,
                period: 'monthly',
                startDate: { $lte: endDate },
                endDate: { $gte: startDate }
            }).lean();

            results.push({
                month: startDate.toLocaleString('default', { month: 'short' }),
                monthNum: month,
                closedWon: closedWon.reduce((sum, l) => sum + (l.expectedValue || 0), 0),
                committed: committed.reduce((sum, l) => sum + (l.expectedValue || 0), 0),
                bestCase: bestCase.reduce((sum, l) => sum + (l.expectedValue || 0), 0),
                pipeline: pipeline.reduce((sum, l) => sum + (l.expectedValue || 0), 0),
                quota: quota?.target || 0,
                attainment: quota?.target > 0
                    ? Math.round((closedWon.reduce((sum, l) => sum + (l.expectedValue || 0), 0) / quota.target) * 100)
                    : 0
            });
        }

        return results;
    }

    /**
     * Get forecast by rep
     */
    async getForecastByRep(firmQuery, filters = {}) {
        const { period = 'quarter' } = filters;
        const { startDate, endDate } = this.getDateRange(period);

        const leads = await Lead.find({
            ...firmQuery,
            status: { $nin: ['lost', 'unqualified'] },
            assignedTo: { $exists: true }
        })
            .populate('assignedTo', 'firstName lastName')
            .lean();

        const byRep = {};
        for (const lead of leads) {
            const repId = lead.assignedTo?._id?.toString();
            if (!repId) continue;

            if (!byRep[repId]) {
                byRep[repId] = {
                    user: {
                        id: repId,
                        name: `${lead.assignedTo.firstName || ''} ${lead.assignedTo.lastName || ''}`.trim()
                    },
                    committed: 0,
                    bestCase: 0,
                    pipeline: 0,
                    quota: 0
                };

                // Get rep's quota
                const quota = await SalesQuota.findOne({
                    ...firmQuery,
                    userId: lead.assignedTo._id,
                    status: 'active',
                    startDate: { $lte: endDate },
                    endDate: { $gte: startDate }
                }).lean();

                byRep[repId].quota = quota?.target || 0;
            }

            const value = lead.expectedValue || 0;
            byRep[repId].pipeline += value;
            if (lead.probability >= 90 || lead.status === 'won') byRep[repId].committed += value;
            if (lead.probability >= 50 || lead.status === 'won') byRep[repId].bestCase += value;
        }

        return Object.values(byRep).map(rep => ({
            ...rep,
            gapToQuota: Math.max(0, rep.quota - rep.committed),
            status: rep.committed >= rep.quota ? 'ahead' :
                rep.committed >= rep.quota * 0.8 ? 'on_track' : 'behind'
        })).sort((a, b) => b.committed - a.committed);
    }

    // ═══════════════════════════════════════════════════════════════
    // RECENT ACTIVITY
    // ═══════════════════════════════════════════════════════════════

    /**
     * Get recent activity for dashboard
     */
    async getRecentActivity(firmQuery, limit = 5) {
        const [activities, transactions] = await Promise.all([
            CrmActivity.find(firmQuery)
                .sort({ createdAt: -1 })
                .limit(limit)
                .populate('performedBy', 'firstName lastName')
                .lean(),
            CRMTransaction.find(firmQuery)
                .sort({ createdAt: -1 })
                .limit(limit)
                .populate('performedBy', 'firstName lastName')
                .lean()
        ]);

        const combined = [...activities, ...transactions]
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, limit)
            .map(item => ({
                type: item.type || item.activityType || 'activity',
                title: item.subject || item.description || item.type,
                description: item.notes || item.descriptionAr || '',
                time: item.createdAt,
                value: item.value || null,
                user: item.performedBy
                    ? `${item.performedBy.firstName || ''} ${item.performedBy.lastName || ''}`.trim()
                    : null
            }));

        return combined;
    }

    // ═══════════════════════════════════════════════════════════════
    // EXPORT FUNCTIONALITY
    // ═══════════════════════════════════════════════════════════════

    /**
     * Export report to CSV
     */
    async exportReport(firmQuery, reportType, filters = {}) {
        let data;

        switch (reportType) {
            case 'funnel':
                data = await this.getFunnelOverview(firmQuery, filters);
                break;
            case 'aging':
                data = await this.getDealAgingOverview(firmQuery, filters);
                break;
            case 'leads-source':
                data = await this.getLeadsBySourceOverview(firmQuery, filters);
                break;
            case 'win-loss':
                data = await this.getWinLossOverview(firmQuery, filters);
                break;
            case 'activities':
                data = await this.getActivityOverview(firmQuery, filters);
                break;
            case 'forecast':
                data = await this.getRevenueForecastOverview(firmQuery, filters);
                break;
            default:
                throw new Error(`Unknown report type: ${reportType}`);
        }

        return this.convertToCSV(data, reportType);
    }

    convertToCSV(data, reportType) {
        // Simple CSV conversion - flatten the data
        const rows = [];

        if (Array.isArray(data)) {
            if (data.length === 0) return '';
            const headers = Object.keys(data[0]);
            rows.push(headers.join(','));
            data.forEach(item => {
                rows.push(headers.map(h => JSON.stringify(item[h] || '')).join(','));
            });
        } else if (data.stages) {
            // Funnel report
            rows.push('Stage,Count,Value,Conversion Rate,Avg Days');
            data.stages.forEach(s => {
                rows.push(`${s.name},${s.count},${s.value},${s.conversionRate}%,${s.avgDaysInStage}`);
            });
        } else if (data.bySource) {
            // Leads by source
            rows.push('Source,Count,Converted,Conversion Rate,Value');
            data.bySource.forEach(s => {
                rows.push(`${s.source},${s.count},${s.converted},${s.conversionRate}%,${s.value}`);
            });
        }

        return rows.join('\n');
    }

    // ═══════════════════════════════════════════════════════════════
    // HELPER METHODS
    // ═══════════════════════════════════════════════════════════════

    getDateRange(period) {
        const now = new Date();
        let startDate, endDate;

        switch (period) {
            case 'week':
                startDate = new Date(now);
                startDate.setDate(now.getDate() - 7);
                endDate = now;
                break;
            case 'month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                break;
            case 'quarter':
                const quarter = Math.floor(now.getMonth() / 3);
                startDate = new Date(now.getFullYear(), quarter * 3, 1);
                endDate = new Date(now.getFullYear(), quarter * 3 + 3, 0);
                break;
            case 'year':
                startDate = new Date(now.getFullYear(), 0, 1);
                endDate = new Date(now.getFullYear(), 11, 31);
                break;
            default:
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                endDate = now;
        }

        return { startDate, endDate };
    }

    buildDateFilter(startDate, endDate) {
        if (!startDate && !endDate) return {};
        const filter = { createdAt: {} };
        if (startDate) filter.createdAt.$gte = new Date(startDate);
        if (endDate) filter.createdAt.$lte = new Date(endDate);
        return filter;
    }

    calculateChange(current, previous) {
        if (!previous || previous === 0) return current > 0 ? 100 : 0;
        return Math.round(((current - previous) / previous) * 100 * 10) / 10;
    }

    formatCurrency(value, currency = 'SAR') {
        if (value >= 1000000) {
            return `${(value / 1000000).toFixed(1)}M ${currency}`;
        } else if (value >= 1000) {
            return `${(value / 1000).toFixed(1)}K ${currency}`;
        }
        return `${value} ${currency}`;
    }
}

module.exports = new CRMReportsService();
