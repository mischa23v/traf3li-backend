/**
 * Sales Person Controller
 *
 * Handles sales person CRUD operations, hierarchy, and performance stats.
 */

const mongoose = require('mongoose');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');
const SalesPerson = require('../models/salesPerson.model');
const Lead = require('../models/lead.model');
const Case = require('../models/case.model');
const CrmActivity = require('../models/crmActivity.model');
const logger = require('../utils/logger');

// ═══════════════════════════════════════════════════════════════
// LIST SALES PERSONS
// ═══════════════════════════════════════════════════════════════

/**
 * Get all sales persons with filters
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
        const {
            enabled,
            parentId,
            isGroup,
            territoryId,
            search,
            page = 1,
            limit = 50
        } = req.query;

        const query = { firmId };

        if (enabled !== undefined) {
            query.enabled = enabled === 'true';
        }
        if (parentId) {
            query.parentSalesPersonId = parentId === 'null' ? null : sanitizeObjectId(parentId);
        }
        if (isGroup !== undefined) {
            query.isGroup = isGroup === 'true';
        }
        if (territoryId) {
            query.territoryIds = sanitizeObjectId(territoryId);
        }
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { nameAr: { $regex: search, $options: 'i' } }
            ];
        }

        // Validate pagination
        const pageNum = Math.max(1, parseInt(page) || 1);
        const limitNum = Math.min(Math.max(1, parseInt(limit) || 50), 100);
        const skip = (pageNum - 1) * limitNum;

        const [salesPersons, total] = await Promise.all([
            SalesPerson.find(query)
                .populate('userId', 'firstName lastName avatar email')
                .populate('territoryIds', 'name nameAr')
                .sort({ level: 1, name: 1 })
                .skip(skip)
                .limit(limitNum),
            SalesPerson.countDocuments(query)
        ]);

        res.json({
            success: true,
            data: {
                salesPersons,
                total,
                page: pageNum,
                limit: limitNum
            }
        });
    } catch (error) {
        logger.error('Error getting sales persons:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في جلب مندوبي المبيعات / Error fetching sales persons',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// GET SALES PERSON TREE
// ═══════════════════════════════════════════════════════════════

/**
 * Get sales persons in hierarchical tree structure
 */
