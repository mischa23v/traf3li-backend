/**
 * API v1 Routes
 *
 * Central export for all v1 API routes
 * These routes maintain backward compatibility with the existing API
 */

const express = require('express');
const router = express.Router();

// Import all routes from parent directory
// Marketplace Routes
const gigRoute = require('../gig.route');
const authRoute = require('../auth.route');
const orderRoute = require('../order.route');
const conversationRoute = require('../conversation.route');
const messageRoute = require('../message.route');
const reviewRoute = require('../review.route');
const userRoute = require('../user.route');
const jobRoute = require('../job.route');
const proposalRoute = require('../proposal.route');
const questionRoute = require('../question.route');
const answerRoute = require('../answer.route');
const firmRoute = require('../firm.route');

// Dashboard Core Routes
const dashboardRoute = require('../dashboard.route');
const activityRoute = require('../activity.route');
const caseRoute = require('../case.route');
const caseNotionRoute = require('../caseNotion.route');
const taskRoute = require('../task.route');
const ganttRoute = require('../gantt.route');
const notificationRoute = require('../notification.route');
const eventRoute = require('../event.route');

// Dashboard Finance Routes
const invoiceRoute = require('../invoice.route');
const expenseRoute = require('../expense.route');
const timeTrackingRoute = require('../timeTracking.route');
const paymentRoute = require('../payment.route');
const retainerRoute = require('../retainer.route');
const billingRateRoute = require('../billingRate.route');
const statementRoute = require('../statement.route');
const transactionRoute = require('../transaction.route');
const reportRoute = require('../report.route');

// Dashboard Organization Routes
const reminderRoute = require('../reminder.route');
const clientRoute = require('../client.route');
const calendarRoute = require('../calendar.route');
const lawyerRoute = require('../lawyer.route');

// New API Routes
const tagRoute = require('../tag.route');
const contactRoute = require('../contact.route');
const organizationRoute = require('../organization.route');
const documentRoute = require('../document.route');
const followupRoute = require('../followup.route');
const workflowRoute = require('../workflow.route');
const rateGroupRoute = require('../rateGroup.route');
const rateCardRoute = require('../rateCard.route');
const invoiceTemplateRoute = require('../invoiceTemplate.route');
const dataExportRoute = require('../dataExport.route');
const conflictCheckRoute = require('../conflictCheck.route');
const trustAccountRoute = require('../trustAccount.route');
const matterBudgetRoute = require('../matterBudget.route');
const savedReportRoute = require('../savedReport.route');

// Bank Account Routes
const bankAccountRoute = require('../bankAccount.route');
const bankTransferRoute = require('../bankTransfer.route');
const bankTransactionRoute = require('../bankTransaction.route');
const bankReconciliationRoute = require('../bankReconciliation.route');
const currencyRoute = require('../currency.route');

// Vendor and Bills Routes
const vendorRoute = require('../vendor.route');
const billRoute = require('../bill.route');
const billPaymentRoute = require('../billPayment.route');

// CRM Routes
const leadRoute = require('../lead.route');
const crmPipelineRoute = require('../crmPipeline.route');
const referralRoute = require('../referral.route');
const crmActivityRoute = require('../crmActivity.route');
const staffRoute = require('../staff.route');
const leadScoringRoute = require('../leadScoring.route');
const whatsappRoute = require('../whatsapp.route');

// HR Routes
const hrRoute = require('../hr.route');
const payrollRoute = require('../payroll.route');
const payrollRunRoute = require('../payrollRun.route');
const leaveRequestRoute = require('../leaveRequest.route');
const attendanceRoute = require('../attendance.route');
const performanceReviewRoute = require('../performanceReview.route');
const recruitmentRoute = require('../recruitment.route');
const onboardingRoute = require('../onboarding.route');
const offboardingRoute = require('../offboarding.route');
const employeeLoanRoute = require('../employeeLoan.route');
const employeeAdvanceRoute = require('../employeeAdvance.route');
const expenseClaimRoute = require('../expenseClaim.route');
const trainingRoute = require('../training.route');
const assetAssignmentRoute = require('../assetAssignment.route');
const employeeBenefitRoute = require('../employeeBenefit.route');
const grievanceRoute = require('../grievance.route');
const organizationalUnitRoute = require('../organizationalUnit.route');
const jobPositionRoute = require('../jobPosition.route');
const successionPlanRoute = require('../successionPlan.route');
const compensationRewardRoute = require('../compensationReward.route');
const analyticsReportRoute = require('../analyticsReport.route');

// Accounting Routes
const accountRoute = require('../account.route');
const generalLedgerRoute = require('../generalLedger.route');
const journalEntryRoute = require('../journalEntry.route');
const recurringTransactionRoute = require('../recurringTransaction.route');
const priceLevelRoute = require('../priceLevel.route');
const fiscalPeriodRoute = require('../fiscalPeriod.route');

