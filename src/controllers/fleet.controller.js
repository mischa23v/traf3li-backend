/**
 * Fleet Management Controller
 *
 * Enterprise vehicle and fleet management
 * Inspired by: SAP Fleet, Oracle Fleet, Fleetio, Samsara, Geotab
 *
 * Features:
 * - Vehicle CRUD with detailed specifications
 * - Fuel logs with efficiency analytics
 * - Maintenance scheduling with predictive alerts
 * - Vehicle inspections (DVIR compliant)
 * - Trip logging with cost tracking
 * - Incident/accident reporting
 * - Driver profiles with safety scores
 * - GPS location history
 * - Document expiry alerts
 */

const mongoose = require('mongoose');
const {
    Vehicle,
    FuelLog,
    MaintenanceRecord,
    VehicleAssignment,
    VehicleInspection,
    TripLog,
    VehicleIncident,
    GpsLocationHistory,
    DriverProfile,
    INSPECTION_CHECKLIST_ITEMS
} = require('../models/fleet.model');
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
        const { status, vehicleType, currentDriverId, assignedDepartmentId, search, page = 1, limit = 20 } = req.query;

        const pageNum = Math.max(1, parseInt(page) || 1);
        const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 20));

        const query = { ...req.firmQuery };

        if (status) query.status = status;
        if (vehicleType) query.vehicleType = vehicleType;
        if (currentDriverId) query.currentDriverId = sanitizeObjectId(currentDriverId);
        if (assignedDepartmentId) query.assignedDepartmentId = sanitizeObjectId(assignedDepartmentId);

        if (search) {
            const escapedSearch = escapeRegex(search);
            query.$or = [
                { plateNumber: { $regex: escapedSearch, $options: 'i' } },
                { make: { $regex: escapedSearch, $options: 'i' } },
                { model: { $regex: escapedSearch, $options: 'i' } },
                { vehicleId: { $regex: escapedSearch, $options: 'i' } },
                { vin: { $regex: escapedSearch, $options: 'i' } }
            ];
        }

        const [vehicles, total] = await Promise.all([
            Vehicle.find(query)
                .populate('currentDriverId', 'personalInfo.fullNameEnglish personalInfo.fullNameArabic employeeId')
                .populate('assignedDepartmentId', 'name nameAr')
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
            'engineNumber', 'chassisNumber', 'vehicleType', 'vehicleClass', 'grossWeight', 'netWeight', 'loadCapacity',
            'ownershipType', 'purchaseDate', 'purchasePrice', 'depreciationMethod', 'depreciationRate',
            'leaseEndDate', 'monthlyLeaseCost', 'financingDetails',
            'fuelType', 'engineCapacity', 'horsepower', 'torque', 'transmission', 'driveType',
            'tankCapacity', 'batteryCapacity', 'seatingCapacity', 'doors', 'currentOdometer', 'odometerUnit',
            'status', 'currentDriverId', 'assignedDepartmentId', 'costCenter',
            'registration', 'insurance',
            'lastServiceDate', 'nextServiceDue', 'nextServiceOdometer',
            'serviceIntervalDays', 'serviceIntervalKm', 'maintenanceAlertDays',
            'gpsEnabled', 'gpsDeviceId', 'geofences',
            'notes', 'notesAr', 'tags'
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
            'engineNumber', 'chassisNumber', 'vehicleType', 'vehicleClass', 'grossWeight', 'netWeight', 'loadCapacity',
            'ownershipType', 'purchaseDate', 'purchasePrice', 'currentValue', 'depreciationMethod', 'depreciationRate',
            'leaseEndDate', 'monthlyLeaseCost', 'financingDetails',
            'fuelType', 'engineCapacity', 'horsepower', 'torque', 'transmission', 'driveType',
            'tankCapacity', 'batteryCapacity', 'seatingCapacity', 'doors', 'currentOdometer', 'odometerUnit',
            'status', 'statusReason', 'currentDriverId', 'assignedDepartmentId', 'costCenter',
            'registration', 'insurance',
            'lastServiceDate', 'nextServiceDue', 'nextServiceOdometer',
            'serviceIntervalDays', 'serviceIntervalKm', 'maintenanceAlertDays',
            'lastInspectionDate', 'lastInspectionStatus', 'nextInspectionDue', 'inspectionFrequency',
            'gpsEnabled', 'gpsDeviceId', 'lastKnownLocation', 'geofences',
            'activeRecalls', 'documents', 'images', 'telematics', 'metrics', 'disposalInfo',
            'notes', 'notesAr', 'tags', 'isActive'
        ];
        const safeData = pickAllowedFields(req.body, allowedFields);

        // Use save() to trigger pre-save hooks for status tracking
        const vehicle = await Vehicle.findOne({ _id: sanitizedId, ...req.firmQuery });
        if (!vehicle) {
            return res.status(404).json({ success: false, message: 'المركبة غير موجودة / Vehicle not found' });
        }

        Object.assign(vehicle, safeData);
        vehicle.updatedBy = req.userID;
        await vehicle.save();

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

        const vehicle = await Vehicle.findOne({ _id: sanitizedId, ...req.firmQuery });
        if (!vehicle) {
            return res.status(404).json({ success: false, message: 'المركبة غير موجودة / Vehicle not found' });
        }

        vehicle.status = 'disposed';
        vehicle.isActive = false;
        vehicle.statusReason = 'Deleted by user';
        vehicle.updatedBy = req.userID;
        await vehicle.save();

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
        const { vehicleId, driverId, dateFrom, dateTo, fuelType, page = 1, limit = 50 } = req.query;

        const pageNum = Math.max(1, parseInt(page) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 50));

        const query = { ...req.firmQuery };
        if (vehicleId) query.vehicleId = sanitizeObjectId(vehicleId);
        if (driverId) query.driverId = sanitizeObjectId(driverId);
        if (fuelType) query.fuelType = fuelType;
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
            'vehicleId', 'driverId', 'date', 'time', 'odometerReading', 'fuelType',
            'quantity', 'pricePerUnit', 'totalCost', 'fullTank', 'missedFillups',
            'station', 'stationAr', 'stationBrand', 'stationLocation', 'stationLatitude', 'stationLongitude',
            'paymentMethod', 'fuelCardNumber', 'receiptNumber', 'receiptUrl', 'notes'
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
        const lastLog = await FuelLog.findOne({ vehicleId: sanitizedVehicleId, ...req.firmQuery }).sort({ date: -1 });
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

        // Update vehicle odometer
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

