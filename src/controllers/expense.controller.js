const { Expense, Case, Client, User, BillingActivity } = require('../models');
const { CustomException } = require('../utils');
const asyncHandler = require('../utils/asyncHandler');
const mongoose = require('mongoose');
const { pickAllowedFields } = require('../utils/securityUtils');

// ═══════════════════════════════════════════════════════════════
// HELPER: Validate expense amount
// ═══════════════════════════════════════════════════════════════
const validateExpenseAmount = (amount) => {
    if (amount === undefined || amount === null) {
        throw CustomException('Amount is required', 400);
    }

    const numAmount = Number(amount);

    if (isNaN(numAmount)) {
        throw CustomException('Amount must be a valid number', 400);
    }

    if (numAmount < 0.01) {
        throw CustomException('Amount must be at least 0.01', 400);
    }

    // Prevent unreasonably large amounts (e.g., 1 billion)
    if (numAmount > 999999999.99) {
        throw CustomException('Amount exceeds maximum allowed value', 400);
    }

    return numAmount;
};

// ═══════════════════════════════════════════════════════════════
// ALLOWED FIELDS FOR EXPENSE OPERATIONS
// ═══════════════════════════════════════════════════════════════
const EXPENSE_ALLOWED_FIELDS = ['description', 'amount', 'category', 'date', 'receiptUrl', 'caseId', 'clientId', 'notes'];

// ═══════════════════════════════════════════════════════════════
// CREATE EXPENSE
// POST /api/expenses
// ═══════════════════════════════════════════════════════════════
const createExpense = asyncHandler(async (req, res) => {
    const {
        // Basic info
        description,
        amount,
        taxAmount,
        category,
        date,
        paymentMethod,
        vendor,
        receiptNumber,
        currency,
        // Expense type
        expenseType,
        employeeId,
        // Billable
        isBillable,
        clientId,
        caseId,
        markupType,
        markupValue,
        // Tax
        taxRate,
        taxReclaimable,
        vendorTaxNumber,
        // Travel
        travelDetails,
        // Government reference
        governmentReference,
        // Organization
        departmentId,
        locationId,
        projectId,
        costCenterId,
        // Attachments
        receipt,
        attachments,
        // Notes
        notes,
        internalNotes,
        // Workflow
        submitForApproval
    } = req.body;

    const lawyerId = req.userID;
    const firmId = req.firmId;

    // Block departed users from financial operations
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول إلى المصروفات', 403);
    }

    // Validate required fields
    if (!description) {
        throw CustomException('Description is required', 400);
    }

    if (description.length < 10) {
        throw CustomException('Description must be at least 10 characters', 400);
    }

    // Validate amount with enhanced validation
    const validatedAmount = validateExpenseAmount(amount);

    if (!category) {
        throw CustomException('Category is required', 400);
    }

    if (!date) {
        throw CustomException('Date is required', 400);
    }

    // Date cannot be in the future
    const expenseDate = new Date(date);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (expenseDate > today) {
        throw CustomException('Expense date cannot be in the future', 400);
    }

    // Validate conditional fields
    if (isBillable && !clientId) {
        throw CustomException('Client ID is required for billable expenses', 400);
    }

    if (taxReclaimable && vendorTaxNumber && !/^[0-9]{15}$/.test(vendorTaxNumber)) {
        throw CustomException('Vendor tax number must be exactly 15 digits', 400);
    }

    // Validate travel details if category is travel
    if (category === 'travel' && !travelDetails) {
        throw CustomException('Travel details are required for travel expenses', 400);
    }

    // If caseId provided, validate case exists and user has access
    if (caseId) {
        const caseDoc = await Case.findById(caseId);
        if (!caseDoc) {
            throw CustomException('Case not found', 404);
        }

        // Check access via firmId or lawyerId
        const isSoloLawyer = req.isSoloLawyer;
        const hasAccess = (isSoloLawyer || !firmId)
            ? caseDoc.lawyerId.toString() === lawyerId
            : caseDoc.firmId && caseDoc.firmId.toString() === firmId.toString();

        if (!hasAccess) {
            throw CustomException('You do not have access to this case', 403);
        }
    }

    // If clientId provided, validate client exists
    if (clientId) {
        const client = await Client.findById(clientId);
        if (!client) {
            throw CustomException('Client not found', 404);
        }
    }

    // Determine initial status
    let status = 'draft';
    let submittedBy = null;
    let submittedAt = null;

    if (submitForApproval) {
        status = 'pending_approval';
        submittedBy = lawyerId;
        submittedAt = new Date();
    }

    const expense = await Expense.create({
        // Basic info
        description,
        amount: validatedAmount,
        taxAmount: taxAmount || 0,
        category,
        date: expenseDate,
        paymentMethod: paymentMethod || 'cash',
        vendor,
        receiptNumber,
        currency: currency || 'SAR',
        // Expense type
        expenseType: expenseType || 'non_reimbursable',
        employeeId,
        // Billable
        isBillable: isBillable !== undefined ? isBillable : true,
        clientId,
        caseId,
        markupType: markupType || 'none',
        markupValue: markupValue || 0,
        // Tax
        taxRate: taxRate !== undefined ? taxRate : 15,
        taxReclaimable: taxReclaimable || false,
        vendorTaxNumber,
        // Travel
        travelDetails,
        // Government reference
        governmentReference,
        // Organization
        departmentId,
        locationId,
        projectId,
        costCenterId,
        firmId,
        lawyerId,
        // Attachments
        receipt,
        attachments: attachments || [],
        hasReceipt: !!receipt || (attachments && attachments.length > 0),
        // Notes
        notes,
        internalNotes,
        // Workflow
        status,
        submittedBy,
        submittedAt,
        // Audit
        createdBy: lawyerId
    });

    // Log activity
    await BillingActivity.logActivity({
        activityType: 'expense_created',
        userId: lawyerId,
        relatedModel: 'Expense',
        relatedId: expense._id,
        description: `Expense ${expense.expenseId} created for ${amount} SAR`,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
    });

    const populatedExpense = await Expense.findById(expense._id)
        .populate('caseId', 'title caseNumber')
        .populate('clientId', 'firstName lastName companyName')
        .populate('employeeId', 'firstName lastName')
        .populate('lawyerId', 'firstName lastName username email')
        .populate('departmentId', 'name')
        .populate('projectId', 'name');

    return res.status(201).json({
        success: true,
        message: 'Expense created successfully',
        expense: populatedExpense
    });
});

