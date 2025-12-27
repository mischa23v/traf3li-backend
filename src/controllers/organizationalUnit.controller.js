const OrganizationalUnit = require('../models/organizationalUnit.model');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');

// Helper function to escape regex special characters (ReDoS protection)
const escapeRegex = (str) => {
    if (!str || typeof str !== 'string') return '';
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

// ═══════════════════════════════════════════════════════════════
// GET ALL ORGANIZATIONAL UNITS
// ═══════════════════════════════════════════════════════════════

const getOrganizationalUnits = asyncHandler(async (req, res) => {
    const { firmId, lawyerId } = req;
    const {
        page = 1,
        limit = 20,
        status,
        unitType,
        parentUnitId,
        level,
        search,
        sort = '-createdOn'
    } = req.query;

    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }
    const query = { ...baseQuery };

    // Apply filters
    if (status) query.status = status;
    if (unitType) query.unitType = unitType;
    if (parentUnitId) query.parentUnitId = parentUnitId;
    if (parentUnitId === 'null' || parentUnitId === 'root') query.parentUnitId = null;
    if (level !== undefined) query.level = parseInt(level);

    // Search
    if (search) {
        const escapedSearch = escapeRegex(search);
        query.$or = [
            { unitId: { $regex: escapedSearch, $options: 'i' } },
            { unitCode: { $regex: escapedSearch, $options: 'i' } },
            { unitName: { $regex: escapedSearch, $options: 'i' } },
            { unitNameAr: { $regex: escapedSearch, $options: 'i' } },
            { 'costCenter.costCenterCode': { $regex: escapedSearch, $options: 'i' } }
        ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [units, total] = await Promise.all([
        OrganizationalUnit.find(query)
            .populate('parentUnitId', 'unitId unitCode unitName unitNameAr')
            .populate('managerId', 'firstName lastName email')
            .sort(sort)
            .skip(skip)
            .limit(parseInt(limit))
            .lean(),
        OrganizationalUnit.countDocuments(query)
    ]);

    res.status(200).json({
        success: true,
        data: units,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
        }
    });
});

// ═══════════════════════════════════════════════════════════════
// GET ORGANIZATIONAL UNIT STATISTICS
// ═══════════════════════════════════════════════════════════════

const getOrganizationalUnitStats = asyncHandler(async (req, res) => {
    const { firmId, lawyerId } = req;
    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }

    const [
        totalUnits,
        activeUnits,
        inactiveUnits,
        byType,
        byLevel,
        headcountStats
    ] = await Promise.all([
        OrganizationalUnit.countDocuments(baseQuery),
        OrganizationalUnit.countDocuments({ ...baseQuery, status: 'active' }),
        OrganizationalUnit.countDocuments({ ...baseQuery, status: 'inactive' }),
        OrganizationalUnit.aggregate([
            { $match: baseQuery },
            { $group: { _id: '$unitType', count: { $sum: 1 } } }
        ]),
        OrganizationalUnit.aggregate([
            { $match: baseQuery },
            { $group: { _id: '$level', count: { $sum: 1 } } },
            { $sort: { _id: 1 } }
        ]),
        OrganizationalUnit.aggregate([
            { $match: { ...baseQuery, status: 'active' } },
            {
                $group: {
                    _id: null,
                    totalApproved: { $sum: '$headcount.approvedHeadcount' },
                    totalCurrent: { $sum: '$headcount.currentHeadcount' },
                    totalVacancies: { $sum: '$headcount.vacancies' },
                    totalSaudi: { $sum: '$headcount.saudiCount' },
                    totalNonSaudi: { $sum: '$headcount.nonSaudiCount' }
                }
            }
        ])
    ]);

    const headcount = headcountStats[0] || {
        totalApproved: 0,
        totalCurrent: 0,
        totalVacancies: 0,
        totalSaudi: 0,
        totalNonSaudi: 0
    };

    res.status(200).json({
        success: true,
        data: {
            totalUnits,
            activeUnits,
            inactiveUnits,
            byType: byType.reduce((acc, item) => {
                acc[item._id] = item.count;
                return acc;
            }, {}),
            byLevel: byLevel.reduce((acc, item) => {
                acc[`level_${item._id}`] = item.count;
                return acc;
            }, {}),
            headcount: {
                ...headcount,
                overallSaudizationRate: headcount.totalCurrent > 0
                    ? Math.round((headcount.totalSaudi / headcount.totalCurrent) * 100)
                    : 0
            }
        }
    });
});

// ═══════════════════════════════════════════════════════════════
// GET ORGANIZATIONAL TREE
// ═══════════════════════════════════════════════════════════════

const getOrganizationalTree = asyncHandler(async (req, res) => {
    const { firmId, lawyerId } = req;

    const tree = await OrganizationalUnit.buildTree(firmId, lawyerId, null);

    res.status(200).json({
        success: true,
        data: tree
    });
});

// ═══════════════════════════════════════════════════════════════
// GET SINGLE ORGANIZATIONAL UNIT
// ═══════════════════════════════════════════════════════════════

