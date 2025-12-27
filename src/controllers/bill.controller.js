const { Bill, Vendor, Case, BillingActivity } = require('../models');
const { CustomException } = require('../utils');
const asyncHandler = require('../utils/asyncHandler');
const { pickAllowedFields } = require('../utils/securityUtils');

// Create bill
const createBill = asyncHandler(async (req, res) => {
    const {
        vendorId,
        items,
        billDate,
        dueDate,
        taxRate,
        discountType,
        discountValue,
        caseId,
        categoryId,
        notes,
        internalNotes,
        reference,
        isRecurring,
        recurringConfig
    } = req.body;

    const lawyerId = req.userID;

    if (!vendorId) {
        throw CustomException('Vendor is required', 400);
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
        throw CustomException('At least one item is required', 400);
    }

    if (!billDate) {
        throw CustomException('Bill date is required', 400);
    }

    if (!dueDate) {
        throw CustomException('Due date is required', 400);
    }

    // Validate vendor exists and belongs to user
    const vendor = await Vendor.findById(vendorId);
    if (!vendor || vendor.lawyerId.toString() !== lawyerId) {
        throw CustomException('Vendor not found or access denied', 404);
    }

    // Validate case if provided
    if (caseId) {
        const caseDoc = await Case.findById(caseId);
        if (!caseDoc || caseDoc.lawyerId.toString() !== lawyerId) {
            throw CustomException('Case not found or access denied', 404);
        }
    }

    const bill = await Bill.create({
        vendorId,
        items,
        billDate: new Date(billDate),
        dueDate: new Date(dueDate),
        taxRate: taxRate !== undefined ? taxRate : 0.15,
        discountType,
        discountValue: discountValue || 0,
        caseId,
        categoryId,
        notes,
        internalNotes,
        reference,
        isRecurring: isRecurring || false,
        recurringConfig: isRecurring ? recurringConfig : undefined,
        status: 'draft',
        lawyerId,
        history: [{ action: 'created', performedBy: lawyerId, performedAt: new Date() }]
    });

    const populatedBill = await Bill.findById(bill._id)
        .populate('vendorId', 'name vendorId email')
        .populate('caseId', 'title caseNumber');

    await BillingActivity.logActivity({
        activityType: 'bill_created',
        userId: lawyerId,
        relatedModel: 'Bill',
        relatedId: bill._id,
        description: `Bill ${bill.billNumber} created for ${bill.totalAmount} ${vendor.currency || 'SAR'}`,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
    });

    return res.status(201).json({
        success: true,
        message: 'Bill created successfully',
        bill: populatedBill
    });
});

// Get all bills
const getBills = asyncHandler(async (req, res) => {
    const {
        status,
        vendorId,
        caseId,
        categoryId,
        startDate,
        endDate,
        overdue,
        search,
        page = 1,
        limit = 20
    } = req.query;

    const lawyerId = req.userID;
    const filters = { lawyerId };

    if (status) filters.status = status;
    if (vendorId) filters.vendorId = vendorId;
    if (caseId) filters.caseId = caseId;
    if (categoryId) filters.categoryId = categoryId;

    if (startDate || endDate) {
        filters.billDate = {};
        if (startDate) filters.billDate.$gte = new Date(startDate);
        if (endDate) filters.billDate.$lte = new Date(endDate);
    }

    if (overdue === 'true') {
        filters.status = { $in: ['pending', 'partial'] };
        filters.dueDate = { $lt: new Date() };
    }

    if (search) {
        filters.$or = [
            { billNumber: { $regex: search, $options: 'i' } },
            { reference: { $regex: search, $options: 'i' } }
        ];
    }

    const bills = await Bill.find(filters)
        .populate('vendorId', 'name vendorId email')
        .populate('caseId', 'title caseNumber')
        .sort({ billDate: -1, createdAt: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit))
        .lean();

    const total = await Bill.countDocuments(filters);

    return res.json({
        success: true,
        bills,
        total
    });
});