// ═══════════════════════════════════════════════════════════════
// GET ALL EXPENSES WITH FILTERS
// GET /api/expenses
// ═══════════════════════════════════════════════════════════════
const getExpenses = asyncHandler(async (req, res) => {
    const {
        status,
        category,
        caseId,
        clientId,
        employeeId,
        expenseType,
        isBillable,
        billingStatus,
        startDate,
        endDate,
        page = 1,
        limit = 20,
        sortBy = 'date',
        order = 'desc'
    } = req.query;

    const lawyerId = req.userID;
    const firmId = req.firmId;

    // Block departed users from financial operations
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول إلى المصروفات', 403);
    }

    // Build filters - solo lawyer or no firmId uses lawyerId
    const isSoloLawyer = req.isSoloLawyer;
    const filters = {};
    if (isSoloLawyer || !firmId) {
        filters.lawyerId = lawyerId;
    } else {
        filters.firmId = firmId;
    }

    if (status) filters.status = status;
    if (category) filters.category = category;
    if (caseId) filters.caseId = caseId;
    if (clientId) filters.clientId = clientId;
    if (employeeId) filters.employeeId = employeeId;
    if (expenseType) filters.expenseType = expenseType;
    if (isBillable !== undefined) filters.isBillable = isBillable === 'true';
    if (billingStatus) filters.billingStatus = billingStatus;

    if (startDate || endDate) {
        filters.date = {};
        if (startDate) filters.date.$gte = new Date(startDate);
        if (endDate) filters.date.$lte = new Date(endDate);
    }

    // Build sort
    const sortOrder = order === 'asc' ? 1 : -1;
    const sort = { [sortBy]: sortOrder, createdAt: -1 };

    const expenses = await Expense.find(filters)
        .populate('caseId', 'title caseNumber')
        .populate('clientId', 'firstName lastName companyName')
        .populate('employeeId', 'firstName lastName')
        .populate('lawyerId', 'firstName lastName username email')
        .populate('approvedBy', 'firstName lastName')
        .populate('invoiceId', 'invoiceNumber')
        .sort(sort)
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit))
        .lean();

    const total = await Expense.countDocuments(filters);

    return res.json({
        success: true,
        expenses,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
        }
    });
});

