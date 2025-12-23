const LeadScore = require('../models/leadScore.model');
const LeadScoringConfig = require('../models/leadScoringConfig.model');
const Lead = require('../models/lead.model');
const CrmActivity = require('../models/crmActivity.model');
const mongoose = require('mongoose');
const logger = require('../utils/logger');

// ═══════════════════════════════════════════════════════════════
// LEAD SCORING SERVICE - AI-POWERED LEAD INTELLIGENCE
// ═══════════════════════════════════════════════════════════════

class LeadScoringService {
    // ═══════════════════════════════════════════════════════════
    // CORE SCORING FUNCTIONS
    // ═══════════════════════════════════════════════════════════

    /**
     * Calculate complete lead score
     * @param {ObjectId} leadId - Lead ID
     * @returns {Object} Calculated score data
     */
    static async calculateScore(leadId) {
        try {
            const lead = await Lead.findById(leadId).populate('firmId');
            if (!lead) {
                throw new Error('Lead not found');
            }

            const config = await LeadScoringConfig.getOrCreateConfig(lead.firmId);

            // Get or create lead score record
            let leadScore = await LeadScore.findOne({ leadId });
            if (!leadScore) {
                leadScore = new LeadScore({
                    firmId: lead.firmId,
                    leadId: lead._id,
                    weights: config.weights
                });
            }

            // Calculate each dimension
            const demographic = await this.calculateDemographicScore(lead, config);
            const bant = await this.calculateBANTScore(lead, config);
            const behavioral = await this.calculateBehavioralScore(leadId, config);
            const engagement = await this.calculateEngagementScore(leadId, config);

            // Store breakdown
            leadScore.breakdown.demographic = demographic;
            leadScore.breakdown.bant = bant;
            leadScore.breakdown.behavioral = behavioral;
            leadScore.breakdown.engagement = engagement;

            // Calculate weighted total score
            const totalScore = this.applyWeights(
                {
                    demographic: demographic.score,
                    bant: bant.score,
                    behavioral: behavioral.score,
                    engagement: engagement.score
                },
                config.weights
            );

            leadScore.totalScore = Math.round(Math.min(100, Math.max(0, totalScore)));

            // Determine grade and category
            leadScore.grade = config.getGrade(leadScore.totalScore);
            leadScore.updateCategory();

            // Calculate conversion probability
            leadScore.conversionProbability = await this.predictConversion(leadId, leadScore.totalScore);

            // Update calculation metadata
            leadScore.calculation.lastCalculatedAt = new Date();
            leadScore.calculation.calculationCount += 1;
            leadScore.calculation.nextScheduledAt = this.getNextCalculationDate(config);

            // Add to history
            leadScore.addToHistory('scheduled', 'score_calculation', 'Automatic score calculation');

            // Generate insights
            await this.generateInsights(leadScore, lead, config);

            await leadScore.save();

            // Update lead's score field for backward compatibility
            lead.leadScore = Math.round(leadScore.totalScore * 1.5); // Convert to 0-150 scale
            await lead.save();

            return leadScore;
        } catch (error) {
            logger.error('Error calculating lead score:', error);
            throw error;
        }
    }

