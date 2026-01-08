/**
 * Fleet Management Controller
 *
 * Enterprise vehicle and fleet management
 * Inspired by: SAP Fleet, Oracle Fleet, Fleetio
 */

const mongoose = require('mongoose');
const { Vehicle, FuelLog, MaintenanceRecord, VehicleAssignment } = require('../models/fleet.model');
const Employee = require('../models/employee.model');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');
const logger = require('../utils/logger');

const escapeRegex = (str) => {
    if (!str || typeof str !== 'string') return '';
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

// ═══════════════════════════════════════════════════════════════
// VEHICLE CRUD
// ═══════════════════════════════════════════════════════════════

const getVehicles = async (req, res) => {
    try {
        const { status, vehicleType, currentDriverId, search, page = 1, limit = 20 } = req.query;

        const pageNum = Math.max(1, parseInt(page) || 1);
        const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 20));

        const query = { ...req.firmQuery };

        if (status) query.status = status;
        if (vehicleType) query.vehicleType = vehicleType;
        if (currentDriverId) query.currentDriverId = sanitizeObjectId(currentDriverId);

        if (search) {
            const escapedSearch = escapeRegex(search);
            query.$or = [
                { plateNumber: { $regex: escapedSearch, $options: 'i' } },
                { make: { $regex: escapedSearch, $options: 'i' } },
                { model: { $regex: escapedSearch, $options: 'i' } },
                { vehicleId: { $regex: escapedSearch, $options: 'i' } }
            ];
        }

        const [vehicles, total] = await Promise.all([
            Vehicle.find(query)
                .populate('currentDriverId', 'personalInfo.fullNameEnglish personalInfo.fullNameArabic employeeId')
                .sort({ createdAt: -1 })
                .skip((pageNum - 1) * limitNum)
                .limit(limitNum)
                .lean(),
            Vehicle.countDocuments(query)
        ]);

        res.json({
            success: true,
            data: vehicles,
            pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) }
        });
    } catch (error) {
        logger.error('Error fetching vehicles:', error);
        res.status(500).json({ success: false, message: 'خطأ في جلب المركبات / Error fetching vehicles', error: error.message });
    }
};

const getVehicleById = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            return res.status(400).json({ success: false, message: 'معرف المركبة غير صالح / Invalid vehicle ID' });
        }

        const vehicle = await Vehicle.findOne({ _id: sanitizedId, ...req.firmQuery })
            .populate('currentDriverId', 'personalInfo employeeId')
            .populate('assignedDepartmentId', 'name nameAr');

        if (!vehicle) {
            return res.status(404).json({ success: false, message: 'المركبة غير موجودة / Vehicle not found' });
        }

        res.json({ success: true, data: vehicle });
    } catch (error) {
        logger.error('Error fetching vehicle:', error);
        res.status(500).json({ success: false, message: 'خطأ في جلب المركبة / Error fetching vehicle', error: error.message });
    }
};