// ═══════════════════════════════════════════════════════════════
// GET SINGLE EXPENSE
// GET /api/expenses/:id
// ═══════════════════════════════════════════════════════════════
const getExpense = asyncHandler(async (req, res) => {
    // Block departed users from financial operations
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول إلى المصروفات', 403);
    }

    const { id } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    const expense = await Expense.findById(id)
        .populate('caseId', 'title caseNumber category')
        .populate('clientId', 'firstName lastName companyName email phone')
        .populate('employeeId', 'firstName lastName email')
        .populate('lawyerId', 'firstName lastName username email')
        .populate('approvedBy', 'firstName lastName')
        .populate('submittedBy', 'firstName lastName')
        .populate('invoiceId', 'invoiceNumber totalAmount')
        .populate('departmentId', 'name')
        .populate('projectId', 'name')
        .populate('travelDetails.attendees', 'firstName lastName');

    if (!expense) {
        throw CustomException('Expense not found', 404);
    }

    // Check access - solo lawyer or no firmId uses lawyerId
    const isSoloLawyer = req.isSoloLawyer;
    const hasAccess = (isSoloLawyer || !firmId)
        ? expense.lawyerId._id.toString() === lawyerId
        : expense.firmId && expense.firmId.toString() === firmId.toString();

    if (!hasAccess) {
        throw CustomException('You do not have access to this expense', 403);
    }

    return res.json({
        success: true,
        expense
    });
});

// ═══════════════════════════════════════════════════════════════
// UPDATE EXPENSE
// PUT /api/expenses/:id
// ═══════════════════════════════════════════════════════════════
const updateExpense = asyncHandler(async (req, res) => {
    // Block departed users from financial operations
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية لتعديل المصروفات', 403);
    }

    const { id } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    const expense = await Expense.findById(id);

    if (!expense) {
        throw CustomException('Expense not found', 404);
    }

    // IDOR Protection: Check access - solo lawyer or no firmId uses lawyerId
    const isSoloLawyer = req.isSoloLawyer;
    const hasAccess = (isSoloLawyer || !firmId)
        ? expense.lawyerId.toString() === lawyerId
        : expense.firmId && expense.firmId.toString() === firmId.toString();

    if (!hasAccess) {
        throw CustomException('You do not have access to this expense', 403);
    }

    // Don't allow editing if already approved, reimbursed or billed
    if (expense.status === 'approved' || expense.status === 'paid') {
        throw CustomException('Cannot edit an approved expense', 400);
    }

    if (expense.reimbursementStatus === 'paid') {
        throw CustomException('Cannot edit a reimbursed expense', 400);
    }

    if (expense.invoiceId) {
        throw CustomException('Cannot edit an invoiced expense', 400);
    }

    // Mass Assignment Protection: Only allow specific fields
    const allowedUpdateFields = pickAllowedFields(req.body, EXPENSE_ALLOWED_FIELDS);

    // Validate description if provided
    if (allowedUpdateFields.description && allowedUpdateFields.description.length < 10) {
        throw CustomException('Description must be at least 10 characters', 400);
    }

    // Validate amount if provided with enhanced validation
    if (allowedUpdateFields.amount !== undefined) {
        allowedUpdateFields.amount = validateExpenseAmount(allowedUpdateFields.amount);
    }

    // Validate date if provided
    if (allowedUpdateFields.date) {
        const expenseDate = new Date(allowedUpdateFields.date);
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        if (expenseDate > today) {
            throw CustomException('Expense date cannot be in the future', 400);
        }
    }

    // Add updatedBy (system field, not from allowlist)
    allowedUpdateFields.updatedBy = lawyerId;

    const updatedExpense = await Expense.findByIdAndUpdate(
        id,
        { $set: allowedUpdateFields },
        { new: true, runValidators: true }
    )
        .populate('caseId', 'title caseNumber')
        .populate('clientId', 'firstName lastName companyName')
        .populate('employeeId', 'firstName lastName')
        .populate('lawyerId', 'firstName lastName username email');

    // Log activity
    await BillingActivity.logActivity({
        activityType: 'expense_updated',
        userId: lawyerId,
        relatedModel: 'Expense',
        relatedId: expense._id,
        description: `Expense ${expense.expenseId} updated`,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
    });

    return res.json({
        success: true,
        message: 'Expense updated successfully',
        expense: updatedExpense
    });
});