exports.getTree = async (req, res) => {
    try {
        if (req.isDeparted) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية للوصول / Access denied'
            });
        }

        const firmId = req.firmId;
        const enabledOnly = req.query.enabledOnly !== 'false';

        const tree = await SalesPerson.getTree(firmId, enabledOnly);

        res.json({
            success: true,
            data: tree
        });
    } catch (error) {
        logger.error('Error getting sales person tree:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في جلب شجرة مندوبي المبيعات / Error fetching sales person tree',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// GET SINGLE SALES PERSON
// ═══════════════════════════════════════════════════════════════

/**
 * Get sales person by ID
 */
exports.getById = async (req, res) => {
    try {
        if (req.isDeparted) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية للوصول / Access denied'
            });
        }

        const id = sanitizeObjectId(req.params.id);
        const firmId = req.firmId;

        const salesPerson = await SalesPerson.findOne({ _id: id, firmId })
            .populate('userId', 'firstName lastName avatar email')
            .populate('employeeId', 'firstName lastName employeeId')
            .populate('territoryIds', 'name nameAr')
            .populate('parentSalesPersonId', 'name nameAr');

        if (!salesPerson) {
            return res.status(404).json({
                success: false,
                message: 'مندوب المبيعات غير موجود / Sales person not found'
            });
        }

        res.json({
            success: true,
            data: salesPerson
        });
    } catch (error) {
        logger.error('Error getting sales person:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في جلب مندوب المبيعات / Error fetching sales person',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// GET SALES PERSON STATS
// ═══════════════════════════════════════════════════════════════

/**
 * Get performance statistics for a sales person
 */
exports.getStats = async (req, res) => {
    try {
        if (req.isDeparted) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية للوصول / Access denied'
            });
        }

        const id = sanitizeObjectId(req.params.id);
        const firmId = req.firmId;
        const { startDate, endDate } = req.query;

        const salesPerson = await SalesPerson.findOne({ _id: id, firmId });
        if (!salesPerson) {
            return res.status(404).json({
                success: false,
                message: 'مندوب المبيعات غير موجود / Sales person not found'
            });
        }

        const dateFilter = {};
        if (startDate) {
            const start = new Date(startDate);
            if (isNaN(start.getTime())) {
                return res.status(400).json({
                    success: false,
                    message: 'تاريخ البداية غير صالح / Invalid start date'
                });
            }
            dateFilter.$gte = start;
        }
        if (endDate) {
            const end = new Date(endDate);
            if (isNaN(end.getTime())) {
                return res.status(400).json({
                    success: false,
                    message: 'تاريخ النهاية غير صالح / Invalid end date'
                });
            }
            dateFilter.$lte = end;
        }

        // Get lead stats
        const leadQuery = {
            firmId,
            salesPersonId: new mongoose.Types.ObjectId(id)
        };
        if (Object.keys(dateFilter).length > 0) {
            leadQuery.createdAt = dateFilter;
        }

        const [leadStats] = await Lead.aggregate([
            { $match: leadQuery },
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    converted: {
                        $sum: {
                            $cond: [{ $ne: ['$cases', []] }, 1, 0]
                        }
                    },
                    avgResponseTime: { $avg: '$firstResponseTime' }
                }
            }
        ]);

        // Get case stats
        const caseQuery = {
            firmId,
            salesPersonId: new mongoose.Types.ObjectId(id)
        };
        if (Object.keys(dateFilter).length > 0) {
            caseQuery.createdAt = dateFilter;
        }

        const caseStats = await Case.aggregate([
            { $match: caseQuery },
            {
                $group: {
                    _id: '$crmStatus',
                    count: { $sum: 1 },
                    value: { $sum: '$estimatedValue' }
                }
            }
        ]);

        // Process case stats
        const casesByStatus = {};
        let totalCases = 0;
        let totalValue = 0;
        let wonCases = 0;
        let wonValue = 0;
        let lostCases = 0;
        let openCases = 0;

        caseStats.forEach(stat => {
            casesByStatus[stat._id] = stat;
            totalCases += stat.count;
            totalValue += stat.value || 0;

            if (stat._id === 'won') {
                wonCases = stat.count;
                wonValue = stat.value || 0;
            } else if (stat._id === 'lost') {
                lostCases = stat.count;
            } else if (['intake', 'conflict_check', 'qualified', 'proposal_sent', 'negotiation'].includes(stat._id)) {
                openCases += stat.count;
            }
        });

        // Get target for current year
        const currentYear = new Date().getFullYear();
        const target = salesPerson.getTarget(currentYear);

        const stats = {
            salesPersonId: id,
            period: {
                start: startDate || 'all time',
                end: endDate || 'now'
            },
            leads: {
                total: leadStats?.total || 0,
                converted: leadStats?.converted || 0,
                conversionRate: leadStats?.total > 0
                    ? Math.round((leadStats.converted / leadStats.total) * 100)
                    : 0
            },
            cases: {
                total: totalCases,
                won: wonCases,
                lost: lostCases,
                open: openCases,
                winRate: wonCases + lostCases > 0
                    ? Math.round((wonCases / (wonCases + lostCases)) * 100)
                    : 0,
                totalValue,
                wonValue
            },
            targets: target ? {
                amount: {
                    target: target.targetAmount,
                    achieved: target.achievedAmount,
                    percentage: target.targetAmount > 0
                        ? Math.round((target.achievedAmount / target.targetAmount) * 100)
                        : 0
                },
                leads: {
                    target: target.targetLeads,
                    achieved: target.achievedLeads,
                    percentage: target.targetLeads > 0
                        ? Math.round((target.achievedLeads / target.targetLeads) * 100)
                        : 0
                },
                cases: {
                    target: target.targetCases,
                    achieved: target.achievedCases,
                    percentage: target.targetCases > 0
                        ? Math.round((target.achievedCases / target.targetCases) * 100)
                        : 0
                }
            } : null,
            avgResponseTime: leadStats?.avgResponseTime || 0,
            avgDealSize: wonCases > 0 ? Math.round(wonValue / wonCases) : 0
        };

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        logger.error('Error getting sales person stats:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في جلب إحصائيات مندوب المبيعات / Error fetching stats',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// CREATE SALES PERSON
// ═══════════════════════════════════════════════════════════════

/**
 * Create a new sales person
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

        // Define allowed fields for mass assignment protection
        const allowedFields = [
            'name',
            'nameAr',
            'userId',
            'employeeId',
            'isGroup',
            'parentSalesPersonId',
            'level',
            'commissionRate',
            'territoryIds',
            'enabled',
            'salesTargets',
            'email',
            'phone',
            'description',
            'descriptionAr'
        ];

        const sanitizedData = pickAllowedFields(req.body, allowedFields);

        // Validate required fields
        if (!sanitizedData.name) {
            return res.status(400).json({
                success: false,
                message: 'الاسم مطلوب / Name is required'
            });
        }

        // Sanitize ObjectId fields
        if (sanitizedData.userId) {
            sanitizedData.userId = sanitizeObjectId(sanitizedData.userId);
        }
        if (sanitizedData.employeeId) {
            sanitizedData.employeeId = sanitizeObjectId(sanitizedData.employeeId);
        }
        if (sanitizedData.parentSalesPersonId) {
            sanitizedData.parentSalesPersonId = sanitizeObjectId(sanitizedData.parentSalesPersonId);
        }
        if (sanitizedData.territoryIds && Array.isArray(sanitizedData.territoryIds)) {
            sanitizedData.territoryIds = sanitizedData.territoryIds.map(id => sanitizeObjectId(id));
        }

        // Validate commission rate
        if (sanitizedData.commissionRate !== undefined) {
            const rate = parseFloat(sanitizedData.commissionRate);
            if (isNaN(rate) || rate < 0 || rate > 100) {
                return res.status(400).json({
                    success: false,
                    message: 'معدل العمولة يجب أن يكون بين 0 و 100 / Commission rate must be between 0 and 100'
                });
            }
            sanitizedData.commissionRate = rate;
        }

        // Validate level
        if (sanitizedData.level !== undefined) {
            const level = parseInt(sanitizedData.level);
            if (isNaN(level) || level < 0) {
                return res.status(400).json({
                    success: false,
                    message: 'المستوى يجب أن يكون رقماً موجباً / Level must be a positive number'
                });
            }
            sanitizedData.level = level;
        }

        const salesPersonData = {
            ...sanitizedData,
            firmId
        };

        const salesPerson = await SalesPerson.create(salesPersonData);

        // Log activity
        await CrmActivity.logActivity({
            lawyerId: userId,
            type: 'sales_person_created',
            entityType: 'sales_person',
            entityId: salesPerson._id,
            entityName: salesPerson.name,
            title: `Sales person created: ${salesPerson.name}`,
            performedBy: userId
        });

        res.status(201).json({
            success: true,
            message: 'تم إنشاء مندوب المبيعات بنجاح / Sales person created successfully',
            data: salesPerson
        });
    } catch (error) {
        logger.error('Error creating sales person:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في إنشاء مندوب المبيعات / Error creating sales person',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// UPDATE SALES PERSON
// ═══════════════════════════════════════════════════════════════

/**
 * Update a sales person
 */
exports.update = async (req, res) => {
    try {
        if (req.isDeparted) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية للوصول / Access denied'
            });
        }

        const id = sanitizeObjectId(req.params.id);
        const firmId = req.firmId;
        const userId = req.userID;

        // Define allowed fields for mass assignment protection
        const allowedFields = [
            'name',
            'nameAr',
            'userId',
            'employeeId',
            'isGroup',
            'parentSalesPersonId',
            'level',
            'commissionRate',
            'territoryIds',
            'enabled',
            'salesTargets',
            'email',
            'phone',
            'description',
            'descriptionAr'
        ];

        const sanitizedData = pickAllowedFields(req.body, allowedFields);

        // Sanitize ObjectId fields
        if (sanitizedData.userId) {
            sanitizedData.userId = sanitizeObjectId(sanitizedData.userId);
        }
        if (sanitizedData.employeeId) {
            sanitizedData.employeeId = sanitizeObjectId(sanitizedData.employeeId);
        }
        if (sanitizedData.parentSalesPersonId) {
            sanitizedData.parentSalesPersonId = sanitizeObjectId(sanitizedData.parentSalesPersonId);
        }
        if (sanitizedData.territoryIds && Array.isArray(sanitizedData.territoryIds)) {
            sanitizedData.territoryIds = sanitizedData.territoryIds.map(tid => sanitizeObjectId(tid));
        }

        // Validate commission rate
        if (sanitizedData.commissionRate !== undefined) {
            const rate = parseFloat(sanitizedData.commissionRate);
            if (isNaN(rate) || rate < 0 || rate > 100) {
                return res.status(400).json({
                    success: false,
                    message: 'معدل العمولة يجب أن يكون بين 0 و 100 / Commission rate must be between 0 and 100'
                });
            }
            sanitizedData.commissionRate = rate;
        }

        // Validate level
        if (sanitizedData.level !== undefined) {
            const level = parseInt(sanitizedData.level);
            if (isNaN(level) || level < 0) {
                return res.status(400).json({
                    success: false,
                    message: 'المستوى يجب أن يكون رقماً موجباً / Level must be a positive number'
                });
            }
            sanitizedData.level = level;
        }

        const salesPerson = await SalesPerson.findOneAndUpdate(
            { _id: id, firmId },
            { $set: sanitizedData },
            { new: true, runValidators: true }
        );

        if (!salesPerson) {
            return res.status(404).json({
                success: false,
                message: 'مندوب المبيعات غير موجود / Sales person not found'
            });
        }

        // Log activity
        await CrmActivity.logActivity({
            lawyerId: userId,
            type: 'sales_person_updated',
            entityType: 'sales_person',
            entityId: salesPerson._id,
            entityName: salesPerson.name,
            title: `Sales person updated: ${salesPerson.name}`,
            performedBy: userId
        });

        res.json({
            success: true,
            message: 'تم تحديث مندوب المبيعات بنجاح / Sales person updated successfully',
            data: salesPerson
        });
    } catch (error) {
        logger.error('Error updating sales person:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في تحديث مندوب المبيعات / Error updating sales person',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// DELETE SALES PERSON
// ═══════════════════════════════════════════════════════════════

/**
 * Delete a sales person
 */
exports.delete = async (req, res) => {
    try {
        if (req.isDeparted) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية للوصول / Access denied'
            });
        }

        const id = sanitizeObjectId(req.params.id);
        const firmId = req.firmId;
        const userId = req.userID;

        // Check for subordinates
        const hasSubordinates = await SalesPerson.exists({
            firmId,
            parentSalesPersonId: id
        });

        if (hasSubordinates) {
            return res.status(400).json({
                success: false,
                message: 'لا يمكن حذف مندوب مبيعات لديه مرؤوسين / Cannot delete sales person with subordinates'
            });
        }

        const salesPerson = await SalesPerson.findOneAndDelete({ _id: id, firmId });

        if (!salesPerson) {
            return res.status(404).json({
                success: false,
                message: 'مندوب المبيعات غير موجود / Sales person not found'
            });
        }

        // Log activity
        await CrmActivity.logActivity({
            lawyerId: userId,
            type: 'sales_person_deleted',
            entityType: 'sales_person',
            entityId: id,
            entityName: salesPerson.name,
            title: `Sales person deleted: ${salesPerson.name}`,
            performedBy: userId
        });

        res.json({
            success: true,
            message: 'تم حذف مندوب المبيعات بنجاح / Sales person deleted successfully'
        });
    } catch (error) {
        logger.error('Error deleting sales person:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في حذف مندوب المبيعات / Error deleting sales person',
            error: error.message
        });
    }
};
