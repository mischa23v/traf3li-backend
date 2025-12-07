const mongoose = require('mongoose');
const { AssetAssignment, Employee, User } = require('../models');
const { CustomException } = require('../utils');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Asset Assignment Controller - HR Management
 * Module 14: الأصول والمعدات (Assets & Equipment)
 * Comprehensive asset assignment and tracking management
 */

// ═══════════════════════════════════════════════════════════════
// ASSET POLICIES (Configurable)
// ═══════════════════════════════════════════════════════════════

const ASSET_POLICIES = {
    depreciationRates: {
        laptop: 33.33,
        desktop: 33.33,
        mobile_phone: 50,
        tablet: 33.33,
        monitor: 20,
        furniture: 10,
        vehicle: 20,
        other: 20
    },
    maintenanceIntervals: {
        laptop: 365,
        desktop: 365,
        vehicle: 90,
        printer: 180
    },
    returnGracePeriod: 7,
    liabilityThresholds: {
        fullLiability: 10000,
        partialLiability: 5000
    }
};

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

// Generate unique maintenance ID
function generateMaintenanceId() {
    return `MNT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Generate unique repair ID
function generateRepairId() {
    return `RPR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Generate unique incident ID
function generateIncidentId() {
    return `INC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Generate unique transfer ID
function generateTransferId() {
    return `TRF-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Generate clearance certificate number
function generateClearanceNumber(assignmentNumber) {
    const timestamp = Date.now().toString(36).toUpperCase();
    return `CLR-${assignmentNumber}-${timestamp}`;
}

// Calculate depreciated value
function calculateDepreciatedValue(purchasePrice, purchaseDate, depreciationRate) {
    if (!purchasePrice || !purchaseDate || !depreciationRate) return purchasePrice;
    const yearsSincePurchase = (new Date() - new Date(purchaseDate)) / (1000 * 60 * 60 * 24 * 365);
    const depreciation = (depreciationRate / 100) * yearsSincePurchase * purchasePrice;
    return Math.max(0, purchasePrice - depreciation);
}

// ═══════════════════════════════════════════════════════════════
// GET ALL ASSIGNMENTS
// GET /api/hr/asset-assignments
// ═══════════════════════════════════════════════════════════════

const getAssignments = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;

    const query = firmId ? { firmId } : { lawyerId };

    // Filters
    const {
        status, assetType, assetCategory, assignmentType, department,
        employeeId, condition, dateFrom, dateTo, overdue, maintenanceDue,
        search, page = 1, limit = 20, sortBy = 'createdOn', sortOrder = 'desc'
    } = req.query;

    if (status) query.status = status;
    if (assetType) query.assetType = assetType;
    if (assetCategory) query.assetCategory = assetCategory;
    if (assignmentType) query.assignmentType = assignmentType;
    if (department) query.department = department;
    if (employeeId) query.employeeId = employeeId;
    if (condition) query.conditionAtAssignment = condition;

    if (dateFrom || dateTo) {
        query.assignedDate = {};
        if (dateFrom) query.assignedDate.$gte = new Date(dateFrom);
        if (dateTo) query.assignedDate.$lte = new Date(dateTo);
    }

    if (overdue === 'true') {
        query['returnProcess.returnDueDate'] = { $lt: new Date() };
        query['returnProcess.returnCompleted'] = { $ne: true };
    }

    if (maintenanceDue === 'true') {
        query['maintenanceSchedule.nextMaintenanceDue'] = { $lte: new Date() };
        query['maintenanceSchedule.overdue'] = true;
    }

    if (search) {
        query.$or = [
            { assignmentNumber: { $regex: search, $options: 'i' } },
            { assetName: { $regex: search, $options: 'i' } },
            { assetNameAr: { $regex: search, $options: 'i' } },
            { assetTag: { $regex: search, $options: 'i' } },
            { serialNumber: { $regex: search, $options: 'i' } },
            { employeeName: { $regex: search, $options: 'i' } },
            { employeeNameAr: { $regex: search, $options: 'i' } },
            { employeeNumber: { $regex: search, $options: 'i' } }
        ];
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const assignments = await AssetAssignment.find(query)
        .populate('employeeId', 'employeeId personalInfo')
        .populate('createdBy', 'firstName lastName')
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit))
        .sort(sortOptions);

    const total = await AssetAssignment.countDocuments(query);

    return res.json({
        success: true,
        assignments,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
        }
    });
});

// ═══════════════════════════════════════════════════════════════
// GET SINGLE ASSIGNMENT
// GET /api/hr/asset-assignments/:assignmentId
// ═══════════════════════════════════════════════════════════════

const getAssignment = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const { assignmentId } = req.params;

    const query = firmId ? { firmId, _id: assignmentId } : { lawyerId, _id: assignmentId };

    const assignment = await AssetAssignment.findOne(query)
        .populate('employeeId', 'employeeId personalInfo employment')
        .populate('createdBy', 'firstName lastName')
        .populate('handover.handedOverBy', 'firstName lastName')
        .populate('returnProcess.receivedBy', 'firstName lastName')
        .populate('returnProcess.inspection.inspectedBy', 'firstName lastName')
        .populate('relatedRecords.previousAssignmentIds', 'assignmentNumber assetName employeeName')
        .populate('relatedRecords.expenseClaimIds', 'claimNumber status');

    if (!assignment) {
        throw CustomException('Asset assignment not found', 404);
    }

    return res.json({
        success: true,
        assignment
    });
});

