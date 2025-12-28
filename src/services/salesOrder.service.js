/**
 * Sales Order Service - Enterprise Sales Order Management
 * Security: All methods require firmId parameter for multi-tenant isolation
 *
 * Handles comprehensive sales order lifecycle:
 * - Order creation from quotes, leads, or clients
 * - Multi-stage workflow (draft → confirmed → processing → shipped → completed)
 * - Partial delivery and invoicing
 * - Down payment processing
 * - Order modification and cancellation
 * - Fulfillment tracking
 * - Analytics and reporting
 *
 * Inspired by: Odoo Sales, ERPNext Selling, SAP SD
 */

const SalesOrder = require('../models/salesOrder.model');
const Quote = require('../models/quote.model');
const Client = require('../models/client.model');
const Lead = require('../models/lead.model');
const DeliveryNote = require('../models/deliveryNote.model');
const DownPayment = require('../models/downPayment.model');
const SalesSettings = require('../models/salesSettings.model');
const PricingRule = require('../models/pricingRule.model');
const Invoice = require('../models/invoice.model');
const Item = require('../models/item.model');
const { CustomException } = require('../utils');
const { sanitizeObjectId } = require('../utils/securityUtils');
const mongoose = require('mongoose');
const logger = require('../utils/logger');

// Helper for regex safety
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

class SalesOrderService {
    // ═══════════════════════════════════════════════════════════════
    // 1. ORDER CREATION
    // ═══════════════════════════════════════════════════════════════

    /**
     * Create sales order from quote
     * @param {string} quoteId - Quote ID
     * @param {string} firmId - Firm ID (REQUIRED for multi-tenancy)
     * @param {string} userId - User ID
     * @param {object} orderData - Additional order data
     */
    async createFromQuote(quoteId, firmId, userId, orderData = {}) {
        if (!firmId) throw new Error('firmId is required');

        const sanitizedQuoteId = sanitizeObjectId(quoteId);
        const firmObjectId = new mongoose.Types.ObjectId(firmId);

        // Fetch quote with firm isolation
        const quote = await Quote.findOne({
            _id: sanitizedQuoteId,
            firmId: firmObjectId
        });

        if (!quote) {
            throw CustomException('Quote not found', 404);
        }

        if (quote.status !== 'accepted') {
            throw CustomException('Only accepted quotes can be converted to orders', 400);
        }

        // Check if already converted
        if (quote.convertedToOrder) {
            throw CustomException('Quote has already been converted to an order', 400);
        }

        // Get sales settings for defaults
        const settings = await SalesSettings.getOrCreate(firmId, userId);

        // Map quote items to order items
        const items = quote.items.map(item => ({
            productId: item.productId,
            productName: item.description,
            productCode: item.sku,
            description: item.description,
            quantity: {
                ordered: item.quantity,
                delivered: 0,
                invoiced: 0,
                returned: 0,
                remaining: item.quantity
            },
            unitOfMeasure: item.unit || 'unit',
            pricing: {
                listPrice: item.unitPrice,
                unitPrice: item.unitPrice,
                discount: {
                    type: 'percentage',
                    value: item.discount || 0,
                    amount: (item.unitPrice * item.quantity * (item.discount || 0)) / 100
                },
                taxRate: item.taxRate || settings.tax.defaultTaxRate,
                taxAmount: item.taxAmount || 0,
                lineTotal: item.total
            }
        }));

        // Create order
        const order = new SalesOrder({
            firmId: firmObjectId,
            lawyerId: quote.lawyerId,
            quoteId: quote._id,
            quoteNumber: quote.quoteId,

            // Customer info
            customerId: quote.clientId,
            customerInfo: {
                name: quote.customerInfo?.name,
                email: quote.customerInfo?.email,
                phone: quote.customerInfo?.phone,
                company: quote.customerInfo?.company,
                taxId: quote.customerInfo?.taxId
            },

            // Addresses
            billingAddress: quote.billingAddress || quote.customerInfo?.address,
            shippingAddress: quote.shippingAddress || quote.billingAddress || quote.customerInfo?.address,

            // Items
            items,

            // Totals (will be recalculated)
            totals: {
                subtotal: quote.totals.subtotal,
                discountTotal: quote.totals.discountTotal,
                taxTotal: quote.totals.taxTotal,
                shippingTotal: 0,
                grandTotal: quote.totals.grandTotal
            },

            currency: quote.currency,

            // Dates
            orderDate: new Date(),
            expectedDeliveryDate: orderData.expectedDeliveryDate ||
                new Date(Date.now() + settings.salesOrder.defaultDeliveryLeadDays * 24 * 60 * 60 * 1000),

            // Terms
            paymentTerms: quote.paymentTerms || settings.salesOrder.defaultTermsAndConditions,
            termsAndConditions: quote.termsAndConditions,
            incoterms: settings.salesOrder.defaultIncoterms,

            // Salesperson
            salespersonId: quote.createdBy,

            // Metadata
            createdBy: new mongoose.Types.ObjectId(userId),
            source: 'quote',

            ...orderData
        });

        // Calculate totals
        order.calculateOrderTotals();

        await order.save();

        // Update quote
        quote.convertedToOrder = true;
        quote.salesOrderId = order._id;
        await quote.save();

        logger.info(`Sales order ${order.orderNumber} created from quote ${quote.quoteId}`);
        return order;
    }

