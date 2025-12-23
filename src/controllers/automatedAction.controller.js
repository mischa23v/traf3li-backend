const { Case, Task, Notification, Client, Invoice, Document, User } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');

// Note: AutomatedAction model needs to be created and added to models/index.js
// const { AutomatedAction } = require('../models');

// ============================================
// SECURITY VALIDATION HELPERS
// ============================================

/**
 * Validate URL format
 * Prevents SSRF and injection attacks through URL validation
 */
const validateUrl = (url) => {
    if (!url || typeof url !== 'string') {
        return false;
    }

    try {
        const parsed = new URL(url);
        // Only allow http and https protocols
        if (!['http:', 'https:'].includes(parsed.protocol)) {
            return false;
        }
        // Prevent internal network access (SSRF protection)
        const hostname = parsed.hostname.toLowerCase();
        if (hostname === 'localhost' ||
            hostname === '127.0.0.1' ||
            hostname.startsWith('192.168.') ||
            hostname.startsWith('10.') ||
            hostname.startsWith('172.16.') ||
            hostname === '0.0.0.0') {
            return false;
        }
        return true;
    } catch {
        return false;
    }
};

/**
 * Validate server action code for dangerous patterns
 * Prevents code injection attacks in automation rules
 */
const validateServerActionCode = (code) => {
    if (!code || typeof code !== 'string') {
        return { valid: false, error: 'كود الإجراء غير صالح' };
    }

    // Dangerous patterns that could lead to code injection or system access
    const dangerousPatterns = [
        /require\s*\(/i,           // Module loading
        /import\s+/i,              // ES6 imports
        /eval\s*\(/i,              // eval execution
        /Function\s*\(/i,          // Function constructor
        /child_process/i,          // Process execution
        /fs\./i,                   // File system access
        /exec\s*\(/i,              // Command execution
        /spawn\s*\(/i,             // Process spawning
        /\.constructor/i,          // Constructor access
        /__proto__/i,              // Prototype pollution
        /process\./i,              // Process object access
        /global\./i,               // Global object access
        /\.call\s*\(/i,            // Function call manipulation
        /\.apply\s*\(/i,           // Function apply manipulation
        /setTimeout\s*\(/i,        // Delayed execution
        /setInterval\s*\(/i,       // Repeated execution
        /setImmediate\s*\(/i,      // Immediate execution
    ];

    for (const pattern of dangerousPatterns) {
        if (pattern.test(code)) {
            return {
                valid: false,
                error: 'كود الإجراء يحتوي على أنماط خطيرة ممنوعة (Dangerous code patterns detected)'
            };
        }
    }

    // Maximum code length to prevent DoS
    if (code.length > 10000) {
        return { valid: false, error: 'كود الإجراء طويل جداً (Code too long)' };
    }

    return { valid: true };
};

/**
 * Validate webhook headers object
 */
const validateWebhookHeaders = (headers) => {
    if (!headers) {
        return { valid: true };
    }

    if (typeof headers !== 'object' || Array.isArray(headers)) {
        return { valid: false, error: 'رؤوس الويب هوك يجب أن تكون كائن صالح' };
    }

    // Check for dangerous headers
    const dangerousHeaders = ['authorization', 'cookie', 'x-api-key'];
    for (const key of Object.keys(headers)) {
        const lowerKey = key.toLowerCase();
        if (dangerousHeaders.includes(lowerKey)) {
            return {
                valid: false,
                error: `رأس '${key}' ممنوع لأسباب أمنية (Header '${key}' not allowed for security reasons)`
            };
        }

        // Validate header value is string
        if (typeof headers[key] !== 'string') {
            return { valid: false, error: `قيمة رأس '${key}' يجب أن تكون نص` };
        }
    }

    return { valid: true };
};

/**
 * Validate filter domain array
 */
const validateFilterDomain = (filterDomain) => {
    if (!filterDomain) {
        return { valid: true };
    }

    if (!Array.isArray(filterDomain)) {
        return { valid: false, error: 'نطاق التصفية يجب أن يكون مصفوفة' };
    }

    // Limit array size
    if (filterDomain.length > 100) {
        return { valid: false, error: 'نطاق التصفية كبير جداً (max 100 items)' };
    }

    return { valid: true };
};

/**
 * Validate trigger field IDs array
 */
const validateTriggerFieldIds = (triggerFieldIds) => {
    if (!triggerFieldIds) {
        return { valid: true };
    }

    if (!Array.isArray(triggerFieldIds)) {
        return { valid: false, error: 'معرفات حقول المشغل يجب أن تكون مصفوفة' };
    }

    // Limit array size
    if (triggerFieldIds.length > 50) {
        return { valid: false, error: 'عدد حقول المشغل كبير جداً (max 50 items)' };
    }

    return { valid: true };
};

/**
 * Get firmId from user context
 * This should be implemented based on your authentication middleware
 */
const getFirmId = (req) => {
    // Check if firmId is set in request (from auth middleware)
    return req.firmId || req.user?.firmId || null;
};

// ============================================
// CONTROLLER FUNCTIONS
// ============================================

/**
 * Get all automated actions
 * GET /api/automated-actions
 */
const getActions = asyncHandler(async (req, res) => {
    const { model_name, trigger, isActive, page = 1, limit = 50 } = req.query;
    const lawyerId = req.userID;

    const query = { lawyerId };

    if (model_name) query.model_name = model_name;
    if (trigger) query.trigger = trigger;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    // Placeholder for AutomatedAction model
    // const actions = await AutomatedAction.find(query)
    //     .sort({ createdAt: -1 })
    //     .limit(parseInt(limit))
    //     .skip((parseInt(page) - 1) * parseInt(limit))
    //     .populate('createdBy', 'firstName lastName');

    // const total = await AutomatedAction.countDocuments(query);

    // Temporary response until AutomatedAction model is created
    const actions = [];
    const total = 0;

    res.status(200).json({
        success: true,
        data: actions,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
        }
    });
});

/**
 * Get single automated action
 * GET /api/automated-actions/:id
 */
const getAction = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;
    const firmId = getFirmId(req);

    // SECURITY: Sanitize ObjectId to prevent NoSQL injection
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('معرف غير صالح', 400);
    }

    // Placeholder for AutomatedAction model
    // SECURITY: IDOR Protection - Verify ownership via lawyerId and firmId
    // const query = { _id: sanitizedId, lawyerId };
    // if (firmId) {
    //     query.firmId = firmId;
    // }
    // const action = await AutomatedAction.findOne(query)
    //     .populate('createdBy', 'firstName lastName')
    //     .populate('trigger_field_ids');

    // if (!action) {
    //     throw CustomException('الإجراء الآلي غير موجود', 404);
    // }

    // Temporary response until AutomatedAction model is created
    throw CustomException('الإجراء الآلي غير موجود', 404);

    // res.status(200).json({
    //     success: true,
    //     data: action
    // });
});

/**
 * Create automated action
 * POST /api/automated-actions
 */
const createAction = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = getFirmId(req);

    // SECURITY: Mass assignment protection - only allow specific fields
    const allowedFields = [
        'name',
        'nameAr',
        'model_name',
        'trigger',
        'action_type',
        'filter_domain',
        'trigger_field_ids',
        'server_action_code',
        'email_template_id',
        'activity_type_id',
        'activity_summary',
        'activity_note',
        'activity_date_deadline_range',
        'activity_user_field_name',
        'update_field_id',
        'update_field_value',
        'webhook_url',
        'webhook_method',
        'webhook_headers',
        'isActive'
    ];

    const safeData = pickAllowedFields(req.body, allowedFields);

    const {
        name,
        nameAr,
        model_name,
        trigger,
        action_type,
        filter_domain,
        trigger_field_ids,
        server_action_code,
        email_template_id,
        activity_type_id,
        activity_summary,
        activity_note,
        activity_date_deadline_range,
        activity_user_field_name,
        update_field_id,
        update_field_value,
        webhook_url,
        webhook_method,
        webhook_headers,
        isActive
    } = safeData;

    // Validate required fields
    if (!name || !nameAr || !model_name || !trigger || !action_type) {
        throw CustomException('الاسم ونوع النموذج والمشغل ونوع الإجراء مطلوبون', 400);
    }

    // SECURITY: Validate filter_domain array
    const filterDomainValidation = validateFilterDomain(filter_domain);
    if (!filterDomainValidation.valid) {
        throw CustomException(filterDomainValidation.error, 400);
    }

    // SECURITY: Validate trigger_field_ids array
    const triggerFieldIdsValidation = validateTriggerFieldIds(trigger_field_ids);
    if (!triggerFieldIdsValidation.valid) {
        throw CustomException(triggerFieldIdsValidation.error, 400);
    }

    // SECURITY: Validate activity_date_deadline_range is a number
    if (activity_date_deadline_range !== undefined &&
        (typeof activity_date_deadline_range !== 'number' || isNaN(activity_date_deadline_range))) {
        throw CustomException('نطاق تاريخ النشاط يجب أن يكون رقم', 400);
    }

    // Validate required fields based on action_type
    if (action_type === 'server_action') {
        if (!server_action_code) {
            throw CustomException('كود الإجراء مطلوب لنوع الإجراء البرمجي', 400);
        }

        // SECURITY: Prevent code injection in automation rules
        const codeValidation = validateServerActionCode(server_action_code);
        if (!codeValidation.valid) {
            throw CustomException(codeValidation.error, 400);
        }
    }

    if (action_type === 'email' && !email_template_id) {
        throw CustomException('قالب البريد الإلكتروني مطلوب لنوع إجراء البريد', 400);
    }

    if (action_type === 'activity' && (!activity_type_id || !activity_summary)) {
        throw CustomException('نوع النشاط والملخص مطلوبان لنوع إجراء النشاط', 400);
    }

    if (action_type === 'update_field' && (!update_field_id || update_field_value === undefined)) {
        throw CustomException('الحقل والقيمة مطلوبان لنوع إجراء تحديث الحقل', 400);
    }

    if (action_type === 'webhook') {
        if (!webhook_url) {
            throw CustomException('عنوان URL للويب هوك مطلوب', 400);
        }

        // SECURITY: Validate webhook URL to prevent SSRF attacks
        if (!validateUrl(webhook_url)) {
            throw CustomException('عنوان URL للويب هوك غير صالح أو غير آمن', 400);
        }

        // SECURITY: Validate webhook headers
        const headersValidation = validateWebhookHeaders(webhook_headers);
        if (!headersValidation.valid) {
            throw CustomException(headersValidation.error, 400);
        }

        // Validate webhook_method
        const validMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
        if (webhook_method && !validMethods.includes(webhook_method.toUpperCase())) {
            throw CustomException('طريقة الويب هوك غير صالحة', 400);
        }
    }

    // Placeholder for AutomatedAction model
    // const actionData = {
    //     lawyerId,
    //     name,
    //     nameAr,
    //     model_name,
    //     trigger,
    //     action_type,
    //     filter_domain: filter_domain || [],
    //     trigger_field_ids: trigger_field_ids || [],
    //     server_action_code,
    //     email_template_id,
    //     activity_type_id,
    //     activity_summary,
    //     activity_note,
    //     activity_date_deadline_range: activity_date_deadline_range || 0,
    //     activity_user_field_name: activity_user_field_name || 'assignedTo',
    //     update_field_id,
    //     update_field_value,
    //     webhook_url,
    //     webhook_method: webhook_method || 'POST',
    //     webhook_headers: webhook_headers || {},
    //     isActive: isActive !== undefined ? isActive : true,
    //     createdBy: lawyerId
    // };
    //
    // // SECURITY: IDOR Protection - Associate with firmId
    // if (firmId) {
    //     actionData.firmId = firmId;
    // }
    //
    // const action = await AutomatedAction.create(actionData);

    // Temporary response until AutomatedAction model is created
    const action = {
        _id: 'temp_id',
        lawyerId,
        name,
        nameAr,
        model_name,
        trigger,
        action_type,
        isActive: isActive !== undefined ? isActive : true,
        createdAt: new Date()
    };

    res.status(201).json({
        success: true,
        message: 'تم إنشاء الإجراء الآلي بنجاح',
        data: action
    });
});

/**
 * Update automated action
 * PATCH /api/automated-actions/:id
 */
const updateAction = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;
    const firmId = getFirmId(req);

    // SECURITY: Sanitize ObjectId to prevent NoSQL injection
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('معرف غير صالح', 400);
    }

    // SECURITY: Mass assignment protection - only allow specific fields
    const allowedFields = [
        'name',
        'nameAr',
        'model_name',
        'trigger',
        'action_type',
        'filter_domain',
        'trigger_field_ids',
        'server_action_code',
        'email_template_id',
        'activity_type_id',
        'activity_summary',
        'activity_note',
        'activity_date_deadline_range',
        'activity_user_field_name',
        'update_field_id',
        'update_field_value',
        'webhook_url',
        'webhook_method',
        'webhook_headers',
        'isActive'
    ];

    const safeData = pickAllowedFields(req.body, allowedFields);

    // SECURITY: Validate inputs before update
    if (safeData.filter_domain !== undefined) {
        const filterDomainValidation = validateFilterDomain(safeData.filter_domain);
        if (!filterDomainValidation.valid) {
            throw CustomException(filterDomainValidation.error, 400);
        }
    }

    if (safeData.trigger_field_ids !== undefined) {
        const triggerFieldIdsValidation = validateTriggerFieldIds(safeData.trigger_field_ids);
        if (!triggerFieldIdsValidation.valid) {
            throw CustomException(triggerFieldIdsValidation.error, 400);
        }
    }

    if (safeData.activity_date_deadline_range !== undefined &&
        (typeof safeData.activity_date_deadline_range !== 'number' || isNaN(safeData.activity_date_deadline_range))) {
        throw CustomException('نطاق تاريخ النشاط يجب أن يكون رقم', 400);
    }

    // SECURITY: Prevent code injection in server_action_code
    if (safeData.server_action_code !== undefined) {
        const codeValidation = validateServerActionCode(safeData.server_action_code);
        if (!codeValidation.valid) {
            throw CustomException(codeValidation.error, 400);
        }
    }

    // SECURITY: Validate webhook URL
    if (safeData.webhook_url !== undefined) {
        if (!validateUrl(safeData.webhook_url)) {
            throw CustomException('عنوان URL للويب هوك غير صالح أو غير آمن', 400);
        }
    }

    // SECURITY: Validate webhook headers
    if (safeData.webhook_headers !== undefined) {
        const headersValidation = validateWebhookHeaders(safeData.webhook_headers);
        if (!headersValidation.valid) {
            throw CustomException(headersValidation.error, 400);
        }
    }

    // Validate webhook_method
    if (safeData.webhook_method !== undefined) {
        const validMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
        if (!validMethods.includes(safeData.webhook_method.toUpperCase())) {
            throw CustomException('طريقة الويب هوك غير صالحة', 400);
        }
    }

    // Placeholder for AutomatedAction model
    // SECURITY: IDOR Protection - Verify ownership via lawyerId and firmId
    // const query = { _id: sanitizedId, lawyerId };
    // if (firmId) {
    //     query.firmId = firmId;
    // }
    // const action = await AutomatedAction.findOne(query);

    // if (!action) {
    //     throw CustomException('الإجراء الآلي غير موجود', 404);
    // }

    // // Apply safe updates
    // Object.keys(safeData).forEach(field => {
    //     action[field] = safeData[field];
    // });

    // await action.save();

    // Temporary response until AutomatedAction model is created
    throw CustomException('الإجراء الآلي غير موجود', 404);

    // res.status(200).json({
    //     success: true,
    //     message: 'تم تحديث الإجراء الآلي بنجاح',
    //     data: action
    // });
});

/**
 * Delete automated action
 * DELETE /api/automated-actions/:id
 */
const deleteAction = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;
    const firmId = getFirmId(req);

    // SECURITY: Sanitize ObjectId to prevent NoSQL injection
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('معرف غير صالح', 400);
    }

    // Placeholder for AutomatedAction model
    // SECURITY: IDOR Protection - Verify ownership via lawyerId and firmId
    // const query = { _id: sanitizedId, lawyerId };
    // if (firmId) {
    //     query.firmId = firmId;
    // }
    // const action = await AutomatedAction.findOneAndDelete(query);

    // if (!action) {
    //     throw CustomException('الإجراء الآلي غير موجود', 404);
    // }

    // Temporary response until AutomatedAction model is created
    throw CustomException('الإجراء الآلي غير موجود', 404);

    // res.status(200).json({
    //     success: true,
    //     message: 'تم حذف الإجراء الآلي بنجاح'
    // });
});