// Investment & Trading Journal Routes
const tradesRoute = require('../trades.route');
const brokersRoute = require('../brokers.route');
const tradingAccountsRoute = require('../tradingAccounts.route');

// Investment Portfolio Routes
const investmentsRoute = require('../investments.route');
const investmentSearchRoute = require('../investmentSearch.route');

// Invitation Routes
const invitationRoute = require('../invitation.route');

// Team Management Routes
const teamRoute = require('../team.route');

// Audit & Approval Routes
const auditRoute = require('../audit.route');
const approvalRoute = require('../approval.route');

// Permission Routes
const permissionRoute = require('../permission.route');

// 10/10 Feature Routes
const biometricRoute = require('../biometric.route');
const emailMarketingRoute = require('../emailMarketing.route');
const hrAnalyticsRoute = require('../hrAnalytics.route');
const documentAnalysisRoute = require('../documentAnalysis.route');

// PDFMe Routes (Template-based PDF generation)
const pdfmeRoute = require('../pdfme.route');

// Saudi Banking Integration Routes
const saudiBankingRoute = require('../saudiBanking.route');

// Health Check & Monitoring Routes
const healthRoute = require('../health.route');
const metricsRoute = require('../metrics.route');

// Import security middleware
const { noCache } = require('../../middlewares/security.middleware');

// ============================================
// MARKETPLACE ROUTES
// ============================================
router.use('/gigs', gigRoute);
router.use('/auth', noCache, authRoute);
router.use('/orders', orderRoute);
router.use('/conversations', conversationRoute);
router.use('/messages', messageRoute);
router.use('/reviews', reviewRoute);
router.use('/users', noCache, userRoute);
router.use('/jobs', jobRoute);
router.use('/proposals', proposalRoute);
router.use('/questions', questionRoute);
router.use('/answers', answerRoute);
router.use('/firms', firmRoute);

// ============================================
// DASHBOARD CORE ROUTES
// ============================================
router.use('/dashboard', noCache, dashboardRoute);
router.use('/activities', activityRoute);
router.use('/cases', caseRoute);
router.use('/', caseNotionRoute);  // CaseNotion routes under /cases/:caseId/notion/*
router.use('/tasks', taskRoute);
router.use('/gantt', ganttRoute);
router.use('/notifications', noCache, notificationRoute);
router.use('/events', eventRoute);

// ============================================
// DASHBOARD FINANCE ROUTES
// ============================================
router.use('/invoices', noCache, invoiceRoute);
router.use('/expenses', noCache, expenseRoute);
router.use('/time-tracking', timeTrackingRoute);
router.use('/payments', noCache, paymentRoute);
router.use('/retainers', noCache, retainerRoute);
router.use('/billing-rates', billingRateRoute);
router.use('/statements', noCache, statementRoute);
router.use('/transactions', noCache, transactionRoute);
router.use('/reports', noCache, reportRoute);

// ============================================
// DASHBOARD ORGANIZATION ROUTES
// ============================================
router.use('/reminders', reminderRoute);
router.use('/clients', clientRoute);
router.use('/calendar', calendarRoute);
router.use('/lawyers', lawyerRoute);

// ============================================
// NEW API ROUTES
// ============================================
router.use('/tags', tagRoute);
router.use('/contacts', contactRoute);
router.use('/organizations', organizationRoute);
router.use('/documents', documentRoute);
router.use('/followups', followupRoute);
router.use('/workflows', workflowRoute);
router.use('/rate-groups', rateGroupRoute);
router.use('/rate-cards', rateCardRoute);
router.use('/invoice-templates', invoiceTemplateRoute);
router.use('/data-export', noCache, dataExportRoute);
router.use('/conflict-checks', conflictCheckRoute);
router.use('/trust-accounts', noCache, trustAccountRoute);
router.use('/matter-budgets', matterBudgetRoute);
router.use('/saved-reports', savedReportRoute);

// ============================================
// BANK ACCOUNT ROUTES
// ============================================
router.use('/bank-accounts', noCache, bankAccountRoute);
router.use('/bank-transfers', noCache, bankTransferRoute);
router.use('/bank-transactions', noCache, bankTransactionRoute);
router.use('/bank-reconciliations', noCache, bankReconciliationRoute);
router.use('/currency', currencyRoute);

// ============================================
// VENDOR AND BILLS ROUTES
// ============================================
router.use('/vendors', vendorRoute);
router.use('/bills', noCache, billRoute);
router.use('/bill-payments', noCache, billPaymentRoute);