// ═══════════════════════════════════════════════════════════════
// CREATE ASSIGNMENT
// POST /api/hr/asset-assignments
// ═══════════════════════════════════════════════════════════════

const createAssignment = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;

    const {
        employeeId, assetTag, assetName, assetNameAr, assetType, assetCategory,
        brand, model, serialNumber, modelNumber, specifications,
        conditionAtAssignment, conditionNotes, purchasePrice, purchaseDate,
        currency, ownership, warranty, insurance, leaseDetails, defaultLocation,
        assignmentType, assignedDate, expectedReturnDate, indefiniteAssignment,
        assignmentPurpose, assignmentPurposeCategory, projectAssignment,
        assignmentLocation, handover, termsAndConditions, maintenanceSchedule,
        assignmentRequest, photos, notes
    } = req.body;

    // Validate employee
    const employee = await Employee.findById(employeeId);
    if (!employee) {
        throw CustomException('Employee not found', 404);
    }

    // Generate assignment number and ID
    const assignmentNumber = await AssetAssignment.generateAssignmentNumber(firmId);
    const assignmentIdGenerated = await AssetAssignment.generateAssignmentId();

    // Calculate depreciated value if purchase info provided
    let currentValue = purchasePrice;
    let depreciationRate = ASSET_POLICIES.depreciationRates[assetType] || ASSET_POLICIES.depreciationRates.other;
    if (purchasePrice && purchaseDate) {
        currentValue = calculateDepreciatedValue(purchasePrice, purchaseDate, depreciationRate);
    }

    const assignment = new AssetAssignment({
        firmId,
        lawyerId: !firmId ? lawyerId : undefined,

        // Identification
        assignmentId: assignmentIdGenerated,
        assignmentNumber,

        // Employee info
        employeeId,
        employeeNumber: employee.employeeId,
        employeeName: employee.personalInfo?.fullNameEnglish || employee.personalInfo?.fullNameArabic,
        employeeNameAr: employee.personalInfo?.fullNameArabic,
        email: employee.personalInfo?.email,
        phone: employee.personalInfo?.phone,
        department: employee.employment?.department,
        jobTitle: employee.employment?.jobTitle,
        managerId: employee.employment?.reportingTo,

        // Asset details
        assetTag,
        assetName,
        assetNameAr,
        assetType,
        assetCategory,
        brand,
        model,
        serialNumber,
        modelNumber,
        specifications,
        conditionAtAssignment,
        conditionNotes,
        photos,

        // Value
        purchasePrice,
        purchaseDate,
        currentValue,
        currency: currency || 'SAR',
        depreciationRate,
        ownership: ownership || 'company_owned',
        warranty,
        insurance,
        leaseDetails,
        defaultLocation,

        // Assignment details
        assignmentType,
        assignedDate: assignedDate || new Date(),
        expectedReturnDate,
        indefiniteAssignment: indefiniteAssignment || false,
        assignmentPurpose,
        assignmentPurposeCategory,
        projectAssignment,
        assignmentLocation,
        handover: {
            ...handover,
            handoverDate: handover?.handoverDate || new Date(),
            handedOverBy: req.userID
        },

        // Terms
        termsAndConditions,

        // Status
        status: 'assigned',
        statusDate: new Date(),

        // Maintenance schedule
        maintenanceSchedule: maintenanceSchedule ? {
            ...maintenanceSchedule,
            nextMaintenanceDue: maintenanceSchedule.nextMaintenanceDue ||
                new Date(Date.now() + (ASSET_POLICIES.maintenanceIntervals[assetType] || 365) * 24 * 60 * 60 * 1000)
        } : undefined,

        // Request info
        assignmentRequest,

        // Notes
        notes,

        // Audit
        createdOn: new Date(),
        createdBy: req.userID
    });

    await assignment.save();

    return res.status(201).json({
        success: true,
        message: 'Asset assigned successfully',
        assignment
    });
});

// ═══════════════════════════════════════════════════════════════
// UPDATE ASSIGNMENT
// PATCH /api/hr/asset-assignments/:assignmentId
// ═══════════════════════════════════════════════════════════════

