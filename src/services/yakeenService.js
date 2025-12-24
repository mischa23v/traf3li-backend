/**
 * Yakeen API Service
 *
 * Integration with Yakeen (يقين) APIs for Saudi National ID verification.
 * Yakeen is operated by the National Information Center (NIC) in Saudi Arabia.
 *
 * Available APIs:
 * - Citizen Info (معلومات المواطن)
 * - Citizen Address Info (عنوان المواطن)
 * - Alien Info (معلومات المقيم)
 * - Alien Address Info (عنوان المقيم)
 *
 * Environment Variables Required:
 * - YAKEEN_API_URL
 * - YAKEEN_USERNAME
 * - YAKEEN_PASSWORD
 * - YAKEEN_CHARGE_CODE
 */

const axios = require('axios');
const logger = require('../utils/logger');
const { wrapExternalCall } = require('../utils/externalServiceWrapper');

class YakeenService {
  constructor() {
    this.baseUrl = process.env.YAKEEN_API_URL || 'https://yakeen.mic.gov.sa';
    this.username = process.env.YAKEEN_USERNAME;
    this.password = process.env.YAKEEN_PASSWORD;
    this.chargeCode = process.env.YAKEEN_CHARGE_CODE;

    // Cache for results (24 hour TTL - citizen data doesn't change often)
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
    return !!(this.username && this.password && this.chargeCode);
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
   * Convert Gregorian date to Hijri date
   * Format: YYYY-MM-DD -> iYYYY-iMM-iDD
   * Note: This is a simplified conversion. For production, use a proper library.
   */
  convertToHijri(gregorianDate) {
    // Simplified conversion - in production use moment-hijri or hijri-converter
    const date = new Date(gregorianDate);

    // Islamic calendar approximation
    // This is a simplified calculation - real apps should use a proper library
    const gregorianEpoch = new Date('622-07-16').getTime();
    const islamicDayMs = 24 * 60 * 60 * 1000 * (354.36667 / 365.25);
    const daysSinceEpoch = Math.floor((date.getTime() - gregorianEpoch) / islamicDayMs);

    const hijriYear = Math.floor(daysSinceEpoch / 354.36667) + 1;
    const remainingDays = daysSinceEpoch % 354;
    const hijriMonth = Math.floor(remainingDays / 29.5) + 1;
    const hijriDay = Math.floor(remainingDays % 29.5) + 1;

    return `${hijriYear}-${String(hijriMonth).padStart(2, '0')}-${String(hijriDay).padStart(2, '0')}`;
  }

  /**
   * Validate Saudi National ID format
   * Saudi National IDs are 10 digits starting with 1 (citizen) or 2 (resident)
   */
  validateNationalId(nationalId) {
    if (!nationalId) return false;
    const cleanId = nationalId.toString().replace(/\D/g, '');
    return /^[12]\d{9}$/.test(cleanId);
  }

  /**
   * Validate birth date format
   */
  validateBirthDate(birthDate) {
    if (!birthDate) return false;
    const date = new Date(birthDate);
    return !isNaN(date.getTime());
  }

  /**
   * Verify National ID via Yakeen API
   * @param {string} nationalId - Saudi National ID (10 digits)
   * @param {string} birthDate - Birth date in Gregorian format (YYYY-MM-DD)
   */
  async verifyNationalId(nationalId, birthDate) {
    // Input validation
    if (!nationalId) {
      return {
        verified: false,
        error: 'National ID is required',
        errorAr: 'رقم الهوية الوطنية مطلوب'
      };
    }

    if (!this.validateNationalId(nationalId)) {
      return {
        verified: false,
        error: 'Invalid National ID format. Must be 10 digits starting with 1 or 2',
        errorAr: 'صيغة رقم الهوية غير صحيحة. يجب أن يكون 10 أرقام يبدأ بـ 1 أو 2'
      };
    }

    if (!birthDate || !this.validateBirthDate(birthDate)) {
      return {
        verified: false,
        error: 'Birth date is required in format YYYY-MM-DD',
        errorAr: 'تاريخ الميلاد مطلوب بصيغة YYYY-MM-DD'
      };
    }

    // Check if API is configured
    if (!this.isConfigured()) {
      return {
        verified: false,
        error: 'Yakeen API is not configured',
        errorAr: 'خدمة يقين غير مفعلة'
      };
    }

    // Check cache first
    const cacheKey = `yakeen_${nationalId}_${birthDate}`;
    const cached = this.getCached(cacheKey);
    if (cached) {
      return { verified: true, data: cached, fromCache: true };
    }

    try {
      // Determine if citizen (starts with 1) or resident (starts with 2)
      const isCitizen = nationalId.toString().startsWith('1');
      const endpoint = isCitizen ? '/Yakeen/CitizenInfo' : '/Yakeen/AlienInfo';

      // Convert birth date to Hijri format (required by Yakeen)
      const hijriBirthDate = this.convertToHijri(birthDate);

      const response = await wrapExternalCall('yakeen', async () => {
        return await this.client.post(`${this.baseUrl}${endpoint}`, {
          NIN: nationalId,
          DateOfBirth: hijriBirthDate,
          ChargeCode: this.chargeCode
        }, {
          auth: {
            username: this.username,
            password: this.password
          }
        });
      });

      if (response.data && (response.data.success !== false)) {
        const data = this.normalizeResponse(response.data, isCitizen);
        this.setCache(cacheKey, data);

        return {
          verified: true,
          data
        };
      }

      return {
        verified: false,
        error: response.data?.message || 'Verification failed',
        errorAr: response.data?.messageAr || 'فشل التحقق'
      };

    } catch (error) {
      logger.error('Yakeen verification error:', error.response?.data || error.message);

      // Handle specific error codes
      if (error.response?.status === 401) {
        return {
          verified: false,
          error: 'Authentication failed with Yakeen API',
          errorAr: 'فشل المصادقة مع خدمة يقين'
        };
      }

      if (error.response?.status === 404) {
        return {
          verified: false,
          error: 'National ID not found in Yakeen database',
          errorAr: 'رقم الهوية غير موجود في قاعدة بيانات يقين'
        };
      }

      return {
        verified: false,
        error: error.response?.data?.message || error.message,
        errorAr: 'حدث خطأ أثناء التحقق من الهوية'
      };
    }
  }

  /**
   * Get citizen address information
   * @param {string} nationalId - Saudi National ID
   * @param {string} birthDate - Birth date in Gregorian format
   */
  async getCitizenAddress(nationalId, birthDate) {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: 'Yakeen API is not configured',
        errorAr: 'خدمة يقين غير مفعلة'
      };
    }

