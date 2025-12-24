/**
 * Recurring Invoice Controller
 *
 * Handles recurring invoice templates and automatic invoice generation
 */

const RecurringInvoice = require('../models/recurringInvoice.model');
const Invoice = require('../models/invoice.model');
const Client = require('../models/client.model');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');

/**
 * Validation helper for items
 */
const validateItems = (items) => {
    if (!Array.isArray(items) || items.length === 0) {
        throw CustomException('Items array is required and must not be empty', 400, {
            messageAr: 'مصفوفة العناصر مطلوبة ويجب ألا تكون فارغة'
        });
    }

    items.forEach((item, index) => {
        // Validate quantity
        if (!item.quantity || typeof item.quantity !== 'number' || item.quantity <= 0) {
            throw CustomException(`Item ${index + 1}: quantity must be a positive number`, 400, {
                messageAr: `العنصر ${index + 1}: الكمية يجب أن تكون رقماً موجباً`
            });
        }

        // Validate unitPrice
        if (item.unitPrice === undefined || typeof item.unitPrice !== 'number' || item.unitPrice < 0) {
            throw CustomException(`Item ${index + 1}: unitPrice must be a non-negative number`, 400, {
                messageAr: `العنصر ${index + 1}: سعر الوحدة يجب أن يكون رقماً غير سالب`
            });
        }

        // Validate taxRate if present
        if (item.taxRate !== undefined && (typeof item.taxRate !== 'number' || item.taxRate < 0 || item.taxRate > 100)) {
            throw CustomException(`Item ${index + 1}: taxRate must be between 0 and 100`, 400, {
                messageAr: `العنصر ${index + 1}: معدل الضريبة يجب أن يكون بين 0 و 100`
            });
        }

        // Validate discount if present
        if (item.discountValue !== undefined && (typeof item.discountValue !== 'number' || item.discountValue < 0)) {
            throw CustomException(`Item ${index + 1}: discountValue must be a non-negative number`, 400, {
                messageAr: `العنصر ${index + 1}: قيمة الخصم يجب أن تكون رقماً غير سالب`
            });
        }
    });

    return true;
};

/**
 * Validation helper for schedule
 */
const validateSchedule = (frequency, dayOfMonth, dayOfWeek) => {
    const validFrequencies = ['daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly'];

    if (!frequency || !validFrequencies.includes(frequency)) {
        throw CustomException('Invalid frequency. Must be one of: daily, weekly, biweekly, monthly, quarterly, yearly', 400, {
            messageAr: 'تردد غير صالح. يجب أن يكون أحد: يومي، أسبوعي، نصف شهري، شهري، ربع سنوي، سنوي'
        });
    }

    // Validate dayOfMonth for monthly/quarterly/yearly
    if (['monthly', 'quarterly', 'yearly'].includes(frequency)) {
        if (!dayOfMonth || typeof dayOfMonth !== 'number' || dayOfMonth < 1 || dayOfMonth > 31) {
            throw CustomException('dayOfMonth must be between 1 and 31 for monthly/quarterly/yearly frequency', 400, {
                messageAr: 'يوم الشهر يجب أن يكون بين 1 و 31 للتردد الشهري/الربع سنوي/السنوي'
            });
        }
    }

    // Validate dayOfWeek for weekly/biweekly
    if (['weekly', 'biweekly'].includes(frequency)) {
        if (dayOfWeek === undefined || typeof dayOfWeek !== 'number' || dayOfWeek < 0 || dayOfWeek > 6) {
            throw CustomException('dayOfWeek must be between 0 (Sunday) and 6 (Saturday) for weekly/biweekly frequency', 400, {
                messageAr: 'يوم الأسبوع يجب أن يكون بين 0 (الأحد) و 6 (السبت) للتردد الأسبوعي/نصف الشهري'
            });
        }
    }

    return true;
};

/**
 * Get all recurring invoices
 */