// Get single bill
const getBill = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;

    const bill = await Bill.findById(id)
        .populate('vendorId', 'name vendorId email phone address')
        .populate('caseId', 'title caseNumber')
        .populate('history.performedBy', 'firstName lastName');

    if (!bill) {
        throw CustomException('Bill not found', 404);
    }

    if (bill.lawyerId.toString() !== lawyerId) {
        throw CustomException('You do not have access to this bill', 403);
    }

    return res.json({
        success: true,
        bill
    });
});

// Update bill
const updateBill = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;

    const bill = await Bill.findById(id);

    if (!bill) {
        throw CustomException('Bill not found', 404);
    }

    // IDOR Protection: Verify bill belongs to user's firm
    if (bill.lawyerId.toString() !== lawyerId) {
        throw CustomException('You do not have access to this bill', 403);
    }

    if (bill.status === 'paid') {
        throw CustomException('Cannot edit a paid bill', 400);
    }

    if (bill.status === 'cancelled') {
        throw CustomException('Cannot edit a cancelled bill', 400);
    }

    // Mass Assignment Protection: Only allow safe fields to be updated
    const allowedFields = [
        'vendorId',
        'items',
        'billDate',
        'dueDate',
        'taxRate',
        'discountType',
        'discountValue',
        'caseId',
        'categoryId',
        'notes',
        'internalNotes',
        'reference',
        'status'
    ];

    const safeUpdateData = pickAllowedFields(req.body, allowedFields);

    // Validate amounts if provided
    if (safeUpdateData.taxRate !== undefined && (typeof safeUpdateData.taxRate !== 'number' || safeUpdateData.taxRate < 0 || safeUpdateData.taxRate > 1)) {
        throw CustomException('Tax rate must be a number between 0 and 1', 400);
    }

    if (safeUpdateData.discountValue !== undefined && (typeof safeUpdateData.discountValue !== 'number' || safeUpdateData.discountValue < 0)) {
        throw CustomException('Discount value must be a positive number', 400);
    }

    if (safeUpdateData.items && Array.isArray(safeUpdateData.items)) {
        for (const item of safeUpdateData.items) {
            if (typeof item.amount !== 'number' || item.amount <= 0) {
                throw CustomException('Item amounts must be positive numbers', 400);
            }
        }
    }

    // Add to history - use $set for fields and $push for history
    const updateData = {
        $set: safeUpdateData,
        $push: {
            history: { action: 'updated', performedBy: lawyerId, performedAt: new Date(), details: safeUpdateData }
        }
    };

    const updatedBill = await Bill.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
    )
        .populate('vendorId', 'name vendorId email')
        .populate('caseId', 'title caseNumber');

    return res.json({
        success: true,
        message: 'Bill updated successfully',
        bill: updatedBill
    });
});

// Delete bill
const deleteBill = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;

    const bill = await Bill.findById(id);

    if (!bill) {
        throw CustomException('Bill not found', 404);
    }

    if (bill.lawyerId.toString() !== lawyerId) {
        throw CustomException('You do not have access to this bill', 403);
    }

    if (bill.amountPaid > 0) {
        throw CustomException('Cannot delete a bill with payments. Cancel it instead.', 400);
    }

    await Bill.findByIdAndDelete(id);

    return res.json({
        success: true,
        message: 'Bill deleted successfully'
    });
});

// Mark bill as received
const receiveBill = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;

    const bill = await Bill.findById(id);

    if (!bill) {
        throw CustomException('Bill not found', 404);
    }

    if (bill.lawyerId.toString() !== lawyerId) {
        throw CustomException('You do not have access to this bill', 403);
    }

    if (bill.status !== 'draft') {
        throw CustomException('Only draft bills can be marked as received', 400);
    }

    bill.status = 'received';
    bill.history.push({ action: 'received', performedBy: lawyerId, performedAt: new Date() });
    await bill.save();

    return res.json({
        success: true,
        message: 'Bill marked as received',
        bill
    });
});

