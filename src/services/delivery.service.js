/**
 * Delivery Service - Enterprise Delivery/Shipping Management
 * Security: All methods require firmId parameter for multi-tenant isolation
 *
 * Handles comprehensive delivery operations:
 * - Delivery note creation and management
 * - Pick-pack-ship workflow
 * - Carrier integration
 * - Proof of delivery
 * - Tracking and notifications
 * - Delivery analytics
 *
 * Inspired by: Odoo Inventory, ERPNext Stock, SAP TM
 */

const DeliveryNote = require('../models/deliveryNote.model');
const SalesOrder = require('../models/salesOrder.model');
const SalesSettings = require('../models/salesSettings.model');
const { CustomException } = require('../utils');
const { sanitizeObjectId } = require('../utils/securityUtils');
const mongoose = require('mongoose');
const logger = require('../utils/logger');

// Helper for regex safety
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

class DeliveryService {
    // ═══════════════════════════════════════════════════════════════
    // 1. DELIVERY NOTE MANAGEMENT
    // ═══════════════════════════════════════════════════════════════

    /**
     * Get delivery note by ID
     * @param {string} deliveryId - Delivery ID
     * @param {object} firmQuery - Firm query filter
     */
    async getById(deliveryId, firmQuery) {
        const sanitizedId = sanitizeObjectId(deliveryId);

        const delivery = await DeliveryNote.findOne({
            _id: sanitizedId,
            ...firmQuery
        })
            .populate('customerId', 'displayName companyName email phone')
            .populate('salesOrderId', 'orderNumber')
            .populate('items.productId', 'name sku')
            .populate('createdBy', 'firstName lastName');

        if (!delivery) {
            throw CustomException('Delivery note not found', 404);
        }

        return delivery;
    }

    /**
     * Get delivery notes list
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

        // Order filter
        if (filters.salesOrderId) {
            query.salesOrderId = new mongoose.Types.ObjectId(sanitizeObjectId(filters.salesOrderId));
        }

        // Date range
        if (filters.startDate || filters.endDate) {
            query.createdAt = {};
            if (filters.startDate) {
                query.createdAt.$gte = new Date(filters.startDate);
            }
            if (filters.endDate) {
                query.createdAt.$lte = new Date(filters.endDate);
            }
        }

        // Search
        if (filters.search) {
            const searchRegex = new RegExp(escapeRegex(filters.search), 'i');
            query.$or = [
                { deliveryNumber: searchRegex },
                { 'customerInfo.name': searchRegex },
                { 'carrier.trackingNumber': searchRegex }
            ];
        }

        // Pagination
        const page = parseInt(filters.page) || 1;
        const limit = parseInt(filters.limit) || 20;
        const skip = (page - 1) * limit;

        const [deliveries, total] = await Promise.all([
            DeliveryNote.find(query)
                .populate('customerId', 'displayName companyName')
                .populate('salesOrderId', 'orderNumber')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            DeliveryNote.countDocuments(query)
        ]);

        return {
            deliveries,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        };
    }

    /**
     * Create delivery note
     * @param {object} deliveryData - Delivery data
     * @param {object} firmQuery - Firm query filter
     * @param {string} userId - User ID
     */
    async create(deliveryData, firmQuery, userId) {
        // Validate sales order if provided
        if (deliveryData.salesOrderId) {
            const order = await SalesOrder.findOne({
                _id: new mongoose.Types.ObjectId(sanitizeObjectId(deliveryData.salesOrderId)),
                ...firmQuery
            });

            if (!order) {
                throw CustomException('Sales order not found', 404);
            }

            // Check order status
            if (!['confirmed', 'processing'].includes(order.status)) {
                throw CustomException('Order must be confirmed before creating delivery', 400);
            }
        }

        const delivery = new DeliveryNote({
            ...deliveryData,
            firmId: firmQuery.firmId,
            createdBy: new mongoose.Types.ObjectId(userId)
        });

        await delivery.save();

        logger.info(`Delivery note ${delivery.deliveryNumber} created`);
        return delivery;
    }