const verifyFuelLog = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            return res.status(400).json({ success: false, message: 'معرف السجل غير صالح / Invalid log ID' });
        }

        const fuelLog = await FuelLog.findOneAndUpdate(
            { _id: sanitizedId, ...req.firmQuery },
            {
                $set: {
                    isVerified: true,
                    verifiedBy: req.userID,
                    verifiedAt: new Date()
                }
            },
            { new: true }
        );

        if (!fuelLog) {
            return res.status(404).json({ success: false, message: 'السجل غير موجود / Log not found' });
        }

        res.json({ success: true, message: 'تم التحقق من السجل / Log verified', data: fuelLog });
    } catch (error) {
        logger.error('Error verifying fuel log:', error);
        res.status(500).json({ success: false, message: 'خطأ في التحقق من السجل / Error verifying log', error: error.message });
    }
};

// ═══════════════════════════════════════════════════════════════
// MAINTENANCE
// ═══════════════════════════════════════════════════════════════

const getMaintenanceRecords = async (req, res) => {
    try {
        const { vehicleId, status, maintenanceType, maintenanceCategory, priority, page = 1, limit = 50 } = req.query;

        const pageNum = Math.max(1, parseInt(page) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 50));

        const query = { ...req.firmQuery };
        if (vehicleId) query.vehicleId = sanitizeObjectId(vehicleId);
        if (status) query.status = status;
        if (maintenanceType) query.maintenanceType = maintenanceType;
        if (maintenanceCategory) query.maintenanceCategory = maintenanceCategory;
        if (priority) query.priority = priority;

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
            'vehicleId', 'maintenanceType', 'maintenanceTypeAr', 'maintenanceCategory', 'priority',
            'description', 'descriptionAr', 'workPerformed', 'workPerformedAr',
            'status', 'requestedDate', 'scheduledDate', 'startDate', 'completionDate', 'deferredReason',
            'odometerAtService', 'laborCost', 'laborHours', 'laborRate', 'taxAmount', 'discount',
            'partsReplaced', 'serviceProvider', 'serviceProviderAr', 'serviceLocation', 'serviceLocationAr',
            'technicianName', 'invoiceNumber', 'invoiceUrl', 'workOrderNumber',
            'isWarrantyClaim', 'warrantyClaimNumber', 'warrantyPeriodDays', 'warrantyMileage',
            'followUpRequired', 'followUpDate', 'followUpNotes',
            'requiresApproval', 'attachments', 'notes'
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

        // Update vehicle status if maintenance started
        if (safeData.status === 'in_progress') {
            await Vehicle.findOneAndUpdate(
                { _id: sanitizedVehicleId, ...req.firmQuery },
                { status: 'maintenance', statusReason: 'In maintenance' }
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
            'maintenanceType', 'maintenanceTypeAr', 'maintenanceCategory', 'priority',
            'description', 'descriptionAr', 'workPerformed', 'workPerformedAr',
            'status', 'scheduledDate', 'startDate', 'completionDate', 'deferredReason',
            'odometerAtService', 'laborCost', 'laborHours', 'laborRate', 'taxAmount', 'discount',
            'partsReplaced', 'serviceProvider', 'serviceProviderAr', 'serviceLocation', 'serviceLocationAr',
            'technicianName', 'invoiceNumber', 'invoiceUrl', 'workOrderNumber',
            'isWarrantyClaim', 'warrantyClaimNumber', 'warrantyPeriodDays', 'warrantyMileage',
            'qualityCheck', 'followUpRequired', 'followUpDate', 'followUpNotes',
            'approvalStatus', 'approvalNotes', 'attachments', 'notes'
        ];
        const safeData = pickAllowedFields(req.body, allowedFields);

        // Use save() to trigger pre-save hooks
        const record = await MaintenanceRecord.findOne({ _id: sanitizedId, ...req.firmQuery });
        if (!record) {
            return res.status(404).json({ success: false, message: 'السجل غير موجود / Record not found' });
        }

        // Handle approval
        if (safeData.approvalStatus === 'approved' && record.requiresApproval) {
            safeData.approvedBy = req.userID;
            safeData.approvedAt = new Date();
        }

        Object.assign(record, safeData);
        record.updatedBy = req.userID;
        await record.save();

        // Update vehicle based on maintenance status
        if (safeData.status === 'completed') {
            await Vehicle.findOneAndUpdate(
                { _id: record.vehicleId, ...req.firmQuery },
                {
                    status: 'active',
                    statusReason: null,
                    lastServiceDate: record.completionDate || new Date(),
                    currentOdometer: record.odometerAtService || undefined
                }
            );
        } else if (safeData.status === 'in_progress') {
            await Vehicle.findOneAndUpdate(
                { _id: record.vehicleId, ...req.firmQuery },
                { status: 'maintenance', statusReason: 'In maintenance' }
            );
        }

        res.json({ success: true, message: 'تم تحديث السجل بنجاح / Record updated successfully', data: record });
    } catch (error) {
        logger.error('Error updating maintenance record:', error);
        res.status(500).json({ success: false, message: 'خطأ في تحديث السجل / Error updating record', error: error.message });
    }
};

