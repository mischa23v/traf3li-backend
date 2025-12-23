/**
 * Saudi Banking Integration Controller
 * Handles Lean Technologies, WPS, SADAD, and Mudad operations
 */

const asyncHandler = require('express-async-handler');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');
const leanTechService = require('../services/leantech.service');
const { WPSService, SARIE_BANK_IDS } = require('../services/wps.service');
const { SADADService, BILLER_CATEGORIES, COMMON_BILLERS } = require('../services/sadad.service');
const { MudadService, GOSI_RATES } = require('../services/mudad.service');
const mongoose = require('mongoose');

// ============================================
// VALIDATION HELPERS
// ============================================

/**
 * Validate Saudi IBAN format (SA + 22 digits)
 */
const validateSaudiIBAN = (iban) => {
    if (!iban) return { valid: false, message: 'IBAN is required' };
    const ibanRegex = /^SA\d{22}$/;
    if (!ibanRegex.test(iban)) {
        return { valid: false, message: 'Invalid Saudi IBAN format. Must be SA followed by 22 digits' };
    }
    return { valid: true };
};

/**
 * Validate Saudi VAT number (15 digits)
 */
const validateSaudiVAT = (vat) => {
    if (!vat) return { valid: false, message: 'VAT number is required' };
    const vatRegex = /^\d{15}$/;
    if (!vatRegex.test(vat)) {
        return { valid: false, message: 'Invalid Saudi VAT number. Must be 15 digits' };
    }
    return { valid: true };
};

/**
 * Validate amount
 */
const validateAmount = (amount) => {
    if (!amount) return { valid: false, message: 'Amount is required' };
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
        return { valid: false, message: 'Amount must be a positive number' };
    }
    if (parsedAmount > 999999999.99) {
        return { valid: false, message: 'Amount exceeds maximum allowed value' };
    }
    return { valid: true, amount: parsedAmount };
};

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
 * Get all Lean customers for the authenticated user
 */
const getLeanCustomers = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const { page = 1, limit = 20 } = req.query;

    // In a production system, you would store customer mappings in the database
    // For now, we return a placeholder response indicating how this would work
    // The actual customer data comes from Lean's API when you have the customer IDs stored

    // This endpoint would typically:
    // 1. Query your database for stored Lean customer IDs for this user
    // 2. Optionally fetch additional details from Lean API for each customer

    res.json({
        success: true,
        data: {
            customers: [],
            message: 'Customer data should be stored in your database when created via POST /lean/customers',
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: 0,
                pages: 0
            }
        },
    });
});

/**
 * Create a Lean customer for bank linking
 */
const createLeanCustomer = asyncHandler(async (req, res) => {
    const allowedFields = ['appUserId', 'firmId'];
    const sanitized = pickAllowedFields(req.body, allowedFields);

    if (!sanitized.appUserId) {
        return res.status(400).json({
            success: false,
            error: 'appUserId is required',
        });
    }

    // Verify firmId ownership
    const firmId = sanitized.firmId || req.user?.firmId;
    if (!firmId) {
        return res.status(403).json({
            success: false,
            error: 'Firm ID is required',
        });
    }

    const customer = await leanTechService.createCustomer(sanitized.appUserId, firmId);
    res.json({
        success: true,
        data: customer,
    });
});

/**
 * Get customer token for LinkSDK initialization
 */
const getCustomerToken = asyncHandler(async (req, res) => {
    const customerId = sanitizeObjectId(req.params.customerId);
    if (!customerId) {
        return res.status(400).json({
            success: false,
            error: 'Invalid customer ID',
        });
    }

    // Verify firmId ownership
    const firmId = req.user?.firmId;
    if (!firmId) {
        return res.status(403).json({
            success: false,
            error: 'Firm ID is required',
        });
    }

    const token = await leanTechService.getCustomerToken(customerId, firmId);
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
    const customerId = sanitizeObjectId(req.params.customerId);
    if (!customerId) {
        return res.status(400).json({
            success: false,
            error: 'Invalid customer ID',
        });
    }

    // Verify firmId ownership
    const firmId = req.user?.firmId;
    if (!firmId) {
        return res.status(403).json({
            success: false,
            error: 'Firm ID is required',
        });
    }

    const entities = await leanTechService.getEntities(customerId, firmId);
    res.json({
        success: true,
        data: entities,
    });
});

/**
 * Get accounts for a connected entity
 */
