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
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');

// ═══════════════════════════════════════════════════════════════
// PERMISSION CHECK ENDPOINTS
// ═══════════════════════════════════════════════════════════════

/**
 * Check if current user has permission
 * POST /api/permissions/check
 */
const checkPermission = asyncHandler(async (req, res) => {
    const firmId = req.firmId;

    if (!firmId) {
        throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
    }

    // Mass assignment protection
    const allowedFields = ['resource', 'action'];
    const sanitizedData = pickAllowedFields(req.body, allowedFields);

    if (!sanitizedData.resource?.namespace || !sanitizedData.action) {
        throw CustomException('يجب تحديد المورد والإجراء', 400);
    }

    const { resource, action } = sanitizedData;

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

    if (!firmId) {
        throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
    }

    // Mass assignment protection
    const allowedFields = ['checks'];
    const sanitizedData = pickAllowedFields(req.body, allowedFields);

    if (!Array.isArray(sanitizedData.checks) || sanitizedData.checks.length === 0) {
        throw CustomException('يجب تحديد الفحوصات', 400);
    }

    if (sanitizedData.checks.length > 50) {
        throw CustomException('الحد الأقصى 50 فحص في المرة الواحدة', 400);
    }

    const { checks } = sanitizedData;

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

    // Sanitize resourceId
    const sanitizedResourceId = sanitizeObjectId(resourceId);

    const result = await permissionEnforcer.expand(firmId, namespace, sanitizedResourceId, relation);

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

    // Sanitize userId
    const sanitizedUserId = sanitizeObjectId(userId);

    // Users can view their own, admins can view anyone's
    if (sanitizedUserId !== req.userID.toString() && !['owner', 'admin'].includes(req.firmRole)) {
        throw CustomException('ليس لديك صلاحية لعرض هذه المعلومات', 403);
    }

    const result = await permissionEnforcer.reverseExpand(firmId, {
        namespace: 'user',
        id: sanitizedUserId
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

    if (!firmId) {
        throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
    }

    // Only owner can modify permission config
    if (req.firmRole !== 'owner') {
        throw CustomException('فقط مالك المكتب يمكنه تعديل إعدادات الصلاحيات', 403);
    }

    // Mass assignment protection
    const allowedFields = ['decisionStrategy', 'denyOverride', 'roleHierarchy', 'namespaces', 'auditSettings'];
    const sanitizedData = pickAllowedFields(req.body, allowedFields);

    const config = await PermissionConfig.findOne({ firmId });

    if (!config) {
        throw CustomException('لم يتم العثور على إعدادات الصلاحيات', 404);
    }

    // IDOR protection - verify config belongs to user's firm
    if (config.firmId.toString() !== firmId.toString()) {
        throw CustomException('غير مصرح لك بتعديل هذه الإعدادات', 403);
    }

    // Apply updates
    if (sanitizedData.decisionStrategy) config.decisionStrategy = sanitizedData.decisionStrategy;
    if (sanitizedData.denyOverride !== undefined) config.denyOverride = sanitizedData.denyOverride;
    if (sanitizedData.roleHierarchy) config.roleHierarchy = sanitizedData.roleHierarchy;
    if (sanitizedData.namespaces) config.namespaces = sanitizedData.namespaces;
    if (sanitizedData.auditSettings) config.auditSettings = sanitizedData.auditSettings;

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

    if (!firmId) {
        throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
    }

    // Only owner can add policies
    if (req.firmRole !== 'owner') {
        throw CustomException('فقط مالك المكتب يمكنه إضافة سياسات', 403);
    }

    // Mass assignment protection
    const allowedFields = ['name', 'description', 'resource', 'action', 'effect', 'conditions', 'priority', 'enabled'];
    const policy = pickAllowedFields(req.body, allowedFields);

    if (!policy.name || !policy.resource?.namespace || !policy.action) {
        throw CustomException('يجب تحديد اسم السياسة والمورد والإجراء', 400);
    }

    // Prevent privilege escalation - ensure policy doesn't grant excessive permissions
    if (policy.effect === 'allow' && policy.resource?.namespace === 'permission' && policy.action === 'manage') {
        throw CustomException('لا يمكن إنشاء سياسة تمنح صلاحيات إدارة الصلاحيات', 403);
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

    if (!firmId) {
        throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
    }

    // Only owner can update policies
    if (req.firmRole !== 'owner') {
        throw CustomException('فقط مالك المكتب يمكنه تعديل السياسات', 403);
    }

    // Mass assignment protection
    const allowedFields = ['name', 'description', 'resource', 'action', 'effect', 'conditions', 'priority', 'enabled'];
    const updates = pickAllowedFields(req.body, allowedFields);

    // Sanitize policyId
    const sanitizedPolicyId = sanitizeObjectId(policyId);

    // Prevent privilege escalation - ensure policy doesn't grant excessive permissions
    if (updates.effect === 'allow' && updates.resource?.namespace === 'permission' && updates.action === 'manage') {
        throw CustomException('لا يمكن تعديل السياسة لمنح صلاحيات إدارة الصلاحيات', 403);
    }

    const config = await PermissionConfig.upsertPolicy(firmId, { ...updates, policyId: sanitizedPolicyId }, req.userID);

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

    // Only owner can delete policies
    if (req.firmRole !== 'owner') {
        throw CustomException('فقط مالك المكتب يمكنه حذف السياسات', 403);
    }

    // Sanitize policyId
    const sanitizedPolicyId = sanitizeObjectId(policyId);

    await PermissionConfig.deletePolicy(firmId, sanitizedPolicyId, req.userID);

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

    if (!firmId) {
        throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
    }

    // Only admins can grant relations
    if (!['owner', 'admin'].includes(req.firmRole)) {
        throw CustomException('ليس لديك صلاحية لمنح الصلاحيات', 403);
    }

    // Mass assignment protection
    const allowedFields = ['namespace', 'object', 'relation', 'subjectNamespace', 'subjectObject', 'expiresAt', 'metadata'];
    const relationData = pickAllowedFields(req.body, allowedFields);

    if (!relationData.namespace || !relationData.object || !relationData.relation || !relationData.subjectObject) {
        throw CustomException('يجب تحديد جميع الحقول المطلوبة', 400);
    }

    // Sanitize object IDs
    if (relationData.object) relationData.object = sanitizeObjectId(relationData.object);
    if (relationData.subjectObject) relationData.subjectObject = sanitizeObjectId(relationData.subjectObject);

    // Prevent privilege escalation - only owner can grant owner role
    if (relationData.relation === 'owner' && req.firmRole !== 'owner') {
        throw CustomException('فقط مالك المكتب يمكنه منح صلاحيات المالك', 403);
    }

    // Prevent granting admin role to users in other firms
    if (relationData.relation === 'admin' && relationData.namespace === 'firm') {
        if (relationData.object !== firmId.toString()) {
            throw CustomException('لا يمكن منح صلاحيات لمكتب آخر', 403);
        }
    }

    const tuple = await permissionEnforcer.grant(
        firmId,
        relationData,
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

    if (!firmId) {
        throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
    }

    // Only admins can revoke relations
    if (!['owner', 'admin'].includes(req.firmRole)) {
        throw CustomException('ليس لديك صلاحية لسحب الصلاحيات', 403);
    }

    // Mass assignment protection
    const allowedFields = ['namespace', 'object', 'relation', 'subjectNamespace', 'subjectObject'];
    const relationData = pickAllowedFields(req.body, allowedFields);

    if (!relationData.namespace || !relationData.object || !relationData.relation || !relationData.subjectObject) {
        throw CustomException('يجب تحديد جميع الحقول المطلوبة', 400);
    }

    // Sanitize object IDs
    if (relationData.object) relationData.object = sanitizeObjectId(relationData.object);
    if (relationData.subjectObject) relationData.subjectObject = sanitizeObjectId(relationData.subjectObject);

    // Prevent privilege escalation - only owner can revoke owner role
    if (relationData.relation === 'owner' && req.firmRole !== 'owner') {
        throw CustomException('فقط مالك المكتب يمكنه سحب صلاحيات المالك', 403);
    }

    // Prevent revoking from other firms
    if (relationData.namespace === 'firm' && relationData.object !== firmId.toString()) {
        throw CustomException('لا يمكن سحب صلاحيات من مكتب آخر', 403);
    }

    // Prevent users from revoking their own owner role
    if (relationData.relation === 'owner' && relationData.subjectObject === req.userID.toString()) {
        throw CustomException('لا يمكنك سحب صلاحية المالك من نفسك', 403);
    }

    await permissionEnforcer.revoke(
        firmId,
        relationData,
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

    // Only admins can view resource relations
    if (!['owner', 'admin'].includes(req.firmRole)) {
        throw CustomException('ليس لديك صلاحية لعرض العلاقات', 403);
    }

    // Sanitize object ID
    const sanitizedObject = sanitizeObjectId(object);

    const query = { firmId, namespace, object: sanitizedObject };
    if (relation) query.relation = relation;

    const tuples = await RelationTuple.find(query).lean();

    // IDOR protection - verify all tuples belong to user's firm
    const hasInvalidTuples = tuples.some(tuple => tuple.firmId.toString() !== firmId.toString());
    if (hasInvalidTuples) {
        throw CustomException('غير مصرح لك بعرض هذه العلاقات', 403);
    }

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

    // For users without firmId (solo lawyers or non-firm users),
    // return empty sidebar items instead of throwing 403
    if (!firmId) {
        return res.json({
            success: true,
            data: {
                items: [],
                reason: 'NO_FIRM_MEMBERSHIP'
            }
        });
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

    // Mass assignment protection
    const allowedFields = ['routePath'];
    const sanitizedData = pickAllowedFields(req.body, allowedFields);

    if (!sanitizedData.routePath) {
        throw CustomException('يجب تحديد مسار الصفحة', 400);
    }

    const { routePath } = sanitizedData;

    // For users without firmId (solo lawyers or non-firm users),
    // return allowed: false for firm-specific pages instead of throwing 403
    if (!firmId) {
        return res.json({
            allowed: false,
            reason: 'NO_FIRM_MEMBERSHIP',
            message: 'يجب أن تكون عضواً في مكتب للوصول',
            pageId: null,
            pageName: routePath
        });
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

    if (!firmId) {
        throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
    }

    // Only owner can modify UI access config
    if (req.firmRole !== 'owner') {
        throw CustomException('فقط مالك المكتب يمكنه تعديل إعدادات واجهة المستخدم', 403);
    }

    // Mass assignment protection
    const allowedFields = ['settings'];
    const sanitizedData = pickAllowedFields(req.body, allowedFields);

    const config = await UIAccessConfig.findOne({ firmId });

    if (!config) {
        throw CustomException('لم يتم العثور على إعدادات واجهة المستخدم', 404);
    }

    // IDOR protection - verify config belongs to user's firm
    if (config.firmId.toString() !== firmId.toString()) {
        throw CustomException('غير مصرح لك بتعديل هذه الإعدادات', 403);
    }

    if (sanitizedData.settings) {
        config.settings = { ...config.settings, ...sanitizedData.settings };
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

    if (!firmId) {
        throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
    }

    // Only owner can modify sidebar visibility
    if (req.firmRole !== 'owner') {
        throw CustomException('فقط مالك المكتب يمكنه تعديل إظهار القوائم', 403);
    }

    // Mass assignment protection
    const allowedFields = ['role', 'visible'];
    const sanitizedData = pickAllowedFields(req.body, allowedFields);

    if (!sanitizedData.role || sanitizedData.visible === undefined) {
        throw CustomException('يجب تحديد الدور والإظهار', 400);
    }

    // Sanitize itemId
    const sanitizedItemId = sanitizeObjectId(itemId);

    await UIAccessConfig.updateSidebarVisibility(firmId, sanitizedItemId, sanitizedData.role, sanitizedData.visible, req.userID);

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

    if (!firmId) {
        throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
    }

    // Only owner can modify page access
    if (req.firmRole !== 'owner') {
        throw CustomException('فقط مالك المكتب يمكنه تعديل صلاحيات الصفحات', 403);
    }

    // Mass assignment protection
    const allowedFields = ['role', 'hasAccess'];
    const sanitizedData = pickAllowedFields(req.body, allowedFields);

    if (!sanitizedData.role || sanitizedData.hasAccess === undefined) {
        throw CustomException('يجب تحديد الدور والصلاحية', 400);
    }

    // Sanitize pageId
    const sanitizedPageId = sanitizeObjectId(pageId);

    await UIAccessConfig.updatePageAccess(firmId, sanitizedPageId, sanitizedData.role, sanitizedData.hasAccess, req.userID);

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

    if (!firmId) {
        throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
    }

    // Only owner can modify role access
    if (req.firmRole !== 'owner') {
        throw CustomException('فقط مالك المكتب يمكنه تعديل صلاحيات الأدوار', 403);
    }

    // Mass assignment protection
    const allowedFields = ['sidebarItems', 'pageAccess'];
    const sanitizedData = pickAllowedFields(req.body, allowedFields);

    // Prevent privilege escalation - owner role modifications require extra caution
    if (role === 'owner') {
        throw CustomException('لا يمكن تعديل صلاحيات دور المالك', 403);
    }

    await UIAccessConfig.bulkUpdateRoleVisibility(
        firmId,
        role,
        sanitizedData,
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

    if (!firmId) {
        throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
    }

    // Only admins can add user overrides
    if (!['owner', 'admin'].includes(req.firmRole)) {
        throw CustomException('ليس لديك صلاحية لإضافة استثناءات المستخدمين', 403);
    }

    // Mass assignment protection
    const allowedFields = ['userId', 'showSidebarItems', 'hideSidebarItems', 'grantPageAccess', 'denyPageAccess', 'reason', 'expiresAt'];
    const sanitizedData = pickAllowedFields(req.body, allowedFields);

    if (!sanitizedData.userId) {
        throw CustomException('يجب تحديد المستخدم', 400);
    }

    // Sanitize userId
    const sanitizedUserId = sanitizeObjectId(sanitizedData.userId);

    // Prevent privilege escalation - users cannot grant overrides to themselves
    if (sanitizedUserId === req.userID.toString()) {
        throw CustomException('لا يمكنك إضافة استثناءات لنفسك', 403);
    }

    await UIAccessConfig.addUserOverride(
        firmId,
        {
            userId: sanitizedUserId,
            showSidebarItems: sanitizedData.showSidebarItems || [],
            hideSidebarItems: sanitizedData.hideSidebarItems || [],
            grantPageAccess: sanitizedData.grantPageAccess || [],
            denyPageAccess: sanitizedData.denyPageAccess || [],
            reason: sanitizedData.reason,
            expiresAt: sanitizedData.expiresAt
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

    // Only admins can remove user overrides
    if (!['owner', 'admin'].includes(req.firmRole)) {
        throw CustomException('ليس لديك صلاحية لحذف استثناءات المستخدمين', 403);
    }

    // Sanitize userId
    const sanitizedUserId = sanitizeObjectId(userId);

    await UIAccessConfig.removeUserOverride(firmId, sanitizedUserId, req.userID);

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