// ═══════════════════════════════════════════════════════════════
// VEHICLE INSPECTIONS
// ═══════════════════════════════════════════════════════════════

const getInspections = async (req, res) => {
    try {
        const { vehicleId, inspectorId, inspectionType, overallStatus, dateFrom, dateTo, page = 1, limit = 50 } = req.query;

        const pageNum = Math.max(1, parseInt(page) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 50));

        const query = { ...req.firmQuery };
        if (vehicleId) query.vehicleId = sanitizeObjectId(vehicleId);
        if (inspectorId) query.inspectorId = sanitizeObjectId(inspectorId);
        if (inspectionType) query.inspectionType = inspectionType;
        if (overallStatus) query.overallStatus = overallStatus;
        if (dateFrom || dateTo) {
            query.inspectionDate = {};
            if (dateFrom) query.inspectionDate.$gte = new Date(dateFrom);
            if (dateTo) query.inspectionDate.$lte = new Date(dateTo);
        }

        const [inspections, total] = await Promise.all([
            VehicleInspection.find(query)
                .populate('vehicleId', 'vehicleId plateNumber make model')
                .populate('inspectorId', 'personalInfo.fullNameEnglish employeeId')
                .sort({ inspectionDate: -1 })
                .skip((pageNum - 1) * limitNum)
                .limit(limitNum)
                .lean(),
            VehicleInspection.countDocuments(query)
        ]);

        res.json({ success: true, data: inspections, pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) } });
    } catch (error) {
        logger.error('Error fetching inspections:', error);
        res.status(500).json({ success: false, message: 'خطأ في جلب الفحوصات / Error fetching inspections', error: error.message });
    }
};

const getInspectionChecklist = async (req, res) => {
    try {
        res.json({ success: true, data: INSPECTION_CHECKLIST_ITEMS });
    } catch (error) {
        logger.error('Error fetching checklist:', error);
        res.status(500).json({ success: false, message: 'خطأ في جلب قائمة الفحص / Error fetching checklist', error: error.message });
    }
};

const createInspection = async (req, res) => {
    try {
        const allowedFields = [
            'vehicleId', 'inspectorId', 'inspectionType', 'inspectionDate', 'odometerReading', 'engineHours',
            'location', 'locationAr', 'latitude', 'longitude',
            'overallStatus', 'checklistItems', 'defectsFound',
            'driverCertification', 'photos',
            'followUpRequired', 'followUpNotes', 'maintenanceScheduled',
            'startTime', 'endTime', 'notes', 'notesAr'
        ];
        const safeData = pickAllowedFields(req.body, allowedFields);

        if (!safeData.vehicleId || !safeData.inspectionType) {
            return res.status(400).json({
                success: false,
                message: 'المركبة ونوع الفحص مطلوبان / Vehicle and inspection type are required'
            });
        }

        const sanitizedVehicleId = sanitizeObjectId(safeData.vehicleId);
        const vehicle = await Vehicle.findOne({ _id: sanitizedVehicleId, ...req.firmQuery });
        if (!vehicle) {
            return res.status(404).json({ success: false, message: 'المركبة غير موجودة / Vehicle not found' });
        }

        // Set inspector
        const inspectorId = safeData.inspectorId ? sanitizeObjectId(safeData.inspectorId) : null;
        let inspectorName = null;
        if (inspectorId) {
            const inspector = await Employee.findOne({ _id: inspectorId, ...req.firmQuery });
            if (inspector) {
                inspectorName = inspector.personalInfo?.fullNameEnglish;
            }
        }

        const inspection = new VehicleInspection(req.addFirmId({
            ...safeData,
            vehicleId: sanitizedVehicleId,
            inspectorId: inspectorId || req.userID,
            inspectorName,
            overallStatus: safeData.overallStatus || 'passed',
            createdBy: req.userID
        }));

        await inspection.save();

        // Update vehicle inspection info
        await Vehicle.findOneAndUpdate(
            { _id: sanitizedVehicleId, ...req.firmQuery },
            {
                lastInspectionDate: inspection.inspectionDate,
                lastInspectionStatus: inspection.overallStatus,
                currentOdometer: safeData.odometerReading || undefined
            }
        );

        res.status(201).json({ success: true, message: 'تم إنشاء الفحص بنجاح / Inspection created', data: inspection });
    } catch (error) {
        logger.error('Error creating inspection:', error);
        res.status(500).json({ success: false, message: 'خطأ في إنشاء الفحص / Error creating inspection', error: error.message });
    }
};

// ═══════════════════════════════════════════════════════════════
// TRIP LOGS
// ═══════════════════════════════════════════════════════════════