    /**
     * Create sales order for client
     * @param {string} clientId - Client ID
     * @param {string} firmId - Firm ID (REQUIRED for multi-tenancy)
     * @param {string} userId - User ID
     * @param {object} orderData - Order data
     */
    async createForClient(clientId, firmId, userId, orderData) {
        if (!firmId) throw new Error('firmId is required');

        const sanitizedClientId = sanitizeObjectId(clientId);
        const firmObjectId = new mongoose.Types.ObjectId(firmId);

        // Fetch client with firm isolation
        const client = await Client.findOne({
            _id: sanitizedClientId,
            firmId: firmObjectId
        });

        if (!client) {
            throw CustomException('Client not found', 404);
        }

        // Get sales settings
        const settings = await SalesSettings.getOrCreate(firmId, userId);

        // Build order
        const order = new SalesOrder({
            firmId: firmObjectId,
            lawyerId: new mongoose.Types.ObjectId(userId),
            customerId: client._id,
            customerInfo: {
                name: client.displayName || client.companyName,
                email: client.email,
                phone: client.phone,
                company: client.clientType === 'company' ? client.companyName : null,
                taxId: client.taxId
            },
            billingAddress: client.billingAddress || client.address,
            shippingAddress: client.shippingAddress || client.address,

            items: orderData.items || [],
            currency: orderData.currency || settings.pricing.defaultCurrency,
            orderDate: new Date(),
            expectedDeliveryDate: orderData.expectedDeliveryDate ||
                new Date(Date.now() + settings.salesOrder.defaultDeliveryLeadDays * 24 * 60 * 60 * 1000),

            paymentTerms: orderData.paymentTerms || client.paymentTerms,
            salespersonId: new mongoose.Types.ObjectId(userId),
            createdBy: new mongoose.Types.ObjectId(userId),
            source: 'direct',

            ...orderData
        });

        // Calculate totals
        order.calculateOrderTotals();

        await order.save();

        logger.info(`Sales order ${order.orderNumber} created for client ${client.clientNumber}`);
        return order;
    }

    /**
     * Create sales order from lead
     * @param {string} leadId - Lead ID
     * @param {string} firmId - Firm ID (REQUIRED for multi-tenancy)
     * @param {string} userId - User ID
     * @param {object} orderData - Order data
     */
    async createFromLead(leadId, firmId, userId, orderData) {
        if (!firmId) throw new Error('firmId is required');

        const sanitizedLeadId = sanitizeObjectId(leadId);
        const firmObjectId = new mongoose.Types.ObjectId(firmId);

        // Fetch lead with firm isolation
        const lead = await Lead.findOne({
            _id: sanitizedLeadId,
            firmId: firmObjectId
        });

        if (!lead) {
            throw CustomException('Lead not found', 404);
        }

        // Get sales settings
        const settings = await SalesSettings.getOrCreate(firmId, userId);

        // Build customer info from lead
        const customerInfo = {
            name: lead.type === 'company'
                ? lead.companyName
                : `${lead.firstName || ''} ${lead.lastName || ''}`.trim(),
            email: lead.email,
            phone: lead.phone,
            company: lead.type === 'company' ? lead.companyName : null,
            taxId: lead.taxId
        };

        // Build order
        const order = new SalesOrder({
            firmId: firmObjectId,
            lawyerId: new mongoose.Types.ObjectId(userId),
            leadId: lead._id,
            customerInfo,
            billingAddress: lead.address,
            shippingAddress: lead.address,

            items: orderData.items || [],
            currency: orderData.currency || settings.pricing.defaultCurrency,
            orderDate: new Date(),
            expectedDeliveryDate: orderData.expectedDeliveryDate ||
                new Date(Date.now() + settings.salesOrder.defaultDeliveryLeadDays * 24 * 60 * 60 * 1000),

            salespersonId: lead.assignedTo || new mongoose.Types.ObjectId(userId),
            createdBy: new mongoose.Types.ObjectId(userId),
            source: 'lead',

            ...orderData
        });

        // Calculate totals
        order.calculateOrderTotals();

        await order.save();

        // Update lead status
        lead.stage = 'won';
        lead.convertedToOrder = true;
        await lead.save();

        logger.info(`Sales order ${order.orderNumber} created from lead ${lead.leadId}`);
        return order;
    }

    // ═══════════════════════════════════════════════════════════════
    // 2. ORDER RETRIEVAL
    // ═══════════════════════════════════════════════════════════════

