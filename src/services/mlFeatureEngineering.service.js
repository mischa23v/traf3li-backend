const Lead = require('../models/lead.model');
const CrmActivity = require('../models/crmActivity.model');
const LeadScore = require('../models/leadScore.model');
const mongoose = require('mongoose');
const logger = require('../utils/logger');

// ═══════════════════════════════════════════════════════════════
// ML FEATURE ENGINEERING SERVICE
// Computes features for lead scoring ML models
// ═══════════════════════════════════════════════════════════════

/**
 * Feature Categories:
 * 1. Behavioral Features (highest predictive power)
 *    - engagement_velocity, response_speed_percentile, meeting_reliability, cross_channel_engagement
 * 2. BANT Interaction Features (business logic)
 *    - urgency_signal, decision_maker_access, budget_timeline_fit
 * 3. Temporal Features (critical for B2B)
 *    - activities_last_7d, activities_prev_7d, activity_trend, days_in_current_status
 * 4. Source Quality Features
 *    - source_conversion_rate (historical conversion by source_type)
 */

class MLFeatureEngineeringService {
    // ═══════════════════════════════════════════════════════════════
    // CORE FEATURE EXTRACTION
    // ═══════════════════════════════════════════════════════════════

    /**
     * Extract all features for a lead
     * @param {ObjectId} leadId - Lead ID
     * @param {ObjectId} firmId - Firm ID
     * @returns {Object} Complete feature vector
     */
    static async extractFeatures(leadId, firmId) {
        try {
            // Get lead data with all necessary relations
            const lead = await Lead.findById(leadId);
            if (!lead) {
                throw new Error('Lead not found');
            }

            // Get all activities for this lead
            const activities = await CrmActivity.find({
                entityType: 'lead',
                entityId: leadId
            }).sort({ createdAt: -1 });

            // Compute all feature categories
            const behavioral = await this.computeBehavioralFeatures(lead, activities, firmId);
            const bantInteraction = this.computeBANTInteractionFeatures(lead);
            const temporal = await this.computeTemporalFeatures(lead, activities);
            const sourceQuality = await this.computeSourceQualityFeatures(lead, firmId);

            // Combine all features
            const features = {
                leadId: lead._id,
                firmId: lead.firmId,

                // Behavioral Features
                ...behavioral,

                // BANT Interaction Features
                ...bantInteraction,

                // Temporal Features
                ...temporal,

                // Source Quality Features
                ...sourceQuality,

                // Metadata
                extractedAt: new Date(),
                featureVersion: '1.0'
            };

            // Normalize features to 0-1 range
            const normalizedFeatures = this.normalizeFeatures(features);

            return normalizedFeatures;
        } catch (error) {
            logger.error('Error extracting features for lead:', error);
            throw error;
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // BEHAVIORAL FEATURES (Highest Predictive Power)
    // ═══════════════════════════════════════════════════════════════

    /**
     * Compute behavioral features from lead activities
     * @param {Object} lead - Lead document
     * @param {Array} activities - Lead activities
     * @param {ObjectId} firmId - Firm ID
     * @returns {Object} Behavioral features
     */
    static async computeBehavioralFeatures(lead, activities, firmId) {
        const now = Date.now();
        const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);
        const fourteenDaysAgo = now - (14 * 24 * 60 * 60 * 1000);

        // ───────────────────────────────────────────────────────────
        // 1. Engagement Velocity
        // ───────────────────────────────────────────────────────────
        const activitiesLast7d = activities.filter(a =>
            a.createdAt.getTime() >= sevenDaysAgo
        ).length;

        const activitiesPrev7d = activities.filter(a =>
            a.createdAt.getTime() >= fourteenDaysAgo &&
            a.createdAt.getTime() < sevenDaysAgo
        ).length;

        // Engagement velocity = ratio of recent to previous activity
        const engagementVelocity = activitiesPrev7d > 0
            ? activitiesLast7d / activitiesPrev7d
            : activitiesLast7d; // If no previous activity, use current count

        // ───────────────────────────────────────────────────────────
        // 2. Response Speed Percentile
        // ───────────────────────────────────────────────────────────
        const responseTimes = [];
        for (let i = 0; i < activities.length - 1; i++) {
            const current = activities[i];
            const previous = activities[i + 1];
            if (current.type !== 'note' && previous.type !== 'note') {
                const hoursDiff = (current.createdAt - previous.createdAt) / (1000 * 60 * 60);
                responseTimes.push(hoursDiff);
            }
        }

        const avgResponseTime = responseTimes.length > 0
            ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
            : null;

        // Calculate percentile rank within firm
        let responseSpeedPercentile = 50; // Default to median
        if (avgResponseTime !== null && firmId) {
            const allLeadResponseTimes = await this.getFirmResponseTimes(firmId);
            if (allLeadResponseTimes.length > 0) {
                const fasterCount = allLeadResponseTimes.filter(rt => rt > avgResponseTime).length;
                responseSpeedPercentile = (fasterCount / allLeadResponseTimes.length) * 100;
            }
        }

        // ───────────────────────────────────────────────────────────
        // 3. Meeting Reliability
        // ───────────────────────────────────────────────────────────
        const meetingActivities = activities.filter(a => a.type === 'meeting');
        const attendedMeetings = meetingActivities.filter(
            a => a.meetingData?.outcome === 'completed'
        ).length;
        const noShowMeetings = meetingActivities.filter(
            a => a.meetingData?.outcome === 'no_show'
        ).length;

        const totalMeetings = attendedMeetings + noShowMeetings;
        const meetingReliability = totalMeetings > 0
            ? attendedMeetings / totalMeetings
            : 0.5; // Default neutral score if no meetings

        // ───────────────────────────────────────────────────────────
        // 4. Cross-Channel Engagement
        // ───────────────────────────────────────────────────────────
        const availableChannels = ['call', 'email', 'meeting', 'whatsapp', 'sms'];
        const usedChannels = new Set(activities.map(a => a.type));
        const engagedChannels = availableChannels.filter(ch => usedChannels.has(ch)).length;

        const crossChannelEngagement = engagedChannels / availableChannels.length;

        // ───────────────────────────────────────────────────────────
        // 5. Email Engagement Score
        // ───────────────────────────────────────────────────────────
        const emailActivities = activities.filter(a => a.type === 'email');
        const emailOpens = emailActivities.filter(a => a.emailData?.opened).length;
        const emailClicks = emailActivities.filter(a => a.emailData?.clicked).length;
        const emailReplies = emailActivities.filter(a => a.emailData?.replied).length;

        const emailEngagementScore = emailActivities.length > 0
            ? (emailOpens * 1 + emailClicks * 2 + emailReplies * 3) / (emailActivities.length * 6)
            : 0;

        // ───────────────────────────────────────────────────────────
        // 6. Call Engagement Score
        // ───────────────────────────────────────────────────────────
        const callActivities = activities.filter(a => a.type === 'call');
        const totalCallDuration = callActivities.reduce(
            (sum, a) => sum + ((a.callData?.duration || 0) / 60), 0
        ); // in minutes

        const avgCallDuration = callActivities.length > 0
            ? totalCallDuration / callActivities.length
            : 0;

        // Normalize: 30+ min call is excellent (score 1.0)
        const callEngagementScore = Math.min(1.0, avgCallDuration / 30);

        // ───────────────────────────────────────────────────────────
        // 7. Document View Engagement
        // ───────────────────────────────────────────────────────────
        const documentActivities = activities.filter(a => a.type === 'document');
        const documentViewCount = documentActivities.length;

        // Normalize: 5+ document views is excellent
        const documentEngagementScore = Math.min(1.0, documentViewCount / 5);

        return {
            // Primary behavioral features
            engagement_velocity: engagementVelocity,
            response_speed_percentile: responseSpeedPercentile,
            meeting_reliability: meetingReliability,
            cross_channel_engagement: crossChannelEngagement,

            // Secondary behavioral features
            email_engagement_score: emailEngagementScore,
            call_engagement_score: callEngagementScore,
            document_engagement_score: documentEngagementScore,

            // Raw counts (for reference)
            total_activities: activities.length,
            meeting_count: meetingActivities.length,
            attended_meetings: attendedMeetings,
            no_show_meetings: noShowMeetings,
            email_open_rate: emailActivities.length > 0 ? emailOpens / emailActivities.length : 0,
            email_click_rate: emailActivities.length > 0 ? emailClicks / emailActivities.length : 0,
            email_reply_rate: emailActivities.length > 0 ? emailReplies / emailActivities.length : 0,
            avg_call_duration_minutes: avgCallDuration,
            avg_response_time_hours: avgResponseTime
        };
    }

    /**
     * Get average response times for all leads in firm (for percentile calculation)
     */
    static async getFirmResponseTimes(firmId) {
        try {
            const leads = await Lead.find({ firmId }).select('_id').limit(1000);
            const leadIds = leads.map(l => l._id);

            const responseTimes = [];

            for (const leadId of leadIds) {
                const activities = await CrmActivity.find({
                    entityType: 'lead',
                    entityId: leadId
                }).sort({ createdAt: -1 }).limit(20);

                for (let i = 0; i < activities.length - 1; i++) {
                    const current = activities[i];
                    const previous = activities[i + 1];
                    if (current.type !== 'note' && previous.type !== 'note') {
                        const hoursDiff = (current.createdAt - previous.createdAt) / (1000 * 60 * 60);
                        responseTimes.push(hoursDiff);
                    }
                }
            }

            return responseTimes;
        } catch (error) {
            logger.error('Error calculating firm response times:', error);
            return [];
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // BANT INTERACTION FEATURES (Business Logic)
    // ═══════════════════════════════════════════════════════════════

    /**
     * Compute BANT interaction features
     * @param {Object} lead - Lead document
     * @returns {Object} BANT interaction features
     */
    static computeBANTInteractionFeatures(lead) {
        const qualification = lead.qualification || {};

        // ───────────────────────────────────────────────────────────
        // 1. Urgency Signal (composite of timeline, need, and recency)
        // ───────────────────────────────────────────────────────────
        const timelineScores = {
            'immediate': 1.0,
            'this_month': 0.8,
            'this_quarter': 0.6,
            'this_year': 0.4,
            'no_timeline': 0.1,
            'unknown': 0.2
        };

        const needScores = {
            'urgent': 1.0,
            'planning': 0.6,
            'exploring': 0.3,
            'unknown': 0.2
        };

        const timelineScore = timelineScores[qualification.timeline] || 0.2;
        const needScore = needScores[qualification.need] || 0.2;

        // Recency score (based on last contact)
        const daysSinceContact = lead.lastContactedAt
            ? Math.floor((Date.now() - lead.lastContactedAt.getTime()) / (1000 * 60 * 60 * 24))
            : 999;

        const recencyScore = daysSinceContact <= 1 ? 1.0 :
                           daysSinceContact <= 3 ? 0.8 :
                           daysSinceContact <= 7 ? 0.6 :
                           daysSinceContact <= 14 ? 0.4 :
                           daysSinceContact <= 30 ? 0.2 : 0.1;

        // Urgency signal is the product of timeline, need, and recency
        const urgencySignal = timelineScore * needScore * recencyScore;

        // ───────────────────────────────────────────────────────────
        // 2. Decision Maker Access
        // ───────────────────────────────────────────────────────────
        const authorityScores = {
            'decision_maker': 1.0,
            'influencer': 0.6,
            'researcher': 0.3,
            'unknown': 0.2
        };

        const decisionMakerAccess = authorityScores[qualification.authority] || 0.2;

        // ───────────────────────────────────────────────────────────
        // 3. Budget Timeline Fit
        // ───────────────────────────────────────────────────────────
        const budgetScores = {
            'premium': 1.0,
            'high': 0.8,
            'medium': 0.6,
            'low': 0.3,
            'unknown': 0.2
        };

        const budgetScore = budgetScores[qualification.budget] || 0.2;

        // Budget-timeline fit is the product of budget and timeline
        const budgetTimelineFit = budgetScore * timelineScore;

        // ───────────────────────────────────────────────────────────
        // 4. BANT Completeness
        // ───────────────────────────────────────────────────────────
        const bantFields = ['budget', 'authority', 'need', 'timeline'];
        const completedFields = bantFields.filter(
            field => qualification[field] && qualification[field] !== 'unknown'
        ).length;

        const bantCompleteness = completedFields / bantFields.length;

        // ───────────────────────────────────────────────────────────
        // 5. Estimated Value Score
        // ───────────────────────────────────────────────────────────
        const estimatedValue = lead.estimatedValue || lead.intake?.estimatedValue || 0;

        // Normalize estimated value (assuming SAR halalas)
        // 1,000,000 halalas = 10,000 SAR (high value case)
        const valueScore = Math.min(1.0, estimatedValue / 1000000);

        return {
            // Primary BANT interaction features
            urgency_signal: urgencySignal,
            decision_maker_access: decisionMakerAccess,
            budget_timeline_fit: budgetTimelineFit,

            // Secondary BANT features
            bant_completeness: bantCompleteness,
            estimated_value_score: valueScore,

            // Individual BANT scores
            timeline_score: timelineScore,
            need_score: needScore,
            budget_score: budgetScore,
            authority_score: decisionMakerAccess,

            // Raw values
            estimated_value: estimatedValue,
            budget: qualification.budget || 'unknown',
            authority: qualification.authority || 'unknown',
            need: qualification.need || 'unknown',
            timeline: qualification.timeline || 'unknown'
        };
    }

    // ═══════════════════════════════════════════════════════════════
    // TEMPORAL FEATURES (Critical for B2B)
    // ═══════════════════════════════════════════════════════════════

    /**
     * Compute temporal features
     * @param {Object} lead - Lead document
     * @param {Array} activities - Lead activities
     * @returns {Object} Temporal features
     */
    static async computeTemporalFeatures(lead, activities) {
        const now = Date.now();
        const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);
        const fourteenDaysAgo = now - (14 * 24 * 60 * 60 * 1000);
        const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);

        // ───────────────────────────────────────────────────────────
        // 1. Activities Last 7 Days
        // ───────────────────────────────────────────────────────────
        const activitiesLast7d = activities.filter(a =>
            a.createdAt.getTime() >= sevenDaysAgo
        ).length;

        // ───────────────────────────────────────────────────────────
        // 2. Activities Previous 7 Days (8-14 days ago)
        // ───────────────────────────────────────────────────────────
        const activitiesPrev7d = activities.filter(a =>
            a.createdAt.getTime() >= fourteenDaysAgo &&
            a.createdAt.getTime() < sevenDaysAgo
        ).length;

        // ───────────────────────────────────────────────────────────
        // 3. Activity Trend
        // ───────────────────────────────────────────────────────────
        // Positive value = increasing activity, negative = decreasing
        const activityTrend = activitiesLast7d - activitiesPrev7d;

        // ───────────────────────────────────────────────────────────
        // 4. Days in Current Status
        // ───────────────────────────────────────────────────────────
        // Find last status change activity
        const statusChangeActivity = activities.find(a => a.type === 'status_change');
        const statusChangeDate = statusChangeActivity
            ? statusChangeActivity.createdAt.getTime()
            : lead.createdAt.getTime();

        const daysInCurrentStatus = Math.floor((now - statusChangeDate) / (1000 * 60 * 60 * 24));

        // ───────────────────────────────────────────────────────────
        // 5. Days Since Created
        // ───────────────────────────────────────────────────────────
        const daysSinceCreated = Math.floor((now - lead.createdAt.getTime()) / (1000 * 60 * 60 * 24));

        // ───────────────────────────────────────────────────────────
        // 6. Days Since Last Contact
        // ───────────────────────────────────────────────────────────
        const daysSinceLastContact = lead.lastContactedAt
            ? Math.floor((now - lead.lastContactedAt.getTime()) / (1000 * 60 * 60 * 24))
            : daysSinceCreated;

        // ───────────────────────────────────────────────────────────
        // 7. Activity Distribution (last 30 days)
        // ───────────────────────────────────────────────────────────
        const activitiesLast30d = activities.filter(a =>
            a.createdAt.getTime() >= thirtyDaysAgo
        );

        // Count activities by week
        const weekBuckets = [0, 0, 0, 0]; // [current week, -1 week, -2 weeks, -3 weeks]
        activitiesLast30d.forEach(activity => {
            const daysAgo = Math.floor((now - activity.createdAt.getTime()) / (1000 * 60 * 60 * 24));
            const weekIndex = Math.floor(daysAgo / 7);
            if (weekIndex < 4) {
                weekBuckets[weekIndex]++;
            }
        });

        // Activity consistency (coefficient of variation)
        const avgWeeklyActivity = weekBuckets.reduce((a, b) => a + b, 0) / 4;
        const variance = weekBuckets.reduce((sum, val) => sum + Math.pow(val - avgWeeklyActivity, 2), 0) / 4;
        const stdDev = Math.sqrt(variance);
        const activityConsistency = avgWeeklyActivity > 0 ? 1 - (stdDev / avgWeeklyActivity) : 0;

        // ───────────────────────────────────────────────────────────
        // 8. Time to Next Follow-up
        // ───────────────────────────────────────────────────────────
        const daysToNextFollowup = lead.nextFollowUpDate
            ? Math.floor((lead.nextFollowUpDate.getTime() - now) / (1000 * 60 * 60 * 24))
            : null;

        // Normalize: negative = overdue, 0 = today, positive = future
        const followupUrgency = daysToNextFollowup !== null
            ? (daysToNextFollowup <= 0 ? 1.0 : Math.max(0, 1 - (daysToNextFollowup / 30)))
            : 0.5;

        return {
            // Primary temporal features
            activities_last_7d: activitiesLast7d,
            activities_prev_7d: activitiesPrev7d,
            activity_trend: activityTrend,
            days_in_current_status: daysInCurrentStatus,

            // Secondary temporal features
            days_since_created: daysSinceCreated,
            days_since_last_contact: daysSinceLastContact,
            activity_consistency: activityConsistency,
            followup_urgency: followupUrgency,

            // Activity distribution
            activities_last_30d: activitiesLast30d.length,
            weekly_activity_avg: avgWeeklyActivity,

            // Raw values
            next_followup_date: lead.nextFollowUpDate,
            days_to_next_followup: daysToNextFollowup,
            current_status: lead.status
        };
    }

    // ═══════════════════════════════════════════════════════════════
    // SOURCE QUALITY FEATURES
    // ═══════════════════════════════════════════════════════════════

    /**
     * Compute source quality features
     * @param {Object} lead - Lead document
     * @param {ObjectId} firmId - Firm ID
     * @returns {Object} Source quality features
     */
    static async computeSourceQualityFeatures(lead, firmId) {
        const sourceType = lead.source?.type || 'other';

        // ───────────────────────────────────────────────────────────
        // 1. Source Conversion Rate
        // ───────────────────────────────────────────────────────────
        const conversionRates = await this.getSourceConversionRates(firmId);
        const sourceConversionRate = conversionRates[sourceType] || 0.5; // Default 50%

        // ───────────────────────────────────────────────────────────
        // 2. Source Quality Score
        // ───────────────────────────────────────────────────────────
        // Referrals and events typically higher quality
        const sourceQualityScores = {
            'referral': 0.9,
            'event': 0.8,
            'website': 0.7,
            'social_media': 0.6,
            'advertising': 0.5,
            'cold_call': 0.4,
            'walk_in': 0.7,
            'other': 0.5
        };

        const sourceQualityScore = sourceQualityScores[sourceType] || 0.5;

        // ───────────────────────────────────────────────────────────
        // 3. Referral Quality (if applicable)
        // ───────────────────────────────────────────────────────────
        const hasReferral = sourceType === 'referral' && lead.source?.referralId;
        const referralQuality = hasReferral ? 1.0 : 0.0;

        return {
            // Primary source features
            source_conversion_rate: sourceConversionRate,
            source_quality_score: sourceQualityScore,

            // Secondary source features
            referral_quality: referralQuality,
            has_referral: hasReferral ? 1 : 0,

            // Raw values
            source_type: sourceType,
            source_campaign: lead.source?.campaign || null,
            source_medium: lead.source?.medium || null
        };
    }

    /**
     * Get historical conversion rates by source
     * @param {ObjectId} firmId - Firm ID
     * @returns {Object} Conversion rates by source type
     */
    static async getSourceConversionRates(firmId) {
        try {
            const conversionStats = await Lead.aggregate([
                {
                    $match: {
                        firmId: new mongoose.Types.ObjectId(firmId)
                    }
                },
                {
                    $group: {
                        _id: '$source.type',
                        total: { $sum: 1 },
                        converted: {
                            $sum: { $cond: ['$convertedToClient', 1, 0] }
                        }
                    }
                },
                {
                    $project: {
                        sourceType: '$_id',
                        total: 1,
                        converted: 1,
                        conversionRate: {
                            $cond: [
                                { $gt: ['$total', 0] },
                                { $divide: ['$converted', '$total'] },
                                0.5 // Default if no data
                            ]
                        }
                    }
                },
                { $limit: 1000 }
            ]);

            // Convert to object format
            const rates = {};
            conversionStats.forEach(stat => {
                rates[stat.sourceType || 'other'] = stat.conversionRate;
            });

            return rates;
        } catch (error) {
            logger.error('Error calculating source conversion rates:', error);
            return {};
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // FEATURE NORMALIZATION
    // ═══════════════════════════════════════════════════════════════

    /**
     * Normalize features to 0-1 range
     * @param {Object} features - Raw features
     * @param {Object} normalizationParams - Optional custom normalization parameters
     * @returns {Object} Normalized features
     */
    static normalizeFeatures(features, normalizationParams = null) {
        // Default normalization parameters (can be customized per firm)
        const defaults = {
            // Behavioral
            engagement_velocity: { min: 0, max: 5 }, // 5x velocity is excellent
            response_speed_percentile: { min: 0, max: 100 },
            meeting_reliability: { min: 0, max: 1 },
            cross_channel_engagement: { min: 0, max: 1 },
            email_engagement_score: { min: 0, max: 1 },
            call_engagement_score: { min: 0, max: 1 },
            document_engagement_score: { min: 0, max: 1 },

            // BANT Interaction
            urgency_signal: { min: 0, max: 1 },
            decision_maker_access: { min: 0, max: 1 },
            budget_timeline_fit: { min: 0, max: 1 },
            bant_completeness: { min: 0, max: 1 },
            estimated_value_score: { min: 0, max: 1 },

            // Temporal
            activities_last_7d: { min: 0, max: 20 }, // 20+ activities is very active
            activities_prev_7d: { min: 0, max: 20 },
            activity_trend: { min: -10, max: 10 },
            days_in_current_status: { min: 0, max: 90 }, // 90+ days is stale
            days_since_created: { min: 0, max: 180 },
            days_since_last_contact: { min: 0, max: 90 },
            activity_consistency: { min: 0, max: 1 },
            followup_urgency: { min: 0, max: 1 },

            // Source Quality
            source_conversion_rate: { min: 0, max: 1 },
            source_quality_score: { min: 0, max: 1 },
            referral_quality: { min: 0, max: 1 }
        };

        const params = normalizationParams || defaults;
        const normalized = { ...features };

        // Normalize each feature using min-max scaling
        Object.keys(params).forEach(key => {
            if (features[key] !== undefined && features[key] !== null) {
                const { min, max } = params[key];
                const value = features[key];

                // Min-max normalization: (value - min) / (max - min)
                normalized[key] = Math.max(0, Math.min(1, (value - min) / (max - min)));
            }
        });

        return normalized;
    }

    // ═══════════════════════════════════════════════════════════════
    // BATCH OPERATIONS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Batch extract features for multiple leads
     * @param {Array} leadIds - Array of lead IDs
     * @param {ObjectId} firmId - Firm ID
     * @returns {Array} Array of feature vectors
     */
    static async batchExtractFeatures(leadIds, firmId) {
        const results = [];

        for (const leadId of leadIds) {
            try {
                const features = await this.extractFeatures(leadId, firmId);
                results.push({
                    leadId,
                    success: true,
                    features
                });
            } catch (error) {
                logger.error(`Error extracting features for lead ${leadId}:`, error);
                results.push({
                    leadId,
                    success: false,
                    error: error.message
                });
            }
        }

        return results;
    }

    // ═══════════════════════════════════════════════════════════════
    // FEATURE STORAGE
    // ═══════════════════════════════════════════════════════════════

    /**
     * Store computed features for a lead
     * @param {ObjectId} leadId - Lead ID
     * @param {Object} features - Feature vector
     */
    static async storeFeatures(leadId, features) {
        try {
            const leadScore = await LeadScore.findOne({ leadId });

            if (leadScore) {
                // Store features in metadata for ML training
                if (!leadScore.calculation) {
                    leadScore.calculation = {};
                }

                leadScore.calculation.mlFeatures = features;
                leadScore.calculation.featuresLastComputedAt = new Date();

                await leadScore.save();
            }

            return { success: true };
        } catch (error) {
            logger.error('Error storing features:', error);
            throw error;
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // FEATURE EXPORT (for ML model training)
    // ═══════════════════════════════════════════════════════════════

    /**
     * Export features for ML model training
     * @param {ObjectId} firmId - Firm ID
     * @param {Object} options - Export options
     * @returns {Array} Training dataset
     */
    static async exportTrainingDataset(firmId, options = {}) {
        try {
            const query = { firmId };

            // Include only converted leads if specified
            if (options.includeConverted) {
                query.convertedToClient = true;
            }

            const leads = await Lead.find(query).limit(options.limit || 1000);
            const trainingData = [];

            for (const lead of leads) {
                try {
                    const features = await this.extractFeatures(lead._id, firmId);

                    trainingData.push({
                        leadId: lead._id,
                        features,
                        label: lead.convertedToClient ? 1 : 0, // Target variable
                        conversionTime: lead.convertedAt
                            ? Math.floor((lead.convertedAt - lead.createdAt) / (1000 * 60 * 60 * 24))
                            : null
                    });
                } catch (error) {
                    logger.error(`Error exporting features for lead ${lead._id}:`, error);
                }
            }

            return trainingData;
        } catch (error) {
            logger.error('Error exporting training dataset:', error);
            throw error;
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // FEATURE IMPORTANCE ANALYSIS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Calculate feature importance based on correlation with conversion
     * @param {ObjectId} firmId - Firm ID
     * @returns {Object} Feature importance scores
     */
    static async calculateFeatureImportance(firmId) {
        try {
            const trainingData = await this.exportTrainingDataset(firmId, { limit: 500 });

            if (trainingData.length < 10) {
                return { error: 'Insufficient data for feature importance analysis' };
            }

            // Calculate correlation between each feature and conversion
            const featureKeys = Object.keys(trainingData[0].features).filter(
                key => typeof trainingData[0].features[key] === 'number'
            );

            const importance = {};

            featureKeys.forEach(key => {
                const values = trainingData.map(d => d.features[key] || 0);
                const labels = trainingData.map(d => d.label);

                // Calculate Pearson correlation coefficient
                const correlation = this.calculateCorrelation(values, labels);
                importance[key] = Math.abs(correlation);
            });

            // Sort by importance
            const sortedImportance = Object.entries(importance)
                .sort((a, b) => b[1] - a[1])
                .reduce((acc, [key, value]) => {
                    acc[key] = value;
                    return acc;
                }, {});

            return sortedImportance;
        } catch (error) {
            logger.error('Error calculating feature importance:', error);
            throw error;
        }
    }

    /**
     * Calculate Pearson correlation coefficient
     */
    static calculateCorrelation(x, y) {
        const n = x.length;
        const sumX = x.reduce((a, b) => a + b, 0);
        const sumY = y.reduce((a, b) => a + b, 0);
        const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
        const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
        const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);

        const numerator = n * sumXY - sumX * sumY;
        const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

        return denominator === 0 ? 0 : numerator / denominator;
    }
}

module.exports = MLFeatureEngineeringService;