// Cancel bill
const cancelBill = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;
    const lawyerId = req.userID;

    const bill = await Bill.findById(id);

    if (!bill) {
        throw CustomException('Bill not found', 404);
    }

    if (bill.lawyerId.toString() !== lawyerId) {
        throw CustomException('You do not have access to this bill', 403);
    }

    if (bill.status === 'cancelled') {
        throw CustomException('Bill is already cancelled', 400);
    }

    if (bill.status === 'paid') {
        throw CustomException('Cannot cancel a paid bill', 400);
    }

    bill.status = 'cancelled';
    bill.history.push({
        action: 'cancelled',
        performedBy: lawyerId,
        performedAt: new Date(),
        details: { reason }
    });
    await bill.save();

    return res.json({
        success: true,
        message: 'Bill cancelled',
        bill
    });
});

// Upload attachment
const uploadAttachment = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { fileName, fileUrl, fileType, fileSize } = req.body;
    const lawyerId = req.userID;

    const bill = await Bill.findById(id);

    if (!bill) {
        throw CustomException('Bill not found', 404);
    }

    if (bill.lawyerId.toString() !== lawyerId) {
        throw CustomException('You do not have access to this bill', 403);
    }

    if (!fileUrl) {
        throw CustomException('File URL is required', 400);
    }

    const attachment = {
        fileName: fileName || 'attachment',
        fileUrl,
        fileType,
        fileSize,
        uploadedAt: new Date()
    };

    bill.attachments.push(attachment);
    bill.history.push({
        action: 'attachment_added',
        performedBy: lawyerId,
        performedAt: new Date(),
        details: { fileName }
    });
    await bill.save();

    return res.json({
        success: true,
        message: 'Attachment uploaded',
        attachment
    });
});

// Delete attachment
const deleteAttachment = asyncHandler(async (req, res) => {
    const { id, attachmentId } = req.params;
    const lawyerId = req.userID;

    const bill = await Bill.findById(id);

    if (!bill) {
        throw CustomException('Bill not found', 404);
    }

    if (bill.lawyerId.toString() !== lawyerId) {
        throw CustomException('You do not have access to this bill', 403);
    }

    const attachmentIndex = bill.attachments.findIndex(
        a => a._id.toString() === attachmentId
    );

    if (attachmentIndex === -1) {
        throw CustomException('Attachment not found', 404);
    }

    const removedAttachment = bill.attachments[attachmentIndex];
    bill.attachments.splice(attachmentIndex, 1);
    bill.history.push({
        action: 'attachment_removed',
        performedBy: lawyerId,
        performedAt: new Date(),
        details: { fileName: removedAttachment.fileName }
    });
    await bill.save();

    return res.json({
        success: true,
        message: 'Attachment deleted'
    });
});

// Duplicate bill
const duplicateBill = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;

    const originalBill = await Bill.findById(id);

    if (!originalBill) {
        throw CustomException('Bill not found', 404);
    }

    if (originalBill.lawyerId.toString() !== lawyerId) {
        throw CustomException('You do not have access to this bill', 403);
    }

    const newBill = new Bill({
        vendorId: originalBill.vendorId,
        items: originalBill.items,
        taxRate: originalBill.taxRate,
        discountType: originalBill.discountType,
        discountValue: originalBill.discountValue,
        currency: originalBill.currency,
        billDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        status: 'draft',
        caseId: originalBill.caseId,
        categoryId: originalBill.categoryId,
        notes: originalBill.notes,
        lawyerId,
        history: [{
            action: 'created',
            performedBy: lawyerId,
            performedAt: new Date(),
            details: { duplicatedFrom: originalBill._id }
        }]
    });

    await newBill.save();

    const populatedBill = await Bill.findById(newBill._id)
        .populate('vendorId', 'name vendorId email')
        .populate('caseId', 'title caseNumber');

    return res.status(201).json({
        success: true,
        message: 'Bill duplicated successfully',
        bill: populatedBill
    });
});

