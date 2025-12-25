/**
 * Policy Check Middleware
 *
 * Enforces expense policies, invoice policies, payment policies, and budget controls
 * before entities are saved. Provides flexible violation handling:
 * - Block critical violations
 * - Attach warnings for review
 * - Log all policy checks for compliance
 *
 * Usage:
 *   router.post('/expenses', authenticate, checkExpensePolicy, createExpense);
 *   router.post('/invoices', authenticate, checkInvoicePolicy, createInvoice);
 *   router.post('/payments', authenticate, checkPaymentPolicy, createPayment);
 *
 * Dry Run Mode:
 *   Add ?dryRun=true to test policy checks without blocking
 */

const logger = require('../utils/logger');
const ExpensePolicy = require('../models/expensePolicy.model');
const Budget = require('../models/budget.model');

/**
 * Extract firm context from request
 * @param {object} req - Express request
 * @returns {object} Context object
 */
const extractContext = (req) => {
    return {
        firmId: req.firmId || req.user?.firmId || null,
        userId: req.user?._id || req.user?.id || null,
        userRole: req.user?.role || null,
        userDepartment: req.user?.department || null,
        ipAddress: req.ip || req.headers['x-forwarded-for']?.split(',')[0] || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
        requestPath: req.originalUrl || req.url,
        requestMethod: req.method
    };
};

/**
 * Check if dry run mode is enabled
 * @param {object} req - Express request
 * @returns {boolean}
 */
const isDryRun = (req) => {
    return req.query.dryRun === 'true' || req.query.dryRun === '1' || req.body.dryRun === true;
};

/**
 * Log policy check result
 * @param {object} context - Request context
 * @param {string} entityType - Type of entity being checked
 * @param {object} result - Check result
 */
const logPolicyCheck = (context, entityType, result) => {
    const logLevel = result.blocked ? 'warn' : 'info';

    logger[logLevel]('Policy check performed', {
        entityType,
        firmId: context.firmId,
        userId: context.userId,
        compliant: result.compliant,
        violationCount: result.violations?.length || 0,
        warningCount: result.warnings?.length || 0,
        blocked: result.blocked || false,
        dryRun: result.dryRun || false,
        timestamp: new Date()
    });
};

/**
 * Determine severity level of violation
 * @param {object} violation - Violation object
 * @returns {string} Severity level: 'critical', 'high', 'medium', 'low'
 */
const getViolationSeverity = (violation) => {
    const criticalTypes = [
        'single_transaction_limit',
        'budget_exceeded',
        'hard_limit_exceeded',
        'unauthorized_category'
    ];

    const highTypes = [
        'category_limit',
        'preapproval_required',
        'budget_warning_exceeded',
        'insufficient_funds'
    ];

    const mediumTypes = [
        'receipt_required',
        'justification_required',
        'approval_required'
    ];

    if (criticalTypes.includes(violation.type)) {
        return 'critical';
    } else if (highTypes.includes(violation.type)) {
        return 'high';
    } else if (mediumTypes.includes(violation.type)) {
        return 'medium';
    }

    return 'low';
};

/**
 * Middleware for expense creation/update - Check against expense policies
 * @param {object} req - Express request
 * @param {object} res - Express response
 * @param {function} next - Next middleware
 */
