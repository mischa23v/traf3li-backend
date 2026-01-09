# Frontend vs Backend Contract Mismatch Report

> Generated: 2026-01-09T08:52:41.402Z

## Summary

| Category | Frontend Only | Backend Only | Mismatches |
|----------|--------------|--------------|------------|
| API Endpoints | 2563 | 3672 | 17 |
| Interfaces/Entities | 2871 | 154 | 0 |
| Enums | 88 | 2138 | 0 |
| Type Aliases | 167 | 0 | - |

---

## 🔴 Critical: API Endpoints Frontend Expects But Backend Doesn't Have

These endpoints are called by frontend but don't exist in backend - **will cause 404 errors**.

### hr (637 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/hr/analytics/dashboard` | hooks/useHrAnalytics.ts |
| GET | `/hr/advances?${params.toString()}` | services/advancesService.ts |
| GET | `/hr/advances/${advanceId}` | services/advancesService.ts |
| POST | `/hr/advances` | services/advancesService.ts |
| PATCH | `/hr/advances/${advanceId}` | services/advancesService.ts |
| DELETE | `/hr/advances/${advanceId}` | services/advancesService.ts |
| GET | `/hr/advances/stats` | services/advancesService.ts |
| POST | `/hr/advances/check-eligibility` | services/advancesService.ts |
| POST | `/hr/advances/${advanceId}/cancel` | services/advancesService.ts |
| POST | `/hr/advances/${advanceId}/approve` | services/advancesService.ts |
| POST | `/hr/advances/${advanceId}/reject` | services/advancesService.ts |
| POST | `/hr/advances/${advanceId}/disburse` | services/advancesService.ts |
| POST | `/hr/advances/${advanceId}/recover` | services/advancesService.ts |
| POST | `/hr/advances/${advanceId}/payroll-deduction` | services/advancesService.ts |
| POST | `/hr/advances/${advanceId}/early-recovery` | services/advancesService.ts |
| POST | `/hr/advances/${advanceId}/write-off` | services/advancesService.ts |
| POST | `/hr/advances/${advanceId}/issue-clearance` | services/advancesService.ts |
| POST | `/hr/advances/${advanceId}/documents` | services/advancesService.ts |
| POST | `/hr/advances/${advanceId}/communications` | services/advancesService.ts |
| POST | `/hr/advances/bulk-delete` | services/advancesService.ts |
| GET | `/hr/advances/by-employee/${employeeId}` | services/advancesService.ts |
| GET | `/hr/advances/pending-approvals` | services/advancesService.ts |
| GET | `/hr/advances/overdue-recoveries` | services/advancesService.ts |
| GET | `/hr/advances/emergency` | services/advancesService.ts |
| POST | `/hr/advances/:param` | services/advancesService.ts |
| GET | `/hr/advances/:param/cancel` | services/advancesService.ts |
| POST | `/hr/advances/by-employee/:param` | services/advancesService.ts |
| GET | `/hr/asset-assignments?${params.toString()}` | services/assetAssignmentService.ts |
| GET | `/hr/asset-assignments/${assignmentId}` | services/assetAssignmentService.ts |
| POST | `/hr/asset-assignments` | services/assetAssignmentService.ts |
| PATCH | `/hr/asset-assignments/${assignmentId}` | services/assetAssignmentService.ts |
| DELETE | `/hr/asset-assignments/${assignmentId}` | services/assetAssignmentService.ts |
| GET | `/hr/asset-assignments/stats` | services/assetAssignmentService.ts |
| POST | `/hr/asset-assignments/${assignmentId}/acknowledge` | services/assetAssignmentService.ts |
| POST | `/hr/asset-assignments/${assignmentId}/return/initiate` | services/assetAssignmentService.ts |
| POST | `/hr/asset-assignments/${assignmentId}/return/complete` | services/assetAssignmentService.ts |
| POST | `/hr/asset-assignments/${assignmentId}/maintenance` | services/assetAssignmentService.ts |
| POST | `/hr/asset-assignments/${assignmentId}/incident` | services/assetAssignmentService.ts |
| POST | `/hr/asset-assignments/${assignmentId}/incidents/${incidentId}/resolve` | services/assetAssignmentService.ts |
| PUT | `/hr/asset-assignments/${assignmentId}/status` | services/assetAssignmentService.ts |
| POST | `/hr/asset-assignments/bulk-delete` | services/assetAssignmentService.ts |
| GET | `/hr/asset-assignments/by-employee/${employeeId}` | services/assetAssignmentService.ts |
| GET | `/hr/asset-assignments/overdue` | services/assetAssignmentService.ts |
| GET | `/hr/asset-assignments/maintenance-due` | services/assetAssignmentService.ts |
| GET | `/hr/asset-assignments/export?${params.toString()}` | services/assetAssignmentService.ts |
| POST | `/hr/asset-assignments/${assignmentId}/clearance` | services/assetAssignmentService.ts |
| POST | `/hr/asset-assignments/${assignmentId}/transfer` | services/assetAssignmentService.ts |
| POST | `/hr/asset-assignments/${assignmentId}/repair` | services/assetAssignmentService.ts |
| PUT | `/hr/asset-assignments/${assignmentId}/repair/${repairId}` | services/assetAssignmentService.ts |
| GET | `/hr/asset-assignments/warranty-expiring` | services/assetAssignmentService.ts |
| ... | *587 more* | - |

### tasks (78 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/tasks/${taskId}/full` | hooks/useTasks.ts |
| POST | `/tasks/${taskId}/attachments` | services/storageService.ts |
| DELETE | `/tasks/${taskId}/attachments/${attachmentId}` | services/storageService.ts |
| POST | `/tasks/${taskId}/voice-memos` | services/storageService.ts |
| GET | `/tasks` | services/tasksService.ts |
| GET | `/tasks/${id}` | services/tasksService.ts |
| POST | `/tasks` | services/tasksService.ts |
| PUT | `/tasks/${id}` | services/tasksService.ts |
| DELETE | `/tasks/${id}` | services/tasksService.ts |
| PATCH | `/tasks/${id}/status` | services/tasksService.ts |
| PATCH | `/tasks/${id}/progress` | services/tasksService.ts |
| POST | `/tasks/${id}/complete` | services/tasksService.ts |
| POST | `/tasks/${id}/reopen` | services/tasksService.ts |
| POST | `/tasks/${taskId}/subtasks` | services/tasksService.ts |
| PATCH | `/tasks/${taskId}/subtasks/${subtaskId}` | services/tasksService.ts |
| PATCH | `/tasks/${taskId}/subtasks/${subtaskId}/toggle` | services/tasksService.ts |
| POST | `/tasks/${taskId}/subtasks/${subtaskId}/toggle` | services/tasksService.ts |
| DELETE | `/tasks/${taskId}/subtasks/${subtaskId}` | services/tasksService.ts |
| PATCH | `/tasks/${taskId}/subtasks/reorder` | services/tasksService.ts |
| POST | `/tasks/${taskId}/timer/start` | services/tasksService.ts |
| POST | `/tasks/${taskId}/time-tracking/start` | services/tasksService.ts |
| POST | `/tasks/${taskId}/timer/stop` | services/tasksService.ts |
| POST | `/tasks/${taskId}/time-tracking/stop` | services/tasksService.ts |
| POST | `/tasks/${taskId}/time` | services/tasksService.ts |
| POST | `/tasks/${taskId}/time-tracking/manual` | services/tasksService.ts |
| GET | `/tasks/${taskId}/time-tracking/summary` | services/tasksService.ts |
| GET | `/tasks/${taskId}/time-tracking` | services/tasksService.ts |
| DELETE | `/tasks/${taskId}/time-tracking/reset` | services/tasksService.ts |
| POST | `/tasks/${taskId}/comments` | services/tasksService.ts |
| PUT | `/tasks/${taskId}/comments/${commentId}` | services/tasksService.ts |
| DELETE | `/tasks/${taskId}/comments/${commentId}` | services/tasksService.ts |
| GET | `/tasks/${taskId}/attachments/${attachmentId}/download-url` | services/tasksService.ts |
| GET | `/tasks/${taskId}/attachments/${attachmentId}/versions` | services/tasksService.ts |
| POST | `/tasks/${taskId}/dependencies` | services/tasksService.ts |
| DELETE | `/tasks/${taskId}/dependencies/${dependencyTaskId}` | services/tasksService.ts |
| GET | `/tasks/${taskId}/available-dependencies` | services/tasksService.ts |
| POST | `/tasks/${taskId}/workflow-rules` | services/tasksService.ts |
| PATCH | `/tasks/${taskId}/workflow-rules/${ruleId}` | services/tasksService.ts |
| DELETE | `/tasks/${taskId}/workflow-rules/${ruleId}` | services/tasksService.ts |
| POST | `/tasks/${taskId}/workflow-rules/${ruleId}/toggle` | services/tasksService.ts |
| PATCH | `/tasks/${taskId}/outcome` | services/tasksService.ts |
| PATCH | `/tasks/${taskId}/estimate` | services/tasksService.ts |
| GET | `/tasks/upcoming` | services/tasksService.ts |
| GET | `/tasks/overdue` | services/tasksService.ts |
| GET | `/tasks/due-today` | services/tasksService.ts |
| GET | `/tasks/case/${caseId}` | services/tasksService.ts |
| GET | `/tasks/my-tasks` | services/tasksService.ts |
| GET | `/tasks/stats` | services/tasksService.ts |
| GET | `/tasks/templates` | services/tasksService.ts |
| GET | `/tasks/templates/${templateId}` | services/tasksService.ts |
| ... | *28 more* | - |

### events (59 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/events` | hooks/useRemindersAndEvents.ts |
| GET | `/events/calendar` | services/eventsService.ts |
| GET | `/events/${id}` | services/eventsService.ts |
| POST | `/events` | services/eventsService.ts |
| PUT | `/events/${id}` | services/eventsService.ts |
| DELETE | `/events/${id}` | services/eventsService.ts |
| POST | `/events/${id}/complete` | services/eventsService.ts |
| POST | `/events/${id}/cancel` | services/eventsService.ts |
| POST | `/events/${id}/postpone` | services/eventsService.ts |
| POST | `/events/${id}/reschedule` | services/eventsService.ts |
| POST | `/events/${id}/start` | services/eventsService.ts |
| POST | `/events/${eventId}/attendees` | services/eventsService.ts |
| PATCH | `/events/${eventId}/attendees/${attendeeId}` | services/eventsService.ts |
| DELETE | `/events/${eventId}/attendees/${attendeeId}` | services/eventsService.ts |
| POST | `/events/${eventId}/rsvp` | services/eventsService.ts |
| POST | `/events/${eventId}/send-invitations` | services/eventsService.ts |
| POST | `/events/${eventId}/attendees/${attendeeId}/check-in` | services/eventsService.ts |
| POST | `/events/${eventId}/attendees/${attendeeId}/check-out` | services/eventsService.ts |
| POST | `/events/${eventId}/agenda` | services/eventsService.ts |
| PUT | `/events/${eventId}/agenda/${agendaId}` | services/eventsService.ts |
| DELETE | `/events/${eventId}/agenda/${agendaId}` | services/eventsService.ts |
| PATCH | `/events/${eventId}/notes` | services/eventsService.ts |
| POST | `/events/${eventId}/action-items` | services/eventsService.ts |
| PUT | `/events/${eventId}/action-items/${itemId}` | services/eventsService.ts |
| POST | `/events/${eventId}/action-items/${actionItemId}/toggle` | services/eventsService.ts |
| POST | `/events/${eventId}/attachments` | services/eventsService.ts |
| DELETE | `/events/${eventId}/attachments/${attachmentId}` | services/eventsService.ts |
| POST | `/events/${eventId}/comments` | services/eventsService.ts |
| PATCH | `/events/${eventId}/comments/${commentId}` | services/eventsService.ts |
| DELETE | `/events/${eventId}/comments/${commentId}` | services/eventsService.ts |
| GET | `/events/upcoming` | services/eventsService.ts |
| GET | `/events/today` | services/eventsService.ts |
| GET | `/events/date/${date}` | services/eventsService.ts |
| GET | `/events/month/${year}/${month}` | services/eventsService.ts |
| GET | `/events/my-events` | services/eventsService.ts |
| GET | `/events/pending-rsvp` | services/eventsService.ts |
| GET | `/events/stats` | services/eventsService.ts |
| POST | `/events/${eventId}/recurring/skip` | services/eventsService.ts |
| POST | `/events/${eventId}/recurring/stop` | services/eventsService.ts |
| GET | `/events/${eventId}/recurring/instances` | services/eventsService.ts |
| PUT | `/events/${eventId}/recurring/instance/${instanceDate}` | services/eventsService.ts |
| POST | `/events/${eventId}/calendar-sync` | services/eventsService.ts |
| GET | `/events/${eventId}/export/ics` | services/eventsService.ts |
| POST | `/events/import/ics` | services/eventsService.ts |
| PUT | `/events/bulk` | services/eventsService.ts |
| DELETE | `/events/bulk` | services/eventsService.ts |
| POST | `/events/bulk/cancel` | services/eventsService.ts |
| POST | `/events/bulk/complete` | services/eventsService.ts |
| POST | `/events/bulk/archive` | services/eventsService.ts |
| POST | `/events/bulk/unarchive` | services/eventsService.ts |
| ... | *9 more* | - |

### settings (55 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| PUT | `/settings/crm` | features/crm/components/crm-setup-wizard.tsx |
| GET | `/settings/taxes` | services/billingSettingsService.ts |
| POST | `/settings/taxes` | services/billingSettingsService.ts |
| PUT | `/settings/taxes/${id}` | services/billingSettingsService.ts |
| DELETE | `/settings/taxes/${id}` | services/billingSettingsService.ts |
| PATCH | `/settings/taxes/${id}/default` | services/billingSettingsService.ts |
| GET | `/settings/payment-modes` | services/billingSettingsService.ts |
| POST | `/settings/payment-modes` | services/billingSettingsService.ts |
| PUT | `/settings/payment-modes/${id}` | services/billingSettingsService.ts |
| DELETE | `/settings/payment-modes/${id}` | services/billingSettingsService.ts |
| PATCH | `/settings/payment-modes/${id}/default` | services/billingSettingsService.ts |
| GET | `/settings/finance` | services/billingSettingsService.ts |
| PUT | `/settings/finance` | services/billingSettingsService.ts |
| GET | `/settings/email/smtp` | services/emailSettingsService.ts |
| PUT | `/settings/email/smtp` | services/emailSettingsService.ts |
| POST | `/settings/email/smtp/test-connection` | services/emailSettingsService.ts |
| POST | `/settings/email/smtp/send-test` | services/emailSettingsService.ts |
| GET | `/settings/email/signatures` | services/emailSettingsService.ts |
| POST | `/settings/email/signatures` | services/emailSettingsService.ts |
| PUT | `/settings/email/signatures/${id}` | services/emailSettingsService.ts |
| DELETE | `/settings/email/signatures/${id}` | services/emailSettingsService.ts |
| PATCH | `/settings/email/signatures/${id}/default` | services/emailSettingsService.ts |
| GET | `/settings/email/templates` | services/emailSettingsService.ts |
| GET | `/settings/email/templates/${id}` | services/emailSettingsService.ts |
| POST | `/settings/email/templates` | services/emailSettingsService.ts |
| PUT | `/settings/email/templates/${id}` | services/emailSettingsService.ts |
| DELETE | `/settings/email/templates/${id}` | services/emailSettingsService.ts |
| PATCH | `/settings/email/templates/${id}/toggle` | services/emailSettingsService.ts |
| GET | `/settings/hr` | services/hrSettingsService.ts |
| PATCH | `/settings/hr` | services/hrSettingsService.ts |
| PATCH | `/settings/hr/employee` | services/hrSettingsService.ts |
| PATCH | `/settings/hr/leave` | services/hrSettingsService.ts |
| PATCH | `/settings/hr/attendance` | services/hrSettingsService.ts |
| PATCH | `/settings/hr/payroll` | services/hrSettingsService.ts |
| PATCH | `/settings/hr/expense` | services/hrSettingsService.ts |
| GET | `/settings/payment-terms` | services/paymentTermsService.ts |
| GET | `/settings/payment-terms/${id}` | services/paymentTermsService.ts |
| POST | `/settings/payment-terms` | services/paymentTermsService.ts |
| PUT | `/settings/payment-terms/${id}` | services/paymentTermsService.ts |
| DELETE | `/settings/payment-terms/${id}` | services/paymentTermsService.ts |
| PATCH | `/settings/payment-terms/${id}/default` | services/paymentTermsService.ts |
| POST | `/settings/payment-terms/initialize` | services/paymentTermsService.ts |
| GET | `/settings` | services/settingsService.ts |
| PATCH | `/settings/account` | services/settingsService.ts |
| PATCH | `/settings/appearance` | services/settingsService.ts |
| PATCH | `/settings/display` | services/settingsService.ts |
| PATCH | `/settings/notifications` | services/settingsService.ts |
| GET | `/settings/sso` | services/ssoService.ts |
| PATCH | `/settings/sso` | services/ssoService.ts |
| GET | `/settings/sso/providers/available` | services/ssoService.ts |
| ... | *5 more* | - |

### email-marketing (50 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/email-marketing/templates` | services/crmAdvancedService.ts |
| GET | `/email-marketing/templates/${id}` | services/crmAdvancedService.ts |
| POST | `/email-marketing/templates` | services/crmAdvancedService.ts |
| PUT | `/email-marketing/templates/${id}` | services/crmAdvancedService.ts |
| DELETE | `/email-marketing/templates/${id}` | services/crmAdvancedService.ts |
| POST | `/email-marketing/templates/${id}/preview` | services/crmAdvancedService.ts |
| POST | `/email-marketing/templates/${id}/duplicate` | services/crmAdvancedService.ts |
| GET | `/email-marketing/campaigns` | services/crmAdvancedService.ts |
| GET | `/email-marketing/campaigns/${id}` | services/crmAdvancedService.ts |
| POST | `/email-marketing/campaigns` | services/crmAdvancedService.ts |
| PUT | `/email-marketing/campaigns/${id}` | services/crmAdvancedService.ts |
| DELETE | `/email-marketing/campaigns/${id}` | services/crmAdvancedService.ts |
| POST | `/email-marketing/campaigns/${id}/send` | services/crmAdvancedService.ts |
| POST | `/email-marketing/campaigns/${id}/schedule` | services/crmAdvancedService.ts |
| POST | `/email-marketing/campaigns/${id}/pause` | services/crmAdvancedService.ts |
| POST | `/email-marketing/campaigns/${id}/resume` | services/crmAdvancedService.ts |
| GET | `/email-marketing/campaigns/${id}/analytics` | services/crmAdvancedService.ts |
| POST | `/email-marketing/campaigns/${id}/ab-test` | services/crmAdvancedService.ts |
| GET | `/email-marketing/campaigns/${id}/ab-test/results` | services/crmAdvancedService.ts |
| POST | `/email-marketing/campaigns/${id}/ab-test/pick-winner` | services/crmAdvancedService.ts |
| GET | `/email-marketing/drip-campaigns` | services/crmAdvancedService.ts |
| GET | `/email-marketing/drip-campaigns/${id}` | services/crmAdvancedService.ts |
| POST | `/email-marketing/drip-campaigns` | services/crmAdvancedService.ts |
| PUT | `/email-marketing/drip-campaigns/${id}` | services/crmAdvancedService.ts |
| DELETE | `/email-marketing/drip-campaigns/${id}` | services/crmAdvancedService.ts |
| POST | `/email-marketing/drip-campaigns/${id}/activate` | services/crmAdvancedService.ts |
| POST | `/email-marketing/drip-campaigns/${id}/pause` | services/crmAdvancedService.ts |
| POST | `/email-marketing/drip-campaigns/${id}/enroll` | services/crmAdvancedService.ts |
| POST | `/email-marketing/drip-campaigns/${id}/remove` | services/crmAdvancedService.ts |
| GET | `/email-marketing/subscribers` | services/crmAdvancedService.ts |
| GET | `/email-marketing/subscribers/${id}` | services/crmAdvancedService.ts |
| POST | `/email-marketing/subscribers` | services/crmAdvancedService.ts |
| POST | `/email-marketing/subscribers/import` | services/crmAdvancedService.ts |
| POST | `/email-marketing/subscribers/${id}/unsubscribe` | services/crmAdvancedService.ts |
| POST | `/email-marketing/subscribers/${id}/tags` | services/crmAdvancedService.ts |
| DELETE | `/email-marketing/subscribers/${id}/tags` | services/crmAdvancedService.ts |
| GET | `/email-marketing/segments` | services/crmAdvancedService.ts |
| GET | `/email-marketing/segments/${id}` | services/crmAdvancedService.ts |
| POST | `/email-marketing/segments` | services/crmAdvancedService.ts |
| PUT | `/email-marketing/segments/${id}` | services/crmAdvancedService.ts |
| DELETE | `/email-marketing/segments/${id}` | services/crmAdvancedService.ts |
| GET | `/email-marketing/segments/${id}/preview` | services/crmAdvancedService.ts |
| POST | `/email-marketing/segments/${id}/refresh` | services/crmAdvancedService.ts |
| POST | `/email-marketing/campaigns/${id}/duplicate` | services/emailMarketingService.ts |
| POST | `/email-marketing/campaigns/${id}/cancel` | services/emailMarketingService.ts |
| POST | `/email-marketing/campaigns/${id}/test` | services/emailMarketingService.ts |
| GET | `/email-marketing/templates/public` | services/emailMarketingService.ts |
| PUT | `/email-marketing/subscribers/${id}` | services/emailMarketingService.ts |
| DELETE | `/email-marketing/subscribers/${id}` | services/emailMarketingService.ts |
| POST | `/email-marketing/subscribers/export` | services/emailMarketingService.ts |

### permissions (46 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/permissions/policies` | services/permissionService.ts |
| GET | `/permissions/policies/${policyId}` | services/permissionService.ts |
| POST | `/permissions/policies` | services/permissionService.ts |
| PUT | `/permissions/policies/${policyId}` | services/permissionService.ts |
| DELETE | `/permissions/policies/${policyId}` | services/permissionService.ts |
| PATCH | `/permissions/policies/${policyId}/toggle` | services/permissionService.ts |
| GET | `/permissions/config` | services/permissionService.ts |
| PUT | `/permissions/config` | services/permissionService.ts |
| GET | `/permissions/relations/stats` | services/permissionService.ts |
| POST | `/permissions/relations` | services/permissionService.ts |
| DELETE | `/permissions/relations` | services/permissionService.ts |
| GET | `/permissions/relations/${namespace}/${object}` | services/permissionService.ts |
| GET | `/permissions/relations` | services/permissionService.ts |
| DELETE | `/permissions/relations/${relationId}` | services/permissionService.ts |
| POST | `/permissions/relations/bulk` | services/permissionService.ts |
| DELETE | `/permissions/relations/bulk` | services/permissionService.ts |
| POST | `/permissions/check` | services/permissionService.ts |
| POST | `/permissions/check-batch` | services/permissionService.ts |
| GET | `/permissions/my-permissions` | services/permissionService.ts |
| POST | `/permissions/relations/check` | services/permissionService.ts |
| GET | `/permissions/expand/${namespace}/${resourceId}/${relation}` | services/permissionService.ts |
| GET | `/permissions/user-resources/${userId}` | services/permissionService.ts |
| GET | `/permissions/decisions` | services/permissionService.ts |
| GET | `/permissions/decisions/${decisionId}` | services/permissionService.ts |
| GET | `/permissions/decisions/stats` | services/permissionService.ts |
| GET | `/permissions/decisions/denied` | services/permissionService.ts |
| GET | `/permissions/decisions/compliance-report` | services/permissionService.ts |
| GET | `/permissions/resources/${resourceType}/${resourceId}/access` | services/permissionService.ts |
| POST | `/permissions/resources/${resourceType}/${resourceId}/access` | services/permissionService.ts |
| DELETE | `/permissions/resources/${resourceType}/${resourceId}/access/${userId}` | services/permissionService.ts |
| GET | `/permissions/users/${userId}/resources` | services/permissionService.ts |
| GET | `/permissions/cache/stats` | services/permissionService.ts |
| POST | `/permissions/cache/clear` | services/permissionService.ts |
| GET | `/permissions/ui/sidebar` | services/permissionService.ts |
| GET | `/permissions/ui/sidebar/all` | services/permissionService.ts |
| PUT | `/permissions/ui/sidebar/${itemId}/visibility` | services/permissionService.ts |
| POST | `/permissions/ui/check-page` | services/permissionService.ts |
| GET | `/permissions/ui/pages/all` | services/permissionService.ts |
| PUT | `/permissions/ui/pages/${pageId}/access` | services/permissionService.ts |
| GET | `/permissions/ui/config` | services/permissionService.ts |
| PUT | `/permissions/ui/config` | services/permissionService.ts |
| GET | `/permissions/ui/matrix` | services/permissionService.ts |
| PUT | `/permissions/ui/roles/${role}/bulk` | services/permissionService.ts |
| POST | `/permissions/ui/overrides` | services/permissionService.ts |
| DELETE | `/permissions/ui/overrides/${userId}` | services/permissionService.ts |
| GET | `/permissions/ui/overrides` | services/uiAccessService.ts |

### crm (45 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| POST | `/crm/lead-sources` | features/crm/components/crm-setup-wizard.tsx |
| POST | `/crm/sales-stages` | features/crm/components/crm-setup-wizard.tsx |
| POST | `/crm/leads` | features/crm/components/crm-setup-wizard.tsx |
| GET | `/crm/appointments` | routes/_authenticated/dashboard.crm.appointments.tsx |
| POST | `/crm/appointments` | routes/_authenticated/dashboard.crm.appointments.tsx |
| GET | `/crm/reports/pipeline/overview` | services/crmReportsService.ts |
| GET | `/crm/reports/pipeline/velocity` | services/crmReportsService.ts |
| GET | `/crm/reports/pipeline/stage-duration` | services/crmReportsService.ts |
| GET | `/crm/reports/pipeline/deal-aging` | services/crmReportsService.ts |
| GET | `/crm/reports/pipeline/movement` | services/crmReportsService.ts |
| GET | `/crm/reports/leads/by-source` | services/crmReportsService.ts |
| GET | `/crm/reports/leads/conversion-funnel` | services/crmReportsService.ts |
| GET | `/crm/reports/leads/response-time` | services/crmReportsService.ts |
| GET | `/crm/reports/leads/velocity` | services/crmReportsService.ts |
| GET | `/crm/reports/leads/distribution` | services/crmReportsService.ts |
| GET | `/crm/reports/activity/summary` | services/crmReportsService.ts |
| GET | `/crm/reports/activity/calls` | services/crmReportsService.ts |
| GET | `/crm/reports/activity/emails` | services/crmReportsService.ts |
| GET | `/crm/reports/activity/meetings` | services/crmReportsService.ts |
| GET | `/crm/reports/activity/tasks` | services/crmReportsService.ts |
| GET | `/crm/reports/revenue/forecast` | services/crmReportsService.ts |
| GET | `/crm/reports/revenue/analysis` | services/crmReportsService.ts |
| GET | `/crm/reports/revenue/quota-attainment` | services/crmReportsService.ts |
| GET | `/crm/reports/revenue/win-rate` | services/crmReportsService.ts |
| GET | `/crm/reports/revenue/deal-size` | services/crmReportsService.ts |
| GET | `/crm/reports/performance/leaderboard` | services/crmReportsService.ts |
| GET | `/crm/reports/performance/team` | services/crmReportsService.ts |
| GET | `/crm/reports/performance/rep-scorecard/${userId}` | services/crmReportsService.ts |
| GET | `/crm/reports/performance/activity-metrics` | services/crmReportsService.ts |
| GET | `/crm/reports/customer/lifetime-value` | services/crmReportsService.ts |
| GET | `/crm/reports/customer/churn` | services/crmReportsService.ts |
| GET | `/crm/reports/customer/health-score` | services/crmReportsService.ts |
| GET | `/crm/reports/customer/engagement` | services/crmReportsService.ts |
| GET | `/crm/reports/win-loss/analysis` | services/crmReportsService.ts |
| GET | `/crm/reports/win-loss/lost-deals` | services/crmReportsService.ts |
| GET | `/crm/reports/win-loss/competitors` | services/crmReportsService.ts |
| GET | `/crm/reports/territory/performance` | services/crmReportsService.ts |
| GET | `/crm/reports/territory/regional-sales` | services/crmReportsService.ts |
| GET | `/crm/reports/territory/geographic-pipeline` | services/crmReportsService.ts |
| GET | `/crm/reports/transactions` | services/crmReportsService.ts |
| GET | `/crm/reports/transactions/summary` | services/crmReportsService.ts |
| GET | `/crm/reports/transactions/export` | services/crmReportsService.ts |
| GET | `/crm/reports/${reportType}/export` | services/crmReportsService.ts |
| POST | `/crm/reports/schedule` | services/crmReportsService.ts |
| GET | `/crm/reports/${reportType}/metadata` | services/crmReportsService.ts |

