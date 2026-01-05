const ganttService = require('../services/gantt.service');
const collaborationService = require('../services/collaboration.service');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');
const Task = require('../models/task.model');
const Reminder = require('../models/reminder.model');
const Event = require('../models/event.model');
const Case = require('../models/case.model');

/**
 * Gantt Chart Controller
 * Handles all Gantt chart related endpoints
 */

// ═══════════════════════════════════════════════════════════════
// GANTT DATA
// ═══════════════════════════════════════════════════════════════

/**
 * Get Gantt chart data
 * GET /api/gantt/data
 */
const getGanttData = asyncHandler(async (req, res) => {
  const filters = {
    caseId: req.query.caseId,
    assigneeId: req.query.assigneeId,
    status: req.query.status ? req.query.status.split(',') : null,
    dateRange: req.query.startDate && req.query.endDate ? {
      start: req.query.startDate,
      end: req.query.endDate
    } : null
  };

  // Gold standard: Pass firmQuery for proper tenant isolation (solo lawyers + firms)
  const ganttData = await ganttService.getGanttData(req.firmQuery, filters);

  res.status(200).json({
    success: true,
    data: ganttData
  });
});

/**
 * Get Gantt data for a specific case/project
 * GET /api/gantt/data/:caseId
 */
const getGanttDataForCase = asyncHandler(async (req, res) => {
  const { caseId } = req.params;

  // Sanitize and validate caseId
  const sanitizedCaseId = sanitizeObjectId(caseId);
  if (!sanitizedCaseId) {
    throw CustomException('Invalid case ID format', 400);
  }

  // IDOR Protection: Verify case belongs to user's firm/lawyer
  const caseExists = await Case.findOne({ _id: sanitizedCaseId, ...req.firmQuery });
  if (!caseExists) {
    throw CustomException('Case not found or access denied', 404);
  }

  const filters = {
    caseId: sanitizedCaseId,
    status: req.query.status ? req.query.status.split(',') : null
  };

  // Gold standard: Pass firmQuery for proper tenant isolation
  const ganttData = await ganttService.getGanttData(req.firmQuery, filters);

  res.status(200).json({
    success: true,
    data: ganttData
  });
});

/**
 * Get Gantt data by assignee
 * GET /api/gantt/data/assigned/:userId
 */
const getGanttDataByAssignee = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const filters = {
    assigneeId: userId,
    status: req.query.status ? req.query.status.split(',') : null,
    dateRange: req.query.startDate && req.query.endDate ? {
      start: req.query.startDate,
      end: req.query.endDate
    } : null
  };

  // Gold standard: Pass firmQuery for proper tenant isolation
  const ganttData = await ganttService.getGanttData(req.firmQuery, filters);

  res.status(200).json({
    success: true,
    data: ganttData
  });
});

/**
 * Filter Gantt data with complex criteria
 * POST /api/gantt/data/filter
 */
const filterGanttData = asyncHandler(async (req, res) => {
  // Mass assignment protection: Only allow specific filter fields
  const filters = pickAllowedFields(req.body, [
    'caseId',
    'assigneeId',
    'status',
    'priority',
    'dateRange',
    'tags',
    'search'
  ]);

  // Sanitize ObjectIds if present
  if (filters.caseId) {
    filters.caseId = sanitizeObjectId(filters.caseId);
    if (!filters.caseId) {
      throw CustomException('Invalid case ID format', 400);
    }
  }
  if (filters.assigneeId) {
    filters.assigneeId = sanitizeObjectId(filters.assigneeId);
    if (!filters.assigneeId) {
      throw CustomException('Invalid assignee ID format', 400);
    }
  }

  // Gold standard: Pass firmQuery for proper tenant isolation
  const ganttData = await ganttService.getGanttData(req.firmQuery, filters);

  res.status(200).json({
    success: true,
    data: ganttData
  });
});

/**
 * Get task hierarchy
 * GET /api/gantt/hierarchy/:taskId
 */
const getTaskHierarchy = asyncHandler(async (req, res) => {
  const { taskId } = req.params;

  // Sanitize task ID
  const sanitizedTaskId = sanitizeObjectId(taskId);
  if (!sanitizedTaskId) {
    throw CustomException('Invalid task ID format', 400);
  }

  // IDOR Protection: Verify task belongs to user's firm/lawyer (gold standard)
  const task = await Task.findOne({ _id: sanitizedTaskId, ...req.firmQuery });
  if (!task) {
    throw CustomException('Resource not found', 404);
  }

  const hierarchy = await ganttService.getTaskHierarchy(sanitizedTaskId, req.firmQuery);

  res.status(200).json({
    success: true,
    data: hierarchy
  });
});

// ═══════════════════════════════════════════════════════════════
// PRODUCTIVITY DATA (Unified View)
// ═══════════════════════════════════════════════════════════════

