/**
 * Saudi Banking Integration Controller
 * Handles Lean Technologies, WPS, SADAD, and Mudad operations
 */

const asyncHandler = require('express-async-handler');
const leanTechService = require('../services/leantech.service');
const { WPSService, SARIE_BANK_IDS } = require('../services/wps.service');
const { SADADService, BILLER_CATEGORIES, COMMON_BILLERS } = require('../services/sadad.service');
const { MudadService, GOSI_RATES } = require('../services/mudad.service');

// ============================================
// LEAN TECHNOLOGIES - Bank Account Linking
// ============================================

/**
 * Get supported banks from Lean
 */
const getBanks = asyncHandler(async (req, res) => {
    const banks = await leanTechService.getBanks();
    res.json({
        success: true,
        data: banks,
    });
});

/**
 * Create a Lean customer for bank linking
 */
const createLeanCustomer = asyncHandler(async (req, res) => {
    const { appUserId } = req.body;

    if (!appUserId) {
        return res.status(400).json({
            success: false,
            error: 'appUserId is required',
        });
    }

    const customer = await leanTechService.createCustomer(appUserId);
    res.json({
        success: true,
        data: customer,
    });
});

/**
 * Get customer token for LinkSDK initialization
 */
const getCustomerToken = asyncHandler(async (req, res) => {
    const { customerId } = req.params;

    const token = await leanTechService.getCustomerToken(customerId);
    res.json({
        success: true,
        data: {
            accessToken: token.access_token,
            expiresIn: token.expires_in,
            appToken: process.env.LEAN_APP_TOKEN, // Needed for frontend SDK
        },
    });
});

/**
 * Get connected bank entities for a customer
 */
const getEntities = asyncHandler(async (req, res) => {
    const { customerId } = req.params;

    const entities = await leanTechService.getEntities(customerId);
    res.json({
        success: true,
        data: entities,
    });
});

/**
 * Get accounts for a connected entity
 */
const getAccounts = asyncHandler(async (req, res) => {
    const { entityId } = req.params;

    const accounts = await leanTechService.getAccounts(entityId);
    res.json({
        success: true,
        data: accounts,
    });
});

/**
 * Get account balance
 */
const getBalance = asyncHandler(async (req, res) => {
    const { accountId } = req.params;

    const balance = await leanTechService.getBalance(accountId);
    res.json({
        success: true,
        data: balance,
    });
});

/**
 * Get transactions for an account
 */
const getTransactions = asyncHandler(async (req, res) => {
    const { accountId } = req.params;
    const { page, pageSize, fromDate, toDate } = req.query;

    const transactions = await leanTechService.getTransactions(accountId, {
        page: parseInt(page) || 1,
        pageSize: parseInt(pageSize) || 50,
        fromDate,
        toDate,
    });

    res.json({
        success: true,
        data: transactions,
    });
});

/**
 * Get identity information
 */
const getIdentity = asyncHandler(async (req, res) => {
    const { entityId } = req.params;

    const identity = await leanTechService.getIdentity(entityId);
    res.json({
        success: true,
        data: identity,
    });
});

/**
 * Initiate a payment via Lean
 */
const initiatePayment = asyncHandler(async (req, res) => {
    const { amount, currency, paymentSourceId, paymentDestinationId, description } = req.body;

    if (!amount || !paymentSourceId || !paymentDestinationId) {
        return res.status(400).json({
            success: false,
            error: 'amount, paymentSourceId, and paymentDestinationId are required',
        });
    }

    const payment = await leanTechService.initiatePayment({
        amount,
        currency: currency || 'SAR',
        paymentSourceId,
        paymentDestinationId,
        description,
    });

    res.json({
        success: true,
        data: payment,
    });
});

/**
 * Disconnect a bank entity
 */
const disconnectEntity = asyncHandler(async (req, res) => {
    const { entityId } = req.params;

    await leanTechService.disconnectEntity(entityId);
    res.json({
        success: true,
        message: 'Bank account disconnected successfully',
    });
});

/**
 * Handle Lean webhook
 */
