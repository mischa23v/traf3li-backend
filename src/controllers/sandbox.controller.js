/**
 * Sandbox Controller
 *
 * Handles HTTP requests for sandbox/demo environment management
 */

const sandboxService = require('../services/sandbox.service');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');
const logger = require('../utils/logger');

/**
 * Create sandbox environment
 * POST /api/sandbox
 */
exports.createSandbox = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const {
        templateId = 'basic_law_firm',
        dataProfile = 'sample_data',
        expirationDays = 7,
        firmName
    } = req.body;

    // Validate template
    const validTemplates = ['empty', 'basic_law_firm', 'corporate_legal', 'solo_practitioner', 'full_demo'];
    if (!validTemplates.includes(templateId)) {
        throw new CustomException('Invalid template ID', 400);
    }

    // Validate data profile
    const validProfiles = ['empty', 'sample_data', 'full_demo'];
    if (!validProfiles.includes(dataProfile)) {
        throw new CustomException('Invalid data profile', 400);
    }

    // Validate expiration days (max 30 days)
    if (expirationDays < 1 || expirationDays > 30) {
        throw new CustomException('Expiration days must be between 1 and 30', 400);
    }

    const result = await sandboxService.createSandbox(userId, {
        templateId,
        dataProfile,
        expirationDays,
        firmName
    });

    logger.info(`[Sandbox] User ${userId} created sandbox ${result.sandbox._id}`);

    res.status(201).json({
        success: true,
        message: 'Sandbox environment created successfully',
        data: result
    });
});

/**
 * Get user's sandbox
 * GET /api/sandbox
 */
exports.getSandbox = asyncHandler(async (req, res) => {
    const userId = req.user.id;

    const sandbox = await sandboxService.getSandbox(userId);

    if (!sandbox) {
        return res.status(404).json({
            success: false,
            message: 'No active sandbox found'
        });
    }

    res.json({
        success: true,
        data: sandbox
    });
});

/**
 * Reset sandbox to initial state
 * POST /api/sandbox/:id/reset
 */
exports.resetSandbox = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    // Verify ownership
    const sandbox = await sandboxService.getSandbox(userId);
    if (!sandbox || sandbox._id.toString() !== id) {
        throw new CustomException('Sandbox not found or access denied', 404);
    }

    const result = await sandboxService.resetSandbox(id);

    logger.info(`[Sandbox] User ${userId} reset sandbox ${id}`);

    res.json({
        success: true,
        message: 'Sandbox reset successfully',
        data: result
    });
});

/**
 * Delete sandbox
 * DELETE /api/sandbox/:id
 */
exports.deleteSandbox = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    // Verify ownership
    const sandbox = await sandboxService.getSandbox(userId);
    if (!sandbox || sandbox._id.toString() !== id) {
        throw new CustomException('Sandbox not found or access denied', 404);
    }

    const result = await sandboxService.deleteSandbox(id, 'user_requested');

    logger.info(`[Sandbox] User ${userId} deleted sandbox ${id}`);

    res.json({
        success: true,
        message: 'Sandbox deleted successfully',
        data: result
    });
});

/**
 * Extend sandbox expiration
 * POST /api/sandbox/:id/extend
 */
exports.extendSandbox = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { days = 7 } = req.body;
    const userId = req.user.id;

    // Verify ownership
    const sandbox = await sandboxService.getSandbox(userId);
    if (!sandbox || sandbox._id.toString() !== id) {
        throw new CustomException('Sandbox not found or access denied', 404);
    }

    // Validate days (max 14 days extension)
    if (days < 1 || days > 14) {
        throw new CustomException('Extension days must be between 1 and 14', 400);
    }

    const result = await sandboxService.extendSandbox(id, days);

    logger.info(`[Sandbox] User ${userId} extended sandbox ${id} by ${days} days`);

    res.json({
        success: true,
        message: `Sandbox extended by ${days} days`,
        data: result
    });
});

/**
 * Get sandbox statistics (admin only)
 * GET /api/sandbox/stats
 */
