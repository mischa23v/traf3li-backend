# Frontend vs Backend Contract Mismatch Report

> Generated: 2026-01-09T12:16:27.349Z

## Summary

| Category | Frontend Only | Backend Only | Mismatches |
|----------|--------------|--------------|------------|
| API Endpoints | 424 | 2402 | 159 |
| Interfaces/Entities | 2871 | 154 | 0 |
| Enums | 88 | 2138 | 0 |
| Type Aliases | 167 | 0 | - |

---

## 🔴 Critical: API Endpoints Frontend Expects But Backend Doesn't Have

These endpoints are called by frontend but don't exist in backend - **will cause 404 errors**.

### hr (42 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| POST | `/hr/asset-assignments/${assignmentId}/incidents/${incidentId}/resolve` | services/assetAssignmentService.ts |
| GET | `/hr/skill-maps/matrix${params}` | services/employeeSkillMapService.ts |
| GET | `/hr/skill-maps/find-by-skill/${skillId}${params}` | services/employeeSkillMapService.ts |
| GET | `/hr/skill-maps/matrix/export${params}` | services/employeeSkillMapService.ts |
| GET | `/hr/skill-maps/skill-gaps/export${params}` | services/employeeSkillMapService.ts |
| PUT | `/hr/settings/company` | services/hrSetupWizardService.ts |
| POST | `/hr/settings/company/logo` | services/hrSetupWizardService.ts |
| PUT | `/hr/settings/gosi` | services/hrSetupWizardService.ts |
| PUT | `/hr/settings/wps` | services/hrSetupWizardService.ts |
| POST | `/hr/email-templates/bulk` | services/hrSetupWizardService.ts |
| GET | `/hr/email-templates` | services/hrSetupWizardService.ts |
| POST | `/hr/setup/complete` | services/hrSetupWizardService.ts |
| POST | `/hr/organizational-structure/merge` | services/organizationalStructureService.ts |
| GET | `/hr/retention-bonuses/export?:param` | services/retentionBonusService.ts |
| POST | `/hr/salary-components/validate-formula` | services/salaryComponentService.ts |
| GET | `/hr/salary-components/${id}/usage` | services/salaryComponentService.ts |
| GET | `/hr/salary-components/stats` | services/salaryComponentService.ts |
| POST | `/hr/shift-types/${shiftTypeId}/clone` | services/shiftTypeService.ts |
| POST | `/hr/shift-types/${shiftTypeId}/calculate-hours` | services/shiftTypeService.ts |
| GET | `/hr/shift-types/by-day/${day}` | services/shiftTypeService.ts |
| GET | `/hr/shift-types/active` | services/shiftTypeService.ts |
| GET | `/hr/shift-types/ramadan` | services/shiftTypeService.ts |
| POST | `/hr/shift-types/validate-times` | services/shiftTypeService.ts |
| GET | `/hr/skills/by-category/${category}` | services/skillService.ts |
| POST | `/hr/skills/bulk-delete` | services/skillService.ts |
| GET | `/hr/skills/export?${params.toString()}` | services/skillService.ts |
| POST | `/hr/staffing-plans/${planId}/close` | services/staffingPlanService.ts |
| GET | `/hr/staffing-plans/active` | services/staffingPlanService.ts |
| GET | `/hr/staffing-plans/department/${departmentId}` | services/staffingPlanService.ts |
| POST | `/hr/staffing-plans/${planId}/bulk-update-details` | services/staffingPlanService.ts |
| POST | `/hr/staffing-plans/${planId}/bulk-create-job-openings` | services/staffingPlanService.ts |
| GET | `/hr/staffing-plans/vacancies-report` | services/staffingPlanService.ts |
| GET | `/hr/staffing-plans/:param/bulk-update-details` | services/staffingPlanService.ts |
| GET | `/hr/vehicle-logs?${params.toString()}` | services/vehicleService.ts |
| POST | `/hr/vehicle-logs` | services/vehicleService.ts |
| GET | `/hr/vehicles/service-due` | services/vehicleService.ts |
| GET | `/hr/vehicles/${vehicleId}/utilization?${params.toString()}` | services/vehicleService.ts |
| GET | `/hr/vehicles/fleet-summary` | services/vehicleService.ts |
| PATCH | `/hr/vehicle-logs/${logId}/reimbursement` | services/vehicleService.ts |
| POST | `/hr/vehicles/bulk-delete` | services/vehicleService.ts |
| GET | `/hr/vehicle-logs/export?${params.toString()}` | services/vehicleService.ts |
| GET | `/hr/vehicle-logs/:param/reimbursement` | services/vehicleService.ts |

### workflows (15 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/workflows/presets` | services/workflowService.ts |
| POST | `/workflows/presets/${presetType}` | services/workflowService.ts |
| GET | `/workflows/stats` | services/workflowService.ts |
| GET | `/workflows/category/${category}` | services/workflowService.ts |
| GET | `/workflows` | services/workflowService.ts |
| POST | `/workflows` | services/workflowService.ts |
| POST | `/workflows/${id}/stages` | services/workflowService.ts |
| PATCH | `/workflows/${id}/stages/${stageId}` | services/workflowService.ts |
| DELETE | `/workflows/${id}/stages/${stageId}` | services/workflowService.ts |
| POST | `/workflows/${id}/stages/reorder` | services/workflowService.ts |
| POST | `/workflows/${id}/transitions` | services/workflowService.ts |
| POST | `/workflows/cases/${caseId}/initialize` | services/workflowService.ts |
| GET | `/workflows/cases/${caseId}/progress` | services/workflowService.ts |
| POST | `/workflows/cases/${caseId}/move` | services/workflowService.ts |
| POST | `/workflows/cases/${caseId}/requirements/${requirementId}/complete` | services/workflowService.ts |

### crm-reports (14 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/crm-reports/performance/rep-scorecard` | hooks/use-crm-reports.ts |
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

### reminders (13 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/reminders/today` | services/remindersService.ts |
| GET | `/reminders/snoozed` | services/remindersService.ts |
| GET | `/reminders/my-reminders` | services/remindersService.ts |
| GET | `/reminders/${id}/recurring/history` | services/remindersService.ts |
| PATCH | `/reminders/${id}/notification` | services/remindersService.ts |
| POST | `/reminders/${id}/notification/test` | services/remindersService.ts |
| POST | `/reminders/${id}/acknowledge` | services/remindersService.ts |
| POST | `/reminders/bulk/snooze` | services/remindersService.ts |
| POST | `/reminders/bulk/dismiss` | services/remindersService.ts |
| POST | `/reminders/import` | services/remindersService.ts |
| GET | `/reminders/templates` | services/remindersService.ts |
| POST | `/reminders/templates/${templateId}/create` | services/remindersService.ts |
| POST | `/reminders/${id}/save-as-template` | services/remindersService.ts |

### payroll (11 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/payroll/${id}` | services/payrollService.ts |
| POST | `/payroll` | services/payrollService.ts |
| PUT | `/payroll/${id}` | services/payrollService.ts |
| DELETE | `/payroll/${id}` | services/payrollService.ts |
| POST | `/payroll/${id}/approve` | services/payrollService.ts |
| POST | `/payroll/${id}/pay` | services/payrollService.ts |
| GET | `/payroll/stats?${params.toString()}` | services/payrollService.ts |
| POST | `/payroll/generate` | services/payrollService.ts |
| POST | `/payroll/approve` | services/payrollService.ts |
| POST | `/payroll/pay` | services/payrollService.ts |
| POST | `/payroll/wps/submit` | services/payrollService.ts |

