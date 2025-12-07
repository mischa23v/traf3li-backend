const JobPosition = require('../models/jobPosition.model');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../exceptions/customException');

// ═══════════════════════════════════════════════════════════════
// GET ALL JOB POSITIONS
// ═══════════════════════════════════════════════════════════════

const getJobPositions = asyncHandler(async (req, res) => {
    const { firmId, lawyerId } = req;
    const {
        page = 1,
        limit = 20,
        status,
        jobFamily,
        jobLevel,
        departmentId,
        employmentType,
        positionType,
        filled,
        supervisoryPosition,
        search,
        sort = '-createdOn'
    } = req.query;

    const baseQuery = firmId ? { firmId } : { lawyerId };
    const query = { ...baseQuery };

    // Apply filters
    if (status) query.status = status;
    if (jobFamily) query.jobFamily = jobFamily;
    if (jobLevel) query.jobLevel = jobLevel;
    if (departmentId) query.departmentId = departmentId;
    if (employmentType) query.employmentType = employmentType;
    if (positionType) query.positionType = positionType;
    if (filled !== undefined) query.filled = filled === 'true';
    if (supervisoryPosition !== undefined) query.supervisoryPosition = supervisoryPosition === 'true';

    // Search
    if (search) {
        query.$or = [
            { positionId: { $regex: search, $options: 'i' } },
            { positionNumber: { $regex: search, $options: 'i' } },
            { positionCode: { $regex: search, $options: 'i' } },
            { jobTitle: { $regex: search, $options: 'i' } },
            { jobTitleAr: { $regex: search, $options: 'i' } },
            { 'incumbent.employeeName': { $regex: search, $options: 'i' } }
        ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [positions, total] = await Promise.all([
        JobPosition.find(query)
            .populate('departmentId', 'unitId unitCode unitName unitNameAr')
            .populate('reportsTo.positionId', 'positionId positionNumber jobTitle jobTitleAr')
            .populate('incumbent.employeeId', 'firstName lastName email employeeNumber')
            .sort(sort)
            .skip(skip)
            .limit(parseInt(limit))
            .lean(),
        JobPosition.countDocuments(query)
    ]);

    res.status(200).json({
        success: true,
        data: positions,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
        }
    });
});

// ═══════════════════════════════════════════════════════════════
// GET JOB POSITION STATISTICS
// ═══════════════════════════════════════════════════════════════

const getJobPositionStats = asyncHandler(async (req, res) => {
    const { firmId, lawyerId } = req;
    const baseQuery = firmId ? { firmId } : { lawyerId };

    const [
        totalPositions,
        filledPositions,
        vacantPositions,
        frozenPositions,
        byFamily,
        byLevel,
        byDepartment,
        fteStats
    ] = await Promise.all([
        JobPosition.countDocuments({ ...baseQuery, status: { $in: ['active', 'vacant'] } }),
        JobPosition.countDocuments({ ...baseQuery, status: 'active', filled: true }),
        JobPosition.countDocuments({ ...baseQuery, status: { $in: ['active', 'vacant'] }, filled: false }),
        JobPosition.countDocuments({ ...baseQuery, status: 'frozen' }),
        JobPosition.aggregate([
            { $match: { ...baseQuery, status: { $in: ['active', 'vacant'] } } },
            { $group: { _id: '$jobFamily', count: { $sum: 1 } } }
        ]),
        JobPosition.aggregate([
            { $match: { ...baseQuery, status: { $in: ['active', 'vacant'] } } },
            { $group: { _id: '$jobLevel', count: { $sum: 1 } } }
        ]),
        JobPosition.aggregate([
            { $match: { ...baseQuery, status: { $in: ['active', 'vacant'] } } },
            { $group: { _id: '$departmentId', count: { $sum: 1 } } }
        ]),
        JobPosition.aggregate([
            { $match: { ...baseQuery, status: { $in: ['active', 'vacant'] }, budgeted: true } },
            { $group: { _id: null, totalFte: { $sum: '$fte' }, filledFte: { $sum: { $cond: ['$filled', '$fte', 0] } } } }
        ])
    ]);

    const vacancyRate = totalPositions > 0
        ? Math.round((vacantPositions / totalPositions) * 100)
        : 0;

    const fte = fteStats[0] || { totalFte: 0, filledFte: 0 };

    res.status(200).json({
        success: true,
        data: {
            totalPositions,
            filledPositions,
            vacantPositions,
            frozenPositions,
            vacancyRate,
            totalHeadcount: filledPositions,
            approvedHeadcount: totalPositions,
            totalFte: fte.totalFte,
            filledFte: fte.filledFte,
            vacantFte: fte.totalFte - fte.filledFte,
            byFamily: byFamily.reduce((acc, item) => {
                acc[item._id] = item.count;
                return acc;
            }, {}),
            byLevel: byLevel.reduce((acc, item) => {
                acc[item._id] = item.count;
                return acc;
            }, {}),
            byDepartment
        }
    });
});

// ═══════════════════════════════════════════════════════════════
// GET VACANT POSITIONS
// ═══════════════════════════════════════════════════════════════

const getVacantPositions = asyncHandler(async (req, res) => {
    const { firmId, lawyerId } = req;
    const baseQuery = firmId ? { firmId } : { lawyerId };

    const positions = await JobPosition.find({
        ...baseQuery,
        status: { $in: ['active', 'vacant'] },
        filled: false
    })
        .populate('departmentId', 'unitId unitCode unitName unitNameAr')
        .populate('reportsTo.positionId', 'positionId jobTitle incumbentName')
        .sort({ vacantSince: 1 })
        .lean();

    res.status(200).json({
        success: true,
        data: positions,
        total: positions.length
    });
});

// ═══════════════════════════════════════════════════════════════
// GET POSITIONS BY DEPARTMENT
// ═══════════════════════════════════════════════════════════════

const getPositionsByDepartment = asyncHandler(async (req, res) => {
    const { firmId, lawyerId } = req;
    const { departmentId } = req.params;
    const baseQuery = firmId ? { firmId } : { lawyerId };

    const positions = await JobPosition.find({
        ...baseQuery,
        departmentId,
        status: { $in: ['active', 'vacant'] }
    })
        .populate('reportsTo.positionId', 'positionId jobTitle')
        .sort({ jobLevel: 1, jobTitle: 1 })
        .lean();

    res.status(200).json({
        success: true,
        data: positions,
        total: positions.length
    });
});

// ═══════════════════════════════════════════════════════════════
// GET POSITION HIERARCHY
// ═══════════════════════════════════════════════════════════════

const getPositionHierarchy = asyncHandler(async (req, res) => {
    const { firmId, lawyerId } = req;
    const { id } = req.params;

    const baseQuery = firmId ? { firmId } : { lawyerId };
    const position = await JobPosition.findOne({ _id: id, ...baseQuery })
        .populate('reportsTo.positionId');

    if (!position) {
        throw new CustomException('Position not found', 404);
    }

    // Get upward chain
    const upwardChain = await JobPosition.getReportingChain(id);

    // Get direct reports
    const directReports = await JobPosition.find({
        ...baseQuery,
        'reportsTo.positionId': id,
        status: { $in: ['active', 'vacant'] }
    }).select('positionId positionNumber jobTitle jobTitleAr incumbent filled');

    res.status(200).json({
        success: true,
        data: {
            position,
            upwardChain,
            directReports
        }
    });
});

// ═══════════════════════════════════════════════════════════════
// GET ORG CHART
// ═══════════════════════════════════════════════════════════════

const getOrgChart = asyncHandler(async (req, res) => {
    const { firmId, lawyerId } = req;
    const { rootPositionId } = req.query;

    const orgChart = await JobPosition.buildOrgChart(firmId, lawyerId, rootPositionId || null);

    res.status(200).json({
        success: true,
        data: orgChart
    });
});

// ═══════════════════════════════════════════════════════════════
// GET SINGLE JOB POSITION
// ═══════════════════════════════════════════════════════════════

const getJobPosition = asyncHandler(async (req, res) => {
    const { firmId, lawyerId } = req;
    const { id } = req.params;

    const baseQuery = firmId ? { firmId } : { lawyerId };
    const position = await JobPosition.findOne({ _id: id, ...baseQuery })
        .populate('departmentId', 'unitId unitCode unitName unitNameAr')
        .populate('divisionId', 'unitId unitName unitNameAr')
        .populate('organizationalUnitId', 'unitId unitName unitNameAr')
        .populate('reportsTo.positionId', 'positionId positionNumber jobTitle jobTitleAr incumbent')
        .populate('incumbent.employeeId', 'firstName lastName email employeeNumber')
        .populate('createdBy', 'firstName lastName email')
        .populate('updatedBy', 'firstName lastName email');

    if (!position) {
        throw new CustomException('Job position not found', 404);
    }

    res.status(200).json({
        success: true,
        data: position
    });
});

// ═══════════════════════════════════════════════════════════════
// CREATE JOB POSITION
// ═══════════════════════════════════════════════════════════════

const createJobPosition = asyncHandler(async (req, res) => {
    const { firmId, lawyerId, userId } = req;

    // Generate position number if not provided
    if (!req.body.positionNumber) {
        req.body.positionNumber = await JobPosition.generatePositionNumber(firmId, lawyerId);
    }

    const position = new JobPosition({
        ...req.body,
        firmId,
        lawyerId,
        createdBy: userId,
        establishedDate: req.body.establishedDate || new Date()
    });

    await position.save();

    // Update parent's direct reports count if applicable
    if (position.reportsTo?.positionId) {
        await JobPosition.findByIdAndUpdate(position.reportsTo.positionId, {
            $inc: { directReportsCount: 1 }
        });
    }

    // Add to position history
    position.positionHistory = [{
        eventType: 'created',
        eventDate: new Date(),
        eventBy: userId,
        reason: 'Position created'
    }];
    await position.save();

    res.status(201).json({
        success: true,
        message: 'Job position created successfully',
        data: position
    });
});

// ═══════════════════════════════════════════════════════════════
// UPDATE JOB POSITION
// ═══════════════════════════════════════════════════════════════

const updateJobPosition = asyncHandler(async (req, res) => {
    const { firmId, lawyerId, userId } = req;
    const { id } = req.params;

    const baseQuery = firmId ? { firmId } : { lawyerId };
    const oldPosition = await JobPosition.findOne({ _id: id, ...baseQuery });

    if (!oldPosition) {
        throw new CustomException('Job position not found', 404);
    }

    // Track changes for history
    const changes = [];
    const trackFields = ['jobTitle', 'jobLevel', 'jobGrade', 'status', 'departmentId'];
    trackFields.forEach(field => {
        if (req.body[field] && req.body[field] !== String(oldPosition[field])) {
            changes.push({
                eventType: `${field}_change`,
                eventDate: new Date(),
                eventBy: userId,
                fieldChanged: field,
                oldValue: oldPosition[field],
                newValue: req.body[field]
            });
        }
    });

    // Check if reporting changed
    const oldReportsTo = oldPosition.reportsTo?.positionId?.toString();
    const newReportsTo = req.body.reportsTo?.positionId;

    if (oldReportsTo !== newReportsTo) {
        // Decrement old parent's count
        if (oldReportsTo) {
            await JobPosition.findByIdAndUpdate(oldReportsTo, {
                $inc: { directReportsCount: -1 }
            });
        }
        // Increment new parent's count
        if (newReportsTo) {
            await JobPosition.findByIdAndUpdate(newReportsTo, {
                $inc: { directReportsCount: 1 }
            });
        }
        changes.push({
            eventType: 'reporting_change',
            eventDate: new Date(),
            eventBy: userId,
            fieldChanged: 'reportsTo',
            oldValue: oldReportsTo,
            newValue: newReportsTo
        });
    }

    // Remove immutable fields from update
    const { firmId: _, lawyerId: __, positionId, createdBy, ...updateData } = req.body;

    // Update position
    Object.assign(oldPosition, updateData, { updatedBy: userId });

    // Add changes to history
    if (changes.length > 0) {
        oldPosition.positionHistory = [...(oldPosition.positionHistory || []), ...changes];
    }

    await oldPosition.save();

    res.status(200).json({
        success: true,
        message: 'Job position updated successfully',
        data: oldPosition
    });
});

// ═══════════════════════════════════════════════════════════════
// DELETE JOB POSITION
// ═══════════════════════════════════════════════════════════════

const deleteJobPosition = asyncHandler(async (req, res) => {
    const { firmId, lawyerId } = req;
    const { id } = req.params;

    const baseQuery = firmId ? { firmId } : { lawyerId };
    const position = await JobPosition.findOne({ _id: id, ...baseQuery });

    if (!position) {
        throw new CustomException('Job position not found', 404);
    }

    // Check for direct reports
    const directReportsCount = await JobPosition.countDocuments({
        ...baseQuery,
        'reportsTo.positionId': id
    });

    if (directReportsCount > 0) {
        throw new CustomException(
            `Cannot delete position with ${directReportsCount} direct report(s). Reassign them first.`,
            400
        );
    }

    // Update parent's direct reports count
    if (position.reportsTo?.positionId) {
        await JobPosition.findByIdAndUpdate(position.reportsTo.positionId, {
            $inc: { directReportsCount: -1 }
        });
    }

    await position.deleteOne();

    res.status(200).json({
        success: true,
        message: 'Job position deleted successfully'
    });
});

// ═══════════════════════════════════════════════════════════════
// BULK DELETE JOB POSITIONS
// ═══════════════════════════════════════════════════════════════

const bulkDeleteJobPositions = asyncHandler(async (req, res) => {
    const { firmId, lawyerId } = req;
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        throw new CustomException('Please provide an array of position IDs', 400);
    }

    const baseQuery = firmId ? { firmId } : { lawyerId };

    // Check for positions with direct reports
    const positionsWithReports = await JobPosition.find({
        ...baseQuery,
        'reportsTo.positionId': { $in: ids }
    }).select('reportsTo.positionId');

    if (positionsWithReports.length > 0) {
        throw new CustomException(
            'Some positions have direct reports. Reassign them first.',
            400
        );
    }

    const result = await JobPosition.deleteMany({
        _id: { $in: ids },
        ...baseQuery
    });

    res.status(200).json({
        success: true,
        message: `${result.deletedCount} job position(s) deleted successfully`,
        deletedCount: result.deletedCount
    });
});

