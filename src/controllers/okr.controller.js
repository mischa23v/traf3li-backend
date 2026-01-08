/**
 * OKR & 9-Box Grid Controller
 *
 * Enterprise goal and talent management
 * Inspired by: Google OKR, Lattice, 15Five, Workday
 *
 * Features:
 * - OKR CRUD with cascading objectives
 * - Key result tracking
 * - Progress updates and check-ins
 * - 9-Box talent assessment
 * - Succession planning
 */

const mongoose = require('mongoose');
const { OKR, NineBoxAssessment } = require('../models/okr.model');
const Employee = require('../models/employee.model');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');
const logger = require('../utils/logger');

// Helper function to escape regex special characters
const escapeRegex = (str) => {
    if (!str || typeof str !== 'string') return '';
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

// ═══════════════════════════════════════════════════════════════
// OKR CRUD
// ═══════════════════════════════════════════════════════════════

/**
 * Get all OKRs
 * GET /api/hr/okrs
 */
const getOKRs = async (req, res) => {
    try {
        const {
            level,
            status,
            periodYear,
            periodQuarter,
            ownerId,
            departmentId,
            search,
            page = 1,
            limit = 20
        } = req.query;

        const pageNum = Math.max(1, parseInt(page) || 1);
        const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 20));

        const query = { ...req.firmQuery };

        if (level) query.level = level;
        if (status) query.status = status;
        if (periodYear) query.periodYear = parseInt(periodYear);
        if (periodQuarter) query.periodQuarter = parseInt(periodQuarter);
        if (ownerId) query.ownerId = sanitizeObjectId(ownerId);
        if (departmentId) query.departmentId = sanitizeObjectId(departmentId);

        if (search) {
            const escapedSearch = escapeRegex(search);
            query.$or = [
                { title: { $regex: escapedSearch, $options: 'i' } },
                { titleAr: { $regex: escapedSearch, $options: 'i' } },
                { okrId: { $regex: escapedSearch, $options: 'i' } }
            ];
        }

        const [okrs, total] = await Promise.all([
            OKR.find(query)
                .populate('ownerId', 'personalInfo.fullNameEnglish personalInfo.fullNameArabic employeeId')
                .populate('parentOkrId', 'okrId title')
                .sort({ level: 1, createdAt: -1 })
                .skip((pageNum - 1) * limitNum)
                .limit(limitNum)
                .lean(),
            OKR.countDocuments(query)
        ]);

        res.json({
            success: true,
            data: okrs,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                pages: Math.ceil(total / limitNum)
            }
        });
    } catch (error) {
        logger.error('Error fetching OKRs:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في جلب الأهداف / Error fetching OKRs',
            error: error.message
        });
    }
};

/**
 * Get single OKR
 * GET /api/hr/okrs/:id
 */
const getOKRById = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            return res.status(400).json({
                success: false,
                message: 'معرف الهدف غير صالح / Invalid OKR ID'
            });
        }

        const okr = await OKR.findOne({
            _id: sanitizedId,
            ...req.firmQuery
        })
        .populate('ownerId', 'personalInfo employeeId')
        .populate('parentOkrId', 'okrId title titleAr level')
        .populate('childOkrIds', 'okrId title titleAr level overallProgress status');

        if (!okr) {
            return res.status(404).json({
                success: false,
                message: 'الهدف غير موجود / OKR not found'
            });
        }

        res.json({
            success: true,
            data: okr
        });
    } catch (error) {
        logger.error('Error fetching OKR:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في جلب الهدف / Error fetching OKR',
            error: error.message
        });
    }
};

/**
 * Create OKR
 * POST /api/hr/okrs
 */
