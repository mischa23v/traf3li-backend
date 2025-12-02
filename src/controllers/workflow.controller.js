const { WorkflowTemplate, CaseStageProgress, Case } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');

/**
 * Create workflow template
 * POST /api/case-workflows
 */
const createWorkflow = asyncHandler(async (req, res) => {
    const {
        name, nameAr, description, descriptionAr,
        caseCategory, stages, transitions, isDefault
    } = req.body;
    const lawyerId = req.userID;

    if (!name || !nameAr || !caseCategory) {
        throw CustomException('الاسم والفئة مطلوبان', 400);
    }

    const workflow = await WorkflowTemplate.create({
        lawyerId,
        name,
        nameAr,
        description,
        descriptionAr,
        caseCategory,
        stages: stages || [],
        transitions: transitions || [],
        isDefault: isDefault || false,
        createdBy: lawyerId
    });

    res.status(201).json({
        success: true,
        message: 'تم إنشاء نموذج سير العمل بنجاح',
        data: workflow
    });
});

/**
 * Get all workflow templates
 * GET /api/case-workflows
 */
const getWorkflows = asyncHandler(async (req, res) => {
    const { caseCategory, isActive = true, page = 1, limit = 50 } = req.query;
    const lawyerId = req.userID;

    const query = { lawyerId };

    if (caseCategory) query.caseCategory = caseCategory;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const workflows = await WorkflowTemplate.find(query)
        .sort({ isDefault: -1, createdAt: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit))
        .populate('createdBy', 'firstName lastName');

    const total = await WorkflowTemplate.countDocuments(query);

    res.status(200).json({
        success: true,
        data: workflows,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
        }
    });
});

/**
 * Get single workflow
 * GET /api/case-workflows/:id
 */
const getWorkflow = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;

    const workflow = await WorkflowTemplate.findOne({ _id: id, lawyerId })
        .populate('createdBy', 'firstName lastName');

    if (!workflow) {
        throw CustomException('نموذج سير العمل غير موجود', 404);
    }

    res.status(200).json({
        success: true,
        data: workflow
    });
});

/**
 * Get workflows by category
 * GET /api/case-workflows/category/:category
 */
const getWorkflowsByCategory = asyncHandler(async (req, res) => {
    const { category } = req.params;
    const lawyerId = req.userID;

    const workflows = await WorkflowTemplate.getByCategory(lawyerId, category);

    res.status(200).json({
        success: true,
        data: workflows
    });
});

/**
 * Update workflow
 * PATCH /api/case-workflows/:id
 */
const updateWorkflow = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;

    const workflow = await WorkflowTemplate.findOne({ _id: id, lawyerId });

    if (!workflow) {
        throw CustomException('نموذج سير العمل غير موجود', 404);
    }

    const allowedFields = [
        'name', 'nameAr', 'description', 'descriptionAr',
        'caseCategory', 'isDefault', 'isActive'
    ];

    allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
            workflow[field] = req.body[field];
        }
    });

    await workflow.save();

    res.status(200).json({
        success: true,
        message: 'تم تحديث نموذج سير العمل بنجاح',
        data: workflow
    });
});

/**
 * Delete workflow
 * DELETE /api/case-workflows/:id
 */
const deleteWorkflow = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;

    // Check if workflow is in use
    const inUse = await CaseStageProgress.findOne({ workflowId: id });
    if (inUse) {
        throw CustomException('لا يمكن حذف نموذج سير العمل لأنه قيد الاستخدام', 400);
    }

    const workflow = await WorkflowTemplate.findOneAndDelete({ _id: id, lawyerId });

    if (!workflow) {
        throw CustomException('نموذج سير العمل غير موجود', 404);
    }

    res.status(200).json({
        success: true,
        message: 'تم حذف نموذج سير العمل بنجاح'
    });
});

/**
 * Duplicate workflow
 * POST /api/case-workflows/:id/duplicate
 */
