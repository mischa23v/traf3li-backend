/**
 * Saudi Banking Integration Routes
 * Lean Technologies, WPS, SADAD, and Mudad endpoints
 */

const express = require('express');
const router = express.Router();
const authenticate = require('../middlewares/authenticate');
const saudiBankingController = require('../controllers/saudiBanking.controller');
const { apiRateLimiter } = require('../middlewares/rateLimiter.middleware');

// Apply rate limiting to all routes
router.use(apiRateLimiter);

// ============================================
// LEAN TECHNOLOGIES - Open Banking
// ============================================

/**
 * @route   GET /api/saudi-banking/lean/banks
 * @desc    Get list of supported Saudi banks
 * @access  Private
 */
router.get('/lean/banks', authenticate, saudiBankingController.getBanks);

/**
 * @route   GET /api/saudi-banking/lean/customers
 * @desc    Get all Lean customers for the authenticated user
 * @access  Private
 */
router.get('/lean/customers', authenticate, saudiBankingController.getLeanCustomers);

/**
 * @route   POST /api/saudi-banking/lean/customers
 * @desc    Create a Lean customer for bank linking
 * @access  Private
 * @body    { appUserId: string }
 */
router.post('/lean/customers', authenticate, saudiBankingController.createLeanCustomer);

/**
 * @route   GET /api/saudi-banking/lean/customers/:customerId/token
 * @desc    Get customer-scoped token for LinkSDK
 * @access  Private
 */
router.get('/lean/customers/:customerId/token', authenticate, saudiBankingController.getCustomerToken);

/**
 * @route   GET /api/saudi-banking/lean/customers/:customerId/entities
 * @desc    Get connected bank accounts (entities)
 * @access  Private
 */
router.get('/lean/customers/:customerId/entities', authenticate, saudiBankingController.getEntities);

/**
 * @route   GET /api/saudi-banking/lean/entities/:entityId/accounts
 * @desc    Get accounts for a connected entity
 * @access  Private
 */
router.get('/lean/entities/:entityId/accounts', authenticate, saudiBankingController.getAccounts);

/**
 * @route   GET /api/saudi-banking/lean/accounts/:accountId/balance
 * @desc    Get account balance
 * @access  Private
 */
router.get('/lean/accounts/:accountId/balance', authenticate, saudiBankingController.getBalance);

/**
 * @route   GET /api/saudi-banking/lean/accounts/:accountId/transactions
 * @desc    Get account transactions
 * @access  Private
 * @query   { page, pageSize, fromDate, toDate }
 */
router.get('/lean/accounts/:accountId/transactions', authenticate, saudiBankingController.getTransactions);

/**
 * @route   GET /api/saudi-banking/lean/entities/:entityId/identity
 * @desc    Get identity information for connected account
 * @access  Private
 */
router.get('/lean/entities/:entityId/identity', authenticate, saudiBankingController.getIdentity);

/**
 * @route   POST /api/saudi-banking/lean/payments
 * @desc    Initiate a payment
 * @access  Private
 * @body    { amount, currency, paymentSourceId, paymentDestinationId, description }
 */
router.post('/lean/payments', authenticate, saudiBankingController.initiatePayment);

/**
 * @route   DELETE /api/saudi-banking/lean/entities/:entityId
 * @desc    Disconnect a bank account
 * @access  Private
 */
router.delete('/lean/entities/:entityId', authenticate, saudiBankingController.disconnectEntity);

/**
 * @route   POST /api/saudi-banking/lean/webhook
 * @desc    Handle Lean webhook events
 * @access  Public (webhook)
 */
router.post('/lean/webhook', saudiBankingController.handleLeanWebhook);

// ============================================
// WPS - Wage Protection System
// ============================================

/**
 * @route   POST /api/saudi-banking/wps/generate
 * @desc    Generate WPS file
 * @access  Private
 * @body    { establishment, employees, paymentDate, batchReference }
 */
router.post('/wps/generate', authenticate, saudiBankingController.generateWPSFile);

/**
 * @route   POST /api/saudi-banking/wps/download
 * @desc    Download WPS file
 * @access  Private
 * @body    { establishment, employees, paymentDate, batchReference }
 */
router.post('/wps/download', authenticate, saudiBankingController.downloadWPSFile);

/**
 * @route   POST /api/saudi-banking/wps/validate
 * @desc    Validate WPS data before generation
 * @access  Private
 * @body    { establishment, employees }
 */
router.post('/wps/validate', authenticate, saudiBankingController.validateWPSData);

