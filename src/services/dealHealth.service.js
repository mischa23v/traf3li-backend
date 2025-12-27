const Lead = require('../models/lead.model');
const CrmActivity = require('../models/crmActivity.model');
const mongoose = require('mongoose');
const logger = require('../utils/logger');

// ═══════════════════════════════════════════════════════════════
// DEAL HEALTH SERVICE - DEAL SCORING & STUCK DETECTION
// ═══════════════════════════════════════════════════════════════

class DealHealthService {
    constructor() {
        this.weights = {
            activityRecency: 0.25,
            engagementVelocity: 0.20,
            stageProgression: 0.20,
            stakeholderCoverage: 0.15,
            nextStepClarity: 0.10,
            competitorRisk: 0.10
        };
    }

    // ═══════════════════════════════════════════════════════════
    // CORE SCORING FUNCTIONS
    // ═══════════════════════════════════════════════════════════

    /**
     * Calculate comprehensive health score for a deal
     * @param {ObjectId} dealId - Lead/Deal ID
     * @param {ObjectId} firmId - Firm ID for security check
     * @returns {Object} Health score data with grade and recommendations
     */
    async calculateScore(dealId, firmId) {
        try {
            // Get deal with related data
            const deal = await Lead.findOne({
                _id: dealId,
                firmId,
                convertedToClient: false // Only score active deals
            }).populate('assignedTo', 'firstName lastName');

            if (!deal) {
                throw new Error('Deal not found or already converted');
            }

            // Calculate each factor score (0-1)
            const activityRecency = await this.scoreActivityRecency(deal);
            const engagementVelocity = await this.scoreEngagementVelocity(deal);
            const stageProgression = await this.scoreStageProgression(deal);
            const stakeholderCoverage = await this.scoreStakeholderCoverage(deal);
            const nextStepClarity = await this.scoreNextSteps(deal);
            const competitorRisk = await this.scoreCompetitorRisk(deal);

            const factors = {
                activityRecency,
                engagementVelocity,
                stageProgression,
                stakeholderCoverage,
                nextStepClarity,
                competitorRisk
            };

            // Apply weights to calculate total score (0-100)
            const score = this.applyWeights(factors);

            // Generate grade (A-F)
            const grade = this.getGrade(score);

            // Generate recommendations based on low scores
            const recommendations = this.getRecommendations(factors);

            return {
                score,
                grade,
                factors,
                recommendations,
                calculatedAt: new Date()
            };
        } catch (error) {
            logger.error('Error calculating deal health score:', error);
            throw error;
        }
    }

    /**
     * Score activity recency (0-1)
     * Based on days since last activity
     */
    async scoreActivityRecency(deal) {
        try {
            // Get last activity for this deal
            const lastActivity = await CrmActivity.findOne({
                firmId: deal.firmId,
                entityType: 'lead',
                entityId: deal._id,
                type: { $in: ['call', 'email', 'meeting', 'whatsapp', 'sms', 'note'] }
            }).sort({ createdAt: -1 });

            if (!lastActivity) {
                return 0.1; // No activities = very low score
            }

            // Calculate days since last activity
            const daysSince = Math.floor(
                (Date.now() - lastActivity.createdAt.getTime()) / (1000 * 60 * 60 * 24)
            );

            // Score based on recency
            // <= 3 days: 1.0, <= 7: 0.8, <= 14: 0.6, <= 30: 0.3, else: 0.1
            if (daysSince <= 3) return 1.0;
            if (daysSince <= 7) return 0.8;
            if (daysSince <= 14) return 0.6;
            if (daysSince <= 30) return 0.3;
            return 0.1;
        } catch (error) {
            logger.error('Error scoring activity recency:', error);
            return 0.5; // Default to neutral
        }
    }

