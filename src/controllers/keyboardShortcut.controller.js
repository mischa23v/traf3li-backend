/**
 * Keyboard Shortcut Controller
 *
 * Handles keyboard shortcut operations including:
 * - Retrieving user shortcuts
 * - Updating shortcuts
 * - Resetting shortcuts to defaults
 * - Creating custom shortcuts
 * - Deleting custom shortcuts
 * - Conflict detection
 */

const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');
const KeyboardShortcutService = require('../services/keyboardShortcut.service');

/**
 * Get user's keyboard shortcuts
 * GET /api/keyboard-shortcuts
 */
const getShortcuts = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;

    if (!userId) {
        throw CustomException('معرف المستخدم مطلوب', 401);
    }

    const result = await KeyboardShortcutService.getShortcuts(userId, firmId);

    res.status(200).json({
        success: true,
        data: result
    });
});

/**
 * Get default keyboard shortcuts
 * GET /api/keyboard-shortcuts/defaults
 */
const getDefaults = asyncHandler(async (req, res) => {
    const result = await KeyboardShortcutService.getDefaultShortcuts();

    res.status(200).json({
        success: true,
        data: result
    });
});

/**
 * Update a keyboard shortcut
 * PUT /api/keyboard-shortcuts/:id
 */
const updateShortcut = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;
    const { id } = req.params;

    if (!userId) {
        throw CustomException('معرف المستخدم مطلوب', 401);
    }

    if (!id || typeof id !== 'string' || id.trim().length === 0) {
        throw CustomException('معرف الاختصار مطلوب', 400);
    }

    // Mass assignment protection - only allow specific fields
    const allowedFields = ['key', 'modifiers', 'action', 'isEnabled'];
    const shortcutData = pickAllowedFields(req.body, allowedFields);

    // Validate at least one field is being updated
    if (Object.keys(shortcutData).length === 0) {
        throw CustomException('يجب توفير حقل واحد على الأقل للتحديث', 400);
    }

    // Validate modifiers if provided
    if (shortcutData.modifiers !== undefined) {
        if (!Array.isArray(shortcutData.modifiers)) {
            throw CustomException('يجب أن تكون المعدلات مصفوفة', 400);
        }

        const validModifiers = ['ctrl', 'alt', 'shift', 'meta'];
        for (const modifier of shortcutData.modifiers) {
            if (!validModifiers.includes(modifier)) {
                throw CustomException(`معدل غير صالح: ${modifier}`, 400);
            }
        }
    }

    // Validate key if provided
    if (shortcutData.key && typeof shortcutData.key !== 'string') {
        throw CustomException('يجب أن يكون المفتاح نصاً', 400);
    }

    // Validate action if provided
    if (shortcutData.action && typeof shortcutData.action !== 'string') {
        throw CustomException('يجب أن يكون الإجراء نصاً', 400);
    }

    // Validate isEnabled if provided
    if (shortcutData.isEnabled !== undefined && typeof shortcutData.isEnabled !== 'boolean') {
        throw CustomException('يجب أن يكون isEnabled قيمة منطقية', 400);
    }

    const result = await KeyboardShortcutService.updateShortcut(userId, id, shortcutData, firmId);

    res.status(200).json({
        success: true,
        message: 'تم تحديث الاختصار بنجاح',
        data: result
    });
});

/**
 * Reset a keyboard shortcut to default
 * POST /api/keyboard-shortcuts/:id/reset
 */
const resetShortcut = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;
    const { id } = req.params;

    if (!userId) {
        throw CustomException('معرف المستخدم مطلوب', 401);
    }

    if (!id || typeof id !== 'string' || id.trim().length === 0) {
        throw CustomException('معرف الاختصار مطلوب', 400);
    }

    const result = await KeyboardShortcutService.resetShortcut(userId, id, firmId);

    res.status(200).json({
        success: true,
        message: 'تم إعادة تعيين الاختصار إلى الافتراضي بنجاح',
        data: result
    });
});

/**
 * Reset all keyboard shortcuts to defaults
 * POST /api/keyboard-shortcuts/reset-all
 */
const resetAllShortcuts = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;

    if (!userId) {
        throw CustomException('معرف المستخدم مطلوب', 401);
    }

    const result = await KeyboardShortcutService.resetAllShortcuts(userId, firmId);

    res.status(200).json({
        success: true,
        message: 'تم إعادة تعيين جميع الاختصارات إلى الافتراضي بنجاح',
        data: result
    });
});

/**
 * Create a custom keyboard shortcut
 * POST /api/keyboard-shortcuts
 */
