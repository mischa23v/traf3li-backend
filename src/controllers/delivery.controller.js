/**
 * Delivery Controller
 * Security: Uses req.firmQuery for multi-tenant isolation
 */

const DeliveryService = require('../services/delivery.service');
const { CustomException } = require('../utils');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');

const ALLOWED_DELIVERY_FIELDS = [
    'salesOrderId', 'customerId', 'customerInfo', 'shippingAddress',
    'scheduledDate', 'deliveryMethod', 'carrier', 'specialInstructions',
    'internalNotes', 'items'
];

// ═══════════════════════════════════════════════════════════════
// CRUD OPERATIONS
// ═══════════════════════════════════════════════════════════════

async function getDeliveries(req, res) {
    try {
        const result = await DeliveryService.getList(req.firmQuery, {
            status: req.query.status,
            customerId: req.query.customerId,
            salesOrderId: req.query.salesOrderId,
            startDate: req.query.startDate,
            endDate: req.query.endDate,
            search: req.query.search,
            page: req.query.page,
            limit: req.query.limit
        });

        res.json({
            success: true,
            data: result.deliveries,
            pagination: result.pagination
        });
    } catch (error) {
        throw CustomException(error.message, error.statusCode || 500);
    }
}

async function getDelivery(req, res) {
    try {
        const delivery = await DeliveryService.getById(req.params.id, req.firmQuery);

        res.json({
            success: true,
            data: delivery
        });
    } catch (error) {
        throw CustomException(error.message, error.statusCode || 500);
    }
}

async function createDelivery(req, res) {
    try {
        const deliveryData = pickAllowedFields(req.body, ALLOWED_DELIVERY_FIELDS);

        const delivery = await DeliveryService.create(
            deliveryData,
            req.firmQuery,
            req.userID
        );

        res.status(201).json({
            success: true,
            message: 'Delivery note created',
            data: delivery
        });
    } catch (error) {
        throw CustomException(error.message, error.statusCode || 500);
    }
}

async function updateDelivery(req, res) {
    try {
        const updates = pickAllowedFields(req.body, [
            'shippingAddress', 'scheduledDate', 'deliveryMethod',
            'specialInstructions', 'carrier', 'internalNotes'
        ]);

        const delivery = await DeliveryService.update(
            req.params.id,
            updates,
            req.firmQuery,
            req.userID
        );

        res.json({
            success: true,
            message: 'Delivery updated',
            data: delivery
        });
    } catch (error) {
        throw CustomException(error.message, error.statusCode || 500);
    }
}

// ═══════════════════════════════════════════════════════════════
// WORKFLOW
// ═══════════════════════════════════════════════════════════════

async function startPicking(req, res) {
    try {
        const delivery = await DeliveryService.startPicking(
            req.params.id,
            req.firmQuery,
            req.userID
        );

        res.json({
            success: true,
            message: 'Picking started',
            data: delivery
        });
    } catch (error) {
        throw CustomException(error.message, error.statusCode || 500);
    }
}

async function completePicking(req, res) {
    try {
        const pickingData = pickAllowedFields(req.body, ['items']);

        const delivery = await DeliveryService.completePicking(
            req.params.id,
            pickingData,
            req.firmQuery,
            req.userID
        );

        res.json({
            success: true,
            message: 'Picking completed',
            data: delivery
        });
    } catch (error) {
        throw CustomException(error.message, error.statusCode || 500);
    }
}

async function completePacking(req, res) {
    try {
        const packingData = pickAllowedFields(req.body, ['packages']);

        const delivery = await DeliveryService.completePacking(
            req.params.id,
            packingData,
            req.firmQuery,
            req.userID
        );

        res.json({
            success: true,
            message: 'Packing completed',
            data: delivery
        });
    } catch (error) {
        throw CustomException(error.message, error.statusCode || 500);
    }
}

async function shipDelivery(req, res) {
    try {
        const shippingData = pickAllowedFields(req.body, [
            'carrierName', 'service', 'trackingNumber', 'trackingUrl',
            'awbNumber', 'estimatedDeliveryDate'
        ]);

        if (!shippingData.trackingNumber) {
            throw CustomException('Tracking number is required', 400);
        }

        const delivery = await DeliveryService.ship(
            req.params.id,
            shippingData,
            req.firmQuery,
            req.userID
        );

        res.json({
            success: true,
            message: 'Delivery shipped',
            data: delivery
        });
    } catch (error) {
        throw CustomException(error.message, error.statusCode || 500);
    }
}

