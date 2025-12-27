const { InvoiceTemplate } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');
const { pickAllowedFields, sanitizeObjectId, sanitizeString } = require('../utils/securityUtils');

/**
 * Validate and sanitize template configuration objects
 * Prevents template injection and malicious code execution
 */
const validateTemplateObject = (obj, maxDepth = 3, currentDepth = 0) => {
    if (!obj || typeof obj !== 'object') {
        return {};
    }

    // Prevent deep nesting attacks
    if (currentDepth >= maxDepth) {
        return {};
    }

    // Prevent prototype pollution
    if (obj.constructor !== Object && !Array.isArray(obj)) {
        return {};
    }

    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
        // Skip dangerous keys
        if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
            continue;
        }

        // Sanitize key name
        const safeKey = sanitizeString(key);
        if (!safeKey || safeKey.length > 100) {
            continue;
        }

        // Sanitize value based on type
        if (value === null || value === undefined) {
            sanitized[safeKey] = value;
        } else if (typeof value === 'string') {
            // Prevent script injection in template strings
            const sanitizedValue = sanitizeString(value);
            // Block common injection patterns
            if (sanitizedValue.includes('<script') ||
                sanitizedValue.includes('javascript:') ||
                sanitizedValue.includes('onerror=') ||
                sanitizedValue.includes('onload=')) {
                continue;
            }
            sanitized[safeKey] = sanitizedValue.substring(0, 5000); // Max string length
        } else if (typeof value === 'number') {
            if (isFinite(value)) {
                sanitized[safeKey] = value;
            }
        } else if (typeof value === 'boolean') {
            sanitized[safeKey] = value;
        } else if (Array.isArray(value)) {
            // Limit array size to prevent DoS
            if (value.length <= 100) {
                sanitized[safeKey] = value.map(item => {
                    if (typeof item === 'object') {
                        return validateTemplateObject(item, maxDepth, currentDepth + 1);
                    }
                    return item;
                }).filter(item => item !== null && item !== undefined);
            }
        } else if (typeof value === 'object') {
            sanitized[safeKey] = validateTemplateObject(value, maxDepth, currentDepth + 1);
        }
    }

    return sanitized;
};

/**
 * Validate template data structure
 */
const validateTemplateData = (data) => {
    const allowedTypes = ['standard', 'custom', 'professional', 'minimal'];

    // Validate type
    if (data.type && !allowedTypes.includes(data.type)) {
        throw CustomException('نوع القالب غير صالح', 400);
    }

    // Validate name lengths
    if (data.name && data.name.length > 200) {
        throw CustomException('اسم القالب طويل جداً', 400);
    }
    if (data.nameAr && data.nameAr.length > 200) {
        throw CustomException('الاسم العربي للقالب طويل جداً', 400);
    }

    // Validate and sanitize complex objects
    const objectFields = ['header', 'clientSection', 'itemsSection', 'footer', 'styling', 'numberingFormat', 'taxSettings'];
    objectFields.forEach(field => {
        if (data[field]) {
            data[field] = validateTemplateObject(data[field]);
        }
    });

    return data;
};

/**
 * Create invoice template
 * POST /api/invoice-templates
 */
const createTemplate = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;

    // Mass assignment protection - only allow specific fields
    const allowedFields = [
        'name', 'nameAr', 'description', 'descriptionAr', 'type',
        'isDefault', 'header', 'clientSection', 'itemsSection',
        'footer', 'styling', 'numberingFormat', 'taxSettings'
    ];
    const safeData = pickAllowedFields(req.body, allowedFields);

    // Input validation
    if (!safeData.name || !safeData.nameAr) {
        throw CustomException('الاسم بالعربية والإنجليزية مطلوب', 400);
    }

    // Sanitize string fields
    safeData.name = sanitizeString(safeData.name);
    safeData.nameAr = sanitizeString(safeData.nameAr);
    if (safeData.description) safeData.description = sanitizeString(safeData.description);
    if (safeData.descriptionAr) safeData.descriptionAr = sanitizeString(safeData.descriptionAr);

    // Validate and sanitize template data
    validateTemplateData(safeData);

    const template = await InvoiceTemplate.create({
        firmId,
        lawyerId,
        name: safeData.name,
        nameAr: safeData.nameAr,
        description: safeData.description,
        descriptionAr: safeData.descriptionAr,
        type: safeData.type || 'standard',
        isDefault: safeData.isDefault || false,
        header: safeData.header || {},
        clientSection: safeData.clientSection || {},
        itemsSection: safeData.itemsSection || {},
        footer: safeData.footer || {},
        styling: safeData.styling || {},
        numberingFormat: safeData.numberingFormat || {},
        taxSettings: safeData.taxSettings || {},
        createdBy: lawyerId
    });

    res.status(201).json({
        success: true,
        message: 'تم إنشاء قالب الفاتورة بنجاح',
        data: template
    });
});

