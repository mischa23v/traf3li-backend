/**
 * Subcontracting Service
 *
 * Manages subcontracting operations where raw materials are sent to suppliers
 * for processing and finished goods are received back.
 *
 * Features:
 * - Subcontracting order management (create, update, submit, cancel)
 * - Receipt management (receive finished goods, track materials)
 * - Material transfer and consumption tracking
 * - Stats and analytics
 * - Settings management
 *
 * Workflow:
 * 1. Create order with raw materials and expected finished goods
 * 2. Submit order (transfers raw materials to supplier warehouse)
 * 3. Create receipt when goods are ready
 * 4. Submit receipt (receives finished goods, records consumed/returned materials)
 */

const mongoose = require('mongoose');
const SubcontractingOrder = require('../models/subcontractingOrder.model');
const SubcontractingReceipt = require('../models/subcontractingReceipt.model');
const SubcontractingSettings = require('../models/subcontractingSettings.model');
const StockEntry = require('../models/stockEntry.model');
const logger = require('../utils/logger');

class SubcontractingService {
    // ═══════════════════════════════════════════════════════════════
    // ORDER MANAGEMENT
    // ═══════════════════════════════════════════════════════════════

    /**
     * Get orders with filters
     * @param {Object} query - Query filters
     * @param {String} firmId - Firm ID
     * @returns {Promise<Array>} - List of orders
     */
    async getOrders(query, firmId) {
        try {
            const {
                status,
                supplierId,
                dateFrom,
                dateTo,
                page = 1,
                limit = 50
            } = query;

            // Build filter
            const filter = { firmId };

            if (status) {
                filter.status = status;
            }

            if (supplierId) {
                filter.supplierId = new mongoose.Types.ObjectId(supplierId);
            }

            if (dateFrom || dateTo) {
                filter.orderDate = {};
                if (dateFrom) {
                    filter.orderDate.$gte = new Date(dateFrom);
                }
                if (dateTo) {
                    filter.orderDate.$lte = new Date(dateTo);
                }
            }

            // Pagination
            const skip = (parseInt(page) - 1) * parseInt(limit);

            const orders = await SubcontractingOrder.find(filter)
                .populate('supplierId', 'supplierName email phone')
                .populate('supplierWarehouse', 'name warehouseId')
                .populate('rawMaterialWarehouse', 'name warehouseId')
                .populate('finishedGoodsWarehouse', 'name warehouseId')
                .populate('createdBy', 'firstName lastName')
                .populate('updatedBy', 'firstName lastName')
                .sort({ orderDate: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .lean();

            return orders;
        } catch (error) {
            logger.error('SubcontractingService.getOrders failed:', error.message);
            return null;
        }
    }

    /**
     * Get order by ID
     * @param {String} id - Order ID
     * @param {String} firmId - Firm ID
     * @returns {Promise<Object|null>} - Order or null
     */
    async getOrderById(id, firmId) {
        try {
            const order = await SubcontractingOrder.findOne({
                _id: id,
                firmId
            })
                .populate('supplierId', 'supplierName email phone address')
                .populate('supplierWarehouse', 'name warehouseId address')
                .populate('rawMaterialWarehouse', 'name warehouseId address')
                .populate('finishedGoodsWarehouse', 'name warehouseId address')
                .populate('serviceItems.itemId', 'itemCode itemName')
                .populate('rawMaterials.itemId', 'itemCode itemName')
                .populate('finishedGoods.itemId', 'itemCode itemName')
                .populate('createdBy', 'firstName lastName email')
                .populate('updatedBy', 'firstName lastName email')
                .lean();

            return order;
        } catch (error) {
            logger.error('SubcontractingService.getOrderById failed:', error.message);
            return null;
        }
    }

    /**
     * Create new subcontracting order
     * @param {Object} data - Order data
     * @param {String} firmId - Firm ID
     * @param {String} userId - User ID
     * @returns {Promise<Object|null>} - Created order or null
     */
    async createOrder(data, firmId, userId) {
        try {
            const orderData = {
                ...data,
                firmId: new mongoose.Types.ObjectId(firmId),
                createdBy: new mongoose.Types.ObjectId(userId),
                status: 'draft',
                docStatus: 0
            };

            const order = await SubcontractingOrder.create(orderData);

            logger.info('SubcontractingService.createOrder: Order created', {
                orderId: order._id,
                orderNumber: order.orderNumber,
                firmId,
                userId
            });

            return await this.getOrderById(order._id, firmId);
        } catch (error) {
            logger.error('SubcontractingService.createOrder failed:', error.message);
            return null;
        }
    }

    /**
     * Update subcontracting order
     * @param {String} id - Order ID
     * @param {Object} data - Update data
     * @param {String} firmId - Firm ID
     * @param {String} userId - User ID
     * @returns {Promise<Object|null>} - Updated order or null
     */
    async updateOrder(id, data, firmId, userId) {
        try {
            const order = await SubcontractingOrder.findOne({
                _id: id,
                firmId
            });

            if (!order) {
                logger.error('SubcontractingService.updateOrder: Order not found');
                return null;
            }

            if (order.status !== 'draft') {
                logger.error('SubcontractingService.updateOrder: Can only update draft orders');
                return null;
            }

            // Update fields
            Object.assign(order, data);
            order.updatedBy = new mongoose.Types.ObjectId(userId);

            await order.save();

            logger.info('SubcontractingService.updateOrder: Order updated', {
                orderId: order._id,
                orderNumber: order.orderNumber,
                firmId,
                userId
            });

            return await this.getOrderById(order._id, firmId);
        } catch (error) {
            logger.error('SubcontractingService.updateOrder failed:', error.message);
            return null;
        }
    }

    /**
     * Submit order - transfers raw materials to supplier
     * @param {String} id - Order ID
     * @param {String} firmId - Firm ID
     * @param {String} userId - User ID
     * @returns {Promise<Object|null>} - Submitted order or null
     */
    async submitOrder(id, firmId, userId) {
        try {
            const order = await SubcontractingOrder.findOne({
                _id: id,
                firmId
            });

            if (!order) {
                logger.error('SubcontractingService.submitOrder: Order not found');
                return null;
            }

            // Submit the order
            await order.submit(userId);

            // Transfer raw materials to supplier warehouse
            const transferResult = await this.transferRawMaterials(id, firmId, userId);

            if (!transferResult) {
                logger.warn('SubcontractingService.submitOrder: Material transfer failed, but order was submitted');
            }

            logger.info('SubcontractingService.submitOrder: Order submitted', {
                orderId: order._id,
                orderNumber: order.orderNumber,
                firmId,
                userId,
                materialTransferred: !!transferResult
            });

            return await this.getOrderById(order._id, firmId);
        } catch (error) {
            logger.error('SubcontractingService.submitOrder failed:', error.message);
            return null;
        }
    }

    /**
     * Cancel order
     * @param {String} id - Order ID
     * @param {String} firmId - Firm ID
     * @param {String} userId - User ID
     * @returns {Promise<Object|null>} - Cancelled order or null
     */
    async cancelOrder(id, firmId, userId) {
        try {
            const order = await SubcontractingOrder.findOne({
                _id: id,
                firmId
            });

            if (!order) {
                logger.error('SubcontractingService.cancelOrder: Order not found');
                return null;
            }

            await order.cancel(userId);

            logger.info('SubcontractingService.cancelOrder: Order cancelled', {
                orderId: order._id,
                orderNumber: order.orderNumber,
                firmId,
                userId
            });

            return await this.getOrderById(order._id, firmId);
        } catch (error) {
            logger.error('SubcontractingService.cancelOrder failed:', error.message);
            return null;
        }
    }

    /**
     * Delete order (only draft orders)
     * @param {String} id - Order ID
     * @param {String} firmId - Firm ID
     * @returns {Promise<Boolean>} - Success status
     */
    async deleteOrder(id, firmId) {
        try {
            const order = await SubcontractingOrder.findOne({
                _id: id,
                firmId
            });

            if (!order) {
                logger.error('SubcontractingService.deleteOrder: Order not found');
                return false;
            }

            if (order.status !== 'draft') {
                logger.error('SubcontractingService.deleteOrder: Can only delete draft orders');
                return false;
            }

            await order.deleteOne();

            logger.info('SubcontractingService.deleteOrder: Order deleted', {
                orderId: order._id,
                orderNumber: order.orderNumber,
                firmId
            });

            return true;
        } catch (error) {
            logger.error('SubcontractingService.deleteOrder failed:', error.message);
            return false;
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // RECEIPT MANAGEMENT
    // ═══════════════════════════════════════════════════════════════

    /**
     * Get receipts with filters
     * @param {Object} query - Query filters
     * @param {String} firmId - Firm ID
     * @returns {Promise<Array>} - List of receipts
     */
    async getReceipts(query, firmId) {
        try {
            const {
                status,
                supplierId,
                subcontractingOrderId,
                dateFrom,
                dateTo,
                page = 1,
                limit = 50
            } = query;

            // Build filter
            const filter = { firmId };

            if (status) {
                filter.status = status;
            }

            if (supplierId) {
                filter.supplierId = new mongoose.Types.ObjectId(supplierId);
            }

            if (subcontractingOrderId) {
                filter.subcontractingOrderId = new mongoose.Types.ObjectId(subcontractingOrderId);
            }

            if (dateFrom || dateTo) {
                filter.postingDate = {};
                if (dateFrom) {
                    filter.postingDate.$gte = new Date(dateFrom);
                }
                if (dateTo) {
                    filter.postingDate.$lte = new Date(dateTo);
                }
            }

            // Pagination
            const skip = (parseInt(page) - 1) * parseInt(limit);

            const receipts = await SubcontractingReceipt.find(filter)
                .populate('subcontractingOrderId', 'orderNumber subcontractingOrderId')
                .populate('supplierId', 'supplierName email phone')
                .populate('createdBy', 'firstName lastName')
                .populate('updatedBy', 'firstName lastName')
                .sort({ postingDate: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .lean();

            return receipts;
        } catch (error) {
            logger.error('SubcontractingService.getReceipts failed:', error.message);
            return null;
        }
    }

    /**
     * Get receipt by ID
     * @param {String} id - Receipt ID
     * @param {String} firmId - Firm ID
     * @returns {Promise<Object|null>} - Receipt or null
     */
    async getReceiptById(id, firmId) {
        try {
            const receipt = await SubcontractingReceipt.findOne({
                _id: id,
                firmId
            })
                .populate('subcontractingOrderId', 'orderNumber subcontractingOrderId serviceItems rawMaterials finishedGoods')
                .populate('supplierId', 'supplierName email phone address')
                .populate('finishedGoods.itemId', 'itemCode itemName')
                .populate('returnedMaterials.itemId', 'itemCode itemName')
                .populate('consumedMaterials.itemId', 'itemCode itemName')
                .populate('createdBy', 'firstName lastName email')
                .populate('updatedBy', 'firstName lastName email')
                .lean();

            return receipt;
        } catch (error) {
            logger.error('SubcontractingService.getReceiptById failed:', error.message);
            return null;
        }
    }

    /**
     * Create new receipt
     * @param {Object} data - Receipt data
     * @param {String} firmId - Firm ID
     * @param {String} userId - User ID
     * @returns {Promise<Object|null>} - Created receipt or null
     */
    async createReceipt(data, firmId, userId) {
        try {
            // Verify order exists and belongs to firm
            const order = await SubcontractingOrder.findOne({
                _id: data.subcontractingOrderId,
                firmId
            });

            if (!order) {
                logger.error('SubcontractingService.createReceipt: Order not found');
                return null;
            }

            if (order.status !== 'submitted' && order.status !== 'partially_received') {
                logger.error('SubcontractingService.createReceipt: Order must be submitted');
                return null;
            }

            const receiptData = {
                ...data,
                firmId: new mongoose.Types.ObjectId(firmId),
                orderNumber: order.orderNumber,
                supplierId: order.supplierId,
                supplierName: order.supplierName,
                createdBy: new mongoose.Types.ObjectId(userId),
                status: 'draft',
                docStatus: 0
            };

            const receipt = await SubcontractingReceipt.create(receiptData);

            logger.info('SubcontractingService.createReceipt: Receipt created', {
                receiptId: receipt._id,
                receiptNumber: receipt.receiptNumber,
                orderId: order._id,
                firmId,
                userId
            });

            return await this.getReceiptById(receipt._id, firmId);
        } catch (error) {
            logger.error('SubcontractingService.createReceipt failed:', error.message);
            return null;
        }
    }

    /**
     * Submit receipt - receives finished goods and handles materials
     * @param {String} id - Receipt ID
     * @param {String} firmId - Firm ID
     * @param {String} userId - User ID
     * @returns {Promise<Object|null>} - Submitted receipt or null
     */
    async submitReceipt(id, firmId, userId) {
        try {
            const receipt = await SubcontractingReceipt.findOne({
                _id: id,
                firmId
            });

            if (!receipt) {
                logger.error('SubcontractingService.submitReceipt: Receipt not found');
                return null;
            }

            // Submit the receipt
            await receipt.submit(userId);

            // Receive finished goods
            const receiveResult = await this.receiveFinishedGoods(id, firmId, userId);

            if (!receiveResult) {
                logger.warn('SubcontractingService.submitReceipt: Finished goods receipt failed, but receipt was submitted');
            }

            // Handle returned materials
            if (receipt.returnedMaterials && receipt.returnedMaterials.length > 0) {
                const returnResult = await this.handleReturnedMaterials(id, firmId, userId);
                if (!returnResult) {
                    logger.warn('SubcontractingService.submitReceipt: Returned materials handling failed');
                }
            }

            logger.info('SubcontractingService.submitReceipt: Receipt submitted', {
                receiptId: receipt._id,
                receiptNumber: receipt.receiptNumber,
                firmId,
                userId,
                finishedGoodsReceived: !!receiveResult
            });

            return await this.getReceiptById(receipt._id, firmId);
        } catch (error) {
            logger.error('SubcontractingService.submitReceipt failed:', error.message);
            return null;
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // STATS & SETTINGS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Get subcontracting statistics
     * @param {String} firmId - Firm ID
     * @returns {Promise<Object|null>} - Stats or null
     */
    async getStats(firmId) {
        try {
            // Get pending orders
            const pendingOrders = await SubcontractingOrder.countDocuments({
                firmId,
                status: { $in: ['submitted', 'partially_received'] }
            });

            // Get orders by status
            const ordersByStatus = await SubcontractingOrder.aggregate([
                { $match: { firmId: new mongoose.Types.ObjectId(firmId) } },
                { $group: { _id: '$status', count: { $sum: 1 } } }
            ]);

            // Get total material value in orders
            const materialValue = await SubcontractingOrder.aggregate([
                {
                    $match: {
                        firmId: new mongoose.Types.ObjectId(firmId),
                        status: { $in: ['submitted', 'partially_received'] }
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalRawMaterialCost: { $sum: '$totalRawMaterialCost' },
                        totalServiceCost: { $sum: '$totalServiceCost' },
                        grandTotal: { $sum: '$grandTotal' }
                    }
                }
            ]);

            // Get recent receipts (last 30 days)
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            const recentReceipts = await SubcontractingReceipt.countDocuments({
                firmId,
                status: 'submitted',
                postingDate: { $gte: thirtyDaysAgo }
            });

            // Get overdue orders
            const overdueOrders = await SubcontractingOrder.countDocuments({
                firmId,
                status: { $in: ['submitted', 'partially_received'] },
                requiredDate: { $lt: new Date() }
            });

            const stats = {
                pendingOrders,
                overdueOrders,
                recentReceipts,
                ordersByStatus: ordersByStatus.reduce((acc, item) => {
                    acc[item._id] = item.count;
                    return acc;
                }, {}),
                materialValue: materialValue[0] || {
                    totalRawMaterialCost: 0,
                    totalServiceCost: 0,
                    grandTotal: 0
                }
            };

            return stats;
        } catch (error) {
            logger.error('SubcontractingService.getStats failed:', error.message);
            return null;
        }
    }

    /**
     * Get subcontracting settings
     * @param {String} firmId - Firm ID
     * @returns {Promise<Object|null>} - Settings or null
     */
    async getSettings(firmId) {
        try {
            const settings = await SubcontractingSettings.getSettings(firmId);
            return settings;
        } catch (error) {
            logger.error('SubcontractingService.getSettings failed:', error.message);
            return null;
        }
    }

    /**
     * Update subcontracting settings
     * @param {Object} data - Settings data
     * @param {String} firmId - Firm ID
     * @param {String} userId - User ID
     * @returns {Promise<Object|null>} - Updated settings or null
     */
    async updateSettings(data, firmId, userId) {
        try {
            const settings = await SubcontractingSettings.updateSettings(
                firmId,
                data,
                userId
            );

            logger.info('SubcontractingService.updateSettings: Settings updated', {
                firmId,
                userId
            });

            return settings;
        } catch (error) {
            logger.error('SubcontractingService.updateSettings failed:', error.message);
            return null;
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // HELPER METHODS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Transfer raw materials to supplier warehouse
     * @param {String} orderId - Order ID
     * @param {String} firmId - Firm ID
     * @param {String} userId - User ID
     * @returns {Promise<Object|null>} - Stock entry or null
     */
    async transferRawMaterials(orderId, firmId, userId) {
        try {
            const order = await SubcontractingOrder.findOne({
                _id: orderId,
                firmId
            });

            if (!order) {
                logger.error('SubcontractingService.transferRawMaterials: Order not found');
                return null;
            }

            if (!order.rawMaterials || order.rawMaterials.length === 0) {
                logger.warn('SubcontractingService.transferRawMaterials: No raw materials to transfer');
                return null;
            }

            if (!order.supplierWarehouse || !order.rawMaterialWarehouse) {
                logger.error('SubcontractingService.transferRawMaterials: Warehouses not configured');
                return null;
            }

            // Create stock entry for material transfer
            const stockEntryItems = order.rawMaterials.map(material => ({
                itemId: material.itemId,
                itemCode: material.itemCode,
                itemName: material.itemName,
                qty: material.requiredQty,
                uom: material.uom,
                rate: material.rate,
                sourceWarehouse: order.rawMaterialWarehouse,
                targetWarehouse: order.supplierWarehouse,
                batchNo: material.batchNo,
                serialNo: material.serialNo
            }));

            const stockEntry = await StockEntry.create({
                firmId: new mongoose.Types.ObjectId(firmId),
                entryType: 'transfer',
                postingDate: new Date(),
                fromWarehouse: order.rawMaterialWarehouse,
                toWarehouse: order.supplierWarehouse,
                items: stockEntryItems,
                referenceType: 'SubcontractingOrder',
                referenceId: order._id,
                remarks: `Material transfer for subcontracting order ${order.orderNumber}`,
                createdBy: new mongoose.Types.ObjectId(userId),
                status: 'draft'
            });

            // Submit stock entry to post to ledger
            await stockEntry.submit(userId);

            // Update transferred quantities in order
            order.rawMaterials.forEach(material => {
                material.transferredQty = material.requiredQty;
            });
            await order.save();

            logger.info('SubcontractingService.transferRawMaterials: Materials transferred', {
                orderId: order._id,
                stockEntryId: stockEntry._id,
                itemCount: stockEntryItems.length
            });

            return stockEntry;
        } catch (error) {
            logger.error('SubcontractingService.transferRawMaterials failed:', error.message);
            return null;
        }
    }

    /**
     * Receive finished goods from supplier
     * @param {String} receiptId - Receipt ID
     * @param {String} firmId - Firm ID
     * @param {String} userId - User ID
     * @returns {Promise<Object|null>} - Stock entry or null
     */
    async receiveFinishedGoods(receiptId, firmId, userId) {
        try {
            const receipt = await SubcontractingReceipt.findOne({
                _id: receiptId,
                firmId
            }).populate('subcontractingOrderId');

            if (!receipt) {
                logger.error('SubcontractingService.receiveFinishedGoods: Receipt not found');
                return null;
            }

            if (!receipt.finishedGoods || receipt.finishedGoods.length === 0) {
                logger.warn('SubcontractingService.receiveFinishedGoods: No finished goods to receive');
                return null;
            }

            const order = receipt.subcontractingOrderId;

            // Get target warehouse from order or receipt items
            const targetWarehouse = order.finishedGoodsWarehouse || receipt.finishedGoods[0].warehouse;

            if (!targetWarehouse) {
                logger.error('SubcontractingService.receiveFinishedGoods: Target warehouse not configured');
                return null;
            }

            // Create stock entry for finished goods receipt
            const stockEntryItems = receipt.finishedGoods.map(item => ({
                itemId: item.itemId,
                itemCode: item.itemCode,
                itemName: item.itemName,
                qty: item.acceptedQty || item.qty,
                uom: item.uom,
                rate: item.rate,
                targetWarehouse: item.warehouse || targetWarehouse,
                batchNo: item.batchNo,
                serialNo: item.serialNo
            }));

            const stockEntry = await StockEntry.create({
                firmId: new mongoose.Types.ObjectId(firmId),
                entryType: 'receipt',
                postingDate: receipt.postingDate,
                toWarehouse: targetWarehouse,
                items: stockEntryItems,
                referenceType: 'SubcontractingReceipt',
                referenceId: receipt._id,
                remarks: `Finished goods receipt from subcontracting order ${order.orderNumber}`,
                createdBy: new mongoose.Types.ObjectId(userId),
                status: 'draft'
            });

            // Submit stock entry to post to ledger
            await stockEntry.submit(userId);

            logger.info('SubcontractingService.receiveFinishedGoods: Finished goods received', {
                receiptId: receipt._id,
                stockEntryId: stockEntry._id,
                itemCount: stockEntryItems.length
            });

            return stockEntry;
        } catch (error) {
            logger.error('SubcontractingService.receiveFinishedGoods failed:', error.message);
            return null;
        }
    }

    /**
     * Handle returned materials from supplier
     * @param {String} receiptId - Receipt ID
     * @param {String} firmId - Firm ID
     * @param {String} userId - User ID
     * @returns {Promise<Object|null>} - Stock entry or null
     */
    async handleReturnedMaterials(receiptId, firmId, userId) {
        try {
            const receipt = await SubcontractingReceipt.findOne({
                _id: receiptId,
                firmId
            }).populate('subcontractingOrderId');

            if (!receipt) {
                logger.error('SubcontractingService.handleReturnedMaterials: Receipt not found');
                return null;
            }

            if (!receipt.returnedMaterials || receipt.returnedMaterials.length === 0) {
                logger.warn('SubcontractingService.handleReturnedMaterials: No materials to return');
                return null;
            }

            const order = receipt.subcontractingOrderId;

            // Get warehouses
            const sourceWarehouse = order.supplierWarehouse;
            const targetWarehouse = order.rawMaterialWarehouse;

            if (!sourceWarehouse || !targetWarehouse) {
                logger.error('SubcontractingService.handleReturnedMaterials: Warehouses not configured');
                return null;
            }

            // Create stock entry for returned materials
            const stockEntryItems = receipt.returnedMaterials.map(material => ({
                itemId: material.itemId,
                itemCode: material.itemCode,
                itemName: material.itemName,
                qty: material.qty,
                uom: material.uom,
                sourceWarehouse: material.warehouse || sourceWarehouse,
                targetWarehouse: targetWarehouse,
                batchNo: material.batchNo,
                serialNo: material.serialNo
            }));

            const stockEntry = await StockEntry.create({
                firmId: new mongoose.Types.ObjectId(firmId),
                entryType: 'transfer',
                postingDate: receipt.postingDate,
                fromWarehouse: sourceWarehouse,
                toWarehouse: targetWarehouse,
                items: stockEntryItems,
                referenceType: 'SubcontractingReceipt',
                referenceId: receipt._id,
                remarks: `Returned materials from subcontracting order ${order.orderNumber}`,
                createdBy: new mongoose.Types.ObjectId(userId),
                status: 'draft'
            });

            // Submit stock entry to post to ledger
            await stockEntry.submit(userId);

            logger.info('SubcontractingService.handleReturnedMaterials: Materials returned', {
                receiptId: receipt._id,
                stockEntryId: stockEntry._id,
                itemCount: stockEntryItems.length
            });

            return stockEntry;
        } catch (error) {
            logger.error('SubcontractingService.handleReturnedMaterials failed:', error.message);
            return null;
        }
    }

    /**
     * Calculate material consumption for an order
     * @param {String} orderId - Order ID
     * @returns {Promise<Object|null>} - Consumption summary or null
     */
    async calculateMaterialConsumption(orderId) {
        try {
            const order = await SubcontractingOrder.findById(orderId);

            if (!order) {
                logger.error('SubcontractingService.calculateMaterialConsumption: Order not found');
                return null;
            }

            const consumption = {
                totalRequired: 0,
                totalTransferred: 0,
                totalConsumed: 0,
                totalReturned: 0,
                materials: []
            };

            order.rawMaterials.forEach(material => {
                const materialData = {
                    itemId: material.itemId,
                    itemCode: material.itemCode,
                    itemName: material.itemName,
                    requiredQty: material.requiredQty || 0,
                    transferredQty: material.transferredQty || 0,
                    consumedQty: material.consumedQty || 0,
                    returnedQty: material.returnedQty || 0,
                    variance: (material.transferredQty || 0) - (material.consumedQty || 0) - (material.returnedQty || 0)
                };

                consumption.totalRequired += materialData.requiredQty;
                consumption.totalTransferred += materialData.transferredQty;
                consumption.totalConsumed += materialData.consumedQty;
                consumption.totalReturned += materialData.returnedQty;
                consumption.materials.push(materialData);
            });

            return consumption;
        } catch (error) {
            logger.error('SubcontractingService.calculateMaterialConsumption failed:', error.message);
            return null;
        }
    }
}

// Export singleton instance
module.exports = new SubcontractingService();
