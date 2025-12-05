/**
 * MOJ Public Portal Service
 *
 * Fetches Power of Attorney and Attorney information from the MOJ public portal.
 * Portal URL: https://attorneysportal.moj.gov.sa/v2/portalinquiries/index/#/AttorneyInquiry
 *
 * This uses the public portal's underlying API endpoints - no API fees required.
 *
 * Note: This is a scraping approach. For production systems, consider:
 * - Rate limiting requests to be respectful
 * - Caching results to reduce load
 * - Having a fallback if the portal structure changes
 */

const axios = require('axios');

class MOJPortalService {
  constructor() {
    // Base URLs for MOJ portal APIs
    this.baseUrl = 'https://attorneysportal.moj.gov.sa';
    this.apiBaseUrl = 'https://attorneysportal.moj.gov.sa/api';

    // Alternative API endpoints that MOJ SPAs typically use
    this.alternativeApis = [
      'https://api.moj.gov.sa',
      'https://attorneysportal.moj.gov.sa/v2/api',
      'https://attorneysportal.moj.gov.sa/services'
    ];

    // Request headers to mimic browser behavior
    this.headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'ar,en-US;q=0.9,en;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Origin': 'https://attorneysportal.moj.gov.sa',
      'Referer': 'https://attorneysportal.moj.gov.sa/v2/portalinquiries/index/',
      'Connection': 'keep-alive',
      'Cache-Control': 'no-cache'
    };

    // Create axios instance with default config
    this.client = axios.create({
      timeout: 30000,
      headers: this.headers
    });

    // Cache for results (24 hour TTL)
    this.cache = new Map();
    this.cacheTTL = 24 * 60 * 60 * 1000; // 24 hours
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
   * Inquire about an attorney by their ID number
   * @param {string} attorneyId - Attorney's national ID number
   * @returns {Promise<Object>} Attorney information
   */
  async inquireAttorney(attorneyId) {
    if (!attorneyId) {
      return { success: false, error: 'رقم هوية المحامي مطلوب' };
    }

    // Check cache first
    const cacheKey = `attorney_${attorneyId}`;
    const cached = this.getCached(cacheKey);
    if (cached) {
      return { success: true, data: cached, fromCache: true };
    }

    try {
      // Try different API endpoint patterns
      const endpoints = [
        `${this.apiBaseUrl}/attorney/inquiry`,
        `${this.apiBaseUrl}/attorneys/${attorneyId}`,
        `${this.apiBaseUrl}/inquiry/attorney`,
        `${this.baseUrl}/api/v1/attorney/inquiry`
      ];

      for (const endpoint of endpoints) {
        try {
          const response = await this.client.post(endpoint, {
            attorneyId,
            idNumber: attorneyId
          });

          if (response.data) {
            const result = this.normalizeAttorneyResponse(response.data);
            this.setCache(cacheKey, result);
            return { success: true, data: result };
          }
        } catch (err) {
          // Try next endpoint
          continue;
        }
      }

      // If POST doesn't work, try GET
      for (const endpoint of endpoints) {
        try {
          const response = await this.client.get(`${endpoint}?attorneyId=${attorneyId}`);
          if (response.data) {
            const result = this.normalizeAttorneyResponse(response.data);
            this.setCache(cacheKey, result);
            return { success: true, data: result };
          }
        } catch (err) {
          continue;
        }
      }

      return {
        success: false,
        error: 'لم يتم العثور على بيانات المحامي',
        note: 'يرجى التحقق من رقم الهوية أو المحاولة لاحقاً'
      };
    } catch (error) {
      console.error('MOJ Attorney Inquiry Error:', error.message);
      return {
        success: false,
        error: 'فشل الاتصال ببوابة وزارة العدل',
        details: error.message
      };
    }
  }

  /**
   * Inquire about a Power of Attorney
   * @param {string} poaNumber - Power of Attorney number
   * @param {string} idNumber - Principal's or Attorney's national ID
   * @returns {Promise<Object>} POA information
   */
  async inquirePowerOfAttorney(poaNumber, idNumber) {
    if (!poaNumber || !idNumber) {
      return { success: false, error: 'رقم الوكالة ورقم الهوية مطلوبان' };
    }

    // Check cache first
    const cacheKey = `poa_${poaNumber}_${idNumber}`;
    const cached = this.getCached(cacheKey);
    if (cached) {
      return { success: true, data: cached, fromCache: true };
    }

    try {
      // Try different API endpoint patterns
      const endpoints = [
        `${this.apiBaseUrl}/poa/inquiry`,
        `${this.apiBaseUrl}/powerOfAttorney/inquiry`,
        `${this.apiBaseUrl}/inquiry/poa`,
        `${this.baseUrl}/api/v1/poa/inquiry`,
        `${this.baseUrl}/services/poa/validate`
      ];

      for (const endpoint of endpoints) {
        try {
          const response = await this.client.post(endpoint, {
            poaNumber,
            idNumber,
            attorneyNumber: poaNumber,
            principalId: idNumber
          });

          if (response.data) {
            const result = this.normalizePOAResponse(response.data);
            this.setCache(cacheKey, result);
            return { success: true, data: result };
          }
        } catch (err) {
          continue;
        }
      }

      // Try GET requests
      for (const endpoint of endpoints) {
        try {
          const response = await this.client.get(
            `${endpoint}?poaNumber=${poaNumber}&idNumber=${idNumber}`
          );
          if (response.data) {
            const result = this.normalizePOAResponse(response.data);
            this.setCache(cacheKey, result);
            return { success: true, data: result };
          }
        } catch (err) {
          continue;
        }
      }

      return {
        success: false,
        error: 'لم يتم العثور على بيانات الوكالة',
        note: 'يرجى التحقق من رقم الوكالة ورقم الهوية'
      };
    } catch (error) {
      console.error('MOJ POA Inquiry Error:', error.message);
      return {
        success: false,
        error: 'فشل الاتصال ببوابة وزارة العدل',
        details: error.message
      };
    }
  }