const getOrganizationalUnit = asyncHandler(async (req, res) => {
    const { firmId, lawyerId } = req;
    const { id } = req.params;

    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }
    const unit = await OrganizationalUnit.findOne({ _id: id, ...baseQuery })
        .populate('parentUnitId', 'unitId unitCode unitName unitNameAr level')
        .populate('managerId', 'firstName lastName email')
        .populate('headOfUnit.employeeId', 'firstName lastName email employeeNumber')
        .populate('createdBy', 'firstName lastName email')
        .populate('updatedBy', 'firstName lastName email');

    if (!unit) {
        throw new CustomException('Organizational unit not found', 404);
    }

    res.status(200).json({
        success: true,
        data: unit
    });
});

// ═══════════════════════════════════════════════════════════════
// GET CHILD UNITS
// ═══════════════════════════════════════════════════════════════

const getChildUnits = asyncHandler(async (req, res) => {
    const { firmId, lawyerId } = req;
    const { id } = req.params;
    const { includeDescendants } = req.query;

    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }

    // Verify parent exists
    const parent = await OrganizationalUnit.findOne({ _id: id, ...baseQuery });
    if (!parent) {
        throw new CustomException('Organizational unit not found', 404);
    }

    let children;
    if (includeDescendants === 'true') {
        children = await OrganizationalUnit.getAllDescendants(id);
    } else {
        children = await OrganizationalUnit.find({ ...baseQuery, parentUnitId: id })
            .sort({ 'chartPosition.displayOrder': 1, unitName: 1 });
    }

    res.status(200).json({
        success: true,
        data: children,
        total: children.length
    });
});

// ═══════════════════════════════════════════════════════════════
// GET UNIT PATH (ANCESTORS)
// ═══════════════════════════════════════════════════════════════

const getUnitPath = asyncHandler(async (req, res) => {
    const { firmId, lawyerId } = req;
    const { id } = req.params;

    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }

    // Verify unit exists
    const unit = await OrganizationalUnit.findOne({ _id: id, ...baseQuery });
    if (!unit) {
        throw new CustomException('Organizational unit not found', 404);
    }

    const path = await OrganizationalUnit.getUnitPath(id);

    res.status(200).json({
        success: true,
        data: path
    });
});

// ═══════════════════════════════════════════════════════════════
// CREATE ORGANIZATIONAL UNIT
// ═══════════════════════════════════════════════════════════════

const createOrganizationalUnit = asyncHandler(async (req, res) => {
    const { firmId, lawyerId, userId } = req;

    // Input validation
    if (!req.body.unitName || !req.body.unitType) {
        throw new CustomException('Unit name and type are required', 400);
    }

    // Mass assignment protection - only allow specific fields
    const allowedFields = [
        'unitCode', 'unitName', 'unitNameAr', 'unitType', 'status',
        'description', 'descriptionAr', 'parentUnitId', 'managerId',
        'managerName', 'managerNameAr', 'establishmentDate', 'effectiveDate',
        'level', 'isActive', 'costCenter', 'headcount', 'budget',
        'location', 'headOfUnit', 'leadership', 'kpis', 'functions',
        'responsibilities', 'reportingLines', 'chartPosition',
        'compliance', 'notes', 'metadata'
    ];
    const unitData = pickAllowedFields(req.body, allowedFields);

    // Validate and verify parent unit ownership (IDOR protection)
    if (unitData.parentUnitId) {
        const sanitizedParentId = sanitizeObjectId(unitData.parentUnitId);
        if (!sanitizedParentId) {
            throw new CustomException('Invalid parent unit ID format', 400);
        }

        const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }
        const parent = await OrganizationalUnit.findOne({
            _id: sanitizedParentId,
            ...baseQuery
        });
        if (!parent) {
            throw new CustomException('Parent unit not found or access denied', 404);
        }
        unitData.parentUnitId = sanitizedParentId;
    }

    // Generate unit code if not provided
    if (!unitData.unitCode) {
        unitData.unitCode = await OrganizationalUnit.generateUnitCode(
            firmId,
            lawyerId,
            unitData.unitType
        );
    }

    const unit = new OrganizationalUnit({
        ...unitData,
        firmId,
        lawyerId,
        createdBy: userId
    });

    await unit.save();

    res.status(201).json({
        success: true,
        message: 'Organizational unit created successfully',
        data: unit
    });
});

// ═══════════════════════════════════════════════════════════════
// UPDATE ORGANIZATIONAL UNIT
// ═══════════════════════════════════════════════════════════════

const updateOrganizationalUnit = asyncHandler(async (req, res) => {
    const { firmId, lawyerId, userId } = req;
    const { id } = req.params;

    // Sanitize and validate ID
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw new CustomException('Invalid unit ID format', 400);
    }

    // IDOR protection - verify ownership
    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }
    const unit = await OrganizationalUnit.findOne({ _id: sanitizedId, ...baseQuery });

    if (!unit) {
        throw new CustomException('Organizational unit not found or access denied', 404);
    }

    // Mass assignment protection - only allow specific fields
    const allowedFields = [
        'unitCode', 'unitName', 'unitNameAr', 'unitType', 'status',
        'description', 'descriptionAr', 'parentUnitId', 'managerId',
        'managerName', 'managerNameAr', 'establishmentDate', 'effectiveDate',
        'endDate', 'endReason', 'level', 'isActive', 'costCenter',
        'headcount', 'budget', 'location', 'headOfUnit', 'leadership',
        'kpis', 'functions', 'responsibilities', 'reportingLines',
        'chartPosition', 'compliance', 'notes', 'metadata'
    ];
    const updateData = pickAllowedFields(req.body, allowedFields);

    // Validate and verify parent unit ownership (IDOR protection)
    if (updateData.parentUnitId) {
        const sanitizedParentId = sanitizeObjectId(updateData.parentUnitId);
        if (!sanitizedParentId) {
            throw new CustomException('Invalid parent unit ID format', 400);
        }

        if (sanitizedParentId === sanitizedId) {
            throw new CustomException('Cannot set unit as its own parent', 400);
        }

        // Verify parent exists and belongs to same firm/lawyer
        const parent = await OrganizationalUnit.findOne({
            _id: sanitizedParentId,
            ...baseQuery
        });
        if (!parent) {
            throw new CustomException('Parent unit not found or access denied', 404);
        }

        // Prevent setting descendant as parent
        const descendants = await OrganizationalUnit.getAllDescendants(sanitizedId);
        const descendantIds = descendants.map(d => d._id.toString());
        if (descendantIds.includes(sanitizedParentId)) {
            throw new CustomException('Cannot set a descendant as parent', 400);
        }

        updateData.parentUnitId = sanitizedParentId;
    }

    Object.assign(unit, updateData, { updatedBy: userId });
    await unit.save();

    res.status(200).json({
        success: true,
        message: 'Organizational unit updated successfully',
        data: unit
    });
});