const getRecurringInvoices = asyncHandler(async (req, res) => {
    const { status, clientId, frequency, page = 1, limit = 20 } = req.query;

    const query = { ...req.firmQuery };
    if (status) query.status = status;
    if (clientId) query.clientId = clientId;
    if (frequency) query.frequency = frequency;

    const total = await RecurringInvoice.countDocuments(query);
    const recurringInvoices = await RecurringInvoice.find(query)
        .populate('clientId', 'firstName lastName companyName email')
        .populate('caseId', 'title caseNumber')
        .populate('createdBy', 'firstName lastName')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit, 10));

    res.json({
        success: true,
        data: {
            recurringInvoices,
            pagination: {
                total,
                page: parseInt(page, 10),
                limit: parseInt(limit, 10),
                totalPages: Math.ceil(total / limit)
            }
        }
    });
});

/**
 * Get statistics
 */
const getStats = asyncHandler(async (req, res) => {
    const stats = await RecurringInvoice.getStats(req.firmId, req.firmId ? null : req.userID);

    res.json({
        success: true,
        data: stats
    });
});

/**
 * Get single recurring invoice
 */
const getRecurringInvoice = asyncHandler(async (req, res) => {
    const recurring = await RecurringInvoice.findOne({
        _id: req.params.id,
        ...req.firmQuery
    })
        .populate('clientId')
        .populate('caseId', 'title caseNumber')
        .populate('retainerId')
        .populate('paymentTermsTemplate')
        .populate('templateId')
        .populate('generatedInvoiceIds.invoiceId', 'invoiceNumber status totalAmount')
        .populate('createdBy', 'firstName lastName')
        .populate('history.performedBy', 'firstName lastName');

    if (!recurring) {
        throw CustomException('Recurring invoice not found', 404, {
            messageAr: 'لم يتم العثور على الفاتورة المتكررة'
        });
    }

    res.json({
        success: true,
        data: recurring
    });
});

/**
 * Get history of generated invoices
 */
const getGeneratedHistory = asyncHandler(async (req, res) => {
    const recurring = await RecurringInvoice.findOne({
        _id: req.params.id,
        ...req.firmQuery
    }).populate('generatedInvoiceIds.invoiceId', 'invoiceNumber status totalAmount issueDate paidAt');

    if (!recurring) {
        throw CustomException('Recurring invoice not found', 404, {
            messageAr: 'لم يتم العثور على الفاتورة المتكررة'
        });
    }

    res.json({
        success: true,
        data: recurring.generatedInvoiceIds
    });
});

/**
 * Preview next invoice
 */
const previewNextInvoice = asyncHandler(async (req, res) => {
    const recurring = await RecurringInvoice.findOne({
        _id: req.params.id,
        ...req.firmQuery
    }).populate('clientId');

    if (!recurring) {
        throw CustomException('Recurring invoice not found', 404, {
            messageAr: 'لم يتم العثور على الفاتورة المتكررة'
        });
    }

    // Build preview
    const nextDate = recurring.nextGenerationDate;
    const dueDate = new Date(nextDate);
    dueDate.setDate(dueDate.getDate() + (recurring.paymentTermsDays || 30));

    const preview = {
        clientId: recurring.clientId,
        issueDate: nextDate,
        dueDate,
        items: recurring.items,
        subtotal: recurring.subtotal,
        discountTotal: recurring.discountTotal,
        vatRate: recurring.vatRate,
        vatAmount: recurring.vatAmount,
        total: recurring.total,
        notes: recurring.notes,
        notesAr: recurring.notesAr
    };

    res.json({
        success: true,
        data: preview
    });
});

/**
 * Create recurring invoice
 */
