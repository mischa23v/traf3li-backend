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

// Accounting Routes
const accountRoute = require('./account.route');
const generalLedgerRoute = require('./generalLedger.route');
const journalEntryRoute = require('./journalEntry.route');
const recurringTransactionRoute = require('./recurringTransaction.route');
const priceLevelRoute = require('./priceLevel.route');
const fiscalPeriodRoute = require('./fiscalPeriod.route');

// Investment & Trading Journal Routes
const tradesRoute = require('./trades.route');
const brokersRoute = require('./brokers.route');
const tradingAccountsRoute = require('./tradingAccounts.route');

// Investment Portfolio Routes
const investmentsRoute = require('./investments.route');
const investmentSearchRoute = require('./investmentSearch.route');

// Invitation Routes
const invitationRoute = require('./invitation.route');

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

    // Accounting
    accountRoute,
    generalLedgerRoute,
    journalEntryRoute,
    recurringTransactionRoute,
    priceLevelRoute,
    fiscalPeriodRoute,

    // Investment & Trading Journal
    tradesRoute,
    brokersRoute,
    tradingAccountsRoute,

    // Investment Portfolio
    investmentsRoute,
    investmentSearchRoute,

    // Invitations
    invitationRoute
};
