/**
 * Status Page Controller
 *
 * Provides public and admin endpoints for system status monitoring.
 * Public endpoints allow users to view system status, incidents, and maintenance.
 * Admin endpoints allow managing components, incidents, and maintenance schedules.
 *
 * SECURITY:
 * - Public endpoints are unauthenticated and rate-limited
 * - Admin endpoints require authentication and admin role
 * - All inputs are validated and sanitized
 * - Audit logging for all admin actions
 */

const statusPageService = require('../services/statusPage.service');
const { User } = require('../models');
const logger = require('../utils/logger');
const { CustomException } = require('../utils');
const {
    pickAllowedFields,
    sanitizeObjectId,
    sanitizeString,
    sanitizePagination,
    sanitizeForLog
} = require('../utils/securityUtils');

// ========================================================================
// PUBLIC ENDPOINTS (No Authentication Required)
// ========================================================================

/**
 * Get public status page
 * GET /api/status
 *
 * Returns overall system status, active incidents, and upcoming maintenance.
 * This is the main endpoint for public status page display.
 */
const getPublicStatus = async (req, res) => {
    try {
        const status = await statusPageService.getPublicStatus();

        return res.status(200).json({
            error: false,
            data: status
        });
    } catch (error) {
        logger.error('Error fetching public status:', sanitizeForLog(error.message));
        return res.status(500).json({
            error: true,
            message: 'Failed to fetch status page',
            messageAr: 'فشل في جلب صفحة الحالة'
        });
    }
};

/**
 * Get all public components
 * GET /api/status/components
 *
 * Returns list of all public system components with their current status.
 */
const getPublicComponents = async (req, res) => {
    try {
        const components = await statusPageService.getPublicComponents();

        return res.status(200).json({
            error: false,
            data: components
        });
    } catch (error) {
        logger.error('Error fetching public components:', sanitizeForLog(error.message));
        return res.status(500).json({
            error: true,
            message: 'Failed to fetch components',
            messageAr: 'فشل في جلب المكونات'
        });
    }
};

/**
 * Get component status
 * GET /api/status/components/:id
 *
 * Returns detailed status and history for a specific component.
 */
const getComponentStatus = async (req, res) => {
    try {
        const componentId = sanitizeObjectId(req.params.id);

        if (!componentId) {
            return res.status(400).json({
                error: true,
                message: 'Invalid component ID',
                messageAr: 'معرف المكون غير صالح',
                code: 'INVALID_INPUT'
            });
        }

        const component = await statusPageService.getComponentById(componentId);

        if (!component) {
            return res.status(404).json({
                error: true,
                message: 'Component not found',
                messageAr: 'المكون غير موجود',
                code: 'NOT_FOUND'
            });
        }

        return res.status(200).json({
            error: false,
            data: component
        });
    } catch (error) {
        logger.error('Error fetching component:', sanitizeForLog(error.message));
        return res.status(500).json({
            error: true,
            message: 'Failed to fetch component',
            messageAr: 'فشل في جلب المكون'
        });
    }
};

/**
 * Get current and recent incidents
 * GET /api/status/incidents
 *
 * Returns active incidents and recent resolved incidents.
 */
const getPublicIncidents = async (req, res) => {
    try {
        const paginationParams = sanitizePagination(
            req.query,
            { maxLimit: 50, defaultLimit: 20, defaultPage: 1 }
        );

        const incidents = await statusPageService.getPublicIncidents({
            limit: paginationParams.limit,
            skip: paginationParams.skip
        });

        return res.status(200).json({
            error: false,
            data: incidents,
            pagination: {
                limit: paginationParams.limit,
                skip: paginationParams.skip
            }
        });
    } catch (error) {
        logger.error('Error fetching incidents:', sanitizeForLog(error.message));
        return res.status(500).json({
            error: true,
            message: 'Failed to fetch incidents',
            messageAr: 'فشل في جلب الحوادث'
        });
    }
};

/**
 * Get incident details
 * GET /api/status/incidents/:id
 *
 * Returns detailed information about a specific incident including updates.
 */
