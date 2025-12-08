/**
 * Permission Controller - Authorization API Endpoints
 *
 * Provides API endpoints for:
 * - Permission checks
 * - Policy management
 * - Relation tuple management
 * - Decision logs and statistics
 */

const PermissionConfig = require('../models/permission.model');
const RelationTuple = require('../models/relationTuple.model');
const PolicyDecision = require('../models/policyDecision.model');
const UIAccessConfig = require('../models/uiAccessConfig.model');
const permissionEnforcer = require('../services/permissionEnforcer.service');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');

// ═══════════════════════════════════════════════════════════════
// PERMISSION CHECK ENDPOINTS
// ═══════════════════════════════════════════════════════════════

/**
 * Check if current user has permission
 * POST /api/permissions/check
 */
const checkPermission = asyncHandler(async (req, res) => {
    const firmId = req.firmId;
    const { resource, action } = req.body;

    if (!firmId) {
        throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
    }

    if (!resource?.namespace || !action) {
        throw CustomException('يجب تحديد المورد والإجراء', 400);
    }

    const result = await permissionEnforcer.check(
        firmId,
        {
            subject: {
                userId: req.userID,
                role: req.firmRole,
                attributes: { status: req.isDeparted ? 'departed' : 'active' }
            },
            resource,
            action
        },
        {
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
            requestPath: req.path
        }
    );

    res.json({
        success: true,
        data: {
            allowed: result.allowed,
            reason: result.reason,
            reasonCode: result.reasonCode
        }
    });
});

/**
 * Batch check permissions
 * POST /api/permissions/check-batch
 */
const checkPermissionBatch = asyncHandler(async (req, res) => {
    const firmId = req.firmId;
    const { checks } = req.body;

    if (!firmId) {
        throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
    }

    if (!Array.isArray(checks) || checks.length === 0) {
        throw CustomException('يجب تحديد الفحوصات', 400);
    }

    if (checks.length > 50) {
        throw CustomException('الحد الأقصى 50 فحص في المرة الواحدة', 400);
    }

    const requests = checks.map(check => ({
        subject: {
            userId: req.userID,
            role: req.firmRole,
            attributes: { status: req.isDeparted ? 'departed' : 'active' }
        },
        resource: check.resource,
        action: check.action
    }));

    const results = await permissionEnforcer.checkBatch(firmId, requests, {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
    });

    res.json({
        success: true,
        data: results.map((result, index) => ({
            resource: checks[index].resource,
            action: checks[index].action,
            allowed: result.allowed,
            reason: result.reason
        }))
    });
});

/**
 * Get my effective permissions
 * GET /api/permissions/my-permissions
 */
const getMyPermissions = asyncHandler(async (req, res) => {
    const firmId = req.firmId;

    if (!firmId) {
        throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
    }

    // Get effective roles
    const effectiveRoles = await PermissionConfig.getEffectiveRoles(firmId, req.firmRole);

    // Get all resources user has access to
    const accessibleResources = await RelationTuple.getObjects(
        firmId,
        'user',
        req.userID.toString()
    );

    // Get permission config
    const config = await PermissionConfig.getForFirm(firmId);

    // Build permissions summary
    const namespaces = config.namespaces || [];
    const permissions = {};

    for (const ns of namespaces) {
        permissions[ns.name] = {
            displayName: ns.displayName,
            displayNameAr: ns.displayNameAr,
            actions: {}
        };

        for (const action of ['view', 'create', 'edit', 'delete', 'approve', 'export']) {
            const checkResult = await permissionEnforcer.check(
                firmId,
                {
                    subject: { userId: req.userID, role: req.firmRole },
                    resource: { namespace: ns.name },
                    action
                },
                {},
                { skipLog: true, skipCache: true }
            );

            permissions[ns.name].actions[action] = checkResult.allowed;
        }
    }

    res.json({
        success: true,
        data: {
            userId: req.userID,
            role: req.firmRole,
            effectiveRoles,
            permissions,
            accessibleResources: accessibleResources.slice(0, 100) // Limit to prevent large responses
        }
    });
});