### saudi-banking (44 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/saudi-banking/lean/banks` | hooks/useSaudiBanking.ts |
| GET | `/saudi-banking/lean/customers` | hooks/useSaudiBanking.ts |
| GET | `/saudi-banking/lean/customers/${customerId}` | hooks/useSaudiBanking.ts |
| POST | `/saudi-banking/lean/customers` | hooks/useSaudiBanking.ts |
| GET | `/saudi-banking/lean/customers/${customerId}/token` | hooks/useSaudiBanking.ts |
| GET | `/saudi-banking/lean/customers/${customerId}/entities` | hooks/useSaudiBanking.ts |
| GET | `/saudi-banking/lean/accounts/${accountId}/transactions` | hooks/useSaudiBanking.ts |
| GET | `/saudi-banking/lean/accounts/${accountId}/balance` | hooks/useSaudiBanking.ts |
| DELETE | `/saudi-banking/lean/customers/${customerId}/entities/${entityId}` | hooks/useSaudiBanking.ts |
| GET | `/saudi-banking/wps/files` | hooks/useSaudiBanking.ts |
| GET | `/saudi-banking/wps/files/${fileId}` | hooks/useSaudiBanking.ts |
| GET | `/saudi-banking/wps/sarie-banks` | hooks/useSaudiBanking.ts |
| POST | `/saudi-banking/wps/validate` | hooks/useSaudiBanking.ts |
| POST | `/saudi-banking/wps/generate` | hooks/useSaudiBanking.ts |
| POST | `/saudi-banking/wps/download` | hooks/useSaudiBanking.ts |
| GET | `/saudi-banking/sadad/billers` | hooks/useSaudiBanking.ts |
| GET | `/saudi-banking/sadad/billers/search` | hooks/useSaudiBanking.ts |
| POST | `/saudi-banking/sadad/bills/inquiry` | hooks/useSaudiBanking.ts |
| POST | `/saudi-banking/sadad/bills/pay` | hooks/useSaudiBanking.ts |
| GET | `/saudi-banking/sadad/payments/history` | hooks/useSaudiBanking.ts |
| GET | `/saudi-banking/sadad/payments/${paymentId}` | hooks/useSaudiBanking.ts |
| POST | `/saudi-banking/mudad/payroll/calculate` | hooks/useSaudiBanking.ts |
| POST | `/saudi-banking/mudad/gosi/calculate` | hooks/useSaudiBanking.ts |
| POST | `/saudi-banking/mudad/compliance/nitaqat` | hooks/useSaudiBanking.ts |
| POST | `/saudi-banking/mudad/compliance/minimum-wage` | hooks/useSaudiBanking.ts |
| POST | `/saudi-banking/mudad/gosi/report` | hooks/useSaudiBanking.ts |
| GET | `/saudi-banking/mudad/payrolls` | hooks/useSaudiBanking.ts |
| GET | `/saudi-banking/mudad/compliance` | hooks/useSaudiBanking.ts |
| GET | `/saudi-banking/compliance/deadlines` | hooks/useSaudiBanking.ts |
| GET | `/saudi-banking/compliance/status` | hooks/useSaudiBanking.ts |
| GET | `/saudi-banking/compliance/deadlines/upcoming` | hooks/useSaudiBanking.ts |
| GET | `/saudi-banking/mudad/submissions` | hooks/useSaudiBanking.ts |
| GET | `/saudi-banking/mudad/submissions/${submissionId}/status` | hooks/useSaudiBanking.ts |
| POST | `/saudi-banking/lean/customers/:param/token` | hooks/useSaudiBanking.ts |
| POST | `/saudi-banking/mudad/submissions/:param/status` | hooks/useSaudiBanking.ts |
| GET | `/saudi-banking/lean/entities/${entityId}/accounts` | services/saudiBankingService.ts |
| GET | `/saudi-banking/lean/entities/${entityId}/identity` | services/saudiBankingService.ts |
| POST | `/saudi-banking/lean/payments` | services/saudiBankingService.ts |
| DELETE | `/saudi-banking/lean/entities/${entityId}` | services/saudiBankingService.ts |
| GET | `/saudi-banking/sadad/payments/${transactionId}/status` | services/saudiBankingService.ts |
| POST | `/saudi-banking/mudad/wps/generate` | services/saudiBankingService.ts |
| POST | `/saudi-banking/mudad/payroll/submit` | services/saudiBankingService.ts |
| POST | `/saudi-banking/lean/entities/:param` | services/saudiBankingService.ts |
| POST | `/saudi-banking/sadad/payments/:param/status` | services/saudiBankingService.ts |

### reminders (41 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/reminders` | hooks/useRemindersAndEvents.ts |
| GET | `/reminders/${id}` | services/remindersService.ts |
| POST | `/reminders` | services/remindersService.ts |
| PUT | `/reminders/${id}` | services/remindersService.ts |
| DELETE | `/reminders/${id}` | services/remindersService.ts |
| POST | `/reminders/${id}/complete` | services/remindersService.ts |
| POST | `/reminders/${id}/dismiss` | services/remindersService.ts |
| POST | `/reminders/${id}/reopen` | services/remindersService.ts |
| POST | `/reminders/${id}/snooze` | services/remindersService.ts |
| POST | `/reminders/${id}/cancel-snooze` | services/remindersService.ts |
| POST | `/reminders/${id}/delegate` | services/remindersService.ts |
| GET | `/reminders/upcoming` | services/remindersService.ts |
| GET | `/reminders/overdue` | services/remindersService.ts |
| GET | `/reminders/today` | services/remindersService.ts |
| GET | `/reminders/snoozed` | services/remindersService.ts |
| GET | `/reminders/snoozed-due` | services/remindersService.ts |
| GET | `/reminders/delegated` | services/remindersService.ts |
| GET | `/reminders/my-reminders` | services/remindersService.ts |
| GET | `/reminders/stats` | services/remindersService.ts |
| POST | `/reminders/${id}/recurring/skip` | services/remindersService.ts |
| POST | `/reminders/${id}/recurring/stop` | services/remindersService.ts |
| GET | `/reminders/${id}/recurring/history` | services/remindersService.ts |
| PATCH | `/reminders/${id}/notification` | services/remindersService.ts |
| POST | `/reminders/${id}/notification/test` | services/remindersService.ts |
| POST | `/reminders/${id}/acknowledge` | services/remindersService.ts |
| PUT | `/reminders/bulk` | services/remindersService.ts |
| DELETE | `/reminders/bulk` | services/remindersService.ts |
| POST | `/reminders/bulk/complete` | services/remindersService.ts |
| POST | `/reminders/bulk/snooze` | services/remindersService.ts |
| POST | `/reminders/bulk/dismiss` | services/remindersService.ts |
| POST | `/reminders/bulk/archive` | services/remindersService.ts |
| POST | `/reminders/bulk/unarchive` | services/remindersService.ts |
| POST | `/reminders/${id}/archive` | services/remindersService.ts |
| POST | `/reminders/${id}/unarchive` | services/remindersService.ts |
| GET | `/reminders/archived` | services/remindersService.ts |
| GET | `/reminders/ids` | services/remindersService.ts |
| POST | `/reminders/import` | services/remindersService.ts |
| GET | `/reminders/export` | services/remindersService.ts |
| GET | `/reminders/templates` | services/remindersService.ts |
| POST | `/reminders/templates/${templateId}/create` | services/remindersService.ts |
| POST | `/reminders/${id}/save-as-template` | services/remindersService.ts |

### bank-reconciliation (40 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/bank-reconciliation/feeds` | services/bankReconciliationService.ts |
| POST | `/bank-reconciliation/feeds` | services/bankReconciliationService.ts |
| PUT | `/bank-reconciliation/feeds/${id}` | services/bankReconciliationService.ts |
| DELETE | `/bank-reconciliation/feeds/${id}` | services/bankReconciliationService.ts |
| POST | `/bank-reconciliation/import/csv` | services/bankReconciliationService.ts |
| POST | `/bank-reconciliation/import/ofx` | services/bankReconciliationService.ts |
| GET | `/bank-reconciliation/import/template` | services/bankReconciliationService.ts |
| GET | `/bank-reconciliation/suggestions/${accountId}` | services/bankReconciliationService.ts |
| POST | `/bank-reconciliation/auto-match/${accountId}` | services/bankReconciliationService.ts |
| POST | `/bank-reconciliation/match/confirm/${id}` | services/bankReconciliationService.ts |
| POST | `/bank-reconciliation/match/reject/${id}` | services/bankReconciliationService.ts |
| POST | `/bank-reconciliation/match/split` | services/bankReconciliationService.ts |
| DELETE | `/bank-reconciliation/match/${id}` | services/bankReconciliationService.ts |
| POST | `/bank-reconciliation/rules` | services/bankReconciliationService.ts |
| GET | `/bank-reconciliation/rules` | services/bankReconciliationService.ts |
| PUT | `/bank-reconciliation/rules/${id}` | services/bankReconciliationService.ts |
| DELETE | `/bank-reconciliation/rules/${id}` | services/bankReconciliationService.ts |
| POST | `/bank-reconciliation` | services/bankReconciliationService.ts |
| GET | `/bank-reconciliation` | services/bankReconciliationService.ts |
| GET | `/bank-reconciliation/${id}` | services/bankReconciliationService.ts |
| POST | `/bank-reconciliation/${id}/clear` | services/bankReconciliationService.ts |
| POST | `/bank-reconciliation/${id}/unclear` | services/bankReconciliationService.ts |
| POST | `/bank-reconciliation/${id}/complete` | services/bankReconciliationService.ts |
| POST | `/bank-reconciliation/${id}/cancel` | services/bankReconciliationService.ts |
| GET | `/bank-reconciliation/status/${accountId}` | services/bankReconciliationService.ts |
| GET | `/bank-reconciliation/unmatched/${accountId}` | services/bankReconciliationService.ts |
| GET | `/bank-reconciliation/statistics/matches` | services/bankReconciliationService.ts |
| GET | `/bank-reconciliation/statistics/rules` | services/bankReconciliationService.ts |
| GET | `/bank-reconciliation/currency/rates` | services/bankReconciliationService.ts |
| POST | `/bank-reconciliation/currency/convert` | services/bankReconciliationService.ts |
| POST | `/bank-reconciliation/currency/rates` | services/bankReconciliationService.ts |
| GET | `/bank-reconciliation/currency/supported` | services/bankReconciliationService.ts |
| POST | `/bank-reconciliation/currency/update` | services/bankReconciliationService.ts |
| GET | `/bank-reconciliation/feeds/:param` | services/bankReconciliationService.ts |
| POST | `/bank-reconciliation/suggestions/:param` | services/bankReconciliationService.ts |
| POST | `/bank-reconciliation/match/:param` | services/bankReconciliationService.ts |
| POST | `/bank-reconciliation/rules/:param` | services/bankReconciliationService.ts |
| POST | `/bank-reconciliation/:param` | services/bankReconciliationService.ts |
| POST | `/bank-reconciliation/feeds/${id}/fetch` | services/financeAdvancedService.ts |
| GET | `/bank-reconciliation/feeds/${id}/transactions` | services/financeAdvancedService.ts |

### crm-reports (37 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/crm-reports/pipeline/overview` | hooks/use-crm-reports.ts |
| GET | `/crm-reports/pipeline/velocity` | hooks/use-crm-reports.ts |
| GET | `/crm-reports/pipeline/stage-duration` | hooks/use-crm-reports.ts |
| GET | `/crm-reports/pipeline/deal-aging` | hooks/use-crm-reports.ts |
| GET | `/crm-reports/pipeline/movement` | hooks/use-crm-reports.ts |
| GET | `/crm-reports/leads/by-source` | hooks/use-crm-reports.ts |
| GET | `/crm-reports/leads/conversion-funnel` | hooks/use-crm-reports.ts |
| GET | `/crm-reports/leads/response-time` | hooks/use-crm-reports.ts |
| GET | `/crm-reports/leads/velocity-rate` | hooks/use-crm-reports.ts |
| GET | `/crm-reports/leads/distribution` | hooks/use-crm-reports.ts |
| GET | `/crm-reports/activities/summary` | hooks/use-crm-reports.ts |
| GET | `/crm-reports/activities/calls` | hooks/use-crm-reports.ts |
| GET | `/crm-reports/activities/emails` | hooks/use-crm-reports.ts |
| GET | `/crm-reports/activities/meetings` | hooks/use-crm-reports.ts |
| GET | `/crm-reports/activities/tasks` | hooks/use-crm-reports.ts |
| GET | `/crm-reports/revenue/forecast` | hooks/use-crm-reports.ts |
| GET | `/crm-reports/revenue/analysis` | hooks/use-crm-reports.ts |
| GET | `/crm-reports/revenue/quota-attainment` | hooks/use-crm-reports.ts |
| GET | `/crm-reports/revenue/win-rate` | hooks/use-crm-reports.ts |
| GET | `/crm-reports/revenue/deal-size` | hooks/use-crm-reports.ts |
| GET | `/crm-reports/performance/leaderboard` | hooks/use-crm-reports.ts |
| GET | `/crm-reports/performance/team` | hooks/use-crm-reports.ts |
| GET | `/crm-reports/performance/rep-scorecard` | hooks/use-crm-reports.ts |
| GET | `/crm-reports/performance/activity-metrics` | hooks/use-crm-reports.ts |
| GET | `/crm-reports/customers/ltv` | hooks/use-crm-reports.ts |
| GET | `/crm-reports/customers/churn` | hooks/use-crm-reports.ts |
| GET | `/crm-reports/customers/health-score` | hooks/use-crm-reports.ts |
| GET | `/crm-reports/customers/engagement` | hooks/use-crm-reports.ts |
| GET | `/crm-reports/win-loss/analysis` | hooks/use-crm-reports.ts |
| GET | `/crm-reports/win-loss/lost-deals` | hooks/use-crm-reports.ts |
| GET | `/crm-reports/win-loss/competitors` | hooks/use-crm-reports.ts |
| GET | `/crm-reports/territory/performance` | hooks/use-crm-reports.ts |
| GET | `/crm-reports/territory/regional-sales` | hooks/use-crm-reports.ts |
| GET | `/crm-reports/territory/geographic-pipeline` | hooks/use-crm-reports.ts |
| GET | `/crm-reports/transactions` | hooks/use-crm-reports.ts |
| GET | `/crm-reports/transactions/summary` | hooks/use-crm-reports.ts |
| GET | `/crm-reports/transactions/export` | hooks/use-crm-reports.ts |

### invoices (35 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/invoices` | hooks/useFinance.ts |
| POST | `/invoices/${invoiceId}/post-to-gl` | services/accountingService.ts |
| POST | `/invoices/${invoiceId}/record-payment` | services/accountingService.ts |
| GET | `/invoices/${id}` | services/financeService.ts |
| POST | `/invoices` | services/financeService.ts |
| PATCH | `/invoices/${id}` | services/financeService.ts |
| POST | `/invoices/${id}/send` | services/financeService.ts |
| DELETE | `/invoices/${id}` | services/financeService.ts |
| GET | `/invoices/overdue` | services/financeService.ts |
| GET | `/invoices/stats` | services/financeService.ts |
| GET | `/invoices/billable-items` | services/financeService.ts |
| POST | `/invoices/${id}/void` | services/financeService.ts |
| POST | `/invoices/${id}/duplicate` | services/financeService.ts |
| POST | `/invoices/${id}/send-reminder` | services/financeService.ts |
| POST | `/invoices/${id}/convert-to-credit-note` | services/financeService.ts |
| POST | `/invoices/${id}/apply-retainer` | services/financeService.ts |
| POST | `/invoices/${id}/submit-for-approval` | services/financeService.ts |
| POST | `/invoices/${id}/approve` | services/financeService.ts |
| POST | `/invoices/${id}/reject` | services/financeService.ts |
| POST | `/invoices/${id}/zatca/submit` | services/financeService.ts |
| GET | `/invoices/${id}/zatca/status` | services/financeService.ts |
| GET | `/invoices/open/${clientId}` | services/financeService.ts |
| GET | `/invoices/${id}/xml` | services/financeService.ts |
| POST | `/invoices/${id}/payment` | services/financeService.ts |
| PATCH | `/invoices/confirm-payment` | services/financeService.ts |
| GET | `/invoices/${id}/pdf` | services/financeService.ts |
| POST | `/invoices/${invoiceId}/payments` | services/financeService.ts |
| GET | `/invoices/pending-approval` | services/financeService.ts |
| POST | `/invoices/${invoiceId}/request-changes` | services/financeService.ts |
| POST | `/invoices/${invoiceId}/escalate` | services/financeService.ts |
| POST | `/invoices/bulk-approve` | services/financeService.ts |
| GET | `/invoices/approval-config` | services/financeService.ts |
| PUT | `/invoices/approval-config` | services/financeService.ts |
| GET | `/invoices/pending-approvals-count` | services/financeService.ts |
| POST | `/invoices/confirm-payment` | services/invoiceService.ts |

### auth (34 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| POST | `/auth/refresh-activity` | hooks/use-session-warning.ts |
| POST | `/auth/anonymous/extend` | services/anonymousAuthService.ts |
| POST | `/auth/captcha/verify` | services/captchaService.ts |
| GET | `/auth/captcha/settings` | services/captchaService.ts |
| PUT | `/auth/captcha/settings` | services/captchaService.ts |
| POST | `/auth/captcha/check-required` | services/captchaService.ts |
| POST | `/auth/mfa/setup` | services/mfaService.ts |
| POST | `/auth/mfa/verify-setup` | services/mfaService.ts |
| POST | `/auth/mfa/verify` | services/mfaService.ts |
| POST | `/auth/mfa/disable` | services/mfaService.ts |
| POST | `/auth/mfa/sms/send` | services/mfaService.ts |
| POST | `/auth/mfa/email/send` | services/mfaService.ts |
| GET | `/auth/mfa/required` | services/mfaService.ts |
| POST | `/auth/sso/initiate` | services/oauthService.ts |
| POST | `/auth/sso/callback` | services/oauthService.ts |
| POST | `/auth/sso/link` | services/oauthService.ts |
| GET | `/auth/sso/providers` | services/oauthService.ts |
| DELETE | `/auth/sso/unlink/${provider}` | services/oauthService.ts |
| GET | `/auth/sso/unlink/:param` | services/oauthService.ts |
| POST | `/auth/onboarding-progress` | services/onboardingWizardService.ts |
| POST | `/auth/onboarding/company-info` | services/onboardingWizardService.ts |
| POST | `/auth/onboarding/company-logo` | services/onboardingWizardService.ts |
| POST | `/auth/onboarding/user-profile` | services/onboardingWizardService.ts |
| POST | `/auth/onboarding/user-avatar` | services/onboardingWizardService.ts |
| POST | `/auth/onboarding/modules` | services/onboardingWizardService.ts |
| POST | `/auth/onboarding/complete` | services/onboardingWizardService.ts |
| POST | `/auth/onboarding/skip` | services/onboardingWizardService.ts |
| GET | `/auth/reset-password/validate` | services/passwordService.ts |
| POST | `/auth/password/check-breach` | services/passwordService.ts |
| POST | `/auth/phone/verify` | services/phoneAuthService.ts |
| POST | `/auth/sessions/extend` | services/sessionService.ts |
| POST | `/auth/sessions/${sessionId}/report` | services/sessionService.ts |
| DELETE | `/auth/sessions/:param/report` | services/sessionService.ts |
| GET | `/auth/reauthenticate/methods` | services/stepUpAuthService.ts |

### documents (34 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/documents/${documentId}/versions` | services/documentVersionService.ts |
| GET | `/documents/${documentId}/versions/${versionId}` | services/documentVersionService.ts |
| POST | `/documents/${documentId}/versions` | services/documentVersionService.ts |
| GET | `/documents/${documentId}/versions/${versionId}/download` | services/documentVersionService.ts |
| GET | `/documents/${documentId}/versions/${versionId}/download-url` | services/documentVersionService.ts |
| GET | `/documents/${documentId}/versions/${versionId}/preview-url` | services/documentVersionService.ts |
| POST | `/documents/${documentId}/versions/${versionId}/restore` | services/documentVersionService.ts |
| DELETE | `/documents/${documentId}/versions/${versionId}` | services/documentVersionService.ts |
| POST | `/documents/${documentId}/versions/cleanup` | services/documentVersionService.ts |
| GET | `/documents/${documentId}/versions/compare?v1=${versionId1}&v2=${versionId2}` | services/documentVersionService.ts |
| GET | `/documents/${documentId}/versions/statistics` | services/documentVersionService.ts |
| GET | `/documents/${documentId}/versions/diff?v1=${versionId1}&v2=${versionId2}` | services/documentVersionService.ts |
| GET | `/documents/${documentId}/versions/${versionId}/content` | services/documentVersionService.ts |
| PATCH | `/documents/${documentId}/versions/${versionId}` | services/documentVersionService.ts |
| GET | `/documents/${id}` | services/documentsService.ts |
| POST | `/documents/upload` | services/documentsService.ts |
| POST | `/documents/confirm` | services/documentsService.ts |
| PATCH | `/documents/${id}` | services/documentsService.ts |
| DELETE | `/documents/${id}` | services/documentsService.ts |
| GET | `/documents/case/${caseId}` | services/documentsService.ts |
| GET | `/documents/client/${clientId}` | services/documentsService.ts |
| GET | `/documents/stats` | services/documentsService.ts |
| GET | `/documents/${id}/download` | services/documentsService.ts |
| POST | `/documents/${id}/share` | services/documentsService.ts |
| POST | `/documents/${id}/revoke-share` | services/documentsService.ts |
| GET | `/documents/search?q=${encodeURIComponent(query)}` | services/documentsService.ts |
| GET | `/documents/recent?limit=${limit}` | services/documentsService.ts |
| POST | `/documents/bulk-delete` | services/documentsService.ts |
| POST | `/documents/${documentId}/move` | services/documentsService.ts |
| GET | `/documents/${id}/preview-url` | services/documentsService.ts |
| GET | `/documents/${id}/download-url?disposition=${disposition}` | services/documentsService.ts |
| POST | `/documents/${id}/encrypt` | services/documentsService.ts |
| POST | `/documents/${id}/decrypt` | services/documentsService.ts |
| POST | `/documents/:param` | services/documentsService.ts |

### time-tracking (31 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| POST | `/time-tracking/entries/${id}/submit` | services/financeService.approval-methods.ts |
| POST | `/time-tracking/entries/bulk-submit` | services/financeService.approval-methods.ts |
| POST | `/time-tracking/entries/bulk-reject` | services/financeService.approval-methods.ts |
| GET | `/time-tracking/entries/pending` | services/financeService.approval-methods.ts |
| POST | `/time-tracking/entries/${id}/request-changes` | services/financeService.approval-methods.ts |
| POST | `/time-tracking/timer/start` | services/financeService.ts |
| POST | `/time-tracking/timer/pause` | services/financeService.ts |
| POST | `/time-tracking/timer/resume` | services/financeService.ts |
| POST | `/time-tracking/timer/stop` | services/financeService.ts |
| GET | `/time-tracking/timer/status` | services/financeService.ts |
| POST | `/time-tracking/entries` | services/financeService.ts |
| GET | `/time-tracking/entries` | services/financeService.ts |
| GET | `/time-tracking/entries/${id}` | services/financeService.ts |
| GET | `/time-tracking/stats` | services/financeService.ts |
| PUT | `/time-tracking/entries/${id}` | services/financeService.ts |
| DELETE | `/time-tracking/entries/${id}` | services/financeService.ts |
| GET | `/time-tracking/unbilled` | services/financeService.ts |
| GET | `/time-tracking/activity-codes` | services/financeService.ts |
| DELETE | `/time-tracking/entries/bulk` | services/financeService.ts |
| POST | `/time-tracking/entries/bulk-approve` | services/financeService.ts |
| POST | `/time-tracking/entries/${id}/write-off` | services/financeService.ts |
| POST | `/time-tracking/entries/${id}/write-down` | services/financeService.ts |
| POST | `/time-tracking/entries/${id}/approve` | services/financeService.ts |
| POST | `/time-tracking/entries/${id}/reject` | services/financeService.ts |
| POST | `/time-tracking/entries/${id}/lock` | services/financeService.ts |
| POST | `/time-tracking/entries/${id}/unlock` | services/financeService.ts |
| POST | `/time-tracking/entries/bulk-lock` | services/financeService.ts |
| GET | `/time-tracking/entries/${id}/lock-status` | services/financeService.ts |
| POST | `/time-tracking/entries/lock-by-date-range` | services/financeService.ts |
| GET | `/time-tracking/weekly` | services/financeService.ts |
| GET | `/time-tracking/entries/pending-approval?${params.toString()}` | services/timeTrackingService.ts |