    /**
     * Calculate demographic score (case type, value, location, etc.)
     */
    static async calculateDemographicScore(lead, config) {
        const factors = {
            caseType: { value: null, score: 0, weight: 30 },
            caseValue: { value: null, score: 0, weight: 25 },
            location: { value: null, score: 0, weight: 15 },
            industry: { value: null, score: 0, weight: 15 },
            companySize: { value: null, score: 0, weight: 15 }
        };

        // Case Type Scoring
        if (lead.intake?.caseType) {
            factors.caseType.value = lead.intake.caseType;
            const caseTypeRule = config.demographicRules.caseTypes.find(
                ct => ct.type === lead.intake.caseType
            );
            factors.caseType.score = caseTypeRule?.score || 50; // Default 50
        }

        // Case Value Scoring
        const caseValue = lead.intake?.estimatedValue || lead.estimatedValue || 0;
        if (caseValue > 0) {
            factors.caseValue.value = caseValue;
            const valueRange = config.demographicRules.caseValueRanges.find(
                range => caseValue >= range.min && caseValue <= range.max
            );
            factors.caseValue.score = valueRange?.score || this.calculateValueScore(caseValue);
        }

        // Location Scoring
        if (lead.address?.city) {
            factors.location.value = lead.address.city;
            const locationRule = config.demographicRules.preferredLocations.find(
                loc => loc.location.toLowerCase() === lead.address.city.toLowerCase()
            );
            factors.location.score = locationRule?.score || 50;
        }

        // Industry Scoring (for companies)
        if (lead.type === 'company' && lead.practiceArea) {
            factors.industry.value = lead.practiceArea;
            const industryRule = config.demographicRules.industries.find(
                ind => ind.name === lead.practiceArea
            );
            factors.industry.score = industryRule?.score || 50;
        }

        // Company Size Scoring
        if (lead.type === 'company') {
            const companySize = this.estimateCompanySize(lead);
            factors.companySize.value = companySize;
            const sizeRule = config.demographicRules.companySizes.find(
                size => size.size === companySize
            );
            factors.companySize.score = sizeRule?.score || 50;
        }

        // Calculate weighted score
        const score = this.calculateFactorScore(factors);

        return { score, factors };
    }

    /**
     * Calculate BANT score (Budget, Authority, Need, Timeline)
     */
    static async calculateBANTScore(lead, config) {
        const factors = {
            budget: { value: 'unknown', score: 0, weight: 30 },
            authority: { value: 'unknown', score: 0, weight: 25 },
            need: { value: 'unknown', score: 0, weight: 25 },
            timeline: { value: 'unknown', score: 0, weight: 20 }
        };

        if (lead.qualification) {
            // Budget
            const budget = lead.qualification.budget || 'unknown';
            factors.budget.value = budget;
            factors.budget.score = config.bantRules.budget[budget] || 10;

            // Authority
            const authority = lead.qualification.authority || 'unknown';
            factors.authority.value = authority;
            factors.authority.score = config.bantRules.authority[authority] || 10;

            // Need
            const need = lead.qualification.need || 'unknown';
            factors.need.value = need;
            factors.need.score = config.bantRules.need[need] || 10;

            // Timeline
            const timeline = lead.qualification.timeline || 'unknown';
            factors.timeline.value = timeline;
            factors.timeline.score = config.bantRules.timeline[timeline] || 10;
        }

        const score = this.calculateFactorScore(factors);

        return { score, factors };
    }