const createRecurringInvoice = asyncHandler(async (req, res) => {
    // Mass assignment protection - only allow specific fields
    const allowedFields = [
        'name', 'nameAr', 'clientId', 'caseId', 'retainerId',
        'frequency', 'dayOfMonth', 'dayOfWeek',
        'startDate', 'endDate', 'maxGenerations',
        'items', 'paymentTermsDays', 'paymentTermsTemplate',
        'templateId', 'autoSend', 'sendToEmails', 'ccEmails',
        'emailSubject', 'emailBody', 'emailSubjectAr', 'emailBodyAr',
        'autoApprove', 'notes', 'notesAr', 'internalNotes'
    ];
    const safeData = pickAllowedFields(req.body, allowedFields);

    // Extract and sanitize required fields
    const clientId = sanitizeObjectId(safeData.clientId);
    if (!clientId) {
        throw CustomException('Valid clientId is required', 400, {
            messageAr: 'معرف العميل الصحيح مطلوب'
        });
    }

    // IDOR Protection - Validate client belongs to the firm
    const client = await Client.findOne({
        _id: clientId,
        ...req.firmQuery
    });

    if (!client) {
        throw CustomException('Client not found or access denied', 404, {
            messageAr: 'لم يتم العثور على العميل أو الوصول مرفوض'
        });
    }

    // Input validation for items
    if (!safeData.items) {
        throw CustomException('Items are required', 400, {
            messageAr: 'العناصر مطلوبة'
        });
    }
    validateItems(safeData.items);

    // Input validation for schedule
    if (!safeData.frequency) {
        throw CustomException('Frequency is required', 400, {
            messageAr: 'التردد مطلوب'
        });
    }
    validateSchedule(safeData.frequency, safeData.dayOfMonth, safeData.dayOfWeek);

    // Validate startDate
    if (!safeData.startDate) {
        throw CustomException('Start date is required', 400, {
            messageAr: 'تاريخ البدء مطلوب'
        });
    }

    // Validate maxGenerations if provided
    if (safeData.maxGenerations !== undefined) {
        if (typeof safeData.maxGenerations !== 'number' || safeData.maxGenerations <= 0) {
            throw CustomException('maxGenerations must be a positive number', 400, {
                messageAr: 'الحد الأقصى للأجيال يجب أن يكون رقماً موجباً'
            });
        }
    }

    // Sanitize related IDs
    if (safeData.caseId) {
        safeData.caseId = sanitizeObjectId(safeData.caseId);
    }
    if (safeData.retainerId) {
        safeData.retainerId = sanitizeObjectId(safeData.retainerId);
    }
    if (safeData.paymentTermsTemplate) {
        safeData.paymentTermsTemplate = sanitizeObjectId(safeData.paymentTermsTemplate);
    }
    if (safeData.templateId) {
        safeData.templateId = sanitizeObjectId(safeData.templateId);
    }

    // Create recurring invoice with only allowed fields
    const recurring = new RecurringInvoice({
        firmId: req.firmId,
        lawyerId: req.firmId ? null : req.userID,
        name: safeData.name,
        nameAr: safeData.nameAr,
        clientId: clientId,
        caseId: safeData.caseId,
        retainerId: safeData.retainerId,
        frequency: safeData.frequency,
        dayOfMonth: safeData.dayOfMonth,
        dayOfWeek: safeData.dayOfWeek,
        startDate: safeData.startDate,
        endDate: safeData.endDate,
        maxGenerations: safeData.maxGenerations,
        items: safeData.items,
        paymentTermsDays: safeData.paymentTermsDays || 30,
        paymentTermsTemplate: safeData.paymentTermsTemplate,
        templateId: safeData.templateId,
        autoSend: safeData.autoSend,
        sendToEmails: safeData.sendToEmails || (client.email ? [client.email] : []),
        ccEmails: safeData.ccEmails,
        emailSubject: safeData.emailSubject,
        emailSubjectAr: safeData.emailSubjectAr,
        emailBody: safeData.emailBody,
        emailBodyAr: safeData.emailBodyAr,
        autoApprove: safeData.autoApprove,
        notes: safeData.notes,
        notesAr: safeData.notesAr,
        internalNotes: safeData.internalNotes,
        createdBy: req.userID,
        history: [{
            action: 'created',
            performedBy: req.userID,
            details: { frequency: safeData.frequency, startDate: safeData.startDate }
        }]
    });

    // Calculate totals (amounts are validated via items)
    recurring.calculateTotals();

    // Calculate next generation date
    recurring.nextGenerationDate = recurring.calculateNextGenerationDate(new Date(safeData.startDate));

    await recurring.save();

    res.status(201).json({
        success: true,
        data: recurring,
        message: 'Recurring invoice created successfully',
        messageAr: 'تم إنشاء الفاتورة المتكررة بنجاح'
    });
});

