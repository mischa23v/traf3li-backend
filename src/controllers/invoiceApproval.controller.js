const InvoiceApproval = require('../models/invoiceApproval.model');
const Invoice = require('../models/invoice.model');
const Notification = require('../models/notification.model');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');

/**
 * Submit invoice for approval
 * POST /api/invoices/:id/submit-for-approval
 */
const submitForApproval = asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Mass assignment protection
    const allowedFields = pickAllowedFields(req.body, ['approverIds', 'notes']);
    const { approverIds, notes } = allowedFields;

    // Sanitize invoice ID
    const sanitizedId = sanitizeObjectId(id);

    // IDOR protection - verify ownership
    const invoice = await Invoice.findOne({
        _id: sanitizedId,
        ...req.firmQuery
    });

    if (!invoice) {
        throw new CustomException(
            'Invoice not found',
            'الفاتورة غير موجودة',
            404
        );
    }

    if (invoice.status !== 'draft') {
        throw new CustomException(
            'Only draft invoices can be submitted for approval',
            'يمكن تقديم الفواتير المسودة فقط للموافقة',
            400
        );
    }

    // Validate approval data
    if (!approverIds || !Array.isArray(approverIds) || approverIds.length === 0) {
        throw new CustomException(
            'At least one approver is required',
            'مطلوب معتمد واحد على الأقل',
            400
        );
    }

    // Sanitize approver IDs
    const sanitizedApproverIds = approverIds.map(id => sanitizeObjectId(id));

    const approval = await InvoiceApproval.createForInvoice(
        sanitizedId,
        req.userID,
        sanitizedApproverIds
    );

    if (notes) {
        approval.submissionNotes = notes;
        await approval.save();
    }

    // Notify first approver
    const firstApprover = approval.approvers[0];
    await Notification.createNotification(req.addFirmId({
        userId: firstApprover.userId,
        type: 'invoice_approval_required',
        title: 'Invoice Pending Approval',
        titleAr: 'فاتورة تنتظر الموافقة',
        message: `Invoice ${invoice.invoiceNumber} requires your approval`,
        messageAr: `الفاتورة ${invoice.invoiceNumber} تتطلب موافقتك`,
        entityType: 'invoice',
        entityId: invoice._id,
        link: `/invoices/${invoice._id}`,
        priority: 'high',
        actionRequired: true
    }));

    res.status(201).json({
        success: true,
        message: 'Invoice submitted for approval',
        messageAr: 'تم تقديم الفاتورة للموافقة',
        data: approval
    });
});

/**
 * Get pending approvals for current user
 * GET /api/invoice-approvals/pending
 */
const getPendingApprovals = asyncHandler(async (req, res) => {
    const approvals = await InvoiceApproval.getPendingForUser(
        req.firmQuery,
        req.userID
    );

    res.status(200).json({
        success: true,
        data: approvals
    });
});

/**
 * Get all invoice approvals
 * GET /api/invoice-approvals
 */
const getInvoiceApprovals = asyncHandler(async (req, res) => {
    // Mass assignment protection
    const allowedFields = pickAllowedFields(req.query, ['status', 'limit', 'offset']);
    const { status, limit = 50, offset = 0 } = allowedFields;

    // IDOR protection - always filter by firmQuery
    const query = { ...req.firmQuery };
    if (status) {
        // Validate status value
        const validStatuses = ['pending', 'approved', 'rejected', 'cancelled'];
        if (!validStatuses.includes(status)) {
            throw new CustomException(
                'Invalid status value',
                'قيمة الحالة غير صالحة',
                400
            );
        }
        query.status = status;
    }

    // Validate and sanitize pagination params
    const sanitizedLimit = Math.min(Math.max(parseInt(limit) || 50, 1), 100);
    const sanitizedOffset = Math.max(parseInt(offset) || 0, 0);

    const [approvals, total] = await Promise.all([
        InvoiceApproval.find(query)
            .populate('invoiceId', 'invoiceNumber totalAmount clientId')
            .populate('submittedBy', 'name email')
            .populate('approvers.userId', 'name email')
            .sort({ submittedAt: -1 })
            .skip(sanitizedOffset)
            .limit(sanitizedLimit),
        InvoiceApproval.countDocuments(query)
    ]);

    res.status(200).json({
        success: true,
        data: approvals,
        pagination: {
            total,
            limit: sanitizedLimit,
            offset: sanitizedOffset
        }
    });
});

