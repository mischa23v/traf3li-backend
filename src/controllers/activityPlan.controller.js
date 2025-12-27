const { ActivityPlan } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');
const { pickAllowedFields, sanitizeString, sanitizeObjectId } = require('../utils/securityUtils');

// Helper for regex safety
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Create activity plan
 * POST /api/activity-plans
 */
const createActivityPlan = asyncHandler(async (req, res) => {
    // Block departed users
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const lawyerId = req.userID;
    const firmId = req.firmId;

    // MASS ASSIGNMENT PROTECTION: Only allow specific fields
    const allowedFields = [
        'name', 'nameAr', 'description', 'entityType', 'planType',
        'steps', 'settings', 'status', 'tags'
    ];

    const safeData = pickAllowedFields(req.body, allowedFields);

    // INPUT VALIDATION: Sanitize string inputs
    if (safeData.name) {
        safeData.name = sanitizeString(safeData.name);
    }
    if (safeData.nameAr) {
        safeData.nameAr = sanitizeString(safeData.nameAr);
    }

    // Ensure these system fields are not overridable (IDOR protection)
    const activityPlanData = {
        ...safeData,
        lawyerId,
        firmId,
        createdBy: lawyerId
    };

    const activityPlan = await ActivityPlan.create(activityPlanData);

    res.status(201).json({
        success: true,
        message: 'تم إنشاء خطة الأنشطة بنجاح',
        data: activityPlan
    });
});

/**
 * Get all activity plans with filters
 * GET /api/activity-plans
 */
const getActivityPlans = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const lawyerId = req.userID;
    const firmId = req.firmId;
    const isSoloLawyer = req.isSoloLawyer;
    const {
        search, status, planType, entityType,
        page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc'
    } = req.query;

    const parsedLimit = Math.min(parseInt(limit) || 20, 100);
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
    if (planType) query.planType = planType;
    if (entityType) query.entityType = entityType;

    // Safe search with escaped regex
    if (search) {
        query.$or = [
            { name: { $regex: escapeRegex(search), $options: 'i' } },
            { nameAr: { $regex: escapeRegex(search), $options: 'i' } }
        ];
    }

    const activityPlans = await ActivityPlan.find(query)
        .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
        .skip((parsedPage - 1) * parsedLimit)
        .limit(parsedLimit);

    const total = await ActivityPlan.countDocuments(query);

    res.json({
        success: true,
        data: activityPlans,
        pagination: {
            page: parsedPage,
            limit: parsedLimit,
            total,
            totalPages: Math.ceil(total / parsedLimit)
        }
    });
});

/**
 * Get single activity plan
 * GET /api/activity-plans/:id
 */
const getActivityPlan = asyncHandler(async (req, res) => {
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

    const activityPlan = await ActivityPlan.findOne(accessQuery);

    if (!activityPlan) {
        throw CustomException('خطة الأنشطة غير موجودة', 404);
    }

    res.json({
        success: true,
        data: activityPlan
    });
});

/**
 * Update activity plan
 * PUT /api/activity-plans/:id
 */
const updateActivityPlan = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const { id } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const isSoloLawyer = req.isSoloLawyer;

    // IDOR PROTECTION: Verify activity plan belongs to user's firm
    const accessQuery = { _id: id };
    if (isSoloLawyer || !firmId) {
        accessQuery.lawyerId = lawyerId;
    } else {
        accessQuery.firmId = firmId;
    }

    const activityPlan = await ActivityPlan.findOne(accessQuery);

    if (!activityPlan) {
        throw CustomException('خطة الأنشطة غير موجودة', 404);
    }

    // MASS ASSIGNMENT PROTECTION: Only allow specific fields
    const allowedFields = [
        'name', 'nameAr', 'description', 'entityType', 'planType',
        'steps', 'settings', 'status', 'tags'
    ];

    const safeUpdateData = pickAllowedFields(req.body, allowedFields);

    // INPUT VALIDATION: Sanitize string inputs
    if (safeUpdateData.name) {
        safeUpdateData.name = sanitizeString(safeUpdateData.name);
    }
    if (safeUpdateData.nameAr) {
        safeUpdateData.nameAr = sanitizeString(safeUpdateData.nameAr);
    }

    // Apply safe updates
    Object.keys(safeUpdateData).forEach(field => {
        activityPlan[field] = safeUpdateData[field];
    });

    activityPlan.updatedBy = lawyerId;
    await activityPlan.save();

    res.json({
        success: true,
        message: 'تم تحديث خطة الأنشطة بنجاح',
        data: activityPlan
    });
});

/**
 * Delete activity plan
 * DELETE /api/activity-plans/:id
 */
const deleteActivityPlan = asyncHandler(async (req, res) => {
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

    const activityPlan = await ActivityPlan.findOneAndDelete(accessQuery);

    if (!activityPlan) {
        throw CustomException('خطة الأنشطة غير موجودة', 404);
    }

    res.json({
        success: true,
        message: 'تم حذف خطة الأنشطة بنجاح'
    });
});

/**
 * Duplicate activity plan
 * POST /api/activity-plans/:id/duplicate
 */
const duplicateActivityPlan = asyncHandler(async (req, res) => {
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

    const original = await ActivityPlan.findOne(accessQuery);

    if (!original) {
        throw CustomException('خطة الأنشطة غير موجودة', 404);
    }

    // Create duplicate
    const duplicate = new ActivityPlan({
        name: `${original.name} (نسخة)`,
        nameAr: original.nameAr ? `${original.nameAr} (نسخة)` : undefined,
        description: original.description,
        entityType: original.entityType,
        planType: original.planType,
        steps: original.steps,
        settings: original.settings,
        status: 'draft',
        tags: original.tags,
        firmId,
        lawyerId,
        createdBy: lawyerId
    });

    await duplicate.save();

    res.status(201).json({
        success: true,
        message: 'تم نسخ خطة الأنشطة بنجاح',
        data: duplicate
    });
});

module.exports = {
    createActivityPlan,
    getActivityPlans,
    getActivityPlan,
    updateActivityPlan,
    deleteActivityPlan,
    duplicateActivityPlan
};