const updateAssignment = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const { assignmentId } = req.params;

    const query = firmId ? { firmId, _id: assignmentId } : { lawyerId, _id: assignmentId };

    const assignment = await AssetAssignment.findOne(query);
    if (!assignment) {
        throw CustomException('Asset assignment not found', 404);
    }

    const allowedUpdates = [
        'assetName', 'assetNameAr', 'brand', 'model', 'specifications',
        'conditionNotes', 'currentValue', 'warranty', 'insurance', 'leaseDetails',
        'defaultLocation', 'expectedReturnDate', 'assignmentPurpose',
        'assignmentPurposeCategory', 'projectAssignment', 'assignmentLocation',
        'termsAndConditions', 'maintenanceSchedule', 'tracking', 'currentLocation',
        'usageTracking', 'softwareLicense', 'vehicleDetails', 'compliance', 'notes'
    ];

    allowedUpdates.forEach(field => {
        if (req.body[field] !== undefined) {
            if (typeof req.body[field] === 'object' && !Array.isArray(req.body[field])) {
                Object.assign(assignment[field] || {}, req.body[field]);
            } else {
                assignment[field] = req.body[field];
            }
        }
    });

    assignment.lastModifiedBy = req.userID;
    await assignment.save();

    return res.json({
        success: true,
        message: 'Asset assignment updated successfully',
        assignment
    });
});

// ═══════════════════════════════════════════════════════════════
// DELETE ASSIGNMENT
// DELETE /api/hr/asset-assignments/:assignmentId
// ═══════════════════════════════════════════════════════════════

const deleteAssignment = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const { assignmentId } = req.params;

    const query = firmId ? { firmId, _id: assignmentId } : { lawyerId, _id: assignmentId };

    const assignment = await AssetAssignment.findOne(query);
    if (!assignment) {
        throw CustomException('Asset assignment not found', 404);
    }

    // Only allow deletion if not returned or in use
    if (['in_use', 'returned'].includes(assignment.status)) {
        throw CustomException(`Cannot delete assignment in ${assignment.status} status`, 400);
    }

    await AssetAssignment.findByIdAndDelete(assignmentId);

    return res.json({
        success: true,
        message: 'Asset assignment deleted successfully'
    });
});

// ═══════════════════════════════════════════════════════════════
// ACKNOWLEDGE ASSIGNMENT
// POST /api/hr/asset-assignments/:assignmentId/acknowledge
// ═══════════════════════════════════════════════════════════════

const acknowledgeAssignment = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const { assignmentId } = req.params;
    const { acknowledgmentMethod, signature, acknowledgedTerms } = req.body;

    const query = firmId ? { firmId, _id: assignmentId } : { lawyerId, _id: assignmentId };

    const assignment = await AssetAssignment.findOne(query);
    if (!assignment) {
        throw CustomException('Asset assignment not found', 404);
    }

    if (assignment.acknowledgment.acknowledged) {
        throw CustomException('Assignment has already been acknowledged', 400);
    }

    assignment.acknowledgment = {
        acknowledged: true,
        acknowledgmentDate: new Date(),
        acknowledgmentMethod: acknowledgmentMethod || 'system_acceptance',
        acknowledgedTerms,
        signature,
        signatureUrl: req.body.signatureUrl
    };

    assignment.status = 'in_use';
    assignment.statusDate = new Date();
    assignment.lastModifiedBy = req.userID;
    await assignment.save();

    return res.json({
        success: true,
        message: 'Assignment acknowledged successfully',
        assignment
    });
});

// ═══════════════════════════════════════════════════════════════
// INITIATE RETURN
// POST /api/hr/asset-assignments/:assignmentId/initiate-return
// ═══════════════════════════════════════════════════════════════

const initiateReturn = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const { assignmentId } = req.params;
    const { returnReason, returnReasonDetails, returnDueDate, initiatedBy } = req.body;

    const query = firmId ? { firmId, _id: assignmentId } : { lawyerId, _id: assignmentId };

    const assignment = await AssetAssignment.findOne(query);
    if (!assignment) {
        throw CustomException('Asset assignment not found', 404);
    }

    if (assignment.returnProcess?.returnInitiated) {
        throw CustomException('Return process has already been initiated', 400);
    }

    if (['returned', 'lost', 'stolen', 'retired'].includes(assignment.status)) {
        throw CustomException(`Cannot initiate return for assignment in ${assignment.status} status`, 400);
    }

    assignment.returnProcess = {
        returnInitiated: true,
        returnInitiatedDate: new Date(),
        returnInitiatedBy: initiatedBy || 'hr',
        returnReason,
        returnReasonDetails,
        returnDueDate: returnDueDate || new Date(Date.now() + ASSET_POLICIES.returnGracePeriod * 24 * 60 * 60 * 1000),
        returnReminders: [],
        returnCompleted: false
    };

    assignment.lastModifiedBy = req.userID;
    await assignment.save();

    return res.json({
        success: true,
        message: 'Return process initiated successfully',
        assignment
    });
});

// ═══════════════════════════════════════════════════════════════
// COMPLETE RETURN
// POST /api/hr/asset-assignments/:assignmentId/complete-return
// ═══════════════════════════════════════════════════════════════

