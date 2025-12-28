// Marketplace Routes
const gigRoute = require('./gig.route');
const authRoute = require('./auth.route');
const adminRoute = require('./admin.route');
const adminApiRoute = require('./adminApi.route');
const adminToolsRoute = require('./adminTools.route');
const orderRoute = require('./order.route');
const conversationRoute = require('./conversation.route');
const messageRoute = require('./message.route');
const reviewRoute = require('./review.route');
const disputeRoute = require('./dispute.route');
const userRoute = require('./user.route');
const jobRoute = require('./job.route');
const proposalRoute = require('./proposal.route');
const questionRoute = require('./question.route');
const answerRoute = require('./answer.route');
const firmRoute = require('./firm.route');
const organizationTemplateRoute = require('./organizationTemplate.route');

// Dashboard Core Routes
const dashboardRoute = require('./dashboard.route');
const activityRoute = require('./activity.route');
const caseRoute = require('./case.route');
const temporalCaseRoute = require('./temporalCase.route');
const taskRoute = require('./task.route');
const ganttRoute = require('./gantt.route');
const notificationRoute = require('./notification.route');
const notificationPreferenceRoute = require('./notificationPreference.route');
const eventRoute = require('./event.route');

// Dashboard Finance Routes
const invoiceRoute = require('./invoice.route');
const temporalInvoiceRoute = require('./temporalInvoice.route');
const expenseRoute = require('./expense.route');
const timeTrackingRoute = require('./timeTracking.route');
const paymentRoute = require('./payment.route');
const retainerRoute = require('./retainer.route');
const billingRateRoute = require('./billingRate.route');
const statementRoute = require('./statement.route');
const transactionRoute = require('./transaction.route');
const reportRoute = require('./report.route');
const dunningRoute = require('./dunning.route');

// Dashboard Organization Routes
const reminderRoute = require('./reminder.route');
const clientRoute = require('./client.route');
const calendarRoute = require('./calendar.route');
const lawyerRoute = require('./lawyer.route');
const payoutRoute = require('./payout.route');

// New API Routes
const tagRoute = require('./tag.route');
const contactRoute = require('./contact.route');
const organizationRoute = require('./organization.route');
const documentRoute = require('./document.route');
const followupRoute = require('./followup.route');
const workflowRoute = require('./workflow.route');
const workflowRoutes = require('./workflow.routes');
const rateGroupRoute = require('./rateGroup.route');
const rateCardRoute = require('./rateCard.route');
const invoiceTemplateRoute = require('./invoiceTemplate.route');
const dataExportRoute = require('./dataExport.route');
const conflictCheckRoute = require('./conflictCheck.route');
const trustAccountRoute = require('./trustAccount.route');
const matterBudgetRoute = require('./matterBudget.route');
const savedReportRoute = require('./savedReport.route');

// Bank Account Routes
const bankAccountRoute = require('./bankAccount.route');
const bankTransferRoute = require('./bankTransfer.route');
const bankTransactionRoute = require('./bankTransaction.route');
const bankReconciliationRoute = require('./bankReconciliation.route');
const currencyRoute = require('./currency.route');

// Vendor and Bills Routes
const vendorRoute = require('./vendor.route');
const billRoute = require('./bill.route');
const billPaymentRoute = require('./billPayment.route');

// Subcontracting Routes
const subcontractingRoute = require('./subcontracting.route');

// ERPNext-style Module Routes
const inventoryRoute = require('./inventory.route');
const buyingRoute = require('./buying.route');
const supportRoute = require('./support.route');
const qualityRoute = require('./quality.route');
const manufacturingRoute = require('./manufacturing.route');
const assetsRoute = require('./assets.route');

// CRM Routes
const leadRoute = require('./lead.route');
const crmPipelineRoute = require('./crmPipeline.route');
const referralRoute = require('./referral.route');
const crmActivityRoute = require('./crmActivity.route');
const staffRoute = require('./staff.route');
const leadScoringRoute = require('./leadScoring.route');
const mlScoringRoute = require('./mlScoring.route');
const contactListRoutes = require('./contactList.routes');
const activityPlanRoutes = require('./activityPlan.routes');
const competitorRoutes = require('./competitor.routes');
const interestAreaRoutes = require('./interestArea.routes');

// Sales Forecasting Routes
const salesForecastRoutes = require('./salesForecast.routes');

// Sales Quota & CRM Transaction Routes
const salesQuotaRoute = require('./salesQuota.route');
const crmTransactionRoute = require('./crmTransaction.route');