const getIncidentDetails = async (req, res) => {
    try {
        const incidentId = sanitizeObjectId(req.params.id);

        if (!incidentId) {
            return res.status(400).json({
                error: true,
                message: 'Invalid incident ID',
                messageAr: 'معرف الحادث غير صالح',
                code: 'INVALID_INPUT'
            });
        }

        const incident = await statusPageService.getIncidentById(incidentId);

        if (!incident) {
            return res.status(404).json({
                error: true,
                message: 'Incident not found',
                messageAr: 'الحادث غير موجود',
                code: 'NOT_FOUND'
            });
        }

        return res.status(200).json({
            error: false,
            data: incident
        });
    } catch (error) {
        logger.error('Error fetching incident:', sanitizeForLog(error.message));
        return res.status(500).json({
            error: true,
            message: 'Failed to fetch incident',
            messageAr: 'فشل في جلب الحادث'
        });
    }
};

/**
 * Get scheduled maintenance
 * GET /api/status/maintenance
 *
 * Returns upcoming and ongoing scheduled maintenance windows.
 */
const getPublicMaintenance = async (req, res) => {
    try {
        const paginationParams = sanitizePagination(
            req.query,
            { maxLimit: 50, defaultLimit: 20, defaultPage: 1 }
        );

        const maintenance = await statusPageService.getPublicMaintenance({
            limit: paginationParams.limit,
            skip: paginationParams.skip
        });

        return res.status(200).json({
            error: false,
            data: maintenance,
            pagination: {
                limit: paginationParams.limit,
                skip: paginationParams.skip
            }
        });
    } catch (error) {
        logger.error('Error fetching maintenance:', sanitizeForLog(error.message));
        return res.status(500).json({
            error: true,
            message: 'Failed to fetch maintenance',
            messageAr: 'فشل في جلب الصيانة'
        });
    }
};

/**
 * Subscribe to status updates
 * POST /api/status/subscribe
 *
 * Allows users to subscribe to email notifications for incidents and maintenance.
 */
const subscribe = async (req, res) => {
    try {
        const { email } = pickAllowedFields(req.body, ['email']);

        if (!email || typeof email !== 'string') {
            return res.status(400).json({
                error: true,
                message: 'Valid email is required',
                messageAr: 'البريد الإلكتروني مطلوب',
                code: 'INVALID_INPUT'
            });
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                error: true,
                message: 'Invalid email format',
                messageAr: 'صيغة البريد الإلكتروني غير صالحة',
                code: 'INVALID_EMAIL'
            });
        }

        const subscription = await statusPageService.subscribe(email);

        return res.status(200).json({
            error: false,
            message: 'Successfully subscribed to status updates',
            messageAr: 'تم الاشتراك بنجاح في تحديثات الحالة',
            data: subscription
        });
    } catch (error) {
        logger.error('Error subscribing to updates:', sanitizeForLog(error.message));

        if (error.message.includes('already subscribed')) {
            return res.status(400).json({
                error: true,
                message: 'Email is already subscribed',
                messageAr: 'البريد الإلكتروني مشترك بالفعل',
                code: 'ALREADY_SUBSCRIBED'
            });
        }

        return res.status(500).json({
            error: true,
            message: 'Failed to subscribe',
            messageAr: 'فشل في الاشتراك'
        });
    }
};

/**
 * Unsubscribe from status updates
 * GET /api/status/unsubscribe/:token
 *
 * Allows users to unsubscribe using a token sent to their email.
 */
const unsubscribe = async (req, res) => {
    try {
        const { token } = req.params;

        if (!token || typeof token !== 'string') {
            return res.status(400).json({
                error: true,
                message: 'Valid unsubscribe token is required',
                messageAr: 'رمز إلغاء الاشتراك مطلوب',
                code: 'INVALID_TOKEN'
            });
        }

        await statusPageService.unsubscribe(token);

        return res.status(200).json({
            error: false,
            message: 'Successfully unsubscribed from status updates',
            messageAr: 'تم إلغاء الاشتراك بنجاح من تحديثات الحالة'
        });
    } catch (error) {
        logger.error('Error unsubscribing:', sanitizeForLog(error.message));

        if (error.message.includes('Invalid') || error.message.includes('not found')) {
            return res.status(400).json({
                error: true,
                message: 'Invalid or expired unsubscribe token',
                messageAr: 'رمز إلغاء الاشتراك غير صالح أو منتهي الصلاحية',
                code: 'INVALID_TOKEN'
            });
        }

        return res.status(500).json({
            error: true,
            message: 'Failed to unsubscribe',
            messageAr: 'فشل في إلغاء الاشتراك'
        });
    }
};

