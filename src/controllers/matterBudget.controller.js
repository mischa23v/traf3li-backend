const {
    MatterBudget, BudgetEntry, BudgetTemplate, Case, Client
} = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');
const mongoose = require('mongoose');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');

// ==================== Matter Budget Management ====================

/**
 * Create matter budget
 * POST /api/matter-budgets
 */
const createBudget = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;

    // Mass assignment protection
    const allowedFields = ['caseId', 'clientId', 'name', 'nameAr', 'totalBudget', 'phases', 'alertThresholds', 'notes', 'templateId'];
    const data = pickAllowedFields(req.body, allowedFields);

    const { caseId, clientId, name, nameAr, totalBudget, phases, alertThresholds, notes, templateId } = data;

    if (!caseId || !totalBudget) {
        throw CustomException('القضية والميزانية الإجمالية مطلوبان', 400);
    }

    // Input validation for budget amounts
    if (typeof totalBudget !== 'number' || totalBudget <= 0) {
        throw CustomException('الميزانية الإجمالية يجب أن تكون رقمًا موجبًا', 400);
    }

    // Sanitize and verify case ownership (IDOR protection)
    const sanitizedCaseId = sanitizeObjectId(caseId);
    const caseDoc = await Case.findOne({ _id: sanitizedCaseId, lawyerId });
    if (!caseDoc) {
        throw CustomException('القضية غير موجودة', 404);
    }

    // Verify client ownership if clientId provided (IDOR protection)
    if (clientId) {
        const sanitizedClientId = sanitizeObjectId(clientId);
        const clientDoc = await Client.findOne({ _id: sanitizedClientId, lawyerId });
        if (!clientDoc) {
            throw CustomException('العميل غير موجود', 400);
        }
    }

    // Check if budget already exists for case
    const existing = await MatterBudget.findOne({ caseId, lawyerId });
    if (existing) {
        throw CustomException('ميزانية القضية موجودة بالفعل', 400);
    }

    // If using template, get phases from template
    let budgetPhases = phases || [];
    if (templateId) {
        const template = await BudgetTemplate.findOne({ _id: templateId, lawyerId });
        if (template) {
            budgetPhases = template.phases;
        }
    }

    // Validate phase budgets
    if (budgetPhases.length > 0) {
        // Validate each phase budget is positive
        for (const phase of budgetPhases) {
            if (phase.budget && (typeof phase.budget !== 'number' || phase.budget <= 0)) {
                throw CustomException('ميزانية المرحلة يجب أن تكون رقمًا موجبًا', 400);
            }
        }

        const phaseTotal = budgetPhases.reduce((sum, p) => sum + (p.budget || 0), 0);
        if (phaseTotal > totalBudget) {
            throw CustomException('مجموع مراحل الميزانية يتجاوز الميزانية الإجمالية', 400);
        }
    }

    const budget = await MatterBudget.create({
        lawyerId,
        caseId,
        clientId: clientId || caseDoc.clientId,
        name: name || `ميزانية ${caseDoc.title}`,
        nameAr,
        totalBudget,
        phases: budgetPhases,
        alertThresholds: alertThresholds || {
            warning: 80,
            critical: 95
        },
        notes,
        createdBy: lawyerId
    });

    res.status(201).json({
        success: true,
        message: 'تم إنشاء الميزانية بنجاح',
        data: budget
    });
});

/**
 * Get all matter budgets
 * GET /api/matter-budgets
 */
const getBudgets = asyncHandler(async (req, res) => {
    const { caseId, clientId, status, page = 1, limit = 20 } = req.query;
    const lawyerId = req.userID;

    const query = { lawyerId };
    if (caseId) query.caseId = caseId;
    if (clientId) query.clientId = clientId;
    if (status) query.status = status;

    const budgets = await MatterBudget.find(query)
        .populate('caseId', 'title caseNumber')
        .populate('clientId', 'firstName lastName companyName')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await MatterBudget.countDocuments(query);

    res.status(200).json({
        success: true,
        data: budgets,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
        }
    });
});

/**
 * Get single matter budget
 * GET /api/matter-budgets/:id
 */
const getBudget = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;

    const budget = await MatterBudget.findOne({ _id: id, lawyerId })
        .populate('caseId', 'title caseNumber status')
        .populate('clientId', 'firstName lastName companyName email');

    if (!budget) {
        throw CustomException('الميزانية غير موجودة', 404);
    }

    // Get entries for this budget
    const entries = await BudgetEntry.find({ budgetId: id })
        .sort({ date: -1 })
        .limit(20);

    res.status(200).json({
        success: true,
        data: {
            ...budget.toObject(),
            recentEntries: entries
        }
    });
});

