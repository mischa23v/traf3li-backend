/**
 * Organization Template Controller
 *
 * Handles HTTP requests for organization template management.
 * Admin-only endpoints for creating and managing firm configuration templates.
 */

const asyncHandler = require('../utils/asyncHandler');
const { CustomException } = require('../utils');
const { pickAllowedFields } = require('../utils/securityUtils');
const OrganizationTemplateService = require('../services/organizationTemplate.service');

// ═══════════════════════════════════════════════════════════════
// TEMPLATE MANAGEMENT
// ═══════════════════════════════════════════════════════════════

/**
 * Create a new organization template
 * POST /api/admin/templates
 * @access Admin only
 */
const createTemplate = asyncHandler(async (req, res) => {
    const userId = req.userID;

    // Mass assignment protection - only allow specific fields
    const allowedFields = [
        'name',
        'nameAr',
        'description',
        'descriptionAr',
        'isDefault',
        'isActive',
        'roles',
        'settings',
        'features',
        'subscriptionDefaults',
        'metadata'
    ];

    const safeInput = pickAllowedFields(req.body, allowedFields);

    // Validate required fields
    if (!safeInput.name || !safeInput.description) {
        throw CustomException(
            'Template name and description are required',
            400,
            { messageAr: 'اسم القالب والوصف مطلوبان' }
        );
    }

    if (!safeInput.roles || safeInput.roles.length === 0) {
        throw CustomException(
            'Template must have at least one role',
            400,
            { messageAr: 'يجب أن يحتوي القالب على دور واحد على الأقل' }
        );
    }

    // Create template
    const template = await OrganizationTemplateService.createTemplate(safeInput, userId);

    res.status(201).json({
        success: true,
        message: 'Template created successfully',
        messageAr: 'تم إنشاء القالب بنجاح',
        data: template
    });
});

/**
 * Get all templates
 * GET /api/admin/templates
 * @access Admin only
 */
const listTemplates = asyncHandler(async (req, res) => {
    const {
        page = 1,
        limit = 20,
        sortBy = 'usageCount',
        sortOrder = -1,
        includeInactive = false,
        targetFirmSize,
        isGlobal,
        isActive
    } = req.query;

    // Build filters
    const filters = {};
    if (targetFirmSize) {
        filters['metadata.targetFirmSize'] = targetFirmSize;
    }
    if (typeof isGlobal !== 'undefined') {
        filters.isGlobal = isGlobal === 'true';
    }
    if (typeof isActive !== 'undefined') {
        filters.isActive = isActive === 'true';
    }

    const result = await OrganizationTemplateService.listTemplates(filters, {
        page: parseInt(page),
        limit: parseInt(limit),
        sortBy,
        sortOrder: parseInt(sortOrder),
        includeInactive: includeInactive === 'true'
    });

    res.json({
        success: true,
        data: result.templates,
        pagination: result.pagination
    });
});

/**
 * Get a single template by ID
 * GET /api/admin/templates/:id
 * @access Admin only
 */
const getTemplate = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const template = await OrganizationTemplateService.getTemplate(id);

    res.json({
        success: true,
        data: template
    });
});

/**
 * Update a template
 * PUT /api/admin/templates/:id
 * @access Admin only
 */
const updateTemplate = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.userID;

    // Mass assignment protection
    const allowedFields = [
        'name',
        'nameAr',
        'description',
        'descriptionAr',
        'isDefault',
        'isActive',
        'roles',
        'settings',
        'features',
        'subscriptionDefaults',
        'metadata'
    ];

    const safeInput = pickAllowedFields(req.body, allowedFields);

    const template = await OrganizationTemplateService.updateTemplate(id, safeInput, userId);

    res.json({
        success: true,
        message: 'Template updated successfully',
        messageAr: 'تم تحديث القالب بنجاح',
        data: template
    });
});

/**
 * Delete a template
 * DELETE /api/admin/templates/:id
 * @access Admin only
 */
const deleteTemplate = asyncHandler(async (req, res) => {
    const { id } = req.params;

    await OrganizationTemplateService.deleteTemplate(id);

    res.json({
        success: true,
        message: 'Template deleted successfully',
        messageAr: 'تم حذف القالب بنجاح'
    });
});

// ═══════════════════════════════════════════════════════════════
// TEMPLATE APPLICATION
// ═══════════════════════════════════════════════════════════════

/**
 * Apply template to an existing firm
 * POST /api/admin/templates/:id/apply/:firmId
 * @access Admin only
 */
const applyTemplateToFirm = asyncHandler(async (req, res) => {
    const { id: templateId, firmId } = req.params;
    const {
        applySettings = true,
        applyFeatures = true,
        applyRolePermissions = false,
        applySubscription = false,
        applyEnterpriseSettings = false,
        preserveSubscription = true
    } = req.body;

    const options = {
        applySettings,
        applyFeatures,
        applyRolePermissions,
        applySubscription,
        applyEnterpriseSettings,
        preserveSubscription
    };

    const firm = await OrganizationTemplateService.applyTemplate(
        templateId,
        firmId,
        options
    );

    res.json({
        success: true,
        message: 'Template applied successfully',
        messageAr: 'تم تطبيق القالب بنجاح',
        data: firm
    });
});

/**
 * Compare firm configuration with a template
 * GET /api/admin/templates/:id/compare/:firmId
 * @access Admin only
 */