// ═══════════════════════════════════════════════════════════════
// EXPAND ENDPOINTS
// ═══════════════════════════════════════════════════════════════

/**
 * Expand - get all subjects with access to a resource
 * GET /api/permissions/expand/:namespace/:resourceId/:relation
 */
const expandPermissions = asyncHandler(async (req, res) => {
    const firmId = req.firmId;
    const { namespace, resourceId, relation } = req.params;

    if (!firmId) {
        throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
    }

    // Only admins can expand permissions
    if (!['owner', 'admin'].includes(req.firmRole)) {
        throw CustomException('ليس لديك صلاحية لعرض هذه المعلومات', 403);
    }

    const result = await permissionEnforcer.expand(firmId, namespace, resourceId, relation);

    res.json({
        success: true,
        data: result
    });
});

/**
 * Reverse expand - get all resources a user has access to
 * GET /api/permissions/user-resources/:userId
 */
const getUserResources = asyncHandler(async (req, res) => {
    const firmId = req.firmId;
    const { userId } = req.params;
    const { namespace, relation } = req.query;

    if (!firmId) {
        throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
    }

    // Users can view their own, admins can view anyone's
    if (userId !== req.userID.toString() && !['owner', 'admin'].includes(req.firmRole)) {
        throw CustomException('ليس لديك صلاحية لعرض هذه المعلومات', 403);
    }

    const result = await permissionEnforcer.reverseExpand(firmId, {
        namespace: 'user',
        id: userId
    }, { namespace, relation });

    res.json({
        success: true,
        data: result
    });
});

// ═══════════════════════════════════════════════════════════════
// POLICY MANAGEMENT
// ═══════════════════════════════════════════════════════════════

/**
 * Get permission configuration
 * GET /api/permissions/config
 */
const getPermissionConfig = asyncHandler(async (req, res) => {
    const firmId = req.firmId;

    if (!firmId) {
        throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
    }

    // Only admins can view full config
    if (!['owner', 'admin'].includes(req.firmRole)) {
        throw CustomException('ليس لديك صلاحية لعرض هذه المعلومات', 403);
    }

    const config = await PermissionConfig.getForFirm(firmId);

    res.json({
        success: true,
        data: config
    });
});

/**
 * Update permission configuration
 * PUT /api/permissions/config
 */
const updatePermissionConfig = asyncHandler(async (req, res) => {
    const firmId = req.firmId;
    const { decisionStrategy, denyOverride, roleHierarchy, namespaces, auditSettings } = req.body;

    if (!firmId) {
        throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
    }

    // Only owner can modify permission config
    if (req.firmRole !== 'owner') {
        throw CustomException('فقط مالك المكتب يمكنه تعديل إعدادات الصلاحيات', 403);
    }

    const config = await PermissionConfig.findOne({ firmId });

    if (!config) {
        throw CustomException('لم يتم العثور على إعدادات الصلاحيات', 404);
    }

    if (decisionStrategy) config.decisionStrategy = decisionStrategy;
    if (denyOverride !== undefined) config.denyOverride = denyOverride;
    if (roleHierarchy) config.roleHierarchy = roleHierarchy;
    if (namespaces) config.namespaces = namespaces;
    if (auditSettings) config.auditSettings = auditSettings;

    config.version += 1;
    config.lastModifiedBy = req.userID;
    await config.save();

    // Clear cache
    permissionEnforcer.clearCache();

    res.json({
        success: true,
        message: 'تم تحديث إعدادات الصلاحيات بنجاح',
        data: config
    });
});

/**
 * Add a policy
 * POST /api/permissions/policies
 */
