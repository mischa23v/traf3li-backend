/**
 * IP Restriction Service
 * Manages firm-level IP whitelisting for enhanced security
 *
 * Features:
 * - IP address validation and CIDR notation support
 * - IP range support (e.g., 192.168.1.1-192.168.1.255)
 * - IPv4 and IPv6 address handling
 * - Temporary IP allowances with expiration
 * - Audit logging for IP changes and blocked attempts
 */

const ipRangeCheck = require('ip-range-check');
const Firm = require('../models/firm.model');
const auditLogService = require('./auditLog.service');
const notificationDeliveryService = require('./notificationDelivery.service');

class IPRestrictionService {
  /**
   * Check if an IP address is allowed for a firm
   * @param {string} ip - Client IP address
   * @param {string} firmId - Firm ID
   * @returns {Promise<Object>} - { allowed: boolean, reason?: string }
   */
  async isIPAllowed(ip, firmId) {
    try {
      // Get firm with IP whitelist settings
      const firm = await Firm.findById(firmId)
        .select('enterpriseSettings.ipWhitelist enterpriseSettings.ipWhitelistEnabled name')
        .lean();

      if (!firm) {
        return { allowed: false, reason: 'Firm not found' };
      }

      // If IP whitelisting is not enabled, allow all IPs
      if (!firm.enterpriseSettings?.ipWhitelistEnabled) {
        return { allowed: true, reason: 'IP whitelisting disabled' };
      }

      const whitelist = firm.enterpriseSettings.ipWhitelist || [];

      // If whitelist is empty but enabled, block all (for safety)
      if (whitelist.length === 0) {
        return { allowed: false, reason: 'IP whitelist is empty' };
      }

      // Normalize IP address (remove IPv6 prefix if present)
      const normalizedIP = this._normalizeIP(ip);

      // Check permanent whitelist
      const isPermanentlyAllowed = this._checkIPInWhitelist(normalizedIP, whitelist);
      if (isPermanentlyAllowed) {
        return { allowed: true, reason: 'IP in permanent whitelist' };
      }

      // Check temporary allowances
      const TemporaryIPAllowance = require('../models/temporaryIPAllowance.model');
      const tempAllowance = await TemporaryIPAllowance.findOne({
        firmId,
        ipAddress: normalizedIP,
        expiresAt: { $gt: new Date() },
        isActive: true
      });

      if (tempAllowance) {
        return { allowed: true, reason: 'IP in temporary whitelist', expiresAt: tempAllowance.expiresAt };
      }

      // IP not allowed
      return { allowed: false, reason: 'IP not in whitelist' };
    } catch (error) {
      console.error('IPRestrictionService.isIPAllowed error:', error);
      // On error, fail open for safety (don't block access)
      return { allowed: true, reason: 'Error checking IP whitelist' };
    }
  }

  /**
   * Add IP address to firm's permanent whitelist
   * @param {string} firmId - Firm ID
   * @param {string} ip - IP address, CIDR notation, or range
   * @param {string} description - Description of the IP/location
   * @param {Object} context - Request context for audit
   * @returns {Promise<Object>} - Updated firm
   */
  async addAllowedIP(firmId, ip, description = null, context = {}) {
    try {
      // Validate IP format
      const validation = this._validateIPFormat(ip);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      const firm = await Firm.findById(firmId);
      if (!firm) {
        throw new Error('Firm not found');
      }

      // Initialize IP whitelist if not exists
      if (!firm.enterpriseSettings) {
        firm.enterpriseSettings = {};
      }
      if (!firm.enterpriseSettings.ipWhitelist) {
        firm.enterpriseSettings.ipWhitelist = [];
      }

      // Normalize IP address
      const normalizedIP = this._normalizeIP(ip);

      // Check if IP already exists
      if (firm.enterpriseSettings.ipWhitelist.includes(normalizedIP)) {
        throw new Error('IP address already in whitelist');
      }

      // Add IP to whitelist
      firm.enterpriseSettings.ipWhitelist.push(normalizedIP);

      // Mark the nested field as modified for Mongoose
      firm.markModified('enterpriseSettings');

      await firm.save();

      // Log the action
      await auditLogService.log(
        'add_ip_whitelist',
        'firm',
        firmId,
        { after: { ip: normalizedIP, description } },
        {
          ...context,
          severity: 'high',
          details: {
            action: 'Add IP to whitelist',
            ip: normalizedIP,
            description,
            totalIPs: firm.enterpriseSettings.ipWhitelist.length
          }
        }
      );

      return {
        success: true,
        ipWhitelist: firm.enterpriseSettings.ipWhitelist,
        added: normalizedIP,
        description
      };
    } catch (error) {
      console.error('IPRestrictionService.addAllowedIP error:', error);
      throw error;
    }
  }