/**
 * Toggle automated action active status
 * POST /api/automated-actions/:id/toggle
 */
const toggleActive = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;
    const firmId = getFirmId(req);

    // SECURITY: Sanitize ObjectId to prevent NoSQL injection
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('معرف غير صالح', 400);
    }

    // Placeholder for AutomatedAction model
    // SECURITY: IDOR Protection - Verify ownership via lawyerId and firmId
    // const query = { _id: sanitizedId, lawyerId };
    // if (firmId) {
    //     query.firmId = firmId;
    // }
    // const action = await AutomatedAction.findOne(query);

    // if (!action) {
    //     throw CustomException('الإجراء الآلي غير موجود', 404);
    // }

    // action.isActive = !action.isActive;
    // await action.save();

    // Temporary response until AutomatedAction model is created
    throw CustomException('الإجراء الآلي غير موجود', 404);

    // res.status(200).json({
    //     success: true,
    //     message: `تم ${action.isActive ? 'تفعيل' : 'تعطيل'} الإجراء الآلي بنجاح`,
    //     data: action
    // });
});

/**
 * Test automated action
 * POST /api/automated-actions/:id/test
 */
const testAction = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { record_id } = req.body;
    const lawyerId = req.userID;
    const firmId = getFirmId(req);

    // SECURITY: Sanitize ObjectId to prevent NoSQL injection
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('معرف غير صالح', 400);
    }

    if (!record_id) {
        throw CustomException('معرف السجل مطلوب للاختبار', 400);
    }

    // SECURITY: Sanitize record_id to prevent NoSQL injection
    const sanitizedRecordId = sanitizeObjectId(record_id);
    if (!sanitizedRecordId) {
        throw CustomException('معرف السجل غير صالح', 400);
    }

    // Placeholder for AutomatedAction model
    // SECURITY: IDOR Protection - Verify ownership via lawyerId and firmId
    // const query = { _id: sanitizedId, lawyerId };
    // if (firmId) {
    //     query.firmId = firmId;
    // }
    // const action = await AutomatedAction.findOne(query);

    // if (!action) {
    //     throw CustomException('الإجراء الآلي غير موجود', 404);
    // }

    // // SECURITY: Fetch the record with ownership verification
    // let record;
    // const recordQuery = { _id: sanitizedRecordId };
    // if (firmId) {
    //     recordQuery.firmId = firmId;
    // }
    //
    // switch (action.model_name) {
    //     case 'Case':
    //         record = await Case.findOne({ ...recordQuery, lawyerId });
    //         break;
    //     case 'Task':
    //         record = await Task.findOne(recordQuery);
    //         break;
    //     case 'Client':
    //         record = await Client.findOne({ ...recordQuery, lawyerId });
    //         break;
    //     case 'Invoice':
    //         record = await Invoice.findOne({ ...recordQuery, lawyerId });
    //         break;
    //     default:
    //         throw CustomException('نوع النموذج غير مدعوم', 400);
    // }

    // if (!record) {
    //     throw CustomException('السجل غير موجود', 404);
    // }

    // // Execute action in test mode (dry run)
    // const testResult = await executeActionTest(action, record, lawyerId);

    // Temporary response until AutomatedAction model is created
    const testResult = {
        wouldExecute: true,
        actionType: 'server_action',
        targetRecord: sanitizedRecordId,
        estimatedResult: 'سيتم تنفيذ الإجراء على هذا السجل',
        testMode: true,
        timestamp: new Date()
    };

    res.status(200).json({
        success: true,
        message: 'تم اختبار الإجراء بنجاح (لم يتم تنفيذه فعلياً)',
        data: testResult
    });
});

