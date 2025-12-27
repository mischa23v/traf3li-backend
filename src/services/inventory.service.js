const mongoose = require('mongoose');
const Item = require('../models/item.model');
const Warehouse = require('../models/warehouse.model');
const StockEntry = require('../models/stockEntry.model');
const StockLedger = require('../models/stockLedger.model');
const Bin = require('../models/bin.model');
const Batch = require('../models/batch.model');
const SerialNumber = require('../models/serialNumber.model');
const StockReconciliation = require('../models/stockReconciliation.model');
const ItemGroup = require('../models/itemGroup.model');
const UOM = require('../models/uom.model');
const PriceList = require('../models/priceList.model');
const ItemPrice = require('../models/itemPrice.model');
const InventorySettings = require('../models/inventorySettings.model');

/**
 * Escape special regex characters to prevent ReDoS attacks
 */
const escapeRegex = (str) => {
    if (typeof str !== 'string') return str;
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Inventory Service - Complete Inventory Management
 *
 * Handles items, warehouses, stock entries, stock ledger, batches, serial numbers,
 * reconciliation, master data, reports, and settings.
 */
class InventoryService {
    // ═══════════════════════════════════════════════════════════════
    // ITEMS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Get items with filters
     */
    async getItems(query, firmId) {
        const {
            status,
            itemType,
            itemGroup,
            search,
            page = 1,
            limit = 20
        } = query;

        const filter = { firmId };

        if (status) filter.status = status;
        if (itemType) filter.itemType = itemType;
        if (itemGroup) filter.itemGroup = itemGroup;

        if (search) {
            filter.$or = [
                { itemCode: { $regex: escapeRegex(search), $options: 'i' } },
                { name: { $regex: escapeRegex(search), $options: 'i' } },
                { nameAr: { $regex: escapeRegex(search), $options: 'i' } },
                { sku: { $regex: escapeRegex(search), $options: 'i' } },
                { barcode: { $regex: escapeRegex(search), $options: 'i' } }
            ];
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [items, total] = await Promise.all([
            Item.find(filter)
                .sort({ createdAt: -1 })
                .limit(parseInt(limit))
                .skip(skip)
                .lean(),
            Item.countDocuments(filter)
        ]);

        return {
            items,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / parseInt(limit))
            }
        };
    }

    /**
     * Get item by ID
     */
    async getItemById(id, firmId) {
        const item = await Item.findOne({ _id: id, firmId }).lean();

        if (!item) {
            throw new Error('Item not found');
        }

        return item;
    }

    /**
     * Create item
     */
    async createItem(data, firmId, userId) {
        const item = new Item({
            ...data,
            firmId,
            createdBy: userId
        });

        await item.save();
        return item;
    }

    /**
     * Update item
     */
    async updateItem(id, data, firmId, userId) {
        const item = await Item.findOne({ _id: id, firmId });

        if (!item) {
            throw new Error('Item not found');
        }

        Object.assign(item, data);
        item.updatedBy = userId;

        await item.save();
        return item;
    }

    /**
     * Delete item
     */
    async deleteItem(id, firmId) {
        // Check if item has stock
        const bins = await Bin.find({ itemId: id, firmId, actualQty: { $gt: 0 } });

        if (bins.length > 0) {
            throw new Error('Cannot delete item with existing stock. Please clear stock first.');
        }

        const item = await Item.findOneAndDelete({ _id: id, firmId });

        if (!item) {
            throw new Error('Item not found');
        }

        return item;
    }

    /**
     * Get item stock by warehouse (from Bin)
     */
    async getItemStock(id, firmId) {
        const item = await Item.findOne({ _id: id, firmId });

        if (!item) {
            throw new Error('Item not found');
        }

        const summary = await Bin.getStockSummaryByItem(id, firmId);

        return {
            item: {
                _id: item._id,
                itemCode: item.itemCode,
                name: item.name,
                stockUom: item.stockUom
            },
            ...summary
        };
    }

    // ═══════════════════════════════════════════════════════════════
    // WAREHOUSES
    // ═══════════════════════════════════════════════════════════════

    /**
     * Get warehouses with filters
     */
    async getWarehouses(query, firmId) {
        const {
            warehouseType,
            disabled,
            search,
            page = 1,
            limit = 20
        } = query;

        const filter = { firmId };

        if (warehouseType) filter.warehouseType = warehouseType;
        if (disabled !== undefined) filter.disabled = disabled === 'true';

        if (search) {
            filter.$or = [
                { name: { $regex: escapeRegex(search), $options: 'i' } },
                { nameAr: { $regex: escapeRegex(search), $options: 'i' } },
                { city: { $regex: escapeRegex(search), $options: 'i' } }
            ];
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [warehouses, total] = await Promise.all([
            Warehouse.find(filter)
                .sort({ name: 1 })
                .limit(parseInt(limit))
                .skip(skip)
                .lean(),
            Warehouse.countDocuments(filter)
        ]);

        return {
            warehouses,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / parseInt(limit))
            }
        };
    }

    /**
     * Get warehouse by ID
     */
    async getWarehouseById(id, firmId) {
        const warehouse = await Warehouse.findOne({ _id: id, firmId }).lean();

        if (!warehouse) {
            throw new Error('Warehouse not found');
        }

        return warehouse;
    }

    /**
     * Create warehouse
     */
    async createWarehouse(data, firmId, userId) {
        const warehouse = new Warehouse({
            ...data,
            firmId,
            createdBy: userId
        });

        await warehouse.save();
        return warehouse;
    }

    /**
     * Update warehouse
     */
    async updateWarehouse(id, data, firmId, userId) {
        const warehouse = await Warehouse.findOne({ _id: id, firmId });

        if (!warehouse) {
            throw new Error('Warehouse not found');
        }

        Object.assign(warehouse, data);
        warehouse.updatedBy = userId;

        await warehouse.save();
        return warehouse;
    }

    /**
     * Delete warehouse
     */
    async deleteWarehouse(id, firmId) {
        const warehouse = await Warehouse.findOne({ _id: id, firmId });

        if (!warehouse) {
            throw new Error('Warehouse not found');
        }

        // Pre-delete middleware will check for child warehouses and stock
        await warehouse.deleteOne();

        return warehouse;
    }

    /**
     * Get warehouse stock (all items from Bin)
     */
    async getWarehouseStock(id, firmId) {
        const warehouse = await Warehouse.findOne({ _id: id, firmId });

        if (!warehouse) {
            throw new Error('Warehouse not found');
        }

        const summary = await Bin.getStockSummaryByWarehouse(id, firmId);

        return {
            warehouse: {
                _id: warehouse._id,
                name: warehouse.name,
                warehouseType: warehouse.warehouseType
            },
            ...summary
        };
    }

    // ═══════════════════════════════════════════════════════════════
    // STOCK ENTRIES
    // ═══════════════════════════════════════════════════════════════

    /**
     * Get stock entries with filters
     */
    async getStockEntries(query, firmId) {
        const {
            entryType,
            status,
            fromWarehouse,
            toWarehouse,
            dateFrom,
            dateTo,
            page = 1,
            limit = 20
        } = query;

        const filter = { firmId };

        if (entryType) filter.entryType = entryType;
        if (status) filter.status = status;
        if (fromWarehouse) filter.fromWarehouse = fromWarehouse;
        if (toWarehouse) filter.toWarehouse = toWarehouse;

        if (dateFrom || dateTo) {
            filter.postingDate = {};
            if (dateFrom) filter.postingDate.$gte = new Date(dateFrom);
            if (dateTo) filter.postingDate.$lte = new Date(dateTo);
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [stockEntries, total] = await Promise.all([
            StockEntry.find(filter)
                .populate('fromWarehouse', 'name')
                .populate('toWarehouse', 'name')
                .sort({ postingDate: -1, createdAt: -1 })
                .limit(parseInt(limit))
                .skip(skip)
                .lean(),
            StockEntry.countDocuments(filter)
        ]);

        return {
            stockEntries,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / parseInt(limit))
            }
        };
    }

    /**
     * Get stock entry by ID
     */
    async getStockEntryById(id, firmId) {
        const stockEntry = await StockEntry.findOne({ _id: id, firmId })
            .populate('fromWarehouse', 'name')
            .populate('toWarehouse', 'name')
            .populate('items.itemId', 'itemCode name stockUom')
            .lean();

        if (!stockEntry) {
            throw new Error('Stock entry not found');
        }

        return stockEntry;
    }

    /**
     * Create stock entry
     */
    async createStockEntry(data, firmId, userId) {
        const stockEntry = new StockEntry({
            ...data,
            firmId,
            createdBy: userId,
            status: 'draft',
            docStatus: 0
        });

        await stockEntry.save();
        return stockEntry;
    }

    /**
     * Submit stock entry - Change status draft->submitted, update stock ledger and bins
     */
    async submitStockEntry(id, firmId, userId) {
        const stockEntry = await StockEntry.findOne({ _id: id, firmId });

        if (!stockEntry) {
            throw new Error('Stock entry not found');
        }

        // Submit will validate and update stock ledger + bins
        await stockEntry.submit(userId);

        return stockEntry;
    }

    /**
     * Cancel stock entry - Reverse stock changes
     */
    async cancelStockEntry(id, firmId, userId) {
        const stockEntry = await StockEntry.findOne({ _id: id, firmId });

        if (!stockEntry) {
            throw new Error('Stock entry not found');
        }

        // Cancel will reverse stock ledger entries
        await stockEntry.cancel(userId);

        return stockEntry;
    }

    /**
     * Delete stock entry - Only draft entries
     */
    async deleteStockEntry(id, firmId) {
        const stockEntry = await StockEntry.findOne({ _id: id, firmId });

        if (!stockEntry) {
            throw new Error('Stock entry not found');
        }

        if (stockEntry.status !== 'draft') {
            throw new Error('Only draft stock entries can be deleted');
        }

        await stockEntry.deleteOne();
        return stockEntry;
    }

    // ═══════════════════════════════════════════════════════════════
    // STOCK LEDGER (read-only)
    // ═══════════════════════════════════════════════════════════════

    /**
     * Get stock ledger with filters
     */
    async getStockLedger(query, firmId) {
        const {
            itemId,
            warehouseId,
            dateFrom,
            dateTo,
            page = 1,
            limit = 50
        } = query;

        const filter = { firmId };

        if (itemId) filter.itemId = itemId;
        if (warehouseId) filter.warehouseId = warehouseId;

        if (dateFrom || dateTo) {
            filter.postingDate = {};
            if (dateFrom) filter.postingDate.$gte = new Date(dateFrom);
            if (dateTo) filter.postingDate.$lte = new Date(dateTo);
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [entries, total] = await Promise.all([
            StockLedger.find(filter)
                .populate('itemId', 'itemCode name stockUom')
                .populate('warehouseId', 'name')
                .sort({ postingDate: -1, postingTime: -1, createdAt: -1 })
                .limit(parseInt(limit))
                .skip(skip)
                .lean(),
            StockLedger.countDocuments(filter)
        ]);

        return {
            entries,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / parseInt(limit))
            }
        };
    }

    // ═══════════════════════════════════════════════════════════════
    // BATCHES & SERIAL NUMBERS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Get batches with filters
     */
    async getBatches(query, firmId) {
        const { itemId, warehouseId, page = 1, limit = 20 } = query;

        const filter = { firmId };
        if (itemId) filter.itemId = itemId;
        if (warehouseId) filter.warehouseId = warehouseId;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [batches, total] = await Promise.all([
            Batch.find(filter)
                .populate('itemId', 'itemCode name')
                .populate('warehouseId', 'name')
                .sort({ createdAt: -1 })
                .limit(parseInt(limit))
                .skip(skip)
                .lean(),
            Batch.countDocuments(filter)
        ]);

        return {
            batches,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / parseInt(limit))
            }
        };
    }

    /**
     * Create batch
     */
    async createBatch(data, firmId, userId) {
        const batch = new Batch({
            ...data,
            firmId,
            createdBy: userId
        });

        await batch.save();
        return batch;
    }

    /**
     * Get serial numbers with filters
     */
    async getSerialNumbers(query, firmId) {
        const { itemId, warehouseId, status, page = 1, limit = 20 } = query;

        const filter = { firmId };
        if (itemId) filter.itemId = itemId;
        if (warehouseId) filter.warehouseId = warehouseId;
        if (status) filter.status = status;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [serialNumbers, total] = await Promise.all([
            SerialNumber.find(filter)
                .populate('itemId', 'itemCode name')
                .populate('warehouseId', 'name')
                .sort({ createdAt: -1 })
                .limit(parseInt(limit))
                .skip(skip)
                .lean(),
            SerialNumber.countDocuments(filter)
        ]);

        return {
            serialNumbers,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / parseInt(limit))
            }
        };
    }

    /**
     * Create serial number
     */
    async createSerialNumber(data, firmId, userId) {
        const serialNumber = new SerialNumber({
            ...data,
            firmId,
            createdBy: userId
        });

        await serialNumber.save();
        return serialNumber;
    }

    // ═══════════════════════════════════════════════════════════════
    // RECONCILIATION
    // ═══════════════════════════════════════════════════════════════

    /**
     * Get reconciliations with filters
     */
    async getReconciliations(query, firmId) {
        const { warehouseId, status, page = 1, limit = 20 } = query;

        const filter = { firmId };
        if (warehouseId) filter.warehouseId = warehouseId;
        if (status) filter.status = status;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [reconciliations, total] = await Promise.all([
            StockReconciliation.find(filter)
                .populate('warehouseId', 'name')
                .sort({ reconciliationDate: -1 })
                .limit(parseInt(limit))
                .skip(skip)
                .lean(),
            StockReconciliation.countDocuments(filter)
        ]);

        return {
            reconciliations,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / parseInt(limit))
            }
        };
    }

    /**
     * Create reconciliation
     */
    async createReconciliation(data, firmId, userId) {
        const reconciliation = new StockReconciliation({
            ...data,
            firmId,
            createdBy: userId
        });

        await reconciliation.save();
        return reconciliation;
    }

    /**
     * Submit reconciliation
     */
    async submitReconciliation(id, firmId, userId) {
        const reconciliation = await StockReconciliation.findOne({ _id: id, firmId });

        if (!reconciliation) {
            throw new Error('Stock reconciliation not found');
        }

        if (reconciliation.status !== 'draft') {
            throw new Error('Only draft reconciliations can be submitted');
        }

        // Submit logic (implement in model if available)
        if (typeof reconciliation.submit === 'function') {
            await reconciliation.submit(userId);
        } else {
            reconciliation.status = 'submitted';
            reconciliation.submittedBy = userId;
            reconciliation.submittedAt = new Date();
            await reconciliation.save();
        }

        return reconciliation;
    }

    // ═══════════════════════════════════════════════════════════════
    // MASTER DATA
    // ═══════════════════════════════════════════════════════════════

    /**
     * Get item groups
     */
    async getItemGroups(firmId) {
        const itemGroups = await ItemGroup.find({ firmId })
            .sort({ name: 1 })
            .lean();

        return itemGroups;
    }

    /**
     * Create item group
     */
    async createItemGroup(data, firmId, userId) {
        const itemGroup = new ItemGroup({
            ...data,
            firmId,
            createdBy: userId
        });

        await itemGroup.save();
        return itemGroup;
    }

    /**
     * Get UOMs
     */
    async getUoms(firmId) {
        const uoms = await UOM.find({ firmId })
            .sort({ name: 1 })
            .lean();

        return uoms;
    }

    /**
     * Create UOM
     */
    async createUom(data, firmId, userId) {
        const uom = new UOM({
            ...data,
            firmId,
            createdBy: userId
        });

        await uom.save();
        return uom;
    }

    /**
     * Get price lists
     */
    async getPriceLists(firmId) {
        const priceLists = await PriceList.find({ firmId })
            .sort({ name: 1 })
            .lean();

        return priceLists;
    }

    /**
     * Get item prices with filters
     */
    async getItemPrices(query, firmId) {
        const { priceListId, itemId, page = 1, limit = 50 } = query;

        const filter = { firmId };
        if (priceListId) filter.priceListId = priceListId;
        if (itemId) filter.itemId = itemId;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [itemPrices, total] = await Promise.all([
            ItemPrice.find(filter)
                .populate('itemId', 'itemCode name')
                .populate('priceListId', 'name')
                .sort({ createdAt: -1 })
                .limit(parseInt(limit))
                .skip(skip)
                .lean(),
            ItemPrice.countDocuments(filter)
        ]);

        return {
            itemPrices,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / parseInt(limit))
            }
        };
    }

    // ═══════════════════════════════════════════════════════════════
    // REPORTS & STATS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Get dashboard stats
     */
    async getStats(firmId) {
        const [
            totalItems,
            activeItems,
            totalWarehouses,
            totalStockValue,
            lowStockItems,
            pendingStockEntries
        ] = await Promise.all([
            Item.countDocuments({ firmId }),
            Item.countDocuments({ firmId, status: 'active' }),
            Warehouse.countDocuments({ firmId, disabled: false }),
            Bin.aggregate([
                { $match: { firmId: mongoose.Types.ObjectId(firmId) } },
                { $group: { _id: null, total: { $sum: '$stockValue' } } }
            ]),
            Bin.getLowStockItems(firmId),
            StockEntry.countDocuments({ firmId, status: 'draft' })
        ]);

        return {
            totalItems,
            activeItems,
            totalWarehouses,
            totalStockValue: totalStockValue[0]?.total || 0,
            lowStockItemsCount: lowStockItems.length,
            pendingStockEntries
        };
    }

    /**
     * Get stock balance report
     */
    async getStockBalanceReport(query, firmId) {
        const { warehouseId, itemGroup } = query;

        const filter = { firmId };
        if (itemGroup) filter.itemGroup = itemGroup;

        const items = await Item.find(filter).lean();
        const report = [];

        for (const item of items) {
            const binFilter = { itemId: item._id, firmId };
            if (warehouseId) binFilter.warehouseId = warehouseId;

            const bins = await Bin.find(binFilter).populate('warehouseId', 'name');

            const totalQty = bins.reduce((sum, bin) => sum + (bin.actualQty || 0), 0);
            const totalValue = bins.reduce((sum, bin) => sum + (bin.stockValue || 0), 0);

            if (totalQty > 0 || !warehouseId) {
                report.push({
                    itemId: item._id,
                    itemCode: item.itemCode,
                    itemName: item.name,
                    itemGroup: item.itemGroup,
                    stockUom: item.stockUom,
                    totalQty,
                    totalValue,
                    warehouses: bins.map(bin => ({
                        warehouseId: bin.warehouseId._id,
                        warehouseName: bin.warehouseId.name,
                        qty: bin.actualQty,
                        value: bin.stockValue
                    }))
                });
            }
        }

        return report;
    }

    /**
     * Get low stock report
     */
    async getLowStockReport(firmId) {
        const lowStockItems = await Bin.getLowStockItems(firmId);
        return lowStockItems;
    }

    /**
     * Get stock movement report
     */
    async getStockMovementReport(query, firmId) {
        const { itemId, warehouseId, dateFrom, dateTo } = query;

        const filter = { firmId };
        if (itemId) filter.itemId = itemId;
        if (warehouseId) filter.warehouseId = warehouseId;

        if (dateFrom || dateTo) {
            filter.postingDate = {};
            if (dateFrom) filter.postingDate.$gte = new Date(dateFrom);
            if (dateTo) filter.postingDate.$lte = new Date(dateTo);
        }

        const movements = await StockLedger.find(filter)
            .populate('itemId', 'itemCode name stockUom')
            .populate('warehouseId', 'name')
            .sort({ postingDate: 1, postingTime: 1 })
            .lean();

        return movements;
    }

    // ═══════════════════════════════════════════════════════════════
    // SETTINGS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Get inventory settings
     */
    async getSettings(firmId) {
        let settings = await InventorySettings.findOne({ firmId }).lean();

        if (!settings) {
            // Return default settings
            settings = {
                firmId,
                defaultValuationMethod: 'fifo',
                autoGenerateItemCode: true,
                allowNegativeStock: false,
                enableBatchTracking: false,
                enableSerialTracking: false,
                enableExpiryTracking: false
            };
        }

        return settings;
    }

    /**
     * Update inventory settings
     */
    async updateSettings(data, firmId, userId) {
        let settings = await InventorySettings.findOne({ firmId });

        if (!settings) {
            settings = new InventorySettings({
                ...data,
                firmId,
                createdBy: userId
            });
        } else {
            Object.assign(settings, data);
            settings.updatedBy = userId;
        }

        await settings.save();
        return settings;
    }
}

module.exports = new InventoryService();
