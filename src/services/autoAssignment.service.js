const mongoose = require('mongoose');
const Lead = require('../models/lead.model');
const SalesTeam = require('../models/salesTeam.model');
const Territory = require('../models/territory.model');
const User = require('../models/user.model');
const logger = require('../utils/logger');

/**
 * Auto-Assignment Service
 * Handles automatic lead assignment based on various strategies
 */
class AutoAssignmentService {
    /**
     * Assign lead using round-robin within a team
     * @param {ObjectId} leadId - Lead to assign
     * @param {ObjectId} salesTeamId - Team to use for assignment
     * @param {ObjectId} firmId - Firm ID for multi-tenancy
     */
    async roundRobinAssign(leadId, salesTeamId, firmId) {
        // Validate firmId
        if (!firmId) {
            throw new Error('firmId is required');
        }

        // Fetch the lead first to get createdAt timestamp
        const lead = await Lead.findOne({ _id: leadId, firmId });
        if (!lead) {
            throw new Error('Lead not found');
        }

        const team = await SalesTeam.findOne({ _id: salesTeamId, firmId });
        if (!team || team.members.length === 0) {
            throw new Error('Team not found or has no members');
        }

        // Get active members
        const activeMembers = team.members.filter(m => m.isActive);
        if (activeMembers.length === 0) {
            throw new Error('No active members in team');
        }

        // Find the member with lowest current workload (leads assigned this period)
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const memberWorkloads = await Lead.aggregate([
            {
                $match: {
                    firmId: new mongoose.Types.ObjectId(firmId),
                    assignedTo: { $in: activeMembers.map(m => m.userId) },
                    createdAt: { $gte: startOfMonth }
                }
            },
            {
                $group: {
                    _id: '$assignedTo',
                    count: { $sum: 1 }
                }
            }
        ]);

        // Create workload map
        const workloadMap = {};
        memberWorkloads.forEach(w => {
            workloadMap[w._id.toString()] = w.count;
        });

        // Find member with lowest workload (considering capacity)
        let selectedMember = null;
        let lowestRatio = Infinity;

        for (const member of activeMembers) {
            const currentLoad = workloadMap[member.userId.toString()] || 0;
            const capacity = member.capacity || 50;
            const ratio = currentLoad / capacity;

            if (ratio < lowestRatio) {
                lowestRatio = ratio;
                selectedMember = member;
            }
        }

        if (!selectedMember) {
            throw new Error('Could not determine member for assignment');
        }

        // Calculate days to assign
        const daysToAssign = Math.floor((Date.now() - lead.createdAt) / (1000 * 60 * 60 * 24));

        // Assign the lead
        const updatedLead = await Lead.findOneAndUpdate(
            { _id: leadId, firmId },
            {
                $set: {
                    assignedTo: selectedMember.userId,
                    salesTeamId: salesTeamId,
                    'metrics.daysToAssign': daysToAssign
                }
            },
            { new: true }
        );

        logger.info(`Lead ${leadId} assigned to ${selectedMember.userId} via round-robin`);
        return updatedLead;
    }

    /**
     * Assign lead based on territory
     * @param {ObjectId} leadId - Lead to assign
     * @param {ObjectId} firmId - Firm ID
     */
    async territoryBasedAssign(leadId, firmId) {
        if (!firmId) {
            throw new Error('firmId is required');
        }

        const lead = await Lead.findOne({ _id: leadId, firmId });
        if (!lead) {
            throw new Error('Lead not found');
        }

        // Get territory from address
        const regionCode = lead.nationalAddress?.regionCode || lead.address?.stateCode;
        if (!regionCode) {
            return null; // Cannot determine territory
        }

        // Find matching territory
        const territory = await Territory.findOne({
            firmId,
            'criteria.regionCodes': regionCode,
            isActive: true
        });

        if (!territory) {
            return null;
        }

        // If territory has assigned user, assign to them
        if (territory.assignedTo) {
            await Lead.findOneAndUpdate(
                { _id: leadId, firmId },
                {
                    $set: {
                        assignedTo: territory.assignedTo,
                        territoryId: territory._id
                    }
                }
            );
            return territory.assignedTo;
        }

        // If territory has a team, use round-robin within that team
        if (territory.salesTeamId) {
            return this.roundRobinAssign(leadId, territory.salesTeamId, firmId);
        }

        return null;
    }

    /**
     * Assign lead based on campaign source
     * @param {ObjectId} leadId - Lead to assign
     * @param {ObjectId} firmId - Firm ID
     */
    async campaignBasedAssign(leadId, firmId) {
        if (!firmId) {
            throw new Error('firmId is required');
        }

        const lead = await Lead.findOne({ _id: leadId, firmId });
        if (!lead || !lead.campaignId) {
            return null;
        }

        const Campaign = require('../models/campaign.model');
        const campaign = await Campaign.findOne({ _id: lead.campaignId, firmId });

        if (!campaign || !campaign.owner) {
            return null;
        }

        // Assign to campaign owner
        await Lead.findOneAndUpdate(
            { _id: leadId, firmId },
            { $set: { assignedTo: campaign.owner } }
        );

        return campaign.owner;
    }

    /**
     * Check if user has capacity for more leads
     * @param {ObjectId} userId - User to check
     * @param {ObjectId} firmId - Firm ID
     * @param {number} maxCapacity - Maximum leads allowed (default 50)
     */
    async checkCapacity(userId, firmId, maxCapacity = 50) {
        if (!firmId) {
            throw new Error('firmId is required');
        }

        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const activeLeads = await Lead.countDocuments({
            firmId,
            assignedTo: userId,
            status: { $nin: ['won', 'lost'] },
            createdAt: { $gte: startOfMonth }
        });

        return {
            currentLoad: activeLeads,
            maxCapacity,
            hasCapacity: activeLeads < maxCapacity,
            utilizationPercent: Math.round((activeLeads / maxCapacity) * 100)
        };
    }

    /**
     * Get assignment history for a lead
     * @param {ObjectId} leadId - Lead ID
     * @param {ObjectId} firmId - Firm ID
     */
    async getAssignmentHistory(leadId, firmId) {
        if (!firmId) {
            throw new Error('firmId is required');
        }

        const CrmActivity = require('../models/crmActivity.model');

        return CrmActivity.find({
            firmId,
            entityId: leadId,
            entityType: 'lead',
            type: { $in: ['assignment', 'reassignment', 'status_change'] }
        }).sort({ createdAt: -1 });
    }

    /**
     * Reassign leads from one user to another (bulk)
     * @param {ObjectId} fromUserId - Source user
     * @param {ObjectId} toUserId - Target user
     * @param {ObjectId} firmId - Firm ID
     * @param {Object} filters - Optional filters
     */
    async bulkReassign(fromUserId, toUserId, firmId, filters = {}) {
        if (!firmId) {
            throw new Error('firmId is required');
        }

        const query = {
            firmId,
            assignedTo: fromUserId,
            status: { $nin: ['won', 'lost'] }
        };

        if (filters.status) query.status = filters.status;
        if (filters.pipelineId) query.pipelineId = filters.pipelineId;

        const result = await Lead.updateMany(query, {
            $set: { assignedTo: toUserId }
        });

        logger.info(`Bulk reassigned ${result.modifiedCount} leads from ${fromUserId} to ${toUserId}`);
        return result;
    }
}

module.exports = new AutoAssignmentService();