    /**
     * Get order by ID
     * @param {string} orderId - Order ID
     * @param {object} firmQuery - Firm query filter
     */
    async getById(orderId, firmQuery) {
        const sanitizedId = sanitizeObjectId(orderId);

        const order = await SalesOrder.findOne({
            _id: sanitizedId,
            ...firmQuery
        })
            .populate('customerId', 'displayName companyName email phone')
            .populate('salespersonId', 'firstName lastName email')
            .populate('items.productId', 'name sku')
            .populate('createdBy', 'firstName lastName');

        if (!order) {
            throw CustomException('Sales order not found', 404);
        }

        return order;
    }

    /**
     * Get orders list with filters
     * @param {object} firmQuery - Firm query filter
     * @param {object} filters - Filter options
     */
    async getList(firmQuery, filters = {}) {
        const query = { ...firmQuery };

        // Status filter
        if (filters.status) {
            query.status = filters.status;
        }

        // Customer filter
        if (filters.customerId) {
            query.customerId = new mongoose.Types.ObjectId(sanitizeObjectId(filters.customerId));
        }

        // Salesperson filter
        if (filters.salespersonId) {
            query.salespersonId = new mongoose.Types.ObjectId(sanitizeObjectId(filters.salespersonId));
        }

        // Date range
        if (filters.startDate || filters.endDate) {
            query.orderDate = {};
            if (filters.startDate) {
                query.orderDate.$gte = new Date(filters.startDate);
            }
            if (filters.endDate) {
                query.orderDate.$lte = new Date(filters.endDate);
            }
        }

        // Search
        if (filters.search) {
            const searchRegex = new RegExp(escapeRegex(filters.search), 'i');
            query.$or = [
                { orderNumber: searchRegex },
                { 'customerInfo.name': searchRegex },
                { 'customerInfo.company': searchRegex }
            ];
        }

        // Pagination
        const page = parseInt(filters.page) || 1;
        const limit = parseInt(filters.limit) || 20;
        const skip = (page - 1) * limit;

        // Sort
        const sortField = filters.sortBy || 'createdAt';
        const sortOrder = filters.sortOrder === 'asc' ? 1 : -1;

        const [orders, total] = await Promise.all([
            SalesOrder.find(query)
                .populate('customerId', 'displayName companyName')
                .populate('salespersonId', 'firstName lastName')
                .sort({ [sortField]: sortOrder })
                .skip(skip)
                .limit(limit)
                .lean(),
            SalesOrder.countDocuments(query)
        ]);

        return {
            orders,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        };
    }

    // ═══════════════════════════════════════════════════════════════
    // 3. ORDER LIFECYCLE
    // ═══════════════════════════════════════════════════════════════

    /**
     * Confirm order
     * @param {string} orderId - Order ID
     * @param {object} firmQuery - Firm query filter
     * @param {string} userId - User ID
     */
    async confirmOrder(orderId, firmQuery, userId) {
        const sanitizedId = sanitizeObjectId(orderId);

        const order = await SalesOrder.findOne({
            _id: sanitizedId,
            ...firmQuery
        });

        if (!order) {
            throw CustomException('Sales order not found', 404);
        }

        // Check down payment requirements
        const settings = await SalesSettings.findByFirm(firmQuery.firmId);
        if (settings?.salesOrder?.requireDownPayment) {
            const downPaymentPercentage = settings.salesOrder.defaultDownPaymentPercentage || 30;
            const requiredAmount = order.totals.grandTotal * (downPaymentPercentage / 100);

            if (order.totals.paidAmount < requiredAmount) {
                throw CustomException(
                    `Down payment of ${downPaymentPercentage}% (${requiredAmount}) required before confirmation`,
                    400
                );
            }
        }

        // Confirm the order
        await order.confirm(userId);

        logger.info(`Sales order ${order.orderNumber} confirmed by user ${userId}`);
        return order;
    }

    /**
     * Cancel order
     * @param {string} orderId - Order ID
     * @param {object} firmQuery - Firm query filter
     * @param {string} userId - User ID
     * @param {string} reason - Cancellation reason
     */
    async cancelOrder(orderId, firmQuery, userId, reason) {
        const sanitizedId = sanitizeObjectId(orderId);

        const order = await SalesOrder.findOne({
            _id: sanitizedId,
            ...firmQuery
        });

        if (!order) {
            throw CustomException('Sales order not found', 404);
        }

        // Check if can be cancelled
        if (['completed', 'cancelled'].includes(order.status)) {
            throw CustomException(`Cannot cancel order with status: ${order.status}`, 400);
        }

        // Check if has deliveries
        if (order.deliveryStatus !== 'pending' && order.deliveryStatus !== 'not_applicable') {
            throw CustomException('Cannot cancel order with deliveries. Create return order instead.', 400);
        }

        // Cancel the order
        await order.cancel(userId, reason);

        logger.info(`Sales order ${order.orderNumber} cancelled: ${reason}`);
        return order;
    }

