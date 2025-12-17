/**
 * MFA Enforcement Middleware
 *
 * NCA ECC-2:2024 Compliance: Section 2-3-1
 * Enforces Multi-Factor Authentication for privileged roles
 *
 * Privileged roles that require MFA:
 * - owner: Full system access
 * - admin: Administrative access
 * - partner: Partnership-level access
 */

// Roles that require MFA to be enabled
const PRIVILEGED_ROLES = ['owner', 'admin', 'partner'];

// Routes that are exempt from MFA enforcement (setup routes)
const MFA_EXEMPT_ROUTES = [
  '/api/auth/mfa/setup',
  '/api/auth/mfa/enable',
  '/api/auth/mfa/verify-setup',
  '/api/auth/logout',
  '/api/users/me',
  '/api/users/profile',
];

/**
 * Check if MFA is enforced for this role
 * @param {string} role - User role
 * @returns {boolean} - Whether MFA is required
 */
const isMFARequiredForRole = (role) => {
  return PRIVILEGED_ROLES.includes(role);
};

/**
 * Middleware to enforce MFA for privileged users
 *
 * Usage:
 * app.use('/api', authenticate, enforceMFA);
 *
 * Or for specific routes:
 * router.get('/sensitive', authenticate, enforceMFA, sensitiveController);
 */
const enforceMFA = (req, res, next) => {
  try {
    // Skip if no user (should be caught by authenticate middleware)
    if (!req.user) {
      return next();
    }

    const userRole = req.user.role;
    const mfaEnabled = req.user.mfaEnabled || req.user.twoFactorEnabled || false;
    const currentPath = req.originalUrl || req.path;

    // Check if route is exempt from MFA enforcement
    const isExemptRoute = MFA_EXEMPT_ROUTES.some(route => currentPath.startsWith(route));
    if (isExemptRoute) {
      return next();
    }

    // Check if user role requires MFA
    if (!isMFARequiredForRole(userRole)) {
      return next();
    }

    // Check if MFA is enabled for privileged user
    if (!mfaEnabled) {
      return res.status(403).json({
        success: false,
        error: 'يجب تفعيل المصادقة الثنائية للوصول إلى هذه الميزة',
        error_en: 'Multi-factor authentication required for privileged access',
        code: 'MFA_REQUIRED',
        details: {
          role: userRole,
          mfaEnabled: false,
          setupUrl: '/api/auth/mfa/setup',
          requirement: 'NCA ECC-2:2024 Section 2-3-1',
        },
      });
    }

    // MFA is enabled, proceed
    next();
  } catch (error) {
    console.error('MFA enforcement error:', error.message);
    return res.status(500).json({
      success: false,
      error: 'خطأ في التحقق من المصادقة الثنائية',
      error_en: 'MFA verification error',
    });
  }
};

/**
 * Middleware to require MFA verification for sensitive operations
 * This checks if the user has recently verified their MFA
 *
 * Usage:
 * router.post('/transfer', authenticate, requireRecentMFA, transferController);
 */
const requireRecentMFA = (req, res, next) => {
  try {
    if (!req.user) {
      return next();
    }

    const mfaVerifiedAt = req.user.mfaVerifiedAt || req.session?.mfaVerifiedAt;
    const MFA_VERIFICATION_WINDOW = 15 * 60 * 1000; // 15 minutes

    if (!mfaVerifiedAt) {
      return res.status(403).json({
        success: false,
        error: 'يجب التحقق من المصادقة الثنائية لهذه العملية',
        error_en: 'MFA verification required for this operation',
        code: 'MFA_VERIFICATION_REQUIRED',
        requiresVerification: true,
      });
    }

    const timeSinceVerification = Date.now() - new Date(mfaVerifiedAt).getTime();

    if (timeSinceVerification > MFA_VERIFICATION_WINDOW) {
      return res.status(403).json({
        success: false,
        error: 'انتهت صلاحية التحقق من المصادقة الثنائية',
        error_en: 'MFA verification has expired',
        code: 'MFA_VERIFICATION_EXPIRED',
        requiresVerification: true,
        expiredMinutesAgo: Math.floor(timeSinceVerification / 60000),
      });
    }

    next();
  } catch (error) {
    console.error('Recent MFA check error:', error.message);
    return res.status(500).json({
      success: false,
      error: 'خطأ في التحقق من المصادقة الثنائية',
      error_en: 'MFA verification check error',
    });
  }
};

/**
 * Check MFA status for a user (utility function)
 * @param {Object} user - User object
 * @returns {Object} - MFA status details
 */
const getMFAStatus = (user) => {
  const isPrivileged = isMFARequiredForRole(user.role);
  const mfaEnabled = user.mfaEnabled || user.twoFactorEnabled || false;

  return {
    role: user.role,
    isPrivilegedRole: isPrivileged,
    mfaEnabled,
    mfaRequired: isPrivileged,
    compliant: !isPrivileged || mfaEnabled,
    message: isPrivileged && !mfaEnabled
      ? 'MFA required for privileged role but not enabled'
      : 'Compliant',
  };
};

module.exports = {
  enforceMFA,
  requireRecentMFA,
  getMFAStatus,
  isMFARequiredForRole,
  PRIVILEGED_ROLES,
};