const createOKR = async (req, res) => {
    try {
        const allowedFields = [
            'title', 'titleAr', 'description', 'descriptionAr',
            'level', 'period', 'periodYear', 'periodQuarter',
            'startDate', 'endDate', 'parentOkrId',
            'keyResults', 'ownerId', 'teamId', 'departmentId',
            'visibility', 'tags', 'category'
        ];
        const safeData = pickAllowedFields(req.body, allowedFields);

        // Validate required fields
        if (!safeData.title || !safeData.level || !safeData.period) {
            return res.status(400).json({
                success: false,
                message: 'العنوان والمستوى والفترة مطلوبة / Title, level, and period are required'
            });
        }

        // Set period year
        if (!safeData.periodYear) {
            safeData.periodYear = new Date().getFullYear();
        }

        // Set dates based on period if not provided
        if (!safeData.startDate || !safeData.endDate) {
            const year = safeData.periodYear;
            const quarter = safeData.periodQuarter || 1;

            switch (safeData.period) {
                case 'annual':
                    safeData.startDate = new Date(year, 0, 1);
                    safeData.endDate = new Date(year, 11, 31);
                    break;
                case 'semi_annual':
                    safeData.startDate = new Date(year, quarter <= 2 ? 0 : 6, 1);
                    safeData.endDate = new Date(year, quarter <= 2 ? 5 : 11, quarter <= 2 ? 30 : 31);
                    break;
                case 'quarterly':
                    const qStart = (quarter - 1) * 3;
                    safeData.startDate = new Date(year, qStart, 1);
                    safeData.endDate = new Date(year, qStart + 2 + 1, 0); // Last day of quarter
                    break;
                default:
                    safeData.startDate = safeData.startDate || new Date();
                    safeData.endDate = safeData.endDate || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
            }
        }

        // Validate key results
        if (safeData.keyResults && safeData.keyResults.length > 0) {
            for (let i = 0; i < safeData.keyResults.length; i++) {
                const kr = safeData.keyResults[i];
                if (!kr.keyResultId) kr.keyResultId = `KR${i + 1}`;
                if (!kr.title || kr.targetValue === undefined) {
                    return res.status(400).json({
                        success: false,
                        message: `النتيجة الرئيسية ${i + 1}: العنوان والقيمة المستهدفة مطلوبة`
                    });
                }
            }
        }

        // Get owner details if provided
        if (safeData.ownerId) {
            const sanitizedOwnerId = sanitizeObjectId(safeData.ownerId);
            const owner = await Employee.findOne({
                _id: sanitizedOwnerId,
                ...req.firmQuery
            }).select('personalInfo.fullNameEnglish personalInfo.fullNameArabic');

            if (owner) {
                safeData.ownerName = owner.personalInfo?.fullNameEnglish;
                safeData.ownerNameAr = owner.personalInfo?.fullNameArabic;
            }
        }

        // Validate parent OKR if provided
        if (safeData.parentOkrId) {
            const sanitizedParentId = sanitizeObjectId(safeData.parentOkrId);
            const parentOKR = await OKR.findOne({
                _id: sanitizedParentId,
                ...req.firmQuery
            });

            if (!parentOKR) {
                return res.status(404).json({
                    success: false,
                    message: 'الهدف الأب غير موجود / Parent OKR not found'
                });
            }
        }

        const okr = new OKR(req.addFirmId({
            ...safeData,
            status: 'draft',
            createdBy: req.userID
        }));

        await okr.save();

        // Update parent OKR's childOkrIds if applicable
        if (safeData.parentOkrId) {
            await OKR.findByIdAndUpdate(safeData.parentOkrId, {
                $addToSet: { childOkrIds: okr._id }
            });
        }

        res.status(201).json({
            success: true,
            message: 'تم إنشاء الهدف بنجاح / OKR created successfully',
            data: okr
        });
    } catch (error) {
        logger.error('Error creating OKR:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في إنشاء الهدف / Error creating OKR',
            error: error.message
        });
    }
};

/**
 * Update OKR
 * PATCH /api/hr/okrs/:id
 */