/**
 * Get budget by case
 * GET /api/matter-budgets/case/:caseId
 */
const getBudgetByCase = asyncHandler(async (req, res) => {
    const { caseId } = req.params;
    const lawyerId = req.userID;

    const budget = await MatterBudget.findOne({ caseId, lawyerId })
        .populate('caseId', 'title caseNumber')
        .populate('clientId', 'firstName lastName companyName');

    res.status(200).json({
        success: true,
        data: budget
    });
});

/**
 * Update matter budget
 * PATCH /api/matter-budgets/:id
 */
const updateBudget = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;

    const budget = await MatterBudget.findOne({ _id: id, lawyerId });

    if (!budget) {
        throw CustomException('الميزانية غير موجودة', 404);
    }

    // Mass assignment protection - exclude calculated fields and IDs
    const allowedFields = ['name', 'nameAr', 'totalBudget', 'phases', 'alertThresholds', 'status', 'notes'];
    const updates = pickAllowedFields(req.body, allowedFields);

    // Input validation for totalBudget if being updated
    if (updates.totalBudget !== undefined) {
        if (typeof updates.totalBudget !== 'number' || updates.totalBudget <= 0) {
            throw CustomException('الميزانية الإجمالية يجب أن تكون رقمًا موجبًا', 400);
        }
    }

    // Validate phase budgets if being updated
    if (updates.phases && updates.phases.length > 0) {
        for (const phase of updates.phases) {
            if (phase.budget && (typeof phase.budget !== 'number' || phase.budget <= 0)) {
                throw CustomException('ميزانية المرحلة يجب أن تكون رقمًا موجبًا', 400);
            }
        }
    }

    // Apply updates
    Object.keys(updates).forEach(field => {
        budget[field] = updates[field];
    });

    // Recalculate percentages (prevent manipulation of calculated fields)
    if (budget.totalBudget > 0) {
        budget.percentUsed = (budget.actualSpent / budget.totalBudget) * 100;
    }

    await budget.save();

    res.status(200).json({
        success: true,
        message: 'تم تحديث الميزانية بنجاح',
        data: budget
    });
});

/**
 * Delete matter budget
 * DELETE /api/matter-budgets/:id
 */
const deleteBudget = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;

    const budget = await MatterBudget.findOne({ _id: id, lawyerId });

    if (!budget) {
        throw CustomException('الميزانية غير موجودة', 404);
    }

    // Delete all entries
    await BudgetEntry.deleteMany({ budgetId: id });

    // Delete budget
    await MatterBudget.findByIdAndDelete(id);

    res.status(200).json({
        success: true,
        message: 'تم حذف الميزانية بنجاح'
    });
});

// ==================== Budget Entries ====================

/**
 * Add budget entry
 * POST /api/matter-budgets/:id/entries
 */
const addEntry = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;

    // Mass assignment protection
    const allowedFields = ['type', 'category', 'phaseId', 'description', 'amount', 'date', 'reference', 'billable'];
    const data = pickAllowedFields(req.body, allowedFields);

    const { type, category, phaseId, description, amount, date, reference, billable } = data;

    if (!type || !amount) {
        throw CustomException('نوع المصروف والمبلغ مطلوبان', 400);
    }

    // Input validation for amount
    if (typeof amount !== 'number' || amount <= 0) {
        throw CustomException('المبلغ يجب أن يكون رقمًا موجبًا', 400);
    }

    // IDOR protection - verify budget ownership
    const budget = await MatterBudget.findOne({ _id: id, lawyerId });

    if (!budget) {
        throw CustomException('الميزانية غير موجودة', 404);
    }

    // Verify phase belongs to this budget if phaseId provided
    if (phaseId) {
        const phase = budget.phases.id(phaseId);
        if (!phase) {
            throw CustomException('المرحلة غير موجودة في هذه الميزانية', 400);
        }
    }

    const entry = await BudgetEntry.create({
        lawyerId,
        budgetId: id,
        caseId: budget.caseId,
        type,
        category,
        phaseId,
        description,
        amount,
        date: date || new Date(),
        reference,
        billable: billable !== false,
        createdBy: lawyerId
    });

    // Update budget totals
    budget.actualSpent += amount;
    budget.percentUsed = (budget.actualSpent / budget.totalBudget) * 100;

    // Update phase spent if phaseId provided
    if (phaseId) {
        const phase = budget.phases.id(phaseId);
        if (phase) {
            phase.actualSpent = (phase.actualSpent || 0) + amount;
        }
    }

    // Check alert thresholds
    if (budget.percentUsed >= budget.alertThresholds.critical) {
        budget.status = 'over_budget';
    } else if (budget.percentUsed >= budget.alertThresholds.warning) {
        budget.status = 'at_risk';
    }

    await budget.save();

    res.status(201).json({
        success: true,
        message: 'تم إضافة المصروف بنجاح',
        data: {
            entry,
            budgetSummary: {
                totalBudget: budget.totalBudget,
                actualSpent: budget.actualSpent,
                remaining: budget.totalBudget - budget.actualSpent,
                percentUsed: budget.percentUsed
            }
        }
    });
});