    /**
     * Complete order
     * @param {string} orderId - Order ID
     * @param {object} firmQuery - Firm query filter
     * @param {string} userId - User ID
     */
    async completeOrder(orderId, firmQuery, userId) {
        const sanitizedId = sanitizeObjectId(orderId);

        const order = await SalesOrder.findOne({
            _id: sanitizedId,
            ...firmQuery
        });

        if (!order) {
            throw CustomException('Sales order not found', 404);
        }

        // Validate all items delivered and invoiced
        if (order.deliveryStatus !== 'delivered' && order.deliveryStatus !== 'not_applicable') {
            throw CustomException('All items must be delivered before completing', 400);
        }

        if (order.billingStatus !== 'fully_invoiced') {
            throw CustomException('All items must be invoiced before completing', 400);
        }

        order.status = 'completed';
        order.completedAt = new Date();
        order.completedBy = new mongoose.Types.ObjectId(userId);

        order.history.push({
            action: 'completed',
            performedBy: new mongoose.Types.ObjectId(userId),
            performedAt: new Date(),
            details: 'Order completed'
        });

        await order.save();

        logger.info(`Sales order ${order.orderNumber} completed`);
        return order;
    }

    // ═══════════════════════════════════════════════════════════════
    // 4. ORDER ITEMS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Add item to order
     * @param {string} orderId - Order ID
     * @param {object} firmQuery - Firm query filter
     * @param {object} itemData - Item data
     * @param {string} userId - User ID
     */
    async addItem(orderId, firmQuery, itemData, userId) {
        const sanitizedId = sanitizeObjectId(orderId);

        const order = await SalesOrder.findOne({
            _id: sanitizedId,
            ...firmQuery
        });

        if (!order) {
            throw CustomException('Sales order not found', 404);
        }

        if (order.status !== 'draft') {
            throw CustomException('Can only add items to draft orders', 400);
        }

        // Fetch product details if productId provided
        let productDetails = {};
        if (itemData.productId) {
            const product = await Item.findOne({
                _id: new mongoose.Types.ObjectId(sanitizeObjectId(itemData.productId)),
                ...firmQuery
            });

            if (product) {
                productDetails = {
                    productName: product.name,
                    productCode: product.sku,
                    description: product.description,
                    unitOfMeasure: product.uom
                };
            }
        }

        // Build item
        const item = {
            productId: itemData.productId ? new mongoose.Types.ObjectId(itemData.productId) : null,
            ...productDetails,
            ...itemData,
            quantity: {
                ordered: itemData.quantity,
                delivered: 0,
                invoiced: 0,
                returned: 0,
                remaining: itemData.quantity
            },
            pricing: {
                listPrice: itemData.unitPrice,
                unitPrice: itemData.unitPrice,
                discount: itemData.discount || { type: 'percentage', value: 0, amount: 0 },
                taxRate: itemData.taxRate || 15,
                taxAmount: 0,
                lineTotal: 0
            }
        };

        // Calculate item totals
        order.items.push(item);
        order.calculateOrderTotals();

        order.history.push({
            action: 'item_added',
            performedBy: new mongoose.Types.ObjectId(userId),
            performedAt: new Date(),
            details: `Item added: ${item.productName || item.description}`
        });

        await order.save();

        logger.info(`Item added to order ${order.orderNumber}`);
        return order;
    }

    /**
     * Update item in order
     * @param {string} orderId - Order ID
     * @param {string} itemId - Item ID
     * @param {object} firmQuery - Firm query filter
     * @param {object} updates - Item updates
     * @param {string} userId - User ID
     */
    async updateItem(orderId, itemId, firmQuery, updates, userId) {
        const sanitizedOrderId = sanitizeObjectId(orderId);
        const sanitizedItemId = sanitizeObjectId(itemId);

        const order = await SalesOrder.findOne({
            _id: sanitizedOrderId,
            ...firmQuery
        });

        if (!order) {
            throw CustomException('Sales order not found', 404);
        }

        if (order.status !== 'draft') {
            throw CustomException('Can only update items in draft orders', 400);
        }

        const item = order.items.id(sanitizedItemId);
        if (!item) {
            throw CustomException('Item not found in order', 404);
        }

        // Update allowed fields
        const allowedUpdates = ['quantity', 'unitPrice', 'discount', 'description', 'taxRate'];
        for (const key of allowedUpdates) {
            if (updates[key] !== undefined) {
                if (key === 'quantity') {
                    item.quantity.ordered = updates.quantity;
                    item.quantity.remaining = updates.quantity - item.quantity.delivered;
                } else if (key === 'unitPrice') {
                    item.pricing.unitPrice = updates.unitPrice;
                } else if (key === 'discount') {
                    item.pricing.discount = updates.discount;
                } else if (key === 'taxRate') {
                    item.pricing.taxRate = updates.taxRate;
                } else {
                    item[key] = updates[key];
                }
            }
        }

        // Recalculate totals
        order.calculateOrderTotals();

        order.history.push({
            action: 'item_updated',
            performedBy: new mongoose.Types.ObjectId(userId),
            performedAt: new Date(),
            details: `Item updated: ${item.productName || item.description}`
        });

        await order.save();

        logger.info(`Item updated in order ${order.orderNumber}`);
        return order;
    }