const updateOKR = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            return res.status(400).json({
                success: false,
                message: 'معرف الهدف غير صالح / Invalid OKR ID'
            });
        }

        const allowedFields = [
            'title', 'titleAr', 'description', 'descriptionAr',
            'keyResults', 'visibility', 'tags', 'category', 'status'
        ];
        const safeData = pickAllowedFields(req.body, allowedFields);

        const okr = await OKR.findOne({ _id: sanitizedId, ...req.firmQuery });
        if (!okr) {
            return res.status(404).json({
                success: false,
                message: 'الهدف غير موجود / OKR not found'
            });
        }

        // Cannot significantly update completed/cancelled OKRs
        if (['completed', 'cancelled'].includes(okr.status) && safeData.status !== 'active') {
            delete safeData.keyResults;
            delete safeData.title;
        }

        Object.assign(okr, safeData);
        okr.updatedBy = req.userID;
        await okr.save();

        res.json({
            success: true,
            message: 'تم تحديث الهدف بنجاح / OKR updated successfully',
            data: okr
        });
    } catch (error) {
        logger.error('Error updating OKR:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في تحديث الهدف / Error updating OKR',
            error: error.message
        });
    }
};

/**
 * Activate OKR
 * POST /api/hr/okrs/:id/activate
 */
const activateOKR = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            return res.status(400).json({
                success: false,
                message: 'معرف الهدف غير صالح / Invalid OKR ID'
            });
        }

        const okr = await OKR.findOneAndUpdate(
            { _id: sanitizedId, ...req.firmQuery, status: 'draft' },
            { $set: { status: 'active', updatedBy: req.userID } },
            { new: true }
        );

        if (!okr) {
            return res.status(404).json({
                success: false,
                message: 'الهدف غير موجود أو غير قابل للتفعيل / OKR not found or cannot be activated'
            });
        }

        res.json({
            success: true,
            message: 'تم تفعيل الهدف بنجاح / OKR activated successfully',
            data: okr
        });
    } catch (error) {
        logger.error('Error activating OKR:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في تفعيل الهدف / Error activating OKR',
            error: error.message
        });
    }
};

/**
 * Update key result progress
 * PATCH /api/hr/okrs/:id/key-results/:keyResultId
 */
const updateKeyResult = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        const { keyResultId } = req.params;

        if (!sanitizedId) {
            return res.status(400).json({
                success: false,
                message: 'معرف الهدف غير صالح / Invalid OKR ID'
            });
        }

        const allowedFields = ['currentValue', 'status', 'note'];
        const safeData = pickAllowedFields(req.body, allowedFields);

        const okr = await OKR.findOne({ _id: sanitizedId, ...req.firmQuery });
        if (!okr) {
            return res.status(404).json({
                success: false,
                message: 'الهدف غير موجود / OKR not found'
            });
        }

        const krIndex = okr.keyResults.findIndex(kr => kr.keyResultId === keyResultId);
        if (krIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'النتيجة الرئيسية غير موجودة / Key result not found'
            });
        }

        const kr = okr.keyResults[krIndex];
        const previousValue = kr.currentValue;

        // Update current value
        if (safeData.currentValue !== undefined) {
            kr.currentValue = parseFloat(safeData.currentValue);

            // Calculate progress
            const range = kr.targetValue - kr.startValue;
            if (range !== 0) {
                kr.progress = Math.min(100, Math.max(0,
                    ((kr.currentValue - kr.startValue) / range) * 100
                ));
            }

            // Update status based on progress
            if (kr.progress >= 100) {
                kr.status = 'completed';
                kr.completedDate = new Date();
            } else if (kr.progress >= 70) {
                kr.status = 'on_track';
            } else if (kr.progress >= 40) {
                kr.status = 'at_risk';
            } else {
                kr.status = 'behind';
            }

            // Add to history
            kr.updates.push({
                date: new Date(),
                previousValue,
                newValue: kr.currentValue,
                note: safeData.note,
                updatedBy: req.userID
            });
        }

        if (safeData.status && safeData.status !== kr.status) {
            kr.status = safeData.status;
        }

        okr.updatedBy = req.userID;
        await okr.save();

        res.json({
            success: true,
            message: 'تم تحديث النتيجة الرئيسية / Key result updated',
            data: {
                keyResult: kr,
                okrProgress: okr.overallProgress,
                okrStatus: okr.status
            }
        });
    } catch (error) {
        logger.error('Error updating key result:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في تحديث النتيجة الرئيسية / Error updating key result',
            error: error.message
        });
    }
};

