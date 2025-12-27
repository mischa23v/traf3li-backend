/**
 * Assets Service - Comprehensive Asset Management
 *
 * This service provides business logic for asset operations including:
 * - Asset CRUD operations
 * - Asset categories management
 * - Maintenance scheduling
 * - Asset movements (transfers, issues, receipts)
 * - Depreciation calculations
 * - Stats and reporting
 * - Settings management
 *
 * @module services/assets.service
 */

const mongoose = require('mongoose');

/**
 * Escape special regex characters to prevent ReDoS attacks
 */
const escapeRegex = (str) => {
    if (typeof str !== 'string') return str;
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const {
    Asset,
    AssetCategory,
    AssetMovement,
    AssetRepair,
    MaintenanceSchedule,
    AssetSettings
} = require('../models');
const { CustomException } = require('../utils');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');
const logger = require('../utils/logger');

// ═══════════════════════════════════════════════════════════════
// ASSETS OPERATIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Get assets with filters
 * @param {Object} query - Query parameters
 * @param {String} firmId - Firm ID
 * @returns {Promise<Object>} - Assets with pagination
 */
const getAssets = async (query, firmId) => {
    try {
        const {
            status,
            assetCategory,
            location,
            custodian,
            department,
            search,
            sortBy = 'createdAt',
            sortOrder = 'desc',
            page = 1,
            limit = 20
        } = query;

        const filters = {};
        if (firmId) filters.firmId = firmId;
        if (status) filters.status = status;
        if (assetCategory) filters.assetCategory = sanitizeObjectId(assetCategory);
        if (location) filters.location = location;
        if (custodian) filters.custodian = sanitizeObjectId(custodian);
        if (department) filters.department = department;

        if (search) {
            filters.$or = [
                { assetName: { $regex: escapeRegex(search), $options: 'i' } },
                { assetNumber: { $regex: escapeRegex(search), $options: 'i' } },
                { serialNo: { $regex: escapeRegex(search), $options: 'i' } }
            ];
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

        const [assets, total] = await Promise.all([
            Asset.find(filters)
                .populate('assetCategory', 'name nameAr')
                .populate('custodian', 'firstName lastName email')
                .populate('createdBy', 'firstName lastName')
                .sort(sort)
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),
            Asset.countDocuments(filters)
        ]);

        return {
            assets,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        };
    } catch (error) {
        logger.error('Error getting assets:', error);
        throw error;
    }
};

/**
 * Get asset by ID
 * @param {String} id - Asset ID
 * @param {String} firmId - Firm ID
 * @returns {Promise<Object>} - Asset with relations
 */
const getAssetById = async (id, firmId) => {
    try {
        const asset = await Asset.findOne({ _id: sanitizeObjectId(id), firmId })
            .populate('assetCategory', 'name nameAr depreciationMethod')
            .populate('custodian', 'firstName lastName email phone')
            .populate('supplierId', 'name')
            .populate('createdBy', 'firstName lastName')
            .populate('updatedBy', 'firstName lastName');

        if (!asset) {
            throw CustomException('Resource not found', 404);
        }

        return asset;
    } catch (error) {
        logger.error('Error getting asset by ID:', error);
        throw error;
    }
};

/**
 * Create asset
 * @param {Object} data - Asset data
 * @param {String} firmId - Firm ID
 * @param {String} userId - User ID creating the asset
 * @returns {Promise<Object>} - Created asset
 */
const createAsset = async (data, firmId, userId) => {
    try {
        // Mass assignment protection
        const allowedFields = [
            'assetName', 'assetNameAr', 'description', 'serialNo', 'image', 'tags',
            'assetCategory', 'itemId', 'itemCode', 'isExistingAsset',
            'location', 'custodian', 'custodianName', 'department', 'company',
            'purchaseDate', 'purchaseInvoiceId', 'supplierId', 'supplierName',
            'grossPurchaseAmount', 'purchaseReceiptAmount', 'currency', 'assetQuantity',
            'availableForUseDate', 'depreciationMethod', 'totalNumberOfDepreciations',
            'frequencyOfDepreciation', 'depreciationStartDate', 'expectedValueAfterUsefulLife',
            'openingAccumulatedDepreciation', 'warrantyExpiryDate', 'insuranceDetails'
        ];
        const safeData = pickAllowedFields(data, allowedFields);

        // Sanitize ObjectIds
        if (safeData.assetCategory) safeData.assetCategory = sanitizeObjectId(safeData.assetCategory);
        if (safeData.custodian) safeData.custodian = sanitizeObjectId(safeData.custodian);
        if (safeData.supplierId) safeData.supplierId = sanitizeObjectId(safeData.supplierId);
        if (safeData.purchaseInvoiceId) safeData.purchaseInvoiceId = sanitizeObjectId(safeData.purchaseInvoiceId);

        const asset = new Asset({
            ...safeData,
            firmId,
            status: 'draft',
            createdBy: userId
        });

        await asset.save();

        await asset.populate([
            { path: 'assetCategory', select: 'name nameAr' },
            { path: 'custodian', select: 'firstName lastName' }
        ]);

        return asset;
    } catch (error) {
        logger.error('Error creating asset:', error);
        throw error;
    }
};

/**
 * Update asset
 * @param {String} id - Asset ID
 * @param {Object} data - Update data
 * @param {String} firmId - Firm ID
 * @param {String} userId - User ID updating the asset
 * @returns {Promise<Object>} - Updated asset
 */
const updateAsset = async (id, data, firmId, userId) => {
    try {
        const asset = await Asset.findOne({ _id: sanitizeObjectId(id), firmId });

        if (!asset) {
            throw CustomException('Resource not found', 404);
        }

        // Cannot update submitted assets
        if (!['draft'].includes(asset.status)) {
            throw CustomException('Cannot update submitted assets. Use void/scrap actions instead.', 400);
        }

        // Mass assignment protection
        const allowedFields = [
            'assetName', 'assetNameAr', 'description', 'serialNo', 'image', 'tags',
            'assetCategory', 'location', 'custodian', 'custodianName', 'department',
            'purchaseDate', 'supplierId', 'supplierName', 'grossPurchaseAmount',
            'purchaseReceiptAmount', 'currency', 'assetQuantity', 'availableForUseDate',
            'depreciationMethod', 'totalNumberOfDepreciations', 'frequencyOfDepreciation',
            'depreciationStartDate', 'expectedValueAfterUsefulLife',
            'openingAccumulatedDepreciation', 'warrantyExpiryDate', 'insuranceDetails'
        ];
        const safeData = pickAllowedFields(data, allowedFields);

        // Sanitize ObjectIds
        if (safeData.assetCategory) safeData.assetCategory = sanitizeObjectId(safeData.assetCategory);
        if (safeData.custodian) safeData.custodian = sanitizeObjectId(safeData.custodian);
        if (safeData.supplierId) safeData.supplierId = sanitizeObjectId(safeData.supplierId);

        Object.keys(safeData).forEach(field => {
            asset[field] = safeData[field];
        });

        asset.updatedBy = userId;
        await asset.save();

        await asset.populate([
            { path: 'assetCategory', select: 'name nameAr' },
            { path: 'custodian', select: 'firstName lastName' }
        ]);

        return asset;
    } catch (error) {
        logger.error('Error updating asset:', error);
        throw error;
    }
};

/**
 * Submit asset (activate and start depreciation)
 * @param {String} id - Asset ID
 * @param {String} firmId - Firm ID
 * @param {String} userId - User ID submitting the asset
 * @returns {Promise<Object>} - Submitted asset
 */
const submitAsset = async (id, firmId, userId) => {
    try {
        const asset = await Asset.findOne({ _id: sanitizeObjectId(id), firmId });

        if (!asset) {
            throw CustomException('Resource not found', 404);
        }

        if (asset.status !== 'draft') {
            throw CustomException('Only draft assets can be submitted', 400);
        }

        // Set depreciation start date if not set
        if (!asset.depreciationStartDate) {
            asset.depreciationStartDate = asset.availableForUseDate || new Date();
        }

        asset.status = 'submitted';
        asset.updatedBy = userId;
        await asset.save();

        return asset;
    } catch (error) {
        logger.error('Error submitting asset:', error);
        throw error;
    }
};

/**
 * Delete asset
 * @param {String} id - Asset ID
 * @param {String} firmId - Firm ID
 * @returns {Promise<void>}
 */
const deleteAsset = async (id, firmId) => {
    try {
        const asset = await Asset.findOne({ _id: sanitizeObjectId(id), firmId });

        if (!asset) {
            throw CustomException('Resource not found', 404);
        }

        // Only draft assets can be deleted
        if (asset.status !== 'draft') {
            throw CustomException('Only draft assets can be deleted. Use void/scrap for submitted assets.', 400);
        }

        await Asset.findOneAndDelete({ _id: sanitizeObjectId(id), firmId });
    } catch (error) {
        logger.error('Error deleting asset:', error);
        throw error;
    }
};

// ═══════════════════════════════════════════════════════════════
// CATEGORIES OPERATIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Get categories
 * @param {String} firmId - Firm ID
 * @returns {Promise<Array>} - Asset categories
 */
const getCategories = async (firmId) => {
    try {
        const query = { isActive: true };
        if (firmId) query.firmId = firmId;

        return await AssetCategory.find(query)
            .populate('parentCategory', 'name nameAr')
            .sort({ name: 1 })
            .lean();
    } catch (error) {
        logger.error('Error getting categories:', error);
        throw error;
    }
};

/**
 * Get category by ID
 * @param {String} id - Category ID
 * @param {String} firmId - Firm ID
 * @returns {Promise<Object>} - Category
 */
const getCategoryById = async (id, firmId) => {
    try {
        const category = await AssetCategory.findOne({ _id: sanitizeObjectId(id), firmId })
            .populate('parentCategory', 'name nameAr')
            .populate('fixedAssetAccount', 'name accountNumber')
            .populate('accumulatedDepreciationAccount', 'name accountNumber')
            .populate('depreciationExpenseAccount', 'name accountNumber');

        if (!category) {
            throw CustomException('Resource not found', 404);
        }

        return category;
    } catch (error) {
        logger.error('Error getting category by ID:', error);
        throw error;
    }
};

/**
 * Create category
 * @param {Object} data - Category data
 * @param {String} firmId - Firm ID
 * @param {String} userId - User ID creating the category
 * @returns {Promise<Object>} - Created category
 */
const createCategory = async (data, firmId, userId) => {
    try {
        const allowedFields = [
            'name', 'nameAr', 'parentCategory', 'isGroup', 'depreciationMethod',
            'totalNumberOfDepreciations', 'frequencyOfDepreciation', 'enableCwip',
            'fixedAssetAccount', 'accumulatedDepreciationAccount', 'depreciationExpenseAccount'
        ];
        const safeData = pickAllowedFields(data, allowedFields);

        // Sanitize ObjectIds
        if (safeData.parentCategory) safeData.parentCategory = sanitizeObjectId(safeData.parentCategory);
        if (safeData.fixedAssetAccount) safeData.fixedAssetAccount = sanitizeObjectId(safeData.fixedAssetAccount);
        if (safeData.accumulatedDepreciationAccount) {
            safeData.accumulatedDepreciationAccount = sanitizeObjectId(safeData.accumulatedDepreciationAccount);
        }
        if (safeData.depreciationExpenseAccount) {
            safeData.depreciationExpenseAccount = sanitizeObjectId(safeData.depreciationExpenseAccount);
        }

        const category = new AssetCategory({
            ...safeData,
            firmId,
            createdBy: userId
        });

        await category.save();
        return category;
    } catch (error) {
        logger.error('Error creating category:', error);
        throw error;
    }
};

/**
 * Update category
 * @param {String} id - Category ID
 * @param {Object} data - Update data
 * @param {String} firmId - Firm ID
 * @param {String} userId - User ID updating the category
 * @returns {Promise<Object>} - Updated category
 */
const updateCategory = async (id, data, firmId, userId) => {
    try {
        const category = await AssetCategory.findOne({ _id: sanitizeObjectId(id), firmId });

        if (!category) {
            throw CustomException('Resource not found', 404);
        }

        const allowedFields = [
            'name', 'nameAr', 'parentCategory', 'isGroup', 'depreciationMethod',
            'totalNumberOfDepreciations', 'frequencyOfDepreciation', 'enableCwip',
            'fixedAssetAccount', 'accumulatedDepreciationAccount', 'depreciationExpenseAccount',
            'isActive'
        ];
        const safeData = pickAllowedFields(data, allowedFields);

        Object.keys(safeData).forEach(field => {
            category[field] = safeData[field];
        });

        category.updatedBy = userId;
        await category.save();

        return category;
    } catch (error) {
        logger.error('Error updating category:', error);
        throw error;
    }
};

/**
 * Delete category
 * @param {String} id - Category ID
 * @param {String} firmId - Firm ID
 * @returns {Promise<void>}
 */
const deleteCategory = async (id, firmId) => {
    try {
        const category = await AssetCategory.findOne({ _id: sanitizeObjectId(id), firmId });

        if (!category) {
            throw CustomException('Resource not found', 404);
        }

        // Check if category has assets
        const hasAssets = await category.hasAssets();
        if (hasAssets) {
            throw CustomException('Cannot delete category with existing assets', 400);
        }

        // Check if category has subcategories
        const hasSubcategories = await category.hasSubcategories();
        if (hasSubcategories) {
            throw CustomException('Cannot delete category with subcategories', 400);
        }

        await AssetCategory.findOneAndDelete({ _id: sanitizeObjectId(id), firmId });
    } catch (error) {
        logger.error('Error deleting category:', error);
        throw error;
    }
};

// ═══════════════════════════════════════════════════════════════
// MAINTENANCE OPERATIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Get maintenance schedules
 * @param {Object} query - Query parameters
 * @param {String} firmId - Firm ID
 * @returns {Promise<Array>} - Maintenance schedules
 */
const getMaintenanceSchedules = async (query, firmId) => {
    try {
        const {
            assetId,
            maintenanceType,
            maintenanceStatus,
            assignTo,
            page = 1,
            limit = 20
        } = query;

        const filters = {};
        if (firmId) filters.firmId = firmId;
        if (assetId) filters.assetId = sanitizeObjectId(assetId);
        if (maintenanceType) filters.maintenanceType = maintenanceType;
        if (maintenanceStatus) filters.maintenanceStatus = maintenanceStatus;
        if (assignTo) filters.assignTo = sanitizeObjectId(assignTo);

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [schedules, total] = await Promise.all([
            MaintenanceSchedule.find(filters)
                .populate('assetId', 'assetName assetNumber')
                .populate('assignTo', 'firstName lastName email')
                .sort({ nextMaintenanceDate: 1 })
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),
            MaintenanceSchedule.countDocuments(filters)
        ]);

        return {
            schedules,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        };
    } catch (error) {
        logger.error('Error getting maintenance schedules:', error);
        throw error;
    }
};