    /**
     * Remove item from order
     * @param {string} orderId - Order ID
     * @param {string} itemId - Item ID
     * @param {object} firmQuery - Firm query filter
     * @param {string} userId - User ID
     */
    async removeItem(orderId, itemId, firmQuery, userId) {
        const sanitizedOrderId = sanitizeObjectId(orderId);
        const sanitizedItemId = sanitizeObjectId(itemId);

        const order = await SalesOrder.findOne({
            _id: sanitizedOrderId,
            ...firmQuery
        });

        if (!order) {
            throw CustomException('Sales order not found', 404);
        }

        if (order.status !== 'draft') {
            throw CustomException('Can only remove items from draft orders', 400);
        }

        const item = order.items.id(sanitizedItemId);
        if (!item) {
            throw CustomException('Item not found in order', 404);
        }

        const itemName = item.productName || item.description;
        order.items.pull(sanitizedItemId);

        // Recalculate totals
        order.calculateOrderTotals();

        order.history.push({
            action: 'item_removed',
            performedBy: new mongoose.Types.ObjectId(userId),
            performedAt: new Date(),
            details: `Item removed: ${itemName}`
        });

        await order.save();

        logger.info(`Item removed from order ${order.orderNumber}`);
        return order;
    }

    // ═══════════════════════════════════════════════════════════════
    // 5. PRICING
    // ═══════════════════════════════════════════════════════════════

    /**
     * Apply pricing rules to order
     * @param {string} orderId - Order ID
     * @param {object} firmQuery - Firm query filter
     * @param {string} userId - User ID
     */
    async applyPricingRules(orderId, firmQuery, userId) {
        const sanitizedId = sanitizeObjectId(orderId);

        const order = await SalesOrder.findOne({
            _id: sanitizedId,
            ...firmQuery
        }).populate('customerId');

        if (!order) {
            throw CustomException('Sales order not found', 404);
        }

        // Get applicable pricing rules
        const now = new Date();
        const pricingRules = await PricingRule.find({
            firmId: firmQuery.firmId,
            status: 'active',
            $or: [
                { 'validity.startDate': { $lte: now }, 'validity.endDate': { $gte: now } },
                { 'validity.startDate': { $lte: now }, 'validity.endDate': null }
            ]
        }).sort({ priority: -1 });

        const appliedRules = [];

        // Apply rules to each item
        for (const item of order.items) {
            for (const rule of pricingRules) {
                if (await rule.appliesTo(item, order, order.customerId)) {
                    const discount = await rule.calculateDiscount(item, order);
                    if (discount.amount > 0) {
                        item.pricing.discount = {
                            type: discount.type,
                            value: discount.value,
                            amount: discount.amount,
                            ruleId: rule._id,
                            ruleName: rule.name
                        };

                        appliedRules.push({
                            ruleId: rule._id,
                            ruleName: rule.name,
                            itemId: item._id,
                            discountAmount: discount.amount
                        });

                        // Record rule usage
                        await rule.recordUsage(order._id, discount.amount, order.customerId?._id);

                        break; // Only apply first matching rule per item (unless stacking is enabled)
                    }
                }
            }
        }

        // Recalculate totals
        order.calculateOrderTotals();
        order.appliedPricingRules = appliedRules;

        order.history.push({
            action: 'pricing_applied',
            performedBy: new mongoose.Types.ObjectId(userId),
            performedAt: new Date(),
            details: `${appliedRules.length} pricing rules applied`
        });

        await order.save();

        logger.info(`Pricing rules applied to order ${order.orderNumber}`);
        return { order, appliedRules };
    }

