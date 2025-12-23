const Lead = require('../models/lead.model');
const LeadScore = require('../models/leadScore.model');
const CrmActivity = require('../models/crmActivity.model');
const User = require('../models/user.model');
const mongoose = require('mongoose');
const logger = require('../utils/logger');

// ═══════════════════════════════════════════════════════════════
// SALES PRIORITIZATION SERVICE
// Manages lead priority queues and SLA enforcement
// ═══════════════════════════════════════════════════════════════

/**
 * Priority Tiers:
 * - P1_HOT: Score > 80 OR expectedValue > 100000 (respond in 5min)
 * - P2_WARM: Score > 60 OR expectedValue > 50000 (respond in 2hr)
 * - P3_COOL: Score > 40 (respond in 24hr)
 * - P4_NURTURE: Score <= 40 (auto campaign)
 */

const SLA_TARGETS = {
    P1_HOT: { response: 5 * 60 * 1000, escalation: 15 * 60 * 1000 }, // 5min, 15min
    P2_WARM: { response: 2 * 60 * 60 * 1000, escalation: 4 * 60 * 60 * 1000 }, // 2hr, 4hr
    P3_COOL: { response: 24 * 60 * 60 * 1000, escalation: 48 * 60 * 60 * 1000 }, // 24hr, 48hr
    P4_NURTURE: { response: 48 * 60 * 60 * 1000, escalation: null } // 48hr, auto
};

const PRIORITY_WEIGHTS = {
    P1_HOT: 1000,
    P2_WARM: 500,
    P3_COOL: 100,
    P4_NURTURE: 10
};

class SalesPrioritizationService {
    // ═══════════════════════════════════════════════════════════
    // CORE PRIORITIZATION LOGIC
    // ═══════════════════════════════════════════════════════════

    /**
     * Calculate expected value for a lead
     * expectedValue = probability * estimatedDealValue
     * @param {Number} probability - Conversion probability (0-100)
     * @param {Number} estimatedValue - Estimated deal value in halalas
     * @returns {Number} Expected value
     */
    static calculateExpectedValue(probability, estimatedValue) {
        if (!probability || !estimatedValue) return 0;

        // Normalize probability to 0-1 range if it's in 0-100
        const normalizedProb = probability > 1 ? probability / 100 : probability;

        return Math.round(normalizedProb * estimatedValue);
    }

    /**
     * Determine priority tier based on score and expected value
     * @param {Number} score - Lead score (0-100)
     * @param {Number} expectedValue - Expected value in halalas
     * @param {Object} additionalFactors - Additional factors (urgency, timeline, etc.)
     * @returns {String} Priority tier (P1_HOT, P2_WARM, P3_COOL, P4_NURTURE)
     */
    static determinePriorityTier(score, expectedValue, additionalFactors = {}) {
        // P1_HOT: High score OR high value OR urgent timeline
        if (score >= 80 || expectedValue >= 100000 || additionalFactors.timeline === 'immediate') {
            return 'P1_HOT';
        }

        // P2_WARM: Good score OR medium-high value OR short timeline
        if (score >= 60 || expectedValue >= 50000 || additionalFactors.timeline === 'this_month') {
            return 'P2_WARM';
        }

        // P3_COOL: Moderate score OR medium value
        if (score >= 40 || expectedValue >= 20000) {
            return 'P3_COOL';
        }

        // P4_NURTURE: Low score and low value
        return 'P4_NURTURE';
    }