/**
 * Get automated action execution logs
 * GET /api/automated-actions/:id/logs
 */
const getActionLogs = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { page = 1, limit = 50, status } = req.query;
    const lawyerId = req.userID;
    const firmId = getFirmId(req);

    // SECURITY: Sanitize ObjectId to prevent NoSQL injection
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('معرف غير صالح', 400);
    }

    // Placeholder for AutomatedAction model and logs
    // SECURITY: IDOR Protection - Verify ownership via lawyerId and firmId
    // const query = { _id: sanitizedId, lawyerId };
    // if (firmId) {
    //     query.firmId = firmId;
    // }
    // const action = await AutomatedAction.findOne(query);

    // if (!action) {
    //     throw CustomException('الإجراء الآلي غير موجود', 404);
    // }

    // const logsQuery = { actionId: sanitizedId };
    // if (status) logsQuery.status = status;

    // // Assuming there's an AutomatedActionLog model
    // const logs = await AutomatedActionLog.find(logsQuery)
    //     .sort({ createdAt: -1 })
    //     .limit(parseInt(limit))
    //     .skip((parseInt(page) - 1) * parseInt(limit))
    //     .populate('executedBy', 'firstName lastName')
    //     .populate('recordId');

    // const total = await AutomatedActionLog.countDocuments(logsQuery);

    // Temporary response until AutomatedActionLog model is created
    const logs = [];
    const total = 0;

    res.status(200).json({
        success: true,
        data: logs,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
        }
    });
});

