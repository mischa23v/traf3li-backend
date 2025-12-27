const { Competitor } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');
const { pickAllowedFields, sanitizeString, sanitizeObjectId } = require('../utils/securityUtils');

// Helper for regex safety
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Create competitor
 * POST /api/competitors
 */
const createCompetitor = asyncHandler(async (req, res) => {
    // Block departed users
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const lawyerId = req.userID;
    const firmId = req.firmId;

    // MASS ASSIGNMENT PROTECTION: Only allow specific fields
    const allowedFields = [
        'name', 'nameAr', 'website', 'description', 'descriptionAr',
        'competitorType', 'threatLevel', 'strengths', 'weaknesses',
        'ourAdvantages', 'theirAdvantages', 'pricing', 'marketShare',
        'targetMarket', 'geographicPresence', 'contacts', 'status', 'tags', 'notes'
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
    const competitorData = {
        ...safeData,
        lawyerId,
        firmId,
        createdBy: lawyerId
    };

    const competitor = await Competitor.create(competitorData);

    res.status(201).json({
        success: true,
        message: 'تم إنشاء المنافس بنجاح',
        data: competitor
    });
});

/**
 * Get all competitors with filters
 * GET /api/competitors
 */
const getCompetitors = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const lawyerId = req.userID;
    const firmId = req.firmId;
    const isSoloLawyer = req.isSoloLawyer;
    const {
        search, status, competitorType, threatLevel,
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
    if (competitorType) query.competitorType = competitorType;
    if (threatLevel) query.threatLevel = threatLevel;

    // Safe search with escaped regex
    if (search) {
        query.$or = [
            { name: { $regex: escapeRegex(search), $options: 'i' } },
            { nameAr: { $regex: escapeRegex(search), $options: 'i' } }
        ];
    }

    const competitors = await Competitor.find(query)
        .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
        .skip((parsedPage - 1) * parsedLimit)
        .limit(parsedLimit);

    const total = await Competitor.countDocuments(query);

    res.json({
        success: true,
        data: competitors,
        pagination: {
            page: parsedPage,
            limit: parsedLimit,
            total,
            totalPages: Math.ceil(total / parsedLimit)
        }
    });
});

/**
 * Get single competitor
 * GET /api/competitors/:id
 */
const getCompetitor = asyncHandler(async (req, res) => {
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

    const competitor = await Competitor.findOne(accessQuery);

    if (!competitor) {
        throw CustomException('المنافس غير موجود', 404);
    }

    res.json({
        success: true,
        data: competitor
    });
});

/**
 * Update competitor
 * PUT /api/competitors/:id
 */
const updateCompetitor = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const { id } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const isSoloLawyer = req.isSoloLawyer;

    // IDOR PROTECTION: Verify competitor belongs to user's firm
    const accessQuery = { _id: id };
    if (isSoloLawyer || !firmId) {
        accessQuery.lawyerId = lawyerId;
    } else {
        accessQuery.firmId = firmId;
    }

    const competitor = await Competitor.findOne(accessQuery);

    if (!competitor) {
        throw CustomException('المنافس غير موجود', 404);
    }

    // MASS ASSIGNMENT PROTECTION: Only allow specific fields
    const allowedFields = [
        'name', 'nameAr', 'website', 'description', 'descriptionAr',
        'competitorType', 'threatLevel', 'strengths', 'weaknesses',
        'ourAdvantages', 'theirAdvantages', 'pricing', 'marketShare',
        'targetMarket', 'geographicPresence', 'contacts', 'status', 'tags', 'notes'
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
        competitor[field] = safeUpdateData[field];
    });

    competitor.updatedBy = lawyerId;
    await competitor.save();

    res.json({
        success: true,
        message: 'تم تحديث المنافس بنجاح',
        data: competitor
    });
});

/**
 * Delete competitor
 * DELETE /api/competitors/:id
 */
const deleteCompetitor = asyncHandler(async (req, res) => {
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

    const competitor = await Competitor.findOneAndDelete(accessQuery);

    if (!competitor) {
        throw CustomException('المنافس غير موجود', 404);
    }

    res.json({
        success: true,
        message: 'تم حذف المنافس بنجاح'
    });
});

/**
 * Record win against competitor
 * POST /api/competitors/:id/record-win
 */
const recordWin = asyncHandler(async (req, res) => {
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

    const competitor = await Competitor.findOne(accessQuery);

    if (!competitor) {
        throw CustomException('المنافس غير موجود', 404);
    }

    competitor.stats.dealsWonAgainst += 1;
    competitor.stats.lastEncounter = new Date();

    // Calculate win rate
    const total = competitor.stats.dealsWonAgainst + competitor.stats.dealsLostTo;
    if (total > 0) {
        competitor.stats.winRate = Math.round((competitor.stats.dealsWonAgainst / total) * 100);
    }

    await competitor.save();

    res.json({
        success: true,
        message: 'تم تسجيل الفوز بنجاح',
        data: competitor
    });
});

/**
 * Record loss to competitor
 * POST /api/competitors/:id/record-loss
 */
const recordLoss = asyncHandler(async (req, res) => {
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

    const competitor = await Competitor.findOne(accessQuery);

    if (!competitor) {
        throw CustomException('المنافس غير موجود', 404);
    }

    competitor.stats.dealsLostTo += 1;
    competitor.stats.lastEncounter = new Date();

    // Calculate win rate
    const total = competitor.stats.dealsWonAgainst + competitor.stats.dealsLostTo;
    if (total > 0) {
        competitor.stats.winRate = Math.round((competitor.stats.dealsWonAgainst / total) * 100);
    }

    await competitor.save();

    res.json({
        success: true,
        message: 'تم تسجيل الخسارة بنجاح',
        data: competitor
    });
});

module.exports = {
    createCompetitor,
    getCompetitors,
    getCompetitor,
    updateCompetitor,
    deleteCompetitor,
    recordWin,
    recordLoss
};