    /**
     * Assign priority to a lead and set SLA deadline
     * @param {ObjectId} leadId - Lead ID
     * @param {ObjectId} firmId - Firm ID
     * @returns {Object} Updated lead with priority and SLA info
     */
    static async assignPriority(leadId, firmId) {
        try {
            const lead = await Lead.findById(leadId);
            if (!lead) {
                throw new Error('Lead not found');
            }

            // Get lead score
            let leadScore = await LeadScore.findOne({ leadId });
            const score = leadScore ? leadScore.totalScore : 0;
            const conversionProb = leadScore ? leadScore.conversionProbability : lead.probability || 10;

            // Calculate expected value
            const expectedValue = this.calculateExpectedValue(
                conversionProb,
                lead.estimatedValue || 0
            );

            // Get additional factors
            const additionalFactors = {
                timeline: lead.qualification?.timeline,
                urgency: lead.intake?.urgency,
                need: lead.qualification?.need,
                authority: lead.qualification?.authority
            };

            // Determine priority tier
            const priorityTier = this.determinePriorityTier(score, expectedValue, additionalFactors);

            // Calculate SLA deadline
            const now = new Date();
            const slaTarget = SLA_TARGETS[priorityTier];
            const slaDeadline = new Date(now.getTime() + slaTarget.response);
            const escalationDeadline = slaTarget.escalation
                ? new Date(now.getTime() + slaTarget.escalation)
                : null;

            // Update lead with priority data
            if (!lead.customFields) {
                lead.customFields = {};
            }

            lead.customFields.prioritization = {
                tier: priorityTier,
                score: score,
                expectedValue: expectedValue,
                slaDeadline: slaDeadline,
                escalationDeadline: escalationDeadline,
                assignedAt: now,
                slaStatus: 'pending', // pending, met, breached, escalated
                breachReason: null,
                escalatedTo: null,
                escalatedAt: null,
                responseTime: null,
                contactedAt: null
            };

            await lead.save();

            // Log priority assignment
            await CrmActivity.logActivity({
                lawyerId: lead.lawyerId,
                firmId: firmId,
                type: 'note',
                entityType: 'lead',
                entityId: lead._id,
                entityName: lead.displayName,
                title: `Priority assigned: ${priorityTier}`,
                description: `Lead prioritized as ${priorityTier}. SLA deadline: ${slaDeadline.toISOString()}. Expected value: ${expectedValue} halalas.`,
                performedBy: lead.lawyerId
            });

            return {
                leadId: lead._id,
                priorityTier,
                score,
                expectedValue,
                slaDeadline,
                escalationDeadline
            };
        } catch (error) {
            logger.error('Error assigning priority:', error);
            throw error;
        }
    }

    // ═══════════════════════════════════════════════════════════
    // PRIORITY QUEUE MANAGEMENT
    // ═══════════════════════════════════════════════════════════