/**
 * Get budget entries
 * GET /api/matter-budgets/:id/entries
 */
const getEntries = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { type, category, phaseId, startDate, endDate, page = 1, limit = 50 } = req.query;
    const lawyerId = req.userID;

    const query = { lawyerId, budgetId: id };
    if (type) query.type = type;
    if (category) query.category = category;
    if (phaseId) query.phaseId = phaseId;
    if (startDate || endDate) {
        query.date = {};
        if (startDate) query.date.$gte = new Date(startDate);
        if (endDate) query.date.$lte = new Date(endDate);
    }

    const entries = await BudgetEntry.find(query)
        .sort({ date: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await BudgetEntry.countDocuments(query);

    // Calculate totals
    const totals = await BudgetEntry.aggregate([
        { $match: { budgetId: new mongoose.Types.ObjectId(id), lawyerId } },
        {
            $group: {
                _id: '$type',
                total: { $sum: '$amount' },
                count: { $sum: 1 }
            }
        }
    ]);

    res.status(200).json({
        success: true,
        data: entries,
        totals: totals.reduce((acc, t) => {
            acc[t._id] = { total: t.total, count: t.count };
            return acc;
        }, {}),
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
        }
    });
});

/**
 * Update budget entry
 * PATCH /api/matter-budgets/:id/entries/:entryId
 */
const updateEntry = asyncHandler(async (req, res) => {
    const { id, entryId } = req.params;
    const lawyerId = req.userID;

    const entry = await BudgetEntry.findOne({
        _id: entryId,
        budgetId: id,
        lawyerId
    });

    if (!entry) {
        throw CustomException('المصروف غير موجود', 404);
    }

    const oldAmount = entry.amount;
    const oldPhaseId = entry.phaseId;

    const allowedFields = ['type', 'category', 'phaseId', 'description', 'amount', 'date', 'reference', 'billable'];
    allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
            entry[field] = req.body[field];
        }
    });

    await entry.save();

    // Update budget totals if amount changed
    if (req.body.amount !== undefined && req.body.amount !== oldAmount) {
        const budget = await MatterBudget.findById(id);
        const difference = entry.amount - oldAmount;
        budget.actualSpent += difference;
        budget.percentUsed = (budget.actualSpent / budget.totalBudget) * 100;

        // Update phase totals
        if (oldPhaseId) {
            const oldPhase = budget.phases.id(oldPhaseId);
            if (oldPhase) oldPhase.actualSpent -= oldAmount;
        }
        if (entry.phaseId) {
            const newPhase = budget.phases.id(entry.phaseId);
            if (newPhase) newPhase.actualSpent = (newPhase.actualSpent || 0) + entry.amount;
        }

        await budget.save();
    }

    res.status(200).json({
        success: true,
        message: 'تم تحديث المصروف بنجاح',
        data: entry
    });
});

/**
 * Delete budget entry
 * DELETE /api/matter-budgets/:id/entries/:entryId
 */
const deleteEntry = asyncHandler(async (req, res) => {
    const { id, entryId } = req.params;
    const lawyerId = req.userID;

    const entry = await BudgetEntry.findOne({
        _id: entryId,
        budgetId: id,
        lawyerId
    });

    if (!entry) {
        throw CustomException('المصروف غير موجود', 404);
    }

    // Update budget totals
    const budget = await MatterBudget.findById(id);
    budget.actualSpent -= entry.amount;
    budget.percentUsed = (budget.actualSpent / budget.totalBudget) * 100;

    // Update phase total
    if (entry.phaseId) {
        const phase = budget.phases.id(entry.phaseId);
        if (phase) phase.actualSpent -= entry.amount;
    }

    await budget.save();
    await BudgetEntry.findByIdAndDelete(entryId);

    res.status(200).json({
        success: true,
        message: 'تم حذف المصروف بنجاح'
    });
});

