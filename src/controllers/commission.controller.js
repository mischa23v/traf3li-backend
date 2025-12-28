/**
 * Commission Controller
 * Security: Uses req.firmQuery for multi-tenant isolation
 */

const CommissionService = require('../services/commission.service');
const { CustomException } = require('../utils');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');

const ALLOWED_PLAN_FIELDS = [
    'name', 'description', 'type', 'status', 'baseRate', 'tiers',
    'productRates', 'targets', 'accelerators', 'teamSplitting',
    'managerOverride', 'clawback', 'caps', 'applicableTo',
    'effectiveFrom', 'effectiveTo'
];

// ═══════════════════════════════════════════════════════════════
// COMMISSION PLANS
// ═══════════════════════════════════════════════════════════════

async function getPlans(req, res) {
    try {
        const plans = await CommissionService.getPlans(req.firmQuery, {
            status: req.query.status,
            type: req.query.type
        });

        res.json({
            success: true,
            data: plans
        });
    } catch (error) {
        throw CustomException(error.message, error.statusCode || 500);
    }
}

async function getPlan(req, res) {
    try {
        const plan = await CommissionService.getPlanById(req.params.id, req.firmQuery);

        res.json({
            success: true,
            data: plan
        });
    } catch (error) {
        throw CustomException(error.message, error.statusCode || 500);
    }
}

async function createPlan(req, res) {
    try {
        if (!req.hasPermission('sales', 'full')) {
            throw CustomException('Permission denied', 403);
        }

        const planData = pickAllowedFields(req.body, ALLOWED_PLAN_FIELDS);

        const plan = await CommissionService.createPlan(
            planData,
            req.firmQuery,
            req.userID
        );

        res.status(201).json({
            success: true,
            message: 'Commission plan created',
            data: plan
        });
    } catch (error) {
        throw CustomException(error.message, error.statusCode || 500);
    }
}

async function updatePlan(req, res) {
    try {
        if (!req.hasPermission('sales', 'full')) {
            throw CustomException('Permission denied', 403);
        }

        const updates = pickAllowedFields(req.body, ALLOWED_PLAN_FIELDS);

        const plan = await CommissionService.updatePlan(
            req.params.id,
            updates,
            req.firmQuery,
            req.userID
        );

        res.json({
            success: true,
            message: 'Commission plan updated',
            data: plan
        });
    } catch (error) {
        throw CustomException(error.message, error.statusCode || 500);
    }
}

async function assignPlan(req, res) {
    try {
        if (!req.hasPermission('sales', 'full')) {
            throw CustomException('Permission denied', 403);
        }

        const { salespersonId } = req.body;

        if (!salespersonId) {
            throw CustomException('Salesperson ID is required', 400);
        }

        const plan = await CommissionService.assignPlanToSalesperson(
            req.params.id,
            salespersonId,
            req.firmQuery,
            req.userID
        );

        res.json({
            success: true,
            message: 'Plan assigned to salesperson',
            data: plan
        });
    } catch (error) {
        throw CustomException(error.message, error.statusCode || 500);
    }
}

// ═══════════════════════════════════════════════════════════════
// COMMISSION CALCULATION
// ═══════════════════════════════════════════════════════════════

async function calculateForTransaction(req, res) {
    try {
        const { transactionType, transactionId } = req.body;

        if (!transactionType || !transactionId) {
            throw CustomException('Transaction type and ID are required', 400);
        }

        const result = await CommissionService.calculateForTransaction(
            transactionType,
            transactionId,
            req.firmQuery
        );

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        throw CustomException(error.message, error.statusCode || 500);
    }
}

async function calculateForPeriod(req, res) {
    try {
        const { salespersonId, periodStart, periodEnd } = req.body;

        if (!salespersonId || !periodStart || !periodEnd) {
            throw CustomException('Salesperson ID and period dates are required', 400);
        }

        const result = await CommissionService.calculateForPeriod(
            salespersonId,
            new Date(periodStart),
            new Date(periodEnd),
            req.firmQuery
        );

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        throw CustomException(error.message, error.statusCode || 500);
    }
}

