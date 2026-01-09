/**
 * HR Vehicles Routes
 *
 * Company vehicle and fleet management.
 * Follows gold standard security patterns from FIRM_ISOLATION.md.
 *
 * Endpoints:
 * - GET /                         - Get all vehicles
 * - GET /:vehicleId               - Get vehicle by ID
 * - POST /                        - Add new vehicle
 * - PATCH /:vehicleId             - Update vehicle
 * - DELETE /:vehicleId            - Delete vehicle
 * - GET /:vehicleId/assignments   - Get vehicle assignments
 * - POST /:vehicleId/assign       - Assign vehicle to employee
 * - POST /:vehicleId/unassign     - Unassign vehicle
 * - GET /:vehicleId/maintenance   - Get maintenance history
 * - POST /:vehicleId/maintenance  - Log maintenance
 * - GET /:vehicleId/expenses      - Get vehicle expenses
 * - POST /:vehicleId/expenses     - Log vehicle expense
 * - GET /available                - Get available vehicles
 * - GET /assigned                 - Get assigned vehicles
 * - GET /stats                    - Get fleet statistics
 * - GET /export                   - Export vehicle data
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Firm = require('../models/firm.model');
const { CustomException } = require('../utils');
const { pickAllowedFields, sanitizeObjectId, sanitizePagination } = require('../utils/securityUtils');
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Allowed fields for vehicles
const ALLOWED_VEHICLE_FIELDS = [
    'make', 'model', 'year', 'licensePlate', 'vin', 'color',
    'fuelType', 'transmission', 'mileage', 'purchaseDate', 'purchasePrice',
    'insuranceExpiry', 'registrationExpiry', 'status', 'location',
    'notes', 'category', 'metadata'
];

// Allowed fields for maintenance
const ALLOWED_MAINTENANCE_FIELDS = [
    'type', 'description', 'date', 'mileage', 'cost',
    'vendor', 'notes', 'nextDueDate', 'nextDueMileage'
];

// Allowed fields for expenses
const ALLOWED_EXPENSE_FIELDS = [
    'type', 'description', 'date', 'amount', 'vendor',
    'receipt', 'mileage', 'notes'
];

// Valid statuses
const VALID_STATUSES = ['available', 'assigned', 'maintenance', 'retired'];
const VALID_FUEL_TYPES = ['gasoline', 'diesel', 'electric', 'hybrid', 'lpg'];

/**
 * GET / - Get all vehicles
 */