// CRM Reports Routes
const crmReportsRoute = require('./crmReports.route');

// Sales Module Routes
const salesRoute = require('./sales.routes');
const whatsappRoute = require('./whatsapp.route');
const telegramRoute = require('./telegram.route');
const slackRoute = require('./slack.route');
const discordRoute = require('./discord.route');
const zoomRoute = require('./zoom.route');
const githubRoute = require('./github.route');
const trelloRoute = require('./trello.route');
const gmailRoute = require('./gmail.route');
const docusignRoute = require('./docusign.route');
const appsRoute = require('./apps.route');

// CRM Enhancement Routes
const slaRoutes = require('./sla.routes');
const conversationRoutes = require('./conversation.routes');
const macroRoutes = require('./macro.routes');
const approvalRoutes = require('./approval.routes');
const bulkActionsRoutes = require('./bulkActions.routes');
const viewRoutes = require('./view.routes');
const automationRoutes = require('./automation.routes');
const timelineRoutes = require('./timeline.routes');
const cycleRoutes = require('./cycle.routes');
const dealRoomRoutes = require('./dealRoom.routes');
const reportRoutes = require('./report.routes');
const deduplicationRoutes = require('./deduplication.routes');
const commandPaletteRoutes = require('./commandPalette.routes');
const keyboardShortcutRoutes = require('./keyboardShortcut.routes');
const lifecycleRoutes = require('./lifecycle.routes');
const dealHealthRoutes = require('./dealHealth.routes');

// HR Routes
const hrRoute = require('./hr.route');
const payrollRoute = require('./payroll.route');
const payrollRunRoute = require('./payrollRun.route');
const leaveRequestRoute = require('./leaveRequest.route');
const attendanceRoute = require('./attendance.route');
const performanceReviewRoute = require('./performanceReview.route');
const recruitmentRoute = require('./recruitment.route');
const onboardingRoute = require('./onboarding.route');
const offboardingRoute = require('./offboarding.route');
const employeeLoanRoute = require('./employeeLoan.route');
const employeeAdvanceRoute = require('./employeeAdvance.route');
const expenseClaimRoute = require('./expenseClaim.route');
const trainingRoute = require('./training.route');
const assetAssignmentRoute = require('./assetAssignment.route');
const employeeBenefitRoute = require('./employeeBenefit.route');
const grievanceRoute = require('./grievance.route');
const organizationalUnitRoute = require('./organizationalUnit.route');
const jobPositionRoute = require('./jobPosition.route');
const successionPlanRoute = require('./successionPlan.route');
const compensationRewardRoute = require('./compensationReward.route');
const analyticsReportRoute = require('./analyticsReport.route');
const kpiAnalyticsRoute = require('./kpiAnalytics.route');

// Accounting Routes
const accountRoute = require('./account.route');
const generalLedgerRoute = require('./generalLedger.route');
const journalEntryRoute = require('./journalEntry.route');
const recurringTransactionRoute = require('./recurringTransaction.route');
const priceLevelRoute = require('./priceLevel.route');
const fiscalPeriodRoute = require('./fiscalPeriod.route');
const interCompanyRoute = require('./interCompany.route');
const consolidatedReportsRoute = require('./consolidatedReports.route');

// Finance Management Routes
const financeSetupRoute = require('./financeSetup.route');
const creditNoteRoute = require('./creditNote.route');
const debitNoteRoute = require('./debitNote.route');
const recurringInvoiceRoute = require('./recurringInvoice.route');
const paymentTermsRoute = require('./paymentTerms.route');
const expensePolicyRoute = require('./expensePolicy.route');
const corporateCardRoute = require('./corporateCard.route');
const paymentReceiptRoute = require('./paymentReceipt.route');
const invoiceApprovalRoute = require('./invoiceApproval.route');
const notificationSettingsRoute = require('./notificationSettings.route');

// Setup Wizard Routes (App Onboarding)
const setupWizardRoute = require('./setupWizard.route');

// Billing & Subscription Management Routes
const billingRoute = require('./billing.route');

// Email Settings Routes
const emailSettingsRoute = require('./emailSettings.route');

// OAuth SSO Routes
const oauthRoute = require('./oauth.route');

// Investment & Trading Journal Routes
const tradesRoute = require('./trades.route');
const brokersRoute = require('./brokers.route');
const tradingAccountsRoute = require('./tradingAccounts.route');