// ═══════════════════════════════════════════════════════════════
// DELETE ORGANIZATIONAL UNIT
// ═══════════════════════════════════════════════════════════════

const deleteOrganizationalUnit = asyncHandler(async (req, res) => {
    const { firmId, lawyerId } = req;
    const { id } = req.params;
    const { force } = req.query;

    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }
    const unit = await OrganizationalUnit.findOne({ _id: id, ...baseQuery });

    if (!unit) {
        throw new CustomException('Organizational unit not found', 404);
    }

    // Check for children
    const childCount = await OrganizationalUnit.countDocuments({
        ...baseQuery,
        parentUnitId: id
    });

    if (childCount > 0 && force !== 'true') {
        throw new CustomException(
            `Cannot delete unit with ${childCount} child unit(s). Use force=true to delete anyway.`,
            400
        );
    }

    // If force delete, reassign children to parent's parent
    if (childCount > 0 && force === 'true') {
        await OrganizationalUnit.updateMany(
            { ...baseQuery, parentUnitId: id },
            { $set: { parentUnitId: unit.parentUnitId } }
        );
    }

    await unit.deleteOne();

    // Update parent's childUnitsCount
    if (unit.parentUnitId) {
        const remainingChildren = await OrganizationalUnit.countDocuments({
            ...baseQuery,
            parentUnitId: unit.parentUnitId
        });
        await OrganizationalUnit.findOneAndUpdate(
            { _id: unit.parentUnitId, ...req.firmQuery },
            {
                hasChildren: remainingChildren > 0,
                childUnitsCount: remainingChildren
            }
        );
    }

    res.status(200).json({
        success: true,
        message: 'Organizational unit deleted successfully'
    });
});

// ═══════════════════════════════════════════════════════════════
// BULK DELETE ORGANIZATIONAL UNITS
// ═══════════════════════════════════════════════════════════════

const bulkDeleteOrganizationalUnits = asyncHandler(async (req, res) => {
    const { firmId, lawyerId } = req;

    // Mass assignment protection
    const allowedFields = ['ids'];
    const deleteData = pickAllowedFields(req.body, allowedFields);
    const { ids } = deleteData;

    // Input validation
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        throw new CustomException('Please provide an array of unit IDs', 400);
    }

    if (ids.length > 100) {
        throw new CustomException('Cannot delete more than 100 units at once', 400);
    }

    // Sanitize all IDs
    const sanitizedIds = ids.map(id => sanitizeObjectId(id)).filter(Boolean);
    if (sanitizedIds.length !== ids.length) {
        throw new CustomException('One or more invalid unit ID formats', 400);
    }

    // IDOR protection - verify ownership
    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }

    // Verify all units belong to the firm/lawyer
    const units = await OrganizationalUnit.find({
        _id: { $in: sanitizedIds },
        ...baseQuery
    }).select('_id');

    if (units.length !== sanitizedIds.length) {
        throw new CustomException('One or more units not found or access denied', 404);
    }

    // Check for children in any of the units
    const unitsWithChildren = await OrganizationalUnit.find({
        ...baseQuery,
        parentUnitId: { $in: sanitizedIds }
    }).select('parentUnitId');

    if (unitsWithChildren.length > 0) {
        throw new CustomException(
            'Some units have children. Please delete or reassign children first.',
            400
        );
    }

    const result = await OrganizationalUnit.deleteMany({
        _id: { $in: sanitizedIds },
        ...baseQuery
    });

    res.status(200).json({
        success: true,
        message: `${result.deletedCount} organizational unit(s) deleted successfully`,
        deletedCount: result.deletedCount
    });
});

// ═══════════════════════════════════════════════════════════════
// MOVE ORGANIZATIONAL UNIT
// ═══════════════════════════════════════════════════════════════

