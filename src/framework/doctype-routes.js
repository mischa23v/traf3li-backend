/**
 * DocType Route Generator - Auto-generates Express CRUD routes from DocType definitions
 *
 * This generates RESTful endpoints for DocTypes with:
 * - Permission checks based on DocType permissions
 * - Multi-tenancy filtering via firmId
 * - Pagination, sorting, filtering
 * - Audit trails
 *
 * @module framework/doctype-routes
 */

const express = require('express');
const mongoose = require('mongoose');
const { registry } = require('./doctype-registry');
const asyncHandler = require('../utils/asyncHandler');
const { sanitizeObjectId, pickAllowedFields } = require('../utils/securityUtils');
const { userMiddleware } = require('../middlewares/user-middleware');
const { firmFilter } = require('../middlewares/firmContext');
const CustomException = require('../utils/CustomException');
const logger = require('../utils/logger');

/**
 * Permission levels
 */
const PERMISSION_LEVELS = {
    READ: 'read',
    WRITE: 'write',
    CREATE: 'create',
    DELETE: 'delete',
    SUBMIT: 'submit',
    CANCEL: 'cancel',
    AMEND: 'amend',
    REPORT: 'report',
    IMPORT: 'import',
    EXPORT: 'export',
    SHARE: 'share'
};

/**
 * Generate Express router for a DocType
 * @param {string} docTypeName - Name of the DocType
 * @returns {express.Router} Express router with CRUD endpoints
 */