const duplicateWorkflow = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, nameAr } = req.body;
    const lawyerId = req.userID;

    const original = await WorkflowTemplate.findOne({ _id: id, lawyerId });

    if (!original) {
        throw CustomException('نموذج سير العمل غير موجود', 404);
    }

    const duplicate = await WorkflowTemplate.create({
        lawyerId,
        name: name || `${original.name} (نسخة)`,
        nameAr: nameAr || `${original.nameAr} (نسخة)`,
        description: original.description,
        descriptionAr: original.descriptionAr,
        caseCategory: original.caseCategory,
        stages: original.stages,
        transitions: original.transitions,
        isDefault: false,
        createdBy: lawyerId
    });

    res.status(201).json({
        success: true,
        message: 'تم نسخ نموذج سير العمل بنجاح',
        data: duplicate
    });
});

/**
 * Add stage to workflow
 * POST /api/case-workflows/:id/stages
 */
const addStage = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;

    const workflow = await WorkflowTemplate.findOne({ _id: id, lawyerId });

    if (!workflow) {
        throw CustomException('نموذج سير العمل غير موجود', 404);
    }

    const newStage = {
        ...req.body,
        order: workflow.stages.length
    };

    workflow.stages.push(newStage);
    await workflow.save();

    res.status(201).json({
        success: true,
        message: 'تم إضافة المرحلة بنجاح',
        data: workflow
    });
});

/**
 * Update stage
 * PATCH /api/case-workflows/:id/stages/:stageId
 */
const updateStage = asyncHandler(async (req, res) => {
    const { id, stageId } = req.params;
    const lawyerId = req.userID;

    const workflow = await WorkflowTemplate.findOne({ _id: id, lawyerId });

    if (!workflow) {
        throw CustomException('نموذج سير العمل غير موجود', 404);
    }

    const stage = workflow.stages.id(stageId);
    if (!stage) {
        throw CustomException('المرحلة غير موجودة', 404);
    }

    Object.keys(req.body).forEach(key => {
        if (req.body[key] !== undefined) {
            stage[key] = req.body[key];
        }
    });

    await workflow.save();

    res.status(200).json({
        success: true,
        message: 'تم تحديث المرحلة بنجاح',
        data: workflow
    });
});

/**
 * Delete stage
 * DELETE /api/case-workflows/:id/stages/:stageId
 */
const deleteStage = asyncHandler(async (req, res) => {
    const { id, stageId } = req.params;
    const lawyerId = req.userID;

    const workflow = await WorkflowTemplate.findOne({ _id: id, lawyerId });

    if (!workflow) {
        throw CustomException('نموذج سير العمل غير موجود', 404);
    }

    workflow.stages.pull(stageId);
    await workflow.save();

    res.status(200).json({
        success: true,
        message: 'تم حذف المرحلة بنجاح',
        data: workflow
    });
});

/**
 * Reorder stages
 * PATCH /api/case-workflows/:id/stages/reorder
 */
const reorderStages = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { stageOrder } = req.body; // Array of stage IDs in new order
    const lawyerId = req.userID;

    const workflow = await WorkflowTemplate.findOne({ _id: id, lawyerId });

    if (!workflow) {
        throw CustomException('نموذج سير العمل غير موجود', 404);
    }

    stageOrder.forEach((stageId, index) => {
        const stage = workflow.stages.id(stageId);
        if (stage) {
            stage.order = index;
        }
    });

    workflow.stages.sort((a, b) => a.order - b.order);
    await workflow.save();

    res.status(200).json({
        success: true,
        message: 'تم إعادة ترتيب المراحل بنجاح',
        data: workflow
    });
});

/**
 * Add transition
 * POST /api/case-workflows/:id/transitions
 */
const addTransition = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;

    const workflow = await WorkflowTemplate.findOne({ _id: id, lawyerId });

    if (!workflow) {
        throw CustomException('نموذج سير العمل غير موجود', 404);
    }

    workflow.transitions.push(req.body);
    await workflow.save();

    res.status(201).json({
        success: true,
        message: 'تم إضافة الانتقال بنجاح',
        data: workflow
    });
});

/**
 * Initialize workflow for case
 * POST /api/case-workflows/cases/:caseId/initialize
 */
