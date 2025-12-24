/**
 * Deal Health Controller
 *
 * Handles deal health scoring, stuck deal detection, and health analytics.
 */

const DealHealthService = require('../services/dealHealth.service');
const { sanitizeObjectId } = require('../utils/securityUtils');
const logger = require('../utils/logger');

// ═══════════════════════════════════════════════════════════════
// GET DEAL HEALTH SCORE
// ═══════════════════════════════════════════════════════════════

/**
 * Get deal health score
 * GET /api/deals/:id/health
 */
exports.getDealHealth = async (req, res) => {
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
                message: 'معرف غير صالح / Invalid deal ID'
            });
        }

        const healthData = await DealHealthService.calculateScore(sanitizedId, firmId);

        res.json({
            success: true,
            data: healthData
        });
    } catch (error) {
        logger.error('Error getting deal health:', error);

        if (error.message.includes('not found')) {
            return res.status(404).json({
                success: false,
                message: 'الصفقة غير موجودة / Deal not found',
                error: error.message
            });
        }

        res.status(500).json({
            success: false,
            message: 'خطأ في جلب صحة الصفقة / Error fetching deal health',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// REFRESH DEAL HEALTH
// ═══════════════════════════════════════════════════════════════

/**
 * Refresh deal health score
 * POST /api/deals/:id/health/refresh
 */
exports.refreshDealHealth = async (req, res) => {
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
                message: 'معرف غير صالح / Invalid deal ID'
            });
        }

        const deal = await DealHealthService.updateDealHealth(sanitizedId, firmId);

        res.json({
            success: true,
            message: 'تم تحديث صحة الصفقة بنجاح / Deal health updated successfully',
            data: deal
        });
    } catch (error) {
        logger.error('Error refreshing deal health:', error);

        if (error.message.includes('not found')) {
            return res.status(404).json({
                success: false,
                message: 'الصفقة غير موجودة / Deal not found',
                error: error.message
            });
        }

        res.status(500).json({
            success: false,
            message: 'خطأ في تحديث صحة الصفقة / Error refreshing deal health',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// GET STUCK DEALS
// ═══════════════════════════════════════════════════════════════

/**
 * Get stuck deals
 * GET /api/deals/health/stuck
 */
exports.getStuckDeals = async (req, res) => {
    try {
        if (req.isDeparted) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية للوصول / Access denied'
            });
        }

        const firmId = req.firmId;

        const stuckDeals = await DealHealthService.getStuckDeals(firmId);

        res.json({
            success: true,
            data: stuckDeals,
            count: stuckDeals.length
        });
    } catch (error) {
        logger.error('Error getting stuck deals:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في جلب الصفقات المتعثرة / Error fetching stuck deals',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// UNSTUCK DEAL
// ═══════════════════════════════════════════════════════════════

/**
 * Mark deal as not stuck
 * POST /api/deals/:id/health/unstuck
 */
exports.unstuckDeal = async (req, res) => {
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
                message: 'معرف غير صالح / Invalid deal ID'
            });
        }

        await DealHealthService.unstuckDeal(sanitizedId, firmId);

        res.json({
            success: true,
            message: 'تم إلغاء تعثر الصفقة بنجاح / Deal unstuck successfully'
        });
    } catch (error) {
        logger.error('Error unstucking deal:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في إلغاء تعثر الصفقة / Error unstucking deal',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// GET HEALTH DISTRIBUTION
// ═══════════════════════════════════════════════════════════════

/**
 * Get health distribution across all deals
 * GET /api/deals/health/distribution
 */
exports.getHealthDistribution = async (req, res) => {
    try {
        if (req.isDeparted) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية للوصول / Access denied'
            });
        }

        const firmId = req.firmId;

        const distribution = await DealHealthService.getHealthDistribution(firmId);

        res.json({
            success: true,
            data: distribution
        });
    } catch (error) {
        logger.error('Error getting health distribution:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في جلب توزيع الصحة / Error fetching health distribution',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// GET DEALS NEEDING ATTENTION
// ═══════════════════════════════════════════════════════════════

/**
 * Get deals needing attention (low health scores)
 * GET /api/deals/health/attention
 */
exports.getDealsNeedingAttention = async (req, res) => {
    try {
        if (req.isDeparted) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية للوصول / Access denied'
            });
        }

        const firmId = req.firmId;
        const { threshold } = req.query;

        // Input Validation: Validate threshold if provided
        let parsedThreshold = 60; // Default threshold
        if (threshold !== undefined) {
            parsedThreshold = parseInt(threshold);
            if (isNaN(parsedThreshold) || parsedThreshold < 0 || parsedThreshold > 100) {
                return res.status(400).json({
                    success: false,
                    message: 'عتبة غير صالحة / Invalid threshold (must be 0-100)'
                });
            }
        }

        const deals = await DealHealthService.getDealsNeedingAttention(firmId, parsedThreshold);

        res.json({
            success: true,
            data: deals,
            count: deals.length,
            threshold: parsedThreshold
        });
    } catch (error) {
        logger.error('Error getting deals needing attention:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في جلب الصفقات التي تحتاج اهتمام / Error fetching deals needing attention',
            error: error.message
        });
    }
};