const checkExpensePolicy = async (req, res, next) => {
    try {
        const context = extractContext(req);
        const dryRun = isDryRun(req);

        // Skip if no firm context (solo lawyers without policies)
        if (!context.firmId && !context.userId) {
            return next();
        }

        // Extract expense data from request body
        const expenseData = req.body;

        // Get applicable policy for user
        const policy = await ExpensePolicy.getApplicablePolicy(
            context.firmId,
            null, // lawyerId
            context.userId,
            context.userRole,
            context.userDepartment
        );

        // If no policy exists, allow operation
        if (!policy) {
            logger.debug('No expense policy found, allowing operation', { firmId: context.firmId });
            return next();
        }

        // Check compliance against policy
        const complianceResult = await policy.checkCompliance(expenseData, context.userId);

        // Separate violations by severity
        const criticalViolations = complianceResult.violations.filter(v =>
            ['critical', 'high'].includes(getViolationSeverity(v))
        );
        const warnings = complianceResult.violations.filter(v =>
            ['medium', 'low'].includes(getViolationSeverity(v))
        );

        // Prepare result
        const result = {
            compliant: complianceResult.compliant,
            violations: complianceResult.violations,
            warnings: complianceResult.warnings || warnings,
            criticalViolations,
            requiresApproval: complianceResult.requiresApproval,
            autoApprove: complianceResult.autoApprove,
            blocked: criticalViolations.length > 0 && !dryRun,
            dryRun,
            policyId: policy._id,
            policyName: policy.name
        };

        // Log the check
        logPolicyCheck(context, 'expense', result);

        // Attach result to request for controller use
        req.policyCheck = result;

        // If dry run, always proceed (for testing)
        if (dryRun) {
            logger.info('Policy check - dry run mode, proceeding despite violations', {
                violationCount: result.violations.length
            });
            return next();
        }

        // Block if critical violations exist
        if (criticalViolations.length > 0) {
            return res.status(403).json({
                success: false,
                error: 'Policy violation',
                message: 'المصروف يخالف سياسة المصروفات',
                messageEn: 'Expense violates expense policy',
                violations: criticalViolations,
                warnings: warnings,
                policyId: policy._id,
                policyName: policy.name,
                code: 'EXPENSE_POLICY_VIOLATION'
            });
        }

        // If warnings only, attach to request for controller to handle
        if (warnings.length > 0) {
            logger.info('Expense has policy warnings, proceeding with warnings', {
                warningCount: warnings.length
            });
        }

        next();
    } catch (error) {
        logger.error('Expense policy check error:', error);
        // Don't block on error, log and continue
        next();
    }
};

/**
 * Middleware for invoice operations - Check policies and budgets
 * @param {object} req - Express request
 * @param {object} res - Express response
 * @param {function} next - Next middleware
 */
const checkInvoicePolicy = async (req, res, next) => {
    try {
        const context = extractContext(req);
        const dryRun = isDryRun(req);

        // Skip if no firm context
        if (!context.firmId) {
            return next();
        }

        const invoiceData = req.body;
        const violations = [];
        const warnings = [];

        // Check if invoice is linked to a budget-controlled matter/case
        if (invoiceData.caseId) {
            // Check budget constraints for the case
            const budgetCheck = await checkCaseBudget(
                context.firmId,
                invoiceData.caseId,
                invoiceData.totalAmount || 0
            );

            if (budgetCheck.exceeded) {
                violations.push({
                    type: 'budget_exceeded',
                    message: `Invoice exceeds case budget. Budget: ${budgetCheck.budgeted}, Used: ${budgetCheck.used}, Remaining: ${budgetCheck.remaining}`,
                    messageAr: `الفاتورة تتجاوز ميزانية القضية`,
                    severity: 'critical',
                    budgetInfo: budgetCheck
                });
            } else if (budgetCheck.nearLimit) {
                warnings.push({
                    type: 'budget_warning',
                    message: `Invoice approaches case budget limit (${budgetCheck.percentUsed}% used)`,
                    messageAr: `الفاتورة تقترب من حد الميزانية`,
                    severity: 'medium',
                    budgetInfo: budgetCheck
                });
            }
        }

        // Prepare result
        const result = {
            compliant: violations.length === 0,
            violations,
            warnings,
            blocked: violations.length > 0 && !dryRun,
            dryRun
        };

        // Log the check
        logPolicyCheck(context, 'invoice', result);

        // Attach to request
        req.policyCheck = result;

        // Dry run mode
        if (dryRun) {
            logger.info('Invoice policy check - dry run mode', { violationCount: violations.length });
            return next();
        }

        // Block on violations
        if (violations.length > 0) {
            return res.status(403).json({
                success: false,
                error: 'Policy violation',
                message: 'الفاتورة تخالف سياسات الميزانية',
                messageEn: 'Invoice violates budget policies',
                violations,
                warnings,
                code: 'INVOICE_POLICY_VIOLATION'
            });
        }

        // Proceed with warnings
        if (warnings.length > 0) {
            logger.info('Invoice has policy warnings', { warningCount: warnings.length });
        }

        next();
    } catch (error) {
        logger.error('Invoice policy check error:', error);
        next();
    }
};

