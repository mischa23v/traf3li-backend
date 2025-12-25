/**
 * Status Page Routes
 *
 * Provides public status page endpoints and admin management endpoints.
 *
 * Public routes (no authentication):
 * - GET /api/status - Get public status page
 * - GET /api/status/components - Get all public components
 * - GET /api/status/components/:id - Get component status
 * - GET /api/status/incidents - Get current and recent incidents
 * - GET /api/status/incidents/:id - Get incident details
 * - GET /api/status/maintenance - Get scheduled maintenance
 * - POST /api/status/subscribe - Subscribe to updates
 * - GET /api/status/unsubscribe/:token - Unsubscribe
 *
 * Admin routes (require authentication + admin role):
 * - Component management
 * - Incident management
 * - Maintenance management
 * - Subscriber management
 * - Status history
 */

const express = require('express');
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

    // Admin endpoints - Components
    listComponents,
    createComponent,
    updateComponent,
    deleteComponent,

    // Admin endpoints - Incidents
    createIncident,
    updateIncident,
    resolveIncident,

    // Admin endpoints - Maintenance
    scheduleMaintenance,
    updateMaintenance,
    startMaintenance,
    completeMaintenance,
    cancelMaintenance,

    // Admin endpoints - Management
    listSubscribers,
    getStatusHistory
} = require('../controllers/statusPage.controller');

const { authenticate } = require('../middlewares');
const { publicRateLimiter, authRateLimiter, sensitiveRateLimiter } = require('../middlewares/rateLimiter.middleware');

const router = express.Router();

// ========================================================================
// PUBLIC ROUTES (No Authentication Required)
// ========================================================================

/**
 * @openapi
 * /api/status:
 *   get:
 *     summary: Get public status page
 *     description: Returns overall system status, active incidents, and upcoming maintenance
 *     tags:
 *       - Status Page
 *     responses:
 *       200:
 *         description: Status page retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: boolean
 *                   example: false
 *                 data:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                       enum: [operational, degraded_performance, partial_outage, major_outage]
 *                     components:
 *                       type: array
 *                     incidents:
 *                       type: array
 *                     maintenance:
 *                       type: array
 *       500:
 *         description: Internal server error
 */
router.get('/', publicRateLimiter, getPublicStatus);

/**
 * @openapi
 * /api/status/components:
 *   get:
 *     summary: Get all public components
 *     description: Returns list of all public system components with their current status
 *     tags:
 *       - Status Page
 *     responses:
 *       200:
 *         description: Components retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: boolean
 *                   example: false
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       status:
 *                         type: string
 *                         enum: [operational, degraded_performance, partial_outage, major_outage]
 *                       description:
 *                         type: string
 *       500:
 *         description: Internal server error
 */
router.get('/components', publicRateLimiter, getPublicComponents);

/**
 * @openapi
 * /api/status/components/{id}:
 *   get:
 *     summary: Get component status
 *     description: Returns detailed status and history for a specific component
 *     tags:
 *       - Status Page
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Component ID
 *     responses:
 *       200:
 *         description: Component retrieved successfully
 *       400:
 *         description: Invalid component ID
 *       404:
 *         description: Component not found
 *       500:
 *         description: Internal server error
 */
router.get('/components/:id', publicRateLimiter, getComponentStatus);

/**
 * @openapi
 * /api/status/incidents:
 *   get:
 *     summary: Get current and recent incidents
 *     description: Returns active incidents and recent resolved incidents
 *     tags:
 *       - Status Page
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of results to return
 *       - in: query
 *         name: skip
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of results to skip
 *     responses:
 *       200:
 *         description: Incidents retrieved successfully
 *       500:
 *         description: Internal server error
 */
router.get('/incidents', publicRateLimiter, getPublicIncidents);

/**
 * @openapi
 * /api/status/incidents/{id}:
 *   get:
 *     summary: Get incident details
 *     description: Returns detailed information about a specific incident including updates
 *     tags:
 *       - Status Page
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Incident ID
 *     responses:
 *       200:
 *         description: Incident retrieved successfully
 *       400:
 *         description: Invalid incident ID
 *       404:
 *         description: Incident not found
 *       500:
 *         description: Internal server error
 */
router.get('/incidents/:id', publicRateLimiter, getIncidentDetails);

/**
 * @openapi
 * /api/status/maintenance:
 *   get:
 *     summary: Get scheduled maintenance
 *     description: Returns upcoming and ongoing scheduled maintenance windows
 *     tags:
 *       - Status Page
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of results to return
 *       - in: query
 *         name: skip
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of results to skip
 *     responses:
 *       200:
 *         description: Maintenance retrieved successfully
 *       500:
 *         description: Internal server error
 */