exports.getSandboxStats = asyncHandler(async (req, res) => {
    // TODO: Add admin role check
    // if (req.user.role !== 'admin') {
    //     throw new CustomException('Access denied', 403);
    // }

    const stats = await sandboxService.getSandboxStats();

    res.json({
        success: true,
        data: stats
    });
});

/**
 * Clone sandbox to production firm
 * POST /api/sandbox/:id/clone
 */
exports.cloneSandboxToProduction = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { targetFirmId } = req.body;
    const userId = req.user.id;

    if (!targetFirmId) {
        throw new CustomException('Target firm ID is required', 400);
    }

    // Verify ownership
    const sandbox = await sandboxService.getSandbox(userId);
    if (!sandbox || sandbox._id.toString() !== id) {
        throw new CustomException('Sandbox not found or access denied', 404);
    }

    // TODO: Verify user has access to target firm
    // For now, we'll allow it

    const result = await sandboxService.cloneSandboxToProduction(id, targetFirmId);

    logger.info(`[Sandbox] User ${userId} cloned sandbox ${id} to firm ${targetFirmId}`);

    res.json({
        success: true,
        message: 'Sandbox configuration cloned successfully',
        data: result
    });
});

/**
 * Get sandbox templates
 * GET /api/sandbox/templates
 */
exports.getTemplates = asyncHandler(async (req, res) => {
    const templates = [
        {
            id: 'empty',
            name: 'بيئة فارغة',
            nameEn: 'Empty Environment',
            description: 'بيئة فارغة بدون بيانات تجريبية',
            descriptionEn: 'Empty environment without sample data',
            dataProfile: 'empty',
            estimatedItems: {
                clients: 0,
                cases: 0,
                invoices: 0
            }
        },
        {
            id: 'solo_practitioner',
            name: 'محامي فردي',
            nameEn: 'Solo Practitioner',
            description: 'بيئة مناسبة للمحامي المستقل',
            descriptionEn: 'Environment for solo practitioner',
            dataProfile: 'sample_data',
            estimatedItems: {
                clients: 5,
                cases: 3,
                invoices: 8
            }
        },
        {
            id: 'basic_law_firm',
            name: 'مكتب محاماة صغير',
            nameEn: 'Small Law Firm',
            description: 'بيئة مناسبة لمكتب محاماة صغير',
            descriptionEn: 'Environment for small law firm',
            dataProfile: 'sample_data',
            estimatedItems: {
                clients: 10,
                cases: 7,
                invoices: 15
            }
        },
        {
            id: 'corporate_legal',
            name: 'إدارة قانونية متوسطة',
            nameEn: 'Medium Legal Department',
            description: 'بيئة مناسبة لإدارة قانونية متوسطة الحجم',
            descriptionEn: 'Environment for medium legal department',
            dataProfile: 'sample_data',
            estimatedItems: {
                clients: 15,
                cases: 10,
                invoices: 25
            }
        },
        {
            id: 'full_demo',
            name: 'نسخة تجريبية كاملة',
            nameEn: 'Full Demo',
            description: 'بيئة كاملة مع بيانات تجريبية شاملة',
            descriptionEn: 'Complete environment with comprehensive demo data',
            dataProfile: 'full_demo',
            estimatedItems: {
                clients: 30,
                cases: 20,
                invoices: 50
            }
        }
    ];

    res.json({
        success: true,
        data: templates
    });
});

/**
 * Check API limit for sandbox
 * GET /api/sandbox/:id/check-limit
 */
exports.checkApiLimit = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    // Verify ownership
    const sandbox = await sandboxService.getSandbox(userId);
    if (!sandbox || sandbox._id.toString() !== id) {
        throw new CustomException('Sandbox not found or access denied', 404);
    }

    const hasLimit = sandbox.checkApiLimit();
    const remaining = sandbox.restrictions.apiCallsPerDay - sandbox.restrictions.apiCallsToday;

    res.json({
        success: true,
        data: {
            hasLimit,
            limit: sandbox.restrictions.apiCallsPerDay,
            used: sandbox.restrictions.apiCallsToday,
            remaining: Math.max(0, remaining)
        }
    });
});
