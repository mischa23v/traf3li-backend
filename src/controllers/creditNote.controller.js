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
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');
const mongoose = require('mongoose');

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
    // SECURITY: IDOR Protection - Verify invoice exists and belongs to user's firm
    const invoice = await Invoice.findOne({
        _id: req.params.invoiceId,
        ...req.firmQuery
    });

    if (!invoice) {
        throw CustomException('Invoice not found', 404, {
            messageAr: 'لم يتم العثور على الفاتورة'
        });
    }

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
    // SECURITY: Mass assignment protection - only allow specific fields
    const allowedFields = ['invoiceId', 'creditType', 'reasonCategory', 'reason', 'reasonAr', 'items', 'notes', 'notesAr'];
    const safeData = pickAllowedFields(req.body, allowedFields);

    // SECURITY: Sanitize and validate invoiceId
    const sanitizedInvoiceId = sanitizeObjectId(safeData.invoiceId);
    if (!sanitizedInvoiceId) {
        throw CustomException('Invalid invoice ID', 400, {
            messageAr: 'معرف الفاتورة غير صالح'
        });
    }

    // SECURITY: IDOR Protection - Verify invoice belongs to user's firm
    const invoice = await Invoice.findOne({
        _id: sanitizedInvoiceId,
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

    // SECURITY: Validate items array and amounts
    if (!Array.isArray(safeData.items) || safeData.items.length === 0) {
        throw CustomException('Credit note must have at least one item', 400, {
            messageAr: 'يجب أن يحتوي إشعار الدائن على عنصر واحد على الأقل'
        });
    }

    // SECURITY: Validate each item's amount is positive and reasonable
    for (const item of safeData.items) {
        if (!item.quantity || item.quantity <= 0) {
            throw CustomException('Item quantity must be positive', 400, {
                messageAr: 'يجب أن تكون كمية العنصر موجبة'
            });
        }
        if (!item.unitPrice || item.unitPrice < 0) {
            throw CustomException('Item unit price must be non-negative', 400, {
                messageAr: 'يجب أن يكون سعر الوحدة غير سالب'
            });
        }
        // Prevent manipulation - validate reasonable limits
        if (item.unitPrice > 999999999) {
            throw CustomException('Item unit price exceeds maximum allowed', 400, {
                messageAr: 'سعر الوحدة يتجاوز الحد الأقصى المسموح'
            });
        }
    }

    // Use MongoDB transaction for data consistency
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // Generate credit note number
        const creditNoteNumber = await CreditNote.generateNumber(req.firmId, req.firmId ? null : req.userID);

        // Create credit note with sanitized data
        const creditNote = new CreditNote({
            firmId: req.firmId,
            lawyerId: req.firmId ? null : req.userID,
            creditNoteNumber,
            invoiceId: sanitizedInvoiceId,
            invoiceNumber: invoice.invoiceNumber,
            clientId: invoice.clientId._id,
            clientName: invoice.clientId.companyName ||
                `${invoice.clientId.firstName} ${invoice.clientId.lastName}`,
            clientNameAr: invoice.clientId.companyNameAr ||
                invoice.clientId.fullNameArabic,
            clientVatNumber: invoice.clientId.vatNumber,
            creditType: safeData.creditType,
            reasonCategory: safeData.reasonCategory,
            reason: safeData.reason,
            reasonAr: safeData.reasonAr,
            items: safeData.items,
            notes: safeData.notes,
            notesAr: safeData.notesAr,
            createdBy: req.userID,
            history: [{
                action: 'created',
                performedBy: req.userID,
                details: { reasonCategory: safeData.reasonCategory, reason: safeData.reason }
            }]
        });

        // Calculate totals
        creditNote.calculateTotals();

        // SECURITY: Validate total doesn't exceed invoice balance
        const invoiceBalance = invoice.balanceDue || invoice.totalAmount;
        if (creditNote.total > invoiceBalance) {
            throw CustomException(
                `Credit note total (${creditNote.total}) cannot exceed invoice balance (${invoiceBalance})`,
                400,
                { messageAr: 'لا يمكن أن يتجاوز إجمالي إشعار الدائن رصيد الفاتورة' }
            );
        }

        // SECURITY: Additional validation - total must be positive
        if (creditNote.total <= 0) {
            throw CustomException('Credit note total must be positive', 400, {
                messageAr: 'يجب أن يكون إجمالي إشعار الدائن موجباً'
            });
        }

        await creditNote.save({ session });
        await session.commitTransaction();

        res.status(201).json({
            success: true,
            data: creditNote,
            message: 'Credit note created successfully',
            messageAr: 'تم إنشاء إشعار الدائن بنجاح'
        });
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
});

