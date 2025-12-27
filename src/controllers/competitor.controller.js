/**
 * Competitor Controller
 *
 * Handles competitor CRUD operations and stats.
 */

const Competitor = require('../models/competitor.model');
const CrmActivity = require('../models/crmActivity.model');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');
const logger = require('../utils/logger');

// Helper function to escape regex special characters (ReDoS protection)
const escapeRegex = (str) => {
    if (!str || typeof str !== 'string') return '';
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

// ═══════════════════════════════════════════════════════════════
// VALIDATION HELPERS
// ═══════════════════════════════════════════════════════════════

/**
 * Validate competitor data
 */
const validateCompetitorData = (data) => {
    const errors = [];

    // Validate name
    if (data.name !== undefined) {
        if (typeof data.name !== 'string' || data.name.trim().length === 0) {
            errors.push('Name is required and must be a non-empty string');
        } else if (data.name.length > 200) {
            errors.push('Name must not exceed 200 characters');
        }
    }

    // Validate nameAr
    if (data.nameAr !== undefined && data.nameAr !== null && data.nameAr !== '') {
        if (typeof data.nameAr !== 'string') {
            errors.push('Arabic name must be a string');
        } else if (data.nameAr.length > 200) {
            errors.push('Arabic name must not exceed 200 characters');
        }
    }

    // Validate website URL
    if (data.website !== undefined && data.website !== null && data.website !== '') {
        if (typeof data.website !== 'string') {
            errors.push('Website must be a string');
        } else if (data.website.length > 255) {
            errors.push('Website must not exceed 255 characters');
        } else {
            // Validate URL format
            const urlPattern = /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/;
            if (!urlPattern.test(data.website)) {
                errors.push('Website must be a valid URL (http:// or https://)');
            }
        }
    }

    // Validate description
    if (data.description !== undefined && data.description !== null && data.description !== '') {
        if (typeof data.description !== 'string') {
            errors.push('Description must be a string');
        } else if (data.description.length > 1000) {
            errors.push('Description must not exceed 1000 characters');
        }
    }

    // Validate enabled
    if (data.enabled !== undefined && typeof data.enabled !== 'boolean') {
        errors.push('Enabled must be a boolean');
    }

    return errors;
};

// Allowed fields for mass assignment protection
const ALLOWED_COMPETITOR_FIELDS = [
    'name',
    'nameAr',
    'website',
    'description',
    'enabled'
];

// ═══════════════════════════════════════════════════════════════
// LIST COMPETITORS
// ═══════════════════════════════════════════════════════════════

/**
 * Get all competitors with optional stats
 */
exports.getAll = async (req, res) => {
    try {
        if (req.isDeparted) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية للوصول / Access denied'
            });
        }

        const firmId = req.firmId;
        const lawyerId = req.userID;
        const { enabled, withStats, search } = req.query;

        if (withStats === 'true') {
            const competitors = await Competitor.getWithStats(firmId);
            return res.json({
                success: true,
                data: competitors
            });
        }

        const isSoloLawyer = req.isSoloLawyer;
        const query = {};
        if (isSoloLawyer || !firmId) {
            query.lawyerId = lawyerId;
        } else {
            query.firmId = firmId;
        }

        if (enabled !== undefined) {
            query.enabled = enabled === 'true';
        }
        if (search) {
            const escapedSearch = escapeRegex(search);
            query.$or = [
                { name: { $regex: escapedSearch, $options: 'i' } },
                { nameAr: { $regex: escapedSearch, $options: 'i' } }
            ];
        }

        const competitors = await Competitor.find(query).sort({ name: 1 });

        res.json({
            success: true,
            data: competitors
        });
    } catch (error) {
        logger.error('Error getting competitors', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'خطأ في جلب المنافسين / Error fetching competitors',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// GET SINGLE COMPETITOR
// ═══════════════════════════════════════════════════════════════

/**
 * Get competitor by ID
 */
exports.getById = async (req, res) => {
    try {
        if (req.isDeparted) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية للوصول / Access denied'
            });
        }

        const { id } = req.params;
        const firmId = req.firmId;

        // Sanitize and validate ID
        const sanitizedId = sanitizeObjectId(id);
        if (!sanitizedId) {
            return res.status(400).json({
                success: false,
                message: 'Invalid competitor ID format'
            });
        }

        // IDOR protection: verify firmId ownership
        const competitor = await Competitor.findOne({ _id: sanitizedId, firmId });

        if (!competitor) {
            return res.status(404).json({
                success: false,
                message: 'المنافس غير موجود / Competitor not found'
            });
        }

        res.json({
            success: true,
            data: competitor
        });
    } catch (error) {
        logger.error('Error getting competitor', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'خطأ في جلب المنافس / Error fetching competitor',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// CREATE COMPETITOR
// ═══════════════════════════════════════════════════════════════

/**
 * Create a new competitor
 */
exports.create = async (req, res) => {
    try {
        if (req.isDeparted) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية للوصول / Access denied'
            });
        }

        const firmId = req.firmId;
        const userId = req.userID;

        // Mass assignment protection: only allow specific fields
        const allowedData = pickAllowedFields(req.body, ALLOWED_COMPETITOR_FIELDS);

        // Input validation
        const validationErrors = validateCompetitorData(allowedData);
        if (validationErrors.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'خطأ في التحقق من البيانات / Validation error',
                errors: validationErrors
            });
        }

        // Validate required fields
        if (!allowedData.name || allowedData.name.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: 'الاسم مطلوب / Name is required'
            });
        }

        const competitorData = {
            ...allowedData,
            firmId
        };

        const competitor = await Competitor.create(competitorData);

        // Log activity
        await CrmActivity.logActivity({
            lawyerId: userId,
            type: 'competitor_created',
            entityType: 'competitor',
            entityId: competitor._id,
            entityName: competitor.name,
            title: `Competitor created: ${competitor.name}`,
            performedBy: userId
        });

        res.status(201).json({
            success: true,
            message: 'تم إنشاء المنافس بنجاح / Competitor created successfully',
            data: competitor
        });
    } catch (error) {
        logger.error('Error creating competitor', { error: error.message });

        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'المنافس موجود بالفعل / Competitor already exists'
            });
        }

        res.status(500).json({
            success: false,
            message: 'خطأ في إنشاء المنافس / Error creating competitor',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// UPDATE COMPETITOR
// ═══════════════════════════════════════════════════════════════

/**
 * Update a competitor
 */
exports.update = async (req, res) => {
    try {
        if (req.isDeparted) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية للوصول / Access denied'
            });
        }

        const { id } = req.params;
        const firmId = req.firmId;
        const userId = req.userID;

        // Sanitize and validate ID
        const sanitizedId = sanitizeObjectId(id);
        if (!sanitizedId) {
            return res.status(400).json({
                success: false,
                message: 'Invalid competitor ID format'
            });
        }

        // Mass assignment protection: only allow specific fields
        const allowedData = pickAllowedFields(req.body, ALLOWED_COMPETITOR_FIELDS);

        // Input validation
        const validationErrors = validateCompetitorData(allowedData);
        if (validationErrors.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'خطأ في التحقق من البيانات / Validation error',
                errors: validationErrors
            });
        }

        // Check if there's any data to update
        if (Object.keys(allowedData).length === 0) {
            return res.status(400).json({
                success: false,
                message: 'لا توجد بيانات للتحديث / No data to update'
            });
        }

        // IDOR protection: verify firmId ownership
        const competitor = await Competitor.findOneAndUpdate(
            { _id: sanitizedId, firmId },
            { $set: allowedData },
            { new: true, runValidators: true }
        );

        if (!competitor) {
            return res.status(404).json({
                success: false,
                message: 'المنافس غير موجود / Competitor not found'
            });
        }

        // Log activity
        await CrmActivity.logActivity({
            lawyerId: userId,
            type: 'competitor_updated',
            entityType: 'competitor',
            entityId: competitor._id,
            entityName: competitor.name,
            title: `Competitor updated: ${competitor.name}`,
            performedBy: userId
        });

        res.json({
            success: true,
            message: 'تم تحديث المنافس بنجاح / Competitor updated successfully',
            data: competitor
        });
    } catch (error) {
        logger.error('Error updating competitor', { error: error.message });

        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'المنافس موجود بالفعل / Competitor already exists'
            });
        }

        res.status(500).json({
            success: false,
            message: 'خطأ في تحديث المنافس / Error updating competitor',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// DELETE COMPETITOR
// ═══════════════════════════════════════════════════════════════

/**
 * Delete a competitor
 */
exports.delete = async (req, res) => {
    try {
        if (req.isDeparted) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية للوصول / Access denied'
            });
        }

        const { id } = req.params;
        const firmId = req.firmId;
        const userId = req.userID;

        // Sanitize and validate ID
        const sanitizedId = sanitizeObjectId(id);
        if (!sanitizedId) {
            return res.status(400).json({
                success: false,
                message: 'Invalid competitor ID format'
            });
        }

        // IDOR protection: verify firmId ownership
        const competitor = await Competitor.findOneAndDelete({ _id: sanitizedId, firmId });

        if (!competitor) {
            return res.status(404).json({
                success: false,
                message: 'المنافس غير موجود / Competitor not found'
            });
        }

        // Log activity
        await CrmActivity.logActivity({
            lawyerId: userId,
            type: 'competitor_deleted',
            entityType: 'competitor',
            entityId: sanitizedId,
            entityName: competitor.name,
            title: `Competitor deleted: ${competitor.name}`,
            performedBy: userId
        });

        res.json({
            success: true,
            message: 'تم حذف المنافس بنجاح / Competitor deleted successfully'
        });
    } catch (error) {
        logger.error('Error deleting competitor', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'خطأ في حذف المنافس / Error deleting competitor',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// GET TOP COMPETITORS BY LOSSES
// ═══════════════════════════════════════════════════════════════

/**
 * Get top competitors by cases lost to them
 */
exports.getTopByLosses = async (req, res) => {
    try {
        if (req.isDeparted) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية للوصول / Access denied'
            });
        }

        const firmId = req.firmId;
        const { limit = 5 } = req.query;

        const competitors = await Competitor.getTopByLosses(firmId, parseInt(limit));

        res.json({
            success: true,
            data: competitors
        });
    } catch (error) {
        logger.error('Error getting top competitors', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'خطأ في جلب أهم المنافسين / Error fetching top competitors',
            error: error.message
        });
    }
};