const getTrips = async (req, res) => {
    try {
        const { vehicleId, driverId, tripType, status, dateFrom, dateTo, page = 1, limit = 50 } = req.query;

        const pageNum = Math.max(1, parseInt(page) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 50));

        const query = { ...req.firmQuery };
        if (vehicleId) query.vehicleId = sanitizeObjectId(vehicleId);
        if (driverId) query.driverId = sanitizeObjectId(driverId);
        if (tripType) query.tripType = tripType;
        if (status) query.status = status;
        if (dateFrom || dateTo) {
            query.startTime = {};
            if (dateFrom) query.startTime.$gte = new Date(dateFrom);
            if (dateTo) query.startTime.$lte = new Date(dateTo);
        }

        const [trips, total] = await Promise.all([
            TripLog.find(query)
                .populate('vehicleId', 'vehicleId plateNumber make model')
                .populate('driverId', 'personalInfo.fullNameEnglish employeeId')
                .sort({ startTime: -1 })
                .skip((pageNum - 1) * limitNum)
                .limit(limitNum)
                .lean(),
            TripLog.countDocuments(query)
        ]);

        res.json({ success: true, data: trips, pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) } });
    } catch (error) {
        logger.error('Error fetching trips:', error);
        res.status(500).json({ success: false, message: 'خطأ في جلب الرحلات / Error fetching trips', error: error.message });
    }
};

const createTrip = async (req, res) => {
    try {
        const allowedFields = [
            'vehicleId', 'driverId', 'tripType', 'purpose', 'purposeAr',
            'projectId', 'caseId', 'clientId',
            'startTime', 'endTime', 'status',
            'startLocation', 'endLocation', 'stops',
            'startOdometer', 'endOdometer', 'estimatedDistance',
            'drivingMetrics', 'fuelUsed', 'fuelCost', 'tollCost', 'parkingCost', 'otherCosts',
            'isReimbursable', 'reimbursementRate', 'receipts',
            'notes', 'notesAr'
        ];
        const safeData = pickAllowedFields(req.body, allowedFields);

        if (!safeData.vehicleId || !safeData.driverId || !safeData.tripType || !safeData.startTime) {
            return res.status(400).json({
                success: false,
                message: 'المركبة والسائق ونوع الرحلة ووقت البدء مطلوبة / Vehicle, driver, trip type and start time are required'
            });
        }

        const sanitizedVehicleId = sanitizeObjectId(safeData.vehicleId);
        const sanitizedDriverId = sanitizeObjectId(safeData.driverId);

        const [vehicle, driver] = await Promise.all([
            Vehicle.findOne({ _id: sanitizedVehicleId, ...req.firmQuery }),
            Employee.findOne({ _id: sanitizedDriverId, ...req.firmQuery })
        ]);

        if (!vehicle) {
            return res.status(404).json({ success: false, message: 'المركبة غير موجودة / Vehicle not found' });
        }
        if (!driver) {
            return res.status(404).json({ success: false, message: 'السائق غير موجود / Driver not found' });
        }

        const trip = new TripLog(req.addFirmId({
            ...safeData,
            vehicleId: sanitizedVehicleId,
            driverId: sanitizedDriverId,
            startOdometer: safeData.startOdometer || vehicle.currentOdometer,
            createdBy: req.userID
        }));

        await trip.save();

        res.status(201).json({ success: true, message: 'تم إنشاء الرحلة بنجاح / Trip created', data: trip });
    } catch (error) {
        logger.error('Error creating trip:', error);
        res.status(500).json({ success: false, message: 'خطأ في إنشاء الرحلة / Error creating trip', error: error.message });
    }
};

const endTrip = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            return res.status(400).json({ success: false, message: 'معرف الرحلة غير صالح / Invalid trip ID' });
        }

        const allowedFields = [
            'endTime', 'endLocation', 'endOdometer',
            'drivingMetrics', 'fuelUsed', 'fuelCost', 'tollCost', 'parkingCost', 'otherCosts',
            'receipts', 'notes'
        ];
        const safeData = pickAllowedFields(req.body, allowedFields);

        const trip = await TripLog.findOne({ _id: sanitizedId, ...req.firmQuery });
        if (!trip) {
            return res.status(404).json({ success: false, message: 'الرحلة غير موجودة / Trip not found' });
        }

        Object.assign(trip, safeData);
        trip.status = 'completed';
        trip.endTime = safeData.endTime || new Date();
        await trip.save();

        // Update vehicle odometer
        if (safeData.endOdometer) {
            await Vehicle.findOneAndUpdate(
                { _id: trip.vehicleId, ...req.firmQuery },
                { currentOdometer: safeData.endOdometer }
            );
        }

        res.json({ success: true, message: 'تم إنهاء الرحلة بنجاح / Trip ended', data: trip });
    } catch (error) {
        logger.error('Error ending trip:', error);
        res.status(500).json({ success: false, message: 'خطأ في إنهاء الرحلة / Error ending trip', error: error.message });
    }
};

// ═══════════════════════════════════════════════════════════════
// INCIDENTS
// ═══════════════════════════════════════════════════════════════