    /**
     * Score engagement velocity (0-1)
     * Compare activities in last 30 days vs previous 30 days
     */
    async scoreEngagementVelocity(deal) {
        try {
            const now = Date.now();
            const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
            const sixtyDaysAgo = new Date(now - 60 * 24 * 60 * 60 * 1000);

            // Count activities in last 30 days
            const recentCount = await CrmActivity.countDocuments({
                firmId: deal.firmId,
                entityType: 'lead',
                entityId: deal._id,
                createdAt: { $gte: thirtyDaysAgo },
                type: { $in: ['call', 'email', 'meeting', 'whatsapp', 'sms'] }
            });

            // Count activities in previous 30 days (30-60 days ago)
            const previousCount = await CrmActivity.countDocuments({
                firmId: deal.firmId,
                entityType: 'lead',
                entityId: deal._id,
                createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo },
                type: { $in: ['call', 'email', 'meeting', 'whatsapp', 'sms'] }
            });

            // Calculate velocity
            if (previousCount === 0) {
                // If no previous activity, score based on recent count
                if (recentCount >= 10) return 1.0;
                if (recentCount >= 5) return 0.8;
                if (recentCount >= 2) return 0.6;
                if (recentCount >= 1) return 0.4;
                return 0.2;
            }

            // Compare trends - positive trend = higher score
            const velocityRatio = recentCount / previousCount;
            if (velocityRatio >= 1.5) return 1.0;  // 50%+ increase
            if (velocityRatio >= 1.2) return 0.9;  // 20%+ increase
            if (velocityRatio >= 1.0) return 0.8;  // Stable
            if (velocityRatio >= 0.8) return 0.6;  // 20% decrease
            if (velocityRatio >= 0.5) return 0.4;  // 50% decrease
            return 0.2; // Significant decline

        } catch (error) {
            logger.error('Error scoring engagement velocity:', error);
            return 0.5; // Default to neutral
        }
    }

    /**
     * Score stage progression (0-1)
     * Check if deal is progressing through stages appropriately
     */
    async scoreStageProgression(deal) {
        try {
            const now = Date.now();
            const stageChangedAt = deal.stageChangedAt || deal.createdAt;
            const daysSinceStageChange = Math.floor(
                (now - stageChangedAt.getTime()) / (1000 * 60 * 60 * 24)
            );

            // Define healthy duration for each stage
            const stageThresholds = {
                'new': 7,           // Should move within a week
                'contacted': 14,    // 2 weeks
                'qualified': 21,    // 3 weeks
                'proposal': 14,     // 2 weeks
                'negotiation': 21,  // 3 weeks
                'won': 0,           // Already won
                'lost': 0,          // Already lost
                'dormant': 0        // Inactive
            };

            const threshold = stageThresholds[deal.status] || 30;

            // Score based on time in current stage
            if (deal.status === 'won') return 1.0; // Deal is won
            if (deal.status === 'lost' || deal.status === 'dormant') return 0.0; // Deal is dead

            // Recently moved stages = high score
            if (daysSinceStageChange <= 7) return 1.0;

            // Within healthy threshold
            if (daysSinceStageChange <= threshold) return 0.8;

            // Slightly over threshold
            if (daysSinceStageChange <= threshold * 1.5) return 0.6;

            // Significantly over threshold - stagnant
            if (daysSinceStageChange <= threshold * 2) return 0.3;

            return 0.1; // Deal is stuck

        } catch (error) {
            logger.error('Error scoring stage progression:', error);
            return 0.5; // Default to neutral
        }
    }

    /**
     * Score stakeholder coverage (0-1)
     * Check for key stakeholder roles in contacts
     */
    async scoreStakeholderCoverage(deal) {
        try {
            const qualification = deal.qualification || {};
            const hasChampion = qualification.hasChampion || false;
            const authority = qualification.authority || 'unknown';

            let score = 0;
            let maxScore = 3;

            // Check for champion
            if (hasChampion) {
                score += 1;
            }

            // Check for decision maker access
            if (authority === 'decision_maker') {
                score += 2; // Most important
            } else if (authority === 'influencer') {
                score += 1;
            } else if (authority === 'user') {
                score += 0.5;
            }

            // Normalize to 0-1
            return score / maxScore;

        } catch (error) {
            logger.error('Error scoring stakeholder coverage:', error);
            return 0.5; // Default to neutral
        }
    }

    /**
     * Score next step clarity (0-1)
     * Check for scheduled activities and clear next steps
     */
    async scoreNextSteps(deal) {
        try {
            const now = new Date();
            let score = 0;

            // Check for scheduled future activities (meetings, calls, tasks)
            const upcomingActivities = await CrmActivity.countDocuments({
                firmId: deal.firmId,
                entityType: 'lead',
                entityId: deal._id,
                type: { $in: ['meeting', 'task', 'call'] },
                $or: [
                    { 'meetingData.scheduledStart': { $gt: now } },
                    { 'taskInfo.dueDate': { $gt: now } }
                ]
            });

            if (upcomingActivities > 0) {
                score += 0.6; // Has scheduled activities
            }

            // Check for recent notes with next steps mentioned
            const recentNoteWithNextSteps = await CrmActivity.findOne({
                firmId: deal.firmId,
                entityType: 'lead',
                entityId: deal._id,
                type: 'note',
                $or: [
                    { description: { $regex: /next step/i } },
                    { description: { $regex: /follow up/i } },
                    { description: { $regex: /action item/i } }
                ],
                createdAt: { $gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) }
            });

            if (recentNoteWithNextSteps) {
                score += 0.4; // Has documented next steps
            }

            return Math.min(1.0, score);

        } catch (error) {
            logger.error('Error scoring next steps:', error);
            return 0.5; // Default to neutral
        }
    }

    /**
     * Score competitor risk (0-1)
     * Check for competitor mentions in notes
     */
    async scoreCompetitorRisk(deal) {
        try {
            // Check for competitor mentions in recent activities
            const competitorMentions = await CrmActivity.countDocuments({
                firmId: deal.firmId,
                entityType: 'lead',
                entityId: deal._id,
                type: 'note',
                $or: [
                    { description: { $regex: /competitor/i } },
                    { description: { $regex: /competing/i } },
                    { description: { $regex: /alternative/i } }
                ],
                createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
            });

            // More mentions = higher risk = lower score
            if (competitorMentions === 0) return 0.8; // No mentions (but not 1.0 - always some risk)
            if (competitorMentions === 1) return 0.6; // One mention - moderate
            if (competitorMentions === 2) return 0.4; // Two mentions - concerning
            return 0.2; // Multiple mentions - high risk

        } catch (error) {
            logger.error('Error scoring competitor risk:', error);
            return 0.5; // Default to neutral (unknown)
        }
    }

    // ═══════════════════════════════════════════════════════════
    // RECOMMENDATIONS & INSIGHTS
    // ═══════════════════════════════════════════════════════════

    /**
     * Generate recommendations based on low scores
     * @param {Object} factors - Factor scores
     * @returns {Array} Array of recommendations
     */
    getRecommendations(factors) {
        const recommendations = [];

        // Activity recency
        if (factors.activityRecency < 0.5) {
            recommendations.push({
                priority: 'high',
                message: 'Schedule immediate follow-up - deal has gone cold'
            });
        } else if (factors.activityRecency < 0.7) {
            recommendations.push({
                priority: 'medium',
                message: 'Schedule follow-up within 2-3 days'
            });
        }

        // Engagement velocity
        if (factors.engagementVelocity < 0.4) {
            recommendations.push({
                priority: 'high',
                message: 'Engagement is declining - re-engage with value proposition'
            });
        }

        // Stage progression
        if (factors.stageProgression < 0.4) {
            recommendations.push({
                priority: 'high',
                message: 'Deal is stuck in current stage - take action to move forward'
            });
        }

        // Stakeholder coverage
        if (factors.stakeholderCoverage < 0.5) {
            recommendations.push({
                priority: 'medium',
                message: 'Identify and engage decision maker or economic buyer'
            });
        }

        // Next step clarity
        if (factors.nextStepClarity < 0.5) {
            recommendations.push({
                priority: 'medium',
                message: 'Define clear next steps and schedule follow-up activities'
            });
        }

        // Competitor risk
        if (factors.competitorRisk < 0.5) {
            recommendations.push({
                priority: 'high',
                message: 'Competitor pressure detected - strengthen value proposition'
            });
        }

        // If no recommendations, deal is healthy
        if (recommendations.length === 0) {
            recommendations.push({
                priority: 'low',
                message: 'Deal is healthy - maintain momentum'
            });
        }

        return recommendations;
    }

    /**
     * Apply weights to factor scores to get total score
     * @param {Object} factors - Factor scores (0-1)
     * @returns {Number} Total score (0-100)
     */
    applyWeights(factors) {
        const weightedScore =
            (factors.activityRecency * this.weights.activityRecency) +
            (factors.engagementVelocity * this.weights.engagementVelocity) +
            (factors.stageProgression * this.weights.stageProgression) +
            (factors.stakeholderCoverage * this.weights.stakeholderCoverage) +
            (factors.nextStepClarity * this.weights.nextStepClarity) +
            (factors.competitorRisk * this.weights.competitorRisk);

        // Convert to 0-100 scale
        return Math.round(weightedScore * 100);
    }

    /**
     * Get grade from score
     * @param {Number} score - Score (0-100)
     * @returns {String} Grade (A-F)
     */
    getGrade(score) {
        if (score >= 90) return 'A';
        if (score >= 80) return 'B';
        if (score >= 70) return 'C';
        if (score >= 60) return 'D';
        return 'F';
    }

    // ═══════════════════════════════════════════════════════════
    // DEAL HEALTH UPDATES
    // ═══════════════════════════════════════════════════════════

    /**
     * Update deal health score and save to deal record
     * @param {ObjectId} dealId - Lead/Deal ID
     * @param {ObjectId} firmId - Firm ID
     * @returns {Object} Updated deal with health data
     */
    async updateDealHealth(dealId, firmId) {
        try {
            const healthData = await this.calculateScore(dealId, firmId);

            // Update deal record
            const deal = await Lead.findOneAndUpdate(
                { _id: dealId, firmId },
                {
                    $set: {
                        'dealHealth.score': healthData.score,
                        'dealHealth.grade': healthData.grade,
                        'dealHealth.lastCalculatedAt': healthData.calculatedAt,
                        'dealHealth.factors': healthData.factors,
                        'dealHealth.recommendations': healthData.recommendations
                    }
                },
                { new: true }
            );

            if (!deal) {
                throw new Error('Deal not found');
            }

            logger.info(`Updated deal health for deal ${dealId}: ${healthData.grade} (${healthData.score})`);

            return deal;

        } catch (error) {
            logger.error('Error updating deal health:', error);
            throw error;
        }
    }

    /**
     * Batch update health for all open deals in a firm
     * @param {ObjectId} firmId - Firm ID
     * @returns {Object} Results summary
     */
    async batchUpdateHealth(firmId) {
        try {
            // Get all open deals (not converted, not lost/dormant)
            const deals = await Lead.find({
                firmId,
                convertedToClient: false,
                status: { $nin: ['lost', 'dormant'] }
            }).select('_id');

            let successCount = 0;
            let failureCount = 0;
            const errors = [];

            for (const deal of deals) {
                try {
                    await this.updateDealHealth(deal._id, firmId);
                    successCount++;
                } catch (error) {
                    failureCount++;
                    errors.push({
                        dealId: deal._id,
                        error: error.message
                    });
                    logger.error(`Failed to update health for deal ${deal._id}:`, error);
                }
            }

            logger.info(`Batch health update complete for firm ${firmId}: ${successCount} succeeded, ${failureCount} failed`);

            return {
                total: deals.length,
                succeeded: successCount,
                failed: failureCount,
                errors: errors.length > 0 ? errors : undefined
            };

        } catch (error) {
            logger.error('Error in batch health update:', error);
            throw error;
        }
    }

    // ═══════════════════════════════════════════════════════════
    // STUCK DEAL DETECTION
    // ═══════════════════════════════════════════════════════════

    /**
     * Detect and mark stuck deals
     * @param {ObjectId} firmId - Firm ID
     * @param {Object} options - Detection options
     * @returns {Array} Stuck deals
     */
    async detectStuckDeals(firmId, options = {}) {
        try {
            const {
                stageStuckDays = 30,      // Stage hasn't changed in X days
                noActivityDays = 14,       // No activity in X days
                markAsStuck = true         // Whether to mark deals as stuck
            } = options;

            const now = Date.now();
            const stageStuckThreshold = new Date(now - stageStuckDays * 24 * 60 * 60 * 1000);
            const activityThreshold = new Date(now - noActivityDays * 24 * 60 * 60 * 1000);

            // Find deals where:
            // 1. Stage hasn't changed in X days
            // 2. No recent activity
            // 3. Not already won/lost/dormant
            const potentiallyStuckDeals = await Lead.find({
                firmId,
                convertedToClient: false,
                status: { $nin: ['won', 'lost', 'dormant'] },
                $or: [
                    { stageChangedAt: { $lt: stageStuckThreshold } },
                    { stageChangedAt: null, createdAt: { $lt: stageStuckThreshold } }
                ]
            }).populate('assignedTo', 'firstName lastName email');

            const stuckDeals = [];

            // Check each deal for recent activity
            for (const deal of potentiallyStuckDeals) {
                const lastActivity = await CrmActivity.findOne({
                    firmId: deal.firmId,
                    entityType: 'lead',
                    entityId: deal._id,
                    type: { $in: ['call', 'email', 'meeting', 'whatsapp', 'sms'] }
                }).sort({ createdAt: -1 });

                // If no activity or activity is old, mark as stuck
                const hasNoRecentActivity = !lastActivity || lastActivity.createdAt < activityThreshold;

                if (hasNoRecentActivity) {
                    stuckDeals.push(deal);

                    if (markAsStuck) {
                        // Mark deal as stuck
                        deal.dealHealth = deal.dealHealth || {};
                        deal.dealHealth.isStuck = true;
                        deal.dealHealth.stuckSince = deal.dealHealth.stuckSince || new Date();
                        await deal.save();
                    }
                }
            }

            logger.info(`Detected ${stuckDeals.length} stuck deals for firm ${firmId}`);

            return stuckDeals;

        } catch (error) {
            logger.error('Error detecting stuck deals:', error);
            throw error;
        }
    }

    /**
     * Get all stuck deals for a firm
     * @param {ObjectId} firmId - Firm ID
     * @returns {Array} Stuck deals
     */
    async getStuckDeals(firmId) {
        try {
            const stuckDeals = await Lead.find({
                firmId,
                'dealHealth.isStuck': true,
                convertedToClient: false,
                status: { $nin: ['won', 'lost', 'dormant'] }
            })
            .populate('assignedTo', 'firstName lastName email')
            .sort({ 'dealHealth.stuckSince': -1 });

            return stuckDeals;

        } catch (error) {
            logger.error('Error getting stuck deals:', error);
            throw error;
        }
    }

    /**
     * Unstuck a deal (when activity resumes)
     * @param {ObjectId} dealId - Lead/Deal ID
     * @param {ObjectId} firmId - Firm ID
     */
    async unstuckDeal(dealId, firmId) {
        try {
            await Lead.findOneAndUpdate(
                { _id: dealId, firmId },
                {
                    $set: {
                        'dealHealth.isStuck': false,
                        'dealHealth.stuckSince': null
                    }
                }
            );

            logger.info(`Unstuck deal ${dealId}`);

        } catch (error) {
            logger.error('Error unstucking deal:', error);
            throw error;
        }
    }

    // ═══════════════════════════════════════════════════════════
    // REPORTING & ANALYTICS
    // ═══════════════════════════════════════════════════════════

    /**
     * Get health distribution for all deals in a firm
     * @param {ObjectId} firmId - Firm ID
     * @returns {Object} Distribution by grade
     */
    async getHealthDistribution(firmId) {
        try {
            const distribution = await Lead.aggregate([
                {
                    $match: {
                        firmId: new mongoose.Types.ObjectId(firmId),
                        convertedToClient: false,
                        status: { $nin: ['lost', 'dormant'] },
                        'dealHealth.grade': { $exists: true }
                    }
                },
                {
                    $group: {
                        _id: '$dealHealth.grade',
                        count: { $sum: 1 },
                        avgScore: { $avg: '$dealHealth.score' },
                        totalValue: { $sum: '$estimatedValue' }
                    }
                },
                { $sort: { _id: 1 } }
            ]);

            return distribution;

        } catch (error) {
            logger.error('Error getting health distribution:', error);
            throw error;
        }
    }

    /**
     * Get deals needing attention (low health scores)
     * @param {ObjectId} firmId - Firm ID
     * @param {Number} threshold - Score threshold (default 60)
     * @returns {Array} Deals needing attention
     */
    async getDealsNeedingAttention(firmId, threshold = 60) {
        try {
            const deals = await Lead.find({
                firmId,
                convertedToClient: false,
                status: { $nin: ['won', 'lost', 'dormant'] },
                'dealHealth.score': { $lt: threshold }
            })
            .populate('assignedTo', 'firstName lastName email')
            .sort({ 'dealHealth.score': 1 })
            .limit(50);

            return deals;

        } catch (error) {
            logger.error('Error getting deals needing attention:', error);
            throw error;
        }
    }
}

// Export as singleton instance
module.exports = new DealHealthService();