    /**
     * Calculate behavioral score (emails, calls, meetings, documents, etc.)
     */
    static async calculateBehavioralScore(leadId, config) {
        const factors = {
            emailEngagement: { score: 0, opens: 0, clicks: 0, replies: 0 },
            responseTime: { score: 0, avgHours: null },
            meetingAttendance: { score: 0, scheduled: 0, attended: 0, noShows: 0 },
            documentViews: { score: 0, count: 0 },
            websiteVisits: { score: 0, count: 0, totalDurationSeconds: 0 },
            phoneCallDuration: { score: 0, totalMinutes: 0, callCount: 0 },
            formSubmissions: { score: 0, count: 0 },
            interactionFrequency: { score: 0, daysActive: 0, totalInteractions: 0 }
        };

        // Get all activities for this lead
        const activities = await CrmActivity.find({
            entityType: 'lead',
            entityId: leadId
        }).sort({ createdAt: -1 });

        // Email engagement
        const emailActivities = activities.filter(a => a.type === 'email');
        factors.emailEngagement.opens = emailActivities.filter(
            a => a.emailData?.opened
        ).length;
        factors.emailEngagement.clicks = emailActivities.filter(
            a => a.emailData?.clicked
        ).length;
        factors.emailEngagement.replies = emailActivities.filter(
            a => a.emailData?.replied
        ).length;

        factors.emailEngagement.score = Math.min(100,
            (factors.emailEngagement.opens * config.behavioralRules.emailOpen.points) +
            (factors.emailEngagement.clicks * config.behavioralRules.emailClick.points) +
            (factors.emailEngagement.replies * config.behavioralRules.emailReply.points)
        );

        // Meeting attendance
        const meetingActivities = activities.filter(a => a.type === 'meeting');
        factors.meetingAttendance.scheduled = meetingActivities.length;
        factors.meetingAttendance.attended = meetingActivities.filter(
            a => a.meetingData?.outcome === 'completed'
        ).length;
        factors.meetingAttendance.noShows = meetingActivities.filter(
            a => a.meetingData?.outcome === 'no_show'
        ).length;

        factors.meetingAttendance.score = Math.min(100,
            (factors.meetingAttendance.attended * config.behavioralRules.meetingAttended.points) +
            (factors.meetingAttendance.noShows * config.behavioralRules.meetingNoShow.penalty)
        );

        // Phone calls
        const callActivities = activities.filter(a => a.type === 'call');
        factors.phoneCallDuration.callCount = callActivities.length;
        factors.phoneCallDuration.totalMinutes = callActivities.reduce(
            (sum, a) => sum + ((a.callData?.duration || 0) / 60), 0
        );

        factors.phoneCallDuration.score = Math.min(
            config.behavioralRules.phoneCall.max,
            factors.phoneCallDuration.totalMinutes * config.behavioralRules.phoneCall.pointsPerMinute
        );

        // Document views
        const documentActivities = activities.filter(a => a.type === 'document');
        factors.documentViews.count = documentActivities.length;
        factors.documentViews.score = Math.min(
            config.behavioralRules.documentView.max,
            factors.documentViews.count * config.behavioralRules.documentView.points
        );

        // Response time (average hours to respond)
        const responseTimes = [];
        for (let i = 0; i < activities.length - 1; i++) {
            const current = activities[i];
            const previous = activities[i + 1];
            if (current.type !== 'note' && previous.type !== 'note') {
                const hoursDiff = (current.createdAt - previous.createdAt) / (1000 * 60 * 60);
                responseTimes.push(hoursDiff);
            }
        }
        if (responseTimes.length > 0) {
            factors.responseTime.avgHours = responseTimes.reduce((a, b) => a + b) / responseTimes.length;
            // Score: faster response = higher score
            if (factors.responseTime.avgHours <= 1) {
                factors.responseTime.score = 100;
            } else if (factors.responseTime.avgHours <= 24) {
                factors.responseTime.score = 80;
            } else if (factors.responseTime.avgHours <= 48) {
                factors.responseTime.score = 60;
            } else {
                factors.responseTime.score = 30;
            }
        }

        // Interaction frequency
        const uniqueDays = new Set(
            activities.map(a => a.createdAt.toISOString().split('T')[0])
        );
        factors.interactionFrequency.daysActive = uniqueDays.size;
        factors.interactionFrequency.totalInteractions = activities.length;
        factors.interactionFrequency.score = Math.min(100, uniqueDays.size * 5);

        // Calculate overall behavioral score (average of all factors)
        const factorScores = Object.values(factors).map(f => f.score || 0);
        const score = factorScores.reduce((a, b) => a + b, 0) / factorScores.length;

        return { score: Math.round(score), factors };
    }

