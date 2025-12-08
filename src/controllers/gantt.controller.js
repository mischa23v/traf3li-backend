const ganttService = require('../services/gantt.service');
const collaborationService = require('../services/collaboration.service');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');

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
  const firmId = req.firmId;
  const filters = {
    caseId: req.query.caseId,
    assigneeId: req.query.assigneeId,
    status: req.query.status ? req.query.status.split(',') : null,
    dateRange: req.query.startDate && req.query.endDate ? {
      start: req.query.startDate,
      end: req.query.endDate
    } : null
  };

  const ganttData = await ganttService.getGanttData(firmId, filters);

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
  const firmId = req.firmId;
  const { caseId } = req.params;

  const filters = {
    caseId,
    status: req.query.status ? req.query.status.split(',') : null
  };

  const ganttData = await ganttService.getGanttData(firmId, filters);

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
  const firmId = req.firmId;
  const { userId } = req.params;

  const filters = {
    assigneeId: userId,
    status: req.query.status ? req.query.status.split(',') : null,
    dateRange: req.query.startDate && req.query.endDate ? {
      start: req.query.startDate,
      end: req.query.endDate
    } : null
  };

  const ganttData = await ganttService.getGanttData(firmId, filters);

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
  const firmId = req.firmId;
  const filters = req.body;

  const ganttData = await ganttService.getGanttData(firmId, filters);

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

  const hierarchy = await ganttService.getTaskHierarchy(taskId);

  res.status(200).json({
    success: true,
    data: hierarchy
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
  const { startDate, endDate } = req.body;
  const userId = req.userID;

  if (!startDate || !endDate) {
    throw CustomException('Start date and end date are required', 400);
  }

  const updatedTask = await ganttService.updateTaskDates(id, startDate, endDate);

  // Broadcast update to collaborators
  await collaborationService.broadcastGanttUpdate(
    updatedTask.caseId,
    {
      action: 'task_dates_updated',
      taskId: id,
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
  const { duration } = req.body;
  const userId = req.userID;

  if (!duration || duration < 0) {
    throw CustomException('Valid duration is required', 400);
  }

  const updatedTask = await ganttService.updateTaskDuration(id, duration);

  // Broadcast update
  await collaborationService.broadcastGanttUpdate(
    updatedTask.caseId,
    {
      action: 'task_duration_updated',
      taskId: id,
      duration
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
  const { progress } = req.body;
  const userId = req.userID;

  if (progress === undefined || progress < 0 || progress > 100) {
    throw CustomException('Progress must be between 0 and 100', 400);
  }

  const updatedTask = await ganttService.updateTaskProgress(id, progress);

  // Broadcast update
  await collaborationService.broadcastGanttUpdate(
    updatedTask.caseId,
    {
      action: 'task_progress_updated',
      taskId: id,
      progress
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
  const { parentId } = req.body;
  const userId = req.userID;

  const updatedTask = await ganttService.updateTaskParent(id, parentId);

  // Broadcast update
  await collaborationService.broadcastGanttUpdate(
    updatedTask.caseId,
    {
      action: 'task_parent_updated',
      taskId: id,
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
  const { taskIds } = req.body;

  if (!taskIds || !Array.isArray(taskIds)) {
    throw CustomException('Task IDs array is required', 400);
  }

  const reorderedTasks = await ganttService.reorderTasks(taskIds);

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
  const { source, target, type = 0 } = req.body;
  const userId = req.userID;

  if (!source || !target) {
    throw CustomException('Source and target task IDs are required', 400);
  }

  const { sourceTask, targetTask } = await ganttService.createDependency(source, target, type);

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
    data: {
      source: sourceTask,
      target: targetTask
    }
  });
});

/**
 * Delete dependency link
 * DELETE /api/gantt/link/:source/:target
 */
const deleteLink = asyncHandler(async (req, res) => {
  const { source, target } = req.params;
  const userId = req.userID;

  const { sourceTask, targetTask } = await ganttService.removeDependency(source, target);

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

  const chain = await ganttService.getDependencyChain(taskId);

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
  const firmId = req.firmId;

  const dateRange = req.query.startDate && req.query.endDate ? {
    start: req.query.startDate,
    end: req.query.endDate
  } : null;

  const resources = await ganttService.getResourceAllocation(firmId, dateRange);

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

  const workload = await ganttService.getAssigneeWorkload(userId, dateRange);

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

  const conflicts = await ganttService.checkResourceConflicts(userId, startDate, endDate);

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

  const suggestions = await ganttService.suggestOptimalAssignment(taskId);

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
  const { startDate } = req.body;
  const userId = req.userID;

  if (!startDate) {
    throw CustomException('Project start date is required', 400);
  }

  const scheduledTasks = await ganttService.autoSchedule(projectId, startDate);

  // Broadcast update
  await collaborationService.broadcastGanttUpdate(
    projectId,
    {
      action: 'auto_scheduled',
      projectId,
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

  const leveledTasks = await ganttService.levelResources(projectId);

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
  const firmId = req.firmId;

  const milestoneData = {
    ...req.body,
    createdBy: userId,
    firmId
  };

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