### email-marketing (10 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| POST | `/email-marketing/templates/${id}/duplicate` | services/crmAdvancedService.ts |
| POST | `/email-marketing/campaigns/${id}/ab-test` | services/crmAdvancedService.ts |
| GET | `/email-marketing/campaigns/${id}/ab-test/results` | services/crmAdvancedService.ts |
| POST | `/email-marketing/campaigns/${id}/ab-test/pick-winner` | services/crmAdvancedService.ts |
| POST | `/email-marketing/drip-campaigns/${id}/activate` | services/crmAdvancedService.ts |
| POST | `/email-marketing/drip-campaigns/${id}/enroll` | services/crmAdvancedService.ts |
| POST | `/email-marketing/drip-campaigns/${id}/remove` | services/crmAdvancedService.ts |
| POST | `/email-marketing/subscribers/${id}/tags` | services/crmAdvancedService.ts |
| DELETE | `/email-marketing/subscribers/${id}/tags` | services/crmAdvancedService.ts |
| GET | `/email-marketing/segments/${id}/preview` | services/crmAdvancedService.ts |

### permissions (10 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| PATCH | `/permissions/policies/${policyId}/toggle` | services/permissionService.ts |
| DELETE | `/permissions/relations/${relationId}` | services/permissionService.ts |
| POST | `/permissions/relations/bulk` | services/permissionService.ts |
| DELETE | `/permissions/relations/bulk` | services/permissionService.ts |
| POST | `/permissions/relations/check` | services/permissionService.ts |
| GET | `/permissions/decisions/${decisionId}` | services/permissionService.ts |
| GET | `/permissions/resources/${resourceType}/${resourceId}/access` | services/permissionService.ts |
| POST | `/permissions/resources/${resourceType}/${resourceId}/access` | services/permissionService.ts |
| DELETE | `/permissions/resources/${resourceType}/${resourceId}/access/${userId}` | services/permissionService.ts |
| GET | `/permissions/users/${userId}/resources` | services/permissionService.ts |

### saudi-banking (9 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/saudi-banking/lean/customers/${customerId}` | hooks/useSaudiBanking.ts |
| DELETE | `/saudi-banking/lean/customers/${customerId}/entities/${entityId}` | hooks/useSaudiBanking.ts |
| GET | `/saudi-banking/wps/files/${fileId}` | hooks/useSaudiBanking.ts |
| GET | `/saudi-banking/sadad/payments/${paymentId}` | hooks/useSaudiBanking.ts |
| GET | `/saudi-banking/mudad/payrolls` | hooks/useSaudiBanking.ts |
| GET | `/saudi-banking/mudad/compliance` | hooks/useSaudiBanking.ts |
| GET | `/saudi-banking/compliance/status` | hooks/useSaudiBanking.ts |
| GET | `/saudi-banking/compliance/deadlines/upcoming` | hooks/useSaudiBanking.ts |
| GET | `/saudi-banking/mudad/submissions` | hooks/useSaudiBanking.ts |

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

### ldap (9 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/ldap/config` | services/ldapService.ts |
| POST | `/ldap/config` | services/ldapService.ts |
| PUT | `/ldap/config` | services/ldapService.ts |
| POST | `/ldap/test-connection` | services/ldapService.ts |
| POST | `/ldap/test-user-lookup` | services/ldapService.ts |
| POST | `/ldap/sync` | services/ldapService.ts |
| GET | `/ldap/sync-status` | services/ldapService.ts |
| DELETE | `/ldap/config` | services/ldapService.ts |
| POST | `/ldap/login` | services/ldapService.ts |

### invoices (8 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| POST | `/invoices/${invoiceId}/post-to-gl` | services/accountingService.ts |
| GET | `/invoices/pending-approval` | services/financeService.ts |
| POST | `/invoices/${invoiceId}/request-changes` | services/financeService.ts |
| POST | `/invoices/${invoiceId}/escalate` | services/financeService.ts |
| POST | `/invoices/bulk-approve` | services/financeService.ts |
| GET | `/invoices/approval-config` | services/financeService.ts |
| PUT | `/invoices/approval-config` | services/financeService.ts |
| GET | `/invoices/pending-approvals-count` | services/financeService.ts |

### billing (8 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| DELETE | `/billing/time-entries/${id}` | services/billingRatesService.ts |
| POST | `/billing/subscription/change-plan` | services/billingService.ts |
| POST | `/billing/subscription/cancel` | services/billingService.ts |
| GET | `/billing/subscription/upcoming-invoice` | services/billingService.ts |
| PATCH | `/billing/payment-methods/${id}/set-default` | services/billingService.ts |
| POST | `/billing/payment-methods/setup-intent` | services/billingService.ts |
| GET | `/billing/invoices/${id}/download` | services/billingService.ts |
| POST | `/billing/invoices/${id}/pay` | services/billingService.ts |

### chatter (8 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/chatter/followers/${resModel}/${resId}/me` | services/chatterService.ts |
| POST | `/chatter/followers/${resModel}/${resId}/toggle` | services/chatterService.ts |
| GET | `/chatter/activity-types` | services/chatterService.ts |
| POST | `/chatter/activities/${activityId}/done` | services/chatterService.ts |
| POST | `/chatter/attachments` | services/chatterService.ts |
| POST | `/chatter/attachments/bulk` | services/chatterService.ts |
| GET | `/chatter/attachments/${resModel}/${resId}` | services/chatterService.ts |
| DELETE | `/chatter/attachments/${attachmentId}` | services/chatterService.ts |

### reports (8 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| DELETE | `/reports/consolidated/elimination-rules/${id}` | services/consolidatedReportService.ts |
| POST | `/reports/consolidated/export` | services/consolidatedReportService.ts |
| GET | `/reports/accounts-aging` | services/financeService.ts |
| GET | `/reports/revenue-by-client` | services/financeService.ts |
| GET | `/reports/outstanding-invoices` | services/financeService.ts |
| GET | `/reports/time-entries` | services/financeService.ts |
| GET | `/reports/${reportType}/export` | services/financeService.ts |
| GET | `/reports/templates` | services/reportsService.ts |

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

### journal-entries (8 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| POST | `/journal-entries/${id}/attachments` | services/journalEntryService.ts |
| DELETE | `/journal-entries/${id}/attachments/${attachmentId}` | services/journalEntryService.ts |
| GET | `/journal-entries/stats` | services/journalEntryService.ts |
| POST | `/journal-entries/validate` | services/journalEntryService.ts |
| GET | `/journal-entries/recent` | services/journalEntryService.ts |
| POST | `/journal-entries/${id}/duplicate` | services/journalEntryService.ts |
| GET | `/journal-entries/templates` | services/journalEntryService.ts |
| POST | `/journal-entries/from-template/${templateId}` | services/journalEntryService.ts |

### legal-documents (8 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/legal-documents` | services/legalDocumentService.ts |
| POST | `/legal-documents` | services/legalDocumentService.ts |
| POST | `/legal-documents/${id}/upload` | services/legalDocumentService.ts |
| GET | `/legal-documents/search` | services/legalDocumentService.ts |
| GET | `/legal-documents/category/${category}` | services/legalDocumentService.ts |
| GET | `/legal-documents/categories` | services/legalDocumentService.ts |
| POST | `/legal-documents/${id}/duplicate` | services/legalDocumentService.ts |
| GET | `/legal-documents/${id}/export` | services/legalDocumentService.ts |

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

### settings (7 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| POST | `/settings/email/smtp/test-connection` | services/emailSettingsService.ts |
| POST | `/settings/email/smtp/send-test` | services/emailSettingsService.ts |
| PATCH | `/settings/email/templates/${id}/toggle` | services/emailSettingsService.ts |
| PATCH | `/settings/payment-terms/${id}/default` | services/paymentTermsService.ts |
| POST | `/settings/payment-terms/initialize` | services/paymentTermsService.ts |
| POST | `/settings/sso/providers` | services/ssoService.ts |
| POST | `/settings/sso/test-connection` | services/ssoService.ts |

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