    /**
     * Update delivery note
     * @param {string} deliveryId - Delivery ID
     * @param {object} updates - Updates
     * @param {object} firmQuery - Firm query filter
     * @param {string} userId - User ID
     */
    async update(deliveryId, updates, firmQuery, userId) {
        const sanitizedId = sanitizeObjectId(deliveryId);

        const delivery = await DeliveryNote.findOne({
            _id: sanitizedId,
            ...firmQuery
        });

        if (!delivery) {
            throw CustomException('Delivery note not found', 404);
        }

        // Validate status for updates
        if (['delivered', 'cancelled'].includes(delivery.status)) {
            throw CustomException(`Cannot update ${delivery.status} delivery`, 400);
        }

        // Apply updates
        const allowedUpdates = [
            'shippingAddress', 'scheduledDate', 'deliveryMethod',
            'specialInstructions', 'carrier', 'internalNotes'
        ];

        for (const key of allowedUpdates) {
            if (updates[key] !== undefined) {
                delivery[key] = updates[key];
            }
        }

        delivery.updatedBy = new mongoose.Types.ObjectId(userId);
        await delivery.save();

        logger.info(`Delivery note ${delivery.deliveryNumber} updated`);
        return delivery;
    }

    // ═══════════════════════════════════════════════════════════════
    // 2. PICK-PACK-SHIP WORKFLOW
    // ═══════════════════════════════════════════════════════════════

    /**
     * Start picking process
     * @param {string} deliveryId - Delivery ID
     * @param {object} firmQuery - Firm query filter
     * @param {string} userId - User ID
     */
    async startPicking(deliveryId, firmQuery, userId) {
        const sanitizedId = sanitizeObjectId(deliveryId);

        const delivery = await DeliveryNote.findOne({
            _id: sanitizedId,
            ...firmQuery
        });

        if (!delivery) {
            throw CustomException('Delivery note not found', 404);
        }

        if (delivery.status !== 'pending') {
            throw CustomException('Delivery must be in pending status', 400);
        }

        delivery.status = 'picking';
        delivery.pickingStartedAt = new Date();
        delivery.pickingBy = new mongoose.Types.ObjectId(userId);

        delivery.history.push({
            action: 'picking_started',
            performedBy: new mongoose.Types.ObjectId(userId),
            performedAt: new Date(),
            details: 'Picking process started'
        });

        await delivery.save();

        logger.info(`Picking started for delivery ${delivery.deliveryNumber}`);
        return delivery;
    }

    /**
     * Complete picking and move to packing
     * @param {string} deliveryId - Delivery ID
     * @param {object} pickingData - Picking data
     * @param {object} firmQuery - Firm query filter
     * @param {string} userId - User ID
     */
    async completePicking(deliveryId, pickingData, firmQuery, userId) {
        const sanitizedId = sanitizeObjectId(deliveryId);

        const delivery = await DeliveryNote.findOne({
            _id: sanitizedId,
            ...firmQuery
        });

        if (!delivery) {
            throw CustomException('Delivery note not found', 404);
        }

        if (delivery.status !== 'picking') {
            throw CustomException('Delivery must be in picking status', 400);
        }

        // Update picked quantities
        if (pickingData.items) {
            for (const pickedItem of pickingData.items) {
                const item = delivery.items.id(pickedItem.itemId);
                if (item) {
                    item.quantity.picked = pickedItem.quantityPicked;

                    // Track serial numbers or batches if provided
                    if (pickedItem.serialNumbers) {
                        item.serialNumbers = pickedItem.serialNumbers;
                    }
                    if (pickedItem.batchNumber) {
                        item.batchNumber = pickedItem.batchNumber;
                    }
                }
            }
        }

        delivery.status = 'packing';
        delivery.pickingCompletedAt = new Date();

        delivery.history.push({
            action: 'picking_completed',
            performedBy: new mongoose.Types.ObjectId(userId),
            performedAt: new Date(),
            details: 'Picking completed, moved to packing'
        });

        await delivery.save();

        logger.info(`Picking completed for delivery ${delivery.deliveryNumber}`);
        return delivery;
    }