const initializeWorkflowForCase = asyncHandler(async (req, res) => {
    const { caseId } = req.params;
    const { workflowId } = req.body;
    const lawyerId = req.userID;

    const caseDoc = await Case.findOne({ _id: caseId, lawyerId });
    if (!caseDoc) {
        throw CustomException('القضية غير موجودة', 404);
    }

    let workflow;
    if (workflowId) {
        workflow = await WorkflowTemplate.findOne({ _id: workflowId, lawyerId });
    } else {
        workflow = await WorkflowTemplate.getDefaultForCategory(lawyerId, caseDoc.category);
    }

    if (!workflow) {
        throw CustomException('نموذج سير العمل غير موجود', 404);
    }

    const initialStage = workflow.stages.find(s => s.isInitial) || workflow.stages[0];

    if (!initialStage) {
        throw CustomException('لا توجد مرحلة بدء في نموذج سير العمل', 400);
    }

    const progress = await CaseStageProgress.initializeForCase(
        caseId,
        workflow._id,
        initialStage._id,
        initialStage.name
    );

    res.status(201).json({
        success: true,
        message: 'تم تهيئة سير العمل للقضية بنجاح',
        data: progress
    });
});

/**
 * Get case progress
 * GET /api/case-workflows/cases/:caseId/progress
 */
const getCaseProgress = asyncHandler(async (req, res) => {
    const { caseId } = req.params;

    const progress = await CaseStageProgress.findOne({ caseId })
        .populate('workflowId')
        .populate('stageHistory.completedBy', 'firstName lastName');

    if (!progress) {
        throw CustomException('لم يتم تهيئة سير العمل لهذه القضية', 404);
    }

    res.status(200).json({
        success: true,
        data: progress
    });
});

/**
 * Move case to stage
 * POST /api/case-workflows/cases/:caseId/move
 */
const moveCaseToStage = asyncHandler(async (req, res) => {
    const { caseId } = req.params;
    const { stageId, notes } = req.body;
    const lawyerId = req.userID;

    const progress = await CaseStageProgress.findOne({ caseId });

    if (!progress) {
        throw CustomException('لم يتم تهيئة سير العمل لهذه القضية', 404);
    }

    const workflow = await WorkflowTemplate.findById(progress.workflowId);
    const newStage = workflow.stages.id(stageId);

    if (!newStage) {
        throw CustomException('المرحلة غير موجودة', 404);
    }

    await CaseStageProgress.moveToStage(caseId, stageId, newStage.name, lawyerId, notes);

    const updatedProgress = await CaseStageProgress.findOne({ caseId });

    res.status(200).json({
        success: true,
        message: 'تم نقل القضية إلى المرحلة الجديدة بنجاح',
        data: updatedProgress
    });
});

/**
 * Complete requirement
 * POST /api/case-workflows/cases/:caseId/requirements/complete
 */
const completeRequirement = asyncHandler(async (req, res) => {
    const { caseId } = req.params;
    const { stageId, requirementId, metadata } = req.body;
    const lawyerId = req.userID;

    const progress = await CaseStageProgress.completeRequirement(
        caseId,
        stageId,
        requirementId,
        lawyerId,
        metadata
    );

    if (!progress) {
        throw CustomException('لم يتم تهيئة سير العمل لهذه القضية', 404);
    }

    res.status(200).json({
        success: true,
        message: 'تم إكمال المتطلب بنجاح',
        data: progress
    });
});

/**
 * Get workflow statistics
 * GET /api/case-workflows/statistics
 */
const getWorkflowStatistics = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;

    const totalWorkflows = await WorkflowTemplate.countDocuments({ lawyerId });
    const activeWorkflows = await WorkflowTemplate.countDocuments({ lawyerId, isActive: true });
    const casesWithWorkflow = await CaseStageProgress.countDocuments({});

    const byCategory = await WorkflowTemplate.aggregate([
        { $match: { lawyerId } },
        { $group: { _id: '$caseCategory', count: { $sum: 1 } } }
    ]);

    res.status(200).json({
        success: true,
        data: {
            totalWorkflows,
            activeWorkflows,
            casesWithWorkflow,
            byCategory
        }
    });
});

/**
 * Get preset templates
 * GET /api/case-workflows/presets
 */
