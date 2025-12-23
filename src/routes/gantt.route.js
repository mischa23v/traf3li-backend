const express = require('express');
const { userMiddleware, firmFilter } = require('../middlewares');
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
router.get('/productivity', userMiddleware, firmFilter, getProductivityData);

// Filter with complex criteria (must be before parameterized routes)
router.post('/data/filter', userMiddleware, firmFilter, filterGanttData);

// Get all gantt data for firm
router.get('/data', userMiddleware, firmFilter, getGanttData);

// Get gantt data for specific case/project
router.get('/data/case/:caseId', userMiddleware, firmFilter, getGanttDataForCase);

// Get gantt data by assignee
router.get('/data/assigned/:userId', userMiddleware, firmFilter, getGanttDataByAssignee);

// Get task hierarchy
router.get('/hierarchy/:taskId', userMiddleware, firmFilter, getTaskHierarchy);

// ═══════════════════════════════════════════════════════════════
// TASK OPERATIONS (from Gantt UI)
// ═══════════════════════════════════════════════════════════════

// Update task dates (drag-drop)
router.put('/task/:id/dates', userMiddleware, firmFilter, updateTaskDates);

// Update task duration
router.put('/task/:id/duration', userMiddleware, firmFilter, updateTaskDuration);

// Update task progress
router.put('/task/:id/progress', userMiddleware, firmFilter, updateTaskProgress);

// Change task parent (hierarchy)
router.put('/task/:id/parent', userMiddleware, firmFilter, updateTaskParent);

// Reorder tasks
router.post('/task/reorder', userMiddleware, firmFilter, reorderTasks);

// ═══════════════════════════════════════════════════════════════
// DEPENDENCIES/LINKS
// ═══════════════════════════════════════════════════════════════

// Get dependency chain for task
router.get('/dependencies/:taskId', userMiddleware, firmFilter, getDependencyChain);

// Create dependency link
router.post('/link', userMiddleware, firmFilter, createLink);

// Delete dependency link
router.delete('/link/:source/:target', userMiddleware, firmFilter, deleteLink);

// ═══════════════════════════════════════════════════════════════
// CRITICAL PATH ANALYSIS
// ═══════════════════════════════════════════════════════════════

// Get critical path for project
router.get('/critical-path/:projectId', userMiddleware, firmFilter, getCriticalPath);

// Get slack time for task
router.get('/slack/:taskId', userMiddleware, firmFilter, getSlackTime);

// Get bottleneck tasks
router.get('/bottlenecks/:projectId', userMiddleware, firmFilter, getBottlenecks);

// Get project timeline summary
router.get('/timeline/:projectId', userMiddleware, firmFilter, getProjectTimeline);

// ═══════════════════════════════════════════════════════════════
// RESOURCE MANAGEMENT
// ═══════════════════════════════════════════════════════════════

// Get resource allocation overview
router.get('/resources', userMiddleware, firmFilter, getResourceAllocation);

// Check for resource conflicts
router.get('/resources/conflicts', userMiddleware, firmFilter, getResourceConflicts);

// Suggest optimal assignee for task
router.post('/resources/suggest', userMiddleware, firmFilter, suggestAssignee);

// Get specific user workload
router.get('/resources/:userId/workload', userMiddleware, firmFilter, getUserWorkload);

// ═══════════════════════════════════════════════════════════════
// BASELINES
// ═══════════════════════════════════════════════════════════════

// Create baseline for project
router.post('/baseline/:projectId', userMiddleware, firmFilter, createBaseline);

// Get baseline for project
router.get('/baseline/:projectId', userMiddleware, firmFilter, getBaseline);

// Compare current to baseline
router.get('/baseline/:projectId/compare', userMiddleware, firmFilter, compareToBaseline);

// ═══════════════════════════════════════════════════════════════
// AUTO-SCHEDULING
// ═══════════════════════════════════════════════════════════════

// Auto-schedule project
router.post('/auto-schedule/:projectId', userMiddleware, firmFilter, autoSchedule);

// Level resources
router.post('/level-resources/:projectId', userMiddleware, firmFilter, levelResources);

// ═══════════════════════════════════════════════════════════════
// MILESTONES
// ═══════════════════════════════════════════════════════════════

// Create milestone
router.post('/milestone', userMiddleware, firmFilter, createMilestone);

// Get milestones for project
router.get('/milestones/:projectId', userMiddleware, firmFilter, getMilestones);

// ═══════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════

// Export to MS Project XML
router.get('/export/:projectId/msproject', userMiddleware, firmFilter, exportToMSProject);

// Export to PDF
router.get('/export/:projectId/pdf', userMiddleware, firmFilter, exportToPDF);

// Export to Excel
router.get('/export/:projectId/excel', userMiddleware, firmFilter, exportToExcel);

// ═══════════════════════════════════════════════════════════════
// COLLABORATION
// ═══════════════════════════════════════════════════════════════

// Get active users for resource
router.get('/collaboration/presence/:resourceId', userMiddleware, firmFilter, getActiveUsers);

// Update user presence
router.post('/collaboration/presence', userMiddleware, firmFilter, updatePresence);

// Get recent activities
router.get('/collaboration/activities/:firmId', userMiddleware, firmFilter, getRecentActivities);

// Get collaboration stats
router.get('/collaboration/stats', userMiddleware, firmFilter, getCollaborationStats);

module.exports = router;
