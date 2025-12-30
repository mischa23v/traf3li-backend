/**
 * Report Builder Service
 *
 * Service for building and executing self-serve reports with support for:
 * - Dynamic data sources with joins (lookups)
 * - Flexible filtering with user input parameters
 * - Grouping and aggregations
 * - Multiple report types: table, chart, pivot, funnel
 * - Export to PDF, Excel, CSV
 * - Report scheduling
 * - Report sharing and permissions
 *
 * @module services/reportBuilder.service
 */

const mongoose = require('mongoose');
const logger = require('../utils/logger');
const ReportDefinition = require('../models/reportDefinition.model');

/**
 * Escape special regex characters to prevent regex injection
 */
const escapeRegex = (str) => {
  if (typeof str !== 'string') return str;
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Helper to normalize tenant filter
 * Accepts either:
 * - Object with firmId or lawyerId (new pattern)
 * - String/ObjectId firmId (legacy pattern)
 * @param {Object|String|ObjectId} tenantFilterOrFirmId - Tenant filter or firm ID
 * @returns {Object} Normalized tenant filter with ObjectIds
 */
const normalizeTenantFilter = (tenantFilterOrFirmId) => {
  // If it's already an object with firmId or lawyerId, use it
  if (tenantFilterOrFirmId && typeof tenantFilterOrFirmId === 'object') {
    if (tenantFilterOrFirmId.firmId) {
      return { firmId: new mongoose.Types.ObjectId(tenantFilterOrFirmId.firmId) };
    }
    if (tenantFilterOrFirmId.lawyerId) {
      return { lawyerId: new mongoose.Types.ObjectId(tenantFilterOrFirmId.lawyerId) };
    }
  }
  // Legacy support: treat as firmId string
  if (tenantFilterOrFirmId) {
    return { firmId: new mongoose.Types.ObjectId(tenantFilterOrFirmId) };
  }
  return {};
};

/**
 * Report Builder Service Class
 */
class ReportBuilderService {
  // ═══════════════════════════════════════════════════════════════
  // CORE EXECUTION METHODS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Execute report and get data
   * @param {String|ObjectId} reportId - Report definition ID
   * @param {Object} params - User input parameters for filters
   * @param {String|ObjectId} userId - User ID executing the report
   * @param {Object|String|ObjectId} tenantFilterOrFirmId - Tenant filter object or firm ID for multi-tenancy
   * @returns {Promise<Object>} Report execution result with data
   */
  async executeReport(reportId, params = {}, userId, tenantFilterOrFirmId) {
    try {
      const tenantFilter = normalizeTenantFilter(tenantFilterOrFirmId);
      logger.info('Executing report', { reportId, userId, tenantFilter, paramsCount: Object.keys(params).length });

      // Get report definition with tenant isolation
      const report = await ReportDefinition.findOne({
        _id: reportId,
        ...tenantFilter
      });

      if (!report) {
        throw new Error('Report not found or access denied');
      }

      // Verify user has access to this report
      const hasAccess = await this._verifyReportAccess(report, userId, tenantFilter);
      if (!hasAccess) {
        throw new Error('Access denied to this report');
      }

      // Build aggregation pipeline
      const pipeline = this.buildPipeline(report, params, tenantFilter);

      // Execute query on the data source
      const dataSourceModel = report.dataSources[0]?.model;
      if (!dataSourceModel) {
        throw new Error('No data source configured for this report');
      }

      const Model = mongoose.model(dataSourceModel);
      const rawData = await Model.aggregate(pipeline);

      logger.debug('Report query executed', {
        reportId,
        dataSourceModel,
        pipelineStages: pipeline.length,
        resultCount: rawData.length
      });

      // Transform results based on report type
      let formattedData;
      switch (report.type) {
        case 'table':
          formattedData = this.renderTableReport(rawData, report.columns);
          break;
        case 'chart':
          formattedData = this.renderChartReport(rawData, report.visualization);
          break;
        case 'pivot':
          formattedData = this.renderPivotReport(rawData, {
            groupBy: report.groupBy,
            columns: report.columns
          });
          break;
        case 'funnel':
          formattedData = this.renderFunnelReport(rawData, {
            groupBy: report.groupBy,
            columns: report.columns
          });
          break;
        default:
          formattedData = { rows: rawData };
      }

      logger.info('Report executed successfully', {
        reportId,
        type: report.type,
        rowCount: formattedData.rows?.length || rawData.length
      });

      return {
        reportId,
        reportName: report.name,
        type: report.type,
        executedAt: new Date(),
        executedBy: userId,
        data: formattedData,
        metadata: {
          totalRows: rawData.length,
          columns: report.columns,
          filters: report.filters.filter(f => f.userInput).map(f => ({
            field: f.field,
            operator: f.operator,
            value: params[f.field]
          }))
        }
      };
    } catch (error) {
      logger.error('Report execution failed', {
        error: error.message,
        reportId,
        userId,
        firmId
      });
      throw error;
    }
  }

  /**
   * Build MongoDB aggregation pipeline from report definition
   * @param {Object} report - Report definition document
   * @param {Object} params - User input parameters
   * @param {Object|String|ObjectId} tenantFilterOrFirmId - Tenant filter or firm ID for multi-tenancy
   * @returns {Array} MongoDB aggregation pipeline
   */
  buildPipeline(report, params, tenantFilterOrFirmId) {
    const pipeline = [];

    // Normalize tenant filter and add as first match stage (ALWAYS FIRST for security)
    const tenantFilter = normalizeTenantFilter(tenantFilterOrFirmId);
    pipeline.push({
      $match: tenantFilter
    });

    // Apply static and dynamic filters
    const filterStage = this._buildFilterStage(report.filters, params);
    if (filterStage && Object.keys(filterStage.$match).length > 0) {
      // Merge with tenant filter if no other filters, otherwise add new stage
      if (pipeline[0].$match) {
        pipeline[0].$match = { ...pipeline[0].$match, ...filterStage.$match };
      } else {
        pipeline.push(filterStage);
      }
    }

    // Apply joins (lookups)
    const joins = report.dataSources[0]?.joins || [];
    for (const join of joins) {
      pipeline.push({
        $lookup: {
          from: this._getCollectionName(join.targetModel),
          localField: join.sourceField,
          foreignField: join.targetField,
          as: join.alias || join.targetModel.toLowerCase()
        }
      });

      // For inner joins, filter out documents without matches
      if (join.type === 'inner') {
        pipeline.push({
          $match: {
            [`${join.alias || join.targetModel.toLowerCase()}.0`]: { $exists: true }
          }
        });
      }

      // Unwind for single document joins (optional based on join configuration)
      if (join.type === 'inner' || join.type === 'left') {
        pipeline.push({
          $unwind: {
            path: `$${join.alias || join.targetModel.toLowerCase()}`,
            preserveNullAndEmptyArrays: join.type === 'left'
          }
        });
      }
    }

    // Apply grouping and aggregations
    if (report.groupBy && report.groupBy.length > 0) {
      const groupStage = this._buildGroupStage(report.groupBy, report.columns);
      if (groupStage) {
        pipeline.push(groupStage);
      }
    }

    // Apply column projections (if no grouping)
    if (!report.groupBy || report.groupBy.length === 0) {
      const projectStage = this._buildProjectStage(report.columns);
      if (projectStage) {
        pipeline.push(projectStage);
      }
    }

    // Apply sorting
    const sortStage = this._buildSortStage(report.columns);
    if (sortStage) {
      pipeline.push(sortStage);
    }

    // Add limit if specified (for performance)
    const limit = params._limit || 10000; // Default max 10k rows
    if (limit) {
      pipeline.push({ $limit: parseInt(limit) });
    }

    logger.debug('Built aggregation pipeline', {
      stages: pipeline.length,
      hasGrouping: report.groupBy?.length > 0,
      hasJoins: joins.length > 0,
      filterCount: report.filters.length
    });

    return pipeline;
  }

  // ═══════════════════════════════════════════════════════════════
  // PIPELINE BUILDING HELPERS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Build $match stage for filters
   * @private
   */
  _buildFilterStage(filters, params) {
    const matchConditions = {};

    for (const filter of filters) {
      const value = filter.userInput ? params[filter.field] : filter.value;

      // Skip if user input required but not provided
      if (filter.userInput && (value === undefined || value === null || value === '')) {
        continue;
      }

      // Convert filter to MongoDB query condition
      const condition = this._convertFilterToCondition(filter.field, filter.operator, value);
      if (condition) {
        // Merge conditions
        Object.assign(matchConditions, condition);
      }
    }

    return Object.keys(matchConditions).length > 0 ? { $match: matchConditions } : null;
  }

  /**
   * Convert filter operator to MongoDB condition
   * @private
   */
  _convertFilterToCondition(field, operator, value) {
    switch (operator) {
      case 'equals':
      case 'eq':
        return { [field]: value };

      case 'not_equals':
      case 'ne':
        return { [field]: { $ne: value } };

      case 'greater_than':
      case 'gt':
        return { [field]: { $gt: this._convertValue(value) } };

      case 'greater_than_equals':
      case 'gte':
        return { [field]: { $gte: this._convertValue(value) } };

      case 'less_than':
      case 'lt':
        return { [field]: { $lt: this._convertValue(value) } };

      case 'less_than_equals':
      case 'lte':
        return { [field]: { $lte: this._convertValue(value) } };

      case 'in':
        return { [field]: { $in: Array.isArray(value) ? value : [value] } };

      case 'not_in':
        return { [field]: { $nin: Array.isArray(value) ? value : [value] } };

      case 'contains':
      case 'like':
        return { [field]: { $regex: escapeRegex(value), $options: 'i' } };

      case 'not_contains':
        return { [field]: { $not: { $regex: escapeRegex(value), $options: 'i' } } };

      case 'starts_with':
        return { [field]: { $regex: `^${escapeRegex(value)}`, $options: 'i' } };

      case 'ends_with':
        return { [field]: { $regex: `${escapeRegex(value)}$`, $options: 'i' } };

      case 'is_null':
        return { [field]: null };

      case 'is_not_null':
        return { [field]: { $ne: null, $exists: true } };

      case 'between':
        if (Array.isArray(value) && value.length === 2) {
          return { [field]: { $gte: this._convertValue(value[0]), $lte: this._convertValue(value[1]) } };
        }
        return null;

      default:
        logger.warn('Unknown filter operator', { operator, field });
        return null;
    }
  }

  /**
   * Convert value to appropriate type
   * @private
   */
  _convertValue(value) {
    // Try to parse as number
    if (typeof value === 'string' && !isNaN(value) && value.trim() !== '') {
      return parseFloat(value);
    }

    // Try to parse as date
    if (typeof value === 'string' && !isNaN(Date.parse(value))) {
      return new Date(value);
    }

    return value;
  }

  /**
   * Build $group stage for aggregations
   * @private
   */
  _buildGroupStage(groupBy, columns) {
    const groupStage = {
      $group: {
        _id: {}
      }
    };

    // Build _id from groupBy fields
    for (const field of groupBy) {
      groupStage.$group._id[field] = `$${field}`;
    }

    // Add aggregations from columns
    for (const column of columns) {
      if (column.aggregate && column.aggregate !== 'none') {
        const aggField = column.field;
        const aggOp = column.aggregate;

        switch (aggOp) {
          case 'sum':
            groupStage.$group[column.label || aggField] = { $sum: `$${aggField}` };
            break;
          case 'avg':
            groupStage.$group[column.label || aggField] = { $avg: `$${aggField}` };
            break;
          case 'count':
            groupStage.$group[column.label || aggField] = { $sum: 1 };
            break;
          case 'min':
            groupStage.$group[column.label || aggField] = { $min: `$${aggField}` };
            break;
          case 'max':
            groupStage.$group[column.label || aggField] = { $max: `$${aggField}` };
            break;
          default:
            // For non-aggregated fields in group by, use $first
            if (!groupBy.includes(column.field)) {
              groupStage.$group[column.label || aggField] = { $first: `$${aggField}` };
            }
        }
      }
    }

    return groupStage;
  }

  /**
   * Build $project stage for column selection
   * @private
   */
  _buildProjectStage(columns) {
    if (!columns || columns.length === 0) {
      return null;
    }

    const projectStage = { $project: {} };

    for (const column of columns) {
      projectStage.$project[column.label || column.field] = `$${column.field}`;
    }

    return projectStage;
  }

  /**
   * Build $sort stage
   * @private
   */
  _buildSortStage(columns) {
    const sortFields = columns.filter(c => c.sort);

    if (sortFields.length === 0) {
      return null;
    }

    const sortStage = { $sort: {} };

    for (const column of sortFields) {
      sortStage.$sort[column.field] = column.sort === 'asc' ? 1 : -1;
    }

    return sortStage;
  }

  /**
   * Get MongoDB collection name from model name
   * @private
   */
  _getCollectionName(modelName) {
    // MongoDB automatically pluralizes and lowercases model names
    // e.g., 'Case' -> 'cases', 'Client' -> 'clients'
    // Handle special cases
    const specialCases = {
      'CrmActivity': 'crmactivities',
      'ReportDefinition': 'reportdefinitions',
      'PayrollRun': 'payrollruns'
    };

    if (specialCases[modelName]) {
      return specialCases[modelName];
    }

    // Default: lowercase and add 's'
    return modelName.toLowerCase() + 's';
  }

  // ═══════════════════════════════════════════════════════════════
  // REPORT RENDERING METHODS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Render table report
   * @param {Array} data - Raw query results
   * @param {Array} columns - Column definitions
   * @returns {Object} Formatted table data
   */
  renderTableReport(data, columns) {
    const rows = data.map(row => {
      const formattedRow = {};

      for (const column of columns) {
        const fieldName = column.label || column.field;
        const value = this._getNestedValue(row, column.field);

        // Apply formatting
        formattedRow[fieldName] = this._formatValue(value, column.format);
      }

      return formattedRow;
    });

    return {
      columns: columns.map(c => ({
        field: c.field,
        label: c.label || c.field,
        aggregate: c.aggregate || 'none'
      })),
      rows,
      totalRows: rows.length
    };
  }

  /**
   * Render chart report
   * @param {Array} data - Raw query results
   * @param {Object} visualization - Visualization config
   * @returns {Object} Chart data
   */
  renderChartReport(data, visualization) {
    if (!visualization) {
      return { rows: data, error: 'No visualization configuration' };
    }

    const { chartType, xAxis, yAxis, colors } = visualization;

    // Extract labels (x-axis) and values (y-axis)
    const labels = data.map(row => this._getNestedValue(row, xAxis));
    const values = data.map(row => this._getNestedValue(row, yAxis));

    const chartData = {
      chartType: chartType || 'bar',
      labels,
      datasets: [{
        label: yAxis,
        data: values,
        backgroundColor: colors && colors.length > 0 ? colors : this._generateColors(data.length)
      }]
    };

    return {
      chartData,
      rows: data,
      totalRows: data.length
    };
  }

  /**
   * Render pivot report
   * @param {Array} data - Raw query results
   * @param {Object} settings - Pivot settings
   * @returns {Object} Pivot table data
   */
  renderPivotReport(data, settings) {
    const { groupBy, columns } = settings;

    if (!groupBy || groupBy.length === 0) {
      return { rows: data, error: 'No groupBy fields specified for pivot' };
    }

    // Build pivot structure
    const pivot = {};
    const totals = {};

    for (const row of data) {
      // Build key from groupBy fields
      const key = groupBy.map(field => this._getNestedValue(row, field)).join('|');

      if (!pivot[key]) {
        pivot[key] = {
          dimensions: {},
          measures: {}
        };

        // Store dimension values
        for (const field of groupBy) {
          pivot[key].dimensions[field] = this._getNestedValue(row, field);
        }
      }

      // Aggregate measures
      for (const column of columns) {
        if (column.aggregate && column.aggregate !== 'none') {
          const value = this._getNestedValue(row, column.field);
          const measureName = column.label || column.field;

          if (!pivot[key].measures[measureName]) {
            pivot[key].measures[measureName] = 0;
          }

          switch (column.aggregate) {
            case 'sum':
            case 'count':
              pivot[key].measures[measureName] += (value || 1);
              break;
            case 'avg':
              // For average, we'll need to track sum and count
              if (!pivot[key]._counts) pivot[key]._counts = {};
              if (!pivot[key]._counts[measureName]) pivot[key]._counts[measureName] = 0;
              pivot[key].measures[measureName] += (value || 0);
              pivot[key]._counts[measureName] += 1;
              break;
            case 'min':
              pivot[key].measures[measureName] = Math.min(
                pivot[key].measures[measureName] || Infinity,
                value || 0
              );
              break;
            case 'max':
              pivot[key].measures[measureName] = Math.max(
                pivot[key].measures[measureName] || -Infinity,
                value || 0
              );
              break;
          }

          // Track grand totals
          if (!totals[measureName]) totals[measureName] = 0;
          totals[measureName] += (value || 1);
        }
      }
    }

    // Calculate averages
    for (const key in pivot) {
      if (pivot[key]._counts) {
        for (const measure in pivot[key]._counts) {
          pivot[key].measures[measure] /= pivot[key]._counts[measure];
        }
        delete pivot[key]._counts;
      }
    }

    // Convert to array
    const rows = Object.values(pivot).map(p => ({
      ...p.dimensions,
      ...p.measures
    }));

    return {
      rows,
      totals,
      totalRows: rows.length,
      dimensions: groupBy
    };
  }

  /**
   * Render funnel report
   * @param {Array} data - Raw query results
   * @param {Object} settings - Funnel settings
   * @returns {Object} Funnel data with conversion rates
   */
  renderFunnelReport(data, settings) {
    const { groupBy, columns } = settings;

    if (!groupBy || groupBy.length === 0) {
      return { rows: data, error: 'No groupBy field specified for funnel' };
    }

    // Group by stage (first groupBy field)
    const stageField = groupBy[0];
    const stages = {};
    let totalStart = 0;

    // Calculate stage counts
    for (const row of data) {
      const stage = this._getNestedValue(row, stageField);
      if (!stages[stage]) {
        stages[stage] = { count: 0, stage };
      }

      // Get count from aggregated data or count as 1
      const countColumn = columns.find(c => c.aggregate === 'count');
      const count = countColumn ? this._getNestedValue(row, countColumn.label || countColumn.field) : 1;

      stages[stage].count += count;
    }

    // Convert to ordered array and calculate conversion rates
    const stageArray = Object.values(stages);

    // Sort by count descending (funnel top to bottom)
    stageArray.sort((a, b) => b.count - a.count);

    // Calculate conversion rates
    totalStart = stageArray[0]?.count || 0;
    let previousCount = totalStart;

    const funnelData = stageArray.map((stage, index) => {
      const conversionFromPrevious = index === 0 ? 100 : (stage.count / previousCount) * 100;
      const conversionFromStart = totalStart > 0 ? (stage.count / totalStart) * 100 : 0;
      const dropoffFromPrevious = 100 - conversionFromPrevious;
      const dropoffCount = index === 0 ? 0 : previousCount - stage.count;

      const result = {
        stage: stage.stage,
        count: stage.count,
        percentage: conversionFromStart.toFixed(2),
        conversionFromPrevious: conversionFromPrevious.toFixed(2),
        dropoffFromPrevious: dropoffFromPrevious.toFixed(2),
        dropoffCount
      };

      previousCount = stage.count;
      return result;
    });

    return {
      stages: funnelData,
      totalStart,
      totalEnd: stageArray[stageArray.length - 1]?.count || 0,
      overallConversion: totalStart > 0
        ? ((stageArray[stageArray.length - 1]?.count || 0) / totalStart * 100).toFixed(2)
        : 0,
      rows: funnelData,
      totalRows: funnelData.length
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // REPORT MANAGEMENT METHODS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get reports for user
   * @param {Object|String|ObjectId} tenantFilterOrFirmId - Tenant filter object or firm ID
   * @param {String|ObjectId} userId - User ID
   * @param {Object} options - Query options (type, scope, search, pagination)
   * @returns {Promise<Object>} Reports and pagination info
   */
  async getReportsForUser(tenantFilterOrFirmId, userId, options = {}) {
    try {
      const {
        type,
        scope,
        search,
        page = 1,
        limit = 50,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = options;

      // Normalize tenant filter for query
      const tenantFilter = normalizeTenantFilter(tenantFilterOrFirmId);
      const query = { ...tenantFilter };

      // Filter by type
      if (type) {
        query.type = type;
      }

      // Filter by scope and ownership
      if (scope) {
        query.scope = scope;
      } else {
        // Show personal reports (owned by user), team reports, and global reports
        query.$or = [
          { scope: 'personal', ownerId: userId },
          { scope: 'team' },
          { scope: 'global', isPublic: true }
        ];
      }

      // Search by name or description
      if (search) {
        query.$text = { $search: search };
      }

      // Build sort
      const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

      // Execute query with pagination
      const skip = (page - 1) * limit;
      const [reports, total] = await Promise.all([
        ReportDefinition.find(query)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .populate('ownerId', 'name email')
          .populate('createdBy', 'name email')
          .lean(),
        ReportDefinition.countDocuments(query)
      ]);

      logger.info('Retrieved reports for user', {
        tenantFilter,
        userId,
        count: reports.length,
        total,
        filters: { type, scope, search }
      });

      return {
        reports,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
          hasMore: skip + reports.length < total
        }
      };
    } catch (error) {
      logger.error('Get reports for user failed', {
        error: error.message,
        firmId,
        userId
      });
      throw error;
    }
  }

  /**
   * Clone report
   * @param {String|ObjectId} reportId - Report ID to clone
   * @param {String|ObjectId} userId - User ID (new owner)
   * @param {String} newName - Name for cloned report
   * @param {Object|String|ObjectId} tenantFilterOrFirmId - Tenant filter or firm ID
   * @returns {Promise<Object>} New report document
   */
  async cloneReport(reportId, userId, newName, tenantFilterOrFirmId) {
    try {
      const tenantFilter = normalizeTenantFilter(tenantFilterOrFirmId);
      logger.info('Cloning report', { reportId, userId, newName, tenantFilter });

      // Get original report with tenant isolation
      const original = await ReportDefinition.findOne({
        _id: reportId,
        ...tenantFilter
      });

      if (!original) {
        throw new Error('Report not found or access denied');
      }

      // Create clone with same tenant context
      const clone = new ReportDefinition({
        ...original.toObject(),
        _id: undefined,
        name: newName || `${original.name} (Copy)`,
        ownerId: userId,
        createdBy: userId,
        scope: 'personal', // Always personal for clones
        isPublic: false,
        createdAt: undefined,
        updatedAt: undefined
      });

      await clone.save();

      logger.info('Report cloned successfully', {
        originalId: reportId,
        cloneId: clone._id,
        userId
      });

      return clone;
    } catch (error) {
      logger.error('Clone report failed', {
        error: error.message,
        reportId,
        userId
      });
      throw error;
    }
  }

  /**
   * Schedule report
   * @param {String|ObjectId} reportId - Report ID
   * @param {Object} schedule - Schedule configuration
   * @param {String|ObjectId} userId - User ID
   * @returns {Promise<Object>} Updated report
   */
  async scheduleReport(reportId, schedule, userId) {
    try {
      logger.info('Scheduling report', { reportId, userId, schedule });

      const report = await ReportDefinition.findOneAndUpdate(
        {
          _id: reportId,
          $or: [
            { ownerId: userId },
            { scope: { $in: ['team', 'global'] } }
          ]
        },
        {
          $set: {
            schedule: {
              enabled: schedule.enabled !== false,
              frequency: schedule.frequency,
              recipients: schedule.recipients || [],
              format: schedule.format || 'pdf'
            }
          }
        },
        { new: true }
      );

      if (!report) {
        throw new Error('Report not found or access denied');
      }

      // TODO: Create/update job in queue service for automated execution
      // await queueService.scheduleReportJob(report._id, schedule);

      logger.info('Report scheduled successfully', {
        reportId,
        frequency: schedule.frequency,
        enabled: schedule.enabled
      });

      return report;
    } catch (error) {
      logger.error('Schedule report failed', {
        error: error.message,
        reportId,
        userId
      });
      throw error;
    }
  }

  /**
   * Export report to format
   * @param {String|ObjectId} reportId - Report ID
   * @param {String} format - Export format (pdf, excel, csv)
   * @param {Object} params - Report parameters
   * @param {String|ObjectId} userId - User ID
   * @param {Object|String|ObjectId} tenantFilterOrFirmId - Tenant filter or firm ID
   * @returns {Promise<Buffer|String>} File buffer or download URL
   */
  async exportReport(reportId, format, params, userId, tenantFilterOrFirmId) {
    try {
      const tenantFilter = normalizeTenantFilter(tenantFilterOrFirmId);
      logger.info('Exporting report', { reportId, format, userId, tenantFilter });

      // Execute report to get data (already supports tenant filter)
      const result = await this.executeReport(reportId, params, userId, tenantFilterOrFirmId);

      let exportedData;

      switch (format.toLowerCase()) {
        case 'csv':
          exportedData = await this._exportToCSV(result);
          break;

        case 'excel':
        case 'xlsx':
          exportedData = await this._exportToExcel(result);
          break;

        case 'pdf':
          exportedData = await this._exportToPDF(result);
          break;

        default:
          throw new Error(`Unsupported export format: ${format}`);
      }

      logger.info('Report exported successfully', {
        reportId,
        format,
        size: exportedData.length
      });

      return exportedData;
    } catch (error) {
      logger.error('Export report failed', {
        error: error.message,
        reportId,
        format,
        userId
      });
      throw error;
    }
  }

  /**
   * Validate report definition
   * @param {Object} definition - Report definition to validate
   * @returns {Object} Validation result { valid: boolean, errors: Array }
   */
  validateReportDefinition(definition) {
    const errors = [];

    // Check required fields
    if (!definition.name || definition.name.trim() === '') {
      errors.push('Report name is required');
    }

    if (!definition.type) {
      errors.push('Report type is required');
    }

    if (!definition.dataSources || definition.dataSources.length === 0) {
      errors.push('At least one data source is required');
    }

    // Validate data sources
    if (definition.dataSources && definition.dataSources.length > 0) {
      const dataSource = definition.dataSources[0];

      if (!dataSource.model) {
        errors.push('Data source model is required');
      } else {
        // Check if model exists
        try {
          mongoose.model(dataSource.model);
        } catch (err) {
          errors.push(`Invalid data source model: ${dataSource.model}`);
        }
      }

      // Validate joins
      if (dataSource.joins) {
        for (const join of dataSource.joins) {
          if (!join.targetModel || !join.sourceField || !join.targetField) {
            errors.push('Join configuration incomplete: targetModel, sourceField, and targetField are required');
          }

          // Check if target model exists
          try {
            mongoose.model(join.targetModel);
          } catch (err) {
            errors.push(`Invalid join target model: ${join.targetModel}`);
          }
        }
      }
    }

    // Validate columns
    if (!definition.columns || definition.columns.length === 0) {
      errors.push('At least one column is required');
    } else {
      for (const column of definition.columns) {
        if (!column.field) {
          errors.push('Column field is required');
        }

        if (column.aggregate && !['sum', 'avg', 'count', 'min', 'max', 'none'].includes(column.aggregate)) {
          errors.push(`Invalid aggregate function: ${column.aggregate}`);
        }
      }
    }

    // Validate filters
    if (definition.filters) {
      for (const filter of definition.filters) {
        if (!filter.field) {
          errors.push('Filter field is required');
        }

        if (!filter.operator) {
          errors.push('Filter operator is required');
        }

        const validOperators = [
          'equals', 'not_equals', 'greater_than', 'less_than',
          'greater_than_equals', 'less_than_equals', 'in', 'not_in',
          'contains', 'not_contains', 'starts_with', 'ends_with',
          'is_null', 'is_not_null', 'between',
          'eq', 'ne', 'gt', 'lt', 'gte', 'lte', 'like'
        ];

        if (!validOperators.includes(filter.operator)) {
          errors.push(`Invalid filter operator: ${filter.operator}`);
        }

        // Check value for non-null operators
        if (!filter.userInput &&
            !['is_null', 'is_not_null'].includes(filter.operator) &&
            (filter.value === undefined || filter.value === null)) {
          errors.push(`Filter value is required for operator: ${filter.operator}`);
        }
      }
    }

    // Validate visualization for chart reports
    if (definition.type === 'chart') {
      if (!definition.visualization) {
        errors.push('Visualization configuration is required for chart reports');
      } else {
        if (!definition.visualization.chartType) {
          errors.push('Chart type is required');
        }
        if (!definition.visualization.xAxis) {
          errors.push('X-axis field is required for charts');
        }
        if (!definition.visualization.yAxis) {
          errors.push('Y-axis field is required for charts');
        }
      }
    }

    // Validate groupBy for pivot and funnel reports
    if (['pivot', 'funnel'].includes(definition.type)) {
      if (!definition.groupBy || definition.groupBy.length === 0) {
        errors.push(`GroupBy is required for ${definition.type} reports`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // EXPORT HELPERS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Export to CSV
   * @private
   */
  async _exportToCSV(result) {
    const { data } = result;
    const rows = data.rows || [];

    if (rows.length === 0) {
      return Buffer.from('No data to export', 'utf-8');
    }

    // Get headers from first row
    const headers = Object.keys(rows[0]);

    // Build CSV
    let csv = headers.join(',') + '\n';

    for (const row of rows) {
      const values = headers.map(header => {
        const value = row[header];

        // Escape values containing commas or quotes
        if (value === null || value === undefined) {
          return '';
        }

        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }

        return stringValue;
      });

      csv += values.join(',') + '\n';
    }

    return Buffer.from(csv, 'utf-8');
  }

  /**
   * Export to Excel
   * @private
   */
  async _exportToExcel(result) {
    // This would require the 'exceljs' library
    // For now, return CSV as fallback
    logger.warn('Excel export not implemented, falling back to CSV');
    return this._exportToCSV(result);

    // TODO: Implement with exceljs
    // const ExcelJS = require('exceljs');
    // const workbook = new ExcelJS.Workbook();
    // const worksheet = workbook.addWorksheet('Report');
    // ... add data and formatting
    // return workbook.xlsx.writeBuffer();
  }

  /**
   * Export to PDF
   * @private
   */
  async _exportToPDF(result) {
    // This would use the pdfExporter.service.js or puppeteer
    // For now, return a simple HTML representation
    const { reportName, data } = result;
    const rows = data.rows || [];

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${reportName}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #333; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; font-weight: bold; }
          tr:nth-child(even) { background-color: #f9f9f9; }
        </style>
      </head>
      <body>
        <h1>${reportName}</h1>
        <p>Generated: ${new Date().toLocaleString()}</p>
        <table>
          <thead>
            <tr>
              ${rows.length > 0 ? Object.keys(rows[0]).map(key => `<th>${key}</th>`).join('') : ''}
            </tr>
          </thead>
          <tbody>
            ${rows.map(row => `
              <tr>
                ${Object.values(row).map(val => `<td>${val !== null && val !== undefined ? val : ''}</td>`).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;

    // Try to use puppeteer if available (like pdfExporter.service.js)
    try {
      const puppeteer = require('puppeteer');
      const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '1cm', right: '1cm', bottom: '1cm', left: '1cm' }
      });

      await browser.close();
      return pdfBuffer;
    } catch (error) {
      logger.warn('Puppeteer not available for PDF export, returning HTML', { error: error.message });
      return Buffer.from(html, 'utf-8');
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // UTILITY METHODS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Verify user has access to report
   * @private
   * @param {Object} report - Report document
   * @param {String|ObjectId} userId - User ID
   * @param {Object} tenantFilter - Tenant filter object with firmId or lawyerId
   */
  async _verifyReportAccess(report, userId, tenantFilter) {
    // Check tenant isolation - report must belong to same tenant
    if (tenantFilter.firmId) {
      // Firm member: report must have same firmId
      if (!report.firmId || report.firmId.toString() !== tenantFilter.firmId.toString()) {
        return false;
      }
    } else if (tenantFilter.lawyerId) {
      // Solo lawyer: report must have same lawyerId
      if (!report.lawyerId || report.lawyerId.toString() !== tenantFilter.lawyerId.toString()) {
        return false;
      }
    } else {
      // No tenant context - deny access
      return false;
    }

    // Personal reports: only owner can access
    if (report.scope === 'personal' && report.ownerId.toString() !== userId.toString()) {
      return false;
    }

    // Team reports: any user in the firm/context can access
    if (report.scope === 'team') {
      return true;
    }

    // Global reports: check if public
    if (report.scope === 'global') {
      return report.isPublic;
    }

    return true;
  }

  /**
   * Format value according to format specification
   * @private
   */
  _formatValue(value, format) {
    if (value === null || value === undefined) {
      return '';
    }

    if (!format) {
      return value;
    }

    // Handle different format types
    if (format.type === 'currency') {
      const num = parseFloat(value);
      if (isNaN(num)) return value;

      const decimals = format.decimals !== undefined ? format.decimals : 2;
      const prefix = format.prefix || '';
      const suffix = format.suffix || '';

      return prefix + num.toFixed(decimals) + suffix;
    }

    if (format.type === 'date') {
      const date = new Date(value);
      if (isNaN(date.getTime())) return value;

      const formatStr = format.format || 'YYYY-MM-DD';
      // Basic date formatting
      return date.toISOString().split('T')[0];
    }

    if (format.type === 'percentage') {
      const num = parseFloat(value);
      if (isNaN(num)) return value;

      const decimals = format.decimals !== undefined ? format.decimals : 2;
      return (num * 100).toFixed(decimals) + '%';
    }

    return value;
  }

  /**
   * Get nested value from object using dot notation
   * @private
   */
  _getNestedValue(obj, path) {
    if (!obj || !path) return undefined;

    // Handle _id group fields
    if (path.startsWith('_id.')) {
      const innerPath = path.substring(4);
      return this._getNestedValue(obj._id, innerPath);
    }

    const parts = path.split('.');
    let current = obj;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = current[part];
    }

    return current;
  }

  /**
   * Generate color palette for charts
   * @private
   */
  _generateColors(count) {
    const baseColors = [
      '#3b82f6', // blue
      '#10b981', // green
      '#f59e0b', // amber
      '#ef4444', // red
      '#8b5cf6', // purple
      '#ec4899', // pink
      '#06b6d4', // cyan
      '#f97316', // orange
      '#84cc16', // lime
      '#6366f1'  // indigo
    ];

    const colors = [];
    for (let i = 0; i < count; i++) {
      colors.push(baseColors[i % baseColors.length]);
    }

    return colors;
  }
}

// Export as singleton
module.exports = new ReportBuilderService();