/**
 * Add check-in
 * POST /api/hr/okrs/:id/check-in
 */
const addCheckIn = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            return res.status(400).json({
                success: false,
                message: 'معرف الهدف غير صالح / Invalid OKR ID'
            });
        }

        const allowedFields = ['summary', 'summaryAr', 'challenges', 'nextSteps'];
        const safeData = pickAllowedFields(req.body, allowedFields);

        const okr = await OKR.findOne({ _id: sanitizedId, ...req.firmQuery });
        if (!okr) {
            return res.status(404).json({
                success: false,
                message: 'الهدف غير موجود / OKR not found'
            });
        }

        okr.checkIns.push({
            date: new Date(),
            overallProgress: okr.overallProgress,
            status: okr.status,
            ...safeData,
            createdBy: req.userID
        });

        await okr.save();

        res.json({
            success: true,
            message: 'تمت إضافة التحديث بنجاح / Check-in added successfully',
            data: okr.checkIns[okr.checkIns.length - 1]
        });
    } catch (error) {
        logger.error('Error adding check-in:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في إضافة التحديث / Error adding check-in',
            error: error.message
        });
    }
};

/**
 * Delete OKR
 * DELETE /api/hr/okrs/:id
 */
const deleteOKR = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            return res.status(400).json({
                success: false,
                message: 'معرف الهدف غير صالح / Invalid OKR ID'
            });
        }

        const okr = await OKR.findOne({ _id: sanitizedId, ...req.firmQuery });
        if (!okr) {
            return res.status(404).json({
                success: false,
                message: 'الهدف غير موجود / OKR not found'
            });
        }

        // Check for child OKRs
        if (okr.childOkrIds && okr.childOkrIds.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'لا يمكن حذف الهدف لأنه يحتوي على أهداف فرعية / Cannot delete OKR with child objectives'
            });
        }

        // Remove from parent's childOkrIds
        if (okr.parentOkrId) {
            await OKR.findByIdAndUpdate(okr.parentOkrId, {
                $pull: { childOkrIds: okr._id }
            });
        }

        await okr.deleteOne();

        res.json({
            success: true,
            message: 'تم حذف الهدف بنجاح / OKR deleted successfully'
        });
    } catch (error) {
        logger.error('Error deleting OKR:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في حذف الهدف / Error deleting OKR',
            error: error.message
        });
    }
};

/**
 * Get OKR statistics
 * GET /api/hr/okrs/stats
 */
const getOKRStats = async (req, res) => {
    try {
        const { periodYear = new Date().getFullYear() } = req.query;
        const year = parseInt(periodYear);

        const match = { ...req.firmQuery, periodYear: year };
        if (match.firmId && typeof match.firmId === 'string') {
            match.firmId = new mongoose.Types.ObjectId(match.firmId);
        }
        if (match.lawyerId && typeof match.lawyerId === 'string') {
            match.lawyerId = new mongoose.Types.ObjectId(match.lawyerId);
        }

        const [statusStats, levelStats, avgProgress] = await Promise.all([
            OKR.aggregate([
                { $match: match },
                { $group: { _id: '$status', count: { $sum: 1 } } }
            ]),
            OKR.aggregate([
                { $match: match },
                { $group: { _id: '$level', count: { $sum: 1 }, avgProgress: { $avg: '$overallProgress' } } }
            ]),
            OKR.aggregate([
                { $match: { ...match, status: { $nin: ['draft', 'cancelled'] } } },
                { $group: { _id: null, avgProgress: { $avg: '$overallProgress' }, avgScore: { $avg: '$overallScore' } } }
            ])
        ]);

        res.json({
            success: true,
            data: {
                periodYear: year,
                byStatus: statusStats.map(s => ({ status: s._id, count: s.count })),
                byLevel: levelStats.map(l => ({
                    level: l._id,
                    count: l.count,
                    avgProgress: parseFloat((l.avgProgress || 0).toFixed(1))
                })),
                overall: {
                    avgProgress: avgProgress[0]?.avgProgress ? parseFloat(avgProgress[0].avgProgress.toFixed(1)) : 0,
                    avgScore: avgProgress[0]?.avgScore ? parseFloat(avgProgress[0].avgScore.toFixed(2)) : 0
                }
            }
        });
    } catch (error) {
        logger.error('Error fetching OKR stats:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في جلب إحصائيات الأهداف / Error fetching OKR statistics',
            error: error.message
        });
    }
};

