/**
 * Authorization Middleware Unit Tests
 * Tests for role-based access control (RBAC) and permission checking
 */

const {
  authorize,
  requireAdmin,
  requireLawyer,
  requireClient,
  requireLawyerOrAdmin,
  checkPermission,
  requireActiveAccount,
  requireVerifiedLawyer,
} = require('../../../src/middlewares/authorize.middleware');

// Mock logger to prevent console output during tests
jest.mock('../../../src/utils/logger', () => ({
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

// Local test utilities (no database required)
const testUtils = {
  mockRequest: (overrides = {}) => ({
    body: {},
    params: {},
    query: {},
    headers: {},
    user: null,
    ip: '127.0.0.1',
    ...overrides,
  }),

  mockResponse: () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    res.setHeader = jest.fn().mockReturnValue(res);
    res.cookie = jest.fn().mockReturnValue(res);
    res.locals = {};
    return res;
  },

  mockNext: () => jest.fn(),
};

describe('Authorization Middleware Unit Tests', () => {
  let req, res, next;

  beforeEach(() => {
    req = testUtils.mockRequest();
    res = testUtils.mockResponse();
    next = testUtils.mockNext();
  });

  // ============ BASIC ROLE AUTHORIZATION ============

  describe('authorize() - Basic Role Checking', () => {
    describe('Admin role check', () => {
      it('should allow admin users to pass authorize("admin")', () => {
        req.user = {
          _id: '123',
          role: 'admin',
          email: 'admin@test.com',
        };

        const middleware = authorize('admin');
        middleware(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
      });

      it('should allow admin users through requireAdmin()', () => {
        req.user = {
          _id: '123',
          role: 'admin',
          email: 'admin@test.com',
        };

        const middleware = requireAdmin();
        middleware(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
      });
    });

    describe('Non-admin rejection', () => {
      it('should reject non-admin users with 403', () => {
        req.user = {
          _id: '123',
          role: 'client',
          email: 'client@test.com',
        };

        const middleware = authorize('admin');
        middleware(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({
          success: false,
          error: 'غير مصرح - ليس لديك صلاحية للوصول',
          error_en: 'Forbidden - Insufficient permissions',
          code: 'INSUFFICIENT_PERMISSIONS',
          required: ['admin'],
          current: 'client',
        });
        expect(next).not.toHaveBeenCalled();
      });

      it('should reject lawyer users trying to access admin-only routes', () => {
        req.user = {
          _id: '456',
          role: 'lawyer',
          email: 'lawyer@test.com',
        };

        const middleware = authorize('admin');
        middleware(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            code: 'INSUFFICIENT_PERMISSIONS',
            required: ['admin'],
            current: 'lawyer',
          })
        );
        expect(next).not.toHaveBeenCalled();
      });
    });

    describe('Lawyer role check', () => {
      it('should allow lawyer users to pass authorize("lawyer")', () => {
        req.user = {
          _id: '456',
          role: 'lawyer',
          email: 'lawyer@test.com',
        };

        const middleware = authorize('lawyer');
        middleware(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
      });

      it('should allow lawyer users through requireLawyer()', () => {
        req.user = {
          _id: '456',
          role: 'lawyer',
          email: 'lawyer@test.com',
        };

        const middleware = requireLawyer();
        middleware(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
      });

      it('should reject non-lawyer users with 403', () => {
        req.user = {
          _id: '123',
          role: 'client',
          email: 'client@test.com',
        };

        const middleware = authorize('lawyer');
        middleware(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            code: 'INSUFFICIENT_PERMISSIONS',
            current: 'client',
          })
        );
        expect(next).not.toHaveBeenCalled();
      });
    });

    describe('Client role check', () => {
      it('should allow client users to pass authorize("client")', () => {
        req.user = {
          _id: '789',
          role: 'client',
          email: 'client@test.com',
        };

        const middleware = authorize('client');
        middleware(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
      });

      it('should allow client users through requireClient()', () => {
        req.user = {
          _id: '789',
          role: 'client',
          email: 'client@test.com',
        };

        const middleware = requireClient();
        middleware(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
      });

      it('should reject non-client users with 403', () => {
        req.user = {
          _id: '456',
          role: 'lawyer',
          email: 'lawyer@test.com',
        };

        const middleware = authorize('client');
        middleware(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            code: 'INSUFFICIENT_PERMISSIONS',
            current: 'lawyer',
          })
        );
        expect(next).not.toHaveBeenCalled();
      });
    });
  });

  // ============ MULTIPLE ROLES ============

  describe('Multiple roles support', () => {
    it('should accept admin when authorize allows both admin and lawyer', () => {
      req.user = {
        _id: '123',
        role: 'admin',
        email: 'admin@test.com',
      };

      const middleware = authorize('admin', 'lawyer');
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should accept lawyer when authorize allows both admin and lawyer', () => {
      req.user = {
        _id: '456',
        role: 'lawyer',
        email: 'lawyer@test.com',
      };

      const middleware = authorize('admin', 'lawyer');
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should work with requireLawyerOrAdmin() helper', () => {
      req.user = {
        _id: '456',
        role: 'lawyer',
        email: 'lawyer@test.com',
      };

      const middleware = requireLawyerOrAdmin();
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should reject client when only admin and lawyer are allowed', () => {
      req.user = {
        _id: '789',
        role: 'client',
        email: 'client@test.com',
      };

      const middleware = authorize('admin', 'lawyer');
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'غير مصرح - ليس لديك صلاحية للوصول',
        error_en: 'Forbidden - Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
        required: ['admin', 'lawyer'],
        current: 'client',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should accept any of three roles when all are specified', () => {
      const middleware = authorize('admin', 'lawyer', 'client');

      // Test admin
      req.user = { role: 'admin' };
      middleware(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);

      // Test lawyer
      req.user = { role: 'lawyer' };
      next.mockClear();
      middleware(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);

      // Test client
      req.user = { role: 'client' };
      next.mockClear();
      middleware(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
    });
  });

  // ============ MISSING AUTHENTICATION ============

  describe('Missing authentication', () => {
    it('should reject requests without user object with 401', () => {
      req.user = null;

      const middleware = authorize('admin');
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'غير مصرح - يجب تسجيل الدخول أولاً',
        error_en: 'Unauthorized - Authentication required',
        code: 'AUTH_REQUIRED',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject when user is undefined', () => {
      delete req.user;

      const middleware = authorize('lawyer');
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          code: 'AUTH_REQUIRED',
        })
      );
      expect(next).not.toHaveBeenCalled();
    });
  });

  // ============ ACCOUNT STATUS CHECKS ============

  describe('requireActiveAccount() - Account status validation', () => {
    it('should allow active accounts to proceed', () => {
      req.user = {
        _id: '123',
        role: 'lawyer',
        status: 'active',
      };

      const middleware = requireActiveAccount();
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should reject suspended accounts with 403', () => {
      req.user = {
        _id: '123',
        role: 'lawyer',
        status: 'suspended',
      };

      const middleware = requireActiveAccount();
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'حسابك معلق - يرجى التواصل مع الدعم',
        error_en: 'Your account is suspended - Please contact support',
        code: 'ACCOUNT_SUSPENDED',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject banned accounts with 403', () => {
      req.user = {
        _id: '123',
        role: 'client',
        status: 'banned',
      };

      const middleware = requireActiveAccount();
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'حسابك محظور',
        error_en: 'Your account is banned',
        code: 'ACCOUNT_BANNED',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject deleted accounts with 403', () => {
      req.user = {
        _id: '123',
        role: 'admin',
        status: 'deleted',
      };

      const middleware = requireActiveAccount();
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'حسابك محذوف',
        error_en: 'Your account is deleted',
        code: 'ACCOUNT_DELETED',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject when user is not authenticated', () => {
      req.user = null;

      const middleware = requireActiveAccount();
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'غير مصرح - يجب تسجيل الدخول أولاً',
        error_en: 'Unauthorized - Authentication required',
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  // ============ PERMISSION CHECKING ============

  describe('checkPermission() - Permission-based validation', () => {
    describe('Admin permissions', () => {
      it('should allow admin to view all users', () => {
        req.user = {
          _id: '123',
          role: 'admin',
        };

        const middleware = checkPermission('view_all_users');
        middleware(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
      });

      it('should allow admin to delete users', () => {
        req.user = {
          _id: '123',
          role: 'admin',
        };

        const middleware = checkPermission('delete_users');
        middleware(req, res, next);

        expect(next).toHaveBeenCalled();
      });

      it('should allow admin to verify lawyers', () => {
        req.user = {
          _id: '123',
          role: 'admin',
        };

        const middleware = checkPermission('verify_lawyers');
        middleware(req, res, next);

        expect(next).toHaveBeenCalled();
      });

      it('should allow admin to view audit logs', () => {
        req.user = {
          _id: '123',
          role: 'admin',
        };

        const middleware = checkPermission('view_audit_logs');
        middleware(req, res, next);

        expect(next).toHaveBeenCalled();
      });

      it('should allow admin to manage integrations', () => {
        req.user = {
          _id: '123',
          role: 'admin',
        };

        const middleware = checkPermission('manage:integrations');
        middleware(req, res, next);

        expect(next).toHaveBeenCalled();
      });
    });

    describe('Lawyer permissions', () => {
      it('should allow lawyer to view own cases', () => {
        req.user = {
          _id: '456',
          role: 'lawyer',
        };

        const middleware = checkPermission('view_own_cases');
        middleware(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
      });

      it('should allow lawyer to create cases', () => {
        req.user = {
          _id: '456',
          role: 'lawyer',
        };

        const middleware = checkPermission('create_cases');
        middleware(req, res, next);

        expect(next).toHaveBeenCalled();
      });

      it('should allow lawyer to create invoices', () => {
        req.user = {
          _id: '456',
          role: 'lawyer',
        };

        const middleware = checkPermission('create_invoices');
        middleware(req, res, next);

        expect(next).toHaveBeenCalled();
      });

      it('should allow lawyer to manage integrations', () => {
        req.user = {
          _id: '456',
          role: 'lawyer',
        };

        const middleware = checkPermission('manage:integrations');
        middleware(req, res, next);

        expect(next).toHaveBeenCalled();
      });

      it('should reject lawyer from deleting users', () => {
        req.user = {
          _id: '456',
          role: 'lawyer',
        };

        const middleware = checkPermission('delete_users');
        middleware(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({
          success: false,
          error: 'غير مصرح - ليس لديك صلاحية لهذا الإجراء',
          error_en: 'Forbidden - You do not have permission for this action',
          code: 'PERMISSION_DENIED',
          required: 'delete_users',
        });
        expect(next).not.toHaveBeenCalled();
      });
    });

    describe('Client permissions', () => {
      it('should allow client to view own cases', () => {
        req.user = {
          _id: '789',
          role: 'client',
        };

        const middleware = checkPermission('view_own_cases');
        middleware(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
      });

      it('should allow client to view own documents', () => {
        req.user = {
          _id: '789',
          role: 'client',
        };

        const middleware = checkPermission('view_own_documents');
        middleware(req, res, next);

        expect(next).toHaveBeenCalled();
      });

      it('should allow client to make payments', () => {
        req.user = {
          _id: '789',
          role: 'client',
        };

        const middleware = checkPermission('make_payments');
        middleware(req, res, next);

        expect(next).toHaveBeenCalled();
      });

      it('should reject client from creating cases', () => {
        req.user = {
          _id: '789',
          role: 'client',
        };

        const middleware = checkPermission('create_cases');
        middleware(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({
          success: false,
          error: 'غير مصرح - ليس لديك صلاحية لهذا الإجراء',
          error_en: 'Forbidden - You do not have permission for this action',
          code: 'PERMISSION_DENIED',
          required: 'create_cases',
        });
        expect(next).not.toHaveBeenCalled();
      });

      it('should reject client from viewing audit logs', () => {
        req.user = {
          _id: '789',
          role: 'client',
        };

        const middleware = checkPermission('view_audit_logs');
        middleware(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(next).not.toHaveBeenCalled();
      });
    });

    describe('Unknown role permissions', () => {
      it('should reject user with unknown role', () => {
        req.user = {
          _id: '999',
          role: 'unknown_role',
        };

        const middleware = checkPermission('view_own_cases');
        middleware(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            code: 'PERMISSION_DENIED',
          })
        );
        expect(next).not.toHaveBeenCalled();
      });
    });

    it('should reject when user is not authenticated', () => {
      req.user = null;

      const middleware = checkPermission('view_own_cases');
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'غير مصرح - يجب تسجيل الدخول أولاً',
        error_en: 'Unauthorized - Authentication required',
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  // ============ VERIFIED LAWYER CHECK ============

  describe('requireVerifiedLawyer() - Verified lawyer validation', () => {
    it('should allow verified lawyer to proceed', () => {
      req.user = {
        _id: '456',
        role: 'lawyer',
        isVerified: true,
      };

      const middleware = requireVerifiedLawyer();
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should reject unverified lawyer with 403', () => {
      req.user = {
        _id: '456',
        role: 'lawyer',
        isVerified: false,
      };

      const middleware = requireVerifiedLawyer();
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'حسابك غير موثق - يجب توثيق حسابك للوصول لهذه الميزة',
        error_en:
          'Your account is not verified - Verification required for this feature',
        code: 'LAWYER_NOT_VERIFIED',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject non-lawyer users with 403', () => {
      req.user = {
        _id: '123',
        role: 'admin',
        isVerified: true,
      };

      const middleware = requireVerifiedLawyer();
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'هذه الصفحة للمحامين فقط',
        error_en: 'This page is for lawyers only',
        code: 'NOT_LAWYER',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject client users even if verified', () => {
      req.user = {
        _id: '789',
        role: 'client',
        isVerified: true,
      };

      const middleware = requireVerifiedLawyer();
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'هذه الصفحة للمحامين فقط',
        error_en: 'This page is for lawyers only',
        code: 'NOT_LAWYER',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject when user is not authenticated', () => {
      req.user = null;

      const middleware = requireVerifiedLawyer();
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'غير مصرح - يجب تسجيل الدخول أولاً',
        error_en: 'Unauthorized - Authentication required',
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  // ============ ERROR HANDLING ============

  describe('Error handling', () => {
    it('should handle errors in authorize middleware gracefully', () => {
      // Simulate an error by making req.user.role throw when accessed
      Object.defineProperty(req, 'user', {
        get() {
          throw new Error('Database error');
        },
      });

      const errorRes = testUtils.mockResponse();
      const middleware = authorize('admin');
      middleware(req, errorRes, next);

      expect(errorRes.status).toHaveBeenCalledWith(500);
      expect(errorRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'خطأ في التحقق من الصلاحيات',
        error_en: 'Authorization check failed',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle errors in checkPermission middleware gracefully', () => {
      // Simulate an error by making req.user.role throw when accessed
      Object.defineProperty(req, 'user', {
        get() {
          throw new Error('Database error');
        },
      });

      const errorRes = testUtils.mockResponse();
      const middleware = checkPermission('view_all_users');
      middleware(req, errorRes, next);

      expect(errorRes.status).toHaveBeenCalledWith(500);
      expect(errorRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'خطأ في التحقق من الصلاحيات',
        error_en: 'Permission check failed',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle errors in requireActiveAccount middleware gracefully', () => {
      // Simulate an error by making req.user.status throw when accessed
      Object.defineProperty(req, 'user', {
        get() {
          return {
            _id: '123',
            role: 'admin',
            get status() {
              throw new Error('Database error');
            },
          };
        },
      });

      const errorRes = testUtils.mockResponse();
      const middleware = requireActiveAccount();
      middleware(req, errorRes, next);

      expect(errorRes.status).toHaveBeenCalledWith(500);
      expect(errorRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'خطأ في التحقق من حالة الحساب',
        error_en: 'Account status check failed',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle errors in requireVerifiedLawyer middleware gracefully', () => {
      // Simulate an error by making req.user.role throw when accessed
      Object.defineProperty(req, 'user', {
        get() {
          return {
            _id: '456',
            get role() {
              throw new Error('Database error');
            },
          };
        },
      });

      const errorRes = testUtils.mockResponse();
      const middleware = requireVerifiedLawyer();
      middleware(req, errorRes, next);

      expect(errorRes.status).toHaveBeenCalledWith(500);
      expect(errorRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'خطأ في التحقق من توثيق المحامي',
        error_en: 'Lawyer verification check failed',
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  // ============ INTEGRATION SCENARIOS ============

  describe('Integration scenarios', () => {
    it('should work with chained middleware - authorize + requireActiveAccount', () => {
      req.user = {
        _id: '456',
        role: 'lawyer',
        status: 'active',
      };

      const authMiddleware = authorize('lawyer');
      const activeMiddleware = requireActiveAccount();

      // First check authorization
      authMiddleware(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);

      // Then check account status
      next.mockClear();
      activeMiddleware(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
    });

    it('should work with chained middleware - authorize + checkPermission', () => {
      req.user = {
        _id: '456',
        role: 'lawyer',
        status: 'active',
      };

      const authMiddleware = authorize('lawyer');
      const permissionMiddleware = checkPermission('create_cases');

      // First check authorization
      authMiddleware(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);

      // Then check permission
      next.mockClear();
      permissionMiddleware(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
    });

    it('should fail fast when user is not authenticated in chain', () => {
      req.user = null;

      const authMiddleware = authorize('lawyer');
      const activeMiddleware = requireActiveAccount();

      // First check should fail
      authMiddleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();

      // Second check should not be reached, but if called, should also fail
      next.mockClear();
      res.status.mockClear();
      activeMiddleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('should fail when account is suspended even with correct role', () => {
      req.user = {
        _id: '456',
        role: 'lawyer',
        status: 'suspended',
      };

      const authMiddleware = authorize('lawyer');
      const activeMiddleware = requireActiveAccount();

      // First check passes (role is correct)
      authMiddleware(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);

      // Second check fails (account is suspended)
      next.mockClear();
      activeMiddleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'ACCOUNT_SUSPENDED',
        })
      );
      expect(next).not.toHaveBeenCalled();
    });
  });
});
