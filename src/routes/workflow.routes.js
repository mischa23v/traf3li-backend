/**
 * Workflow Routes
 *
 * Consolidated workflow routes for all workflow types:
 * - Lead Workflows
 * - Quote Workflows
 * - Activity Workflows
 * - Campaign Workflows
 * - Client Workflows
 * - Approval Workflows
 *
 * Base route: /api/workflows
 */

const express = require('express');
const router = express.Router();

// Import all workflow controllers
const leadWorkflowController = require('../controllers/leadWorkflow.controller');
const quoteWorkflowController = require('../controllers/quoteWorkflow.controller');
const activityWorkflowController = require('../controllers/activityWorkflow.controller');
const campaignWorkflowController = require('../controllers/campaignWorkflow.controller');
const clientWorkflowController = require('../controllers/clientWorkflow.controller');
const approvalWorkflowController = require('../controllers/approvalWorkflow.controller');

// ============================================
// LEAD WORKFLOWS - /api/workflows/leads
// ============================================

/**
 * Lead Conversion Workflows
 */
router.post('/leads/:id/convert-to-opportunity', leadWorkflowController.convertToOpportunity);
router.post('/leads/:id/convert-to-client', leadWorkflowController.convertToClient);
router.post('/leads/:id/create-quote', leadWorkflowController.createQuote);

/**
 * Lead Assignment Workflows
 */
router.post('/leads/:id/assign', leadWorkflowController.assignLead);
router.post('/leads/:id/reassign', leadWorkflowController.reassignLead);
router.post('/leads/bulk-assign', leadWorkflowController.bulkAssign);

/**
 * Lead Qualification Workflows
 */
router.post('/leads/:id/qualify', leadWorkflowController.qualifyLead);
router.post('/leads/:id/disqualify', leadWorkflowController.disqualifyLead);
router.get('/leads/:id/qualification-score', leadWorkflowController.getQualificationScore);

/**
 * Lead Nurturing Workflows
 */
router.post('/leads/:id/start-nurturing', leadWorkflowController.startNurturing);
router.post('/leads/:id/pause-nurturing', leadWorkflowController.pauseNurturing);
router.post('/leads/:id/resume-nurturing', leadWorkflowController.resumeNurturing);
router.get('/leads/:id/next-nurturing-step', leadWorkflowController.getNextNurturingStep);

/**
 * Lead Stage Management Workflows
 */
router.post('/leads/:id/move-stage', leadWorkflowController.moveToStage);
router.post('/leads/:id/progress-stage', leadWorkflowController.progressStage);
router.post('/leads/:id/mark-won', leadWorkflowController.markAsWon);
router.post('/leads/:id/mark-lost', leadWorkflowController.markAsLost);

/**
 * Lead Workflow Analytics
 */
router.get('/leads/:id/workflow-history', leadWorkflowController.getWorkflowHistory);
router.get('/leads/stats', leadWorkflowController.getWorkflowStats);

// ============================================
// QUOTE WORKFLOWS - /api/workflows/quotes
// ============================================

/**
 * Quote Creation Workflows
 */
router.post('/quotes/from-lead/:leadId', quoteWorkflowController.createFromLead);
router.post('/quotes/from-client/:clientId', quoteWorkflowController.createFromClient);
router.post('/quotes/:id/duplicate', quoteWorkflowController.duplicateQuote);

/**
 * Quote Versioning Workflows
 */
router.post('/quotes/:id/revision', quoteWorkflowController.createRevision);
router.get('/quotes/:id/version-history', quoteWorkflowController.getVersionHistory);
router.get('/quotes/:id/compare-versions', quoteWorkflowController.compareVersions);

/**
 * Quote Approval Workflows
 */
router.post('/quotes/:id/submit-approval', quoteWorkflowController.submitForApproval);
router.post('/quotes/:id/approve', quoteWorkflowController.approveQuote);
router.post('/quotes/:id/reject', quoteWorkflowController.rejectQuote);
router.get('/quotes/:id/approval-status', quoteWorkflowController.getApprovalStatus);
router.get('/quotes/pending-approvals', quoteWorkflowController.getPendingApprovals);

/**
 * Quote Delivery Workflows
 */
router.post('/quotes/:id/send', quoteWorkflowController.sendQuote);
router.post('/quotes/:id/resend', quoteWorkflowController.resendQuote);
router.get('/quotes/:id/view-link', quoteWorkflowController.getViewLink);
router.post('/quotes/:id/track-view', quoteWorkflowController.trackView);

/**
 * Quote Conversion Workflows
 */