    /**
     * Calculate engagement score (Recency, Frequency, Depth)
     */
    static async calculateEngagementScore(leadId, config) {
        const factors = {
            recency: { score: 0, daysSinceContact: null, lastContactDate: null },
            frequency: { score: 0, touchpoints: 0, touchpointsLast30Days: 0 },
            depth: { score: 0, avgEngagementTimeMinutes: null, qualityInteractions: 0 }
        };

        const lead = await Lead.findById(leadId);
        const activities = await CrmActivity.find({
            entityType: 'lead',
            entityId: leadId
        }).sort({ createdAt: -1 });

        // Recency
        if (lead.lastContactedAt) {
            factors.recency.lastContactDate = lead.lastContactedAt;
            const daysSince = Math.floor(
                (Date.now() - lead.lastContactedAt.getTime()) / (1000 * 60 * 60 * 24)
            );
            factors.recency.daysSinceContact = daysSince;

            // Score based on recency rules
            if (daysSince === 0) {
                factors.recency.score = config.engagementRules.recency.today;
            } else if (daysSince <= 3) {
                factors.recency.score = config.engagementRules.recency.within3days;
            } else if (daysSince <= 7) {
                factors.recency.score = config.engagementRules.recency.within7days;
            } else if (daysSince <= 14) {
                factors.recency.score = config.engagementRules.recency.within14days;
            } else if (daysSince <= 30) {
                factors.recency.score = config.engagementRules.recency.within30days;
            } else {
                factors.recency.score = config.engagementRules.recency.over30days;
            }
        }

        // Frequency
        factors.frequency.touchpoints = activities.length;

        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        factors.frequency.touchpointsLast30Days = activities.filter(
            a => a.createdAt >= thirtyDaysAgo
        ).length;

        factors.frequency.score = Math.min(
            config.engagementRules.frequency.max,
            factors.frequency.touchpointsLast30Days * config.engagementRules.frequency.perTouchpoint
        );

        // Depth - quality interactions (calls, meetings)
        const qualityInteractions = activities.filter(
            a => ['call', 'meeting'].includes(a.type)
        );
        factors.depth.qualityInteractions = qualityInteractions.length;

        const totalEngagementMinutes = qualityInteractions.reduce((sum, a) => {
            if (a.type === 'call') {
                return sum + ((a.callData?.duration || 0) / 60);
            }
            if (a.type === 'meeting') {
                return sum + (a.meetingData?.actualDuration || 30);
            }
            return sum;
        }, 0);

        factors.depth.avgEngagementTimeMinutes = qualityInteractions.length > 0
            ? totalEngagementMinutes / qualityInteractions.length
            : null;

        factors.depth.score = Math.min(
            config.engagementRules.depth.max,
            (qualityInteractions.length * config.engagementRules.depth.qualityInteractionPoints) +
            (activities.length * config.engagementRules.depth.regularInteractionPoints)
        );

        // Calculate overall engagement score
        const score = (
            factors.recency.score * 0.4 +
            factors.frequency.score * 0.3 +
            factors.depth.score * 0.3
        );

        return { score: Math.round(score), factors };
    }

    /**
     * Apply weights to dimension scores
     */
    static applyWeights(scores, weights) {
        return (
            (scores.demographic * weights.demographic / 100) +
            (scores.bant * weights.bant / 100) +
            (scores.behavioral * weights.behavioral / 100) +
            (scores.engagement * weights.engagement / 100)
        );
    }

    // ═══════════════════════════════════════════════════════════
    // BEHAVIORAL TRACKING
    // ═══════════════════════════════════════════════════════════

    static async trackEmailOpen(leadId, campaignId = null) {
        await this.recalculateScore(leadId, 'email_open');
    }

    static async trackEmailClick(leadId, campaignId = null, link = null) {
        await this.recalculateScore(leadId, 'email_click');
    }

    static async trackMeetingScheduled(leadId) {
        await this.recalculateScore(leadId, 'meeting_scheduled');
    }

    static async trackMeetingAttended(leadId) {
        await this.recalculateScore(leadId, 'meeting_attended');
    }

    static async trackCallCompleted(leadId, durationMinutes) {
        await this.recalculateScore(leadId, 'call_completed');
    }

    static async trackDocumentView(leadId, documentId) {
        await this.recalculateScore(leadId, 'document_view');
    }

    static async trackWebsiteVisit(leadId, page, duration) {
        await this.recalculateScore(leadId, 'website_visit');
    }

    static async trackFormSubmission(leadId, formId) {
        await this.recalculateScore(leadId, 'form_submission');
    }

    static async trackResponse(leadId, responseTimeHours) {
        await this.recalculateScore(leadId, 'response');
    }

    static async trackWhatsAppMessage(leadId) {
        await this.recalculateScore(leadId, 'whatsapp_message');
    }