// ========================================================================
// ADMIN ENDPOINTS (Require Authentication + Admin Role)
// ========================================================================

/**
 * Helper function to verify admin access
 */
const verifyAdminAccess = async (req) => {
    const userId = req.userID || req.userId;

    if (!userId) {
        throw CustomException('Authentication required', 401);
    }

    const user = await User.findById(userId).select('role email').lean();

    if (!user || user.role !== 'admin') {
        throw CustomException('Admin access required', 403);
    }

    return user;
};

/**
 * List all components (admin)
 * GET /api/status/admin/components
 */
const listComponents = async (req, res) => {
    try {
        await verifyAdminAccess(req);

        const components = await statusPageService.getAllComponents();

        return res.status(200).json({
            error: false,
            data: components
        });
    } catch (error) {
        logger.error('Error listing components:', sanitizeForLog(error.message));

        if (error.status === 401 || error.status === 403) {
            return res.status(error.status).json({
                error: true,
                message: error.message,
                code: error.status === 401 ? 'UNAUTHORIZED' : 'ADMIN_ONLY'
            });
        }

        return res.status(500).json({
            error: true,
            message: 'Failed to list components',
            messageAr: 'فشل في عرض المكونات'
        });
    }
};

/**
 * Create component (admin)
 * POST /api/status/admin/components
 */
const createComponent = async (req, res) => {
    try {
        const admin = await verifyAdminAccess(req);

        const componentData = pickAllowedFields(req.body, [
            'name',
            'description',
            'status',
            'order',
            'group',
            'showUptime'
        ]);

        if (!componentData.name) {
            return res.status(400).json({
                error: true,
                message: 'Component name is required',
                messageAr: 'اسم المكون مطلوب',
                code: 'INVALID_INPUT'
            });
        }

        const component = await statusPageService.createComponent({
            ...componentData,
            createdBy: admin._id || req.userID
        });

        logger.info('Component created by admin', {
            componentId: component._id,
            adminEmail: admin.email
        });

        return res.status(201).json({
            error: false,
            message: 'Component created successfully',
            messageAr: 'تم إنشاء المكون بنجاح',
            data: component
        });
    } catch (error) {
        logger.error('Error creating component:', sanitizeForLog(error.message));

        if (error.status === 401 || error.status === 403) {
            return res.status(error.status).json({
                error: true,
                message: error.message,
                code: error.status === 401 ? 'UNAUTHORIZED' : 'ADMIN_ONLY'
            });
        }

        return res.status(500).json({
            error: true,
            message: 'Failed to create component',
            messageAr: 'فشل في إنشاء المكون'
        });
    }
};

/**
 * Update component (admin)
 * PUT /api/status/admin/components/:id
 */
const updateComponent = async (req, res) => {
    try {
        const admin = await verifyAdminAccess(req);
        const componentId = sanitizeObjectId(req.params.id);

        if (!componentId) {
            return res.status(400).json({
                error: true,
                message: 'Invalid component ID',
                messageAr: 'معرف المكون غير صالح',
                code: 'INVALID_INPUT'
            });
        }

        const updateData = pickAllowedFields(req.body, [
            'name',
            'description',
            'status',
            'order',
            'group',
            'showUptime'
        ]);

        const component = await statusPageService.updateComponent(componentId, {
            ...updateData,
            updatedBy: admin._id || req.userID
        });

        if (!component) {
            return res.status(404).json({
                error: true,
                message: 'Component not found',
                messageAr: 'المكون غير موجود',
                code: 'NOT_FOUND'
            });
        }

        logger.info('Component updated by admin', {
            componentId,
            adminEmail: admin.email
        });

        return res.status(200).json({
            error: false,
            message: 'Component updated successfully',
            messageAr: 'تم تحديث المكون بنجاح',
            data: component
        });
    } catch (error) {
        logger.error('Error updating component:', sanitizeForLog(error.message));

        if (error.status === 401 || error.status === 403) {
            return res.status(error.status).json({
                error: true,
                message: error.message,
                code: error.status === 401 ? 'UNAUTHORIZED' : 'ADMIN_ONLY'
            });
        }

        return res.status(500).json({
            error: true,
            message: 'Failed to update component',
            messageAr: 'فشل في تحديث المكون'
        });
    }
};