    /**
     * Complete packing
     * @param {string} deliveryId - Delivery ID
     * @param {object} packingData - Packing data
     * @param {object} firmQuery - Firm query filter
     * @param {string} userId - User ID
     */
    async completePacking(deliveryId, packingData, firmQuery, userId) {
        const sanitizedId = sanitizeObjectId(deliveryId);

        const delivery = await DeliveryNote.findOne({
            _id: sanitizedId,
            ...firmQuery
        });

        if (!delivery) {
            throw CustomException('Delivery note not found', 404);
        }

        if (delivery.status !== 'packing') {
            throw CustomException('Delivery must be in packing status', 400);
        }

        // Add packages
        if (packingData.packages) {
            delivery.packages = packingData.packages.map(pkg => ({
                packageNumber: pkg.packageNumber,
                packageType: pkg.packageType,
                dimensions: pkg.dimensions,
                weight: pkg.weight,
                items: pkg.items
            }));
        }

        // Calculate total weight
        if (delivery.packages && delivery.packages.length > 0) {
            delivery.totalWeight = delivery.packages.reduce(
                (sum, pkg) => sum + (pkg.weight || 0), 0
            );
            delivery.totalPackages = delivery.packages.length;
        }

        delivery.status = 'ready_to_ship';
        delivery.packingCompletedAt = new Date();

        delivery.history.push({
            action: 'packing_completed',
            performedBy: new mongoose.Types.ObjectId(userId),
            performedAt: new Date(),
            details: `${delivery.totalPackages || 1} package(s) packed, ready to ship`
        });

        await delivery.save();

        logger.info(`Packing completed for delivery ${delivery.deliveryNumber}`);
        return delivery;
    }

    /**
     * Ship delivery
     * @param {string} deliveryId - Delivery ID
     * @param {object} shippingData - Shipping data
     * @param {object} firmQuery - Firm query filter
     * @param {string} userId - User ID
     */
    async ship(deliveryId, shippingData, firmQuery, userId) {
        const sanitizedId = sanitizeObjectId(deliveryId);

        const delivery = await DeliveryNote.findOne({
            _id: sanitizedId,
            ...firmQuery
        });

        if (!delivery) {
            throw CustomException('Delivery note not found', 404);
        }

        if (!['ready_to_ship', 'packing'].includes(delivery.status)) {
            throw CustomException('Delivery must be ready to ship', 400);
        }

        // Update carrier info
        delivery.carrier = {
            name: shippingData.carrierName,
            service: shippingData.service,
            trackingNumber: shippingData.trackingNumber,
            trackingUrl: shippingData.trackingUrl,
            awbNumber: shippingData.awbNumber,
            estimatedDeliveryDate: shippingData.estimatedDeliveryDate
        };

        // Use model's ship method
        await delivery.ship(userId);

        // Update related sales order
        if (delivery.salesOrderId) {
            const order = await SalesOrder.findById(delivery.salesOrderId);
            if (order) {
                order.status = 'shipped';
                order.deliveryStatus = 'in_transit';
                order.history.push({
                    action: 'shipped',
                    performedBy: new mongoose.Types.ObjectId(userId),
                    performedAt: new Date(),
                    details: `Shipped via ${shippingData.carrierName}. Tracking: ${shippingData.trackingNumber}`
                });
                await order.save();
            }
        }

        await delivery.save();

        logger.info(`Delivery ${delivery.deliveryNumber} shipped with tracking ${shippingData.trackingNumber}`);
        return delivery;
    }