/**
 * Get unified productivity data (tasks, reminders, events)
 * GET /api/gantt/productivity
 *
 * Aggregates all productivity data sources into DHTMLX Gantt format
 * for the productivity/Gantt chart view.
 *
 * Query params:
 * - startDate: Filter items starting from this date
 * - endDate: Filter items ending before this date
 */
const getProductivityData = asyncHandler(async (req, res) => {
  const userId = req.userID;
  const { startDate, endDate } = req.query;

  // Build date filters
  const dateFilters = {};
  if (startDate) {
    dateFilters.$gte = new Date(startDate);
  }
  if (endDate) {
    dateFilters.$lte = new Date(endDate);
  }

  // Fetch all data sources in parallel - use req.firmQuery for proper tenant isolation
  // GOLD STANDARD: Spread firmQuery at top level (not inside $and) so globalFirmIsolation plugin detects it
  const [tasks, reminders, events] = await Promise.all([
    // Tasks query - spread firmQuery at top level for plugin detection
    Task.find({
      ...req.firmQuery,
      status: { $ne: 'canceled' },
      isTemplate: { $ne: true },
      ...(Object.keys(dateFilters).length > 0 ? { dueDate: dateFilters } : {})
    })
    .populate('assignedTo', 'name email avatar')
    .populate('caseId', 'title caseNumber')
    .populate('blockedBy', '_id title')
    .sort({ dueDate: 1 }),

    // Reminders query - spread firmQuery + user access check
    Reminder.find({
      ...req.firmQuery,
      $or: [
        { userId: userId },
        { createdBy: userId },
        { delegatedTo: userId }
      ],
      status: { $ne: 'dismissed' },
      ...(Object.keys(dateFilters).length > 0 ? { reminderDateTime: dateFilters } : {})
    })
    .populate('relatedCase', 'title caseNumber')
    .populate('relatedTask', 'title')
    .sort({ reminderDateTime: 1 }),

    // Events query - spread firmQuery at top level for plugin detection
    Event.find({
      ...req.firmQuery,
      status: { $nin: ['canceled', 'cancelled'] },
      ...(Object.keys(dateFilters).length > 0 ? { startDateTime: dateFilters } : {})
    })
    .populate('caseId', 'title caseNumber')
    .populate('organizer', 'name email avatar')
    .sort({ startDateTime: 1 })
  ]);

  // Convert to DHTMLX Gantt format
  const ganttTasks = [];
  const ganttLinks = [];

  // Helper function to format date for Gantt (YYYY-MM-DD HH:mm)
  const formatDate = (date) => {
    if (!date) return null;
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  };

  // Helper function to calculate duration in days
  const calculateDuration = (start, end) => {
    if (!start || !end) return 1;
    const diffTime = Math.abs(new Date(end) - new Date(start));
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
  };

  // Helper function to get task color based on priority
  const getTaskColor = (priority) => {
    const colors = {
      critical: '#ef4444', // red
      urgent: '#ef4444',   // red
      high: '#f97316',     // orange
      medium: '#10b981',   // green
      low: '#64748b'       // gray
    };
    return colors[priority] || '#10b981';
  };

  // Add tasks
  tasks.forEach(task => {
    const startDate = task.startDate || task.createdAt;
    const endDate = task.dueDate || new Date(startDate.getTime() + 24 * 60 * 60 * 1000);
    const isOverdue = task.status !== 'done' && task.dueDate && new Date(task.dueDate) < new Date();

    ganttTasks.push({
      id: `task_${task._id}`,
      text: task.title || task.description,
      start_date: formatDate(startDate),
      end_date: formatDate(endDate),
      duration: calculateDuration(startDate, endDate),
      progress: (task.progress || 0) / 100,
      type: task.subtasks && task.subtasks.length > 0 ? 'project' : 'task',
      priority: task.priority,
      status: task.status,
      assignee: task.assignedTo?.name || null,
      assigneeId: task.assignedTo?._id?.toString() || null,
      color: isOverdue ? '#ef4444' : getTaskColor(task.priority),
      textColor: '#ffffff',
      sourceType: 'task',
      sourceId: task._id.toString(),
      caseId: task.caseId?._id?.toString() || null,
      caseName: task.caseId?.title || task.caseId?.caseNumber || null,
      isOverdue,
      isCritical: task.priority === 'critical' || task.priority === 'urgent',
      subtaskCount: task.subtasks?.length || 0,
      completedSubtaskCount: task.subtasks?.filter(st => st.completed).length || 0
    });
  });

  // Add reminders as milestones
  reminders.forEach(reminder => {
    ganttTasks.push({
      id: `reminder_${reminder._id}`,
      text: `🔔 ${reminder.title}`,
      start_date: formatDate(reminder.reminderDateTime),
      end_date: formatDate(reminder.reminderDateTime),
      duration: 0, // Milestone
      progress: reminder.status === 'completed' ? 1 : 0,
      type: 'milestone',
      priority: reminder.priority,
      status: reminder.status,
      color: '#f59e0b', // Amber for reminders
      textColor: '#ffffff',
      sourceType: 'reminder',
      sourceId: reminder._id.toString(),
      caseId: reminder.relatedCase?._id?.toString() || null,
      caseName: reminder.relatedCase?.title || reminder.relatedCase?.caseNumber || null,
      relatedTaskId: reminder.relatedTask?._id?.toString() || null
    });
  });

  // Add events
  events.forEach(event => {
    const startDate = event.startDateTime || event.startDate;
    const endDate = event.endDateTime || event.endDate || startDate;
    const duration = calculateDuration(startDate, endDate);

    ganttTasks.push({
      id: `event_${event._id}`,
      text: `📅 ${event.title}`,
      start_date: formatDate(startDate),
      end_date: formatDate(endDate),
      duration: duration,
      progress: event.status === 'completed' ? 1 : 0,
      type: event.allDay ? 'project' : (duration === 0 ? 'milestone' : 'task'),
      priority: event.priority,
      status: event.status,
      eventType: event.type,
      color: event.color || '#3b82f6', // Blue for events
      textColor: '#ffffff',
      sourceType: 'event',
      sourceId: event._id.toString(),
      caseId: event.caseId?._id?.toString() || null,
      caseName: event.caseId?.title || event.caseId?.caseNumber || null,
      organizer: event.organizer?.name || null,
      isAllDay: event.allDay,
      location: event.location?.name || event.locationString || null
    });
  });

  // Add links (dependencies between tasks)
  let linkId = 1;
  tasks.forEach(task => {
    // Process blockedBy relationships
    if (task.blockedBy && task.blockedBy.length > 0) {
      task.blockedBy.forEach(blocker => {
        const blockerId = blocker._id?.toString() || blocker.toString();
        ganttLinks.push({
          id: linkId++,
          source: `task_${blockerId}`,
          target: `task_${task._id}`,
          type: '0' // 0 = finish-to-start
        });
      });
    }

    // Process dependencies array
    if (task.dependencies && task.dependencies.length > 0) {
      task.dependencies.forEach(dep => {
        if (dep.type === 'blocked_by') {
          ganttLinks.push({
            id: linkId++,
            source: `task_${dep.taskId.toString()}`,
            target: `task_${task._id}`,
            type: '0'
          });
        }
      });
    }
  });

  // Remove duplicate links
  const uniqueLinks = [];
  const linkSet = new Set();
  ganttLinks.forEach(link => {
    const key = `${link.source}-${link.target}-${link.type}`;
    if (!linkSet.has(key)) {
      linkSet.add(key);
      uniqueLinks.push(link);
    }
  });

  // Calculate summary statistics
  const summary = {
    totalItems: ganttTasks.length,
    tasks: {
      total: tasks.length,
      completed: tasks.filter(t => t.status === 'done').length,
      inProgress: tasks.filter(t => t.status === 'in_progress').length,
      overdue: tasks.filter(t => t.status !== 'done' && t.dueDate && new Date(t.dueDate) < new Date()).length
    },
    reminders: {
      total: reminders.length,
      pending: reminders.filter(r => r.status === 'pending').length,
      completed: reminders.filter(r => r.status === 'completed').length
    },
    events: {
      total: events.length,
      upcoming: events.filter(e => new Date(e.startDateTime || e.startDate) > new Date()).length,
      completed: events.filter(e => e.status === 'completed').length
    }
  };

  res.status(200).json({
    success: true,
    data: ganttTasks,
    links: uniqueLinks,
    collections: {
      // Gold Standard: Match actual model enums exactly
      priorities: ['none', 'low', 'medium', 'high', 'critical'], // from task.model.js
      types: ['task', 'reminder', 'event'],
      statuses: {
        task: ['backlog', 'todo', 'in_progress', 'done', 'canceled'], // from task.model.js
        reminder: ['pending', 'snoozed', 'completed', 'dismissed', 'delegated'],
        event: ['scheduled', 'confirmed', 'tentative', 'canceled', 'postponed', 'completed', 'in_progress', 'rescheduled']
      }
    },
    summary
  });
});

