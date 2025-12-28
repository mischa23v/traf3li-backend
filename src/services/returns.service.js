/**
 * Returns Service - Enterprise RMA (Return Merchandise Authorization)
 * Security: All methods require firmId parameter for multi-tenant isolation
 *
 * Handles comprehensive return operations:
 * - Return request creation and management
 * - Approval workflows
 * - Inspection processing
 * - Resolution handling (refund, replacement, credit note)
 * - Return shipping
 * - Analytics and reporting
 *
 * Inspired by: Odoo RMA, ERPNext Stock Returns, SAP SD Returns
 */

const ReturnOrder = require('../models/returnOrder.model');
const SalesOrder = require('../models/salesOrder.model');
const DeliveryNote = require('../models/deliveryNote.model');
const Invoice = require('../models/invoice.model');
const SalesSettings = require('../models/salesSettings.model');
const { CustomException } = require('../utils');
const { sanitizeObjectId } = require('../utils/securityUtils');
const mongoose = require('mongoose');
const logger = require('../utils/logger');

// Helper for regex safety
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

class ReturnsService {
    // ═══════════════════════════════════════════════════════════════
    // 1. RETURN ORDER MANAGEMENT
    // ═══════════════════════════════════════════════════════════════

    /**
     * Get return order by ID
     * @param {string} returnId - Return ID
     * @param {object} firmQuery - Firm query filter
     */
    async getById(returnId, firmQuery) {
        const sanitizedId = sanitizeObjectId(returnId);

        const returnOrder = await ReturnOrder.findOne({
            _id: sanitizedId,
            ...firmQuery
        })
            .populate('customerId', 'displayName companyName email phone')
            .populate('salesOrderId', 'orderNumber')
            .populate('deliveryNoteId', 'deliveryNumber')
            .populate('items.productId', 'name sku')
            .populate('createdBy', 'firstName lastName');

        if (!returnOrder) {
            throw CustomException('Return order not found', 404);
        }

        return returnOrder;
    }

    /**
     * Get return orders list
     * @param {object} firmQuery - Firm query filter
     * @param {object} filters - Filter options
     */
    async getList(firmQuery, filters = {}) {
        const query = { ...firmQuery };

        // Status filter
        if (filters.status) {
            query.status = filters.status;
        }

        // Resolution type filter
        if (filters.resolution) {
            query['resolution.type'] = filters.resolution;
        }

        // Customer filter
        if (filters.customerId) {
            query.customerId = new mongoose.Types.ObjectId(sanitizeObjectId(filters.customerId));
        }

        // Date range
        if (filters.startDate || filters.endDate) {
            query.requestDate = {};
            if (filters.startDate) {
                query.requestDate.$gte = new Date(filters.startDate);
            }
            if (filters.endDate) {
                query.requestDate.$lte = new Date(filters.endDate);
            }
        }

        // Search
        if (filters.search) {
            const searchRegex = new RegExp(escapeRegex(filters.search), 'i');
            query.$or = [
                { rmaNumber: searchRegex },
                { 'customerInfo.name': searchRegex }
            ];
        }

        // Pagination
        const page = parseInt(filters.page) || 1;
        const limit = parseInt(filters.limit) || 20;
        const skip = (page - 1) * limit;

        const [returns, total] = await Promise.all([
            ReturnOrder.find(query)
                .populate('customerId', 'displayName companyName')
                .populate('salesOrderId', 'orderNumber')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            ReturnOrder.countDocuments(query)
        ]);

        return {
            returns,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        };
    }