// ═══════════════════════════════════════════════════════════════
// DELETE EXPENSE
// DELETE /api/expenses/:id
// ═══════════════════════════════════════════════════════════════
const deleteExpense = asyncHandler(async (req, res) => {
    // Block departed users from financial operations
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية لحذف المصروفات', 403);
    }

    const { id } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    const expense = await Expense.findById(id);

    if (!expense) {
        throw CustomException('Expense not found', 404);
    }

    // Check access - solo lawyer or no firmId uses lawyerId
    const isSoloLawyer = req.isSoloLawyer;
    const hasAccess = (isSoloLawyer || !firmId)
        ? expense.lawyerId.toString() === lawyerId
        : expense.firmId && expense.firmId.toString() === firmId.toString();

    if (!hasAccess) {
        throw CustomException('You do not have access to this expense', 403);
    }

    // Don't allow deleting if approved, reimbursed or billed
    if (expense.status === 'approved' || expense.status === 'paid') {
        throw CustomException('Cannot delete an approved expense', 400);
    }

    if (expense.reimbursementStatus === 'paid') {
        throw CustomException('Cannot delete a reimbursed expense', 400);
    }

    if (expense.invoiceId) {
        throw CustomException('Cannot delete an invoiced expense', 400);
    }

    await Expense.findByIdAndDelete(id);

    // Log activity
    await BillingActivity.logActivity({
        activityType: 'expense_deleted',
        userId: lawyerId,
        relatedModel: 'Expense',
        relatedId: expense._id,
        description: `Expense ${expense.expenseId} deleted`,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
    });

    return res.json({
        success: true,
        message: 'Expense deleted successfully'
    });
});

// ═══════════════════════════════════════════════════════════════
// SUBMIT EXPENSE FOR APPROVAL
// POST /api/expenses/:id/submit
// ═══════════════════════════════════════════════════════════════
const submitExpense = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية لتقديم المصروفات', 403);
    }

    const { id } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    const expense = await Expense.findById(id);

    if (!expense) {
        throw CustomException('Expense not found', 404);
    }

    // Check access
    const isSoloLawyer = req.isSoloLawyer;
    const hasAccess = (isSoloLawyer || !firmId)
        ? expense.lawyerId.toString() === lawyerId
        : expense.firmId && expense.firmId.toString() === firmId.toString();

    if (!hasAccess) {
        throw CustomException('You do not have access to this expense', 403);
    }

    // Use the model method
    await expense.submit(lawyerId);

    // Log activity
    await BillingActivity.logActivity({
        activityType: 'expense_submitted',
        userId: lawyerId,
        relatedModel: 'Expense',
        relatedId: expense._id,
        description: `Expense ${expense.expenseId} submitted for approval`,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
    });

    await expense.populate([
        { path: 'caseId', select: 'title caseNumber' },
        { path: 'clientId', select: 'firstName lastName companyName' },
        { path: 'submittedBy', select: 'firstName lastName' }
    ]);

    return res.json({
        success: true,
        message: 'Expense submitted for approval',
        expense
    });
});