const handleLeanWebhook = asyncHandler(async (req, res) => {
    const signature = req.headers['x-lean-signature'];
    const payload = JSON.stringify(req.body);

    // Verify webhook signature
    if (signature && !leanTechService.verifyWebhookSignature(payload, signature)) {
        return res.status(401).json({ error: 'Invalid signature' });
    }

    const { type, data } = req.body;

    console.log('Lean webhook received:', type, data);

    // Handle different webhook events
    switch (type) {
        case 'entity.created':
            // Bank account connected
            console.log('New bank account connected:', data.entity_id);
            break;
        case 'entity.data.refresh.updated':
            // Data refresh completed
            console.log('Data refresh completed:', data.entity_id);
            break;
        case 'payment.completed':
            // Payment completed
            console.log('Payment completed:', data.payment_intent_id);
            break;
        case 'payment.failed':
            // Payment failed
            console.log('Payment failed:', data.payment_intent_id, data.error);
            break;
        default:
            console.log('Unknown webhook type:', type);
    }

    res.json({ received: true });
});

// ============================================
// WPS - Wage Protection System
// ============================================

/**
 * Generate WPS file
 */
const generateWPSFile = asyncHandler(async (req, res) => {
    const { establishment, employees, paymentDate, batchReference } = req.body;

    if (!establishment || !employees || employees.length === 0) {
        return res.status(400).json({
            success: false,
            error: 'Establishment and employees data are required',
        });
    }

    // Validate establishment
    const estValidation = WPSService.validateEstablishmentData(establishment);
    if (!estValidation.valid) {
        return res.status(400).json({
            success: false,
            errors: estValidation.errors,
        });
    }

    // Validate employees
    const empValidation = WPSService.validateEmployeeData(employees);
    if (!empValidation.valid) {
        return res.status(400).json({
            success: false,
            errors: empValidation.errors,
            warnings: empValidation.warnings,
        });
    }

    // Generate WPS file
    const result = WPSService.generateWPSFile(establishment, employees, {
        paymentDate: paymentDate || new Date(),
        batchReference: batchReference,
    });

    res.json({
        success: true,
        data: {
            filename: result.filename,
            totalRecords: result.totalRecords,
            totalAmount: result.totalAmount,
            batchReference: result.batchReference,
            warnings: empValidation.warnings,
        },
        file: result.content, // Base64 encode for download
    });
});

/**
 * Download WPS file
 */
const downloadWPSFile = asyncHandler(async (req, res) => {
    const { establishment, employees, paymentDate, batchReference } = req.body;

    const result = WPSService.generateWPSFile(establishment, employees, {
        paymentDate: paymentDate || new Date(),
        batchReference,
    });

    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.send(result.content);
});

/**
 * Validate WPS data
 */
const validateWPSData = asyncHandler(async (req, res) => {
    const { establishment, employees } = req.body;

    const estValidation = WPSService.validateEstablishmentData(establishment);
    const empValidation = WPSService.validateEmployeeData(employees);

    res.json({
        success: true,
        establishment: estValidation,
        employees: empValidation,
        isValid: estValidation.valid && empValidation.valid,
    });
});

/**
 * Get SARIE bank IDs
 */
const getSarieBankIds = asyncHandler(async (req, res) => {
    res.json({
        success: true,
        data: SARIE_BANK_IDS,
    });
});

// ============================================
// SADAD - Bill Payments
// ============================================

/**
 * Get SADAD billers
 */
const getSadadBillers = asyncHandler(async (req, res) => {
    const { category } = req.query;

    const billers = await SADADService.getBillers(category);
    res.json({
        success: true,
        data: billers,
        categories: BILLER_CATEGORIES,
    });
});

/**
 * Search billers
 */
const searchBillers = asyncHandler(async (req, res) => {
    const { query } = req.query;

    const billers = await SADADService.searchBillers(query);
    res.json({
        success: true,
        data: billers,
    });
});

/**
 * Inquire about a bill
 */
const inquireBill = asyncHandler(async (req, res) => {
    const { billerCode, billNumber } = req.body;

    if (!billerCode || !billNumber) {
        return res.status(400).json({
            success: false,
            error: 'billerCode and billNumber are required',
        });
    }

    const result = await SADADService.inquireBill(billerCode, billNumber);
    res.json(result);
});

/**
 * Pay a bill via SADAD
 */
const payBill = asyncHandler(async (req, res) => {
    const { billerCode, billNumber, amount, debitAccount, reference, remarks } = req.body;

    const result = await SADADService.payBill({
        billerCode,
        billNumber,
        amount,
        debitAccount,
        reference,
        remarks,
    });

    res.json(result);
});