/**
 * Update recurring invoice
 */
const updateRecurringInvoice = asyncHandler(async (req, res) => {
    // IDOR Protection - Verify ownership through req.firmQuery
    const recurring = await RecurringInvoice.findOne({
        _id: req.params.id,
        ...req.firmQuery
    });

    if (!recurring) {
        throw CustomException('Recurring invoice not found or access denied', 404, {
            messageAr: 'لم يتم العثور على الفاتورة المتكررة أو الوصول مرفوض'
        });
    }

    // Can't update completed or cancelled
    if (['completed', 'cancelled'].includes(recurring.status)) {
        throw CustomException('Cannot update completed or cancelled recurring invoice', 400, {
            messageAr: 'لا يمكن تعديل فاتورة متكررة مكتملة أو ملغاة'
        });
    }

    // Mass assignment protection - only allow specific fields
    const allowedFields = [
        'name', 'nameAr', 'items', 'paymentTermsDays', 'paymentTermsTemplate',
        'templateId', 'autoSend', 'sendToEmails', 'ccEmails',
        'emailSubject', 'emailSubjectAr', 'emailBody', 'emailBodyAr',
        'autoApprove', 'notes', 'notesAr', 'internalNotes',
        'endDate', 'maxGenerations'
    ];
    const safeData = pickAllowedFields(req.body, allowedFields);

    // Input validation for items if being updated
    if (safeData.items !== undefined) {
        validateItems(safeData.items);
    }

    // Validate maxGenerations if being updated
    if (safeData.maxGenerations !== undefined) {
        if (typeof safeData.maxGenerations !== 'number' || safeData.maxGenerations <= 0) {
            throw CustomException('maxGenerations must be a positive number', 400, {
                messageAr: 'الحد الأقصى للأجيال يجب أن يكون رقماً موجباً'
            });
        }
    }

    // Validate paymentTermsDays if being updated
    if (safeData.paymentTermsDays !== undefined) {
        if (typeof safeData.paymentTermsDays !== 'number' || safeData.paymentTermsDays < 0) {
            throw CustomException('paymentTermsDays must be a non-negative number', 400, {
                messageAr: 'أيام الدفع يجب أن تكون رقماً غير سالب'
            });
        }
    }

    // Sanitize ObjectId fields if being updated
    if (safeData.paymentTermsTemplate !== undefined) {
        safeData.paymentTermsTemplate = sanitizeObjectId(safeData.paymentTermsTemplate);
    }
    if (safeData.templateId !== undefined) {
        safeData.templateId = sanitizeObjectId(safeData.templateId);
    }

    // Apply only allowed fields
    Object.keys(safeData).forEach(field => {
        recurring[field] = safeData[field];
    });

    // Recalculate if items changed
    if (safeData.items) {
        recurring.calculateTotals();
    }

    recurring.updatedBy = req.userID;
    recurring.history.push({
        action: 'updated',
        performedBy: req.userID
    });

    await recurring.save();

    res.json({
        success: true,
        data: recurring,
        message: 'Recurring invoice updated',
        messageAr: 'تم تحديث الفاتورة المتكررة'
    });
});

/**
 * Pause recurring invoice
 */
const pauseRecurringInvoice = asyncHandler(async (req, res) => {
    const { reason } = req.body;

    const recurring = await RecurringInvoice.findOne({
        _id: req.params.id,
        ...req.firmQuery
    });

    if (!recurring) {
        throw CustomException('Recurring invoice not found', 404, {
            messageAr: 'لم يتم العثور على الفاتورة المتكررة'
        });
    }

    await recurring.pause(req.userID, reason);

    res.json({
        success: true,
        data: recurring,
        message: 'Recurring invoice paused',
        messageAr: 'تم إيقاف الفاتورة المتكررة مؤقتاً'
    });
});