router.get('/maintenance', publicRateLimiter, getPublicMaintenance);

/**
 * @openapi
 * /api/status/subscribe:
 *   post:
 *     summary: Subscribe to status updates
 *     description: Allows users to subscribe to email notifications for incidents and maintenance
 *     tags:
 *       - Status Page
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *     responses:
 *       200:
 *         description: Successfully subscribed
 *       400:
 *         description: Invalid email or already subscribed
 *       500:
 *         description: Internal server error
 */
router.post('/subscribe', authRateLimiter, subscribe);

/**
 * @openapi
 * /api/status/unsubscribe/{token}:
 *   get:
 *     summary: Unsubscribe from status updates
 *     description: Allows users to unsubscribe using a token sent to their email
 *     tags:
 *       - Status Page
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Unsubscribe token
 *     responses:
 *       200:
 *         description: Successfully unsubscribed
 *       400:
 *         description: Invalid or expired token
 *       500:
 *         description: Internal server error
 */
router.get('/unsubscribe/:token', publicRateLimiter, unsubscribe);

// ========================================================================
// ADMIN ROUTES - COMPONENT MANAGEMENT
// ========================================================================

/**
 * @openapi
 * /api/status/admin/components:
 *   get:
 *     summary: List all components (Admin)
 *     description: Returns all components including internal ones
 *     tags:
 *       - Status Page - Admin
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Components retrieved successfully
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       500:
 *         description: Internal server error
 */
router.get('/admin/components', authenticate, publicRateLimiter, listComponents);

/**
 * @openapi
 * /api/status/admin/components:
 *   post:
 *     summary: Create component (Admin)
 *     description: Creates a new system component
 *     tags:
 *       - Status Page - Admin
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [operational, degraded_performance, partial_outage, major_outage]
 *               order:
 *                 type: number
 *               group:
 *                 type: string
 *               showUptime:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Component created successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       500:
 *         description: Internal server error
 */
router.post('/admin/components', authenticate, sensitiveRateLimiter, createComponent);

/**
 * @openapi
 * /api/status/admin/components/{id}:
 *   put:
 *     summary: Update component (Admin)
 *     description: Updates an existing component
 *     tags:
 *       - Status Page - Admin
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Component ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               status:
 *                 type: string
 *               order:
 *                 type: number
 *               group:
 *                 type: string
 *               showUptime:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Component updated successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Component not found
 *       500:
 *         description: Internal server error
 */
router.put('/admin/components/:id', authenticate, sensitiveRateLimiter, updateComponent);

/**
 * @openapi
 * /api/status/admin/components/{id}:
 *   delete:
 *     summary: Delete component (Admin)
 *     description: Deletes a component
 *     tags:
 *       - Status Page - Admin
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Component ID
 *     responses:
 *       200:
 *         description: Component deleted successfully
 *       400:
 *         description: Invalid component ID
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Component not found
 *       500:
 *         description: Internal server error
 */
router.delete('/admin/components/:id', authenticate, sensitiveRateLimiter, deleteComponent);

// ========================================================================
// ADMIN ROUTES - INCIDENT MANAGEMENT
// ========================================================================

/**
 * @openapi
 * /api/status/admin/incidents:
 *   post:
 *     summary: Create incident (Admin)
 *     description: Creates a new incident
 *     tags:
 *       - Status Page - Admin
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [investigating, identified, monitoring, resolved]
 *               impact:
 *                 type: string
 *                 enum: [none, minor, major, critical]
 *               affectedComponents:
 *                 type: array
 *                 items:
 *                   type: string
 *               updates:
 *                 type: array
 *     responses:
 *       201:
 *         description: Incident created successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       500:
 *         description: Internal server error
 */
router.post('/admin/incidents', authenticate, sensitiveRateLimiter, createIncident);

/**
 * @openapi
 * /api/status/admin/incidents/{id}:
 *   put:
 *     summary: Update incident (Admin)
 *     description: Updates an existing incident
 *     tags:
 *       - Status Page - Admin
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Incident ID
 *     responses:
 *       200:
 *         description: Incident updated successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Incident not found
 *       500:
 *         description: Internal server error
 */
router.put('/admin/incidents/:id', authenticate, sensitiveRateLimiter, updateIncident);

