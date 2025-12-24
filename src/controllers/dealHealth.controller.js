/**
 * Deal Health Controller
 *
 * Handles deal health scoring, stuck deal detection, and health analytics.
 */

const DealHealthService = require('../services/dealHealth.service');
const { sanitizeObjectId } = require('../utils/securityUtils');
const logger = require('../utils/logger');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');

// ═══════════════════════════════════════════════════════════════
// GET DEAL HEALTH SCORE
// ═══════════════════════════════════════════════════════════════

/**
 * Get deal health score
 * GET /api/deals/:id/health
 */
exports.getDealHealth = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw new CustomException('ليس لديك صلاحية للوصول / Access denied', 403);
    }

    const { id } = req.params;
    const firmId = req.firmId;

    // IDOR Protection: Sanitize and validate ObjectId
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw new CustomException('معرف غير صالح / Invalid deal ID', 400);
    }

    const healthData = await DealHealthService.calculateScore(sanitizedId, firmId);

    res.json({
        success: true,
        data: healthData
    });
});

// ═══════════════════════════════════════════════════════════════
// REFRESH DEAL HEALTH
// ═══════════════════════════════════════════════════════════════

/**
 * Refresh deal health score
 * POST /api/deals/:id/health/refresh
 */
exports.refreshDealHealth = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw new CustomException('ليس لديك صلاحية للوصول / Access denied', 403);
    }

    const { id } = req.params;
    const firmId = req.firmId;

    // IDOR Protection: Sanitize and validate ObjectId
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw new CustomException('معرف غير صالح / Invalid deal ID', 400);
    }

    const deal = await DealHealthService.updateDealHealth(sanitizedId, firmId);

    res.json({
        success: true,
        message: 'تم تحديث صحة الصفقة بنجاح / Deal health updated successfully',
        data: deal
    });
});

// ═══════════════════════════════════════════════════════════════
// GET STUCK DEALS
// ═══════════════════════════════════════════════════════════════

/**
 * Get stuck deals
 * GET /api/deals/health/stuck
 */
exports.getStuckDeals = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw new CustomException('ليس لديك صلاحية للوصول / Access denied', 403);
    }

    const firmId = req.firmId;

    const stuckDeals = await DealHealthService.getStuckDeals(firmId);

    res.json({
        success: true,
        data: stuckDeals,
        count: stuckDeals.length
    });
});

// ═══════════════════════════════════════════════════════════════
// UNSTUCK DEAL
// ═══════════════════════════════════════════════════════════════

/**
 * Mark deal as not stuck
 * POST /api/deals/:id/health/unstuck
 */
exports.unstuckDeal = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw new CustomException('ليس لديك صلاحية للوصول / Access denied', 403);
    }

    const { id } = req.params;
    const firmId = req.firmId;

    // IDOR Protection: Sanitize and validate ObjectId
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw new CustomException('معرف غير صالح / Invalid deal ID', 400);
    }

    await DealHealthService.unstuckDeal(sanitizedId, firmId);

    res.json({
        success: true,
        message: 'تم إلغاء تعثر الصفقة بنجاح / Deal unstuck successfully'
    });
});

// ═══════════════════════════════════════════════════════════════
// GET HEALTH DISTRIBUTION
// ═══════════════════════════════════════════════════════════════

/**
 * Get health distribution across all deals
 * GET /api/deals/health/distribution
 */
exports.getHealthDistribution = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw new CustomException('ليس لديك صلاحية للوصول / Access denied', 403);
    }

    const firmId = req.firmId;

    const distribution = await DealHealthService.getHealthDistribution(firmId);

    res.json({
        success: true,
        data: distribution
    });
});

// ═══════════════════════════════════════════════════════════════
// GET DEALS NEEDING ATTENTION
// ═══════════════════════════════════════════════════════════════

/**
 * Get deals needing attention (low health scores)
 * GET /api/deals/health/attention
 */
exports.getDealsNeedingAttention = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw new CustomException('ليس لديك صلاحية للوصول / Access denied', 403);
    }

    const firmId = req.firmId;
    const { threshold } = req.query;

    // Input Validation: Validate threshold if provided
    let parsedThreshold = 60; // Default threshold
    if (threshold !== undefined) {
        parsedThreshold = parseInt(threshold);
        if (isNaN(parsedThreshold) || parsedThreshold < 0 || parsedThreshold > 100) {
            throw new CustomException('عتبة غير صالحة / Invalid threshold (must be 0-100)', 400);
        }
    }

    const deals = await DealHealthService.getDealsNeedingAttention(firmId, parsedThreshold);

    res.json({
        success: true,
        data: deals,
        count: deals.length,
        threshold: parsedThreshold
    });
});