// ═══════════════════════════════════════════════════════════════
// APPROVE EXPENSE
// POST /api/expenses/:id/approve
// ═══════════════════════════════════════════════════════════════
const approveExpense = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للموافقة على المصروفات', 403);
    }

    const { id } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    const expense = await Expense.findById(id);

    if (!expense) {
        throw CustomException('Expense not found', 404);
    }

    // Check access
    const isSoloLawyer = req.isSoloLawyer;
    const hasAccess = (isSoloLawyer || !firmId)
        ? expense.lawyerId.toString() === lawyerId
        : expense.firmId && expense.firmId.toString() === firmId.toString();

    if (!hasAccess) {
        throw CustomException('You do not have access to this expense', 403);
    }

    // Check permission to approve
    if (req.hasPermission && !req.hasPermission('expenses', 'full')) {
        throw CustomException('You do not have permission to approve expenses', 403);
    }

    // Use the model method (includes GL posting)
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { expense: approvedExpense, glEntry } = await expense.approve(lawyerId, session);

        // Log activity
        await BillingActivity.logActivity({
            activityType: 'expense_approved',
            userId: lawyerId,
            relatedModel: 'Expense',
            relatedId: expense._id,
            description: `Expense ${expense.expenseId} approved`,
            amount: expense.totalAmount,
            ipAddress: req.ip,
            userAgent: req.get('user-agent')
        });

        await session.commitTransaction();

        await approvedExpense.populate([
            { path: 'caseId', select: 'title caseNumber' },
            { path: 'clientId', select: 'firstName lastName companyName' },
            { path: 'approvedBy', select: 'firstName lastName' }
        ]);

        return res.json({
            success: true,
            message: 'Expense approved successfully',
            expense: approvedExpense,
            glEntryId: glEntry ? glEntry._id : null
        });
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
});

// ═══════════════════════════════════════════════════════════════
// REJECT EXPENSE
// POST /api/expenses/:id/reject
// ═══════════════════════════════════════════════════════════════
const rejectExpense = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية لرفض المصروفات', 403);
    }

    const { id } = req.params;
    const { reason } = req.body;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    if (!reason) {
        throw CustomException('Rejection reason is required', 400);
    }

    const expense = await Expense.findById(id);

    if (!expense) {
        throw CustomException('Expense not found', 404);
    }

    // Check access
    const isSoloLawyer = req.isSoloLawyer;
    const hasAccess = (isSoloLawyer || !firmId)
        ? expense.lawyerId.toString() === lawyerId
        : expense.firmId && expense.firmId.toString() === firmId.toString();

    if (!hasAccess) {
        throw CustomException('You do not have access to this expense', 403);
    }

    // Check permission to reject
    if (req.hasPermission && !req.hasPermission('expenses', 'full')) {
        throw CustomException('You do not have permission to reject expenses', 403);
    }

    // Use the model method
    await expense.reject(lawyerId, reason);

    // Log activity
    await BillingActivity.logActivity({
        activityType: 'expense_rejected',
        userId: lawyerId,
        relatedModel: 'Expense',
        relatedId: expense._id,
        description: `Expense ${expense.expenseId} rejected: ${reason}`,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
    });

    await expense.populate([
        { path: 'caseId', select: 'title caseNumber' },
        { path: 'clientId', select: 'firstName lastName companyName' }
    ]);

    return res.json({
        success: true,
        message: 'Expense rejected',
        expense
    });
});