// ═══════════════════════════════════════════════════════════════
// FREEZE POSITION
// ═══════════════════════════════════════════════════════════════

const freezePosition = asyncHandler(async (req, res) => {
    const { firmId, lawyerId, userId } = req;
    const { id } = req.params;
    const { reason, effectiveDate } = req.body;

    const baseQuery = firmId ? { firmId } : { lawyerId };
    const position = await JobPosition.findOne({ _id: id, ...baseQuery });

    if (!position) {
        throw new CustomException('Job position not found', 404);
    }

    if (position.status === 'frozen') {
        throw new CustomException('Position is already frozen', 400);
    }

    position.status = 'frozen';
    position.statusEffectiveDate = effectiveDate || new Date();
    position.statusReason = reason;
    position.updatedBy = userId;
    position.positionHistory.push({
        eventType: 'frozen',
        eventDate: new Date(),
        eventBy: userId,
        reason
    });

    await position.save();

    res.status(200).json({
        success: true,
        message: 'Position frozen successfully',
        data: position
    });
});

// ═══════════════════════════════════════════════════════════════
// UNFREEZE POSITION
// ═══════════════════════════════════════════════════════════════

const unfreezePosition = asyncHandler(async (req, res) => {
    const { firmId, lawyerId, userId } = req;
    const { id } = req.params;

    const baseQuery = firmId ? { firmId } : { lawyerId };
    const position = await JobPosition.findOne({ _id: id, ...baseQuery });

    if (!position) {
        throw new CustomException('Job position not found', 404);
    }

    if (position.status !== 'frozen') {
        throw new CustomException('Position is not frozen', 400);
    }

    position.status = position.filled ? 'active' : 'vacant';
    position.statusEffectiveDate = new Date();
    position.statusReason = null;
    position.updatedBy = userId;
    position.positionHistory.push({
        eventType: 'unfrozen',
        eventDate: new Date(),
        eventBy: userId
    });

    await position.save();

    res.status(200).json({
        success: true,
        message: 'Position unfrozen successfully',
        data: position
    });
});