const getIncidents = async (req, res) => {
    try {
        const { vehicleId, driverId, incidentType, severity, status, dateFrom, dateTo, page = 1, limit = 50 } = req.query;

        const pageNum = Math.max(1, parseInt(page) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 50));

        const query = { ...req.firmQuery };
        if (vehicleId) query.vehicleId = sanitizeObjectId(vehicleId);
        if (driverId) query.driverId = sanitizeObjectId(driverId);
        if (incidentType) query.incidentType = incidentType;
        if (severity) query.severity = severity;
        if (status) query.status = status;
        if (dateFrom || dateTo) {
            query.incidentDate = {};
            if (dateFrom) query.incidentDate.$gte = new Date(dateFrom);
            if (dateTo) query.incidentDate.$lte = new Date(dateTo);
        }

        const [incidents, total] = await Promise.all([
            VehicleIncident.find(query)
                .populate('vehicleId', 'vehicleId plateNumber make model')
                .populate('driverId', 'personalInfo.fullNameEnglish employeeId')
                .sort({ incidentDate: -1 })
                .skip((pageNum - 1) * limitNum)
                .limit(limitNum)
                .lean(),
            VehicleIncident.countDocuments(query)
        ]);

        res.json({ success: true, data: incidents, pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) } });
    } catch (error) {
        logger.error('Error fetching incidents:', error);
        res.status(500).json({ success: false, message: 'خطأ في جلب الحوادث / Error fetching incidents', error: error.message });
    }
};

const getIncidentById = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            return res.status(400).json({ success: false, message: 'معرف الحادث غير صالح / Invalid incident ID' });
        }

        const incident = await VehicleIncident.findOne({ _id: sanitizedId, ...req.firmQuery })
            .populate('vehicleId', 'vehicleId plateNumber make model insurance')
            .populate('driverId', 'personalInfo employeeId');

        if (!incident) {
            return res.status(404).json({ success: false, message: 'الحادث غير موجود / Incident not found' });
        }

        res.json({ success: true, data: incident });
    } catch (error) {
        logger.error('Error fetching incident:', error);
        res.status(500).json({ success: false, message: 'خطأ في جلب الحادث / Error fetching incident', error: error.message });
    }
};

const createIncident = async (req, res) => {
    try {
        const allowedFields = [
            'vehicleId', 'driverId', 'incidentType', 'severity',
            'incidentDate', 'incidentTime', 'location', 'locationAr',
            'latitude', 'longitude', 'address', 'city', 'country', 'odometerReading',
            'description', 'descriptionAr', 'driverStatement',
            'accidentDetails', 'violationDetails', 'injuries',
            'vehicleDamages', 'propertyDamages', 'insuranceClaim',
            'photos', 'documents', 'notes', 'notesAr'
        ];
        const safeData = pickAllowedFields(req.body, allowedFields);

        if (!safeData.vehicleId || !safeData.incidentType || !safeData.severity || !safeData.incidentDate || !safeData.description) {
            return res.status(400).json({
                success: false,
                message: 'المركبة ونوع الحادث والخطورة والتاريخ والوصف مطلوبة / Vehicle, type, severity, date and description are required'
            });
        }

        const sanitizedVehicleId = sanitizeObjectId(safeData.vehicleId);
        const vehicle = await Vehicle.findOne({ _id: sanitizedVehicleId, ...req.firmQuery });
        if (!vehicle) {
            return res.status(404).json({ success: false, message: 'المركبة غير موجودة / Vehicle not found' });
        }

        // Get driver name if provided
        let driverName = null;
        if (safeData.driverId) {
            const driver = await Employee.findOne({ _id: sanitizeObjectId(safeData.driverId), ...req.firmQuery });
            if (driver) {
                driverName = driver.personalInfo?.fullNameEnglish;
            }
        }

        const incident = new VehicleIncident(req.addFirmId({
            ...safeData,
            vehicleId: sanitizedVehicleId,
            driverId: safeData.driverId ? sanitizeObjectId(safeData.driverId) : vehicle.currentDriverId,
            driverName: driverName || vehicle.currentDriverName,
            createdBy: req.userID
        }));

        await incident.save();

        // Update vehicle metrics
        await Vehicle.findOneAndUpdate(
            { _id: sanitizedVehicleId, ...req.firmQuery },
            {
                $inc: { 'metrics.incidentCount': 1 }
            }
        );

        res.status(201).json({ success: true, message: 'تم تسجيل الحادث بنجاح / Incident reported', data: incident });
    } catch (error) {
        logger.error('Error creating incident:', error);
        res.status(500).json({ success: false, message: 'خطأ في تسجيل الحادث / Error reporting incident', error: error.message });
    }
};

const updateIncident = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            return res.status(400).json({ success: false, message: 'معرف الحادث غير صالح / Invalid incident ID' });
        }

        const allowedFields = [
            'severity', 'description', 'descriptionAr', 'driverStatement',
            'accidentDetails', 'violationDetails', 'injuries',
            'vehicleDamages', 'propertyDamages', 'insuranceClaim', 'investigation',
            'photos', 'documents', 'status', 'resolution', 'resolutionDate',
            'costBreakdown', 'notes', 'notesAr'
        ];
        const safeData = pickAllowedFields(req.body, allowedFields);

        const incident = await VehicleIncident.findOne({ _id: sanitizedId, ...req.firmQuery });
        if (!incident) {
            return res.status(404).json({ success: false, message: 'الحادث غير موجود / Incident not found' });
        }

        // Handle closure
        if (safeData.status === 'closed' && incident.status !== 'closed') {
            safeData.closedBy = req.userID;
            safeData.resolutionDate = safeData.resolutionDate || new Date();
        }

        Object.assign(incident, safeData);
        incident.updatedBy = req.userID;
        await incident.save();

        res.json({ success: true, message: 'تم تحديث الحادث بنجاح / Incident updated', data: incident });
    } catch (error) {
        logger.error('Error updating incident:', error);
        res.status(500).json({ success: false, message: 'خطأ في تحديث الحادث / Error updating incident', error: error.message });
    }
};