const addPolicy = asyncHandler(async (req, res) => {
    const firmId = req.firmId;
    const policy = req.body;

    if (!firmId) {
        throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
    }

    if (req.firmRole !== 'owner') {
        throw CustomException('فقط مالك المكتب يمكنه إضافة سياسات', 403);
    }

    if (!policy.name || !policy.resource?.namespace || !policy.action) {
        throw CustomException('يجب تحديد اسم السياسة والمورد والإجراء', 400);
    }

    const config = await PermissionConfig.upsertPolicy(firmId, policy, req.userID);

    // Clear cache
    permissionEnforcer.clearCache();

    res.status(201).json({
        success: true,
        message: 'تم إضافة السياسة بنجاح',
        data: config.policies[config.policies.length - 1]
    });
});

/**
 * Update a policy
 * PUT /api/permissions/policies/:policyId
 */
const updatePolicy = asyncHandler(async (req, res) => {
    const firmId = req.firmId;
    const { policyId } = req.params;
    const updates = req.body;

    if (!firmId) {
        throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
    }

    if (req.firmRole !== 'owner') {
        throw CustomException('فقط مالك المكتب يمكنه تعديل السياسات', 403);
    }

    const config = await PermissionConfig.upsertPolicy(firmId, { ...updates, policyId }, req.userID);

    // Clear cache
    permissionEnforcer.clearCache();

    const updatedPolicy = config.policies.find(p => p.policyId === policyId);

    res.json({
        success: true,
        message: 'تم تحديث السياسة بنجاح',
        data: updatedPolicy
    });
});

/**
 * Delete a policy
 * DELETE /api/permissions/policies/:policyId
 */
const deletePolicy = asyncHandler(async (req, res) => {
    const firmId = req.firmId;
    const { policyId } = req.params;

    if (!firmId) {
        throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
    }

    if (req.firmRole !== 'owner') {
        throw CustomException('فقط مالك المكتب يمكنه حذف السياسات', 403);
    }

    await PermissionConfig.deletePolicy(firmId, policyId, req.userID);

    // Clear cache
    permissionEnforcer.clearCache();

    res.json({
        success: true,
        message: 'تم حذف السياسة بنجاح'
    });
});

// ═══════════════════════════════════════════════════════════════
// RELATION TUPLE MANAGEMENT
// ═══════════════════════════════════════════════════════════════

/**
 * Grant a relation (add tuple)
 * POST /api/permissions/relations
 */
const grantRelation = asyncHandler(async (req, res) => {
    const firmId = req.firmId;
    const { namespace, object, relation, subjectNamespace, subjectObject, expiresAt, metadata } = req.body;

    if (!firmId) {
        throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
    }

    // Only admins can grant relations
    if (!['owner', 'admin'].includes(req.firmRole)) {
        throw CustomException('ليس لديك صلاحية لمنح الصلاحيات', 403);
    }

    if (!namespace || !object || !relation || !subjectObject) {
        throw CustomException('يجب تحديد جميع الحقول المطلوبة', 400);
    }

    const tuple = await permissionEnforcer.grant(
        firmId,
        { namespace, object, relation, subjectNamespace, subjectObject, expiresAt, metadata },
        req.userID
    );

    res.status(201).json({
        success: true,
        message: 'تم منح الصلاحية بنجاح',
        data: tuple
    });
});

/**
 * Revoke a relation (remove tuple)
 * DELETE /api/permissions/relations
 */
const revokeRelation = asyncHandler(async (req, res) => {
    const firmId = req.firmId;
    const { namespace, object, relation, subjectNamespace, subjectObject } = req.body;

    if (!firmId) {
        throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
    }

    // Only admins can revoke relations
    if (!['owner', 'admin'].includes(req.firmRole)) {
        throw CustomException('ليس لديك صلاحية لسحب الصلاحيات', 403);
    }

    if (!namespace || !object || !relation || !subjectObject) {
        throw CustomException('يجب تحديد جميع الحقول المطلوبة', 400);
    }

    await permissionEnforcer.revoke(
        firmId,
        { namespace, object, relation, subjectNamespace, subjectObject },
        req.userID
    );

    res.json({
        success: true,
        message: 'تم سحب الصلاحية بنجاح'
    });
});

/**
 * Get relations for a resource
 * GET /api/permissions/relations/:namespace/:object
 */