/**
 * Get all invoice templates
 * GET /api/invoice-templates
 */
const getTemplates = asyncHandler(async (req, res) => {
    const { type, isActive = true, page = 1, limit = 50 } = req.query;

    const query = { ...req.firmQuery };

    if (type) query.type = type;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const templates = await InvoiceTemplate.find(query)
        .sort({ isDefault: -1, createdAt: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await InvoiceTemplate.countDocuments(query);

    res.status(200).json({
        success: true,
        data: templates,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
        }
    });
});

/**
 * Get single template
 * GET /api/invoice-templates/:id
 */
const getTemplate = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const template = await InvoiceTemplate.findOne({ _id: id, ...req.firmQuery });

    if (!template) {
        throw CustomException('قالب الفاتورة غير موجود', 404);
    }

    res.status(200).json({
        success: true,
        data: template
    });
});

/**
 * Get default template
 * GET /api/invoice-templates/default
 */
const getDefaultTemplate = asyncHandler(async (req, res) => {
    const firmId = req.firmId;

    let template = await InvoiceTemplate.findOne({ ...req.firmQuery, isDefault: true });

    if (!template) {
        // Return a default template structure if none exists
        template = {
            name: 'Default Template',
            nameAr: 'القالب الافتراضي',
            type: 'standard',
            header: {
                showLogo: true,
                logoPosition: 'left',
                showCompanyInfo: true,
                showInvoiceNumber: true,
                showDate: true,
                showDueDate: true
            },
            clientSection: {
                showClientName: true,
                showClientAddress: true,
                showClientPhone: true,
                showClientEmail: true,
                showClientVat: true
            },
            itemsSection: {
                showDescription: true,
                showQuantity: true,
                showUnitPrice: true,
                showDiscount: true,
                showTax: true,
                showLineTotal: true
            },
            footer: {
                showSubtotal: true,
                showDiscount: true,
                showTax: true,
                showTotal: true,
                showPaymentTerms: true,
                showBankDetails: true
            },
            styling: {
                primaryColor: '#1E40AF',
                accentColor: '#3B82F6',
                fontFamily: 'cairo',
                fontSize: 'medium',
                tableStyle: 'striped'
            },
            numberingFormat: {
                prefix: 'INV-',
                digits: 5,
                includeYear: true
            },
            taxSettings: {
                vatRate: 15,
                includeVatNumber: true,
                vatDisplayMode: 'exclusive'
            }
        };
    }

    res.status(200).json({
        success: true,
        data: template
    });
});

/**
 * Update template
 * PATCH /api/invoice-templates/:id
 */
const updateTemplate = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const template = await InvoiceTemplate.findOne({ _id: id, ...req.firmQuery });

    if (!template) {
        throw CustomException('قالب الفاتورة غير موجود', 404);
    }

    const allowedFields = [
        'name', 'nameAr', 'description', 'descriptionAr', 'type',
        'isDefault', 'isActive', 'header', 'clientSection', 'itemsSection',
        'footer', 'styling', 'numberingFormat', 'taxSettings'
    ];

    allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
            template[field] = req.body[field];
        }
    });

    await template.save();

    res.status(200).json({
        success: true,
        message: 'تم تحديث قالب الفاتورة بنجاح',
        data: template
    });
});

/**
 * Delete template
 * DELETE /api/invoice-templates/:id
 */
const deleteTemplate = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const template = await InvoiceTemplate.findOne({ _id: id, ...req.firmQuery });

    if (!template) {
        throw CustomException('قالب الفاتورة غير موجود', 404);
    }

    if (template.isDefault) {
        throw CustomException('لا يمكن حذف القالب الافتراضي', 400);
    }

    await InvoiceTemplate.findOneAndDelete({ _id: id, ...req.firmQuery });

    res.status(200).json({
        success: true,
        message: 'تم حذف قالب الفاتورة بنجاح'
    });
});

/**
 * Duplicate template
 * POST /api/invoice-templates/:id/duplicate
 */