    if (!this.validateNationalId(nationalId)) {
      return {
        success: false,
        error: 'Invalid National ID format',
        errorAr: 'صيغة رقم الهوية غير صحيحة'
      };
    }

    const cacheKey = `yakeen_addr_${nationalId}`;
    const cached = this.getCached(cacheKey);
    if (cached) {
      return { success: true, data: cached, fromCache: true };
    }

    try {
      const isCitizen = nationalId.toString().startsWith('1');
      const endpoint = isCitizen ? '/Yakeen/CitizenAddressInfo' : '/Yakeen/AlienAddressInfo';
      const hijriBirthDate = this.convertToHijri(birthDate);

      const response = await wrapExternalCall('yakeen', async () => {
        return await this.client.post(`${this.baseUrl}${endpoint}`, {
          NIN: nationalId,
          DateOfBirth: hijriBirthDate,
          ChargeCode: this.chargeCode
        }, {
          auth: {
            username: this.username,
            password: this.password
          }
        });
      });

      if (response.data && response.data.success !== false) {
        const data = {
          nationalId,
          address: {
            street: response.data.streetName,
            district: response.data.district,
            city: response.data.city,
            postalCode: response.data.postalCode,
            buildingNumber: response.data.buildingNumber,
            additionalNumber: response.data.additionalNumber,
            unitNumber: response.data.unitNumber,
            latitude: response.data.latitude,
            longitude: response.data.longitude
          },
          verified: true,
          verifiedAt: new Date().toISOString(),
          source: 'Yakeen API'
        };

        this.setCache(cacheKey, data);
        return { success: true, data };
      }

      return {
        success: false,
        error: response.data?.message || 'Address verification failed',
        errorAr: response.data?.messageAr || 'فشل التحقق من العنوان'
      };

    } catch (error) {
      logger.error('Yakeen address error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        errorAr: 'حدث خطأ أثناء جلب العنوان'
      };
    }
  }

  /**
   * Normalize Yakeen API response to standard format
   */
  normalizeResponse(data, isCitizen) {
    return {
      nationalId: data.NIN || data.nin || data.nationalId,

      // Name components (Arabic)
      firstNameAr: data.firstName || data.firstNameAr,
      fatherNameAr: data.fatherName || data.fatherNameAr,
      grandfatherNameAr: data.grandFatherName || data.grandfatherNameAr,
      lastNameAr: data.familyName || data.lastNameAr,
      fullNameAr: [
        data.firstName,
        data.fatherName,
        data.grandFatherName,
        data.familyName
      ].filter(Boolean).join(' '),

      // Name components (English)
      firstNameEn: data.englishFirstName || data.firstNameEn,
      fatherNameEn: data.englishFatherName || data.fatherNameEn,
      grandfatherNameEn: data.englishGrandFatherName || data.grandfatherNameEn,
      lastNameEn: data.englishFamilyName || data.lastNameEn,
      fullNameEn: [
        data.englishFirstName,
        data.englishFatherName,
        data.englishGrandFatherName,
        data.englishFamilyName
      ].filter(Boolean).join(' '),

      // Personal Info
      gender: data.gender === 'M' || data.gender === 'male' ? 'male' : 'female',
      genderAr: data.gender === 'M' || data.gender === 'male' ? 'ذكر' : 'أنثى',

      // Birth dates
      birthDate: data.dateOfBirth || data.birthDate,
      birthDateHijri: data.dateOfBirthH || data.birthDateHijri,

      // ID Info
      idExpiryDate: data.idExpiryDate,
      idExpiryDateHijri: data.idExpiryDateH || data.idExpiryDateHijri,
      idIssuePlace: data.idIssuePlace,

      // Status
      nationality: data.nationality || (isCitizen ? 'Saudi' : data.nationality),
      nationalityAr: data.nationalityAr || (isCitizen ? 'سعودي' : data.nationalityAr),
      nationalityCode: isCitizen ? 'SA' : data.nationalityCode,

      // For residents only
      occupationCode: !isCitizen ? data.occupationCode : undefined,
      sponsorId: !isCitizen ? data.sponsorId : undefined,
      sponsorName: !isCitizen ? data.sponsorName : undefined,

      // Marital status
      maritalStatus: data.maritalStatus,
      maritalStatusAr: data.maritalStatusAr,

      // Metadata
      isCitizen,
      verified: true,
      verifiedAt: new Date().toISOString(),
      source: 'Yakeen API'
    };
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
module.exports = new YakeenService();