    /**
     * Create return request from sales order
     * @param {string} salesOrderId - Sales order ID
     * @param {object} returnData - Return data
     * @param {object} firmQuery - Firm query filter
     * @param {string} userId - User ID
     */
    async createFromSalesOrder(salesOrderId, returnData, firmQuery, userId) {
        const sanitizedOrderId = sanitizeObjectId(salesOrderId);

        // Fetch sales order
        const order = await SalesOrder.findOne({
            _id: sanitizedOrderId,
            ...firmQuery
        });

        if (!order) {
            throw CustomException('Sales order not found', 404);
        }

        // Check if order is eligible for returns
        if (!['shipped', 'completed'].includes(order.status)) {
            throw CustomException('Order must be shipped or completed for returns', 400);
        }

        // Check return window
        const settings = await SalesSettings.findByFirm(firmQuery.firmId);
        const returnWindowDays = settings?.returns?.returnWindowDays || 30;

        const orderCompletedDate = order.completedAt || order.confirmedAt;
        const daysSinceOrder = Math.floor(
            (Date.now() - orderCompletedDate) / (1000 * 60 * 60 * 24)
        );

        if (daysSinceOrder > returnWindowDays) {
            throw CustomException(`Return window of ${returnWindowDays} days has expired`, 400);
        }

        // Validate items
        const validItems = [];
        for (const item of returnData.items) {
            const orderItem = order.items.id(item.orderItemId);
            if (!orderItem) {
                throw CustomException(`Order item ${item.orderItemId} not found`, 400);
            }

            // Check returnable quantity
            const returnableQty = orderItem.quantity.delivered - orderItem.quantity.returned;
            if (item.quantity > returnableQty) {
                throw CustomException(
                    `Cannot return ${item.quantity} of ${orderItem.productName}. Only ${returnableQty} available.`,
                    400
                );
            }

            validItems.push({
                orderItemId: orderItem._id,
                productId: orderItem.productId,
                productName: orderItem.productName,
                productCode: orderItem.productCode,
                quantity: {
                    requested: item.quantity,
                    approved: 0,
                    received: 0,
                    inspected: 0,
                    restocked: 0
                },
                unitPrice: orderItem.pricing.unitPrice,
                reason: item.reason,
                reasonDetail: item.reasonDetail,
                condition: item.condition || 'unknown',
                customerNotes: item.notes
            });
        }

        // Create return order
        const returnOrder = new ReturnOrder({
            firmId: firmQuery.firmId,
            lawyerId: order.lawyerId,
            salesOrderId: order._id,
            salesOrderNumber: order.orderNumber,
            customerId: order.customerId,
            customerInfo: order.customerInfo,

            returnAddress: returnData.returnAddress || order.billingAddress,
            pickupAddress: returnData.pickupAddress || order.shippingAddress,

            items: validItems,

            returnReason: returnData.reason,
            returnReasonDetail: returnData.reasonDetail,
            requestedResolution: returnData.resolution || 'refund',

            status: 'draft',
            requestDate: new Date(),

            createdBy: new mongoose.Types.ObjectId(userId)
        });

        // Calculate totals
        returnOrder.calculateTotals();

        await returnOrder.save();

        logger.info(`Return order ${returnOrder.rmaNumber} created from order ${order.orderNumber}`);
        return returnOrder;
    }

    /**
     * Create return from delivery note
     * @param {string} deliveryId - Delivery note ID
     * @param {object} returnData - Return data
     * @param {object} firmQuery - Firm query filter
     * @param {string} userId - User ID
     */
    async createFromDelivery(deliveryId, returnData, firmQuery, userId) {
        const sanitizedDeliveryId = sanitizeObjectId(deliveryId);

        // Fetch delivery
        const delivery = await DeliveryNote.findOne({
            _id: sanitizedDeliveryId,
            ...firmQuery
        });

        if (!delivery) {
            throw CustomException('Delivery note not found', 404);
        }

        if (delivery.status !== 'delivered') {
            throw CustomException('Can only create return from delivered shipments', 400);
        }

        // Build return items from delivery items
        const returnItems = returnData.items.map(item => {
            const deliveryItem = delivery.items.id(item.deliveryItemId);
            if (!deliveryItem) {
                throw CustomException(`Delivery item ${item.deliveryItemId} not found`, 400);
            }

            return {
                deliveryItemId: deliveryItem._id,
                productId: deliveryItem.productId,
                productName: deliveryItem.productName,
                productCode: deliveryItem.productCode,
                quantity: {
                    requested: item.quantity,
                    approved: 0,
                    received: 0,
                    inspected: 0,
                    restocked: 0
                },
                reason: item.reason,
                condition: item.condition || 'unknown'
            };
        });

        // Create return order
        const returnOrder = new ReturnOrder({
            firmId: firmQuery.firmId,
            salesOrderId: delivery.salesOrderId,
            salesOrderNumber: delivery.salesOrderNumber,
            deliveryNoteId: delivery._id,
            deliveryNoteNumber: delivery.deliveryNumber,
            customerId: delivery.customerId,
            customerInfo: delivery.customerInfo,

            pickupAddress: delivery.shippingAddress,

            items: returnItems,
            returnReason: returnData.reason,
            requestedResolution: returnData.resolution || 'refund',

            status: 'draft',
            requestDate: new Date(),

            createdBy: new mongoose.Types.ObjectId(userId)
        });

        returnOrder.calculateTotals();
        await returnOrder.save();

        logger.info(`Return order ${returnOrder.rmaNumber} created from delivery ${delivery.deliveryNumber}`);
        return returnOrder;
    }