/**
 * Get payment status
 */
const getSadadPaymentStatus = asyncHandler(async (req, res) => {
    const { transactionId } = req.params;

    const result = await SADADService.getPaymentStatus(transactionId);
    res.json(result);
});

/**
 * Get payment history
 */
const getSadadPaymentHistory = asyncHandler(async (req, res) => {
    const { fromDate, toDate, billerCode, status, page, pageSize } = req.query;

    const result = await SADADService.getPaymentHistory({
        fromDate,
        toDate,
        billerCode,
        status,
        page: parseInt(page) || 1,
        pageSize: parseInt(pageSize) || 20,
    });

    res.json(result);
});

// ============================================
// MUDAD - Payroll Compliance
// ============================================

/**
 * Calculate payroll with GOSI
 */
const calculatePayroll = asyncHandler(async (req, res) => {
    const { employees } = req.body;

    if (!employees || employees.length === 0) {
        return res.status(400).json({
            success: false,
            error: 'Employees data is required',
        });
    }

    const result = MudadService.calculatePayroll(employees);
    res.json({
        success: true,
        data: result,
    });
});

/**
 * Calculate GOSI for single employee
 */
const calculateGOSI = asyncHandler(async (req, res) => {
    const { nationality, basicSalary } = req.body;

    if (!basicSalary) {
        return res.status(400).json({
            success: false,
            error: 'basicSalary is required',
        });
    }

    const result = MudadService.calculateGOSI(
        { nationality: nationality || 'SA' },
        basicSalary
    );

    res.json({
        success: true,
        data: result,
        rates: GOSI_RATES,
    });
});

/**
 * Generate WPS file via Mudad
 */
const generateMudadWPS = asyncHandler(async (req, res) => {
    const { establishment, employees, paymentDate, batchReference } = req.body;

    const result = await MudadService.generateWPSFile(
        establishment,
        employees,
        { paymentDate, batchReference }
    );

    res.json({
        success: true,
        data: result,
    });
});

/**
 * Submit payroll to Mudad
 */
const submitPayroll = asyncHandler(async (req, res) => {
    const { establishment, employees, paymentDate } = req.body;

    const result = await MudadService.submitPayroll({
        establishment,
        employees,
        paymentDate,
        summary: MudadService.calculatePayroll(employees).summary,
    });

    res.json(result);
});

/**
 * Get payroll submission status
 */
const getSubmissionStatus = asyncHandler(async (req, res) => {
    const { submissionId } = req.params;

    const result = await MudadService.getSubmissionStatus(submissionId);
    res.json({
        success: true,
        data: result,
    });
});

/**
 * Generate GOSI report
 */
const generateGOSIReport = asyncHandler(async (req, res) => {
    const { employees, month } = req.body;

    const report = MudadService.generateGOSIReport(employees, month);
    res.json({
        success: true,
        data: report,
    });
});

/**
 * Check Nitaqat (Saudization) compliance
 */
const checkNitaqat = asyncHandler(async (req, res) => {
    const { employees } = req.body;

    const result = MudadService.calculateNitaqat(employees);
    res.json({
        success: true,
        data: result,
    });
});

/**
 * Check minimum wage compliance
 */
const checkMinimumWage = asyncHandler(async (req, res) => {
    const { employees } = req.body;

    const result = MudadService.checkMinimumWageCompliance(employees);
    res.json({
        success: true,
        data: result,
    });
});

module.exports = {
    // Lean Technologies
    getBanks,
    createLeanCustomer,
    getCustomerToken,
    getEntities,
    getAccounts,
    getBalance,
    getTransactions,
    getIdentity,
    initiatePayment,
    disconnectEntity,
    handleLeanWebhook,

    // WPS
    generateWPSFile,
    downloadWPSFile,
    validateWPSData,
    getSarieBankIds,

    // SADAD
    getSadadBillers,
    searchBillers,
    inquireBill,
    payBill,
    getSadadPaymentStatus,
    getSadadPaymentHistory,

    // Mudad
    calculatePayroll,
    calculateGOSI,
    generateMudadWPS,
    submitPayroll,
    getSubmissionStatus,
    generateGOSIReport,
    checkNitaqat,
    checkMinimumWage,
};
