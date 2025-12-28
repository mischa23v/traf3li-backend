/**
 * GOSI Plugin Routes
 *
 * Endpoints for GOSI (General Organization for Social Insurance) calculations
 */

const express = require('express');
const router = express.Router();
const gosiController = require('../controllers/gosiPlugin.controller');

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════

// Get GOSI configuration and rates
router.get('/config', gosiController.getConfig);

// Update GOSI configuration (admin only)
router.put('/config', gosiController.updateConfig);

// ═══════════════════════════════════════════════════════════════
// CALCULATIONS
// ═══════════════════════════════════════════════════════════════

// Calculate GOSI for given salary data
router.post('/calculate', gosiController.calculate);

// Calculate GOSI for a specific employee
router.post('/calculate/:employeeId', gosiController.calculateForEmployee);

// ═══════════════════════════════════════════════════════════════
// REPORTS & STATISTICS
// ═══════════════════════════════════════════════════════════════

// Get GOSI report for a period
router.get('/report', gosiController.getReport);

// Get GOSI statistics
router.get('/stats', gosiController.getStats);

// Export GOSI report
router.get('/export', gosiController.exportReport);

module.exports = router;