/**
 * Middleware for payment operations - Check payment policies
 * @param {object} req - Express request
 * @param {object} res - Express response
 * @param {function} next - Next middleware
 */
const checkPaymentPolicy = async (req, res, next) => {
    try {
        const context = extractContext(req);
        const dryRun = isDryRun(req);

        // Skip if no firm context
        if (!context.firmId) {
            return next();
        }

        const paymentData = req.body;
        const violations = [];
        const warnings = [];

        // Check payment amount limits
        if (paymentData.amount) {
            // Check if payment exceeds daily/monthly limits
            const limitCheck = await checkPaymentLimits(
                context.firmId,
                context.userId,
                paymentData.amount,
                paymentData.paymentMethod
            );

            if (limitCheck.exceeded) {
                violations.push({
                    type: 'payment_limit_exceeded',
                    message: `Payment exceeds ${limitCheck.limitType} limit`,
                    messageAr: `المدفوعة تتجاوز الحد المسموح`,
                    severity: 'high',
                    limitInfo: limitCheck
                });
            }
        }

        // Check for duplicate payments (fraud prevention)
        if (paymentData.invoiceId && paymentData.amount) {
            const duplicateCheck = await checkDuplicatePayment(
                paymentData.invoiceId,
                paymentData.amount,
                context.userId
            );

            if (duplicateCheck.isDuplicate) {
                warnings.push({
                    type: 'duplicate_payment_warning',
                    message: 'Similar payment detected recently',
                    messageAr: 'تم اكتشاف دفعة مشابهة مؤخراً',
                    severity: 'medium',
                    duplicateInfo: duplicateCheck
                });
            }
        }

        // Prepare result
        const result = {
            compliant: violations.length === 0,
            violations,
            warnings,
            blocked: violations.length > 0 && !dryRun,
            dryRun
        };

        // Log the check
        logPolicyCheck(context, 'payment', result);

        // Attach to request
        req.policyCheck = result;

        // Dry run mode
        if (dryRun) {
            logger.info('Payment policy check - dry run mode', { violationCount: violations.length });
            return next();
        }

        // Block on violations
        if (violations.length > 0) {
            return res.status(403).json({
                success: false,
                error: 'Policy violation',
                message: 'المدفوعة تخالف سياسات الدفع',
                messageEn: 'Payment violates payment policies',
                violations,
                warnings,
                code: 'PAYMENT_POLICY_VIOLATION'
            });
        }

        // Proceed with warnings
        if (warnings.length > 0) {
            logger.info('Payment has policy warnings', { warningCount: warnings.length });
        }

        next();
    } catch (error) {
        logger.error('Payment policy check error:', error);
        next();
    }
};

/**
 * Middleware for budget-impacting operations
 * @param {object} req - Express request
 * @param {object} res - Express response
 * @param {function} next - Next middleware
 */