/**
 * Delete component (admin)
 * DELETE /api/status/admin/components/:id
 */
const deleteComponent = async (req, res) => {
    try {
        const admin = await verifyAdminAccess(req);
        const componentId = sanitizeObjectId(req.params.id);

        if (!componentId) {
            return res.status(400).json({
                error: true,
                message: 'Invalid component ID',
                messageAr: 'معرف المكون غير صالح',
                code: 'INVALID_INPUT'
            });
        }

        const deleted = await statusPageService.deleteComponent(componentId);

        if (!deleted) {
            return res.status(404).json({
                error: true,
                message: 'Component not found',
                messageAr: 'المكون غير موجود',
                code: 'NOT_FOUND'
            });
        }

        logger.info('Component deleted by admin', {
            componentId,
            adminEmail: admin.email
        });

        return res.status(200).json({
            error: false,
            message: 'Component deleted successfully',
            messageAr: 'تم حذف المكون بنجاح'
        });
    } catch (error) {
        logger.error('Error deleting component:', sanitizeForLog(error.message));

        if (error.status === 401 || error.status === 403) {
            return res.status(error.status).json({
                error: true,
                message: error.message,
                code: error.status === 401 ? 'UNAUTHORIZED' : 'ADMIN_ONLY'
            });
        }

        return res.status(500).json({
            error: true,
            message: 'Failed to delete component',
            messageAr: 'فشل في حذف المكون'
        });
    }
};

/**
 * Create incident (admin)
 * POST /api/status/admin/incidents
 */
const createIncident = async (req, res) => {
    try {
        const admin = await verifyAdminAccess(req);

        const incidentData = pickAllowedFields(req.body, [
            'title',
            'description',
            'status',
            'impact',
            'affectedComponents',
            'updates'
        ]);

        if (!incidentData.title) {
            return res.status(400).json({
                error: true,
                message: 'Incident title is required',
                messageAr: 'عنوان الحادث مطلوب',
                code: 'INVALID_INPUT'
            });
        }

        const incident = await statusPageService.createIncident({
            ...incidentData,
            createdBy: admin._id || req.userID
        });

        logger.info('Incident created by admin', {
            incidentId: incident._id,
            adminEmail: admin.email
        });

        return res.status(201).json({
            error: false,
            message: 'Incident created successfully',
            messageAr: 'تم إنشاء الحادث بنجاح',
            data: incident
        });
    } catch (error) {
        logger.error('Error creating incident:', sanitizeForLog(error.message));

        if (error.status === 401 || error.status === 403) {
            return res.status(error.status).json({
                error: true,
                message: error.message,
                code: error.status === 401 ? 'UNAUTHORIZED' : 'ADMIN_ONLY'
            });
        }

        return res.status(500).json({
            error: true,
            message: 'Failed to create incident',
            messageAr: 'فشل في إنشاء الحادث'
        });
    }
};

/**
 * Update incident (admin)
 * PUT /api/status/admin/incidents/:id
 */
const updateIncident = async (req, res) => {
    try {
        const admin = await verifyAdminAccess(req);
        const incidentId = sanitizeObjectId(req.params.id);

        if (!incidentId) {
            return res.status(400).json({
                error: true,
                message: 'Invalid incident ID',
                messageAr: 'معرف الحادث غير صالح',
                code: 'INVALID_INPUT'
            });
        }

        const updateData = pickAllowedFields(req.body, [
            'title',
            'description',
            'status',
            'impact',
            'affectedComponents',
            'updates'
        ]);

        const incident = await statusPageService.updateIncident(incidentId, {
            ...updateData,
            updatedBy: admin._id || req.userID
        });

        if (!incident) {
            return res.status(404).json({
                error: true,
                message: 'Incident not found',
                messageAr: 'الحادث غير موجود',
                code: 'NOT_FOUND'
            });
        }

        logger.info('Incident updated by admin', {
            incidentId,
            adminEmail: admin.email
        });

        return res.status(200).json({
            error: false,
            message: 'Incident updated successfully',
            messageAr: 'تم تحديث الحادث بنجاح',
            data: incident
        });
    } catch (error) {
        logger.error('Error updating incident:', sanitizeForLog(error.message));

        if (error.status === 401 || error.status === 403) {
            return res.status(error.status).json({
                error: true,
                message: error.message,
                code: error.status === 401 ? 'UNAUTHORIZED' : 'ADMIN_ONLY'
            });
        }

        return res.status(500).json({
            error: true,
            message: 'Failed to update incident',
            messageAr: 'فشل في تحديث الحادث'
        });
    }
};

