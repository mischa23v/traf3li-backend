/**
 * Assets Extended Routes
 *
 * Extended asset management including depreciation, maintenance, and repairs.
 * Follows gold standard security patterns from FIRM_ISOLATION.md.
 *
 * Endpoints:
 * - GET /:assetId/depreciation           - Get asset depreciation schedule
 * - POST /:assetId/depreciation/calculate - Calculate depreciation
 * - GET /:assetId/maintenance            - Get maintenance schedules
 * - POST /:assetId/maintenance           - Create maintenance schedule
 * - GET /:assetId/maintenance/:scheduleId - Get specific schedule
 * - PUT /:assetId/maintenance/:scheduleId - Update schedule
 * - DELETE /:assetId/maintenance/:scheduleId - Delete schedule
 * - POST /:assetId/maintenance/:scheduleId/complete - Complete maintenance
 * - POST /:id/sell                       - Sell asset
 * - POST /:id/scrap                      - Scrap asset
 * - GET /repairs                         - List all repairs
 * - POST /repairs                        - Create repair record
 * - GET /repairs/:id                     - Get repair by ID
 * - PUT /repairs/:id                     - Update repair
 * - POST /repairs/:id/complete           - Complete repair
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Asset = require('../models/asset.model');
const Firm = require('../models/firm.model');
const { CustomException } = require('../utils');
const { pickAllowedFields, sanitizeObjectId, sanitizePagination } = require('../utils/securityUtils');
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Allowed fields
const ALLOWED_MAINTENANCE_FIELDS = [
    'title', 'description', 'scheduledDate', 'frequency', 'assignedTo',
    'estimatedCost', 'notes', 'priority', 'type', 'vendorId'
];

const ALLOWED_REPAIR_FIELDS = [
    'assetId', 'title', 'description', 'reportedDate', 'priority',
    'estimatedCost', 'actualCost', 'assignedTo', 'vendorId', 'notes',
    'partsRequired', 'status'
];

// Valid values
const VALID_FREQUENCIES = ['once', 'daily', 'weekly', 'monthly', 'quarterly', 'yearly'];
const VALID_PRIORITIES = ['low', 'medium', 'high', 'critical'];
const VALID_REPAIR_STATUSES = ['reported', 'in_progress', 'waiting_parts', 'completed', 'cancelled'];
const VALID_DEPRECIATION_METHODS = ['straight_line', 'declining_balance', 'sum_of_years', 'units_of_production'];

/**
 * GET /:assetId/depreciation - Get asset depreciation schedule
 */