const checkBudgetPolicy = async (req, res, next) => {
    try {
        const context = extractContext(req);
        const dryRun = isDryRun(req);

        // Skip if no firm context
        if (!context.firmId) {
            return next();
        }

        const data = req.body;
        const violations = [];
        const warnings = [];

        // Determine budget impact based on request data
        const budgetImpact = {
            accountId: data.accountId || data.debitAccountId || data.creditAccountId,
            amount: data.amount || data.totalAmount || 0,
            departmentId: data.departmentId,
            costCenterId: data.costCenterId
        };

        // Check if budget exists and if operation exceeds budget
        if (budgetImpact.accountId && budgetImpact.amount > 0) {
            const budgetCheck = await checkAccountBudget(
                context.firmId,
                budgetImpact.accountId,
                budgetImpact.amount,
                budgetImpact.departmentId,
                budgetImpact.costCenterId
            );

            if (budgetCheck.exceeded) {
                violations.push({
                    type: 'budget_exceeded',
                    message: `Operation exceeds budget for account ${budgetCheck.accountCode}`,
                    messageAr: 'العملية تتجاوز الميزانية المخصصة',
                    severity: 'critical',
                    budgetInfo: budgetCheck
                });
            } else if (budgetCheck.nearLimit) {
                warnings.push({
                    type: 'budget_warning',
                    message: `Operation approaches budget limit (${budgetCheck.percentUsed}% used)`,
                    messageAr: 'العملية تقترب من حد الميزانية',
                    severity: 'medium',
                    budgetInfo: budgetCheck
                });
            }
        }

        // Prepare result
        const result = {
            compliant: violations.length === 0,
            violations,
            warnings,
            blocked: violations.length > 0 && !dryRun,
            dryRun
        };

        // Log the check
        logPolicyCheck(context, 'budget', result);

        // Attach to request
        req.policyCheck = result;

        // Dry run mode
        if (dryRun) {
            logger.info('Budget policy check - dry run mode', { violationCount: violations.length });
            return next();
        }

        // Block on violations
        if (violations.length > 0) {
            return res.status(403).json({
                success: false,
                error: 'Budget violation',
                message: 'العملية تتجاوز الميزانية المتاحة',
                messageEn: 'Operation exceeds available budget',
                violations,
                warnings,
                code: 'BUDGET_POLICY_VIOLATION'
            });
        }

        // Proceed with warnings
        if (warnings.length > 0) {
            logger.info('Budget operation has warnings', { warningCount: warnings.length });
        }

        next();
    } catch (error) {
        logger.error('Budget policy check error:', error);
        next();
    }
};

// ============ HELPER FUNCTIONS ============

/**
 * Check budget for a specific case/matter
 * @param {string} firmId - Firm ID
 * @param {string} caseId - Case ID
 * @param {number} amount - Amount to check
 * @returns {Promise<object>} Budget check result
 */
async function checkCaseBudget(firmId, caseId, amount) {
    try {
        // This is a placeholder - implement based on your case/matter budget model
        // You may need to query Case model for budget information
        const Case = require('../models/case.model');
        const caseDoc = await Case.findById(caseId).select('budget budgetUsed').lean();

        if (!caseDoc || !caseDoc.budget) {
            return { exceeded: false, nearLimit: false };
        }

        const budgeted = caseDoc.budget || 0;
        const used = caseDoc.budgetUsed || 0;
        const remaining = budgeted - used;
        const afterAmount = used + amount;
        const percentUsed = budgeted > 0 ? (afterAmount / budgeted) * 100 : 0;

        return {
            exceeded: afterAmount > budgeted,
            nearLimit: percentUsed >= 80 && percentUsed < 100,
            budgeted,
            used,
            remaining,
            afterAmount,
            percentUsed: percentUsed.toFixed(2)
        };
    } catch (error) {
        logger.error('Error checking case budget:', error);
        return { exceeded: false, nearLimit: false };
    }
}

/**
 * Check budget for a specific account
 * @param {string} firmId - Firm ID
 * @param {string} accountId - Account ID
 * @param {number} amount - Amount to check
 * @param {string} departmentId - Department ID (optional)
 * @param {string} costCenterId - Cost center ID (optional)
 * @returns {Promise<object>} Budget check result
 */
