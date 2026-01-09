/**
 * Workflows API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// POST /api/workflows/leads/:id/convert-to-opportunity
export interface CreateWorkflowsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWorkflowsResponse = ApiResponse<Workflows>;

// POST /api/workflows/leads/:id/convert-to-client
export interface CreateWorkflowsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWorkflowsResponse = ApiResponse<Workflows>;

// POST /api/workflows/leads/:id/create-quote
export interface CreateWorkflowsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWorkflowsResponse = ApiResponse<Workflows>;

// POST /api/workflows/leads/:id/assign
export interface CreateWorkflowsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWorkflowsResponse = ApiResponse<Workflows>;

// POST /api/workflows/leads/:id/reassign
export interface CreateWorkflowsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWorkflowsResponse = ApiResponse<Workflows>;

// POST /api/workflows/leads/bulk-assign
export interface CreateWorkflowsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWorkflowsResponse = ApiResponse<Workflows>;

// POST /api/workflows/leads/:id/qualify
export interface CreateWorkflowsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWorkflowsResponse = ApiResponse<Workflows>;

// POST /api/workflows/leads/:id/disqualify
export interface CreateWorkflowsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWorkflowsResponse = ApiResponse<Workflows>;

// GET /api/workflows/leads/:id/qualification-score
export type GetWorkflowsResponse = ApiResponse<Workflows>;

// POST /api/workflows/leads/:id/start-nurturing
export interface CreateWorkflowsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWorkflowsResponse = ApiResponse<Workflows>;

// POST /api/workflows/leads/:id/pause-nurturing
export interface CreateWorkflowsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWorkflowsResponse = ApiResponse<Workflows>;

// POST /api/workflows/leads/:id/resume-nurturing
export interface CreateWorkflowsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWorkflowsResponse = ApiResponse<Workflows>;

// GET /api/workflows/leads/:id/next-nurturing-step
export type GetWorkflowsResponse = ApiResponse<Workflows>;

// POST /api/workflows/leads/:id/move-stage
export interface CreateWorkflowsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWorkflowsResponse = ApiResponse<Workflows>;

// POST /api/workflows/leads/:id/progress-stage
export interface CreateWorkflowsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWorkflowsResponse = ApiResponse<Workflows>;

// POST /api/workflows/leads/:id/mark-won
export interface CreateWorkflowsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWorkflowsResponse = ApiResponse<Workflows>;

// POST /api/workflows/leads/:id/mark-lost
export interface CreateWorkflowsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWorkflowsResponse = ApiResponse<Workflows>;

// GET /api/workflows/leads/:id/workflow-history
export type GetWorkflowsResponse = ApiResponse<Workflows>;

// GET /api/workflows/leads/stats
export interface WorkflowsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type WorkflowsListResponse = PaginatedResponse<Workflows>;

// POST /api/workflows/quotes/from-lead/:leadId
export interface CreateWorkflowsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWorkflowsResponse = ApiResponse<Workflows>;

// POST /api/workflows/quotes/from-client/:clientId
export interface CreateWorkflowsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWorkflowsResponse = ApiResponse<Workflows>;

// POST /api/workflows/quotes/:id/duplicate
export interface CreateWorkflowsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWorkflowsResponse = ApiResponse<Workflows>;

// POST /api/workflows/quotes/:id/revision
export interface CreateWorkflowsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWorkflowsResponse = ApiResponse<Workflows>;

// GET /api/workflows/quotes/:id/version-history
export type GetWorkflowsResponse = ApiResponse<Workflows>;

// GET /api/workflows/quotes/:id/compare-versions
export type GetWorkflowsResponse = ApiResponse<Workflows>;

// POST /api/workflows/quotes/:id/submit-approval
export interface CreateWorkflowsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWorkflowsResponse = ApiResponse<Workflows>;

// POST /api/workflows/quotes/:id/approve
export interface CreateWorkflowsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWorkflowsResponse = ApiResponse<Workflows>;

// POST /api/workflows/quotes/:id/reject
export interface CreateWorkflowsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWorkflowsResponse = ApiResponse<Workflows>;

// GET /api/workflows/quotes/:id/approval-status
export type GetWorkflowsResponse = ApiResponse<Workflows>;

// GET /api/workflows/quotes/pending-approvals
export interface WorkflowsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type WorkflowsListResponse = PaginatedResponse<Workflows>;

// POST /api/workflows/quotes/:id/send
export interface CreateWorkflowsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWorkflowsResponse = ApiResponse<Workflows>;

// POST /api/workflows/quotes/:id/resend
export interface CreateWorkflowsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWorkflowsResponse = ApiResponse<Workflows>;

// GET /api/workflows/quotes/:id/view-link
export type GetWorkflowsResponse = ApiResponse<Workflows>;

// POST /api/workflows/quotes/:id/track-view
export interface CreateWorkflowsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWorkflowsResponse = ApiResponse<Workflows>;

// POST /api/workflows/quotes/:id/convert-to-invoice
export interface CreateWorkflowsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWorkflowsResponse = ApiResponse<Workflows>;

// GET /api/workflows/quotes/:id/check-expiry
export type GetWorkflowsResponse = ApiResponse<Workflows>;

// POST /api/workflows/quotes/:id/extend-validity
export interface CreateWorkflowsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWorkflowsResponse = ApiResponse<Workflows>;

// POST /api/workflows/quotes/process-expired
export interface CreateWorkflowsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWorkflowsResponse = ApiResponse<Workflows>;

// GET /api/workflows/quotes/metrics
export interface WorkflowsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type WorkflowsListResponse = PaginatedResponse<Workflows>;

// GET /api/workflows/quotes/conversion-rate
export interface WorkflowsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type WorkflowsListResponse = PaginatedResponse<Workflows>;

// POST /api/workflows/activities/schedule
export interface CreateWorkflowsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWorkflowsResponse = ApiResponse<Workflows>;

// POST /api/workflows/activities/:id/reschedule
export interface CreateWorkflowsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWorkflowsResponse = ApiResponse<Workflows>;

// POST /api/workflows/activities/:id/cancel
export interface CreateWorkflowsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWorkflowsResponse = ApiResponse<Workflows>;

// POST /api/workflows/activities/bulk-schedule
export interface CreateWorkflowsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWorkflowsResponse = ApiResponse<Workflows>;

// POST /api/workflows/activities/:id/reminder
export interface CreateWorkflowsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWorkflowsResponse = ApiResponse<Workflows>;

// PUT /api/workflows/activities/:id/reminder
export interface UpdateWorkflowsRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateWorkflowsResponse = ApiResponse<Workflows>;

// GET /api/workflows/activities/due-reminders
export interface WorkflowsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type WorkflowsListResponse = PaginatedResponse<Workflows>;

// POST /api/workflows/activities/:id/reminder-sent
export interface CreateWorkflowsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWorkflowsResponse = ApiResponse<Workflows>;

// POST /api/workflows/activities/:id/snooze
export interface CreateWorkflowsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWorkflowsResponse = ApiResponse<Workflows>;

// POST /api/workflows/activities/:id/complete
export interface CreateWorkflowsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWorkflowsResponse = ApiResponse<Workflows>;

// POST /api/workflows/activities/:id/partial-complete
export interface CreateWorkflowsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWorkflowsResponse = ApiResponse<Workflows>;

// POST /api/workflows/activities/:id/undo-complete
export interface CreateWorkflowsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWorkflowsResponse = ApiResponse<Workflows>;

// POST /api/workflows/activities/:id/trigger-next
export interface CreateWorkflowsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWorkflowsResponse = ApiResponse<Workflows>;

// POST /api/workflows/activities/chain
export interface CreateWorkflowsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWorkflowsResponse = ApiResponse<Workflows>;

// GET /api/workflows/activities/chain/:chainId/status
export interface WorkflowsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type WorkflowsListResponse = PaginatedResponse<Workflows>;

// POST /api/workflows/activities/plans/:planId/start
export interface CreateWorkflowsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWorkflowsResponse = ApiResponse<Workflows>;

// POST /api/workflows/activities/executions/:executionId/pause
export interface CreateWorkflowsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWorkflowsResponse = ApiResponse<Workflows>;

// POST /api/workflows/activities/executions/:executionId/resume
export interface CreateWorkflowsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWorkflowsResponse = ApiResponse<Workflows>;

// POST /api/workflows/activities/executions/:executionId/skip-step
export interface CreateWorkflowsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWorkflowsResponse = ApiResponse<Workflows>;

// GET /api/workflows/activities/executions/:executionId/progress
export interface WorkflowsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type WorkflowsListResponse = PaginatedResponse<Workflows>;

// POST /api/workflows/activities/recurring
export interface CreateWorkflowsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWorkflowsResponse = ApiResponse<Workflows>;

// PUT /api/workflows/activities/:id/recurrence
export interface UpdateWorkflowsRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateWorkflowsResponse = ApiResponse<Workflows>;

// POST /api/workflows/activities/:id/generate-next
export interface CreateWorkflowsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWorkflowsResponse = ApiResponse<Workflows>;

// POST /api/workflows/activities/:id/end-recurrence
export interface CreateWorkflowsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWorkflowsResponse = ApiResponse<Workflows>;

// GET /api/workflows/activities/completion-rate
export interface WorkflowsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type WorkflowsListResponse = PaginatedResponse<Workflows>;

// GET /api/workflows/activities/overdue
export interface WorkflowsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type WorkflowsListResponse = PaginatedResponse<Workflows>;

// GET /api/workflows/activities/load
export interface WorkflowsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type WorkflowsListResponse = PaginatedResponse<Workflows>;

// POST /api/workflows/campaigns/create
export interface CreateWorkflowsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWorkflowsResponse = ApiResponse<Workflows>;

// POST /api/workflows/campaigns/:id/duplicate
export interface CreateWorkflowsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWorkflowsResponse = ApiResponse<Workflows>;

// POST /api/workflows/campaigns/from-template/:templateId
export interface CreateWorkflowsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWorkflowsResponse = ApiResponse<Workflows>;

// POST /api/workflows/campaigns/:id/launch
export interface CreateWorkflowsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWorkflowsResponse = ApiResponse<Workflows>;

// POST /api/workflows/campaigns/:id/pause
export interface CreateWorkflowsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWorkflowsResponse = ApiResponse<Workflows>;

// POST /api/workflows/campaigns/:id/resume
export interface CreateWorkflowsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWorkflowsResponse = ApiResponse<Workflows>;

// POST /api/workflows/campaigns/:id/complete
export interface CreateWorkflowsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWorkflowsResponse = ApiResponse<Workflows>;

// POST /api/workflows/campaigns/:id/cancel
export interface CreateWorkflowsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWorkflowsResponse = ApiResponse<Workflows>;

// POST /api/workflows/campaigns/:id/add-contacts
export interface CreateWorkflowsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWorkflowsResponse = ApiResponse<Workflows>;

// POST /api/workflows/campaigns/:id/remove-contacts
export interface CreateWorkflowsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWorkflowsResponse = ApiResponse<Workflows>;

// POST /api/workflows/campaigns/:id/segment-audience
export interface CreateWorkflowsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWorkflowsResponse = ApiResponse<Workflows>;

// GET /api/workflows/campaigns/:id/eligible-contacts
export type GetWorkflowsResponse = ApiResponse<Workflows>;

// POST /api/workflows/campaigns/:id/send-batch
export interface CreateWorkflowsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWorkflowsResponse = ApiResponse<Workflows>;

// POST /api/workflows/campaigns/:id/schedule-send
export interface CreateWorkflowsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWorkflowsResponse = ApiResponse<Workflows>;

// POST /api/workflows/campaigns/:id/send-test
export interface CreateWorkflowsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWorkflowsResponse = ApiResponse<Workflows>;

// POST /api/workflows/campaigns/:id/track-open
export interface CreateWorkflowsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWorkflowsResponse = ApiResponse<Workflows>;

// POST /api/workflows/campaigns/:id/track-click
export interface CreateWorkflowsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWorkflowsResponse = ApiResponse<Workflows>;

// POST /api/workflows/campaigns/:id/track-response
export interface CreateWorkflowsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWorkflowsResponse = ApiResponse<Workflows>;

// POST /api/workflows/campaigns/:id/track-conversion
export interface CreateWorkflowsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWorkflowsResponse = ApiResponse<Workflows>;

// GET /api/workflows/campaigns/:id/performance
export type GetWorkflowsResponse = ApiResponse<Workflows>;

// GET /api/workflows/campaigns/:id/roi
export type GetWorkflowsResponse = ApiResponse<Workflows>;

// GET /api/workflows/campaigns/:id/engagement-stats
export type GetWorkflowsResponse = ApiResponse<Workflows>;

// GET /api/workflows/campaigns/analytics/overview
export interface WorkflowsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type WorkflowsListResponse = PaginatedResponse<Workflows>;

// POST /api/workflows/clients/:id/start-onboarding
export interface CreateWorkflowsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWorkflowsResponse = ApiResponse<Workflows>;

// POST /api/workflows/clients/:id/complete-onboarding-step
export interface CreateWorkflowsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWorkflowsResponse = ApiResponse<Workflows>;

// GET /api/workflows/clients/:id/onboarding-progress
export type GetWorkflowsResponse = ApiResponse<Workflows>;

// POST /api/workflows/clients/:id/skip-onboarding-step
export interface CreateWorkflowsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWorkflowsResponse = ApiResponse<Workflows>;

// POST /api/workflows/clients/:id/complete-onboarding
export interface CreateWorkflowsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWorkflowsResponse = ApiResponse<Workflows>;

// POST /api/workflows/clients/:id/request-documents
export interface CreateWorkflowsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWorkflowsResponse = ApiResponse<Workflows>;

// POST /api/workflows/clients/:id/approve-document
export interface CreateWorkflowsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWorkflowsResponse = ApiResponse<Workflows>;

// POST /api/workflows/clients/:id/reject-document
export interface CreateWorkflowsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWorkflowsResponse = ApiResponse<Workflows>;

// GET /api/workflows/clients/:id/pending-documents
export type GetWorkflowsResponse = ApiResponse<Workflows>;

// POST /api/workflows/clients/:id/schedule-check-in
export interface CreateWorkflowsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWorkflowsResponse = ApiResponse<Workflows>;

// POST /api/workflows/clients/:id/record-interaction
export interface CreateWorkflowsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWorkflowsResponse = ApiResponse<Workflows>;

// POST /api/workflows/clients/:id/send-update
export interface CreateWorkflowsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWorkflowsResponse = ApiResponse<Workflows>;

// GET /api/workflows/clients/:id/engagement-score
export type GetWorkflowsResponse = ApiResponse<Workflows>;

// POST /api/workflows/clients/:id/activate
export interface CreateWorkflowsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWorkflowsResponse = ApiResponse<Workflows>;

// POST /api/workflows/clients/:id/deactivate
export interface CreateWorkflowsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWorkflowsResponse = ApiResponse<Workflows>;

// POST /api/workflows/clients/:id/mark-at-risk
export interface CreateWorkflowsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWorkflowsResponse = ApiResponse<Workflows>;

// POST /api/workflows/clients/:id/upgrade-tier
export interface CreateWorkflowsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWorkflowsResponse = ApiResponse<Workflows>;

// POST /api/workflows/clients/:id/downgrade-tier
export interface CreateWorkflowsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWorkflowsResponse = ApiResponse<Workflows>;

// POST /api/workflows/clients/:id/start-retention-campaign
export interface CreateWorkflowsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWorkflowsResponse = ApiResponse<Workflows>;

// POST /api/workflows/clients/:id/schedule-renewal
export interface CreateWorkflowsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWorkflowsResponse = ApiResponse<Workflows>;

// GET /api/workflows/clients/:id/renewal-probability
export type GetWorkflowsResponse = ApiResponse<Workflows>;

// POST /api/workflows/clients/:id/win-back
export interface CreateWorkflowsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWorkflowsResponse = ApiResponse<Workflows>;

// POST /api/workflows/clients/:id/start-offboarding
export interface CreateWorkflowsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWorkflowsResponse = ApiResponse<Workflows>;

// POST /api/workflows/clients/:id/complete-offboarding-step
export interface CreateWorkflowsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWorkflowsResponse = ApiResponse<Workflows>;

// GET /api/workflows/clients/:id/offboarding-progress
export type GetWorkflowsResponse = ApiResponse<Workflows>;

// POST /api/workflows/clients/:id/complete-offboarding
export interface CreateWorkflowsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWorkflowsResponse = ApiResponse<Workflows>;

// POST /api/workflows/clients/:id/send-portal-invite
export interface CreateWorkflowsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWorkflowsResponse = ApiResponse<Workflows>;

// POST /api/workflows/clients/:id/send-satisfaction-survey
export interface CreateWorkflowsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWorkflowsResponse = ApiResponse<Workflows>;

// POST /api/workflows/clients/:id/request-review
export interface CreateWorkflowsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWorkflowsResponse = ApiResponse<Workflows>;

// POST /api/workflows/clients/:id/send-referral-request
export interface CreateWorkflowsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWorkflowsResponse = ApiResponse<Workflows>;

// GET /api/workflows/clients/:id/lifecycle-stage
export type GetWorkflowsResponse = ApiResponse<Workflows>;

// GET /api/workflows/clients/:id/lifetime-value
export type GetWorkflowsResponse = ApiResponse<Workflows>;

// GET /api/workflows/clients/:id/health-score
export type GetWorkflowsResponse = ApiResponse<Workflows>;

// GET /api/workflows/clients/retention-metrics
export interface WorkflowsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type WorkflowsListResponse = PaginatedResponse<Workflows>;

// POST /api/workflows/approvals/submit
export interface CreateWorkflowsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWorkflowsResponse = ApiResponse<Workflows>;

// POST /api/workflows/approvals/:id/reassign
export interface CreateWorkflowsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWorkflowsResponse = ApiResponse<Workflows>;

// POST /api/workflows/approvals/:id/escalate
export interface CreateWorkflowsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWorkflowsResponse = ApiResponse<Workflows>;

// POST /api/workflows/approvals/:id/recall
export interface CreateWorkflowsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWorkflowsResponse = ApiResponse<Workflows>;

// POST /api/workflows/approvals/:id/approve
export interface CreateWorkflowsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWorkflowsResponse = ApiResponse<Workflows>;

// POST /api/workflows/approvals/:id/reject
export interface CreateWorkflowsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWorkflowsResponse = ApiResponse<Workflows>;

// POST /api/workflows/approvals/:id/request-changes
export interface CreateWorkflowsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWorkflowsResponse = ApiResponse<Workflows>;

// POST /api/workflows/approvals/:id/conditional-approve
export interface CreateWorkflowsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWorkflowsResponse = ApiResponse<Workflows>;

// POST /api/workflows/approvals/:id/advance-stage
export interface CreateWorkflowsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWorkflowsResponse = ApiResponse<Workflows>;

// POST /api/workflows/approvals/:id/skip-stage
export interface CreateWorkflowsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWorkflowsResponse = ApiResponse<Workflows>;

// GET /api/workflows/approvals/:id/current-stage
export type GetWorkflowsResponse = ApiResponse<Workflows>;

// GET /api/workflows/approvals/:id/approval-chain
export type GetWorkflowsResponse = ApiResponse<Workflows>;

// POST /api/workflows/approvals/:id/delegate
export interface CreateWorkflowsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWorkflowsResponse = ApiResponse<Workflows>;

// POST /api/workflows/approvals/:id/add-parallel-approver
export interface CreateWorkflowsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWorkflowsResponse = ApiResponse<Workflows>;

// POST /api/workflows/approvals/:id/remove-approver
export interface CreateWorkflowsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWorkflowsResponse = ApiResponse<Workflows>;

// POST /api/workflows/approvals/:id/send-reminder
export interface CreateWorkflowsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWorkflowsResponse = ApiResponse<Workflows>;

// POST /api/workflows/approvals/:id/notify-stakeholders
export interface CreateWorkflowsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWorkflowsResponse = ApiResponse<Workflows>;

// POST /api/workflows/approvals/send-daily-digest
export interface CreateWorkflowsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWorkflowsResponse = ApiResponse<Workflows>;

// GET /api/workflows/approvals/pending
export interface WorkflowsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type WorkflowsListResponse = PaginatedResponse<Workflows>;

// GET /api/workflows/approvals/my-approvals
export interface WorkflowsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type WorkflowsListResponse = PaginatedResponse<Workflows>;

// GET /api/workflows/approvals/:id/status
export type GetWorkflowsResponse = ApiResponse<Workflows>;

// GET /api/workflows/approvals/:id/history
export type GetWorkflowsResponse = ApiResponse<Workflows>;

// GET /api/workflows/approvals/:id/comments
export type GetWorkflowsResponse = ApiResponse<Workflows>;

// POST /api/workflows/approvals/:id/apply-policy
export interface CreateWorkflowsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWorkflowsResponse = ApiResponse<Workflows>;

// POST /api/workflows/approvals/:id/override-policy
export interface CreateWorkflowsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWorkflowsResponse = ApiResponse<Workflows>;

// GET /api/workflows/approvals/policies/applicable
export interface WorkflowsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type WorkflowsListResponse = PaginatedResponse<Workflows>;

// GET /api/workflows/approvals/metrics/cycle-time
export interface WorkflowsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type WorkflowsListResponse = PaginatedResponse<Workflows>;

// GET /api/workflows/approvals/metrics/bottlenecks
export interface WorkflowsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type WorkflowsListResponse = PaginatedResponse<Workflows>;

// GET /api/workflows/approvals/metrics/approval-rate
export interface WorkflowsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type WorkflowsListResponse = PaginatedResponse<Workflows>;

// GET /api/workflows/approvals/analytics/overview
export interface WorkflowsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type WorkflowsListResponse = PaginatedResponse<Workflows>;
