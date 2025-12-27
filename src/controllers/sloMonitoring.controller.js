/**
 * SLO Monitoring Controller
 *
 * API endpoints for SLO (Service Level Objectives) management and monitoring
 */

const SLO = require('../models/slo.model');
const SLOMonitoringService = require('../services/sloMonitoring.service');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');

// ═══════════════════════════════════════════════════════════════
// SLO CRUD OPERATIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Create new SLO
 * POST /api/slo-monitoring
 */
const createSLO = asyncHandler(async (req, res) => {
  const { firmId } = req;

  // Add firmId to the SLO data
  const sloData = {
    ...req.body,
    firmId: req.body.firmId || firmId,
  };

  // Validate required fields
  if (!sloData.name || !sloData.category || !sloData.target) {
    throw CustomException('الاسم والفئة والهدف مطلوبة', 400);
  }

  const slo = await SLOMonitoringService.createSLO(sloData);

  res.status(201).json({
    success: true,
    message: 'تم إنشاء SLO بنجاح',
    data: slo,
  });
});

/**
 * Get all SLOs for a firm
 * GET /api/slo-monitoring
 */
const listSLOs = asyncHandler(async (req, res) => {
  const { firmId } = req;
  const { category, isActive } = req.query;

  const query = {};

  // Filter by firm (include system-wide SLOs)
  if (firmId) {
    query.$or = [
      { firmId },
      { firmId: null },
    ];
  } else {
    query.firmId = null;
  }

  // Filter by category if provided
  if (category) {
    query.category = category;
  }

  // Filter by active status if provided
  if (isActive !== undefined) {
    query.isActive = isActive === 'true';
  }

  const slos = await SLO.find(query).sort({ category: 1, name: 1 });

  res.json({
    success: true,
    data: slos,
  });
});

/**
 * Get single SLO by ID
 * GET /api/slo-monitoring/:id
 */
const getSLO = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { firmId } = req;

  const slo = await SLO.findOne({ _id: id, ...req.firmQuery });

  if (!slo) {
    throw CustomException('SLO غير موجود', 404);
  }

  res.json({
    success: true,
    data: slo,
  });
});

/**
 * Update SLO
 * PUT /api/slo-monitoring/:id
 */
const updateSLO = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const slo = await SLOMonitoringService.updateSLO(id, req.body);

  res.json({
    success: true,
    message: 'تم تحديث SLO بنجاح',
    data: slo,
  });
});

/**
 * Delete SLO
 * DELETE /api/slo-monitoring/:id
 */
const deleteSLO = asyncHandler(async (req, res) => {
  const { id } = req.params;

  await SLOMonitoringService.deleteSLO(id);

  res.json({
    success: true,
    message: 'تم حذف SLO بنجاح',
  });
});

// ═══════════════════════════════════════════════════════════════
// SLO MONITORING OPERATIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Take a measurement for an SLO
 * POST /api/slo-monitoring/:id/measure
 */
const measureSLO = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const measurement = await SLOMonitoringService.measureSLO(id);

  res.json({
    success: true,
    message: 'تم أخذ القياس بنجاح',
    data: measurement,
  });
});

/**
 * Get current status of an SLO
 * GET /api/slo-monitoring/:id/status
 */
const getSLOStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const status = await SLOMonitoringService.getSLOStatus(id);

  res.json({
    success: true,
    data: status,
  });
});

/**
 * Get SLO history
 * GET /api/slo-monitoring/:id/history
 */
const getSLOHistory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { startDate, endDate } = req.query;

  const dateRange = {};
  if (startDate) dateRange.start = new Date(startDate);
  if (endDate) dateRange.end = new Date(endDate);

  const history = await SLOMonitoringService.getSLOHistory(id, dateRange);

  res.json({
    success: true,
    data: history,
  });
});

/**
 * Get error budget for an SLO
 * GET /api/slo-monitoring/:id/error-budget
 */
const getErrorBudget = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const errorBudget = await SLOMonitoringService.getErrorBudget(id);

  res.json({
    success: true,
    data: errorBudget,
  });
});

// ═══════════════════════════════════════════════════════════════
// DASHBOARD AND REPORTING
// ═══════════════════════════════════════════════════════════════

/**
 * Get SLO dashboard
 * GET /api/slo-monitoring/dashboard
 */
const getDashboard = asyncHandler(async (req, res) => {
  const { firmId } = req;

  const dashboard = await SLOMonitoringService.getSLODashboard(firmId);

  res.json({
    success: true,
    data: dashboard,
  });
});