// ═══════════════════════════════════════════════════════════════
// MARK EXPENSE AS REIMBURSED
// POST /api/expenses/:id/reimburse
// ═══════════════════════════════════════════════════════════════
const markAsReimbursed = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول إلى المصروفات', 403);
    }

    const { id } = req.params;
    const { amount } = req.body;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    const expense = await Expense.findById(id);

    if (!expense) {
        throw CustomException('Expense not found', 404);
    }

    // Check access
    const isSoloLawyer = req.isSoloLawyer;
    const hasAccess = (isSoloLawyer || !firmId)
        ? expense.lawyerId.toString() === lawyerId
        : expense.firmId && expense.firmId.toString() === firmId.toString();

    if (!hasAccess) {
        throw CustomException('You do not have access to this expense', 403);
    }

    // Use the model method
    await expense.reimburse(lawyerId, amount);

    // Log activity
    await BillingActivity.logActivity({
        activityType: 'expense_reimbursed',
        userId: lawyerId,
        relatedModel: 'Expense',
        relatedId: expense._id,
        description: `Expense ${expense.expenseId} reimbursed`,
        amount: expense.reimbursedAmount,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
    });

    await expense.populate([
        { path: 'employeeId', select: 'firstName lastName' }
    ]);

    return res.json({
        success: true,
        message: 'Expense marked as reimbursed',
        expense
    });
});

// ═══════════════════════════════════════════════════════════════
// GET EXPENSE STATISTICS
// GET /api/expenses/stats
// ═══════════════════════════════════════════════════════════════
const getExpenseStats = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول إلى المصروفات', 403);
    }

    const { caseId, clientId, startDate, endDate } = req.query;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    // Build filters - solo lawyer or no firmId uses lawyerId
    const isSoloLawyer = req.isSoloLawyer;
    const filters = {};
    if (isSoloLawyer || !firmId) {
        filters.lawyerId = lawyerId;
    } else {
        filters.firmId = firmId;
    }

    if (caseId) filters.caseId = caseId;
    if (clientId) filters.clientId = clientId;
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;

    const stats = await Expense.getExpenseStats(filters);

    // Get expenses by category
    const byCategory = await Expense.getExpensesByCategory(filters);
    const byCategoryObj = {};
    byCategory.forEach(item => {
        byCategoryObj[item.category] = item.total;
    });

    // Get expenses by month
    const matchStage = {};
    if (isSoloLawyer || !firmId) {
        matchStage.lawyerId = new mongoose.Types.ObjectId(lawyerId);
    } else {
        matchStage.firmId = new mongoose.Types.ObjectId(firmId);
    }
    if (startDate) matchStage.date = { $gte: new Date(startDate) };
    if (endDate) matchStage.date = { ...matchStage.date, $lte: new Date(endDate) };

    const byMonth = await Expense.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: {
                    year: { $year: '$date' },
                    month: { $month: '$date' }
                },
                amount: { $sum: '$totalAmount' },
                count: { $sum: 1 }
            }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
        {
            $project: {
                month: {
                    $concat: [
                        { $toString: '$_id.year' },
                        '-',
                        { $cond: [{ $lt: ['$_id.month', 10] }, { $concat: ['0', { $toString: '$_id.month' }] }, { $toString: '$_id.month' }] }
                    ]
                },
                amount: 1,
                count: 1,
                _id: 0
            }
        }
    ]);

    // Get pending reimbursements
    const pendingReimbursementsFilter = {};
    if (isSoloLawyer || !firmId) {
        pendingReimbursementsFilter.lawyerId = lawyerId;
    } else {
        pendingReimbursementsFilter.firmId = firmId;
    }
    const pendingReimbursements = await Expense.getPendingReimbursements(
        pendingReimbursementsFilter
    );

    return res.json({
        success: true,
        stats: {
            ...stats,
            byCategory: byCategoryObj,
            byMonth,
            pendingReimbursements
        }
    });
});

// ═══════════════════════════════════════════════════════════════
// GET EXPENSES BY CATEGORY
// GET /api/expenses/by-category
// ═══════════════════════════════════════════════════════════════
const getExpensesByCategory = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول إلى المصروفات', 403);
    }

    const { caseId, startDate, endDate } = req.query;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    // Build filters - solo lawyer or no firmId uses lawyerId
    const isSoloLawyer = req.isSoloLawyer;
    const filters = {};
    if (isSoloLawyer || !firmId) {
        filters.lawyerId = lawyerId;
    } else {
        filters.firmId = firmId;
    }

    if (caseId) filters.caseId = caseId;
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;

    const byCategory = await Expense.getExpensesByCategory(filters);

    return res.json({
        success: true,
        data: byCategory
    });
});

