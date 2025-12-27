const JobPosition = require('../models/jobPosition.model');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');

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
    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }

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
    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }

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

    // IDOR Protection - verify ownership
    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }

    const positions = await JobPosition.find({
        ...baseQuery,
        departmentId: sanitizeObjectId(departmentId),
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

    // IDOR Protection - verify ownership
    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }
    const position = await JobPosition.findOne({ _id: sanitizeObjectId(id), ...baseQuery })
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

    // IDOR Protection - verify ownership
    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }
    const position = await JobPosition.findOne({ _id: sanitizeObjectId(id), ...baseQuery })
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

    // Mass assignment protection - only allow specific fields
    const allowedFields = [
        'positionNumber', 'positionCode', 'jobTitle', 'jobTitleAr', 'jobFamily', 'jobLevel',
        'jobGrade', 'jobSubGrade', 'jobCategory', 'positionType', 'employmentType',
        'departmentId', 'divisionId', 'organizationalUnitId', 'location', 'workSite',
        'reportsTo', 'supervisoryPosition', 'directReportsCount', 'fte', 'budgeted',
        'budgetedFte', 'costCenter', 'status', 'approvalStatus', 'effectiveDate',
        'expirationDate', 'establishedDate', 'keyResponsibilities', 'decisionAuthority',
        'qualifications', 'competencies', 'compensation', 'performanceObjectives',
        'workingConditions', 'metadata', 'notes'
    ];

    const sanitizedData = pickAllowedFields(req.body, allowedFields);

    // Input validation
    if (!sanitizedData.jobTitle || sanitizedData.jobTitle.trim().length === 0) {
        throw new CustomException('Job title is required', 400);
    }

    if (sanitizedData.jobTitle.length > 200) {
        throw new CustomException('Job title must not exceed 200 characters', 400);
    }

    if (!sanitizedData.jobFamily) {
        throw new CustomException('Job family is required', 400);
    }

    if (!sanitizedData.departmentId) {
        throw new CustomException('Department is required', 400);
    }

    // Validate FTE
    if (sanitizedData.fte !== undefined) {
        const fte = parseFloat(sanitizedData.fte);
        if (isNaN(fte) || fte <= 0 || fte > 1) {
            throw new CustomException('FTE must be between 0 and 1', 400);
        }
    }

    // Validate salary range if provided
    if (sanitizedData.compensation?.salaryRange) {
        const { minimum, maximum } = sanitizedData.compensation.salaryRange;
        if (minimum !== undefined && maximum !== undefined) {
            if (minimum < 0 || maximum < 0) {
                throw new CustomException('Salary values cannot be negative', 400);
            }
            if (minimum > maximum) {
                throw new CustomException('Minimum salary cannot exceed maximum salary', 400);
            }
            if (maximum > 10000000) {
                throw new CustomException('Salary values exceed reasonable limits', 400);
            }
        }
    }

    // Sanitize object IDs
    if (sanitizedData.departmentId) {
        sanitizedData.departmentId = sanitizeObjectId(sanitizedData.departmentId);
    }
    if (sanitizedData.divisionId) {
        sanitizedData.divisionId = sanitizeObjectId(sanitizedData.divisionId);
    }
    if (sanitizedData.organizationalUnitId) {
        sanitizedData.organizationalUnitId = sanitizeObjectId(sanitizedData.organizationalUnitId);
    }
    if (sanitizedData.reportsTo?.positionId) {
        sanitizedData.reportsTo.positionId = sanitizeObjectId(sanitizedData.reportsTo.positionId);
    }

    // Generate position number if not provided
    if (!sanitizedData.positionNumber) {
        sanitizedData.positionNumber = await JobPosition.generatePositionNumber(firmId, lawyerId);
    }

    const position = new JobPosition({
        ...sanitizedData,
        firmId,
        lawyerId,
        createdBy: userId,
        establishedDate: sanitizedData.establishedDate || new Date()
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

    // IDOR Protection - verify ownership
    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }
    const oldPosition = await JobPosition.findOne({ _id: sanitizeObjectId(id), ...baseQuery });

    if (!oldPosition) {
        throw new CustomException('Job position not found', 404);
    }

    // Mass assignment protection - only allow specific fields
    const allowedFields = [
        'positionNumber', 'positionCode', 'jobTitle', 'jobTitleAr', 'jobFamily', 'jobLevel',
        'jobGrade', 'jobSubGrade', 'jobCategory', 'positionType', 'employmentType',
        'departmentId', 'divisionId', 'organizationalUnitId', 'location', 'workSite',
        'reportsTo', 'supervisoryPosition', 'directReportsCount', 'fte', 'budgeted',
        'budgetedFte', 'costCenter', 'status', 'approvalStatus', 'effectiveDate',
        'expirationDate', 'establishedDate', 'keyResponsibilities', 'decisionAuthority',
        'qualifications', 'competencies', 'compensation', 'performanceObjectives',
        'workingConditions', 'metadata', 'notes'
    ];

    const sanitizedData = pickAllowedFields(req.body, allowedFields);

    // Input validation
    if (sanitizedData.jobTitle !== undefined) {
        if (!sanitizedData.jobTitle || sanitizedData.jobTitle.trim().length === 0) {
            throw new CustomException('Job title cannot be empty', 400);
        }
        if (sanitizedData.jobTitle.length > 200) {
            throw new CustomException('Job title must not exceed 200 characters', 400);
        }
    }

    // Validate FTE
    if (sanitizedData.fte !== undefined) {
        const fte = parseFloat(sanitizedData.fte);
        if (isNaN(fte) || fte <= 0 || fte > 1) {
            throw new CustomException('FTE must be between 0 and 1', 400);
        }
    }

    // Validate salary range if provided
    if (sanitizedData.compensation?.salaryRange) {
        const { minimum, maximum } = sanitizedData.compensation.salaryRange;
        if (minimum !== undefined && maximum !== undefined) {
            if (minimum < 0 || maximum < 0) {
                throw new CustomException('Salary values cannot be negative', 400);
            }
            if (minimum > maximum) {
                throw new CustomException('Minimum salary cannot exceed maximum salary', 400);
            }
            if (maximum > 10000000) {
                throw new CustomException('Salary values exceed reasonable limits', 400);
            }
        }
    }

    // Sanitize object IDs
    if (sanitizedData.departmentId) {
        sanitizedData.departmentId = sanitizeObjectId(sanitizedData.departmentId);
    }
    if (sanitizedData.divisionId) {
        sanitizedData.divisionId = sanitizeObjectId(sanitizedData.divisionId);
    }
    if (sanitizedData.organizationalUnitId) {
        sanitizedData.organizationalUnitId = sanitizeObjectId(sanitizedData.organizationalUnitId);
    }
    if (sanitizedData.reportsTo?.positionId) {
        sanitizedData.reportsTo.positionId = sanitizeObjectId(sanitizedData.reportsTo.positionId);
    }

    // Track changes for history
    const changes = [];
    const trackFields = ['jobTitle', 'jobLevel', 'jobGrade', 'status', 'departmentId'];
    trackFields.forEach(field => {
        if (sanitizedData[field] && sanitizedData[field] !== String(oldPosition[field])) {
            changes.push({
                eventType: `${field}_change`,
                eventDate: new Date(),
                eventBy: userId,
                fieldChanged: field,
                oldValue: oldPosition[field],
                newValue: sanitizedData[field]
            });
        }
    });

    // Check if reporting changed
    const oldReportsTo = oldPosition.reportsTo?.positionId?.toString();
    const newReportsTo = sanitizedData.reportsTo?.positionId;

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

    // Update position
    Object.assign(oldPosition, sanitizedData, { updatedBy: userId });

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

    // IDOR Protection - verify ownership
    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }
    const position = await JobPosition.findOne({ _id: sanitizeObjectId(id), ...baseQuery });

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

    // Validate array size to prevent DoS
    if (ids.length > 100) {
        throw new CustomException('Cannot delete more than 100 positions at once', 400);
    }

    // Sanitize all IDs
    const sanitizedIds = ids.map(id => sanitizeObjectId(id));

    // IDOR Protection - verify ownership
    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }

    // Check for positions with direct reports
    const positionsWithReports = await JobPosition.find({
        ...baseQuery,
        'reportsTo.positionId': { $in: sanitizedIds }
    }).select('reportsTo.positionId');

    if (positionsWithReports.length > 0) {
        throw new CustomException(
            'Some positions have direct reports. Reassign them first.',
            400
        );
    }

    const result = await JobPosition.deleteMany({
        _id: { $in: sanitizedIds },
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

    // Mass assignment protection
    const allowedFields = ['reason', 'effectiveDate'];
    const { reason, effectiveDate } = pickAllowedFields(req.body, allowedFields);

    // IDOR Protection - verify ownership
    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }
    const position = await JobPosition.findOne({ _id: sanitizeObjectId(id), ...baseQuery });

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

    // IDOR Protection - verify ownership
    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }
    const position = await JobPosition.findOne({ _id: sanitizeObjectId(id), ...baseQuery });

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

    // Mass assignment protection
    const allowedFields = ['reason', 'effectiveDate'];
    const { reason, effectiveDate } = pickAllowedFields(req.body, allowedFields);

    // IDOR Protection - verify ownership
    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }
    const position = await JobPosition.findOne({ _id: sanitizeObjectId(id), ...baseQuery });

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

    // Mass assignment protection
    const allowedFields = ['reason', 'vacantSince', 'knowledgeTransferCompleted'];
    const { reason, vacantSince, knowledgeTransferCompleted } = pickAllowedFields(req.body, allowedFields);

    // IDOR Protection - verify ownership
    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }
    const position = await JobPosition.findOne({ _id: sanitizeObjectId(id), ...baseQuery });

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

    // Mass assignment protection
    const allowedFields = ['employeeId', 'employeeNumber', 'employeeName', 'employeeNameAr',
                          'assignmentType', 'assignmentDate', 'probationEnd'];
    const sanitizedData = pickAllowedFields(req.body, allowedFields);

    const {
        employeeId,
        employeeNumber,
        employeeName,
        employeeNameAr,
        assignmentType = 'permanent',
        assignmentDate,
        probationEnd
    } = sanitizedData;

    // Input validation
    if (!employeeId) {
        throw new CustomException('Employee ID is required', 400);
    }
    if (!employeeName || employeeName.trim().length === 0) {
        throw new CustomException('Employee name is required', 400);
    }

    // Sanitize employee ID
    const sanitizedEmployeeId = sanitizeObjectId(employeeId);

    // IDOR Protection - verify ownership
    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }
    const position = await JobPosition.findOne({ _id: sanitizeObjectId(id), ...baseQuery });

    if (!position) {
        throw new CustomException('Job position not found', 404);
    }

    if (position.status === 'frozen' || position.status === 'eliminated') {
        throw new CustomException(`Cannot fill a ${position.status} position`, 400);
    }

    position.status = 'active';
    position.filled = true;
    position.incumbent = {
        employeeId: sanitizedEmployeeId,
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

    // Mass assignment protection
    const allowedFields = ['reason', 'effectiveDate'];
    const { reason, effectiveDate } = pickAllowedFields(req.body, allowedFields);

    // IDOR Protection - verify ownership
    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }
    const position = await JobPosition.findOne({ _id: sanitizeObjectId(id), ...baseQuery });

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

    // Mass assignment protection
    const allowedFields = ['newPositionNumber', 'newJobTitle'];
    const { newPositionNumber, newJobTitle } = pickAllowedFields(req.body, allowedFields);

    // IDOR Protection - verify ownership
    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }
    const original = await JobPosition.findOne({ _id: sanitizeObjectId(id), ...baseQuery }).lean();

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

    // Mass assignment protection
    const allowedFields = ['responsibilities'];
    const { responsibilities } = pickAllowedFields(req.body, allowedFields);

    // Input validation
    if (!responsibilities || !Array.isArray(responsibilities)) {
        throw new CustomException('Responsibilities must be an array', 400);
    }

    // IDOR Protection - verify ownership
    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }
    const position = await JobPosition.findOne({ _id: sanitizeObjectId(id), ...baseQuery });

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

    // Mass assignment protection
    const allowedFields = ['qualifications'];
    const { qualifications } = pickAllowedFields(req.body, allowedFields);

    // Input validation
    if (!qualifications || typeof qualifications !== 'object') {
        throw new CustomException('Qualifications must be an object', 400);
    }

    // IDOR Protection - verify ownership
    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }
    const position = await JobPosition.findOne({ _id: sanitizeObjectId(id), ...baseQuery });

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

    // Mass assignment protection
    const allowedFields = ['salaryRange', 'salaryGrade', 'currency', 'payFrequency'];
    const salaryData = pickAllowedFields(req.body, allowedFields);

    // IDOR Protection - verify ownership
    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }
    const position = await JobPosition.findOne({ _id: sanitizeObjectId(id), ...baseQuery });

    if (!position) {
        throw new CustomException('Job position not found', 404);
    }

    // Validate salary range
    const salaryRange = salaryData.salaryRange || salaryData;
    if (salaryRange) {
        const { minimum, maximum, midpoint } = salaryRange;

        // Validate minimum and maximum
        if (minimum !== undefined && maximum !== undefined) {
            if (typeof minimum !== 'number' || typeof maximum !== 'number') {
                throw new CustomException('Salary values must be numbers', 400);
            }
            if (minimum < 0 || maximum < 0) {
                throw new CustomException('Salary values cannot be negative', 400);
            }
            if (minimum > maximum) {
                throw new CustomException('Minimum salary cannot exceed maximum salary', 400);
            }
            if (maximum > 10000000) {
                throw new CustomException('Salary values exceed reasonable limits', 400);
            }
        }

        // Validate midpoint if provided
        if (midpoint !== undefined) {
            if (typeof midpoint !== 'number') {
                throw new CustomException('Midpoint must be a number', 400);
            }
            if (minimum !== undefined && maximum !== undefined) {
                if (midpoint < minimum || midpoint > maximum) {
                    throw new CustomException('Midpoint must be between minimum and maximum', 400);
                }
            }
        }
    }

    const oldRange = position.compensation?.salaryRange;

    position.compensation = {
        ...position.compensation?.toObject?.() || {},
        salaryRange: salaryData.salaryRange || salaryData,
        salaryGrade: salaryData.salaryGrade || position.compensation?.salaryGrade,
        currency: salaryData.currency || position.compensation?.currency,
        payFrequency: salaryData.payFrequency || position.compensation?.payFrequency
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

    // Mass assignment protection
    const allowedFields = ['competencies'];
    const { competencies } = pickAllowedFields(req.body, allowedFields);

    // Input validation
    if (!competencies || !Array.isArray(competencies)) {
        throw new CustomException('Competencies must be an array', 400);
    }

    // IDOR Protection - verify ownership
    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }
    const position = await JobPosition.findOne({ _id: sanitizeObjectId(id), ...baseQuery });

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

    // Mass assignment protection
    const allowedFields = ['documentType', 'documentName', 'documentUrl', 'fileSize',
                          'mimeType', 'description', 'version', 'isConfidential'];
    const documentData = pickAllowedFields(req.body, allowedFields);

    // Input validation
    if (!documentData.documentName || documentData.documentName.trim().length === 0) {
        throw new CustomException('Document name is required', 400);
    }
    if (!documentData.documentUrl || documentData.documentUrl.trim().length === 0) {
        throw new CustomException('Document URL is required', 400);
    }

    // IDOR Protection - verify ownership
    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }
    const position = await JobPosition.findOne({ _id: sanitizeObjectId(id), ...baseQuery });

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

    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }
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
        // SECURITY: Import sanitization function to prevent CSV injection
        const { sanitizeForCSV } = require('../utils/securityUtils');

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
            sanitizeForCSV(pos.positionId),
            sanitizeForCSV(pos.positionNumber),
            `"${sanitizeForCSV(pos.jobTitle || '')}"`,
            `"${sanitizeForCSV(pos.jobTitleAr || '')}"`,
            sanitizeForCSV(pos.jobFamily),
            sanitizeForCSV(pos.jobLevel),
            sanitizeForCSV(pos.jobGrade),
            `"${sanitizeForCSV(pos.departmentId?.unitName || '')}"`,
            sanitizeForCSV(pos.status),
            sanitizeForCSV(pos.filled ? 'Yes' : 'No'),
            `"${sanitizeForCSV(pos.incumbent?.employeeName || '')}"`,
            `"${sanitizeForCSV(pos.reportsTo?.positionId?.jobTitle || '')}"`,
            sanitizeForCSV(pos.compensation?.salaryRange?.minimum || ''),
            sanitizeForCSV(pos.compensation?.salaryRange?.maximum || ''),
            sanitizeForCSV(pos.fte || 1),
            sanitizeForCSV(pos.effectiveDate ? new Date(pos.effectiveDate).toISOString().split('T')[0] : '')
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