const completeReturn = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const { assignmentId } = req.params;
    const {
        actualReturnDate, returnedBy, returnMethod, returnLocation,
        conditionAtReturn, inspection, returnCharges, nextSteps
    } = req.body;

    const query = firmId ? { firmId, _id: assignmentId } : { lawyerId, _id: assignmentId };

    const assignment = await AssetAssignment.findOne(query);
    if (!assignment) {
        throw CustomException('Asset assignment not found', 404);
    }

    if (assignment.status === 'returned') {
        throw CustomException('Asset has already been returned', 400);
    }

    // Update return process
    assignment.returnProcess = {
        ...assignment.returnProcess,
        actualReturnDate: actualReturnDate || new Date(),
        returnedBy,
        returnMethod: returnMethod || 'hand_delivery',
        returnLocation,
        receivedBy: req.userID,
        receivedByName: req.user?.name,
        inspection: {
            inspected: true,
            inspectionDate: new Date(),
            inspectedBy: req.userID,
            conditionAtReturn,
            ...inspection
        },
        returnCharges,
        nextSteps,
        returnCompleted: true,
        returnCompletionDate: new Date()
    };

    assignment.status = 'returned';
    assignment.statusDate = new Date();
    assignment.lastModifiedBy = req.userID;
    await assignment.save();

    return res.json({
        success: true,
        message: 'Return completed successfully',
        assignment
    });
});

// ═══════════════════════════════════════════════════════════════
// RECORD MAINTENANCE
// POST /api/hr/asset-assignments/:assignmentId/maintenance
// ═══════════════════════════════════════════════════════════════

const recordMaintenance = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const { assignmentId } = req.params;
    const {
        maintenanceType, maintenanceDate, performedBy, technician, vendorName,
        workOrder, description, partsReplaced, laborCost, totalCost,
        downtime, nextServiceDue, invoiceNumber, invoiceUrl, notes
    } = req.body;

    const query = firmId ? { firmId, _id: assignmentId } : { lawyerId, _id: assignmentId };

    const assignment = await AssetAssignment.findOne(query);
    if (!assignment) {
        throw CustomException('Asset assignment not found', 404);
    }

    const maintenanceRecord = {
        maintenanceId: generateMaintenanceId(),
        maintenanceType,
        maintenanceDate: maintenanceDate || new Date(),
        performedBy,
        technician,
        vendorName,
        workOrder,
        description,
        partsReplaced,
        laborCost: laborCost || 0,
        totalCost: totalCost || 0,
        downtime,
        nextServiceDue,
        invoiceNumber,
        invoiceUrl,
        notes
    };

    if (!assignment.maintenanceHistory) {
        assignment.maintenanceHistory = [];
    }
    assignment.maintenanceHistory.push(maintenanceRecord);

    // Update maintenance schedule
    assignment.maintenanceSchedule = {
        ...assignment.maintenanceSchedule,
        lastMaintenanceDate: maintenanceDate || new Date(),
        nextMaintenanceDue: nextServiceDue,
        overdue: false,
        daysOverdue: 0
    };

    // Update total maintenance cost
    assignment.totalMaintenanceCost = (assignment.totalMaintenanceCost || 0) + (totalCost || 0);

    assignment.lastModifiedBy = req.userID;
    await assignment.save();

    return res.json({
        success: true,
        message: 'Maintenance recorded successfully',
        maintenanceRecord,
        assignment
    });
});

// ═══════════════════════════════════════════════════════════════
// REPORT REPAIR
// POST /api/hr/asset-assignments/:assignmentId/repair
// ═══════════════════════════════════════════════════════════════

const reportRepair = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const { assignmentId } = req.params;
    const {
        issueDescription, severity, causeOfDamage, employeeLiable,
        liabilityAmount, photos, notes
    } = req.body;

    const query = firmId ? { firmId, _id: assignmentId } : { lawyerId, _id: assignmentId };

    const assignment = await AssetAssignment.findOne(query);
    if (!assignment) {
        throw CustomException('Asset assignment not found', 404);
    }

    const repairRecord = {
        repairId: generateRepairId(),
        reportedDate: new Date(),
        reportedBy: req.userID,
        issueDescription,
        severity,
        causeOfDamage,
        employeeLiable: employeeLiable || false,
        liabilityAmount,
        repairStatus: 'reported',
        photos,
        notes
    };

    if (!assignment.repairs) {
        assignment.repairs = [];
    }
    assignment.repairs.push(repairRecord);

    // Update status if critical damage
    if (severity === 'critical') {
        assignment.status = 'damaged';
        assignment.statusDate = new Date();
    }

    assignment.lastModifiedBy = req.userID;
    await assignment.save();

    return res.json({
        success: true,
        message: 'Repair reported successfully',
        repairRecord,
        assignment
    });
});

// ═══════════════════════════════════════════════════════════════
// UPDATE REPAIR STATUS
// PATCH /api/hr/asset-assignments/:assignmentId/repair/:repairId
// ═══════════════════════════════════════════════════════════════