/**
 * Resolve incident (admin)
 * POST /api/status/admin/incidents/:id/resolve
 */
const resolveIncident = async (req, res) => {
    try {
        const admin = await verifyAdminAccess(req);
        const incidentId = sanitizeObjectId(req.params.id);

        if (!incidentId) {
            return res.status(400).json({
                error: true,
                message: 'Invalid incident ID',
                messageAr: 'معرف الحادث غير صالح',
                code: 'INVALID_INPUT'
            });
        }

        const { message } = pickAllowedFields(req.body, ['message']);

        const incident = await statusPageService.resolveIncident(incidentId, {
            resolvedBy: admin._id || req.userID,
            message
        });

        if (!incident) {
            return res.status(404).json({
                error: true,
                message: 'Incident not found',
                messageAr: 'الحادث غير موجود',
                code: 'NOT_FOUND'
            });
        }

        logger.info('Incident resolved by admin', {
            incidentId,
            adminEmail: admin.email
        });

        return res.status(200).json({
            error: false,
            message: 'Incident resolved successfully',
            messageAr: 'تم حل الحادث بنجاح',
            data: incident
        });
    } catch (error) {
        logger.error('Error resolving incident:', sanitizeForLog(error.message));

        if (error.status === 401 || error.status === 403) {
            return res.status(error.status).json({
                error: true,
                message: error.message,
                code: error.status === 401 ? 'UNAUTHORIZED' : 'ADMIN_ONLY'
            });
        }

        return res.status(500).json({
            error: true,
            message: 'Failed to resolve incident',
            messageAr: 'فشل في حل الحادث'
        });
    }
};

/**
 * Schedule maintenance (admin)
 * POST /api/status/admin/maintenance
 */
const scheduleMaintenance = async (req, res) => {
    try {
        const admin = await verifyAdminAccess(req);

        const maintenanceData = pickAllowedFields(req.body, [
            'title',
            'description',
            'scheduledStart',
            'scheduledEnd',
            'affectedComponents',
            'autoStart',
            'autoComplete'
        ]);

        if (!maintenanceData.title || !maintenanceData.scheduledStart || !maintenanceData.scheduledEnd) {
            return res.status(400).json({
                error: true,
                message: 'Title, scheduled start, and scheduled end are required',
                messageAr: 'العنوان وموعد البدء والانتهاء مطلوبة',
                code: 'INVALID_INPUT'
            });
        }

        const maintenance = await statusPageService.scheduleMaintenance({
            ...maintenanceData,
            createdBy: admin._id || req.userID
        });

        logger.info('Maintenance scheduled by admin', {
            maintenanceId: maintenance._id,
            adminEmail: admin.email
        });

        return res.status(201).json({
            error: false,
            message: 'Maintenance scheduled successfully',
            messageAr: 'تم جدولة الصيانة بنجاح',
            data: maintenance
        });
    } catch (error) {
        logger.error('Error scheduling maintenance:', sanitizeForLog(error.message));

        if (error.status === 401 || error.status === 403) {
            return res.status(error.status).json({
                error: true,
                message: error.message,
                code: error.status === 401 ? 'UNAUTHORIZED' : 'ADMIN_ONLY'
            });
        }

        return res.status(500).json({
            error: true,
            message: 'Failed to schedule maintenance',
            messageAr: 'فشل في جدولة الصيانة'
        });
    }
};

/**
 * Update maintenance (admin)
 * PUT /api/status/admin/maintenance/:id
 */
