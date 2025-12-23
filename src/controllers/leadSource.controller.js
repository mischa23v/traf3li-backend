/**
 * Lead Source Controller
 *
 * Handles lead source CRUD operations.
 */

const LeadSource = require('../models/leadSource.model');
const CrmActivity = require('../models/crmActivity.model');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');

// ═══════════════════════════════════════════════════════════════
// LIST LEAD SOURCES
// ═══════════════════════════════════════════════════════════════

/**
 * Get all lead sources
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
        const { enabled, search } = req.query;

        const query = { firmId };

        if (enabled !== undefined) {
            query.enabled = enabled === 'true';
        }
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { nameAr: { $regex: search, $options: 'i' } }
            ];
        }

        const sources = await LeadSource.find(query).sort({ name: 1 });

        res.json({
            success: true,
            data: sources
        });
    } catch (error) {
        console.error('Error getting lead sources:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في جلب مصادر العملاء المحتملين / Error fetching lead sources',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// GET SINGLE LEAD SOURCE
// ═══════════════════════════════════════════════════════════════

/**
 * Get lead source by ID
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

        // IDOR Protection: Sanitize and validate ObjectId
        const sanitizedId = sanitizeObjectId(id);
        if (!sanitizedId) {
            return res.status(400).json({
                success: false,
                message: 'معرف غير صالح / Invalid ID'
            });
        }

        // IDOR Protection: Verify firmId ownership
        const source = await LeadSource.findOne({ _id: sanitizedId, firmId });

        if (!source) {
            return res.status(404).json({
                success: false,
                message: 'مصدر العميل غير موجود / Lead source not found'
            });
        }

        res.json({
            success: true,
            data: source
        });
    } catch (error) {
        console.error('Error getting lead source:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في جلب مصدر العميل / Error fetching lead source',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// CREATE LEAD SOURCE
// ═══════════════════════════════════════════════════════════════

/**
 * Create a new lead source
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

        // Input Validation: Check required fields
        const { name, nameAr } = req.body;
        if (!name || typeof name !== 'string' || !name.trim()) {
            return res.status(400).json({
                success: false,
                message: 'اسم المصدر مطلوب / Lead source name is required'
            });
        }
        if (!nameAr || typeof nameAr !== 'string' || !nameAr.trim()) {
            return res.status(400).json({
                success: false,
                message: 'الاسم العربي للمصدر مطلوب / Lead source Arabic name is required'
            });
        }

        // Input Validation: Validate field lengths
        if (name.length > 100) {
            return res.status(400).json({
                success: false,
                message: 'اسم المصدر طويل جداً / Lead source name is too long (max 100 characters)'
            });
        }
        if (nameAr.length > 100) {
            return res.status(400).json({
                success: false,
                message: 'الاسم العربي للمصدر طويل جداً / Lead source Arabic name is too long (max 100 characters)'
            });
        }

        // Mass Assignment Protection: Only allow specific fields
        const allowedFields = ['name', 'nameAr', 'slug', 'description', 'utmSource', 'utmMedium', 'enabled'];
        const sanitizedData = pickAllowedFields(req.body, allowedFields);

        // Input Validation: Validate optional fields
        if (sanitizedData.description && sanitizedData.description.length > 500) {
            return res.status(400).json({
                success: false,
                message: 'الوصف طويل جداً / Description is too long (max 500 characters)'
            });
        }
        if (sanitizedData.utmSource && sanitizedData.utmSource.length > 50) {
            return res.status(400).json({
                success: false,
                message: 'UTM source is too long (max 50 characters)'
            });
        }
        if (sanitizedData.utmMedium && sanitizedData.utmMedium.length > 50) {
            return res.status(400).json({
                success: false,
                message: 'UTM medium is too long (max 50 characters)'
            });
        }
        if (sanitizedData.enabled !== undefined && typeof sanitizedData.enabled !== 'boolean') {
            return res.status(400).json({
                success: false,
                message: 'حقل التفعيل يجب أن يكون قيمة منطقية / Enabled field must be a boolean'
            });
        }

        const sourceData = {
            ...sanitizedData,
            firmId
        };

        const source = await LeadSource.create(sourceData);

        // Log activity
        await CrmActivity.logActivity({
            lawyerId: userId,
            type: 'lead_source_created',
            entityType: 'lead_source',
            entityId: source._id,
            entityName: source.name,
            title: `Lead source created: ${source.name}`,
            performedBy: userId
        });

        res.status(201).json({
            success: true,
            message: 'تم إنشاء مصدر العميل بنجاح / Lead source created successfully',
            data: source
        });
    } catch (error) {
        console.error('Error creating lead source:', error);

        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'مصدر العميل موجود بالفعل / Lead source already exists'
            });
        }

        res.status(500).json({
            success: false,
            message: 'خطأ في إنشاء مصدر العميل / Error creating lead source',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// UPDATE LEAD SOURCE
// ═══════════════════════════════════════════════════════════════

/**
 * Update a lead source
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

        // IDOR Protection: Sanitize and validate ObjectId
        const sanitizedId = sanitizeObjectId(id);
        if (!sanitizedId) {
            return res.status(400).json({
                success: false,
                message: 'معرف غير صالح / Invalid ID'
            });
        }

        // Mass Assignment Protection: Only allow specific fields
        const allowedFields = ['name', 'nameAr', 'slug', 'description', 'utmSource', 'utmMedium', 'enabled'];
        const sanitizedData = pickAllowedFields(req.body, allowedFields);

        // Input Validation: Validate field types and lengths
        if (sanitizedData.name !== undefined) {
            if (typeof sanitizedData.name !== 'string' || !sanitizedData.name.trim()) {
                return res.status(400).json({
                    success: false,
                    message: 'اسم المصدر غير صالح / Invalid lead source name'
                });
            }
            if (sanitizedData.name.length > 100) {
                return res.status(400).json({
                    success: false,
                    message: 'اسم المصدر طويل جداً / Lead source name is too long (max 100 characters)'
                });
            }
        }
        if (sanitizedData.nameAr !== undefined) {
            if (typeof sanitizedData.nameAr !== 'string' || !sanitizedData.nameAr.trim()) {
                return res.status(400).json({
                    success: false,
                    message: 'الاسم العربي للمصدر غير صالح / Invalid lead source Arabic name'
                });
            }
            if (sanitizedData.nameAr.length > 100) {
                return res.status(400).json({
                    success: false,
                    message: 'الاسم العربي للمصدر طويل جداً / Lead source Arabic name is too long (max 100 characters)'
                });
            }
        }
        if (sanitizedData.description !== undefined && sanitizedData.description.length > 500) {
            return res.status(400).json({
                success: false,
                message: 'الوصف طويل جداً / Description is too long (max 500 characters)'
            });
        }
        if (sanitizedData.utmSource !== undefined && sanitizedData.utmSource.length > 50) {
            return res.status(400).json({
                success: false,
                message: 'UTM source is too long (max 50 characters)'
            });
        }
        if (sanitizedData.utmMedium !== undefined && sanitizedData.utmMedium.length > 50) {
            return res.status(400).json({
                success: false,
                message: 'UTM medium is too long (max 50 characters)'
            });
        }
        if (sanitizedData.enabled !== undefined && typeof sanitizedData.enabled !== 'boolean') {
            return res.status(400).json({
                success: false,
                message: 'حقل التفعيل يجب أن يكون قيمة منطقية / Enabled field must be a boolean'
            });
        }

        // IDOR Protection: Verify firmId ownership
        const source = await LeadSource.findOneAndUpdate(
            { _id: sanitizedId, firmId },
            { $set: sanitizedData },
            { new: true, runValidators: true }
        );

        if (!source) {
            return res.status(404).json({
                success: false,
                message: 'مصدر العميل غير موجود / Lead source not found'
            });
        }

        // Log activity
        await CrmActivity.logActivity({
            lawyerId: userId,
            type: 'lead_source_updated',
            entityType: 'lead_source',
            entityId: source._id,
            entityName: source.name,
            title: `Lead source updated: ${source.name}`,
            performedBy: userId
        });

        res.json({
            success: true,
            message: 'تم تحديث مصدر العميل بنجاح / Lead source updated successfully',
            data: source
        });
    } catch (error) {
        console.error('Error updating lead source:', error);

        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'مصدر العميل موجود بالفعل / Lead source already exists'
            });
        }

        res.status(500).json({
            success: false,
            message: 'خطأ في تحديث مصدر العميل / Error updating lead source',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// DELETE LEAD SOURCE
// ═══════════════════════════════════════════════════════════════

/**
 * Delete a lead source
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

        // IDOR Protection: Sanitize and validate ObjectId
        const sanitizedId = sanitizeObjectId(id);
        if (!sanitizedId) {
            return res.status(400).json({
                success: false,
                message: 'معرف غير صالح / Invalid ID'
            });
        }

        // IDOR Protection: Verify firmId ownership
        const source = await LeadSource.findOneAndDelete({ _id: sanitizedId, firmId });

        if (!source) {
            return res.status(404).json({
                success: false,
                message: 'مصدر العميل غير موجود / Lead source not found'
            });
        }

        // Log activity
        await CrmActivity.logActivity({
            lawyerId: userId,
            type: 'lead_source_deleted',
            entityType: 'lead_source',
            entityId: sanitizedId,
            entityName: source.name,
            title: `Lead source deleted: ${source.name}`,
            performedBy: userId
        });

        res.json({
            success: true,
            message: 'تم حذف مصدر العميل بنجاح / Lead source deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting lead source:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في حذف مصدر العميل / Error deleting lead source',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// INITIALIZE DEFAULTS
// ═══════════════════════════════════════════════════════════════

/**
 * Create default lead sources for a firm
 */
exports.createDefaults = async (req, res) => {
    try {
        if (req.isDeparted) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية للوصول / Access denied'
            });
        }

        const firmId = req.firmId;

        await LeadSource.createDefaults(firmId);

        const sources = await LeadSource.find({ firmId }).sort({ name: 1 });

        res.json({
            success: true,
            message: 'تم إنشاء مصادر العملاء الافتراضية / Default lead sources created',
            data: sources
        });
    } catch (error) {
        console.error('Error creating default lead sources:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في إنشاء مصادر العملاء الافتراضية / Error creating defaults',
            error: error.message
        });
    }
};
