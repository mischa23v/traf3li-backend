/**
 * Task Template Controller
 * Extracted from task.controller.js for maintainability
 * Handles template CRUD operations
 */

const { Task, User, Case } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');

// =============================================================================
// CONSTANTS - Template-specific validation and allowed fields
// =============================================================================

const VALID_PRIORITIES = ['low', 'medium', 'high', 'urgent'];

const ALLOWED_FIELDS = {
    TEMPLATE_CREATE: [
        'title', 'templateName', 'description', 'priority', 'label', 'tags',
        'subtasks', 'checklists', 'timeTracking', 'reminders', 'notes', 'isPublic'
    ],
    TEMPLATE_UPDATE: [
        'title', 'templateName', 'description', 'priority', 'label', 'tags',
        'subtasks', 'checklists', 'timeTracking', 'reminders', 'notes', 'isPublic'
    ],
    TEMPLATE_CREATE_TASK: ['title', 'dueDate', 'dueTime', 'assignedTo', 'caseId', 'clientId', 'notes'],
    SAVE_AS_TEMPLATE: ['templateName', 'isPublic']
};

// =============================================================================
// TEMPLATE FUNCTIONS
// =============================================================================

/**
 * Get all task templates
 * GET /api/tasks/templates
 */
const getTemplates = asyncHandler(async (req, res) => {
    const userId = req.userID;

    const templates = await Task.find({
        isTemplate: true,
        $or: [
            { createdBy: userId },
            { isPublic: true }
        ]
    })
        .populate('createdBy', 'firstName lastName email image')
        .sort({ createdAt: -1 })
        .lean();

    res.status(200).json({
        success: true,
        templates: templates,
        data: templates,
        total: templates.length
    });
});

/**
 * Get a single template by ID
 * GET /api/tasks/templates/:templateId
 */
const getTemplate = asyncHandler(async (req, res) => {
    const { templateId } = req.params;
    const userId = req.userID;

    // IDOR protection
    const sanitizedTemplateId = sanitizeObjectId(templateId);

    const template = await Task.findOne({
        _id: sanitizedTemplateId,
        isTemplate: true,
        $or: [
            { createdBy: userId },
            { isPublic: true }
        ]
    })
        .populate('createdBy', 'firstName lastName email image');

    if (!template) {
        throw CustomException('Template not found', 404);
    }

    res.status(200).json({
        success: true,
        template: template,
        data: template
    });
});

/**
 * Create a new task template
 * POST /api/tasks/templates
 */
const createTemplate = asyncHandler(async (req, res) => {
    const userId = req.userID;

    // Mass assignment protection
    const data = pickAllowedFields(req.body, ALLOWED_FIELDS.TEMPLATE_CREATE);

    const {
        title,
        templateName,
        description,
        priority,
        label,
        tags,
        subtasks,
        checklists,
        timeTracking,
        reminders,
        notes,
        isPublic
    } = data;

    // Input validation
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
        throw CustomException('Template title is required', 400);
    }

    if (priority && !VALID_PRIORITIES.includes(priority)) {
        throw CustomException('Invalid priority value', 400);
    }

    // Use req.addFirmId() for proper tenant isolation
    const template = await Task.create(req.addFirmId({
        title,
        templateName: templateName || title,
        description,
        priority: priority || 'medium',
        status: 'todo',
        label,
        tags,
        subtasks: subtasks?.map(st => ({
            title: st.title,
            completed: false,
            autoReset: st.autoReset || false
        })),
        checklists,
        timeTracking: timeTracking ? {
            estimatedMinutes: timeTracking.estimatedMinutes || 0,
            actualMinutes: 0,
            sessions: []
        } : undefined,
        reminders,
        notes,
        isTemplate: true,
        isPublic: isPublic || false,
        createdBy: userId
    }));

    await template.populate('createdBy', 'firstName lastName email image');

    res.status(201).json({
        success: true,
        template: template,
        data: template,
        message: 'Template created successfully'
    });
});