### price-levels (7 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/price-levels/default` | services/priceLevelService.ts |
| POST | `/price-levels/${id}/calculate` | services/priceLevelService.ts |
| POST | `/price-levels/${id}/assign` | services/priceLevelService.ts |
| GET | `/price-levels/${id}/clients` | services/priceLevelService.ts |
| POST | `/price-levels/${id}/duplicate` | services/priceLevelService.ts |
| POST | `/price-levels/${id}/archive` | services/priceLevelService.ts |
| POST | `/price-levels/${id}/restore` | services/priceLevelService.ts |

### contacts (6 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/contacts/${contactId}/cases` | services/contactService.ts |
| GET | `/contacts/${contactId}/activities` | services/contactService.ts |
| POST | `/contacts/${contactId}/conflict-check` | services/contactService.ts |
| POST | `/contacts/${contactId}/conflict-status` | services/contactService.ts |
| POST | `/contacts/${primaryId}/merge` | services/contactService.ts |
| GET | `/contacts/${contactId}/stakeholder/${leadId}` | services/contactService.ts |

### crm (6 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/crm/reports/transactions` | services/crmReportsService.ts |
| GET | `/crm/reports/transactions/summary` | services/crmReportsService.ts |
| GET | `/crm/reports/transactions/export` | services/crmReportsService.ts |
| GET | `/crm/reports/${reportType}/export` | services/crmReportsService.ts |
| POST | `/crm/reports/schedule` | services/crmReportsService.ts |
| GET | `/crm/reports/${reportType}/metadata` | services/crmReportsService.ts |

### messages (6 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| POST | `/messages/note` | services/messageService.ts |
| GET | `/messages/thread/${resModel}/${resId}` | services/messageService.ts |
| GET | `/messages/mentions?${params.toString()}` | services/messageService.ts |
| GET | `/messages/starred?${params.toString()}` | services/messageService.ts |
| GET | `/messages/search?${params.toString()}` | services/messageService.ts |
| POST | `/messages/${id}/star` | services/messageService.ts |

### api (6 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/api/settings/sales` | services/salesSettingsService.ts |
| GET | `/api/settings/sales/reset/${section}` | services/salesSettingsService.ts |
| GET | `/api/settings/sales/history?limit=${limit}` | services/salesSettingsService.ts |
| GET | `/api/settings/sales/export` | services/salesSettingsService.ts |
| GET | `/api/settings/sales/import` | services/salesSettingsService.ts |
| GET | `/api/settings/sales/validate` | services/salesSettingsService.ts |

### tasks (6 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/tasks/my-tasks` | services/tasksService.ts |
| POST | `/tasks/import` | services/tasksService.ts |
| POST | `/tasks/${taskId}/recurring/skip` | services/tasksService.ts |
| POST | `/tasks/${taskId}/recurring/stop` | services/tasksService.ts |
| GET | `/tasks/${taskId}/recurring/history` | services/tasksService.ts |
| DELETE | `/tasks/${taskId}/voice-memos/${memoId}` | services/tasksService.ts |

### api-keys (5 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/api-keys` | services/apiKeysService.ts |
| POST | `/api-keys` | services/apiKeysService.ts |
| DELETE | `/api-keys/${keyId}` | services/apiKeysService.ts |
| PATCH | `/api-keys/${keyId}` | services/apiKeysService.ts |
| GET | `/api-keys/stats` | services/apiKeysService.ts |

### cases (5 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| DELETE | `/cases/${caseId}/notion/pages/${pageId}` | services/caseNotionService.ts |
| DELETE | `/cases/${caseId}/notion/blocks/${blockId}` | services/caseNotionService.ts |
| DELETE | `/cases/${caseId}/notion/comments/${commentId}` | services/caseNotionService.ts |
| GET | `/cases/${caseId}/notion/pages/${pageId}/export/pdf` | services/caseNotionService.ts |
| POST | `/cases/${caseId}/documents/confirm-upload` | services/storageService.ts |

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

### documents (5 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| POST | `/documents/${documentId}/versions/cleanup` | services/documentVersionService.ts |
| GET | `/documents/${documentId}/versions/compare?v1=${versionId1}&v2=${versionId2}` | services/documentVersionService.ts |
| GET | `/documents/${documentId}/versions/statistics` | services/documentVersionService.ts |
| GET | `/documents/${documentId}/versions/diff?v1=${versionId1}&v2=${versionId2}` | services/documentVersionService.ts |
| GET | `/documents/${documentId}/versions/${versionId}/content` | services/documentVersionService.ts |

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

### clients (4 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/clients/${clientId}/quotes` | services/clientService.ts |
| GET | `/clients/${clientId}/activities` | services/clientService.ts |
| POST | `/clients/${clientId}/credit-status` | services/clientService.ts |
| GET | `/clients/regions` | services/clientsService.ts |

### credit-notes (4 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| POST | `/credit-notes/${id}/zatca/submit` | services/financeService.ts |
| GET | `/credit-notes/${id}/zatca/status` | services/financeService.ts |
| GET | `/credit-notes/${id}/pdf` | services/financeService.ts |
| GET | `/credit-notes/${id}/xml` | services/financeService.ts |

### products (4 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| POST | `/products/${productId}/duplicate` | services/productService.ts |
| POST | `/products/${productId}/toggle-active` | services/productService.ts |
| GET | `/products/categories` | services/productService.ts |
| GET | `/products/${productId}/stats` | services/productService.ts |

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

### time-tracking (3 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/time-tracking/entries/pending` | services/financeService.approval-methods.ts |
| GET | `/time-tracking/entries/${id}/lock-status` | services/financeService.ts |
| POST | `/time-tracking/entries/lock-by-date-range` | services/financeService.ts |

### payments (3 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| POST | `/payments/${id}/generate-receipt` | services/financeService.ts |
| GET | `/payments/${id}/receipt/download` | services/financeService.ts |
| POST | `/payments/${id}/receipt/send` | services/financeService.ts |

### leads (2 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| PATCH | `/leads/${id}/stage` | services/accountingService.ts |
| POST | `/leads/${id}/activity` | services/accountingService.ts |

### consolidated-reports (2 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/consolidated-reports/auto-eliminations?${params.toString()}` | services/consolidatedReportService.ts |
| GET | `/consolidated-reports/full-statement?${queryParams.toString()}` | services/consolidatedReportService.ts |

### lead-scoring (2 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/lead-scoring/config` | services/crmAdvancedService.ts |
| PUT | `/lead-scoring/config` | services/crmAdvancedService.ts |

### bank-reconciliation (2 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| POST | `/bank-reconciliation/feeds/${id}/fetch` | services/financeAdvancedService.ts |
| GET | `/bank-reconciliation/feeds/${id}/transactions` | services/financeAdvancedService.ts |

### notifications (2 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/notifications/settings` | services/notificationService.ts |
| PATCH | `/notifications/settings` | services/notificationService.ts |

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

### tags (2 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| POST | `/tags/${tagId}/attach` | services/tagsService.ts |
| POST | `/tags/${tagId}/detach` | services/tagsService.ts |

### users (2 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/users` | utils/retry.ts |
| POST | `/users` | utils/retry.ts |

### finance (1 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/finance/overview` | hooks/useFinance.ts |

### ${entityType}s (1 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| POST | `/${entityType}s/${entityId}/counts` | hooks/useSmartButtonCounts.ts |

### lawyers (1 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| DELETE | `/lawyers/bulk` | hooks/useStaff.ts |

### admin (1 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/admin/dashboard` | hooks/useUIAccess.ts |

### bills (1 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/bills/${billId}/debit-notes` | services/accountingService.ts |

### debit-notes (1 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/debit-notes/export` | services/accountingService.ts |

### firms (1 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| POST | `/firms/${cachedFirmId}/logo` | services/billingSettingsService.ts |

### campaigns (1 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/campaigns/${campaignId}/analytics` | services/campaignService.ts |

### case-workflows (1 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| DELETE | `/case-workflows/${id}` | services/caseWorkflowsService.ts |

### consent (1 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/consent/export/${requestId}` | services/consent.service.ts |

### competitors (1 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/competitors/stats` | services/crmSettingsService.ts |