    /**
     * Get prioritized queue for a sales rep
     * Returns leads sorted by priority and SLA urgency
     * @param {ObjectId} userId - User ID (sales rep)
     * @param {ObjectId} firmId - Firm ID
     * @param {Object} options - Filter options
     * @returns {Array} Prioritized leads
     */
    static async getPriorityQueue(userId, firmId, options = {}) {
        try {
            const {
                limit = 50,
                skip = 0,
                tierFilter = null, // Filter by specific tier
                includeUnassigned = false,
                slaStatus = null // Filter by SLA status
            } = options;

            // Build query
            const query = {
                firmId: new mongoose.Types.ObjectId(firmId),
                convertedToClient: false,
                status: { $nin: ['won', 'lost', 'dormant'] }
            };

            // Assignment filter
            if (includeUnassigned) {
                query.$or = [
                    { assignedTo: new mongoose.Types.ObjectId(userId) },
                    { assignedTo: { $exists: false } },
                    { assignedTo: null }
                ];
            } else {
                query.assignedTo = new mongoose.Types.ObjectId(userId);
            }

            // Tier filter
            if (tierFilter) {
                query['customFields.prioritization.tier'] = tierFilter;
            }

            // SLA status filter
            if (slaStatus) {
                query['customFields.prioritization.slaStatus'] = slaStatus;
            }

            const leads = await Lead.find(query)
                .populate('assignedTo', 'firstName lastName email')
                .populate('source.referralId', 'name')
                .lean();

            // Enrich with score data
            const leadIds = leads.map(l => l._id);
            const leadScores = await LeadScore.find({
                leadId: { $in: leadIds }
            }).lean();

            const scoreMap = {};
            leadScores.forEach(ls => {
                scoreMap[ls.leadId.toString()] = ls;
            });

            // Calculate urgency score for each lead
            const now = Date.now();
            const enrichedLeads = leads.map(lead => {
                const leadScoreData = scoreMap[lead._id.toString()];
                const prioritization = lead.customFields?.prioritization || {};

                // Calculate SLA urgency (0-100, higher = more urgent)
                let slaUrgency = 0;
                if (prioritization.slaDeadline) {
                    const timeRemaining = new Date(prioritization.slaDeadline).getTime() - now;
                    const slaTarget = SLA_TARGETS[prioritization.tier]?.response || 86400000;

                    if (timeRemaining < 0) {
                        // Overdue
                        slaUrgency = 100;
                    } else {
                        // Calculate urgency based on time remaining
                        slaUrgency = Math.max(0, 100 - (timeRemaining / slaTarget * 100));
                    }
                }

                // Calculate priority score (weighted combination)
                const tierWeight = PRIORITY_WEIGHTS[prioritization.tier] || 10;
                const scoreWeight = (leadScoreData?.totalScore || 0) * 5;
                const urgencyWeight = slaUrgency * 3;
                const expectedValueWeight = (prioritization.expectedValue || 0) / 1000;

                const priorityScore = tierWeight + scoreWeight + urgencyWeight + expectedValueWeight;

                return {
                    ...lead,
                    scoreData: leadScoreData,
                    priorityScore,
                    slaUrgency,
                    timeUntilSLA: prioritization.slaDeadline
                        ? new Date(prioritization.slaDeadline).getTime() - now
                        : null,
                    isSLABreached: prioritization.slaDeadline
                        ? new Date(prioritization.slaDeadline).getTime() < now
                        : false
                };
            });

            // Sort by priority score (descending)
            enrichedLeads.sort((a, b) => b.priorityScore - a.priorityScore);

            return {
                leads: enrichedLeads.slice(skip, skip + limit),
                total: enrichedLeads.length,
                summary: {
                    totalLeads: enrichedLeads.length,
                    byTier: {
                        P1_HOT: enrichedLeads.filter(l => l.customFields?.prioritization?.tier === 'P1_HOT').length,
                        P2_WARM: enrichedLeads.filter(l => l.customFields?.prioritization?.tier === 'P2_WARM').length,
                        P3_COOL: enrichedLeads.filter(l => l.customFields?.prioritization?.tier === 'P3_COOL').length,
                        P4_NURTURE: enrichedLeads.filter(l => l.customFields?.prioritization?.tier === 'P4_NURTURE').length
                    },
                    breached: enrichedLeads.filter(l => l.isSLABreached).length,
                    urgent: enrichedLeads.filter(l => l.slaUrgency >= 80).length
                }
            };
        } catch (error) {
            logger.error('Error getting priority queue:', error);
            throw error;
        }
    }

    // ═══════════════════════════════════════════════════════════
    // SLA MANAGEMENT
    // ═══════════════════════════════════════════════════════════

    /**
     * Check for SLA breaches and trigger escalations
     * @param {ObjectId} firmId - Firm ID
     * @returns {Object} Breach report
     */
    static async checkSLABreaches(firmId) {
        try {
            const now = new Date();

            // Find leads with SLA deadlines that have passed
            const breachedLeads = await Lead.find({
                firmId: new mongoose.Types.ObjectId(firmId),
                convertedToClient: false,
                status: { $nin: ['won', 'lost', 'dormant'] },
                'customFields.prioritization.slaDeadline': { $lt: now },
                'customFields.prioritization.slaStatus': 'pending'
            });

            const breaches = [];
            const escalations = [];

            for (const lead of breachedLeads) {
                const prioritization = lead.customFields.prioritization;
                const timeSinceBreach = now - new Date(prioritization.slaDeadline);

                // Update SLA status to breached
                prioritization.slaStatus = 'breached';
                prioritization.breachReason = 'No response within SLA target';
                prioritization.breachTime = now;

                // Check if escalation is needed
                if (prioritization.escalationDeadline &&
                    new Date(prioritization.escalationDeadline) < now) {

                    // Escalate lead
                    const escalation = await this.escalateLead(
                        lead._id,
                        'SLA escalation deadline exceeded'
                    );

                    escalations.push({
                        leadId: lead._id,
                        leadName: lead.displayName,
                        tier: prioritization.tier,
                        escalation
                    });
                } else {
                    breaches.push({
                        leadId: lead._id,
                        leadName: lead.displayName,
                        tier: prioritization.tier,
                        timeSinceBreach,
                        assignedTo: lead.assignedTo
                    });
                }

                await lead.save();

                // Log SLA breach
                await CrmActivity.logActivity({
                    lawyerId: lead.lawyerId,
                    firmId: firmId,
                    type: 'note',
                    entityType: 'lead',
                    entityId: lead._id,
                    entityName: lead.displayName,
                    title: 'SLA breach detected',
                    description: `Lead SLA deadline exceeded. Tier: ${prioritization.tier}. Time since breach: ${Math.round(timeSinceBreach / 60000)} minutes.`,
                    performedBy: lead.lawyerId
                });
            }

            return {
                totalBreaches: breaches.length + escalations.length,
                breaches,
                escalations,
                checkedAt: now
            };
        } catch (error) {
            logger.error('Error checking SLA breaches:', error);
            throw error;
        }
    }