// ═══════════════════════════════════════════════════════════════
// ELIMINATE POSITION
// ═══════════════════════════════════════════════════════════════

const eliminatePosition = asyncHandler(async (req, res) => {
    const { firmId, lawyerId, userId } = req;
    const { id } = req.params;
    const { reason, effectiveDate } = req.body;

    const baseQuery = firmId ? { firmId } : { lawyerId };
    const position = await JobPosition.findOne({ _id: id, ...baseQuery });

    if (!position) {
        throw new CustomException('Job position not found', 404);
    }

    // Save incumbent to history if filled
    if (position.filled && position.incumbent) {
        position.incumbentHistory.push({
            employeeId: position.incumbent.employeeId,
            employeeNumber: position.incumbent.employeeNumber,
            employeeName: position.incumbent.employeeName,
            employeeNameAr: position.incumbent.employeeNameAr,
            startDate: position.incumbent.assignmentDate,
            endDate: effectiveDate || new Date(),
            assignmentType: position.incumbent.assignmentType,
            separationReason: 'Position eliminated'
        });
    }

    position.status = 'eliminated';
    position.statusEffectiveDate = effectiveDate || new Date();
    position.statusReason = reason;
    position.filled = false;
    position.incumbent = null;
    position.expirationDate = effectiveDate || new Date();
    position.updatedBy = userId;
    position.positionHistory.push({
        eventType: 'eliminated',
        eventDate: new Date(),
        eventBy: userId,
        reason
    });

    await position.save();

    res.status(200).json({
        success: true,
        message: 'Position eliminated successfully',
        data: position
    });
});