/**
 * @openapi
 * /api/status/admin/incidents/{id}/resolve:
 *   post:
 *     summary: Resolve incident (Admin)
 *     description: Marks an incident as resolved
 *     tags:
 *       - Status Page - Admin
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Incident ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *     responses:
 *       200:
 *         description: Incident resolved successfully
 *       400:
 *         description: Invalid incident ID
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Incident not found
 *       500:
 *         description: Internal server error
 */
router.post('/admin/incidents/:id/resolve', authenticate, sensitiveRateLimiter, resolveIncident);

// ========================================================================
// ADMIN ROUTES - MAINTENANCE MANAGEMENT
// ========================================================================

/**
 * @openapi
 * /api/status/admin/maintenance:
 *   post:
 *     summary: Schedule maintenance (Admin)
 *     description: Schedules a new maintenance window
 *     tags:
 *       - Status Page - Admin
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - scheduledStart
 *               - scheduledEnd
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               scheduledStart:
 *                 type: string
 *                 format: date-time
 *               scheduledEnd:
 *                 type: string
 *                 format: date-time
 *               affectedComponents:
 *                 type: array
 *                 items:
 *                   type: string
 *               autoStart:
 *                 type: boolean
 *               autoComplete:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Maintenance scheduled successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       500:
 *         description: Internal server error
 */
router.post('/admin/maintenance', authenticate, sensitiveRateLimiter, scheduleMaintenance);

/**
 * @openapi
 * /api/status/admin/maintenance/{id}:
 *   put:
 *     summary: Update maintenance (Admin)
 *     description: Updates a scheduled maintenance window
 *     tags:
 *       - Status Page - Admin
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Maintenance ID
 *     responses:
 *       200:
 *         description: Maintenance updated successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Maintenance not found
 *       500:
 *         description: Internal server error
 */
router.put('/admin/maintenance/:id', authenticate, sensitiveRateLimiter, updateMaintenance);

/**
 * @openapi
 * /api/status/admin/maintenance/{id}/start:
 *   post:
 *     summary: Start maintenance (Admin)
 *     description: Manually starts a scheduled maintenance
 *     tags:
 *       - Status Page - Admin
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Maintenance ID
 *     responses:
 *       200:
 *         description: Maintenance started successfully
 *       400:
 *         description: Invalid maintenance ID
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Maintenance not found
 *       500:
 *         description: Internal server error
 */
router.post('/admin/maintenance/:id/start', authenticate, sensitiveRateLimiter, startMaintenance);

/**
 * @openapi
 * /api/status/admin/maintenance/{id}/complete:
 *   post:
 *     summary: Complete maintenance (Admin)
 *     description: Marks a maintenance as completed
 *     tags:
 *       - Status Page - Admin
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Maintenance ID
 *     responses:
 *       200:
 *         description: Maintenance completed successfully
 *       400:
 *         description: Invalid maintenance ID
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Maintenance not found
 *       500:
 *         description: Internal server error
 */
router.post('/admin/maintenance/:id/complete', authenticate, sensitiveRateLimiter, completeMaintenance);

/**
 * @openapi
 * /api/status/admin/maintenance/{id}/cancel:
 *   post:
 *     summary: Cancel maintenance (Admin)
 *     description: Cancels a scheduled maintenance
 *     tags:
 *       - Status Page - Admin
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Maintenance ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Maintenance cancelled successfully
 *       400:
 *         description: Invalid maintenance ID
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Maintenance not found
 *       500:
 *         description: Internal server error
 */
router.post('/admin/maintenance/:id/cancel', authenticate, sensitiveRateLimiter, cancelMaintenance);

// ========================================================================
// ADMIN ROUTES - SUBSCRIBER & HISTORY MANAGEMENT
// ========================================================================

/**
 * @openapi
 * /api/status/admin/subscribers:
 *   get:
 *     summary: List subscribers (Admin)
 *     description: Returns list of all subscribers
 *     tags:
 *       - Status Page - Admin
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: skip
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: Subscribers retrieved successfully
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       500:
 *         description: Internal server error
 */
router.get('/admin/subscribers', authenticate, publicRateLimiter, listSubscribers);

/**
 * @openapi
 * /api/status/admin/history:
 *   get:
 *     summary: Get status history (Admin)
 *     description: Returns historical status changes and events
 *     tags:
 *       - Status Page - Admin
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: skip
 *         schema:
 *           type: integer
 *           default: 0
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: componentId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: History retrieved successfully
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       500:
 *         description: Internal server error
 */
router.get('/admin/history', authenticate, publicRateLimiter, getStatusHistory);

module.exports = router;