    /**
     * Escalate a lead to manager/senior rep
     * @param {ObjectId} leadId - Lead ID
     * @param {String} reason - Escalation reason
     * @returns {Object} Escalation result
     */
    static async escalateLead(leadId, reason) {
        try {
            const lead = await Lead.findById(leadId).populate('assignedTo');
            if (!lead) {
                throw new Error('Lead not found');
            }

            // Find manager or senior rep to escalate to
            // Strategy: Find users with higher role in the same firm
            let escalationTarget = null;

            if (lead.assignedTo) {
                // Try to find manager
                const managers = await User.find({
                    firmId: lead.firmId,
                    role: { $in: ['admin', 'owner', 'manager'] },
                    _id: { $ne: lead.assignedTo._id },
                    status: 'active'
                }).limit(1);

                escalationTarget = managers[0];
            }

            if (!escalationTarget) {
                // Fallback: Find any active user with admin/owner role
                const admins = await User.find({
                    firmId: lead.firmId,
                    role: { $in: ['admin', 'owner'] },
                    status: 'active'
                }).limit(1);

                escalationTarget = admins[0];
            }

            if (!escalationTarget) {
                throw new Error('No escalation target found');
            }

            // Update lead prioritization
            if (!lead.customFields) {
                lead.customFields = {};
            }
            if (!lead.customFields.prioritization) {
                lead.customFields.prioritization = {};
            }

            const previousAssignment = lead.assignedTo;
            lead.customFields.prioritization.escalatedTo = escalationTarget._id;
            lead.customFields.prioritization.escalatedAt = new Date();
            lead.customFields.prioritization.escalationReason = reason;
            lead.customFields.prioritization.slaStatus = 'escalated';
            lead.customFields.prioritization.previousAssignee = previousAssignment?._id;

            // Reassign lead
            lead.assignedTo = escalationTarget._id;

            await lead.save();

            // Log escalation
            await CrmActivity.logActivity({
                lawyerId: lead.lawyerId,
                firmId: lead.firmId,
                type: 'assignment',
                entityType: 'lead',
                entityId: lead._id,
                entityName: lead.displayName,
                title: `Lead escalated to ${escalationTarget.firstName} ${escalationTarget.lastName}`,
                description: `Reason: ${reason}. Previous assignee: ${previousAssignment?.firstName || 'Unassigned'}`,
                performedBy: lead.lawyerId
            });

            // TODO: Send notification to escalation target
            // await NotificationService.send({
            //     userId: escalationTarget._id,
            //     type: 'lead_escalated',
            //     title: 'Lead escalated to you',
            //     message: `${lead.displayName} has been escalated. Reason: ${reason}`
            // });

            return {
                success: true,
                escalatedTo: escalationTarget._id,
                escalatedToName: `${escalationTarget.firstName} ${escalationTarget.lastName}`,
                previousAssignee: previousAssignment?._id,
                reason
            };
        } catch (error) {
            logger.error('Error escalating lead:', error);
            throw error;
        }
    }