const getPresets = asyncHandler(async (req, res) => {
    const presets = [
        {
            id: 'labor-case',
            name: 'Labor Case Workflow',
            nameAr: 'سير عمل القضايا العمالية',
            caseCategory: 'labor',
            stages: [
                { name: 'Case Filed', nameAr: 'تقديم الدعوى', color: '#3B82F6', isInitial: true },
                { name: 'Document Review', nameAr: 'مراجعة المستندات', color: '#10B981' },
                { name: 'Initial Hearing', nameAr: 'الجلسة الأولى', color: '#F59E0B' },
                { name: 'Evidence Phase', nameAr: 'مرحلة الإثبات', color: '#8B5CF6' },
                { name: 'Closing Arguments', nameAr: 'المرافعات الختامية', color: '#EC4899' },
                { name: 'Judgment', nameAr: 'الحكم', color: '#14B8A6', isFinal: true }
            ]
        },
        {
            id: 'commercial-case',
            name: 'Commercial Case Workflow',
            nameAr: 'سير عمل القضايا التجارية',
            caseCategory: 'commercial',
            stages: [
                { name: 'Case Registration', nameAr: 'تسجيل الدعوى', color: '#3B82F6', isInitial: true },
                { name: 'Defendant Response', nameAr: 'رد المدعى عليه', color: '#10B981' },
                { name: 'Discovery', nameAr: 'تبادل المستندات', color: '#F59E0B' },
                { name: 'Settlement Attempt', nameAr: 'محاولة التسوية', color: '#8B5CF6' },
                { name: 'Trial', nameAr: 'المحاكمة', color: '#EC4899' },
                { name: 'Verdict', nameAr: 'الحكم', color: '#14B8A6', isFinal: true }
            ]
        }
    ];

    res.status(200).json({
        success: true,
        data: presets
    });
});

/**
 * Import preset
 * POST /api/case-workflows/presets/:presetId/import
 */
const importPreset = asyncHandler(async (req, res) => {
    const { presetId } = req.params;
    const lawyerId = req.userID;

    const presets = {
        'labor-case': {
            name: 'Labor Case Workflow',
            nameAr: 'سير عمل القضايا العمالية',
            caseCategory: 'labor',
            stages: [
                { name: 'Case Filed', nameAr: 'تقديم الدعوى', color: '#3B82F6', order: 0, isInitial: true },
                { name: 'Document Review', nameAr: 'مراجعة المستندات', color: '#10B981', order: 1 },
                { name: 'Initial Hearing', nameAr: 'الجلسة الأولى', color: '#F59E0B', order: 2 },
                { name: 'Evidence Phase', nameAr: 'مرحلة الإثبات', color: '#8B5CF6', order: 3 },
                { name: 'Closing Arguments', nameAr: 'المرافعات الختامية', color: '#EC4899', order: 4 },
                { name: 'Judgment', nameAr: 'الحكم', color: '#14B8A6', order: 5, isFinal: true }
            ]
        },
        'commercial-case': {
            name: 'Commercial Case Workflow',
            nameAr: 'سير عمل القضايا التجارية',
            caseCategory: 'commercial',
            stages: [
                { name: 'Case Registration', nameAr: 'تسجيل الدعوى', color: '#3B82F6', order: 0, isInitial: true },
                { name: 'Defendant Response', nameAr: 'رد المدعى عليه', color: '#10B981', order: 1 },
                { name: 'Discovery', nameAr: 'تبادل المستندات', color: '#F59E0B', order: 2 },
                { name: 'Settlement Attempt', nameAr: 'محاولة التسوية', color: '#8B5CF6', order: 3 },
                { name: 'Trial', nameAr: 'المحاكمة', color: '#EC4899', order: 4 },
                { name: 'Verdict', nameAr: 'الحكم', color: '#14B8A6', order: 5, isFinal: true }
            ]
        }
    };

    const preset = presets[presetId];
    if (!preset) {
        throw CustomException('النموذج غير موجود', 404);
    }

    const workflow = await WorkflowTemplate.create({
        lawyerId,
        ...preset,
        createdBy: lawyerId
    });

    res.status(201).json({
        success: true,
        message: 'تم استيراد النموذج بنجاح',
        data: workflow
    });
});

module.exports = {
    createWorkflow,
    getWorkflows,
    getWorkflow,
    getWorkflowsByCategory,
    updateWorkflow,
    deleteWorkflow,
    duplicateWorkflow,
    addStage,
    updateStage,
    deleteStage,
    reorderStages,
    addTransition,
    initializeWorkflowForCase,
    getCaseProgress,
    moveCaseToStage,
    completeRequirement,
    getWorkflowStatistics,
    getPresets,
    importPreset
};