/**
 * Get maintenance schedule by ID
 * @param {String} id - Schedule ID
 * @param {String} firmId - Firm ID
 * @returns {Promise<Object>} - Maintenance schedule
 */
const getMaintenanceScheduleById = async (id, firmId) => {
    try {
        const schedule = await MaintenanceSchedule.findOne({ _id: sanitizeObjectId(id), firmId })
            .populate('assetId', 'assetName assetNumber')
            .populate('assignTo', 'firstName lastName email');

        if (!schedule) {
            throw CustomException('Resource not found', 404);
        }

        return schedule;
    } catch (error) {
        logger.error('Error getting maintenance schedule by ID:', error);
        throw error;
    }
};

/**
 * Create maintenance schedule
 * @param {Object} data - Schedule data
 * @param {String} firmId - Firm ID
 * @param {String} userId - User ID creating the schedule
 * @returns {Promise<Object>} - Created schedule
 */
const createMaintenanceSchedule = async (data, firmId, userId) => {
    try {
        const allowedFields = [
            'assetId', 'assetName', 'maintenanceType', 'frequency',
            'lastMaintenanceDate', 'nextMaintenanceDate', 'assignTo',
            'assignToName', 'description', 'certificateRequired'
        ];
        const safeData = pickAllowedFields(data, allowedFields);

        // Sanitize ObjectIds
        if (safeData.assetId) safeData.assetId = sanitizeObjectId(safeData.assetId);
        if (safeData.assignTo) safeData.assignTo = sanitizeObjectId(safeData.assignTo);

        const schedule = new MaintenanceSchedule({
            ...safeData,
            firmId,
            createdBy: userId
        });

        await schedule.save();

        // Add to asset's maintenance schedule
        await Asset.findOneAndUpdate(
            { _id: safeData.assetId, firmId },
            { $push: { maintenanceSchedule: schedule._id } }
        );

        await schedule.populate([
            { path: 'assetId', select: 'assetName assetNumber' },
            { path: 'assignTo', select: 'firstName lastName' }
        ]);

        return schedule;
    } catch (error) {
        logger.error('Error creating maintenance schedule:', error);
        throw error;
    }
};

