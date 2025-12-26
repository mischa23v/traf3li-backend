const { WorkflowTemplate, CaseStageProgress, Case } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');
const { pickAllowedFields, sanitizeString, sanitizePagination } = require('../utils/securityUtils');

/**
 * Create workflow template
 * POST /api/case-workflows
 */
const createWorkflow = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;

    // Mass assignment protection: only allow specific fields
    const allowedFields = [
        'name', 'nameAr', 'description', 'descriptionAr',
        'caseCategory', 'stages', 'transitions', 'isDefault'
    ];
    const safeInput = pickAllowedFields(req.body, allowedFields);

    // Input validation
    if (!safeInput.name || typeof safeInput.name !== 'string') {
        throw CustomException('الاسم مطلوب وصحيح', 400);
    }
    if (!safeInput.nameAr || typeof safeInput.nameAr !== 'string') {
        throw CustomException('الاسم بالعربية مطلوب وصحيح', 400);
    }
    if (!safeInput.caseCategory || typeof safeInput.caseCategory !== 'string') {
        throw CustomException('فئة القضية مطلوبة', 400);
    }

    // Sanitize string inputs
    safeInput.name = sanitizeString(safeInput.name);
    safeInput.nameAr = sanitizeString(safeInput.nameAr);
    safeInput.description = sanitizeString(safeInput.description);
    safeInput.descriptionAr = sanitizeString(safeInput.descriptionAr);
    safeInput.caseCategory = sanitizeString(safeInput.caseCategory);

    // Validate stages and transitions are arrays
    if (safeInput.stages && !Array.isArray(safeInput.stages)) {
        throw CustomException('المراحل يجب أن تكون مصفوفة', 400);
    }
    if (safeInput.transitions && !Array.isArray(safeInput.transitions)) {
        throw CustomException('الانتقالات يجب أن تكون مصفوفة', 400);
    }

    const workflow = await WorkflowTemplate.create({
        lawyerId,
        name: safeInput.name,
        nameAr: safeInput.nameAr,
        description: safeInput.description || '',
        descriptionAr: safeInput.descriptionAr || '',
        caseCategory: safeInput.caseCategory,
        stages: safeInput.stages || [],
        transitions: safeInput.transitions || [],
        isDefault: safeInput.isDefault === true,
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
    const lawyerId = req.userID;

    // Validate and sanitize pagination parameters
    const { page, limit, skip } = sanitizePagination(req.query, {
        maxLimit: 100,
        defaultLimit: 20,
        defaultPage: 1
    });

    // Build query
    const query = { lawyerId };

    // Input validation for optional filters
    if (req.query.caseCategory && typeof req.query.caseCategory === 'string') {
        const sanitizedCategory = sanitizeString(req.query.caseCategory);
        if (sanitizedCategory) {
            query.caseCategory = sanitizedCategory;
        }
    }

    // Validate isActive filter
    if (req.query.isActive !== undefined) {
        query.isActive = req.query.isActive === 'true';
    }

    const workflows = await WorkflowTemplate.find(query)
        .sort({ isDefault: -1, createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .populate('createdBy', 'firstName lastName');

    const total = await WorkflowTemplate.countDocuments(query);

    res.status(200).json({
        success: true,
        data: workflows,
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
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

    // IDOR protection: verify workflow belongs to user
    const workflow = await WorkflowTemplate.findOne({ _id: id, lawyerId });

    if (!workflow) {
        throw CustomException('نموذج سير العمل غير موجود', 404);
    }

    // Mass assignment protection: only allow specific fields
    const allowedFields = [
        'name', 'nameAr', 'description', 'descriptionAr',
        'caseCategory', 'isDefault', 'isActive'
    ];
    const safeInput = pickAllowedFields(req.body, allowedFields);

    // Input validation and sanitization
    if (safeInput.name !== undefined) {
        if (typeof safeInput.name !== 'string') {
            throw CustomException('الاسم يجب أن يكون نصاً', 400);
        }
        workflow.name = sanitizeString(safeInput.name);
    }

    if (safeInput.nameAr !== undefined) {
        if (typeof safeInput.nameAr !== 'string') {
            throw CustomException('الاسم بالعربية يجب أن يكون نصاً', 400);
        }
        workflow.nameAr = sanitizeString(safeInput.nameAr);
    }

    if (safeInput.description !== undefined) {
        if (typeof safeInput.description !== 'string') {
            throw CustomException('الوصف يجب أن يكون نصاً', 400);
        }
        workflow.description = sanitizeString(safeInput.description);
    }

    if (safeInput.descriptionAr !== undefined) {
        if (typeof safeInput.descriptionAr !== 'string') {
            throw CustomException('الوصف بالعربية يجب أن يكون نصاً', 400);
        }
        workflow.descriptionAr = sanitizeString(safeInput.descriptionAr);
    }

    if (safeInput.caseCategory !== undefined) {
        if (typeof safeInput.caseCategory !== 'string') {
            throw CustomException('فئة القضية يجب أن تكون نصاً', 400);
        }
        workflow.caseCategory = sanitizeString(safeInput.caseCategory);
    }

    if (safeInput.isDefault !== undefined) {
        workflow.isDefault = safeInput.isDefault === true;
    }

    if (safeInput.isActive !== undefined) {
        workflow.isActive = safeInput.isActive === true;
    }

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
    const lawyerId = req.userID;

    // Mass assignment protection: only allow specific fields
    const allowedFields = ['name', 'nameAr'];
    const safeInput = pickAllowedFields(req.body, allowedFields);

    // IDOR protection: verify workflow belongs to user
    const original = await WorkflowTemplate.findOne({ _id: id, lawyerId });

    if (!original) {
        throw CustomException('نموذج سير العمل غير موجود', 404);
    }

    // Input validation and sanitization
    let duplicateName = safeInput.name ? sanitizeString(safeInput.name) : null;
    let duplicateNameAr = safeInput.nameAr ? sanitizeString(safeInput.nameAr) : null;

    const duplicate = await WorkflowTemplate.create({
        lawyerId,
        name: duplicateName || `${original.name} (نسخة)`,
        nameAr: duplicateNameAr || `${original.nameAr} (نسخة)`,
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

    // IDOR protection: verify workflow belongs to user
    const workflow = await WorkflowTemplate.findOne({ _id: id, lawyerId });

    if (!workflow) {
        throw CustomException('نموذج سير العمل غير موجود', 404);
    }

    // Mass assignment protection: only allow specific stage fields
    const allowedStageFields = ['name', 'nameAr', 'color', 'isInitial', 'isFinal', 'requirements'];
    const safeStageInput = pickAllowedFields(req.body, allowedStageFields);

    // Input validation
    if (!safeStageInput.name || typeof safeStageInput.name !== 'string') {
        throw CustomException('اسم المرحلة مطلوب', 400);
    }
    if (!safeStageInput.nameAr || typeof safeStageInput.nameAr !== 'string') {
        throw CustomException('اسم المرحلة بالعربية مطلوب', 400);
    }

    // Sanitize inputs
    safeStageInput.name = sanitizeString(safeStageInput.name);
    safeStageInput.nameAr = sanitizeString(safeStageInput.nameAr);
    if (safeStageInput.color && typeof safeStageInput.color === 'string') {
        safeStageInput.color = sanitizeString(safeStageInput.color);
    }

    const newStage = {
        ...safeStageInput,
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

    // IDOR protection: verify workflow belongs to user
    const workflow = await WorkflowTemplate.findOne({ _id: id, lawyerId });

    if (!workflow) {
        throw CustomException('نموذج سير العمل غير موجود', 404);
    }

    const stage = workflow.stages.id(stageId);
    if (!stage) {
        throw CustomException('المرحلة غير موجودة', 404);
    }

    // Mass assignment protection: only allow specific fields
    const allowedStageFields = ['name', 'nameAr', 'color', 'isInitial', 'isFinal', 'requirements'];
    const safeInput = pickAllowedFields(req.body, allowedStageFields);

    // Input validation and sanitization
    for (const key of Object.keys(safeInput)) {
        if (key === 'name' || key === 'nameAr' || key === 'color') {
            if (typeof safeInput[key] !== 'string') {
                throw CustomException(`${key} يجب أن يكون نصاً`, 400);
            }
            stage[key] = sanitizeString(safeInput[key]);
        } else if (key === 'isInitial' || key === 'isFinal') {
            stage[key] = safeInput[key] === true;
        } else {
            stage[key] = safeInput[key];
        }
    }

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
    const lawyerId = req.userID;

    // Input validation
    const { stageOrder } = req.body;
    if (!stageOrder || !Array.isArray(stageOrder)) {
        throw CustomException('ترتيب المراحل يجب أن يكون مصفوفة', 400);
    }

    // Validate all stage IDs are strings
    for (const stageId of stageOrder) {
        if (typeof stageId !== 'string') {
            throw CustomException('جميع معرفات المراحل يجب أن تكون نصاً', 400);
        }
    }

    // IDOR protection: verify workflow belongs to user
    const workflow = await WorkflowTemplate.findOne({ _id: id, lawyerId });

    if (!workflow) {
        throw CustomException('نموذج سير العمل غير موجود', 404);
    }

    // Validate all stage IDs exist in workflow
    const allStagesValid = stageOrder.every(stageId =>
        workflow.stages.some(stage => stage._id.toString() === stageId)
    );

    if (!allStagesValid || stageOrder.length !== workflow.stages.length) {
        throw CustomException('معرفات المراحل غير صحيحة', 400);
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

    // IDOR protection: verify workflow belongs to user
    const workflow = await WorkflowTemplate.findOne({ _id: id, lawyerId });

    if (!workflow) {
        throw CustomException('نموذج سير العمل غير موجود', 404);
    }

    // Mass assignment protection: only allow specific transition fields
    const allowedTransitionFields = ['fromStageId', 'toStageId', 'conditions', 'isAutomatic'];
    const safeTransitionInput = pickAllowedFields(req.body, allowedTransitionFields);

    // Input validation
    if (!safeTransitionInput.fromStageId || typeof safeTransitionInput.fromStageId !== 'string') {
        throw CustomException('معرف المرحلة المصدر مطلوب', 400);
    }
    if (!safeTransitionInput.toStageId || typeof safeTransitionInput.toStageId !== 'string') {
        throw CustomException('معرف المرحلة الهدف مطلوب', 400);
    }

    // Verify stages exist in workflow
    const fromStage = workflow.stages.id(safeTransitionInput.fromStageId);
    const toStage = workflow.stages.id(safeTransitionInput.toStageId);

    if (!fromStage || !toStage) {
        throw CustomException('إحدى المراحل غير موجودة', 404);
    }

    workflow.transitions.push(safeTransitionInput);
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
    const lawyerId = req.userID;

    // IDOR protection: verify case belongs to user's firm
    const caseDoc = await Case.findOne({ _id: caseId, lawyerId });
    if (!caseDoc) {
        throw CustomException('القضية غير موجودة', 404);
    }

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
    const lawyerId = req.userID;

    // Input validation
    const { stageId, notes } = req.body;
    if (!stageId || typeof stageId !== 'string') {
        throw CustomException('معرف المرحلة مطلوب', 400);
    }

    // IDOR protection: verify case belongs to user
    const caseDoc = await Case.findOne({ _id: caseId, lawyerId });
    if (!caseDoc) {
        throw CustomException('القضية غير موجودة', 404);
    }

    const progress = await CaseStageProgress.findOne({ caseId });

    if (!progress) {
        throw CustomException('لم يتم تهيئة سير العمل لهذه القضية', 404);
    }

    const workflow = await WorkflowTemplate.findById(progress.workflowId);
    const newStage = workflow.stages.id(stageId);

    if (!newStage) {
        throw CustomException('المرحلة غير موجودة', 404);
    }

    // Sanitize notes if provided
    let sanitizedNotes = '';
    if (notes && typeof notes === 'string') {
        sanitizedNotes = sanitizeString(notes);
    }

    await CaseStageProgress.moveToStage(caseId, stageId, newStage.name, lawyerId, sanitizedNotes);

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
    const lawyerId = req.userID;

    // Input validation
    const { stageId, requirementId, metadata } = req.body;
    if (!stageId || typeof stageId !== 'string') {
        throw CustomException('معرف المرحلة مطلوب', 400);
    }
    if (!requirementId || typeof requirementId !== 'string') {
        throw CustomException('معرف المتطلب مطلوب', 400);
    }

    // IDOR protection: verify case belongs to user
    const caseDoc = await Case.findOne({ _id: caseId, lawyerId });
    if (!caseDoc) {
        throw CustomException('القضية غير موجودة', 404);
    }

    // Mass assignment protection for metadata
    let safeMetadata = {};
    if (metadata && typeof metadata === 'object') {
        const allowedMetadataFields = ['notes', 'documentPath', 'timestamp'];
        safeMetadata = pickAllowedFields(metadata, allowedMetadataFields);
        // Sanitize metadata strings
        if (safeMetadata.notes && typeof safeMetadata.notes === 'string') {
            safeMetadata.notes = sanitizeString(safeMetadata.notes);
        }
    }

    const progress = await CaseStageProgress.completeRequirement(
        caseId,
        stageId,
        requirementId,
        lawyerId,
        safeMetadata
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
    // SECURITY: Filter by user's cases only to prevent cross-firm data exposure
    const userCaseIds = await Case.find({ lawyerId }).distinct('_id');
    const casesWithWorkflow = await CaseStageProgress.countDocuments({ caseId: { $in: userCaseIds } });

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

    // Input validation: verify presetId is a string
    if (typeof presetId !== 'string') {
        throw CustomException('معرف النموذج غير صحيح', 400);
    }

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

    // Mass assignment protection: sanitize preset data before creating
    const allowedFields = ['name', 'nameAr', 'caseCategory', 'stages'];
    const safePreset = pickAllowedFields(preset, allowedFields);

    const workflow = await WorkflowTemplate.create({
        lawyerId,
        ...safePreset,
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