const getResourceRelations = asyncHandler(async (req, res) => {
    const firmId = req.firmId;
    const { namespace, object } = req.params;
    const { relation } = req.query;

    if (!firmId) {
        throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
    }

    const query = { firmId, namespace, object };
    if (relation) query.relation = relation;

    const tuples = await RelationTuple.find(query).lean();

    res.json({
        success: true,
        data: tuples
    });
});

// ═══════════════════════════════════════════════════════════════
// DECISION LOGS
// ═══════════════════════════════════════════════════════════════

/**
 * Get decision logs
 * GET /api/permissions/decisions
 */
const getDecisionLogs = asyncHandler(async (req, res) => {
    const firmId = req.firmId;

    if (!firmId) {
        throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
    }

    // Only admins can view decision logs
    if (!['owner', 'admin'].includes(req.firmRole)) {
        throw CustomException('ليس لديك صلاحية لعرض سجل القرارات', 403);
    }

    const { page = 1, limit = 50, userId, namespace, allowed, startDate, endDate } = req.query;

    const query = { firmId };

    if (userId) query['request.subject.userId'] = userId;
    if (namespace) query['request.resource.namespace'] = namespace;
    if (allowed !== undefined) query['decision.allowed'] = allowed === 'true';

    if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate);
        if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const [decisions, total] = await Promise.all([
        PolicyDecision.find(query)
            .sort({ createdAt: -1 })
            .limit(Math.min(parseInt(limit) || 50, 100))
            .skip(((parseInt(page) || 1) - 1) * (parseInt(limit) || 50))
            .populate('request.subject.userId', 'firstName lastName email')
            .lean(),
        PolicyDecision.countDocuments(query)
    ]);

    res.json({
        success: true,
        data: decisions,
        pagination: {
            page: parseInt(page) || 1,
            limit: Math.min(parseInt(limit) || 50, 100),
            total,
            pages: Math.ceil(total / (parseInt(limit) || 50))
        }
    });
});

/**
 * Get decision statistics
 * GET /api/permissions/decisions/stats
 */
const getDecisionStats = asyncHandler(async (req, res) => {
    const firmId = req.firmId;

    if (!firmId) {
        throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
    }

    if (!['owner', 'admin'].includes(req.firmRole)) {
        throw CustomException('ليس لديك صلاحية لعرض الإحصائيات', 403);
    }

    const { startDate, endDate } = req.query;

    const stats = await PolicyDecision.getStats(firmId, { startDate, endDate });

    res.json({
        success: true,
        data: stats
    });
});

/**
 * Get denied access attempts
 * GET /api/permissions/decisions/denied
 */
const getDeniedAttempts = asyncHandler(async (req, res) => {
    const firmId = req.firmId;

    if (!firmId) {
        throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
    }

    if (!['owner', 'admin'].includes(req.firmRole)) {
        throw CustomException('ليس لديك صلاحية لعرض محاولات الوصول المرفوضة', 403);
    }

    const { limit = 50, startDate, endDate, userId } = req.query;

    const attempts = await PolicyDecision.getDeniedAttempts(firmId, {
        limit: Math.min(parseInt(limit) || 50, 100),
        startDate,
        endDate,
        userId
    });

    res.json({
        success: true,
        data: attempts
    });
});

/**
 * Get compliance report
 * GET /api/permissions/decisions/compliance-report
 */
const getComplianceReport = asyncHandler(async (req, res) => {
    const firmId = req.firmId;

    if (!firmId) {
        throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
    }

    if (!['owner', 'admin'].includes(req.firmRole)) {
        throw CustomException('ليس لديك صلاحية لعرض تقرير الامتثال', 403);
    }

    const { startDate, endDate } = req.query;

    const report = await PolicyDecision.getComplianceReport(firmId, { startDate, endDate });

    res.json({
        success: true,
        data: report
    });
});

// ═══════════════════════════════════════════════════════════════
// RELATION STATISTICS
// ═══════════════════════════════════════════════════════════════

