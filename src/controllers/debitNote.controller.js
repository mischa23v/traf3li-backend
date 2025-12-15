/**
 * Debit Note Controller
 *
 * Handles debit note CRUD operations, approval workflow, and application
 */

const DebitNote = require('../models/debitNote.model');
const Bill = require('../models/bill.model');
const Vendor = require('../models/vendor.model');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');

/**
 * Get all debit notes
 */
const getDebitNotes = asyncHandler(async (req, res) => {
    const { status, vendorId, billId, startDate, endDate, page = 1, limit = 20 } = req.query;

    const query = { ...req.firmQuery };
    if (status) query.status = status;
    if (vendorId) query.vendorId = vendorId;
    if (billId) query.billId = billId;
    if (startDate || endDate) {
        query.debitNoteDate = {};
        if (startDate) query.debitNoteDate.$gte = new Date(startDate);
        if (endDate) query.debitNoteDate.$lte = new Date(endDate);
    }

    const total = await DebitNote.countDocuments(query);
    const debitNotes = await DebitNote.find(query)
        .populate('vendorId', 'name nameAr email')
        .populate('billId', 'billNumber totalAmount')
        .populate('createdBy', 'firstName lastName')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit, 10));

    res.json({
        success: true,
        data: {
            debitNotes,
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
 * Get single debit note
 */
const getDebitNote = asyncHandler(async (req, res) => {
    const debitNote = await DebitNote.findOne({
        _id: req.params.id,
        ...req.firmQuery
    })
        .populate('vendorId')
        .populate('billId')
        .populate('createdBy', 'firstName lastName')
        .populate('submittedBy', 'firstName lastName')
        .populate('approvedBy', 'firstName lastName')
        .populate('appliedBy', 'firstName lastName')
        .populate('history.performedBy', 'firstName lastName');

    if (!debitNote) {
        throw CustomException('Debit note not found', 404, {
            messageAr: 'لم يتم العثور على إشعار المدين'
        });
    }

    res.json({
        success: true,
        data: debitNote
    });
});

/**
 * Get debit notes for specific bill
 */
const getDebitNotesForBill = asyncHandler(async (req, res) => {
    const debitNotes = await DebitNote.find({
        billId: req.params.billId,
        ...req.firmQuery
    })
        .populate('createdBy', 'firstName lastName')
        .sort({ createdAt: -1 });

    res.json({
        success: true,
        data: debitNotes
    });
});

/**
 * Create debit note
 */
const createDebitNote = asyncHandler(async (req, res) => {
    const { billId, reasonType, reason, reasonAr, items, isPartial, notes, notesAr } = req.body;

    // Get original bill
    const bill = await Bill.findOne({
        _id: billId,
        ...req.firmQuery
    }).populate('vendorId');

    if (!bill) {
        throw CustomException('Bill not found', 404, {
            messageAr: 'لم يتم العثور على الفاتورة'
        });
    }

    // Validate bill can have debit note
    if (['cancelled', 'void'].includes(bill.status)) {
        throw CustomException('Cannot create debit note for cancelled/void bill', 400, {
            messageAr: 'لا يمكن إنشاء إشعار مدين لفاتورة ملغاة'
        });
    }

    // Generate debit note number
    const debitNoteNumber = await DebitNote.generateNumber(req.firmId, req.firmId ? null : req.userID);

    // Create debit note
    const debitNote = new DebitNote({
        firmId: req.firmId,
        lawyerId: req.firmId ? null : req.userID,
        debitNoteNumber,
        billId,
        billNumber: bill.billNumber,
        vendorId: bill.vendorId._id,
        vendorName: bill.vendorId.name,
        vendorNameAr: bill.vendorId.nameAr,
        vendorVatNumber: bill.vendorId.vatNumber,
        reasonType,
        reason,
        reasonAr,
        items,
        isPartial,
        notes,
        notesAr,
        createdBy: req.userID,
        history: [{
            action: 'created',
            performedBy: req.userID,
            details: { reasonType, reason }
        }]
    });

    // Calculate totals
    debitNote.calculateTotals();

    // Validate total doesn't exceed bill balance
    const billBalance = bill.balanceDue || bill.totalAmount;
    if (debitNote.total > billBalance) {
        throw CustomException(
            `Debit note total cannot exceed bill balance`,
            400,
            { messageAr: 'لا يمكن أن يتجاوز إجمالي إشعار المدين رصيد الفاتورة' }
        );
    }

    await debitNote.save();

    res.status(201).json({
        success: true,
        data: debitNote,
        message: 'Debit note created successfully',
        messageAr: 'تم إنشاء إشعار المدين بنجاح'
    });
});

/**
 * Update debit note
 */
const updateDebitNote = asyncHandler(async (req, res) => {
    const debitNote = await DebitNote.findOne({
        _id: req.params.id,
        ...req.firmQuery,
        status: 'draft'
    });

    if (!debitNote) {
        throw CustomException('Debit note not found or cannot be edited', 404, {
            messageAr: 'لم يتم العثور على إشعار المدين أو لا يمكن تعديله'
        });
    }

    const { reasonType, reason, reasonAr, items, isPartial, notes, notesAr } = req.body;

    if (reasonType) debitNote.reasonType = reasonType;
    if (reason !== undefined) debitNote.reason = reason;
    if (reasonAr !== undefined) debitNote.reasonAr = reasonAr;
    if (items) debitNote.items = items;
    if (isPartial !== undefined) debitNote.isPartial = isPartial;
    if (notes !== undefined) debitNote.notes = notes;
    if (notesAr !== undefined) debitNote.notesAr = notesAr;

    debitNote.calculateTotals();
    debitNote.updatedBy = req.userID;
    debitNote.history.push({
        action: 'updated',
        performedBy: req.userID
    });

    await debitNote.save();

    res.json({
        success: true,
        data: debitNote,
        message: 'Debit note updated',
        messageAr: 'تم تحديث إشعار المدين'
    });
});

/**
 * Submit debit note for approval
 */
const submitDebitNote = asyncHandler(async (req, res) => {
    const debitNote = await DebitNote.findOne({
        _id: req.params.id,
        ...req.firmQuery,
        status: 'draft'
    });

    if (!debitNote) {
        throw CustomException('Debit note not found or cannot be submitted', 404, {
            messageAr: 'لم يتم العثور على إشعار المدين أو لا يمكن تقديمه'
        });
    }

    await debitNote.submit(req.userID);

    res.json({
        success: true,
        data: debitNote,
        message: 'Debit note submitted for approval',
        messageAr: 'تم تقديم إشعار المدين للموافقة'
    });
});

/**
 * Approve debit note
 */
const approveDebitNote = asyncHandler(async (req, res) => {
    const { notes } = req.body;

    const debitNote = await DebitNote.findOne({
        _id: req.params.id,
        ...req.firmQuery,
        status: 'pending'
    });

    if (!debitNote) {
        throw CustomException('Debit note not found or cannot be approved', 404, {
            messageAr: 'لم يتم العثور على إشعار المدين أو لا يمكن الموافقة عليه'
        });
    }

    await debitNote.approve(req.userID, notes);

    res.json({
        success: true,
        data: debitNote,
        message: 'Debit note approved',
        messageAr: 'تمت الموافقة على إشعار المدين'
    });
});

/**
 * Reject debit note
 */
const rejectDebitNote = asyncHandler(async (req, res) => {
    const { reason } = req.body;

    if (!reason) {
        throw CustomException('Rejection reason is required', 400, {
            messageAr: 'سبب الرفض مطلوب'
        });
    }

    const debitNote = await DebitNote.findOne({
        _id: req.params.id,
        ...req.firmQuery,
        status: 'pending'
    });

    if (!debitNote) {
        throw CustomException('Debit note not found or cannot be rejected', 404, {
            messageAr: 'لم يتم العثور على إشعار المدين أو لا يمكن رفضه'
        });
    }

    await debitNote.reject(req.userID, reason);

    res.json({
        success: true,
        data: debitNote,
        message: 'Debit note rejected',
        messageAr: 'تم رفض إشعار المدين'
    });
});

/**
 * Apply debit note to bill
 */
const applyDebitNote = asyncHandler(async (req, res) => {
    const debitNote = await DebitNote.findOne({
        _id: req.params.id,
        ...req.firmQuery,
        status: 'approved'
    });

    if (!debitNote) {
        throw CustomException('Debit note not found or cannot be applied', 404, {
            messageAr: 'لم يتم العثور على إشعار المدين أو لا يمكن تطبيقه'
        });
    }

    await debitNote.apply(req.userID);

    // Update vendor balance
    await Vendor.findByIdAndUpdate(debitNote.vendorId, {
        $inc: { outstandingBalance: -debitNote.total }
    });

    res.json({
        success: true,
        data: debitNote,
        message: 'Debit note applied to bill',
        messageAr: 'تم تطبيق إشعار المدين على الفاتورة'
    });
});

/**
 * Cancel debit note
 */
const cancelDebitNote = asyncHandler(async (req, res) => {
    const { reason } = req.body;

    if (!reason) {
        throw CustomException('Cancellation reason is required', 400, {
            messageAr: 'سبب الإلغاء مطلوب'
        });
    }

    const debitNote = await DebitNote.findOne({
        _id: req.params.id,
        ...req.firmQuery
    });

    if (!debitNote) {
        throw CustomException('Debit note not found', 404, {
            messageAr: 'لم يتم العثور على إشعار المدين'
        });
    }

    await debitNote.cancel(req.userID, reason);

    res.json({
        success: true,
        data: debitNote,
        message: 'Debit note cancelled',
        messageAr: 'تم إلغاء إشعار المدين'
    });
});

/**
 * Delete draft debit note
 */
const deleteDebitNote = asyncHandler(async (req, res) => {
    const debitNote = await DebitNote.findOne({
        _id: req.params.id,
        ...req.firmQuery,
        status: 'draft'
    });

    if (!debitNote) {
        throw CustomException('Debit note not found or cannot be deleted', 404, {
            messageAr: 'لم يتم العثور على إشعار المدين أو لا يمكن حذفه'
        });
    }

    await debitNote.deleteOne();

    res.json({
        success: true,
        message: 'Debit note deleted',
        messageAr: 'تم حذف إشعار المدين'
    });
});

/**
 * Get pending debit notes for approval
 */
const getPendingApprovals = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20 } = req.query;

    const query = { ...req.firmQuery, status: 'pending' };

    const total = await DebitNote.countDocuments(query);
    const debitNotes = await DebitNote.find(query)
        .populate('vendorId', 'name nameAr')
        .populate('billId', 'billNumber')
        .populate('submittedBy', 'firstName lastName')
        .sort({ submittedAt: 1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit, 10));

    res.json({
        success: true,
        data: {
            debitNotes,
            pagination: {
                total,
                page: parseInt(page, 10),
                totalPages: Math.ceil(total / limit)
            }
        }
    });
});

module.exports = {
    getDebitNotes,
    getDebitNote,
    getDebitNotesForBill,
    createDebitNote,
    updateDebitNote,
    submitDebitNote,
    approveDebitNote,
    rejectDebitNote,
    applyDebitNote,
    cancelDebitNote,
    deleteDebitNote,
    getPendingApprovals
};
