# Traf3li API Endpoints

> Auto-generated on 2026-01-09
> 
> Regenerate with: `npm run docs:api`

## Table of Contents

- [account](#account) (7 endpoints)
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
- [apps](#apps) (10 endpoints)
- [arAging](#araging) (6 endpoints)
- [assetAssignment](#assetassignment) (23 endpoints)
- [assets](#assets) (21 endpoints)
- [attendance](#attendance) (28 endpoints)
- [audit](#audit) (5 endpoints)
- [auditLog](#auditlog) (33 endpoints)
- [auth](#auth) (42 endpoints)
- [automatedActions](#automatedactions) (15 endpoints)
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
- [bulkActionss](#bulkactionss) (5 endpoints)
- [buying](#buying) (33 endpoints)
- [calendar](#calendar) (11 endpoints)
- [campaigns](#campaigns) (12 endpoints)
- [captcha](#captcha) (3 endpoints)
- [case](#case) (54 endpoints)
- [caseNotion](#casenotion) (74 endpoints)
- [chatterFollowers](#chatterfollowers) (7 endpoints)
- [churn](#churn) (19 endpoints)
- [client](#client) (23 endpoints)
- [cloudStorages](#cloudstorages) (13 endpoints)
- [commandPalettes](#commandpalettes) (9 endpoints)
- [compensationReward](#compensationreward) (24 endpoints)
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
- [creditNote](#creditnote) (10 endpoints)
- [crmActivity](#crmactivity) (14 endpoints)
- [crmPipeline](#crmpipeline) (12 endpoints)
- [crmReports](#crmreports) (27 endpoints)
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
- [docusign](#docusign) (17 endpoints)
- [dunning](#dunning) (24 endpoints)
- [emailMarketing](#emailmarketing) (39 endpoints)
- [emailSettings](#emailsettings) (14 endpoints)
- [emailTemplates](#emailtemplates) (10 endpoints)
- [employeeAdvance](#employeeadvance) (23 endpoints)
- [employeeBenefit](#employeebenefit) (23 endpoints)
- [employeeLoan](#employeeloan) (24 endpoints)
- [employeeSelfService](#employeeselfservice) (11 endpoints)
- [event](#event) (51 endpoints)
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
- [hrExtended](#hrextended) (49 endpoints)
- [incomeTaxSlab](#incometaxslab) (9 endpoints)
- [integrations](#integrations) (45 endpoints)
- [interCompany](#intercompany) (10 endpoints)
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
- [leaveManagement](#leavemanagement) (26 endpoints)
- [leaveRequest](#leaverequest) (20 endpoints)
- [legalContract](#legalcontract) (33 endpoints)
- [legalDocument](#legaldocument) (6 endpoints)
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
- [setupWizard](#setupwizard) (13 endpoints)
- [shift](#shift) (17 endpoints)
- [skillMatrix](#skillmatrix) (32 endpoints)
- [slack](#slack) (12 endpoints)
- [slas](#slas) (10 endpoints)
- [sloMonitorings](#slomonitorings) (18 endpoints)
- [smartButton](#smartbutton) (2 endpoints)
- [smartScheduling](#smartscheduling) (6 endpoints)
- [ssoConfig](#ssoconfig) (5 endpoints)
- [staff](#staff) (9 endpoints)
- [statement](#statement) (7 endpoints)
- [status](#status) (22 endpoints)
- [subcontracting](#subcontracting) (14 endpoints)
- [successionPlan](#successionplan) (27 endpoints)
- [support](#support) (16 endpoints)
- [survey](#survey) (16 endpoints)
- [tag](#tag) (9 endpoints)
- [task](#task) (89 endpoints)
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
- [workflows](#workflows) (154 endpoints)
- [zatca](#zatca) (12 endpoints)
- [zoom](#zoom) (14 endpoints)

---

## Summary

| Metric | Count |
|--------|-------|
| Total Endpoints | 4086 |
| Total Modules | 262 |

---

## account

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/account/types` | getAccountTypes | account.route.js |
| `GET` | `/api/account` | getAccounts | account.route.js |
| `GET` | `/api/account/:id` | getAccount | account.route.js |
| `GET` | `/api/account/:id/balance` | getAccountBalance | account.route.js |
| `POST` | `/api/account` | createAccount | account.route.js |
| `PATCH` | `/api/account/:id` | updateAccount | account.route.js |
| `DELETE` | `/api/account/:id` | deleteAccount | account.route.js |

## activity

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/activity/summary` | getActivitySummary | activity.route.js |
| `GET` | `/api/activity/overview` | getActivityOverview | activity.route.js |
| `GET` | `/api/activity/entity/:entityType/:entityId` | getEntityActivities | activity.route.js |
| `GET` | `/api/activity` | getActivities | activity.route.js |
| `GET` | `/api/activity/:id` | getActivity | activity.route.js |

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
| `GET` | `/api/adminApi/dashboard/summary` | getDashboardSummary | adminApi.route.js |
| `GET` | `/api/adminApi/dashboard/revenue` | getRevenueMetrics | adminApi.route.js |
| `GET` | `/api/adminApi/dashboard/active-users` | getActiveUsers | adminApi.route.js |
| `GET` | `/api/adminApi/dashboard/system-health` | getSystemHealth | adminApi.route.js |
| `GET` | `/api/adminApi/dashboard/pending-approvals` | getPendingApprovals | adminApi.route.js |
| `GET` | `/api/adminApi/dashboard/recent-activity` | getRecentActivity | adminApi.route.js |
| `GET` | `/api/adminApi/users` | listUsers | adminApi.route.js |
| `GET` | `/api/adminApi/users/export` | exportUsers | adminApi.route.js |
| `GET` | `/api/adminApi/users/:id` | getUserDetails | adminApi.route.js |
| `PATCH` | `/api/adminApi/users/:id/status` | updateUserStatus | adminApi.route.js |
| `POST` | `/api/adminApi/users/:id/revoke-tokens` | revokeUserTokens | adminApi.route.js |
| `POST` | `/api/adminApi/users/:id/reset-password` | resetUserPassword | adminApi.route.js |
| `GET` | `/api/adminApi/audit/logs` | getAuditLogs | adminApi.route.js |
| `GET` | `/api/adminApi/audit/security-events` | getSecurityEvents | adminApi.route.js |
| `GET` | `/api/adminApi/audit/compliance-report` | getComplianceReport | adminApi.route.js |
| `GET` | `/api/adminApi/audit/export` | exportAuditLogs | adminApi.route.js |
| `GET` | `/api/adminApi/audit/login-history` | getLoginHistory | adminApi.route.js |
| `GET` | `/api/adminApi/firms` | listFirms | adminApi.route.js |
| `GET` | `/api/adminApi/firms/:id` | getFirmDetails | adminApi.route.js |
| `GET` | `/api/adminApi/firms/:id/usage` | getFirmUsage | adminApi.route.js |
| `PATCH` | `/api/adminApi/firms/:id/plan` | updateFirmPlan | adminApi.route.js |
| `PATCH` | `/api/adminApi/firms/:id/suspend` | suspendFirm | adminApi.route.js |

## adminTools

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/adminTools/users/:id/data` | getUserData | adminTools.route.js |
| `DELETE` | `/api/adminTools/users/:id/data` | deleteUserData | adminTools.route.js |
| `GET` | `/api/adminTools/firms/:id/export` | exportFirmData | adminTools.route.js |
| `POST` | `/api/adminTools/firms/:id/import` | importFirmData | adminTools.route.js |
| `POST` | `/api/adminTools/users/merge` | mergeUsers | adminTools.route.js |
| `POST` | `/api/adminTools/clients/merge` | mergeClients | adminTools.route.js |
| `POST` | `/api/adminTools/firms/:id/recalculate-invoices` | recalculateInvoiceTotals | adminTools.route.js |
| `POST` | `/api/adminTools/firms/:id/reindex` | reindexSearchData | adminTools.route.js |
| `POST` | `/api/adminTools/firms/:id/cleanup-orphaned` | cleanupOrphanedRecords | adminTools.route.js |
| `GET` | `/api/adminTools/firms/:id/validate` | validateDataIntegrity | adminTools.route.js |
| `POST` | `/api/adminTools/firms/:id/fix-currency` | fixCurrencyConversions | adminTools.route.js |
| `GET` | `/api/adminTools/stats` | getSystemStats | adminTools.route.js |
| `GET` | `/api/adminTools/activity-report` | getUserActivityReport | adminTools.route.js |
| `GET` | `/api/adminTools/storage-usage` | getStorageUsage | adminTools.route.js |
| `POST` | `/api/adminTools/clear-cache` | clearCache | adminTools.route.js |
| `GET` | `/api/adminTools/diagnostics` | runDiagnostics | adminTools.route.js |
| `GET` | `/api/adminTools/slow-queries` | getSlowQueries | adminTools.route.js |
| `POST` | `/api/adminTools/users/:id/reset-password` | resetUserPassword | adminTools.route.js |
| `POST` | `/api/adminTools/users/:id/impersonate` | impersonateUser | adminTools.route.js |
| `POST` | `/api/adminTools/impersonation/:sessionId/end` | endImpersonation | adminTools.route.js |
| `POST` | `/api/adminTools/users/:id/lock` | lockUser | adminTools.route.js |
| `POST` | `/api/adminTools/users/:id/unlock` | unlockUser | adminTools.route.js |
| `GET` | `/api/adminTools/users/:id/login-history` | getLoginHistory | adminTools.route.js |
| `GET` | `/api/adminTools/key-rotation/status` | getKeyRotationStatus | adminTools.route.js |
| `GET` | `/api/adminTools/key-rotation/check` | checkRotationNeeded | adminTools.route.js |
| `POST` | `/api/adminTools/key-rotation/rotate` | rotateKeys | adminTools.route.js |
| `POST` | `/api/adminTools/key-rotation/auto-rotate` | autoRotate | adminTools.route.js |
| `POST` | `/api/adminTools/key-rotation/generate` | generateNewKey | adminTools.route.js |
| `POST` | `/api/adminTools/key-rotation/cleanup` | cleanupExpiredKeys | adminTools.route.js |
| `POST` | `/api/adminTools/key-rotation/initialize` | initializeKeyRotation | adminTools.route.js |

## aiChat

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/aiChat/providers` | getProviders | aiChat.route.js |
| `POST` | `/api/aiChat` | sendMessage | aiChat.route.js |
| `POST` | `/api/aiChat/stream` | streamMessage | aiChat.route.js |
| `GET` | `/api/aiChat/conversations` | getConversations | aiChat.route.js |
| `GET` | `/api/aiChat/conversations/:conversationId` | getConversation | aiChat.route.js |
| `PATCH` | `/api/aiChat/conversations/:conversationId` | updateConversationTitle | aiChat.route.js |
| `DELETE` | `/api/aiChat/conversations/:conversationId` | deleteConversation | aiChat.route.js |

## aiMatching

| Method | Path | Controller | File |
|--------|------|------------|------|
| `POST` | `/api/aiMatching/match` | unknown | aiMatching.route.js |
| `POST` | `/api/aiMatching/batch` | unknown | aiMatching.route.js |
| `POST` | `/api/aiMatching/auto-match` | unknown | aiMatching.route.js |
| `POST` | `/api/aiMatching/confirm` | unknown | aiMatching.route.js |
| `POST` | `/api/aiMatching/reject` | unknown | aiMatching.route.js |
| `POST` | `/api/aiMatching/unmatch` | unknown | aiMatching.route.js |
| `GET` | `/api/aiMatching/suggestions` | unknown | aiMatching.route.js |
| `POST` | `/api/aiMatching/suggestions/bulk-confirm` | unknown | aiMatching.route.js |
| `GET` | `/api/aiMatching/stats` | unknown | aiMatching.route.js |
| `GET` | `/api/aiMatching/patterns/stats` | unknown | aiMatching.route.js |
| `GET` | `/api/aiMatching/patterns` | unknown | aiMatching.route.js |
| `POST` | `/api/aiMatching/patterns/cleanup` | unknown | aiMatching.route.js |

## aiSettings

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/aiSettings` | getAISettings | aiSettings.route.js |
| `GET` | `/api/aiSettings/features` | getFeatureStatus | aiSettings.route.js |
| `GET` | `/api/aiSettings/usage` | getUsageStats | aiSettings.route.js |
| `POST` | `/api/aiSettings/keys` | saveApiKey | aiSettings.route.js |
| `POST` | `/api/aiSettings/validate` | validateApiKey | aiSettings.route.js |
| `DELETE` | `/api/aiSettings/keys/:provider` | removeApiKey | aiSettings.route.js |
| `PATCH` | `/api/aiSettings/preferences` | updatePreferences | aiSettings.route.js |

## analyticsReport

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/analyticsReport/stats` | unknown | analyticsReport.route.js |
| `GET` | `/api/analyticsReport/favorites` | unknown | analyticsReport.route.js |
| `GET` | `/api/analyticsReport/pinned` | unknown | analyticsReport.route.js |
| `GET` | `/api/analyticsReport/templates` | unknown | analyticsReport.route.js |
| `GET` | `/api/analyticsReport/section/:section` | unknown | analyticsReport.route.js |
| `POST` | `/api/analyticsReport/from-template/:templateId` | unknown | analyticsReport.route.js |
| `GET` | `/api/analyticsReport` | unknown | analyticsReport.route.js |
| `POST` | `/api/analyticsReport` | unknown | analyticsReport.route.js |
| `POST` | `/api/analyticsReport/bulk-delete` | unknown | analyticsReport.route.js |
| `GET` | `/api/analyticsReport/:id` | unknown | analyticsReport.route.js |
| `PATCH` | `/api/analyticsReport/:id` | unknown | analyticsReport.route.js |
| `PUT` | `/api/analyticsReport/:id` | unknown | analyticsReport.route.js |
| `DELETE` | `/api/analyticsReport/:id` | unknown | analyticsReport.route.js |
| `POST` | `/api/analyticsReport/:id/run` | unknown | analyticsReport.route.js |
| `POST` | `/api/analyticsReport/:id/clone` | unknown | analyticsReport.route.js |
| `POST` | `/api/analyticsReport/:id/export` | unknown | analyticsReport.route.js |
| `POST` | `/api/analyticsReport/:id/favorite` | unknown | analyticsReport.route.js |
| `POST` | `/api/analyticsReport/:id/pin` | unknown | analyticsReport.route.js |
| `POST` | `/api/analyticsReport/:id/schedule` | unknown | analyticsReport.route.js |
| `DELETE` | `/api/analyticsReport/:id/schedule` | unknown | analyticsReport.route.js |

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
| `POST` | `/api/answer` | createAnswer | answer.route.js |
| `GET` | `/api/answer/:questionId` | getAnswers | answer.route.js |
| `PATCH` | `/api/answer/:_id` | updateAnswer | answer.route.js |
| `DELETE` | `/api/answer/:_id` | deleteAnswer | answer.route.js |
| `POST` | `/api/answer/like/:_id` | likeAnswer | answer.route.js |
| `PATCH` | `/api/answer/verify/:_id` | verifyAnswer | answer.route.js |

## apiKey

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/apiKey` | unknown | apiKey.route.js |
| `GET` | `/api/apiKey/stats` | unknown | apiKey.route.js |
| `GET` | `/api/apiKey/:id` | unknown | apiKey.route.js |
| `POST` | `/api/apiKey` | unknown | apiKey.route.js |
| `PATCH` | `/api/apiKey/:id` | unknown | apiKey.route.js |
| `DELETE` | `/api/apiKey/:id` | unknown | apiKey.route.js |
| `POST` | `/api/apiKey/:id/regenerate` | unknown | apiKey.route.js |

## appointment

| Method | Path | Controller | File |
|--------|------|------------|------|
| `POST` | `/api/appointment/book/:firmId` | unknown | appointment.route.js |
| `GET` | `/api/appointment/available-slots` | unknown | appointment.route.js |
| `GET` | `/api/appointment/:id/calendar.ics` | unknown | appointment.route.js |
| `GET` | `/api/appointment/availability` | unknown | appointment.route.js |
| `POST` | `/api/appointment/availability` | unknown | appointment.route.js |
| `POST` | `/api/appointment/availability/bulk` | unknown | appointment.route.js |
| `PUT` | `/api/appointment/availability/:id` | unknown | appointment.route.js |
| `DELETE` | `/api/appointment/availability/:id` | unknown | appointment.route.js |
| `GET` | `/api/appointment/blocked-times` | unknown | appointment.route.js |
| `POST` | `/api/appointment/blocked-times` | unknown | appointment.route.js |
| `DELETE` | `/api/appointment/blocked-times/:id` | unknown | appointment.route.js |
| `GET` | `/api/appointment/settings` | unknown | appointment.route.js |
| `PUT` | `/api/appointment/settings` | unknown | appointment.route.js |
| `GET` | `/api/appointment/stats` | unknown | appointment.route.js |
| `GET` | `/api/appointment/debug` | unknown | appointment.route.js |
| `GET` | `/api/appointment/calendar-status` | unknown | appointment.route.js |
| `GET` | `/api/appointment/:id/calendar-links` | unknown | appointment.route.js |
| `POST` | `/api/appointment/:id/sync-calendar` | unknown | appointment.route.js |
| `GET` | `/api/appointment` | unknown | appointment.route.js |
| `GET` | `/api/appointment/slots` | unknown | appointment.route.js |
| `GET` | `/api/appointment/:id` | unknown | appointment.route.js |
| `POST` | `/api/appointment` | unknown | appointment.route.js |
| `PUT` | `/api/appointment/:id` | unknown | appointment.route.js |
| `PUT` | `/api/appointment/:id/confirm` | unknown | appointment.route.js |
| `PUT` | `/api/appointment/:id/complete` | unknown | appointment.route.js |
| `PUT` | `/api/appointment/:id/no-show` | unknown | appointment.route.js |
| `POST` | `/api/appointment/:id/reschedule` | unknown | appointment.route.js |
| `DELETE` | `/api/appointment/:id` | unknown | appointment.route.js |

## approval

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/approval/rules` | getApprovalRules | approval.route.js |
| `PUT` | `/api/approval/rules` | updateApprovalRules | approval.route.js |
| `GET` | `/api/approval/pending` | getPendingApprovals | approval.route.js |
| `GET` | `/api/approval/history` | getApprovalHistory | approval.route.js |
| `GET` | `/api/approval/:id` | getApprovalRequest | approval.route.js |
| `POST` | `/api/approval/:id/approve` | approveRequest | approval.route.js |
| `POST` | `/api/approval/:id/reject` | rejectRequest | approval.route.js |
| `POST` | `/api/approval/:id/cancel` | cancelApproval | approval.route.js |

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
| `GET` | `/api/arAging/report` | getAgingReport | arAging.route.js |
| `GET` | `/api/arAging/summary` | getAgingSummary | arAging.route.js |
| `GET` | `/api/arAging/client/:clientId` | getAgingByClient | arAging.route.js |
| `GET` | `/api/arAging/forecast` | getCollectionForecast | arAging.route.js |
| `GET` | `/api/arAging/priority/:invoiceId` | getCollectionPriorityScore | arAging.route.js |
| `GET` | `/api/arAging/export` | exportAgingReport | arAging.route.js |

## assetAssignment

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/assetAssignment/stats` | unknown | assetAssignment.route.js |
| `GET` | `/api/assetAssignment/overdue` | unknown | assetAssignment.route.js |
| `GET` | `/api/assetAssignment/maintenance-due` | unknown | assetAssignment.route.js |
| `GET` | `/api/assetAssignment/warranty-expiring` | unknown | assetAssignment.route.js |
| `GET` | `/api/assetAssignment/export` | unknown | assetAssignment.route.js |
| `GET` | `/api/assetAssignment/policies` | unknown | assetAssignment.route.js |
| `POST` | `/api/assetAssignment/bulk-delete` | unknown | assetAssignment.route.js |
| `GET` | `/api/assetAssignment/by-employee/:employeeId` | unknown | assetAssignment.route.js |
| `GET` | `/api/assetAssignment` | unknown | assetAssignment.route.js |
| `POST` | `/api/assetAssignment` | unknown | assetAssignment.route.js |
| `GET` | `/api/assetAssignment/:id` | unknown | assetAssignment.route.js |
| `PATCH` | `/api/assetAssignment/:id` | unknown | assetAssignment.route.js |
| `DELETE` | `/api/assetAssignment/:id` | unknown | assetAssignment.route.js |
| `POST` | `/api/assetAssignment/:id/acknowledge` | unknown | assetAssignment.route.js |
| `POST` | `/api/assetAssignment/:id/return/initiate` | unknown | assetAssignment.route.js |
| `POST` | `/api/assetAssignment/:id/return/complete` | unknown | assetAssignment.route.js |
| `PUT` | `/api/assetAssignment/:id/status` | unknown | assetAssignment.route.js |
| `POST` | `/api/assetAssignment/:id/transfer` | unknown | assetAssignment.route.js |
| `POST` | `/api/assetAssignment/:id/clearance` | unknown | assetAssignment.route.js |
| `POST` | `/api/assetAssignment/:id/maintenance` | unknown | assetAssignment.route.js |
| `POST` | `/api/assetAssignment/:id/repair` | unknown | assetAssignment.route.js |
| `PUT` | `/api/assetAssignment/:id/repair/:repairId` | unknown | assetAssignment.route.js |
| `POST` | `/api/assetAssignment/:id/incident` | unknown | assetAssignment.route.js |

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
| `GET` | `/api/auditLog` | unknown | auditLog.route.js |
| `GET` | `/api/auditLog/entity/:type/:id` | unknown | auditLog.route.js |
| `GET` | `/api/auditLog/user/:id` | unknown | auditLog.route.js |
| `GET` | `/api/auditLog/security` | unknown | auditLog.route.js |
| `GET` | `/api/auditLog/export` | unknown | auditLog.route.js |
| `GET` | `/api/auditLog/failed-logins` | unknown | auditLog.route.js |
| `GET` | `/api/auditLog/suspicious` | unknown | auditLog.route.js |
| `POST` | `/api/auditLog/check-brute-force` | unknown | auditLog.route.js |
| `GET` | `/api/auditLog/summary` | unknown | auditLog.route.js |
| `GET` | `/api/auditLog/security-events` | unknown | auditLog.route.js |
| `GET` | `/api/auditLog/compliance-report` | unknown | auditLog.route.js |
| `GET` | `/api/auditLog/archiving/stats` | unknown | auditLog.route.js |
| `GET` | `/api/auditLog/archiving/summary` | unknown | auditLog.route.js |
| `POST` | `/api/auditLog/archiving/run` | unknown | auditLog.route.js |
| `POST` | `/api/auditLog/archiving/verify` | unknown | auditLog.route.js |
| `POST` | `/api/auditLog/archiving/restore` | unknown | auditLog.route.js |
| `POST` | `/api/auditLog/log-with-diff` | unknown | auditLog.route.js |
| `POST` | `/api/auditLog/log-bulk-action` | unknown | auditLog.route.js |
| `POST` | `/api/auditLog/log-security-event` | unknown | auditLog.route.js |
| `GET` | `/api/auditLog/search` | unknown | auditLog.route.js |
| `GET` | `/api/auditLog/by-action/:action` | unknown | auditLog.route.js |
| `GET` | `/api/auditLog/by-date-range` | unknown | auditLog.route.js |
| `GET` | `/api/auditLog/analytics/activity-summary` | unknown | auditLog.route.js |
| `GET` | `/api/auditLog/analytics/top-users` | unknown | auditLog.route.js |
| `GET` | `/api/auditLog/analytics/top-actions` | unknown | auditLog.route.js |
| `GET` | `/api/auditLog/analytics/anomalies` | unknown | auditLog.route.js |
| `POST` | `/api/auditLog/compliance/generate-report` | unknown | auditLog.route.js |
| `POST` | `/api/auditLog/compliance/verify-integrity` | unknown | auditLog.route.js |
| `POST` | `/api/auditLog/compliance/export-for-audit` | unknown | auditLog.route.js |
| `GET` | `/api/auditLog/compliance/retention-status` | unknown | auditLog.route.js |
| `GET` | `/api/auditLog/archive/stats` | unknown | auditLog.route.js |
| `POST` | `/api/auditLog/archive/run` | unknown | auditLog.route.js |
| `POST` | `/api/auditLog/archive/verify` | unknown | auditLog.route.js |

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
| `POST` | `/api/bankAccount` | createBankAccount | bankAccount.route.js |
| `GET` | `/api/bankAccount` | getBankAccounts | bankAccount.route.js |
| `GET` | `/api/bankAccount/summary` | getSummary | bankAccount.route.js |
| `GET` | `/api/bankAccount/:id` | getBankAccount | bankAccount.route.js |
| `PUT` | `/api/bankAccount/:id` | updateBankAccount | bankAccount.route.js |
| `DELETE` | `/api/bankAccount/:id` | deleteBankAccount | bankAccount.route.js |
| `POST` | `/api/bankAccount/:id/set-default` | setDefault | bankAccount.route.js |
| `GET` | `/api/bankAccount/:id/balance-history` | getBalanceHistory | bankAccount.route.js |
| `POST` | `/api/bankAccount/:id/sync` | syncAccount | bankAccount.route.js |
| `POST` | `/api/bankAccount/:id/disconnect` | disconnectAccount | bankAccount.route.js |

## bankReconciliation

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/bankReconciliation/feeds` | getBankFeeds | bankReconciliation.route.js |
| `POST` | `/api/bankReconciliation/feeds` | createBankFeed | bankReconciliation.route.js |
| `PUT` | `/api/bankReconciliation/feeds/:id` | updateBankFeed | bankReconciliation.route.js |
| `DELETE` | `/api/bankReconciliation/feeds/:id` | deleteBankFeed | bankReconciliation.route.js |
| `POST` | `/api/bankReconciliation/import/csv` | importCSV | bankReconciliation.route.js |
| `POST` | `/api/bankReconciliation/import/ofx` | importOFX | bankReconciliation.route.js |
| `GET` | `/api/bankReconciliation/import/template` | getCSVTemplate | bankReconciliation.route.js |
| `GET` | `/api/bankReconciliation/suggestions/:accountId` | getMatchSuggestions | bankReconciliation.route.js |
| `POST` | `/api/bankReconciliation/auto-match/:accountId` | autoMatch | bankReconciliation.route.js |
| `POST` | `/api/bankReconciliation/match/confirm/:id` | confirmMatch | bankReconciliation.route.js |
| `POST` | `/api/bankReconciliation/match/reject/:id` | rejectMatch | bankReconciliation.route.js |
| `POST` | `/api/bankReconciliation/match/split` | createSplitMatch | bankReconciliation.route.js |
| `DELETE` | `/api/bankReconciliation/match/:id` | unmatch | bankReconciliation.route.js |
| `POST` | `/api/bankReconciliation/rules` | createRule | bankReconciliation.route.js |
| `GET` | `/api/bankReconciliation/rules` | getRules | bankReconciliation.route.js |
| `PUT` | `/api/bankReconciliation/rules/:id` | updateRule | bankReconciliation.route.js |
| `DELETE` | `/api/bankReconciliation/rules/:id` | deleteRule | bankReconciliation.route.js |
| `POST` | `/api/bankReconciliation` | createReconciliation | bankReconciliation.route.js |
| `GET` | `/api/bankReconciliation` | getReconciliations | bankReconciliation.route.js |
| `GET` | `/api/bankReconciliation/:id` | getReconciliation | bankReconciliation.route.js |
| `POST` | `/api/bankReconciliation/:id/clear` | clearTransaction | bankReconciliation.route.js |
| `POST` | `/api/bankReconciliation/:id/unclear` | unclearTransaction | bankReconciliation.route.js |
| `POST` | `/api/bankReconciliation/:id/complete` | completeReconciliation | bankReconciliation.route.js |
| `POST` | `/api/bankReconciliation/:id/cancel` | cancelReconciliation | bankReconciliation.route.js |
| `GET` | `/api/bankReconciliation/status/:accountId` | getReconciliationStatus | bankReconciliation.route.js |
| `GET` | `/api/bankReconciliation/unmatched/:accountId` | getUnmatchedTransactions | bankReconciliation.route.js |
| `GET` | `/api/bankReconciliation/statistics/matches` | getMatchStatistics | bankReconciliation.route.js |
| `GET` | `/api/bankReconciliation/statistics/rules` | getRuleStatistics | bankReconciliation.route.js |
| `GET` | `/api/bankReconciliation/currency/rates` | getExchangeRates | bankReconciliation.route.js |
| `POST` | `/api/bankReconciliation/currency/convert` | convertAmount | bankReconciliation.route.js |
| `POST` | `/api/bankReconciliation/currency/rates` | setManualRate | bankReconciliation.route.js |
| `GET` | `/api/bankReconciliation/currency/supported` | getSupportedCurrencies | bankReconciliation.route.js |
| `POST` | `/api/bankReconciliation/currency/update` | updateRatesFromAPI | bankReconciliation.route.js |

## bankTransaction

| Method | Path | Controller | File |
|--------|------|------------|------|
| `POST` | `/api/bankTransaction` | createTransaction | bankTransaction.route.js |
| `GET` | `/api/bankTransaction` | getTransactions | bankTransaction.route.js |
| `GET` | `/api/bankTransaction/:id` | getTransaction | bankTransaction.route.js |
| `POST` | `/api/bankTransaction/:transactionId/match` | matchTransaction | bankTransaction.route.js |
| `POST` | `/api/bankTransaction/:transactionId/unmatch` | unmatchTransaction | bankTransaction.route.js |
| `POST` | `/api/bankTransaction/import/:accountId` | importTransactions | bankTransaction.route.js |

## bankTransfer

| Method | Path | Controller | File |
|--------|------|------------|------|
| `POST` | `/api/bankTransfer` | createTransfer | bankTransfer.route.js |
| `GET` | `/api/bankTransfer` | getTransfers | bankTransfer.route.js |
| `GET` | `/api/bankTransfer/:id` | getTransfer | bankTransfer.route.js |
| `POST` | `/api/bankTransfer/:id/cancel` | cancelTransfer | bankTransfer.route.js |

## bill

| Method | Path | Controller | File |
|--------|------|------------|------|
| `POST` | `/api/bill` | createBill | bill.route.js |
| `GET` | `/api/bill` | getBills | bill.route.js |
| `GET` | `/api/bill/overdue` | getOverdueBills | bill.route.js |
| `GET` | `/api/bill/summary` | getSummary | bill.route.js |
| `GET` | `/api/bill/recurring` | getRecurringBills | bill.route.js |
| `GET` | `/api/bill/reports/aging` | getAgingReport | bill.route.js |
| `GET` | `/api/bill/export` | exportBills | bill.route.js |
| `GET` | `/api/bill/:id` | getBill | bill.route.js |
| `PUT` | `/api/bill/:id` | updateBill | bill.route.js |
| `DELETE` | `/api/bill/:id` | deleteBill | bill.route.js |
| `POST` | `/api/bill/:id/receive` | receiveBill | bill.route.js |
| `POST` | `/api/bill/:id/cancel` | cancelBill | bill.route.js |
| `POST` | `/api/bill/:id/duplicate` | duplicateBill | bill.route.js |
| `POST` | `/api/bill/:id/stop-recurring` | stopRecurring | bill.route.js |
| `POST` | `/api/bill/:id/generate-next` | generateNextBill | bill.route.js |
| `POST` | `/api/bill/:id/approve` | approveBill | bill.route.js |
| `POST` | `/api/bill/:id/pay` | payBill | bill.route.js |
| `POST` | `/api/bill/:id/post-to-gl` | postToGL | bill.route.js |
| `POST` | `/api/bill/:id/attachments` | uploadAttachment | bill.route.js |
| `DELETE` | `/api/bill/:id/attachments/:attachmentId` | deleteAttachment | bill.route.js |

## billPayment

| Method | Path | Controller | File |
|--------|------|------------|------|
| `POST` | `/api/billPayment` | createPayment | billPayment.route.js |
| `GET` | `/api/billPayment` | getPayments | billPayment.route.js |
| `GET` | `/api/billPayment/:id` | getPayment | billPayment.route.js |
| `POST` | `/api/billPayment/:id/cancel` | cancelPayment | billPayment.route.js |

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
| `POST` | `/api/billingRate` | createRate | billingRate.route.js |
| `GET` | `/api/billingRate` | getRates | billingRate.route.js |
| `GET` | `/api/billingRate/stats` | getRateStats | billingRate.route.js |
| `GET` | `/api/billingRate/applicable` | getApplicableRate | billingRate.route.js |
| `GET` | `/api/billingRate/:id` | getRate | billingRate.route.js |
| `PUT` | `/api/billingRate/:id` | updateRate | billingRate.route.js |
| `DELETE` | `/api/billingRate/:id` | deleteRate | billingRate.route.js |
| `POST` | `/api/billingRate/standard` | setStandardRate | billingRate.route.js |

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
| `POST` | `/api/brokers` | createBroker | brokers.route.js |
| `GET` | `/api/brokers` | getBrokers | brokers.route.js |
| `GET` | `/api/brokers/:id` | getBroker | brokers.route.js |
| `PATCH` | `/api/brokers/:id` | updateBroker | brokers.route.js |
| `DELETE` | `/api/brokers/:id` | deleteBroker | brokers.route.js |
| `POST` | `/api/brokers/:id/set-default` | setDefaultBroker | brokers.route.js |

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
| `POST` | `/api/captcha/verify-captcha` | verifyCaptcha | captcha.route.js |
| `GET` | `/api/captcha/captcha/providers` | getEnabledProviders | captcha.route.js |
| `GET` | `/api/captcha/captcha/status/:provider` | getProviderStatus | captcha.route.js |

## case

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/case/overview` | unknown | case.route.js |
| `GET` | `/api/case/statistics` | unknown | case.route.js |
| `POST` | `/api/case` | unknown | case.route.js |
| `GET` | `/api/case` | unknown | case.route.js |
| `GET` | `/api/case/pipeline` | unknown | case.route.js |
| `GET` | `/api/case/pipeline/statistics` | unknown | case.route.js |
| `GET` | `/api/case/pipeline/stages/:category` | unknown | case.route.js |
| `GET` | `/api/case/pipeline/grouped` | unknown | case.route.js |
| `GET` | `/api/case/:_id/full` | unknown | case.route.js |
| `GET` | `/api/case/:_id` | unknown | case.route.js |
| `PATCH` | `/api/case/:_id` | unknown | case.route.js |
| `DELETE` | `/api/case/:_id` | unknown | case.route.js |
| `PATCH` | `/api/case/:_id/progress` | unknown | case.route.js |
| `GET` | `/api/case/:_id/notes` | unknown | case.route.js |
| `POST` | `/api/case/:_id/notes` | unknown | case.route.js |
| `POST` | `/api/case/:_id/note` | unknown | case.route.js |
| `PUT` | `/api/case/:_id/notes/:noteId` | unknown | case.route.js |
| `PATCH` | `/api/case/:_id/notes/:noteId` | unknown | case.route.js |
| `DELETE` | `/api/case/:_id/notes/:noteId` | unknown | case.route.js |
| `POST` | `/api/case/:_id/documents/upload-url` | unknown | case.route.js |
| `POST` | `/api/case/:_id/documents/confirm` | unknown | case.route.js |
| `GET` | `/api/case/:_id/documents/:docId/download` | unknown | case.route.js |
| `DELETE` | `/api/case/:_id/documents/:docId` | unknown | case.route.js |
| `POST` | `/api/case/:_id/document` | unknown | case.route.js |
| `DELETE` | `/api/case/:_id/document/:documentId` | unknown | case.route.js |
| `POST` | `/api/case/:_id/hearing` | unknown | case.route.js |
| `PATCH` | `/api/case/:_id/hearings/:hearingId` | unknown | case.route.js |
| `DELETE` | `/api/case/:_id/hearings/:hearingId` | unknown | case.route.js |
| `PATCH` | `/api/case/:_id/hearing/:hearingId` | unknown | case.route.js |
| `DELETE` | `/api/case/:_id/hearing/:hearingId` | unknown | case.route.js |
| `POST` | `/api/case/:_id/timeline` | unknown | case.route.js |
| `PATCH` | `/api/case/:_id/timeline/:eventId` | unknown | case.route.js |
| `DELETE` | `/api/case/:_id/timeline/:eventId` | unknown | case.route.js |
| `POST` | `/api/case/:_id/claim` | unknown | case.route.js |
| `PATCH` | `/api/case/:_id/claims/:claimId` | unknown | case.route.js |
| `DELETE` | `/api/case/:_id/claims/:claimId` | unknown | case.route.js |
| `DELETE` | `/api/case/:_id/claim/:claimId` | unknown | case.route.js |
| `PATCH` | `/api/case/:_id/status` | unknown | case.route.js |
| `PATCH` | `/api/case/:_id/outcome` | unknown | case.route.js |
| `PUT` | `/api/case/:_id/close` | unknown | case.route.js |
| `GET` | `/api/case/:_id/audit` | unknown | case.route.js |
| `POST` | `/api/case/:_id/rich-documents` | unknown | case.route.js |
| `GET` | `/api/case/:_id/rich-documents` | unknown | case.route.js |
| `GET` | `/api/case/:_id/rich-documents/:docId` | unknown | case.route.js |
| `PATCH` | `/api/case/:_id/rich-documents/:docId` | unknown | case.route.js |
| `DELETE` | `/api/case/:_id/rich-documents/:docId` | unknown | case.route.js |
| `GET` | `/api/case/:_id/rich-documents/:docId/versions` | unknown | case.route.js |
| `POST` | `/api/case/:_id/rich-documents/:docId/versions/:versionNumber/restore` | unknown | case.route.js |
| `GET` | `/api/case/:_id/rich-documents/:docId/export/pdf` | unknown | case.route.js |
| `GET` | `/api/case/:_id/rich-documents/:docId/export/latex` | unknown | case.route.js |
| `GET` | `/api/case/:_id/rich-documents/:docId/export/markdown` | unknown | case.route.js |
| `GET` | `/api/case/:_id/rich-documents/:docId/preview` | unknown | case.route.js |
| `PATCH` | `/api/case/:_id/stage` | unknown | case.route.js |
| `PATCH` | `/api/case/:_id/end` | unknown | case.route.js |

## caseNotion

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/caseNotion/notion/cases` | unknown | caseNotion.route.js |
| `GET` | `/api/caseNotion/cases/:caseId/notion/pages` | unknown | caseNotion.route.js |
| `GET` | `/api/caseNotion/cases/:caseId/notion/pages/:pageId` | unknown | caseNotion.route.js |
| `POST` | `/api/caseNotion/cases/:caseId/notion/pages` | unknown | caseNotion.route.js |
| `PATCH` | `/api/caseNotion/cases/:caseId/notion/pages/:pageId` | unknown | caseNotion.route.js |
| `DELETE` | `/api/caseNotion/cases/:caseId/notion/pages/:pageId` | unknown | caseNotion.route.js |
| `POST` | `/api/caseNotion/cases/:caseId/notion/pages/:pageId/archive` | unknown | caseNotion.route.js |
| `POST` | `/api/caseNotion/cases/:caseId/notion/pages/:pageId/restore` | unknown | caseNotion.route.js |
| `POST` | `/api/caseNotion/cases/:caseId/notion/pages/:pageId/duplicate` | unknown | caseNotion.route.js |
| `POST` | `/api/caseNotion/cases/:caseId/notion/pages/:pageId/favorite` | unknown | caseNotion.route.js |
| `POST` | `/api/caseNotion/cases/:caseId/notion/pages/:pageId/pin` | unknown | caseNotion.route.js |
| `POST` | `/api/caseNotion/cases/:caseId/notion/pages/merge` | unknown | caseNotion.route.js |
| `GET` | `/api/caseNotion/cases/:caseId/notion/pages/:pageId/blocks` | unknown | caseNotion.route.js |
| `POST` | `/api/caseNotion/cases/:caseId/notion/pages/:pageId/blocks` | unknown | caseNotion.route.js |
| `PATCH` | `/api/caseNotion/cases/:caseId/notion/blocks/:blockId` | unknown | caseNotion.route.js |
| `DELETE` | `/api/caseNotion/cases/:caseId/notion/blocks/:blockId` | unknown | caseNotion.route.js |
| `POST` | `/api/caseNotion/cases/:caseId/notion/blocks/:blockId/move` | unknown | caseNotion.route.js |
| `POST` | `/api/caseNotion/cases/:caseId/notion/blocks/:blockId/lock` | unknown | caseNotion.route.js |
| `POST` | `/api/caseNotion/cases/:caseId/notion/blocks/:blockId/unlock` | unknown | caseNotion.route.js |
| `POST` | `/api/caseNotion/cases/:caseId/notion/synced-blocks` | unknown | caseNotion.route.js |
| `GET` | `/api/caseNotion/cases/:caseId/notion/synced-blocks/:blockId` | unknown | caseNotion.route.js |
| `POST` | `/api/caseNotion/cases/:caseId/notion/synced-blocks/:blockId/unsync` | unknown | caseNotion.route.js |
| `GET` | `/api/caseNotion/cases/:caseId/notion/blocks/:blockId/comments` | unknown | caseNotion.route.js |
| `POST` | `/api/caseNotion/cases/:caseId/notion/blocks/:blockId/comments` | unknown | caseNotion.route.js |
| `POST` | `/api/caseNotion/cases/:caseId/notion/comments/:commentId/resolve` | unknown | caseNotion.route.js |
| `DELETE` | `/api/caseNotion/cases/:caseId/notion/comments/:commentId` | unknown | caseNotion.route.js |
| `GET` | `/api/caseNotion/cases/:caseId/notion/pages/:pageId/activity` | unknown | caseNotion.route.js |
| `GET` | `/api/caseNotion/cases/:caseId/notion/search` | unknown | caseNotion.route.js |
| `GET` | `/api/caseNotion/cases/:caseId/notion/pages/:pageId/export/pdf` | unknown | caseNotion.route.js |
| `GET` | `/api/caseNotion/cases/:caseId/notion/pages/:pageId/export/markdown` | unknown | caseNotion.route.js |
| `GET` | `/api/caseNotion/cases/:caseId/notion/pages/:pageId/export/html` | unknown | caseNotion.route.js |
| `GET` | `/api/caseNotion/notion/templates` | unknown | caseNotion.route.js |
| `POST` | `/api/caseNotion/cases/:caseId/notion/pages/:pageId/apply-template` | unknown | caseNotion.route.js |
| `POST` | `/api/caseNotion/cases/:caseId/notion/pages/:pageId/save-as-template` | unknown | caseNotion.route.js |
| `POST` | `/api/caseNotion/cases/:caseId/notion/blocks/:blockId/link-task` | unknown | caseNotion.route.js |
| `POST` | `/api/caseNotion/cases/:caseId/notion/blocks/:blockId/unlink-task` | unknown | caseNotion.route.js |
| `POST` | `/api/caseNotion/cases/:caseId/notion/blocks/:blockId/create-task` | unknown | caseNotion.route.js |
| `PATCH` | `/api/caseNotion/cases/:caseId/notion/blocks/:blockId/position` | unknown | caseNotion.route.js |
| `PATCH` | `/api/caseNotion/cases/:caseId/notion/blocks/:blockId/size` | unknown | caseNotion.route.js |
| `PATCH` | `/api/caseNotion/cases/:caseId/notion/blocks/:blockId/color` | unknown | caseNotion.route.js |
| `PATCH` | `/api/caseNotion/cases/:caseId/notion/blocks/:blockId/priority` | unknown | caseNotion.route.js |
| `POST` | `/api/caseNotion/cases/:caseId/notion/blocks/:blockId/link-event` | unknown | caseNotion.route.js |
| `POST` | `/api/caseNotion/cases/:caseId/notion/blocks/:blockId/link-hearing` | unknown | caseNotion.route.js |
| `POST` | `/api/caseNotion/cases/:caseId/notion/blocks/:blockId/link-document` | unknown | caseNotion.route.js |
| `DELETE` | `/api/caseNotion/cases/:caseId/notion/blocks/:blockId/unlink` | unknown | caseNotion.route.js |
| `GET` | `/api/caseNotion/cases/:caseId/notion/pages/:pageId/connections` | unknown | caseNotion.route.js |
| `POST` | `/api/caseNotion/cases/:caseId/notion/pages/:pageId/connections` | unknown | caseNotion.route.js |
| `PATCH` | `/api/caseNotion/cases/:caseId/notion/connections/:connectionId` | unknown | caseNotion.route.js |
| `DELETE` | `/api/caseNotion/cases/:caseId/notion/connections/:connectionId` | unknown | caseNotion.route.js |
| `PATCH` | `/api/caseNotion/cases/:caseId/notion/pages/:pageId/view-mode` | unknown | caseNotion.route.js |
| `PATCH` | `/api/caseNotion/cases/:caseId/notion/pages/:pageId/whiteboard-config` | unknown | caseNotion.route.js |
| `POST` | `/api/caseNotion/cases/:caseId/notion/pages/:pageId/shapes` | unknown | caseNotion.route.js |
| `POST` | `/api/caseNotion/cases/:caseId/notion/pages/:pageId/arrows` | unknown | caseNotion.route.js |
| `POST` | `/api/caseNotion/cases/:caseId/notion/pages/:pageId/frames` | unknown | caseNotion.route.js |
| `PATCH` | `/api/caseNotion/cases/:caseId/notion/blocks/:blockId/z-index` | unknown | caseNotion.route.js |
| `PATCH` | `/api/caseNotion/cases/:caseId/notion/pages/:pageId/batch-update` | unknown | caseNotion.route.js |
| `GET` | `/api/caseNotion/cases/:caseId/notion/blocks/:blockId/connections` | unknown | caseNotion.route.js |
| `PATCH` | `/api/caseNotion/cases/:caseId/notion/blocks/:blockId/rotation` | unknown | caseNotion.route.js |
| `PATCH` | `/api/caseNotion/cases/:caseId/notion/blocks/:blockId/opacity` | unknown | caseNotion.route.js |
| `PATCH` | `/api/caseNotion/cases/:caseId/notion/blocks/:blockId/style` | unknown | caseNotion.route.js |
| `POST` | `/api/caseNotion/cases/:caseId/notion/frames/:frameId/children` | unknown | caseNotion.route.js |
| `DELETE` | `/api/caseNotion/cases/:caseId/notion/frames/:frameId/children/:elementId` | unknown | caseNotion.route.js |
| `GET` | `/api/caseNotion/cases/:caseId/notion/frames/:frameId/children` | unknown | caseNotion.route.js |
| `POST` | `/api/caseNotion/cases/:caseId/notion/frames/:frameId/auto-detect` | unknown | caseNotion.route.js |
| `PATCH` | `/api/caseNotion/cases/:caseId/notion/frames/:frameId/move` | unknown | caseNotion.route.js |
| `POST` | `/api/caseNotion/cases/:caseId/notion/pages/:pageId/undo` | unknown | caseNotion.route.js |
| `POST` | `/api/caseNotion/cases/:caseId/notion/pages/:pageId/redo` | unknown | caseNotion.route.js |
| `GET` | `/api/caseNotion/cases/:caseId/notion/pages/:pageId/history-status` | unknown | caseNotion.route.js |
| `POST` | `/api/caseNotion/cases/:caseId/notion/pages/:pageId/duplicate` | unknown | caseNotion.route.js |
| `DELETE` | `/api/caseNotion/cases/:caseId/notion/pages/:pageId/bulk-delete` | unknown | caseNotion.route.js |
| `POST` | `/api/caseNotion/cases/:caseId/notion/pages/:pageId/group` | unknown | caseNotion.route.js |
| `POST` | `/api/caseNotion/cases/:caseId/notion/pages/:pageId/ungroup` | unknown | caseNotion.route.js |
| `POST` | `/api/caseNotion/cases/:caseId/notion/pages/:pageId/align` | unknown | caseNotion.route.js |
| `POST` | `/api/caseNotion/cases/:caseId/notion/pages/:pageId/distribute` | unknown | caseNotion.route.js |

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
| `POST` | `/api/client` | unknown | client.route.js |
| `GET` | `/api/client` | unknown | client.route.js |
| `GET` | `/api/client/search` | unknown | client.route.js |
| `GET` | `/api/client/stats` | unknown | client.route.js |
| `GET` | `/api/client/top-revenue` | unknown | client.route.js |
| `GET` | `/api/client/:id/full` | unknown | client.route.js |
| `GET` | `/api/client/:id` | unknown | client.route.js |
| `PUT` | `/api/client/:id` | unknown | client.route.js |
| `DELETE` | `/api/client/:id` | unknown | client.route.js |
| `GET` | `/api/client/:id/billing-info` | unknown | client.route.js |
| `GET` | `/api/client/:id/cases` | unknown | client.route.js |
| `GET` | `/api/client/:id/invoices` | unknown | client.route.js |
| `GET` | `/api/client/:id/payments` | unknown | client.route.js |
| `POST` | `/api/client/:id/verify/wathq` | unknown | client.route.js |
| `GET` | `/api/client/:id/wathq/:dataType` | unknown | client.route.js |
| `POST` | `/api/client/:id/verify/absher` | unknown | client.route.js |
| `POST` | `/api/client/:id/verify/address` | unknown | client.route.js |
| `POST` | `/api/client/:id/attachments` | unknown | client.route.js |
| `DELETE` | `/api/client/:id/attachments/:attachmentId` | unknown | client.route.js |
| `POST` | `/api/client/:id/conflict-check` | unknown | client.route.js |
| `PATCH` | `/api/client/:id/status` | unknown | client.route.js |
| `PATCH` | `/api/client/:id/flags` | unknown | client.route.js |
| `DELETE` | `/api/client/bulk` | unknown | client.route.js |

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
| `GET` | `/api/compensationReward/stats` | unknown | compensationReward.route.js |
| `GET` | `/api/compensationReward/pending-reviews` | unknown | compensationReward.route.js |
| `GET` | `/api/compensationReward/department-summary` | unknown | compensationReward.route.js |
| `GET` | `/api/compensationReward/export` | unknown | compensationReward.route.js |
| `GET` | `/api/compensationReward/pay-grade-analysis/:payGrade` | unknown | compensationReward.route.js |
| `GET` | `/api/compensationReward/employee/:employeeId` | unknown | compensationReward.route.js |
| `GET` | `/api/compensationReward` | unknown | compensationReward.route.js |
| `POST` | `/api/compensationReward` | unknown | compensationReward.route.js |
| `POST` | `/api/compensationReward/bulk-delete` | unknown | compensationReward.route.js |
| `GET` | `/api/compensationReward/:id` | unknown | compensationReward.route.js |
| `PATCH` | `/api/compensationReward/:id` | unknown | compensationReward.route.js |
| `PUT` | `/api/compensationReward/:id` | unknown | compensationReward.route.js |
| `DELETE` | `/api/compensationReward/:id` | unknown | compensationReward.route.js |
| `POST` | `/api/compensationReward/:id/salary-increase` | unknown | compensationReward.route.js |
| `POST` | `/api/compensationReward/:id/allowances` | unknown | compensationReward.route.js |
| `PATCH` | `/api/compensationReward/:id/allowances/:allowanceId` | unknown | compensationReward.route.js |
| `PUT` | `/api/compensationReward/:id/allowances/:allowanceId` | unknown | compensationReward.route.js |
| `DELETE` | `/api/compensationReward/:id/allowances/:allowanceId` | unknown | compensationReward.route.js |
| `POST` | `/api/compensationReward/:id/bonus` | unknown | compensationReward.route.js |
| `POST` | `/api/compensationReward/:id/submit-review` | unknown | compensationReward.route.js |
| `POST` | `/api/compensationReward/:id/approve-review` | unknown | compensationReward.route.js |
| `POST` | `/api/compensationReward/:id/decline-review` | unknown | compensationReward.route.js |
| `POST` | `/api/compensationReward/:id/recognition` | unknown | compensationReward.route.js |
| `POST` | `/api/compensationReward/:id/total-rewards-statement` | unknown | compensationReward.route.js |

## competitor

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/competitor` | unknown | competitor.route.js |
| `GET` | `/api/competitor/top-losses` | unknown | competitor.route.js |
| `GET` | `/api/competitor/:id` | unknown | competitor.route.js |
| `POST` | `/api/competitor` | unknown | competitor.route.js |
| `PUT` | `/api/competitor/:id` | unknown | competitor.route.js |
| `DELETE` | `/api/competitor/:id` | unknown | competitor.route.js |

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
| `GET` | `/api/complianceDashboard/dashboard` | unknown | complianceDashboard.route.js |
| `GET` | `/api/complianceDashboard/gosi` | unknown | complianceDashboard.route.js |
| `GET` | `/api/complianceDashboard/nitaqat` | unknown | complianceDashboard.route.js |
| `GET` | `/api/complianceDashboard/wps` | unknown | complianceDashboard.route.js |
| `GET` | `/api/complianceDashboard/documents/expiring` | unknown | complianceDashboard.route.js |
| `GET` | `/api/complianceDashboard/probation/ending` | unknown | complianceDashboard.route.js |
| `GET` | `/api/complianceDashboard/contracts/expiring` | unknown | complianceDashboard.route.js |
| `GET` | `/api/complianceDashboard/labor-law` | unknown | complianceDashboard.route.js |

## conflictCheck

| Method | Path | Controller | File |
|--------|------|------------|------|
| `POST` | `/api/conflictCheck/quick` | quickConflictCheck | conflictCheck.route.js |
| `GET` | `/api/conflictCheck/stats` | getConflictStats | conflictCheck.route.js |
| `GET` | `/api/conflictCheck` | getConflictChecks | conflictCheck.route.js |
| `POST` | `/api/conflictCheck` | runConflictCheck | conflictCheck.route.js |
| `GET` | `/api/conflictCheck/:id` | getConflictCheck | conflictCheck.route.js |
| `PATCH` | `/api/conflictCheck/:id` | updateConflictCheck | conflictCheck.route.js |
| `DELETE` | `/api/conflictCheck/:id` | deleteConflictCheck | conflictCheck.route.js |
| `POST` | `/api/conflictCheck/:id/matches/:matchIndex/resolve` | resolveMatch | conflictCheck.route.js |

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
| `GET` | `/api/consolidatedReports/profit-loss` | unknown | consolidatedReports.route.js |
| `GET` | `/api/consolidatedReports/balance-sheet` | unknown | consolidatedReports.route.js |
| `GET` | `/api/consolidatedReports/cash-flow` | unknown | consolidatedReports.route.js |
| `GET` | `/api/consolidatedReports/comparison` | unknown | consolidatedReports.route.js |
| `GET` | `/api/consolidatedReports/eliminations` | unknown | consolidatedReports.route.js |
| `POST` | `/api/consolidatedReports/eliminations` | unknown | consolidatedReports.route.js |
| `GET` | `/api/consolidatedReports/auto-eliminations` | unknown | consolidatedReports.route.js |
| `GET` | `/api/consolidatedReports/full-statement` | unknown | consolidatedReports.route.js |

## contact

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/contact/search` | searchContacts | contact.route.js |
| `GET` | `/api/contact/case/:caseId` | getContactsByCase | contact.route.js |
| `GET` | `/api/contact/client/:clientId` | getContactsByClient | contact.route.js |
| `DELETE` | `/api/contact/bulk` | bulkDeleteContacts | contact.route.js |
| `POST` | `/api/contact/bulk-delete` | unknown | contact.route.js |
| `GET` | `/api/contact` | getContacts | contact.route.js |
| `POST` | `/api/contact` | createContact | contact.route.js |
| `GET` | `/api/contact/:id` | getContact | contact.route.js |
| `PUT` | `/api/contact/:id` | updateContact | contact.route.js |
| `PATCH` | `/api/contact/:id` | unknown | contact.route.js |
| `DELETE` | `/api/contact/:id` | deleteContact | contact.route.js |
| `POST` | `/api/contact/:id/link-case` | linkToCase | contact.route.js |
| `DELETE` | `/api/contact/:id/unlink-case/:caseId` | unlinkFromCase | contact.route.js |
| `POST` | `/api/contact/:id/unlink-case` | unknown | contact.route.js |
| `POST` | `/api/contact/:id/link-client` | linkToClient | contact.route.js |
| `DELETE` | `/api/contact/:id/unlink-client/:clientId` | unlinkFromClient | contact.route.js |
| `POST` | `/api/contact/:id/unlink-client` | unknown | contact.route.js |

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
| `GET` | `/api/conversation` | getConversations | conversation.route.js |
| `POST` | `/api/conversation` | createConversation | conversation.route.js |
| `GET` | `/api/conversation/single/:sellerID/:buyerID` | getSingleConversation | conversation.route.js |
| `PATCH` | `/api/conversation/:conversationID` | updateConversation | conversation.route.js |

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
| `GET` | `/api/corporateCard` | getCorporateCards | corporateCard.route.js |
| `GET` | `/api/corporateCard/summary` | getSummary | corporateCard.route.js |
| `GET` | `/api/corporateCard/spending-stats` | getSpendingStats | corporateCard.route.js |
| `GET` | `/api/corporateCard/:id` | getCorporateCard | corporateCard.route.js |
| `GET` | `/api/corporateCard/:id/transactions` | getTransactions | corporateCard.route.js |
| `GET` | `/api/corporateCard/:id/transactions/unmatched` | getUnmatchedTransactions | corporateCard.route.js |
| `POST` | `/api/corporateCard` | createCorporateCard | corporateCard.route.js |
| `PUT` | `/api/corporateCard/:id` | updateCorporateCard | corporateCard.route.js |
| `POST` | `/api/corporateCard/:id/block` | blockCard | corporateCard.route.js |
| `POST` | `/api/corporateCard/:id/unblock` | unblockCard | corporateCard.route.js |
| `POST` | `/api/corporateCard/:id/transactions/import` | importTransactions | corporateCard.route.js |
| `POST` | `/api/corporateCard/:id/transactions/:transactionId/reconcile` | reconcileTransaction | corporateCard.route.js |
| `POST` | `/api/corporateCard/:id/transactions/:transactionId/dispute` | disputeTransaction | corporateCard.route.js |
| `POST` | `/api/corporateCard/:id/transactions/:transactionId/categorize` | categorizeTransaction | corporateCard.route.js |
| `DELETE` | `/api/corporateCard/:id` | deleteCorporateCard | corporateCard.route.js |

## creditNote

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/creditNote` | getCreditNotes | creditNote.route.js |
| `GET` | `/api/creditNote/stats` | getCreditNoteStats | creditNote.route.js |
| `GET` | `/api/creditNote/invoice/:invoiceId` | getCreditNotesForInvoice | creditNote.route.js |
| `GET` | `/api/creditNote/:id` | getCreditNote | creditNote.route.js |
| `POST` | `/api/creditNote` | createCreditNote | creditNote.route.js |
| `PUT` | `/api/creditNote/:id` | updateCreditNote | creditNote.route.js |
| `POST` | `/api/creditNote/:id/issue` | issueCreditNote | creditNote.route.js |
| `POST` | `/api/creditNote/:id/apply` | applyCreditNote | creditNote.route.js |
| `POST` | `/api/creditNote/:id/void` | voidCreditNote | creditNote.route.js |
| `DELETE` | `/api/creditNote/:id` | deleteCreditNote | creditNote.route.js |

## crmActivity

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/crmActivity/timeline` | unknown | crmActivity.route.js |
| `GET` | `/api/crmActivity/stats` | unknown | crmActivity.route.js |
| `GET` | `/api/crmActivity/tasks/upcoming` | unknown | crmActivity.route.js |
| `POST` | `/api/crmActivity/log/call` | unknown | crmActivity.route.js |
| `POST` | `/api/crmActivity/log/email` | unknown | crmActivity.route.js |
| `POST` | `/api/crmActivity/log/meeting` | unknown | crmActivity.route.js |
| `POST` | `/api/crmActivity/log/note` | unknown | crmActivity.route.js |
| `GET` | `/api/crmActivity/entity/:entityType/:entityId` | unknown | crmActivity.route.js |
| `POST` | `/api/crmActivity` | unknown | crmActivity.route.js |
| `GET` | `/api/crmActivity` | unknown | crmActivity.route.js |
| `GET` | `/api/crmActivity/:id` | unknown | crmActivity.route.js |
| `PUT` | `/api/crmActivity/:id` | unknown | crmActivity.route.js |
| `DELETE` | `/api/crmActivity/:id` | unknown | crmActivity.route.js |
| `POST` | `/api/crmActivity/:id/complete` | unknown | crmActivity.route.js |

## crmPipeline

| Method | Path | Controller | File |
|--------|------|------------|------|
| `POST` | `/api/crmPipeline` | unknown | crmPipeline.route.js |
| `GET` | `/api/crmPipeline` | unknown | crmPipeline.route.js |
| `GET` | `/api/crmPipeline/:id` | unknown | crmPipeline.route.js |
| `PUT` | `/api/crmPipeline/:id` | unknown | crmPipeline.route.js |
| `DELETE` | `/api/crmPipeline/:id` | unknown | crmPipeline.route.js |
| `POST` | `/api/crmPipeline/:id/stages` | unknown | crmPipeline.route.js |
| `PUT` | `/api/crmPipeline/:id/stages/:stageId` | unknown | crmPipeline.route.js |
| `DELETE` | `/api/crmPipeline/:id/stages/:stageId` | unknown | crmPipeline.route.js |
| `POST` | `/api/crmPipeline/:id/stages/reorder` | unknown | crmPipeline.route.js |
| `GET` | `/api/crmPipeline/:id/stats` | unknown | crmPipeline.route.js |
| `POST` | `/api/crmPipeline/:id/default` | unknown | crmPipeline.route.js |
| `POST` | `/api/crmPipeline/:id/duplicate` | unknown | crmPipeline.route.js |

## crmReports

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/crmReports/quick-stats` | unknown | crmReports.route.js |
| `GET` | `/api/crmReports/recent-activity` | unknown | crmReports.route.js |
| `GET` | `/api/crmReports/funnel/overview` | unknown | crmReports.route.js |
| `GET` | `/api/crmReports/funnel/velocity` | unknown | crmReports.route.js |
| `GET` | `/api/crmReports/funnel/bottlenecks` | unknown | crmReports.route.js |
| `GET` | `/api/crmReports/aging/overview` | unknown | crmReports.route.js |
| `GET` | `/api/crmReports/aging/by-stage` | unknown | crmReports.route.js |
| `GET` | `/api/crmReports/leads-source/overview` | unknown | crmReports.route.js |
| `GET` | `/api/crmReports/leads-source/trend` | unknown | crmReports.route.js |
| `GET` | `/api/crmReports/win-loss/overview` | unknown | crmReports.route.js |
| `GET` | `/api/crmReports/win-loss/reasons` | unknown | crmReports.route.js |
| `GET` | `/api/crmReports/win-loss/trend` | unknown | crmReports.route.js |
| `GET` | `/api/crmReports/activity/overview` | unknown | crmReports.route.js |
| `GET` | `/api/crmReports/activity/by-day-of-week` | unknown | crmReports.route.js |
| `GET` | `/api/crmReports/activity/by-hour` | unknown | crmReports.route.js |
| `GET` | `/api/crmReports/activity/leaderboard` | unknown | crmReports.route.js |
| `GET` | `/api/crmReports/forecast/overview` | unknown | crmReports.route.js |
| `GET` | `/api/crmReports/forecast/by-month` | unknown | crmReports.route.js |
| `GET` | `/api/crmReports/forecast/by-rep` | unknown | crmReports.route.js |
| `POST` | `/api/crmReports/export` | unknown | crmReports.route.js |
| `GET` | `/api/crmReports/campaign-efficiency` | unknown | crmReports.route.js |
| `GET` | `/api/crmReports/lead-owner-efficiency` | unknown | crmReports.route.js |
| `GET` | `/api/crmReports/first-response-time` | unknown | crmReports.route.js |
| `GET` | `/api/crmReports/lost-opportunity` | unknown | crmReports.route.js |
| `GET` | `/api/crmReports/sales-pipeline` | unknown | crmReports.route.js |
| `GET` | `/api/crmReports/prospects-engaged` | unknown | crmReports.route.js |
| `GET` | `/api/crmReports/lead-conversion-time` | unknown | crmReports.route.js |

## crmSettings

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/crmSettings` | unknown | crmSettings.route.js |
| `PUT` | `/api/crmSettings` | unknown | crmSettings.route.js |
| `POST` | `/api/crmSettings/reset` | unknown | crmSettings.route.js |

## crmTransaction

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/crmTransaction` | getTransactions | crmTransaction.route.js |
| `GET` | `/api/crmTransaction/summary` | getSummary | crmTransaction.route.js |
| `GET` | `/api/crmTransaction/daily-report` | getDailyReport | crmTransaction.route.js |
| `GET` | `/api/crmTransaction/export` | exportTransactions | crmTransaction.route.js |
| `GET` | `/api/crmTransaction/entity/:entityType/:entityId` | getEntityTimeline | crmTransaction.route.js |
| `GET` | `/api/crmTransaction/user-activity/:userId` | getUserActivity | crmTransaction.route.js |
| `GET` | `/api/crmTransaction/stale-leads` | getStaleLeads | crmTransaction.route.js |
| `GET` | `/api/crmTransaction/stale-leads/summary` | getStaleSummary | crmTransaction.route.js |
| `GET` | `/api/crmTransaction/stale-leads/by-stage` | getStalenessbyStage | crmTransaction.route.js |
| `GET` | `/api/crmTransaction/leads-needing-attention` | getLeadsNeedingAttention | crmTransaction.route.js |
| `GET` | `/api/crmTransaction/revenue-forecast` | getRevenueForecast | crmTransaction.route.js |
| `GET` | `/api/crmTransaction/revenue-forecast/by-period` | getForecastByPeriod | crmTransaction.route.js |
| `GET` | `/api/crmTransaction/pipeline-velocity` | getPipelineVelocity | crmTransaction.route.js |
| `GET` | `/api/crmTransaction/forecast-trends` | getForecastTrends | crmTransaction.route.js |
| `GET` | `/api/crmTransaction/forecast-by-category` | getForecastByCategory | crmTransaction.route.js |

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
| `POST` | `/api/dataExport/export` | createExportJob | dataExport.route.js |
| `GET` | `/api/dataExport/jobs` | getExportJobs | dataExport.route.js |
| `GET` | `/api/dataExport/jobs/:id` | getExportJobStatus | dataExport.route.js |
| `GET` | `/api/dataExport/jobs/:id/download` | downloadExportFile | dataExport.route.js |
| `POST` | `/api/dataExport/jobs/:id/cancel` | cancelExportJob | dataExport.route.js |
| `DELETE` | `/api/dataExport/jobs/:id` | deleteExportJob | dataExport.route.js |
| `POST` | `/api/dataExport/import` | createImportJob | dataExport.route.js |
| `GET` | `/api/dataExport/imports` | getImportJobs | dataExport.route.js |
| `GET` | `/api/dataExport/import/:id` | getImportJobStatus | dataExport.route.js |
| `POST` | `/api/dataExport/import/:id/start` | startImportJob | dataExport.route.js |
| `POST` | `/api/dataExport/import/:id/validate` | validateImportFile | dataExport.route.js |
| `POST` | `/api/dataExport/import/:id/cancel` | cancelImportJob | dataExport.route.js |
| `GET` | `/api/dataExport/templates` | getExportTemplates | dataExport.route.js |
| `POST` | `/api/dataExport/templates` | createExportTemplate | dataExport.route.js |
| `PATCH` | `/api/dataExport/templates/:id` | updateExportTemplate | dataExport.route.js |
| `DELETE` | `/api/dataExport/templates/:id` | deleteExportTemplate | dataExport.route.js |
| `GET` | `/api/dataExport/entity/:entityType` | exportEntity | dataExport.route.js |
| `GET` | `/api/dataExport/report/:reportType` | exportReport | dataExport.route.js |

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
| `GET` | `/api/debitNote` | getDebitNotes | debitNote.route.js |
| `GET` | `/api/debitNote/pending-approvals` | getPendingApprovals | debitNote.route.js |
| `GET` | `/api/debitNote/bill/:billId` | getDebitNotesForBill | debitNote.route.js |
| `GET` | `/api/debitNote/:id` | getDebitNote | debitNote.route.js |
| `POST` | `/api/debitNote` | createDebitNote | debitNote.route.js |
| `PUT` | `/api/debitNote/:id` | updateDebitNote | debitNote.route.js |
| `POST` | `/api/debitNote/:id/submit` | submitDebitNote | debitNote.route.js |
| `POST` | `/api/debitNote/:id/approve` | approveDebitNote | debitNote.route.js |
| `POST` | `/api/debitNote/:id/reject` | rejectDebitNote | debitNote.route.js |
| `POST` | `/api/debitNote/:id/apply` | applyDebitNote | debitNote.route.js |
| `POST` | `/api/debitNote/:id/cancel` | cancelDebitNote | debitNote.route.js |
| `DELETE` | `/api/debitNote/:id` | deleteDebitNote | debitNote.route.js |

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
| `POST` | `/api/dispute` | createDispute | dispute.route.js |
| `GET` | `/api/dispute` | getDisputes | dispute.route.js |
| `GET` | `/api/dispute/stats` | getDisputeStats | dispute.route.js |
| `GET` | `/api/dispute/by-type` | getDisputesByType | dispute.route.js |
| `GET` | `/api/dispute/:id` | getDisputeById | dispute.route.js |
| `POST` | `/api/dispute/:id/respond` | lawyerRespond | dispute.route.js |
| `POST` | `/api/dispute/:id/escalate` | escalateDispute | dispute.route.js |
| `POST` | `/api/dispute/:id/resolve` | resolveDispute | dispute.route.js |
| `POST` | `/api/dispute/:id/evidence` | addEvidence | dispute.route.js |
| `POST` | `/api/dispute/:id/mediator-note` | addMediatorNote | dispute.route.js |

## document

| Method | Path | Controller | File |
|--------|------|------------|------|
| `POST` | `/api/document/upload` | getUploadUrl | document.route.js |
| `POST` | `/api/document/confirm` | confirmUpload | document.route.js |
| `GET` | `/api/document/search` | searchDocuments | document.route.js |
| `GET` | `/api/document/stats` | getDocumentStats | document.route.js |
| `GET` | `/api/document/recent` | getRecentDocuments | document.route.js |
| `GET` | `/api/document/case/:caseId` | getDocumentsByCase | document.route.js |
| `GET` | `/api/document/client/:clientId` | getDocumentsByClient | document.route.js |
| `POST` | `/api/document/bulk-delete` | bulkDeleteDocuments | document.route.js |
| `GET` | `/api/document` | getDocuments | document.route.js |
| `GET` | `/api/document/:id` | getDocument | document.route.js |
| `PATCH` | `/api/document/:id` | updateDocument | document.route.js |
| `DELETE` | `/api/document/:id` | deleteDocument | document.route.js |
| `GET` | `/api/document/:id/download` | downloadDocument | document.route.js |
| `GET` | `/api/document/:id/versions` | getVersionHistory | document.route.js |
| `POST` | `/api/document/:id/versions` | uploadVersion | document.route.js |
| `POST` | `/api/document/:id/versions/:versionId/restore` | restoreVersion | document.route.js |
| `POST` | `/api/document/:id/share` | generateShareLink | document.route.js |
| `POST` | `/api/document/:id/revoke-share` | revokeShareLink | document.route.js |
| `POST` | `/api/document/:id/move` | moveDocument | document.route.js |

## documentAnalysis

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/documentAnalysis/stats` | getStats | documentAnalysis.route.js |
| `GET` | `/api/documentAnalysis/search` | semanticSearch | documentAnalysis.route.js |
| `POST` | `/api/documentAnalysis/batch` | batchAnalyze | documentAnalysis.route.js |
| `POST` | `/api/documentAnalysis/:documentId` | analyzeDocument | documentAnalysis.route.js |
| `GET` | `/api/documentAnalysis/:documentId` | getAnalysis | documentAnalysis.route.js |
| `DELETE` | `/api/documentAnalysis/:documentId` | deleteAnalysis | documentAnalysis.route.js |
| `POST` | `/api/documentAnalysis/:documentId/reanalyze` | reanalyzeDocument | documentAnalysis.route.js |
| `GET` | `/api/documentAnalysis/:documentId/status` | getAnalysisStatus | documentAnalysis.route.js |
| `GET` | `/api/documentAnalysis/:documentId/history` | getAnalysisHistory | documentAnalysis.route.js |
| `GET` | `/api/documentAnalysis/:documentId/similar` | findSimilar | documentAnalysis.route.js |
| `GET` | `/api/documentAnalysis/:documentId/report` | generateReport | documentAnalysis.route.js |

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
| `POST` | `/api/emailMarketing/campaigns` | unknown | emailMarketing.route.js |
| `GET` | `/api/emailMarketing/campaigns` | unknown | emailMarketing.route.js |
| `GET` | `/api/emailMarketing/campaigns/:id` | unknown | emailMarketing.route.js |
| `PUT` | `/api/emailMarketing/campaigns/:id` | unknown | emailMarketing.route.js |
| `DELETE` | `/api/emailMarketing/campaigns/:id` | unknown | emailMarketing.route.js |
| `POST` | `/api/emailMarketing/campaigns/:id/duplicate` | unknown | emailMarketing.route.js |
| `POST` | `/api/emailMarketing/campaigns/:id/schedule` | unknown | emailMarketing.route.js |
| `POST` | `/api/emailMarketing/campaigns/:id/send` | unknown | emailMarketing.route.js |
| `POST` | `/api/emailMarketing/campaigns/:id/pause` | unknown | emailMarketing.route.js |
| `POST` | `/api/emailMarketing/campaigns/:id/resume` | unknown | emailMarketing.route.js |
| `POST` | `/api/emailMarketing/campaigns/:id/cancel` | unknown | emailMarketing.route.js |
| `POST` | `/api/emailMarketing/campaigns/:id/test` | unknown | emailMarketing.route.js |
| `GET` | `/api/emailMarketing/campaigns/:id/analytics` | unknown | emailMarketing.route.js |
| `POST` | `/api/emailMarketing/templates` | unknown | emailMarketing.route.js |
| `GET` | `/api/emailMarketing/templates` | unknown | emailMarketing.route.js |
| `GET` | `/api/emailMarketing/templates/public` | unknown | emailMarketing.route.js |
| `GET` | `/api/emailMarketing/templates/:id` | unknown | emailMarketing.route.js |
| `PUT` | `/api/emailMarketing/templates/:id` | unknown | emailMarketing.route.js |
| `DELETE` | `/api/emailMarketing/templates/:id` | unknown | emailMarketing.route.js |
| `POST` | `/api/emailMarketing/templates/:id/preview` | unknown | emailMarketing.route.js |
| `POST` | `/api/emailMarketing/subscribers` | unknown | emailMarketing.route.js |
| `GET` | `/api/emailMarketing/subscribers` | unknown | emailMarketing.route.js |
| `PUT` | `/api/emailMarketing/subscribers/:id` | unknown | emailMarketing.route.js |
| `DELETE` | `/api/emailMarketing/subscribers/:id` | unknown | emailMarketing.route.js |
| `POST` | `/api/emailMarketing/subscribers/import` | unknown | emailMarketing.route.js |
| `POST` | `/api/emailMarketing/subscribers/export` | unknown | emailMarketing.route.js |
| `POST` | `/api/emailMarketing/subscribers/:id/unsubscribe` | unknown | emailMarketing.route.js |
| `POST` | `/api/emailMarketing/segments` | unknown | emailMarketing.route.js |
| `GET` | `/api/emailMarketing/segments` | unknown | emailMarketing.route.js |
| `GET` | `/api/emailMarketing/segments/:id` | unknown | emailMarketing.route.js |
| `PUT` | `/api/emailMarketing/segments/:id` | unknown | emailMarketing.route.js |
| `DELETE` | `/api/emailMarketing/segments/:id` | unknown | emailMarketing.route.js |
| `GET` | `/api/emailMarketing/segments/:id/subscribers` | unknown | emailMarketing.route.js |
| `POST` | `/api/emailMarketing/segments/:id/refresh` | unknown | emailMarketing.route.js |
| `GET` | `/api/emailMarketing/analytics/overview` | unknown | emailMarketing.route.js |
| `GET` | `/api/emailMarketing/analytics/trends` | unknown | emailMarketing.route.js |
| `POST` | `/api/emailMarketing/webhooks/email/resend` | unknown | emailMarketing.route.js |
| `GET` | `/api/emailMarketing/webhooks/email/track/open/:trackingId` | unknown | emailMarketing.route.js |
| `GET` | `/api/emailMarketing/webhooks/email/unsubscribe/:email` | unknown | emailMarketing.route.js |

## emailSettings

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/emailSettings/smtp` | getSmtpConfig | emailSettings.route.js |
| `PUT` | `/api/emailSettings/smtp` | saveSmtpConfig | emailSettings.route.js |
| `POST` | `/api/emailSettings/smtp/test` | testSmtpConnection | emailSettings.route.js |
| `GET` | `/api/emailSettings/templates` | getTemplates | emailSettings.route.js |
| `GET` | `/api/emailSettings/templates/:id` | getTemplate | emailSettings.route.js |
| `POST` | `/api/emailSettings/templates` | createTemplate | emailSettings.route.js |
| `PUT` | `/api/emailSettings/templates/:id` | updateTemplate | emailSettings.route.js |
| `DELETE` | `/api/emailSettings/templates/:id` | deleteTemplate | emailSettings.route.js |
| `POST` | `/api/emailSettings/templates/:id/preview` | previewTemplate | emailSettings.route.js |
| `GET` | `/api/emailSettings/signatures` | getSignatures | emailSettings.route.js |
| `POST` | `/api/emailSettings/signatures` | createSignature | emailSettings.route.js |
| `PUT` | `/api/emailSettings/signatures/:id` | updateSignature | emailSettings.route.js |
| `DELETE` | `/api/emailSettings/signatures/:id` | deleteSignature | emailSettings.route.js |
| `PUT` | `/api/emailSettings/signatures/:id/default` | setDefaultSignature | emailSettings.route.js |

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
| `GET` | `/api/employeeAdvance/stats` | unknown | employeeAdvance.route.js |
| `GET` | `/api/employeeAdvance/pending-approvals` | unknown | employeeAdvance.route.js |
| `GET` | `/api/employeeAdvance/overdue-recoveries` | unknown | employeeAdvance.route.js |
| `GET` | `/api/employeeAdvance/emergency` | unknown | employeeAdvance.route.js |
| `POST` | `/api/employeeAdvance/check-eligibility` | unknown | employeeAdvance.route.js |
| `POST` | `/api/employeeAdvance/bulk-delete` | unknown | employeeAdvance.route.js |
| `GET` | `/api/employeeAdvance/by-employee/:employeeId` | unknown | employeeAdvance.route.js |
| `GET` | `/api/employeeAdvance` | unknown | employeeAdvance.route.js |
| `POST` | `/api/employeeAdvance` | unknown | employeeAdvance.route.js |
| `GET` | `/api/employeeAdvance/:advanceId` | unknown | employeeAdvance.route.js |
| `PATCH` | `/api/employeeAdvance/:advanceId` | unknown | employeeAdvance.route.js |
| `DELETE` | `/api/employeeAdvance/:advanceId` | unknown | employeeAdvance.route.js |
| `POST` | `/api/employeeAdvance/:advanceId/approve` | unknown | employeeAdvance.route.js |
| `POST` | `/api/employeeAdvance/:advanceId/reject` | unknown | employeeAdvance.route.js |
| `POST` | `/api/employeeAdvance/:advanceId/cancel` | unknown | employeeAdvance.route.js |
| `POST` | `/api/employeeAdvance/:advanceId/disburse` | unknown | employeeAdvance.route.js |
| `POST` | `/api/employeeAdvance/:advanceId/recover` | unknown | employeeAdvance.route.js |
| `POST` | `/api/employeeAdvance/:advanceId/payroll-deduction` | unknown | employeeAdvance.route.js |
| `POST` | `/api/employeeAdvance/:advanceId/early-recovery` | unknown | employeeAdvance.route.js |
| `POST` | `/api/employeeAdvance/:advanceId/write-off` | unknown | employeeAdvance.route.js |
| `POST` | `/api/employeeAdvance/:advanceId/issue-clearance` | unknown | employeeAdvance.route.js |
| `POST` | `/api/employeeAdvance/:advanceId/documents` | unknown | employeeAdvance.route.js |
| `POST` | `/api/employeeAdvance/:advanceId/communications` | unknown | employeeAdvance.route.js |

## employeeBenefit

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/employeeBenefit/stats` | unknown | employeeBenefit.route.js |
| `GET` | `/api/employeeBenefit/expiring` | unknown | employeeBenefit.route.js |
| `GET` | `/api/employeeBenefit/cost-summary` | unknown | employeeBenefit.route.js |
| `GET` | `/api/employeeBenefit/export` | unknown | employeeBenefit.route.js |
| `GET` | `/api/employeeBenefit` | unknown | employeeBenefit.route.js |
| `POST` | `/api/employeeBenefit` | unknown | employeeBenefit.route.js |
| `POST` | `/api/employeeBenefit/bulk-delete` | unknown | employeeBenefit.route.js |
| `GET` | `/api/employeeBenefit/employee/:employeeId` | unknown | employeeBenefit.route.js |
| `GET` | `/api/employeeBenefit/:id` | unknown | employeeBenefit.route.js |
| `PATCH` | `/api/employeeBenefit/:id` | unknown | employeeBenefit.route.js |
| `DELETE` | `/api/employeeBenefit/:id` | unknown | employeeBenefit.route.js |
| `POST` | `/api/employeeBenefit/:id/activate` | unknown | employeeBenefit.route.js |
| `POST` | `/api/employeeBenefit/:id/suspend` | unknown | employeeBenefit.route.js |
| `POST` | `/api/employeeBenefit/:id/terminate` | unknown | employeeBenefit.route.js |
| `POST` | `/api/employeeBenefit/:id/dependents` | unknown | employeeBenefit.route.js |
| `DELETE` | `/api/employeeBenefit/:id/dependents/:memberId` | unknown | employeeBenefit.route.js |
| `POST` | `/api/employeeBenefit/:id/beneficiaries` | unknown | employeeBenefit.route.js |
| `PATCH` | `/api/employeeBenefit/:id/beneficiaries/:beneficiaryId` | unknown | employeeBenefit.route.js |
| `DELETE` | `/api/employeeBenefit/:id/beneficiaries/:beneficiaryId` | unknown | employeeBenefit.route.js |
| `POST` | `/api/employeeBenefit/:id/claims` | unknown | employeeBenefit.route.js |
| `PATCH` | `/api/employeeBenefit/:id/claims/:claimId` | unknown | employeeBenefit.route.js |
| `POST` | `/api/employeeBenefit/:id/pre-auth` | unknown | employeeBenefit.route.js |
| `POST` | `/api/employeeBenefit/:id/qualifying-events` | unknown | employeeBenefit.route.js |

## employeeLoan

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/employeeLoan/stats` | unknown | employeeLoan.route.js |
| `GET` | `/api/employeeLoan/pending-approvals` | unknown | employeeLoan.route.js |
| `GET` | `/api/employeeLoan/overdue-installments` | unknown | employeeLoan.route.js |
| `POST` | `/api/employeeLoan/check-eligibility` | unknown | employeeLoan.route.js |
| `POST` | `/api/employeeLoan/bulk-delete` | unknown | employeeLoan.route.js |
| `GET` | `/api/employeeLoan/by-employee/:employeeId` | unknown | employeeLoan.route.js |
| `GET` | `/api/employeeLoan` | unknown | employeeLoan.route.js |
| `POST` | `/api/employeeLoan` | unknown | employeeLoan.route.js |
| `GET` | `/api/employeeLoan/:loanId` | unknown | employeeLoan.route.js |
| `PATCH` | `/api/employeeLoan/:loanId` | unknown | employeeLoan.route.js |
| `DELETE` | `/api/employeeLoan/:loanId` | unknown | employeeLoan.route.js |
| `POST` | `/api/employeeLoan/:loanId/submit` | unknown | employeeLoan.route.js |
| `POST` | `/api/employeeLoan/:loanId/approve` | unknown | employeeLoan.route.js |
| `POST` | `/api/employeeLoan/:loanId/reject` | unknown | employeeLoan.route.js |
| `POST` | `/api/employeeLoan/:loanId/disburse` | unknown | employeeLoan.route.js |
| `POST` | `/api/employeeLoan/:loanId/payments` | unknown | employeeLoan.route.js |
| `POST` | `/api/employeeLoan/:loanId/payroll-deduction` | unknown | employeeLoan.route.js |
| `GET` | `/api/employeeLoan/:loanId/early-settlement-calculation` | unknown | employeeLoan.route.js |
| `POST` | `/api/employeeLoan/:loanId/early-settlement` | unknown | employeeLoan.route.js |
| `POST` | `/api/employeeLoan/:loanId/default` | unknown | employeeLoan.route.js |
| `POST` | `/api/employeeLoan/:loanId/restructure` | unknown | employeeLoan.route.js |
| `POST` | `/api/employeeLoan/:loanId/issue-clearance` | unknown | employeeLoan.route.js |
| `POST` | `/api/employeeLoan/:loanId/documents` | unknown | employeeLoan.route.js |
| `POST` | `/api/employeeLoan/:loanId/communications` | unknown | employeeLoan.route.js |

## employeeSelfService

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/employeeSelfService/dashboard` | unknown | employeeSelfService.route.js |
| `GET` | `/api/employeeSelfService/profile` | unknown | employeeSelfService.route.js |
| `PATCH` | `/api/employeeSelfService/profile` | unknown | employeeSelfService.route.js |
| `GET` | `/api/employeeSelfService/leave/balances` | unknown | employeeSelfService.route.js |
| `GET` | `/api/employeeSelfService/leave/requests` | unknown | employeeSelfService.route.js |
| `POST` | `/api/employeeSelfService/leave/request` | unknown | employeeSelfService.route.js |
| `POST` | `/api/employeeSelfService/leave/request/:requestId/cancel` | unknown | employeeSelfService.route.js |
| `GET` | `/api/employeeSelfService/loans` | unknown | employeeSelfService.route.js |
| `GET` | `/api/employeeSelfService/advances` | unknown | employeeSelfService.route.js |
| `GET` | `/api/employeeSelfService/payslips` | unknown | employeeSelfService.route.js |
| `GET` | `/api/employeeSelfService/approvals/pending` | unknown | employeeSelfService.route.js |

## event

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/event/stats` | getEventStats | event.route.js |
| `GET` | `/api/event/calendar` | getCalendarEvents | event.route.js |
| `GET` | `/api/event/upcoming` | getUpcomingEvents | event.route.js |
| `GET` | `/api/event/month/:year/:month` | getEventsByMonth | event.route.js |
| `GET` | `/api/event/date/:date` | getEventsByDate | event.route.js |
| `POST` | `/api/event/availability` | checkAvailability | event.route.js |
| `POST` | `/api/event/import/ics` | importEventsFromICS | event.route.js |
| `GET` | `/api/event/conflicts` | getConflicts | event.route.js |
| `GET` | `/api/event/search` | searchEvents | event.route.js |
| `GET` | `/api/event/client/:clientId` | getEventsByClient | event.route.js |
| `POST` | `/api/event/bulk` | bulkCreateEvents | event.route.js |
| `PUT` | `/api/event/bulk` | bulkUpdateEvents | event.route.js |
| `DELETE` | `/api/event/bulk` | bulkDeleteEvents | event.route.js |
| `POST` | `/api/event/bulk/complete` | bulkCompleteEvents | event.route.js |
| `POST` | `/api/event/bulk/archive` | bulkArchiveEvents | event.route.js |
| `POST` | `/api/event/bulk/unarchive` | bulkUnarchiveEvents | event.route.js |
| `GET` | `/api/event/ids` | getAllEventIds | event.route.js |
| `GET` | `/api/event/archived` | getArchivedEvents | event.route.js |
| `GET` | `/api/event/export` | exportEvents | event.route.js |
| `PATCH` | `/api/event/reorder` | reorderEvents | event.route.js |
| `GET` | `/api/event/case/:caseId` | getEventsByCase | event.route.js |
| `GET` | `/api/event/location-triggers` | getEventsWithLocationTriggers | event.route.js |
| `POST` | `/api/event/location/check` | bulkCheckLocationTriggers | event.route.js |
| `POST` | `/api/event/parse` | createEventFromNaturalLanguage | event.route.js |
| `POST` | `/api/event/voice` | createEventFromVoice | event.route.js |
| `POST` | `/api/event` | createEvent | event.route.js |
| `GET` | `/api/event` | getEvents | event.route.js |
| `GET` | `/api/event/:id` | getEvent | event.route.js |
| `GET` | `/api/event/:id/export/ics` | exportEventToICS | event.route.js |
| `PUT` | `/api/event/:id` | updateEvent | event.route.js |
| `PATCH` | `/api/event/:id` | updateEvent | event.route.js |
| `DELETE` | `/api/event/:id` | deleteEvent | event.route.js |
| `POST` | `/api/event/:id/complete` | completeEvent | event.route.js |
| `POST` | `/api/event/:id/cancel` | cancelEvent | event.route.js |
| `POST` | `/api/event/:id/postpone` | postponeEvent | event.route.js |
| `POST` | `/api/event/:id/clone` | cloneEvent | event.route.js |
| `POST` | `/api/event/:id/reschedule` | rescheduleEvent | event.route.js |
| `GET` | `/api/event/:id/activity` | getEventActivity | event.route.js |
| `POST` | `/api/event/:id/archive` | archiveEvent | event.route.js |
| `POST` | `/api/event/:id/unarchive` | unarchiveEvent | event.route.js |
| `PUT` | `/api/event/:id/location-trigger` | updateLocationTrigger | event.route.js |
| `POST` | `/api/event/:id/location/check` | checkLocationTrigger | event.route.js |
| `POST` | `/api/event/:id/attendees` | addAttendee | event.route.js |
| `DELETE` | `/api/event/:id/attendees/:attendeeId` | removeAttendee | event.route.js |
| `POST` | `/api/event/:id/rsvp` | rsvpEvent | event.route.js |
| `POST` | `/api/event/:id/agenda` | addAgendaItem | event.route.js |
| `PUT` | `/api/event/:id/agenda/:agendaId` | updateAgendaItem | event.route.js |
| `DELETE` | `/api/event/:id/agenda/:agendaId` | deleteAgendaItem | event.route.js |
| `POST` | `/api/event/:id/action-items` | addActionItem | event.route.js |
| `PUT` | `/api/event/:id/action-items/:itemId` | updateActionItem | event.route.js |
| `DELETE` | `/api/event/:id/action-items/:itemId` | deleteActionItem | event.route.js |

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
| `GET` | `/api/expense/new` | getNewExpenseDefaults | expense.route.js |
| `POST` | `/api/expense/suggest-category` | suggestCategory | expense.route.js |
| `GET` | `/api/expense/categories` | getExpenseCategories | expense.route.js |
| `GET` | `/api/expense/stats` | getExpenseStats | expense.route.js |
| `GET` | `/api/expense/by-category` | getExpensesByCategory | expense.route.js |
| `POST` | `/api/expense/bulk-approve` | bulkApproveExpenses | expense.route.js |
| `POST` | `/api/expense/bulk-delete` | bulkDeleteExpenses | expense.route.js |
| `POST` | `/api/expense` | createExpense | expense.route.js |
| `GET` | `/api/expense` | getExpenses | expense.route.js |
| `GET` | `/api/expense/:id` | getExpense | expense.route.js |
| `PUT` | `/api/expense/:id` | updateExpense | expense.route.js |
| `DELETE` | `/api/expense/:id` | deleteExpense | expense.route.js |
| `POST` | `/api/expense/:id/submit` | submitExpense | expense.route.js |
| `POST` | `/api/expense/:id/approve` | approveExpense | expense.route.js |
| `POST` | `/api/expense/:id/reject` | rejectExpense | expense.route.js |
| `POST` | `/api/expense/:id/reimburse` | markAsReimbursed | expense.route.js |
| `POST` | `/api/expense/:id/receipt` | uploadReceipt | expense.route.js |

## expenseClaim

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/expenseClaim/stats` | unknown | expenseClaim.route.js |
| `GET` | `/api/expenseClaim/pending-approvals` | unknown | expenseClaim.route.js |
| `GET` | `/api/expenseClaim/pending-payments` | unknown | expenseClaim.route.js |
| `GET` | `/api/expenseClaim/mileage-rates` | unknown | expenseClaim.route.js |
| `GET` | `/api/expenseClaim/policies` | unknown | expenseClaim.route.js |
| `GET` | `/api/expenseClaim/export` | unknown | expenseClaim.route.js |
| `POST` | `/api/expenseClaim/bulk-delete` | unknown | expenseClaim.route.js |
| `GET` | `/api/expenseClaim/by-employee/:employeeId` | unknown | expenseClaim.route.js |
| `GET` | `/api/expenseClaim/corporate-card/:employeeId` | unknown | expenseClaim.route.js |
| `GET` | `/api/expenseClaim` | unknown | expenseClaim.route.js |
| `POST` | `/api/expenseClaim` | unknown | expenseClaim.route.js |
| `GET` | `/api/expenseClaim/:id` | unknown | expenseClaim.route.js |
| `PATCH` | `/api/expenseClaim/:id` | unknown | expenseClaim.route.js |
| `DELETE` | `/api/expenseClaim/:id` | unknown | expenseClaim.route.js |
| `POST` | `/api/expenseClaim/:id/submit` | unknown | expenseClaim.route.js |
| `POST` | `/api/expenseClaim/:id/approve` | unknown | expenseClaim.route.js |
| `POST` | `/api/expenseClaim/:id/reject` | unknown | expenseClaim.route.js |
| `POST` | `/api/expenseClaim/:id/request-changes` | unknown | expenseClaim.route.js |
| `POST` | `/api/expenseClaim/:id/process-payment` | unknown | expenseClaim.route.js |
| `POST` | `/api/expenseClaim/:id/confirm-payment` | unknown | expenseClaim.route.js |
| `POST` | `/api/expenseClaim/:id/line-items` | unknown | expenseClaim.route.js |
| `PATCH` | `/api/expenseClaim/:id/line-items/:lineItemId` | unknown | expenseClaim.route.js |
| `DELETE` | `/api/expenseClaim/:id/line-items/:lineItemId` | unknown | expenseClaim.route.js |
| `POST` | `/api/expenseClaim/:id/receipts` | unknown | expenseClaim.route.js |
| `DELETE` | `/api/expenseClaim/:id/receipts/:receiptId` | unknown | expenseClaim.route.js |
| `POST` | `/api/expenseClaim/:id/receipts/:receiptId/verify` | unknown | expenseClaim.route.js |
| `POST` | `/api/expenseClaim/:id/reconcile-card` | unknown | expenseClaim.route.js |
| `POST` | `/api/expenseClaim/:id/check-compliance` | unknown | expenseClaim.route.js |
| `POST` | `/api/expenseClaim/:id/approve-exception` | unknown | expenseClaim.route.js |
| `POST` | `/api/expenseClaim/:id/mark-billable` | unknown | expenseClaim.route.js |
| `POST` | `/api/expenseClaim/:id/create-invoice` | unknown | expenseClaim.route.js |
| `POST` | `/api/expenseClaim/:id/duplicate` | unknown | expenseClaim.route.js |

## expensePolicy

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/expensePolicy` | getExpensePolicies | expensePolicy.route.js |
| `GET` | `/api/expensePolicy/default` | getDefaultPolicy | expensePolicy.route.js |
| `GET` | `/api/expensePolicy/my-policy` | getMyPolicy | expensePolicy.route.js |
| `POST` | `/api/expensePolicy/create-default` | createDefaultPolicy | expensePolicy.route.js |
| `GET` | `/api/expensePolicy/:id` | getExpensePolicy | expensePolicy.route.js |
| `POST` | `/api/expensePolicy` | createExpensePolicy | expensePolicy.route.js |
| `PUT` | `/api/expensePolicy/:id` | updateExpensePolicy | expensePolicy.route.js |
| `POST` | `/api/expensePolicy/:id/set-default` | setAsDefault | expensePolicy.route.js |
| `POST` | `/api/expensePolicy/:id/toggle-status` | toggleStatus | expensePolicy.route.js |
| `POST` | `/api/expensePolicy/:id/duplicate` | duplicatePolicy | expensePolicy.route.js |
| `POST` | `/api/expensePolicy/:policyId/check-compliance` | checkCompliance | expensePolicy.route.js |
| `POST` | `/api/expensePolicy/check-compliance` | unknown | expensePolicy.route.js |
| `DELETE` | `/api/expensePolicy/:id` | deleteExpensePolicy | expensePolicy.route.js |

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
| `GET` | `/api/financeSetup/status` | getSetupStatus | financeSetup.route.js |
| `GET` | `/api/financeSetup/templates` | getTemplates | financeSetup.route.js |
| `GET` | `/api/financeSetup` | getSetup | financeSetup.route.js |
| `PUT` | `/api/financeSetup` | updateSetup | financeSetup.route.js |
| `PUT` | `/api/financeSetup/step/:step` | updateStep | financeSetup.route.js |
| `POST` | `/api/financeSetup/complete` | completeSetup | financeSetup.route.js |
| `POST` | `/api/financeSetup/reset` | resetSetup | financeSetup.route.js |

## firm

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/firm` | getFirms | firm.route.js |
| `GET` | `/api/firm/roles` | getAvailableRoles | firm.route.js |
| `POST` | `/api/firm` | createFirm | firm.route.js |
| `GET` | `/api/firm/my` | getMyFirm | firm.route.js |
| `POST` | `/api/firm/switch` | switchFirm | firm.route.js |
| `GET` | `/api/firm/my/permissions` | getMyPermissions | firm.route.js |
| `GET` | `/api/firm/tree` | getHierarchyTree | firm.route.js |
| `GET` | `/api/firm/user/accessible` | getAccessibleCompanies | firm.route.js |
| `GET` | `/api/firm/active` | getActiveCompany | firm.route.js |
| `GET` | `/api/firm/:id` | getFirm | firm.route.js |
| `GET` | `/api/firm/:_id` | getFirm | firm.route.js |
| `PUT` | `/api/firm/:id` | updateFirm | firm.route.js |
| `PATCH` | `/api/firm/:id` | updateFirm | firm.route.js |
| `PATCH` | `/api/firm/:_id` | unknown | firm.route.js |
| `DELETE` | `/api/firm/:id` | deleteFirm | firm.route.js |
| `GET` | `/api/firm/:id/children` | getChildCompanies | firm.route.js |
| `PUT` | `/api/firm/:id/move` | moveCompany | firm.route.js |
| `GET` | `/api/firm/:id/access` | getCompanyAccessList | firm.route.js |
| `POST` | `/api/firm/:id/access` | grantUserAccess | firm.route.js |
| `PUT` | `/api/firm/:id/access/:userId` | updateUserAccess | firm.route.js |
| `DELETE` | `/api/firm/:id/access/:userId` | revokeUserAccess | firm.route.js |
| `PATCH` | `/api/firm/:id/billing` | updateBillingSettings | firm.route.js |
| `GET` | `/api/firm/:id/team` | getTeam | firm.route.js |
| `GET` | `/api/firm/:id/members` | getMembers | firm.route.js |
| `GET` | `/api/firm/:id/departed` | getDepartedMembers | firm.route.js |
| `POST` | `/api/firm/:id/members/invite` | inviteMember | firm.route.js |
| `POST` | `/api/firm/:id/members/:memberId/depart` | processDeparture | firm.route.js |
| `POST` | `/api/firm/:id/members/:memberId/reinstate` | reinstateMember | firm.route.js |
| `PUT` | `/api/firm/:id/members/:memberId` | updateMember | firm.route.js |
| `DELETE` | `/api/firm/:id/members/:memberId` | removeMember | firm.route.js |
| `POST` | `/api/firm/:id/leave` | leaveFirmWithSolo | firm.route.js |
| `POST` | `/api/firm/:id/transfer-ownership` | transferOwnership | firm.route.js |
| `POST` | `/api/firm/:firmId/invitations` | createInvitation | firm.route.js |
| `GET` | `/api/firm/:firmId/invitations` | getInvitations | firm.route.js |
| `DELETE` | `/api/firm/:firmId/invitations/:invitationId` | cancelInvitation | firm.route.js |
| `POST` | `/api/firm/:firmId/invitations/:invitationId/resend` | resendInvitation | firm.route.js |
| `GET` | `/api/firm/:id/stats` | getFirmStats | firm.route.js |
| `GET` | `/api/firm/:firmId/ip-whitelist` | getIPWhitelist | firm.route.js |
| `POST` | `/api/firm/:firmId/ip-whitelist/test` | testIPAccess | firm.route.js |
| `POST` | `/api/firm/:firmId/ip-whitelist/enable` | enableIPWhitelist | firm.route.js |
| `POST` | `/api/firm/:firmId/ip-whitelist/disable` | disableIPWhitelist | firm.route.js |
| `POST` | `/api/firm/:firmId/ip-whitelist` | addIPToWhitelist | firm.route.js |
| `DELETE` | `/api/firm/:firmId/ip-whitelist/:ip` | removeIPFromWhitelist | firm.route.js |
| `DELETE` | `/api/firm/:firmId/ip-whitelist/temporary/:allowanceId` | revokeTemporaryIP | firm.route.js |
| `POST` | `/api/firm/lawyer/add` | addLawyer | firm.route.js |
| `POST` | `/api/firm/lawyer/remove` | removeLawyer | firm.route.js |

## fiscalPeriod

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/fiscalPeriod` | getFiscalPeriods | fiscalPeriod.route.js |
| `GET` | `/api/fiscalPeriod/current` | getCurrentPeriod | fiscalPeriod.route.js |
| `GET` | `/api/fiscalPeriod/can-post` | canPostToDate | fiscalPeriod.route.js |
| `GET` | `/api/fiscalPeriod/years-summary` | getFiscalYearsSummary | fiscalPeriod.route.js |
| `POST` | `/api/fiscalPeriod/create-year` | createFiscalYear | fiscalPeriod.route.js |
| `GET` | `/api/fiscalPeriod/:id` | getFiscalPeriod | fiscalPeriod.route.js |
| `GET` | `/api/fiscalPeriod/:id/balances` | calculateBalances | fiscalPeriod.route.js |
| `POST` | `/api/fiscalPeriod/:id/open` | openPeriod | fiscalPeriod.route.js |
| `POST` | `/api/fiscalPeriod/:id/close` | closePeriod | fiscalPeriod.route.js |
| `POST` | `/api/fiscalPeriod/:id/reopen` | reopenPeriod | fiscalPeriod.route.js |
| `POST` | `/api/fiscalPeriod/:id/lock` | lockPeriod | fiscalPeriod.route.js |
| `POST` | `/api/fiscalPeriod/:id/year-end-closing` | yearEndClosing | fiscalPeriod.route.js |

## fleet

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/fleet/stats` | unknown | fleet.route.js |
| `GET` | `/api/fleet/expiring-documents` | unknown | fleet.route.js |
| `GET` | `/api/fleet/maintenance-due` | unknown | fleet.route.js |
| `GET` | `/api/fleet/driver-rankings` | unknown | fleet.route.js |
| `GET` | `/api/fleet/vehicles` | unknown | fleet.route.js |
| `GET` | `/api/fleet/vehicles/:id` | unknown | fleet.route.js |
| `POST` | `/api/fleet/vehicles` | unknown | fleet.route.js |
| `PATCH` | `/api/fleet/vehicles/:id` | unknown | fleet.route.js |
| `DELETE` | `/api/fleet/vehicles/:id` | unknown | fleet.route.js |
| `PUT` | `/api/fleet/vehicles/:id/location` | unknown | fleet.route.js |
| `GET` | `/api/fleet/vehicles/:id/location-history` | unknown | fleet.route.js |
| `GET` | `/api/fleet/fuel-logs` | unknown | fleet.route.js |
| `POST` | `/api/fleet/fuel-logs` | unknown | fleet.route.js |
| `POST` | `/api/fleet/fuel-logs/:id/verify` | unknown | fleet.route.js |
| `GET` | `/api/fleet/maintenance` | unknown | fleet.route.js |
| `POST` | `/api/fleet/maintenance` | unknown | fleet.route.js |
| `PATCH` | `/api/fleet/maintenance/:id` | unknown | fleet.route.js |
| `GET` | `/api/fleet/inspections/checklist` | unknown | fleet.route.js |
| `GET` | `/api/fleet/inspections` | unknown | fleet.route.js |
| `POST` | `/api/fleet/inspections` | unknown | fleet.route.js |
| `GET` | `/api/fleet/trips` | unknown | fleet.route.js |
| `POST` | `/api/fleet/trips` | unknown | fleet.route.js |
| `POST` | `/api/fleet/trips/:id/end` | unknown | fleet.route.js |
| `GET` | `/api/fleet/incidents` | unknown | fleet.route.js |
| `GET` | `/api/fleet/incidents/:id` | unknown | fleet.route.js |
| `POST` | `/api/fleet/incidents` | unknown | fleet.route.js |
| `PATCH` | `/api/fleet/incidents/:id` | unknown | fleet.route.js |
| `GET` | `/api/fleet/drivers` | unknown | fleet.route.js |
| `GET` | `/api/fleet/drivers/:id` | unknown | fleet.route.js |
| `POST` | `/api/fleet/drivers` | unknown | fleet.route.js |
| `PATCH` | `/api/fleet/drivers/:id` | unknown | fleet.route.js |
| `POST` | `/api/fleet/assignments` | unknown | fleet.route.js |
| `POST` | `/api/fleet/assignments/:id/end` | unknown | fleet.route.js |

## followup

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/followup/upcoming` | getUpcomingFollowups | followup.route.js |
| `GET` | `/api/followup/overdue` | getOverdueFollowups | followup.route.js |
| `GET` | `/api/followup/today` | getTodayFollowups | followup.route.js |
| `GET` | `/api/followup/stats` | getFollowupStats | followup.route.js |
| `GET` | `/api/followup/entity/:entityType/:entityId` | getFollowupsByEntity | followup.route.js |
| `POST` | `/api/followup/bulk-complete` | bulkComplete | followup.route.js |
| `POST` | `/api/followup/bulk-delete` | bulkDelete | followup.route.js |
| `GET` | `/api/followup` | getFollowups | followup.route.js |
| `POST` | `/api/followup` | createFollowup | followup.route.js |
| `GET` | `/api/followup/:id` | getFollowup | followup.route.js |
| `PATCH` | `/api/followup/:id` | updateFollowup | followup.route.js |
| `DELETE` | `/api/followup/:id` | deleteFollowup | followup.route.js |
| `POST` | `/api/followup/:id/complete` | completeFollowup | followup.route.js |
| `POST` | `/api/followup/:id/cancel` | cancelFollowup | followup.route.js |
| `POST` | `/api/followup/:id/reschedule` | rescheduleFollowup | followup.route.js |
| `POST` | `/api/followup/:id/notes` | addNote | followup.route.js |

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
| `GET` | `/api/generalLedger/stats` | getStats | generalLedger.route.js |
| `GET` | `/api/generalLedger/summary` | getSummary | generalLedger.route.js |
| `GET` | `/api/generalLedger/trial-balance` | getTrialBalance | generalLedger.route.js |
| `GET` | `/api/generalLedger/profit-loss` | getProfitLoss | generalLedger.route.js |
| `GET` | `/api/generalLedger/balance-sheet` | getBalanceSheet | generalLedger.route.js |
| `GET` | `/api/generalLedger/account-balance/:accountId` | getAccountBalance | generalLedger.route.js |
| `GET` | `/api/generalLedger/reference/:model/:id` | getEntriesByReference | generalLedger.route.js |
| `GET` | `/api/generalLedger/entries` | getEntries | generalLedger.route.js |
| `GET` | `/api/generalLedger/:id` | getEntry | generalLedger.route.js |
| `POST` | `/api/generalLedger/:id/void` | voidEntry | generalLedger.route.js |
| `GET` | `/api/generalLedger` | getEntries | generalLedger.route.js |
| `POST` | `/api/generalLedger/void/:id` | voidEntry | generalLedger.route.js |

## gig

| Method | Path | Controller | File |
|--------|------|------------|------|
| `POST` | `/api/gig` | createGig | gig.route.js |
| `DELETE` | `/api/gig/:_id` | deleteGig | gig.route.js |
| `GET` | `/api/gig/single/:_id` | getGig | gig.route.js |
| `GET` | `/api/gig` | getGigs | gig.route.js |

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
| `GET` | `/api/googleCalendar/auth` | getAuthUrl | googleCalendar.route.js |
| `GET` | `/api/googleCalendar/callback` | handleCallback | googleCalendar.route.js |
| `POST` | `/api/googleCalendar/disconnect` | disconnect | googleCalendar.route.js |
| `GET` | `/api/googleCalendar/status` | getStatus | googleCalendar.route.js |
| `GET` | `/api/googleCalendar/calendars` | getCalendars | googleCalendar.route.js |
| `GET` | `/api/googleCalendar/calendars/:calendarId/events` | getEvents | googleCalendar.route.js |
| `POST` | `/api/googleCalendar/calendars/:calendarId/events` | createEvent | googleCalendar.route.js |
| `PUT` | `/api/googleCalendar/calendars/:calendarId/events/:eventId` | updateEvent | googleCalendar.route.js |
| `DELETE` | `/api/googleCalendar/calendars/:calendarId/events/:eventId` | deleteEvent | googleCalendar.route.js |
| `PUT` | `/api/googleCalendar/settings/calendars` | updateSelectedCalendars | googleCalendar.route.js |
| `PUT` | `/api/googleCalendar/settings/show-external-events` | toggleShowExternalEvents | googleCalendar.route.js |
| `POST` | `/api/googleCalendar/watch/:calendarId` | watchCalendar | googleCalendar.route.js |
| `DELETE` | `/api/googleCalendar/watch/:channelId` | stopWatch | googleCalendar.route.js |
| `POST` | `/api/googleCalendar/sync/import` | syncFromGoogle | googleCalendar.route.js |
| `POST` | `/api/googleCalendar/import` | unknown | googleCalendar.route.js |
| `POST` | `/api/googleCalendar/sync/export/:eventId` | syncToGoogle | googleCalendar.route.js |
| `POST` | `/api/googleCalendar/export` | unknown | googleCalendar.route.js |
| `POST` | `/api/googleCalendar/sync/auto/enable` | enableAutoSync | googleCalendar.route.js |
| `POST` | `/api/googleCalendar/sync/auto/disable` | disableAutoSync | googleCalendar.route.js |
| `GET` | `/api/googleCalendar/sync/settings` | getSyncSettings | googleCalendar.route.js |
| `POST` | `/api/googleCalendar/webhook` | handleWebhook | googleCalendar.route.js |

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
| `GET` | `/api/grievance/stats` | unknown | grievance.route.js |
| `GET` | `/api/grievance/overdue` | unknown | grievance.route.js |
| `GET` | `/api/grievance/export` | unknown | grievance.route.js |
| `GET` | `/api/grievance` | unknown | grievance.route.js |
| `POST` | `/api/grievance` | unknown | grievance.route.js |
| `POST` | `/api/grievance/bulk-delete` | unknown | grievance.route.js |
| `GET` | `/api/grievance/employee/:employeeId` | unknown | grievance.route.js |
| `GET` | `/api/grievance/:id` | unknown | grievance.route.js |
| `PATCH` | `/api/grievance/:id` | unknown | grievance.route.js |
| `DELETE` | `/api/grievance/:id` | unknown | grievance.route.js |
| `POST` | `/api/grievance/:id/acknowledge` | unknown | grievance.route.js |
| `POST` | `/api/grievance/:id/start-investigation` | unknown | grievance.route.js |
| `POST` | `/api/grievance/:id/complete-investigation` | unknown | grievance.route.js |
| `POST` | `/api/grievance/:id/resolve` | unknown | grievance.route.js |
| `POST` | `/api/grievance/:id/escalate` | unknown | grievance.route.js |
| `POST` | `/api/grievance/:id/withdraw` | unknown | grievance.route.js |
| `POST` | `/api/grievance/:id/close` | unknown | grievance.route.js |
| `POST` | `/api/grievance/:id/timeline` | unknown | grievance.route.js |
| `POST` | `/api/grievance/:id/witnesses` | unknown | grievance.route.js |
| `POST` | `/api/grievance/:id/evidence` | unknown | grievance.route.js |
| `POST` | `/api/grievance/:id/interviews` | unknown | grievance.route.js |
| `POST` | `/api/grievance/:id/appeal` | unknown | grievance.route.js |
| `POST` | `/api/grievance/:id/appeal/decide` | unknown | grievance.route.js |
| `POST` | `/api/grievance/:id/labor-office` | unknown | grievance.route.js |

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
| `GET` | `/api/hrAnalytics/dashboard` | unknown | hrAnalytics.route.js |
| `GET` | `/api/hrAnalytics/demographics` | unknown | hrAnalytics.route.js |
| `GET` | `/api/hrAnalytics/turnover` | unknown | hrAnalytics.route.js |
| `GET` | `/api/hrAnalytics/absenteeism` | unknown | hrAnalytics.route.js |
| `GET` | `/api/hrAnalytics/attendance` | unknown | hrAnalytics.route.js |
| `GET` | `/api/hrAnalytics/performance` | unknown | hrAnalytics.route.js |
| `GET` | `/api/hrAnalytics/recruitment` | unknown | hrAnalytics.route.js |
| `GET` | `/api/hrAnalytics/compensation` | unknown | hrAnalytics.route.js |
| `GET` | `/api/hrAnalytics/training` | unknown | hrAnalytics.route.js |
| `GET` | `/api/hrAnalytics/leave` | unknown | hrAnalytics.route.js |
| `GET` | `/api/hrAnalytics/saudization` | unknown | hrAnalytics.route.js |
| `POST` | `/api/hrAnalytics/snapshot` | unknown | hrAnalytics.route.js |
| `GET` | `/api/hrAnalytics/trends` | unknown | hrAnalytics.route.js |
| `GET` | `/api/hrAnalytics/export` | unknown | hrAnalytics.route.js |
| `GET` | `/api/hrAnalytics/predictions/attrition` | unknown | hrAnalytics.route.js |
| `GET` | `/api/hrAnalytics/predictions/attrition/:employeeId` | unknown | hrAnalytics.route.js |
| `GET` | `/api/hrAnalytics/predictions/workforce` | unknown | hrAnalytics.route.js |
| `GET` | `/api/hrAnalytics/predictions/high-potential` | unknown | hrAnalytics.route.js |
| `GET` | `/api/hrAnalytics/predictions/flight-risk` | unknown | hrAnalytics.route.js |
| `GET` | `/api/hrAnalytics/predictions/absence` | unknown | hrAnalytics.route.js |
| `GET` | `/api/hrAnalytics/predictions/engagement` | unknown | hrAnalytics.route.js |

## hrExtended

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/hrExtended/leave-encashment` | unknown | hrExtended.route.js |
| `POST` | `/api/hrExtended/leave-encashment` | unknown | hrExtended.route.js |
| `POST` | `/api/hrExtended/leave-encashment/:id/approve` | unknown | hrExtended.route.js |
| `GET` | `/api/hrExtended/compensatory-leave` | unknown | hrExtended.route.js |
| `POST` | `/api/hrExtended/compensatory-leave` | unknown | hrExtended.route.js |
| `GET` | `/api/hrExtended/compensatory-leave/balance/:employeeId` | unknown | hrExtended.route.js |
| `POST` | `/api/hrExtended/compensatory-leave/:id/approve` | unknown | hrExtended.route.js |
| `GET` | `/api/hrExtended/salary-components` | unknown | hrExtended.route.js |
| `POST` | `/api/hrExtended/salary-components` | unknown | hrExtended.route.js |
| `POST` | `/api/hrExtended/salary-components/create-defaults` | unknown | hrExtended.route.js |
| `PUT` | `/api/hrExtended/salary-components/:id` | unknown | hrExtended.route.js |
| `GET` | `/api/hrExtended/promotions` | unknown | hrExtended.route.js |
| `POST` | `/api/hrExtended/promotions` | unknown | hrExtended.route.js |
| `POST` | `/api/hrExtended/promotions/:id/approve` | unknown | hrExtended.route.js |
| `POST` | `/api/hrExtended/promotions/:id/apply` | unknown | hrExtended.route.js |
| `GET` | `/api/hrExtended/transfers` | unknown | hrExtended.route.js |
| `POST` | `/api/hrExtended/transfers` | unknown | hrExtended.route.js |
| `POST` | `/api/hrExtended/transfers/:id/approve` | unknown | hrExtended.route.js |
| `POST` | `/api/hrExtended/transfers/:id/apply` | unknown | hrExtended.route.js |
| `GET` | `/api/hrExtended/staffing-plans` | unknown | hrExtended.route.js |
| `POST` | `/api/hrExtended/staffing-plans` | unknown | hrExtended.route.js |
| `GET` | `/api/hrExtended/staffing-plans/vacancy-summary` | unknown | hrExtended.route.js |
| `GET` | `/api/hrExtended/retention-bonuses` | unknown | hrExtended.route.js |
| `POST` | `/api/hrExtended/retention-bonuses` | unknown | hrExtended.route.js |
| `POST` | `/api/hrExtended/retention-bonuses/:id/vest/:milestone` | unknown | hrExtended.route.js |
| `GET` | `/api/hrExtended/incentives` | unknown | hrExtended.route.js |
| `POST` | `/api/hrExtended/incentives` | unknown | hrExtended.route.js |
| `GET` | `/api/hrExtended/incentives/stats` | unknown | hrExtended.route.js |
| `GET` | `/api/hrExtended/vehicles` | unknown | hrExtended.route.js |
| `POST` | `/api/hrExtended/vehicles` | unknown | hrExtended.route.js |
| `POST` | `/api/hrExtended/vehicles/:id/assign` | unknown | hrExtended.route.js |
| `POST` | `/api/hrExtended/vehicles/:id/maintenance` | unknown | hrExtended.route.js |
| `GET` | `/api/hrExtended/vehicles/fleet-summary` | unknown | hrExtended.route.js |
| `GET` | `/api/hrExtended/skills` | unknown | hrExtended.route.js |
| `POST` | `/api/hrExtended/skills` | unknown | hrExtended.route.js |
| `GET` | `/api/hrExtended/skills/by-category` | unknown | hrExtended.route.js |
| `GET` | `/api/hrExtended/employee-skills/:employeeId` | unknown | hrExtended.route.js |
| `POST` | `/api/hrExtended/employee-skills` | unknown | hrExtended.route.js |
| `GET` | `/api/hrExtended/employee-skills/matrix` | unknown | hrExtended.route.js |
| `GET` | `/api/hrExtended/employee-skills/expiring-certifications` | unknown | hrExtended.route.js |
| `GET` | `/api/hrExtended/settings` | unknown | hrExtended.route.js |
| `PUT` | `/api/hrExtended/settings` | unknown | hrExtended.route.js |
| `GET` | `/api/hrExtended/settings/leave` | unknown | hrExtended.route.js |
| `GET` | `/api/hrExtended/settings/payroll` | unknown | hrExtended.route.js |
| `GET` | `/api/hrExtended/setup-wizard` | unknown | hrExtended.route.js |
| `GET` | `/api/hrExtended/setup-wizard/progress` | unknown | hrExtended.route.js |
| `POST` | `/api/hrExtended/setup-wizard/complete-step/:stepId` | unknown | hrExtended.route.js |
| `POST` | `/api/hrExtended/setup-wizard/skip-step/:stepId` | unknown | hrExtended.route.js |
| `POST` | `/api/hrExtended/setup-wizard/skip` | unknown | hrExtended.route.js |

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
| `GET` | `/api/interCompany/transactions` | unknown | interCompany.route.js |
| `POST` | `/api/interCompany/transactions` | unknown | interCompany.route.js |
| `GET` | `/api/interCompany/transactions/:id` | unknown | interCompany.route.js |
| `PUT` | `/api/interCompany/transactions/:id` | unknown | interCompany.route.js |
| `POST` | `/api/interCompany/transactions/:id/confirm` | unknown | interCompany.route.js |
| `POST` | `/api/interCompany/transactions/:id/cancel` | unknown | interCompany.route.js |
| `GET` | `/api/interCompany/balances` | unknown | interCompany.route.js |
| `GET` | `/api/interCompany/balances/:firmId` | unknown | interCompany.route.js |
| `GET` | `/api/interCompany/reconciliation` | unknown | interCompany.route.js |
| `POST` | `/api/interCompany/reconciliation` | unknown | interCompany.route.js |

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
| `GET` | `/api/investmentSearch/symbols` | searchInvestmentSymbols | investmentSearch.route.js |
| `GET` | `/api/investmentSearch/quote` | getQuote | investmentSearch.route.js |
| `POST` | `/api/investmentSearch/quotes` | getBatchQuotes | investmentSearch.route.js |
| `GET` | `/api/investmentSearch/markets` | getMarkets | investmentSearch.route.js |
| `GET` | `/api/investmentSearch/types` | getTypes | investmentSearch.route.js |
| `GET` | `/api/investmentSearch/sectors` | getSectors | investmentSearch.route.js |
| `GET` | `/api/investmentSearch/market/:market` | getSymbolsByMarketEndpoint | investmentSearch.route.js |
| `GET` | `/api/investmentSearch/type/:type` | getSymbolsByTypeEndpoint | investmentSearch.route.js |
| `GET` | `/api/investmentSearch/symbol/:symbol` | getSymbolDetails | investmentSearch.route.js |

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
| `GET` | `/api/invitation/:code` | validateInvitationCode | invitation.route.js |
| `GET` | `/api/invitation/:code/validate` | validateInvitationCode | invitation.route.js |
| `POST` | `/api/invitation/:code/accept` | acceptInvitation | invitation.route.js |

## invoice

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/invoice/stats` | unknown | invoice.route.js |
| `GET` | `/api/invoice/overdue` | unknown | invoice.route.js |
| `GET` | `/api/invoice/billable-items` | unknown | invoice.route.js |
| `GET` | `/api/invoice/open/:clientId` | unknown | invoice.route.js |
| `POST` | `/api/invoice/confirm-payment` | unknown | invoice.route.js |
| `POST` | `/api/invoice/bulk-delete` | unknown | invoice.route.js |
| `POST` | `/api/invoice` | unknown | invoice.route.js |
| `GET` | `/api/invoice` | unknown | invoice.route.js |
| `GET` | `/api/invoice/:id` | unknown | invoice.route.js |
| `GET` | `/api/invoice/:_id` | unknown | invoice.route.js |
| `PATCH` | `/api/invoice/:id` | unknown | invoice.route.js |
| `PATCH` | `/api/invoice/:_id` | unknown | invoice.route.js |
| `PUT` | `/api/invoice/:id` | unknown | invoice.route.js |
| `DELETE` | `/api/invoice/:id` | unknown | invoice.route.js |
| `DELETE` | `/api/invoice/:_id` | unknown | invoice.route.js |
| `POST` | `/api/invoice/:id/send` | unknown | invoice.route.js |
| `POST` | `/api/invoice/:_id/send` | unknown | invoice.route.js |
| `POST` | `/api/invoice/:id/record-payment` | unknown | invoice.route.js |
| `POST` | `/api/invoice/:id/payments` | unknown | invoice.route.js |
| `POST` | `/api/invoice/:_id/payments` | unknown | invoice.route.js |
| `POST` | `/api/invoice/:id/void` | unknown | invoice.route.js |
| `POST` | `/api/invoice/:id/duplicate` | unknown | invoice.route.js |
| `POST` | `/api/invoice/:id/send-reminder` | unknown | invoice.route.js |
| `POST` | `/api/invoice/:id/convert-to-credit-note` | unknown | invoice.route.js |
| `POST` | `/api/invoice/:id/apply-retainer` | unknown | invoice.route.js |
| `POST` | `/api/invoice/:id/submit-for-approval` | unknown | invoice.route.js |
| `POST` | `/api/invoice/:id/approve` | unknown | invoice.route.js |
| `POST` | `/api/invoice/:id/reject` | unknown | invoice.route.js |
| `POST` | `/api/invoice/:id/zatca/submit` | unknown | invoice.route.js |
| `GET` | `/api/invoice/:id/zatca/status` | unknown | invoice.route.js |
| `GET` | `/api/invoice/:id/pdf` | unknown | invoice.route.js |
| `GET` | `/api/invoice/:id/xml` | unknown | invoice.route.js |
| `POST` | `/api/invoice/:id/payment` | unknown | invoice.route.js |
| `POST` | `/api/invoice/:_id/payment` | unknown | invoice.route.js |

## invoiceApproval

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/invoiceApproval/pending` | getPendingApprovals | invoiceApproval.route.js |
| `GET` | `/api/invoiceApproval/stats` | getApprovalStats | invoiceApproval.route.js |
| `GET` | `/api/invoiceApproval/needing-escalation` | getNeedingEscalation | invoiceApproval.route.js |
| `GET` | `/api/invoiceApproval` | getInvoiceApprovals | invoiceApproval.route.js |
| `GET` | `/api/invoiceApproval/:id` | getInvoiceApproval | invoiceApproval.route.js |
| `POST` | `/api/invoiceApproval/:id/approve` | approveInvoice | invoiceApproval.route.js |
| `POST` | `/api/invoiceApproval/:id/reject` | rejectInvoice | invoiceApproval.route.js |
| `POST` | `/api/invoiceApproval/:id/escalate` | escalateApproval | invoiceApproval.route.js |
| `POST` | `/api/invoiceApproval/:id/cancel` | cancelApproval | invoiceApproval.route.js |

## invoiceTemplate

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/invoiceTemplate/default` | getDefaultTemplate | invoiceTemplate.route.js |
| `POST` | `/api/invoiceTemplate/import` | importTemplate | invoiceTemplate.route.js |
| `GET` | `/api/invoiceTemplate` | getTemplates | invoiceTemplate.route.js |
| `POST` | `/api/invoiceTemplate` | createTemplate | invoiceTemplate.route.js |
| `GET` | `/api/invoiceTemplate/:id` | getTemplate | invoiceTemplate.route.js |
| `PATCH` | `/api/invoiceTemplate/:id` | updateTemplate | invoiceTemplate.route.js |
| `DELETE` | `/api/invoiceTemplate/:id` | deleteTemplate | invoiceTemplate.route.js |
| `POST` | `/api/invoiceTemplate/:id/duplicate` | duplicateTemplate | invoiceTemplate.route.js |
| `POST` | `/api/invoiceTemplate/:id/set-default` | setAsDefault | invoiceTemplate.route.js |
| `GET` | `/api/invoiceTemplate/:id/preview` | previewTemplate | invoiceTemplate.route.js |
| `GET` | `/api/invoiceTemplate/:id/export` | exportTemplate | invoiceTemplate.route.js |

## job

| Method | Path | Controller | File |
|--------|------|------------|------|
| `POST` | `/api/job` | createJob | job.route.js |
| `GET` | `/api/job` | getJobs | job.route.js |
| `GET` | `/api/job/my-jobs` | getMyJobs | job.route.js |
| `GET` | `/api/job/:_id` | getJob | job.route.js |
| `PATCH` | `/api/job/:_id` | updateJob | job.route.js |
| `DELETE` | `/api/job/:_id` | deleteJob | job.route.js |

## jobPosition

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/jobPosition/stats` | unknown | jobPosition.route.js |
| `GET` | `/api/jobPosition/vacant` | unknown | jobPosition.route.js |
| `GET` | `/api/jobPosition/org-chart` | unknown | jobPosition.route.js |
| `GET` | `/api/jobPosition/export` | unknown | jobPosition.route.js |
| `GET` | `/api/jobPosition` | unknown | jobPosition.route.js |
| `POST` | `/api/jobPosition` | unknown | jobPosition.route.js |
| `POST` | `/api/jobPosition/bulk-delete` | unknown | jobPosition.route.js |
| `GET` | `/api/jobPosition/department/:departmentId` | unknown | jobPosition.route.js |
| `GET` | `/api/jobPosition/:id` | unknown | jobPosition.route.js |
| `PATCH` | `/api/jobPosition/:id` | unknown | jobPosition.route.js |
| `PUT` | `/api/jobPosition/:id` | unknown | jobPosition.route.js |
| `DELETE` | `/api/jobPosition/:id` | unknown | jobPosition.route.js |
| `GET` | `/api/jobPosition/:id/hierarchy` | unknown | jobPosition.route.js |
| `POST` | `/api/jobPosition/:id/freeze` | unknown | jobPosition.route.js |
| `POST` | `/api/jobPosition/:id/unfreeze` | unknown | jobPosition.route.js |
| `POST` | `/api/jobPosition/:id/eliminate` | unknown | jobPosition.route.js |
| `POST` | `/api/jobPosition/:id/vacant` | unknown | jobPosition.route.js |
| `POST` | `/api/jobPosition/:id/fill` | unknown | jobPosition.route.js |
| `POST` | `/api/jobPosition/:id/vacate` | unknown | jobPosition.route.js |
| `POST` | `/api/jobPosition/:id/clone` | unknown | jobPosition.route.js |
| `PUT` | `/api/jobPosition/:id/responsibilities` | unknown | jobPosition.route.js |
| `PUT` | `/api/jobPosition/:id/qualifications` | unknown | jobPosition.route.js |
| `PUT` | `/api/jobPosition/:id/salary-range` | unknown | jobPosition.route.js |
| `PUT` | `/api/jobPosition/:id/competencies` | unknown | jobPosition.route.js |
| `POST` | `/api/jobPosition/:id/documents` | unknown | jobPosition.route.js |

## journalEntry

| Method | Path | Controller | File |
|--------|------|------------|------|
| `POST` | `/api/journalEntry/simple` | createSimpleEntry | journalEntry.route.js |
| `GET` | `/api/journalEntry` | getEntries | journalEntry.route.js |
| `GET` | `/api/journalEntry/:id` | getEntry | journalEntry.route.js |
| `POST` | `/api/journalEntry` | createEntry | journalEntry.route.js |
| `PATCH` | `/api/journalEntry/:id` | updateEntry | journalEntry.route.js |
| `POST` | `/api/journalEntry/:id/post` | postEntry | journalEntry.route.js |
| `POST` | `/api/journalEntry/:id/void` | voidEntry | journalEntry.route.js |
| `DELETE` | `/api/journalEntry/:id` | deleteEntry | journalEntry.route.js |

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
| `GET` | `/api/kpiAnalytics/kpi-dashboard` | unknown | kpiAnalytics.route.js |
| `GET` | `/api/kpiAnalytics/revenue-by-case` | unknown | kpiAnalytics.route.js |
| `GET` | `/api/kpiAnalytics/case-throughput` | unknown | kpiAnalytics.route.js |
| `GET` | `/api/kpiAnalytics/user-activation` | unknown | kpiAnalytics.route.js |

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
| `GET` | `/api/lawyer/team` | getTeamMembers | lawyer.route.js |
| `GET` | `/api/lawyer` | getLawyers | lawyer.route.js |
| `GET` | `/api/lawyer/:_id` | getLawyer | lawyer.route.js |

## ldap

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/ldap/config` | getConfig | ldap.route.js |
| `POST` | `/api/ldap/config` | saveConfig | ldap.route.js |
| `POST` | `/api/ldap/test` | testConnection | ldap.route.js |
| `POST` | `/api/ldap/test-auth` | testAuth | ldap.route.js |
| `POST` | `/api/ldap/sync` | syncUsers | ldap.route.js |
| `POST` | `/api/ldap/login` | login | ldap.route.js |

## lead

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/lead/overview` | unknown | lead.route.js |
| `POST` | `/api/lead/bulk-delete` | unknown | lead.route.js |
| `POST` | `/api/lead` | unknown | lead.route.js |
| `GET` | `/api/lead` | unknown | lead.route.js |
| `GET` | `/api/lead/stats` | unknown | lead.route.js |
| `GET` | `/api/lead/follow-up` | unknown | lead.route.js |
| `GET` | `/api/lead/pipeline/:pipelineId?` | unknown | lead.route.js |
| `GET` | `/api/lead/:id` | unknown | lead.route.js |
| `PUT` | `/api/lead/:id` | unknown | lead.route.js |
| `DELETE` | `/api/lead/:id` | unknown | lead.route.js |
| `POST` | `/api/lead/:id/status` | unknown | lead.route.js |
| `POST` | `/api/lead/:id/move` | unknown | lead.route.js |
| `GET` | `/api/lead/:id/conversion-preview` | unknown | lead.route.js |
| `POST` | `/api/lead/:id/convert` | unknown | lead.route.js |
| `GET` | `/api/lead/:id/activities` | unknown | lead.route.js |
| `POST` | `/api/lead/:id/activities` | unknown | lead.route.js |
| `POST` | `/api/lead/:id/follow-up` | unknown | lead.route.js |
| `POST` | `/api/lead/:id/verify/wathq` | unknown | lead.route.js |
| `POST` | `/api/lead/:id/verify/absher` | unknown | lead.route.js |
| `POST` | `/api/lead/:id/verify/address` | unknown | lead.route.js |
| `POST` | `/api/lead/:id/conflict-check` | unknown | lead.route.js |

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
| `POST` | `/api/leadScoring/calculate/:leadId` | unknown | leadScoring.route.js |
| `POST` | `/api/leadScoring/calculate-all` | unknown | leadScoring.route.js |
| `POST` | `/api/leadScoring/calculate-batch` | unknown | leadScoring.route.js |
| `GET` | `/api/leadScoring/scores` | unknown | leadScoring.route.js |
| `GET` | `/api/leadScoring/leaderboard` | unknown | leadScoring.route.js |
| `GET` | `/api/leadScoring/distribution` | unknown | leadScoring.route.js |
| `GET` | `/api/leadScoring/top-leads` | unknown | leadScoring.route.js |
| `GET` | `/api/leadScoring/by-grade/:grade` | unknown | leadScoring.route.js |
| `GET` | `/api/leadScoring/insights/:leadId` | unknown | leadScoring.route.js |
| `GET` | `/api/leadScoring/trends` | unknown | leadScoring.route.js |
| `GET` | `/api/leadScoring/conversion-analysis` | unknown | leadScoring.route.js |
| `POST` | `/api/leadScoring/track/email-open` | unknown | leadScoring.route.js |
| `POST` | `/api/leadScoring/track/email-click` | unknown | leadScoring.route.js |
| `POST` | `/api/leadScoring/track/document-view` | unknown | leadScoring.route.js |
| `POST` | `/api/leadScoring/track/website-visit` | unknown | leadScoring.route.js |
| `POST` | `/api/leadScoring/track/form-submit` | unknown | leadScoring.route.js |
| `POST` | `/api/leadScoring/track/meeting` | unknown | leadScoring.route.js |
| `POST` | `/api/leadScoring/track/call` | unknown | leadScoring.route.js |
| `POST` | `/api/leadScoring/process-decay` | unknown | leadScoring.route.js |

## leadSource

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/leadSource` | unknown | leadSource.route.js |
| `GET` | `/api/leadSource/:id` | unknown | leadSource.route.js |
| `POST` | `/api/leadSource` | unknown | leadSource.route.js |
| `POST` | `/api/leadSource/defaults` | unknown | leadSource.route.js |
| `PUT` | `/api/leadSource/:id` | unknown | leadSource.route.js |
| `DELETE` | `/api/leadSource/:id` | unknown | leadSource.route.js |

## leaveManagement

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/leaveManagement/leave-periods` | unknown | leaveManagement.route.js |
| `GET` | `/api/leaveManagement/leave-periods/current` | unknown | leaveManagement.route.js |
| `GET` | `/api/leaveManagement/leave-periods/:id` | unknown | leaveManagement.route.js |
| `POST` | `/api/leaveManagement/leave-periods` | unknown | leaveManagement.route.js |
| `PUT` | `/api/leaveManagement/leave-periods/:id` | unknown | leaveManagement.route.js |
| `DELETE` | `/api/leaveManagement/leave-periods/:id` | unknown | leaveManagement.route.js |
| `POST` | `/api/leaveManagement/leave-periods/:id/activate` | unknown | leaveManagement.route.js |
| `POST` | `/api/leaveManagement/leave-periods/:id/close` | unknown | leaveManagement.route.js |
| `GET` | `/api/leaveManagement/leave-policies` | unknown | leaveManagement.route.js |
| `GET` | `/api/leaveManagement/leave-policies/default` | unknown | leaveManagement.route.js |
| `GET` | `/api/leaveManagement/leave-policies/:id` | unknown | leaveManagement.route.js |
| `POST` | `/api/leaveManagement/leave-policies` | unknown | leaveManagement.route.js |
| `PUT` | `/api/leaveManagement/leave-policies/:id` | unknown | leaveManagement.route.js |
| `DELETE` | `/api/leaveManagement/leave-policies/:id` | unknown | leaveManagement.route.js |
| `POST` | `/api/leaveManagement/leave-policies/:id/clone` | unknown | leaveManagement.route.js |
| `GET` | `/api/leaveManagement/leave-allocations` | unknown | leaveManagement.route.js |
| `GET` | `/api/leaveManagement/leave-allocations/employee/:employeeId` | unknown | leaveManagement.route.js |
| `GET` | `/api/leaveManagement/leave-allocations/balance/:employeeId/:leaveTypeId` | unknown | leaveManagement.route.js |
| `GET` | `/api/leaveManagement/leave-allocations/:id` | unknown | leaveManagement.route.js |
| `POST` | `/api/leaveManagement/leave-allocations` | unknown | leaveManagement.route.js |
| `POST` | `/api/leaveManagement/leave-allocations/bulk` | unknown | leaveManagement.route.js |
| `PUT` | `/api/leaveManagement/leave-allocations/:id` | unknown | leaveManagement.route.js |
| `DELETE` | `/api/leaveManagement/leave-allocations/:id` | unknown | leaveManagement.route.js |
| `POST` | `/api/leaveManagement/leave-allocations/:id/approve` | unknown | leaveManagement.route.js |
| `POST` | `/api/leaveManagement/leave-allocations/:id/adjust` | unknown | leaveManagement.route.js |
| `POST` | `/api/leaveManagement/leave-allocations/generate` | unknown | leaveManagement.route.js |

## leaveRequest

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/leaveRequest/types` | getLeaveTypes | leaveRequest.route.js |
| `GET` | `/api/leaveRequest/stats` | getLeaveStats | leaveRequest.route.js |
| `GET` | `/api/leaveRequest/calendar` | getTeamCalendar | leaveRequest.route.js |
| `GET` | `/api/leaveRequest/pending-approvals` | getPendingApprovals | leaveRequest.route.js |
| `POST` | `/api/leaveRequest/check-conflicts` | checkConflicts | leaveRequest.route.js |
| `POST` | `/api/leaveRequest/bulk-delete` | bulkDeleteLeaveRequests | leaveRequest.route.js |
| `GET` | `/api/leaveRequest/balance/:employeeId` | getLeaveBalance | leaveRequest.route.js |
| `POST` | `/api/leaveRequest/:id/submit` | submitLeaveRequest | leaveRequest.route.js |
| `POST` | `/api/leaveRequest/:id/approve` | approveLeaveRequest | leaveRequest.route.js |
| `POST` | `/api/leaveRequest/:id/reject` | rejectLeaveRequest | leaveRequest.route.js |
| `POST` | `/api/leaveRequest/:id/cancel` | cancelLeaveRequest | leaveRequest.route.js |
| `POST` | `/api/leaveRequest/:id/confirm-return` | confirmReturn | leaveRequest.route.js |
| `POST` | `/api/leaveRequest/:id/request-extension` | requestExtension | leaveRequest.route.js |
| `POST` | `/api/leaveRequest/:id/complete-handover` | completeHandover | leaveRequest.route.js |
| `POST` | `/api/leaveRequest/:id/documents` | uploadDocument | leaveRequest.route.js |
| `GET` | `/api/leaveRequest` | getLeaveRequests | leaveRequest.route.js |
| `POST` | `/api/leaveRequest` | createLeaveRequest | leaveRequest.route.js |
| `GET` | `/api/leaveRequest/:id` | getLeaveRequest | leaveRequest.route.js |
| `PATCH` | `/api/leaveRequest/:id` | updateLeaveRequest | leaveRequest.route.js |
| `DELETE` | `/api/leaveRequest/:id` | deleteLeaveRequest | leaveRequest.route.js |

## legalContract

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/legalContract/search` | searchContracts | legalContract.route.js |
| `GET` | `/api/legalContract/expiring` | getExpiringContracts | legalContract.route.js |
| `GET` | `/api/legalContract/statistics` | getContractStatistics | legalContract.route.js |
| `GET` | `/api/legalContract/client/:clientId` | getContractsByClient | legalContract.route.js |
| `GET` | `/api/legalContract/templates` | getTemplates | legalContract.route.js |
| `POST` | `/api/legalContract/templates/:templateId/use` | createFromTemplate | legalContract.route.js |
| `GET` | `/api/legalContract` | listContracts | legalContract.route.js |
| `POST` | `/api/legalContract` | createContract | legalContract.route.js |
| `GET` | `/api/legalContract/:contractId` | getContract | legalContract.route.js |
| `PATCH` | `/api/legalContract/:contractId` | updateContract | legalContract.route.js |
| `DELETE` | `/api/legalContract/:contractId` | deleteContract | legalContract.route.js |
| `POST` | `/api/legalContract/:contractId/parties` | addParty | legalContract.route.js |
| `PATCH` | `/api/legalContract/:contractId/parties/:partyIndex` | updateParty | legalContract.route.js |
| `DELETE` | `/api/legalContract/:contractId/parties/:partyIndex` | removeParty | legalContract.route.js |
| `POST` | `/api/legalContract/:contractId/signatures/initiate` | initiateSignature | legalContract.route.js |
| `POST` | `/api/legalContract/:contractId/signatures/:partyIndex` | recordSignature | legalContract.route.js |
| `GET` | `/api/legalContract/:contractId/signatures` | getSignatureStatus | legalContract.route.js |
| `POST` | `/api/legalContract/:contractId/amendments` | addAmendment | legalContract.route.js |
| `GET` | `/api/legalContract/:contractId/amendments` | getAmendments | legalContract.route.js |
| `POST` | `/api/legalContract/:contractId/versions` | createVersion | legalContract.route.js |
| `GET` | `/api/legalContract/:contractId/versions` | getVersionHistory | legalContract.route.js |
| `POST` | `/api/legalContract/:contractId/versions/:versionNumber/revert` | revertToVersion | legalContract.route.js |
| `POST` | `/api/legalContract/:contractId/notarization` | recordNotarization | legalContract.route.js |
| `GET` | `/api/legalContract/:contractId/notarization/verify` | verifyNotarization | legalContract.route.js |
| `POST` | `/api/legalContract/:contractId/breach` | recordBreach | legalContract.route.js |
| `POST` | `/api/legalContract/:contractId/enforcement` | initiateEnforcement | legalContract.route.js |
| `PATCH` | `/api/legalContract/:contractId/enforcement` | updateEnforcementStatus | legalContract.route.js |
| `POST` | `/api/legalContract/:contractId/link-case` | linkToCase | legalContract.route.js |
| `POST` | `/api/legalContract/:contractId/reminders` | setReminder | legalContract.route.js |
| `GET` | `/api/legalContract/:contractId/reminders` | getReminders | legalContract.route.js |
| `GET` | `/api/legalContract/:contractId/export/pdf` | exportToPdf | legalContract.route.js |
| `GET` | `/api/legalContract/:contractId/export/word` | exportToWord | legalContract.route.js |
| `POST` | `/api/legalContract/:contractId/save-as-template` | saveAsTemplate | legalContract.route.js |

## legalDocument

| Method | Path | Controller | File |
|--------|------|------------|------|
| `POST` | `/api/legalDocument` | createDocument | legalDocument.route.js |
| `GET` | `/api/legalDocument` | getDocuments | legalDocument.route.js |
| `GET` | `/api/legalDocument/:_id` | getDocument | legalDocument.route.js |
| `PATCH` | `/api/legalDocument/:_id` | updateDocument | legalDocument.route.js |
| `DELETE` | `/api/legalDocument/:_id` | deleteDocument | legalDocument.route.js |
| `POST` | `/api/legalDocument/:_id/download` | incrementDownload | legalDocument.route.js |

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
| `GET` | `/api/matterBudget/alerts` | getBudgetAlerts | matterBudget.route.js |
| `GET` | `/api/matterBudget/templates` | getTemplates | matterBudget.route.js |
| `POST` | `/api/matterBudget/templates` | createTemplate | matterBudget.route.js |
| `PATCH` | `/api/matterBudget/templates/:id` | updateTemplate | matterBudget.route.js |
| `DELETE` | `/api/matterBudget/templates/:id` | deleteTemplate | matterBudget.route.js |
| `GET` | `/api/matterBudget/case/:caseId` | getBudgetByCase | matterBudget.route.js |
| `GET` | `/api/matterBudget` | getBudgets | matterBudget.route.js |
| `POST` | `/api/matterBudget` | createBudget | matterBudget.route.js |
| `GET` | `/api/matterBudget/:id` | getBudget | matterBudget.route.js |
| `PATCH` | `/api/matterBudget/:id` | updateBudget | matterBudget.route.js |
| `DELETE` | `/api/matterBudget/:id` | deleteBudget | matterBudget.route.js |
| `GET` | `/api/matterBudget/:id/analysis` | getBudgetAnalysis | matterBudget.route.js |
| `GET` | `/api/matterBudget/:id/entries` | getEntries | matterBudget.route.js |
| `POST` | `/api/matterBudget/:id/entries` | addEntry | matterBudget.route.js |
| `PATCH` | `/api/matterBudget/:id/entries/:entryId` | updateEntry | matterBudget.route.js |
| `DELETE` | `/api/matterBudget/:id/entries/:entryId` | deleteEntry | matterBudget.route.js |
| `POST` | `/api/matterBudget/:id/phases` | addPhase | matterBudget.route.js |
| `PATCH` | `/api/matterBudget/:id/phases/:phaseId` | updatePhase | matterBudget.route.js |
| `DELETE` | `/api/matterBudget/:id/phases/:phaseId` | deletePhase | matterBudget.route.js |

## message

| Method | Path | Controller | File |
|--------|------|------------|------|
| `POST` | `/api/message` | createMessage | message.route.js |
| `GET` | `/api/message/stats` | getMessageStats | message.route.js |
| `GET` | `/api/message/:conversationID` | getMessages | message.route.js |
| `PATCH` | `/api/message/:conversationID/read` | markAsRead | message.route.js |

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
| `POST` | `/api/mfa/setup` | setupMFA | mfa.route.js |
| `POST` | `/api/mfa/verify-setup` | verifySetup | mfa.route.js |
| `POST` | `/api/mfa/verify` | verifyMFA | mfa.route.js |
| `POST` | `/api/mfa/disable` | disableMFA | mfa.route.js |
| `GET` | `/api/mfa/status` | getMFAStatus | mfa.route.js |
| `POST` | `/api/mfa/backup-codes/generate` | generateBackupCodes | mfa.route.js |
| `POST` | `/api/mfa/backup-codes/verify` | verifyBackupCode | mfa.route.js |
| `POST` | `/api/mfa/backup-codes/regenerate` | regenerateBackupCodes | mfa.route.js |
| `GET` | `/api/mfa/backup-codes/count` | getBackupCodesCount | mfa.route.js |

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
| `GET` | `/api/mlScoring/scores` | unknown | mlScoring.route.js |
| `GET` | `/api/mlScoring/scores/:leadId` | unknown | mlScoring.route.js |
| `POST` | `/api/mlScoring/scores/:leadId/calculate` | unknown | mlScoring.route.js |
| `POST` | `/api/mlScoring/scores/batch` | unknown | mlScoring.route.js |
| `GET` | `/api/mlScoring/scores/:leadId/explanation` | unknown | mlScoring.route.js |
| `GET` | `/api/mlScoring/scores/:leadId/hybrid` | unknown | mlScoring.route.js |
| `POST` | `/api/mlScoring/train` | unknown | mlScoring.route.js |
| `GET` | `/api/mlScoring/model/metrics` | unknown | mlScoring.route.js |
| `POST` | `/api/mlScoring/model/export` | unknown | mlScoring.route.js |
| `GET` | `/api/mlScoring/priority-queue` | unknown | mlScoring.route.js |
| `GET` | `/api/mlScoring/priority-queue/workload` | unknown | mlScoring.route.js |
| `POST` | `/api/mlScoring/priority/:leadId/contact` | unknown | mlScoring.route.js |
| `PUT` | `/api/mlScoring/priority/:leadId/assign` | unknown | mlScoring.route.js |
| `GET` | `/api/mlScoring/sla/metrics` | unknown | mlScoring.route.js |
| `GET` | `/api/mlScoring/sla/breaches` | unknown | mlScoring.route.js |
| `GET` | `/api/mlScoring/analytics/dashboard` | unknown | mlScoring.route.js |
| `GET` | `/api/mlScoring/analytics/feature-importance` | unknown | mlScoring.route.js |
| `GET` | `/api/mlScoring/analytics/score-distribution` | unknown | mlScoring.route.js |

## notification

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/notification` | getNotifications | notification.route.js |
| `GET` | `/api/notification/unread-count` | getUnreadCount | notification.route.js |
| `PATCH` | `/api/notification/mark-all-read` | markAllAsRead | notification.route.js |
| `PATCH` | `/api/notification/mark-multiple-read` | markMultipleAsRead | notification.route.js |
| `DELETE` | `/api/notification/bulk-delete` | bulkDeleteNotifications | notification.route.js |
| `DELETE` | `/api/notification/clear-read` | clearReadNotifications | notification.route.js |
| `GET` | `/api/notification/by-type/:type` | getNotificationsByType | notification.route.js |
| `POST` | `/api/notification` | createNotificationEndpoint | notification.route.js |
| `GET` | `/api/notification/:id` | getNotification | notification.route.js |
| `PATCH` | `/api/notification/:id/read` | markAsRead | notification.route.js |
| `DELETE` | `/api/notification/:id` | deleteNotification | notification.route.js |

## notificationPreference

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/notificationPreference/defaults` | getDefaults | notificationPreference.route.js |
| `GET` | `/api/notificationPreference/stats` | getStats | notificationPreference.route.js |
| `POST` | `/api/notificationPreference/reset` | resetToDefaults | notificationPreference.route.js |
| `GET` | `/api/notificationPreference/quiet-hours/status` | checkQuietHours | notificationPreference.route.js |
| `PUT` | `/api/notificationPreference/quiet-hours` | updateQuietHours | notificationPreference.route.js |
| `POST` | `/api/notificationPreference/test` | testPreferences | notificationPreference.route.js |
| `GET` | `/api/notificationPreference` | getPreferences | notificationPreference.route.js |
| `PUT` | `/api/notificationPreference` | updatePreferences | notificationPreference.route.js |
| `PUT` | `/api/notificationPreference/channels/:channel` | updateChannelSettings | notificationPreference.route.js |
| `PUT` | `/api/notificationPreference/categories/:category` | updateCategoryPreferences | notificationPreference.route.js |
| `POST` | `/api/notificationPreference/mute/:category` | muteCategory | notificationPreference.route.js |
| `POST` | `/api/notificationPreference/unmute/:category` | unmuteCategory | notificationPreference.route.js |

## notificationSettings

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/notificationSettings` | unknown | notificationSettings.route.js |
| `PUT` | `/api/notificationSettings` | unknown | notificationSettings.route.js |
| `PUT` | `/api/notificationSettings/preferences/:type` | unknown | notificationSettings.route.js |
| `POST` | `/api/notificationSettings/mute/:type` | unknown | notificationSettings.route.js |
| `POST` | `/api/notificationSettings/unmute/:type` | unknown | notificationSettings.route.js |
| `POST` | `/api/notificationSettings/reset` | unknown | notificationSettings.route.js |

## oauth

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/oauth/providers` | getEnabledProviders | oauth.route.js |
| `POST` | `/api/oauth/initiate` | initiateSSO | oauth.route.js |
| `POST` | `/api/oauth/callback` | callbackPost | oauth.route.js |
| `POST` | `/api/oauth/:provider/callback` | unknown | oauth.route.js |
| `GET` | `/api/oauth/:providerType/authorize` | authorize | oauth.route.js |
| `GET` | `/api/oauth/:providerType/callback` | callback | oauth.route.js |
| `POST` | `/api/oauth/link` | linkAccount | oauth.route.js |
| `DELETE` | `/api/oauth/unlink/:providerType` | unlinkAccount | oauth.route.js |
| `GET` | `/api/oauth/linked` | getLinkedAccounts | oauth.route.js |
| `POST` | `/api/oauth/detect` | detectProvider | oauth.route.js |
| `GET` | `/api/oauth/domain/:domain` | getDomainConfig | oauth.route.js |
| `POST` | `/api/oauth/domain/:domain/verify/generate` | generateVerificationToken | oauth.route.js |
| `POST` | `/api/oauth/domain/:domain/verify` | verifyDomain | oauth.route.js |
| `POST` | `/api/oauth/domain/:domain/verify/manual` | manualVerifyDomain | oauth.route.js |
| `POST` | `/api/oauth/domain/:domain/cache/invalidate` | invalidateDomainCache | oauth.route.js |

## offboarding

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/offboarding/stats` | unknown | offboarding.route.js |
| `GET` | `/api/offboarding/pending-clearances` | unknown | offboarding.route.js |
| `GET` | `/api/offboarding/pending-settlements` | unknown | offboarding.route.js |
| `POST` | `/api/offboarding/bulk-delete` | unknown | offboarding.route.js |
| `GET` | `/api/offboarding/by-employee/:employeeId` | unknown | offboarding.route.js |
| `GET` | `/api/offboarding` | unknown | offboarding.route.js |
| `POST` | `/api/offboarding` | unknown | offboarding.route.js |
| `GET` | `/api/offboarding/:offboardingId` | unknown | offboarding.route.js |
| `PATCH` | `/api/offboarding/:offboardingId` | unknown | offboarding.route.js |
| `DELETE` | `/api/offboarding/:offboardingId` | unknown | offboarding.route.js |
| `PATCH` | `/api/offboarding/:offboardingId/status` | unknown | offboarding.route.js |
| `POST` | `/api/offboarding/:offboardingId/complete` | unknown | offboarding.route.js |
| `POST` | `/api/offboarding/:offboardingId/exit-interview` | unknown | offboarding.route.js |
| `POST` | `/api/offboarding/:offboardingId/clearance/items` | unknown | offboarding.route.js |
| `PATCH` | `/api/offboarding/:offboardingId/clearance/items/:itemId` | unknown | offboarding.route.js |
| `POST` | `/api/offboarding/:offboardingId/clearance/:section/complete` | unknown | offboarding.route.js |
| `POST` | `/api/offboarding/:offboardingId/calculate-settlement` | unknown | offboarding.route.js |
| `POST` | `/api/offboarding/:offboardingId/approve-settlement` | unknown | offboarding.route.js |
| `POST` | `/api/offboarding/:offboardingId/process-payment` | unknown | offboarding.route.js |
| `POST` | `/api/offboarding/:offboardingId/issue-experience-certificate` | unknown | offboarding.route.js |
| `PATCH` | `/api/offboarding/:offboardingId/rehire-eligibility` | unknown | offboarding.route.js |

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
| `GET` | `/api/okr/stats` | unknown | okr.route.js |
| `GET` | `/api/okr/tree` | unknown | okr.route.js |
| `GET` | `/api/okr` | unknown | okr.route.js |
| `GET` | `/api/okr/:id` | unknown | okr.route.js |
| `POST` | `/api/okr` | unknown | okr.route.js |
| `PATCH` | `/api/okr/:id` | unknown | okr.route.js |
| `POST` | `/api/okr/:id/activate` | unknown | okr.route.js |
| `PATCH` | `/api/okr/:id/key-results/:keyResultId` | unknown | okr.route.js |
| `POST` | `/api/okr/:id/check-in` | unknown | okr.route.js |
| `DELETE` | `/api/okr/:id` | unknown | okr.route.js |
| `GET` | `/api/okr/nine-box/distribution` | unknown | okr.route.js |
| `GET` | `/api/okr/nine-box/succession` | unknown | okr.route.js |
| `GET` | `/api/okr/nine-box/employee/:employeeId` | unknown | okr.route.js |
| `GET` | `/api/okr/nine-box` | unknown | okr.route.js |
| `POST` | `/api/okr/nine-box` | unknown | okr.route.js |

## onboarding

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/onboarding/stats` | unknown | onboarding.route.js |
| `GET` | `/api/onboarding/upcoming-reviews` | unknown | onboarding.route.js |
| `POST` | `/api/onboarding/bulk-delete` | unknown | onboarding.route.js |
| `GET` | `/api/onboarding/by-employee/:employeeId` | unknown | onboarding.route.js |
| `GET` | `/api/onboarding` | unknown | onboarding.route.js |
| `POST` | `/api/onboarding` | unknown | onboarding.route.js |
| `GET` | `/api/onboarding/:onboardingId` | unknown | onboarding.route.js |
| `PATCH` | `/api/onboarding/:onboardingId` | unknown | onboarding.route.js |
| `DELETE` | `/api/onboarding/:onboardingId` | unknown | onboarding.route.js |
| `PATCH` | `/api/onboarding/:onboardingId/status` | unknown | onboarding.route.js |
| `POST` | `/api/onboarding/:onboardingId/complete` | unknown | onboarding.route.js |
| `POST` | `/api/onboarding/:onboardingId/complete-first-day` | unknown | onboarding.route.js |
| `POST` | `/api/onboarding/:onboardingId/complete-first-week` | unknown | onboarding.route.js |
| `POST` | `/api/onboarding/:onboardingId/complete-first-month` | unknown | onboarding.route.js |
| `POST` | `/api/onboarding/:onboardingId/tasks/:taskId/complete` | unknown | onboarding.route.js |
| `POST` | `/api/onboarding/:onboardingId/probation-reviews` | unknown | onboarding.route.js |
| `POST` | `/api/onboarding/:onboardingId/complete-probation` | unknown | onboarding.route.js |
| `POST` | `/api/onboarding/:onboardingId/documents` | unknown | onboarding.route.js |
| `POST` | `/api/onboarding/:onboardingId/documents/:type/verify` | unknown | onboarding.route.js |
| `POST` | `/api/onboarding/:onboardingId/checklist/categories` | unknown | onboarding.route.js |
| `POST` | `/api/onboarding/:onboardingId/checklist/categories/:categoryId/tasks` | unknown | onboarding.route.js |
| `POST` | `/api/onboarding/:onboardingId/feedback` | unknown | onboarding.route.js |

## order

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/order` | getOrders | order.route.js |
| `POST` | `/api/order/create-payment-intent/:_id` | paymentIntent | order.route.js |
| `POST` | `/api/order/create-proposal-payment-intent/:_id` | proposalPaymentIntent | order.route.js |
| `PATCH` | `/api/order` | updatePaymentStatus | order.route.js |
| `POST` | `/api/order/create-test-contract/:_id` | createTestContract | order.route.js |
| `POST` | `/api/order/create-test-proposal-contract/:_id` | createTestProposalContract | order.route.js |

## organization

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/organization/search` | searchOrganizations | organization.route.js |
| `GET` | `/api/organization/client/:clientId` | getOrganizationsByClient | organization.route.js |
| `DELETE` | `/api/organization/bulk` | bulkDeleteOrganizations | organization.route.js |
| `POST` | `/api/organization/bulk-delete` | unknown | organization.route.js |
| `GET` | `/api/organization` | getOrganizations | organization.route.js |
| `POST` | `/api/organization` | createOrganization | organization.route.js |
| `GET` | `/api/organization/:id` | getOrganization | organization.route.js |
| `PUT` | `/api/organization/:id` | updateOrganization | organization.route.js |
| `PATCH` | `/api/organization/:id` | unknown | organization.route.js |
| `DELETE` | `/api/organization/:id` | deleteOrganization | organization.route.js |
| `POST` | `/api/organization/:id/link-case` | linkToCase | organization.route.js |
| `POST` | `/api/organization/:id/link-client` | linkToClient | organization.route.js |
| `POST` | `/api/organization/:id/link-contact` | linkToContact | organization.route.js |

## organizationTemplate

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/organizationTemplate/available` | unknown | organizationTemplate.route.js |
| `GET` | `/api/organizationTemplate/default` | unknown | organizationTemplate.route.js |
| `GET` | `/api/organizationTemplate/:id/preview` | unknown | organizationTemplate.route.js |
| `GET` | `/api/organizationTemplate/admin/stats` | unknown | organizationTemplate.route.js |
| `GET` | `/api/organizationTemplate/admin` | unknown | organizationTemplate.route.js |
| `POST` | `/api/organizationTemplate/admin` | unknown | organizationTemplate.route.js |
| `GET` | `/api/organizationTemplate/admin/:id` | unknown | organizationTemplate.route.js |
| `PUT` | `/api/organizationTemplate/admin/:id` | unknown | organizationTemplate.route.js |
| `DELETE` | `/api/organizationTemplate/admin/:id` | unknown | organizationTemplate.route.js |
| `POST` | `/api/organizationTemplate/admin/:id/clone` | unknown | organizationTemplate.route.js |
| `POST` | `/api/organizationTemplate/admin/:id/set-default` | unknown | organizationTemplate.route.js |
| `POST` | `/api/organizationTemplate/admin/:id/apply/:firmId` | unknown | organizationTemplate.route.js |
| `GET` | `/api/organizationTemplate/admin/:id/compare/:firmId` | unknown | organizationTemplate.route.js |

## organizationalUnit

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/organizationalUnit/stats` | unknown | organizationalUnit.route.js |
| `GET` | `/api/organizationalUnit/tree` | unknown | organizationalUnit.route.js |
| `GET` | `/api/organizationalUnit/export` | unknown | organizationalUnit.route.js |
| `GET` | `/api/organizationalUnit` | unknown | organizationalUnit.route.js |
| `POST` | `/api/organizationalUnit` | unknown | organizationalUnit.route.js |
| `POST` | `/api/organizationalUnit/bulk-delete` | unknown | organizationalUnit.route.js |
| `GET` | `/api/organizationalUnit/:id` | unknown | organizationalUnit.route.js |
| `PATCH` | `/api/organizationalUnit/:id` | unknown | organizationalUnit.route.js |
| `DELETE` | `/api/organizationalUnit/:id` | unknown | organizationalUnit.route.js |
| `GET` | `/api/organizationalUnit/:id/children` | unknown | organizationalUnit.route.js |
| `GET` | `/api/organizationalUnit/:id/path` | unknown | organizationalUnit.route.js |
| `POST` | `/api/organizationalUnit/:id/move` | unknown | organizationalUnit.route.js |
| `POST` | `/api/organizationalUnit/:id/dissolve` | unknown | organizationalUnit.route.js |
| `POST` | `/api/organizationalUnit/:id/activate` | unknown | organizationalUnit.route.js |
| `POST` | `/api/organizationalUnit/:id/deactivate` | unknown | organizationalUnit.route.js |
| `PATCH` | `/api/organizationalUnit/:id/headcount` | unknown | organizationalUnit.route.js |
| `PATCH` | `/api/organizationalUnit/:id/budget` | unknown | organizationalUnit.route.js |
| `POST` | `/api/organizationalUnit/:id/kpis` | unknown | organizationalUnit.route.js |
| `PATCH` | `/api/organizationalUnit/:id/kpis/:kpiId` | unknown | organizationalUnit.route.js |
| `DELETE` | `/api/organizationalUnit/:id/kpis/:kpiId` | unknown | organizationalUnit.route.js |
| `POST` | `/api/organizationalUnit/:id/leadership` | unknown | organizationalUnit.route.js |
| `PATCH` | `/api/organizationalUnit/:id/leadership/:positionId` | unknown | organizationalUnit.route.js |
| `DELETE` | `/api/organizationalUnit/:id/leadership/:positionId` | unknown | organizationalUnit.route.js |
| `POST` | `/api/organizationalUnit/:id/documents` | unknown | organizationalUnit.route.js |

## payment

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/payment/new` | getNewPaymentDefaults | payment.route.js |
| `GET` | `/api/payment/stats` | getPaymentStats | payment.route.js |
| `GET` | `/api/payment/summary` | getPaymentsSummary | payment.route.js |
| `GET` | `/api/payment/unreconciled` | getUnreconciledPayments | payment.route.js |
| `GET` | `/api/payment/pending-checks` | getPendingChecks | payment.route.js |
| `DELETE` | `/api/payment/bulk` | bulkDeletePayments | payment.route.js |
| `POST` | `/api/payment` | createPayment | payment.route.js |
| `GET` | `/api/payment` | getPayments | payment.route.js |
| `GET` | `/api/payment/:id` | getPayment | payment.route.js |
| `PUT` | `/api/payment/:id` | updatePayment | payment.route.js |
| `DELETE` | `/api/payment/:id` | deletePayment | payment.route.js |
| `POST` | `/api/payment/:id/complete` | completePayment | payment.route.js |
| `POST` | `/api/payment/:id/fail` | failPayment | payment.route.js |
| `POST` | `/api/payment/:id/refund` | createRefund | payment.route.js |
| `POST` | `/api/payment/:id/reconcile` | reconcilePayment | payment.route.js |
| `PUT` | `/api/payment/:id/apply` | applyPaymentToInvoices | payment.route.js |
| `DELETE` | `/api/payment/:id/unapply/:invoiceId` | unapplyPaymentFromInvoice | payment.route.js |
| `PUT` | `/api/payment/:id/check-status` | updateCheckStatus | payment.route.js |
| `POST` | `/api/payment/:id/send-receipt` | sendReceipt | payment.route.js |
| `POST` | `/api/payment/:id/receipt` | sendReceipt | payment.route.js |

## paymentReceipt

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/paymentReceipt` | getPaymentReceipts | paymentReceipt.route.js |
| `GET` | `/api/paymentReceipt/stats` | getReceiptStats | paymentReceipt.route.js |
| `GET` | `/api/paymentReceipt/:id` | getPaymentReceipt | paymentReceipt.route.js |
| `POST` | `/api/paymentReceipt` | createPaymentReceipt | paymentReceipt.route.js |
| `POST` | `/api/paymentReceipt/:id/void` | voidPaymentReceipt | paymentReceipt.route.js |
| `GET` | `/api/paymentReceipt/:id/download` | downloadReceipt | paymentReceipt.route.js |
| `POST` | `/api/paymentReceipt/:id/email` | emailReceipt | paymentReceipt.route.js |

## paymentTerms

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/paymentTerms` | getPaymentTerms | paymentTerms.route.js |
| `GET` | `/api/paymentTerms/default` | getDefaultTerm | paymentTerms.route.js |
| `POST` | `/api/paymentTerms/initialize` | initializeTemplates | paymentTerms.route.js |
| `GET` | `/api/paymentTerms/:id` | getPaymentTerm | paymentTerms.route.js |
| `POST` | `/api/paymentTerms/:id/calculate-due-date` | calculateDueDate | paymentTerms.route.js |
| `POST` | `/api/paymentTerms/:id/calculate-installments` | calculateInstallments | paymentTerms.route.js |
| `POST` | `/api/paymentTerms` | createPaymentTerm | paymentTerms.route.js |
| `PUT` | `/api/paymentTerms/:id` | updatePaymentTerm | paymentTerms.route.js |
| `POST` | `/api/paymentTerms/:id/set-default` | setAsDefault | paymentTerms.route.js |
| `DELETE` | `/api/paymentTerms/:id` | deletePaymentTerm | paymentTerms.route.js |

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
| `GET` | `/api/payroll/stats` | getPayrollStats | payroll.route.js |
| `POST` | `/api/payroll/generate` | generateBulkPayroll | payroll.route.js |
| `POST` | `/api/payroll/approve` | bulkApprove | payroll.route.js |
| `POST` | `/api/payroll/pay` | bulkPay | payroll.route.js |
| `POST` | `/api/payroll/bulk-delete` | bulkDeleteSalarySlips | payroll.route.js |
| `POST` | `/api/payroll/wps/submit` | submitToWPS | payroll.route.js |
| `POST` | `/api/payroll/:id/approve` | approveSalarySlip | payroll.route.js |
| `POST` | `/api/payroll/:id/pay` | paySalarySlip | payroll.route.js |
| `GET` | `/api/payroll` | getSalarySlips | payroll.route.js |
| `POST` | `/api/payroll` | createSalarySlip | payroll.route.js |
| `GET` | `/api/payroll/:id` | getSalarySlip | payroll.route.js |
| `PUT` | `/api/payroll/:id` | updateSalarySlip | payroll.route.js |
| `DELETE` | `/api/payroll/:id` | deleteSalarySlip | payroll.route.js |

## payrollRun

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/payrollRun/stats` | getPayrollRunStats | payrollRun.route.js |
| `POST` | `/api/payrollRun/bulk-delete` | bulkDeletePayrollRuns | payrollRun.route.js |
| `GET` | `/api/payrollRun` | getPayrollRuns | payrollRun.route.js |
| `POST` | `/api/payrollRun` | createPayrollRun | payrollRun.route.js |
| `GET` | `/api/payrollRun/:id` | getPayrollRun | payrollRun.route.js |
| `PATCH` | `/api/payrollRun/:id` | updatePayrollRun | payrollRun.route.js |
| `DELETE` | `/api/payrollRun/:id` | deletePayrollRun | payrollRun.route.js |
| `POST` | `/api/payrollRun/:id/calculate` | calculatePayroll | payrollRun.route.js |
| `POST` | `/api/payrollRun/:id/validate` | validatePayroll | payrollRun.route.js |
| `POST` | `/api/payrollRun/:id/approve` | approvePayroll | payrollRun.route.js |
| `POST` | `/api/payrollRun/:id/process-payments` | processPayments | payrollRun.route.js |
| `POST` | `/api/payrollRun/:id/cancel` | cancelPayroll | payrollRun.route.js |
| `POST` | `/api/payrollRun/:id/generate-wps` | generateWPS | payrollRun.route.js |
| `POST` | `/api/payrollRun/:id/send-notifications` | sendNotifications | payrollRun.route.js |
| `GET` | `/api/payrollRun/:id/export` | exportPayrollReport | payrollRun.route.js |
| `POST` | `/api/payrollRun/:id/employees/:empId/hold` | holdEmployee | payrollRun.route.js |
| `POST` | `/api/payrollRun/:id/employees/:empId/unhold` | unholdEmployee | payrollRun.route.js |
| `POST` | `/api/payrollRun/:id/employees/:empId/exclude` | excludeEmployee | payrollRun.route.js |
| `POST` | `/api/payrollRun/:id/employees/:empId/include` | includeEmployee | payrollRun.route.js |
| `POST` | `/api/payrollRun/:id/employees/:empId/recalculate` | recalculateSingleEmployee | payrollRun.route.js |

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
| `GET` | `/api/performanceReview/stats` | unknown | performanceReview.route.js |
| `GET` | `/api/performanceReview/overdue` | unknown | performanceReview.route.js |
| `GET` | `/api/performanceReview/templates` | unknown | performanceReview.route.js |
| `POST` | `/api/performanceReview/templates` | unknown | performanceReview.route.js |
| `PATCH` | `/api/performanceReview/templates/:id` | unknown | performanceReview.route.js |
| `GET` | `/api/performanceReview/calibration-sessions` | unknown | performanceReview.route.js |
| `POST` | `/api/performanceReview/calibration-sessions` | unknown | performanceReview.route.js |
| `POST` | `/api/performanceReview/calibration-sessions/:id/complete` | unknown | performanceReview.route.js |
| `POST` | `/api/performanceReview/bulk-create` | unknown | performanceReview.route.js |
| `POST` | `/api/performanceReview/bulk-delete` | unknown | performanceReview.route.js |
| `GET` | `/api/performanceReview/employee/:employeeId/history` | unknown | performanceReview.route.js |
| `GET` | `/api/performanceReview/team/:managerId/summary` | unknown | performanceReview.route.js |
| `GET` | `/api/performanceReview` | unknown | performanceReview.route.js |
| `POST` | `/api/performanceReview` | unknown | performanceReview.route.js |
| `GET` | `/api/performanceReview/:id` | unknown | performanceReview.route.js |
| `PATCH` | `/api/performanceReview/:id` | unknown | performanceReview.route.js |
| `DELETE` | `/api/performanceReview/:id` | unknown | performanceReview.route.js |
| `POST` | `/api/performanceReview/:id/self-assessment` | unknown | performanceReview.route.js |
| `POST` | `/api/performanceReview/:id/manager-assessment` | unknown | performanceReview.route.js |
| `POST` | `/api/performanceReview/:id/360-feedback/request` | unknown | performanceReview.route.js |
| `POST` | `/api/performanceReview/:id/360-feedback/:providerId` | unknown | performanceReview.route.js |
| `POST` | `/api/performanceReview/:id/development-plan` | unknown | performanceReview.route.js |
| `PATCH` | `/api/performanceReview/:id/development-plan/:itemId` | unknown | performanceReview.route.js |
| `POST` | `/api/performanceReview/:id/calibration` | unknown | performanceReview.route.js |
| `POST` | `/api/performanceReview/:id/calibration/apply` | unknown | performanceReview.route.js |
| `POST` | `/api/performanceReview/:id/complete` | unknown | performanceReview.route.js |
| `POST` | `/api/performanceReview/:id/acknowledge` | unknown | performanceReview.route.js |
| `POST` | `/api/performanceReview/:id/reminder` | unknown | performanceReview.route.js |

## permission

| Method | Path | Controller | File |
|--------|------|------------|------|
| `POST` | `/api/permission/check` | checkPermission | permission.route.js |
| `POST` | `/api/permission/check-batch` | checkPermissionBatch | permission.route.js |
| `GET` | `/api/permission/my-permissions` | getMyPermissions | permission.route.js |
| `GET` | `/api/permission/expand/:namespace/:resourceId/:relation` | expandPermissions | permission.route.js |
| `GET` | `/api/permission/user-resources/:userId` | getUserResources | permission.route.js |
| `GET` | `/api/permission/config` | getPermissionConfig | permission.route.js |
| `PUT` | `/api/permission/config` | updatePermissionConfig | permission.route.js |
| `POST` | `/api/permission/policies` | addPolicy | permission.route.js |
| `PUT` | `/api/permission/policies/:policyId` | updatePolicy | permission.route.js |
| `DELETE` | `/api/permission/policies/:policyId` | deletePolicy | permission.route.js |
| `GET` | `/api/permission/relations/stats` | getRelationStats | permission.route.js |
| `POST` | `/api/permission/relations` | grantRelation | permission.route.js |
| `DELETE` | `/api/permission/relations` | revokeRelation | permission.route.js |
| `GET` | `/api/permission/relations/:namespace/:object` | getResourceRelations | permission.route.js |
| `GET` | `/api/permission/decisions` | getDecisionLogs | permission.route.js |
| `GET` | `/api/permission/decisions/stats` | getDecisionStats | permission.route.js |
| `GET` | `/api/permission/decisions/denied` | getDeniedAttempts | permission.route.js |
| `GET` | `/api/permission/decisions/compliance-report` | getComplianceReport | permission.route.js |
| `GET` | `/api/permission/cache/stats` | getCacheStats | permission.route.js |
| `POST` | `/api/permission/cache/clear` | clearCache | permission.route.js |
| `GET` | `/api/permission/ui/sidebar` | getVisibleSidebar | permission.route.js |
| `GET` | `/api/permission/ui/sidebar/all` | getAllSidebarItems | permission.route.js |
| `PUT` | `/api/permission/ui/sidebar/:itemId/visibility` | updateSidebarVisibility | permission.route.js |
| `POST` | `/api/permission/ui/check-page` | checkPageAccess | permission.route.js |
| `GET` | `/api/permission/ui/pages/all` | getAllPageAccess | permission.route.js |
| `PUT` | `/api/permission/ui/pages/:pageId/access` | updatePageAccessForRole | permission.route.js |
| `GET` | `/api/permission/ui/config` | getUIAccessConfig | permission.route.js |
| `PUT` | `/api/permission/ui/config` | updateUIAccessConfig | permission.route.js |
| `GET` | `/api/permission/ui/matrix` | getAccessMatrix | permission.route.js |
| `PUT` | `/api/permission/ui/roles/:role/bulk` | bulkUpdateRoleAccess | permission.route.js |
| `POST` | `/api/permission/ui/overrides` | addUserOverride | permission.route.js |
| `DELETE` | `/api/permission/ui/overrides/:userId` | removeUserOverride | permission.route.js |

## plan

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/plan` | unknown | plan.route.js |
| `GET` | `/api/plan/features` | unknown | plan.route.js |
| `GET` | `/api/plan/current` | unknown | plan.route.js |
| `GET` | `/api/plan/usage` | unknown | plan.route.js |
| `GET` | `/api/plan/limits` | unknown | plan.route.js |
| `POST` | `/api/plan/start-trial` | unknown | plan.route.js |
| `POST` | `/api/plan/upgrade` | unknown | plan.route.js |
| `POST` | `/api/plan/cancel` | unknown | plan.route.js |

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
| `GET` | `/api/priceLevel` | getPriceLevels | priceLevel.route.js |
| `GET` | `/api/priceLevel/client-rate` | getClientRate | priceLevel.route.js |
| `GET` | `/api/priceLevel/:id` | getPriceLevel | priceLevel.route.js |
| `POST` | `/api/priceLevel` | createPriceLevel | priceLevel.route.js |
| `PUT` | `/api/priceLevel/:id` | updatePriceLevel | priceLevel.route.js |
| `DELETE` | `/api/priceLevel/:id` | deletePriceLevel | priceLevel.route.js |
| `POST` | `/api/priceLevel/:id/set-default` | setDefault | priceLevel.route.js |

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

## proposal

| Method | Path | Controller | File |
|--------|------|------------|------|
| `POST` | `/api/proposal` | createProposal | proposal.route.js |
| `GET` | `/api/proposal/job/:jobId` | getJobProposals | proposal.route.js |
| `GET` | `/api/proposal/my-proposals` | getMyProposals | proposal.route.js |
| `PATCH` | `/api/proposal/accept/:_id` | acceptProposal | proposal.route.js |
| `PATCH` | `/api/proposal/reject/:_id` | rejectProposal | proposal.route.js |
| `PATCH` | `/api/proposal/withdraw/:_id` | withdrawProposal | proposal.route.js |

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
| `POST` | `/api/question` | createQuestion | question.route.js |
| `GET` | `/api/question` | getQuestions | question.route.js |
| `GET` | `/api/question/:_id` | getQuestion | question.route.js |
| `PATCH` | `/api/question/:_id` | updateQuestion | question.route.js |
| `DELETE` | `/api/question/:_id` | deleteQuestion | question.route.js |

## queue

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/queue` | unknown | queue.route.js |
| `GET` | `/api/queue/:name` | unknown | queue.route.js |
| `GET` | `/api/queue/:name/jobs` | unknown | queue.route.js |
| `GET` | `/api/queue/:name/jobs/:jobId` | unknown | queue.route.js |
| `GET` | `/api/queue/:name/counts` | unknown | queue.route.js |
| `POST` | `/api/queue/:name/retry/:jobId` | unknown | queue.route.js |
| `DELETE` | `/api/queue/:name/jobs/:jobId` | unknown | queue.route.js |
| `POST` | `/api/queue/:name/pause` | unknown | queue.route.js |
| `POST` | `/api/queue/:name/resume` | unknown | queue.route.js |
| `POST` | `/api/queue/:name/clean` | unknown | queue.route.js |
| `POST` | `/api/queue/:name/empty` | unknown | queue.route.js |
| `POST` | `/api/queue/:name/jobs` | unknown | queue.route.js |
| `POST` | `/api/queue/:name/jobs/bulk` | unknown | queue.route.js |

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
| `GET` | `/api/rateCard/client/:clientId` | getRateCardForClient | rateCard.route.js |
| `GET` | `/api/rateCard/case/:caseId` | getRateCardForCase | rateCard.route.js |
| `POST` | `/api/rateCard/calculate` | calculateRate | rateCard.route.js |
| `GET` | `/api/rateCard` | getRateCards | rateCard.route.js |
| `POST` | `/api/rateCard` | createRateCard | rateCard.route.js |
| `GET` | `/api/rateCard/:id` | getRateCard | rateCard.route.js |
| `PATCH` | `/api/rateCard/:id` | updateRateCard | rateCard.route.js |
| `DELETE` | `/api/rateCard/:id` | deleteRateCard | rateCard.route.js |
| `POST` | `/api/rateCard/:id/rates` | addCustomRate | rateCard.route.js |
| `PATCH` | `/api/rateCard/:id/rates/:rateId` | updateCustomRate | rateCard.route.js |
| `DELETE` | `/api/rateCard/:id/rates/:rateId` | removeCustomRate | rateCard.route.js |

## rateGroup

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/rateGroup/default` | getDefaultRateGroup | rateGroup.route.js |
| `GET` | `/api/rateGroup` | getRateGroups | rateGroup.route.js |
| `POST` | `/api/rateGroup` | createRateGroup | rateGroup.route.js |
| `GET` | `/api/rateGroup/:id` | getRateGroup | rateGroup.route.js |
| `PATCH` | `/api/rateGroup/:id` | updateRateGroup | rateGroup.route.js |
| `DELETE` | `/api/rateGroup/:id` | deleteRateGroup | rateGroup.route.js |
| `POST` | `/api/rateGroup/:id/rates` | addRateToGroup | rateGroup.route.js |
| `DELETE` | `/api/rateGroup/:id/rates/:rateId` | removeRateFromGroup | rateGroup.route.js |
| `POST` | `/api/rateGroup/:id/duplicate` | duplicateRateGroup | rateGroup.route.js |

## rateLimit

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/rateLimit/config` | getConfig | rateLimit.route.js |
| `GET` | `/api/rateLimit/overview` | getOverview | rateLimit.route.js |
| `GET` | `/api/rateLimit/tiers/:tier` | getTierConfig | rateLimit.route.js |
| `GET` | `/api/rateLimit/effective` | getEffectiveLimitEndpoint | rateLimit.route.js |
| `GET` | `/api/rateLimit/users/:userId` | getUserLimits | rateLimit.route.js |
| `GET` | `/api/rateLimit/users/:userId/stats` | getUserStats | rateLimit.route.js |
| `POST` | `/api/rateLimit/users/:userId/reset` | resetUserLimit | rateLimit.route.js |
| `POST` | `/api/rateLimit/users/:userId/adjust` | adjustUserLimit | rateLimit.route.js |
| `GET` | `/api/rateLimit/firms/:firmId` | getFirmLimits | rateLimit.route.js |
| `GET` | `/api/rateLimit/firms/:firmId/top-users` | getTopUsersForFirm | rateLimit.route.js |
| `GET` | `/api/rateLimit/firms/:firmId/throttled` | getThrottledRequestsForFirm | rateLimit.route.js |
| `POST` | `/api/rateLimit/firms/:firmId/reset` | resetFirmLimit | rateLimit.route.js |

## recruitment

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/recruitment/stats` | unknown | recruitment.route.js |
| `GET` | `/api/recruitment/talent-pool` | unknown | recruitment.route.js |
| `GET` | `/api/recruitment/jobs/nearing-deadline` | unknown | recruitment.route.js |
| `GET` | `/api/recruitment/jobs/stats` | unknown | recruitment.route.js |
| `GET` | `/api/recruitment/jobs` | unknown | recruitment.route.js |
| `POST` | `/api/recruitment/jobs` | unknown | recruitment.route.js |
| `GET` | `/api/recruitment/jobs/:id` | unknown | recruitment.route.js |
| `PATCH` | `/api/recruitment/jobs/:id` | unknown | recruitment.route.js |
| `DELETE` | `/api/recruitment/jobs/:id` | unknown | recruitment.route.js |
| `POST` | `/api/recruitment/jobs/:id/status` | unknown | recruitment.route.js |
| `POST` | `/api/recruitment/jobs/:id/publish` | unknown | recruitment.route.js |
| `POST` | `/api/recruitment/jobs/:id/clone` | unknown | recruitment.route.js |
| `GET` | `/api/recruitment/jobs/:id/pipeline` | unknown | recruitment.route.js |
| `POST` | `/api/recruitment/applicants/bulk-stage-update` | unknown | recruitment.route.js |
| `POST` | `/api/recruitment/applicants/bulk-reject` | unknown | recruitment.route.js |
| `POST` | `/api/recruitment/applicants/bulk-delete` | unknown | recruitment.route.js |
| `GET` | `/api/recruitment/applicants/stats` | unknown | recruitment.route.js |
| `GET` | `/api/recruitment/applicants` | unknown | recruitment.route.js |
| `POST` | `/api/recruitment/applicants` | unknown | recruitment.route.js |
| `GET` | `/api/recruitment/applicants/:id` | unknown | recruitment.route.js |
| `PATCH` | `/api/recruitment/applicants/:id` | unknown | recruitment.route.js |
| `DELETE` | `/api/recruitment/applicants/:id` | unknown | recruitment.route.js |
| `POST` | `/api/recruitment/applicants/:id/stage` | unknown | recruitment.route.js |
| `POST` | `/api/recruitment/applicants/:id/reject` | unknown | recruitment.route.js |
| `POST` | `/api/recruitment/applicants/:id/hire` | unknown | recruitment.route.js |
| `PATCH` | `/api/recruitment/applicants/:id/talent-pool` | unknown | recruitment.route.js |
| `POST` | `/api/recruitment/applicants/:id/interviews` | unknown | recruitment.route.js |
| `PATCH` | `/api/recruitment/applicants/:id/interviews/:interviewId` | unknown | recruitment.route.js |
| `POST` | `/api/recruitment/applicants/:id/interviews/:interviewId/feedback` | unknown | recruitment.route.js |
| `POST` | `/api/recruitment/applicants/:id/assessments` | unknown | recruitment.route.js |
| `PATCH` | `/api/recruitment/applicants/:id/assessments/:assessmentId` | unknown | recruitment.route.js |
| `POST` | `/api/recruitment/applicants/:id/offers` | unknown | recruitment.route.js |
| `PATCH` | `/api/recruitment/applicants/:id/offers/:offerId` | unknown | recruitment.route.js |
| `POST` | `/api/recruitment/applicants/:id/references` | unknown | recruitment.route.js |
| `PATCH` | `/api/recruitment/applicants/:id/references/:referenceId` | unknown | recruitment.route.js |
| `POST` | `/api/recruitment/applicants/:id/background-check` | unknown | recruitment.route.js |
| `PATCH` | `/api/recruitment/applicants/:id/background-check` | unknown | recruitment.route.js |
| `POST` | `/api/recruitment/applicants/:id/notes` | unknown | recruitment.route.js |
| `POST` | `/api/recruitment/applicants/:id/communications` | unknown | recruitment.route.js |

## recurringInvoice

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/recurringInvoice` | getRecurringInvoices | recurringInvoice.route.js |
| `GET` | `/api/recurringInvoice/stats` | getStats | recurringInvoice.route.js |
| `GET` | `/api/recurringInvoice/:id` | getRecurringInvoice | recurringInvoice.route.js |
| `GET` | `/api/recurringInvoice/:id/history` | getGeneratedHistory | recurringInvoice.route.js |
| `GET` | `/api/recurringInvoice/:id/preview` | previewNextInvoice | recurringInvoice.route.js |
| `POST` | `/api/recurringInvoice` | createRecurringInvoice | recurringInvoice.route.js |
| `PUT` | `/api/recurringInvoice/:id` | updateRecurringInvoice | recurringInvoice.route.js |
| `POST` | `/api/recurringInvoice/:id/pause` | pauseRecurringInvoice | recurringInvoice.route.js |
| `POST` | `/api/recurringInvoice/:id/resume` | resumeRecurringInvoice | recurringInvoice.route.js |
| `POST` | `/api/recurringInvoice/:id/cancel` | cancelRecurringInvoice | recurringInvoice.route.js |
| `POST` | `/api/recurringInvoice/:id/generate` | generateNow | recurringInvoice.route.js |
| `POST` | `/api/recurringInvoice/:id/duplicate` | duplicateRecurringInvoice | recurringInvoice.route.js |
| `DELETE` | `/api/recurringInvoice/:id` | deleteRecurringInvoice | recurringInvoice.route.js |

## recurringTransaction

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/recurringTransaction` | getRecurringTransactions | recurringTransaction.route.js |
| `GET` | `/api/recurringTransaction/upcoming` | getUpcomingTransactions | recurringTransaction.route.js |
| `POST` | `/api/recurringTransaction/process-due` | processDueTransactions | recurringTransaction.route.js |
| `GET` | `/api/recurringTransaction/:id` | getRecurringTransaction | recurringTransaction.route.js |
| `POST` | `/api/recurringTransaction` | createRecurringTransaction | recurringTransaction.route.js |
| `PUT` | `/api/recurringTransaction/:id` | updateRecurringTransaction | recurringTransaction.route.js |
| `POST` | `/api/recurringTransaction/:id/pause` | pauseRecurringTransaction | recurringTransaction.route.js |
| `POST` | `/api/recurringTransaction/:id/resume` | resumeRecurringTransaction | recurringTransaction.route.js |
| `POST` | `/api/recurringTransaction/:id/cancel` | cancelRecurringTransaction | recurringTransaction.route.js |
| `POST` | `/api/recurringTransaction/:id/generate` | generateTransaction | recurringTransaction.route.js |

## referral

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/referral/stats` | unknown | referral.route.js |
| `GET` | `/api/referral/top` | unknown | referral.route.js |
| `POST` | `/api/referral` | unknown | referral.route.js |
| `GET` | `/api/referral` | unknown | referral.route.js |
| `GET` | `/api/referral/:id` | unknown | referral.route.js |
| `PUT` | `/api/referral/:id` | unknown | referral.route.js |
| `DELETE` | `/api/referral/:id` | unknown | referral.route.js |
| `POST` | `/api/referral/:id/leads` | unknown | referral.route.js |
| `POST` | `/api/referral/:id/leads/:leadId/convert` | unknown | referral.route.js |
| `POST` | `/api/referral/:id/payments` | unknown | referral.route.js |
| `GET` | `/api/referral/:id/calculate-fee` | unknown | referral.route.js |

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
| `GET` | `/api/regionalBanks/countries` | unknown | regionalBanks.route.js |
| `GET` | `/api/regionalBanks/countries/:countryCode/banks` | unknown | regionalBanks.route.js |
| `GET` | `/api/regionalBanks/find-by-iban` | unknown | regionalBanks.route.js |
| `GET` | `/api/regionalBanks/stats` | unknown | regionalBanks.route.js |
| `POST` | `/api/regionalBanks/connect` | unknown | regionalBanks.route.js |
| `GET` | `/api/regionalBanks/callback` | unknown | regionalBanks.route.js |
| `POST` | `/api/regionalBanks/sync/:accountId` | unknown | regionalBanks.route.js |
| `GET` | `/api/regionalBanks/status/:accountId` | unknown | regionalBanks.route.js |
| `POST` | `/api/regionalBanks/disconnect/:accountId` | unknown | regionalBanks.route.js |

## reminder

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/reminder/location/summary` | getLocationRemindersSummary | reminder.route.js |
| `GET` | `/api/reminder/location/locations` | getUserLocations | reminder.route.js |
| `POST` | `/api/reminder/location` | createLocationReminder | reminder.route.js |
| `POST` | `/api/reminder/location/check` | checkLocationTriggers | reminder.route.js |
| `POST` | `/api/reminder/location/nearby` | getNearbyReminders | reminder.route.js |
| `POST` | `/api/reminder/location/save` | saveUserLocation | reminder.route.js |
| `POST` | `/api/reminder/location/distance` | calculateDistance | reminder.route.js |
| `PUT` | `/api/reminder/location/locations/:locationId` | updateUserLocation | reminder.route.js |
| `DELETE` | `/api/reminder/location/locations/:locationId` | deleteUserLocation | reminder.route.js |
| `POST` | `/api/reminder/location/:reminderId/reset` | resetLocationTrigger | reminder.route.js |
| `GET` | `/api/reminder/stats` | getReminderStats | reminder.route.js |
| `GET` | `/api/reminder/upcoming` | getUpcomingReminders | reminder.route.js |
| `GET` | `/api/reminder/overdue` | getOverdueReminders | reminder.route.js |
| `GET` | `/api/reminder/snoozed-due` | getSnoozedDueReminders | reminder.route.js |
| `GET` | `/api/reminder/delegated` | getDelegatedReminders | reminder.route.js |
| `GET` | `/api/reminder/client/:clientId` | getRemindersByClient | reminder.route.js |
| `GET` | `/api/reminder/case/:caseId` | getRemindersByCase | reminder.route.js |
| `POST` | `/api/reminder/from-task/:taskId` | createReminderFromTask | reminder.route.js |
| `POST` | `/api/reminder/from-event/:eventId` | createReminderFromEvent | reminder.route.js |
| `POST` | `/api/reminder/parse` | createReminderFromNaturalLanguage | reminder.route.js |
| `POST` | `/api/reminder/voice` | createReminderFromVoice | reminder.route.js |
| `POST` | `/api/reminder/bulk` | bulkCreateReminders | reminder.route.js |
| `PUT` | `/api/reminder/bulk` | bulkUpdateReminders | reminder.route.js |
| `DELETE` | `/api/reminder/bulk` | bulkDeleteReminders | reminder.route.js |
| `POST` | `/api/reminder/bulk/complete` | bulkCompleteReminders | reminder.route.js |
| `POST` | `/api/reminder/bulk/archive` | bulkArchiveReminders | reminder.route.js |
| `POST` | `/api/reminder/bulk/unarchive` | bulkUnarchiveReminders | reminder.route.js |
| `GET` | `/api/reminder/export` | exportReminders | reminder.route.js |
| `GET` | `/api/reminder/ids` | getAllReminderIds | reminder.route.js |
| `GET` | `/api/reminder/archived` | getArchivedReminders | reminder.route.js |
| `PATCH` | `/api/reminder/reorder` | reorderReminders | reminder.route.js |
| `GET` | `/api/reminder/search` | searchReminders | reminder.route.js |
| `GET` | `/api/reminder/conflicts` | getReminderConflicts | reminder.route.js |
| `POST` | `/api/reminder` | createReminder | reminder.route.js |
| `GET` | `/api/reminder` | getReminders | reminder.route.js |
| `GET` | `/api/reminder/:id` | getReminder | reminder.route.js |
| `PUT` | `/api/reminder/:id` | updateReminder | reminder.route.js |
| `PATCH` | `/api/reminder/:id` | updateReminder | reminder.route.js |
| `DELETE` | `/api/reminder/:id` | deleteReminder | reminder.route.js |
| `POST` | `/api/reminder/:id/complete` | completeReminder | reminder.route.js |
| `POST` | `/api/reminder/:id/dismiss` | dismissReminder | reminder.route.js |
| `POST` | `/api/reminder/:id/snooze` | snoozeReminder | reminder.route.js |
| `POST` | `/api/reminder/:id/delegate` | delegateReminder | reminder.route.js |
| `POST` | `/api/reminder/:id/clone` | cloneReminder | reminder.route.js |
| `POST` | `/api/reminder/:id/reschedule` | rescheduleReminder | reminder.route.js |
| `GET` | `/api/reminder/:id/activity` | getReminderActivity | reminder.route.js |
| `POST` | `/api/reminder/:id/archive` | archiveReminder | reminder.route.js |
| `POST` | `/api/reminder/:id/unarchive` | unarchiveReminder | reminder.route.js |

## report

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/report/profit-loss` | getProfitLossReport | report.route.js |
| `GET` | `/api/report/balance-sheet` | getBalanceSheetReport | report.route.js |
| `GET` | `/api/report/case-profitability` | getCaseProfitabilityReport | report.route.js |
| `GET` | `/api/report/ar-aging` | getARAgingReport | report.route.js |
| `GET` | `/api/report/trial-balance` | getTrialBalanceReport | report.route.js |
| `GET` | `/api/report/budget-variance` | getBudgetVarianceReport | report.route.js |
| `GET` | `/api/report/ap-aging` | getAPAgingReport | report.route.js |
| `GET` | `/api/report/client-statement` | getClientStatement | report.route.js |
| `GET` | `/api/report/vendor-ledger` | getVendorLedger | report.route.js |
| `GET` | `/api/report/gross-profit` | getGrossProfitReport | report.route.js |
| `GET` | `/api/report/cost-center` | getCostCenterReport | report.route.js |
| `GET` | `/api/report/cases-chart` | getCasesChart | report.route.js |
| `GET` | `/api/report/revenue-chart` | getRevenueChart | report.route.js |
| `GET` | `/api/report/tasks-chart` | getTasksChart | report.route.js |
| `POST` | `/api/report/export` | exportReport | report.route.js |
| `POST` | `/api/report/generate` | createReport | report.route.js |
| `GET` | `/api/report` | listReports | report.route.js |
| `GET` | `/api/report/:id` | getReport | report.route.js |
| `DELETE` | `/api/report/:id` | deleteReport | report.route.js |
| `POST` | `/api/report/:id/execute` | executeReport | report.route.js |
| `PUT` | `/api/report/:id/schedule` | updateSchedule | report.route.js |

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
| `POST` | `/api/retainer` | createRetainer | retainer.route.js |
| `GET` | `/api/retainer` | getRetainers | retainer.route.js |
| `GET` | `/api/retainer/stats` | getRetainerStats | retainer.route.js |
| `GET` | `/api/retainer/low-balance` | getLowBalanceRetainers | retainer.route.js |
| `GET` | `/api/retainer/:id` | getRetainer | retainer.route.js |
| `PUT` | `/api/retainer/:id` | updateRetainer | retainer.route.js |
| `POST` | `/api/retainer/:id/consume` | consumeRetainer | retainer.route.js |
| `POST` | `/api/retainer/:id/replenish` | replenishRetainer | retainer.route.js |
| `POST` | `/api/retainer/:id/refund` | refundRetainer | retainer.route.js |
| `GET` | `/api/retainer/:id/history` | getRetainerHistory | retainer.route.js |

## review

| Method | Path | Controller | File |
|--------|------|------------|------|
| `POST` | `/api/review` | createReview | review.route.js |
| `GET` | `/api/review/:gigID` | getReview | review.route.js |
| `DELETE` | `/api/review/:_id` | deleteReview | review.route.js |

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
| `GET` | `/api/salesQuota/leaderboard` | getLeaderboard | salesQuota.route.js |
| `GET` | `/api/salesQuota/team-summary` | getTeamSummary | salesQuota.route.js |
| `GET` | `/api/salesQuota/my-quota` | getMyQuota | salesQuota.route.js |
| `GET` | `/api/salesQuota/period-comparison` | getPeriodComparison | salesQuota.route.js |
| `POST` | `/api/salesQuota` | createQuota | salesQuota.route.js |
| `GET` | `/api/salesQuota` | getQuotas | salesQuota.route.js |
| `GET` | `/api/salesQuota/:id` | getQuota | salesQuota.route.js |
| `PUT` | `/api/salesQuota/:id` | updateQuota | salesQuota.route.js |
| `PATCH` | `/api/salesQuota/:id` | updateQuota | salesQuota.route.js |
| `DELETE` | `/api/salesQuota/:id` | deleteQuota | salesQuota.route.js |
| `POST` | `/api/salesQuota/:id/record-deal` | recordDeal | salesQuota.route.js |

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
| `GET` | `/api/saml/metadata/:firmId` | getSPMetadata | saml.route.js |
| `GET` | `/api/saml/login/:firmId` | initiateLogin | saml.route.js |
| `POST` | `/api/saml/acs/:firmId` | assertionConsumerService | saml.route.js |
| `GET` | `/api/saml/logout/:firmId` | initiateSingleLogout | saml.route.js |
| `POST` | `/api/saml/sls/:firmId` | singleLogoutService | saml.route.js |
| `GET` | `/api/saml/config` | getSAMLConfig | saml.route.js |
| `PUT` | `/api/saml/config` | updateSAMLConfig | saml.route.js |
| `POST` | `/api/saml/config/test` | testSAMLConfig | saml.route.js |

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
| `GET` | `/api/saudiBanking/lean/banks` | unknown | saudiBanking.route.js |
| `GET` | `/api/saudiBanking/lean/customers` | unknown | saudiBanking.route.js |
| `POST` | `/api/saudiBanking/lean/customers` | unknown | saudiBanking.route.js |
| `GET` | `/api/saudiBanking/lean/customers/:customerId/token` | unknown | saudiBanking.route.js |
| `GET` | `/api/saudiBanking/lean/customers/:customerId/entities` | unknown | saudiBanking.route.js |
| `GET` | `/api/saudiBanking/lean/entities/:entityId/accounts` | unknown | saudiBanking.route.js |
| `GET` | `/api/saudiBanking/lean/accounts/:accountId/balance` | unknown | saudiBanking.route.js |
| `GET` | `/api/saudiBanking/lean/accounts/:accountId/transactions` | unknown | saudiBanking.route.js |
| `GET` | `/api/saudiBanking/lean/entities/:entityId/identity` | unknown | saudiBanking.route.js |
| `POST` | `/api/saudiBanking/lean/payments` | unknown | saudiBanking.route.js |
| `DELETE` | `/api/saudiBanking/lean/entities/:entityId` | unknown | saudiBanking.route.js |
| `POST` | `/api/saudiBanking/lean/webhook` | unknown | saudiBanking.route.js |
| `POST` | `/api/saudiBanking/wps/generate` | unknown | saudiBanking.route.js |
| `POST` | `/api/saudiBanking/wps/download` | unknown | saudiBanking.route.js |
| `POST` | `/api/saudiBanking/wps/validate` | unknown | saudiBanking.route.js |
| `GET` | `/api/saudiBanking/wps/files` | unknown | saudiBanking.route.js |
| `GET` | `/api/saudiBanking/wps/sarie-banks` | unknown | saudiBanking.route.js |
| `GET` | `/api/saudiBanking/sadad/billers` | unknown | saudiBanking.route.js |
| `GET` | `/api/saudiBanking/sadad/billers/search` | unknown | saudiBanking.route.js |
| `POST` | `/api/saudiBanking/sadad/bills/inquiry` | unknown | saudiBanking.route.js |
| `POST` | `/api/saudiBanking/sadad/bills/pay` | unknown | saudiBanking.route.js |
| `GET` | `/api/saudiBanking/sadad/payments/:transactionId/status` | unknown | saudiBanking.route.js |
| `GET` | `/api/saudiBanking/sadad/payments/history` | unknown | saudiBanking.route.js |
| `POST` | `/api/saudiBanking/mudad/payroll/calculate` | unknown | saudiBanking.route.js |
| `POST` | `/api/saudiBanking/mudad/gosi/calculate` | unknown | saudiBanking.route.js |
| `POST` | `/api/saudiBanking/mudad/wps/generate` | unknown | saudiBanking.route.js |
| `POST` | `/api/saudiBanking/mudad/payroll/submit` | unknown | saudiBanking.route.js |
| `GET` | `/api/saudiBanking/mudad/submissions/:submissionId/status` | unknown | saudiBanking.route.js |
| `POST` | `/api/saudiBanking/mudad/gosi/report` | unknown | saudiBanking.route.js |
| `POST` | `/api/saudiBanking/mudad/compliance/nitaqat` | unknown | saudiBanking.route.js |
| `POST` | `/api/saudiBanking/mudad/compliance/minimum-wage` | unknown | saudiBanking.route.js |
| `GET` | `/api/saudiBanking/compliance/deadlines` | unknown | saudiBanking.route.js |

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
| `GET` | `/api/savedReport/reports` | getReports | savedReport.route.js |
| `POST` | `/api/savedReport/reports` | createReport | savedReport.route.js |
| `GET` | `/api/savedReport/reports/:id` | getReport | savedReport.route.js |
| `PATCH` | `/api/savedReport/reports/:id` | updateReport | savedReport.route.js |
| `DELETE` | `/api/savedReport/reports/:id` | deleteReport | savedReport.route.js |
| `POST` | `/api/savedReport/reports/:id/run` | runReport | savedReport.route.js |
| `POST` | `/api/savedReport/reports/:id/duplicate` | duplicateReport | savedReport.route.js |
| `GET` | `/api/savedReport/widgets/defaults` | getDefaultWidgets | savedReport.route.js |
| `PATCH` | `/api/savedReport/widgets/layout` | updateLayout | savedReport.route.js |
| `GET` | `/api/savedReport/widgets` | getWidgets | savedReport.route.js |
| `POST` | `/api/savedReport/widgets` | createWidget | savedReport.route.js |
| `GET` | `/api/savedReport/widgets/:id` | getWidget | savedReport.route.js |
| `PATCH` | `/api/savedReport/widgets/:id` | updateWidget | savedReport.route.js |
| `DELETE` | `/api/savedReport/widgets/:id` | deleteWidget | savedReport.route.js |
| `GET` | `/api/savedReport/widgets/:id/data` | getWidgetData | savedReport.route.js |

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
| `POST` | `/api/securityIncident/incidents/report` | unknown | securityIncident.route.js |
| `GET` | `/api/securityIncident/incidents` | unknown | securityIncident.route.js |
| `PATCH` | `/api/securityIncident/incidents/:id/status` | unknown | securityIncident.route.js |
| `GET` | `/api/securityIncident/incidents/stats` | unknown | securityIncident.route.js |
| `POST` | `/api/securityIncident/vulnerability/report` | unknown | securityIncident.route.js |
| `POST` | `/api/securityIncident/csp-report` | receiveCspReport | securityIncident.route.js |
| `GET` | `/api/securityIncident/csp-violations` | getCspViolations | securityIncident.route.js |
| `DELETE` | `/api/securityIncident/csp-violations` | clearCspViolations | securityIncident.route.js |

## setupWizard

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/setupWizard/status` | unknown | setupWizard.route.js |
| `GET` | `/api/setupWizard/sections` | unknown | setupWizard.route.js |
| `POST` | `/api/setupWizard/tasks/:taskId/complete` | unknown | setupWizard.route.js |
| `POST` | `/api/setupWizard/tasks/:taskId/skip` | unknown | setupWizard.route.js |
| `GET` | `/api/setupWizard/next-task` | unknown | setupWizard.route.js |
| `GET` | `/api/setupWizard/progress-percentage` | unknown | setupWizard.route.js |
| `POST` | `/api/setupWizard/reset` | unknown | setupWizard.route.js |
| `POST` | `/api/setupWizard/admin/sections` | unknown | setupWizard.route.js |
| `PATCH` | `/api/setupWizard/admin/sections/:sectionId` | unknown | setupWizard.route.js |
| `DELETE` | `/api/setupWizard/admin/sections/:sectionId` | unknown | setupWizard.route.js |
| `POST` | `/api/setupWizard/admin/tasks` | unknown | setupWizard.route.js |
| `PATCH` | `/api/setupWizard/admin/tasks/:taskId` | unknown | setupWizard.route.js |
| `DELETE` | `/api/setupWizard/admin/tasks/:taskId` | unknown | setupWizard.route.js |

## shift

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/shift/shift-types` | unknown | shift.route.js |
| `GET` | `/api/shift/shift-types/:id` | unknown | shift.route.js |
| `POST` | `/api/shift/shift-types` | unknown | shift.route.js |
| `PATCH` | `/api/shift/shift-types/:id` | unknown | shift.route.js |
| `DELETE` | `/api/shift/shift-types/:id` | unknown | shift.route.js |
| `POST` | `/api/shift/shift-types/:id/set-default` | unknown | shift.route.js |
| `POST` | `/api/shift/shift-types/:id/clone` | unknown | shift.route.js |
| `GET` | `/api/shift/shift-types-stats` | unknown | shift.route.js |
| `GET` | `/api/shift/shift-types-ramadan` | unknown | shift.route.js |
| `GET` | `/api/shift/shift-assignments` | unknown | shift.route.js |
| `GET` | `/api/shift/shift-assignments/:id` | unknown | shift.route.js |
| `POST` | `/api/shift/shift-assignments` | unknown | shift.route.js |
| `POST` | `/api/shift/shift-assignments/bulk` | unknown | shift.route.js |
| `PATCH` | `/api/shift/shift-assignments/:id` | unknown | shift.route.js |
| `DELETE` | `/api/shift/shift-assignments/:id` | unknown | shift.route.js |
| `GET` | `/api/shift/shift-assignments/employee/:employeeId` | unknown | shift.route.js |
| `GET` | `/api/shift/shift-assignments/employee/:employeeId/current` | unknown | shift.route.js |

## skillMatrix

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/skillMatrix/sfia-levels` | unknown | skillMatrix.route.js |
| `GET` | `/api/skillMatrix/types` | unknown | skillMatrix.route.js |
| `POST` | `/api/skillMatrix/types` | unknown | skillMatrix.route.js |
| `PATCH` | `/api/skillMatrix/types/:id` | unknown | skillMatrix.route.js |
| `GET` | `/api/skillMatrix/competencies` | unknown | skillMatrix.route.js |
| `GET` | `/api/skillMatrix/competencies/:id` | unknown | skillMatrix.route.js |
| `POST` | `/api/skillMatrix/competencies` | unknown | skillMatrix.route.js |
| `PATCH` | `/api/skillMatrix/competencies/:id` | unknown | skillMatrix.route.js |
| `DELETE` | `/api/skillMatrix/competencies/:id` | unknown | skillMatrix.route.js |
| `GET` | `/api/skillMatrix/assessments` | unknown | skillMatrix.route.js |
| `GET` | `/api/skillMatrix/assessments/:id` | unknown | skillMatrix.route.js |
| `POST` | `/api/skillMatrix/assessments` | unknown | skillMatrix.route.js |
| `PATCH` | `/api/skillMatrix/assessments/:id` | unknown | skillMatrix.route.js |
| `POST` | `/api/skillMatrix/assessments/:id/self-assessment` | unknown | skillMatrix.route.js |
| `GET` | `/api/skillMatrix/expiring-certifications` | unknown | skillMatrix.route.js |
| `GET` | `/api/skillMatrix/cpd-non-compliant` | unknown | skillMatrix.route.js |
| `GET` | `/api/skillMatrix/needing-review` | unknown | skillMatrix.route.js |
| `GET` | `/api/skillMatrix/by-category` | unknown | skillMatrix.route.js |
| `GET` | `/api/skillMatrix/stats` | unknown | skillMatrix.route.js |
| `GET` | `/api/skillMatrix/matrix` | unknown | skillMatrix.route.js |
| `GET` | `/api/skillMatrix/gap-analysis` | unknown | skillMatrix.route.js |
| `GET` | `/api/skillMatrix` | unknown | skillMatrix.route.js |
| `GET` | `/api/skillMatrix/:id` | unknown | skillMatrix.route.js |
| `POST` | `/api/skillMatrix` | unknown | skillMatrix.route.js |
| `PATCH` | `/api/skillMatrix/:id` | unknown | skillMatrix.route.js |
| `DELETE` | `/api/skillMatrix/:id` | unknown | skillMatrix.route.js |
| `POST` | `/api/skillMatrix/assign` | unknown | skillMatrix.route.js |
| `DELETE` | `/api/skillMatrix/assign/:employeeId/:skillId` | unknown | skillMatrix.route.js |
| `GET` | `/api/skillMatrix/employee/:employeeId` | unknown | skillMatrix.route.js |
| `GET` | `/api/skillMatrix/:skillId/employees` | unknown | skillMatrix.route.js |
| `POST` | `/api/skillMatrix/verify` | unknown | skillMatrix.route.js |
| `POST` | `/api/skillMatrix/endorse` | unknown | skillMatrix.route.js |

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
| `GET` | `/api/smartButton/:model/:recordId/counts` | unknown | smartButton.route.js |
| `POST` | `/api/smartButton/:model/batch-counts` | unknown | smartButton.route.js |

## smartScheduling

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/smartScheduling/patterns` | getUserPatterns | smartScheduling.route.js |
| `POST` | `/api/smartScheduling/suggest` | suggestBestTime | smartScheduling.route.js |
| `POST` | `/api/smartScheduling/predict-duration` | predictDuration | smartScheduling.route.js |
| `GET` | `/api/smartScheduling/workload` | analyzeWorkload | smartScheduling.route.js |
| `GET` | `/api/smartScheduling/nudges` | getDailyNudges | smartScheduling.route.js |
| `POST` | `/api/smartScheduling/auto-schedule` | autoScheduleTasks | smartScheduling.route.js |

## ssoConfig

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/ssoConfig/:firmId/sso` | unknown | ssoConfig.route.js |
| `PUT` | `/api/ssoConfig/:firmId/sso` | unknown | ssoConfig.route.js |
| `POST` | `/api/ssoConfig/:firmId/sso/test` | unknown | ssoConfig.route.js |
| `POST` | `/api/ssoConfig/:firmId/sso/upload-metadata` | unknown | ssoConfig.route.js |
| `DELETE` | `/api/ssoConfig/:firmId/sso` | unknown | ssoConfig.route.js |

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
| `POST` | `/api/statement` | generateStatement | statement.route.js |
| `GET` | `/api/statement` | getStatements | statement.route.js |
| `GET` | `/api/statement/:id` | getStatement | statement.route.js |
| `DELETE` | `/api/statement/:id` | deleteStatement | statement.route.js |
| `GET` | `/api/statement/:id/download` | downloadStatement | statement.route.js |
| `POST` | `/api/statement/:id/send` | sendStatement | statement.route.js |
| `POST` | `/api/statement/generate` | generateStatement | statement.route.js |

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

## successionPlan

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/successionPlan/stats` | unknown | successionPlan.route.js |
| `GET` | `/api/successionPlan/review-due` | unknown | successionPlan.route.js |
| `GET` | `/api/successionPlan/high-risk` | unknown | successionPlan.route.js |
| `GET` | `/api/successionPlan/critical-without-successors` | unknown | successionPlan.route.js |
| `GET` | `/api/successionPlan/export` | unknown | successionPlan.route.js |
| `GET` | `/api/successionPlan` | unknown | successionPlan.route.js |
| `POST` | `/api/successionPlan` | unknown | successionPlan.route.js |
| `POST` | `/api/successionPlan/bulk-delete` | unknown | successionPlan.route.js |
| `GET` | `/api/successionPlan/by-position/:positionId` | unknown | successionPlan.route.js |
| `GET` | `/api/successionPlan/by-incumbent/:incumbentId` | unknown | successionPlan.route.js |
| `GET` | `/api/successionPlan/:id` | unknown | successionPlan.route.js |
| `PATCH` | `/api/successionPlan/:id` | unknown | successionPlan.route.js |
| `DELETE` | `/api/successionPlan/:id` | unknown | successionPlan.route.js |
| `POST` | `/api/successionPlan/:id/submit-for-approval` | unknown | successionPlan.route.js |
| `POST` | `/api/successionPlan/:id/approve` | unknown | successionPlan.route.js |
| `POST` | `/api/successionPlan/:id/reject` | unknown | successionPlan.route.js |
| `POST` | `/api/successionPlan/:id/activate` | unknown | successionPlan.route.js |
| `POST` | `/api/successionPlan/:id/archive` | unknown | successionPlan.route.js |
| `POST` | `/api/successionPlan/:id/successors` | unknown | successionPlan.route.js |
| `PATCH` | `/api/successionPlan/:id/successors/:successorId` | unknown | successionPlan.route.js |
| `DELETE` | `/api/successionPlan/:id/successors/:successorId` | unknown | successionPlan.route.js |
| `PATCH` | `/api/successionPlan/:id/successors/:successorId/readiness` | unknown | successionPlan.route.js |
| `PATCH` | `/api/successionPlan/:id/successors/:successorId/development` | unknown | successionPlan.route.js |
| `POST` | `/api/successionPlan/:id/reviews` | unknown | successionPlan.route.js |
| `POST` | `/api/successionPlan/:id/actions` | unknown | successionPlan.route.js |
| `PATCH` | `/api/successionPlan/:id/actions/:actionId` | unknown | successionPlan.route.js |
| `POST` | `/api/successionPlan/:id/documents` | unknown | successionPlan.route.js |

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
| `GET` | `/api/survey/templates` | unknown | survey.route.js |
| `GET` | `/api/survey/templates/:id` | unknown | survey.route.js |
| `POST` | `/api/survey/templates` | unknown | survey.route.js |
| `PATCH` | `/api/survey/templates/:id` | unknown | survey.route.js |
| `DELETE` | `/api/survey/templates/:id` | unknown | survey.route.js |
| `GET` | `/api/survey/stats` | unknown | survey.route.js |
| `GET` | `/api/survey/my-surveys` | unknown | survey.route.js |
| `GET` | `/api/survey` | unknown | survey.route.js |
| `GET` | `/api/survey/:id` | unknown | survey.route.js |
| `GET` | `/api/survey/:id/results` | unknown | survey.route.js |
| `POST` | `/api/survey` | unknown | survey.route.js |
| `PATCH` | `/api/survey/:id` | unknown | survey.route.js |
| `POST` | `/api/survey/:id/launch` | unknown | survey.route.js |
| `POST` | `/api/survey/:id/close` | unknown | survey.route.js |
| `DELETE` | `/api/survey/:id` | unknown | survey.route.js |
| `POST` | `/api/survey/:id/respond` | unknown | survey.route.js |

## tag

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/tag/popular` | getPopularTags | tag.route.js |
| `POST` | `/api/tag/merge` | mergeTags | tag.route.js |
| `POST` | `/api/tag/bulk` | bulkCreate | tag.route.js |
| `GET` | `/api/tag/entity/:entityType` | getTagsByEntity | tag.route.js |
| `GET` | `/api/tag` | getTags | tag.route.js |
| `POST` | `/api/tag` | createTag | tag.route.js |
| `GET` | `/api/tag/:id` | getTagById | tag.route.js |
| `PUT` | `/api/tag/:id` | updateTag | tag.route.js |
| `DELETE` | `/api/tag/:id` | deleteTag | tag.route.js |

## task

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/task/templates` | getTemplates | task.route.js |
| `POST` | `/api/task/templates` | createTemplate | task.route.js |
| `GET` | `/api/task/templates/:templateId` | getTemplate | task.route.js |
| `PUT` | `/api/task/templates/:templateId` | updateTemplate | task.route.js |
| `PATCH` | `/api/task/templates/:templateId` | updateTemplate | task.route.js |
| `DELETE` | `/api/task/templates/:templateId` | deleteTemplate | task.route.js |
| `POST` | `/api/task/templates/:templateId/create` | createFromTemplate | task.route.js |
| `GET` | `/api/task/overview` | getTasksOverview | task.route.js |
| `GET` | `/api/task/timers/active` | getActiveTimers | task.route.js |
| `GET` | `/api/task/search` | searchTasks | task.route.js |
| `GET` | `/api/task/conflicts` | getTaskConflicts | task.route.js |
| `GET` | `/api/task/client/:clientId` | getTasksByClient | task.route.js |
| `GET` | `/api/task/stats` | getTaskStats | task.route.js |
| `GET` | `/api/task/upcoming` | getUpcomingTasks | task.route.js |
| `GET` | `/api/task/overdue` | getOverdueTasks | task.route.js |
| `GET` | `/api/task/due-today` | getTasksDueToday | task.route.js |
| `GET` | `/api/task/case/:caseId` | getTasksByCase | task.route.js |
| `POST` | `/api/task/bulk` | bulkCreateTasks | task.route.js |
| `PUT` | `/api/task/bulk` | bulkUpdateTasks | task.route.js |
| `DELETE` | `/api/task/bulk` | bulkDeleteTasks | task.route.js |
| `POST` | `/api/task/bulk/complete` | bulkCompleteTasks | task.route.js |
| `POST` | `/api/task/bulk/assign` | bulkAssignTasks | task.route.js |
| `POST` | `/api/task/bulk/archive` | bulkArchiveTasks | task.route.js |
| `POST` | `/api/task/bulk/unarchive` | bulkUnarchiveTasks | task.route.js |
| `POST` | `/api/task/bulk/reopen` | bulkReopenTasks | task.route.js |
| `GET` | `/api/task/export` | exportTasks | task.route.js |
| `GET` | `/api/task/ids` | getAllTaskIds | task.route.js |
| `GET` | `/api/task/archived` | getArchivedTasks | task.route.js |
| `PATCH` | `/api/task/reorder` | reorderTasks | task.route.js |
| `GET` | `/api/task/location-triggers` | getTasksWithLocationTriggers | task.route.js |
| `POST` | `/api/task/location/check` | bulkCheckLocationTriggers | task.route.js |
| `POST` | `/api/task/parse` | createTaskFromNaturalLanguage | task.route.js |
| `POST` | `/api/task/voice` | createTaskFromVoice | task.route.js |
| `GET` | `/api/task/smart-schedule` | getSmartScheduleSuggestions | task.route.js |
| `POST` | `/api/task/auto-schedule` | autoScheduleTasks | task.route.js |
| `POST` | `/api/task/voice-to-item` | processVoiceToItem | task.route.js |
| `POST` | `/api/task/voice-to-item/batch` | batchProcessVoiceMemos | task.route.js |
| `POST` | `/api/task` | createTask | task.route.js |
| `GET` | `/api/task` | getTasks | task.route.js |
| `GET` | `/api/task/:id/full` | getTaskFull | task.route.js |
| `GET` | `/api/task/:id` | getTask | task.route.js |
| `PUT` | `/api/task/:id` | updateTask | task.route.js |
| `PATCH` | `/api/task/:id` | updateTask | task.route.js |
| `DELETE` | `/api/task/:id` | deleteTask | task.route.js |
| `POST` | `/api/task/:id/complete` | completeTask | task.route.js |
| `POST` | `/api/task/:id/reopen` | reopenTask | task.route.js |
| `POST` | `/api/task/:id/clone` | cloneTask | task.route.js |
| `POST` | `/api/task/:id/reschedule` | rescheduleTask | task.route.js |
| `GET` | `/api/task/:id/activity` | getTaskActivity | task.route.js |
| `POST` | `/api/task/:id/convert-to-event` | convertTaskToEvent | task.route.js |
| `POST` | `/api/task/:id/archive` | archiveTask | task.route.js |
| `POST` | `/api/task/:id/unarchive` | unarchiveTask | task.route.js |
| `PUT` | `/api/task/:id/location-trigger` | updateLocationTrigger | task.route.js |
| `POST` | `/api/task/:id/location/check` | checkLocationTrigger | task.route.js |
| `POST` | `/api/task/:id/subtasks` | addSubtask | task.route.js |
| `PATCH` | `/api/task/:id/subtasks/:subtaskId/toggle` | toggleSubtask | task.route.js |
| `DELETE` | `/api/task/:id/subtasks/:subtaskId` | deleteSubtask | task.route.js |
| `POST` | `/api/task/:id/timer/start` | startTimer | task.route.js |
| `POST` | `/api/task/:id/timer/stop` | stopTimer | task.route.js |
| `PATCH` | `/api/task/:id/timer/pause` | pauseTimer | task.route.js |
| `PATCH` | `/api/task/:id/timer/resume` | resumeTimer | task.route.js |
| `POST` | `/api/task/:id/time` | addManualTime | task.route.js |
| `DELETE` | `/api/task/:id/time-tracking/reset` | resetTimeTracking | task.route.js |
| `POST` | `/api/task/:id/comments` | addComment | task.route.js |
| `PUT` | `/api/task/:id/comments/:commentId` | updateComment | task.route.js |
| `DELETE` | `/api/task/:id/comments/:commentId` | deleteComment | task.route.js |
| `POST` | `/api/task/:id/save-as-template` | saveAsTemplate | task.route.js |
| `POST` | `/api/task/:id/attachments` | addAttachment | task.route.js |
| `GET` | `/api/task/:id/attachments/:attachmentId/download-url` | getAttachmentDownloadUrl | task.route.js |
| `GET` | `/api/task/:id/attachments/:attachmentId/versions` | getAttachmentVersions | task.route.js |
| `DELETE` | `/api/task/:id/attachments/:attachmentId` | deleteAttachment | task.route.js |
| `POST` | `/api/task/:id/documents` | createDocument | task.route.js |
| `GET` | `/api/task/:id/documents` | getDocuments | task.route.js |
| `GET` | `/api/task/:id/documents/:documentId` | getDocument | task.route.js |
| `PATCH` | `/api/task/:id/documents/:documentId` | updateDocument | task.route.js |
| `GET` | `/api/task/:id/documents/:documentId/versions` | getDocumentVersions | task.route.js |
| `GET` | `/api/task/:id/documents/:documentId/versions/:versionId` | getDocumentVersion | task.route.js |
| `POST` | `/api/task/:id/documents/:documentId/versions/:versionId/restore` | restoreDocumentVersion | task.route.js |
| `POST` | `/api/task/:id/voice-memos` | addVoiceMemo | task.route.js |
| `PATCH` | `/api/task/:id/voice-memos/:memoId/transcription` | updateVoiceMemoTranscription | task.route.js |
| `POST` | `/api/task/:id/dependencies` | addDependency | task.route.js |
| `DELETE` | `/api/task/:id/dependencies/:dependencyTaskId` | removeDependency | task.route.js |
| `PATCH` | `/api/task/:id/status` | updateTaskStatus | task.route.js |
| `PATCH` | `/api/task/:id/progress` | updateProgress | task.route.js |
| `POST` | `/api/task/:id/workflow-rules` | addWorkflowRule | task.route.js |
| `PATCH` | `/api/task/:id/outcome` | updateOutcome | task.route.js |
| `PATCH` | `/api/task/:id/estimate` | updateEstimate | task.route.js |
| `GET` | `/api/task/:id/time-tracking/summary` | getTimeTrackingSummary | task.route.js |
| `PATCH` | `/api/task/:id/subtasks/:subtaskId` | updateSubtask | task.route.js |

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
| `POST` | `/api/temporalCase/:id/start-workflow` | unknown | temporalCase.route.js |
| `POST` | `/api/temporalCase/:id/workflow/complete-requirement` | unknown | temporalCase.route.js |
| `POST` | `/api/temporalCase/:id/workflow/transition-stage` | unknown | temporalCase.route.js |
| `GET` | `/api/temporalCase/:id/workflow/status` | unknown | temporalCase.route.js |
| `POST` | `/api/temporalCase/:id/workflow/add-deadline` | unknown | temporalCase.route.js |
| `POST` | `/api/temporalCase/:id/workflow/add-court-date` | unknown | temporalCase.route.js |
| `POST` | `/api/temporalCase/:id/workflow/pause` | unknown | temporalCase.route.js |
| `POST` | `/api/temporalCase/:id/workflow/resume` | unknown | temporalCase.route.js |
| `POST` | `/api/temporalCase/:id/workflow/cancel` | unknown | temporalCase.route.js |

## temporalInvoice

| Method | Path | Controller | File |
|--------|------|------------|------|
| `POST` | `/api/temporalInvoice/:id/submit-approval` | unknown | temporalInvoice.route.js |
| `POST` | `/api/temporalInvoice/:id/approve` | unknown | temporalInvoice.route.js |
| `POST` | `/api/temporalInvoice/:id/reject` | unknown | temporalInvoice.route.js |
| `GET` | `/api/temporalInvoice/:id/approval-status` | unknown | temporalInvoice.route.js |
| `POST` | `/api/temporalInvoice/:id/cancel-approval` | unknown | temporalInvoice.route.js |
| `GET` | `/api/temporalInvoice/pending-approvals` | unknown | temporalInvoice.route.js |

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
| `POST` | `/api/timeTracking/timer/start` | startTimer | timeTracking.route.js |
| `POST` | `/api/timeTracking/timer/pause` | pauseTimer | timeTracking.route.js |
| `POST` | `/api/timeTracking/timer/resume` | resumeTimer | timeTracking.route.js |
| `POST` | `/api/timeTracking/timer/stop` | stopTimer | timeTracking.route.js |
| `GET` | `/api/timeTracking/timer/status` | getTimerStatus | timeTracking.route.js |
| `GET` | `/api/timeTracking/weekly` | getWeeklyEntries | timeTracking.route.js |
| `GET` | `/api/timeTracking/stats` | getTimeStats | timeTracking.route.js |
| `GET` | `/api/timeTracking/unbilled` | getUnbilledEntries | timeTracking.route.js |
| `GET` | `/api/timeTracking/activity-codes` | getActivityCodes | timeTracking.route.js |
| `DELETE` | `/api/timeTracking/entries/bulk` | bulkDeleteTimeEntries | timeTracking.route.js |
| `POST` | `/api/timeTracking/entries/bulk-approve` | bulkApproveTimeEntries | timeTracking.route.js |
| `POST` | `/api/timeTracking/entries/bulk-reject` | bulkRejectTimeEntries | timeTracking.route.js |
| `POST` | `/api/timeTracking/entries/bulk-submit` | bulkSubmitTimeEntries | timeTracking.route.js |
| `POST` | `/api/timeTracking/entries/bulk-lock` | bulkLockTimeEntries | timeTracking.route.js |
| `GET` | `/api/timeTracking/entries/pending-approval` | getPendingApprovalEntries | timeTracking.route.js |
| `POST` | `/api/timeTracking/entries` | createTimeEntry | timeTracking.route.js |
| `GET` | `/api/timeTracking/entries` | getTimeEntries | timeTracking.route.js |
| `GET` | `/api/timeTracking/entries/:id` | getTimeEntry | timeTracking.route.js |
| `PATCH` | `/api/timeTracking/entries/:id` | updateTimeEntry | timeTracking.route.js |
| `PUT` | `/api/timeTracking/entries/:id` | updateTimeEntry | timeTracking.route.js |
| `DELETE` | `/api/timeTracking/entries/:id` | deleteTimeEntry | timeTracking.route.js |
| `POST` | `/api/timeTracking/entries/:id/write-off` | writeOffTimeEntry | timeTracking.route.js |
| `POST` | `/api/timeTracking/entries/:id/write-down` | writeDownTimeEntry | timeTracking.route.js |
| `POST` | `/api/timeTracking/entries/:id/submit` | submitTimeEntry | timeTracking.route.js |
| `POST` | `/api/timeTracking/entries/:id/request-changes` | requestChangesTimeEntry | timeTracking.route.js |
| `POST` | `/api/timeTracking/entries/:id/approve` | approveTimeEntry | timeTracking.route.js |
| `POST` | `/api/timeTracking/entries/:id/reject` | rejectTimeEntry | timeTracking.route.js |
| `POST` | `/api/timeTracking/entries/:id/lock` | lockTimeEntry | timeTracking.route.js |
| `POST` | `/api/timeTracking/entries/:id/unlock` | unlockTimeEntry | timeTracking.route.js |

## timelines

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/timelines/:entityType/:entityId` | unknown | timeline.routes.js |
| `GET` | `/api/timelines/:entityType/:entityId/summary` | unknown | timeline.routes.js |

## trades

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/trades/stats` | getTradeStats | trades.route.js |
| `GET` | `/api/trades/stats/chart` | getChartData | trades.route.js |
| `DELETE` | `/api/trades/bulk` | bulkDeleteTrades | trades.route.js |
| `POST` | `/api/trades/import/csv` | importFromCsv | trades.route.js |
| `POST` | `/api/trades` | createTrade | trades.route.js |
| `GET` | `/api/trades` | getTrades | trades.route.js |
| `GET` | `/api/trades/:id` | getTrade | trades.route.js |
| `PATCH` | `/api/trades/:id` | updateTrade | trades.route.js |
| `DELETE` | `/api/trades/:id` | deleteTrade | trades.route.js |
| `POST` | `/api/trades/:id/close` | closeTrade | trades.route.js |

## tradingAccounts

| Method | Path | Controller | File |
|--------|------|------------|------|
| `POST` | `/api/tradingAccounts` | createTradingAccount | tradingAccounts.route.js |
| `GET` | `/api/tradingAccounts` | getTradingAccounts | tradingAccounts.route.js |
| `GET` | `/api/tradingAccounts/:id` | getTradingAccount | tradingAccounts.route.js |
| `PATCH` | `/api/tradingAccounts/:id` | updateTradingAccount | tradingAccounts.route.js |
| `DELETE` | `/api/tradingAccounts/:id` | deleteTradingAccount | tradingAccounts.route.js |
| `GET` | `/api/tradingAccounts/:id/balance` | getAccountBalance | tradingAccounts.route.js |
| `POST` | `/api/tradingAccounts/:id/set-default` | setDefaultAccount | tradingAccounts.route.js |
| `POST` | `/api/tradingAccounts/:id/transaction` | addTransaction | tradingAccounts.route.js |

## training

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/training/stats` | unknown | training.route.js |
| `GET` | `/api/training/pending-approvals` | unknown | training.route.js |
| `GET` | `/api/training/upcoming` | unknown | training.route.js |
| `GET` | `/api/training/overdue-compliance` | unknown | training.route.js |
| `GET` | `/api/training/calendar` | unknown | training.route.js |
| `GET` | `/api/training/providers` | unknown | training.route.js |
| `GET` | `/api/training/export` | unknown | training.route.js |
| `GET` | `/api/training/policies` | unknown | training.route.js |
| `POST` | `/api/training/bulk-delete` | unknown | training.route.js |
| `GET` | `/api/training/by-employee/:employeeId` | unknown | training.route.js |
| `GET` | `/api/training/cle-summary/:employeeId` | unknown | training.route.js |
| `GET` | `/api/training` | unknown | training.route.js |
| `POST` | `/api/training` | unknown | training.route.js |
| `GET` | `/api/training/:trainingId` | unknown | training.route.js |
| `PATCH` | `/api/training/:trainingId` | unknown | training.route.js |
| `DELETE` | `/api/training/:trainingId` | unknown | training.route.js |
| `POST` | `/api/training/:trainingId/submit` | unknown | training.route.js |
| `POST` | `/api/training/:trainingId/approve` | unknown | training.route.js |
| `POST` | `/api/training/:trainingId/reject` | unknown | training.route.js |
| `POST` | `/api/training/:trainingId/enroll` | unknown | training.route.js |
| `POST` | `/api/training/:trainingId/start` | unknown | training.route.js |
| `POST` | `/api/training/:trainingId/complete` | unknown | training.route.js |
| `POST` | `/api/training/:trainingId/cancel` | unknown | training.route.js |
| `POST` | `/api/training/:trainingId/attendance` | unknown | training.route.js |
| `POST` | `/api/training/:trainingId/progress` | unknown | training.route.js |
| `POST` | `/api/training/:trainingId/assessments` | unknown | training.route.js |
| `POST` | `/api/training/:trainingId/issue-certificate` | unknown | training.route.js |
| `POST` | `/api/training/:trainingId/evaluation` | unknown | training.route.js |
| `POST` | `/api/training/:trainingId/payment` | unknown | training.route.js |

## transaction

| Method | Path | Controller | File |
|--------|------|------------|------|
| `POST` | `/api/transaction` | createTransaction | transaction.route.js |
| `GET` | `/api/transaction` | getTransactions | transaction.route.js |
| `GET` | `/api/transaction/balance` | getBalance | transaction.route.js |
| `GET` | `/api/transaction/summary` | getSummary | transaction.route.js |
| `GET` | `/api/transaction/by-category` | getTransactionsByCategory | transaction.route.js |
| `GET` | `/api/transaction/:id` | getTransaction | transaction.route.js |
| `PUT` | `/api/transaction/:id` | updateTransaction | transaction.route.js |
| `DELETE` | `/api/transaction/:id` | deleteTransaction | transaction.route.js |
| `POST` | `/api/transaction/:id/cancel` | cancelTransaction | transaction.route.js |
| `DELETE` | `/api/transaction/bulk` | bulkDeleteTransactions | transaction.route.js |

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
| `GET` | `/api/trustAccount` | getTrustAccounts | trustAccount.route.js |
| `POST` | `/api/trustAccount` | createTrustAccount | trustAccount.route.js |
| `GET` | `/api/trustAccount/:id` | getTrustAccount | trustAccount.route.js |
| `PATCH` | `/api/trustAccount/:id` | updateTrustAccount | trustAccount.route.js |
| `DELETE` | `/api/trustAccount/:id` | deleteTrustAccount | trustAccount.route.js |
| `GET` | `/api/trustAccount/:id/summary` | getAccountSummary | trustAccount.route.js |
| `GET` | `/api/trustAccount/:id/transactions` | getTransactions | trustAccount.route.js |
| `POST` | `/api/trustAccount/:id/transactions` | createTransaction | trustAccount.route.js |
| `GET` | `/api/trustAccount/:id/transactions/:transactionId` | getTransaction | trustAccount.route.js |
| `POST` | `/api/trustAccount/:id/transactions/:transactionId/void` | voidTransaction | trustAccount.route.js |
| `GET` | `/api/trustAccount/:id/balances` | getClientBalances | trustAccount.route.js |
| `GET` | `/api/trustAccount/:id/balances/:clientId` | getClientBalance | trustAccount.route.js |
| `POST` | `/api/trustAccount/:id/transfer` | transferBetweenClients | trustAccount.route.js |
| `GET` | `/api/trustAccount/:id/reconciliations` | getReconciliations | trustAccount.route.js |
| `POST` | `/api/trustAccount/:id/reconciliations` | createReconciliation | trustAccount.route.js |
| `GET` | `/api/trustAccount/:id/three-way-reconciliations` | getThreeWayReconciliations | trustAccount.route.js |
| `POST` | `/api/trustAccount/:id/three-way-reconciliations` | createThreeWayReconciliation | trustAccount.route.js |

## unifiedData

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/unifiedData/billable-items` | unknown | unifiedData.route.js |
| `GET` | `/api/unifiedData/open-invoices` | unknown | unifiedData.route.js |
| `GET` | `/api/unifiedData/financial-summary` | unknown | unifiedData.route.js |
| `GET` | `/api/unifiedData/client-portfolio/:clientId` | unknown | unifiedData.route.js |
| `GET` | `/api/unifiedData/hr-dashboard` | unknown | unifiedData.route.js |
| `GET` | `/api/unifiedData/case-financials/:caseId` | unknown | unifiedData.route.js |

## user

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/user/lawyers` | getLawyers | user.route.js |
| `GET` | `/api/user/team` | getTeamMembers | user.route.js |
| `GET` | `/api/user/vapid-public-key` | getVapidPublicKey | user.route.js |
| `GET` | `/api/user/push-subscription` | getPushSubscriptionStatus | user.route.js |
| `POST` | `/api/user/push-subscription` | savePushSubscription | user.route.js |
| `DELETE` | `/api/user/push-subscription` | deletePushSubscription | user.route.js |
| `GET` | `/api/user/notification-preferences` | getPushSubscriptionStatus | user.route.js |
| `PUT` | `/api/user/notification-preferences` | updateNotificationPreferences | user.route.js |
| `POST` | `/api/user/convert-to-firm` | convertSoloToFirm | user.route.js |
| `GET` | `/api/user/:_id` | getUserProfile | user.route.js |
| `GET` | `/api/user/lawyer/:username` | getLawyerProfile | user.route.js |
| `PATCH` | `/api/user/:_id` | updateUserProfile | user.route.js |
| `DELETE` | `/api/user/:_id` | deleteUser | user.route.js |

## userSettings

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/userSettings` | getSettings | userSettings.route.js |
| `GET` | `/api/userSettings/view-mode/:module` | getModuleViewMode | userSettings.route.js |
| `PUT` | `/api/userSettings/view-mode/:module` | updateModuleViewMode | userSettings.route.js |
| `PUT` | `/api/userSettings/global-view-mode` | updateGlobalViewMode | userSettings.route.js |
| `PUT` | `/api/userSettings/module/:module` | updateModuleSettings | userSettings.route.js |
| `POST` | `/api/userSettings/toggle-section` | toggleSection | userSettings.route.js |

## vendor

| Method | Path | Controller | File |
|--------|------|------------|------|
| `POST` | `/api/vendor` | createVendor | vendor.route.js |
| `GET` | `/api/vendor` | getVendors | vendor.route.js |
| `GET` | `/api/vendor/:id` | getVendor | vendor.route.js |
| `PUT` | `/api/vendor/:id` | updateVendor | vendor.route.js |
| `DELETE` | `/api/vendor/:id` | deleteVendor | vendor.route.js |
| `GET` | `/api/vendor/:id/summary` | getVendorSummary | vendor.route.js |

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
| `GET` | `/api/walkthrough` | unknown | walkthrough.route.js |
| `GET` | `/api/walkthrough/progress` | unknown | walkthrough.route.js |
| `GET` | `/api/walkthrough/:id` | unknown | walkthrough.route.js |
| `POST` | `/api/walkthrough/:id/start` | unknown | walkthrough.route.js |
| `POST` | `/api/walkthrough/:id/step/next` | unknown | walkthrough.route.js |
| `POST` | `/api/walkthrough/:id/step/:stepOrder/skip` | unknown | walkthrough.route.js |
| `POST` | `/api/walkthrough/:id/complete` | unknown | walkthrough.route.js |
| `POST` | `/api/walkthrough/:id/skip` | unknown | walkthrough.route.js |
| `POST` | `/api/walkthrough/:id/reset` | unknown | walkthrough.route.js |
| `GET` | `/api/walkthrough/stats` | unknown | walkthrough.route.js |
| `GET` | `/api/walkthrough/admin` | unknown | walkthrough.route.js |
| `POST` | `/api/walkthrough/admin` | unknown | walkthrough.route.js |
| `PUT` | `/api/walkthrough/admin/:id` | unknown | walkthrough.route.js |
| `DELETE` | `/api/walkthrough/admin/:id` | unknown | walkthrough.route.js |

## webauthn

| Method | Path | Controller | File |
|--------|------|------------|------|
| `POST` | `/api/webauthn/register/start` | startRegistration | webauthn.route.js |
| `POST` | `/api/webauthn/register/finish` | finishRegistration | webauthn.route.js |
| `POST` | `/api/webauthn/authenticate/start` | startAuthentication | webauthn.route.js |
| `POST` | `/api/webauthn/authenticate/finish` | finishAuthentication | webauthn.route.js |
| `GET` | `/api/webauthn/credentials` | getCredentials | webauthn.route.js |
| `PATCH` | `/api/webauthn/credentials/:id` | updateCredentialName | webauthn.route.js |
| `DELETE` | `/api/webauthn/credentials/:id` | deleteCredential | webauthn.route.js |

## webhook

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/webhook/stats` | getWebhookStats | webhook.route.js |
| `GET` | `/api/webhook/events` | getAvailableEvents | webhook.route.js |
| `POST` | `/api/webhook` | registerWebhook | webhook.route.js |
| `GET` | `/api/webhook` | getWebhooks | webhook.route.js |
| `GET` | `/api/webhook/:id` | getWebhook | webhook.route.js |
| `PUT` | `/api/webhook/:id` | updateWebhook | webhook.route.js |
| `PATCH` | `/api/webhook/:id` | updateWebhook | webhook.route.js |
| `DELETE` | `/api/webhook/:id` | deleteWebhook | webhook.route.js |
| `POST` | `/api/webhook/:id/test` | testWebhook | webhook.route.js |
| `POST` | `/api/webhook/:id/enable` | enableWebhook | webhook.route.js |
| `POST` | `/api/webhook/:id/disable` | disableWebhook | webhook.route.js |
| `GET` | `/api/webhook/:id/secret` | getWebhookSecret | webhook.route.js |
| `POST` | `/api/webhook/:id/regenerate-secret` | regenerateSecret | webhook.route.js |
| `GET` | `/api/webhook/:id/deliveries` | getWebhookDeliveries | webhook.route.js |
| `GET` | `/api/webhook/:id/deliveries/:deliveryId` | getDeliveryDetails | webhook.route.js |
| `POST` | `/api/webhook/:id/deliveries/:deliveryId/retry` | retryDelivery | webhook.route.js |

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
| `GET` | `/api/whosOut/today` | unknown | whosOut.route.js |
| `GET` | `/api/whosOut/week` | unknown | whosOut.route.js |
| `GET` | `/api/whosOut/month` | unknown | whosOut.route.js |
| `GET` | `/api/whosOut/upcoming` | unknown | whosOut.route.js |
| `GET` | `/api/whosOut/departments` | unknown | whosOut.route.js |
| `GET` | `/api/whosOut/coverage/:department` | unknown | whosOut.route.js |

## workflow

| Method | Path | Controller | File |
|--------|------|------------|------|
| `GET` | `/api/workflow/templates` | listTemplates | workflow.route.js |
| `POST` | `/api/workflow/templates` | createTemplate | workflow.route.js |
| `GET` | `/api/workflow/templates/:id` | getTemplate | workflow.route.js |
| `PUT` | `/api/workflow/templates/:id` | updateTemplate | workflow.route.js |
| `DELETE` | `/api/workflow/templates/:id` | deleteTemplate | workflow.route.js |
| `GET` | `/api/workflow/instances` | listInstances | workflow.route.js |
| `POST` | `/api/workflow/instances` | startWorkflow | workflow.route.js |
| `GET` | `/api/workflow/instances/:id` | getWorkflowStatus | workflow.route.js |
| `POST` | `/api/workflow/instances/:id/pause` | pauseWorkflow | workflow.route.js |
| `POST` | `/api/workflow/instances/:id/resume` | resumeWorkflow | workflow.route.js |
| `POST` | `/api/workflow/instances/:id/cancel` | cancelWorkflow | workflow.route.js |
| `POST` | `/api/workflow/instances/:id/advance` | advanceStep | workflow.route.js |
| `GET` | `/api/workflow/entity/:entityType/:entityId` | getActiveWorkflows | workflow.route.js |

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

### GET (1737)

<details>
<summary>Click to expand</summary>

```
GET    /api/account
GET    /api/account/:id
GET    /api/account/:id/balance
GET    /api/account/types
GET    /api/activity
GET    /api/activity/:id
GET    /api/activity/entity/:entityType/:entityId
GET    /api/activity/overview
GET    /api/activity/summary
GET    /api/activityPlans
GET    /api/activityPlans/:id
GET    /api/activitys
GET    /api/activitys/:id
GET    /api/activitys/my
GET    /api/activitys/stats
GET    /api/activitys/types
GET    /api/admin/firm/password-stats
GET    /api/admin/revoked-tokens
GET    /api/admin/revoked-tokens/stats
GET    /api/admin/users/:id/claims
GET    /api/admin/users/:id/claims/preview
GET    /api/admin/users/:id/revocations
GET    /api/adminApi/audit/compliance-report
GET    /api/adminApi/audit/export
GET    /api/adminApi/audit/login-history
GET    /api/adminApi/audit/logs
GET    /api/adminApi/audit/security-events
GET    /api/adminApi/dashboard/active-users
GET    /api/adminApi/dashboard/pending-approvals
GET    /api/adminApi/dashboard/recent-activity
GET    /api/adminApi/dashboard/revenue
GET    /api/adminApi/dashboard/summary
GET    /api/adminApi/dashboard/system-health
GET    /api/adminApi/firms
GET    /api/adminApi/firms/:id
GET    /api/adminApi/firms/:id/usage
GET    /api/adminApi/users
GET    /api/adminApi/users/:id
GET    /api/adminApi/users/export
GET    /api/adminTools/activity-report
GET    /api/adminTools/diagnostics
GET    /api/adminTools/firms/:id/export
GET    /api/adminTools/firms/:id/validate
GET    /api/adminTools/key-rotation/check
GET    /api/adminTools/key-rotation/status
GET    /api/adminTools/slow-queries
GET    /api/adminTools/stats
GET    /api/adminTools/storage-usage
GET    /api/adminTools/users/:id/data
GET    /api/adminTools/users/:id/login-history
GET    /api/aiChat/conversations
GET    /api/aiChat/conversations/:conversationId
GET    /api/aiChat/providers
GET    /api/aiMatching/patterns
GET    /api/aiMatching/patterns/stats
GET    /api/aiMatching/stats
GET    /api/aiMatching/suggestions
GET    /api/aiSettings
GET    /api/aiSettings/features
GET    /api/aiSettings/usage
GET    /api/analyticsReport
GET    /api/analyticsReport/:id
GET    /api/analyticsReport/favorites
GET    /api/analyticsReport/pinned
GET    /api/analyticsReport/section/:section
GET    /api/analyticsReport/stats
GET    /api/analyticsReport/templates
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
GET    /api/answer/:questionId
GET    /api/apiKey
GET    /api/apiKey/:id
GET    /api/apiKey/stats
GET    /api/appointment
GET    /api/appointment/:id
GET    /api/appointment/:id/calendar-links
GET    /api/appointment/:id/calendar.ics
GET    /api/appointment/availability
GET    /api/appointment/available-slots
GET    /api/appointment/blocked-times
GET    /api/appointment/calendar-status
GET    /api/appointment/debug
GET    /api/appointment/settings
GET    /api/appointment/slots
GET    /api/appointment/stats
GET    /api/approval/:id
GET    /api/approval/history
GET    /api/approval/pending
GET    /api/approval/rules
GET    /api/approvals/history/:entityType/:entityId
GET    /api/approvals/pending
GET    /api/approvals/workflows
GET    /api/approvals/workflows/:id
GET    /api/apps
GET    /api/apps/:appId
GET    /api/apps/:appId/settings
GET    /api/apps/categories
GET    /api/apps/stats
GET    /api/arAging/client/:clientId
GET    /api/arAging/export
GET    /api/arAging/forecast
GET    /api/arAging/priority/:invoiceId
GET    /api/arAging/report
GET    /api/arAging/summary
GET    /api/assetAssignment
GET    /api/assetAssignment/:id
GET    /api/assetAssignment/by-employee/:employeeId
GET    /api/assetAssignment/export
GET    /api/assetAssignment/maintenance-due
GET    /api/assetAssignment/overdue
GET    /api/assetAssignment/policies
GET    /api/assetAssignment/stats
GET    /api/assetAssignment/warranty-expiring
GET    /api/assets
GET    /api/assets/:id
GET    /api/assets/categories
GET    /api/assets/categories/:id
GET    /api/assets/maintenance
GET    /api/assets/maintenance/:id
GET    /api/assets/movements
GET    /api/assets/settings
GET    /api/assets/stats
GET    /api/attendance
GET    /api/attendance/:id
GET    /api/attendance/:id/breaks
GET    /api/attendance/corrections/pending
GET    /api/attendance/employee/:employeeId/date/:date
GET    /api/attendance/report/monthly
GET    /api/attendance/stats/department
GET    /api/attendance/status/:employeeId
GET    /api/attendance/summary/:employeeId
GET    /api/attendance/today
GET    /api/attendance/violations
GET    /api/audit
GET    /api/audit/export
GET    /api/audit/options
GET    /api/audit/stats
GET    /api/audit/user/:userId
GET    /api/auditLog
GET    /api/auditLog/analytics/activity-summary
GET    /api/auditLog/analytics/anomalies
GET    /api/auditLog/analytics/top-actions
GET    /api/auditLog/analytics/top-users
GET    /api/auditLog/archive/stats
GET    /api/auditLog/archiving/stats
GET    /api/auditLog/archiving/summary
GET    /api/auditLog/by-action/:action
GET    /api/auditLog/by-date-range
GET    /api/auditLog/compliance-report
GET    /api/auditLog/compliance/retention-status
GET    /api/auditLog/entity/:type/:id
GET    /api/auditLog/export
GET    /api/auditLog/failed-logins
GET    /api/auditLog/search
GET    /api/auditLog/security
GET    /api/auditLog/security-events
GET    /api/auditLog/summary
GET    /api/auditLog/suspicious
GET    /api/auditLog/user/:id
GET    /api/auth/csrf
GET    /api/auth/me
GET    /api/auth/mfa/backup-codes/count
GET    /api/auth/mfa/status
GET    /api/auth/onboarding-status
GET    /api/auth/otp-status
GET    /api/auth/password-status
GET    /api/auth/phone/otp-status
GET    /api/auth/reauthenticate/status
GET    /api/auth/sessions
GET    /api/auth/sessions/current
GET    /api/auth/sessions/stats
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
GET    /api/bankAccount
GET    /api/bankAccount/:id
GET    /api/bankAccount/:id/balance-history
GET    /api/bankAccount/summary
GET    /api/bankReconciliation
GET    /api/bankReconciliation/:id
GET    /api/bankReconciliation/currency/rates
GET    /api/bankReconciliation/currency/supported
GET    /api/bankReconciliation/feeds
GET    /api/bankReconciliation/import/template
GET    /api/bankReconciliation/rules
GET    /api/bankReconciliation/statistics/matches
GET    /api/bankReconciliation/statistics/rules
GET    /api/bankReconciliation/status/:accountId
GET    /api/bankReconciliation/suggestions/:accountId
GET    /api/bankReconciliation/unmatched/:accountId
GET    /api/bankTransaction
GET    /api/bankTransaction/:id
GET    /api/bankTransfer
GET    /api/bankTransfer/:id
GET    /api/bill
GET    /api/bill/:id
GET    /api/bill/export
GET    /api/bill/overdue
GET    /api/bill/recurring
GET    /api/bill/reports/aging
GET    /api/bill/summary
GET    /api/billing/invoices
GET    /api/billing/invoices/:id
GET    /api/billing/invoices/:id/pdf
GET    /api/billing/payment-methods
GET    /api/billing/plans
GET    /api/billing/subscription
GET    /api/billing/usage
GET    /api/billingRate
GET    /api/billingRate/:id
GET    /api/billingRate/applicable
GET    /api/billingRate/stats
GET    /api/billPayment
GET    /api/billPayment/:id
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
GET    /api/brokers
GET    /api/brokers/:id
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
GET    /api/captcha/captcha/providers
GET    /api/captcha/captcha/status/:provider
GET    /api/case
GET    /api/case/:_id
GET    /api/case/:_id/audit
GET    /api/case/:_id/documents/:docId/download
GET    /api/case/:_id/full
GET    /api/case/:_id/notes
GET    /api/case/:_id/rich-documents
GET    /api/case/:_id/rich-documents/:docId
GET    /api/case/:_id/rich-documents/:docId/export/latex
GET    /api/case/:_id/rich-documents/:docId/export/markdown
GET    /api/case/:_id/rich-documents/:docId/export/pdf
GET    /api/case/:_id/rich-documents/:docId/preview
GET    /api/case/:_id/rich-documents/:docId/versions
GET    /api/case/overview
GET    /api/case/pipeline
GET    /api/case/pipeline/grouped
GET    /api/case/pipeline/stages/:category
GET    /api/case/pipeline/statistics
GET    /api/case/statistics
GET    /api/caseNotion/cases/:caseId/notion/blocks/:blockId/comments
GET    /api/caseNotion/cases/:caseId/notion/blocks/:blockId/connections
GET    /api/caseNotion/cases/:caseId/notion/frames/:frameId/children
GET    /api/caseNotion/cases/:caseId/notion/pages
GET    /api/caseNotion/cases/:caseId/notion/pages/:pageId
GET    /api/caseNotion/cases/:caseId/notion/pages/:pageId/activity
GET    /api/caseNotion/cases/:caseId/notion/pages/:pageId/blocks
GET    /api/caseNotion/cases/:caseId/notion/pages/:pageId/connections
GET    /api/caseNotion/cases/:caseId/notion/pages/:pageId/export/html
GET    /api/caseNotion/cases/:caseId/notion/pages/:pageId/export/markdown
GET    /api/caseNotion/cases/:caseId/notion/pages/:pageId/export/pdf
GET    /api/caseNotion/cases/:caseId/notion/pages/:pageId/history-status
GET    /api/caseNotion/cases/:caseId/notion/search
GET    /api/caseNotion/cases/:caseId/notion/synced-blocks/:blockId
GET    /api/caseNotion/notion/cases
GET    /api/caseNotion/notion/templates
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
GET    /api/client
GET    /api/client/:id
GET    /api/client/:id/billing-info
GET    /api/client/:id/cases
GET    /api/client/:id/full
GET    /api/client/:id/invoices
GET    /api/client/:id/payments
GET    /api/client/:id/wathq/:dataType
GET    /api/client/search
GET    /api/client/stats
GET    /api/client/top-revenue
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
GET    /api/compensationReward
GET    /api/compensationReward/:id
GET    /api/compensationReward/department-summary
GET    /api/compensationReward/employee/:employeeId
GET    /api/compensationReward/export
GET    /api/compensationReward/pay-grade-analysis/:payGrade
GET    /api/compensationReward/pending-reviews
GET    /api/compensationReward/stats
GET    /api/competitor
GET    /api/competitor/:id
GET    /api/competitor/top-losses
GET    /api/competitors
GET    /api/competitors/:id
GET    /api/complianceDashboard/contracts/expiring
GET    /api/complianceDashboard/dashboard
GET    /api/complianceDashboard/documents/expiring
GET    /api/complianceDashboard/gosi
GET    /api/complianceDashboard/labor-law
GET    /api/complianceDashboard/nitaqat
GET    /api/complianceDashboard/probation/ending
GET    /api/complianceDashboard/wps
GET    /api/conflictCheck
GET    /api/conflictCheck/:id
GET    /api/conflictCheck/stats
GET    /api/consent
GET    /api/consent/history
GET    /api/consolidatedReports/auto-eliminations
GET    /api/consolidatedReports/balance-sheet
GET    /api/consolidatedReports/cash-flow
GET    /api/consolidatedReports/comparison
GET    /api/consolidatedReports/eliminations
GET    /api/consolidatedReports/full-statement
GET    /api/consolidatedReports/profit-loss
GET    /api/contact
GET    /api/contact/:id
GET    /api/contact/case/:caseId
GET    /api/contact/client/:clientId
GET    /api/contact/search
GET    /api/contactLists
GET    /api/contactLists/:id
GET    /api/contactLists/:id/members
GET    /api/conversation
GET    /api/conversation/single/:sellerID/:buyerID
GET    /api/conversations
GET    /api/conversations/:id
GET    /api/conversations/stats
GET    /api/corporateCard
GET    /api/corporateCard/:id
GET    /api/corporateCard/:id/transactions
GET    /api/corporateCard/:id/transactions/unmatched
GET    /api/corporateCard/spending-stats
GET    /api/corporateCard/summary
GET    /api/creditNote
GET    /api/creditNote/:id
GET    /api/creditNote/invoice/:invoiceId
GET    /api/creditNote/stats
GET    /api/crmActivity
GET    /api/crmActivity/:id
GET    /api/crmActivity/entity/:entityType/:entityId
GET    /api/crmActivity/stats
GET    /api/crmActivity/tasks/upcoming
GET    /api/crmActivity/timeline
GET    /api/crmPipeline
GET    /api/crmPipeline/:id
GET    /api/crmPipeline/:id/stats
GET    /api/crmReports/activity/by-day-of-week
GET    /api/crmReports/activity/by-hour
GET    /api/crmReports/activity/leaderboard
GET    /api/crmReports/activity/overview
GET    /api/crmReports/aging/by-stage
GET    /api/crmReports/aging/overview
GET    /api/crmReports/campaign-efficiency
GET    /api/crmReports/first-response-time
GET    /api/crmReports/forecast/by-month
GET    /api/crmReports/forecast/by-rep
GET    /api/crmReports/forecast/overview
GET    /api/crmReports/funnel/bottlenecks
GET    /api/crmReports/funnel/overview
GET    /api/crmReports/funnel/velocity
GET    /api/crmReports/lead-conversion-time
GET    /api/crmReports/lead-owner-efficiency
GET    /api/crmReports/leads-source/overview
GET    /api/crmReports/leads-source/trend
GET    /api/crmReports/lost-opportunity
GET    /api/crmReports/prospects-engaged
GET    /api/crmReports/quick-stats
GET    /api/crmReports/recent-activity
GET    /api/crmReports/sales-pipeline
GET    /api/crmReports/win-loss/overview
GET    /api/crmReports/win-loss/reasons
GET    /api/crmReports/win-loss/trend
GET    /api/crmSettings
GET    /api/crmTransaction
GET    /api/crmTransaction/daily-report
GET    /api/crmTransaction/entity/:entityType/:entityId
GET    /api/crmTransaction/export
GET    /api/crmTransaction/forecast-by-category
GET    /api/crmTransaction/forecast-trends
GET    /api/crmTransaction/leads-needing-attention
GET    /api/crmTransaction/pipeline-velocity
GET    /api/crmTransaction/revenue-forecast
GET    /api/crmTransaction/revenue-forecast/by-period
GET    /api/crmTransaction/stale-leads
GET    /api/crmTransaction/stale-leads/by-stage
GET    /api/crmTransaction/stale-leads/summary
GET    /api/crmTransaction/summary
GET    /api/crmTransaction/user-activity/:userId
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
GET    /api/dataExport/entity/:entityType
GET    /api/dataExport/import/:id
GET    /api/dataExport/imports
GET    /api/dataExport/jobs
GET    /api/dataExport/jobs/:id
GET    /api/dataExport/jobs/:id/download
GET    /api/dataExport/report/:reportType
GET    /api/dataExport/templates
GET    /api/dealHealths/:id
GET    /api/dealHealths/attention
GET    /api/dealHealths/distribution
GET    /api/dealHealths/stuck
GET    /api/dealRooms/:id/activity
GET    /api/dealRooms/deals/:dealId/room
GET    /api/dealRooms/external/:token
GET    /api/debitNote
GET    /api/debitNote/:id
GET    /api/debitNote/bill/:billId
GET    /api/debitNote/pending-approvals
GET    /api/deduplications/contacts/:id/duplicates
GET    /api/deduplications/contacts/duplicate-suggestions
GET    /api/discord/auth-url
GET    /api/discord/callback
GET    /api/discord/guilds
GET    /api/discord/guilds/:guildId/channels
GET    /api/discord/status
GET    /api/dispute
GET    /api/dispute/:id
GET    /api/dispute/by-type
GET    /api/dispute/stats
GET    /api/document
GET    /api/document/:id
GET    /api/document/:id/download
GET    /api/document/:id/versions
GET    /api/document/case/:caseId
GET    /api/document/client/:clientId
GET    /api/document/recent
GET    /api/document/search
GET    /api/document/stats
GET    /api/documentAnalysis/:documentId
GET    /api/documentAnalysis/:documentId/history
GET    /api/documentAnalysis/:documentId/report
GET    /api/documentAnalysis/:documentId/similar
GET    /api/documentAnalysis/:documentId/status
GET    /api/documentAnalysis/search
GET    /api/documentAnalysis/stats
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
GET    /api/emailMarketing/analytics/overview
GET    /api/emailMarketing/analytics/trends
GET    /api/emailMarketing/campaigns
GET    /api/emailMarketing/campaigns/:id
GET    /api/emailMarketing/campaigns/:id/analytics
GET    /api/emailMarketing/segments
GET    /api/emailMarketing/segments/:id
GET    /api/emailMarketing/segments/:id/subscribers
GET    /api/emailMarketing/subscribers
GET    /api/emailMarketing/templates
GET    /api/emailMarketing/templates/:id
GET    /api/emailMarketing/templates/public
GET    /api/emailMarketing/webhooks/email/track/open/:trackingId
GET    /api/emailMarketing/webhooks/email/unsubscribe/:email
GET    /api/emailSettings/signatures
GET    /api/emailSettings/smtp
GET    /api/emailSettings/templates
GET    /api/emailSettings/templates/:id
GET    /api/emailTemplates
GET    /api/emailTemplates/:id
GET    /api/emailTemplates/trigger/:triggerEvent
GET    /api/emailTemplates/variables
GET    /api/employeeAdvance
GET    /api/employeeAdvance/:advanceId
GET    /api/employeeAdvance/by-employee/:employeeId
GET    /api/employeeAdvance/emergency
GET    /api/employeeAdvance/overdue-recoveries
GET    /api/employeeAdvance/pending-approvals
GET    /api/employeeAdvance/stats
GET    /api/employeeBenefit
GET    /api/employeeBenefit/:id
GET    /api/employeeBenefit/cost-summary
GET    /api/employeeBenefit/employee/:employeeId
GET    /api/employeeBenefit/expiring
GET    /api/employeeBenefit/export
GET    /api/employeeBenefit/stats
GET    /api/employeeLoan
GET    /api/employeeLoan/:loanId
GET    /api/employeeLoan/:loanId/early-settlement-calculation
GET    /api/employeeLoan/by-employee/:employeeId
GET    /api/employeeLoan/overdue-installments
GET    /api/employeeLoan/pending-approvals
GET    /api/employeeLoan/stats
GET    /api/employeeSelfService/advances
GET    /api/employeeSelfService/approvals/pending
GET    /api/employeeSelfService/dashboard
GET    /api/employeeSelfService/leave/balances
GET    /api/employeeSelfService/leave/requests
GET    /api/employeeSelfService/loans
GET    /api/employeeSelfService/payslips
GET    /api/employeeSelfService/profile
GET    /api/event
GET    /api/event/:id
GET    /api/event/:id/activity
GET    /api/event/:id/export/ics
GET    /api/event/archived
GET    /api/event/calendar
GET    /api/event/case/:caseId
GET    /api/event/client/:clientId
GET    /api/event/conflicts
GET    /api/event/date/:date
GET    /api/event/export
GET    /api/event/ids
GET    /api/event/location-triggers
GET    /api/event/month/:year/:month
GET    /api/event/search
GET    /api/event/stats
GET    /api/event/upcoming
GET    /api/exchangeRateRevaluation
GET    /api/exchangeRateRevaluation/:id
GET    /api/exchangeRateRevaluation/accounts
GET    /api/exchangeRateRevaluation/report
GET    /api/expense
GET    /api/expense/:id
GET    /api/expense/by-category
GET    /api/expense/categories
GET    /api/expense/new
GET    /api/expense/stats
GET    /api/expenseClaim
GET    /api/expenseClaim/:id
GET    /api/expenseClaim/by-employee/:employeeId
GET    /api/expenseClaim/corporate-card/:employeeId
GET    /api/expenseClaim/export
GET    /api/expenseClaim/mileage-rates
GET    /api/expenseClaim/pending-approvals
GET    /api/expenseClaim/pending-payments
GET    /api/expenseClaim/policies
GET    /api/expenseClaim/stats
GET    /api/expensePolicy
GET    /api/expensePolicy/:id
GET    /api/expensePolicy/default
GET    /api/expensePolicy/my-policy
GET    /api/fieldHistorys/:entityType/:entityId
GET    /api/fieldHistorys/:entityType/:entityId/compare
GET    /api/fieldHistorys/:entityType/:entityId/field/:fieldName
GET    /api/fieldHistorys/:entityType/:entityId/stats
GET    /api/fieldHistorys/:entityType/:entityId/timeline/:fieldName
GET    /api/fieldHistorys/recent
GET    /api/fieldHistorys/user/:userId
GET    /api/financeSetup
GET    /api/financeSetup/status
GET    /api/financeSetup/templates
GET    /api/firm
GET    /api/firm/:_id
GET    /api/firm/:firmId/invitations
GET    /api/firm/:firmId/ip-whitelist
GET    /api/firm/:id
GET    /api/firm/:id/access
GET    /api/firm/:id/children
GET    /api/firm/:id/departed
GET    /api/firm/:id/members
GET    /api/firm/:id/stats
GET    /api/firm/:id/team
GET    /api/firm/active
GET    /api/firm/my
GET    /api/firm/my/permissions
GET    /api/firm/roles
GET    /api/firm/tree
GET    /api/firm/user/accessible
GET    /api/fiscalPeriod
GET    /api/fiscalPeriod/:id
GET    /api/fiscalPeriod/:id/balances
GET    /api/fiscalPeriod/can-post
GET    /api/fiscalPeriod/current
GET    /api/fiscalPeriod/years-summary
GET    /api/fleet/driver-rankings
GET    /api/fleet/drivers
GET    /api/fleet/drivers/:id
GET    /api/fleet/expiring-documents
GET    /api/fleet/fuel-logs
GET    /api/fleet/incidents
GET    /api/fleet/incidents/:id
GET    /api/fleet/inspections
GET    /api/fleet/inspections/checklist
GET    /api/fleet/maintenance
GET    /api/fleet/maintenance-due
GET    /api/fleet/stats
GET    /api/fleet/trips
GET    /api/fleet/vehicles
GET    /api/fleet/vehicles/:id
GET    /api/fleet/vehicles/:id/location-history
GET    /api/followup
GET    /api/followup/:id
GET    /api/followup/entity/:entityType/:entityId
GET    /api/followup/overdue
GET    /api/followup/stats
GET    /api/followup/today
GET    /api/followup/upcoming
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
GET    /api/generalLedger
GET    /api/generalLedger/:id
GET    /api/generalLedger/account-balance/:accountId
GET    /api/generalLedger/balance-sheet
GET    /api/generalLedger/entries
GET    /api/generalLedger/profit-loss
GET    /api/generalLedger/reference/:model/:id
GET    /api/generalLedger/stats
GET    /api/generalLedger/summary
GET    /api/generalLedger/trial-balance
GET    /api/gig
GET    /api/gig/single/:_id
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
GET    /api/googleCalendar/auth
GET    /api/googleCalendar/calendars
GET    /api/googleCalendar/calendars/:calendarId/events
GET    /api/googleCalendar/callback
GET    /api/googleCalendar/status
GET    /api/googleCalendar/sync/settings
GET    /api/gosi/config
GET    /api/gosi/export
GET    /api/gosi/report
GET    /api/gosi/stats
GET    /api/grievance
GET    /api/grievance/:id
GET    /api/grievance/employee/:employeeId
GET    /api/grievance/export
GET    /api/grievance/overdue
GET    /api/grievance/stats
GET    /api/health
GET    /api/health/cache
GET    /api/health/circuits
GET    /api/health/debug-auth
GET    /api/health/deep
GET    /api/health/detailed
GET    /api/health/live
GET    /api/health/ping
GET    /api/health/ready
GET    /api/hr/employees
GET    /api/hr/employees/:id
GET    /api/hr/employees/:id/documents
GET    /api/hr/employees/stats
GET    /api/hr/options
GET    /api/hrAnalytics/absenteeism
GET    /api/hrAnalytics/attendance
GET    /api/hrAnalytics/compensation
GET    /api/hrAnalytics/dashboard
GET    /api/hrAnalytics/demographics
GET    /api/hrAnalytics/export
GET    /api/hrAnalytics/leave
GET    /api/hrAnalytics/performance
GET    /api/hrAnalytics/predictions/absence
GET    /api/hrAnalytics/predictions/attrition
GET    /api/hrAnalytics/predictions/attrition/:employeeId
GET    /api/hrAnalytics/predictions/engagement
GET    /api/hrAnalytics/predictions/flight-risk
GET    /api/hrAnalytics/predictions/high-potential
GET    /api/hrAnalytics/predictions/workforce
GET    /api/hrAnalytics/recruitment
GET    /api/hrAnalytics/saudization
GET    /api/hrAnalytics/training
GET    /api/hrAnalytics/trends
GET    /api/hrAnalytics/turnover
GET    /api/hrExtended/compensatory-leave
GET    /api/hrExtended/compensatory-leave/balance/:employeeId
GET    /api/hrExtended/employee-skills/:employeeId
GET    /api/hrExtended/employee-skills/expiring-certifications
GET    /api/hrExtended/employee-skills/matrix
GET    /api/hrExtended/incentives
GET    /api/hrExtended/incentives/stats
GET    /api/hrExtended/leave-encashment
GET    /api/hrExtended/promotions
GET    /api/hrExtended/retention-bonuses
GET    /api/hrExtended/salary-components
GET    /api/hrExtended/settings
GET    /api/hrExtended/settings/leave
GET    /api/hrExtended/settings/payroll
GET    /api/hrExtended/setup-wizard
GET    /api/hrExtended/setup-wizard/progress
GET    /api/hrExtended/skills
GET    /api/hrExtended/skills/by-category
GET    /api/hrExtended/staffing-plans
GET    /api/hrExtended/staffing-plans/vacancy-summary
GET    /api/hrExtended/transfers
GET    /api/hrExtended/vehicles
GET    /api/hrExtended/vehicles/fleet-summary
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
GET    /api/interCompany/balances
GET    /api/interCompany/balances/:firmId
GET    /api/interCompany/reconciliation
GET    /api/interCompany/transactions
GET    /api/interCompany/transactions/:id
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
GET    /api/investments
GET    /api/investments/:id
GET    /api/investments/:id/transactions
GET    /api/investments/summary
GET    /api/investmentSearch/market/:market
GET    /api/investmentSearch/markets
GET    /api/investmentSearch/quote
GET    /api/investmentSearch/sectors
GET    /api/investmentSearch/symbol/:symbol
GET    /api/investmentSearch/symbols
GET    /api/investmentSearch/type/:type
GET    /api/investmentSearch/types
GET    /api/invitation/:code
GET    /api/invitation/:code/validate
GET    /api/invoice
GET    /api/invoice/:_id
GET    /api/invoice/:id
GET    /api/invoice/:id/pdf
GET    /api/invoice/:id/xml
GET    /api/invoice/:id/zatca/status
GET    /api/invoice/billable-items
GET    /api/invoice/open/:clientId
GET    /api/invoice/overdue
GET    /api/invoice/stats
GET    /api/invoiceApproval
GET    /api/invoiceApproval/:id
GET    /api/invoiceApproval/needing-escalation
GET    /api/invoiceApproval/pending
GET    /api/invoiceApproval/stats
GET    /api/invoiceTemplate
GET    /api/invoiceTemplate/:id
GET    /api/invoiceTemplate/:id/export
GET    /api/invoiceTemplate/:id/preview
GET    /api/invoiceTemplate/default
GET    /api/job
GET    /api/job/:_id
GET    /api/job/my-jobs
GET    /api/jobPosition
GET    /api/jobPosition/:id
GET    /api/jobPosition/:id/hierarchy
GET    /api/jobPosition/department/:departmentId
GET    /api/jobPosition/export
GET    /api/jobPosition/org-chart
GET    /api/jobPosition/stats
GET    /api/jobPosition/vacant
GET    /api/journalEntry
GET    /api/journalEntry/:id
GET    /api/keyboardShortcuts
GET    /api/keyboardShortcuts/:id
GET    /api/keyboardShortcuts/defaults
GET    /api/kpiAnalytics/case-throughput
GET    /api/kpiAnalytics/kpi-dashboard
GET    /api/kpiAnalytics/revenue-by-case
GET    /api/kpiAnalytics/user-activation
GET    /api/kyc/admin/pending
GET    /api/kyc/admin/stats
GET    /api/kyc/history
GET    /api/kyc/status
GET    /api/lawyer
GET    /api/lawyer/:_id
GET    /api/lawyer/team
GET    /api/ldap/config
GET    /api/lead
GET    /api/lead/:id
GET    /api/lead/:id/activities
GET    /api/lead/:id/conversion-preview
GET    /api/lead/follow-up
GET    /api/lead/overview
GET    /api/lead/pipeline/:pipelineId?
GET    /api/lead/stats
GET    /api/leadConversion/:id/cases
GET    /api/leadConversion/case/:caseId/quotes
GET    /api/leadScoring/by-grade/:grade
GET    /api/leadScoring/conversion-analysis
GET    /api/leadScoring/distribution
GET    /api/leadScoring/insights/:leadId
GET    /api/leadScoring/leaderboard
GET    /api/leadScoring/scores
GET    /api/leadScoring/top-leads
GET    /api/leadScoring/trends
GET    /api/leadSource
GET    /api/leadSource/:id
GET    /api/leaveManagement/leave-allocations
GET    /api/leaveManagement/leave-allocations/:id
GET    /api/leaveManagement/leave-allocations/balance/:employeeId/:leaveTypeId
GET    /api/leaveManagement/leave-allocations/employee/:employeeId
GET    /api/leaveManagement/leave-periods
GET    /api/leaveManagement/leave-periods/:id
GET    /api/leaveManagement/leave-periods/current
GET    /api/leaveManagement/leave-policies
GET    /api/leaveManagement/leave-policies/:id
GET    /api/leaveManagement/leave-policies/default
GET    /api/leaveRequest
GET    /api/leaveRequest/:id
GET    /api/leaveRequest/balance/:employeeId
GET    /api/leaveRequest/calendar
GET    /api/leaveRequest/pending-approvals
GET    /api/leaveRequest/stats
GET    /api/leaveRequest/types
GET    /api/legalContract
GET    /api/legalContract/:contractId
GET    /api/legalContract/:contractId/amendments
GET    /api/legalContract/:contractId/export/pdf
GET    /api/legalContract/:contractId/export/word
GET    /api/legalContract/:contractId/notarization/verify
GET    /api/legalContract/:contractId/reminders
GET    /api/legalContract/:contractId/signatures
GET    /api/legalContract/:contractId/versions
GET    /api/legalContract/client/:clientId
GET    /api/legalContract/expiring
GET    /api/legalContract/search
GET    /api/legalContract/statistics
GET    /api/legalContract/templates
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
GET    /api/matterBudget
GET    /api/matterBudget/:id
GET    /api/matterBudget/:id/analysis
GET    /api/matterBudget/:id/entries
GET    /api/matterBudget/alerts
GET    /api/matterBudget/case/:caseId
GET    /api/matterBudget/templates
GET    /api/message/:conversationID
GET    /api/message/stats
GET    /api/metrics
GET    /api/metrics/json
GET    /api/metrics/performance
GET    /api/mfa/backup-codes/count
GET    /api/mfa/status
GET    /api/microsoftCalendar/auth
GET    /api/microsoftCalendar/calendars
GET    /api/microsoftCalendar/callback
GET    /api/microsoftCalendar/events
GET    /api/microsoftCalendar/status
GET    /api/microsoftCalendar/sync/settings
GET    /api/mlScoring/analytics/dashboard
GET    /api/mlScoring/analytics/feature-importance
GET    /api/mlScoring/analytics/score-distribution
GET    /api/mlScoring/model/metrics
GET    /api/mlScoring/priority-queue
GET    /api/mlScoring/priority-queue/workload
GET    /api/mlScoring/scores
GET    /api/mlScoring/scores/:leadId
GET    /api/mlScoring/scores/:leadId/explanation
GET    /api/mlScoring/scores/:leadId/hybrid
GET    /api/mlScoring/sla/breaches
GET    /api/mlScoring/sla/metrics
GET    /api/notification
GET    /api/notification/:id
GET    /api/notification/by-type/:type
GET    /api/notification/unread-count
GET    /api/notificationPreference
GET    /api/notificationPreference/defaults
GET    /api/notificationPreference/quiet-hours/status
GET    /api/notificationPreference/stats
GET    /api/notificationSettings
GET    /api/oauth/:providerType/authorize
GET    /api/oauth/:providerType/callback
GET    /api/oauth/domain/:domain
GET    /api/oauth/linked
GET    /api/oauth/providers
GET    /api/offboarding
GET    /api/offboarding/:offboardingId
GET    /api/offboarding/by-employee/:employeeId
GET    /api/offboarding/pending-clearances
GET    /api/offboarding/pending-settlements
GET    /api/offboarding/stats
GET    /api/offlineSyncs/changes
GET    /api/offlineSyncs/data
GET    /api/offlineSyncs/manifest
GET    /api/offlineSyncs/status
GET    /api/okr
GET    /api/okr/:id
GET    /api/okr/nine-box
GET    /api/okr/nine-box/distribution
GET    /api/okr/nine-box/employee/:employeeId
GET    /api/okr/nine-box/succession
GET    /api/okr/stats
GET    /api/okr/tree
GET    /api/onboarding
GET    /api/onboarding/:onboardingId
GET    /api/onboarding/by-employee/:employeeId
GET    /api/onboarding/stats
GET    /api/onboarding/upcoming-reviews
GET    /api/order
GET    /api/organization
GET    /api/organization/:id
GET    /api/organization/client/:clientId
GET    /api/organization/search
GET    /api/organizationalUnit
GET    /api/organizationalUnit/:id
GET    /api/organizationalUnit/:id/children
GET    /api/organizationalUnit/:id/path
GET    /api/organizationalUnit/export
GET    /api/organizationalUnit/stats
GET    /api/organizationalUnit/tree
GET    /api/organizationTemplate/:id/preview
GET    /api/organizationTemplate/admin
GET    /api/organizationTemplate/admin/:id
GET    /api/organizationTemplate/admin/:id/compare/:firmId
GET    /api/organizationTemplate/admin/stats
GET    /api/organizationTemplate/available
GET    /api/organizationTemplate/default
GET    /api/payment
GET    /api/payment/:id
GET    /api/payment/new
GET    /api/payment/pending-checks
GET    /api/payment/stats
GET    /api/payment/summary
GET    /api/payment/unreconciled
GET    /api/paymentReceipt
GET    /api/paymentReceipt/:id
GET    /api/paymentReceipt/:id/download
GET    /api/paymentReceipt/stats
GET    /api/paymentTerms
GET    /api/paymentTerms/:id
GET    /api/paymentTerms/default
GET    /api/payout/payouts
GET    /api/payout/payouts/:id
GET    /api/payout/payouts/stats
GET    /api/payout/stripe/account
GET    /api/payout/stripe/callback
GET    /api/payout/stripe/dashboard
GET    /api/payroll
GET    /api/payroll/:id
GET    /api/payroll/stats
GET    /api/payrollRun
GET    /api/payrollRun/:id
GET    /api/payrollRun/:id/export
GET    /api/payrollRun/stats
GET    /api/pdfme/download/:fileName
GET    /api/pdfme/templates
GET    /api/pdfme/templates/:id
GET    /api/pdfme/templates/default/:category
GET    /api/peerReview/:lawyerId
GET    /api/performanceReview
GET    /api/performanceReview/:id
GET    /api/performanceReview/calibration-sessions
GET    /api/performanceReview/employee/:employeeId/history
GET    /api/performanceReview/overdue
GET    /api/performanceReview/stats
GET    /api/performanceReview/team/:managerId/summary
GET    /api/performanceReview/templates
GET    /api/permission/cache/stats
GET    /api/permission/config
GET    /api/permission/decisions
GET    /api/permission/decisions/compliance-report
GET    /api/permission/decisions/denied
GET    /api/permission/decisions/stats
GET    /api/permission/expand/:namespace/:resourceId/:relation
GET    /api/permission/my-permissions
GET    /api/permission/relations/:namespace/:object
GET    /api/permission/relations/stats
GET    /api/permission/ui/config
GET    /api/permission/ui/matrix
GET    /api/permission/ui/pages/all
GET    /api/permission/ui/sidebar
GET    /api/permission/ui/sidebar/all
GET    /api/permission/user-resources/:userId
GET    /api/plan
GET    /api/plan/current
GET    /api/plan/features
GET    /api/plan/limits
GET    /api/plan/usage
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
GET    /api/priceLevel
GET    /api/priceLevel/:id
GET    /api/priceLevel/client-rate
GET    /api/products
GET    /api/products/:id
GET    /api/products/category/:category
GET    /api/products/search
GET    /api/products/stats
GET    /api/proposal/job/:jobId
GET    /api/proposal/my-proposals
GET    /api/quality/actions
GET    /api/quality/actions/:id
GET    /api/quality/inspections
GET    /api/quality/inspections/:id
GET    /api/quality/settings
GET    /api/quality/stats
GET    /api/quality/templates
GET    /api/quality/templates/:id
GET    /api/question
GET    /api/question/:_id
GET    /api/queue
GET    /api/queue/:name
GET    /api/queue/:name/counts
GET    /api/queue/:name/jobs
GET    /api/queue/:name/jobs/:jobId
GET    /api/quotes
GET    /api/quotes/:id
GET    /api/quotes/:id/pdf
GET    /api/rateCard
GET    /api/rateCard/:id
GET    /api/rateCard/case/:caseId
GET    /api/rateCard/client/:clientId
GET    /api/rateGroup
GET    /api/rateGroup/:id
GET    /api/rateGroup/default
GET    /api/rateLimit/config
GET    /api/rateLimit/effective
GET    /api/rateLimit/firms/:firmId
GET    /api/rateLimit/firms/:firmId/throttled
GET    /api/rateLimit/firms/:firmId/top-users
GET    /api/rateLimit/overview
GET    /api/rateLimit/tiers/:tier
GET    /api/rateLimit/users/:userId
GET    /api/rateLimit/users/:userId/stats
GET    /api/recruitment/applicants
GET    /api/recruitment/applicants/:id
GET    /api/recruitment/applicants/stats
GET    /api/recruitment/jobs
GET    /api/recruitment/jobs/:id
GET    /api/recruitment/jobs/:id/pipeline
GET    /api/recruitment/jobs/nearing-deadline
GET    /api/recruitment/jobs/stats
GET    /api/recruitment/stats
GET    /api/recruitment/talent-pool
GET    /api/recurringInvoice
GET    /api/recurringInvoice/:id
GET    /api/recurringInvoice/:id/history
GET    /api/recurringInvoice/:id/preview
GET    /api/recurringInvoice/stats
GET    /api/recurringTransaction
GET    /api/recurringTransaction/:id
GET    /api/recurringTransaction/upcoming
GET    /api/referral
GET    /api/referral/:id
GET    /api/referral/:id/calculate-fee
GET    /api/referral/stats
GET    /api/referral/top
GET    /api/refund/:id
GET    /api/refund/admin/all
GET    /api/refund/admin/pending
GET    /api/refund/admin/statistics
GET    /api/refund/eligibility/:paymentId
GET    /api/refund/history
GET    /api/regionalBanks/callback
GET    /api/regionalBanks/countries
GET    /api/regionalBanks/countries/:countryCode/banks
GET    /api/regionalBanks/find-by-iban
GET    /api/regionalBanks/stats
GET    /api/regionalBanks/status/:accountId
GET    /api/reminder
GET    /api/reminder/:id
GET    /api/reminder/:id/activity
GET    /api/reminder/archived
GET    /api/reminder/case/:caseId
GET    /api/reminder/client/:clientId
GET    /api/reminder/conflicts
GET    /api/reminder/delegated
GET    /api/reminder/export
GET    /api/reminder/ids
GET    /api/reminder/location/locations
GET    /api/reminder/location/summary
GET    /api/reminder/overdue
GET    /api/reminder/search
GET    /api/reminder/snoozed-due
GET    /api/reminder/stats
GET    /api/reminder/upcoming
GET    /api/report
GET    /api/report/:id
GET    /api/report/ap-aging
GET    /api/report/ar-aging
GET    /api/report/balance-sheet
GET    /api/report/budget-variance
GET    /api/report/case-profitability
GET    /api/report/cases-chart
GET    /api/report/client-statement
GET    /api/report/cost-center
GET    /api/report/gross-profit
GET    /api/report/profit-loss
GET    /api/report/revenue-chart
GET    /api/report/tasks-chart
GET    /api/report/trial-balance
GET    /api/report/vendor-ledger
GET    /api/reports
GET    /api/reports/:id
GET    /api/reports/:id/execute
GET    /api/reports/:id/export/:format
GET    /api/retainer
GET    /api/retainer/:id
GET    /api/retainer/:id/history
GET    /api/retainer/low-balance
GET    /api/retainer/stats
GET    /api/review/:gigID
GET    /api/salesForecasts
GET    /api/salesForecasts/:id
GET    /api/salesForecasts/by-period
GET    /api/salesForecasts/current-quarter
GET    /api/salesPerson
GET    /api/salesPerson/:id
GET    /api/salesPerson/:id/stats
GET    /api/salesPerson/tree
GET    /api/salesQuota
GET    /api/salesQuota/:id
GET    /api/salesQuota/leaderboard
GET    /api/salesQuota/my-quota
GET    /api/salesQuota/period-comparison
GET    /api/salesQuota/team-summary
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
GET    /api/saml/config
GET    /api/saml/login/:firmId
GET    /api/saml/logout/:firmId
GET    /api/saml/metadata/:firmId
GET    /api/sandboxs
GET    /api/sandboxs/:id/check-limit
GET    /api/sandboxs/stats
GET    /api/sandboxs/templates
GET    /api/saudiBanking/compliance/deadlines
GET    /api/saudiBanking/lean/accounts/:accountId/balance
GET    /api/saudiBanking/lean/accounts/:accountId/transactions
GET    /api/saudiBanking/lean/banks
GET    /api/saudiBanking/lean/customers
GET    /api/saudiBanking/lean/customers/:customerId/entities
GET    /api/saudiBanking/lean/customers/:customerId/token
GET    /api/saudiBanking/lean/entities/:entityId/accounts
GET    /api/saudiBanking/lean/entities/:entityId/identity
GET    /api/saudiBanking/mudad/submissions/:submissionId/status
GET    /api/saudiBanking/sadad/billers
GET    /api/saudiBanking/sadad/billers/search
GET    /api/saudiBanking/sadad/payments/:transactionId/status
GET    /api/saudiBanking/sadad/payments/history
GET    /api/saudiBanking/wps/files
GET    /api/saudiBanking/wps/sarie-banks
GET    /api/savedFilters
GET    /api/savedFilters/:id
GET    /api/savedFilters/popular/:entityType
GET    /api/savedReport/reports
GET    /api/savedReport/reports/:id
GET    /api/savedReport/widgets
GET    /api/savedReport/widgets/:id
GET    /api/savedReport/widgets/:id/data
GET    /api/savedReport/widgets/defaults
GET    /api/score/:lawyerId
GET    /api/score/top/lawyers
GET    /api/security/dashboard
GET    /api/security/incidents
GET    /api/security/incidents/:id
GET    /api/security/incidents/open
GET    /api/security/stats
GET    /api/securityIncident/csp-violations
GET    /api/securityIncident/incidents
GET    /api/securityIncident/incidents/stats
GET    /api/setupWizard/next-task
GET    /api/setupWizard/progress-percentage
GET    /api/setupWizard/sections
GET    /api/setupWizard/status
GET    /api/shift/shift-assignments
GET    /api/shift/shift-assignments/:id
GET    /api/shift/shift-assignments/employee/:employeeId
GET    /api/shift/shift-assignments/employee/:employeeId/current
GET    /api/shift/shift-types
GET    /api/shift/shift-types-ramadan
GET    /api/shift/shift-types-stats
GET    /api/shift/shift-types/:id
GET    /api/skillMatrix
GET    /api/skillMatrix/:id
GET    /api/skillMatrix/:skillId/employees
GET    /api/skillMatrix/assessments
GET    /api/skillMatrix/assessments/:id
GET    /api/skillMatrix/by-category
GET    /api/skillMatrix/competencies
GET    /api/skillMatrix/competencies/:id
GET    /api/skillMatrix/cpd-non-compliant
GET    /api/skillMatrix/employee/:employeeId
GET    /api/skillMatrix/expiring-certifications
GET    /api/skillMatrix/gap-analysis
GET    /api/skillMatrix/matrix
GET    /api/skillMatrix/needing-review
GET    /api/skillMatrix/sfia-levels
GET    /api/skillMatrix/stats
GET    /api/skillMatrix/types
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
GET    /api/smartButton/:model/:recordId/counts
GET    /api/smartScheduling/nudges
GET    /api/smartScheduling/patterns
GET    /api/smartScheduling/workload
GET    /api/ssoConfig/:firmId/sso
GET    /api/staff
GET    /api/staff/:id
GET    /api/staff/stats
GET    /api/staff/team
GET    /api/statement
GET    /api/statement/:id
GET    /api/statement/:id/download
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
GET    /api/successionPlan
GET    /api/successionPlan/:id
GET    /api/successionPlan/by-incumbent/:incumbentId
GET    /api/successionPlan/by-position/:positionId
GET    /api/successionPlan/critical-without-successors
GET    /api/successionPlan/export
GET    /api/successionPlan/high-risk
GET    /api/successionPlan/review-due
GET    /api/successionPlan/stats
GET    /api/support/settings
GET    /api/support/slas
GET    /api/support/slas/:id
GET    /api/support/stats
GET    /api/support/tickets
GET    /api/support/tickets/:id
GET    /api/survey
GET    /api/survey/:id
GET    /api/survey/:id/results
GET    /api/survey/my-surveys
GET    /api/survey/stats
GET    /api/survey/templates
GET    /api/survey/templates/:id
GET    /api/tag
GET    /api/tag/:id
GET    /api/tag/entity/:entityType
GET    /api/tag/popular
GET    /api/task
GET    /api/task/:id
GET    /api/task/:id/activity
GET    /api/task/:id/attachments/:attachmentId/download-url
GET    /api/task/:id/attachments/:attachmentId/versions
GET    /api/task/:id/documents
GET    /api/task/:id/documents/:documentId
GET    /api/task/:id/documents/:documentId/versions
GET    /api/task/:id/documents/:documentId/versions/:versionId
GET    /api/task/:id/full
GET    /api/task/:id/time-tracking/summary
GET    /api/task/archived
GET    /api/task/case/:caseId
GET    /api/task/client/:clientId
GET    /api/task/conflicts
GET    /api/task/due-today
GET    /api/task/export
GET    /api/task/ids
GET    /api/task/location-triggers
GET    /api/task/overdue
GET    /api/task/overview
GET    /api/task/search
GET    /api/task/smart-schedule
GET    /api/task/stats
GET    /api/task/templates
GET    /api/task/templates/:templateId
GET    /api/task/timers/active
GET    /api/task/upcoming
GET    /api/team
GET    /api/team/:id
GET    /api/team/:id/activity
GET    /api/team/options
GET    /api/team/stats
GET    /api/telegram/chats
GET    /api/telegram/status
GET    /api/temporalCase/:id/workflow/status
GET    /api/temporalInvoice/:id/approval-status
GET    /api/temporalInvoice/pending-approvals
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
GET    /api/timelines/:entityType/:entityId
GET    /api/timelines/:entityType/:entityId/summary
GET    /api/timeTracking/activity-codes
GET    /api/timeTracking/entries
GET    /api/timeTracking/entries/:id
GET    /api/timeTracking/entries/pending-approval
GET    /api/timeTracking/stats
GET    /api/timeTracking/timer/status
GET    /api/timeTracking/unbilled
GET    /api/timeTracking/weekly
GET    /api/trades
GET    /api/trades/:id
GET    /api/trades/stats
GET    /api/trades/stats/chart
GET    /api/tradingAccounts
GET    /api/tradingAccounts/:id
GET    /api/tradingAccounts/:id/balance
GET    /api/training
GET    /api/training/:trainingId
GET    /api/training/by-employee/:employeeId
GET    /api/training/calendar
GET    /api/training/cle-summary/:employeeId
GET    /api/training/export
GET    /api/training/overdue-compliance
GET    /api/training/pending-approvals
GET    /api/training/policies
GET    /api/training/providers
GET    /api/training/stats
GET    /api/training/upcoming
GET    /api/transaction
GET    /api/transaction/:id
GET    /api/transaction/balance
GET    /api/transaction/by-category
GET    /api/transaction/summary
GET    /api/trello/auth-url
GET    /api/trello/boards
GET    /api/trello/boards/:boardId
GET    /api/trello/boards/:boardId/lists
GET    /api/trello/callback
GET    /api/trello/lists/:listId/cards
GET    /api/trello/settings
GET    /api/trello/status
GET    /api/trustAccount
GET    /api/trustAccount/:id
GET    /api/trustAccount/:id/balances
GET    /api/trustAccount/:id/balances/:clientId
GET    /api/trustAccount/:id/reconciliations
GET    /api/trustAccount/:id/summary
GET    /api/trustAccount/:id/three-way-reconciliations
GET    /api/trustAccount/:id/transactions
GET    /api/trustAccount/:id/transactions/:transactionId
GET    /api/unifiedData/billable-items
GET    /api/unifiedData/case-financials/:caseId
GET    /api/unifiedData/client-portfolio/:clientId
GET    /api/unifiedData/financial-summary
GET    /api/unifiedData/hr-dashboard
GET    /api/unifiedData/open-invoices
GET    /api/user/:_id
GET    /api/user/lawyer/:username
GET    /api/user/lawyers
GET    /api/user/notification-preferences
GET    /api/user/push-subscription
GET    /api/user/team
GET    /api/user/vapid-public-key
GET    /api/userSettings
GET    /api/userSettings/view-mode/:module
GET    /api/vendor
GET    /api/vendor/:id
GET    /api/vendor/:id/summary
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
GET    /api/walkthrough
GET    /api/walkthrough/:id
GET    /api/walkthrough/admin
GET    /api/walkthrough/progress
GET    /api/walkthrough/stats
GET    /api/webauthn/credentials
GET    /api/webhook
GET    /api/webhook/:id
GET    /api/webhook/:id/deliveries
GET    /api/webhook/:id/deliveries/:deliveryId
GET    /api/webhook/:id/secret
GET    /api/webhook/events
GET    /api/webhook/stats
GET    /api/whatsapp/analytics
GET    /api/whatsapp/broadcasts/:id/analytics
GET    /api/whatsapp/broadcasts/stats
GET    /api/whatsapp/conversations/:id/messages
GET    /api/whatsapp/stats
GET    /api/whosOut/coverage/:department
GET    /api/whosOut/departments
GET    /api/whosOut/month
GET    /api/whosOut/today
GET    /api/whosOut/upcoming
GET    /api/whosOut/week
GET    /api/workflow/entity/:entityType/:entityId
GET    /api/workflow/instances
GET    /api/workflow/instances/:id
GET    /api/workflow/templates
GET    /api/workflow/templates/:id
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

### POST (1657)

<details>
<summary>Click to expand</summary>

```
POST   /api/account
POST   /api/activityPlans
POST   /api/activityPlans/:id/duplicate
POST   /api/activitys
POST   /api/activitys/:id/cancel
POST   /api/activitys/:id/done
POST   /api/activitys/types
POST   /api/admin/firm/expire-all-passwords
POST   /api/admin/revoked-tokens/cleanup
POST   /api/admin/users/:id/claims/validate
POST   /api/admin/users/:id/expire-password
POST   /api/admin/users/:id/revoke-tokens
POST   /api/adminApi/users/:id/reset-password
POST   /api/adminApi/users/:id/revoke-tokens
POST   /api/adminTools/clear-cache
POST   /api/adminTools/clients/merge
POST   /api/adminTools/firms/:id/cleanup-orphaned
POST   /api/adminTools/firms/:id/fix-currency
POST   /api/adminTools/firms/:id/import
POST   /api/adminTools/firms/:id/recalculate-invoices
POST   /api/adminTools/firms/:id/reindex
POST   /api/adminTools/impersonation/:sessionId/end
POST   /api/adminTools/key-rotation/auto-rotate
POST   /api/adminTools/key-rotation/cleanup
POST   /api/adminTools/key-rotation/generate
POST   /api/adminTools/key-rotation/initialize
POST   /api/adminTools/key-rotation/rotate
POST   /api/adminTools/users/:id/impersonate
POST   /api/adminTools/users/:id/lock
POST   /api/adminTools/users/:id/reset-password
POST   /api/adminTools/users/:id/unlock
POST   /api/adminTools/users/merge
POST   /api/aiChat
POST   /api/aiChat/stream
POST   /api/aiMatching/auto-match
POST   /api/aiMatching/batch
POST   /api/aiMatching/confirm
POST   /api/aiMatching/match
POST   /api/aiMatching/patterns/cleanup
POST   /api/aiMatching/reject
POST   /api/aiMatching/suggestions/bulk-confirm
POST   /api/aiMatching/unmatch
POST   /api/aiSettings/keys
POST   /api/aiSettings/validate
POST   /api/analyticsReport
POST   /api/analyticsReport/:id/clone
POST   /api/analyticsReport/:id/export
POST   /api/analyticsReport/:id/favorite
POST   /api/analyticsReport/:id/pin
POST   /api/analyticsReport/:id/run
POST   /api/analyticsReport/:id/schedule
POST   /api/analyticsReport/bulk-delete
POST   /api/analyticsReport/from-template/:templateId
POST   /api/analyticss/events
POST   /api/answer
POST   /api/answer/like/:_id
POST   /api/apiKey
POST   /api/apiKey/:id/regenerate
POST   /api/appointment
POST   /api/appointment/:id/reschedule
POST   /api/appointment/:id/sync-calendar
POST   /api/appointment/availability
POST   /api/appointment/availability/bulk
POST   /api/appointment/blocked-times
POST   /api/appointment/book/:firmId
POST   /api/approval/:id/approve
POST   /api/approval/:id/cancel
POST   /api/approval/:id/reject
POST   /api/approvals/:id/cancel
POST   /api/approvals/:id/decide
POST   /api/approvals/:id/delegate
POST   /api/approvals/initiate
POST   /api/approvals/workflows
POST   /api/apps/:appId/connect
POST   /api/apps/:appId/disconnect
POST   /api/apps/:appId/sync
POST   /api/apps/:appId/test
POST   /api/assetAssignment
POST   /api/assetAssignment/:id/acknowledge
POST   /api/assetAssignment/:id/clearance
POST   /api/assetAssignment/:id/incident
POST   /api/assetAssignment/:id/maintenance
POST   /api/assetAssignment/:id/repair
POST   /api/assetAssignment/:id/return/complete
POST   /api/assetAssignment/:id/return/initiate
POST   /api/assetAssignment/:id/transfer
POST   /api/assetAssignment/bulk-delete
POST   /api/assets
POST   /api/assets/:id/submit
POST   /api/assets/categories
POST   /api/assets/maintenance
POST   /api/assets/maintenance/:id/complete
POST   /api/assets/movements
POST   /api/attendance
POST   /api/attendance/:id/approve
POST   /api/attendance/:id/break/end
POST   /api/attendance/:id/break/start
POST   /api/attendance/:id/corrections
POST   /api/attendance/:id/overtime/approve
POST   /api/attendance/:id/reject
POST   /api/attendance/:id/violations
POST   /api/attendance/:id/violations/:violationIndex/appeal
POST   /api/attendance/check-in
POST   /api/attendance/check-out
POST   /api/attendance/import
POST   /api/attendance/mark-absences
POST   /api/auditLog/archive/run
POST   /api/auditLog/archive/verify
POST   /api/auditLog/archiving/restore
POST   /api/auditLog/archiving/run
POST   /api/auditLog/archiving/verify
POST   /api/auditLog/check-brute-force
POST   /api/auditLog/compliance/export-for-audit
POST   /api/auditLog/compliance/generate-report
POST   /api/auditLog/compliance/verify-integrity
POST   /api/auditLog/log-bulk-action
POST   /api/auditLog/log-security-event
POST   /api/auditLog/log-with-diff
POST   /api/auth/anonymous
POST   /api/auth/anonymous/convert
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
POST   /api/auth/mfa/backup-codes/regenerate
POST   /api/auth/mfa/backup-codes/verify
POST   /api/auth/phone/resend-otp
POST   /api/auth/phone/send-otp
POST   /api/auth/phone/verify-otp
POST   /api/auth/reauthenticate
POST   /api/auth/reauthenticate/challenge
POST   /api/auth/reauthenticate/verify
POST   /api/auth/refresh
POST   /api/auth/register
POST   /api/auth/resend-otp
POST   /api/auth/resend-verification
POST   /api/auth/reset-password
POST   /api/auth/send-otp
POST   /api/auth/verify-email
POST   /api/auth/verify-otp
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
POST   /api/bankAccount
POST   /api/bankAccount/:id/disconnect
POST   /api/bankAccount/:id/set-default
POST   /api/bankAccount/:id/sync
POST   /api/bankReconciliation
POST   /api/bankReconciliation/:id/cancel
POST   /api/bankReconciliation/:id/clear
POST   /api/bankReconciliation/:id/complete
POST   /api/bankReconciliation/:id/unclear
POST   /api/bankReconciliation/auto-match/:accountId
POST   /api/bankReconciliation/currency/convert
POST   /api/bankReconciliation/currency/rates
POST   /api/bankReconciliation/currency/update
POST   /api/bankReconciliation/feeds
POST   /api/bankReconciliation/import/csv
POST   /api/bankReconciliation/import/ofx
POST   /api/bankReconciliation/match/confirm/:id
POST   /api/bankReconciliation/match/reject/:id
POST   /api/bankReconciliation/match/split
POST   /api/bankReconciliation/rules
POST   /api/bankTransaction
POST   /api/bankTransaction/:transactionId/match
POST   /api/bankTransaction/:transactionId/unmatch
POST   /api/bankTransaction/import/:accountId
POST   /api/bankTransfer
POST   /api/bankTransfer/:id/cancel
POST   /api/bill
POST   /api/bill/:id/approve
POST   /api/bill/:id/attachments
POST   /api/bill/:id/cancel
POST   /api/bill/:id/duplicate
POST   /api/bill/:id/generate-next
POST   /api/bill/:id/pay
POST   /api/bill/:id/post-to-gl
POST   /api/bill/:id/receive
POST   /api/bill/:id/stop-recurring
POST   /api/billing/payment-methods
POST   /api/billing/setup-intent
POST   /api/billing/subscription
POST   /api/billing/subscription/reactivate
POST   /api/billing/webhook
POST   /api/billingRate
POST   /api/billingRate/standard
POST   /api/billPayment
POST   /api/billPayment/:id/cancel
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
POST   /api/brokers
POST   /api/brokers/:id/set-default
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
POST   /api/captcha/verify-captcha
POST   /api/case
POST   /api/case/:_id/claim
POST   /api/case/:_id/document
POST   /api/case/:_id/documents/confirm
POST   /api/case/:_id/documents/upload-url
POST   /api/case/:_id/hearing
POST   /api/case/:_id/note
POST   /api/case/:_id/notes
POST   /api/case/:_id/rich-documents
POST   /api/case/:_id/rich-documents/:docId/versions/:versionNumber/restore
POST   /api/case/:_id/timeline
POST   /api/caseNotion/cases/:caseId/notion/blocks/:blockId/comments
POST   /api/caseNotion/cases/:caseId/notion/blocks/:blockId/create-task
POST   /api/caseNotion/cases/:caseId/notion/blocks/:blockId/link-document
POST   /api/caseNotion/cases/:caseId/notion/blocks/:blockId/link-event
POST   /api/caseNotion/cases/:caseId/notion/blocks/:blockId/link-hearing
POST   /api/caseNotion/cases/:caseId/notion/blocks/:blockId/link-task
POST   /api/caseNotion/cases/:caseId/notion/blocks/:blockId/lock
POST   /api/caseNotion/cases/:caseId/notion/blocks/:blockId/move
POST   /api/caseNotion/cases/:caseId/notion/blocks/:blockId/unlink-task
POST   /api/caseNotion/cases/:caseId/notion/blocks/:blockId/unlock
POST   /api/caseNotion/cases/:caseId/notion/comments/:commentId/resolve
POST   /api/caseNotion/cases/:caseId/notion/frames/:frameId/auto-detect
POST   /api/caseNotion/cases/:caseId/notion/frames/:frameId/children
POST   /api/caseNotion/cases/:caseId/notion/pages
POST   /api/caseNotion/cases/:caseId/notion/pages/:pageId/align
POST   /api/caseNotion/cases/:caseId/notion/pages/:pageId/apply-template
POST   /api/caseNotion/cases/:caseId/notion/pages/:pageId/archive
POST   /api/caseNotion/cases/:caseId/notion/pages/:pageId/arrows
POST   /api/caseNotion/cases/:caseId/notion/pages/:pageId/blocks
POST   /api/caseNotion/cases/:caseId/notion/pages/:pageId/connections
POST   /api/caseNotion/cases/:caseId/notion/pages/:pageId/distribute
POST   /api/caseNotion/cases/:caseId/notion/pages/:pageId/duplicate
POST   /api/caseNotion/cases/:caseId/notion/pages/:pageId/duplicate
POST   /api/caseNotion/cases/:caseId/notion/pages/:pageId/favorite
POST   /api/caseNotion/cases/:caseId/notion/pages/:pageId/frames
POST   /api/caseNotion/cases/:caseId/notion/pages/:pageId/group
POST   /api/caseNotion/cases/:caseId/notion/pages/:pageId/pin
POST   /api/caseNotion/cases/:caseId/notion/pages/:pageId/redo
POST   /api/caseNotion/cases/:caseId/notion/pages/:pageId/restore
POST   /api/caseNotion/cases/:caseId/notion/pages/:pageId/save-as-template
POST   /api/caseNotion/cases/:caseId/notion/pages/:pageId/shapes
POST   /api/caseNotion/cases/:caseId/notion/pages/:pageId/undo
POST   /api/caseNotion/cases/:caseId/notion/pages/:pageId/ungroup
POST   /api/caseNotion/cases/:caseId/notion/pages/merge
POST   /api/caseNotion/cases/:caseId/notion/synced-blocks
POST   /api/caseNotion/cases/:caseId/notion/synced-blocks/:blockId/unsync
POST   /api/chatterFollowers/:model/:recordId/followers
POST   /api/chatterFollowers/:model/:recordId/followers/bulk
POST   /api/chatterFollowers/:model/:recordId/toggle-follow
POST   /api/churn/events
POST   /api/churn/events/:id/exit-survey
POST   /api/churn/health-score/:firmId/recalculate
POST   /api/churn/interventions/:firmId/trigger
POST   /api/client
POST   /api/client/:id/attachments
POST   /api/client/:id/conflict-check
POST   /api/client/:id/verify/absher
POST   /api/client/:id/verify/address
POST   /api/client/:id/verify/wathq
POST   /api/cloudStorages/:provider/disconnect
POST   /api/cloudStorages/:provider/files
POST   /api/cloudStorages/:provider/files/:fileId/move
POST   /api/cloudStorages/:provider/files/:fileId/share
POST   /api/cloudStorages/:provider/folders
POST   /api/commandPalettes/saved-searches
POST   /api/commandPalettes/track/command
POST   /api/commandPalettes/track/record
POST   /api/commandPalettes/track/search
POST   /api/compensationReward
POST   /api/compensationReward/:id/allowances
POST   /api/compensationReward/:id/approve-review
POST   /api/compensationReward/:id/bonus
POST   /api/compensationReward/:id/decline-review
POST   /api/compensationReward/:id/recognition
POST   /api/compensationReward/:id/salary-increase
POST   /api/compensationReward/:id/submit-review
POST   /api/compensationReward/:id/total-rewards-statement
POST   /api/compensationReward/bulk-delete
POST   /api/competitor
POST   /api/competitors
POST   /api/competitors/:id/record-loss
POST   /api/competitors/:id/record-win
POST   /api/conflictCheck
POST   /api/conflictCheck/:id/matches/:matchIndex/resolve
POST   /api/conflictCheck/quick
POST   /api/consent
POST   /api/consent/export
POST   /api/consolidatedReports/eliminations
POST   /api/contact
POST   /api/contact/:id/link-case
POST   /api/contact/:id/link-client
POST   /api/contact/:id/unlink-case
POST   /api/contact/:id/unlink-client
POST   /api/contact/bulk-delete
POST   /api/contactLists
POST   /api/contactLists/:id/duplicate
POST   /api/contactLists/:id/members
POST   /api/contactLists/:id/refresh
POST   /api/conversation
POST   /api/conversations/:id/assign
POST   /api/conversations/:id/close
POST   /api/conversations/:id/messages
POST   /api/conversations/:id/reopen
POST   /api/conversations/:id/snooze
POST   /api/corporateCard
POST   /api/corporateCard/:id/block
POST   /api/corporateCard/:id/transactions/:transactionId/categorize
POST   /api/corporateCard/:id/transactions/:transactionId/dispute
POST   /api/corporateCard/:id/transactions/:transactionId/reconcile
POST   /api/corporateCard/:id/transactions/import
POST   /api/corporateCard/:id/unblock
POST   /api/creditNote
POST   /api/creditNote/:id/apply
POST   /api/creditNote/:id/issue
POST   /api/creditNote/:id/void
POST   /api/crmActivity
POST   /api/crmActivity/:id/complete
POST   /api/crmActivity/log/call
POST   /api/crmActivity/log/email
POST   /api/crmActivity/log/meeting
POST   /api/crmActivity/log/note
POST   /api/crmPipeline
POST   /api/crmPipeline/:id/default
POST   /api/crmPipeline/:id/duplicate
POST   /api/crmPipeline/:id/stages
POST   /api/crmPipeline/:id/stages/reorder
POST   /api/crmReports/export
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
POST   /api/dataExport/export
POST   /api/dataExport/import
POST   /api/dataExport/import/:id/cancel
POST   /api/dataExport/import/:id/start
POST   /api/dataExport/import/:id/validate
POST   /api/dataExport/jobs/:id/cancel
POST   /api/dataExport/templates
POST   /api/dealHealths/:id/refresh
POST   /api/dealHealths/:id/unstuck
POST   /api/dealRooms/:id/access
POST   /api/dealRooms/:id/documents
POST   /api/dealRooms/:id/documents/:index/view
POST   /api/dealRooms/:id/pages
POST   /api/dealRooms/deals/:dealId/room
POST   /api/debitNote
POST   /api/debitNote/:id/apply
POST   /api/debitNote/:id/approve
POST   /api/debitNote/:id/cancel
POST   /api/debitNote/:id/reject
POST   /api/debitNote/:id/submit
POST   /api/deduplications/contacts/auto-merge
POST   /api/deduplications/contacts/merge
POST   /api/deduplications/contacts/not-duplicate
POST   /api/deduplications/contacts/scan-duplicates
POST   /api/discord/complete-setup
POST   /api/discord/disconnect
POST   /api/discord/message
POST   /api/discord/test
POST   /api/discord/webhook
POST   /api/dispute
POST   /api/dispute/:id/escalate
POST   /api/dispute/:id/evidence
POST   /api/dispute/:id/mediator-note
POST   /api/dispute/:id/resolve
POST   /api/dispute/:id/respond
POST   /api/document/:id/move
POST   /api/document/:id/revoke-share
POST   /api/document/:id/share
POST   /api/document/:id/versions
POST   /api/document/:id/versions/:versionId/restore
POST   /api/document/bulk-delete
POST   /api/document/confirm
POST   /api/document/upload
POST   /api/documentAnalysis/:documentId
POST   /api/documentAnalysis/:documentId/reanalyze
POST   /api/documentAnalysis/batch
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
POST   /api/emailMarketing/campaigns
POST   /api/emailMarketing/campaigns/:id/cancel
POST   /api/emailMarketing/campaigns/:id/duplicate
POST   /api/emailMarketing/campaigns/:id/pause
POST   /api/emailMarketing/campaigns/:id/resume
POST   /api/emailMarketing/campaigns/:id/schedule
POST   /api/emailMarketing/campaigns/:id/send
POST   /api/emailMarketing/campaigns/:id/test
POST   /api/emailMarketing/segments
POST   /api/emailMarketing/segments/:id/refresh
POST   /api/emailMarketing/subscribers
POST   /api/emailMarketing/subscribers/:id/unsubscribe
POST   /api/emailMarketing/subscribers/export
POST   /api/emailMarketing/subscribers/import
POST   /api/emailMarketing/templates
POST   /api/emailMarketing/templates/:id/preview
POST   /api/emailMarketing/webhooks/email/resend
POST   /api/emailSettings/signatures
POST   /api/emailSettings/smtp/test
POST   /api/emailSettings/templates
POST   /api/emailSettings/templates/:id/preview
POST   /api/emailTemplates
POST   /api/emailTemplates/:id/duplicate
POST   /api/emailTemplates/:id/preview
POST   /api/emailTemplates/:id/test
POST   /api/employeeAdvance
POST   /api/employeeAdvance/:advanceId/approve
POST   /api/employeeAdvance/:advanceId/cancel
POST   /api/employeeAdvance/:advanceId/communications
POST   /api/employeeAdvance/:advanceId/disburse
POST   /api/employeeAdvance/:advanceId/documents
POST   /api/employeeAdvance/:advanceId/early-recovery
POST   /api/employeeAdvance/:advanceId/issue-clearance
POST   /api/employeeAdvance/:advanceId/payroll-deduction
POST   /api/employeeAdvance/:advanceId/recover
POST   /api/employeeAdvance/:advanceId/reject
POST   /api/employeeAdvance/:advanceId/write-off
POST   /api/employeeAdvance/bulk-delete
POST   /api/employeeAdvance/check-eligibility
POST   /api/employeeBenefit
POST   /api/employeeBenefit/:id/activate
POST   /api/employeeBenefit/:id/beneficiaries
POST   /api/employeeBenefit/:id/claims
POST   /api/employeeBenefit/:id/dependents
POST   /api/employeeBenefit/:id/pre-auth
POST   /api/employeeBenefit/:id/qualifying-events
POST   /api/employeeBenefit/:id/suspend
POST   /api/employeeBenefit/:id/terminate
POST   /api/employeeBenefit/bulk-delete
POST   /api/employeeLoan
POST   /api/employeeLoan/:loanId/approve
POST   /api/employeeLoan/:loanId/communications
POST   /api/employeeLoan/:loanId/default
POST   /api/employeeLoan/:loanId/disburse
POST   /api/employeeLoan/:loanId/documents
POST   /api/employeeLoan/:loanId/early-settlement
POST   /api/employeeLoan/:loanId/issue-clearance
POST   /api/employeeLoan/:loanId/payments
POST   /api/employeeLoan/:loanId/payroll-deduction
POST   /api/employeeLoan/:loanId/reject
POST   /api/employeeLoan/:loanId/restructure
POST   /api/employeeLoan/:loanId/submit
POST   /api/employeeLoan/bulk-delete
POST   /api/employeeLoan/check-eligibility
POST   /api/employeeSelfService/leave/request
POST   /api/employeeSelfService/leave/request/:requestId/cancel
POST   /api/event
POST   /api/event/:id/action-items
POST   /api/event/:id/agenda
POST   /api/event/:id/archive
POST   /api/event/:id/attendees
POST   /api/event/:id/cancel
POST   /api/event/:id/clone
POST   /api/event/:id/complete
POST   /api/event/:id/location/check
POST   /api/event/:id/postpone
POST   /api/event/:id/reschedule
POST   /api/event/:id/rsvp
POST   /api/event/:id/unarchive
POST   /api/event/availability
POST   /api/event/bulk
POST   /api/event/bulk/archive
POST   /api/event/bulk/complete
POST   /api/event/bulk/unarchive
POST   /api/event/import/ics
POST   /api/event/location/check
POST   /api/event/parse
POST   /api/event/voice
POST   /api/exchangeRateRevaluation
POST   /api/exchangeRateRevaluation/:id/post
POST   /api/exchangeRateRevaluation/:id/reverse
POST   /api/exchangeRateRevaluation/preview
POST   /api/expense
POST   /api/expense/:id/approve
POST   /api/expense/:id/receipt
POST   /api/expense/:id/reimburse
POST   /api/expense/:id/reject
POST   /api/expense/:id/submit
POST   /api/expense/bulk-approve
POST   /api/expense/bulk-delete
POST   /api/expense/suggest-category
POST   /api/expenseClaim
POST   /api/expenseClaim/:id/approve
POST   /api/expenseClaim/:id/approve-exception
POST   /api/expenseClaim/:id/check-compliance
POST   /api/expenseClaim/:id/confirm-payment
POST   /api/expenseClaim/:id/create-invoice
POST   /api/expenseClaim/:id/duplicate
POST   /api/expenseClaim/:id/line-items
POST   /api/expenseClaim/:id/mark-billable
POST   /api/expenseClaim/:id/process-payment
POST   /api/expenseClaim/:id/receipts
POST   /api/expenseClaim/:id/receipts/:receiptId/verify
POST   /api/expenseClaim/:id/reconcile-card
POST   /api/expenseClaim/:id/reject
POST   /api/expenseClaim/:id/request-changes
POST   /api/expenseClaim/:id/submit
POST   /api/expenseClaim/bulk-delete
POST   /api/expensePolicy
POST   /api/expensePolicy/:id/duplicate
POST   /api/expensePolicy/:id/set-default
POST   /api/expensePolicy/:id/toggle-status
POST   /api/expensePolicy/:policyId/check-compliance
POST   /api/expensePolicy/check-compliance
POST   /api/expensePolicy/create-default
POST   /api/fieldHistorys/:historyId/revert
POST   /api/financeSetup/complete
POST   /api/financeSetup/reset
POST   /api/firm
POST   /api/firm/:firmId/invitations
POST   /api/firm/:firmId/invitations/:invitationId/resend
POST   /api/firm/:firmId/ip-whitelist
POST   /api/firm/:firmId/ip-whitelist/disable
POST   /api/firm/:firmId/ip-whitelist/enable
POST   /api/firm/:firmId/ip-whitelist/test
POST   /api/firm/:id/access
POST   /api/firm/:id/leave
POST   /api/firm/:id/members/:memberId/depart
POST   /api/firm/:id/members/:memberId/reinstate
POST   /api/firm/:id/members/invite
POST   /api/firm/:id/transfer-ownership
POST   /api/firm/lawyer/add
POST   /api/firm/lawyer/remove
POST   /api/firm/switch
POST   /api/fiscalPeriod/:id/close
POST   /api/fiscalPeriod/:id/lock
POST   /api/fiscalPeriod/:id/open
POST   /api/fiscalPeriod/:id/reopen
POST   /api/fiscalPeriod/:id/year-end-closing
POST   /api/fiscalPeriod/create-year
POST   /api/fleet/assignments
POST   /api/fleet/assignments/:id/end
POST   /api/fleet/drivers
POST   /api/fleet/fuel-logs
POST   /api/fleet/fuel-logs/:id/verify
POST   /api/fleet/incidents
POST   /api/fleet/inspections
POST   /api/fleet/maintenance
POST   /api/fleet/trips
POST   /api/fleet/trips/:id/end
POST   /api/fleet/vehicles
POST   /api/followup
POST   /api/followup/:id/cancel
POST   /api/followup/:id/complete
POST   /api/followup/:id/notes
POST   /api/followup/:id/reschedule
POST   /api/followup/bulk-complete
POST   /api/followup/bulk-delete
POST   /api/gantt/auto-schedule/:projectId
POST   /api/gantt/baseline/:projectId
POST   /api/gantt/collaboration/presence
POST   /api/gantt/data/filter
POST   /api/gantt/level-resources/:projectId
POST   /api/gantt/link
POST   /api/gantt/milestone
POST   /api/gantt/resources/suggest
POST   /api/gantt/task/reorder
POST   /api/generalLedger/:id/void
POST   /api/generalLedger/void/:id
POST   /api/gig
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
POST   /api/googleCalendar/calendars/:calendarId/events
POST   /api/googleCalendar/disconnect
POST   /api/googleCalendar/export
POST   /api/googleCalendar/import
POST   /api/googleCalendar/sync/auto/disable
POST   /api/googleCalendar/sync/auto/enable
POST   /api/googleCalendar/sync/export/:eventId
POST   /api/googleCalendar/sync/import
POST   /api/googleCalendar/watch/:calendarId
POST   /api/googleCalendar/webhook
POST   /api/gosi/calculate
POST   /api/gosi/calculate/:employeeId
POST   /api/grievance
POST   /api/grievance/:id/acknowledge
POST   /api/grievance/:id/appeal
POST   /api/grievance/:id/appeal/decide
POST   /api/grievance/:id/close
POST   /api/grievance/:id/complete-investigation
POST   /api/grievance/:id/escalate
POST   /api/grievance/:id/evidence
POST   /api/grievance/:id/interviews
POST   /api/grievance/:id/labor-office
POST   /api/grievance/:id/resolve
POST   /api/grievance/:id/start-investigation
POST   /api/grievance/:id/timeline
POST   /api/grievance/:id/withdraw
POST   /api/grievance/:id/witnesses
POST   /api/grievance/bulk-delete
POST   /api/hr/employees
POST   /api/hr/employees/:id/allowances
POST   /api/hr/employees/:id/documents
POST   /api/hr/employees/:id/documents/:docId/verify
POST   /api/hr/employees/bulk-delete
POST   /api/hrAnalytics/snapshot
POST   /api/hrExtended/compensatory-leave
POST   /api/hrExtended/compensatory-leave/:id/approve
POST   /api/hrExtended/employee-skills
POST   /api/hrExtended/incentives
POST   /api/hrExtended/leave-encashment
POST   /api/hrExtended/leave-encashment/:id/approve
POST   /api/hrExtended/promotions
POST   /api/hrExtended/promotions/:id/apply
POST   /api/hrExtended/promotions/:id/approve
POST   /api/hrExtended/retention-bonuses
POST   /api/hrExtended/retention-bonuses/:id/vest/:milestone
POST   /api/hrExtended/salary-components
POST   /api/hrExtended/salary-components/create-defaults
POST   /api/hrExtended/setup-wizard/complete-step/:stepId
POST   /api/hrExtended/setup-wizard/skip
POST   /api/hrExtended/setup-wizard/skip-step/:stepId
POST   /api/hrExtended/skills
POST   /api/hrExtended/staffing-plans
POST   /api/hrExtended/transfers
POST   /api/hrExtended/transfers/:id/apply
POST   /api/hrExtended/transfers/:id/approve
POST   /api/hrExtended/vehicles
POST   /api/hrExtended/vehicles/:id/assign
POST   /api/hrExtended/vehicles/:id/maintenance
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
POST   /api/interCompany/reconciliation
POST   /api/interCompany/transactions
POST   /api/interCompany/transactions/:id/cancel
POST   /api/interCompany/transactions/:id/confirm
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
POST   /api/investments
POST   /api/investments/:id/refresh-price
POST   /api/investments/:id/transactions
POST   /api/investments/refresh-all
POST   /api/investmentSearch/quotes
POST   /api/invitation/:code/accept
POST   /api/invoice
POST   /api/invoice/:_id/payment
POST   /api/invoice/:_id/payments
POST   /api/invoice/:_id/send
POST   /api/invoice/:id/apply-retainer
POST   /api/invoice/:id/approve
POST   /api/invoice/:id/convert-to-credit-note
POST   /api/invoice/:id/duplicate
POST   /api/invoice/:id/payment
POST   /api/invoice/:id/payments
POST   /api/invoice/:id/record-payment
POST   /api/invoice/:id/reject
POST   /api/invoice/:id/send
POST   /api/invoice/:id/send-reminder
POST   /api/invoice/:id/submit-for-approval
POST   /api/invoice/:id/void
POST   /api/invoice/:id/zatca/submit
POST   /api/invoice/bulk-delete
POST   /api/invoice/confirm-payment
POST   /api/invoiceApproval/:id/approve
POST   /api/invoiceApproval/:id/cancel
POST   /api/invoiceApproval/:id/escalate
POST   /api/invoiceApproval/:id/reject
POST   /api/invoiceTemplate
POST   /api/invoiceTemplate/:id/duplicate
POST   /api/invoiceTemplate/:id/set-default
POST   /api/invoiceTemplate/import
POST   /api/job
POST   /api/jobPosition
POST   /api/jobPosition/:id/clone
POST   /api/jobPosition/:id/documents
POST   /api/jobPosition/:id/eliminate
POST   /api/jobPosition/:id/fill
POST   /api/jobPosition/:id/freeze
POST   /api/jobPosition/:id/unfreeze
POST   /api/jobPosition/:id/vacant
POST   /api/jobPosition/:id/vacate
POST   /api/jobPosition/bulk-delete
POST   /api/journalEntry
POST   /api/journalEntry/:id/post
POST   /api/journalEntry/:id/void
POST   /api/journalEntry/simple
POST   /api/keyboardShortcuts
POST   /api/keyboardShortcuts/:id/reset
POST   /api/keyboardShortcuts/check-conflict
POST   /api/keyboardShortcuts/reset-all
POST   /api/kyc/initiate
POST   /api/kyc/review
POST   /api/kyc/submit
POST   /api/kyc/verify
POST   /api/kyc/webhook
POST   /api/ldap/config
POST   /api/ldap/login
POST   /api/ldap/sync
POST   /api/ldap/test
POST   /api/ldap/test-auth
POST   /api/lead
POST   /api/lead/:id/activities
POST   /api/lead/:id/conflict-check
POST   /api/lead/:id/convert
POST   /api/lead/:id/follow-up
POST   /api/lead/:id/move
POST   /api/lead/:id/status
POST   /api/lead/:id/verify/absher
POST   /api/lead/:id/verify/address
POST   /api/lead/:id/verify/wathq
POST   /api/lead/bulk-delete
POST   /api/leadConversion/:id/convert
POST   /api/leadScoring/calculate-all
POST   /api/leadScoring/calculate-batch
POST   /api/leadScoring/calculate/:leadId
POST   /api/leadScoring/process-decay
POST   /api/leadScoring/track/call
POST   /api/leadScoring/track/document-view
POST   /api/leadScoring/track/email-click
POST   /api/leadScoring/track/email-open
POST   /api/leadScoring/track/form-submit
POST   /api/leadScoring/track/meeting
POST   /api/leadScoring/track/website-visit
POST   /api/leadSource
POST   /api/leadSource/defaults
POST   /api/leaveManagement/leave-allocations
POST   /api/leaveManagement/leave-allocations/:id/adjust
POST   /api/leaveManagement/leave-allocations/:id/approve
POST   /api/leaveManagement/leave-allocations/bulk
POST   /api/leaveManagement/leave-allocations/generate
POST   /api/leaveManagement/leave-periods
POST   /api/leaveManagement/leave-periods/:id/activate
POST   /api/leaveManagement/leave-periods/:id/close
POST   /api/leaveManagement/leave-policies
POST   /api/leaveManagement/leave-policies/:id/clone
POST   /api/leaveRequest
POST   /api/leaveRequest/:id/approve
POST   /api/leaveRequest/:id/cancel
POST   /api/leaveRequest/:id/complete-handover
POST   /api/leaveRequest/:id/confirm-return
POST   /api/leaveRequest/:id/documents
POST   /api/leaveRequest/:id/reject
POST   /api/leaveRequest/:id/request-extension
POST   /api/leaveRequest/:id/submit
POST   /api/leaveRequest/bulk-delete
POST   /api/leaveRequest/check-conflicts
POST   /api/legalContract
POST   /api/legalContract/:contractId/amendments
POST   /api/legalContract/:contractId/breach
POST   /api/legalContract/:contractId/enforcement
POST   /api/legalContract/:contractId/link-case
POST   /api/legalContract/:contractId/notarization
POST   /api/legalContract/:contractId/parties
POST   /api/legalContract/:contractId/reminders
POST   /api/legalContract/:contractId/save-as-template
POST   /api/legalContract/:contractId/signatures/:partyIndex
POST   /api/legalContract/:contractId/signatures/initiate
POST   /api/legalContract/:contractId/versions
POST   /api/legalContract/:contractId/versions/:versionNumber/revert
POST   /api/legalContract/templates/:templateId/use
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
POST   /api/matterBudget
POST   /api/matterBudget/:id/entries
POST   /api/matterBudget/:id/phases
POST   /api/matterBudget/templates
POST   /api/message
POST   /api/metrics/reset
POST   /api/mfa/backup-codes/generate
POST   /api/mfa/backup-codes/regenerate
POST   /api/mfa/backup-codes/verify
POST   /api/mfa/disable
POST   /api/mfa/setup
POST   /api/mfa/verify
POST   /api/mfa/verify-setup
POST   /api/microsoftCalendar/disconnect
POST   /api/microsoftCalendar/events
POST   /api/microsoftCalendar/export
POST   /api/microsoftCalendar/import
POST   /api/microsoftCalendar/refresh-token
POST   /api/microsoftCalendar/sync/disable-auto-sync
POST   /api/microsoftCalendar/sync/enable-auto-sync
POST   /api/microsoftCalendar/sync/from-microsoft
POST   /api/microsoftCalendar/sync/to-microsoft/:eventId
POST   /api/mlScoring/model/export
POST   /api/mlScoring/priority/:leadId/contact
POST   /api/mlScoring/scores/:leadId/calculate
POST   /api/mlScoring/scores/batch
POST   /api/mlScoring/train
POST   /api/notification
POST   /api/notificationPreference/mute/:category
POST   /api/notificationPreference/reset
POST   /api/notificationPreference/test
POST   /api/notificationPreference/unmute/:category
POST   /api/notificationSettings/mute/:type
POST   /api/notificationSettings/reset
POST   /api/notificationSettings/unmute/:type
POST   /api/oauth/:provider/callback
POST   /api/oauth/callback
POST   /api/oauth/detect
POST   /api/oauth/domain/:domain/cache/invalidate
POST   /api/oauth/domain/:domain/verify
POST   /api/oauth/domain/:domain/verify/generate
POST   /api/oauth/domain/:domain/verify/manual
POST   /api/oauth/initiate
POST   /api/oauth/link
POST   /api/offboarding
POST   /api/offboarding/:offboardingId/approve-settlement
POST   /api/offboarding/:offboardingId/calculate-settlement
POST   /api/offboarding/:offboardingId/clearance/:section/complete
POST   /api/offboarding/:offboardingId/clearance/items
POST   /api/offboarding/:offboardingId/complete
POST   /api/offboarding/:offboardingId/exit-interview
POST   /api/offboarding/:offboardingId/issue-experience-certificate
POST   /api/offboarding/:offboardingId/process-payment
POST   /api/offboarding/bulk-delete
POST   /api/offlineSyncs/conflicts/resolve
POST   /api/offlineSyncs/sync
POST   /api/okr
POST   /api/okr/:id/activate
POST   /api/okr/:id/check-in
POST   /api/okr/nine-box
POST   /api/onboarding
POST   /api/onboarding/:onboardingId/checklist/categories
POST   /api/onboarding/:onboardingId/checklist/categories/:categoryId/tasks
POST   /api/onboarding/:onboardingId/complete
POST   /api/onboarding/:onboardingId/complete-first-day
POST   /api/onboarding/:onboardingId/complete-first-month
POST   /api/onboarding/:onboardingId/complete-first-week
POST   /api/onboarding/:onboardingId/complete-probation
POST   /api/onboarding/:onboardingId/documents
POST   /api/onboarding/:onboardingId/documents/:type/verify
POST   /api/onboarding/:onboardingId/feedback
POST   /api/onboarding/:onboardingId/probation-reviews
POST   /api/onboarding/:onboardingId/tasks/:taskId/complete
POST   /api/onboarding/bulk-delete
POST   /api/order/create-payment-intent/:_id
POST   /api/order/create-proposal-payment-intent/:_id
POST   /api/order/create-test-contract/:_id
POST   /api/order/create-test-proposal-contract/:_id
POST   /api/organization
POST   /api/organization/:id/link-case
POST   /api/organization/:id/link-client
POST   /api/organization/:id/link-contact
POST   /api/organization/bulk-delete
POST   /api/organizationalUnit
POST   /api/organizationalUnit/:id/activate
POST   /api/organizationalUnit/:id/deactivate
POST   /api/organizationalUnit/:id/dissolve
POST   /api/organizationalUnit/:id/documents
POST   /api/organizationalUnit/:id/kpis
POST   /api/organizationalUnit/:id/leadership
POST   /api/organizationalUnit/:id/move
POST   /api/organizationalUnit/bulk-delete
POST   /api/organizationTemplate/admin
POST   /api/organizationTemplate/admin/:id/apply/:firmId
POST   /api/organizationTemplate/admin/:id/clone
POST   /api/organizationTemplate/admin/:id/set-default
POST   /api/payment
POST   /api/payment/:id/complete
POST   /api/payment/:id/fail
POST   /api/payment/:id/receipt
POST   /api/payment/:id/reconcile
POST   /api/payment/:id/refund
POST   /api/payment/:id/send-receipt
POST   /api/paymentReceipt
POST   /api/paymentReceipt/:id/email
POST   /api/paymentReceipt/:id/void
POST   /api/paymentTerms
POST   /api/paymentTerms/:id/calculate-due-date
POST   /api/paymentTerms/:id/calculate-installments
POST   /api/paymentTerms/:id/set-default
POST   /api/paymentTerms/initialize
POST   /api/payout/payouts/:id/cancel
POST   /api/payout/payouts/:id/retry
POST   /api/payout/payouts/request
POST   /api/payout/stripe/connect
POST   /api/payroll
POST   /api/payroll/:id/approve
POST   /api/payroll/:id/pay
POST   /api/payroll/approve
POST   /api/payroll/bulk-delete
POST   /api/payroll/generate
POST   /api/payroll/pay
POST   /api/payroll/wps/submit
POST   /api/payrollRun
POST   /api/payrollRun/:id/approve
POST   /api/payrollRun/:id/calculate
POST   /api/payrollRun/:id/cancel
POST   /api/payrollRun/:id/employees/:empId/exclude
POST   /api/payrollRun/:id/employees/:empId/hold
POST   /api/payrollRun/:id/employees/:empId/include
POST   /api/payrollRun/:id/employees/:empId/recalculate
POST   /api/payrollRun/:id/employees/:empId/unhold
POST   /api/payrollRun/:id/generate-wps
POST   /api/payrollRun/:id/process-payments
POST   /api/payrollRun/:id/send-notifications
POST   /api/payrollRun/:id/validate
POST   /api/payrollRun/bulk-delete
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
POST   /api/performanceReview
POST   /api/performanceReview/:id/360-feedback/:providerId
POST   /api/performanceReview/:id/360-feedback/request
POST   /api/performanceReview/:id/acknowledge
POST   /api/performanceReview/:id/calibration
POST   /api/performanceReview/:id/calibration/apply
POST   /api/performanceReview/:id/complete
POST   /api/performanceReview/:id/development-plan
POST   /api/performanceReview/:id/manager-assessment
POST   /api/performanceReview/:id/reminder
POST   /api/performanceReview/:id/self-assessment
POST   /api/performanceReview/bulk-create
POST   /api/performanceReview/bulk-delete
POST   /api/performanceReview/calibration-sessions
POST   /api/performanceReview/calibration-sessions/:id/complete
POST   /api/performanceReview/templates
POST   /api/permission/cache/clear
POST   /api/permission/check
POST   /api/permission/check-batch
POST   /api/permission/policies
POST   /api/permission/relations
POST   /api/permission/ui/check-page
POST   /api/permission/ui/overrides
POST   /api/plan/cancel
POST   /api/plan/start-trial
POST   /api/plan/upgrade
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
POST   /api/priceLevel
POST   /api/priceLevel/:id/set-default
POST   /api/products
POST   /api/proposal
POST   /api/quality/actions
POST   /api/quality/inspections
POST   /api/quality/inspections/:id/submit
POST   /api/quality/templates
POST   /api/question
POST   /api/queue/:name/clean
POST   /api/queue/:name/empty
POST   /api/queue/:name/jobs
POST   /api/queue/:name/jobs/bulk
POST   /api/queue/:name/pause
POST   /api/queue/:name/resume
POST   /api/queue/:name/retry/:jobId
POST   /api/quotes
POST   /api/quotes/:id/accept
POST   /api/quotes/:id/duplicate
POST   /api/quotes/:id/items
POST   /api/quotes/:id/reject
POST   /api/quotes/:id/revise
POST   /api/quotes/:id/send
POST   /api/quotes/:id/view
POST   /api/rateCard
POST   /api/rateCard/:id/rates
POST   /api/rateCard/calculate
POST   /api/rateGroup
POST   /api/rateGroup/:id/duplicate
POST   /api/rateGroup/:id/rates
POST   /api/rateLimit/firms/:firmId/reset
POST   /api/rateLimit/users/:userId/adjust
POST   /api/rateLimit/users/:userId/reset
POST   /api/recruitment/applicants
POST   /api/recruitment/applicants/:id/assessments
POST   /api/recruitment/applicants/:id/background-check
POST   /api/recruitment/applicants/:id/communications
POST   /api/recruitment/applicants/:id/hire
POST   /api/recruitment/applicants/:id/interviews
POST   /api/recruitment/applicants/:id/interviews/:interviewId/feedback
POST   /api/recruitment/applicants/:id/notes
POST   /api/recruitment/applicants/:id/offers
POST   /api/recruitment/applicants/:id/references
POST   /api/recruitment/applicants/:id/reject
POST   /api/recruitment/applicants/:id/stage
POST   /api/recruitment/applicants/bulk-delete
POST   /api/recruitment/applicants/bulk-reject
POST   /api/recruitment/applicants/bulk-stage-update
POST   /api/recruitment/jobs
POST   /api/recruitment/jobs/:id/clone
POST   /api/recruitment/jobs/:id/publish
POST   /api/recruitment/jobs/:id/status
POST   /api/recurringInvoice
POST   /api/recurringInvoice/:id/cancel
POST   /api/recurringInvoice/:id/duplicate
POST   /api/recurringInvoice/:id/generate
POST   /api/recurringInvoice/:id/pause
POST   /api/recurringInvoice/:id/resume
POST   /api/recurringTransaction
POST   /api/recurringTransaction/:id/cancel
POST   /api/recurringTransaction/:id/generate
POST   /api/recurringTransaction/:id/pause
POST   /api/recurringTransaction/:id/resume
POST   /api/recurringTransaction/process-due
POST   /api/referral
POST   /api/referral/:id/leads
POST   /api/referral/:id/leads/:leadId/convert
POST   /api/referral/:id/payments
POST   /api/refund/admin/:id/approve
POST   /api/refund/admin/:id/execute
POST   /api/refund/admin/:id/reject
POST   /api/refund/admin/:id/retry
POST   /api/refund/request
POST   /api/regionalBanks/connect
POST   /api/regionalBanks/disconnect/:accountId
POST   /api/regionalBanks/sync/:accountId
POST   /api/reminder
POST   /api/reminder/:id/archive
POST   /api/reminder/:id/clone
POST   /api/reminder/:id/complete
POST   /api/reminder/:id/delegate
POST   /api/reminder/:id/dismiss
POST   /api/reminder/:id/reschedule
POST   /api/reminder/:id/snooze
POST   /api/reminder/:id/unarchive
POST   /api/reminder/bulk
POST   /api/reminder/bulk/archive
POST   /api/reminder/bulk/complete
POST   /api/reminder/bulk/unarchive
POST   /api/reminder/from-event/:eventId
POST   /api/reminder/from-task/:taskId
POST   /api/reminder/location
POST   /api/reminder/location/:reminderId/reset
POST   /api/reminder/location/check
POST   /api/reminder/location/distance
POST   /api/reminder/location/nearby
POST   /api/reminder/location/save
POST   /api/reminder/parse
POST   /api/reminder/voice
POST   /api/report/:id/execute
POST   /api/report/export
POST   /api/report/generate
POST   /api/reports
POST   /api/reports/:id/clone
POST   /api/reports/validate
POST   /api/retainer
POST   /api/retainer/:id/consume
POST   /api/retainer/:id/refund
POST   /api/retainer/:id/replenish
POST   /api/review
POST   /api/salesForecasts
POST   /api/salesForecasts/:id/adjustments
POST   /api/salesForecasts/:id/approve
POST   /api/salesForecasts/:id/lock
POST   /api/salesForecasts/:id/submit
POST   /api/salesPerson
POST   /api/salesQuota
POST   /api/salesQuota/:id/record-deal
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
POST   /api/saml/acs/:firmId
POST   /api/saml/config/test
POST   /api/saml/sls/:firmId
POST   /api/sandboxs
POST   /api/sandboxs/:id/clone
POST   /api/sandboxs/:id/extend
POST   /api/sandboxs/:id/reset
POST   /api/saudiBanking/lean/customers
POST   /api/saudiBanking/lean/payments
POST   /api/saudiBanking/lean/webhook
POST   /api/saudiBanking/mudad/compliance/minimum-wage
POST   /api/saudiBanking/mudad/compliance/nitaqat
POST   /api/saudiBanking/mudad/gosi/calculate
POST   /api/saudiBanking/mudad/gosi/report
POST   /api/saudiBanking/mudad/payroll/calculate
POST   /api/saudiBanking/mudad/payroll/submit
POST   /api/saudiBanking/mudad/wps/generate
POST   /api/saudiBanking/sadad/bills/inquiry
POST   /api/saudiBanking/sadad/bills/pay
POST   /api/saudiBanking/wps/download
POST   /api/saudiBanking/wps/generate
POST   /api/saudiBanking/wps/validate
POST   /api/savedFilters
POST   /api/savedFilters/:id/duplicate
POST   /api/savedFilters/:id/set-default
POST   /api/savedFilters/:id/share
POST   /api/savedReport/reports
POST   /api/savedReport/reports/:id/duplicate
POST   /api/savedReport/reports/:id/run
POST   /api/savedReport/widgets
POST   /api/score/recalculate/:lawyerId
POST   /api/security/detect/account-takeover
POST   /api/security/detect/anomalous-activity
POST   /api/security/detect/brute-force
POST   /api/security/incidents/:id/acknowledge
POST   /api/security/incidents/:id/notes
POST   /api/securityIncident/csp-report
POST   /api/securityIncident/incidents/report
POST   /api/securityIncident/vulnerability/report
POST   /api/setupWizard/admin/sections
POST   /api/setupWizard/admin/tasks
POST   /api/setupWizard/reset
POST   /api/setupWizard/tasks/:taskId/complete
POST   /api/setupWizard/tasks/:taskId/skip
POST   /api/shift/shift-assignments
POST   /api/shift/shift-assignments/bulk
POST   /api/shift/shift-types
POST   /api/shift/shift-types/:id/clone
POST   /api/shift/shift-types/:id/set-default
POST   /api/skillMatrix
POST   /api/skillMatrix/assessments
POST   /api/skillMatrix/assessments/:id/self-assessment
POST   /api/skillMatrix/assign
POST   /api/skillMatrix/competencies
POST   /api/skillMatrix/endorse
POST   /api/skillMatrix/types
POST   /api/skillMatrix/verify
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
POST   /api/smartButton/:model/batch-counts
POST   /api/smartScheduling/auto-schedule
POST   /api/smartScheduling/predict-duration
POST   /api/smartScheduling/suggest
POST   /api/ssoConfig/:firmId/sso/test
POST   /api/ssoConfig/:firmId/sso/upload-metadata
POST   /api/staff
POST   /api/staff/bulk-delete
POST   /api/statement
POST   /api/statement/:id/send
POST   /api/statement/generate
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
POST   /api/successionPlan
POST   /api/successionPlan/:id/actions
POST   /api/successionPlan/:id/activate
POST   /api/successionPlan/:id/approve
POST   /api/successionPlan/:id/archive
POST   /api/successionPlan/:id/documents
POST   /api/successionPlan/:id/reject
POST   /api/successionPlan/:id/reviews
POST   /api/successionPlan/:id/submit-for-approval
POST   /api/successionPlan/:id/successors
POST   /api/successionPlan/bulk-delete
POST   /api/support/slas
POST   /api/support/tickets
POST   /api/support/tickets/:id/close
POST   /api/support/tickets/:id/reply
POST   /api/support/tickets/:id/resolve
POST   /api/survey
POST   /api/survey/:id/close
POST   /api/survey/:id/launch
POST   /api/survey/:id/respond
POST   /api/survey/templates
POST   /api/tag
POST   /api/tag/bulk
POST   /api/tag/merge
POST   /api/task
POST   /api/task/:id/archive
POST   /api/task/:id/attachments
POST   /api/task/:id/clone
POST   /api/task/:id/comments
POST   /api/task/:id/complete
POST   /api/task/:id/convert-to-event
POST   /api/task/:id/dependencies
POST   /api/task/:id/documents
POST   /api/task/:id/documents/:documentId/versions/:versionId/restore
POST   /api/task/:id/location/check
POST   /api/task/:id/reopen
POST   /api/task/:id/reschedule
POST   /api/task/:id/save-as-template
POST   /api/task/:id/subtasks
POST   /api/task/:id/time
POST   /api/task/:id/timer/start
POST   /api/task/:id/timer/stop
POST   /api/task/:id/unarchive
POST   /api/task/:id/voice-memos
POST   /api/task/:id/workflow-rules
POST   /api/task/auto-schedule
POST   /api/task/bulk
POST   /api/task/bulk/archive
POST   /api/task/bulk/assign
POST   /api/task/bulk/complete
POST   /api/task/bulk/reopen
POST   /api/task/bulk/unarchive
POST   /api/task/location/check
POST   /api/task/parse
POST   /api/task/templates
POST   /api/task/templates/:templateId/create
POST   /api/task/voice
POST   /api/task/voice-to-item
POST   /api/task/voice-to-item/batch
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
POST   /api/temporalCase/:id/start-workflow
POST   /api/temporalCase/:id/workflow/add-court-date
POST   /api/temporalCase/:id/workflow/add-deadline
POST   /api/temporalCase/:id/workflow/cancel
POST   /api/temporalCase/:id/workflow/complete-requirement
POST   /api/temporalCase/:id/workflow/pause
POST   /api/temporalCase/:id/workflow/resume
POST   /api/temporalCase/:id/workflow/transition-stage
POST   /api/temporalInvoice/:id/approve
POST   /api/temporalInvoice/:id/cancel-approval
POST   /api/temporalInvoice/:id/reject
POST   /api/temporalInvoice/:id/submit-approval
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
POST   /api/timeTracking/entries
POST   /api/timeTracking/entries/:id/approve
POST   /api/timeTracking/entries/:id/lock
POST   /api/timeTracking/entries/:id/reject
POST   /api/timeTracking/entries/:id/request-changes
POST   /api/timeTracking/entries/:id/submit
POST   /api/timeTracking/entries/:id/unlock
POST   /api/timeTracking/entries/:id/write-down
POST   /api/timeTracking/entries/:id/write-off
POST   /api/timeTracking/entries/bulk-approve
POST   /api/timeTracking/entries/bulk-lock
POST   /api/timeTracking/entries/bulk-reject
POST   /api/timeTracking/entries/bulk-submit
POST   /api/timeTracking/timer/pause
POST   /api/timeTracking/timer/resume
POST   /api/timeTracking/timer/start
POST   /api/timeTracking/timer/stop
POST   /api/trades
POST   /api/trades/:id/close
POST   /api/trades/import/csv
POST   /api/tradingAccounts
POST   /api/tradingAccounts/:id/set-default
POST   /api/tradingAccounts/:id/transaction
POST   /api/training
POST   /api/training/:trainingId/approve
POST   /api/training/:trainingId/assessments
POST   /api/training/:trainingId/attendance
POST   /api/training/:trainingId/cancel
POST   /api/training/:trainingId/complete
POST   /api/training/:trainingId/enroll
POST   /api/training/:trainingId/evaluation
POST   /api/training/:trainingId/issue-certificate
POST   /api/training/:trainingId/payment
POST   /api/training/:trainingId/progress
POST   /api/training/:trainingId/reject
POST   /api/training/:trainingId/start
POST   /api/training/:trainingId/submit
POST   /api/training/bulk-delete
POST   /api/transaction
POST   /api/transaction/:id/cancel
POST   /api/trello/cards
POST   /api/trello/cards/:cardId/comments
POST   /api/trello/cards/:cardId/move
POST   /api/trello/disconnect
POST   /api/trello/sync
POST   /api/trello/webhook
POST   /api/trustAccount
POST   /api/trustAccount/:id/reconciliations
POST   /api/trustAccount/:id/three-way-reconciliations
POST   /api/trustAccount/:id/transactions
POST   /api/trustAccount/:id/transactions/:transactionId/void
POST   /api/trustAccount/:id/transfer
POST   /api/user/convert-to-firm
POST   /api/user/push-subscription
POST   /api/userSettings/toggle-section
POST   /api/vendor
POST   /api/verify/moj/attorney
POST   /api/verify/moj/poa
POST   /api/verify/yakeen
POST   /api/verify/yakeen/address
POST   /api/views
POST   /api/views/:id/clone
POST   /api/views/:id/default
POST   /api/views/:id/favorite
POST   /api/views/:id/share
POST   /api/walkthrough/:id/complete
POST   /api/walkthrough/:id/reset
POST   /api/walkthrough/:id/skip
POST   /api/walkthrough/:id/start
POST   /api/walkthrough/:id/step/:stepOrder/skip
POST   /api/walkthrough/:id/step/next
POST   /api/walkthrough/admin
POST   /api/webauthn/authenticate/finish
POST   /api/webauthn/authenticate/start
POST   /api/webauthn/register/finish
POST   /api/webauthn/register/start
POST   /api/webhook
POST   /api/webhook/:id/deliveries/:deliveryId/retry
POST   /api/webhook/:id/disable
POST   /api/webhook/:id/enable
POST   /api/webhook/:id/regenerate-secret
POST   /api/webhook/:id/test
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
POST   /api/workflow/instances
POST   /api/workflow/instances/:id/advance
POST   /api/workflow/instances/:id/cancel
POST   /api/workflow/instances/:id/pause
POST   /api/workflow/instances/:id/resume
POST   /api/workflow/templates
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

### PUT (226)

<details>
<summary>Click to expand</summary>

```
PUT    /api/activityPlans/:id
PUT    /api/admin/users/:id/claims
PUT    /api/analyticsReport/:id
PUT    /api/appointment/:id
PUT    /api/appointment/:id/complete
PUT    /api/appointment/:id/confirm
PUT    /api/appointment/:id/no-show
PUT    /api/appointment/availability/:id
PUT    /api/appointment/settings
PUT    /api/approval/rules
PUT    /api/approvals/workflows/:id
PUT    /api/apps/:appId/settings
PUT    /api/assetAssignment/:id/repair/:repairId
PUT    /api/assetAssignment/:id/status
PUT    /api/assets/:id
PUT    /api/assets/categories/:id
PUT    /api/assets/maintenance/:id
PUT    /api/assets/settings
PUT    /api/attendance/:id
PUT    /api/attendance/:id/corrections/:correctionId
PUT    /api/attendance/:id/violations/:violationIndex/resolve
PUT    /api/automations/:id
PUT    /api/bankAccount/:id
PUT    /api/bankReconciliation/feeds/:id
PUT    /api/bankReconciliation/rules/:id
PUT    /api/bill/:id
PUT    /api/billing/payment-methods/:id/default
PUT    /api/billing/subscription
PUT    /api/billingRate/:id
PUT    /api/biometric/devices/:id
PUT    /api/biometric/geofence/:id
PUT    /api/buying/rfqs/:id
PUT    /api/buying/settings
PUT    /api/buying/suppliers/:id
PUT    /api/campaigns/:id
PUT    /api/case/:_id/close
PUT    /api/case/:_id/notes/:noteId
PUT    /api/churn/events/:id/reason
PUT    /api/client/:id
PUT    /api/compensationReward/:id
PUT    /api/compensationReward/:id/allowances/:allowanceId
PUT    /api/competitor/:id
PUT    /api/competitors/:id
PUT    /api/consent/:category
PUT    /api/contact/:id
PUT    /api/contactLists/:id
PUT    /api/conversations/:id/priority
PUT    /api/conversations/:id/tags
PUT    /api/corporateCard/:id
PUT    /api/creditNote/:id
PUT    /api/crmActivity/:id
PUT    /api/crmPipeline/:id
PUT    /api/crmPipeline/:id/stages/:stageId
PUT    /api/crmSettings
PUT    /api/dealRooms/:id/pages/:pageId
PUT    /api/debitNote/:id
PUT    /api/discord/settings
PUT    /api/docusign/settings
PUT    /api/dunning/policies/:id
PUT    /api/emailMarketing/campaigns/:id
PUT    /api/emailMarketing/segments/:id
PUT    /api/emailMarketing/subscribers/:id
PUT    /api/emailMarketing/templates/:id
PUT    /api/emailSettings/signatures/:id
PUT    /api/emailSettings/signatures/:id/default
PUT    /api/emailSettings/smtp
PUT    /api/emailSettings/templates/:id
PUT    /api/emailTemplates/:id
PUT    /api/event/:id
PUT    /api/event/:id/action-items/:itemId
PUT    /api/event/:id/agenda/:agendaId
PUT    /api/event/:id/location-trigger
PUT    /api/event/bulk
PUT    /api/expense/:id
PUT    /api/expensePolicy/:id
PUT    /api/financeSetup
PUT    /api/financeSetup/step/:step
PUT    /api/firm/:id
PUT    /api/firm/:id/access/:userId
PUT    /api/firm/:id/members/:memberId
PUT    /api/firm/:id/move
PUT    /api/fleet/vehicles/:id/location
PUT    /api/gantt/task/:id/dates
PUT    /api/gantt/task/:id/duration
PUT    /api/gantt/task/:id/parent
PUT    /api/gantt/task/:id/progress
PUT    /api/github/settings
PUT    /api/gmail/settings
PUT    /api/googleCalendar/calendars/:calendarId/events/:eventId
PUT    /api/googleCalendar/settings/calendars
PUT    /api/googleCalendar/settings/show-external-events
PUT    /api/gosi/config
PUT    /api/hr/employees/:id
PUT    /api/hrExtended/salary-components/:id
PUT    /api/hrExtended/settings
PUT    /api/incomeTaxSlab/:id
PUT    /api/integrations/discord/settings
PUT    /api/integrations/quickbooks/mappings/accounts
PUT    /api/integrations/quickbooks/mappings/fields
PUT    /api/interCompany/transactions/:id
PUT    /api/interestAreas/:id
PUT    /api/inventory/items/:id
PUT    /api/inventory/settings
PUT    /api/inventory/warehouses/:id
PUT    /api/investments/:id
PUT    /api/invoice/:id
PUT    /api/jobPosition/:id
PUT    /api/jobPosition/:id/competencies
PUT    /api/jobPosition/:id/qualifications
PUT    /api/jobPosition/:id/responsibilities
PUT    /api/jobPosition/:id/salary-range
PUT    /api/keyboardShortcuts/:id
PUT    /api/lead/:id
PUT    /api/leadConversion/case/:caseId/lost
PUT    /api/leadConversion/case/:caseId/stage
PUT    /api/leadConversion/case/:caseId/won
PUT    /api/leadSource/:id
PUT    /api/leaveManagement/leave-allocations/:id
PUT    /api/leaveManagement/leave-periods/:id
PUT    /api/leaveManagement/leave-policies/:id
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
PUT    /api/mlScoring/priority/:leadId/assign
PUT    /api/notificationPreference
PUT    /api/notificationPreference/categories/:category
PUT    /api/notificationPreference/channels/:channel
PUT    /api/notificationPreference/quiet-hours
PUT    /api/notificationSettings
PUT    /api/notificationSettings/preferences/:type
PUT    /api/organization/:id
PUT    /api/organizationTemplate/admin/:id
PUT    /api/payment/:id
PUT    /api/payment/:id/apply
PUT    /api/payment/:id/check-status
PUT    /api/paymentTerms/:id
PUT    /api/payroll/:id
PUT    /api/pdfme/templates/:id
PUT    /api/permission/config
PUT    /api/permission/policies/:policyId
PUT    /api/permission/ui/config
PUT    /api/permission/ui/pages/:pageId/access
PUT    /api/permission/ui/roles/:role/bulk
PUT    /api/permission/ui/sidebar/:itemId/visibility
PUT    /api/playbook/:id
PUT    /api/priceLevel/:id
PUT    /api/products/:id
PUT    /api/products/bulk-prices
PUT    /api/quality/actions/:id
PUT    /api/quality/inspections/:id
PUT    /api/quality/settings
PUT    /api/quality/templates/:id
PUT    /api/quotes/:id
PUT    /api/quotes/:id/items/:itemId
PUT    /api/recurringInvoice/:id
PUT    /api/recurringTransaction/:id
PUT    /api/referral/:id
PUT    /api/reminder/:id
PUT    /api/reminder/bulk
PUT    /api/reminder/location/locations/:locationId
PUT    /api/report/:id/schedule
PUT    /api/reports/:id
PUT    /api/reports/:id/schedule
PUT    /api/retainer/:id
PUT    /api/salesForecasts/:id
PUT    /api/salesPerson/:id
PUT    /api/salesQuota/:id
PUT    /api/saless/commissions/plans/:id
PUT    /api/saless/deliveries/:id
PUT    /api/saless/orders/:id/items/:itemId
PUT    /api/salesStage/:id
PUT    /api/salesStage/reorder
PUT    /api/salesTeams/:id
PUT    /api/saml/config
PUT    /api/savedFilters/:id
PUT    /api/security/incidents/:id
PUT    /api/slack/settings
PUT    /api/slas/:id
PUT    /api/sloMonitorings/:id
PUT    /api/ssoConfig/:firmId/sso
PUT    /api/staff/:id
PUT    /api/status/admin/components/:id
PUT    /api/status/admin/incidents/:id
PUT    /api/status/admin/maintenance/:id
PUT    /api/subcontracting/orders/:id
PUT    /api/subcontracting/settings
PUT    /api/support/settings
PUT    /api/support/slas/:id
PUT    /api/support/tickets/:id
PUT    /api/tag/:id
PUT    /api/task/:id
PUT    /api/task/:id/comments/:commentId
PUT    /api/task/:id/location-trigger
PUT    /api/task/bulk
PUT    /api/task/templates/:templateId
PUT    /api/telegram/settings
PUT    /api/territory/:id
PUT    /api/territorys/:id
PUT    /api/territorys/:id/move
PUT    /api/timeTracking/entries/:id
PUT    /api/transaction/:id
PUT    /api/trello/cards/:cardId
PUT    /api/trello/settings
PUT    /api/user/notification-preferences
PUT    /api/userSettings/global-view-mode
PUT    /api/userSettings/module/:module
PUT    /api/userSettings/view-mode/:module
PUT    /api/vendor/:id
PUT    /api/views/:id
PUT    /api/walkthrough/admin/:id
PUT    /api/webhook/:id
PUT    /api/whatsapp/conversations/:id/assign
PUT    /api/workflow/templates/:id
PUT    /api/workflows/activities/:id/recurrence
PUT    /api/workflows/activities/:id/reminder
PUT    /api/zatca/config
PUT    /api/zoom/meetings/:meetingId
PUT    /api/zoom/settings
```

</details>

### PATCH (180)

<details>
<summary>Click to expand</summary>

```
PATCH  /api/account/:id
PATCH  /api/activitys/:id/reassign
PATCH  /api/activitys/:id/reschedule
PATCH  /api/activitys/types/:id
PATCH  /api/adminApi/firms/:id/plan
PATCH  /api/adminApi/firms/:id/suspend
PATCH  /api/adminApi/users/:id/status
PATCH  /api/aiChat/conversations/:conversationId
PATCH  /api/aiSettings/preferences
PATCH  /api/analyticsReport/:id
PATCH  /api/answer/:_id
PATCH  /api/answer/verify/:_id
PATCH  /api/apiKey/:id
PATCH  /api/assetAssignment/:id
PATCH  /api/automatedActions/:id
PATCH  /api/brokers/:id
PATCH  /api/case/:_id
PATCH  /api/case/:_id/claims/:claimId
PATCH  /api/case/:_id/end
PATCH  /api/case/:_id/hearing/:hearingId
PATCH  /api/case/:_id/hearings/:hearingId
PATCH  /api/case/:_id/notes/:noteId
PATCH  /api/case/:_id/outcome
PATCH  /api/case/:_id/progress
PATCH  /api/case/:_id/rich-documents/:docId
PATCH  /api/case/:_id/stage
PATCH  /api/case/:_id/status
PATCH  /api/case/:_id/timeline/:eventId
PATCH  /api/caseNotion/cases/:caseId/notion/blocks/:blockId
PATCH  /api/caseNotion/cases/:caseId/notion/blocks/:blockId/color
PATCH  /api/caseNotion/cases/:caseId/notion/blocks/:blockId/opacity
PATCH  /api/caseNotion/cases/:caseId/notion/blocks/:blockId/position
PATCH  /api/caseNotion/cases/:caseId/notion/blocks/:blockId/priority
PATCH  /api/caseNotion/cases/:caseId/notion/blocks/:blockId/rotation
PATCH  /api/caseNotion/cases/:caseId/notion/blocks/:blockId/size
PATCH  /api/caseNotion/cases/:caseId/notion/blocks/:blockId/style
PATCH  /api/caseNotion/cases/:caseId/notion/blocks/:blockId/z-index
PATCH  /api/caseNotion/cases/:caseId/notion/connections/:connectionId
PATCH  /api/caseNotion/cases/:caseId/notion/frames/:frameId/move
PATCH  /api/caseNotion/cases/:caseId/notion/pages/:pageId
PATCH  /api/caseNotion/cases/:caseId/notion/pages/:pageId/batch-update
PATCH  /api/caseNotion/cases/:caseId/notion/pages/:pageId/view-mode
PATCH  /api/caseNotion/cases/:caseId/notion/pages/:pageId/whiteboard-config
PATCH  /api/chatterFollowers/:model/:recordId/followers/:id/preferences
PATCH  /api/client/:id/flags
PATCH  /api/client/:id/status
PATCH  /api/compensationReward/:id
PATCH  /api/compensationReward/:id/allowances/:allowanceId
PATCH  /api/conflictCheck/:id
PATCH  /api/contact/:id
PATCH  /api/conversation/:conversationID
PATCH  /api/customFields/:id
PATCH  /api/dataExport/templates/:id
PATCH  /api/document/:id
PATCH  /api/employeeAdvance/:advanceId
PATCH  /api/employeeBenefit/:id
PATCH  /api/employeeBenefit/:id/beneficiaries/:beneficiaryId
PATCH  /api/employeeBenefit/:id/claims/:claimId
PATCH  /api/employeeLoan/:loanId
PATCH  /api/employeeSelfService/profile
PATCH  /api/event/:id
PATCH  /api/event/reorder
PATCH  /api/expenseClaim/:id
PATCH  /api/expenseClaim/:id/line-items/:lineItemId
PATCH  /api/firm/:_id
PATCH  /api/firm/:id
PATCH  /api/firm/:id/billing
PATCH  /api/fleet/drivers/:id
PATCH  /api/fleet/incidents/:id
PATCH  /api/fleet/maintenance/:id
PATCH  /api/fleet/vehicles/:id
PATCH  /api/followup/:id
PATCH  /api/grievance/:id
PATCH  /api/invoice/:_id
PATCH  /api/invoice/:id
PATCH  /api/invoiceTemplate/:id
PATCH  /api/job/:_id
PATCH  /api/jobPosition/:id
PATCH  /api/journalEntry/:id
PATCH  /api/leaveRequest/:id
PATCH  /api/legalContract/:contractId
PATCH  /api/legalContract/:contractId/enforcement
PATCH  /api/legalContract/:contractId/parties/:partyIndex
PATCH  /api/legalDocument/:_id
PATCH  /api/lockDates/:lockType
PATCH  /api/lockDates/fiscal-year
PATCH  /api/matterBudget/:id
PATCH  /api/matterBudget/:id/entries/:entryId
PATCH  /api/matterBudget/:id/phases/:phaseId
PATCH  /api/matterBudget/templates/:id
PATCH  /api/message/:conversationID/read
PATCH  /api/notification/:id/read
PATCH  /api/notification/mark-all-read
PATCH  /api/notification/mark-multiple-read
PATCH  /api/offboarding/:offboardingId
PATCH  /api/offboarding/:offboardingId/clearance/items/:itemId
PATCH  /api/offboarding/:offboardingId/rehire-eligibility
PATCH  /api/offboarding/:offboardingId/status
PATCH  /api/okr/:id
PATCH  /api/okr/:id/key-results/:keyResultId
PATCH  /api/onboarding/:onboardingId
PATCH  /api/onboarding/:onboardingId/status
PATCH  /api/order
PATCH  /api/organization/:id
PATCH  /api/organizationalUnit/:id
PATCH  /api/organizationalUnit/:id/budget
PATCH  /api/organizationalUnit/:id/headcount
PATCH  /api/organizationalUnit/:id/kpis/:kpiId
PATCH  /api/organizationalUnit/:id/leadership/:positionId
PATCH  /api/payrollRun/:id
PATCH  /api/peerReview/verify/:_id
PATCH  /api/performanceReview/:id
PATCH  /api/performanceReview/:id/development-plan/:itemId
PATCH  /api/performanceReview/templates/:id
PATCH  /api/plugins/installations/:installationId/settings
PATCH  /api/proposal/accept/:_id
PATCH  /api/proposal/reject/:_id
PATCH  /api/proposal/withdraw/:_id
PATCH  /api/question/:_id
PATCH  /api/rateCard/:id
PATCH  /api/rateCard/:id/rates/:rateId
PATCH  /api/rateGroup/:id
PATCH  /api/recruitment/applicants/:id
PATCH  /api/recruitment/applicants/:id/assessments/:assessmentId
PATCH  /api/recruitment/applicants/:id/background-check
PATCH  /api/recruitment/applicants/:id/interviews/:interviewId
PATCH  /api/recruitment/applicants/:id/offers/:offerId
PATCH  /api/recruitment/applicants/:id/references/:referenceId
PATCH  /api/recruitment/applicants/:id/talent-pool
PATCH  /api/recruitment/jobs/:id
PATCH  /api/reminder/:id
PATCH  /api/reminder/reorder
PATCH  /api/salesQuota/:id
PATCH  /api/savedFilters/:id
PATCH  /api/savedReport/reports/:id
PATCH  /api/savedReport/widgets/:id
PATCH  /api/savedReport/widgets/layout
PATCH  /api/securityIncident/incidents/:id/status
PATCH  /api/setupWizard/admin/sections/:sectionId
PATCH  /api/setupWizard/admin/tasks/:taskId
PATCH  /api/shift/shift-assignments/:id
PATCH  /api/shift/shift-types/:id
PATCH  /api/skillMatrix/:id
PATCH  /api/skillMatrix/assessments/:id
PATCH  /api/skillMatrix/competencies/:id
PATCH  /api/skillMatrix/types/:id
PATCH  /api/staff/:id
PATCH  /api/successionPlan/:id
PATCH  /api/successionPlan/:id/actions/:actionId
PATCH  /api/successionPlan/:id/successors/:successorId
PATCH  /api/successionPlan/:id/successors/:successorId/development
PATCH  /api/successionPlan/:id/successors/:successorId/readiness
PATCH  /api/survey/:id
PATCH  /api/survey/templates/:id
PATCH  /api/task/:id
PATCH  /api/task/:id/documents/:documentId
PATCH  /api/task/:id/estimate
PATCH  /api/task/:id/outcome
PATCH  /api/task/:id/progress
PATCH  /api/task/:id/status
PATCH  /api/task/:id/subtasks/:subtaskId
PATCH  /api/task/:id/subtasks/:subtaskId/toggle
PATCH  /api/task/:id/timer/pause
PATCH  /api/task/:id/timer/resume
PATCH  /api/task/:id/voice-memos/:memoId/transcription
PATCH  /api/task/reorder
PATCH  /api/task/templates/:templateId
PATCH  /api/team/:id
PATCH  /api/team/:id/permissions
PATCH  /api/team/:id/role
PATCH  /api/telegram/settings
PATCH  /api/timeTracking/entries/:id
PATCH  /api/trades/:id
PATCH  /api/tradingAccounts/:id
PATCH  /api/training/:trainingId
PATCH  /api/trustAccount/:id
PATCH  /api/user/:_id
PATCH  /api/views/:id
PATCH  /api/webauthn/credentials/:id
PATCH  /api/webhook/:id
```

</details>

### DELETE (286)

<details>
<summary>Click to expand</summary>

```
DELETE /api/account/:id
DELETE /api/activityPlans/:id
DELETE /api/activitys/types/:id
DELETE /api/admin/users/:id/claims
DELETE /api/adminTools/users/:id/data
DELETE /api/aiChat/conversations/:conversationId
DELETE /api/aiSettings/keys/:provider
DELETE /api/analyticsReport/:id
DELETE /api/analyticsReport/:id/schedule
DELETE /api/answer/:_id
DELETE /api/apiKey/:id
DELETE /api/appointment/:id
DELETE /api/appointment/availability/:id
DELETE /api/appointment/blocked-times/:id
DELETE /api/approvals/workflows/:id
DELETE /api/assetAssignment/:id
DELETE /api/assets/:id
DELETE /api/assets/categories/:id
DELETE /api/attendance/:id
DELETE /api/auth/sessions
DELETE /api/auth/sessions/:id
DELETE /api/automatedActions/:id
DELETE /api/automatedActions/bulk
DELETE /api/automations/:id
DELETE /api/bankAccount/:id
DELETE /api/bankReconciliation/feeds/:id
DELETE /api/bankReconciliation/match/:id
DELETE /api/bankReconciliation/rules/:id
DELETE /api/bill/:id
DELETE /api/bill/:id/attachments/:attachmentId
DELETE /api/billing/payment-methods/:id
DELETE /api/billing/subscription
DELETE /api/billingRate/:id
DELETE /api/biometric/devices/:id
DELETE /api/biometric/geofence/:id
DELETE /api/brokers/:id
DELETE /api/buying/purchase-orders/:id
DELETE /api/buying/rfqs/:id
DELETE /api/buying/suppliers/:id
DELETE /api/campaigns/:id
DELETE /api/case/:_id
DELETE /api/case/:_id/claim/:claimId
DELETE /api/case/:_id/claims/:claimId
DELETE /api/case/:_id/document/:documentId
DELETE /api/case/:_id/documents/:docId
DELETE /api/case/:_id/hearing/:hearingId
DELETE /api/case/:_id/hearings/:hearingId
DELETE /api/case/:_id/notes/:noteId
DELETE /api/case/:_id/rich-documents/:docId
DELETE /api/case/:_id/timeline/:eventId
DELETE /api/caseNotion/cases/:caseId/notion/blocks/:blockId
DELETE /api/caseNotion/cases/:caseId/notion/blocks/:blockId/unlink
DELETE /api/caseNotion/cases/:caseId/notion/comments/:commentId
DELETE /api/caseNotion/cases/:caseId/notion/connections/:connectionId
DELETE /api/caseNotion/cases/:caseId/notion/frames/:frameId/children/:elementId
DELETE /api/caseNotion/cases/:caseId/notion/pages/:pageId
DELETE /api/caseNotion/cases/:caseId/notion/pages/:pageId/bulk-delete
DELETE /api/chatterFollowers/:model/:recordId/followers/:id
DELETE /api/client/:id
DELETE /api/client/:id/attachments/:attachmentId
DELETE /api/client/bulk
DELETE /api/cloudStorages/:provider/files/:fileId
DELETE /api/commandPalettes/saved-searches/:name
DELETE /api/compensationReward/:id
DELETE /api/compensationReward/:id/allowances/:allowanceId
DELETE /api/competitor/:id
DELETE /api/competitors/:id
DELETE /api/conflictCheck/:id
DELETE /api/consent
DELETE /api/contact/:id
DELETE /api/contact/:id/unlink-case/:caseId
DELETE /api/contact/:id/unlink-client/:clientId
DELETE /api/contact/bulk
DELETE /api/contactLists/:id
DELETE /api/contactLists/:id/members/:memberId
DELETE /api/corporateCard/:id
DELETE /api/creditNote/:id
DELETE /api/crmActivity/:id
DELETE /api/crmPipeline/:id
DELETE /api/crmPipeline/:id/stages/:stageId
DELETE /api/customFields/:id
DELETE /api/customFields/values/:entityType/:entityId
DELETE /api/customFields/values/:entityType/:entityId/:fieldId
DELETE /api/cycles/:id/tasks/:taskId
DELETE /api/dataExport/jobs/:id
DELETE /api/dataExport/templates/:id
DELETE /api/dealRooms/:id/access/:token
DELETE /api/dealRooms/:id/pages/:pageId
DELETE /api/debitNote/:id
DELETE /api/document/:id
DELETE /api/documentAnalysis/:documentId
DELETE /api/docusign/templates/defaults/:templateId
DELETE /api/dunning/policies/:id
DELETE /api/emailMarketing/campaigns/:id
DELETE /api/emailMarketing/segments/:id
DELETE /api/emailMarketing/subscribers/:id
DELETE /api/emailMarketing/templates/:id
DELETE /api/emailSettings/signatures/:id
DELETE /api/emailSettings/templates/:id
DELETE /api/emailTemplates/:id
DELETE /api/employeeAdvance/:advanceId
DELETE /api/employeeBenefit/:id
DELETE /api/employeeBenefit/:id/beneficiaries/:beneficiaryId
DELETE /api/employeeBenefit/:id/dependents/:memberId
DELETE /api/employeeLoan/:loanId
DELETE /api/event/:id
DELETE /api/event/:id/action-items/:itemId
DELETE /api/event/:id/agenda/:agendaId
DELETE /api/event/:id/attendees/:attendeeId
DELETE /api/event/bulk
DELETE /api/exchangeRateRevaluation/:id
DELETE /api/expense/:id
DELETE /api/expenseClaim/:id
DELETE /api/expenseClaim/:id/line-items/:lineItemId
DELETE /api/expenseClaim/:id/receipts/:receiptId
DELETE /api/expensePolicy/:id
DELETE /api/firm/:firmId/invitations/:invitationId
DELETE /api/firm/:firmId/ip-whitelist/:ip
DELETE /api/firm/:firmId/ip-whitelist/temporary/:allowanceId
DELETE /api/firm/:id
DELETE /api/firm/:id/access/:userId
DELETE /api/firm/:id/members/:memberId
DELETE /api/fleet/vehicles/:id
DELETE /api/followup/:id
DELETE /api/gantt/link/:source/:target
DELETE /api/gig/:_id
DELETE /api/gmail/watch
DELETE /api/googleCalendar/calendars/:calendarId/events/:eventId
DELETE /api/googleCalendar/watch/:channelId
DELETE /api/grievance/:id
DELETE /api/hr/employees/:id
DELETE /api/hr/employees/:id/allowances/:allowanceId
DELETE /api/hr/employees/:id/documents/:docId
DELETE /api/incomeTaxSlab/:id
DELETE /api/interestAreas/:id
DELETE /api/inventory/items/:id
DELETE /api/inventory/stock-entries/:id
DELETE /api/inventory/warehouses/:id
DELETE /api/investments/:id
DELETE /api/investments/:id/transactions/:transactionId
DELETE /api/invoice/:_id
DELETE /api/invoice/:id
DELETE /api/invoiceTemplate/:id
DELETE /api/job/:_id
DELETE /api/jobPosition/:id
DELETE /api/journalEntry/:id
DELETE /api/keyboardShortcuts/:id
DELETE /api/lead/:id
DELETE /api/leadSource/:id
DELETE /api/leaveManagement/leave-allocations/:id
DELETE /api/leaveManagement/leave-periods/:id
DELETE /api/leaveManagement/leave-policies/:id
DELETE /api/leaveRequest/:id
DELETE /api/legalContract/:contractId
DELETE /api/legalContract/:contractId/parties/:partyIndex
DELETE /api/legalDocument/:_id
DELETE /api/lifecycles/workflows/:id
DELETE /api/lostReason/:id
DELETE /api/lostReasons/:id
DELETE /api/macros/:id
DELETE /api/manufacturing/boms/:id
DELETE /api/manufacturing/work-orders/:id
DELETE /api/manufacturing/workstations/:id
DELETE /api/matterBudget/:id
DELETE /api/matterBudget/:id/entries/:entryId
DELETE /api/matterBudget/:id/phases/:phaseId
DELETE /api/matterBudget/templates/:id
DELETE /api/microsoftCalendar/events/:eventId
DELETE /api/notification/:id
DELETE /api/notification/bulk-delete
DELETE /api/notification/clear-read
DELETE /api/oauth/unlink/:providerType
DELETE /api/offboarding/:offboardingId
DELETE /api/okr/:id
DELETE /api/onboarding/:onboardingId
DELETE /api/organization/:id
DELETE /api/organization/bulk
DELETE /api/organizationalUnit/:id
DELETE /api/organizationalUnit/:id/kpis/:kpiId
DELETE /api/organizationalUnit/:id/leadership/:positionId
DELETE /api/organizationTemplate/admin/:id
DELETE /api/payment/:id
DELETE /api/payment/:id/unapply/:invoiceId
DELETE /api/payment/bulk
DELETE /api/paymentTerms/:id
DELETE /api/payroll/:id
DELETE /api/payrollRun/:id
DELETE /api/pdfme/templates/:id
DELETE /api/performanceReview/:id
DELETE /api/permission/policies/:policyId
DELETE /api/permission/relations
DELETE /api/permission/ui/overrides/:userId
DELETE /api/playbook/:id
DELETE /api/plugins/:id/uninstall
DELETE /api/preparedReport/:id
DELETE /api/priceLevel/:id
DELETE /api/products/:id
DELETE /api/quality/actions/:id
DELETE /api/quality/inspections/:id
DELETE /api/quality/templates/:id
DELETE /api/question/:_id
DELETE /api/queue/:name/jobs/:jobId
DELETE /api/quotes/:id
DELETE /api/quotes/:id/items/:itemId
DELETE /api/rateCard/:id
DELETE /api/rateCard/:id/rates/:rateId
DELETE /api/rateGroup/:id
DELETE /api/rateGroup/:id/rates/:rateId
DELETE /api/recruitment/applicants/:id
DELETE /api/recruitment/jobs/:id
DELETE /api/recurringInvoice/:id
DELETE /api/referral/:id
DELETE /api/reminder/:id
DELETE /api/reminder/bulk
DELETE /api/reminder/location/locations/:locationId
DELETE /api/report/:id
DELETE /api/reports/:id
DELETE /api/review/:_id
DELETE /api/salesForecasts/:id
DELETE /api/salesPerson/:id
DELETE /api/salesQuota/:id
DELETE /api/saless/orders/:id/items/:itemId
DELETE /api/salesStage/:id
DELETE /api/salesTeams/:id
DELETE /api/salesTeams/:id/members/:userId
DELETE /api/sandboxs/:id
DELETE /api/saudiBanking/lean/entities/:entityId
DELETE /api/savedFilters/:id
DELETE /api/savedFilters/:id/share/:userId
DELETE /api/savedReport/reports/:id
DELETE /api/savedReport/widgets/:id
DELETE /api/securityIncident/csp-violations
DELETE /api/setupWizard/admin/sections/:sectionId
DELETE /api/setupWizard/admin/tasks/:taskId
DELETE /api/shift/shift-assignments/:id
DELETE /api/shift/shift-types/:id
DELETE /api/skillMatrix/:id
DELETE /api/skillMatrix/assign/:employeeId/:skillId
DELETE /api/skillMatrix/competencies/:id
DELETE /api/slas/:id
DELETE /api/sloMonitorings/:id
DELETE /api/ssoConfig/:firmId/sso
DELETE /api/staff/:id
DELETE /api/statement/:id
DELETE /api/status/admin/components/:id
DELETE /api/subcontracting/orders/:id
DELETE /api/successionPlan/:id
DELETE /api/successionPlan/:id/successors/:successorId
DELETE /api/support/slas/:id
DELETE /api/support/tickets/:id
DELETE /api/survey/:id
DELETE /api/survey/templates/:id
DELETE /api/tag/:id
DELETE /api/task/:id
DELETE /api/task/:id/attachments/:attachmentId
DELETE /api/task/:id/comments/:commentId
DELETE /api/task/:id/dependencies/:dependencyTaskId
DELETE /api/task/:id/subtasks/:subtaskId
DELETE /api/task/:id/time-tracking/reset
DELETE /api/task/bulk
DELETE /api/task/templates/:templateId
DELETE /api/team/:id
DELETE /api/team/:id/revoke-invite
DELETE /api/temporalOnboarding/:id/onboarding/cancel
DELETE /api/territory/:id
DELETE /api/territorys/:id
DELETE /api/threadMessages/:id
DELETE /api/timeTracking/entries/:id
DELETE /api/timeTracking/entries/bulk
DELETE /api/trades/:id
DELETE /api/trades/bulk
DELETE /api/tradingAccounts/:id
DELETE /api/training/:trainingId
DELETE /api/transaction/:id
DELETE /api/transaction/bulk
DELETE /api/trustAccount/:id
DELETE /api/user/:_id
DELETE /api/user/push-subscription
DELETE /api/vendor/:id
DELETE /api/views/:id
DELETE /api/walkthrough/admin/:id
DELETE /api/webauthn/credentials/:id
DELETE /api/webhook/:id
DELETE /api/whatsapp/broadcasts/:id/recipients
DELETE /api/workflow/templates/:id
DELETE /api/zoom/meetings/:meetingId
```

</details>