// ═══════════════════════════════════════════════════════════════
// UPLOAD RECEIPT
// POST /api/expenses/:id/receipt
// ═══════════════════════════════════════════════════════════════
const uploadReceipt = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول إلى المصروفات', 403);
    }

    const { id } = req.params;
    const { filename, url, mimeType, size, type = 'other' } = req.body;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    if (!url) {
        throw CustomException('Receipt URL is required', 400);
    }

    const expense = await Expense.findById(id);

    if (!expense) {
        throw CustomException('Expense not found', 404);
    }

    // Check access
    const isSoloLawyer = req.isSoloLawyer;
    const hasAccess = (isSoloLawyer || !firmId)
        ? expense.lawyerId.toString() === lawyerId
        : expense.firmId && expense.firmId.toString() === firmId.toString();

    if (!hasAccess) {
        throw CustomException('You do not have access to this expense', 403);
    }

    const attachment = {
        type,
        filename: filename || 'receipt',
        url,
        mimeType: mimeType || 'application/pdf',
        size: size || 0,
        uploadedAt: new Date()
    };

    // Set as main receipt if first attachment
    if (!expense.receipt || !expense.receipt.url) {
        expense.receipt = {
            filename: attachment.filename,
            url: attachment.url,
            mimeType: attachment.mimeType,
            size: attachment.size
        };
    }

    expense.attachments.push(attachment);
    expense.hasReceipt = true;

    // Also set the single receiptUrl for backwards compatibility
    if (!expense.receiptUrl) {
        expense.receiptUrl = url;
    }

    expense.updatedBy = lawyerId;
    await expense.save();

    return res.json({
        success: true,
        message: 'Receipt uploaded successfully',
        attachment
    });
});

// ═══════════════════════════════════════════════════════════════
// SMART CATEGORY SUGGESTION
// POST /api/expenses/suggest-category
// ═══════════════════════════════════════════════════════════════
const suggestCategory = asyncHandler(async (req, res) => {
    const { description, descriptions } = req.body;
    const { suggestCategory: suggest, suggestCategoriesBatch, getAllCategories } = require('../utils/smartCategorization');

    // Single description
    if (description) {
        const suggestion = suggest(description);
        return res.json({
            success: true,
            data: suggestion
        });
    }

    // Batch descriptions
    if (descriptions && Array.isArray(descriptions)) {
        const suggestions = suggestCategoriesBatch(descriptions);
        return res.json({
            success: true,
            data: suggestions
        });
    }

    // Return all categories if no description provided
    const categories = getAllCategories();
    return res.json({
        success: true,
        data: { categories }
    });
});

// ═══════════════════════════════════════════════════════════════
// GET ALL EXPENSE CATEGORIES
// GET /api/expenses/categories
// ═══════════════════════════════════════════════════════════════
const getExpenseCategories = asyncHandler(async (req, res) => {
    const { getAllCategories } = require('../utils/smartCategorization');
    const categories = getAllCategories();

    // Also include the enums from the model
    const modelEnums = {
        expenseCategories: Expense.EXPENSE_CATEGORIES,
        paymentMethods: Expense.PAYMENT_METHODS,
        tripPurposes: Expense.TRIP_PURPOSES,
        governmentEntities: Expense.GOVERNMENT_ENTITIES
    };

    return res.json({
        success: true,
        data: {
            ...categories,
            ...modelEnums
        }
    });
});

