/**
 * API Key Controller
 *
 * Handles API key management operations including:
 * - Creating new API keys
 * - Listing API keys
 * - Revoking API keys
 * - Getting API key statistics
 */

const asyncHandler = require('../utils/asyncHandler');
const ApiKey = require('../models/apiKey.model');
const QueueService = require('../services/queue.service');
const CustomException = require('../utils/CustomException');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');

/**
 * GET /api/api-keys
 * Get all API keys for the firm
 */
const getApiKeys = asyncHandler(async (req, res) => {
    const firmId = req.firmId;

    if (!firmId) {
        throw CustomException('المورد غير موجود', 404);
    }

    const keys = await ApiKey.find({ firmId })
        .select('-keyHash')
        .populate('createdBy', 'firstName lastName email')
        .populate('revokedBy', 'firstName lastName email')
        .sort({ createdAt: -1 })
        .lean();

    // Add status to each key
    const formattedKeys = keys.map(key => ({
        ...key,
        status: key.isActive
            ? (key.expiresAt && new Date() > key.expiresAt ? 'expired' : 'active')
            : 'revoked'
    }));

    res.status(200).json({
        success: true,
        data: formattedKeys
    });
});

/**
 * POST /api/api-keys
 * Create a new API key
 */
const createApiKey = asyncHandler(async (req, res) => {
    const firmId = req.firmId;
    const userId = req.userID;

    if (!firmId) {
        throw CustomException('المورد غير موجود', 404);
    }

    // Mass assignment protection - only allow specific fields
    const allowedFields = ['name', 'description', 'scopes', 'expiresAt', 'allowedIps', 'rateLimit'];
    const sanitizedData = pickAllowedFields(req.body, allowedFields);
    const { name, description, scopes, expiresAt, allowedIps, rateLimit } = sanitizedData;

    // Validate name
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
        throw CustomException('اسم مفتاح API مطلوب', 400);
    }

    if (name.trim().length > 100) {
        throw CustomException('اسم مفتاح API يجب أن يكون أقل من 100 حرف', 400);
    }

    // Validate description
    if (description && (typeof description !== 'string' || description.trim().length > 500)) {
        throw CustomException('وصف مفتاح API يجب أن يكون أقل من 500 حرف', 400);
    }

    // Validate scopes
    const validScopes = [
        'read:cases', 'write:cases', 'read:clients', 'write:clients',
        'read:invoices', 'write:invoices', 'read:documents', 'write:documents',
        'read:reports', 'read:contacts', 'write:contacts', 'read:tasks',
        'write:tasks', 'read:time_entries', 'write:time_entries', 'admin'
    ];

    if (scopes) {
        if (!Array.isArray(scopes)) {
            throw CustomException('النطاقات يجب أن تكون مصفوفة', 400);
        }

        if (scopes.length > 0) {
            const invalidScopes = scopes.filter(s => typeof s !== 'string' || !validScopes.includes(s));
            if (invalidScopes.length > 0) {
                throw CustomException(`نطاقات غير صالحة: ${invalidScopes.join(', ')}`, 400);
            }
        }

        // Prevent granting admin scope unless user is admin
        if (scopes.includes('admin') && req.user?.role !== 'admin') {
            throw CustomException('فقط المسؤولون يمكنهم إنشاء مفاتيح API بصلاحيات المسؤول', 403);
        }
    }

    // Validate expiresAt
    if (expiresAt) {
        const expiryDate = new Date(expiresAt);
        if (isNaN(expiryDate.getTime())) {
            throw CustomException('تاريخ انتهاء الصلاحية غير صالح', 400);
        }
        if (expiryDate <= new Date()) {
            throw CustomException('تاريخ انتهاء الصلاحية يجب أن يكون في المستقبل', 400);
        }
    }

    // Validate allowedIps
    if (allowedIps) {
        if (!Array.isArray(allowedIps)) {
            throw CustomException('عناوين IP المسموحة يجب أن تكون مصفوفة', 400);
        }
        // Basic IP validation
        const ipRegex = /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/;
        const invalidIps = allowedIps.filter(ip => typeof ip !== 'string' || !ipRegex.test(ip));
        if (invalidIps.length > 0) {
            throw CustomException('عناوين IP غير صالحة', 400);
        }
    }

    // Validate rateLimit
    if (rateLimit !== undefined) {
        if (typeof rateLimit !== 'number' || rateLimit < 1 || rateLimit > 10000) {
            throw CustomException('حد المعدل يجب أن يكون رقماً بين 1 و 10000', 400);
        }
    }

    // Generate API key
    const { key, prefix, hash } = ApiKey.generateKey();

    // Create API key document
    const apiKey = await ApiKey.create({
        firmId,
        createdBy: userId,
        name: name.trim(),
        description: description?.trim(),
        scopes: scopes || ['read:cases', 'read:clients'],
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        allowedIps: allowedIps || [],
        rateLimit: rateLimit || 1000,
        keyPrefix: prefix,
        keyHash: hash
    });

    // Log the action
    QueueService.logAudit({
        userId,
        userEmail: req.user?.email || 'unknown',
        userRole: req.user?.role || 'lawyer',
        userName: `${req.user?.firstName || ''} ${req.user?.lastName || ''}`.trim(),
        firmId,
        action: 'create',
        resourceType: 'api_key',
        resourceId: apiKey._id,
        resourceName: name,
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('user-agent'),
        status: 'success',
        severity: 'medium',
        details: {
            scopes,
            expiresAt,
            hasIpRestrictions: allowedIps && allowedIps.length > 0
        }
    }).catch(() => {});

    // Return the full key ONLY on creation (it's not stored)
    res.status(201).json({
        success: true,
        message: 'تم إنشاء مفتاح API بنجاح. احفظ المفتاح الآن - لن يظهر مرة أخرى.',
        data: {
            _id: apiKey._id,
            name: apiKey.name,
            description: apiKey.description,
            scopes: apiKey.scopes,
            keyPrefix: apiKey.keyPrefix,
            key, // Only returned once!
            expiresAt: apiKey.expiresAt,
            allowedIps: apiKey.allowedIps,
            rateLimit: apiKey.rateLimit,
            createdAt: apiKey.createdAt
        }
    });
});

