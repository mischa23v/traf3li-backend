const mongoose = require('mongoose');

/**
 * Ownership check middleware
 * Ensures users can only access resources they own
 * 
 * Usage:
 * router.get('/cases/:id', authenticate, checkOwnership('Case'), getCase);
 * router.put('/invoices/:id', authenticate, checkOwnership('Invoice', 'invoiceId'), updateInvoice);
 */

/**
 * Check if user owns the resource
 * @param {string} modelName - Name of Mongoose model (e.g., 'Case', 'Invoice')
 * @param {string} paramName - Name of URL parameter containing resource ID (default: 'id')
 * @param {object} options - Additional options
 * @returns {Function} - Express middleware
 */
const checkOwnership = (modelName, paramName = 'id', options = {}) => {
  return async (req, res, next) => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'غير مصرح - يجب تسجيل الدخول أولاً',
          error_en: 'Unauthorized - Authentication required',
        });
      }

      // Get resource ID from URL params
      const resourceId = req.params[paramName];

      if (!resourceId) {
        return res.status(400).json({
          success: false,
          error: 'معرف المورد مفقود',
          error_en: 'Resource ID missing',
        });
      }

      // Validate resource ID format
      if (!mongoose.Types.ObjectId.isValid(resourceId)) {
        return res.status(400).json({
          success: false,
          error: 'معرف المورد غير صالح',
          error_en: 'Invalid resource ID',
        });
      }

      // Get model
      const Model = mongoose.model(modelName);

      // Find resource
      const resource = await Model.findById(resourceId);

      if (!resource) {
        return res.status(404).json({
          success: false,
          error: 'المورد غير موجود',
          error_en: 'Resource not found',
        });
      }

      // Admin can access everything
      if (req.user.role === 'admin') {
        req.resource = resource; // Attach resource to request
        return next();
      }

      // Check ownership based on model type
      const isOwner = checkResourceOwnership(resource, req.user, modelName, options);

      if (!isOwner) {
        return res.status(403).json({
          success: false,
          error: 'غير مصرح - ليس لديك صلاحية للوصول لهذا المورد',
          error_en: 'Forbidden - You do not have access to this resource',
          code: 'NOT_RESOURCE_OWNER',
        });
      }

      // User owns resource, attach it to request for use in route handler
      req.resource = resource;
      next();
    } catch (error) {
      console.error('❌ Ownership check error:', error.message);
      return res.status(500).json({
        success: false,
        error: 'خطأ في التحقق من ملكية المورد',
        error_en: 'Ownership check failed',
      });
    }
  };
};

/**
 * Check if user owns the resource
 * Different models have different ownership patterns
 */
const checkResourceOwnership = (resource, user, modelName, options) => {
  const userId = user._id.toString();

  switch (modelName) {
    case 'Case':
      // Case can be owned by lawyer or client
      return (
        resource.lawyerId?.toString() === userId ||
        resource.clientId?.toString() === userId
      );

    case 'Invoice':
      // Invoice can be owned by lawyer (creator) or client (payer)
      return (
        resource.lawyerId?.toString() === userId ||
        resource.clientId?.toString() === userId
      );

    case 'Document':
      // Document can be owned by uploader or case participants
      return (
        resource.uploadedBy?.toString() === userId ||
        resource.caseId?.lawyerId?.toString() === userId ||
        resource.caseId?.clientId?.toString() === userId
      );

    case 'TimeEntry':
      // Time entry belongs to lawyer who created it
      return resource.lawyerId?.toString() === userId;

    case 'Expense':
      // Expense belongs to lawyer who created it
      return resource.lawyerId?.toString() === userId;

    case 'Order':
      // Order can be owned by buyer or seller
      return (
        resource.buyerId?.toString() === userId ||
        resource.sellerId?.toString() === userId
      );

    case 'Gig':
      // Gig belongs to seller
      return resource.userId?.toString() === userId;

    case 'Job':
      // Job belongs to client who posted it
      return resource.userId?.toString() === userId;

    case 'Proposal':
      // Proposal can be owned by lawyer (creator) or client (job owner)
      return (
        resource.lawyerId?.toString() === userId ||
        resource.jobId?.userId?.toString() === userId
      );

    case 'Message':
      // Message can be accessed by sender or receiver
      return (
        resource.senderId?.toString() === userId ||
        resource.receiverId?.toString() === userId
      );

    case 'Conversation':
      // Conversation participants
      return resource.participants?.some(p => p.toString() === userId);

    case 'Notification':
      // Notification belongs to recipient
      return resource.recipientId?.toString() === userId;

    case 'User':
      // User can only access their own profile (unless admin)
      return resource._id.toString() === userId;

    default:
      // Default: check if resource has userId field
      if (resource.userId) {
        return resource.userId.toString() === userId;
      }
      // If no userId field, check custom field from options
      if (options.ownerField && resource[options.ownerField]) {
        return resource[options.ownerField].toString() === userId;
      }
      // Cannot determine ownership
      console.warn(`⚠️  Unknown model for ownership check: ${modelName}`);
      return false;
  }
};

/**
 * Check case access (used frequently)
 * Shorthand for checkOwnership('Case')
 */
const checkCaseAccess = () => {
  return checkOwnership('Case');
};

/**
 * Check document access
 * Shorthand for checkOwnership('Document')
 */
const checkDocumentAccess = () => {
  return checkOwnership('Document');
};

/**
 * Check invoice access
 * Shorthand for checkOwnership('Invoice')
 */
const checkInvoiceAccess = () => {
  return checkOwnership('Invoice');
};

/**
 * Check if user can modify resource
 * More restrictive than view - only creator can modify
 */
const checkModifyPermission = (modelName, paramName = 'id') => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'غير مصرح - يجب تسجيل الدخول أولاً',
          error_en: 'Unauthorized - Authentication required',
        });
      }

      const resourceId = req.params[paramName];
      if (!resourceId || !mongoose.Types.ObjectId.isValid(resourceId)) {
        return res.status(400).json({
          success: false,
          error: 'معرف المورد غير صالح',
          error_en: 'Invalid resource ID',
        });
      }

      const Model = mongoose.model(modelName);
      const resource = await Model.findById(resourceId);

      if (!resource) {
        return res.status(404).json({
          success: false,
          error: 'المورد غير موجود',
          error_en: 'Resource not found',
        });
      }

      // Admin can modify everything
      if (req.user.role === 'admin') {
        req.resource = resource;
        return next();
      }

      // Check if user is the creator
      const userId = req.user._id.toString();
      const creatorField = resource.createdBy || resource.userId || resource.lawyerId;

      if (!creatorField || creatorField.toString() !== userId) {
        return res.status(403).json({
          success: false,
          error: 'غير مصرح - يمكنك فقط تعديل المحتوى الذي أنشأته',
          error_en: 'Forbidden - You can only modify resources you created',
          code: 'NOT_CREATOR',
        });
      }

      req.resource = resource;
      next();
    } catch (error) {
      console.error('❌ Modify permission check error:', error.message);
      return res.status(500).json({
        success: false,
        error: 'خطأ في التحقق من صلاحية التعديل',
        error_en: 'Modify permission check failed',
      });
    }
  };
};

module.exports = {
  checkOwnership,
  checkCaseAccess,
  checkDocumentAccess,
  checkInvoiceAccess,
  checkModifyPermission,
};
