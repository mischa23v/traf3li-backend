const CaseAuditService = require('../services/caseAuditService');

/**
 * Case Audit Middleware
 * Automatically logs audit entries for case-related operations
 *
 * Usage:
 * router.patch('/:caseId', authenticate, caseAuditMiddleware('case', ['status', 'title']), updateCase);
 * router.post('/:caseId/notes', authenticate, caseAuditMiddleware('note'), addNote);
 */

/**
 * Create case audit middleware
 * @param {string} resource - Resource type (case, document, hearing, note, claim, timeline)
 * @param {Array<string>} fieldsToTrack - Optional list of fields to track for updates (null = all fields)
 * @returns {Function} - Express middleware
 */
const caseAuditMiddleware = (resource, fieldsToTrack = null) => {
  return async (req, res, next) => {
    // Store original json method
    const originalJson = res.json.bind(res);

    // Get the before state if it exists (should be set by previous middleware)
    const auditBefore = req.auditBefore || req.existingDocument;

    res.json = async function(data) {
      try {
        // Determine action from HTTP method
        let action;
        switch (req.method) {
          case 'POST':
            action = 'create';
            break;
          case 'PUT':
          case 'PATCH':
            action = 'update';
            break;
          case 'DELETE':
            action = 'delete';
            break;
          case 'GET':
            action = 'view';
            break;
          default:
            action = 'update';
        }

        // Only log successful operations
        if (res.statusCode >= 200 && res.statusCode < 300) {
          // Extract data from response - handle various response formats
          const responseData = data?.data || data?.case || data?.document || data;

          // Determine resourceId and caseId
          const resourceId =
            req.params.noteId ||
            req.params.hearingId ||
            req.params.claimId ||
            req.params.eventId ||
            req.params.docId ||
            req.params.documentId ||
            responseData?._id ||
            req.params._id ||
            req.params.id;

          const caseId =
            req.params.caseId ||
            req.params._id ||
            responseData?.caseId ||
            responseData?.case;

          // Get user ID from request
          const userId = req.userID || req.user?._id || req.user?.id;

          if (caseId && resourceId && userId) {
            // Prepare changes based on action type
            let changes = null;

            if (action === 'update') {
              changes = CaseAuditService.calculateChanges(
                auditBefore ? JSON.parse(JSON.stringify(auditBefore)) : null,
                responseData,
                fieldsToTrack
              );
            } else if (action === 'create') {
              changes = { after: sanitizeForAudit(responseData) };
            } else if (action === 'delete') {
              changes = { before: sanitizeForAudit(auditBefore) };
            }

            // Log the audit entry asynchronously (don't wait)
            CaseAuditService.log({
              userId,
              action,
              resource,
              resourceId,
              caseId,
              changes,
              metadata: {
                ip: req.ip || req.headers['x-forwarded-for']?.split(',')[0] || 'unknown',
                userAgent: req.get('user-agent') || 'unknown'
              }
            }).catch(err => {
              console.error('❌ Case audit middleware error:', err.message);
            });
          }
        }
      } catch (error) {
        console.error('❌ Case audit middleware error:', error.message);
      }

      return originalJson(data);
    };

    next();
  };
};

/**
 * Middleware to load existing document for audit comparison
 * Use before caseAuditMiddleware for update operations
 * @param {string} modelName - The Mongoose model name to query
 * @returns {Function} - Express middleware
 */
const loadExistingForAudit = (modelName) => {
  return async (req, res, next) => {
    try {
      const mongoose = require('mongoose');
      const Model = mongoose.model(modelName);

      const id = req.params._id || req.params.id || req.params.caseId;

      if (id) {
        const existing = await Model.findById(id).lean();
        if (existing) {
          req.auditBefore = existing;
          req.existingDocument = existing;
        }
      }
    } catch (error) {
      console.error('❌ loadExistingForAudit error:', error.message);
    }
    next();
  };
};

/**
 * Sanitize object for audit log (remove sensitive/unnecessary fields)
 * @param {Object} obj - Object to sanitize
 * @returns {Object} - Sanitized object
 */
const sanitizeForAudit = (obj) => {
  if (!obj) return null;

  const sanitized = { ...obj };

  // Remove internal mongoose fields
  delete sanitized.__v;
  delete sanitized.id;

  // Remove potentially large nested arrays that don't need full tracking
  // (they have their own audit entries)
  const nestedArrays = ['documents', 'hearings', 'notes', 'claims', 'timeline', 'versions'];
  nestedArrays.forEach(key => {
    if (Array.isArray(sanitized[key])) {
      sanitized[key] = `[${sanitized[key].length} items]`;
    }
  });

  return sanitized;
};

module.exports = {
  caseAuditMiddleware,
  loadExistingForAudit
};