const updateRepairStatus = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const { assignmentId, repairId } = req.params;

    const query = firmId ? { firmId, _id: assignmentId } : { lawyerId, _id: assignmentId };

    const assignment = await AssetAssignment.findOne(query);
    if (!assignment) {
        throw CustomException('Asset assignment not found', 404);
    }

    const repairIndex = assignment.repairs.findIndex(r => r.repairId === repairId);
    if (repairIndex === -1) {
        throw CustomException('Repair record not found', 404);
    }

    // Update repair record
    Object.assign(assignment.repairs[repairIndex], req.body);

    // If repair completed, update totals
    if (req.body.repairStatus === 'completed' && req.body.totalRepairCost) {
        assignment.totalRepairCost = (assignment.totalRepairCost || 0) + req.body.totalRepairCost;

        // Update status back to in_use if asset is functional
        if (req.body.assetFunctional) {
            assignment.status = 'in_use';
            assignment.statusDate = new Date();
        }
    }

    assignment.lastModifiedBy = req.userID;
    await assignment.save();

    return res.json({
        success: true,
        message: 'Repair updated successfully',
        repair: assignment.repairs[repairIndex],
        assignment
    });
});

// ═══════════════════════════════════════════════════════════════
// REPORT INCIDENT
// POST /api/hr/asset-assignments/:assignmentId/incident
// ═══════════════════════════════════════════════════════════════

const reportIncident = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const { assignmentId } = req.params;
    const {
        incidentType, incidentDate, incidentDescription, location,
        circumstances, impact, photos, notes
    } = req.body;

    const query = firmId ? { firmId, _id: assignmentId } : { lawyerId, _id: assignmentId };

    const assignment = await AssetAssignment.findOne(query);
    if (!assignment) {
        throw CustomException('Asset assignment not found', 404);
    }

    const incidentRecord = {
        incidentId: generateIncidentId(),
        incidentType,
        incidentDate: incidentDate || new Date(),
        reportedDate: new Date(),
        reportedBy: req.userID,
        incidentDescription,
        location,
        circumstances,
        impact,
        resolution: { resolved: false },
        photos,
        notes
    };

    if (!assignment.incidents) {
        assignment.incidents = [];
    }
    assignment.incidents.push(incidentRecord);

    // Update status based on incident type
    if (incidentType === 'loss') {
        assignment.status = 'lost';
        assignment.statusDate = new Date();
    } else if (incidentType === 'theft') {
        assignment.status = 'stolen';
        assignment.statusDate = new Date();
    } else if (incidentType === 'damage' && impact?.severity === 'critical') {
        assignment.status = 'damaged';
        assignment.statusDate = new Date();
    }

    assignment.lastModifiedBy = req.userID;
    await assignment.save();

    return res.json({
        success: true,
        message: 'Incident reported successfully',
        incident: incidentRecord,
        assignment
    });
});

// ═══════════════════════════════════════════════════════════════
// UPDATE STATUS
// POST /api/hr/asset-assignments/:assignmentId/status
// ═══════════════════════════════════════════════════════════════

const updateStatus = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const { assignmentId } = req.params;
    const { status, reason } = req.body;

    const query = firmId ? { firmId, _id: assignmentId } : { lawyerId, _id: assignmentId };

    const assignment = await AssetAssignment.findOne(query);
    if (!assignment) {
        throw CustomException('Asset assignment not found', 404);
    }

    const validStatuses = ['assigned', 'in_use', 'returned', 'lost', 'damaged', 'maintenance', 'stolen', 'retired'];
    if (!validStatuses.includes(status)) {
        throw CustomException('Invalid status', 400);
    }

    assignment.status = status;
    assignment.statusDate = new Date();

    if (reason) {
        assignment.notes.internalNotes = `${assignment.notes.internalNotes || ''}\n[${new Date().toISOString()}] Status changed to ${status}: ${reason}`;
    }

    assignment.lastModifiedBy = req.userID;
    await assignment.save();

    return res.json({
        success: true,
        message: 'Status updated successfully',
        assignment
    });
});

// ═══════════════════════════════════════════════════════════════
// TRANSFER ASSET
// POST /api/hr/asset-assignments/:assignmentId/transfer
// ═══════════════════════════════════════════════════════════════

