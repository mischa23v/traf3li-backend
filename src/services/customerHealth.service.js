const Firm = require('../models/firm.model');
const Subscription = require('../models/subscription.model');
const Payment = require('../models/payment.model');
const Invoice = require('../models/invoice.model');
const User = require('../models/user.model');
const Case = require('../models/case.model');
const Client = require('../models/client.model');
const Lead = require('../models/lead.model');
const CrmActivity = require('../models/crmActivity.model');
const mongoose = require('mongoose');
const logger = require('../utils/logger');

/**
 * Customer Health Scoring Service
 *
 * Tracks and predicts customer (firm) health based on usage, financial,
 * engagement, and contract factors to identify churn risk and expansion opportunities.
 *
 * Based on patterns from:
 * - hrPredictions.service.js (scoring methodology)
 * - leadScoring.service.js (multi-factor weighted scoring)
 */

// Assume CustomerHealthScore model exists with this schema structure
const CustomerHealthScore = mongoose.model('CustomerHealthScore', new mongoose.Schema({
    firmId: { type: mongoose.Schema.Types.ObjectId, ref: 'Firm', required: true, unique: true, index: true },

    // Overall Score (0-100)
    totalScore: { type: Number, default: 0, min: 0, max: 100 },

    // Component Scores
    scores: {
        usage: { type: Number, default: 0 },
        financial: { type: Number, default: 0 },
        engagement: { type: Number, default: 0 },
        contract: { type: Number, default: 0 }
    },

    // Detailed Breakdown
    breakdown: {
        usage: {
            loginFrequency: { score: Number, value: Number, reason: String },
            featureAdoption: { score: Number, value: Number, reason: String },
            seatUtilization: { score: Number, value: Number, reason: String },
            caseActivity: { score: Number, value: Number, reason: String }
        },
        financial: {
            paymentHistory: { score: Number, value: String, reason: String },
            overdueRate: { score: Number, value: Number, reason: String },
            revenueGrowth: { score: Number, value: Number, reason: String },
            lifetimeValue: { score: Number, value: Number, reason: String }
        },
        engagement: {
            supportTickets: { score: Number, value: Number, reason: String },
            featureRequests: { score: Number, value: Number, reason: String },
            userActivity: { score: Number, value: Number, reason: String },
            feedbackScore: { score: Number, value: Number, reason: String }
        },
        contract: {
            tenure: { score: Number, value: Number, reason: String },
            renewalProximity: { score: Number, value: Number, reason: String },
            planTier: { score: Number, value: String, reason: String },
            expansionHistory: { score: Number, value: Number, reason: String }
        }
    },

    // Risk Classification
    riskTier: {
        type: String,
        enum: ['healthy', 'warning', 'atRisk', 'critical'],
        default: 'healthy'
    },

    // Predictions
    churnProbability: { type: Number, default: 0, min: 0, max: 100 },
    predictedChurnDate: Date,

    // Risk Factors
    topRiskFactors: [{
        factor: String,
        severity: { type: String, enum: ['low', 'medium', 'high', 'critical'] },
        description: String,
        recommendation: String
    }],

    // Trend Analysis
    trend: {
        direction: { type: String, enum: ['improving', 'stable', 'declining'], default: 'stable' },
        changePercent: { type: Number, default: 0 },
        previousScore: Number,
        calculatedAt: Date
    },

    // Data Quality
    dataQuality: {
        score: { type: Number, default: 0 },
        completeness: { type: Number, default: 0 },
        missingFields: [String],
        lastUpdated: Date
    },

    // Calculation Metadata
    lastCalculatedAt: { type: Date, default: Date.now },
    nextCalculationAt: Date,
    calculationCount: { type: Number, default: 0 },

    // Historical Tracking
    history: [{
        score: Number,
        riskTier: String,
        calculatedAt: { type: Date, default: Date.now },
        triggeredBy: String
    }]
}, {
    timestamps: true,
    versionKey: false
}));