function generateRoutes(docTypeName) {
    const router = express.Router();
    const docType = registry.getDocType(docTypeName);
    const Model = registry.getModel(docTypeName);

    if (!docType || !Model) {
        throw new Error(`DocType ${docTypeName} not found in registry`);
    }

    const routeName = toRouteName(docTypeName);

    // Apply common middleware
    router.use(userMiddleware);
    router.use(firmFilter);

    // GET /api/:doctype - List documents
    router.get('/', asyncHandler(async (req, res) => {
        checkPermission(req, docType, PERMISSION_LEVELS.READ);

        const {
            page = 1,
            limit = 20,
            sort = '-createdAt',
            fields,
            filters,
            search
        } = req.query;

        const query = buildQuery(req, docType, filters, search);
        const projection = fields ? fields.split(',').join(' ') : undefined;

        const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
        const sortObj = parseSortString(sort);

        const [docs, total] = await Promise.all([
            Model.find(query)
                .select(projection)
                .sort(sortObj)
                .skip(skip)
                .limit(parseInt(limit, 10))
                .lean(),
            Model.countDocuments(query)
        ]);

        res.json({
            success: true,
            data: docs,
            meta: {
                page: parseInt(page, 10),
                limit: parseInt(limit, 10),
                total,
                pages: Math.ceil(total / parseInt(limit, 10))
            }
        });
    }));

    // GET /api/:doctype/:id - Get single document
    router.get('/:id', asyncHandler(async (req, res) => {
        checkPermission(req, docType, PERMISSION_LEVELS.READ);

        const id = sanitizeObjectId(req.params.id);
        if (!id) {
            throw new CustomException('Invalid ID | معرف غير صالح', 400);
        }

        const query = {
            _id: id,
            firmId: req.firmId,
            ...(docType.allow_trash !== false ? { isDeleted: { $ne: true } } : {})
        };

        const doc = await Model.findOne(query).lean();

        if (!doc) {
            throw new CustomException('Document not found | المستند غير موجود', 404);
        }

        res.json({
            success: true,
            data: doc
        });
    }));

    // POST /api/:doctype - Create document
    router.post('/', asyncHandler(async (req, res) => {
        checkPermission(req, docType, PERMISSION_LEVELS.CREATE);

        const allowedFields = getWritableFields(docType);
        const safeData = pickAllowedFields(req.body, allowedFields);

        const doc = new Model({
            ...safeData,
            firmId: req.firmId,
            lawyerId: req.userID,
            createdBy: req.userID
        });

        await doc.save();

        res.status(201).json({
            success: true,
            message: 'Document created successfully | تم إنشاء المستند بنجاح',
            data: doc.toObject()
        });
    }));

    // PUT /api/:doctype/:id - Update document
    router.put('/:id', asyncHandler(async (req, res) => {
        checkPermission(req, docType, PERMISSION_LEVELS.WRITE);

        const id = sanitizeObjectId(req.params.id);
        if (!id) {
            throw new CustomException('Invalid ID | معرف غير صالح', 400);
        }

        const query = {
            _id: id,
            firmId: req.firmId,
            ...(docType.allow_trash !== false ? { isDeleted: { $ne: true } } : {})
        };

        const existingDoc = await Model.findOne(query);
        if (!existingDoc) {
            throw new CustomException('Document not found | المستند غير موجود', 404);
        }

        // Check if document is submitted (cannot modify)
        if (docType.is_submittable && existingDoc.docstatus === 1) {
            throw new CustomException('Cannot modify submitted document | لا يمكن تعديل مستند مقدم', 400);
        }

        const allowedFields = getWritableFields(docType);
        const safeData = pickAllowedFields(req.body, allowedFields);

        Object.assign(existingDoc, safeData, { updatedBy: req.userID });
        await existingDoc.save();

        res.json({
            success: true,
            message: 'Document updated successfully | تم تحديث المستند بنجاح',
            data: existingDoc.toObject()
        });
    }));

    // DELETE /api/:doctype/:id - Delete document (soft or hard)
    router.delete('/:id', asyncHandler(async (req, res) => {
        checkPermission(req, docType, PERMISSION_LEVELS.DELETE);

        const id = sanitizeObjectId(req.params.id);
        if (!id) {
            throw new CustomException('Invalid ID | معرف غير صالح', 400);
        }

        const query = {
            _id: id,
            firmId: req.firmId
        };

        const doc = await Model.findOne(query);
        if (!doc) {
            throw new CustomException('Document not found | المستند غير موجود', 404);
        }

        // Check if document is submitted (cannot delete)
        if (docType.is_submittable && doc.docstatus === 1) {
            throw new CustomException(
                'Cannot delete submitted document. Cancel first. | لا يمكن حذف مستند مقدم. قم بالإلغاء أولاً',
                400
            );
        }

        // Soft delete if enabled
        if (docType.allow_trash !== false) {
            doc.isDeleted = true;
            doc.deletedAt = new Date();
            doc.deletedBy = req.userID;
            await doc.save();
        } else {
            await Model.deleteOne({ _id: id });
        }

        res.json({
            success: true,
            message: 'Document deleted successfully | تم حذف المستند بنجاح'
        });
    }));

    // POST /api/:doctype/:id/submit - Submit document (if submittable)
    if (docType.is_submittable) {
        router.post('/:id/submit', asyncHandler(async (req, res) => {
            checkPermission(req, docType, PERMISSION_LEVELS.SUBMIT);

            const id = sanitizeObjectId(req.params.id);
            if (!id) {
                throw new CustomException('Invalid ID | معرف غير صالح', 400);
            }

            const doc = await Model.findOne({
                _id: id,
                firmId: req.firmId,
                isDeleted: { $ne: true }
            });

            if (!doc) {
                throw new CustomException('Document not found | المستند غير موجود', 404);
            }

            if (doc.docstatus !== 0) {
                throw new CustomException(
                    'Document must be in draft status to submit | يجب أن يكون المستند في حالة مسودة للتقديم',
                    400
                );
            }

            doc.docstatus = 1;
            doc.updatedBy = req.userID;
            await doc.save();

            res.json({
                success: true,
                message: 'Document submitted successfully | تم تقديم المستند بنجاح',
                data: doc.toObject()
            });
        }));

        // POST /api/:doctype/:id/cancel - Cancel document
        router.post('/:id/cancel', asyncHandler(async (req, res) => {
            checkPermission(req, docType, PERMISSION_LEVELS.CANCEL);

            const id = sanitizeObjectId(req.params.id);
            if (!id) {
                throw new CustomException('Invalid ID | معرف غير صالح', 400);
            }

            const doc = await Model.findOne({
                _id: id,
                firmId: req.firmId,
                isDeleted: { $ne: true }
            });

            if (!doc) {
                throw new CustomException('Document not found | المستند غير موجود', 404);
            }

            if (doc.docstatus !== 1) {
                throw new CustomException(
                    'Only submitted documents can be cancelled | يمكن إلغاء المستندات المقدمة فقط',
                    400
                );
            }

            doc.docstatus = 2;
            doc.updatedBy = req.userID;
            await doc.save();

            res.json({
                success: true,
                message: 'Document cancelled successfully | تم إلغاء المستند بنجاح',
                data: doc.toObject()
            });
        }));
    }

    // POST /api/:doctype/bulk-delete - Bulk delete
    router.post('/bulk-delete', asyncHandler(async (req, res) => {
        checkPermission(req, docType, PERMISSION_LEVELS.DELETE);

        const { ids } = req.body;
        if (!Array.isArray(ids) || ids.length === 0) {
            throw new CustomException('IDs array is required | مصفوفة المعرفات مطلوبة', 400);
        }

        const sanitizedIds = ids.map(id => sanitizeObjectId(id)).filter(Boolean);
        if (sanitizedIds.length === 0) {
            throw new CustomException('No valid IDs provided | لم يتم توفير معرفات صالحة', 400);
        }

        const query = {
            _id: { $in: sanitizedIds },
            firmId: req.firmId
        };

        // Don't allow bulk delete of submitted documents
        if (docType.is_submittable) {
            query.docstatus = { $ne: 1 };
        }

        let result;
        if (docType.allow_trash !== false) {
            result = await Model.updateMany(query, {
                $set: {
                    isDeleted: true,
                    deletedAt: new Date(),
                    deletedBy: req.userID
                }
            });
        } else {
            result = await Model.deleteMany(query);
        }

        res.json({
            success: true,
            message: `${result.modifiedCount || result.deletedCount} documents deleted | تم حذف ${result.modifiedCount || result.deletedCount} مستند`,
            data: { count: result.modifiedCount || result.deletedCount }
        });
    }));

    // GET /api/:doctype/count - Count documents
    router.get('/count', asyncHandler(async (req, res) => {
        checkPermission(req, docType, PERMISSION_LEVELS.READ);

        const { filters } = req.query;
        const query = buildQuery(req, docType, filters);

        const count = await Model.countDocuments(query);

        res.json({
            success: true,
            data: { count }
        });
    }));

    return router;
}