    /**
     * Apply discount to order
     * @param {string} orderId - Order ID
     * @param {object} firmQuery - Firm query filter
     * @param {object} discount - Discount data
     * @param {string} userId - User ID
     */
    async applyDiscount(orderId, firmQuery, discount, userId) {
        const sanitizedId = sanitizeObjectId(orderId);

        const order = await SalesOrder.findOne({
            _id: sanitizedId,
            ...firmQuery
        });

        if (!order) {
            throw CustomException('Sales order not found', 404);
        }

        // Validate discount
        const settings = await SalesSettings.findByFirm(firmQuery.firmId);
        const maxDiscount = settings?.pricing?.maxOrderDiscountPercent || 30;

        if (discount.type === 'percentage' && discount.value > maxDiscount) {
            throw CustomException(`Discount cannot exceed ${maxDiscount}%`, 400);
        }

        // Apply order-level discount
        order.discount = {
            type: discount.type,
            value: discount.value,
            reason: discount.reason,
            appliedBy: new mongoose.Types.ObjectId(userId),
            appliedAt: new Date()
        };

        // Recalculate totals
        order.calculateOrderTotals();

        order.history.push({
            action: 'discount_applied',
            performedBy: new mongoose.Types.ObjectId(userId),
            performedAt: new Date(),
            details: `${discount.type === 'percentage' ? discount.value + '%' : discount.value} discount applied`
        });

        await order.save();

        logger.info(`Discount applied to order ${order.orderNumber}`);
        return order;
    }

    // ═══════════════════════════════════════════════════════════════
    // 6. FULFILLMENT
    // ═══════════════════════════════════════════════════════════════

    /**
     * Create delivery note from order
     * @param {string} orderId - Order ID
     * @param {object} firmQuery - Firm query filter
     * @param {object} deliveryData - Delivery data
     * @param {string} userId - User ID
     */
    async createDeliveryNote(orderId, firmQuery, deliveryData, userId) {
        const sanitizedId = sanitizeObjectId(orderId);

        const order = await SalesOrder.findOne({
            _id: sanitizedId,
            ...firmQuery
        });

        if (!order) {
            throw CustomException('Sales order not found', 404);
        }

        if (!['confirmed', 'processing'].includes(order.status)) {
            throw CustomException('Order must be confirmed before creating delivery', 400);
        }

        // Filter items to deliver
        const itemsToDeliver = deliveryData.items || order.items.filter(
            item => item.quantity.remaining > 0
        ).map(item => ({
            orderItemId: item._id,
            productId: item.productId,
            productName: item.productName,
            quantityOrdered: item.quantity.ordered,
            quantityToDeliver: item.quantity.remaining
        }));

        if (itemsToDeliver.length === 0) {
            throw CustomException('No items available for delivery', 400);
        }

        // Create delivery note
        const deliveryNote = new DeliveryNote({
            firmId: firmQuery.firmId,
            lawyerId: order.lawyerId,
            salesOrderId: order._id,
            salesOrderNumber: order.orderNumber,
            customerId: order.customerId,
            customerInfo: order.customerInfo,
            shippingAddress: deliveryData.shippingAddress || order.shippingAddress,

            items: itemsToDeliver.map(item => ({
                orderItemId: item.orderItemId,
                productId: item.productId,
                productName: item.productName,
                productCode: item.productCode,
                quantity: {
                    ordered: item.quantityOrdered,
                    toDeliver: item.quantityToDeliver,
                    delivered: 0
                }
            })),

            scheduledDate: deliveryData.scheduledDate,
            deliveryMethod: deliveryData.deliveryMethod || 'standard',
            carrier: deliveryData.carrier,
            specialInstructions: deliveryData.specialInstructions,

            createdBy: new mongoose.Types.ObjectId(userId)
        });

        await deliveryNote.save();

        // Update order status
        order.status = 'processing';
        order.history.push({
            action: 'delivery_created',
            performedBy: new mongoose.Types.ObjectId(userId),
            performedAt: new Date(),
            details: `Delivery note ${deliveryNote.deliveryNumber} created`
        });

        await order.save();

        logger.info(`Delivery note ${deliveryNote.deliveryNumber} created for order ${order.orderNumber}`);
        return deliveryNote;
    }

    /**
     * Update fulfillment status based on deliveries
     * @param {string} orderId - Order ID
     * @param {object} firmQuery - Firm query filter
     */
    async updateFulfillmentStatus(orderId, firmQuery) {
        const sanitizedId = sanitizeObjectId(orderId);

        const order = await SalesOrder.findOne({
            _id: sanitizedId,
            ...firmQuery
        });

        if (!order) {
            throw CustomException('Sales order not found', 404);
        }

        // Get all delivery notes for this order
        const deliveryNotes = await DeliveryNote.find({
            salesOrderId: order._id,
            status: 'delivered'
        });

        // Calculate delivered quantities
        const deliveredQuantities = {};
        for (const dn of deliveryNotes) {
            for (const item of dn.items) {
                const key = item.orderItemId.toString();
                deliveredQuantities[key] = (deliveredQuantities[key] || 0) + item.quantity.delivered;
            }
        }

        // Update order items
        let allDelivered = true;
        let anyDelivered = false;

        for (const item of order.items) {
            const delivered = deliveredQuantities[item._id.toString()] || 0;
            item.quantity.delivered = delivered;
            item.quantity.remaining = item.quantity.ordered - delivered - item.quantity.returned;

            if (delivered > 0) anyDelivered = true;
            if (item.quantity.remaining > 0) allDelivered = false;
        }

        // Update order delivery status
        if (allDelivered) {
            order.deliveryStatus = 'delivered';
        } else if (anyDelivered) {
            order.deliveryStatus = 'partially_delivered';
        } else {
            order.deliveryStatus = 'pending';
        }

        await order.save();

        return order;
    }