// Investment Portfolio Routes
const investmentsRoute = require('./investments.route');
const investmentSearchRoute = require('./investmentSearch.route');

// Invitation Routes
const invitationRoute = require('./invitation.route');

// Team Management Routes
const teamRoute = require('./team.route');

// Audit & Approval Routes
const auditRoute = require('./audit.route');
const auditLogRoute = require('./auditLog.route');
const approvalRoute = require('./approval.route');

// Permission Routes
const permissionRoute = require('./permission.route');

// 10/10 Feature Routes
const biometricRoute = require('./biometric.route');
const emailMarketingRoute = require('./emailMarketing.route');
const hrAnalyticsRoute = require('./hrAnalytics.route');
const documentAnalysisRoute = require('./documentAnalysis.route');
const smartSchedulingRoute = require('./smartScheduling.route');

// Saudi Banking Integration Routes
const saudiBankingRoute = require('./saudiBanking.route');

// Webhook Routes
const webhookRoute = require('./webhook.route');

// Health Check & Monitoring Routes
const healthRoute = require('./health.route');
const metricsRoute = require('./metrics.route');

// Security Incident Routes (NCA ECC-2:2024 Compliance)
const securityIncidentRoute = require('./securityIncident.route');

// Security Monitoring & Alerting Routes
const securityRoute = require('./security.route');

// PDPL Consent Routes
const consentRoute = require('./consent.route');

// Queue Management Routes
const queueRoute = require('./queue.route');

// AI Settings Routes
const aiSettingsRoute = require('./aiSettings.route');

// AI Chat Routes
const aiChatRoute = require('./aiChat.route');

// CaseNotion Routes (Notion-like case workspace)
const caseNotionRoute = require('./caseNotion.route');

// Legal Contract Routes (Najiz Integration)
const legalContractRoute = require('./legalContract.route');

// PDFMe Routes (Template-based PDF generation)
const pdfmeRoute = require('./pdfme.route');

// Saudi Government API Integration Routes
const verifyRoute = require('./verify.route');

// KYC/AML Verification Routes
const kycRoute = require('./kyc.route');

// Extended HR Routes (ERPNext HRMS parity)
const shiftRoute = require('./shift.route');
const leaveManagementRoute = require('./leaveManagement.route');
const hrExtendedRoute = require('./hrExtended.route');

// Unified Data Flow Routes
const unifiedDataRoute = require('./unifiedData.route');

// Plan & Subscription Routes
const planRoute = require('./plan.route');
const apiKeyRoute = require('./apiKey.route');

// WebAuthn Routes (Hardware Security Keys & Biometric Authentication)
const webauthnRoute = require('./webauthn.route');

// SAML/SSO Routes (Enterprise SSO Authentication)
const samlRoute = require('./saml.route');

// SSO Configuration Routes (Enterprise SSO Management UI)
const ssoConfigRoute = require('./ssoConfig.route');

// LDAP/Active Directory Routes (Enterprise LDAP Authentication)
const ldapRoute = require('./ldap.route');

// MFA Routes (Multi-Factor Authentication - TOTP)
const mfaRoute = require('./mfa.route');

// CAPTCHA Routes (Multi-provider CAPTCHA verification)
const captchaRoute = require('./captcha.route');

// Odoo Integration Routes
const activityRoutes = require('./activity.routes');
const threadMessageRoutes = require('./threadMessage.routes');
const chatterFollowerRoutes = require('./chatterFollower.routes');
const lockDateRoutes = require('./lockDate.routes');
const automatedActionRoutes = require('./automatedAction.routes');
const smartButtonRoute = require('./smartButton.route');

// Churn Management Routes
const churnRoute = require('./churn.route');

// Saved Filters Routes
const savedFilterRoutes = require('./savedFilter.routes');

// Microsoft Calendar Integration Routes
const microsoftCalendarRoute = require('./microsoftCalendar.route');

// Google Calendar Integration Routes
const googleCalendarRoute = require('./googleCalendar.route');

// Analytics Routes (Event-based Analytics System)
const analyticsRoutes = require('./analytics.routes');

// Cloud Storage Routes (Google Drive, Dropbox, OneDrive Integration)
const cloudStorageRoutes = require('./cloudStorage.routes');

// Offline Sync Routes (PWA Offline Functionality)
const offlineSyncRoutes = require('./offlineSync.routes');

// Sandbox/Demo Environment Routes
const sandboxRoute = require('./sandbox.routes');