// ═══════════════════════════════════════════════════════════════
// MARK POSITION AS VACANT
// ═══════════════════════════════════════════════════════════════

const markPositionVacant = asyncHandler(async (req, res) => {
    const { firmId, lawyerId, userId } = req;
    const { id } = req.params;
    const { reason, vacantSince, knowledgeTransferCompleted } = req.body;

    const baseQuery = firmId ? { firmId } : { lawyerId };
    const position = await JobPosition.findOne({ _id: id, ...baseQuery });

    if (!position) {
        throw new CustomException('Job position not found', 404);
    }

    // Save incumbent to history if filled
    if (position.filled && position.incumbent) {
        position.incumbentHistory.push({
            employeeId: position.incumbent.employeeId,
            employeeNumber: position.incumbent.employeeNumber,
            employeeName: position.incumbent.employeeName,
            employeeNameAr: position.incumbent.employeeNameAr,
            startDate: position.incumbent.assignmentDate,
            endDate: vacantSince || new Date(),
            assignmentType: position.incumbent.assignmentType,
            separationReason: reason
        });

        position.previousIncumbent = {
            employeeId: position.incumbent.employeeId,
            employeeName: position.incumbent.employeeName,
            lastWorkingDate: vacantSince || new Date(),
            knowledgeTransferCompleted: knowledgeTransferCompleted || false
        };
    }

    position.status = 'vacant';
    position.filled = false;
    position.incumbent = null;
    position.vacantSince = vacantSince || new Date();
    position.vacancyReason = reason;
    position.updatedBy = userId;
    position.positionHistory.push({
        eventType: 'vacated',
        eventDate: new Date(),
        eventBy: userId,
        reason
    });

    await position.save();

    res.status(200).json({
        success: true,
        message: 'Position marked as vacant successfully',
        data: position
    });
});