    // ═══════════════════════════════════════════════════════════════
    // 7. INVOICING
    // ═══════════════════════════════════════════════════════════════

    /**
     * Create invoice from order
     * @param {string} orderId - Order ID
     * @param {object} firmQuery - Firm query filter
     * @param {object} invoiceData - Invoice data
     * @param {string} userId - User ID
     */
    async createInvoice(orderId, firmQuery, invoiceData, userId) {
        const sanitizedId = sanitizeObjectId(orderId);

        const order = await SalesOrder.findOne({
            _id: sanitizedId,
            ...firmQuery
        }).populate('customerId');

        if (!order) {
            throw CustomException('Sales order not found', 404);
        }

        if (!['confirmed', 'processing', 'shipped'].includes(order.status)) {
            throw CustomException('Order must be confirmed before invoicing', 400);
        }

        // Calculate uninvoiced items
        const itemsToInvoice = invoiceData.items || order.items.filter(
            item => item.quantity.ordered - item.quantity.invoiced > 0
        ).map(item => ({
            orderItemId: item._id,
            description: item.productName || item.description,
            quantity: item.quantity.ordered - item.quantity.invoiced,
            unitPrice: item.pricing.unitPrice,
            discount: item.pricing.discount,
            taxRate: item.pricing.taxRate
        }));

        if (itemsToInvoice.length === 0) {
            throw CustomException('No items available for invoicing', 400);
        }

        // Build line items
        const lineItems = itemsToInvoice.map(item => ({
            type: 'product',
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discountType: item.discount?.type || 'percentage',
            discountValue: item.discount?.value || 0,
            taxable: item.taxRate > 0,
            taxRate: item.taxRate,
            lineTotal: item.quantity * item.unitPrice * (1 - (item.discount?.value || 0) / 100)
        }));

        // Calculate totals
        let subtotal = lineItems.reduce((sum, item) => sum + item.lineTotal, 0);
        let taxAmount = lineItems.reduce((sum, item) =>
            sum + (item.taxable ? item.lineTotal * (item.taxRate / 100) : 0), 0);

        // Create invoice
        const invoice = new Invoice({
            firmId: firmQuery.firmId,
            lawyerId: order.lawyerId,
            clientId: order.customerId,
            salesOrderId: order._id,

            invoiceType: 'standard',
            status: 'draft',

            lineItems,

            subtotal,
            taxAmount,
            discountAmount: 0,
            totalAmount: subtotal + taxAmount,

            currency: order.currency,

            dueDate: invoiceData.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),

            createdBy: new mongoose.Types.ObjectId(userId)
        });

        await invoice.save();

        // Update order items invoiced quantities
        for (const item of itemsToInvoice) {
            const orderItem = order.items.id(item.orderItemId);
            if (orderItem) {
                orderItem.quantity.invoiced += item.quantity;
            }
        }

        // Update billing status
        const allInvoiced = order.items.every(
            item => item.quantity.invoiced >= item.quantity.ordered
        );
        const anyInvoiced = order.items.some(item => item.quantity.invoiced > 0);

        if (allInvoiced) {
            order.billingStatus = 'fully_invoiced';
        } else if (anyInvoiced) {
            order.billingStatus = 'partially_invoiced';
        }

        order.history.push({
            action: 'invoice_created',
            performedBy: new mongoose.Types.ObjectId(userId),
            performedAt: new Date(),
            details: `Invoice ${invoice.invoiceNumber} created`
        });

        await order.save();