// ==================== Budget Phases ====================

/**
 * Add phase to budget
 * POST /api/matter-budgets/:id/phases
 */
const addPhase = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, nameAr, budget: phaseBudget, startDate, endDate, description } = req.body;
    const lawyerId = req.userID;

    if (!name || !phaseBudget) {
        throw CustomException('اسم المرحلة والميزانية مطلوبان', 400);
    }

    const budget = await MatterBudget.findOne({ _id: id, lawyerId });

    if (!budget) {
        throw CustomException('الميزانية غير موجودة', 404);
    }

    // Check total phases budget
    const currentPhaseBudget = budget.phases.reduce((sum, p) => sum + p.budget, 0);
    if (currentPhaseBudget + phaseBudget > budget.totalBudget) {
        throw CustomException('مجموع ميزانيات المراحل يتجاوز الميزانية الإجمالية', 400);
    }

    budget.phases.push({
        name,
        nameAr,
        budget: phaseBudget,
        actualSpent: 0,
        startDate,
        endDate,
        description,
        status: 'pending'
    });

    await budget.save();

    res.status(201).json({
        success: true,
        message: 'تم إضافة المرحلة بنجاح',
        data: budget
    });
});

/**
 * Update phase
 * PATCH /api/matter-budgets/:id/phases/:phaseId
 */
const updatePhase = asyncHandler(async (req, res) => {
    const { id, phaseId } = req.params;
    const lawyerId = req.userID;

    const budget = await MatterBudget.findOne({ _id: id, lawyerId });

    if (!budget) {
        throw CustomException('الميزانية غير موجودة', 404);
    }

    const phase = budget.phases.id(phaseId);
    if (!phase) {
        throw CustomException('المرحلة غير موجودة', 404);
    }

    const allowedFields = ['name', 'nameAr', 'budget', 'startDate', 'endDate', 'description', 'status'];
    allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
            phase[field] = req.body[field];
        }
    });

    await budget.save();

    res.status(200).json({
        success: true,
        message: 'تم تحديث المرحلة بنجاح',
        data: budget
    });
});

/**
 * Delete phase
 * DELETE /api/matter-budgets/:id/phases/:phaseId
 */
const deletePhase = asyncHandler(async (req, res) => {
    const { id, phaseId } = req.params;
    const lawyerId = req.userID;

    const budget = await MatterBudget.findOne({ _id: id, lawyerId });

    if (!budget) {
        throw CustomException('الميزانية غير موجودة', 404);
    }

    const phase = budget.phases.id(phaseId);
    if (!phase) {
        throw CustomException('المرحلة غير موجودة', 404);
    }

    // Check if phase has entries
    const hasEntries = await BudgetEntry.exists({ budgetId: id, phaseId });
    if (hasEntries) {
        throw CustomException('لا يمكن حذف مرحلة بها مصروفات', 400);
    }

    phase.deleteOne();
    await budget.save();

    res.status(200).json({
        success: true,
        message: 'تم حذف المرحلة بنجاح',
        data: budget
    });
});

// ==================== Budget Templates ====================

/**
 * Create budget template
 * POST /api/matter-budgets/templates
 */
const createTemplate = asyncHandler(async (req, res) => {
    const { name, nameAr, description, caseType, phases, isDefault } = req.body;
    const lawyerId = req.userID;

    if (!name) {
        throw CustomException('اسم القالب مطلوب', 400);
    }

    const template = await BudgetTemplate.create({
        lawyerId,
        name,
        nameAr,
        description,
        caseType,
        phases: phases || [],
        isDefault: isDefault || false
    });

    res.status(201).json({
        success: true,
        message: 'تم إنشاء قالب الميزانية بنجاح',
        data: template
    });
});

/**
 * Get budget templates
 * GET /api/matter-budgets/templates
 */
const getTemplates = asyncHandler(async (req, res) => {
    const { caseType } = req.query;
    const lawyerId = req.userID;

    const query = { lawyerId };
    if (caseType) query.caseType = caseType;

    const templates = await BudgetTemplate.find(query)
        .sort({ isDefault: -1, name: 1 });

    res.status(200).json({
        success: true,
        data: templates
    });
});

