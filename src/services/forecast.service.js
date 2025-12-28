/**
 * Forecast Service
 *
 * Server-side sales forecasting with:
 * - Best/Most Likely/Worst case scenarios
 * - Probability-weighted pipeline
 * - Historical trend analysis
 * - Target tracking
 * - Rolling forecasts
 *
 * Backend does 90% of work - frontend just displays
 */

const mongoose = require('mongoose');
const logger = require('../utils/logger');

// Default stage probabilities
const DEFAULT_PROBABILITIES = {
    new: 10,
    contacted: 20,
    qualified: 40,
    proposal: 60,
    negotiation: 80,
    won: 100,
    lost: 0,
    dormant: 5
};

class ForecastService {
    // ═══════════════════════════════════════════════════════════
    // WEIGHTED PIPELINE FORECAST
    // ═══════════════════════════════════════════════════════════

    /**
     * Calculate weighted pipeline forecast
     * @param {object} firmQuery - Firm query for isolation
     * @param {object} options - Forecast options
     * @returns {object} - Weighted forecast
     */
    static async getWeightedPipeline(firmQuery, options = {}) {
        const Lead = mongoose.model('Lead');
        const { probabilities = DEFAULT_PROBABILITIES } = options;

        const pipeline = await Lead.aggregate([
            {
                $match: {
                    ...firmQuery,
                    status: { $nin: ['won', 'lost'] }
                }
            },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                    totalValue: { $sum: { $ifNull: ['$estimatedValue', 0] } }
                }
            }
        ]);

        let totalUnweighted = 0;
        let totalWeighted = 0;
        const stages = [];

        pipeline.forEach(stage => {
            const probability = probabilities[stage._id] || 50;
            const weightedValue = Math.round(stage.totalValue * (probability / 100));

            stages.push({
                stage: stage._id,
                count: stage.count,
                unweightedValue: stage.totalValue,
                probability,
                weightedValue
            });

            totalUnweighted += stage.totalValue;
            totalWeighted += weightedValue;
        });

        return {
            stages: stages.sort((a, b) => {
                const order = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'dormant'];
                return order.indexOf(a.stage) - order.indexOf(b.stage);
            }),
            totals: {
                unweighted: Math.round(totalUnweighted),
                weighted: Math.round(totalWeighted),
                dealCount: pipeline.reduce((sum, s) => sum + s.count, 0)
            }
        };
    }

    // ═══════════════════════════════════════════════════════════
    // SCENARIO FORECASTS
    // ═══════════════════════════════════════════════════════════

    /**
     * Generate best/most likely/worst case forecasts
     * @param {object} firmQuery - Firm query
     * @param {object} dateRange - Forecast period
     * @returns {object} - Scenario forecasts
     */
    static async getScenarioForecasts(firmQuery, dateRange = {}) {
        const Lead = mongoose.model('Lead');

        const endDate = dateRange.endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        const startDate = dateRange.startDate || new Date();

        // Get active pipeline
        const activePipeline = await Lead.find({
            ...firmQuery,
            status: { $nin: ['won', 'lost'] }
        }).select('status estimatedValue expectedCloseDate probability').lean();

        // Get historical data for baseline
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const historical = await Lead.aggregate([
            {
                $match: {
                    ...firmQuery,
                    status: 'won',
                    convertedAt: { $gte: thirtyDaysAgo }
                }
            },
            {
                $group: {
                    _id: null,
                    totalValue: { $sum: { $ifNull: ['$estimatedValue', 0] } },
                    count: { $sum: 1 }
                }
            }
        ]);

        const historicalBaseline = historical[0] || { totalValue: 0, count: 0 };

        // Calculate scenarios
        const scenarios = {
            worst: { value: 0, deals: 0, probability: 0 },
            mostLikely: { value: 0, deals: 0, probability: 0 },
            best: { value: 0, deals: 0, probability: 0 }
        };

        activePipeline.forEach(lead => {
            const value = lead.estimatedValue || 0;
            const stageProbability = DEFAULT_PROBABILITIES[lead.status] || 50;
            const customProbability = lead.probability || stageProbability;

            // Worst case: only high-probability deals
            if (customProbability >= 80) {
                scenarios.worst.value += value * 0.8; // 80% of value
                scenarios.worst.deals += 1;
            }

            // Most likely: weighted by probability
            scenarios.mostLikely.value += value * (customProbability / 100);
            if (customProbability >= 50) {
                scenarios.mostLikely.deals += 1;
            }

            // Best case: all deals close
            scenarios.best.value += value;
            scenarios.best.deals += 1;
        });

        // Add expected baseline from historical performance
        const daysInPeriod = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
        const dailyRate = historicalBaseline.count > 0 ? historicalBaseline.totalValue / 30 : 0;
        const baselineValue = dailyRate * daysInPeriod;

        // Adjust scenarios with baseline
        scenarios.worst.value = Math.round(scenarios.worst.value + baselineValue * 0.5);
        scenarios.mostLikely.value = Math.round(scenarios.mostLikely.value + baselineValue * 0.75);
        scenarios.best.value = Math.round(scenarios.best.value + baselineValue);

        return {
            scenarios,
            period: {
                start: startDate,
                end: endDate,
                days: daysInPeriod
            },
            baseline: {
                historicalMonthlyValue: historicalBaseline.totalValue,
                historicalMonthlyDeals: historicalBaseline.count,
                projectedPeriodValue: Math.round(baselineValue)
            },
            pipelineValue: Math.round(activePipeline.reduce((sum, l) => sum + (l.estimatedValue || 0), 0)),
            pipelineDeals: activePipeline.length
        };
    }

    // ═══════════════════════════════════════════════════════════
    // ROLLING FORECAST
    // ═══════════════════════════════════════════════════════════

    /**
     * Generate rolling forecast by period
     * @param {object} firmQuery - Firm query
     * @param {number} periods - Number of periods
     * @param {string} periodType - Period type (week, month, quarter)
     * @returns {object} - Rolling forecast
     */
    static async getRollingForecast(firmQuery, periods = 6, periodType = 'month') {
        const Lead = mongoose.model('Lead');

        const periodMs = {
            week: 7 * 24 * 60 * 60 * 1000,
            month: 30 * 24 * 60 * 60 * 1000,
            quarter: 90 * 24 * 60 * 60 * 1000
        };

        const now = new Date();
        const forecasts = [];

        // Get historical data for trend analysis
        const threeMonthsAgo = new Date(now - 90 * 24 * 60 * 60 * 1000);
        const historicalByMonth = await Lead.aggregate([
            {
                $match: {
                    ...firmQuery,
                    status: 'won',
                    convertedAt: { $gte: threeMonthsAgo }
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: '$convertedAt' },
                        month: { $month: '$convertedAt' }
                    },
                    value: { $sum: { $ifNull: ['$estimatedValue', 0] } },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]);

        // Calculate trend
        const historicalValues = historicalByMonth.map(h => h.value);
        const avgHistorical = historicalValues.length > 0
            ? historicalValues.reduce((a, b) => a + b, 0) / historicalValues.length
            : 0;

        // Get pipeline deals with expected close dates
        const pipelineDeals = await Lead.find({
            ...firmQuery,
            status: { $nin: ['won', 'lost'] }
        }).select('status estimatedValue expectedCloseDate probability').lean();

        for (let i = 0; i < periods; i++) {
            const periodStart = new Date(now.getTime() + i * periodMs[periodType]);
            const periodEnd = new Date(periodStart.getTime() + periodMs[periodType]);

            // Filter deals expected to close in this period
            const periodDeals = pipelineDeals.filter(d => {
                if (!d.expectedCloseDate) return false;
                const closeDate = new Date(d.expectedCloseDate);
                return closeDate >= periodStart && closeDate < periodEnd;
            });

            // Calculate weighted value
            const weightedValue = periodDeals.reduce((sum, d) => {
                const prob = d.probability || DEFAULT_PROBABILITIES[d.status] || 50;
                return sum + ((d.estimatedValue || 0) * (prob / 100));
            }, 0);

            // Baseline from historical (decaying confidence for future periods)
            const confidenceDecay = Math.max(0.5, 1 - (i * 0.1));
            const baselineValue = avgHistorical * confidenceDecay;

            forecasts.push({
                period: i + 1,
                periodStart: periodStart.toISOString().split('T')[0],
                periodEnd: periodEnd.toISOString().split('T')[0],
                pipelineDeals: periodDeals.length,
                pipelineValue: Math.round(periodDeals.reduce((sum, d) => sum + (d.estimatedValue || 0), 0)),
                weightedValue: Math.round(weightedValue),
                baselineValue: Math.round(baselineValue),
                forecastValue: Math.round(weightedValue + baselineValue),
                confidence: Math.round(confidenceDecay * 100)
            });
        }

        return {
            periodType,
            periods: forecasts,
            totals: {
                totalForecast: forecasts.reduce((sum, f) => sum + f.forecastValue, 0),
                totalWeighted: forecasts.reduce((sum, f) => sum + f.weightedValue, 0),
                totalBaseline: forecasts.reduce((sum, f) => sum + f.baselineValue, 0),
                avgConfidence: Math.round(forecasts.reduce((sum, f) => sum + f.confidence, 0) / periods)
            },
            historical: {
                avgMonthlyValue: Math.round(avgHistorical),
                monthsAnalyzed: historicalByMonth.length
            }
        };
    }

    // ═══════════════════════════════════════════════════════════
    // TARGET TRACKING
    // ═══════════════════════════════════════════════════════════

    /**
     * Track progress against targets
     * @param {object} firmQuery - Firm query
     * @param {object} targets - Target configuration
     * @returns {object} - Target tracking
     */
    static async getTargetProgress(firmQuery, targets = {}) {
        const Lead = mongoose.model('Lead');

        const {
            monthlyTarget = 0,
            quarterlyTarget = 0,
            yearlyTarget = 0
        } = targets;

        const now = new Date();

        // Date ranges
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
        const yearStart = new Date(now.getFullYear(), 0, 1);

        // Get actual closed values
        const [monthlyActual, quarterlyActual, yearlyActual] = await Promise.all([
            this.getClosedValue(firmQuery, monthStart, now),
            this.getClosedValue(firmQuery, quarterStart, now),
            this.getClosedValue(firmQuery, yearStart, now)
        ]);

        // Get forecasted values
        const monthlyForecast = await this.getScenarioForecasts(firmQuery, {
            startDate: now,
            endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0)
        });

        // Calculate progress
        const monthly = this.calculateProgress(monthlyActual, monthlyTarget, monthlyForecast.scenarios.mostLikely.value);
        const quarterly = this.calculateProgress(quarterlyActual, quarterlyTarget, monthlyForecast.scenarios.mostLikely.value * 3);
        const yearly = this.calculateProgress(yearlyActual, yearlyTarget, monthlyForecast.scenarios.mostLikely.value * 12);

        return {
            monthly: {
                target: monthlyTarget,
                actual: monthlyActual,
                forecast: Math.round(monthlyActual + monthlyForecast.scenarios.mostLikely.value),
                ...monthly
            },
            quarterly: {
                target: quarterlyTarget,
                actual: quarterlyActual,
                forecast: Math.round(quarterlyActual + monthlyForecast.scenarios.mostLikely.value * 3),
                ...quarterly
            },
            yearly: {
                target: yearlyTarget,
                actual: yearlyActual,
                forecast: Math.round(yearlyActual + monthlyForecast.scenarios.mostLikely.value * 12),
                ...yearly
            },
            periodProgress: {
                monthDaysPassed: now.getDate(),
                monthDaysTotal: new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate(),
                quarterDaysPassed: Math.floor((now - quarterStart) / (1000 * 60 * 60 * 24)),
                yearDaysPassed: Math.floor((now - yearStart) / (1000 * 60 * 60 * 24))
            }
        };
    }

    /**
     * Get closed value for a period
     */
    static async getClosedValue(firmQuery, startDate, endDate) {
        const Lead = mongoose.model('Lead');

        const result = await Lead.aggregate([
            {
                $match: {
                    ...firmQuery,
                    status: 'won',
                    convertedAt: { $gte: startDate, $lte: endDate }
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: { $ifNull: ['$estimatedValue', 0] } }
                }
            }
        ]);

        return result[0]?.total || 0;
    }

    /**
     * Calculate progress metrics
     */
    static calculateProgress(actual, target, additionalForecast) {
        if (target <= 0) {
            return { progress: 0, gap: 0, status: 'no_target' };
        }

        const progress = Math.round((actual / target) * 100);
        const gap = target - actual;
        const forecastTotal = actual + additionalForecast;
        const forecastProgress = Math.round((forecastTotal / target) * 100);

        let status = 'on_track';
        if (progress >= 100) status = 'achieved';
        else if (forecastProgress >= 100) status = 'on_track';
        else if (forecastProgress >= 80) status = 'at_risk';
        else status = 'behind';

        return {
            progress,
            gap: Math.round(gap),
            status,
            forecastProgress,
            willAchieve: forecastProgress >= 100
        };
    }

    // ═══════════════════════════════════════════════════════════
    // SALESPERSON FORECASTS
    // ═══════════════════════════════════════════════════════════

    /**
     * Get forecast by salesperson
     * @param {object} firmQuery - Firm query
     * @returns {object} - Salesperson forecasts
     */
    static async getForecastBySalesperson(firmQuery) {
        const Lead = mongoose.model('Lead');

        const salesForecasts = await Lead.aggregate([
            {
                $match: {
                    ...firmQuery,
                    status: { $nin: ['won', 'lost'] },
                    assignedTo: { $exists: true }
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'assignedTo',
                    foreignField: '_id',
                    as: 'assignee'
                }
            },
            { $unwind: '$assignee' },
            {
                $group: {
                    _id: '$assignedTo',
                    name: { $first: { $concat: ['$assignee.firstName', ' ', '$assignee.lastName'] } },
                    totalDeals: { $sum: 1 },
                    totalValue: { $sum: { $ifNull: ['$estimatedValue', 0] } },
                    avgProbability: { $avg: { $ifNull: ['$probability', 50] } }
                }
            },
            {
                $project: {
                    salesperson: '$_id',
                    name: 1,
                    totalDeals: 1,
                    totalValue: 1,
                    avgProbability: { $round: ['$avgProbability', 0] },
                    weightedValue: {
                        $round: [{ $multiply: ['$totalValue', { $divide: ['$avgProbability', 100] }] }, 0]
                    }
                }
            },
            { $sort: { weightedValue: -1 } }
        ]);

        return {
            salespeople: salesForecasts,
            totals: {
                totalValue: salesForecasts.reduce((sum, s) => sum + s.totalValue, 0),
                totalWeighted: salesForecasts.reduce((sum, s) => sum + s.weightedValue, 0),
                totalDeals: salesForecasts.reduce((sum, s) => sum + s.totalDeals, 0)
            }
        };
    }

    // ═══════════════════════════════════════════════════════════
    // COMPREHENSIVE FORECAST
    // ═══════════════════════════════════════════════════════════

    /**
     * Get comprehensive forecast data
     * @param {object} firmQuery - Firm query
     * @param {object} options - Options
     * @returns {object} - Complete forecast data
     */
    static async getComprehensiveForecast(firmQuery, options = {}) {
        const [
            weightedPipeline,
            scenarios,
            rolling,
            targets,
            bySalesperson
        ] = await Promise.all([
            this.getWeightedPipeline(firmQuery, options),
            this.getScenarioForecasts(firmQuery, {
                startDate: new Date(),
                endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            }),
            this.getRollingForecast(firmQuery, 6, 'month'),
            this.getTargetProgress(firmQuery, options.targets || {}),
            this.getForecastBySalesperson(firmQuery)
        ]);

        return {
            weightedPipeline,
            scenarios,
            rolling,
            targets,
            bySalesperson,
            generatedAt: new Date()
        };
    }
}

module.exports = ForecastService;
