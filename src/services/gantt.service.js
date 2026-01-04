const Task = require('../models/task.model.js');
const mongoose = require('mongoose');
const logger = require('../utils/logger');

/**
 * Gantt Chart Service
 * Provides comprehensive Gantt chart functionality including:
 * - Data transformation to Gantt format
 * - Timeline calculations
 * - Critical path analysis
 * - Resource management
 * - Dependencies management
 * - Auto-scheduling
 * - Export capabilities
 */
class GanttService {
  // ═══════════════════════════════════════════════════════════════
  // DATA TRANSFORMATION
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get Gantt chart data with filters
   * @param {Object} firmQuery - Tenant filter (firmId or lawyerId) from req.firmQuery
   * @param {Object} filters - { caseId, assigneeId, dateRange, status, projectId }
   * @returns {Object} - Gantt data in DHTMLX format
   */
  async getGanttData(firmQuery = {}, filters = {}) {
    try {
      // Build query with tenant isolation (gold standard: spread firmQuery)
      const query = { ...firmQuery };

      if (filters.caseId) {
        query.caseId = filters.caseId;
      }

      if (filters.assigneeId) {
        query.assignedTo = filters.assigneeId;
      }

      if (filters.status) {
        if (Array.isArray(filters.status)) {
          query.status = { $in: filters.status };
        } else {
          query.status = filters.status;
        }
      }

      // Date range filter
      if (filters.dateRange) {
        const dateQuery = {};
        if (filters.dateRange.start) {
          dateQuery.$gte = new Date(filters.dateRange.start);
        }
        if (filters.dateRange.end) {
          dateQuery.$lte = new Date(filters.dateRange.end);
        }
        if (Object.keys(dateQuery).length > 0) {
          query.$or = [
            { startDate: dateQuery },
            { dueDate: dateQuery }
          ];
        }
      }

      // Exclude templates
      query.isTemplate = { $ne: true };

      // Fetch tasks with populated references
      const tasks = await Task.find(query)
        .populate('assignedTo', 'name email avatar')
        .populate('caseId', 'title caseNumber')
        .populate('blockedBy', '_id title status')
        .populate('blocks', '_id title status')
        .sort({ startDate: 1, dueDate: 1 });

      // Transform to Gantt format
      const ganttTasks = await this.transformToGanttFormat(tasks);

      // Extract links from dependencies
      const links = this.extractLinks(tasks);

      // Get resources (assignees)
      const resources = await this.getResourcesFromTasks(tasks);

      // Calculate project summary
      const summary = await this.calculateProjectSummary(tasks, filters.caseId || filters.projectId);

      return {
        data: ganttTasks,
        links,
        resources,
        summary
      };
    } catch (error) {
      logger.error('Error in getGanttData:', error);
      throw error;
    }
  }

  /**
   * Transform MongoDB tasks to Gantt format
   * @param {Array} tasks - Array of Task documents
   * @returns {Array} - Tasks in DHTMLX Gantt format
   */
  async transformToGanttFormat(tasks) {
    return tasks.map(task => {
      // Calculate dates
      const startDate = task.startDate || task.createdAt;
      const endDate = task.dueDate || this.addDays(startDate, 1);

      // Calculate duration in days
      const duration = this.calculateDurationInDays(startDate, endDate);

      // Determine task type
      let type = 'task';
      if (task.subtasks && task.subtasks.length > 0) {
        type = 'project';
      }
      if (duration === 0 || task.taskType === 'filing_deadline' || task.taskType === 'appeal_deadline') {
        type = 'milestone';
      }

      // Determine color based on priority/status
      const color = this.getTaskColor(task);

      // Check if task is critical
      const isCritical = this.checkIfCritical(task);

      // Check if overdue
      const isOverdue = task.status !== 'done' && task.status !== 'canceled' &&
                        task.dueDate && new Date(task.dueDate) < new Date();

      return {
        id: task._id.toString(),
        text: task.title,
        start_date: this.formatDate(startDate),
        end_date: this.formatDate(endDate),
        duration,
        progress: (task.progress || 0) / 100, // Convert to 0-1 range
        parent: task.parentTaskId ? task.parentTaskId.toString() : null,
        type,
        open: true,

        // Custom properties
        assignee: task.assignedTo ? {
          id: task.assignedTo._id?.toString() || task.assignedTo.toString(),
          name: task.assignedTo.name || 'Unknown',
          avatar: task.assignedTo.avatar || null
        } : null,
        priority: task.priority,
        status: task.status,
        caseId: task.caseId?._id?.toString() || task.caseId?.toString() || null,
        caseName: task.caseId?.title || task.caseId?.caseNumber || null,
        taskType: task.taskType,
        label: task.label,
        tags: task.tags || [],

        // Visual properties
        color,
        textColor: '#ffffff',

        // Flags
        isCritical,
        isOverdue,

        // Additional data
        description: task.description,
        estimatedMinutes: task.timeTracking?.estimatedMinutes || 0,
        actualMinutes: task.timeTracking?.actualMinutes || 0,
        subtaskCount: task.subtasks?.length || 0,
        completedSubtaskCount: task.subtasks?.filter(st => st.completed).length || 0,

        // Dependencies count
        blockedByCount: task.blockedBy?.length || 0,
        blocksCount: task.blocks?.length || 0
      };
    });
  }

  /**
   * Extract dependency links from tasks
   * @param {Array} tasks - Array of Task documents
   * @returns {Array} - Links in Gantt format
   */
  extractLinks(tasks) {
    const links = [];
    let linkId = 1;

    tasks.forEach(task => {
      // Process blockedBy relationships (finish-to-start by default)
      if (task.blockedBy && task.blockedBy.length > 0) {
        task.blockedBy.forEach(blockerTask => {
          const blockerId = blockerTask._id?.toString() || blockerTask.toString();
          links.push({
            id: `link_${linkId++}`,
            source: blockerId,
            target: task._id.toString(),
            type: '0' // 0 = finish-to-start (most common)
          });
        });
      }

      // Process dependencies array
      if (task.dependencies && task.dependencies.length > 0) {
        task.dependencies.forEach(dep => {
          if (dep.type === 'blocked_by') {
            links.push({
              id: `link_${linkId++}`,
              source: dep.taskId.toString(),
              target: task._id.toString(),
              type: '0'
            });
          } else if (dep.type === 'blocks') {
            links.push({
              id: `link_${linkId++}`,
              source: task._id.toString(),
              target: dep.taskId.toString(),
              type: '0'
            });
          }
        });
      }
    });

    // Remove duplicates
    const uniqueLinks = [];
    const linkMap = new Set();

    links.forEach(link => {
      const key = `${link.source}-${link.target}-${link.type}`;
      if (!linkMap.has(key)) {
        linkMap.add(key);
        uniqueLinks.push(link);
      }
    });

    return uniqueLinks;
  }