class CustomerHealthService {
    // ═══════════════════════════════════════════════════════════════
    // CORE SCORING METHODS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Calculate complete health score for a firm
     * @param {ObjectId} firmId - Firm ID
     * @returns {Object} Complete health score data
     */
    static async calculateHealthScore(firmId) {
        try {
            logger.info(`Calculating health score for firm ${firmId}`);

            const firm = await Firm.findById(firmId);
            if (!firm) {
                throw new Error('Firm not found');
            }

            // Get or create health score record
            let healthScore = await CustomerHealthScore.findOne({ firmId });
            if (!healthScore) {
                healthScore = new CustomerHealthScore({ firmId });
            }

            // Store previous score for trend analysis
            const previousScore = healthScore.totalScore;

            // Calculate each component score
            const usageScore = await this.calculateUsageScore(firmId);
            const financialScore = await this.calculateFinancialScore(firmId);
            const engagementScore = await this.calculateEngagementScore(firmId);
            const contractScore = await this.calculateContractScore(firmId);

            // Store component scores
            healthScore.scores.usage = usageScore.score;
            healthScore.scores.financial = financialScore.score;
            healthScore.scores.engagement = engagementScore.score;
            healthScore.scores.contract = contractScore.score;

            // Store detailed breakdowns
            healthScore.breakdown.usage = usageScore.factors;
            healthScore.breakdown.financial = financialScore.factors;
            healthScore.breakdown.engagement = engagementScore.factors;
            healthScore.breakdown.contract = contractScore.factors;

            // Calculate weighted total score
            // Usage: 40%, Financial: 25%, Engagement: 20%, Contract: 15%
            const weights = {
                usage: 0.40,
                financial: 0.25,
                engagement: 0.20,
                contract: 0.15
            };

            const totalScore = (
                usageScore.score * weights.usage +
                financialScore.score * weights.financial +
                engagementScore.score * weights.engagement +
                contractScore.score * weights.contract
            );

            healthScore.totalScore = Math.round(Math.min(100, Math.max(0, totalScore)));

            // Determine risk tier
            healthScore.riskTier = this.determineRiskTier(healthScore.totalScore);

            // Predict churn probability
            const churnData = await this.predictChurnProbability({
                totalScore: healthScore.totalScore,
                usageScore: usageScore.score,
                financialScore: financialScore.score,
                engagementScore: engagementScore.score,
                contractScore: contractScore.score,
                breakdown: healthScore.breakdown
            });
            healthScore.churnProbability = churnData.probability;
            healthScore.predictedChurnDate = churnData.predictedDate;

            // Identify top risk factors
            healthScore.topRiskFactors = this.identifyTopRiskFactors({
                usage: usageScore,
                financial: financialScore,
                engagement: engagementScore,
                contract: contractScore
            });

            // Calculate trend
            const trendData = await this.calculateTrend(firmId, 30);
            healthScore.trend = {
                direction: trendData.direction,
                changePercent: trendData.changePercent,
                previousScore: previousScore,
                calculatedAt: new Date()
            };

            // Assess data quality
            const dataQualityData = this.getDataQuality({
                usage: usageScore,
                financial: financialScore,
                engagement: engagementScore,
                contract: contractScore
            });
            healthScore.dataQuality = dataQualityData;

            // Update calculation metadata
            healthScore.lastCalculatedAt = new Date();
            healthScore.calculationCount += 1;
            healthScore.nextCalculationAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // Next day

            // Add to history
            healthScore.history.push({
                score: healthScore.totalScore,
                riskTier: healthScore.riskTier,
                calculatedAt: new Date(),
                triggeredBy: 'scheduled'
            });

            // Keep only last 90 history entries
            if (healthScore.history.length > 90) {
                healthScore.history = healthScore.history.slice(-90);
            }

            await healthScore.save();

            logger.info(`Health score calculated for firm ${firmId}: ${healthScore.totalScore} (${healthScore.riskTier})`);

            return healthScore;
        } catch (error) {
            logger.error(`Error calculating health score for firm ${firmId}:`, error);
            throw error;
        }
    }

    /**
     * Calculate usage score
     * Login frequency, feature adoption, seat utilization
     * @param {ObjectId} firmId - Firm ID
     * @returns {Object} Usage score and factors
     */
    static async calculateUsageScore(firmId) {
        const factors = {
            loginFrequency: { score: 0, value: 0, reason: '' },
            featureAdoption: { score: 0, value: 0, reason: '' },
            seatUtilization: { score: 0, value: 0, reason: '' },
            caseActivity: { score: 0, value: 0, reason: '' }
        };

        try {
            // 1. Login Frequency (30% weight)
            const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            const teamMembers = await Firm.findById(firmId).select('teamMembers');
            const activeUserIds = teamMembers?.teamMembers
                ?.filter(tm => tm.status === 'active')
                .map(tm => tm.userId) || [];

            let loginCount = 0;
            if (activeUserIds.length > 0) {
                const users = await User.find({
                    _id: { $in: activeUserIds },
                    lastLoginAt: { $gte: thirtyDaysAgo }
                });
                loginCount = users.length;
            }

            const loginRate = activeUserIds.length > 0 ? (loginCount / activeUserIds.length) * 100 : 0;
            factors.loginFrequency.value = Math.round(loginRate);

            if (loginRate >= 80) {
                factors.loginFrequency.score = 100;
                factors.loginFrequency.reason = `Excellent: ${loginCount}/${activeUserIds.length} users active`;
            } else if (loginRate >= 60) {
                factors.loginFrequency.score = 80;
                factors.loginFrequency.reason = `Good: ${loginCount}/${activeUserIds.length} users active`;
            } else if (loginRate >= 40) {
                factors.loginFrequency.score = 60;
                factors.loginFrequency.reason = `Moderate: ${loginCount}/${activeUserIds.length} users active`;
            } else if (loginRate >= 20) {
                factors.loginFrequency.score = 40;
                factors.loginFrequency.reason = `Low: ${loginCount}/${activeUserIds.length} users active`;
            } else {
                factors.loginFrequency.score = 20;
                factors.loginFrequency.reason = `Critical: Only ${loginCount}/${activeUserIds.length} users active`;
            }

            // 2. Feature Adoption (25% weight)
            const caseCount = await Case.countDocuments({ firmId });
            const clientCount = await Client.countDocuments({ firmId });
            const leadCount = await Lead.countDocuments({ firmId });
            const invoiceCount = await Invoice.countDocuments({ firmId });

            const featuresUsed = [
                caseCount > 0,
                clientCount > 0,
                leadCount > 0,
                invoiceCount > 0
            ].filter(Boolean).length;

            const adoptionRate = (featuresUsed / 4) * 100;
            factors.featureAdoption.value = featuresUsed;

            if (featuresUsed >= 4) {
                factors.featureAdoption.score = 100;
                factors.featureAdoption.reason = 'Using all core features';
            } else if (featuresUsed >= 3) {
                factors.featureAdoption.score = 75;
                factors.featureAdoption.reason = `Using ${featuresUsed}/4 core features`;
            } else if (featuresUsed >= 2) {
                factors.featureAdoption.score = 50;
                factors.featureAdoption.reason = `Using ${featuresUsed}/4 core features`;
            } else if (featuresUsed >= 1) {
                factors.featureAdoption.score = 30;
                factors.featureAdoption.reason = `Only using ${featuresUsed}/4 core features`;
            } else {
                factors.featureAdoption.score = 0;
                factors.featureAdoption.reason = 'Not using any core features';
            }

            // 3. Seat Utilization (25% weight)
            const subscription = await Subscription.findOne({ firmId });
            const totalSeats = subscription?.usage?.users || activeUserIds.length;
            const utilizationRate = totalSeats > 0 ? (activeUserIds.length / totalSeats) * 100 : 100;
            factors.seatUtilization.value = Math.round(utilizationRate);

            if (utilizationRate >= 90) {
                factors.seatUtilization.score = 100;
                factors.seatUtilization.reason = `High utilization: ${activeUserIds.length}/${totalSeats} seats used`;
            } else if (utilizationRate >= 70) {
                factors.seatUtilization.score = 85;
                factors.seatUtilization.reason = `Good utilization: ${activeUserIds.length}/${totalSeats} seats used`;
            } else if (utilizationRate >= 50) {
                factors.seatUtilization.score = 60;
                factors.seatUtilization.reason = `Moderate utilization: ${activeUserIds.length}/${totalSeats} seats used`;
            } else {
                factors.seatUtilization.score = 30;
                factors.seatUtilization.reason = `Low utilization: ${activeUserIds.length}/${totalSeats} seats used`;
            }

            // 4. Case Activity (20% weight)
            const recentCases = await Case.countDocuments({
                firmId,
                updatedAt: { $gte: thirtyDaysAgo }
            });
            factors.caseActivity.value = recentCases;

            if (recentCases >= 20) {
                factors.caseActivity.score = 100;
                factors.caseActivity.reason = `Very active: ${recentCases} cases updated recently`;
            } else if (recentCases >= 10) {
                factors.caseActivity.score = 80;
                factors.caseActivity.reason = `Active: ${recentCases} cases updated recently`;
            } else if (recentCases >= 5) {
                factors.caseActivity.score = 60;
                factors.caseActivity.reason = `Moderate: ${recentCases} cases updated recently`;
            } else if (recentCases >= 1) {
                factors.caseActivity.score = 40;
                factors.caseActivity.reason = `Low: Only ${recentCases} cases updated recently`;
            } else {
                factors.caseActivity.score = 0;
                factors.caseActivity.reason = 'No recent case activity';
            }

            // Calculate weighted score
            const weights = { loginFrequency: 30, featureAdoption: 25, seatUtilization: 25, caseActivity: 20 };
            const score = Math.round(
                (factors.loginFrequency.score * weights.loginFrequency +
                 factors.featureAdoption.score * weights.featureAdoption +
                 factors.seatUtilization.score * weights.seatUtilization +
                 factors.caseActivity.score * weights.caseActivity) / 100
            );

            return { score, factors };
        } catch (error) {
            logger.error(`Error calculating usage score for firm ${firmId}:`, error);
            return { score: 50, factors }; // Default score on error
        }
    }