const createVehicle = async (req, res) => {
    try {
        const allowedFields = [
            'plateNumber', 'plateNumberAr', 'make', 'model', 'year', 'color', 'colorAr', 'vin',
            'vehicleType', 'ownershipType', 'purchaseDate', 'purchasePrice', 'leaseEndDate', 'monthlyLeaseCost',
            'fuelType', 'engineCapacity', 'tankCapacity', 'seatingCapacity', 'currentOdometer',
            'status', 'currentDriverId', 'assignedDepartmentId',
            'registration', 'insurance', 'lastServiceDate', 'nextServiceDue', 'nextServiceOdometer',
            'notes', 'notesAr'
        ];
        const safeData = pickAllowedFields(req.body, allowedFields);

        if (!safeData.plateNumber || !safeData.make || !safeData.model || !safeData.year || !safeData.vehicleType) {
            return res.status(400).json({
                success: false,
                message: 'رقم اللوحة والشركة والموديل والسنة والنوع مطلوبة / Plate, make, model, year and type are required'
            });
        }

        // Check duplicate plate
        const existing = await Vehicle.findOne({ ...req.firmQuery, plateNumber: safeData.plateNumber });
        if (existing) {
            return res.status(400).json({ success: false, message: 'رقم اللوحة موجود مسبقاً / Plate number already exists' });
        }

        // Get driver details if provided
        if (safeData.currentDriverId) {
            const driver = await Employee.findOne({ _id: sanitizeObjectId(safeData.currentDriverId), ...req.firmQuery });
            if (driver) {
                safeData.currentDriverName = driver.personalInfo?.fullNameEnglish;
                safeData.currentDriverNameAr = driver.personalInfo?.fullNameArabic;
            }
        }

        const vehicle = new Vehicle(req.addFirmId({ ...safeData, createdBy: req.userID }));
        await vehicle.save();

        res.status(201).json({ success: true, message: 'تم إنشاء المركبة بنجاح / Vehicle created successfully', data: vehicle });
    } catch (error) {
        logger.error('Error creating vehicle:', error);
        res.status(500).json({ success: false, message: 'خطأ في إنشاء المركبة / Error creating vehicle', error: error.message });
    }
};

const updateVehicle = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            return res.status(400).json({ success: false, message: 'معرف المركبة غير صالح / Invalid vehicle ID' });
        }

        const allowedFields = [
            'plateNumber', 'plateNumberAr', 'make', 'model', 'year', 'color', 'colorAr', 'vin',
            'vehicleType', 'ownershipType', 'purchaseDate', 'purchasePrice', 'leaseEndDate', 'monthlyLeaseCost',
            'fuelType', 'engineCapacity', 'tankCapacity', 'seatingCapacity', 'currentOdometer',
            'status', 'currentDriverId', 'assignedDepartmentId',
            'registration', 'insurance', 'lastServiceDate', 'nextServiceDue', 'nextServiceOdometer',
            'notes', 'notesAr', 'isActive'
        ];
        const safeData = pickAllowedFields(req.body, allowedFields);

        const vehicle = await Vehicle.findOneAndUpdate(
            { _id: sanitizedId, ...req.firmQuery },
            { $set: { ...safeData, updatedBy: req.userID } },
            { new: true, runValidators: true }
        );

        if (!vehicle) {
            return res.status(404).json({ success: false, message: 'المركبة غير موجودة / Vehicle not found' });
        }

        res.json({ success: true, message: 'تم تحديث المركبة بنجاح / Vehicle updated successfully', data: vehicle });
    } catch (error) {
        logger.error('Error updating vehicle:', error);
        res.status(500).json({ success: false, message: 'خطأ في تحديث المركبة / Error updating vehicle', error: error.message });
    }
};

const deleteVehicle = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            return res.status(400).json({ success: false, message: 'معرف المركبة غير صالح / Invalid vehicle ID' });
        }

        const vehicle = await Vehicle.findOneAndUpdate(
            { _id: sanitizedId, ...req.firmQuery },
            { $set: { status: 'disposed', isActive: false, updatedBy: req.userID } },
            { new: true }
        );

        if (!vehicle) {
            return res.status(404).json({ success: false, message: 'المركبة غير موجودة / Vehicle not found' });
        }

        res.json({ success: true, message: 'تم حذف المركبة بنجاح / Vehicle deleted successfully' });
    } catch (error) {
        logger.error('Error deleting vehicle:', error);
        res.status(500).json({ success: false, message: 'خطأ في حذف المركبة / Error deleting vehicle', error: error.message });
    }
};

// ═══════════════════════════════════════════════════════════════
// FUEL LOGS
// ═══════════════════════════════════════════════════════════════