### api (29 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/api/inter-company/transactions` | services/interCompanyService.ts |
| GET | `/api/inter-company/transactions/${id}` | services/interCompanyService.ts |
| POST | `/api/inter-company/transactions` | services/interCompanyService.ts |
| PUT | `/api/inter-company/transactions/${id}` | services/interCompanyService.ts |
| DELETE | `/api/inter-company/transactions/${id}` | services/interCompanyService.ts |
| POST | `/api/inter-company/transactions/${id}/post` | services/interCompanyService.ts |
| POST | `/api/inter-company/transactions/${id}/cancel` | services/interCompanyService.ts |
| GET | `/api/inter-company/balances` | services/interCompanyService.ts |
| GET | `/api/inter-company/balances/between` | services/interCompanyService.ts |
| GET | `/api/inter-company/transactions/between` | services/interCompanyService.ts |
| GET | `/api/inter-company/reconciliations` | services/interCompanyService.ts |
| GET | `/api/inter-company/reconciliations/${id}` | services/interCompanyService.ts |
| POST | `/api/inter-company/reconciliations` | services/interCompanyService.ts |
| POST | `/api/inter-company/reconciliations/${reconciliationId}/auto-match` | services/interCompanyService.ts |
| POST | `/api/inter-company/reconciliations/${reconciliationId}/manual-match` | services/interCompanyService.ts |
| POST | `/api/inter-company/reconciliations/${reconciliationId}/unmatch` | services/interCompanyService.ts |
| POST | `/api/inter-company/reconciliations/${reconciliationId}/adjustments` | services/interCompanyService.ts |
| POST | `/api/inter-company/reconciliations/${reconciliationId}/complete` | services/interCompanyService.ts |
| POST | `/api/inter-company/reconciliations/${reconciliationId}/approve` | services/interCompanyService.ts |
| GET | `/api/inter-company/firms` | services/interCompanyService.ts |
| GET | `/api/inter-company/exchange-rate` | services/interCompanyService.ts |
| GET | `/api/inter-company/reports/summary` | services/interCompanyService.ts |
| POST | `/api/inter-company/reports/export` | services/interCompanyService.ts |
| GET | `/api/settings/sales` | services/salesSettingsService.ts |
| GET | `/api/settings/sales/reset/${section}` | services/salesSettingsService.ts |
| GET | `/api/settings/sales/history?limit=${limit}` | services/salesSettingsService.ts |
| GET | `/api/settings/sales/export` | services/salesSettingsService.ts |
| GET | `/api/settings/sales/import` | services/salesSettingsService.ts |
| GET | `/api/settings/sales/validate` | services/salesSettingsService.ts |

### succession-plans (28 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/succession-plans/${id}` | services/successionPlanningService.ts |
| POST | `/succession-plans` | services/successionPlanningService.ts |
| PATCH | `/succession-plans/${id}` | services/successionPlanningService.ts |
| DELETE | `/succession-plans/${id}` | services/successionPlanningService.ts |
| POST | `/succession-plans/bulk-delete` | services/successionPlanningService.ts |
| GET | `/succession-plans/by-position/${positionId}` | services/successionPlanningService.ts |
| GET | `/succession-plans/by-incumbent/${incumbentId}` | services/successionPlanningService.ts |
| GET | `/succession-plans/review-due` | services/successionPlanningService.ts |
| GET | `/succession-plans/high-risk` | services/successionPlanningService.ts |
| GET | `/succession-plans/critical-without-successors` | services/successionPlanningService.ts |
| POST | `/succession-plans/${planId}/successors` | services/successionPlanningService.ts |
| PATCH | `/succession-plans/${planId}/successors/${successorId}` | services/successionPlanningService.ts |
| DELETE | `/succession-plans/${planId}/successors/${successorId}` | services/successionPlanningService.ts |
| POST | `/succession-plans/${id}/submit-for-approval` | services/successionPlanningService.ts |
| POST | `/succession-plans/${id}/approve` | services/successionPlanningService.ts |
| POST | `/succession-plans/${id}/reject` | services/successionPlanningService.ts |
| POST | `/succession-plans/${id}/activate` | services/successionPlanningService.ts |
| POST | `/succession-plans/${id}/archive` | services/successionPlanningService.ts |
| PATCH | `/succession-plans/${planId}/successors/${successorId}/readiness` | services/successionPlanningService.ts |
| PATCH | `/succession-plans/${planId}/successors/${successorId}/development` | services/successionPlanningService.ts |
| POST | `/succession-plans/${planId}/reviews` | services/successionPlanningService.ts |
| POST | `/succession-plans/${planId}/actions` | services/successionPlanningService.ts |
| PATCH | `/succession-plans/${planId}/actions/${actionId}` | services/successionPlanningService.ts |
| POST | `/succession-plans/${planId}/documents` | services/successionPlanningService.ts |
| POST | `/succession-plans/:param` | services/successionPlanningService.ts |
| POST | `/succession-plans/by-position/:param` | services/successionPlanningService.ts |
| GET | `/succession-plans/:param/successors` | services/successionPlanningService.ts |
| GET | `/succession-plans/stats?officeId=:param` | services/successionPlanningService.ts |

### clients (26 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/clients` | services/clientService.ts |
| GET | `/clients/${clientId}` | services/clientService.ts |
| POST | `/clients` | services/clientService.ts |
| PUT | `/clients/${clientId}` | services/clientService.ts |
| DELETE | `/clients/${clientId}` | services/clientService.ts |
| GET | `/clients/${clientId}/cases` | services/clientService.ts |
| GET | `/clients/${clientId}/invoices` | services/clientService.ts |
| GET | `/clients/${clientId}/quotes` | services/clientService.ts |
| GET | `/clients/${clientId}/activities` | services/clientService.ts |
| GET | `/clients/${clientId}/payments` | services/clientService.ts |
| POST | `/clients/${clientId}/credit-status` | services/clientService.ts |
| GET | `/clients/search` | services/clientsService.ts |
| GET | `/clients/stats` | services/clientsService.ts |
| GET | `/clients/top-revenue` | services/clientsService.ts |
| DELETE | `/clients/bulk` | services/clientsService.ts |
| GET | `/clients/${id}/billing-info` | services/clientsService.ts |
| POST | `/clients/${id}/verify/wathq` | services/clientsService.ts |
| GET | `/clients/${id}/wathq/${dataType}` | services/clientsService.ts |
| POST | `/clients/${id}/verify/absher` | services/clientsService.ts |
| POST | `/clients/${id}/verify/address` | services/clientsService.ts |
| POST | `/clients/${id}/attachments` | services/clientsService.ts |
| DELETE | `/clients/${id}/attachments/${attachmentId}` | services/clientsService.ts |
| POST | `/clients/${id}/conflict-check` | services/clientsService.ts |
| PATCH | `/clients/${id}/status` | services/clientsService.ts |
| PATCH | `/clients/${id}/flags` | services/clientsService.ts |
| GET | `/clients/regions` | services/clientsService.ts |

### corporate-cards (26 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/corporate-cards` | services/corporateCardService.ts |
| GET | `/corporate-cards/${id}` | services/corporateCardService.ts |
| POST | `/corporate-cards` | services/corporateCardService.ts |
| PATCH | `/corporate-cards/${id}` | services/corporateCardService.ts |
| DELETE | `/corporate-cards/${id}` | services/corporateCardService.ts |
| POST | `/corporate-cards/${id}/block` | services/corporateCardService.ts |
| POST | `/corporate-cards/${id}/unblock` | services/corporateCardService.ts |
| GET | `/corporate-cards/transactions` | services/corporateCardService.ts |
| GET | `/corporate-cards/transactions/${id}` | services/corporateCardService.ts |
| POST | `/corporate-cards/transactions` | services/corporateCardService.ts |
| PATCH | `/corporate-cards/transactions/${id}` | services/corporateCardService.ts |
| DELETE | `/corporate-cards/transactions/${id}` | services/corporateCardService.ts |
| POST | `/corporate-cards/transactions/${data.transactionId}/reconcile` | services/corporateCardService.ts |
| POST | `/corporate-cards/transactions/bulk-reconcile` | services/corporateCardService.ts |
| POST | `/corporate-cards/transactions/${transactionId}/match` | services/corporateCardService.ts |
| GET | `/corporate-cards/transactions/${transactionId}/potential-matches` | services/corporateCardService.ts |
| POST | `/corporate-cards/transactions/${transactionId}/dispute` | services/corporateCardService.ts |
| POST | `/corporate-cards/transactions/${transactionId}/resolve-dispute` | services/corporateCardService.ts |
| POST | `/corporate-cards/transactions/import` | services/corporateCardService.ts |
| GET | `/corporate-cards/transactions/csv-template` | services/corporateCardService.ts |
| GET | `/corporate-cards/statistics` | services/corporateCardService.ts |
| GET | `/corporate-cards/reports/reconciliation` | services/corporateCardService.ts |
| GET | `/corporate-cards/reports/reconciliation/export` | services/corporateCardService.ts |
| GET | `/corporate-cards/analytics/spending-by-category` | services/corporateCardService.ts |
| GET | `/corporate-cards/analytics/spending-by-card` | services/corporateCardService.ts |
| GET | `/corporate-cards/analytics/monthly-trend` | services/corporateCardService.ts |

### payments (23 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/payments` | hooks/useFinance.ts |
| POST | `/payments` | services/financeService.ts |
| GET | `/payments/${id}` | services/financeService.ts |
| POST | `/payments/${id}/complete` | services/financeService.ts |
| GET | `/payments/summary` | services/financeService.ts |
| GET | `/payments/new` | services/financeService.ts |
| GET | `/payments/stats` | services/financeService.ts |
| GET | `/payments/unreconciled` | services/financeService.ts |
| GET | `/payments/pending-checks` | services/financeService.ts |
| PUT | `/payments/${id}` | services/financeService.ts |
| DELETE | `/payments/${id}` | services/financeService.ts |
| DELETE | `/payments/bulk` | services/financeService.ts |
| POST | `/payments/${id}/fail` | services/financeService.ts |
| POST | `/payments/${id}/refund` | services/financeService.ts |
| POST | `/payments/${id}/reconcile` | services/financeService.ts |
| PUT | `/payments/${id}/apply` | services/financeService.ts |
| DELETE | `/payments/${id}/unapply/${invoiceId}` | services/financeService.ts |
| PUT | `/payments/${id}/check-status` | services/financeService.ts |
| POST | `/payments/${id}/send-receipt` | services/financeService.ts |
| POST | `/payments/${id}/generate-receipt` | services/financeService.ts |
| GET | `/payments/${id}/receipt/download` | services/financeService.ts |
| GET | `/payments/${id}/receipt` | services/financeService.ts |
| POST | `/payments/${id}/receipt/send` | services/financeService.ts |

### contacts (22 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/contacts` | services/contactService.ts |
| GET | `/contacts/${contactId}` | services/contactService.ts |
| POST | `/contacts` | services/contactService.ts |
| PUT | `/contacts/${contactId}` | services/contactService.ts |
| DELETE | `/contacts/${contactId}` | services/contactService.ts |
| GET | `/contacts/${contactId}/cases` | services/contactService.ts |
| GET | `/contacts/${contactId}/activities` | services/contactService.ts |
| POST | `/contacts/${contactId}/conflict-check` | services/contactService.ts |
| POST | `/contacts/${contactId}/conflict-status` | services/contactService.ts |
| POST | `/contacts/${contactId}/link-case` | services/contactService.ts |
| DELETE | `/contacts/${contactId}/unlink-case/${caseId}` | services/contactService.ts |
| POST | `/contacts/${primaryId}/merge` | services/contactService.ts |
| GET | `/contacts/${contactId}/stakeholder/${leadId}` | services/contactService.ts |
| PATCH | `/contacts/${id}` | services/contactsService.ts |
| DELETE | `/contacts/bulk` | services/contactsService.ts |
| GET | `/contacts/search?q=${encodeURIComponent(query)}` | services/contactsService.ts |
| GET | `/contacts/case/${caseId}` | services/contactsService.ts |
| GET | `/contacts/client/${clientId}` | services/contactsService.ts |
| POST | `/contacts/${contactId}/link-client` | services/contactsService.ts |
| DELETE | `/contacts/${contactId}/unlink-client/${clientId}` | services/contactsService.ts |
| POST | `/contacts/:param` | services/contactsService.ts |
| DELETE | `/contacts/search?q=:param` | services/contactsService.ts |

### leave-encashments (22 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/leave-encashments/${id}` | services/leaveEncashmentService.ts |
| POST | `/leave-encashments` | services/leaveEncashmentService.ts |
| PATCH | `/leave-encashments/${id}` | services/leaveEncashmentService.ts |
| DELETE | `/leave-encashments/${id}` | services/leaveEncashmentService.ts |
| POST | `/leave-encashments/${id}/submit` | services/leaveEncashmentService.ts |
| POST | `/leave-encashments/calculate` | services/leaveEncashmentService.ts |
| GET | `/leave-encashments/eligibility/${employeeId}` | services/leaveEncashmentService.ts |
| POST | `/leave-encashments/${id}/approve` | services/leaveEncashmentService.ts |
| POST | `/leave-encashments/${id}/reject` | services/leaveEncashmentService.ts |
| POST | `/leave-encashments/${id}/mark-paid` | services/leaveEncashmentService.ts |
| POST | `/leave-encashments/${id}/process` | services/leaveEncashmentService.ts |
| POST | `/leave-encashments/${id}/cancel` | services/leaveEncashmentService.ts |
| GET | `/leave-encashments/stats?${params.toString()}` | services/leaveEncashmentService.ts |
| GET | `/leave-encashments/pending-approvals` | services/leaveEncashmentService.ts |
| GET | `/leave-encashments/employee/${employeeId}` | services/leaveEncashmentService.ts |
| POST | `/leave-encashments/bulk-approve` | services/leaveEncashmentService.ts |
| POST | `/leave-encashments/bulk-reject` | services/leaveEncashmentService.ts |
| GET | `/leave-encashments/export?${params.toString()}` | services/leaveEncashmentService.ts |
| GET | `/leave-encashments/policy` | services/leaveEncashmentService.ts |
| POST | `/leave-encashments/:param` | services/leaveEncashmentService.ts |
| POST | `/leave-encashments/eligibility/:param` | services/leaveEncashmentService.ts |
| POST | `/leave-encashments/export?:param` | services/leaveEncashmentService.ts |

### matter-budgets (22 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/matter-budgets` | services/matterBudgetService.ts |
| GET | `/matter-budgets/${id}` | services/matterBudgetService.ts |
| GET | `/matter-budgets/case/${caseId}` | services/matterBudgetService.ts |
| POST | `/matter-budgets` | services/matterBudgetService.ts |
| PATCH | `/matter-budgets/${id}` | services/matterBudgetService.ts |
| DELETE | `/matter-budgets/${id}` | services/matterBudgetService.ts |
| GET | `/matter-budgets/${id}/analysis` | services/matterBudgetService.ts |
| GET | `/matter-budgets/alerts` | services/matterBudgetService.ts |
| POST | `/matter-budgets/${budgetId}/phases` | services/matterBudgetService.ts |
| PATCH | `/matter-budgets/${budgetId}/phases/${phaseId}` | services/matterBudgetService.ts |
| DELETE | `/matter-budgets/${budgetId}/phases/${phaseId}` | services/matterBudgetService.ts |
| GET | `/matter-budgets/${budgetId}/entries` | services/matterBudgetService.ts |
| POST | `/matter-budgets/${budgetId}/entries` | services/matterBudgetService.ts |
| PATCH | `/matter-budgets/${budgetId}/entries/${entryId}` | services/matterBudgetService.ts |
| DELETE | `/matter-budgets/${budgetId}/entries/${entryId}` | services/matterBudgetService.ts |
| GET | `/matter-budgets/templates` | services/matterBudgetService.ts |
| POST | `/matter-budgets/templates` | services/matterBudgetService.ts |
| PATCH | `/matter-budgets/templates/${id}` | services/matterBudgetService.ts |
| DELETE | `/matter-budgets/templates/${id}` | services/matterBudgetService.ts |
| POST | `/matter-budgets/:param` | services/matterBudgetService.ts |
| GET | `/matter-budgets/:param/phases` | services/matterBudgetService.ts |
| GET | `/matter-budgets/templates/:param` | services/matterBudgetService.ts |

### products (22 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/products/enhanced` | services/productEnhancedService.ts |
| GET | `/products/enhanced/${productId}` | services/productEnhancedService.ts |
| POST | `/products/enhanced` | services/productEnhancedService.ts |
| PUT | `/products/enhanced/${productId}` | services/productEnhancedService.ts |
| DELETE | `/products/enhanced/${productId}` | services/productEnhancedService.ts |
| PATCH | `/products/enhanced/${productId}/cost-price` | services/productEnhancedService.ts |
| GET | `/products/enhanced/${productId}/margin` | services/productEnhancedService.ts |
| POST | `/products/enhanced/bulk-update-prices` | services/productEnhancedService.ts |
| GET | `/products/enhanced/${productId}/variants` | services/productEnhancedService.ts |
| GET | `/products/enhanced/${productId}/variants/${variantId}` | services/productEnhancedService.ts |
| POST | `/products/enhanced/${productId}/variants` | services/productEnhancedService.ts |
| PUT | `/products/enhanced/${productId}/variants/${variantId}` | services/productEnhancedService.ts |
| DELETE | `/products/enhanced/${productId}/variants/${variantId}` | services/productEnhancedService.ts |
| POST | `/products/enhanced/${productId}/variants/generate` | services/productEnhancedService.ts |
| GET | `/products/enhanced/${productId}/barcodes` | services/productEnhancedService.ts |
| POST | `/products/enhanced/${productId}/barcodes` | services/productEnhancedService.ts |
| DELETE | `/products/enhanced/${productId}/barcodes/${barcodeId}` | services/productEnhancedService.ts |
| GET | `/products/enhanced/lookup/barcode` | services/productEnhancedService.ts |
| POST | `/products/${productId}/duplicate` | services/productService.ts |
| POST | `/products/${productId}/toggle-active` | services/productService.ts |
| GET | `/products/categories` | services/productService.ts |
| GET | `/products/${productId}/stats` | services/productService.ts |

### subscriptions (22 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/subscriptions` | services/subscriptionService.ts |
| GET | `/subscriptions/${id}` | services/subscriptionService.ts |
| POST | `/subscriptions` | services/subscriptionService.ts |
| PATCH | `/subscriptions/${id}` | services/subscriptionService.ts |
| DELETE | `/subscriptions/${id}` | services/subscriptionService.ts |
| POST | `/subscriptions/${id}/activate` | services/subscriptionService.ts |
| POST | `/subscriptions/${id}/pause` | services/subscriptionService.ts |
| POST | `/subscriptions/${id}/resume` | services/subscriptionService.ts |
| POST | `/subscriptions/${id}/cancel` | services/subscriptionService.ts |
| POST | `/subscriptions/${id}/renew` | services/subscriptionService.ts |
| POST | `/subscriptions/${id}/change-plan` | services/subscriptionService.ts |
| POST | `/subscriptions/${id}/consume-hours` | services/subscriptionService.ts |
| GET | `/subscriptions/${id}/hours-usage` | services/subscriptionService.ts |
| POST | `/subscriptions/${id}/reset-hours` | services/subscriptionService.ts |
| GET | `/subscriptions/${id}/invoices` | services/subscriptionService.ts |
| POST | `/subscriptions/${id}/generate-invoice` | services/subscriptionService.ts |
| GET | `/subscriptions/${id}/upcoming-invoice` | services/subscriptionService.ts |
| GET | `/subscriptions/${id}/renewal-preview` | services/subscriptionService.ts |
| GET | `/subscriptions/stats` | services/subscriptionService.ts |
| GET | `/subscriptions/upcoming-renewals` | services/subscriptionService.ts |
| GET | `/subscriptions/past-due` | services/subscriptionService.ts |
| POST | `/subscriptions/:param` | services/subscriptionService.ts |

### bills (21 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/bills` | services/accountingService.ts |
| GET | `/bills/${id}` | services/accountingService.ts |
| POST | `/bills` | services/accountingService.ts |
| PUT | `/bills/${id}` | services/accountingService.ts |
| POST | `/bills/${id}/approve` | services/accountingService.ts |
| POST | `/bills/${id}/pay` | services/accountingService.ts |
| POST | `/bills/${id}/post-to-gl` | services/accountingService.ts |
| DELETE | `/bills/${id}` | services/accountingService.ts |
| POST | `/bills/${id}/receive` | services/accountingService.ts |
| POST | `/bills/${id}/cancel` | services/accountingService.ts |
| POST | `/bills/${id}/duplicate` | services/accountingService.ts |
| POST | `/bills/${id}/attachments` | services/accountingService.ts |
| DELETE | `/bills/${id}/attachments/${attachmentId}` | services/accountingService.ts |
| GET | `/bills/overdue` | services/accountingService.ts |
| GET | `/bills/summary` | services/accountingService.ts |
| GET | `/bills/recurring` | services/accountingService.ts |
| POST | `/bills/${id}/stop-recurring` | services/accountingService.ts |
| POST | `/bills/${id}/generate-next` | services/accountingService.ts |
| GET | `/bills/reports/aging` | services/accountingService.ts |
| GET | `/bills/export` | services/accountingService.ts |
| GET | `/bills/${billId}/debit-notes` | services/accountingService.ts |

### compensatory-leave-requests (21 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/compensatory-leave-requests/${id}` | services/compensatoryLeaveService.ts |
| POST | `/compensatory-leave-requests` | services/compensatoryLeaveService.ts |
| PATCH | `/compensatory-leave-requests/${id}` | services/compensatoryLeaveService.ts |
| DELETE | `/compensatory-leave-requests/${id}` | services/compensatoryLeaveService.ts |
| POST | `/compensatory-leave-requests/${id}/submit` | services/compensatoryLeaveService.ts |
| POST | `/compensatory-leave-requests/calculate-days` | services/compensatoryLeaveService.ts |
| POST | `/compensatory-leave-requests/${id}/approve` | services/compensatoryLeaveService.ts |
| POST | `/compensatory-leave-requests/${id}/reject` | services/compensatoryLeaveService.ts |
| POST | `/compensatory-leave-requests/${id}/cancel` | services/compensatoryLeaveService.ts |
| GET | `/compensatory-leave-requests/balance/${employeeId}` | services/compensatoryLeaveService.ts |
| POST | `/compensatory-leave-requests/expire-unused?${params.toString()}` | services/compensatoryLeaveService.ts |
| GET | `/compensatory-leave-requests/holiday-work-records?${params.toString()}` | services/compensatoryLeaveService.ts |
| GET | `/compensatory-leave-requests/stats?${params.toString()}` | services/compensatoryLeaveService.ts |
| GET | `/compensatory-leave-requests/pending-approvals` | services/compensatoryLeaveService.ts |
| GET | `/compensatory-leave-requests/expiring?${params.toString()}` | services/compensatoryLeaveService.ts |
| POST | `/compensatory-leave-requests/${requestId}/documents` | services/compensatoryLeaveService.ts |
| GET | `/compensatory-leave-requests/export?${params.toString()}` | services/compensatoryLeaveService.ts |
| POST | `/compensatory-leave-requests/bulk-approve` | services/compensatoryLeaveService.ts |
| POST | `/compensatory-leave-requests/bulk-reject` | services/compensatoryLeaveService.ts |
| GET | `/compensatory-leave-requests/policy` | services/compensatoryLeaveService.ts |
| POST | `/compensatory-leave-requests/:param` | services/compensatoryLeaveService.ts |

### lead-scoring (21 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/lead-scoring/config` | services/crmAdvancedService.ts |
| PUT | `/lead-scoring/config` | services/crmAdvancedService.ts |
| POST | `/lead-scoring/calculate/${leadId}` | services/crmAdvancedService.ts |
| POST | `/lead-scoring/calculate-all` | services/crmAdvancedService.ts |
| POST | `/lead-scoring/calculate-batch` | services/crmAdvancedService.ts |
| GET | `/lead-scoring/scores` | services/crmAdvancedService.ts |
| GET | `/lead-scoring/leaderboard` | services/crmAdvancedService.ts |
| GET | `/lead-scoring/distribution` | services/crmAdvancedService.ts |
| GET | `/lead-scoring/top-leads` | services/crmAdvancedService.ts |
| GET | `/lead-scoring/by-grade/${grade}` | services/crmAdvancedService.ts |
| GET | `/lead-scoring/insights/${leadId}` | services/crmAdvancedService.ts |
| GET | `/lead-scoring/trends` | services/crmAdvancedService.ts |
| GET | `/lead-scoring/conversion-analysis` | services/crmAdvancedService.ts |
| POST | `/lead-scoring/track/email-open` | services/crmAdvancedService.ts |
| POST | `/lead-scoring/track/email-click` | services/crmAdvancedService.ts |
| POST | `/lead-scoring/track/document-view` | services/crmAdvancedService.ts |
| POST | `/lead-scoring/track/website-visit` | services/crmAdvancedService.ts |
| POST | `/lead-scoring/track/form-submit` | services/crmAdvancedService.ts |
| POST | `/lead-scoring/track/meeting` | services/crmAdvancedService.ts |
| POST | `/lead-scoring/track/call` | services/crmAdvancedService.ts |
| POST | `/lead-scoring/process-decay` | services/crmAdvancedService.ts |

### transactions (21 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/transactions` | services/financeService.ts |
| GET | `/transactions/${id}` | services/financeService.ts |
| POST | `/transactions` | services/financeService.ts |
| GET | `/transactions/balance` | services/financeService.ts |
| GET | `/transactions/summary` | services/financeService.ts |
| PATCH | `/transactions/${id}` | services/financeService.ts |
| DELETE | `/transactions/${id}` | services/financeService.ts |
| PUT | `/transactions/${id}` | services/transactionService.ts |
| GET | `/transactions/by-category` | services/transactionService.ts |
| POST | `/transactions/${id}/cancel` | services/transactionService.ts |
| DELETE | `/transactions/bulk` | services/transactionService.ts |
| POST | `/transactions/${id}/reconcile` | services/transactionService.ts |
| POST | `/transactions/${id}/unreconcile` | services/transactionService.ts |
| POST | `/transactions/${id}/attachments` | services/transactionService.ts |
| DELETE | `/transactions/${id}/attachments/${attachmentId}` | services/transactionService.ts |
| GET | `/transactions/categories` | services/transactionService.ts |
| GET | `/transactions/export` | services/transactionService.ts |
| GET | `/transactions/pending` | services/transactionService.ts |
| GET | `/transactions/unreconciled` | services/transactionService.ts |
| GET | `/transactions/search` | services/transactionService.ts |
| GET | `/transactions/stats` | services/transactionService.ts |

### hr-analytics (21 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/hr-analytics/dashboard` | services/hrAnalyticsService.ts |
| GET | `/hr-analytics/demographics` | services/hrAnalyticsService.ts |
| GET | `/hr-analytics/turnover` | services/hrAnalyticsService.ts |
| GET | `/hr-analytics/absenteeism` | services/hrAnalyticsService.ts |
| GET | `/hr-analytics/attendance` | services/hrAnalyticsService.ts |
| GET | `/hr-analytics/performance` | services/hrAnalyticsService.ts |
| GET | `/hr-analytics/recruitment` | services/hrAnalyticsService.ts |
| GET | `/hr-analytics/compensation` | services/hrAnalyticsService.ts |
| GET | `/hr-analytics/training` | services/hrAnalyticsService.ts |
| GET | `/hr-analytics/leave` | services/hrAnalyticsService.ts |
| GET | `/hr-analytics/saudization` | services/hrAnalyticsService.ts |
| POST | `/hr-analytics/snapshot` | services/hrAnalyticsService.ts |
| GET | `/hr-analytics/trends` | services/hrAnalyticsService.ts |
| GET | `/hr-analytics/export` | services/hrAnalyticsService.ts |
| GET | `/hr-analytics/predictions/attrition` | services/hrAnalyticsService.ts |
| GET | `/hr-analytics/predictions/attrition/${employeeId}` | services/hrAnalyticsService.ts |
| GET | `/hr-analytics/predictions/workforce` | services/hrAnalyticsService.ts |
| GET | `/hr-analytics/predictions/high-potential` | services/hrAnalyticsService.ts |
| GET | `/hr-analytics/predictions/flight-risk` | services/hrAnalyticsService.ts |
| GET | `/hr-analytics/predictions/absence` | services/hrAnalyticsService.ts |
| GET | `/hr-analytics/predictions/engagement` | services/hrAnalyticsService.ts |