    // ═══════════════════════════════════════════════════════════════
    // 2. RETURN WORKFLOW
    // ═══════════════════════════════════════════════════════════════

    /**
     * Submit return for approval
     * @param {string} returnId - Return ID
     * @param {object} firmQuery - Firm query filter
     * @param {string} userId - User ID
     */
    async submit(returnId, firmQuery, userId) {
        const returnOrder = await this.getById(returnId, firmQuery);

        if (returnOrder.status !== 'draft') {
            throw CustomException('Only draft returns can be submitted', 400);
        }

        await returnOrder.submit(userId);
        await returnOrder.save();

        // Check for auto-approval
        const settings = await SalesSettings.findByFirm(firmQuery.firmId);
        const autoApproveBelow = settings?.returns?.autoApproveBelow || 0;

        if (autoApproveBelow > 0 && returnOrder.totals.returnTotal <= autoApproveBelow) {
            await this.approve(returnId, firmQuery, userId, 'Auto-approved: below threshold');
        }

        logger.info(`Return ${returnOrder.rmaNumber} submitted for approval`);
        return returnOrder;
    }

    /**
     * Approve return
     * @param {string} returnId - Return ID
     * @param {object} firmQuery - Firm query filter
     * @param {string} userId - User ID
     * @param {string} notes - Approval notes
     */
    async approve(returnId, firmQuery, userId, notes = '') {
        const returnOrder = await this.getById(returnId, firmQuery);

        if (returnOrder.status !== 'pending_approval') {
            throw CustomException('Return must be pending approval', 400);
        }

        await returnOrder.approve(userId, notes);

        // Set approved quantities to requested quantities
        for (const item of returnOrder.items) {
            item.quantity.approved = item.quantity.requested;
        }

        returnOrder.calculateTotals();
        await returnOrder.save();

        logger.info(`Return ${returnOrder.rmaNumber} approved`);
        return returnOrder;
    }

    /**
     * Reject return
     * @param {string} returnId - Return ID
     * @param {object} firmQuery - Firm query filter
     * @param {string} userId - User ID
     * @param {string} reason - Rejection reason
     */
    async reject(returnId, firmQuery, userId, reason) {
        const returnOrder = await this.getById(returnId, firmQuery);

        if (returnOrder.status !== 'pending_approval') {
            throw CustomException('Return must be pending approval', 400);
        }

        await returnOrder.reject(userId, reason);
        await returnOrder.save();

        logger.info(`Return ${returnOrder.rmaNumber} rejected: ${reason}`);
        return returnOrder;
    }

    // ═══════════════════════════════════════════════════════════════
    // 3. RECEIVING & INSPECTION
    // ═══════════════════════════════════════════════════════════════