const getFuelLogs = async (req, res) => {
    try {
        const { vehicleId, driverId, dateFrom, dateTo, page = 1, limit = 50 } = req.query;

        const pageNum = Math.max(1, parseInt(page) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 50));

        const query = { ...req.firmQuery };
        if (vehicleId) query.vehicleId = sanitizeObjectId(vehicleId);
        if (driverId) query.driverId = sanitizeObjectId(driverId);
        if (dateFrom || dateTo) {
            query.date = {};
            if (dateFrom) query.date.$gte = new Date(dateFrom);
            if (dateTo) query.date.$lte = new Date(dateTo);
        }

        const [logs, total] = await Promise.all([
            FuelLog.find(query)
                .populate('vehicleId', 'vehicleId plateNumber make model')
                .populate('driverId', 'personalInfo.fullNameEnglish employeeId')
                .sort({ date: -1 })
                .skip((pageNum - 1) * limitNum)
                .limit(limitNum)
                .lean(),
            FuelLog.countDocuments(query)
        ]);

        res.json({ success: true, data: logs, pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) } });
    } catch (error) {
        logger.error('Error fetching fuel logs:', error);
        res.status(500).json({ success: false, message: 'خطأ في جلب سجلات الوقود / Error fetching fuel logs', error: error.message });
    }
};

const createFuelLog = async (req, res) => {
    try {
        const allowedFields = [
            'vehicleId', 'driverId', 'date', 'odometerReading', 'fuelType',
            'quantity', 'pricePerUnit', 'totalCost', 'fullTank',
            'station', 'stationLocation', 'receiptNumber', 'receiptUrl', 'notes'
        ];
        const safeData = pickAllowedFields(req.body, allowedFields);

        if (!safeData.vehicleId || !safeData.odometerReading || !safeData.quantity || !safeData.pricePerUnit) {
            return res.status(400).json({
                success: false,
                message: 'المركبة وقراءة العداد والكمية والسعر مطلوبة / Vehicle, odometer, quantity and price are required'
            });
        }

        const sanitizedVehicleId = sanitizeObjectId(safeData.vehicleId);
        const vehicle = await Vehicle.findOne({ _id: sanitizedVehicleId, ...req.firmQuery });
        if (!vehicle) {
            return res.status(404).json({ success: false, message: 'المركبة غير موجودة / Vehicle not found' });
        }

        // Get previous odometer
        const lastLog = await FuelLog.findOne({ vehicleId: sanitizedVehicleId }).sort({ date: -1 });
        safeData.previousOdometer = lastLog?.odometerReading || vehicle.currentOdometer || 0;

        // Calculate total cost if not provided
        if (!safeData.totalCost) {
            safeData.totalCost = safeData.quantity * safeData.pricePerUnit;
        }

        const fuelLog = new FuelLog(req.addFirmId({
            ...safeData,
            vehicleId: sanitizedVehicleId,
            fuelType: safeData.fuelType || vehicle.fuelType,
            createdBy: req.userID
        }));

        await fuelLog.save();

        // Update vehicle odometer - using firmQuery for defense in depth
        await Vehicle.findOneAndUpdate(
            { _id: sanitizedVehicleId, ...req.firmQuery },
            { currentOdometer: safeData.odometerReading }
        );

        res.status(201).json({ success: true, message: 'تم تسجيل الوقود بنجاح / Fuel log created', data: fuelLog });
    } catch (error) {
        logger.error('Error creating fuel log:', error);
        res.status(500).json({ success: false, message: 'خطأ في تسجيل الوقود / Error creating fuel log', error: error.message });
    }
};

// ═══════════════════════════════════════════════════════════════
// MAINTENANCE
// ═══════════════════════════════════════════════════════════════

