const InvoiceApproval = require('../models/invoiceApproval.model');
const Invoice = require('../models/invoice.model');
const Notification = require('../models/notification.model');
const asyncHandler = require('../middlewares/asyncHandler.middleware');
const CustomException = require('../exceptions/customException');

/**
 * Submit invoice for approval
 * POST /api/invoices/:id/submit-for-approval
 */
const submitForApproval = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { approverIds, notes } = req.body;

    const invoice = await Invoice.findOne({
        _id: id,
        firmId: req.firmId
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

    if (!approverIds || approverIds.length === 0) {
        throw new CustomException(
            'At least one approver is required',
            'مطلوب معتمد واحد على الأقل',
            400
        );
    }

    const approval = await InvoiceApproval.createForInvoice(
        id,
        req.userID,
        approverIds
    );

    if (notes) {
        approval.submissionNotes = notes;
        await approval.save();
    }

    // Notify first approver
    const firstApprover = approval.approvers[0];
    await Notification.createNotification({
        firmId: req.firmId,
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
    });

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
        req.firmId,
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
    const { status, limit = 50, offset = 0 } = req.query;

    const query = { firmId: req.firmId };
    if (status) query.status = status;

    const [approvals, total] = await Promise.all([
        InvoiceApproval.find(query)
            .populate('invoiceId', 'invoiceNumber totalAmount clientId')
            .populate('submittedBy', 'name email')
            .populate('approvers.userId', 'name email')
            .sort({ submittedAt: -1 })
            .skip(parseInt(offset))
            .limit(parseInt(limit)),
        InvoiceApproval.countDocuments(query)
    ]);

    res.status(200).json({
        success: true,
        data: approvals,
        pagination: {
            total,
            limit: parseInt(limit),
            offset: parseInt(offset)
        }
    });
});

/**
 * Get single invoice approval
 * GET /api/invoice-approvals/:id
 */
const getInvoiceApproval = asyncHandler(async (req, res) => {
    const approval = await InvoiceApproval.findOne({
        _id: req.params.id,
        firmId: req.firmId
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
    const { comments } = req.body;

    const approval = await InvoiceApproval.findOne({
        _id: req.params.id,
        firmId: req.firmId
    });

    if (!approval) {
        throw new CustomException(
            'Invoice approval not found',
            'طلب الموافقة غير موجود',
            404
        );
    }

    await approval.approve(req.userID, comments);

    // Get invoice for notification
    const invoice = await Invoice.findById(approval.invoiceId);

    // Notify submitter if fully approved
    if (approval.status === 'approved') {
        await Notification.createNotification({
            firmId: req.firmId,
            userId: approval.submittedBy,
            type: 'invoice_approved',
            title: 'Invoice Approved',
            titleAr: 'تمت الموافقة على الفاتورة',
            message: `Invoice ${invoice.invoiceNumber} has been approved`,
            messageAr: `تمت الموافقة على الفاتورة ${invoice.invoiceNumber}`,
            entityType: 'invoice',
            entityId: invoice._id,
            link: `/invoices/${invoice._id}`
        });
    } else {
        // Notify next approver
        const nextApprover = approval.currentApprover;
        if (nextApprover) {
            await Notification.createNotification({
                firmId: req.firmId,
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
            });
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
    const { reason } = req.body;

    if (!reason) {
        throw new CustomException(
            'Rejection reason is required',
            'سبب الرفض مطلوب',
            400
        );
    }

    const approval = await InvoiceApproval.findOne({
        _id: req.params.id,
        firmId: req.firmId
    });

    if (!approval) {
        throw new CustomException(
            'Invoice approval not found',
            'طلب الموافقة غير موجود',
            404
        );
    }

    await approval.reject(req.userID, reason);

    // Get invoice and notify submitter
    const invoice = await Invoice.findById(approval.invoiceId);

    await Notification.createNotification({
        firmId: req.firmId,
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
    });

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
    const { escalateToUserId, reason } = req.body;

    if (!escalateToUserId) {
        throw new CustomException(
            'Escalation target user is required',
            'المستخدم المستهدف للتصعيد مطلوب',
            400
        );
    }

    const approval = await InvoiceApproval.findOne({
        _id: req.params.id,
        firmId: req.firmId
    });

    if (!approval) {
        throw new CustomException(
            'Invoice approval not found',
            'طلب الموافقة غير موجود',
            404
        );
    }

    await approval.escalate(escalateToUserId, reason, req.userID);

    // Notify escalation target
    const invoice = await Invoice.findById(approval.invoiceId);

    await Notification.createNotification({
        firmId: req.firmId,
        userId: escalateToUserId,
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
    });

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
    const { reason } = req.body;

    const approval = await InvoiceApproval.findOne({
        _id: req.params.id,
        firmId: req.firmId
    });

    if (!approval) {
        throw new CustomException(
            'Invoice approval not found',
            'طلب الموافقة غير موجود',
            404
        );
    }

    // Only submitter or admin can cancel
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
    const { startDate, endDate } = req.query;

    const stats = await InvoiceApproval.getStats(req.firmId, startDate, endDate);

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
    const approvals = await InvoiceApproval.getNeedingEscalation(req.firmId);

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