/**
 * Get single invoice approval
 * GET /api/invoice-approvals/:id
 */
const getInvoiceApproval = asyncHandler(async (req, res) => {
    // Sanitize approval ID
    const sanitizedId = sanitizeObjectId(req.params.id);

    // IDOR protection - verify ownership
    const approval = await InvoiceApproval.findOne({
        _id: sanitizedId,
        ...req.firmQuery
    })
        .populate('invoiceId')
        .populate('submittedBy', 'name email')
        .populate('approvers.userId', 'name email')
        .populate('escalatedTo', 'name email');

    if (!approval) {
        throw new CustomException(
            'Invoice approval not found',
            'طلب الموافقة غير موجود',
            404
        );
    }

    res.status(200).json({
        success: true,
        data: approval
    });
});

/**
 * Approve invoice at current level
 * POST /api/invoice-approvals/:id/approve
 */
const approveInvoice = asyncHandler(async (req, res) => {
    // Mass assignment protection
    const allowedFields = pickAllowedFields(req.body, ['comments']);
    const { comments } = allowedFields;

    // Sanitize approval ID
    const sanitizedId = sanitizeObjectId(req.params.id);

    // IDOR protection - verify ownership
    const approval = await InvoiceApproval.findOne({
        _id: sanitizedId,
        ...req.firmQuery
    });

    if (!approval) {
        throw new CustomException(
            'Invoice approval not found',
            'طلب الموافقة غير موجود',
            404
        );
    }

    // Role-based approval verification - ensure user is authorized to approve
    const currentApprover = approval.currentApprover;
    const isCurrentApprover = currentApprover && currentApprover.userId.equals(req.userID);
    const isEscalatedTo = approval.escalatedTo && approval.escalatedTo.equals(req.userID);
    const isAdmin = req.userRole === 'admin';

    if (!isCurrentApprover && !isEscalatedTo && !isAdmin) {
        throw new CustomException(
            'You are not authorized to approve this invoice',
            'غير مصرح لك بالموافقة على هذه الفاتورة',
            403
        );
    }

    await approval.approve(req.userID, comments);

    // Get invoice for notification
    const invoice = await Invoice.findOne({ _id: approval.invoiceId, ...req.firmQuery });

    // Notify submitter if fully approved
    if (approval.status === 'approved') {
        await Notification.createNotification(req.addFirmId({
            userId: approval.submittedBy,
            type: 'invoice_approved',
            title: 'Invoice Approved',
            titleAr: 'تمت الموافقة على الفاتورة',
            message: `Invoice ${invoice.invoiceNumber} has been approved`,
            messageAr: `تمت الموافقة على الفاتورة ${invoice.invoiceNumber}`,
            entityType: 'invoice',
            entityId: invoice._id,
            link: `/invoices/${invoice._id}`
        }));
    } else {
        // Notify next approver
        const nextApprover = approval.currentApprover;
        if (nextApprover) {
            await Notification.createNotification(req.addFirmId({
                userId: nextApprover.userId,
                type: 'invoice_approval_required',
                title: 'Invoice Pending Your Approval',
                titleAr: 'فاتورة تنتظر موافقتك',
                message: `Invoice ${invoice.invoiceNumber} requires your approval`,
                messageAr: `الفاتورة ${invoice.invoiceNumber} تتطلب موافقتك`,
                entityType: 'invoice',
                entityId: invoice._id,
                link: `/invoices/${invoice._id}`,
                priority: 'high',
                actionRequired: true
            }));
        }
    }

    res.status(200).json({
        success: true,
        message: approval.status === 'approved'
            ? 'Invoice fully approved'
            : 'Invoice approved at current level',
        messageAr: approval.status === 'approved'
            ? 'تمت الموافقة الكاملة على الفاتورة'
            : 'تمت الموافقة على الفاتورة في المستوى الحالي',
        data: approval
    });
});