    /**
     * Record items received
     * @param {string} returnId - Return ID
     * @param {object} receiptData - Receipt data
     * @param {object} firmQuery - Firm query filter
     * @param {string} userId - User ID
     */
    async receiveItems(returnId, receiptData, firmQuery, userId) {
        const returnOrder = await this.getById(returnId, firmQuery);

        if (!['approved', 'awaiting_receipt'].includes(returnOrder.status)) {
            throw CustomException('Return must be approved before receiving items', 400);
        }

        // Update received quantities
        for (const receivedItem of receiptData.items) {
            const item = returnOrder.items.id(receivedItem.itemId);
            if (item) {
                item.quantity.received = receivedItem.quantityReceived;
                item.receivedCondition = receivedItem.condition;
                item.receivedNotes = receivedItem.notes;
            }
        }

        // Use model method
        await returnOrder.receive(userId);
        await returnOrder.save();

        logger.info(`Items received for return ${returnOrder.rmaNumber}`);
        return returnOrder;
    }

    /**
     * Record inspection results
     * @param {string} returnId - Return ID
     * @param {object} inspectionData - Inspection data
     * @param {object} firmQuery - Firm query filter
     * @param {string} userId - User ID
     */
    async recordInspection(returnId, inspectionData, firmQuery, userId) {
        const returnOrder = await this.getById(returnId, firmQuery);

        if (returnOrder.status !== 'received') {
            throw CustomException('Items must be received before inspection', 400);
        }

        // Record inspection for each item
        for (const inspectedItem of inspectionData.items) {
            const item = returnOrder.items.id(inspectedItem.itemId);
            if (item) {
                item.inspection = {
                    result: inspectedItem.result, // pass, fail, partial
                    condition: inspectedItem.condition,
                    notes: inspectedItem.notes,
                    inspectedBy: new mongoose.Types.ObjectId(userId),
                    inspectedAt: new Date(),
                    photos: inspectedItem.photos || [],
                    defects: inspectedItem.defects || []
                };

                item.quantity.inspected = inspectedItem.quantityPassed || 0;

                // Determine if item can be restocked
                if (inspectedItem.result === 'pass') {
                    item.restockable = true;
                    item.quantity.restocked = item.quantity.inspected;
                } else {
                    item.restockable = inspectedItem.restockable || false;
                }
            }
        }

        await returnOrder.completeInspection(userId);
        await returnOrder.save();

        logger.info(`Inspection completed for return ${returnOrder.rmaNumber}`);
        return returnOrder;
    }

    // ═══════════════════════════════════════════════════════════════
    // 4. RESOLUTION PROCESSING
    // ═══════════════════════════════════════════════════════════════

    /**
     * Process resolution
     * @param {string} returnId - Return ID
     * @param {object} resolutionData - Resolution data
     * @param {object} firmQuery - Firm query filter
     * @param {string} userId - User ID
     */
    async processResolution(returnId, resolutionData, firmQuery, userId) {
        const returnOrder = await this.getById(returnId, firmQuery);

        if (returnOrder.status !== 'inspected') {
            throw CustomException('Inspection must be completed before processing resolution', 400);
        }

        // Calculate restocking fee if applicable
        const settings = await SalesSettings.findByFirm(firmQuery.firmId);
        let restockingFee = 0;

        if (settings?.returns?.chargeRestockingFee) {
            const restockingPercent = settings.returns.defaultRestockingFeePercent || 15;

            // Apply restocking fee based on item condition
            for (const item of returnOrder.items) {
                if (item.inspection?.result !== 'pass' || item.receivedCondition === 'damaged') {
                    restockingFee += item.quantity.received * item.unitPrice * (restockingPercent / 100);
                }
            }
        }

        // Set resolution
        returnOrder.resolution = {
            type: resolutionData.type, // refund, replacement, credit_note, repair, exchange
            status: 'processing',
            amount: resolutionData.amount || (returnOrder.totals.returnTotal - restockingFee),
            notes: resolutionData.notes,
            processedBy: new mongoose.Types.ObjectId(userId),
            processedAt: new Date()
        };

        returnOrder.totals.restockingFee = restockingFee;
        returnOrder.totals.refundAmount = returnOrder.totals.returnTotal - restockingFee;

        await returnOrder.process(userId);
        await returnOrder.save();

        // Handle resolution type
        switch (resolutionData.type) {
            case 'refund':
                await this.processRefund(returnOrder, firmQuery, userId);
                break;
            case 'replacement':
                await this.createReplacementOrder(returnOrder, firmQuery, userId);
                break;
            case 'credit_note':
                await this.createCreditNote(returnOrder, firmQuery, userId);
                break;
        }

        logger.info(`Resolution processed for return ${returnOrder.rmaNumber}: ${resolutionData.type}`);
        return returnOrder;
    }