// ═══════════════════════════════════════════════════════════════
// DRIVER PROFILES
// ═══════════════════════════════════════════════════════════════

const getDriverProfiles = async (req, res) => {
    try {
        const { status, search, page = 1, limit = 20 } = req.query;

        const pageNum = Math.max(1, parseInt(page) || 1);
        const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 20));

        const query = { ...req.firmQuery };
        if (status) query.status = status;

        if (search) {
            const escapedSearch = escapeRegex(search);
            query.$or = [
                { employeeName: { $regex: escapedSearch, $options: 'i' } },
                { employeeNameAr: { $regex: escapedSearch, $options: 'i' } },
                { 'license.number': { $regex: escapedSearch, $options: 'i' } }
            ];
        }

        const [profiles, total] = await Promise.all([
            DriverProfile.find(query)
                .populate('employeeId', 'personalInfo employeeId')
                .sort({ 'performanceMetrics.overallScore': -1 })
                .skip((pageNum - 1) * limitNum)
                .limit(limitNum)
                .lean(),
            DriverProfile.countDocuments(query)
        ]);

        res.json({ success: true, data: profiles, pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) } });
    } catch (error) {
        logger.error('Error fetching driver profiles:', error);
        res.status(500).json({ success: false, message: 'خطأ في جلب ملفات السائقين / Error fetching driver profiles', error: error.message });
    }
};

const getDriverProfileById = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            return res.status(400).json({ success: false, message: 'معرف الملف غير صالح / Invalid profile ID' });
        }

        const profile = await DriverProfile.findOne({ _id: sanitizedId, ...req.firmQuery })
            .populate('employeeId', 'personalInfo employeeId department');

        if (!profile) {
            return res.status(404).json({ success: false, message: 'ملف السائق غير موجود / Driver profile not found' });
        }

        res.json({ success: true, data: profile });
    } catch (error) {
        logger.error('Error fetching driver profile:', error);
        res.status(500).json({ success: false, message: 'خطأ في جلب ملف السائق / Error fetching driver profile', error: error.message });
    }
};

const createDriverProfile = async (req, res) => {
    try {
        const allowedFields = [
            'employeeId', 'license', 'additionalLicenses', 'medicalCertificate',
            'drivingHistory', 'training', 'certifications', 'availability',
            'documents', 'notes', 'notesAr'
        ];
        const safeData = pickAllowedFields(req.body, allowedFields);

        if (!safeData.employeeId || !safeData.license?.number) {
            return res.status(400).json({
                success: false,
                message: 'الموظف ورقم الرخصة مطلوبان / Employee and license number are required'
            });
        }

        const sanitizedEmployeeId = sanitizeObjectId(safeData.employeeId);
        const employee = await Employee.findOne({ _id: sanitizedEmployeeId, ...req.firmQuery });
        if (!employee) {
            return res.status(404).json({ success: false, message: 'الموظف غير موجود / Employee not found' });
        }

        // Check if profile already exists
        const existingProfile = await DriverProfile.findOne({ employeeId: sanitizedEmployeeId, ...req.firmQuery });
        if (existingProfile) {
            return res.status(400).json({ success: false, message: 'ملف السائق موجود مسبقاً / Driver profile already exists' });
        }

        const profile = new DriverProfile(req.addFirmId({
            ...safeData,
            employeeId: sanitizedEmployeeId,
            employeeName: employee.personalInfo?.fullNameEnglish,
            employeeNameAr: employee.personalInfo?.fullNameArabic,
            createdBy: req.userID
        }));

        await profile.save();

        res.status(201).json({ success: true, message: 'تم إنشاء ملف السائق بنجاح / Driver profile created', data: profile });
    } catch (error) {
        logger.error('Error creating driver profile:', error);
        res.status(500).json({ success: false, message: 'خطأ في إنشاء ملف السائق / Error creating driver profile', error: error.message });
    }
};

const updateDriverProfile = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            return res.status(400).json({ success: false, message: 'معرف الملف غير صالح / Invalid profile ID' });
        }

        const allowedFields = [
            'license', 'additionalLicenses', 'medicalCertificate',
            'drivingHistory', 'safetyRecord', 'training', 'certifications',
            'performanceMetrics', 'availability', 'documents',
            'status', 'statusReason', 'notes', 'notesAr'
        ];
        const safeData = pickAllowedFields(req.body, allowedFields);

        const profile = await DriverProfile.findOneAndUpdate(
            { _id: sanitizedId, ...req.firmQuery },
            { $set: { ...safeData, updatedBy: req.userID } },
            { new: true, runValidators: true }
        );

        if (!profile) {
            return res.status(404).json({ success: false, message: 'ملف السائق غير موجود / Driver profile not found' });
        }

        res.json({ success: true, message: 'تم تحديث ملف السائق بنجاح / Driver profile updated', data: profile });
    } catch (error) {
        logger.error('Error updating driver profile:', error);
        res.status(500).json({ success: false, message: 'خطأ في تحديث ملف السائق / Error updating driver profile', error: error.message });
    }
};

// ═══════════════════════════════════════════════════════════════
// ASSIGNMENTS
// ═══════════════════════════════════════════════════════════════