router.post('/quotes/:id/convert-to-invoice', quoteWorkflowController.convertToInvoice);

/**
 * Quote Expiry Workflows
 */
router.get('/quotes/:id/check-expiry', quoteWorkflowController.checkExpiry);
router.post('/quotes/:id/extend-validity', quoteWorkflowController.extendValidity);
router.post('/quotes/process-expired', quoteWorkflowController.processExpired);

/**
 * Quote Analytics
 */
router.get('/quotes/metrics', quoteWorkflowController.getMetrics);
router.get('/quotes/conversion-rate', quoteWorkflowController.getConversionRate);

// ============================================
// ACTIVITY WORKFLOWS - /api/workflows/activities
// ============================================

/**
 * Activity Scheduling Workflows
 */
router.post('/activities/schedule', activityWorkflowController.scheduleActivity);
router.post('/activities/:id/reschedule', activityWorkflowController.rescheduleActivity);
router.post('/activities/:id/cancel', activityWorkflowController.cancelActivity);
router.post('/activities/bulk-schedule', activityWorkflowController.bulkSchedule);

/**
 * Activity Reminder Workflows
 */
router.post('/activities/:id/reminder', activityWorkflowController.setReminder);
router.put('/activities/:id/reminder', activityWorkflowController.updateReminder);
router.get('/activities/due-reminders', activityWorkflowController.getDueReminders);
router.post('/activities/:id/reminder-sent', activityWorkflowController.markReminderSent);
router.post('/activities/:id/snooze', activityWorkflowController.snoozeReminder);

/**
 * Activity Completion Workflows
 */
router.post('/activities/:id/complete', activityWorkflowController.completeActivity);
router.post('/activities/:id/partial-complete', activityWorkflowController.partialComplete);
router.post('/activities/:id/undo-complete', activityWorkflowController.undoComplete);
router.post('/activities/:id/trigger-next', activityWorkflowController.triggerNextActivity);

/**
 * Activity Chain Workflows
 */
router.post('/activities/chain', activityWorkflowController.createActivityChain);
router.get('/activities/chain/:chainId/status', activityWorkflowController.getChainStatus);

/**
 * Activity Plan Workflows
 */
router.post('/activities/plans/:planId/start', activityWorkflowController.startPlan);
router.post('/activities/executions/:executionId/pause', activityWorkflowController.pausePlan);
router.post('/activities/executions/:executionId/resume', activityWorkflowController.resumePlan);
router.post('/activities/executions/:executionId/skip-step', activityWorkflowController.skipStep);
router.get('/activities/executions/:executionId/progress', activityWorkflowController.getPlanProgress);

/**
 * Recurring Activity Workflows
 */
router.post('/activities/recurring', activityWorkflowController.createRecurring);
router.put('/activities/:id/recurrence', activityWorkflowController.updateRecurrence);
router.post('/activities/:id/generate-next', activityWorkflowController.generateNextOccurrence);
router.post('/activities/:id/end-recurrence', activityWorkflowController.endRecurrence);

/**
 * Activity Analytics
 */
router.get('/activities/completion-rate', activityWorkflowController.getCompletionRate);
router.get('/activities/overdue', activityWorkflowController.getOverdueActivities);
router.get('/activities/load', activityWorkflowController.getActivityLoad);

// ============================================
// CAMPAIGN WORKFLOWS - /api/workflows/campaigns
// ============================================

/**
 * Campaign Creation Workflows
 */
router.post('/campaigns/create', campaignWorkflowController.createCampaign);
router.post('/campaigns/:id/duplicate', campaignWorkflowController.duplicateCampaign);
// router.post('/campaigns/from-template/:templateId', campaignWorkflowController.createFromTemplate); // TODO: Not implemented

/**
 * Campaign Lifecycle Workflows
 */
router.post('/campaigns/:id/launch', campaignWorkflowController.launchCampaign);
router.post('/campaigns/:id/pause', campaignWorkflowController.pauseCampaign);
router.post('/campaigns/:id/resume', campaignWorkflowController.resumeCampaign);
// router.post('/campaigns/:id/complete', campaignWorkflowController.completeCampaign); // TODO: Not implemented
// router.post('/campaigns/:id/cancel', campaignWorkflowController.cancelCampaign); // TODO: Not implemented

/**
 * Campaign Audience Management Workflows
 */