    // ═══════════════════════════════════════════════════════════
    // DECAY MANAGEMENT
    // ═══════════════════════════════════════════════════════════

    /**
     * Apply decay to a specific lead score
     */
    static async applyDecay(leadScoreId) {
        const leadScore = await LeadScore.findById(leadScoreId);
        if (!leadScore) return;

        const config = await LeadScoringConfig.findOne({ firmId: leadScore.firmId });
        if (!config || !config.decay.enabled) return;

        const daysSinceActivity = leadScore.decay.daysSinceActivity || 0;
        if (daysSinceActivity < config.decay.startAfterDays) return;

        const decayDays = daysSinceActivity - config.decay.startAfterDays;
        const decayPercent = Math.min(
            config.decay.maxDecayPercent,
            decayDays * config.decay.decayPerDay
        );

        const decayedScore = leadScore.totalScore * (1 - decayPercent / 100);
        const finalScore = Math.max(config.decay.minimumScore, decayedScore);

        leadScore.totalScore = Math.round(finalScore);
        leadScore.decay.applied = decayPercent;
        leadScore.decay.nextDecayDate = new Date(Date.now() + 24 * 60 * 60 * 1000);

        leadScore.addToHistory('decay', 'decay_application', `Applied ${decayPercent.toFixed(1)}% decay`);

        await leadScore.save();
    }

    /**
     * Process decay for all leads in a firm
     */
    static async processAllDecay(firmId) {
        const leadScores = await LeadScore.getNeedingDecay();
        const firmScores = leadScores.filter(ls => ls.firmId.toString() === firmId.toString());

        for (const leadScore of firmScores) {
            await this.applyDecay(leadScore._id);
        }

        return { processed: firmScores.length };
    }

    /**
     * Reset decay when lead has new activity
     */
    static async resetDecay(leadId) {
        const leadScore = await LeadScore.findOne({ leadId });
        if (!leadScore) return;

        leadScore.decay.applied = 0;
        leadScore.decay.lastActivityAt = new Date();
        leadScore.decay.daysSinceActivity = 0;

        await leadScore.save();
    }

    // ═══════════════════════════════════════════════════════════
    // BULK OPERATIONS
    // ═══════════════════════════════════════════════════════════

    static async recalculateAllScores(firmId) {
        const leads = await Lead.find({ firmId, convertedToClient: false });
        const results = [];

        for (const lead of leads) {
            try {
                const score = await this.calculateScore(lead._id);
                results.push({ leadId: lead._id, success: true, score: score.totalScore });
            } catch (error) {
                results.push({ leadId: lead._id, success: false, error: error.message });
            }
        }

        return results;
    }

    static async recalculateBatch(leadIds) {
        const results = [];

        for (const leadId of leadIds) {
            try {
                const score = await this.calculateScore(leadId);
                results.push({ leadId, success: true, score: score.totalScore });
            } catch (error) {
                results.push({ leadId, success: false, error: error.message });
            }
        }

        return results;
    }

    static async recalculateScore(leadId, triggeredBy = 'activity') {
        try {
            const leadScore = await this.calculateScore(leadId);
            await this.resetDecay(leadId);
            return leadScore;
        } catch (error) {
            logger.error(`Error recalculating score for lead ${leadId}:`, error);
        }
    }

    // ═══════════════════════════════════════════════════════════
    // PREDICTIONS & INSIGHTS
    // ═══════════════════════════════════════════════════════════

    static async predictConversion(leadId, currentScore) {
        try {
            const lead = await Lead.findById(leadId);

            // Simple ML-like prediction based on multiple factors
            let probability = currentScore; // Base on score (0-100)

            // Adjust based on status
            const statusMultipliers = {
                'new': 0.8,
                'contacted': 0.9,
                'qualified': 1.1,
                'proposal': 1.3,
                'negotiation': 1.5,
                'won': 2.0,
                'lost': 0,
                'dormant': 0.5
            };
            probability *= (statusMultipliers[lead.status] || 1);

            // Adjust based on lead age
            const daysSinceCreated = Math.floor(
                (Date.now() - lead.createdAt.getTime()) / (1000 * 60 * 60 * 24)
            );
            if (daysSinceCreated > 90) probability *= 0.8;
            if (daysSinceCreated > 180) probability *= 0.6;

            // Cap at 100
            probability = Math.min(100, Math.max(0, probability));

            return Math.round(probability);
        } catch (error) {
            logger.error('Error predicting conversion:', error);
            return 50; // Default
        }
    }

