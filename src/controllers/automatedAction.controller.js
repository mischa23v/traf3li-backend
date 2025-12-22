const { Case, Task, Notification, Client, Invoice, Document, User } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');

// Note: AutomatedAction model needs to be created and added to models/index.js
// const { AutomatedAction } = require('../models');

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

    // Placeholder for AutomatedAction model
    // const action = await AutomatedAction.findOne({ _id: id, lawyerId })
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
    } = req.body;
    const lawyerId = req.userID;

    // Validate required fields
    if (!name || !nameAr || !model_name || !trigger || !action_type) {
        throw CustomException('الاسم ونوع النموذج والمشغل ونوع الإجراء مطلوبون', 400);
    }

    // Validate required fields based on action_type
    if (action_type === 'server_action' && !server_action_code) {
        throw CustomException('كود الإجراء مطلوب لنوع الإجراء البرمجي', 400);
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

    if (action_type === 'webhook' && !webhook_url) {
        throw CustomException('عنوان URL للويب هوك مطلوب', 400);
    }

    // Placeholder for AutomatedAction model
    // const action = await AutomatedAction.create({
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
    // });

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

    // Placeholder for AutomatedAction model
    // const action = await AutomatedAction.findOne({ _id: id, lawyerId });

    // if (!action) {
    //     throw CustomException('الإجراء الآلي غير موجود', 404);
    // }

    // const allowedFields = [
    //     'name', 'nameAr', 'model_name', 'trigger', 'action_type',
    //     'filter_domain', 'trigger_field_ids', 'server_action_code',
    //     'email_template_id', 'activity_type_id', 'activity_summary',
    //     'activity_note', 'activity_date_deadline_range', 'activity_user_field_name',
    //     'update_field_id', 'update_field_value', 'webhook_url',
    //     'webhook_method', 'webhook_headers', 'isActive'
    // ];

    // allowedFields.forEach(field => {
    //     if (req.body[field] !== undefined) {
    //         action[field] = req.body[field];
    //     }
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

    // Placeholder for AutomatedAction model
    // const action = await AutomatedAction.findOneAndDelete({ _id: id, lawyerId });

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

    // Placeholder for AutomatedAction model
    // const action = await AutomatedAction.findOne({ _id: id, lawyerId });

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

    if (!record_id) {
        throw CustomException('معرف السجل مطلوب للاختبار', 400);
    }

    // Placeholder for AutomatedAction model
    // const action = await AutomatedAction.findOne({ _id: id, lawyerId });

    // if (!action) {
    //     throw CustomException('الإجراء الآلي غير موجود', 404);
    // }

    // // Fetch the record based on model_name
    // let record;
    // switch (action.model_name) {
    //     case 'Case':
    //         record = await Case.findOne({ _id: record_id, lawyerId });
    //         break;
    //     case 'Task':
    //         record = await Task.findOne({ _id: record_id });
    //         break;
    //     case 'Client':
    //         record = await Client.findOne({ _id: record_id, lawyerId });
    //         break;
    //     case 'Invoice':
    //         record = await Invoice.findOne({ _id: record_id, lawyerId });
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
        targetRecord: record_id,
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

    // Placeholder for AutomatedAction model and logs
    // const action = await AutomatedAction.findOne({ _id: id, lawyerId });

    // if (!action) {
    //     throw CustomException('الإجراء الآلي غير موجود', 404);
    // }

    // const query = { actionId: id };
    // if (status) query.status = status;

    // // Assuming there's an AutomatedActionLog model
    // const logs = await AutomatedActionLog.find(query)
    //     .sort({ createdAt: -1 })
    //     .limit(parseInt(limit))
    //     .skip((parseInt(page) - 1) * parseInt(limit))
    //     .populate('executedBy', 'firstName lastName')
    //     .populate('recordId');

    // const total = await AutomatedActionLog.countDocuments(query);

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
    getActionLogs,
    getAvailableModels,
    getModelFields
};