const moveOrganizationalUnit = asyncHandler(async (req, res) => {
    const { firmId, lawyerId, userId } = req;
    const { id } = req.params;

    // Sanitize and validate ID
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw new CustomException('Invalid unit ID format', 400);
    }

    // Mass assignment protection
    const allowedFields = ['newParentId'];
    const moveData = pickAllowedFields(req.body, allowedFields);
    const { newParentId } = moveData;

    // IDOR protection - verify ownership
    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }
    const unit = await OrganizationalUnit.findOne({ _id: sanitizedId, ...baseQuery });

    if (!unit) {
        throw new CustomException('Organizational unit not found or access denied', 404);
    }

    // Validate new parent
    let sanitizedNewParentId = null;
    if (newParentId) {
        sanitizedNewParentId = sanitizeObjectId(newParentId);
        if (!sanitizedNewParentId) {
            throw new CustomException('Invalid new parent ID format', 400);
        }

        if (sanitizedNewParentId === sanitizedId) {
            throw new CustomException('Cannot move unit to itself', 400);
        }

        // IDOR protection - verify new parent belongs to same firm/lawyer
        const newParent = await OrganizationalUnit.findOne({
            _id: sanitizedNewParentId,
            ...baseQuery
        });
        if (!newParent) {
            throw new CustomException('New parent unit not found or access denied', 404);
        }

        // Check not moving to descendant
        const descendants = await OrganizationalUnit.getAllDescendants(sanitizedId);
        const descendantIds = descendants.map(d => d._id.toString());
        if (descendantIds.includes(sanitizedNewParentId)) {
            throw new CustomException('Cannot move unit to its descendant', 400);
        }
    }

    const oldParentId = unit.parentUnitId;
    unit.parentUnitId = sanitizedNewParentId || null;
    unit.updatedBy = userId;
    await unit.save();

    // Update old parent's childUnitsCount
    if (oldParentId) {
        const oldParentChildren = await OrganizationalUnit.countDocuments({
            ...baseQuery,
            parentUnitId: oldParentId
        });
        await OrganizationalUnit.findOneAndUpdate(
            { _id: oldParentId, ...req.firmQuery },
            {
                hasChildren: oldParentChildren > 0,
                childUnitsCount: oldParentChildren
            }
        );
    }

    // Update new parent's childUnitsCount
    if (sanitizedNewParentId) {
        const newParentChildren = await OrganizationalUnit.countDocuments({
            ...baseQuery,
            parentUnitId: sanitizedNewParentId
        });
        await OrganizationalUnit.findOneAndUpdate(
            { _id: sanitizedNewParentId, ...req.firmQuery },
            {
                hasChildren: true,
                childUnitsCount: newParentChildren
            }
        );
    }

    // Recalculate paths for all descendants
    const descendants = await OrganizationalUnit.getAllDescendants(sanitizedId);
    for (const descendant of descendants) {
        await descendant.save(); // Triggers pre-save hook to recalculate path/level
    }

    res.status(200).json({
        success: true,
        message: 'Organizational unit moved successfully',
        data: unit
    });
});

// ═══════════════════════════════════════════════════════════════
// DISSOLVE ORGANIZATIONAL UNIT
// ═══════════════════════════════════════════════════════════════

const dissolveOrganizationalUnit = asyncHandler(async (req, res) => {
    const { firmId, lawyerId, userId } = req;
    const { id } = req.params;

    // Sanitize and validate ID
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw new CustomException('Invalid unit ID format', 400);
    }

    // Mass assignment protection
    const allowedFields = ['successorUnitId', 'reason', 'reassignChildrenTo'];
    const dissolveData = pickAllowedFields(req.body, allowedFields);
    const { successorUnitId, reason, reassignChildrenTo } = dissolveData;

    // IDOR protection - verify ownership
    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }
    const unit = await OrganizationalUnit.findOne({ _id: sanitizedId, ...baseQuery });

    if (!unit) {
        throw new CustomException('Organizational unit not found or access denied', 404);
    }

    // Validate and verify successor if provided (IDOR protection)
    if (successorUnitId) {
        const sanitizedSuccessorId = sanitizeObjectId(successorUnitId);
        if (!sanitizedSuccessorId) {
            throw new CustomException('Invalid successor unit ID format', 400);
        }

        const successor = await OrganizationalUnit.findOne({
            _id: sanitizedSuccessorId,
            ...baseQuery
        });
        if (!successor) {
            throw new CustomException('Successor unit not found or access denied', 404);
        }
        unit.successorUnitId = sanitizedSuccessorId;
        unit.successorUnitName = successor.unitName;
    }

    // Validate and verify reassign target if specified (IDOR protection)
    if (reassignChildrenTo) {
        const sanitizedTargetId = sanitizeObjectId(reassignChildrenTo);
        if (!sanitizedTargetId) {
            throw new CustomException('Invalid target parent ID format', 400);
        }

        const targetParent = await OrganizationalUnit.findOne({
            _id: sanitizedTargetId,
            ...baseQuery
        });
        if (!targetParent) {
            throw new CustomException('Target parent unit not found or access denied', 404);
        }

        await OrganizationalUnit.updateMany(
            { ...baseQuery, parentUnitId: sanitizedId },
            { $set: { parentUnitId: sanitizedTargetId } }
        );
    }

    unit.status = 'dissolved';
    unit.statusEffectiveDate = new Date();
    unit.endDate = new Date();
    unit.endReason = reason || 'dissolution';
    unit.updatedBy = userId;
    await unit.save();

    res.status(200).json({
        success: true,
        message: 'Organizational unit dissolved successfully',
        data: unit
    });
});

// ═══════════════════════════════════════════════════════════════
// ACTIVATE ORGANIZATIONAL UNIT
// ═══════════════════════════════════════════════════════════════

