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
const AuditLog = require('../models/auditLog.model');
const CustomException = require('../utils/CustomException');

/**
 * GET /api/api-keys
 * Get all API keys for the firm
 */
const getApiKeys = asyncHandler(async (req, res) => {
    const firmId = req.firmId;

    if (!firmId) {
        throw CustomException('يجب أن تكون عضواً في مكتب للوصول إلى مفاتيح API', 403);
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
    const { name, description, scopes, expiresAt, allowedIps, rateLimit } = req.body;
    const firmId = req.firmId;
    const userId = req.userID;

    if (!firmId) {
        throw CustomException('يجب أن تكون عضواً في مكتب لإنشاء مفتاح API', 403);
    }

    // Validate name
    if (!name || name.trim().length === 0) {
        throw CustomException('اسم مفتاح API مطلوب', 400);
    }

    // Validate scopes
    const validScopes = [
        'read:cases', 'write:cases', 'read:clients', 'write:clients',
        'read:invoices', 'write:invoices', 'read:documents', 'write:documents',
        'read:reports', 'read:contacts', 'write:contacts', 'read:tasks',
        'write:tasks', 'read:time_entries', 'write:time_entries', 'admin'
    ];

    if (scopes && scopes.length > 0) {
        const invalidScopes = scopes.filter(s => !validScopes.includes(s));
        if (invalidScopes.length > 0) {
            throw CustomException(`نطاقات غير صالحة: ${invalidScopes.join(', ')}`, 400);
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
    await AuditLog.log({
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
    const { id } = req.params;
    const firmId = req.firmId;

    const apiKey = await ApiKey.findOne({ _id: id, firmId })
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
    const { id } = req.params;
    const { name, description, scopes, allowedIps, rateLimit } = req.body;
    const firmId = req.firmId;
    const userId = req.userID;

    const apiKey = await ApiKey.findOne({ _id: id, firmId });

    if (!apiKey) {
        throw CustomException('مفتاح API غير موجود', 404);
    }

    if (!apiKey.isActive) {
        throw CustomException('لا يمكن تعديل مفتاح API ملغى', 400);
    }

    // Update fields
    if (name) apiKey.name = name.trim();
    if (description !== undefined) apiKey.description = description?.trim();
    if (scopes) apiKey.scopes = scopes;
    if (allowedIps !== undefined) apiKey.allowedIps = allowedIps;
    if (rateLimit) apiKey.rateLimit = rateLimit;

    await apiKey.save();

    // Log the action
    await AuditLog.log({
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
    const { id } = req.params;
    const { reason } = req.body;
    const firmId = req.firmId;
    const userId = req.userID;

    const apiKey = await ApiKey.findOne({ _id: id, firmId });

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
    await AuditLog.log({
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
        throw CustomException('يجب أن تكون عضواً في مكتب', 403);
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
    const { id } = req.params;
    const firmId = req.firmId;
    const userId = req.userID;

    const oldKey = await ApiKey.findOne({ _id: id, firmId });

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
    await AuditLog.log({
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