// ═══════════════════════════════════════════════════════════════
// SETTLEMENTS
// ═══════════════════════════════════════════════════════════════

async function getSettlements(req, res) {
    try {
        const CommissionSettlement = require('../models/commissionSettlement.model');

        const query = { ...req.firmQuery };

        if (req.query.salespersonId) {
            query.salespersonId = new (require('mongoose').Types.ObjectId)(
                sanitizeObjectId(req.query.salespersonId)
            );
        }

        if (req.query.status) {
            query.status = req.query.status;
        }

        const settlements = await CommissionSettlement.find(query)
            .populate('salespersonId', 'firstName lastName email')
            .sort({ periodEnd: -1 })
            .limit(parseInt(req.query.limit) || 50);

        res.json({
            success: true,
            data: settlements
        });
    } catch (error) {
        throw CustomException(error.message, error.statusCode || 500);
    }
}

async function getSettlement(req, res) {
    try {
        const CommissionSettlement = require('../models/commissionSettlement.model');

        const settlement = await CommissionSettlement.findOne({
            _id: sanitizeObjectId(req.params.id),
            ...req.firmQuery
        }).populate('salespersonId', 'firstName lastName email');

        if (!settlement) {
            throw CustomException('Settlement not found', 404);
        }

        res.json({
            success: true,
            data: settlement
        });
    } catch (error) {
        throw CustomException(error.message, error.statusCode || 500);
    }
}

async function createSettlement(req, res) {
    try {
        if (!req.hasPermission('sales', 'full')) {
            throw CustomException('Permission denied', 403);
        }

        const { salespersonId, periodStart, periodEnd } = req.body;

        if (!salespersonId || !periodStart || !periodEnd) {
            throw CustomException('Salesperson ID and period dates are required', 400);
        }

        const settlement = await CommissionService.createSettlement(
            salespersonId,
            new Date(periodStart),
            new Date(periodEnd),
            req.firmQuery,
            req.userID
        );

        res.status(201).json({
            success: true,
            message: 'Settlement created',
            data: settlement
        });
    } catch (error) {
        throw CustomException(error.message, error.statusCode || 500);
    }
}

async function submitSettlement(req, res) {
    try {
        const settlement = await CommissionService.submitForApproval(
            req.params.id,
            req.firmQuery,
            req.userID
        );

        res.json({
            success: true,
            message: 'Settlement submitted for approval',
            data: settlement
        });
    } catch (error) {
        throw CustomException(error.message, error.statusCode || 500);
    }
}

async function approveSettlement(req, res) {
    try {
        if (!req.hasPermission('sales', 'full')) {
            throw CustomException('Permission denied', 403);
        }

        const { notes } = req.body;

        const settlement = await CommissionService.approveSettlement(
            req.params.id,
            req.firmQuery,
            req.userID,
            notes
        );

        res.json({
            success: true,
            message: 'Settlement approved',
            data: settlement
        });
    } catch (error) {
        throw CustomException(error.message, error.statusCode || 500);
    }
}

async function rejectSettlement(req, res) {
    try {
        if (!req.hasPermission('sales', 'full')) {
            throw CustomException('Permission denied', 403);
        }

        const { reason } = req.body;

        if (!reason) {
            throw CustomException('Rejection reason is required', 400);
        }

        const settlement = await CommissionService.rejectSettlement(
            req.params.id,
            req.firmQuery,
            req.userID,
            reason
        );

        res.json({
            success: true,
            message: 'Settlement rejected',
            data: settlement
        });
    } catch (error) {
        throw CustomException(error.message, error.statusCode || 500);
    }
}