    static async generateInsights(leadScore, lead, config) {
        const insights = {
            strengths: [],
            weaknesses: [],
            recommendations: [],
            updatedAt: new Date()
        };

        // Analyze strengths
        if (leadScore.breakdown.bant.factors.budget.score >= 80) {
            insights.strengths.push('High budget capacity');
        }
        if (leadScore.breakdown.bant.factors.authority.value === 'decision_maker') {
            insights.strengths.push('Direct access to decision maker');
        }
        if (leadScore.breakdown.engagement.factors.recency.daysSinceContact <= 3) {
            insights.strengths.push('Recent engagement');
        }
        if (leadScore.breakdown.behavioral.factors.meetingAttendance.attended > 0) {
            insights.strengths.push('Attended meetings');
        }

        // Analyze weaknesses
        if (leadScore.breakdown.bant.factors.timeline.value === 'no_timeline') {
            insights.weaknesses.push('No clear timeline');
        }
        if (leadScore.breakdown.engagement.factors.recency.daysSinceContact > 14) {
            insights.weaknesses.push('Low recent engagement');
        }
        if (leadScore.breakdown.behavioral.factors.emailEngagement.opens === 0) {
            insights.weaknesses.push('No email engagement');
        }

        // Generate recommendations
        if (leadScore.totalScore >= 80) {
            insights.recommendations.push('High-priority lead - schedule immediate consultation');
        }
        if (leadScore.breakdown.bant.factors.timeline.value === 'immediate') {
            insights.recommendations.push('Urgent timeline - fast follow-up required');
        }
        if (leadScore.breakdown.behavioral.factors.meetingAttendance.noShows > 0) {
            insights.recommendations.push('Has missed meetings - send confirmation reminders');
        }
        if (leadScore.breakdown.engagement.factors.recency.daysSinceContact > 7) {
            insights.recommendations.push('Re-engage with follow-up call or message');
        }

        leadScore.insights = insights;
    }

    static async getLeadInsights(leadId) {
        const leadScore = await LeadScore.findOne({ leadId }).populate('leadId');
        if (!leadScore) {
            throw new Error('Lead score not found');
        }

        return leadScore.insights;
    }

    static async getSimilarConvertedLeads(leadId, limit = 5) {
        // Find similar leads that converted successfully
        const lead = await Lead.findById(leadId);
        const leadScore = await LeadScore.findOne({ leadId });

        if (!lead || !leadScore) return [];

        // Find converted leads with similar characteristics
        const similarLeads = await Lead.aggregate([
            {
                $match: {
                    firmId: lead.firmId,
                    convertedToClient: true,
                    _id: { $ne: lead._id }
                }
            },
            {
                $lookup: {
                    from: 'leadscores',
                    localField: '_id',
                    foreignField: 'leadId',
                    as: 'scoreData'
                }
            },
            { $unwind: { path: '$scoreData', preserveNullAndEmptyArrays: true } },
            {
                $addFields: {
                    similarity: {
                        $subtract: [
                            100,
                            {
                                $abs: {
                                    $subtract: ['$leadScore', leadScore.totalScore]
                                }
                            }
                        ]
                    }
                }
            },
            { $sort: { similarity: -1 } },
            { $limit: limit },
            {
                $project: {
                    firstName: 1,
                    lastName: 1,
                    companyName: 1,
                    estimatedValue: 1,
                    convertedAt: 1,
                    similarity: 1,
                    conversionTimeDays: {
                        $divide: [
                            { $subtract: ['$convertedAt', '$createdAt'] },
                            1000 * 60 * 60 * 24
                        ]
                    }
                }
            }
        ]);

        return similarLeads;
    }

