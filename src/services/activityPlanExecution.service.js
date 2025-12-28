/**
 * Activity Plan Execution Service
 *
 * Enterprise-grade activity plan execution engine.
 * Handles enrollment, step execution, and plan completion.
 *
 * Features:
 * - Plan enrollment with validation
 * - Step scheduling and execution
 * - Automatic activity creation
 * - Progress tracking
 * - Plan completion handling
 */

const mongoose = require('mongoose');
const ActivityPlan = require('../models/activityPlan.model');
const Lead = require('../models/lead.model');
const CRMActivity = require('../models/crmActivity.model');
const CRMTransaction = require('../models/crmTransaction.model');

class ActivityPlanExecutionService {
    /**
     * Start activity plan for a lead
     */
    async startPlan(leadId, planId, firmId, startedBy) {
        const lead = await Lead.findOne({
            _id: leadId,
            firmId
        });

        if (!lead) {
            throw new Error('Lead not found or access denied');
        }

        const plan = await ActivityPlan.findOne({
            _id: planId,
            firmId,
            status: 'active'
        });

        if (!plan) {
            throw new Error('Activity plan not found or not active');
        }

        // Check if lead already has an active plan
        if (lead.activeActivityPlanId) {
            throw new Error('Lead already has an active activity plan');
        }

        // Initialize plan progress on lead
        lead.activeActivityPlanId = planId;
        lead.activityPlanProgress = {
            currentStepIndex: 0,
            startedAt: new Date(),
            completedSteps: [],
            scheduledActivities: []
        };

        await lead.save();

        // Schedule first step
        const firstActivity = await this._scheduleStep(lead, plan, 0, startedBy);

        // Update plan stats
        plan.activeEnrollments = (plan.activeEnrollments || 0) + 1;
        plan.timesUsed = (plan.timesUsed || 0) + 1;
        await plan.save();

        // Log transaction
        await CRMTransaction.log({
            firmId,
            type: 'campaign_enrolled',
            category: 'campaign',
            entityType: 'lead',
            entityId: leadId,
            entityName: `${lead.firstName} ${lead.lastName}`,
            description: `Enrolled in activity plan: ${plan.name}`,
            performedBy: startedBy,
            metadata: { planId, planName: plan.name }
        });

        return {
            success: true,
            lead: lead._id,
            plan: plan._id,
            firstActivity: firstActivity?._id,
            message: `Lead enrolled in ${plan.name}`
        };
    }

    /**
     * Schedule a specific step
     */
    async _scheduleStep(lead, plan, stepIndex, assignedTo) {
        const step = plan.steps[stepIndex];
        if (!step) return null;

        // Calculate scheduled date
        const scheduledDate = new Date();

        if (stepIndex === 0) {
            // First step - add initial delay
            scheduledDate.setDate(scheduledDate.getDate() + (step.delayDays || 0));
            scheduledDate.setHours(scheduledDate.getHours() + (step.delayHours || 0));
        } else {
            // Subsequent steps - add delay from previous step completion
            scheduledDate.setDate(scheduledDate.getDate() + (step.delayDays || 0));
            scheduledDate.setHours(scheduledDate.getHours() + (step.delayHours || 0));
        }

        // Respect business hours if configured
        if (plan.businessHoursOnly) {
            scheduledDate = this._adjustToBusinessHours(scheduledDate, plan.timezone);
        }

        // Skip weekends if configured
        if (!plan.allowWeekends) {
            while (scheduledDate.getDay() === 0 || scheduledDate.getDay() === 6) {
                scheduledDate.setDate(scheduledDate.getDate() + 1);
            }
        }

        // Create activity
        const activity = new CRMActivity({
            firmId: lead.firmId,
            lawyerId: lead.lawyerId,
            type: this._mapActivityType(step.type),
            subType: step.type,
            title: step.name,
            description: step.description || `Activity from plan: ${plan.name}`,
            entityType: 'lead',
            entityId: lead._id,
            entityName: `${lead.firstName} ${lead.lastName}`,
            scheduledAt: scheduledDate,
            assignedTo: step.assignToOwner ? lead.assignedTo : assignedTo,
            performedBy: assignedTo,
            status: 'scheduled',
            isFromActivityPlan: true,
            activityPlanId: plan._id,
            activityPlanStepIndex: stepIndex,
            source: 'automation',
            metadata: {
                planName: plan.name,
                stepOrder: step.order,
                isRequired: step.isRequired
            }
        });

        // Add email template if applicable
        if (step.type === 'email' && step.emailTemplateId) {
            activity.emailData = {
                templateId: step.emailTemplateId,
                status: 'draft'
            };
        }

        // Add task details if applicable
        if (step.type === 'task' && step.taskDetails) {
            activity.taskData = {
                dueDate: scheduledDate,
                priority: step.taskDetails.priority || 'medium',
                status: 'pending'
            };
        }

        await activity.save();

        // Track scheduled activity on lead
        if (!lead.activityPlanProgress.scheduledActivities) {
            lead.activityPlanProgress.scheduledActivities = [];
        }
        lead.activityPlanProgress.scheduledActivities.push({
            activityId: activity._id,
            stepIndex,
            scheduledAt: scheduledDate
        });
        await lead.save();

        return activity;
    }