### leads (20 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| POST | `/leads` | hooks/useApiError.tsx |
| GET | `/leads` | services/accountingService.ts |
| GET | `/leads/${id}` | services/accountingService.ts |
| PUT | `/leads/${id}` | services/accountingService.ts |
| DELETE | `/leads/${id}` | services/accountingService.ts |
| POST | `/leads/${id}/convert` | services/accountingService.ts |
| PATCH | `/leads/${id}/stage` | services/accountingService.ts |
| POST | `/leads/${id}/activity` | services/accountingService.ts |
| GET | `/leads/stats` | services/accountingService.ts |
| POST | `/leads/${id}/status` | services/crmService.ts |
| POST | `/leads/${id}/move` | services/crmService.ts |
| GET | `/leads/${id}/conversion-preview` | services/crmService.ts |
| GET | `/leads/follow-up` | services/crmService.ts |
| GET | `/leads/${id}/activities` | services/crmService.ts |
| POST | `/leads/${id}/activities` | services/crmService.ts |
| POST | `/leads/${id}/follow-up` | services/crmService.ts |
| POST | `/leads/${id}/verify/wathq` | services/crmService.ts |
| POST | `/leads/${id}/verify/absher` | services/crmService.ts |
| POST | `/leads/${id}/verify/address` | services/crmService.ts |
| POST | `/leads/${id}/conflict-check` | services/crmService.ts |

### leave-allocations (20 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/leave-allocations/${allocationId}` | services/leaveAllocationService.ts |
| POST | `/leave-allocations` | services/leaveAllocationService.ts |
| PATCH | `/leave-allocations/${allocationId}` | services/leaveAllocationService.ts |
| DELETE | `/leave-allocations/${allocationId}` | services/leaveAllocationService.ts |
| GET | `/leave-allocations/balance/${employeeId}?${params.toString()}` | services/leaveAllocationService.ts |
| GET | `/leave-allocations/employee/${employeeId}/all` | services/leaveAllocationService.ts |
| POST | `/leave-allocations/bulk` | services/leaveAllocationService.ts |
| POST | `/leave-allocations/carry-forward` | services/leaveAllocationService.ts |
| POST | `/leave-allocations/carry-forward/process-all` | services/leaveAllocationService.ts |
| POST | `/leave-allocations/carry-forward/expire?${params.toString()}` | services/leaveAllocationService.ts |
| PATCH | `/leave-allocations/${allocationId}/update-balance` | services/leaveAllocationService.ts |
| POST | `/leave-allocations/${allocationId}/encash` | services/leaveAllocationService.ts |
| GET | `/leave-allocations/summary/${leavePeriodId}?${params.toString()}` | services/leaveAllocationService.ts |
| GET | `/leave-allocations/carry-forward/summary?${params.toString()}` | services/leaveAllocationService.ts |
| GET | `/leave-allocations/low-balance?${params.toString()}` | services/leaveAllocationService.ts |
| GET | `/leave-allocations/expiring-carry-forward?${params.toString()}` | services/leaveAllocationService.ts |
| POST | `/leave-allocations/${allocationId}/adjust` | services/leaveAllocationService.ts |
| GET | `/leave-allocations/history/${employeeId}?${params.toString()}` | services/leaveAllocationService.ts |
| GET | `/leave-allocations/statistics?${params.toString()}` | services/leaveAllocationService.ts |
| POST | `/leave-allocations/:param` | services/leaveAllocationService.ts |

### ml (20 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/ml/scores` | services/mlScoringApi.ts |
| GET | `/ml/scores/${leadId}` | services/mlScoringApi.ts |
| POST | `/ml/scores/${leadId}/calculate` | services/mlScoringApi.ts |
| POST | `/ml/scores/batch` | services/mlScoringApi.ts |
| GET | `/ml/scores/${leadId}/explanation` | services/mlScoringApi.ts |
| GET | `/ml/scores/${leadId}/hybrid` | services/mlScoringApi.ts |
| GET | `/ml/priority-queue` | services/mlScoringApi.ts |
| GET | `/ml/priority-queue/workload` | services/mlScoringApi.ts |
| POST | `/ml/priority/${leadId}/contact` | services/mlScoringApi.ts |
| PUT | `/ml/priority/${leadId}/assign` | services/mlScoringApi.ts |
| GET | `/ml/sla/metrics` | services/mlScoringApi.ts |
| GET | `/ml/sla/breaches` | services/mlScoringApi.ts |
| GET | `/ml/analytics/dashboard` | services/mlScoringApi.ts |
| GET | `/ml/analytics/feature-importance` | services/mlScoringApi.ts |
| GET | `/ml/analytics/score-distribution` | services/mlScoringApi.ts |
| POST | `/ml/train` | services/mlScoringApi.ts |
| GET | `/ml/model/metrics` | services/mlScoringApi.ts |
| POST | `/ml/model/export` | services/mlScoringApi.ts |
| POST | `/ml/scores/:param/explanation` | services/mlScoringApi.ts |
| GET | `/ml/priority/:param/contact` | services/mlScoringApi.ts |

### analytics-reports (20 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/analytics-reports/stats` | services/reportsService.ts |
| GET | `/analytics-reports/favorites` | services/reportsService.ts |
| GET | `/analytics-reports/pinned` | services/reportsService.ts |
| GET | `/analytics-reports/templates` | services/reportsService.ts |
| GET | `/analytics-reports/section/${section}` | services/reportsService.ts |
| POST | `/analytics-reports/from-template/${templateId}` | services/reportsService.ts |
| POST | `/analytics-reports` | services/reportsService.ts |
| POST | `/analytics-reports/bulk-delete` | services/reportsService.ts |
| GET | `/analytics-reports/${id}` | services/reportsService.ts |
| PATCH | `/analytics-reports/${id}` | services/reportsService.ts |
| PUT | `/analytics-reports/${id}` | services/reportsService.ts |
| DELETE | `/analytics-reports/${id}` | services/reportsService.ts |
| POST | `/analytics-reports/${id}/run` | services/reportsService.ts |
| POST | `/analytics-reports/${id}/clone` | services/reportsService.ts |
| POST | `/analytics-reports/${id}/export` | services/reportsService.ts |
| POST | `/analytics-reports/${id}/favorite` | services/reportsService.ts |
| POST | `/analytics-reports/${id}/pin` | services/reportsService.ts |
| POST | `/analytics-reports/${id}/schedule` | services/reportsService.ts |
| DELETE | `/analytics-reports/${id}/schedule` | services/reportsService.ts |
| POST | `/analytics-reports/:param` | services/reportsService.ts |

### data-export (19 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| POST | `/data-export/export` | services/dataExportService.ts |
| GET | `/data-export/jobs/${jobId}` | services/dataExportService.ts |
| GET | `/data-export/jobs` | services/dataExportService.ts |
| GET | `/data-export/jobs/${jobId}/download` | services/dataExportService.ts |
| POST | `/data-export/jobs/${jobId}/cancel` | services/dataExportService.ts |
| DELETE | `/data-export/jobs/${jobId}` | services/dataExportService.ts |
| POST | `/data-export/import` | services/dataExportService.ts |
| POST | `/data-export/import/${jobId}/start` | services/dataExportService.ts |
| POST | `/data-export/import/${jobId}/validate` | services/dataExportService.ts |
| GET | `/data-export/import/${jobId}` | services/dataExportService.ts |
| GET | `/data-export/imports` | services/dataExportService.ts |
| POST | `/data-export/import/${jobId}/cancel` | services/dataExportService.ts |
| GET | `/data-export/templates` | services/dataExportService.ts |
| POST | `/data-export/templates` | services/dataExportService.ts |
| PATCH | `/data-export/templates/${id}` | services/dataExportService.ts |
| DELETE | `/data-export/templates/${id}` | services/dataExportService.ts |
| POST | `/data-export/jobs/:param` | services/dataExportService.ts |
| GET | `/data-export/import/:param/cancel` | services/dataExportService.ts |
| GET | `/data-export/templates/:param` | services/dataExportService.ts |

### leave-requests (19 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/leave-requests/${requestId}` | services/leaveService.ts |
| POST | `/leave-requests` | services/leaveService.ts |
| PATCH | `/leave-requests/${requestId}` | services/leaveService.ts |
| DELETE | `/leave-requests/${requestId}` | services/leaveService.ts |
| POST | `/leave-requests/${requestId}/submit` | services/leaveService.ts |
| POST | `/leave-requests/${requestId}/approve` | services/leaveService.ts |
| POST | `/leave-requests/${requestId}/reject` | services/leaveService.ts |
| POST | `/leave-requests/${requestId}/cancel` | services/leaveService.ts |
| POST | `/leave-requests/${requestId}/confirm-return` | services/leaveService.ts |
| POST | `/leave-requests/${requestId}/request-extension` | services/leaveService.ts |
| GET | `/leave-requests/balance/${employeeId}` | services/leaveService.ts |
| GET | `/leave-requests/stats?${params.toString()}` | services/leaveService.ts |
| GET | `/leave-requests/calendar?${params.toString()}` | services/leaveService.ts |
| POST | `/leave-requests/check-conflicts` | services/leaveService.ts |
| POST | `/leave-requests/${requestId}/documents` | services/leaveService.ts |
| POST | `/leave-requests/${requestId}/complete-handover` | services/leaveService.ts |
| GET | `/leave-requests/pending-approvals` | services/leaveService.ts |
| GET | `/leave-requests/types` | services/leaveService.ts |
| POST | `/leave-requests/:param` | services/leaveService.ts |

### workflows (19 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/workflows/presets` | services/workflowService.ts |
| POST | `/workflows/presets/${presetType}` | services/workflowService.ts |
| GET | `/workflows/stats` | services/workflowService.ts |
| GET | `/workflows/category/${category}` | services/workflowService.ts |
| GET | `/workflows` | services/workflowService.ts |
| POST | `/workflows` | services/workflowService.ts |
| GET | `/workflows/${id}` | services/workflowService.ts |
| PATCH | `/workflows/${id}` | services/workflowService.ts |
| DELETE | `/workflows/${id}` | services/workflowService.ts |
| POST | `/workflows/${id}/duplicate` | services/workflowService.ts |
| POST | `/workflows/${id}/stages` | services/workflowService.ts |
| PATCH | `/workflows/${id}/stages/${stageId}` | services/workflowService.ts |
| DELETE | `/workflows/${id}/stages/${stageId}` | services/workflowService.ts |
| POST | `/workflows/${id}/stages/reorder` | services/workflowService.ts |
| POST | `/workflows/${id}/transitions` | services/workflowService.ts |
| POST | `/workflows/cases/${caseId}/initialize` | services/workflowService.ts |
| GET | `/workflows/cases/${caseId}/progress` | services/workflowService.ts |
| POST | `/workflows/cases/${caseId}/move` | services/workflowService.ts |
| POST | `/workflows/cases/${caseId}/requirements/${requirementId}/complete` | services/workflowService.ts |

### trust-accounts (18 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/trust-accounts` | services/trustAccountService.ts |
| GET | `/trust-accounts/${id}` | services/trustAccountService.ts |
| POST | `/trust-accounts` | services/trustAccountService.ts |
| PATCH | `/trust-accounts/${id}` | services/trustAccountService.ts |
| DELETE | `/trust-accounts/${id}` | services/trustAccountService.ts |
| GET | `/trust-accounts/${accountId}/balances` | services/trustAccountService.ts |
| GET | `/trust-accounts/${accountId}/balances/${clientId}` | services/trustAccountService.ts |
| GET | `/trust-accounts/${accountId}/transactions` | services/trustAccountService.ts |
| GET | `/trust-accounts/${accountId}/transactions/${transactionId}` | services/trustAccountService.ts |
| POST | `/trust-accounts/${accountId}/transactions` | services/trustAccountService.ts |
| POST | `/trust-accounts/${fromAccountId}/transfer` | services/trustAccountService.ts |
| POST | `/trust-accounts/${accountId}/transactions/${transactionId}/void` | services/trustAccountService.ts |
| GET | `/trust-accounts/${accountId}/reconciliations` | services/trustAccountService.ts |
| POST | `/trust-accounts/${accountId}/reconciliations` | services/trustAccountService.ts |
| POST | `/trust-accounts/${accountId}/three-way-reconciliations` | services/trustAccountService.ts |
| GET | `/trust-accounts/${accountId}/three-way-reconciliations` | services/trustAccountService.ts |
| GET | `/trust-accounts/${id}/summary` | services/trustAccountService.ts |
| POST | `/trust-accounts/:param` | services/trustAccountService.ts |

### activities (17 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| POST | `/activities` | services/activityService.ts |
| GET | `/activities/${id}` | services/activityService.ts |
| GET | `/activities/summary` | services/activityService.ts |
| GET | `/activities/overview` | services/activityService.ts |
| GET | `/activities/entity/${entityType}/${entityId}?limit=${limit}` | services/activityService.ts |
| PATCH | `/activities/${id}` | services/financeService.ts |
| DELETE | `/activities/${id}` | services/financeService.ts |
| GET | `/activities/types` | services/odooActivityService.ts |
| POST | `/activities/types` | services/odooActivityService.ts |
| PATCH | `/activities/types/${id}` | services/odooActivityService.ts |
| DELETE | `/activities/types/${id}` | services/odooActivityService.ts |
| GET | `/activities/my?${params.toString()}` | services/odooActivityService.ts |
| GET | `/activities/stats` | services/odooActivityService.ts |
| POST | `/activities/${id}/done` | services/odooActivityService.ts |
| POST | `/activities/${id}/cancel` | services/odooActivityService.ts |
| PATCH | `/activities/${id}/reschedule` | services/odooActivityService.ts |
| PATCH | `/activities/${id}/reassign` | services/odooActivityService.ts |

### chatter (17 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/chatter/followers/${resModel}/${resId}` | services/chatterService.ts |
| POST | `/chatter/followers` | services/chatterService.ts |
| DELETE | `/chatter/followers/${followerId}` | services/chatterService.ts |
| PATCH | `/chatter/followers/${followerId}/preferences` | services/chatterService.ts |
| GET | `/chatter/followers/${resModel}/${resId}/me` | services/chatterService.ts |
| POST | `/chatter/followers/${resModel}/${resId}/toggle` | services/chatterService.ts |
| GET | `/chatter/activity-types` | services/chatterService.ts |
| GET | `/chatter/activities/${resModel}/${resId}?${params.toString()}` | services/chatterService.ts |
| GET | `/chatter/activities/me?${params.toString()}` | services/chatterService.ts |
| POST | `/chatter/activities` | services/chatterService.ts |
| PATCH | `/chatter/activities/${activityId}` | services/chatterService.ts |
| POST | `/chatter/activities/${activityId}/done` | services/chatterService.ts |
| DELETE | `/chatter/activities/${activityId}` | services/chatterService.ts |
| POST | `/chatter/attachments` | services/chatterService.ts |
| POST | `/chatter/attachments/bulk` | services/chatterService.ts |
| GET | `/chatter/attachments/${resModel}/${resId}` | services/chatterService.ts |
| DELETE | `/chatter/attachments/${attachmentId}` | services/chatterService.ts |

### expenses (17 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/expenses` | services/expenseService.ts |
| GET | `/expenses/${id}` | services/expenseService.ts |
| POST | `/expenses` | services/expenseService.ts |
| PUT | `/expenses/${id}` | services/expenseService.ts |
| DELETE | `/expenses/${id}` | services/expenseService.ts |
| POST | `/expenses/${id}/reimburse` | services/expenseService.ts |
| POST | `/expenses/${id}/receipt` | services/expenseService.ts |
| GET | `/expenses/stats` | services/expenseService.ts |
| GET | `/expenses/by-category` | services/expenseService.ts |
| POST | `/expenses/${id}/submit` | services/expenseService.ts |
| POST | `/expenses/${id}/approve` | services/expenseService.ts |
| POST | `/expenses/${id}/reject` | services/expenseService.ts |
| POST | `/expenses/bulk-approve` | services/expenseService.ts |
| POST | `/expenses/bulk-delete` | services/expenseService.ts |
| POST | `/expenses/suggest-category` | services/expenseService.ts |
| GET | `/expenses/categories` | services/expenseService.ts |
| GET | `/expenses/new` | services/expenseService.ts |

### followups (17 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/followups/${id}` | services/followupsService.ts |
| POST | `/followups` | services/followupsService.ts |
| PATCH | `/followups/${id}` | services/followupsService.ts |
| DELETE | `/followups/${id}` | services/followupsService.ts |
| GET | `/followups/entity/${entityType}/${entityId}` | services/followupsService.ts |
| GET | `/followups/stats` | services/followupsService.ts |
| GET | `/followups/overdue` | services/followupsService.ts |
| GET | `/followups/upcoming?days=${days}` | services/followupsService.ts |
| GET | `/followups/today` | services/followupsService.ts |
| POST | `/followups/${id}/complete` | services/followupsService.ts |
| POST | `/followups/${id}/cancel` | services/followupsService.ts |
| POST | `/followups/${id}/reschedule` | services/followupsService.ts |
| POST | `/followups/${id}/notes` | services/followupsService.ts |
| POST | `/followups/bulk-complete` | services/followupsService.ts |
| POST | `/followups/bulk-delete` | services/followupsService.ts |
| POST | `/followups/:param` | services/followupsService.ts |
| GET | `/followups/:param/complete` | services/followupsService.ts |

### journal-entries (16 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/journal-entries` | services/accountingService.ts |
| GET | `/journal-entries/${id}` | services/accountingService.ts |
| POST | `/journal-entries` | services/accountingService.ts |
| POST | `/journal-entries/simple` | services/accountingService.ts |
| PATCH | `/journal-entries/${id}` | services/accountingService.ts |
| POST | `/journal-entries/${id}/post` | services/accountingService.ts |
| POST | `/journal-entries/${id}/void` | services/accountingService.ts |
| DELETE | `/journal-entries/${id}` | services/accountingService.ts |
| POST | `/journal-entries/${id}/attachments` | services/journalEntryService.ts |
| DELETE | `/journal-entries/${id}/attachments/${attachmentId}` | services/journalEntryService.ts |
| GET | `/journal-entries/stats` | services/journalEntryService.ts |
| POST | `/journal-entries/validate` | services/journalEntryService.ts |
| GET | `/journal-entries/recent` | services/journalEntryService.ts |
| POST | `/journal-entries/${id}/duplicate` | services/journalEntryService.ts |
| GET | `/journal-entries/templates` | services/journalEntryService.ts |
| POST | `/journal-entries/from-template/${templateId}` | services/journalEntryService.ts |

### budgets (16 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/budgets` | services/budgetService.ts |
| GET | `/budgets/${id}` | services/budgetService.ts |
| POST | `/budgets` | services/budgetService.ts |
| PATCH | `/budgets/${id}` | services/budgetService.ts |
| DELETE | `/budgets/${id}` | services/budgetService.ts |
| POST | `/budgets/${id}/submit` | services/budgetService.ts |
| POST | `/budgets/${id}/approve` | services/budgetService.ts |
| POST | `/budgets/${id}/reject` | services/budgetService.ts |
| POST | `/budgets/${id}/close` | services/budgetService.ts |
| GET | `/budgets/${budgetId}/lines` | services/budgetService.ts |
| PATCH | `/budgets/${budgetId}/lines/${lineId}` | services/budgetService.ts |
| GET | `/budgets/stats` | services/budgetService.ts |
| GET | `/budgets/${budgetId}/vs-actual` | services/budgetService.ts |
| POST | `/budgets/check` | services/budgetService.ts |
| POST | `/budgets/${budgetId}/distribution` | services/budgetService.ts |
| POST | `/budgets/${id}/duplicate` | services/budgetService.ts |

### payroll-runs (16 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/payroll-runs/${runId}` | services/payrollRunService.ts |
| POST | `/payroll-runs` | services/payrollRunService.ts |
| PATCH | `/payroll-runs/${runId}` | services/payrollRunService.ts |
| DELETE | `/payroll-runs/${runId}` | services/payrollRunService.ts |
| POST | `/payroll-runs/${runId}/calculate` | services/payrollRunService.ts |
| POST | `/payroll-runs/${runId}/validate` | services/payrollRunService.ts |
| POST | `/payroll-runs/${runId}/approve` | services/payrollRunService.ts |
| POST | `/payroll-runs/${runId}/process-payments` | services/payrollRunService.ts |
| POST | `/payroll-runs/${runId}/generate-wps` | services/payrollRunService.ts |
| POST | `/payroll-runs/${runId}/cancel` | services/payrollRunService.ts |
| POST | `/payroll-runs/${runId}/send-notifications` | services/payrollRunService.ts |
| GET | `/payroll-runs/stats` | services/payrollRunService.ts |
| POST | `/payroll-runs/${runId}/employees/${empId}/hold` | services/payrollRunService.ts |
| POST | `/payroll-runs/${runId}/employees/${empId}/unhold` | services/payrollRunService.ts |
| POST | `/payroll-runs/:param` | services/payrollRunService.ts |
| GET | `/payroll-runs/:param/employees/:param/hold` | services/payrollRunService.ts |

### saved-reports (16 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/saved-reports/reports?${params.toString()}` | services/reportsService.ts |
| POST | `/saved-reports/reports` | services/reportsService.ts |
| GET | `/saved-reports/reports/${id}` | services/reportsService.ts |
| PATCH | `/saved-reports/reports/${id}` | services/reportsService.ts |
| DELETE | `/saved-reports/reports/${id}` | services/reportsService.ts |
| POST | `/saved-reports/reports/${id}/run` | services/reportsService.ts |
| POST | `/saved-reports/reports/${id}/duplicate` | services/reportsService.ts |
| GET | `/saved-reports/widgets/defaults` | services/reportsService.ts |
| PATCH | `/saved-reports/widgets/layout` | services/reportsService.ts |
| GET | `/saved-reports/widgets` | services/reportsService.ts |
| POST | `/saved-reports/widgets` | services/reportsService.ts |
| GET | `/saved-reports/widgets/${id}` | services/reportsService.ts |
| PATCH | `/saved-reports/widgets/${id}` | services/reportsService.ts |
| DELETE | `/saved-reports/widgets/${id}` | services/reportsService.ts |
| GET | `/saved-reports/widgets/${id}/data` | services/reportsService.ts |
| POST | `/saved-reports/reports/:param` | services/reportsService.ts |

### shift-assignments (16 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/shift-assignments/${assignmentId}` | services/shiftAssignmentService.ts |
| GET | `/shift-assignments/employee/${employeeId}/current?${params.toString()}` | services/shiftAssignmentService.ts |
| GET | `/shift-assignments/employee/${employeeId}/active` | services/shiftAssignmentService.ts |
| POST | `/shift-assignments` | services/shiftAssignmentService.ts |
| PUT | `/shift-assignments/${assignmentId}` | services/shiftAssignmentService.ts |
| DELETE | `/shift-assignments/${assignmentId}` | services/shiftAssignmentService.ts |
| POST | `/shift-assignments/bulk` | services/shiftAssignmentService.ts |
| POST | `/shift-assignments/${assignmentId}/activate` | services/shiftAssignmentService.ts |
| POST | `/shift-assignments/${assignmentId}/deactivate` | services/shiftAssignmentService.ts |
| GET | `/shift-assignments/stats?${params.toString()}` | services/shiftAssignmentService.ts |
| GET | `/shift-assignments/coverage-report?${params.toString()}` | services/shiftAssignmentService.ts |
| POST | `/shift-assignments/import` | services/shiftAssignmentService.ts |
| GET | `/shift-assignments/export?${params.toString()}` | services/shiftAssignmentService.ts |
| POST | `/shift-assignments/:param` | services/shiftAssignmentService.ts |
| POST | `/shift-assignments/coverage-report?:param` | services/shiftAssignmentService.ts |
| POST | `/shift-assignments/export?:param` | services/shiftAssignmentService.ts |

### webhooks (16 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/webhooks/stats` | services/webhookService.ts |
| GET | `/webhooks/events` | services/webhookService.ts |
| POST | `/webhooks` | services/webhookService.ts |
| GET | `/webhooks` | services/webhookService.ts |
| GET | `/webhooks/${id}` | services/webhookService.ts |
| PUT | `/webhooks/${id}` | services/webhookService.ts |
| PATCH | `/webhooks/${id}` | services/webhookService.ts |
| DELETE | `/webhooks/${id}` | services/webhookService.ts |
| POST | `/webhooks/${id}/test` | services/webhookService.ts |
| POST | `/webhooks/${id}/enable` | services/webhookService.ts |
| POST | `/webhooks/${id}/disable` | services/webhookService.ts |
| GET | `/webhooks/${id}/secret` | services/webhookService.ts |
| POST | `/webhooks/${id}/regenerate-secret` | services/webhookService.ts |
| GET | `/webhooks/${id}/deliveries` | services/webhookService.ts |
| GET | `/webhooks/${id}/deliveries/${deliveryId}` | services/webhookService.ts |
| POST | `/webhooks/${id}/deliveries/${deliveryId}/retry` | services/webhookService.ts |

### users (15 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| POST | `/users/push-subscription` | lib/push-notifications.ts |
| DELETE | `/users/push-subscription` | lib/push-notifications.ts |
| GET | `/users/team` | services/usersService.ts |
| GET | `/users/lawyers` | services/usersService.ts |
| GET | `/users/${userId}` | services/usersService.ts |
| GET | `/users/lawyer/${username}` | services/usersService.ts |
| PATCH | `/users/${userId}` | services/usersService.ts |
| DELETE | `/users/${userId}` | services/usersService.ts |
| GET | `/users/vapid-public-key` | services/usersService.ts |
| GET | `/users/push-subscription` | services/usersService.ts |
| GET | `/users/notification-preferences` | services/usersService.ts |
| PUT | `/users/notification-preferences` | services/usersService.ts |
| POST | `/users/convert-to-firm` | services/usersService.ts |
| GET | `/users` | utils/retry.ts |
| POST | `/users` | utils/retry.ts |

### reports (15 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/reports/profit-loss` | services/accountingService.ts |
| GET | `/reports/balance-sheet` | services/accountingService.ts |
| GET | `/reports/trial-balance` | services/accountingService.ts |
| GET | `/reports/ar-aging` | services/accountingService.ts |
| GET | `/reports/case-profitability` | services/accountingService.ts |
| DELETE | `/reports/consolidated/elimination-rules/${id}` | services/consolidatedReportService.ts |
| POST | `/reports/consolidated/export` | services/consolidatedReportService.ts |
| GET | `/reports/accounts-aging` | services/financeService.ts |
| GET | `/reports/revenue-by-client` | services/financeService.ts |
| GET | `/reports/outstanding-invoices` | services/financeService.ts |
| GET | `/reports/time-entries` | services/financeService.ts |
| GET | `/reports/${reportType}/export` | services/financeService.ts |
| GET | `/reports/templates` | services/reportsService.ts |
| POST | `/reports/generate` | services/reportsService.ts |
| POST | `/reports/export` | services/reportsService.ts |