/**
 * Get available models for automated actions
 * GET /api/automated-actions/models
 */
const getAvailableModels = asyncHandler(async (req, res) => {
    const models = [
        {
            name: 'Case',
            nameAr: 'القضية',
            description: 'Cases and legal matters',
            descriptionAr: 'القضايا والمسائل القانونية',
            availableFields: ['title', 'status', 'category', 'priority', 'assignedTo']
        },
        {
            name: 'Task',
            nameAr: 'المهمة',
            description: 'Tasks and to-dos',
            descriptionAr: 'المهام والمهام المطلوبة',
            availableFields: ['title', 'status', 'priority', 'dueDate', 'assignedTo']
        },
        {
            name: 'Client',
            nameAr: 'العميل',
            description: 'Clients and contacts',
            descriptionAr: 'العملاء وجهات الاتصال',
            availableFields: ['firstName', 'lastName', 'email', 'phone', 'status']
        },
        {
            name: 'Invoice',
            nameAr: 'الفاتورة',
            description: 'Invoices and billing',
            descriptionAr: 'الفواتير والفواتير',
            availableFields: ['invoiceNumber', 'status', 'totalAmount', 'dueDate', 'clientId']
        },
        {
            name: 'Document',
            nameAr: 'المستند',
            description: 'Documents and files',
            descriptionAr: 'المستندات والملفات',
            availableFields: ['name', 'type', 'status', 'category', 'caseId']
        },
        {
            name: 'Event',
            nameAr: 'الحدث',
            description: 'Calendar events and appointments',
            descriptionAr: 'أحداث التقويم والمواعيد',
            availableFields: ['title', 'eventType', 'startDate', 'endDate', 'attendees']
        },
        {
            name: 'Lead',
            nameAr: 'العميل المحتمل',
            description: 'Sales leads and prospects',
            descriptionAr: 'العملاء المحتملون والمستقبليون',
            availableFields: ['firstName', 'lastName', 'email', 'status', 'source']
        }
    ];

    res.status(200).json({
        success: true,
        data: models
    });
});