### exchange-rate-revaluation?${params.toString()} (1 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/exchange-rate-revaluation?${params.toString()}` | services/exchangeRateRevaluationService.ts |

### income-tax-slabs?${params.toString()} (1 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/income-tax-slabs?${params.toString()}` | services/incomeTaxSlabsService.ts |

### leave-periods?${params.toString()} (1 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/leave-periods?${params.toString()}` | services/leavePeriodService.ts |

### payroll?${params.toString()} (1 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/payroll?${params.toString()}` | services/payrollService.ts |

### prepared-reports?${params.toString()} (1 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| GET | `/prepared-reports?${params.toString()}` | services/preparedReportsService.ts |

### storage (1 missing)

| Method | Endpoint | Source File |
|--------|----------|-------------|
| POST | `/storage/r2/files` | services/storageService.ts |

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

### hr (319 unused)

| Method | Endpoint |
|--------|----------|
| GET | `/api/hr/compensation-rewards/stats` |
| GET | `/api/hr/compensation-rewards/export` |
| GET | `/api/hr/compliance/dashboard` |
| GET | `/api/hr/compliance/gosi` |
| GET | `/api/hr/compliance/nitaqat` |
| GET | `/api/hr/compliance/wps` |
| GET | `/api/hr/compliance/documents/expiring` |
| GET | `/api/hr/compliance/probation/ending` |
| GET | `/api/hr/compliance/contracts/expiring` |
| GET | `/api/hr/compliance/labor-law` |
| GET | `/api/hr/employee-incentives/stats` |
| GET | `/api/hr/employee-promotions/upcoming` |
| GET | `/api/hr/self-service/dashboard` |
| GET | `/api/hr/self-service/profile` |
| PATCH | `/api/hr/self-service/profile` |
| GET | `/api/hr/self-service/leave/balances` |
| GET | `/api/hr/self-service/leave/requests` |
| POST | `/api/hr/self-service/leave/request` |
| POST | `/api/hr/self-service/leave/request/:requestId/cancel` |
| GET | `/api/hr/self-service/loans` |
| GET | `/api/hr/self-service/advances` |
| GET | `/api/hr/self-service/payslips` |
| GET | `/api/hr/self-service/approvals/pending` |
| GET | `/api/hr/fleet/stats` |
| GET | `/api/hr/fleet/expiring-documents` |
| GET | `/api/hr/fleet/maintenance-due` |
| GET | `/api/hr/fleet/driver-rankings` |
| GET | `/api/hr/fleet/vehicles` |
| GET | `/api/hr/fleet/vehicles/:id` |
| POST | `/api/hr/fleet/vehicles` |
| ... | *289 more* |

### workflows (159 unused)

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
| ... | *129 more* |

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

### case-notion (73 unused)

| Method | Endpoint |
|--------|----------|
| GET | `/api/case-notion/notion/cases` |
| GET | `/api/case-notion/cases/:caseId/notion/pages` |
| GET | `/api/case-notion/cases/:caseId/notion/pages/:pageId` |
| POST | `/api/case-notion/cases/:caseId/notion/pages` |
| PATCH | `/api/case-notion/cases/:caseId/notion/pages/:pageId` |
| DELETE | `/api/case-notion/cases/:caseId/notion/pages/:pageId` |
| POST | `/api/case-notion/cases/:caseId/notion/pages/:pageId/archive` |
| POST | `/api/case-notion/cases/:caseId/notion/pages/:pageId/restore` |
| POST | `/api/case-notion/cases/:caseId/notion/pages/:pageId/duplicate` |
| POST | `/api/case-notion/cases/:caseId/notion/pages/:pageId/favorite` |
| POST | `/api/case-notion/cases/:caseId/notion/pages/:pageId/pin` |
| POST | `/api/case-notion/cases/:caseId/notion/pages/merge` |
| GET | `/api/case-notion/cases/:caseId/notion/pages/:pageId/blocks` |
| POST | `/api/case-notion/cases/:caseId/notion/pages/:pageId/blocks` |
| PATCH | `/api/case-notion/cases/:caseId/notion/blocks/:blockId` |
| DELETE | `/api/case-notion/cases/:caseId/notion/blocks/:blockId` |
| POST | `/api/case-notion/cases/:caseId/notion/blocks/:blockId/move` |
| POST | `/api/case-notion/cases/:caseId/notion/blocks/:blockId/lock` |
| POST | `/api/case-notion/cases/:caseId/notion/blocks/:blockId/unlock` |
| POST | `/api/case-notion/cases/:caseId/notion/synced-blocks` |
| GET | `/api/case-notion/cases/:caseId/notion/synced-blocks/:blockId` |
| POST | `/api/case-notion/cases/:caseId/notion/synced-blocks/:blockId/unsync` |
| GET | `/api/case-notion/cases/:caseId/notion/blocks/:blockId/comments` |
| POST | `/api/case-notion/cases/:caseId/notion/blocks/:blockId/comments` |
| POST | `/api/case-notion/cases/:caseId/notion/comments/:commentId/resolve` |
| DELETE | `/api/case-notion/cases/:caseId/notion/comments/:commentId` |
| GET | `/api/case-notion/cases/:caseId/notion/pages/:pageId/activity` |
| GET | `/api/case-notion/cases/:caseId/notion/search` |
| GET | `/api/case-notion/cases/:caseId/notion/pages/:pageId/export/pdf` |
| GET | `/api/case-notion/cases/:caseId/notion/pages/:pageId/export/markdown` |
| ... | *43 more* |

### cases (58 unused)

| Method | Endpoint |
|--------|----------|
| GET | `/api/cases/overview` |
| GET | `/api/cases/statistics` |
| POST | `/api/cases` |
| GET | `/api/cases` |
| GET | `/api/cases/pipeline` |
| GET | `/api/cases/pipeline/statistics` |
| GET | `/api/cases/pipeline/stages/:category` |
| GET | `/api/cases/pipeline/grouped` |
| GET | `/api/cases/:_id/full` |
| GET | `/api/cases/:_id` |
| PATCH | `/api/cases/:_id` |
| DELETE | `/api/cases/:_id` |
| PATCH | `/api/cases/:_id/progress` |
| GET | `/api/cases/:_id/notes` |
| POST | `/api/cases/:_id/notes` |
| POST | `/api/cases/:_id/note` |
| PUT | `/api/cases/:_id/notes/:noteId` |
| PATCH | `/api/cases/:_id/notes/:noteId` |
| DELETE | `/api/cases/:_id/notes/:noteId` |
| POST | `/api/cases/:_id/documents/upload-url` |
| POST | `/api/cases/:_id/documents/confirm` |
| GET | `/api/cases/:_id/documents/:docId/download` |
| POST | `/api/cases/:_id/document` |
| DELETE | `/api/cases/:_id/document/:documentId` |
| POST | `/api/cases/:_id/hearing` |
| PATCH | `/api/cases/:_id/hearings/:hearingId` |
| DELETE | `/api/cases/:_id/hearings/:hearingId` |
| PATCH | `/api/cases/:_id/hearing/:hearingId` |
| DELETE | `/api/cases/:_id/hearing/:hearingId` |
| POST | `/api/cases/:_id/timeline` |
| ... | *28 more* |

### admin (49 unused)

