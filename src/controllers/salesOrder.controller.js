/**
 * Sales Order Controller
 * Security: Uses req.firmQuery for multi-tenant isolation
 * Uses req.addFirmId() for creating records
 */

const SalesOrderService = require('../services/salesOrder.service');
const { CustomException } = require('../utils');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');

// Allowed fields for order creation/update
const ALLOWED_ORDER_FIELDS = [
    'customerId', 'leadId', 'quoteId', 'items', 'billingAddress', 'shippingAddress',
    'currency', 'orderDate', 'expectedDeliveryDate', 'paymentTerms', 'termsAndConditions',
    'notes', 'internalNotes', 'salespersonId', 'discount', 'shippingMethod',
    'shippingCost', 'priority', 'tags'
];

const ALLOWED_ITEM_FIELDS = [
    'productId', 'productName', 'description', 'quantity', 'unitPrice',
    'discount', 'taxRate', 'unitOfMeasure'
];

// ═══════════════════════════════════════════════════════════════
// CRUD OPERATIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Get sales orders list
 */
async function getSalesOrders(req, res) {
    try {
        const result = await SalesOrderService.getList(req.firmQuery, {
            status: req.query.status,
            customerId: req.query.customerId,
            salespersonId: req.query.salespersonId,
            startDate: req.query.startDate,
            endDate: req.query.endDate,
            search: req.query.search,
            page: req.query.page,
            limit: req.query.limit,
            sortBy: req.query.sortBy,
            sortOrder: req.query.sortOrder
        });

        res.json({
            success: true,
            data: result.orders,
            pagination: result.pagination
        });
    } catch (error) {
        throw CustomException(error.message, error.statusCode || 500);
    }
}

/**
 * Get single sales order
 */
async function getSalesOrder(req, res) {
    try {
        const order = await SalesOrderService.getById(req.params.id, req.firmQuery);

        res.json({
            success: true,
            data: order
        });
    } catch (error) {
        throw CustomException(error.message, error.statusCode || 500);
    }
}

/**
 * Create sales order from quote
 */
async function createFromQuote(req, res) {
    try {
        const quoteId = sanitizeObjectId(req.body.quoteId);
        const orderData = pickAllowedFields(req.body, ALLOWED_ORDER_FIELDS);

        const order = await SalesOrderService.createFromQuote(
            quoteId,
            req.firmQuery.firmId,
            req.userID,
            orderData
        );

        res.status(201).json({
            success: true,
            message: 'Sales order created from quote',
            data: order
        });
    } catch (error) {
        throw CustomException(error.message, error.statusCode || 500);
    }
}

/**
 * Create sales order for client
 */
async function createForClient(req, res) {
    try {
        const clientId = sanitizeObjectId(req.body.customerId);
        const orderData = pickAllowedFields(req.body, ALLOWED_ORDER_FIELDS);

        // Sanitize items
        if (orderData.items) {
            orderData.items = orderData.items.map(item => pickAllowedFields(item, ALLOWED_ITEM_FIELDS));
        }

        const order = await SalesOrderService.createForClient(
            clientId,
            req.firmQuery.firmId,
            req.userID,
            orderData
        );

        res.status(201).json({
            success: true,
            message: 'Sales order created',
            data: order
        });
    } catch (error) {
        throw CustomException(error.message, error.statusCode || 500);
    }
}

/**
 * Create sales order from lead
 */
async function createFromLead(req, res) {
    try {
        const leadId = sanitizeObjectId(req.body.leadId);
        const orderData = pickAllowedFields(req.body, ALLOWED_ORDER_FIELDS);

        // Sanitize items
        if (orderData.items) {
            orderData.items = orderData.items.map(item => pickAllowedFields(item, ALLOWED_ITEM_FIELDS));
        }

        const order = await SalesOrderService.createFromLead(
            leadId,
            req.firmQuery.firmId,
            req.userID,
            orderData
        );

        res.status(201).json({
            success: true,
            message: 'Sales order created from lead',
            data: order
        });
    } catch (error) {
        throw CustomException(error.message, error.statusCode || 500);
    }
}

// ═══════════════════════════════════════════════════════════════
// ORDER LIFECYCLE
// ═══════════════════════════════════════════════════════════════

/**
 * Confirm order
 */
async function confirmOrder(req, res) {
    try {
        const order = await SalesOrderService.confirmOrder(
            req.params.id,
            req.firmQuery,
            req.userID
        );

        res.json({
            success: true,
            message: 'Order confirmed',
            data: order
        });
    } catch (error) {
        throw CustomException(error.message, error.statusCode || 500);
    }
}

/**
 * Cancel order
 */
async function cancelOrder(req, res) {
    try {
        const { reason } = req.body;

        if (!reason) {
            throw CustomException('Cancellation reason is required', 400);
        }

        const order = await SalesOrderService.cancelOrder(
            req.params.id,
            req.firmQuery,
            req.userID,
            reason
        );

        res.json({
            success: true,
            message: 'Order cancelled',
            data: order
        });
    } catch (error) {
        throw CustomException(error.message, error.statusCode || 500);
    }
}

/**
 * Complete order
 */
async function completeOrder(req, res) {
    try {
        const order = await SalesOrderService.completeOrder(
            req.params.id,
            req.firmQuery,
            req.userID
        );

        res.json({
            success: true,
            message: 'Order completed',
            data: order
        });
    } catch (error) {
        throw CustomException(error.message, error.statusCode || 500);
    }
}

// ═══════════════════════════════════════════════════════════════
// ORDER ITEMS
// ═══════════════════════════════════════════════════════════════

