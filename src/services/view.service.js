/**
 * View Service - Flexible Data View Management
 *
 * Provides comprehensive view rendering capabilities for different visualization types:
 * - List views with column configuration
 * - Kanban boards with swimlanes
 * - Calendar views with event mapping
 * - Timeline views with grouping
 * - Gantt charts with critical path analysis
 * - Chart views with data aggregation
 * - Gallery, Map, Workload, and Pivot views
 *
 * Features:
 * - Dynamic query building from view filters
 * - View-specific data transformation
 * - Usage tracking and analytics
 * - View cloning and access control
 * - Multi-entity support (deals, contacts, tasks, etc.)
 */

const mongoose = require('mongoose');
const logger = require('../utils/logger');
const AuditLogService = require('./auditLog.service');
const View = require('../models/view.model');

/**
 * Escape special regex characters to prevent regex injection
 */
const escapeRegex = (str) => {
  if (typeof str !== 'string') return str;
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

class ViewService {
  // ═══════════════════════════════════════════════════════════════
  // MAIN RENDERING METHODS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Render view with data
   * @param {String|ObjectId} viewId - View ID
   * @param {Object} params - Query parameters (filters, pagination, dateRange, etc.)
   * @param {String|ObjectId} userId - User ID
   * @param {Object} context - Request context (firmId, userTeams, etc.)
   * @returns {Promise<Object>} - Rendered view data
   */
  async renderView(viewId, params = {}, userId, context = {}) {
    try {
      // SECURITY: Require firmId for IDOR protection
      if (!context.firmId) {
        throw new Error('Firm ID is required to render view');
      }

      // Get view configuration with firm verification
      const view = await View.findOne({
        _id: viewId,
        firmId: new mongoose.Types.ObjectId(context.firmId)
      })
        .populate('ownerId', 'firstName lastName email')
        .populate('teamId', 'name')
        .lean();

      if (!view) {
        throw new Error('View not found');
      }

      // Track view usage
      await this.trackViewUsage(viewId, userId);

      // Build query from view filters and params
      const query = this.buildQuery(view, params, context);

      // Get the model for this entity type
      const Model = this._getModelForEntityType(view.entityType);

      // Execute query with pagination
      const page = parseInt(params.page) || 1;
      const limit = parseInt(params.limit) || view.defaultPageSize || 50;
      const skip = (page - 1) * limit;

      const [data, total] = await Promise.all([
        Model.find(query.filter)
          .select(this._buildSelectFields(view))
          .populate(this._buildPopulateFields(view))
          .sort(query.sort)
          .skip(skip)
          .limit(Math.min(limit, view.maxRecords))
          .lean(),
        Model.countDocuments(query.filter)
      ]);

      // Transform data based on view type
      let transformedData;
      switch (view.type) {
        case 'list':
          transformedData = this.renderList(data, view);
          break;
        case 'kanban':
          transformedData = this.renderKanban(data, view.kanbanSettings, view);
          break;
        case 'calendar':
          transformedData = this.renderCalendar(data, view.calendarSettings, params);
          break;
        case 'timeline':
          transformedData = this.renderTimeline(data, view.timelineSettings);
          break;
        case 'gantt':
          transformedData = this.renderGantt(data, view.ganttSettings);
          break;
        case 'chart':
          transformedData = this.renderChart(data, view.chartSettings);
          break;
        case 'gallery':
          transformedData = this.renderGallery(data, view.gallerySettings);
          break;
        case 'map':
          transformedData = this.renderMap(data, view.mapSettings);
          break;
        case 'workload':
          transformedData = this.renderWorkload(data, view.workloadSettings);
          break;
        case 'pivot':
          transformedData = this.renderPivot(data, view.pivotSettings);
          break;
        default:
          transformedData = data;
      }

      return {
        view: {
          id: view._id,
          name: view.name,
          type: view.type,
          entityType: view.entityType
        },
        data: transformedData,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        },
        meta: {
          query: query.filter,
          sort: query.sort,
          renderedAt: new Date()
        }
      };
    } catch (error) {
      logger.error('ViewService.renderView failed:', error);
      throw error;
    }
  }

  /**
   * Build MongoDB query from view filters
   * @param {Object} view - View configuration
   * @param {Object} params - User input parameters
   * @param {Object} context - Request context
   * @returns {Object} - { filter, sort }
   */
  buildQuery(view, params = {}, context = {}) {
    try {
      const filter = {
        firmId: new mongoose.Types.ObjectId(context.firmId || view.firmId)
      };

      // Apply view filters
      if (view.filters && view.filters.length > 0) {
        view.filters.forEach(filterConfig => {
          const filterValue = filterConfig.isUserInput && params[filterConfig.field]
            ? params[filterConfig.field]
            : filterConfig.value;

          const mongoFilter = this._convertFilterToMongo(
            filterConfig.field,
            filterConfig.operator,
            filterValue,
            filterConfig.valueEnd
          );

          if (mongoFilter) {
            Object.assign(filter, mongoFilter);
          }
        });
      }

      // Apply runtime filters from params
      if (params.filters) {
        Object.entries(params.filters).forEach(([field, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            filter[field] = value;
          }
        });
      }

      // Build sort object
      const sort = {};
      if (view.sorting && view.sorting.length > 0) {
        view.sorting.forEach(sortConfig => {
          sort[sortConfig.field] = sortConfig.direction === 'desc' ? -1 : 1;
        });
      } else {
        // Default sort by createdAt
        sort.createdAt = -1;
      }

      // Apply runtime sort from params
      if (params.sortBy) {
        const direction = params.sortOrder === 'desc' ? -1 : 1;
        sort[params.sortBy] = direction;
      }

      return { filter, sort };
    } catch (error) {
      logger.error('ViewService.buildQuery failed:', error);
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // VIEW TYPE RENDERERS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Render list view
   * @param {Array} data - Raw data
   * @param {Object} view - View configuration
   * @returns {Array} - Formatted data with column visibility and formatting
   */
  renderList(data, view) {
    try {
      // Get visible columns
      const visibleColumns = (view.columns || [])
        .filter(col => col.visible)
        .sort((a, b) => a.order - b.order);

      // Apply grouping if specified
      if (view.grouping && view.grouping.length > 0) {
        return this._applyGrouping(data, view.grouping, visibleColumns);
      }

      // Format each row
      return data.map(row => {
        const formattedRow = { _id: row._id };

        visibleColumns.forEach(col => {
          const value = this._getNestedValue(row, col.field);
          formattedRow[col.field] = this._formatValue(value, col.format);
        });

        // Include original row for reference
        formattedRow._original = row;

        return formattedRow;
      });
    } catch (error) {
      logger.error('ViewService.renderList failed:', error);
      return data;
    }
  }

  /**
   * Render kanban view
   * @param {Array} data - Raw data
   * @param {Object} settings - Kanban settings
   * @param {Object} view - View configuration
   * @returns {Object} - Columns with cards
   */
  renderKanban(data, settings, view) {
    try {
      if (!settings || !settings.columnField) {
        throw new Error('Kanban settings missing columnField');
      }

      const columns = {};
      const swimlanes = settings.swimlaneField ? {} : null;

      data.forEach(item => {
        // Get column value
        const columnValue = this._getNestedValue(item, settings.columnField) || 'uncategorized';
        const columnKey = typeof columnValue === 'object' ? columnValue._id?.toString() : String(columnValue);

        // Get swimlane value if configured
        let swimlaneKey = null;
        if (settings.swimlaneField) {
          const swimlaneValue = this._getNestedValue(item, settings.swimlaneField) || 'uncategorized';
          swimlaneKey = typeof swimlaneValue === 'object' ? swimlaneValue._id?.toString() : String(swimlaneValue);
        }

        // Initialize column if needed
        if (!columns[columnKey]) {
          columns[columnKey] = {
            id: columnKey,
            name: columnValue?.name || columnValue?.label || columnValue,
            cards: [],
            collapsed: settings.collapsedColumns?.includes(columnKey) || false
          };
        }

        // Build card
        const card = {
          _id: item._id,
          title: this._getNestedValue(item, 'title') || this._getNestedValue(item, 'name') || 'Untitled'
        };

        // Add card fields
        if (settings.cardFields && settings.cardFields.length > 0) {
          settings.cardFields
            .filter(f => f.visible !== false)
            .sort((a, b) => (a.order || 0) - (b.order || 0))
            .forEach(fieldConfig => {
              const value = this._getNestedValue(item, fieldConfig.field);
              card[fieldConfig.field] = value;
              card[`${fieldConfig.field}_label`] = fieldConfig.label;
            });
        }

        // Add color if configured
        if (settings.colorField) {
          card.color = this._getNestedValue(item, settings.colorField);
        }

        // Add swimlane info
        if (swimlaneKey) {
          card.swimlane = swimlaneKey;
        }

        columns[columnKey].cards.push(card);
      });

      // Sort cards within each column
      Object.values(columns).forEach(column => {
        this._sortKanbanCards(column.cards, settings.sortBy);
      });

      return {
        columns: Object.values(columns),
        swimlanes: swimlanes ? Object.values(swimlanes) : null,
        settings: {
          columnField: settings.columnField,
          cardSize: settings.cardSize || 'normal',
          sortBy: settings.sortBy
        }
      };
    } catch (error) {
      logger.error('ViewService.renderKanban failed:', error);
      throw error;
    }
  }

  /**
   * Render calendar view
   * @param {Array} data - Raw data
   * @param {Object} settings - Calendar settings
   * @param {Object} params - Query params (for date range filtering)
   * @returns {Object} - Calendar events
   */
  renderCalendar(data, settings, params = {}) {
    try {
      if (!settings || !settings.startDateField || !settings.titleField) {
        throw new Error('Calendar settings missing required fields');
      }

      const events = data.map(item => {
        const startDate = this._getNestedValue(item, settings.startDateField);
        const endDate = settings.endDateField
          ? this._getNestedValue(item, settings.endDateField)
          : startDate;
        const title = this._getNestedValue(item, settings.titleField);

        const event = {
          id: item._id.toString(),
          title: title || 'Untitled Event',
          start: startDate,
          end: endDate || startDate,
          allDay: !this._hasTimeComponent(startDate)
        };

        // Add color if configured
        if (settings.colorField) {
          event.color = this._getNestedValue(item, settings.colorField);
        }

        // Add original data
        event.data = item;

        return event;
      });

      // Filter by date range if provided in params
      let filteredEvents = events;
      if (params.startDate || params.endDate) {
        filteredEvents = events.filter(event => {
          const eventStart = new Date(event.start);
          const eventEnd = new Date(event.end);

          if (params.startDate && eventEnd < new Date(params.startDate)) {
            return false;
          }
          if (params.endDate && eventStart > new Date(params.endDate)) {
            return false;
          }
          return true;
        });
      }

      return {
        events: filteredEvents,
        settings: {
          defaultView: settings.defaultView || 'month',
          firstDayOfWeek: settings.firstDayOfWeek || 0,
          timeFormat: settings.timeFormat || '12h',
          showWeekends: settings.showWeekends !== false,
          slotDuration: settings.slotDuration || 30
        }
      };
    } catch (error) {
      logger.error('ViewService.renderCalendar failed:', error);
      throw error;
    }
  }

  /**
   * Render timeline view
   * @param {Array} data - Raw data
   * @param {Object} settings - Timeline settings
   * @returns {Object} - Timeline data
   */
  renderTimeline(data, settings) {
    try {
      if (!settings || !settings.startField || !settings.endField) {
        throw new Error('Timeline settings missing required fields');
      }

      // Group data if groupByField is specified
      const groups = {};
      const items = [];

      data.forEach(item => {
        const startDate = this._getNestedValue(item, settings.startField);
        const endDate = this._getNestedValue(item, settings.endField);
        const title = this._getNestedValue(item, 'title') || this._getNestedValue(item, 'name') || 'Untitled';

        // Determine group
        let groupId = 'default';
        if (settings.groupByField) {
          const groupValue = this._getNestedValue(item, settings.groupByField);
          groupId = typeof groupValue === 'object'
            ? groupValue._id?.toString() || 'default'
            : String(groupValue || 'default');

          // Create group if not exists
          if (!groups[groupId]) {
            groups[groupId] = {
              id: groupId,
              name: groupValue?.name || groupValue?.label || groupValue || 'Uncategorized',
              items: []
            };
          }
        }

        // Check if milestone
        const isMilestone = settings.milestoneField
          ? this._getNestedValue(item, settings.milestoneField)
          : false;

        const timelineItem = {
          id: item._id.toString(),
          title,
          start: startDate,
          end: endDate,
          group: groupId,
          type: isMilestone ? 'milestone' : 'range'
        };

        // Add color if configured
        if (settings.colorField) {
          timelineItem.color = this._getNestedValue(item, settings.colorField);
        }

        items.push(timelineItem);

        if (settings.groupByField && groups[groupId]) {
          groups[groupId].items.push(timelineItem);
        }
      });

      return {
        items,
        groups: settings.groupByField ? Object.values(groups) : null,
        settings: {
          defaultZoom: settings.defaultZoom || 'month',
          showToday: settings.showToday !== false,
          allowOverlap: settings.allowOverlap !== false
        }
      };
    } catch (error) {
      logger.error('ViewService.renderTimeline failed:', error);
      throw error;
    }
  }

  /**
   * Render gantt view
   * @param {Array} data - Raw data
   * @param {Object} settings - Gantt settings
   * @returns {Object} - Gantt data
   */
  renderGantt(data, settings) {
    try {
      if (!settings || !settings.startField || !settings.endField) {
        throw new Error('Gantt settings missing required fields');
      }

      const tasks = data.map(item => {
        const startDate = this._getNestedValue(item, settings.startField);
        const endDate = this._getNestedValue(item, settings.endField);
        const title = this._getNestedValue(item, 'title') || this._getNestedValue(item, 'name') || 'Untitled';

        // Calculate duration in days
        const duration = this._calculateDurationInDays(startDate, endDate);

        // Get progress if configured
        let progress = 0;
        if (settings.progressField) {
          progress = this._getNestedValue(item, settings.progressField) || 0;
          // Normalize to 0-1 range if needed
          if (progress > 1) {
            progress = progress / 100;
          }
        }

        const task = {
          id: item._id.toString(),
          text: title,
          start_date: this._formatDateForGantt(startDate),
          end_date: this._formatDateForGantt(endDate),
          duration,
          progress,
          type: duration === 0 ? 'milestone' : 'task'
        };

        // Add dependencies if configured
        if (settings.dependencyField) {
          const dependencies = this._getNestedValue(item, settings.dependencyField);
          if (dependencies) {
            task.dependencies = Array.isArray(dependencies)
              ? dependencies.map(d => d.toString())
              : [dependencies.toString()];
          }
        }

        return task;
      });

      // Extract links from dependencies
      const links = this._extractGanttLinks(tasks);

      // Calculate critical path if enabled
      let criticalPath = null;
      if (settings.criticalPathEnabled) {
        criticalPath = this.calculateCriticalPath(tasks);
      }

      return {
        tasks,
        links,
        criticalPath,
        settings: {
          showMilestones: settings.showMilestones !== false,
          autoScheduling: settings.autoScheduling || false,
          baselineEnabled: settings.baselineEnabled || false
        }
      };
    } catch (error) {
      logger.error('ViewService.renderGantt failed:', error);
      throw error;
    }
  }

  /**
   * Calculate critical path for gantt
   * @param {Array} tasks - Gantt tasks
   * @returns {Object} - Critical path analysis
   */
  calculateCriticalPath(tasks) {
    try {
      // Build dependency graph
      const taskMap = new Map();
      const inDegree = new Map();
      const graph = new Map();

      // Initialize
      tasks.forEach(task => {
        taskMap.set(task.id, task);
        inDegree.set(task.id, 0);
        graph.set(task.id, []);
      });

      // Build graph from dependencies
      tasks.forEach(task => {
        if (task.dependencies && task.dependencies.length > 0) {
          task.dependencies.forEach(depId => {
            if (graph.has(depId)) {
              graph.get(depId).push(task.id);
              inDegree.set(task.id, inDegree.get(task.id) + 1);
            }
          });
        }
      });

      // Topological sort (Kahn's algorithm)
      const queue = [];
      const sorted = [];

      inDegree.forEach((degree, taskId) => {
        if (degree === 0) {
          queue.push(taskId);
        }
      });

      while (queue.length > 0) {
        const taskId = queue.shift();
        sorted.push(taskId);

        const neighbors = graph.get(taskId) || [];
        neighbors.forEach(neighborId => {
          inDegree.set(neighborId, inDegree.get(neighborId) - 1);
          if (inDegree.get(neighborId) === 0) {
            queue.push(neighborId);
          }
        });
      }

      // Calculate earliest start/finish times
      const ES = new Map(); // Earliest Start
      const EF = new Map(); // Earliest Finish

      sorted.forEach(taskId => {
        const task = taskMap.get(taskId);
        let earliestStart = 0;

        // Find max EF of all dependencies
        if (task.dependencies && task.dependencies.length > 0) {
          task.dependencies.forEach(depId => {
            if (EF.has(depId)) {
              earliestStart = Math.max(earliestStart, EF.get(depId));
            }
          });
        }

        ES.set(taskId, earliestStart);
        EF.set(taskId, earliestStart + task.duration);
      });

      // Calculate latest start/finish times (backward pass)
      const LS = new Map(); // Latest Start
      const LF = new Map(); // Latest Finish

      // Project end time
      let projectEnd = 0;
      EF.forEach(ef => {
        projectEnd = Math.max(projectEnd, ef);
      });

      // Reverse topological order
      for (let i = sorted.length - 1; i >= 0; i--) {
        const taskId = sorted[i];
        const task = taskMap.get(taskId);

        // Find successors
        const successors = graph.get(taskId) || [];
        let latestFinish = projectEnd;

        if (successors.length > 0) {
          latestFinish = Math.min(...successors.map(succId => LS.get(succId) || projectEnd));
        }

        LF.set(taskId, latestFinish);
        LS.set(taskId, latestFinish - task.duration);
      }

      // Calculate float/slack and identify critical tasks
      const criticalTasks = [];
      tasks.forEach(task => {
        const es = ES.get(task.id) || 0;
        const ef = EF.get(task.id) || 0;
        const ls = LS.get(task.id) || 0;
        const lf = LF.get(task.id) || 0;
        const totalFloat = ls - es;

        if (totalFloat === 0) {
          criticalTasks.push(task.id);
        }

        task.es = es;
        task.ef = ef;
        task.ls = ls;
        task.lf = lf;
        task.totalFloat = totalFloat;
        task.isCritical = totalFloat === 0;
      });

      return {
        criticalTasks,
        projectDuration: projectEnd,
        criticalPathExists: criticalTasks.length > 0
      };
    } catch (error) {
      logger.error('ViewService.calculateCriticalPath failed:', error);
      return {
        criticalTasks: [],
        projectDuration: 0,
        criticalPathExists: false,
        error: error.message
      };
    }
  }

  /**
   * Render chart view
   * @param {Array} data - Raw data
   * @param {Object} settings - Chart settings
   * @returns {Object} - Chart data
   */
  renderChart(data, settings) {
    try {
      if (!settings || !settings.chartType) {
        throw new Error('Chart settings missing chartType');
      }

      // Group data by xAxis field
      const grouped = {};
      data.forEach(item => {
        const xValue = settings.xAxis?.field
          ? this._getNestedValue(item, settings.xAxis.field)
          : 'default';
        const xKey = typeof xValue === 'object'
          ? xValue?.name || xValue?.label || String(xValue)
          : String(xValue || 'Uncategorized');

        if (!grouped[xKey]) {
          grouped[xKey] = [];
        }
        grouped[xKey].push(item);
      });

      // Aggregate yAxis values
      const labels = Object.keys(grouped);
      const datasets = [];

      if (settings.yAxis?.field) {
        const values = labels.map(label => {
          const items = grouped[label];
          return this._aggregateValues(
            items,
            settings.yAxis.field,
            settings.aggregation || 'count'
          );
        });

        datasets.push({
          label: settings.yAxis.label || settings.yAxis.field,
          data: values,
          backgroundColor: settings.colorScheme || this._getDefaultColors(labels.length)
        });
      } else {
        // Just count items in each group
        const values = labels.map(label => grouped[label].length);
        datasets.push({
          label: 'Count',
          data: values,
          backgroundColor: settings.colorScheme || this._getDefaultColors(labels.length)
        });
      }

      return {
        type: settings.chartType,
        data: {
          labels,
          datasets
        },
        options: {
          stacked: settings.stacked || false,
          showLegend: settings.showLegend !== false,
          showDataLabels: settings.showDataLabels || false
        }
      };
    } catch (error) {
      logger.error('ViewService.renderChart failed:', error);
      throw error;
    }
  }

  /**
   * Render gallery view
   * @param {Array} data - Raw data
   * @param {Object} settings - Gallery settings
   * @returns {Object} - Gallery items
   */
  renderGallery(data, settings) {
    try {
      if (!settings || !settings.imageField || !settings.titleField) {
        throw new Error('Gallery settings missing required fields');
      }

      const items = data.map(item => ({
        id: item._id.toString(),
        image: this._getNestedValue(item, settings.imageField),
        title: this._getNestedValue(item, settings.titleField),
        subtitle: settings.subtitleField
          ? this._getNestedValue(item, settings.subtitleField)
          : null,
        data: item
      }));

      return {
        items,
        settings: {
          cardSize: settings.cardSize || 'medium',
          columns: settings.columns || 3,
          showOverlay: settings.showOverlay !== false
        }
      };
    } catch (error) {
      logger.error('ViewService.renderGallery failed:', error);
      throw error;
    }
  }

  /**
   * Render map view
   * @param {Array} data - Raw data
   * @param {Object} settings - Map settings
   * @returns {Object} - Map markers
   */
  renderMap(data, settings) {
    try {
      if (!settings || !settings.locationField || !settings.titleField) {
        throw new Error('Map settings missing required fields');
      }

      const markers = data
        .map(item => {
          const location = this._getNestedValue(item, settings.locationField);
          if (!location) return null;

          return {
            id: item._id.toString(),
            title: this._getNestedValue(item, settings.titleField),
            location: location,
            color: settings.markerColorField
              ? this._getNestedValue(item, settings.markerColorField)
              : null,
            data: item
          };
        })
        .filter(Boolean);

      return {
        markers,
        settings: {
          defaultCenter: settings.defaultCenter || { lat: 0, lng: 0 },
          defaultZoom: settings.defaultZoom || 10,
          clusterMarkers: settings.clusterMarkers !== false,
          showHeatmap: settings.showHeatmap || false
        }
      };
    } catch (error) {
      logger.error('ViewService.renderMap failed:', error);
      throw error;
    }
  }

  /**
   * Render workload view
   * @param {Array} data - Raw data
   * @param {Object} settings - Workload settings
   * @returns {Object} - Workload data
   */
  renderWorkload(data, settings) {
    try {
      if (!settings || !settings.assigneeField) {
        throw new Error('Workload settings missing assigneeField');
      }

      const workloads = {};

      data.forEach(item => {
        const assignee = this._getNestedValue(item, settings.assigneeField);
        const assigneeId = typeof assignee === 'object'
          ? assignee._id?.toString() || 'unassigned'
          : String(assignee || 'unassigned');

        if (!workloads[assigneeId]) {
          workloads[assigneeId] = {
            id: assigneeId,
            name: assignee?.name || assignee?.firstName || assignee || 'Unassigned',
            items: [],
            totalEffort: 0,
            capacity: settings.capacityField
              ? this._getNestedValue(assignee, settings.capacityField) || 0
              : 0
          };
        }

        const effort = settings.effortField
          ? this._getNestedValue(item, settings.effortField) || 0
          : 1;

        workloads[assigneeId].items.push(item);
        workloads[assigneeId].totalEffort += effort;
      });

      // Calculate utilization
      Object.values(workloads).forEach(workload => {
        if (workload.capacity > 0) {
          workload.utilization = (workload.totalEffort / workload.capacity) * 100;
          workload.isOverallocated = workload.totalEffort > workload.capacity;
        } else {
          workload.utilization = 0;
          workload.isOverallocated = false;
        }
      });

      return {
        workloads: Object.values(workloads),
        settings: {
          timeUnit: settings.timeUnit || 'hours',
          showOverallocated: settings.showOverallocated !== false,
          showCapacityLine: settings.showCapacityLine !== false
        }
      };
    } catch (error) {
      logger.error('ViewService.renderWorkload failed:', error);
      throw error;
    }
  }

  /**
   * Render pivot table view
   * @param {Array} data - Raw data
   * @param {Object} settings - Pivot settings
   * @returns {Object} - Pivot table data
   */
  renderPivot(data, settings) {
    try {
      if (!settings || !settings.rows || !settings.values) {
        throw new Error('Pivot settings missing required fields');
      }

      // This is a simplified pivot implementation
      // A full implementation would require more complex grouping and aggregation

      const pivotData = {};

      data.forEach(item => {
        // Build row key
        const rowKey = settings.rows
          .map(r => this._getNestedValue(item, r.field))
          .join('|');

        if (!pivotData[rowKey]) {
          pivotData[rowKey] = {
            key: rowKey,
            values: {},
            count: 0
          };
        }

        pivotData[rowKey].count++;

        // Aggregate values
        settings.values.forEach(valueConfig => {
          const value = this._getNestedValue(item, valueConfig.field);
          const aggKey = `${valueConfig.field}_${valueConfig.aggregation}`;

          if (!pivotData[rowKey].values[aggKey]) {
            pivotData[rowKey].values[aggKey] = {
              field: valueConfig.field,
              aggregation: valueConfig.aggregation,
              values: []
            };
          }

          if (value !== null && value !== undefined) {
            pivotData[rowKey].values[aggKey].values.push(value);
          }
        });
      });

      // Calculate aggregations
      Object.values(pivotData).forEach(row => {
        Object.values(row.values).forEach(agg => {
          agg.result = this._calculateAggregation(agg.values, agg.aggregation);
        });
      });

      return {
        data: Object.values(pivotData),
        settings: {
          showSubtotals: settings.showSubtotals !== false,
          showGrandTotals: settings.showGrandTotals !== false
        }
      };
    } catch (error) {
      logger.error('ViewService.renderPivot failed:', error);
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // VIEW MANAGEMENT METHODS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get views for entity type
   * @param {String|ObjectId} firmId - Firm ID
   * @param {String} entityType - Entity type (deal, contact, task, etc.)
   * @param {String|ObjectId} userId - User ID
   * @param {Array} userTeams - User's team IDs
   * @returns {Promise<Array>} - Array of accessible views
   */
  async getViewsForEntity(firmId, entityType, userId, userTeams = []) {
    try {
      const views = await View.getViewsForEntity(
        firmId,
        entityType,
        userId,
        { userTeams }
      );

      return views;
    } catch (error) {
      logger.error('ViewService.getViewsForEntity failed:', error);
      throw error;
    }
  }

  /**
   * Clone view
   * @param {String|ObjectId} viewId - View ID to clone
   * @param {String|ObjectId} userId - User ID
   * @param {String} newName - New name for cloned view
   * @param {String|ObjectId} firmId - Firm ID
   * @returns {Promise<Object>} - Cloned view
   */
  async cloneView(viewId, userId, newName, firmId) {
    try {
      const clonedView = await View.cloneView(viewId, userId, newName);

      // Log to audit
      await AuditLogService.log(
        'clone_view',
        'view',
        clonedView._id.toString(),
        null,
        {
          userId,
          firmId,
          details: {
            originalViewId: viewId,
            newName
          }
        }
      );

      return clonedView;
    } catch (error) {
      logger.error('ViewService.cloneView failed:', error);
      throw error;
    }
  }

  /**
   * Track view usage
   * @param {String|ObjectId} viewId - View ID
   * @param {String|ObjectId} userId - User ID
   * @returns {Promise<void>}
   */
  async trackViewUsage(viewId, userId) {
    try {
      await View.trackUsage(viewId, userId);
    } catch (error) {
      logger.error('ViewService.trackViewUsage failed:', error);
      // Don't throw - usage tracking failures shouldn't break view rendering
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // HELPER METHODS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get model for entity type
   * @private
   * @param {String} entityType - Entity type
   * @returns {Model} - Mongoose model
   */
  _getModelForEntityType(entityType) {
    const modelMap = {
      deal: 'Deal',
      contact: 'Contact',
      task: 'Task',
      project: 'Project',
      case: 'Case',
      lead: 'Lead',
      invoice: 'Invoice',
      expense: 'Expense',
      time_entry: 'TimeEntry',
      document: 'Document'
    };

    const modelName = modelMap[entityType];
    if (!modelName) {
      throw new Error(`Unknown entity type: ${entityType}`);
    }

    try {
      return mongoose.model(modelName);
    } catch (error) {
      throw new Error(`Model not found for entity type: ${entityType}`);
    }
  }

  /**
   * Build select fields from view columns
   * @private
   * @param {Object} view - View configuration
   * @returns {String} - Select fields string
   */
  _buildSelectFields(view) {
    if (!view.columns || view.columns.length === 0) {
      return '';
    }

    const fields = view.columns
      .filter(col => col.visible)
      .map(col => col.field)
      .join(' ');

    return fields;
  }

  /**
   * Build populate fields from view columns
   * @private
   * @param {Object} view - View configuration
   * @returns {Array} - Populate configurations
   */
  _buildPopulateFields(view) {
    // This is simplified - a full implementation would analyze the fields
    // and determine which ones need to be populated
    const commonPopulates = [
      { path: 'assignedTo', select: 'firstName lastName email avatar' },
      { path: 'createdBy', select: 'firstName lastName email' },
      { path: 'ownerId', select: 'firstName lastName email' }
    ];

    return commonPopulates;
  }

  /**
   * Convert filter to MongoDB query
   * @private
   * @param {String} field - Field name
   * @param {String} operator - Filter operator
   * @param {*} value - Filter value
   * @param {*} valueEnd - End value (for between operator)
   * @returns {Object} - MongoDB filter object
   */
  _convertFilterToMongo(field, operator, value, valueEnd) {
    if (value === null || value === undefined) {
      // Handle null/empty operators
      if (operator === 'is_null') return { [field]: null };
      if (operator === 'is_not_null') return { [field]: { $ne: null } };
      if (operator === 'is_empty') return { [field]: { $in: [null, '', []] } };
      if (operator === 'is_not_empty') return { [field]: { $nin: [null, '', []] } };
      return null;
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (operator) {
      case 'equals':
        return { [field]: value };
      case 'not_equals':
        return { [field]: { $ne: value } };
      case 'contains':
        return { [field]: { $regex: escapeRegex(value), $options: 'i' } };
      case 'not_contains':
        return { [field]: { $not: { $regex: escapeRegex(value), $options: 'i' } } };
      case 'starts_with':
        return { [field]: { $regex: `^${escapeRegex(value)}`, $options: 'i' } };
      case 'ends_with':
        return { [field]: { $regex: `${escapeRegex(value)}$`, $options: 'i' } };
      case 'greater_than':
        return { [field]: { $gt: value } };
      case 'less_than':
        return { [field]: { $lt: value } };
      case 'greater_than_or_equal':
        return { [field]: { $gte: value } };
      case 'less_than_or_equal':
        return { [field]: { $lte: value } };
      case 'between':
        return { [field]: { $gte: value, $lte: valueEnd } };
      case 'not_between':
        return { [field]: { $not: { $gte: value, $lte: valueEnd } } };
      case 'in':
        return { [field]: { $in: Array.isArray(value) ? value : [value] } };
      case 'not_in':
        return { [field]: { $nin: Array.isArray(value) ? value : [value] } };
      case 'before':
        return { [field]: { $lt: new Date(value) } };
      case 'after':
        return { [field]: { $gt: new Date(value) } };
      case 'on_or_before':
        return { [field]: { $lte: new Date(value) } };
      case 'on_or_after':
        return { [field]: { $gte: new Date(value) } };
      case 'today':
        return {
          [field]: {
            $gte: today,
            $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
          }
        };
      case 'yesterday':
        const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
        return {
          [field]: {
            $gte: yesterday,
            $lt: today
          }
        };
      case 'tomorrow':
        const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
        return {
          [field]: {
            $gte: tomorrow,
            $lt: new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000)
          }
        };
      case 'this_week':
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
        return { [field]: { $gte: weekStart, $lt: weekEnd } };
      case 'this_month':
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 1);
        return { [field]: { $gte: monthStart, $lt: monthEnd } };
      case 'this_year':
        const yearStart = new Date(today.getFullYear(), 0, 1);
        const yearEnd = new Date(today.getFullYear() + 1, 0, 1);
        return { [field]: { $gte: yearStart, $lt: yearEnd } };
      default:
        return null;
    }
  }

  /**
   * Get nested value from object
   * @private
   * @param {Object} obj - Object
   * @param {String} path - Dot-notation path
   * @returns {*} - Value
   */
  _getNestedValue(obj, path) {
    if (!path) return obj;
    return path.split('.').reduce((current, prop) => current?.[prop], obj);
  }

  /**
   * Format value according to column format
   * @private
   * @param {*} value - Value to format
   * @param {Object} format - Format configuration
   * @returns {*} - Formatted value
   */
  _formatValue(value, format) {
    if (!format || !format.type) return value;

    switch (format.type) {
      case 'currency':
        if (typeof value === 'number') {
          const currency = format.currencyCode || 'USD';
          return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency
          }).format(value);
        }
        return value;

      case 'date':
        if (value instanceof Date || typeof value === 'string') {
          const dateFormat = format.dateFormat || 'yyyy-MM-dd';
          // Simple date formatting - in production use a library like date-fns
          return new Date(value).toLocaleDateString();
        }
        return value;

      case 'datetime':
        if (value instanceof Date || typeof value === 'string') {
          return new Date(value).toLocaleString();
        }
        return value;

      case 'boolean':
        return value ? 'Yes' : 'No';

      case 'number':
        if (typeof value === 'number') {
          const numberFormat = format.numberFormat || '0,0';
          return value.toLocaleString();
        }
        return value;

      default:
        return value;
    }
  }

  /**
   * Apply grouping to data
   * @private
   * @param {Array} data - Data to group
   * @param {Array} grouping - Grouping configuration
   * @param {Array} columns - Column configuration
   * @returns {Array} - Grouped data
   */
  _applyGrouping(data, grouping, columns) {
    if (!grouping || grouping.length === 0) return data;

    const grouped = {};
    const primaryGroup = grouping[0];

    data.forEach(item => {
      const groupValue = this._getNestedValue(item, primaryGroup.field) || 'Uncategorized';
      const groupKey = typeof groupValue === 'object'
        ? groupValue._id?.toString() || String(groupValue)
        : String(groupValue);

      if (!grouped[groupKey]) {
        grouped[groupKey] = {
          groupBy: primaryGroup.field,
          groupValue,
          items: [],
          collapsed: primaryGroup.collapsed || false
        };
      }

      grouped[groupKey].items.push(item);
    });

    // Calculate aggregations
    Object.values(grouped).forEach(group => {
      if (primaryGroup.aggregation && primaryGroup.aggregation !== 'none') {
        group.count = group.items.length;
      }
    });

    return Object.values(grouped);
  }

  /**
   * Sort kanban cards
   * @private
   * @param {Array} cards - Cards to sort
   * @param {String} sortBy - Sort method
   */
  _sortKanbanCards(cards, sortBy) {
    switch (sortBy) {
      case 'created_date':
        cards.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        break;
      case 'due_date':
        cards.sort((a, b) => new Date(a.dueDate || 0) - new Date(b.dueDate || 0));
        break;
      case 'priority':
        const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
        cards.sort((a, b) => (priorityOrder[a.priority] || 99) - (priorityOrder[b.priority] || 99));
        break;
      case 'alphabetical':
        cards.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
        break;
      case 'manual':
      default:
        // Keep original order
        break;
    }
  }

  /**
   * Check if date has time component
   * @private
   * @param {Date|String} date - Date to check
   * @returns {Boolean}
   */
  _hasTimeComponent(date) {
    if (!date) return false;
    const d = new Date(date);
    return d.getHours() !== 0 || d.getMinutes() !== 0 || d.getSeconds() !== 0;
  }

  /**
   * Calculate duration in days
   * @private
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Number} - Duration in days
   */
  _calculateDurationInDays(startDate, endDate) {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays || 1;
  }

  /**
   * Format date for Gantt
   * @private
   * @param {Date} date - Date to format
   * @returns {String} - Formatted date (DD-MM-YYYY)
   */
  _formatDateForGantt(date) {
    if (!date) return '';
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  }

  /**
   * Extract Gantt links from tasks
   * @private
   * @param {Array} tasks - Gantt tasks
   * @returns {Array} - Links
   */
  _extractGanttLinks(tasks) {
    const links = [];
    let linkId = 1;

    tasks.forEach(task => {
      if (task.dependencies && task.dependencies.length > 0) {
        task.dependencies.forEach(depId => {
          links.push({
            id: linkId++,
            source: depId,
            target: task.id,
            type: '0' // finish-to-start
          });
        });
      }
    });

    return links;
  }

  /**
   * Aggregate values
   * @private
   * @param {Array} items - Items to aggregate
   * @param {String} field - Field to aggregate
   * @param {String} aggregation - Aggregation method
   * @returns {Number} - Aggregated value
   */
  _aggregateValues(items, field, aggregation) {
    const values = items
      .map(item => this._getNestedValue(item, field))
      .filter(v => typeof v === 'number' && !isNaN(v));

    switch (aggregation) {
      case 'sum':
        return values.reduce((sum, v) => sum + v, 0);
      case 'avg':
        return values.length > 0 ? values.reduce((sum, v) => sum + v, 0) / values.length : 0;
      case 'min':
        return values.length > 0 ? Math.min(...values) : 0;
      case 'max':
        return values.length > 0 ? Math.max(...values) : 0;
      case 'count':
      default:
        return items.length;
    }
  }

  /**
   * Calculate aggregation for pivot
   * @private
   * @param {Array} values - Values to aggregate
   * @param {String} aggregation - Aggregation method
   * @returns {Number} - Aggregated value
   */
  _calculateAggregation(values, aggregation) {
    if (values.length === 0) return 0;

    switch (aggregation) {
      case 'sum':
        return values.reduce((sum, v) => sum + v, 0);
      case 'avg':
        return values.reduce((sum, v) => sum + v, 0) / values.length;
      case 'min':
        return Math.min(...values);
      case 'max':
        return Math.max(...values);
      case 'count':
      default:
        return values.length;
    }
  }

  /**
   * Get default color scheme
   * @private
   * @param {Number} count - Number of colors needed
   * @returns {Array} - Array of color strings
   */
  _getDefaultColors(count) {
    const colors = [
      '#4F46E5', '#EC4899', '#10B981', '#F59E0B', '#8B5CF6',
      '#06B6D4', '#F97316', '#14B8A6', '#EF4444', '#6366F1'
    ];

    if (count <= colors.length) {
      return colors.slice(0, count);
    }

    // Generate more colors if needed
    const extendedColors = [...colors];
    while (extendedColors.length < count) {
      extendedColors.push(`hsl(${Math.random() * 360}, 70%, 50%)`);
    }

    return extendedColors;
  }
}

// Export singleton instance
module.exports = new ViewService();