  /**
   * Get task hierarchy recursively
   * SECURITY: Requires firmQuery for multi-tenant isolation (gold standard)
   * @param {ObjectId} taskId - Task ID
   * @param {Object} firmQuery - Tenant filter from req.firmQuery (firmId or lawyerId)
   * @returns {Object} - Task with all subtasks
   */
  async getTaskHierarchy(taskId, firmQuery = {}) {
    try {
      // SECURITY: Build query with firmQuery spread (gold standard pattern)
      const query = { _id: taskId, ...firmQuery };
      const task = await Task.findOne(query)
        .populate('assignedTo', 'name email avatar')
        .populate('caseId', 'title caseNumber')
        .lean();

      if (!task) {
        throw new Error('Task not found');
      }

      // SECURITY: Find child tasks with firmQuery filter
      const childQuery = { parentTaskId: taskId, ...firmQuery };
      const children = await Task.find(childQuery)
        .populate('assignedTo', 'name email avatar')
        .lean();

      // Recursively get children's hierarchies
      const childrenWithHierarchy = await Promise.all(
        children.map(child => this.getTaskHierarchy(child._id, firmQuery))
      );

      task.children = childrenWithHierarchy;

      return task;
    } catch (error) {
      logger.error('Error in getTaskHierarchy:', error);
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // TIMELINE CALCULATION
  // ═══════════════════════════════════════════════════════════════

  /**
   * Calculate task dates based on dependencies
   * @param {Object} task - Task object
   * @returns {Object} - { startDate, endDate }
   */
  async calculateTaskDates(task) {
    try {
      // If task has no dependencies, use existing dates
      if (!task.blockedBy || task.blockedBy.length === 0) {
        return {
          startDate: task.startDate || new Date(),
          endDate: task.dueDate || this.addDays(task.startDate || new Date(), 1)
        };
      }

      // Get all blocking tasks
      const blockerTasks = await Task.find({
        _id: { $in: task.blockedBy }
      }).select('dueDate endDate');

      // Find latest end date from blockers
      let latestBlockerEnd = new Date(0);
      blockerTasks.forEach(blocker => {
        const blockerEnd = blocker.dueDate || blocker.endDate;
        if (blockerEnd && new Date(blockerEnd) > latestBlockerEnd) {
          latestBlockerEnd = new Date(blockerEnd);
        }
      });

      // Task should start after all blockers finish
      const calculatedStartDate = latestBlockerEnd > new Date(0)
        ? this.addDays(latestBlockerEnd, 1)
        : task.startDate || new Date();

      // Calculate end date based on duration
      const duration = task.timeTracking?.estimatedMinutes
        ? Math.ceil(task.timeTracking.estimatedMinutes / 480) // 480 min = 8 hour workday
        : 1;

      const calculatedEndDate = this.addDays(calculatedStartDate, duration);

      return {
        startDate: calculatedStartDate,
        endDate: calculatedEndDate
      };
    } catch (error) {
      logger.error('Error in calculateTaskDates:', error);
      throw error;
    }
  }

  /**
   * Calculate working days between dates
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @param {Boolean} includeWeekends - Include weekends in calculation
   * @returns {Number} - Duration in working days
   */
  async calculateDuration(startDate, endDate, includeWeekends = false) {
    if (!startDate || !endDate) return 0;

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (includeWeekends) {
      return this.calculateDurationInDays(start, end);
    }

    // Calculate working days only
    let workingDays = 0;
    const current = new Date(start);

    while (current <= end) {
      const dayOfWeek = current.getDay();
      // 0 = Sunday, 6 = Saturday
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        workingDays++;
      }
      current.setDate(current.getDate() + 1);
    }

    return workingDays;
  }

  /**
   * Calculate end date from start + duration
   * @param {Date} startDate - Start date
   * @param {Number} duration - Duration in days
   * @param {Boolean} includeWeekends - Include weekends
   * @returns {Date} - Calculated end date
   */
  async calculateEndDate(startDate, duration, includeWeekends = false) {
    if (!startDate || !duration) return startDate;

    if (includeWeekends) {
      return this.addDays(startDate, duration);
    }

    // Add working days only
    let workingDaysAdded = 0;
    const current = new Date(startDate);

    while (workingDaysAdded < duration) {
      current.setDate(current.getDate() + 1);
      const dayOfWeek = current.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        workingDaysAdded++;
      }
    }

    return current;
  }

  /**
   * Adjust task dates based on dependencies
   * @param {ObjectId} taskId - Task ID
   * @param {Object} firmQuery - Tenant filter from req.firmQuery (gold standard)
   * @returns {Object} - Updated task
   */
  async adjustForDependencies(taskId, firmQuery = {}) {
    try {
      // SECURITY: Use firmQuery spread pattern (gold standard)
      const query = { _id: taskId, ...firmQuery };
      const task = await Task.findOne(query);
      if (!task) {
        throw new Error('Task not found');
      }

      const newDates = await this.calculateTaskDates(task);

      task.startDate = newDates.startDate;
      task.dueDate = newDates.endDate;

      await task.save();

      return task;
    } catch (error) {
      logger.error('Error in adjustForDependencies:', error);
      throw error;
    }
  }