// ═══════════════════════════════════════════════════════════════
// TASK OPERATIONS (from Gantt UI)
// ═══════════════════════════════════════════════════════════════

/**
 * Update task dates (drag-drop in Gantt)
 * PUT /api/gantt/task/:id/dates
 */
const updateTaskDates = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.userID;

  // Sanitize task ID
  const sanitizedTaskId = sanitizeObjectId(id);
  if (!sanitizedTaskId) {
    throw CustomException('Invalid task ID format', 400);
  }

  // Mass assignment protection: Only allow date fields
  const safeData = pickAllowedFields(req.body, ['startDate', 'endDate']);
  const { startDate, endDate } = safeData;

  // Input validation
  if (!startDate || !endDate) {
    throw CustomException('Start date and end date are required', 400);
  }

  // Validate date formats
  const startDateObj = new Date(startDate);
  const endDateObj = new Date(endDate);

  if (isNaN(startDateObj.getTime())) {
    throw CustomException('Invalid start date format', 400);
  }
  if (isNaN(endDateObj.getTime())) {
    throw CustomException('Invalid end date format', 400);
  }
  if (endDateObj < startDateObj) {
    throw CustomException('End date must be after start date', 400);
  }

  // IDOR Protection: Verify task belongs to user's firm/lawyer (gold standard)
  const task = await Task.findOne({ _id: sanitizedTaskId, ...req.firmQuery });
  if (!task) {
    throw CustomException('Resource not found', 404);
  }

  const updatedTask = await ganttService.updateTaskDates(sanitizedTaskId, startDate, endDate, req.firmQuery);

  // Broadcast update to collaborators
  await collaborationService.broadcastGanttUpdate(
    updatedTask.caseId,
    {
      action: 'task_dates_updated',
      taskId: sanitizedTaskId,
      startDate,
      endDate
    },
    userId
  );

  res.status(200).json({
    success: true,
    message: 'Task dates updated successfully',
    data: updatedTask
  });
});