/**
 * Update a task template
 * PUT /api/tasks/templates/:templateId
 */
const updateTemplate = asyncHandler(async (req, res) => {
    const { templateId } = req.params;
    const userId = req.userID;

    // IDOR protection
    const sanitizedTemplateId = sanitizeObjectId(templateId);

    // Mass assignment protection
    const updates = pickAllowedFields(req.body, ALLOWED_FIELDS.TEMPLATE_UPDATE);

    // Input validation
    if (updates.priority && !VALID_PRIORITIES.includes(updates.priority)) {
        throw CustomException('Invalid priority value', 400);
    }

    const template = await Task.findOne({
        _id: sanitizedTemplateId,
        isTemplate: true,
        createdBy: userId
    });

    if (!template) {
        throw CustomException('Template not found or you do not have permission to update it', 404);
    }

    // Update the template
    Object.assign(template, updates);
    await template.save();

    await template.populate('createdBy', 'firstName lastName email image');

    res.status(200).json({
        success: true,
        template: template,
        data: template,
        message: 'Template updated successfully'
    });
});

/**
 * Delete a task template
 * DELETE /api/tasks/templates/:templateId
 */
const deleteTemplate = asyncHandler(async (req, res) => {
    const { templateId } = req.params;
    const userId = req.userID;

    // IDOR protection
    const sanitizedTemplateId = sanitizeObjectId(templateId);

    const template = await Task.findOneAndDelete({
        _id: sanitizedTemplateId,
        isTemplate: true,
        createdBy: userId
    });

    if (!template) {
        throw CustomException('Template not found or you do not have permission to delete it', 404);
    }

    res.status(200).json({
        success: true,
        message: 'Template deleted successfully'
    });
});

/**
 * Create a new task from a template
 * POST /api/tasks/templates/:templateId/create
 */
const createFromTemplate = asyncHandler(async (req, res) => {
    const { templateId } = req.params;
    const userId = req.userID;

    // IDOR protection
    const sanitizedTemplateId = sanitizeObjectId(templateId);

    // Mass assignment protection
    const data = pickAllowedFields(req.body, ALLOWED_FIELDS.TEMPLATE_CREATE_TASK);

    const {
        title,
        dueDate,
        dueTime,
        assignedTo,
        caseId,
        clientId,
        notes
    } = data;

    // IDOR protection for reference IDs
    const sanitizedAssignedTo = assignedTo ? sanitizeObjectId(assignedTo) : null;
    const sanitizedCaseId = caseId ? sanitizeObjectId(caseId) : null;
    const sanitizedClientId = clientId ? sanitizeObjectId(clientId) : null;

    const template = await Task.findOne({
        _id: sanitizedTemplateId,
        isTemplate: true,
        $or: [
            { createdBy: userId },
            { isPublic: true }
        ]
    });

    if (!template) {
        throw CustomException('Template not found', 404);
    }

    // Validate assignedTo if provided (user lookup by ID is safe)
    if (sanitizedAssignedTo) {
        const assignedUser = await User.findById(sanitizedAssignedTo);
        if (!assignedUser) {
            throw CustomException('Assigned user not found', 404);
        }
    }

    // Validate caseId if provided - use req.firmQuery for proper tenant isolation
    if (sanitizedCaseId) {
        const caseDoc = await Case.findOne({ _id: sanitizedCaseId, ...req.firmQuery });
        if (!caseDoc) {
            throw CustomException('Case not found', 404);
        }
    }

    // Create new task from template - use req.addFirmId for proper tenant isolation
    const taskData = req.addFirmId({
        title: title || template.title,
        description: template.description,
        priority: template.priority,
        status: 'todo',
        label: template.label,
        tags: template.tags ? [...template.tags] : [],
        dueDate,
        dueTime,
        assignedTo: sanitizedAssignedTo || userId,
        caseId: sanitizedCaseId,
        clientId: sanitizedClientId,
        createdBy: userId,
        isTemplate: false,
        templateId: sanitizedTemplateId,
        notes: notes || template.notes,
        timeTracking: template.timeTracking ? {
            estimatedMinutes: template.timeTracking.estimatedMinutes || 0,
            actualMinutes: 0,
            sessions: []
        } : { estimatedMinutes: 0, actualMinutes: 0, sessions: [] },
        // Reset subtasks to incomplete
        subtasks: template.subtasks?.map(st => ({
            title: st.title,
            completed: false,
            autoReset: st.autoReset || false
        })),
        // Reset checklists
        checklists: template.checklists?.map(cl => ({
            title: cl.title,
            items: cl.items?.map(item => ({
                text: item.text,
                completed: false
            }))
        })),
        reminders: template.reminders?.map(r => ({
            type: r.type,
            beforeMinutes: r.beforeMinutes,
            sent: false
        })),
        history: [{
            action: 'created_from_template',
            userId: userId,
            changes: { templateId: sanitizedTemplateId, templateName: template.templateName || template.title },
            timestamp: new Date()
        }]
    });

    const newTask = await Task.create(taskData);

    await newTask.populate([
        { path: 'assignedTo', select: 'firstName lastName image email' },
        { path: 'createdBy', select: 'firstName lastName image' },
        { path: 'caseId', select: 'title caseNumber' }
    ]);

    res.status(201).json({
        success: true,
        task: newTask,
        data: newTask,
        message: 'Task created from template successfully'
    });
});

