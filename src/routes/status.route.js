/**
 * Status Routes
 *
 * System status page endpoints for monitoring service health
 *
 * SECURITY: Public routes for status page, admin routes for management
 */

const express = require('express');
const { authenticate } = require('../middlewares');
const { publicRateLimiter, authRateLimiter, sensitiveRateLimiter } = require('../middlewares/rateLimiter.middleware');
const {
    // Public endpoints
    getPublicStatus,
    getPublicComponents,
    getComponentStatus,
    getPublicIncidents,
    getIncidentDetails,
    getPublicMaintenance,
    subscribe,
    unsubscribe,
    // Admin - Components
    listComponents,
    createComponent,
    updateComponent,
    deleteComponent,
    // Admin - Incidents
    createIncident,
    updateIncident,
    resolveIncident,
    // Admin - Maintenance
    scheduleMaintenance,
    updateMaintenance,
    startMaintenance,
    completeMaintenance,
    cancelMaintenance,
    // Admin - Subscribers & History
    listSubscribers,
    getStatusHistory
} = require('../controllers/statusPage.controller');

const router = express.Router();

// ========================================================================
// PUBLIC ROUTES - STATUS PAGE
// ========================================================================

router.get('/', publicRateLimiter, getPublicStatus);

router.get('/components', publicRateLimiter, getPublicComponents);

router.get('/components/:id', publicRateLimiter, getComponentStatus);

router.get('/incidents', publicRateLimiter, getPublicIncidents);

router.get('/incidents/:id', publicRateLimiter, getIncidentDetails);

router.get('/maintenance', publicRateLimiter, getPublicMaintenance);

router.post('/subscribe', authRateLimiter, subscribe);

router.get('/unsubscribe/:token', publicRateLimiter, unsubscribe);

// ========================================================================
// ADMIN ROUTES - COMPONENT MANAGEMENT
// ========================================================================

router.get('/admin/components', authenticate, publicRateLimiter, listComponents);

router.post('/admin/components', authenticate, sensitiveRateLimiter, createComponent);

router.put('/admin/components/:id', authenticate, sensitiveRateLimiter, updateComponent);

router.delete('/admin/components/:id', authenticate, sensitiveRateLimiter, deleteComponent);

// ========================================================================
// ADMIN ROUTES - INCIDENT MANAGEMENT
// ========================================================================

router.post('/admin/incidents', authenticate, sensitiveRateLimiter, createIncident);

router.put('/admin/incidents/:id', authenticate, sensitiveRateLimiter, updateIncident);

router.post('/admin/incidents/:id/resolve', authenticate, sensitiveRateLimiter, resolveIncident);

// ========================================================================
// ADMIN ROUTES - MAINTENANCE MANAGEMENT
// ========================================================================

router.post('/admin/maintenance', authenticate, sensitiveRateLimiter, scheduleMaintenance);

router.put('/admin/maintenance/:id', authenticate, sensitiveRateLimiter, updateMaintenance);

router.post('/admin/maintenance/:id/start', authenticate, sensitiveRateLimiter, startMaintenance);

router.post('/admin/maintenance/:id/complete', authenticate, sensitiveRateLimiter, completeMaintenance);

router.post('/admin/maintenance/:id/cancel', authenticate, sensitiveRateLimiter, cancelMaintenance);

// ========================================================================
// ADMIN ROUTES - SUBSCRIBER & HISTORY MANAGEMENT
// ========================================================================

router.get('/admin/subscribers', authenticate, publicRateLimiter, listSubscribers);

router.get('/admin/history', authenticate, publicRateLimiter, getStatusHistory);

module.exports = router;