  /**
   * Remove IP address from firm's whitelist
   * @param {string} firmId - Firm ID
   * @param {string} ip - IP address to remove
   * @param {Object} context - Request context for audit
   * @returns {Promise<Object>} - Updated firm
   */
  async removeAllowedIP(firmId, ip, context = {}) {
    try {
      const firm = await Firm.findById(firmId);
      if (!firm) {
        throw new Error('Firm not found');
      }

      if (!firm.enterpriseSettings?.ipWhitelist) {
        throw new Error('IP whitelist not found');
      }

      // Normalize IP address
      const normalizedIP = this._normalizeIP(ip);

      // Check if IP exists
      const index = firm.enterpriseSettings.ipWhitelist.indexOf(normalizedIP);
      if (index === -1) {
        throw new Error('IP address not found in whitelist');
      }

      // Remove IP from whitelist
      firm.enterpriseSettings.ipWhitelist.splice(index, 1);

      // Mark the nested field as modified for Mongoose
      firm.markModified('enterpriseSettings');

      await firm.save();

      // Log the action
      await auditLogService.log(
        'remove_ip_whitelist',
        'firm',
        firmId,
        { before: { ip: normalizedIP } },
        {
          ...context,
          severity: 'high',
          details: {
            action: 'Remove IP from whitelist',
            ip: normalizedIP,
            remainingIPs: firm.enterpriseSettings.ipWhitelist.length
          }
        }
      );

      return {
        success: true,
        ipWhitelist: firm.enterpriseSettings.ipWhitelist,
        removed: normalizedIP
      };
    } catch (error) {
      console.error('IPRestrictionService.removeAllowedIP error:', error);
      throw error;
    }
  }

  /**
   * Get IP whitelist for a firm
   * @param {string} firmId - Firm ID
   * @returns {Promise<Object>} - IP whitelist with metadata
   */
  async getIPWhitelist(firmId) {
    try {
      const firm = await Firm.findById(firmId)
        .select('enterpriseSettings.ipWhitelist enterpriseSettings.ipWhitelistEnabled name')
        .lean();

      if (!firm) {
        throw new Error('Firm not found');
      }

      const whitelist = firm.enterpriseSettings?.ipWhitelist || [];
      const enabled = firm.enterpriseSettings?.ipWhitelistEnabled || false;

      // Get temporary allowances
      const TemporaryIPAllowance = require('../models/temporaryIPAllowance.model');
      const temporaryAllowances = await TemporaryIPAllowance.find({
        firmId,
        expiresAt: { $gt: new Date() },
        isActive: true
      })
        .select('ipAddress description expiresAt createdBy createdAt')
        .populate('createdBy', 'firstName lastName email')
        .lean();

      // Parse whitelist entries to provide more details
      const parsedWhitelist = whitelist.map(entry => ({
        ip: entry,
        type: this._determineIPType(entry),
        description: null, // Can be enhanced to store descriptions
        permanent: true
      }));

      return {
        success: true,
        enabled,
        permanent: parsedWhitelist,
        temporary: temporaryAllowances.map(t => ({
          ip: t.ipAddress,
          type: this._determineIPType(t.ipAddress),
          description: t.description,
          expiresAt: t.expiresAt,
          createdBy: t.createdBy,
          createdAt: t.createdAt,
          permanent: false
        })),
        total: parsedWhitelist.length + temporaryAllowances.length
      };
    } catch (error) {
      console.error('IPRestrictionService.getIPWhitelist error:', error);
      throw error;
    }
  }