const getAccounts = asyncHandler(async (req, res) => {
    const entityId = sanitizeObjectId(req.params.entityId);
    if (!entityId) {
        return res.status(400).json({
            success: false,
            error: 'Invalid entity ID',
        });
    }

    // Verify firmId ownership
    const firmId = req.user?.firmId;
    if (!firmId) {
        return res.status(403).json({
            success: false,
            error: 'Firm ID is required',
        });
    }

    const accounts = await leanTechService.getAccounts(entityId, firmId);
    res.json({
        success: true,
        data: accounts,
    });
});

/**
 * Get account balance
 */
const getBalance = asyncHandler(async (req, res) => {
    const accountId = sanitizeObjectId(req.params.accountId);
    if (!accountId) {
        return res.status(400).json({
            success: false,
            error: 'Invalid account ID',
        });
    }

    // Verify firmId ownership
    const firmId = req.user?.firmId;
    if (!firmId) {
        return res.status(403).json({
            success: false,
            error: 'Firm ID is required',
        });
    }

    const balance = await leanTechService.getBalance(accountId, firmId);
    res.json({
        success: true,
        data: balance,
    });
});

/**
 * Get transactions for an account
 */
const getTransactions = asyncHandler(async (req, res) => {
    const accountId = sanitizeObjectId(req.params.accountId);
    if (!accountId) {
        return res.status(400).json({
            success: false,
            error: 'Invalid account ID',
        });
    }

    // Verify firmId ownership
    const firmId = req.user?.firmId;
    if (!firmId) {
        return res.status(403).json({
            success: false,
            error: 'Firm ID is required',
        });
    }

    const { page, pageSize, fromDate, toDate } = req.query;

    const transactions = await leanTechService.getTransactions(accountId, {
        page: parseInt(page) || 1,
        pageSize: parseInt(pageSize) || 50,
        fromDate,
        toDate,
    }, firmId);

    res.json({
        success: true,
        data: transactions,
    });
});

/**
 * Get identity information
 */
const getIdentity = asyncHandler(async (req, res) => {
    const entityId = sanitizeObjectId(req.params.entityId);
    if (!entityId) {
        return res.status(400).json({
            success: false,
            error: 'Invalid entity ID',
        });
    }

    // Verify firmId ownership
    const firmId = req.user?.firmId;
    if (!firmId) {
        return res.status(403).json({
            success: false,
            error: 'Firm ID is required',
        });
    }

    const identity = await leanTechService.getIdentity(entityId, firmId);
    res.json({
        success: true,
        data: identity,
    });
});

/**
 * Initiate a payment via Lean
 */
const initiatePayment = asyncHandler(async (req, res) => {
    const allowedFields = ['amount', 'currency', 'paymentSourceId', 'paymentDestinationId', 'description', 'firmId'];
    const sanitized = pickAllowedFields(req.body, allowedFields);

    // Verify firmId ownership
    const firmId = sanitized.firmId || req.user?.firmId;
    if (!firmId) {
        return res.status(403).json({
            success: false,
            error: 'Firm ID is required',
        });
    }

    // Validate required fields
    if (!sanitized.amount || !sanitized.paymentSourceId || !sanitized.paymentDestinationId) {
        return res.status(400).json({
            success: false,
            error: 'amount, paymentSourceId, and paymentDestinationId are required',
        });
    }

    // Validate amount
    const amountValidation = validateAmount(sanitized.amount);
    if (!amountValidation.valid) {
        return res.status(400).json({
            success: false,
            error: amountValidation.message,
        });
    }

    // Sanitize IDs
    const paymentSourceId = sanitizeObjectId(sanitized.paymentSourceId);
    const paymentDestinationId = sanitizeObjectId(sanitized.paymentDestinationId);

    if (!paymentSourceId || !paymentDestinationId) {
        return res.status(400).json({
            success: false,
            error: 'Invalid payment source or destination ID',
        });
    }

    // Use MongoDB transaction for financial operation
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const payment = await leanTechService.initiatePayment({
            amount: amountValidation.amount,
            currency: sanitized.currency || 'SAR',
            paymentSourceId,
            paymentDestinationId,
            description: sanitized.description,
            firmId,
        }, session);

        await session.commitTransaction();

        res.json({
            success: true,
            data: payment,
        });
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
});

/**
 * Disconnect a bank entity
 */