/**
 * GET /api/api-keys/:id
 * Get a specific API key details
 */
const getApiKey = asyncHandler(async (req, res) => {
    const firmId = req.firmId;

    if (!firmId) {
        throw CustomException('المورد غير موجود', 404);
    }

    // IDOR protection - sanitize and validate ID
    const apiKeyId = sanitizeObjectId(req.params.id);
    if (!apiKeyId) {
        throw CustomException('معرف مفتاح API غير صالح', 400);
    }

    // Verify ownership through firmId
    const apiKey = await ApiKey.findOne({ _id: apiKeyId, firmId })
        .select('-keyHash')
        .populate('createdBy', 'firstName lastName email')
        .populate('revokedBy', 'firstName lastName email')
        .lean();

    if (!apiKey) {
        throw CustomException('مفتاح API غير موجود', 404);
    }

    res.status(200).json({
        success: true,
        data: {
            ...apiKey,
            status: apiKey.isActive
                ? (apiKey.expiresAt && new Date() > apiKey.expiresAt ? 'expired' : 'active')
                : 'revoked'
        }
    });
});

/**
 * PATCH /api/api-keys/:id
 * Update an API key (name, description, scopes, allowedIps)
 */
const updateApiKey = asyncHandler(async (req, res) => {
    const firmId = req.firmId;
    const userId = req.userID;

    if (!firmId) {
        throw CustomException('المورد غير موجود', 404);
    }

    // IDOR protection - sanitize and validate ID
    const apiKeyId = sanitizeObjectId(req.params.id);
    if (!apiKeyId) {
        throw CustomException('معرف مفتاح API غير صالح', 400);
    }

    // Mass assignment protection - only allow specific fields
    const allowedFields = ['name', 'description', 'scopes', 'allowedIps', 'rateLimit'];
    const sanitizedData = pickAllowedFields(req.body, allowedFields);
    const { name, description, scopes, allowedIps, rateLimit } = sanitizedData;

    // Verify ownership through firmId
    const apiKey = await ApiKey.findOne({ _id: apiKeyId, firmId });

    if (!apiKey) {
        throw CustomException('مفتاح API غير موجود', 404);
    }

    if (!apiKey.isActive) {
        throw CustomException('لا يمكن تعديل مفتاح API ملغى', 400);
    }

    // Validate name if provided
    if (name !== undefined) {
        if (typeof name !== 'string' || name.trim().length === 0) {
            throw CustomException('اسم مفتاح API مطلوب', 400);
        }
        if (name.trim().length > 100) {
            throw CustomException('اسم مفتاح API يجب أن يكون أقل من 100 حرف', 400);
        }
        apiKey.name = name.trim();
    }

    // Validate description if provided
    if (description !== undefined) {
        if (description && (typeof description !== 'string' || description.trim().length > 500)) {
            throw CustomException('وصف مفتاح API يجب أن يكون أقل من 500 حرف', 400);
        }
        apiKey.description = description?.trim();
    }

    // Validate scopes if provided
    if (scopes !== undefined) {
        if (!Array.isArray(scopes)) {
            throw CustomException('النطاقات يجب أن تكون مصفوفة', 400);
        }

        const validScopes = [
            'read:cases', 'write:cases', 'read:clients', 'write:clients',
            'read:invoices', 'write:invoices', 'read:documents', 'write:documents',
            'read:reports', 'read:contacts', 'write:contacts', 'read:tasks',
            'write:tasks', 'read:time_entries', 'write:time_entries', 'admin'
        ];

        const invalidScopes = scopes.filter(s => typeof s !== 'string' || !validScopes.includes(s));
        if (invalidScopes.length > 0) {
            throw CustomException(`نطاقات غير صالحة: ${invalidScopes.join(', ')}`, 400);
        }

        // Prevent granting admin scope unless user is admin
        if (scopes.includes('admin') && req.user?.role !== 'admin') {
            throw CustomException('فقط المسؤولون يمكنهم منح صلاحيات المسؤول', 403);
        }

        apiKey.scopes = scopes;
    }

    // Validate allowedIps if provided
    if (allowedIps !== undefined) {
        if (!Array.isArray(allowedIps)) {
            throw CustomException('عناوين IP المسموحة يجب أن تكون مصفوفة', 400);
        }
        const ipRegex = /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/;
        const invalidIps = allowedIps.filter(ip => typeof ip !== 'string' || !ipRegex.test(ip));
        if (invalidIps.length > 0) {
            throw CustomException('عناوين IP غير صالحة', 400);
        }
        apiKey.allowedIps = allowedIps;
    }

    // Validate rateLimit if provided
    if (rateLimit !== undefined) {
        if (typeof rateLimit !== 'number' || rateLimit < 1 || rateLimit > 10000) {
            throw CustomException('حد المعدل يجب أن يكون رقماً بين 1 و 10000', 400);
        }
        apiKey.rateLimit = rateLimit;
    }

    await apiKey.save();

    // Log the action
    QueueService.logAudit({
        userId,
        userEmail: req.user?.email || 'unknown',
        userRole: req.user?.role || 'lawyer',
        firmId,
        action: 'update',
        resourceType: 'api_key',
        resourceId: apiKey._id,
        resourceName: apiKey.name,
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('user-agent'),
        status: 'success',
        severity: 'low'
    }).catch(() => {});

    res.status(200).json({
        success: true,
        message: 'تم تحديث مفتاح API بنجاح',
        data: apiKey
    });
});

