/**
 * Manufacturing Module Routes
 *
 * Comprehensive manufacturing management API routes including:
 * - Bill of Materials (BOM) management
 * - Workstation management
 * - Work Order lifecycle and operations
 * - Job Card tracking
 * - Manufacturing statistics and settings
 *
 * Base route: /api/manufacturing
 */

const express = require('express');
const router = express.Router();
const { userMiddleware, firmFilter } = require('../middlewares');
const {
    validateCreateBOM,
    validateUpdateBOM,
    validateCreateWorkstation,
    validateUpdateWorkstation,
    validateCreateWorkOrder,
    validateUpdateWorkOrder,
    validateCreateJobCard,
    validateUpdateJobCard,
    validateUpdateSettings
} = require('../validators/manufacturing.validator');
const {
    // BOM Controllers
    getBOMs,
    getBOMById,
    createBOM,
    updateBOM,
    deleteBOM,

    // Workstation Controllers
    getWorkstations,
    getWorkstationById,
    createWorkstation,
    updateWorkstation,
    deleteWorkstation,

    // Work Order Controllers
    getWorkOrders,
    getWorkOrderById,
    createWorkOrder,
    updateWorkOrder,
    submitWorkOrder,
    startWorkOrder,
    completeWorkOrder,
    cancelWorkOrder,
    deleteWorkOrder,

    // Job Card Controllers
    getJobCards,
    getJobCardById,
    createJobCard,
    updateJobCard,
    startJobCard,
    completeJobCard,

    // Stats & Settings Controllers
    getStats,
    getSettings,
    updateSettings
} = require('../controllers/manufacturing.controller');

// Apply authentication and firm filter to all routes
router.use(userMiddleware, firmFilter);

// ============================================
// STATISTICS & SETTINGS (before parameterized routes)
// ============================================

// Get manufacturing statistics
router.get('/stats', getStats);

// Get manufacturing settings
router.get('/settings', getSettings);

// Update manufacturing settings
router.put('/settings', validateUpdateSettings, updateSettings);

// ============================================
// BILL OF MATERIALS (BOM) ROUTES
// ============================================

// Get all BOMs
router.get('/boms', getBOMs);

// Get single BOM
router.get('/boms/:id', getBOMById);

// Create BOM
router.post('/boms', validateCreateBOM, createBOM);

// Update BOM
router.put('/boms/:id', validateUpdateBOM, updateBOM);

// Delete BOM
router.delete('/boms/:id', deleteBOM);

// ============================================
// WORKSTATION ROUTES
// ============================================

// Get all workstations
router.get('/workstations', getWorkstations);

// Get single workstation
router.get('/workstations/:id', getWorkstationById);

// Create workstation
router.post('/workstations', validateCreateWorkstation, createWorkstation);

// Update workstation
router.put('/workstations/:id', validateUpdateWorkstation, updateWorkstation);

// Delete workstation
router.delete('/workstations/:id', deleteWorkstation);

// ============================================
// WORK ORDER ROUTES
// ============================================

// Get all work orders (with filters: status, itemId, bomId, dateFrom, dateTo)
router.get('/work-orders', getWorkOrders);

// Get single work order
router.get('/work-orders/:id', getWorkOrderById);

// Create work order
router.post('/work-orders', validateCreateWorkOrder, createWorkOrder);

// Update work order
router.put('/work-orders/:id', validateUpdateWorkOrder, updateWorkOrder);

// Delete work order
router.delete('/work-orders/:id', deleteWorkOrder);

// ============================================
// WORK ORDER LIFECYCLE ACTIONS
// ============================================

// Submit work order (draft -> submitted)
router.post('/work-orders/:id/submit', submitWorkOrder);

// Start work order (submitted -> in_progress)
router.post('/work-orders/:id/start', startWorkOrder);

// Complete work order (in_progress -> completed)
router.post('/work-orders/:id/complete', completeWorkOrder);

// Cancel work order (any status -> cancelled)
router.post('/work-orders/:id/cancel', cancelWorkOrder);

// ============================================
// JOB CARD ROUTES
// ============================================

// Get all job cards
router.get('/job-cards', getJobCards);

// Get single job card
router.get('/job-cards/:id', getJobCardById);

// Create job card
router.post('/job-cards', validateCreateJobCard, createJobCard);

// Update job card
router.put('/job-cards/:id', validateUpdateJobCard, updateJobCard);

// ============================================
// JOB CARD LIFECYCLE ACTIONS
// ============================================

// Start job card (pending -> in_progress)
router.post('/job-cards/:id/start', startJobCard);

// Complete job card (in_progress -> completed)
router.post('/job-cards/:id/complete', completeJobCard);

module.exports = router;