router.get('/', async (req, res, next) => {
    try {
        const { page, limit, skip } = sanitizePagination(req.query.page, req.query.limit);
        const { status, fuelType, category, search } = req.query;

        const firm = await Firm.findOne(req.firmQuery).select('hr.vehicles').lean();
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        let vehicles = firm.hr?.vehicles || [];

        if (status) {
            vehicles = vehicles.filter(v => v.status === status);
        }
        if (fuelType) {
            vehicles = vehicles.filter(v => v.fuelType === fuelType);
        }
        if (category) {
            vehicles = vehicles.filter(v => v.category === category);
        }
        if (search) {
            const pattern = escapeRegex(search).toLowerCase();
            vehicles = vehicles.filter(v =>
                v.make?.toLowerCase().includes(pattern) ||
                v.model?.toLowerCase().includes(pattern) ||
                v.licensePlate?.toLowerCase().includes(pattern)
            );
        }

        vehicles.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        const total = vehicles.length;
        const paginatedVehicles = vehicles.slice(skip, skip + limit);

        res.json({
            success: true,
            data: paginatedVehicles,
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
 * GET /available - Get available vehicles
 */
router.get('/available', async (req, res, next) => {
    try {
        const firm = await Firm.findOne(req.firmQuery).select('hr.vehicles').lean();
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const available = (firm.hr?.vehicles || []).filter(v => v.status === 'available');

        res.json({
            success: true,
            data: available,
            count: available.length
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /assigned - Get assigned vehicles
 */
router.get('/assigned', async (req, res, next) => {
    try {
        const firm = await Firm.findOne(req.firmQuery).select('hr.vehicles').lean();
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const assigned = (firm.hr?.vehicles || []).filter(v => v.status === 'assigned');

        res.json({
            success: true,
            data: assigned,
            count: assigned.length
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /stats - Get fleet statistics
 */
router.get('/stats', async (req, res, next) => {
    try {
        const firm = await Firm.findOne(req.firmQuery).select('hr.vehicles').lean();
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const vehicles = firm.hr?.vehicles || [];

        const statusCounts = {};
        const fuelTypeCounts = {};
        let totalValue = 0;
        let totalMileage = 0;
        let totalMaintenanceCost = 0;
        let upcomingMaintenance = 0;
        let expiringInsurance = 0;
        let expiringRegistration = 0;

        const now = new Date();
        const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

        vehicles.forEach(vehicle => {
            statusCounts[vehicle.status] = (statusCounts[vehicle.status] || 0) + 1;
            fuelTypeCounts[vehicle.fuelType] = (fuelTypeCounts[vehicle.fuelType] || 0) + 1;
            totalValue += vehicle.purchasePrice || 0;
            totalMileage += vehicle.mileage || 0;

            (vehicle.maintenance || []).forEach(m => {
                totalMaintenanceCost += m.cost || 0;
                if (m.nextDueDate && new Date(m.nextDueDate) <= thirtyDaysFromNow) {
                    upcomingMaintenance++;
                }
            });

            if (vehicle.insuranceExpiry && new Date(vehicle.insuranceExpiry) <= thirtyDaysFromNow) {
                expiringInsurance++;
            }
            if (vehicle.registrationExpiry && new Date(vehicle.registrationExpiry) <= thirtyDaysFromNow) {
                expiringRegistration++;
            }
        });

        res.json({
            success: true,
            data: {
                totalVehicles: vehicles.length,
                byStatus: statusCounts,
                byFuelType: fuelTypeCounts,
                totalFleetValue: totalValue,
                totalMileage,
                averageMileage: vehicles.length > 0 ? Math.round(totalMileage / vehicles.length) : 0,
                totalMaintenanceCost,
                alerts: {
                    upcomingMaintenance,
                    expiringInsurance,
                    expiringRegistration
                }
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /export - Export vehicle data
 */
router.get('/export', async (req, res, next) => {
    try {
        const { format = 'json', status } = req.query;

        const firm = await Firm.findOne(req.firmQuery).select('hr.vehicles').lean();
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        let vehicles = firm.hr?.vehicles || [];

        if (status) {
            vehicles = vehicles.filter(v => v.status === status);
        }

        if (format === 'csv') {
            const headers = ['Make', 'Model', 'Year', 'License Plate', 'VIN', 'Status', 'Fuel Type', 'Mileage', 'Purchase Price'];
            const csvRows = [headers.join(',')];

            for (const v of vehicles) {
                const row = [
                    `"${(v.make || '').replace(/"/g, '""')}"`,
                    `"${(v.model || '').replace(/"/g, '""')}"`,
                    v.year || '',
                    v.licensePlate || '',
                    v.vin || '',
                    v.status || '',
                    v.fuelType || '',
                    v.mileage || 0,
                    v.purchasePrice || 0
                ];
                csvRows.push(row.join(','));
            }

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=vehicles.csv');
            return res.send(csvRows.join('\n'));
        }

        res.json({
            success: true,
            data: vehicles,
            exportedAt: new Date(),
            count: vehicles.length
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /:vehicleId - Get vehicle by ID
 */
router.get('/:vehicleId', async (req, res, next) => {
    try {
        const vehicleId = sanitizeObjectId(req.params.vehicleId, 'vehicleId');

        const firm = await Firm.findOne(req.firmQuery).select('hr.vehicles').lean();
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const vehicle = (firm.hr?.vehicles || []).find(
            v => v._id?.toString() === vehicleId.toString()
        );

        if (!vehicle) {
            throw CustomException('Vehicle not found', 404);
        }

        res.json({
            success: true,
            data: vehicle
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /:vehicleId/assignments - Get vehicle assignment history
 */
router.get('/:vehicleId/assignments', async (req, res, next) => {
    try {
        const vehicleId = sanitizeObjectId(req.params.vehicleId, 'vehicleId');

        const firm = await Firm.findOne(req.firmQuery).select('hr.vehicles').lean();
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const vehicle = (firm.hr?.vehicles || []).find(
            v => v._id?.toString() === vehicleId.toString()
        );

        if (!vehicle) {
            throw CustomException('Vehicle not found', 404);
        }

        const assignments = vehicle.assignmentHistory || [];
        assignments.sort((a, b) => new Date(b.assignedAt) - new Date(a.assignedAt));

        res.json({
            success: true,
            data: {
                currentAssignment: vehicle.currentAssignment || null,
                history: assignments
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /:vehicleId/maintenance - Get maintenance history
 */
router.get('/:vehicleId/maintenance', async (req, res, next) => {
    try {
        const vehicleId = sanitizeObjectId(req.params.vehicleId, 'vehicleId');

        const firm = await Firm.findOne(req.firmQuery).select('hr.vehicles').lean();
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const vehicle = (firm.hr?.vehicles || []).find(
            v => v._id?.toString() === vehicleId.toString()
        );

        if (!vehicle) {
            throw CustomException('Vehicle not found', 404);
        }

        const maintenance = vehicle.maintenance || [];
        maintenance.sort((a, b) => new Date(b.date) - new Date(a.date));

        res.json({
            success: true,
            data: maintenance
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /:vehicleId/expenses - Get vehicle expenses
 */
router.get('/:vehicleId/expenses', async (req, res, next) => {
    try {
        const vehicleId = sanitizeObjectId(req.params.vehicleId, 'vehicleId');

        const firm = await Firm.findOne(req.firmQuery).select('hr.vehicles').lean();
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const vehicle = (firm.hr?.vehicles || []).find(
            v => v._id?.toString() === vehicleId.toString()
        );

        if (!vehicle) {
            throw CustomException('Vehicle not found', 404);
        }

        const expenses = vehicle.expenses || [];
        expenses.sort((a, b) => new Date(b.date) - new Date(a.date));

        const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

        res.json({
            success: true,
            data: {
                expenses,
                total: totalExpenses,
                count: expenses.length
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST / - Add new vehicle
 */
router.post('/', async (req, res, next) => {
    try {
        const safeData = pickAllowedFields(req.body, ALLOWED_VEHICLE_FIELDS);

        if (!safeData.make || !safeData.model) {
            throw CustomException('Make and model are required', 400);
        }

        if (safeData.fuelType && !VALID_FUEL_TYPES.includes(safeData.fuelType)) {
            throw CustomException(`Invalid fuel type. Must be one of: ${VALID_FUEL_TYPES.join(', ')}`, 400);
        }

        const firm = await Firm.findOne(req.firmQuery);
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        if (!firm.hr) firm.hr = {};
        if (!firm.hr.vehicles) firm.hr.vehicles = [];

        // Check for duplicate license plate
        if (safeData.licensePlate) {
            const existing = firm.hr.vehicles.find(
                v => v.licensePlate?.toLowerCase() === safeData.licensePlate.toLowerCase()
            );
            if (existing) {
                throw CustomException('Vehicle with this license plate already exists', 400);
            }
        }

        const vehicle = {
            _id: new mongoose.Types.ObjectId(),
            ...safeData,
            status: 'available',
            maintenance: [],
            expenses: [],
            assignmentHistory: [],
            createdBy: req.userID,
            createdAt: new Date()
        };

        firm.hr.vehicles.push(vehicle);
        await firm.save();

        res.status(201).json({
            success: true,
            message: 'Vehicle added',
            data: vehicle
        });
    } catch (error) {
        next(error);
    }
});

/**
 * PATCH /:vehicleId - Update vehicle
 */
router.patch('/:vehicleId', async (req, res, next) => {
    try {
        const vehicleId = sanitizeObjectId(req.params.vehicleId, 'vehicleId');
        const safeData = pickAllowedFields(req.body, ALLOWED_VEHICLE_FIELDS);

        if (safeData.fuelType && !VALID_FUEL_TYPES.includes(safeData.fuelType)) {
            throw CustomException(`Invalid fuel type. Must be one of: ${VALID_FUEL_TYPES.join(', ')}`, 400);
        }

        const firm = await Firm.findOne(req.firmQuery);
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const vehicleIndex = (firm.hr?.vehicles || []).findIndex(
            v => v._id?.toString() === vehicleId.toString()
        );

        if (vehicleIndex === -1) {
            throw CustomException('Vehicle not found', 404);
        }

        // Check for duplicate license plate (excluding current vehicle)
        if (safeData.licensePlate) {
            const existing = firm.hr.vehicles.find(
                v => v.licensePlate?.toLowerCase() === safeData.licensePlate.toLowerCase() &&
                     v._id?.toString() !== vehicleId.toString()
            );
            if (existing) {
                throw CustomException('Another vehicle with this license plate already exists', 400);
            }
        }

        Object.assign(firm.hr.vehicles[vehicleIndex], safeData, {
            updatedBy: req.userID,
            updatedAt: new Date()
        });

        await firm.save();

        res.json({
            success: true,
            message: 'Vehicle updated',
            data: firm.hr.vehicles[vehicleIndex]
        });
    } catch (error) {
        next(error);
    }
});

/**
 * DELETE /:vehicleId - Delete vehicle
 */
router.delete('/:vehicleId', async (req, res, next) => {
    try {
        const vehicleId = sanitizeObjectId(req.params.vehicleId, 'vehicleId');

        const firm = await Firm.findOne(req.firmQuery);
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const vehicleIndex = (firm.hr?.vehicles || []).findIndex(
            v => v._id?.toString() === vehicleId.toString()
        );

        if (vehicleIndex === -1) {
            throw CustomException('Vehicle not found', 404);
        }

        const vehicle = firm.hr.vehicles[vehicleIndex];
        if (vehicle.status === 'assigned') {
            throw CustomException('Cannot delete an assigned vehicle. Unassign it first.', 400);
        }

        firm.hr.vehicles.splice(vehicleIndex, 1);
        await firm.save();

        res.json({
            success: true,
            message: 'Vehicle deleted'
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /:vehicleId/assign - Assign vehicle to employee
 */
router.post('/:vehicleId/assign', async (req, res, next) => {
    try {
        const vehicleId = sanitizeObjectId(req.params.vehicleId, 'vehicleId');
        const { employeeId, startDate, endDate, notes } = req.body;

        if (!employeeId) {
            throw CustomException('Employee ID is required', 400);
        }

        const sanitizedEmployeeId = sanitizeObjectId(employeeId, 'employeeId');

        const firm = await Firm.findOne(req.firmQuery);
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const vehicle = (firm.hr?.vehicles || []).find(
            v => v._id?.toString() === vehicleId.toString()
        );

        if (!vehicle) {
            throw CustomException('Vehicle not found', 404);
        }

        if (vehicle.status === 'assigned') {
            throw CustomException('Vehicle is already assigned', 400);
        }

        if (vehicle.status === 'maintenance' || vehicle.status === 'retired') {
            throw CustomException(`Cannot assign a vehicle in ${vehicle.status} status`, 400);
        }

        const assignment = {
            _id: new mongoose.Types.ObjectId(),
            employeeId: sanitizedEmployeeId,
            assignedAt: startDate ? new Date(startDate) : new Date(),
            expectedEndDate: endDate ? new Date(endDate) : null,
            notes,
            assignedBy: req.userID
        };

        vehicle.currentAssignment = assignment;
        vehicle.status = 'assigned';
        if (!vehicle.assignmentHistory) vehicle.assignmentHistory = [];
        vehicle.assignmentHistory.push(assignment);
        vehicle.updatedAt = new Date();

        await firm.save();

        res.json({
            success: true,
            message: 'Vehicle assigned',
            data: vehicle
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /:vehicleId/unassign - Unassign vehicle
 */
router.post('/:vehicleId/unassign', async (req, res, next) => {
    try {
        const vehicleId = sanitizeObjectId(req.params.vehicleId, 'vehicleId');
        const { reason, mileageReturned } = req.body;

        const firm = await Firm.findOne(req.firmQuery);
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const vehicle = (firm.hr?.vehicles || []).find(
            v => v._id?.toString() === vehicleId.toString()
        );

        if (!vehicle) {
            throw CustomException('Vehicle not found', 404);
        }

        if (vehicle.status !== 'assigned') {
            throw CustomException('Vehicle is not currently assigned', 400);
        }

        // Update the assignment history with return info
        if (vehicle.currentAssignment && vehicle.assignmentHistory?.length > 0) {
            const lastAssignment = vehicle.assignmentHistory[vehicle.assignmentHistory.length - 1];
            lastAssignment.returnedAt = new Date();
            lastAssignment.returnReason = reason;
            lastAssignment.mileageReturned = mileageReturned;
            lastAssignment.returnedBy = req.userID;
        }

        vehicle.currentAssignment = null;
        vehicle.status = 'available';
        if (mileageReturned) {
            vehicle.mileage = mileageReturned;
        }
        vehicle.updatedAt = new Date();

        await firm.save();

        res.json({
            success: true,
            message: 'Vehicle unassigned',
            data: vehicle
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /:vehicleId/maintenance - Log maintenance
 */
router.post('/:vehicleId/maintenance', async (req, res, next) => {
    try {
        const vehicleId = sanitizeObjectId(req.params.vehicleId, 'vehicleId');
        const safeData = pickAllowedFields(req.body, ALLOWED_MAINTENANCE_FIELDS);

        if (!safeData.type) {
            throw CustomException('Maintenance type is required', 400);
        }

        const firm = await Firm.findOne(req.firmQuery);
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const vehicle = (firm.hr?.vehicles || []).find(
            v => v._id?.toString() === vehicleId.toString()
        );

        if (!vehicle) {
            throw CustomException('Vehicle not found', 404);
        }

        const maintenanceRecord = {
            _id: new mongoose.Types.ObjectId(),
            ...safeData,
            date: safeData.date ? new Date(safeData.date) : new Date(),
            loggedBy: req.userID,
            createdAt: new Date()
        };

        if (!vehicle.maintenance) vehicle.maintenance = [];
        vehicle.maintenance.push(maintenanceRecord);

        // Update mileage if provided
        if (safeData.mileage && safeData.mileage > (vehicle.mileage || 0)) {
            vehicle.mileage = safeData.mileage;
        }

        vehicle.updatedAt = new Date();
        await firm.save();

        res.status(201).json({
            success: true,
            message: 'Maintenance logged',
            data: maintenanceRecord
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /:vehicleId/expenses - Log vehicle expense
 */
router.post('/:vehicleId/expenses', async (req, res, next) => {
    try {
        const vehicleId = sanitizeObjectId(req.params.vehicleId, 'vehicleId');
        const safeData = pickAllowedFields(req.body, ALLOWED_EXPENSE_FIELDS);

        if (!safeData.type || !safeData.amount) {
            throw CustomException('Expense type and amount are required', 400);
        }

        const firm = await Firm.findOne(req.firmQuery);
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const vehicle = (firm.hr?.vehicles || []).find(
            v => v._id?.toString() === vehicleId.toString()
        );

        if (!vehicle) {
            throw CustomException('Vehicle not found', 404);
        }

        const expense = {
            _id: new mongoose.Types.ObjectId(),
            ...safeData,
            date: safeData.date ? new Date(safeData.date) : new Date(),
            loggedBy: req.userID,
            createdAt: new Date()
        };

        if (!vehicle.expenses) vehicle.expenses = [];
        vehicle.expenses.push(expense);

        // Update mileage if provided
        if (safeData.mileage && safeData.mileage > (vehicle.mileage || 0)) {
            vehicle.mileage = safeData.mileage;
        }

        vehicle.updatedAt = new Date();
        await firm.save();

        res.status(201).json({
            success: true,
            message: 'Expense logged',
            data: expense
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