/**
 * DELETE /api/api-keys/:id
 * Revoke an API key
 */
const revokeApiKey = asyncHandler(async (req, res) => {
    const firmId = req.firmId;
    const userId = req.userID;

    if (!firmId) {
        throw CustomException('المورد غير موجود', 404);
    }

    // IDOR protection - sanitize and validate ID
    const apiKeyId = sanitizeObjectId(req.params.id);
    if (!apiKeyId) {
        throw CustomException('معرف مفتاح API غير صالح', 400);
    }

    // Mass assignment protection
    const allowedFields = ['reason'];
    const sanitizedData = pickAllowedFields(req.body, allowedFields);
    const { reason } = sanitizedData;

    // Validate reason if provided
    if (reason && (typeof reason !== 'string' || reason.trim().length > 500)) {
        throw CustomException('سبب الإلغاء يجب أن يكون أقل من 500 حرف', 400);
    }

    // Verify ownership through firmId
    const apiKey = await ApiKey.findOne({ _id: apiKeyId, firmId });

    if (!apiKey) {
        throw CustomException('مفتاح API غير موجود', 404);
    }

    if (!apiKey.isActive) {
        throw CustomException('مفتاح API ملغى بالفعل', 400);
    }

    // Revoke the key
    apiKey.isActive = false;
    apiKey.revokedAt = new Date();
    apiKey.revokedBy = userId;
    apiKey.revocationReason = reason || null;

    await apiKey.save();

    // Log the action
    QueueService.logAudit({
        userId,
        userEmail: req.user?.email || 'unknown',
        userRole: req.user?.role || 'lawyer',
        firmId,
        action: 'delete',
        resourceType: 'api_key',
        resourceId: apiKey._id,
        resourceName: apiKey.name,
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('user-agent'),
        status: 'success',
        severity: 'high',
        details: { reason }
    }).catch(() => {});

    res.status(200).json({
        success: true,
        message: 'تم إلغاء مفتاح API بنجاح',
        data: {
            _id: apiKey._id,
            name: apiKey.name,
            revokedAt: apiKey.revokedAt
        }
    });
});