// Get overdue bills
const getOverdueBills = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;

    const bills = await Bill.getOverdueBills(lawyerId);

    return res.json({
        success: true,
        bills
    });
});

// Get bills summary
const getSummary = asyncHandler(async (req, res) => {
    const { startDate, endDate, vendorId } = req.query;
    const lawyerId = req.userID;

    const summary = await Bill.getBillsSummary(lawyerId, { startDate, endDate, vendorId });

    return res.json({
        success: true,
        summary
    });
});

// Get recurring bills
const getRecurringBills = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;

    const bills = await Bill.find({
        lawyerId,
        isRecurring: true,
        'recurringConfig.isActive': true
    })
        .populate('vendorId', 'name vendorId')
        .sort({ 'recurringConfig.nextBillDate': 1 });

    return res.json({
        success: true,
        bills
    });
});

// Stop recurring bill
const stopRecurring = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;

    const bill = await Bill.findById(id);

    if (!bill) {
        throw CustomException('Bill not found', 404);
    }

    if (bill.lawyerId.toString() !== lawyerId) {
        throw CustomException('You do not have access to this bill', 403);
    }

    if (!bill.isRecurring) {
        throw CustomException('Bill is not recurring', 400);
    }

    bill.recurringConfig.isActive = false;
    await bill.save();

    return res.json({
        success: true,
        message: 'Recurring bill stopped',
        bill
    });
});

// Generate next recurring bill
const generateNextBill = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;

    const bill = await Bill.findById(id);

    if (!bill) {
        throw CustomException('Bill not found', 404);
    }

    if (bill.lawyerId.toString() !== lawyerId) {
        throw CustomException('You do not have access to this bill', 403);
    }

    try {
        const newBill = await Bill.generateRecurringBill(id);

        const populatedBill = await Bill.findById(newBill._id)
            .populate('vendorId', 'name vendorId email');

        return res.status(201).json({
            success: true,
            message: 'Next bill generated',
            bill: populatedBill
        });
    } catch (error) {
        throw CustomException(error.message, 400);
    }
});

// Get aging report
const getAgingReport = asyncHandler(async (req, res) => {
    const { vendorId } = req.query;
    const lawyerId = req.userID;

    const report = await Bill.getAgingReport(lawyerId, vendorId);

    return res.json({
        success: true,
        report
    });
});

