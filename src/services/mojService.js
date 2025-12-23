/**
 * MOJ (Ministry of Justice) API Service
 *
 * Integration with MOJ (وزارة العدل) APIs for legal verifications.
 * This service handles verification of:
 * - Attorney licenses (رخصة المحاماة)
 * - Power of Attorney documents (الوكالات)
 * - Legal documents and rulings
 *
 * Environment Variables Required:
 * - MOJ_API_URL
 * - MOJ_API_KEY
 * - MOJ_CLIENT_ID (optional, for OAuth)
 * - MOJ_CLIENT_SECRET (optional, for OAuth)
 */

const axios = require('axios');
const logger = require('../utils/logger');

class MOJService {
  constructor() {
    this.baseUrl = process.env.MOJ_API_URL || 'https://api.moj.gov.sa';
    this.apiKey = process.env.MOJ_API_KEY;
    this.clientId = process.env.MOJ_CLIENT_ID;
    this.clientSecret = process.env.MOJ_CLIENT_SECRET;

    // Cache for results (24 hour TTL)
    this.cache = new Map();
    this.cacheTTL = 24 * 60 * 60 * 1000; // 24 hours

    // Create axios instance
    this.client = axios.create({
      timeout: 30000,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Check if API credentials are configured
   */
  isConfigured() {
    return !!(this.apiKey || (this.clientId && this.clientSecret));
  }

  /**
   * Get cached result or null if expired/missing
   */
  getCached(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  /**
   * Set cache with timestamp
   */
  setCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Get authorization header for API requests
   */
  getAuthHeader() {
    if (this.apiKey) {
      return `Bearer ${this.apiKey}`;
    }
    if (this.clientId && this.clientSecret) {
      const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
      return `Basic ${credentials}`;
    }
    throw new Error('MOJ API credentials not configured');
  }

  /**
   * Validate attorney license number format
   * Saudi attorney license numbers are typically 4-6 digits
   */
  validateLicenseNumber(licenseNumber) {
    if (!licenseNumber) return false;
    const cleanNumber = licenseNumber.toString().replace(/\D/g, '');
    return /^\d{4,6}$/.test(cleanNumber);
  }

  /**
   * Validate Power of Attorney number format
   * POA numbers in Saudi Arabia are typically 10+ digits
   */
  validatePOANumber(poaNumber) {
    if (!poaNumber) return false;
    const cleanNumber = poaNumber.toString().replace(/\D/g, '');
    return /^\d{10,}$/.test(cleanNumber);
  }

  /**
   * Validate Saudi National ID format
   */
  validateNationalId(nationalId) {
    if (!nationalId) return false;
    const cleanId = nationalId.toString().replace(/\D/g, '');
    return /^[12]\d{9}$/.test(cleanId);
  }

  // ═══════════════════════════════════════════════════════════════
  // ATTORNEY VERIFICATION APIs (المحامين)
  // ═══════════════════════════════════════════════════════════════

  /**
   * Verify attorney license by attorney ID (National ID)
   * @param {string} attorneyId - Attorney's National ID
   */
  async verifyAttorney(attorneyId) {
    if (!attorneyId) {
      return {
        verified: false,
        error: 'Attorney ID is required',
        errorAr: 'رقم هوية المحامي مطلوب'
      };
    }

    if (!this.validateNationalId(attorneyId)) {
      return {
        verified: false,
        error: 'Invalid National ID format',
        errorAr: 'صيغة رقم الهوية غير صحيحة'
      };
    }

    if (!this.isConfigured()) {
      return {
        verified: false,
        error: 'MOJ API is not configured',
        errorAr: 'خدمة وزارة العدل غير مفعلة'
      };
    }

    const cacheKey = `moj_attorney_${attorneyId}`;
    const cached = this.getCached(cacheKey);
    if (cached) {
      return { verified: true, data: cached, fromCache: true };
    }

    try {
      const response = await this.client.get(
        `${this.baseUrl}/lawyers/verify/${attorneyId}`,
        {
          headers: {
            'Authorization': this.getAuthHeader()
          }
        }
      );

      if (response.data && response.data.valid !== false) {
        const data = this.normalizeAttorneyResponse(response.data);
        this.setCache(cacheKey, data);

        return {
          verified: true,
          data
        };
      }

      return {
        verified: false,
        error: 'Attorney license not found or invalid',
        errorAr: 'رخصة المحامي غير موجودة أو غير صالحة'
      };

    } catch (error) {
      logger.error('MOJ attorney verification error:', error.response?.data || error.message);

      if (error.response?.status === 404) {
        return {
          verified: false,
          error: 'Attorney not found in MOJ database',
          errorAr: 'المحامي غير مسجل في وزارة العدل'
        };
      }

      return {
        verified: false,
        error: error.response?.data?.message || error.message,
        errorAr: 'حدث خطأ أثناء التحقق من رخصة المحامي'
      };
    }
  }

  /**
   * Verify attorney license by license number
   * @param {string} licenseNumber - Attorney license number
   */
  async verifyAttorneyByLicense(licenseNumber) {
    if (!licenseNumber) {
      return {
        verified: false,
        error: 'License number is required',
        errorAr: 'رقم الرخصة مطلوب'
      };
    }

    if (!this.validateLicenseNumber(licenseNumber)) {
      return {
        verified: false,
        error: 'Invalid license number format',
        errorAr: 'صيغة رقم الرخصة غير صحيحة'
      };
    }

    if (!this.isConfigured()) {
      return {
        verified: false,
        error: 'MOJ API is not configured',
        errorAr: 'خدمة وزارة العدل غير مفعلة'
      };
    }

    const cacheKey = `moj_license_${licenseNumber}`;
    const cached = this.getCached(cacheKey);
    if (cached) {
      return { verified: true, data: cached, fromCache: true };
    }

    try {
      const response = await this.client.get(
        `${this.baseUrl}/lawyers/license/${licenseNumber}`,
        {
          headers: {
            'Authorization': this.getAuthHeader()
          }
        }
      );

      if (response.data && response.data.valid !== false) {
        const data = this.normalizeAttorneyResponse(response.data);
        this.setCache(cacheKey, data);

        return {
          verified: true,
          data
        };
      }

      return {
        verified: false,
        error: 'License not found or expired',
        errorAr: 'الرخصة غير موجودة أو منتهية'
      };

    } catch (error) {
      logger.error('MOJ license verification error:', error.response?.data || error.message);
      return {
        verified: false,
        error: error.response?.data?.message || error.message,
        errorAr: 'حدث خطأ أثناء التحقق من الرخصة'
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // POWER OF ATTORNEY APIs (الوكالات)
  // ═══════════════════════════════════════════════════════════════

  /**
   * Verify Power of Attorney document
   * @param {string} poaNumber - Power of Attorney number
   * @param {string} idNumber - Principal or Attorney's National ID (optional)
   */
  async verifyPowerOfAttorney(poaNumber, idNumber = null) {
    if (!poaNumber) {
      return {
        verified: false,
        error: 'Power of Attorney number is required',
        errorAr: 'رقم الوكالة مطلوب'
      };
    }

    if (!this.validatePOANumber(poaNumber)) {
      return {
        verified: false,
        error: 'Invalid POA number format. Must be at least 10 digits',
        errorAr: 'صيغة رقم الوكالة غير صحيحة. يجب أن يكون 10 أرقام على الأقل'
      };
    }

    if (idNumber && !this.validateNationalId(idNumber)) {
      return {
        verified: false,
        error: 'Invalid National ID format',
        errorAr: 'صيغة رقم الهوية غير صحيحة'
      };
    }

    if (!this.isConfigured()) {
      return {
        verified: false,
        error: 'MOJ API is not configured',
        errorAr: 'خدمة وزارة العدل غير مفعلة'
      };
    }

    const cacheKey = `moj_poa_${poaNumber}_${idNumber || 'no_id'}`;
    const cached = this.getCached(cacheKey);
    if (cached) {
      return { verified: true, data: cached, fromCache: true };
    }

    try {
      // Build endpoint based on available parameters
      let endpoint = `${this.baseUrl}/poa/verify/${poaNumber}`;
      if (idNumber) {
        endpoint += `?idNumber=${idNumber}`;
      }

      const response = await this.client.get(endpoint, {
        headers: {
          'Authorization': this.getAuthHeader()
        }
      });

      if (response.data && response.data.valid !== false) {
        const data = this.normalizePOAResponse(response.data);
        this.setCache(cacheKey, data);

        return {
          verified: true,
          data
        };
      }

      return {
        verified: false,
        error: 'Power of Attorney not found or expired',
        errorAr: 'الوكالة غير موجودة أو منتهية'
      };

    } catch (error) {
      logger.error('MOJ POA verification error:', error.response?.data || error.message);

      if (error.response?.status === 404) {
        return {
          verified: false,
          error: 'Power of Attorney not found',
          errorAr: 'لم يتم العثور على الوكالة'
        };
      }

      return {
        verified: false,
        error: error.response?.data?.message || error.message,
        errorAr: 'حدث خطأ أثناء التحقق من الوكالة'
      };
    }
  }

  /**
   * Get all Powers of Attorney for a person
   * @param {string} idNumber - National ID
   * @param {string} role - 'principal' (الموكل) or 'attorney' (الوكيل)
   */
  async getPowerOfAttorneyList(idNumber, role = 'principal') {
    if (!idNumber) {
      return {
        success: false,
        error: 'National ID is required',
        errorAr: 'رقم الهوية مطلوب'
      };
    }

    if (!this.validateNationalId(idNumber)) {
      return {
        success: false,
        error: 'Invalid National ID format',
        errorAr: 'صيغة رقم الهوية غير صحيحة'
      };
    }

    if (!['principal', 'attorney'].includes(role)) {
      return {
        success: false,
        error: 'Role must be "principal" or "attorney"',
        errorAr: 'نوع الدور يجب أن يكون "الموكل" أو "الوكيل"'
      };
    }

    if (!this.isConfigured()) {
      return {
        success: false,
        error: 'MOJ API is not configured',
        errorAr: 'خدمة وزارة العدل غير مفعلة'
      };
    }

    try {
      const response = await this.client.get(
        `${this.baseUrl}/poa/list/${idNumber}?role=${role}`,
        {
          headers: {
            'Authorization': this.getAuthHeader()
          }
        }
      );

      if (response.data) {
        return {
          success: true,
          data: (response.data.items || response.data || []).map(poa =>
            this.normalizePOAResponse(poa)
          )
        };
      }

      return {
        success: true,
        data: []
      };

    } catch (error) {
      logger.error('MOJ POA list error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        errorAr: 'حدث خطأ أثناء جلب قائمة الوكالات'
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // HELPER METHODS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Normalize attorney verification response
   */
  normalizeAttorneyResponse(data) {
    // Calculate days until expiry
    let daysUntilExpiry = null;
    if (data.expiryDate) {
      const expiry = new Date(data.expiryDate);
      const now = new Date();
      daysUntilExpiry = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
    }

    return {
      attorneyId: data.nationalId || data.attorneyId,
      name: data.lawyerName || data.name,
      nameAr: data.lawyerNameAr || data.nameAr || data.lawyerName,
      nameEn: data.lawyerNameEn || data.nameEn,

      // License details
      licenseNumber: data.licenseNumber,
      licenseStatus: data.status || data.licenseStatus,
      licenseStatusAr: data.statusAr || this.translateStatus(data.status),

      // Validity
      isActive: data.status === 'active' || data.isActive === true,
      isValid: data.valid !== false && data.isActive !== false,
      isExpired: daysUntilExpiry !== null && daysUntilExpiry < 0,
      daysUntilExpiry,

      // Dates
      issueDate: data.issueDate,
      expiryDate: data.expiryDate,

      // Professional info
      specializations: data.specializations || [],
      region: data.region,
      regionAr: data.regionAr,

      // Contact
      phone: data.phone,
      email: data.email,
      address: data.address,

      // Metadata
      verified: true,
      verifiedAt: new Date().toISOString(),
      source: 'MOJ Portal'
    };
  }

  /**
   * Normalize POA verification response
   */
  normalizePOAResponse(data) {
    // Calculate days until expiry
    let daysUntilExpiry = null;
    if (data.expiryDate) {
      const expiry = new Date(data.expiryDate);
      const now = new Date();
      daysUntilExpiry = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
    }

    return {
      poaNumber: data.poaNumber || data.documentNumber,

      // Status
      status: data.status,
      statusAr: data.statusAr || this.translatePOAStatus(data.status),
      isActive: data.status === 'active' || data.isActive === true,
      isValid: data.valid !== false && data.isActive !== false,
      isExpired: daysUntilExpiry !== null && daysUntilExpiry < 0,
      daysUntilExpiry,

      // Principal (الموكل)
      principal: {
        name: data.principal?.name || data.principalName,
        idNumber: data.principal?.nationalId || data.principalId
      },

      // Attorney (الوكيل)
      attorney: {
        name: data.attorney?.name || data.attorneyName,
        idNumber: data.attorney?.nationalId || data.attorneyId,
        type: data.attorney?.type || data.attorneyType // خاص/عام
      },

      // Dates
      issueDate: data.issueDate,
      expiryDate: data.expiryDate,

      // Notary info
      notaryNumber: data.notaryNumber,
      notaryName: data.notaryName,
      courtName: data.courtName,

      // Powers/Authorities granted
      powers: data.powers || data.authorities || [],
      powersAr: data.powersAr || [],
      scope: data.scope || [],
      restrictions: data.restrictions || [],

      // Type
      poaType: data.type || data.poaType, // عامة/خاصة
      poaTypeAr: data.typeAr || this.translatePOAType(data.type),

      // Metadata
      verified: true,
      verifiedAt: new Date().toISOString(),
      source: 'MOJ Portal'
    };
  }

  /**
   * Translate attorney status to Arabic
   */
  translateStatus(status) {
    const translations = {
      'active': 'نشط',
      'inactive': 'غير نشط',
      'suspended': 'موقوف',
      'expired': 'منتهي',
      'revoked': 'ملغي'
    };
    return translations[status?.toLowerCase()] || status;
  }

  /**
   * Translate POA status to Arabic
   */
  translatePOAStatus(status) {
    const translations = {
      'active': 'سارية',
      'expired': 'منتهية',
      'cancelled': 'ملغاة',
      'suspended': 'موقوفة',
      'revoked': 'مسحوبة'
    };
    return translations[status?.toLowerCase()] || status;
  }

  /**
   * Translate POA type to Arabic
   */
  translatePOAType(type) {
    const translations = {
      'general': 'عامة',
      'specific': 'خاصة',
      'limited': 'محدودة'
    };
    return translations[type?.toLowerCase()] || type;
  }

  /**
   * Clear the cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      ttlMs: this.cacheTTL
    };
  }
}

// Export singleton instance
module.exports = new MOJService();