### recurring-invoices (15 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/recurring-invoices` | services/recurringInvoiceService.ts |
| GET | `/recurring-invoices/${id}` | services/recurringInvoiceService.ts |
| POST | `/recurring-invoices` | services/recurringInvoiceService.ts |
| PATCH | `/recurring-invoices/${id}` | services/recurringInvoiceService.ts |
| DELETE | `/recurring-invoices/${id}` | services/recurringInvoiceService.ts |
| POST | `/recurring-invoices/${id}/pause` | services/recurringInvoiceService.ts |
| POST | `/recurring-invoices/${id}/resume` | services/recurringInvoiceService.ts |
| POST | `/recurring-invoices/${id}/cancel` | services/recurringInvoiceService.ts |
| POST | `/recurring-invoices/${id}/generate` | services/recurringInvoiceService.ts |
| GET | `/recurring-invoices/${id}/preview` | services/recurringInvoiceService.ts |
| GET | `/recurring-invoices/${id}/history` | services/recurringInvoiceService.ts |
| GET | `/recurring-invoices/stats` | services/recurringInvoiceService.ts |
| POST | `/recurring-invoices/${id}/duplicate` | services/recurringInvoiceService.ts |
| POST | `/recurring-invoices/:param` | services/recurringInvoiceService.ts |
| GET | `/recurring-invoices/:param/duplicate` | services/recurringInvoiceService.ts |

### price-levels (14 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/price-levels` | services/accountingService.ts |
| GET | `/price-levels/client-rate` | services/accountingService.ts |
| GET | `/price-levels/${id}` | services/accountingService.ts |
| POST | `/price-levels` | services/accountingService.ts |
| PUT | `/price-levels/${id}` | services/accountingService.ts |
| DELETE | `/price-levels/${id}` | services/accountingService.ts |
| POST | `/price-levels/${id}/set-default` | services/accountingService.ts |
| GET | `/price-levels/default` | services/priceLevelService.ts |
| POST | `/price-levels/${id}/calculate` | services/priceLevelService.ts |
| POST | `/price-levels/${id}/assign` | services/priceLevelService.ts |
| GET | `/price-levels/${id}/clients` | services/priceLevelService.ts |
| POST | `/price-levels/${id}/duplicate` | services/priceLevelService.ts |
| POST | `/price-levels/${id}/archive` | services/priceLevelService.ts |
| POST | `/price-levels/${id}/restore` | services/priceLevelService.ts |

### assets (14 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| PATCH | `/assets/${id}/sell` | services/assetsService.ts |
| PATCH | `/assets/${id}/scrap` | services/assetsService.ts |
| GET | `/assets/${assetId}/depreciation` | services/assetsService.ts |
| POST | `/assets/${assetId}/depreciation` | services/assetsService.ts |
| POST | `/assets/${assetId}/maintenance` | services/assetsService.ts |
| PUT | `/assets/${assetId}/maintenance/${scheduleId}` | services/assetsService.ts |
| PATCH | `/assets/${assetId}/maintenance/${scheduleId}/complete` | services/assetsService.ts |
| GET | `/assets/repairs` | services/assetsService.ts |
| GET | `/assets/repairs/${id}` | services/assetsService.ts |
| POST | `/assets/repairs` | services/assetsService.ts |
| PUT | `/assets/repairs/${id}` | services/assetsService.ts |
| PATCH | `/assets/repairs/${id}/complete` | services/assetsService.ts |
| GET | `/assets/:param/maintenance` | services/assetsService.ts |
| POST | `/assets/repairs/:param` | services/assetsService.ts |

### automated-actions (14 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/automated-actions/${id}` | services/automatedActionService.ts |
| POST | `/automated-actions` | services/automatedActionService.ts |
| PUT | `/automated-actions/${id}` | services/automatedActionService.ts |
| DELETE | `/automated-actions/${id}` | services/automatedActionService.ts |
| POST | `/automated-actions/${id}/toggle` | services/automatedActionService.ts |
| POST | `/automated-actions/${id}/test` | services/automatedActionService.ts |
| POST | `/automated-actions/${id}/duplicate` | services/automatedActionService.ts |
| GET | `/automated-actions/${actionId}/logs?${params.toString()}` | services/automatedActionService.ts |
| GET | `/automated-actions/logs?${params.toString()}` | services/automatedActionService.ts |
| GET | `/automated-actions/models` | services/automatedActionService.ts |
| GET | `/automated-actions/models/${modelName}/fields` | services/automatedActionService.ts |
| POST | `/automated-actions/bulk/enable` | services/automatedActionService.ts |
| POST | `/automated-actions/bulk/disable` | services/automatedActionService.ts |
| DELETE | `/automated-actions/bulk` | services/automatedActionService.ts |

### crm-activities (14 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/crm-activities` | services/crmService.ts |
| GET | `/crm-activities/${id}` | services/crmService.ts |
| POST | `/crm-activities` | services/crmService.ts |
| PUT | `/crm-activities/${id}` | services/crmService.ts |
| DELETE | `/crm-activities/${id}` | services/crmService.ts |
| GET | `/crm-activities/timeline` | services/crmService.ts |
| GET | `/crm-activities/stats` | services/crmService.ts |
| GET | `/crm-activities/entity/${entityType}/${entityId}` | services/crmService.ts |
| GET | `/crm-activities/tasks/upcoming` | services/crmService.ts |
| POST | `/crm-activities/${id}/complete` | services/crmService.ts |
| POST | `/crm-activities/log/call` | services/crmService.ts |
| POST | `/crm-activities/log/email` | services/crmService.ts |
| POST | `/crm-activities/log/meeting` | services/crmService.ts |
| POST | `/crm-activities/log/note` | services/crmService.ts |

### leave-periods (14 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/leave-periods/${id}` | services/leavePeriodService.ts |
| POST | `/leave-periods` | services/leavePeriodService.ts |
| PATCH | `/leave-periods/${id}` | services/leavePeriodService.ts |
| DELETE | `/leave-periods/${id}` | services/leavePeriodService.ts |
| GET | `/leave-periods/active` | services/leavePeriodService.ts |
| POST | `/leave-periods/${periodId}/allocate` | services/leavePeriodService.ts |
| GET | `/leave-periods/${periodId}/statistics` | services/leavePeriodService.ts |
| POST | `/leave-periods/${id}/activate` | services/leavePeriodService.ts |
| POST | `/leave-periods/${id}/deactivate` | services/leavePeriodService.ts |
| GET | `/leave-periods/year/${year}` | services/leavePeriodService.ts |
| GET | `/leave-periods/check-date` | services/leavePeriodService.ts |
| GET | `/leave-periods/${periodId}/allocation-summary` | services/leavePeriodService.ts |
| POST | `/leave-periods/:param` | services/leavePeriodService.ts |
| GET | `/leave-periods/:param/allocate` | services/leavePeriodService.ts |

### attendance (13 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| POST | `/attendance/${recordId}/excuse-late` | services/attendanceService.ts |
| POST | `/attendance/${recordId}/approve-early-departure` | services/attendanceService.ts |
| POST | `/attendance/${recordId}/approve-timesheet` | services/attendanceService.ts |
| POST | `/attendance/${recordId}/reject-timesheet` | services/attendanceService.ts |
| POST | `/attendance/${recordId}/approve-overtime` | services/attendanceService.ts |
| GET | `/attendance/daily-summary?${params.toString()}` | services/attendanceService.ts |
| GET | `/attendance/employee-summary/${employeeId}?${params.toString()}` | services/attendanceService.ts |
| GET | `/attendance/stats?${params.toString()}` | services/attendanceService.ts |
| POST | `/attendance/bulk` | services/attendanceService.ts |
| POST | `/attendance/lock-for-payroll` | services/attendanceService.ts |
| POST | `/attendance/${recordId}/violations/${violationId}/confirm` | services/attendanceService.ts |
| POST | `/attendance/${recordId}/violations/${violationId}/dismiss` | services/attendanceService.ts |
| GET | `/attendance/compliance-report?${params.toString()}` | services/attendanceService.ts |

### firms (13 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/firms/my` | services/billingSettingsService.ts |
| PUT | `/firms/${cachedFirmId}` | services/billingSettingsService.ts |
| POST | `/firms/${cachedFirmId}/logo` | services/billingSettingsService.ts |
| PATCH | `/firms/${cachedFirmId}` | services/billingSettingsService.ts |
| DELETE | `/firms/${id}` | services/companyService.ts |
| DELETE | `/firms/${firmId}/access/${userId}` | services/companyService.ts |
| DELETE | `/firms/${firmId}/members/${memberId}` | services/firmService.ts |
| POST | `/firms/${firmId}/leave` | services/firmService.ts |
| POST | `/firms/${firmId}/transfer-ownership` | services/firmService.ts |
| DELETE | `/firms/${firmId}/invitations/${invitationId}` | services/firmService.ts |
| POST | `/firms/${firmId}/invitations/${invitationId}/resend` | services/firmService.ts |
| POST | `/firms/lawyer/add` | services/firmService.ts |
| POST | `/firms/lawyer/remove` | services/firmService.ts |

### credit-notes (13 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/credit-notes` | services/financeService.ts |
| GET | `/credit-notes/${id}` | services/financeService.ts |
| POST | `/credit-notes` | services/financeService.ts |
| PATCH | `/credit-notes/${id}` | services/financeService.ts |
| DELETE | `/credit-notes/${id}` | services/financeService.ts |
| POST | `/credit-notes/${id}/issue` | services/financeService.ts |
| POST | `/credit-notes/${id}/apply` | services/financeService.ts |
| POST | `/credit-notes/${id}/void` | services/financeService.ts |
| GET | `/credit-notes/invoice/${invoiceId}` | services/financeService.ts |
| POST | `/credit-notes/${id}/zatca/submit` | services/financeService.ts |
| GET | `/credit-notes/${id}/zatca/status` | services/financeService.ts |
| GET | `/credit-notes/${id}/pdf` | services/financeService.ts |
| GET | `/credit-notes/${id}/xml` | services/financeService.ts |

### notifications (13 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/notifications` | services/notificationService.ts |
| GET | `/notifications/${id}` | services/notificationService.ts |
| GET | `/notifications/unread-count` | services/notificationService.ts |
| PATCH | `/notifications/${id}/read` | services/notificationService.ts |
| PATCH | `/notifications/mark-multiple-read` | services/notificationService.ts |
| PATCH | `/notifications/mark-all-read` | services/notificationService.ts |
| DELETE | `/notifications/${id}` | services/notificationService.ts |
| DELETE | `/notifications/bulk-delete` | services/notificationService.ts |
| DELETE | `/notifications/clear-read` | services/notificationService.ts |
| GET | `/notifications/settings` | services/notificationService.ts |
| PATCH | `/notifications/settings` | services/notificationService.ts |
| POST | `/notifications` | services/notificationService.ts |
| GET | `/notifications/by-type/${type}` | services/notificationService.ts |

### queues (13 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/queues` | services/queueService.ts |
| GET | `/queues/${name}` | services/queueService.ts |
| GET | `/queues/${name}/jobs` | services/queueService.ts |
| GET | `/queues/${name}/jobs/${jobId}` | services/queueService.ts |
| GET | `/queues/${name}/counts` | services/queueService.ts |
| POST | `/queues/${name}/retry/${jobId}` | services/queueService.ts |
| DELETE | `/queues/${name}/jobs/${jobId}` | services/queueService.ts |
| POST | `/queues/${name}/pause` | services/queueService.ts |
| POST | `/queues/${name}/resume` | services/queueService.ts |
| POST | `/queues/${name}/clean` | services/queueService.ts |
| POST | `/queues/${name}/empty` | services/queueService.ts |
| POST | `/queues/${name}/jobs` | services/queueService.ts |
| POST | `/queues/${name}/jobs/bulk` | services/queueService.ts |

### general-ledger (12 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/general-ledger/entries` | services/accountingService.ts |
| GET | `/general-ledger/${id}` | services/accountingService.ts |
| POST | `/general-ledger/${id}/void` | services/accountingService.ts |
| GET | `/general-ledger/account-balance/${accountId}` | services/accountingService.ts |
| GET | `/general-ledger/trial-balance` | services/accountingService.ts |
| GET | `/general-ledger/profit-loss` | services/accountingService.ts |
| GET | `/general-ledger/balance-sheet` | services/accountingService.ts |
| GET | `/general-ledger/reference/${model}/${id}` | services/accountingService.ts |
| GET | `/general-ledger/summary` | services/accountingService.ts |
| GET | `/general-ledger/stats` | services/accountingService.ts |
| GET | `/general-ledger` | services/generalLedgerService.ts |
| POST | `/general-ledger/void/${id}` | services/generalLedgerService.ts |

### fiscal-periods (12 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/fiscal-periods` | services/accountingService.ts |
| GET | `/fiscal-periods/current` | services/accountingService.ts |
| GET | `/fiscal-periods/can-post` | services/accountingService.ts |
| GET | `/fiscal-periods/years-summary` | services/accountingService.ts |
| POST | `/fiscal-periods/create-year` | services/accountingService.ts |
| GET | `/fiscal-periods/${id}` | services/accountingService.ts |
| GET | `/fiscal-periods/${id}/balances` | services/accountingService.ts |
| POST | `/fiscal-periods/${id}/open` | services/accountingService.ts |
| POST | `/fiscal-periods/${id}/close` | services/accountingService.ts |
| POST | `/fiscal-periods/${id}/reopen` | services/accountingService.ts |
| POST | `/fiscal-periods/${id}/lock` | services/accountingService.ts |
| POST | `/fiscal-periods/${id}/year-end-closing` | services/accountingService.ts |

### audit-logs (12 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/audit-logs` | services/auditLogService.ts |
| GET | `/audit-logs/entity/${type}/${id}` | services/auditLogService.ts |
| GET | `/audit-logs/user/${id}` | services/auditLogService.ts |
| GET | `/audit-logs/security` | services/auditLogService.ts |
| GET | `/audit-logs/export` | services/auditLogService.ts |
| GET | `/audit-logs/failed-logins` | services/auditLogService.ts |
| GET | `/audit-logs/suspicious` | services/auditLogService.ts |
| POST | `/audit-logs/check-brute-force` | services/auditLogService.ts |
| POST | `/audit-logs` | services/auditService.ts |
| POST | `/audit-logs/batch` | services/auditService.ts |
| GET | `/audit-logs/resource/${resource}/${resourceId}` | services/auditService.ts |
| GET | `/audit-logs/stats` | services/auditService.ts |

### crm-pipelines (12 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/crm-pipelines` | services/crmService.ts |
| GET | `/crm-pipelines/${id}` | services/crmService.ts |
| POST | `/crm-pipelines` | services/crmService.ts |
| PUT | `/crm-pipelines/${id}` | services/crmService.ts |
| DELETE | `/crm-pipelines/${id}` | services/crmService.ts |
| POST | `/crm-pipelines/${id}/stages` | services/crmService.ts |
| PUT | `/crm-pipelines/${id}/stages/${stageId}` | services/crmService.ts |
| DELETE | `/crm-pipelines/${id}/stages/${stageId}` | services/crmService.ts |
| POST | `/crm-pipelines/${id}/stages/reorder` | services/crmService.ts |
| GET | `/crm-pipelines/${id}/stats` | services/crmService.ts |
| POST | `/crm-pipelines/${id}/default` | services/crmService.ts |
| POST | `/crm-pipelines/${id}/duplicate` | services/crmService.ts |

### document-analysis (12 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| POST | `/document-analysis/${documentId}` | services/documentAnalysisService.ts |
| GET | `/document-analysis/${documentId}` | services/documentAnalysisService.ts |
| DELETE | `/document-analysis/${documentId}` | services/documentAnalysisService.ts |
| POST | `/document-analysis/${documentId}/reanalyze` | services/documentAnalysisService.ts |
| GET | `/document-analysis/${documentId}/status` | services/documentAnalysisService.ts |
| GET | `/document-analysis/${documentId}/history` | services/documentAnalysisService.ts |
| POST | `/document-analysis/batch` | services/documentAnalysisService.ts |
| GET | `/document-analysis/search` | services/documentAnalysisService.ts |
| GET | `/document-analysis/${documentId}/similar` | services/documentAnalysisService.ts |
| GET | `/document-analysis/${documentId}/report` | services/documentAnalysisService.ts |
| GET | `/document-analysis/stats` | services/documentAnalysisService.ts |
| POST | `/document-analysis/:param/similar` | services/documentAnalysisService.ts |

### legal-documents (12 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/legal-documents` | services/legalDocumentService.ts |
| GET | `/legal-documents/${id}` | services/legalDocumentService.ts |
| POST | `/legal-documents` | services/legalDocumentService.ts |
| PATCH | `/legal-documents/${id}` | services/legalDocumentService.ts |
| DELETE | `/legal-documents/${id}` | services/legalDocumentService.ts |
| POST | `/legal-documents/${id}/download` | services/legalDocumentService.ts |
| POST | `/legal-documents/${id}/upload` | services/legalDocumentService.ts |
| GET | `/legal-documents/search` | services/legalDocumentService.ts |
| GET | `/legal-documents/category/${category}` | services/legalDocumentService.ts |
| GET | `/legal-documents/categories` | services/legalDocumentService.ts |
| POST | `/legal-documents/${id}/duplicate` | services/legalDocumentService.ts |
| GET | `/legal-documents/${id}/export` | services/legalDocumentService.ts |

### organizations (12 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/organizations/${id}` | services/organizationsService.ts |
| POST | `/organizations` | services/organizationsService.ts |
| PATCH | `/organizations/${id}` | services/organizationsService.ts |
| DELETE | `/organizations/${id}` | services/organizationsService.ts |
| DELETE | `/organizations/bulk` | services/organizationsService.ts |
| GET | `/organizations/search?q=${encodeURIComponent(query)}` | services/organizationsService.ts |
| GET | `/organizations/client/${clientId}` | services/organizationsService.ts |
| POST | `/organizations/${organizationId}/link-case` | services/organizationsService.ts |
| POST | `/organizations/${organizationId}/link-client` | services/organizationsService.ts |
| POST | `/organizations/${organizationId}/link-contact` | services/organizationsService.ts |
| POST | `/organizations/:param` | services/organizationsService.ts |
| DELETE | `/organizations/search?q=:param` | services/organizationsService.ts |

### messages (11 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/messages/${conversationID}` | hooks/useChat.ts |
| POST | `/messages` | hooks/useChat.ts |
| PATCH | `/messages/${conversationID}/read` | hooks/useChat.ts |
| POST | `/messages/note` | services/messageService.ts |
| GET | `/messages/thread/${resModel}/${resId}` | services/messageService.ts |
| GET | `/messages/mentions?${params.toString()}` | services/messageService.ts |
| GET | `/messages/starred?${params.toString()}` | services/messageService.ts |
| GET | `/messages/search?${params.toString()}` | services/messageService.ts |
| POST | `/messages/${id}/star` | services/messageService.ts |
| DELETE | `/messages/${id}` | services/messageService.ts |
| PATCH | `/messages/${id}` | services/messageService.ts |

### recurring-transactions (11 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/recurring-transactions` | services/accountingService.ts |
| GET | `/recurring-transactions/upcoming` | services/accountingService.ts |
| GET | `/recurring-transactions/${id}` | services/accountingService.ts |
| POST | `/recurring-transactions` | services/accountingService.ts |
| PUT | `/recurring-transactions/${id}` | services/accountingService.ts |
| POST | `/recurring-transactions/${id}/pause` | services/accountingService.ts |
| POST | `/recurring-transactions/${id}/resume` | services/accountingService.ts |
| POST | `/recurring-transactions/${id}/cancel` | services/accountingService.ts |
| POST | `/recurring-transactions/${id}/generate` | services/accountingService.ts |
| POST | `/recurring-transactions/process-due` | services/accountingService.ts |
| DELETE | `/recurring-transactions/${id}` | services/accountingService.ts |

### approvals (11 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/approvals/rules` | services/approvalService.ts |
| PUT | `/approvals/rules` | services/approvalService.ts |
| POST | `/approvals/rules` | services/approvalService.ts |
| DELETE | `/approvals/rules/${ruleId}` | services/approvalService.ts |
| GET | `/approvals/templates` | services/approvalService.ts |
| GET | `/approvals/my-requests` | services/approvalService.ts |
| GET | `/approvals/stats` | services/approvalService.ts |
| POST | `/approvals/check` | services/approvalService.ts |
| GET | `/approvals/${id}` | services/approvalService.ts |
| POST | `/approvals/${id}/approve` | services/approvalService.ts |
| POST | `/approvals/${id}/reject` | services/approvalService.ts |

### bank-accounts (11 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| POST | `/bank-accounts` | services/bankAccountService.ts |
| GET | `/bank-accounts` | services/bankAccountService.ts |
| GET | `/bank-accounts/summary` | services/bankAccountService.ts |
| GET | `/bank-accounts/${id}` | services/bankAccountService.ts |
| PUT | `/bank-accounts/${id}` | services/bankAccountService.ts |
| DELETE | `/bank-accounts/${id}` | services/bankAccountService.ts |
| POST | `/bank-accounts/${id}/set-default` | services/bankAccountService.ts |
| GET | `/bank-accounts/${id}/balance-history` | services/bankAccountService.ts |
| POST | `/bank-accounts/${id}/sync` | services/bankAccountService.ts |
| POST | `/bank-accounts/${id}/disconnect` | services/bankAccountService.ts |
| POST | `/bank-accounts/:param` | services/bankAccountService.ts |

### referrals (11 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/referrals` | services/crmService.ts |
| GET | `/referrals/${id}` | services/crmService.ts |
| POST | `/referrals` | services/crmService.ts |
| PUT | `/referrals/${id}` | services/crmService.ts |
| DELETE | `/referrals/${id}` | services/crmService.ts |
| GET | `/referrals/stats` | services/crmService.ts |
| GET | `/referrals/top` | services/crmService.ts |
| POST | `/referrals/${id}/leads` | services/crmService.ts |
| POST | `/referrals/${id}/leads/${leadId}/convert` | services/crmService.ts |
| POST | `/referrals/${id}/payments` | services/crmService.ts |
| GET | `/referrals/${id}/calculate-fee` | services/crmService.ts |

### invoice-templates (11 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/invoice-templates` | services/invoiceTemplatesService.ts |
| GET | `/invoice-templates/${id}` | services/invoiceTemplatesService.ts |
| GET | `/invoice-templates/default` | services/invoiceTemplatesService.ts |
| POST | `/invoice-templates` | services/invoiceTemplatesService.ts |
| PATCH | `/invoice-templates/${id}` | services/invoiceTemplatesService.ts |
| DELETE | `/invoice-templates/${id}` | services/invoiceTemplatesService.ts |
| POST | `/invoice-templates/${id}/duplicate` | services/invoiceTemplatesService.ts |
| POST | `/invoice-templates/${id}/set-default` | services/invoiceTemplatesService.ts |
| GET | `/invoice-templates/${id}/preview` | services/invoiceTemplatesService.ts |
| GET | `/invoice-templates/${id}/export` | services/invoiceTemplatesService.ts |
| POST | `/invoice-templates/import` | services/invoiceTemplatesService.ts |

### tags (11 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/tags/${id}` | services/tagsService.ts |
| POST | `/tags` | services/tagsService.ts |
| PUT | `/tags/${id}` | services/tagsService.ts |
| DELETE | `/tags/${id}` | services/tagsService.ts |
| GET | `/tags/popular?${params.toString()}` | services/tagsService.ts |
| POST | `/tags/${tagId}/attach` | services/tagsService.ts |
| POST | `/tags/${tagId}/detach` | services/tagsService.ts |
| GET | `/tags/entity/${entityType}` | services/tagsService.ts |
| POST | `/tags/merge` | services/tagsService.ts |
| POST | `/tags/bulk` | services/tagsService.ts |
| POST | `/tags/:param` | services/tagsService.ts |

### billing (10 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| DELETE | `/billing/rates/${id}` | services/billingRatesService.ts |
| DELETE | `/billing/groups/${id}` | services/billingRatesService.ts |
| DELETE | `/billing/time-entries/${id}` | services/billingRatesService.ts |
| POST | `/billing/subscription/change-plan` | services/billingService.ts |
| POST | `/billing/subscription/cancel` | services/billingService.ts |
| GET | `/billing/subscription/upcoming-invoice` | services/billingService.ts |
| PATCH | `/billing/payment-methods/${id}/set-default` | services/billingService.ts |
| POST | `/billing/payment-methods/setup-intent` | services/billingService.ts |
| GET | `/billing/invoices/${id}/download` | services/billingService.ts |
| POST | `/billing/invoices/${id}/pay` | services/billingService.ts |

### shift-requests (10 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/shift-requests/${requestId}` | services/shiftAssignmentService.ts |
| POST | `/shift-requests` | services/shiftAssignmentService.ts |
| PUT | `/shift-requests/${requestId}` | services/shiftAssignmentService.ts |
| DELETE | `/shift-requests/${requestId}` | services/shiftAssignmentService.ts |
| POST | `/shift-requests/${requestId}/approve` | services/shiftAssignmentService.ts |
| POST | `/shift-requests/${requestId}/reject` | services/shiftAssignmentService.ts |
| GET | `/shift-requests/pending-approvals` | services/shiftAssignmentService.ts |
| GET | `/shift-requests/stats?${params.toString()}` | services/shiftAssignmentService.ts |
| POST | `/shift-requests/check-conflicts` | services/shiftAssignmentService.ts |
| POST | `/shift-requests/:param` | services/shiftAssignmentService.ts |

### debit-notes (9 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/debit-notes` | services/accountingService.ts |
| GET | `/debit-notes/${id}` | services/accountingService.ts |
| POST | `/debit-notes` | services/accountingService.ts |
| PUT | `/debit-notes/${id}` | services/accountingService.ts |
| POST | `/debit-notes/${id}/approve` | services/accountingService.ts |
| POST | `/debit-notes/${id}/apply` | services/accountingService.ts |
| POST | `/debit-notes/${id}/cancel` | services/accountingService.ts |
| DELETE | `/debit-notes/${id}` | services/accountingService.ts |
| GET | `/debit-notes/export` | services/accountingService.ts |

### conflict-checks (9 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| POST | `/conflict-checks` | services/conflictCheckService.ts |
| GET | `/conflict-checks/${id}` | services/conflictCheckService.ts |
| GET | `/conflict-checks` | services/conflictCheckService.ts |
| PATCH | `/conflict-checks/${id}` | services/conflictCheckService.ts |
| DELETE | `/conflict-checks/${id}` | services/conflictCheckService.ts |
| POST | `/conflict-checks/${checkId}/matches/${matchIndex}/resolve` | services/conflictCheckService.ts |
| POST | `/conflict-checks/quick` | services/conflictCheckService.ts |
| GET | `/conflict-checks/stats` | services/conflictCheckService.ts |
| POST | `/conflict-checks/:param` | services/conflictCheckService.ts |

### crm-settings (9 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/crm-settings` | services/crmSettingsService.ts |
| PUT | `/crm-settings` | services/crmSettingsService.ts |
| GET | `/crm-settings/lead` | services/crmSettingsService.ts |
| PUT | `/crm-settings/lead` | services/crmSettingsService.ts |
| GET | `/crm-settings/opportunity` | services/crmSettingsService.ts |
| PUT | `/crm-settings/opportunity` | services/crmSettingsService.ts |
| GET | `/crm-settings/quote` | services/crmSettingsService.ts |
| PUT | `/crm-settings/quote` | services/crmSettingsService.ts |
| DELETE | `/crm-settings/reset` | services/crmSettingsService.ts |