// ═══════════════════════════════════════════════════════════════
// BULK APPROVE EXPENSES
// POST /api/expenses/bulk-approve
// ═══════════════════════════════════════════════════════════════
const bulkApproveExpenses = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للموافقة على المصروفات', 403);
    }

    const { expenseIds } = req.body;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    if (!expenseIds || !Array.isArray(expenseIds) || expenseIds.length === 0) {
        throw CustomException('Expense IDs are required', 400);
    }

    // Check permission
    if (req.hasPermission && !req.hasPermission('expenses', 'full')) {
        throw CustomException('You do not have permission to approve expenses', 403);
    }

    const results = {
        approved: [],
        failed: []
    };

    for (const expenseId of expenseIds) {
        try {
            const expense = await Expense.findById(expenseId);

            if (!expense) {
                results.failed.push({ id: expenseId, error: 'Not found' });
                continue;
            }

            // Check access
            const isSoloLawyer = req.isSoloLawyer;
            const hasAccess = (isSoloLawyer || !firmId)
                ? expense.lawyerId.toString() === lawyerId
                : expense.firmId && expense.firmId.toString() === firmId.toString();

            if (!hasAccess) {
                results.failed.push({ id: expenseId, error: 'No access' });
                continue;
            }

            await expense.approve(lawyerId);
            results.approved.push(expenseId);
        } catch (error) {
            results.failed.push({ id: expenseId, error: error.message });
        }
    }

    return res.json({
        success: true,
        message: `${results.approved.length} expenses approved`,
        results
    });
});

// ═══════════════════════════════════════════════════════════════
// GET NEW EXPENSE DEFAULTS
// GET /api/expenses/new
// ═══════════════════════════════════════════════════════════════
const getNewExpenseDefaults = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول إلى المصروفات', 403);
    }

    return res.json({
        success: true,
        data: {
            description: '',
            amount: 0,
            taxAmount: 0,
            taxRate: 15,
            category: 'other',
            date: new Date().toISOString().split('T')[0],
            paymentMethod: 'cash',
            expenseType: 'non_reimbursable',
            isBillable: true,
            markupType: 'none',
            markupValue: 0,
            currency: 'SAR'
        },
        enums: {
            categories: Expense.EXPENSE_CATEGORIES,
            paymentMethods: Expense.PAYMENT_METHODS,
            tripPurposes: Expense.TRIP_PURPOSES,
            governmentEntities: Expense.GOVERNMENT_ENTITIES
        }
    });
});

// ═══════════════════════════════════════════════════════════════
// BULK DELETE EXPENSES
// POST /api/expenses/bulk-delete
// ═══════════════════════════════════════════════════════════════
const bulkDeleteExpenses = asyncHandler(async (req, res) => {
    // Block departed users from financial operations
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية لحذف المصروفات', 403);
    }

    const { ids } = req.body;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        throw CustomException('يجب توفير قائمة المعرفات / IDs list is required', 400);
    }

    // Build access query - can only delete draft/pending/rejected expenses (not approved/paid/invoiced)
    const isSoloLawyer = req.isSoloLawyer;
    const accessQuery = {
        _id: { $in: ids },
        status: { $nin: ['approved', 'paid'] },
        reimbursementStatus: { $ne: 'paid' },
        invoiceId: { $exists: false }
    };
    if (isSoloLawyer || !firmId) {
        accessQuery.lawyerId = lawyerId;
    } else {
        accessQuery.firmId = firmId;
    }

    const result = await Expense.deleteMany(accessQuery);

    // Log activity
    await BillingActivity.logActivity({
        activityType: 'expenses_bulk_deleted',
        userId: lawyerId,
        relatedModel: 'Expense',
        description: `${result.deletedCount} expenses bulk deleted`,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
    });

    return res.json({
        success: true,
        message: `تم حذف ${result.deletedCount} مصروف بنجاح / ${result.deletedCount} expense(s) deleted successfully`,
        deletedCount: result.deletedCount
    });
});

module.exports = {
    createExpense,
    getExpenses,
    getExpense,
    updateExpense,
    deleteExpense,
    bulkDeleteExpenses,
    submitExpense,
    approveExpense,
    rejectExpense,
    markAsReimbursed,
    getExpenseStats,
    getExpensesByCategory,
    uploadReceipt,
    suggestCategory,
    getExpenseCategories,
    bulkApproveExpenses,
    getNewExpenseDefaults
};