/**
 * Get fields for a specific model
 * GET /api/automated-actions/models/:modelName/fields
 */
const getModelFields = asyncHandler(async (req, res) => {
    const { modelName } = req.params;

    // SECURITY: Validate modelName to prevent injection
    if (!modelName || typeof modelName !== 'string' || !/^[A-Za-z]+$/.test(modelName)) {
        throw CustomException('اسم النموذج غير صالح', 400);
    }

    // Define available fields for each model
    const modelFieldsMap = {
        Case: [
            { name: 'title', type: 'string', nameAr: 'العنوان', required: true },
            { name: 'status', type: 'select', nameAr: 'الحالة', options: ['pending', 'active', 'closed', 'archived'] },
            { name: 'category', type: 'select', nameAr: 'الفئة', options: ['civil', 'commercial', 'labor', 'criminal'] },
            { name: 'priority', type: 'select', nameAr: 'الأولوية', options: ['low', 'medium', 'high', 'urgent'] },
            { name: 'assignedTo', type: 'reference', nameAr: 'مكلف إلى', model: 'User' },
            { name: 'clientId', type: 'reference', nameAr: 'العميل', model: 'Client' },
            { name: 'courtName', type: 'string', nameAr: 'اسم المحكمة' },
            { name: 'caseNumber', type: 'string', nameAr: 'رقم القضية' },
            { name: 'filingDate', type: 'date', nameAr: 'تاريخ التقديم' },
            { name: 'nextHearingDate', type: 'date', nameAr: 'تاريخ الجلسة القادمة' }
        ],
        Task: [
            { name: 'title', type: 'string', nameAr: 'العنوان', required: true },
            { name: 'description', type: 'text', nameAr: 'الوصف' },
            { name: 'status', type: 'select', nameAr: 'الحالة', options: ['todo', 'in_progress', 'completed', 'cancelled'] },
            { name: 'priority', type: 'select', nameAr: 'الأولوية', options: ['low', 'medium', 'high', 'urgent'] },
            { name: 'assignedTo', type: 'reference', nameAr: 'مكلف إلى', model: 'User' },
            { name: 'dueDate', type: 'date', nameAr: 'تاريخ الاستحقاق' },
            { name: 'taskType', type: 'string', nameAr: 'نوع المهمة' },
            { name: 'caseId', type: 'reference', nameAr: 'القضية', model: 'Case' }
        ],
        Client: [
            { name: 'firstName', type: 'string', nameAr: 'الاسم الأول', required: true },
            { name: 'lastName', type: 'string', nameAr: 'اسم العائلة', required: true },
            { name: 'email', type: 'email', nameAr: 'البريد الإلكتروني' },
            { name: 'phone', type: 'string', nameAr: 'رقم الهاتف' },
            { name: 'status', type: 'select', nameAr: 'الحالة', options: ['active', 'inactive', 'prospect'] },
            { name: 'companyName', type: 'string', nameAr: 'اسم الشركة' },
            { name: 'nationalId', type: 'string', nameAr: 'رقم الهوية الوطنية' },
            { name: 'address', type: 'text', nameAr: 'العنوان' }
        ],
        Invoice: [
            { name: 'invoiceNumber', type: 'string', nameAr: 'رقم الفاتورة', required: true },
            { name: 'status', type: 'select', nameAr: 'الحالة', options: ['draft', 'sent', 'paid', 'overdue', 'cancelled'] },
            { name: 'totalAmount', type: 'number', nameAr: 'المبلغ الإجمالي' },
            { name: 'paidAmount', type: 'number', nameAr: 'المبلغ المدفوع' },
            { name: 'dueDate', type: 'date', nameAr: 'تاريخ الاستحقاق' },
            { name: 'issueDate', type: 'date', nameAr: 'تاريخ الإصدار' },
            { name: 'clientId', type: 'reference', nameAr: 'العميل', model: 'Client' },
            { name: 'caseId', type: 'reference', nameAr: 'القضية', model: 'Case' }
        ],
        Document: [
            { name: 'name', type: 'string', nameAr: 'الاسم', required: true },
            { name: 'type', type: 'select', nameAr: 'النوع', options: ['contract', 'court_filing', 'evidence', 'correspondence', 'other'] },
            { name: 'status', type: 'select', nameAr: 'الحالة', options: ['draft', 'final', 'archived'] },
            { name: 'category', type: 'string', nameAr: 'الفئة' },
            { name: 'caseId', type: 'reference', nameAr: 'القضية', model: 'Case' },
            { name: 'clientId', type: 'reference', nameAr: 'العميل', model: 'Client' },
            { name: 'uploadDate', type: 'date', nameAr: 'تاريخ الرفع' }
        ],
        Event: [
            { name: 'title', type: 'string', nameAr: 'العنوان', required: true },
            { name: 'eventType', type: 'select', nameAr: 'نوع الحدث', options: ['hearing', 'meeting', 'deadline', 'reminder'] },
            { name: 'startDate', type: 'datetime', nameAr: 'تاريخ البدء' },
            { name: 'endDate', type: 'datetime', nameAr: 'تاريخ الانتهاء' },
            { name: 'location', type: 'string', nameAr: 'الموقع' },
            { name: 'attendees', type: 'array', nameAr: 'الحضور' },
            { name: 'caseId', type: 'reference', nameAr: 'القضية', model: 'Case' }
        ],
        Lead: [
            { name: 'firstName', type: 'string', nameAr: 'الاسم الأول' },
            { name: 'lastName', type: 'string', nameAr: 'اسم العائلة' },
            { name: 'email', type: 'email', nameAr: 'البريد الإلكتروني' },
            { name: 'phone', type: 'string', nameAr: 'رقم الهاتف' },
            { name: 'status', type: 'select', nameAr: 'الحالة', options: ['new', 'contacted', 'qualified', 'converted', 'lost'] },
            { name: 'source', type: 'select', nameAr: 'المصدر', options: ['website', 'referral', 'social_media', 'other'] },
            { name: 'assignedTo', type: 'reference', nameAr: 'مكلف إلى', model: 'User' }
        ]
    };

    const fields = modelFieldsMap[modelName];

    if (!fields) {
        throw CustomException('النموذج غير موجود أو غير مدعوم', 404);
    }

    res.status(200).json({
        success: true,
        data: {
            modelName,
            fields
        }
    });
});