/**
 * Generate SLO report
 * GET /api/slo-monitoring/report
 */
const generateReport = asyncHandler(async (req, res) => {
  const { firmId } = req;
  const { period = 'daily' } = req.query;

  const report = await SLOMonitoringService.generateSLOReport(firmId, period);

  res.json({
    success: true,
    data: report,
  });
});

/**
 * Check SLO alerts
 * POST /api/slo-monitoring/check-alerts
 */
const checkAlerts = asyncHandler(async (req, res) => {
  const results = await SLOMonitoringService.checkSLOAlerts();

  res.json({
    success: true,
    message: 'تم فحص التنبيهات بنجاح',
    data: results,
  });
});

// ═══════════════════════════════════════════════════════════════
// UTILITY OPERATIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Initialize default SLOs for a firm
 * POST /api/slo-monitoring/initialize-defaults
 */
const initializeDefaults = asyncHandler(async (req, res) => {
  const { firmId } = req;

  const slos = await SLO.initializeDefaultSLOs(firmId);

  res.json({
    success: true,
    message: 'تم تهيئة SLOs الافتراضية بنجاح',
    data: slos,
  });
});

/**
 * Get SLO categories
 * GET /api/slo-monitoring/categories
 */
const getCategories = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: [
      {
        value: 'availability',
        label: 'التوافر',
        labelEn: 'Availability',
        description: 'نسبة وقت توفر النظام',
      },
      {
        value: 'latency',
        label: 'وقت الاستجابة',
        labelEn: 'Latency',
        description: 'وقت استجابة API',
      },
      {
        value: 'error_rate',
        label: 'معدل الأخطاء',
        labelEn: 'Error Rate',
        description: 'نسبة الطلبات الفاشلة',
      },
      {
        value: 'throughput',
        label: 'الإنتاجية',
        labelEn: 'Throughput',
        description: 'عدد الطلبات في الدقيقة',
      },
      {
        value: 'custom',
        label: 'مخصص',
        labelEn: 'Custom',
        description: 'مقاييس مخصصة',
      },
    ],
  });
});

/**
 * Get time window options
 * GET /api/slo-monitoring/time-windows
 */
const getTimeWindows = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: [
      { value: 'hourly', label: 'ساعي', labelEn: 'Hourly' },
      { value: 'daily', label: 'يومي', labelEn: 'Daily' },
      { value: 'weekly', label: 'أسبوعي', labelEn: 'Weekly' },
      { value: 'monthly', label: 'شهري', labelEn: 'Monthly' },
      { value: 'quarterly', label: 'ربع سنوي', labelEn: 'Quarterly' },
    ],
  });
});

/**
 * Get breached SLOs
 * GET /api/slo-monitoring/breached
 */
const getBreachedSLOs = asyncHandler(async (req, res) => {
  const { firmId } = req;

  const breachedSLOs = await SLO.getBreachedSLOs(firmId);

  res.json({
    success: true,
    data: breachedSLOs,
  });
});

/**
 * Calculate availability
 * GET /api/slo-monitoring/metrics/availability
 */
const calculateAvailability = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  const dateRange = {};
  if (startDate) dateRange.start = new Date(startDate);
  if (endDate) dateRange.end = new Date(endDate);

  const availability = await SLOMonitoringService.calculateAvailability(dateRange);

  res.json({
    success: true,
    data: availability,
  });
});

/**
 * Calculate latency percentile
 * GET /api/slo-monitoring/metrics/latency
 */
const calculateLatency = asyncHandler(async (req, res) => {
  const { startDate, endDate, percentile = 95 } = req.query;

  const dateRange = {};
  if (startDate) dateRange.start = new Date(startDate);
  if (endDate) dateRange.end = new Date(endDate);

  const latency = await SLOMonitoringService.calculateLatencyPercentile(
    dateRange,
    parseInt(percentile)
  );

  res.json({
    success: true,
    data: latency,
  });
});

module.exports = {
  // CRUD
  createSLO,
  listSLOs,
  getSLO,
  updateSLO,
  deleteSLO,

  // Monitoring
  measureSLO,
  getSLOStatus,
  getSLOHistory,
  getErrorBudget,

  // Dashboard & Reporting
  getDashboard,
  generateReport,
  checkAlerts,

  // Utilities
  initializeDefaults,
  getCategories,
  getTimeWindows,
  getBreachedSLOs,
  calculateAvailability,
  calculateLatency,
};