/**
 * Resume recurring invoice
 */
const resumeRecurringInvoice = asyncHandler(async (req, res) => {
    const recurring = await RecurringInvoice.findOne({
        _id: req.params.id,
        ...req.firmQuery
    });

    if (!recurring) {
        throw CustomException('Recurring invoice not found', 404, {
            messageAr: 'لم يتم العثور على الفاتورة المتكررة'
        });
    }

    await recurring.resume(req.userID);

    res.json({
        success: true,
        data: recurring,
        message: 'Recurring invoice resumed',
        messageAr: 'تم استئناف الفاتورة المتكررة'
    });
});

/**
 * Cancel recurring invoice
 */
const cancelRecurringInvoice = asyncHandler(async (req, res) => {
    const { reason } = req.body;

    const recurring = await RecurringInvoice.findOne({
        _id: req.params.id,
        ...req.firmQuery
    });

    if (!recurring) {
        throw CustomException('Recurring invoice not found', 404, {
            messageAr: 'لم يتم العثور على الفاتورة المتكررة'
        });
    }

    await recurring.cancel(req.userID, reason);

    res.json({
        success: true,
        data: recurring,
        message: 'Recurring invoice cancelled',
        messageAr: 'تم إلغاء الفاتورة المتكررة'
    });
});

/**
 * Generate invoice immediately
 */
const generateNow = asyncHandler(async (req, res) => {
    const recurring = await RecurringInvoice.findOne({
        _id: req.params.id,
        ...req.firmQuery
    }).populate('clientId');

    if (!recurring) {
        throw CustomException('Recurring invoice not found', 404, {
            messageAr: 'لم يتم العثور على الفاتورة المتكررة'
        });
    }

    if (!['active', 'paused'].includes(recurring.status)) {
        throw CustomException('Cannot generate invoice from completed/cancelled recurring', 400, {
            messageAr: 'لا يمكن إنشاء فاتورة من فاتورة متكررة مكتملة أو ملغاة'
        });
    }

    // Generate invoice
    const invoice = await createInvoiceFromRecurring(recurring, req.userID);

    // Update recurring
    recurring.lastGeneratedDate = new Date();
    recurring.timesGenerated += 1;
    recurring.generatedInvoiceIds.push({
        invoiceId: invoice._id,
        invoiceNumber: invoice.invoiceNumber,
        generatedAt: new Date(),
        amount: invoice.totalAmount
    });
    recurring.nextGenerationDate = recurring.calculateNextGenerationDate(new Date());

    // Check if should complete
    if (recurring.maxGenerations && recurring.timesGenerated >= recurring.maxGenerations) {
        recurring.status = 'completed';
    }
    if (recurring.endDate && new Date() > recurring.endDate) {
        recurring.status = 'completed';
    }

    recurring.history.push({
        action: 'generated',
        performedBy: req.userID,
        details: { invoiceId: invoice._id, invoiceNumber: invoice.invoiceNumber }
    });

    await recurring.save();

    res.json({
        success: true,
        data: {
            recurring,
            invoice
        },
        message: 'Invoice generated successfully',
        messageAr: 'تم إنشاء الفاتورة بنجاح'
    });
});

/**
 * Duplicate recurring invoice
 */