    static async getRecommendedActions(leadId) {
        const leadScore = await LeadScore.findOne({ leadId }).populate('leadId');
        if (!leadScore) return [];

        const actions = [];

        // Based on score and insights
        if (leadScore.totalScore >= 80) {
            actions.push({
                priority: 'high',
                action: 'schedule_consultation',
                title: 'Schedule Consultation',
                description: 'High-value lead - schedule consultation ASAP'
            });
        }

        if (leadScore.breakdown.engagement.factors.recency.daysSinceContact > 7) {
            actions.push({
                priority: 'medium',
                action: 'follow_up',
                title: 'Follow Up',
                description: 'No contact in over 7 days - send follow-up'
            });
        }

        if (leadScore.breakdown.bant.factors.timeline.value === 'immediate') {
            actions.push({
                priority: 'high',
                action: 'urgent_response',
                title: 'Urgent Response Required',
                description: 'Lead has immediate timeline'
            });
        }

        return actions;
    }

    // ═══════════════════════════════════════════════════════════
    // CONFIGURATION
    // ═══════════════════════════════════════════════════════════

    static async getConfig(firmId) {
        return await LeadScoringConfig.getOrCreateConfig(firmId);
    }

    static async updateConfig(firmId, configData) {
        const config = await LeadScoringConfig.findOne({ firmId });
        if (!config) {
            throw new Error('Config not found');
        }

        // Validate weights
        if (configData.weights) {
            this.validateWeights(configData.weights);
        }

        Object.assign(config, configData);
        await config.save();

        return config;
    }

    static validateWeights(weights) {
        const total = weights.demographic + weights.bant + weights.behavioral + weights.engagement;
        if (Math.abs(total - 100) > 0.01) {
            throw new Error('Weights must sum to 100');
        }
    }

    // ═══════════════════════════════════════════════════════════
    // REPORTING
    // ═══════════════════════════════════════════════════════════

    /**
     * Get all lead scores with pagination
     * @param {ObjectId} id - firmId or lawyerId
     * @param {Boolean} isFirm - true if filtering by firmId, false if by lawyerId
     * @param {Object} options - pagination options
     */
    static async getAllScores(id, isFirm = true, options = {}) {
        const { page = 1, limit = 50 } = options;
        const skip = (page - 1) * limit;

        const query = isFirm ? { firmId: id } : { lawyerId: id };

        // If querying by lawyerId, we need to get leads first then their scores
        if (!isFirm) {
            const leads = await Lead.find({ lawyerId: id }).select('_id');
            const leadIds = leads.map(l => l._id);

            const scores = await LeadScore.find({ leadId: { $in: leadIds } })
                .populate('leadId', 'firstName lastName companyName email phone status')
                .sort({ totalScore: -1 })
                .skip(skip)
                .limit(limit);

            const total = await LeadScore.countDocuments({ leadId: { $in: leadIds } });

            return {
                scores,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            };
        }

        const scores = await LeadScore.find(query)
            .populate('leadId', 'firstName lastName companyName email phone status')
            .sort({ totalScore: -1 })
            .skip(skip)
            .limit(limit);

        const total = await LeadScore.countDocuments(query);

        return {
            scores,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        };
    }

    /**
     * Get lead scoring leaderboard (top performers)
     * @param {ObjectId} id - firmId or lawyerId
     * @param {Boolean} isFirm - true if filtering by firmId, false if by lawyerId
     * @param {Number} limit - number of results
     */
    static async getLeaderboard(id, isFirm = true, limit = 10) {
        if (!isFirm) {
            // For solo lawyers, get their leads first
            const leads = await Lead.find({ lawyerId: id }).select('_id');
            const leadIds = leads.map(l => l._id);

            return await LeadScore.find({ leadId: { $in: leadIds } })
                .populate('leadId', 'firstName lastName companyName email phone status estimatedValue')
                .sort({ totalScore: -1, conversionProbability: -1 })
                .limit(limit)
                .lean();
        }

        return await LeadScore.find({ firmId: id })
            .populate('leadId', 'firstName lastName companyName email phone status estimatedValue')
            .sort({ totalScore: -1, conversionProbability: -1 })
            .limit(limit)
            .lean();
    }