### investment-search (9 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/investment-search/symbols` | services/investmentSearchService.ts |
| GET | `/investment-search/quote` | services/investmentSearchService.ts |
| POST | `/investment-search/quotes` | services/investmentSearchService.ts |
| GET | `/investment-search/markets` | services/investmentSearchService.ts |
| GET | `/investment-search/types` | services/investmentSearchService.ts |
| GET | `/investment-search/sectors` | services/investmentSearchService.ts |
| GET | `/investment-search/market/${market}` | services/investmentSearchService.ts |
| GET | `/investment-search/type/${type}` | services/investmentSearchService.ts |
| GET | `/investment-search/symbol/${symbol}` | services/investmentSearchService.ts |

### cases (8 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| DELETE | `/cases/${caseId}/notion/pages/${pageId}` | services/caseNotionService.ts |
| DELETE | `/cases/${caseId}/notion/blocks/${blockId}` | services/caseNotionService.ts |
| DELETE | `/cases/${caseId}/notion/comments/${commentId}` | services/caseNotionService.ts |
| GET | `/cases/${caseId}/notion/pages/${pageId}/export/pdf` | services/caseNotionService.ts |
| DELETE | `/cases/${caseId}/rich-documents/${docId}` | services/caseRichDocumentService.ts |
| POST | `/cases/${caseId}/workflow/cancel` | services/caseWorkflowService.ts |
| DELETE | `/cases/${caseId}/documents/${docId}` | services/casesService.ts |
| POST | `/cases/${caseId}/documents/confirm-upload` | services/storageService.ts |

### whatsapp (8 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/whatsapp/conversations` | services/crmAdvancedService.ts |
| GET | `/whatsapp/conversations/${id}` | services/crmAdvancedService.ts |
| POST | `/whatsapp/conversations/${conversationId}/close` | services/crmAdvancedService.ts |
| GET | `/whatsapp/templates` | services/crmAdvancedService.ts |
| POST | `/whatsapp/templates` | services/crmAdvancedService.ts |
| GET | `/whatsapp/templates/${id}/status` | services/crmAdvancedService.ts |
| POST | `/whatsapp/broadcasts` | services/crmAdvancedService.ts |
| GET | `/whatsapp/broadcasts` | services/crmAdvancedService.ts |

### crm-analytics (8 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/crm-analytics/dashboard` | services/crmAnalyticsService.ts |
| GET | `/crm-analytics/revenue` | services/crmAnalyticsService.ts |
| GET | `/crm-analytics/sales-funnel` | services/crmAnalyticsService.ts |
| GET | `/crm-analytics/leads` | services/crmAnalyticsService.ts |
| GET | `/crm-analytics/pipeline` | services/crmAnalyticsService.ts |
| GET | `/crm-analytics/team-performance` | services/crmAnalyticsService.ts |
| GET | `/crm-analytics/activities` | services/crmAnalyticsService.ts |
| GET | `/crm-analytics/win-loss` | services/crmAnalyticsService.ts |

### sales-teams (8 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/sales-teams` | services/crmSettingsService.ts |
| GET | `/sales-teams/${id}` | services/crmSettingsService.ts |
| POST | `/sales-teams` | services/crmSettingsService.ts |
| PUT | `/sales-teams/${id}` | services/crmSettingsService.ts |
| DELETE | `/sales-teams/${id}` | services/crmSettingsService.ts |
| POST | `/sales-teams/${id}/members` | services/crmSettingsService.ts |
| DELETE | `/sales-teams/${id}/members/${userId}` | services/crmSettingsService.ts |
| PUT | `/sales-teams/${id}/members/${userId}` | services/crmSettingsService.ts |

### territories (8 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/territories` | services/crmSettingsService.ts |
| GET | `/territories/${id}` | services/crmSettingsService.ts |
| POST | `/territories` | services/crmSettingsService.ts |
| PUT | `/territories/${id}` | services/crmSettingsService.ts |
| DELETE | `/territories/${id}` | services/crmSettingsService.ts |
| POST | `/territories/reorder` | services/crmSettingsService.ts |
| POST | `/territories/${id}/users` | services/crmSettingsService.ts |
| POST | `/territories/${id}/teams` | services/crmSettingsService.ts |

### income-tax-slabs (8 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/income-tax-slabs/${id}` | services/incomeTaxSlabsService.ts |
| POST | `/income-tax-slabs` | services/incomeTaxSlabsService.ts |
| PUT | `/income-tax-slabs/${id}` | services/incomeTaxSlabsService.ts |
| DELETE | `/income-tax-slabs/${id}` | services/incomeTaxSlabsService.ts |
| POST | `/income-tax-slabs/${slabId}/calculate` | services/incomeTaxSlabsService.ts |
| POST | `/income-tax-slabs/${id}/clone` | services/incomeTaxSlabsService.ts |
| GET | `/income-tax-slabs/countries` | services/incomeTaxSlabsService.ts |
| POST | `/income-tax-slabs/initialize-defaults` | services/incomeTaxSlabsService.ts |

### proposals (8 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| POST | `/proposals` | services/proposalService.ts |
| GET | `/proposals/job/${jobId}` | services/proposalService.ts |
| GET | `/proposals/my-proposals` | services/proposalService.ts |
| PATCH | `/proposals/accept/${proposalId}` | services/proposalService.ts |
| PATCH | `/proposals/reject/${proposalId}` | services/proposalService.ts |
| PATCH | `/proposals/withdraw/${proposalId}` | services/proposalService.ts |
| POST | `/proposals/job/:param` | services/proposalService.ts |
| GET | `/proposals/accept/:param` | services/proposalService.ts |

### subscription-plans (8 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/subscription-plans` | services/subscriptionService.ts |
| GET | `/subscription-plans/${id}` | services/subscriptionService.ts |
| POST | `/subscription-plans` | services/subscriptionService.ts |
| PATCH | `/subscription-plans/${id}` | services/subscriptionService.ts |
| DELETE | `/subscription-plans/${id}` | services/subscriptionService.ts |
| POST | `/subscription-plans/${id}/duplicate` | services/subscriptionService.ts |
| POST | `/subscription-plans/${id}/toggle-active` | services/subscriptionService.ts |
| POST | `/subscription-plans/:param` | services/subscriptionService.ts |

### trading-accounts (8 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/trading-accounts` | services/tradingAccountsService.ts |
| GET | `/trading-accounts/${id}` | services/tradingAccountsService.ts |
| POST | `/trading-accounts` | services/tradingAccountsService.ts |
| PATCH | `/trading-accounts/${id}` | services/tradingAccountsService.ts |
| DELETE | `/trading-accounts/${id}` | services/tradingAccountsService.ts |
| GET | `/trading-accounts/${id}/balance` | services/tradingAccountsService.ts |
| POST | `/trading-accounts/${id}/set-default` | services/tradingAccountsService.ts |
| POST | `/trading-accounts/${id}/transaction` | services/tradingAccountsService.ts |

### accounts (7 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/accounts` | services/accountService.ts |
| GET | `/accounts/${id}` | services/accountService.ts |
| GET | `/accounts/${id}/balance` | services/accountService.ts |
| GET | `/accounts/types` | services/accountService.ts |
| POST | `/accounts` | services/accountService.ts |
| PATCH | `/accounts/${id}` | services/accountService.ts |
| DELETE | `/accounts/${id}` | services/accountService.ts |

### bank-transactions (7 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| POST | `/bank-transactions` | services/bankTransactionService.ts |
| GET | `/bank-transactions` | services/bankTransactionService.ts |
| GET | `/bank-transactions/${id}` | services/bankTransactionService.ts |
| POST | `/bank-transactions/${transactionId}/match` | services/bankTransactionService.ts |
| POST | `/bank-transactions/${transactionId}/unmatch` | services/bankTransactionService.ts |
| POST | `/bank-transactions/import/${accountId}` | services/bankTransactionService.ts |
| POST | `/bank-transactions/:param` | services/bankTransactionService.ts |

### email-templates (7 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/email-templates` | services/crmSettingsService.ts |
| GET | `/email-templates/${id}` | services/crmSettingsService.ts |
| POST | `/email-templates` | services/crmSettingsService.ts |
| PUT | `/email-templates/${id}` | services/crmSettingsService.ts |
| DELETE | `/email-templates/${id}` | services/crmSettingsService.ts |
| POST | `/email-templates/${id}/duplicate` | services/crmSettingsService.ts |
| POST | `/email-templates/preview` | services/crmSettingsService.ts |

### exchange-rate-revaluation (7 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/exchange-rate-revaluation/${id}` | services/exchangeRateRevaluationService.ts |
| GET | `/exchange-rate-revaluation/accounts` | services/exchangeRateRevaluationService.ts |
| POST | `/exchange-rate-revaluation/preview` | services/exchangeRateRevaluationService.ts |
| POST | `/exchange-rate-revaluation/run` | services/exchangeRateRevaluationService.ts |
| POST | `/exchange-rate-revaluation/${id}/post` | services/exchangeRateRevaluationService.ts |
| POST | `/exchange-rate-revaluation/${id}/reverse` | services/exchangeRateRevaluationService.ts |
| GET | `/exchange-rate-revaluation/report?${params.toString()}` | services/exchangeRateRevaluationService.ts |

### statements (7 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/statements` | services/financeService.ts |
| GET | `/statements/${id}` | services/financeService.ts |
| POST | `/statements` | services/financeService.ts |
| PUT | `/statements/${id}` | services/financeService.ts |
| DELETE | `/statements/${id}` | services/financeService.ts |
| POST | `/statements/${id}/send` | services/financeService.ts |
| GET | `/statements/${id}/download` | services/financeService.ts |

### integrations (7 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/integrations` | services/integrationsService.ts |
| GET | `/integrations/${id}` | services/integrationsService.ts |
| GET | `/integrations/${id}/status` | services/integrationsService.ts |
| POST | `/integrations/${data.integrationId}/connect` | services/integrationsService.ts |
| POST | `/integrations/${id}/disconnect` | services/integrationsService.ts |
| PUT | `/integrations/${id}/settings` | services/integrationsService.ts |
| POST | `/integrations/${id}/test` | services/integrationsService.ts |

### vendors (6 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/vendors` | services/accountingService.ts |
| GET | `/vendors/${id}` | services/accountingService.ts |
| POST | `/vendors` | services/accountingService.ts |
| PUT | `/vendors/${id}` | services/accountingService.ts |
| DELETE | `/vendors/${id}` | services/accountingService.ts |
| GET | `/vendors/${id}/summary` | services/vendorService.ts |

### retainers (6 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/retainers` | services/accountingService.ts |
| GET | `/retainers/${id}` | services/accountingService.ts |
| POST | `/retainers` | services/accountingService.ts |
| POST | `/retainers/${id}/replenish` | services/accountingService.ts |
| POST | `/retainers/${id}/consume` | services/accountingService.ts |
| GET | `/retainers/${id}/history` | services/accountingService.ts |

### answers (6 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| POST | `/answers` | services/answerService.ts |
| GET | `/answers/${questionId}` | services/answerService.ts |
| PATCH | `/answers/${id}` | services/answerService.ts |
| DELETE | `/answers/${id}` | services/answerService.ts |
| POST | `/answers/like/${id}` | services/answerService.ts |
| PATCH | `/answers/verify/${id}` | services/answerService.ts |

### jobs (6 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/jobs` | services/jobsService.ts |
| GET | `/jobs/my-jobs` | services/jobsService.ts |
| GET | `/jobs/${id}` | services/jobsService.ts |
| POST | `/jobs` | services/jobsService.ts |
| PATCH | `/jobs/${id}` | services/jobsService.ts |
| DELETE | `/jobs/${id}` | services/jobsService.ts |

### api-keys (5 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/api-keys` | services/apiKeysService.ts |
| POST | `/api-keys` | services/apiKeysService.ts |
| DELETE | `/api-keys/${keyId}` | services/apiKeysService.ts |
| PATCH | `/api-keys/${keyId}` | services/apiKeysService.ts |
| GET | `/api-keys/stats` | services/apiKeysService.ts |

### bank-transfers (5 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| POST | `/bank-transfers` | services/bankTransferService.ts |
| GET | `/bank-transfers` | services/bankTransferService.ts |
| GET | `/bank-transfers/${id}` | services/bankTransferService.ts |
| POST | `/bank-transfers/${id}/cancel` | services/bankTransferService.ts |
| POST | `/bank-transfers/:param` | services/bankTransferService.ts |

### lost-reasons (5 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/lost-reasons` | services/crmSettingsService.ts |
| POST | `/lost-reasons` | services/crmSettingsService.ts |
| PUT | `/lost-reasons/${id}` | services/crmSettingsService.ts |
| DELETE | `/lost-reasons/${id}` | services/crmSettingsService.ts |
| POST | `/lost-reasons/reorder` | services/crmSettingsService.ts |

### crm-tags (5 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/crm-tags` | services/crmSettingsService.ts |
| POST | `/crm-tags` | services/crmSettingsService.ts |
| PUT | `/crm-tags/${id}` | services/crmSettingsService.ts |
| DELETE | `/crm-tags/${id}` | services/crmSettingsService.ts |
| POST | `/crm-tags/merge` | services/crmSettingsService.ts |

### prepared-reports (5 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/prepared-reports/${id}` | services/preparedReportsService.ts |
| POST | `/prepared-reports` | services/preparedReportsService.ts |
| POST | `/prepared-reports/${id}/refresh` | services/preparedReportsService.ts |
| DELETE | `/prepared-reports/${id}` | services/preparedReportsService.ts |
| GET | `/prepared-reports/stats` | services/preparedReportsService.ts |

### uom (5 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/uom` | services/productEnhancedService.ts |
| GET | `/uom/${uomId}` | services/productEnhancedService.ts |
| POST | `/uom` | services/productEnhancedService.ts |
| PUT | `/uom/${uomId}` | services/productEnhancedService.ts |
| DELETE | `/uom/${uomId}` | services/productEnhancedService.ts |

### brands (5 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/brands` | services/productEnhancedService.ts |
| GET | `/brands/${brandId}` | services/productEnhancedService.ts |
| POST | `/brands` | services/productEnhancedService.ts |
| PUT | `/brands/${brandId}` | services/productEnhancedService.ts |
| DELETE | `/brands/${brandId}` | services/productEnhancedService.ts |

### lawyers (4 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| POST | `/lawyers` | hooks/useStaff.ts |
| PUT | `/lawyers/${id}` | hooks/useStaff.ts |
| DELETE | `/lawyers/${id}` | hooks/useStaff.ts |
| DELETE | `/lawyers/bulk` | hooks/useStaff.ts |

### bill-payments (4 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| POST | `/bill-payments` | services/billPaymentService.ts |
| GET | `/bill-payments` | services/billPaymentService.ts |
| GET | `/bill-payments/${id}` | services/billPaymentService.ts |
| POST | `/bill-payments/${id}/cancel` | services/billPaymentService.ts |

### quotes (4 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| POST | `/quotes/${quoteId}/convert-to-invoice` | services/quoteService.ts |
| GET | `/quotes/${quoteId}/history` | services/quoteService.ts |
| PATCH | `/quotes/${quoteId}/status` | services/quoteService.ts |
| GET | `/quotes/summary` | services/quoteService.ts |

### setup-orchestration (4 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| POST | `/setup-orchestration/modules/${module}/complete` | services/setupOrchestrationService.ts |
| POST | `/setup-orchestration/modules/${module}/skip` | services/setupOrchestrationService.ts |
| POST | `/setup-orchestration/modules/${progress.module}/progress` | services/setupOrchestrationService.ts |
| POST | `/setup-orchestration/reset` | services/setupOrchestrationService.ts |

### support (4 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| PATCH | `/support/tickets/${id}/status` | services/supportService.ts |
| PATCH | `/support/tickets/${id}/assign` | services/supportService.ts |
| GET | `/support/tickets/${ticketId}/communications` | services/supportService.ts |
| POST | `/support/tickets/${ticketId}/communications` | services/supportService.ts |

### ldap (3 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| POST | `/ldap/test-connection` | services/ldapService.ts |
| POST | `/ldap/test-user-lookup` | services/ldapService.ts |
| GET | `/ldap/sync-status` | services/ldapService.ts |

### consolidated-reports (2 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/consolidated-reports/auto-eliminations?${params.toString()}` | services/consolidatedReportService.ts |
| GET | `/consolidated-reports/full-statement?${queryParams.toString()}` | services/consolidatedReportService.ts |

### employees (2 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| POST | `/employees/${employeeId}/offboarding/cancel` | services/offboardingWorkflowService.ts |
| DELETE | `/employees/${employeeId}/onboarding/cancel` | services/onboardingWorkflowService.ts |

### security-incidents (2 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| POST | `/security-incidents` | services/security-incident.service.ts |
| GET | `/security-incidents/${incidentId}` | services/security-incident.service.ts |

### conversations (1 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/conversations/single/${sellerID}/${buyerID}` | hooks/useChat.ts |

### finance (1 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/finance/overview` | hooks/useFinance.ts |

### ${entityType}s (1 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| POST | `/${entityType}s/${entityId}/counts` | hooks/useSmartButtonCounts.ts |

### admin (1 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/admin/dashboard` | hooks/useUIAccess.ts |

### activities?${params.toString()} (1 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/activities?${params.toString()}` | services/activityService.ts |

### appointments (1 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/appointments/${id}/calendar.ics` | services/appointmentsService.ts |

### automated-actions?${params.toString()} (1 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/automated-actions?${params.toString()}` | services/automatedActionService.ts |

### rate-cards (1 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| DELETE | `/rate-cards/${id}` | services/billingRatesService.ts |

### campaigns (1 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/campaigns/${campaignId}/analytics` | services/campaignService.ts |

### case-workflows (1 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| DELETE | `/case-workflows/${id}` | services/caseWorkflowsService.ts |

### compensatory-leave-requests?${params.toString()} (1 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/compensatory-leave-requests?${params.toString()}` | services/compensatoryLeaveService.ts |

### consent (1 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/consent/export/${requestId}` | services/consent.service.ts |

### competitors (1 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/competitors/stats` | services/crmSettingsService.ts |

### documents?${params.toString()} (1 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/documents?${params.toString()}` | services/documentsService.ts |

### exchange-rate-revaluation?${params.toString()} (1 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/exchange-rate-revaluation?${params.toString()}` | services/exchangeRateRevaluationService.ts |

### followups?${params.toString()} (1 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/followups?${params.toString()}` | services/followupsService.ts |

### income-tax-slabs?${params.toString()} (1 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/income-tax-slabs?${params.toString()}` | services/incomeTaxSlabsService.ts |

### leave-allocations?${params.toString()} (1 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/leave-allocations?${params.toString()}` | services/leaveAllocationService.ts |

### leave-encashments?${params.toString()} (1 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/leave-encashments?${params.toString()}` | services/leaveEncashmentService.ts |

### leave-periods?${params.toString()} (1 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/leave-periods?${params.toString()}` | services/leavePeriodService.ts |

### leave-requests?${params.toString()} (1 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/leave-requests?${params.toString()}` | services/leaveService.ts |

### messages?${params.toString()} (1 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/messages?${params.toString()}` | services/messageService.ts |

### organizations?${params.toString()} (1 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/organizations?${params.toString()}` | services/organizationsService.ts |

### payroll-runs?${params.toString()} (1 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/payroll-runs?${params.toString()}` | services/payrollRunService.ts |

### prepared-reports?${params.toString()} (1 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/prepared-reports?${params.toString()}` | services/preparedReportsService.ts |

### analytics-reports?${params.toString()} (1 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/analytics-reports?${params.toString()}` | services/reportsService.ts |

### shift-assignments?${params.toString()} (1 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/shift-assignments?${params.toString()}` | services/shiftAssignmentService.ts |

### shift-requests?${params.toString()} (1 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/shift-requests?${params.toString()}` | services/shiftAssignmentService.ts |

### storage (1 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| POST | `/storage/r2/files` | services/storageService.ts |

### tags?${params.toString()} (1 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/tags?${params.toString()}` | services/tagsService.ts |

### endpoint (1 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/endpoint` | utils/retry.ts |

### data (1 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| POST | `/data` | utils/retry.ts |

---

## 🟡 Backend Endpoints Not Used by Frontend

These endpoints exist in backend but frontend doesn't call them - potentially dead code or undocumented features.

### workflows (154 unused)

| Method | Endpoint |
|--------|----------|
| POST | `/api/workflows/leads/:id/convert-to-opportunity` |
| POST | `/api/workflows/leads/:id/convert-to-client` |
| POST | `/api/workflows/leads/:id/create-quote` |
| POST | `/api/workflows/leads/:id/assign` |
| POST | `/api/workflows/leads/:id/reassign` |
| POST | `/api/workflows/leads/bulk-assign` |
| POST | `/api/workflows/leads/:id/qualify` |
| POST | `/api/workflows/leads/:id/disqualify` |
| GET | `/api/workflows/leads/:id/qualification-score` |
| POST | `/api/workflows/leads/:id/start-nurturing` |
| POST | `/api/workflows/leads/:id/pause-nurturing` |
| POST | `/api/workflows/leads/:id/resume-nurturing` |
| GET | `/api/workflows/leads/:id/next-nurturing-step` |
| POST | `/api/workflows/leads/:id/move-stage` |
| POST | `/api/workflows/leads/:id/progress-stage` |
| POST | `/api/workflows/leads/:id/mark-won` |
| POST | `/api/workflows/leads/:id/mark-lost` |
| GET | `/api/workflows/leads/:id/workflow-history` |
| GET | `/api/workflows/leads/stats` |
| POST | `/api/workflows/quotes/from-lead/:leadId` |
| POST | `/api/workflows/quotes/from-client/:clientId` |
| POST | `/api/workflows/quotes/:id/duplicate` |
| POST | `/api/workflows/quotes/:id/revision` |
| GET | `/api/workflows/quotes/:id/version-history` |
| GET | `/api/workflows/quotes/:id/compare-versions` |
| POST | `/api/workflows/quotes/:id/submit-approval` |
| POST | `/api/workflows/quotes/:id/approve` |
| POST | `/api/workflows/quotes/:id/reject` |
| GET | `/api/workflows/quotes/:id/approval-status` |
| GET | `/api/workflows/quotes/pending-approvals` |
| ... | *124 more* |

### task (89 unused)

| Method | Endpoint |
|--------|----------|
| GET | `/api/task/templates` |
| POST | `/api/task/templates` |
| GET | `/api/task/templates/:templateId` |
| PUT | `/api/task/templates/:templateId` |
| PATCH | `/api/task/templates/:templateId` |
| DELETE | `/api/task/templates/:templateId` |
| POST | `/api/task/templates/:templateId/create` |
| GET | `/api/task/overview` |
| GET | `/api/task/timers/active` |
| GET | `/api/task/search` |
| GET | `/api/task/conflicts` |
| GET | `/api/task/client/:clientId` |
| GET | `/api/task/stats` |
| GET | `/api/task/upcoming` |
| GET | `/api/task/overdue` |
| GET | `/api/task/due-today` |
| GET | `/api/task/case/:caseId` |
| POST | `/api/task/bulk` |
| PUT | `/api/task/bulk` |
| DELETE | `/api/task/bulk` |
| POST | `/api/task/bulk/complete` |
| POST | `/api/task/bulk/assign` |
| POST | `/api/task/bulk/archive` |
| POST | `/api/task/bulk/unarchive` |
| POST | `/api/task/bulk/reopen` |
| GET | `/api/task/export` |
| GET | `/api/task/ids` |
| GET | `/api/task/archived` |
| PATCH | `/api/task/reorder` |
| GET | `/api/task/location-triggers` |
| ... | *59 more* |

### saless (75 unused)

| Method | Endpoint |
|--------|----------|
| GET | `/api/saless/orders` |
| GET | `/api/saless/orders/statistics` |
| GET | `/api/saless/orders/by-salesperson` |
| GET | `/api/saless/orders/top-customers` |
| GET | `/api/saless/orders/:id` |
| POST | `/api/saless/orders/from-quote` |
| POST | `/api/saless/orders/from-lead` |
| POST | `/api/saless/orders` |
| POST | `/api/saless/orders/:id/confirm` |
| POST | `/api/saless/orders/:id/cancel` |
| POST | `/api/saless/orders/:id/complete` |
| POST | `/api/saless/orders/:id/items` |
| PUT | `/api/saless/orders/:id/items/:itemId` |
| DELETE | `/api/saless/orders/:id/items/:itemId` |
| POST | `/api/saless/orders/:id/apply-pricing` |
| POST | `/api/saless/orders/:id/discount` |
| POST | `/api/saless/orders/:id/delivery` |
| POST | `/api/saless/orders/:id/invoice` |
| POST | `/api/saless/orders/:id/payment` |
| GET | `/api/saless/deliveries` |
| GET | `/api/saless/deliveries/pending` |
| GET | `/api/saless/deliveries/in-transit` |
| GET | `/api/saless/deliveries/statistics` |
| GET | `/api/saless/deliveries/by-carrier` |
| GET | `/api/saless/deliveries/:id` |
| GET | `/api/saless/deliveries/:id/tracking` |
| POST | `/api/saless/deliveries` |
| PUT | `/api/saless/deliveries/:id` |
| POST | `/api/saless/deliveries/:id/start-picking` |
| POST | `/api/saless/deliveries/:id/complete-picking` |
| ... | *45 more* |

### caseNotion (73 unused)

| Method | Endpoint |
|--------|----------|
| GET | `/api/caseNotion/notion/cases` |
| GET | `/api/caseNotion/cases/:caseId/notion/pages` |
| GET | `/api/caseNotion/cases/:caseId/notion/pages/:pageId` |
| POST | `/api/caseNotion/cases/:caseId/notion/pages` |
| PATCH | `/api/caseNotion/cases/:caseId/notion/pages/:pageId` |
| DELETE | `/api/caseNotion/cases/:caseId/notion/pages/:pageId` |
| POST | `/api/caseNotion/cases/:caseId/notion/pages/:pageId/archive` |
| POST | `/api/caseNotion/cases/:caseId/notion/pages/:pageId/restore` |
| POST | `/api/caseNotion/cases/:caseId/notion/pages/:pageId/duplicate` |
| POST | `/api/caseNotion/cases/:caseId/notion/pages/:pageId/favorite` |
| POST | `/api/caseNotion/cases/:caseId/notion/pages/:pageId/pin` |
| POST | `/api/caseNotion/cases/:caseId/notion/pages/merge` |
| GET | `/api/caseNotion/cases/:caseId/notion/pages/:pageId/blocks` |
| POST | `/api/caseNotion/cases/:caseId/notion/pages/:pageId/blocks` |
| PATCH | `/api/caseNotion/cases/:caseId/notion/blocks/:blockId` |
| DELETE | `/api/caseNotion/cases/:caseId/notion/blocks/:blockId` |
| POST | `/api/caseNotion/cases/:caseId/notion/blocks/:blockId/move` |
| POST | `/api/caseNotion/cases/:caseId/notion/blocks/:blockId/lock` |
| POST | `/api/caseNotion/cases/:caseId/notion/blocks/:blockId/unlock` |
| POST | `/api/caseNotion/cases/:caseId/notion/synced-blocks` |
| GET | `/api/caseNotion/cases/:caseId/notion/synced-blocks/:blockId` |
| POST | `/api/caseNotion/cases/:caseId/notion/synced-blocks/:blockId/unsync` |
| GET | `/api/caseNotion/cases/:caseId/notion/blocks/:blockId/comments` |
| POST | `/api/caseNotion/cases/:caseId/notion/blocks/:blockId/comments` |
| POST | `/api/caseNotion/cases/:caseId/notion/comments/:commentId/resolve` |
| DELETE | `/api/caseNotion/cases/:caseId/notion/comments/:commentId` |
| GET | `/api/caseNotion/cases/:caseId/notion/pages/:pageId/activity` |
| GET | `/api/caseNotion/cases/:caseId/notion/search` |
| GET | `/api/caseNotion/cases/:caseId/notion/pages/:pageId/export/pdf` |
| GET | `/api/caseNotion/cases/:caseId/notion/pages/:pageId/export/markdown` |
| ... | *43 more* |