const assignVehicle = async (req, res) => {
    try {
        const allowedFields = [
            'vehicleId', 'driverId', 'startDate', 'expectedEndDate', 'assignmentType',
            'purpose', 'purposeAr', 'projectId', 'caseId', 'startOdometer',
            'driverLicenseNumber', 'driverLicenseExpiry',
            'dailyKmLimit', 'personalUseAllowed', 'weekendUseAllowed',
            'fuelCardProvided', 'fuelCardNumber', 'initialCondition', 'notes'
        ];
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

        // Verify driver license if provided
        let driverLicenseVerified = false;
        if (safeData.driverLicenseNumber) {
            const driverProfile = await DriverProfile.findOne({ employeeId: sanitizedDriverId, ...req.firmQuery });
            if (driverProfile && driverProfile.license?.number === safeData.driverLicenseNumber) {
                driverLicenseVerified = true;
            }
        }

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
            driverLicenseVerified,
            startOdometer: safeData.startOdometer || vehicle.currentOdometer,
            approvedBy: req.userID,
            approvalDate: new Date(),
            createdBy: req.userID
        }));

        await assignment.save();

        // Update vehicle with current driver
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

        const allowedFields = ['endOdometer', 'returnCondition', 'notes'];
        const safeData = pickAllowedFields(req.body, allowedFields);

        const assignment = await VehicleAssignment.findOne({ _id: sanitizedId, status: 'active', ...req.firmQuery });
        if (!assignment) {
            return res.status(404).json({ success: false, message: 'التعيين غير موجود أو منتهي / Assignment not found or already ended' });
        }

        assignment.status = 'ended';
        assignment.endDate = new Date();
        assignment.endOdometer = safeData.endOdometer;
        assignment.returnCondition = safeData.returnCondition;
        if (safeData.notes) assignment.notes = safeData.notes;
        await assignment.save();

        // Clear vehicle current driver
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
// GPS & LOCATION
// ═══════════════════════════════════════════════════════════════

const updateVehicleLocation = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            return res.status(400).json({ success: false, message: 'معرف المركبة غير صالح / Invalid vehicle ID' });
        }

        const allowedFields = ['latitude', 'longitude', 'altitude', 'heading', 'speed', 'address', 'addressAr', 'odometer'];
        const safeData = pickAllowedFields(req.body, allowedFields);

        if (!safeData.latitude || !safeData.longitude) {
            return res.status(400).json({ success: false, message: 'الإحداثيات مطلوبة / Coordinates are required' });
        }

        // Update vehicle location
        const vehicle = await Vehicle.findOneAndUpdate(
            { _id: sanitizedId, ...req.firmQuery },
            {
                $set: {
                    'lastKnownLocation.latitude': safeData.latitude,
                    'lastKnownLocation.longitude': safeData.longitude,
                    'lastKnownLocation.altitude': safeData.altitude,
                    'lastKnownLocation.heading': safeData.heading,
                    'lastKnownLocation.speed': safeData.speed,
                    'lastKnownLocation.address': safeData.address,
                    'lastKnownLocation.addressAr': safeData.addressAr,
                    'lastKnownLocation.updatedAt': new Date(),
                    currentOdometer: safeData.odometer || undefined
                }
            },
            { new: true }
        );

        if (!vehicle) {
            return res.status(404).json({ success: false, message: 'المركبة غير موجودة / Vehicle not found' });
        }

        // Log to history
        await GpsLocationHistory.create(req.addFirmId({
            vehicleId: sanitizedId,
            timestamp: new Date(),
            location: {
                latitude: safeData.latitude,
                longitude: safeData.longitude,
                altitude: safeData.altitude
            },
            speed: safeData.speed,
            heading: safeData.heading,
            odometer: safeData.odometer,
            address: safeData.address
        }));

        res.json({ success: true, message: 'تم تحديث الموقع / Location updated' });
    } catch (error) {
        logger.error('Error updating location:', error);
        res.status(500).json({ success: false, message: 'خطأ في تحديث الموقع / Error updating location', error: error.message });
    }
};

const getLocationHistory = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            return res.status(400).json({ success: false, message: 'معرف المركبة غير صالح / Invalid vehicle ID' });
        }

        const { dateFrom, dateTo, page = 1, limit = 100 } = req.query;

        const pageNum = Math.max(1, parseInt(page) || 1);
        const limitNum = Math.min(1000, Math.max(1, parseInt(limit) || 100));

        const query = { vehicleId: sanitizedId, ...req.firmQuery };
        if (dateFrom || dateTo) {
            query.timestamp = {};
            if (dateFrom) query.timestamp.$gte = new Date(dateFrom);
            if (dateTo) query.timestamp.$lte = new Date(dateTo);
        }

        const [locations, total] = await Promise.all([
            GpsLocationHistory.find(query)
                .sort({ timestamp: -1 })
                .skip((pageNum - 1) * limitNum)
                .limit(limitNum)
                .lean(),
            GpsLocationHistory.countDocuments(query)
        ]);

        res.json({ success: true, data: locations, pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) } });
    } catch (error) {
        logger.error('Error fetching location history:', error);
        res.status(500).json({ success: false, message: 'خطأ في جلب سجل المواقع / Error fetching location history', error: error.message });
    }
};

// ═══════════════════════════════════════════════════════════════
// STATISTICS & ALERTS
// ═══════════════════════════════════════════════════════════════