const updateMaintenance = async (req, res) => {
    try {
        const admin = await verifyAdminAccess(req);
        const maintenanceId = sanitizeObjectId(req.params.id);

        if (!maintenanceId) {
            return res.status(400).json({
                error: true,
                message: 'Invalid maintenance ID',
                messageAr: 'معرف الصيانة غير صالح',
                code: 'INVALID_INPUT'
            });
        }

        const updateData = pickAllowedFields(req.body, [
            'title',
            'description',
            'scheduledStart',
            'scheduledEnd',
            'affectedComponents',
            'autoStart',
            'autoComplete'
        ]);

        const maintenance = await statusPageService.updateMaintenance(maintenanceId, {
            ...updateData,
            updatedBy: admin._id || req.userID
        });

        if (!maintenance) {
            return res.status(404).json({
                error: true,
                message: 'Maintenance not found',
                messageAr: 'الصيانة غير موجودة',
                code: 'NOT_FOUND'
            });
        }

        logger.info('Maintenance updated by admin', {
            maintenanceId,
            adminEmail: admin.email
        });

        return res.status(200).json({
            error: false,
            message: 'Maintenance updated successfully',
            messageAr: 'تم تحديث الصيانة بنجاح',
            data: maintenance
        });
    } catch (error) {
        logger.error('Error updating maintenance:', sanitizeForLog(error.message));

        if (error.status === 401 || error.status === 403) {
            return res.status(error.status).json({
                error: true,
                message: error.message,
                code: error.status === 401 ? 'UNAUTHORIZED' : 'ADMIN_ONLY'
            });
        }

        return res.status(500).json({
            error: true,
            message: 'Failed to update maintenance',
            messageAr: 'فشل في تحديث الصيانة'
        });
    }
};

/**
 * Start maintenance (admin)
 * POST /api/status/admin/maintenance/:id/start
 */
const startMaintenance = async (req, res) => {
    try {
        const admin = await verifyAdminAccess(req);
        const maintenanceId = sanitizeObjectId(req.params.id);

        if (!maintenanceId) {
            return res.status(400).json({
                error: true,
                message: 'Invalid maintenance ID',
                messageAr: 'معرف الصيانة غير صالح',
                code: 'INVALID_INPUT'
            });
        }

        const maintenance = await statusPageService.startMaintenance(maintenanceId, {
            startedBy: admin._id || req.userID
        });

        if (!maintenance) {
            return res.status(404).json({
                error: true,
                message: 'Maintenance not found',
                messageAr: 'الصيانة غير موجودة',
                code: 'NOT_FOUND'
            });
        }

        logger.info('Maintenance started by admin', {
            maintenanceId,
            adminEmail: admin.email
        });

        return res.status(200).json({
            error: false,
            message: 'Maintenance started successfully',
            messageAr: 'تم بدء الصيانة بنجاح',
            data: maintenance
        });
    } catch (error) {
        logger.error('Error starting maintenance:', sanitizeForLog(error.message));

        if (error.status === 401 || error.status === 403) {
            return res.status(error.status).json({
                error: true,
                message: error.message,
                code: error.status === 401 ? 'UNAUTHORIZED' : 'ADMIN_ONLY'
            });
        }

        return res.status(500).json({
            error: true,
            message: 'Failed to start maintenance',
            messageAr: 'فشل في بدء الصيانة'
        });
    }
};

/**
 * Complete maintenance (admin)
 * POST /api/status/admin/maintenance/:id/complete
 */
const completeMaintenance = async (req, res) => {
    try {
        const admin = await verifyAdminAccess(req);
        const maintenanceId = sanitizeObjectId(req.params.id);

        if (!maintenanceId) {
            return res.status(400).json({
                error: true,
                message: 'Invalid maintenance ID',
                messageAr: 'معرف الصيانة غير صالح',
                code: 'INVALID_INPUT'
            });
        }

        const maintenance = await statusPageService.completeMaintenance(maintenanceId, {
            completedBy: admin._id || req.userID
        });

        if (!maintenance) {
            return res.status(404).json({
                error: true,
                message: 'Maintenance not found',
                messageAr: 'الصيانة غير موجودة',
                code: 'NOT_FOUND'
            });
        }

        logger.info('Maintenance completed by admin', {
            maintenanceId,
            adminEmail: admin.email
        });

        return res.status(200).json({
            error: false,
            message: 'Maintenance completed successfully',
            messageAr: 'تم إكمال الصيانة بنجاح',
            data: maintenance
        });
    } catch (error) {
        logger.error('Error completing maintenance:', sanitizeForLog(error.message));

        if (error.status === 401 || error.status === 403) {
            return res.status(error.status).json({
                error: true,
                message: error.message,
                code: error.status === 401 ? 'UNAUTHORIZED' : 'ADMIN_ONLY'
            });
        }

        return res.status(500).json({
            error: true,
            message: 'Failed to complete maintenance',
            messageAr: 'فشل في إكمال الصيانة'
        });
    }
};