async function checkAccountBudget(firmId, accountId, amount, departmentId, costCenterId) {
    try {
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth() + 1;

        // Get approved budget for this fiscal year
        const budget = await Budget.getApprovedBudgetForYear(currentYear, firmId);

        if (!budget) {
            return { exceeded: false, nearLimit: false };
        }

        // Get budgeted amount for this account
        const budgetedAmount = budget.getBudgetForAccount(accountId, currentMonth);

        if (!budgetedAmount || budgetedAmount === 0) {
            return { exceeded: false, nearLimit: false };
        }

        // Get actual spending from GL (simplified - you may need to enhance this)
        const GeneralLedger = require('../models/generalLedger.model');
        const startOfMonth = new Date(currentYear, currentMonth - 1, 1);
        const endOfMonth = new Date(currentYear, currentMonth, 0);

        const actual = await GeneralLedger.aggregate([
            {
                $match: {
                    status: 'posted',
                    transactionDate: { $gte: startOfMonth, $lte: endOfMonth },
                    $or: [
                        { debitAccountId: accountId },
                        { creditAccountId: accountId }
                    ]
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$amount' }
                }
            }
        ]);

        const actualSpent = actual[0]?.total || 0;
        const afterAmount = actualSpent + amount;
        const percentUsed = budgetedAmount > 0 ? (afterAmount / budgetedAmount) * 100 : 0;
        const remaining = budgetedAmount - actualSpent;

        // Get account info for response
        const Account = require('../models/account.model');
        const account = await Account.findById(accountId).select('code name').lean();

        return {
            exceeded: afterAmount > budgetedAmount,
            nearLimit: percentUsed >= 80 && percentUsed < 100,
            budgeted: budgetedAmount,
            used: actualSpent,
            remaining,
            afterAmount,
            percentUsed: percentUsed.toFixed(2),
            accountCode: account?.code,
            accountName: account?.name
        };
    } catch (error) {
        logger.error('Error checking account budget:', error);
        return { exceeded: false, nearLimit: false };
    }
}

/**
 * Check payment limits for user/firm
 * @param {string} firmId - Firm ID
 * @param {string} userId - User ID
 * @param {number} amount - Payment amount
 * @param {string} paymentMethod - Payment method
 * @returns {Promise<object>} Limit check result
 */
async function checkPaymentLimits(firmId, userId, amount, paymentMethod) {
    try {
        // Placeholder - implement based on your payment policy configuration
        // This could check daily/monthly limits, method-specific limits, etc.

        // Example: Check if payment exceeds 100,000 SAR (1,000,000 halalas)
        const dailyLimit = 1000000; // 100,000 SAR in halalas

        if (amount > dailyLimit) {
            return {
                exceeded: true,
                limitType: 'daily',
                limit: dailyLimit,
                amount,
                excess: amount - dailyLimit
            };
        }

        return { exceeded: false };
    } catch (error) {
        logger.error('Error checking payment limits:', error);
        return { exceeded: false };
    }
}

/**
 * Check for duplicate payments
 * @param {string} invoiceId - Invoice ID
 * @param {number} amount - Payment amount
 * @param {string} userId - User ID
 * @returns {Promise<object>} Duplicate check result
 */
async function checkDuplicatePayment(invoiceId, amount, userId) {
    try {
        // Check for payments in the last 5 minutes with same invoice and amount
        const Payment = require('../models/payment.model');
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

        const recentPayment = await Payment.findOne({
            invoiceId,
            amount,
            createdBy: userId,
            createdAt: { $gte: fiveMinutesAgo }
        }).lean();

        if (recentPayment) {
            return {
                isDuplicate: true,
                recentPaymentId: recentPayment._id,
                recentPaymentDate: recentPayment.createdAt
            };
        }

        return { isDuplicate: false };
    } catch (error) {
        logger.error('Error checking duplicate payment:', error);
        return { isDuplicate: false };
    }
}

module.exports = {
    checkExpensePolicy,
    checkInvoicePolicy,
    checkPaymentPolicy,
    checkBudgetPolicy,

    // Export helpers for testing
    extractContext,
    isDryRun,
    getViolationSeverity,
    logPolicyCheck
};