// Incident Playbook Routes
const playbookRoute = require('./playbook.route');

// AR Aging Routes
const arAgingRoute = require('./arAging.route');

// Integration Routes (QuickBooks, Xero)
const integrationsRoute = require('./integrations.route');

// Walkthrough Routes
const walkthroughRoute = require('./walkthrough.route');

// Status Page Routes
const statusRoute = require('./status.route');

// Field History Routes
const fieldHistoryRoutes = require('./fieldHistory.routes');

// SLO Monitoring Routes
const sloMonitoringRoutes = require('./sloMonitoring.routes');

// Custom Field Routes
const customFieldRoutes = require('./customField.routes');

// Plugin Routes
const pluginRoutes = require('./plugin.routes');

// Rate Limit Routes
const rateLimitRoute = require('./rateLimit.route');

module.exports = {
    // Marketplace
    gigRoute,
    authRoute,
    mfaRoute,
    captchaRoute,
    adminRoute,
    adminApiRoute,
    adminToolsRoute,
    orderRoute,
    conversationRoute,
    messageRoute,
    reviewRoute,
    disputeRoute,
    userRoute,
    jobRoute,
    proposalRoute,
    questionRoute,
    answerRoute,
    firmRoute,
    organizationTemplateRoute,

    // Dashboard Core
    dashboardRoute,
    activityRoute,
    caseRoute,
    temporalCaseRoute,
    taskRoute,
    ganttRoute,
    notificationRoute,
    notificationPreferenceRoute,
    eventRoute,

    // Dashboard Finance
    invoiceRoute,
    temporalInvoiceRoute,
    expenseRoute,
    timeTrackingRoute,
    paymentRoute,
    retainerRoute,
    billingRateRoute,
    statementRoute,
    transactionRoute,
    reportRoute,
    dunningRoute,

    // Dashboard Organization
    reminderRoute,
    clientRoute,
    calendarRoute,
    lawyerRoute,
    payoutRoute,

    // New API Routes
    tagRoute,
    contactRoute,
    organizationRoute,
    documentRoute,
    followupRoute,
    workflowRoute,
    workflowRoutes,
    rateGroupRoute,
    rateCardRoute,
    invoiceTemplateRoute,
    dataExportRoute,
    conflictCheckRoute,
    trustAccountRoute,
    matterBudgetRoute,
    savedReportRoute,

    // Bank Accounts
    bankAccountRoute,
    bankTransferRoute,
    bankTransactionRoute,
    bankReconciliationRoute,
    currencyRoute,

    // Vendors and Bills
    vendorRoute,
    billRoute,
    billPaymentRoute,

    // Subcontracting
    subcontractingRoute,

    // ERPNext-style Modules
    inventoryRoute,
    buyingRoute,
    supportRoute,
    qualityRoute,
    manufacturingRoute,
    assetsRoute,

    // CRM
    leadRoute,
    crmPipelineRoute,
    referralRoute,
    crmActivityRoute,
    staffRoute,
    leadScoringRoute,
    mlScoringRoute,
    contactListRoutes,
    activityPlanRoutes,
    competitorRoutes,
    interestAreaRoutes,

    // Sales Forecasting
    salesForecastRoutes,

    // Sales Quota & CRM Transactions
    salesQuotaRoute,
    crmTransactionRoute,

    // CRM Reports
    crmReportsRoute,

    // Sales Module
    salesRoute,

    whatsappRoute,
    telegramRoute,
    slackRoute,
    discordRoute,
    zoomRoute,
    githubRoute,
    trelloRoute,
    gmailRoute,
    docusignRoute,
    appsRoute,

    // CRM Enhancement
    slaRoutes,
    conversationRoutes,
    macroRoutes,
    approvalRoutes,
    bulkActionsRoutes,
    viewRoutes,
    automationRoutes,
    timelineRoutes,
    cycleRoutes,
    dealRoomRoutes,
    reportRoutes,
    deduplicationRoutes,
    commandPaletteRoutes,
    keyboardShortcutRoutes,
    lifecycleRoutes,
    dealHealthRoutes,

    // HR
    hrRoute,
    payrollRoute,
    payrollRunRoute,
    leaveRequestRoute,
    attendanceRoute,
    performanceReviewRoute,
    recruitmentRoute,
    onboardingRoute,
    offboardingRoute,
    employeeLoanRoute,
    employeeAdvanceRoute,
    expenseClaimRoute,
    trainingRoute,
    assetAssignmentRoute,
    employeeBenefitRoute,
    grievanceRoute,
    organizationalUnitRoute,
    jobPositionRoute,
    successionPlanRoute,
    compensationRewardRoute,
    analyticsReportRoute,
    kpiAnalyticsRoute,

    // Accounting
    accountRoute,
    generalLedgerRoute,
    journalEntryRoute,
    recurringTransactionRoute,
    priceLevelRoute,
    fiscalPeriodRoute,
    interCompanyRoute,
    consolidatedReportsRoute,

    // Finance Management
    financeSetupRoute,
    creditNoteRoute,
    debitNoteRoute,
    recurringInvoiceRoute,
    paymentTermsRoute,
    expensePolicyRoute,
    corporateCardRoute,
    paymentReceiptRoute,
    invoiceApprovalRoute,
    notificationSettingsRoute,

    // Setup Wizard (App Onboarding)
    setupWizardRoute,

    // Billing & Subscription Management
    billingRoute,

    // Email Settings
    emailSettingsRoute,

    // OAuth SSO
    oauthRoute,

    // Investment & Trading Journal
    tradesRoute,
    brokersRoute,
    tradingAccountsRoute,

    // Investment Portfolio
    investmentsRoute,
    investmentSearchRoute,

    // Invitations
    invitationRoute,

    // Team Management
    teamRoute,

    // Audit & Approvals
    auditRoute,
    auditLogRoute,
    approvalRoute,

    // Permissions
    permissionRoute,

    // 10/10 Features
    biometricRoute,
    emailMarketingRoute,
    hrAnalyticsRoute,
    documentAnalysisRoute,
    smartSchedulingRoute,

    // Saudi Banking Integration
    saudiBankingRoute,

    // Webhooks
    webhookRoute,

    // Health Check & Monitoring
    healthRoute,
    metricsRoute,

    // Security Incident Reporting (NCA ECC-2:2024 Compliance)
    securityIncidentRoute,

    // Security Monitoring & Alerting
    securityRoute,

    // PDPL Consent Management
    consentRoute,

    // Queue Management
    queueRoute,

    // AI Settings
    aiSettingsRoute,

    // AI Chat
    aiChatRoute,

    // CaseNotion (Notion-like case workspace)
    caseNotionRoute,

    // Legal Contracts (Najiz Integration)
    legalContractRoute,

    // PDFMe (Template-based PDF generation)
    pdfmeRoute,

    // Saudi Government API Integration
    verifyRoute,

    // KYC/AML Verification
    kycRoute,

    // Extended HR (ERPNext HRMS parity)
    shiftRoute,
    leaveManagementRoute,
    hrExtendedRoute,

    // Unified Data Flow
    unifiedDataRoute,

    // Plan & Subscription
    planRoute,
    apiKeyRoute,

    // WebAuthn (Hardware Security Keys & Biometric Authentication)
    webauthnRoute,

    // SAML/SSO (Enterprise SSO Authentication)
    samlRoute,

    // SSO Configuration (Enterprise SSO Management UI)
    ssoConfigRoute,

    // LDAP/Active Directory (Enterprise LDAP Authentication)
    ldapRoute,

    // Odoo Integration
    activityRoutes,
    threadMessageRoutes,
    chatterFollowerRoutes,
    lockDateRoutes,
    automatedActionRoutes,
    smartButtonRoute,

    // Churn Management
    churnRoute,

    // Saved Filters
    savedFilterRoutes,

    // Microsoft Calendar Integration
    microsoftCalendarRoute,

    // Google Calendar Integration
    googleCalendarRoute,

    // Analytics (Event-based Analytics System)
    analyticsRoutes,

    // Cloud Storage Integration (Google Drive, Dropbox, OneDrive)
    cloudStorageRoutes,

    // Offline Sync (PWA Offline Functionality)
    offlineSyncRoutes,

    // Sandbox/Demo Environment
    sandboxRoute,

    // Incident Playbook
    playbookRoute,

    // AR Aging
    arAgingRoute,

    // Integrations (QuickBooks, Xero)
    integrationsRoute,

    // Walkthrough
    walkthroughRoute,

    // Status Page
    statusRoute,

    // Field History
    fieldHistoryRoutes,

    // SLO Monitoring
    sloMonitoringRoutes,

    // Custom Fields
    customFieldRoutes,

    // Plugins
    pluginRoutes,

    // Rate Limiting
    rateLimitRoute
};