const activateOrganizationalUnit = asyncHandler(async (req, res) => {
    const { firmId, lawyerId, userId } = req;
    const { id } = req.params;

    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }
    const unit = await OrganizationalUnit.findOne({ _id: id, ...baseQuery });

    if (!unit) {
        throw new CustomException('Organizational unit not found', 404);
    }

    if (unit.status === 'active') {
        throw new CustomException('Unit is already active', 400);
    }

    unit.status = 'active';
    unit.statusEffectiveDate = new Date();
    unit.updatedBy = userId;
    await unit.save();

    res.status(200).json({
        success: true,
        message: 'Organizational unit activated successfully',
        data: unit
    });
});

// ═══════════════════════════════════════════════════════════════
// DEACTIVATE ORGANIZATIONAL UNIT
// ═══════════════════════════════════════════════════════════════

const deactivateOrganizationalUnit = asyncHandler(async (req, res) => {
    const { firmId, lawyerId, userId } = req;
    const { id } = req.params;

    // Sanitize and validate ID
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw new CustomException('Invalid unit ID format', 400);
    }

    // Mass assignment protection
    const allowedFields = ['reason'];
    const deactivateData = pickAllowedFields(req.body, allowedFields);
    const { reason } = deactivateData;

    // IDOR protection - verify ownership
    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }
    const unit = await OrganizationalUnit.findOne({ _id: sanitizedId, ...baseQuery });

    if (!unit) {
        throw new CustomException('Organizational unit not found or access denied', 404);
    }

    if (unit.status === 'inactive') {
        throw new CustomException('Unit is already inactive', 400);
    }

    // Check for active children
    const activeChildren = await OrganizationalUnit.countDocuments({
        ...baseQuery,
        parentUnitId: sanitizedId,
        status: 'active'
    });

    if (activeChildren > 0) {
        throw new CustomException(
            `Cannot deactivate unit with ${activeChildren} active child unit(s)`,
            400
        );
    }

    unit.status = 'inactive';
    unit.statusEffectiveDate = new Date();
    if (reason) {
        unit.notes = {
            ...unit.notes,
            managementNotes: `${unit.notes?.managementNotes || ''}\n[${new Date().toISOString()}] Deactivated: ${reason}`
        };
    }
    unit.updatedBy = userId;
    await unit.save();

    res.status(200).json({
        success: true,
        message: 'Organizational unit deactivated successfully',
        data: unit
    });
});

// ═══════════════════════════════════════════════════════════════
// UPDATE HEADCOUNT
// ═══════════════════════════════════════════════════════════════

const updateHeadcount = asyncHandler(async (req, res) => {
    const { firmId, lawyerId, userId } = req;
    const { id } = req.params;

    // Sanitize and validate ID
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw new CustomException('Invalid unit ID format', 400);
    }

    // Mass assignment protection - only allow headcount-related fields
    const allowedFields = [
        'approvedHeadcount', 'currentHeadcount', 'vacancies',
        'saudiCount', 'nonSaudiCount', 'saudizationRate',
        'maleCount', 'femaleCount', 'contractorCount',
        'temporaryCount', 'plannedHires', 'forecastedAttrition'
    ];
    const headcountData = pickAllowedFields(req.body, allowedFields);

    // Input validation - ensure numeric values are valid
    for (const [key, value] of Object.entries(headcountData)) {
        if (value !== null && value !== undefined) {
            const numValue = Number(value);
            if (isNaN(numValue) || numValue < 0) {
                throw new CustomException(`Invalid value for ${key}: must be a non-negative number`, 400);
            }
        }
    }

    // IDOR protection - verify ownership
    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }
    const unit = await OrganizationalUnit.findOne({ _id: sanitizedId, ...baseQuery });

    if (!unit) {
        throw new CustomException('Organizational unit not found or access denied', 404);
    }

    unit.headcount = {
        ...unit.headcount?.toObject?.() || {},
        ...headcountData
    };
    unit.updatedBy = userId;
    await unit.save();

    res.status(200).json({
        success: true,
        message: 'Headcount updated successfully',
        data: unit.headcount
    });
});

// ═══════════════════════════════════════════════════════════════
// UPDATE BUDGET
// ═══════════════════════════════════════════════════════════════

const updateBudget = asyncHandler(async (req, res) => {
    const { firmId, lawyerId, userId } = req;
    const { id } = req.params;

    // Sanitize and validate ID
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw new CustomException('Invalid unit ID format', 400);
    }

    // Mass assignment protection - only allow budget-related fields
    const allowedFields = [
        'annualBudget', 'allocatedBudget', 'spentBudget', 'remainingBudget',
        'currency', 'fiscalYear', 'budgetPeriod', 'approvalStatus',
        'approvedBy', 'approvedDate', 'notes'
    ];
    const budgetData = pickAllowedFields(req.body, allowedFields);

    // Input validation - ensure numeric values are valid
    const numericFields = ['annualBudget', 'allocatedBudget', 'spentBudget', 'remainingBudget'];
    for (const field of numericFields) {
        if (budgetData[field] !== null && budgetData[field] !== undefined) {
            const numValue = Number(budgetData[field]);
            if (isNaN(numValue) || numValue < 0) {
                throw new CustomException(`Invalid value for ${field}: must be a non-negative number`, 400);
            }
        }
    }

    // IDOR protection - verify ownership
    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }
    const unit = await OrganizationalUnit.findOne({ _id: sanitizedId, ...baseQuery });

    if (!unit) {
        throw new CustomException('Organizational unit not found or access denied', 404);
    }

    unit.budget = {
        ...unit.budget?.toObject?.() || {},
        ...budgetData,
        hasBudget: true
    };
    unit.updatedBy = userId;
    await unit.save();

    res.status(200).json({
        success: true,
        message: 'Budget updated successfully',
        data: unit.budget
    });
});