const getFleetStats = async (req, res) => {
    try {
        const match = { ...req.firmQuery };
        if (match.firmId && typeof match.firmId === 'string') match.firmId = new mongoose.Types.ObjectId(match.firmId);
        if (match.lawyerId && typeof match.lawyerId === 'string') match.lawyerId = new mongoose.Types.ObjectId(match.lawyerId);

        const [vehicleStats, fuelStats, maintenanceStats, incidentStats] = await Promise.all([
            Vehicle.aggregate([
                { $match: { ...match, isActive: true } },
                {
                    $group: {
                        _id: null,
                        total: { $sum: 1 },
                        active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
                        maintenance: { $sum: { $cond: [{ $eq: ['$status', 'maintenance'] }, 1, 0] } },
                        outOfService: { $sum: { $cond: [{ $eq: ['$status', 'out_of_service'] }, 1, 0] } },
                        assigned: { $sum: { $cond: [{ $ne: ['$currentDriverId', null] }, 1, 0] } },
                        unassigned: { $sum: { $cond: [{ $eq: ['$currentDriverId', null] }, 1, 0] } },
                        totalValue: { $sum: { $ifNull: ['$currentValue', '$purchasePrice'] } }
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
                        avgEfficiency: { $avg: '$fuelEfficiency' },
                        totalCo2: { $sum: '$co2Emissions' }
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
                        completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
                        totalCost: { $sum: '$totalCost' }
                    }
                }
            ]),
            VehicleIncident.aggregate([
                { $match: match },
                {
                    $group: {
                        _id: null,
                        total: { $sum: 1 },
                        open: { $sum: { $cond: [{ $in: ['$status', ['reported', 'under_investigation']] }, 1, 0] } },
                        resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } },
                        totalCost: { $sum: '$totalCost' }
                    }
                }
            ])
        ]);

        res.json({
            success: true,
            data: {
                vehicles: vehicleStats[0] || { total: 0, active: 0, maintenance: 0, outOfService: 0, assigned: 0, unassigned: 0, totalValue: 0 },
                fuel: {
                    totalLogs: fuelStats[0]?.totalLogs || 0,
                    totalQuantity: parseFloat((fuelStats[0]?.totalQuantity || 0).toFixed(2)),
                    totalCost: parseFloat((fuelStats[0]?.totalCost || 0).toFixed(2)),
                    avgEfficiency: parseFloat((fuelStats[0]?.avgEfficiency || 0).toFixed(2)),
                    totalCo2: parseFloat((fuelStats[0]?.totalCo2 || 0).toFixed(2))
                },
                maintenance: maintenanceStats[0] || { totalRecords: 0, scheduled: 0, inProgress: 0, completed: 0, totalCost: 0 },
                incidents: incidentStats[0] || { total: 0, open: 0, resolved: 0, totalCost: 0 }
            }
        });
    } catch (error) {
        logger.error('Error fetching fleet stats:', error);
        res.status(500).json({ success: false, message: 'خطأ في جلب إحصائيات الأسطول / Error fetching fleet stats', error: error.message });
    }
};

const getExpiringDocuments = async (req, res) => {
    try {
        const { days = 30 } = req.query;
        const daysNum = Math.max(1, parseInt(days) || 30);

        const vehicles = await Vehicle.getExpiringDocuments(req.firmQuery, daysNum);

        res.json({
            success: true,
            data: vehicles,
            message: `Found ${vehicles.length} vehicles with documents expiring within ${daysNum} days`
        });
    } catch (error) {
        logger.error('Error fetching expiring documents:', error);
        res.status(500).json({ success: false, message: 'خطأ في جلب المستندات المنتهية / Error fetching expiring documents', error: error.message });
    }
};

const getMaintenanceDue = async (req, res) => {
    try {
        const { days = 14 } = req.query;
        const daysNum = Math.max(1, parseInt(days) || 14);

        const vehicles = await Vehicle.getMaintenanceDue(req.firmQuery, daysNum);

        res.json({
            success: true,
            data: vehicles,
            message: `Found ${vehicles.length} vehicles due for maintenance within ${daysNum} days`
        });
    } catch (error) {
        logger.error('Error fetching maintenance due:', error);
        res.status(500).json({ success: false, message: 'خطأ في جلب الصيانة المستحقة / Error fetching maintenance due', error: error.message });
    }
};

const getDriverRankings = async (req, res) => {
    try {
        const { limit = 10 } = req.query;
        const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 10));

        const rankings = await DriverProfile.getDriverRankings(req.firmQuery, limitNum);

        res.json({ success: true, data: rankings });
    } catch (error) {
        logger.error('Error fetching driver rankings:', error);
        res.status(500).json({ success: false, message: 'خطأ في جلب ترتيب السائقين / Error fetching driver rankings', error: error.message });
    }
};

module.exports = {
    // Vehicles
    getVehicles,
    getVehicleById,
    createVehicle,
    updateVehicle,
    deleteVehicle,
    // Fuel
    getFuelLogs,
    createFuelLog,
    verifyFuelLog,
    // Maintenance
    getMaintenanceRecords,
    createMaintenanceRecord,
    updateMaintenanceRecord,
    // Inspections
    getInspections,
    getInspectionChecklist,
    createInspection,
    // Trips
    getTrips,
    createTrip,
    endTrip,
    // Incidents
    getIncidents,
    getIncidentById,
    createIncident,
    updateIncident,
    // Driver Profiles
    getDriverProfiles,
    getDriverProfileById,
    createDriverProfile,
    updateDriverProfile,
    // Assignments
    assignVehicle,
    endAssignment,
    // GPS
    updateVehicleLocation,
    getLocationHistory,
    // Stats & Alerts
    getFleetStats,
    getExpiringDocuments,
    getMaintenanceDue,
    getDriverRankings
};