/**
 * Add item to order
 */
async function addItem(req, res) {
    try {
        const itemData = pickAllowedFields(req.body, ALLOWED_ITEM_FIELDS);

        const order = await SalesOrderService.addItem(
            req.params.id,
            req.firmQuery,
            itemData,
            req.userID
        );

        res.json({
            success: true,
            message: 'Item added to order',
            data: order
        });
    } catch (error) {
        throw CustomException(error.message, error.statusCode || 500);
    }
}

/**
 * Update item in order
 */
async function updateItem(req, res) {
    try {
        const updates = pickAllowedFields(req.body, ['quantity', 'unitPrice', 'discount', 'description', 'taxRate']);

        const order = await SalesOrderService.updateItem(
            req.params.id,
            req.params.itemId,
            req.firmQuery,
            updates,
            req.userID
        );

        res.json({
            success: true,
            message: 'Item updated',
            data: order
        });
    } catch (error) {
        throw CustomException(error.message, error.statusCode || 500);
    }
}

/**
 * Remove item from order
 */
async function removeItem(req, res) {
    try {
        const order = await SalesOrderService.removeItem(
            req.params.id,
            req.params.itemId,
            req.firmQuery,
            req.userID
        );

        res.json({
            success: true,
            message: 'Item removed from order',
            data: order
        });
    } catch (error) {
        throw CustomException(error.message, error.statusCode || 500);
    }
}

// ═══════════════════════════════════════════════════════════════
// PRICING
// ═══════════════════════════════════════════════════════════════

/**
 * Apply pricing rules
 */
async function applyPricingRules(req, res) {
    try {
        const result = await SalesOrderService.applyPricingRules(
            req.params.id,
            req.firmQuery,
            req.userID
        );

        res.json({
            success: true,
            message: `${result.appliedRules.length} pricing rules applied`,
            data: result
        });
    } catch (error) {
        throw CustomException(error.message, error.statusCode || 500);
    }
}

/**
 * Apply discount
 */
async function applyDiscount(req, res) {
    try {
        const discount = pickAllowedFields(req.body, ['type', 'value', 'reason']);

        if (!discount.type || discount.value === undefined) {
            throw CustomException('Discount type and value are required', 400);
        }

        const order = await SalesOrderService.applyDiscount(
            req.params.id,
            req.firmQuery,
            discount,
            req.userID
        );

        res.json({
            success: true,
            message: 'Discount applied',
            data: order
        });
    } catch (error) {
        throw CustomException(error.message, error.statusCode || 500);
    }
}

// ═══════════════════════════════════════════════════════════════
// FULFILLMENT
// ═══════════════════════════════════════════════════════════════

/**
 * Create delivery note
 */
async function createDeliveryNote(req, res) {
    try {
        const deliveryData = pickAllowedFields(req.body, [
            'items', 'shippingAddress', 'scheduledDate', 'deliveryMethod',
            'carrier', 'specialInstructions'
        ]);

        const delivery = await SalesOrderService.createDeliveryNote(
            req.params.id,
            req.firmQuery,
            deliveryData,
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

// ═══════════════════════════════════════════════════════════════
// INVOICING
// ═══════════════════════════════════════════════════════════════

/**
 * Create invoice from order
 */
async function createInvoice(req, res) {
    try {
        const invoiceData = pickAllowedFields(req.body, ['items', 'dueDate', 'notes']);

        const invoice = await SalesOrderService.createInvoice(
            req.params.id,
            req.firmQuery,
            invoiceData,
            req.userID
        );

        res.status(201).json({
            success: true,
            message: 'Invoice created',
            data: invoice
        });
    } catch (error) {
        throw CustomException(error.message, error.statusCode || 500);
    }
}

// ═══════════════════════════════════════════════════════════════
// PAYMENTS
// ═══════════════════════════════════════════════════════════════

/**
 * Record payment
 */
async function recordPayment(req, res) {
    try {
        const paymentData = pickAllowedFields(req.body, ['amount', 'method', 'reference', 'date']);

        if (!paymentData.amount || !paymentData.method) {
            throw CustomException('Payment amount and method are required', 400);
        }

        const order = await SalesOrderService.recordPayment(
            req.params.id,
            req.firmQuery,
            paymentData,
            req.userID
        );

        res.json({
            success: true,
            message: 'Payment recorded',
            data: order
        });
    } catch (error) {
        throw CustomException(error.message, error.statusCode || 500);
    }
}

// ═══════════════════════════════════════════════════════════════
// ANALYTICS
// ═══════════════════════════════════════════════════════════════

/**
 * Get order statistics
 */
async function getStatistics(req, res) {
    try {
        const stats = await SalesOrderService.getStatistics(req.firmQuery, {
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

/**
 * Get sales by salesperson
 */
async function getSalesBySalesperson(req, res) {
    try {
        const data = await SalesOrderService.getSalesBySalesperson(req.firmQuery, {
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

/**
 * Get top customers
 */
async function getTopCustomers(req, res) {
    try {
        const limit = parseInt(req.query.limit) || 10;

        const data = await SalesOrderService.getTopCustomers(req.firmQuery, limit, {
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

module.exports = {
    getSalesOrders,
    getSalesOrder,
    createFromQuote,
    createForClient,
    createFromLead,
    confirmOrder,
    cancelOrder,
    completeOrder,
    addItem,
    updateItem,
    removeItem,
    applyPricingRules,
    applyDiscount,
    createDeliveryNote,
    createInvoice,
    recordPayment,
    getStatistics,
    getSalesBySalesperson,
    getTopCustomers
};