// ═══════════════════════════════════════════════════════════════
// ADD KPI
// ═══════════════════════════════════════════════════════════════

const addKPI = asyncHandler(async (req, res) => {
    const { firmId, lawyerId, userId } = req;
    const { id } = req.params;

    // Sanitize and validate ID
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw new CustomException('Invalid unit ID format', 400);
    }

    // Input validation
    if (!req.body.kpiName || !req.body.measurementUnit) {
        throw new CustomException('KPI name and measurement unit are required', 400);
    }

    // Mass assignment protection - only allow KPI-related fields
    const allowedFields = [
        'kpiName', 'kpiNameAr', 'description', 'category', 'measurementUnit',
        'targetValue', 'actualValue', 'threshold', 'weight', 'frequency',
        'dataSource', 'calculationMethod', 'achievementRate', 'status', 'notes'
    ];
    const kpiData = pickAllowedFields(req.body, allowedFields);

    // Validate numeric fields
    const numericFields = ['targetValue', 'actualValue', 'threshold', 'weight', 'achievementRate'];
    for (const field of numericFields) {
        if (kpiData[field] !== null && kpiData[field] !== undefined) {
            const numValue = Number(kpiData[field]);
            if (isNaN(numValue)) {
                throw new CustomException(`Invalid value for ${field}: must be a number`, 400);
            }
        }
    }

    // IDOR protection - verify ownership
    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }
    const unit = await OrganizationalUnit.findOne({ _id: sanitizedId, ...baseQuery });

    if (!unit) {
        throw new CustomException('Organizational unit not found or access denied', 404);
    }

    // Generate KPI ID
    const kpiId = `KPI-${unit.unitCode}-${(unit.kpis?.length || 0) + 1}`;

    unit.kpis = unit.kpis || [];
    unit.kpis.push({
        kpiId,
        ...kpiData,
        lastUpdated: new Date()
    });
    unit.updatedBy = userId;
    await unit.save();

    res.status(201).json({
        success: true,
        message: 'KPI added successfully',
        data: unit.kpis[unit.kpis.length - 1]
    });
});

// ═══════════════════════════════════════════════════════════════
// UPDATE KPI
// ═══════════════════════════════════════════════════════════════

const updateKPI = asyncHandler(async (req, res) => {
    const { firmId, lawyerId, userId } = req;
    const { id, kpiId } = req.params;

    // Sanitize and validate IDs
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw new CustomException('Invalid unit ID format', 400);
    }

    const sanitizedKpiId = sanitizeObjectId(kpiId);
    if (!sanitizedKpiId && !kpiId) {
        throw new CustomException('Invalid KPI ID format', 400);
    }

    // Mass assignment protection - only allow KPI-related fields
    const allowedFields = [
        'kpiName', 'kpiNameAr', 'description', 'category', 'measurementUnit',
        'targetValue', 'actualValue', 'threshold', 'weight', 'frequency',
        'dataSource', 'calculationMethod', 'achievementRate', 'status', 'notes'
    ];
    const kpiData = pickAllowedFields(req.body, allowedFields);

    // Validate numeric fields
    const numericFields = ['targetValue', 'actualValue', 'threshold', 'weight', 'achievementRate'];
    for (const field of numericFields) {
        if (kpiData[field] !== null && kpiData[field] !== undefined) {
            const numValue = Number(kpiData[field]);
            if (isNaN(numValue)) {
                throw new CustomException(`Invalid value for ${field}: must be a number`, 400);
            }
        }
    }

    // IDOR protection - verify ownership
    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }
    const unit = await OrganizationalUnit.findOne({ _id: sanitizedId, ...baseQuery });

    if (!unit) {
        throw new CustomException('Organizational unit not found or access denied', 404);
    }

    const kpiIndex = unit.kpis?.findIndex(k => k.kpiId === kpiId || k._id.toString() === kpiId);
    if (kpiIndex === -1 || kpiIndex === undefined) {
        throw new CustomException('KPI not found', 404);
    }

    // Calculate achievement rate
    if (kpiData.actualValue !== undefined && unit.kpis[kpiIndex].targetValue > 0) {
        kpiData.achievementRate = Math.round(
            (kpiData.actualValue / unit.kpis[kpiIndex].targetValue) * 100
        );
    }

    unit.kpis[kpiIndex] = {
        ...unit.kpis[kpiIndex].toObject?.() || unit.kpis[kpiIndex],
        ...kpiData,
        lastUpdated: new Date()
    };
    unit.updatedBy = userId;
    await unit.save();

    res.status(200).json({
        success: true,
        message: 'KPI updated successfully',
        data: unit.kpis[kpiIndex]
    });
});

// ═══════════════════════════════════════════════════════════════
// DELETE KPI
// ═══════════════════════════════════════════════════════════════