/**
 * Save an existing task as a template
 * POST /api/tasks/:taskId/save-as-template
 */
const saveAsTemplate = asyncHandler(async (req, res) => {
    const { taskId } = req.params;
    const userId = req.userID;

    // IDOR protection
    const sanitizedTaskId = sanitizeObjectId(taskId);

    // Mass assignment protection
    const data = pickAllowedFields(req.body, ALLOWED_FIELDS.SAVE_AS_TEMPLATE);
    const { templateName, isPublic } = data;

    // Use req.firmQuery for proper tenant isolation (solo lawyers + firm members)
    const task = await Task.findOne({
        _id: sanitizedTaskId,
        ...req.firmQuery,
        $or: [
            { createdBy: userId },
            { assignedTo: userId }
        ]
    });

    if (!task) {
        throw CustomException('Task not found', 404);
    }

    // Create template from task - use req.addFirmId for proper tenant isolation
    const templateData = req.addFirmId({
        title: task.title,
        templateName: templateName || `${task.title} (Template)`,
        description: task.description,
        priority: task.priority,
        status: 'todo',
        label: task.label,
        tags: task.tags ? [...task.tags] : [],
        isTemplate: true,
        isPublic: isPublic || false,
        createdBy: userId,
        notes: task.notes,
        timeTracking: task.timeTracking ? {
            estimatedMinutes: task.timeTracking.estimatedMinutes || 0,
            actualMinutes: 0,
            sessions: []
        } : { estimatedMinutes: 0, actualMinutes: 0, sessions: [] },
        // Reset subtasks
        subtasks: task.subtasks?.map(st => ({
            title: st.title,
            completed: false,
            autoReset: st.autoReset || false
        })),
        // Reset checklists
        checklists: task.checklists?.map(cl => ({
            title: cl.title,
            items: cl.items?.map(item => ({
                text: item.text,
                completed: false
            }))
        })),
        reminders: task.reminders?.map(r => ({
            type: r.type,
            beforeMinutes: r.beforeMinutes,
            sent: false
        }))
    });

    const template = await Task.create(templateData);

    await template.populate('createdBy', 'firstName lastName email image');

    res.status(201).json({
        success: true,
        template: template,
        data: template,
        message: 'Task saved as template successfully'
    });
});

// =============================================================================
// MODULE EXPORTS
// =============================================================================

module.exports = {
    getTemplates,
    getTemplate,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    createFromTemplate,
    saveAsTemplate
};