/**
 * Update task duration
 * PUT /api/gantt/task/:id/duration
 */
const updateTaskDuration = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.userID;

  // Sanitize task ID
  const sanitizedTaskId = sanitizeObjectId(id);
  if (!sanitizedTaskId) {
    throw CustomException('Invalid task ID format', 400);
  }

  // Mass assignment protection: Only allow duration field
  const safeData = pickAllowedFields(req.body, ['duration']);
  const { duration } = safeData;

  // Input validation
  if (duration === undefined || duration === null || duration < 0) {
    throw CustomException('Valid duration is required (must be >= 0)', 400);
  }

  // Validate duration is a number
  const durationNum = Number(duration);
  if (isNaN(durationNum) || durationNum < 0) {
    throw CustomException('Duration must be a valid positive number', 400);
  }

  // IDOR Protection: Verify task belongs to user's firm/lawyer (gold standard)
  const task = await Task.findOne({ _id: sanitizedTaskId, ...req.firmQuery });
  if (!task) {
    throw CustomException('Resource not found', 404);
  }

  const updatedTask = await ganttService.updateTaskDuration(sanitizedTaskId, durationNum, req.firmQuery);

  // Broadcast update
  await collaborationService.broadcastGanttUpdate(
    updatedTask.caseId,
    {
      action: 'task_duration_updated',
      taskId: sanitizedTaskId,
      duration: durationNum
    },
    userId
  );

  res.status(200).json({
    success: true,
    message: 'Task duration updated successfully',
    data: updatedTask
  });
});

/**
 * Update task progress
 * PUT /api/gantt/task/:id/progress
 */
const updateTaskProgress = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.userID;

  // Sanitize task ID
  const sanitizedTaskId = sanitizeObjectId(id);
  if (!sanitizedTaskId) {
    throw CustomException('Invalid task ID format', 400);
  }

  // Mass assignment protection: Only allow progress field
  const safeData = pickAllowedFields(req.body, ['progress']);
  const { progress } = safeData;

  // Input validation
  if (progress === undefined || progress === null) {
    throw CustomException('Progress is required', 400);
  }

  const progressNum = Number(progress);
  if (isNaN(progressNum) || progressNum < 0 || progressNum > 100) {
    throw CustomException('Progress must be a number between 0 and 100', 400);
  }

  // IDOR Protection: Verify task belongs to user's firm/lawyer (gold standard)
  const task = await Task.findOne({ _id: sanitizedTaskId, ...req.firmQuery });
  if (!task) {
    throw CustomException('Resource not found', 404);
  }

  const updatedTask = await ganttService.updateTaskProgress(sanitizedTaskId, progressNum, req.firmQuery);

  // Broadcast update
  await collaborationService.broadcastGanttUpdate(
    updatedTask.caseId,
    {
      action: 'task_progress_updated',
      taskId: sanitizedTaskId,
      progress: progressNum
    },
    userId
  );

  res.status(200).json({
    success: true,
    message: 'Task progress updated successfully',
    data: updatedTask
  });
});

/**
 * Update task parent (change hierarchy)
 * PUT /api/gantt/task/:id/parent
 */
