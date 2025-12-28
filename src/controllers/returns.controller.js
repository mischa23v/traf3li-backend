/**
 * Returns Controller (RMA)
 * Security: Uses req.firmQuery for multi-tenant isolation
 */

const ReturnsService = require('../services/returns.service');
const { CustomException } = require('../utils');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');

const ALLOWED_RETURN_FIELDS = [
    'items', 'returnAddress', 'pickupAddress', 'reason', 'reasonDetail',
    'resolution', 'notes'
];

// ═══════════════════════════════════════════════════════════════
// CRUD OPERATIONS
// ═══════════════════════════════════════════════════════════════

async function getReturns(req, res) {
    try {
        const result = await ReturnsService.getList(req.firmQuery, {
            status: req.query.status,
            resolution: req.query.resolution,
            customerId: req.query.customerId,
            startDate: req.query.startDate,
            endDate: req.query.endDate,
            search: req.query.search,
            page: req.query.page,
            limit: req.query.limit
        });

        res.json({
            success: true,
            data: result.returns,
            pagination: result.pagination
        });
    } catch (error) {
        throw CustomException(error.message, error.statusCode || 500);
    }
}

async function getReturn(req, res) {
    try {
        const returnOrder = await ReturnsService.getById(req.params.id, req.firmQuery);

        res.json({
            success: true,
            data: returnOrder
        });
    } catch (error) {
        throw CustomException(error.message, error.statusCode || 500);
    }
}

async function createFromSalesOrder(req, res) {
    try {
        const salesOrderId = sanitizeObjectId(req.body.salesOrderId);
        const returnData = pickAllowedFields(req.body, ALLOWED_RETURN_FIELDS);

        const returnOrder = await ReturnsService.createFromSalesOrder(
            salesOrderId,
            returnData,
            req.firmQuery,
            req.userID
        );

        res.status(201).json({
            success: true,
            message: 'Return order created',
            data: returnOrder
        });
    } catch (error) {
        throw CustomException(error.message, error.statusCode || 500);
    }
}

async function createFromDelivery(req, res) {
    try {
        const deliveryId = sanitizeObjectId(req.body.deliveryId);
        const returnData = pickAllowedFields(req.body, ALLOWED_RETURN_FIELDS);

        const returnOrder = await ReturnsService.createFromDelivery(
            deliveryId,
            returnData,
            req.firmQuery,
            req.userID
        );

        res.status(201).json({
            success: true,
            message: 'Return order created',
            data: returnOrder
        });
    } catch (error) {
        throw CustomException(error.message, error.statusCode || 500);
    }
}

// ═══════════════════════════════════════════════════════════════
// WORKFLOW
// ═══════════════════════════════════════════════════════════════

async function submitReturn(req, res) {
    try {
        const returnOrder = await ReturnsService.submit(
            req.params.id,
            req.firmQuery,
            req.userID
        );

        res.json({
            success: true,
            message: 'Return submitted for approval',
            data: returnOrder
        });
    } catch (error) {
        throw CustomException(error.message, error.statusCode || 500);
    }
}

async function approveReturn(req, res) {
    try {
        if (!req.hasPermission('sales', 'full')) {
            throw CustomException('Permission denied', 403);
        }

        const { notes } = req.body;

        const returnOrder = await ReturnsService.approve(
            req.params.id,
            req.firmQuery,
            req.userID,
            notes
        );

        res.json({
            success: true,
            message: 'Return approved',
            data: returnOrder
        });
    } catch (error) {
        throw CustomException(error.message, error.statusCode || 500);
    }
}

async function rejectReturn(req, res) {
    try {
        if (!req.hasPermission('sales', 'full')) {
            throw CustomException('Permission denied', 403);
        }

        const { reason } = req.body;

        if (!reason) {
            throw CustomException('Rejection reason is required', 400);
        }

        const returnOrder = await ReturnsService.reject(
            req.params.id,
            req.firmQuery,
            req.userID,
            reason
        );

        res.json({
            success: true,
            message: 'Return rejected',
            data: returnOrder
        });
    } catch (error) {
        throw CustomException(error.message, error.statusCode || 500);
    }
}

// ═══════════════════════════════════════════════════════════════
// RECEIVING & INSPECTION
// ═══════════════════════════════════════════════════════════════