    /**
     * Calculate financial score
     * Payment history, overdue rate, revenue trends
     * @param {ObjectId} firmId - Firm ID
     * @returns {Object} Financial score and factors
     */
    static async calculateFinancialScore(firmId) {
        const factors = {
            paymentHistory: { score: 0, value: '', reason: '' },
            overdueRate: { score: 0, value: 0, reason: '' },
            revenueGrowth: { score: 0, value: 0, reason: '' },
            lifetimeValue: { score: 0, value: 0, reason: '' }
        };

        try {
            const subscription = await Subscription.findOne({ firmId });
            if (!subscription) {
                factors.paymentHistory.reason = 'No subscription found';
                factors.overdueRate.reason = 'No subscription found';
                factors.revenueGrowth.reason = 'No subscription found';
                factors.lifetimeValue.reason = 'No subscription found';
                return { score: 50, factors };
            }

            // 1. Payment History (35% weight)
            const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
            const payments = await Payment.find({
                firmId,
                paymentDate: { $gte: sixMonthsAgo }
            });

            const totalPayments = payments.length;
            const successfulPayments = payments.filter(p => p.status === 'completed' || p.status === 'reconciled').length;
            const paymentSuccessRate = totalPayments > 0 ? (successfulPayments / totalPayments) * 100 : 100;

            factors.paymentHistory.value = totalPayments > 0 ? `${successfulPayments}/${totalPayments}` : 'No payments';

            if (paymentSuccessRate === 100 && totalPayments >= 3) {
                factors.paymentHistory.score = 100;
                factors.paymentHistory.reason = `Perfect payment history (${successfulPayments}/${totalPayments})`;
            } else if (paymentSuccessRate >= 90) {
                factors.paymentHistory.score = 85;
                factors.paymentHistory.reason = `Excellent payment history (${successfulPayments}/${totalPayments})`;
            } else if (paymentSuccessRate >= 75) {
                factors.paymentHistory.score = 70;
                factors.paymentHistory.reason = `Good payment history (${successfulPayments}/${totalPayments})`;
            } else if (paymentSuccessRate >= 50) {
                factors.paymentHistory.score = 50;
                factors.paymentHistory.reason = `Inconsistent payments (${successfulPayments}/${totalPayments})`;
            } else {
                factors.paymentHistory.score = 20;
                factors.paymentHistory.reason = `Poor payment history (${successfulPayments}/${totalPayments})`;
            }

            // 2. Overdue Rate (30% weight)
            const invoices = await Invoice.find({ firmId });
            const overdueInvoices = invoices.filter(inv => {
                return inv.status === 'overdue' || (inv.dueDate && new Date(inv.dueDate) < new Date() && inv.status !== 'paid');
            });

            const overdueRate = invoices.length > 0 ? (overdueInvoices.length / invoices.length) * 100 : 0;
            factors.overdueRate.value = Math.round(overdueRate);

            if (overdueRate === 0) {
                factors.overdueRate.score = 100;
                factors.overdueRate.reason = 'No overdue invoices';
            } else if (overdueRate <= 10) {
                factors.overdueRate.score = 80;
                factors.overdueRate.reason = `Low overdue rate (${Math.round(overdueRate)}%)`;
            } else if (overdueRate <= 25) {
                factors.overdueRate.score = 60;
                factors.overdueRate.reason = `Moderate overdue rate (${Math.round(overdueRate)}%)`;
            } else if (overdueRate <= 50) {
                factors.overdueRate.score = 30;
                factors.overdueRate.reason = `High overdue rate (${Math.round(overdueRate)}%)`;
            } else {
                factors.overdueRate.score = 10;
                factors.overdueRate.reason = `Critical overdue rate (${Math.round(overdueRate)}%)`;
            }

            // 3. Revenue Growth (20% weight)
            const threeMonthsAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
            const sixMonthsAgoDate = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);

            const recentRevenue = await this._calculateRevenue(firmId, threeMonthsAgo, new Date());
            const previousRevenue = await this._calculateRevenue(firmId, sixMonthsAgoDate, threeMonthsAgo);

            let growthRate = 0;
            if (previousRevenue > 0) {
                growthRate = ((recentRevenue - previousRevenue) / previousRevenue) * 100;
            }
            factors.revenueGrowth.value = Math.round(growthRate);

            if (growthRate >= 20) {
                factors.revenueGrowth.score = 100;
                factors.revenueGrowth.reason = `Strong growth (${Math.round(growthRate)}%)`;
            } else if (growthRate >= 10) {
                factors.revenueGrowth.score = 85;
                factors.revenueGrowth.reason = `Good growth (${Math.round(growthRate)}%)`;
            } else if (growthRate >= 0) {
                factors.revenueGrowth.score = 70;
                factors.revenueGrowth.reason = `Stable (${Math.round(growthRate)}%)`;
            } else if (growthRate >= -10) {
                factors.revenueGrowth.score = 50;
                factors.revenueGrowth.reason = `Slight decline (${Math.round(growthRate)}%)`;
            } else {
                factors.revenueGrowth.score = 20;
                factors.revenueGrowth.reason = `Declining (${Math.round(growthRate)}%)`;
            }

            // 4. Lifetime Value (15% weight)
            const allPayments = await Payment.find({
                firmId,
                status: { $in: ['completed', 'reconciled'] }
            });
            const lifetimeValue = allPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
            factors.lifetimeValue.value = Math.round(lifetimeValue);

            if (lifetimeValue >= 50000) {
                factors.lifetimeValue.score = 100;
                factors.lifetimeValue.reason = `High value customer (${Math.round(lifetimeValue)} SAR)`;
            } else if (lifetimeValue >= 20000) {
                factors.lifetimeValue.score = 85;
                factors.lifetimeValue.reason = `Good value customer (${Math.round(lifetimeValue)} SAR)`;
            } else if (lifetimeValue >= 10000) {
                factors.lifetimeValue.score = 70;
                factors.lifetimeValue.reason = `Moderate value (${Math.round(lifetimeValue)} SAR)`;
            } else if (lifetimeValue >= 5000) {
                factors.lifetimeValue.score = 50;
                factors.lifetimeValue.reason = `Growing customer (${Math.round(lifetimeValue)} SAR)`;
            } else {
                factors.lifetimeValue.score = 30;
                factors.lifetimeValue.reason = `New/low value (${Math.round(lifetimeValue)} SAR)`;
            }

            // Calculate weighted score
            const weights = { paymentHistory: 35, overdueRate: 30, revenueGrowth: 20, lifetimeValue: 15 };
            const score = Math.round(
                (factors.paymentHistory.score * weights.paymentHistory +
                 factors.overdueRate.score * weights.overdueRate +
                 factors.revenueGrowth.score * weights.revenueGrowth +
                 factors.lifetimeValue.score * weights.lifetimeValue) / 100
            );

            return { score, factors };
        } catch (error) {
            logger.error(`Error calculating financial score for firm ${firmId}:`, error);
            return { score: 50, factors };
        }
    }

    /**
     * Calculate engagement score
     * Support tickets, feature requests, user activity
     * @param {ObjectId} firmId - Firm ID
     * @returns {Object} Engagement score and factors
     */
    static async calculateEngagementScore(firmId) {
        const factors = {
            supportTickets: { score: 0, value: 0, reason: '' },
            featureRequests: { score: 0, value: 0, reason: '' },
            userActivity: { score: 0, value: 0, reason: '' },
            feedbackScore: { score: 0, value: 0, reason: '' }
        };

        try {
            const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

            // 1. Support Tickets (30% weight)
            // Fewer support tickets = better (unless it means they're not engaged)
            // We'll check for a balanced approach
            const supportTickets = await CrmActivity.countDocuments({
                entityType: 'firm',
                entityId: firmId,
                type: 'note',
                'noteData.category': 'support',
                createdAt: { $gte: thirtyDaysAgo }
            });

            factors.supportTickets.value = supportTickets;

            if (supportTickets === 0) {
                factors.supportTickets.score = 85; // Good, but could mean low engagement
                factors.supportTickets.reason = 'No support tickets (stable or disengaged)';
            } else if (supportTickets <= 2) {
                factors.supportTickets.score = 100; // Perfect - some engagement, few issues
                factors.supportTickets.reason = `Minimal support needed (${supportTickets} tickets)`;
            } else if (supportTickets <= 5) {
                factors.supportTickets.score = 75;
                factors.supportTickets.reason = `Moderate support usage (${supportTickets} tickets)`;
            } else if (supportTickets <= 10) {
                factors.supportTickets.score = 50;
                factors.supportTickets.reason = `High support usage (${supportTickets} tickets)`;
            } else {
                factors.supportTickets.score = 25;
                factors.supportTickets.reason = `Very high support usage (${supportTickets} tickets)`;
            }

            // 2. Feature Requests (25% weight)
            // More feature requests = higher engagement (they care about product)
            const featureRequests = await CrmActivity.countDocuments({
                entityType: 'firm',
                entityId: firmId,
                type: 'note',
                'noteData.category': 'feature_request',
                createdAt: { $gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } // Last 90 days
            });

            factors.featureRequests.value = featureRequests;

            if (featureRequests >= 5) {
                factors.featureRequests.score = 100;
                factors.featureRequests.reason = `Highly engaged (${featureRequests} feature requests)`;
            } else if (featureRequests >= 3) {
                factors.featureRequests.score = 85;
                factors.featureRequests.reason = `Good engagement (${featureRequests} feature requests)`;
            } else if (featureRequests >= 1) {
                factors.featureRequests.score = 70;
                factors.featureRequests.reason = `Some engagement (${featureRequests} feature requests)`;
            } else {
                factors.featureRequests.score = 50;
                factors.featureRequests.reason = 'No feature requests (may indicate low engagement)';
            }

            // 3. User Activity (30% weight)
            const teamMembers = await Firm.findById(firmId).select('teamMembers');
            const activeUserIds = teamMembers?.teamMembers
                ?.filter(tm => tm.status === 'active')
                .map(tm => tm.userId) || [];

            let recentActivityCount = 0;
            if (activeUserIds.length > 0) {
                recentActivityCount = await CrmActivity.countDocuments({
                    userId: { $in: activeUserIds },
                    createdAt: { $gte: thirtyDaysAgo }
                });
            }

            const activityPerUser = activeUserIds.length > 0 ? recentActivityCount / activeUserIds.length : 0;
            factors.userActivity.value = Math.round(activityPerUser);

            if (activityPerUser >= 50) {
                factors.userActivity.score = 100;
                factors.userActivity.reason = `Very active (${Math.round(activityPerUser)} actions/user)`;
            } else if (activityPerUser >= 30) {
                factors.userActivity.score = 85;
                factors.userActivity.reason = `Active (${Math.round(activityPerUser)} actions/user)`;
            } else if (activityPerUser >= 15) {
                factors.userActivity.score = 70;
                factors.userActivity.reason = `Moderate activity (${Math.round(activityPerUser)} actions/user)`;
            } else if (activityPerUser >= 5) {
                factors.userActivity.score = 50;
                factors.userActivity.reason = `Low activity (${Math.round(activityPerUser)} actions/user)`;
            } else {
                factors.userActivity.score = 25;
                factors.userActivity.reason = `Very low activity (${Math.round(activityPerUser)} actions/user)`;
            }

            // 4. Feedback Score (15% weight)
            // This would typically come from NPS surveys or satisfaction ratings
            // For now, we'll use a placeholder based on available data
            const feedbackActivities = await CrmActivity.find({
                entityType: 'firm',
                entityId: firmId,
                type: 'note',
                'noteData.category': 'feedback',
                createdAt: { $gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) }
            });

            const positiveFeedback = feedbackActivities.filter(
                f => f.noteData?.sentiment === 'positive'
            ).length;

            factors.feedbackScore.value = feedbackActivities.length;

            if (feedbackActivities.length === 0) {
                factors.feedbackScore.score = 60; // Neutral - no feedback
                factors.feedbackScore.reason = 'No recent feedback';
            } else {
                const positiveRate = (positiveFeedback / feedbackActivities.length) * 100;
                if (positiveRate >= 80) {
                    factors.feedbackScore.score = 100;
                    factors.feedbackScore.reason = `Very positive (${Math.round(positiveRate)}% positive)`;
                } else if (positiveRate >= 60) {
                    factors.feedbackScore.score = 80;
                    factors.feedbackScore.reason = `Mostly positive (${Math.round(positiveRate)}% positive)`;
                } else if (positiveRate >= 40) {
                    factors.feedbackScore.score = 60;
                    factors.feedbackScore.reason = `Mixed feedback (${Math.round(positiveRate)}% positive)`;
                } else {
                    factors.feedbackScore.score = 30;
                    factors.feedbackScore.reason = `Mostly negative (${Math.round(positiveRate)}% positive)`;
                }
            }

            // Calculate weighted score
            const weights = { supportTickets: 30, featureRequests: 25, userActivity: 30, feedbackScore: 15 };
            const score = Math.round(
                (factors.supportTickets.score * weights.supportTickets +
                 factors.featureRequests.score * weights.featureRequests +
                 factors.userActivity.score * weights.userActivity +
                 factors.feedbackScore.score * weights.feedbackScore) / 100
            );

            return { score, factors };
        } catch (error) {
            logger.error(`Error calculating engagement score for firm ${firmId}:`, error);
            return { score: 50, factors };
        }
    }

    /**
     * Calculate contract score
     * Tenure, renewal proximity, plan tier
     * @param {ObjectId} firmId - Firm ID
     * @returns {Object} Contract score and factors
     */
    static async calculateContractScore(firmId) {
        const factors = {
            tenure: { score: 0, value: 0, reason: '' },
            renewalProximity: { score: 0, value: 0, reason: '' },
            planTier: { score: 0, value: '', reason: '' },
            expansionHistory: { score: 0, value: 0, reason: '' }
        };

        try {
            const subscription = await Subscription.findOne({ firmId });
            const firm = await Firm.findById(firmId);

            if (!subscription || !firm) {
                factors.tenure.reason = 'No subscription data';
                factors.renewalProximity.reason = 'No subscription data';
                factors.planTier.reason = 'No subscription data';
                factors.expansionHistory.reason = 'No subscription data';
                return { score: 50, factors };
            }

            // 1. Tenure (30% weight)
            const firmAge = Math.floor((Date.now() - firm.createdAt.getTime()) / (1000 * 60 * 60 * 24));
            const tenureMonths = Math.floor(firmAge / 30);
            factors.tenure.value = tenureMonths;

            if (tenureMonths >= 24) {
                factors.tenure.score = 100;
                factors.tenure.reason = `Long-term customer (${tenureMonths} months)`;
            } else if (tenureMonths >= 12) {
                factors.tenure.score = 85;
                factors.tenure.reason = `Established customer (${tenureMonths} months)`;
            } else if (tenureMonths >= 6) {
                factors.tenure.score = 70;
                factors.tenure.reason = `Growing relationship (${tenureMonths} months)`;
            } else if (tenureMonths >= 3) {
                factors.tenure.score = 55;
                factors.tenure.reason = `New customer (${tenureMonths} months)`;
            } else {
                factors.tenure.score = 40;
                factors.tenure.reason = `Very new customer (${tenureMonths} months)`;
            }

            // 2. Renewal Proximity (35% weight)
            // Risk increases as renewal approaches
            const daysUntilRenewal = subscription.currentPeriodEnd
                ? Math.floor((subscription.currentPeriodEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                : 999;
            factors.renewalProximity.value = daysUntilRenewal;

            if (daysUntilRenewal > 90) {
                factors.renewalProximity.score = 100;
                factors.renewalProximity.reason = `Safe renewal window (${daysUntilRenewal} days)`;
            } else if (daysUntilRenewal > 60) {
                factors.renewalProximity.score = 85;
                factors.renewalProximity.reason = `Approaching renewal (${daysUntilRenewal} days)`;
            } else if (daysUntilRenewal > 30) {
                factors.renewalProximity.score = 65;
                factors.renewalProximity.reason = `Renewal coming soon (${daysUntilRenewal} days)`;
            } else if (daysUntilRenewal > 0) {
                factors.renewalProximity.score = 40;
                factors.renewalProximity.reason = `Critical renewal period (${daysUntilRenewal} days)`;
            } else {
                factors.renewalProximity.score = 20;
                factors.renewalProximity.reason = subscription.status === 'canceled'
                    ? 'Subscription canceled'
                    : 'Renewal overdue';
            }

            // 3. Plan Tier (25% weight)
            const planTier = subscription.planId;
            factors.planTier.value = planTier;

            const planScores = {
                'enterprise': 100,
                'professional': 80,
                'starter': 60,
                'free': 30
            };

            factors.planTier.score = planScores[planTier] || 50;
            factors.planTier.reason = `${planTier.charAt(0).toUpperCase() + planTier.slice(1)} plan`;

            // 4. Expansion History (10% weight)
            // Check if they've upgraded plans (this would require historical tracking)
            // For now, we'll use a simple check based on current plan vs tenure
            let expansionScore = 50; // Default

            if (planTier === 'enterprise' && tenureMonths < 12) {
                expansionScore = 100; // Quick upgrade to enterprise
                factors.expansionHistory.reason = 'Rapid expansion to enterprise';
            } else if (planTier === 'professional' && tenureMonths < 6) {
                expansionScore = 90;
                factors.expansionHistory.reason = 'Quick upgrade to professional';
            } else if (planTier === 'enterprise' || planTier === 'professional') {
                expansionScore = 80;
                factors.expansionHistory.reason = 'Premium tier customer';
            } else if (planTier === 'starter' && tenureMonths > 6) {
                expansionScore = 40; // Haven't upgraded despite tenure
                factors.expansionHistory.reason = 'No expansion despite tenure';
            } else if (planTier === 'free' && tenureMonths > 3) {
                expansionScore = 20; // Still on free plan
                factors.expansionHistory.reason = 'No paid conversion';
            } else {
                expansionScore = 60;
                factors.expansionHistory.reason = 'Standard growth pattern';
            }

            factors.expansionHistory.score = expansionScore;
            factors.expansionHistory.value = planTier === 'free' ? 0 : 1;

            // Calculate weighted score
            const weights = { tenure: 30, renewalProximity: 35, planTier: 25, expansionHistory: 10 };
            const score = Math.round(
                (factors.tenure.score * weights.tenure +
                 factors.renewalProximity.score * weights.renewalProximity +
                 factors.planTier.score * weights.planTier +
                 factors.expansionHistory.score * weights.expansionHistory) / 100
            );

            return { score, factors };
        } catch (error) {
            logger.error(`Error calculating contract score for firm ${firmId}:`, error);
            return { score: 50, factors };
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // HELPER METHODS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Determine risk tier based on health score
     * @param {Number} healthScore - Overall health score (0-100)
     * @returns {String} Risk tier: healthy, warning, atRisk, critical
     */
    static determineRiskTier(healthScore) {
        if (healthScore >= 75) return 'healthy';
        if (healthScore >= 50) return 'warning';
        if (healthScore >= 25) return 'atRisk';
        return 'critical';
    }

    /**
     * Predict churn probability
     * @param {Object} data - Scoring data
     * @returns {Object} Churn prediction with probability and estimated date
     */
    static async predictChurnProbability(data) {
        try {
            let probability = 100 - data.totalScore; // Base inverse relationship

            // Adjust based on specific risk factors
            if (data.financialScore < 40) {
                probability += 15; // Financial issues increase churn risk
            }
            if (data.usageScore < 30) {
                probability += 20; // Low usage is a strong churn indicator
            }
            if (data.engagementScore < 40) {
                probability += 10; // Low engagement increases risk
            }
            if (data.contractScore < 50) {
                probability += 10; // Contract issues increase risk
            }

            // Check for specific critical factors
            if (data.breakdown?.usage?.loginFrequency?.score < 30) {
                probability += 15; // Very low logins = high churn risk
            }
            if (data.breakdown?.financial?.overdueRate?.value > 50) {
                probability += 20; // High overdue rate = payment issues
            }

            // Cap at 100
            probability = Math.min(100, Math.max(0, probability));

            // Predict churn date based on probability
            let daysUntilChurn = 365; // Default 1 year
            if (probability >= 80) {
                daysUntilChurn = 30; // 1 month
            } else if (probability >= 60) {
                daysUntilChurn = 90; // 3 months
            } else if (probability >= 40) {
                daysUntilChurn = 180; // 6 months
            }

            const predictedDate = new Date(Date.now() + daysUntilChurn * 24 * 60 * 60 * 1000);

            return {
                probability: Math.round(probability),
                predictedDate,
                confidence: probability >= 70 ? 'high' : probability >= 40 ? 'medium' : 'low'
            };
        } catch (error) {
            logger.error('Error predicting churn probability:', error);
            return { probability: 50, predictedDate: null, confidence: 'low' };
        }
    }

    /**
     * Identify top risk factors with recommendations
     * @param {Object} data - All component scores
     * @returns {Array} Top 3-5 risk factors with recommendations
     */
    static identifyTopRiskFactors(data) {
        const allFactors = [];

        // Collect all factors from all components
        const components = ['usage', 'financial', 'engagement', 'contract'];

        components.forEach(component => {
            const componentData = data[component];
            if (!componentData || !componentData.factors) return;

            Object.entries(componentData.factors).forEach(([factorName, factorData]) => {
                if (factorData.score < 60) { // Only consider low-scoring factors
                    allFactors.push({
                        factor: `${component}.${factorName}`,
                        severity: factorData.score < 30 ? 'critical' : factorData.score < 50 ? 'high' : 'medium',
                        score: factorData.score,
                        description: factorData.reason || 'No details available',
                        recommendation: this._getRecommendation(component, factorName, factorData)
                    });
                }
            });
        });

        // Sort by score (lowest first) and take top 5
        allFactors.sort((a, b) => a.score - b.score);
        return allFactors.slice(0, 5);
    }

    /**
     * Get recommendation for a specific risk factor
     * @private
     */
    static _getRecommendation(component, factorName, factorData) {
        const recommendations = {
            usage: {
                loginFrequency: 'Conduct user training sessions and send re-engagement emails',
                featureAdoption: 'Provide onboarding assistance and feature demonstrations',
                seatUtilization: 'Review seat allocation and consider downsizing or upselling',
                caseActivity: 'Check in with customer to understand usage patterns'
            },
            financial: {
                paymentHistory: 'Reach out to discuss payment issues and offer payment plans',
                overdueRate: 'Send payment reminders and consider automated billing',
                revenueGrowth: 'Explore upsell opportunities and review pricing fit',
                lifetimeValue: 'Focus on demonstrating ROI and value realization'
            },
            engagement: {
                supportTickets: 'Review ticket patterns for product issues or training needs',
                featureRequests: 'Engage customer in product roadmap discussions',
                userActivity: 'Schedule check-in call to understand low engagement',
                feedbackScore: 'Address negative feedback immediately with action plan'
            },
            contract: {
                tenure: 'New customers need extra attention during onboarding',
                renewalProximity: 'Start renewal conversations early with value review',
                planTier: 'Discuss upgrade path and premium features',
                expansionHistory: 'Present expansion opportunities based on usage'
            }
        };

        return recommendations[component]?.[factorName] || 'Schedule customer success check-in';
    }

    /**
     * Calculate trend (improving/stable/declining)
     * @param {ObjectId} firmId - Firm ID
     * @param {Number} days - Days to look back
     * @returns {Object} Trend data
     */
    static async calculateTrend(firmId, days = 30) {
        try {
            const healthScore = await CustomerHealthScore.findOne({ firmId });
            if (!healthScore || !healthScore.history || healthScore.history.length < 2) {
                return { direction: 'stable', changePercent: 0, reason: 'Insufficient history' };
            }

            const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
            const recentHistory = healthScore.history
                .filter(h => h.calculatedAt >= cutoffDate)
                .sort((a, b) => a.calculatedAt - b.calculatedAt);

            if (recentHistory.length < 2) {
                return { direction: 'stable', changePercent: 0, reason: 'Insufficient recent history' };
            }

            const oldestScore = recentHistory[0].score;
            const newestScore = recentHistory[recentHistory.length - 1].score;
            const changePercent = oldestScore > 0 ? ((newestScore - oldestScore) / oldestScore) * 100 : 0;

            let direction = 'stable';
            if (changePercent > 5) direction = 'improving';
            else if (changePercent < -5) direction = 'declining';

            return {
                direction,
                changePercent: Math.round(changePercent * 10) / 10,
                reason: `Score changed from ${oldestScore} to ${newestScore} over ${days} days`
            };
        } catch (error) {
            logger.error(`Error calculating trend for firm ${firmId}:`, error);
            return { direction: 'stable', changePercent: 0, reason: 'Error calculating trend' };
        }
    }

    /**
     * Assess data quality
     * @param {Object} components - All component scores
     * @returns {Object} Data quality assessment
     */
    static getDataQuality(components) {
        const allFactors = [];
        const missingFields = [];
        let totalFactors = 0;
        let availableFactors = 0;

        // Check each component
        Object.entries(components).forEach(([componentName, componentData]) => {
            if (!componentData || !componentData.factors) return;

            Object.entries(componentData.factors).forEach(([factorName, factorData]) => {
                totalFactors++;

                if (factorData.value !== null && factorData.value !== undefined &&
                    factorData.value !== '' && factorData.value !== 0) {
                    availableFactors++;
                } else {
                    missingFields.push(`${componentName}.${factorName}`);
                }
            });
        });

        const completeness = totalFactors > 0 ? (availableFactors / totalFactors) * 100 : 0;
        let qualityScore = 0;

        if (completeness >= 90) qualityScore = 100;
        else if (completeness >= 75) qualityScore = 85;
        else if (completeness >= 60) qualityScore = 70;
        else if (completeness >= 40) qualityScore = 50;
        else qualityScore = 30;

        return {
            score: Math.round(qualityScore),
            completeness: Math.round(completeness),
            missingFields,
            lastUpdated: new Date()
        };
    }

    /**
     * Calculate revenue for a date range
     * @private
     */
    static async _calculateRevenue(firmId, startDate, endDate) {
        try {
            const payments = await Payment.find({
                firmId,
                paymentDate: { $gte: startDate, $lte: endDate },
                status: { $in: ['completed', 'reconciled'] }
            });

            return payments.reduce((sum, p) => sum + (p.amount || 0), 0);
        } catch (error) {
            logger.error('Error calculating revenue:', error);
            return 0;
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // BATCH METHODS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Calculate health scores for all firms
     * Used for scheduled jobs
     * @returns {Object} Summary of calculations
     */
    static async calculateAllHealthScores() {
        try {
            logger.info('Starting batch health score calculation for all firms');

            const firms = await Firm.find({}).select('_id name');
            const results = {
                total: firms.length,
                successful: 0,
                failed: 0,
                errors: []
            };

            for (const firm of firms) {
                try {
                    await this.calculateHealthScore(firm._id);
                    results.successful++;
                } catch (error) {
                    results.failed++;
                    results.errors.push({
                        firmId: firm._id,
                        firmName: firm.name,
                        error: error.message
                    });
                    logger.error(`Failed to calculate health score for firm ${firm._id}:`, error);
                }
            }

            logger.info(`Batch calculation complete: ${results.successful} successful, ${results.failed} failed`);
            return results;
        } catch (error) {
            logger.error('Error in batch health score calculation:', error);
            throw error;
        }
    }

    /**
     * Force recalculate for a single firm
     * @param {ObjectId} firmId - Firm ID
     * @returns {Object} Updated health score
     */
    static async recalculateForFirm(firmId) {
        try {
            logger.info(`Force recalculating health score for firm ${firmId}`);

            // Delete existing score to force fresh calculation
            await CustomerHealthScore.findOneAndDelete({ firmId });

            // Calculate new score
            const healthScore = await this.calculateHealthScore(firmId);

            logger.info(`Force recalculation complete for firm ${firmId}: ${healthScore.totalScore}`);
            return healthScore;
        } catch (error) {
            logger.error(`Error force recalculating for firm ${firmId}:`, error);
            throw error;
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // QUERY & REPORTING METHODS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Get health score for a specific firm
     * @param {ObjectId} firmId - Firm ID
     * @returns {Object} Health score data
     */
    static async getHealthScore(firmId) {
        try {
            let healthScore = await CustomerHealthScore.findOne({ firmId }).populate('firmId', 'name email');

            if (!healthScore) {
                // Calculate if doesn't exist
                healthScore = await this.calculateHealthScore(firmId);
            }

            return healthScore;
        } catch (error) {
            logger.error(`Error getting health score for firm ${firmId}:`, error);
            throw error;
        }
    }

    /**
     * Get all firms by risk tier
     * @param {String} riskTier - healthy, warning, atRisk, critical
     * @returns {Array} Firms in that risk tier
     */
    static async getFirmsByRiskTier(riskTier) {
        try {
            // ADMIN: bypassFirmFilter - super admin function to view all firms' health scores
            return await CustomerHealthScore.find({ riskTier })
                .populate('firmId', 'name email website')
                .sort({ totalScore: 1 }) // Lowest scores first
                .setOptions({ bypassFirmFilter: true })
                .lean();
        } catch (error) {
            logger.error(`Error getting firms by risk tier ${riskTier}:`, error);
            throw error;
        }
    }

    /**
     * Get at-risk customers summary
     * @returns {Object} Summary of at-risk and critical customers
     */
    static async getAtRiskSummary() {
        try {
            // ADMIN: bypassFirmFilter - super admin function to view all firms' health metrics
            const atRisk = await CustomerHealthScore.countDocuments({ riskTier: 'atRisk' });
            const critical = await CustomerHealthScore.countDocuments({ riskTier: 'critical' });
            const warning = await CustomerHealthScore.countDocuments({ riskTier: 'warning' });
            const healthy = await CustomerHealthScore.countDocuments({ riskTier: 'healthy' });

            const criticalCustomers = await CustomerHealthScore.find({ riskTier: 'critical' })
                .populate('firmId', 'name email')
                .sort({ totalScore: 1 })
                .limit(10)
                .setOptions({ bypassFirmFilter: true })
                .lean();

            return {
                summary: {
                    total: atRisk + critical + warning + healthy,
                    healthy,
                    warning,
                    atRisk,
                    critical
                },
                criticalCustomers,
                percentageAtRisk: ((atRisk + critical) / (atRisk + critical + warning + healthy)) * 100
            };
        } catch (error) {
            logger.error('Error getting at-risk summary:', error);
            throw error;
        }
    }

    /**
     * Get customers with declining trends
     * @param {Number} limit - Number of results
     * @returns {Array} Customers with declining health scores
     */
    static async getDecliningCustomers(limit = 20) {
        try {
            // ADMIN: bypassFirmFilter - super admin function to view declining customers across all firms
            return await CustomerHealthScore.find({
                'trend.direction': 'declining'
            })
                .populate('firmId', 'name email')
                .sort({ 'trend.changePercent': 1 }) // Most declining first
                .limit(limit)
                .setOptions({ bypassFirmFilter: true })
                .lean();
        } catch (error) {
            logger.error('Error getting declining customers:', error);
            throw error;
        }
    }

    /**
     * Get expansion opportunities
     * Healthy customers on lower tiers
     * @param {Number} limit - Number of results
     * @returns {Array} Expansion opportunities
     */
    static async getExpansionOpportunities(limit = 20) {
        try {
            // ADMIN: bypassFirmFilter - super admin function to view expansion opportunities across all firms
            return await CustomerHealthScore.find({
                riskTier: { $in: ['healthy', 'warning'] },
                totalScore: { $gte: 70 },
                'breakdown.contract.planTier.value': { $in: ['free', 'starter'] }
            })
                .populate('firmId', 'name email')
                .sort({ totalScore: -1 })
                .limit(limit)
                .setOptions({ bypassFirmFilter: true })
                .lean();
        } catch (error) {
            logger.error('Error getting expansion opportunities:', error);
            throw error;
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // UTILITY METHODS
    // ═══════════════════════════════════════════════════════════════

    static _round(number, decimals = 2) {
        return Math.round(number * Math.pow(10, decimals)) / Math.pow(10, decimals);
    }

    static _calculateAverage(numbers) {
        const validNumbers = numbers.filter(n => n != null && !isNaN(n));
        if (validNumbers.length === 0) return 0;
        return validNumbers.reduce((sum, n) => sum + n, 0) / validNumbers.length;
    }
}

module.exports = CustomerHealthService;