// ═══════════════════════════════════════════════════════════════
// FILL POSITION
// ═══════════════════════════════════════════════════════════════

const fillPosition = asyncHandler(async (req, res) => {
    const { firmId, lawyerId, userId } = req;
    const { id } = req.params;
    const {
        employeeId,
        employeeNumber,
        employeeName,
        employeeNameAr,
        assignmentType = 'permanent',
        assignmentDate,
        probationEnd
    } = req.body;

    const baseQuery = firmId ? { firmId } : { lawyerId };
    const position = await JobPosition.findOne({ _id: id, ...baseQuery });

    if (!position) {
        throw new CustomException('Job position not found', 404);
    }

    if (position.status === 'frozen' || position.status === 'eliminated') {
        throw new CustomException(`Cannot fill a ${position.status} position`, 400);
    }

    position.status = 'active';
    position.filled = true;
    position.incumbent = {
        employeeId,
        employeeNumber: employeeNumber || `EMP-${Date.now()}`,
        employeeName,
        employeeNameAr,
        assignmentType,
        assignmentDate: assignmentDate || new Date(),
        probationEnd
    };
    position.vacantSince = null;
    position.vacancyReason = null;
    position.updatedBy = userId;
    position.positionHistory.push({
        eventType: 'filled',
        eventDate: new Date(),
        eventBy: userId,
        newValue: { employeeName, assignmentType }
    });

    await position.save();

    res.status(200).json({
        success: true,
        message: 'Position filled successfully',
        data: position
    });
});

