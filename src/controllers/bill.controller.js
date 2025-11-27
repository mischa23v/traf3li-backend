const { Bill, Vendor, Case, BillingActivity } = require('../models');
const { CustomException } = require('../utils');
const asyncHandler = require('../utils/asyncHandler');

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
        .skip((parseInt(page) - 1) * parseInt(limit));

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

    if (bill.lawyerId.toString() !== lawyerId) {
        throw CustomException('You do not have access to this bill', 403);
    }

    if (bill.status === 'paid') {
        throw CustomException('Cannot edit a paid bill', 400);
    }

    if (bill.status === 'cancelled') {
        throw CustomException('Cannot edit a cancelled bill', 400);
    }

    // Add to history
    const updateData = { ...req.body };
    updateData.$push = {
        history: { action: 'updated', performedBy: lawyerId, performedAt: new Date(), details: req.body }
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
        const headers = ['Bill Number', 'Vendor', 'Bill Date', 'Due Date', 'Total', 'Paid', 'Balance', 'Status'];
        const rows = bills.map(b => [
            b.billNumber,
            b.vendorId?.name || '',
            b.billDate.toISOString().split('T')[0],
            b.dueDate.toISOString().split('T')[0],
            b.totalAmount,
            b.amountPaid,
            b.balanceDue,
            b.status
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
    exportBills
};