    // ═══════════════════════════════════════════════════════════════
    // 3. TRACKING & EVENTS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Add tracking event
     * @param {string} deliveryId - Delivery ID
     * @param {object} eventData - Event data
     * @param {object} firmQuery - Firm query filter
     */
    async addTrackingEvent(deliveryId, eventData, firmQuery) {
        const sanitizedId = sanitizeObjectId(deliveryId);

        const delivery = await DeliveryNote.findOne({
            _id: sanitizedId,
            ...firmQuery
        });

        if (!delivery) {
            throw CustomException('Delivery note not found', 404);
        }

        await delivery.addTrackingEvent(
            eventData.status,
            eventData.location,
            eventData.description,
            eventData.timestamp
        );

        await delivery.save();

        logger.info(`Tracking event added to delivery ${delivery.deliveryNumber}: ${eventData.status}`);
        return delivery;
    }

    /**
     * Get tracking history
     * @param {string} deliveryId - Delivery ID
     * @param {object} firmQuery - Firm query filter
     */
    async getTrackingHistory(deliveryId, firmQuery) {
        const delivery = await this.getById(deliveryId, firmQuery);

        return {
            deliveryNumber: delivery.deliveryNumber,
            status: delivery.status,
            carrier: delivery.carrier,
            trackingEvents: delivery.trackingEvents || [],
            estimatedDeliveryDate: delivery.carrier?.estimatedDeliveryDate,
            actualDeliveryDate: delivery.actualDeliveryDate
        };
    }

    /**
     * Sync tracking from carrier
     * @param {string} deliveryId - Delivery ID
     * @param {object} firmQuery - Firm query filter
     */
    async syncTracking(deliveryId, firmQuery) {
        const delivery = await this.getById(deliveryId, firmQuery);

        if (!delivery.carrier?.trackingNumber) {
            throw CustomException('No tracking number available', 400);
        }

        // TODO: Integrate with carrier APIs (DHL, FedEx, Aramex, etc.)
        // This would fetch real-time tracking data from the carrier

        logger.info(`Tracking synced for delivery ${delivery.deliveryNumber}`);
        return delivery;
    }

    // ═══════════════════════════════════════════════════════════════
    // 4. PROOF OF DELIVERY
    // ═══════════════════════════════════════════════════════════════

    /**
     * Record delivery with POD
     * @param {string} deliveryId - Delivery ID
     * @param {object} podData - Proof of delivery data
     * @param {object} firmQuery - Firm query filter
     * @param {string} userId - User ID
     */
    async recordDelivery(deliveryId, podData, firmQuery, userId) {
        const sanitizedId = sanitizeObjectId(deliveryId);

        const delivery = await DeliveryNote.findOne({
            _id: sanitizedId,
            ...firmQuery
        });

        if (!delivery) {
            throw CustomException('Delivery note not found', 404);
        }

        // Update items delivered quantities
        if (podData.items) {
            for (const deliveredItem of podData.items) {
                const item = delivery.items.id(deliveredItem.itemId);
                if (item) {
                    item.quantity.delivered = deliveredItem.quantityDelivered;
                    item.quantity.damaged = deliveredItem.quantityDamaged || 0;
                }
            }
        }

        // Record proof of delivery using model method
        await delivery.recordDelivery(
            podData.receivedBy,
            podData.signature,
            podData.notes,
            podData.photos,
            podData.gpsCoordinates
        );

        // Update related sales order
        if (delivery.salesOrderId) {
            const SalesOrderService = require('./salesOrder.service');
            await SalesOrderService.updateFulfillmentStatus(
                delivery.salesOrderId.toString(),
                firmQuery
            );
        }

        await delivery.save();

        logger.info(`Delivery ${delivery.deliveryNumber} completed with POD`);
        return delivery;
    }