// ═══════════════════════════════════════════════════════════════
// VACATE POSITION (remove incumbent)
// ═══════════════════════════════════════════════════════════════

const vacatePosition = asyncHandler(async (req, res) => {
    const { firmId, lawyerId, userId } = req;
    const { id } = req.params;
    const { reason, effectiveDate } = req.body;

    const baseQuery = firmId ? { firmId } : { lawyerId };
    const position = await JobPosition.findOne({ _id: id, ...baseQuery });

    if (!position) {
        throw new CustomException('Job position not found', 404);
    }

    if (!position.filled) {
        throw new CustomException('Position is already vacant', 400);
    }

    // Save incumbent to history
    if (position.incumbent) {
        position.incumbentHistory.push({
            employeeId: position.incumbent.employeeId,
            employeeNumber: position.incumbent.employeeNumber,
            employeeName: position.incumbent.employeeName,
            employeeNameAr: position.incumbent.employeeNameAr,
            startDate: position.incumbent.assignmentDate,
            endDate: effectiveDate || new Date(),
            assignmentType: position.incumbent.assignmentType,
            separationReason: reason
        });

        position.previousIncumbent = {
            employeeId: position.incumbent.employeeId,
            employeeName: position.incumbent.employeeName,
            lastWorkingDate: effectiveDate || new Date(),
            knowledgeTransferCompleted: false
        };
    }

    position.status = 'vacant';
    position.filled = false;
    position.incumbent = null;
    position.vacantSince = effectiveDate || new Date();
    position.vacancyReason = reason;
    position.updatedBy = userId;
    position.positionHistory.push({
        eventType: 'vacated',
        eventDate: new Date(),
        eventBy: userId,
        reason
    });

    await position.save();

    res.status(200).json({
        success: true,
        message: 'Position vacated successfully',
        data: position
    });
});

// ═══════════════════════════════════════════════════════════════
// CLONE POSITION
// ═══════════════════════════════════════════════════════════════

