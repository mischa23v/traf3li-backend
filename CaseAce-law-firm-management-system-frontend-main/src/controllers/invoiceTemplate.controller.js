const { InvoiceTemplate } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');

/**
 * Create invoice template
 * POST /api/invoice-templates
 */
const createTemplate = asyncHandler(async (req, res) => {
    const {
        name, nameAr, description, descriptionAr, type,
        isDefault, header, clientSection, itemsSection,
        footer, styling, numberingFormat, taxSettings
    } = req.body;
    const lawyerId = req.userID;

    if (!name || !nameAr) {
        throw CustomException('الاسم بالعربية والإنجليزية مطلوب', 400);
    }

    const template = await InvoiceTemplate.create({
        lawyerId,
        name,
        nameAr,
        description,
        descriptionAr,
        type: type || 'standard',
        isDefault: isDefault || false,
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
    const lawyerId = req.userID;

    const query = { lawyerId };

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
    const lawyerId = req.userID;

    const template = await InvoiceTemplate.findOne({ _id: id, lawyerId });

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
    const lawyerId = req.userID;

    let template = await InvoiceTemplate.getDefault(lawyerId);

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
    const lawyerId = req.userID;

    const template = await InvoiceTemplate.findOne({ _id: id, lawyerId });

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
    const lawyerId = req.userID;

    const template = await InvoiceTemplate.findOne({ _id: id, lawyerId });

    if (!template) {
        throw CustomException('قالب الفاتورة غير موجود', 404);
    }

    if (template.isDefault) {
        throw CustomException('لا يمكن حذف القالب الافتراضي', 400);
    }

    await InvoiceTemplate.findByIdAndDelete(id);

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

    const original = await InvoiceTemplate.findOne({ _id: id, lawyerId });

    if (!original) {
        throw CustomException('قالب الفاتورة غير موجود', 404);
    }

    const duplicate = await InvoiceTemplate.create({
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
    const lawyerId = req.userID;

    const template = await InvoiceTemplate.findOne({ _id: id, lawyerId });

    if (!template) {
        throw CustomException('قالب الفاتورة غير موجود', 404);
    }

    // Remove default from other templates
    await InvoiceTemplate.updateMany(
        { lawyerId, _id: { $ne: id } },
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
    const lawyerId = req.userID;

    const template = await InvoiceTemplate.findOne({ _id: id, lawyerId });

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
    const lawyerId = req.userID;

    const template = await InvoiceTemplate.findOne({ _id: id, lawyerId });

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

    const {
        name, nameAr, description, descriptionAr, type,
        header, clientSection, itemsSection, footer,
        styling, numberingFormat, taxSettings
    } = req.body;

    if (!name || !nameAr) {
        throw CustomException('الاسم بالعربية والإنجليزية مطلوب', 400);
    }

    const template = await InvoiceTemplate.create({
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