    /**
     * Update lead contact status (resets SLA timer)
     * @param {ObjectId} leadId - Lead ID
     * @param {ObjectId} userId - User who made contact
     * @param {String} contactType - Type of contact (call, email, meeting, etc.)
     * @returns {Object} Updated lead
     */
    static async recordContact(leadId, userId, contactType) {
        try {
            const lead = await Lead.findById(leadId);
            if (!lead) {
                throw new Error('Lead not found');
            }

            const now = new Date();
            const prioritization = lead.customFields?.prioritization || {};

            // Calculate response time if SLA was pending
            let responseTime = null;
            if (prioritization.slaStatus === 'pending' && prioritization.slaDeadline) {
                responseTime = now - new Date(prioritization.assignedAt || lead.createdAt);
            }

            // Update prioritization status
            if (!lead.customFields) {
                lead.customFields = {};
            }
            if (!lead.customFields.prioritization) {
                lead.customFields.prioritization = prioritization;
            }

            // Determine if SLA was met
            const slaWasMet = prioritization.slaDeadline
                ? now <= new Date(prioritization.slaDeadline)
                : true;

            lead.customFields.prioritization.contactedAt = now;
            lead.customFields.prioritization.responseTime = responseTime;
            lead.customFields.prioritization.slaStatus = slaWasMet ? 'met' : 'breached';
            lead.customFields.prioritization.contactType = contactType;
            lead.customFields.prioritization.contactedBy = userId;

            // Update lead contact tracking
            lead.lastContactedAt = now;

            await lead.save();

            // Log contact
            await CrmActivity.logActivity({
                lawyerId: lead.lawyerId,
                firmId: lead.firmId,
                type: 'note',
                entityType: 'lead',
                entityId: lead._id,
                entityName: lead.displayName,
                title: `Contact recorded: ${contactType}`,
                description: `Response time: ${responseTime ? Math.round(responseTime / 60000) + ' minutes' : 'N/A'}. SLA ${slaWasMet ? 'met' : 'breached'}.`,
                performedBy: userId
            });

            return {
                leadId: lead._id,
                contactedAt: now,
                responseTime,
                slaStatus: lead.customFields.prioritization.slaStatus,
                slaWasMet
            };
        } catch (error) {
            logger.error('Error recording contact:', error);
            throw error;
        }
    }

    // ═══════════════════════════════════════════════════════════
    // METRICS & ANALYTICS
    // ═══════════════════════════════════════════════════════════