/**
 * Reject invoice approval
 * POST /api/invoice-approvals/:id/reject
 */
const rejectInvoice = asyncHandler(async (req, res) => {
    // Mass assignment protection
    const allowedFields = pickAllowedFields(req.body, ['reason']);
    const { reason } = allowedFields;

    // Validate approval data
    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
        throw new CustomException(
            'Rejection reason is required',
            'سبب الرفض مطلوب',
            400
        );
    }

    // Sanitize approval ID
    const sanitizedId = sanitizeObjectId(req.params.id);

    // IDOR protection - verify ownership
    const approval = await InvoiceApproval.findOne({
        _id: sanitizedId,
        ...req.firmQuery
    });

    if (!approval) {
        throw new CustomException(
            'Invoice approval not found',
            'طلب الموافقة غير موجود',
            404
        );
    }

    // Role-based approval verification - ensure user is authorized to reject
    const currentApprover = approval.currentApprover;
    const isCurrentApprover = currentApprover && currentApprover.userId.equals(req.userID);
    const isEscalatedTo = approval.escalatedTo && approval.escalatedTo.equals(req.userID);
    const isAdmin = req.userRole === 'admin';

    if (!isCurrentApprover && !isEscalatedTo && !isAdmin) {
        throw new CustomException(
            'You are not authorized to reject this invoice',
            'غير مصرح لك برفض هذه الفاتورة',
            403
        );
    }

    await approval.reject(req.userID, reason.trim());

    // Get invoice and notify submitter
    const invoice = await Invoice.findOne({ _id: approval.invoiceId, ...req.firmQuery });

    await Notification.createNotification(req.addFirmId({
        userId: approval.submittedBy,
        type: 'invoice_rejected',
        title: 'Invoice Rejected',
        titleAr: 'تم رفض الفاتورة',
        message: `Invoice ${invoice.invoiceNumber} was rejected: ${reason}`,
        messageAr: `تم رفض الفاتورة ${invoice.invoiceNumber}: ${reason}`,
        entityType: 'invoice',
        entityId: invoice._id,
        link: `/invoices/${invoice._id}`,
        priority: 'high'
    }));

    res.status(200).json({
        success: true,
        message: 'Invoice approval rejected',
        messageAr: 'تم رفض طلب الموافقة على الفاتورة',
        data: approval
    });
});

/**
 * Escalate invoice approval
 * POST /api/invoice-approvals/:id/escalate
 */
const escalateApproval = asyncHandler(async (req, res) => {
    // Mass assignment protection
    const allowedFields = pickAllowedFields(req.body, ['escalateToUserId', 'reason']);
    const { escalateToUserId, reason } = allowedFields;

    // Validate approval data
    if (!escalateToUserId) {
        throw new CustomException(
            'Escalation target user is required',
            'المستخدم المستهدف للتصعيد مطلوب',
            400
        );
    }

    // Sanitize IDs
    const sanitizedId = sanitizeObjectId(req.params.id);
    const sanitizedEscalateToUserId = sanitizeObjectId(escalateToUserId);

    // IDOR protection - verify ownership
    const approval = await InvoiceApproval.findOne({
        _id: sanitizedId,
        ...req.firmQuery
    });

    if (!approval) {
        throw new CustomException(
            'Invoice approval not found',
            'طلب الموافقة غير موجود',
            404
        );
    }

    // Role-based approval verification - only current approver or admin can escalate
    const currentApprover = approval.currentApprover;
    const isCurrentApprover = currentApprover && currentApprover.userId.equals(req.userID);
    const isAdmin = req.userRole === 'admin';

    if (!isCurrentApprover && !isAdmin) {
        throw new CustomException(
            'You are not authorized to escalate this approval',
            'غير مصرح لك بتصعيد هذا الطلب',
            403
        );
    }

    await approval.escalate(sanitizedEscalateToUserId, reason, req.userID);

    // Notify escalation target
    const invoice = await Invoice.findOne({ _id: approval.invoiceId, ...req.firmQuery });

    await Notification.createNotification(req.addFirmId({
        userId: sanitizedEscalateToUserId,
        type: 'invoice_approval_required',
        title: 'Escalated Invoice Approval',
        titleAr: 'موافقة فاتورة مصعدة',
        message: `Invoice ${invoice.invoiceNumber} has been escalated to you for approval`,
        messageAr: `تم تصعيد الفاتورة ${invoice.invoiceNumber} إليك للموافقة`,
        entityType: 'invoice',
        entityId: invoice._id,
        link: `/invoices/${invoice._id}`,
        priority: 'urgent',
        actionRequired: true
    }));

    res.status(200).json({
        success: true,
        message: 'Invoice approval escalated',
        messageAr: 'تم تصعيد طلب الموافقة على الفاتورة',
        data: approval
    });
});