/**
 * Get relation tuple statistics
 * GET /api/permissions/relations/stats
 */
const getRelationStats = asyncHandler(async (req, res) => {
    const firmId = req.firmId;

    if (!firmId) {
        throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
    }

    if (!['owner', 'admin'].includes(req.firmRole)) {
        throw CustomException('ليس لديك صلاحية لعرض الإحصائيات', 403);
    }

    const stats = await RelationTuple.getStats(firmId);

    res.json({
        success: true,
        data: stats
    });
});

// ═══════════════════════════════════════════════════════════════
// CACHE MANAGEMENT
// ═══════════════════════════════════════════════════════════════

/**
 * Clear permission cache
 * POST /api/permissions/cache/clear
 */
const clearCache = asyncHandler(async (req, res) => {
    const firmId = req.firmId;

    if (!firmId) {
        throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
    }

    if (req.firmRole !== 'owner') {
        throw CustomException('فقط مالك المكتب يمكنه مسح الذاكرة المؤقتة', 403);
    }

    permissionEnforcer.clearCache();

    res.json({
        success: true,
        message: 'تم مسح الذاكرة المؤقتة بنجاح'
    });
});

/**
 * Get cache statistics
 * GET /api/permissions/cache/stats
 */
const getCacheStats = asyncHandler(async (req, res) => {
    const firmId = req.firmId;

    if (!firmId) {
        throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
    }

    if (!['owner', 'admin'].includes(req.firmRole)) {
        throw CustomException('ليس لديك صلاحية لعرض إحصائيات الذاكرة المؤقتة', 403);
    }

    const stats = permissionEnforcer.getCacheStats();

    res.json({
        success: true,
        data: stats
    });
});

// ═══════════════════════════════════════════════════════════════
// UI ACCESS CONTROL (Sidebar & Page Visibility)
// ═══════════════════════════════════════════════════════════════

/**
 * Get visible sidebar items for current user
 * GET /api/permissions/ui/sidebar
 */
const getVisibleSidebar = asyncHandler(async (req, res) => {
    const firmId = req.firmId;

    if (!firmId) {
        throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
    }

    const sidebar = await UIAccessConfig.getVisibleSidebar(
        firmId,
        req.userID,
        req.firmRole
    );

    res.json({
        success: true,
        data: {
            items: sidebar
        }
    });
});

/**
 * Check page access for current user
 * POST /api/permissions/ui/check-page
 */
const checkPageAccess = asyncHandler(async (req, res) => {
    const firmId = req.firmId;
    const { routePath } = req.body;

    if (!firmId) {
        throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
    }

    if (!routePath) {
        throw CustomException('يجب تحديد مسار الصفحة', 400);
    }

    const access = await UIAccessConfig.checkPageAccess(
        firmId,
        req.userID,
        req.firmRole,
        routePath
    );

    // Log access denial if configured
    if (!access.allowed) {
        const config = await UIAccessConfig.getForFirm(firmId);
        if (config.settings?.logAccessDenials) {
            await PolicyDecision.log({
                firmId,
                request: {
                    subject: { userId: req.userID, role: req.firmRole },
                    resource: { namespace: 'ui_page', id: access.pageId },
                    action: 'access',
                    context: {
                        routePath,
                        ipAddress: req.ip,
                        userAgent: req.headers['user-agent'],
                        timestamp: new Date()
                    }
                },
                decision: {
                    allowed: false,
                    reason: access.reason || 'Page access denied',
                    effect: 'deny'
                },
                metrics: { evaluationTimeMs: 0, policiesChecked: 0, relationsChecked: 0 }
            });
        }
    }

    res.json({
        success: true,
        data: access
    });
});

/**
 * Get UI access configuration (admin only)
 * GET /api/permissions/ui/config
 */
const getUIAccessConfig = asyncHandler(async (req, res) => {
    const firmId = req.firmId;

    if (!firmId) {
        throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
    }

    if (!['owner', 'admin'].includes(req.firmRole)) {
        throw CustomException('ليس لديك صلاحية لعرض إعدادات واجهة المستخدم', 403);
    }

    const config = await UIAccessConfig.getForFirm(firmId);

    res.json({
        success: true,
        data: config
    });
});