const transferAsset = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const { assignmentId } = req.params;
    const {
        transferType, transferToEmployeeId, transferToDepartment,
        transferToLocation, transferReason, temporary, expectedReturnDate
    } = req.body;

    const query = firmId ? { firmId, _id: assignmentId } : { lawyerId, _id: assignmentId };

    const assignment = await AssetAssignment.findOne(query);
    if (!assignment) {
        throw CustomException('Asset assignment not found', 404);
    }

    // Validate new employee if transferring to different employee
    let newEmployee = null;
    if (transferToEmployeeId) {
        newEmployee = await Employee.findById(transferToEmployeeId);
        if (!newEmployee) {
            throw CustomException('Transfer target employee not found', 404);
        }
    }

    const transferRecord = {
        transferId: generateTransferId(),
        transferType,
        transferDate: new Date(),
        transferFrom: {
            employeeId: assignment.employeeId,
            employeeName: assignment.employeeName,
            department: assignment.department,
            location: assignment.currentLocation?.locationName
        },
        transferTo: {
            employeeId: transferToEmployeeId,
            employeeName: newEmployee?.personalInfo?.fullNameEnglish,
            department: transferToDepartment || assignment.department,
            location: transferToLocation
        },
        transferReason,
        temporary: temporary || false,
        expectedReturnDate,
        approvedBy: req.userID,
        approvalDate: new Date(),
        transferCompleted: true
    };

    if (!assignment.transfers) {
        assignment.transfers = [];
    }
    assignment.transfers.push(transferRecord);

    // Update assignment if transferring to new employee
    if (transferToEmployeeId && newEmployee) {
        assignment.employeeId = transferToEmployeeId;
        assignment.employeeNumber = newEmployee.employeeId;
        assignment.employeeName = newEmployee.personalInfo?.fullNameEnglish || newEmployee.personalInfo?.fullNameArabic;
        assignment.employeeNameAr = newEmployee.personalInfo?.fullNameArabic;
        assignment.department = newEmployee.employment?.department || transferToDepartment;
        assignment.jobTitle = newEmployee.employment?.jobTitle;
    }

    // Update department/location if specified
    if (transferToDepartment) {
        assignment.department = transferToDepartment;
    }
    if (transferToLocation) {
        assignment.currentLocation = {
            ...assignment.currentLocation,
            locationName: transferToLocation,
            lastUpdated: new Date()
        };
    }

    assignment.lastModifiedBy = req.userID;
    await assignment.save();

    return res.json({
        success: true,
        message: 'Asset transferred successfully',
        transfer: transferRecord,
        assignment
    });
});

// ═══════════════════════════════════════════════════════════════
// ISSUE CLEARANCE
// POST /api/hr/asset-assignments/:assignmentId/issue-clearance
// ═══════════════════════════════════════════════════════════════

const issueClearance = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const { assignmentId } = req.params;
    const { outstandingIssues } = req.body;

    const query = firmId ? { firmId, _id: assignmentId } : { lawyerId, _id: assignmentId };

    const assignment = await AssetAssignment.findOne(query);
    if (!assignment) {
        throw CustomException('Asset assignment not found', 404);
    }

    if (assignment.status !== 'returned') {
        throw CustomException('Asset must be returned before issuing clearance', 400);
    }

    if (assignment.returnProcess?.clearance?.cleared) {
        throw CustomException('Clearance has already been issued', 400);
    }

    assignment.returnProcess.clearance = {
        cleared: true,
        clearanceDate: new Date(),
        clearanceBy: req.userID,
        clearanceByName: req.user?.name,
        clearanceCertificate: generateClearanceNumber(assignment.assignmentNumber),
        outstandingIssues: outstandingIssues || []
    };

    assignment.lastModifiedBy = req.userID;
    await assignment.save();

    return res.json({
        success: true,
        message: 'Clearance issued successfully',
        clearance: assignment.returnProcess.clearance
    });
});

// ═══════════════════════════════════════════════════════════════
// BULK DELETE
// POST /api/hr/asset-assignments/bulk-delete
// ═══════════════════════════════════════════════════════════════

const bulkDeleteAssignments = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        throw CustomException('Assignment IDs are required', 400);
    }

    const query = firmId
        ? { firmId, _id: { $in: ids }, status: 'assigned' }
        : { lawyerId, _id: { $in: ids }, status: 'assigned' };

    const result = await AssetAssignment.deleteMany(query);

    return res.json({
        success: true,
        message: `${result.deletedCount} assignment(s) deleted successfully`,
        deletedCount: result.deletedCount
    });
});

// ═══════════════════════════════════════════════════════════════
// GET STATISTICS
// GET /api/hr/asset-assignments/stats
// ═══════════════════════════════════════════════════════════════

