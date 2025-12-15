/**
 * Credit Note Controller
 *
 * Handles credit note CRUD operations, issuance, and application
 */

const CreditNote = require('../models/creditNote.model');
const Invoice = require('../models/invoice.model');
const Client = require('../models/client.model');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');

/**
 * Get all credit notes
 */
const getCreditNotes = asyncHandler(async (req, res) => {
    const { status, clientId, invoiceId, startDate, endDate, page = 1, limit = 20 } = req.query;

    const query = { ...req.firmQuery };
    if (status) query.status = status;
    if (clientId) query.clientId = clientId;
    if (invoiceId) query.invoiceId = invoiceId;
    if (startDate || endDate) {
        query.creditNoteDate = {};
        if (startDate) query.creditNoteDate.$gte = new Date(startDate);
        if (endDate) query.creditNoteDate.$lte = new Date(endDate);
    }

    const total = await CreditNote.countDocuments(query);
    const creditNotes = await CreditNote.find(query)
        .populate('clientId', 'firstName lastName companyName email')
        .populate('invoiceId', 'invoiceNumber totalAmount')
        .populate('createdBy', 'firstName lastName')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit, 10));

    res.json({
        success: true,
        data: {
            creditNotes,
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
 * Get single credit note
 */
const getCreditNote = asyncHandler(async (req, res) => {
    const creditNote = await CreditNote.findOne({
        _id: req.params.id,
        ...req.firmQuery
    })
        .populate('clientId')
        .populate('invoiceId')
        .populate('createdBy', 'firstName lastName')
        .populate('issuedBy', 'firstName lastName')
        .populate('appliedBy', 'firstName lastName')
        .populate('history.performedBy', 'firstName lastName');

    if (!creditNote) {
        throw CustomException('Credit note not found', 404, {
            messageAr: 'لم يتم العثور على إشعار الدائن'
        });
    }

    res.json({
        success: true,
        data: creditNote
    });
});

/**
 * Get credit notes for specific invoice
 */
const getCreditNotesForInvoice = asyncHandler(async (req, res) => {
    const creditNotes = await CreditNote.find({
        invoiceId: req.params.invoiceId,
        ...req.firmQuery
    })
        .populate('createdBy', 'firstName lastName')
        .sort({ createdAt: -1 });

    res.json({
        success: true,
        data: creditNotes
    });
});

/**
 * Create credit note
 */
const createCreditNote = asyncHandler(async (req, res) => {
    const { invoiceId, creditType, reasonCategory, reason, reasonAr, items, notes, notesAr } = req.body;

    // Get original invoice
    const invoice = await Invoice.findOne({
        _id: invoiceId,
        ...req.firmQuery
    }).populate('clientId');

    if (!invoice) {
        throw CustomException('Invoice not found', 404, {
            messageAr: 'لم يتم العثور على الفاتورة'
        });
    }

    // Validate invoice can have credit note
    if (['cancelled', 'void'].includes(invoice.status)) {
        throw CustomException('Cannot create credit note for cancelled/void invoice', 400, {
            messageAr: 'لا يمكن إنشاء إشعار دائن لفاتورة ملغاة'
        });
    }

    // Generate credit note number
    const creditNoteNumber = await CreditNote.generateNumber(req.firmId, req.firmId ? null : req.userID);

    // Create credit note
    const creditNote = new CreditNote({
        firmId: req.firmId,
        lawyerId: req.firmId ? null : req.userID,
        creditNoteNumber,
        invoiceId,
        invoiceNumber: invoice.invoiceNumber,
        clientId: invoice.clientId._id,
        clientName: invoice.clientId.companyName ||
            `${invoice.clientId.firstName} ${invoice.clientId.lastName}`,
        clientNameAr: invoice.clientId.companyNameAr ||
            invoice.clientId.fullNameArabic,
        clientVatNumber: invoice.clientId.vatNumber,
        creditType,
        reasonCategory,
        reason,
        reasonAr,
        items,
        notes,
        notesAr,
        createdBy: req.userID,
        history: [{
            action: 'created',
            performedBy: req.userID,
            details: { reasonCategory, reason }
        }]
    });

    // Calculate totals
    creditNote.calculateTotals();

    // Validate total doesn't exceed invoice balance
    const invoiceBalance = invoice.balanceDue || invoice.totalAmount;
    if (creditNote.total > invoiceBalance) {
        throw CustomException(
            `Credit note total (${creditNote.total}) cannot exceed invoice balance (${invoiceBalance})`,
            400,
            { messageAr: 'لا يمكن أن يتجاوز إجمالي إشعار الدائن رصيد الفاتورة' }
        );
    }

    await creditNote.save();

    res.status(201).json({
        success: true,
        data: creditNote,
        message: 'Credit note created successfully',
        messageAr: 'تم إنشاء إشعار الدائن بنجاح'
    });
});

/**
 * Update credit note
 */
const updateCreditNote = asyncHandler(async (req, res) => {
    const creditNote = await CreditNote.findOne({
        _id: req.params.id,
        ...req.firmQuery,
        status: 'draft'
    });

    if (!creditNote) {
        throw CustomException('Credit note not found or cannot be edited', 404, {
            messageAr: 'لم يتم العثور على إشعار الدائن أو لا يمكن تعديله'
        });
    }

    const { reasonCategory, reason, reasonAr, items, notes, notesAr } = req.body;

    if (reasonCategory) creditNote.reasonCategory = reasonCategory;
    if (reason !== undefined) creditNote.reason = reason;
    if (reasonAr !== undefined) creditNote.reasonAr = reasonAr;
    if (items) creditNote.items = items;
    if (notes !== undefined) creditNote.notes = notes;
    if (notesAr !== undefined) creditNote.notesAr = notesAr;

    creditNote.calculateTotals();
    creditNote.updatedBy = req.userID;
    creditNote.history.push({
        action: 'updated',
        performedBy: req.userID
    });

    await creditNote.save();

    res.json({
        success: true,
        data: creditNote,
        message: 'Credit note updated',
        messageAr: 'تم تحديث إشعار الدائن'
    });
});

/**
 * Issue credit note
 */
const issueCreditNote = asyncHandler(async (req, res) => {
    const creditNote = await CreditNote.findOne({
        _id: req.params.id,
        ...req.firmQuery,
        status: 'draft'
    });

    if (!creditNote) {
        throw CustomException('Credit note not found or already issued', 404, {
            messageAr: 'لم يتم العثور على إشعار الدائن أو تم إصداره مسبقاً'
        });
    }

    await creditNote.issue(req.userID);

    res.json({
        success: true,
        data: creditNote,
        message: 'Credit note issued successfully',
        messageAr: 'تم إصدار إشعار الدائن بنجاح'
    });
});

/**
 * Apply credit note to invoice
 */
const applyCreditNote = asyncHandler(async (req, res) => {
    const creditNote = await CreditNote.findOne({
        _id: req.params.id,
        ...req.firmQuery,
        status: 'issued'
    });

    if (!creditNote) {
        throw CustomException('Credit note not found or cannot be applied', 404, {
            messageAr: 'لم يتم العثور على إشعار الدائن أو لا يمكن تطبيقه'
        });
    }

    await creditNote.apply(req.userID);

    // Update client credit balance
    await Client.findByIdAndUpdate(creditNote.clientId, {
        $inc: { 'billing.creditBalance': creditNote.total }
    });

    res.json({
        success: true,
        data: creditNote,
        message: 'Credit note applied to invoice',
        messageAr: 'تم تطبيق إشعار الدائن على الفاتورة'
    });
});

/**
 * Void credit note
 */
const voidCreditNote = asyncHandler(async (req, res) => {
    const { reason } = req.body;

    if (!reason) {
        throw CustomException('Void reason is required', 400, {
            messageAr: 'سبب الإلغاء مطلوب'
        });
    }

    const creditNote = await CreditNote.findOne({
        _id: req.params.id,
        ...req.firmQuery
    });

    if (!creditNote) {
        throw CustomException('Credit note not found', 404, {
            messageAr: 'لم يتم العثور على إشعار الدائن'
        });
    }

    await creditNote.void(reason, req.userID);

    res.json({
        success: true,
        data: creditNote,
        message: 'Credit note voided',
        messageAr: 'تم إلغاء إشعار الدائن'
    });
});

/**
 * Delete draft credit note
 */
const deleteCreditNote = asyncHandler(async (req, res) => {
    const creditNote = await CreditNote.findOne({
        _id: req.params.id,
        ...req.firmQuery,
        status: 'draft'
    });

    if (!creditNote) {
        throw CustomException('Credit note not found or cannot be deleted', 404, {
            messageAr: 'لم يتم العثور على إشعار الدائن أو لا يمكن حذفه'
        });
    }

    await creditNote.deleteOne();

    res.json({
        success: true,
        message: 'Credit note deleted',
        messageAr: 'تم حذف إشعار الدائن'
    });
});

/**
 * Get credit notes statistics
 */
const getCreditNoteStats = asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;

    const matchStage = { ...req.firmQuery };
    if (startDate || endDate) {
        matchStage.creditNoteDate = {};
        if (startDate) matchStage.creditNoteDate.$gte = new Date(startDate);
        if (endDate) matchStage.creditNoteDate.$lte = new Date(endDate);
    }

    const stats = await CreditNote.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 },
                total: { $sum: '$total' }
            }
        }
    ]);

    const result = {
        draft: { count: 0, total: 0 },
        issued: { count: 0, total: 0 },
        applied: { count: 0, total: 0 },
        void: { count: 0, total: 0 },
        total: { count: 0, total: 0 }
    };

    stats.forEach(s => {
        result[s._id] = { count: s.count, total: s.total };
        result.total.count += s.count;
        result.total.total += s.total;
    });

    res.json({
        success: true,
        data: result
    });
});

module.exports = {
    getCreditNotes,
    getCreditNote,
    getCreditNotesForInvoice,
    createCreditNote,
    updateCreditNote,
    issueCreditNote,
    applyCreditNote,
    voidCreditNote,
    deleteCreditNote,
    getCreditNoteStats
};