/**
 * Duplicate automated action
 * POST /api/automated-actions/:id/duplicate
 */
const duplicateAction = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;
    const firmId = getFirmId(req);

    // SECURITY: Sanitize ObjectId to prevent NoSQL injection
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('معرف غير صالح | Invalid ID', 400);
    }

    // Placeholder for AutomatedAction model
    // SECURITY: IDOR Protection - Verify ownership via lawyerId and firmId
    // const query = { _id: sanitizedId, lawyerId };
    // if (firmId) {
    //     query.firmId = firmId;
    // }
    // const originalAction = await AutomatedAction.findOne(query);

    // if (!originalAction) {
    //     throw CustomException('الإجراء الآلي غير موجود', 404);
    // }

    // // Create a copy with new ID
    // const duplicatedData = originalAction.toObject();
    // delete duplicatedData._id;
    // delete duplicatedData.createdAt;
    // delete duplicatedData.updatedAt;
    // duplicatedData.name = `${duplicatedData.name} (نسخة)`;
    // duplicatedData.nameAr = `${duplicatedData.nameAr} (نسخة)`;
    // duplicatedData.isActive = false; // Start as inactive
    // duplicatedData.createdBy = lawyerId;

    // const duplicatedAction = await AutomatedAction.create(duplicatedData);

    // Temporary response until AutomatedAction model is created
    const duplicatedAction = {
        _id: `dup_${Date.now()}`,
        name: 'Duplicated Action (نسخة)',
        nameAr: 'إجراء منسوخ (نسخة)',
        isActive: false,
        createdAt: new Date()
    };

    res.status(201).json({
        success: true,
        message: 'تم نسخ الإجراء الآلي بنجاح | Action duplicated successfully',
        data: duplicatedAction
    });
});