const updateTaskParent = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.userID;

  // Sanitize task ID
  const sanitizedTaskId = sanitizeObjectId(id);
  if (!sanitizedTaskId) {
    throw CustomException('Invalid task ID format', 400);
  }

  // Mass assignment protection: Only allow parentId field
  const safeData = pickAllowedFields(req.body, ['parentId']);
  let { parentId } = safeData;

  // Sanitize parentId if provided
  if (parentId) {
    parentId = sanitizeObjectId(parentId);
    if (!parentId) {
      throw CustomException('Invalid parent task ID format', 400);
    }
  }

  // IDOR Protection: Verify task belongs to user's firm/lawyer (gold standard)
  const task = await Task.findOne({ _id: sanitizedTaskId, ...req.firmQuery });
  if (!task) {
    throw CustomException('Resource not found', 404);
  }

  // If parentId is provided, verify it belongs to the same firm/lawyer
  if (parentId) {
    const parentTask = await Task.findOne({ _id: parentId, ...req.firmQuery });
    if (!parentTask) {
      throw CustomException('Resource not found', 404);
    }
    // Verify both tasks belong to the same case
    if (task.caseId && parentTask.caseId && task.caseId.toString() !== parentTask.caseId.toString()) {
      throw CustomException('Task and parent task must belong to the same case', 400);
    }
  }

  const updatedTask = await ganttService.updateTaskParent(sanitizedTaskId, parentId, req.firmQuery);

  // Broadcast update
  await collaborationService.broadcastGanttUpdate(
    updatedTask.caseId,
    {
      action: 'task_parent_updated',
      taskId: sanitizedTaskId,
      parentId
    },
    userId
  );

  res.status(200).json({
    success: true,
    message: 'Task parent updated successfully',
    data: updatedTask
  });
});

/**
 * Reorder tasks
 * POST /api/gantt/task/:id/reorder
 */
const reorderTasks = asyncHandler(async (req, res) => {
  // Mass assignment protection: Only allow taskIds field
  const safeData = pickAllowedFields(req.body, ['taskIds']);
  const { taskIds } = safeData;

  // Input validation
  if (!taskIds || !Array.isArray(taskIds)) {
    throw CustomException('Task IDs array is required', 400);
  }

  if (taskIds.length === 0) {
    throw CustomException('Task IDs array cannot be empty', 400);
  }

  // Sanitize all task IDs
  const sanitizedTaskIds = taskIds.map(id => sanitizeObjectId(id)).filter(Boolean);

  if (sanitizedTaskIds.length !== taskIds.length) {
    throw CustomException('One or more task IDs have invalid format', 400);
  }

  // IDOR Protection: Verify all tasks belong to user's firm/lawyer (gold standard)
  const tasks = await Task.find({ _id: { $in: sanitizedTaskIds }, ...req.firmQuery });

  if (tasks.length !== sanitizedTaskIds.length) {
    throw CustomException('Resource not found', 404);
  }

  const reorderedTasks = await ganttService.reorderTasks(sanitizedTaskIds);

  res.status(200).json({
    success: true,
    message: 'Tasks reordered successfully',
    data: reorderedTasks
  });
});

// ═══════════════════════════════════════════════════════════════
// DEPENDENCIES/LINKS
// ═══════════════════════════════════════════════════════════════

/**
 * Create dependency link between tasks
 * POST /api/gantt/link
 */
const createLink = asyncHandler(async (req, res) => {
  const userId = req.userID;

  // Mass assignment protection: Only allow specific fields
  const safeData = pickAllowedFields(req.body, ['source', 'target', 'type']);
  let { source, target, type = 0 } = safeData;

  // Input validation
  if (!source || !target) {
    throw CustomException('Source and target task IDs are required', 400);
  }

  // Sanitize task IDs
  source = sanitizeObjectId(source);
  if (!source) {
    throw CustomException('Invalid source task ID format', 400);
  }

  target = sanitizeObjectId(target);
  if (!target) {
    throw CustomException('Invalid target task ID format', 400);
  }

  // Prevent self-referencing dependency
  if (source === target) {
    throw CustomException('A task cannot depend on itself', 400);
  }

  // Validate dependency type
  const validTypes = [0, 1, 2, 3]; // 0: finish-to-start, 1: start-to-start, 2: finish-to-finish, 3: start-to-finish
  if (!validTypes.includes(Number(type))) {
    throw CustomException('Invalid dependency type. Must be 0, 1, 2, or 3', 400);
  }

  // IDOR Protection: Verify both tasks belong to user's firm/lawyer (gold standard)
  const sourceTask = await Task.findOne({ _id: source, ...req.firmQuery });
  if (!sourceTask) {
    throw CustomException('Resource not found', 404);
  }

  const targetTask = await Task.findOne({ _id: target, ...req.firmQuery });
  if (!targetTask) {
    throw CustomException('Resource not found', 404);
  }

  // Verify both tasks belong to the same case
  if (sourceTask.caseId && targetTask.caseId && sourceTask.caseId.toString() !== targetTask.caseId.toString()) {
    throw CustomException('Source and target tasks must belong to the same case', 400);
  }

  const result = await ganttService.createDependency(source, target, type, req.firmQuery);

  // Broadcast update
  await collaborationService.broadcastGanttUpdate(
    sourceTask.caseId,
    {
      action: 'link_created',
      source,
      target,
      type
    },
    userId
  );

  res.status(201).json({
    success: true,
    message: 'Dependency link created successfully',
    data: result
  });
});

/**
 * Delete dependency link
 * DELETE /api/gantt/link/:source/:target
 */