const duplicateRecurringInvoice = asyncHandler(async (req, res) => {
    const source = await RecurringInvoice.findOne({
        _id: req.params.id,
        ...req.firmQuery
    });

    if (!source) {
        throw CustomException('Recurring invoice not found', 404, {
            messageAr: 'لم يتم العثور على الفاتورة المتكررة'
        });
    }

    const duplicate = new RecurringInvoice({
        firmId: source.firmId,
        lawyerId: source.lawyerId,
        name: `${source.name} (Copy)`,
        nameAr: source.nameAr ? `${source.nameAr} (نسخة)` : undefined,
        clientId: source.clientId,
        caseId: source.caseId,
        retainerId: source.retainerId,
        frequency: source.frequency,
        dayOfMonth: source.dayOfMonth,
        dayOfWeek: source.dayOfWeek,
        startDate: new Date(),
        endDate: source.endDate,
        maxGenerations: source.maxGenerations,
        items: source.items,
        subtotal: source.subtotal,
        discountTotal: source.discountTotal,
        vatRate: source.vatRate,
        vatAmount: source.vatAmount,
        total: source.total,
        paymentTermsDays: source.paymentTermsDays,
        paymentTermsTemplate: source.paymentTermsTemplate,
        templateId: source.templateId,
        autoSend: source.autoSend,
        sendToEmails: source.sendToEmails,
        ccEmails: source.ccEmails,
        autoApprove: source.autoApprove,
        notes: source.notes,
        notesAr: source.notesAr,
        status: 'active',
        createdBy: req.userID,
        history: [{
            action: 'created',
            performedBy: req.userID,
            details: { duplicatedFrom: source._id }
        }]
    });

    duplicate.nextGenerationDate = duplicate.calculateNextGenerationDate(new Date());
    await duplicate.save();

    res.status(201).json({
        success: true,
        data: duplicate,
        message: 'Recurring invoice duplicated',
        messageAr: 'تم نسخ الفاتورة المتكررة'
    });
});

/**
 * Delete recurring invoice
 */
const deleteRecurringInvoice = asyncHandler(async (req, res) => {
    const recurring = await RecurringInvoice.findOne({
        _id: req.params.id,
        ...req.firmQuery
    });

    if (!recurring) {
        throw CustomException('Recurring invoice not found', 404, {
            messageAr: 'لم يتم العثور على الفاتورة المتكررة'
        });
    }

    // Can only delete if no invoices generated
    if (recurring.timesGenerated > 0) {
        throw CustomException('Cannot delete recurring invoice with generated invoices. Cancel instead.', 400, {
            messageAr: 'لا يمكن حذف فاتورة متكررة تم إنشاء فواتير منها. قم بالإلغاء بدلاً من ذلك.'
        });
    }

    await recurring.deleteOne();

    res.json({
        success: true,
        message: 'Recurring invoice deleted',
        messageAr: 'تم حذف الفاتورة المتكررة'
    });
});

// Helper function to create invoice from recurring
async function createInvoiceFromRecurring(recurring, userId) {
    // Calculate due date
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + (recurring.paymentTermsDays || 30));

    const invoice = new Invoice({
        firmId: recurring.firmId,
        lawyerId: recurring.lawyerId,
        // invoiceNumber will be auto-generated by model's pre-save hook using atomic counter
        clientId: recurring.clientId._id,
        caseId: recurring.caseId,
        items: recurring.items.map(item => ({
            description: item.description,
            descriptionAr: item.descriptionAr,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            taxRate: item.taxRate,
            discountType: item.discountType,
            discountValue: item.discountValue
        })),
        subtotal: recurring.subtotal,
        discountTotal: recurring.discountTotal,
        vatRate: recurring.vatRate,
        vatAmount: recurring.vatAmount,
        totalAmount: recurring.total,
        balanceDue: recurring.total,
        issueDate: new Date(),
        dueDate,
        notes: recurring.notes,
        notesAr: recurring.notesAr,
        status: recurring.autoApprove ? 'sent' : 'draft',
        recurringInvoiceId: recurring._id,
        createdBy: userId
    });

    await invoice.save();
    return invoice;
}

module.exports = {
    getRecurringInvoices,
    getStats,
    getRecurringInvoice,
    getGeneratedHistory,
    previewNextInvoice,
    createRecurringInvoice,
    updateRecurringInvoice,
    pauseRecurringInvoice,
    resumeRecurringInvoice,
    cancelRecurringInvoice,
    generateNow,
    duplicateRecurringInvoice,
    deleteRecurringInvoice
};