const getAssignmentStats = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const { department, assetType, assetCategory } = req.query;

    const matchQuery = firmId ? { firmId: new mongoose.Types.ObjectId(firmId) } : { lawyerId: new mongoose.Types.ObjectId(lawyerId) };

    if (department) matchQuery.department = department;
    if (assetType) matchQuery.assetType = assetType;
    if (assetCategory) matchQuery.assetCategory = assetCategory;

    const [
        totalStats,
        byStatus,
        byType,
        byCategory,
        byDepartment
    ] = await Promise.all([
        AssetAssignment.aggregate([
            { $match: matchQuery },
            {
                $group: {
                    _id: null,
                    totalAssignments: { $sum: 1 },
                    totalValue: { $sum: '$currentValue' },
                    totalPurchaseValue: { $sum: '$purchasePrice' },
                    totalMaintenanceCost: { $sum: '$totalMaintenanceCost' },
                    totalRepairCost: { $sum: '$totalRepairCost' }
                }
            }
        ]),
        AssetAssignment.aggregate([
            { $match: matchQuery },
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]),
        AssetAssignment.aggregate([
            { $match: matchQuery },
            {
                $group: {
                    _id: '$assetType',
                    count: { $sum: 1 },
                    totalValue: { $sum: '$currentValue' }
                }
            }
        ]),
        AssetAssignment.aggregate([
            { $match: matchQuery },
            {
                $group: {
                    _id: '$assetCategory',
                    count: { $sum: 1 },
                    totalValue: { $sum: '$currentValue' }
                }
            }
        ]),
        AssetAssignment.aggregate([
            { $match: matchQuery },
            {
                $group: {
                    _id: '$department',
                    count: { $sum: 1 },
                    totalValue: { $sum: '$currentValue' }
                }
            }
        ])
    ]);

    // Count specific statuses
    const overdueReturns = await AssetAssignment.countDocuments({
        ...matchQuery,
        'returnProcess.returnDueDate': { $lt: new Date() },
        'returnProcess.returnCompleted': { $ne: true }
    });

    const maintenanceDue = await AssetAssignment.countDocuments({
        ...matchQuery,
        'maintenanceSchedule.nextMaintenanceDue': { $lte: new Date() },
        status: { $in: ['assigned', 'in_use'] }
    });

    const warrantyExpiring = await AssetAssignment.countDocuments({
        ...matchQuery,
        'warranty.warrantyEndDate': {
            $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            $gte: new Date()
        }
    });

    const incidentsThisMonth = await AssetAssignment.countDocuments({
        ...matchQuery,
        'incidents.reportedDate': {
            $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        }
    });

    return res.json({
        success: true,
        stats: {
            ...(totalStats[0] || {
                totalAssignments: 0,
                totalValue: 0,
                totalPurchaseValue: 0,
                totalMaintenanceCost: 0,
                totalRepairCost: 0
            }),
            overdueReturns,
            maintenanceDue,
            warrantyExpiring,
            incidentsThisMonth
        },
        byStatus: byStatus.map(s => ({ status: s._id, count: s.count })),
        byType: byType.map(t => ({ assetType: t._id, count: t.count, totalValue: t.totalValue })),
        byCategory: byCategory.map(c => ({ category: c._id, count: c.count, totalValue: c.totalValue })),
        byDepartment: byDepartment.map(d => ({ department: d._id || 'Unknown', count: d.count, totalValue: d.totalValue }))
    });
});

// ═══════════════════════════════════════════════════════════════
// GET BY EMPLOYEE
// GET /api/hr/asset-assignments/by-employee/:employeeId
// ═══════════════════════════════════════════════════════════════

const getAssignmentsByEmployee = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const { employeeId } = req.params;
    const { status, includeHistory = 'true' } = req.query;

    const query = firmId
        ? { firmId, employeeId }
        : { lawyerId, employeeId };

    if (status) query.status = status;
    if (includeHistory === 'false') {
        query.status = { $in: ['assigned', 'in_use'] };
    }

    const assignments = await AssetAssignment.find(query)
        .sort({ assignedDate: -1 });

    // Calculate summary
    const summary = {
        totalAssigned: assignments.length,
        currentlyHeld: assignments.filter(a => ['assigned', 'in_use'].includes(a.status)).length,
        returned: assignments.filter(a => a.status === 'returned').length,
        totalValue: assignments
            .filter(a => ['assigned', 'in_use'].includes(a.status))
            .reduce((sum, a) => sum + (a.currentValue || 0), 0),
        byType: {}
    };

    assignments.forEach(a => {
        if (['assigned', 'in_use'].includes(a.status)) {
            summary.byType[a.assetType] = (summary.byType[a.assetType] || 0) + 1;
        }
    });

    return res.json({
        success: true,
        assignments,
        summary
    });
});

// ═══════════════════════════════════════════════════════════════
// GET OVERDUE RETURNS
// GET /api/hr/asset-assignments/overdue-returns
// ═══════════════════════════════════════════════════════════════

const getOverdueReturns = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const { page = 1, limit = 20 } = req.query;

    const query = firmId
        ? {
            firmId,
            'returnProcess.returnDueDate': { $lt: new Date() },
            'returnProcess.returnCompleted': { $ne: true }
        }
        : {
            lawyerId,
            'returnProcess.returnDueDate': { $lt: new Date() },
            'returnProcess.returnCompleted': { $ne: true }
        };

    const assignments = await AssetAssignment.find(query)
        .populate('employeeId', 'employeeId personalInfo')
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit))
        .sort({ 'returnProcess.returnDueDate': 1 });

    const total = await AssetAssignment.countDocuments(query);

    // Add days overdue
    const results = assignments.map(a => ({
        ...a.toObject(),
        daysOverdue: Math.ceil((new Date() - new Date(a.returnProcess?.returnDueDate)) / (1000 * 60 * 60 * 24))
    }));

    return res.json({
        success: true,
        assignments: results,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
        }
    });
});

// ═══════════════════════════════════════════════════════════════
// GET MAINTENANCE DUE
// GET /api/hr/asset-assignments/maintenance-due
// ═══════════════════════════════════════════════════════════════

const getMaintenanceDue = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const { page = 1, limit = 20 } = req.query;

    const query = firmId
        ? {
            firmId,
            'maintenanceSchedule.nextMaintenanceDue': { $lte: new Date() },
            status: { $in: ['assigned', 'in_use'] }
        }
        : {
            lawyerId,
            'maintenanceSchedule.nextMaintenanceDue': { $lte: new Date() },
            status: { $in: ['assigned', 'in_use'] }
        };

    const assignments = await AssetAssignment.find(query)
        .populate('employeeId', 'employeeId personalInfo')
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit))
        .sort({ 'maintenanceSchedule.nextMaintenanceDue': 1 });

    const total = await AssetAssignment.countDocuments(query);

    return res.json({
        success: true,
        assignments,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
        }
    });
});