| Method | Endpoint |
|--------|----------|
| POST | `/api/admin/users/:id/revoke-tokens` |
| GET | `/api/admin/revoked-tokens` |
| GET | `/api/admin/revoked-tokens/stats` |
| GET | `/api/admin/users/:id/revocations` |
| POST | `/api/admin/revoked-tokens/cleanup` |
| POST | `/api/admin/users/:id/expire-password` |
| POST | `/api/admin/firm/expire-all-passwords` |
| GET | `/api/admin/firm/password-stats` |
| GET | `/api/admin/users/:id/claims` |
| PUT | `/api/admin/users/:id/claims` |
| DELETE | `/api/admin/users/:id/claims` |
| GET | `/api/admin/users/:id/claims/preview` |
| POST | `/api/admin/users/:id/claims/validate` |
| GET | `/api/admin/tools/users/:id/data` |
| DELETE | `/api/admin/tools/users/:id/data` |
| GET | `/api/admin/tools/firms/:id/export` |
| POST | `/api/admin/tools/firms/:id/import` |
| POST | `/api/admin/tools/users/merge` |
| POST | `/api/admin/tools/clients/merge` |
| POST | `/api/admin/tools/firms/:id/recalculate-invoices` |
| POST | `/api/admin/tools/firms/:id/reindex` |
| POST | `/api/admin/tools/firms/:id/cleanup-orphaned` |
| GET | `/api/admin/tools/firms/:id/validate` |
| POST | `/api/admin/tools/firms/:id/fix-currency` |
| GET | `/api/admin/tools/stats` |
| GET | `/api/admin/tools/activity-report` |
| GET | `/api/admin/tools/storage-usage` |
| POST | `/api/admin/tools/clear-cache` |
| GET | `/api/admin/tools/diagnostics` |
| GET | `/api/admin/tools/slow-queries` |
| ... | *19 more* |

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

### auth (35 unused)

| Method | Endpoint |
|--------|----------|
| POST | `/api/auth/google/one-tap` |
| POST | `/api/auth/logout-all` |
| POST | `/api/auth/refresh` |
| POST | `/api/auth/mfa/backup-codes/verify` |
| POST | `/api/auth/mfa/backup-codes/regenerate` |
| GET | `/api/auth/sessions/stats` |
| GET | `/api/auth/csrf` |
| POST | `/api/auth/verify-captcha` |
| GET | `/api/auth/captcha/providers` |
| GET | `/api/auth/captcha/status/:provider` |
| POST | `/api/auth/sso/:provider/callback` |
| GET | `/api/auth/sso/:providerType/authorize` |
| GET | `/api/auth/sso/:providerType/callback` |
| GET | `/api/auth/sso/linked` |
| POST | `/api/auth/sso/detect` |
| GET | `/api/auth/sso/domain/:domain` |
| POST | `/api/auth/sso/domain/:domain/verify/generate` |
| POST | `/api/auth/sso/domain/:domain/verify` |
| POST | `/api/auth/sso/domain/:domain/verify/manual` |
| POST | `/api/auth/sso/domain/:domain/cache/invalidate` |
| GET | `/api/auth/saml/metadata/:firmId` |
| GET | `/api/auth/saml/login/:firmId` |
| POST | `/api/auth/saml/acs/:firmId` |
| GET | `/api/auth/saml/logout/:firmId` |
| POST | `/api/auth/saml/sls/:firmId` |
| GET | `/api/auth/saml/config` |
| PUT | `/api/auth/saml/config` |
| POST | `/api/auth/saml/config/test` |
| POST | `/api/auth/webauthn/register/start` |
| POST | `/api/auth/webauthn/register/finish` |
| ... | *5 more* |

### firms (34 unused)

| Method | Endpoint |
|--------|----------|
| GET | `/api/firms` |
| GET | `/api/firms/roles` |
| POST | `/api/firms` |
| POST | `/api/firms/switch` |
| GET | `/api/firms/my/permissions` |
| GET | `/api/firms/tree` |
| GET | `/api/firms/user/accessible` |
| GET | `/api/firms/active` |
| GET | `/api/firms/:id/children` |
| PUT | `/api/firms/:id/move` |
| GET | `/api/firms/:id/access` |
| POST | `/api/firms/:id/access` |
| PATCH | `/api/firms/:id/billing` |
| GET | `/api/firms/:id/team` |
| GET | `/api/firms/:id/members` |
| GET | `/api/firms/:id/departed` |
| POST | `/api/firms/:id/members/invite` |
| POST | `/api/firms/:id/members/:memberId/depart` |
| POST | `/api/firms/:id/members/:memberId/reinstate` |
| POST | `/api/firms/:firmId/invitations` |
| GET | `/api/firms/:firmId/invitations` |
| GET | `/api/firms/:id/stats` |
| GET | `/api/firms/:firmId/ip-whitelist` |
| POST | `/api/firms/:firmId/ip-whitelist/test` |
| POST | `/api/firms/:firmId/ip-whitelist/enable` |
| POST | `/api/firms/:firmId/ip-whitelist/disable` |
| POST | `/api/firms/:firmId/ip-whitelist` |
| DELETE | `/api/firms/:firmId/ip-whitelist/:ip` |
| DELETE | `/api/firms/:firmId/ip-whitelist/temporary/:allowanceId` |
| GET | `/api/firms/:firmId/sso` |
| ... | *4 more* |

### contracts (33 unused)

| Method | Endpoint |
|--------|----------|
| GET | `/api/contracts/search` |
| GET | `/api/contracts/expiring` |
| GET | `/api/contracts/statistics` |
| GET | `/api/contracts/client/:clientId` |
| GET | `/api/contracts/templates` |
| POST | `/api/contracts/templates/:templateId/use` |
| GET | `/api/contracts` |
| POST | `/api/contracts` |
| GET | `/api/contracts/:contractId` |
| PATCH | `/api/contracts/:contractId` |
| DELETE | `/api/contracts/:contractId` |
| POST | `/api/contracts/:contractId/parties` |
| PATCH | `/api/contracts/:contractId/parties/:partyIndex` |
| DELETE | `/api/contracts/:contractId/parties/:partyIndex` |
| POST | `/api/contracts/:contractId/signatures/initiate` |
| POST | `/api/contracts/:contractId/signatures/:partyIndex` |
| GET | `/api/contracts/:contractId/signatures` |
| POST | `/api/contracts/:contractId/amendments` |
| GET | `/api/contracts/:contractId/amendments` |
| POST | `/api/contracts/:contractId/versions` |
| GET | `/api/contracts/:contractId/versions` |
| POST | `/api/contracts/:contractId/versions/:versionNumber/revert` |
| POST | `/api/contracts/:contractId/notarization` |
| GET | `/api/contracts/:contractId/notarization/verify` |
| POST | `/api/contracts/:contractId/breach` |
| POST | `/api/contracts/:contractId/enforcement` |
| PATCH | `/api/contracts/:contractId/enforcement` |
| POST | `/api/contracts/:contractId/link-case` |
| POST | `/api/contracts/:contractId/reminders` |
| GET | `/api/contracts/:contractId/reminders` |
| ... | *3 more* |

### tasks (32 unused)

| Method | Endpoint |
|--------|----------|
| GET | `/api/tasks/overview` |
| GET | `/api/tasks/timers/active` |
| GET | `/api/tasks/search` |
| GET | `/api/tasks/conflicts` |
| GET | `/api/tasks/client/:clientId` |
| POST | `/api/tasks/bulk/reopen` |
| GET | `/api/tasks/archived` |
| GET | `/api/tasks/location-triggers` |
| POST | `/api/tasks/location/check` |
| POST | `/api/tasks/parse` |
| POST | `/api/tasks/voice` |
| GET | `/api/tasks/smart-schedule` |
| POST | `/api/tasks/auto-schedule` |
| POST | `/api/tasks/voice-to-item` |
| POST | `/api/tasks/voice-to-item/batch` |
| GET | `/api/tasks/:id/activity` |
| POST | `/api/tasks/:id/convert-to-event` |
| PUT | `/api/tasks/:id/location-trigger` |
| POST | `/api/tasks/:id/location/check` |
| PATCH | `/api/tasks/:id/timer/pause` |
| PATCH | `/api/tasks/:id/timer/resume` |
| GET | `/api/tasks/:id/documents/:documentId/versions` |
| GET | `/api/tasks/:id/documents/:documentId/versions/:versionId` |
| POST | `/api/tasks/:id/documents/:documentId/versions/:versionId/restore` |
| DELETE | `/api/tasks/:taskId/time-tracking/:entryId` |
| POST | `/api/tasks/:taskId/watchers` |
| DELETE | `/api/tasks/:taskId/watchers/:userId` |
| POST | `/api/tasks/:taskId/recurring` |
| DELETE | `/api/tasks/:taskId/recurring` |
| POST | `/api/tasks/:taskId/convert-to-case` |
| ... | *2 more* |

