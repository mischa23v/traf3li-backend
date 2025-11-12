/**
 * Authorization middleware for role-based access control (RBAC)
 * 
 * Usage:
 * router.get('/admin/users', authenticate, authorize('admin'), getAllUsers);
 * router.get('/cases/:id', authenticate, authorize('lawyer', 'client'), getCase);
 */

/**
 * Check if user has required role
 * @param {...string} allowedRoles - Roles that can access this route
 * @returns {Function} - Express middleware
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    try {
      // Check if user exists (should be set by authenticate middleware)
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'غير مصرح - يجب تسجيل الدخول أولاً',
          error_en: 'Unauthorized - Authentication required',
          code: 'AUTH_REQUIRED',
        });
      }

      // Check if user has required role
      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          error: 'غير مصرح - ليس لديك صلاحية للوصول',
          error_en: 'Forbidden - Insufficient permissions',
          code: 'INSUFFICIENT_PERMISSIONS',
          required: allowedRoles,
          current: req.user.role,
        });
      }

      // User has required role, proceed
      next();
    } catch (error) {
      console.error('❌ Authorization error:', error.message);
      return res.status(500).json({
        success: false,
        error: 'خطأ في التحقق من الصلاحيات',
        error_en: 'Authorization check failed',
      });
    }
  };
};

/**
 * Check if user is admin
 * Shorthand for authorize('admin')
 */
const requireAdmin = () => {
  return authorize('admin');
};

/**
 * Check if user is lawyer
 * Shorthand for authorize('lawyer')
 */
const requireLawyer = () => {
  return authorize('lawyer');
};

/**
 * Check if user is client
 * Shorthand for authorize('client')
 */
const requireClient = () => {
  return authorize('client');
};

/**
 * Check if user is lawyer or admin
 * Common combination for management routes
 */
const requireLawyerOrAdmin = () => {
  return authorize('lawyer', 'admin');
};

/**
 * Check specific permission
 * More granular than role-based (future enhancement)
 * @param {string} permission - Permission name
 * @returns {Function} - Express middleware
 */
const checkPermission = (permission) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'غير مصرح - يجب تسجيل الدخول أولاً',
          error_en: 'Unauthorized - Authentication required',
        });
      }

      // Permission mapping (can be moved to database later)
      const permissions = {
        admin: [
          'view_all_users',
          'delete_users',
          'ban_users',
          'verify_lawyers',
          'view_audit_logs',
          'system_settings',
          'view_all_cases',
          'view_all_invoices',
          'manage_payments',
          'export_data',
        ],
        lawyer: [
          'view_own_cases',
          'create_cases',
          'update_own_cases',
          'upload_documents',
          'view_own_documents',
          'create_invoices',
          'view_own_invoices',
          'track_time',
          'message_clients',
          'view_own_clients',
        ],
        client: [
          'view_own_cases',
          'view_own_documents',
          'view_own_invoices',
          'make_payments',
          'message_lawyer',
          'upload_client_documents',
        ],
      };

      const userPermissions = permissions[req.user.role] || [];

      if (!userPermissions.includes(permission)) {
        return res.status(403).json({
          success: false,
          error: 'غير مصرح - ليس لديك صلاحية لهذا الإجراء',
          error_en: 'Forbidden - You do not have permission for this action',
          code: 'PERMISSION_DENIED',
          required: permission,
        });
      }

      next();
    } catch (error) {
      console.error('❌ Permission check error:', error.message);
      return res.status(500).json({
        success: false,
        error: 'خطأ في التحقق من الصلاحيات',
        error_en: 'Permission check failed',
      });
    }
  };
};

/**
 * Check if user account is active
 * Prevents suspended/banned users from accessing
 */
const requireActiveAccount = () => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'غير مصرح - يجب تسجيل الدخول أولاً',
          error_en: 'Unauthorized - Authentication required',
        });
      }

      // Check account status
      if (req.user.status === 'suspended') {
        return res.status(403).json({
          success: false,
          error: 'حسابك معلق - يرجى التواصل مع الدعم',
          error_en: 'Your account is suspended - Please contact support',
          code: 'ACCOUNT_SUSPENDED',
        });
      }

      if (req.user.status === 'banned') {
        return res.status(403).json({
          success: false,
          error: 'حسابك محظور',
          error_en: 'Your account is banned',
          code: 'ACCOUNT_BANNED',
        });
      }

      if (req.user.status === 'deleted') {
        return res.status(403).json({
          success: false,
          error: 'حسابك محذوف',
          error_en: 'Your account is deleted',
          code: 'ACCOUNT_DELETED',
        });
      }

      next();
    } catch (error) {
      console.error('❌ Account status check error:', error.message);
      return res.status(500).json({
        success: false,
        error: 'خطأ في التحقق من حالة الحساب',
        error_en: 'Account status check failed',
      });
    }
  };
};

/**
 * Check if lawyer is verified
 * Some routes should only be accessible to verified lawyers
 */
const requireVerifiedLawyer = () => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'غير مصرح - يجب تسجيل الدخول أولاً',
          error_en: 'Unauthorized - Authentication required',
        });
      }

      if (req.user.role !== 'lawyer') {
        return res.status(403).json({
          success: false,
          error: 'هذه الصفحة للمحامين فقط',
          error_en: 'This page is for lawyers only',
          code: 'NOT_LAWYER',
        });
      }

      if (!req.user.isVerified) {
        return res.status(403).json({
          success: false,
          error: 'حسابك غير موثق - يجب توثيق حسابك للوصول لهذه الميزة',
          error_en: 'Your account is not verified - Verification required for this feature',
          code: 'LAWYER_NOT_VERIFIED',
        });
      }

      next();
    } catch (error) {
      console.error('❌ Lawyer verification check error:', error.message);
      return res.status(500).json({
        success: false,
        error: 'خطأ في التحقق من توثيق المحامي',
        error_en: 'Lawyer verification check failed',
      });
    }
  };
};

module.exports = {
  authorize,
  requireAdmin,
  requireLawyer,
  requireClient,
  requireLawyerOrAdmin,
  checkPermission,
  requireActiveAccount,
  requireVerifiedLawyer,
};