        logger.info(`Invoice ${invoice.invoiceNumber} created for order ${order.orderNumber}`);
        return invoice;
    }

    // ═══════════════════════════════════════════════════════════════
    // 8. PAYMENTS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Record payment for order
     * @param {string} orderId - Order ID
     * @param {object} firmQuery - Firm query filter
     * @param {object} paymentData - Payment data
     * @param {string} userId - User ID
     */
    async recordPayment(orderId, firmQuery, paymentData, userId) {
        const sanitizedId = sanitizeObjectId(orderId);

        const order = await SalesOrder.findOne({
            _id: sanitizedId,
            ...firmQuery
        });

        if (!order) {
            throw CustomException('Sales order not found', 404);
        }

        const paymentAmount = paymentData.amount;

        // Update payment totals
        order.totals.paidAmount = (order.totals.paidAmount || 0) + paymentAmount;
        order.totals.balanceDue = order.totals.grandTotal - order.totals.paidAmount;

        // Update payment status
        if (order.totals.balanceDue <= 0) {
            order.paymentStatus = 'paid';
        } else if (order.totals.paidAmount > 0) {
            order.paymentStatus = 'partially_paid';
        }

        // Record payment in history
        if (!order.payments) {
            order.payments = [];
        }

        order.payments.push({
            amount: paymentAmount,
            method: paymentData.method,
            reference: paymentData.reference,
            date: paymentData.date || new Date(),
            recordedBy: new mongoose.Types.ObjectId(userId)
        });

        order.history.push({
            action: 'payment_received',
            performedBy: new mongoose.Types.ObjectId(userId),
            performedAt: new Date(),
            details: `Payment of ${paymentAmount} received via ${paymentData.method}`
        });

        await order.save();

        logger.info(`Payment of ${paymentAmount} recorded for order ${order.orderNumber}`);
        return order;
    }

    // ═══════════════════════════════════════════════════════════════
    // 9. ANALYTICS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Get order statistics
     * @param {object} firmQuery - Firm query filter
     * @param {object} dateRange - Date range
     */
    async getStatistics(firmQuery, dateRange = {}) {
        const matchQuery = { ...firmQuery };

        if (dateRange.start) {
            matchQuery.orderDate = { $gte: new Date(dateRange.start) };
        }
        if (dateRange.end) {
            matchQuery.orderDate = {
                ...matchQuery.orderDate,
                $lte: new Date(dateRange.end)
            };
        }

        const [statusStats, valueStats, totalOrders] = await Promise.all([
            // Status breakdown
            SalesOrder.aggregate([
                { $match: matchQuery },
                {
                    $group: {
                        _id: '$status',
                        count: { $sum: 1 },
                        totalValue: { $sum: '$totals.grandTotal' }
                    }
                }
            ]),

            // Overall value stats
            SalesOrder.aggregate([
                { $match: matchQuery },
                {
                    $group: {
                        _id: null,
                        totalValue: { $sum: '$totals.grandTotal' },
                        avgValue: { $avg: '$totals.grandTotal' },
                        maxValue: { $max: '$totals.grandTotal' },
                        minValue: { $min: '$totals.grandTotal' },
                        totalPaid: { $sum: '$totals.paidAmount' }
                    }
                }
            ]),

            // Total count
            SalesOrder.countDocuments(matchQuery)
        ]);

        return {
            totalOrders,
            byStatus: statusStats,
            valueMetrics: valueStats[0] || {
                totalValue: 0,
                avgValue: 0,
                maxValue: 0,
                minValue: 0,
                totalPaid: 0
            }
        };
    }

    /**
     * Get sales by salesperson
     * @param {object} firmQuery - Firm query filter
     * @param {object} dateRange - Date range
     */
    async getSalesBySalesperson(firmQuery, dateRange = {}) {
        const matchQuery = {
            ...firmQuery,
            status: { $nin: ['draft', 'cancelled'] }
        };

        if (dateRange.start) {
            matchQuery.orderDate = { $gte: new Date(dateRange.start) };
        }
        if (dateRange.end) {
            matchQuery.orderDate = {
                ...matchQuery.orderDate,
                $lte: new Date(dateRange.end)
            };
        }

        return SalesOrder.aggregate([
            { $match: matchQuery },
            {
                $group: {
                    _id: '$salespersonId',
                    orderCount: { $sum: 1 },
                    totalValue: { $sum: '$totals.grandTotal' },
                    avgOrderValue: { $avg: '$totals.grandTotal' }
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'salesperson'
                }
            },
            { $unwind: '$salesperson' },
            {
                $project: {
                    salespersonId: '$_id',
                    salespersonName: {
                        $concat: ['$salesperson.firstName', ' ', '$salesperson.lastName']
                    },
                    orderCount: 1,
                    totalValue: 1,
                    avgOrderValue: 1
                }
            },
            { $sort: { totalValue: -1 } }
        ]);
    }

    /**
     * Get top customers by order value
     * @param {object} firmQuery - Firm query filter
     * @param {number} limit - Number of customers to return
     * @param {object} dateRange - Date range
     */
    async getTopCustomers(firmQuery, limit = 10, dateRange = {}) {
        const matchQuery = {
            ...firmQuery,
            status: { $nin: ['draft', 'cancelled'] }
        };

        if (dateRange.start) {
            matchQuery.orderDate = { $gte: new Date(dateRange.start) };
        }
        if (dateRange.end) {
            matchQuery.orderDate = {
                ...matchQuery.orderDate,
                $lte: new Date(dateRange.end)
            };
        }

        return SalesOrder.aggregate([
            { $match: matchQuery },
            {
                $group: {
                    _id: '$customerId',
                    customerName: { $first: '$customerInfo.name' },
                    orderCount: { $sum: 1 },
                    totalValue: { $sum: '$totals.grandTotal' },
                    avgOrderValue: { $avg: '$totals.grandTotal' }
                }
            },
            { $sort: { totalValue: -1 } },
            { $limit: limit }
        ]);
    }
}

module.exports = new SalesOrderService();