const clonePosition = asyncHandler(async (req, res) => {
    const { firmId, lawyerId, userId } = req;
    const { id } = req.params;
    const { newPositionNumber, newJobTitle } = req.body;

    const baseQuery = firmId ? { firmId } : { lawyerId };
    const original = await JobPosition.findOne({ _id: id, ...baseQuery }).lean();

    if (!original) {
        throw new CustomException('Job position not found', 404);
    }

    // Remove fields that should be unique
    delete original._id;
    delete original.positionId;
    delete original.createdAt;
    delete original.updatedAt;
    delete original.createdOn;
    delete original.updatedOn;
    delete original.positionHistory;
    delete original.incumbentHistory;

    // Generate new position number
    const positionNumber = newPositionNumber || await JobPosition.generatePositionNumber(firmId, lawyerId);

    const cloned = new JobPosition({
        ...original,
        positionNumber,
        jobTitle: newJobTitle || `${original.jobTitle} (Copy)`,
        status: 'proposed',
        approvalStatus: 'draft',
        filled: false,
        incumbent: null,
        vacantSince: null,
        positionHistory: [{
            eventType: 'created',
            eventDate: new Date(),
            eventBy: userId,
            reason: `Cloned from ${original.positionNumber}`
        }],
        incumbentHistory: [],
        createdBy: userId
    });

    await cloned.save();

    res.status(201).json({
        success: true,
        message: 'Position cloned successfully',
        data: cloned
    });
});

// ═══════════════════════════════════════════════════════════════
// UPDATE RESPONSIBILITIES
// ═══════════════════════════════════════════════════════════════

const updateResponsibilities = asyncHandler(async (req, res) => {
    const { firmId, lawyerId, userId } = req;
    const { id } = req.params;
    const { responsibilities } = req.body;

    const baseQuery = firmId ? { firmId } : { lawyerId };
    const position = await JobPosition.findOne({ _id: id, ...baseQuery });

    if (!position) {
        throw new CustomException('Job position not found', 404);
    }

    position.keyResponsibilities = responsibilities;
    position.updatedBy = userId;
    position.positionHistory.push({
        eventType: 'responsibilities_change',
        eventDate: new Date(),
        eventBy: userId,
        fieldChanged: 'keyResponsibilities'
    });

    await position.save();

    res.status(200).json({
        success: true,
        message: 'Responsibilities updated successfully',
        data: position.keyResponsibilities
    });
});

// ═══════════════════════════════════════════════════════════════
// UPDATE QUALIFICATIONS
// ═══════════════════════════════════════════════════════════════

const updateQualifications = asyncHandler(async (req, res) => {
    const { firmId, lawyerId, userId } = req;
    const { id } = req.params;
    const { qualifications } = req.body;

    const baseQuery = firmId ? { firmId } : { lawyerId };
    const position = await JobPosition.findOne({ _id: id, ...baseQuery });

    if (!position) {
        throw new CustomException('Job position not found', 404);
    }

    position.qualifications = {
        ...position.qualifications?.toObject?.() || {},
        ...qualifications
    };
    position.updatedBy = userId;
    position.positionHistory.push({
        eventType: 'requirements_change',
        eventDate: new Date(),
        eventBy: userId,
        fieldChanged: 'qualifications'
    });

    await position.save();

    res.status(200).json({
        success: true,
        message: 'Qualifications updated successfully',
        data: position.qualifications
    });
});

// ═══════════════════════════════════════════════════════════════
// UPDATE SALARY RANGE
// ═══════════════════════════════════════════════════════════════

const updateSalaryRange = asyncHandler(async (req, res) => {
    const { firmId, lawyerId, userId } = req;
    const { id } = req.params;
    const salaryData = req.body;

    const baseQuery = firmId ? { firmId } : { lawyerId };
    const position = await JobPosition.findOne({ _id: id, ...baseQuery });

    if (!position) {
        throw new CustomException('Job position not found', 404);
    }

    const oldRange = position.compensation?.salaryRange;

    position.compensation = {
        ...position.compensation?.toObject?.() || {},
        salaryRange: salaryData.salaryRange || salaryData,
        salaryGrade: salaryData.salaryGrade || position.compensation?.salaryGrade
    };
    position.updatedBy = userId;
    position.positionHistory.push({
        eventType: 'salary_change',
        eventDate: new Date(),
        eventBy: userId,
        fieldChanged: 'salaryRange',
        oldValue: oldRange,
        newValue: position.compensation.salaryRange
    });

    await position.save();

    res.status(200).json({
        success: true,
        message: 'Salary range updated successfully',
        data: position.compensation
    });
});

// ═══════════════════════════════════════════════════════════════
// UPDATE COMPETENCIES
// ═══════════════════════════════════════════════════════════════