router.get('/:assetId/depreciation', async (req, res, next) => {
    try {
        const assetId = sanitizeObjectId(req.params.assetId, 'assetId');

        const asset = await Asset.findOne({ _id: assetId, ...req.firmQuery }).lean();
        if (!asset) {
            throw CustomException('Asset not found', 404);
        }

        // Calculate depreciation schedule
        const purchaseDate = new Date(asset.purchaseDate || asset.createdAt);
        const purchasePrice = asset.purchasePrice || asset.value || 0;
        const salvageValue = asset.salvageValue || 0;
        const usefulLife = asset.usefulLifeYears || 5;
        const method = asset.depreciationMethod || 'straight_line';

        const schedule = [];
        let bookValue = purchasePrice;

        for (let year = 1; year <= usefulLife; year++) {
            let depreciation = 0;

            switch (method) {
                case 'straight_line':
                    depreciation = (purchasePrice - salvageValue) / usefulLife;
                    break;
                case 'declining_balance':
                    const rate = 2 / usefulLife; // Double declining balance
                    depreciation = Math.max(bookValue * rate, 0);
                    break;
                case 'sum_of_years':
                    const sumOfYears = (usefulLife * (usefulLife + 1)) / 2;
                    const remainingLife = usefulLife - year + 1;
                    depreciation = ((purchasePrice - salvageValue) * remainingLife) / sumOfYears;
                    break;
                default:
                    depreciation = (purchasePrice - salvageValue) / usefulLife;
            }

            bookValue = Math.max(bookValue - depreciation, salvageValue);

            schedule.push({
                year,
                startOfYear: new Date(purchaseDate.getFullYear() + year - 1, purchaseDate.getMonth(), purchaseDate.getDate()),
                depreciation: Math.round(depreciation * 100) / 100,
                accumulatedDepreciation: Math.round((purchasePrice - bookValue) * 100) / 100,
                bookValue: Math.round(bookValue * 100) / 100
            });
        }

        res.json({
            success: true,
            data: {
                assetId: asset._id,
                assetName: asset.name,
                purchasePrice,
                salvageValue,
                usefulLifeYears: usefulLife,
                depreciationMethod: method,
                schedule
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /:assetId/depreciation/calculate - Calculate depreciation for specific period
 */
router.post('/:assetId/depreciation/calculate', async (req, res, next) => {
    try {
        const assetId = sanitizeObjectId(req.params.assetId, 'assetId');
        const { method, asOfDate } = req.body;

        const asset = await Asset.findOne({ _id: assetId, ...req.firmQuery }).lean();
        if (!asset) {
            throw CustomException('Asset not found', 404);
        }

        const depMethod = method || asset.depreciationMethod || 'straight_line';
        if (!VALID_DEPRECIATION_METHODS.includes(depMethod)) {
            throw CustomException(`Invalid depreciation method. Must be one of: ${VALID_DEPRECIATION_METHODS.join(', ')}`, 400);
        }

        const purchaseDate = new Date(asset.purchaseDate || asset.createdAt);
        const calculateDate = asOfDate ? new Date(asOfDate) : new Date();
        const purchasePrice = asset.purchasePrice || asset.value || 0;
        const salvageValue = asset.salvageValue || 0;
        const usefulLife = asset.usefulLifeYears || 5;

        // Calculate years elapsed
        const yearsElapsed = Math.min(
            (calculateDate.getTime() - purchaseDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000),
            usefulLife
        );

        let accumulatedDepreciation = 0;

        switch (depMethod) {
            case 'straight_line':
                accumulatedDepreciation = ((purchasePrice - salvageValue) / usefulLife) * yearsElapsed;
                break;
            case 'declining_balance':
                const rate = 2 / usefulLife;
                let tempValue = purchasePrice;
                for (let i = 0; i < Math.floor(yearsElapsed); i++) {
                    const yearDep = tempValue * rate;
                    tempValue -= yearDep;
                    accumulatedDepreciation += yearDep;
                }
                // Partial year
                const partialYear = yearsElapsed % 1;
                accumulatedDepreciation += tempValue * rate * partialYear;
                break;
            default:
                accumulatedDepreciation = ((purchasePrice - salvageValue) / usefulLife) * yearsElapsed;
        }

        accumulatedDepreciation = Math.min(accumulatedDepreciation, purchasePrice - salvageValue);
        const currentBookValue = purchasePrice - accumulatedDepreciation;

        res.json({
            success: true,
            data: {
                assetId: asset._id,
                assetName: asset.name,
                method: depMethod,
                asOfDate: calculateDate,
                yearsElapsed: Math.round(yearsElapsed * 100) / 100,
                purchasePrice,
                salvageValue,
                accumulatedDepreciation: Math.round(accumulatedDepreciation * 100) / 100,
                currentBookValue: Math.round(currentBookValue * 100) / 100
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /:assetId/maintenance - Get maintenance schedules for asset
 */
router.get('/:assetId/maintenance', async (req, res, next) => {
    try {
        const assetId = sanitizeObjectId(req.params.assetId, 'assetId');
        const { status, upcoming } = req.query;

        const asset = await Asset.findOne({ _id: assetId, ...req.firmQuery }).lean();
        if (!asset) {
            throw CustomException('Asset not found', 404);
        }

        let schedules = asset.maintenanceSchedules || [];

        if (status) {
            schedules = schedules.filter(s => s.status === status);
        }
        if (upcoming === 'true') {
            const now = new Date();
            schedules = schedules.filter(s =>
                s.status !== 'completed' && new Date(s.scheduledDate) >= now
            );
        }

        schedules.sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate));

        res.json({
            success: true,
            data: schedules
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /:assetId/maintenance - Create maintenance schedule
 */
router.post('/:assetId/maintenance', async (req, res, next) => {
    try {
        const assetId = sanitizeObjectId(req.params.assetId, 'assetId');
        const safeData = pickAllowedFields(req.body, ALLOWED_MAINTENANCE_FIELDS);

        if (!safeData.title) {
            throw CustomException('Maintenance title is required', 400);
        }
        if (!safeData.scheduledDate) {
            throw CustomException('Scheduled date is required', 400);
        }

        if (safeData.frequency && !VALID_FREQUENCIES.includes(safeData.frequency)) {
            throw CustomException(`Invalid frequency. Must be one of: ${VALID_FREQUENCIES.join(', ')}`, 400);
        }
        if (safeData.priority && !VALID_PRIORITIES.includes(safeData.priority)) {
            throw CustomException(`Invalid priority. Must be one of: ${VALID_PRIORITIES.join(', ')}`, 400);
        }

        const asset = await Asset.findOne({ _id: assetId, ...req.firmQuery });
        if (!asset) {
            throw CustomException('Asset not found', 404);
        }

        if (!asset.maintenanceSchedules) asset.maintenanceSchedules = [];

        const schedule = {
            _id: new mongoose.Types.ObjectId(),
            ...safeData,
            scheduledDate: new Date(safeData.scheduledDate),
            status: 'scheduled',
            createdBy: req.userID,
            createdAt: new Date()
        };

        asset.maintenanceSchedules.push(schedule);
        await asset.save();

        res.status(201).json({
            success: true,
            message: 'Maintenance schedule created',
            data: schedule
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /:assetId/maintenance/:scheduleId - Get specific maintenance schedule
 */
router.get('/:assetId/maintenance/:scheduleId', async (req, res, next) => {
    try {
        const assetId = sanitizeObjectId(req.params.assetId, 'assetId');
        const scheduleId = sanitizeObjectId(req.params.scheduleId, 'scheduleId');

        const asset = await Asset.findOne({ _id: assetId, ...req.firmQuery }).lean();
        if (!asset) {
            throw CustomException('Asset not found', 404);
        }

        const schedule = (asset.maintenanceSchedules || []).find(
            s => s._id?.toString() === scheduleId.toString()
        );

        if (!schedule) {
            throw CustomException('Maintenance schedule not found', 404);
        }

        res.json({
            success: true,
            data: schedule
        });
    } catch (error) {
        next(error);
    }
});

/**
 * PUT /:assetId/maintenance/:scheduleId - Update maintenance schedule
 */
router.put('/:assetId/maintenance/:scheduleId', async (req, res, next) => {
    try {
        const assetId = sanitizeObjectId(req.params.assetId, 'assetId');
        const scheduleId = sanitizeObjectId(req.params.scheduleId, 'scheduleId');
        const safeData = pickAllowedFields(req.body, ALLOWED_MAINTENANCE_FIELDS);

        const asset = await Asset.findOne({ _id: assetId, ...req.firmQuery });
        if (!asset) {
            throw CustomException('Asset not found', 404);
        }

        const scheduleIndex = (asset.maintenanceSchedules || []).findIndex(
            s => s._id?.toString() === scheduleId.toString()
        );

        if (scheduleIndex === -1) {
            throw CustomException('Maintenance schedule not found', 404);
        }

        if (safeData.scheduledDate) {
            safeData.scheduledDate = new Date(safeData.scheduledDate);
        }

        Object.assign(asset.maintenanceSchedules[scheduleIndex], safeData, {
            updatedBy: req.userID,
            updatedAt: new Date()
        });

        await asset.save();

        res.json({
            success: true,
            message: 'Maintenance schedule updated',
            data: asset.maintenanceSchedules[scheduleIndex]
        });
    } catch (error) {
        next(error);
    }
});

/**
 * DELETE /:assetId/maintenance/:scheduleId - Delete maintenance schedule
 */
router.delete('/:assetId/maintenance/:scheduleId', async (req, res, next) => {
    try {
        const assetId = sanitizeObjectId(req.params.assetId, 'assetId');
        const scheduleId = sanitizeObjectId(req.params.scheduleId, 'scheduleId');

        const asset = await Asset.findOne({ _id: assetId, ...req.firmQuery });
        if (!asset) {
            throw CustomException('Asset not found', 404);
        }

        const scheduleIndex = (asset.maintenanceSchedules || []).findIndex(
            s => s._id?.toString() === scheduleId.toString()
        );

        if (scheduleIndex === -1) {
            throw CustomException('Maintenance schedule not found', 404);
        }

        asset.maintenanceSchedules.splice(scheduleIndex, 1);
        await asset.save();

        res.json({
            success: true,
            message: 'Maintenance schedule deleted'
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /:assetId/maintenance/:scheduleId/complete - Complete maintenance
 */
router.post('/:assetId/maintenance/:scheduleId/complete', async (req, res, next) => {
    try {
        const assetId = sanitizeObjectId(req.params.assetId, 'assetId');
        const scheduleId = sanitizeObjectId(req.params.scheduleId, 'scheduleId');
        const { actualCost, notes, completedDate } = req.body;

        const asset = await Asset.findOne({ _id: assetId, ...req.firmQuery });
        if (!asset) {
            throw CustomException('Asset not found', 404);
        }

        const scheduleIndex = (asset.maintenanceSchedules || []).findIndex(
            s => s._id?.toString() === scheduleId.toString()
        );

        if (scheduleIndex === -1) {
            throw CustomException('Maintenance schedule not found', 404);
        }

        if (asset.maintenanceSchedules[scheduleIndex].status === 'completed') {
            throw CustomException('Maintenance already completed', 400);
        }

        asset.maintenanceSchedules[scheduleIndex].status = 'completed';
        asset.maintenanceSchedules[scheduleIndex].completedAt = completedDate ? new Date(completedDate) : new Date();
        asset.maintenanceSchedules[scheduleIndex].completedBy = req.userID;
        if (actualCost !== undefined) asset.maintenanceSchedules[scheduleIndex].actualCost = actualCost;
        if (notes) asset.maintenanceSchedules[scheduleIndex].completionNotes = notes;

        // Update asset's last maintenance date
        asset.lastMaintenanceDate = asset.maintenanceSchedules[scheduleIndex].completedAt;

        await asset.save();

        res.json({
            success: true,
            message: 'Maintenance completed',
            data: asset.maintenanceSchedules[scheduleIndex]
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /:id/sell - Sell asset
 */
router.post('/:id/sell', async (req, res, next) => {
    try {
        const id = sanitizeObjectId(req.params.id, 'id');
        const { salePrice, saleDate, buyerName, buyerContact, notes } = req.body;

        if (salePrice === undefined || salePrice === null) {
            throw CustomException('Sale price is required', 400);
        }

        const asset = await Asset.findOne({ _id: id, ...req.firmQuery });
        if (!asset) {
            throw CustomException('Asset not found', 404);
        }

        if (asset.status === 'sold') {
            throw CustomException('Asset is already sold', 400);
        }
        if (asset.status === 'scrapped') {
            throw CustomException('Cannot sell a scrapped asset', 400);
        }

        // Calculate gain/loss
        const bookValue = asset.currentBookValue || asset.purchasePrice || 0;
        const gainLoss = salePrice - bookValue;

        asset.status = 'sold';
        asset.saleDetails = {
            salePrice,
            saleDate: saleDate ? new Date(saleDate) : new Date(),
            buyerName,
            buyerContact,
            bookValueAtSale: bookValue,
            gainLoss,
            notes,
            processedBy: req.userID,
            processedAt: new Date()
        };

        await asset.save();

        res.json({
            success: true,
            message: 'Asset sold successfully',
            data: {
                asset,
                salePrice,
                bookValue,
                gainLoss,
                isGain: gainLoss >= 0
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /:id/scrap - Scrap asset
 */
router.post('/:id/scrap', async (req, res, next) => {
    try {
        const id = sanitizeObjectId(req.params.id, 'id');
        const { reason, scrapDate, scrapValue, notes } = req.body;

        if (!reason) {
            throw CustomException('Scrap reason is required', 400);
        }

        const asset = await Asset.findOne({ _id: id, ...req.firmQuery });
        if (!asset) {
            throw CustomException('Asset not found', 404);
        }

        if (asset.status === 'scrapped') {
            throw CustomException('Asset is already scrapped', 400);
        }
        if (asset.status === 'sold') {
            throw CustomException('Cannot scrap a sold asset', 400);
        }

        const bookValue = asset.currentBookValue || asset.purchasePrice || 0;
        const writeOffAmount = bookValue - (scrapValue || 0);

        asset.status = 'scrapped';
        asset.scrapDetails = {
            reason,
            scrapDate: scrapDate ? new Date(scrapDate) : new Date(),
            scrapValue: scrapValue || 0,
            bookValueAtScrap: bookValue,
            writeOffAmount,
            notes,
            processedBy: req.userID,
            processedAt: new Date()
        };

        await asset.save();

        res.json({
            success: true,
            message: 'Asset scrapped successfully',
            data: {
                asset,
                writeOffAmount,
                scrapValue: scrapValue || 0
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /repairs - List all repairs
 */
router.get('/repairs', async (req, res, next) => {
    try {
        const { page, limit, skip } = sanitizePagination(req.query.page, req.query.limit);
        const { status, priority, assetId, search } = req.query;

        const firm = await Firm.findOne(req.firmQuery).select('assets.repairs').lean();
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        let repairs = firm.assets?.repairs || [];

        if (status) {
            if (!VALID_REPAIR_STATUSES.includes(status)) {
                throw CustomException(`Invalid status. Must be one of: ${VALID_REPAIR_STATUSES.join(', ')}`, 400);
            }
            repairs = repairs.filter(r => r.status === status);
        }
        if (priority) {
            repairs = repairs.filter(r => r.priority === priority);
        }
        if (assetId) {
            const sanitizedAssetId = sanitizeObjectId(assetId, 'assetId');
            repairs = repairs.filter(r => r.assetId?.toString() === sanitizedAssetId.toString());
        }
        if (search) {
            const pattern = escapeRegex(search).toLowerCase();
            repairs = repairs.filter(r =>
                r.title?.toLowerCase().includes(pattern) ||
                r.description?.toLowerCase().includes(pattern)
            );
        }

        repairs.sort((a, b) => new Date(b.reportedDate || b.createdAt) - new Date(a.reportedDate || a.createdAt));

        const total = repairs.length;
        const paginatedRepairs = repairs.slice(skip, skip + limit);

        res.json({
            success: true,
            data: paginatedRepairs,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /repairs - Create repair record
 */
router.post('/repairs', async (req, res, next) => {
    try {
        const safeData = pickAllowedFields(req.body, ALLOWED_REPAIR_FIELDS);

        if (!safeData.assetId) {
            throw CustomException('Asset ID is required', 400);
        }
        if (!safeData.title) {
            throw CustomException('Repair title is required', 400);
        }

        safeData.assetId = sanitizeObjectId(safeData.assetId, 'assetId');

        // Verify asset exists
        const asset = await Asset.findOne({ _id: safeData.assetId, ...req.firmQuery });
        if (!asset) {
            throw CustomException('Asset not found', 404);
        }

        if (safeData.priority && !VALID_PRIORITIES.includes(safeData.priority)) {
            throw CustomException(`Invalid priority. Must be one of: ${VALID_PRIORITIES.join(', ')}`, 400);
        }

        const firm = await Firm.findOne(req.firmQuery);
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        if (!firm.assets) firm.assets = {};
        if (!firm.assets.repairs) firm.assets.repairs = [];

        const repair = {
            _id: new mongoose.Types.ObjectId(),
            ...safeData,
            assetName: asset.name,
            status: safeData.status || 'reported',
            reportedDate: safeData.reportedDate ? new Date(safeData.reportedDate) : new Date(),
            reportedBy: req.userID,
            createdAt: new Date()
        };

        firm.assets.repairs.push(repair);
        await firm.save();

        res.status(201).json({
            success: true,
            message: 'Repair record created',
            data: repair
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /repairs/:id - Get repair by ID
 */
router.get('/repairs/:id', async (req, res, next) => {
    try {
        const id = sanitizeObjectId(req.params.id, 'id');

        const firm = await Firm.findOne(req.firmQuery).select('assets.repairs').lean();
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const repair = (firm.assets?.repairs || []).find(
            r => r._id?.toString() === id.toString()
        );

        if (!repair) {
            throw CustomException('Repair not found', 404);
        }

        res.json({
            success: true,
            data: repair
        });
    } catch (error) {
        next(error);
    }
});

/**
 * PUT /repairs/:id - Update repair
 */
router.put('/repairs/:id', async (req, res, next) => {
    try {
        const id = sanitizeObjectId(req.params.id, 'id');
        const safeData = pickAllowedFields(req.body, ALLOWED_REPAIR_FIELDS);

        const firm = await Firm.findOne(req.firmQuery);
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const repairIndex = (firm.assets?.repairs || []).findIndex(
            r => r._id?.toString() === id.toString()
        );

        if (repairIndex === -1) {
            throw CustomException('Repair not found', 404);
        }

        if (safeData.status && !VALID_REPAIR_STATUSES.includes(safeData.status)) {
            throw CustomException(`Invalid status. Must be one of: ${VALID_REPAIR_STATUSES.join(', ')}`, 400);
        }

        Object.assign(firm.assets.repairs[repairIndex], safeData, {
            updatedBy: req.userID,
            updatedAt: new Date()
        });

        await firm.save();

        res.json({
            success: true,
            message: 'Repair updated',
            data: firm.assets.repairs[repairIndex]
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /repairs/:id/complete - Complete repair
 */
router.post('/repairs/:id/complete', async (req, res, next) => {
    try {
        const id = sanitizeObjectId(req.params.id, 'id');
        const { actualCost, notes, completedDate } = req.body;

        const firm = await Firm.findOne(req.firmQuery);
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const repairIndex = (firm.assets?.repairs || []).findIndex(
            r => r._id?.toString() === id.toString()
        );

        if (repairIndex === -1) {
            throw CustomException('Repair not found', 404);
        }

        if (firm.assets.repairs[repairIndex].status === 'completed') {
            throw CustomException('Repair already completed', 400);
        }

        firm.assets.repairs[repairIndex].status = 'completed';
        firm.assets.repairs[repairIndex].completedAt = completedDate ? new Date(completedDate) : new Date();
        firm.assets.repairs[repairIndex].completedBy = req.userID;
        if (actualCost !== undefined) firm.assets.repairs[repairIndex].actualCost = actualCost;
        if (notes) firm.assets.repairs[repairIndex].completionNotes = notes;

        await firm.save();

        res.json({
            success: true,
            message: 'Repair completed',
            data: firm.assets.repairs[repairIndex]
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