router.post('/campaigns/:id/add-contacts', campaignWorkflowController.addContactsToCampaign);
router.post('/campaigns/:id/remove-contacts', campaignWorkflowController.removeContactsFromCampaign);
// router.post('/campaigns/:id/segment-audience', campaignWorkflowController.segmentAudience); // TODO: Not implemented
// router.get('/campaigns/:id/eligible-contacts', campaignWorkflowController.getEligibleContacts); // TODO: Not implemented

/**
 * Campaign Execution Workflows
 */
router.post('/campaigns/:id/send-batch', campaignWorkflowController.sendCampaignEmails);
// router.post('/campaigns/:id/schedule-send', campaignWorkflowController.scheduleSend); // TODO: Not implemented
router.post('/campaigns/:id/send-test', campaignWorkflowController.sendTestEmail);

/**
 * Campaign Response Workflows
 */
router.post('/campaigns/:id/track-open', campaignWorkflowController.trackOpen);
router.post('/campaigns/:id/track-click', campaignWorkflowController.trackClick);
router.post('/campaigns/:id/track-response', campaignWorkflowController.trackReply);
router.post('/campaigns/:id/track-conversion', campaignWorkflowController.attributeConversion);

/**
 * Campaign Analytics & Reporting
 */
router.get('/campaigns/:id/performance', campaignWorkflowController.getCampaignStats);
router.get('/campaigns/:id/roi', campaignWorkflowController.calculateCampaignROI);
router.get('/campaigns/:id/engagement-stats', campaignWorkflowController.getEngagementMetrics);
// router.get('/campaigns/analytics/overview', campaignWorkflowController.getCampaignOverview); // TODO: Not implemented

// ============================================
// CLIENT WORKFLOWS - /api/workflows/clients
// ============================================

/**
 * Client Onboarding Workflows
 */
router.post('/clients/:id/start-onboarding', clientWorkflowController.startOnboarding);
router.post('/clients/:id/complete-onboarding-step', clientWorkflowController.completeOnboardingStep);
router.get('/clients/:id/onboarding-progress', clientWorkflowController.getOnboardingProgress);
router.post('/clients/:id/skip-onboarding-step', clientWorkflowController.skipOnboardingStep);
router.post('/clients/:id/complete-onboarding', clientWorkflowController.completeOnboarding);

/**
 * Client Document Workflows
 */
// router.post('/clients/:id/request-documents', clientWorkflowController.requestDocuments); // TODO: Not implemented
// router.post('/clients/:id/approve-document', clientWorkflowController.approveDocument); // TODO: Not implemented
// router.post('/clients/:id/reject-document', clientWorkflowController.rejectDocument); // TODO: Not implemented
// router.get('/clients/:id/pending-documents', clientWorkflowController.getPendingDocuments); // TODO: Not implemented

/**
 * Client Engagement Workflows
 */
// router.post('/clients/:id/schedule-check-in', clientWorkflowController.scheduleCheckIn); // TODO: Not implemented
// router.post('/clients/:id/record-interaction', clientWorkflowController.recordInteraction); // TODO: Not implemented
// router.post('/clients/:id/send-update', clientWorkflowController.sendUpdate); // TODO: Not implemented
// router.get('/clients/:id/engagement-score', clientWorkflowController.getEngagementScore); // TODO: Not implemented

/**
 * Client Status Workflows
 */
// router.post('/clients/:id/activate', clientWorkflowController.activateClient); // TODO: Not implemented
// router.post('/clients/:id/deactivate', clientWorkflowController.deactivateClient); // TODO: Not implemented
// router.post('/clients/:id/mark-at-risk', clientWorkflowController.markAtRisk); // TODO: Not implemented
router.post('/clients/:id/upgrade-tier', clientWorkflowController.upgradeClient);
router.post('/clients/:id/downgrade-tier', clientWorkflowController.downgradeClient);

/**
 * Client Retention Workflows
 */
router.post('/clients/:id/start-retention-campaign', clientWorkflowController.startReactivation);
// router.post('/clients/:id/schedule-renewal', clientWorkflowController.scheduleRenewal); // TODO: Not implemented
// router.get('/clients/:id/renewal-probability', clientWorkflowController.getRenewalProbability); // TODO: Not implemented
// router.post('/clients/:id/win-back', clientWorkflowController.initiateWinBack); // TODO: Not implemented

/**
 * Client Offboarding Workflows
 */
// router.post('/clients/:id/start-offboarding', clientWorkflowController.startOffboarding); // TODO: Not implemented
// router.post('/clients/:id/complete-offboarding-step', clientWorkflowController.completeOffboardingStep); // TODO: Not implemented
// router.get('/clients/:id/offboarding-progress', clientWorkflowController.getOffboardingProgress); // TODO: Not implemented
// router.post('/clients/:id/complete-offboarding', clientWorkflowController.completeOffboarding); // TODO: Not implemented

