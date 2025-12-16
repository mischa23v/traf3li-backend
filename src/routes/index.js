// Marketplace Routes
const gigRoute = require('./gig.route');
const authRoute = require('./auth.route');
const orderRoute = require('./order.route');
const conversationRoute = require('./conversation.route');
const messageRoute = require('./message.route');
const reviewRoute = require('./review.route');
const userRoute = require('./user.route');
const jobRoute = require('./job.route');
const proposalRoute = require('./proposal.route');
const questionRoute = require('./question.route');
const answerRoute = require('./answer.route');
const firmRoute = require('./firm.route');

// Dashboard Core Routes
const dashboardRoute = require('./dashboard.route');
const activityRoute = require('./activity.route');
const caseRoute = require('./case.route');
const taskRoute = require('./task.route');
const ganttRoute = require('./gantt.route');
const notificationRoute = require('./notification.route');
const eventRoute = require('./event.route');

// Dashboard Finance Routes
const invoiceRoute = require('./invoice.route');
const expenseRoute = require('./expense.route');
const timeTrackingRoute = require('./timeTracking.route');
const paymentRoute = require('./payment.route');
const retainerRoute = require('./retainer.route');
const billingRateRoute = require('./billingRate.route');
const statementRoute = require('./statement.route');
const transactionRoute = require('./transaction.route');
const reportRoute = require('./report.route');

// Dashboard Organization Routes
const reminderRoute = require('./reminder.route');
const clientRoute = require('./client.route');
const calendarRoute = require('./calendar.route');
const lawyerRoute = require('./lawyer.route');

// New API Routes
const tagRoute = require('./tag.route');
const contactRoute = require('./contact.route');
const organizationRoute = require('./organization.route');
const documentRoute = require('./document.route');
const followupRoute = require('./followup.route');
const workflowRoute = require('./workflow.route');
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

// CRM Routes
const leadRoute = require('./lead.route');
const crmPipelineRoute = require('./crmPipeline.route');
const referralRoute = require('./referral.route');
const crmActivityRoute = require('./crmActivity.route');
const staffRoute = require('./staff.route');
const leadScoringRoute = require('./leadScoring.route');
const whatsappRoute = require('./whatsapp.route');

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

// Extended HR Routes (ERPNext HRMS parity)
const shiftRoute = require('./shift.route');
const leaveManagementRoute = require('./leaveManagement.route');
const hrExtendedRoute = require('./hrExtended.route');

// Unified Data Flow Routes
const unifiedDataRoute = require('./unifiedData.route');

module.exports = {
    // Marketplace
    gigRoute,
    authRoute,
    orderRoute,
    conversationRoute,
    messageRoute,
    reviewRoute,
    userRoute,
    jobRoute,
    proposalRoute,
    questionRoute,
    answerRoute,
    firmRoute,

    // Dashboard Core
    dashboardRoute,
    activityRoute,
    caseRoute,
    taskRoute,
    ganttRoute,
    notificationRoute,
    eventRoute,

    // Dashboard Finance
    invoiceRoute,
    expenseRoute,
    timeTrackingRoute,
    paymentRoute,
    retainerRoute,
    billingRateRoute,
    statementRoute,
    transactionRoute,
    reportRoute,

    // Dashboard Organization
    reminderRoute,
    clientRoute,
    calendarRoute,
    lawyerRoute,

    // New API Routes
    tagRoute,
    contactRoute,
    organizationRoute,
    documentRoute,
    followupRoute,
    workflowRoute,
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

    // CRM
    leadRoute,
    crmPipelineRoute,
    referralRoute,
    crmActivityRoute,
    staffRoute,
    leadScoringRoute,
    whatsappRoute,

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

    // Extended HR (ERPNext HRMS parity)
    shiftRoute,
    leaveManagementRoute,
    hrExtendedRoute,

    // Unified Data Flow
    unifiedDataRoute
};
