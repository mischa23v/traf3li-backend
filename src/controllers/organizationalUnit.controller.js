const OrganizationalUnit = require('../models/organizationalUnit.model');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../exceptions/customException');

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

    const baseQuery = firmId ? { firmId } : { lawyerId };
    const query = { ...baseQuery };

    // Apply filters
    if (status) query.status = status;
    if (unitType) query.unitType = unitType;
    if (parentUnitId) query.parentUnitId = parentUnitId;
    if (parentUnitId === 'null' || parentUnitId === 'root') query.parentUnitId = null;
    if (level !== undefined) query.level = parseInt(level);

    // Search
    if (search) {
        query.$or = [
            { unitId: { $regex: search, $options: 'i' } },
            { unitCode: { $regex: search, $options: 'i' } },
            { unitName: { $regex: search, $options: 'i' } },
            { unitNameAr: { $regex: search, $options: 'i' } },
            { 'costCenter.costCenterCode': { $regex: search, $options: 'i' } }
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
    const baseQuery = firmId ? { firmId } : { lawyerId };

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

    const baseQuery = firmId ? { firmId } : { lawyerId };
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

    const baseQuery = firmId ? { firmId } : { lawyerId };

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

    const baseQuery = firmId ? { firmId } : { lawyerId };

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

    // Validate parent if provided
    if (req.body.parentUnitId) {
        const baseQuery = firmId ? { firmId } : { lawyerId };
        const parent = await OrganizationalUnit.findOne({
            _id: req.body.parentUnitId,
            ...baseQuery
        });
        if (!parent) {
            throw new CustomException('Parent unit not found', 404);
        }
    }

    // Generate unit code if not provided
    if (!req.body.unitCode) {
        req.body.unitCode = await OrganizationalUnit.generateUnitCode(
            firmId,
            lawyerId,
            req.body.unitType
        );
    }

    const unit = new OrganizationalUnit({
        ...req.body,
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

    const baseQuery = firmId ? { firmId } : { lawyerId };
    const unit = await OrganizationalUnit.findOne({ _id: id, ...baseQuery });

    if (!unit) {
        throw new CustomException('Organizational unit not found', 404);
    }

    // Prevent changing parentUnitId to self or descendants
    if (req.body.parentUnitId) {
        if (req.body.parentUnitId.toString() === id) {
            throw new CustomException('Cannot set unit as its own parent', 400);
        }
        const descendants = await OrganizationalUnit.getAllDescendants(id);
        const descendantIds = descendants.map(d => d._id.toString());
        if (descendantIds.includes(req.body.parentUnitId.toString())) {
            throw new CustomException('Cannot set a descendant as parent', 400);
        }
    }

    // Remove immutable fields from update
    const { firmId: _, lawyerId: __, unitId, createdBy, ...updateData } = req.body;

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

    const baseQuery = firmId ? { firmId } : { lawyerId };
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
        await OrganizationalUnit.findByIdAndUpdate(unit.parentUnitId, {
            hasChildren: remainingChildren > 0,
            childUnitsCount: remainingChildren
        });
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
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        throw new CustomException('Please provide an array of unit IDs', 400);
    }

    const baseQuery = firmId ? { firmId } : { lawyerId };

    // Check for children in any of the units
    const unitsWithChildren = await OrganizationalUnit.find({
        ...baseQuery,
        parentUnitId: { $in: ids }
    }).select('parentUnitId');

    if (unitsWithChildren.length > 0) {
        throw new CustomException(
            'Some units have children. Please delete or reassign children first.',
            400
        );
    }

    const result = await OrganizationalUnit.deleteMany({
        _id: { $in: ids },
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
    const { newParentId } = req.body;

    const baseQuery = firmId ? { firmId } : { lawyerId };
    const unit = await OrganizationalUnit.findOne({ _id: id, ...baseQuery });

    if (!unit) {
        throw new CustomException('Organizational unit not found', 404);
    }

    // Validate new parent
    if (newParentId) {
        if (newParentId === id) {
            throw new CustomException('Cannot move unit to itself', 400);
        }

        const newParent = await OrganizationalUnit.findOne({
            _id: newParentId,
            ...baseQuery
        });
        if (!newParent) {
            throw new CustomException('New parent unit not found', 404);
        }

        // Check not moving to descendant
        const descendants = await OrganizationalUnit.getAllDescendants(id);
        const descendantIds = descendants.map(d => d._id.toString());
        if (descendantIds.includes(newParentId.toString())) {
            throw new CustomException('Cannot move unit to its descendant', 400);
        }
    }

    const oldParentId = unit.parentUnitId;
    unit.parentUnitId = newParentId || null;
    unit.updatedBy = userId;
    await unit.save();

    // Update old parent's childUnitsCount
    if (oldParentId) {
        const oldParentChildren = await OrganizationalUnit.countDocuments({
            ...baseQuery,
            parentUnitId: oldParentId
        });
        await OrganizationalUnit.findByIdAndUpdate(oldParentId, {
            hasChildren: oldParentChildren > 0,
            childUnitsCount: oldParentChildren
        });
    }

    // Update new parent's childUnitsCount
    if (newParentId) {
        const newParentChildren = await OrganizationalUnit.countDocuments({
            ...baseQuery,
            parentUnitId: newParentId
        });
        await OrganizationalUnit.findByIdAndUpdate(newParentId, {
            hasChildren: true,
            childUnitsCount: newParentChildren
        });
    }

    // Recalculate paths for all descendants
    const descendants = await OrganizationalUnit.getAllDescendants(id);
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
    const { successorUnitId, reason, reassignChildrenTo } = req.body;

    const baseQuery = firmId ? { firmId } : { lawyerId };
    const unit = await OrganizationalUnit.findOne({ _id: id, ...baseQuery });

    if (!unit) {
        throw new CustomException('Organizational unit not found', 404);
    }

    // Validate successor if provided
    if (successorUnitId) {
        const successor = await OrganizationalUnit.findOne({
            _id: successorUnitId,
            ...baseQuery
        });
        if (!successor) {
            throw new CustomException('Successor unit not found', 404);
        }
        unit.successorUnitId = successorUnitId;
        unit.successorUnitName = successor.unitName;
    }

    // Reassign children if specified
    if (reassignChildrenTo) {
        const targetParent = await OrganizationalUnit.findOne({
            _id: reassignChildrenTo,
            ...baseQuery
        });
        if (!targetParent) {
            throw new CustomException('Target parent unit not found', 404);
        }

        await OrganizationalUnit.updateMany(
            { ...baseQuery, parentUnitId: id },
            { $set: { parentUnitId: reassignChildrenTo } }
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

    const baseQuery = firmId ? { firmId } : { lawyerId };
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
    const { reason } = req.body;

    const baseQuery = firmId ? { firmId } : { lawyerId };
    const unit = await OrganizationalUnit.findOne({ _id: id, ...baseQuery });

    if (!unit) {
        throw new CustomException('Organizational unit not found', 404);
    }

    if (unit.status === 'inactive') {
        throw new CustomException('Unit is already inactive', 400);
    }

    // Check for active children
    const activeChildren = await OrganizationalUnit.countDocuments({
        ...baseQuery,
        parentUnitId: id,
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
    const headcountData = req.body;

    const baseQuery = firmId ? { firmId } : { lawyerId };
    const unit = await OrganizationalUnit.findOne({ _id: id, ...baseQuery });

    if (!unit) {
        throw new CustomException('Organizational unit not found', 404);
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
    const budgetData = req.body;

    const baseQuery = firmId ? { firmId } : { lawyerId };
    const unit = await OrganizationalUnit.findOne({ _id: id, ...baseQuery });

    if (!unit) {
        throw new CustomException('Organizational unit not found', 404);
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
    const kpiData = req.body;

    const baseQuery = firmId ? { firmId } : { lawyerId };
    const unit = await OrganizationalUnit.findOne({ _id: id, ...baseQuery });

    if (!unit) {
        throw new CustomException('Organizational unit not found', 404);
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
    const kpiData = req.body;

    const baseQuery = firmId ? { firmId } : { lawyerId };
    const unit = await OrganizationalUnit.findOne({ _id: id, ...baseQuery });

    if (!unit) {
        throw new CustomException('Organizational unit not found', 404);
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

    const baseQuery = firmId ? { firmId } : { lawyerId };
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
    const leadershipData = req.body;

    const baseQuery = firmId ? { firmId } : { lawyerId };
    const unit = await OrganizationalUnit.findOne({ _id: id, ...baseQuery });

    if (!unit) {
        throw new CustomException('Organizational unit not found', 404);
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
    const leadershipData = req.body;

    const baseQuery = firmId ? { firmId } : { lawyerId };
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

    const baseQuery = firmId ? { firmId } : { lawyerId };
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
    const documentData = req.body;

    const baseQuery = firmId ? { firmId } : { lawyerId };
    const unit = await OrganizationalUnit.findOne({ _id: id, ...baseQuery });

    if (!unit) {
        throw new CustomException('Organizational unit not found', 404);
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

    const baseQuery = firmId ? { firmId } : { lawyerId };
    const query = { ...baseQuery };

    if (status) query.status = status;

    const units = await OrganizationalUnit.find(query)
        .populate('parentUnitId', 'unitId unitCode unitName')
        .sort({ level: 1, unitName: 1 })
        .lean();

    if (format === 'csv') {
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
            unit.unitId,
            unit.unitCode,
            `"${unit.unitName || ''}"`,
            `"${unit.unitNameAr || ''}"`,
            unit.unitType,
            unit.status,
            unit.level,
            unit.parentUnitId?.unitName || '',
            `"${unit.managerName || ''}"`,
            unit.headcount?.approvedHeadcount || 0,
            unit.headcount?.currentHeadcount || 0,
            unit.headcount?.vacancies || 0,
            unit.headcount?.saudizationRate || 0,
            unit.budget?.annualBudget || 0,
            unit.costCenter?.costCenterCode || ''
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