const duplicateTemplate = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, nameAr } = req.body;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    const original = await InvoiceTemplate.findOne({ _id: id, ...req.firmQuery });

    if (!original) {
        throw CustomException('قالب الفاتورة غير موجود', 404);
    }

    const duplicate = await InvoiceTemplate.create({
        firmId,
        lawyerId,
        name: name || `${original.name} (نسخة)`,
        nameAr: nameAr || `${original.nameAr} (نسخة)`,
        description: original.description,
        descriptionAr: original.descriptionAr,
        type: original.type,
        isDefault: false,
        header: original.header,
        clientSection: original.clientSection,
        itemsSection: original.itemsSection,
        footer: original.footer,
        styling: original.styling,
        numberingFormat: original.numberingFormat,
        taxSettings: original.taxSettings,
        createdBy: lawyerId
    });

    res.status(201).json({
        success: true,
        message: 'تم نسخ قالب الفاتورة بنجاح',
        data: duplicate
    });
});

/**
 * Set template as default
 * POST /api/invoice-templates/:id/set-default
 */
const setAsDefault = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const template = await InvoiceTemplate.findOne({ _id: id, ...req.firmQuery });

    if (!template) {
        throw CustomException('قالب الفاتورة غير موجود', 404);
    }

    // Remove default from other templates
    await InvoiceTemplate.updateMany(
        { ...req.firmQuery, _id: { $ne: id } },
        { isDefault: false }
    );

    template.isDefault = true;
    await template.save();

    res.status(200).json({
        success: true,
        message: 'تم تعيين القالب كافتراضي بنجاح',
        data: template
    });
});

/**
 * Preview template
 * GET /api/invoice-templates/:id/preview
 */
const previewTemplate = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const template = await InvoiceTemplate.findOne({ _id: id, ...req.firmQuery });

    if (!template) {
        throw CustomException('قالب الفاتورة غير موجود', 404);
    }

    // Return template with sample data for preview
    const preview = {
        template,
        sampleData: {
            invoiceNumber: 'INV-2025-00001',
            issueDate: new Date(),
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            client: {
                name: 'Sample Client / عميل نموذجي',
                email: 'client@example.com',
                phone: '+966 50 123 4567',
                address: 'Riyadh, Saudi Arabia',
                vatNumber: '123456789012345'
            },
            items: [
                { description: 'Legal Consultation / استشارة قانونية', quantity: 2, unitPrice: 500, total: 1000 },
                { description: 'Document Preparation / إعداد المستندات', quantity: 1, unitPrice: 750, total: 750 }
            ],
            subtotal: 1750,
            vatRate: 15,
            vatAmount: 262.5,
            total: 2012.5
        }
    };

    res.status(200).json({
        success: true,
        data: preview
    });
});

/**
 * Export template as JSON
 * GET /api/invoice-templates/:id/export
 */
const exportTemplate = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const template = await InvoiceTemplate.findOne({ _id: id, ...req.firmQuery });

    if (!template) {
        throw CustomException('قالب الفاتورة غير موجود', 404);
    }

    const exportData = {
        name: template.name,
        nameAr: template.nameAr,
        description: template.description,
        descriptionAr: template.descriptionAr,
        type: template.type,
        header: template.header,
        clientSection: template.clientSection,
        itemsSection: template.itemsSection,
        footer: template.footer,
        styling: template.styling,
        numberingFormat: template.numberingFormat,
        taxSettings: template.taxSettings
    };

    res.status(200).json({
        success: true,
        data: exportData
    });
});

/**
 * Import template from JSON
 * POST /api/invoice-templates/import
 */
const importTemplate = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;

    const {
        name, nameAr, description, descriptionAr, type,
        header, clientSection, itemsSection, footer,
        styling, numberingFormat, taxSettings
    } = req.body;

    if (!name || !nameAr) {
        throw CustomException('الاسم بالعربية والإنجليزية مطلوب', 400);
    }

    const template = await InvoiceTemplate.create({
        firmId,
        lawyerId,
        name,
        nameAr,
        description,
        descriptionAr,
        type: type || 'custom',
        isDefault: false,
        header: header || {},
        clientSection: clientSection || {},
        itemsSection: itemsSection || {},
        footer: footer || {},
        styling: styling || {},
        numberingFormat: numberingFormat || {},
        taxSettings: taxSettings || {},
        createdBy: lawyerId
    });

    res.status(201).json({
        success: true,
        message: 'تم استيراد قالب الفاتورة بنجاح',
        data: template
    });
});

module.exports = {
    createTemplate,
    getTemplates,
    getTemplate,
    getDefaultTemplate,
    updateTemplate,
    deleteTemplate,
    duplicateTemplate,
    setAsDefault,
    previewTemplate,
    exportTemplate,
    importTemplate
};