async function schedulePayment(req, res) {
    try {
        if (!req.hasPermission('sales', 'full')) {
            throw CustomException('Permission denied', 403);
        }

        const { paymentDate } = req.body;

        if (!paymentDate) {
            throw CustomException('Payment date is required', 400);
        }

        const settlement = await CommissionService.schedulePayment(
            req.params.id,
            new Date(paymentDate),
            req.firmQuery,
            req.userID
        );

        res.json({
            success: true,
            message: 'Payment scheduled',
            data: settlement
        });
    } catch (error) {
        throw CustomException(error.message, error.statusCode || 500);
    }
}

async function recordPayment(req, res) {
    try {
        if (!req.hasPermission('sales', 'full')) {
            throw CustomException('Permission denied', 403);
        }

        const paymentDetails = pickAllowedFields(req.body, [
            'paymentDate', 'reference', 'method', 'notes'
        ]);

        const settlement = await CommissionService.recordPayment(
            req.params.id,
            paymentDetails,
            req.firmQuery,
            req.userID
        );

        res.json({
            success: true,
            message: 'Payment recorded',
            data: settlement
        });
    } catch (error) {
        throw CustomException(error.message, error.statusCode || 500);
    }
}

// ═══════════════════════════════════════════════════════════════
// CLAWBACKS
// ═══════════════════════════════════════════════════════════════

async function processClawback(req, res) {
    try {
        if (!req.hasPermission('sales', 'full')) {
            throw CustomException('Permission denied', 403);
        }

        const clawbackData = pickAllowedFields(req.body, [
            'lineId', 'reason', 'description', 'percentage', 'eventDate'
        ]);

        if (!clawbackData.lineId || !clawbackData.reason) {
            throw CustomException('Line ID and reason are required', 400);
        }

        const settlement = await CommissionService.processClawback(
            req.params.id,
            clawbackData,
            req.firmQuery,
            req.userID
        );

        res.json({
            success: true,
            message: 'Clawback processed',
            data: settlement
        });
    } catch (error) {
        throw CustomException(error.message, error.statusCode || 500);
    }
}

// ═══════════════════════════════════════════════════════════════
// ANALYTICS
// ═══════════════════════════════════════════════════════════════

async function getSummaryBySalesperson(req, res) {
    try {
        const data = await CommissionService.getSummaryBySalesperson(req.firmQuery, {
            start: req.query.startDate,
            end: req.query.endDate
        });

        res.json({
            success: true,
            data
        });
    } catch (error) {
        throw CustomException(error.message, error.statusCode || 500);
    }
}

async function getMonthlyTrend(req, res) {
    try {
        const year = parseInt(req.query.year) || new Date().getFullYear();

        const data = await CommissionService.getMonthlyTrend(req.firmQuery, year);

        res.json({
            success: true,
            data
        });
    } catch (error) {
        throw CustomException(error.message, error.statusCode || 500);
    }
}

async function getPendingSettlements(req, res) {
    try {
        const settlements = await CommissionService.getPendingSettlements(req.firmQuery);

        res.json({
            success: true,
            data: settlements
        });
    } catch (error) {
        throw CustomException(error.message, error.statusCode || 500);
    }
}

async function getPendingPayments(req, res) {
    try {
        const settlements = await CommissionService.getPendingPayments(req.firmQuery);

        res.json({
            success: true,
            data: settlements
        });
    } catch (error) {
        throw CustomException(error.message, error.statusCode || 500);
    }
}

async function generateStatement(req, res) {
    try {
        const statement = await CommissionService.generateStatement(
            req.params.id,
            req.firmQuery
        );

        res.json({
            success: true,
            data: statement
        });
    } catch (error) {
        throw CustomException(error.message, error.statusCode || 500);
    }
}

module.exports = {
    getPlans,
    getPlan,
    createPlan,
    updatePlan,
    assignPlan,
    calculateForTransaction,
    calculateForPeriod,
    getSettlements,
    getSettlement,
    createSettlement,
    submitSettlement,
    approveSettlement,
    rejectSettlement,
    schedulePayment,
    recordPayment,
    processClawback,
    getSummaryBySalesperson,
    getMonthlyTrend,
    getPendingSettlements,
    getPendingPayments,
    generateStatement
};