const getMaintenanceRecords = async (req, res) => {
    try {
        const { vehicleId, status, maintenanceType, page = 1, limit = 50 } = req.query;

        const pageNum = Math.max(1, parseInt(page) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 50));

        const query = { ...req.firmQuery };
        if (vehicleId) query.vehicleId = sanitizeObjectId(vehicleId);
        if (status) query.status = status;
        if (maintenanceType) query.maintenanceType = maintenanceType;

        const [records, total] = await Promise.all([
            MaintenanceRecord.find(query)
                .populate('vehicleId', 'vehicleId plateNumber make model')
                .sort({ scheduledDate: -1 })
                .skip((pageNum - 1) * limitNum)
                .limit(limitNum)
                .lean(),
            MaintenanceRecord.countDocuments(query)
        ]);

        res.json({ success: true, data: records, pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) } });
    } catch (error) {
        logger.error('Error fetching maintenance records:', error);
        res.status(500).json({ success: false, message: 'خطأ في جلب سجلات الصيانة / Error fetching maintenance records', error: error.message });
    }
};

const createMaintenanceRecord = async (req, res) => {
    try {
        const allowedFields = [
            'vehicleId', 'maintenanceType', 'maintenanceTypeAr', 'description', 'descriptionAr',
            'status', 'scheduledDate', 'startDate', 'completionDate', 'odometerAtService',
            'laborCost', 'partsCost', 'partsReplaced', 'serviceProvider', 'serviceProviderAr',
            'serviceLocation', 'invoiceNumber', 'invoiceUrl', 'warrantyPeriodDays', 'notes'
        ];
        const safeData = pickAllowedFields(req.body, allowedFields);

        if (!safeData.vehicleId || !safeData.maintenanceType || !safeData.description) {
            return res.status(400).json({
                success: false,
                message: 'المركبة ونوع الصيانة والوصف مطلوبة / Vehicle, type and description are required'
            });
        }

        const sanitizedVehicleId = sanitizeObjectId(safeData.vehicleId);
        const vehicle = await Vehicle.findOne({ _id: sanitizedVehicleId, ...req.firmQuery });
        if (!vehicle) {
            return res.status(404).json({ success: false, message: 'المركبة غير موجودة / Vehicle not found' });
        }

        const record = new MaintenanceRecord(req.addFirmId({
            ...safeData,
            vehicleId: sanitizedVehicleId,
            createdBy: req.userID
        }));

        await record.save();

        // Update vehicle status if needed - using firmQuery for defense in depth
        if (safeData.status === 'in_progress') {
            await Vehicle.findOneAndUpdate(
                { _id: sanitizedVehicleId, ...req.firmQuery },
                { status: 'maintenance' }
            );
        }

        res.status(201).json({ success: true, message: 'تم إنشاء سجل الصيانة بنجاح / Maintenance record created', data: record });
    } catch (error) {
        logger.error('Error creating maintenance record:', error);
        res.status(500).json({ success: false, message: 'خطأ في إنشاء سجل الصيانة / Error creating maintenance record', error: error.message });
    }
};

const updateMaintenanceRecord = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            return res.status(400).json({ success: false, message: 'معرف السجل غير صالح / Invalid record ID' });
        }

        const allowedFields = [
            'maintenanceType', 'maintenanceTypeAr', 'description', 'descriptionAr',
            'status', 'scheduledDate', 'startDate', 'completionDate', 'odometerAtService',
            'laborCost', 'partsCost', 'partsReplaced', 'serviceProvider', 'serviceProviderAr',
            'serviceLocation', 'invoiceNumber', 'invoiceUrl', 'warrantyPeriodDays', 'notes'
        ];
        const safeData = pickAllowedFields(req.body, allowedFields);

        const record = await MaintenanceRecord.findOneAndUpdate(
            { _id: sanitizedId, ...req.firmQuery },
            { $set: { ...safeData, updatedBy: req.userID } },
            { new: true, runValidators: true }
        );

        if (!record) {
            return res.status(404).json({ success: false, message: 'السجل غير موجود / Record not found' });
        }

        // Update vehicle status based on maintenance status - using firmQuery for defense in depth
        if (safeData.status === 'completed') {
            await Vehicle.findOneAndUpdate(
                { _id: record.vehicleId, ...req.firmQuery },
                {
                    status: 'active',
                    lastServiceDate: record.completionDate || new Date(),
                    currentOdometer: record.odometerAtService || undefined
                }
            );
        }

        res.json({ success: true, message: 'تم تحديث السجل بنجاح / Record updated successfully', data: record });
    } catch (error) {
        logger.error('Error updating maintenance record:', error);
        res.status(500).json({ success: false, message: 'خطأ في تحديث السجل / Error updating record', error: error.message });
    }
};