/**
 * Update credit note
 */
const updateCreditNote = asyncHandler(async (req, res) => {
    // SECURITY: IDOR Protection - Verify credit note belongs to user's firm
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

    // SECURITY: Mass assignment protection - only allow specific fields
    const allowedFields = ['reasonCategory', 'reason', 'reasonAr', 'items', 'notes', 'notesAr'];
    const safeData = pickAllowedFields(req.body, allowedFields);

    // SECURITY: Validate items if provided
    if (safeData.items) {
        if (!Array.isArray(safeData.items) || safeData.items.length === 0) {
            throw CustomException('Credit note must have at least one item', 400, {
                messageAr: 'يجب أن يحتوي إشعار الدائن على عنصر واحد على الأقل'
            });
        }

        // SECURITY: Validate each item's amount
        for (const item of safeData.items) {
            if (!item.quantity || item.quantity <= 0) {
                throw CustomException('Item quantity must be positive', 400, {
                    messageAr: 'يجب أن تكون كمية العنصر موجبة'
                });
            }
            if (!item.unitPrice || item.unitPrice < 0) {
                throw CustomException('Item unit price must be non-negative', 400, {
                    messageAr: 'يجب أن يكون سعر الوحدة غير سالب'
                });
            }
            // Prevent manipulation - validate reasonable limits
            if (item.unitPrice > 999999999) {
                throw CustomException('Item unit price exceeds maximum allowed', 400, {
                    messageAr: 'سعر الوحدة يتجاوز الحد الأقصى المسموح'
                });
            }
        }
    }

    // Apply updates using sanitized data
    if (safeData.reasonCategory) creditNote.reasonCategory = safeData.reasonCategory;
    if (safeData.reason !== undefined) creditNote.reason = safeData.reason;
    if (safeData.reasonAr !== undefined) creditNote.reasonAr = safeData.reasonAr;
    if (safeData.items) creditNote.items = safeData.items;
    if (safeData.notes !== undefined) creditNote.notes = safeData.notes;
    if (safeData.notesAr !== undefined) creditNote.notesAr = safeData.notesAr;

    creditNote.calculateTotals();

    // SECURITY: Validate invoice reference still exists and belongs to firm
    const invoice = await Invoice.findOne({
        _id: creditNote.invoiceId,
        ...req.firmQuery
    });

    if (!invoice) {
        throw CustomException('Linked invoice not found or access denied', 404, {
            messageAr: 'لم يتم العثور على الفاتورة المرتبطة أو تم رفض الوصول'
        });
    }

    // SECURITY: Validate total doesn't exceed invoice balance
    const invoiceBalance = invoice.balanceDue || invoice.totalAmount;
    if (creditNote.total > invoiceBalance) {
        throw CustomException(
            `Credit note total (${creditNote.total}) cannot exceed invoice balance (${invoiceBalance})`,
            400,
            { messageAr: 'لا يمكن أن يتجاوز إجمالي إشعار الدائن رصيد الفاتورة' }
        );
    }

    // SECURITY: Validate total is positive
    if (creditNote.total <= 0) {
        throw CustomException('Credit note total must be positive', 400, {
            messageAr: 'يجب أن يكون إجمالي إشعار الدائن موجباً'
        });
    }

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
    // SECURITY: IDOR Protection - Verify credit note belongs to user's firm
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

    // SECURITY: Validate invoice reference and ownership before issuing
    const invoice = await Invoice.findOne({
        _id: creditNote.invoiceId,
        ...req.firmQuery
    });

    if (!invoice) {
        throw CustomException('Linked invoice not found or access denied', 404, {
            messageAr: 'لم يتم العثور على الفاتورة المرتبطة أو تم رفض الوصول'
        });
    }

    // SECURITY: Validate amounts one more time before issuing
    if (creditNote.total <= 0) {
        throw CustomException('Credit note total must be positive', 400, {
            messageAr: 'يجب أن يكون إجمالي إشعار الدائن موجباً'
        });
    }

    const invoiceBalance = invoice.balanceDue || invoice.totalAmount;
    if (creditNote.total > invoiceBalance) {
        throw CustomException(
            `Credit note total (${creditNote.total}) cannot exceed invoice balance (${invoiceBalance})`,
            400,
            { messageAr: 'لا يمكن أن يتجاوز إجمالي إشعار الدائن رصيد الفاتورة' }
        );
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
    // SECURITY: IDOR Protection - Verify credit note belongs to user's firm
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

    // SECURITY: Validate invoice reference and ownership before applying
    const invoice = await Invoice.findOne({
        _id: creditNote.invoiceId,
        ...req.firmQuery
    });

    if (!invoice) {
        throw CustomException('Linked invoice not found or access denied', 404, {
            messageAr: 'لم يتم العثور على الفاتورة المرتبطة أو تم رفض الوصول'
        });
    }

    // SECURITY: Verify client belongs to firm
    const client = await Client.findOne({
        _id: creditNote.clientId,
        ...req.firmQuery
    });

    if (!client) {
        throw CustomException('Client not found or access denied', 404, {
            messageAr: 'لم يتم العثور على العميل أو تم رفض الوصول'
        });
    }

    // SECURITY: Use MongoDB transaction for financial updates
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // Apply credit note
        await creditNote.apply(req.userID, session);

        // SECURITY: Validate amount before updating client balance
        if (creditNote.total <= 0) {
            throw CustomException('Invalid credit note amount', 400, {
                messageAr: 'مبلغ إشعار الدائن غير صالح'
            });
        }

        // Update client credit balance within transaction
        await Client.findOneAndUpdate(
            { _id: creditNote.clientId, ...req.firmQuery },
            {
                $inc: { 'billing.creditBalance': creditNote.total }
            },
            { session }
        );

        await session.commitTransaction();

        res.json({
            success: true,
            data: creditNote,
            message: 'Credit note applied to invoice',
            messageAr: 'تم تطبيق إشعار الدائن على الفاتورة'
        });
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
});

/**
 * Void credit note
 */
const voidCreditNote = asyncHandler(async (req, res) => {
    // SECURITY: Mass assignment protection
    const allowedFields = ['reason'];
    const safeData = pickAllowedFields(req.body, allowedFields);

    if (!safeData.reason || typeof safeData.reason !== 'string' || safeData.reason.trim() === '') {
        throw CustomException('Void reason is required', 400, {
            messageAr: 'سبب الإلغاء مطلوب'
        });
    }

    // SECURITY: IDOR Protection - Verify credit note belongs to user's firm
    const creditNote = await CreditNote.findOne({
        _id: req.params.id,
        ...req.firmQuery
    });

    if (!creditNote) {
        throw CustomException('Credit note not found', 404, {
            messageAr: 'لم يتم العثور على إشعار الدائن'
        });
    }

    // SECURITY: Validate invoice reference still exists and belongs to firm
    const invoice = await Invoice.findOne({
        _id: creditNote.invoiceId,
        ...req.firmQuery
    });

    if (!invoice) {
        throw CustomException('Linked invoice not found or access denied', 404, {
            messageAr: 'لم يتم العثور على الفاتورة المرتبطة أو تم رفض الوصول'
        });
    }

    await creditNote.void(safeData.reason, req.userID);

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