### case (54 unused)

| Method | Endpoint |
|--------|----------|
| GET | `/api/case/overview` |
| GET | `/api/case/statistics` |
| POST | `/api/case` |
| GET | `/api/case` |
| GET | `/api/case/pipeline` |
| GET | `/api/case/pipeline/statistics` |
| GET | `/api/case/pipeline/stages/:category` |
| GET | `/api/case/pipeline/grouped` |
| GET | `/api/case/:_id/full` |
| GET | `/api/case/:_id` |
| PATCH | `/api/case/:_id` |
| DELETE | `/api/case/:_id` |
| PATCH | `/api/case/:_id/progress` |
| GET | `/api/case/:_id/notes` |
| POST | `/api/case/:_id/notes` |
| POST | `/api/case/:_id/note` |
| PUT | `/api/case/:_id/notes/:noteId` |
| PATCH | `/api/case/:_id/notes/:noteId` |
| DELETE | `/api/case/:_id/notes/:noteId` |
| POST | `/api/case/:_id/documents/upload-url` |
| POST | `/api/case/:_id/documents/confirm` |
| GET | `/api/case/:_id/documents/:docId/download` |
| DELETE | `/api/case/:_id/documents/:docId` |
| POST | `/api/case/:_id/document` |
| DELETE | `/api/case/:_id/document/:documentId` |
| POST | `/api/case/:_id/hearing` |
| PATCH | `/api/case/:_id/hearings/:hearingId` |
| DELETE | `/api/case/:_id/hearings/:hearingId` |
| PATCH | `/api/case/:_id/hearing/:hearingId` |
| DELETE | `/api/case/:_id/hearing/:hearingId` |
| ... | *24 more* |

### event (51 unused)

| Method | Endpoint |
|--------|----------|
| GET | `/api/event/stats` |
| GET | `/api/event/calendar` |
| GET | `/api/event/upcoming` |
| GET | `/api/event/month/:year/:month` |
| GET | `/api/event/date/:date` |
| POST | `/api/event/availability` |
| POST | `/api/event/import/ics` |
| GET | `/api/event/conflicts` |
| GET | `/api/event/search` |
| GET | `/api/event/client/:clientId` |
| POST | `/api/event/bulk` |
| PUT | `/api/event/bulk` |
| DELETE | `/api/event/bulk` |
| POST | `/api/event/bulk/complete` |
| POST | `/api/event/bulk/archive` |
| POST | `/api/event/bulk/unarchive` |
| GET | `/api/event/ids` |
| GET | `/api/event/archived` |
| GET | `/api/event/export` |
| PATCH | `/api/event/reorder` |
| GET | `/api/event/case/:caseId` |
| GET | `/api/event/location-triggers` |
| POST | `/api/event/location/check` |
| POST | `/api/event/parse` |
| POST | `/api/event/voice` |
| POST | `/api/event` |
| GET | `/api/event` |
| GET | `/api/event/:id` |
| GET | `/api/event/:id/export/ics` |
| PUT | `/api/event/:id` |
| ... | *21 more* |

### hrExtended (49 unused)

| Method | Endpoint |
|--------|----------|
| GET | `/api/hrExtended/leave-encashment` |
| POST | `/api/hrExtended/leave-encashment` |
| POST | `/api/hrExtended/leave-encashment/:id/approve` |
| GET | `/api/hrExtended/compensatory-leave` |
| POST | `/api/hrExtended/compensatory-leave` |
| GET | `/api/hrExtended/compensatory-leave/balance/:employeeId` |
| POST | `/api/hrExtended/compensatory-leave/:id/approve` |
| GET | `/api/hrExtended/salary-components` |
| POST | `/api/hrExtended/salary-components` |
| POST | `/api/hrExtended/salary-components/create-defaults` |
| PUT | `/api/hrExtended/salary-components/:id` |
| GET | `/api/hrExtended/promotions` |
| POST | `/api/hrExtended/promotions` |
| POST | `/api/hrExtended/promotions/:id/approve` |
| POST | `/api/hrExtended/promotions/:id/apply` |
| GET | `/api/hrExtended/transfers` |
| POST | `/api/hrExtended/transfers` |
| POST | `/api/hrExtended/transfers/:id/approve` |
| POST | `/api/hrExtended/transfers/:id/apply` |
| GET | `/api/hrExtended/staffing-plans` |
| POST | `/api/hrExtended/staffing-plans` |
| GET | `/api/hrExtended/staffing-plans/vacancy-summary` |
| GET | `/api/hrExtended/retention-bonuses` |
| POST | `/api/hrExtended/retention-bonuses` |
| POST | `/api/hrExtended/retention-bonuses/:id/vest/:milestone` |
| GET | `/api/hrExtended/incentives` |
| POST | `/api/hrExtended/incentives` |
| GET | `/api/hrExtended/incentives/stats` |
| GET | `/api/hrExtended/vehicles` |
| POST | `/api/hrExtended/vehicles` |
| ... | *19 more* |

### reminder (48 unused)

| Method | Endpoint |
|--------|----------|
| GET | `/api/reminder/location/summary` |
| GET | `/api/reminder/location/locations` |
| POST | `/api/reminder/location` |
| POST | `/api/reminder/location/check` |
| POST | `/api/reminder/location/nearby` |
| POST | `/api/reminder/location/save` |
| POST | `/api/reminder/location/distance` |
| PUT | `/api/reminder/location/locations/:locationId` |
| DELETE | `/api/reminder/location/locations/:locationId` |
| POST | `/api/reminder/location/:reminderId/reset` |
| GET | `/api/reminder/stats` |
| GET | `/api/reminder/upcoming` |
| GET | `/api/reminder/overdue` |
| GET | `/api/reminder/snoozed-due` |
| GET | `/api/reminder/delegated` |
| GET | `/api/reminder/client/:clientId` |
| GET | `/api/reminder/case/:caseId` |
| POST | `/api/reminder/from-task/:taskId` |
| POST | `/api/reminder/from-event/:eventId` |
| POST | `/api/reminder/parse` |
| POST | `/api/reminder/voice` |
| POST | `/api/reminder/bulk` |
| PUT | `/api/reminder/bulk` |
| DELETE | `/api/reminder/bulk` |
| POST | `/api/reminder/bulk/complete` |
| POST | `/api/reminder/bulk/archive` |
| POST | `/api/reminder/bulk/unarchive` |
| GET | `/api/reminder/export` |
| GET | `/api/reminder/ids` |
| GET | `/api/reminder/archived` |
| ... | *18 more* |

### integrations (45 unused)

| Method | Endpoint |
|--------|----------|
| GET | `/api/integrations/quickbooks/auth` |
| GET | `/api/integrations/quickbooks/callback` |
| POST | `/api/integrations/quickbooks/disconnect` |
| GET | `/api/integrations/quickbooks/status` |
| POST | `/api/integrations/quickbooks/refresh-token` |
| POST | `/api/integrations/quickbooks/sync/all` |
| POST | `/api/integrations/quickbooks/sync/invoices` |
| POST | `/api/integrations/quickbooks/sync/customers` |
| POST | `/api/integrations/quickbooks/sync/vendors` |
| POST | `/api/integrations/quickbooks/sync/accounts` |
| POST | `/api/integrations/quickbooks/sync/payments` |
| POST | `/api/integrations/quickbooks/sync/expenses` |
| GET | `/api/integrations/quickbooks/sync/history` |
| GET | `/api/integrations/quickbooks/mappings/fields` |
| PUT | `/api/integrations/quickbooks/mappings/fields` |
| GET | `/api/integrations/quickbooks/mappings/accounts` |
| PUT | `/api/integrations/quickbooks/mappings/accounts` |
| GET | `/api/integrations/quickbooks/conflicts` |
| POST | `/api/integrations/quickbooks/conflicts/:conflictId/resolve` |
| POST | `/api/integrations/quickbooks/conflicts/bulk-resolve` |
| GET | `/api/integrations/xero/auth` |
| GET | `/api/integrations/xero/callback` |
| POST | `/api/integrations/xero/disconnect` |
| GET | `/api/integrations/xero/status` |
| POST | `/api/integrations/xero/refresh-token` |
| POST | `/api/integrations/xero/sync/all` |
| POST | `/api/integrations/xero/sync/invoices` |
| POST | `/api/integrations/xero/sync/contacts` |
| POST | `/api/integrations/xero/sync/accounts` |
| POST | `/api/integrations/xero/sync/payments` |
| ... | *15 more* |

### firm (44 unused)

| Method | Endpoint |
|--------|----------|
| GET | `/api/firm` |
| GET | `/api/firm/roles` |
| POST | `/api/firm` |
| GET | `/api/firm/my` |
| POST | `/api/firm/switch` |
| GET | `/api/firm/my/permissions` |
| GET | `/api/firm/tree` |
| GET | `/api/firm/user/accessible` |
| GET | `/api/firm/active` |
| GET | `/api/firm/:id` |
| PUT | `/api/firm/:id` |
| PATCH | `/api/firm/:id` |
| DELETE | `/api/firm/:id` |
| GET | `/api/firm/:id/children` |
| PUT | `/api/firm/:id/move` |
| GET | `/api/firm/:id/access` |
| POST | `/api/firm/:id/access` |
| PUT | `/api/firm/:id/access/:userId` |
| DELETE | `/api/firm/:id/access/:userId` |
| PATCH | `/api/firm/:id/billing` |
| GET | `/api/firm/:id/team` |
| GET | `/api/firm/:id/members` |
| GET | `/api/firm/:id/departed` |
| POST | `/api/firm/:id/members/invite` |
| POST | `/api/firm/:id/members/:memberId/depart` |
| POST | `/api/firm/:id/members/:memberId/reinstate` |
| PUT | `/api/firm/:id/members/:memberId` |
| DELETE | `/api/firm/:id/members/:memberId` |
| POST | `/api/firm/:id/leave` |
| POST | `/api/firm/:id/transfer-ownership` |
| ... | *14 more* |

### emailMarketing (39 unused)

| Method | Endpoint |
|--------|----------|
| POST | `/api/emailMarketing/campaigns` |
| GET | `/api/emailMarketing/campaigns` |
| GET | `/api/emailMarketing/campaigns/:id` |
| PUT | `/api/emailMarketing/campaigns/:id` |
| DELETE | `/api/emailMarketing/campaigns/:id` |
| POST | `/api/emailMarketing/campaigns/:id/duplicate` |
| POST | `/api/emailMarketing/campaigns/:id/schedule` |
| POST | `/api/emailMarketing/campaigns/:id/send` |
| POST | `/api/emailMarketing/campaigns/:id/pause` |
| POST | `/api/emailMarketing/campaigns/:id/resume` |
| POST | `/api/emailMarketing/campaigns/:id/cancel` |
| POST | `/api/emailMarketing/campaigns/:id/test` |
| GET | `/api/emailMarketing/campaigns/:id/analytics` |
| POST | `/api/emailMarketing/templates` |
| GET | `/api/emailMarketing/templates` |
| GET | `/api/emailMarketing/templates/public` |
| GET | `/api/emailMarketing/templates/:id` |
| PUT | `/api/emailMarketing/templates/:id` |
| DELETE | `/api/emailMarketing/templates/:id` |
| POST | `/api/emailMarketing/templates/:id/preview` |
| POST | `/api/emailMarketing/subscribers` |
| GET | `/api/emailMarketing/subscribers` |
| PUT | `/api/emailMarketing/subscribers/:id` |
| DELETE | `/api/emailMarketing/subscribers/:id` |
| POST | `/api/emailMarketing/subscribers/import` |
| POST | `/api/emailMarketing/subscribers/export` |
| POST | `/api/emailMarketing/subscribers/:id/unsubscribe` |
| POST | `/api/emailMarketing/segments` |
| GET | `/api/emailMarketing/segments` |
| GET | `/api/emailMarketing/segments/:id` |
| ... | *9 more* |

### recruitment (39 unused)

| Method | Endpoint |
|--------|----------|
| GET | `/api/recruitment/stats` |
| GET | `/api/recruitment/talent-pool` |
| GET | `/api/recruitment/jobs/nearing-deadline` |
| GET | `/api/recruitment/jobs/stats` |
| GET | `/api/recruitment/jobs` |
| POST | `/api/recruitment/jobs` |
| GET | `/api/recruitment/jobs/:id` |
| PATCH | `/api/recruitment/jobs/:id` |
| DELETE | `/api/recruitment/jobs/:id` |
| POST | `/api/recruitment/jobs/:id/status` |
| POST | `/api/recruitment/jobs/:id/publish` |
| POST | `/api/recruitment/jobs/:id/clone` |
| GET | `/api/recruitment/jobs/:id/pipeline` |
| POST | `/api/recruitment/applicants/bulk-stage-update` |
| POST | `/api/recruitment/applicants/bulk-reject` |
| POST | `/api/recruitment/applicants/bulk-delete` |
| GET | `/api/recruitment/applicants/stats` |
| GET | `/api/recruitment/applicants` |
| POST | `/api/recruitment/applicants` |
| GET | `/api/recruitment/applicants/:id` |
| PATCH | `/api/recruitment/applicants/:id` |
| DELETE | `/api/recruitment/applicants/:id` |
| POST | `/api/recruitment/applicants/:id/stage` |
| POST | `/api/recruitment/applicants/:id/reject` |
| POST | `/api/recruitment/applicants/:id/hire` |
| PATCH | `/api/recruitment/applicants/:id/talent-pool` |
| POST | `/api/recruitment/applicants/:id/interviews` |
| PATCH | `/api/recruitment/applicants/:id/interviews/:interviewId` |
| POST | `/api/recruitment/applicants/:id/interviews/:interviewId/feedback` |
| POST | `/api/recruitment/applicants/:id/assessments` |
| ... | *9 more* |

### auditLog (33 unused)

| Method | Endpoint |
|--------|----------|
| GET | `/api/auditLog` |
| GET | `/api/auditLog/entity/:type/:id` |
| GET | `/api/auditLog/user/:id` |
| GET | `/api/auditLog/security` |
| GET | `/api/auditLog/export` |
| GET | `/api/auditLog/failed-logins` |
| GET | `/api/auditLog/suspicious` |
| POST | `/api/auditLog/check-brute-force` |
| GET | `/api/auditLog/summary` |
| GET | `/api/auditLog/security-events` |
| GET | `/api/auditLog/compliance-report` |
| GET | `/api/auditLog/archiving/stats` |
| GET | `/api/auditLog/archiving/summary` |
| POST | `/api/auditLog/archiving/run` |
| POST | `/api/auditLog/archiving/verify` |
| POST | `/api/auditLog/archiving/restore` |
| POST | `/api/auditLog/log-with-diff` |
| POST | `/api/auditLog/log-bulk-action` |
| POST | `/api/auditLog/log-security-event` |
| GET | `/api/auditLog/search` |
| GET | `/api/auditLog/by-action/:action` |
| GET | `/api/auditLog/by-date-range` |
| GET | `/api/auditLog/analytics/activity-summary` |
| GET | `/api/auditLog/analytics/top-users` |
| GET | `/api/auditLog/analytics/top-actions` |
| GET | `/api/auditLog/analytics/anomalies` |
| POST | `/api/auditLog/compliance/generate-report` |
| POST | `/api/auditLog/compliance/verify-integrity` |
| POST | `/api/auditLog/compliance/export-for-audit` |
| GET | `/api/auditLog/compliance/retention-status` |
| ... | *3 more* |

### bankReconciliation (33 unused)

| Method | Endpoint |
|--------|----------|
| GET | `/api/bankReconciliation/feeds` |
| POST | `/api/bankReconciliation/feeds` |
| PUT | `/api/bankReconciliation/feeds/:id` |
| DELETE | `/api/bankReconciliation/feeds/:id` |
| POST | `/api/bankReconciliation/import/csv` |
| POST | `/api/bankReconciliation/import/ofx` |
| GET | `/api/bankReconciliation/import/template` |
| GET | `/api/bankReconciliation/suggestions/:accountId` |
| POST | `/api/bankReconciliation/auto-match/:accountId` |
| POST | `/api/bankReconciliation/match/confirm/:id` |
| POST | `/api/bankReconciliation/match/reject/:id` |
| POST | `/api/bankReconciliation/match/split` |
| DELETE | `/api/bankReconciliation/match/:id` |
| POST | `/api/bankReconciliation/rules` |
| GET | `/api/bankReconciliation/rules` |
| PUT | `/api/bankReconciliation/rules/:id` |
| DELETE | `/api/bankReconciliation/rules/:id` |
| POST | `/api/bankReconciliation` |
| GET | `/api/bankReconciliation` |
| GET | `/api/bankReconciliation/:id` |
| POST | `/api/bankReconciliation/:id/clear` |
| POST | `/api/bankReconciliation/:id/unclear` |
| POST | `/api/bankReconciliation/:id/complete` |
| POST | `/api/bankReconciliation/:id/cancel` |
| GET | `/api/bankReconciliation/status/:accountId` |
| GET | `/api/bankReconciliation/unmatched/:accountId` |
| GET | `/api/bankReconciliation/statistics/matches` |
| GET | `/api/bankReconciliation/statistics/rules` |
| GET | `/api/bankReconciliation/currency/rates` |
| POST | `/api/bankReconciliation/currency/convert` |
| ... | *3 more* |

### fleet (33 unused)

| Method | Endpoint |
|--------|----------|
| GET | `/api/fleet/stats` |
| GET | `/api/fleet/expiring-documents` |
| GET | `/api/fleet/maintenance-due` |
| GET | `/api/fleet/driver-rankings` |
| GET | `/api/fleet/vehicles` |
| GET | `/api/fleet/vehicles/:id` |
| POST | `/api/fleet/vehicles` |
| PATCH | `/api/fleet/vehicles/:id` |
| DELETE | `/api/fleet/vehicles/:id` |
| PUT | `/api/fleet/vehicles/:id/location` |
| GET | `/api/fleet/vehicles/:id/location-history` |
| GET | `/api/fleet/fuel-logs` |
| POST | `/api/fleet/fuel-logs` |
| POST | `/api/fleet/fuel-logs/:id/verify` |
| GET | `/api/fleet/maintenance` |
| POST | `/api/fleet/maintenance` |
| PATCH | `/api/fleet/maintenance/:id` |
| GET | `/api/fleet/inspections/checklist` |
| GET | `/api/fleet/inspections` |
| POST | `/api/fleet/inspections` |
| GET | `/api/fleet/trips` |
| POST | `/api/fleet/trips` |
| POST | `/api/fleet/trips/:id/end` |
| GET | `/api/fleet/incidents` |
| GET | `/api/fleet/incidents/:id` |
| POST | `/api/fleet/incidents` |
| PATCH | `/api/fleet/incidents/:id` |
| GET | `/api/fleet/drivers` |
| GET | `/api/fleet/drivers/:id` |
| POST | `/api/fleet/drivers` |
| ... | *3 more* |

### legalContract (33 unused)

| Method | Endpoint |
|--------|----------|
| GET | `/api/legalContract/search` |
| GET | `/api/legalContract/expiring` |
| GET | `/api/legalContract/statistics` |
| GET | `/api/legalContract/client/:clientId` |
| GET | `/api/legalContract/templates` |
| POST | `/api/legalContract/templates/:templateId/use` |
| GET | `/api/legalContract` |
| POST | `/api/legalContract` |
| GET | `/api/legalContract/:contractId` |
| PATCH | `/api/legalContract/:contractId` |
| DELETE | `/api/legalContract/:contractId` |
| POST | `/api/legalContract/:contractId/parties` |
| PATCH | `/api/legalContract/:contractId/parties/:partyIndex` |
| DELETE | `/api/legalContract/:contractId/parties/:partyIndex` |
| POST | `/api/legalContract/:contractId/signatures/initiate` |
| POST | `/api/legalContract/:contractId/signatures/:partyIndex` |
| GET | `/api/legalContract/:contractId/signatures` |
| POST | `/api/legalContract/:contractId/amendments` |
| GET | `/api/legalContract/:contractId/amendments` |
| POST | `/api/legalContract/:contractId/versions` |
| GET | `/api/legalContract/:contractId/versions` |
| POST | `/api/legalContract/:contractId/versions/:versionNumber/revert` |
| POST | `/api/legalContract/:contractId/notarization` |
| GET | `/api/legalContract/:contractId/notarization/verify` |
| POST | `/api/legalContract/:contractId/breach` |
| POST | `/api/legalContract/:contractId/enforcement` |
| PATCH | `/api/legalContract/:contractId/enforcement` |
| POST | `/api/legalContract/:contractId/link-case` |
| POST | `/api/legalContract/:contractId/reminders` |
| GET | `/api/legalContract/:contractId/reminders` |
| ... | *3 more* |

### expenseClaim (32 unused)

| Method | Endpoint |
|--------|----------|
| GET | `/api/expenseClaim/stats` |
| GET | `/api/expenseClaim/pending-approvals` |
| GET | `/api/expenseClaim/pending-payments` |
| GET | `/api/expenseClaim/mileage-rates` |
| GET | `/api/expenseClaim/policies` |
| GET | `/api/expenseClaim/export` |
| POST | `/api/expenseClaim/bulk-delete` |
| GET | `/api/expenseClaim/by-employee/:employeeId` |
| GET | `/api/expenseClaim/corporate-card/:employeeId` |
| GET | `/api/expenseClaim` |
| POST | `/api/expenseClaim` |
| GET | `/api/expenseClaim/:id` |
| PATCH | `/api/expenseClaim/:id` |
| DELETE | `/api/expenseClaim/:id` |
| POST | `/api/expenseClaim/:id/submit` |
| POST | `/api/expenseClaim/:id/approve` |
| POST | `/api/expenseClaim/:id/reject` |
| POST | `/api/expenseClaim/:id/request-changes` |
| POST | `/api/expenseClaim/:id/process-payment` |
| POST | `/api/expenseClaim/:id/confirm-payment` |
| POST | `/api/expenseClaim/:id/line-items` |
| PATCH | `/api/expenseClaim/:id/line-items/:lineItemId` |
| DELETE | `/api/expenseClaim/:id/line-items/:lineItemId` |
| POST | `/api/expenseClaim/:id/receipts` |
| DELETE | `/api/expenseClaim/:id/receipts/:receiptId` |
| POST | `/api/expenseClaim/:id/receipts/:receiptId/verify` |
| POST | `/api/expenseClaim/:id/reconcile-card` |
| POST | `/api/expenseClaim/:id/check-compliance` |
| POST | `/api/expenseClaim/:id/approve-exception` |
| POST | `/api/expenseClaim/:id/mark-billable` |
| ... | *2 more* |

### permission (32 unused)

| Method | Endpoint |
|--------|----------|
| POST | `/api/permission/check` |
| POST | `/api/permission/check-batch` |
| GET | `/api/permission/my-permissions` |
| GET | `/api/permission/expand/:namespace/:resourceId/:relation` |
| GET | `/api/permission/user-resources/:userId` |
| GET | `/api/permission/config` |
| PUT | `/api/permission/config` |
| POST | `/api/permission/policies` |
| PUT | `/api/permission/policies/:policyId` |
| DELETE | `/api/permission/policies/:policyId` |
| GET | `/api/permission/relations/stats` |
| POST | `/api/permission/relations` |
| DELETE | `/api/permission/relations` |
| GET | `/api/permission/relations/:namespace/:object` |
| GET | `/api/permission/decisions` |
| GET | `/api/permission/decisions/stats` |
| GET | `/api/permission/decisions/denied` |
| GET | `/api/permission/decisions/compliance-report` |
| GET | `/api/permission/cache/stats` |
| POST | `/api/permission/cache/clear` |
| GET | `/api/permission/ui/sidebar` |
| GET | `/api/permission/ui/sidebar/all` |
| PUT | `/api/permission/ui/sidebar/:itemId/visibility` |
| POST | `/api/permission/ui/check-page` |
| GET | `/api/permission/ui/pages/all` |
| PUT | `/api/permission/ui/pages/:pageId/access` |
| GET | `/api/permission/ui/config` |
| PUT | `/api/permission/ui/config` |
| GET | `/api/permission/ui/matrix` |
| PUT | `/api/permission/ui/roles/:role/bulk` |
| ... | *2 more* |

### saudiBanking (32 unused)

| Method | Endpoint |
|--------|----------|
| GET | `/api/saudiBanking/lean/banks` |
| GET | `/api/saudiBanking/lean/customers` |
| POST | `/api/saudiBanking/lean/customers` |
| GET | `/api/saudiBanking/lean/customers/:customerId/token` |
| GET | `/api/saudiBanking/lean/customers/:customerId/entities` |
| GET | `/api/saudiBanking/lean/entities/:entityId/accounts` |
| GET | `/api/saudiBanking/lean/accounts/:accountId/balance` |
| GET | `/api/saudiBanking/lean/accounts/:accountId/transactions` |
| GET | `/api/saudiBanking/lean/entities/:entityId/identity` |
| POST | `/api/saudiBanking/lean/payments` |
| DELETE | `/api/saudiBanking/lean/entities/:entityId` |
| POST | `/api/saudiBanking/lean/webhook` |
| POST | `/api/saudiBanking/wps/generate` |
| POST | `/api/saudiBanking/wps/download` |
| POST | `/api/saudiBanking/wps/validate` |
| GET | `/api/saudiBanking/wps/files` |
| GET | `/api/saudiBanking/wps/sarie-banks` |
| GET | `/api/saudiBanking/sadad/billers` |
| GET | `/api/saudiBanking/sadad/billers/search` |
| POST | `/api/saudiBanking/sadad/bills/inquiry` |
| POST | `/api/saudiBanking/sadad/bills/pay` |
| GET | `/api/saudiBanking/sadad/payments/:transactionId/status` |
| GET | `/api/saudiBanking/sadad/payments/history` |
| POST | `/api/saudiBanking/mudad/payroll/calculate` |
| POST | `/api/saudiBanking/mudad/gosi/calculate` |
| POST | `/api/saudiBanking/mudad/wps/generate` |
| POST | `/api/saudiBanking/mudad/payroll/submit` |
| GET | `/api/saudiBanking/mudad/submissions/:submissionId/status` |
| POST | `/api/saudiBanking/mudad/gosi/report` |
| POST | `/api/saudiBanking/mudad/compliance/nitaqat` |
| ... | *2 more* |

### skillMatrix (32 unused)