  /**
   * Add temporary IP allowance
   * @param {string} firmId - Firm ID
   * @param {string} ip - IP address
   * @param {number} durationHours - Duration in hours (24, 168, 720 for 1d, 7d, 30d)
   * @param {string} description - Description
   * @param {string} createdBy - User ID who created the allowance
   * @param {Object} context - Request context
   * @returns {Promise<Object>} - Created temporary allowance
   */
  async addTemporaryIP(firmId, ip, durationHours, description = null, createdBy, context = {}) {
    try {
      // Validate IP format
      const validation = this._validateIPFormat(ip);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // Normalize IP
      const normalizedIP = this._normalizeIP(ip);

      // Calculate expiration
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + durationHours);

      // Create temporary allowance
      const TemporaryIPAllowance = require('../models/temporaryIPAllowance.model');
      const allowance = await TemporaryIPAllowance.create({
        firmId,
        ipAddress: normalizedIP,
        description,
        expiresAt,
        durationHours,
        createdBy,
        isActive: true
      });

      // Log the action
      await auditLogService.log(
        'add_temporary_ip',
        'firm',
        firmId,
        { after: { ip: normalizedIP, duration: durationHours, expiresAt } },
        {
          ...context,
          severity: 'medium',
          details: {
            action: 'Add temporary IP allowance',
            ip: normalizedIP,
            description,
            durationHours,
            expiresAt
          }
        }
      );

      return {
        success: true,
        allowance: {
          id: allowance._id,
          ip: allowance.ipAddress,
          description: allowance.description,
          expiresAt: allowance.expiresAt,
          durationHours: allowance.durationHours
        }
      };
    } catch (error) {
      console.error('IPRestrictionService.addTemporaryIP error:', error);
      throw error;
    }
  }

  /**
   * Enable IP whitelisting for a firm
   * Warns if current IP is not in whitelist
   * @param {string} firmId - Firm ID
   * @param {string} currentIP - Current user's IP
   * @param {boolean} autoWhitelistCurrentIP - Whether to auto-whitelist current IP
   * @param {Object} context - Request context
   * @returns {Promise<Object>} - Result with warnings
   */
  async enableIPWhitelist(firmId, currentIP, autoWhitelistCurrentIP = true, context = {}) {
    try {
      const firm = await Firm.findById(firmId);
      if (!firm) {
        throw new Error('Firm not found');
      }

      // Initialize if needed
      if (!firm.enterpriseSettings) {
        firm.enterpriseSettings = {};
      }
      if (!firm.enterpriseSettings.ipWhitelist) {
        firm.enterpriseSettings.ipWhitelist = [];
      }

      const normalizedIP = this._normalizeIP(currentIP);
      const currentIPInWhitelist = this._checkIPInWhitelist(
        normalizedIP,
        firm.enterpriseSettings.ipWhitelist
      );

      const warnings = [];

      // Warn if current IP not in whitelist
      if (!currentIPInWhitelist) {
        warnings.push({
          type: 'current_ip_not_whitelisted',
          message: 'Your current IP address is not in the whitelist. You may lose access after enabling.',
          currentIP: normalizedIP
        });

        // Auto-whitelist current IP if requested
        if (autoWhitelistCurrentIP) {
          firm.enterpriseSettings.ipWhitelist.push(normalizedIP);
          warnings.push({
            type: 'auto_whitelisted',
            message: 'Your current IP has been automatically added to the whitelist.',
            currentIP: normalizedIP
          });
        }
      }

      // Enable IP whitelisting
      firm.enterpriseSettings.ipWhitelistEnabled = true;
      firm.markModified('enterpriseSettings');
      await firm.save();

      // Log the action
      await auditLogService.log(
        'enable_ip_whitelist',
        'firm',
        firmId,
        { after: { enabled: true, autoWhitelisted: autoWhitelistCurrentIP } },
        {
          ...context,
          severity: 'critical',
          details: {
            action: 'Enable IP whitelisting',
            currentIP: normalizedIP,
            autoWhitelisted: autoWhitelistCurrentIP,
            whitelistSize: firm.enterpriseSettings.ipWhitelist.length
          }
        }
      );

      return {
        success: true,
        enabled: true,
        warnings,
        ipWhitelist: firm.enterpriseSettings.ipWhitelist
      };
    } catch (error) {
      console.error('IPRestrictionService.enableIPWhitelist error:', error);
      throw error;
    }
  }

  /**
   * Disable IP whitelisting for a firm
   * @param {string} firmId - Firm ID
   * @param {Object} context - Request context
   * @returns {Promise<Object>} - Result
   */
  async disableIPWhitelist(firmId, context = {}) {
    try {
      const firm = await Firm.findById(firmId);
      if (!firm) {
        throw new Error('Firm not found');
      }

      if (!firm.enterpriseSettings) {
        firm.enterpriseSettings = {};
      }

      // Disable IP whitelisting
      firm.enterpriseSettings.ipWhitelistEnabled = false;
      firm.markModified('enterpriseSettings');
      await firm.save();

      // Log the action
      await auditLogService.log(
        'disable_ip_whitelist',
        'firm',
        firmId,
        { before: { enabled: true } },
        {
          ...context,
          severity: 'critical',
          details: {
            action: 'Disable IP whitelisting'
          }
        }
      );

      return {
        success: true,
        enabled: false
      };
    } catch (error) {
      console.error('IPRestrictionService.disableIPWhitelist error:', error);
      throw error;
    }
  }

  /**
   * Log blocked IP attempt and notify admins
   * @param {string} firmId - Firm ID
   * @param {string} ip - Blocked IP address
   * @param {Object} context - Request context
   */
  async logBlockedAttempt(firmId, ip, context = {}) {
    try {
      // Log to audit
      await auditLogService.log(
        'ip_blocked',
        'firm',
        firmId,
        null,
        {
          ...context,
          severity: 'high',
          status: 'blocked',
          details: {
            action: 'IP address blocked',
            blockedIP: ip,
            endpoint: context.endpoint,
            userAgent: context.userAgent
          }
        }
      );

      // Get firm admins
      const firm = await Firm.findById(firmId)
        .select('name ownerId members')
        .populate('ownerId', 'email firstName lastName')
        .lean();

      if (!firm) {
        return;
      }

      // Notify owner
      if (firm.ownerId && firm.ownerId._id) {
        try {
          await notificationDeliveryService.send({
            userId: firm.ownerId._id,
            channels: ['email', 'in_app'],
            title: 'IP Address Blocked',
            message: `An access attempt from IP address ${ip} was blocked for ${firm.name}. If this was you, please add the IP to your whitelist.`,
            data: {
              type: 'security_alert',
              firmId,
              blockedIP: ip,
              timestamp: new Date().toISOString()
            }
          });
        } catch (notifError) {
          console.error('Failed to send notification:', notifError);
        }
      }

      // Notify admins
      const adminMembers = firm.members?.filter(m =>
        (m.role === 'admin' || m.role === 'owner') && m.status === 'active'
      ) || [];

      for (const admin of adminMembers) {
        try {
          await notificationDeliveryService.send({
            userId: admin.userId,
            channels: ['in_app'],
            title: 'IP Address Blocked',
            message: `An access attempt from IP address ${ip} was blocked for ${firm.name}.`,
            data: {
              type: 'security_alert',
              firmId,
              blockedIP: ip,
              timestamp: new Date().toISOString()
            }
          });
        } catch (notifError) {
          console.error('Failed to send admin notification:', notifError);
        }
      }
    } catch (error) {
      console.error('IPRestrictionService.logBlockedAttempt error:', error);
      // Don't throw - logging/notification failures shouldn't break the flow
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // HELPER METHODS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Check if IP is in whitelist (handles CIDR and ranges)
   * @private
   */
  _checkIPInWhitelist(ip, whitelist) {
    for (const entry of whitelist) {
      // Exact match
      if (entry === ip) {
        return true;
      }

      // CIDR notation (e.g., 192.168.1.0/24)
      if (entry.includes('/')) {
        try {
          if (ipRangeCheck(ip, entry)) {
            return true;
          }
        } catch (error) {
          console.error(`Invalid CIDR notation: ${entry}`);
        }
      }

      // IP range (e.g., 192.168.1.1-192.168.1.255)
      if (entry.includes('-')) {
        try {
          if (this._checkIPInRange(ip, entry)) {
            return true;
          }
        } catch (error) {
          console.error(`Invalid IP range: ${entry}`);
        }
      }
    }

    return false;
  }

  /**
   * Check if IP is in a range (e.g., 192.168.1.1-192.168.1.255)
   * @private
   */
  _checkIPInRange(ip, range) {
    const [start, end] = range.split('-').map(s => s.trim());

    // Convert IP to number for comparison
    const ipToNum = (ipStr) => {
      const parts = ipStr.split('.');
      return parts.reduce((acc, part, i) => acc + parseInt(part) * Math.pow(256, 3 - i), 0);
    };

    const ipNum = ipToNum(ip);
    const startNum = ipToNum(start);
    const endNum = ipToNum(end);

    return ipNum >= startNum && ipNum <= endNum;
  }

  /**
   * Validate IP address format
   * @private
   */
  _validateIPFormat(ip) {
    // IPv4 address
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;

    // IPv4 CIDR notation
    const cidrRegex = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/;

    // IPv4 range
    const rangeRegex = /^(\d{1,3}\.){3}\d{1,3}\s*-\s*(\d{1,3}\.){3}\d{1,3}$/;

    // IPv6 address (simplified)
    const ipv6Regex = /^([\da-fA-F]{1,4}:){7}[\da-fA-F]{1,4}$/;

    if (ipv4Regex.test(ip)) {
      // Validate each octet is 0-255
      const octets = ip.split('.');
      for (const octet of octets) {
        const num = parseInt(octet);
        if (num < 0 || num > 255) {
          return { valid: false, error: 'Invalid IPv4 address: octet out of range' };
        }
      }
      return { valid: true, type: 'ipv4' };
    }

    if (cidrRegex.test(ip)) {
      const [address, prefix] = ip.split('/');
      const octets = address.split('.');
      for (const octet of octets) {
        const num = parseInt(octet);
        if (num < 0 || num > 255) {
          return { valid: false, error: 'Invalid CIDR notation: octet out of range' };
        }
      }
      const prefixNum = parseInt(prefix);
      if (prefixNum < 0 || prefixNum > 32) {
        return { valid: false, error: 'Invalid CIDR notation: prefix out of range' };
      }
      return { valid: true, type: 'cidr' };
    }

    if (rangeRegex.test(ip)) {
      const [start, end] = ip.split('-').map(s => s.trim());
      const startValid = this._validateIPFormat(start);
      const endValid = this._validateIPFormat(end);
      if (!startValid.valid || !endValid.valid) {
        return { valid: false, error: 'Invalid IP range' };
      }
      return { valid: true, type: 'range' };
    }

    if (ipv6Regex.test(ip)) {
      return { valid: true, type: 'ipv6' };
    }

    // Also accept IPv6 shorthand
    if (ip.includes(':')) {
      return { valid: true, type: 'ipv6' };
    }

    return { valid: false, error: 'Invalid IP address format' };
  }

  /**
   * Normalize IP address (remove IPv6 prefix if present)
   * @private
   */
  _normalizeIP(ip) {
    if (!ip) return ip;

    // Remove IPv4-mapped IPv6 prefix (::ffff:192.168.1.1 -> 192.168.1.1)
    if (ip.startsWith('::ffff:')) {
      return ip.substring(7);
    }

    // Remove IPv6 localhost
    if (ip === '::1') {
      return '127.0.0.1';
    }

    return ip.trim();
  }

  /**
   * Determine IP type (single, CIDR, range, IPv6)
   * @private
   */
  _determineIPType(ip) {
    if (ip.includes('/')) return 'CIDR';
    if (ip.includes('-')) return 'Range';
    if (ip.includes(':')) return 'IPv6';
    return 'IPv4';
  }
}

// Export singleton instance
module.exports = new IPRestrictionService();