    /**
     * Process refund
     * @param {object} returnOrder - Return order
     * @param {object} firmQuery - Firm query filter
     * @param {string} userId - User ID
     */
    async processRefund(returnOrder, firmQuery, userId) {
        // Create refund record
        returnOrder.resolution.refund = {
            amount: returnOrder.totals.refundAmount,
            method: 'original_payment', // or bank_transfer, store_credit
            status: 'pending',
            requestedAt: new Date()
        };

        // Update original order
        if (returnOrder.salesOrderId) {
            const order = await SalesOrder.findById(returnOrder.salesOrderId);
            if (order) {
                // Update returned quantities
                for (const returnItem of returnOrder.items) {
                    const orderItem = order.items.id(returnItem.orderItemId);
                    if (orderItem) {
                        orderItem.quantity.returned += returnItem.quantity.received;
                        orderItem.quantity.remaining = orderItem.quantity.ordered -
                            orderItem.quantity.delivered - orderItem.quantity.returned;
                    }
                }

                order.history.push({
                    action: 'return_processed',
                    performedAt: new Date(),
                    details: `Return ${returnOrder.rmaNumber} processed. Refund: ${returnOrder.totals.refundAmount}`
                });

                await order.save();
            }
        }

        await returnOrder.save();
        logger.info(`Refund initiated for return ${returnOrder.rmaNumber}`);
    }

    /**
     * Create replacement order
     * @param {object} returnOrder - Return order
     * @param {object} firmQuery - Firm query filter
     * @param {string} userId - User ID
     */
    async createReplacementOrder(returnOrder, firmQuery, userId) {
        // Get original order
        const originalOrder = await SalesOrder.findById(returnOrder.salesOrderId);
        if (!originalOrder) {
            throw CustomException('Original order not found', 404);
        }

        // Build replacement items
        const replacementItems = returnOrder.items
            .filter(item => item.quantity.received > 0)
            .map(item => ({
                productId: item.productId,
                productName: item.productName,
                productCode: item.productCode,
                quantity: {
                    ordered: item.quantity.received,
                    delivered: 0,
                    invoiced: 0,
                    returned: 0,
                    remaining: item.quantity.received
                },
                pricing: {
                    unitPrice: 0, // Replacement is free
                    listPrice: item.unitPrice,
                    taxRate: 0
                }
            }));

        // Create replacement order
        const replacementOrder = new SalesOrder({
            firmId: firmQuery.firmId,
            lawyerId: originalOrder.lawyerId,
            customerId: originalOrder.customerId,
            customerInfo: originalOrder.customerInfo,
            billingAddress: originalOrder.billingAddress,
            shippingAddress: originalOrder.shippingAddress,

            items: replacementItems,

            totals: {
                subtotal: 0,
                taxTotal: 0,
                grandTotal: 0
            },

            source: 'replacement',
            originalOrderId: originalOrder._id,
            returnOrderId: returnOrder._id,

            notes: `Replacement order for return ${returnOrder.rmaNumber}`,

            createdBy: new mongoose.Types.ObjectId(userId)
        });

        await replacementOrder.save();

        returnOrder.resolution.replacementOrderId = replacementOrder._id;
        returnOrder.resolution.replacementOrderNumber = replacementOrder.orderNumber;
        await returnOrder.save();

        logger.info(`Replacement order ${replacementOrder.orderNumber} created for return ${returnOrder.rmaNumber}`);
        return replacementOrder;
    }