/**
 * Cancel invoice approval
 * POST /api/invoice-approvals/:id/cancel
 */
const cancelApproval = asyncHandler(async (req, res) => {
    // Mass assignment protection
    const allowedFields = pickAllowedFields(req.body, ['reason']);
    const { reason } = allowedFields;

    // Sanitize approval ID
    const sanitizedId = sanitizeObjectId(req.params.id);

    // IDOR protection - verify ownership
    const approval = await InvoiceApproval.findOne({
        _id: sanitizedId,
        ...req.firmQuery
    });

    if (!approval) {
        throw new CustomException(
            'Invoice approval not found',
            'طلب الموافقة غير موجود',
            404
        );
    }

    // Role-based approval verification - only submitter or admin can cancel
    if (!approval.submittedBy.equals(req.userID) && req.userRole !== 'admin') {
        throw new CustomException(
            'Only the submitter or admin can cancel',
            'فقط مقدم الطلب أو المدير يمكنه الإلغاء',
            403
        );
    }

    await approval.cancel(req.userID, reason);

    res.status(200).json({
        success: true,
        message: 'Invoice approval cancelled',
        messageAr: 'تم إلغاء طلب الموافقة على الفاتورة',
        data: approval
    });
});

/**
 * Get approval statistics
 * GET /api/invoice-approvals/stats
 */
const getApprovalStats = asyncHandler(async (req, res) => {
    // Mass assignment protection
    const allowedFields = pickAllowedFields(req.query, ['startDate', 'endDate']);
    const { startDate, endDate } = allowedFields;

    // Validate date params if provided
    if (startDate && isNaN(Date.parse(startDate))) {
        throw new CustomException(
            'Invalid start date format',
            'تنسيق تاريخ البداية غير صالح',
            400
        );
    }

    if (endDate && isNaN(Date.parse(endDate))) {
        throw new CustomException(
            'Invalid end date format',
            'تنسيق تاريخ النهاية غير صالح',
            400
        );
    }

    // IDOR protection - stats are filtered by firmQuery
    const stats = await InvoiceApproval.getStats(req.firmQuery, startDate, endDate);

    res.status(200).json({
        success: true,
        data: stats
    });
});

/**
 * Get approvals needing escalation
 * GET /api/invoice-approvals/needing-escalation
 */
const getNeedingEscalation = asyncHandler(async (req, res) => {
    const approvals = await InvoiceApproval.getNeedingEscalation(req.firmQuery);

    res.status(200).json({
        success: true,
        data: approvals
    });
});

module.exports = {
    submitForApproval,
    getPendingApprovals,
    getInvoiceApprovals,
    getInvoiceApproval,
    approveInvoice,
    rejectInvoice,
    escalateApproval,
    cancelApproval,
    getApprovalStats,
    getNeedingEscalation
};