// ═══════════════════════════════════════════════════════════════
// GET WARRANTY EXPIRING
// GET /api/hr/asset-assignments/warranty-expiring
// ═══════════════════════════════════════════════════════════════

const getWarrantyExpiring = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const { days = 30, page = 1, limit = 20 } = req.query;

    const futureDate = new Date(Date.now() + parseInt(days) * 24 * 60 * 60 * 1000);

    const query = firmId
        ? {
            firmId,
            'warranty.warrantyEndDate': { $lte: futureDate, $gte: new Date() },
            status: { $in: ['assigned', 'in_use'] }
        }
        : {
            lawyerId,
            'warranty.warrantyEndDate': { $lte: futureDate, $gte: new Date() },
            status: { $in: ['assigned', 'in_use'] }
        };

    const assignments = await AssetAssignment.find(query)
        .populate('employeeId', 'employeeId personalInfo')
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit))
        .sort({ 'warranty.warrantyEndDate': 1 });

    const total = await AssetAssignment.countDocuments(query);

    return res.json({
        success: true,
        assignments,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
        }
    });
});

// ═══════════════════════════════════════════════════════════════
// EXPORT ASSIGNMENTS
// GET /api/hr/asset-assignments/export
// ═══════════════════════════════════════════════════════════════

const exportAssignments = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const { format = 'json', status, assetType, department, dateFrom, dateTo } = req.query;

    const query = firmId ? { firmId } : { lawyerId };

    if (status) query.status = status;
    if (assetType) query.assetType = assetType;
    if (department) query.department = department;

    if (dateFrom || dateTo) {
        query.assignedDate = {};
        if (dateFrom) query.assignedDate.$gte = new Date(dateFrom);
        if (dateTo) query.assignedDate.$lte = new Date(dateTo);
    }

    const assignments = await AssetAssignment.find(query)
        .populate('employeeId', 'employeeId personalInfo')
        .sort({ assignedDate: -1 });

    // Transform for export
    const exportData = assignments.map(a => ({
        assignmentNumber: a.assignmentNumber,
        assetTag: a.assetTag,
        assetName: a.assetName,
        assetType: a.assetType,
        assetCategory: a.assetCategory,
        brand: a.brand,
        model: a.model,
        serialNumber: a.serialNumber,
        employeeNumber: a.employeeNumber,
        employeeName: a.employeeName,
        department: a.department,
        status: a.status,
        assignedDate: a.assignedDate,
        expectedReturnDate: a.expectedReturnDate,
        actualReturnDate: a.returnProcess?.actualReturnDate,
        conditionAtAssignment: a.conditionAtAssignment,
        conditionAtReturn: a.returnProcess?.inspection?.conditionAtReturn,
        purchasePrice: a.purchasePrice,
        currentValue: a.currentValue,
        warrantyEndDate: a.warranty?.warrantyEndDate,
        insuranceEndDate: a.insurance?.policyEndDate,
        totalMaintenanceCost: a.totalMaintenanceCost,
        totalRepairCost: a.totalRepairCost
    }));

    if (format === 'csv') {
        const headers = Object.keys(exportData[0] || {}).join(',');
        const rows = exportData.map(row =>
            Object.values(row).map(v =>
                v === null || v === undefined ? '' :
                    typeof v === 'string' && v.includes(',') ? `"${v}"` :
                        v instanceof Date ? v.toISOString() : v
            ).join(',')
        );
        const csv = [headers, ...rows].join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=asset-assignments-export-${Date.now()}.csv`);
        return res.send(csv);
    }

    return res.json({
        success: true,
        data: exportData,
        total: exportData.length
    });
});

// ═══════════════════════════════════════════════════════════════
// GET POLICIES
// GET /api/hr/asset-assignments/policies
// ═══════════════════════════════════════════════════════════════

const getPolicies = asyncHandler(async (req, res) => {
    return res.json({
        success: true,
        policies: ASSET_POLICIES
    });
});

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

module.exports = {
    // CRUD
    getAssignments,
    getAssignment,
    createAssignment,
    updateAssignment,
    deleteAssignment,

    // Workflow
    acknowledgeAssignment,
    initiateReturn,
    completeReturn,
    updateStatus,
    transferAsset,
    issueClearance,

    // Maintenance & Repairs
    recordMaintenance,
    reportRepair,
    updateRepairStatus,

    // Incidents
    reportIncident,

    // Bulk Operations
    bulkDeleteAssignments,

    // Reports & Analytics
    getAssignmentStats,
    getAssignmentsByEmployee,
    getOverdueReturns,
    getMaintenanceDue,
    getWarrantyExpiring,
    exportAssignments,
    getPolicies
};