const updateCompetencies = asyncHandler(async (req, res) => {
    const { firmId, lawyerId, userId } = req;
    const { id } = req.params;
    const { competencies } = req.body;

    const baseQuery = firmId ? { firmId } : { lawyerId };
    const position = await JobPosition.findOne({ _id: id, ...baseQuery });

    if (!position) {
        throw new CustomException('Job position not found', 404);
    }

    position.competencies = competencies;
    position.updatedBy = userId;

    await position.save();

    res.status(200).json({
        success: true,
        message: 'Competencies updated successfully',
        data: position.competencies
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
    const position = await JobPosition.findOne({ _id: id, ...baseQuery });

    if (!position) {
        throw new CustomException('Job position not found', 404);
    }

    position.documents = position.documents || [];
    position.documents.push({
        ...documentData,
        uploadedOn: new Date(),
        uploadedBy: userId
    });
    position.updatedBy = userId;

    await position.save();

    res.status(201).json({
        success: true,
        message: 'Document added successfully',
        data: position.documents[position.documents.length - 1]
    });
});

// ═══════════════════════════════════════════════════════════════
// EXPORT JOB POSITIONS
// ═══════════════════════════════════════════════════════════════

const exportJobPositions = asyncHandler(async (req, res) => {
    const { firmId, lawyerId } = req;
    const { format = 'json', status, jobFamily, departmentId } = req.query;

    const baseQuery = firmId ? { firmId } : { lawyerId };
    const query = { ...baseQuery };

    if (status) query.status = status;
    if (jobFamily) query.jobFamily = jobFamily;
    if (departmentId) query.departmentId = departmentId;

    const positions = await JobPosition.find(query)
        .populate('departmentId', 'unitName unitNameAr')
        .populate('reportsTo.positionId', 'positionNumber jobTitle')
        .sort({ positionNumber: 1 })
        .lean();

    if (format === 'csv') {
        const csvHeader = [
            'Position ID',
            'Position Number',
            'Job Title',
            'Job Title (Arabic)',
            'Job Family',
            'Job Level',
            'Job Grade',
            'Department',
            'Status',
            'Filled',
            'Incumbent Name',
            'Reports To',
            'Salary Min',
            'Salary Max',
            'FTE',
            'Effective Date'
        ].join(',');

        const csvRows = positions.map(pos => [
            pos.positionId,
            pos.positionNumber,
            `"${pos.jobTitle || ''}"`,
            `"${pos.jobTitleAr || ''}"`,
            pos.jobFamily,
            pos.jobLevel,
            pos.jobGrade,
            `"${pos.departmentId?.unitName || ''}"`,
            pos.status,
            pos.filled ? 'Yes' : 'No',
            `"${pos.incumbent?.employeeName || ''}"`,
            `"${pos.reportsTo?.positionId?.jobTitle || ''}"`,
            pos.compensation?.salaryRange?.minimum || '',
            pos.compensation?.salaryRange?.maximum || '',
            pos.fte || 1,
            pos.effectiveDate ? new Date(pos.effectiveDate).toISOString().split('T')[0] : ''
        ].join(','));

        const csv = [csvHeader, ...csvRows].join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=job-positions.csv');
        return res.send(csv);
    }

    res.status(200).json({
        success: true,
        data: positions,
        total: positions.length,
        exportedAt: new Date().toISOString()
    });
});

module.exports = {
    getJobPositions,
    getJobPositionStats,
    getVacantPositions,
    getPositionsByDepartment,
    getPositionHierarchy,
    getOrgChart,
    getJobPosition,
    createJobPosition,
    updateJobPosition,
    deleteJobPosition,
    bulkDeleteJobPositions,
    freezePosition,
    unfreezePosition,
    eliminatePosition,
    markPositionVacant,
    fillPosition,
    vacatePosition,
    clonePosition,
    updateResponsibilities,
    updateQualifications,
    updateSalaryRange,
    updateCompetencies,
    addDocument,
    exportJobPositions
};
