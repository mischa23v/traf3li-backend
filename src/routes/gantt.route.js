const express = require('express');
const { userMiddleware } = require('../middlewares');
const {
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
} = require('../controllers/gantt.controller');

const router = express.Router();

// ═══════════════════════════════════════════════════════════════
// GANTT DATA ROUTES
// ═══════════════════════════════════════════════════════════════

// Get unified productivity data (tasks, reminders, events)
// This endpoint aggregates all data sources for the productivity Gantt view
router.get('/productivity', userMiddleware, getProductivityData);

// Filter with complex criteria (must be before parameterized routes)
router.post('/data/filter', userMiddleware, filterGanttData);

// Get all gantt data for firm
router.get('/data', userMiddleware, getGanttData);

// Get gantt data for specific case/project
router.get('/data/case/:caseId', userMiddleware, getGanttDataForCase);

// Get gantt data by assignee
router.get('/data/assigned/:userId', userMiddleware, getGanttDataByAssignee);

// Get task hierarchy
router.get('/hierarchy/:taskId', userMiddleware, getTaskHierarchy);

// ═══════════════════════════════════════════════════════════════
// TASK OPERATIONS (from Gantt UI)
// ═══════════════════════════════════════════════════════════════

// Update task dates (drag-drop)
router.put('/task/:id/dates', userMiddleware, updateTaskDates);

// Update task duration
router.put('/task/:id/duration', userMiddleware, updateTaskDuration);

// Update task progress
router.put('/task/:id/progress', userMiddleware, updateTaskProgress);

// Change task parent (hierarchy)
router.put('/task/:id/parent', userMiddleware, updateTaskParent);

// Reorder tasks
router.post('/task/reorder', userMiddleware, reorderTasks);

// ═══════════════════════════════════════════════════════════════
// DEPENDENCIES/LINKS
// ═══════════════════════════════════════════════════════════════

// Get dependency chain for task
router.get('/dependencies/:taskId', userMiddleware, getDependencyChain);

// Create dependency link
router.post('/link', userMiddleware, createLink);

// Delete dependency link
router.delete('/link/:source/:target', userMiddleware, deleteLink);

// ═══════════════════════════════════════════════════════════════
// CRITICAL PATH ANALYSIS
// ═══════════════════════════════════════════════════════════════

// Get critical path for project
router.get('/critical-path/:projectId', userMiddleware, getCriticalPath);

// Get slack time for task
router.get('/slack/:taskId', userMiddleware, getSlackTime);

// Get bottleneck tasks
router.get('/bottlenecks/:projectId', userMiddleware, getBottlenecks);

// Get project timeline summary
router.get('/timeline/:projectId', userMiddleware, getProjectTimeline);

// ═══════════════════════════════════════════════════════════════
// RESOURCE MANAGEMENT
// ═══════════════════════════════════════════════════════════════

// Get resource allocation overview
router.get('/resources', userMiddleware, getResourceAllocation);

// Check for resource conflicts
router.get('/resources/conflicts', userMiddleware, getResourceConflicts);

// Suggest optimal assignee for task
router.post('/resources/suggest', userMiddleware, suggestAssignee);

// Get specific user workload
router.get('/resources/:userId/workload', userMiddleware, getUserWorkload);

// ═══════════════════════════════════════════════════════════════
// BASELINES
// ═══════════════════════════════════════════════════════════════

// Create baseline for project
router.post('/baseline/:projectId', userMiddleware, createBaseline);

// Get baseline for project
router.get('/baseline/:projectId', userMiddleware, getBaseline);

// Compare current to baseline
router.get('/baseline/:projectId/compare', userMiddleware, compareToBaseline);

// ═══════════════════════════════════════════════════════════════
// AUTO-SCHEDULING
// ═══════════════════════════════════════════════════════════════

// Auto-schedule project
router.post('/auto-schedule/:projectId', userMiddleware, autoSchedule);

// Level resources
router.post('/level-resources/:projectId', userMiddleware, levelResources);

// ═══════════════════════════════════════════════════════════════
// MILESTONES
// ═══════════════════════════════════════════════════════════════

// Create milestone
router.post('/milestone', userMiddleware, createMilestone);

// Get milestones for project
router.get('/milestones/:projectId', userMiddleware, getMilestones);

// ═══════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════

// Export to MS Project XML
router.get('/export/:projectId/msproject', userMiddleware, exportToMSProject);

// Export to PDF
router.get('/export/:projectId/pdf', userMiddleware, exportToPDF);

// Export to Excel
router.get('/export/:projectId/excel', userMiddleware, exportToExcel);

// ═══════════════════════════════════════════════════════════════
// COLLABORATION
// ═══════════════════════════════════════════════════════════════

// Get active users for resource
router.get('/collaboration/presence/:resourceId', userMiddleware, getActiveUsers);

// Update user presence
router.post('/collaboration/presence', userMiddleware, updatePresence);

// Get recent activities
router.get('/collaboration/activities/:firmId', userMiddleware, getRecentActivities);

// Get collaboration stats
router.get('/collaboration/stats', userMiddleware, getCollaborationStats);

module.exports = router;