/**
 * Get OKR tree (hierarchical view)
 * GET /api/hr/okrs/tree
 */
const getOKRTree = async (req, res) => {
    try {
        const { periodYear = new Date().getFullYear() } = req.query;

        // Get company-level OKRs
        const companyOKRs = await OKR.find({
            ...req.firmQuery,
            periodYear: parseInt(periodYear),
            level: 'company'
        })
        .select('okrId title titleAr level overallProgress status childOkrIds')
        .lean();

        // Build tree recursively
        const buildTree = async (okrIds) => {
            if (!okrIds || okrIds.length === 0) return [];

            const children = await OKR.find({
                _id: { $in: okrIds },
                ...req.firmQuery
            })
            .select('okrId title titleAr level overallProgress status ownerName ownerNameAr childOkrIds')
            .lean();

            for (const child of children) {
                if (child.childOkrIds && child.childOkrIds.length > 0) {
                    child.children = await buildTree(child.childOkrIds);
                }
            }

            return children;
        };

        for (const okr of companyOKRs) {
            if (okr.childOkrIds && okr.childOkrIds.length > 0) {
                okr.children = await buildTree(okr.childOkrIds);
            }
        }

        res.json({
            success: true,
            data: companyOKRs
        });
    } catch (error) {
        logger.error('Error fetching OKR tree:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في جلب شجرة الأهداف / Error fetching OKR tree',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// 9-BOX GRID ASSESSMENT
// ═══════════════════════════════════════════════════════════════

/**
 * Get 9-Box assessments
 * GET /api/hr/nine-box
 */
const getNineBoxAssessments = async (req, res) => {
    try {
        const {
            periodYear,
            boxPosition,
            isSuccessionCandidate,
            departmentId,
            page = 1,
            limit = 50
        } = req.query;

        const pageNum = Math.max(1, parseInt(page) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 50));

        const query = { ...req.firmQuery };

        if (periodYear) query.periodYear = parseInt(periodYear);
        if (boxPosition) query.boxPosition = parseInt(boxPosition);
        if (isSuccessionCandidate !== undefined) {
            query.isSuccessionCandidate = isSuccessionCandidate === 'true';
        }

        const [assessments, total] = await Promise.all([
            NineBoxAssessment.find(query)
                .populate('employeeId', 'personalInfo.fullNameEnglish personalInfo.fullNameArabic employeeId employmentDetails.department')
                .sort({ boxPosition: -1, createdAt: -1 })
                .skip((pageNum - 1) * limitNum)
                .limit(limitNum)
                .lean(),
            NineBoxAssessment.countDocuments(query)
        ]);

        res.json({
            success: true,
            data: assessments,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                pages: Math.ceil(total / limitNum)
            }
        });
    } catch (error) {
        logger.error('Error fetching 9-Box assessments:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في جلب التقييمات / Error fetching assessments',
            error: error.message
        });
    }
};

/**
 * Get 9-Box grid distribution
 * GET /api/hr/nine-box/distribution
 */