const compareWithTemplate = asyncHandler(async (req, res) => {
    const { id: templateId, firmId } = req.params;

    const comparison = await OrganizationTemplateService.compareWithTemplate(
        firmId,
        templateId
    );

    res.json({
        success: true,
        data: comparison
    });
});

// ═══════════════════════════════════════════════════════════════
// TEMPLATE UTILITIES
// ═══════════════════════════════════════════════════════════════

/**
 * Clone an existing template
 * POST /api/admin/templates/:id/clone
 * @access Admin only
 */
const cloneTemplate = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name } = req.body;
    const userId = req.userID;

    if (!name) {
        throw CustomException(
            'New template name is required',
            400,
            { messageAr: 'اسم القالب الجديد مطلوب' }
        );
    }

    const cloned = await OrganizationTemplateService.cloneTemplate(id, name, userId);

    res.status(201).json({
        success: true,
        message: 'Template cloned successfully',
        messageAr: 'تم نسخ القالب بنجاح',
        data: cloned
    });
});

/**
 * Set a template as the default
 * POST /api/admin/templates/:id/set-default
 * @access Admin only
 */
const setAsDefault = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const template = await OrganizationTemplateService.setAsDefault(id);

    res.json({
        success: true,
        message: 'Default template updated successfully',
        messageAr: 'تم تحديث القالب الافتراضي بنجاح',
        data: template
    });
});

/**
 * Get template statistics
 * GET /api/admin/templates/stats
 * @access Admin only
 */
const getTemplateStats = asyncHandler(async (req, res) => {
    const stats = await OrganizationTemplateService.getStatistics();

    res.json({
        success: true,
        data: stats
    });
});

// ═══════════════════════════════════════════════════════════════
// PUBLIC ENDPOINTS (for firm creation)
// ═══════════════════════════════════════════════════════════════

/**
 * Get available templates for firm creation
 * GET /api/templates/available
 * @access Authenticated users
 */
const getAvailableTemplates = asyncHandler(async (req, res) => {
    const { targetFirmSize } = req.query;

    const filters = { isActive: true };
    if (targetFirmSize) {
        filters['metadata.targetFirmSize'] = targetFirmSize;
    }

    const result = await OrganizationTemplateService.listTemplates(filters, {
        page: 1,
        limit: 100,
        sortBy: 'usageCount',
        sortOrder: -1
    });

    // Return only essential information for selection
    const templates = result.templates.map(t => ({
        id: t._id,
        name: t.name,
        nameAr: t.nameAr,
        description: t.description,
        descriptionAr: t.descriptionAr,
        isDefault: t.isDefault,
        metadata: t.metadata,
        usageCount: t.usageCount
    }));

    res.json({
        success: true,
        data: templates
    });
});

/**
 * Get the default template
 * GET /api/templates/default
 * @access Authenticated users
 */
const getDefaultTemplate = asyncHandler(async (req, res) => {
    const OrganizationTemplate = require('../models/organizationTemplate.model');
    const template = await OrganizationTemplate.getDefault();

    if (!template) {
        throw CustomException(
            'No default template found',
            404,
            { messageAr: 'لم يتم العثور على قالب افتراضي' }
        );
    }

    // Return only essential information
    res.json({
        success: true,
        data: {
            id: template._id,
            name: template.name,
            nameAr: template.nameAr,
            description: template.description,
            descriptionAr: template.descriptionAr,
            metadata: template.metadata
        }
    });
});

/**
 * Preview template configuration
 * GET /api/templates/:id/preview
 * @access Authenticated users
 */
const previewTemplate = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const template = await OrganizationTemplateService.getTemplate(id);

    if (!template.isActive) {
        throw CustomException(
            'Template is not available',
            400,
            { messageAr: 'القالب غير متاح' }
        );
    }

    // Return detailed configuration for preview
    const config = template.toApplicationConfig();

    res.json({
        success: true,
        data: {
            id: template._id,
            name: template.name,
            nameAr: template.nameAr,
            description: template.description,
            descriptionAr: template.descriptionAr,
            metadata: template.metadata,
            configuration: {
                roles: config.roles.map(r => ({
                    name: r.name,
                    description: r.description,
                    descriptionAr: r.descriptionAr,
                    isDefault: r.isDefault,
                    // Summarize permissions
                    permissions: {
                        modules: Object.entries(r.permissions)
                            .filter(([k]) => !k.startsWith('can'))
                            .reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {}),
                        special: Object.entries(r.permissions)
                            .filter(([k]) => k.startsWith('can'))
                            .reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {})
                    }
                })),
                features: config.features,
                subscriptionDefaults: config.subscriptionDefaults,
                settings: {
                    security: {
                        mfaRequired: config.settings?.mfaRequired,
                        sessionTimeout: config.settings?.sessionTimeout,
                        maxConcurrentSessions: config.settings?.maxConcurrentSessions
                    },
                    localization: {
                        language: config.settings?.language,
                        timezone: config.settings?.timezone,
                        dateFormat: config.settings?.dateFormat
                    }
                }
            }
        }
    });
});

module.exports = {
    // Admin endpoints
    createTemplate,
    listTemplates,
    getTemplate,
    updateTemplate,
    deleteTemplate,
    applyTemplateToFirm,
    compareWithTemplate,
    cloneTemplate,
    setAsDefault,
    getTemplateStats,

    // Public endpoints
    getAvailableTemplates,
    getDefaultTemplate,
    previewTemplate
};