/**
 * Check if user has permission for an operation
 */
function checkPermission(req, docType, level) {
    const permissions = docType.permissions || [];
    const userRole = req.userRole || 'User';

    // System Administrator has all permissions
    if (userRole === 'System Administrator' || userRole === 'superAdmin') {
        return true;
    }

    // Check if any permission rule grants this level
    const hasPermission = permissions.some(perm => {
        // Check role match
        if (perm.role && perm.role !== userRole) {
            return false;
        }
        // Check permission level
        return perm[level] === 1 || perm[level] === true;
    });

    if (!hasPermission) {
        throw new CustomException(
            `You don't have ${level} permission for ${docType.name} | ليس لديك إذن ${level} لـ ${docType.name}`,
            403
        );
    }

    return true;
}

/**
 * Build query with filters and search
 */
function buildQuery(req, docType, filtersJson, searchTerm) {
    const query = {
        firmId: req.firmId
    };

    // Add soft delete filter
    if (docType.allow_trash !== false) {
        query.isDeleted = { $ne: true };
    }

    // Parse filters JSON
    if (filtersJson) {
        try {
            const filters = typeof filtersJson === 'string' ? JSON.parse(filtersJson) : filtersJson;

            for (const [field, value] of Object.entries(filters)) {
                // Skip firmId override attempts
                if (field === 'firmId') continue;

                // Handle operators
                if (typeof value === 'object' && value !== null) {
                    const operators = {};
                    for (const [op, opValue] of Object.entries(value)) {
                        switch (op) {
                            case '$eq':
                            case '$ne':
                            case '$gt':
                            case '$gte':
                            case '$lt':
                            case '$lte':
                            case '$in':
                            case '$nin':
                            case '$regex':
                                operators[op] = opValue;
                                break;
                            default:
                                // Ignore unknown operators for security
                                break;
                        }
                    }
                    if (Object.keys(operators).length > 0) {
                        query[field] = operators;
                    }
                } else {
                    query[field] = value;
                }
            }
        } catch (e) {
            // Invalid JSON, ignore filters
        }
    }

    // Add search term for search_fields
    if (searchTerm && docType.search_fields) {
        const searchFields = docType.search_fields.split(',').map(f => f.trim());
        const searchRegex = new RegExp(searchTerm, 'i');
        query.$or = searchFields.map(field => ({ [field]: searchRegex }));
    }

    return query;
}

/**
 * Get list of writable field names
 */
function getWritableFields(docType) {
    const fields = docType.fields || [];
    const writable = [];

    for (const field of fields) {
        // Skip read-only and layout fields
        if (field.read_only ||
            field.fieldtype === 'Section Break' ||
            field.fieldtype === 'Column Break' ||
            field.fieldtype === 'HTML' ||
            field.fieldtype === 'Button') {
            continue;
        }
        writable.push(field.fieldname);
    }

    // Add naming_series if applicable
    if (docType.autoname === 'naming_series:') {
        writable.push('naming_series');
    }

    return writable;
}

/**
 * Parse sort string to MongoDB sort object
 */
function parseSortString(sortStr) {
    const sortObj = {};
    const fields = sortStr.split(',');

    for (const field of fields) {
        const trimmed = field.trim();
        if (trimmed.startsWith('-')) {
            sortObj[trimmed.substring(1)] = -1;
        } else {
            sortObj[trimmed] = 1;
        }
    }

    return sortObj;
}

/**
 * Convert DocType name to route name
 */
function toRouteName(name) {
    // "Sales Invoice" -> "sales-invoice"
    return name.toLowerCase().replace(/\s+/g, '-');
}

/**
 * Mount all registered DocType routes
 * @param {express.Application} app - Express app
 * @param {string} prefix - API prefix (default: '/api/resource')
 */
function mountAllRoutes(app, prefix = '/api/resource') {
    const docTypes = registry.getAllDocTypes();

    for (const name of docTypes) {
        const docType = registry.getDocType(name);

        // Skip child tables
        if (docType.isChildTable) continue;

        // Skip internal DocTypes
        if (docType.issingle || docType.is_virtual) continue;

        const routeName = toRouteName(name);
        const router = generateRoutes(name);

        app.use(`${prefix}/${routeName}`, router);
        logger.info(`[DocType] Mounted route`, { prefix, routeName, path: `${prefix}/${routeName}` });
    }
}

module.exports = {
    generateRoutes,
    mountAllRoutes,
    checkPermission,
    PERMISSION_LEVELS
};