// Export bills
const exportBills = asyncHandler(async (req, res) => {
    const { format = 'csv', ...filters } = req.query;
    const lawyerId = req.userID;

    const queryFilters = { lawyerId };
    if (filters.status) queryFilters.status = filters.status;
    if (filters.vendorId) queryFilters.vendorId = filters.vendorId;
    if (filters.startDate || filters.endDate) {
        queryFilters.billDate = {};
        if (filters.startDate) queryFilters.billDate.$gte = new Date(filters.startDate);
        if (filters.endDate) queryFilters.billDate.$lte = new Date(filters.endDate);
    }

    const bills = await Bill.find(queryFilters)
        .populate('vendorId', 'name vendorId')
        .sort({ billDate: -1 });

    if (format === 'csv') {
        // SECURITY: Import sanitization function to prevent CSV injection
        const { sanitizeForCSV } = require('../utils/securityUtils');

        const headers = ['Bill Number', 'Vendor', 'Bill Date', 'Due Date', 'Total', 'Paid', 'Balance', 'Status'];
        const rows = bills.map(b => [
            sanitizeForCSV(b.billNumber),
            sanitizeForCSV(b.vendorId?.name || ''),
            sanitizeForCSV(b.billDate.toISOString().split('T')[0]),
            sanitizeForCSV(b.dueDate.toISOString().split('T')[0]),
            sanitizeForCSV(b.totalAmount),
            sanitizeForCSV(b.amountPaid),
            sanitizeForCSV(b.balanceDue),
            sanitizeForCSV(b.status)
        ]);

        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="bills-export-${Date.now()}.csv"`);
        return res.send(csv);
    }

    // For other formats, return JSON for now
    return res.json({
        success: true,
        bills,
        message: 'Export format not fully implemented, returning JSON'
    });
});

// Approve bill
const approveBill = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;
    const { notes } = req.body;

    const bill = await Bill.findById(id);
    if (!bill) {
        throw CustomException('Bill not found', 404);
    }

    if (bill.lawyerId.toString() !== lawyerId) {
        throw CustomException('Access denied', 403);
    }

    if (bill.status !== 'pending_approval' && bill.status !== 'draft') {
        throw CustomException(`Cannot approve bill with status: ${bill.status}`, 400);
    }

    bill.status = 'approved';
    bill.approvedBy = lawyerId;
    bill.approvedAt = new Date();
    bill.history.push({
        action: 'approved',
        performedBy: lawyerId,
        performedAt: new Date(),
        notes
    });

    await bill.save();

    const populatedBill = await Bill.findById(bill._id)
        .populate('vendorId', 'name vendorId email')
        .populate('caseId', 'title caseNumber');

    await BillingActivity.logActivity({
        activityType: 'bill_approved',
        userId: lawyerId,
        relatedModel: 'Bill',
        relatedId: bill._id,
        description: `Bill ${bill.billNumber} approved`,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
    });

    return res.json({
        success: true,
        message: 'Bill approved successfully',
        messageAr: 'تمت الموافقة على الفاتورة بنجاح',
        bill: populatedBill
    });
});

// Pay bill (record payment)
const payBill = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;
    const {
        amount,
        paymentMethod,
        paymentDate,
        reference,
        notes,
        bankAccountId
    } = req.body;

    const bill = await Bill.findById(id);
    if (!bill) {
        throw CustomException('Bill not found', 404);
    }

    // IDOR Protection: Verify bill belongs to current user
    if (bill.lawyerId.toString() !== lawyerId) {
        throw CustomException('Access denied', 403);
    }

    if (bill.status === 'paid' || bill.status === 'cancelled' || bill.status === 'void') {
        throw CustomException(`Cannot pay bill with status: ${bill.status}`, 400);
    }

    const paymentAmount = amount || bill.balanceDue;

    // Validation: Payment amount must be a positive number
    if (typeof paymentAmount !== 'number' || paymentAmount <= 0) {
        throw CustomException('Payment amount must be a positive number greater than 0', 400);
    }

    // Validation: Payment amount cannot exceed balance due
    if (paymentAmount > bill.balanceDue) {
        throw CustomException(`Payment amount (${paymentAmount}) exceeds balance due (${bill.balanceDue})`, 400);
    }

    // Validation: Ensure no NaN or infinite values
    if (!isFinite(paymentAmount)) {
        throw CustomException('Invalid payment amount', 400);
    }

    // Transaction Protection: Start session for atomic operations
    const session = await Bill.startSession();
    session.startTransaction();

    try {
        // Re-fetch bill with lock to prevent race conditions
        const lockedBill = await Bill.findById(id).session(session);

        if (!lockedBill) {
            throw CustomException('Bill not found', 404);
        }

        // Verify bill still belongs to user (double-check within transaction)
        if (lockedBill.lawyerId.toString() !== lawyerId) {
            throw CustomException('Access denied', 403);
        }

        // Verify bill status hasn't changed
        if (lockedBill.status === 'paid' || lockedBill.status === 'cancelled' || lockedBill.status === 'void') {
            throw CustomException(`Cannot pay bill with status: ${lockedBill.status}`, 400);
        }

        // Verify amount hasn't changed significantly (prevent double payment)
        if (paymentAmount > lockedBill.balanceDue) {
            throw CustomException(`Payment amount (${paymentAmount}) exceeds current balance due (${lockedBill.balanceDue})`, 400);
        }

        // Record the payment (only safe fields)
        const payment = {
            amount: paymentAmount,
            paymentMethod: paymentMethod || 'bank_transfer',
            paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
            reference,
            notes,
            bankAccountId,
            recordedBy: lawyerId,
            recordedAt: new Date()
        };

        if (!lockedBill.payments) {
            lockedBill.payments = [];
        }
        lockedBill.payments.push(payment);

        // Update totals
        lockedBill.paidAmount = (lockedBill.paidAmount || 0) + paymentAmount;
        lockedBill.balanceDue = lockedBill.totalAmount - lockedBill.paidAmount;

        // Validate calculated amounts are positive
        if (!isFinite(lockedBill.paidAmount) || !isFinite(lockedBill.balanceDue)) {
            throw CustomException('Invalid payment calculation', 400);
        }

        // Update status
        if (lockedBill.balanceDue <= 0) {
            lockedBill.status = 'paid';
            lockedBill.paidAt = new Date();
        } else {
            lockedBill.status = 'partial';
        }

        lockedBill.history.push({
            action: 'payment_recorded',
            performedBy: lawyerId,
            performedAt: new Date(),
            notes: `Payment of ${paymentAmount} recorded. Balance due: ${lockedBill.balanceDue}`
        });

        await lockedBill.save({ session });

        // Log activity within transaction
        await BillingActivity.logActivity({
            activityType: 'bill_payment',
            userId: lawyerId,
            relatedModel: 'Bill',
            relatedId: lockedBill._id,
            description: `Payment of ${paymentAmount} recorded for bill ${lockedBill.billNumber}`,
            ipAddress: req.ip,
            userAgent: req.get('user-agent')
        });

        await session.commitTransaction();

        const populatedBill = await Bill.findById(lockedBill._id)
            .populate('vendorId', 'name vendorId email')
            .populate('caseId', 'title caseNumber');

        return res.json({
            success: true,
            message: 'Payment recorded successfully',
            messageAr: 'تم تسجيل الدفع بنجاح',
            bill: populatedBill
        });
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        await session.endSession();
    }
});

// Post bill to General Ledger
const postToGL = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;
    const { journalDate, notes } = req.body;

    const bill = await Bill.findById(id);
    if (!bill) {
        throw CustomException('Bill not found', 404);
    }

    if (bill.lawyerId.toString() !== lawyerId) {
        throw CustomException('Access denied', 403);
    }

    if (bill.postedToGL) {
        throw CustomException('Bill has already been posted to GL', 400);
    }

    if (bill.status === 'draft' || bill.status === 'cancelled' || bill.status === 'void') {
        throw CustomException(`Cannot post bill with status: ${bill.status} to GL`, 400);
    }

    // Mark as posted to GL
    bill.postedToGL = true;
    bill.postedToGLAt = journalDate ? new Date(journalDate) : new Date();
    bill.postedToGLBy = lawyerId;

    bill.history.push({
        action: 'posted_to_gl',
        performedBy: lawyerId,
        performedAt: new Date(),
        notes: notes || 'Posted to General Ledger'
    });

    await bill.save();

    const populatedBill = await Bill.findById(bill._id)
        .populate('vendorId', 'name vendorId email')
        .populate('caseId', 'title caseNumber');

    await BillingActivity.logActivity({
        activityType: 'bill_posted_gl',
        userId: lawyerId,
        relatedModel: 'Bill',
        relatedId: bill._id,
        description: `Bill ${bill.billNumber} posted to General Ledger`,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
    });

    return res.json({
        success: true,
        message: 'Bill posted to General Ledger successfully',
        messageAr: 'تم ترحيل الفاتورة إلى دفتر الأستاذ العام بنجاح',
        bill: populatedBill
    });
});

module.exports = {
    createBill,
    getBills,
    getBill,
    updateBill,
    deleteBill,
    receiveBill,
    cancelBill,
    uploadAttachment,
    deleteAttachment,
    duplicateBill,
    getOverdueBills,
    getSummary,
    getRecurringBills,
    stopRecurring,
    generateNextBill,
    getAgingReport,
    exportBills,
    approveBill,
    payBill,
    postToGL
};
