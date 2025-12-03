/**
 * Admin IP Whitelist middleware
 * Restricts admin access to specific IP addresses for extra security
 * 
 * Set ADMIN_IP_WHITELIST in .env:
 * ADMIN_IP_WHITELIST=192.168.1.100,203.0.113.45,198.51.100.0/24
 * 
 * Usage:
 * router.get('/admin/users', authenticate, requireAdmin(), adminIPWhitelist(), getAllUsers);
 */

const ipRangeCheck = require('ip-range-check');

/**
 * Check if admin request is from whitelisted IP
 * @param {object} options - Configuration options
 * @returns {Function} - Express middleware
 */
const adminIPWhitelist = (options = {}) => {
  return (req, res, next) => {
    try {
      // Only apply to admin users
      if (!req.user || req.user.role !== 'admin') {
        return next(); // Not admin, skip check
      }

      // Get whitelist from environment variable
      const whitelist = process.env.ADMIN_IP_WHITELIST;

      // If no whitelist configured, allow all (but log warning)
      if (!whitelist) {
        if (process.env.NODE_ENV === 'production') {
          console.warn('⚠️  WARNING: ADMIN_IP_WHITELIST not configured in production!');
          console.warn('⚠️  Admin access is not IP-restricted!');
        }
        return next();
      }

      // Get client IP address
      const clientIP = getClientIP(req);

      if (!clientIP) {
        console.error('❌ Could not determine client IP address');
        return res.status(403).json({
          success: false,
          error: 'غير قادر على تحديد عنوان IP',
          error_en: 'Unable to determine IP address',
          code: 'IP_DETECTION_FAILED',
        });
      }

      // Parse whitelist (comma-separated IPs and CIDR ranges)
      const allowedIPs = whitelist.split(',').map(ip => ip.trim());

      // Check if client IP is in whitelist
      const isAllowed = allowedIPs.some(allowedIP => {
        // Check exact match
        if (allowedIP === clientIP) {
          return true;
        }
        
        // Check CIDR range (e.g., 192.168.1.0/24)
        if (allowedIP.includes('/')) {
          try {
            return ipRangeCheck(clientIP, allowedIP);
          } catch (error) {
            console.error(`❌ Invalid CIDR range: ${allowedIP}`);
            return false;
          }
        }
        
        return false;
      });

      if (!isAllowed) {
        // Log suspicious admin access attempt
        console.error('🚨 SECURITY ALERT: Unauthorized admin access attempt');
        console.error(`   User: ${req.user.email} (ID: ${req.user._id})`);
        console.error(`   IP: ${clientIP}`);
        console.error(`   Endpoint: ${req.method} ${req.originalUrl}`);
        console.error(`   Time: ${new Date().toISOString()}`);

        // Send alert email/notification here (implement later)
        // await sendSecurityAlert({ ... });

        return res.status(403).json({
          success: false,
          error: 'الوصول للإدارة محظور من هذا الموقع',
          error_en: 'Admin access denied from this location',
          code: 'IP_NOT_WHITELISTED',
          details: {
            clientIP: clientIP,
            message: 'Your IP address is not authorized for admin access',
          },
        });
      }

      // IP is whitelisted, allow access
      next();
    } catch (error) {
      console.error('❌ Admin IP whitelist check error:', error.message);
      return res.status(500).json({
        success: false,
        error: 'خطأ في التحقق من عنوان IP',
        error_en: 'IP whitelist check failed',
      });
    }
  };
};

/**
 * Get client IP address from request
 * Handles proxies and load balancers
 */
const getClientIP = (req) => {
  // Check various headers for real IP (in order of preference)
  const headers = [
    'x-forwarded-for',      // Most common proxy header
    'x-real-ip',            // Nginx proxy
    'cf-connecting-ip',     // Cloudflare
    'true-client-ip',       // Cloudflare Enterprise
    'x-client-ip',          // Other proxies
    'x-cluster-client-ip',  // Rackspace LB
    'forwarded-for',        // RFC 7239
    'forwarded',            // RFC 7239
  ];

  // Check each header
  for (const header of headers) {
    const value = req.headers[header];
    if (value) {
      // x-forwarded-for can contain multiple IPs (client, proxy1, proxy2, ...)
      // Use the first one (actual client)
      const ips = value.split(',').map(ip => ip.trim());
      if (ips[0]) {
        return ips[0];
      }
    }
  }

  // Fallback to connection remote address
  if (req.connection && req.connection.remoteAddress) {
    return req.connection.remoteAddress;
  }

  // Fallback to socket remote address
  if (req.socket && req.socket.remoteAddress) {
    return req.socket.remoteAddress;
  }

  // Last resort: req.ip
  return req.ip || null;
};

/**
 * Alternative: Whitelist specific admin users by IP
 * More flexible - different IPs for different admins
 */
const adminIPWhitelistByUser = () => {
  return async (req, res, next) => {
    try {
      if (!req.user || req.user.role !== 'admin') {
        return next();
      }

      // Get user's allowed IPs from database (if stored)
      // This allows per-admin IP restrictions
      if (req.user.allowedIPs && req.user.allowedIPs.length > 0) {
        const clientIP = getClientIP(req);
        const isAllowed = req.user.allowedIPs.includes(clientIP);

        if (!isAllowed) {
          console.error('🚨 SECURITY ALERT: Unauthorized admin access attempt');
          console.error(`   User: ${req.user.email}`);
          console.error(`   IP: ${clientIP}`);
          console.error(`   Allowed IPs: ${req.user.allowedIPs.join(', ')}`);

          return res.status(403).json({
            success: false,
            error: 'الوصول للإدارة محظور من هذا الموقع',
            error_en: 'Admin access denied from this location',
            code: 'IP_NOT_WHITELISTED',
          });
        }
      }

      next();
    } catch (error) {
      console.error('❌ Admin IP whitelist check error:', error.message);
      return res.status(500).json({
        success: false,
        error: 'خطأ في التحقق من عنوان IP',
        error_en: 'IP whitelist check failed',
      });
    }
  };
};

/**
 * Log all admin access attempts (for audit)
 */
const logAdminAccess = () => {
  return (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
      const clientIP = getClientIP(req);
      console.log('ℹ️  Admin access:', {
        user: req.user.email,
        ip: clientIP,
        endpoint: `${req.method} ${req.originalUrl}`,
        time: new Date().toISOString(),
      });
    }
    next();
  };
};

module.exports = {
  adminIPWhitelist,
  adminIPWhitelistByUser,
  logAdminAccess,
  getClientIP,
};