// ═══════════════════════════════════════════════════════════════
// ASSIGNMENTS
// ═══════════════════════════════════════════════════════════════

const assignVehicle = async (req, res) => {
    try {
        const allowedFields = ['vehicleId', 'driverId', 'startDate', 'endDate', 'assignmentType', 'purpose', 'purposeAr', 'startOdometer', 'notes'];
        const safeData = pickAllowedFields(req.body, allowedFields);

        if (!safeData.vehicleId || !safeData.driverId) {
            return res.status(400).json({ success: false, message: 'المركبة والسائق مطلوبان / Vehicle and driver are required' });
        }

        const sanitizedVehicleId = sanitizeObjectId(safeData.vehicleId);
        const sanitizedDriverId = sanitizeObjectId(safeData.driverId);

        const [vehicle, driver] = await Promise.all([
            Vehicle.findOne({ _id: sanitizedVehicleId, ...req.firmQuery }),
            Employee.findOne({ _id: sanitizedDriverId, ...req.firmQuery })
        ]);

        if (!vehicle) return res.status(404).json({ success: false, message: 'المركبة غير موجودة / Vehicle not found' });
        if (!driver) return res.status(404).json({ success: false, message: 'السائق غير موجود / Driver not found' });

        // End any current assignment
        await VehicleAssignment.updateMany(
            { vehicleId: sanitizedVehicleId, status: 'active', ...req.firmQuery },
            { $set: { status: 'ended', endDate: new Date() } }
        );

        const assignment = new VehicleAssignment(req.addFirmId({
            ...safeData,
            vehicleId: sanitizedVehicleId,
            driverId: sanitizedDriverId,
            driverName: driver.personalInfo?.fullNameEnglish,
            driverNameAr: driver.personalInfo?.fullNameArabic,
            startOdometer: safeData.startOdometer || vehicle.currentOdometer,
            approvedBy: req.userID,
            approvalDate: new Date(),
            createdBy: req.userID
        }));

        await assignment.save();

        // Update vehicle with current driver - using firmQuery for defense in depth
        await Vehicle.findOneAndUpdate(
            { _id: sanitizedVehicleId, ...req.firmQuery },
            {
                currentDriverId: sanitizedDriverId,
                currentDriverName: driver.personalInfo?.fullNameEnglish,
                currentDriverNameAr: driver.personalInfo?.fullNameArabic
            }
        );

        res.status(201).json({ success: true, message: 'تم تعيين المركبة بنجاح / Vehicle assigned successfully', data: assignment });
    } catch (error) {
        logger.error('Error assigning vehicle:', error);
        res.status(500).json({ success: false, message: 'خطأ في تعيين المركبة / Error assigning vehicle', error: error.message });
    }
};