    static async getScoreDistribution(firmId) {
        return await LeadScore.getScoreDistribution(firmId);
    }

    static async getTopLeads(firmId, limit = 20) {
        return await LeadScore.getTopLeads(firmId, limit);
    }

    static async getLeadsByGrade(firmId, grade, options = {}) {
        return await LeadScore.getLeadsByGrade(firmId, grade, options);
    }

    static async getScoreTrends(firmId, dateRange = {}) {
        const startDate = dateRange.start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const endDate = dateRange.end || new Date();

        const trends = await LeadScore.aggregate([
            {
                $match: {
                    firmId: new mongoose.Types.ObjectId(firmId),
                    'scoreHistory.calculatedAt': {
                        $gte: startDate,
                        $lte: endDate
                    }
                }
            },
            { $unwind: '$scoreHistory' },
            {
                $match: {
                    'scoreHistory.calculatedAt': {
                        $gte: startDate,
                        $lte: endDate
                    }
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: {
                            format: '%Y-%m-%d',
                            date: '$scoreHistory.calculatedAt'
                        }
                    },
                    avgScore: { $avg: '$scoreHistory.score' },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        return trends;
    }

    static async getConversionAnalysis(firmId) {
        const analysis = await Lead.aggregate([
            {
                $match: {
                    firmId: new mongoose.Types.ObjectId(firmId),
                    convertedToClient: true
                }
            },
            {
                $lookup: {
                    from: 'leadscores',
                    localField: '_id',
                    foreignField: 'leadId',
                    as: 'scoreData'
                }
            },
            { $unwind: { path: '$scoreData', preserveNullAndEmptyArrays: true } },
            {
                $group: {
                    _id: '$scoreData.grade',
                    count: { $sum: 1 },
                    avgScore: { $avg: '$scoreData.totalScore' },
                    avgValue: { $avg: '$estimatedValue' },
                    avgConversionTime: {
                        $avg: {
                            $divide: [
                                { $subtract: ['$convertedAt', '$createdAt'] },
                                1000 * 60 * 60 * 24
                            ]
                        }
                    }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        return analysis;
    }

    // ═══════════════════════════════════════════════════════════
    // HELPER FUNCTIONS
    // ═══════════════════════════════════════════════════════════

    static calculateFactorScore(factors) {
        const totalWeight = Object.values(factors).reduce((sum, f) => sum + (f.weight || 0), 0);
        if (totalWeight === 0) return 0;

        const weightedScore = Object.values(factors).reduce(
            (sum, f) => sum + (f.score * (f.weight || 0)), 0
        );

        return weightedScore / totalWeight;
    }

    static calculateValueScore(value) {
        // Simple value-based scoring
        if (value >= 1000000) return 100; // >= 10,000 SAR
        if (value >= 500000) return 80;   // >= 5,000 SAR
        if (value >= 200000) return 60;   // >= 2,000 SAR
        if (value >= 50000) return 40;    // >= 500 SAR
        return 20;
    }

    static estimateCompanySize(lead) {
        // Estimate based on available data
        const value = lead.estimatedValue || 0;

        if (value >= 10000000) return 'enterprise'; // >= 100,000 SAR
        if (value >= 5000000) return 'large';       // >= 50,000 SAR
        if (value >= 1000000) return 'medium';      // >= 10,000 SAR
        if (value >= 200000) return 'small';        // >= 2,000 SAR
        return 'micro';
    }

    static getNextCalculationDate(config) {
        const now = new Date();
        const frequency = config.calculationSchedule.frequency;

        switch (frequency) {
            case 'hourly':
                return new Date(now.getTime() + 60 * 60 * 1000);
            case 'daily':
                return new Date(now.getTime() + 24 * 60 * 60 * 1000);
            case 'weekly':
                return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
            default:
                return new Date(now.getTime() + 24 * 60 * 60 * 1000);
        }
    }
}

module.exports = LeadScoringService;