/**
 * GET /api/api-keys/stats
 * Get API key statistics for the firm
 */
const getApiKeyStats = asyncHandler(async (req, res) => {
    const firmId = req.firmId;

    if (!firmId) {
        throw CustomException('المورد غير موجود', 404);
    }

    const stats = await ApiKey.getStats(firmId);

    // Get recent usage
    const recentKeys = await ApiKey.find({ firmId, lastUsedAt: { $ne: null } })
        .select('name lastUsedAt usageCount')
        .sort({ lastUsedAt: -1 })
        .limit(5)
        .lean();

    res.status(200).json({
        success: true,
        data: {
            ...stats,
            recentlyUsed: recentKeys
        }
    });
});

/**
 * POST /api/api-keys/:id/regenerate
 * Regenerate an API key (creates new key, revokes old)
 */
const regenerateApiKey = asyncHandler(async (req, res) => {
    const firmId = req.firmId;
    const userId = req.userID;

    if (!firmId) {
        throw CustomException('المورد غير موجود', 404);
    }

    // IDOR protection - sanitize and validate ID
    const apiKeyId = sanitizeObjectId(req.params.id);
    if (!apiKeyId) {
        throw CustomException('معرف مفتاح API غير صالح', 400);
    }

    // Verify ownership through firmId
    const oldKey = await ApiKey.findOne({ _id: apiKeyId, firmId });

    if (!oldKey) {
        throw CustomException('مفتاح API غير موجود', 404);
    }

    // Revoke old key
    oldKey.isActive = false;
    oldKey.revokedAt = new Date();
    oldKey.revokedBy = userId;
    oldKey.revocationReason = 'Regenerated';
    await oldKey.save();

    // Generate new key
    const { key, prefix, hash } = ApiKey.generateKey();

    const newKey = await ApiKey.create({
        firmId,
        createdBy: userId,
        name: oldKey.name,
        description: oldKey.description,
        scopes: oldKey.scopes,
        expiresAt: oldKey.expiresAt,
        allowedIps: oldKey.allowedIps,
        rateLimit: oldKey.rateLimit,
        keyPrefix: prefix,
        keyHash: hash,
        metadata: {
            regeneratedFrom: oldKey._id
        }
    });

    // Log the action
    QueueService.logAudit({
        userId,
        userEmail: req.user?.email || 'unknown',
        userRole: req.user?.role || 'lawyer',
        firmId,
        action: 'create',
        resourceType: 'api_key',
        resourceId: newKey._id,
        resourceName: newKey.name,
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('user-agent'),
        status: 'success',
        severity: 'high',
        details: {
            action: 'regenerate',
            oldKeyId: oldKey._id
        }
    }).catch(() => {});

    res.status(200).json({
        success: true,
        message: 'تم إعادة إنشاء مفتاح API بنجاح. احفظ المفتاح الجديد الآن.',
        data: {
            _id: newKey._id,
            name: newKey.name,
            key, // Only returned once!
            scopes: newKey.scopes,
            createdAt: newKey.createdAt
        }
    });
});

module.exports = {
    getApiKeys,
    createApiKey,
    getApiKey,
    updateApiKey,
    revokeApiKey,
    getApiKeyStats,
    regenerateApiKey
};