  /**
   * Normalize attorney response to standard format
   */
  normalizeAttorneyResponse(data) {
    // Handle different response structures
    const attorney = data.data || data.result || data;

    return {
      attorneyId: attorney.attorneyId || attorney.idNumber || attorney.id,
      name: attorney.name || attorney.attorneyName || attorney.fullName,
      nameArabic: attorney.nameAr || attorney.arabicName || attorney.name,
      licenseNumber: attorney.licenseNumber || attorney.license,
      licenseStatus: attorney.status || attorney.licenseStatus,
      isActive: attorney.isActive ?? (attorney.status === 'active' || attorney.status === 'نشط'),
      specializations: attorney.specializations || attorney.expertise || [],
      region: attorney.region || attorney.location,
      phone: attorney.phone || attorney.contactNumber,
      email: attorney.email,
      issueDate: attorney.issueDate || attorney.licenseIssueDate,
      expiryDate: attorney.expiryDate || attorney.licenseExpiryDate,
      verified: true,
      verifiedAt: new Date().toISOString(),
      source: 'MOJ Portal'
    };
  }

  /**
   * Normalize POA response to standard format
   */
  normalizePOAResponse(data) {
    // Handle different response structures
    const poa = data.data || data.result || data;

    return {
      poaNumber: poa.poaNumber || poa.attorneyNumber || poa.number,
      status: poa.status || poa.poaStatus,
      isActive: poa.isActive ?? (poa.status === 'active' || poa.status === 'سارية'),

      // Principal (الموكل)
      principal: {
        name: poa.principalName || poa.principal?.name,
        idNumber: poa.principalId || poa.principal?.idNumber,
        nationality: poa.principalNationality || poa.principal?.nationality
      },

      // Attorney (الوكيل)
      attorney: {
        name: poa.attorneyName || poa.attorney?.name,
        idNumber: poa.attorneyId || poa.attorney?.idNumber,
        type: poa.attorneyType || poa.attorney?.type
      },

      // POA Details
      issueDate: poa.issueDate || poa.createdAt,
      expiryDate: poa.expiryDate || poa.endDate,
      notaryNumber: poa.notaryNumber || poa.notary,
      notaryLocation: poa.notaryLocation || poa.issuingAuthority,

      // Powers and scope
      powers: poa.powers || poa.scope || poa.permissions || [],
      limitations: poa.limitations || poa.restrictions,
      poaType: poa.type || poa.poaType,

      verified: true,
      verifiedAt: new Date().toISOString(),
      source: 'MOJ Portal'
    };
  }

  /**
   * Validate POA is still active and not expired
   */
  async validatePOA(poaNumber, idNumber) {
    const result = await this.inquirePowerOfAttorney(poaNumber, idNumber);

    if (!result.success) {
      return result;
    }

    const poa = result.data;
    const now = new Date();
    const expiryDate = poa.expiryDate ? new Date(poa.expiryDate) : null;

    return {
      success: true,
      data: {
        ...poa,
        isValid: poa.isActive && (!expiryDate || expiryDate > now),
        isExpired: expiryDate && expiryDate < now,
        daysUntilExpiry: expiryDate ? Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24)) : null
      }
    };
  }

  /**
   * Check if an attorney is licensed and active
   */
  async validateAttorney(attorneyId) {
    const result = await this.inquireAttorney(attorneyId);

    if (!result.success) {
      return result;
    }

    const attorney = result.data;
    const now = new Date();
    const expiryDate = attorney.expiryDate ? new Date(attorney.expiryDate) : null;

    return {
      success: true,
      data: {
        ...attorney,
        isValid: attorney.isActive && (!expiryDate || expiryDate > now),
        isExpired: expiryDate && expiryDate < now,
        daysUntilExpiry: expiryDate ? Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24)) : null
      }
    };
  }

  /**
   * Clear the cache
   */
  clearCache() {
    this.cache.clear();
  }
}

// Export singleton instance
module.exports = new MOJPortalService();