const deleteLink = asyncHandler(async (req, res) => {
  let { source, target } = req.params;
  const userId = req.userID;

  // Sanitize task IDs
  source = sanitizeObjectId(source);
  if (!source) {
    throw CustomException('Invalid source task ID format', 400);
  }

  target = sanitizeObjectId(target);
  if (!target) {
    throw CustomException('Invalid target task ID format', 400);
  }

  // IDOR Protection: Verify both tasks belong to user's firm/lawyer (gold standard)
  const sourceTask = await Task.findOne({ _id: source, ...req.firmQuery });
  if (!sourceTask) {
    throw CustomException('Resource not found', 404);
  }

  const targetTask = await Task.findOne({ _id: target, ...req.firmQuery });
  if (!targetTask) {
    throw CustomException('Resource not found', 404);
  }

  const result = await ganttService.removeDependency(source, target, req.firmQuery);

  // Broadcast update
  await collaborationService.broadcastGanttUpdate(
    sourceTask.caseId,
    {
      action: 'link_deleted',
      source,
      target
    },
    userId
  );

  res.status(200).json({
    success: true,
    message: 'Dependency link removed successfully'
  });
});

/**
 * Get dependency chain for a task
 * GET /api/gantt/dependencies/:taskId
 */
const getDependencyChain = asyncHandler(async (req, res) => {
  const { taskId } = req.params;

  // Sanitize task ID
  const sanitizedTaskId = sanitizeObjectId(taskId);
  if (!sanitizedTaskId) {
    throw CustomException('Invalid task ID format', 400);
  }

  // IDOR Protection: Verify task belongs to user's firm/lawyer (gold standard)
  const task = await Task.findOne({ _id: sanitizedTaskId, ...req.firmQuery });
  if (!task) {
    throw CustomException('Resource not found', 404);
  }

  const chain = await ganttService.getDependencyChain(sanitizedTaskId, req.firmQuery);

  res.status(200).json({
    success: true,
    data: chain
  });
});

// ═══════════════════════════════════════════════════════════════
// CRITICAL PATH
// ═══════════════════════════════════════════════════════════════

/**
 * Calculate critical path for project
 * GET /api/gantt/critical-path/:projectId
 */
const getCriticalPath = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  const criticalPath = await ganttService.calculateCriticalPath(projectId);

  res.status(200).json({
    success: true,
    data: {
      projectId,
      criticalPath
    }
  });
});

/**
 * Get slack time for a task
 * GET /api/gantt/slack/:taskId
 */
const getSlackTime = asyncHandler(async (req, res) => {
  const { taskId } = req.params;

  const slackTime = await ganttService.calculateSlackTime(taskId);

  res.status(200).json({
    success: true,
    data: {
      taskId,
      slackTime
    }
  });
});

/**
 * Get bottleneck tasks
 * GET /api/gantt/bottlenecks/:projectId
 */
const getBottlenecks = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  const bottlenecks = await ganttService.identifyBottlenecks(projectId);

  res.status(200).json({
    success: true,
    data: bottlenecks
  });
});

/**
 * Get project timeline
 * GET /api/gantt/timeline/:projectId
 */
const getProjectTimeline = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  const timeline = await ganttService.getProjectTimeline(projectId);

  res.status(200).json({
    success: true,
    data: timeline
  });
});

// ═══════════════════════════════════════════════════════════════
// RESOURCE MANAGEMENT
// ═══════════════════════════════════════════════════════════════

/**
 * Get resource allocation
 * GET /api/gantt/resources
 */
const getResourceAllocation = asyncHandler(async (req, res) => {
  const dateRange = req.query.startDate && req.query.endDate ? {
    start: req.query.startDate,
    end: req.query.endDate
  } : null;

  // Gold standard: Pass firmQuery for proper tenant isolation
  const resources = await ganttService.getResourceAllocation(req.firmQuery, dateRange);

  res.status(200).json({
    success: true,
    data: resources
  });
});

/**
 * Get user workload
 * GET /api/gantt/resources/:userId/workload
 */
const getUserWorkload = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const dateRange = req.query.startDate && req.query.endDate ? {
    start: req.query.startDate,
    end: req.query.endDate
  } : null;

  // Gold standard: Pass firmQuery for proper tenant isolation (solo lawyers + firms)
  const workload = await ganttService.getAssigneeWorkload(userId, req.firmQuery, dateRange);

  res.status(200).json({
    success: true,
    data: workload
  });
});

/**
 * Check for resource conflicts
 * GET /api/gantt/resources/conflicts
 */
const getResourceConflicts = asyncHandler(async (req, res) => {
  const { userId, startDate, endDate } = req.query;

  if (!userId || !startDate || !endDate) {
    throw CustomException('User ID, start date, and end date are required', 400);
  }

  // Gold standard: Pass firmQuery for proper tenant isolation (solo lawyers + firms)
  const conflicts = await ganttService.checkResourceConflicts(userId, req.firmQuery, startDate, endDate);

  res.status(200).json({
    success: true,
    data: conflicts
  });
});