/**
 * Update UI access settings
 * PUT /api/permissions/ui/config
 */
const updateUIAccessConfig = asyncHandler(async (req, res) => {
    const firmId = req.firmId;
    const { settings } = req.body;

    if (!firmId) {
        throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
    }

    if (req.firmRole !== 'owner') {
        throw CustomException('فقط مالك المكتب يمكنه تعديل إعدادات واجهة المستخدم', 403);
    }

    const config = await UIAccessConfig.findOne({ firmId });

    if (!config) {
        throw CustomException('لم يتم العثور على إعدادات واجهة المستخدم', 404);
    }

    if (settings) {
        config.settings = { ...config.settings, ...settings };
    }

    config.version += 1;
    config.lastModifiedBy = req.userID;
    await config.save();

    res.json({
        success: true,
        message: 'تم تحديث إعدادات واجهة المستخدم بنجاح',
        data: config
    });
});

/**
 * Get access matrix for all roles
 * GET /api/permissions/ui/matrix
 */
const getAccessMatrix = asyncHandler(async (req, res) => {
    const firmId = req.firmId;

    if (!firmId) {
        throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
    }

    if (!['owner', 'admin'].includes(req.firmRole)) {
        throw CustomException('ليس لديك صلاحية لعرض مصفوفة الوصول', 403);
    }

    const matrix = await UIAccessConfig.getAccessMatrix(firmId);

    res.json({
        success: true,
        data: matrix
    });
});

/**
 * Update sidebar visibility for a role
 * PUT /api/permissions/ui/sidebar/:itemId/visibility
 */
const updateSidebarVisibility = asyncHandler(async (req, res) => {
    const firmId = req.firmId;
    const { itemId } = req.params;
    const { role, visible } = req.body;

    if (!firmId) {
        throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
    }

    if (req.firmRole !== 'owner') {
        throw CustomException('فقط مالك المكتب يمكنه تعديل إظهار القوائم', 403);
    }

    if (!role || visible === undefined) {
        throw CustomException('يجب تحديد الدور والإظهار', 400);
    }

    await UIAccessConfig.updateSidebarVisibility(firmId, itemId, role, visible, req.userID);

    res.json({
        success: true,
        message: 'تم تحديث إظهار العنصر بنجاح'
    });
});

/**
 * Update page access for a role
 * PUT /api/permissions/ui/pages/:pageId/access
 */
const updatePageAccessForRole = asyncHandler(async (req, res) => {
    const firmId = req.firmId;
    const { pageId } = req.params;
    const { role, hasAccess } = req.body;

    if (!firmId) {
        throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
    }

    if (req.firmRole !== 'owner') {
        throw CustomException('فقط مالك المكتب يمكنه تعديل صلاحيات الصفحات', 403);
    }

    if (!role || hasAccess === undefined) {
        throw CustomException('يجب تحديد الدور والصلاحية', 400);
    }

    await UIAccessConfig.updatePageAccess(firmId, pageId, role, hasAccess, req.userID);

    res.json({
        success: true,
        message: 'تم تحديث صلاحية الصفحة بنجاح'
    });
});

/**
 * Bulk update role visibility/access
 * PUT /api/permissions/ui/roles/:role/bulk
 */
const bulkUpdateRoleAccess = asyncHandler(async (req, res) => {
    const firmId = req.firmId;
    const { role } = req.params;
    const { sidebarItems, pageAccess } = req.body;

    if (!firmId) {
        throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
    }

    if (req.firmRole !== 'owner') {
        throw CustomException('فقط مالك المكتب يمكنه تعديل صلاحيات الأدوار', 403);
    }

    await UIAccessConfig.bulkUpdateRoleVisibility(
        firmId,
        role,
        { sidebarItems, pageAccess },
        req.userID
    );

    res.json({
        success: true,
        message: 'تم تحديث صلاحيات الدور بنجاح'
    });
});