    /**
     * Record failed delivery attempt
     * @param {string} deliveryId - Delivery ID
     * @param {object} attemptData - Attempt data
     * @param {object} firmQuery - Firm query filter
     * @param {string} userId - User ID
     */
    async recordFailedAttempt(deliveryId, attemptData, firmQuery, userId) {
        const sanitizedId = sanitizeObjectId(deliveryId);

        const delivery = await DeliveryNote.findOne({
            _id: sanitizedId,
            ...firmQuery
        });

        if (!delivery) {
            throw CustomException('Delivery note not found', 404);
        }

        await delivery.recordAttempt(
            attemptData.reason,
            attemptData.notes
        );

        // Check max attempts
        const settings = await SalesSettings.findByFirm(firmQuery.firmId);
        const maxAttempts = settings?.delivery?.maxDeliveryAttempts || 3;

        if (delivery.deliveryAttempts?.length >= maxAttempts) {
            delivery.status = 'failed';
            delivery.history.push({
                action: 'max_attempts_reached',
                performedBy: new mongoose.Types.ObjectId(userId),
                performedAt: new Date(),
                details: `Maximum delivery attempts (${maxAttempts}) reached`
            });
        }

        await delivery.save();

        logger.info(`Failed attempt recorded for delivery ${delivery.deliveryNumber}`);
        return delivery;
    }

    // ═══════════════════════════════════════════════════════════════
    // 5. RETURNS & CANCELLATION
    // ═══════════════════════════════════════════════════════════════

    /**
     * Cancel delivery
     * @param {string} deliveryId - Delivery ID
     * @param {string} reason - Cancellation reason
     * @param {object} firmQuery - Firm query filter
     * @param {string} userId - User ID
     */
    async cancel(deliveryId, reason, firmQuery, userId) {
        const sanitizedId = sanitizeObjectId(deliveryId);

        const delivery = await DeliveryNote.findOne({
            _id: sanitizedId,
            ...firmQuery
        });

        if (!delivery) {
            throw CustomException('Delivery note not found', 404);
        }

        if (['delivered', 'cancelled'].includes(delivery.status)) {
            throw CustomException(`Cannot cancel ${delivery.status} delivery`, 400);
        }

        delivery.status = 'cancelled';
        delivery.cancellationReason = reason;
        delivery.cancelledAt = new Date();
        delivery.cancelledBy = new mongoose.Types.ObjectId(userId);

        delivery.history.push({
            action: 'cancelled',
            performedBy: new mongoose.Types.ObjectId(userId),
            performedAt: new Date(),
            details: reason
        });

        await delivery.save();

        logger.info(`Delivery ${delivery.deliveryNumber} cancelled: ${reason}`);
        return delivery;
    }

    /**
     * Create return pickup
     * @param {string} deliveryId - Original delivery ID
     * @param {object} returnData - Return data
     * @param {object} firmQuery - Firm query filter
     * @param {string} userId - User ID
     */
    async createReturnPickup(deliveryId, returnData, firmQuery, userId) {
        const sanitizedId = sanitizeObjectId(deliveryId);

        const originalDelivery = await DeliveryNote.findOne({
            _id: sanitizedId,
            ...firmQuery
        });

        if (!originalDelivery) {
            throw CustomException('Original delivery not found', 404);
        }

        if (originalDelivery.status !== 'delivered') {
            throw CustomException('Can only create return for delivered orders', 400);
        }

        // Create return delivery note
        const returnDelivery = new DeliveryNote({
            firmId: firmQuery.firmId,
            customerId: originalDelivery.customerId,
            customerInfo: originalDelivery.customerInfo,
            salesOrderId: originalDelivery.salesOrderId,
            salesOrderNumber: originalDelivery.salesOrderNumber,

            deliveryType: 'return_pickup',
            originalDeliveryId: originalDelivery._id,

            // Pickup from customer address
            shippingAddress: originalDelivery.shippingAddress,

            items: returnData.items.map(item => ({
                productId: item.productId,
                productName: item.productName,
                quantity: {
                    toDeliver: item.quantity,
                    delivered: 0
                },
                returnReason: item.reason
            })),

            specialInstructions: returnData.instructions,
            createdBy: new mongoose.Types.ObjectId(userId)
        });

        await returnDelivery.save();

        logger.info(`Return pickup ${returnDelivery.deliveryNumber} created`);
        return returnDelivery;
    }