    /**
     * Create credit note
     * @param {object} returnOrder - Return order
     * @param {object} firmQuery - Firm query filter
     * @param {string} userId - User ID
     */
    async createCreditNote(returnOrder, firmQuery, userId) {
        // Build credit note line items
        const lineItems = returnOrder.items
            .filter(item => item.quantity.received > 0)
            .map(item => ({
                type: 'product',
                description: `Return: ${item.productName}`,
                quantity: item.quantity.received,
                unitPrice: item.unitPrice,
                lineTotal: item.quantity.received * item.unitPrice
            }));

        // Create credit note (negative invoice)
        const creditNote = new Invoice({
            firmId: firmQuery.firmId,
            lawyerId: returnOrder.lawyerId,
            clientId: returnOrder.customerId,
            salesOrderId: returnOrder.salesOrderId,
            returnOrderId: returnOrder._id,

            invoiceType: 'credit_note',
            status: 'approved',

            lineItems,

            subtotal: -returnOrder.totals.returnTotal,
            taxAmount: -returnOrder.totals.taxAmount,
            totalAmount: -returnOrder.totals.refundAmount,

            notes: `Credit note for return ${returnOrder.rmaNumber}`,

            createdBy: new mongoose.Types.ObjectId(userId)
        });

        await creditNote.save();

        returnOrder.resolution.creditNoteId = creditNote._id;
        returnOrder.resolution.creditNoteNumber = creditNote.invoiceNumber;
        await returnOrder.save();

        logger.info(`Credit note ${creditNote.invoiceNumber} created for return ${returnOrder.rmaNumber}`);
        return creditNote;
    }

    /**
     * Complete return
     * @param {string} returnId - Return ID
     * @param {object} firmQuery - Firm query filter
     * @param {string} userId - User ID
     */
    async complete(returnId, firmQuery, userId) {
        const returnOrder = await this.getById(returnId, firmQuery);

        if (returnOrder.status !== 'processing') {
            throw CustomException('Return must be in processing status', 400);
        }

        await returnOrder.complete(userId);
        await returnOrder.save();

        logger.info(`Return ${returnOrder.rmaNumber} completed`);
        return returnOrder;
    }

    // ═══════════════════════════════════════════════════════════════
    // 5. SHIPPING
    // ═══════════════════════════════════════════════════════════════

    /**
     * Schedule pickup
     * @param {string} returnId - Return ID
     * @param {object} pickupData - Pickup data
     * @param {object} firmQuery - Firm query filter
     * @param {string} userId - User ID
     */
    async schedulePickup(returnId, pickupData, firmQuery, userId) {
        const returnOrder = await this.getById(returnId, firmQuery);

        if (!['approved', 'awaiting_receipt'].includes(returnOrder.status)) {
            throw CustomException('Return must be approved before scheduling pickup', 400);
        }

        returnOrder.shipping = {
            ...returnOrder.shipping,
            type: 'pickup',
            pickupScheduledDate: pickupData.scheduledDate,
            pickupTimeWindow: pickupData.timeWindow,
            carrierName: pickupData.carrier,
            pickupInstructions: pickupData.instructions,
            status: 'scheduled'
        };

        returnOrder.status = 'awaiting_receipt';

        returnOrder.history.push({
            action: 'pickup_scheduled',
            performedBy: new mongoose.Types.ObjectId(userId),
            performedAt: new Date(),
            details: `Pickup scheduled for ${pickupData.scheduledDate}`
        });

        await returnOrder.save();

        logger.info(`Pickup scheduled for return ${returnOrder.rmaNumber}`);
        return returnOrder;
    }

    /**
     * Generate return label
     * @param {string} returnId - Return ID
     * @param {object} firmQuery - Firm query filter
     */
    async generateReturnLabel(returnId, firmQuery) {
        const returnOrder = await this.getById(returnId, firmQuery);

        if (returnOrder.status !== 'approved') {
            throw CustomException('Return must be approved to generate label', 400);
        }

        // TODO: Integrate with carrier APIs to generate actual return labels

        returnOrder.shipping = {
            ...returnOrder.shipping,
            type: 'drop_off',
            returnLabel: {
                generated: true,
                generatedAt: new Date(),
                // labelUrl: 'Generated label URL',
                // trackingNumber: 'Generated tracking number'
            },
            status: 'label_generated'
        };

        await returnOrder.save();

        logger.info(`Return label generated for ${returnOrder.rmaNumber}`);
        return {
            rmaNumber: returnOrder.rmaNumber,
            labelGenerated: true,
            shipping: returnOrder.shipping
        };
    }