/**
 * Update budget template
 * PATCH /api/matter-budgets/templates/:id
 */
const updateTemplate = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;

    const template = await BudgetTemplate.findOne({ _id: id, lawyerId });

    if (!template) {
        throw CustomException('قالب الميزانية غير موجود', 404);
    }

    const allowedFields = ['name', 'nameAr', 'description', 'caseType', 'phases', 'isDefault'];
    allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
            template[field] = req.body[field];
        }
    });

    await template.save();

    res.status(200).json({
        success: true,
        message: 'تم تحديث قالب الميزانية بنجاح',
        data: template
    });
});

/**
 * Delete budget template
 * DELETE /api/matter-budgets/templates/:id
 */
const deleteTemplate = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;

    const template = await BudgetTemplate.findOneAndDelete({ _id: id, lawyerId });

    if (!template) {
        throw CustomException('قالب الميزانية غير موجود', 404);
    }

    res.status(200).json({
        success: true,
        message: 'تم حذف قالب الميزانية بنجاح'
    });
});

// ==================== Budget Analysis ====================

/**
 * Get budget analysis/summary
 * GET /api/matter-budgets/:id/analysis
 */
const getBudgetAnalysis = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;

    const budget = await MatterBudget.findOne({ _id: id, lawyerId })
        .populate('caseId', 'title caseNumber');

    if (!budget) {
        throw CustomException('الميزانية غير موجودة', 404);
    }

    // Get entries grouped by category
    const byCategory = await BudgetEntry.aggregate([
        { $match: { budgetId: new mongoose.Types.ObjectId(id) } },
        {
            $group: {
                _id: '$category',
                total: { $sum: '$amount' },
                count: { $sum: 1 }
            }
        },
        { $sort: { total: -1 } }
    ]);

    // Get entries grouped by type
    const byType = await BudgetEntry.aggregate([
        { $match: { budgetId: new mongoose.Types.ObjectId(id) } },
        {
            $group: {
                _id: '$type',
                total: { $sum: '$amount' },
                count: { $sum: 1 }
            }
        }
    ]);

    // Get monthly trend
    const monthlyTrend = await BudgetEntry.aggregate([
        { $match: { budgetId: new mongoose.Types.ObjectId(id) } },
        {
            $group: {
                _id: {
                    year: { $year: '$date' },
                    month: { $month: '$date' }
                },
                total: { $sum: '$amount' },
                count: { $sum: 1 }
            }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Phase progress
    const phaseProgress = budget.phases.map(phase => ({
        id: phase._id,
        name: phase.name,
        budget: phase.budget,
        spent: phase.actualSpent || 0,
        remaining: phase.budget - (phase.actualSpent || 0),
        percentUsed: phase.budget > 0 ? ((phase.actualSpent || 0) / phase.budget) * 100 : 0,
        status: phase.status
    }));

    res.status(200).json({
        success: true,
        data: {
            summary: {
                totalBudget: budget.totalBudget,
                actualSpent: budget.actualSpent,
                remaining: budget.totalBudget - budget.actualSpent,
                percentUsed: budget.percentUsed,
                status: budget.status
            },
            byCategory,
            byType,
            monthlyTrend,
            phaseProgress
        }
    });
});

/**
 * Get budget alerts
 * GET /api/matter-budgets/alerts
 */
const getBudgetAlerts = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;

    // Get budgets that are at warning or critical levels
    const alerts = await MatterBudget.find({
        lawyerId,
        $or: [
            { status: 'at_risk' },
            { status: 'over_budget' }
        ]
    })
        .populate('caseId', 'title caseNumber')
        .populate('clientId', 'firstName lastName companyName')
        .sort({ percentUsed: -1 });

    res.status(200).json({
        success: true,
        data: alerts
    });
});

module.exports = {
    // Budget CRUD
    createBudget,
    getBudgets,
    getBudget,
    getBudgetByCase,
    updateBudget,
    deleteBudget,
    // Entries
    addEntry,
    getEntries,
    updateEntry,
    deleteEntry,
    // Phases
    addPhase,
    updatePhase,
    deletePhase,
    // Templates
    createTemplate,
    getTemplates,
    updateTemplate,
    deleteTemplate,
    // Analysis
    getBudgetAnalysis,
    getBudgetAlerts
};