// ============================================
// CRM ROUTES
// ============================================
router.use('/leads', leadRoute);
router.use('/crm-pipelines', crmPipelineRoute);
router.use('/referrals', referralRoute);
router.use('/crm-activities', crmActivityRoute);
router.use('/staff', staffRoute);
router.use('/lead-scoring', leadScoringRoute);
router.use('/whatsapp', whatsappRoute);

// ============================================
// HR ROUTES
// ============================================
router.use('/hr', noCache, hrRoute);
router.use('/hr/payroll', noCache, payrollRoute);
router.use('/hr/payroll-runs', noCache, payrollRunRoute);
router.use('/leave-requests', leaveRequestRoute);
router.use('/attendance', noCache, attendanceRoute);
router.use('/hr/performance-reviews', noCache, performanceReviewRoute);
router.use('/hr/recruitment', recruitmentRoute);
router.use('/hr/onboarding', onboardingRoute);
router.use('/hr/offboarding', offboardingRoute);
router.use('/hr/employee-loans', noCache, employeeLoanRoute);
router.use('/hr/advances', noCache, employeeAdvanceRoute);
router.use('/hr/expense-claims', noCache, expenseClaimRoute);
router.use('/hr/trainings', trainingRoute);
router.use('/hr/asset-assignments', assetAssignmentRoute);
router.use('/hr/benefits', noCache, employeeBenefitRoute);
router.use('/hr/employee-benefits', noCache, employeeBenefitRoute);  // Alias for frontend
router.use('/hr/grievances', noCache, grievanceRoute);
router.use('/hr/organizational-structure', organizationalUnitRoute);
router.use('/hr/job-positions', jobPositionRoute);
router.use('/hr/succession-plans', successionPlanRoute);
router.use('/hr/compensation', noCache, compensationRewardRoute);
router.use('/hr/compensation-rewards', noCache, compensationRewardRoute);  // Alias for frontend

// ============================================
// ANALYTICS REPORTS ROUTES
// ============================================
router.use('/analytics-reports', analyticsReportRoute);

// ============================================
// ACCOUNTING ROUTES
// ============================================
router.use('/accounts', accountRoute);
router.use('/general-ledger', generalLedgerRoute);
router.use('/journal-entries', journalEntryRoute);
router.use('/recurring-transactions', recurringTransactionRoute);
router.use('/price-levels', priceLevelRoute);
router.use('/fiscal-periods', fiscalPeriodRoute);

// ============================================
// INVESTMENT & TRADING JOURNAL ROUTES
// ============================================
router.use('/trades', tradesRoute);
router.use('/brokers', brokersRoute);
router.use('/trading-accounts', tradingAccountsRoute);

// ============================================
// INVESTMENT PORTFOLIO ROUTES
// ============================================
router.use('/investments', investmentsRoute);
router.use('/investment-search', investmentSearchRoute);

// ============================================
// INVITATION ROUTES
// ============================================
router.use('/invitations', invitationRoute);

// ============================================
// TEAM MANAGEMENT ROUTES
// ============================================
router.use('/team', noCache, teamRoute);

// ============================================
// AUDIT & APPROVAL ROUTES
// ============================================
router.use('/audit', noCache, auditRoute);
router.use('/approvals', noCache, approvalRoute);

// ============================================
// PERMISSION ROUTES
// ============================================
router.use('/permissions', noCache, permissionRoute);

// ============================================
// 10/10 FEATURE ROUTES
// ============================================
router.use('/biometric', biometricRoute);
router.use('/email-marketing', emailMarketingRoute);
router.use('/hr-analytics', hrAnalyticsRoute);
router.use('/document-analysis', documentAnalysisRoute);

// ============================================
// PDFMe (Template-based PDF generation)
// ============================================
router.use('/pdfme', pdfmeRoute);

// ============================================
// SAUDI BANKING INTEGRATION
// ============================================
router.use('/saudi-banking', noCache, saudiBankingRoute);

// ============================================
// HEALTH CHECK & MONITORING
// ============================================
router.use('/health', healthRoute);
router.use('/metrics', metricsRoute);

// ============================================
// ALIAS ROUTES (for frontend compatibility)
// ============================================
router.use('/case-workflows', workflowRoute);
router.use('/billing/rates', billingRateRoute);
router.use('/billing/groups', rateGroupRoute);
router.use('/payroll-runs', noCache, payrollRunRoute);
router.use('/bank-reconciliation', noCache, bankReconciliationRoute);
router.use('/succession-plans', successionPlanRoute);  // Alias for frontend (also available at /hr/succession-plans)

// Apps endpoint (placeholder for app integrations)
router.get('/apps', (req, res) => {
    res.json({
        success: true,
        data: {
            apps: [],
            installed: [],
            available: []
        },
        message: 'Apps feature coming soon',
        meta: {
            timestamp: new Date().toISOString(),
            apiVersion: 'v1'
        }
    });
});

module.exports = router;