/**
 * Add user-specific override
 * POST /api/permissions/ui/overrides
 */
const addUserOverride = asyncHandler(async (req, res) => {
    const firmId = req.firmId;
    const { userId, showSidebarItems, hideSidebarItems, grantPageAccess, denyPageAccess, reason, expiresAt } = req.body;

    if (!firmId) {
        throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
    }

    if (!['owner', 'admin'].includes(req.firmRole)) {
        throw CustomException('ليس لديك صلاحية لإضافة استثناءات المستخدمين', 403);
    }

    if (!userId) {
        throw CustomException('يجب تحديد المستخدم', 400);
    }

    await UIAccessConfig.addUserOverride(
        firmId,
        {
            userId,
            showSidebarItems: showSidebarItems || [],
            hideSidebarItems: hideSidebarItems || [],
            grantPageAccess: grantPageAccess || [],
            denyPageAccess: denyPageAccess || [],
            reason,
            expiresAt
        },
        req.userID
    );

    res.status(201).json({
        success: true,
        message: 'تم إضافة استثناء المستخدم بنجاح'
    });
});

/**
 * Remove user-specific override
 * DELETE /api/permissions/ui/overrides/:userId
 */
const removeUserOverride = asyncHandler(async (req, res) => {
    const firmId = req.firmId;
    const { userId } = req.params;

    if (!firmId) {
        throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
    }

    if (!['owner', 'admin'].includes(req.firmRole)) {
        throw CustomException('ليس لديك صلاحية لحذف استثناءات المستخدمين', 403);
    }

    await UIAccessConfig.removeUserOverride(firmId, userId, req.userID);

    res.json({
        success: true,
        message: 'تم حذف استثناء المستخدم بنجاح'
    });
});

/**
 * Get all sidebar items (for admin configuration)
 * GET /api/permissions/ui/sidebar/all
 */
const getAllSidebarItems = asyncHandler(async (req, res) => {
    const firmId = req.firmId;

    if (!firmId) {
        throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
    }

    if (!['owner', 'admin'].includes(req.firmRole)) {
        throw CustomException('ليس لديك صلاحية لعرض جميع عناصر القائمة', 403);
    }

    const config = await UIAccessConfig.getForFirm(firmId);

    res.json({
        success: true,
        data: {
            items: config.sidebarItems || []
        }
    });
});

/**
 * Get all page access rules (for admin configuration)
 * GET /api/permissions/ui/pages/all
 */
const getAllPageAccess = asyncHandler(async (req, res) => {
    const firmId = req.firmId;

    if (!firmId) {
        throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
    }

    if (!['owner', 'admin'].includes(req.firmRole)) {
        throw CustomException('ليس لديك صلاحية لعرض جميع قواعد الصفحات', 403);
    }

    const config = await UIAccessConfig.getForFirm(firmId);

    res.json({
        success: true,
        data: {
            pages: config.pageAccess || []
        }
    });
});

module.exports = {
    // Permission checks
    checkPermission,
    checkPermissionBatch,
    getMyPermissions,

    // Expand
    expandPermissions,
    getUserResources,

    // Policy management
    getPermissionConfig,
    updatePermissionConfig,
    addPolicy,
    updatePolicy,
    deletePolicy,

    // Relation management
    grantRelation,
    revokeRelation,
    getResourceRelations,
    getRelationStats,

    // Decision logs
    getDecisionLogs,
    getDecisionStats,
    getDeniedAttempts,
    getComplianceReport,

    // Cache
    clearCache,
    getCacheStats,

    // UI Access Control
    getVisibleSidebar,
    checkPageAccess,
    getUIAccessConfig,
    updateUIAccessConfig,
    getAccessMatrix,
    updateSidebarVisibility,
    updatePageAccessForRole,
    bulkUpdateRoleAccess,
    addUserOverride,
    removeUserOverride,
    getAllSidebarItems,
    getAllPageAccess
};