    /**
     * Get SLA metrics for dashboard
     * @param {ObjectId} firmId - Firm ID
     * @param {String} period - Time period (7d, 30d, 90d)
     * @returns {Object} SLA metrics
     */
    static async getSLAMetrics(firmId, period = '7d') {
        try {
            // Parse period
            const periodMap = {
                '7d': 7,
                '30d': 30,
                '90d': 90
            };
            const days = periodMap[period] || 7;
            const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

            // Get all leads with prioritization data in period
            const leads = await Lead.find({
                firmId: new mongoose.Types.ObjectId(firmId),
                'customFields.prioritization.assignedAt': { $gte: startDate }
            }).lean();

            const metrics = {
                overview: {
                    totalLeads: leads.length,
                    withSLA: leads.filter(l => l.customFields?.prioritization?.slaDeadline).length,
                    met: leads.filter(l => l.customFields?.prioritization?.slaStatus === 'met').length,
                    breached: leads.filter(l => l.customFields?.prioritization?.slaStatus === 'breached').length,
                    escalated: leads.filter(l => l.customFields?.prioritization?.slaStatus === 'escalated').length,
                    pending: leads.filter(l => l.customFields?.prioritization?.slaStatus === 'pending').length
                },
                byTier: {},
                avgResponseTime: {},
                currentBreaches: []
            };

            // Calculate breach rate
            const totalWithSLA = metrics.overview.withSLA;
            metrics.overview.breachRate = totalWithSLA > 0
                ? ((metrics.overview.breached + metrics.overview.escalated) / totalWithSLA * 100).toFixed(2)
                : 0;

            metrics.overview.successRate = totalWithSLA > 0
                ? (metrics.overview.met / totalWithSLA * 100).toFixed(2)
                : 0;

            // Metrics by tier
            for (const tier of ['P1_HOT', 'P2_WARM', 'P3_COOL', 'P4_NURTURE']) {
                const tierLeads = leads.filter(l => l.customFields?.prioritization?.tier === tier);
                const tierWithResponse = tierLeads.filter(l => l.customFields?.prioritization?.responseTime);

                metrics.byTier[tier] = {
                    total: tierLeads.length,
                    met: tierLeads.filter(l => l.customFields?.prioritization?.slaStatus === 'met').length,
                    breached: tierLeads.filter(l => l.customFields?.prioritization?.slaStatus === 'breached').length,
                    pending: tierLeads.filter(l => l.customFields?.prioritization?.slaStatus === 'pending').length
                };

                // Average response time for this tier
                if (tierWithResponse.length > 0) {
                    const totalResponseTime = tierWithResponse.reduce((sum, l) => {
                        return sum + (l.customFields?.prioritization?.responseTime || 0);
                    }, 0);

                    const avgMs = totalResponseTime / tierWithResponse.length;
                    metrics.avgResponseTime[tier] = {
                        milliseconds: avgMs,
                        minutes: Math.round(avgMs / 60000),
                        hours: (avgMs / 3600000).toFixed(2)
                    };
                } else {
                    metrics.avgResponseTime[tier] = null;
                }
            }

            // Current breaches (pending leads past SLA)
            const now = new Date();
            const currentBreaches = await Lead.find({
                firmId: new mongoose.Types.ObjectId(firmId),
                convertedToClient: false,
                status: { $nin: ['won', 'lost', 'dormant'] },
                'customFields.prioritization.slaDeadline': { $lt: now },
                'customFields.prioritization.slaStatus': 'pending'
            })
                .populate('assignedTo', 'firstName lastName email')
                .select('leadId firstName lastName companyName assignedTo customFields status')
                .lean();

            metrics.currentBreaches = currentBreaches.map(lead => ({
                leadId: lead._id,
                leadNumber: lead.leadId,
                leadName: lead.firstName ? `${lead.firstName} ${lead.lastName}` : lead.companyName,
                tier: lead.customFields?.prioritization?.tier,
                slaDeadline: lead.customFields?.prioritization?.slaDeadline,
                assignedTo: lead.assignedTo,
                timeSinceBreach: now - new Date(lead.customFields?.prioritization?.slaDeadline)
            }));

            return metrics;
        } catch (error) {
            logger.error('Error getting SLA metrics:', error);
            throw error;
        }
    }

    // ═══════════════════════════════════════════════════════════
    // AUTO-ASSIGNMENT
    // ═══════════════════════════════════════════════════════════