    // ═══════════════════════════════════════════════════════════════
    // 6. ANALYTICS & REPORTING
    // ═══════════════════════════════════════════════════════════════

    /**
     * Get return statistics
     * @param {object} firmQuery - Firm query filter
     * @param {object} dateRange - Date range
     */
    async getStatistics(firmQuery, dateRange = {}) {
        const matchQuery = { ...firmQuery };

        if (dateRange.start) {
            matchQuery.requestDate = { $gte: new Date(dateRange.start) };
        }
        if (dateRange.end) {
            matchQuery.requestDate = {
                ...matchQuery.requestDate,
                $lte: new Date(dateRange.end)
            };
        }

        const [statusStats, reasonStats, valueStats] = await Promise.all([
            // By status
            ReturnOrder.aggregate([
                { $match: matchQuery },
                {
                    $group: {
                        _id: '$status',
                        count: { $sum: 1 }
                    }
                }
            ]),

            // By reason
            ReturnOrder.aggregate([
                { $match: matchQuery },
                {
                    $group: {
                        _id: '$returnReason',
                        count: { $sum: 1 },
                        totalValue: { $sum: '$totals.returnTotal' }
                    }
                },
                { $sort: { count: -1 } }
            ]),

            // Value stats
            ReturnOrder.aggregate([
                { $match: matchQuery },
                {
                    $group: {
                        _id: null,
                        totalReturns: { $sum: 1 },
                        totalValue: { $sum: '$totals.returnTotal' },
                        totalRefunded: { $sum: '$totals.refundAmount' },
                        avgReturnValue: { $avg: '$totals.returnTotal' }
                    }
                }
            ])
        ]);

        return {
            byStatus: statusStats,
            byReason: reasonStats,
            summary: valueStats[0] || {
                totalReturns: 0,
                totalValue: 0,
                totalRefunded: 0,
                avgReturnValue: 0
            }
        };
    }

    /**
     * Get return rate
     * @param {object} firmQuery - Firm query filter
     * @param {object} dateRange - Date range
     */
    async getReturnRate(firmQuery, dateRange = {}) {
        const matchQuery = { ...firmQuery };

        if (dateRange.start) {
            matchQuery.createdAt = { $gte: new Date(dateRange.start) };
        }
        if (dateRange.end) {
            matchQuery.createdAt = {
                ...matchQuery.createdAt,
                $lte: new Date(dateRange.end)
            };
        }

        const [orderCount, returnCount] = await Promise.all([
            SalesOrder.countDocuments({
                ...firmQuery,
                status: { $nin: ['draft', 'cancelled'] },
                ...(dateRange.start ? { orderDate: { $gte: new Date(dateRange.start) } } : {}),
                ...(dateRange.end ? { orderDate: { $lte: new Date(dateRange.end) } } : {})
            }),
            ReturnOrder.countDocuments(matchQuery)
        ]);

        const returnRate = orderCount > 0
            ? ((returnCount / orderCount) * 100).toFixed(2)
            : 0;

        return {
            orderCount,
            returnCount,
            returnRate: parseFloat(returnRate)
        };
    }

    /**
     * Get pending returns
     * @param {object} firmQuery - Firm query filter
     */
    async getPendingReturns(firmQuery) {
        return ReturnOrder.find({
            ...firmQuery,
            status: { $in: ['pending_approval', 'approved', 'awaiting_receipt', 'received'] }
        })
            .populate('customerId', 'displayName companyName')
            .populate('salesOrderId', 'orderNumber')
            .sort({ requestDate: 1 });
    }

    /**
     * Get returns requiring inspection
     * @param {object} firmQuery - Firm query filter
     */
    async getRequiringInspection(firmQuery) {
        return ReturnOrder.find({
            ...firmQuery,
            status: 'received'
        })
            .populate('customerId', 'displayName companyName')
            .sort({ receivedAt: 1 });
    }
}

module.exports = new ReturnsService();