### crm-reports (28 unused)

| Method | Endpoint |
|--------|----------|
| GET | `/api/crm-reports/quick-stats` |
| GET | `/api/crm-reports/recent-activity` |
| GET | `/api/crm-reports/funnel/overview` |
| GET | `/api/crm-reports/funnel/velocity` |
| GET | `/api/crm-reports/funnel/bottlenecks` |
| GET | `/api/crm-reports/aging/overview` |
| GET | `/api/crm-reports/aging/by-stage` |
| GET | `/api/crm-reports/leads-source/overview` |
| GET | `/api/crm-reports/leads-source/trend` |
| GET | `/api/crm-reports/win-loss/overview` |
| GET | `/api/crm-reports/win-loss/reasons` |
| GET | `/api/crm-reports/win-loss/trend` |
| GET | `/api/crm-reports/activity/overview` |
| GET | `/api/crm-reports/activity/by-day-of-week` |
| GET | `/api/crm-reports/activity/by-hour` |
| GET | `/api/crm-reports/activity/leaderboard` |
| GET | `/api/crm-reports/forecast/overview` |
| GET | `/api/crm-reports/forecast/by-month` |
| GET | `/api/crm-reports/forecast/by-rep` |
| POST | `/api/crm-reports/export` |
| GET | `/api/crm-reports/campaign-efficiency` |
| GET | `/api/crm-reports/lead-owner-efficiency` |
| GET | `/api/crm-reports/first-response-time` |
| GET | `/api/crm-reports/lost-opportunity` |
| GET | `/api/crm-reports/sales-pipeline` |
| GET | `/api/crm-reports/prospects-engaged` |
| GET | `/api/crm-reports/lead-conversion-time` |
| GET | `/api/crm-reports/performance/rep-scorecard/:userId` |

### manufacturing (28 unused)

| Method | Endpoint |
|--------|----------|
| GET | `/api/manufacturing/stats` |
| GET | `/api/manufacturing/settings` |
| PUT | `/api/manufacturing/settings` |
| GET | `/api/manufacturing/boms` |
| GET | `/api/manufacturing/boms/:id` |
| POST | `/api/manufacturing/boms` |
| PUT | `/api/manufacturing/boms/:id` |
| DELETE | `/api/manufacturing/boms/:id` |
| GET | `/api/manufacturing/workstations` |
| GET | `/api/manufacturing/workstations/:id` |
| POST | `/api/manufacturing/workstations` |
| PUT | `/api/manufacturing/workstations/:id` |
| DELETE | `/api/manufacturing/workstations/:id` |
| GET | `/api/manufacturing/work-orders` |
| GET | `/api/manufacturing/work-orders/:id` |
| POST | `/api/manufacturing/work-orders` |
| PUT | `/api/manufacturing/work-orders/:id` |
| DELETE | `/api/manufacturing/work-orders/:id` |
| POST | `/api/manufacturing/work-orders/:id/submit` |
| POST | `/api/manufacturing/work-orders/:id/start` |
| POST | `/api/manufacturing/work-orders/:id/complete` |
| POST | `/api/manufacturing/work-orders/:id/cancel` |
| GET | `/api/manufacturing/job-cards` |
| GET | `/api/manufacturing/job-cards/:id` |
| POST | `/api/manufacturing/job-cards` |
| PUT | `/api/manufacturing/job-cards/:id` |
| POST | `/api/manufacturing/job-cards/:id/start` |
| POST | `/api/manufacturing/job-cards/:id/complete` |

### appointments (27 unused)

| Method | Endpoint |
|--------|----------|
| POST | `/api/appointments/book/:firmId` |
| GET | `/api/appointments/available-slots` |
| GET | `/api/appointments/availability` |
| POST | `/api/appointments/availability` |
| POST | `/api/appointments/availability/bulk` |
| PUT | `/api/appointments/availability/:id` |
| DELETE | `/api/appointments/availability/:id` |
| GET | `/api/appointments/blocked-times` |
| POST | `/api/appointments/blocked-times` |
| DELETE | `/api/appointments/blocked-times/:id` |
| GET | `/api/appointments/settings` |
| PUT | `/api/appointments/settings` |
| GET | `/api/appointments/stats` |
| GET | `/api/appointments/debug` |
| GET | `/api/appointments/calendar-status` |
| GET | `/api/appointments/:id/calendar-links` |
| POST | `/api/appointments/:id/sync-calendar` |
| GET | `/api/appointments` |
| GET | `/api/appointments/slots` |
| GET | `/api/appointments/:id` |
| POST | `/api/appointments` |
| PUT | `/api/appointments/:id` |
| PUT | `/api/appointments/:id/confirm` |
| PUT | `/api/appointments/:id/complete` |
| PUT | `/api/appointments/:id/no-show` |
| POST | `/api/appointments/:id/reschedule` |
| DELETE | `/api/appointments/:id` |

### reminders (27 unused)

| Method | Endpoint |
|--------|----------|
| GET | `/api/reminders/location/summary` |
| GET | `/api/reminders/location/locations` |
| POST | `/api/reminders/location` |
| POST | `/api/reminders/location/check` |
| POST | `/api/reminders/location/nearby` |
| POST | `/api/reminders/location/save` |
| POST | `/api/reminders/location/distance` |
| PUT | `/api/reminders/location/locations/:locationId` |
| DELETE | `/api/reminders/location/locations/:locationId` |
| POST | `/api/reminders/location/:reminderId/reset` |
| GET | `/api/reminders/client/:clientId` |
| GET | `/api/reminders/case/:caseId` |
| POST | `/api/reminders/from-task/:taskId` |
| POST | `/api/reminders/from-event/:eventId` |
| POST | `/api/reminders/parse` |
| POST | `/api/reminders/voice` |
| PATCH | `/api/reminders/reorder` |
| GET | `/api/reminders/search` |
| GET | `/api/reminders/conflicts` |
| POST | `/api/reminders/:id/clone` |
| POST | `/api/reminders/:id/reschedule` |
| GET | `/api/reminders/:id/activity` |
| POST | `/api/reminders/:id/recurring/resume` |
| GET | `/api/reminders/:id/occurrences` |
| POST | `/api/reminders/:id/duplicate` |
| POST | `/api/reminders/bulk-snooze` |
| POST | `/api/reminders/bulk-complete` |

### analyticss (26 unused)

| Method | Endpoint |
|--------|----------|
| POST | `/api/analyticss/events` |
| GET | `/api/analyticss/events/counts` |
| GET | `/api/analyticss/app/dashboard` |
| GET | `/api/analyticss/app/features` |
| GET | `/api/analyticss/app/features/popular` |
| GET | `/api/analyticss/app/engagement` |
| GET | `/api/analyticss/app/retention` |
| GET | `/api/analyticss/app/funnel` |
| GET | `/api/analyticss/app/dropoff` |
| GET | `/api/analyticss/app/users/:userId/journey` |
| GET | `/api/analyticss/app/export` |
| GET | `/api/analyticss/crm/dashboard` |
| GET | `/api/analyticss/crm/pipeline` |
| GET | `/api/analyticss/crm/sales-funnel` |
| GET | `/api/analyticss/crm/forecast` |
| GET | `/api/analyticss/crm/lead-sources` |
| GET | `/api/analyticss/crm/win-loss` |
| GET | `/api/analyticss/crm/activity` |
| GET | `/api/analyticss/crm/team-performance` |
| GET | `/api/analyticss/crm/territory` |
| GET | `/api/analyticss/crm/campaign-roi` |
| GET | `/api/analyticss/crm/first-response` |
| GET | `/api/analyticss/crm/conversion-rates` |
| GET | `/api/analyticss/crm/cohort` |
| GET | `/api/analyticss/crm/revenue` |
| GET | `/api/analyticss/crm/forecast-accuracy` |