    /**
     * Auto-assign leads to reps based on capacity and specialization
     * @param {ObjectId} firmId - Firm ID
     * @param {Array} unassignedLeads - Array of lead IDs or lead objects
     * @returns {Object} Assignment results
     */
    static async autoAssignLeads(firmId, unassignedLeads) {
        try {
            // Get all active sales reps in firm
            const salesReps = await User.find({
                firmId: new mongoose.Types.ObjectId(firmId),
                role: { $in: ['lawyer', 'paralegal', 'admin', 'owner'] },
                status: 'active'
            }).lean();

            if (salesReps.length === 0) {
                throw new Error('No active sales reps found');
            }

            // Get current workload for each rep
            const workloadData = await this.getTeamWorkload(firmId);
            const workloadMap = {};

            workloadData.forEach(rep => {
                workloadMap[rep.userId.toString()] = rep.activeLeads;
            });

            // Sort reps by workload (ascending)
            const sortedReps = salesReps.sort((a, b) => {
                const workloadA = workloadMap[a._id.toString()] || 0;
                const workloadB = workloadMap[b._id.toString()] || 0;
                return workloadA - workloadB;
            });

            const assignments = [];
            let repIndex = 0;

            // Assign leads in round-robin fashion (respecting workload)
            for (const leadIdOrObj of unassignedLeads) {
                const leadId = typeof leadIdOrObj === 'object' ? leadIdOrObj._id : leadIdOrObj;
                const rep = sortedReps[repIndex % sortedReps.length];

                // Assign lead
                const lead = await Lead.findByIdAndUpdate(
                    leadId,
                    {
                        assignedTo: rep._id,
                        lastModifiedBy: rep._id
                    },
                    { new: true }
                );

                if (lead) {
                    // Assign priority
                    await this.assignPriority(leadId, firmId);

                    assignments.push({
                        leadId,
                        assignedTo: rep._id,
                        assignedToName: `${rep.firstName} ${rep.lastName}`
                    });

                    // Log assignment
                    await CrmActivity.logActivity({
                        lawyerId: lead.lawyerId,
                        firmId: firmId,
                        type: 'assignment',
                        entityType: 'lead',
                        entityId: lead._id,
                        entityName: lead.displayName,
                        title: `Auto-assigned to ${rep.firstName} ${rep.lastName}`,
                        description: 'Lead automatically assigned based on workload distribution',
                        performedBy: rep._id
                    });
                }

                repIndex++;
            }

            return {
                totalAssigned: assignments.length,
                assignments,
                assignedAt: new Date()
            };
        } catch (error) {
            logger.error('Error auto-assigning leads:', error);
            throw error;
        }
    }

