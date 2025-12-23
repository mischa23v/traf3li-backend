/**
 * Wathq API Service
 *
 * Integration with Wathq (واثق) APIs for Saudi business verification.
 * Documentation: https://developer.wathq.sa
 *
 * Available APIs:
 * - Commercial Registration (السجل التجاري)
 * - Power Of Attorney (الوكالات)
 * - Real Estates (العقارات)
 * - Chamber of Commerce (الغرف التجارية)
 * - Commercial Contract (العقود التجارية)
 * - E-Delegation (التفويض الإلكتروني)
 *
 * Environment Variables Required:
 * - WATHQ_CONSUMER_KEY
 * - WATHQ_CONSUMER_SECRET
 * - WATHQ_BASE_URL (default: https://api.wathq.sa/sandbox for testing)
 */

const axios = require('axios');
const logger = require('../utils/logger');

class WathqService {
  constructor() {
    this.consumerKey = process.env.WATHQ_CONSUMER_KEY;
    this.consumerSecret = process.env.WATHQ_CONSUMER_SECRET;

    // Use sandbox for testing, production for live
    this.baseUrl = process.env.WATHQ_BASE_URL || 'https://api.wathq.sa/sandbox';

    // API endpoints
    this.endpoints = {
      commercialRegistration: '/commercial-registration',
      powerOfAttorney: '/power-of-attorney',
      realEstates: '/real-estates',
      chamberOfCommerce: '/chamber-of-commerce',
      commercialContract: '/commercial-contract',
      eDelegation: '/e-delegation'
    };

    // Cache for results (1 hour TTL for API data)
    this.cache = new Map();
    this.cacheTTL = 60 * 60 * 1000; // 1 hour

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
   * Get authorization header for API requests
   */
  getAuthHeader() {
    if (!this.consumerKey || !this.consumerSecret) {
      throw new Error('Wathq API credentials not configured');
    }

    // Wathq uses Basic Auth with consumer key and secret
    const credentials = Buffer.from(`${this.consumerKey}:${this.consumerSecret}`).toString('base64');
    return `Basic ${credentials}`;
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
   * Make authenticated request to Wathq API
   */
  async makeRequest(endpoint, method = 'GET') {
    try {
      const response = await this.client({
        method,
        url: `${this.baseUrl}${endpoint}`,
        headers: {
          'Authorization': this.getAuthHeader()
        }
      });
      return { success: true, data: response.data };
    } catch (error) {
      logger.error('Wathq API Error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        status: error.response?.status
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // COMMERCIAL REGISTRATION APIs (السجل التجاري)
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get full commercial registration information
   * @param {string} crNumber - Commercial Registration number (10 digits)
   */
  async getFullInfo(crNumber) {
    if (!crNumber) {
      return { success: false, error: 'رقم السجل التجاري مطلوب' };
    }

    const cacheKey = `cr_full_${crNumber}`;
    const cached = this.getCached(cacheKey);
    if (cached) {
      return { success: true, data: cached, fromCache: true };
    }

    const result = await this.makeRequest(
      `${this.endpoints.commercialRegistration}/fullinfo/${crNumber}`
    );

    if (result.success) {
      const normalized = this.normalizeFullInfo(result.data);
      this.setCache(cacheKey, normalized);
      return { success: true, data: normalized };
    }

    return result;
  }

  /**
   * Get basic commercial registration information
   * @param {string} crNumber - Commercial Registration number
   */
  async getBasicInfo(crNumber) {
    if (!crNumber) {
      return { success: false, error: 'رقم السجل التجاري مطلوب' };
    }

    const cacheKey = `cr_basic_${crNumber}`;
    const cached = this.getCached(cacheKey);
    if (cached) {
      return { success: true, data: cached, fromCache: true };
    }

    const result = await this.makeRequest(
      `${this.endpoints.commercialRegistration}/info/${crNumber}`
    );

    if (result.success) {
      const normalized = this.normalizeBasicInfo(result.data);
      this.setCache(cacheKey, normalized);
      return { success: true, data: normalized };
    }

    return result;
  }

  /**
   * Get commercial registration status
   * @param {string} crNumber - Commercial Registration number
   */
  async getStatus(crNumber) {
    if (!crNumber) {
      return { success: false, error: 'رقم السجل التجاري مطلوب' };
    }

    const result = await this.makeRequest(
      `${this.endpoints.commercialRegistration}/status/${crNumber}`
    );

    if (result.success) {
      return {
        success: true,
        data: {
          crNumber,
          statusId: result.data.id,
          statusName: result.data.name,
          isActive: result.data.id === 1 || result.data.name?.includes('قائم') || result.data.name?.includes('active')
        }
      };
    }

    return result;
  }

  /**
   * Get commercial registration branches
   * @param {string} crNumber - Commercial Registration number
   */
  async getBranches(crNumber) {
    if (!crNumber) {
      return { success: false, error: 'رقم السجل التجاري مطلوب' };
    }

    const result = await this.makeRequest(
      `${this.endpoints.commercialRegistration}/branches/${crNumber}`
    );

    if (result.success) {
      return {
        success: true,
        data: (result.data || []).map(branch => ({
          crNationalNumber: branch.crNationalNumber,
          crNumber: branch.crNumber,
          name: branch.name,
          isMain: branch.isMain,
          entityType: branch.entityType
        }))
      };
    }

    return result;
  }

  /**
   * Get commercial registration capital details
   * @param {string} crNumber - Commercial Registration number
   */
  async getCapital(crNumber) {
    if (!crNumber) {
      return { success: false, error: 'رقم السجل التجاري مطلوب' };
    }

    const result = await this.makeRequest(
      `${this.endpoints.commercialRegistration}/capital/${crNumber}`
    );

    if (result.success) {
      return {
        success: true,
        data: {
          currency: result.data.currencyName || 'SAR',
          currencyId: result.data.currencyId,
          capital: result.data.capital,
          contributionCapital: result.data.contributionCapital,
          stockCapital: result.data.stockCapital
        }
      };
    }

    return result;
  }

  /**
   * Get managers and board of directors
   * @param {string} crNumber - Commercial Registration number
   */
  async getManagers(crNumber) {
    if (!crNumber) {
      return { success: false, error: 'رقم السجل التجاري مطلوب' };
    }

    const result = await this.makeRequest(
      `${this.endpoints.commercialRegistration}/managers/${crNumber}`
    );

    if (result.success) {
      return {
        success: true,
        data: (result.data || []).map(manager => ({
          name: manager.name,
          typeId: manager.typeId,
          typeName: manager.typeName,
          isLicensed: manager.isLicensed,
          nationalId: manager.identity?.id,
          idType: manager.identity?.typeId,
          nationality: manager.nationality?.name,
          nationalityId: manager.nationality?.id,
          positions: manager.positions || []
        }))
      };
    }

    return result;
  }

  /**
   * Get owners and partners with their shares
   * @param {string} crNumber - Commercial Registration number
   */
  async getOwners(crNumber) {
    if (!crNumber) {
      return { success: false, error: 'رقم السجل التجاري مطلوب' };
    }

    const result = await this.makeRequest(
      `${this.endpoints.commercialRegistration}/owners/${crNumber}`
    );

    if (result.success) {
      return {
        success: true,
        data: (result.data || []).map(owner => ({
          name: owner.name,
          typeId: owner.typeId,
          typeName: owner.typeName,
          nationalId: owner.identity?.id,
          idType: owner.identity?.typeId,
          nationality: owner.nationality?.name,
          nationalityId: owner.nationality?.id,
          share: owner.partnerShare?.value,
          shareType: owner.partnerShare?.typeId,
          crNumber: owner.crNumber,
          licenseNo: owner.licenseNo
        }))
      };
    }

    return result;
  }

  /**
   * Get related commercial registrations
   * @param {string} id - ID number (national ID or CR number)
   * @param {string} idType - Type of ID ('1' for national ID, '2' for CR number)
   */
  async getRelated(id, idType = '1') {
    if (!id) {
      return { success: false, error: 'رقم الهوية أو السجل التجاري مطلوب' };
    }

    const result = await this.makeRequest(
      `${this.endpoints.commercialRegistration}/related/${id}/${idType}`
    );

    return result;
  }

  /**
   * Check if ID is an owner or partner in a CR
   * @param {string} id - ID number
   * @param {string} idType - Type of ID
   */
  async checkOwnership(id, idType = '1') {
    if (!id) {
      return { success: false, error: 'رقم الهوية مطلوب' };
    }

    const result = await this.makeRequest(
      `${this.endpoints.commercialRegistration}/owns/${id}/${idType}`
    );

    if (result.success) {
      return {
        success: true,
        data: {
          id,
          isOwner: result.data === true || result.data?.isOwner === true
        }
      };
    }

    return result;
  }

  // ═══════════════════════════════════════════════════════════════
  // POWER OF ATTORNEY APIs (الوكالات) - If available in subscription
  // ═══════════════════════════════════════════════════════════════

  /**
   * Verify Power of Attorney via Wathq API
   * @param {string} poaNumber - Power of Attorney number
   * @param {string} idNumber - National ID number
   */
  async verifyPowerOfAttorney(poaNumber, idNumber) {
    if (!poaNumber || !idNumber) {
      return { success: false, error: 'رقم الوكالة ورقم الهوية مطلوبان' };
    }

    const cacheKey = `poa_${poaNumber}_${idNumber}`;
    const cached = this.getCached(cacheKey);
    if (cached) {
      return { success: true, data: cached, fromCache: true };
    }

    // Try the Wathq POA endpoint
    const result = await this.makeRequest(
      `${this.endpoints.powerOfAttorney}/verify/${poaNumber}/${idNumber}`
    );

    if (result.success) {
      this.setCache(cacheKey, result.data);
    }

    return result;
  }

  // ═══════════════════════════════════════════════════════════════
  // HELPER METHODS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Normalize full CR info to standard format
   */
  normalizeFullInfo(data) {
    return {
      // Basic Info
      crNationalNumber: data.crNationalNumber,
      crNumber: data.crNumber,
      versionNo: data.versionNo,
      companyName: data.name,
      companyNameEnglish: data.nameLangId === 2 ? data.name : null,

      // Status
      status: {
        id: data.status?.id,
        name: data.status?.name,
        isActive: data.status?.id === 1 || data.status?.name?.includes('قائم')
      },

      // Entity Type
      entityType: {
        id: data.entityType?.id,
        name: data.entityType?.name
      },

      // Capital
      capital: data.capital?.capital,
      currency: data.capital?.currencyName || 'SAR',

      // Duration
      companyDuration: data.companyDuration,

      // Dates
      issueDateGregorian: data.issueDateGregorian,
      issueDateHijri: data.issueDateHijri,

      // Location
      headquarterCityId: data.headquarterCityId,
      headquarterCityName: data.headquarterCityName,

      // Flags
      isMain: data.isMain,
      hasEcommerce: data.hasEcommerce,
      inLiquidationProcess: data.inLiquidationProcess,
      isLicenseBased: data.isLicenseBased,

      // Main CR (if this is a branch)
      mainCrNumber: data.mainCrNumber,
      mainCrNationalNumber: data.mainCrNationalNumber,

      // Contact Info
      contactInfo: data.contactInfo,
      eCommerce: data.eCommerce,

      // Fiscal Year
      fiscalYear: data.fiscalYear,

      // Parties (owners/partners)
      parties: (data.parties || []).map(party => ({
        name: party.name,
        nationalId: party.identity?.id,
        nationality: party.nationality?.name,
        share: party.partnerShare?.value
      })),

      // Management
      management: data.management,

      // Activities
      activities: (data.activities || []).map(activity => ({
        id: activity.id,
        name: activity.name,
        isMain: activity.isMain
      })),

      // Verification metadata
      verified: true,
      verifiedAt: new Date().toISOString(),
      source: 'Wathq API'
    };
  }

  /**
   * Normalize basic CR info to standard format
   */
  normalizeBasicInfo(data) {
    return {
      crNationalNumber: data.crNationalNumber,
      crNumber: data.crNumber,
      companyName: data.name,
      status: {
        id: data.status?.id,
        name: data.status?.name,
        isActive: data.status?.id === 1 || data.status?.name?.includes('قائم')
      },
      entityType: {
        id: data.entityType?.id,
        name: data.entityType?.name
      },
      companyDuration: data.companyDuration,
      issueDateGregorian: data.issueDateGregorian,
      issueDateHijri: data.issueDateHijri,
      headquarterCityName: data.headquarterCityName,
      isMain: data.isMain,
      hasEcommerce: data.hasEcommerce,
      inLiquidationProcess: data.inLiquidationProcess,
      activities: (data.activities || []).map(activity => ({
        id: activity.id,
        name: activity.name,
        isMain: activity.isMain
      })),
      verified: true,
      verifiedAt: new Date().toISOString(),
      source: 'Wathq API'
    };
  }

  /**
   * Clear the cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Check if API credentials are configured
   */
  isConfigured() {
    return !!(this.consumerKey && this.consumerSecret);
  }
}

// Export singleton instance
module.exports = new WathqService();