/**
 * @route   GET /api/saudi-banking/wps/files
 * @desc    Get list of generated WPS files
 * @access  Private
 * @query   { page, limit, startDate, endDate }
 */
router.get('/wps/files', authenticate, saudiBankingController.getWPSFiles);

/**
 * @route   GET /api/saudi-banking/wps/sarie-banks
 * @desc    Get SARIE bank IDs for Saudi banks
 * @access  Private
 */
router.get('/wps/sarie-banks', authenticate, saudiBankingController.getSarieBankIds);

// ============================================
// SADAD - Bill Payments
// ============================================

/**
 * @route   GET /api/saudi-banking/sadad/billers
 * @desc    Get list of SADAD billers
 * @access  Private
 * @query   { category }
 */
router.get('/sadad/billers', authenticate, saudiBankingController.getSadadBillers);

/**
 * @route   GET /api/saudi-banking/sadad/billers/search
 * @desc    Search billers by name or category
 * @access  Private
 * @query   { query }
 */
router.get('/sadad/billers/search', authenticate, saudiBankingController.searchBillers);

/**
 * @route   POST /api/saudi-banking/sadad/bills/inquiry
 * @desc    Inquire about a bill
 * @access  Private
 * @body    { billerCode, billNumber }
 */
router.post('/sadad/bills/inquiry', authenticate, saudiBankingController.inquireBill);

/**
 * @route   POST /api/saudi-banking/sadad/bills/pay
 * @desc    Pay a bill via SADAD
 * @access  Private
 * @body    { billerCode, billNumber, amount, debitAccount, reference, remarks }
 */
router.post('/sadad/bills/pay', authenticate, saudiBankingController.payBill);

/**
 * @route   GET /api/saudi-banking/sadad/payments/:transactionId/status
 * @desc    Get SADAD payment status
 * @access  Private
 */
router.get('/sadad/payments/:transactionId/status', authenticate, saudiBankingController.getSadadPaymentStatus);

/**
 * @route   GET /api/saudi-banking/sadad/payments/history
 * @desc    Get SADAD payment history
 * @access  Private
 * @query   { fromDate, toDate, billerCode, status, page, pageSize }
 */
router.get('/sadad/payments/history', authenticate, saudiBankingController.getSadadPaymentHistory);

// ============================================
// MUDAD - Payroll Compliance
// ============================================

/**
 * @route   POST /api/saudi-banking/mudad/payroll/calculate
 * @desc    Calculate payroll with GOSI
 * @access  Private
 * @body    { employees }
 */
router.post('/mudad/payroll/calculate', authenticate, saudiBankingController.calculatePayroll);

/**
 * @route   POST /api/saudi-banking/mudad/gosi/calculate
 * @desc    Calculate GOSI for single employee
 * @access  Private
 * @body    { nationality, basicSalary }
 */
router.post('/mudad/gosi/calculate', authenticate, saudiBankingController.calculateGOSI);

/**
 * @route   POST /api/saudi-banking/mudad/wps/generate
 * @desc    Generate WPS file via Mudad with GOSI calculation
 * @access  Private
 * @body    { establishment, employees, paymentDate, batchReference }
 */
router.post('/mudad/wps/generate', authenticate, saudiBankingController.generateMudadWPS);

/**
 * @route   POST /api/saudi-banking/mudad/payroll/submit
 * @desc    Submit payroll to Mudad
 * @access  Private
 * @body    { establishment, employees, paymentDate }
 */
router.post('/mudad/payroll/submit', authenticate, saudiBankingController.submitPayroll);

/**
 * @route   GET /api/saudi-banking/mudad/submissions/:submissionId/status
 * @desc    Get payroll submission status
 * @access  Private
 */
router.get('/mudad/submissions/:submissionId/status', authenticate, saudiBankingController.getSubmissionStatus);

/**
 * @route   POST /api/saudi-banking/mudad/gosi/report
 * @desc    Generate GOSI report
 * @access  Private
 * @body    { employees, month }
 */
router.post('/mudad/gosi/report', authenticate, saudiBankingController.generateGOSIReport);

/**
 * @route   POST /api/saudi-banking/mudad/compliance/nitaqat
 * @desc    Check Nitaqat (Saudization) compliance
 * @access  Private
 * @body    { employees }
 */
router.post('/mudad/compliance/nitaqat', authenticate, saudiBankingController.checkNitaqat);

/**
 * @route   POST /api/saudi-banking/mudad/compliance/minimum-wage
 * @desc    Check minimum wage compliance
 * @access  Private
 * @body    { employees }
 */
router.post('/mudad/compliance/minimum-wage', authenticate, saudiBankingController.checkMinimumWage);

module.exports = router;