  /**
   * Propagate date changes to dependent tasks
   * @param {ObjectId} taskId - Task ID that was changed
   * @param {String} changeType - Type of change (date, duration, status)
   * @returns {Array} - Updated tasks
   */
  async propagateDateChanges(taskId, changeType = 'date') {
    try {
      const updatedTasks = [];

      // Find all tasks that are blocked by this task
      const dependentTasks = await Task.find({
        $or: [
          { blockedBy: taskId },
          { 'dependencies.taskId': taskId, 'dependencies.type': 'blocked_by' }
        ]
      });

      // Update each dependent task
      for (const depTask of dependentTasks) {
        const newDates = await this.calculateTaskDates(depTask);
        depTask.startDate = newDates.startDate;
        depTask.dueDate = newDates.endDate;
        await depTask.save();
        updatedTasks.push(depTask);

        // Recursively propagate to tasks dependent on this one
        const furtherUpdated = await this.propagateDateChanges(depTask._id, changeType);
        updatedTasks.push(...furtherUpdated);
      }

      return updatedTasks;
    } catch (error) {
      logger.error('Error in propagateDateChanges:', error);
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // CRITICAL PATH ANALYSIS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Calculate critical path for a project
   * @param {ObjectId} projectId - Project/Case ID
   * @returns {Array} - Task IDs forming critical path
   */
  async calculateCriticalPath(projectId) {
    try {
      // Get all tasks for the project
      const tasks = await Task.find({ caseId: projectId })
        .select('_id title startDate dueDate blockedBy blocks')
        .lean();

      if (tasks.length === 0) {
        return [];
      }

      // Build adjacency list
      const graph = new Map();
      const taskMap = new Map();
      const inDegree = new Map();

      tasks.forEach(task => {
        const taskId = task._id.toString();
        taskMap.set(taskId, task);
        graph.set(taskId, []);
        inDegree.set(taskId, 0);
      });

      // Build graph from dependencies
      tasks.forEach(task => {
        const taskId = task._id.toString();
        if (task.blockedBy && task.blockedBy.length > 0) {
          task.blockedBy.forEach(blockerId => {
            const blockerIdStr = blockerId.toString();
            if (graph.has(blockerIdStr)) {
              graph.get(blockerIdStr).push(taskId);
              inDegree.set(taskId, inDegree.get(taskId) + 1);
            }
          });
        }
      });

      // Calculate earliest start times (forward pass)
      const earliestStart = new Map();
      const earliestFinish = new Map();
      const queue = [];

      tasks.forEach(task => {
        const taskId = task._id.toString();
        if (inDegree.get(taskId) === 0) {
          earliestStart.set(taskId, new Date(task.startDate || Date.now()));
          const duration = this.calculateDurationInDays(
            task.startDate || new Date(),
            task.dueDate || this.addDays(task.startDate || new Date(), 1)
          );
          earliestFinish.set(taskId, this.addDays(earliestStart.get(taskId), duration));
          queue.push(taskId);
        }
      });

      // Process tasks in topological order
      while (queue.length > 0) {
        const currentId = queue.shift();
        const neighbors = graph.get(currentId) || [];

        neighbors.forEach(neighborId => {
          const current = taskMap.get(neighborId);
          const duration = this.calculateDurationInDays(
            current.startDate || new Date(),
            current.dueDate || this.addDays(current.startDate || new Date(), 1)
          );

          const newEarliestStart = this.addDays(earliestFinish.get(currentId), 1);

          if (!earliestStart.has(neighborId) || newEarliestStart > earliestStart.get(neighborId)) {
            earliestStart.set(neighborId, newEarliestStart);
            earliestFinish.set(neighborId, this.addDays(newEarliestStart, duration));
          }

          inDegree.set(neighborId, inDegree.get(neighborId) - 1);
          if (inDegree.get(neighborId) === 0) {
            queue.push(neighborId);
          }
        });
      }

      // Find project end date (latest finish time)
      let projectEnd = new Date(0);
      earliestFinish.forEach(finish => {
        if (finish > projectEnd) {
          projectEnd = finish;
        }
      });

      // Calculate latest start times (backward pass)
      const latestFinish = new Map();
      const latestStart = new Map();

      tasks.forEach(task => {
        const taskId = task._id.toString();
        // Initialize with earliest finish for tasks with no successors
        if (!graph.get(taskId) || graph.get(taskId).length === 0) {
          latestFinish.set(taskId, projectEnd);
        }
      });

      // Backward pass
      const processed = new Set();
      const backwardQueue = [];

      tasks.forEach(task => {
        const taskId = task._id.toString();
        if (!graph.get(taskId) || graph.get(taskId).length === 0) {
          backwardQueue.push(taskId);
        }
      });

      while (backwardQueue.length > 0) {
        const currentId = backwardQueue.shift();
        if (processed.has(currentId)) continue;
        processed.add(currentId);

        const current = taskMap.get(currentId);
        const duration = this.calculateDurationInDays(
          current.startDate || new Date(),
          current.dueDate || this.addDays(current.startDate || new Date(), 1)
        );

        if (!latestFinish.has(currentId)) {
          latestFinish.set(currentId, projectEnd);
        }

        latestStart.set(currentId, this.subtractDays(latestFinish.get(currentId), duration));

        // Update predecessors
        if (current.blockedBy && current.blockedBy.length > 0) {
          current.blockedBy.forEach(blockerId => {
            const blockerIdStr = blockerId.toString();
            const currentLatestFinish = latestStart.get(currentId);

            if (!latestFinish.has(blockerIdStr) || currentLatestFinish < latestFinish.get(blockerIdStr)) {
              latestFinish.set(blockerIdStr, currentLatestFinish);
            }

            if (!backwardQueue.includes(blockerIdStr) && !processed.has(blockerIdStr)) {
              backwardQueue.push(blockerIdStr);
            }
          });
        }
      }

      // Identify critical path (tasks with zero slack)
      const criticalPath = [];
      tasks.forEach(task => {
        const taskId = task._id.toString();
        const es = earliestStart.get(taskId);
        const ls = latestStart.get(taskId);

        if (es && ls) {
          const slack = Math.abs(ls - es) / (1000 * 60 * 60 * 24); // Convert to days
          if (slack < 0.1) { // Less than 0.1 days slack
            criticalPath.push(taskId);
          }
        }
      });

      return criticalPath;
    } catch (error) {
      logger.error('Error in calculateCriticalPath:', error);
      throw error;
    }
  }

  /**
   * Calculate slack time for a task
   * @param {ObjectId} taskId - Task ID
   * @param {Object} firmQuery - Tenant filter from req.firmQuery (gold standard)
   * @returns {Number} - Slack time in days
   */
  async calculateSlackTime(taskId, firmQuery = {}) {
    try {
      // SECURITY: Use firmQuery spread pattern (gold standard)
      const query = { _id: taskId, ...firmQuery };
      const task = await Task.findOne(query).lean();
      if (!task) {
        throw new Error('Task not found');
      }

      // Get critical path for the project
      const criticalPath = await this.calculateCriticalPath(task.caseId);

      // If task is on critical path, slack is 0
      if (criticalPath.includes(taskId.toString())) {
        return 0;
      }

      // Calculate slack based on dependencies
      // For now, return a simple calculation
      // In a full implementation, this would use early start/late start differences
      const duration = this.calculateDurationInDays(
        task.startDate || new Date(),
        task.dueDate || this.addDays(task.startDate || new Date(), 1)
      );

      // Get dependent tasks
      const dependentTasks = await Task.find({
        blockedBy: taskId
      }).select('startDate').lean();

      if (dependentTasks.length === 0) {
        return 999; // No successors, large slack
      }

      // Find earliest successor start
      let earliestSuccessorStart = new Date(8640000000000000); // Max date
      dependentTasks.forEach(dep => {
        if (dep.startDate && new Date(dep.startDate) < earliestSuccessorStart) {
          earliestSuccessorStart = new Date(dep.startDate);
        }
      });

      const taskEnd = task.dueDate || this.addDays(task.startDate || new Date(), duration);
      const slack = this.calculateDurationInDays(taskEnd, earliestSuccessorStart);

      return Math.max(0, slack);
    } catch (error) {
      logger.error('Error in calculateSlackTime:', error);
      throw error;
    }
  }

  /**
   * Identify bottleneck tasks
   * @param {ObjectId} projectId - Project/Case ID
   * @returns {Array} - Bottleneck tasks
   */
  async identifyBottlenecks(projectId) {
    try {
      // Get all tasks
      const tasks = await Task.find({ caseId: projectId })
        .populate('assignedTo', 'name')
        .lean();

      // Find tasks that block multiple other tasks
      const bottlenecks = [];

      for (const task of tasks) {
        const blockedTasksCount = await Task.countDocuments({
          blockedBy: task._id
        });

        if (blockedTasksCount >= 2) {
          bottlenecks.push({
            taskId: task._id,
            title: task.title,
            assignee: task.assignedTo?.name,
            blockedTasksCount,
            status: task.status,
            dueDate: task.dueDate
          });
        }
      }

      // Sort by number of blocked tasks
      bottlenecks.sort((a, b) => b.blockedTasksCount - a.blockedTasksCount);

      return bottlenecks;
    } catch (error) {
      logger.error('Error in identifyBottlenecks:', error);
      throw error;
    }
  }

  /**
   * Get project timeline summary
   * @param {ObjectId} projectId - Project/Case ID
   * @returns {Object} - Timeline info
   */
  async getProjectTimeline(projectId) {
    try {
      const tasks = await Task.find({ caseId: projectId }).lean();

      if (tasks.length === 0) {
        return {
          projectStart: null,
          projectEnd: null,
          duration: 0,
          taskCount: 0
        };
      }

      // Find earliest start and latest end
      let earliestStart = new Date(8640000000000000);
      let latestEnd = new Date(0);

      tasks.forEach(task => {
        const start = task.startDate || task.createdAt;
        const end = task.dueDate || start;

        if (new Date(start) < earliestStart) {
          earliestStart = new Date(start);
        }
        if (new Date(end) > latestEnd) {
          latestEnd = new Date(end);
        }
      });

      const duration = this.calculateDurationInDays(earliestStart, latestEnd);

      return {
        projectStart: earliestStart,
        projectEnd: latestEnd,
        duration,
        taskCount: tasks.length
      };
    } catch (error) {
      logger.error('Error in getProjectTimeline:', error);
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // RESOURCE MANAGEMENT
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get resource allocation over time
   * @param {Object} firmQuery - Tenant filter from req.firmQuery (gold standard)
   * @param {Object} dateRange - { start, end }
   * @returns {Object} - Resource allocation data
   */
  async getResourceAllocation(firmQuery = {}, dateRange) {
    try {
      // SECURITY: Use firmQuery spread pattern (gold standard)
      const query = { ...firmQuery, assignedTo: { $ne: null } };

      if (dateRange) {
        query.$or = [
          {
            startDate: {
              $gte: new Date(dateRange.start),
              $lte: new Date(dateRange.end)
            }
          },
          {
            dueDate: {
              $gte: new Date(dateRange.start),
              $lte: new Date(dateRange.end)
            }
          }
        ];
      }

      const tasks = await Task.find(query)
        .populate('assignedTo', 'name email avatar')
        .lean();

      // Group by assignee
      const resourceMap = new Map();

      tasks.forEach(task => {
        if (!task.assignedTo) return;

        const userId = task.assignedTo._id.toString();

        if (!resourceMap.has(userId)) {
          resourceMap.set(userId, {
            id: userId,
            name: task.assignedTo.name,
            email: task.assignedTo.email,
            avatar: task.assignedTo.avatar,
            tasks: [],
            totalTasks: 0,
            totalHours: 0,
            workload: {}
          });
        }

        const resource = resourceMap.get(userId);
        resource.tasks.push({
          id: task._id,
          title: task.title,
          startDate: task.startDate,
          dueDate: task.dueDate,
          estimatedMinutes: task.timeTracking?.estimatedMinutes || 0
        });
        resource.totalTasks++;
        resource.totalHours += (task.timeTracking?.estimatedMinutes || 0) / 60;

        // Calculate daily workload
        const start = new Date(task.startDate || task.createdAt);
        const end = new Date(task.dueDate || start);
        const days = this.calculateDurationInDays(start, end) || 1;
        const hoursPerDay = (task.timeTracking?.estimatedMinutes || 0) / 60 / days;

        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          const dateKey = this.formatDate(d);
          if (!resource.workload[dateKey]) {
            resource.workload[dateKey] = { hours: 0, tasks: 0 };
          }
          resource.workload[dateKey].hours += hoursPerDay;
          resource.workload[dateKey].tasks++;
        }
      });

      return Array.from(resourceMap.values());
    } catch (error) {
      logger.error('Error in getResourceAllocation:', error);
      throw error;
    }
  }

  /**
   * Get assignee workload
   * @param {ObjectId} assigneeId - User ID
   * @param {Object} dateRange - { start, end }
   * @returns {Object} - Workload data
   */
  async getAssigneeWorkload(assigneeId, dateRange) {
    try {
      const query = { assignedTo: assigneeId };

      if (dateRange) {
        query.$or = [
          {
            startDate: {
              $gte: new Date(dateRange.start),
              $lte: new Date(dateRange.end)
            }
          },
          {
            dueDate: {
              $gte: new Date(dateRange.start),
              $lte: new Date(dateRange.end)
            }
          }
        ];
      }

      const tasks = await Task.find(query)
        .populate('caseId', 'title caseNumber')
        .lean();

      // Calculate workload by date
      const workloadByDate = {};
      let totalHours = 0;

      tasks.forEach(task => {
        const start = new Date(task.startDate || task.createdAt);
        const end = new Date(task.dueDate || start);
        const days = this.calculateDurationInDays(start, end) || 1;
        const hoursPerDay = (task.timeTracking?.estimatedMinutes || 0) / 60 / days;

        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          const dateKey = this.formatDate(d);
          if (!workloadByDate[dateKey]) {
            workloadByDate[dateKey] = { hours: 0, tasks: [] };
          }
          workloadByDate[dateKey].hours += hoursPerDay;
          workloadByDate[dateKey].tasks.push({
            id: task._id,
            title: task.title,
            caseTitle: task.caseId?.title,
            hours: hoursPerDay
          });
        }

        totalHours += (task.timeTracking?.estimatedMinutes || 0) / 60;
      });

      return {
        assigneeId,
        totalTasks: tasks.length,
        totalHours,
        workloadByDate
      };
    } catch (error) {
      logger.error('Error in getAssigneeWorkload:', error);
      throw error;
    }
  }

  /**
   * Check for resource conflicts (overallocation)
   * @param {ObjectId} assigneeId - User ID
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Object} - Conflict information
   */
  async checkResourceConflicts(assigneeId, startDate, endDate) {
    try {
      const maxHoursPerDay = 8; // Standard workday

      const workload = await this.getAssigneeWorkload(assigneeId, {
        start: startDate,
        end: endDate
      });

      const conflicts = [];

      Object.entries(workload.workloadByDate).forEach(([date, data]) => {
        if (data.hours > maxHoursPerDay) {
          conflicts.push({
            date,
            allocatedHours: data.hours,
            maxHours: maxHoursPerDay,
            overallocation: data.hours - maxHoursPerDay,
            tasks: data.tasks
          });
        }
      });

      return {
        hasConflicts: conflicts.length > 0,
        conflicts
      };
    } catch (error) {
      logger.error('Error in checkResourceConflicts:', error);
      throw error;
    }
  }

  /**
   * Suggest optimal assignment for a task
   * @param {ObjectId} taskId - Task ID
   * @param {Object} firmQuery - Tenant filter from req.firmQuery (gold standard)
   * @returns {Array} - Suggested assignees sorted by availability
   */
  async suggestOptimalAssignment(taskId, firmQuery = {}) {
    try {
      // SECURITY: Use firmQuery spread pattern (gold standard)
      const query = { _id: taskId, ...firmQuery };
      const task = await Task.findOne(query).lean();
      if (!task) {
        throw new Error('Task not found');
      }

      // Get all users in the firm/for solo lawyer
      const User = mongoose.model('User');
      // For solo lawyers, task.lawyerId is set, for firms task.firmId is set
      const userQuery = task.firmId ? { firmId: task.firmId } : { _id: task.lawyerId };
      const users = await User.find(userQuery).select('_id name email avatar').lean();

      // Calculate workload for each user
      const suggestions = [];

      for (const user of users) {
        const workload = await this.getAssigneeWorkload(user._id, {
          start: task.startDate || new Date(),
          end: task.dueDate || this.addDays(task.startDate || new Date(), 1)
        });

        const avgHoursPerDay = workload.totalHours / Math.max(1, Object.keys(workload.workloadByDate).length);

        suggestions.push({
          userId: user._id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          currentTasks: workload.totalTasks,
          totalHours: workload.totalHours,
          avgHoursPerDay,
          score: 100 - (avgHoursPerDay * 10) // Lower workload = higher score
        });
      }

      // Sort by score (best match first)
      suggestions.sort((a, b) => b.score - a.score);

      return suggestions;
    } catch (error) {
      logger.error('Error in suggestOptimalAssignment:', error);
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // DEPENDENCIES
  // ═══════════════════════════════════════════════════════════════

  /**
   * Create dependency between tasks
   * SECURITY: Requires firmQuery for multi-tenant isolation (gold standard)
   * @param {ObjectId} sourceId - Source task ID
   * @param {ObjectId} targetId - Target task ID
   * @param {Number} type - 0=FS, 1=SS, 2=FF, 3=SF
   * @param {Object} firmQuery - Tenant filter from req.firmQuery (gold standard)
   * @returns {Object} - Updated tasks
   */
  async createDependency(sourceId, targetId, type = 0, firmQuery = {}) {
    try {
      // Validate dependency
      const isValid = await this.validateDependency(sourceId, targetId);
      if (!isValid) {
        throw new Error('Invalid dependency: would create circular reference');
      }

      // SECURITY: Build query with firmQuery spread (gold standard pattern)
      const sourceQuery = { _id: sourceId, ...firmQuery };
      const targetQuery = { _id: targetId, ...firmQuery };

      // Get both tasks
      const sourceTask = await Task.findOne(sourceQuery);
      const targetTask = await Task.findOne(targetQuery);

      if (!sourceTask || !targetTask) {
        throw new Error('One or both tasks not found');
      }

      // Add dependency (finish-to-start is most common)
      // Source blocks target (target is blocked by source)
      if (!targetTask.blockedBy) {
        targetTask.blockedBy = [];
      }
      if (!targetTask.blockedBy.includes(sourceId)) {
        targetTask.blockedBy.push(sourceId);
      }

      if (!sourceTask.blocks) {
        sourceTask.blocks = [];
      }
      if (!sourceTask.blocks.includes(targetId)) {
        sourceTask.blocks.push(targetId);
      }

      // Add to dependencies array
      targetTask.dependencies.push({
        taskId: sourceId,
        type: 'blocked_by'
      });

      sourceTask.dependencies.push({
        taskId: targetId,
        type: 'blocks'
      });

      await sourceTask.save();
      await targetTask.save();

      // Recalculate target task dates
      await this.adjustForDependencies(targetId, firmQuery);

      return { sourceTask, targetTask };
    } catch (error) {
      logger.error('Error in createDependency:', error);
      throw error;
    }
  }

  /**
   * Remove dependency between tasks
   * SECURITY: Requires firmQuery for multi-tenant isolation (gold standard)
   * @param {ObjectId} sourceId - Source task ID
   * @param {ObjectId} targetId - Target task ID
   * @param {Object} firmQuery - Tenant filter from req.firmQuery (gold standard)
   * @returns {Object} - Updated tasks
   */
  async removeDependency(sourceId, targetId, firmQuery = {}) {
    try {
      // SECURITY: Build query with firmQuery spread (gold standard pattern)
      const sourceQuery = { _id: sourceId, ...firmQuery };
      const targetQuery = { _id: targetId, ...firmQuery };

      const sourceTask = await Task.findOne(sourceQuery);
      const targetTask = await Task.findOne(targetQuery);

      if (!sourceTask || !targetTask) {
        throw new Error('One or both tasks not found');
      }

      // Remove from blockedBy/blocks arrays
      targetTask.blockedBy = targetTask.blockedBy.filter(id => id.toString() !== sourceId.toString());
      sourceTask.blocks = sourceTask.blocks.filter(id => id.toString() !== targetId.toString());

      // Remove from dependencies array
      targetTask.dependencies = targetTask.dependencies.filter(
        dep => dep.taskId.toString() !== sourceId.toString()
      );
      sourceTask.dependencies = sourceTask.dependencies.filter(
        dep => dep.taskId.toString() !== targetId.toString()
      );

      await sourceTask.save();
      await targetTask.save();

      return { sourceTask, targetTask };
    } catch (error) {
      logger.error('Error in removeDependency:', error);
      throw error;
    }
  }

  /**
   * Validate dependency (check for circular dependencies)
   * @param {ObjectId} sourceId - Source task ID
   * @param {ObjectId} targetId - Target task ID
   * @returns {Boolean} - True if valid
   */
  async validateDependency(sourceId, targetId) {
    try {
      // Check if adding this dependency would create a cycle
      return !(await this.detectCircularDependency(sourceId, targetId));
    } catch (error) {
      logger.error('Error in validateDependency:', error);
      throw error;
    }
  }

  /**
   * Detect circular dependency
   * @param {ObjectId} sourceId - Source task ID
   * @param {ObjectId} targetId - Target task ID
   * @returns {Boolean} - True if circular
   */
  async detectCircularDependency(sourceId, targetId) {
    try {
      // If target already blocks source (directly or indirectly), this would create a cycle
      const visited = new Set();
      const queue = [targetId.toString()];

      while (queue.length > 0) {
        const currentId = queue.shift();

        if (currentId === sourceId.toString()) {
          return true; // Cycle detected
        }

        if (visited.has(currentId)) {
          continue;
        }

        visited.add(currentId);

        // Get tasks that are blocked by current task
        const blockedTasks = await Task.find({ blockedBy: currentId }).select('_id').lean();

        blockedTasks.forEach(task => {
          queue.push(task._id.toString());
        });
      }

      return false; // No cycle
    } catch (error) {
      logger.error('Error in detectCircularDependency:', error);
      throw error;
    }
  }

  /**
   * Get dependency chain for a task
   * @param {ObjectId} taskId - Task ID
   * @param {Object} firmQuery - Tenant filter from req.firmQuery (gold standard)
   * @returns {Object} - Dependency chain
   */
  async getDependencyChain(taskId, firmQuery = {}) {
    try {
      // SECURITY: Use firmQuery spread pattern (gold standard)
      const query = { _id: taskId, ...firmQuery };
      const task = await Task.findOne(query).populate('blocks blockedBy').lean();

      if (!task) {
        throw new Error('Task not found');
      }

      // Get tasks that depend on this task (recursively)
      const dependents = await this.getRecursiveDependents(taskId);

      // Get tasks this task depends on (recursively)
      const dependencies = await this.getRecursiveDependencies(taskId, new Set(), firmQuery);

      return {
        task: {
          id: task._id,
          title: task.title
        },
        dependencies, // Tasks this task depends on
        dependents // Tasks that depend on this task
      };
    } catch (error) {
      logger.error('Error in getDependencyChain:', error);
      throw error;
    }
  }

  /**
   * Get recursive dependents
   * @param {ObjectId} taskId - Task ID
   * @param {Set} visited - Visited tasks
   * @returns {Array} - Dependent tasks
   */
  async getRecursiveDependents(taskId, visited = new Set()) {
    if (visited.has(taskId.toString())) {
      return [];
    }

    visited.add(taskId.toString());

    const dependents = await Task.find({ blockedBy: taskId })
      .select('_id title status')
      .lean();

    const result = [];

    for (const dep of dependents) {
      result.push({
        id: dep._id,
        title: dep.title,
        status: dep.status
      });

      const childDependents = await this.getRecursiveDependents(dep._id, visited);
      result.push(...childDependents);
    }

    return result;
  }

  /**
   * Get recursive dependencies
   * @param {ObjectId} taskId - Task ID
   * @param {Set} visited - Visited tasks
   * @param {Object} firmQuery - Tenant filter from req.firmQuery (gold standard)
   * @returns {Array} - Dependency tasks
   */
  async getRecursiveDependencies(taskId, visited = new Set(), firmQuery = {}) {
    if (visited.has(taskId.toString())) {
      return [];
    }

    visited.add(taskId.toString());

    // SECURITY: Use firmQuery spread pattern (gold standard)
    const query = { _id: taskId, ...firmQuery };
    const task = await Task.findOne(query).select('blockedBy').lean();

    if (!task || !task.blockedBy || task.blockedBy.length === 0) {
      return [];
    }

    const dependencies = await Task.find({ _id: { $in: task.blockedBy }, ...firmQuery })
      .select('_id title status')
      .lean();

    const result = [];

    for (const dep of dependencies) {
      result.push({
        id: dep._id,
        title: dep.title,
        status: dep.status
      });

      const childDeps = await this.getRecursiveDependencies(dep._id, visited, firmQuery);
      result.push(...childDeps);
    }

    return result;
  }

  // ═══════════════════════════════════════════════════════════════
  // UPDATES FROM GANTT UI
  // ═══════════════════════════════════════════════════════════════

  /**
   * Update task dates (from drag-drop)
   * SECURITY: Requires firmQuery for multi-tenant isolation (gold standard)
   * @param {ObjectId} taskId - Task ID
   * @param {Date} startDate - New start date
   * @param {Date} endDate - New end date
   * @param {Object} firmQuery - Tenant filter from req.firmQuery (gold standard)
   * @returns {Object} - Updated task
   */
  async updateTaskDates(taskId, startDate, endDate, firmQuery = {}) {
    try {
      // SECURITY: Build query with firmQuery spread (gold standard pattern)
      const query = { _id: taskId, ...firmQuery };
      const task = await Task.findOne(query);
      if (!task) {
        throw new Error('Task not found');
      }

      task.startDate = new Date(startDate);
      task.dueDate = new Date(endDate);

      await task.save();

      // Propagate changes to dependent tasks
      await this.propagateDateChanges(taskId, 'date', firmQuery);

      return task;
    } catch (error) {
      logger.error('Error in updateTaskDates:', error);
      throw error;
    }
  }

  /**
   * Update task duration
   * SECURITY: Requires firmQuery for multi-tenant isolation (gold standard)
   * @param {ObjectId} taskId - Task ID
   * @param {Number} duration - New duration in days
   * @param {Object} firmQuery - Tenant filter from req.firmQuery (gold standard)
   * @returns {Object} - Updated task
   */
  async updateTaskDuration(taskId, duration, firmQuery = {}) {
    try {
      // SECURITY: Build query with firmQuery spread (gold standard pattern)
      const query = { _id: taskId, ...firmQuery };
      const task = await Task.findOne(query);
      if (!task) {
        throw new Error('Task not found');
      }

      const startDate = task.startDate || task.createdAt;
      const newEndDate = await this.calculateEndDate(startDate, duration, false);

      task.dueDate = newEndDate;

      await task.save();

      // Propagate changes
      await this.propagateDateChanges(taskId, 'duration', firmQuery);

      return task;
    } catch (error) {
      logger.error('Error in updateTaskDuration:', error);
      throw error;
    }
  }

  /**
   * Update task progress
   * SECURITY: Requires firmQuery for multi-tenant isolation (gold standard)
   * @param {ObjectId} taskId - Task ID
   * @param {Number} progress - Progress (0-100)
   * @param {Object} firmQuery - Tenant filter from req.firmQuery (gold standard)
   * @returns {Object} - Updated task
   */
  async updateTaskProgress(taskId, progress, firmQuery = {}) {
    try {
      // SECURITY: Build query with firmQuery spread (gold standard pattern)
      const query = { _id: taskId, ...firmQuery };
      const task = await Task.findOne(query);
      if (!task) {
        throw new Error('Task not found');
      }

      task.progress = Math.max(0, Math.min(100, progress));
      task.manualProgress = true; // Mark as manually set

      await task.save();

      return task;
    } catch (error) {
      logger.error('Error in updateTaskProgress:', error);
      throw error;
    }
  }

  /**
   * Update task parent (move in hierarchy)
   * SECURITY: Requires firmQuery for multi-tenant isolation (gold standard)
   * @param {ObjectId} taskId - Task ID
   * @param {ObjectId} newParentId - New parent task ID (null for root)
   * @param {Object} firmQuery - Tenant filter from req.firmQuery (gold standard)
   * @returns {Object} - Updated task
   */
  async updateTaskParent(taskId, newParentId, firmQuery = {}) {
    try {
      // SECURITY: Build query with firmQuery spread (gold standard pattern)
      const query = { _id: taskId, ...firmQuery };
      const task = await Task.findOne(query);
      if (!task) {
        throw new Error('Task not found');
      }

      // Validate new parent exists
      if (newParentId && newParentId !== 'null' && newParentId !== null) {
        // SECURITY: Parent must be in same tenant (use firmQuery)
        const parentQuery = { _id: newParentId, ...firmQuery };
        const newParent = await Task.findOne(parentQuery);
        if (!newParent) {
          throw new Error('New parent task not found');
        }

        // Prevent circular hierarchy
        if (newParentId.toString() === taskId.toString()) {
          throw new Error('Task cannot be its own parent');
        }
      }

      task.parentTaskId = newParentId && newParentId !== 'null' ? newParentId : null;

      await task.save();

      return task;
    } catch (error) {
      logger.error('Error in updateTaskParent:', error);
      throw error;
    }
  }

  /**
   * Reorder tasks
   * @param {Array} taskIds - Array of task IDs in new order
   * @returns {Array} - Updated tasks
   */
  async reorderTasks(taskIds) {
    try {
      // This is typically handled by the frontend
      // Backend can store order if needed
      // For now, just return the tasks in the requested order
      const tasks = await Task.find({ _id: { $in: taskIds } }).lean();

      // Sort by the order in taskIds array
      tasks.sort((a, b) => {
        const aIndex = taskIds.indexOf(a._id.toString());
        const bIndex = taskIds.indexOf(b._id.toString());
        return aIndex - bIndex;
      });

      return tasks;
    } catch (error) {
      logger.error('Error in reorderTasks:', error);
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // AUTO-SCHEDULING
  // ═══════════════════════════════════════════════════════════════

  /**
   * Auto-schedule all tasks in a project
   * @param {ObjectId} projectId - Project/Case ID
   * @param {Date} startDate - Project start date
   * @param {Object} firmQuery - Tenant filter from req.firmQuery (gold standard)
   * @returns {Array} - Updated tasks
   */
  async autoSchedule(projectId, startDate, firmQuery = {}) {
    try {
      // SECURITY: Use firmQuery spread pattern (gold standard)
      const tasks = await Task.find({ caseId: projectId, ...firmQuery }).lean();

      if (tasks.length === 0) {
        return [];
      }

      // Build dependency graph
      const taskMap = new Map();
      const inDegree = new Map();

      tasks.forEach(task => {
        taskMap.set(task._id.toString(), task);
        inDegree.set(task._id.toString(), 0);
      });

      // Calculate in-degrees
      tasks.forEach(task => {
        if (task.blockedBy && task.blockedBy.length > 0) {
          task.blockedBy.forEach(blockerId => {
            const blockerIdStr = blockerId.toString();
            if (inDegree.has(task._id.toString())) {
              inDegree.set(task._id.toString(), inDegree.get(task._id.toString()) + 1);
            }
          });
        }
      });

      // Topological sort
      const queue = [];
      const scheduled = [];

      // Add tasks with no dependencies
      tasks.forEach(task => {
        if (inDegree.get(task._id.toString()) === 0) {
          queue.push(task._id.toString());
        }
      });

      const scheduleMap = new Map();
      const projectStartDate = new Date(startDate);

      // Schedule tasks
      while (queue.length > 0) {
        const currentId = queue.shift();
        const task = taskMap.get(currentId);

        // Calculate start date
        let taskStartDate = projectStartDate;

        if (task.blockedBy && task.blockedBy.length > 0) {
          // Start after all dependencies finish
          let latestEnd = projectStartDate;

          task.blockedBy.forEach(blockerId => {
            const blockerSchedule = scheduleMap.get(blockerId.toString());
            if (blockerSchedule && blockerSchedule.endDate > latestEnd) {
              latestEnd = blockerSchedule.endDate;
            }
          });

          taskStartDate = this.addDays(latestEnd, 1);
        }

        // Calculate duration
        const duration = task.timeTracking?.estimatedMinutes
          ? Math.ceil(task.timeTracking.estimatedMinutes / 480)
          : 1;

        const taskEndDate = await this.calculateEndDate(taskStartDate, duration, false);

        scheduleMap.set(currentId, {
          taskId: currentId,
          startDate: taskStartDate,
          endDate: taskEndDate
        });

        // Update task in database (use firmQuery for tenant isolation)
        const updateQuery = { _id: currentId, ...firmQuery };
        await Task.findOneAndUpdate(updateQuery, {
          startDate: taskStartDate,
          dueDate: taskEndDate
        });

        scheduled.push(currentId);

        // Process dependent tasks
        tasks.forEach(t => {
          if (t.blockedBy && t.blockedBy.some(bid => bid.toString() === currentId)) {
            const tId = t._id.toString();
            inDegree.set(tId, inDegree.get(tId) - 1);
            if (inDegree.get(tId) === 0) {
              queue.push(tId);
            }
          }
        });
      }

      // Return updated tasks (use firmQuery for tenant isolation)
      return await Task.find({ caseId: projectId, ...firmQuery }).lean();
    } catch (error) {
      logger.error('Error in autoSchedule:', error);
      throw error;
    }
  }

  /**
   * Level resources (redistribute tasks to avoid overallocation)
   * @param {ObjectId} projectId - Project/Case ID
   * @param {Object} firmQuery - Tenant filter from req.firmQuery (gold standard)
   * @returns {Array} - Updated tasks
   */
  async levelResources(projectId, firmQuery = {}) {
    try {
      // This is a complex algorithm - simplified version
      // SECURITY: Use firmQuery spread pattern (gold standard)
      const tasks = await Task.find({ caseId: projectId, ...firmQuery }).populate('assignedTo').lean();

      // Get all assignees
      const assignees = new Set();
      tasks.forEach(task => {
        if (task.assignedTo) {
          assignees.add(task.assignedTo._id.toString());
        }
      });

      // Check for overallocation
      for (const assigneeId of assignees) {
        const conflicts = await this.checkResourceConflicts(
          assigneeId,
          new Date(),
          this.addDays(new Date(), 365)
        );

        if (conflicts.hasConflicts) {
          // Try to reschedule conflicting tasks
          for (const conflict of conflicts.conflicts) {
            for (const conflictTask of conflict.tasks) {
              // Find alternative dates or assignees (use firmQuery for tenant isolation)
              const taskQuery = { _id: conflictTask.id, ...firmQuery };
              const task = await Task.findOne(taskQuery);
              if (task && !task.blockedBy?.length) {
                // Task has no dependencies, can be moved
                const newStartDate = this.addDays(new Date(conflict.date), 1);
                task.startDate = newStartDate;
                task.dueDate = this.addDays(newStartDate, 1);
                await task.save();
              }
            }
          }
        }
      }

      // Return updated tasks (use firmQuery for tenant isolation)
      return await Task.find({ caseId: projectId, ...firmQuery }).lean();
    } catch (error) {
      logger.error('Error in levelResources:', error);
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // MILESTONES
  // ═══════════════════════════════════════════════════════════════

  /**
   * Create milestone
   * @param {Object} data - Milestone data
   * @returns {Object} - Created milestone task
   */
  async createMilestone(data) {
    try {
      const milestone = new Task({
        ...data,
        startDate: data.date,
        dueDate: data.date,
        taskType: data.taskType || 'filing_deadline',
        progress: 0
      });

      await milestone.save();

      return milestone;
    } catch (error) {
      logger.error('Error in createMilestone:', error);
      throw error;
    }
  }

  /**
   * Get milestones for a project
   * @param {ObjectId} projectId - Project/Case ID
   * @returns {Array} - Milestone tasks
   */
  async getMilestones(projectId) {
    try {
      const milestones = await Task.find({
        caseId: projectId,
        $or: [
          { taskType: 'filing_deadline' },
          { taskType: 'appeal_deadline' },
          { taskType: 'court_hearing' }
        ]
      })
        .populate('assignedTo', 'name email avatar')
        .sort({ dueDate: 1 })
        .lean();

      return milestones;
    } catch (error) {
      logger.error('Error in getMilestones:', error);
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // BASELINES
  // ═══════════════════════════════════════════════════════════════

  /**
   * Create baseline for project
   * @param {ObjectId} projectId - Project/Case ID
   * @returns {Object} - Baseline data
   */
  async createBaseline(projectId) {
    try {
      const tasks = await Task.find({ caseId: projectId }).lean();

      const baseline = {
        projectId,
        createdAt: new Date(),
        tasks: tasks.map(task => ({
          taskId: task._id,
          title: task.title,
          startDate: task.startDate,
          dueDate: task.dueDate,
          duration: this.calculateDurationInDays(task.startDate, task.dueDate),
          assignedTo: task.assignedTo,
          status: task.status,
          progress: task.progress
        }))
      };

      // Store baseline (you might want a separate Baseline collection)
      // For now, we'll return it
      return baseline;
    } catch (error) {
      logger.error('Error in createBaseline:', error);
      throw error;
    }
  }

  /**
   * Get baseline for project
   * @param {ObjectId} projectId - Project/Case ID
   * @returns {Object} - Baseline data
   */
  async getBaseline(projectId) {
    try {
      // Retrieve from storage (implement based on your storage strategy)
      // For now, return null
      return null;
    } catch (error) {
      logger.error('Error in getBaseline:', error);
      throw error;
    }
  }

  /**
   * Compare current project to baseline
   * @param {ObjectId} projectId - Project/Case ID
   * @returns {Object} - Comparison data
   */
  async compareToBaseline(projectId) {
    try {
      const baseline = await this.getBaseline(projectId);
      if (!baseline) {
        return { hasBaseline: false };
      }

      const currentTasks = await Task.find({ caseId: projectId }).lean();

      const comparison = {
        hasBaseline: true,
        baselineDate: baseline.createdAt,
        variances: []
      };

      baseline.tasks.forEach(baselineTask => {
        const currentTask = currentTasks.find(t => t._id.toString() === baselineTask.taskId.toString());

        if (currentTask) {
          const startVariance = this.calculateDurationInDays(baselineTask.startDate, currentTask.startDate);
          const endVariance = this.calculateDurationInDays(baselineTask.dueDate, currentTask.dueDate);
          const progressVariance = (currentTask.progress || 0) - (baselineTask.progress || 0);

          if (startVariance !== 0 || endVariance !== 0 || progressVariance !== 0) {
            comparison.variances.push({
              taskId: currentTask._id,
              title: currentTask.title,
              startVariance,
              endVariance,
              progressVariance,
              status: currentTask.status
            });
          }
        }
      });

      return comparison;
    } catch (error) {
      logger.error('Error in compareToBaseline:', error);
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // EXPORT
  // ═══════════════════════════════════════════════════════════════

  /**
   * Export to MS Project XML format
   * @param {ObjectId} projectId - Project/Case ID
   * @returns {String} - XML string
   */
  async exportToMSProject(projectId) {
    try {
      const tasks = await Task.find({ caseId: projectId })
        .populate('assignedTo', 'name')
        .lean();

      // Generate MS Project XML (simplified)
      let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
      xml += '<Project xmlns="http://schemas.microsoft.com/project">\n';
      xml += '  <Tasks>\n';

      tasks.forEach((task, index) => {
        xml += `    <Task>\n`;
        xml += `      <UID>${index + 1}</UID>\n`;
        xml += `      <ID>${index + 1}</ID>\n`;
        xml += `      <Name>${this.escapeXml(task.title)}</Name>\n`;
        xml += `      <Start>${task.startDate?.toISOString()}</Start>\n`;
        xml += `      <Finish>${task.dueDate?.toISOString()}</Finish>\n`;
        xml += `      <PercentComplete>${task.progress || 0}</PercentComplete>\n`;
        xml += `      <Priority>${this.getPriorityNumber(task.priority)}</Priority>\n`;
        xml += `    </Task>\n`;
      });

      xml += '  </Tasks>\n';
      xml += '</Project>';

      return xml;
    } catch (error) {
      logger.error('Error in exportToMSProject:', error);
      throw error;
    }
  }

  /**
   * Export to PDF (requires PDF library)
   * @param {ObjectId} projectId - Project/Case ID
   * @param {Object} options - Export options
   * @returns {Buffer} - PDF buffer
   */
  async exportToPDF(projectId, options = {}) {
    try {
      // This would require a PDF library like pdfkit or puppeteer
      // Placeholder implementation
      throw new Error('PDF export not yet implemented');
    } catch (error) {
      logger.error('Error in exportToPDF:', error);
      throw error;
    }
  }

  /**
   * Export to image (PNG/JPEG)
   * @param {ObjectId} projectId - Project/Case ID
   * @param {Object} options - Export options
   * @returns {Buffer} - Image buffer
   */
  async exportToImage(projectId, options = {}) {
    try {
      // This would require a screenshot library like puppeteer
      // Placeholder implementation
      throw new Error('Image export not yet implemented');
    } catch (error) {
      logger.error('Error in exportToImage:', error);
      throw error;
    }
  }

  /**
   * Export to Excel
   * @param {ObjectId} projectId - Project/Case ID
   * @returns {Object} - Excel data
   */
  async exportToExcel(projectId) {
    try {
      const tasks = await Task.find({ caseId: projectId })
        .populate('assignedTo', 'name email')
        .populate('caseId', 'title caseNumber')
        .lean();

      // Format for Excel (array of objects)
      const excelData = tasks.map(task => ({
        'Task ID': task._id.toString(),
        'Title': task.title,
        'Description': task.description || '',
        'Status': task.status,
        'Priority': task.priority,
        'Assigned To': task.assignedTo?.name || '',
        'Start Date': task.startDate ? this.formatDate(task.startDate) : '',
        'Due Date': task.dueDate ? this.formatDate(task.dueDate) : '',
        'Progress': `${task.progress || 0}%`,
        'Estimated Hours': task.timeTracking?.estimatedMinutes ? (task.timeTracking.estimatedMinutes / 60).toFixed(2) : '0',
        'Actual Hours': task.timeTracking?.actualMinutes ? (task.timeTracking.actualMinutes / 60).toFixed(2) : '0',
        'Case': task.caseId?.title || ''
      }));

      return excelData;
    } catch (error) {
      logger.error('Error in exportToExcel:', error);
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // HELPER METHODS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Format date for Gantt (YYYY-MM-DD HH:mm)
   * @param {Date} date - Date to format
   * @returns {String} - Formatted date
   */
  formatDate(date) {
    if (!date) return '';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day} 00:00`;
  }

  /**
   * Calculate duration in days (including partial days)
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Number} - Duration in days
   */
  calculateDurationInDays(startDate, endDate) {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  /**
   * Add days to a date
   * @param {Date} date - Starting date
   * @param {Number} days - Days to add
   * @returns {Date} - New date
   */
  addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  /**
   * Subtract days from a date
   * @param {Date} date - Starting date
   * @param {Number} days - Days to subtract
   * @returns {Date} - New date
   */
  subtractDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() - days);
    return result;
  }

  /**
   * Get task color based on priority and status
   * @param {Object} task - Task object
   * @returns {String} - Hex color
   */
  getTaskColor(task) {
    if (task.status === 'done') return '#10b981'; // green
    if (task.status === 'canceled') return '#6b7280'; // gray

    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();
    if (isOverdue) return '#ef4444'; // red

    switch (task.priority) {
      case 'critical':
        return '#dc2626'; // red-600
      case 'high':
        return '#f97316'; // orange-500
      case 'medium':
        return '#3b82f6'; // blue-500
      case 'low':
        return '#8b5cf6'; // purple-500
      default:
        return '#6b7280'; // gray-500
    }
  }

  /**
   * Check if task is on critical path (simplified)
   * @param {Object} task - Task object
   * @returns {Boolean} - True if critical
   */
  checkIfCritical(task) {
    // Simplified: tasks with no slack or high priority
    return task.priority === 'critical' ||
           (task.blockedBy && task.blockedBy.length > 0 && task.blocks && task.blocks.length > 0);
  }

  /**
   * Get resources from tasks
   * @param {Array} tasks - Array of tasks
   * @returns {Array} - Resource objects
   */
  async getResourcesFromTasks(tasks) {
    const resourceMap = new Map();

    tasks.forEach(task => {
      if (task.assignedTo) {
        const userId = task.assignedTo._id?.toString() || task.assignedTo.toString();
        if (!resourceMap.has(userId)) {
          resourceMap.set(userId, {
            id: userId,
            name: task.assignedTo.name || 'Unknown',
            email: task.assignedTo.email || '',
            avatar: task.assignedTo.avatar || null,
            taskCount: 0
          });
        }
        resourceMap.get(userId).taskCount++;
      }
    });

    return Array.from(resourceMap.values());
  }

  /**
   * Calculate project summary
   * @param {Array} tasks - Array of tasks
   * @param {ObjectId} projectId - Project ID
   * @returns {Object} - Summary statistics
   */
  async calculateProjectSummary(tasks, projectId) {
    const summary = {
      totalTasks: tasks.length,
      completedTasks: 0,
      inProgressTasks: 0,
      todoTasks: 0,
      overdueTasks: 0,
      projectStart: null,
      projectEnd: null,
      criticalPath: [],
      completionPercentage: 0
    };

    if (tasks.length === 0) {
      return summary;
    }

    const now = new Date();
    let earliestStart = new Date(8640000000000000);
    let latestEnd = new Date(0);
    let totalProgress = 0;

    tasks.forEach(task => {
      // Count by status
      if (task.status === 'done') summary.completedTasks++;
      if (task.status === 'in_progress') summary.inProgressTasks++;
      if (task.status === 'todo' || task.status === 'backlog') summary.todoTasks++;

      // Check overdue
      if (task.status !== 'done' && task.status !== 'canceled' &&
          task.dueDate && new Date(task.dueDate) < now) {
        summary.overdueTasks++;
      }

      // Calculate date range
      const start = task.startDate || task.createdAt;
      const end = task.dueDate || start;

      if (new Date(start) < earliestStart) earliestStart = new Date(start);
      if (new Date(end) > latestEnd) latestEnd = new Date(end);

      // Sum progress
      totalProgress += task.progress || 0;
    });

    summary.projectStart = earliestStart < new Date(8640000000000000) ? earliestStart : null;
    summary.projectEnd = latestEnd > new Date(0) ? latestEnd : null;
    summary.completionPercentage = Math.round(totalProgress / tasks.length);

    // Get critical path if projectId provided
    if (projectId) {
      try {
        summary.criticalPath = await this.calculateCriticalPath(projectId);
      } catch (error) {
        logger.error('Error calculating critical path:', error);
      }
    }

    return summary;
  }

  /**
   * Escape XML special characters
   * @param {String} str - String to escape
   * @returns {String} - Escaped string
   */
  escapeXml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Get priority as number for MS Project
   * @param {String} priority - Priority string
   * @returns {Number} - Priority number (500=normal)
   */
  getPriorityNumber(priority) {
    const map = {
      'critical': 1000,
      'high': 800,
      'medium': 500,
      'low': 200,
      'none': 500
    };
    return map[priority] || 500;
  }
}

module.exports = new GanttService();