    /**
     * Get workload distribution across sales team
     * @param {ObjectId} firmId - Firm ID
     * @returns {Array} Workload data per rep
     */
    static async getTeamWorkload(firmId) {
        try {
            const workload = await Lead.aggregate([
                {
                    $match: {
                        firmId: new mongoose.Types.ObjectId(firmId),
                        convertedToClient: false,
                        status: { $nin: ['won', 'lost'] },
                        assignedTo: { $exists: true, $ne: null }
                    }
                },
                {
                    $group: {
                        _id: '$assignedTo',
                        activeLeads: { $sum: 1 },
                        totalValue: { $sum: '$estimatedValue' },
                        avgScore: { $avg: '$leadScore' },
                        byPriority: {
                            $push: '$customFields.prioritization.tier'
                        }
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
                { $unwind: '$user' },
                {
                    $project: {
                        userId: '$_id',
                        userName: { $concat: ['$user.firstName', ' ', '$user.lastName'] },
                        email: '$user.email',
                        role: '$user.role',
                        activeLeads: 1,
                        totalValue: 1,
                        avgScore: { $round: ['$avgScore', 0] },
                        priorityCounts: {
                            P1_HOT: {
                                $size: {
                                    $filter: {
                                        input: '$byPriority',
                                        as: 'p',
                                        cond: { $eq: ['$$p', 'P1_HOT'] }
                                    }
                                }
                            },
                            P2_WARM: {
                                $size: {
                                    $filter: {
                                        input: '$byPriority',
                                        as: 'p',
                                        cond: { $eq: ['$$p', 'P2_WARM'] }
                                    }
                                }
                            },
                            P3_COOL: {
                                $size: {
                                    $filter: {
                                        input: '$byPriority',
                                        as: 'p',
                                        cond: { $eq: ['$$p', 'P3_COOL'] }
                                    }
                                }
                            },
                            P4_NURTURE: {
                                $size: {
                                    $filter: {
                                        input: '$byPriority',
                                        as: 'p',
                                        cond: { $eq: ['$$p', 'P4_NURTURE'] }
                                    }
                                }
                            }
                        }
                    }
                },
                { $sort: { activeLeads: -1 } }
            ]);

            return workload;
        } catch (error) {
            logger.error('Error getting team workload:', error);
            throw error;
        }
    }

    // ═══════════════════════════════════════════════════════════
    // NURTURE CAMPAIGN MANAGEMENT
    // ═══════════════════════════════════════════════════════════

    /**
     * Move lead to nurture campaign (P4)
     * @param {ObjectId} leadId - Lead ID
     * @param {String} reason - Reason for moving to nurture
     * @returns {Object} Updated lead
     */
    static async moveToNurture(leadId, reason) {
        try {
            const lead = await Lead.findById(leadId);
            if (!lead) {
                throw new Error('Lead not found');
            }

            // Update lead status
            if (lead.status !== 'dormant') {
                lead.status = 'dormant';
            }

            // Update prioritization
            if (!lead.customFields) {
                lead.customFields = {};
            }
            if (!lead.customFields.prioritization) {
                lead.customFields.prioritization = {};
            }

            lead.customFields.prioritization.tier = 'P4_NURTURE';
            lead.customFields.prioritization.nurtureStatus = 'active';
            lead.customFields.prioritization.nurtureStartedAt = new Date();
            lead.customFields.prioritization.nurtureReason = reason;
            lead.customFields.prioritization.slaStatus = 'nurture';

            await lead.save();

            // Log nurture assignment
            await CrmActivity.logActivity({
                lawyerId: lead.lawyerId,
                firmId: lead.firmId,
                type: 'note',
                entityType: 'lead',
                entityId: lead._id,
                entityName: lead.displayName,
                title: 'Moved to nurture campaign',
                description: `Reason: ${reason}`,
                performedBy: lead.lawyerId
            });

            return {
                leadId: lead._id,
                tier: 'P4_NURTURE',
                nurtureStatus: 'active',
                reason
            };
        } catch (error) {
            logger.error('Error moving lead to nurture:', error);
            throw error;
        }
    }

    /**
     * Reactivate lead from nurture based on engagement
     * @param {ObjectId} firmId - Firm ID
     * @returns {Object} Reactivation results
     */
    static async checkNurtureReactivation(firmId) {
        try {
            // Find leads in nurture with recent engagement
            const recentDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Last 7 days

            const nurtureLeads = await Lead.find({
                firmId: new mongoose.Types.ObjectId(firmId),
                'customFields.prioritization.tier': 'P4_NURTURE',
                'customFields.prioritization.nurtureStatus': 'active',
                lastActivityAt: { $gte: recentDate }
            });

            const reactivations = [];

            for (const lead of nurtureLeads) {
                // Check for high-value activities (meetings, calls, email replies)
                const recentActivities = await CrmActivity.find({
                    entityType: 'lead',
                    entityId: lead._id,
                    createdAt: { $gte: recentDate },
                    type: { $in: ['call', 'meeting', 'email'] }
                });

                // Check for engagement signals
                const hasHighEngagement = recentActivities.some(activity => {
                    if (activity.type === 'meeting' && activity.meetingData?.outcome === 'completed') {
                        return true;
                    }
                    if (activity.type === 'call' && activity.callData?.duration > 300) { // 5+ min call
                        return true;
                    }
                    if (activity.type === 'email' && activity.emailData?.replied) {
                        return true;
                    }
                    return false;
                });

                if (hasHighEngagement || recentActivities.length >= 3) {
                    // Reactivate lead
                    lead.status = 'contacted';
                    lead.customFields.prioritization.nurtureStatus = 'reactivated';
                    lead.customFields.prioritization.reactivatedAt = new Date();

                    // Reassign priority based on new engagement
                    await this.assignPriority(lead._id, firmId);
                    await lead.save();

                    reactivations.push({
                        leadId: lead._id,
                        leadName: lead.displayName,
                        recentActivities: recentActivities.length,
                        reactivatedAt: new Date()
                    });

                    // Log reactivation
                    await CrmActivity.logActivity({
                        lawyerId: lead.lawyerId,
                        firmId: firmId,
                        type: 'note',
                        entityType: 'lead',
                        entityId: lead._id,
                        entityName: lead.displayName,
                        title: 'Lead reactivated from nurture',
                        description: `Reactivated due to recent engagement (${recentActivities.length} activities)`,
                        performedBy: lead.lawyerId
                    });
                }
            }

            return {
                totalChecked: nurtureLeads.length,
                reactivated: reactivations.length,
                reactivations
            };
        } catch (error) {
            logger.error('Error checking nurture reactivation:', error);
            throw error;
        }
    }
}

module.exports = SalesPrioritizationService;