async function receiveItems(req, res) {
    try {
        const receiptData = pickAllowedFields(req.body, ['items']);

        const returnOrder = await ReturnsService.receiveItems(
            req.params.id,
            receiptData,
            req.firmQuery,
            req.userID
        );

        res.json({
            success: true,
            message: 'Items received',
            data: returnOrder
        });
    } catch (error) {
        throw CustomException(error.message, error.statusCode || 500);
    }
}

async function recordInspection(req, res) {
    try {
        const inspectionData = pickAllowedFields(req.body, ['items']);

        const returnOrder = await ReturnsService.recordInspection(
            req.params.id,
            inspectionData,
            req.firmQuery,
            req.userID
        );

        res.json({
            success: true,
            message: 'Inspection recorded',
            data: returnOrder
        });
    } catch (error) {
        throw CustomException(error.message, error.statusCode || 500);
    }
}

// ═══════════════════════════════════════════════════════════════
// RESOLUTION
// ═══════════════════════════════════════════════════════════════

async function processResolution(req, res) {
    try {
        const resolutionData = pickAllowedFields(req.body, ['type', 'amount', 'notes']);

        if (!resolutionData.type) {
            throw CustomException('Resolution type is required', 400);
        }

        const returnOrder = await ReturnsService.processResolution(
            req.params.id,
            resolutionData,
            req.firmQuery,
            req.userID
        );

        res.json({
            success: true,
            message: 'Resolution processed',
            data: returnOrder
        });
    } catch (error) {
        throw CustomException(error.message, error.statusCode || 500);
    }
}

async function completeReturn(req, res) {
    try {
        const returnOrder = await ReturnsService.complete(
            req.params.id,
            req.firmQuery,
            req.userID
        );

        res.json({
            success: true,
            message: 'Return completed',
            data: returnOrder
        });
    } catch (error) {
        throw CustomException(error.message, error.statusCode || 500);
    }
}

// ═══════════════════════════════════════════════════════════════
// SHIPPING
// ═══════════════════════════════════════════════════════════════

async function schedulePickup(req, res) {
    try {
        const pickupData = pickAllowedFields(req.body, [
            'scheduledDate', 'timeWindow', 'carrier', 'instructions'
        ]);

        const returnOrder = await ReturnsService.schedulePickup(
            req.params.id,
            pickupData,
            req.firmQuery,
            req.userID
        );

        res.json({
            success: true,
            message: 'Pickup scheduled',
            data: returnOrder
        });
    } catch (error) {
        throw CustomException(error.message, error.statusCode || 500);
    }
}

async function generateReturnLabel(req, res) {
    try {
        const result = await ReturnsService.generateReturnLabel(
            req.params.id,
            req.firmQuery
        );

        res.json({
            success: true,
            message: 'Return label generated',
            data: result
        });
    } catch (error) {
        throw CustomException(error.message, error.statusCode || 500);
    }
}

// ═══════════════════════════════════════════════════════════════
// ANALYTICS
// ═══════════════════════════════════════════════════════════════

async function getStatistics(req, res) {
    try {
        const stats = await ReturnsService.getStatistics(req.firmQuery, {
            start: req.query.startDate,
            end: req.query.endDate
        });

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        throw CustomException(error.message, error.statusCode || 500);
    }
}

async function getReturnRate(req, res) {
    try {
        const data = await ReturnsService.getReturnRate(req.firmQuery, {
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

async function getPendingReturns(req, res) {
    try {
        const returns = await ReturnsService.getPendingReturns(req.firmQuery);

        res.json({
            success: true,
            data: returns
        });
    } catch (error) {
        throw CustomException(error.message, error.statusCode || 500);
    }
}

async function getRequiringInspection(req, res) {
    try {
        const returns = await ReturnsService.getRequiringInspection(req.firmQuery);

        res.json({
            success: true,
            data: returns
        });
    } catch (error) {
        throw CustomException(error.message, error.statusCode || 500);
    }
}

module.exports = {
    getReturns,
    getReturn,
    createFromSalesOrder,
    createFromDelivery,
    submitReturn,
    approveReturn,
    rejectReturn,
    receiveItems,
    recordInspection,
    processResolution,
    completeReturn,
    schedulePickup,
    generateReturnLabel,
    getStatistics,
    getReturnRate,
    getPendingReturns,
    getRequiringInspection
};