    /**
     * Complete a step and move to next
     */
    async completeStep(leadId, activityId, firmId, completedBy, outcome = {}) {
        const lead = await Lead.findOne({
            _id: leadId,
            firmId,
            activeActivityPlanId: { $exists: true }
        });

        if (!lead || !lead.activeActivityPlanId) {
            throw new Error('Lead not found or has no active plan');
        }

        const plan = await ActivityPlan.findById(lead.activeActivityPlanId);
        if (!plan) {
            throw new Error('Activity plan not found');
        }

        const activity = await CRMActivity.findById(activityId);
        if (!activity) {
            throw new Error('Activity not found');
        }

        // Mark activity as completed
        activity.status = 'completed';
        activity.completedAt = new Date();
        activity.completedBy = completedBy;
        if (outcome.notes) activity.notes = outcome.notes;
        if (outcome.outcome) activity.outcome = outcome.outcome;
        await activity.save();

        // Update lead progress
        const currentStepIndex = lead.activityPlanProgress.currentStepIndex;
        lead.activityPlanProgress.completedSteps.push({
            stepIndex: currentStepIndex,
            completedAt: new Date(),
            activityId
        });

        // Check if plan should stop
        if (plan.stopOnConversion && ['won', 'converted'].includes(lead.status)) {
            return this._completePlan(lead, plan, 'converted', completedBy);
        }

        if (plan.stopOnReply && outcome.gotReply) {
            return this._completePlan(lead, plan, 'replied', completedBy);
        }

        // Move to next step
        const nextStepIndex = currentStepIndex + 1;

        if (nextStepIndex >= plan.steps.length) {
            // Plan completed
            return this._completePlan(lead, plan, 'completed', completedBy);
        }

        // Schedule next step
        lead.activityPlanProgress.currentStepIndex = nextStepIndex;
        await lead.save();

        const nextActivity = await this._scheduleStep(lead, plan, nextStepIndex, completedBy);

        return {
            success: true,
            completed: currentStepIndex,
            nextStep: nextStepIndex,
            nextActivity: nextActivity?._id,
            planCompleted: false
        };
    }

    /**
     * Complete or stop a plan
     */
    async _completePlan(lead, plan, reason, completedBy) {
        lead.activeActivityPlanId = null;
        lead.activityPlanProgress.completedAt = new Date();
        lead.activityPlanProgress.completionReason = reason;
        await lead.save();

        // Update plan stats
        plan.activeEnrollments = Math.max(0, (plan.activeEnrollments || 1) - 1);

        // Calculate completion rate
        const totalSteps = plan.steps.length;
        const completedSteps = lead.activityPlanProgress.completedSteps?.length || 0;
        const completionRate = (completedSteps / totalSteps) * 100;

        // Update rolling average
        const prevRate = plan.completionRate || 0;
        const prevCount = plan.timesUsed || 1;
        plan.completionRate = ((prevRate * (prevCount - 1)) + completionRate) / prevCount;

        // Update avg time to complete
        if (lead.activityPlanProgress.startedAt) {
            const duration = new Date() - new Date(lead.activityPlanProgress.startedAt);
            const prevAvgTime = plan.avgTimeToComplete || 0;
            plan.avgTimeToComplete = ((prevAvgTime * (prevCount - 1)) + duration) / prevCount;
        }

        await plan.save();

        // Cancel any remaining scheduled activities
        await CRMActivity.updateMany(
            {
                entityId: lead._id,
                activityPlanId: plan._id,
                status: 'scheduled'
            },
            {
                $set: {
                    status: 'cancelled',
                    cancelledAt: new Date(),
                    cancelReason: `Plan ${reason}`
                }
            }
        );

        // Log transaction
        await CRMTransaction.log({
            firmId: lead.firmId,
            type: 'campaign_completed',
            category: 'campaign',
            entityType: 'lead',
            entityId: lead._id,
            entityName: `${lead.firstName} ${lead.lastName}`,
            description: `Completed activity plan: ${plan.name} (${reason})`,
            performedBy: completedBy,
            metadata: {
                planId: plan._id,
                planName: plan.name,
                reason,
                stepsCompleted: lead.activityPlanProgress.completedSteps?.length || 0,
                totalSteps: plan.steps.length
            }
        });

        return {
            success: true,
            planCompleted: true,
            reason,
            stepsCompleted: lead.activityPlanProgress.completedSteps?.length || 0,
            totalSteps: plan.steps.length
        };
    }