const endAssignment = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            return res.status(400).json({ success: false, message: 'معرف التعيين غير صالح / Invalid assignment ID' });
        }

        // Mass assignment protection
        const allowedFields = ['endOdometer', 'notes'];
        const safeData = pickAllowedFields(req.body, allowedFields);

        // Sanitize notes
        const sanitizedNotes = typeof safeData.notes === 'string'
            ? safeData.notes.substring(0, 500).replace(/<[^>]*>/g, '')
            : undefined;

        const assignment = await VehicleAssignment.findOneAndUpdate(
            { _id: sanitizedId, status: 'active', ...req.firmQuery },
            {
                $set: {
                    status: 'ended',
                    endDate: new Date(),
                    endOdometer: safeData.endOdometer || undefined,
                    notes: sanitizedNotes
                }
            },
            { new: true }
        );

        if (!assignment) {
            return res.status(404).json({ success: false, message: 'التعيين غير موجود أو منتهي / Assignment not found or already ended' });
        }

        // Clear vehicle current driver - using firmQuery for defense in depth
        await Vehicle.findOneAndUpdate(
            { _id: assignment.vehicleId, ...req.firmQuery },
            {
                currentDriverId: null,
                currentDriverName: null,
                currentDriverNameAr: null,
                currentOdometer: safeData.endOdometer || undefined
            }
        );

        res.json({ success: true, message: 'تم إنهاء التعيين بنجاح / Assignment ended successfully', data: assignment });
    } catch (error) {
        logger.error('Error ending assignment:', error);
        res.status(500).json({ success: false, message: 'خطأ في إنهاء التعيين / Error ending assignment', error: error.message });
    }
};

// ═══════════════════════════════════════════════════════════════
// STATISTICS
// ═══════════════════════════════════════════════════════════════

const getFleetStats = async (req, res) => {
    try {
        const match = { ...req.firmQuery };
        if (match.firmId && typeof match.firmId === 'string') match.firmId = new mongoose.Types.ObjectId(match.firmId);
        if (match.lawyerId && typeof match.lawyerId === 'string') match.lawyerId = new mongoose.Types.ObjectId(match.lawyerId);

        const [vehicleStats, fuelStats, maintenanceStats] = await Promise.all([
            Vehicle.aggregate([
                { $match: { ...match, isActive: true } },
                {
                    $group: {
                        _id: null,
                        total: { $sum: 1 },
                        active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
                        maintenance: { $sum: { $cond: [{ $eq: ['$status', 'maintenance'] }, 1, 0] } },
                        assigned: { $sum: { $cond: [{ $ne: ['$currentDriverId', null] }, 1, 0] } }
                    }
                }
            ]),
            FuelLog.aggregate([
                { $match: match },
                {
                    $group: {
                        _id: null,
                        totalLogs: { $sum: 1 },
                        totalQuantity: { $sum: '$quantity' },
                        totalCost: { $sum: '$totalCost' },
                        avgEfficiency: { $avg: '$fuelEfficiency' }
                    }
                }
            ]),
            MaintenanceRecord.aggregate([
                { $match: match },
                {
                    $group: {
                        _id: null,
                        totalRecords: { $sum: 1 },
                        scheduled: { $sum: { $cond: [{ $eq: ['$status', 'scheduled'] }, 1, 0] } },
                        inProgress: { $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] } },
                        totalCost: { $sum: '$totalCost' }
                    }
                }
            ])
        ]);

        res.json({
            success: true,
            data: {
                vehicles: vehicleStats[0] || { total: 0, active: 0, maintenance: 0, assigned: 0 },
                fuel: {
                    totalLogs: fuelStats[0]?.totalLogs || 0,
                    totalQuantity: parseFloat((fuelStats[0]?.totalQuantity || 0).toFixed(2)),
                    totalCost: parseFloat((fuelStats[0]?.totalCost || 0).toFixed(2)),
                    avgEfficiency: parseFloat((fuelStats[0]?.avgEfficiency || 0).toFixed(2))
                },
                maintenance: maintenanceStats[0] || { totalRecords: 0, scheduled: 0, inProgress: 0, totalCost: 0 }
            }
        });
    } catch (error) {
        logger.error('Error fetching fleet stats:', error);
        res.status(500).json({ success: false, message: 'خطأ في جلب إحصائيات الأسطول / Error fetching fleet stats', error: error.message });
    }
};

module.exports = {
    getVehicles, getVehicleById, createVehicle, updateVehicle, deleteVehicle,
    getFuelLogs, createFuelLog,
    getMaintenanceRecords, createMaintenanceRecord, updateMaintenanceRecord,
    assignVehicle, endAssignment,
    getFleetStats
};