/**
 * Get all automated action logs (across all actions)
 * GET /api/automated-actions/logs
 */
const getAllLogs = asyncHandler(async (req, res) => {
    const { page = 1, limit = 50, status, actionId, model_name, startDate, endDate } = req.query;
    const lawyerId = req.userID;
    const firmId = getFirmId(req);

    // Build query for logs
    const logsQuery = { lawyerId };
    if (firmId) {
        logsQuery.firmId = firmId;
    }
    if (status) logsQuery.status = status;
    if (actionId) {
        const sanitizedActionId = sanitizeObjectId(actionId);
        if (sanitizedActionId) logsQuery.actionId = sanitizedActionId;
    }
    if (model_name) logsQuery.model_name = model_name;
    if (startDate || endDate) {
        logsQuery.createdAt = {};
        if (startDate) logsQuery.createdAt.$gte = new Date(startDate);
        if (endDate) logsQuery.createdAt.$lte = new Date(endDate);
    }

    // Placeholder for AutomatedActionLog model
    // const logs = await AutomatedActionLog.find(logsQuery)
    //     .sort({ createdAt: -1 })
    //     .limit(parseInt(limit))
    //     .skip((parseInt(page) - 1) * parseInt(limit))
    //     .populate('actionId', 'name nameAr')
    //     .populate('executedBy', 'firstName lastName');

    // const total = await AutomatedActionLog.countDocuments(logsQuery);

    // Temporary response
    const logs = [];
    const total = 0;

    res.status(200).json({
        success: true,
        data: logs,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
        }
    });
});

/**
 * Bulk enable automated actions
 * POST /api/automated-actions/bulk/enable
 */