### audit-logs (26 unused)

| Method | Endpoint |
|--------|----------|
| GET | `/api/audit-logs/summary` |
| GET | `/api/audit-logs/security-events` |
| GET | `/api/audit-logs/compliance-report` |
| GET | `/api/audit-logs/archiving/stats` |
| GET | `/api/audit-logs/archiving/summary` |
| POST | `/api/audit-logs/archiving/run` |
| POST | `/api/audit-logs/archiving/verify` |
| POST | `/api/audit-logs/archiving/restore` |
| POST | `/api/audit-logs/log-with-diff` |
| POST | `/api/audit-logs/log-bulk-action` |
| POST | `/api/audit-logs/log-security-event` |
| GET | `/api/audit-logs/search` |
| GET | `/api/audit-logs/by-action/:action` |
| GET | `/api/audit-logs/by-date-range` |
| GET | `/api/audit-logs/analytics/activity-summary` |
| GET | `/api/audit-logs/analytics/top-users` |
| GET | `/api/audit-logs/analytics/top-actions` |
| GET | `/api/audit-logs/analytics/anomalies` |
| POST | `/api/audit-logs/compliance/generate-report` |
| POST | `/api/audit-logs/compliance/verify-integrity` |
| POST | `/api/audit-logs/compliance/export-for-audit` |
| GET | `/api/audit-logs/compliance/retention-status` |
| GET | `/api/audit-logs/archive/stats` |
| POST | `/api/audit-logs/archive/run` |
| POST | `/api/audit-logs/archive/verify` |
| GET | `/api/audit-logs/recent` |

### dunning (24 unused)

| Method | Endpoint |
|--------|----------|
| GET | `/api/dunning/dashboard` |
| GET | `/api/dunning/stats` |
| GET | `/api/dunning/report` |
| GET | `/api/dunning/report/export` |
| GET | `/api/dunning/overdue-invoices` |
| GET | `/api/dunning/upcoming-actions` |
| GET | `/api/dunning/paused-invoices` |
| GET | `/api/dunning/policies` |
| GET | `/api/dunning/policies/default` |
| POST | `/api/dunning/policies` |
| GET | `/api/dunning/policies/:id` |
| PUT | `/api/dunning/policies/:id` |
| DELETE | `/api/dunning/policies/:id` |
| POST | `/api/dunning/policies/:id/set-default` |
| POST | `/api/dunning/policies/:id/toggle-status` |
| POST | `/api/dunning/policies/:id/duplicate` |
| POST | `/api/dunning/policies/:id/test` |
| POST | `/api/dunning/policies/:id/apply` |
| GET | `/api/dunning/history` |
| GET | `/api/dunning/history/invoice/:invoiceId` |
| POST | `/api/dunning/history` |
| POST | `/api/dunning/history/:invoiceId/pause` |
| POST | `/api/dunning/history/:invoiceId/resume` |
| POST | `/api/dunning/history/:invoiceId/escalate` |

### admin-api (22 unused)

| Method | Endpoint |
|--------|----------|
| GET | `/api/admin-api/dashboard/summary` |
| GET | `/api/admin-api/dashboard/revenue` |
| GET | `/api/admin-api/dashboard/active-users` |
| GET | `/api/admin-api/dashboard/system-health` |
| GET | `/api/admin-api/dashboard/pending-approvals` |
| GET | `/api/admin-api/dashboard/recent-activity` |
| GET | `/api/admin-api/users` |
| GET | `/api/admin-api/users/export` |
| GET | `/api/admin-api/users/:id` |
| PATCH | `/api/admin-api/users/:id/status` |
| POST | `/api/admin-api/users/:id/revoke-tokens` |
| POST | `/api/admin-api/users/:id/reset-password` |
| GET | `/api/admin-api/audit/logs` |
| GET | `/api/admin-api/audit/security-events` |
| GET | `/api/admin-api/audit/compliance-report` |
| GET | `/api/admin-api/audit/export` |
| GET | `/api/admin-api/audit/login-history` |
| GET | `/api/admin-api/firms` |
| GET | `/api/admin-api/firms/:id` |
| GET | `/api/admin-api/firms/:id/usage` |
| PATCH | `/api/admin-api/firms/:id/plan` |
| PATCH | `/api/admin-api/firms/:id/suspend` |

### reports (22 unused)

| Method | Endpoint |
|--------|----------|
| GET | `/api/reports/consolidated/profit-loss` |
| GET | `/api/reports/consolidated/balance-sheet` |
| GET | `/api/reports/consolidated/cash-flow` |
| GET | `/api/reports/consolidated/comparison` |
| GET | `/api/reports/consolidated/eliminations` |
| POST | `/api/reports/consolidated/eliminations` |
| GET | `/api/reports/consolidated/auto-eliminations` |
| GET | `/api/reports/consolidated/full-statement` |
| GET | `/api/reports/budget-variance` |
| GET | `/api/reports/ap-aging` |
| GET | `/api/reports/client-statement` |
| GET | `/api/reports/vendor-ledger` |
| GET | `/api/reports/gross-profit` |
| GET | `/api/reports/cost-center` |
| GET | `/api/reports/cases-chart` |
| GET | `/api/reports/revenue-chart` |
| GET | `/api/reports/tasks-chart` |
| POST | `/api/reports/:id/execute` |
| POST | `/api/reports/validate` |
| GET | `/api/reports/:id/execute` |
| POST | `/api/reports/:id/clone` |
| GET | `/api/reports/:id/export/:format` |

---

## 🔴 Method Mismatches

Frontend calls with different HTTP method than backend expects.