/**
 * Update maintenance schedule
 * @param {String} id - Schedule ID
 * @param {Object} data - Update data
 * @param {String} firmId - Firm ID
 * @param {String} userId - User ID updating the schedule
 * @returns {Promise<Object>} - Updated schedule
 */
const updateMaintenanceSchedule = async (id, data, firmId, userId) => {
    try {
        const schedule = await MaintenanceSchedule.findOne({ _id: sanitizeObjectId(id), firmId });

        if (!schedule) {
            throw CustomException('Resource not found', 404);
        }

        const allowedFields = [
            'maintenanceType', 'frequency', 'nextMaintenanceDate',
            'assignTo', 'assignToName', 'description', 'certificateRequired'
        ];
        const safeData = pickAllowedFields(data, allowedFields);

        Object.keys(safeData).forEach(field => {
            schedule[field] = safeData[field];
        });

        schedule.updatedBy = userId;
        await schedule.save();

        return schedule;
    } catch (error) {
        logger.error('Error updating maintenance schedule:', error);
        throw error;
    }
};

/**
 * Complete maintenance schedule
 * @param {String} id - Schedule ID
 * @param {String} firmId - Firm ID
 * @param {String} userId - User ID completing the schedule
 * @returns {Promise<Object>} - Completed schedule
 */