// ═══════════════════════════════════════════════════════════════
// TRACKING
// ═══════════════════════════════════════════════════════════════

async function addTrackingEvent(req, res) {
    try {
        const eventData = pickAllowedFields(req.body, [
            'status', 'location', 'description', 'timestamp'
        ]);

        const delivery = await DeliveryService.addTrackingEvent(
            req.params.id,
            eventData,
            req.firmQuery
        );

        res.json({
            success: true,
            message: 'Tracking event added',
            data: delivery
        });
    } catch (error) {
        throw CustomException(error.message, error.statusCode || 500);
    }
}

async function getTrackingHistory(req, res) {
    try {
        const tracking = await DeliveryService.getTrackingHistory(
            req.params.id,
            req.firmQuery
        );

        res.json({
            success: true,
            data: tracking
        });
    } catch (error) {
        throw CustomException(error.message, error.statusCode || 500);
    }
}

// ═══════════════════════════════════════════════════════════════
// PROOF OF DELIVERY
// ═══════════════════════════════════════════════════════════════

async function recordDelivery(req, res) {
    try {
        const podData = pickAllowedFields(req.body, [
            'items', 'receivedBy', 'signature', 'notes', 'photos', 'gpsCoordinates'
        ]);

        const delivery = await DeliveryService.recordDelivery(
            req.params.id,
            podData,
            req.firmQuery,
            req.userID
        );

        res.json({
            success: true,
            message: 'Delivery recorded',
            data: delivery
        });
    } catch (error) {
        throw CustomException(error.message, error.statusCode || 500);
    }
}

async function recordFailedAttempt(req, res) {
    try {
        const attemptData = pickAllowedFields(req.body, ['reason', 'notes']);

        if (!attemptData.reason) {
            throw CustomException('Failure reason is required', 400);
        }

        const delivery = await DeliveryService.recordFailedAttempt(
            req.params.id,
            attemptData,
            req.firmQuery,
            req.userID
        );

        res.json({
            success: true,
            message: 'Failed attempt recorded',
            data: delivery
        });
    } catch (error) {
        throw CustomException(error.message, error.statusCode || 500);
    }
}

// ═══════════════════════════════════════════════════════════════
// CANCEL & RETURNS
// ═══════════════════════════════════════════════════════════════

async function cancelDelivery(req, res) {
    try {
        const { reason } = req.body;

        if (!reason) {
            throw CustomException('Cancellation reason is required', 400);
        }

        const delivery = await DeliveryService.cancel(
            req.params.id,
            reason,
            req.firmQuery,
            req.userID
        );

        res.json({
            success: true,
            message: 'Delivery cancelled',
            data: delivery
        });
    } catch (error) {
        throw CustomException(error.message, error.statusCode || 500);
    }
}

async function createReturnPickup(req, res) {
    try {
        const returnData = pickAllowedFields(req.body, ['items', 'instructions']);

        const returnPickup = await DeliveryService.createReturnPickup(
            req.params.id,
            returnData,
            req.firmQuery,
            req.userID
        );

        res.status(201).json({
            success: true,
            message: 'Return pickup created',
            data: returnPickup
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
        const stats = await DeliveryService.getStatistics(req.firmQuery, {
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

async function getByCarrier(req, res) {
    try {
        const data = await DeliveryService.getByCarrier(req.firmQuery, {
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

async function getPendingDeliveries(req, res) {
    try {
        const deliveries = await DeliveryService.getPendingDeliveries(req.firmQuery);

        res.json({
            success: true,
            data: deliveries
        });
    } catch (error) {
        throw CustomException(error.message, error.statusCode || 500);
    }
}

async function getInTransit(req, res) {
    try {
        const deliveries = await DeliveryService.getInTransit(req.firmQuery);

        res.json({
            success: true,
            data: deliveries
        });
    } catch (error) {
        throw CustomException(error.message, error.statusCode || 500);
    }
}

module.exports = {
    getDeliveries,
    getDelivery,
    createDelivery,
    updateDelivery,
    startPicking,
    completePicking,
    completePacking,
    shipDelivery,
    addTrackingEvent,
    getTrackingHistory,
    recordDelivery,
    recordFailedAttempt,
    cancelDelivery,
    createReturnPickup,
    getStatistics,
    getByCarrier,
    getPendingDeliveries,
    getInTransit
};