    // ═══════════════════════════════════════════════════════════════
    // 6. ANALYTICS & REPORTING
    // ═══════════════════════════════════════════════════════════════

    /**
     * Get delivery statistics
     * @param {object} firmQuery - Firm query filter
     * @param {object} dateRange - Date range
     */
    async getStatistics(firmQuery, dateRange = {}) {
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

        const [statusStats, deliveryMetrics] = await Promise.all([
            // Status breakdown
            DeliveryNote.aggregate([
                { $match: matchQuery },
                {
                    $group: {
                        _id: '$status',
                        count: { $sum: 1 }
                    }
                }
            ]),

            // Delivery metrics
            DeliveryNote.aggregate([
                { $match: { ...matchQuery, status: 'delivered' } },
                {
                    $project: {
                        deliveryTime: {
                            $subtract: ['$actualDeliveryDate', '$shippedAt']
                        },
                        onTime: {
                            $lte: ['$actualDeliveryDate', '$scheduledDate']
                        }
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalDelivered: { $sum: 1 },
                        avgDeliveryTime: { $avg: '$deliveryTime' },
                        onTimeCount: { $sum: { $cond: ['$onTime', 1, 0] } }
                    }
                }
            ])
        ]);

        const metrics = deliveryMetrics[0] || {
            totalDelivered: 0,
            avgDeliveryTime: 0,
            onTimeCount: 0
        };

        return {
            byStatus: statusStats,
            totalDelivered: metrics.totalDelivered,
            avgDeliveryTimeHours: metrics.avgDeliveryTime
                ? Math.round(metrics.avgDeliveryTime / (1000 * 60 * 60))
                : 0,
            onTimeDeliveryRate: metrics.totalDelivered > 0
                ? ((metrics.onTimeCount / metrics.totalDelivered) * 100).toFixed(2)
                : 0
        };
    }

    /**
     * Get deliveries by carrier
     * @param {object} firmQuery - Firm query filter
     * @param {object} dateRange - Date range
     */
    async getByCarrier(firmQuery, dateRange = {}) {
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

        return DeliveryNote.aggregate([
            { $match: matchQuery },
            {
                $group: {
                    _id: '$carrier.name',
                    carrierName: { $first: '$carrier.name' },
                    totalShipments: { $sum: 1 },
                    delivered: {
                        $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] }
                    },
                    inTransit: {
                        $sum: { $cond: [{ $eq: ['$status', 'in_transit'] }, 1, 0] }
                    },
                    failed: {
                        $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
                    }
                }
            },
            { $sort: { totalShipments: -1 } }
        ]);
    }

    /**
     * Get pending deliveries
     * @param {object} firmQuery - Firm query filter
     */
    async getPendingDeliveries(firmQuery) {
        return DeliveryNote.find({
            ...firmQuery,
            status: { $in: ['pending', 'picking', 'packing', 'ready_to_ship'] }
        })
            .populate('customerId', 'displayName companyName')
            .populate('salesOrderId', 'orderNumber')
            .sort({ scheduledDate: 1 });
    }

    /**
     * Get deliveries in transit
     * @param {object} firmQuery - Firm query filter
     */
    async getInTransit(firmQuery) {
        return DeliveryNote.find({
            ...firmQuery,
            status: 'in_transit'
        })
            .populate('customerId', 'displayName companyName')
            .sort({ shippedAt: 1 });
    }
}

module.exports = new DeliveryService();
