# Traf3li API Endpoints

> Auto-generated on 2026-01-09
> 
> Regenerate with: `npm run docs:api`

## Table of Contents

- [account](#account) (7 endpoints)
- [activitiesExtended](#activitiesextended) (19 endpoints)
- [activity](#activity) (5 endpoints)
- [activityPlans](#activityplans) (6 endpoints)
- [activitys](#activitys) (13 endpoints)
- [admin](#admin) (13 endpoints)
- [adminApi](#adminapi) (22 endpoints)
- [adminTools](#admintools) (30 endpoints)
- [aiChat](#aichat) (7 endpoints)
- [aiMatching](#aimatching) (12 endpoints)
- [aiSettings](#aisettings) (7 endpoints)
- [analyticsReport](#analyticsreport) (20 endpoints)
- [analyticss](#analyticss) (26 endpoints)
- [answer](#answer) (6 endpoints)
- [apiKey](#apikey) (7 endpoints)
- [appointment](#appointment) (28 endpoints)
- [approval](#approval) (8 endpoints)
- [approvals](#approvals) (11 endpoints)
- [approvalsExtended](#approvalsextended) (11 endpoints)
- [apps](#apps) (10 endpoints)
- [arAging](#araging) (6 endpoints)
- [assetAssignment](#assetassignment) (23 endpoints)
- [assets](#assets) (21 endpoints)
- [assetsExtended](#assetsextended) (15 endpoints)
- [attendance](#attendance) (28 endpoints)
- [attendanceExtended](#attendanceextended) (13 endpoints)
- [audit](#audit) (5 endpoints)
- [auditLog](#auditlog) (33 endpoints)
- [auditLogsExtended](#auditlogsextended) (6 endpoints)
- [auth](#auth) (42 endpoints)
- [authExtended](#authextended) (24 endpoints)
- [automatedActions](#automatedactions) (15 endpoints)
- [automatedActionsExtended](#automatedactionsextended) (16 endpoints)
- [automations](#automations) (10 endpoints)
- [bankAccount](#bankaccount) (10 endpoints)
- [bankReconciliation](#bankreconciliation) (33 endpoints)
- [bankTransaction](#banktransaction) (6 endpoints)
- [bankTransfer](#banktransfer) (4 endpoints)
- [bill](#bill) (20 endpoints)
- [billPayment](#billpayment) (4 endpoints)
- [billing](#billing) (16 endpoints)
- [billingRate](#billingrate) (8 endpoints)
- [biometric](#biometric) (32 endpoints)
- [brokers](#brokers) (6 endpoints)
- [budgets](#budgets) (18 endpoints)
- [bulkActionss](#bulkactionss) (5 endpoints)
- [buying](#buying) (33 endpoints)
- [calendar](#calendar) (11 endpoints)
- [campaigns](#campaigns) (12 endpoints)
- [captcha](#captcha) (3 endpoints)
- [case](#case) (54 endpoints)
- [caseNotion](#casenotion) (74 endpoints)
- [chatterActivitiesExtended](#chatteractivitiesextended) (6 endpoints)
- [chatterFollowers](#chatterfollowers) (7 endpoints)
- [chatterFollowersExtended](#chatterfollowersextended) (6 endpoints)
- [churn](#churn) (19 endpoints)
- [client](#client) (23 endpoints)
- [cloudStorages](#cloudstorages) (13 endpoints)
- [commandPalettes](#commandpalettes) (9 endpoints)
- [compensationReward](#compensationreward) (24 endpoints)
- [compensatoryLeave](#compensatoryleave) (21 endpoints)
- [competitor](#competitor) (6 endpoints)
- [competitors](#competitors) (7 endpoints)
- [complianceDashboard](#compliancedashboard) (8 endpoints)
- [conflictCheck](#conflictcheck) (8 endpoints)
- [consent](#consent) (6 endpoints)
- [consolidatedReports](#consolidatedreports) (8 endpoints)
- [contact](#contact) (17 endpoints)
- [contactLists](#contactlists) (10 endpoints)
- [conversation](#conversation) (4 endpoints)
- [conversations](#conversations) (10 endpoints)
- [corporateCard](#corporatecard) (15 endpoints)
- [corporateCards](#corporatecards) (19 endpoints)
- [creditNote](#creditnote) (10 endpoints)
- [crmActivity](#crmactivity) (14 endpoints)
- [crmAlias](#crmalias) (26 endpoints)
- [crmPipeline](#crmpipeline) (12 endpoints)
- [crmReports](#crmreports) (27 endpoints)
- [crmReportsAlias](#crmreportsalias) (18 endpoints)
- [crmReportsExtended](#crmreportsextended) (24 endpoints)
- [crmSettings](#crmsettings) (3 endpoints)
- [crmTransaction](#crmtransaction) (15 endpoints)
- [currency](#currency) (6 endpoints)
- [customFields](#customfields) (17 endpoints)
- [cycles](#cycles) (11 endpoints)
- [dashboard](#dashboard) (12 endpoints)
- [dataExport](#dataexport) (18 endpoints)
- [dealHealths](#dealhealths) (6 endpoints)
- [dealRooms](#dealrooms) (11 endpoints)
- [debitNote](#debitnote) (12 endpoints)
- [deduplications](#deduplications) (6 endpoints)
- [discord](#discord) (11 endpoints)
- [dispute](#dispute) (10 endpoints)
- [document](#document) (19 endpoints)
- [documentAnalysis](#documentanalysis) (11 endpoints)
- [documentsExtended](#documentsextended) (11 endpoints)
- [docusign](#docusign) (17 endpoints)
- [dripCampaigns](#dripcampaigns) (9 endpoints)
- [dunning](#dunning) (24 endpoints)
- [emailMarketing](#emailmarketing) (39 endpoints)
- [emailSettings](#emailsettings) (14 endpoints)
- [emailTemplates](#emailtemplates) (10 endpoints)
- [employeeAdvance](#employeeadvance) (23 endpoints)
- [employeeBenefit](#employeebenefit) (23 endpoints)
- [employeeIncentive](#employeeincentive) (17 endpoints)
- [employeeLoan](#employeeloan) (24 endpoints)
- [employeePromotion](#employeepromotion) (18 endpoints)
- [employeeSelfService](#employeeselfservice) (11 endpoints)
- [employeeTransfer](#employeetransfer) (19 endpoints)
- [event](#event) (51 endpoints)
- [eventsExtended](#eventsextended) (25 endpoints)
- [exchangeRateRevaluation](#exchangeraterevaluation) (9 endpoints)
- [expense](#expense) (17 endpoints)
- [expenseClaim](#expenseclaim) (32 endpoints)
- [expensePolicy](#expensepolicy) (13 endpoints)
- [fieldHistorys](#fieldhistorys) (8 endpoints)
- [financeSetup](#financesetup) (7 endpoints)
- [firm](#firm) (46 endpoints)
- [fiscalPeriod](#fiscalperiod) (12 endpoints)
- [fleet](#fleet) (33 endpoints)
- [followup](#followup) (16 endpoints)
- [gantt](#gantt) (36 endpoints)
- [generalLedger](#generalledger) (12 endpoints)
- [gig](#gig) (4 endpoints)
- [github](#github) (12 endpoints)
- [gmail](#gmail) (18 endpoints)
- [googleCalendar](#googlecalendar) (21 endpoints)
- [gosi](#gosi) (7 endpoints)
- [grievance](#grievance) (24 endpoints)
- [health](#health) (9 endpoints)
- [hr](#hr) (14 endpoints)
- [hrAnalytics](#hranalytics) (21 endpoints)
- [hrAttendanceRules](#hrattendancerules) (10 endpoints)
- [hrExpensePolicy](#hrexpensepolicy) (9 endpoints)
- [hrExtended](#hrextended) (49 endpoints)
- [hrLeavePolicy](#hrleavepolicy) (11 endpoints)
- [hrLeavePolicyAssignment](#hrleavepolicyassignment) (11 endpoints)
- [hrPayrollExtended](#hrpayrollextended) (13 endpoints)
- [hrRecruitmentExtended](#hrrecruitmentextended) (17 endpoints)
- [hrRetentionBonus](#hrretentionbonus) (16 endpoints)
- [hrSalaryComponents](#hrsalarycomponents) (11 endpoints)
- [hrSalaryComponentsExtended](#hrsalarycomponentsextended) (7 endpoints)
- [hrSetup](#hrsetup) (27 endpoints)
- [hrShiftTypesExtended](#hrshifttypesextended) (13 endpoints)
- [hrStaffingPlanDetails](#hrstaffingplandetails) (17 endpoints)
- [hrStaffingPlans](#hrstaffingplans) (26 endpoints)
- [hrStaffingPlansExtended](#hrstaffingplansextended) (13 endpoints)
- [hrVehicles](#hrvehicles) (16 endpoints)
- [incomeTaxSlab](#incometaxslab) (9 endpoints)
- [integrations](#integrations) (45 endpoints)
- [interCompany](#intercompany) (10 endpoints)
- [interCompanyExtended](#intercompanyextended) (16 endpoints)
- [interestAreas](#interestareas) (6 endpoints)
- [inventory](#inventory) (38 endpoints)
- [investmentSearch](#investmentsearch) (9 endpoints)
- [investments](#investments) (11 endpoints)
- [invitation](#invitation) (3 endpoints)
- [invoice](#invoice) (34 endpoints)
- [invoiceApproval](#invoiceapproval) (9 endpoints)
- [invoiceTemplate](#invoicetemplate) (11 endpoints)
- [job](#job) (6 endpoints)
- [jobPosition](#jobposition) (25 endpoints)
- [journalEntry](#journalentry) (8 endpoints)
- [keyboardShortcuts](#keyboardshortcuts) (9 endpoints)
- [kpiAnalytics](#kpianalytics) (4 endpoints)
- [kyc](#kyc) (9 endpoints)
- [lawyer](#lawyer) (3 endpoints)
- [ldap](#ldap) (6 endpoints)
- [lead](#lead) (21 endpoints)
- [leadConversion](#leadconversion) (6 endpoints)
- [leadScoring](#leadscoring) (19 endpoints)
- [leadSource](#leadsource) (6 endpoints)
- [leaveAllocation](#leaveallocation) (20 endpoints)
- [leaveEncashment](#leaveencashment) (20 endpoints)
- [leaveManagement](#leavemanagement) (26 endpoints)
- [leaveRequest](#leaverequest) (20 endpoints)
- [legalContract](#legalcontract) (33 endpoints)
- [legalDocument](#legaldocument) (6 endpoints)
- [legalDocumentsCrud](#legaldocumentscrud) (7 endpoints)
- [legalDocumentsExtended](#legaldocumentsextended) (7 endpoints)
- [lifecycles](#lifecycles) (10 endpoints)
- [lockDates](#lockdates) (8 endpoints)
- [lostReason](#lostreason) (7 endpoints)
- [lostReasons](#lostreasons) (7 endpoints)
- [macros](#macros) (9 endpoints)
- [manufacturing](#manufacturing) (28 endpoints)
- [matterBudget](#matterbudget) (19 endpoints)
- [message](#message) (4 endpoints)
- [metrics](#metrics) (4 endpoints)
- [mfa](#mfa) (9 endpoints)
- [microsoftCalendar](#microsoftcalendar) (17 endpoints)
- [mlScoring](#mlscoring) (18 endpoints)
- [notification](#notification) (11 endpoints)
- [notificationPreference](#notificationpreference) (12 endpoints)
- [notificationSettings](#notificationsettings) (6 endpoints)
- [oauth](#oauth) (15 endpoints)
- [offboarding](#offboarding) (21 endpoints)
- [offlineSyncs](#offlinesyncs) (6 endpoints)
- [okr](#okr) (15 endpoints)
- [onboarding](#onboarding) (22 endpoints)
- [order](#order) (6 endpoints)
- [organization](#organization) (13 endpoints)
- [organizationTemplate](#organizationtemplate) (13 endpoints)
- [organizationalUnit](#organizationalunit) (24 endpoints)
- [payment](#payment) (20 endpoints)
- [paymentReceipt](#paymentreceipt) (7 endpoints)
- [paymentTerms](#paymentterms) (10 endpoints)
- [paymentTermsSettings](#paymenttermssettings) (7 endpoints)
- [payout](#payout) (10 endpoints)
- [payroll](#payroll) (13 endpoints)
- [payrollRun](#payrollrun) (20 endpoints)
- [pdfme](#pdfme) (15 endpoints)
- [peerReview](#peerreview) (3 endpoints)
- [performanceReview](#performancereview) (28 endpoints)
- [permission](#permission) (32 endpoints)
- [plan](#plan) (8 endpoints)
- [playbook](#playbook) (15 endpoints)
- [plugins](#plugins) (16 endpoints)
- [preparedReport](#preparedreport) (7 endpoints)
- [priceLevel](#pricelevel) (7 endpoints)
- [products](#products) (9 endpoints)
- [productsEnhanced](#productsenhanced) (18 endpoints)
- [proposal](#proposal) (6 endpoints)
- [quality](#quality) (19 endpoints)
- [question](#question) (5 endpoints)
- [queue](#queue) (13 endpoints)
- [quotes](#quotes) (15 endpoints)
- [rateCard](#ratecard) (11 endpoints)
- [rateGroup](#rategroup) (9 endpoints)
- [rateLimit](#ratelimit) (12 endpoints)
- [recruitment](#recruitment) (39 endpoints)
- [recurringInvoice](#recurringinvoice) (13 endpoints)
- [recurringTransaction](#recurringtransaction) (10 endpoints)
- [referral](#referral) (11 endpoints)
- [refund](#refund) (11 endpoints)
- [regionalBanks](#regionalbanks) (9 endpoints)
- [reminder](#reminder) (48 endpoints)
- [remindersExtended](#remindersextended) (9 endpoints)
- [report](#report) (21 endpoints)
- [reports](#reports) (10 endpoints)
- [retainer](#retainer) (10 endpoints)
- [review](#review) (3 endpoints)
- [salesForecasts](#salesforecasts) (11 endpoints)
- [salesPerson](#salesperson) (7 endpoints)
- [salesQuota](#salesquota) (11 endpoints)
- [salesStage](#salesstage) (7 endpoints)
- [salesTeams](#salesteams) (10 endpoints)
- [saless](#saless) (75 endpoints)
- [saml](#saml) (8 endpoints)
- [sandboxs](#sandboxs) (9 endpoints)
- [saudiBanking](#saudibanking) (32 endpoints)
- [savedFilters](#savedfilters) (11 endpoints)
- [savedReport](#savedreport) (15 endpoints)
- [score](#score) (3 endpoints)
- [security](#security) (11 endpoints)
- [securityIncident](#securityincident) (8 endpoints)
- [settingsAlias](#settingsalias) (26 endpoints)
- [setupWizard](#setupwizard) (13 endpoints)
- [shift](#shift) (17 endpoints)
- [shiftAssignments](#shiftassignments) (15 endpoints)
- [shiftRequests](#shiftrequests) (10 endpoints)
- [skillMap](#skillmap) (26 endpoints)
- [skillMatrix](#skillmatrix) (32 endpoints)
- [slack](#slack) (12 endpoints)
- [slas](#slas) (10 endpoints)
- [sloMonitorings](#slomonitorings) (18 endpoints)
- [smartButton](#smartbutton) (2 endpoints)
- [smartScheduling](#smartscheduling) (6 endpoints)
- [ssoConfig](#ssoconfig) (5 endpoints)
- [ssoSettings](#ssosettings) (8 endpoints)
- [staff](#staff) (9 endpoints)
- [statement](#statement) (7 endpoints)
- [status](#status) (22 endpoints)
- [subcontracting](#subcontracting) (14 endpoints)
- [subscriptions](#subscriptions) (21 endpoints)
- [successionPlan](#successionplan) (27 endpoints)
- [support](#support) (16 endpoints)
- [survey](#survey) (16 endpoints)
- [tag](#tag) (9 endpoints)
- [task](#task) (89 endpoints)
- [tasksExtended](#tasksextended) (13 endpoints)
- [tasksWorkflowRules](#tasksworkflowrules) (8 endpoints)
- [team](#team) (15 endpoints)
- [telegram](#telegram) (11 endpoints)
- [temporalCase](#temporalcase) (9 endpoints)
- [temporalInvoice](#temporalinvoice) (6 endpoints)
- [temporalOffboarding](#temporaloffboarding) (5 endpoints)
- [temporalOnboarding](#temporalonboarding) (7 endpoints)
- [territory](#territory) (6 endpoints)
- [territorys](#territorys) (9 endpoints)
- [threadMessages](#threadmessages) (10 endpoints)
- [timeTracking](#timetracking) (29 endpoints)
- [timelines](#timelines) (2 endpoints)
- [trades](#trades) (10 endpoints)
- [tradingAccounts](#tradingaccounts) (8 endpoints)
- [training](#training) (29 endpoints)
- [transaction](#transaction) (10 endpoints)
- [transactionsExtended](#transactionsextended) (14 endpoints)
- [trello](#trello) (16 endpoints)
- [trustAccount](#trustaccount) (17 endpoints)
- [unifiedData](#unifieddata) (6 endpoints)
- [user](#user) (13 endpoints)
- [userSettings](#usersettings) (6 endpoints)
- [vendor](#vendor) (6 endpoints)
- [verify](#verify) (19 endpoints)
- [views](#views) (11 endpoints)
- [walkthrough](#walkthrough) (14 endpoints)
- [webauthn](#webauthn) (7 endpoints)
- [webhook](#webhook) (16 endpoints)
- [whatsapp](#whatsapp) (24 endpoints)
- [whosOut](#whosout) (6 endpoints)
- [workflow](#workflow) (13 endpoints)
- [workflowExtended](#workflowextended) (17 endpoints)
- [workflows](#workflows) (154 endpoints)
- [workflowsExtended](#workflowsextended) (9 endpoints)
- [zatca](#zatca) (12 endpoints)
- [zoom](#zoom) (14 endpoints)

---

## Summary

| Metric | Count |
|--------|-------|
| Total Endpoints | 4915 |
| Total Modules | 317 |

---

## account

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/accounts/types` | getAccountTypes | account.route.js |
| `GET` | `/api/accounts` | getAccounts | account.route.js |
| `GET` | `/api/accounts/:id` | getAccount | account.route.js |
| `GET` | `/api/accounts/:id/balance` | getAccountBalance | account.route.js |
| `POST` | `/api/accounts` | createAccount | account.route.js |
| `PATCH` | `/api/accounts/:id` | updateAccount | account.route.js |
| `DELETE` | `/api/accounts/:id` | deleteAccount | account.route.js |

## activitiesExtended

| Method | Path | Controller | File |
|--------|------|------------|------|
| `POST` | `/api/activities` | unknown | activitiesExtended.route.js |
| `GET` | `/api/activities` | unknown | activitiesExtended.route.js |
| `GET` | `/api/activities/summary` | unknown | activitiesExtended.route.js |
| `GET` | `/api/activities/overview` | unknown | activitiesExtended.route.js |
| `GET` | `/api/activities/stats` | unknown | activitiesExtended.route.js |
| `GET` | `/api/activities/my` | unknown | activitiesExtended.route.js |
| `GET` | `/api/activities/types` | unknown | activitiesExtended.route.js |
| `POST` | `/api/activities/types` | unknown | activitiesExtended.route.js |
| `GET` | `/api/activities/types/:id` | unknown | activitiesExtended.route.js |
| `PUT` | `/api/activities/types/:id` | unknown | activitiesExtended.route.js |
| `DELETE` | `/api/activities/types/:id` | unknown | activitiesExtended.route.js |
| `GET` | `/api/activities/entity/:entityType/:entityId` | unknown | activitiesExtended.route.js |
| `GET` | `/api/activities/:id` | unknown | activitiesExtended.route.js |
| `PUT` | `/api/activities/:id` | unknown | activitiesExtended.route.js |
| `DELETE` | `/api/activities/:id` | unknown | activitiesExtended.route.js |
| `POST` | `/api/activities/:id/done` | unknown | activitiesExtended.route.js |
| `POST` | `/api/activities/:id/cancel` | unknown | activitiesExtended.route.js |
| `POST` | `/api/activities/:id/reschedule` | unknown | activitiesExtended.route.js |
| `POST` | `/api/activities/:id/reassign` | unknown | activitiesExtended.route.js |

## activity

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/record-activities/summary` | getActivitySummary | activity.route.js |
| `GET` | `/api/record-activities/overview` | getActivityOverview | activity.route.js |
| `GET` | `/api/record-activities/entity/:entityType/:entityId` | getEntityActivities | activity.route.js |
| `GET` | `/api/record-activities` | getActivities | activity.route.js |
| `GET` | `/api/record-activities/:id` | getActivity | activity.route.js |

## activityPlans

| Method | Path | Controller | File |
|--------|------|------------|------|
| `POST` | `/api/activityPlans` | unknown | activityPlan.routes.js |
| `GET` | `/api/activityPlans` | unknown | activityPlan.routes.js |
| `GET` | `/api/activityPlans/:id` | unknown | activityPlan.routes.js |
| `PUT` | `/api/activityPlans/:id` | unknown | activityPlan.routes.js |
| `DELETE` | `/api/activityPlans/:id` | unknown | activityPlan.routes.js |
| `POST` | `/api/activityPlans/:id/duplicate` | unknown | activityPlan.routes.js |

## activitys

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/activitys/stats` | getActivityStats | activity.routes.js |
| `GET` | `/api/activitys/my` | getMyActivities | activity.routes.js |
| `GET` | `/api/activitys/types` | getActivityTypes | activity.routes.js |
| `POST` | `/api/activitys/types` | createActivityType | activity.routes.js |
| `PATCH` | `/api/activitys/types/:id` | updateActivityType | activity.routes.js |
| `DELETE` | `/api/activitys/types/:id` | deleteActivityType | activity.routes.js |
| `GET` | `/api/activitys` | getActivities | activity.routes.js |
| `POST` | `/api/activitys` | scheduleActivity | activity.routes.js |
| `GET` | `/api/activitys/:id` | getActivity | activity.routes.js |
| `POST` | `/api/activitys/:id/done` | markAsDone | activity.routes.js |
| `POST` | `/api/activitys/:id/cancel` | cancelActivity | activity.routes.js |
| `PATCH` | `/api/activitys/:id/reschedule` | reschedule | activity.routes.js |
| `PATCH` | `/api/activitys/:id/reassign` | reassign | activity.routes.js |

## admin

| Method | Path | Controller | File |
|--------|------|------------|------|
| `POST` | `/api/admin/users/:id/revoke-tokens` | revokeUserTokens | admin.route.js |
| `GET` | `/api/admin/revoked-tokens` | getRecentRevocations | admin.route.js |
| `GET` | `/api/admin/revoked-tokens/stats` | getRevocationStats | admin.route.js |
| `GET` | `/api/admin/users/:id/revocations` | getUserRevocationHistory | admin.route.js |
| `POST` | `/api/admin/revoked-tokens/cleanup` | cleanupExpiredTokens | admin.route.js |
| `POST` | `/api/admin/users/:id/expire-password` | expireUserPassword | admin.route.js |
| `POST` | `/api/admin/firm/expire-all-passwords` | expireAllFirmPasswords | admin.route.js |
| `GET` | `/api/admin/firm/password-stats` | getFirmPasswordStats | admin.route.js |
| `GET` | `/api/admin/users/:id/claims` | getUserClaims | admin.route.js |
| `PUT` | `/api/admin/users/:id/claims` | setUserClaims | admin.route.js |
| `DELETE` | `/api/admin/users/:id/claims` | deleteUserClaims | admin.route.js |
| `GET` | `/api/admin/users/:id/claims/preview` | previewTokenClaims | admin.route.js |
| `POST` | `/api/admin/users/:id/claims/validate` | validateClaims | admin.route.js |

## adminApi

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/admin-api/dashboard/summary` | getDashboardSummary | adminApi.route.js |
| `GET` | `/api/admin-api/dashboard/revenue` | getRevenueMetrics | adminApi.route.js |
| `GET` | `/api/admin-api/dashboard/active-users` | getActiveUsers | adminApi.route.js |
| `GET` | `/api/admin-api/dashboard/system-health` | getSystemHealth | adminApi.route.js |
| `GET` | `/api/admin-api/dashboard/pending-approvals` | getPendingApprovals | adminApi.route.js |
| `GET` | `/api/admin-api/dashboard/recent-activity` | getRecentActivity | adminApi.route.js |
| `GET` | `/api/admin-api/users` | listUsers | adminApi.route.js |
| `GET` | `/api/admin-api/users/export` | exportUsers | adminApi.route.js |
| `GET` | `/api/admin-api/users/:id` | getUserDetails | adminApi.route.js |
| `PATCH` | `/api/admin-api/users/:id/status` | updateUserStatus | adminApi.route.js |
| `POST` | `/api/admin-api/users/:id/revoke-tokens` | revokeUserTokens | adminApi.route.js |
| `POST` | `/api/admin-api/users/:id/reset-password` | resetUserPassword | adminApi.route.js |
| `GET` | `/api/admin-api/audit/logs` | getAuditLogs | adminApi.route.js |
| `GET` | `/api/admin-api/audit/security-events` | getSecurityEvents | adminApi.route.js |
| `GET` | `/api/admin-api/audit/compliance-report` | getComplianceReport | adminApi.route.js |
| `GET` | `/api/admin-api/audit/export` | exportAuditLogs | adminApi.route.js |
| `GET` | `/api/admin-api/audit/login-history` | getLoginHistory | adminApi.route.js |
| `GET` | `/api/admin-api/firms` | listFirms | adminApi.route.js |
| `GET` | `/api/admin-api/firms/:id` | getFirmDetails | adminApi.route.js |
| `GET` | `/api/admin-api/firms/:id/usage` | getFirmUsage | adminApi.route.js |
| `PATCH` | `/api/admin-api/firms/:id/plan` | updateFirmPlan | adminApi.route.js |
| `PATCH` | `/api/admin-api/firms/:id/suspend` | suspendFirm | adminApi.route.js |

## adminTools

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/admin/tools/users/:id/data` | getUserData | adminTools.route.js |
| `DELETE` | `/api/admin/tools/users/:id/data` | deleteUserData | adminTools.route.js |
| `GET` | `/api/admin/tools/firms/:id/export` | exportFirmData | adminTools.route.js |
| `POST` | `/api/admin/tools/firms/:id/import` | importFirmData | adminTools.route.js |
| `POST` | `/api/admin/tools/users/merge` | mergeUsers | adminTools.route.js |
| `POST` | `/api/admin/tools/clients/merge` | mergeClients | adminTools.route.js |
| `POST` | `/api/admin/tools/firms/:id/recalculate-invoices` | recalculateInvoiceTotals | adminTools.route.js |
| `POST` | `/api/admin/tools/firms/:id/reindex` | reindexSearchData | adminTools.route.js |
| `POST` | `/api/admin/tools/firms/:id/cleanup-orphaned` | cleanupOrphanedRecords | adminTools.route.js |
| `GET` | `/api/admin/tools/firms/:id/validate` | validateDataIntegrity | adminTools.route.js |
| `POST` | `/api/admin/tools/firms/:id/fix-currency` | fixCurrencyConversions | adminTools.route.js |
| `GET` | `/api/admin/tools/stats` | getSystemStats | adminTools.route.js |
| `GET` | `/api/admin/tools/activity-report` | getUserActivityReport | adminTools.route.js |
| `GET` | `/api/admin/tools/storage-usage` | getStorageUsage | adminTools.route.js |
| `POST` | `/api/admin/tools/clear-cache` | clearCache | adminTools.route.js |
| `GET` | `/api/admin/tools/diagnostics` | runDiagnostics | adminTools.route.js |
| `GET` | `/api/admin/tools/slow-queries` | getSlowQueries | adminTools.route.js |
| `POST` | `/api/admin/tools/users/:id/reset-password` | resetUserPassword | adminTools.route.js |
| `POST` | `/api/admin/tools/users/:id/impersonate` | impersonateUser | adminTools.route.js |
| `POST` | `/api/admin/tools/impersonation/:sessionId/end` | endImpersonation | adminTools.route.js |
| `POST` | `/api/admin/tools/users/:id/lock` | lockUser | adminTools.route.js |
| `POST` | `/api/admin/tools/users/:id/unlock` | unlockUser | adminTools.route.js |
| `GET` | `/api/admin/tools/users/:id/login-history` | getLoginHistory | adminTools.route.js |
| `GET` | `/api/admin/tools/key-rotation/status` | getKeyRotationStatus | adminTools.route.js |
| `GET` | `/api/admin/tools/key-rotation/check` | checkRotationNeeded | adminTools.route.js |
| `POST` | `/api/admin/tools/key-rotation/rotate` | rotateKeys | adminTools.route.js |
| `POST` | `/api/admin/tools/key-rotation/auto-rotate` | autoRotate | adminTools.route.js |
| `POST` | `/api/admin/tools/key-rotation/generate` | generateNewKey | adminTools.route.js |
| `POST` | `/api/admin/tools/key-rotation/cleanup` | cleanupExpiredKeys | adminTools.route.js |
| `POST` | `/api/admin/tools/key-rotation/initialize` | initializeKeyRotation | adminTools.route.js |

## aiChat

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/chat/providers` | getProviders | aiChat.route.js |
| `POST` | `/api/chat` | sendMessage | aiChat.route.js |
| `POST` | `/api/chat/stream` | streamMessage | aiChat.route.js |
| `GET` | `/api/chat/conversations` | getConversations | aiChat.route.js |
| `GET` | `/api/chat/conversations/:conversationId` | getConversation | aiChat.route.js |
| `PATCH` | `/api/chat/conversations/:conversationId` | updateConversationTitle | aiChat.route.js |
| `DELETE` | `/api/chat/conversations/:conversationId` | deleteConversation | aiChat.route.js |

## aiMatching

| Method | Path | Controller | File |
|--------|------|------------|------|
| `POST` | `/api/ai-matching/match` | unknown | aiMatching.route.js |
| `POST` | `/api/ai-matching/batch` | unknown | aiMatching.route.js |
| `POST` | `/api/ai-matching/auto-match` | unknown | aiMatching.route.js |
| `POST` | `/api/ai-matching/confirm` | unknown | aiMatching.route.js |
| `POST` | `/api/ai-matching/reject` | unknown | aiMatching.route.js |
| `POST` | `/api/ai-matching/unmatch` | unknown | aiMatching.route.js |
| `GET` | `/api/ai-matching/suggestions` | unknown | aiMatching.route.js |
| `POST` | `/api/ai-matching/suggestions/bulk-confirm` | unknown | aiMatching.route.js |
| `GET` | `/api/ai-matching/stats` | unknown | aiMatching.route.js |
| `GET` | `/api/ai-matching/patterns/stats` | unknown | aiMatching.route.js |
| `GET` | `/api/ai-matching/patterns` | unknown | aiMatching.route.js |
| `POST` | `/api/ai-matching/patterns/cleanup` | unknown | aiMatching.route.js |

## aiSettings

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/settings/ai` | getAISettings | aiSettings.route.js |
| `GET` | `/api/settings/ai/features` | getFeatureStatus | aiSettings.route.js |
| `GET` | `/api/settings/ai/usage` | getUsageStats | aiSettings.route.js |
| `POST` | `/api/settings/ai/keys` | saveApiKey | aiSettings.route.js |
| `POST` | `/api/settings/ai/validate` | validateApiKey | aiSettings.route.js |
| `DELETE` | `/api/settings/ai/keys/:provider` | removeApiKey | aiSettings.route.js |
| `PATCH` | `/api/settings/ai/preferences` | updatePreferences | aiSettings.route.js |

## analyticsReport

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/analytics-reports/stats` | unknown | analyticsReport.route.js |
| `GET` | `/api/analytics-reports/favorites` | unknown | analyticsReport.route.js |
| `GET` | `/api/analytics-reports/pinned` | unknown | analyticsReport.route.js |
| `GET` | `/api/analytics-reports/templates` | unknown | analyticsReport.route.js |
| `GET` | `/api/analytics-reports/section/:section` | unknown | analyticsReport.route.js |
| `POST` | `/api/analytics-reports/from-template/:templateId` | unknown | analyticsReport.route.js |
| `GET` | `/api/analytics-reports` | unknown | analyticsReport.route.js |
| `POST` | `/api/analytics-reports` | unknown | analyticsReport.route.js |
| `POST` | `/api/analytics-reports/bulk-delete` | unknown | analyticsReport.route.js |
| `GET` | `/api/analytics-reports/:id` | unknown | analyticsReport.route.js |
| `PATCH` | `/api/analytics-reports/:id` | unknown | analyticsReport.route.js |
| `PUT` | `/api/analytics-reports/:id` | unknown | analyticsReport.route.js |
| `DELETE` | `/api/analytics-reports/:id` | unknown | analyticsReport.route.js |
| `POST` | `/api/analytics-reports/:id/run` | unknown | analyticsReport.route.js |
| `POST` | `/api/analytics-reports/:id/clone` | unknown | analyticsReport.route.js |
| `POST` | `/api/analytics-reports/:id/export` | unknown | analyticsReport.route.js |
| `POST` | `/api/analytics-reports/:id/favorite` | unknown | analyticsReport.route.js |
| `POST` | `/api/analytics-reports/:id/pin` | unknown | analyticsReport.route.js |
| `POST` | `/api/analytics-reports/:id/schedule` | unknown | analyticsReport.route.js |
| `DELETE` | `/api/analytics-reports/:id/schedule` | unknown | analyticsReport.route.js |

## analyticss

| Method | Path | Controller | File |
|--------|------|------------|------|
| `POST` | `/api/analyticss/events` | trackEvent | analytics.routes.js |
| `GET` | `/api/analyticss/events/counts` | getEventCounts | analytics.routes.js |
| `GET` | `/api/analyticss/app/dashboard` | getDashboard | analytics.routes.js |
| `GET` | `/api/analyticss/app/features` | getFeatureUsage | analytics.routes.js |
| `GET` | `/api/analyticss/app/features/popular` | getPopularFeatures | analytics.routes.js |
| `GET` | `/api/analyticss/app/engagement` | getEngagement | analytics.routes.js |
| `GET` | `/api/analyticss/app/retention` | getRetention | analytics.routes.js |
| `GET` | `/api/analyticss/app/funnel` | getFunnel | analytics.routes.js |
| `GET` | `/api/analyticss/app/dropoff` | getDropoffPoints | analytics.routes.js |
| `GET` | `/api/analyticss/app/users/:userId/journey` | getUserJourney | analytics.routes.js |
| `GET` | `/api/analyticss/app/export` | exportAnalytics | analytics.routes.js |
| `GET` | `/api/analyticss/crm/dashboard` | unknown | analytics.routes.js |
| `GET` | `/api/analyticss/crm/pipeline` | unknown | analytics.routes.js |
| `GET` | `/api/analyticss/crm/sales-funnel` | unknown | analytics.routes.js |
| `GET` | `/api/analyticss/crm/forecast` | unknown | analytics.routes.js |
| `GET` | `/api/analyticss/crm/lead-sources` | unknown | analytics.routes.js |
| `GET` | `/api/analyticss/crm/win-loss` | unknown | analytics.routes.js |
| `GET` | `/api/analyticss/crm/activity` | unknown | analytics.routes.js |
| `GET` | `/api/analyticss/crm/team-performance` | unknown | analytics.routes.js |
| `GET` | `/api/analyticss/crm/territory` | unknown | analytics.routes.js |
| `GET` | `/api/analyticss/crm/campaign-roi` | unknown | analytics.routes.js |
| `GET` | `/api/analyticss/crm/first-response` | unknown | analytics.routes.js |
| `GET` | `/api/analyticss/crm/conversion-rates` | unknown | analytics.routes.js |
| `GET` | `/api/analyticss/crm/cohort` | unknown | analytics.routes.js |
| `GET` | `/api/analyticss/crm/revenue` | unknown | analytics.routes.js |
| `GET` | `/api/analyticss/crm/forecast-accuracy` | unknown | analytics.routes.js |

## answer

| Method | Path | Controller | File |
|--------|------|------------|------|
| `POST` | `/api/answers` | createAnswer | answer.route.js |
| `GET` | `/api/answers/:questionId` | getAnswers | answer.route.js |
| `PATCH` | `/api/answers/:_id` | updateAnswer | answer.route.js |
| `DELETE` | `/api/answers/:_id` | deleteAnswer | answer.route.js |
| `POST` | `/api/answers/like/:_id` | likeAnswer | answer.route.js |
| `PATCH` | `/api/answers/verify/:_id` | verifyAnswer | answer.route.js |

## apiKey

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/api-keys` | unknown | apiKey.route.js |
| `GET` | `/api/api-keys/stats` | unknown | apiKey.route.js |
| `GET` | `/api/api-keys/:id` | unknown | apiKey.route.js |
| `POST` | `/api/api-keys` | unknown | apiKey.route.js |
| `PATCH` | `/api/api-keys/:id` | unknown | apiKey.route.js |
| `DELETE` | `/api/api-keys/:id` | unknown | apiKey.route.js |
| `POST` | `/api/api-keys/:id/regenerate` | unknown | apiKey.route.js |

## appointment

| Method | Path | Controller | File |
|--------|------|------------|------|
| `POST` | `/api/appointments/book/:firmId` | unknown | appointment.route.js |
| `GET` | `/api/appointments/available-slots` | unknown | appointment.route.js |
| `GET` | `/api/appointments/:id/calendar.ics` | unknown | appointment.route.js |
| `GET` | `/api/appointments/availability` | unknown | appointment.route.js |
| `POST` | `/api/appointments/availability` | unknown | appointment.route.js |
| `POST` | `/api/appointments/availability/bulk` | unknown | appointment.route.js |
| `PUT` | `/api/appointments/availability/:id` | unknown | appointment.route.js |
| `DELETE` | `/api/appointments/availability/:id` | unknown | appointment.route.js |
| `GET` | `/api/appointments/blocked-times` | unknown | appointment.route.js |
| `POST` | `/api/appointments/blocked-times` | unknown | appointment.route.js |
| `DELETE` | `/api/appointments/blocked-times/:id` | unknown | appointment.route.js |
| `GET` | `/api/appointments/settings` | unknown | appointment.route.js |
| `PUT` | `/api/appointments/settings` | unknown | appointment.route.js |
| `GET` | `/api/appointments/stats` | unknown | appointment.route.js |
| `GET` | `/api/appointments/debug` | unknown | appointment.route.js |
| `GET` | `/api/appointments/calendar-status` | unknown | appointment.route.js |
| `GET` | `/api/appointments/:id/calendar-links` | unknown | appointment.route.js |
| `POST` | `/api/appointments/:id/sync-calendar` | unknown | appointment.route.js |
| `GET` | `/api/appointments` | unknown | appointment.route.js |
| `GET` | `/api/appointments/slots` | unknown | appointment.route.js |
| `GET` | `/api/appointments/:id` | unknown | appointment.route.js |
| `POST` | `/api/appointments` | unknown | appointment.route.js |
| `PUT` | `/api/appointments/:id` | unknown | appointment.route.js |
| `PUT` | `/api/appointments/:id/confirm` | unknown | appointment.route.js |
| `PUT` | `/api/appointments/:id/complete` | unknown | appointment.route.js |
| `PUT` | `/api/appointments/:id/no-show` | unknown | appointment.route.js |
| `POST` | `/api/appointments/:id/reschedule` | unknown | appointment.route.js |
| `DELETE` | `/api/appointments/:id` | unknown | appointment.route.js |

## approval

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/approvals/rules` | getApprovalRules | approval.route.js |
| `PUT` | `/api/approvals/rules` | updateApprovalRules | approval.route.js |
| `GET` | `/api/approvals/pending` | getPendingApprovals | approval.route.js |
| `GET` | `/api/approvals/history` | getApprovalHistory | approval.route.js |
| `GET` | `/api/approvals/:id` | getApprovalRequest | approval.route.js |
| `POST` | `/api/approvals/:id/approve` | approveRequest | approval.route.js |
| `POST` | `/api/approvals/:id/reject` | rejectRequest | approval.route.js |
| `POST` | `/api/approvals/:id/cancel` | cancelApproval | approval.route.js |

## approvals

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/approvals/workflows` | unknown | approval.routes.js |
| `POST` | `/api/approvals/workflows` | unknown | approval.routes.js |
| `GET` | `/api/approvals/workflows/:id` | unknown | approval.routes.js |
| `PUT` | `/api/approvals/workflows/:id` | unknown | approval.routes.js |
| `DELETE` | `/api/approvals/workflows/:id` | unknown | approval.routes.js |
| `POST` | `/api/approvals/initiate` | unknown | approval.routes.js |
| `GET` | `/api/approvals/pending` | unknown | approval.routes.js |
| `POST` | `/api/approvals/:id/decide` | unknown | approval.routes.js |
| `POST` | `/api/approvals/:id/cancel` | unknown | approval.routes.js |
| `POST` | `/api/approvals/:id/delegate` | unknown | approval.routes.js |
| `GET` | `/api/approvals/history/:entityType/:entityId` | unknown | approval.routes.js |

## approvalsExtended

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/approvals/templates` | unknown | approvalsExtended.route.js |
| `POST` | `/api/approvals/templates` | unknown | approvalsExtended.route.js |
| `GET` | `/api/approvals/templates/:id` | unknown | approvalsExtended.route.js |
| `PUT` | `/api/approvals/templates/:id` | unknown | approvalsExtended.route.js |
| `DELETE` | `/api/approvals/templates/:id` | unknown | approvalsExtended.route.js |
| `GET` | `/api/approvals/my-requests` | unknown | approvalsExtended.route.js |
| `GET` | `/api/approvals/stats` | unknown | approvalsExtended.route.js |
| `POST` | `/api/approvals/check` | unknown | approvalsExtended.route.js |
| `DELETE` | `/api/approvals/rules/:ruleId` | unknown | approvalsExtended.route.js |
| `GET` | `/api/approvals/pending` | unknown | approvalsExtended.route.js |
| `GET` | `/api/approvals/history` | unknown | approvalsExtended.route.js |

## apps

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/apps/categories` | getCategories | apps.route.js |
| `GET` | `/api/apps` | unknown | apps.route.js |
| `GET` | `/api/apps/stats` | unknown | apps.route.js |
| `GET` | `/api/apps/:appId` | unknown | apps.route.js |
| `POST` | `/api/apps/:appId/connect` | unknown | apps.route.js |
| `POST` | `/api/apps/:appId/disconnect` | unknown | apps.route.js |
| `GET` | `/api/apps/:appId/settings` | unknown | apps.route.js |
| `PUT` | `/api/apps/:appId/settings` | unknown | apps.route.js |
| `POST` | `/api/apps/:appId/sync` | unknown | apps.route.js |
| `POST` | `/api/apps/:appId/test` | unknown | apps.route.js |

## arAging

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/ar-aging/report` | getAgingReport | arAging.route.js |
| `GET` | `/api/ar-aging/summary` | getAgingSummary | arAging.route.js |
| `GET` | `/api/ar-aging/client/:clientId` | getAgingByClient | arAging.route.js |
| `GET` | `/api/ar-aging/forecast` | getCollectionForecast | arAging.route.js |
| `GET` | `/api/ar-aging/priority/:invoiceId` | getCollectionPriorityScore | arAging.route.js |
| `GET` | `/api/ar-aging/export` | exportAgingReport | arAging.route.js |

## assetAssignment

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/hr/asset-assignments/stats` | unknown | assetAssignment.route.js |
| `GET` | `/api/hr/asset-assignments/overdue` | unknown | assetAssignment.route.js |
| `GET` | `/api/hr/asset-assignments/maintenance-due` | unknown | assetAssignment.route.js |
| `GET` | `/api/hr/asset-assignments/warranty-expiring` | unknown | assetAssignment.route.js |
| `GET` | `/api/hr/asset-assignments/export` | unknown | assetAssignment.route.js |
| `GET` | `/api/hr/asset-assignments/policies` | unknown | assetAssignment.route.js |
| `POST` | `/api/hr/asset-assignments/bulk-delete` | unknown | assetAssignment.route.js |
| `GET` | `/api/hr/asset-assignments/by-employee/:employeeId` | unknown | assetAssignment.route.js |
| `GET` | `/api/hr/asset-assignments` | unknown | assetAssignment.route.js |
| `POST` | `/api/hr/asset-assignments` | unknown | assetAssignment.route.js |
| `GET` | `/api/hr/asset-assignments/:id` | unknown | assetAssignment.route.js |
| `PATCH` | `/api/hr/asset-assignments/:id` | unknown | assetAssignment.route.js |
| `DELETE` | `/api/hr/asset-assignments/:id` | unknown | assetAssignment.route.js |
| `POST` | `/api/hr/asset-assignments/:id/acknowledge` | unknown | assetAssignment.route.js |
| `POST` | `/api/hr/asset-assignments/:id/return/initiate` | unknown | assetAssignment.route.js |
| `POST` | `/api/hr/asset-assignments/:id/return/complete` | unknown | assetAssignment.route.js |
| `PUT` | `/api/hr/asset-assignments/:id/status` | unknown | assetAssignment.route.js |
| `POST` | `/api/hr/asset-assignments/:id/transfer` | unknown | assetAssignment.route.js |
| `POST` | `/api/hr/asset-assignments/:id/clearance` | unknown | assetAssignment.route.js |
| `POST` | `/api/hr/asset-assignments/:id/maintenance` | unknown | assetAssignment.route.js |
| `POST` | `/api/hr/asset-assignments/:id/repair` | unknown | assetAssignment.route.js |
| `PUT` | `/api/hr/asset-assignments/:id/repair/:repairId` | unknown | assetAssignment.route.js |
| `POST` | `/api/hr/asset-assignments/:id/incident` | unknown | assetAssignment.route.js |

## assets

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/assets/stats` | unknown | assets.route.js |
| `GET` | `/api/assets/categories` | unknown | assets.route.js |
| `POST` | `/api/assets/categories` | unknown | assets.route.js |
| `GET` | `/api/assets/categories/:id` | unknown | assets.route.js |
| `PUT` | `/api/assets/categories/:id` | unknown | assets.route.js |
| `DELETE` | `/api/assets/categories/:id` | unknown | assets.route.js |
| `GET` | `/api/assets/maintenance` | unknown | assets.route.js |
| `POST` | `/api/assets/maintenance` | unknown | assets.route.js |
| `GET` | `/api/assets/maintenance/:id` | unknown | assets.route.js |
| `PUT` | `/api/assets/maintenance/:id` | unknown | assets.route.js |
| `POST` | `/api/assets/maintenance/:id/complete` | unknown | assets.route.js |
| `GET` | `/api/assets/movements` | unknown | assets.route.js |
| `POST` | `/api/assets/movements` | unknown | assets.route.js |
| `GET` | `/api/assets/settings` | unknown | assets.route.js |
| `PUT` | `/api/assets/settings` | unknown | assets.route.js |
| `GET` | `/api/assets` | unknown | assets.route.js |
| `POST` | `/api/assets` | unknown | assets.route.js |
| `GET` | `/api/assets/:id` | unknown | assets.route.js |
| `PUT` | `/api/assets/:id` | unknown | assets.route.js |
| `POST` | `/api/assets/:id/submit` | unknown | assets.route.js |
| `DELETE` | `/api/assets/:id` | unknown | assets.route.js |

## assetsExtended

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/assets/:assetId/depreciation` | unknown | assetsExtended.route.js |
| `POST` | `/api/assets/:assetId/depreciation/calculate` | unknown | assetsExtended.route.js |
| `GET` | `/api/assets/:assetId/maintenance` | unknown | assetsExtended.route.js |
| `POST` | `/api/assets/:assetId/maintenance` | unknown | assetsExtended.route.js |
| `GET` | `/api/assets/:assetId/maintenance/:scheduleId` | unknown | assetsExtended.route.js |
| `PUT` | `/api/assets/:assetId/maintenance/:scheduleId` | unknown | assetsExtended.route.js |
| `DELETE` | `/api/assets/:assetId/maintenance/:scheduleId` | unknown | assetsExtended.route.js |
| `POST` | `/api/assets/:assetId/maintenance/:scheduleId/complete` | unknown | assetsExtended.route.js |
| `POST` | `/api/assets/:id/sell` | unknown | assetsExtended.route.js |
| `POST` | `/api/assets/:id/scrap` | unknown | assetsExtended.route.js |
| `GET` | `/api/assets/repairs` | unknown | assetsExtended.route.js |
| `POST` | `/api/assets/repairs` | unknown | assetsExtended.route.js |
| `GET` | `/api/assets/repairs/:id` | unknown | assetsExtended.route.js |
| `PUT` | `/api/assets/repairs/:id` | unknown | assetsExtended.route.js |
| `POST` | `/api/assets/repairs/:id/complete` | unknown | assetsExtended.route.js |

## attendance

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/attendance/today` | unknown | attendance.route.js |
| `GET` | `/api/attendance/violations` | unknown | attendance.route.js |
| `GET` | `/api/attendance/corrections/pending` | unknown | attendance.route.js |
| `GET` | `/api/attendance/report/monthly` | unknown | attendance.route.js |
| `GET` | `/api/attendance/stats/department` | unknown | attendance.route.js |
| `POST` | `/api/attendance/check-in` | unknown | attendance.route.js |
| `POST` | `/api/attendance/check-out` | unknown | attendance.route.js |
| `POST` | `/api/attendance/mark-absences` | unknown | attendance.route.js |
| `POST` | `/api/attendance/import` | unknown | attendance.route.js |
| `GET` | `/api/attendance/status/:employeeId` | unknown | attendance.route.js |
| `GET` | `/api/attendance/summary/:employeeId` | unknown | attendance.route.js |
| `GET` | `/api/attendance/employee/:employeeId/date/:date` | unknown | attendance.route.js |
| `GET` | `/api/attendance` | unknown | attendance.route.js |
| `POST` | `/api/attendance` | unknown | attendance.route.js |
| `GET` | `/api/attendance/:id` | unknown | attendance.route.js |
| `PUT` | `/api/attendance/:id` | unknown | attendance.route.js |
| `DELETE` | `/api/attendance/:id` | unknown | attendance.route.js |
| `POST` | `/api/attendance/:id/break/start` | unknown | attendance.route.js |
| `POST` | `/api/attendance/:id/break/end` | unknown | attendance.route.js |
| `GET` | `/api/attendance/:id/breaks` | unknown | attendance.route.js |
| `POST` | `/api/attendance/:id/corrections` | unknown | attendance.route.js |
| `PUT` | `/api/attendance/:id/corrections/:correctionId` | unknown | attendance.route.js |
| `POST` | `/api/attendance/:id/approve` | unknown | attendance.route.js |
| `POST` | `/api/attendance/:id/reject` | unknown | attendance.route.js |
| `POST` | `/api/attendance/:id/violations` | unknown | attendance.route.js |
| `PUT` | `/api/attendance/:id/violations/:violationIndex/resolve` | unknown | attendance.route.js |
| `POST` | `/api/attendance/:id/violations/:violationIndex/appeal` | unknown | attendance.route.js |
| `POST` | `/api/attendance/:id/overtime/approve` | unknown | attendance.route.js |

## attendanceExtended

| Method | Path | Controller | File |
|--------|------|------------|------|
| `POST` | `/api/attendance/:recordId/approve-early-departure` | unknown | attendanceExtended.route.js |
| `POST` | `/api/attendance/:recordId/approve-overtime` | unknown | attendanceExtended.route.js |
| `POST` | `/api/attendance/:recordId/approve-timesheet` | unknown | attendanceExtended.route.js |
| `POST` | `/api/attendance/:recordId/reject-timesheet` | unknown | attendanceExtended.route.js |
| `POST` | `/api/attendance/:recordId/excuse-late` | unknown | attendanceExtended.route.js |
| `POST` | `/api/attendance/:recordId/violations/:violationId/confirm` | unknown | attendanceExtended.route.js |
| `POST` | `/api/attendance/:recordId/violations/:violationId/dismiss` | unknown | attendanceExtended.route.js |
| `POST` | `/api/attendance/bulk` | unknown | attendanceExtended.route.js |
| `GET` | `/api/attendance/compliance-report` | unknown | attendanceExtended.route.js |
| `GET` | `/api/attendance/daily-summary` | unknown | attendanceExtended.route.js |
| `GET` | `/api/attendance/employee-summary/:employeeId` | unknown | attendanceExtended.route.js |
| `POST` | `/api/attendance/lock-for-payroll` | unknown | attendanceExtended.route.js |
| `GET` | `/api/attendance/stats` | unknown | attendanceExtended.route.js |

## audit

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/audit` | getAuditLog | audit.route.js |
| `GET` | `/api/audit/export` | exportAuditLog | audit.route.js |
| `GET` | `/api/audit/stats` | getAuditStats | audit.route.js |
| `GET` | `/api/audit/options` | getAuditOptions | audit.route.js |
| `GET` | `/api/audit/user/:userId` | getUserAuditLog | audit.route.js |

## auditLog

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/audit-logs` | unknown | auditLog.route.js |
| `GET` | `/api/audit-logs/entity/:type/:id` | unknown | auditLog.route.js |
| `GET` | `/api/audit-logs/user/:id` | unknown | auditLog.route.js |
| `GET` | `/api/audit-logs/security` | unknown | auditLog.route.js |
| `GET` | `/api/audit-logs/export` | unknown | auditLog.route.js |
| `GET` | `/api/audit-logs/failed-logins` | unknown | auditLog.route.js |
| `GET` | `/api/audit-logs/suspicious` | unknown | auditLog.route.js |
| `POST` | `/api/audit-logs/check-brute-force` | unknown | auditLog.route.js |
| `GET` | `/api/audit-logs/summary` | unknown | auditLog.route.js |
| `GET` | `/api/audit-logs/security-events` | unknown | auditLog.route.js |
| `GET` | `/api/audit-logs/compliance-report` | unknown | auditLog.route.js |
| `GET` | `/api/audit-logs/archiving/stats` | unknown | auditLog.route.js |
| `GET` | `/api/audit-logs/archiving/summary` | unknown | auditLog.route.js |
| `POST` | `/api/audit-logs/archiving/run` | unknown | auditLog.route.js |
| `POST` | `/api/audit-logs/archiving/verify` | unknown | auditLog.route.js |
| `POST` | `/api/audit-logs/archiving/restore` | unknown | auditLog.route.js |
| `POST` | `/api/audit-logs/log-with-diff` | unknown | auditLog.route.js |
| `POST` | `/api/audit-logs/log-bulk-action` | unknown | auditLog.route.js |
| `POST` | `/api/audit-logs/log-security-event` | unknown | auditLog.route.js |
| `GET` | `/api/audit-logs/search` | unknown | auditLog.route.js |
| `GET` | `/api/audit-logs/by-action/:action` | unknown | auditLog.route.js |
| `GET` | `/api/audit-logs/by-date-range` | unknown | auditLog.route.js |
| `GET` | `/api/audit-logs/analytics/activity-summary` | unknown | auditLog.route.js |
| `GET` | `/api/audit-logs/analytics/top-users` | unknown | auditLog.route.js |
| `GET` | `/api/audit-logs/analytics/top-actions` | unknown | auditLog.route.js |
| `GET` | `/api/audit-logs/analytics/anomalies` | unknown | auditLog.route.js |
| `POST` | `/api/audit-logs/compliance/generate-report` | unknown | auditLog.route.js |
| `POST` | `/api/audit-logs/compliance/verify-integrity` | unknown | auditLog.route.js |
| `POST` | `/api/audit-logs/compliance/export-for-audit` | unknown | auditLog.route.js |
| `GET` | `/api/audit-logs/compliance/retention-status` | unknown | auditLog.route.js |
| `GET` | `/api/audit-logs/archive/stats` | unknown | auditLog.route.js |
| `POST` | `/api/audit-logs/archive/run` | unknown | auditLog.route.js |
| `POST` | `/api/audit-logs/archive/verify` | unknown | auditLog.route.js |

## auditLogsExtended

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/audit-logs/stats` | unknown | auditLogsExtended.route.js |
| `POST` | `/api/audit-logs/batch` | unknown | auditLogsExtended.route.js |
| `GET` | `/api/audit-logs/resource/:resource/:resourceId` | unknown | auditLogsExtended.route.js |
| `GET` | `/api/audit-logs/user/:userId` | unknown | auditLogsExtended.route.js |
| `GET` | `/api/audit-logs/export` | unknown | auditLogsExtended.route.js |
| `GET` | `/api/audit-logs/recent` | unknown | auditLogsExtended.route.js |

## auth

| Method | Path | Controller | File |
|--------|------|------------|------|
| `POST` | `/api/auth/check-availability` | checkAvailability | auth.route.js |
| `POST` | `/api/auth/register` | authRegister | auth.route.js |
| `POST` | `/api/auth/anonymous` | anonymousLogin | auth.route.js |
| `POST` | `/api/auth/anonymous/convert` | convertAnonymousUser | auth.route.js |
| `POST` | `/api/auth/login` | authLogin | auth.route.js |
| `POST` | `/api/auth/google/one-tap` | authenticateWithOneTap | auth.route.js |
| `POST` | `/api/auth/logout` | authLogout | auth.route.js |
| `POST` | `/api/auth/logout-all` | authLogoutAll | auth.route.js |
| `POST` | `/api/auth/refresh` | refreshAccessToken | auth.route.js |
| `GET` | `/api/auth/me` | authStatus | auth.route.js |
| `GET` | `/api/auth/onboarding-status` | getOnboardingStatus | auth.route.js |
| `POST` | `/api/auth/send-otp` | sendOTP | auth.route.js |
| `POST` | `/api/auth/verify-otp` | verifyOTP | auth.route.js |
| `POST` | `/api/auth/resend-otp` | resendOTP | auth.route.js |
| `GET` | `/api/auth/otp-status` | checkOTPStatus | auth.route.js |
| `POST` | `/api/auth/phone/send-otp` | sendPhoneOTP | auth.route.js |
| `POST` | `/api/auth/phone/verify-otp` | verifyPhoneOTP | auth.route.js |
| `POST` | `/api/auth/phone/resend-otp` | resendPhoneOTP | auth.route.js |
| `GET` | `/api/auth/phone/otp-status` | checkPhoneOTPStatus | auth.route.js |
| `POST` | `/api/auth/magic-link/send` | sendMagicLink | auth.route.js |
| `POST` | `/api/auth/magic-link/verify` | verifyMagicLink | auth.route.js |
| `POST` | `/api/auth/mfa/backup-codes/generate` | generateBackupCodes | auth.route.js |
| `POST` | `/api/auth/mfa/backup-codes/verify` | verifyBackupCode | auth.route.js |
| `POST` | `/api/auth/mfa/backup-codes/regenerate` | regenerateBackupCodes | auth.route.js |
| `GET` | `/api/auth/mfa/backup-codes/count` | getBackupCodesCount | auth.route.js |
| `GET` | `/api/auth/mfa/status` | getMFAStatus | auth.route.js |
| `GET` | `/api/auth/sessions` | getActiveSessions | auth.route.js |
| `GET` | `/api/auth/sessions/current` | getCurrentSession | auth.route.js |
| `GET` | `/api/auth/sessions/stats` | getSessionStats | auth.route.js |
| `DELETE` | `/api/auth/sessions/:id` | terminateSession | auth.route.js |
| `DELETE` | `/api/auth/sessions` | terminateAllOtherSessions | auth.route.js |
| `POST` | `/api/auth/change-password` | changePassword | auth.route.js |
| `GET` | `/api/auth/password-status` | getPasswordStatus | auth.route.js |
| `POST` | `/api/auth/forgot-password` | forgotPassword | auth.route.js |
| `POST` | `/api/auth/reset-password` | resetPassword | auth.route.js |
| `POST` | `/api/auth/verify-email` | verifyEmail | auth.route.js |
| `POST` | `/api/auth/resend-verification` | resendVerificationEmail | auth.route.js |
| `GET` | `/api/auth/csrf` | getCSRFToken | auth.route.js |
| `POST` | `/api/auth/reauthenticate` | reauthenticate | auth.route.js |
| `POST` | `/api/auth/reauthenticate/challenge` | createReauthChallenge | auth.route.js |
| `POST` | `/api/auth/reauthenticate/verify` | verifyReauthChallenge | auth.route.js |
| `GET` | `/api/auth/reauthenticate/status` | getReauthStatus | auth.route.js |

## authExtended

| Method | Path | Controller | File |
|--------|------|------------|------|
| `POST` | `/api/auth/refresh-activity` | unknown | authExtended.route.js |
| `POST` | `/api/auth/anonymous/extend` | unknown | authExtended.route.js |
| `POST` | `/api/auth/captcha/verify` | unknown | authExtended.route.js |
| `GET` | `/api/auth/captcha/settings` | unknown | authExtended.route.js |
| `PUT` | `/api/auth/captcha/settings` | unknown | authExtended.route.js |
| `POST` | `/api/auth/captcha/check-required` | unknown | authExtended.route.js |
| `POST` | `/api/auth/mfa/sms/send` | unknown | authExtended.route.js |
| `POST` | `/api/auth/mfa/email/send` | unknown | authExtended.route.js |
| `GET` | `/api/auth/mfa/required` | unknown | authExtended.route.js |
| `POST` | `/api/auth/onboarding-progress` | unknown | authExtended.route.js |
| `POST` | `/api/auth/onboarding/company-info` | unknown | authExtended.route.js |
| `POST` | `/api/auth/onboarding/company-logo` | unknown | authExtended.route.js |
| `POST` | `/api/auth/onboarding/user-profile` | unknown | authExtended.route.js |
| `POST` | `/api/auth/onboarding/user-avatar` | unknown | authExtended.route.js |
| `POST` | `/api/auth/onboarding/modules` | unknown | authExtended.route.js |
| `POST` | `/api/auth/onboarding/complete` | unknown | authExtended.route.js |
| `POST` | `/api/auth/onboarding/skip` | unknown | authExtended.route.js |
| `GET` | `/api/auth/reset-password/validate` | unknown | authExtended.route.js |
| `POST` | `/api/auth/password/check-breach` | unknown | authExtended.route.js |
| `POST` | `/api/auth/phone/verify` | unknown | authExtended.route.js |
| `POST` | `/api/auth/sessions/extend` | unknown | authExtended.route.js |
| `POST` | `/api/auth/sessions/:sessionId/report` | unknown | authExtended.route.js |
| `DELETE` | `/api/auth/sessions/:sessionId/report` | unknown | authExtended.route.js |
| `GET` | `/api/auth/reauthenticate/methods` | unknown | authExtended.route.js |

## automatedActions

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/automatedActions/models` | getAvailableModels | automatedAction.routes.js |
| `GET` | `/api/automatedActions/models/:modelName/fields` | getModelFields | automatedAction.routes.js |
| `GET` | `/api/automatedActions/logs` | getAllLogs | automatedAction.routes.js |
| `POST` | `/api/automatedActions/bulk/enable` | bulkEnable | automatedAction.routes.js |
| `POST` | `/api/automatedActions/bulk/disable` | bulkDisable | automatedAction.routes.js |
| `DELETE` | `/api/automatedActions/bulk` | bulkDelete | automatedAction.routes.js |
| `GET` | `/api/automatedActions` | getActions | automatedAction.routes.js |
| `POST` | `/api/automatedActions` | createAction | automatedAction.routes.js |
| `GET` | `/api/automatedActions/:id` | getAction | automatedAction.routes.js |
| `PATCH` | `/api/automatedActions/:id` | updateAction | automatedAction.routes.js |
| `DELETE` | `/api/automatedActions/:id` | deleteAction | automatedAction.routes.js |
| `POST` | `/api/automatedActions/:id/toggle` | toggleActive | automatedAction.routes.js |
| `POST` | `/api/automatedActions/:id/test` | testAction | automatedAction.routes.js |
| `GET` | `/api/automatedActions/:id/logs` | getActionLogs | automatedAction.routes.js |
| `POST` | `/api/automatedActions/:id/duplicate` | duplicateAction | automatedAction.routes.js |

## automatedActionsExtended

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/automated-actions` | unknown | automatedActionsExtended.route.js |
| `POST` | `/api/automated-actions` | unknown | automatedActionsExtended.route.js |
| `GET` | `/api/automated-actions/:id` | unknown | automatedActionsExtended.route.js |
| `PUT` | `/api/automated-actions/:id` | unknown | automatedActionsExtended.route.js |
| `DELETE` | `/api/automated-actions/:id` | unknown | automatedActionsExtended.route.js |
| `POST` | `/api/automated-actions/:id/toggle` | unknown | automatedActionsExtended.route.js |
| `POST` | `/api/automated-actions/:id/test` | unknown | automatedActionsExtended.route.js |
| `POST` | `/api/automated-actions/:id/duplicate` | unknown | automatedActionsExtended.route.js |
| `GET` | `/api/automated-actions/:actionId/logs` | unknown | automatedActionsExtended.route.js |
| `GET` | `/api/automated-actions/logs` | unknown | automatedActionsExtended.route.js |
| `POST` | `/api/automated-actions/bulk` | unknown | automatedActionsExtended.route.js |
| `POST` | `/api/automated-actions/bulk/enable` | unknown | automatedActionsExtended.route.js |
| `POST` | `/api/automated-actions/bulk/disable` | unknown | automatedActionsExtended.route.js |
| `DELETE` | `/api/automated-actions/bulk` | unknown | automatedActionsExtended.route.js |
| `GET` | `/api/automated-actions/models` | unknown | automatedActionsExtended.route.js |
| `GET` | `/api/automated-actions/models/:modelName/fields` | unknown | automatedActionsExtended.route.js |

## automations

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/automations` | unknown | automation.routes.js |
| `POST` | `/api/automations` | unknown | automation.routes.js |
| `GET` | `/api/automations/:id` | unknown | automation.routes.js |
| `PUT` | `/api/automations/:id` | unknown | automation.routes.js |
| `DELETE` | `/api/automations/:id` | unknown | automation.routes.js |
| `POST` | `/api/automations/:id/enable` | unknown | automation.routes.js |
| `POST` | `/api/automations/:id/disable` | unknown | automation.routes.js |
| `POST` | `/api/automations/:id/test` | unknown | automation.routes.js |
| `GET` | `/api/automations/:id/stats` | unknown | automation.routes.js |
| `GET` | `/api/automations/:id/logs` | unknown | automation.routes.js |

## bankAccount

| Method | Path | Controller | File |
|--------|------|------------|------|
| `POST` | `/api/bank-accounts` | createBankAccount | bankAccount.route.js |
| `GET` | `/api/bank-accounts` | getBankAccounts | bankAccount.route.js |
| `GET` | `/api/bank-accounts/summary` | getSummary | bankAccount.route.js |
| `GET` | `/api/bank-accounts/:id` | getBankAccount | bankAccount.route.js |
| `PUT` | `/api/bank-accounts/:id` | updateBankAccount | bankAccount.route.js |
| `DELETE` | `/api/bank-accounts/:id` | deleteBankAccount | bankAccount.route.js |
| `POST` | `/api/bank-accounts/:id/set-default` | setDefault | bankAccount.route.js |
| `GET` | `/api/bank-accounts/:id/balance-history` | getBalanceHistory | bankAccount.route.js |
| `POST` | `/api/bank-accounts/:id/sync` | syncAccount | bankAccount.route.js |
| `POST` | `/api/bank-accounts/:id/disconnect` | disconnectAccount | bankAccount.route.js |

## bankReconciliation

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/bank-reconciliation/feeds` | getBankFeeds | bankReconciliation.route.js |
| `POST` | `/api/bank-reconciliation/feeds` | createBankFeed | bankReconciliation.route.js |
| `PUT` | `/api/bank-reconciliation/feeds/:id` | updateBankFeed | bankReconciliation.route.js |
| `DELETE` | `/api/bank-reconciliation/feeds/:id` | deleteBankFeed | bankReconciliation.route.js |
| `POST` | `/api/bank-reconciliation/import/csv` | importCSV | bankReconciliation.route.js |
| `POST` | `/api/bank-reconciliation/import/ofx` | importOFX | bankReconciliation.route.js |
| `GET` | `/api/bank-reconciliation/import/template` | getCSVTemplate | bankReconciliation.route.js |
| `GET` | `/api/bank-reconciliation/suggestions/:accountId` | getMatchSuggestions | bankReconciliation.route.js |
| `POST` | `/api/bank-reconciliation/auto-match/:accountId` | autoMatch | bankReconciliation.route.js |
| `POST` | `/api/bank-reconciliation/match/confirm/:id` | confirmMatch | bankReconciliation.route.js |
| `POST` | `/api/bank-reconciliation/match/reject/:id` | rejectMatch | bankReconciliation.route.js |
| `POST` | `/api/bank-reconciliation/match/split` | createSplitMatch | bankReconciliation.route.js |
| `DELETE` | `/api/bank-reconciliation/match/:id` | unmatch | bankReconciliation.route.js |
| `POST` | `/api/bank-reconciliation/rules` | createRule | bankReconciliation.route.js |
| `GET` | `/api/bank-reconciliation/rules` | getRules | bankReconciliation.route.js |
| `PUT` | `/api/bank-reconciliation/rules/:id` | updateRule | bankReconciliation.route.js |
| `DELETE` | `/api/bank-reconciliation/rules/:id` | deleteRule | bankReconciliation.route.js |
| `POST` | `/api/bank-reconciliation` | createReconciliation | bankReconciliation.route.js |
| `GET` | `/api/bank-reconciliation` | getReconciliations | bankReconciliation.route.js |
| `GET` | `/api/bank-reconciliation/:id` | getReconciliation | bankReconciliation.route.js |
| `POST` | `/api/bank-reconciliation/:id/clear` | clearTransaction | bankReconciliation.route.js |
| `POST` | `/api/bank-reconciliation/:id/unclear` | unclearTransaction | bankReconciliation.route.js |
| `POST` | `/api/bank-reconciliation/:id/complete` | completeReconciliation | bankReconciliation.route.js |
| `POST` | `/api/bank-reconciliation/:id/cancel` | cancelReconciliation | bankReconciliation.route.js |
| `GET` | `/api/bank-reconciliation/status/:accountId` | getReconciliationStatus | bankReconciliation.route.js |
| `GET` | `/api/bank-reconciliation/unmatched/:accountId` | getUnmatchedTransactions | bankReconciliation.route.js |
| `GET` | `/api/bank-reconciliation/statistics/matches` | getMatchStatistics | bankReconciliation.route.js |
| `GET` | `/api/bank-reconciliation/statistics/rules` | getRuleStatistics | bankReconciliation.route.js |
| `GET` | `/api/bank-reconciliation/currency/rates` | getExchangeRates | bankReconciliation.route.js |
| `POST` | `/api/bank-reconciliation/currency/convert` | convertAmount | bankReconciliation.route.js |
| `POST` | `/api/bank-reconciliation/currency/rates` | setManualRate | bankReconciliation.route.js |
| `GET` | `/api/bank-reconciliation/currency/supported` | getSupportedCurrencies | bankReconciliation.route.js |
| `POST` | `/api/bank-reconciliation/currency/update` | updateRatesFromAPI | bankReconciliation.route.js |

## bankTransaction

| Method | Path | Controller | File |
|--------|------|------------|------|
| `POST` | `/api/bank-transactions` | createTransaction | bankTransaction.route.js |
| `GET` | `/api/bank-transactions` | getTransactions | bankTransaction.route.js |
| `GET` | `/api/bank-transactions/:id` | getTransaction | bankTransaction.route.js |
| `POST` | `/api/bank-transactions/:transactionId/match` | matchTransaction | bankTransaction.route.js |
| `POST` | `/api/bank-transactions/:transactionId/unmatch` | unmatchTransaction | bankTransaction.route.js |
| `POST` | `/api/bank-transactions/import/:accountId` | importTransactions | bankTransaction.route.js |

## bankTransfer

| Method | Path | Controller | File |
|--------|------|------------|------|
| `POST` | `/api/bank-transfers` | createTransfer | bankTransfer.route.js |
| `GET` | `/api/bank-transfers` | getTransfers | bankTransfer.route.js |
| `GET` | `/api/bank-transfers/:id` | getTransfer | bankTransfer.route.js |
| `POST` | `/api/bank-transfers/:id/cancel` | cancelTransfer | bankTransfer.route.js |

## bill

| Method | Path | Controller | File |
|--------|------|------------|------|
| `POST` | `/api/bills` | createBill | bill.route.js |
| `GET` | `/api/bills` | getBills | bill.route.js |
| `GET` | `/api/bills/overdue` | getOverdueBills | bill.route.js |
| `GET` | `/api/bills/summary` | getSummary | bill.route.js |
| `GET` | `/api/bills/recurring` | getRecurringBills | bill.route.js |
| `GET` | `/api/bills/reports/aging` | getAgingReport | bill.route.js |
| `GET` | `/api/bills/export` | exportBills | bill.route.js |
| `GET` | `/api/bills/:id` | getBill | bill.route.js |
| `PUT` | `/api/bills/:id` | updateBill | bill.route.js |
| `DELETE` | `/api/bills/:id` | deleteBill | bill.route.js |
| `POST` | `/api/bills/:id/receive` | receiveBill | bill.route.js |
| `POST` | `/api/bills/:id/cancel` | cancelBill | bill.route.js |
| `POST` | `/api/bills/:id/duplicate` | duplicateBill | bill.route.js |
| `POST` | `/api/bills/:id/stop-recurring` | stopRecurring | bill.route.js |
| `POST` | `/api/bills/:id/generate-next` | generateNextBill | bill.route.js |
| `POST` | `/api/bills/:id/approve` | approveBill | bill.route.js |
| `POST` | `/api/bills/:id/pay` | payBill | bill.route.js |
| `POST` | `/api/bills/:id/post-to-gl` | postToGL | bill.route.js |
| `POST` | `/api/bills/:id/attachments` | uploadAttachment | bill.route.js |
| `DELETE` | `/api/bills/:id/attachments/:attachmentId` | deleteAttachment | bill.route.js |

## billPayment

| Method | Path | Controller | File |
|--------|------|------------|------|
| `POST` | `/api/bill-payments` | createPayment | billPayment.route.js |
| `GET` | `/api/bill-payments` | getPayments | billPayment.route.js |
| `GET` | `/api/bill-payments/:id` | getPayment | billPayment.route.js |
| `POST` | `/api/bill-payments/:id/cancel` | cancelPayment | billPayment.route.js |

## billing

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/billing/plans` | unknown | billing.route.js |
| `GET` | `/api/billing/subscription` | unknown | billing.route.js |
| `POST` | `/api/billing/subscription` | unknown | billing.route.js |
| `PUT` | `/api/billing/subscription` | unknown | billing.route.js |
| `DELETE` | `/api/billing/subscription` | unknown | billing.route.js |
| `POST` | `/api/billing/subscription/reactivate` | unknown | billing.route.js |
| `GET` | `/api/billing/payment-methods` | unknown | billing.route.js |
| `POST` | `/api/billing/payment-methods` | unknown | billing.route.js |
| `DELETE` | `/api/billing/payment-methods/:id` | unknown | billing.route.js |
| `PUT` | `/api/billing/payment-methods/:id/default` | unknown | billing.route.js |
| `POST` | `/api/billing/setup-intent` | unknown | billing.route.js |
| `GET` | `/api/billing/invoices` | unknown | billing.route.js |
| `GET` | `/api/billing/invoices/:id` | unknown | billing.route.js |
| `GET` | `/api/billing/invoices/:id/pdf` | unknown | billing.route.js |
| `GET` | `/api/billing/usage` | unknown | billing.route.js |
| `POST` | `/api/billing/webhook` | unknown | billing.route.js |

## billingRate

| Method | Path | Controller | File |
|--------|------|------------|------|
| `POST` | `/api/billing/rates` | createRate | billingRate.route.js |
| `GET` | `/api/billing/rates` | getRates | billingRate.route.js |
| `GET` | `/api/billing/rates/stats` | getRateStats | billingRate.route.js |
| `GET` | `/api/billing/rates/applicable` | getApplicableRate | billingRate.route.js |
| `GET` | `/api/billing/rates/:id` | getRate | billingRate.route.js |
| `PUT` | `/api/billing/rates/:id` | updateRate | billingRate.route.js |
| `DELETE` | `/api/billing/rates/:id` | deleteRate | billingRate.route.js |
| `POST` | `/api/billing/rates/standard` | setStandardRate | billingRate.route.js |

## biometric

| Method | Path | Controller | File |
|--------|------|------------|------|
| `POST` | `/api/biometric/devices` | registerDevice | biometric.route.js |
| `GET` | `/api/biometric/devices` | getDevices | biometric.route.js |
| `GET` | `/api/biometric/devices/:id` | getDevice | biometric.route.js |
| `PUT` | `/api/biometric/devices/:id` | updateDevice | biometric.route.js |
| `DELETE` | `/api/biometric/devices/:id` | deleteDevice | biometric.route.js |
| `POST` | `/api/biometric/devices/:id/heartbeat` | updateHeartbeat | biometric.route.js |
| `POST` | `/api/biometric/devices/:id/sync` | syncDevice | biometric.route.js |
| `GET` | `/api/biometric/enrollments/stats` | getEnrollmentStats | biometric.route.js |
| `POST` | `/api/biometric/enrollments` | enrollEmployee | biometric.route.js |
| `GET` | `/api/biometric/enrollments` | getEnrollments | biometric.route.js |
| `GET` | `/api/biometric/enrollments/:id` | getEnrollment | biometric.route.js |
| `GET` | `/api/biometric/enrollments/employee/:employeeId` | getEnrollmentByEmployee | biometric.route.js |
| `POST` | `/api/biometric/enrollments/:id/fingerprint` | addFingerprint | biometric.route.js |
| `POST` | `/api/biometric/enrollments/:id/facial` | enrollFacial | biometric.route.js |
| `POST` | `/api/biometric/enrollments/:id/card` | issueCard | biometric.route.js |
| `POST` | `/api/biometric/enrollments/:id/pin` | setPIN | biometric.route.js |
| `POST` | `/api/biometric/enrollments/:id/revoke` | revokeEnrollment | biometric.route.js |
| `POST` | `/api/biometric/verify` | verifyIdentity | biometric.route.js |
| `POST` | `/api/biometric/identify` | identifyEmployee | biometric.route.js |
| `POST` | `/api/biometric/checkin-gps` | checkInWithGPS | biometric.route.js |
| `POST` | `/api/biometric/geofence/validate` | validateGeofence | biometric.route.js |
| `POST` | `/api/biometric/geofence` | createGeofenceZone | biometric.route.js |
| `GET` | `/api/biometric/geofence` | getGeofenceZones | biometric.route.js |
| `GET` | `/api/biometric/geofence/:id` | getGeofenceZone | biometric.route.js |
| `PUT` | `/api/biometric/geofence/:id` | updateGeofenceZone | biometric.route.js |
| `DELETE` | `/api/biometric/geofence/:id` | deleteGeofenceZone | biometric.route.js |
| `GET` | `/api/biometric/logs/stats` | getVerificationStats | biometric.route.js |
| `GET` | `/api/biometric/logs/failed` | getFailedAttempts | biometric.route.js |
| `GET` | `/api/biometric/logs/spoofing` | getSpoofingAttempts | biometric.route.js |
| `GET` | `/api/biometric/logs/daily-summary` | getDailySummary | biometric.route.js |
| `POST` | `/api/biometric/logs/process` | processLogs | biometric.route.js |
| `GET` | `/api/biometric/logs` | getLogs | biometric.route.js |

## brokers

| Method | Path | Controller | File |
|--------|------|------------|------|
| `POST` | `/api/v1/brokers` | createBroker | brokers.route.js |
| `GET` | `/api/v1/brokers` | getBrokers | brokers.route.js |
| `GET` | `/api/v1/brokers/:id` | getBroker | brokers.route.js |
| `PATCH` | `/api/v1/brokers/:id` | updateBroker | brokers.route.js |
| `DELETE` | `/api/v1/brokers/:id` | deleteBroker | brokers.route.js |
| `POST` | `/api/v1/brokers/:id/set-default` | setDefaultBroker | brokers.route.js |

## budgets

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/budgets` | unknown | budgets.route.js |
| `POST` | `/api/budgets` | unknown | budgets.route.js |
| `GET` | `/api/budgets/check` | unknown | budgets.route.js |
| `GET` | `/api/budgets/stats` | unknown | budgets.route.js |
| `GET` | `/api/budgets/:id` | unknown | budgets.route.js |
| `PUT` | `/api/budgets/:id` | unknown | budgets.route.js |
| `DELETE` | `/api/budgets/:id` | unknown | budgets.route.js |
| `POST` | `/api/budgets/:id/submit` | unknown | budgets.route.js |
| `POST` | `/api/budgets/:id/approve` | unknown | budgets.route.js |
| `POST` | `/api/budgets/:id/reject` | unknown | budgets.route.js |
| `POST` | `/api/budgets/:id/close` | unknown | budgets.route.js |
| `POST` | `/api/budgets/:id/duplicate` | unknown | budgets.route.js |
| `GET` | `/api/budgets/:budgetId/distribution` | unknown | budgets.route.js |
| `GET` | `/api/budgets/:budgetId/vs-actual` | unknown | budgets.route.js |
| `GET` | `/api/budgets/:budgetId/lines` | unknown | budgets.route.js |
| `POST` | `/api/budgets/:budgetId/lines` | unknown | budgets.route.js |
| `PUT` | `/api/budgets/:budgetId/lines/:lineId` | unknown | budgets.route.js |
| `DELETE` | `/api/budgets/:budgetId/lines/:lineId` | unknown | budgets.route.js |

## bulkActionss

| Method | Path | Controller | File |
|--------|------|------------|------|
| `POST` | `/api/bulkActionss/:entityType` | unknown | bulkActions.routes.js |
| `POST` | `/api/bulkActionss/:entityType/validate` | unknown | bulkActions.routes.js |
| `GET` | `/api/bulkActionss/:jobId/progress` | unknown | bulkActions.routes.js |
| `POST` | `/api/bulkActionss/:jobId/cancel` | unknown | bulkActions.routes.js |
| `GET` | `/api/bulkActionss/supported/:entityType?` | unknown | bulkActions.routes.js |

## buying

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/buying/stats` | unknown | buying.route.js |
| `GET` | `/api/buying/settings` | unknown | buying.route.js |
| `PUT` | `/api/buying/settings` | unknown | buying.route.js |
| `GET` | `/api/buying/supplier-groups` | unknown | buying.route.js |
| `POST` | `/api/buying/suppliers` | unknown | buying.route.js |
| `GET` | `/api/buying/suppliers` | unknown | buying.route.js |
| `GET` | `/api/buying/suppliers/:id` | unknown | buying.route.js |
| `PUT` | `/api/buying/suppliers/:id` | unknown | buying.route.js |
| `DELETE` | `/api/buying/suppliers/:id` | unknown | buying.route.js |
| `POST` | `/api/buying/purchase-orders` | unknown | buying.route.js |
| `GET` | `/api/buying/purchase-orders` | unknown | buying.route.js |
| `GET` | `/api/buying/purchase-orders/:id` | unknown | buying.route.js |
| `POST` | `/api/buying/purchase-orders/:id/submit` | unknown | buying.route.js |
| `POST` | `/api/buying/purchase-orders/:id/approve` | unknown | buying.route.js |
| `POST` | `/api/buying/purchase-orders/:id/cancel` | unknown | buying.route.js |
| `DELETE` | `/api/buying/purchase-orders/:id` | unknown | buying.route.js |
| `POST` | `/api/buying/purchase-receipts` | unknown | buying.route.js |
| `GET` | `/api/buying/purchase-receipts` | unknown | buying.route.js |
| `GET` | `/api/buying/purchase-receipts/:id` | unknown | buying.route.js |
| `POST` | `/api/buying/purchase-receipts/:id/submit` | unknown | buying.route.js |
| `POST` | `/api/buying/purchase-invoices` | unknown | buying.route.js |
| `GET` | `/api/buying/purchase-invoices` | unknown | buying.route.js |
| `GET` | `/api/buying/purchase-invoices/:id` | unknown | buying.route.js |
| `POST` | `/api/buying/purchase-invoices/:id/submit` | unknown | buying.route.js |
| `POST` | `/api/buying/material-requests` | unknown | buying.route.js |
| `GET` | `/api/buying/material-requests` | unknown | buying.route.js |
| `GET` | `/api/buying/material-requests/:id` | unknown | buying.route.js |
| `POST` | `/api/buying/rfqs` | unknown | buying.route.js |
| `GET` | `/api/buying/rfqs` | unknown | buying.route.js |
| `GET` | `/api/buying/rfqs/:id` | unknown | buying.route.js |
| `PUT` | `/api/buying/rfqs/:id` | unknown | buying.route.js |
| `POST` | `/api/buying/rfqs/:id/submit` | unknown | buying.route.js |
| `DELETE` | `/api/buying/rfqs/:id` | unknown | buying.route.js |

## calendar

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/calendar/sidebar-data` | getSidebarData | calendar.route.js |
| `GET` | `/api/calendar/grid-summary` | getCalendarGridSummary | calendar.route.js |
| `GET` | `/api/calendar/grid-items` | getCalendarGridItems | calendar.route.js |
| `GET` | `/api/calendar/item/:type/:id` | getCalendarItemDetails | calendar.route.js |
| `GET` | `/api/calendar/list` | getCalendarListView | calendar.route.js |
| `GET` | `/api/calendar` | getCalendarView | calendar.route.js |
| `GET` | `/api/calendar/upcoming` | getUpcomingItems | calendar.route.js |
| `GET` | `/api/calendar/overdue` | getOverdueItems | calendar.route.js |
| `GET` | `/api/calendar/stats` | getCalendarStats | calendar.route.js |
| `GET` | `/api/calendar/date/:date` | getCalendarByDate | calendar.route.js |
| `GET` | `/api/calendar/month/:year/:month` | getCalendarByMonth | calendar.route.js |

## campaigns

| Method | Path | Controller | File |
|--------|------|------------|------|
| `POST` | `/api/campaigns` | unknown | campaign.routes.js |
| `GET` | `/api/campaigns` | unknown | campaign.routes.js |
| `GET` | `/api/campaigns/:id` | unknown | campaign.routes.js |
| `PUT` | `/api/campaigns/:id` | unknown | campaign.routes.js |
| `DELETE` | `/api/campaigns/:id` | unknown | campaign.routes.js |
| `POST` | `/api/campaigns/:id/launch` | unknown | campaign.routes.js |
| `POST` | `/api/campaigns/:id/pause` | unknown | campaign.routes.js |
| `POST` | `/api/campaigns/:id/resume` | unknown | campaign.routes.js |
| `POST` | `/api/campaigns/:id/complete` | unknown | campaign.routes.js |
| `GET` | `/api/campaigns/:id/stats` | unknown | campaign.routes.js |
| `GET` | `/api/campaigns/:id/leads` | unknown | campaign.routes.js |
| `POST` | `/api/campaigns/:id/duplicate` | unknown | campaign.routes.js |

## captcha

| Method | Path | Controller | File |
|--------|------|------------|------|
| `POST` | `/api/auth/verify-captcha` | verifyCaptcha | captcha.route.js |
| `GET` | `/api/auth/captcha/providers` | getEnabledProviders | captcha.route.js |
| `GET` | `/api/auth/captcha/status/:provider` | getProviderStatus | captcha.route.js |

## case

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/cases/overview` | unknown | case.route.js |
| `GET` | `/api/cases/statistics` | unknown | case.route.js |
| `POST` | `/api/cases` | unknown | case.route.js |
| `GET` | `/api/cases` | unknown | case.route.js |
| `GET` | `/api/cases/pipeline` | unknown | case.route.js |
| `GET` | `/api/cases/pipeline/statistics` | unknown | case.route.js |
| `GET` | `/api/cases/pipeline/stages/:category` | unknown | case.route.js |
| `GET` | `/api/cases/pipeline/grouped` | unknown | case.route.js |
| `GET` | `/api/cases/:_id/full` | unknown | case.route.js |
| `GET` | `/api/cases/:_id` | unknown | case.route.js |
| `PATCH` | `/api/cases/:_id` | unknown | case.route.js |
| `DELETE` | `/api/cases/:_id` | unknown | case.route.js |
| `PATCH` | `/api/cases/:_id/progress` | unknown | case.route.js |
| `GET` | `/api/cases/:_id/notes` | unknown | case.route.js |
| `POST` | `/api/cases/:_id/notes` | unknown | case.route.js |
| `POST` | `/api/cases/:_id/note` | unknown | case.route.js |
| `PUT` | `/api/cases/:_id/notes/:noteId` | unknown | case.route.js |
| `PATCH` | `/api/cases/:_id/notes/:noteId` | unknown | case.route.js |
| `DELETE` | `/api/cases/:_id/notes/:noteId` | unknown | case.route.js |
| `POST` | `/api/cases/:_id/documents/upload-url` | unknown | case.route.js |
| `POST` | `/api/cases/:_id/documents/confirm` | unknown | case.route.js |
| `GET` | `/api/cases/:_id/documents/:docId/download` | unknown | case.route.js |
| `DELETE` | `/api/cases/:_id/documents/:docId` | unknown | case.route.js |
| `POST` | `/api/cases/:_id/document` | unknown | case.route.js |
| `DELETE` | `/api/cases/:_id/document/:documentId` | unknown | case.route.js |
| `POST` | `/api/cases/:_id/hearing` | unknown | case.route.js |
| `PATCH` | `/api/cases/:_id/hearings/:hearingId` | unknown | case.route.js |
| `DELETE` | `/api/cases/:_id/hearings/:hearingId` | unknown | case.route.js |
| `PATCH` | `/api/cases/:_id/hearing/:hearingId` | unknown | case.route.js |
| `DELETE` | `/api/cases/:_id/hearing/:hearingId` | unknown | case.route.js |
| `POST` | `/api/cases/:_id/timeline` | unknown | case.route.js |
| `PATCH` | `/api/cases/:_id/timeline/:eventId` | unknown | case.route.js |
| `DELETE` | `/api/cases/:_id/timeline/:eventId` | unknown | case.route.js |
| `POST` | `/api/cases/:_id/claim` | unknown | case.route.js |
| `PATCH` | `/api/cases/:_id/claims/:claimId` | unknown | case.route.js |
| `DELETE` | `/api/cases/:_id/claims/:claimId` | unknown | case.route.js |
| `DELETE` | `/api/cases/:_id/claim/:claimId` | unknown | case.route.js |
| `PATCH` | `/api/cases/:_id/status` | unknown | case.route.js |
| `PATCH` | `/api/cases/:_id/outcome` | unknown | case.route.js |
| `PUT` | `/api/cases/:_id/close` | unknown | case.route.js |
| `GET` | `/api/cases/:_id/audit` | unknown | case.route.js |
| `POST` | `/api/cases/:_id/rich-documents` | unknown | case.route.js |
| `GET` | `/api/cases/:_id/rich-documents` | unknown | case.route.js |
| `GET` | `/api/cases/:_id/rich-documents/:docId` | unknown | case.route.js |
| `PATCH` | `/api/cases/:_id/rich-documents/:docId` | unknown | case.route.js |
| `DELETE` | `/api/cases/:_id/rich-documents/:docId` | unknown | case.route.js |
| `GET` | `/api/cases/:_id/rich-documents/:docId/versions` | unknown | case.route.js |
| `POST` | `/api/cases/:_id/rich-documents/:docId/versions/:versionNumber/restore` | unknown | case.route.js |
| `GET` | `/api/cases/:_id/rich-documents/:docId/export/pdf` | unknown | case.route.js |
| `GET` | `/api/cases/:_id/rich-documents/:docId/export/latex` | unknown | case.route.js |
| `GET` | `/api/cases/:_id/rich-documents/:docId/export/markdown` | unknown | case.route.js |
| `GET` | `/api/cases/:_id/rich-documents/:docId/preview` | unknown | case.route.js |
| `PATCH` | `/api/cases/:_id/stage` | unknown | case.route.js |
| `PATCH` | `/api/cases/:_id/end` | unknown | case.route.js |

## caseNotion

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/case-notion/notion/cases` | unknown | caseNotion.route.js |
| `GET` | `/api/case-notion/cases/:caseId/notion/pages` | unknown | caseNotion.route.js |
| `GET` | `/api/case-notion/cases/:caseId/notion/pages/:pageId` | unknown | caseNotion.route.js |
| `POST` | `/api/case-notion/cases/:caseId/notion/pages` | unknown | caseNotion.route.js |
| `PATCH` | `/api/case-notion/cases/:caseId/notion/pages/:pageId` | unknown | caseNotion.route.js |
| `DELETE` | `/api/case-notion/cases/:caseId/notion/pages/:pageId` | unknown | caseNotion.route.js |
| `POST` | `/api/case-notion/cases/:caseId/notion/pages/:pageId/archive` | unknown | caseNotion.route.js |
| `POST` | `/api/case-notion/cases/:caseId/notion/pages/:pageId/restore` | unknown | caseNotion.route.js |
| `POST` | `/api/case-notion/cases/:caseId/notion/pages/:pageId/duplicate` | unknown | caseNotion.route.js |
| `POST` | `/api/case-notion/cases/:caseId/notion/pages/:pageId/favorite` | unknown | caseNotion.route.js |
| `POST` | `/api/case-notion/cases/:caseId/notion/pages/:pageId/pin` | unknown | caseNotion.route.js |
| `POST` | `/api/case-notion/cases/:caseId/notion/pages/merge` | unknown | caseNotion.route.js |
| `GET` | `/api/case-notion/cases/:caseId/notion/pages/:pageId/blocks` | unknown | caseNotion.route.js |
| `POST` | `/api/case-notion/cases/:caseId/notion/pages/:pageId/blocks` | unknown | caseNotion.route.js |
| `PATCH` | `/api/case-notion/cases/:caseId/notion/blocks/:blockId` | unknown | caseNotion.route.js |
| `DELETE` | `/api/case-notion/cases/:caseId/notion/blocks/:blockId` | unknown | caseNotion.route.js |
| `POST` | `/api/case-notion/cases/:caseId/notion/blocks/:blockId/move` | unknown | caseNotion.route.js |
| `POST` | `/api/case-notion/cases/:caseId/notion/blocks/:blockId/lock` | unknown | caseNotion.route.js |
| `POST` | `/api/case-notion/cases/:caseId/notion/blocks/:blockId/unlock` | unknown | caseNotion.route.js |
| `POST` | `/api/case-notion/cases/:caseId/notion/synced-blocks` | unknown | caseNotion.route.js |
| `GET` | `/api/case-notion/cases/:caseId/notion/synced-blocks/:blockId` | unknown | caseNotion.route.js |
| `POST` | `/api/case-notion/cases/:caseId/notion/synced-blocks/:blockId/unsync` | unknown | caseNotion.route.js |
| `GET` | `/api/case-notion/cases/:caseId/notion/blocks/:blockId/comments` | unknown | caseNotion.route.js |
| `POST` | `/api/case-notion/cases/:caseId/notion/blocks/:blockId/comments` | unknown | caseNotion.route.js |
| `POST` | `/api/case-notion/cases/:caseId/notion/comments/:commentId/resolve` | unknown | caseNotion.route.js |
| `DELETE` | `/api/case-notion/cases/:caseId/notion/comments/:commentId` | unknown | caseNotion.route.js |
| `GET` | `/api/case-notion/cases/:caseId/notion/pages/:pageId/activity` | unknown | caseNotion.route.js |
| `GET` | `/api/case-notion/cases/:caseId/notion/search` | unknown | caseNotion.route.js |
| `GET` | `/api/case-notion/cases/:caseId/notion/pages/:pageId/export/pdf` | unknown | caseNotion.route.js |
| `GET` | `/api/case-notion/cases/:caseId/notion/pages/:pageId/export/markdown` | unknown | caseNotion.route.js |
| `GET` | `/api/case-notion/cases/:caseId/notion/pages/:pageId/export/html` | unknown | caseNotion.route.js |
| `GET` | `/api/case-notion/notion/templates` | unknown | caseNotion.route.js |
| `POST` | `/api/case-notion/cases/:caseId/notion/pages/:pageId/apply-template` | unknown | caseNotion.route.js |
| `POST` | `/api/case-notion/cases/:caseId/notion/pages/:pageId/save-as-template` | unknown | caseNotion.route.js |
| `POST` | `/api/case-notion/cases/:caseId/notion/blocks/:blockId/link-task` | unknown | caseNotion.route.js |
| `POST` | `/api/case-notion/cases/:caseId/notion/blocks/:blockId/unlink-task` | unknown | caseNotion.route.js |
| `POST` | `/api/case-notion/cases/:caseId/notion/blocks/:blockId/create-task` | unknown | caseNotion.route.js |
| `PATCH` | `/api/case-notion/cases/:caseId/notion/blocks/:blockId/position` | unknown | caseNotion.route.js |
| `PATCH` | `/api/case-notion/cases/:caseId/notion/blocks/:blockId/size` | unknown | caseNotion.route.js |
| `PATCH` | `/api/case-notion/cases/:caseId/notion/blocks/:blockId/color` | unknown | caseNotion.route.js |
| `PATCH` | `/api/case-notion/cases/:caseId/notion/blocks/:blockId/priority` | unknown | caseNotion.route.js |
| `POST` | `/api/case-notion/cases/:caseId/notion/blocks/:blockId/link-event` | unknown | caseNotion.route.js |
| `POST` | `/api/case-notion/cases/:caseId/notion/blocks/:blockId/link-hearing` | unknown | caseNotion.route.js |
| `POST` | `/api/case-notion/cases/:caseId/notion/blocks/:blockId/link-document` | unknown | caseNotion.route.js |
| `DELETE` | `/api/case-notion/cases/:caseId/notion/blocks/:blockId/unlink` | unknown | caseNotion.route.js |
| `GET` | `/api/case-notion/cases/:caseId/notion/pages/:pageId/connections` | unknown | caseNotion.route.js |
| `POST` | `/api/case-notion/cases/:caseId/notion/pages/:pageId/connections` | unknown | caseNotion.route.js |
| `PATCH` | `/api/case-notion/cases/:caseId/notion/connections/:connectionId` | unknown | caseNotion.route.js |
| `DELETE` | `/api/case-notion/cases/:caseId/notion/connections/:connectionId` | unknown | caseNotion.route.js |
| `PATCH` | `/api/case-notion/cases/:caseId/notion/pages/:pageId/view-mode` | unknown | caseNotion.route.js |
| `PATCH` | `/api/case-notion/cases/:caseId/notion/pages/:pageId/whiteboard-config` | unknown | caseNotion.route.js |
| `POST` | `/api/case-notion/cases/:caseId/notion/pages/:pageId/shapes` | unknown | caseNotion.route.js |
| `POST` | `/api/case-notion/cases/:caseId/notion/pages/:pageId/arrows` | unknown | caseNotion.route.js |
| `POST` | `/api/case-notion/cases/:caseId/notion/pages/:pageId/frames` | unknown | caseNotion.route.js |
| `PATCH` | `/api/case-notion/cases/:caseId/notion/blocks/:blockId/z-index` | unknown | caseNotion.route.js |
| `PATCH` | `/api/case-notion/cases/:caseId/notion/pages/:pageId/batch-update` | unknown | caseNotion.route.js |
| `GET` | `/api/case-notion/cases/:caseId/notion/blocks/:blockId/connections` | unknown | caseNotion.route.js |
| `PATCH` | `/api/case-notion/cases/:caseId/notion/blocks/:blockId/rotation` | unknown | caseNotion.route.js |
| `PATCH` | `/api/case-notion/cases/:caseId/notion/blocks/:blockId/opacity` | unknown | caseNotion.route.js |
| `PATCH` | `/api/case-notion/cases/:caseId/notion/blocks/:blockId/style` | unknown | caseNotion.route.js |
| `POST` | `/api/case-notion/cases/:caseId/notion/frames/:frameId/children` | unknown | caseNotion.route.js |
| `DELETE` | `/api/case-notion/cases/:caseId/notion/frames/:frameId/children/:elementId` | unknown | caseNotion.route.js |
| `GET` | `/api/case-notion/cases/:caseId/notion/frames/:frameId/children` | unknown | caseNotion.route.js |
| `POST` | `/api/case-notion/cases/:caseId/notion/frames/:frameId/auto-detect` | unknown | caseNotion.route.js |
| `PATCH` | `/api/case-notion/cases/:caseId/notion/frames/:frameId/move` | unknown | caseNotion.route.js |
| `POST` | `/api/case-notion/cases/:caseId/notion/pages/:pageId/undo` | unknown | caseNotion.route.js |
| `POST` | `/api/case-notion/cases/:caseId/notion/pages/:pageId/redo` | unknown | caseNotion.route.js |
| `GET` | `/api/case-notion/cases/:caseId/notion/pages/:pageId/history-status` | unknown | caseNotion.route.js |
| `POST` | `/api/case-notion/cases/:caseId/notion/pages/:pageId/duplicate` | unknown | caseNotion.route.js |
| `DELETE` | `/api/case-notion/cases/:caseId/notion/pages/:pageId/bulk-delete` | unknown | caseNotion.route.js |
| `POST` | `/api/case-notion/cases/:caseId/notion/pages/:pageId/group` | unknown | caseNotion.route.js |
| `POST` | `/api/case-notion/cases/:caseId/notion/pages/:pageId/ungroup` | unknown | caseNotion.route.js |
| `POST` | `/api/case-notion/cases/:caseId/notion/pages/:pageId/align` | unknown | caseNotion.route.js |
| `POST` | `/api/case-notion/cases/:caseId/notion/pages/:pageId/distribute` | unknown | caseNotion.route.js |

## chatterActivitiesExtended

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/chatter/activities/:resModel/:resId` | unknown | chatterActivitiesExtended.route.js |
| `GET` | `/api/chatter/activities/me` | unknown | chatterActivitiesExtended.route.js |
| `POST` | `/api/chatter/activities` | unknown | chatterActivitiesExtended.route.js |
| `PATCH` | `/api/chatter/activities/:activityId` | unknown | chatterActivitiesExtended.route.js |
| `DELETE` | `/api/chatter/activities/:activityId` | unknown | chatterActivitiesExtended.route.js |
| `POST` | `/api/chatter/activities/:activityId/complete` | unknown | chatterActivitiesExtended.route.js |

## chatterFollowers

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/chatterFollowers/my-followed` | getMyFollowedRecords | chatterFollower.routes.js |
| `GET` | `/api/chatterFollowers/:model/:recordId/followers` | getFollowers | chatterFollower.routes.js |
| `POST` | `/api/chatterFollowers/:model/:recordId/followers` | addFollower | chatterFollower.routes.js |
| `POST` | `/api/chatterFollowers/:model/:recordId/followers/bulk` | bulkAddFollowers | chatterFollower.routes.js |
| `DELETE` | `/api/chatterFollowers/:model/:recordId/followers/:id` | removeFollower | chatterFollower.routes.js |
| `PATCH` | `/api/chatterFollowers/:model/:recordId/followers/:id/preferences` | updateNotificationPreference | chatterFollower.routes.js |
| `POST` | `/api/chatterFollowers/:model/:recordId/toggle-follow` | toggleFollow | chatterFollower.routes.js |

## chatterFollowersExtended

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/chatter/followers/:resModel/:resId` | unknown | chatterFollowersExtended.route.js |
| `POST` | `/api/chatter/followers` | unknown | chatterFollowersExtended.route.js |
| `DELETE` | `/api/chatter/followers/:followerId` | unknown | chatterFollowersExtended.route.js |
| `PATCH` | `/api/chatter/followers/:followerId/preferences` | unknown | chatterFollowersExtended.route.js |
| `POST` | `/api/chatter/followers/bulk-add` | unknown | chatterFollowersExtended.route.js |
| `POST` | `/api/chatter/followers/bulk-remove` | unknown | chatterFollowersExtended.route.js |

## churn

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/churn/health-score/:firmId` | unknown | churn.route.js |
| `GET` | `/api/churn/health-score/:firmId/history` | unknown | churn.route.js |
| `POST` | `/api/churn/health-score/:firmId/recalculate` | unknown | churn.route.js |
| `GET` | `/api/churn/at-risk` | unknown | churn.route.js |
| `POST` | `/api/churn/events` | unknown | churn.route.js |
| `GET` | `/api/churn/events` | unknown | churn.route.js |
| `PUT` | `/api/churn/events/:id/reason` | unknown | churn.route.js |
| `POST` | `/api/churn/events/:id/exit-survey` | unknown | churn.route.js |
| `GET` | `/api/churn/analytics/dashboard` | unknown | churn.route.js |
| `GET` | `/api/churn/analytics/rate` | unknown | churn.route.js |
| `GET` | `/api/churn/analytics/reasons` | unknown | churn.route.js |
| `GET` | `/api/churn/analytics/cohorts` | unknown | churn.route.js |
| `GET` | `/api/churn/analytics/revenue-at-risk` | unknown | churn.route.js |
| `GET` | `/api/churn/interventions/:firmId` | unknown | churn.route.js |
| `POST` | `/api/churn/interventions/:firmId/trigger` | unknown | churn.route.js |
| `GET` | `/api/churn/interventions/stats` | unknown | churn.route.js |
| `GET` | `/api/churn/reports/generate` | unknown | churn.route.js |
| `GET` | `/api/churn/reports/at-risk-export` | unknown | churn.route.js |
| `GET` | `/api/churn/reports/executive-summary` | unknown | churn.route.js |

## client

| Method | Path | Controller | File |
|--------|------|------------|------|
| `POST` | `/api/clients` | unknown | client.route.js |
| `GET` | `/api/clients` | unknown | client.route.js |
| `GET` | `/api/clients/search` | unknown | client.route.js |
| `GET` | `/api/clients/stats` | unknown | client.route.js |
| `GET` | `/api/clients/top-revenue` | unknown | client.route.js |
| `GET` | `/api/clients/:id/full` | unknown | client.route.js |
| `GET` | `/api/clients/:id` | unknown | client.route.js |
| `PUT` | `/api/clients/:id` | unknown | client.route.js |
| `DELETE` | `/api/clients/:id` | unknown | client.route.js |
| `GET` | `/api/clients/:id/billing-info` | unknown | client.route.js |
| `GET` | `/api/clients/:id/cases` | unknown | client.route.js |
| `GET` | `/api/clients/:id/invoices` | unknown | client.route.js |
| `GET` | `/api/clients/:id/payments` | unknown | client.route.js |
| `POST` | `/api/clients/:id/verify/wathq` | unknown | client.route.js |
| `GET` | `/api/clients/:id/wathq/:dataType` | unknown | client.route.js |
| `POST` | `/api/clients/:id/verify/absher` | unknown | client.route.js |
| `POST` | `/api/clients/:id/verify/address` | unknown | client.route.js |
| `POST` | `/api/clients/:id/attachments` | unknown | client.route.js |
| `DELETE` | `/api/clients/:id/attachments/:attachmentId` | unknown | client.route.js |
| `POST` | `/api/clients/:id/conflict-check` | unknown | client.route.js |
| `PATCH` | `/api/clients/:id/status` | unknown | client.route.js |
| `PATCH` | `/api/clients/:id/flags` | unknown | client.route.js |
| `DELETE` | `/api/clients/bulk` | unknown | client.route.js |

## cloudStorages

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/cloudStorages/providers` | getProviders | cloudStorage.routes.js |
| `GET` | `/api/cloudStorages/:provider/auth` | getAuthUrl | cloudStorage.routes.js |
| `GET` | `/api/cloudStorages/:provider/callback` | handleCallback | cloudStorage.routes.js |
| `GET` | `/api/cloudStorages/:provider/status` | getConnectionStatus | cloudStorage.routes.js |
| `POST` | `/api/cloudStorages/:provider/disconnect` | disconnect | cloudStorage.routes.js |
| `GET` | `/api/cloudStorages/:provider/files` | listFiles | cloudStorage.routes.js |
| `POST` | `/api/cloudStorages/:provider/files` | uploadFile | cloudStorage.routes.js |
| `GET` | `/api/cloudStorages/:provider/files/:fileId/metadata` | getFileMetadata | cloudStorage.routes.js |
| `GET` | `/api/cloudStorages/:provider/files/:fileId` | downloadFile | cloudStorage.routes.js |
| `DELETE` | `/api/cloudStorages/:provider/files/:fileId` | deleteFile | cloudStorage.routes.js |
| `POST` | `/api/cloudStorages/:provider/files/:fileId/move` | moveFile | cloudStorage.routes.js |
| `POST` | `/api/cloudStorages/:provider/files/:fileId/share` | shareFile | cloudStorage.routes.js |
| `POST` | `/api/cloudStorages/:provider/folders` | createFolder | cloudStorage.routes.js |

## commandPalettes

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/commandPalettes/search` | unknown | commandPalette.routes.js |
| `GET` | `/api/commandPalettes/commands` | unknown | commandPalette.routes.js |
| `GET` | `/api/commandPalettes/recent` | unknown | commandPalette.routes.js |
| `POST` | `/api/commandPalettes/track/record` | unknown | commandPalette.routes.js |
| `POST` | `/api/commandPalettes/track/search` | unknown | commandPalette.routes.js |
| `POST` | `/api/commandPalettes/track/command` | unknown | commandPalette.routes.js |
| `GET` | `/api/commandPalettes/saved-searches` | unknown | commandPalette.routes.js |
| `POST` | `/api/commandPalettes/saved-searches` | unknown | commandPalette.routes.js |
| `DELETE` | `/api/commandPalettes/saved-searches/:name` | unknown | commandPalette.routes.js |

## compensationReward

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/hr/compensation-rewards/stats` | unknown | compensationReward.route.js |
| `GET` | `/api/hr/compensation-rewards/pending-reviews` | unknown | compensationReward.route.js |
| `GET` | `/api/hr/compensation-rewards/department-summary` | unknown | compensationReward.route.js |
| `GET` | `/api/hr/compensation-rewards/export` | unknown | compensationReward.route.js |
| `GET` | `/api/hr/compensation-rewards/pay-grade-analysis/:payGrade` | unknown | compensationReward.route.js |
| `GET` | `/api/hr/compensation-rewards/employee/:employeeId` | unknown | compensationReward.route.js |
| `GET` | `/api/hr/compensation-rewards` | unknown | compensationReward.route.js |
| `POST` | `/api/hr/compensation-rewards` | unknown | compensationReward.route.js |
| `POST` | `/api/hr/compensation-rewards/bulk-delete` | unknown | compensationReward.route.js |
| `GET` | `/api/hr/compensation-rewards/:id` | unknown | compensationReward.route.js |
| `PATCH` | `/api/hr/compensation-rewards/:id` | unknown | compensationReward.route.js |
| `PUT` | `/api/hr/compensation-rewards/:id` | unknown | compensationReward.route.js |
| `DELETE` | `/api/hr/compensation-rewards/:id` | unknown | compensationReward.route.js |
| `POST` | `/api/hr/compensation-rewards/:id/salary-increase` | unknown | compensationReward.route.js |
| `POST` | `/api/hr/compensation-rewards/:id/allowances` | unknown | compensationReward.route.js |
| `PATCH` | `/api/hr/compensation-rewards/:id/allowances/:allowanceId` | unknown | compensationReward.route.js |
| `PUT` | `/api/hr/compensation-rewards/:id/allowances/:allowanceId` | unknown | compensationReward.route.js |
| `DELETE` | `/api/hr/compensation-rewards/:id/allowances/:allowanceId` | unknown | compensationReward.route.js |
| `POST` | `/api/hr/compensation-rewards/:id/bonus` | unknown | compensationReward.route.js |
| `POST` | `/api/hr/compensation-rewards/:id/submit-review` | unknown | compensationReward.route.js |
| `POST` | `/api/hr/compensation-rewards/:id/approve-review` | unknown | compensationReward.route.js |
| `POST` | `/api/hr/compensation-rewards/:id/decline-review` | unknown | compensationReward.route.js |
| `POST` | `/api/hr/compensation-rewards/:id/recognition` | unknown | compensationReward.route.js |
| `POST` | `/api/hr/compensation-rewards/:id/total-rewards-statement` | unknown | compensationReward.route.js |

## compensatoryLeave

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/compensatory-leave-requests` | unknown | compensatoryLeave.route.js |
| `GET` | `/api/compensatory-leave-requests/pending-approvals` | unknown | compensatoryLeave.route.js |
| `GET` | `/api/compensatory-leave-requests/stats` | unknown | compensatoryLeave.route.js |
| `GET` | `/api/compensatory-leave-requests/policy` | unknown | compensatoryLeave.route.js |
| `GET` | `/api/compensatory-leave-requests/balance/:employeeId` | unknown | compensatoryLeave.route.js |
| `GET` | `/api/compensatory-leave-requests/holiday-work-records` | unknown | compensatoryLeave.route.js |
| `GET` | `/api/compensatory-leave-requests/expiring` | unknown | compensatoryLeave.route.js |
| `GET` | `/api/compensatory-leave-requests/export` | unknown | compensatoryLeave.route.js |
| `GET` | `/api/compensatory-leave-requests/:id` | unknown | compensatoryLeave.route.js |
| `POST` | `/api/compensatory-leave-requests` | unknown | compensatoryLeave.route.js |
| `POST` | `/api/compensatory-leave-requests/calculate-days` | unknown | compensatoryLeave.route.js |
| `POST` | `/api/compensatory-leave-requests/expire-unused` | unknown | compensatoryLeave.route.js |
| `PATCH` | `/api/compensatory-leave-requests/:id` | unknown | compensatoryLeave.route.js |
| `DELETE` | `/api/compensatory-leave-requests/:id` | unknown | compensatoryLeave.route.js |
| `POST` | `/api/compensatory-leave-requests/:id/submit` | unknown | compensatoryLeave.route.js |
| `POST` | `/api/compensatory-leave-requests/:id/approve` | unknown | compensatoryLeave.route.js |
| `POST` | `/api/compensatory-leave-requests/:id/reject` | unknown | compensatoryLeave.route.js |
| `POST` | `/api/compensatory-leave-requests/:id/cancel` | unknown | compensatoryLeave.route.js |
| `POST` | `/api/compensatory-leave-requests/:requestId/documents` | unknown | compensatoryLeave.route.js |
| `POST` | `/api/compensatory-leave-requests/bulk-approve` | unknown | compensatoryLeave.route.js |
| `POST` | `/api/compensatory-leave-requests/bulk-reject` | unknown | compensatoryLeave.route.js |

## competitor

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/competitors` | unknown | competitor.route.js |
| `GET` | `/api/competitors/top-losses` | unknown | competitor.route.js |
| `GET` | `/api/competitors/:id` | unknown | competitor.route.js |
| `POST` | `/api/competitors` | unknown | competitor.route.js |
| `PUT` | `/api/competitors/:id` | unknown | competitor.route.js |
| `DELETE` | `/api/competitors/:id` | unknown | competitor.route.js |

## competitors

| Method | Path | Controller | File |
|--------|------|------------|------|
| `POST` | `/api/competitors` | unknown | competitor.routes.js |
| `GET` | `/api/competitors` | unknown | competitor.routes.js |
| `GET` | `/api/competitors/:id` | unknown | competitor.routes.js |
| `PUT` | `/api/competitors/:id` | unknown | competitor.routes.js |
| `DELETE` | `/api/competitors/:id` | unknown | competitor.routes.js |
| `POST` | `/api/competitors/:id/record-win` | unknown | competitor.routes.js |
| `POST` | `/api/competitors/:id/record-loss` | unknown | competitor.routes.js |

## complianceDashboard

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/hr/compliance/dashboard` | unknown | complianceDashboard.route.js |
| `GET` | `/api/hr/compliance/gosi` | unknown | complianceDashboard.route.js |
| `GET` | `/api/hr/compliance/nitaqat` | unknown | complianceDashboard.route.js |
| `GET` | `/api/hr/compliance/wps` | unknown | complianceDashboard.route.js |
| `GET` | `/api/hr/compliance/documents/expiring` | unknown | complianceDashboard.route.js |
| `GET` | `/api/hr/compliance/probation/ending` | unknown | complianceDashboard.route.js |
| `GET` | `/api/hr/compliance/contracts/expiring` | unknown | complianceDashboard.route.js |
| `GET` | `/api/hr/compliance/labor-law` | unknown | complianceDashboard.route.js |

## conflictCheck

| Method | Path | Controller | File |
|--------|------|------------|------|
| `POST` | `/api/conflict-checks/quick` | quickConflictCheck | conflictCheck.route.js |
| `GET` | `/api/conflict-checks/stats` | getConflictStats | conflictCheck.route.js |
| `GET` | `/api/conflict-checks` | getConflictChecks | conflictCheck.route.js |
| `POST` | `/api/conflict-checks` | runConflictCheck | conflictCheck.route.js |
| `GET` | `/api/conflict-checks/:id` | getConflictCheck | conflictCheck.route.js |
| `PATCH` | `/api/conflict-checks/:id` | updateConflictCheck | conflictCheck.route.js |
| `DELETE` | `/api/conflict-checks/:id` | deleteConflictCheck | conflictCheck.route.js |
| `POST` | `/api/conflict-checks/:id/matches/:matchIndex/resolve` | resolveMatch | conflictCheck.route.js |

## consent

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/consent` | unknown | consent.route.js |
| `POST` | `/api/consent` | unknown | consent.route.js |
| `PUT` | `/api/consent/:category` | unknown | consent.route.js |
| `DELETE` | `/api/consent` | unknown | consent.route.js |
| `POST` | `/api/consent/export` | unknown | consent.route.js |
| `GET` | `/api/consent/history` | unknown | consent.route.js |

## consolidatedReports

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/reports/consolidated/profit-loss` | unknown | consolidatedReports.route.js |
| `GET` | `/api/reports/consolidated/balance-sheet` | unknown | consolidatedReports.route.js |
| `GET` | `/api/reports/consolidated/cash-flow` | unknown | consolidatedReports.route.js |
| `GET` | `/api/reports/consolidated/comparison` | unknown | consolidatedReports.route.js |
| `GET` | `/api/reports/consolidated/eliminations` | unknown | consolidatedReports.route.js |
| `POST` | `/api/reports/consolidated/eliminations` | unknown | consolidatedReports.route.js |
| `GET` | `/api/reports/consolidated/auto-eliminations` | unknown | consolidatedReports.route.js |
| `GET` | `/api/reports/consolidated/full-statement` | unknown | consolidatedReports.route.js |

## contact

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/contacts/search` | searchContacts | contact.route.js |
| `GET` | `/api/contacts/case/:caseId` | getContactsByCase | contact.route.js |
| `GET` | `/api/contacts/client/:clientId` | getContactsByClient | contact.route.js |
| `DELETE` | `/api/contacts/bulk` | bulkDeleteContacts | contact.route.js |
| `POST` | `/api/contacts/bulk-delete` | unknown | contact.route.js |
| `GET` | `/api/contacts` | getContacts | contact.route.js |
| `POST` | `/api/contacts` | createContact | contact.route.js |
| `GET` | `/api/contacts/:id` | getContact | contact.route.js |
| `PUT` | `/api/contacts/:id` | updateContact | contact.route.js |
| `PATCH` | `/api/contacts/:id` | unknown | contact.route.js |
| `DELETE` | `/api/contacts/:id` | deleteContact | contact.route.js |
| `POST` | `/api/contacts/:id/link-case` | linkToCase | contact.route.js |
| `DELETE` | `/api/contacts/:id/unlink-case/:caseId` | unlinkFromCase | contact.route.js |
| `POST` | `/api/contacts/:id/unlink-case` | unknown | contact.route.js |
| `POST` | `/api/contacts/:id/link-client` | linkToClient | contact.route.js |
| `DELETE` | `/api/contacts/:id/unlink-client/:clientId` | unlinkFromClient | contact.route.js |
| `POST` | `/api/contacts/:id/unlink-client` | unknown | contact.route.js |

## contactLists

| Method | Path | Controller | File |
|--------|------|------------|------|
| `POST` | `/api/contactLists` | unknown | contactList.routes.js |
| `GET` | `/api/contactLists` | unknown | contactList.routes.js |
| `GET` | `/api/contactLists/:id` | unknown | contactList.routes.js |
| `PUT` | `/api/contactLists/:id` | unknown | contactList.routes.js |
| `DELETE` | `/api/contactLists/:id` | unknown | contactList.routes.js |
| `POST` | `/api/contactLists/:id/members` | unknown | contactList.routes.js |
| `DELETE` | `/api/contactLists/:id/members/:memberId` | unknown | contactList.routes.js |
| `GET` | `/api/contactLists/:id/members` | unknown | contactList.routes.js |
| `POST` | `/api/contactLists/:id/refresh` | unknown | contactList.routes.js |
| `POST` | `/api/contactLists/:id/duplicate` | unknown | contactList.routes.js |

## conversation

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/conversations` | getConversations | conversation.route.js |
| `POST` | `/api/conversations` | createConversation | conversation.route.js |
| `GET` | `/api/conversations/single/:sellerID/:buyerID` | getSingleConversation | conversation.route.js |
| `PATCH` | `/api/conversations/:conversationID` | updateConversation | conversation.route.js |

## conversations

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/conversations/stats` | unknown | conversation.routes.js |
| `GET` | `/api/conversations` | unknown | conversation.routes.js |
| `GET` | `/api/conversations/:id` | unknown | conversation.routes.js |
| `POST` | `/api/conversations/:id/messages` | unknown | conversation.routes.js |
| `POST` | `/api/conversations/:id/assign` | unknown | conversation.routes.js |
| `POST` | `/api/conversations/:id/snooze` | unknown | conversation.routes.js |
| `POST` | `/api/conversations/:id/close` | unknown | conversation.routes.js |
| `POST` | `/api/conversations/:id/reopen` | unknown | conversation.routes.js |
| `PUT` | `/api/conversations/:id/tags` | unknown | conversation.routes.js |
| `PUT` | `/api/conversations/:id/priority` | unknown | conversation.routes.js |

## corporateCard

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/corporate-cards` | getCorporateCards | corporateCard.route.js |
| `GET` | `/api/corporate-cards/summary` | getSummary | corporateCard.route.js |
| `GET` | `/api/corporate-cards/spending-stats` | getSpendingStats | corporateCard.route.js |
| `GET` | `/api/corporate-cards/:id` | getCorporateCard | corporateCard.route.js |
| `GET` | `/api/corporate-cards/:id/transactions` | getTransactions | corporateCard.route.js |
| `GET` | `/api/corporate-cards/:id/transactions/unmatched` | getUnmatchedTransactions | corporateCard.route.js |
| `POST` | `/api/corporate-cards` | createCorporateCard | corporateCard.route.js |
| `PUT` | `/api/corporate-cards/:id` | updateCorporateCard | corporateCard.route.js |
| `POST` | `/api/corporate-cards/:id/block` | blockCard | corporateCard.route.js |
| `POST` | `/api/corporate-cards/:id/unblock` | unblockCard | corporateCard.route.js |
| `POST` | `/api/corporate-cards/:id/transactions/import` | importTransactions | corporateCard.route.js |
| `POST` | `/api/corporate-cards/:id/transactions/:transactionId/reconcile` | reconcileTransaction | corporateCard.route.js |
| `POST` | `/api/corporate-cards/:id/transactions/:transactionId/dispute` | disputeTransaction | corporateCard.route.js |
| `POST` | `/api/corporate-cards/:id/transactions/:transactionId/categorize` | categorizeTransaction | corporateCard.route.js |
| `DELETE` | `/api/corporate-cards/:id` | deleteCorporateCard | corporateCard.route.js |

## corporateCards

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/corporate-cards/transactions` | unknown | corporateCards.route.js |
| `GET` | `/api/corporate-cards/transactions/:id` | unknown | corporateCards.route.js |
| `POST` | `/api/corporate-cards/transactions` | unknown | corporateCards.route.js |
| `PATCH` | `/api/corporate-cards/transactions/:id` | unknown | corporateCards.route.js |
| `DELETE` | `/api/corporate-cards/transactions/:id` | unknown | corporateCards.route.js |
| `POST` | `/api/corporate-cards/transactions/:transactionId/reconcile` | unknown | corporateCards.route.js |
| `POST` | `/api/corporate-cards/transactions/bulk-reconcile` | unknown | corporateCards.route.js |
| `POST` | `/api/corporate-cards/transactions/:transactionId/match` | unknown | corporateCards.route.js |
| `GET` | `/api/corporate-cards/transactions/:transactionId/potential-matches` | unknown | corporateCards.route.js |
| `POST` | `/api/corporate-cards/transactions/:transactionId/dispute` | unknown | corporateCards.route.js |
| `POST` | `/api/corporate-cards/transactions/:transactionId/resolve-dispute` | unknown | corporateCards.route.js |
| `POST` | `/api/corporate-cards/transactions/import` | unknown | corporateCards.route.js |
| `GET` | `/api/corporate-cards/transactions/csv-template` | unknown | corporateCards.route.js |
| `GET` | `/api/corporate-cards/statistics` | unknown | corporateCards.route.js |
| `GET` | `/api/corporate-cards/reports/reconciliation` | unknown | corporateCards.route.js |
| `GET` | `/api/corporate-cards/reports/reconciliation/export` | unknown | corporateCards.route.js |
| `GET` | `/api/corporate-cards/analytics/spending-by-category` | unknown | corporateCards.route.js |
| `GET` | `/api/corporate-cards/analytics/spending-by-card` | unknown | corporateCards.route.js |
| `GET` | `/api/corporate-cards/analytics/monthly-trend` | unknown | corporateCards.route.js |

## creditNote

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/credit-notes` | getCreditNotes | creditNote.route.js |
| `GET` | `/api/credit-notes/stats` | getCreditNoteStats | creditNote.route.js |
| `GET` | `/api/credit-notes/invoice/:invoiceId` | getCreditNotesForInvoice | creditNote.route.js |
| `GET` | `/api/credit-notes/:id` | getCreditNote | creditNote.route.js |
| `POST` | `/api/credit-notes` | createCreditNote | creditNote.route.js |
| `PUT` | `/api/credit-notes/:id` | updateCreditNote | creditNote.route.js |
| `POST` | `/api/credit-notes/:id/issue` | issueCreditNote | creditNote.route.js |
| `POST` | `/api/credit-notes/:id/apply` | applyCreditNote | creditNote.route.js |
| `POST` | `/api/credit-notes/:id/void` | voidCreditNote | creditNote.route.js |
| `DELETE` | `/api/credit-notes/:id` | deleteCreditNote | creditNote.route.js |

## crmActivity

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/crm-activities/timeline` | unknown | crmActivity.route.js |
| `GET` | `/api/crm-activities/stats` | unknown | crmActivity.route.js |
| `GET` | `/api/crm-activities/tasks/upcoming` | unknown | crmActivity.route.js |
| `POST` | `/api/crm-activities/log/call` | unknown | crmActivity.route.js |
| `POST` | `/api/crm-activities/log/email` | unknown | crmActivity.route.js |
| `POST` | `/api/crm-activities/log/meeting` | unknown | crmActivity.route.js |
| `POST` | `/api/crm-activities/log/note` | unknown | crmActivity.route.js |
| `GET` | `/api/crm-activities/entity/:entityType/:entityId` | unknown | crmActivity.route.js |
| `POST` | `/api/crm-activities` | unknown | crmActivity.route.js |
| `GET` | `/api/crm-activities` | unknown | crmActivity.route.js |
| `GET` | `/api/crm-activities/:id` | unknown | crmActivity.route.js |
| `PUT` | `/api/crm-activities/:id` | unknown | crmActivity.route.js |
| `DELETE` | `/api/crm-activities/:id` | unknown | crmActivity.route.js |
| `POST` | `/api/crm-activities/:id/complete` | unknown | crmActivity.route.js |

## crmAlias

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/crm/lead-sources` | unknown | crmAlias.route.js |
| `POST` | `/api/crm/lead-sources` | unknown | crmAlias.route.js |
| `GET` | `/api/crm/sales-stages` | unknown | crmAlias.route.js |
| `POST` | `/api/crm/sales-stages` | unknown | crmAlias.route.js |
| `GET` | `/api/crm/leads` | unknown | crmAlias.route.js |
| `POST` | `/api/crm/leads` | unknown | crmAlias.route.js |
| `GET` | `/api/crm/appointments` | unknown | crmAlias.route.js |
| `POST` | `/api/crm/appointments` | unknown | crmAlias.route.js |
| `GET` | `/api/crm/reports/revenue/analysis` | unknown | crmAlias.route.js |
| `GET` | `/api/crm/reports/revenue/quota-attainment` | unknown | crmAlias.route.js |
| `GET` | `/api/crm/reports/revenue/win-rate` | unknown | crmAlias.route.js |
| `GET` | `/api/crm/reports/revenue/deal-size` | unknown | crmAlias.route.js |
| `GET` | `/api/crm/reports/performance/leaderboard` | unknown | crmAlias.route.js |
| `GET` | `/api/crm/reports/performance/team` | unknown | crmAlias.route.js |
| `GET` | `/api/crm/reports/performance/rep-scorecard/:userId` | unknown | crmAlias.route.js |
| `GET` | `/api/crm/reports/performance/activity-metrics` | unknown | crmAlias.route.js |
| `GET` | `/api/crm/reports/customer/lifetime-value` | unknown | crmAlias.route.js |
| `GET` | `/api/crm/reports/customer/churn` | unknown | crmAlias.route.js |
| `GET` | `/api/crm/reports/customer/health-score` | unknown | crmAlias.route.js |
| `GET` | `/api/crm/reports/customer/engagement` | unknown | crmAlias.route.js |
| `GET` | `/api/crm/reports/win-loss/analysis` | unknown | crmAlias.route.js |
| `GET` | `/api/crm/reports/win-loss/lost-deals` | unknown | crmAlias.route.js |
| `GET` | `/api/crm/reports/win-loss/competitors` | unknown | crmAlias.route.js |
| `GET` | `/api/crm/reports/territory/performance` | unknown | crmAlias.route.js |
| `GET` | `/api/crm/reports/territory/regional-sales` | unknown | crmAlias.route.js |
| `GET` | `/api/crm/reports/territory/geographic-pipeline` | unknown | crmAlias.route.js |

## crmPipeline

| Method | Path | Controller | File |
|--------|------|------------|------|
| `POST` | `/api/crm-pipelines` | unknown | crmPipeline.route.js |
| `GET` | `/api/crm-pipelines` | unknown | crmPipeline.route.js |
| `GET` | `/api/crm-pipelines/:id` | unknown | crmPipeline.route.js |
| `PUT` | `/api/crm-pipelines/:id` | unknown | crmPipeline.route.js |
| `DELETE` | `/api/crm-pipelines/:id` | unknown | crmPipeline.route.js |
| `POST` | `/api/crm-pipelines/:id/stages` | unknown | crmPipeline.route.js |
| `PUT` | `/api/crm-pipelines/:id/stages/:stageId` | unknown | crmPipeline.route.js |
| `DELETE` | `/api/crm-pipelines/:id/stages/:stageId` | unknown | crmPipeline.route.js |
| `POST` | `/api/crm-pipelines/:id/stages/reorder` | unknown | crmPipeline.route.js |
| `GET` | `/api/crm-pipelines/:id/stats` | unknown | crmPipeline.route.js |
| `POST` | `/api/crm-pipelines/:id/default` | unknown | crmPipeline.route.js |
| `POST` | `/api/crm-pipelines/:id/duplicate` | unknown | crmPipeline.route.js |

## crmReports

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/crm-reports/quick-stats` | unknown | crmReports.route.js |
| `GET` | `/api/crm-reports/recent-activity` | unknown | crmReports.route.js |
| `GET` | `/api/crm-reports/funnel/overview` | unknown | crmReports.route.js |
| `GET` | `/api/crm-reports/funnel/velocity` | unknown | crmReports.route.js |
| `GET` | `/api/crm-reports/funnel/bottlenecks` | unknown | crmReports.route.js |
| `GET` | `/api/crm-reports/aging/overview` | unknown | crmReports.route.js |
| `GET` | `/api/crm-reports/aging/by-stage` | unknown | crmReports.route.js |
| `GET` | `/api/crm-reports/leads-source/overview` | unknown | crmReports.route.js |
| `GET` | `/api/crm-reports/leads-source/trend` | unknown | crmReports.route.js |
| `GET` | `/api/crm-reports/win-loss/overview` | unknown | crmReports.route.js |
| `GET` | `/api/crm-reports/win-loss/reasons` | unknown | crmReports.route.js |
| `GET` | `/api/crm-reports/win-loss/trend` | unknown | crmReports.route.js |
| `GET` | `/api/crm-reports/activity/overview` | unknown | crmReports.route.js |
| `GET` | `/api/crm-reports/activity/by-day-of-week` | unknown | crmReports.route.js |
| `GET` | `/api/crm-reports/activity/by-hour` | unknown | crmReports.route.js |
| `GET` | `/api/crm-reports/activity/leaderboard` | unknown | crmReports.route.js |
| `GET` | `/api/crm-reports/forecast/overview` | unknown | crmReports.route.js |
| `GET` | `/api/crm-reports/forecast/by-month` | unknown | crmReports.route.js |
| `GET` | `/api/crm-reports/forecast/by-rep` | unknown | crmReports.route.js |
| `POST` | `/api/crm-reports/export` | unknown | crmReports.route.js |
| `GET` | `/api/crm-reports/campaign-efficiency` | unknown | crmReports.route.js |
| `GET` | `/api/crm-reports/lead-owner-efficiency` | unknown | crmReports.route.js |
| `GET` | `/api/crm-reports/first-response-time` | unknown | crmReports.route.js |
| `GET` | `/api/crm-reports/lost-opportunity` | unknown | crmReports.route.js |
| `GET` | `/api/crm-reports/sales-pipeline` | unknown | crmReports.route.js |
| `GET` | `/api/crm-reports/prospects-engaged` | unknown | crmReports.route.js |
| `GET` | `/api/crm-reports/lead-conversion-time` | unknown | crmReports.route.js |

## crmReportsAlias

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/crm/reports/pipeline/overview` | unknown | crmReportsAlias.route.js |
| `GET` | `/api/crm/reports/pipeline/velocity` | unknown | crmReportsAlias.route.js |
| `GET` | `/api/crm/reports/pipeline/stage-duration` | unknown | crmReportsAlias.route.js |
| `GET` | `/api/crm/reports/pipeline/deal-aging` | unknown | crmReportsAlias.route.js |
| `GET` | `/api/crm/reports/pipeline/movement` | unknown | crmReportsAlias.route.js |
| `GET` | `/api/crm/reports/leads/by-source` | unknown | crmReportsAlias.route.js |
| `GET` | `/api/crm/reports/leads/conversion-funnel` | unknown | crmReportsAlias.route.js |
| `GET` | `/api/crm/reports/leads/response-time` | unknown | crmReportsAlias.route.js |
| `GET` | `/api/crm/reports/leads/velocity` | unknown | crmReportsAlias.route.js |
| `GET` | `/api/crm/reports/leads/distribution` | unknown | crmReportsAlias.route.js |
| `GET` | `/api/crm/reports/activity/summary` | unknown | crmReportsAlias.route.js |
| `GET` | `/api/crm/reports/activity/calls` | unknown | crmReportsAlias.route.js |
| `GET` | `/api/crm/reports/activity/emails` | unknown | crmReportsAlias.route.js |
| `GET` | `/api/crm/reports/activity/meetings` | unknown | crmReportsAlias.route.js |
| `GET` | `/api/crm/reports/activity/tasks` | unknown | crmReportsAlias.route.js |
| `GET` | `/api/crm/reports/revenue/forecast` | unknown | crmReportsAlias.route.js |
| `GET` | `/api/crm/reports/revenue/by-month` | unknown | crmReportsAlias.route.js |
| `GET` | `/api/crm/reports/revenue/by-rep` | unknown | crmReportsAlias.route.js |

## crmReportsExtended

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/crm-reports/pipeline/overview` | unknown | crmReportsExtended.route.js |
| `GET` | `/api/crm-reports/pipeline/velocity` | unknown | crmReportsExtended.route.js |
| `GET` | `/api/crm-reports/pipeline/stage-duration` | unknown | crmReportsExtended.route.js |
| `GET` | `/api/crm-reports/pipeline/deal-aging` | unknown | crmReportsExtended.route.js |
| `GET` | `/api/crm-reports/pipeline/movement` | unknown | crmReportsExtended.route.js |
| `GET` | `/api/crm-reports/leads/by-source` | unknown | crmReportsExtended.route.js |
| `GET` | `/api/crm-reports/leads/conversion-funnel` | unknown | crmReportsExtended.route.js |
| `GET` | `/api/crm-reports/leads/response-time` | unknown | crmReportsExtended.route.js |
| `GET` | `/api/crm-reports/leads/velocity-rate` | unknown | crmReportsExtended.route.js |
| `GET` | `/api/crm-reports/leads/distribution` | unknown | crmReportsExtended.route.js |
| `GET` | `/api/crm-reports/activities/summary` | unknown | crmReportsExtended.route.js |
| `GET` | `/api/crm-reports/activities/calls` | unknown | crmReportsExtended.route.js |
| `GET` | `/api/crm-reports/activities/emails` | unknown | crmReportsExtended.route.js |
| `GET` | `/api/crm-reports/activities/meetings` | unknown | crmReportsExtended.route.js |
| `GET` | `/api/crm-reports/activities/tasks` | unknown | crmReportsExtended.route.js |
| `GET` | `/api/crm-reports/revenue/forecast` | unknown | crmReportsExtended.route.js |
| `GET` | `/api/crm-reports/revenue/analysis` | unknown | crmReportsExtended.route.js |
| `GET` | `/api/crm-reports/revenue/quota-attainment` | unknown | crmReportsExtended.route.js |
| `GET` | `/api/crm-reports/revenue/win-rate` | unknown | crmReportsExtended.route.js |
| `GET` | `/api/crm-reports/revenue/deal-size` | unknown | crmReportsExtended.route.js |
| `GET` | `/api/crm-reports/performance/leaderboard` | unknown | crmReportsExtended.route.js |
| `GET` | `/api/crm-reports/performance/team` | unknown | crmReportsExtended.route.js |
| `GET` | `/api/crm-reports/performance/rep-scorecard/:userId` | unknown | crmReportsExtended.route.js |
| `GET` | `/api/crm-reports/performance/activity-metrics` | unknown | crmReportsExtended.route.js |

## crmSettings

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/crmSettings` | unknown | crmSettings.route.js |
| `PUT` | `/api/crmSettings` | unknown | crmSettings.route.js |
| `POST` | `/api/crmSettings/reset` | unknown | crmSettings.route.js |

## crmTransaction

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/crm-transactions` | getTransactions | crmTransaction.route.js |
| `GET` | `/api/crm-transactions/summary` | getSummary | crmTransaction.route.js |
| `GET` | `/api/crm-transactions/daily-report` | getDailyReport | crmTransaction.route.js |
| `GET` | `/api/crm-transactions/export` | exportTransactions | crmTransaction.route.js |
| `GET` | `/api/crm-transactions/entity/:entityType/:entityId` | getEntityTimeline | crmTransaction.route.js |
| `GET` | `/api/crm-transactions/user-activity/:userId` | getUserActivity | crmTransaction.route.js |
| `GET` | `/api/crm-transactions/stale-leads` | getStaleLeads | crmTransaction.route.js |
| `GET` | `/api/crm-transactions/stale-leads/summary` | getStaleSummary | crmTransaction.route.js |
| `GET` | `/api/crm-transactions/stale-leads/by-stage` | getStalenessbyStage | crmTransaction.route.js |
| `GET` | `/api/crm-transactions/leads-needing-attention` | getLeadsNeedingAttention | crmTransaction.route.js |
| `GET` | `/api/crm-transactions/revenue-forecast` | getRevenueForecast | crmTransaction.route.js |
| `GET` | `/api/crm-transactions/revenue-forecast/by-period` | getForecastByPeriod | crmTransaction.route.js |
| `GET` | `/api/crm-transactions/pipeline-velocity` | getPipelineVelocity | crmTransaction.route.js |
| `GET` | `/api/crm-transactions/forecast-trends` | getForecastTrends | crmTransaction.route.js |
| `GET` | `/api/crm-transactions/forecast-by-category` | getForecastByCategory | crmTransaction.route.js |

## currency

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/currency/settings` | getCurrencySettings | currency.route.js |
| `GET` | `/api/currency/rates` | getExchangeRates | currency.route.js |
| `POST` | `/api/currency/convert` | convertAmount | currency.route.js |
| `POST` | `/api/currency/rates` | setManualRate | currency.route.js |
| `GET` | `/api/currency/supported` | getSupportedCurrencies | currency.route.js |
| `POST` | `/api/currency/update` | updateRatesFromAPI | currency.route.js |

## customFields

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/customFields/export` | exportFields | customField.routes.js |
| `POST` | `/api/customFields/import` | importFields | customField.routes.js |
| `POST` | `/api/customFields/search` | searchByField | customField.routes.js |
| `POST` | `/api/customFields/bulk-update` | bulkUpdateValues | customField.routes.js |
| `GET` | `/api/customFields/dependencies/:entityType/:entityId` | checkDependencies | customField.routes.js |
| `GET` | `/api/customFields/values/:entityType/:entityId` | getEntityValues | customField.routes.js |
| `POST` | `/api/customFields/values/:entityType/:entityId` | setEntityValue | customField.routes.js |
| `POST` | `/api/customFields/values/:entityType/:entityId/bulk` | setEntityValues | customField.routes.js |
| `DELETE` | `/api/customFields/values/:entityType/:entityId` | deleteEntityValues | customField.routes.js |
| `DELETE` | `/api/customFields/values/:entityType/:entityId/:fieldId` | deleteEntityValue | customField.routes.js |
| `GET` | `/api/customFields` | getFields | customField.routes.js |
| `POST` | `/api/customFields` | createField | customField.routes.js |
| `GET` | `/api/customFields/:id` | getField | customField.routes.js |
| `PATCH` | `/api/customFields/:id` | updateField | customField.routes.js |
| `DELETE` | `/api/customFields/:id` | deleteField | customField.routes.js |
| `GET` | `/api/customFields/:id/stats` | getFieldStats | customField.routes.js |
| `POST` | `/api/customFields/:id/validate` | validateValue | customField.routes.js |

## cycles

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/cycles/active` | unknown | cycle.routes.js |
| `GET` | `/api/cycles/stats` | unknown | cycle.routes.js |
| `GET` | `/api/cycles` | unknown | cycle.routes.js |
| `POST` | `/api/cycles` | unknown | cycle.routes.js |
| `GET` | `/api/cycles/:id` | unknown | cycle.routes.js |
| `POST` | `/api/cycles/:id/start` | unknown | cycle.routes.js |
| `POST` | `/api/cycles/:id/complete` | unknown | cycle.routes.js |
| `GET` | `/api/cycles/:id/progress` | unknown | cycle.routes.js |
| `GET` | `/api/cycles/:id/burndown` | unknown | cycle.routes.js |
| `POST` | `/api/cycles/:id/tasks/:taskId` | unknown | cycle.routes.js |
| `DELETE` | `/api/cycles/:id/tasks/:taskId` | unknown | cycle.routes.js |

## dashboard

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/dashboard/summary` | unknown | dashboard.route.js |
| `GET` | `/api/dashboard/analytics` | unknown | dashboard.route.js |
| `GET` | `/api/dashboard/reports` | unknown | dashboard.route.js |
| `GET` | `/api/dashboard/hero-stats` | unknown | dashboard.route.js |
| `GET` | `/api/dashboard/stats` | unknown | dashboard.route.js |
| `GET` | `/api/dashboard/financial-summary` | unknown | dashboard.route.js |
| `GET` | `/api/dashboard/today-events` | unknown | dashboard.route.js |
| `GET` | `/api/dashboard/recent-messages` | unknown | dashboard.route.js |
| `GET` | `/api/dashboard/activity` | unknown | dashboard.route.js |
| `GET` | `/api/dashboard/crm-stats` | unknown | dashboard.route.js |
| `GET` | `/api/dashboard/hr-stats` | unknown | dashboard.route.js |
| `GET` | `/api/dashboard/finance-stats` | unknown | dashboard.route.js |

## dataExport

| Method | Path | Controller | File |
|--------|------|------------|------|
| `POST` | `/api/data-export/export` | createExportJob | dataExport.route.js |
| `GET` | `/api/data-export/jobs` | getExportJobs | dataExport.route.js |
| `GET` | `/api/data-export/jobs/:id` | getExportJobStatus | dataExport.route.js |
| `GET` | `/api/data-export/jobs/:id/download` | downloadExportFile | dataExport.route.js |
| `POST` | `/api/data-export/jobs/:id/cancel` | cancelExportJob | dataExport.route.js |
| `DELETE` | `/api/data-export/jobs/:id` | deleteExportJob | dataExport.route.js |
| `POST` | `/api/data-export/import` | createImportJob | dataExport.route.js |
| `GET` | `/api/data-export/imports` | getImportJobs | dataExport.route.js |
| `GET` | `/api/data-export/import/:id` | getImportJobStatus | dataExport.route.js |
| `POST` | `/api/data-export/import/:id/start` | startImportJob | dataExport.route.js |
| `POST` | `/api/data-export/import/:id/validate` | validateImportFile | dataExport.route.js |
| `POST` | `/api/data-export/import/:id/cancel` | cancelImportJob | dataExport.route.js |
| `GET` | `/api/data-export/templates` | getExportTemplates | dataExport.route.js |
| `POST` | `/api/data-export/templates` | createExportTemplate | dataExport.route.js |
| `PATCH` | `/api/data-export/templates/:id` | updateExportTemplate | dataExport.route.js |
| `DELETE` | `/api/data-export/templates/:id` | deleteExportTemplate | dataExport.route.js |
| `GET` | `/api/data-export/entity/:entityType` | exportEntity | dataExport.route.js |
| `GET` | `/api/data-export/report/:reportType` | exportReport | dataExport.route.js |

## dealHealths

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/dealHealths/distribution` | unknown | dealHealth.routes.js |
| `GET` | `/api/dealHealths/attention` | unknown | dealHealth.routes.js |
| `GET` | `/api/dealHealths/stuck` | unknown | dealHealth.routes.js |
| `GET` | `/api/dealHealths/:id` | unknown | dealHealth.routes.js |
| `POST` | `/api/dealHealths/:id/refresh` | unknown | dealHealth.routes.js |
| `POST` | `/api/dealHealths/:id/unstuck` | unknown | dealHealth.routes.js |

## dealRooms

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/dealRooms/external/:token` | unknown | dealRoom.routes.js |
| `GET` | `/api/dealRooms/deals/:dealId/room` | unknown | dealRoom.routes.js |
| `POST` | `/api/dealRooms/deals/:dealId/room` | unknown | dealRoom.routes.js |
| `GET` | `/api/dealRooms/:id/activity` | unknown | dealRoom.routes.js |
| `POST` | `/api/dealRooms/:id/pages` | unknown | dealRoom.routes.js |
| `PUT` | `/api/dealRooms/:id/pages/:pageId` | unknown | dealRoom.routes.js |
| `DELETE` | `/api/dealRooms/:id/pages/:pageId` | unknown | dealRoom.routes.js |
| `POST` | `/api/dealRooms/:id/documents` | unknown | dealRoom.routes.js |
| `POST` | `/api/dealRooms/:id/documents/:index/view` | unknown | dealRoom.routes.js |
| `POST` | `/api/dealRooms/:id/access` | unknown | dealRoom.routes.js |
| `DELETE` | `/api/dealRooms/:id/access/:token` | unknown | dealRoom.routes.js |

## debitNote

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/debit-notes` | getDebitNotes | debitNote.route.js |
| `GET` | `/api/debit-notes/pending-approvals` | getPendingApprovals | debitNote.route.js |
| `GET` | `/api/debit-notes/bill/:billId` | getDebitNotesForBill | debitNote.route.js |
| `GET` | `/api/debit-notes/:id` | getDebitNote | debitNote.route.js |
| `POST` | `/api/debit-notes` | createDebitNote | debitNote.route.js |
| `PUT` | `/api/debit-notes/:id` | updateDebitNote | debitNote.route.js |
| `POST` | `/api/debit-notes/:id/submit` | submitDebitNote | debitNote.route.js |
| `POST` | `/api/debit-notes/:id/approve` | approveDebitNote | debitNote.route.js |
| `POST` | `/api/debit-notes/:id/reject` | rejectDebitNote | debitNote.route.js |
| `POST` | `/api/debit-notes/:id/apply` | applyDebitNote | debitNote.route.js |
| `POST` | `/api/debit-notes/:id/cancel` | cancelDebitNote | debitNote.route.js |
| `DELETE` | `/api/debit-notes/:id` | deleteDebitNote | debitNote.route.js |

## deduplications

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/deduplications/contacts/:id/duplicates` | unknown | deduplication.routes.js |
| `POST` | `/api/deduplications/contacts/scan-duplicates` | unknown | deduplication.routes.js |
| `GET` | `/api/deduplications/contacts/duplicate-suggestions` | unknown | deduplication.routes.js |
| `POST` | `/api/deduplications/contacts/merge` | unknown | deduplication.routes.js |
| `POST` | `/api/deduplications/contacts/auto-merge` | unknown | deduplication.routes.js |
| `POST` | `/api/deduplications/contacts/not-duplicate` | unknown | deduplication.routes.js |

## discord

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/discord/auth-url` | getAuthUrl | discord.route.js |
| `GET` | `/api/discord/callback` | handleCallback | discord.route.js |
| `POST` | `/api/discord/complete-setup` | completeSetup | discord.route.js |
| `GET` | `/api/discord/status` | getStatus | discord.route.js |
| `POST` | `/api/discord/disconnect` | disconnect | discord.route.js |
| `POST` | `/api/discord/test` | testConnection | discord.route.js |
| `GET` | `/api/discord/guilds` | listGuilds | discord.route.js |
| `GET` | `/api/discord/guilds/:guildId/channels` | listChannels | discord.route.js |
| `PUT` | `/api/discord/settings` | updateSettings | discord.route.js |
| `POST` | `/api/discord/message` | sendMessage | discord.route.js |
| `POST` | `/api/discord/webhook` | handleWebhook | discord.route.js |

## dispute

| Method | Path | Controller | File |
|--------|------|------------|------|
| `POST` | `/api/disputes` | createDispute | dispute.route.js |
| `GET` | `/api/disputes` | getDisputes | dispute.route.js |
| `GET` | `/api/disputes/stats` | getDisputeStats | dispute.route.js |
| `GET` | `/api/disputes/by-type` | getDisputesByType | dispute.route.js |
| `GET` | `/api/disputes/:id` | getDisputeById | dispute.route.js |
| `POST` | `/api/disputes/:id/respond` | lawyerRespond | dispute.route.js |
| `POST` | `/api/disputes/:id/escalate` | escalateDispute | dispute.route.js |
| `POST` | `/api/disputes/:id/resolve` | resolveDispute | dispute.route.js |
| `POST` | `/api/disputes/:id/evidence` | addEvidence | dispute.route.js |
| `POST` | `/api/disputes/:id/mediator-note` | addMediatorNote | dispute.route.js |

## document

| Method | Path | Controller | File |
|--------|------|------------|------|
| `POST` | `/api/documents/upload` | getUploadUrl | document.route.js |
| `POST` | `/api/documents/confirm` | confirmUpload | document.route.js |
| `GET` | `/api/documents/search` | searchDocuments | document.route.js |
| `GET` | `/api/documents/stats` | getDocumentStats | document.route.js |
| `GET` | `/api/documents/recent` | getRecentDocuments | document.route.js |
| `GET` | `/api/documents/case/:caseId` | getDocumentsByCase | document.route.js |
| `GET` | `/api/documents/client/:clientId` | getDocumentsByClient | document.route.js |
| `POST` | `/api/documents/bulk-delete` | bulkDeleteDocuments | document.route.js |
| `GET` | `/api/documents` | getDocuments | document.route.js |
| `GET` | `/api/documents/:id` | getDocument | document.route.js |
| `PATCH` | `/api/documents/:id` | updateDocument | document.route.js |
| `DELETE` | `/api/documents/:id` | deleteDocument | document.route.js |
| `GET` | `/api/documents/:id/download` | downloadDocument | document.route.js |
| `GET` | `/api/documents/:id/versions` | getVersionHistory | document.route.js |
| `POST` | `/api/documents/:id/versions` | uploadVersion | document.route.js |
| `POST` | `/api/documents/:id/versions/:versionId/restore` | restoreVersion | document.route.js |
| `POST` | `/api/documents/:id/share` | generateShareLink | document.route.js |
| `POST` | `/api/documents/:id/revoke-share` | revokeShareLink | document.route.js |
| `POST` | `/api/documents/:id/move` | moveDocument | document.route.js |

## documentAnalysis

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/document-analysis/stats` | getStats | documentAnalysis.route.js |
| `GET` | `/api/document-analysis/search` | semanticSearch | documentAnalysis.route.js |
| `POST` | `/api/document-analysis/batch` | batchAnalyze | documentAnalysis.route.js |
| `POST` | `/api/document-analysis/:documentId` | analyzeDocument | documentAnalysis.route.js |
| `GET` | `/api/document-analysis/:documentId` | getAnalysis | documentAnalysis.route.js |
| `DELETE` | `/api/document-analysis/:documentId` | deleteAnalysis | documentAnalysis.route.js |
| `POST` | `/api/document-analysis/:documentId/reanalyze` | reanalyzeDocument | documentAnalysis.route.js |
| `GET` | `/api/document-analysis/:documentId/status` | getAnalysisStatus | documentAnalysis.route.js |
| `GET` | `/api/document-analysis/:documentId/history` | getAnalysisHistory | documentAnalysis.route.js |
| `GET` | `/api/document-analysis/:documentId/similar` | findSimilar | documentAnalysis.route.js |
| `GET` | `/api/document-analysis/:documentId/report` | generateReport | documentAnalysis.route.js |

## documentsExtended

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/documents/:documentId/versions/:versionId` | unknown | documentsExtended.route.js |
| `GET` | `/api/documents/:documentId/versions/:versionId/download` | unknown | documentsExtended.route.js |
| `GET` | `/api/documents/:documentId/versions/:versionId/download-url` | unknown | documentsExtended.route.js |
| `GET` | `/api/documents/:documentId/versions/:versionId/preview-url` | unknown | documentsExtended.route.js |
| `POST` | `/api/documents/:documentId/versions/:versionId/restore` | unknown | documentsExtended.route.js |
| `DELETE` | `/api/documents/:documentId/versions/:versionId` | unknown | documentsExtended.route.js |
| `POST` | `/api/documents/:documentId/versions/:versionId/compare` | unknown | documentsExtended.route.js |
| `GET` | `/api/documents/:id/preview-url` | unknown | documentsExtended.route.js |
| `GET` | `/api/documents/:id/download-url` | unknown | documentsExtended.route.js |
| `POST` | `/api/documents/:id/encrypt` | unknown | documentsExtended.route.js |
| `POST` | `/api/documents/:id/decrypt` | unknown | documentsExtended.route.js |

## docusign

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/docusign/auth-url` | getAuthUrl | docusign.route.js |
| `GET` | `/api/docusign/callback` | handleCallback | docusign.route.js |
| `POST` | `/api/docusign/disconnect` | disconnect | docusign.route.js |
| `GET` | `/api/docusign/status` | getStatus | docusign.route.js |
| `POST` | `/api/docusign/envelopes` | sendForSignature | docusign.route.js |
| `POST` | `/api/docusign/envelopes/from-template` | useTemplate | docusign.route.js |
| `GET` | `/api/docusign/envelopes` | listEnvelopes | docusign.route.js |
| `GET` | `/api/docusign/envelopes/:envelopeId` | getEnvelope | docusign.route.js |
| `GET` | `/api/docusign/envelopes/:envelopeId/documents` | downloadDocument | docusign.route.js |
| `POST` | `/api/docusign/envelopes/:envelopeId/void` | voidEnvelope | docusign.route.js |
| `POST` | `/api/docusign/envelopes/:envelopeId/resend` | resendEnvelope | docusign.route.js |
| `POST` | `/api/docusign/envelopes/:envelopeId/signing-url` | getSigningUrl | docusign.route.js |
| `GET` | `/api/docusign/templates` | listTemplates | docusign.route.js |
| `POST` | `/api/docusign/templates/defaults` | addDefaultTemplate | docusign.route.js |
| `DELETE` | `/api/docusign/templates/defaults/:templateId` | removeDefaultTemplate | docusign.route.js |
| `PUT` | `/api/docusign/settings` | updateSettings | docusign.route.js |
| `POST` | `/api/docusign/webhook` | handleWebhook | docusign.route.js |

## dripCampaigns

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/email-marketing/drip-campaigns` | unknown | dripCampaigns.route.js |
| `GET` | `/api/email-marketing/drip-campaigns/:id` | unknown | dripCampaigns.route.js |
| `POST` | `/api/email-marketing/drip-campaigns` | unknown | dripCampaigns.route.js |
| `PUT` | `/api/email-marketing/drip-campaigns/:id` | unknown | dripCampaigns.route.js |
| `DELETE` | `/api/email-marketing/drip-campaigns/:id` | unknown | dripCampaigns.route.js |
| `POST` | `/api/email-marketing/drip-campaigns/:id/start` | unknown | dripCampaigns.route.js |
| `POST` | `/api/email-marketing/drip-campaigns/:id/pause` | unknown | dripCampaigns.route.js |
| `POST` | `/api/email-marketing/drip-campaigns/:id/stop` | unknown | dripCampaigns.route.js |
| `GET` | `/api/email-marketing/drip-campaigns/:id/analytics` | unknown | dripCampaigns.route.js |

## dunning

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/dunning/dashboard` | unknown | dunning.route.js |
| `GET` | `/api/dunning/stats` | unknown | dunning.route.js |
| `GET` | `/api/dunning/report` | unknown | dunning.route.js |
| `GET` | `/api/dunning/report/export` | unknown | dunning.route.js |
| `GET` | `/api/dunning/overdue-invoices` | unknown | dunning.route.js |
| `GET` | `/api/dunning/upcoming-actions` | unknown | dunning.route.js |
| `GET` | `/api/dunning/paused-invoices` | unknown | dunning.route.js |
| `GET` | `/api/dunning/policies` | unknown | dunning.route.js |
| `GET` | `/api/dunning/policies/default` | unknown | dunning.route.js |
| `POST` | `/api/dunning/policies` | unknown | dunning.route.js |
| `GET` | `/api/dunning/policies/:id` | unknown | dunning.route.js |
| `PUT` | `/api/dunning/policies/:id` | unknown | dunning.route.js |
| `DELETE` | `/api/dunning/policies/:id` | unknown | dunning.route.js |
| `POST` | `/api/dunning/policies/:id/set-default` | unknown | dunning.route.js |
| `POST` | `/api/dunning/policies/:id/toggle-status` | unknown | dunning.route.js |
| `POST` | `/api/dunning/policies/:id/duplicate` | unknown | dunning.route.js |
| `POST` | `/api/dunning/policies/:id/test` | unknown | dunning.route.js |
| `POST` | `/api/dunning/policies/:id/apply` | unknown | dunning.route.js |
| `GET` | `/api/dunning/history` | unknown | dunning.route.js |
| `GET` | `/api/dunning/history/invoice/:invoiceId` | unknown | dunning.route.js |
| `POST` | `/api/dunning/history` | unknown | dunning.route.js |
| `POST` | `/api/dunning/history/:invoiceId/pause` | unknown | dunning.route.js |
| `POST` | `/api/dunning/history/:invoiceId/resume` | unknown | dunning.route.js |
| `POST` | `/api/dunning/history/:invoiceId/escalate` | unknown | dunning.route.js |

## emailMarketing

| Method | Path | Controller | File |
|--------|------|------------|------|
| `POST` | `/api/email-marketing/campaigns` | unknown | emailMarketing.route.js |
| `GET` | `/api/email-marketing/campaigns` | unknown | emailMarketing.route.js |
| `GET` | `/api/email-marketing/campaigns/:id` | unknown | emailMarketing.route.js |
| `PUT` | `/api/email-marketing/campaigns/:id` | unknown | emailMarketing.route.js |
| `DELETE` | `/api/email-marketing/campaigns/:id` | unknown | emailMarketing.route.js |
| `POST` | `/api/email-marketing/campaigns/:id/duplicate` | unknown | emailMarketing.route.js |
| `POST` | `/api/email-marketing/campaigns/:id/schedule` | unknown | emailMarketing.route.js |
| `POST` | `/api/email-marketing/campaigns/:id/send` | unknown | emailMarketing.route.js |
| `POST` | `/api/email-marketing/campaigns/:id/pause` | unknown | emailMarketing.route.js |
| `POST` | `/api/email-marketing/campaigns/:id/resume` | unknown | emailMarketing.route.js |
| `POST` | `/api/email-marketing/campaigns/:id/cancel` | unknown | emailMarketing.route.js |
| `POST` | `/api/email-marketing/campaigns/:id/test` | unknown | emailMarketing.route.js |
| `GET` | `/api/email-marketing/campaigns/:id/analytics` | unknown | emailMarketing.route.js |
| `POST` | `/api/email-marketing/templates` | unknown | emailMarketing.route.js |
| `GET` | `/api/email-marketing/templates` | unknown | emailMarketing.route.js |
| `GET` | `/api/email-marketing/templates/public` | unknown | emailMarketing.route.js |
| `GET` | `/api/email-marketing/templates/:id` | unknown | emailMarketing.route.js |
| `PUT` | `/api/email-marketing/templates/:id` | unknown | emailMarketing.route.js |
| `DELETE` | `/api/email-marketing/templates/:id` | unknown | emailMarketing.route.js |
| `POST` | `/api/email-marketing/templates/:id/preview` | unknown | emailMarketing.route.js |
| `POST` | `/api/email-marketing/subscribers` | unknown | emailMarketing.route.js |
| `GET` | `/api/email-marketing/subscribers` | unknown | emailMarketing.route.js |
| `PUT` | `/api/email-marketing/subscribers/:id` | unknown | emailMarketing.route.js |
| `DELETE` | `/api/email-marketing/subscribers/:id` | unknown | emailMarketing.route.js |
| `POST` | `/api/email-marketing/subscribers/import` | unknown | emailMarketing.route.js |
| `POST` | `/api/email-marketing/subscribers/export` | unknown | emailMarketing.route.js |
| `POST` | `/api/email-marketing/subscribers/:id/unsubscribe` | unknown | emailMarketing.route.js |
| `POST` | `/api/email-marketing/segments` | unknown | emailMarketing.route.js |
| `GET` | `/api/email-marketing/segments` | unknown | emailMarketing.route.js |
| `GET` | `/api/email-marketing/segments/:id` | unknown | emailMarketing.route.js |
| `PUT` | `/api/email-marketing/segments/:id` | unknown | emailMarketing.route.js |
| `DELETE` | `/api/email-marketing/segments/:id` | unknown | emailMarketing.route.js |
| `GET` | `/api/email-marketing/segments/:id/subscribers` | unknown | emailMarketing.route.js |
| `POST` | `/api/email-marketing/segments/:id/refresh` | unknown | emailMarketing.route.js |
| `GET` | `/api/email-marketing/analytics/overview` | unknown | emailMarketing.route.js |
| `GET` | `/api/email-marketing/analytics/trends` | unknown | emailMarketing.route.js |
| `POST` | `/api/email-marketing/webhooks/email/resend` | unknown | emailMarketing.route.js |
| `GET` | `/api/email-marketing/webhooks/email/track/open/:trackingId` | unknown | emailMarketing.route.js |
| `GET` | `/api/email-marketing/webhooks/email/unsubscribe/:email` | unknown | emailMarketing.route.js |

## emailSettings

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/settings/email/smtp` | getSmtpConfig | emailSettings.route.js |
| `PUT` | `/api/settings/email/smtp` | saveSmtpConfig | emailSettings.route.js |
| `POST` | `/api/settings/email/smtp/test` | testSmtpConnection | emailSettings.route.js |
| `GET` | `/api/settings/email/templates` | getTemplates | emailSettings.route.js |
| `GET` | `/api/settings/email/templates/:id` | getTemplate | emailSettings.route.js |
| `POST` | `/api/settings/email/templates` | createTemplate | emailSettings.route.js |
| `PUT` | `/api/settings/email/templates/:id` | updateTemplate | emailSettings.route.js |
| `DELETE` | `/api/settings/email/templates/:id` | deleteTemplate | emailSettings.route.js |
| `POST` | `/api/settings/email/templates/:id/preview` | previewTemplate | emailSettings.route.js |
| `GET` | `/api/settings/email/signatures` | getSignatures | emailSettings.route.js |
| `POST` | `/api/settings/email/signatures` | createSignature | emailSettings.route.js |
| `PUT` | `/api/settings/email/signatures/:id` | updateSignature | emailSettings.route.js |
| `DELETE` | `/api/settings/email/signatures/:id` | deleteSignature | emailSettings.route.js |
| `PUT` | `/api/settings/email/signatures/:id/default` | setDefaultSignature | emailSettings.route.js |

## emailTemplates

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/emailTemplates/variables` | unknown | emailTemplate.routes.js |
| `GET` | `/api/emailTemplates/trigger/:triggerEvent` | unknown | emailTemplate.routes.js |
| `GET` | `/api/emailTemplates` | unknown | emailTemplate.routes.js |
| `POST` | `/api/emailTemplates` | unknown | emailTemplate.routes.js |
| `GET` | `/api/emailTemplates/:id` | unknown | emailTemplate.routes.js |
| `PUT` | `/api/emailTemplates/:id` | unknown | emailTemplate.routes.js |
| `DELETE` | `/api/emailTemplates/:id` | unknown | emailTemplate.routes.js |
| `POST` | `/api/emailTemplates/:id/preview` | unknown | emailTemplate.routes.js |
| `POST` | `/api/emailTemplates/:id/duplicate` | unknown | emailTemplate.routes.js |
| `POST` | `/api/emailTemplates/:id/test` | unknown | emailTemplate.routes.js |

## employeeAdvance

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/hr/advances/stats` | unknown | employeeAdvance.route.js |
| `GET` | `/api/hr/advances/pending-approvals` | unknown | employeeAdvance.route.js |
| `GET` | `/api/hr/advances/overdue-recoveries` | unknown | employeeAdvance.route.js |
| `GET` | `/api/hr/advances/emergency` | unknown | employeeAdvance.route.js |
| `POST` | `/api/hr/advances/check-eligibility` | unknown | employeeAdvance.route.js |
| `POST` | `/api/hr/advances/bulk-delete` | unknown | employeeAdvance.route.js |
| `GET` | `/api/hr/advances/by-employee/:employeeId` | unknown | employeeAdvance.route.js |
| `GET` | `/api/hr/advances` | unknown | employeeAdvance.route.js |
| `POST` | `/api/hr/advances` | unknown | employeeAdvance.route.js |
| `GET` | `/api/hr/advances/:advanceId` | unknown | employeeAdvance.route.js |
| `PATCH` | `/api/hr/advances/:advanceId` | unknown | employeeAdvance.route.js |
| `DELETE` | `/api/hr/advances/:advanceId` | unknown | employeeAdvance.route.js |
| `POST` | `/api/hr/advances/:advanceId/approve` | unknown | employeeAdvance.route.js |
| `POST` | `/api/hr/advances/:advanceId/reject` | unknown | employeeAdvance.route.js |
| `POST` | `/api/hr/advances/:advanceId/cancel` | unknown | employeeAdvance.route.js |
| `POST` | `/api/hr/advances/:advanceId/disburse` | unknown | employeeAdvance.route.js |
| `POST` | `/api/hr/advances/:advanceId/recover` | unknown | employeeAdvance.route.js |
| `POST` | `/api/hr/advances/:advanceId/payroll-deduction` | unknown | employeeAdvance.route.js |
| `POST` | `/api/hr/advances/:advanceId/early-recovery` | unknown | employeeAdvance.route.js |
| `POST` | `/api/hr/advances/:advanceId/write-off` | unknown | employeeAdvance.route.js |
| `POST` | `/api/hr/advances/:advanceId/issue-clearance` | unknown | employeeAdvance.route.js |
| `POST` | `/api/hr/advances/:advanceId/documents` | unknown | employeeAdvance.route.js |
| `POST` | `/api/hr/advances/:advanceId/communications` | unknown | employeeAdvance.route.js |

## employeeBenefit

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/hr/employee-benefits/stats` | unknown | employeeBenefit.route.js |
| `GET` | `/api/hr/employee-benefits/expiring` | unknown | employeeBenefit.route.js |
| `GET` | `/api/hr/employee-benefits/cost-summary` | unknown | employeeBenefit.route.js |
| `GET` | `/api/hr/employee-benefits/export` | unknown | employeeBenefit.route.js |
| `GET` | `/api/hr/employee-benefits` | unknown | employeeBenefit.route.js |
| `POST` | `/api/hr/employee-benefits` | unknown | employeeBenefit.route.js |
| `POST` | `/api/hr/employee-benefits/bulk-delete` | unknown | employeeBenefit.route.js |
| `GET` | `/api/hr/employee-benefits/employee/:employeeId` | unknown | employeeBenefit.route.js |
| `GET` | `/api/hr/employee-benefits/:id` | unknown | employeeBenefit.route.js |
| `PATCH` | `/api/hr/employee-benefits/:id` | unknown | employeeBenefit.route.js |
| `DELETE` | `/api/hr/employee-benefits/:id` | unknown | employeeBenefit.route.js |
| `POST` | `/api/hr/employee-benefits/:id/activate` | unknown | employeeBenefit.route.js |
| `POST` | `/api/hr/employee-benefits/:id/suspend` | unknown | employeeBenefit.route.js |
| `POST` | `/api/hr/employee-benefits/:id/terminate` | unknown | employeeBenefit.route.js |
| `POST` | `/api/hr/employee-benefits/:id/dependents` | unknown | employeeBenefit.route.js |
| `DELETE` | `/api/hr/employee-benefits/:id/dependents/:memberId` | unknown | employeeBenefit.route.js |
| `POST` | `/api/hr/employee-benefits/:id/beneficiaries` | unknown | employeeBenefit.route.js |
| `PATCH` | `/api/hr/employee-benefits/:id/beneficiaries/:beneficiaryId` | unknown | employeeBenefit.route.js |
| `DELETE` | `/api/hr/employee-benefits/:id/beneficiaries/:beneficiaryId` | unknown | employeeBenefit.route.js |
| `POST` | `/api/hr/employee-benefits/:id/claims` | unknown | employeeBenefit.route.js |
| `PATCH` | `/api/hr/employee-benefits/:id/claims/:claimId` | unknown | employeeBenefit.route.js |
| `POST` | `/api/hr/employee-benefits/:id/pre-auth` | unknown | employeeBenefit.route.js |
| `POST` | `/api/hr/employee-benefits/:id/qualifying-events` | unknown | employeeBenefit.route.js |

## employeeIncentive

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/hr/employee-incentives` | unknown | employeeIncentive.route.js |
| `GET` | `/api/hr/employee-incentives/pending` | unknown | employeeIncentive.route.js |
| `GET` | `/api/hr/employee-incentives/awaiting-processing` | unknown | employeeIncentive.route.js |
| `GET` | `/api/hr/employee-incentives/payroll/:payrollDate` | unknown | employeeIncentive.route.js |
| `GET` | `/api/hr/employee-incentives/employee/:employeeId/history` | unknown | employeeIncentive.route.js |
| `GET` | `/api/hr/employee-incentives/stats` | unknown | employeeIncentive.route.js |
| `GET` | `/api/hr/employee-incentives/:id` | unknown | employeeIncentive.route.js |
| `POST` | `/api/hr/employee-incentives` | unknown | employeeIncentive.route.js |
| `POST` | `/api/hr/employee-incentives/bulk-create` | unknown | employeeIncentive.route.js |
| `PATCH` | `/api/hr/employee-incentives/:id` | unknown | employeeIncentive.route.js |
| `DELETE` | `/api/hr/employee-incentives/:id` | unknown | employeeIncentive.route.js |
| `POST` | `/api/hr/employee-incentives/bulk-delete` | unknown | employeeIncentive.route.js |
| `POST` | `/api/hr/employee-incentives/:id/submit` | unknown | employeeIncentive.route.js |
| `POST` | `/api/hr/employee-incentives/:id/approve` | unknown | employeeIncentive.route.js |
| `POST` | `/api/hr/employee-incentives/bulk-approve` | unknown | employeeIncentive.route.js |
| `POST` | `/api/hr/employee-incentives/:id/reject` | unknown | employeeIncentive.route.js |
| `POST` | `/api/hr/employee-incentives/:id/process` | unknown | employeeIncentive.route.js |

## employeeLoan

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/hr/employee-loans/stats` | unknown | employeeLoan.route.js |
| `GET` | `/api/hr/employee-loans/pending-approvals` | unknown | employeeLoan.route.js |
| `GET` | `/api/hr/employee-loans/overdue-installments` | unknown | employeeLoan.route.js |
| `POST` | `/api/hr/employee-loans/check-eligibility` | unknown | employeeLoan.route.js |
| `POST` | `/api/hr/employee-loans/bulk-delete` | unknown | employeeLoan.route.js |
| `GET` | `/api/hr/employee-loans/by-employee/:employeeId` | unknown | employeeLoan.route.js |
| `GET` | `/api/hr/employee-loans` | unknown | employeeLoan.route.js |
| `POST` | `/api/hr/employee-loans` | unknown | employeeLoan.route.js |
| `GET` | `/api/hr/employee-loans/:loanId` | unknown | employeeLoan.route.js |
| `PATCH` | `/api/hr/employee-loans/:loanId` | unknown | employeeLoan.route.js |
| `DELETE` | `/api/hr/employee-loans/:loanId` | unknown | employeeLoan.route.js |
| `POST` | `/api/hr/employee-loans/:loanId/submit` | unknown | employeeLoan.route.js |
| `POST` | `/api/hr/employee-loans/:loanId/approve` | unknown | employeeLoan.route.js |
| `POST` | `/api/hr/employee-loans/:loanId/reject` | unknown | employeeLoan.route.js |
| `POST` | `/api/hr/employee-loans/:loanId/disburse` | unknown | employeeLoan.route.js |
| `POST` | `/api/hr/employee-loans/:loanId/payments` | unknown | employeeLoan.route.js |
| `POST` | `/api/hr/employee-loans/:loanId/payroll-deduction` | unknown | employeeLoan.route.js |
| `GET` | `/api/hr/employee-loans/:loanId/early-settlement-calculation` | unknown | employeeLoan.route.js |
| `POST` | `/api/hr/employee-loans/:loanId/early-settlement` | unknown | employeeLoan.route.js |
| `POST` | `/api/hr/employee-loans/:loanId/default` | unknown | employeeLoan.route.js |
| `POST` | `/api/hr/employee-loans/:loanId/restructure` | unknown | employeeLoan.route.js |
| `POST` | `/api/hr/employee-loans/:loanId/issue-clearance` | unknown | employeeLoan.route.js |
| `POST` | `/api/hr/employee-loans/:loanId/documents` | unknown | employeeLoan.route.js |
| `POST` | `/api/hr/employee-loans/:loanId/communications` | unknown | employeeLoan.route.js |

## employeePromotion

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/hr/employee-promotions` | unknown | employeePromotion.route.js |
| `GET` | `/api/hr/employee-promotions/pending` | unknown | employeePromotion.route.js |
| `GET` | `/api/hr/employee-promotions/awaiting-application` | unknown | employeePromotion.route.js |
| `GET` | `/api/hr/employee-promotions/stats` | unknown | employeePromotion.route.js |
| `GET` | `/api/hr/employee-promotions/employee/:employeeId/history` | unknown | employeePromotion.route.js |
| `GET` | `/api/hr/employee-promotions/upcoming` | unknown | employeePromotion.route.js |
| `GET` | `/api/hr/employee-promotions/:id` | unknown | employeePromotion.route.js |
| `POST` | `/api/hr/employee-promotions` | unknown | employeePromotion.route.js |
| `PATCH` | `/api/hr/employee-promotions/:id` | unknown | employeePromotion.route.js |
| `DELETE` | `/api/hr/employee-promotions/:id` | unknown | employeePromotion.route.js |
| `POST` | `/api/hr/employee-promotions/bulk-delete` | unknown | employeePromotion.route.js |
| `POST` | `/api/hr/employee-promotions/:id/submit` | unknown | employeePromotion.route.js |
| `POST` | `/api/hr/employee-promotions/:id/approve` | unknown | employeePromotion.route.js |
| `POST` | `/api/hr/employee-promotions/:id/reject` | unknown | employeePromotion.route.js |
| `POST` | `/api/hr/employee-promotions/:id/cancel` | unknown | employeePromotion.route.js |
| `POST` | `/api/hr/employee-promotions/:id/apply` | unknown | employeePromotion.route.js |
| `POST` | `/api/hr/employee-promotions/:id/notify` | unknown | employeePromotion.route.js |
| `POST` | `/api/hr/employee-promotions/:id/acknowledge` | unknown | employeePromotion.route.js |

## employeeSelfService

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/hr/self-service/dashboard` | unknown | employeeSelfService.route.js |
| `GET` | `/api/hr/self-service/profile` | unknown | employeeSelfService.route.js |
| `PATCH` | `/api/hr/self-service/profile` | unknown | employeeSelfService.route.js |
| `GET` | `/api/hr/self-service/leave/balances` | unknown | employeeSelfService.route.js |
| `GET` | `/api/hr/self-service/leave/requests` | unknown | employeeSelfService.route.js |
| `POST` | `/api/hr/self-service/leave/request` | unknown | employeeSelfService.route.js |
| `POST` | `/api/hr/self-service/leave/request/:requestId/cancel` | unknown | employeeSelfService.route.js |
| `GET` | `/api/hr/self-service/loans` | unknown | employeeSelfService.route.js |
| `GET` | `/api/hr/self-service/advances` | unknown | employeeSelfService.route.js |
| `GET` | `/api/hr/self-service/payslips` | unknown | employeeSelfService.route.js |
| `GET` | `/api/hr/self-service/approvals/pending` | unknown | employeeSelfService.route.js |

## employeeTransfer

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/hr/transfers` | unknown | employeeTransfer.route.js |
| `GET` | `/api/hr/transfers/pending-approvals` | unknown | employeeTransfer.route.js |
| `GET` | `/api/hr/transfers/pending-handovers` | unknown | employeeTransfer.route.js |
| `GET` | `/api/hr/transfers/stats` | unknown | employeeTransfer.route.js |
| `GET` | `/api/hr/transfers/history/:employeeId` | unknown | employeeTransfer.route.js |
| `GET` | `/api/hr/transfers/:id` | unknown | employeeTransfer.route.js |
| `POST` | `/api/hr/transfers` | unknown | employeeTransfer.route.js |
| `PUT` | `/api/hr/transfers/:id` | unknown | employeeTransfer.route.js |
| `DELETE` | `/api/hr/transfers/:id` | unknown | employeeTransfer.route.js |
| `POST` | `/api/hr/transfers/bulk-delete` | unknown | employeeTransfer.route.js |
| `PATCH` | `/api/hr/transfers/:id/status` | unknown | employeeTransfer.route.js |
| `POST` | `/api/hr/transfers/:id/approve` | unknown | employeeTransfer.route.js |
| `POST` | `/api/hr/transfers/:id/reject` | unknown | employeeTransfer.route.js |
| `POST` | `/api/hr/transfers/:id/apply` | unknown | employeeTransfer.route.js |
| `POST` | `/api/hr/transfers/:id/approvals` | unknown | employeeTransfer.route.js |
| `PATCH` | `/api/hr/transfers/:id/approvals/:stepIndex` | unknown | employeeTransfer.route.js |
| `POST` | `/api/hr/transfers/:id/handover` | unknown | employeeTransfer.route.js |
| `PATCH` | `/api/hr/transfers/:id/handover/:itemIndex` | unknown | employeeTransfer.route.js |
| `POST` | `/api/hr/transfers/:id/notify` | unknown | employeeTransfer.route.js |

## event

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/events/stats` | getEventStats | event.route.js |
| `GET` | `/api/events/calendar` | getCalendarEvents | event.route.js |
| `GET` | `/api/events/upcoming` | getUpcomingEvents | event.route.js |
| `GET` | `/api/events/month/:year/:month` | getEventsByMonth | event.route.js |
| `GET` | `/api/events/date/:date` | getEventsByDate | event.route.js |
| `POST` | `/api/events/availability` | checkAvailability | event.route.js |
| `POST` | `/api/events/import/ics` | importEventsFromICS | event.route.js |
| `GET` | `/api/events/conflicts` | getConflicts | event.route.js |
| `GET` | `/api/events/search` | searchEvents | event.route.js |
| `GET` | `/api/events/client/:clientId` | getEventsByClient | event.route.js |
| `POST` | `/api/events/bulk` | bulkCreateEvents | event.route.js |
| `PUT` | `/api/events/bulk` | bulkUpdateEvents | event.route.js |
| `DELETE` | `/api/events/bulk` | bulkDeleteEvents | event.route.js |
| `POST` | `/api/events/bulk/complete` | bulkCompleteEvents | event.route.js |
| `POST` | `/api/events/bulk/archive` | bulkArchiveEvents | event.route.js |
| `POST` | `/api/events/bulk/unarchive` | bulkUnarchiveEvents | event.route.js |
| `GET` | `/api/events/ids` | getAllEventIds | event.route.js |
| `GET` | `/api/events/archived` | getArchivedEvents | event.route.js |
| `GET` | `/api/events/export` | exportEvents | event.route.js |
| `PATCH` | `/api/events/reorder` | reorderEvents | event.route.js |
| `GET` | `/api/events/case/:caseId` | getEventsByCase | event.route.js |
| `GET` | `/api/events/location-triggers` | getEventsWithLocationTriggers | event.route.js |
| `POST` | `/api/events/location/check` | bulkCheckLocationTriggers | event.route.js |
| `POST` | `/api/events/parse` | createEventFromNaturalLanguage | event.route.js |
| `POST` | `/api/events/voice` | createEventFromVoice | event.route.js |
| `POST` | `/api/events` | createEvent | event.route.js |
| `GET` | `/api/events` | getEvents | event.route.js |
| `GET` | `/api/events/:id` | getEvent | event.route.js |
| `GET` | `/api/events/:id/export/ics` | exportEventToICS | event.route.js |
| `PUT` | `/api/events/:id` | updateEvent | event.route.js |
| `PATCH` | `/api/events/:id` | updateEvent | event.route.js |
| `DELETE` | `/api/events/:id` | deleteEvent | event.route.js |
| `POST` | `/api/events/:id/complete` | completeEvent | event.route.js |
| `POST` | `/api/events/:id/cancel` | cancelEvent | event.route.js |
| `POST` | `/api/events/:id/postpone` | postponeEvent | event.route.js |
| `POST` | `/api/events/:id/clone` | cloneEvent | event.route.js |
| `POST` | `/api/events/:id/reschedule` | rescheduleEvent | event.route.js |
| `GET` | `/api/events/:id/activity` | getEventActivity | event.route.js |
| `POST` | `/api/events/:id/archive` | archiveEvent | event.route.js |
| `POST` | `/api/events/:id/unarchive` | unarchiveEvent | event.route.js |
| `PUT` | `/api/events/:id/location-trigger` | updateLocationTrigger | event.route.js |
| `POST` | `/api/events/:id/location/check` | checkLocationTrigger | event.route.js |
| `POST` | `/api/events/:id/attendees` | addAttendee | event.route.js |
| `DELETE` | `/api/events/:id/attendees/:attendeeId` | removeAttendee | event.route.js |
| `POST` | `/api/events/:id/rsvp` | rsvpEvent | event.route.js |
| `POST` | `/api/events/:id/agenda` | addAgendaItem | event.route.js |
| `PUT` | `/api/events/:id/agenda/:agendaId` | updateAgendaItem | event.route.js |
| `DELETE` | `/api/events/:id/agenda/:agendaId` | deleteAgendaItem | event.route.js |
| `POST` | `/api/events/:id/action-items` | addActionItem | event.route.js |
| `PUT` | `/api/events/:id/action-items/:itemId` | updateActionItem | event.route.js |
| `DELETE` | `/api/events/:id/action-items/:itemId` | deleteActionItem | event.route.js |

## eventsExtended

| Method | Path | Controller | File |
|--------|------|------------|------|
| `POST` | `/api/events/:id/start` | unknown | eventsExtended.route.js |
| `POST` | `/api/events/:eventId/send-invitations` | unknown | eventsExtended.route.js |
| `POST` | `/api/events/:eventId/attendees/:attendeeId/check-in` | unknown | eventsExtended.route.js |
| `POST` | `/api/events/:eventId/attendees/:attendeeId/check-out` | unknown | eventsExtended.route.js |
| `PATCH` | `/api/events/:eventId/notes` | unknown | eventsExtended.route.js |
| `POST` | `/api/events/:eventId/action-items/:actionItemId/toggle` | unknown | eventsExtended.route.js |
| `POST` | `/api/events/:eventId/attachments` | unknown | eventsExtended.route.js |
| `DELETE` | `/api/events/:eventId/attachments/:attachmentId` | unknown | eventsExtended.route.js |
| `POST` | `/api/events/:eventId/comments` | unknown | eventsExtended.route.js |
| `PATCH` | `/api/events/:eventId/comments/:commentId` | unknown | eventsExtended.route.js |
| `DELETE` | `/api/events/:eventId/comments/:commentId` | unknown | eventsExtended.route.js |
| `GET` | `/api/events/today` | unknown | eventsExtended.route.js |
| `GET` | `/api/events/my-events` | unknown | eventsExtended.route.js |
| `GET` | `/api/events/pending-rsvp` | unknown | eventsExtended.route.js |
| `POST` | `/api/events/:eventId/recurring/skip` | unknown | eventsExtended.route.js |
| `POST` | `/api/events/:eventId/recurring/stop` | unknown | eventsExtended.route.js |
| `GET` | `/api/events/:eventId/recurring/instances` | unknown | eventsExtended.route.js |
| `PUT` | `/api/events/:eventId/recurring/instance/:instanceDate` | unknown | eventsExtended.route.js |
| `POST` | `/api/events/:eventId/calendar-sync` | unknown | eventsExtended.route.js |
| `POST` | `/api/events/bulk/cancel` | unknown | eventsExtended.route.js |
| `GET` | `/api/events/templates` | unknown | eventsExtended.route.js |
| `POST` | `/api/events/templates/:templateId/create` | unknown | eventsExtended.route.js |
| `POST` | `/api/events/:eventId/save-as-template` | unknown | eventsExtended.route.js |
| `POST` | `/api/events/check-availability` | unknown | eventsExtended.route.js |
| `POST` | `/api/events/find-slots` | unknown | eventsExtended.route.js |

## exchangeRateRevaluation

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/exchangeRateRevaluation/report` | getRevaluationReport | exchangeRateRevaluation.route.js |
| `GET` | `/api/exchangeRateRevaluation/accounts` | getRevaluationAccounts | exchangeRateRevaluation.route.js |
| `POST` | `/api/exchangeRateRevaluation/preview` | previewRevaluation | exchangeRateRevaluation.route.js |
| `GET` | `/api/exchangeRateRevaluation` | getRevaluations | exchangeRateRevaluation.route.js |
| `POST` | `/api/exchangeRateRevaluation` | runRevaluation | exchangeRateRevaluation.route.js |
| `GET` | `/api/exchangeRateRevaluation/:id` | getRevaluation | exchangeRateRevaluation.route.js |
| `DELETE` | `/api/exchangeRateRevaluation/:id` | deleteRevaluation | exchangeRateRevaluation.route.js |
| `POST` | `/api/exchangeRateRevaluation/:id/post` | postRevaluation | exchangeRateRevaluation.route.js |
| `POST` | `/api/exchangeRateRevaluation/:id/reverse` | reverseRevaluation | exchangeRateRevaluation.route.js |

## expense

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/expenses/new` | getNewExpenseDefaults | expense.route.js |
| `POST` | `/api/expenses/suggest-category` | suggestCategory | expense.route.js |
| `GET` | `/api/expenses/categories` | getExpenseCategories | expense.route.js |
| `GET` | `/api/expenses/stats` | getExpenseStats | expense.route.js |
| `GET` | `/api/expenses/by-category` | getExpensesByCategory | expense.route.js |
| `POST` | `/api/expenses/bulk-approve` | bulkApproveExpenses | expense.route.js |
| `POST` | `/api/expenses/bulk-delete` | bulkDeleteExpenses | expense.route.js |
| `POST` | `/api/expenses` | createExpense | expense.route.js |
| `GET` | `/api/expenses` | getExpenses | expense.route.js |
| `GET` | `/api/expenses/:id` | getExpense | expense.route.js |
| `PUT` | `/api/expenses/:id` | updateExpense | expense.route.js |
| `DELETE` | `/api/expenses/:id` | deleteExpense | expense.route.js |
| `POST` | `/api/expenses/:id/submit` | submitExpense | expense.route.js |
| `POST` | `/api/expenses/:id/approve` | approveExpense | expense.route.js |
| `POST` | `/api/expenses/:id/reject` | rejectExpense | expense.route.js |
| `POST` | `/api/expenses/:id/reimburse` | markAsReimbursed | expense.route.js |
| `POST` | `/api/expenses/:id/receipt` | uploadReceipt | expense.route.js |

## expenseClaim

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/hr/expense-claims/stats` | unknown | expenseClaim.route.js |
| `GET` | `/api/hr/expense-claims/pending-approvals` | unknown | expenseClaim.route.js |
| `GET` | `/api/hr/expense-claims/pending-payments` | unknown | expenseClaim.route.js |
| `GET` | `/api/hr/expense-claims/mileage-rates` | unknown | expenseClaim.route.js |
| `GET` | `/api/hr/expense-claims/policies` | unknown | expenseClaim.route.js |
| `GET` | `/api/hr/expense-claims/export` | unknown | expenseClaim.route.js |
| `POST` | `/api/hr/expense-claims/bulk-delete` | unknown | expenseClaim.route.js |
| `GET` | `/api/hr/expense-claims/by-employee/:employeeId` | unknown | expenseClaim.route.js |
| `GET` | `/api/hr/expense-claims/corporate-card/:employeeId` | unknown | expenseClaim.route.js |
| `GET` | `/api/hr/expense-claims` | unknown | expenseClaim.route.js |
| `POST` | `/api/hr/expense-claims` | unknown | expenseClaim.route.js |
| `GET` | `/api/hr/expense-claims/:id` | unknown | expenseClaim.route.js |
| `PATCH` | `/api/hr/expense-claims/:id` | unknown | expenseClaim.route.js |
| `DELETE` | `/api/hr/expense-claims/:id` | unknown | expenseClaim.route.js |
| `POST` | `/api/hr/expense-claims/:id/submit` | unknown | expenseClaim.route.js |
| `POST` | `/api/hr/expense-claims/:id/approve` | unknown | expenseClaim.route.js |
| `POST` | `/api/hr/expense-claims/:id/reject` | unknown | expenseClaim.route.js |
| `POST` | `/api/hr/expense-claims/:id/request-changes` | unknown | expenseClaim.route.js |
| `POST` | `/api/hr/expense-claims/:id/process-payment` | unknown | expenseClaim.route.js |
| `POST` | `/api/hr/expense-claims/:id/confirm-payment` | unknown | expenseClaim.route.js |
| `POST` | `/api/hr/expense-claims/:id/line-items` | unknown | expenseClaim.route.js |
| `PATCH` | `/api/hr/expense-claims/:id/line-items/:lineItemId` | unknown | expenseClaim.route.js |
| `DELETE` | `/api/hr/expense-claims/:id/line-items/:lineItemId` | unknown | expenseClaim.route.js |
| `POST` | `/api/hr/expense-claims/:id/receipts` | unknown | expenseClaim.route.js |
| `DELETE` | `/api/hr/expense-claims/:id/receipts/:receiptId` | unknown | expenseClaim.route.js |
| `POST` | `/api/hr/expense-claims/:id/receipts/:receiptId/verify` | unknown | expenseClaim.route.js |
| `POST` | `/api/hr/expense-claims/:id/reconcile-card` | unknown | expenseClaim.route.js |
| `POST` | `/api/hr/expense-claims/:id/check-compliance` | unknown | expenseClaim.route.js |
| `POST` | `/api/hr/expense-claims/:id/approve-exception` | unknown | expenseClaim.route.js |
| `POST` | `/api/hr/expense-claims/:id/mark-billable` | unknown | expenseClaim.route.js |
| `POST` | `/api/hr/expense-claims/:id/create-invoice` | unknown | expenseClaim.route.js |
| `POST` | `/api/hr/expense-claims/:id/duplicate` | unknown | expenseClaim.route.js |

## expensePolicy

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/expense-policies` | getExpensePolicies | expensePolicy.route.js |
| `GET` | `/api/expense-policies/default` | getDefaultPolicy | expensePolicy.route.js |
| `GET` | `/api/expense-policies/my-policy` | getMyPolicy | expensePolicy.route.js |
| `POST` | `/api/expense-policies/create-default` | createDefaultPolicy | expensePolicy.route.js |
| `GET` | `/api/expense-policies/:id` | getExpensePolicy | expensePolicy.route.js |
| `POST` | `/api/expense-policies` | createExpensePolicy | expensePolicy.route.js |
| `PUT` | `/api/expense-policies/:id` | updateExpensePolicy | expensePolicy.route.js |
| `POST` | `/api/expense-policies/:id/set-default` | setAsDefault | expensePolicy.route.js |
| `POST` | `/api/expense-policies/:id/toggle-status` | toggleStatus | expensePolicy.route.js |
| `POST` | `/api/expense-policies/:id/duplicate` | duplicatePolicy | expensePolicy.route.js |
| `POST` | `/api/expense-policies/:policyId/check-compliance` | checkCompliance | expensePolicy.route.js |
| `POST` | `/api/expense-policies/check-compliance` | unknown | expensePolicy.route.js |
| `DELETE` | `/api/expense-policies/:id` | deleteExpensePolicy | expensePolicy.route.js |

## fieldHistorys

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/fieldHistorys/recent` | unknown | fieldHistory.routes.js |
| `GET` | `/api/fieldHistorys/user/:userId` | unknown | fieldHistory.routes.js |
| `GET` | `/api/fieldHistorys/:entityType/:entityId` | unknown | fieldHistory.routes.js |
| `GET` | `/api/fieldHistorys/:entityType/:entityId/stats` | unknown | fieldHistory.routes.js |
| `GET` | `/api/fieldHistorys/:entityType/:entityId/field/:fieldName` | unknown | fieldHistory.routes.js |
| `GET` | `/api/fieldHistorys/:entityType/:entityId/timeline/:fieldName` | unknown | fieldHistory.routes.js |
| `GET` | `/api/fieldHistorys/:entityType/:entityId/compare` | unknown | fieldHistory.routes.js |
| `POST` | `/api/fieldHistorys/:historyId/revert` | unknown | fieldHistory.routes.js |

## financeSetup

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/finance-setup/status` | getSetupStatus | financeSetup.route.js |
| `GET` | `/api/finance-setup/templates` | getTemplates | financeSetup.route.js |
| `GET` | `/api/finance-setup` | getSetup | financeSetup.route.js |
| `PUT` | `/api/finance-setup` | updateSetup | financeSetup.route.js |
| `PUT` | `/api/finance-setup/step/:step` | updateStep | financeSetup.route.js |
| `POST` | `/api/finance-setup/complete` | completeSetup | financeSetup.route.js |
| `POST` | `/api/finance-setup/reset` | resetSetup | financeSetup.route.js |

## firm

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/firms` | getFirms | firm.route.js |
| `GET` | `/api/firms/roles` | getAvailableRoles | firm.route.js |
| `POST` | `/api/firms` | createFirm | firm.route.js |
| `GET` | `/api/firms/my` | getMyFirm | firm.route.js |
| `POST` | `/api/firms/switch` | switchFirm | firm.route.js |
| `GET` | `/api/firms/my/permissions` | getMyPermissions | firm.route.js |
| `GET` | `/api/firms/tree` | getHierarchyTree | firm.route.js |
| `GET` | `/api/firms/user/accessible` | getAccessibleCompanies | firm.route.js |
| `GET` | `/api/firms/active` | getActiveCompany | firm.route.js |
| `GET` | `/api/firms/:id` | getFirm | firm.route.js |
| `GET` | `/api/firms/:_id` | getFirm | firm.route.js |
| `PUT` | `/api/firms/:id` | updateFirm | firm.route.js |
| `PATCH` | `/api/firms/:id` | updateFirm | firm.route.js |
| `PATCH` | `/api/firms/:_id` | unknown | firm.route.js |
| `DELETE` | `/api/firms/:id` | deleteFirm | firm.route.js |
| `GET` | `/api/firms/:id/children` | getChildCompanies | firm.route.js |
| `PUT` | `/api/firms/:id/move` | moveCompany | firm.route.js |
| `GET` | `/api/firms/:id/access` | getCompanyAccessList | firm.route.js |
| `POST` | `/api/firms/:id/access` | grantUserAccess | firm.route.js |
| `PUT` | `/api/firms/:id/access/:userId` | updateUserAccess | firm.route.js |
| `DELETE` | `/api/firms/:id/access/:userId` | revokeUserAccess | firm.route.js |
| `PATCH` | `/api/firms/:id/billing` | updateBillingSettings | firm.route.js |
| `GET` | `/api/firms/:id/team` | getTeam | firm.route.js |
| `GET` | `/api/firms/:id/members` | getMembers | firm.route.js |
| `GET` | `/api/firms/:id/departed` | getDepartedMembers | firm.route.js |
| `POST` | `/api/firms/:id/members/invite` | inviteMember | firm.route.js |
| `POST` | `/api/firms/:id/members/:memberId/depart` | processDeparture | firm.route.js |
| `POST` | `/api/firms/:id/members/:memberId/reinstate` | reinstateMember | firm.route.js |
| `PUT` | `/api/firms/:id/members/:memberId` | updateMember | firm.route.js |
| `DELETE` | `/api/firms/:id/members/:memberId` | removeMember | firm.route.js |
| `POST` | `/api/firms/:id/leave` | leaveFirmWithSolo | firm.route.js |
| `POST` | `/api/firms/:id/transfer-ownership` | transferOwnership | firm.route.js |
| `POST` | `/api/firms/:firmId/invitations` | createInvitation | firm.route.js |
| `GET` | `/api/firms/:firmId/invitations` | getInvitations | firm.route.js |
| `DELETE` | `/api/firms/:firmId/invitations/:invitationId` | cancelInvitation | firm.route.js |
| `POST` | `/api/firms/:firmId/invitations/:invitationId/resend` | resendInvitation | firm.route.js |
| `GET` | `/api/firms/:id/stats` | getFirmStats | firm.route.js |
| `GET` | `/api/firms/:firmId/ip-whitelist` | getIPWhitelist | firm.route.js |
| `POST` | `/api/firms/:firmId/ip-whitelist/test` | testIPAccess | firm.route.js |
| `POST` | `/api/firms/:firmId/ip-whitelist/enable` | enableIPWhitelist | firm.route.js |
| `POST` | `/api/firms/:firmId/ip-whitelist/disable` | disableIPWhitelist | firm.route.js |
| `POST` | `/api/firms/:firmId/ip-whitelist` | addIPToWhitelist | firm.route.js |
| `DELETE` | `/api/firms/:firmId/ip-whitelist/:ip` | removeIPFromWhitelist | firm.route.js |
| `DELETE` | `/api/firms/:firmId/ip-whitelist/temporary/:allowanceId` | revokeTemporaryIP | firm.route.js |
| `POST` | `/api/firms/lawyer/add` | addLawyer | firm.route.js |
| `POST` | `/api/firms/lawyer/remove` | removeLawyer | firm.route.js |

## fiscalPeriod

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/fiscal-periods` | getFiscalPeriods | fiscalPeriod.route.js |
| `GET` | `/api/fiscal-periods/current` | getCurrentPeriod | fiscalPeriod.route.js |
| `GET` | `/api/fiscal-periods/can-post` | canPostToDate | fiscalPeriod.route.js |
| `GET` | `/api/fiscal-periods/years-summary` | getFiscalYearsSummary | fiscalPeriod.route.js |
| `POST` | `/api/fiscal-periods/create-year` | createFiscalYear | fiscalPeriod.route.js |
| `GET` | `/api/fiscal-periods/:id` | getFiscalPeriod | fiscalPeriod.route.js |
| `GET` | `/api/fiscal-periods/:id/balances` | calculateBalances | fiscalPeriod.route.js |
| `POST` | `/api/fiscal-periods/:id/open` | openPeriod | fiscalPeriod.route.js |
| `POST` | `/api/fiscal-periods/:id/close` | closePeriod | fiscalPeriod.route.js |
| `POST` | `/api/fiscal-periods/:id/reopen` | reopenPeriod | fiscalPeriod.route.js |
| `POST` | `/api/fiscal-periods/:id/lock` | lockPeriod | fiscalPeriod.route.js |
| `POST` | `/api/fiscal-periods/:id/year-end-closing` | yearEndClosing | fiscalPeriod.route.js |

## fleet

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/hr/fleet/stats` | unknown | fleet.route.js |
| `GET` | `/api/hr/fleet/expiring-documents` | unknown | fleet.route.js |
| `GET` | `/api/hr/fleet/maintenance-due` | unknown | fleet.route.js |
| `GET` | `/api/hr/fleet/driver-rankings` | unknown | fleet.route.js |
| `GET` | `/api/hr/fleet/vehicles` | unknown | fleet.route.js |
| `GET` | `/api/hr/fleet/vehicles/:id` | unknown | fleet.route.js |
| `POST` | `/api/hr/fleet/vehicles` | unknown | fleet.route.js |
| `PATCH` | `/api/hr/fleet/vehicles/:id` | unknown | fleet.route.js |
| `DELETE` | `/api/hr/fleet/vehicles/:id` | unknown | fleet.route.js |
| `PUT` | `/api/hr/fleet/vehicles/:id/location` | unknown | fleet.route.js |
| `GET` | `/api/hr/fleet/vehicles/:id/location-history` | unknown | fleet.route.js |
| `GET` | `/api/hr/fleet/fuel-logs` | unknown | fleet.route.js |
| `POST` | `/api/hr/fleet/fuel-logs` | unknown | fleet.route.js |
| `POST` | `/api/hr/fleet/fuel-logs/:id/verify` | unknown | fleet.route.js |
| `GET` | `/api/hr/fleet/maintenance` | unknown | fleet.route.js |
| `POST` | `/api/hr/fleet/maintenance` | unknown | fleet.route.js |
| `PATCH` | `/api/hr/fleet/maintenance/:id` | unknown | fleet.route.js |
| `GET` | `/api/hr/fleet/inspections/checklist` | unknown | fleet.route.js |
| `GET` | `/api/hr/fleet/inspections` | unknown | fleet.route.js |
| `POST` | `/api/hr/fleet/inspections` | unknown | fleet.route.js |
| `GET` | `/api/hr/fleet/trips` | unknown | fleet.route.js |
| `POST` | `/api/hr/fleet/trips` | unknown | fleet.route.js |
| `POST` | `/api/hr/fleet/trips/:id/end` | unknown | fleet.route.js |
| `GET` | `/api/hr/fleet/incidents` | unknown | fleet.route.js |
| `GET` | `/api/hr/fleet/incidents/:id` | unknown | fleet.route.js |
| `POST` | `/api/hr/fleet/incidents` | unknown | fleet.route.js |
| `PATCH` | `/api/hr/fleet/incidents/:id` | unknown | fleet.route.js |
| `GET` | `/api/hr/fleet/drivers` | unknown | fleet.route.js |
| `GET` | `/api/hr/fleet/drivers/:id` | unknown | fleet.route.js |
| `POST` | `/api/hr/fleet/drivers` | unknown | fleet.route.js |
| `PATCH` | `/api/hr/fleet/drivers/:id` | unknown | fleet.route.js |
| `POST` | `/api/hr/fleet/assignments` | unknown | fleet.route.js |
| `POST` | `/api/hr/fleet/assignments/:id/end` | unknown | fleet.route.js |

## followup

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/followups/upcoming` | getUpcomingFollowups | followup.route.js |
| `GET` | `/api/followups/overdue` | getOverdueFollowups | followup.route.js |
| `GET` | `/api/followups/today` | getTodayFollowups | followup.route.js |
| `GET` | `/api/followups/stats` | getFollowupStats | followup.route.js |
| `GET` | `/api/followups/entity/:entityType/:entityId` | getFollowupsByEntity | followup.route.js |
| `POST` | `/api/followups/bulk-complete` | bulkComplete | followup.route.js |
| `POST` | `/api/followups/bulk-delete` | bulkDelete | followup.route.js |
| `GET` | `/api/followups` | getFollowups | followup.route.js |
| `POST` | `/api/followups` | createFollowup | followup.route.js |
| `GET` | `/api/followups/:id` | getFollowup | followup.route.js |
| `PATCH` | `/api/followups/:id` | updateFollowup | followup.route.js |
| `DELETE` | `/api/followups/:id` | deleteFollowup | followup.route.js |
| `POST` | `/api/followups/:id/complete` | completeFollowup | followup.route.js |
| `POST` | `/api/followups/:id/cancel` | cancelFollowup | followup.route.js |
| `POST` | `/api/followups/:id/reschedule` | rescheduleFollowup | followup.route.js |
| `POST` | `/api/followups/:id/notes` | addNote | followup.route.js |

## gantt

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/gantt/productivity` | getProductivityData | gantt.route.js |
| `POST` | `/api/gantt/data/filter` | filterGanttData | gantt.route.js |
| `GET` | `/api/gantt/data` | getGanttData | gantt.route.js |
| `GET` | `/api/gantt/data/case/:caseId` | getGanttDataForCase | gantt.route.js |
| `GET` | `/api/gantt/data/assigned/:userId` | getGanttDataByAssignee | gantt.route.js |
| `GET` | `/api/gantt/hierarchy/:taskId` | getTaskHierarchy | gantt.route.js |
| `PUT` | `/api/gantt/task/:id/dates` | updateTaskDates | gantt.route.js |
| `PUT` | `/api/gantt/task/:id/duration` | updateTaskDuration | gantt.route.js |
| `PUT` | `/api/gantt/task/:id/progress` | updateTaskProgress | gantt.route.js |
| `PUT` | `/api/gantt/task/:id/parent` | updateTaskParent | gantt.route.js |
| `POST` | `/api/gantt/task/reorder` | reorderTasks | gantt.route.js |
| `GET` | `/api/gantt/dependencies/:taskId` | getDependencyChain | gantt.route.js |
| `POST` | `/api/gantt/link` | createLink | gantt.route.js |
| `DELETE` | `/api/gantt/link/:source/:target` | deleteLink | gantt.route.js |
| `GET` | `/api/gantt/critical-path/:projectId` | getCriticalPath | gantt.route.js |
| `GET` | `/api/gantt/slack/:taskId` | getSlackTime | gantt.route.js |
| `GET` | `/api/gantt/bottlenecks/:projectId` | getBottlenecks | gantt.route.js |
| `GET` | `/api/gantt/timeline/:projectId` | getProjectTimeline | gantt.route.js |
| `GET` | `/api/gantt/resources` | getResourceAllocation | gantt.route.js |
| `GET` | `/api/gantt/resources/conflicts` | getResourceConflicts | gantt.route.js |
| `POST` | `/api/gantt/resources/suggest` | suggestAssignee | gantt.route.js |
| `GET` | `/api/gantt/resources/:userId/workload` | getUserWorkload | gantt.route.js |
| `POST` | `/api/gantt/baseline/:projectId` | createBaseline | gantt.route.js |
| `GET` | `/api/gantt/baseline/:projectId` | getBaseline | gantt.route.js |
| `GET` | `/api/gantt/baseline/:projectId/compare` | compareToBaseline | gantt.route.js |
| `POST` | `/api/gantt/auto-schedule/:projectId` | autoSchedule | gantt.route.js |
| `POST` | `/api/gantt/level-resources/:projectId` | levelResources | gantt.route.js |
| `POST` | `/api/gantt/milestone` | createMilestone | gantt.route.js |
| `GET` | `/api/gantt/milestones/:projectId` | getMilestones | gantt.route.js |
| `GET` | `/api/gantt/export/:projectId/msproject` | exportToMSProject | gantt.route.js |
| `GET` | `/api/gantt/export/:projectId/pdf` | exportToPDF | gantt.route.js |
| `GET` | `/api/gantt/export/:projectId/excel` | exportToExcel | gantt.route.js |
| `GET` | `/api/gantt/collaboration/presence/:resourceId` | getActiveUsers | gantt.route.js |
| `POST` | `/api/gantt/collaboration/presence` | updatePresence | gantt.route.js |
| `GET` | `/api/gantt/collaboration/activities/:firmId` | getRecentActivities | gantt.route.js |
| `GET` | `/api/gantt/collaboration/stats` | getCollaborationStats | gantt.route.js |

## generalLedger

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/general-ledger/stats` | getStats | generalLedger.route.js |
| `GET` | `/api/general-ledger/summary` | getSummary | generalLedger.route.js |
| `GET` | `/api/general-ledger/trial-balance` | getTrialBalance | generalLedger.route.js |
| `GET` | `/api/general-ledger/profit-loss` | getProfitLoss | generalLedger.route.js |
| `GET` | `/api/general-ledger/balance-sheet` | getBalanceSheet | generalLedger.route.js |
| `GET` | `/api/general-ledger/account-balance/:accountId` | getAccountBalance | generalLedger.route.js |
| `GET` | `/api/general-ledger/reference/:model/:id` | getEntriesByReference | generalLedger.route.js |
| `GET` | `/api/general-ledger/entries` | getEntries | generalLedger.route.js |
| `GET` | `/api/general-ledger/:id` | getEntry | generalLedger.route.js |
| `POST` | `/api/general-ledger/:id/void` | voidEntry | generalLedger.route.js |
| `GET` | `/api/general-ledger` | getEntries | generalLedger.route.js |
| `POST` | `/api/general-ledger/void/:id` | voidEntry | generalLedger.route.js |

## gig

| Method | Path | Controller | File |
|--------|------|------------|------|
| `POST` | `/api/gigs` | createGig | gig.route.js |
| `DELETE` | `/api/gigs/:_id` | deleteGig | gig.route.js |
| `GET` | `/api/gigs/single/:_id` | getGig | gig.route.js |
| `GET` | `/api/gigs` | getGigs | gig.route.js |

## github

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/github/auth` | unknown | github.route.js |
| `GET` | `/api/github/callback` | unknown | github.route.js |
| `POST` | `/api/github/disconnect` | unknown | github.route.js |
| `GET` | `/api/github/status` | unknown | github.route.js |
| `GET` | `/api/github/repositories` | unknown | github.route.js |
| `GET` | `/api/github/repositories/:owner/:repo` | unknown | github.route.js |
| `GET` | `/api/github/repositories/:owner/:repo/issues` | unknown | github.route.js |
| `POST` | `/api/github/repositories/:owner/:repo/issues` | unknown | github.route.js |
| `GET` | `/api/github/repositories/:owner/:repo/pulls` | unknown | github.route.js |
| `POST` | `/api/github/repositories/:owner/:repo/pulls/:prNumber/comments` | unknown | github.route.js |
| `PUT` | `/api/github/settings` | unknown | github.route.js |
| `POST` | `/api/github/webhook` | unknown | github.route.js |

## gmail

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/gmail/auth` | getAuthUrl | gmail.route.js |
| `GET` | `/api/gmail/callback` | handleCallback | gmail.route.js |
| `POST` | `/api/gmail/disconnect` | disconnect | gmail.route.js |
| `GET` | `/api/gmail/status` | getStatus | gmail.route.js |
| `GET` | `/api/gmail/messages` | listMessages | gmail.route.js |
| `GET` | `/api/gmail/messages/:messageId` | getMessage | gmail.route.js |
| `POST` | `/api/gmail/messages/send` | sendEmail | gmail.route.js |
| `POST` | `/api/gmail/messages/:messageId/reply` | replyToEmail | gmail.route.js |
| `GET` | `/api/gmail/messages/search` | searchMessages | gmail.route.js |
| `GET` | `/api/gmail/threads/:threadId` | getThread | gmail.route.js |
| `GET` | `/api/gmail/drafts` | listDrafts | gmail.route.js |
| `POST` | `/api/gmail/drafts` | createDraft | gmail.route.js |
| `GET` | `/api/gmail/labels` | listLabels | gmail.route.js |
| `POST` | `/api/gmail/labels` | createLabel | gmail.route.js |
| `PUT` | `/api/gmail/settings` | updateSettings | gmail.route.js |
| `POST` | `/api/gmail/watch` | setupWatch | gmail.route.js |
| `DELETE` | `/api/gmail/watch` | stopWatch | gmail.route.js |
| `POST` | `/api/gmail/webhook` | handleWebhook | gmail.route.js |

## googleCalendar

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/google-calendar/auth` | getAuthUrl | googleCalendar.route.js |
| `GET` | `/api/google-calendar/callback` | handleCallback | googleCalendar.route.js |
| `POST` | `/api/google-calendar/disconnect` | disconnect | googleCalendar.route.js |
| `GET` | `/api/google-calendar/status` | getStatus | googleCalendar.route.js |
| `GET` | `/api/google-calendar/calendars` | getCalendars | googleCalendar.route.js |
| `GET` | `/api/google-calendar/calendars/:calendarId/events` | getEvents | googleCalendar.route.js |
| `POST` | `/api/google-calendar/calendars/:calendarId/events` | createEvent | googleCalendar.route.js |
| `PUT` | `/api/google-calendar/calendars/:calendarId/events/:eventId` | updateEvent | googleCalendar.route.js |
| `DELETE` | `/api/google-calendar/calendars/:calendarId/events/:eventId` | deleteEvent | googleCalendar.route.js |
| `PUT` | `/api/google-calendar/settings/calendars` | updateSelectedCalendars | googleCalendar.route.js |
| `PUT` | `/api/google-calendar/settings/show-external-events` | toggleShowExternalEvents | googleCalendar.route.js |
| `POST` | `/api/google-calendar/watch/:calendarId` | watchCalendar | googleCalendar.route.js |
| `DELETE` | `/api/google-calendar/watch/:channelId` | stopWatch | googleCalendar.route.js |
| `POST` | `/api/google-calendar/sync/import` | syncFromGoogle | googleCalendar.route.js |
| `POST` | `/api/google-calendar/import` | unknown | googleCalendar.route.js |
| `POST` | `/api/google-calendar/sync/export/:eventId` | syncToGoogle | googleCalendar.route.js |
| `POST` | `/api/google-calendar/export` | unknown | googleCalendar.route.js |
| `POST` | `/api/google-calendar/sync/auto/enable` | enableAutoSync | googleCalendar.route.js |
| `POST` | `/api/google-calendar/sync/auto/disable` | disableAutoSync | googleCalendar.route.js |
| `GET` | `/api/google-calendar/sync/settings` | getSyncSettings | googleCalendar.route.js |
| `POST` | `/api/google-calendar/webhook` | handleWebhook | googleCalendar.route.js |

## gosi

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/gosi/config` | unknown | gosi.route.js |
| `PUT` | `/api/gosi/config` | unknown | gosi.route.js |
| `POST` | `/api/gosi/calculate` | unknown | gosi.route.js |
| `POST` | `/api/gosi/calculate/:employeeId` | unknown | gosi.route.js |
| `GET` | `/api/gosi/report` | unknown | gosi.route.js |
| `GET` | `/api/gosi/stats` | unknown | gosi.route.js |
| `GET` | `/api/gosi/export` | unknown | gosi.route.js |

## grievance

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/hr/grievances/stats` | unknown | grievance.route.js |
| `GET` | `/api/hr/grievances/overdue` | unknown | grievance.route.js |
| `GET` | `/api/hr/grievances/export` | unknown | grievance.route.js |
| `GET` | `/api/hr/grievances` | unknown | grievance.route.js |
| `POST` | `/api/hr/grievances` | unknown | grievance.route.js |
| `POST` | `/api/hr/grievances/bulk-delete` | unknown | grievance.route.js |
| `GET` | `/api/hr/grievances/employee/:employeeId` | unknown | grievance.route.js |
| `GET` | `/api/hr/grievances/:id` | unknown | grievance.route.js |
| `PATCH` | `/api/hr/grievances/:id` | unknown | grievance.route.js |
| `DELETE` | `/api/hr/grievances/:id` | unknown | grievance.route.js |
| `POST` | `/api/hr/grievances/:id/acknowledge` | unknown | grievance.route.js |
| `POST` | `/api/hr/grievances/:id/start-investigation` | unknown | grievance.route.js |
| `POST` | `/api/hr/grievances/:id/complete-investigation` | unknown | grievance.route.js |
| `POST` | `/api/hr/grievances/:id/resolve` | unknown | grievance.route.js |
| `POST` | `/api/hr/grievances/:id/escalate` | unknown | grievance.route.js |
| `POST` | `/api/hr/grievances/:id/withdraw` | unknown | grievance.route.js |
| `POST` | `/api/hr/grievances/:id/close` | unknown | grievance.route.js |
| `POST` | `/api/hr/grievances/:id/timeline` | unknown | grievance.route.js |
| `POST` | `/api/hr/grievances/:id/witnesses` | unknown | grievance.route.js |
| `POST` | `/api/hr/grievances/:id/evidence` | unknown | grievance.route.js |
| `POST` | `/api/hr/grievances/:id/interviews` | unknown | grievance.route.js |
| `POST` | `/api/hr/grievances/:id/appeal` | unknown | grievance.route.js |
| `POST` | `/api/hr/grievances/:id/appeal/decide` | unknown | grievance.route.js |
| `POST` | `/api/hr/grievances/:id/labor-office` | unknown | grievance.route.js |

## health

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/health` | unknown | health.route.js |
| `GET` | `/api/health/live` | unknown | health.route.js |
| `GET` | `/api/health/ready` | unknown | health.route.js |
| `GET` | `/api/health/detailed` | unknown | health.route.js |
| `GET` | `/api/health/deep` | unknown | health.route.js |
| `GET` | `/api/health/ping` | unknown | health.route.js |
| `GET` | `/api/health/circuits` | unknown | health.route.js |
| `GET` | `/api/health/cache` | unknown | health.route.js |
| `GET` | `/api/health/debug-auth` | unknown | health.route.js |

## hr

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/hr/options` | getFormOptions | hr.route.js |
| `GET` | `/api/hr/employees/stats` | getEmployeeStats | hr.route.js |
| `POST` | `/api/hr/employees/bulk-delete` | bulkDeleteEmployees | hr.route.js |
| `POST` | `/api/hr/employees` | createEmployee | hr.route.js |
| `GET` | `/api/hr/employees` | getEmployees | hr.route.js |
| `GET` | `/api/hr/employees/:id` | getEmployee | hr.route.js |
| `PUT` | `/api/hr/employees/:id` | updateEmployee | hr.route.js |
| `DELETE` | `/api/hr/employees/:id` | deleteEmployee | hr.route.js |
| `POST` | `/api/hr/employees/:id/allowances` | addAllowance | hr.route.js |
| `DELETE` | `/api/hr/employees/:id/allowances/:allowanceId` | removeAllowance | hr.route.js |
| `GET` | `/api/hr/employees/:id/documents` | getEmployeeDocuments | hr.route.js |
| `POST` | `/api/hr/employees/:id/documents` | uploadEmployeeDocument | hr.route.js |
| `DELETE` | `/api/hr/employees/:id/documents/:docId` | deleteEmployeeDocument | hr.route.js |
| `POST` | `/api/hr/employees/:id/documents/:docId/verify` | verifyEmployeeDocument | hr.route.js |

## hrAnalytics

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/hr-analytics/dashboard` | unknown | hrAnalytics.route.js |
| `GET` | `/api/hr-analytics/demographics` | unknown | hrAnalytics.route.js |
| `GET` | `/api/hr-analytics/turnover` | unknown | hrAnalytics.route.js |
| `GET` | `/api/hr-analytics/absenteeism` | unknown | hrAnalytics.route.js |
| `GET` | `/api/hr-analytics/attendance` | unknown | hrAnalytics.route.js |
| `GET` | `/api/hr-analytics/performance` | unknown | hrAnalytics.route.js |
| `GET` | `/api/hr-analytics/recruitment` | unknown | hrAnalytics.route.js |
| `GET` | `/api/hr-analytics/compensation` | unknown | hrAnalytics.route.js |
| `GET` | `/api/hr-analytics/training` | unknown | hrAnalytics.route.js |
| `GET` | `/api/hr-analytics/leave` | unknown | hrAnalytics.route.js |
| `GET` | `/api/hr-analytics/saudization` | unknown | hrAnalytics.route.js |
| `POST` | `/api/hr-analytics/snapshot` | unknown | hrAnalytics.route.js |
| `GET` | `/api/hr-analytics/trends` | unknown | hrAnalytics.route.js |
| `GET` | `/api/hr-analytics/export` | unknown | hrAnalytics.route.js |
| `GET` | `/api/hr-analytics/predictions/attrition` | unknown | hrAnalytics.route.js |
| `GET` | `/api/hr-analytics/predictions/attrition/:employeeId` | unknown | hrAnalytics.route.js |
| `GET` | `/api/hr-analytics/predictions/workforce` | unknown | hrAnalytics.route.js |
| `GET` | `/api/hr-analytics/predictions/high-potential` | unknown | hrAnalytics.route.js |
| `GET` | `/api/hr-analytics/predictions/flight-risk` | unknown | hrAnalytics.route.js |
| `GET` | `/api/hr-analytics/predictions/absence` | unknown | hrAnalytics.route.js |
| `GET` | `/api/hr-analytics/predictions/engagement` | unknown | hrAnalytics.route.js |

## hrAttendanceRules

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/hr/attendance-rules` | unknown | hrAttendanceRules.route.js |
| `GET` | `/api/hr/attendance-rules/default` | unknown | hrAttendanceRules.route.js |
| `GET` | `/api/hr/attendance-rules/:id` | unknown | hrAttendanceRules.route.js |
| `POST` | `/api/hr/attendance-rules` | unknown | hrAttendanceRules.route.js |
| `POST` | `/api/hr/attendance-rules/bulk` | unknown | hrAttendanceRules.route.js |
| `PUT` | `/api/hr/attendance-rules/:id` | unknown | hrAttendanceRules.route.js |
| `DELETE` | `/api/hr/attendance-rules/:id` | unknown | hrAttendanceRules.route.js |
| `PATCH` | `/api/hr/attendance-rules/:id/default` | unknown | hrAttendanceRules.route.js |
| `PATCH` | `/api/hr/attendance-rules/:id/toggle-status` | unknown | hrAttendanceRules.route.js |
| `POST` | `/api/hr/attendance-rules/:id/duplicate` | unknown | hrAttendanceRules.route.js |

## hrExpensePolicy

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/hr/expense-policies` | unknown | hrExpensePolicy.route.js |
| `GET` | `/api/hr/expense-policies/default` | unknown | hrExpensePolicy.route.js |
| `GET` | `/api/hr/expense-policies/:id` | unknown | hrExpensePolicy.route.js |
| `POST` | `/api/hr/expense-policies` | unknown | hrExpensePolicy.route.js |
| `PUT` | `/api/hr/expense-policies/:id` | unknown | hrExpensePolicy.route.js |
| `DELETE` | `/api/hr/expense-policies/:id` | unknown | hrExpensePolicy.route.js |
| `PATCH` | `/api/hr/expense-policies/:id/default` | unknown | hrExpensePolicy.route.js |
| `PATCH` | `/api/hr/expense-policies/:id/toggle-status` | unknown | hrExpensePolicy.route.js |
| `POST` | `/api/hr/expense-policies/:id/duplicate` | unknown | hrExpensePolicy.route.js |

## hrExtended

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/hr/extended/leave-encashment` | unknown | hrExtended.route.js |
| `POST` | `/api/hr/extended/leave-encashment` | unknown | hrExtended.route.js |
| `POST` | `/api/hr/extended/leave-encashment/:id/approve` | unknown | hrExtended.route.js |
| `GET` | `/api/hr/extended/compensatory-leave` | unknown | hrExtended.route.js |
| `POST` | `/api/hr/extended/compensatory-leave` | unknown | hrExtended.route.js |
| `GET` | `/api/hr/extended/compensatory-leave/balance/:employeeId` | unknown | hrExtended.route.js |
| `POST` | `/api/hr/extended/compensatory-leave/:id/approve` | unknown | hrExtended.route.js |
| `GET` | `/api/hr/extended/salary-components` | unknown | hrExtended.route.js |
| `POST` | `/api/hr/extended/salary-components` | unknown | hrExtended.route.js |
| `POST` | `/api/hr/extended/salary-components/create-defaults` | unknown | hrExtended.route.js |
| `PUT` | `/api/hr/extended/salary-components/:id` | unknown | hrExtended.route.js |
| `GET` | `/api/hr/extended/promotions` | unknown | hrExtended.route.js |
| `POST` | `/api/hr/extended/promotions` | unknown | hrExtended.route.js |
| `POST` | `/api/hr/extended/promotions/:id/approve` | unknown | hrExtended.route.js |
| `POST` | `/api/hr/extended/promotions/:id/apply` | unknown | hrExtended.route.js |
| `GET` | `/api/hr/extended/transfers` | unknown | hrExtended.route.js |
| `POST` | `/api/hr/extended/transfers` | unknown | hrExtended.route.js |
| `POST` | `/api/hr/extended/transfers/:id/approve` | unknown | hrExtended.route.js |
| `POST` | `/api/hr/extended/transfers/:id/apply` | unknown | hrExtended.route.js |
| `GET` | `/api/hr/extended/staffing-plans` | unknown | hrExtended.route.js |
| `POST` | `/api/hr/extended/staffing-plans` | unknown | hrExtended.route.js |
| `GET` | `/api/hr/extended/staffing-plans/vacancy-summary` | unknown | hrExtended.route.js |
| `GET` | `/api/hr/extended/retention-bonuses` | unknown | hrExtended.route.js |
| `POST` | `/api/hr/extended/retention-bonuses` | unknown | hrExtended.route.js |
| `POST` | `/api/hr/extended/retention-bonuses/:id/vest/:milestone` | unknown | hrExtended.route.js |
| `GET` | `/api/hr/extended/incentives` | unknown | hrExtended.route.js |
| `POST` | `/api/hr/extended/incentives` | unknown | hrExtended.route.js |
| `GET` | `/api/hr/extended/incentives/stats` | unknown | hrExtended.route.js |
| `GET` | `/api/hr/extended/vehicles` | unknown | hrExtended.route.js |
| `POST` | `/api/hr/extended/vehicles` | unknown | hrExtended.route.js |
| `POST` | `/api/hr/extended/vehicles/:id/assign` | unknown | hrExtended.route.js |
| `POST` | `/api/hr/extended/vehicles/:id/maintenance` | unknown | hrExtended.route.js |
| `GET` | `/api/hr/extended/vehicles/fleet-summary` | unknown | hrExtended.route.js |
| `GET` | `/api/hr/extended/skills` | unknown | hrExtended.route.js |
| `POST` | `/api/hr/extended/skills` | unknown | hrExtended.route.js |
| `GET` | `/api/hr/extended/skills/by-category` | unknown | hrExtended.route.js |
| `GET` | `/api/hr/extended/employee-skills/:employeeId` | unknown | hrExtended.route.js |
| `POST` | `/api/hr/extended/employee-skills` | unknown | hrExtended.route.js |
| `GET` | `/api/hr/extended/employee-skills/matrix` | unknown | hrExtended.route.js |
| `GET` | `/api/hr/extended/employee-skills/expiring-certifications` | unknown | hrExtended.route.js |
| `GET` | `/api/hr/extended/settings` | unknown | hrExtended.route.js |
| `PUT` | `/api/hr/extended/settings` | unknown | hrExtended.route.js |
| `GET` | `/api/hr/extended/settings/leave` | unknown | hrExtended.route.js |
| `GET` | `/api/hr/extended/settings/payroll` | unknown | hrExtended.route.js |
| `GET` | `/api/hr/extended/setup-wizard` | unknown | hrExtended.route.js |
| `GET` | `/api/hr/extended/setup-wizard/progress` | unknown | hrExtended.route.js |
| `POST` | `/api/hr/extended/setup-wizard/complete-step/:stepId` | unknown | hrExtended.route.js |
| `POST` | `/api/hr/extended/setup-wizard/skip-step/:stepId` | unknown | hrExtended.route.js |
| `POST` | `/api/hr/extended/setup-wizard/skip` | unknown | hrExtended.route.js |

## hrLeavePolicy

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/hr/leave-policies` | unknown | hrLeavePolicy.route.js |
| `GET` | `/api/hr/leave-policies/stats` | unknown | hrLeavePolicy.route.js |
| `GET` | `/api/hr/leave-policies/:id` | unknown | hrLeavePolicy.route.js |
| `POST` | `/api/hr/leave-policies` | unknown | hrLeavePolicy.route.js |
| `POST` | `/api/hr/leave-policies/bulk` | unknown | hrLeavePolicy.route.js |
| `PATCH` | `/api/hr/leave-policies/:id` | unknown | hrLeavePolicy.route.js |
| `DELETE` | `/api/hr/leave-policies/:id` | unknown | hrLeavePolicy.route.js |
| `POST` | `/api/hr/leave-policies/:id/set-default` | unknown | hrLeavePolicy.route.js |
| `PATCH` | `/api/hr/leave-policies/:id/status` | unknown | hrLeavePolicy.route.js |
| `POST` | `/api/hr/leave-policies/:id/duplicate` | unknown | hrLeavePolicy.route.js |
| `POST` | `/api/hr/leave-policies/compare` | unknown | hrLeavePolicy.route.js |

## hrLeavePolicyAssignment

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/hr/leave-policy-assignments` | unknown | hrLeavePolicyAssignment.route.js |
| `GET` | `/api/hr/leave-policy-assignments/unassigned-employees` | unknown | hrLeavePolicyAssignment.route.js |
| `GET` | `/api/hr/leave-policy-assignments/:id` | unknown | hrLeavePolicyAssignment.route.js |
| `GET` | `/api/hr/leave-policy-assignments/employee/:employeeId/current` | unknown | hrLeavePolicyAssignment.route.js |
| `GET` | `/api/hr/leave-policy-assignments/employee/:employeeId/history` | unknown | hrLeavePolicyAssignment.route.js |
| `GET` | `/api/hr/leave-policy-assignments/employee/:employeeId/allocation-summary` | unknown | hrLeavePolicyAssignment.route.js |
| `POST` | `/api/hr/leave-policy-assignments` | unknown | hrLeavePolicyAssignment.route.js |
| `POST` | `/api/hr/leave-policy-assignments/bulk` | unknown | hrLeavePolicyAssignment.route.js |
| `POST` | `/api/hr/leave-policy-assignments/preview` | unknown | hrLeavePolicyAssignment.route.js |
| `POST` | `/api/hr/leave-policy-assignments/:id/cancel` | unknown | hrLeavePolicyAssignment.route.js |
| `PATCH` | `/api/hr/leave-policy-assignments/:id/dates` | unknown | hrLeavePolicyAssignment.route.js |

## hrPayrollExtended

| Method | Path | Controller | File |
|--------|------|------------|------|
| `POST` | `/api/hr/payroll-runs/:runId/employees/:employeeId/exclude` | unknown | hrPayrollExtended.route.js |
| `POST` | `/api/hr/payroll-runs/:runId/employees/:employeeId/include` | unknown | hrPayrollExtended.route.js |
| `POST` | `/api/hr/payroll-runs/:runId/employees/:employeeId/recalculate` | unknown | hrPayrollExtended.route.js |
| `GET` | `/api/hr/payroll-runs/:runId/export` | unknown | hrPayrollExtended.route.js |
| `POST` | `/api/hr/payroll-runs/:runId/approve` | unknown | hrPayrollExtended.route.js |
| `POST` | `/api/hr/payroll-runs/:runId/reject` | unknown | hrPayrollExtended.route.js |
| `POST` | `/api/hr/payroll-runs/:runId/process` | unknown | hrPayrollExtended.route.js |
| `POST` | `/api/hr/payroll-runs/:runId/finalize` | unknown | hrPayrollExtended.route.js |
| `GET` | `/api/hr/payroll-runs/:runId/summary` | unknown | hrPayrollExtended.route.js |
| `GET` | `/api/hr/payroll-runs/:runId/employees/:employeeId/payslip` | unknown | hrPayrollExtended.route.js |
| `POST` | `/api/hr/payroll-runs/:runId/employees/:employeeId/adjust` | unknown | hrPayrollExtended.route.js |
| `GET` | `/api/hr/payroll-runs/history` | unknown | hrPayrollExtended.route.js |
| `GET` | `/api/hr/payroll-runs/stats` | unknown | hrPayrollExtended.route.js |

## hrRecruitmentExtended

| Method | Path | Controller | File |
|--------|------|------------|------|
| `POST` | `/api/hr/recruitment/jobs/:jobId/close` | unknown | hrRecruitmentExtended.route.js |
| `POST` | `/api/hr/recruitment/jobs/:jobId/hold` | unknown | hrRecruitmentExtended.route.js |
| `POST` | `/api/hr/recruitment/jobs/:jobId/duplicate` | unknown | hrRecruitmentExtended.route.js |
| `GET` | `/api/hr/recruitment/jobs/:jobId/applicants` | unknown | hrRecruitmentExtended.route.js |
| `POST` | `/api/hr/recruitment/applicants/:applicantId/status` | unknown | hrRecruitmentExtended.route.js |
| `POST` | `/api/hr/recruitment/applicants/:applicantId/screen` | unknown | hrRecruitmentExtended.route.js |
| `POST` | `/api/hr/recruitment/applicants/:applicantId/interviews/:interviewId/complete` | unknown | hrRecruitmentExtended.route.js |
| `POST` | `/api/hr/recruitment/applicants/:applicantId/assessments/:assessmentId/complete` | unknown | hrRecruitmentExtended.route.js |
| `POST` | `/api/hr/recruitment/applicants/:applicantId/offer` | unknown | hrRecruitmentExtended.route.js |
| `PATCH` | `/api/hr/recruitment/applicants/:applicantId/offer` | unknown | hrRecruitmentExtended.route.js |
| `POST` | `/api/hr/recruitment/applicants/:applicantId/offer/accept` | unknown | hrRecruitmentExtended.route.js |
| `POST` | `/api/hr/recruitment/applicants/:applicantId/offer/reject` | unknown | hrRecruitmentExtended.route.js |
| `POST` | `/api/hr/recruitment/applicants/:applicantId/flag` | unknown | hrRecruitmentExtended.route.js |
| `POST` | `/api/hr/recruitment/applicants/:applicantId/unflag` | unknown | hrRecruitmentExtended.route.js |
| `POST` | `/api/hr/recruitment/applicants/bulk-update` | unknown | hrRecruitmentExtended.route.js |
| `POST` | `/api/hr/recruitment/parse-resume` | unknown | hrRecruitmentExtended.route.js |
| `GET` | `/api/hr/recruitment/applicants/export` | unknown | hrRecruitmentExtended.route.js |

## hrRetentionBonus

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/hr/retention-bonuses` | unknown | hrRetentionBonus.route.js |
| `GET` | `/api/hr/retention-bonuses/:id` | unknown | hrRetentionBonus.route.js |
| `POST` | `/api/hr/retention-bonuses` | unknown | hrRetentionBonus.route.js |
| `PATCH` | `/api/hr/retention-bonuses/:id` | unknown | hrRetentionBonus.route.js |
| `DELETE` | `/api/hr/retention-bonuses/:id` | unknown | hrRetentionBonus.route.js |
| `POST` | `/api/hr/retention-bonuses/bulk-delete` | unknown | hrRetentionBonus.route.js |
| `POST` | `/api/hr/retention-bonuses/:id/submit` | unknown | hrRetentionBonus.route.js |
| `POST` | `/api/hr/retention-bonuses/:id/approve` | unknown | hrRetentionBonus.route.js |
| `POST` | `/api/hr/retention-bonuses/:id/reject` | unknown | hrRetentionBonus.route.js |
| `POST` | `/api/hr/retention-bonuses/:id/mark-paid` | unknown | hrRetentionBonus.route.js |
| `POST` | `/api/hr/retention-bonuses/:id/clawback` | unknown | hrRetentionBonus.route.js |
| `POST` | `/api/hr/retention-bonuses/:id/cancel` | unknown | hrRetentionBonus.route.js |
| `GET` | `/api/hr/retention-bonuses/employee/:employeeId/history` | unknown | hrRetentionBonus.route.js |
| `GET` | `/api/hr/retention-bonuses/:id/vesting-status` | unknown | hrRetentionBonus.route.js |
| `GET` | `/api/hr/retention-bonuses/pending-approvals` | unknown | hrRetentionBonus.route.js |
| `GET` | `/api/hr/retention-bonuses/department-summary` | unknown | hrRetentionBonus.route.js |

## hrSalaryComponents

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/hr/salary-components` | unknown | hrSalaryComponents.route.js |
| `GET` | `/api/hr/salary-components/earnings` | unknown | hrSalaryComponents.route.js |
| `GET` | `/api/hr/salary-components/deductions` | unknown | hrSalaryComponents.route.js |
| `GET` | `/api/hr/salary-components/:id` | unknown | hrSalaryComponents.route.js |
| `POST` | `/api/hr/salary-components` | unknown | hrSalaryComponents.route.js |
| `POST` | `/api/hr/salary-components/bulk` | unknown | hrSalaryComponents.route.js |
| `POST` | `/api/hr/salary-components/initialize-defaults` | unknown | hrSalaryComponents.route.js |
| `PUT` | `/api/hr/salary-components/:id` | unknown | hrSalaryComponents.route.js |
| `DELETE` | `/api/hr/salary-components/:id` | unknown | hrSalaryComponents.route.js |
| `PATCH` | `/api/hr/salary-components/:id/toggle-status` | unknown | hrSalaryComponents.route.js |
| `PATCH` | `/api/hr/salary-components/reorder` | unknown | hrSalaryComponents.route.js |

## hrSalaryComponentsExtended

| Method | Path | Controller | File |
|--------|------|------------|------|
| `POST` | `/api/hr/salary-components/bulk-delete` | unknown | hrSalaryComponentsExtended.route.js |
| `POST` | `/api/hr/salary-components/calculate` | unknown | hrSalaryComponentsExtended.route.js |
| `POST` | `/api/hr/salary-components/seed-defaults` | unknown | hrSalaryComponentsExtended.route.js |
| `POST` | `/api/hr/salary-components/:id/duplicate` | unknown | hrSalaryComponentsExtended.route.js |
| `GET` | `/api/hr/salary-components/summary` | unknown | hrSalaryComponentsExtended.route.js |
| `POST` | `/api/hr/salary-components/validate` | unknown | hrSalaryComponentsExtended.route.js |
| `GET` | `/api/hr/salary-components/tax-implications` | unknown | hrSalaryComponentsExtended.route.js |

## hrSetup

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/hr/departments` | unknown | hrSetup.route.js |
| `GET` | `/api/hr/departments/:id` | unknown | hrSetup.route.js |
| `POST` | `/api/hr/departments` | unknown | hrSetup.route.js |
| `POST` | `/api/hr/departments/bulk` | unknown | hrSetup.route.js |
| `PUT` | `/api/hr/departments/:id` | unknown | hrSetup.route.js |
| `DELETE` | `/api/hr/departments/:id` | unknown | hrSetup.route.js |
| `GET` | `/api/hr/designations` | unknown | hrSetup.route.js |
| `GET` | `/api/hr/designations/:id` | unknown | hrSetup.route.js |
| `POST` | `/api/hr/designations` | unknown | hrSetup.route.js |
| `POST` | `/api/hr/designations/bulk` | unknown | hrSetup.route.js |
| `PUT` | `/api/hr/designations/:id` | unknown | hrSetup.route.js |
| `DELETE` | `/api/hr/designations/:id` | unknown | hrSetup.route.js |
| `GET` | `/api/hr/leave-types` | unknown | hrSetup.route.js |
| `GET` | `/api/hr/leave-types/:id` | unknown | hrSetup.route.js |
| `POST` | `/api/hr/leave-types` | unknown | hrSetup.route.js |
| `POST` | `/api/hr/leave-types/bulk` | unknown | hrSetup.route.js |
| `POST` | `/api/hr/leave-types/initialize` | unknown | hrSetup.route.js |
| `PUT` | `/api/hr/leave-types/:id` | unknown | hrSetup.route.js |
| `DELETE` | `/api/hr/leave-types/:id` | unknown | hrSetup.route.js |
| `GET` | `/api/hr/shift-types` | unknown | hrSetup.route.js |
| `GET` | `/api/hr/shift-types/:id` | unknown | hrSetup.route.js |
| `POST` | `/api/hr/shift-types` | unknown | hrSetup.route.js |
| `POST` | `/api/hr/shift-types/bulk` | unknown | hrSetup.route.js |
| `PUT` | `/api/hr/shift-types/:id` | unknown | hrSetup.route.js |
| `DELETE` | `/api/hr/shift-types/:id` | unknown | hrSetup.route.js |
| `PATCH` | `/api/hr/shift-types/:id/default` | unknown | hrSetup.route.js |
| `GET` | `/api/hr/analytics/dashboard` | unknown | hrSetup.route.js |

## hrShiftTypesExtended

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/hr/shift-types/stats` | unknown | hrShiftTypesExtended.route.js |
| `GET` | `/api/hr/shift-types/default` | unknown | hrShiftTypesExtended.route.js |
| `GET` | `/api/hr/shift-types/export` | unknown | hrShiftTypesExtended.route.js |
| `GET` | `/api/hr/shift-types/:shiftTypeId/assignments` | unknown | hrShiftTypesExtended.route.js |
| `GET` | `/api/hr/shift-types/:shiftTypeId/schedule` | unknown | hrShiftTypesExtended.route.js |
| `POST` | `/api/hr/shift-types/:shiftTypeId/set-default` | unknown | hrShiftTypesExtended.route.js |
| `POST` | `/api/hr/shift-types/:shiftTypeId/activate` | unknown | hrShiftTypesExtended.route.js |
| `POST` | `/api/hr/shift-types/:shiftTypeId/deactivate` | unknown | hrShiftTypesExtended.route.js |
| `POST` | `/api/hr/shift-types/:shiftTypeId/duplicate` | unknown | hrShiftTypesExtended.route.js |
| `POST` | `/api/hr/shift-types/bulk-activate` | unknown | hrShiftTypesExtended.route.js |
| `POST` | `/api/hr/shift-types/bulk-deactivate` | unknown | hrShiftTypesExtended.route.js |
| `POST` | `/api/hr/shift-types/bulk-delete` | unknown | hrShiftTypesExtended.route.js |
| `POST` | `/api/hr/shift-types/import` | unknown | hrShiftTypesExtended.route.js |

## hrStaffingPlanDetails

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/hr/staffing-plans/headcount` | unknown | hrStaffingPlanDetails.route.js |
| `GET` | `/api/hr/staffing-plans/headcount/by-department` | unknown | hrStaffingPlanDetails.route.js |
| `GET` | `/api/hr/staffing-plans/headcount/by-location` | unknown | hrStaffingPlanDetails.route.js |
| `GET` | `/api/hr/staffing-plans/headcount/by-job-family` | unknown | hrStaffingPlanDetails.route.js |
| `GET` | `/api/hr/staffing-plans/headcount/trends` | unknown | hrStaffingPlanDetails.route.js |
| `GET` | `/api/hr/staffing-plans/variance` | unknown | hrStaffingPlanDetails.route.js |
| `GET` | `/api/hr/staffing-plans/scenarios` | unknown | hrStaffingPlanDetails.route.js |
| `POST` | `/api/hr/staffing-plans/scenarios` | unknown | hrStaffingPlanDetails.route.js |
| `PATCH` | `/api/hr/staffing-plans/scenarios/:scenarioId` | unknown | hrStaffingPlanDetails.route.js |
| `DELETE` | `/api/hr/staffing-plans/scenarios/:scenarioId` | unknown | hrStaffingPlanDetails.route.js |
| `POST` | `/api/hr/staffing-plans/scenarios/:scenarioId/apply` | unknown | hrStaffingPlanDetails.route.js |
| `GET` | `/api/hr/staffing-plans/cost-analysis` | unknown | hrStaffingPlanDetails.route.js |
| `GET` | `/api/hr/staffing-plans/attrition-forecast` | unknown | hrStaffingPlanDetails.route.js |
| `POST` | `/api/hr/staffing-plans/:planId/details` | unknown | hrStaffingPlanDetails.route.js |
| `PATCH` | `/api/hr/staffing-plans/:planId/details/:detailId` | unknown | hrStaffingPlanDetails.route.js |
| `DELETE` | `/api/hr/staffing-plans/:planId/details/:detailId` | unknown | hrStaffingPlanDetails.route.js |
| `POST` | `/api/hr/staffing-plans/bulk-update` | unknown | hrStaffingPlanDetails.route.js |

## hrStaffingPlans

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/hr/staffing-plans` | unknown | hrStaffingPlans.route.js |
| `GET` | `/api/hr/staffing-plans/analytics` | unknown | hrStaffingPlans.route.js |
| `GET` | `/api/hr/staffing-plans/forecast` | unknown | hrStaffingPlans.route.js |
| `GET` | `/api/hr/staffing-plans/gaps` | unknown | hrStaffingPlans.route.js |
| `GET` | `/api/hr/staffing-plans/export` | unknown | hrStaffingPlans.route.js |
| `GET` | `/api/hr/staffing-plans/:planId` | unknown | hrStaffingPlans.route.js |
| `GET` | `/api/hr/staffing-plans/:planId/progress` | unknown | hrStaffingPlans.route.js |
| `GET` | `/api/hr/staffing-plans/:planId/budget` | unknown | hrStaffingPlans.route.js |
| `GET` | `/api/hr/staffing-plans/:planId/timeline` | unknown | hrStaffingPlans.route.js |
| `GET` | `/api/hr/staffing-plans/:planId/positions/open` | unknown | hrStaffingPlans.route.js |
| `GET` | `/api/hr/staffing-plans/:planId/positions/filled` | unknown | hrStaffingPlans.route.js |
| `POST` | `/api/hr/staffing-plans` | unknown | hrStaffingPlans.route.js |
| `PATCH` | `/api/hr/staffing-plans/:planId` | unknown | hrStaffingPlans.route.js |
| `DELETE` | `/api/hr/staffing-plans/:planId` | unknown | hrStaffingPlans.route.js |
| `POST` | `/api/hr/staffing-plans/:planId/positions` | unknown | hrStaffingPlans.route.js |
| `PATCH` | `/api/hr/staffing-plans/:planId/positions/:posId` | unknown | hrStaffingPlans.route.js |
| `DELETE` | `/api/hr/staffing-plans/:planId/positions/:posId` | unknown | hrStaffingPlans.route.js |
| `POST` | `/api/hr/staffing-plans/:planId/approve` | unknown | hrStaffingPlans.route.js |
| `POST` | `/api/hr/staffing-plans/:planId/reject` | unknown | hrStaffingPlans.route.js |
| `POST` | `/api/hr/staffing-plans/:planId/submit` | unknown | hrStaffingPlans.route.js |
| `POST` | `/api/hr/staffing-plans/:planId/activate` | unknown | hrStaffingPlans.route.js |
| `POST` | `/api/hr/staffing-plans/:planId/archive` | unknown | hrStaffingPlans.route.js |
| `POST` | `/api/hr/staffing-plans/:planId/duplicate` | unknown | hrStaffingPlans.route.js |
| `POST` | `/api/hr/staffing-plans/:planId/fill/:posId` | unknown | hrStaffingPlans.route.js |
| `POST` | `/api/hr/staffing-plans/bulk-delete` | unknown | hrStaffingPlans.route.js |
| `POST` | `/api/hr/staffing-plans/bulk-archive` | unknown | hrStaffingPlans.route.js |

## hrStaffingPlansExtended

| Method | Path | Controller | File |
|--------|------|------------|------|
| `POST` | `/api/hr/staffing-plans/:planId/calculate-vacancies` | unknown | hrStaffingPlansExtended.route.js |
| `GET` | `/api/hr/staffing-plans/vacancies-summary` | unknown | hrStaffingPlansExtended.route.js |
| `POST` | `/api/hr/staffing-plans/:planId/details/:detailId/create-job-opening` | unknown | hrStaffingPlansExtended.route.js |
| `POST` | `/api/hr/staffing-plans/:planId/details/:detailId/link-job-opening` | unknown | hrStaffingPlansExtended.route.js |
| `DELETE` | `/api/hr/staffing-plans/:planId/details/:detailId/unlink-job-opening` | unknown | hrStaffingPlansExtended.route.js |
| `GET` | `/api/hr/staffing-plans/:planId/job-openings` | unknown | hrStaffingPlansExtended.route.js |
| `POST` | `/api/hr/staffing-plans/:planId/sync-headcount` | unknown | hrStaffingPlansExtended.route.js |
| `GET` | `/api/hr/staffing-plans/:planId/fulfillment-status` | unknown | hrStaffingPlansExtended.route.js |
| `POST` | `/api/hr/staffing-plans/:planId/generate-requisitions` | unknown | hrStaffingPlansExtended.route.js |
| `GET` | `/api/hr/staffing-plans/comparison` | unknown | hrStaffingPlansExtended.route.js |
| `POST` | `/api/hr/staffing-plans/:planId/rollover` | unknown | hrStaffingPlansExtended.route.js |
| `GET` | `/api/hr/staffing-plans/:planId/timeline` | unknown | hrStaffingPlansExtended.route.js |
| `POST` | `/api/hr/staffing-plans/:planId/approve` | unknown | hrStaffingPlansExtended.route.js |

## hrVehicles

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/hr/vehicles` | unknown | hrVehicles.route.js |
| `GET` | `/api/hr/vehicles/available` | unknown | hrVehicles.route.js |
| `GET` | `/api/hr/vehicles/assigned` | unknown | hrVehicles.route.js |
| `GET` | `/api/hr/vehicles/stats` | unknown | hrVehicles.route.js |
| `GET` | `/api/hr/vehicles/export` | unknown | hrVehicles.route.js |
| `GET` | `/api/hr/vehicles/:vehicleId` | unknown | hrVehicles.route.js |
| `GET` | `/api/hr/vehicles/:vehicleId/assignments` | unknown | hrVehicles.route.js |
| `GET` | `/api/hr/vehicles/:vehicleId/maintenance` | unknown | hrVehicles.route.js |
| `GET` | `/api/hr/vehicles/:vehicleId/expenses` | unknown | hrVehicles.route.js |
| `POST` | `/api/hr/vehicles` | unknown | hrVehicles.route.js |
| `PATCH` | `/api/hr/vehicles/:vehicleId` | unknown | hrVehicles.route.js |
| `DELETE` | `/api/hr/vehicles/:vehicleId` | unknown | hrVehicles.route.js |
| `POST` | `/api/hr/vehicles/:vehicleId/assign` | unknown | hrVehicles.route.js |
| `POST` | `/api/hr/vehicles/:vehicleId/unassign` | unknown | hrVehicles.route.js |
| `POST` | `/api/hr/vehicles/:vehicleId/maintenance` | unknown | hrVehicles.route.js |
| `POST` | `/api/hr/vehicles/:vehicleId/expenses` | unknown | hrVehicles.route.js |

## incomeTaxSlab

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/incomeTaxSlab/countries` | getSupportedCountries | incomeTaxSlab.route.js |
| `POST` | `/api/incomeTaxSlab/initialize-defaults` | initializeDefaults | incomeTaxSlab.route.js |
| `POST` | `/api/incomeTaxSlab/calculate-by-country` | calculateTaxByCountry | incomeTaxSlab.route.js |
| `GET` | `/api/incomeTaxSlab` | getTaxSlabs | incomeTaxSlab.route.js |
| `POST` | `/api/incomeTaxSlab` | createTaxSlab | incomeTaxSlab.route.js |
| `GET` | `/api/incomeTaxSlab/:id` | getTaxSlab | incomeTaxSlab.route.js |
| `PUT` | `/api/incomeTaxSlab/:id` | updateTaxSlab | incomeTaxSlab.route.js |
| `DELETE` | `/api/incomeTaxSlab/:id` | deleteTaxSlab | incomeTaxSlab.route.js |
| `POST` | `/api/incomeTaxSlab/:id/calculate` | calculateTax | incomeTaxSlab.route.js |

## integrations

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/integrations/quickbooks/auth` | unknown | integrations.route.js |
| `GET` | `/api/integrations/quickbooks/callback` | unknown | integrations.route.js |
| `POST` | `/api/integrations/quickbooks/disconnect` | unknown | integrations.route.js |
| `GET` | `/api/integrations/quickbooks/status` | unknown | integrations.route.js |
| `POST` | `/api/integrations/quickbooks/refresh-token` | unknown | integrations.route.js |
| `POST` | `/api/integrations/quickbooks/sync/all` | unknown | integrations.route.js |
| `POST` | `/api/integrations/quickbooks/sync/invoices` | unknown | integrations.route.js |
| `POST` | `/api/integrations/quickbooks/sync/customers` | unknown | integrations.route.js |
| `POST` | `/api/integrations/quickbooks/sync/vendors` | unknown | integrations.route.js |
| `POST` | `/api/integrations/quickbooks/sync/accounts` | unknown | integrations.route.js |
| `POST` | `/api/integrations/quickbooks/sync/payments` | unknown | integrations.route.js |
| `POST` | `/api/integrations/quickbooks/sync/expenses` | unknown | integrations.route.js |
| `GET` | `/api/integrations/quickbooks/sync/history` | unknown | integrations.route.js |
| `GET` | `/api/integrations/quickbooks/mappings/fields` | unknown | integrations.route.js |
| `PUT` | `/api/integrations/quickbooks/mappings/fields` | unknown | integrations.route.js |
| `GET` | `/api/integrations/quickbooks/mappings/accounts` | unknown | integrations.route.js |
| `PUT` | `/api/integrations/quickbooks/mappings/accounts` | unknown | integrations.route.js |
| `GET` | `/api/integrations/quickbooks/conflicts` | unknown | integrations.route.js |
| `POST` | `/api/integrations/quickbooks/conflicts/:conflictId/resolve` | unknown | integrations.route.js |
| `POST` | `/api/integrations/quickbooks/conflicts/bulk-resolve` | unknown | integrations.route.js |
| `GET` | `/api/integrations/xero/auth` | unknown | integrations.route.js |
| `GET` | `/api/integrations/xero/callback` | unknown | integrations.route.js |
| `POST` | `/api/integrations/xero/disconnect` | unknown | integrations.route.js |
| `GET` | `/api/integrations/xero/status` | unknown | integrations.route.js |
| `POST` | `/api/integrations/xero/refresh-token` | unknown | integrations.route.js |
| `POST` | `/api/integrations/xero/sync/all` | unknown | integrations.route.js |
| `POST` | `/api/integrations/xero/sync/invoices` | unknown | integrations.route.js |
| `POST` | `/api/integrations/xero/sync/contacts` | unknown | integrations.route.js |
| `POST` | `/api/integrations/xero/sync/accounts` | unknown | integrations.route.js |
| `POST` | `/api/integrations/xero/sync/payments` | unknown | integrations.route.js |
| `POST` | `/api/integrations/xero/sync/expenses` | unknown | integrations.route.js |
| `GET` | `/api/integrations/xero/sync/history` | unknown | integrations.route.js |
| `POST` | `/api/integrations/xero/webhook` | unknown | integrations.route.js |
| `GET` | `/api/integrations/xero/webhook/status` | unknown | integrations.route.js |
| `GET` | `/api/integrations/discord/auth-url` | unknown | integrations.route.js |
| `GET` | `/api/integrations/discord/callback` | unknown | integrations.route.js |
| `POST` | `/api/integrations/discord/complete-setup` | unknown | integrations.route.js |
| `GET` | `/api/integrations/discord/status` | unknown | integrations.route.js |
| `POST` | `/api/integrations/discord/disconnect` | unknown | integrations.route.js |
| `POST` | `/api/integrations/discord/test` | unknown | integrations.route.js |
| `GET` | `/api/integrations/discord/guilds` | unknown | integrations.route.js |
| `GET` | `/api/integrations/discord/guilds/:guildId/channels` | unknown | integrations.route.js |
| `PUT` | `/api/integrations/discord/settings` | unknown | integrations.route.js |
| `POST` | `/api/integrations/discord/message` | unknown | integrations.route.js |
| `POST` | `/api/integrations/discord/webhook` | unknown | integrations.route.js |

## interCompany

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/inter-company/transactions` | unknown | interCompany.route.js |
| `POST` | `/api/inter-company/transactions` | unknown | interCompany.route.js |
| `GET` | `/api/inter-company/transactions/:id` | unknown | interCompany.route.js |
| `PUT` | `/api/inter-company/transactions/:id` | unknown | interCompany.route.js |
| `POST` | `/api/inter-company/transactions/:id/confirm` | unknown | interCompany.route.js |
| `POST` | `/api/inter-company/transactions/:id/cancel` | unknown | interCompany.route.js |
| `GET` | `/api/inter-company/balances` | unknown | interCompany.route.js |
| `GET` | `/api/inter-company/balances/:firmId` | unknown | interCompany.route.js |
| `GET` | `/api/inter-company/reconciliation` | unknown | interCompany.route.js |
| `POST` | `/api/inter-company/reconciliation` | unknown | interCompany.route.js |

## interCompanyExtended

| Method | Path | Controller | File |
|--------|------|------------|------|
| `POST` | `/api/inter-company/transactions/:id/post` | unknown | interCompanyExtended.route.js |
| `GET` | `/api/inter-company/balances/between` | unknown | interCompanyExtended.route.js |
| `GET` | `/api/inter-company/transactions/between` | unknown | interCompanyExtended.route.js |
| `GET` | `/api/inter-company/reconciliations` | unknown | interCompanyExtended.route.js |
| `GET` | `/api/inter-company/reconciliations/:id` | unknown | interCompanyExtended.route.js |
| `POST` | `/api/inter-company/reconciliations` | unknown | interCompanyExtended.route.js |
| `POST` | `/api/inter-company/reconciliations/:reconciliationId/auto-match` | unknown | interCompanyExtended.route.js |
| `POST` | `/api/inter-company/reconciliations/:reconciliationId/manual-match` | unknown | interCompanyExtended.route.js |
| `POST` | `/api/inter-company/reconciliations/:reconciliationId/unmatch` | unknown | interCompanyExtended.route.js |
| `POST` | `/api/inter-company/reconciliations/:reconciliationId/adjustments` | unknown | interCompanyExtended.route.js |
| `POST` | `/api/inter-company/reconciliations/:reconciliationId/complete` | unknown | interCompanyExtended.route.js |
| `POST` | `/api/inter-company/reconciliations/:reconciliationId/approve` | unknown | interCompanyExtended.route.js |
| `GET` | `/api/inter-company/firms` | unknown | interCompanyExtended.route.js |
| `GET` | `/api/inter-company/exchange-rate` | unknown | interCompanyExtended.route.js |
| `GET` | `/api/inter-company/reports/summary` | unknown | interCompanyExtended.route.js |
| `POST` | `/api/inter-company/reports/export` | unknown | interCompanyExtended.route.js |

## interestAreas

| Method | Path | Controller | File |
|--------|------|------------|------|
| `POST` | `/api/interestAreas` | unknown | interestArea.routes.js |
| `GET` | `/api/interestAreas/tree` | unknown | interestArea.routes.js |
| `GET` | `/api/interestAreas` | unknown | interestArea.routes.js |
| `GET` | `/api/interestAreas/:id` | unknown | interestArea.routes.js |
| `PUT` | `/api/interestAreas/:id` | unknown | interestArea.routes.js |
| `DELETE` | `/api/interestAreas/:id` | unknown | interestArea.routes.js |

## inventory

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/inventory/stats` | unknown | inventory.route.js |
| `GET` | `/api/inventory/reports/stock-balance` | unknown | inventory.route.js |
| `GET` | `/api/inventory/reports/low-stock` | unknown | inventory.route.js |
| `GET` | `/api/inventory/reports/stock-movement` | unknown | inventory.route.js |
| `GET` | `/api/inventory/item-groups` | unknown | inventory.route.js |
| `POST` | `/api/inventory/item-groups` | unknown | inventory.route.js |
| `GET` | `/api/inventory/uom` | unknown | inventory.route.js |
| `POST` | `/api/inventory/uom` | unknown | inventory.route.js |
| `GET` | `/api/inventory/price-lists` | unknown | inventory.route.js |
| `GET` | `/api/inventory/item-prices` | unknown | inventory.route.js |
| `GET` | `/api/inventory/settings` | unknown | inventory.route.js |
| `PUT` | `/api/inventory/settings` | unknown | inventory.route.js |
| `GET` | `/api/inventory/items` | unknown | inventory.route.js |
| `POST` | `/api/inventory/items` | unknown | inventory.route.js |
| `GET` | `/api/inventory/items/:id` | unknown | inventory.route.js |
| `PUT` | `/api/inventory/items/:id` | unknown | inventory.route.js |
| `DELETE` | `/api/inventory/items/:id` | unknown | inventory.route.js |
| `GET` | `/api/inventory/items/:id/stock` | unknown | inventory.route.js |
| `GET` | `/api/inventory/warehouses` | unknown | inventory.route.js |
| `POST` | `/api/inventory/warehouses` | unknown | inventory.route.js |
| `GET` | `/api/inventory/warehouses/:id` | unknown | inventory.route.js |
| `PUT` | `/api/inventory/warehouses/:id` | unknown | inventory.route.js |
| `DELETE` | `/api/inventory/warehouses/:id` | unknown | inventory.route.js |
| `GET` | `/api/inventory/warehouses/:id/stock` | unknown | inventory.route.js |
| `GET` | `/api/inventory/stock-entries` | unknown | inventory.route.js |
| `POST` | `/api/inventory/stock-entries` | unknown | inventory.route.js |
| `GET` | `/api/inventory/stock-entries/:id` | unknown | inventory.route.js |
| `POST` | `/api/inventory/stock-entries/:id/submit` | unknown | inventory.route.js |
| `POST` | `/api/inventory/stock-entries/:id/cancel` | unknown | inventory.route.js |
| `DELETE` | `/api/inventory/stock-entries/:id` | unknown | inventory.route.js |
| `GET` | `/api/inventory/stock-ledger` | unknown | inventory.route.js |
| `GET` | `/api/inventory/batches` | unknown | inventory.route.js |
| `POST` | `/api/inventory/batches` | unknown | inventory.route.js |
| `GET` | `/api/inventory/serial-numbers` | unknown | inventory.route.js |
| `POST` | `/api/inventory/serial-numbers` | unknown | inventory.route.js |
| `GET` | `/api/inventory/reconciliations` | unknown | inventory.route.js |
| `POST` | `/api/inventory/reconciliations` | unknown | inventory.route.js |
| `POST` | `/api/inventory/reconciliations/:id/submit` | unknown | inventory.route.js |

## investmentSearch

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/investment-search/symbols` | searchInvestmentSymbols | investmentSearch.route.js |
| `GET` | `/api/investment-search/quote` | getQuote | investmentSearch.route.js |
| `POST` | `/api/investment-search/quotes` | getBatchQuotes | investmentSearch.route.js |
| `GET` | `/api/investment-search/markets` | getMarkets | investmentSearch.route.js |
| `GET` | `/api/investment-search/types` | getTypes | investmentSearch.route.js |
| `GET` | `/api/investment-search/sectors` | getSectors | investmentSearch.route.js |
| `GET` | `/api/investment-search/market/:market` | getSymbolsByMarketEndpoint | investmentSearch.route.js |
| `GET` | `/api/investment-search/type/:type` | getSymbolsByTypeEndpoint | investmentSearch.route.js |
| `GET` | `/api/investment-search/symbol/:symbol` | getSymbolDetails | investmentSearch.route.js |

## investments

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/investments/summary` | getPortfolioSummary | investments.route.js |
| `POST` | `/api/investments/refresh-all` | refreshAllPrices | investments.route.js |
| `POST` | `/api/investments` | createInvestment | investments.route.js |
| `GET` | `/api/investments` | getInvestments | investments.route.js |
| `GET` | `/api/investments/:id` | getInvestment | investments.route.js |
| `PUT` | `/api/investments/:id` | updateInvestment | investments.route.js |
| `DELETE` | `/api/investments/:id` | deleteInvestment | investments.route.js |
| `POST` | `/api/investments/:id/refresh-price` | refreshPrice | investments.route.js |
| `POST` | `/api/investments/:id/transactions` | addTransaction | investments.route.js |
| `GET` | `/api/investments/:id/transactions` | getTransactions | investments.route.js |
| `DELETE` | `/api/investments/:id/transactions/:transactionId` | deleteTransaction | investments.route.js |

## invitation

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/invitations/:code` | validateInvitationCode | invitation.route.js |
| `GET` | `/api/invitations/:code/validate` | validateInvitationCode | invitation.route.js |
| `POST` | `/api/invitations/:code/accept` | acceptInvitation | invitation.route.js |

## invoice

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/invoices/stats` | unknown | invoice.route.js |
| `GET` | `/api/invoices/overdue` | unknown | invoice.route.js |
| `GET` | `/api/invoices/billable-items` | unknown | invoice.route.js |
| `GET` | `/api/invoices/open/:clientId` | unknown | invoice.route.js |
| `POST` | `/api/invoices/confirm-payment` | unknown | invoice.route.js |
| `POST` | `/api/invoices/bulk-delete` | unknown | invoice.route.js |
| `POST` | `/api/invoices` | unknown | invoice.route.js |
| `GET` | `/api/invoices` | unknown | invoice.route.js |
| `GET` | `/api/invoices/:id` | unknown | invoice.route.js |
| `GET` | `/api/invoices/:_id` | unknown | invoice.route.js |
| `PATCH` | `/api/invoices/:id` | unknown | invoice.route.js |
| `PATCH` | `/api/invoices/:_id` | unknown | invoice.route.js |
| `PUT` | `/api/invoices/:id` | unknown | invoice.route.js |
| `DELETE` | `/api/invoices/:id` | unknown | invoice.route.js |
| `DELETE` | `/api/invoices/:_id` | unknown | invoice.route.js |
| `POST` | `/api/invoices/:id/send` | unknown | invoice.route.js |
| `POST` | `/api/invoices/:_id/send` | unknown | invoice.route.js |
| `POST` | `/api/invoices/:id/record-payment` | unknown | invoice.route.js |
| `POST` | `/api/invoices/:id/payments` | unknown | invoice.route.js |
| `POST` | `/api/invoices/:_id/payments` | unknown | invoice.route.js |
| `POST` | `/api/invoices/:id/void` | unknown | invoice.route.js |
| `POST` | `/api/invoices/:id/duplicate` | unknown | invoice.route.js |
| `POST` | `/api/invoices/:id/send-reminder` | unknown | invoice.route.js |
| `POST` | `/api/invoices/:id/convert-to-credit-note` | unknown | invoice.route.js |
| `POST` | `/api/invoices/:id/apply-retainer` | unknown | invoice.route.js |
| `POST` | `/api/invoices/:id/submit-for-approval` | unknown | invoice.route.js |
| `POST` | `/api/invoices/:id/approve` | unknown | invoice.route.js |
| `POST` | `/api/invoices/:id/reject` | unknown | invoice.route.js |
| `POST` | `/api/invoices/:id/zatca/submit` | unknown | invoice.route.js |
| `GET` | `/api/invoices/:id/zatca/status` | unknown | invoice.route.js |
| `GET` | `/api/invoices/:id/pdf` | unknown | invoice.route.js |
| `GET` | `/api/invoices/:id/xml` | unknown | invoice.route.js |
| `POST` | `/api/invoices/:id/payment` | unknown | invoice.route.js |
| `POST` | `/api/invoices/:_id/payment` | unknown | invoice.route.js |

## invoiceApproval

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/invoice-approvals/pending` | getPendingApprovals | invoiceApproval.route.js |
| `GET` | `/api/invoice-approvals/stats` | getApprovalStats | invoiceApproval.route.js |
| `GET` | `/api/invoice-approvals/needing-escalation` | getNeedingEscalation | invoiceApproval.route.js |
| `GET` | `/api/invoice-approvals` | getInvoiceApprovals | invoiceApproval.route.js |
| `GET` | `/api/invoice-approvals/:id` | getInvoiceApproval | invoiceApproval.route.js |
| `POST` | `/api/invoice-approvals/:id/approve` | approveInvoice | invoiceApproval.route.js |
| `POST` | `/api/invoice-approvals/:id/reject` | rejectInvoice | invoiceApproval.route.js |
| `POST` | `/api/invoice-approvals/:id/escalate` | escalateApproval | invoiceApproval.route.js |
| `POST` | `/api/invoice-approvals/:id/cancel` | cancelApproval | invoiceApproval.route.js |

## invoiceTemplate

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/invoice-templates/default` | getDefaultTemplate | invoiceTemplate.route.js |
| `POST` | `/api/invoice-templates/import` | importTemplate | invoiceTemplate.route.js |
| `GET` | `/api/invoice-templates` | getTemplates | invoiceTemplate.route.js |
| `POST` | `/api/invoice-templates` | createTemplate | invoiceTemplate.route.js |
| `GET` | `/api/invoice-templates/:id` | getTemplate | invoiceTemplate.route.js |
| `PATCH` | `/api/invoice-templates/:id` | updateTemplate | invoiceTemplate.route.js |
| `DELETE` | `/api/invoice-templates/:id` | deleteTemplate | invoiceTemplate.route.js |
| `POST` | `/api/invoice-templates/:id/duplicate` | duplicateTemplate | invoiceTemplate.route.js |
| `POST` | `/api/invoice-templates/:id/set-default` | setAsDefault | invoiceTemplate.route.js |
| `GET` | `/api/invoice-templates/:id/preview` | previewTemplate | invoiceTemplate.route.js |
| `GET` | `/api/invoice-templates/:id/export` | exportTemplate | invoiceTemplate.route.js |

## job

| Method | Path | Controller | File |
|--------|------|------------|------|
| `POST` | `/api/jobs` | createJob | job.route.js |
| `GET` | `/api/jobs` | getJobs | job.route.js |
| `GET` | `/api/jobs/my-jobs` | getMyJobs | job.route.js |
| `GET` | `/api/jobs/:_id` | getJob | job.route.js |
| `PATCH` | `/api/jobs/:_id` | updateJob | job.route.js |
| `DELETE` | `/api/jobs/:_id` | deleteJob | job.route.js |

## jobPosition

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/hr/job-positions/stats` | unknown | jobPosition.route.js |
| `GET` | `/api/hr/job-positions/vacant` | unknown | jobPosition.route.js |
| `GET` | `/api/hr/job-positions/org-chart` | unknown | jobPosition.route.js |
| `GET` | `/api/hr/job-positions/export` | unknown | jobPosition.route.js |
| `GET` | `/api/hr/job-positions` | unknown | jobPosition.route.js |
| `POST` | `/api/hr/job-positions` | unknown | jobPosition.route.js |
| `POST` | `/api/hr/job-positions/bulk-delete` | unknown | jobPosition.route.js |
| `GET` | `/api/hr/job-positions/department/:departmentId` | unknown | jobPosition.route.js |
| `GET` | `/api/hr/job-positions/:id` | unknown | jobPosition.route.js |
| `PATCH` | `/api/hr/job-positions/:id` | unknown | jobPosition.route.js |
| `PUT` | `/api/hr/job-positions/:id` | unknown | jobPosition.route.js |
| `DELETE` | `/api/hr/job-positions/:id` | unknown | jobPosition.route.js |
| `GET` | `/api/hr/job-positions/:id/hierarchy` | unknown | jobPosition.route.js |
| `POST` | `/api/hr/job-positions/:id/freeze` | unknown | jobPosition.route.js |
| `POST` | `/api/hr/job-positions/:id/unfreeze` | unknown | jobPosition.route.js |
| `POST` | `/api/hr/job-positions/:id/eliminate` | unknown | jobPosition.route.js |
| `POST` | `/api/hr/job-positions/:id/vacant` | unknown | jobPosition.route.js |
| `POST` | `/api/hr/job-positions/:id/fill` | unknown | jobPosition.route.js |
| `POST` | `/api/hr/job-positions/:id/vacate` | unknown | jobPosition.route.js |
| `POST` | `/api/hr/job-positions/:id/clone` | unknown | jobPosition.route.js |
| `PUT` | `/api/hr/job-positions/:id/responsibilities` | unknown | jobPosition.route.js |
| `PUT` | `/api/hr/job-positions/:id/qualifications` | unknown | jobPosition.route.js |
| `PUT` | `/api/hr/job-positions/:id/salary-range` | unknown | jobPosition.route.js |
| `PUT` | `/api/hr/job-positions/:id/competencies` | unknown | jobPosition.route.js |
| `POST` | `/api/hr/job-positions/:id/documents` | unknown | jobPosition.route.js |

## journalEntry

| Method | Path | Controller | File |
|--------|------|------------|------|
| `POST` | `/api/journal-entries/simple` | createSimpleEntry | journalEntry.route.js |
| `GET` | `/api/journal-entries` | getEntries | journalEntry.route.js |
| `GET` | `/api/journal-entries/:id` | getEntry | journalEntry.route.js |
| `POST` | `/api/journal-entries` | createEntry | journalEntry.route.js |
| `PATCH` | `/api/journal-entries/:id` | updateEntry | journalEntry.route.js |
| `POST` | `/api/journal-entries/:id/post` | postEntry | journalEntry.route.js |
| `POST` | `/api/journal-entries/:id/void` | voidEntry | journalEntry.route.js |
| `DELETE` | `/api/journal-entries/:id` | deleteEntry | journalEntry.route.js |

## keyboardShortcuts

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/keyboardShortcuts/defaults` | unknown | keyboardShortcut.routes.js |
| `POST` | `/api/keyboardShortcuts/check-conflict` | unknown | keyboardShortcut.routes.js |
| `POST` | `/api/keyboardShortcuts/reset-all` | unknown | keyboardShortcut.routes.js |
| `GET` | `/api/keyboardShortcuts` | unknown | keyboardShortcut.routes.js |
| `POST` | `/api/keyboardShortcuts` | unknown | keyboardShortcut.routes.js |
| `GET` | `/api/keyboardShortcuts/:id` | unknown | keyboardShortcut.routes.js |
| `PUT` | `/api/keyboardShortcuts/:id` | unknown | keyboardShortcut.routes.js |
| `DELETE` | `/api/keyboardShortcuts/:id` | unknown | keyboardShortcut.routes.js |
| `POST` | `/api/keyboardShortcuts/:id/reset` | unknown | keyboardShortcut.routes.js |

## kpiAnalytics

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/analytics/kpi/kpi-dashboard` | unknown | kpiAnalytics.route.js |
| `GET` | `/api/analytics/kpi/revenue-by-case` | unknown | kpiAnalytics.route.js |
| `GET` | `/api/analytics/kpi/case-throughput` | unknown | kpiAnalytics.route.js |
| `GET` | `/api/analytics/kpi/user-activation` | unknown | kpiAnalytics.route.js |

## kyc

| Method | Path | Controller | File |
|--------|------|------------|------|
| `POST` | `/api/kyc/webhook` | unknown | kyc.route.js |
| `POST` | `/api/kyc/initiate` | unknown | kyc.route.js |
| `POST` | `/api/kyc/verify` | unknown | kyc.route.js |
| `POST` | `/api/kyc/submit` | unknown | kyc.route.js |
| `GET` | `/api/kyc/status` | unknown | kyc.route.js |
| `GET` | `/api/kyc/history` | unknown | kyc.route.js |
| `POST` | `/api/kyc/review` | unknown | kyc.route.js |
| `GET` | `/api/kyc/admin/pending` | unknown | kyc.route.js |
| `GET` | `/api/kyc/admin/stats` | unknown | kyc.route.js |

## lawyer

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/lawyers/team` | getTeamMembers | lawyer.route.js |
| `GET` | `/api/lawyers` | getLawyers | lawyer.route.js |
| `GET` | `/api/lawyers/:_id` | getLawyer | lawyer.route.js |

## ldap

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/admin/ldap/config` | getConfig | ldap.route.js |
| `POST` | `/api/admin/ldap/config` | saveConfig | ldap.route.js |
| `POST` | `/api/admin/ldap/test` | testConnection | ldap.route.js |
| `POST` | `/api/admin/ldap/test-auth` | testAuth | ldap.route.js |
| `POST` | `/api/admin/ldap/sync` | syncUsers | ldap.route.js |
| `POST` | `/api/admin/ldap/login` | login | ldap.route.js |

## lead

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/leads/overview` | unknown | lead.route.js |
| `POST` | `/api/leads/bulk-delete` | unknown | lead.route.js |
| `POST` | `/api/leads` | unknown | lead.route.js |
| `GET` | `/api/leads` | unknown | lead.route.js |
| `GET` | `/api/leads/stats` | unknown | lead.route.js |
| `GET` | `/api/leads/follow-up` | unknown | lead.route.js |
| `GET` | `/api/leads/pipeline/:pipelineId?` | unknown | lead.route.js |
| `GET` | `/api/leads/:id` | unknown | lead.route.js |
| `PUT` | `/api/leads/:id` | unknown | lead.route.js |
| `DELETE` | `/api/leads/:id` | unknown | lead.route.js |
| `POST` | `/api/leads/:id/status` | unknown | lead.route.js |
| `POST` | `/api/leads/:id/move` | unknown | lead.route.js |
| `GET` | `/api/leads/:id/conversion-preview` | unknown | lead.route.js |
| `POST` | `/api/leads/:id/convert` | unknown | lead.route.js |
| `GET` | `/api/leads/:id/activities` | unknown | lead.route.js |
| `POST` | `/api/leads/:id/activities` | unknown | lead.route.js |
| `POST` | `/api/leads/:id/follow-up` | unknown | lead.route.js |
| `POST` | `/api/leads/:id/verify/wathq` | unknown | lead.route.js |
| `POST` | `/api/leads/:id/verify/absher` | unknown | lead.route.js |
| `POST` | `/api/leads/:id/verify/address` | unknown | lead.route.js |
| `POST` | `/api/leads/:id/conflict-check` | unknown | lead.route.js |

## leadConversion

| Method | Path | Controller | File |
|--------|------|------------|------|
| `POST` | `/api/leadConversion/:id/convert` | unknown | leadConversion.route.js |
| `GET` | `/api/leadConversion/:id/cases` | unknown | leadConversion.route.js |
| `PUT` | `/api/leadConversion/case/:caseId/stage` | unknown | leadConversion.route.js |
| `PUT` | `/api/leadConversion/case/:caseId/won` | unknown | leadConversion.route.js |
| `PUT` | `/api/leadConversion/case/:caseId/lost` | unknown | leadConversion.route.js |
| `GET` | `/api/leadConversion/case/:caseId/quotes` | unknown | leadConversion.route.js |

## leadScoring

| Method | Path | Controller | File |
|--------|------|------------|------|
| `POST` | `/api/lead-scoring/calculate/:leadId` | unknown | leadScoring.route.js |
| `POST` | `/api/lead-scoring/calculate-all` | unknown | leadScoring.route.js |
| `POST` | `/api/lead-scoring/calculate-batch` | unknown | leadScoring.route.js |
| `GET` | `/api/lead-scoring/scores` | unknown | leadScoring.route.js |
| `GET` | `/api/lead-scoring/leaderboard` | unknown | leadScoring.route.js |
| `GET` | `/api/lead-scoring/distribution` | unknown | leadScoring.route.js |
| `GET` | `/api/lead-scoring/top-leads` | unknown | leadScoring.route.js |
| `GET` | `/api/lead-scoring/by-grade/:grade` | unknown | leadScoring.route.js |
| `GET` | `/api/lead-scoring/insights/:leadId` | unknown | leadScoring.route.js |
| `GET` | `/api/lead-scoring/trends` | unknown | leadScoring.route.js |
| `GET` | `/api/lead-scoring/conversion-analysis` | unknown | leadScoring.route.js |
| `POST` | `/api/lead-scoring/track/email-open` | unknown | leadScoring.route.js |
| `POST` | `/api/lead-scoring/track/email-click` | unknown | leadScoring.route.js |
| `POST` | `/api/lead-scoring/track/document-view` | unknown | leadScoring.route.js |
| `POST` | `/api/lead-scoring/track/website-visit` | unknown | leadScoring.route.js |
| `POST` | `/api/lead-scoring/track/form-submit` | unknown | leadScoring.route.js |
| `POST` | `/api/lead-scoring/track/meeting` | unknown | leadScoring.route.js |
| `POST` | `/api/lead-scoring/track/call` | unknown | leadScoring.route.js |
| `POST` | `/api/lead-scoring/process-decay` | unknown | leadScoring.route.js |

## leadSource

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/leadSource` | unknown | leadSource.route.js |
| `GET` | `/api/leadSource/:id` | unknown | leadSource.route.js |
| `POST` | `/api/leadSource` | unknown | leadSource.route.js |
| `POST` | `/api/leadSource/defaults` | unknown | leadSource.route.js |
| `PUT` | `/api/leadSource/:id` | unknown | leadSource.route.js |
| `DELETE` | `/api/leadSource/:id` | unknown | leadSource.route.js |

## leaveAllocation

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/leave-allocations` | unknown | leaveAllocation.route.js |
| `GET` | `/api/leave-allocations/balance/:employeeId` | unknown | leaveAllocation.route.js |
| `GET` | `/api/leave-allocations/employee/:employeeId/all` | unknown | leaveAllocation.route.js |
| `GET` | `/api/leave-allocations/history/:employeeId` | unknown | leaveAllocation.route.js |
| `GET` | `/api/leave-allocations/summary/:leavePeriodId` | unknown | leaveAllocation.route.js |
| `GET` | `/api/leave-allocations/low-balance` | unknown | leaveAllocation.route.js |
| `GET` | `/api/leave-allocations/expiring-carry-forward` | unknown | leaveAllocation.route.js |
| `GET` | `/api/leave-allocations/carry-forward/summary` | unknown | leaveAllocation.route.js |
| `GET` | `/api/leave-allocations/statistics` | unknown | leaveAllocation.route.js |
| `GET` | `/api/leave-allocations/:id` | unknown | leaveAllocation.route.js |
| `POST` | `/api/leave-allocations` | unknown | leaveAllocation.route.js |
| `POST` | `/api/leave-allocations/bulk` | unknown | leaveAllocation.route.js |
| `POST` | `/api/leave-allocations/carry-forward` | unknown | leaveAllocation.route.js |
| `POST` | `/api/leave-allocations/carry-forward/process-all` | unknown | leaveAllocation.route.js |
| `POST` | `/api/leave-allocations/carry-forward/expire` | unknown | leaveAllocation.route.js |
| `PATCH` | `/api/leave-allocations/:id` | unknown | leaveAllocation.route.js |
| `PATCH` | `/api/leave-allocations/:id/update-balance` | unknown | leaveAllocation.route.js |
| `POST` | `/api/leave-allocations/:id/adjust` | unknown | leaveAllocation.route.js |
| `POST` | `/api/leave-allocations/:id/encash` | unknown | leaveAllocation.route.js |
| `DELETE` | `/api/leave-allocations/:id` | unknown | leaveAllocation.route.js |

## leaveEncashment

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/leave-encashments` | unknown | leaveEncashment.route.js |
| `GET` | `/api/leave-encashments/pending-approvals` | unknown | leaveEncashment.route.js |
| `GET` | `/api/leave-encashments/stats` | unknown | leaveEncashment.route.js |
| `GET` | `/api/leave-encashments/policy` | unknown | leaveEncashment.route.js |
| `GET` | `/api/leave-encashments/eligibility/:employeeId` | unknown | leaveEncashment.route.js |
| `GET` | `/api/leave-encashments/employee/:employeeId` | unknown | leaveEncashment.route.js |
| `GET` | `/api/leave-encashments/export` | unknown | leaveEncashment.route.js |
| `GET` | `/api/leave-encashments/:id` | unknown | leaveEncashment.route.js |
| `POST` | `/api/leave-encashments` | unknown | leaveEncashment.route.js |
| `POST` | `/api/leave-encashments/calculate` | unknown | leaveEncashment.route.js |
| `PATCH` | `/api/leave-encashments/:id` | unknown | leaveEncashment.route.js |
| `DELETE` | `/api/leave-encashments/:id` | unknown | leaveEncashment.route.js |
| `POST` | `/api/leave-encashments/:id/submit` | unknown | leaveEncashment.route.js |
| `POST` | `/api/leave-encashments/:id/approve` | unknown | leaveEncashment.route.js |
| `POST` | `/api/leave-encashments/:id/reject` | unknown | leaveEncashment.route.js |
| `POST` | `/api/leave-encashments/:id/mark-paid` | unknown | leaveEncashment.route.js |
| `POST` | `/api/leave-encashments/:id/process` | unknown | leaveEncashment.route.js |
| `POST` | `/api/leave-encashments/:id/cancel` | unknown | leaveEncashment.route.js |
| `POST` | `/api/leave-encashments/bulk-approve` | unknown | leaveEncashment.route.js |
| `POST` | `/api/leave-encashments/bulk-reject` | unknown | leaveEncashment.route.js |

## leaveManagement

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/hr/leave-management/leave-periods` | unknown | leaveManagement.route.js |
| `GET` | `/api/hr/leave-management/leave-periods/current` | unknown | leaveManagement.route.js |
| `GET` | `/api/hr/leave-management/leave-periods/:id` | unknown | leaveManagement.route.js |
| `POST` | `/api/hr/leave-management/leave-periods` | unknown | leaveManagement.route.js |
| `PUT` | `/api/hr/leave-management/leave-periods/:id` | unknown | leaveManagement.route.js |
| `DELETE` | `/api/hr/leave-management/leave-periods/:id` | unknown | leaveManagement.route.js |
| `POST` | `/api/hr/leave-management/leave-periods/:id/activate` | unknown | leaveManagement.route.js |
| `POST` | `/api/hr/leave-management/leave-periods/:id/close` | unknown | leaveManagement.route.js |
| `GET` | `/api/hr/leave-management/leave-policies` | unknown | leaveManagement.route.js |
| `GET` | `/api/hr/leave-management/leave-policies/default` | unknown | leaveManagement.route.js |
| `GET` | `/api/hr/leave-management/leave-policies/:id` | unknown | leaveManagement.route.js |
| `POST` | `/api/hr/leave-management/leave-policies` | unknown | leaveManagement.route.js |
| `PUT` | `/api/hr/leave-management/leave-policies/:id` | unknown | leaveManagement.route.js |
| `DELETE` | `/api/hr/leave-management/leave-policies/:id` | unknown | leaveManagement.route.js |
| `POST` | `/api/hr/leave-management/leave-policies/:id/clone` | unknown | leaveManagement.route.js |
| `GET` | `/api/hr/leave-management/leave-allocations` | unknown | leaveManagement.route.js |
| `GET` | `/api/hr/leave-management/leave-allocations/employee/:employeeId` | unknown | leaveManagement.route.js |
| `GET` | `/api/hr/leave-management/leave-allocations/balance/:employeeId/:leaveTypeId` | unknown | leaveManagement.route.js |
| `GET` | `/api/hr/leave-management/leave-allocations/:id` | unknown | leaveManagement.route.js |
| `POST` | `/api/hr/leave-management/leave-allocations` | unknown | leaveManagement.route.js |
| `POST` | `/api/hr/leave-management/leave-allocations/bulk` | unknown | leaveManagement.route.js |
| `PUT` | `/api/hr/leave-management/leave-allocations/:id` | unknown | leaveManagement.route.js |
| `DELETE` | `/api/hr/leave-management/leave-allocations/:id` | unknown | leaveManagement.route.js |
| `POST` | `/api/hr/leave-management/leave-allocations/:id/approve` | unknown | leaveManagement.route.js |
| `POST` | `/api/hr/leave-management/leave-allocations/:id/adjust` | unknown | leaveManagement.route.js |
| `POST` | `/api/hr/leave-management/leave-allocations/generate` | unknown | leaveManagement.route.js |

## leaveRequest

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/leave-requests/types` | getLeaveTypes | leaveRequest.route.js |
| `GET` | `/api/leave-requests/stats` | getLeaveStats | leaveRequest.route.js |
| `GET` | `/api/leave-requests/calendar` | getTeamCalendar | leaveRequest.route.js |
| `GET` | `/api/leave-requests/pending-approvals` | getPendingApprovals | leaveRequest.route.js |
| `POST` | `/api/leave-requests/check-conflicts` | checkConflicts | leaveRequest.route.js |
| `POST` | `/api/leave-requests/bulk-delete` | bulkDeleteLeaveRequests | leaveRequest.route.js |
| `GET` | `/api/leave-requests/balance/:employeeId` | getLeaveBalance | leaveRequest.route.js |
| `POST` | `/api/leave-requests/:id/submit` | submitLeaveRequest | leaveRequest.route.js |
| `POST` | `/api/leave-requests/:id/approve` | approveLeaveRequest | leaveRequest.route.js |
| `POST` | `/api/leave-requests/:id/reject` | rejectLeaveRequest | leaveRequest.route.js |
| `POST` | `/api/leave-requests/:id/cancel` | cancelLeaveRequest | leaveRequest.route.js |
| `POST` | `/api/leave-requests/:id/confirm-return` | confirmReturn | leaveRequest.route.js |
| `POST` | `/api/leave-requests/:id/request-extension` | requestExtension | leaveRequest.route.js |
| `POST` | `/api/leave-requests/:id/complete-handover` | completeHandover | leaveRequest.route.js |
| `POST` | `/api/leave-requests/:id/documents` | uploadDocument | leaveRequest.route.js |
| `GET` | `/api/leave-requests` | getLeaveRequests | leaveRequest.route.js |
| `POST` | `/api/leave-requests` | createLeaveRequest | leaveRequest.route.js |
| `GET` | `/api/leave-requests/:id` | getLeaveRequest | leaveRequest.route.js |
| `PATCH` | `/api/leave-requests/:id` | updateLeaveRequest | leaveRequest.route.js |
| `DELETE` | `/api/leave-requests/:id` | deleteLeaveRequest | leaveRequest.route.js |

## legalContract

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/contracts/search` | searchContracts | legalContract.route.js |
| `GET` | `/api/contracts/expiring` | getExpiringContracts | legalContract.route.js |
| `GET` | `/api/contracts/statistics` | getContractStatistics | legalContract.route.js |
| `GET` | `/api/contracts/client/:clientId` | getContractsByClient | legalContract.route.js |
| `GET` | `/api/contracts/templates` | getTemplates | legalContract.route.js |
| `POST` | `/api/contracts/templates/:templateId/use` | createFromTemplate | legalContract.route.js |
| `GET` | `/api/contracts` | listContracts | legalContract.route.js |
| `POST` | `/api/contracts` | createContract | legalContract.route.js |
| `GET` | `/api/contracts/:contractId` | getContract | legalContract.route.js |
| `PATCH` | `/api/contracts/:contractId` | updateContract | legalContract.route.js |
| `DELETE` | `/api/contracts/:contractId` | deleteContract | legalContract.route.js |
| `POST` | `/api/contracts/:contractId/parties` | addParty | legalContract.route.js |
| `PATCH` | `/api/contracts/:contractId/parties/:partyIndex` | updateParty | legalContract.route.js |
| `DELETE` | `/api/contracts/:contractId/parties/:partyIndex` | removeParty | legalContract.route.js |
| `POST` | `/api/contracts/:contractId/signatures/initiate` | initiateSignature | legalContract.route.js |
| `POST` | `/api/contracts/:contractId/signatures/:partyIndex` | recordSignature | legalContract.route.js |
| `GET` | `/api/contracts/:contractId/signatures` | getSignatureStatus | legalContract.route.js |
| `POST` | `/api/contracts/:contractId/amendments` | addAmendment | legalContract.route.js |
| `GET` | `/api/contracts/:contractId/amendments` | getAmendments | legalContract.route.js |
| `POST` | `/api/contracts/:contractId/versions` | createVersion | legalContract.route.js |
| `GET` | `/api/contracts/:contractId/versions` | getVersionHistory | legalContract.route.js |
| `POST` | `/api/contracts/:contractId/versions/:versionNumber/revert` | revertToVersion | legalContract.route.js |
| `POST` | `/api/contracts/:contractId/notarization` | recordNotarization | legalContract.route.js |
| `GET` | `/api/contracts/:contractId/notarization/verify` | verifyNotarization | legalContract.route.js |
| `POST` | `/api/contracts/:contractId/breach` | recordBreach | legalContract.route.js |
| `POST` | `/api/contracts/:contractId/enforcement` | initiateEnforcement | legalContract.route.js |
| `PATCH` | `/api/contracts/:contractId/enforcement` | updateEnforcementStatus | legalContract.route.js |
| `POST` | `/api/contracts/:contractId/link-case` | linkToCase | legalContract.route.js |
| `POST` | `/api/contracts/:contractId/reminders` | setReminder | legalContract.route.js |
| `GET` | `/api/contracts/:contractId/reminders` | getReminders | legalContract.route.js |
| `GET` | `/api/contracts/:contractId/export/pdf` | exportToPdf | legalContract.route.js |
| `GET` | `/api/contracts/:contractId/export/word` | exportToWord | legalContract.route.js |
| `POST` | `/api/contracts/:contractId/save-as-template` | saveAsTemplate | legalContract.route.js |

## legalDocument

| Method | Path | Controller | File |
|--------|------|------------|------|
| `POST` | `/api/legalDocument` | createDocument | legalDocument.route.js |
| `GET` | `/api/legalDocument` | getDocuments | legalDocument.route.js |
| `GET` | `/api/legalDocument/:_id` | getDocument | legalDocument.route.js |
| `PATCH` | `/api/legalDocument/:_id` | updateDocument | legalDocument.route.js |
| `DELETE` | `/api/legalDocument/:_id` | deleteDocument | legalDocument.route.js |
| `POST` | `/api/legalDocument/:_id/download` | incrementDownload | legalDocument.route.js |

## legalDocumentsCrud

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/legal-documents/:id` | unknown | legalDocumentsCrud.route.js |
| `PATCH` | `/api/legal-documents/:id` | unknown | legalDocumentsCrud.route.js |
| `DELETE` | `/api/legal-documents/:id` | unknown | legalDocumentsCrud.route.js |
| `POST` | `/api/legal-documents/:id/download` | unknown | legalDocumentsCrud.route.js |
| `GET` | `/api/legal-documents/:id/versions` | unknown | legalDocumentsCrud.route.js |
| `POST` | `/api/legal-documents/:id/versions` | unknown | legalDocumentsCrud.route.js |
| `POST` | `/api/legal-documents/:id/restore/:versionId` | unknown | legalDocumentsCrud.route.js |

## legalDocumentsExtended

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/legal-documents/:id/signature-status` | unknown | legalDocumentsExtended.route.js |
| `POST` | `/api/legal-documents/:id/request-signature` | unknown | legalDocumentsExtended.route.js |
| `POST` | `/api/legal-documents/:id/sign` | unknown | legalDocumentsExtended.route.js |
| `POST` | `/api/legal-documents/:id/execute` | unknown | legalDocumentsExtended.route.js |
| `GET` | `/api/legal-documents/:id/audit-trail` | unknown | legalDocumentsExtended.route.js |
| `POST` | `/api/legal-documents/:id/send-reminder` | unknown | legalDocumentsExtended.route.js |
| `GET` | `/api/legal-documents/:id/parties` | unknown | legalDocumentsExtended.route.js |

## lifecycles

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/lifecycles/workflows` | unknown | lifecycle.routes.js |
| `POST` | `/api/lifecycles/workflows` | unknown | lifecycle.routes.js |
| `GET` | `/api/lifecycles/workflows/:id` | unknown | lifecycle.routes.js |
| `PUT` | `/api/lifecycles/workflows/:id` | unknown | lifecycle.routes.js |
| `DELETE` | `/api/lifecycles/workflows/:id` | unknown | lifecycle.routes.js |
| `POST` | `/api/lifecycles/initiate` | unknown | lifecycle.routes.js |
| `GET` | `/api/lifecycles/:entityType/:entityId` | unknown | lifecycle.routes.js |
| `GET` | `/api/lifecycles/instance/:id/progress` | unknown | lifecycle.routes.js |
| `POST` | `/api/lifecycles/instance/:id/advance` | unknown | lifecycle.routes.js |
| `POST` | `/api/lifecycles/instance/:id/cancel` | unknown | lifecycle.routes.js |

## lockDates

| Method | Path | Controller | File |
|--------|------|------------|------|
| `PATCH` | `/api/lockDates/fiscal-year` | updateFiscalYearEnd | lockDate.routes.js |
| `GET` | `/api/lockDates/history` | getLockHistory | lockDate.routes.js |
| `POST` | `/api/lockDates/check` | checkDate | lockDate.routes.js |
| `GET` | `/api/lockDates/periods` | getFiscalPeriods | lockDate.routes.js |
| `POST` | `/api/lockDates/periods/lock` | lockPeriod | lockDate.routes.js |
| `POST` | `/api/lockDates/periods/reopen` | reopenPeriod | lockDate.routes.js |
| `GET` | `/api/lockDates` | getLockDates | lockDate.routes.js |
| `PATCH` | `/api/lockDates/:lockType` | updateLockDate | lockDate.routes.js |

## lostReason

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/lostReason` | unknown | lostReason.route.js |
| `GET` | `/api/lostReason/categories` | unknown | lostReason.route.js |
| `GET` | `/api/lostReason/:id` | unknown | lostReason.route.js |
| `POST` | `/api/lostReason` | unknown | lostReason.route.js |
| `POST` | `/api/lostReason/defaults` | unknown | lostReason.route.js |
| `PUT` | `/api/lostReason/:id` | unknown | lostReason.route.js |
| `DELETE` | `/api/lostReason/:id` | unknown | lostReason.route.js |

## lostReasons

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/lostReasons/stats` | unknown | lostReason.routes.js |
| `PUT` | `/api/lostReasons/reorder` | unknown | lostReason.routes.js |
| `GET` | `/api/lostReasons` | unknown | lostReason.routes.js |
| `POST` | `/api/lostReasons` | unknown | lostReason.routes.js |
| `GET` | `/api/lostReasons/:id` | unknown | lostReason.routes.js |
| `PUT` | `/api/lostReasons/:id` | unknown | lostReason.routes.js |
| `DELETE` | `/api/lostReasons/:id` | unknown | lostReason.routes.js |

## macros

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/macros/popular` | getPopularMacros | macro.routes.js |
| `GET` | `/api/macros/shortcut/:shortcut` | getByShortcut | macro.routes.js |
| `GET` | `/api/macros/suggest/:conversationId` | suggestMacros | macro.routes.js |
| `GET` | `/api/macros` | listMacros | macro.routes.js |
| `POST` | `/api/macros` | createMacro | macro.routes.js |
| `GET` | `/api/macros/:id` | getMacro | macro.routes.js |
| `PUT` | `/api/macros/:id` | updateMacro | macro.routes.js |
| `DELETE` | `/api/macros/:id` | deleteMacro | macro.routes.js |
| `POST` | `/api/macros/:id/apply/:conversationId` | applyMacro | macro.routes.js |

## manufacturing

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/manufacturing/stats` | getStats | manufacturing.route.js |
| `GET` | `/api/manufacturing/settings` | getSettings | manufacturing.route.js |
| `PUT` | `/api/manufacturing/settings` | updateSettings | manufacturing.route.js |
| `GET` | `/api/manufacturing/boms` | getBOMs | manufacturing.route.js |
| `GET` | `/api/manufacturing/boms/:id` | getBOMById | manufacturing.route.js |
| `POST` | `/api/manufacturing/boms` | createBOM | manufacturing.route.js |
| `PUT` | `/api/manufacturing/boms/:id` | updateBOM | manufacturing.route.js |
| `DELETE` | `/api/manufacturing/boms/:id` | deleteBOM | manufacturing.route.js |
| `GET` | `/api/manufacturing/workstations` | getWorkstations | manufacturing.route.js |
| `GET` | `/api/manufacturing/workstations/:id` | getWorkstationById | manufacturing.route.js |
| `POST` | `/api/manufacturing/workstations` | createWorkstation | manufacturing.route.js |
| `PUT` | `/api/manufacturing/workstations/:id` | updateWorkstation | manufacturing.route.js |
| `DELETE` | `/api/manufacturing/workstations/:id` | deleteWorkstation | manufacturing.route.js |
| `GET` | `/api/manufacturing/work-orders` | getWorkOrders | manufacturing.route.js |
| `GET` | `/api/manufacturing/work-orders/:id` | getWorkOrderById | manufacturing.route.js |
| `POST` | `/api/manufacturing/work-orders` | createWorkOrder | manufacturing.route.js |
| `PUT` | `/api/manufacturing/work-orders/:id` | updateWorkOrder | manufacturing.route.js |
| `DELETE` | `/api/manufacturing/work-orders/:id` | deleteWorkOrder | manufacturing.route.js |
| `POST` | `/api/manufacturing/work-orders/:id/submit` | submitWorkOrder | manufacturing.route.js |
| `POST` | `/api/manufacturing/work-orders/:id/start` | startWorkOrder | manufacturing.route.js |
| `POST` | `/api/manufacturing/work-orders/:id/complete` | completeWorkOrder | manufacturing.route.js |
| `POST` | `/api/manufacturing/work-orders/:id/cancel` | cancelWorkOrder | manufacturing.route.js |
| `GET` | `/api/manufacturing/job-cards` | getJobCards | manufacturing.route.js |
| `GET` | `/api/manufacturing/job-cards/:id` | getJobCardById | manufacturing.route.js |
| `POST` | `/api/manufacturing/job-cards` | createJobCard | manufacturing.route.js |
| `PUT` | `/api/manufacturing/job-cards/:id` | updateJobCard | manufacturing.route.js |
| `POST` | `/api/manufacturing/job-cards/:id/start` | startJobCard | manufacturing.route.js |
| `POST` | `/api/manufacturing/job-cards/:id/complete` | completeJobCard | manufacturing.route.js |

## matterBudget

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/matter-budgets/alerts` | getBudgetAlerts | matterBudget.route.js |
| `GET` | `/api/matter-budgets/templates` | getTemplates | matterBudget.route.js |
| `POST` | `/api/matter-budgets/templates` | createTemplate | matterBudget.route.js |
| `PATCH` | `/api/matter-budgets/templates/:id` | updateTemplate | matterBudget.route.js |
| `DELETE` | `/api/matter-budgets/templates/:id` | deleteTemplate | matterBudget.route.js |
| `GET` | `/api/matter-budgets/case/:caseId` | getBudgetByCase | matterBudget.route.js |
| `GET` | `/api/matter-budgets` | getBudgets | matterBudget.route.js |
| `POST` | `/api/matter-budgets` | createBudget | matterBudget.route.js |
| `GET` | `/api/matter-budgets/:id` | getBudget | matterBudget.route.js |
| `PATCH` | `/api/matter-budgets/:id` | updateBudget | matterBudget.route.js |
| `DELETE` | `/api/matter-budgets/:id` | deleteBudget | matterBudget.route.js |
| `GET` | `/api/matter-budgets/:id/analysis` | getBudgetAnalysis | matterBudget.route.js |
| `GET` | `/api/matter-budgets/:id/entries` | getEntries | matterBudget.route.js |
| `POST` | `/api/matter-budgets/:id/entries` | addEntry | matterBudget.route.js |
| `PATCH` | `/api/matter-budgets/:id/entries/:entryId` | updateEntry | matterBudget.route.js |
| `DELETE` | `/api/matter-budgets/:id/entries/:entryId` | deleteEntry | matterBudget.route.js |
| `POST` | `/api/matter-budgets/:id/phases` | addPhase | matterBudget.route.js |
| `PATCH` | `/api/matter-budgets/:id/phases/:phaseId` | updatePhase | matterBudget.route.js |
| `DELETE` | `/api/matter-budgets/:id/phases/:phaseId` | deletePhase | matterBudget.route.js |

## message

| Method | Path | Controller | File |
|--------|------|------------|------|
| `POST` | `/api/messages` | createMessage | message.route.js |
| `GET` | `/api/messages/stats` | getMessageStats | message.route.js |
| `GET` | `/api/messages/:conversationID` | getMessages | message.route.js |
| `PATCH` | `/api/messages/:conversationID/read` | markAsRead | message.route.js |

## metrics

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/metrics` | unknown | metrics.route.js |
| `GET` | `/api/metrics/json` | unknown | metrics.route.js |
| `GET` | `/api/metrics/performance` | unknown | metrics.route.js |
| `POST` | `/api/metrics/reset` | unknown | metrics.route.js |

## mfa

| Method | Path | Controller | File |
|--------|------|------------|------|
| `POST` | `/api/auth/mfa/setup` | setupMFA | mfa.route.js |
| `POST` | `/api/auth/mfa/verify-setup` | verifySetup | mfa.route.js |
| `POST` | `/api/auth/mfa/verify` | verifyMFA | mfa.route.js |
| `POST` | `/api/auth/mfa/disable` | disableMFA | mfa.route.js |
| `GET` | `/api/auth/mfa/status` | getMFAStatus | mfa.route.js |
| `POST` | `/api/auth/mfa/backup-codes/generate` | generateBackupCodes | mfa.route.js |
| `POST` | `/api/auth/mfa/backup-codes/verify` | verifyBackupCode | mfa.route.js |
| `POST` | `/api/auth/mfa/backup-codes/regenerate` | regenerateBackupCodes | mfa.route.js |
| `GET` | `/api/auth/mfa/backup-codes/count` | getBackupCodesCount | mfa.route.js |

## microsoftCalendar

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/microsoftCalendar/auth` | unknown | microsoftCalendar.route.js |
| `GET` | `/api/microsoftCalendar/callback` | unknown | microsoftCalendar.route.js |
| `POST` | `/api/microsoftCalendar/refresh-token` | unknown | microsoftCalendar.route.js |
| `POST` | `/api/microsoftCalendar/disconnect` | unknown | microsoftCalendar.route.js |
| `GET` | `/api/microsoftCalendar/status` | unknown | microsoftCalendar.route.js |
| `GET` | `/api/microsoftCalendar/calendars` | unknown | microsoftCalendar.route.js |
| `GET` | `/api/microsoftCalendar/events` | unknown | microsoftCalendar.route.js |
| `POST` | `/api/microsoftCalendar/events` | unknown | microsoftCalendar.route.js |
| `PUT` | `/api/microsoftCalendar/events/:eventId` | unknown | microsoftCalendar.route.js |
| `DELETE` | `/api/microsoftCalendar/events/:eventId` | unknown | microsoftCalendar.route.js |
| `POST` | `/api/microsoftCalendar/sync/from-microsoft` | unknown | microsoftCalendar.route.js |
| `POST` | `/api/microsoftCalendar/import` | unknown | microsoftCalendar.route.js |
| `POST` | `/api/microsoftCalendar/sync/to-microsoft/:eventId` | unknown | microsoftCalendar.route.js |
| `POST` | `/api/microsoftCalendar/export` | unknown | microsoftCalendar.route.js |
| `POST` | `/api/microsoftCalendar/sync/enable-auto-sync` | unknown | microsoftCalendar.route.js |
| `POST` | `/api/microsoftCalendar/sync/disable-auto-sync` | unknown | microsoftCalendar.route.js |
| `GET` | `/api/microsoftCalendar/sync/settings` | unknown | microsoftCalendar.route.js |

## mlScoring

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/ml/scores` | unknown | mlScoring.route.js |
| `GET` | `/api/ml/scores/:leadId` | unknown | mlScoring.route.js |
| `POST` | `/api/ml/scores/:leadId/calculate` | unknown | mlScoring.route.js |
| `POST` | `/api/ml/scores/batch` | unknown | mlScoring.route.js |
| `GET` | `/api/ml/scores/:leadId/explanation` | unknown | mlScoring.route.js |
| `GET` | `/api/ml/scores/:leadId/hybrid` | unknown | mlScoring.route.js |
| `POST` | `/api/ml/train` | unknown | mlScoring.route.js |
| `GET` | `/api/ml/model/metrics` | unknown | mlScoring.route.js |
| `POST` | `/api/ml/model/export` | unknown | mlScoring.route.js |
| `GET` | `/api/ml/priority-queue` | unknown | mlScoring.route.js |
| `GET` | `/api/ml/priority-queue/workload` | unknown | mlScoring.route.js |
| `POST` | `/api/ml/priority/:leadId/contact` | unknown | mlScoring.route.js |
| `PUT` | `/api/ml/priority/:leadId/assign` | unknown | mlScoring.route.js |
| `GET` | `/api/ml/sla/metrics` | unknown | mlScoring.route.js |
| `GET` | `/api/ml/sla/breaches` | unknown | mlScoring.route.js |
| `GET` | `/api/ml/analytics/dashboard` | unknown | mlScoring.route.js |
| `GET` | `/api/ml/analytics/feature-importance` | unknown | mlScoring.route.js |
| `GET` | `/api/ml/analytics/score-distribution` | unknown | mlScoring.route.js |

## notification

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/notifications` | getNotifications | notification.route.js |
| `GET` | `/api/notifications/unread-count` | getUnreadCount | notification.route.js |
| `PATCH` | `/api/notifications/mark-all-read` | markAllAsRead | notification.route.js |
| `PATCH` | `/api/notifications/mark-multiple-read` | markMultipleAsRead | notification.route.js |
| `DELETE` | `/api/notifications/bulk-delete` | bulkDeleteNotifications | notification.route.js |
| `DELETE` | `/api/notifications/clear-read` | clearReadNotifications | notification.route.js |
| `GET` | `/api/notifications/by-type/:type` | getNotificationsByType | notification.route.js |
| `POST` | `/api/notifications` | createNotificationEndpoint | notification.route.js |
| `GET` | `/api/notifications/:id` | getNotification | notification.route.js |
| `PATCH` | `/api/notifications/:id/read` | markAsRead | notification.route.js |
| `DELETE` | `/api/notifications/:id` | deleteNotification | notification.route.js |

## notificationPreference

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/notification-preferences/defaults` | getDefaults | notificationPreference.route.js |
| `GET` | `/api/notification-preferences/stats` | getStats | notificationPreference.route.js |
| `POST` | `/api/notification-preferences/reset` | resetToDefaults | notificationPreference.route.js |
| `GET` | `/api/notification-preferences/quiet-hours/status` | checkQuietHours | notificationPreference.route.js |
| `PUT` | `/api/notification-preferences/quiet-hours` | updateQuietHours | notificationPreference.route.js |
| `POST` | `/api/notification-preferences/test` | testPreferences | notificationPreference.route.js |
| `GET` | `/api/notification-preferences` | getPreferences | notificationPreference.route.js |
| `PUT` | `/api/notification-preferences` | updatePreferences | notificationPreference.route.js |
| `PUT` | `/api/notification-preferences/channels/:channel` | updateChannelSettings | notificationPreference.route.js |
| `PUT` | `/api/notification-preferences/categories/:category` | updateCategoryPreferences | notificationPreference.route.js |
| `POST` | `/api/notification-preferences/mute/:category` | muteCategory | notificationPreference.route.js |
| `POST` | `/api/notification-preferences/unmute/:category` | unmuteCategory | notificationPreference.route.js |

## notificationSettings

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/notification-settings` | unknown | notificationSettings.route.js |
| `PUT` | `/api/notification-settings` | unknown | notificationSettings.route.js |
| `PUT` | `/api/notification-settings/preferences/:type` | unknown | notificationSettings.route.js |
| `POST` | `/api/notification-settings/mute/:type` | unknown | notificationSettings.route.js |
| `POST` | `/api/notification-settings/unmute/:type` | unknown | notificationSettings.route.js |
| `POST` | `/api/notification-settings/reset` | unknown | notificationSettings.route.js |

## oauth

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/auth/sso/providers` | getEnabledProviders | oauth.route.js |
| `POST` | `/api/auth/sso/initiate` | initiateSSO | oauth.route.js |
| `POST` | `/api/auth/sso/callback` | callbackPost | oauth.route.js |
| `POST` | `/api/auth/sso/:provider/callback` | unknown | oauth.route.js |
| `GET` | `/api/auth/sso/:providerType/authorize` | authorize | oauth.route.js |
| `GET` | `/api/auth/sso/:providerType/callback` | callback | oauth.route.js |
| `POST` | `/api/auth/sso/link` | linkAccount | oauth.route.js |
| `DELETE` | `/api/auth/sso/unlink/:providerType` | unlinkAccount | oauth.route.js |
| `GET` | `/api/auth/sso/linked` | getLinkedAccounts | oauth.route.js |
| `POST` | `/api/auth/sso/detect` | detectProvider | oauth.route.js |
| `GET` | `/api/auth/sso/domain/:domain` | getDomainConfig | oauth.route.js |
| `POST` | `/api/auth/sso/domain/:domain/verify/generate` | generateVerificationToken | oauth.route.js |
| `POST` | `/api/auth/sso/domain/:domain/verify` | verifyDomain | oauth.route.js |
| `POST` | `/api/auth/sso/domain/:domain/verify/manual` | manualVerifyDomain | oauth.route.js |
| `POST` | `/api/auth/sso/domain/:domain/cache/invalidate` | invalidateDomainCache | oauth.route.js |

## offboarding

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/hr/offboarding/stats` | unknown | offboarding.route.js |
| `GET` | `/api/hr/offboarding/pending-clearances` | unknown | offboarding.route.js |
| `GET` | `/api/hr/offboarding/pending-settlements` | unknown | offboarding.route.js |
| `POST` | `/api/hr/offboarding/bulk-delete` | unknown | offboarding.route.js |
| `GET` | `/api/hr/offboarding/by-employee/:employeeId` | unknown | offboarding.route.js |
| `GET` | `/api/hr/offboarding` | unknown | offboarding.route.js |
| `POST` | `/api/hr/offboarding` | unknown | offboarding.route.js |
| `GET` | `/api/hr/offboarding/:offboardingId` | unknown | offboarding.route.js |
| `PATCH` | `/api/hr/offboarding/:offboardingId` | unknown | offboarding.route.js |
| `DELETE` | `/api/hr/offboarding/:offboardingId` | unknown | offboarding.route.js |
| `PATCH` | `/api/hr/offboarding/:offboardingId/status` | unknown | offboarding.route.js |
| `POST` | `/api/hr/offboarding/:offboardingId/complete` | unknown | offboarding.route.js |
| `POST` | `/api/hr/offboarding/:offboardingId/exit-interview` | unknown | offboarding.route.js |
| `POST` | `/api/hr/offboarding/:offboardingId/clearance/items` | unknown | offboarding.route.js |
| `PATCH` | `/api/hr/offboarding/:offboardingId/clearance/items/:itemId` | unknown | offboarding.route.js |
| `POST` | `/api/hr/offboarding/:offboardingId/clearance/:section/complete` | unknown | offboarding.route.js |
| `POST` | `/api/hr/offboarding/:offboardingId/calculate-settlement` | unknown | offboarding.route.js |
| `POST` | `/api/hr/offboarding/:offboardingId/approve-settlement` | unknown | offboarding.route.js |
| `POST` | `/api/hr/offboarding/:offboardingId/process-payment` | unknown | offboarding.route.js |
| `POST` | `/api/hr/offboarding/:offboardingId/issue-experience-certificate` | unknown | offboarding.route.js |
| `PATCH` | `/api/hr/offboarding/:offboardingId/rehire-eligibility` | unknown | offboarding.route.js |

## offlineSyncs

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/offlineSyncs/manifest` | getSyncManifest | offlineSync.routes.js |
| `GET` | `/api/offlineSyncs/data` | getOfflineData | offlineSync.routes.js |
| `POST` | `/api/offlineSyncs/sync` | syncOfflineChanges | offlineSync.routes.js |
| `GET` | `/api/offlineSyncs/changes` | getChangesSinceLastSync | offlineSync.routes.js |
| `POST` | `/api/offlineSyncs/conflicts/resolve` | resolveConflicts | offlineSync.routes.js |
| `GET` | `/api/offlineSyncs/status` | getSyncStatus | offlineSync.routes.js |

## okr

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/hr/okrs/stats` | unknown | okr.route.js |
| `GET` | `/api/hr/okrs/tree` | unknown | okr.route.js |
| `GET` | `/api/hr/okrs` | unknown | okr.route.js |
| `GET` | `/api/hr/okrs/:id` | unknown | okr.route.js |
| `POST` | `/api/hr/okrs` | unknown | okr.route.js |
| `PATCH` | `/api/hr/okrs/:id` | unknown | okr.route.js |
| `POST` | `/api/hr/okrs/:id/activate` | unknown | okr.route.js |
| `PATCH` | `/api/hr/okrs/:id/key-results/:keyResultId` | unknown | okr.route.js |
| `POST` | `/api/hr/okrs/:id/check-in` | unknown | okr.route.js |
| `DELETE` | `/api/hr/okrs/:id` | unknown | okr.route.js |
| `GET` | `/api/hr/okrs/nine-box/distribution` | unknown | okr.route.js |
| `GET` | `/api/hr/okrs/nine-box/succession` | unknown | okr.route.js |
| `GET` | `/api/hr/okrs/nine-box/employee/:employeeId` | unknown | okr.route.js |
| `GET` | `/api/hr/okrs/nine-box` | unknown | okr.route.js |
| `POST` | `/api/hr/okrs/nine-box` | unknown | okr.route.js |

## onboarding

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/hr/onboarding/stats` | unknown | onboarding.route.js |
| `GET` | `/api/hr/onboarding/upcoming-reviews` | unknown | onboarding.route.js |
| `POST` | `/api/hr/onboarding/bulk-delete` | unknown | onboarding.route.js |
| `GET` | `/api/hr/onboarding/by-employee/:employeeId` | unknown | onboarding.route.js |
| `GET` | `/api/hr/onboarding` | unknown | onboarding.route.js |
| `POST` | `/api/hr/onboarding` | unknown | onboarding.route.js |
| `GET` | `/api/hr/onboarding/:onboardingId` | unknown | onboarding.route.js |
| `PATCH` | `/api/hr/onboarding/:onboardingId` | unknown | onboarding.route.js |
| `DELETE` | `/api/hr/onboarding/:onboardingId` | unknown | onboarding.route.js |
| `PATCH` | `/api/hr/onboarding/:onboardingId/status` | unknown | onboarding.route.js |
| `POST` | `/api/hr/onboarding/:onboardingId/complete` | unknown | onboarding.route.js |
| `POST` | `/api/hr/onboarding/:onboardingId/complete-first-day` | unknown | onboarding.route.js |
| `POST` | `/api/hr/onboarding/:onboardingId/complete-first-week` | unknown | onboarding.route.js |
| `POST` | `/api/hr/onboarding/:onboardingId/complete-first-month` | unknown | onboarding.route.js |
| `POST` | `/api/hr/onboarding/:onboardingId/tasks/:taskId/complete` | unknown | onboarding.route.js |
| `POST` | `/api/hr/onboarding/:onboardingId/probation-reviews` | unknown | onboarding.route.js |
| `POST` | `/api/hr/onboarding/:onboardingId/complete-probation` | unknown | onboarding.route.js |
| `POST` | `/api/hr/onboarding/:onboardingId/documents` | unknown | onboarding.route.js |
| `POST` | `/api/hr/onboarding/:onboardingId/documents/:type/verify` | unknown | onboarding.route.js |
| `POST` | `/api/hr/onboarding/:onboardingId/checklist/categories` | unknown | onboarding.route.js |
| `POST` | `/api/hr/onboarding/:onboardingId/checklist/categories/:categoryId/tasks` | unknown | onboarding.route.js |
| `POST` | `/api/hr/onboarding/:onboardingId/feedback` | unknown | onboarding.route.js |

## order

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/orders` | getOrders | order.route.js |
| `POST` | `/api/orders/create-payment-intent/:_id` | paymentIntent | order.route.js |
| `POST` | `/api/orders/create-proposal-payment-intent/:_id` | proposalPaymentIntent | order.route.js |
| `PATCH` | `/api/orders` | updatePaymentStatus | order.route.js |
| `POST` | `/api/orders/create-test-contract/:_id` | createTestContract | order.route.js |
| `POST` | `/api/orders/create-test-proposal-contract/:_id` | createTestProposalContract | order.route.js |

## organization

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/organizations/search` | searchOrganizations | organization.route.js |
| `GET` | `/api/organizations/client/:clientId` | getOrganizationsByClient | organization.route.js |
| `DELETE` | `/api/organizations/bulk` | bulkDeleteOrganizations | organization.route.js |
| `POST` | `/api/organizations/bulk-delete` | unknown | organization.route.js |
| `GET` | `/api/organizations` | getOrganizations | organization.route.js |
| `POST` | `/api/organizations` | createOrganization | organization.route.js |
| `GET` | `/api/organizations/:id` | getOrganization | organization.route.js |
| `PUT` | `/api/organizations/:id` | updateOrganization | organization.route.js |
| `PATCH` | `/api/organizations/:id` | unknown | organization.route.js |
| `DELETE` | `/api/organizations/:id` | deleteOrganization | organization.route.js |
| `POST` | `/api/organizations/:id/link-case` | linkToCase | organization.route.js |
| `POST` | `/api/organizations/:id/link-client` | linkToClient | organization.route.js |
| `POST` | `/api/organizations/:id/link-contact` | linkToContact | organization.route.js |

## organizationTemplate

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/templates/available` | unknown | organizationTemplate.route.js |
| `GET` | `/api/templates/default` | unknown | organizationTemplate.route.js |
| `GET` | `/api/templates/:id/preview` | unknown | organizationTemplate.route.js |
| `GET` | `/api/templates/admin/stats` | unknown | organizationTemplate.route.js |
| `GET` | `/api/templates/admin` | unknown | organizationTemplate.route.js |
| `POST` | `/api/templates/admin` | unknown | organizationTemplate.route.js |
| `GET` | `/api/templates/admin/:id` | unknown | organizationTemplate.route.js |
| `PUT` | `/api/templates/admin/:id` | unknown | organizationTemplate.route.js |
| `DELETE` | `/api/templates/admin/:id` | unknown | organizationTemplate.route.js |
| `POST` | `/api/templates/admin/:id/clone` | unknown | organizationTemplate.route.js |
| `POST` | `/api/templates/admin/:id/set-default` | unknown | organizationTemplate.route.js |
| `POST` | `/api/templates/admin/:id/apply/:firmId` | unknown | organizationTemplate.route.js |
| `GET` | `/api/templates/admin/:id/compare/:firmId` | unknown | organizationTemplate.route.js |

## organizationalUnit

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/hr/organizational-structure/stats` | unknown | organizationalUnit.route.js |
| `GET` | `/api/hr/organizational-structure/tree` | unknown | organizationalUnit.route.js |
| `GET` | `/api/hr/organizational-structure/export` | unknown | organizationalUnit.route.js |
| `GET` | `/api/hr/organizational-structure` | unknown | organizationalUnit.route.js |
| `POST` | `/api/hr/organizational-structure` | unknown | organizationalUnit.route.js |
| `POST` | `/api/hr/organizational-structure/bulk-delete` | unknown | organizationalUnit.route.js |
| `GET` | `/api/hr/organizational-structure/:id` | unknown | organizationalUnit.route.js |
| `PATCH` | `/api/hr/organizational-structure/:id` | unknown | organizationalUnit.route.js |
| `DELETE` | `/api/hr/organizational-structure/:id` | unknown | organizationalUnit.route.js |
| `GET` | `/api/hr/organizational-structure/:id/children` | unknown | organizationalUnit.route.js |
| `GET` | `/api/hr/organizational-structure/:id/path` | unknown | organizationalUnit.route.js |
| `POST` | `/api/hr/organizational-structure/:id/move` | unknown | organizationalUnit.route.js |
| `POST` | `/api/hr/organizational-structure/:id/dissolve` | unknown | organizationalUnit.route.js |
| `POST` | `/api/hr/organizational-structure/:id/activate` | unknown | organizationalUnit.route.js |
| `POST` | `/api/hr/organizational-structure/:id/deactivate` | unknown | organizationalUnit.route.js |
| `PATCH` | `/api/hr/organizational-structure/:id/headcount` | unknown | organizationalUnit.route.js |
| `PATCH` | `/api/hr/organizational-structure/:id/budget` | unknown | organizationalUnit.route.js |
| `POST` | `/api/hr/organizational-structure/:id/kpis` | unknown | organizationalUnit.route.js |
| `PATCH` | `/api/hr/organizational-structure/:id/kpis/:kpiId` | unknown | organizationalUnit.route.js |
| `DELETE` | `/api/hr/organizational-structure/:id/kpis/:kpiId` | unknown | organizationalUnit.route.js |
| `POST` | `/api/hr/organizational-structure/:id/leadership` | unknown | organizationalUnit.route.js |
| `PATCH` | `/api/hr/organizational-structure/:id/leadership/:positionId` | unknown | organizationalUnit.route.js |
| `DELETE` | `/api/hr/organizational-structure/:id/leadership/:positionId` | unknown | organizationalUnit.route.js |
| `POST` | `/api/hr/organizational-structure/:id/documents` | unknown | organizationalUnit.route.js |

## payment

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/payments/new` | getNewPaymentDefaults | payment.route.js |
| `GET` | `/api/payments/stats` | getPaymentStats | payment.route.js |
| `GET` | `/api/payments/summary` | getPaymentsSummary | payment.route.js |
| `GET` | `/api/payments/unreconciled` | getUnreconciledPayments | payment.route.js |
| `GET` | `/api/payments/pending-checks` | getPendingChecks | payment.route.js |
| `DELETE` | `/api/payments/bulk` | bulkDeletePayments | payment.route.js |
| `POST` | `/api/payments` | createPayment | payment.route.js |
| `GET` | `/api/payments` | getPayments | payment.route.js |
| `GET` | `/api/payments/:id` | getPayment | payment.route.js |
| `PUT` | `/api/payments/:id` | updatePayment | payment.route.js |
| `DELETE` | `/api/payments/:id` | deletePayment | payment.route.js |
| `POST` | `/api/payments/:id/complete` | completePayment | payment.route.js |
| `POST` | `/api/payments/:id/fail` | failPayment | payment.route.js |
| `POST` | `/api/payments/:id/refund` | createRefund | payment.route.js |
| `POST` | `/api/payments/:id/reconcile` | reconcilePayment | payment.route.js |
| `PUT` | `/api/payments/:id/apply` | applyPaymentToInvoices | payment.route.js |
| `DELETE` | `/api/payments/:id/unapply/:invoiceId` | unapplyPaymentFromInvoice | payment.route.js |
| `PUT` | `/api/payments/:id/check-status` | updateCheckStatus | payment.route.js |
| `POST` | `/api/payments/:id/send-receipt` | sendReceipt | payment.route.js |
| `POST` | `/api/payments/:id/receipt` | sendReceipt | payment.route.js |

## paymentReceipt

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/payment-receipts` | getPaymentReceipts | paymentReceipt.route.js |
| `GET` | `/api/payment-receipts/stats` | getReceiptStats | paymentReceipt.route.js |
| `GET` | `/api/payment-receipts/:id` | getPaymentReceipt | paymentReceipt.route.js |
| `POST` | `/api/payment-receipts` | createPaymentReceipt | paymentReceipt.route.js |
| `POST` | `/api/payment-receipts/:id/void` | voidPaymentReceipt | paymentReceipt.route.js |
| `GET` | `/api/payment-receipts/:id/download` | downloadReceipt | paymentReceipt.route.js |
| `POST` | `/api/payment-receipts/:id/email` | emailReceipt | paymentReceipt.route.js |

## paymentTerms

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/payment-terms` | getPaymentTerms | paymentTerms.route.js |
| `GET` | `/api/payment-terms/default` | getDefaultTerm | paymentTerms.route.js |
| `POST` | `/api/payment-terms/initialize` | initializeTemplates | paymentTerms.route.js |
| `GET` | `/api/payment-terms/:id` | getPaymentTerm | paymentTerms.route.js |
| `POST` | `/api/payment-terms/:id/calculate-due-date` | calculateDueDate | paymentTerms.route.js |
| `POST` | `/api/payment-terms/:id/calculate-installments` | calculateInstallments | paymentTerms.route.js |
| `POST` | `/api/payment-terms` | createPaymentTerm | paymentTerms.route.js |
| `PUT` | `/api/payment-terms/:id` | updatePaymentTerm | paymentTerms.route.js |
| `POST` | `/api/payment-terms/:id/set-default` | setAsDefault | paymentTerms.route.js |
| `DELETE` | `/api/payment-terms/:id` | deletePaymentTerm | paymentTerms.route.js |

## paymentTermsSettings

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/settings/payment-terms` | unknown | paymentTermsSettings.route.js |
| `GET` | `/api/settings/payment-terms/templates` | unknown | paymentTermsSettings.route.js |
| `GET` | `/api/settings/payment-terms/:id` | unknown | paymentTermsSettings.route.js |
| `POST` | `/api/settings/payment-terms` | unknown | paymentTermsSettings.route.js |
| `PUT` | `/api/settings/payment-terms/:id` | unknown | paymentTermsSettings.route.js |
| `DELETE` | `/api/settings/payment-terms/:id` | unknown | paymentTermsSettings.route.js |
| `POST` | `/api/settings/payment-terms/:id/set-default` | unknown | paymentTermsSettings.route.js |

## payout

| Method | Path | Controller | File |
|--------|------|------------|------|
| `POST` | `/api/payout/stripe/connect` | startConnectOnboarding | payout.route.js |
| `GET` | `/api/payout/stripe/callback` | handleStripeCallback | payout.route.js |
| `GET` | `/api/payout/stripe/dashboard` | getStripeDashboard | payout.route.js |
| `GET` | `/api/payout/stripe/account` | getConnectAccountStatus | payout.route.js |
| `GET` | `/api/payout/payouts/stats` | getPayoutStats | payout.route.js |
| `POST` | `/api/payout/payouts/request` | requestPayout | payout.route.js |
| `GET` | `/api/payout/payouts` | getPayoutHistory | payout.route.js |
| `GET` | `/api/payout/payouts/:id` | getPayoutDetails | payout.route.js |
| `POST` | `/api/payout/payouts/:id/cancel` | cancelPayout | payout.route.js |
| `POST` | `/api/payout/payouts/:id/retry` | retryPayout | payout.route.js |

## payroll

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/hr/payroll/stats` | getPayrollStats | payroll.route.js |
| `POST` | `/api/hr/payroll/generate` | generateBulkPayroll | payroll.route.js |
| `POST` | `/api/hr/payroll/approve` | bulkApprove | payroll.route.js |
| `POST` | `/api/hr/payroll/pay` | bulkPay | payroll.route.js |
| `POST` | `/api/hr/payroll/bulk-delete` | bulkDeleteSalarySlips | payroll.route.js |
| `POST` | `/api/hr/payroll/wps/submit` | submitToWPS | payroll.route.js |
| `POST` | `/api/hr/payroll/:id/approve` | approveSalarySlip | payroll.route.js |
| `POST` | `/api/hr/payroll/:id/pay` | paySalarySlip | payroll.route.js |
| `GET` | `/api/hr/payroll` | getSalarySlips | payroll.route.js |
| `POST` | `/api/hr/payroll` | createSalarySlip | payroll.route.js |
| `GET` | `/api/hr/payroll/:id` | getSalarySlip | payroll.route.js |
| `PUT` | `/api/hr/payroll/:id` | updateSalarySlip | payroll.route.js |
| `DELETE` | `/api/hr/payroll/:id` | deleteSalarySlip | payroll.route.js |

## payrollRun

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/payroll-runs/stats` | getPayrollRunStats | payrollRun.route.js |
| `POST` | `/api/payroll-runs/bulk-delete` | bulkDeletePayrollRuns | payrollRun.route.js |
| `GET` | `/api/payroll-runs` | getPayrollRuns | payrollRun.route.js |
| `POST` | `/api/payroll-runs` | createPayrollRun | payrollRun.route.js |
| `GET` | `/api/payroll-runs/:id` | getPayrollRun | payrollRun.route.js |
| `PATCH` | `/api/payroll-runs/:id` | updatePayrollRun | payrollRun.route.js |
| `DELETE` | `/api/payroll-runs/:id` | deletePayrollRun | payrollRun.route.js |
| `POST` | `/api/payroll-runs/:id/calculate` | calculatePayroll | payrollRun.route.js |
| `POST` | `/api/payroll-runs/:id/validate` | validatePayroll | payrollRun.route.js |
| `POST` | `/api/payroll-runs/:id/approve` | approvePayroll | payrollRun.route.js |
| `POST` | `/api/payroll-runs/:id/process-payments` | processPayments | payrollRun.route.js |
| `POST` | `/api/payroll-runs/:id/cancel` | cancelPayroll | payrollRun.route.js |
| `POST` | `/api/payroll-runs/:id/generate-wps` | generateWPS | payrollRun.route.js |
| `POST` | `/api/payroll-runs/:id/send-notifications` | sendNotifications | payrollRun.route.js |
| `GET` | `/api/payroll-runs/:id/export` | exportPayrollReport | payrollRun.route.js |
| `POST` | `/api/payroll-runs/:id/employees/:empId/hold` | holdEmployee | payrollRun.route.js |
| `POST` | `/api/payroll-runs/:id/employees/:empId/unhold` | unholdEmployee | payrollRun.route.js |
| `POST` | `/api/payroll-runs/:id/employees/:empId/exclude` | excludeEmployee | payrollRun.route.js |
| `POST` | `/api/payroll-runs/:id/employees/:empId/include` | includeEmployee | payrollRun.route.js |
| `POST` | `/api/payroll-runs/:id/employees/:empId/recalculate` | recalculateSingleEmployee | payrollRun.route.js |

## pdfme

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/pdfme/templates` | unknown | pdfme.route.js |
| `GET` | `/api/pdfme/templates/default/:category` | unknown | pdfme.route.js |
| `GET` | `/api/pdfme/templates/:id` | unknown | pdfme.route.js |
| `POST` | `/api/pdfme/templates` | unknown | pdfme.route.js |
| `PUT` | `/api/pdfme/templates/:id` | unknown | pdfme.route.js |
| `DELETE` | `/api/pdfme/templates/:id` | unknown | pdfme.route.js |
| `POST` | `/api/pdfme/templates/:id/clone` | unknown | pdfme.route.js |
| `POST` | `/api/pdfme/templates/:id/set-default` | unknown | pdfme.route.js |
| `POST` | `/api/pdfme/templates/:id/preview` | unknown | pdfme.route.js |
| `POST` | `/api/pdfme/generate` | unknown | pdfme.route.js |
| `POST` | `/api/pdfme/generate/async` | unknown | pdfme.route.js |
| `POST` | `/api/pdfme/generate/invoice` | unknown | pdfme.route.js |
| `POST` | `/api/pdfme/generate/contract` | unknown | pdfme.route.js |
| `POST` | `/api/pdfme/generate/receipt` | unknown | pdfme.route.js |
| `GET` | `/api/pdfme/download/:fileName` | unknown | pdfme.route.js |

## peerReview

| Method | Path | Controller | File |
|--------|------|------------|------|
| `POST` | `/api/peerReview` | createPeerReview | peerReview.route.js |
| `GET` | `/api/peerReview/:lawyerId` | getPeerReviews | peerReview.route.js |
| `PATCH` | `/api/peerReview/verify/:_id` | verifyPeerReview | peerReview.route.js |

## performanceReview

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/hr/performance-reviews/stats` | unknown | performanceReview.route.js |
| `GET` | `/api/hr/performance-reviews/overdue` | unknown | performanceReview.route.js |
| `GET` | `/api/hr/performance-reviews/templates` | unknown | performanceReview.route.js |
| `POST` | `/api/hr/performance-reviews/templates` | unknown | performanceReview.route.js |
| `PATCH` | `/api/hr/performance-reviews/templates/:id` | unknown | performanceReview.route.js |
| `GET` | `/api/hr/performance-reviews/calibration-sessions` | unknown | performanceReview.route.js |
| `POST` | `/api/hr/performance-reviews/calibration-sessions` | unknown | performanceReview.route.js |
| `POST` | `/api/hr/performance-reviews/calibration-sessions/:id/complete` | unknown | performanceReview.route.js |
| `POST` | `/api/hr/performance-reviews/bulk-create` | unknown | performanceReview.route.js |
| `POST` | `/api/hr/performance-reviews/bulk-delete` | unknown | performanceReview.route.js |
| `GET` | `/api/hr/performance-reviews/employee/:employeeId/history` | unknown | performanceReview.route.js |
| `GET` | `/api/hr/performance-reviews/team/:managerId/summary` | unknown | performanceReview.route.js |
| `GET` | `/api/hr/performance-reviews` | unknown | performanceReview.route.js |
| `POST` | `/api/hr/performance-reviews` | unknown | performanceReview.route.js |
| `GET` | `/api/hr/performance-reviews/:id` | unknown | performanceReview.route.js |
| `PATCH` | `/api/hr/performance-reviews/:id` | unknown | performanceReview.route.js |
| `DELETE` | `/api/hr/performance-reviews/:id` | unknown | performanceReview.route.js |
| `POST` | `/api/hr/performance-reviews/:id/self-assessment` | unknown | performanceReview.route.js |
| `POST` | `/api/hr/performance-reviews/:id/manager-assessment` | unknown | performanceReview.route.js |
| `POST` | `/api/hr/performance-reviews/:id/360-feedback/request` | unknown | performanceReview.route.js |
| `POST` | `/api/hr/performance-reviews/:id/360-feedback/:providerId` | unknown | performanceReview.route.js |
| `POST` | `/api/hr/performance-reviews/:id/development-plan` | unknown | performanceReview.route.js |
| `PATCH` | `/api/hr/performance-reviews/:id/development-plan/:itemId` | unknown | performanceReview.route.js |
| `POST` | `/api/hr/performance-reviews/:id/calibration` | unknown | performanceReview.route.js |
| `POST` | `/api/hr/performance-reviews/:id/calibration/apply` | unknown | performanceReview.route.js |
| `POST` | `/api/hr/performance-reviews/:id/complete` | unknown | performanceReview.route.js |
| `POST` | `/api/hr/performance-reviews/:id/acknowledge` | unknown | performanceReview.route.js |
| `POST` | `/api/hr/performance-reviews/:id/reminder` | unknown | performanceReview.route.js |

## permission

| Method | Path | Controller | File |
|--------|------|------------|------|
| `POST` | `/api/permissions/check` | checkPermission | permission.route.js |
| `POST` | `/api/permissions/check-batch` | checkPermissionBatch | permission.route.js |
| `GET` | `/api/permissions/my-permissions` | getMyPermissions | permission.route.js |
| `GET` | `/api/permissions/expand/:namespace/:resourceId/:relation` | expandPermissions | permission.route.js |
| `GET` | `/api/permissions/user-resources/:userId` | getUserResources | permission.route.js |
| `GET` | `/api/permissions/config` | getPermissionConfig | permission.route.js |
| `PUT` | `/api/permissions/config` | updatePermissionConfig | permission.route.js |
| `POST` | `/api/permissions/policies` | addPolicy | permission.route.js |
| `PUT` | `/api/permissions/policies/:policyId` | updatePolicy | permission.route.js |
| `DELETE` | `/api/permissions/policies/:policyId` | deletePolicy | permission.route.js |
| `GET` | `/api/permissions/relations/stats` | getRelationStats | permission.route.js |
| `POST` | `/api/permissions/relations` | grantRelation | permission.route.js |
| `DELETE` | `/api/permissions/relations` | revokeRelation | permission.route.js |
| `GET` | `/api/permissions/relations/:namespace/:object` | getResourceRelations | permission.route.js |
| `GET` | `/api/permissions/decisions` | getDecisionLogs | permission.route.js |
| `GET` | `/api/permissions/decisions/stats` | getDecisionStats | permission.route.js |
| `GET` | `/api/permissions/decisions/denied` | getDeniedAttempts | permission.route.js |
| `GET` | `/api/permissions/decisions/compliance-report` | getComplianceReport | permission.route.js |
| `GET` | `/api/permissions/cache/stats` | getCacheStats | permission.route.js |
| `POST` | `/api/permissions/cache/clear` | clearCache | permission.route.js |
| `GET` | `/api/permissions/ui/sidebar` | getVisibleSidebar | permission.route.js |
| `GET` | `/api/permissions/ui/sidebar/all` | getAllSidebarItems | permission.route.js |
| `PUT` | `/api/permissions/ui/sidebar/:itemId/visibility` | updateSidebarVisibility | permission.route.js |
| `POST` | `/api/permissions/ui/check-page` | checkPageAccess | permission.route.js |
| `GET` | `/api/permissions/ui/pages/all` | getAllPageAccess | permission.route.js |
| `PUT` | `/api/permissions/ui/pages/:pageId/access` | updatePageAccessForRole | permission.route.js |
| `GET` | `/api/permissions/ui/config` | getUIAccessConfig | permission.route.js |
| `PUT` | `/api/permissions/ui/config` | updateUIAccessConfig | permission.route.js |
| `GET` | `/api/permissions/ui/matrix` | getAccessMatrix | permission.route.js |
| `PUT` | `/api/permissions/ui/roles/:role/bulk` | bulkUpdateRoleAccess | permission.route.js |
| `POST` | `/api/permissions/ui/overrides` | addUserOverride | permission.route.js |
| `DELETE` | `/api/permissions/ui/overrides/:userId` | removeUserOverride | permission.route.js |

## plan

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/plans` | unknown | plan.route.js |
| `GET` | `/api/plans/features` | unknown | plan.route.js |
| `GET` | `/api/plans/current` | unknown | plan.route.js |
| `GET` | `/api/plans/usage` | unknown | plan.route.js |
| `GET` | `/api/plans/limits` | unknown | plan.route.js |
| `POST` | `/api/plans/start-trial` | unknown | plan.route.js |
| `POST` | `/api/plans/upgrade` | unknown | plan.route.js |
| `POST` | `/api/plans/cancel` | unknown | plan.route.js |

## playbook

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/playbook` | listPlaybooks | playbook.route.js |
| `POST` | `/api/playbook` | createPlaybook | playbook.route.js |
| `GET` | `/api/playbook/stats` | getPlaybookStats | playbook.route.js |
| `POST` | `/api/playbook/match` | matchPlaybook | playbook.route.js |
| `GET` | `/api/playbook/:id` | getPlaybook | playbook.route.js |
| `PUT` | `/api/playbook/:id` | updatePlaybook | playbook.route.js |
| `DELETE` | `/api/playbook/:id` | deletePlaybook | playbook.route.js |
| `POST` | `/api/playbook/execute` | startExecution | playbook.route.js |
| `GET` | `/api/playbook/executions/stats` | getExecutionStats | playbook.route.js |
| `GET` | `/api/playbook/executions/incident/:incidentId` | getExecutionHistory | playbook.route.js |
| `GET` | `/api/playbook/executions/:id` | getExecutionStatus | playbook.route.js |
| `POST` | `/api/playbook/executions/:id/advance` | advanceStep | playbook.route.js |
| `POST` | `/api/playbook/executions/:id/skip` | skipStep | playbook.route.js |
| `POST` | `/api/playbook/executions/:id/abort` | abortExecution | playbook.route.js |
| `POST` | `/api/playbook/executions/:id/retry/:stepIndex` | retryStep | playbook.route.js |

## plugins

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/plugins/search` | unknown | plugin.routes.js |
| `GET` | `/api/plugins/all` | unknown | plugin.routes.js |
| `GET` | `/api/plugins/loader/stats` | unknown | plugin.routes.js |
| `GET` | `/api/plugins/available` | unknown | plugin.routes.js |
| `GET` | `/api/plugins/installed` | unknown | plugin.routes.js |
| `POST` | `/api/plugins/register` | unknown | plugin.routes.js |
| `POST` | `/api/plugins/hooks/execute` | unknown | plugin.routes.js |
| `GET` | `/api/plugins/:id` | unknown | plugin.routes.js |
| `GET` | `/api/plugins/:id/stats` | unknown | plugin.routes.js |
| `POST` | `/api/plugins/:id/reload` | unknown | plugin.routes.js |
| `POST` | `/api/plugins/:id/install` | unknown | plugin.routes.js |
| `DELETE` | `/api/plugins/:id/uninstall` | unknown | plugin.routes.js |
| `GET` | `/api/plugins/installations/:installationId` | unknown | plugin.routes.js |
| `PATCH` | `/api/plugins/installations/:installationId/settings` | unknown | plugin.routes.js |
| `POST` | `/api/plugins/installations/:installationId/enable` | unknown | plugin.routes.js |
| `POST` | `/api/plugins/installations/:installationId/disable` | unknown | plugin.routes.js |

## preparedReport

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/preparedReport/stats` | getCacheStats | preparedReport.route.js |
| `POST` | `/api/preparedReport/request` | requestPreparedReport | preparedReport.route.js |
| `POST` | `/api/preparedReport/cleanup` | cleanupReports | preparedReport.route.js |
| `GET` | `/api/preparedReport` | getPreparedReports | preparedReport.route.js |
| `GET` | `/api/preparedReport/:id` | getPreparedReport | preparedReport.route.js |
| `DELETE` | `/api/preparedReport/:id` | deletePreparedReport | preparedReport.route.js |
| `POST` | `/api/preparedReport/:id/refresh` | refreshPreparedReport | preparedReport.route.js |

## priceLevel

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/price-levels` | getPriceLevels | priceLevel.route.js |
| `GET` | `/api/price-levels/client-rate` | getClientRate | priceLevel.route.js |
| `GET` | `/api/price-levels/:id` | getPriceLevel | priceLevel.route.js |
| `POST` | `/api/price-levels` | createPriceLevel | priceLevel.route.js |
| `PUT` | `/api/price-levels/:id` | updatePriceLevel | priceLevel.route.js |
| `DELETE` | `/api/price-levels/:id` | deletePriceLevel | priceLevel.route.js |
| `POST` | `/api/price-levels/:id/set-default` | setDefault | priceLevel.route.js |

## products

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/products/stats` | getStats | product.routes.js |
| `GET` | `/api/products/search` | searchProducts | product.routes.js |
| `GET` | `/api/products/category/:category` | getProductsByCategory | product.routes.js |
| `PUT` | `/api/products/bulk-prices` | bulkUpdatePrices | product.routes.js |
| `GET` | `/api/products` | getProducts | product.routes.js |
| `POST` | `/api/products` | createProduct | product.routes.js |
| `GET` | `/api/products/:id` | getProductById | product.routes.js |
| `PUT` | `/api/products/:id` | updateProduct | product.routes.js |
| `DELETE` | `/api/products/:id` | deleteProduct | product.routes.js |

## productsEnhanced

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/products/enhanced` | unknown | productsEnhanced.route.js |
| `GET` | `/api/products/enhanced/:productId` | unknown | productsEnhanced.route.js |
| `POST` | `/api/products/enhanced` | unknown | productsEnhanced.route.js |
| `PUT` | `/api/products/enhanced/:productId` | unknown | productsEnhanced.route.js |
| `DELETE` | `/api/products/enhanced/:productId` | unknown | productsEnhanced.route.js |
| `PATCH` | `/api/products/enhanced/:productId/cost-price` | unknown | productsEnhanced.route.js |
| `GET` | `/api/products/enhanced/:productId/margin` | unknown | productsEnhanced.route.js |
| `POST` | `/api/products/enhanced/bulk-update-prices` | unknown | productsEnhanced.route.js |
| `GET` | `/api/products/enhanced/:productId/variants` | unknown | productsEnhanced.route.js |
| `GET` | `/api/products/enhanced/:productId/variants/:variantId` | unknown | productsEnhanced.route.js |
| `POST` | `/api/products/enhanced/:productId/variants` | unknown | productsEnhanced.route.js |
| `PUT` | `/api/products/enhanced/:productId/variants/:variantId` | unknown | productsEnhanced.route.js |
| `DELETE` | `/api/products/enhanced/:productId/variants/:variantId` | unknown | productsEnhanced.route.js |
| `POST` | `/api/products/enhanced/:productId/variants/generate` | unknown | productsEnhanced.route.js |
| `GET` | `/api/products/enhanced/:productId/barcodes` | unknown | productsEnhanced.route.js |
| `POST` | `/api/products/enhanced/:productId/barcodes` | unknown | productsEnhanced.route.js |
| `DELETE` | `/api/products/enhanced/:productId/barcodes/:barcodeId` | unknown | productsEnhanced.route.js |
| `GET` | `/api/products/enhanced/lookup/barcode` | unknown | productsEnhanced.route.js |

## proposal

| Method | Path | Controller | File |
|--------|------|------------|------|
| `POST` | `/api/proposals` | createProposal | proposal.route.js |
| `GET` | `/api/proposals/job/:jobId` | getJobProposals | proposal.route.js |
| `GET` | `/api/proposals/my-proposals` | getMyProposals | proposal.route.js |
| `PATCH` | `/api/proposals/accept/:_id` | acceptProposal | proposal.route.js |
| `PATCH` | `/api/proposals/reject/:_id` | rejectProposal | proposal.route.js |
| `PATCH` | `/api/proposals/withdraw/:_id` | withdrawProposal | proposal.route.js |

## quality

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/quality/stats` | unknown | quality.route.js |
| `GET` | `/api/quality/settings` | unknown | quality.route.js |
| `PUT` | `/api/quality/settings` | unknown | quality.route.js |
| `GET` | `/api/quality/inspections` | unknown | quality.route.js |
| `POST` | `/api/quality/inspections` | unknown | quality.route.js |
| `GET` | `/api/quality/inspections/:id` | unknown | quality.route.js |
| `PUT` | `/api/quality/inspections/:id` | unknown | quality.route.js |
| `POST` | `/api/quality/inspections/:id/submit` | unknown | quality.route.js |
| `DELETE` | `/api/quality/inspections/:id` | unknown | quality.route.js |
| `GET` | `/api/quality/templates` | unknown | quality.route.js |
| `POST` | `/api/quality/templates` | unknown | quality.route.js |
| `GET` | `/api/quality/templates/:id` | unknown | quality.route.js |
| `PUT` | `/api/quality/templates/:id` | unknown | quality.route.js |
| `DELETE` | `/api/quality/templates/:id` | unknown | quality.route.js |
| `GET` | `/api/quality/actions` | unknown | quality.route.js |
| `POST` | `/api/quality/actions` | unknown | quality.route.js |
| `GET` | `/api/quality/actions/:id` | unknown | quality.route.js |
| `PUT` | `/api/quality/actions/:id` | unknown | quality.route.js |
| `DELETE` | `/api/quality/actions/:id` | unknown | quality.route.js |

## question

| Method | Path | Controller | File |
|--------|------|------------|------|
| `POST` | `/api/questions` | createQuestion | question.route.js |
| `GET` | `/api/questions` | getQuestions | question.route.js |
| `GET` | `/api/questions/:_id` | getQuestion | question.route.js |
| `PATCH` | `/api/questions/:_id` | updateQuestion | question.route.js |
| `DELETE` | `/api/questions/:_id` | deleteQuestion | question.route.js |

## queue

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/queues` | unknown | queue.route.js |
| `GET` | `/api/queues/:name` | unknown | queue.route.js |
| `GET` | `/api/queues/:name/jobs` | unknown | queue.route.js |
| `GET` | `/api/queues/:name/jobs/:jobId` | unknown | queue.route.js |
| `GET` | `/api/queues/:name/counts` | unknown | queue.route.js |
| `POST` | `/api/queues/:name/retry/:jobId` | unknown | queue.route.js |
| `DELETE` | `/api/queues/:name/jobs/:jobId` | unknown | queue.route.js |
| `POST` | `/api/queues/:name/pause` | unknown | queue.route.js |
| `POST` | `/api/queues/:name/resume` | unknown | queue.route.js |
| `POST` | `/api/queues/:name/clean` | unknown | queue.route.js |
| `POST` | `/api/queues/:name/empty` | unknown | queue.route.js |
| `POST` | `/api/queues/:name/jobs` | unknown | queue.route.js |
| `POST` | `/api/queues/:name/jobs/bulk` | unknown | queue.route.js |

## quotes

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/quotes` | unknown | quote.routes.js |
| `GET` | `/api/quotes/:id` | unknown | quote.routes.js |
| `POST` | `/api/quotes` | unknown | quote.routes.js |
| `PUT` | `/api/quotes/:id` | unknown | quote.routes.js |
| `DELETE` | `/api/quotes/:id` | unknown | quote.routes.js |
| `POST` | `/api/quotes/:id/send` | unknown | quote.routes.js |
| `POST` | `/api/quotes/:id/accept` | unknown | quote.routes.js |
| `POST` | `/api/quotes/:id/reject` | unknown | quote.routes.js |
| `GET` | `/api/quotes/:id/pdf` | unknown | quote.routes.js |
| `POST` | `/api/quotes/:id/duplicate` | unknown | quote.routes.js |
| `POST` | `/api/quotes/:id/revise` | unknown | quote.routes.js |
| `POST` | `/api/quotes/:id/view` | unknown | quote.routes.js |
| `POST` | `/api/quotes/:id/items` | unknown | quote.routes.js |
| `PUT` | `/api/quotes/:id/items/:itemId` | unknown | quote.routes.js |
| `DELETE` | `/api/quotes/:id/items/:itemId` | unknown | quote.routes.js |

## rateCard

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/rate-cards/client/:clientId` | getRateCardForClient | rateCard.route.js |
| `GET` | `/api/rate-cards/case/:caseId` | getRateCardForCase | rateCard.route.js |
| `POST` | `/api/rate-cards/calculate` | calculateRate | rateCard.route.js |
| `GET` | `/api/rate-cards` | getRateCards | rateCard.route.js |
| `POST` | `/api/rate-cards` | createRateCard | rateCard.route.js |
| `GET` | `/api/rate-cards/:id` | getRateCard | rateCard.route.js |
| `PATCH` | `/api/rate-cards/:id` | updateRateCard | rateCard.route.js |
| `DELETE` | `/api/rate-cards/:id` | deleteRateCard | rateCard.route.js |
| `POST` | `/api/rate-cards/:id/rates` | addCustomRate | rateCard.route.js |
| `PATCH` | `/api/rate-cards/:id/rates/:rateId` | updateCustomRate | rateCard.route.js |
| `DELETE` | `/api/rate-cards/:id/rates/:rateId` | removeCustomRate | rateCard.route.js |

## rateGroup

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/billing/groups/default` | getDefaultRateGroup | rateGroup.route.js |
| `GET` | `/api/billing/groups` | getRateGroups | rateGroup.route.js |
| `POST` | `/api/billing/groups` | createRateGroup | rateGroup.route.js |
| `GET` | `/api/billing/groups/:id` | getRateGroup | rateGroup.route.js |
| `PATCH` | `/api/billing/groups/:id` | updateRateGroup | rateGroup.route.js |
| `DELETE` | `/api/billing/groups/:id` | deleteRateGroup | rateGroup.route.js |
| `POST` | `/api/billing/groups/:id/rates` | addRateToGroup | rateGroup.route.js |
| `DELETE` | `/api/billing/groups/:id/rates/:rateId` | removeRateFromGroup | rateGroup.route.js |
| `POST` | `/api/billing/groups/:id/duplicate` | duplicateRateGroup | rateGroup.route.js |

## rateLimit

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/rate-limits/config` | getConfig | rateLimit.route.js |
| `GET` | `/api/rate-limits/overview` | getOverview | rateLimit.route.js |
| `GET` | `/api/rate-limits/tiers/:tier` | getTierConfig | rateLimit.route.js |
| `GET` | `/api/rate-limits/effective` | getEffectiveLimitEndpoint | rateLimit.route.js |
| `GET` | `/api/rate-limits/users/:userId` | getUserLimits | rateLimit.route.js |
| `GET` | `/api/rate-limits/users/:userId/stats` | getUserStats | rateLimit.route.js |
| `POST` | `/api/rate-limits/users/:userId/reset` | resetUserLimit | rateLimit.route.js |
| `POST` | `/api/rate-limits/users/:userId/adjust` | adjustUserLimit | rateLimit.route.js |
| `GET` | `/api/rate-limits/firms/:firmId` | getFirmLimits | rateLimit.route.js |
| `GET` | `/api/rate-limits/firms/:firmId/top-users` | getTopUsersForFirm | rateLimit.route.js |
| `GET` | `/api/rate-limits/firms/:firmId/throttled` | getThrottledRequestsForFirm | rateLimit.route.js |
| `POST` | `/api/rate-limits/firms/:firmId/reset` | resetFirmLimit | rateLimit.route.js |

## recruitment

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/hr/recruitment/stats` | unknown | recruitment.route.js |
| `GET` | `/api/hr/recruitment/talent-pool` | unknown | recruitment.route.js |
| `GET` | `/api/hr/recruitment/jobs/nearing-deadline` | unknown | recruitment.route.js |
| `GET` | `/api/hr/recruitment/jobs/stats` | unknown | recruitment.route.js |
| `GET` | `/api/hr/recruitment/jobs` | unknown | recruitment.route.js |
| `POST` | `/api/hr/recruitment/jobs` | unknown | recruitment.route.js |
| `GET` | `/api/hr/recruitment/jobs/:id` | unknown | recruitment.route.js |
| `PATCH` | `/api/hr/recruitment/jobs/:id` | unknown | recruitment.route.js |
| `DELETE` | `/api/hr/recruitment/jobs/:id` | unknown | recruitment.route.js |
| `POST` | `/api/hr/recruitment/jobs/:id/status` | unknown | recruitment.route.js |
| `POST` | `/api/hr/recruitment/jobs/:id/publish` | unknown | recruitment.route.js |
| `POST` | `/api/hr/recruitment/jobs/:id/clone` | unknown | recruitment.route.js |
| `GET` | `/api/hr/recruitment/jobs/:id/pipeline` | unknown | recruitment.route.js |
| `POST` | `/api/hr/recruitment/applicants/bulk-stage-update` | unknown | recruitment.route.js |
| `POST` | `/api/hr/recruitment/applicants/bulk-reject` | unknown | recruitment.route.js |
| `POST` | `/api/hr/recruitment/applicants/bulk-delete` | unknown | recruitment.route.js |
| `GET` | `/api/hr/recruitment/applicants/stats` | unknown | recruitment.route.js |
| `GET` | `/api/hr/recruitment/applicants` | unknown | recruitment.route.js |
| `POST` | `/api/hr/recruitment/applicants` | unknown | recruitment.route.js |
| `GET` | `/api/hr/recruitment/applicants/:id` | unknown | recruitment.route.js |
| `PATCH` | `/api/hr/recruitment/applicants/:id` | unknown | recruitment.route.js |
| `DELETE` | `/api/hr/recruitment/applicants/:id` | unknown | recruitment.route.js |
| `POST` | `/api/hr/recruitment/applicants/:id/stage` | unknown | recruitment.route.js |
| `POST` | `/api/hr/recruitment/applicants/:id/reject` | unknown | recruitment.route.js |
| `POST` | `/api/hr/recruitment/applicants/:id/hire` | unknown | recruitment.route.js |
| `PATCH` | `/api/hr/recruitment/applicants/:id/talent-pool` | unknown | recruitment.route.js |
| `POST` | `/api/hr/recruitment/applicants/:id/interviews` | unknown | recruitment.route.js |
| `PATCH` | `/api/hr/recruitment/applicants/:id/interviews/:interviewId` | unknown | recruitment.route.js |
| `POST` | `/api/hr/recruitment/applicants/:id/interviews/:interviewId/feedback` | unknown | recruitment.route.js |
| `POST` | `/api/hr/recruitment/applicants/:id/assessments` | unknown | recruitment.route.js |
| `PATCH` | `/api/hr/recruitment/applicants/:id/assessments/:assessmentId` | unknown | recruitment.route.js |
| `POST` | `/api/hr/recruitment/applicants/:id/offers` | unknown | recruitment.route.js |
| `PATCH` | `/api/hr/recruitment/applicants/:id/offers/:offerId` | unknown | recruitment.route.js |
| `POST` | `/api/hr/recruitment/applicants/:id/references` | unknown | recruitment.route.js |
| `PATCH` | `/api/hr/recruitment/applicants/:id/references/:referenceId` | unknown | recruitment.route.js |
| `POST` | `/api/hr/recruitment/applicants/:id/background-check` | unknown | recruitment.route.js |
| `PATCH` | `/api/hr/recruitment/applicants/:id/background-check` | unknown | recruitment.route.js |
| `POST` | `/api/hr/recruitment/applicants/:id/notes` | unknown | recruitment.route.js |
| `POST` | `/api/hr/recruitment/applicants/:id/communications` | unknown | recruitment.route.js |

## recurringInvoice

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/recurring-invoices` | getRecurringInvoices | recurringInvoice.route.js |
| `GET` | `/api/recurring-invoices/stats` | getStats | recurringInvoice.route.js |
| `GET` | `/api/recurring-invoices/:id` | getRecurringInvoice | recurringInvoice.route.js |
| `GET` | `/api/recurring-invoices/:id/history` | getGeneratedHistory | recurringInvoice.route.js |
| `GET` | `/api/recurring-invoices/:id/preview` | previewNextInvoice | recurringInvoice.route.js |
| `POST` | `/api/recurring-invoices` | createRecurringInvoice | recurringInvoice.route.js |
| `PUT` | `/api/recurring-invoices/:id` | updateRecurringInvoice | recurringInvoice.route.js |
| `POST` | `/api/recurring-invoices/:id/pause` | pauseRecurringInvoice | recurringInvoice.route.js |
| `POST` | `/api/recurring-invoices/:id/resume` | resumeRecurringInvoice | recurringInvoice.route.js |
| `POST` | `/api/recurring-invoices/:id/cancel` | cancelRecurringInvoice | recurringInvoice.route.js |
| `POST` | `/api/recurring-invoices/:id/generate` | generateNow | recurringInvoice.route.js |
| `POST` | `/api/recurring-invoices/:id/duplicate` | duplicateRecurringInvoice | recurringInvoice.route.js |
| `DELETE` | `/api/recurring-invoices/:id` | deleteRecurringInvoice | recurringInvoice.route.js |

## recurringTransaction

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/recurring-transactions` | getRecurringTransactions | recurringTransaction.route.js |
| `GET` | `/api/recurring-transactions/upcoming` | getUpcomingTransactions | recurringTransaction.route.js |
| `POST` | `/api/recurring-transactions/process-due` | processDueTransactions | recurringTransaction.route.js |
| `GET` | `/api/recurring-transactions/:id` | getRecurringTransaction | recurringTransaction.route.js |
| `POST` | `/api/recurring-transactions` | createRecurringTransaction | recurringTransaction.route.js |
| `PUT` | `/api/recurring-transactions/:id` | updateRecurringTransaction | recurringTransaction.route.js |
| `POST` | `/api/recurring-transactions/:id/pause` | pauseRecurringTransaction | recurringTransaction.route.js |
| `POST` | `/api/recurring-transactions/:id/resume` | resumeRecurringTransaction | recurringTransaction.route.js |
| `POST` | `/api/recurring-transactions/:id/cancel` | cancelRecurringTransaction | recurringTransaction.route.js |
| `POST` | `/api/recurring-transactions/:id/generate` | generateTransaction | recurringTransaction.route.js |

## referral

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/referrals/stats` | unknown | referral.route.js |
| `GET` | `/api/referrals/top` | unknown | referral.route.js |
| `POST` | `/api/referrals` | unknown | referral.route.js |
| `GET` | `/api/referrals` | unknown | referral.route.js |
| `GET` | `/api/referrals/:id` | unknown | referral.route.js |
| `PUT` | `/api/referrals/:id` | unknown | referral.route.js |
| `DELETE` | `/api/referrals/:id` | unknown | referral.route.js |
| `POST` | `/api/referrals/:id/leads` | unknown | referral.route.js |
| `POST` | `/api/referrals/:id/leads/:leadId/convert` | unknown | referral.route.js |
| `POST` | `/api/referrals/:id/payments` | unknown | referral.route.js |
| `GET` | `/api/referrals/:id/calculate-fee` | unknown | referral.route.js |

## refund

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/refund/eligibility/:paymentId` | unknown | refund.route.js |
| `POST` | `/api/refund/request` | unknown | refund.route.js |
| `GET` | `/api/refund/history` | unknown | refund.route.js |
| `GET` | `/api/refund/:id` | unknown | refund.route.js |
| `GET` | `/api/refund/admin/all` | unknown | refund.route.js |
| `GET` | `/api/refund/admin/pending` | unknown | refund.route.js |
| `GET` | `/api/refund/admin/statistics` | unknown | refund.route.js |
| `POST` | `/api/refund/admin/:id/approve` | unknown | refund.route.js |
| `POST` | `/api/refund/admin/:id/reject` | unknown | refund.route.js |
| `POST` | `/api/refund/admin/:id/execute` | unknown | refund.route.js |
| `POST` | `/api/refund/admin/:id/retry` | unknown | refund.route.js |

## regionalBanks

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/regional-banks/countries` | unknown | regionalBanks.route.js |
| `GET` | `/api/regional-banks/countries/:countryCode/banks` | unknown | regionalBanks.route.js |
| `GET` | `/api/regional-banks/find-by-iban` | unknown | regionalBanks.route.js |
| `GET` | `/api/regional-banks/stats` | unknown | regionalBanks.route.js |
| `POST` | `/api/regional-banks/connect` | unknown | regionalBanks.route.js |
| `GET` | `/api/regional-banks/callback` | unknown | regionalBanks.route.js |
| `POST` | `/api/regional-banks/sync/:accountId` | unknown | regionalBanks.route.js |
| `GET` | `/api/regional-banks/status/:accountId` | unknown | regionalBanks.route.js |
| `POST` | `/api/regional-banks/disconnect/:accountId` | unknown | regionalBanks.route.js |

## reminder

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/reminders/location/summary` | getLocationRemindersSummary | reminder.route.js |
| `GET` | `/api/reminders/location/locations` | getUserLocations | reminder.route.js |
| `POST` | `/api/reminders/location` | createLocationReminder | reminder.route.js |
| `POST` | `/api/reminders/location/check` | checkLocationTriggers | reminder.route.js |
| `POST` | `/api/reminders/location/nearby` | getNearbyReminders | reminder.route.js |
| `POST` | `/api/reminders/location/save` | saveUserLocation | reminder.route.js |
| `POST` | `/api/reminders/location/distance` | calculateDistance | reminder.route.js |
| `PUT` | `/api/reminders/location/locations/:locationId` | updateUserLocation | reminder.route.js |
| `DELETE` | `/api/reminders/location/locations/:locationId` | deleteUserLocation | reminder.route.js |
| `POST` | `/api/reminders/location/:reminderId/reset` | resetLocationTrigger | reminder.route.js |
| `GET` | `/api/reminders/stats` | getReminderStats | reminder.route.js |
| `GET` | `/api/reminders/upcoming` | getUpcomingReminders | reminder.route.js |
| `GET` | `/api/reminders/overdue` | getOverdueReminders | reminder.route.js |
| `GET` | `/api/reminders/snoozed-due` | getSnoozedDueReminders | reminder.route.js |
| `GET` | `/api/reminders/delegated` | getDelegatedReminders | reminder.route.js |
| `GET` | `/api/reminders/client/:clientId` | getRemindersByClient | reminder.route.js |
| `GET` | `/api/reminders/case/:caseId` | getRemindersByCase | reminder.route.js |
| `POST` | `/api/reminders/from-task/:taskId` | createReminderFromTask | reminder.route.js |
| `POST` | `/api/reminders/from-event/:eventId` | createReminderFromEvent | reminder.route.js |
| `POST` | `/api/reminders/parse` | createReminderFromNaturalLanguage | reminder.route.js |
| `POST` | `/api/reminders/voice` | createReminderFromVoice | reminder.route.js |
| `POST` | `/api/reminders/bulk` | bulkCreateReminders | reminder.route.js |
| `PUT` | `/api/reminders/bulk` | bulkUpdateReminders | reminder.route.js |
| `DELETE` | `/api/reminders/bulk` | bulkDeleteReminders | reminder.route.js |
| `POST` | `/api/reminders/bulk/complete` | bulkCompleteReminders | reminder.route.js |
| `POST` | `/api/reminders/bulk/archive` | bulkArchiveReminders | reminder.route.js |
| `POST` | `/api/reminders/bulk/unarchive` | bulkUnarchiveReminders | reminder.route.js |
| `GET` | `/api/reminders/export` | exportReminders | reminder.route.js |
| `GET` | `/api/reminders/ids` | getAllReminderIds | reminder.route.js |
| `GET` | `/api/reminders/archived` | getArchivedReminders | reminder.route.js |
| `PATCH` | `/api/reminders/reorder` | reorderReminders | reminder.route.js |
| `GET` | `/api/reminders/search` | searchReminders | reminder.route.js |
| `GET` | `/api/reminders/conflicts` | getReminderConflicts | reminder.route.js |
| `POST` | `/api/reminders` | createReminder | reminder.route.js |
| `GET` | `/api/reminders` | getReminders | reminder.route.js |
| `GET` | `/api/reminders/:id` | getReminder | reminder.route.js |
| `PUT` | `/api/reminders/:id` | updateReminder | reminder.route.js |
| `PATCH` | `/api/reminders/:id` | updateReminder | reminder.route.js |
| `DELETE` | `/api/reminders/:id` | deleteReminder | reminder.route.js |
| `POST` | `/api/reminders/:id/complete` | completeReminder | reminder.route.js |
| `POST` | `/api/reminders/:id/dismiss` | dismissReminder | reminder.route.js |
| `POST` | `/api/reminders/:id/snooze` | snoozeReminder | reminder.route.js |
| `POST` | `/api/reminders/:id/delegate` | delegateReminder | reminder.route.js |
| `POST` | `/api/reminders/:id/clone` | cloneReminder | reminder.route.js |
| `POST` | `/api/reminders/:id/reschedule` | rescheduleReminder | reminder.route.js |
| `GET` | `/api/reminders/:id/activity` | getReminderActivity | reminder.route.js |
| `POST` | `/api/reminders/:id/archive` | archiveReminder | reminder.route.js |
| `POST` | `/api/reminders/:id/unarchive` | unarchiveReminder | reminder.route.js |

## remindersExtended

| Method | Path | Controller | File |
|--------|------|------------|------|
| `POST` | `/api/reminders/:id/reopen` | unknown | remindersExtended.route.js |
| `POST` | `/api/reminders/:id/cancel-snooze` | unknown | remindersExtended.route.js |
| `POST` | `/api/reminders/:id/recurring/skip` | unknown | remindersExtended.route.js |
| `POST` | `/api/reminders/:id/recurring/stop` | unknown | remindersExtended.route.js |
| `POST` | `/api/reminders/:id/recurring/resume` | unknown | remindersExtended.route.js |
| `GET` | `/api/reminders/:id/occurrences` | unknown | remindersExtended.route.js |
| `POST` | `/api/reminders/:id/duplicate` | unknown | remindersExtended.route.js |
| `POST` | `/api/reminders/bulk-snooze` | unknown | remindersExtended.route.js |
| `POST` | `/api/reminders/bulk-complete` | unknown | remindersExtended.route.js |

## report

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/reports/profit-loss` | getProfitLossReport | report.route.js |
| `GET` | `/api/reports/balance-sheet` | getBalanceSheetReport | report.route.js |
| `GET` | `/api/reports/case-profitability` | getCaseProfitabilityReport | report.route.js |
| `GET` | `/api/reports/ar-aging` | getARAgingReport | report.route.js |
| `GET` | `/api/reports/trial-balance` | getTrialBalanceReport | report.route.js |
| `GET` | `/api/reports/budget-variance` | getBudgetVarianceReport | report.route.js |
| `GET` | `/api/reports/ap-aging` | getAPAgingReport | report.route.js |
| `GET` | `/api/reports/client-statement` | getClientStatement | report.route.js |
| `GET` | `/api/reports/vendor-ledger` | getVendorLedger | report.route.js |
| `GET` | `/api/reports/gross-profit` | getGrossProfitReport | report.route.js |
| `GET` | `/api/reports/cost-center` | getCostCenterReport | report.route.js |
| `GET` | `/api/reports/cases-chart` | getCasesChart | report.route.js |
| `GET` | `/api/reports/revenue-chart` | getRevenueChart | report.route.js |
| `GET` | `/api/reports/tasks-chart` | getTasksChart | report.route.js |
| `POST` | `/api/reports/export` | exportReport | report.route.js |
| `POST` | `/api/reports/generate` | createReport | report.route.js |
| `GET` | `/api/reports` | listReports | report.route.js |
| `GET` | `/api/reports/:id` | getReport | report.route.js |
| `DELETE` | `/api/reports/:id` | deleteReport | report.route.js |
| `POST` | `/api/reports/:id/execute` | executeReport | report.route.js |
| `PUT` | `/api/reports/:id/schedule` | updateSchedule | report.route.js |

## reports

| Method | Path | Controller | File |
|--------|------|------------|------|
| `POST` | `/api/reports/validate` | unknown | report.routes.js |
| `GET` | `/api/reports` | unknown | report.routes.js |
| `POST` | `/api/reports` | unknown | report.routes.js |
| `GET` | `/api/reports/:id` | unknown | report.routes.js |
| `PUT` | `/api/reports/:id` | unknown | report.routes.js |
| `DELETE` | `/api/reports/:id` | unknown | report.routes.js |
| `GET` | `/api/reports/:id/execute` | unknown | report.routes.js |
| `POST` | `/api/reports/:id/clone` | unknown | report.routes.js |
| `PUT` | `/api/reports/:id/schedule` | unknown | report.routes.js |
| `GET` | `/api/reports/:id/export/:format` | unknown | report.routes.js |

## retainer

| Method | Path | Controller | File |
|--------|------|------------|------|
| `POST` | `/api/retainers` | createRetainer | retainer.route.js |
| `GET` | `/api/retainers` | getRetainers | retainer.route.js |
| `GET` | `/api/retainers/stats` | getRetainerStats | retainer.route.js |
| `GET` | `/api/retainers/low-balance` | getLowBalanceRetainers | retainer.route.js |
| `GET` | `/api/retainers/:id` | getRetainer | retainer.route.js |
| `PUT` | `/api/retainers/:id` | updateRetainer | retainer.route.js |
| `POST` | `/api/retainers/:id/consume` | consumeRetainer | retainer.route.js |
| `POST` | `/api/retainers/:id/replenish` | replenishRetainer | retainer.route.js |
| `POST` | `/api/retainers/:id/refund` | refundRetainer | retainer.route.js |
| `GET` | `/api/retainers/:id/history` | getRetainerHistory | retainer.route.js |

## review

| Method | Path | Controller | File |
|--------|------|------------|------|
| `POST` | `/api/reviews` | createReview | review.route.js |
| `GET` | `/api/reviews/:gigID` | getReview | review.route.js |
| `DELETE` | `/api/reviews/:_id` | deleteReview | review.route.js |

## salesForecasts

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/salesForecasts/current-quarter` | unknown | salesForecast.routes.js |
| `GET` | `/api/salesForecasts/by-period` | unknown | salesForecast.routes.js |
| `POST` | `/api/salesForecasts` | unknown | salesForecast.routes.js |
| `GET` | `/api/salesForecasts` | unknown | salesForecast.routes.js |
| `GET` | `/api/salesForecasts/:id` | unknown | salesForecast.routes.js |
| `PUT` | `/api/salesForecasts/:id` | unknown | salesForecast.routes.js |
| `DELETE` | `/api/salesForecasts/:id` | unknown | salesForecast.routes.js |
| `POST` | `/api/salesForecasts/:id/submit` | unknown | salesForecast.routes.js |
| `POST` | `/api/salesForecasts/:id/approve` | unknown | salesForecast.routes.js |
| `POST` | `/api/salesForecasts/:id/lock` | unknown | salesForecast.routes.js |
| `POST` | `/api/salesForecasts/:id/adjustments` | unknown | salesForecast.routes.js |

## salesPerson

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/salesPerson` | unknown | salesPerson.route.js |
| `GET` | `/api/salesPerson/tree` | unknown | salesPerson.route.js |
| `GET` | `/api/salesPerson/:id` | unknown | salesPerson.route.js |
| `GET` | `/api/salesPerson/:id/stats` | unknown | salesPerson.route.js |
| `POST` | `/api/salesPerson` | unknown | salesPerson.route.js |
| `PUT` | `/api/salesPerson/:id` | unknown | salesPerson.route.js |
| `DELETE` | `/api/salesPerson/:id` | unknown | salesPerson.route.js |

## salesQuota

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/sales-quotas/leaderboard` | getLeaderboard | salesQuota.route.js |
| `GET` | `/api/sales-quotas/team-summary` | getTeamSummary | salesQuota.route.js |
| `GET` | `/api/sales-quotas/my-quota` | getMyQuota | salesQuota.route.js |
| `GET` | `/api/sales-quotas/period-comparison` | getPeriodComparison | salesQuota.route.js |
| `POST` | `/api/sales-quotas` | createQuota | salesQuota.route.js |
| `GET` | `/api/sales-quotas` | getQuotas | salesQuota.route.js |
| `GET` | `/api/sales-quotas/:id` | getQuota | salesQuota.route.js |
| `PUT` | `/api/sales-quotas/:id` | updateQuota | salesQuota.route.js |
| `PATCH` | `/api/sales-quotas/:id` | updateQuota | salesQuota.route.js |
| `DELETE` | `/api/sales-quotas/:id` | deleteQuota | salesQuota.route.js |
| `POST` | `/api/sales-quotas/:id/record-deal` | recordDeal | salesQuota.route.js |

## salesStage

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/salesStage` | unknown | salesStage.route.js |
| `GET` | `/api/salesStage/:id` | unknown | salesStage.route.js |
| `POST` | `/api/salesStage` | unknown | salesStage.route.js |
| `POST` | `/api/salesStage/defaults` | unknown | salesStage.route.js |
| `PUT` | `/api/salesStage/reorder` | unknown | salesStage.route.js |
| `PUT` | `/api/salesStage/:id` | unknown | salesStage.route.js |
| `DELETE` | `/api/salesStage/:id` | unknown | salesStage.route.js |

## salesTeams

| Method | Path | Controller | File |
|--------|------|------------|------|
| `POST` | `/api/salesTeams` | unknown | salesTeam.routes.js |
| `GET` | `/api/salesTeams` | unknown | salesTeam.routes.js |
| `GET` | `/api/salesTeams/:id` | unknown | salesTeam.routes.js |
| `PUT` | `/api/salesTeams/:id` | unknown | salesTeam.routes.js |
| `DELETE` | `/api/salesTeams/:id` | unknown | salesTeam.routes.js |
| `POST` | `/api/salesTeams/:id/members` | unknown | salesTeam.routes.js |
| `DELETE` | `/api/salesTeams/:id/members/:userId` | unknown | salesTeam.routes.js |
| `GET` | `/api/salesTeams/:id/stats` | unknown | salesTeam.routes.js |
| `GET` | `/api/salesTeams/:id/leaderboard` | unknown | salesTeam.routes.js |
| `POST` | `/api/salesTeams/:id/default` | unknown | salesTeam.routes.js |

## saless

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/saless/orders` | unknown | sales.routes.js |
| `GET` | `/api/saless/orders/statistics` | unknown | sales.routes.js |
| `GET` | `/api/saless/orders/by-salesperson` | unknown | sales.routes.js |
| `GET` | `/api/saless/orders/top-customers` | unknown | sales.routes.js |
| `GET` | `/api/saless/orders/:id` | unknown | sales.routes.js |
| `POST` | `/api/saless/orders/from-quote` | unknown | sales.routes.js |
| `POST` | `/api/saless/orders/from-lead` | unknown | sales.routes.js |
| `POST` | `/api/saless/orders` | unknown | sales.routes.js |
| `POST` | `/api/saless/orders/:id/confirm` | unknown | sales.routes.js |
| `POST` | `/api/saless/orders/:id/cancel` | unknown | sales.routes.js |
| `POST` | `/api/saless/orders/:id/complete` | unknown | sales.routes.js |
| `POST` | `/api/saless/orders/:id/items` | unknown | sales.routes.js |
| `PUT` | `/api/saless/orders/:id/items/:itemId` | unknown | sales.routes.js |
| `DELETE` | `/api/saless/orders/:id/items/:itemId` | unknown | sales.routes.js |
| `POST` | `/api/saless/orders/:id/apply-pricing` | unknown | sales.routes.js |
| `POST` | `/api/saless/orders/:id/discount` | unknown | sales.routes.js |
| `POST` | `/api/saless/orders/:id/delivery` | unknown | sales.routes.js |
| `POST` | `/api/saless/orders/:id/invoice` | unknown | sales.routes.js |
| `POST` | `/api/saless/orders/:id/payment` | unknown | sales.routes.js |
| `GET` | `/api/saless/deliveries` | unknown | sales.routes.js |
| `GET` | `/api/saless/deliveries/pending` | unknown | sales.routes.js |
| `GET` | `/api/saless/deliveries/in-transit` | unknown | sales.routes.js |
| `GET` | `/api/saless/deliveries/statistics` | unknown | sales.routes.js |
| `GET` | `/api/saless/deliveries/by-carrier` | unknown | sales.routes.js |
| `GET` | `/api/saless/deliveries/:id` | unknown | sales.routes.js |
| `GET` | `/api/saless/deliveries/:id/tracking` | unknown | sales.routes.js |
| `POST` | `/api/saless/deliveries` | unknown | sales.routes.js |
| `PUT` | `/api/saless/deliveries/:id` | unknown | sales.routes.js |
| `POST` | `/api/saless/deliveries/:id/start-picking` | unknown | sales.routes.js |
| `POST` | `/api/saless/deliveries/:id/complete-picking` | unknown | sales.routes.js |
| `POST` | `/api/saless/deliveries/:id/complete-packing` | unknown | sales.routes.js |
| `POST` | `/api/saless/deliveries/:id/ship` | unknown | sales.routes.js |
| `POST` | `/api/saless/deliveries/:id/tracking` | unknown | sales.routes.js |
| `POST` | `/api/saless/deliveries/:id/deliver` | unknown | sales.routes.js |
| `POST` | `/api/saless/deliveries/:id/failed-attempt` | unknown | sales.routes.js |
| `POST` | `/api/saless/deliveries/:id/cancel` | unknown | sales.routes.js |
| `POST` | `/api/saless/deliveries/:id/return-pickup` | unknown | sales.routes.js |
| `GET` | `/api/saless/returns` | unknown | sales.routes.js |
| `GET` | `/api/saless/returns/pending` | unknown | sales.routes.js |
| `GET` | `/api/saless/returns/requiring-inspection` | unknown | sales.routes.js |
| `GET` | `/api/saless/returns/statistics` | unknown | sales.routes.js |
| `GET` | `/api/saless/returns/rate` | unknown | sales.routes.js |
| `GET` | `/api/saless/returns/:id` | unknown | sales.routes.js |
| `POST` | `/api/saless/returns/from-order` | unknown | sales.routes.js |
| `POST` | `/api/saless/returns/from-delivery` | unknown | sales.routes.js |
| `POST` | `/api/saless/returns/:id/submit` | unknown | sales.routes.js |
| `POST` | `/api/saless/returns/:id/approve` | unknown | sales.routes.js |
| `POST` | `/api/saless/returns/:id/reject` | unknown | sales.routes.js |
| `POST` | `/api/saless/returns/:id/receive` | unknown | sales.routes.js |
| `POST` | `/api/saless/returns/:id/inspect` | unknown | sales.routes.js |
| `POST` | `/api/saless/returns/:id/process` | unknown | sales.routes.js |
| `POST` | `/api/saless/returns/:id/complete` | unknown | sales.routes.js |
| `POST` | `/api/saless/returns/:id/schedule-pickup` | unknown | sales.routes.js |
| `POST` | `/api/saless/returns/:id/return-label` | unknown | sales.routes.js |
| `GET` | `/api/saless/commissions/plans` | unknown | sales.routes.js |
| `GET` | `/api/saless/commissions/plans/:id` | unknown | sales.routes.js |
| `POST` | `/api/saless/commissions/plans` | unknown | sales.routes.js |
| `PUT` | `/api/saless/commissions/plans/:id` | unknown | sales.routes.js |
| `POST` | `/api/saless/commissions/plans/:id/assign` | unknown | sales.routes.js |
| `POST` | `/api/saless/commissions/calculate` | unknown | sales.routes.js |
| `POST` | `/api/saless/commissions/calculate-period` | unknown | sales.routes.js |
| `GET` | `/api/saless/commissions/settlements` | unknown | sales.routes.js |
| `GET` | `/api/saless/commissions/settlements/pending` | unknown | sales.routes.js |
| `GET` | `/api/saless/commissions/settlements/pending-payments` | unknown | sales.routes.js |
| `GET` | `/api/saless/commissions/settlements/:id` | unknown | sales.routes.js |
| `GET` | `/api/saless/commissions/settlements/:id/statement` | unknown | sales.routes.js |
| `POST` | `/api/saless/commissions/settlements` | unknown | sales.routes.js |
| `POST` | `/api/saless/commissions/settlements/:id/submit` | unknown | sales.routes.js |
| `POST` | `/api/saless/commissions/settlements/:id/approve` | unknown | sales.routes.js |
| `POST` | `/api/saless/commissions/settlements/:id/reject` | unknown | sales.routes.js |
| `POST` | `/api/saless/commissions/settlements/:id/schedule-payment` | unknown | sales.routes.js |
| `POST` | `/api/saless/commissions/settlements/:id/record-payment` | unknown | sales.routes.js |
| `POST` | `/api/saless/commissions/settlements/:id/clawback` | unknown | sales.routes.js |
| `GET` | `/api/saless/commissions/by-salesperson` | unknown | sales.routes.js |
| `GET` | `/api/saless/commissions/monthly-trend` | unknown | sales.routes.js |

## saml

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/auth/saml/metadata/:firmId` | getSPMetadata | saml.route.js |
| `GET` | `/api/auth/saml/login/:firmId` | initiateLogin | saml.route.js |
| `POST` | `/api/auth/saml/acs/:firmId` | assertionConsumerService | saml.route.js |
| `GET` | `/api/auth/saml/logout/:firmId` | initiateSingleLogout | saml.route.js |
| `POST` | `/api/auth/saml/sls/:firmId` | singleLogoutService | saml.route.js |
| `GET` | `/api/auth/saml/config` | getSAMLConfig | saml.route.js |
| `PUT` | `/api/auth/saml/config` | updateSAMLConfig | saml.route.js |
| `POST` | `/api/auth/saml/config/test` | testSAMLConfig | saml.route.js |

## sandboxs

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/sandboxs/templates` | getTemplates | sandbox.routes.js |
| `GET` | `/api/sandboxs/stats` | getSandboxStats | sandbox.routes.js |
| `POST` | `/api/sandboxs` | createSandbox | sandbox.routes.js |
| `GET` | `/api/sandboxs` | getSandbox | sandbox.routes.js |
| `POST` | `/api/sandboxs/:id/reset` | resetSandbox | sandbox.routes.js |
| `POST` | `/api/sandboxs/:id/extend` | extendSandbox | sandbox.routes.js |
| `POST` | `/api/sandboxs/:id/clone` | cloneSandboxToProduction | sandbox.routes.js |
| `GET` | `/api/sandboxs/:id/check-limit` | checkApiLimit | sandbox.routes.js |
| `DELETE` | `/api/sandboxs/:id` | deleteSandbox | sandbox.routes.js |

## saudiBanking

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/saudi-banking/lean/banks` | unknown | saudiBanking.route.js |
| `GET` | `/api/saudi-banking/lean/customers` | unknown | saudiBanking.route.js |
| `POST` | `/api/saudi-banking/lean/customers` | unknown | saudiBanking.route.js |
| `GET` | `/api/saudi-banking/lean/customers/:customerId/token` | unknown | saudiBanking.route.js |
| `GET` | `/api/saudi-banking/lean/customers/:customerId/entities` | unknown | saudiBanking.route.js |
| `GET` | `/api/saudi-banking/lean/entities/:entityId/accounts` | unknown | saudiBanking.route.js |
| `GET` | `/api/saudi-banking/lean/accounts/:accountId/balance` | unknown | saudiBanking.route.js |
| `GET` | `/api/saudi-banking/lean/accounts/:accountId/transactions` | unknown | saudiBanking.route.js |
| `GET` | `/api/saudi-banking/lean/entities/:entityId/identity` | unknown | saudiBanking.route.js |
| `POST` | `/api/saudi-banking/lean/payments` | unknown | saudiBanking.route.js |
| `DELETE` | `/api/saudi-banking/lean/entities/:entityId` | unknown | saudiBanking.route.js |
| `POST` | `/api/saudi-banking/lean/webhook` | unknown | saudiBanking.route.js |
| `POST` | `/api/saudi-banking/wps/generate` | unknown | saudiBanking.route.js |
| `POST` | `/api/saudi-banking/wps/download` | unknown | saudiBanking.route.js |
| `POST` | `/api/saudi-banking/wps/validate` | unknown | saudiBanking.route.js |
| `GET` | `/api/saudi-banking/wps/files` | unknown | saudiBanking.route.js |
| `GET` | `/api/saudi-banking/wps/sarie-banks` | unknown | saudiBanking.route.js |
| `GET` | `/api/saudi-banking/sadad/billers` | unknown | saudiBanking.route.js |
| `GET` | `/api/saudi-banking/sadad/billers/search` | unknown | saudiBanking.route.js |
| `POST` | `/api/saudi-banking/sadad/bills/inquiry` | unknown | saudiBanking.route.js |
| `POST` | `/api/saudi-banking/sadad/bills/pay` | unknown | saudiBanking.route.js |
| `GET` | `/api/saudi-banking/sadad/payments/:transactionId/status` | unknown | saudiBanking.route.js |
| `GET` | `/api/saudi-banking/sadad/payments/history` | unknown | saudiBanking.route.js |
| `POST` | `/api/saudi-banking/mudad/payroll/calculate` | unknown | saudiBanking.route.js |
| `POST` | `/api/saudi-banking/mudad/gosi/calculate` | unknown | saudiBanking.route.js |
| `POST` | `/api/saudi-banking/mudad/wps/generate` | unknown | saudiBanking.route.js |
| `POST` | `/api/saudi-banking/mudad/payroll/submit` | unknown | saudiBanking.route.js |
| `GET` | `/api/saudi-banking/mudad/submissions/:submissionId/status` | unknown | saudiBanking.route.js |
| `POST` | `/api/saudi-banking/mudad/gosi/report` | unknown | saudiBanking.route.js |
| `POST` | `/api/saudi-banking/mudad/compliance/nitaqat` | unknown | saudiBanking.route.js |
| `POST` | `/api/saudi-banking/mudad/compliance/minimum-wage` | unknown | saudiBanking.route.js |
| `GET` | `/api/saudi-banking/compliance/deadlines` | unknown | saudiBanking.route.js |

## savedFilters

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/savedFilters` | unknown | savedFilter.routes.js |
| `POST` | `/api/savedFilters` | unknown | savedFilter.routes.js |
| `GET` | `/api/savedFilters/popular/:entityType` | unknown | savedFilter.routes.js |
| `GET` | `/api/savedFilters/:id` | unknown | savedFilter.routes.js |
| `PUT` | `/api/savedFilters/:id` | unknown | savedFilter.routes.js |
| `PATCH` | `/api/savedFilters/:id` | unknown | savedFilter.routes.js |
| `DELETE` | `/api/savedFilters/:id` | unknown | savedFilter.routes.js |
| `POST` | `/api/savedFilters/:id/set-default` | unknown | savedFilter.routes.js |
| `POST` | `/api/savedFilters/:id/share` | unknown | savedFilter.routes.js |
| `DELETE` | `/api/savedFilters/:id/share/:userId` | unknown | savedFilter.routes.js |
| `POST` | `/api/savedFilters/:id/duplicate` | unknown | savedFilter.routes.js |

## savedReport

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/saved-reports/reports` | getReports | savedReport.route.js |
| `POST` | `/api/saved-reports/reports` | createReport | savedReport.route.js |
| `GET` | `/api/saved-reports/reports/:id` | getReport | savedReport.route.js |
| `PATCH` | `/api/saved-reports/reports/:id` | updateReport | savedReport.route.js |
| `DELETE` | `/api/saved-reports/reports/:id` | deleteReport | savedReport.route.js |
| `POST` | `/api/saved-reports/reports/:id/run` | runReport | savedReport.route.js |
| `POST` | `/api/saved-reports/reports/:id/duplicate` | duplicateReport | savedReport.route.js |
| `GET` | `/api/saved-reports/widgets/defaults` | getDefaultWidgets | savedReport.route.js |
| `PATCH` | `/api/saved-reports/widgets/layout` | updateLayout | savedReport.route.js |
| `GET` | `/api/saved-reports/widgets` | getWidgets | savedReport.route.js |
| `POST` | `/api/saved-reports/widgets` | createWidget | savedReport.route.js |
| `GET` | `/api/saved-reports/widgets/:id` | getWidget | savedReport.route.js |
| `PATCH` | `/api/saved-reports/widgets/:id` | updateWidget | savedReport.route.js |
| `DELETE` | `/api/saved-reports/widgets/:id` | deleteWidget | savedReport.route.js |
| `GET` | `/api/saved-reports/widgets/:id/data` | getWidgetData | savedReport.route.js |

## score

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/score/:lawyerId` | getLawyerScore | score.route.js |
| `POST` | `/api/score/recalculate/:lawyerId` | recalculateScore | score.route.js |
| `GET` | `/api/score/top/lawyers` | getTopLawyers | score.route.js |

## security

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/security/dashboard` | unknown | security.route.js |
| `GET` | `/api/security/incidents` | unknown | security.route.js |
| `GET` | `/api/security/incidents/:id` | unknown | security.route.js |
| `PUT` | `/api/security/incidents/:id` | unknown | security.route.js |
| `POST` | `/api/security/incidents/:id/acknowledge` | unknown | security.route.js |
| `POST` | `/api/security/incidents/:id/notes` | unknown | security.route.js |
| `POST` | `/api/security/detect/brute-force` | unknown | security.route.js |
| `POST` | `/api/security/detect/account-takeover` | unknown | security.route.js |
| `POST` | `/api/security/detect/anomalous-activity` | unknown | security.route.js |
| `GET` | `/api/security/stats` | unknown | security.route.js |
| `GET` | `/api/security/incidents/open` | unknown | security.route.js |

## securityIncident

| Method | Path | Controller | File |
|--------|------|------------|------|
| `POST` | `/api/security/incidents/report` | unknown | securityIncident.route.js |
| `GET` | `/api/security/incidents` | unknown | securityIncident.route.js |
| `PATCH` | `/api/security/incidents/:id/status` | unknown | securityIncident.route.js |
| `GET` | `/api/security/incidents/stats` | unknown | securityIncident.route.js |
| `POST` | `/api/security/vulnerability/report` | unknown | securityIncident.route.js |
| `POST` | `/api/security/csp-report` | receiveCspReport | securityIncident.route.js |
| `GET` | `/api/security/csp-violations` | getCspViolations | securityIncident.route.js |
| `DELETE` | `/api/security/csp-violations` | clearCspViolations | securityIncident.route.js |

## settingsAlias

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/settings` | unknown | settingsAlias.route.js |
| `PATCH` | `/api/settings/account` | unknown | settingsAlias.route.js |
| `PATCH` | `/api/settings/appearance` | unknown | settingsAlias.route.js |
| `PATCH` | `/api/settings/display` | unknown | settingsAlias.route.js |
| `PATCH` | `/api/settings/notifications` | unknown | settingsAlias.route.js |
| `GET` | `/api/settings/hr` | unknown | settingsAlias.route.js |
| `PATCH` | `/api/settings/hr` | unknown | settingsAlias.route.js |
| `PATCH` | `/api/settings/hr/employee` | unknown | settingsAlias.route.js |
| `PATCH` | `/api/settings/hr/leave` | unknown | settingsAlias.route.js |
| `PATCH` | `/api/settings/hr/attendance` | unknown | settingsAlias.route.js |
| `PATCH` | `/api/settings/hr/payroll` | unknown | settingsAlias.route.js |
| `PATCH` | `/api/settings/hr/expense` | unknown | settingsAlias.route.js |
| `GET` | `/api/settings/crm` | unknown | settingsAlias.route.js |
| `PUT` | `/api/settings/crm` | unknown | settingsAlias.route.js |
| `GET` | `/api/settings/finance` | unknown | settingsAlias.route.js |
| `PUT` | `/api/settings/finance` | unknown | settingsAlias.route.js |
| `GET` | `/api/settings/taxes` | unknown | settingsAlias.route.js |
| `POST` | `/api/settings/taxes` | unknown | settingsAlias.route.js |
| `PUT` | `/api/settings/taxes/:id` | unknown | settingsAlias.route.js |
| `DELETE` | `/api/settings/taxes/:id` | unknown | settingsAlias.route.js |
| `PATCH` | `/api/settings/taxes/:id/default` | unknown | settingsAlias.route.js |
| `GET` | `/api/settings/payment-modes` | unknown | settingsAlias.route.js |
| `POST` | `/api/settings/payment-modes` | unknown | settingsAlias.route.js |
| `PUT` | `/api/settings/payment-modes/:id` | unknown | settingsAlias.route.js |
| `DELETE` | `/api/settings/payment-modes/:id` | unknown | settingsAlias.route.js |
| `PATCH` | `/api/settings/payment-modes/:id/default` | unknown | settingsAlias.route.js |

## setupWizard

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/setup/status` | unknown | setupWizard.route.js |
| `GET` | `/api/setup/sections` | unknown | setupWizard.route.js |
| `POST` | `/api/setup/tasks/:taskId/complete` | unknown | setupWizard.route.js |
| `POST` | `/api/setup/tasks/:taskId/skip` | unknown | setupWizard.route.js |
| `GET` | `/api/setup/next-task` | unknown | setupWizard.route.js |
| `GET` | `/api/setup/progress-percentage` | unknown | setupWizard.route.js |
| `POST` | `/api/setup/reset` | unknown | setupWizard.route.js |
| `POST` | `/api/setup/admin/sections` | unknown | setupWizard.route.js |
| `PATCH` | `/api/setup/admin/sections/:sectionId` | unknown | setupWizard.route.js |
| `DELETE` | `/api/setup/admin/sections/:sectionId` | unknown | setupWizard.route.js |
| `POST` | `/api/setup/admin/tasks` | unknown | setupWizard.route.js |
| `PATCH` | `/api/setup/admin/tasks/:taskId` | unknown | setupWizard.route.js |
| `DELETE` | `/api/setup/admin/tasks/:taskId` | unknown | setupWizard.route.js |

## shift

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/hr/shifts/shift-types` | unknown | shift.route.js |
| `GET` | `/api/hr/shifts/shift-types/:id` | unknown | shift.route.js |
| `POST` | `/api/hr/shifts/shift-types` | unknown | shift.route.js |
| `PATCH` | `/api/hr/shifts/shift-types/:id` | unknown | shift.route.js |
| `DELETE` | `/api/hr/shifts/shift-types/:id` | unknown | shift.route.js |
| `POST` | `/api/hr/shifts/shift-types/:id/set-default` | unknown | shift.route.js |
| `POST` | `/api/hr/shifts/shift-types/:id/clone` | unknown | shift.route.js |
| `GET` | `/api/hr/shifts/shift-types-stats` | unknown | shift.route.js |
| `GET` | `/api/hr/shifts/shift-types-ramadan` | unknown | shift.route.js |
| `GET` | `/api/hr/shifts/shift-assignments` | unknown | shift.route.js |
| `GET` | `/api/hr/shifts/shift-assignments/:id` | unknown | shift.route.js |
| `POST` | `/api/hr/shifts/shift-assignments` | unknown | shift.route.js |
| `POST` | `/api/hr/shifts/shift-assignments/bulk` | unknown | shift.route.js |
| `PATCH` | `/api/hr/shifts/shift-assignments/:id` | unknown | shift.route.js |
| `DELETE` | `/api/hr/shifts/shift-assignments/:id` | unknown | shift.route.js |
| `GET` | `/api/hr/shifts/shift-assignments/employee/:employeeId` | unknown | shift.route.js |
| `GET` | `/api/hr/shifts/shift-assignments/employee/:employeeId/current` | unknown | shift.route.js |

## shiftAssignments

| Method | Path | Controller | File |
|--------|------|------------|------|
| `POST` | `/api/shift-assignments` | unknown | shiftAssignments.route.js |
| `GET` | `/api/shift-assignments` | unknown | shiftAssignments.route.js |
| `GET` | `/api/shift-assignments/coverage-report` | unknown | shiftAssignments.route.js |
| `GET` | `/api/shift-assignments/stats` | unknown | shiftAssignments.route.js |
| `GET` | `/api/shift-assignments/employee/:employeeId/active` | unknown | shiftAssignments.route.js |
| `GET` | `/api/shift-assignments/employee/:employeeId/current` | unknown | shiftAssignments.route.js |
| `POST` | `/api/shift-assignments/bulk` | unknown | shiftAssignments.route.js |
| `DELETE` | `/api/shift-assignments/bulk` | unknown | shiftAssignments.route.js |
| `POST` | `/api/shift-assignments/import` | unknown | shiftAssignments.route.js |
| `GET` | `/api/shift-assignments/export` | unknown | shiftAssignments.route.js |
| `GET` | `/api/shift-assignments/:assignmentId` | unknown | shiftAssignments.route.js |
| `PUT` | `/api/shift-assignments/:assignmentId` | unknown | shiftAssignments.route.js |
| `DELETE` | `/api/shift-assignments/:assignmentId` | unknown | shiftAssignments.route.js |
| `POST` | `/api/shift-assignments/:assignmentId/activate` | unknown | shiftAssignments.route.js |
| `POST` | `/api/shift-assignments/:assignmentId/deactivate` | unknown | shiftAssignments.route.js |

## shiftRequests

| Method | Path | Controller | File |
|--------|------|------------|------|
| `POST` | `/api/shift-requests` | unknown | shiftRequests.route.js |
| `GET` | `/api/shift-requests` | unknown | shiftRequests.route.js |
| `POST` | `/api/shift-requests/check-conflicts` | unknown | shiftRequests.route.js |
| `GET` | `/api/shift-requests/pending-approvals` | unknown | shiftRequests.route.js |
| `GET` | `/api/shift-requests/stats` | unknown | shiftRequests.route.js |
| `GET` | `/api/shift-requests/:requestId` | unknown | shiftRequests.route.js |
| `PUT` | `/api/shift-requests/:requestId` | unknown | shiftRequests.route.js |
| `DELETE` | `/api/shift-requests/:requestId` | unknown | shiftRequests.route.js |
| `POST` | `/api/shift-requests/:requestId/approve` | unknown | shiftRequests.route.js |
| `POST` | `/api/shift-requests/:requestId/reject` | unknown | shiftRequests.route.js |

## skillMap

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/hr/skill-maps` | unknown | skillMap.route.js |
| `GET` | `/api/hr/skill-maps/matrix` | unknown | skillMap.route.js |
| `GET` | `/api/hr/skill-maps/find-by-skill/:skillId` | unknown | skillMap.route.js |
| `GET` | `/api/hr/skill-maps/distribution/:skillId` | unknown | skillMap.route.js |
| `GET` | `/api/hr/skill-maps/expiring-certifications` | unknown | skillMap.route.js |
| `GET` | `/api/hr/skill-maps/cpd-non-compliant` | unknown | skillMap.route.js |
| `GET` | `/api/hr/skill-maps/needs-review` | unknown | skillMap.route.js |
| `GET` | `/api/hr/skill-maps/department/:departmentId/summary` | unknown | skillMap.route.js |
| `POST` | `/api/hr/skill-maps/department/:departmentId/skill-gaps` | unknown | skillMap.route.js |
| `POST` | `/api/hr/skill-maps/compare` | unknown | skillMap.route.js |
| `GET` | `/api/hr/skill-maps/:employeeId` | unknown | skillMap.route.js |
| `GET` | `/api/hr/skill-maps/:employeeId/training-recommendations` | unknown | skillMap.route.js |
| `POST` | `/api/hr/skill-maps/:employeeId/skill-gaps` | unknown | skillMap.route.js |
| `PUT` | `/api/hr/skill-maps/:employeeId/skills` | unknown | skillMap.route.js |
| `POST` | `/api/hr/skill-maps/:employeeId/skills` | unknown | skillMap.route.js |
| `PATCH` | `/api/hr/skill-maps/:employeeId/skills/:skillId` | unknown | skillMap.route.js |
| `DELETE` | `/api/hr/skill-maps/:employeeId/skills/:skillId` | unknown | skillMap.route.js |
| `POST` | `/api/hr/skill-maps/:employeeId/skills/:skillId/evaluate` | unknown | skillMap.route.js |
| `POST` | `/api/hr/skill-maps/:employeeId/skills/:skillId/verify` | unknown | skillMap.route.js |
| `POST` | `/api/hr/skill-maps/:employeeId/skills/:skillId/cpd` | unknown | skillMap.route.js |
| `POST` | `/api/hr/skill-maps/:employeeId/skills/:skillId/endorse` | unknown | skillMap.route.js |
| `POST` | `/api/hr/skill-maps/:employeeId/trainings` | unknown | skillMap.route.js |
| `GET` | `/api/hr/skill-maps/:employeeId/skills/:skillId/trends` | unknown | skillMap.route.js |
| `GET` | `/api/hr/skill-maps/matrix/export` | unknown | skillMap.route.js |
| `GET` | `/api/hr/skill-maps/skill-gaps/export` | unknown | skillMap.route.js |
| `POST` | `/api/hr/skill-maps/bulk-update` | unknown | skillMap.route.js |

## skillMatrix

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/hr/skills/sfia-levels` | unknown | skillMatrix.route.js |
| `GET` | `/api/hr/skills/types` | unknown | skillMatrix.route.js |
| `POST` | `/api/hr/skills/types` | unknown | skillMatrix.route.js |
| `PATCH` | `/api/hr/skills/types/:id` | unknown | skillMatrix.route.js |
| `GET` | `/api/hr/skills/competencies` | unknown | skillMatrix.route.js |
| `GET` | `/api/hr/skills/competencies/:id` | unknown | skillMatrix.route.js |
| `POST` | `/api/hr/skills/competencies` | unknown | skillMatrix.route.js |
| `PATCH` | `/api/hr/skills/competencies/:id` | unknown | skillMatrix.route.js |
| `DELETE` | `/api/hr/skills/competencies/:id` | unknown | skillMatrix.route.js |
| `GET` | `/api/hr/skills/assessments` | unknown | skillMatrix.route.js |
| `GET` | `/api/hr/skills/assessments/:id` | unknown | skillMatrix.route.js |
| `POST` | `/api/hr/skills/assessments` | unknown | skillMatrix.route.js |
| `PATCH` | `/api/hr/skills/assessments/:id` | unknown | skillMatrix.route.js |
| `POST` | `/api/hr/skills/assessments/:id/self-assessment` | unknown | skillMatrix.route.js |
| `GET` | `/api/hr/skills/expiring-certifications` | unknown | skillMatrix.route.js |
| `GET` | `/api/hr/skills/cpd-non-compliant` | unknown | skillMatrix.route.js |
| `GET` | `/api/hr/skills/needing-review` | unknown | skillMatrix.route.js |
| `GET` | `/api/hr/skills/by-category` | unknown | skillMatrix.route.js |
| `GET` | `/api/hr/skills/stats` | unknown | skillMatrix.route.js |
| `GET` | `/api/hr/skills/matrix` | unknown | skillMatrix.route.js |
| `GET` | `/api/hr/skills/gap-analysis` | unknown | skillMatrix.route.js |
| `GET` | `/api/hr/skills` | unknown | skillMatrix.route.js |
| `GET` | `/api/hr/skills/:id` | unknown | skillMatrix.route.js |
| `POST` | `/api/hr/skills` | unknown | skillMatrix.route.js |
| `PATCH` | `/api/hr/skills/:id` | unknown | skillMatrix.route.js |
| `DELETE` | `/api/hr/skills/:id` | unknown | skillMatrix.route.js |
| `POST` | `/api/hr/skills/assign` | unknown | skillMatrix.route.js |
| `DELETE` | `/api/hr/skills/assign/:employeeId/:skillId` | unknown | skillMatrix.route.js |
| `GET` | `/api/hr/skills/employee/:employeeId` | unknown | skillMatrix.route.js |
| `GET` | `/api/hr/skills/:skillId/employees` | unknown | skillMatrix.route.js |
| `POST` | `/api/hr/skills/verify` | unknown | skillMatrix.route.js |
| `POST` | `/api/hr/skills/endorse` | unknown | skillMatrix.route.js |

## slack

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/slack/auth-url` | getAuthUrl | slack.route.js |
| `GET` | `/api/slack/callback` | handleCallback | slack.route.js |
| `GET` | `/api/slack/status` | getStatus | slack.route.js |
| `POST` | `/api/slack/disconnect` | disconnect | slack.route.js |
| `POST` | `/api/slack/test` | testConnection | slack.route.js |
| `POST` | `/api/slack/message` | sendMessage | slack.route.js |
| `GET` | `/api/slack/channels` | listChannels | slack.route.js |
| `POST` | `/api/slack/channels` | createChannel | slack.route.js |
| `GET` | `/api/slack/settings` | getSettings | slack.route.js |
| `PUT` | `/api/slack/settings` | updateSettings | slack.route.js |
| `POST` | `/api/slack/webhook` | handleWebhook | slack.route.js |
| `GET` | `/api/slack/users/:slackUserId` | getUserInfo | slack.route.js |

## slas

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/slas/stats` | unknown | sla.routes.js |
| `GET` | `/api/slas` | unknown | sla.routes.js |
| `POST` | `/api/slas` | unknown | sla.routes.js |
| `GET` | `/api/slas/:id` | unknown | sla.routes.js |
| `PUT` | `/api/slas/:id` | unknown | sla.routes.js |
| `DELETE` | `/api/slas/:id` | unknown | sla.routes.js |
| `POST` | `/api/slas/:id/apply/:ticketId` | unknown | sla.routes.js |
| `GET` | `/api/slas/instance/:ticketId` | unknown | sla.routes.js |
| `POST` | `/api/slas/instance/:id/pause` | unknown | sla.routes.js |
| `POST` | `/api/slas/instance/:id/resume` | unknown | sla.routes.js |

## sloMonitorings

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/sloMonitorings/dashboard` | unknown | sloMonitoring.routes.js |
| `GET` | `/api/sloMonitorings/report` | unknown | sloMonitoring.routes.js |
| `GET` | `/api/sloMonitorings/categories` | unknown | sloMonitoring.routes.js |
| `GET` | `/api/sloMonitorings/time-windows` | unknown | sloMonitoring.routes.js |
| `GET` | `/api/sloMonitorings/breached` | unknown | sloMonitoring.routes.js |
| `GET` | `/api/sloMonitorings/metrics/availability` | unknown | sloMonitoring.routes.js |
| `GET` | `/api/sloMonitorings/metrics/latency` | unknown | sloMonitoring.routes.js |
| `POST` | `/api/sloMonitorings/initialize-defaults` | unknown | sloMonitoring.routes.js |
| `POST` | `/api/sloMonitorings/check-alerts` | unknown | sloMonitoring.routes.js |
| `GET` | `/api/sloMonitorings` | unknown | sloMonitoring.routes.js |
| `POST` | `/api/sloMonitorings` | unknown | sloMonitoring.routes.js |
| `GET` | `/api/sloMonitorings/:id` | unknown | sloMonitoring.routes.js |
| `PUT` | `/api/sloMonitorings/:id` | unknown | sloMonitoring.routes.js |
| `DELETE` | `/api/sloMonitorings/:id` | unknown | sloMonitoring.routes.js |
| `POST` | `/api/sloMonitorings/:id/measure` | unknown | sloMonitoring.routes.js |
| `GET` | `/api/sloMonitorings/:id/status` | unknown | sloMonitoring.routes.js |
| `GET` | `/api/sloMonitorings/:id/history` | unknown | sloMonitoring.routes.js |
| `GET` | `/api/sloMonitorings/:id/error-budget` | unknown | sloMonitoring.routes.js |

## smartButton

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/smart-buttons/:model/:recordId/counts` | unknown | smartButton.route.js |
| `POST` | `/api/smart-buttons/:model/batch-counts` | unknown | smartButton.route.js |

## smartScheduling

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/smart-scheduling/patterns` | getUserPatterns | smartScheduling.route.js |
| `POST` | `/api/smart-scheduling/suggest` | suggestBestTime | smartScheduling.route.js |
| `POST` | `/api/smart-scheduling/predict-duration` | predictDuration | smartScheduling.route.js |
| `GET` | `/api/smart-scheduling/workload` | analyzeWorkload | smartScheduling.route.js |
| `GET` | `/api/smart-scheduling/nudges` | getDailyNudges | smartScheduling.route.js |
| `POST` | `/api/smart-scheduling/auto-schedule` | autoScheduleTasks | smartScheduling.route.js |

## ssoConfig

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/firms/:firmId/sso` | unknown | ssoConfig.route.js |
| `PUT` | `/api/firms/:firmId/sso` | unknown | ssoConfig.route.js |
| `POST` | `/api/firms/:firmId/sso/test` | unknown | ssoConfig.route.js |
| `POST` | `/api/firms/:firmId/sso/upload-metadata` | unknown | ssoConfig.route.js |
| `DELETE` | `/api/firms/:firmId/sso` | unknown | ssoConfig.route.js |

## ssoSettings

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/settings/sso` | unknown | ssoSettings.route.js |
| `PATCH` | `/api/settings/sso` | unknown | ssoSettings.route.js |
| `GET` | `/api/settings/sso/providers/available` | unknown | ssoSettings.route.js |
| `GET` | `/api/settings/sso/providers/:providerId` | unknown | ssoSettings.route.js |
| `PUT` | `/api/settings/sso/providers/:providerId` | unknown | ssoSettings.route.js |
| `DELETE` | `/api/settings/sso/providers/:providerId` | unknown | ssoSettings.route.js |
| `POST` | `/api/settings/sso/providers/:providerId/test` | unknown | ssoSettings.route.js |
| `GET` | `/api/settings/sso/domains` | unknown | ssoSettings.route.js |

## staff

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/staff/team` | getTeam | staff.route.js |
| `GET` | `/api/staff/stats` | getStats | staff.route.js |
| `POST` | `/api/staff/bulk-delete` | bulkDeleteStaff | staff.route.js |
| `GET` | `/api/staff` | getStaff | staff.route.js |
| `POST` | `/api/staff` | createStaff | staff.route.js |
| `GET` | `/api/staff/:id` | getStaffById | staff.route.js |
| `PUT` | `/api/staff/:id` | updateStaff | staff.route.js |
| `PATCH` | `/api/staff/:id` | unknown | staff.route.js |
| `DELETE` | `/api/staff/:id` | deleteStaff | staff.route.js |

## statement

| Method | Path | Controller | File |
|--------|------|------------|------|
| `POST` | `/api/statements` | generateStatement | statement.route.js |
| `GET` | `/api/statements` | getStatements | statement.route.js |
| `GET` | `/api/statements/:id` | getStatement | statement.route.js |
| `DELETE` | `/api/statements/:id` | deleteStatement | statement.route.js |
| `GET` | `/api/statements/:id/download` | downloadStatement | statement.route.js |
| `POST` | `/api/statements/:id/send` | sendStatement | statement.route.js |
| `POST` | `/api/statements/generate` | generateStatement | statement.route.js |

## status

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/status` | getPublicStatus | status.route.js |
| `GET` | `/api/status/components` | getPublicComponents | status.route.js |
| `GET` | `/api/status/components/:id` | getComponentStatus | status.route.js |
| `GET` | `/api/status/incidents` | getPublicIncidents | status.route.js |
| `GET` | `/api/status/incidents/:id` | getIncidentDetails | status.route.js |
| `GET` | `/api/status/maintenance` | getPublicMaintenance | status.route.js |
| `POST` | `/api/status/subscribe` | subscribe | status.route.js |
| `GET` | `/api/status/unsubscribe/:token` | unsubscribe | status.route.js |
| `GET` | `/api/status/admin/components` | listComponents | status.route.js |
| `POST` | `/api/status/admin/components` | createComponent | status.route.js |
| `PUT` | `/api/status/admin/components/:id` | updateComponent | status.route.js |
| `DELETE` | `/api/status/admin/components/:id` | deleteComponent | status.route.js |
| `POST` | `/api/status/admin/incidents` | createIncident | status.route.js |
| `PUT` | `/api/status/admin/incidents/:id` | updateIncident | status.route.js |
| `POST` | `/api/status/admin/incidents/:id/resolve` | resolveIncident | status.route.js |
| `POST` | `/api/status/admin/maintenance` | scheduleMaintenance | status.route.js |
| `PUT` | `/api/status/admin/maintenance/:id` | updateMaintenance | status.route.js |
| `POST` | `/api/status/admin/maintenance/:id/start` | startMaintenance | status.route.js |
| `POST` | `/api/status/admin/maintenance/:id/complete` | completeMaintenance | status.route.js |
| `POST` | `/api/status/admin/maintenance/:id/cancel` | cancelMaintenance | status.route.js |
| `GET` | `/api/status/admin/subscribers` | listSubscribers | status.route.js |
| `GET` | `/api/status/admin/history` | getStatusHistory | status.route.js |

## subcontracting

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/subcontracting/stats` | unknown | subcontracting.route.js |
| `GET` | `/api/subcontracting/settings` | unknown | subcontracting.route.js |
| `PUT` | `/api/subcontracting/settings` | unknown | subcontracting.route.js |
| `POST` | `/api/subcontracting/orders` | unknown | subcontracting.route.js |
| `GET` | `/api/subcontracting/orders` | unknown | subcontracting.route.js |
| `GET` | `/api/subcontracting/orders/:id` | unknown | subcontracting.route.js |
| `PUT` | `/api/subcontracting/orders/:id` | unknown | subcontracting.route.js |
| `DELETE` | `/api/subcontracting/orders/:id` | unknown | subcontracting.route.js |
| `POST` | `/api/subcontracting/orders/:id/submit` | unknown | subcontracting.route.js |
| `POST` | `/api/subcontracting/orders/:id/cancel` | unknown | subcontracting.route.js |
| `POST` | `/api/subcontracting/receipts` | unknown | subcontracting.route.js |
| `GET` | `/api/subcontracting/receipts` | unknown | subcontracting.route.js |
| `GET` | `/api/subcontracting/receipts/:id` | unknown | subcontracting.route.js |
| `POST` | `/api/subcontracting/receipts/:id/submit` | unknown | subcontracting.route.js |

## subscriptions

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/subscriptions` | unknown | subscriptions.route.js |
| `GET` | `/api/subscriptions/:id` | unknown | subscriptions.route.js |
| `POST` | `/api/subscriptions` | unknown | subscriptions.route.js |
| `PATCH` | `/api/subscriptions/:id` | unknown | subscriptions.route.js |
| `DELETE` | `/api/subscriptions/:id` | unknown | subscriptions.route.js |
| `POST` | `/api/subscriptions/:id/activate` | unknown | subscriptions.route.js |
| `POST` | `/api/subscriptions/:id/pause` | unknown | subscriptions.route.js |
| `POST` | `/api/subscriptions/:id/resume` | unknown | subscriptions.route.js |
| `POST` | `/api/subscriptions/:id/cancel` | unknown | subscriptions.route.js |
| `POST` | `/api/subscriptions/:id/renew` | unknown | subscriptions.route.js |
| `POST` | `/api/subscriptions/:id/change-plan` | unknown | subscriptions.route.js |
| `POST` | `/api/subscriptions/:id/consume-hours` | unknown | subscriptions.route.js |
| `GET` | `/api/subscriptions/:id/hours-usage` | unknown | subscriptions.route.js |
| `POST` | `/api/subscriptions/:id/reset-hours` | unknown | subscriptions.route.js |
| `GET` | `/api/subscriptions/:id/invoices` | unknown | subscriptions.route.js |
| `POST` | `/api/subscriptions/:id/generate-invoice` | unknown | subscriptions.route.js |
| `GET` | `/api/subscriptions/:id/upcoming-invoice` | unknown | subscriptions.route.js |
| `GET` | `/api/subscriptions/:id/renewal-preview` | unknown | subscriptions.route.js |
| `GET` | `/api/subscriptions/stats` | unknown | subscriptions.route.js |
| `GET` | `/api/subscriptions/upcoming-renewals` | unknown | subscriptions.route.js |
| `GET` | `/api/subscriptions/past-due` | unknown | subscriptions.route.js |

## successionPlan

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/succession-plans/stats` | unknown | successionPlan.route.js |
| `GET` | `/api/succession-plans/review-due` | unknown | successionPlan.route.js |
| `GET` | `/api/succession-plans/high-risk` | unknown | successionPlan.route.js |
| `GET` | `/api/succession-plans/critical-without-successors` | unknown | successionPlan.route.js |
| `GET` | `/api/succession-plans/export` | unknown | successionPlan.route.js |
| `GET` | `/api/succession-plans` | unknown | successionPlan.route.js |
| `POST` | `/api/succession-plans` | unknown | successionPlan.route.js |
| `POST` | `/api/succession-plans/bulk-delete` | unknown | successionPlan.route.js |
| `GET` | `/api/succession-plans/by-position/:positionId` | unknown | successionPlan.route.js |
| `GET` | `/api/succession-plans/by-incumbent/:incumbentId` | unknown | successionPlan.route.js |
| `GET` | `/api/succession-plans/:id` | unknown | successionPlan.route.js |
| `PATCH` | `/api/succession-plans/:id` | unknown | successionPlan.route.js |
| `DELETE` | `/api/succession-plans/:id` | unknown | successionPlan.route.js |
| `POST` | `/api/succession-plans/:id/submit-for-approval` | unknown | successionPlan.route.js |
| `POST` | `/api/succession-plans/:id/approve` | unknown | successionPlan.route.js |
| `POST` | `/api/succession-plans/:id/reject` | unknown | successionPlan.route.js |
| `POST` | `/api/succession-plans/:id/activate` | unknown | successionPlan.route.js |
| `POST` | `/api/succession-plans/:id/archive` | unknown | successionPlan.route.js |
| `POST` | `/api/succession-plans/:id/successors` | unknown | successionPlan.route.js |
| `PATCH` | `/api/succession-plans/:id/successors/:successorId` | unknown | successionPlan.route.js |
| `DELETE` | `/api/succession-plans/:id/successors/:successorId` | unknown | successionPlan.route.js |
| `PATCH` | `/api/succession-plans/:id/successors/:successorId/readiness` | unknown | successionPlan.route.js |
| `PATCH` | `/api/succession-plans/:id/successors/:successorId/development` | unknown | successionPlan.route.js |
| `POST` | `/api/succession-plans/:id/reviews` | unknown | successionPlan.route.js |
| `POST` | `/api/succession-plans/:id/actions` | unknown | successionPlan.route.js |
| `PATCH` | `/api/succession-plans/:id/actions/:actionId` | unknown | successionPlan.route.js |
| `POST` | `/api/succession-plans/:id/documents` | unknown | successionPlan.route.js |

## support

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/support/stats` | getStats | support.route.js |
| `GET` | `/api/support/settings` | getSettings | support.route.js |
| `PUT` | `/api/support/settings` | updateSettings | support.route.js |
| `GET` | `/api/support/tickets` | getTickets | support.route.js |
| `POST` | `/api/support/tickets` | createTicket | support.route.js |
| `GET` | `/api/support/tickets/:id` | getTicket | support.route.js |
| `PUT` | `/api/support/tickets/:id` | updateTicket | support.route.js |
| `DELETE` | `/api/support/tickets/:id` | deleteTicket | support.route.js |
| `POST` | `/api/support/tickets/:id/reply` | replyToTicket | support.route.js |
| `POST` | `/api/support/tickets/:id/resolve` | resolveTicket | support.route.js |
| `POST` | `/api/support/tickets/:id/close` | closeTicket | support.route.js |
| `GET` | `/api/support/slas` | getSLAs | support.route.js |
| `POST` | `/api/support/slas` | createSLA | support.route.js |
| `GET` | `/api/support/slas/:id` | getSLA | support.route.js |
| `PUT` | `/api/support/slas/:id` | updateSLA | support.route.js |
| `DELETE` | `/api/support/slas/:id` | deleteSLA | support.route.js |

## survey

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/hr/surveys/templates` | unknown | survey.route.js |
| `GET` | `/api/hr/surveys/templates/:id` | unknown | survey.route.js |
| `POST` | `/api/hr/surveys/templates` | unknown | survey.route.js |
| `PATCH` | `/api/hr/surveys/templates/:id` | unknown | survey.route.js |
| `DELETE` | `/api/hr/surveys/templates/:id` | unknown | survey.route.js |
| `GET` | `/api/hr/surveys/stats` | unknown | survey.route.js |
| `GET` | `/api/hr/surveys/my-surveys` | unknown | survey.route.js |
| `GET` | `/api/hr/surveys` | unknown | survey.route.js |
| `GET` | `/api/hr/surveys/:id` | unknown | survey.route.js |
| `GET` | `/api/hr/surveys/:id/results` | unknown | survey.route.js |
| `POST` | `/api/hr/surveys` | unknown | survey.route.js |
| `PATCH` | `/api/hr/surveys/:id` | unknown | survey.route.js |
| `POST` | `/api/hr/surveys/:id/launch` | unknown | survey.route.js |
| `POST` | `/api/hr/surveys/:id/close` | unknown | survey.route.js |
| `DELETE` | `/api/hr/surveys/:id` | unknown | survey.route.js |
| `POST` | `/api/hr/surveys/:id/respond` | unknown | survey.route.js |

## tag

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/tags/popular` | getPopularTags | tag.route.js |
| `POST` | `/api/tags/merge` | mergeTags | tag.route.js |
| `POST` | `/api/tags/bulk` | bulkCreate | tag.route.js |
| `GET` | `/api/tags/entity/:entityType` | getTagsByEntity | tag.route.js |
| `GET` | `/api/tags` | getTags | tag.route.js |
| `POST` | `/api/tags` | createTag | tag.route.js |
| `GET` | `/api/tags/:id` | getTagById | tag.route.js |
| `PUT` | `/api/tags/:id` | updateTag | tag.route.js |
| `DELETE` | `/api/tags/:id` | deleteTag | tag.route.js |

## task

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/tasks/templates` | getTemplates | task.route.js |
| `POST` | `/api/tasks/templates` | createTemplate | task.route.js |
| `GET` | `/api/tasks/templates/:templateId` | getTemplate | task.route.js |
| `PUT` | `/api/tasks/templates/:templateId` | updateTemplate | task.route.js |
| `PATCH` | `/api/tasks/templates/:templateId` | updateTemplate | task.route.js |
| `DELETE` | `/api/tasks/templates/:templateId` | deleteTemplate | task.route.js |
| `POST` | `/api/tasks/templates/:templateId/create` | createFromTemplate | task.route.js |
| `GET` | `/api/tasks/overview` | getTasksOverview | task.route.js |
| `GET` | `/api/tasks/timers/active` | getActiveTimers | task.route.js |
| `GET` | `/api/tasks/search` | searchTasks | task.route.js |
| `GET` | `/api/tasks/conflicts` | getTaskConflicts | task.route.js |
| `GET` | `/api/tasks/client/:clientId` | getTasksByClient | task.route.js |
| `GET` | `/api/tasks/stats` | getTaskStats | task.route.js |
| `GET` | `/api/tasks/upcoming` | getUpcomingTasks | task.route.js |
| `GET` | `/api/tasks/overdue` | getOverdueTasks | task.route.js |
| `GET` | `/api/tasks/due-today` | getTasksDueToday | task.route.js |
| `GET` | `/api/tasks/case/:caseId` | getTasksByCase | task.route.js |
| `POST` | `/api/tasks/bulk` | bulkCreateTasks | task.route.js |
| `PUT` | `/api/tasks/bulk` | bulkUpdateTasks | task.route.js |
| `DELETE` | `/api/tasks/bulk` | bulkDeleteTasks | task.route.js |
| `POST` | `/api/tasks/bulk/complete` | bulkCompleteTasks | task.route.js |
| `POST` | `/api/tasks/bulk/assign` | bulkAssignTasks | task.route.js |
| `POST` | `/api/tasks/bulk/archive` | bulkArchiveTasks | task.route.js |
| `POST` | `/api/tasks/bulk/unarchive` | bulkUnarchiveTasks | task.route.js |
| `POST` | `/api/tasks/bulk/reopen` | bulkReopenTasks | task.route.js |
| `GET` | `/api/tasks/export` | exportTasks | task.route.js |
| `GET` | `/api/tasks/ids` | getAllTaskIds | task.route.js |
| `GET` | `/api/tasks/archived` | getArchivedTasks | task.route.js |
| `PATCH` | `/api/tasks/reorder` | reorderTasks | task.route.js |
| `GET` | `/api/tasks/location-triggers` | getTasksWithLocationTriggers | task.route.js |
| `POST` | `/api/tasks/location/check` | bulkCheckLocationTriggers | task.route.js |
| `POST` | `/api/tasks/parse` | createTaskFromNaturalLanguage | task.route.js |
| `POST` | `/api/tasks/voice` | createTaskFromVoice | task.route.js |
| `GET` | `/api/tasks/smart-schedule` | getSmartScheduleSuggestions | task.route.js |
| `POST` | `/api/tasks/auto-schedule` | autoScheduleTasks | task.route.js |
| `POST` | `/api/tasks/voice-to-item` | processVoiceToItem | task.route.js |
| `POST` | `/api/tasks/voice-to-item/batch` | batchProcessVoiceMemos | task.route.js |
| `POST` | `/api/tasks` | createTask | task.route.js |
| `GET` | `/api/tasks` | getTasks | task.route.js |
| `GET` | `/api/tasks/:id/full` | getTaskFull | task.route.js |
| `GET` | `/api/tasks/:id` | getTask | task.route.js |
| `PUT` | `/api/tasks/:id` | updateTask | task.route.js |
| `PATCH` | `/api/tasks/:id` | updateTask | task.route.js |
| `DELETE` | `/api/tasks/:id` | deleteTask | task.route.js |
| `POST` | `/api/tasks/:id/complete` | completeTask | task.route.js |
| `POST` | `/api/tasks/:id/reopen` | reopenTask | task.route.js |
| `POST` | `/api/tasks/:id/clone` | cloneTask | task.route.js |
| `POST` | `/api/tasks/:id/reschedule` | rescheduleTask | task.route.js |
| `GET` | `/api/tasks/:id/activity` | getTaskActivity | task.route.js |
| `POST` | `/api/tasks/:id/convert-to-event` | convertTaskToEvent | task.route.js |
| `POST` | `/api/tasks/:id/archive` | archiveTask | task.route.js |
| `POST` | `/api/tasks/:id/unarchive` | unarchiveTask | task.route.js |
| `PUT` | `/api/tasks/:id/location-trigger` | updateLocationTrigger | task.route.js |
| `POST` | `/api/tasks/:id/location/check` | checkLocationTrigger | task.route.js |
| `POST` | `/api/tasks/:id/subtasks` | addSubtask | task.route.js |
| `PATCH` | `/api/tasks/:id/subtasks/:subtaskId/toggle` | toggleSubtask | task.route.js |
| `DELETE` | `/api/tasks/:id/subtasks/:subtaskId` | deleteSubtask | task.route.js |
| `POST` | `/api/tasks/:id/timer/start` | startTimer | task.route.js |
| `POST` | `/api/tasks/:id/timer/stop` | stopTimer | task.route.js |
| `PATCH` | `/api/tasks/:id/timer/pause` | pauseTimer | task.route.js |
| `PATCH` | `/api/tasks/:id/timer/resume` | resumeTimer | task.route.js |
| `POST` | `/api/tasks/:id/time` | addManualTime | task.route.js |
| `DELETE` | `/api/tasks/:id/time-tracking/reset` | resetTimeTracking | task.route.js |
| `POST` | `/api/tasks/:id/comments` | addComment | task.route.js |
| `PUT` | `/api/tasks/:id/comments/:commentId` | updateComment | task.route.js |
| `DELETE` | `/api/tasks/:id/comments/:commentId` | deleteComment | task.route.js |
| `POST` | `/api/tasks/:id/save-as-template` | saveAsTemplate | task.route.js |
| `POST` | `/api/tasks/:id/attachments` | addAttachment | task.route.js |
| `GET` | `/api/tasks/:id/attachments/:attachmentId/download-url` | getAttachmentDownloadUrl | task.route.js |
| `GET` | `/api/tasks/:id/attachments/:attachmentId/versions` | getAttachmentVersions | task.route.js |
| `DELETE` | `/api/tasks/:id/attachments/:attachmentId` | deleteAttachment | task.route.js |
| `POST` | `/api/tasks/:id/documents` | createDocument | task.route.js |
| `GET` | `/api/tasks/:id/documents` | getDocuments | task.route.js |
| `GET` | `/api/tasks/:id/documents/:documentId` | getDocument | task.route.js |
| `PATCH` | `/api/tasks/:id/documents/:documentId` | updateDocument | task.route.js |
| `GET` | `/api/tasks/:id/documents/:documentId/versions` | getDocumentVersions | task.route.js |
| `GET` | `/api/tasks/:id/documents/:documentId/versions/:versionId` | getDocumentVersion | task.route.js |
| `POST` | `/api/tasks/:id/documents/:documentId/versions/:versionId/restore` | restoreDocumentVersion | task.route.js |
| `POST` | `/api/tasks/:id/voice-memos` | addVoiceMemo | task.route.js |
| `PATCH` | `/api/tasks/:id/voice-memos/:memoId/transcription` | updateVoiceMemoTranscription | task.route.js |
| `POST` | `/api/tasks/:id/dependencies` | addDependency | task.route.js |
| `DELETE` | `/api/tasks/:id/dependencies/:dependencyTaskId` | removeDependency | task.route.js |
| `PATCH` | `/api/tasks/:id/status` | updateTaskStatus | task.route.js |
| `PATCH` | `/api/tasks/:id/progress` | updateProgress | task.route.js |
| `POST` | `/api/tasks/:id/workflow-rules` | addWorkflowRule | task.route.js |
| `PATCH` | `/api/tasks/:id/outcome` | updateOutcome | task.route.js |
| `PATCH` | `/api/tasks/:id/estimate` | updateEstimate | task.route.js |
| `GET` | `/api/tasks/:id/time-tracking/summary` | getTimeTrackingSummary | task.route.js |
| `PATCH` | `/api/tasks/:id/subtasks/:subtaskId` | updateSubtask | task.route.js |

## tasksExtended

| Method | Path | Controller | File |
|--------|------|------------|------|
| `PATCH` | `/api/tasks/:taskId/subtasks/reorder` | unknown | tasksExtended.route.js |
| `POST` | `/api/tasks/:taskId/time-tracking/start` | unknown | tasksExtended.route.js |
| `POST` | `/api/tasks/:taskId/time-tracking/stop` | unknown | tasksExtended.route.js |
| `POST` | `/api/tasks/:taskId/time-tracking/manual` | unknown | tasksExtended.route.js |
| `GET` | `/api/tasks/:taskId/time-tracking` | unknown | tasksExtended.route.js |
| `DELETE` | `/api/tasks/:taskId/time-tracking/:entryId` | unknown | tasksExtended.route.js |
| `POST` | `/api/tasks/:taskId/watchers` | unknown | tasksExtended.route.js |
| `DELETE` | `/api/tasks/:taskId/watchers/:userId` | unknown | tasksExtended.route.js |
| `POST` | `/api/tasks/:taskId/dependencies` | unknown | tasksExtended.route.js |
| `DELETE` | `/api/tasks/:taskId/dependencies/:depId` | unknown | tasksExtended.route.js |
| `POST` | `/api/tasks/:taskId/recurring` | unknown | tasksExtended.route.js |
| `DELETE` | `/api/tasks/:taskId/recurring` | unknown | tasksExtended.route.js |
| `POST` | `/api/tasks/:taskId/convert-to-case` | unknown | tasksExtended.route.js |

## tasksWorkflowRules

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/tasks/:taskId/available-dependencies` | unknown | tasksWorkflowRules.route.js |
| `GET` | `/api/tasks/:taskId/workflow-rules` | unknown | tasksWorkflowRules.route.js |
| `POST` | `/api/tasks/:taskId/workflow-rules` | unknown | tasksWorkflowRules.route.js |
| `PATCH` | `/api/tasks/:taskId/workflow-rules/:ruleId` | unknown | tasksWorkflowRules.route.js |
| `DELETE` | `/api/tasks/:taskId/workflow-rules/:ruleId` | unknown | tasksWorkflowRules.route.js |
| `POST` | `/api/tasks/:taskId/workflow-rules/:ruleId/toggle` | unknown | tasksWorkflowRules.route.js |
| `POST` | `/api/tasks/:taskId/evaluate-rules` | unknown | tasksWorkflowRules.route.js |
| `GET` | `/api/tasks/:taskId/rule-history` | unknown | tasksWorkflowRules.route.js |

## team

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/team/stats` | getTeamStats | team.route.js |
| `GET` | `/api/team/options` | getTeamOptions | team.route.js |
| `GET` | `/api/team` | getTeam | team.route.js |
| `POST` | `/api/team/invite` | inviteTeamMember | team.route.js |
| `GET` | `/api/team/:id` | getTeamMember | team.route.js |
| `PATCH` | `/api/team/:id` | updateTeamMember | team.route.js |
| `DELETE` | `/api/team/:id` | removeTeamMember | team.route.js |
| `POST` | `/api/team/:id/resend-invite` | resendInvitation | team.route.js |
| `DELETE` | `/api/team/:id/revoke-invite` | revokeInvitation | team.route.js |
| `PATCH` | `/api/team/:id/permissions` | updatePermissions | team.route.js |
| `PATCH` | `/api/team/:id/role` | changeRole | team.route.js |
| `POST` | `/api/team/:id/suspend` | suspendMember | team.route.js |
| `POST` | `/api/team/:id/activate` | activateMember | team.route.js |
| `POST` | `/api/team/:id/depart` | processDeparture | team.route.js |
| `GET` | `/api/team/:id/activity` | getMemberActivity | team.route.js |

## telegram

| Method | Path | Controller | File |
|--------|------|------------|------|
| `POST` | `/api/telegram/webhook/:firmId` | handleWebhook | telegram.route.js |
| `POST` | `/api/telegram/connect` | connect | telegram.route.js |
| `POST` | `/api/telegram/disconnect` | disconnect | telegram.route.js |
| `GET` | `/api/telegram/status` | getStatus | telegram.route.js |
| `POST` | `/api/telegram/test` | testConnection | telegram.route.js |
| `PUT` | `/api/telegram/settings` | updateSettings | telegram.route.js |
| `PATCH` | `/api/telegram/settings` | updateSettings | telegram.route.js |
| `GET` | `/api/telegram/chats` | listChats | telegram.route.js |
| `POST` | `/api/telegram/message` | sendMessage | telegram.route.js |
| `POST` | `/api/telegram/photo` | sendPhoto | telegram.route.js |
| `POST` | `/api/telegram/document` | sendDocument | telegram.route.js |

## temporalCase

| Method | Path | Controller | File |
|--------|------|------------|------|
| `POST` | `/api/cases/:id/start-workflow` | unknown | temporalCase.route.js |
| `POST` | `/api/cases/:id/workflow/complete-requirement` | unknown | temporalCase.route.js |
| `POST` | `/api/cases/:id/workflow/transition-stage` | unknown | temporalCase.route.js |
| `GET` | `/api/cases/:id/workflow/status` | unknown | temporalCase.route.js |
| `POST` | `/api/cases/:id/workflow/add-deadline` | unknown | temporalCase.route.js |
| `POST` | `/api/cases/:id/workflow/add-court-date` | unknown | temporalCase.route.js |
| `POST` | `/api/cases/:id/workflow/pause` | unknown | temporalCase.route.js |
| `POST` | `/api/cases/:id/workflow/resume` | unknown | temporalCase.route.js |
| `POST` | `/api/cases/:id/workflow/cancel` | unknown | temporalCase.route.js |

## temporalInvoice

| Method | Path | Controller | File |
|--------|------|------------|------|
| `POST` | `/api/temporal-invoices/:id/submit-approval` | unknown | temporalInvoice.route.js |
| `POST` | `/api/temporal-invoices/:id/approve` | unknown | temporalInvoice.route.js |
| `POST` | `/api/temporal-invoices/:id/reject` | unknown | temporalInvoice.route.js |
| `GET` | `/api/temporal-invoices/:id/approval-status` | unknown | temporalInvoice.route.js |
| `POST` | `/api/temporal-invoices/:id/cancel-approval` | unknown | temporalInvoice.route.js |
| `GET` | `/api/temporal-invoices/pending-approvals` | unknown | temporalInvoice.route.js |

## temporalOffboarding

| Method | Path | Controller | File |
|--------|------|------------|------|
| `POST` | `/api/temporalOffboarding/:id/start-offboarding` | unknown | temporalOffboarding.route.js |
| `POST` | `/api/temporalOffboarding/:id/offboarding/complete-task` | unknown | temporalOffboarding.route.js |
| `GET` | `/api/temporalOffboarding/:id/offboarding/status` | unknown | temporalOffboarding.route.js |
| `POST` | `/api/temporalOffboarding/:id/offboarding/escalate` | unknown | temporalOffboarding.route.js |
| `POST` | `/api/temporalOffboarding/:id/offboarding/cancel` | unknown | temporalOffboarding.route.js |

## temporalOnboarding

| Method | Path | Controller | File |
|--------|------|------------|------|
| `POST` | `/api/temporalOnboarding/:id/start-onboarding` | unknown | temporalOnboarding.route.js |
| `POST` | `/api/temporalOnboarding/:id/onboarding/complete-documents` | unknown | temporalOnboarding.route.js |
| `POST` | `/api/temporalOnboarding/:id/onboarding/complete-training` | unknown | temporalOnboarding.route.js |
| `POST` | `/api/temporalOnboarding/:id/onboarding/complete-review` | unknown | temporalOnboarding.route.js |
| `GET` | `/api/temporalOnboarding/:id/onboarding/status` | unknown | temporalOnboarding.route.js |
| `POST` | `/api/temporalOnboarding/:id/onboarding/skip-phase` | unknown | temporalOnboarding.route.js |
| `DELETE` | `/api/temporalOnboarding/:id/onboarding/cancel` | unknown | temporalOnboarding.route.js |

## territory

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/territory` | unknown | territory.route.js |
| `GET` | `/api/territory/tree` | unknown | territory.route.js |
| `GET` | `/api/territory/:id` | unknown | territory.route.js |
| `POST` | `/api/territory` | unknown | territory.route.js |
| `PUT` | `/api/territory/:id` | unknown | territory.route.js |
| `DELETE` | `/api/territory/:id` | unknown | territory.route.js |

## territorys

| Method | Path | Controller | File |
|--------|------|------------|------|
| `POST` | `/api/territorys` | unknown | territory.routes.js |
| `GET` | `/api/territorys` | unknown | territory.routes.js |
| `GET` | `/api/territorys/:id` | unknown | territory.routes.js |
| `PUT` | `/api/territorys/:id` | unknown | territory.routes.js |
| `DELETE` | `/api/territorys/:id` | unknown | territory.routes.js |
| `GET` | `/api/territorys/:id/tree` | unknown | territory.routes.js |
| `GET` | `/api/territorys/:id/children` | unknown | territory.routes.js |
| `PUT` | `/api/territorys/:id/move` | unknown | territory.routes.js |
| `GET` | `/api/territorys/:id/stats` | unknown | territory.routes.js |

## threadMessages

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/threadMessages/mentions` | getMyMentions | threadMessage.routes.js |
| `GET` | `/api/threadMessages/starred` | getStarred | threadMessage.routes.js |
| `GET` | `/api/threadMessages/search` | searchMessages | threadMessage.routes.js |
| `GET` | `/api/threadMessages/thread/:model/:id` | getRecordThread | threadMessage.routes.js |
| `POST` | `/api/threadMessages` | postMessage | threadMessage.routes.js |
| `POST` | `/api/threadMessages/note` | postNote | threadMessage.routes.js |
| `GET` | `/api/threadMessages` | getMessages | threadMessage.routes.js |
| `GET` | `/api/threadMessages/:id` | getMessage | threadMessage.routes.js |
| `POST` | `/api/threadMessages/:id/star` | starMessage | threadMessage.routes.js |
| `DELETE` | `/api/threadMessages/:id` | deleteMessage | threadMessage.routes.js |

## timeTracking

| Method | Path | Controller | File |
|--------|------|------------|------|
| `POST` | `/api/time-tracking/timer/start` | startTimer | timeTracking.route.js |
| `POST` | `/api/time-tracking/timer/pause` | pauseTimer | timeTracking.route.js |
| `POST` | `/api/time-tracking/timer/resume` | resumeTimer | timeTracking.route.js |
| `POST` | `/api/time-tracking/timer/stop` | stopTimer | timeTracking.route.js |
| `GET` | `/api/time-tracking/timer/status` | getTimerStatus | timeTracking.route.js |
| `GET` | `/api/time-tracking/weekly` | getWeeklyEntries | timeTracking.route.js |
| `GET` | `/api/time-tracking/stats` | getTimeStats | timeTracking.route.js |
| `GET` | `/api/time-tracking/unbilled` | getUnbilledEntries | timeTracking.route.js |
| `GET` | `/api/time-tracking/activity-codes` | getActivityCodes | timeTracking.route.js |
| `DELETE` | `/api/time-tracking/entries/bulk` | bulkDeleteTimeEntries | timeTracking.route.js |
| `POST` | `/api/time-tracking/entries/bulk-approve` | bulkApproveTimeEntries | timeTracking.route.js |
| `POST` | `/api/time-tracking/entries/bulk-reject` | bulkRejectTimeEntries | timeTracking.route.js |
| `POST` | `/api/time-tracking/entries/bulk-submit` | bulkSubmitTimeEntries | timeTracking.route.js |
| `POST` | `/api/time-tracking/entries/bulk-lock` | bulkLockTimeEntries | timeTracking.route.js |
| `GET` | `/api/time-tracking/entries/pending-approval` | getPendingApprovalEntries | timeTracking.route.js |
| `POST` | `/api/time-tracking/entries` | createTimeEntry | timeTracking.route.js |
| `GET` | `/api/time-tracking/entries` | getTimeEntries | timeTracking.route.js |
| `GET` | `/api/time-tracking/entries/:id` | getTimeEntry | timeTracking.route.js |
| `PATCH` | `/api/time-tracking/entries/:id` | updateTimeEntry | timeTracking.route.js |
| `PUT` | `/api/time-tracking/entries/:id` | updateTimeEntry | timeTracking.route.js |
| `DELETE` | `/api/time-tracking/entries/:id` | deleteTimeEntry | timeTracking.route.js |
| `POST` | `/api/time-tracking/entries/:id/write-off` | writeOffTimeEntry | timeTracking.route.js |
| `POST` | `/api/time-tracking/entries/:id/write-down` | writeDownTimeEntry | timeTracking.route.js |
| `POST` | `/api/time-tracking/entries/:id/submit` | submitTimeEntry | timeTracking.route.js |
| `POST` | `/api/time-tracking/entries/:id/request-changes` | requestChangesTimeEntry | timeTracking.route.js |
| `POST` | `/api/time-tracking/entries/:id/approve` | approveTimeEntry | timeTracking.route.js |
| `POST` | `/api/time-tracking/entries/:id/reject` | rejectTimeEntry | timeTracking.route.js |
| `POST` | `/api/time-tracking/entries/:id/lock` | lockTimeEntry | timeTracking.route.js |
| `POST` | `/api/time-tracking/entries/:id/unlock` | unlockTimeEntry | timeTracking.route.js |

## timelines

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/timelines/:entityType/:entityId` | unknown | timeline.routes.js |
| `GET` | `/api/timelines/:entityType/:entityId/summary` | unknown | timeline.routes.js |

## trades

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/v1/trades/stats` | getTradeStats | trades.route.js |
| `GET` | `/api/v1/trades/stats/chart` | getChartData | trades.route.js |
| `DELETE` | `/api/v1/trades/bulk` | bulkDeleteTrades | trades.route.js |
| `POST` | `/api/v1/trades/import/csv` | importFromCsv | trades.route.js |
| `POST` | `/api/v1/trades` | createTrade | trades.route.js |
| `GET` | `/api/v1/trades` | getTrades | trades.route.js |
| `GET` | `/api/v1/trades/:id` | getTrade | trades.route.js |
| `PATCH` | `/api/v1/trades/:id` | updateTrade | trades.route.js |
| `DELETE` | `/api/v1/trades/:id` | deleteTrade | trades.route.js |
| `POST` | `/api/v1/trades/:id/close` | closeTrade | trades.route.js |

## tradingAccounts

| Method | Path | Controller | File |
|--------|------|------------|------|
| `POST` | `/api/v1/trading-accounts` | createTradingAccount | tradingAccounts.route.js |
| `GET` | `/api/v1/trading-accounts` | getTradingAccounts | tradingAccounts.route.js |
| `GET` | `/api/v1/trading-accounts/:id` | getTradingAccount | tradingAccounts.route.js |
| `PATCH` | `/api/v1/trading-accounts/:id` | updateTradingAccount | tradingAccounts.route.js |
| `DELETE` | `/api/v1/trading-accounts/:id` | deleteTradingAccount | tradingAccounts.route.js |
| `GET` | `/api/v1/trading-accounts/:id/balance` | getAccountBalance | tradingAccounts.route.js |
| `POST` | `/api/v1/trading-accounts/:id/set-default` | setDefaultAccount | tradingAccounts.route.js |
| `POST` | `/api/v1/trading-accounts/:id/transaction` | addTransaction | tradingAccounts.route.js |

## training

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/hr/trainings/stats` | unknown | training.route.js |
| `GET` | `/api/hr/trainings/pending-approvals` | unknown | training.route.js |
| `GET` | `/api/hr/trainings/upcoming` | unknown | training.route.js |
| `GET` | `/api/hr/trainings/overdue-compliance` | unknown | training.route.js |
| `GET` | `/api/hr/trainings/calendar` | unknown | training.route.js |
| `GET` | `/api/hr/trainings/providers` | unknown | training.route.js |
| `GET` | `/api/hr/trainings/export` | unknown | training.route.js |
| `GET` | `/api/hr/trainings/policies` | unknown | training.route.js |
| `POST` | `/api/hr/trainings/bulk-delete` | unknown | training.route.js |
| `GET` | `/api/hr/trainings/by-employee/:employeeId` | unknown | training.route.js |
| `GET` | `/api/hr/trainings/cle-summary/:employeeId` | unknown | training.route.js |
| `GET` | `/api/hr/trainings` | unknown | training.route.js |
| `POST` | `/api/hr/trainings` | unknown | training.route.js |
| `GET` | `/api/hr/trainings/:trainingId` | unknown | training.route.js |
| `PATCH` | `/api/hr/trainings/:trainingId` | unknown | training.route.js |
| `DELETE` | `/api/hr/trainings/:trainingId` | unknown | training.route.js |
| `POST` | `/api/hr/trainings/:trainingId/submit` | unknown | training.route.js |
| `POST` | `/api/hr/trainings/:trainingId/approve` | unknown | training.route.js |
| `POST` | `/api/hr/trainings/:trainingId/reject` | unknown | training.route.js |
| `POST` | `/api/hr/trainings/:trainingId/enroll` | unknown | training.route.js |
| `POST` | `/api/hr/trainings/:trainingId/start` | unknown | training.route.js |
| `POST` | `/api/hr/trainings/:trainingId/complete` | unknown | training.route.js |
| `POST` | `/api/hr/trainings/:trainingId/cancel` | unknown | training.route.js |
| `POST` | `/api/hr/trainings/:trainingId/attendance` | unknown | training.route.js |
| `POST` | `/api/hr/trainings/:trainingId/progress` | unknown | training.route.js |
| `POST` | `/api/hr/trainings/:trainingId/assessments` | unknown | training.route.js |
| `POST` | `/api/hr/trainings/:trainingId/issue-certificate` | unknown | training.route.js |
| `POST` | `/api/hr/trainings/:trainingId/evaluation` | unknown | training.route.js |
| `POST` | `/api/hr/trainings/:trainingId/payment` | unknown | training.route.js |

## transaction

| Method | Path | Controller | File |
|--------|------|------------|------|
| `POST` | `/api/transactions` | createTransaction | transaction.route.js |
| `GET` | `/api/transactions` | getTransactions | transaction.route.js |
| `GET` | `/api/transactions/balance` | getBalance | transaction.route.js |
| `GET` | `/api/transactions/summary` | getSummary | transaction.route.js |
| `GET` | `/api/transactions/by-category` | getTransactionsByCategory | transaction.route.js |
| `GET` | `/api/transactions/:id` | getTransaction | transaction.route.js |
| `PUT` | `/api/transactions/:id` | updateTransaction | transaction.route.js |
| `DELETE` | `/api/transactions/:id` | deleteTransaction | transaction.route.js |
| `POST` | `/api/transactions/:id/cancel` | cancelTransaction | transaction.route.js |
| `DELETE` | `/api/transactions/bulk` | bulkDeleteTransactions | transaction.route.js |

## transactionsExtended

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/transactions/categories` | unknown | transactionsExtended.route.js |
| `POST` | `/api/transactions/categories` | unknown | transactionsExtended.route.js |
| `PUT` | `/api/transactions/categories/:id` | unknown | transactionsExtended.route.js |
| `DELETE` | `/api/transactions/categories/:id` | unknown | transactionsExtended.route.js |
| `GET` | `/api/transactions/pending` | unknown | transactionsExtended.route.js |
| `GET` | `/api/transactions/unreconciled` | unknown | transactionsExtended.route.js |
| `GET` | `/api/transactions/stats` | unknown | transactionsExtended.route.js |
| `GET` | `/api/transactions/search` | unknown | transactionsExtended.route.js |
| `GET` | `/api/transactions/export` | unknown | transactionsExtended.route.js |
| `POST` | `/api/transactions/:id/reconcile` | unknown | transactionsExtended.route.js |
| `POST` | `/api/transactions/:id/unreconcile` | unknown | transactionsExtended.route.js |
| `GET` | `/api/transactions/:id/attachments` | unknown | transactionsExtended.route.js |
| `POST` | `/api/transactions/:id/attachments` | unknown | transactionsExtended.route.js |
| `DELETE` | `/api/transactions/:id/attachments/:attachmentId` | unknown | transactionsExtended.route.js |

## trello

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/trello/auth-url` | getAuthUrl | trello.route.js |
| `GET` | `/api/trello/callback` | handleCallback | trello.route.js |
| `GET` | `/api/trello/status` | getStatus | trello.route.js |
| `POST` | `/api/trello/disconnect` | disconnect | trello.route.js |
| `GET` | `/api/trello/boards` | listBoards | trello.route.js |
| `GET` | `/api/trello/boards/:boardId` | getBoard | trello.route.js |
| `GET` | `/api/trello/boards/:boardId/lists` | listLists | trello.route.js |
| `GET` | `/api/trello/lists/:listId/cards` | listCards | trello.route.js |
| `POST` | `/api/trello/cards` | createCard | trello.route.js |
| `PUT` | `/api/trello/cards/:cardId` | updateCard | trello.route.js |
| `POST` | `/api/trello/cards/:cardId/move` | moveCard | trello.route.js |
| `POST` | `/api/trello/cards/:cardId/comments` | addComment | trello.route.js |
| `GET` | `/api/trello/settings` | getSettings | trello.route.js |
| `PUT` | `/api/trello/settings` | updateSettings | trello.route.js |
| `POST` | `/api/trello/sync` | syncWithTasks | trello.route.js |
| `POST` | `/api/trello/webhook` | handleWebhook | trello.route.js |

## trustAccount

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/trust-accounts` | getTrustAccounts | trustAccount.route.js |
| `POST` | `/api/trust-accounts` | createTrustAccount | trustAccount.route.js |
| `GET` | `/api/trust-accounts/:id` | getTrustAccount | trustAccount.route.js |
| `PATCH` | `/api/trust-accounts/:id` | updateTrustAccount | trustAccount.route.js |
| `DELETE` | `/api/trust-accounts/:id` | deleteTrustAccount | trustAccount.route.js |
| `GET` | `/api/trust-accounts/:id/summary` | getAccountSummary | trustAccount.route.js |
| `GET` | `/api/trust-accounts/:id/transactions` | getTransactions | trustAccount.route.js |
| `POST` | `/api/trust-accounts/:id/transactions` | createTransaction | trustAccount.route.js |
| `GET` | `/api/trust-accounts/:id/transactions/:transactionId` | getTransaction | trustAccount.route.js |
| `POST` | `/api/trust-accounts/:id/transactions/:transactionId/void` | voidTransaction | trustAccount.route.js |
| `GET` | `/api/trust-accounts/:id/balances` | getClientBalances | trustAccount.route.js |
| `GET` | `/api/trust-accounts/:id/balances/:clientId` | getClientBalance | trustAccount.route.js |
| `POST` | `/api/trust-accounts/:id/transfer` | transferBetweenClients | trustAccount.route.js |
| `GET` | `/api/trust-accounts/:id/reconciliations` | getReconciliations | trustAccount.route.js |
| `POST` | `/api/trust-accounts/:id/reconciliations` | createReconciliation | trustAccount.route.js |
| `GET` | `/api/trust-accounts/:id/three-way-reconciliations` | getThreeWayReconciliations | trustAccount.route.js |
| `POST` | `/api/trust-accounts/:id/three-way-reconciliations` | createThreeWayReconciliation | trustAccount.route.js |

## unifiedData

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/unified/billable-items` | unknown | unifiedData.route.js |
| `GET` | `/api/unified/open-invoices` | unknown | unifiedData.route.js |
| `GET` | `/api/unified/financial-summary` | unknown | unifiedData.route.js |
| `GET` | `/api/unified/client-portfolio/:clientId` | unknown | unifiedData.route.js |
| `GET` | `/api/unified/hr-dashboard` | unknown | unifiedData.route.js |
| `GET` | `/api/unified/case-financials/:caseId` | unknown | unifiedData.route.js |

## user

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/users/lawyers` | getLawyers | user.route.js |
| `GET` | `/api/users/team` | getTeamMembers | user.route.js |
| `GET` | `/api/users/vapid-public-key` | getVapidPublicKey | user.route.js |
| `GET` | `/api/users/push-subscription` | getPushSubscriptionStatus | user.route.js |
| `POST` | `/api/users/push-subscription` | savePushSubscription | user.route.js |
| `DELETE` | `/api/users/push-subscription` | deletePushSubscription | user.route.js |
| `GET` | `/api/users/notification-preferences` | getPushSubscriptionStatus | user.route.js |
| `PUT` | `/api/users/notification-preferences` | updateNotificationPreferences | user.route.js |
| `POST` | `/api/users/convert-to-firm` | convertSoloToFirm | user.route.js |
| `GET` | `/api/users/:_id` | getUserProfile | user.route.js |
| `GET` | `/api/users/lawyer/:username` | getLawyerProfile | user.route.js |
| `PATCH` | `/api/users/:_id` | updateUserProfile | user.route.js |
| `DELETE` | `/api/users/:_id` | deleteUser | user.route.js |

## userSettings

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/user-settings` | getSettings | userSettings.route.js |
| `GET` | `/api/user-settings/view-mode/:module` | getModuleViewMode | userSettings.route.js |
| `PUT` | `/api/user-settings/view-mode/:module` | updateModuleViewMode | userSettings.route.js |
| `PUT` | `/api/user-settings/global-view-mode` | updateGlobalViewMode | userSettings.route.js |
| `PUT` | `/api/user-settings/module/:module` | updateModuleSettings | userSettings.route.js |
| `POST` | `/api/user-settings/toggle-section` | toggleSection | userSettings.route.js |

## vendor

| Method | Path | Controller | File |
|--------|------|------------|------|
| `POST` | `/api/vendors` | createVendor | vendor.route.js |
| `GET` | `/api/vendors` | getVendors | vendor.route.js |
| `GET` | `/api/vendors/:id` | getVendor | vendor.route.js |
| `PUT` | `/api/vendors/:id` | updateVendor | vendor.route.js |
| `DELETE` | `/api/vendors/:id` | deleteVendor | vendor.route.js |
| `GET` | `/api/vendors/:id/summary` | getVendorSummary | vendor.route.js |

## verify

| Method | Path | Controller | File |
|--------|------|------------|------|
| `POST` | `/api/verify/yakeen` | unknown | verify.route.js |
| `POST` | `/api/verify/yakeen/address` | unknown | verify.route.js |
| `GET` | `/api/verify/yakeen/status` | unknown | verify.route.js |
| `GET` | `/api/verify/wathq/:crNumber` | unknown | verify.route.js |
| `GET` | `/api/verify/wathq/:crNumber/basic` | unknown | verify.route.js |
| `GET` | `/api/verify/wathq/:crNumber/status` | unknown | verify.route.js |
| `GET` | `/api/verify/wathq/:crNumber/managers` | unknown | verify.route.js |
| `GET` | `/api/verify/wathq/:crNumber/owners` | unknown | verify.route.js |
| `GET` | `/api/verify/wathq/:crNumber/capital` | unknown | verify.route.js |
| `GET` | `/api/verify/wathq/:crNumber/branches` | unknown | verify.route.js |
| `GET` | `/api/verify/wathq/config/status` | unknown | verify.route.js |
| `GET` | `/api/verify/moj/attorney/:attorneyId` | unknown | verify.route.js |
| `POST` | `/api/verify/moj/attorney` | unknown | verify.route.js |
| `GET` | `/api/verify/moj/license/:licenseNumber` | unknown | verify.route.js |
| `GET` | `/api/verify/moj/poa/:poaNumber` | unknown | verify.route.js |
| `POST` | `/api/verify/moj/poa` | unknown | verify.route.js |
| `GET` | `/api/verify/moj/poa/list/:idNumber` | unknown | verify.route.js |
| `GET` | `/api/verify/moj/status` | unknown | verify.route.js |
| `GET` | `/api/verify/status` | unknown | verify.route.js |

## views

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/views` | unknown | view.routes.js |
| `POST` | `/api/views` | unknown | view.routes.js |
| `GET` | `/api/views/:id` | unknown | view.routes.js |
| `PUT` | `/api/views/:id` | unknown | view.routes.js |
| `PATCH` | `/api/views/:id` | unknown | view.routes.js |
| `DELETE` | `/api/views/:id` | unknown | view.routes.js |
| `GET` | `/api/views/:id/render` | unknown | view.routes.js |
| `POST` | `/api/views/:id/clone` | unknown | view.routes.js |
| `POST` | `/api/views/:id/share` | unknown | view.routes.js |
| `POST` | `/api/views/:id/favorite` | unknown | view.routes.js |
| `POST` | `/api/views/:id/default` | unknown | view.routes.js |

## walkthrough

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/walkthroughs` | unknown | walkthrough.route.js |
| `GET` | `/api/walkthroughs/progress` | unknown | walkthrough.route.js |
| `GET` | `/api/walkthroughs/:id` | unknown | walkthrough.route.js |
| `POST` | `/api/walkthroughs/:id/start` | unknown | walkthrough.route.js |
| `POST` | `/api/walkthroughs/:id/step/next` | unknown | walkthrough.route.js |
| `POST` | `/api/walkthroughs/:id/step/:stepOrder/skip` | unknown | walkthrough.route.js |
| `POST` | `/api/walkthroughs/:id/complete` | unknown | walkthrough.route.js |
| `POST` | `/api/walkthroughs/:id/skip` | unknown | walkthrough.route.js |
| `POST` | `/api/walkthroughs/:id/reset` | unknown | walkthrough.route.js |
| `GET` | `/api/walkthroughs/stats` | unknown | walkthrough.route.js |
| `GET` | `/api/walkthroughs/admin` | unknown | walkthrough.route.js |
| `POST` | `/api/walkthroughs/admin` | unknown | walkthrough.route.js |
| `PUT` | `/api/walkthroughs/admin/:id` | unknown | walkthrough.route.js |
| `DELETE` | `/api/walkthroughs/admin/:id` | unknown | walkthrough.route.js |

## webauthn

| Method | Path | Controller | File |
|--------|------|------------|------|
| `POST` | `/api/auth/webauthn/register/start` | startRegistration | webauthn.route.js |
| `POST` | `/api/auth/webauthn/register/finish` | finishRegistration | webauthn.route.js |
| `POST` | `/api/auth/webauthn/authenticate/start` | startAuthentication | webauthn.route.js |
| `POST` | `/api/auth/webauthn/authenticate/finish` | finishAuthentication | webauthn.route.js |
| `GET` | `/api/auth/webauthn/credentials` | getCredentials | webauthn.route.js |
| `PATCH` | `/api/auth/webauthn/credentials/:id` | updateCredentialName | webauthn.route.js |
| `DELETE` | `/api/auth/webauthn/credentials/:id` | deleteCredential | webauthn.route.js |

## webhook

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/webhooks/stats` | getWebhookStats | webhook.route.js |
| `GET` | `/api/webhooks/events` | getAvailableEvents | webhook.route.js |
| `POST` | `/api/webhooks` | registerWebhook | webhook.route.js |
| `GET` | `/api/webhooks` | getWebhooks | webhook.route.js |
| `GET` | `/api/webhooks/:id` | getWebhook | webhook.route.js |
| `PUT` | `/api/webhooks/:id` | updateWebhook | webhook.route.js |
| `PATCH` | `/api/webhooks/:id` | updateWebhook | webhook.route.js |
| `DELETE` | `/api/webhooks/:id` | deleteWebhook | webhook.route.js |
| `POST` | `/api/webhooks/:id/test` | testWebhook | webhook.route.js |
| `POST` | `/api/webhooks/:id/enable` | enableWebhook | webhook.route.js |
| `POST` | `/api/webhooks/:id/disable` | disableWebhook | webhook.route.js |
| `GET` | `/api/webhooks/:id/secret` | getWebhookSecret | webhook.route.js |
| `POST` | `/api/webhooks/:id/regenerate-secret` | regenerateSecret | webhook.route.js |
| `GET` | `/api/webhooks/:id/deliveries` | getWebhookDeliveries | webhook.route.js |
| `GET` | `/api/webhooks/:id/deliveries/:deliveryId` | getDeliveryDetails | webhook.route.js |
| `POST` | `/api/webhooks/:id/deliveries/:deliveryId/retry` | retryDelivery | webhook.route.js |

## whatsapp

| Method | Path | Controller | File |
|--------|------|------------|------|
| `POST` | `/api/whatsapp/send/template` | unknown | whatsapp.route.js |
| `POST` | `/api/whatsapp/send/text` | unknown | whatsapp.route.js |
| `POST` | `/api/whatsapp/send/media` | unknown | whatsapp.route.js |
| `POST` | `/api/whatsapp/send/location` | unknown | whatsapp.route.js |
| `POST` | `/api/whatsapp/messages/send` | unknown | whatsapp.route.js |
| `GET` | `/api/whatsapp/conversations/:id/messages` | unknown | whatsapp.route.js |
| `POST` | `/api/whatsapp/conversations/:id/read` | unknown | whatsapp.route.js |
| `PUT` | `/api/whatsapp/conversations/:id/assign` | unknown | whatsapp.route.js |
| `POST` | `/api/whatsapp/conversations/:id/link-lead` | unknown | whatsapp.route.js |
| `POST` | `/api/whatsapp/conversations/:id/create-lead` | unknown | whatsapp.route.js |
| `POST` | `/api/whatsapp/templates/:id/submit` | unknown | whatsapp.route.js |
| `GET` | `/api/whatsapp/analytics` | unknown | whatsapp.route.js |
| `GET` | `/api/whatsapp/stats` | unknown | whatsapp.route.js |
| `GET` | `/api/whatsapp/broadcasts/stats` | unknown | whatsapp.route.js |
| `POST` | `/api/whatsapp/broadcasts/:id/duplicate` | unknown | whatsapp.route.js |
| `POST` | `/api/whatsapp/broadcasts/:id/recipients` | unknown | whatsapp.route.js |
| `DELETE` | `/api/whatsapp/broadcasts/:id/recipients` | unknown | whatsapp.route.js |
| `POST` | `/api/whatsapp/broadcasts/:id/schedule` | unknown | whatsapp.route.js |
| `POST` | `/api/whatsapp/broadcasts/:id/send` | unknown | whatsapp.route.js |
| `POST` | `/api/whatsapp/broadcasts/:id/pause` | unknown | whatsapp.route.js |
| `POST` | `/api/whatsapp/broadcasts/:id/resume` | unknown | whatsapp.route.js |
| `POST` | `/api/whatsapp/broadcasts/:id/cancel` | unknown | whatsapp.route.js |
| `GET` | `/api/whatsapp/broadcasts/:id/analytics` | unknown | whatsapp.route.js |
| `POST` | `/api/whatsapp/broadcasts/:id/test` | unknown | whatsapp.route.js |

## whosOut

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/hr/whos-out/today` | unknown | whosOut.route.js |
| `GET` | `/api/hr/whos-out/week` | unknown | whosOut.route.js |
| `GET` | `/api/hr/whos-out/month` | unknown | whosOut.route.js |
| `GET` | `/api/hr/whos-out/upcoming` | unknown | whosOut.route.js |
| `GET` | `/api/hr/whos-out/departments` | unknown | whosOut.route.js |
| `GET` | `/api/hr/whos-out/coverage/:department` | unknown | whosOut.route.js |

## workflow

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/case-workflows/templates` | listTemplates | workflow.route.js |
| `POST` | `/api/case-workflows/templates` | createTemplate | workflow.route.js |
| `GET` | `/api/case-workflows/templates/:id` | getTemplate | workflow.route.js |
| `PUT` | `/api/case-workflows/templates/:id` | updateTemplate | workflow.route.js |
| `DELETE` | `/api/case-workflows/templates/:id` | deleteTemplate | workflow.route.js |
| `GET` | `/api/case-workflows/instances` | listInstances | workflow.route.js |
| `POST` | `/api/case-workflows/instances` | startWorkflow | workflow.route.js |
| `GET` | `/api/case-workflows/instances/:id` | getWorkflowStatus | workflow.route.js |
| `POST` | `/api/case-workflows/instances/:id/pause` | pauseWorkflow | workflow.route.js |
| `POST` | `/api/case-workflows/instances/:id/resume` | resumeWorkflow | workflow.route.js |
| `POST` | `/api/case-workflows/instances/:id/cancel` | cancelWorkflow | workflow.route.js |
| `POST` | `/api/case-workflows/instances/:id/advance` | advanceStep | workflow.route.js |
| `GET` | `/api/case-workflows/entity/:entityType/:entityId` | getActiveWorkflows | workflow.route.js |

## workflowExtended

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/workflow/instances` | unknown | workflowExtended.route.js |
| `GET` | `/api/workflow/instances/:id` | unknown | workflowExtended.route.js |
| `POST` | `/api/workflow/instances/:id/advance` | unknown | workflowExtended.route.js |
| `POST` | `/api/workflow/instances/:id/cancel` | unknown | workflowExtended.route.js |
| `POST` | `/api/workflow/instances/:id/pause` | unknown | workflowExtended.route.js |
| `POST` | `/api/workflow/instances/:id/resume` | unknown | workflowExtended.route.js |
| `GET` | `/api/workflow/templates` | unknown | workflowExtended.route.js |
| `GET` | `/api/workflow/templates/:id` | unknown | workflowExtended.route.js |
| `GET` | `/api/workflow/entity/:entityType/:entityId` | unknown | workflowExtended.route.js |
| `GET` | `/api/workflow/presets` | unknown | workflowExtended.route.js |
| `GET` | `/api/workflow/presets/:presetType` | unknown | workflowExtended.route.js |
| `GET` | `/api/workflow/stats` | unknown | workflowExtended.route.js |
| `GET` | `/api/workflow/category/:category` | unknown | workflowExtended.route.js |
| `POST` | `/api/workflow/cases/:caseId/initialize` | unknown | workflowExtended.route.js |
| `POST` | `/api/workflow/cases/:caseId/move` | unknown | workflowExtended.route.js |
| `GET` | `/api/workflow/cases/:caseId/progress` | unknown | workflowExtended.route.js |
| `POST` | `/api/workflow/cases/:caseId/requirements/:requirementId/complete` | unknown | workflowExtended.route.js |

## workflows

| Method | Path | Controller | File |
|--------|------|------------|------|
| `POST` | `/api/workflows/leads/:id/convert-to-opportunity` | unknown | workflow.routes.js |
| `POST` | `/api/workflows/leads/:id/convert-to-client` | unknown | workflow.routes.js |
| `POST` | `/api/workflows/leads/:id/create-quote` | unknown | workflow.routes.js |
| `POST` | `/api/workflows/leads/:id/assign` | unknown | workflow.routes.js |
| `POST` | `/api/workflows/leads/:id/reassign` | unknown | workflow.routes.js |
| `POST` | `/api/workflows/leads/bulk-assign` | unknown | workflow.routes.js |
| `POST` | `/api/workflows/leads/:id/qualify` | unknown | workflow.routes.js |
| `POST` | `/api/workflows/leads/:id/disqualify` | unknown | workflow.routes.js |
| `GET` | `/api/workflows/leads/:id/qualification-score` | unknown | workflow.routes.js |
| `POST` | `/api/workflows/leads/:id/start-nurturing` | unknown | workflow.routes.js |
| `POST` | `/api/workflows/leads/:id/pause-nurturing` | unknown | workflow.routes.js |
| `POST` | `/api/workflows/leads/:id/resume-nurturing` | unknown | workflow.routes.js |
| `GET` | `/api/workflows/leads/:id/next-nurturing-step` | unknown | workflow.routes.js |
| `POST` | `/api/workflows/leads/:id/move-stage` | unknown | workflow.routes.js |
| `POST` | `/api/workflows/leads/:id/progress-stage` | unknown | workflow.routes.js |
| `POST` | `/api/workflows/leads/:id/mark-won` | unknown | workflow.routes.js |
| `POST` | `/api/workflows/leads/:id/mark-lost` | unknown | workflow.routes.js |
| `GET` | `/api/workflows/leads/:id/workflow-history` | unknown | workflow.routes.js |
| `GET` | `/api/workflows/leads/stats` | unknown | workflow.routes.js |
| `POST` | `/api/workflows/quotes/from-lead/:leadId` | unknown | workflow.routes.js |
| `POST` | `/api/workflows/quotes/from-client/:clientId` | unknown | workflow.routes.js |
| `POST` | `/api/workflows/quotes/:id/duplicate` | unknown | workflow.routes.js |
| `POST` | `/api/workflows/quotes/:id/revision` | unknown | workflow.routes.js |
| `GET` | `/api/workflows/quotes/:id/version-history` | unknown | workflow.routes.js |
| `GET` | `/api/workflows/quotes/:id/compare-versions` | unknown | workflow.routes.js |
| `POST` | `/api/workflows/quotes/:id/submit-approval` | unknown | workflow.routes.js |
| `POST` | `/api/workflows/quotes/:id/approve` | unknown | workflow.routes.js |
| `POST` | `/api/workflows/quotes/:id/reject` | unknown | workflow.routes.js |
| `GET` | `/api/workflows/quotes/:id/approval-status` | unknown | workflow.routes.js |
| `GET` | `/api/workflows/quotes/pending-approvals` | unknown | workflow.routes.js |
| `POST` | `/api/workflows/quotes/:id/send` | unknown | workflow.routes.js |
| `POST` | `/api/workflows/quotes/:id/resend` | unknown | workflow.routes.js |
| `GET` | `/api/workflows/quotes/:id/view-link` | unknown | workflow.routes.js |
| `POST` | `/api/workflows/quotes/:id/track-view` | unknown | workflow.routes.js |
| `POST` | `/api/workflows/quotes/:id/convert-to-invoice` | unknown | workflow.routes.js |
| `GET` | `/api/workflows/quotes/:id/check-expiry` | unknown | workflow.routes.js |
| `POST` | `/api/workflows/quotes/:id/extend-validity` | unknown | workflow.routes.js |
| `POST` | `/api/workflows/quotes/process-expired` | unknown | workflow.routes.js |
| `GET` | `/api/workflows/quotes/metrics` | unknown | workflow.routes.js |
| `GET` | `/api/workflows/quotes/conversion-rate` | unknown | workflow.routes.js |
| `POST` | `/api/workflows/activities/schedule` | unknown | workflow.routes.js |
| `POST` | `/api/workflows/activities/:id/reschedule` | unknown | workflow.routes.js |
| `POST` | `/api/workflows/activities/:id/cancel` | unknown | workflow.routes.js |
| `POST` | `/api/workflows/activities/bulk-schedule` | unknown | workflow.routes.js |
| `POST` | `/api/workflows/activities/:id/reminder` | unknown | workflow.routes.js |
| `PUT` | `/api/workflows/activities/:id/reminder` | unknown | workflow.routes.js |
| `GET` | `/api/workflows/activities/due-reminders` | unknown | workflow.routes.js |
| `POST` | `/api/workflows/activities/:id/reminder-sent` | unknown | workflow.routes.js |
| `POST` | `/api/workflows/activities/:id/snooze` | unknown | workflow.routes.js |
| `POST` | `/api/workflows/activities/:id/complete` | unknown | workflow.routes.js |
| `POST` | `/api/workflows/activities/:id/partial-complete` | unknown | workflow.routes.js |
| `POST` | `/api/workflows/activities/:id/undo-complete` | unknown | workflow.routes.js |
| `POST` | `/api/workflows/activities/:id/trigger-next` | unknown | workflow.routes.js |
| `POST` | `/api/workflows/activities/chain` | unknown | workflow.routes.js |
| `GET` | `/api/workflows/activities/chain/:chainId/status` | unknown | workflow.routes.js |
| `POST` | `/api/workflows/activities/plans/:planId/start` | unknown | workflow.routes.js |
| `POST` | `/api/workflows/activities/executions/:executionId/pause` | unknown | workflow.routes.js |
| `POST` | `/api/workflows/activities/executions/:executionId/resume` | unknown | workflow.routes.js |
| `POST` | `/api/workflows/activities/executions/:executionId/skip-step` | unknown | workflow.routes.js |
| `GET` | `/api/workflows/activities/executions/:executionId/progress` | unknown | workflow.routes.js |
| `POST` | `/api/workflows/activities/recurring` | unknown | workflow.routes.js |
| `PUT` | `/api/workflows/activities/:id/recurrence` | unknown | workflow.routes.js |
| `POST` | `/api/workflows/activities/:id/generate-next` | unknown | workflow.routes.js |
| `POST` | `/api/workflows/activities/:id/end-recurrence` | unknown | workflow.routes.js |
| `GET` | `/api/workflows/activities/completion-rate` | unknown | workflow.routes.js |
| `GET` | `/api/workflows/activities/overdue` | unknown | workflow.routes.js |
| `GET` | `/api/workflows/activities/load` | unknown | workflow.routes.js |
| `POST` | `/api/workflows/campaigns/create` | unknown | workflow.routes.js |
| `POST` | `/api/workflows/campaigns/:id/duplicate` | unknown | workflow.routes.js |
| `POST` | `/api/workflows/campaigns/from-template/:templateId` | unknown | workflow.routes.js |
| `POST` | `/api/workflows/campaigns/:id/launch` | unknown | workflow.routes.js |
| `POST` | `/api/workflows/campaigns/:id/pause` | unknown | workflow.routes.js |
| `POST` | `/api/workflows/campaigns/:id/resume` | unknown | workflow.routes.js |
| `POST` | `/api/workflows/campaigns/:id/complete` | unknown | workflow.routes.js |
| `POST` | `/api/workflows/campaigns/:id/cancel` | unknown | workflow.routes.js |
| `POST` | `/api/workflows/campaigns/:id/add-contacts` | unknown | workflow.routes.js |
| `POST` | `/api/workflows/campaigns/:id/remove-contacts` | unknown | workflow.routes.js |
| `POST` | `/api/workflows/campaigns/:id/segment-audience` | unknown | workflow.routes.js |
| `GET` | `/api/workflows/campaigns/:id/eligible-contacts` | unknown | workflow.routes.js |
| `POST` | `/api/workflows/campaigns/:id/send-batch` | unknown | workflow.routes.js |
| `POST` | `/api/workflows/campaigns/:id/schedule-send` | unknown | workflow.routes.js |
| `POST` | `/api/workflows/campaigns/:id/send-test` | unknown | workflow.routes.js |
| `POST` | `/api/workflows/campaigns/:id/track-open` | unknown | workflow.routes.js |
| `POST` | `/api/workflows/campaigns/:id/track-click` | unknown | workflow.routes.js |
| `POST` | `/api/workflows/campaigns/:id/track-response` | unknown | workflow.routes.js |
| `POST` | `/api/workflows/campaigns/:id/track-conversion` | unknown | workflow.routes.js |
| `GET` | `/api/workflows/campaigns/:id/performance` | unknown | workflow.routes.js |
| `GET` | `/api/workflows/campaigns/:id/roi` | unknown | workflow.routes.js |
| `GET` | `/api/workflows/campaigns/:id/engagement-stats` | unknown | workflow.routes.js |
| `GET` | `/api/workflows/campaigns/analytics/overview` | unknown | workflow.routes.js |
| `POST` | `/api/workflows/clients/:id/start-onboarding` | unknown | workflow.routes.js |
| `POST` | `/api/workflows/clients/:id/complete-onboarding-step` | unknown | workflow.routes.js |
| `GET` | `/api/workflows/clients/:id/onboarding-progress` | unknown | workflow.routes.js |
| `POST` | `/api/workflows/clients/:id/skip-onboarding-step` | unknown | workflow.routes.js |
| `POST` | `/api/workflows/clients/:id/complete-onboarding` | unknown | workflow.routes.js |
| `POST` | `/api/workflows/clients/:id/request-documents` | unknown | workflow.routes.js |
| `POST` | `/api/workflows/clients/:id/approve-document` | unknown | workflow.routes.js |
| `POST` | `/api/workflows/clients/:id/reject-document` | unknown | workflow.routes.js |
| `GET` | `/api/workflows/clients/:id/pending-documents` | unknown | workflow.routes.js |
| `POST` | `/api/workflows/clients/:id/schedule-check-in` | unknown | workflow.routes.js |
| `POST` | `/api/workflows/clients/:id/record-interaction` | unknown | workflow.routes.js |
| `POST` | `/api/workflows/clients/:id/send-update` | unknown | workflow.routes.js |
| `GET` | `/api/workflows/clients/:id/engagement-score` | unknown | workflow.routes.js |
| `POST` | `/api/workflows/clients/:id/activate` | unknown | workflow.routes.js |
| `POST` | `/api/workflows/clients/:id/deactivate` | unknown | workflow.routes.js |
| `POST` | `/api/workflows/clients/:id/mark-at-risk` | unknown | workflow.routes.js |
| `POST` | `/api/workflows/clients/:id/upgrade-tier` | unknown | workflow.routes.js |
| `POST` | `/api/workflows/clients/:id/downgrade-tier` | unknown | workflow.routes.js |
| `POST` | `/api/workflows/clients/:id/start-retention-campaign` | unknown | workflow.routes.js |
| `POST` | `/api/workflows/clients/:id/schedule-renewal` | unknown | workflow.routes.js |
| `GET` | `/api/workflows/clients/:id/renewal-probability` | unknown | workflow.routes.js |
| `POST` | `/api/workflows/clients/:id/win-back` | unknown | workflow.routes.js |
| `POST` | `/api/workflows/clients/:id/start-offboarding` | unknown | workflow.routes.js |
| `POST` | `/api/workflows/clients/:id/complete-offboarding-step` | unknown | workflow.routes.js |
| `GET` | `/api/workflows/clients/:id/offboarding-progress` | unknown | workflow.routes.js |
| `POST` | `/api/workflows/clients/:id/complete-offboarding` | unknown | workflow.routes.js |
| `POST` | `/api/workflows/clients/:id/send-portal-invite` | unknown | workflow.routes.js |
| `POST` | `/api/workflows/clients/:id/send-satisfaction-survey` | unknown | workflow.routes.js |
| `POST` | `/api/workflows/clients/:id/request-review` | unknown | workflow.routes.js |
| `POST` | `/api/workflows/clients/:id/send-referral-request` | unknown | workflow.routes.js |
| `GET` | `/api/workflows/clients/:id/lifecycle-stage` | unknown | workflow.routes.js |
| `GET` | `/api/workflows/clients/:id/lifetime-value` | unknown | workflow.routes.js |
| `GET` | `/api/workflows/clients/:id/health-score` | unknown | workflow.routes.js |
| `GET` | `/api/workflows/clients/retention-metrics` | unknown | workflow.routes.js |
| `POST` | `/api/workflows/approvals/submit` | unknown | workflow.routes.js |
| `POST` | `/api/workflows/approvals/:id/reassign` | unknown | workflow.routes.js |
| `POST` | `/api/workflows/approvals/:id/escalate` | unknown | workflow.routes.js |
| `POST` | `/api/workflows/approvals/:id/recall` | unknown | workflow.routes.js |
| `POST` | `/api/workflows/approvals/:id/approve` | unknown | workflow.routes.js |
| `POST` | `/api/workflows/approvals/:id/reject` | unknown | workflow.routes.js |
| `POST` | `/api/workflows/approvals/:id/request-changes` | unknown | workflow.routes.js |
| `POST` | `/api/workflows/approvals/:id/conditional-approve` | unknown | workflow.routes.js |
| `POST` | `/api/workflows/approvals/:id/advance-stage` | unknown | workflow.routes.js |
| `POST` | `/api/workflows/approvals/:id/skip-stage` | unknown | workflow.routes.js |
| `GET` | `/api/workflows/approvals/:id/current-stage` | unknown | workflow.routes.js |
| `GET` | `/api/workflows/approvals/:id/approval-chain` | unknown | workflow.routes.js |
| `POST` | `/api/workflows/approvals/:id/delegate` | unknown | workflow.routes.js |
| `POST` | `/api/workflows/approvals/:id/add-parallel-approver` | unknown | workflow.routes.js |
| `POST` | `/api/workflows/approvals/:id/remove-approver` | unknown | workflow.routes.js |
| `POST` | `/api/workflows/approvals/:id/send-reminder` | unknown | workflow.routes.js |
| `POST` | `/api/workflows/approvals/:id/notify-stakeholders` | unknown | workflow.routes.js |
| `POST` | `/api/workflows/approvals/send-daily-digest` | unknown | workflow.routes.js |
| `GET` | `/api/workflows/approvals/pending` | unknown | workflow.routes.js |
| `GET` | `/api/workflows/approvals/my-approvals` | unknown | workflow.routes.js |
| `GET` | `/api/workflows/approvals/:id/status` | unknown | workflow.routes.js |
| `GET` | `/api/workflows/approvals/:id/history` | unknown | workflow.routes.js |
| `GET` | `/api/workflows/approvals/:id/comments` | unknown | workflow.routes.js |
| `POST` | `/api/workflows/approvals/:id/apply-policy` | unknown | workflow.routes.js |
| `POST` | `/api/workflows/approvals/:id/override-policy` | unknown | workflow.routes.js |
| `GET` | `/api/workflows/approvals/policies/applicable` | unknown | workflow.routes.js |
| `GET` | `/api/workflows/approvals/metrics/cycle-time` | unknown | workflow.routes.js |
| `GET` | `/api/workflows/approvals/metrics/bottlenecks` | unknown | workflow.routes.js |
| `GET` | `/api/workflows/approvals/metrics/approval-rate` | unknown | workflow.routes.js |
| `GET` | `/api/workflows/approvals/analytics/overview` | unknown | workflow.routes.js |

## workflowsExtended

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/workflows/:id` | unknown | workflowsExtended.route.js |
| `PATCH` | `/api/workflows/:id` | unknown | workflowsExtended.route.js |
| `DELETE` | `/api/workflows/:id` | unknown | workflowsExtended.route.js |
| `POST` | `/api/workflows/:id/duplicate` | unknown | workflowsExtended.route.js |
| `POST` | `/api/workflows/:id/activate` | unknown | workflowsExtended.route.js |
| `POST` | `/api/workflows/:id/deactivate` | unknown | workflowsExtended.route.js |
| `GET` | `/api/workflows/:id/executions` | unknown | workflowsExtended.route.js |
| `POST` | `/api/workflows/:id/test` | unknown | workflowsExtended.route.js |
| `GET` | `/api/workflows/:id/analytics` | unknown | workflowsExtended.route.js |

## zatca

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/zatca/config` | unknown | zatca.route.js |
| `PUT` | `/api/zatca/config` | unknown | zatca.route.js |
| `POST` | `/api/zatca/validate` | unknown | zatca.route.js |
| `POST` | `/api/zatca/qr` | unknown | zatca.route.js |
| `POST` | `/api/zatca/hash` | unknown | zatca.route.js |
| `POST` | `/api/zatca/prepare/:invoiceId` | unknown | zatca.route.js |
| `POST` | `/api/zatca/submit/:invoiceId` | unknown | zatca.route.js |
| `POST` | `/api/zatca/submit/bulk` | unknown | zatca.route.js |
| `GET` | `/api/zatca/status/:invoiceId` | unknown | zatca.route.js |
| `GET` | `/api/zatca/stats` | unknown | zatca.route.js |
| `GET` | `/api/zatca/pending` | unknown | zatca.route.js |
| `GET` | `/api/zatca/failed` | unknown | zatca.route.js |

## zoom

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/zoom/auth-url` | getAuthUrl | zoom.route.js |
| `GET` | `/api/zoom/callback` | handleCallback | zoom.route.js |
| `POST` | `/api/zoom/disconnect` | disconnect | zoom.route.js |
| `GET` | `/api/zoom/status` | getStatus | zoom.route.js |
| `POST` | `/api/zoom/meetings` | createMeeting | zoom.route.js |
| `GET` | `/api/zoom/meetings` | listMeetings | zoom.route.js |
| `GET` | `/api/zoom/meetings/:meetingId` | getMeeting | zoom.route.js |
| `PUT` | `/api/zoom/meetings/:meetingId` | updateMeeting | zoom.route.js |
| `DELETE` | `/api/zoom/meetings/:meetingId` | deleteMeeting | zoom.route.js |
| `GET` | `/api/zoom/recordings` | getRecordings | zoom.route.js |
| `GET` | `/api/zoom/recordings/:meetingId` | getRecordings | zoom.route.js |
| `PUT` | `/api/zoom/settings` | updateSettings | zoom.route.js |
| `POST` | `/api/zoom/test` | testConnection | zoom.route.js |
| `POST` | `/api/zoom/webhook` | handleWebhook | zoom.route.js |

---

## Quick Reference by Method

### GET (2093)

<details>
<summary>Click to expand</summary>

```
GET    /api/accounts
GET    /api/accounts/:id
GET    /api/accounts/:id/balance
GET    /api/accounts/types
GET    /api/activities
GET    /api/activities/:id
GET    /api/activities/entity/:entityType/:entityId
GET    /api/activities/my
GET    /api/activities/overview
GET    /api/activities/stats
GET    /api/activities/summary
GET    /api/activities/types
GET    /api/activities/types/:id
GET    /api/activityPlans
GET    /api/activityPlans/:id
GET    /api/activitys
GET    /api/activitys/:id
GET    /api/activitys/my
GET    /api/activitys/stats
GET    /api/activitys/types
GET    /api/admin-api/audit/compliance-report
GET    /api/admin-api/audit/export
GET    /api/admin-api/audit/login-history
GET    /api/admin-api/audit/logs
GET    /api/admin-api/audit/security-events
GET    /api/admin-api/dashboard/active-users
GET    /api/admin-api/dashboard/pending-approvals
GET    /api/admin-api/dashboard/recent-activity
GET    /api/admin-api/dashboard/revenue
GET    /api/admin-api/dashboard/summary
GET    /api/admin-api/dashboard/system-health
GET    /api/admin-api/firms
GET    /api/admin-api/firms/:id
GET    /api/admin-api/firms/:id/usage
GET    /api/admin-api/users
GET    /api/admin-api/users/:id
GET    /api/admin-api/users/export
GET    /api/admin/firm/password-stats
GET    /api/admin/ldap/config
GET    /api/admin/revoked-tokens
GET    /api/admin/revoked-tokens/stats
GET    /api/admin/tools/activity-report
GET    /api/admin/tools/diagnostics
GET    /api/admin/tools/firms/:id/export
GET    /api/admin/tools/firms/:id/validate
GET    /api/admin/tools/key-rotation/check
GET    /api/admin/tools/key-rotation/status
GET    /api/admin/tools/slow-queries
GET    /api/admin/tools/stats
GET    /api/admin/tools/storage-usage
GET    /api/admin/tools/users/:id/data
GET    /api/admin/tools/users/:id/login-history
GET    /api/admin/users/:id/claims
GET    /api/admin/users/:id/claims/preview
GET    /api/admin/users/:id/revocations
GET    /api/ai-matching/patterns
GET    /api/ai-matching/patterns/stats
GET    /api/ai-matching/stats
GET    /api/ai-matching/suggestions
GET    /api/analytics-reports
GET    /api/analytics-reports/:id
GET    /api/analytics-reports/favorites
GET    /api/analytics-reports/pinned
GET    /api/analytics-reports/section/:section
GET    /api/analytics-reports/stats
GET    /api/analytics-reports/templates
GET    /api/analytics/kpi/case-throughput
GET    /api/analytics/kpi/kpi-dashboard
GET    /api/analytics/kpi/revenue-by-case
GET    /api/analytics/kpi/user-activation
GET    /api/analyticss/app/dashboard
GET    /api/analyticss/app/dropoff
GET    /api/analyticss/app/engagement
GET    /api/analyticss/app/export
GET    /api/analyticss/app/features
GET    /api/analyticss/app/features/popular
GET    /api/analyticss/app/funnel
GET    /api/analyticss/app/retention
GET    /api/analyticss/app/users/:userId/journey
GET    /api/analyticss/crm/activity
GET    /api/analyticss/crm/campaign-roi
GET    /api/analyticss/crm/cohort
GET    /api/analyticss/crm/conversion-rates
GET    /api/analyticss/crm/dashboard
GET    /api/analyticss/crm/first-response
GET    /api/analyticss/crm/forecast
GET    /api/analyticss/crm/forecast-accuracy
GET    /api/analyticss/crm/lead-sources
GET    /api/analyticss/crm/pipeline
GET    /api/analyticss/crm/revenue
GET    /api/analyticss/crm/sales-funnel
GET    /api/analyticss/crm/team-performance
GET    /api/analyticss/crm/territory
GET    /api/analyticss/crm/win-loss
GET    /api/analyticss/events/counts
GET    /api/answers/:questionId
GET    /api/api-keys
GET    /api/api-keys/:id
GET    /api/api-keys/stats
GET    /api/appointments
GET    /api/appointments/:id
GET    /api/appointments/:id/calendar-links
GET    /api/appointments/:id/calendar.ics
GET    /api/appointments/availability
GET    /api/appointments/available-slots
GET    /api/appointments/blocked-times
GET    /api/appointments/calendar-status
GET    /api/appointments/debug
GET    /api/appointments/settings
GET    /api/appointments/slots
GET    /api/appointments/stats
GET    /api/approvals/:id
GET    /api/approvals/history
GET    /api/approvals/history
GET    /api/approvals/history/:entityType/:entityId
GET    /api/approvals/my-requests
GET    /api/approvals/pending
GET    /api/approvals/pending
GET    /api/approvals/pending
GET    /api/approvals/rules
GET    /api/approvals/stats
GET    /api/approvals/templates
GET    /api/approvals/templates/:id
GET    /api/approvals/workflows
GET    /api/approvals/workflows/:id
GET    /api/apps
GET    /api/apps/:appId
GET    /api/apps/:appId/settings
GET    /api/apps/categories
GET    /api/apps/stats
GET    /api/ar-aging/client/:clientId
GET    /api/ar-aging/export
GET    /api/ar-aging/forecast
GET    /api/ar-aging/priority/:invoiceId
GET    /api/ar-aging/report
GET    /api/ar-aging/summary
GET    /api/assets
GET    /api/assets/:assetId/depreciation
GET    /api/assets/:assetId/maintenance
GET    /api/assets/:assetId/maintenance/:scheduleId
GET    /api/assets/:id
GET    /api/assets/categories
GET    /api/assets/categories/:id
GET    /api/assets/maintenance
GET    /api/assets/maintenance/:id
GET    /api/assets/movements
GET    /api/assets/repairs
GET    /api/assets/repairs/:id
GET    /api/assets/settings
GET    /api/assets/stats
GET    /api/attendance
GET    /api/attendance/:id
GET    /api/attendance/:id/breaks
GET    /api/attendance/compliance-report
GET    /api/attendance/corrections/pending
GET    /api/attendance/daily-summary
GET    /api/attendance/employee-summary/:employeeId
GET    /api/attendance/employee/:employeeId/date/:date
GET    /api/attendance/report/monthly
GET    /api/attendance/stats
GET    /api/attendance/stats/department
GET    /api/attendance/status/:employeeId
GET    /api/attendance/summary/:employeeId
GET    /api/attendance/today
GET    /api/attendance/violations
GET    /api/audit
GET    /api/audit-logs
GET    /api/audit-logs/analytics/activity-summary
GET    /api/audit-logs/analytics/anomalies
GET    /api/audit-logs/analytics/top-actions
GET    /api/audit-logs/analytics/top-users
GET    /api/audit-logs/archive/stats
GET    /api/audit-logs/archiving/stats
GET    /api/audit-logs/archiving/summary
GET    /api/audit-logs/by-action/:action
GET    /api/audit-logs/by-date-range
GET    /api/audit-logs/compliance-report
GET    /api/audit-logs/compliance/retention-status
GET    /api/audit-logs/entity/:type/:id
GET    /api/audit-logs/export
GET    /api/audit-logs/export
GET    /api/audit-logs/failed-logins
GET    /api/audit-logs/recent
GET    /api/audit-logs/resource/:resource/:resourceId
GET    /api/audit-logs/search
GET    /api/audit-logs/security
GET    /api/audit-logs/security-events
GET    /api/audit-logs/stats
GET    /api/audit-logs/summary
GET    /api/audit-logs/suspicious
GET    /api/audit-logs/user/:id
GET    /api/audit-logs/user/:userId
GET    /api/audit/export
GET    /api/audit/options
GET    /api/audit/stats
GET    /api/audit/user/:userId
GET    /api/auth/captcha/providers
GET    /api/auth/captcha/settings
GET    /api/auth/captcha/status/:provider
GET    /api/auth/csrf
GET    /api/auth/me
GET    /api/auth/mfa/backup-codes/count
GET    /api/auth/mfa/backup-codes/count
GET    /api/auth/mfa/required
GET    /api/auth/mfa/status
GET    /api/auth/mfa/status
GET    /api/auth/onboarding-status
GET    /api/auth/otp-status
GET    /api/auth/password-status
GET    /api/auth/phone/otp-status
GET    /api/auth/reauthenticate/methods
GET    /api/auth/reauthenticate/status
GET    /api/auth/reset-password/validate
GET    /api/auth/saml/config
GET    /api/auth/saml/login/:firmId
GET    /api/auth/saml/logout/:firmId
GET    /api/auth/saml/metadata/:firmId
GET    /api/auth/sessions
GET    /api/auth/sessions/current
GET    /api/auth/sessions/stats
GET    /api/auth/sso/:providerType/authorize
GET    /api/auth/sso/:providerType/callback
GET    /api/auth/sso/domain/:domain
GET    /api/auth/sso/linked
GET    /api/auth/sso/providers
GET    /api/auth/webauthn/credentials
GET    /api/automated-actions
GET    /api/automated-actions/:actionId/logs
GET    /api/automated-actions/:id
GET    /api/automated-actions/logs
GET    /api/automated-actions/models
GET    /api/automated-actions/models/:modelName/fields
GET    /api/automatedActions
GET    /api/automatedActions/:id
GET    /api/automatedActions/:id/logs
GET    /api/automatedActions/logs
GET    /api/automatedActions/models
GET    /api/automatedActions/models/:modelName/fields
GET    /api/automations
GET    /api/automations/:id
GET    /api/automations/:id/logs
GET    /api/automations/:id/stats
GET    /api/bank-accounts
GET    /api/bank-accounts/:id
GET    /api/bank-accounts/:id/balance-history
GET    /api/bank-accounts/summary
GET    /api/bank-reconciliation
GET    /api/bank-reconciliation/:id
GET    /api/bank-reconciliation/currency/rates
GET    /api/bank-reconciliation/currency/supported
GET    /api/bank-reconciliation/feeds
GET    /api/bank-reconciliation/import/template
GET    /api/bank-reconciliation/rules
GET    /api/bank-reconciliation/statistics/matches
GET    /api/bank-reconciliation/statistics/rules
GET    /api/bank-reconciliation/status/:accountId
GET    /api/bank-reconciliation/suggestions/:accountId
GET    /api/bank-reconciliation/unmatched/:accountId
GET    /api/bank-transactions
GET    /api/bank-transactions/:id
GET    /api/bank-transfers
GET    /api/bank-transfers/:id
GET    /api/bill-payments
GET    /api/bill-payments/:id
GET    /api/billing/groups
GET    /api/billing/groups/:id
GET    /api/billing/groups/default
GET    /api/billing/invoices
GET    /api/billing/invoices/:id
GET    /api/billing/invoices/:id/pdf
GET    /api/billing/payment-methods
GET    /api/billing/plans
GET    /api/billing/rates
GET    /api/billing/rates/:id
GET    /api/billing/rates/applicable
GET    /api/billing/rates/stats
GET    /api/billing/subscription
GET    /api/billing/usage
GET    /api/bills
GET    /api/bills/:id
GET    /api/bills/export
GET    /api/bills/overdue
GET    /api/bills/recurring
GET    /api/bills/reports/aging
GET    /api/bills/summary
GET    /api/biometric/devices
GET    /api/biometric/devices/:id
GET    /api/biometric/enrollments
GET    /api/biometric/enrollments/:id
GET    /api/biometric/enrollments/employee/:employeeId
GET    /api/biometric/enrollments/stats
GET    /api/biometric/geofence
GET    /api/biometric/geofence/:id
GET    /api/biometric/logs
GET    /api/biometric/logs/daily-summary
GET    /api/biometric/logs/failed
GET    /api/biometric/logs/spoofing
GET    /api/biometric/logs/stats
GET    /api/budgets
GET    /api/budgets/:budgetId/distribution
GET    /api/budgets/:budgetId/lines
GET    /api/budgets/:budgetId/vs-actual
GET    /api/budgets/:id
GET    /api/budgets/check
GET    /api/budgets/stats
GET    /api/bulkActionss/:jobId/progress
GET    /api/bulkActionss/supported/:entityType?
GET    /api/buying/material-requests
GET    /api/buying/material-requests/:id
GET    /api/buying/purchase-invoices
GET    /api/buying/purchase-invoices/:id
GET    /api/buying/purchase-orders
GET    /api/buying/purchase-orders/:id
GET    /api/buying/purchase-receipts
GET    /api/buying/purchase-receipts/:id
GET    /api/buying/rfqs
GET    /api/buying/rfqs/:id
GET    /api/buying/settings
GET    /api/buying/stats
GET    /api/buying/supplier-groups
GET    /api/buying/suppliers
GET    /api/buying/suppliers/:id
GET    /api/calendar
GET    /api/calendar/date/:date
GET    /api/calendar/grid-items
GET    /api/calendar/grid-summary
GET    /api/calendar/item/:type/:id
GET    /api/calendar/list
GET    /api/calendar/month/:year/:month
GET    /api/calendar/overdue
GET    /api/calendar/sidebar-data
GET    /api/calendar/stats
GET    /api/calendar/upcoming
GET    /api/campaigns
GET    /api/campaigns/:id
GET    /api/campaigns/:id/leads
GET    /api/campaigns/:id/stats
GET    /api/case-notion/cases/:caseId/notion/blocks/:blockId/comments
GET    /api/case-notion/cases/:caseId/notion/blocks/:blockId/connections
GET    /api/case-notion/cases/:caseId/notion/frames/:frameId/children
GET    /api/case-notion/cases/:caseId/notion/pages
GET    /api/case-notion/cases/:caseId/notion/pages/:pageId
GET    /api/case-notion/cases/:caseId/notion/pages/:pageId/activity
GET    /api/case-notion/cases/:caseId/notion/pages/:pageId/blocks
GET    /api/case-notion/cases/:caseId/notion/pages/:pageId/connections
GET    /api/case-notion/cases/:caseId/notion/pages/:pageId/export/html
GET    /api/case-notion/cases/:caseId/notion/pages/:pageId/export/markdown
GET    /api/case-notion/cases/:caseId/notion/pages/:pageId/export/pdf
GET    /api/case-notion/cases/:caseId/notion/pages/:pageId/history-status
GET    /api/case-notion/cases/:caseId/notion/search
GET    /api/case-notion/cases/:caseId/notion/synced-blocks/:blockId
GET    /api/case-notion/notion/cases
GET    /api/case-notion/notion/templates
GET    /api/case-workflows/entity/:entityType/:entityId
GET    /api/case-workflows/instances
GET    /api/case-workflows/instances/:id
GET    /api/case-workflows/templates
GET    /api/case-workflows/templates/:id
GET    /api/cases
GET    /api/cases/:_id
GET    /api/cases/:_id/audit
GET    /api/cases/:_id/documents/:docId/download
GET    /api/cases/:_id/full
GET    /api/cases/:_id/notes
GET    /api/cases/:_id/rich-documents
GET    /api/cases/:_id/rich-documents/:docId
GET    /api/cases/:_id/rich-documents/:docId/export/latex
GET    /api/cases/:_id/rich-documents/:docId/export/markdown
GET    /api/cases/:_id/rich-documents/:docId/export/pdf
GET    /api/cases/:_id/rich-documents/:docId/preview
GET    /api/cases/:_id/rich-documents/:docId/versions
GET    /api/cases/:id/workflow/status
GET    /api/cases/overview
GET    /api/cases/pipeline
GET    /api/cases/pipeline/grouped
GET    /api/cases/pipeline/stages/:category
GET    /api/cases/pipeline/statistics
GET    /api/cases/statistics
GET    /api/chat/conversations
GET    /api/chat/conversations/:conversationId
GET    /api/chat/providers
GET    /api/chatter/activities/:resModel/:resId
GET    /api/chatter/activities/me
GET    /api/chatter/followers/:resModel/:resId
GET    /api/chatterFollowers/:model/:recordId/followers
GET    /api/chatterFollowers/my-followed
GET    /api/churn/analytics/cohorts
GET    /api/churn/analytics/dashboard
GET    /api/churn/analytics/rate
GET    /api/churn/analytics/reasons
GET    /api/churn/analytics/revenue-at-risk
GET    /api/churn/at-risk
GET    /api/churn/events
GET    /api/churn/health-score/:firmId
GET    /api/churn/health-score/:firmId/history
GET    /api/churn/interventions/:firmId
GET    /api/churn/interventions/stats
GET    /api/churn/reports/at-risk-export
GET    /api/churn/reports/executive-summary
GET    /api/churn/reports/generate
GET    /api/clients
GET    /api/clients/:id
GET    /api/clients/:id/billing-info
GET    /api/clients/:id/cases
GET    /api/clients/:id/full
GET    /api/clients/:id/invoices
GET    /api/clients/:id/payments
GET    /api/clients/:id/wathq/:dataType
GET    /api/clients/search
GET    /api/clients/stats
GET    /api/clients/top-revenue
GET    /api/cloudStorages/:provider/auth
GET    /api/cloudStorages/:provider/callback
GET    /api/cloudStorages/:provider/files
GET    /api/cloudStorages/:provider/files/:fileId
GET    /api/cloudStorages/:provider/files/:fileId/metadata
GET    /api/cloudStorages/:provider/status
GET    /api/cloudStorages/providers
GET    /api/commandPalettes/commands
GET    /api/commandPalettes/recent
GET    /api/commandPalettes/saved-searches
GET    /api/commandPalettes/search
GET    /api/compensatory-leave-requests
GET    /api/compensatory-leave-requests/:id
GET    /api/compensatory-leave-requests/balance/:employeeId
GET    /api/compensatory-leave-requests/expiring
GET    /api/compensatory-leave-requests/export
GET    /api/compensatory-leave-requests/holiday-work-records
GET    /api/compensatory-leave-requests/pending-approvals
GET    /api/compensatory-leave-requests/policy
GET    /api/compensatory-leave-requests/stats
GET    /api/competitors
GET    /api/competitors
GET    /api/competitors/:id
GET    /api/competitors/:id
GET    /api/competitors/top-losses
GET    /api/conflict-checks
GET    /api/conflict-checks/:id
GET    /api/conflict-checks/stats
GET    /api/consent
GET    /api/consent/history
GET    /api/contactLists
GET    /api/contactLists/:id
GET    /api/contactLists/:id/members
GET    /api/contacts
GET    /api/contacts/:id
GET    /api/contacts/case/:caseId
GET    /api/contacts/client/:clientId
GET    /api/contacts/search
GET    /api/contracts
GET    /api/contracts/:contractId
GET    /api/contracts/:contractId/amendments
GET    /api/contracts/:contractId/export/pdf
GET    /api/contracts/:contractId/export/word
GET    /api/contracts/:contractId/notarization/verify
GET    /api/contracts/:contractId/reminders
GET    /api/contracts/:contractId/signatures
GET    /api/contracts/:contractId/versions
GET    /api/contracts/client/:clientId
GET    /api/contracts/expiring
GET    /api/contracts/search
GET    /api/contracts/statistics
GET    /api/contracts/templates
GET    /api/conversations
GET    /api/conversations
GET    /api/conversations/:id
GET    /api/conversations/single/:sellerID/:buyerID
GET    /api/conversations/stats
GET    /api/corporate-cards
GET    /api/corporate-cards/:id
GET    /api/corporate-cards/:id/transactions
GET    /api/corporate-cards/:id/transactions/unmatched
GET    /api/corporate-cards/analytics/monthly-trend
GET    /api/corporate-cards/analytics/spending-by-card
GET    /api/corporate-cards/analytics/spending-by-category
GET    /api/corporate-cards/reports/reconciliation
GET    /api/corporate-cards/reports/reconciliation/export
GET    /api/corporate-cards/spending-stats
GET    /api/corporate-cards/statistics
GET    /api/corporate-cards/summary
GET    /api/corporate-cards/transactions
GET    /api/corporate-cards/transactions/:id
GET    /api/corporate-cards/transactions/:transactionId/potential-matches
GET    /api/corporate-cards/transactions/csv-template
GET    /api/credit-notes
GET    /api/credit-notes/:id
GET    /api/credit-notes/invoice/:invoiceId
GET    /api/credit-notes/stats
GET    /api/crm-activities
GET    /api/crm-activities/:id
GET    /api/crm-activities/entity/:entityType/:entityId
GET    /api/crm-activities/stats
GET    /api/crm-activities/tasks/upcoming
GET    /api/crm-activities/timeline
GET    /api/crm-pipelines
GET    /api/crm-pipelines/:id
GET    /api/crm-pipelines/:id/stats
GET    /api/crm-reports/activities/calls
GET    /api/crm-reports/activities/emails
GET    /api/crm-reports/activities/meetings
GET    /api/crm-reports/activities/summary
GET    /api/crm-reports/activities/tasks
GET    /api/crm-reports/activity/by-day-of-week
GET    /api/crm-reports/activity/by-hour
GET    /api/crm-reports/activity/leaderboard
GET    /api/crm-reports/activity/overview
GET    /api/crm-reports/aging/by-stage
GET    /api/crm-reports/aging/overview
GET    /api/crm-reports/campaign-efficiency
GET    /api/crm-reports/first-response-time
GET    /api/crm-reports/forecast/by-month
GET    /api/crm-reports/forecast/by-rep
GET    /api/crm-reports/forecast/overview
GET    /api/crm-reports/funnel/bottlenecks
GET    /api/crm-reports/funnel/overview
GET    /api/crm-reports/funnel/velocity
GET    /api/crm-reports/lead-conversion-time
GET    /api/crm-reports/lead-owner-efficiency
GET    /api/crm-reports/leads-source/overview
GET    /api/crm-reports/leads-source/trend
GET    /api/crm-reports/leads/by-source
GET    /api/crm-reports/leads/conversion-funnel
GET    /api/crm-reports/leads/distribution
GET    /api/crm-reports/leads/response-time
GET    /api/crm-reports/leads/velocity-rate
GET    /api/crm-reports/lost-opportunity
GET    /api/crm-reports/performance/activity-metrics
GET    /api/crm-reports/performance/leaderboard
GET    /api/crm-reports/performance/rep-scorecard/:userId
GET    /api/crm-reports/performance/team
GET    /api/crm-reports/pipeline/deal-aging
GET    /api/crm-reports/pipeline/movement
GET    /api/crm-reports/pipeline/overview
GET    /api/crm-reports/pipeline/stage-duration
GET    /api/crm-reports/pipeline/velocity
GET    /api/crm-reports/prospects-engaged
GET    /api/crm-reports/quick-stats
GET    /api/crm-reports/recent-activity
GET    /api/crm-reports/revenue/analysis
GET    /api/crm-reports/revenue/deal-size
GET    /api/crm-reports/revenue/forecast
GET    /api/crm-reports/revenue/quota-attainment
GET    /api/crm-reports/revenue/win-rate
GET    /api/crm-reports/sales-pipeline
GET    /api/crm-reports/win-loss/overview
GET    /api/crm-reports/win-loss/reasons
GET    /api/crm-reports/win-loss/trend
GET    /api/crm-transactions
GET    /api/crm-transactions/daily-report
GET    /api/crm-transactions/entity/:entityType/:entityId
GET    /api/crm-transactions/export
GET    /api/crm-transactions/forecast-by-category
GET    /api/crm-transactions/forecast-trends
GET    /api/crm-transactions/leads-needing-attention
GET    /api/crm-transactions/pipeline-velocity
GET    /api/crm-transactions/revenue-forecast
GET    /api/crm-transactions/revenue-forecast/by-period
GET    /api/crm-transactions/stale-leads
GET    /api/crm-transactions/stale-leads/by-stage
GET    /api/crm-transactions/stale-leads/summary
GET    /api/crm-transactions/summary
GET    /api/crm-transactions/user-activity/:userId
GET    /api/crm/appointments
GET    /api/crm/lead-sources
GET    /api/crm/leads
GET    /api/crm/reports/activity/calls
GET    /api/crm/reports/activity/emails
GET    /api/crm/reports/activity/meetings
GET    /api/crm/reports/activity/summary
GET    /api/crm/reports/activity/tasks
GET    /api/crm/reports/customer/churn
GET    /api/crm/reports/customer/engagement
GET    /api/crm/reports/customer/health-score
GET    /api/crm/reports/customer/lifetime-value
GET    /api/crm/reports/leads/by-source
GET    /api/crm/reports/leads/conversion-funnel
GET    /api/crm/reports/leads/distribution
GET    /api/crm/reports/leads/response-time
GET    /api/crm/reports/leads/velocity
GET    /api/crm/reports/performance/activity-metrics
GET    /api/crm/reports/performance/leaderboard
GET    /api/crm/reports/performance/rep-scorecard/:userId
GET    /api/crm/reports/performance/team
GET    /api/crm/reports/pipeline/deal-aging
GET    /api/crm/reports/pipeline/movement
GET    /api/crm/reports/pipeline/overview
GET    /api/crm/reports/pipeline/stage-duration
GET    /api/crm/reports/pipeline/velocity
GET    /api/crm/reports/revenue/analysis
GET    /api/crm/reports/revenue/by-month
GET    /api/crm/reports/revenue/by-rep
GET    /api/crm/reports/revenue/deal-size
GET    /api/crm/reports/revenue/forecast
GET    /api/crm/reports/revenue/quota-attainment
GET    /api/crm/reports/revenue/win-rate
GET    /api/crm/reports/territory/geographic-pipeline
GET    /api/crm/reports/territory/performance
GET    /api/crm/reports/territory/regional-sales
GET    /api/crm/reports/win-loss/analysis
GET    /api/crm/reports/win-loss/competitors
GET    /api/crm/reports/win-loss/lost-deals
GET    /api/crm/sales-stages
GET    /api/crmSettings
GET    /api/currency/rates
GET    /api/currency/settings
GET    /api/currency/supported
GET    /api/customFields
GET    /api/customFields/:id
GET    /api/customFields/:id/stats
GET    /api/customFields/dependencies/:entityType/:entityId
GET    /api/customFields/export
GET    /api/customFields/values/:entityType/:entityId
GET    /api/cycles
GET    /api/cycles/:id
GET    /api/cycles/:id/burndown
GET    /api/cycles/:id/progress
GET    /api/cycles/active
GET    /api/cycles/stats
GET    /api/dashboard/activity
GET    /api/dashboard/analytics
GET    /api/dashboard/crm-stats
GET    /api/dashboard/finance-stats
GET    /api/dashboard/financial-summary
GET    /api/dashboard/hero-stats
GET    /api/dashboard/hr-stats
GET    /api/dashboard/recent-messages
GET    /api/dashboard/reports
GET    /api/dashboard/stats
GET    /api/dashboard/summary
GET    /api/dashboard/today-events
GET    /api/data-export/entity/:entityType
GET    /api/data-export/import/:id
GET    /api/data-export/imports
GET    /api/data-export/jobs
GET    /api/data-export/jobs/:id
GET    /api/data-export/jobs/:id/download
GET    /api/data-export/report/:reportType
GET    /api/data-export/templates
GET    /api/dealHealths/:id
GET    /api/dealHealths/attention
GET    /api/dealHealths/distribution
GET    /api/dealHealths/stuck
GET    /api/dealRooms/:id/activity
GET    /api/dealRooms/deals/:dealId/room
GET    /api/dealRooms/external/:token
GET    /api/debit-notes
GET    /api/debit-notes/:id
GET    /api/debit-notes/bill/:billId
GET    /api/debit-notes/pending-approvals
GET    /api/deduplications/contacts/:id/duplicates
GET    /api/deduplications/contacts/duplicate-suggestions
GET    /api/discord/auth-url
GET    /api/discord/callback
GET    /api/discord/guilds
GET    /api/discord/guilds/:guildId/channels
GET    /api/discord/status
GET    /api/disputes
GET    /api/disputes/:id
GET    /api/disputes/by-type
GET    /api/disputes/stats
GET    /api/document-analysis/:documentId
GET    /api/document-analysis/:documentId/history
GET    /api/document-analysis/:documentId/report
GET    /api/document-analysis/:documentId/similar
GET    /api/document-analysis/:documentId/status
GET    /api/document-analysis/search
GET    /api/document-analysis/stats
GET    /api/documents
GET    /api/documents/:documentId/versions/:versionId
GET    /api/documents/:documentId/versions/:versionId/download
GET    /api/documents/:documentId/versions/:versionId/download-url
GET    /api/documents/:documentId/versions/:versionId/preview-url
GET    /api/documents/:id
GET    /api/documents/:id/download
GET    /api/documents/:id/download-url
GET    /api/documents/:id/preview-url
GET    /api/documents/:id/versions
GET    /api/documents/case/:caseId
GET    /api/documents/client/:clientId
GET    /api/documents/recent
GET    /api/documents/search
GET    /api/documents/stats
GET    /api/docusign/auth-url
GET    /api/docusign/callback
GET    /api/docusign/envelopes
GET    /api/docusign/envelopes/:envelopeId
GET    /api/docusign/envelopes/:envelopeId/documents
GET    /api/docusign/status
GET    /api/docusign/templates
GET    /api/dunning/dashboard
GET    /api/dunning/history
GET    /api/dunning/history/invoice/:invoiceId
GET    /api/dunning/overdue-invoices
GET    /api/dunning/paused-invoices
GET    /api/dunning/policies
GET    /api/dunning/policies/:id
GET    /api/dunning/policies/default
GET    /api/dunning/report
GET    /api/dunning/report/export
GET    /api/dunning/stats
GET    /api/dunning/upcoming-actions
GET    /api/email-marketing/analytics/overview
GET    /api/email-marketing/analytics/trends
GET    /api/email-marketing/campaigns
GET    /api/email-marketing/campaigns/:id
GET    /api/email-marketing/campaigns/:id/analytics
GET    /api/email-marketing/drip-campaigns
GET    /api/email-marketing/drip-campaigns/:id
GET    /api/email-marketing/drip-campaigns/:id/analytics
GET    /api/email-marketing/segments
GET    /api/email-marketing/segments/:id
GET    /api/email-marketing/segments/:id/subscribers
GET    /api/email-marketing/subscribers
GET    /api/email-marketing/templates
GET    /api/email-marketing/templates/:id
GET    /api/email-marketing/templates/public
GET    /api/email-marketing/webhooks/email/track/open/:trackingId
GET    /api/email-marketing/webhooks/email/unsubscribe/:email
GET    /api/emailTemplates
GET    /api/emailTemplates/:id
GET    /api/emailTemplates/trigger/:triggerEvent
GET    /api/emailTemplates/variables
GET    /api/events
GET    /api/events/:eventId/recurring/instances
GET    /api/events/:id
GET    /api/events/:id/activity
GET    /api/events/:id/export/ics
GET    /api/events/archived
GET    /api/events/calendar
GET    /api/events/case/:caseId
GET    /api/events/client/:clientId
GET    /api/events/conflicts
GET    /api/events/date/:date
GET    /api/events/export
GET    /api/events/ids
GET    /api/events/location-triggers
GET    /api/events/month/:year/:month
GET    /api/events/my-events
GET    /api/events/pending-rsvp
GET    /api/events/search
GET    /api/events/stats
GET    /api/events/templates
GET    /api/events/today
GET    /api/events/upcoming
GET    /api/exchangeRateRevaluation
GET    /api/exchangeRateRevaluation/:id
GET    /api/exchangeRateRevaluation/accounts
GET    /api/exchangeRateRevaluation/report
GET    /api/expense-policies
GET    /api/expense-policies/:id
GET    /api/expense-policies/default
GET    /api/expense-policies/my-policy
GET    /api/expenses
GET    /api/expenses/:id
GET    /api/expenses/by-category
GET    /api/expenses/categories
GET    /api/expenses/new
GET    /api/expenses/stats
GET    /api/fieldHistorys/:entityType/:entityId
GET    /api/fieldHistorys/:entityType/:entityId/compare
GET    /api/fieldHistorys/:entityType/:entityId/field/:fieldName
GET    /api/fieldHistorys/:entityType/:entityId/stats
GET    /api/fieldHistorys/:entityType/:entityId/timeline/:fieldName
GET    /api/fieldHistorys/recent
GET    /api/fieldHistorys/user/:userId
GET    /api/finance-setup
GET    /api/finance-setup/status
GET    /api/finance-setup/templates
GET    /api/firms
GET    /api/firms/:_id
GET    /api/firms/:firmId/invitations
GET    /api/firms/:firmId/ip-whitelist
GET    /api/firms/:firmId/sso
GET    /api/firms/:id
GET    /api/firms/:id/access
GET    /api/firms/:id/children
GET    /api/firms/:id/departed
GET    /api/firms/:id/members
GET    /api/firms/:id/stats
GET    /api/firms/:id/team
GET    /api/firms/active
GET    /api/firms/my
GET    /api/firms/my/permissions
GET    /api/firms/roles
GET    /api/firms/tree
GET    /api/firms/user/accessible
GET    /api/fiscal-periods
GET    /api/fiscal-periods/:id
GET    /api/fiscal-periods/:id/balances
GET    /api/fiscal-periods/can-post
GET    /api/fiscal-periods/current
GET    /api/fiscal-periods/years-summary
GET    /api/followups
GET    /api/followups/:id
GET    /api/followups/entity/:entityType/:entityId
GET    /api/followups/overdue
GET    /api/followups/stats
GET    /api/followups/today
GET    /api/followups/upcoming
GET    /api/gantt/baseline/:projectId
GET    /api/gantt/baseline/:projectId/compare
GET    /api/gantt/bottlenecks/:projectId
GET    /api/gantt/collaboration/activities/:firmId
GET    /api/gantt/collaboration/presence/:resourceId
GET    /api/gantt/collaboration/stats
GET    /api/gantt/critical-path/:projectId
GET    /api/gantt/data
GET    /api/gantt/data/assigned/:userId
GET    /api/gantt/data/case/:caseId
GET    /api/gantt/dependencies/:taskId
GET    /api/gantt/export/:projectId/excel
GET    /api/gantt/export/:projectId/msproject
GET    /api/gantt/export/:projectId/pdf
GET    /api/gantt/hierarchy/:taskId
GET    /api/gantt/milestones/:projectId
GET    /api/gantt/productivity
GET    /api/gantt/resources
GET    /api/gantt/resources/:userId/workload
GET    /api/gantt/resources/conflicts
GET    /api/gantt/slack/:taskId
GET    /api/gantt/timeline/:projectId
GET    /api/general-ledger
GET    /api/general-ledger/:id
GET    /api/general-ledger/account-balance/:accountId
GET    /api/general-ledger/balance-sheet
GET    /api/general-ledger/entries
GET    /api/general-ledger/profit-loss
GET    /api/general-ledger/reference/:model/:id
GET    /api/general-ledger/stats
GET    /api/general-ledger/summary
GET    /api/general-ledger/trial-balance
GET    /api/gigs
GET    /api/gigs/single/:_id
GET    /api/github/auth
GET    /api/github/callback
GET    /api/github/repositories
GET    /api/github/repositories/:owner/:repo
GET    /api/github/repositories/:owner/:repo/issues
GET    /api/github/repositories/:owner/:repo/pulls
GET    /api/github/status
GET    /api/gmail/auth
GET    /api/gmail/callback
GET    /api/gmail/drafts
GET    /api/gmail/labels
GET    /api/gmail/messages
GET    /api/gmail/messages/:messageId
GET    /api/gmail/messages/search
GET    /api/gmail/status
GET    /api/gmail/threads/:threadId
GET    /api/google-calendar/auth
GET    /api/google-calendar/calendars
GET    /api/google-calendar/calendars/:calendarId/events
GET    /api/google-calendar/callback
GET    /api/google-calendar/status
GET    /api/google-calendar/sync/settings
GET    /api/gosi/config
GET    /api/gosi/export
GET    /api/gosi/report
GET    /api/gosi/stats
GET    /api/health
GET    /api/health/cache
GET    /api/health/circuits
GET    /api/health/debug-auth
GET    /api/health/deep
GET    /api/health/detailed
GET    /api/health/live
GET    /api/health/ping
GET    /api/health/ready
GET    /api/hr-analytics/absenteeism
GET    /api/hr-analytics/attendance
GET    /api/hr-analytics/compensation
GET    /api/hr-analytics/dashboard
GET    /api/hr-analytics/demographics
GET    /api/hr-analytics/export
GET    /api/hr-analytics/leave
GET    /api/hr-analytics/performance
GET    /api/hr-analytics/predictions/absence
GET    /api/hr-analytics/predictions/attrition
GET    /api/hr-analytics/predictions/attrition/:employeeId
GET    /api/hr-analytics/predictions/engagement
GET    /api/hr-analytics/predictions/flight-risk
GET    /api/hr-analytics/predictions/high-potential
GET    /api/hr-analytics/predictions/workforce
GET    /api/hr-analytics/recruitment
GET    /api/hr-analytics/saudization
GET    /api/hr-analytics/training
GET    /api/hr-analytics/trends
GET    /api/hr-analytics/turnover
GET    /api/hr/advances
GET    /api/hr/advances/:advanceId
GET    /api/hr/advances/by-employee/:employeeId
GET    /api/hr/advances/emergency
GET    /api/hr/advances/overdue-recoveries
GET    /api/hr/advances/pending-approvals
GET    /api/hr/advances/stats
GET    /api/hr/analytics/dashboard
GET    /api/hr/asset-assignments
GET    /api/hr/asset-assignments/:id
GET    /api/hr/asset-assignments/by-employee/:employeeId
GET    /api/hr/asset-assignments/export
GET    /api/hr/asset-assignments/maintenance-due
GET    /api/hr/asset-assignments/overdue
GET    /api/hr/asset-assignments/policies
GET    /api/hr/asset-assignments/stats
GET    /api/hr/asset-assignments/warranty-expiring
GET    /api/hr/attendance-rules
GET    /api/hr/attendance-rules/:id
GET    /api/hr/attendance-rules/default
GET    /api/hr/compensation-rewards
GET    /api/hr/compensation-rewards/:id
GET    /api/hr/compensation-rewards/department-summary
GET    /api/hr/compensation-rewards/employee/:employeeId
GET    /api/hr/compensation-rewards/export
GET    /api/hr/compensation-rewards/pay-grade-analysis/:payGrade
GET    /api/hr/compensation-rewards/pending-reviews
GET    /api/hr/compensation-rewards/stats
GET    /api/hr/compliance/contracts/expiring
GET    /api/hr/compliance/dashboard
GET    /api/hr/compliance/documents/expiring
GET    /api/hr/compliance/gosi
GET    /api/hr/compliance/labor-law
GET    /api/hr/compliance/nitaqat
GET    /api/hr/compliance/probation/ending
GET    /api/hr/compliance/wps
GET    /api/hr/departments
GET    /api/hr/departments/:id
GET    /api/hr/designations
GET    /api/hr/designations/:id
GET    /api/hr/employee-benefits
GET    /api/hr/employee-benefits/:id
GET    /api/hr/employee-benefits/cost-summary
GET    /api/hr/employee-benefits/employee/:employeeId
GET    /api/hr/employee-benefits/expiring
GET    /api/hr/employee-benefits/export
GET    /api/hr/employee-benefits/stats
GET    /api/hr/employee-incentives
GET    /api/hr/employee-incentives/:id
GET    /api/hr/employee-incentives/awaiting-processing
GET    /api/hr/employee-incentives/employee/:employeeId/history
GET    /api/hr/employee-incentives/payroll/:payrollDate
GET    /api/hr/employee-incentives/pending
GET    /api/hr/employee-incentives/stats
GET    /api/hr/employee-loans
GET    /api/hr/employee-loans/:loanId
GET    /api/hr/employee-loans/:loanId/early-settlement-calculation
GET    /api/hr/employee-loans/by-employee/:employeeId
GET    /api/hr/employee-loans/overdue-installments
GET    /api/hr/employee-loans/pending-approvals
GET    /api/hr/employee-loans/stats
GET    /api/hr/employee-promotions
GET    /api/hr/employee-promotions/:id
GET    /api/hr/employee-promotions/awaiting-application
GET    /api/hr/employee-promotions/employee/:employeeId/history
GET    /api/hr/employee-promotions/pending
GET    /api/hr/employee-promotions/stats
GET    /api/hr/employee-promotions/upcoming
GET    /api/hr/employees
GET    /api/hr/employees/:id
GET    /api/hr/employees/:id/documents
GET    /api/hr/employees/stats
GET    /api/hr/expense-claims
GET    /api/hr/expense-claims/:id
GET    /api/hr/expense-claims/by-employee/:employeeId
GET    /api/hr/expense-claims/corporate-card/:employeeId
GET    /api/hr/expense-claims/export
GET    /api/hr/expense-claims/mileage-rates
GET    /api/hr/expense-claims/pending-approvals
GET    /api/hr/expense-claims/pending-payments
GET    /api/hr/expense-claims/policies
GET    /api/hr/expense-claims/stats
GET    /api/hr/expense-policies
GET    /api/hr/expense-policies/:id
GET    /api/hr/expense-policies/default
GET    /api/hr/extended/compensatory-leave
GET    /api/hr/extended/compensatory-leave/balance/:employeeId
GET    /api/hr/extended/employee-skills/:employeeId
GET    /api/hr/extended/employee-skills/expiring-certifications
GET    /api/hr/extended/employee-skills/matrix
GET    /api/hr/extended/incentives
GET    /api/hr/extended/incentives/stats
GET    /api/hr/extended/leave-encashment
GET    /api/hr/extended/promotions
GET    /api/hr/extended/retention-bonuses
GET    /api/hr/extended/salary-components
GET    /api/hr/extended/settings
GET    /api/hr/extended/settings/leave
GET    /api/hr/extended/settings/payroll
GET    /api/hr/extended/setup-wizard
GET    /api/hr/extended/setup-wizard/progress
GET    /api/hr/extended/skills
GET    /api/hr/extended/skills/by-category
GET    /api/hr/extended/staffing-plans
GET    /api/hr/extended/staffing-plans/vacancy-summary
GET    /api/hr/extended/transfers
GET    /api/hr/extended/vehicles
GET    /api/hr/extended/vehicles/fleet-summary
GET    /api/hr/fleet/driver-rankings
GET    /api/hr/fleet/drivers
GET    /api/hr/fleet/drivers/:id
GET    /api/hr/fleet/expiring-documents
GET    /api/hr/fleet/fuel-logs
GET    /api/hr/fleet/incidents
GET    /api/hr/fleet/incidents/:id
GET    /api/hr/fleet/inspections
GET    /api/hr/fleet/inspections/checklist
GET    /api/hr/fleet/maintenance
GET    /api/hr/fleet/maintenance-due
GET    /api/hr/fleet/stats
GET    /api/hr/fleet/trips
GET    /api/hr/fleet/vehicles
GET    /api/hr/fleet/vehicles/:id
GET    /api/hr/fleet/vehicles/:id/location-history
GET    /api/hr/grievances
GET    /api/hr/grievances/:id
GET    /api/hr/grievances/employee/:employeeId
GET    /api/hr/grievances/export
GET    /api/hr/grievances/overdue
GET    /api/hr/grievances/stats
GET    /api/hr/job-positions
GET    /api/hr/job-positions/:id
GET    /api/hr/job-positions/:id/hierarchy
GET    /api/hr/job-positions/department/:departmentId
GET    /api/hr/job-positions/export
GET    /api/hr/job-positions/org-chart
GET    /api/hr/job-positions/stats
GET    /api/hr/job-positions/vacant
GET    /api/hr/leave-management/leave-allocations
GET    /api/hr/leave-management/leave-allocations/:id
GET    /api/hr/leave-management/leave-allocations/balance/:employeeId/:leaveTypeId
GET    /api/hr/leave-management/leave-allocations/employee/:employeeId
GET    /api/hr/leave-management/leave-periods
GET    /api/hr/leave-management/leave-periods/:id
GET    /api/hr/leave-management/leave-periods/current
GET    /api/hr/leave-management/leave-policies
GET    /api/hr/leave-management/leave-policies/:id
GET    /api/hr/leave-management/leave-policies/default
GET    /api/hr/leave-policies
GET    /api/hr/leave-policies/:id
GET    /api/hr/leave-policies/stats
GET    /api/hr/leave-policy-assignments
GET    /api/hr/leave-policy-assignments/:id
GET    /api/hr/leave-policy-assignments/employee/:employeeId/allocation-summary
GET    /api/hr/leave-policy-assignments/employee/:employeeId/current
GET    /api/hr/leave-policy-assignments/employee/:employeeId/history
GET    /api/hr/leave-policy-assignments/unassigned-employees
GET    /api/hr/leave-types
GET    /api/hr/leave-types/:id
GET    /api/hr/offboarding
GET    /api/hr/offboarding/:offboardingId
GET    /api/hr/offboarding/by-employee/:employeeId
GET    /api/hr/offboarding/pending-clearances
GET    /api/hr/offboarding/pending-settlements
GET    /api/hr/offboarding/stats
GET    /api/hr/okrs
GET    /api/hr/okrs/:id
GET    /api/hr/okrs/nine-box
GET    /api/hr/okrs/nine-box/distribution
GET    /api/hr/okrs/nine-box/employee/:employeeId
GET    /api/hr/okrs/nine-box/succession
GET    /api/hr/okrs/stats
GET    /api/hr/okrs/tree
GET    /api/hr/onboarding
GET    /api/hr/onboarding/:onboardingId
GET    /api/hr/onboarding/by-employee/:employeeId
GET    /api/hr/onboarding/stats
GET    /api/hr/onboarding/upcoming-reviews
GET    /api/hr/options
GET    /api/hr/organizational-structure
GET    /api/hr/organizational-structure/:id
GET    /api/hr/organizational-structure/:id/children
GET    /api/hr/organizational-structure/:id/path
GET    /api/hr/organizational-structure/export
GET    /api/hr/organizational-structure/stats
GET    /api/hr/organizational-structure/tree
GET    /api/hr/payroll
GET    /api/hr/payroll-runs/:runId/employees/:employeeId/payslip
GET    /api/hr/payroll-runs/:runId/export
GET    /api/hr/payroll-runs/:runId/summary
GET    /api/hr/payroll-runs/history
GET    /api/hr/payroll-runs/stats
GET    /api/hr/payroll/:id
GET    /api/hr/payroll/stats
GET    /api/hr/performance-reviews
GET    /api/hr/performance-reviews/:id
GET    /api/hr/performance-reviews/calibration-sessions
GET    /api/hr/performance-reviews/employee/:employeeId/history
GET    /api/hr/performance-reviews/overdue
GET    /api/hr/performance-reviews/stats
GET    /api/hr/performance-reviews/team/:managerId/summary
GET    /api/hr/performance-reviews/templates
GET    /api/hr/recruitment/applicants
GET    /api/hr/recruitment/applicants/:id
GET    /api/hr/recruitment/applicants/export
GET    /api/hr/recruitment/applicants/stats
GET    /api/hr/recruitment/jobs
GET    /api/hr/recruitment/jobs/:id
GET    /api/hr/recruitment/jobs/:id/pipeline
GET    /api/hr/recruitment/jobs/:jobId/applicants
GET    /api/hr/recruitment/jobs/nearing-deadline
GET    /api/hr/recruitment/jobs/stats
GET    /api/hr/recruitment/stats
GET    /api/hr/recruitment/talent-pool
GET    /api/hr/retention-bonuses
GET    /api/hr/retention-bonuses/:id
GET    /api/hr/retention-bonuses/:id/vesting-status
GET    /api/hr/retention-bonuses/department-summary
GET    /api/hr/retention-bonuses/employee/:employeeId/history
GET    /api/hr/retention-bonuses/pending-approvals
GET    /api/hr/salary-components
GET    /api/hr/salary-components/:id
GET    /api/hr/salary-components/deductions
GET    /api/hr/salary-components/earnings
GET    /api/hr/salary-components/summary
GET    /api/hr/salary-components/tax-implications
GET    /api/hr/self-service/advances
GET    /api/hr/self-service/approvals/pending
GET    /api/hr/self-service/dashboard
GET    /api/hr/self-service/leave/balances
GET    /api/hr/self-service/leave/requests
GET    /api/hr/self-service/loans
GET    /api/hr/self-service/payslips
GET    /api/hr/self-service/profile
GET    /api/hr/shift-types
GET    /api/hr/shift-types/:id
GET    /api/hr/shift-types/:shiftTypeId/assignments
GET    /api/hr/shift-types/:shiftTypeId/schedule
GET    /api/hr/shift-types/default
GET    /api/hr/shift-types/export
GET    /api/hr/shift-types/stats
GET    /api/hr/shifts/shift-assignments
GET    /api/hr/shifts/shift-assignments/:id
GET    /api/hr/shifts/shift-assignments/employee/:employeeId
GET    /api/hr/shifts/shift-assignments/employee/:employeeId/current
GET    /api/hr/shifts/shift-types
GET    /api/hr/shifts/shift-types-ramadan
GET    /api/hr/shifts/shift-types-stats
GET    /api/hr/shifts/shift-types/:id
GET    /api/hr/skill-maps
GET    /api/hr/skill-maps/:employeeId
GET    /api/hr/skill-maps/:employeeId/skills/:skillId/trends
GET    /api/hr/skill-maps/:employeeId/training-recommendations
GET    /api/hr/skill-maps/cpd-non-compliant
GET    /api/hr/skill-maps/department/:departmentId/summary
GET    /api/hr/skill-maps/distribution/:skillId
GET    /api/hr/skill-maps/expiring-certifications
GET    /api/hr/skill-maps/find-by-skill/:skillId
GET    /api/hr/skill-maps/matrix
GET    /api/hr/skill-maps/matrix/export
GET    /api/hr/skill-maps/needs-review
GET    /api/hr/skill-maps/skill-gaps/export
GET    /api/hr/skills
GET    /api/hr/skills/:id
GET    /api/hr/skills/:skillId/employees
GET    /api/hr/skills/assessments
GET    /api/hr/skills/assessments/:id
GET    /api/hr/skills/by-category
GET    /api/hr/skills/competencies
GET    /api/hr/skills/competencies/:id
GET    /api/hr/skills/cpd-non-compliant
GET    /api/hr/skills/employee/:employeeId
GET    /api/hr/skills/expiring-certifications
GET    /api/hr/skills/gap-analysis
GET    /api/hr/skills/matrix
GET    /api/hr/skills/needing-review
GET    /api/hr/skills/sfia-levels
GET    /api/hr/skills/stats
GET    /api/hr/skills/types
GET    /api/hr/staffing-plans
GET    /api/hr/staffing-plans/:planId
GET    /api/hr/staffing-plans/:planId/budget
GET    /api/hr/staffing-plans/:planId/fulfillment-status
GET    /api/hr/staffing-plans/:planId/job-openings
GET    /api/hr/staffing-plans/:planId/positions/filled
GET    /api/hr/staffing-plans/:planId/positions/open
GET    /api/hr/staffing-plans/:planId/progress
GET    /api/hr/staffing-plans/:planId/timeline
GET    /api/hr/staffing-plans/:planId/timeline
GET    /api/hr/staffing-plans/analytics
GET    /api/hr/staffing-plans/attrition-forecast
GET    /api/hr/staffing-plans/comparison
GET    /api/hr/staffing-plans/cost-analysis
GET    /api/hr/staffing-plans/export
GET    /api/hr/staffing-plans/forecast
GET    /api/hr/staffing-plans/gaps
GET    /api/hr/staffing-plans/headcount
GET    /api/hr/staffing-plans/headcount/by-department
GET    /api/hr/staffing-plans/headcount/by-job-family
GET    /api/hr/staffing-plans/headcount/by-location
GET    /api/hr/staffing-plans/headcount/trends
GET    /api/hr/staffing-plans/scenarios
GET    /api/hr/staffing-plans/vacancies-summary
GET    /api/hr/staffing-plans/variance
GET    /api/hr/surveys
GET    /api/hr/surveys/:id
GET    /api/hr/surveys/:id/results
GET    /api/hr/surveys/my-surveys
GET    /api/hr/surveys/stats
GET    /api/hr/surveys/templates
GET    /api/hr/surveys/templates/:id
GET    /api/hr/trainings
GET    /api/hr/trainings/:trainingId
GET    /api/hr/trainings/by-employee/:employeeId
GET    /api/hr/trainings/calendar
GET    /api/hr/trainings/cle-summary/:employeeId
GET    /api/hr/trainings/export
GET    /api/hr/trainings/overdue-compliance
GET    /api/hr/trainings/pending-approvals
GET    /api/hr/trainings/policies
GET    /api/hr/trainings/providers
GET    /api/hr/trainings/stats
GET    /api/hr/trainings/upcoming
GET    /api/hr/transfers
GET    /api/hr/transfers/:id
GET    /api/hr/transfers/history/:employeeId
GET    /api/hr/transfers/pending-approvals
GET    /api/hr/transfers/pending-handovers
GET    /api/hr/transfers/stats
GET    /api/hr/vehicles
GET    /api/hr/vehicles/:vehicleId
GET    /api/hr/vehicles/:vehicleId/assignments
GET    /api/hr/vehicles/:vehicleId/expenses
GET    /api/hr/vehicles/:vehicleId/maintenance
GET    /api/hr/vehicles/assigned
GET    /api/hr/vehicles/available
GET    /api/hr/vehicles/export
GET    /api/hr/vehicles/stats
GET    /api/hr/whos-out/coverage/:department
GET    /api/hr/whos-out/departments
GET    /api/hr/whos-out/month
GET    /api/hr/whos-out/today
GET    /api/hr/whos-out/upcoming
GET    /api/hr/whos-out/week
GET    /api/incomeTaxSlab
GET    /api/incomeTaxSlab/:id
GET    /api/incomeTaxSlab/countries
GET    /api/integrations/discord/auth-url
GET    /api/integrations/discord/callback
GET    /api/integrations/discord/guilds
GET    /api/integrations/discord/guilds/:guildId/channels
GET    /api/integrations/discord/status
GET    /api/integrations/quickbooks/auth
GET    /api/integrations/quickbooks/callback
GET    /api/integrations/quickbooks/conflicts
GET    /api/integrations/quickbooks/mappings/accounts
GET    /api/integrations/quickbooks/mappings/fields
GET    /api/integrations/quickbooks/status
GET    /api/integrations/quickbooks/sync/history
GET    /api/integrations/xero/auth
GET    /api/integrations/xero/callback
GET    /api/integrations/xero/status
GET    /api/integrations/xero/sync/history
GET    /api/integrations/xero/webhook/status
GET    /api/inter-company/balances
GET    /api/inter-company/balances/:firmId
GET    /api/inter-company/balances/between
GET    /api/inter-company/exchange-rate
GET    /api/inter-company/firms
GET    /api/inter-company/reconciliation
GET    /api/inter-company/reconciliations
GET    /api/inter-company/reconciliations/:id
GET    /api/inter-company/reports/summary
GET    /api/inter-company/transactions
GET    /api/inter-company/transactions/:id
GET    /api/inter-company/transactions/between
GET    /api/interestAreas
GET    /api/interestAreas/:id
GET    /api/interestAreas/tree
GET    /api/inventory/batches
GET    /api/inventory/item-groups
GET    /api/inventory/item-prices
GET    /api/inventory/items
GET    /api/inventory/items/:id
GET    /api/inventory/items/:id/stock
GET    /api/inventory/price-lists
GET    /api/inventory/reconciliations
GET    /api/inventory/reports/low-stock
GET    /api/inventory/reports/stock-balance
GET    /api/inventory/reports/stock-movement
GET    /api/inventory/serial-numbers
GET    /api/inventory/settings
GET    /api/inventory/stats
GET    /api/inventory/stock-entries
GET    /api/inventory/stock-entries/:id
GET    /api/inventory/stock-ledger
GET    /api/inventory/uom
GET    /api/inventory/warehouses
GET    /api/inventory/warehouses/:id
GET    /api/inventory/warehouses/:id/stock
GET    /api/investment-search/market/:market
GET    /api/investment-search/markets
GET    /api/investment-search/quote
GET    /api/investment-search/sectors
GET    /api/investment-search/symbol/:symbol
GET    /api/investment-search/symbols
GET    /api/investment-search/type/:type
GET    /api/investment-search/types
GET    /api/investments
GET    /api/investments/:id
GET    /api/investments/:id/transactions
GET    /api/investments/summary
GET    /api/invitations/:code
GET    /api/invitations/:code/validate
GET    /api/invoice-approvals
GET    /api/invoice-approvals/:id
GET    /api/invoice-approvals/needing-escalation
GET    /api/invoice-approvals/pending
GET    /api/invoice-approvals/stats
GET    /api/invoice-templates
GET    /api/invoice-templates/:id
GET    /api/invoice-templates/:id/export
GET    /api/invoice-templates/:id/preview
GET    /api/invoice-templates/default
GET    /api/invoices
GET    /api/invoices/:_id
GET    /api/invoices/:id
GET    /api/invoices/:id/pdf
GET    /api/invoices/:id/xml
GET    /api/invoices/:id/zatca/status
GET    /api/invoices/billable-items
GET    /api/invoices/open/:clientId
GET    /api/invoices/overdue
GET    /api/invoices/stats
GET    /api/jobs
GET    /api/jobs/:_id
GET    /api/jobs/my-jobs
GET    /api/journal-entries
GET    /api/journal-entries/:id
GET    /api/keyboardShortcuts
GET    /api/keyboardShortcuts/:id
GET    /api/keyboardShortcuts/defaults
GET    /api/kyc/admin/pending
GET    /api/kyc/admin/stats
GET    /api/kyc/history
GET    /api/kyc/status
GET    /api/lawyers
GET    /api/lawyers/:_id
GET    /api/lawyers/team
GET    /api/lead-scoring/by-grade/:grade
GET    /api/lead-scoring/conversion-analysis
GET    /api/lead-scoring/distribution
GET    /api/lead-scoring/insights/:leadId
GET    /api/lead-scoring/leaderboard
GET    /api/lead-scoring/scores
GET    /api/lead-scoring/top-leads
GET    /api/lead-scoring/trends
GET    /api/leadConversion/:id/cases
GET    /api/leadConversion/case/:caseId/quotes
GET    /api/leads
GET    /api/leads/:id
GET    /api/leads/:id/activities
GET    /api/leads/:id/conversion-preview
GET    /api/leads/follow-up
GET    /api/leads/overview
GET    /api/leads/pipeline/:pipelineId?
GET    /api/leads/stats
GET    /api/leadSource
GET    /api/leadSource/:id
GET    /api/leave-allocations
GET    /api/leave-allocations/:id
GET    /api/leave-allocations/balance/:employeeId
GET    /api/leave-allocations/carry-forward/summary
GET    /api/leave-allocations/employee/:employeeId/all
GET    /api/leave-allocations/expiring-carry-forward
GET    /api/leave-allocations/history/:employeeId
GET    /api/leave-allocations/low-balance
GET    /api/leave-allocations/statistics
GET    /api/leave-allocations/summary/:leavePeriodId
GET    /api/leave-encashments
GET    /api/leave-encashments/:id
GET    /api/leave-encashments/eligibility/:employeeId
GET    /api/leave-encashments/employee/:employeeId
GET    /api/leave-encashments/export
GET    /api/leave-encashments/pending-approvals
GET    /api/leave-encashments/policy
GET    /api/leave-encashments/stats
GET    /api/leave-requests
GET    /api/leave-requests/:id
GET    /api/leave-requests/balance/:employeeId
GET    /api/leave-requests/calendar
GET    /api/leave-requests/pending-approvals
GET    /api/leave-requests/stats
GET    /api/leave-requests/types
GET    /api/legal-documents/:id
GET    /api/legal-documents/:id/audit-trail
GET    /api/legal-documents/:id/parties
GET    /api/legal-documents/:id/signature-status
GET    /api/legal-documents/:id/versions
GET    /api/legalDocument
GET    /api/legalDocument/:_id
GET    /api/lifecycles/:entityType/:entityId
GET    /api/lifecycles/instance/:id/progress
GET    /api/lifecycles/workflows
GET    /api/lifecycles/workflows/:id
GET    /api/lockDates
GET    /api/lockDates/history
GET    /api/lockDates/periods
GET    /api/lostReason
GET    /api/lostReason/:id
GET    /api/lostReason/categories
GET    /api/lostReasons
GET    /api/lostReasons/:id
GET    /api/lostReasons/stats
GET    /api/macros
GET    /api/macros/:id
GET    /api/macros/popular
GET    /api/macros/shortcut/:shortcut
GET    /api/macros/suggest/:conversationId
GET    /api/manufacturing/boms
GET    /api/manufacturing/boms/:id
GET    /api/manufacturing/job-cards
GET    /api/manufacturing/job-cards/:id
GET    /api/manufacturing/settings
GET    /api/manufacturing/stats
GET    /api/manufacturing/work-orders
GET    /api/manufacturing/work-orders/:id
GET    /api/manufacturing/workstations
GET    /api/manufacturing/workstations/:id
GET    /api/matter-budgets
GET    /api/matter-budgets/:id
GET    /api/matter-budgets/:id/analysis
GET    /api/matter-budgets/:id/entries
GET    /api/matter-budgets/alerts
GET    /api/matter-budgets/case/:caseId
GET    /api/matter-budgets/templates
GET    /api/messages/:conversationID
GET    /api/messages/stats
GET    /api/metrics
GET    /api/metrics/json
GET    /api/metrics/performance
GET    /api/microsoftCalendar/auth
GET    /api/microsoftCalendar/calendars
GET    /api/microsoftCalendar/callback
GET    /api/microsoftCalendar/events
GET    /api/microsoftCalendar/status
GET    /api/microsoftCalendar/sync/settings
GET    /api/ml/analytics/dashboard
GET    /api/ml/analytics/feature-importance
GET    /api/ml/analytics/score-distribution
GET    /api/ml/model/metrics
GET    /api/ml/priority-queue
GET    /api/ml/priority-queue/workload
GET    /api/ml/scores
GET    /api/ml/scores/:leadId
GET    /api/ml/scores/:leadId/explanation
GET    /api/ml/scores/:leadId/hybrid
GET    /api/ml/sla/breaches
GET    /api/ml/sla/metrics
GET    /api/notification-preferences
GET    /api/notification-preferences/defaults
GET    /api/notification-preferences/quiet-hours/status
GET    /api/notification-preferences/stats
GET    /api/notification-settings
GET    /api/notifications
GET    /api/notifications/:id
GET    /api/notifications/by-type/:type
GET    /api/notifications/unread-count
GET    /api/offlineSyncs/changes
GET    /api/offlineSyncs/data
GET    /api/offlineSyncs/manifest
GET    /api/offlineSyncs/status
GET    /api/orders
GET    /api/organizations
GET    /api/organizations/:id
GET    /api/organizations/client/:clientId
GET    /api/organizations/search
GET    /api/payment-receipts
GET    /api/payment-receipts/:id
GET    /api/payment-receipts/:id/download
GET    /api/payment-receipts/stats
GET    /api/payment-terms
GET    /api/payment-terms/:id
GET    /api/payment-terms/default
GET    /api/payments
GET    /api/payments/:id
GET    /api/payments/new
GET    /api/payments/pending-checks
GET    /api/payments/stats
GET    /api/payments/summary
GET    /api/payments/unreconciled
GET    /api/payout/payouts
GET    /api/payout/payouts/:id
GET    /api/payout/payouts/stats
GET    /api/payout/stripe/account
GET    /api/payout/stripe/callback
GET    /api/payout/stripe/dashboard
GET    /api/payroll-runs
GET    /api/payroll-runs/:id
GET    /api/payroll-runs/:id/export
GET    /api/payroll-runs/stats
GET    /api/pdfme/download/:fileName
GET    /api/pdfme/templates
GET    /api/pdfme/templates/:id
GET    /api/pdfme/templates/default/:category
GET    /api/peerReview/:lawyerId
GET    /api/permissions/cache/stats
GET    /api/permissions/config
GET    /api/permissions/decisions
GET    /api/permissions/decisions/compliance-report
GET    /api/permissions/decisions/denied
GET    /api/permissions/decisions/stats
GET    /api/permissions/expand/:namespace/:resourceId/:relation
GET    /api/permissions/my-permissions
GET    /api/permissions/relations/:namespace/:object
GET    /api/permissions/relations/stats
GET    /api/permissions/ui/config
GET    /api/permissions/ui/matrix
GET    /api/permissions/ui/pages/all
GET    /api/permissions/ui/sidebar
GET    /api/permissions/ui/sidebar/all
GET    /api/permissions/user-resources/:userId
GET    /api/plans
GET    /api/plans/current
GET    /api/plans/features
GET    /api/plans/limits
GET    /api/plans/usage
GET    /api/playbook
GET    /api/playbook/:id
GET    /api/playbook/executions/:id
GET    /api/playbook/executions/incident/:incidentId
GET    /api/playbook/executions/stats
GET    /api/playbook/stats
GET    /api/plugins/:id
GET    /api/plugins/:id/stats
GET    /api/plugins/all
GET    /api/plugins/available
GET    /api/plugins/installations/:installationId
GET    /api/plugins/installed
GET    /api/plugins/loader/stats
GET    /api/plugins/search
GET    /api/preparedReport
GET    /api/preparedReport/:id
GET    /api/preparedReport/stats
GET    /api/price-levels
GET    /api/price-levels/:id
GET    /api/price-levels/client-rate
GET    /api/products
GET    /api/products/:id
GET    /api/products/category/:category
GET    /api/products/enhanced
GET    /api/products/enhanced/:productId
GET    /api/products/enhanced/:productId/barcodes
GET    /api/products/enhanced/:productId/margin
GET    /api/products/enhanced/:productId/variants
GET    /api/products/enhanced/:productId/variants/:variantId
GET    /api/products/enhanced/lookup/barcode
GET    /api/products/search
GET    /api/products/stats
GET    /api/proposals/job/:jobId
GET    /api/proposals/my-proposals
GET    /api/quality/actions
GET    /api/quality/actions/:id
GET    /api/quality/inspections
GET    /api/quality/inspections/:id
GET    /api/quality/settings
GET    /api/quality/stats
GET    /api/quality/templates
GET    /api/quality/templates/:id
GET    /api/questions
GET    /api/questions/:_id
GET    /api/queues
GET    /api/queues/:name
GET    /api/queues/:name/counts
GET    /api/queues/:name/jobs
GET    /api/queues/:name/jobs/:jobId
GET    /api/quotes
GET    /api/quotes/:id
GET    /api/quotes/:id/pdf
GET    /api/rate-cards
GET    /api/rate-cards/:id
GET    /api/rate-cards/case/:caseId
GET    /api/rate-cards/client/:clientId
GET    /api/rate-limits/config
GET    /api/rate-limits/effective
GET    /api/rate-limits/firms/:firmId
GET    /api/rate-limits/firms/:firmId/throttled
GET    /api/rate-limits/firms/:firmId/top-users
GET    /api/rate-limits/overview
GET    /api/rate-limits/tiers/:tier
GET    /api/rate-limits/users/:userId
GET    /api/rate-limits/users/:userId/stats
GET    /api/record-activities
GET    /api/record-activities/:id
GET    /api/record-activities/entity/:entityType/:entityId
GET    /api/record-activities/overview
GET    /api/record-activities/summary
GET    /api/recurring-invoices
GET    /api/recurring-invoices/:id
GET    /api/recurring-invoices/:id/history
GET    /api/recurring-invoices/:id/preview
GET    /api/recurring-invoices/stats
GET    /api/recurring-transactions
GET    /api/recurring-transactions/:id
GET    /api/recurring-transactions/upcoming
GET    /api/referrals
GET    /api/referrals/:id
GET    /api/referrals/:id/calculate-fee
GET    /api/referrals/stats
GET    /api/referrals/top
GET    /api/refund/:id
GET    /api/refund/admin/all
GET    /api/refund/admin/pending
GET    /api/refund/admin/statistics
GET    /api/refund/eligibility/:paymentId
GET    /api/refund/history
GET    /api/regional-banks/callback
GET    /api/regional-banks/countries
GET    /api/regional-banks/countries/:countryCode/banks
GET    /api/regional-banks/find-by-iban
GET    /api/regional-banks/stats
GET    /api/regional-banks/status/:accountId
GET    /api/reminders
GET    /api/reminders/:id
GET    /api/reminders/:id/activity
GET    /api/reminders/:id/occurrences
GET    /api/reminders/archived
GET    /api/reminders/case/:caseId
GET    /api/reminders/client/:clientId
GET    /api/reminders/conflicts
GET    /api/reminders/delegated
GET    /api/reminders/export
GET    /api/reminders/ids
GET    /api/reminders/location/locations
GET    /api/reminders/location/summary
GET    /api/reminders/overdue
GET    /api/reminders/search
GET    /api/reminders/snoozed-due
GET    /api/reminders/stats
GET    /api/reminders/upcoming
GET    /api/reports
GET    /api/reports
GET    /api/reports/:id
GET    /api/reports/:id
GET    /api/reports/:id/execute
GET    /api/reports/:id/export/:format
GET    /api/reports/ap-aging
GET    /api/reports/ar-aging
GET    /api/reports/balance-sheet
GET    /api/reports/budget-variance
GET    /api/reports/case-profitability
GET    /api/reports/cases-chart
GET    /api/reports/client-statement
GET    /api/reports/consolidated/auto-eliminations
GET    /api/reports/consolidated/balance-sheet
GET    /api/reports/consolidated/cash-flow
GET    /api/reports/consolidated/comparison
GET    /api/reports/consolidated/eliminations
GET    /api/reports/consolidated/full-statement
GET    /api/reports/consolidated/profit-loss
GET    /api/reports/cost-center
GET    /api/reports/gross-profit
GET    /api/reports/profit-loss
GET    /api/reports/revenue-chart
GET    /api/reports/tasks-chart
GET    /api/reports/trial-balance
GET    /api/reports/vendor-ledger
GET    /api/retainers
GET    /api/retainers/:id
GET    /api/retainers/:id/history
GET    /api/retainers/low-balance
GET    /api/retainers/stats
GET    /api/reviews/:gigID
GET    /api/sales-quotas
GET    /api/sales-quotas/:id
GET    /api/sales-quotas/leaderboard
GET    /api/sales-quotas/my-quota
GET    /api/sales-quotas/period-comparison
GET    /api/sales-quotas/team-summary
GET    /api/salesForecasts
GET    /api/salesForecasts/:id
GET    /api/salesForecasts/by-period
GET    /api/salesForecasts/current-quarter
GET    /api/salesPerson
GET    /api/salesPerson/:id
GET    /api/salesPerson/:id/stats
GET    /api/salesPerson/tree
GET    /api/saless/commissions/by-salesperson
GET    /api/saless/commissions/monthly-trend
GET    /api/saless/commissions/plans
GET    /api/saless/commissions/plans/:id
GET    /api/saless/commissions/settlements
GET    /api/saless/commissions/settlements/:id
GET    /api/saless/commissions/settlements/:id/statement
GET    /api/saless/commissions/settlements/pending
GET    /api/saless/commissions/settlements/pending-payments
GET    /api/saless/deliveries
GET    /api/saless/deliveries/:id
GET    /api/saless/deliveries/:id/tracking
GET    /api/saless/deliveries/by-carrier
GET    /api/saless/deliveries/in-transit
GET    /api/saless/deliveries/pending
GET    /api/saless/deliveries/statistics
GET    /api/saless/orders
GET    /api/saless/orders/:id
GET    /api/saless/orders/by-salesperson
GET    /api/saless/orders/statistics
GET    /api/saless/orders/top-customers
GET    /api/saless/returns
GET    /api/saless/returns/:id
GET    /api/saless/returns/pending
GET    /api/saless/returns/rate
GET    /api/saless/returns/requiring-inspection
GET    /api/saless/returns/statistics
GET    /api/salesStage
GET    /api/salesStage/:id
GET    /api/salesTeams
GET    /api/salesTeams/:id
GET    /api/salesTeams/:id/leaderboard
GET    /api/salesTeams/:id/stats
GET    /api/sandboxs
GET    /api/sandboxs/:id/check-limit
GET    /api/sandboxs/stats
GET    /api/sandboxs/templates
GET    /api/saudi-banking/compliance/deadlines
GET    /api/saudi-banking/lean/accounts/:accountId/balance
GET    /api/saudi-banking/lean/accounts/:accountId/transactions
GET    /api/saudi-banking/lean/banks
GET    /api/saudi-banking/lean/customers
GET    /api/saudi-banking/lean/customers/:customerId/entities
GET    /api/saudi-banking/lean/customers/:customerId/token
GET    /api/saudi-banking/lean/entities/:entityId/accounts
GET    /api/saudi-banking/lean/entities/:entityId/identity
GET    /api/saudi-banking/mudad/submissions/:submissionId/status
GET    /api/saudi-banking/sadad/billers
GET    /api/saudi-banking/sadad/billers/search
GET    /api/saudi-banking/sadad/payments/:transactionId/status
GET    /api/saudi-banking/sadad/payments/history
GET    /api/saudi-banking/wps/files
GET    /api/saudi-banking/wps/sarie-banks
GET    /api/saved-reports/reports
GET    /api/saved-reports/reports/:id
GET    /api/saved-reports/widgets
GET    /api/saved-reports/widgets/:id
GET    /api/saved-reports/widgets/:id/data
GET    /api/saved-reports/widgets/defaults
GET    /api/savedFilters
GET    /api/savedFilters/:id
GET    /api/savedFilters/popular/:entityType
GET    /api/score/:lawyerId
GET    /api/score/top/lawyers
GET    /api/security/csp-violations
GET    /api/security/dashboard
GET    /api/security/incidents
GET    /api/security/incidents
GET    /api/security/incidents/:id
GET    /api/security/incidents/open
GET    /api/security/incidents/stats
GET    /api/security/stats
GET    /api/settings
GET    /api/settings/ai
GET    /api/settings/ai/features
GET    /api/settings/ai/usage
GET    /api/settings/crm
GET    /api/settings/email/signatures
GET    /api/settings/email/smtp
GET    /api/settings/email/templates
GET    /api/settings/email/templates/:id
GET    /api/settings/finance
GET    /api/settings/hr
GET    /api/settings/payment-modes
GET    /api/settings/payment-terms
GET    /api/settings/payment-terms/:id
GET    /api/settings/payment-terms/templates
GET    /api/settings/sso
GET    /api/settings/sso/domains
GET    /api/settings/sso/providers/:providerId
GET    /api/settings/sso/providers/available
GET    /api/settings/taxes
GET    /api/setup/next-task
GET    /api/setup/progress-percentage
GET    /api/setup/sections
GET    /api/setup/status
GET    /api/shift-assignments
GET    /api/shift-assignments/:assignmentId
GET    /api/shift-assignments/coverage-report
GET    /api/shift-assignments/employee/:employeeId/active
GET    /api/shift-assignments/employee/:employeeId/current
GET    /api/shift-assignments/export
GET    /api/shift-assignments/stats
GET    /api/shift-requests
GET    /api/shift-requests/:requestId
GET    /api/shift-requests/pending-approvals
GET    /api/shift-requests/stats
GET    /api/slack/auth-url
GET    /api/slack/callback
GET    /api/slack/channels
GET    /api/slack/settings
GET    /api/slack/status
GET    /api/slack/users/:slackUserId
GET    /api/slas
GET    /api/slas/:id
GET    /api/slas/instance/:ticketId
GET    /api/slas/stats
GET    /api/sloMonitorings
GET    /api/sloMonitorings/:id
GET    /api/sloMonitorings/:id/error-budget
GET    /api/sloMonitorings/:id/history
GET    /api/sloMonitorings/:id/status
GET    /api/sloMonitorings/breached
GET    /api/sloMonitorings/categories
GET    /api/sloMonitorings/dashboard
GET    /api/sloMonitorings/metrics/availability
GET    /api/sloMonitorings/metrics/latency
GET    /api/sloMonitorings/report
GET    /api/sloMonitorings/time-windows
GET    /api/smart-buttons/:model/:recordId/counts
GET    /api/smart-scheduling/nudges
GET    /api/smart-scheduling/patterns
GET    /api/smart-scheduling/workload
GET    /api/staff
GET    /api/staff/:id
GET    /api/staff/stats
GET    /api/staff/team
GET    /api/statements
GET    /api/statements/:id
GET    /api/statements/:id/download
GET    /api/status
GET    /api/status/admin/components
GET    /api/status/admin/history
GET    /api/status/admin/subscribers
GET    /api/status/components
GET    /api/status/components/:id
GET    /api/status/incidents
GET    /api/status/incidents/:id
GET    /api/status/maintenance
GET    /api/status/unsubscribe/:token
GET    /api/subcontracting/orders
GET    /api/subcontracting/orders/:id
GET    /api/subcontracting/receipts
GET    /api/subcontracting/receipts/:id
GET    /api/subcontracting/settings
GET    /api/subcontracting/stats
GET    /api/subscriptions
GET    /api/subscriptions/:id
GET    /api/subscriptions/:id/hours-usage
GET    /api/subscriptions/:id/invoices
GET    /api/subscriptions/:id/renewal-preview
GET    /api/subscriptions/:id/upcoming-invoice
GET    /api/subscriptions/past-due
GET    /api/subscriptions/stats
GET    /api/subscriptions/upcoming-renewals
GET    /api/succession-plans
GET    /api/succession-plans/:id
GET    /api/succession-plans/by-incumbent/:incumbentId
GET    /api/succession-plans/by-position/:positionId
GET    /api/succession-plans/critical-without-successors
GET    /api/succession-plans/export
GET    /api/succession-plans/high-risk
GET    /api/succession-plans/review-due
GET    /api/succession-plans/stats
GET    /api/support/settings
GET    /api/support/slas
GET    /api/support/slas/:id
GET    /api/support/stats
GET    /api/support/tickets
GET    /api/support/tickets/:id
GET    /api/tags
GET    /api/tags/:id
GET    /api/tags/entity/:entityType
GET    /api/tags/popular
GET    /api/tasks
GET    /api/tasks/:id
GET    /api/tasks/:id/activity
GET    /api/tasks/:id/attachments/:attachmentId/download-url
GET    /api/tasks/:id/attachments/:attachmentId/versions
GET    /api/tasks/:id/documents
GET    /api/tasks/:id/documents/:documentId
GET    /api/tasks/:id/documents/:documentId/versions
GET    /api/tasks/:id/documents/:documentId/versions/:versionId
GET    /api/tasks/:id/full
GET    /api/tasks/:id/time-tracking/summary
GET    /api/tasks/:taskId/available-dependencies
GET    /api/tasks/:taskId/rule-history
GET    /api/tasks/:taskId/time-tracking
GET    /api/tasks/:taskId/workflow-rules
GET    /api/tasks/archived
GET    /api/tasks/case/:caseId
GET    /api/tasks/client/:clientId
GET    /api/tasks/conflicts
GET    /api/tasks/due-today
GET    /api/tasks/export
GET    /api/tasks/ids
GET    /api/tasks/location-triggers
GET    /api/tasks/overdue
GET    /api/tasks/overview
GET    /api/tasks/search
GET    /api/tasks/smart-schedule
GET    /api/tasks/stats
GET    /api/tasks/templates
GET    /api/tasks/templates/:templateId
GET    /api/tasks/timers/active
GET    /api/tasks/upcoming
GET    /api/team
GET    /api/team/:id
GET    /api/team/:id/activity
GET    /api/team/options
GET    /api/team/stats
GET    /api/telegram/chats
GET    /api/telegram/status
GET    /api/templates/:id/preview
GET    /api/templates/admin
GET    /api/templates/admin/:id
GET    /api/templates/admin/:id/compare/:firmId
GET    /api/templates/admin/stats
GET    /api/templates/available
GET    /api/templates/default
GET    /api/temporal-invoices/:id/approval-status
GET    /api/temporal-invoices/pending-approvals
GET    /api/temporalOffboarding/:id/offboarding/status
GET    /api/temporalOnboarding/:id/onboarding/status
GET    /api/territory
GET    /api/territory/:id
GET    /api/territory/tree
GET    /api/territorys
GET    /api/territorys/:id
GET    /api/territorys/:id/children
GET    /api/territorys/:id/stats
GET    /api/territorys/:id/tree
GET    /api/threadMessages
GET    /api/threadMessages/:id
GET    /api/threadMessages/mentions
GET    /api/threadMessages/search
GET    /api/threadMessages/starred
GET    /api/threadMessages/thread/:model/:id
GET    /api/time-tracking/activity-codes
GET    /api/time-tracking/entries
GET    /api/time-tracking/entries/:id
GET    /api/time-tracking/entries/pending-approval
GET    /api/time-tracking/stats
GET    /api/time-tracking/timer/status
GET    /api/time-tracking/unbilled
GET    /api/time-tracking/weekly
GET    /api/timelines/:entityType/:entityId
GET    /api/timelines/:entityType/:entityId/summary
GET    /api/transactions
GET    /api/transactions/:id
GET    /api/transactions/:id/attachments
GET    /api/transactions/balance
GET    /api/transactions/by-category
GET    /api/transactions/categories
GET    /api/transactions/export
GET    /api/transactions/pending
GET    /api/transactions/search
GET    /api/transactions/stats
GET    /api/transactions/summary
GET    /api/transactions/unreconciled
GET    /api/trello/auth-url
GET    /api/trello/boards
GET    /api/trello/boards/:boardId
GET    /api/trello/boards/:boardId/lists
GET    /api/trello/callback
GET    /api/trello/lists/:listId/cards
GET    /api/trello/settings
GET    /api/trello/status
GET    /api/trust-accounts
GET    /api/trust-accounts/:id
GET    /api/trust-accounts/:id/balances
GET    /api/trust-accounts/:id/balances/:clientId
GET    /api/trust-accounts/:id/reconciliations
GET    /api/trust-accounts/:id/summary
GET    /api/trust-accounts/:id/three-way-reconciliations
GET    /api/trust-accounts/:id/transactions
GET    /api/trust-accounts/:id/transactions/:transactionId
GET    /api/unified/billable-items
GET    /api/unified/case-financials/:caseId
GET    /api/unified/client-portfolio/:clientId
GET    /api/unified/financial-summary
GET    /api/unified/hr-dashboard
GET    /api/unified/open-invoices
GET    /api/user-settings
GET    /api/user-settings/view-mode/:module
GET    /api/users/:_id
GET    /api/users/lawyer/:username
GET    /api/users/lawyers
GET    /api/users/notification-preferences
GET    /api/users/push-subscription
GET    /api/users/team
GET    /api/users/vapid-public-key
GET    /api/v1/brokers
GET    /api/v1/brokers/:id
GET    /api/v1/trades
GET    /api/v1/trades/:id
GET    /api/v1/trades/stats
GET    /api/v1/trades/stats/chart
GET    /api/v1/trading-accounts
GET    /api/v1/trading-accounts/:id
GET    /api/v1/trading-accounts/:id/balance
GET    /api/vendors
GET    /api/vendors/:id
GET    /api/vendors/:id/summary
GET    /api/verify/moj/attorney/:attorneyId
GET    /api/verify/moj/license/:licenseNumber
GET    /api/verify/moj/poa/:poaNumber
GET    /api/verify/moj/poa/list/:idNumber
GET    /api/verify/moj/status
GET    /api/verify/status
GET    /api/verify/wathq/:crNumber
GET    /api/verify/wathq/:crNumber/basic
GET    /api/verify/wathq/:crNumber/branches
GET    /api/verify/wathq/:crNumber/capital
GET    /api/verify/wathq/:crNumber/managers
GET    /api/verify/wathq/:crNumber/owners
GET    /api/verify/wathq/:crNumber/status
GET    /api/verify/wathq/config/status
GET    /api/verify/yakeen/status
GET    /api/views
GET    /api/views/:id
GET    /api/views/:id/render
GET    /api/walkthroughs
GET    /api/walkthroughs/:id
GET    /api/walkthroughs/admin
GET    /api/walkthroughs/progress
GET    /api/walkthroughs/stats
GET    /api/webhooks
GET    /api/webhooks/:id
GET    /api/webhooks/:id/deliveries
GET    /api/webhooks/:id/deliveries/:deliveryId
GET    /api/webhooks/:id/secret
GET    /api/webhooks/events
GET    /api/webhooks/stats
GET    /api/whatsapp/analytics
GET    /api/whatsapp/broadcasts/:id/analytics
GET    /api/whatsapp/broadcasts/stats
GET    /api/whatsapp/conversations/:id/messages
GET    /api/whatsapp/stats
GET    /api/workflow/cases/:caseId/progress
GET    /api/workflow/category/:category
GET    /api/workflow/entity/:entityType/:entityId
GET    /api/workflow/instances
GET    /api/workflow/instances/:id
GET    /api/workflow/presets
GET    /api/workflow/presets/:presetType
GET    /api/workflow/stats
GET    /api/workflow/templates
GET    /api/workflow/templates/:id
GET    /api/workflows/:id
GET    /api/workflows/:id/analytics
GET    /api/workflows/:id/executions
GET    /api/workflows/activities/chain/:chainId/status
GET    /api/workflows/activities/completion-rate
GET    /api/workflows/activities/due-reminders
GET    /api/workflows/activities/executions/:executionId/progress
GET    /api/workflows/activities/load
GET    /api/workflows/activities/overdue
GET    /api/workflows/approvals/:id/approval-chain
GET    /api/workflows/approvals/:id/comments
GET    /api/workflows/approvals/:id/current-stage
GET    /api/workflows/approvals/:id/history
GET    /api/workflows/approvals/:id/status
GET    /api/workflows/approvals/analytics/overview
GET    /api/workflows/approvals/metrics/approval-rate
GET    /api/workflows/approvals/metrics/bottlenecks
GET    /api/workflows/approvals/metrics/cycle-time
GET    /api/workflows/approvals/my-approvals
GET    /api/workflows/approvals/pending
GET    /api/workflows/approvals/policies/applicable
GET    /api/workflows/campaigns/:id/eligible-contacts
GET    /api/workflows/campaigns/:id/engagement-stats
GET    /api/workflows/campaigns/:id/performance
GET    /api/workflows/campaigns/:id/roi
GET    /api/workflows/campaigns/analytics/overview
GET    /api/workflows/clients/:id/engagement-score
GET    /api/workflows/clients/:id/health-score
GET    /api/workflows/clients/:id/lifecycle-stage
GET    /api/workflows/clients/:id/lifetime-value
GET    /api/workflows/clients/:id/offboarding-progress
GET    /api/workflows/clients/:id/onboarding-progress
GET    /api/workflows/clients/:id/pending-documents
GET    /api/workflows/clients/:id/renewal-probability
GET    /api/workflows/clients/retention-metrics
GET    /api/workflows/leads/:id/next-nurturing-step
GET    /api/workflows/leads/:id/qualification-score
GET    /api/workflows/leads/:id/workflow-history
GET    /api/workflows/leads/stats
GET    /api/workflows/quotes/:id/approval-status
GET    /api/workflows/quotes/:id/check-expiry
GET    /api/workflows/quotes/:id/compare-versions
GET    /api/workflows/quotes/:id/version-history
GET    /api/workflows/quotes/:id/view-link
GET    /api/workflows/quotes/conversion-rate
GET    /api/workflows/quotes/metrics
GET    /api/workflows/quotes/pending-approvals
GET    /api/zatca/config
GET    /api/zatca/failed
GET    /api/zatca/pending
GET    /api/zatca/stats
GET    /api/zatca/status/:invoiceId
GET    /api/zoom/auth-url
GET    /api/zoom/callback
GET    /api/zoom/meetings
GET    /api/zoom/meetings/:meetingId
GET    /api/zoom/recordings
GET    /api/zoom/recordings/:meetingId
GET    /api/zoom/status
```

</details>

### POST (1989)

<details>
<summary>Click to expand</summary>

```
POST   /api/accounts
POST   /api/activities
POST   /api/activities/:id/cancel
POST   /api/activities/:id/done
POST   /api/activities/:id/reassign
POST   /api/activities/:id/reschedule
POST   /api/activities/types
POST   /api/activityPlans
POST   /api/activityPlans/:id/duplicate
POST   /api/activitys
POST   /api/activitys/:id/cancel
POST   /api/activitys/:id/done
POST   /api/activitys/types
POST   /api/admin-api/users/:id/reset-password
POST   /api/admin-api/users/:id/revoke-tokens
POST   /api/admin/firm/expire-all-passwords
POST   /api/admin/ldap/config
POST   /api/admin/ldap/login
POST   /api/admin/ldap/sync
POST   /api/admin/ldap/test
POST   /api/admin/ldap/test-auth
POST   /api/admin/revoked-tokens/cleanup
POST   /api/admin/tools/clear-cache
POST   /api/admin/tools/clients/merge
POST   /api/admin/tools/firms/:id/cleanup-orphaned
POST   /api/admin/tools/firms/:id/fix-currency
POST   /api/admin/tools/firms/:id/import
POST   /api/admin/tools/firms/:id/recalculate-invoices
POST   /api/admin/tools/firms/:id/reindex
POST   /api/admin/tools/impersonation/:sessionId/end
POST   /api/admin/tools/key-rotation/auto-rotate
POST   /api/admin/tools/key-rotation/cleanup
POST   /api/admin/tools/key-rotation/generate
POST   /api/admin/tools/key-rotation/initialize
POST   /api/admin/tools/key-rotation/rotate
POST   /api/admin/tools/users/:id/impersonate
POST   /api/admin/tools/users/:id/lock
POST   /api/admin/tools/users/:id/reset-password
POST   /api/admin/tools/users/:id/unlock
POST   /api/admin/tools/users/merge
POST   /api/admin/users/:id/claims/validate
POST   /api/admin/users/:id/expire-password
POST   /api/admin/users/:id/revoke-tokens
POST   /api/ai-matching/auto-match
POST   /api/ai-matching/batch
POST   /api/ai-matching/confirm
POST   /api/ai-matching/match
POST   /api/ai-matching/patterns/cleanup
POST   /api/ai-matching/reject
POST   /api/ai-matching/suggestions/bulk-confirm
POST   /api/ai-matching/unmatch
POST   /api/analytics-reports
POST   /api/analytics-reports/:id/clone
POST   /api/analytics-reports/:id/export
POST   /api/analytics-reports/:id/favorite
POST   /api/analytics-reports/:id/pin
POST   /api/analytics-reports/:id/run
POST   /api/analytics-reports/:id/schedule
POST   /api/analytics-reports/bulk-delete
POST   /api/analytics-reports/from-template/:templateId
POST   /api/analyticss/events
POST   /api/answers
POST   /api/answers/like/:_id
POST   /api/api-keys
POST   /api/api-keys/:id/regenerate
POST   /api/appointments
POST   /api/appointments/:id/reschedule
POST   /api/appointments/:id/sync-calendar
POST   /api/appointments/availability
POST   /api/appointments/availability/bulk
POST   /api/appointments/blocked-times
POST   /api/appointments/book/:firmId
POST   /api/approvals/:id/approve
POST   /api/approvals/:id/cancel
POST   /api/approvals/:id/cancel
POST   /api/approvals/:id/decide
POST   /api/approvals/:id/delegate
POST   /api/approvals/:id/reject
POST   /api/approvals/check
POST   /api/approvals/initiate
POST   /api/approvals/templates
POST   /api/approvals/workflows
POST   /api/apps/:appId/connect
POST   /api/apps/:appId/disconnect
POST   /api/apps/:appId/sync
POST   /api/apps/:appId/test
POST   /api/assets
POST   /api/assets/:assetId/depreciation/calculate
POST   /api/assets/:assetId/maintenance
POST   /api/assets/:assetId/maintenance/:scheduleId/complete
POST   /api/assets/:id/scrap
POST   /api/assets/:id/sell
POST   /api/assets/:id/submit
POST   /api/assets/categories
POST   /api/assets/maintenance
POST   /api/assets/maintenance/:id/complete
POST   /api/assets/movements
POST   /api/assets/repairs
POST   /api/assets/repairs/:id/complete
POST   /api/attendance
POST   /api/attendance/:id/approve
POST   /api/attendance/:id/break/end
POST   /api/attendance/:id/break/start
POST   /api/attendance/:id/corrections
POST   /api/attendance/:id/overtime/approve
POST   /api/attendance/:id/reject
POST   /api/attendance/:id/violations
POST   /api/attendance/:id/violations/:violationIndex/appeal
POST   /api/attendance/:recordId/approve-early-departure
POST   /api/attendance/:recordId/approve-overtime
POST   /api/attendance/:recordId/approve-timesheet
POST   /api/attendance/:recordId/excuse-late
POST   /api/attendance/:recordId/reject-timesheet
POST   /api/attendance/:recordId/violations/:violationId/confirm
POST   /api/attendance/:recordId/violations/:violationId/dismiss
POST   /api/attendance/bulk
POST   /api/attendance/check-in
POST   /api/attendance/check-out
POST   /api/attendance/import
POST   /api/attendance/lock-for-payroll
POST   /api/attendance/mark-absences
POST   /api/audit-logs/archive/run
POST   /api/audit-logs/archive/verify
POST   /api/audit-logs/archiving/restore
POST   /api/audit-logs/archiving/run
POST   /api/audit-logs/archiving/verify
POST   /api/audit-logs/batch
POST   /api/audit-logs/check-brute-force
POST   /api/audit-logs/compliance/export-for-audit
POST   /api/audit-logs/compliance/generate-report
POST   /api/audit-logs/compliance/verify-integrity
POST   /api/audit-logs/log-bulk-action
POST   /api/audit-logs/log-security-event
POST   /api/audit-logs/log-with-diff
POST   /api/auth/anonymous
POST   /api/auth/anonymous/convert
POST   /api/auth/anonymous/extend
POST   /api/auth/captcha/check-required
POST   /api/auth/captcha/verify
POST   /api/auth/change-password
POST   /api/auth/check-availability
POST   /api/auth/forgot-password
POST   /api/auth/google/one-tap
POST   /api/auth/login
POST   /api/auth/logout
POST   /api/auth/logout-all
POST   /api/auth/magic-link/send
POST   /api/auth/magic-link/verify
POST   /api/auth/mfa/backup-codes/generate
POST   /api/auth/mfa/backup-codes/generate
POST   /api/auth/mfa/backup-codes/regenerate
POST   /api/auth/mfa/backup-codes/regenerate
POST   /api/auth/mfa/backup-codes/verify
POST   /api/auth/mfa/backup-codes/verify
POST   /api/auth/mfa/disable
POST   /api/auth/mfa/email/send
POST   /api/auth/mfa/setup
POST   /api/auth/mfa/sms/send
POST   /api/auth/mfa/verify
POST   /api/auth/mfa/verify-setup
POST   /api/auth/onboarding-progress
POST   /api/auth/onboarding/company-info
POST   /api/auth/onboarding/company-logo
POST   /api/auth/onboarding/complete
POST   /api/auth/onboarding/modules
POST   /api/auth/onboarding/skip
POST   /api/auth/onboarding/user-avatar
POST   /api/auth/onboarding/user-profile
POST   /api/auth/password/check-breach
POST   /api/auth/phone/resend-otp
POST   /api/auth/phone/send-otp
POST   /api/auth/phone/verify
POST   /api/auth/phone/verify-otp
POST   /api/auth/reauthenticate
POST   /api/auth/reauthenticate/challenge
POST   /api/auth/reauthenticate/verify
POST   /api/auth/refresh
POST   /api/auth/refresh-activity
POST   /api/auth/register
POST   /api/auth/resend-otp
POST   /api/auth/resend-verification
POST   /api/auth/reset-password
POST   /api/auth/saml/acs/:firmId
POST   /api/auth/saml/config/test
POST   /api/auth/saml/sls/:firmId
POST   /api/auth/send-otp
POST   /api/auth/sessions/:sessionId/report
POST   /api/auth/sessions/extend
POST   /api/auth/sso/:provider/callback
POST   /api/auth/sso/callback
POST   /api/auth/sso/detect
POST   /api/auth/sso/domain/:domain/cache/invalidate
POST   /api/auth/sso/domain/:domain/verify
POST   /api/auth/sso/domain/:domain/verify/generate
POST   /api/auth/sso/domain/:domain/verify/manual
POST   /api/auth/sso/initiate
POST   /api/auth/sso/link
POST   /api/auth/verify-captcha
POST   /api/auth/verify-email
POST   /api/auth/verify-otp
POST   /api/auth/webauthn/authenticate/finish
POST   /api/auth/webauthn/authenticate/start
POST   /api/auth/webauthn/register/finish
POST   /api/auth/webauthn/register/start
POST   /api/automated-actions
POST   /api/automated-actions/:id/duplicate
POST   /api/automated-actions/:id/test
POST   /api/automated-actions/:id/toggle
POST   /api/automated-actions/bulk
POST   /api/automated-actions/bulk/disable
POST   /api/automated-actions/bulk/enable
POST   /api/automatedActions
POST   /api/automatedActions/:id/duplicate
POST   /api/automatedActions/:id/test
POST   /api/automatedActions/:id/toggle
POST   /api/automatedActions/bulk/disable
POST   /api/automatedActions/bulk/enable
POST   /api/automations
POST   /api/automations/:id/disable
POST   /api/automations/:id/enable
POST   /api/automations/:id/test
POST   /api/bank-accounts
POST   /api/bank-accounts/:id/disconnect
POST   /api/bank-accounts/:id/set-default
POST   /api/bank-accounts/:id/sync
POST   /api/bank-reconciliation
POST   /api/bank-reconciliation/:id/cancel
POST   /api/bank-reconciliation/:id/clear
POST   /api/bank-reconciliation/:id/complete
POST   /api/bank-reconciliation/:id/unclear
POST   /api/bank-reconciliation/auto-match/:accountId
POST   /api/bank-reconciliation/currency/convert
POST   /api/bank-reconciliation/currency/rates
POST   /api/bank-reconciliation/currency/update
POST   /api/bank-reconciliation/feeds
POST   /api/bank-reconciliation/import/csv
POST   /api/bank-reconciliation/import/ofx
POST   /api/bank-reconciliation/match/confirm/:id
POST   /api/bank-reconciliation/match/reject/:id
POST   /api/bank-reconciliation/match/split
POST   /api/bank-reconciliation/rules
POST   /api/bank-transactions
POST   /api/bank-transactions/:transactionId/match
POST   /api/bank-transactions/:transactionId/unmatch
POST   /api/bank-transactions/import/:accountId
POST   /api/bank-transfers
POST   /api/bank-transfers/:id/cancel
POST   /api/bill-payments
POST   /api/bill-payments/:id/cancel
POST   /api/billing/groups
POST   /api/billing/groups/:id/duplicate
POST   /api/billing/groups/:id/rates
POST   /api/billing/payment-methods
POST   /api/billing/rates
POST   /api/billing/rates/standard
POST   /api/billing/setup-intent
POST   /api/billing/subscription
POST   /api/billing/subscription/reactivate
POST   /api/billing/webhook
POST   /api/bills
POST   /api/bills/:id/approve
POST   /api/bills/:id/attachments
POST   /api/bills/:id/cancel
POST   /api/bills/:id/duplicate
POST   /api/bills/:id/generate-next
POST   /api/bills/:id/pay
POST   /api/bills/:id/post-to-gl
POST   /api/bills/:id/receive
POST   /api/bills/:id/stop-recurring
POST   /api/biometric/checkin-gps
POST   /api/biometric/devices
POST   /api/biometric/devices/:id/heartbeat
POST   /api/biometric/devices/:id/sync
POST   /api/biometric/enrollments
POST   /api/biometric/enrollments/:id/card
POST   /api/biometric/enrollments/:id/facial
POST   /api/biometric/enrollments/:id/fingerprint
POST   /api/biometric/enrollments/:id/pin
POST   /api/biometric/enrollments/:id/revoke
POST   /api/biometric/geofence
POST   /api/biometric/geofence/validate
POST   /api/biometric/identify
POST   /api/biometric/logs/process
POST   /api/biometric/verify
POST   /api/budgets
POST   /api/budgets/:budgetId/lines
POST   /api/budgets/:id/approve
POST   /api/budgets/:id/close
POST   /api/budgets/:id/duplicate
POST   /api/budgets/:id/reject
POST   /api/budgets/:id/submit
POST   /api/bulkActionss/:entityType
POST   /api/bulkActionss/:entityType/validate
POST   /api/bulkActionss/:jobId/cancel
POST   /api/buying/material-requests
POST   /api/buying/purchase-invoices
POST   /api/buying/purchase-invoices/:id/submit
POST   /api/buying/purchase-orders
POST   /api/buying/purchase-orders/:id/approve
POST   /api/buying/purchase-orders/:id/cancel
POST   /api/buying/purchase-orders/:id/submit
POST   /api/buying/purchase-receipts
POST   /api/buying/purchase-receipts/:id/submit
POST   /api/buying/rfqs
POST   /api/buying/rfqs/:id/submit
POST   /api/buying/suppliers
POST   /api/campaigns
POST   /api/campaigns/:id/complete
POST   /api/campaigns/:id/duplicate
POST   /api/campaigns/:id/launch
POST   /api/campaigns/:id/pause
POST   /api/campaigns/:id/resume
POST   /api/case-notion/cases/:caseId/notion/blocks/:blockId/comments
POST   /api/case-notion/cases/:caseId/notion/blocks/:blockId/create-task
POST   /api/case-notion/cases/:caseId/notion/blocks/:blockId/link-document
POST   /api/case-notion/cases/:caseId/notion/blocks/:blockId/link-event
POST   /api/case-notion/cases/:caseId/notion/blocks/:blockId/link-hearing
POST   /api/case-notion/cases/:caseId/notion/blocks/:blockId/link-task
POST   /api/case-notion/cases/:caseId/notion/blocks/:blockId/lock
POST   /api/case-notion/cases/:caseId/notion/blocks/:blockId/move
POST   /api/case-notion/cases/:caseId/notion/blocks/:blockId/unlink-task
POST   /api/case-notion/cases/:caseId/notion/blocks/:blockId/unlock
POST   /api/case-notion/cases/:caseId/notion/comments/:commentId/resolve
POST   /api/case-notion/cases/:caseId/notion/frames/:frameId/auto-detect
POST   /api/case-notion/cases/:caseId/notion/frames/:frameId/children
POST   /api/case-notion/cases/:caseId/notion/pages
POST   /api/case-notion/cases/:caseId/notion/pages/:pageId/align
POST   /api/case-notion/cases/:caseId/notion/pages/:pageId/apply-template
POST   /api/case-notion/cases/:caseId/notion/pages/:pageId/archive
POST   /api/case-notion/cases/:caseId/notion/pages/:pageId/arrows
POST   /api/case-notion/cases/:caseId/notion/pages/:pageId/blocks
POST   /api/case-notion/cases/:caseId/notion/pages/:pageId/connections
POST   /api/case-notion/cases/:caseId/notion/pages/:pageId/distribute
POST   /api/case-notion/cases/:caseId/notion/pages/:pageId/duplicate
POST   /api/case-notion/cases/:caseId/notion/pages/:pageId/duplicate
POST   /api/case-notion/cases/:caseId/notion/pages/:pageId/favorite
POST   /api/case-notion/cases/:caseId/notion/pages/:pageId/frames
POST   /api/case-notion/cases/:caseId/notion/pages/:pageId/group
POST   /api/case-notion/cases/:caseId/notion/pages/:pageId/pin
POST   /api/case-notion/cases/:caseId/notion/pages/:pageId/redo
POST   /api/case-notion/cases/:caseId/notion/pages/:pageId/restore
POST   /api/case-notion/cases/:caseId/notion/pages/:pageId/save-as-template
POST   /api/case-notion/cases/:caseId/notion/pages/:pageId/shapes
POST   /api/case-notion/cases/:caseId/notion/pages/:pageId/undo
POST   /api/case-notion/cases/:caseId/notion/pages/:pageId/ungroup
POST   /api/case-notion/cases/:caseId/notion/pages/merge
POST   /api/case-notion/cases/:caseId/notion/synced-blocks
POST   /api/case-notion/cases/:caseId/notion/synced-blocks/:blockId/unsync
POST   /api/case-workflows/instances
POST   /api/case-workflows/instances/:id/advance
POST   /api/case-workflows/instances/:id/cancel
POST   /api/case-workflows/instances/:id/pause
POST   /api/case-workflows/instances/:id/resume
POST   /api/case-workflows/templates
POST   /api/cases
POST   /api/cases/:_id/claim
POST   /api/cases/:_id/document
POST   /api/cases/:_id/documents/confirm
POST   /api/cases/:_id/documents/upload-url
POST   /api/cases/:_id/hearing
POST   /api/cases/:_id/note
POST   /api/cases/:_id/notes
POST   /api/cases/:_id/rich-documents
POST   /api/cases/:_id/rich-documents/:docId/versions/:versionNumber/restore
POST   /api/cases/:_id/timeline
POST   /api/cases/:id/start-workflow
POST   /api/cases/:id/workflow/add-court-date
POST   /api/cases/:id/workflow/add-deadline
POST   /api/cases/:id/workflow/cancel
POST   /api/cases/:id/workflow/complete-requirement
POST   /api/cases/:id/workflow/pause
POST   /api/cases/:id/workflow/resume
POST   /api/cases/:id/workflow/transition-stage
POST   /api/chat
POST   /api/chat/stream
POST   /api/chatter/activities
POST   /api/chatter/activities/:activityId/complete
POST   /api/chatter/followers
POST   /api/chatter/followers/bulk-add
POST   /api/chatter/followers/bulk-remove
POST   /api/chatterFollowers/:model/:recordId/followers
POST   /api/chatterFollowers/:model/:recordId/followers/bulk
POST   /api/chatterFollowers/:model/:recordId/toggle-follow
POST   /api/churn/events
POST   /api/churn/events/:id/exit-survey
POST   /api/churn/health-score/:firmId/recalculate
POST   /api/churn/interventions/:firmId/trigger
POST   /api/clients
POST   /api/clients/:id/attachments
POST   /api/clients/:id/conflict-check
POST   /api/clients/:id/verify/absher
POST   /api/clients/:id/verify/address
POST   /api/clients/:id/verify/wathq
POST   /api/cloudStorages/:provider/disconnect
POST   /api/cloudStorages/:provider/files
POST   /api/cloudStorages/:provider/files/:fileId/move
POST   /api/cloudStorages/:provider/files/:fileId/share
POST   /api/cloudStorages/:provider/folders
POST   /api/commandPalettes/saved-searches
POST   /api/commandPalettes/track/command
POST   /api/commandPalettes/track/record
POST   /api/commandPalettes/track/search
POST   /api/compensatory-leave-requests
POST   /api/compensatory-leave-requests/:id/approve
POST   /api/compensatory-leave-requests/:id/cancel
POST   /api/compensatory-leave-requests/:id/reject
POST   /api/compensatory-leave-requests/:id/submit
POST   /api/compensatory-leave-requests/:requestId/documents
POST   /api/compensatory-leave-requests/bulk-approve
POST   /api/compensatory-leave-requests/bulk-reject
POST   /api/compensatory-leave-requests/calculate-days
POST   /api/compensatory-leave-requests/expire-unused
POST   /api/competitors
POST   /api/competitors
POST   /api/competitors/:id/record-loss
POST   /api/competitors/:id/record-win
POST   /api/conflict-checks
POST   /api/conflict-checks/:id/matches/:matchIndex/resolve
POST   /api/conflict-checks/quick
POST   /api/consent
POST   /api/consent/export
POST   /api/contactLists
POST   /api/contactLists/:id/duplicate
POST   /api/contactLists/:id/members
POST   /api/contactLists/:id/refresh
POST   /api/contacts
POST   /api/contacts/:id/link-case
POST   /api/contacts/:id/link-client
POST   /api/contacts/:id/unlink-case
POST   /api/contacts/:id/unlink-client
POST   /api/contacts/bulk-delete
POST   /api/contracts
POST   /api/contracts/:contractId/amendments
POST   /api/contracts/:contractId/breach
POST   /api/contracts/:contractId/enforcement
POST   /api/contracts/:contractId/link-case
POST   /api/contracts/:contractId/notarization
POST   /api/contracts/:contractId/parties
POST   /api/contracts/:contractId/reminders
POST   /api/contracts/:contractId/save-as-template
POST   /api/contracts/:contractId/signatures/:partyIndex
POST   /api/contracts/:contractId/signatures/initiate
POST   /api/contracts/:contractId/versions
POST   /api/contracts/:contractId/versions/:versionNumber/revert
POST   /api/contracts/templates/:templateId/use
POST   /api/conversations
POST   /api/conversations/:id/assign
POST   /api/conversations/:id/close
POST   /api/conversations/:id/messages
POST   /api/conversations/:id/reopen
POST   /api/conversations/:id/snooze
POST   /api/corporate-cards
POST   /api/corporate-cards/:id/block
POST   /api/corporate-cards/:id/transactions/:transactionId/categorize
POST   /api/corporate-cards/:id/transactions/:transactionId/dispute
POST   /api/corporate-cards/:id/transactions/:transactionId/reconcile
POST   /api/corporate-cards/:id/transactions/import
POST   /api/corporate-cards/:id/unblock
POST   /api/corporate-cards/transactions
POST   /api/corporate-cards/transactions/:transactionId/dispute
POST   /api/corporate-cards/transactions/:transactionId/match
POST   /api/corporate-cards/transactions/:transactionId/reconcile
POST   /api/corporate-cards/transactions/:transactionId/resolve-dispute
POST   /api/corporate-cards/transactions/bulk-reconcile
POST   /api/corporate-cards/transactions/import
POST   /api/credit-notes
POST   /api/credit-notes/:id/apply
POST   /api/credit-notes/:id/issue
POST   /api/credit-notes/:id/void
POST   /api/crm-activities
POST   /api/crm-activities/:id/complete
POST   /api/crm-activities/log/call
POST   /api/crm-activities/log/email
POST   /api/crm-activities/log/meeting
POST   /api/crm-activities/log/note
POST   /api/crm-pipelines
POST   /api/crm-pipelines/:id/default
POST   /api/crm-pipelines/:id/duplicate
POST   /api/crm-pipelines/:id/stages
POST   /api/crm-pipelines/:id/stages/reorder
POST   /api/crm-reports/export
POST   /api/crm/appointments
POST   /api/crm/lead-sources
POST   /api/crm/leads
POST   /api/crm/sales-stages
POST   /api/crmSettings/reset
POST   /api/currency/convert
POST   /api/currency/rates
POST   /api/currency/update
POST   /api/customFields
POST   /api/customFields/:id/validate
POST   /api/customFields/bulk-update
POST   /api/customFields/import
POST   /api/customFields/search
POST   /api/customFields/values/:entityType/:entityId
POST   /api/customFields/values/:entityType/:entityId/bulk
POST   /api/cycles
POST   /api/cycles/:id/complete
POST   /api/cycles/:id/start
POST   /api/cycles/:id/tasks/:taskId
POST   /api/data-export/export
POST   /api/data-export/import
POST   /api/data-export/import/:id/cancel
POST   /api/data-export/import/:id/start
POST   /api/data-export/import/:id/validate
POST   /api/data-export/jobs/:id/cancel
POST   /api/data-export/templates
POST   /api/dealHealths/:id/refresh
POST   /api/dealHealths/:id/unstuck
POST   /api/dealRooms/:id/access
POST   /api/dealRooms/:id/documents
POST   /api/dealRooms/:id/documents/:index/view
POST   /api/dealRooms/:id/pages
POST   /api/dealRooms/deals/:dealId/room
POST   /api/debit-notes
POST   /api/debit-notes/:id/apply
POST   /api/debit-notes/:id/approve
POST   /api/debit-notes/:id/cancel
POST   /api/debit-notes/:id/reject
POST   /api/debit-notes/:id/submit
POST   /api/deduplications/contacts/auto-merge
POST   /api/deduplications/contacts/merge
POST   /api/deduplications/contacts/not-duplicate
POST   /api/deduplications/contacts/scan-duplicates
POST   /api/discord/complete-setup
POST   /api/discord/disconnect
POST   /api/discord/message
POST   /api/discord/test
POST   /api/discord/webhook
POST   /api/disputes
POST   /api/disputes/:id/escalate
POST   /api/disputes/:id/evidence
POST   /api/disputes/:id/mediator-note
POST   /api/disputes/:id/resolve
POST   /api/disputes/:id/respond
POST   /api/document-analysis/:documentId
POST   /api/document-analysis/:documentId/reanalyze
POST   /api/document-analysis/batch
POST   /api/documents/:documentId/versions/:versionId/compare
POST   /api/documents/:documentId/versions/:versionId/restore
POST   /api/documents/:id/decrypt
POST   /api/documents/:id/encrypt
POST   /api/documents/:id/move
POST   /api/documents/:id/revoke-share
POST   /api/documents/:id/share
POST   /api/documents/:id/versions
POST   /api/documents/:id/versions/:versionId/restore
POST   /api/documents/bulk-delete
POST   /api/documents/confirm
POST   /api/documents/upload
POST   /api/docusign/disconnect
POST   /api/docusign/envelopes
POST   /api/docusign/envelopes/:envelopeId/resend
POST   /api/docusign/envelopes/:envelopeId/signing-url
POST   /api/docusign/envelopes/:envelopeId/void
POST   /api/docusign/envelopes/from-template
POST   /api/docusign/templates/defaults
POST   /api/docusign/webhook
POST   /api/dunning/history
POST   /api/dunning/history/:invoiceId/escalate
POST   /api/dunning/history/:invoiceId/pause
POST   /api/dunning/history/:invoiceId/resume
POST   /api/dunning/policies
POST   /api/dunning/policies/:id/apply
POST   /api/dunning/policies/:id/duplicate
POST   /api/dunning/policies/:id/set-default
POST   /api/dunning/policies/:id/test
POST   /api/dunning/policies/:id/toggle-status
POST   /api/email-marketing/campaigns
POST   /api/email-marketing/campaigns/:id/cancel
POST   /api/email-marketing/campaigns/:id/duplicate
POST   /api/email-marketing/campaigns/:id/pause
POST   /api/email-marketing/campaigns/:id/resume
POST   /api/email-marketing/campaigns/:id/schedule
POST   /api/email-marketing/campaigns/:id/send
POST   /api/email-marketing/campaigns/:id/test
POST   /api/email-marketing/drip-campaigns
POST   /api/email-marketing/drip-campaigns/:id/pause
POST   /api/email-marketing/drip-campaigns/:id/start
POST   /api/email-marketing/drip-campaigns/:id/stop
POST   /api/email-marketing/segments
POST   /api/email-marketing/segments/:id/refresh
POST   /api/email-marketing/subscribers
POST   /api/email-marketing/subscribers/:id/unsubscribe
POST   /api/email-marketing/subscribers/export
POST   /api/email-marketing/subscribers/import
POST   /api/email-marketing/templates
POST   /api/email-marketing/templates/:id/preview
POST   /api/email-marketing/webhooks/email/resend
POST   /api/emailTemplates
POST   /api/emailTemplates/:id/duplicate
POST   /api/emailTemplates/:id/preview
POST   /api/emailTemplates/:id/test
POST   /api/events
POST   /api/events/:eventId/action-items/:actionItemId/toggle
POST   /api/events/:eventId/attachments
POST   /api/events/:eventId/attendees/:attendeeId/check-in
POST   /api/events/:eventId/attendees/:attendeeId/check-out
POST   /api/events/:eventId/calendar-sync
POST   /api/events/:eventId/comments
POST   /api/events/:eventId/recurring/skip
POST   /api/events/:eventId/recurring/stop
POST   /api/events/:eventId/save-as-template
POST   /api/events/:eventId/send-invitations
POST   /api/events/:id/action-items
POST   /api/events/:id/agenda
POST   /api/events/:id/archive
POST   /api/events/:id/attendees
POST   /api/events/:id/cancel
POST   /api/events/:id/clone
POST   /api/events/:id/complete
POST   /api/events/:id/location/check
POST   /api/events/:id/postpone
POST   /api/events/:id/reschedule
POST   /api/events/:id/rsvp
POST   /api/events/:id/start
POST   /api/events/:id/unarchive
POST   /api/events/availability
POST   /api/events/bulk
POST   /api/events/bulk/archive
POST   /api/events/bulk/cancel
POST   /api/events/bulk/complete
POST   /api/events/bulk/unarchive
POST   /api/events/check-availability
POST   /api/events/find-slots
POST   /api/events/import/ics
POST   /api/events/location/check
POST   /api/events/parse
POST   /api/events/templates/:templateId/create
POST   /api/events/voice
POST   /api/exchangeRateRevaluation
POST   /api/exchangeRateRevaluation/:id/post
POST   /api/exchangeRateRevaluation/:id/reverse
POST   /api/exchangeRateRevaluation/preview
POST   /api/expense-policies
POST   /api/expense-policies/:id/duplicate
POST   /api/expense-policies/:id/set-default
POST   /api/expense-policies/:id/toggle-status
POST   /api/expense-policies/:policyId/check-compliance
POST   /api/expense-policies/check-compliance
POST   /api/expense-policies/create-default
POST   /api/expenses
POST   /api/expenses/:id/approve
POST   /api/expenses/:id/receipt
POST   /api/expenses/:id/reimburse
POST   /api/expenses/:id/reject
POST   /api/expenses/:id/submit
POST   /api/expenses/bulk-approve
POST   /api/expenses/bulk-delete
POST   /api/expenses/suggest-category
POST   /api/fieldHistorys/:historyId/revert
POST   /api/finance-setup/complete
POST   /api/finance-setup/reset
POST   /api/firms
POST   /api/firms/:firmId/invitations
POST   /api/firms/:firmId/invitations/:invitationId/resend
POST   /api/firms/:firmId/ip-whitelist
POST   /api/firms/:firmId/ip-whitelist/disable
POST   /api/firms/:firmId/ip-whitelist/enable
POST   /api/firms/:firmId/ip-whitelist/test
POST   /api/firms/:firmId/sso/test
POST   /api/firms/:firmId/sso/upload-metadata
POST   /api/firms/:id/access
POST   /api/firms/:id/leave
POST   /api/firms/:id/members/:memberId/depart
POST   /api/firms/:id/members/:memberId/reinstate
POST   /api/firms/:id/members/invite
POST   /api/firms/:id/transfer-ownership
POST   /api/firms/lawyer/add
POST   /api/firms/lawyer/remove
POST   /api/firms/switch
POST   /api/fiscal-periods/:id/close
POST   /api/fiscal-periods/:id/lock
POST   /api/fiscal-periods/:id/open
POST   /api/fiscal-periods/:id/reopen
POST   /api/fiscal-periods/:id/year-end-closing
POST   /api/fiscal-periods/create-year
POST   /api/followups
POST   /api/followups/:id/cancel
POST   /api/followups/:id/complete
POST   /api/followups/:id/notes
POST   /api/followups/:id/reschedule
POST   /api/followups/bulk-complete
POST   /api/followups/bulk-delete
POST   /api/gantt/auto-schedule/:projectId
POST   /api/gantt/baseline/:projectId
POST   /api/gantt/collaboration/presence
POST   /api/gantt/data/filter
POST   /api/gantt/level-resources/:projectId
POST   /api/gantt/link
POST   /api/gantt/milestone
POST   /api/gantt/resources/suggest
POST   /api/gantt/task/reorder
POST   /api/general-ledger/:id/void
POST   /api/general-ledger/void/:id
POST   /api/gigs
POST   /api/github/disconnect
POST   /api/github/repositories/:owner/:repo/issues
POST   /api/github/repositories/:owner/:repo/pulls/:prNumber/comments
POST   /api/github/webhook
POST   /api/gmail/disconnect
POST   /api/gmail/drafts
POST   /api/gmail/labels
POST   /api/gmail/messages/:messageId/reply
POST   /api/gmail/messages/send
POST   /api/gmail/watch
POST   /api/gmail/webhook
POST   /api/google-calendar/calendars/:calendarId/events
POST   /api/google-calendar/disconnect
POST   /api/google-calendar/export
POST   /api/google-calendar/import
POST   /api/google-calendar/sync/auto/disable
POST   /api/google-calendar/sync/auto/enable
POST   /api/google-calendar/sync/export/:eventId
POST   /api/google-calendar/sync/import
POST   /api/google-calendar/watch/:calendarId
POST   /api/google-calendar/webhook
POST   /api/gosi/calculate
POST   /api/gosi/calculate/:employeeId
POST   /api/hr-analytics/snapshot
POST   /api/hr/advances
POST   /api/hr/advances/:advanceId/approve
POST   /api/hr/advances/:advanceId/cancel
POST   /api/hr/advances/:advanceId/communications
POST   /api/hr/advances/:advanceId/disburse
POST   /api/hr/advances/:advanceId/documents
POST   /api/hr/advances/:advanceId/early-recovery
POST   /api/hr/advances/:advanceId/issue-clearance
POST   /api/hr/advances/:advanceId/payroll-deduction
POST   /api/hr/advances/:advanceId/recover
POST   /api/hr/advances/:advanceId/reject
POST   /api/hr/advances/:advanceId/write-off
POST   /api/hr/advances/bulk-delete
POST   /api/hr/advances/check-eligibility
POST   /api/hr/asset-assignments
POST   /api/hr/asset-assignments/:id/acknowledge
POST   /api/hr/asset-assignments/:id/clearance
POST   /api/hr/asset-assignments/:id/incident
POST   /api/hr/asset-assignments/:id/maintenance
POST   /api/hr/asset-assignments/:id/repair
POST   /api/hr/asset-assignments/:id/return/complete
POST   /api/hr/asset-assignments/:id/return/initiate
POST   /api/hr/asset-assignments/:id/transfer
POST   /api/hr/asset-assignments/bulk-delete
POST   /api/hr/attendance-rules
POST   /api/hr/attendance-rules/:id/duplicate
POST   /api/hr/attendance-rules/bulk
POST   /api/hr/compensation-rewards
POST   /api/hr/compensation-rewards/:id/allowances
POST   /api/hr/compensation-rewards/:id/approve-review
POST   /api/hr/compensation-rewards/:id/bonus
POST   /api/hr/compensation-rewards/:id/decline-review
POST   /api/hr/compensation-rewards/:id/recognition
POST   /api/hr/compensation-rewards/:id/salary-increase
POST   /api/hr/compensation-rewards/:id/submit-review
POST   /api/hr/compensation-rewards/:id/total-rewards-statement
POST   /api/hr/compensation-rewards/bulk-delete
POST   /api/hr/departments
POST   /api/hr/departments/bulk
POST   /api/hr/designations
POST   /api/hr/designations/bulk
POST   /api/hr/employee-benefits
POST   /api/hr/employee-benefits/:id/activate
POST   /api/hr/employee-benefits/:id/beneficiaries
POST   /api/hr/employee-benefits/:id/claims
POST   /api/hr/employee-benefits/:id/dependents
POST   /api/hr/employee-benefits/:id/pre-auth
POST   /api/hr/employee-benefits/:id/qualifying-events
POST   /api/hr/employee-benefits/:id/suspend
POST   /api/hr/employee-benefits/:id/terminate
POST   /api/hr/employee-benefits/bulk-delete
POST   /api/hr/employee-incentives
POST   /api/hr/employee-incentives/:id/approve
POST   /api/hr/employee-incentives/:id/process
POST   /api/hr/employee-incentives/:id/reject
POST   /api/hr/employee-incentives/:id/submit
POST   /api/hr/employee-incentives/bulk-approve
POST   /api/hr/employee-incentives/bulk-create
POST   /api/hr/employee-incentives/bulk-delete
POST   /api/hr/employee-loans
POST   /api/hr/employee-loans/:loanId/approve
POST   /api/hr/employee-loans/:loanId/communications
POST   /api/hr/employee-loans/:loanId/default
POST   /api/hr/employee-loans/:loanId/disburse
POST   /api/hr/employee-loans/:loanId/documents
POST   /api/hr/employee-loans/:loanId/early-settlement
POST   /api/hr/employee-loans/:loanId/issue-clearance
POST   /api/hr/employee-loans/:loanId/payments
POST   /api/hr/employee-loans/:loanId/payroll-deduction
POST   /api/hr/employee-loans/:loanId/reject
POST   /api/hr/employee-loans/:loanId/restructure
POST   /api/hr/employee-loans/:loanId/submit
POST   /api/hr/employee-loans/bulk-delete
POST   /api/hr/employee-loans/check-eligibility
POST   /api/hr/employee-promotions
POST   /api/hr/employee-promotions/:id/acknowledge
POST   /api/hr/employee-promotions/:id/apply
POST   /api/hr/employee-promotions/:id/approve
POST   /api/hr/employee-promotions/:id/cancel
POST   /api/hr/employee-promotions/:id/notify
POST   /api/hr/employee-promotions/:id/reject
POST   /api/hr/employee-promotions/:id/submit
POST   /api/hr/employee-promotions/bulk-delete
POST   /api/hr/employees
POST   /api/hr/employees/:id/allowances
POST   /api/hr/employees/:id/documents
POST   /api/hr/employees/:id/documents/:docId/verify
POST   /api/hr/employees/bulk-delete
POST   /api/hr/expense-claims
POST   /api/hr/expense-claims/:id/approve
POST   /api/hr/expense-claims/:id/approve-exception
POST   /api/hr/expense-claims/:id/check-compliance
POST   /api/hr/expense-claims/:id/confirm-payment
POST   /api/hr/expense-claims/:id/create-invoice
POST   /api/hr/expense-claims/:id/duplicate
POST   /api/hr/expense-claims/:id/line-items
POST   /api/hr/expense-claims/:id/mark-billable
POST   /api/hr/expense-claims/:id/process-payment
POST   /api/hr/expense-claims/:id/receipts
POST   /api/hr/expense-claims/:id/receipts/:receiptId/verify
POST   /api/hr/expense-claims/:id/reconcile-card
POST   /api/hr/expense-claims/:id/reject
POST   /api/hr/expense-claims/:id/request-changes
POST   /api/hr/expense-claims/:id/submit
POST   /api/hr/expense-claims/bulk-delete
POST   /api/hr/expense-policies
POST   /api/hr/expense-policies/:id/duplicate
POST   /api/hr/extended/compensatory-leave
POST   /api/hr/extended/compensatory-leave/:id/approve
POST   /api/hr/extended/employee-skills
POST   /api/hr/extended/incentives
POST   /api/hr/extended/leave-encashment
POST   /api/hr/extended/leave-encashment/:id/approve
POST   /api/hr/extended/promotions
POST   /api/hr/extended/promotions/:id/apply
POST   /api/hr/extended/promotions/:id/approve
POST   /api/hr/extended/retention-bonuses
POST   /api/hr/extended/retention-bonuses/:id/vest/:milestone
POST   /api/hr/extended/salary-components
POST   /api/hr/extended/salary-components/create-defaults
POST   /api/hr/extended/setup-wizard/complete-step/:stepId
POST   /api/hr/extended/setup-wizard/skip
POST   /api/hr/extended/setup-wizard/skip-step/:stepId
POST   /api/hr/extended/skills
POST   /api/hr/extended/staffing-plans
POST   /api/hr/extended/transfers
POST   /api/hr/extended/transfers/:id/apply
POST   /api/hr/extended/transfers/:id/approve
POST   /api/hr/extended/vehicles
POST   /api/hr/extended/vehicles/:id/assign
POST   /api/hr/extended/vehicles/:id/maintenance
POST   /api/hr/fleet/assignments
POST   /api/hr/fleet/assignments/:id/end
POST   /api/hr/fleet/drivers
POST   /api/hr/fleet/fuel-logs
POST   /api/hr/fleet/fuel-logs/:id/verify
POST   /api/hr/fleet/incidents
POST   /api/hr/fleet/inspections
POST   /api/hr/fleet/maintenance
POST   /api/hr/fleet/trips
POST   /api/hr/fleet/trips/:id/end
POST   /api/hr/fleet/vehicles
POST   /api/hr/grievances
POST   /api/hr/grievances/:id/acknowledge
POST   /api/hr/grievances/:id/appeal
POST   /api/hr/grievances/:id/appeal/decide
POST   /api/hr/grievances/:id/close
POST   /api/hr/grievances/:id/complete-investigation
POST   /api/hr/grievances/:id/escalate
POST   /api/hr/grievances/:id/evidence
POST   /api/hr/grievances/:id/interviews
POST   /api/hr/grievances/:id/labor-office
POST   /api/hr/grievances/:id/resolve
POST   /api/hr/grievances/:id/start-investigation
POST   /api/hr/grievances/:id/timeline
POST   /api/hr/grievances/:id/withdraw
POST   /api/hr/grievances/:id/witnesses
POST   /api/hr/grievances/bulk-delete
POST   /api/hr/job-positions
POST   /api/hr/job-positions/:id/clone
POST   /api/hr/job-positions/:id/documents
POST   /api/hr/job-positions/:id/eliminate
POST   /api/hr/job-positions/:id/fill
POST   /api/hr/job-positions/:id/freeze
POST   /api/hr/job-positions/:id/unfreeze
POST   /api/hr/job-positions/:id/vacant
POST   /api/hr/job-positions/:id/vacate
POST   /api/hr/job-positions/bulk-delete
POST   /api/hr/leave-management/leave-allocations
POST   /api/hr/leave-management/leave-allocations/:id/adjust
POST   /api/hr/leave-management/leave-allocations/:id/approve
POST   /api/hr/leave-management/leave-allocations/bulk
POST   /api/hr/leave-management/leave-allocations/generate
POST   /api/hr/leave-management/leave-periods
POST   /api/hr/leave-management/leave-periods/:id/activate
POST   /api/hr/leave-management/leave-periods/:id/close
POST   /api/hr/leave-management/leave-policies
POST   /api/hr/leave-management/leave-policies/:id/clone
POST   /api/hr/leave-policies
POST   /api/hr/leave-policies/:id/duplicate
POST   /api/hr/leave-policies/:id/set-default
POST   /api/hr/leave-policies/bulk
POST   /api/hr/leave-policies/compare
POST   /api/hr/leave-policy-assignments
POST   /api/hr/leave-policy-assignments/:id/cancel
POST   /api/hr/leave-policy-assignments/bulk
POST   /api/hr/leave-policy-assignments/preview
POST   /api/hr/leave-types
POST   /api/hr/leave-types/bulk
POST   /api/hr/leave-types/initialize
POST   /api/hr/offboarding
POST   /api/hr/offboarding/:offboardingId/approve-settlement
POST   /api/hr/offboarding/:offboardingId/calculate-settlement
POST   /api/hr/offboarding/:offboardingId/clearance/:section/complete
POST   /api/hr/offboarding/:offboardingId/clearance/items
POST   /api/hr/offboarding/:offboardingId/complete
POST   /api/hr/offboarding/:offboardingId/exit-interview
POST   /api/hr/offboarding/:offboardingId/issue-experience-certificate
POST   /api/hr/offboarding/:offboardingId/process-payment
POST   /api/hr/offboarding/bulk-delete
POST   /api/hr/okrs
POST   /api/hr/okrs/:id/activate
POST   /api/hr/okrs/:id/check-in
POST   /api/hr/okrs/nine-box
POST   /api/hr/onboarding
POST   /api/hr/onboarding/:onboardingId/checklist/categories
POST   /api/hr/onboarding/:onboardingId/checklist/categories/:categoryId/tasks
POST   /api/hr/onboarding/:onboardingId/complete
POST   /api/hr/onboarding/:onboardingId/complete-first-day
POST   /api/hr/onboarding/:onboardingId/complete-first-month
POST   /api/hr/onboarding/:onboardingId/complete-first-week
POST   /api/hr/onboarding/:onboardingId/complete-probation
POST   /api/hr/onboarding/:onboardingId/documents
POST   /api/hr/onboarding/:onboardingId/documents/:type/verify
POST   /api/hr/onboarding/:onboardingId/feedback
POST   /api/hr/onboarding/:onboardingId/probation-reviews
POST   /api/hr/onboarding/:onboardingId/tasks/:taskId/complete
POST   /api/hr/onboarding/bulk-delete
POST   /api/hr/organizational-structure
POST   /api/hr/organizational-structure/:id/activate
POST   /api/hr/organizational-structure/:id/deactivate
POST   /api/hr/organizational-structure/:id/dissolve
POST   /api/hr/organizational-structure/:id/documents
POST   /api/hr/organizational-structure/:id/kpis
POST   /api/hr/organizational-structure/:id/leadership
POST   /api/hr/organizational-structure/:id/move
POST   /api/hr/organizational-structure/bulk-delete
POST   /api/hr/payroll
POST   /api/hr/payroll-runs/:runId/approve
POST   /api/hr/payroll-runs/:runId/employees/:employeeId/adjust
POST   /api/hr/payroll-runs/:runId/employees/:employeeId/exclude
POST   /api/hr/payroll-runs/:runId/employees/:employeeId/include
POST   /api/hr/payroll-runs/:runId/employees/:employeeId/recalculate
POST   /api/hr/payroll-runs/:runId/finalize
POST   /api/hr/payroll-runs/:runId/process
POST   /api/hr/payroll-runs/:runId/reject
POST   /api/hr/payroll/:id/approve
POST   /api/hr/payroll/:id/pay
POST   /api/hr/payroll/approve
POST   /api/hr/payroll/bulk-delete
POST   /api/hr/payroll/generate
POST   /api/hr/payroll/pay
POST   /api/hr/payroll/wps/submit
POST   /api/hr/performance-reviews
POST   /api/hr/performance-reviews/:id/360-feedback/:providerId
POST   /api/hr/performance-reviews/:id/360-feedback/request
POST   /api/hr/performance-reviews/:id/acknowledge
POST   /api/hr/performance-reviews/:id/calibration
POST   /api/hr/performance-reviews/:id/calibration/apply
POST   /api/hr/performance-reviews/:id/complete
POST   /api/hr/performance-reviews/:id/development-plan
POST   /api/hr/performance-reviews/:id/manager-assessment
POST   /api/hr/performance-reviews/:id/reminder
POST   /api/hr/performance-reviews/:id/self-assessment
POST   /api/hr/performance-reviews/bulk-create
POST   /api/hr/performance-reviews/bulk-delete
POST   /api/hr/performance-reviews/calibration-sessions
POST   /api/hr/performance-reviews/calibration-sessions/:id/complete
POST   /api/hr/performance-reviews/templates
POST   /api/hr/recruitment/applicants
POST   /api/hr/recruitment/applicants/:applicantId/assessments/:assessmentId/complete
POST   /api/hr/recruitment/applicants/:applicantId/flag
POST   /api/hr/recruitment/applicants/:applicantId/interviews/:interviewId/complete
POST   /api/hr/recruitment/applicants/:applicantId/offer
POST   /api/hr/recruitment/applicants/:applicantId/offer/accept
POST   /api/hr/recruitment/applicants/:applicantId/offer/reject
POST   /api/hr/recruitment/applicants/:applicantId/screen
POST   /api/hr/recruitment/applicants/:applicantId/status
POST   /api/hr/recruitment/applicants/:applicantId/unflag
POST   /api/hr/recruitment/applicants/:id/assessments
POST   /api/hr/recruitment/applicants/:id/background-check
POST   /api/hr/recruitment/applicants/:id/communications
POST   /api/hr/recruitment/applicants/:id/hire
POST   /api/hr/recruitment/applicants/:id/interviews
POST   /api/hr/recruitment/applicants/:id/interviews/:interviewId/feedback
POST   /api/hr/recruitment/applicants/:id/notes
POST   /api/hr/recruitment/applicants/:id/offers
POST   /api/hr/recruitment/applicants/:id/references
POST   /api/hr/recruitment/applicants/:id/reject
POST   /api/hr/recruitment/applicants/:id/stage
POST   /api/hr/recruitment/applicants/bulk-delete
POST   /api/hr/recruitment/applicants/bulk-reject
POST   /api/hr/recruitment/applicants/bulk-stage-update
POST   /api/hr/recruitment/applicants/bulk-update
POST   /api/hr/recruitment/jobs
POST   /api/hr/recruitment/jobs/:id/clone
POST   /api/hr/recruitment/jobs/:id/publish
POST   /api/hr/recruitment/jobs/:id/status
POST   /api/hr/recruitment/jobs/:jobId/close
POST   /api/hr/recruitment/jobs/:jobId/duplicate
POST   /api/hr/recruitment/jobs/:jobId/hold
POST   /api/hr/recruitment/parse-resume
POST   /api/hr/retention-bonuses
POST   /api/hr/retention-bonuses/:id/approve
POST   /api/hr/retention-bonuses/:id/cancel
POST   /api/hr/retention-bonuses/:id/clawback
POST   /api/hr/retention-bonuses/:id/mark-paid
POST   /api/hr/retention-bonuses/:id/reject
POST   /api/hr/retention-bonuses/:id/submit
POST   /api/hr/retention-bonuses/bulk-delete
POST   /api/hr/salary-components
POST   /api/hr/salary-components/:id/duplicate
POST   /api/hr/salary-components/bulk
POST   /api/hr/salary-components/bulk-delete
POST   /api/hr/salary-components/calculate
POST   /api/hr/salary-components/initialize-defaults
POST   /api/hr/salary-components/seed-defaults
POST   /api/hr/salary-components/validate
POST   /api/hr/self-service/leave/request
POST   /api/hr/self-service/leave/request/:requestId/cancel
POST   /api/hr/shift-types
POST   /api/hr/shift-types/:shiftTypeId/activate
POST   /api/hr/shift-types/:shiftTypeId/deactivate
POST   /api/hr/shift-types/:shiftTypeId/duplicate
POST   /api/hr/shift-types/:shiftTypeId/set-default
POST   /api/hr/shift-types/bulk
POST   /api/hr/shift-types/bulk-activate
POST   /api/hr/shift-types/bulk-deactivate
POST   /api/hr/shift-types/bulk-delete
POST   /api/hr/shift-types/import
POST   /api/hr/shifts/shift-assignments
POST   /api/hr/shifts/shift-assignments/bulk
POST   /api/hr/shifts/shift-types
POST   /api/hr/shifts/shift-types/:id/clone
POST   /api/hr/shifts/shift-types/:id/set-default
POST   /api/hr/skill-maps/:employeeId/skill-gaps
POST   /api/hr/skill-maps/:employeeId/skills
POST   /api/hr/skill-maps/:employeeId/skills/:skillId/cpd
POST   /api/hr/skill-maps/:employeeId/skills/:skillId/endorse
POST   /api/hr/skill-maps/:employeeId/skills/:skillId/evaluate
POST   /api/hr/skill-maps/:employeeId/skills/:skillId/verify
POST   /api/hr/skill-maps/:employeeId/trainings
POST   /api/hr/skill-maps/bulk-update
POST   /api/hr/skill-maps/compare
POST   /api/hr/skill-maps/department/:departmentId/skill-gaps
POST   /api/hr/skills
POST   /api/hr/skills/assessments
POST   /api/hr/skills/assessments/:id/self-assessment
POST   /api/hr/skills/assign
POST   /api/hr/skills/competencies
POST   /api/hr/skills/endorse
POST   /api/hr/skills/types
POST   /api/hr/skills/verify
POST   /api/hr/staffing-plans
POST   /api/hr/staffing-plans/:planId/activate
POST   /api/hr/staffing-plans/:planId/approve
POST   /api/hr/staffing-plans/:planId/approve
POST   /api/hr/staffing-plans/:planId/archive
POST   /api/hr/staffing-plans/:planId/calculate-vacancies
POST   /api/hr/staffing-plans/:planId/details
POST   /api/hr/staffing-plans/:planId/details/:detailId/create-job-opening
POST   /api/hr/staffing-plans/:planId/details/:detailId/link-job-opening
POST   /api/hr/staffing-plans/:planId/duplicate
POST   /api/hr/staffing-plans/:planId/fill/:posId
POST   /api/hr/staffing-plans/:planId/generate-requisitions
POST   /api/hr/staffing-plans/:planId/positions
POST   /api/hr/staffing-plans/:planId/reject
POST   /api/hr/staffing-plans/:planId/rollover
POST   /api/hr/staffing-plans/:planId/submit
POST   /api/hr/staffing-plans/:planId/sync-headcount
POST   /api/hr/staffing-plans/bulk-archive
POST   /api/hr/staffing-plans/bulk-delete
POST   /api/hr/staffing-plans/bulk-update
POST   /api/hr/staffing-plans/scenarios
POST   /api/hr/staffing-plans/scenarios/:scenarioId/apply
POST   /api/hr/surveys
POST   /api/hr/surveys/:id/close
POST   /api/hr/surveys/:id/launch
POST   /api/hr/surveys/:id/respond
POST   /api/hr/surveys/templates
POST   /api/hr/trainings
POST   /api/hr/trainings/:trainingId/approve
POST   /api/hr/trainings/:trainingId/assessments
POST   /api/hr/trainings/:trainingId/attendance
POST   /api/hr/trainings/:trainingId/cancel
POST   /api/hr/trainings/:trainingId/complete
POST   /api/hr/trainings/:trainingId/enroll
POST   /api/hr/trainings/:trainingId/evaluation
POST   /api/hr/trainings/:trainingId/issue-certificate
POST   /api/hr/trainings/:trainingId/payment
POST   /api/hr/trainings/:trainingId/progress
POST   /api/hr/trainings/:trainingId/reject
POST   /api/hr/trainings/:trainingId/start
POST   /api/hr/trainings/:trainingId/submit
POST   /api/hr/trainings/bulk-delete
POST   /api/hr/transfers
POST   /api/hr/transfers/:id/apply
POST   /api/hr/transfers/:id/approvals
POST   /api/hr/transfers/:id/approve
POST   /api/hr/transfers/:id/handover
POST   /api/hr/transfers/:id/notify
POST   /api/hr/transfers/:id/reject
POST   /api/hr/transfers/bulk-delete
POST   /api/hr/vehicles
POST   /api/hr/vehicles/:vehicleId/assign
POST   /api/hr/vehicles/:vehicleId/expenses
POST   /api/hr/vehicles/:vehicleId/maintenance
POST   /api/hr/vehicles/:vehicleId/unassign
POST   /api/incomeTaxSlab
POST   /api/incomeTaxSlab/:id/calculate
POST   /api/incomeTaxSlab/calculate-by-country
POST   /api/incomeTaxSlab/initialize-defaults
POST   /api/integrations/discord/complete-setup
POST   /api/integrations/discord/disconnect
POST   /api/integrations/discord/message
POST   /api/integrations/discord/test
POST   /api/integrations/discord/webhook
POST   /api/integrations/quickbooks/conflicts/:conflictId/resolve
POST   /api/integrations/quickbooks/conflicts/bulk-resolve
POST   /api/integrations/quickbooks/disconnect
POST   /api/integrations/quickbooks/refresh-token
POST   /api/integrations/quickbooks/sync/accounts
POST   /api/integrations/quickbooks/sync/all
POST   /api/integrations/quickbooks/sync/customers
POST   /api/integrations/quickbooks/sync/expenses
POST   /api/integrations/quickbooks/sync/invoices
POST   /api/integrations/quickbooks/sync/payments
POST   /api/integrations/quickbooks/sync/vendors
POST   /api/integrations/xero/disconnect
POST   /api/integrations/xero/refresh-token
POST   /api/integrations/xero/sync/accounts
POST   /api/integrations/xero/sync/all
POST   /api/integrations/xero/sync/contacts
POST   /api/integrations/xero/sync/expenses
POST   /api/integrations/xero/sync/invoices
POST   /api/integrations/xero/sync/payments
POST   /api/integrations/xero/webhook
POST   /api/inter-company/reconciliation
POST   /api/inter-company/reconciliations
POST   /api/inter-company/reconciliations/:reconciliationId/adjustments
POST   /api/inter-company/reconciliations/:reconciliationId/approve
POST   /api/inter-company/reconciliations/:reconciliationId/auto-match
POST   /api/inter-company/reconciliations/:reconciliationId/complete
POST   /api/inter-company/reconciliations/:reconciliationId/manual-match
POST   /api/inter-company/reconciliations/:reconciliationId/unmatch
POST   /api/inter-company/reports/export
POST   /api/inter-company/transactions
POST   /api/inter-company/transactions/:id/cancel
POST   /api/inter-company/transactions/:id/confirm
POST   /api/inter-company/transactions/:id/post
POST   /api/interestAreas
POST   /api/inventory/batches
POST   /api/inventory/item-groups
POST   /api/inventory/items
POST   /api/inventory/reconciliations
POST   /api/inventory/reconciliations/:id/submit
POST   /api/inventory/serial-numbers
POST   /api/inventory/stock-entries
POST   /api/inventory/stock-entries/:id/cancel
POST   /api/inventory/stock-entries/:id/submit
POST   /api/inventory/uom
POST   /api/inventory/warehouses
POST   /api/investment-search/quotes
POST   /api/investments
POST   /api/investments/:id/refresh-price
POST   /api/investments/:id/transactions
POST   /api/investments/refresh-all
POST   /api/invitations/:code/accept
POST   /api/invoice-approvals/:id/approve
POST   /api/invoice-approvals/:id/cancel
POST   /api/invoice-approvals/:id/escalate
POST   /api/invoice-approvals/:id/reject
POST   /api/invoice-templates
POST   /api/invoice-templates/:id/duplicate
POST   /api/invoice-templates/:id/set-default
POST   /api/invoice-templates/import
POST   /api/invoices
POST   /api/invoices/:_id/payment
POST   /api/invoices/:_id/payments
POST   /api/invoices/:_id/send
POST   /api/invoices/:id/apply-retainer
POST   /api/invoices/:id/approve
POST   /api/invoices/:id/convert-to-credit-note
POST   /api/invoices/:id/duplicate
POST   /api/invoices/:id/payment
POST   /api/invoices/:id/payments
POST   /api/invoices/:id/record-payment
POST   /api/invoices/:id/reject
POST   /api/invoices/:id/send
POST   /api/invoices/:id/send-reminder
POST   /api/invoices/:id/submit-for-approval
POST   /api/invoices/:id/void
POST   /api/invoices/:id/zatca/submit
POST   /api/invoices/bulk-delete
POST   /api/invoices/confirm-payment
POST   /api/jobs
POST   /api/journal-entries
POST   /api/journal-entries/:id/post
POST   /api/journal-entries/:id/void
POST   /api/journal-entries/simple
POST   /api/keyboardShortcuts
POST   /api/keyboardShortcuts/:id/reset
POST   /api/keyboardShortcuts/check-conflict
POST   /api/keyboardShortcuts/reset-all
POST   /api/kyc/initiate
POST   /api/kyc/review
POST   /api/kyc/submit
POST   /api/kyc/verify
POST   /api/kyc/webhook
POST   /api/lead-scoring/calculate-all
POST   /api/lead-scoring/calculate-batch
POST   /api/lead-scoring/calculate/:leadId
POST   /api/lead-scoring/process-decay
POST   /api/lead-scoring/track/call
POST   /api/lead-scoring/track/document-view
POST   /api/lead-scoring/track/email-click
POST   /api/lead-scoring/track/email-open
POST   /api/lead-scoring/track/form-submit
POST   /api/lead-scoring/track/meeting
POST   /api/lead-scoring/track/website-visit
POST   /api/leadConversion/:id/convert
POST   /api/leads
POST   /api/leads/:id/activities
POST   /api/leads/:id/conflict-check
POST   /api/leads/:id/convert
POST   /api/leads/:id/follow-up
POST   /api/leads/:id/move
POST   /api/leads/:id/status
POST   /api/leads/:id/verify/absher
POST   /api/leads/:id/verify/address
POST   /api/leads/:id/verify/wathq
POST   /api/leads/bulk-delete
POST   /api/leadSource
POST   /api/leadSource/defaults
POST   /api/leave-allocations
POST   /api/leave-allocations/:id/adjust
POST   /api/leave-allocations/:id/encash
POST   /api/leave-allocations/bulk
POST   /api/leave-allocations/carry-forward
POST   /api/leave-allocations/carry-forward/expire
POST   /api/leave-allocations/carry-forward/process-all
POST   /api/leave-encashments
POST   /api/leave-encashments/:id/approve
POST   /api/leave-encashments/:id/cancel
POST   /api/leave-encashments/:id/mark-paid
POST   /api/leave-encashments/:id/process
POST   /api/leave-encashments/:id/reject
POST   /api/leave-encashments/:id/submit
POST   /api/leave-encashments/bulk-approve
POST   /api/leave-encashments/bulk-reject
POST   /api/leave-encashments/calculate
POST   /api/leave-requests
POST   /api/leave-requests/:id/approve
POST   /api/leave-requests/:id/cancel
POST   /api/leave-requests/:id/complete-handover
POST   /api/leave-requests/:id/confirm-return
POST   /api/leave-requests/:id/documents
POST   /api/leave-requests/:id/reject
POST   /api/leave-requests/:id/request-extension
POST   /api/leave-requests/:id/submit
POST   /api/leave-requests/bulk-delete
POST   /api/leave-requests/check-conflicts
POST   /api/legal-documents/:id/download
POST   /api/legal-documents/:id/execute
POST   /api/legal-documents/:id/request-signature
POST   /api/legal-documents/:id/restore/:versionId
POST   /api/legal-documents/:id/send-reminder
POST   /api/legal-documents/:id/sign
POST   /api/legal-documents/:id/versions
POST   /api/legalDocument
POST   /api/legalDocument/:_id/download
POST   /api/lifecycles/initiate
POST   /api/lifecycles/instance/:id/advance
POST   /api/lifecycles/instance/:id/cancel
POST   /api/lifecycles/workflows
POST   /api/lockDates/check
POST   /api/lockDates/periods/lock
POST   /api/lockDates/periods/reopen
POST   /api/lostReason
POST   /api/lostReason/defaults
POST   /api/lostReasons
POST   /api/macros
POST   /api/macros/:id/apply/:conversationId
POST   /api/manufacturing/boms
POST   /api/manufacturing/job-cards
POST   /api/manufacturing/job-cards/:id/complete
POST   /api/manufacturing/job-cards/:id/start
POST   /api/manufacturing/work-orders
POST   /api/manufacturing/work-orders/:id/cancel
POST   /api/manufacturing/work-orders/:id/complete
POST   /api/manufacturing/work-orders/:id/start
POST   /api/manufacturing/work-orders/:id/submit
POST   /api/manufacturing/workstations
POST   /api/matter-budgets
POST   /api/matter-budgets/:id/entries
POST   /api/matter-budgets/:id/phases
POST   /api/matter-budgets/templates
POST   /api/messages
POST   /api/metrics/reset
POST   /api/microsoftCalendar/disconnect
POST   /api/microsoftCalendar/events
POST   /api/microsoftCalendar/export
POST   /api/microsoftCalendar/import
POST   /api/microsoftCalendar/refresh-token
POST   /api/microsoftCalendar/sync/disable-auto-sync
POST   /api/microsoftCalendar/sync/enable-auto-sync
POST   /api/microsoftCalendar/sync/from-microsoft
POST   /api/microsoftCalendar/sync/to-microsoft/:eventId
POST   /api/ml/model/export
POST   /api/ml/priority/:leadId/contact
POST   /api/ml/scores/:leadId/calculate
POST   /api/ml/scores/batch
POST   /api/ml/train
POST   /api/notification-preferences/mute/:category
POST   /api/notification-preferences/reset
POST   /api/notification-preferences/test
POST   /api/notification-preferences/unmute/:category
POST   /api/notification-settings/mute/:type
POST   /api/notification-settings/reset
POST   /api/notification-settings/unmute/:type
POST   /api/notifications
POST   /api/offlineSyncs/conflicts/resolve
POST   /api/offlineSyncs/sync
POST   /api/orders/create-payment-intent/:_id
POST   /api/orders/create-proposal-payment-intent/:_id
POST   /api/orders/create-test-contract/:_id
POST   /api/orders/create-test-proposal-contract/:_id
POST   /api/organizations
POST   /api/organizations/:id/link-case
POST   /api/organizations/:id/link-client
POST   /api/organizations/:id/link-contact
POST   /api/organizations/bulk-delete
POST   /api/payment-receipts
POST   /api/payment-receipts/:id/email
POST   /api/payment-receipts/:id/void
POST   /api/payment-terms
POST   /api/payment-terms/:id/calculate-due-date
POST   /api/payment-terms/:id/calculate-installments
POST   /api/payment-terms/:id/set-default
POST   /api/payment-terms/initialize
POST   /api/payments
POST   /api/payments/:id/complete
POST   /api/payments/:id/fail
POST   /api/payments/:id/receipt
POST   /api/payments/:id/reconcile
POST   /api/payments/:id/refund
POST   /api/payments/:id/send-receipt
POST   /api/payout/payouts/:id/cancel
POST   /api/payout/payouts/:id/retry
POST   /api/payout/payouts/request
POST   /api/payout/stripe/connect
POST   /api/payroll-runs
POST   /api/payroll-runs/:id/approve
POST   /api/payroll-runs/:id/calculate
POST   /api/payroll-runs/:id/cancel
POST   /api/payroll-runs/:id/employees/:empId/exclude
POST   /api/payroll-runs/:id/employees/:empId/hold
POST   /api/payroll-runs/:id/employees/:empId/include
POST   /api/payroll-runs/:id/employees/:empId/recalculate
POST   /api/payroll-runs/:id/employees/:empId/unhold
POST   /api/payroll-runs/:id/generate-wps
POST   /api/payroll-runs/:id/process-payments
POST   /api/payroll-runs/:id/send-notifications
POST   /api/payroll-runs/:id/validate
POST   /api/payroll-runs/bulk-delete
POST   /api/pdfme/generate
POST   /api/pdfme/generate/async
POST   /api/pdfme/generate/contract
POST   /api/pdfme/generate/invoice
POST   /api/pdfme/generate/receipt
POST   /api/pdfme/templates
POST   /api/pdfme/templates/:id/clone
POST   /api/pdfme/templates/:id/preview
POST   /api/pdfme/templates/:id/set-default
POST   /api/peerReview
POST   /api/permissions/cache/clear
POST   /api/permissions/check
POST   /api/permissions/check-batch
POST   /api/permissions/policies
POST   /api/permissions/relations
POST   /api/permissions/ui/check-page
POST   /api/permissions/ui/overrides
POST   /api/plans/cancel
POST   /api/plans/start-trial
POST   /api/plans/upgrade
POST   /api/playbook
POST   /api/playbook/execute
POST   /api/playbook/executions/:id/abort
POST   /api/playbook/executions/:id/advance
POST   /api/playbook/executions/:id/retry/:stepIndex
POST   /api/playbook/executions/:id/skip
POST   /api/playbook/match
POST   /api/plugins/:id/install
POST   /api/plugins/:id/reload
POST   /api/plugins/hooks/execute
POST   /api/plugins/installations/:installationId/disable
POST   /api/plugins/installations/:installationId/enable
POST   /api/plugins/register
POST   /api/preparedReport/:id/refresh
POST   /api/preparedReport/cleanup
POST   /api/preparedReport/request
POST   /api/price-levels
POST   /api/price-levels/:id/set-default
POST   /api/products
POST   /api/products/enhanced
POST   /api/products/enhanced/:productId/barcodes
POST   /api/products/enhanced/:productId/variants
POST   /api/products/enhanced/:productId/variants/generate
POST   /api/products/enhanced/bulk-update-prices
POST   /api/proposals
POST   /api/quality/actions
POST   /api/quality/inspections
POST   /api/quality/inspections/:id/submit
POST   /api/quality/templates
POST   /api/questions
POST   /api/queues/:name/clean
POST   /api/queues/:name/empty
POST   /api/queues/:name/jobs
POST   /api/queues/:name/jobs/bulk
POST   /api/queues/:name/pause
POST   /api/queues/:name/resume
POST   /api/queues/:name/retry/:jobId
POST   /api/quotes
POST   /api/quotes/:id/accept
POST   /api/quotes/:id/duplicate
POST   /api/quotes/:id/items
POST   /api/quotes/:id/reject
POST   /api/quotes/:id/revise
POST   /api/quotes/:id/send
POST   /api/quotes/:id/view
POST   /api/rate-cards
POST   /api/rate-cards/:id/rates
POST   /api/rate-cards/calculate
POST   /api/rate-limits/firms/:firmId/reset
POST   /api/rate-limits/users/:userId/adjust
POST   /api/rate-limits/users/:userId/reset
POST   /api/recurring-invoices
POST   /api/recurring-invoices/:id/cancel
POST   /api/recurring-invoices/:id/duplicate
POST   /api/recurring-invoices/:id/generate
POST   /api/recurring-invoices/:id/pause
POST   /api/recurring-invoices/:id/resume
POST   /api/recurring-transactions
POST   /api/recurring-transactions/:id/cancel
POST   /api/recurring-transactions/:id/generate
POST   /api/recurring-transactions/:id/pause
POST   /api/recurring-transactions/:id/resume
POST   /api/recurring-transactions/process-due
POST   /api/referrals
POST   /api/referrals/:id/leads
POST   /api/referrals/:id/leads/:leadId/convert
POST   /api/referrals/:id/payments
POST   /api/refund/admin/:id/approve
POST   /api/refund/admin/:id/execute
POST   /api/refund/admin/:id/reject
POST   /api/refund/admin/:id/retry
POST   /api/refund/request
POST   /api/regional-banks/connect
POST   /api/regional-banks/disconnect/:accountId
POST   /api/regional-banks/sync/:accountId
POST   /api/reminders
POST   /api/reminders/:id/archive
POST   /api/reminders/:id/cancel-snooze
POST   /api/reminders/:id/clone
POST   /api/reminders/:id/complete
POST   /api/reminders/:id/delegate
POST   /api/reminders/:id/dismiss
POST   /api/reminders/:id/duplicate
POST   /api/reminders/:id/recurring/resume
POST   /api/reminders/:id/recurring/skip
POST   /api/reminders/:id/recurring/stop
POST   /api/reminders/:id/reopen
POST   /api/reminders/:id/reschedule
POST   /api/reminders/:id/snooze
POST   /api/reminders/:id/unarchive
POST   /api/reminders/bulk
POST   /api/reminders/bulk-complete
POST   /api/reminders/bulk-snooze
POST   /api/reminders/bulk/archive
POST   /api/reminders/bulk/complete
POST   /api/reminders/bulk/unarchive
POST   /api/reminders/from-event/:eventId
POST   /api/reminders/from-task/:taskId
POST   /api/reminders/location
POST   /api/reminders/location/:reminderId/reset
POST   /api/reminders/location/check
POST   /api/reminders/location/distance
POST   /api/reminders/location/nearby
POST   /api/reminders/location/save
POST   /api/reminders/parse
POST   /api/reminders/voice
POST   /api/reports
POST   /api/reports/:id/clone
POST   /api/reports/:id/execute
POST   /api/reports/consolidated/eliminations
POST   /api/reports/export
POST   /api/reports/generate
POST   /api/reports/validate
POST   /api/retainers
POST   /api/retainers/:id/consume
POST   /api/retainers/:id/refund
POST   /api/retainers/:id/replenish
POST   /api/reviews
POST   /api/sales-quotas
POST   /api/sales-quotas/:id/record-deal
POST   /api/salesForecasts
POST   /api/salesForecasts/:id/adjustments
POST   /api/salesForecasts/:id/approve
POST   /api/salesForecasts/:id/lock
POST   /api/salesForecasts/:id/submit
POST   /api/salesPerson
POST   /api/saless/commissions/calculate
POST   /api/saless/commissions/calculate-period
POST   /api/saless/commissions/plans
POST   /api/saless/commissions/plans/:id/assign
POST   /api/saless/commissions/settlements
POST   /api/saless/commissions/settlements/:id/approve
POST   /api/saless/commissions/settlements/:id/clawback
POST   /api/saless/commissions/settlements/:id/record-payment
POST   /api/saless/commissions/settlements/:id/reject
POST   /api/saless/commissions/settlements/:id/schedule-payment
POST   /api/saless/commissions/settlements/:id/submit
POST   /api/saless/deliveries
POST   /api/saless/deliveries/:id/cancel
POST   /api/saless/deliveries/:id/complete-packing
POST   /api/saless/deliveries/:id/complete-picking
POST   /api/saless/deliveries/:id/deliver
POST   /api/saless/deliveries/:id/failed-attempt
POST   /api/saless/deliveries/:id/return-pickup
POST   /api/saless/deliveries/:id/ship
POST   /api/saless/deliveries/:id/start-picking
POST   /api/saless/deliveries/:id/tracking
POST   /api/saless/orders
POST   /api/saless/orders/:id/apply-pricing
POST   /api/saless/orders/:id/cancel
POST   /api/saless/orders/:id/complete
POST   /api/saless/orders/:id/confirm
POST   /api/saless/orders/:id/delivery
POST   /api/saless/orders/:id/discount
POST   /api/saless/orders/:id/invoice
POST   /api/saless/orders/:id/items
POST   /api/saless/orders/:id/payment
POST   /api/saless/orders/from-lead
POST   /api/saless/orders/from-quote
POST   /api/saless/returns/:id/approve
POST   /api/saless/returns/:id/complete
POST   /api/saless/returns/:id/inspect
POST   /api/saless/returns/:id/process
POST   /api/saless/returns/:id/receive
POST   /api/saless/returns/:id/reject
POST   /api/saless/returns/:id/return-label
POST   /api/saless/returns/:id/schedule-pickup
POST   /api/saless/returns/:id/submit
POST   /api/saless/returns/from-delivery
POST   /api/saless/returns/from-order
POST   /api/salesStage
POST   /api/salesStage/defaults
POST   /api/salesTeams
POST   /api/salesTeams/:id/default
POST   /api/salesTeams/:id/members
POST   /api/sandboxs
POST   /api/sandboxs/:id/clone
POST   /api/sandboxs/:id/extend
POST   /api/sandboxs/:id/reset
POST   /api/saudi-banking/lean/customers
POST   /api/saudi-banking/lean/payments
POST   /api/saudi-banking/lean/webhook
POST   /api/saudi-banking/mudad/compliance/minimum-wage
POST   /api/saudi-banking/mudad/compliance/nitaqat
POST   /api/saudi-banking/mudad/gosi/calculate
POST   /api/saudi-banking/mudad/gosi/report
POST   /api/saudi-banking/mudad/payroll/calculate
POST   /api/saudi-banking/mudad/payroll/submit
POST   /api/saudi-banking/mudad/wps/generate
POST   /api/saudi-banking/sadad/bills/inquiry
POST   /api/saudi-banking/sadad/bills/pay
POST   /api/saudi-banking/wps/download
POST   /api/saudi-banking/wps/generate
POST   /api/saudi-banking/wps/validate
POST   /api/saved-reports/reports
POST   /api/saved-reports/reports/:id/duplicate
POST   /api/saved-reports/reports/:id/run
POST   /api/saved-reports/widgets
POST   /api/savedFilters
POST   /api/savedFilters/:id/duplicate
POST   /api/savedFilters/:id/set-default
POST   /api/savedFilters/:id/share
POST   /api/score/recalculate/:lawyerId
POST   /api/security/csp-report
POST   /api/security/detect/account-takeover
POST   /api/security/detect/anomalous-activity
POST   /api/security/detect/brute-force
POST   /api/security/incidents/:id/acknowledge
POST   /api/security/incidents/:id/notes
POST   /api/security/incidents/report
POST   /api/security/vulnerability/report
POST   /api/settings/ai/keys
POST   /api/settings/ai/validate
POST   /api/settings/email/signatures
POST   /api/settings/email/smtp/test
POST   /api/settings/email/templates
POST   /api/settings/email/templates/:id/preview
POST   /api/settings/payment-modes
POST   /api/settings/payment-terms
POST   /api/settings/payment-terms/:id/set-default
POST   /api/settings/sso/providers/:providerId/test
POST   /api/settings/taxes
POST   /api/setup/admin/sections
POST   /api/setup/admin/tasks
POST   /api/setup/reset
POST   /api/setup/tasks/:taskId/complete
POST   /api/setup/tasks/:taskId/skip
POST   /api/shift-assignments
POST   /api/shift-assignments/:assignmentId/activate
POST   /api/shift-assignments/:assignmentId/deactivate
POST   /api/shift-assignments/bulk
POST   /api/shift-assignments/import
POST   /api/shift-requests
POST   /api/shift-requests/:requestId/approve
POST   /api/shift-requests/:requestId/reject
POST   /api/shift-requests/check-conflicts
POST   /api/slack/channels
POST   /api/slack/disconnect
POST   /api/slack/message
POST   /api/slack/test
POST   /api/slack/webhook
POST   /api/slas
POST   /api/slas/:id/apply/:ticketId
POST   /api/slas/instance/:id/pause
POST   /api/slas/instance/:id/resume
POST   /api/sloMonitorings
POST   /api/sloMonitorings/:id/measure
POST   /api/sloMonitorings/check-alerts
POST   /api/sloMonitorings/initialize-defaults
POST   /api/smart-buttons/:model/batch-counts
POST   /api/smart-scheduling/auto-schedule
POST   /api/smart-scheduling/predict-duration
POST   /api/smart-scheduling/suggest
POST   /api/staff
POST   /api/staff/bulk-delete
POST   /api/statements
POST   /api/statements/:id/send
POST   /api/statements/generate
POST   /api/status/admin/components
POST   /api/status/admin/incidents
POST   /api/status/admin/incidents/:id/resolve
POST   /api/status/admin/maintenance
POST   /api/status/admin/maintenance/:id/cancel
POST   /api/status/admin/maintenance/:id/complete
POST   /api/status/admin/maintenance/:id/start
POST   /api/status/subscribe
POST   /api/subcontracting/orders
POST   /api/subcontracting/orders/:id/cancel
POST   /api/subcontracting/orders/:id/submit
POST   /api/subcontracting/receipts
POST   /api/subcontracting/receipts/:id/submit
POST   /api/subscriptions
POST   /api/subscriptions/:id/activate
POST   /api/subscriptions/:id/cancel
POST   /api/subscriptions/:id/change-plan
POST   /api/subscriptions/:id/consume-hours
POST   /api/subscriptions/:id/generate-invoice
POST   /api/subscriptions/:id/pause
POST   /api/subscriptions/:id/renew
POST   /api/subscriptions/:id/reset-hours
POST   /api/subscriptions/:id/resume
POST   /api/succession-plans
POST   /api/succession-plans/:id/actions
POST   /api/succession-plans/:id/activate
POST   /api/succession-plans/:id/approve
POST   /api/succession-plans/:id/archive
POST   /api/succession-plans/:id/documents
POST   /api/succession-plans/:id/reject
POST   /api/succession-plans/:id/reviews
POST   /api/succession-plans/:id/submit-for-approval
POST   /api/succession-plans/:id/successors
POST   /api/succession-plans/bulk-delete
POST   /api/support/slas
POST   /api/support/tickets
POST   /api/support/tickets/:id/close
POST   /api/support/tickets/:id/reply
POST   /api/support/tickets/:id/resolve
POST   /api/tags
POST   /api/tags/bulk
POST   /api/tags/merge
POST   /api/tasks
POST   /api/tasks/:id/archive
POST   /api/tasks/:id/attachments
POST   /api/tasks/:id/clone
POST   /api/tasks/:id/comments
POST   /api/tasks/:id/complete
POST   /api/tasks/:id/convert-to-event
POST   /api/tasks/:id/dependencies
POST   /api/tasks/:id/documents
POST   /api/tasks/:id/documents/:documentId/versions/:versionId/restore
POST   /api/tasks/:id/location/check
POST   /api/tasks/:id/reopen
POST   /api/tasks/:id/reschedule
POST   /api/tasks/:id/save-as-template
POST   /api/tasks/:id/subtasks
POST   /api/tasks/:id/time
POST   /api/tasks/:id/timer/start
POST   /api/tasks/:id/timer/stop
POST   /api/tasks/:id/unarchive
POST   /api/tasks/:id/voice-memos
POST   /api/tasks/:id/workflow-rules
POST   /api/tasks/:taskId/convert-to-case
POST   /api/tasks/:taskId/dependencies
POST   /api/tasks/:taskId/evaluate-rules
POST   /api/tasks/:taskId/recurring
POST   /api/tasks/:taskId/time-tracking/manual
POST   /api/tasks/:taskId/time-tracking/start
POST   /api/tasks/:taskId/time-tracking/stop
POST   /api/tasks/:taskId/watchers
POST   /api/tasks/:taskId/workflow-rules
POST   /api/tasks/:taskId/workflow-rules/:ruleId/toggle
POST   /api/tasks/auto-schedule
POST   /api/tasks/bulk
POST   /api/tasks/bulk/archive
POST   /api/tasks/bulk/assign
POST   /api/tasks/bulk/complete
POST   /api/tasks/bulk/reopen
POST   /api/tasks/bulk/unarchive
POST   /api/tasks/location/check
POST   /api/tasks/parse
POST   /api/tasks/templates
POST   /api/tasks/templates/:templateId/create
POST   /api/tasks/voice
POST   /api/tasks/voice-to-item
POST   /api/tasks/voice-to-item/batch
POST   /api/team/:id/activate
POST   /api/team/:id/depart
POST   /api/team/:id/resend-invite
POST   /api/team/:id/suspend
POST   /api/team/invite
POST   /api/telegram/connect
POST   /api/telegram/disconnect
POST   /api/telegram/document
POST   /api/telegram/message
POST   /api/telegram/photo
POST   /api/telegram/test
POST   /api/telegram/webhook/:firmId
POST   /api/templates/admin
POST   /api/templates/admin/:id/apply/:firmId
POST   /api/templates/admin/:id/clone
POST   /api/templates/admin/:id/set-default
POST   /api/temporal-invoices/:id/approve
POST   /api/temporal-invoices/:id/cancel-approval
POST   /api/temporal-invoices/:id/reject
POST   /api/temporal-invoices/:id/submit-approval
POST   /api/temporalOffboarding/:id/offboarding/cancel
POST   /api/temporalOffboarding/:id/offboarding/complete-task
POST   /api/temporalOffboarding/:id/offboarding/escalate
POST   /api/temporalOffboarding/:id/start-offboarding
POST   /api/temporalOnboarding/:id/onboarding/complete-documents
POST   /api/temporalOnboarding/:id/onboarding/complete-review
POST   /api/temporalOnboarding/:id/onboarding/complete-training
POST   /api/temporalOnboarding/:id/onboarding/skip-phase
POST   /api/temporalOnboarding/:id/start-onboarding
POST   /api/territory
POST   /api/territorys
POST   /api/threadMessages
POST   /api/threadMessages/:id/star
POST   /api/threadMessages/note
POST   /api/time-tracking/entries
POST   /api/time-tracking/entries/:id/approve
POST   /api/time-tracking/entries/:id/lock
POST   /api/time-tracking/entries/:id/reject
POST   /api/time-tracking/entries/:id/request-changes
POST   /api/time-tracking/entries/:id/submit
POST   /api/time-tracking/entries/:id/unlock
POST   /api/time-tracking/entries/:id/write-down
POST   /api/time-tracking/entries/:id/write-off
POST   /api/time-tracking/entries/bulk-approve
POST   /api/time-tracking/entries/bulk-lock
POST   /api/time-tracking/entries/bulk-reject
POST   /api/time-tracking/entries/bulk-submit
POST   /api/time-tracking/timer/pause
POST   /api/time-tracking/timer/resume
POST   /api/time-tracking/timer/start
POST   /api/time-tracking/timer/stop
POST   /api/transactions
POST   /api/transactions/:id/attachments
POST   /api/transactions/:id/cancel
POST   /api/transactions/:id/reconcile
POST   /api/transactions/:id/unreconcile
POST   /api/transactions/categories
POST   /api/trello/cards
POST   /api/trello/cards/:cardId/comments
POST   /api/trello/cards/:cardId/move
POST   /api/trello/disconnect
POST   /api/trello/sync
POST   /api/trello/webhook
POST   /api/trust-accounts
POST   /api/trust-accounts/:id/reconciliations
POST   /api/trust-accounts/:id/three-way-reconciliations
POST   /api/trust-accounts/:id/transactions
POST   /api/trust-accounts/:id/transactions/:transactionId/void
POST   /api/trust-accounts/:id/transfer
POST   /api/user-settings/toggle-section
POST   /api/users/convert-to-firm
POST   /api/users/push-subscription
POST   /api/v1/brokers
POST   /api/v1/brokers/:id/set-default
POST   /api/v1/trades
POST   /api/v1/trades/:id/close
POST   /api/v1/trades/import/csv
POST   /api/v1/trading-accounts
POST   /api/v1/trading-accounts/:id/set-default
POST   /api/v1/trading-accounts/:id/transaction
POST   /api/vendors
POST   /api/verify/moj/attorney
POST   /api/verify/moj/poa
POST   /api/verify/yakeen
POST   /api/verify/yakeen/address
POST   /api/views
POST   /api/views/:id/clone
POST   /api/views/:id/default
POST   /api/views/:id/favorite
POST   /api/views/:id/share
POST   /api/walkthroughs/:id/complete
POST   /api/walkthroughs/:id/reset
POST   /api/walkthroughs/:id/skip
POST   /api/walkthroughs/:id/start
POST   /api/walkthroughs/:id/step/:stepOrder/skip
POST   /api/walkthroughs/:id/step/next
POST   /api/walkthroughs/admin
POST   /api/webhooks
POST   /api/webhooks/:id/deliveries/:deliveryId/retry
POST   /api/webhooks/:id/disable
POST   /api/webhooks/:id/enable
POST   /api/webhooks/:id/regenerate-secret
POST   /api/webhooks/:id/test
POST   /api/whatsapp/broadcasts/:id/cancel
POST   /api/whatsapp/broadcasts/:id/duplicate
POST   /api/whatsapp/broadcasts/:id/pause
POST   /api/whatsapp/broadcasts/:id/recipients
POST   /api/whatsapp/broadcasts/:id/resume
POST   /api/whatsapp/broadcasts/:id/schedule
POST   /api/whatsapp/broadcasts/:id/send
POST   /api/whatsapp/broadcasts/:id/test
POST   /api/whatsapp/conversations/:id/create-lead
POST   /api/whatsapp/conversations/:id/link-lead
POST   /api/whatsapp/conversations/:id/read
POST   /api/whatsapp/messages/send
POST   /api/whatsapp/send/location
POST   /api/whatsapp/send/media
POST   /api/whatsapp/send/template
POST   /api/whatsapp/send/text
POST   /api/whatsapp/templates/:id/submit
POST   /api/workflow/cases/:caseId/initialize
POST   /api/workflow/cases/:caseId/move
POST   /api/workflow/cases/:caseId/requirements/:requirementId/complete
POST   /api/workflow/instances/:id/advance
POST   /api/workflow/instances/:id/cancel
POST   /api/workflow/instances/:id/pause
POST   /api/workflow/instances/:id/resume
POST   /api/workflows/:id/activate
POST   /api/workflows/:id/deactivate
POST   /api/workflows/:id/duplicate
POST   /api/workflows/:id/test
POST   /api/workflows/activities/:id/cancel
POST   /api/workflows/activities/:id/complete
POST   /api/workflows/activities/:id/end-recurrence
POST   /api/workflows/activities/:id/generate-next
POST   /api/workflows/activities/:id/partial-complete
POST   /api/workflows/activities/:id/reminder
POST   /api/workflows/activities/:id/reminder-sent
POST   /api/workflows/activities/:id/reschedule
POST   /api/workflows/activities/:id/snooze
POST   /api/workflows/activities/:id/trigger-next
POST   /api/workflows/activities/:id/undo-complete
POST   /api/workflows/activities/bulk-schedule
POST   /api/workflows/activities/chain
POST   /api/workflows/activities/executions/:executionId/pause
POST   /api/workflows/activities/executions/:executionId/resume
POST   /api/workflows/activities/executions/:executionId/skip-step
POST   /api/workflows/activities/plans/:planId/start
POST   /api/workflows/activities/recurring
POST   /api/workflows/activities/schedule
POST   /api/workflows/approvals/:id/add-parallel-approver
POST   /api/workflows/approvals/:id/advance-stage
POST   /api/workflows/approvals/:id/apply-policy
POST   /api/workflows/approvals/:id/approve
POST   /api/workflows/approvals/:id/conditional-approve
POST   /api/workflows/approvals/:id/delegate
POST   /api/workflows/approvals/:id/escalate
POST   /api/workflows/approvals/:id/notify-stakeholders
POST   /api/workflows/approvals/:id/override-policy
POST   /api/workflows/approvals/:id/reassign
POST   /api/workflows/approvals/:id/recall
POST   /api/workflows/approvals/:id/reject
POST   /api/workflows/approvals/:id/remove-approver
POST   /api/workflows/approvals/:id/request-changes
POST   /api/workflows/approvals/:id/send-reminder
POST   /api/workflows/approvals/:id/skip-stage
POST   /api/workflows/approvals/send-daily-digest
POST   /api/workflows/approvals/submit
POST   /api/workflows/campaigns/:id/add-contacts
POST   /api/workflows/campaigns/:id/cancel
POST   /api/workflows/campaigns/:id/complete
POST   /api/workflows/campaigns/:id/duplicate
POST   /api/workflows/campaigns/:id/launch
POST   /api/workflows/campaigns/:id/pause
POST   /api/workflows/campaigns/:id/remove-contacts
POST   /api/workflows/campaigns/:id/resume
POST   /api/workflows/campaigns/:id/schedule-send
POST   /api/workflows/campaigns/:id/segment-audience
POST   /api/workflows/campaigns/:id/send-batch
POST   /api/workflows/campaigns/:id/send-test
POST   /api/workflows/campaigns/:id/track-click
POST   /api/workflows/campaigns/:id/track-conversion
POST   /api/workflows/campaigns/:id/track-open
POST   /api/workflows/campaigns/:id/track-response
POST   /api/workflows/campaigns/create
POST   /api/workflows/campaigns/from-template/:templateId
POST   /api/workflows/clients/:id/activate
POST   /api/workflows/clients/:id/approve-document
POST   /api/workflows/clients/:id/complete-offboarding
POST   /api/workflows/clients/:id/complete-offboarding-step
POST   /api/workflows/clients/:id/complete-onboarding
POST   /api/workflows/clients/:id/complete-onboarding-step
POST   /api/workflows/clients/:id/deactivate
POST   /api/workflows/clients/:id/downgrade-tier
POST   /api/workflows/clients/:id/mark-at-risk
POST   /api/workflows/clients/:id/record-interaction
POST   /api/workflows/clients/:id/reject-document
POST   /api/workflows/clients/:id/request-documents
POST   /api/workflows/clients/:id/request-review
POST   /api/workflows/clients/:id/schedule-check-in
POST   /api/workflows/clients/:id/schedule-renewal
POST   /api/workflows/clients/:id/send-portal-invite
POST   /api/workflows/clients/:id/send-referral-request
POST   /api/workflows/clients/:id/send-satisfaction-survey
POST   /api/workflows/clients/:id/send-update
POST   /api/workflows/clients/:id/skip-onboarding-step
POST   /api/workflows/clients/:id/start-offboarding
POST   /api/workflows/clients/:id/start-onboarding
POST   /api/workflows/clients/:id/start-retention-campaign
POST   /api/workflows/clients/:id/upgrade-tier
POST   /api/workflows/clients/:id/win-back
POST   /api/workflows/leads/:id/assign
POST   /api/workflows/leads/:id/convert-to-client
POST   /api/workflows/leads/:id/convert-to-opportunity
POST   /api/workflows/leads/:id/create-quote
POST   /api/workflows/leads/:id/disqualify
POST   /api/workflows/leads/:id/mark-lost
POST   /api/workflows/leads/:id/mark-won
POST   /api/workflows/leads/:id/move-stage
POST   /api/workflows/leads/:id/pause-nurturing
POST   /api/workflows/leads/:id/progress-stage
POST   /api/workflows/leads/:id/qualify
POST   /api/workflows/leads/:id/reassign
POST   /api/workflows/leads/:id/resume-nurturing
POST   /api/workflows/leads/:id/start-nurturing
POST   /api/workflows/leads/bulk-assign
POST   /api/workflows/quotes/:id/approve
POST   /api/workflows/quotes/:id/convert-to-invoice
POST   /api/workflows/quotes/:id/duplicate
POST   /api/workflows/quotes/:id/extend-validity
POST   /api/workflows/quotes/:id/reject
POST   /api/workflows/quotes/:id/resend
POST   /api/workflows/quotes/:id/revision
POST   /api/workflows/quotes/:id/send
POST   /api/workflows/quotes/:id/submit-approval
POST   /api/workflows/quotes/:id/track-view
POST   /api/workflows/quotes/from-client/:clientId
POST   /api/workflows/quotes/from-lead/:leadId
POST   /api/workflows/quotes/process-expired
POST   /api/zatca/hash
POST   /api/zatca/prepare/:invoiceId
POST   /api/zatca/qr
POST   /api/zatca/submit/:invoiceId
POST   /api/zatca/submit/bulk
POST   /api/zatca/validate
POST   /api/zoom/disconnect
POST   /api/zoom/meetings
POST   /api/zoom/test
POST   /api/zoom/webhook
```

</details>

### PUT (257)

<details>
<summary>Click to expand</summary>

```
PUT    /api/activities/:id
PUT    /api/activities/types/:id
PUT    /api/activityPlans/:id
PUT    /api/admin/users/:id/claims
PUT    /api/analytics-reports/:id
PUT    /api/appointments/:id
PUT    /api/appointments/:id/complete
PUT    /api/appointments/:id/confirm
PUT    /api/appointments/:id/no-show
PUT    /api/appointments/availability/:id
PUT    /api/appointments/settings
PUT    /api/approvals/rules
PUT    /api/approvals/templates/:id
PUT    /api/approvals/workflows/:id
PUT    /api/apps/:appId/settings
PUT    /api/assets/:assetId/maintenance/:scheduleId
PUT    /api/assets/:id
PUT    /api/assets/categories/:id
PUT    /api/assets/maintenance/:id
PUT    /api/assets/repairs/:id
PUT    /api/assets/settings
PUT    /api/attendance/:id
PUT    /api/attendance/:id/corrections/:correctionId
PUT    /api/attendance/:id/violations/:violationIndex/resolve
PUT    /api/auth/captcha/settings
PUT    /api/auth/saml/config
PUT    /api/automated-actions/:id
PUT    /api/automations/:id
PUT    /api/bank-accounts/:id
PUT    /api/bank-reconciliation/feeds/:id
PUT    /api/bank-reconciliation/rules/:id
PUT    /api/billing/payment-methods/:id/default
PUT    /api/billing/rates/:id
PUT    /api/billing/subscription
PUT    /api/bills/:id
PUT    /api/biometric/devices/:id
PUT    /api/biometric/geofence/:id
PUT    /api/budgets/:budgetId/lines/:lineId
PUT    /api/budgets/:id
PUT    /api/buying/rfqs/:id
PUT    /api/buying/settings
PUT    /api/buying/suppliers/:id
PUT    /api/campaigns/:id
PUT    /api/case-workflows/templates/:id
PUT    /api/cases/:_id/close
PUT    /api/cases/:_id/notes/:noteId
PUT    /api/churn/events/:id/reason
PUT    /api/clients/:id
PUT    /api/competitors/:id
PUT    /api/competitors/:id
PUT    /api/consent/:category
PUT    /api/contactLists/:id
PUT    /api/contacts/:id
PUT    /api/conversations/:id/priority
PUT    /api/conversations/:id/tags
PUT    /api/corporate-cards/:id
PUT    /api/credit-notes/:id
PUT    /api/crm-activities/:id
PUT    /api/crm-pipelines/:id
PUT    /api/crm-pipelines/:id/stages/:stageId
PUT    /api/crmSettings
PUT    /api/dealRooms/:id/pages/:pageId
PUT    /api/debit-notes/:id
PUT    /api/discord/settings
PUT    /api/docusign/settings
PUT    /api/dunning/policies/:id
PUT    /api/email-marketing/campaigns/:id
PUT    /api/email-marketing/drip-campaigns/:id
PUT    /api/email-marketing/segments/:id
PUT    /api/email-marketing/subscribers/:id
PUT    /api/email-marketing/templates/:id
PUT    /api/emailTemplates/:id
PUT    /api/events/:eventId/recurring/instance/:instanceDate
PUT    /api/events/:id
PUT    /api/events/:id/action-items/:itemId
PUT    /api/events/:id/agenda/:agendaId
PUT    /api/events/:id/location-trigger
PUT    /api/events/bulk
PUT    /api/expense-policies/:id
PUT    /api/expenses/:id
PUT    /api/finance-setup
PUT    /api/finance-setup/step/:step
PUT    /api/firms/:firmId/sso
PUT    /api/firms/:id
PUT    /api/firms/:id/access/:userId
PUT    /api/firms/:id/members/:memberId
PUT    /api/firms/:id/move
PUT    /api/gantt/task/:id/dates
PUT    /api/gantt/task/:id/duration
PUT    /api/gantt/task/:id/parent
PUT    /api/gantt/task/:id/progress
PUT    /api/github/settings
PUT    /api/gmail/settings
PUT    /api/google-calendar/calendars/:calendarId/events/:eventId
PUT    /api/google-calendar/settings/calendars
PUT    /api/google-calendar/settings/show-external-events
PUT    /api/gosi/config
PUT    /api/hr/asset-assignments/:id/repair/:repairId
PUT    /api/hr/asset-assignments/:id/status
PUT    /api/hr/attendance-rules/:id
PUT    /api/hr/compensation-rewards/:id
PUT    /api/hr/compensation-rewards/:id/allowances/:allowanceId
PUT    /api/hr/departments/:id
PUT    /api/hr/designations/:id
PUT    /api/hr/employees/:id
PUT    /api/hr/expense-policies/:id
PUT    /api/hr/extended/salary-components/:id
PUT    /api/hr/extended/settings
PUT    /api/hr/fleet/vehicles/:id/location
PUT    /api/hr/job-positions/:id
PUT    /api/hr/job-positions/:id/competencies
PUT    /api/hr/job-positions/:id/qualifications
PUT    /api/hr/job-positions/:id/responsibilities
PUT    /api/hr/job-positions/:id/salary-range
PUT    /api/hr/leave-management/leave-allocations/:id
PUT    /api/hr/leave-management/leave-periods/:id
PUT    /api/hr/leave-management/leave-policies/:id
PUT    /api/hr/leave-types/:id
PUT    /api/hr/payroll/:id
PUT    /api/hr/salary-components/:id
PUT    /api/hr/shift-types/:id
PUT    /api/hr/skill-maps/:employeeId/skills
PUT    /api/hr/transfers/:id
PUT    /api/incomeTaxSlab/:id
PUT    /api/integrations/discord/settings
PUT    /api/integrations/quickbooks/mappings/accounts
PUT    /api/integrations/quickbooks/mappings/fields
PUT    /api/inter-company/transactions/:id
PUT    /api/interestAreas/:id
PUT    /api/inventory/items/:id
PUT    /api/inventory/settings
PUT    /api/inventory/warehouses/:id
PUT    /api/investments/:id
PUT    /api/invoices/:id
PUT    /api/keyboardShortcuts/:id
PUT    /api/leadConversion/case/:caseId/lost
PUT    /api/leadConversion/case/:caseId/stage
PUT    /api/leadConversion/case/:caseId/won
PUT    /api/leads/:id
PUT    /api/leadSource/:id
PUT    /api/lifecycles/workflows/:id
PUT    /api/lostReason/:id
PUT    /api/lostReasons/:id
PUT    /api/lostReasons/reorder
PUT    /api/macros/:id
PUT    /api/manufacturing/boms/:id
PUT    /api/manufacturing/job-cards/:id
PUT    /api/manufacturing/settings
PUT    /api/manufacturing/work-orders/:id
PUT    /api/manufacturing/workstations/:id
PUT    /api/microsoftCalendar/events/:eventId
PUT    /api/ml/priority/:leadId/assign
PUT    /api/notification-preferences
PUT    /api/notification-preferences/categories/:category
PUT    /api/notification-preferences/channels/:channel
PUT    /api/notification-preferences/quiet-hours
PUT    /api/notification-settings
PUT    /api/notification-settings/preferences/:type
PUT    /api/organizations/:id
PUT    /api/payment-terms/:id
PUT    /api/payments/:id
PUT    /api/payments/:id/apply
PUT    /api/payments/:id/check-status
PUT    /api/pdfme/templates/:id
PUT    /api/permissions/config
PUT    /api/permissions/policies/:policyId
PUT    /api/permissions/ui/config
PUT    /api/permissions/ui/pages/:pageId/access
PUT    /api/permissions/ui/roles/:role/bulk
PUT    /api/permissions/ui/sidebar/:itemId/visibility
PUT    /api/playbook/:id
PUT    /api/price-levels/:id
PUT    /api/products/:id
PUT    /api/products/bulk-prices
PUT    /api/products/enhanced/:productId
PUT    /api/products/enhanced/:productId/variants/:variantId
PUT    /api/quality/actions/:id
PUT    /api/quality/inspections/:id
PUT    /api/quality/settings
PUT    /api/quality/templates/:id
PUT    /api/quotes/:id
PUT    /api/quotes/:id/items/:itemId
PUT    /api/recurring-invoices/:id
PUT    /api/recurring-transactions/:id
PUT    /api/referrals/:id
PUT    /api/reminders/:id
PUT    /api/reminders/bulk
PUT    /api/reminders/location/locations/:locationId
PUT    /api/reports/:id
PUT    /api/reports/:id/schedule
PUT    /api/reports/:id/schedule
PUT    /api/retainers/:id
PUT    /api/sales-quotas/:id
PUT    /api/salesForecasts/:id
PUT    /api/salesPerson/:id
PUT    /api/saless/commissions/plans/:id
PUT    /api/saless/deliveries/:id
PUT    /api/saless/orders/:id/items/:itemId
PUT    /api/salesStage/:id
PUT    /api/salesStage/reorder
PUT    /api/salesTeams/:id
PUT    /api/savedFilters/:id
PUT    /api/security/incidents/:id
PUT    /api/settings/crm
PUT    /api/settings/email/signatures/:id
PUT    /api/settings/email/signatures/:id/default
PUT    /api/settings/email/smtp
PUT    /api/settings/email/templates/:id
PUT    /api/settings/finance
PUT    /api/settings/payment-modes/:id
PUT    /api/settings/payment-terms/:id
PUT    /api/settings/sso/providers/:providerId
PUT    /api/settings/taxes/:id
PUT    /api/shift-assignments/:assignmentId
PUT    /api/shift-requests/:requestId
PUT    /api/slack/settings
PUT    /api/slas/:id
PUT    /api/sloMonitorings/:id
PUT    /api/staff/:id
PUT    /api/status/admin/components/:id
PUT    /api/status/admin/incidents/:id
PUT    /api/status/admin/maintenance/:id
PUT    /api/subcontracting/orders/:id
PUT    /api/subcontracting/settings
PUT    /api/support/settings
PUT    /api/support/slas/:id
PUT    /api/support/tickets/:id
PUT    /api/tags/:id
PUT    /api/tasks/:id
PUT    /api/tasks/:id/comments/:commentId
PUT    /api/tasks/:id/location-trigger
PUT    /api/tasks/bulk
PUT    /api/tasks/templates/:templateId
PUT    /api/telegram/settings
PUT    /api/templates/admin/:id
PUT    /api/territory/:id
PUT    /api/territorys/:id
PUT    /api/territorys/:id/move
PUT    /api/time-tracking/entries/:id
PUT    /api/transactions/:id
PUT    /api/transactions/categories/:id
PUT    /api/trello/cards/:cardId
PUT    /api/trello/settings
PUT    /api/user-settings/global-view-mode
PUT    /api/user-settings/module/:module
PUT    /api/user-settings/view-mode/:module
PUT    /api/users/notification-preferences
PUT    /api/vendors/:id
PUT    /api/views/:id
PUT    /api/walkthroughs/admin/:id
PUT    /api/webhooks/:id
PUT    /api/whatsapp/conversations/:id/assign
PUT    /api/workflows/activities/:id/recurrence
PUT    /api/workflows/activities/:id/reminder
PUT    /api/zatca/config
PUT    /api/zoom/meetings/:meetingId
PUT    /api/zoom/settings
```

</details>

### PATCH (231)

<details>
<summary>Click to expand</summary>

```
PATCH  /api/accounts/:id
PATCH  /api/activitys/:id/reassign
PATCH  /api/activitys/:id/reschedule
PATCH  /api/activitys/types/:id
PATCH  /api/admin-api/firms/:id/plan
PATCH  /api/admin-api/firms/:id/suspend
PATCH  /api/admin-api/users/:id/status
PATCH  /api/analytics-reports/:id
PATCH  /api/answers/:_id
PATCH  /api/answers/verify/:_id
PATCH  /api/api-keys/:id
PATCH  /api/auth/webauthn/credentials/:id
PATCH  /api/automatedActions/:id
PATCH  /api/billing/groups/:id
PATCH  /api/case-notion/cases/:caseId/notion/blocks/:blockId
PATCH  /api/case-notion/cases/:caseId/notion/blocks/:blockId/color
PATCH  /api/case-notion/cases/:caseId/notion/blocks/:blockId/opacity
PATCH  /api/case-notion/cases/:caseId/notion/blocks/:blockId/position
PATCH  /api/case-notion/cases/:caseId/notion/blocks/:blockId/priority
PATCH  /api/case-notion/cases/:caseId/notion/blocks/:blockId/rotation
PATCH  /api/case-notion/cases/:caseId/notion/blocks/:blockId/size
PATCH  /api/case-notion/cases/:caseId/notion/blocks/:blockId/style
PATCH  /api/case-notion/cases/:caseId/notion/blocks/:blockId/z-index
PATCH  /api/case-notion/cases/:caseId/notion/connections/:connectionId
PATCH  /api/case-notion/cases/:caseId/notion/frames/:frameId/move
PATCH  /api/case-notion/cases/:caseId/notion/pages/:pageId
PATCH  /api/case-notion/cases/:caseId/notion/pages/:pageId/batch-update
PATCH  /api/case-notion/cases/:caseId/notion/pages/:pageId/view-mode
PATCH  /api/case-notion/cases/:caseId/notion/pages/:pageId/whiteboard-config
PATCH  /api/cases/:_id
PATCH  /api/cases/:_id/claims/:claimId
PATCH  /api/cases/:_id/end
PATCH  /api/cases/:_id/hearing/:hearingId
PATCH  /api/cases/:_id/hearings/:hearingId
PATCH  /api/cases/:_id/notes/:noteId
PATCH  /api/cases/:_id/outcome
PATCH  /api/cases/:_id/progress
PATCH  /api/cases/:_id/rich-documents/:docId
PATCH  /api/cases/:_id/stage
PATCH  /api/cases/:_id/status
PATCH  /api/cases/:_id/timeline/:eventId
PATCH  /api/chat/conversations/:conversationId
PATCH  /api/chatter/activities/:activityId
PATCH  /api/chatter/followers/:followerId/preferences
PATCH  /api/chatterFollowers/:model/:recordId/followers/:id/preferences
PATCH  /api/clients/:id/flags
PATCH  /api/clients/:id/status
PATCH  /api/compensatory-leave-requests/:id
PATCH  /api/conflict-checks/:id
PATCH  /api/contacts/:id
PATCH  /api/contracts/:contractId
PATCH  /api/contracts/:contractId/enforcement
PATCH  /api/contracts/:contractId/parties/:partyIndex
PATCH  /api/conversations/:conversationID
PATCH  /api/corporate-cards/transactions/:id
PATCH  /api/customFields/:id
PATCH  /api/data-export/templates/:id
PATCH  /api/documents/:id
PATCH  /api/events/:eventId/comments/:commentId
PATCH  /api/events/:eventId/notes
PATCH  /api/events/:id
PATCH  /api/events/reorder
PATCH  /api/firms/:_id
PATCH  /api/firms/:id
PATCH  /api/firms/:id/billing
PATCH  /api/followups/:id
PATCH  /api/hr/advances/:advanceId
PATCH  /api/hr/asset-assignments/:id
PATCH  /api/hr/attendance-rules/:id/default
PATCH  /api/hr/attendance-rules/:id/toggle-status
PATCH  /api/hr/compensation-rewards/:id
PATCH  /api/hr/compensation-rewards/:id/allowances/:allowanceId
PATCH  /api/hr/employee-benefits/:id
PATCH  /api/hr/employee-benefits/:id/beneficiaries/:beneficiaryId
PATCH  /api/hr/employee-benefits/:id/claims/:claimId
PATCH  /api/hr/employee-incentives/:id
PATCH  /api/hr/employee-loans/:loanId
PATCH  /api/hr/employee-promotions/:id
PATCH  /api/hr/expense-claims/:id
PATCH  /api/hr/expense-claims/:id/line-items/:lineItemId
PATCH  /api/hr/expense-policies/:id/default
PATCH  /api/hr/expense-policies/:id/toggle-status
PATCH  /api/hr/fleet/drivers/:id
PATCH  /api/hr/fleet/incidents/:id
PATCH  /api/hr/fleet/maintenance/:id
PATCH  /api/hr/fleet/vehicles/:id
PATCH  /api/hr/grievances/:id
PATCH  /api/hr/job-positions/:id
PATCH  /api/hr/leave-policies/:id
PATCH  /api/hr/leave-policies/:id/status
PATCH  /api/hr/leave-policy-assignments/:id/dates
PATCH  /api/hr/offboarding/:offboardingId
PATCH  /api/hr/offboarding/:offboardingId/clearance/items/:itemId
PATCH  /api/hr/offboarding/:offboardingId/rehire-eligibility
PATCH  /api/hr/offboarding/:offboardingId/status
PATCH  /api/hr/okrs/:id
PATCH  /api/hr/okrs/:id/key-results/:keyResultId
PATCH  /api/hr/onboarding/:onboardingId
PATCH  /api/hr/onboarding/:onboardingId/status
PATCH  /api/hr/organizational-structure/:id
PATCH  /api/hr/organizational-structure/:id/budget
PATCH  /api/hr/organizational-structure/:id/headcount
PATCH  /api/hr/organizational-structure/:id/kpis/:kpiId
PATCH  /api/hr/organizational-structure/:id/leadership/:positionId
PATCH  /api/hr/performance-reviews/:id
PATCH  /api/hr/performance-reviews/:id/development-plan/:itemId
PATCH  /api/hr/performance-reviews/templates/:id
PATCH  /api/hr/recruitment/applicants/:applicantId/offer
PATCH  /api/hr/recruitment/applicants/:id
PATCH  /api/hr/recruitment/applicants/:id/assessments/:assessmentId
PATCH  /api/hr/recruitment/applicants/:id/background-check
PATCH  /api/hr/recruitment/applicants/:id/interviews/:interviewId
PATCH  /api/hr/recruitment/applicants/:id/offers/:offerId
PATCH  /api/hr/recruitment/applicants/:id/references/:referenceId
PATCH  /api/hr/recruitment/applicants/:id/talent-pool
PATCH  /api/hr/recruitment/jobs/:id
PATCH  /api/hr/retention-bonuses/:id
PATCH  /api/hr/salary-components/:id/toggle-status
PATCH  /api/hr/salary-components/reorder
PATCH  /api/hr/self-service/profile
PATCH  /api/hr/shift-types/:id/default
PATCH  /api/hr/shifts/shift-assignments/:id
PATCH  /api/hr/shifts/shift-types/:id
PATCH  /api/hr/skill-maps/:employeeId/skills/:skillId
PATCH  /api/hr/skills/:id
PATCH  /api/hr/skills/assessments/:id
PATCH  /api/hr/skills/competencies/:id
PATCH  /api/hr/skills/types/:id
PATCH  /api/hr/staffing-plans/:planId
PATCH  /api/hr/staffing-plans/:planId/details/:detailId
PATCH  /api/hr/staffing-plans/:planId/positions/:posId
PATCH  /api/hr/staffing-plans/scenarios/:scenarioId
PATCH  /api/hr/surveys/:id
PATCH  /api/hr/surveys/templates/:id
PATCH  /api/hr/trainings/:trainingId
PATCH  /api/hr/transfers/:id/approvals/:stepIndex
PATCH  /api/hr/transfers/:id/handover/:itemIndex
PATCH  /api/hr/transfers/:id/status
PATCH  /api/hr/vehicles/:vehicleId
PATCH  /api/invoice-templates/:id
PATCH  /api/invoices/:_id
PATCH  /api/invoices/:id
PATCH  /api/jobs/:_id
PATCH  /api/journal-entries/:id
PATCH  /api/leave-allocations/:id
PATCH  /api/leave-allocations/:id/update-balance
PATCH  /api/leave-encashments/:id
PATCH  /api/leave-requests/:id
PATCH  /api/legal-documents/:id
PATCH  /api/legalDocument/:_id
PATCH  /api/lockDates/:lockType
PATCH  /api/lockDates/fiscal-year
PATCH  /api/matter-budgets/:id
PATCH  /api/matter-budgets/:id/entries/:entryId
PATCH  /api/matter-budgets/:id/phases/:phaseId
PATCH  /api/matter-budgets/templates/:id
PATCH  /api/messages/:conversationID/read
PATCH  /api/notifications/:id/read
PATCH  /api/notifications/mark-all-read
PATCH  /api/notifications/mark-multiple-read
PATCH  /api/orders
PATCH  /api/organizations/:id
PATCH  /api/payroll-runs/:id
PATCH  /api/peerReview/verify/:_id
PATCH  /api/plugins/installations/:installationId/settings
PATCH  /api/products/enhanced/:productId/cost-price
PATCH  /api/proposals/accept/:_id
PATCH  /api/proposals/reject/:_id
PATCH  /api/proposals/withdraw/:_id
PATCH  /api/questions/:_id
PATCH  /api/rate-cards/:id
PATCH  /api/rate-cards/:id/rates/:rateId
PATCH  /api/reminders/:id
PATCH  /api/reminders/reorder
PATCH  /api/sales-quotas/:id
PATCH  /api/saved-reports/reports/:id
PATCH  /api/saved-reports/widgets/:id
PATCH  /api/saved-reports/widgets/layout
PATCH  /api/savedFilters/:id
PATCH  /api/security/incidents/:id/status
PATCH  /api/settings/account
PATCH  /api/settings/ai/preferences
PATCH  /api/settings/appearance
PATCH  /api/settings/display
PATCH  /api/settings/hr
PATCH  /api/settings/hr/attendance
PATCH  /api/settings/hr/employee
PATCH  /api/settings/hr/expense
PATCH  /api/settings/hr/leave
PATCH  /api/settings/hr/payroll
PATCH  /api/settings/notifications
PATCH  /api/settings/payment-modes/:id/default
PATCH  /api/settings/sso
PATCH  /api/settings/taxes/:id/default
PATCH  /api/setup/admin/sections/:sectionId
PATCH  /api/setup/admin/tasks/:taskId
PATCH  /api/staff/:id
PATCH  /api/subscriptions/:id
PATCH  /api/succession-plans/:id
PATCH  /api/succession-plans/:id/actions/:actionId
PATCH  /api/succession-plans/:id/successors/:successorId
PATCH  /api/succession-plans/:id/successors/:successorId/development
PATCH  /api/succession-plans/:id/successors/:successorId/readiness
PATCH  /api/tasks/:id
PATCH  /api/tasks/:id/documents/:documentId
PATCH  /api/tasks/:id/estimate
PATCH  /api/tasks/:id/outcome
PATCH  /api/tasks/:id/progress
PATCH  /api/tasks/:id/status
PATCH  /api/tasks/:id/subtasks/:subtaskId
PATCH  /api/tasks/:id/subtasks/:subtaskId/toggle
PATCH  /api/tasks/:id/timer/pause
PATCH  /api/tasks/:id/timer/resume
PATCH  /api/tasks/:id/voice-memos/:memoId/transcription
PATCH  /api/tasks/:taskId/subtasks/reorder
PATCH  /api/tasks/:taskId/workflow-rules/:ruleId
PATCH  /api/tasks/reorder
PATCH  /api/tasks/templates/:templateId
PATCH  /api/team/:id
PATCH  /api/team/:id/permissions
PATCH  /api/team/:id/role
PATCH  /api/telegram/settings
PATCH  /api/time-tracking/entries/:id
PATCH  /api/trust-accounts/:id
PATCH  /api/users/:_id
PATCH  /api/v1/brokers/:id
PATCH  /api/v1/trades/:id
PATCH  /api/v1/trading-accounts/:id
PATCH  /api/views/:id
PATCH  /api/webhooks/:id
PATCH  /api/workflows/:id
```

</details>

### DELETE (345)

<details>
<summary>Click to expand</summary>

```
DELETE /api/accounts/:id
DELETE /api/activities/:id
DELETE /api/activities/types/:id
DELETE /api/activityPlans/:id
DELETE /api/activitys/types/:id
DELETE /api/admin/tools/users/:id/data
DELETE /api/admin/users/:id/claims
DELETE /api/analytics-reports/:id
DELETE /api/analytics-reports/:id/schedule
DELETE /api/answers/:_id
DELETE /api/api-keys/:id
DELETE /api/appointments/:id
DELETE /api/appointments/availability/:id
DELETE /api/appointments/blocked-times/:id
DELETE /api/approvals/rules/:ruleId
DELETE /api/approvals/templates/:id
DELETE /api/approvals/workflows/:id
DELETE /api/assets/:assetId/maintenance/:scheduleId
DELETE /api/assets/:id
DELETE /api/assets/categories/:id
DELETE /api/attendance/:id
DELETE /api/auth/sessions
DELETE /api/auth/sessions/:id
DELETE /api/auth/sessions/:sessionId/report
DELETE /api/auth/sso/unlink/:providerType
DELETE /api/auth/webauthn/credentials/:id
DELETE /api/automated-actions/:id
DELETE /api/automated-actions/bulk
DELETE /api/automatedActions/:id
DELETE /api/automatedActions/bulk
DELETE /api/automations/:id
DELETE /api/bank-accounts/:id
DELETE /api/bank-reconciliation/feeds/:id
DELETE /api/bank-reconciliation/match/:id
DELETE /api/bank-reconciliation/rules/:id
DELETE /api/billing/groups/:id
DELETE /api/billing/groups/:id/rates/:rateId
DELETE /api/billing/payment-methods/:id
DELETE /api/billing/rates/:id
DELETE /api/billing/subscription
DELETE /api/bills/:id
DELETE /api/bills/:id/attachments/:attachmentId
DELETE /api/biometric/devices/:id
DELETE /api/biometric/geofence/:id
DELETE /api/budgets/:budgetId/lines/:lineId
DELETE /api/budgets/:id
DELETE /api/buying/purchase-orders/:id
DELETE /api/buying/rfqs/:id
DELETE /api/buying/suppliers/:id
DELETE /api/campaigns/:id
DELETE /api/case-notion/cases/:caseId/notion/blocks/:blockId
DELETE /api/case-notion/cases/:caseId/notion/blocks/:blockId/unlink
DELETE /api/case-notion/cases/:caseId/notion/comments/:commentId
DELETE /api/case-notion/cases/:caseId/notion/connections/:connectionId
DELETE /api/case-notion/cases/:caseId/notion/frames/:frameId/children/:elementId
DELETE /api/case-notion/cases/:caseId/notion/pages/:pageId
DELETE /api/case-notion/cases/:caseId/notion/pages/:pageId/bulk-delete
DELETE /api/case-workflows/templates/:id
DELETE /api/cases/:_id
DELETE /api/cases/:_id/claim/:claimId
DELETE /api/cases/:_id/claims/:claimId
DELETE /api/cases/:_id/document/:documentId
DELETE /api/cases/:_id/documents/:docId
DELETE /api/cases/:_id/hearing/:hearingId
DELETE /api/cases/:_id/hearings/:hearingId
DELETE /api/cases/:_id/notes/:noteId
DELETE /api/cases/:_id/rich-documents/:docId
DELETE /api/cases/:_id/timeline/:eventId
DELETE /api/chat/conversations/:conversationId
DELETE /api/chatter/activities/:activityId
DELETE /api/chatter/followers/:followerId
DELETE /api/chatterFollowers/:model/:recordId/followers/:id
DELETE /api/clients/:id
DELETE /api/clients/:id/attachments/:attachmentId
DELETE /api/clients/bulk
DELETE /api/cloudStorages/:provider/files/:fileId
DELETE /api/commandPalettes/saved-searches/:name
DELETE /api/compensatory-leave-requests/:id
DELETE /api/competitors/:id
DELETE /api/competitors/:id
DELETE /api/conflict-checks/:id
DELETE /api/consent
DELETE /api/contactLists/:id
DELETE /api/contactLists/:id/members/:memberId
DELETE /api/contacts/:id
DELETE /api/contacts/:id/unlink-case/:caseId
DELETE /api/contacts/:id/unlink-client/:clientId
DELETE /api/contacts/bulk
DELETE /api/contracts/:contractId
DELETE /api/contracts/:contractId/parties/:partyIndex
DELETE /api/corporate-cards/:id
DELETE /api/corporate-cards/transactions/:id
DELETE /api/credit-notes/:id
DELETE /api/crm-activities/:id
DELETE /api/crm-pipelines/:id
DELETE /api/crm-pipelines/:id/stages/:stageId
DELETE /api/customFields/:id
DELETE /api/customFields/values/:entityType/:entityId
DELETE /api/customFields/values/:entityType/:entityId/:fieldId
DELETE /api/cycles/:id/tasks/:taskId
DELETE /api/data-export/jobs/:id
DELETE /api/data-export/templates/:id
DELETE /api/dealRooms/:id/access/:token
DELETE /api/dealRooms/:id/pages/:pageId
DELETE /api/debit-notes/:id
DELETE /api/document-analysis/:documentId
DELETE /api/documents/:documentId/versions/:versionId
DELETE /api/documents/:id
DELETE /api/docusign/templates/defaults/:templateId
DELETE /api/dunning/policies/:id
DELETE /api/email-marketing/campaigns/:id
DELETE /api/email-marketing/drip-campaigns/:id
DELETE /api/email-marketing/segments/:id
DELETE /api/email-marketing/subscribers/:id
DELETE /api/email-marketing/templates/:id
DELETE /api/emailTemplates/:id
DELETE /api/events/:eventId/attachments/:attachmentId
DELETE /api/events/:eventId/comments/:commentId
DELETE /api/events/:id
DELETE /api/events/:id/action-items/:itemId
DELETE /api/events/:id/agenda/:agendaId
DELETE /api/events/:id/attendees/:attendeeId
DELETE /api/events/bulk
DELETE /api/exchangeRateRevaluation/:id
DELETE /api/expense-policies/:id
DELETE /api/expenses/:id
DELETE /api/firms/:firmId/invitations/:invitationId
DELETE /api/firms/:firmId/ip-whitelist/:ip
DELETE /api/firms/:firmId/ip-whitelist/temporary/:allowanceId
DELETE /api/firms/:firmId/sso
DELETE /api/firms/:id
DELETE /api/firms/:id/access/:userId
DELETE /api/firms/:id/members/:memberId
DELETE /api/followups/:id
DELETE /api/gantt/link/:source/:target
DELETE /api/gigs/:_id
DELETE /api/gmail/watch
DELETE /api/google-calendar/calendars/:calendarId/events/:eventId
DELETE /api/google-calendar/watch/:channelId
DELETE /api/hr/advances/:advanceId
DELETE /api/hr/asset-assignments/:id
DELETE /api/hr/attendance-rules/:id
DELETE /api/hr/compensation-rewards/:id
DELETE /api/hr/compensation-rewards/:id/allowances/:allowanceId
DELETE /api/hr/departments/:id
DELETE /api/hr/designations/:id
DELETE /api/hr/employee-benefits/:id
DELETE /api/hr/employee-benefits/:id/beneficiaries/:beneficiaryId
DELETE /api/hr/employee-benefits/:id/dependents/:memberId
DELETE /api/hr/employee-incentives/:id
DELETE /api/hr/employee-loans/:loanId
DELETE /api/hr/employee-promotions/:id
DELETE /api/hr/employees/:id
DELETE /api/hr/employees/:id/allowances/:allowanceId
DELETE /api/hr/employees/:id/documents/:docId
DELETE /api/hr/expense-claims/:id
DELETE /api/hr/expense-claims/:id/line-items/:lineItemId
DELETE /api/hr/expense-claims/:id/receipts/:receiptId
DELETE /api/hr/expense-policies/:id
DELETE /api/hr/fleet/vehicles/:id
DELETE /api/hr/grievances/:id
DELETE /api/hr/job-positions/:id
DELETE /api/hr/leave-management/leave-allocations/:id
DELETE /api/hr/leave-management/leave-periods/:id
DELETE /api/hr/leave-management/leave-policies/:id
DELETE /api/hr/leave-policies/:id
DELETE /api/hr/leave-types/:id
DELETE /api/hr/offboarding/:offboardingId
DELETE /api/hr/okrs/:id
DELETE /api/hr/onboarding/:onboardingId
DELETE /api/hr/organizational-structure/:id
DELETE /api/hr/organizational-structure/:id/kpis/:kpiId
DELETE /api/hr/organizational-structure/:id/leadership/:positionId
DELETE /api/hr/payroll/:id
DELETE /api/hr/performance-reviews/:id
DELETE /api/hr/recruitment/applicants/:id
DELETE /api/hr/recruitment/jobs/:id
DELETE /api/hr/retention-bonuses/:id
DELETE /api/hr/salary-components/:id
DELETE /api/hr/shift-types/:id
DELETE /api/hr/shifts/shift-assignments/:id
DELETE /api/hr/shifts/shift-types/:id
DELETE /api/hr/skill-maps/:employeeId/skills/:skillId
DELETE /api/hr/skills/:id
DELETE /api/hr/skills/assign/:employeeId/:skillId
DELETE /api/hr/skills/competencies/:id
DELETE /api/hr/staffing-plans/:planId
DELETE /api/hr/staffing-plans/:planId/details/:detailId
DELETE /api/hr/staffing-plans/:planId/details/:detailId/unlink-job-opening
DELETE /api/hr/staffing-plans/:planId/positions/:posId
DELETE /api/hr/staffing-plans/scenarios/:scenarioId
DELETE /api/hr/surveys/:id
DELETE /api/hr/surveys/templates/:id
DELETE /api/hr/trainings/:trainingId
DELETE /api/hr/transfers/:id
DELETE /api/hr/vehicles/:vehicleId
DELETE /api/incomeTaxSlab/:id
DELETE /api/interestAreas/:id
DELETE /api/inventory/items/:id
DELETE /api/inventory/stock-entries/:id
DELETE /api/inventory/warehouses/:id
DELETE /api/investments/:id
DELETE /api/investments/:id/transactions/:transactionId
DELETE /api/invoice-templates/:id
DELETE /api/invoices/:_id
DELETE /api/invoices/:id
DELETE /api/jobs/:_id
DELETE /api/journal-entries/:id
DELETE /api/keyboardShortcuts/:id
DELETE /api/leads/:id
DELETE /api/leadSource/:id
DELETE /api/leave-allocations/:id
DELETE /api/leave-encashments/:id
DELETE /api/leave-requests/:id
DELETE /api/legal-documents/:id
DELETE /api/legalDocument/:_id
DELETE /api/lifecycles/workflows/:id
DELETE /api/lostReason/:id
DELETE /api/lostReasons/:id
DELETE /api/macros/:id
DELETE /api/manufacturing/boms/:id
DELETE /api/manufacturing/work-orders/:id
DELETE /api/manufacturing/workstations/:id
DELETE /api/matter-budgets/:id
DELETE /api/matter-budgets/:id/entries/:entryId
DELETE /api/matter-budgets/:id/phases/:phaseId
DELETE /api/matter-budgets/templates/:id
DELETE /api/microsoftCalendar/events/:eventId
DELETE /api/notifications/:id
DELETE /api/notifications/bulk-delete
DELETE /api/notifications/clear-read
DELETE /api/organizations/:id
DELETE /api/organizations/bulk
DELETE /api/payment-terms/:id
DELETE /api/payments/:id
DELETE /api/payments/:id/unapply/:invoiceId
DELETE /api/payments/bulk
DELETE /api/payroll-runs/:id
DELETE /api/pdfme/templates/:id
DELETE /api/permissions/policies/:policyId
DELETE /api/permissions/relations
DELETE /api/permissions/ui/overrides/:userId
DELETE /api/playbook/:id
DELETE /api/plugins/:id/uninstall
DELETE /api/preparedReport/:id
DELETE /api/price-levels/:id
DELETE /api/products/:id
DELETE /api/products/enhanced/:productId
DELETE /api/products/enhanced/:productId/barcodes/:barcodeId
DELETE /api/products/enhanced/:productId/variants/:variantId
DELETE /api/quality/actions/:id
DELETE /api/quality/inspections/:id
DELETE /api/quality/templates/:id
DELETE /api/questions/:_id
DELETE /api/queues/:name/jobs/:jobId
DELETE /api/quotes/:id
DELETE /api/quotes/:id/items/:itemId
DELETE /api/rate-cards/:id
DELETE /api/rate-cards/:id/rates/:rateId
DELETE /api/recurring-invoices/:id
DELETE /api/referrals/:id
DELETE /api/reminders/:id
DELETE /api/reminders/bulk
DELETE /api/reminders/location/locations/:locationId
DELETE /api/reports/:id
DELETE /api/reports/:id
DELETE /api/reviews/:_id
DELETE /api/sales-quotas/:id
DELETE /api/salesForecasts/:id
DELETE /api/salesPerson/:id
DELETE /api/saless/orders/:id/items/:itemId
DELETE /api/salesStage/:id
DELETE /api/salesTeams/:id
DELETE /api/salesTeams/:id/members/:userId
DELETE /api/sandboxs/:id
DELETE /api/saudi-banking/lean/entities/:entityId
DELETE /api/saved-reports/reports/:id
DELETE /api/saved-reports/widgets/:id
DELETE /api/savedFilters/:id
DELETE /api/savedFilters/:id/share/:userId
DELETE /api/security/csp-violations
DELETE /api/settings/ai/keys/:provider
DELETE /api/settings/email/signatures/:id
DELETE /api/settings/email/templates/:id
DELETE /api/settings/payment-modes/:id
DELETE /api/settings/payment-terms/:id
DELETE /api/settings/sso/providers/:providerId
DELETE /api/settings/taxes/:id
DELETE /api/setup/admin/sections/:sectionId
DELETE /api/setup/admin/tasks/:taskId
DELETE /api/shift-assignments/:assignmentId
DELETE /api/shift-assignments/bulk
DELETE /api/shift-requests/:requestId
DELETE /api/slas/:id
DELETE /api/sloMonitorings/:id
DELETE /api/staff/:id
DELETE /api/statements/:id
DELETE /api/status/admin/components/:id
DELETE /api/subcontracting/orders/:id
DELETE /api/subscriptions/:id
DELETE /api/succession-plans/:id
DELETE /api/succession-plans/:id/successors/:successorId
DELETE /api/support/slas/:id
DELETE /api/support/tickets/:id
DELETE /api/tags/:id
DELETE /api/tasks/:id
DELETE /api/tasks/:id/attachments/:attachmentId
DELETE /api/tasks/:id/comments/:commentId
DELETE /api/tasks/:id/dependencies/:dependencyTaskId
DELETE /api/tasks/:id/subtasks/:subtaskId
DELETE /api/tasks/:id/time-tracking/reset
DELETE /api/tasks/:taskId/dependencies/:depId
DELETE /api/tasks/:taskId/recurring
DELETE /api/tasks/:taskId/time-tracking/:entryId
DELETE /api/tasks/:taskId/watchers/:userId
DELETE /api/tasks/:taskId/workflow-rules/:ruleId
DELETE /api/tasks/bulk
DELETE /api/tasks/templates/:templateId
DELETE /api/team/:id
DELETE /api/team/:id/revoke-invite
DELETE /api/templates/admin/:id
DELETE /api/temporalOnboarding/:id/onboarding/cancel
DELETE /api/territory/:id
DELETE /api/territorys/:id
DELETE /api/threadMessages/:id
DELETE /api/time-tracking/entries/:id
DELETE /api/time-tracking/entries/bulk
DELETE /api/transactions/:id
DELETE /api/transactions/:id/attachments/:attachmentId
DELETE /api/transactions/bulk
DELETE /api/transactions/categories/:id
DELETE /api/trust-accounts/:id
DELETE /api/users/:_id
DELETE /api/users/push-subscription
DELETE /api/v1/brokers/:id
DELETE /api/v1/trades/:id
DELETE /api/v1/trades/bulk
DELETE /api/v1/trading-accounts/:id
DELETE /api/vendors/:id
DELETE /api/views/:id
DELETE /api/walkthroughs/admin/:id
DELETE /api/webhooks/:id
DELETE /api/whatsapp/broadcasts/:id/recipients
DELETE /api/workflows/:id
DELETE /api/zoom/meetings/:meetingId
```

</details>
