/**
 * Sales Person Controller
 *
 * Handles sales person CRUD operations, hierarchy, and performance stats.
 */

const mongoose = require('mongoose');
const SalesPerson = require('../models/salesPerson.model');
const Lead = require('../models/lead.model');
const Case = require('../models/case.model');
const CrmActivity = require('../models/crmActivity.model');

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
            query.parentSalesPersonId = parentId === 'null' ? null : parentId;
        }
        if (isGroup !== undefined) {
            query.isGroup = isGroup === 'true';
        }
        if (territoryId) {
            query.territoryIds = territoryId;
        }
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { nameAr: { $regex: search, $options: 'i' } }
            ];
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [salesPersons, total] = await Promise.all([
            SalesPerson.find(query)
                .populate('userId', 'firstName lastName avatar email')
                .populate('territoryIds', 'name nameAr')
                .sort({ level: 1, name: 1 })
                .skip(skip)
                .limit(parseInt(limit)),
            SalesPerson.countDocuments(query)
        ]);

        res.json({
            success: true,
            data: {
                salesPersons,
                total,
                page: parseInt(page),
                limit: parseInt(limit)
            }
        });
    } catch (error) {
        console.error('Error getting sales persons:', error);
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
        console.error('Error getting sales person tree:', error);
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

        const { id } = req.params;
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
        console.error('Error getting sales person:', error);
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

        const { id } = req.params;
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
            dateFilter.$gte = new Date(startDate);
        }
        if (endDate) {
            dateFilter.$lte = new Date(endDate);
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
        console.error('Error getting sales person stats:', error);
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

        const salesPersonData = {
            ...req.body,
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
        console.error('Error creating sales person:', error);
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

        const { id } = req.params;
        const firmId = req.firmId;
        const userId = req.userID;

        const salesPerson = await SalesPerson.findOneAndUpdate(
            { _id: id, firmId },
            { $set: req.body },
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
        console.error('Error updating sales person:', error);
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

        const { id } = req.params;
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
        console.error('Error deleting sales person:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في حذف مندوب المبيعات / Error deleting sales person',
            error: error.message
        });
    }
};