| Method | Endpoint |
|--------|----------|
| GET | `/api/skillMatrix/sfia-levels` |
| GET | `/api/skillMatrix/types` |
| POST | `/api/skillMatrix/types` |
| PATCH | `/api/skillMatrix/types/:id` |
| GET | `/api/skillMatrix/competencies` |
| GET | `/api/skillMatrix/competencies/:id` |
| POST | `/api/skillMatrix/competencies` |
| PATCH | `/api/skillMatrix/competencies/:id` |
| DELETE | `/api/skillMatrix/competencies/:id` |
| GET | `/api/skillMatrix/assessments` |
| GET | `/api/skillMatrix/assessments/:id` |
| POST | `/api/skillMatrix/assessments` |
| PATCH | `/api/skillMatrix/assessments/:id` |
| POST | `/api/skillMatrix/assessments/:id/self-assessment` |
| GET | `/api/skillMatrix/expiring-certifications` |
| GET | `/api/skillMatrix/cpd-non-compliant` |
| GET | `/api/skillMatrix/needing-review` |
| GET | `/api/skillMatrix/by-category` |
| GET | `/api/skillMatrix/stats` |
| GET | `/api/skillMatrix/matrix` |
| GET | `/api/skillMatrix/gap-analysis` |
| GET | `/api/skillMatrix` |
| GET | `/api/skillMatrix/:id` |
| POST | `/api/skillMatrix` |
| PATCH | `/api/skillMatrix/:id` |
| DELETE | `/api/skillMatrix/:id` |
| POST | `/api/skillMatrix/assign` |
| DELETE | `/api/skillMatrix/assign/:employeeId/:skillId` |
| GET | `/api/skillMatrix/employee/:employeeId` |
| GET | `/api/skillMatrix/:skillId/employees` |
| ... | *2 more* |

---

## 🔴 Method Mismatches

Frontend calls with different HTTP method than backend expects.

| Path | Frontend Method | Backend Method |
|------|-----------------|----------------|
| `/conversations` | POST | GET |
| `/conversations/${conversationID}` | PATCH | GET |
| `/auth/anonymous` | DELETE | POST |
| `/assets/${id}/submit` | PATCH | POST |
| `/assets/:param` | POST | GET |
| `/assets/categories/:param` | POST | GET |
| `/attendance/${recordId}/breaks` | POST | GET |
| `/attendance/${recordId}/violations` | GET | POST |
| `/attendance/:param` | POST | GET |
| `/whatsapp/conversations/${conversationId}/assign` | POST | PUT |
| `/ldap/config` | PUT | GET |
| `/ldap/config` | DELETE | GET |
| `/reports/${id}/schedule` | POST | PUT |
| `/reports/${id}/schedule` | DELETE | PUT |
| `/auth/sessions/:param` | GET | DELETE |
| `/support/tickets/:param` | POST | GET |
| `/support/slas/:param` | POST | GET |


---

## 🟡 Interfaces Frontend Has But Backend Doesn't Define

- `CustomTypeOptions` ([object Object] fields) - @types/i18next.d.ts
- `TestProps` ([object Object] fields) - components/__tests__/error-boundary.test.tsx
- `ActivityFeedProps` ([object Object] fields) - components/activity-feed.tsx
- `ActivityItemProps` ([object Object] fields) - components/chatter/activity-scheduler.tsx
- `ActivityTimelineProps` ([object Object] fields) - components/activity-timeline.tsx
- `FilterProps` ([object Object] fields) - components/activity-timeline.tsx
- `AccessMatrixManagerProps` ([object Object] fields) - components/admin/AccessMatrixManager.tsx
- `PendingChanges` ([object Object] fields) - components/admin/AccessMatrixManager.tsx
- `UserOverrideManagerProps` ([object Object] fields) - components/admin/UserOverrideManager.tsx
- `CacheStatsProps` ([object Object] fields) - components/admin/cache-stats.tsx
- `ServiceHealthProps` ([object Object] fields) - components/admin/service-health.tsx
- `ApiKeyDisplayProps` ([object Object] fields) - components/api-key-display.tsx
- `CreatedKeyDisplayProps` ([object Object] fields) - components/api-key-display.tsx
- `ArabicNameInputProps` ([object Object] fields) - components/arabic-name-input.tsx
- `PageAccessGuardProps` ([object Object] fields) - components/auth/PageAccessGuard.tsx
- `LockScreenProps` ([object Object] fields) - components/auth/PageAccessGuard.tsx
- `SoloLawyerLockScreenProps` ([object Object] fields) - components/auth/SoloLawyerLockScreen.tsx
- `AccountLockoutWarningProps` ([object Object] fields) - components/auth/account-lockout-warning.tsx
- `CaptchaChallengeProps` ([object Object] fields) - components/auth/captcha-challenge.tsx
- `CaptchaChallengeRef` ([object Object] fields) - components/auth/captcha-challenge.tsx
- `InvisibleCaptchaProps` ([object Object] fields) - components/auth/captcha-challenge.tsx
- `CheckboxCaptchaProps` ( fields) - components/auth/captcha-challenge.tsx
- `CaptchaConfig` ([object Object] fields) - components/auth/captcha-config.ts
- `CaptchaSettings` ([object Object] fields) - components/auth/captcha-config.ts
- `GuestBannerProps` ([object Object] fields) - components/auth/guest-banner.tsx
- `LDAPLoginButtonProps` ([object Object] fields) - components/auth/ldap-login-button.tsx
- `PasswordBreachWarningProps` ([object Object] fields) - components/auth/password-breach-warning.tsx
- `PasswordChangeGuardProps` ([object Object] fields) - components/auth/password-change-guard.tsx
- `PasswordStrengthIndicatorProps` ([object Object] fields) - components/auth/password-strength-indicator.tsx
- `ProgressiveDelayProps` ([object Object] fields) - components/auth/progressive-delay.tsx
- `ReauthModalProps` ([object Object] fields) - components/auth/reauth-modal.tsx
- `SocialLoginButtonsProps` ([object Object],[object Object],[object Object],[object Object],[object Object],[object Object],[object Object],[object Object] fields) - sdk/react-ui/src/components/SocialLoginButtons.tsx
- `SSOLoginButtonsProps` ([object Object] fields) - components/auth/sso-login-buttons.tsx
- `BreadcrumbItem` ([object Object] fields) - components/breadcrumb.tsx
- `BreadcrumbProps` ([object Object] fields) - components/breadcrumb.tsx
- `ActivitySchedulerProps` ([object Object] fields) - features/activities/components/activity-scheduler.tsx
- `ActivityGroupProps` ([object Object] fields) - components/chatter/activity-scheduler.tsx
- `ScheduleActivityFormProps` ([object Object],[object Object],[object Object],[object Object] fields) - components/chatter/activity-scheduler.tsx
- `ChatterFollowersProps` ([object Object],[object Object],[object Object] fields) - components/chatter/chatter-followers.tsx
- `FollowerItemProps` ([object Object],[object Object],[object Object] fields) - components/chatter/chatter-followers.tsx
- `ChatterInputProps` ([object Object] fields) - components/chatter/chatter-input.tsx
- `MentionUser` ([object Object] fields) - components/chatter/chatter-input.tsx
- `ChatterThreadProps` ([object Object] fields) - components/chatter/chatter-thread.tsx
- `MessageItemProps` ([object Object] fields) - features/chatter/components/chatter.tsx
- `TrackingItemProps` ([object Object] fields) - features/chatter/components/chatter.tsx
- `AttachmentItemProps` ([object Object] fields) - components/chatter/chatter-thread.tsx
- `CrmSidebarProps` ([object Object] fields) - features/crm/components/crm-sidebar.tsx
- `CurrencyInputProps` ([object Object] fields) - components/currency-input.tsx
- `DateRangePickerProps` ([object Object],[object Object] fields) - components/date-range-picker.tsx
- `DealHealthFactor` ([object Object] fields) - components/deal-health-indicator.tsx
- `DealHealthIndicatorProps` ([object Object] fields) - components/deal-health-indicator.tsx
- `DynamicIslandProps` ([object Object] fields) - components/dynamic-island.tsx
- `EmailVerificationBannerProps` ([object Object] fields) - components/email-verification-banner.tsx
- `EmptyStateProps` ([object Object] fields) - components/empty-state.tsx
- `ErrorBoundaryProps` ([object Object] fields) - components/error-boundary.tsx
- `ErrorBoundaryState` ([object Object] fields) - components/error-boundary.tsx
- `ErrorFallbackProps` ([object Object] fields) - components/error-boundary.tsx
- `ValidationError` ([object Object] fields) - hooks/useApiError.tsx
- `ErrorDisplayProps` ([object Object] fields) - components/error-display/ErrorDisplay.tsx
- `ValidationErrorsProps` ([object Object] fields) - components/validation-errors.tsx
- `ErrorModalProps` ([object Object] fields) - components/error-modal.tsx
- `Props` ([object Object] fields) - features/tags/components/tags-provider.tsx
- `State` ([object Object] fields) - components/feature-error-boundary.tsx
- `SelectOption` ([object Object] fields) - components/generic-form-dialog.tsx
- `FormFieldConfig` ([object Object] fields) - components/generic-form-dialog.tsx
- `FormSectionConfig` ([object Object] fields) - components/generic-form-dialog.tsx
- `ShiftAssignmentDialogProps` ([object Object] fields) - components/hr/attendance/ShiftAssignmentDialog.tsx
- `ShiftRequestDialogProps` ([object Object] fields) - components/hr/attendance/ShiftRequestDialog.tsx
- `BulkActionBarProps` ([object Object] fields) - components/hr/common/BulkActionBar.tsx
- `BulkIncentiveDialogProps` ([object Object] fields) - components/hr/compensation/BulkIncentiveDialog.tsx
- `IncentiveRow` ([object Object] fields) - components/hr/compensation/BulkIncentiveDialog.tsx
- `EmployeeIncentiveDialogProps` ([object Object] fields) - components/hr/compensation/EmployeeIncentiveDialog.tsx
- `IncentiveFiltersProps` ([object Object] fields) - components/hr/compensation/IncentiveFilters.tsx
- `IncentiveStatsProps` ([object Object] fields) - components/hr/compensation/IncentiveStats.tsx
- `IncentivesTableProps` ([object Object] fields) - components/hr/compensation/IncentivesTable.tsx
- `RetentionBonusDialogProps` ([object Object] fields) - components/hr/compensation/RetentionBonusDialog.tsx
- `EducationDialogProps` ([object Object] fields) - components/hr/employees/EducationDialog.tsx
- `EducationSectionProps` ([object Object] fields) - components/hr/employees/EducationSection.tsx
- `WorkHistoryDialogProps` ([object Object] fields) - components/hr/employees/WorkHistoryDialog.tsx
- `WorkHistorySectionProps` ([object Object] fields) - components/hr/employees/WorkHistorySection.tsx
- `CompensatoryLeaveDialogProps` ([object Object] fields) - components/hr/leave/CompensatoryLeaveDialog.tsx
- `CompensatoryLeaveFiltersProps` ([object Object] fields) - components/hr/leave/CompensatoryLeaveFilters.tsx
- `CompensatoryLeaveStatsProps` ([object Object] fields) - components/hr/leave/CompensatoryLeaveStats.tsx
- `CompensatoryLeaveTableProps` ([object Object] fields) - components/hr/leave/CompensatoryLeaveTable.tsx
- `LeaveEncashmentDialogProps` ([object Object] fields) - components/hr/leave/LeaveEncashmentDialog.tsx
- `LeavePeriodDialogProps` ([object Object] fields) - components/hr/leave/LeavePeriodDialog.tsx
- `SalaryComponentDialogProps` ([object Object] fields) - components/hr/payroll/SalaryComponentDialog.tsx
- `StaffingPlanDetailDialogProps` ([object Object] fields) - components/hr/recruitment/StaffingPlanDetailDialog.tsx
- `StaffingPlanDialogProps` ([object Object] fields) - components/hr/recruitment/StaffingPlanDialog.tsx
- `SkillDialogProps` ([object Object] fields) - components/hr/skills/SkillDialog.tsx
- `SkillEvaluationDialogProps` ([object Object] fields) - components/hr/skills/SkillEvaluationDialog.tsx
- `ApproveTrainingDialogProps` ([object Object] fields) - components/hr/training/TrainingDialogs.tsx
- `RejectTrainingDialogProps` ([object Object] fields) - components/hr/training/TrainingDialogs.tsx
- `CompleteTrainingDialogProps` ([object Object] fields) - components/hr/training/TrainingDialogs.tsx
- `TrainingEvaluationDialogProps` ([object Object] fields) - components/hr/training/TrainingDialogs.tsx
- `VehicleDialogProps` ([object Object] fields) - components/hr/vehicles/VehicleDialog.tsx
- `VehicleLogDialogProps` ([object Object] fields) - components/hr/vehicles/VehicleLogDialog.tsx
- `KanbanStage` ([object Object] fields) - components/kanban/kanban-board.tsx
- `KanbanCard` ([object Object] fields) - components/kanban/kanban-card.tsx
- `KanbanBoardProps` ([object Object] fields) - components/kanban/kanban-board.tsx
- ... and 2771 more


---

## 🟡 Backend Models Not Exposed to Frontend

- `activityType`
- `aiInteraction`
- `analyticsEvent`
- `analyticsReport`
- `appConnection`
- `approvalChain`
- `approvalWorkflow`
- `archivedAuditLog`
- `auditLogArchive`
- `automation`
- `bankMatchRule`
- `billingActivity`
- `billingInvoice`
- `biometricLog`
- `blockComment`
- `blockConnection`
- `bom`
- `budgetTemplate`
- `caseAuditLog`
- `caseNotionBlock`
- `caseNotionDatabaseView`
- `caseNotionPage`
- `chatHistory`
- `chatterFollower`
- `commissionPlan`
- `commissionSettlement`
- `compensatoryLeave`
- `complianceAudit`
- `conflictCheck`
- `consent`
- `contactList`
- `costCenter`
- `counter`
- `crmSetup`
- `customField`
- `customFieldValue`
- `cycle`
- `dashboardSettings`
- `dashboardWidget`
- `dealRoom`
- `deliveryNote`
- `discordIntegration`
- `dispute`
- `docusignIntegration`
- `downPayment`
- `dunningHistory`
- `dunningPolicy`
- `duplicateDetectionSettings`
- `emailEvent`
- `emailOtp`
- `emailTracking`
- `emailVerification`
- `employeeLoan`
- `expenseClaim`
- `fieldHistory`
- `financeSetup`
- `firmInvitation`
- `fleet`
- `formulaField`
- `generalLedger`
- `githubIntegration`
- `gmailIntegration`
- `googleCalendarIntegration`
- `hrAnalyticsSnapshot`
- `hrSetupWizard`
- `incident`
- `incidentExecution`
- `interestArea`
- `investmentTransaction`
- `invoiceApproval`
- `jobCard`
- `keyboardShortcut`
- `kycVerification`
- `leadScoringConfig`
- `leaveType`
- `legalContract`
- `lifecycleWorkflow`
- `lockDate`
- `loginHistory`
- `loginSession`
- `macro`
- `magicLink`
- `maintenanceWindow`
- `manufacturingSettings`
- `matchingPattern`
- `migrationLog`
- `offboarding`
- `okr`
- `omnichannelConversation`
- `onboarding`
- `pageActivity`
- `pageHistory`
- `pageTemplate`
- `passwordHistory`
- `paymentReceipt`
- `payout`
- `pdfmeTemplate`
- `phoneOtp`
- `playbook`
- `plugin`
- ... and 54 more


---

## 🔴 Enum Value Mismatches

Same enum name but different values between frontend and backend.



---

## 🟡 Frontend-Only Enums

Enums defined in frontend but not in backend.

- `ISSUE_SSO_TOKENS_MISSING` - config/BACKEND_AUTH_ISSUES.ts
- `ISSUE_CSRF_COOKIE` - config/BACKEND_AUTH_ISSUES.ts
- `ISSUE_TOKEN_REFRESH` - config/BACKEND_AUTH_ISSUES.ts
- `ISSUE_LOGIN_MFA` - config/BACKEND_AUTH_ISSUES.ts
- `ISSUE_CORS` - config/BACKEND_AUTH_ISSUES.ts
- `ISSUE_OTP_TOKENS` - config/BACKEND_AUTH_ISSUES.ts
- `ISSUE_CAPTCHA` - config/BACKEND_AUTH_ISSUES.ts
- `ISSUE_RATE_LIMIT` - config/BACKEND_AUTH_ISSUES.ts
- `ISSUE_ACCOUNT_LOCKOUT` - config/BACKEND_AUTH_ISSUES.ts
- `ISSUE_SESSION_HEADERS` - config/BACKEND_AUTH_ISSUES.ts
- `API_CONFIG` - config/api.ts
- `FeatureStatus` - config/feature-flags.ts
- `TAX_CONFIG` - config/tax.ts
- `EXPORT` - config/ui-constants.ts
- `ERROR_CODES` - sdk/core/src/constants.ts
- `EmployeeNationality` - constants/saudi-banking.ts
- `NitaqatBand` - constants/saudi-banking.ts
- `GosiRegistrationStatus` - constants/saudi-banking.ts
- `WpsPaymentStatus` - constants/saudi-banking.ts
- `SadadPaymentStatus` - constants/saudi-banking.ts
- `MudadSubmissionStatus` - constants/saudi-banking.ts
- `WPS_CONSTRAINTS` - constants/saudi-banking.ts
- `REGULATORY_DATES` - constants/saudi-banking.ts
- `SARIE_BANK_IDS` - constants/saudi-banking.ts
- `SAUDI_BANKING_ERROR_CODES` - constants/saudi-banking.ts
- `KBD_COLORS` - hooks/useKeyboardShortcuts.ts
- `TOKEN_KEYS` - lib/api.ts
- `HSTS_HEADER` - lib/security-headers.ts
- `X_FRAME_OPTIONS_HEADER` - lib/security-headers.ts
- `X_CONTENT_TYPE_OPTIONS_HEADER` - lib/security-headers.ts
- `X_XSS_PROTECTION_HEADER` - lib/security-headers.ts
- `REFERRER_POLICY_HEADER` - lib/security-headers.ts
- `PERMISSIONS_POLICY_HEADER` - lib/security-headers.ts
- `AUTH_ENDPOINTS` - sdk/core/src/constants.ts
- `STORAGE_KEYS` - sdk/core/src/constants.ts
- `DEFAULT_CONFIG` - sdk/core/src/constants.ts
- `CompensationStatus` - services/compensationService.ts
- `PaymentFrequency` - services/compensationService.ts
- `SalaryBasis` - services/compensationService.ts
- `PaymentMethod` - services/retentionBonusService.ts
- `CalculationType` - services/compensationService.ts
- `AllowanceType` - services/compensationService.ts
- `BonusType` - services/retentionBonusService.ts
- `ChangeType` - services/compensationService.ts
- `ReviewStatus` - services/compensationService.ts
- `CompaRatioCategory` - services/compensationService.ts
- `CompensationModel` - services/compensationService.ts
- `PartnershipTier` - services/compensationService.ts
- `EmploymentType` - services/compensationService.ts
- `MaritalStatus` - services/compensationService.ts


---

## 🟡 Backend-Only Enums

Enums in backend models not exposed to frontend.

- `account_normalBalance`: `debit`, `credit`
- `activity_pattern`: `daily`, `weekly`, `biweekly`, `monthly`, `yearly`
- `activity_priority`: `low`, `normal`, `high`, `urgent`
- `activity_category`: `call`, `meeting`, `email`, `task`, `deadline`...
- `activity_direction`: `sent`, `received`
- `activity_state`: `scheduled`, `done`, `cancelled`
- `activity_status`: `pending`, `accepted`, `declined`, `tentative`
- `activity_meetingProvider`: `zoom`, `teams`, `google_meet`, `webex`, `other`
- `activity_outcome`: `completed`, `no_answer`, `left_voicemail`, `busy`, `wrong_number`...
- `activity_sentiment`: `positive`, `neutral`, `negative`
- `activity_convertedToType`: `opportunity`, `client`, `case`, `order`
- `activity_callType`: `inbound`, `outbound`, `missed`, `scheduled`
- `activityPlan_type`: `call`, `email`, `meeting`, `task`, `whatsapp`...
- `activityPlan_taskDetails`: `low`, `normal`, `high`, `urgent`
- `activityPlan_entityType`: `lead`, `contact`, `client`
- `activityPlan_planType`: `nurture`, `onboarding`, `follow_up`, `win_back`, `custom`
- `activityPlan_status`: `draft`, `active`, `paused`, `archived`
- `activityPlanExecution_status`: `active`, `paused`, `completed`, `cancelled`, `failed`
- `activityPlanExecution_entityType`: `lead`, `client`, `contact`
- `activityType_decoration_type`: `warning`, `danger`, `success`, `info`
- `activityType_delay_unit`: `days`, `weeks`, `months`
- `activityType_delay_from`: `current_date`, `previous_activity`
- `activityType_category`: `default`, `upload_file`, `phonecall`, `meeting`, `email`...
- `activityType_chaining_type`: `suggest`, `trigger`
- `aiInteraction_provider`: `anthropic`, `openai`
- `aiInteraction_safetyChecks`: `prompt_injection`, `pii_detected`, `harmful_content`, `jailbreak_attempt`, `excessive_length`
- `aiInteraction_severity`: `low`, `medium`, `high`, `critical`
- `aiInteraction_type`: `pii_leakage`, `harmful_content`, `hallucination`, `low_confidence`, `legal_disclaimer_missing`
- `aiInteraction_contextType`: `legal`, `case_management`, `scheduling`, `general`, `null`
- `aiInteraction_status`: `success`, `blocked`, `filtered`, `rate_limited`, `error`
- `analyticsEvent_eventType`: `page_view`, `feature_used`, `action_completed`, `error`, `api_call`...
- `analyticsReport_format`: `pdf`, `excel`, `csv`, `html`
- `analyticsReport_aggregation`: `sum`, `avg`, `min`, `max`, `count`...
- `analyticsReport_type`: `previous_period`, `same_period_last_year`, `custom`
- `analyticsReport_xAxis`: `category`, `time`, `value`
- `analyticsReport_yAxis`: `number`, `currency`, `percentage`
- `analyticsReport_position`: `top`, `bottom`, `left`, `right`
- `analyticsReport_trend`: `up`, `down`, `stable`
- `analyticsReport_comparisonPeriod`: `previous_period`, `same_period_last_year`, `custom`
- `analyticsReport_size`: `small`, `medium`, `large`
- `analyticsReport_operator`: `equals`, `not_equals`, `contains`, `not_contains`, `starts_with`...
- `analyticsReport_frequency`: `daily`, `weekly`, `biweekly`, `monthly`, `quarterly`...
- `analyticsReport_lastRunStatus`: `success`, `failed`, `partial`
- `analyticsReport_paperSize`: `A4`, `A3`, `Letter`, `Legal`
- `analyticsReport_orientation`: `portrait`, `landscape`
- `analyticsReport_category`: `sales_performance`, `revenue`, `conversions`, `forecasting`, `pipeline_value`...
- `analyticsReport_revenueConfig`: `daily`, `weekly`, `monthly`, `quarterly`, `yearly`
- `analyticsReport_section`: `hr`, `finance`, `tasks`, `crm`, `sales`...
- `analyticsReport_reportType`: `standard`, `custom`, `template`, `dashboard`, `ad_hoc`
- `analyticsReport_dataSource`: `collection`, `aggregation`, `api`, `custom`


---

## 🟡 Type Aliases Frontend Uses

- `NavItemCommandProps` (object) - components/command-menu.tsx
- `SubItemCommandProps` (object) - components/command-menu.tsx
- `DatePreset` (union) - components/date-range-picker.tsx
- `SelectDropdownProps` (union) - components/select-dropdown.tsx
- `StatStatus` (union) - components/stat-card.tsx
- `SidebarContextProps` (union) - components/ui/sidebar.tsx
- `PlanId` (union) - config/plans.ts
- `FeatureId` (union) - config/plans.ts
- `OfficeType` (union) - constants/crm-constants.ts
- `ProspectLevel` (union) - constants/crm-constants.ts
- `ValidationState` (union) - constants/crm-constants.ts
- `ErrorCode` (union) - constants/errorCodes.ts
- `NajizIdentityType` (alias) - constants/najiz-constants.ts
- `RouteParams` (object) - constants/routes.ts
- `RouteFunction` (function) - constants/routes.ts
- `StaticRoute` (union) - constants/routes.ts
- `DayKey` (function) - features/appointments/components/manage-availability-dialog.tsx
- `AppType` (union) - features/apps/index.tsx
- `VerifyStatus` (union) - features/auth/magic-link/verify.tsx
- `AvailabilityStatus` (union) - features/auth/sign-up/components/sign-up-form.tsx
- `CanvasTool` (union) - features/case-notion/components/whiteboard/whiteboard-canvas.tsx
- `CreateCaseFormData` (union) - features/cases/components/create-case-view.tsx
- `ClientType` (union) - features/clients/components/create-client-view.tsx
- `FirmSize` (union) - features/crm/components/create-activity-view.tsx
- `FirmSize` (union) - features/crm/components/create-lead-view.tsx
- `FirmSize` (union) - features/crm/components/create-referral-view.tsx
- `QuotaStatus` (union) - features/crm/components/quota-progress-widget.tsx
- `FirmSize` (union) - features/crm/views/campaign-form-view.tsx
- `DateRangeOption` (union) - features/crm/views/crm-dashboard-view.tsx
- `ComplianceStatus` (union) - features/finance/components/compliance-dashboard-view.tsx
- `FirmSize` (union) - features/finance/components/create-invoice-view.tsx
- `PaymentType` (union) - features/finance/components/create-payment-view.tsx
- `ReportType` (union) - features/finance/components/full-reports-view.tsx
- `InvoiceStatus` (union) - features/finance/types/approval-types.ts
- `TimeEntryLockReason` (union) - features/finance/types/time-entry-lock-types.ts
- `OfficeType` (union) - features/hr/components/loans-create-view.tsx
- `FilterType` (union) - features/ml-scoring/components/priority-queue.tsx
- `UrgencyLevel` (union) - features/ml-scoring/components/score-explanation.tsx
- `SubscriptionFormData` (alias) - features/subscriptions/components/subscription-create-view.tsx
- `SubscriptionPlanFormData` (union) - features/subscriptions/components/subscription-plan-form-view.tsx
- `BillingPeriod` (union) - features/subscriptions/types/subscription-types.ts
- `SubscriptionStatus` (union) - features/subscriptions/types/subscription-types.ts
- `SubscriptionPlanType` (union) - features/subscriptions/types/subscription-types.ts
- `ProrationBehavior` (union) - features/subscriptions/types/subscription-types.ts
- `SubscriptionCurrency` (union) - features/subscriptions/types/subscription-types.ts
- `SubscriptionAction` (union) - features/subscriptions/types/subscription-types.ts
- `ViewMode` (union) - features/tasks/components/tasks-timeline-view.tsx
- `UserForm` (intersection) - features/users/components/users-action-dialog.tsx
- `CircuitState` (union) - lib/circuit-breaker.ts
- `LogLevel` (union) - lib/document-debug-logger.ts


---

## Action Items

### 🔴 Critical (Will Break App)
1. Add 2563 missing backend endpoints
2. Fix 17 HTTP method mismatches
3. Sync 0 enum value differences

### 🟡 Important (May Cause Issues)
1. Review 2871 frontend-only interfaces
2. Document 3672 unused backend endpoints

### 📝 Housekeeping
1. Remove dead code or add tests for unused endpoints
2. Create shared types package for consistency