const deleteKPI = asyncHandler(async (req, res) => {
    const { firmId, lawyerId, userId } = req;
    const { id, kpiId } = req.params;

    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }
    const unit = await OrganizationalUnit.findOne({ _id: id, ...baseQuery });

    if (!unit) {
        throw new CustomException('Organizational unit not found', 404);
    }

    const kpiIndex = unit.kpis?.findIndex(k => k.kpiId === kpiId || k._id.toString() === kpiId);
    if (kpiIndex === -1 || kpiIndex === undefined) {
        throw new CustomException('KPI not found', 404);
    }

    unit.kpis.splice(kpiIndex, 1);
    unit.updatedBy = userId;
    await unit.save();

    res.status(200).json({
        success: true,
        message: 'KPI deleted successfully'
    });
});

// ═══════════════════════════════════════════════════════════════
// ADD LEADERSHIP POSITION
// ═══════════════════════════════════════════════════════════════

const addLeadershipPosition = asyncHandler(async (req, res) => {
    const { firmId, lawyerId, userId } = req;
    const { id } = req.params;

    // Sanitize and validate ID
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw new CustomException('Invalid unit ID format', 400);
    }

    // Input validation
    if (!req.body.positionTitle || !req.body.employeeId) {
        throw new CustomException('Position title and employee ID are required', 400);
    }

    // Mass assignment protection - only allow leadership-related fields
    const allowedFields = [
        'positionTitle', 'positionTitleAr', 'employeeId', 'employeeName',
        'employeeNameAr', 'startDate', 'endDate', 'isPrimary', 'isActing',
        'responsibilities', 'authorityLevel', 'reportingTo', 'status', 'notes'
    ];
    const leadershipData = pickAllowedFields(req.body, allowedFields);

    // Validate employee ID format
    if (leadershipData.employeeId) {
        const sanitizedEmployeeId = sanitizeObjectId(leadershipData.employeeId);
        if (!sanitizedEmployeeId) {
            throw new CustomException('Invalid employee ID format', 400);
        }
        leadershipData.employeeId = sanitizedEmployeeId;
    }

    // IDOR protection - verify ownership
    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }
    const unit = await OrganizationalUnit.findOne({ _id: sanitizedId, ...baseQuery });

    if (!unit) {
        throw new CustomException('Organizational unit not found or access denied', 404);
    }

    // Generate position ID
    const positionId = `LP-${unit.unitCode}-${(unit.leadership?.length || 0) + 1}`;

    // If this is the primary position, unset existing primary
    if (leadershipData.isPrimary) {
        unit.leadership?.forEach(pos => {
            pos.isPrimary = false;
        });
    }

    unit.leadership = unit.leadership || [];
    unit.leadership.push({
        positionId,
        ...leadershipData
    });
    unit.updatedBy = userId;
    await unit.save();

    res.status(201).json({
        success: true,
        message: 'Leadership position added successfully',
        data: unit.leadership[unit.leadership.length - 1]
    });
});

// ═══════════════════════════════════════════════════════════════
// UPDATE LEADERSHIP POSITION
// ═══════════════════════════════════════════════════════════════

const updateLeadershipPosition = asyncHandler(async (req, res) => {
    const { firmId, lawyerId, userId } = req;
    const { id, positionId } = req.params;

    // Sanitize and validate IDs
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw new CustomException('Invalid unit ID format', 400);
    }

    const sanitizedPositionId = sanitizeObjectId(positionId);
    if (!sanitizedPositionId && !positionId) {
        throw new CustomException('Invalid position ID format', 400);
    }

    // Mass assignment protection - only allow leadership-related fields
    const allowedFields = [
        'positionTitle', 'positionTitleAr', 'employeeId', 'employeeName',
        'employeeNameAr', 'startDate', 'endDate', 'isPrimary', 'isActing',
        'responsibilities', 'authorityLevel', 'reportingTo', 'status', 'notes'
    ];
    const leadershipData = pickAllowedFields(req.body, allowedFields);

    // Validate employee ID format if provided
    if (leadershipData.employeeId) {
        const sanitizedEmployeeId = sanitizeObjectId(leadershipData.employeeId);
        if (!sanitizedEmployeeId) {
            throw new CustomException('Invalid employee ID format', 400);
        }
        leadershipData.employeeId = sanitizedEmployeeId;
    }

    // IDOR protection - verify ownership
    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }
    const unit = await OrganizationalUnit.findOne({ _id: sanitizedId, ...baseQuery });

    if (!unit) {
        throw new CustomException('Organizational unit not found or access denied', 404);
    }

    const posIndex = unit.leadership?.findIndex(
        p => p.positionId === positionId || p._id.toString() === positionId
    );
    if (posIndex === -1 || posIndex === undefined) {
        throw new CustomException('Leadership position not found', 404);
    }

    // If setting as primary, unset existing primary
    if (leadershipData.isPrimary) {
        unit.leadership.forEach((pos, idx) => {
            if (idx !== posIndex) pos.isPrimary = false;
        });
    }

    unit.leadership[posIndex] = {
        ...unit.leadership[posIndex].toObject?.() || unit.leadership[posIndex],
        ...leadershipData
    };
    unit.updatedBy = userId;
    await unit.save();

    res.status(200).json({
        success: true,
        message: 'Leadership position updated successfully',
        data: unit.leadership[posIndex]
    });
});

// ═══════════════════════════════════════════════════════════════
// DELETE LEADERSHIP POSITION
// ═══════════════════════════════════════════════════════════════