/**
 * Suggest optimal assignee for a task
 * POST /api/gantt/resources/suggest
 */
const suggestAssignee = asyncHandler(async (req, res) => {
  const { taskId } = req.body;

  if (!taskId) {
    throw CustomException('Task ID is required', 400);
  }

  // Gold standard: Pass firmQuery for proper tenant isolation (solo lawyers + firms)
  const suggestions = await ganttService.suggestOptimalAssignment(taskId, req.firmQuery);

  res.status(200).json({
    success: true,
    data: suggestions
  });
});

// ═══════════════════════════════════════════════════════════════
// BASELINES
// ═══════════════════════════════════════════════════════════════

/**
 * Create baseline for project
 * POST /api/gantt/baseline/:projectId
 */
const createBaseline = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  const baseline = await ganttService.createBaseline(projectId);

  res.status(201).json({
    success: true,
    message: 'Baseline created successfully',
    data: baseline
  });
});

/**
 * Get baseline for project
 * GET /api/gantt/baseline/:projectId
 */
const getBaseline = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  const baseline = await ganttService.getBaseline(projectId);

  if (!baseline) {
    throw CustomException('No baseline found for this project', 404);
  }

  res.status(200).json({
    success: true,
    data: baseline
  });
});

/**
 * Compare current project to baseline
 * GET /api/gantt/baseline/:projectId/compare
 */
const compareToBaseline = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  const comparison = await ganttService.compareToBaseline(projectId);

  res.status(200).json({
    success: true,
    data: comparison
  });
});

// ═══════════════════════════════════════════════════════════════
// AUTO-SCHEDULING
// ═══════════════════════════════════════════════════════════════

/**
 * Auto-schedule all tasks in project
 * POST /api/gantt/auto-schedule/:projectId
 */
const autoSchedule = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const userId = req.userID;

  // Sanitize project/case ID
  const sanitizedProjectId = sanitizeObjectId(projectId);
  if (!sanitizedProjectId) {
    throw CustomException('Invalid project ID format', 400);
  }

  // Mass assignment protection: Only allow startDate field
  const safeData = pickAllowedFields(req.body, ['startDate']);
  const { startDate } = safeData;

  // Input validation
  if (!startDate) {
    throw CustomException('Project start date is required', 400);
  }

  // Validate start date format
  const startDateObj = new Date(startDate);
  if (isNaN(startDateObj.getTime())) {
    throw CustomException('Invalid start date format', 400);
  }

  // IDOR Protection: Verify project/case belongs to user's firm/lawyer (gold standard)
  const caseExists = await Case.findOne({ _id: sanitizedProjectId, ...req.firmQuery });
  if (!caseExists) {
    throw CustomException('Project not found or access denied', 404);
  }

  const scheduledTasks = await ganttService.autoSchedule(sanitizedProjectId, startDate, req.firmQuery);

  // Broadcast update
  await collaborationService.broadcastGanttUpdate(
    sanitizedProjectId,
    {
      action: 'auto_scheduled',
      projectId: sanitizedProjectId,
      startDate
    },
    userId
  );

  res.status(200).json({
    success: true,
    message: 'Project auto-scheduled successfully',
    data: scheduledTasks
  });
});

/**
 * Level resources (redistribute tasks)
 * POST /api/gantt/level-resources/:projectId
 */
const levelResources = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const userId = req.userID;

  // Sanitize project ID
  const sanitizedProjectId = sanitizeObjectId(projectId, 'projectId');

  // Gold standard: pass req.firmQuery for tenant isolation
  const leveledTasks = await ganttService.levelResources(sanitizedProjectId, req.firmQuery);

  // Broadcast update
  await collaborationService.broadcastGanttUpdate(
    projectId,
    {
      action: 'resources_leveled',
      projectId
    },
    userId
  );

  res.status(200).json({
    success: true,
    message: 'Resources leveled successfully',
    data: leveledTasks
  });
});

// ═══════════════════════════════════════════════════════════════
// MILESTONES
// ═══════════════════════════════════════════════════════════════

/**
 * Create milestone
 * POST /api/gantt/milestone
 */