const createShortcut = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;

    if (!userId) {
        throw CustomException('معرف المستخدم مطلوب', 401);
    }

    // Mass assignment protection - only allow specific fields
    const allowedFields = ['shortcutId', 'key', 'modifiers', 'action', 'isEnabled'];
    const shortcutData = pickAllowedFields(req.body, allowedFields);

    // Validate required fields
    if (!shortcutData.shortcutId || typeof shortcutData.shortcutId !== 'string' || shortcutData.shortcutId.trim().length === 0) {
        throw CustomException('معرف الاختصار مطلوب', 400);
    }

    if (!shortcutData.key || typeof shortcutData.key !== 'string' || shortcutData.key.trim().length === 0) {
        throw CustomException('المفتاح مطلوب', 400);
    }

    if (!shortcutData.action || typeof shortcutData.action !== 'string' || shortcutData.action.trim().length === 0) {
        throw CustomException('الإجراء مطلوب', 400);
    }

    // Validate modifiers if provided
    if (shortcutData.modifiers !== undefined) {
        if (!Array.isArray(shortcutData.modifiers)) {
            throw CustomException('يجب أن تكون المعدلات مصفوفة', 400);
        }

        const validModifiers = ['ctrl', 'alt', 'shift', 'meta'];
        for (const modifier of shortcutData.modifiers) {
            if (!validModifiers.includes(modifier)) {
                throw CustomException(`معدل غير صالح: ${modifier}`, 400);
            }
        }
    }

    // Validate isEnabled if provided
    if (shortcutData.isEnabled !== undefined && typeof shortcutData.isEnabled !== 'boolean') {
        throw CustomException('يجب أن يكون isEnabled قيمة منطقية', 400);
    }

    // Validate shortcutId format (alphanumeric, underscore, hyphen only)
    if (!/^[a-zA-Z0-9_-]+$/.test(shortcutData.shortcutId)) {
        throw CustomException('معرف الاختصار يجب أن يحتوي على أحرف وأرقام وشرطة سفلية وشرطة فقط', 400);
    }

    const result = await KeyboardShortcutService.createShortcut(userId, shortcutData, firmId);

    res.status(201).json({
        success: true,
        message: 'تم إنشاء الاختصار المخصص بنجاح',
        data: result
    });
});

/**
 * Delete a custom keyboard shortcut
 * DELETE /api/keyboard-shortcuts/:id
 */
const deleteShortcut = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;
    const { id } = req.params;

    if (!userId) {
        throw CustomException('معرف المستخدم مطلوب', 401);
    }

    if (!id || typeof id !== 'string' || id.trim().length === 0) {
        throw CustomException('معرف الاختصار مطلوب', 400);
    }

    const result = await KeyboardShortcutService.deleteShortcut(userId, id, firmId);

    res.status(200).json({
        success: true,
        message: 'تم حذف الاختصار المخصص بنجاح',
        data: result
    });
});

/**
 * Check for keyboard shortcut conflicts
 * POST /api/keyboard-shortcuts/check-conflict
 */
const checkConflict = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;

    if (!userId) {
        throw CustomException('معرف المستخدم مطلوب', 401);
    }

    // Mass assignment protection - only allow specific fields
    const allowedFields = ['key', 'modifiers', 'excludeId'];
    const checkData = pickAllowedFields(req.body, allowedFields);

    // Validate required fields
    if (!checkData.key || typeof checkData.key !== 'string' || checkData.key.trim().length === 0) {
        throw CustomException('المفتاح مطلوب', 400);
    }

    // Validate modifiers if provided
    let modifiers = [];
    if (checkData.modifiers !== undefined) {
        if (!Array.isArray(checkData.modifiers)) {
            throw CustomException('يجب أن تكون المعدلات مصفوفة', 400);
        }

        const validModifiers = ['ctrl', 'alt', 'shift', 'meta'];
        for (const modifier of checkData.modifiers) {
            if (!validModifiers.includes(modifier)) {
                throw CustomException(`معدل غير صالح: ${modifier}`, 400);
            }
        }

        modifiers = checkData.modifiers;
    }

    const result = await KeyboardShortcutService.checkConflict(
        userId,
        checkData.key,
        modifiers,
        firmId,
        checkData.excludeId || null
    );

    res.status(200).json({
        success: true,
        data: result
    });
});

/**
 * Get a specific keyboard shortcut by ID
 * GET /api/keyboard-shortcuts/:id
 */
const getShortcutById = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;
    const { id } = req.params;

    if (!userId) {
        throw CustomException('معرف المستخدم مطلوب', 401);
    }

    if (!id || typeof id !== 'string' || id.trim().length === 0) {
        throw CustomException('معرف الاختصار مطلوب', 400);
    }

    const result = await KeyboardShortcutService.getShortcutById(userId, id, firmId);

    res.status(200).json({
        success: true,
        data: result
    });
});

module.exports = {
    getShortcuts,
    getDefaults,
    updateShortcut,
    resetShortcut,
    resetAllShortcuts,
    createShortcut,
    deleteShortcut,
    checkConflict,
    getShortcutById
};
