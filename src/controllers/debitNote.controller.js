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
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');
const mongoose = require('mongoose');

/**
 * Get all debit notes
 */
const getDebitNotes = asyncHandler(async (req, res) => {
    const { status, vendorId, billId, startDate, endDate, page = 1, limit = 20 } = req.query;

    const query = { ...req.firmQuery };
    if (status) query.status = status;
    if (vendorId) query.vendorId = sanitizeObjectId(vendorId);
    if (billId) query.billId = sanitizeObjectId(billId);
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
    // Sanitize ID and IDOR protection
    const sanitizedId = sanitizeObjectId(req.params.id);

    const debitNote = await DebitNote.findOne({
        _id: sanitizedId,
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
    // Sanitize billId and IDOR protection
    const sanitizedBillId = sanitizeObjectId(req.params.billId);

    const debitNotes = await DebitNote.find({
        billId: sanitizedBillId,
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
    // Mass assignment protection
    const allowedFields = pickAllowedFields(req.body, [
        'billId',
        'reasonType',
        'reason',
        'reasonAr',
        'items',
        'isPartial',
        'notes',
        'notesAr'
    ]);

    const { billId, reasonType, reason, reasonAr, items, isPartial, notes, notesAr } = allowedFields;

    // Input validation for amounts
    if (items && Array.isArray(items)) {
        for (const item of items) {
            if (item.quantity != null && (typeof item.quantity !== 'number' || item.quantity < 0 || !Number.isFinite(item.quantity))) {
                throw CustomException('Invalid quantity in items', 400, {
                    messageAr: 'كمية غير صالحة في العناصر'
                });
            }
            if (item.unitPrice != null && (typeof item.unitPrice !== 'number' || item.unitPrice < 0 || !Number.isFinite(item.unitPrice))) {
                throw CustomException('Invalid unit price in items', 400, {
                    messageAr: 'سعر الوحدة غير صالح في العناصر'
                });
            }
            if (item.vatRate != null && (typeof item.vatRate !== 'number' || item.vatRate < 0 || item.vatRate > 100 || !Number.isFinite(item.vatRate))) {
                throw CustomException('Invalid VAT rate in items', 400, {
                    messageAr: 'معدل ضريبة القيمة المضافة غير صالح في العناصر'
                });
            }
        }
    }

    // Sanitize billId
    const sanitizedBillId = sanitizeObjectId(billId);

    // IDOR protection - Get original bill with firmQuery
    const bill = await Bill.findOne({
        _id: sanitizedBillId,
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

    // Start MongoDB transaction for financial operation
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // Generate debit note number
        const debitNoteNumber = await DebitNote.generateNumber(req.firmId, req.firmId ? null : req.userID);

        // Create debit note
        const debitNote = new DebitNote({
            firmId: req.firmId,
            lawyerId: req.firmId ? null : req.userID,
            debitNoteNumber,
            billId: sanitizedBillId,
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

        await debitNote.save({ session });

        await session.commitTransaction();

        res.status(201).json({
            success: true,
            data: debitNote,
            message: 'Debit note created successfully',
            messageAr: 'تم إنشاء إشعار المدين بنجاح'
        });
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
});

/**
 * Update debit note
 */
const updateDebitNote = asyncHandler(async (req, res) => {
    // Sanitize ID
    const sanitizedId = sanitizeObjectId(req.params.id);

    // IDOR protection - verify firmId ownership
    const debitNote = await DebitNote.findOne({
        _id: sanitizedId,
        ...req.firmQuery,
        status: 'draft'
    });

    if (!debitNote) {
        throw CustomException('Debit note not found or cannot be edited', 404, {
            messageAr: 'لم يتم العثور على إشعار المدين أو لا يمكن تعديله'
        });
    }

    // Mass assignment protection
    const allowedFields = pickAllowedFields(req.body, [
        'reasonType',
        'reason',
        'reasonAr',
        'items',
        'isPartial',
        'notes',
        'notesAr'
    ]);

    const { reasonType, reason, reasonAr, items, isPartial, notes, notesAr } = allowedFields;

    // Input validation for amounts
    if (items && Array.isArray(items)) {
        for (const item of items) {
            if (item.quantity != null && (typeof item.quantity !== 'number' || item.quantity < 0 || !Number.isFinite(item.quantity))) {
                throw CustomException('Invalid quantity in items', 400, {
                    messageAr: 'كمية غير صالحة في العناصر'
                });
            }
            if (item.unitPrice != null && (typeof item.unitPrice !== 'number' || item.unitPrice < 0 || !Number.isFinite(item.unitPrice))) {
                throw CustomException('Invalid unit price in items', 400, {
                    messageAr: 'سعر الوحدة غير صالح في العناصر'
                });
            }
            if (item.vatRate != null && (typeof item.vatRate !== 'number' || item.vatRate < 0 || item.vatRate > 100 || !Number.isFinite(item.vatRate))) {
                throw CustomException('Invalid VAT rate in items', 400, {
                    messageAr: 'معدل ضريبة القيمة المضافة غير صالح في العناصر'
                });
            }
        }
    }

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
    // Sanitize ID and IDOR protection
    const sanitizedId = sanitizeObjectId(req.params.id);

    const debitNote = await DebitNote.findOne({
        _id: sanitizedId,
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
    // Mass assignment protection
    const allowedFields = pickAllowedFields(req.body, ['notes']);
    const { notes } = allowedFields;

    // Sanitize ID and IDOR protection
    const sanitizedId = sanitizeObjectId(req.params.id);

    const debitNote = await DebitNote.findOne({
        _id: sanitizedId,
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
    // Mass assignment protection
    const allowedFields = pickAllowedFields(req.body, ['reason']);
    const { reason } = allowedFields;

    if (!reason) {
        throw CustomException('Rejection reason is required', 400, {
            messageAr: 'سبب الرفض مطلوب'
        });
    }

    // Sanitize ID and IDOR protection
    const sanitizedId = sanitizeObjectId(req.params.id);

    const debitNote = await DebitNote.findOne({
        _id: sanitizedId,
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
    // Sanitize ID and IDOR protection
    const sanitizedId = sanitizeObjectId(req.params.id);

    const debitNote = await DebitNote.findOne({
        _id: sanitizedId,
        ...req.firmQuery,
        status: 'approved'
    });

    if (!debitNote) {
        throw CustomException('Debit note not found or cannot be applied', 404, {
            messageAr: 'لم يتم العثور على إشعار المدين أو لا يمكن تطبيقه'
        });
    }

    // Validate debit note total amount
    if (!Number.isFinite(debitNote.total) || debitNote.total < 0) {
        throw CustomException('Invalid debit note total amount', 400, {
            messageAr: 'مبلغ إشعار المدين غير صالح'
        });
    }

    // Start MongoDB transaction for financial operation
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // Apply debit note
        await debitNote.apply(req.userID);
        await debitNote.save({ session });

        // IDOR protection - Verify vendor belongs to the same firm
        const vendor = await Vendor.findOne({
            _id: debitNote.vendorId,
            ...req.firmQuery
        }).session(session);

        if (!vendor) {
            throw CustomException('Vendor not found or access denied', 404, {
                messageAr: 'لم يتم العثور على المورد أو تم رفض الوصول'
            });
        }

        // Update vendor balance
        await Vendor.findByIdAndUpdate(
            debitNote.vendorId,
            {
                $inc: { outstandingBalance: -debitNote.total }
            },
            { session }
        );

        await session.commitTransaction();

        res.json({
            success: true,
            data: debitNote,
            message: 'Debit note applied to bill',
            messageAr: 'تم تطبيق إشعار المدين على الفاتورة'
        });
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
});

/**
 * Cancel debit note
 */
const cancelDebitNote = asyncHandler(async (req, res) => {
    // Mass assignment protection
    const allowedFields = pickAllowedFields(req.body, ['reason']);
    const { reason } = allowedFields;

    if (!reason) {
        throw CustomException('Cancellation reason is required', 400, {
            messageAr: 'سبب الإلغاء مطلوب'
        });
    }

    // Sanitize ID and IDOR protection
    const sanitizedId = sanitizeObjectId(req.params.id);

    const debitNote = await DebitNote.findOne({
        _id: sanitizedId,
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
    // Sanitize ID and IDOR protection
    const sanitizedId = sanitizeObjectId(req.params.id);

    const debitNote = await DebitNote.findOne({
        _id: sanitizedId,
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