const disconnectEntity = asyncHandler(async (req, res) => {
    const entityId = sanitizeObjectId(req.params.entityId);
    if (!entityId) {
        return res.status(400).json({
            success: false,
            error: 'Invalid entity ID',
        });
    }

    // Verify firmId ownership
    const firmId = req.user?.firmId;
    if (!firmId) {
        return res.status(403).json({
            success: false,
            error: 'Firm ID is required',
        });
    }

    await leanTechService.disconnectEntity(entityId, firmId);
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
    const allowedFields = ['establishment', 'employees', 'paymentDate', 'batchReference', 'firmId'];
    const sanitized = pickAllowedFields(req.body, allowedFields);

    // Verify firmId ownership
    const firmId = sanitized.firmId || req.user?.firmId;
    if (!firmId) {
        return res.status(403).json({
            success: false,
            error: 'Firm ID is required',
        });
    }

    if (!sanitized.establishment || !sanitized.employees || sanitized.employees.length === 0) {
        return res.status(400).json({
            success: false,
            error: 'Establishment and employees data are required',
        });
    }

    // Validate establishment IBAN if provided
    if (sanitized.establishment.iban) {
        const ibanValidation = validateSaudiIBAN(sanitized.establishment.iban);
        if (!ibanValidation.valid) {
            return res.status(400).json({
                success: false,
                error: ibanValidation.message,
            });
        }
    }

    // Validate establishment
    const estValidation = WPSService.validateEstablishmentData(sanitized.establishment);
    if (!estValidation.valid) {
        return res.status(400).json({
            success: false,
            errors: estValidation.errors,
        });
    }

    // Validate employees
    const empValidation = WPSService.validateEmployeeData(sanitized.employees);
    if (!empValidation.valid) {
        return res.status(400).json({
            success: false,
            errors: empValidation.errors,
            warnings: empValidation.warnings,
        });
    }

    // Validate employee IBANs and amounts
    for (const employee of sanitized.employees) {
        if (employee.iban) {
            const ibanValidation = validateSaudiIBAN(employee.iban);
            if (!ibanValidation.valid) {
                return res.status(400).json({
                    success: false,
                    error: `Employee ${employee.name || 'unknown'}: ${ibanValidation.message}`,
                });
            }
        }

        if (employee.amount) {
            const amountValidation = validateAmount(employee.amount);
            if (!amountValidation.valid) {
                return res.status(400).json({
                    success: false,
                    error: `Employee ${employee.name || 'unknown'}: ${amountValidation.message}`,
                });
            }
        }
    }

    // Generate WPS file
    const result = WPSService.generateWPSFile(sanitized.establishment, sanitized.employees, {
        paymentDate: sanitized.paymentDate || new Date(),
        batchReference: sanitized.batchReference,
        firmId,
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
    const allowedFields = ['establishment', 'employees', 'paymentDate', 'batchReference', 'firmId'];
    const sanitized = pickAllowedFields(req.body, allowedFields);

    // Verify firmId ownership
    const firmId = sanitized.firmId || req.user?.firmId;
    if (!firmId) {
        return res.status(403).json({
            success: false,
            error: 'Firm ID is required',
        });
    }

    const result = WPSService.generateWPSFile(sanitized.establishment, sanitized.employees, {
        paymentDate: sanitized.paymentDate || new Date(),
        batchReference: sanitized.batchReference,
        firmId,
    });

    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.send(result.content);
});

/**
 * Validate WPS data
 */
const validateWPSData = asyncHandler(async (req, res) => {
    const allowedFields = ['establishment', 'employees', 'firmId'];
    const sanitized = pickAllowedFields(req.body, allowedFields);

    // Verify firmId ownership
    const firmId = sanitized.firmId || req.user?.firmId;
    if (!firmId) {
        return res.status(403).json({
            success: false,
            error: 'Firm ID is required',
        });
    }

    const estValidation = WPSService.validateEstablishmentData(sanitized.establishment);
    const empValidation = WPSService.validateEmployeeData(sanitized.employees);

    res.json({
        success: true,
        establishment: estValidation,
        employees: empValidation,
        isValid: estValidation.valid && empValidation.valid,
    });
});

/**
 * Get list of generated WPS files
 */
const getWPSFiles = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const { page = 1, limit = 20, startDate, endDate, status } = req.query;

    // In a production system, you would store WPS file generation records in the database
    // This endpoint returns the history of generated WPS files
    // Each record would include: filename, generatedAt, totalRecords, totalAmount, status, etc.

    // For now, return placeholder response indicating the expected structure
    res.json({
        success: true,
        data: {
            files: [],
            message: 'WPS file records should be stored in the database when generated via POST /wps/generate',
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: 0,
                pages: 0
            }
        },
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
    const allowedFields = ['billerCode', 'billNumber', 'firmId'];
    const sanitized = pickAllowedFields(req.body, allowedFields);

    // Verify firmId ownership
    const firmId = sanitized.firmId || req.user?.firmId;
    if (!firmId) {
        return res.status(403).json({
            success: false,
            error: 'Firm ID is required',
        });
    }

    if (!sanitized.billerCode || !sanitized.billNumber) {
        return res.status(400).json({
            success: false,
            error: 'billerCode and billNumber are required',
        });
    }

    const result = await SADADService.inquireBill(sanitized.billerCode, sanitized.billNumber, firmId);
    res.json(result);
});

/**
 * Pay a bill via SADAD
 */
const payBill = asyncHandler(async (req, res) => {
    const allowedFields = ['billerCode', 'billNumber', 'amount', 'debitAccount', 'reference', 'remarks', 'firmId'];
    const sanitized = pickAllowedFields(req.body, allowedFields);

    // Verify firmId ownership
    const firmId = sanitized.firmId || req.user?.firmId;
    if (!firmId) {
        return res.status(403).json({
            success: false,
            error: 'Firm ID is required',
        });
    }

    // Validate required fields
    if (!sanitized.billerCode || !sanitized.billNumber || !sanitized.amount || !sanitized.debitAccount) {
        return res.status(400).json({
            success: false,
            error: 'billerCode, billNumber, amount, and debitAccount are required',
        });
    }

    // Validate amount
    const amountValidation = validateAmount(sanitized.amount);
    if (!amountValidation.valid) {
        return res.status(400).json({
            success: false,
            error: amountValidation.message,
        });
    }

    // Validate debit account IBAN if it's in Saudi format
    if (sanitized.debitAccount && sanitized.debitAccount.startsWith('SA')) {
        const ibanValidation = validateSaudiIBAN(sanitized.debitAccount);
        if (!ibanValidation.valid) {
            return res.status(400).json({
                success: false,
                error: ibanValidation.message,
            });
        }
    }

    // Use MongoDB transaction for financial operation
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const result = await SADADService.payBill({
            billerCode: sanitized.billerCode,
            billNumber: sanitized.billNumber,
            amount: amountValidation.amount,
            debitAccount: sanitized.debitAccount,
            reference: sanitized.reference,
            remarks: sanitized.remarks,
            firmId,
        }, session);

        await session.commitTransaction();
        res.json(result);
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
});

/**
 * Get payment status
 */
const getSadadPaymentStatus = asyncHandler(async (req, res) => {
    const transactionId = sanitizeObjectId(req.params.transactionId);
    if (!transactionId) {
        return res.status(400).json({
            success: false,
            error: 'Invalid transaction ID',
        });
    }

    // Verify firmId ownership
    const firmId = req.user?.firmId;
    if (!firmId) {
        return res.status(403).json({
            success: false,
            error: 'Firm ID is required',
        });
    }

    const result = await SADADService.getPaymentStatus(transactionId, firmId);
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
    const allowedFields = ['employees', 'firmId'];
    const sanitized = pickAllowedFields(req.body, allowedFields);

    // Verify firmId ownership
    const firmId = sanitized.firmId || req.user?.firmId;
    if (!firmId) {
        return res.status(403).json({
            success: false,
            error: 'Firm ID is required',
        });
    }

    if (!sanitized.employees || sanitized.employees.length === 0) {
        return res.status(400).json({
            success: false,
            error: 'Employees data is required',
        });
    }

    // Validate employee amounts
    for (const employee of sanitized.employees) {
        if (employee.basicSalary) {
            const amountValidation = validateAmount(employee.basicSalary);
            if (!amountValidation.valid) {
                return res.status(400).json({
                    success: false,
                    error: `Employee ${employee.name || 'unknown'}: Basic salary - ${amountValidation.message}`,
                });
            }
        }
    }

    const result = MudadService.calculatePayroll(sanitized.employees, firmId);
    res.json({
        success: true,
        data: result,
    });
});

/**
 * Calculate GOSI for single employee
 */
const calculateGOSI = asyncHandler(async (req, res) => {
    const allowedFields = ['nationality', 'basicSalary', 'firmId'];
    const sanitized = pickAllowedFields(req.body, allowedFields);

    // Verify firmId ownership
    const firmId = sanitized.firmId || req.user?.firmId;
    if (!firmId) {
        return res.status(403).json({
            success: false,
            error: 'Firm ID is required',
        });
    }

    if (!sanitized.basicSalary) {
        return res.status(400).json({
            success: false,
            error: 'basicSalary is required',
        });
    }

    // Validate amount
    const amountValidation = validateAmount(sanitized.basicSalary);
    if (!amountValidation.valid) {
        return res.status(400).json({
            success: false,
            error: amountValidation.message,
        });
    }

    const result = MudadService.calculateGOSI(
        { nationality: sanitized.nationality || 'SA' },
        amountValidation.amount
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
    const allowedFields = ['establishment', 'employees', 'paymentDate', 'batchReference', 'firmId'];
    const sanitized = pickAllowedFields(req.body, allowedFields);

    // Verify firmId ownership
    const firmId = sanitized.firmId || req.user?.firmId;
    if (!firmId) {
        return res.status(403).json({
            success: false,
            error: 'Firm ID is required',
        });
    }

    const result = await MudadService.generateWPSFile(
        sanitized.establishment,
        sanitized.employees,
        {
            paymentDate: sanitized.paymentDate,
            batchReference: sanitized.batchReference,
            firmId
        }
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
    const allowedFields = ['establishment', 'employees', 'paymentDate', 'firmId'];
    const sanitized = pickAllowedFields(req.body, allowedFields);

    // Verify firmId ownership
    const firmId = sanitized.firmId || req.user?.firmId;
    if (!firmId) {
        return res.status(403).json({
            success: false,
            error: 'Firm ID is required',
        });
    }

    // Use MongoDB transaction for financial operation
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const result = await MudadService.submitPayroll({
            establishment: sanitized.establishment,
            employees: sanitized.employees,
            paymentDate: sanitized.paymentDate,
            summary: MudadService.calculatePayroll(sanitized.employees, firmId).summary,
            firmId,
        }, session);

        await session.commitTransaction();
        res.json(result);
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
});

/**
 * Get payroll submission status
 */
const getSubmissionStatus = asyncHandler(async (req, res) => {
    const submissionId = sanitizeObjectId(req.params.submissionId);
    if (!submissionId) {
        return res.status(400).json({
            success: false,
            error: 'Invalid submission ID',
        });
    }

    // Verify firmId ownership
    const firmId = req.user?.firmId;
    if (!firmId) {
        return res.status(403).json({
            success: false,
            error: 'Firm ID is required',
        });
    }

    const result = await MudadService.getSubmissionStatus(submissionId, firmId);
    res.json({
        success: true,
        data: result,
    });
});

/**
 * Generate GOSI report
 */
const generateGOSIReport = asyncHandler(async (req, res) => {
    const allowedFields = ['employees', 'month', 'firmId'];
    const sanitized = pickAllowedFields(req.body, allowedFields);

    // Verify firmId ownership
    const firmId = sanitized.firmId || req.user?.firmId;
    if (!firmId) {
        return res.status(403).json({
            success: false,
            error: 'Firm ID is required',
        });
    }

    const report = MudadService.generateGOSIReport(sanitized.employees, sanitized.month, firmId);
    res.json({
        success: true,
        data: report,
    });
});

/**
 * Check Nitaqat (Saudization) compliance
 */
const checkNitaqat = asyncHandler(async (req, res) => {
    const allowedFields = ['employees', 'firmId'];
    const sanitized = pickAllowedFields(req.body, allowedFields);

    // Verify firmId ownership
    const firmId = sanitized.firmId || req.user?.firmId;
    if (!firmId) {
        return res.status(403).json({
            success: false,
            error: 'Firm ID is required',
        });
    }

    const result = MudadService.calculateNitaqat(sanitized.employees, firmId);
    res.json({
        success: true,
        data: result,
    });
});

/**
 * Check minimum wage compliance
 */
const checkMinimumWage = asyncHandler(async (req, res) => {
    const allowedFields = ['employees', 'firmId'];
    const sanitized = pickAllowedFields(req.body, allowedFields);

    // Verify firmId ownership
    const firmId = sanitized.firmId || req.user?.firmId;
    if (!firmId) {
        return res.status(403).json({
            success: false,
            error: 'Firm ID is required',
        });
    }

    const result = MudadService.checkMinimumWageCompliance(sanitized.employees, firmId);
    res.json({
        success: true,
        data: result,
    });
});

module.exports = {
    // Lean Technologies
    getBanks,
    getLeanCustomers,
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
    getWPSFiles,
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
