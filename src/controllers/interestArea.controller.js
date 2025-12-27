const { InterestArea } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');
const { pickAllowedFields, sanitizeString, sanitizeObjectId } = require('../utils/securityUtils');

// Helper for regex safety
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Create interest area
 * POST /api/interest-areas
 */
const createInterestArea = asyncHandler(async (req, res) => {
    // Block departed users
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const lawyerId = req.userID;
    const firmId = req.firmId;

    // MASS ASSIGNMENT PROTECTION: Only allow specific fields
    const allowedFields = [
        'name', 'nameAr', 'description', 'descriptionAr', 'category',
        'parentId', 'color', 'icon', 'status', 'sortOrder'
    ];

    const safeData = pickAllowedFields(req.body, allowedFields);

    // INPUT VALIDATION: Sanitize string inputs
    if (safeData.name) {
        safeData.name = sanitizeString(safeData.name);
    }
    if (safeData.nameAr) {
        safeData.nameAr = sanitizeString(safeData.nameAr);
    }
    if (safeData.parentId) {
        safeData.parentId = sanitizeObjectId(safeData.parentId);
    }

    // Ensure these system fields are not overridable (IDOR protection)
    const interestAreaData = {
        ...safeData,
        lawyerId,
        firmId,
        createdBy: lawyerId
    };

    const interestArea = await InterestArea.create(interestAreaData);

    res.status(201).json({
        success: true,
        message: 'تم إنشاء مجال الاهتمام بنجاح',
        data: interestArea
    });
});

/**
 * Get all interest areas with filters
 * GET /api/interest-areas
 */
const getInterestAreas = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const lawyerId = req.userID;
    const firmId = req.firmId;
    const isSoloLawyer = req.isSoloLawyer;
    const {
        search, status, category, parentId,
        page = 1, limit = 100, sortBy = 'sortOrder', sortOrder = 'asc'
    } = req.query;

    const parsedLimit = Math.min(parseInt(limit) || 100, 200);
    const parsedPage = parseInt(page) || 1;

    // Build query based on user type
    const query = {};
    if (isSoloLawyer || !firmId) {
        query.lawyerId = lawyerId;
    } else {
        query.firmId = firmId;
    }

    // Apply filters
    if (status) query.status = status;
    if (category) query.category = category;
    if (parentId === 'null' || parentId === null) {
        query.parentId = null;
    } else if (parentId) {
        query.parentId = sanitizeObjectId(parentId);
    }

    // Safe search with escaped regex
    if (search) {
        query.$or = [
            { name: { $regex: escapeRegex(search), $options: 'i' } },
            { nameAr: { $regex: escapeRegex(search), $options: 'i' } }
        ];
    }

    const interestAreas = await InterestArea.find(query)
        .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
        .skip((parsedPage - 1) * parsedLimit)
        .limit(parsedLimit)
        .populate('parentId', 'name nameAr');

    const total = await InterestArea.countDocuments(query);

    res.json({
        success: true,
        data: interestAreas,
        pagination: {
            page: parsedPage,
            limit: parsedLimit,
            total,
            totalPages: Math.ceil(total / parsedLimit)
        }
    });
});

/**
 * Get single interest area
 * GET /api/interest-areas/:id
 */
const getInterestArea = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const { id } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const isSoloLawyer = req.isSoloLawyer;

    // IDOR PROTECTION: Build query based on user type
    const accessQuery = { _id: id };
    if (isSoloLawyer || !firmId) {
        accessQuery.lawyerId = lawyerId;
    } else {
        accessQuery.firmId = firmId;
    }

    const interestArea = await InterestArea.findOne(accessQuery)
        .populate('parentId', 'name nameAr');

    if (!interestArea) {
        throw CustomException('مجال الاهتمام غير موجود', 404);
    }

    res.json({
        success: true,
        data: interestArea
    });
});

/**
 * Update interest area
 * PUT /api/interest-areas/:id
 */
const updateInterestArea = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const { id } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const isSoloLawyer = req.isSoloLawyer;

    // IDOR PROTECTION: Verify interest area belongs to user's firm
    const accessQuery = { _id: id };
    if (isSoloLawyer || !firmId) {
        accessQuery.lawyerId = lawyerId;
    } else {
        accessQuery.firmId = firmId;
    }

    const interestArea = await InterestArea.findOne(accessQuery);

    if (!interestArea) {
        throw CustomException('مجال الاهتمام غير موجود', 404);
    }

    // MASS ASSIGNMENT PROTECTION: Only allow specific fields
    const allowedFields = [
        'name', 'nameAr', 'description', 'descriptionAr', 'category',
        'parentId', 'color', 'icon', 'status', 'sortOrder'
    ];

    const safeUpdateData = pickAllowedFields(req.body, allowedFields);

    // INPUT VALIDATION: Sanitize string inputs
    if (safeUpdateData.name) {
        safeUpdateData.name = sanitizeString(safeUpdateData.name);
    }
    if (safeUpdateData.nameAr) {
        safeUpdateData.nameAr = sanitizeString(safeUpdateData.nameAr);
    }
    if (safeUpdateData.parentId) {
        safeUpdateData.parentId = sanitizeObjectId(safeUpdateData.parentId);
    }

    // Apply safe updates
    Object.keys(safeUpdateData).forEach(field => {
        interestArea[field] = safeUpdateData[field];
    });

    interestArea.updatedBy = lawyerId;
    await interestArea.save();

    res.json({
        success: true,
        message: 'تم تحديث مجال الاهتمام بنجاح',
        data: interestArea
    });
});

/**
 * Delete interest area
 * DELETE /api/interest-areas/:id
 */
const deleteInterestArea = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const { id } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const isSoloLawyer = req.isSoloLawyer;

    // IDOR PROTECTION: Build query based on user type
    const accessQuery = { _id: id };
    if (isSoloLawyer || !firmId) {
        accessQuery.lawyerId = lawyerId;
    } else {
        accessQuery.firmId = firmId;
    }

    const interestArea = await InterestArea.findOneAndDelete(accessQuery);

    if (!interestArea) {
        throw CustomException('مجال الاهتمام غير موجود', 404);
    }

    res.json({
        success: true,
        message: 'تم حذف مجال الاهتمام بنجاح'
    });
});

/**
 * Get hierarchical tree of interest areas
 * GET /api/interest-areas/tree
 */
const getInterestAreasTree = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const lawyerId = req.userID;
    const firmId = req.firmId;
    const isSoloLawyer = req.isSoloLawyer;
    const { category, status = 'active' } = req.query;

    // Build query based on user type
    const query = {};
    if (isSoloLawyer || !firmId) {
        query.lawyerId = lawyerId;
    } else {
        query.firmId = firmId;
    }

    if (status) query.status = status;
    if (category) query.category = category;

    // Get all interest areas
    const allAreas = await InterestArea.find(query)
        .sort({ sortOrder: 1, name: 1 })
        .lean();

    // Build tree structure
    const buildTree = (parentId = null) => {
        return allAreas
            .filter(area => {
                const areaParentId = area.parentId ? area.parentId.toString() : null;
                return areaParentId === parentId;
            })
            .map(area => ({
                ...area,
                children: buildTree(area._id.toString())
            }));
    };

    const tree = buildTree();

    res.json({
        success: true,
        data: tree
    });
});

module.exports = {
    createInterestArea,
    getInterestAreas,
    getInterestArea,
    updateInterestArea,
    deleteInterestArea,
    getInterestAreasTree
};