/**
 * Cancel maintenance (admin)
 * POST /api/status/admin/maintenance/:id/cancel
 */
const cancelMaintenance = async (req, res) => {
    try {
        const admin = await verifyAdminAccess(req);
        const maintenanceId = sanitizeObjectId(req.params.id);

        if (!maintenanceId) {
            return res.status(400).json({
                error: true,
                message: 'Invalid maintenance ID',
                messageAr: 'معرف الصيانة غير صالح',
                code: 'INVALID_INPUT'
            });
        }

        const { reason } = pickAllowedFields(req.body, ['reason']);

        const maintenance = await statusPageService.cancelMaintenance(maintenanceId, {
            cancelledBy: admin._id || req.userID,
            reason
        });

        if (!maintenance) {
            return res.status(404).json({
                error: true,
                message: 'Maintenance not found',
                messageAr: 'الصيانة غير موجودة',
                code: 'NOT_FOUND'
            });
        }

        logger.info('Maintenance cancelled by admin', {
            maintenanceId,
            adminEmail: admin.email
        });

        return res.status(200).json({
            error: false,
            message: 'Maintenance cancelled successfully',
            messageAr: 'تم إلغاء الصيانة بنجاح',
            data: maintenance
        });
    } catch (error) {
        logger.error('Error cancelling maintenance:', sanitizeForLog(error.message));

        if (error.status === 401 || error.status === 403) {
            return res.status(error.status).json({
                error: true,
                message: error.message,
                code: error.status === 401 ? 'UNAUTHORIZED' : 'ADMIN_ONLY'
            });
        }

        return res.status(500).json({
            error: true,
            message: 'Failed to cancel maintenance',
            messageAr: 'فشل في إلغاء الصيانة'
        });
    }
};

/**
 * List subscribers (admin)
 * GET /api/status/admin/subscribers
 */
const listSubscribers = async (req, res) => {
    try {
        await verifyAdminAccess(req);

        const paginationParams = sanitizePagination(
            req.query,
            { maxLimit: 100, defaultLimit: 50, defaultPage: 1 }
        );

        const subscribers = await statusPageService.getSubscribers({
            limit: paginationParams.limit,
            skip: paginationParams.skip
        });

        return res.status(200).json({
            error: false,
            data: subscribers,
            pagination: {
                limit: paginationParams.limit,
                skip: paginationParams.skip
            }
        });
    } catch (error) {
        logger.error('Error listing subscribers:', sanitizeForLog(error.message));

        if (error.status === 401 || error.status === 403) {
            return res.status(error.status).json({
                error: true,
                message: error.message,
                code: error.status === 401 ? 'UNAUTHORIZED' : 'ADMIN_ONLY'
            });
        }

        return res.status(500).json({
            error: true,
            message: 'Failed to list subscribers',
            messageAr: 'فشل في عرض المشتركين'
        });
    }
};

/**
 * Get status history (admin)
 * GET /api/status/admin/history
 */
const getStatusHistory = async (req, res) => {
    try {
        await verifyAdminAccess(req);

        const paginationParams = sanitizePagination(
            req.query,
            { maxLimit: 100, defaultLimit: 50, defaultPage: 1 }
        );

        const { startDate, endDate, componentId } = req.query;

        const history = await statusPageService.getStatusHistory({
            limit: paginationParams.limit,
            skip: paginationParams.skip,
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
            componentId: componentId ? sanitizeObjectId(componentId) : undefined
        });

        return res.status(200).json({
            error: false,
            data: history,
            pagination: {
                limit: paginationParams.limit,
                skip: paginationParams.skip
            }
        });
    } catch (error) {
        logger.error('Error fetching status history:', sanitizeForLog(error.message));

        if (error.status === 401 || error.status === 403) {
            return res.status(error.status).json({
                error: true,
                message: error.message,
                code: error.status === 401 ? 'UNAUTHORIZED' : 'ADMIN_ONLY'
            });
        }

        return res.status(500).json({
            error: true,
            message: 'Failed to fetch status history',
            messageAr: 'فشل في جلب سجل الحالة'
        });
    }
};

module.exports = {
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
};