/**
 * Client Communication Workflows
 */
// router.post('/clients/:id/send-portal-invite', clientWorkflowController.sendPortalInvite); // TODO: Not implemented
// router.post('/clients/:id/send-satisfaction-survey', clientWorkflowController.sendSatisfactionSurvey); // TODO: Not implemented
// router.post('/clients/:id/request-review', clientWorkflowController.requestReview); // TODO: Not implemented
// router.post('/clients/:id/send-referral-request', clientWorkflowController.sendReferralRequest); // TODO: Not implemented

/**
 * Client Lifecycle Analytics
 */
router.get('/clients/:id/lifecycle-stage', clientWorkflowController.getLifecycleStage);
router.get('/clients/:id/lifetime-value', clientWorkflowController.calculateLifetimeValue);
router.get('/clients/:id/health-score', clientWorkflowController.calculateHealthScore);
// router.get('/clients/retention-metrics', clientWorkflowController.getRetentionMetrics); // TODO: Not implemented

// ============================================
// APPROVAL WORKFLOWS - /api/workflows/approvals
// ============================================

/**
 * Approval Request Workflows
 */
router.post('/approvals/submit', approvalWorkflowController.createApprovalRequest);
// router.post('/approvals/:id/reassign', approvalWorkflowController.reassignApproval); // TODO: Not implemented
router.post('/approvals/:id/escalate', approvalWorkflowController.escalate);
router.post('/approvals/:id/recall', approvalWorkflowController.cancelApprovalRequest);

/**
 * Approval Decision Workflows
 */
router.post('/approvals/:id/approve', approvalWorkflowController.approve);
router.post('/approvals/:id/reject', approvalWorkflowController.reject);
router.post('/approvals/:id/request-changes', approvalWorkflowController.requestMoreInfo);
// router.post('/approvals/:id/conditional-approve', approvalWorkflowController.conditionalApprove); // TODO: Not implemented

/**
 * Multi-Step Approval Workflows
 */
// router.post('/approvals/:id/advance-stage', approvalWorkflowController.advanceStage); // TODO: Not implemented
// router.post('/approvals/:id/skip-stage', approvalWorkflowController.skipStage); // TODO: Not implemented
// router.get('/approvals/:id/current-stage', approvalWorkflowController.getCurrentStage); // TODO: Not implemented
router.get('/approvals/:id/approval-chain', approvalWorkflowController.getApprovalChains);

/**
 * Approval Delegation Workflows
 */
router.post('/approvals/:id/delegate', approvalWorkflowController.delegate);
// router.post('/approvals/:id/add-parallel-approver', approvalWorkflowController.addParallelApprover); // TODO: Not implemented
// router.post('/approvals/:id/remove-approver', approvalWorkflowController.removeApprover); // TODO: Not implemented

/**
 * Approval Notification Workflows
 */
router.post('/approvals/:id/send-reminder', approvalWorkflowController.sendReminder);
router.post('/approvals/:id/notify-stakeholders', approvalWorkflowController.notifyApprovers);
// router.post('/approvals/send-daily-digest', approvalWorkflowController.sendDailyDigest); // TODO: Not implemented

/**
 * Approval Query & Status Workflows
 */
router.get('/approvals/pending', approvalWorkflowController.getPendingApprovals);
router.get('/approvals/my-approvals', approvalWorkflowController.getMyRequests);
router.get('/approvals/:id/status', approvalWorkflowController.getApprovalRequest);
router.get('/approvals/:id/history', approvalWorkflowController.getApprovalHistory);
// router.get('/approvals/:id/comments', approvalWorkflowController.getApprovalComments); // TODO: Not implemented

/**
 * Approval Policy Workflows
 */
router.post('/approvals/:id/apply-policy', approvalWorkflowController.evaluateRules);
// router.post('/approvals/:id/override-policy', approvalWorkflowController.overridePolicy); // TODO: Not implemented
router.get('/approvals/policies/applicable', approvalWorkflowController.getApplicableRules);

/**
 * Approval Analytics
 */
router.get('/approvals/metrics/cycle-time', approvalWorkflowController.getAverageApprovalTime);
router.get('/approvals/metrics/bottlenecks', approvalWorkflowController.getBottlenecks);
router.get('/approvals/metrics/approval-rate', approvalWorkflowController.getApprovalRates);
router.get('/approvals/analytics/overview', approvalWorkflowController.getApprovalStats);

module.exports = router;