| Path | Frontend Method | Backend Method |
|------|-----------------|----------------|
| `/saudi-banking/lean/customers/:param/token` | POST | GET |
| `/saudi-banking/mudad/submissions/:param/status` | POST | GET |
| `/lawyers` | POST | GET |
| `/lawyers/${id}` | PUT | GET |
| `/lawyers/${id}` | DELETE | GET |
| `/recurring-transactions/${id}` | DELETE | GET |
| `/hr/advances/:param` | POST | GET |
| `/hr/advances/:param/cancel` | GET | POST |
| `/hr/advances/by-employee/:param` | POST | GET |
| `/auth/anonymous` | DELETE | POST |
| `/approvals/rules` | POST | GET |
| `/hr/asset-assignments/:param` | POST | GET |
| `/hr/asset-assignments/:param/acknowledge` | GET | POST |
| `/hr/asset-assignments/by-employee/:param` | POST | GET |
| `/assets/${id}/submit` | PATCH | POST |
| `/assets/${id}/sell` | PATCH | POST |
| `/assets/${id}/scrap` | PATCH | POST |
| `/assets/${assetId}/depreciation` | POST | GET |
| `/assets/${assetId}/maintenance/${scheduleId}/complete` | PATCH | POST |
| `/assets/repairs/${id}/complete` | PATCH | POST |
| `/assets/:param` | POST | GET |
| `/assets/categories/:param` | POST | GET |
| `/assets/repairs/:param` | POST | GET |
| `/attendance/${recordId}/breaks` | POST | GET |
| `/attendance/${recordId}/violations` | GET | POST |
| `/attendance/:param` | POST | GET |
| `/audit-logs` | POST | GET |
| `/bank-accounts/:param` | POST | GET |
| `/bank-reconciliation/feeds/:param` | GET | PUT |
| `/bank-reconciliation/suggestions/:param` | POST | GET |
| `/bank-reconciliation/match/:param` | POST | DELETE |
| `/bank-reconciliation/rules/:param` | POST | PUT |
| `/bank-reconciliation/:param` | POST | GET |
| `/bank-transactions/:param` | POST | GET |
| `/bank-transfers/:param` | POST | GET |
| `/hr/employee-benefits/:param` | POST | GET |
| `/budgets/${id}` | PATCH | GET |
| `/budgets/${budgetId}/lines/${lineId}` | PATCH | PUT |
| `/budgets/check` | POST | GET |
| `/budgets/${budgetId}/distribution` | POST | GET |
| `/hr/compensation-rewards/:param` | POST | GET |
| `/compensatory-leave-requests/:param` | POST | GET |
| `/conflict-checks/:param` | POST | GET |
| `/contacts/:param` | POST | GET |
| `/contacts/search?q=:param` | DELETE | GET |
| `/corporate-cards/${id}` | PATCH | GET |
| `/email-marketing/subscribers/${id}` | GET | PUT |
| `/whatsapp/conversations/${conversationId}/assign` | POST | PUT |
| `/data-export/jobs/:param` | POST | GET |
| `/data-export/import/:param/cancel` | GET | POST |
| `/data-export/templates/:param` | GET | PATCH |
| `/document-analysis/:param/similar` | POST | GET |
| `/documents/${documentId}/versions/${versionId}` | PATCH | GET |
| `/documents/:param` | POST | GET |
| `/settings/email/signatures/${id}/default` | PATCH | PUT |
| `/hr/employee-promotions/:param` | POST | GET |
| `/hr/employee-promotions/:param/notify` | GET | POST |
| `/events/${eventId}/attendees/${attendeeId}` | PATCH | DELETE |
| `/hr/expense-claims/:param` | POST | GET |
| `/hr/expense-claims/:param/submit` | GET | POST |
| `/hr/expense-claims/by-employee/:param` | POST | GET |
| `/invoices/confirm-payment` | PATCH | POST |
| `/credit-notes/${id}` | PATCH | GET |
| `/payments/${id}/receipt` | GET | POST |
| `/transactions/${id}` | PATCH | GET |
| `/statements/${id}` | PUT | GET |
| `/activities/${id}` | PATCH | GET |
| `/followups/:param` | POST | GET |
| `/followups/:param/complete` | GET | POST |
| `/hr/grievances/:param` | POST | GET |
| `/hr/grievances/:param/acknowledge` | GET | POST |
| `/api/inter-company/transactions/${id}` | DELETE | GET |
| `/leave-allocations/:param` | POST | GET |
| `/leave-encashments/:param` | POST | GET |
| `/leave-encashments/eligibility/:param` | POST | GET |
| `/leave-encashments/export?:param` | POST | GET |
| `/hr/leave-policies/:param` | POST | GET |
| `/hr/leave-policy-assignments/employee/:param/current` | POST | GET |
| `/leave-requests/:param` | POST | GET |
| `/hr/employee-loans/:param` | POST | GET |
| `/hr/employee-loans/:param/submit` | GET | POST |
| `/hr/employee-loans/by-employee/:param` | POST | GET |
| `/matter-budgets/:param` | POST | GET |
| `/matter-budgets/:param/phases` | GET | POST |
| `/matter-budgets/templates/:param` | GET | PATCH |
| `/messages?${params.toString()}` | GET | POST |
| `/messages/${id}` | DELETE | GET |
| `/messages/${id}` | PATCH | GET |
| `/ml/scores/:param/explanation` | POST | GET |
| `/ml/priority/:param/contact` | GET | POST |
| `/auth/sso/unlink/:param` | GET | DELETE |
| `/activities/types/${id}` | PATCH | GET |
| `/activities/${id}/reschedule` | PATCH | POST |
| `/activities/${id}/reassign` | PATCH | POST |
| `/hr/offboarding/:param` | POST | GET |
| `/hr/offboarding/:param/status` | GET | PATCH |
| `/hr/offboarding/by-employee/:param` | POST | GET |
| `/hr/offboarding/:param/rehire-eligibility` | GET | PATCH |
| `/hr/onboarding/:param` | POST | GET |
| `/hr/onboarding/:param/status` | GET | PATCH |
| `/hr/onboarding/by-employee/:param` | POST | GET |
| `/hr/organizational-structure/:param` | POST | GET |
| `/organizations/:param` | POST | GET |
| `/organizations/search?q=:param` | DELETE | GET |
| `/payroll-runs/:param` | POST | GET |
| `/payroll-runs/:param/employees/:param/hold` | GET | POST |
| `/hr/performance-reviews/:param` | POST | GET |
| `/hr/performance-reviews/templates/:param` | GET | PATCH |
| `/hr/performance-reviews/calibration-sessions/:param/complete` | GET | POST |
| `/permissions/policies` | GET | POST |
| `/permissions/policies/${policyId}` | GET | PUT |
| `/permissions/relations` | GET | POST |
| `/proposals/job/:param` | POST | GET |
| `/proposals/accept/:param` | GET | PATCH |
| `/hr/recruitment/jobs/:param` | POST | GET |
| `/hr/recruitment/jobs/:param/status` | GET | POST |
| `/hr/recruitment/applicants/:param` | POST | GET |
| `/recurring-invoices/${id}` | PATCH | GET |
| `/recurring-invoices/:param` | POST | GET |
| `/recurring-invoices/:param/duplicate` | GET | POST |
| `/reports/${id}/schedule` | POST | PUT |
| `/reports/${id}/schedule` | DELETE | PUT |
| `/analytics-reports/:param` | POST | GET |
| `/saved-reports/reports/:param` | POST | GET |
| `/hr/retention-bonuses/:param` | POST | GET |
| `/hr/retention-bonuses/:param/cancel` | GET | POST |
| `/saudi-banking/lean/entities/:param` | POST | DELETE |
| `/saudi-banking/sadad/payments/:param/status` | POST | GET |
| `/auth/sessions/:param` | GET | DELETE |
| `/shift-assignments/:param` | POST | GET |
| `/shift-requests/:param` | POST | GET |
| `/shift-assignments/coverage-report?:param` | POST | GET |
| `/shift-assignments/export?:param` | POST | GET |
| `/hr/shift-types/${shiftTypeId}` | PATCH | GET |
| `/hr/skills/:param` | POST | GET |
| `/settings/sso/providers/${providerId}` | PATCH | GET |
| `/hr/staffing-plans/${planId}/details/${detailId}/unlink-job-opening` | POST | DELETE |
| `/hr/staffing-plans/:param` | POST | GET |
| `/hr/staffing-plans/:param/calculate-vacancies` | GET | POST |
| `/subscriptions/:param` | POST | GET |
| `/succession-plans/:param` | POST | GET |
| `/succession-plans/by-position/:param` | POST | GET |
| `/succession-plans/:param/successors` | GET | POST |
| `/support/tickets/:param` | POST | GET |
| `/support/slas/:param` | POST | GET |
| `/tags/:param` | POST | GET |
| `/tasks/${taskId}/subtasks/${subtaskId}/toggle` | POST | PATCH |
| `/tasks/reorder` | POST | PATCH |
| `/hr/trainings/:param` | POST | GET |
| `/hr/trainings/:param/submit` | GET | POST |
| `/hr/trainings/by-employee/:param` | POST | GET |
| `/trust-accounts/:param` | POST | GET |
| `/permissions/ui/overrides` | GET | POST |
| `/hr/vehicles/:param` | POST | GET |
| `/hr/vehicles/export?:param` | POST | GET |
| `/workflow/templates` | POST | GET |
| `/workflow/templates/${id}` | PUT | GET |
| `/workflow/templates/${id}` | DELETE | GET |
| `/workflow/instances` | POST | GET |


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
1. Add 424 missing backend endpoints
2. Fix 159 HTTP method mismatches
3. Sync 0 enum value differences

### 🟡 Important (May Cause Issues)
1. Review 2871 frontend-only interfaces
2. Document 2402 unused backend endpoints

### 📝 Housekeeping
1. Remove dead code or add tests for unused endpoints
2. Create shared types package for consistency