const completeMaintenanceSchedule = async (id, firmId, userId) => {
    try {
        const schedule = await MaintenanceSchedule.findOne({ _id: sanitizeObjectId(id), firmId });

        if (!schedule) {
            throw CustomException('Resource not found', 404);
        }

        await schedule.completeMaintenance(userId);
        return schedule;
    } catch (error) {
        logger.error('Error completing maintenance schedule:', error);
        throw error;
    }
};

// ═══════════════════════════════════════════════════════════════
// MOVEMENT OPERATIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Get movements
 * @param {Object} query - Query parameters
 * @param {String} firmId - Firm ID
 * @returns {Promise<Array>} - Asset movements
 */
const getMovements = async (query, firmId) => {
    try {
        const {
            assetId,
            movementType,
            status,
            page = 1,
            limit = 20
        } = query;

        const filters = {};
        if (firmId) filters.firmId = firmId;
        if (assetId) filters.assetId = sanitizeObjectId(assetId);
        if (movementType) filters.movementType = movementType;
        if (status) filters.status = status;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [movements, total] = await Promise.all([
            AssetMovement.find(filters)
                .populate('assetId', 'assetName assetNumber')
                .populate('fromCustodian', 'firstName lastName')
                .populate('toCustodian', 'firstName lastName')
                .populate('approvedBy', 'firstName lastName')
                .sort({ transactionDate: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),
            AssetMovement.countDocuments(filters)
        ]);

        return {
            movements,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        };
    } catch (error) {
        logger.error('Error getting movements:', error);
        throw error;
    }
};

/**
 * Create movement
 * @param {Object} data - Movement data
 * @param {String} firmId - Firm ID
 * @param {String} userId - User ID creating the movement
 * @returns {Promise<Object>} - Created movement
 */
const createMovement = async (data, firmId, userId) => {
    try {
        const allowedFields = [
            'assetId', 'assetName', 'movementType', 'transactionDate',
            'sourceLocation', 'targetLocation', 'fromCustodian', 'toCustodian',
            'fromDepartment', 'toDepartment', 'reason', 'remarks'
        ];
        const safeData = pickAllowedFields(data, allowedFields);

        // Sanitize ObjectIds
        if (safeData.assetId) safeData.assetId = sanitizeObjectId(safeData.assetId);
        if (safeData.fromCustodian) safeData.fromCustodian = sanitizeObjectId(safeData.fromCustodian);
        if (safeData.toCustodian) safeData.toCustodian = sanitizeObjectId(safeData.toCustodian);

        const movement = new AssetMovement({
            ...safeData,
            firmId,
            createdBy: userId
        });

        await movement.save();

        await movement.populate([
            { path: 'assetId', select: 'assetName assetNumber' },
            { path: 'fromCustodian', select: 'firstName lastName' },
            { path: 'toCustodian', select: 'firstName lastName' }
        ]);

        return movement;
    } catch (error) {
        logger.error('Error creating movement:', error);
        throw error;
    }
};

// ═══════════════════════════════════════════════════════════════
// STATS & SETTINGS
// ═══════════════════════════════════════════════════════════════

/**
 * Get asset statistics
 * @param {String} firmId - Firm ID
 * @returns {Promise<Object>} - Asset statistics
 */
const getStats = async (firmId) => {
    try {
        const [
            assetStats,
            categoryStats,
            maintenanceStats
        ] = await Promise.all([
            Asset.getAssetStats({ firmId }),
            Asset.getAssetsByCategory({ firmId }),
            MaintenanceSchedule.getMaintenanceStats({ firmId })
        ]);

        // Get depreciation summary
        const depreciationStats = await Asset.aggregate([
            { $match: { firmId: firmId ? new mongoose.Types.ObjectId(firmId) : { $exists: true } } },
            {
                $group: {
                    _id: null,
                    totalDepreciation: { $sum: '$accumulatedDepreciation' },
                    totalValue: { $sum: '$currentValue' },
                    netBookValue: { $sum: '$valueAfterDepreciation' }
                }
            }
        ]);

        return {
            assets: assetStats,
            categories: categoryStats,
            maintenance: maintenanceStats,
            depreciation: depreciationStats[0] || {
                totalDepreciation: 0,
                totalValue: 0,
                netBookValue: 0
            }
        };
    } catch (error) {
        logger.error('Error getting asset stats:', error);
        throw error;
    }
};

/**
 * Get settings
 * @param {String} firmId - Firm ID
 * @returns {Promise<Object>} - Asset settings
 */
const getSettings = async (firmId) => {
    try {
        return await AssetSettings.getOrCreateSettings(firmId);
    } catch (error) {
        logger.error('Error getting settings:', error);
        throw error;
    }
};

/**
 * Update settings
 * @param {Object} data - Settings data
 * @param {String} firmId - Firm ID
 * @param {String} userId - User ID updating settings
 * @returns {Promise<Object>} - Updated settings
 */
const updateSettings = async (data, firmId, userId) => {
    try {
        const allowedFields = [
            'autoDepreciation', 'depreciationFrequency',
            'enableMaintenanceAlerts', 'maintenanceAlertDays',
            'enableWarrantyAlerts', 'warrantyAlertDays'
        ];
        const safeData = pickAllowedFields(data, allowedFields);

        return await AssetSettings.updateSettings(firmId, safeData, userId);
    } catch (error) {
        logger.error('Error updating settings:', error);
        throw error;
    }
};

// ═══════════════════════════════════════════════════════════════
// HELPER METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Calculate depreciation for an asset
 * @param {String} assetId - Asset ID
 * @param {String} firmId - Firm ID
 * @returns {Promise<Object>} - Depreciation calculation
 */
const calculateDepreciation = async (assetId, firmId) => {
    try {
        const asset = await Asset.findOne({ _id: sanitizeObjectId(assetId), firmId });

        if (!asset) {
            throw CustomException('Resource not found', 404);
        }

        const depreciationAmount = asset.calculateDepreciation();

        return {
            assetId: asset._id,
            assetName: asset.assetName,
            currentValue: asset.currentValue,
            accumulatedDepreciation: asset.accumulatedDepreciation,
            valueAfterDepreciation: asset.valueAfterDepreciation,
            depreciationAmount,
            depreciationMethod: asset.depreciationMethod,
            totalNumberOfDepreciations: asset.totalNumberOfDepreciations
        };
    } catch (error) {
        logger.error('Error calculating depreciation:', error);
        throw error;
    }
};

/**
 * Process asset movement
 * @param {String} movementId - Movement ID
 * @param {String} firmId - Firm ID
 * @param {String} userId - User ID processing the movement
 * @returns {Promise<Object>} - Processed movement
 */
const processAssetMovement = async (movementId, firmId, userId) => {
    try {
        const movement = await AssetMovement.findOne({ _id: sanitizeObjectId(movementId), firmId });

        if (!movement) {
            throw CustomException('Resource not found', 404);
        }

        // Auto-approve and complete the movement
        if (movement.status === 'pending') {
            await movement.approve(userId);
        }
        await movement.complete(userId);

        return movement;
    } catch (error) {
        logger.error('Error processing asset movement:', error);
        throw error;
    }
};

/**
 * Get upcoming maintenance
 * @param {String} firmId - Firm ID
 * @param {Number} daysAhead - Days to look ahead (default 30)
 * @returns {Promise<Array>} - Upcoming maintenance schedules
 */
const getUpcomingMaintenance = async (firmId, daysAhead = 30) => {
    try {
        return await MaintenanceSchedule.getUpcomingMaintenance(daysAhead, firmId);
    } catch (error) {
        logger.error('Error getting upcoming maintenance:', error);
        throw error;
    }
};

/**
 * Get expiring warranties
 * @param {String} firmId - Firm ID
 * @param {Number} daysAhead - Days to look ahead (default 30)
 * @returns {Promise<Array>} - Assets with expiring warranties
 */
const getExpiringWarranties = async (firmId, daysAhead = 30) => {
    try {
        return await Asset.getExpiringWarranties(daysAhead, firmId);
    } catch (error) {
        logger.error('Error getting expiring warranties:', error);
        throw error;
    }
};

// ═══════════════════════════════════════════════════════════════
// MODULE EXPORTS
// ═══════════════════════════════════════════════════════════════

module.exports = {
    // Assets
    getAssets,
    getAssetById,
    createAsset,
    updateAsset,
    submitAsset,
    deleteAsset,

    // Categories
    getCategories,
    getCategoryById,
    createCategory,
    updateCategory,
    deleteCategory,

    // Maintenance
    getMaintenanceSchedules,
    getMaintenanceScheduleById,
    createMaintenanceSchedule,
    updateMaintenanceSchedule,
    completeMaintenanceSchedule,

    // Movements
    getMovements,
    createMovement,

    // Stats & Settings
    getStats,
    getSettings,
    updateSettings,

    // Helper methods
    calculateDepreciation,
    processAssetMovement,
    getUpcomingMaintenance,
    getExpiringWarranties
};