const getNineBoxDistribution = async (req, res) => {
    try {
        const { periodYear = new Date().getFullYear(), departmentId } = req.query;
        const year = parseInt(periodYear);

        const match = { ...req.firmQuery, periodYear: year };
        if (match.firmId && typeof match.firmId === 'string') {
            match.firmId = new mongoose.Types.ObjectId(match.firmId);
        }
        if (match.lawyerId && typeof match.lawyerId === 'string') {
            match.lawyerId = new mongoose.Types.ObjectId(match.lawyerId);
        }

        const distribution = await NineBoxAssessment.aggregate([
            { $match: match },
            {
                $group: {
                    _id: '$boxPosition',
                    count: { $sum: 1 },
                    employees: {
                        $push: {
                            _id: '$employeeId',
                            employeeName: '$employeeName',
                            employeeNameAr: '$employeeNameAr'
                        }
                    }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Build 9-box grid structure
        const boxLabels = {
            1: { en: 'Bad Hire', ar: 'توظيف خاطئ', performance: 'low', potential: 'low' },
            2: { en: 'Grinder', ar: 'مجتهد', performance: 'low', potential: 'moderate' },
            3: { en: 'Dilemma', ar: 'معضلة', performance: 'low', potential: 'high' },
            4: { en: 'Up or Out', ar: 'ترقية أو إنهاء', performance: 'moderate', potential: 'low' },
            5: { en: 'Core Player', ar: 'لاعب أساسي', performance: 'moderate', potential: 'moderate' },
            6: { en: 'High Potential', ar: 'إمكانات عالية', performance: 'moderate', potential: 'high' },
            7: { en: 'Solid Performer', ar: 'أداء ثابت', performance: 'high', potential: 'low' },
            8: { en: 'High Performer', ar: 'أداء عالي', performance: 'high', potential: 'moderate' },
            9: { en: 'Star', ar: 'نجم', performance: 'high', potential: 'high' }
        };

        const grid = [];
        for (let i = 1; i <= 9; i++) {
            const boxData = distribution.find(d => d._id === i);
            grid.push({
                position: i,
                label: boxLabels[i].en,
                labelAr: boxLabels[i].ar,
                performance: boxLabels[i].performance,
                potential: boxLabels[i].potential,
                count: boxData?.count || 0,
                employees: boxData?.employees || []
            });
        }

        // Calculate summary stats
        const total = distribution.reduce((sum, d) => sum + d.count, 0);
        const topTalent = distribution.filter(d => d._id >= 6).reduce((sum, d) => sum + d.count, 0);
        const underperformers = distribution.filter(d => [1, 2, 4].includes(d._id)).reduce((sum, d) => sum + d.count, 0);

        res.json({
            success: true,
            data: {
                periodYear: year,
                grid,
                summary: {
                    total,
                    topTalent,
                    topTalentPercentage: total > 0 ? parseFloat((topTalent / total * 100).toFixed(1)) : 0,
                    underperformers,
                    underperformersPercentage: total > 0 ? parseFloat((underperformers / total * 100).toFixed(1)) : 0
                }
            }
        });
    } catch (error) {
        logger.error('Error fetching 9-Box distribution:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في جلب توزيع الشبكة / Error fetching distribution',
            error: error.message
        });
    }
};

/**
 * Create or update 9-Box assessment
 * POST /api/hr/nine-box
 */
const createNineBoxAssessment = async (req, res) => {
    try {
        const allowedFields = [
            'employeeId', 'periodYear', 'periodType', 'periodQuarter',
            'performanceRating', 'performanceNotes', 'performanceNotesAr',
            'potentialRating', 'potentialNotes', 'potentialNotesAr',
            'recommendedActions', 'performanceReviewId', 'recentOkrScore',
            'skillAssessmentScore', 'isSuccessionCandidate', 'targetRoles',
            'readinessLevel', 'flightRisk'
        ];
        const safeData = pickAllowedFields(req.body, allowedFields);

        // Validate required fields
        if (!safeData.employeeId || !safeData.performanceRating || !safeData.potentialRating) {
            return res.status(400).json({
                success: false,
                message: 'الموظف وتقييم الأداء والإمكانات مطلوبة / Employee ID, performance and potential ratings are required'
            });
        }

        // Validate ratings (1-3)
        if (safeData.performanceRating < 1 || safeData.performanceRating > 3 ||
            safeData.potentialRating < 1 || safeData.potentialRating > 3) {
            return res.status(400).json({
                success: false,
                message: 'التقييمات يجب أن تكون بين 1 و 3 / Ratings must be between 1 and 3'
            });
        }

        const sanitizedEmployeeId = sanitizeObjectId(safeData.employeeId);

        // Get employee details
        const employee = await Employee.findOne({
            _id: sanitizedEmployeeId,
            ...req.firmQuery
        }).select('personalInfo.fullNameEnglish personalInfo.fullNameArabic employeeId');

        if (!employee) {
            return res.status(404).json({
                success: false,
                message: 'الموظف غير موجود / Employee not found'
            });
        }

        const periodYear = safeData.periodYear || new Date().getFullYear();

        // Check for existing assessment
        let assessment = await NineBoxAssessment.findOne({
            ...req.firmQuery,
            employeeId: sanitizedEmployeeId,
            periodYear
        });

        if (assessment) {
            // Update existing
            Object.assign(assessment, safeData);
            assessment.updatedAt = new Date();
        } else {
            // Create new
            assessment = new NineBoxAssessment(req.addFirmId({
                ...safeData,
                employeeId: sanitizedEmployeeId,
                employeeName: employee.personalInfo?.fullNameEnglish,
                employeeNameAr: employee.personalInfo?.fullNameArabic,
                employeeNumber: employee.employeeId,
                periodYear,
                assessedBy: req.userID,
                assessedDate: new Date()
            }));
        }

        await assessment.save();

        res.status(assessment.isNew ? 201 : 200).json({
            success: true,
            message: 'تم حفظ التقييم بنجاح / Assessment saved successfully',
            data: assessment
        });
    } catch (error) {
        logger.error('Error creating 9-Box assessment:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في إنشاء التقييم / Error creating assessment',
            error: error.message
        });
    }
};

/**
 * Get employee's 9-Box history
 * GET /api/hr/nine-box/employee/:employeeId
 */
const getEmployeeNineBoxHistory = async (req, res) => {
    try {
        const sanitizedEmployeeId = sanitizeObjectId(req.params.employeeId);
        if (!sanitizedEmployeeId) {
            return res.status(400).json({
                success: false,
                message: 'معرف الموظف غير صالح / Invalid employee ID'
            });
        }

        const assessments = await NineBoxAssessment.find({
            ...req.firmQuery,
            employeeId: sanitizedEmployeeId
        })
        .sort({ periodYear: -1 })
        .lean();

        // Build trend data
        const trend = assessments.map(a => ({
            period: `${a.periodYear}${a.periodQuarter ? ` Q${a.periodQuarter}` : ''}`,
            boxPosition: a.boxPosition,
            boxLabel: a.boxLabel,
            performanceRating: a.performanceRating,
            potentialRating: a.potentialRating
        })).reverse();

        res.json({
            success: true,
            data: {
                assessments,
                trend,
                currentPosition: assessments[0]?.boxPosition || null,
                currentLabel: assessments[0]?.boxLabel || null
            }
        });
    } catch (error) {
        logger.error('Error fetching employee 9-Box history:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في جلب سجل التقييمات / Error fetching assessment history',
            error: error.message
        });
    }
};

/**
 * Get succession candidates
 * GET /api/hr/nine-box/succession
 */
const getSuccessionCandidates = async (req, res) => {
    try {
        const { periodYear = new Date().getFullYear(), readinessLevel } = req.query;

        const query = {
            ...req.firmQuery,
            periodYear: parseInt(periodYear),
            isSuccessionCandidate: true
        };

        if (readinessLevel) query.readinessLevel = readinessLevel;

        const candidates = await NineBoxAssessment.find(query)
            .populate('employeeId', 'personalInfo.fullNameEnglish personalInfo.fullNameArabic employeeId employmentDetails.department employmentDetails.jobTitle')
            .sort({ boxPosition: -1, readinessLevel: 1 })
            .lean();

        res.json({
            success: true,
            data: candidates,
            total: candidates.length
        });
    } catch (error) {
        logger.error('Error fetching succession candidates:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في جلب مرشحي التعاقب / Error fetching succession candidates',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

module.exports = {
    // OKR
    getOKRs,
    getOKRById,
    createOKR,
    updateOKR,
    activateOKR,
    updateKeyResult,
    addCheckIn,
    deleteOKR,
    getOKRStats,
    getOKRTree,

    // 9-Box
    getNineBoxAssessments,
    getNineBoxDistribution,
    createNineBoxAssessment,
    getEmployeeNineBoxHistory,
    getSuccessionCandidates
};