const bulkEnable = asyncHandler(async (req, res) => {
    const { ids } = req.body;
    const lawyerId = req.userID;
    const firmId = getFirmId(req);

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        throw CustomException('قائمة المعرفات مطلوبة | IDs list is required', 400);
    }

    if (ids.length > 100) {
        throw CustomException('لا يمكن تفعيل أكثر من 100 إجراء في المرة الواحدة', 400);
    }

    // SECURITY: Sanitize all IDs
    const sanitizedIds = ids.map(id => sanitizeObjectId(id)).filter(Boolean);

    // Placeholder for AutomatedAction model
    // const query = { _id: { $in: sanitizedIds }, lawyerId };
    // if (firmId) {
    //     query.firmId = firmId;
    // }
    // const result = await AutomatedAction.updateMany(query, { $set: { isActive: true } });

    // Temporary response
    const result = { modifiedCount: sanitizedIds.length };

    res.status(200).json({
        success: true,
        message: `تم تفعيل ${result.modifiedCount} إجراء آلي | ${result.modifiedCount} actions enabled`,
        modifiedCount: result.modifiedCount
    });
});

/**
 * Bulk disable automated actions
 * POST /api/automated-actions/bulk/disable
 */
const bulkDisable = asyncHandler(async (req, res) => {
    const { ids } = req.body;
    const lawyerId = req.userID;
    const firmId = getFirmId(req);

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        throw CustomException('قائمة المعرفات مطلوبة | IDs list is required', 400);
    }

    if (ids.length > 100) {
        throw CustomException('لا يمكن تعطيل أكثر من 100 إجراء في المرة الواحدة', 400);
    }

    // SECURITY: Sanitize all IDs
    const sanitizedIds = ids.map(id => sanitizeObjectId(id)).filter(Boolean);

    // Placeholder for AutomatedAction model
    // const query = { _id: { $in: sanitizedIds }, lawyerId };
    // if (firmId) {
    //     query.firmId = firmId;
    // }
    // const result = await AutomatedAction.updateMany(query, { $set: { isActive: false } });

    // Temporary response
    const result = { modifiedCount: sanitizedIds.length };

    res.status(200).json({
        success: true,
        message: `تم تعطيل ${result.modifiedCount} إجراء آلي | ${result.modifiedCount} actions disabled`,
        modifiedCount: result.modifiedCount
    });
});

/**
 * Bulk delete automated actions
 * DELETE /api/automated-actions/bulk
 */
const bulkDelete = asyncHandler(async (req, res) => {
    const { ids } = req.body;
    const lawyerId = req.userID;
    const firmId = getFirmId(req);

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        throw CustomException('قائمة المعرفات مطلوبة | IDs list is required', 400);
    }

    if (ids.length > 100) {
        throw CustomException('لا يمكن حذف أكثر من 100 إجراء في المرة الواحدة', 400);
    }

    // SECURITY: Sanitize all IDs
    const sanitizedIds = ids.map(id => sanitizeObjectId(id)).filter(Boolean);

    // Placeholder for AutomatedAction model
    // const query = { _id: { $in: sanitizedIds }, lawyerId };
    // if (firmId) {
    //     query.firmId = firmId;
    // }
    // const result = await AutomatedAction.deleteMany(query);

    // Temporary response
    const result = { deletedCount: sanitizedIds.length };

    res.status(200).json({
        success: true,
        message: `تم حذف ${result.deletedCount} إجراء آلي | ${result.deletedCount} actions deleted`,
        deletedCount: result.deletedCount
    });
});

/**
 * Helper function to execute action in test mode
 * This simulates what would happen without actually executing
 */
async function executeActionTest(action, record, userId) {
    const result = {
        wouldExecute: true,
        actionType: action.action_type,
        targetRecord: record._id,
        testMode: true,
        timestamp: new Date()
    };

    switch (action.action_type) {
        case 'server_action':
            result.estimatedResult = 'سيتم تنفيذ الكود البرمجي على السجل';
            result.code = action.server_action_code;
            break;

        case 'email':
            result.estimatedResult = 'سيتم إرسال بريد إلكتروني';
            result.templateId = action.email_template_id;
            result.recipientEmail = record.email || 'غير محدد';
            break;

        case 'activity':
            result.estimatedResult = 'سيتم إنشاء نشاط جديد';
            result.activityType = action.activity_type_id;
            result.summary = action.activity_summary;
            break;

        case 'update_field':
            result.estimatedResult = 'سيتم تحديث الحقل';
            result.fieldToUpdate = action.update_field_id;
            result.newValue = action.update_field_value;
            result.currentValue = record[action.update_field_id];
            break;

        case 'webhook':
            result.estimatedResult = 'سيتم استدعاء الويب هوك';
            result.webhookUrl = action.webhook_url;
            result.method = action.webhook_method;
            break;

        default:
            result.wouldExecute = false;
            result.error = 'نوع الإجراء غير مدعوم';
    }

    return result;
}

module.exports = {
    getActions,
    getAction,
    createAction,
    updateAction,
    deleteAction,
    toggleActive,
    testAction,
    duplicateAction,
    getActionLogs,
    getAllLogs,
    bulkEnable,
    bulkDisable,
    bulkDelete,
    getAvailableModels,
    getModelFields
};