    /**
     * Stop a plan early
     */
    async stopPlan(leadId, firmId, stoppedBy, reason = 'manual') {
        const lead = await Lead.findOne({
            _id: leadId,
            firmId,
            activeActivityPlanId: { $exists: true }
        });

        if (!lead || !lead.activeActivityPlanId) {
            throw new Error('Lead has no active plan');
        }

        const plan = await ActivityPlan.findById(lead.activeActivityPlanId);
        if (!plan) {
            throw new Error('Plan not found');
        }

        return this._completePlan(lead, plan, reason, stoppedBy);
    }

    /**
     * Get plan progress for a lead
     */
    async getPlanProgress(leadId, firmId) {
        const lead = await Lead.findOne({
            _id: leadId,
            firmId
        }).select('firstName lastName activeActivityPlanId activityPlanProgress');

        if (!lead) {
            throw new Error('Lead not found');
        }

        if (!lead.activeActivityPlanId) {
            return { hasActivePlan: false };
        }

        const plan = await ActivityPlan.findById(lead.activeActivityPlanId)
            .select('name nameAr steps status');

        if (!plan) {
            return { hasActivePlan: false, error: 'Plan not found' };
        }

        const scheduledActivities = await CRMActivity.find({
            entityId: leadId,
            activityPlanId: plan._id,
            status: { $in: ['scheduled', 'overdue'] }
        }).select('title type scheduledAt status').lean();

        const completedActivities = await CRMActivity.find({
            entityId: leadId,
            activityPlanId: plan._id,
            status: 'completed'
        }).select('title type completedAt').lean();

        return {
            hasActivePlan: true,
            plan: {
                id: plan._id,
                name: plan.name,
                nameAr: plan.nameAr,
                totalSteps: plan.steps.length
            },
            progress: {
                currentStepIndex: lead.activityPlanProgress?.currentStepIndex || 0,
                completedSteps: lead.activityPlanProgress?.completedSteps?.length || 0,
                startedAt: lead.activityPlanProgress?.startedAt,
                percentComplete: Math.round(
                    ((lead.activityPlanProgress?.completedSteps?.length || 0) / plan.steps.length) * 100
                )
            },
            scheduledActivities,
            completedActivities
        };
    }

    /**
     * Process overdue plan activities (cron job)
     */
    async processOverdueActivities() {
        const now = new Date();

        // Find overdue scheduled activities from plans
        const overdueActivities = await CRMActivity.find({
            isFromActivityPlan: true,
            status: 'scheduled',
            scheduledAt: { $lt: now }
        }).populate('entityId');

        let processed = 0;

        for (const activity of overdueActivities) {
            activity.status = 'overdue';
            await activity.save();
            processed++;
        }

        return { processed };
    }

    /**
     * Get leads eligible for a plan
     */
    async getEligibleLeads(planId, firmId, options = {}) {
        const { limit = 50 } = options;

        const plan = await ActivityPlan.findOne({ _id: planId, firmId });
        if (!plan) {
            throw new Error('Plan not found');
        }

        const query = {
            firmId: new mongoose.Types.ObjectId(firmId),
            status: { $nin: ['won', 'lost', 'converted', 'archived'] },
            activeActivityPlanId: { $exists: false }
        };

        // Apply plan trigger conditions
        if (plan.triggerConditions) {
            if (plan.triggerConditions.stageId) {
                query.pipelineStageId = plan.triggerConditions.stageId;
            }
            if (plan.triggerConditions.tagName) {
                query.tags = plan.triggerConditions.tagName;
            }
            if (plan.triggerConditions.scoreThreshold) {
                query.leadScore = { $gte: plan.triggerConditions.scoreThreshold };
            }
        }

        const leads = await Lead.find(query)
            .select('firstName lastName email status pipelineStageId leadScore')
            .limit(limit)
            .lean();

        return leads;
    }

    // Helper methods

    _mapActivityType(stepType) {
        const mapping = {
            email: 'email',
            call: 'call',
            meeting: 'meeting',
            video_call: 'meeting',
            task: 'task',
            sms: 'other',
            whatsapp: 'other'
        };
        return mapping[stepType] || 'task';
    }

    _adjustToBusinessHours(date, timezone = 'Asia/Riyadh') {
        const hours = date.getHours();
        if (hours < 9) {
            date.setHours(9, 0, 0, 0);
        } else if (hours >= 17) {
            date.setDate(date.getDate() + 1);
            date.setHours(9, 0, 0, 0);
        }
        return date;
    }
}

module.exports = new ActivityPlanExecutionService();