const deleteLeadershipPosition = asyncHandler(async (req, res) => {
    const { firmId, lawyerId, userId } = req;
    const { id, positionId } = req.params;

    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }
    const unit = await OrganizationalUnit.findOne({ _id: id, ...baseQuery });

    if (!unit) {
        throw new CustomException('Organizational unit not found', 404);
    }

    const posIndex = unit.leadership?.findIndex(
        p => p.positionId === positionId || p._id.toString() === positionId
    );
    if (posIndex === -1 || posIndex === undefined) {
        throw new CustomException('Leadership position not found', 404);
    }

    unit.leadership.splice(posIndex, 1);
    unit.updatedBy = userId;
    await unit.save();

    res.status(200).json({
        success: true,
        message: 'Leadership position deleted successfully'
    });
});

// ═══════════════════════════════════════════════════════════════
// ADD DOCUMENT
// ═══════════════════════════════════════════════════════════════

const addDocument = asyncHandler(async (req, res) => {
    const { firmId, lawyerId, userId } = req;
    const { id } = req.params;

    // Sanitize and validate ID
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw new CustomException('Invalid unit ID format', 400);
    }

    // Input validation
    if (!req.body.documentName || !req.body.documentUrl) {
        throw new CustomException('Document name and URL are required', 400);
    }

    // Mass assignment protection - only allow document-related fields
    const allowedFields = [
        'documentName', 'documentType', 'documentUrl', 'fileSize',
        'mimeType', 'description', 'category', 'isConfidential',
        'accessLevel', 'expiryDate', 'tags', 'version'
    ];
    const documentData = pickAllowedFields(req.body, allowedFields);

    // IDOR protection - verify ownership
    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }
    const unit = await OrganizationalUnit.findOne({ _id: sanitizedId, ...baseQuery });

    if (!unit) {
        throw new CustomException('Organizational unit not found or access denied', 404);
    }

    unit.documents = unit.documents || [];
    unit.documents.push({
        ...documentData,
        uploadedOn: new Date(),
        uploadedBy: userId
    });
    unit.updatedBy = userId;
    await unit.save();

    res.status(201).json({
        success: true,
        message: 'Document added successfully',
        data: unit.documents[unit.documents.length - 1]
    });
});

// ═══════════════════════════════════════════════════════════════
// EXPORT ORGANIZATIONAL UNITS
// ═══════════════════════════════════════════════════════════════

const exportOrganizationalUnits = asyncHandler(async (req, res) => {
    const { firmId, lawyerId } = req;
    const { format = 'json', status } = req.query;

    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }
    const query = { ...baseQuery };

    if (status) query.status = status;

    const units = await OrganizationalUnit.find(query)
        .populate('parentUnitId', 'unitId unitCode unitName')
        .sort({ level: 1, unitName: 1 })
        .lean();

    if (format === 'csv') {
        // SECURITY: Import sanitization function to prevent CSV injection
        const { sanitizeForCSV } = require('../utils/securityUtils');

        const csvHeader = [
            'Unit ID',
            'Unit Code',
            'Unit Name',
            'Unit Name (Arabic)',
            'Unit Type',
            'Status',
            'Level',
            'Parent Unit',
            'Manager Name',
            'Approved Headcount',
            'Current Headcount',
            'Vacancies',
            'Saudization Rate',
            'Annual Budget',
            'Cost Center Code'
        ].join(',');

        const csvRows = units.map(unit => [
            sanitizeForCSV(unit.unitId),
            sanitizeForCSV(unit.unitCode),
            `"${sanitizeForCSV(unit.unitName || '')}"`,
            `"${sanitizeForCSV(unit.unitNameAr || '')}"`,
            sanitizeForCSV(unit.unitType),
            sanitizeForCSV(unit.status),
            sanitizeForCSV(unit.level),
            sanitizeForCSV(unit.parentUnitId?.unitName || ''),
            `"${sanitizeForCSV(unit.managerName || '')}"`,
            sanitizeForCSV(unit.headcount?.approvedHeadcount || 0),
            sanitizeForCSV(unit.headcount?.currentHeadcount || 0),
            sanitizeForCSV(unit.headcount?.vacancies || 0),
            sanitizeForCSV(unit.headcount?.saudizationRate || 0),
            sanitizeForCSV(unit.budget?.annualBudget || 0),
            sanitizeForCSV(unit.costCenter?.costCenterCode || '')
        ].join(','));

        const csv = [csvHeader, ...csvRows].join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=organizational-units.csv');
        return res.send(csv);
    }

    res.status(200).json({
        success: true,
        data: units,
        total: units.length,
        exportedAt: new Date().toISOString()
    });
});

module.exports = {
    getOrganizationalUnits,
    getOrganizationalUnitStats,
    getOrganizationalTree,
    getOrganizationalUnit,
    getChildUnits,
    getUnitPath,
    createOrganizationalUnit,
    updateOrganizationalUnit,
    deleteOrganizationalUnit,
    bulkDeleteOrganizationalUnits,
    moveOrganizationalUnit,
    dissolveOrganizationalUnit,
    activateOrganizationalUnit,
    deactivateOrganizationalUnit,
    updateHeadcount,
    updateBudget,
    addKPI,
    updateKPI,
    deleteKPI,
    addLeadershipPosition,
    updateLeadershipPosition,
    deleteLeadershipPosition,
    addDocument,
    exportOrganizationalUnits
};