const createMilestone = asyncHandler(async (req, res) => {
  const userId = req.userID;

  // Mass assignment protection: Only allow specific milestone fields
  const safeData = pickAllowedFields(req.body, [
    'title',
    'description',
    'dueDate',
    'caseId',
    'projectId',
    'priority',
    'status',
    'tags',
    'color'
  ]);

  // Sanitize caseId if provided
  if (safeData.caseId) {
    safeData.caseId = sanitizeObjectId(safeData.caseId);
    if (!safeData.caseId) {
      throw CustomException('Invalid case ID format', 400);
    }

    // IDOR Protection: Verify case belongs to user's firm/lawyer (gold standard)
    const caseExists = await Case.findOne({ _id: safeData.caseId, ...req.firmQuery });
    if (!caseExists) {
      throw CustomException('Case not found or access denied', 404);
    }
  }

  // Sanitize projectId if provided
  if (safeData.projectId) {
    safeData.projectId = sanitizeObjectId(safeData.projectId);
    if (!safeData.projectId) {
      throw CustomException('Invalid project ID format', 400);
    }
  }

  // Validate dueDate if provided
  if (safeData.dueDate) {
    const dueDateObj = new Date(safeData.dueDate);
    if (isNaN(dueDateObj.getTime())) {
      throw CustomException('Invalid due date format', 400);
    }
  }

  // Gold standard: Use req.addFirmId() for creating records with proper tenant context
  const milestoneData = req.addFirmId({
    ...safeData,
    createdBy: userId
  });

  const milestone = await ganttService.createMilestone(milestoneData);

  res.status(201).json({
    success: true,
    message: 'Milestone created successfully',
    data: milestone
  });
});

/**
 * Get milestones for project
 * GET /api/gantt/milestones/:projectId
 */
const getMilestones = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  const milestones = await ganttService.getMilestones(projectId);

  res.status(200).json({
    success: true,
    data: milestones
  });
});

// ═══════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════

/**
 * Export to MS Project XML
 * GET /api/gantt/export/:projectId/msproject
 */
const exportToMSProject = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  const xml = await ganttService.exportToMSProject(projectId);

  res.setHeader('Content-Type', 'application/xml');
  res.setHeader('Content-Disposition', `attachment; filename="project_${projectId}.xml"`);
  res.status(200).send(xml);
});

/**
 * Export to PDF
 * GET /api/gantt/export/:projectId/pdf
 */
const exportToPDF = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  try {
    const pdf = await ganttService.exportToPDF(projectId, req.query);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="project_${projectId}.pdf"`);
    res.status(200).send(pdf);
  } catch (error) {
    throw CustomException('PDF export is not yet implemented', 501);
  }
});

/**
 * Export to Excel
 * GET /api/gantt/export/:projectId/excel
 */
const exportToExcel = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  const excelData = await ganttService.exportToExcel(projectId);

  res.status(200).json({
    success: true,
    data: excelData
  });
});

// ═══════════════════════════════════════════════════════════════
// COLLABORATION
// ═══════════════════════════════════════════════════════════════

/**
 * Get active users for a resource
 * GET /api/collaboration/presence/:resourceId
 */
const getActiveUsers = asyncHandler(async (req, res) => {
  const { resourceId } = req.params;

  const activeUsers = await collaborationService.getActiveUsers(resourceId);

  res.status(200).json({
    success: true,
    data: activeUsers
  });
});

/**
 * Update user presence
 * POST /api/collaboration/presence
 */
const updatePresence = asyncHandler(async (req, res) => {
  const userId = req.userID;
  const { location } = req.body;

  if (!location || !location.type || !location.id) {
    throw CustomException('Valid location object is required', 400);
  }

  const presence = await collaborationService.updatePresence(userId, location);

  res.status(200).json({
    success: true,
    data: presence
  });
});

/**
 * Get recent activities for firm
 * GET /api/collaboration/activities/:firmId
 */
const getRecentActivities = asyncHandler(async (req, res) => {
  const { firmId } = req.params;
  const limit = parseInt(req.query.limit) || 50;

  const activities = await collaborationService.getRecentActivities(firmId, limit);

  res.status(200).json({
    success: true,
    data: activities
  });
});

/**
 * Get collaboration stats
 * GET /api/collaboration/stats
 */
const getCollaborationStats = asyncHandler(async (req, res) => {
  const stats = await collaborationService.getStats();

  res.status(200).json({
    success: true,
    data: stats
  });
});

module.exports = {
  // Gantt Data
  getGanttData,
  getGanttDataForCase,
  getGanttDataByAssignee,
  filterGanttData,
  getTaskHierarchy,

  // Productivity (Unified View)
  getProductivityData,

  // Task Operations
  updateTaskDates,
  updateTaskDuration,
  updateTaskProgress,
  updateTaskParent,
  reorderTasks,

  // Dependencies
  createLink,
  deleteLink,
  getDependencyChain,

  // Critical Path
  getCriticalPath,
  getSlackTime,
  getBottlenecks,
  getProjectTimeline,

  // Resources
  getResourceAllocation,
  getUserWorkload,
  getResourceConflicts,
  suggestAssignee,

  // Baselines
  createBaseline,
  getBaseline,
  compareToBaseline,

  // Auto-scheduling
  autoSchedule,
  levelResources,

  // Milestones
  createMilestone,
  getMilestones,

  // Export
  exportToMSProject,
  exportToPDF,
  exportToExcel,

  // Collaboration
  getActiveUsers,
  updatePresence,
  getRecentActivities,
  getCollaborationStats
};
