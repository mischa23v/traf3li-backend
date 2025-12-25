/**
 * Geographic Anomaly Detection Service
 *
 * Detects suspicious logins based on geographic location changes and travel patterns.
 * Implements impossible travel detection by calculating travel speeds between login locations.
 *
 * Features:
 * - Impossible travel detection (travel speed > 500 km/h by default)
 * - First login from new country detection
 * - VPN/Proxy IP range detection
 * - Unusual login time detection
 * - GeoIP lookup with caching
 * - Configurable anomaly actions (block, verify, notify, log)
 *
 * Integration:
 * - Works with loginHistory.model.js for historical tracking
 * - Integrates with securityMonitor.service.js for incident creation
 * - Uses IP-API.com for free geolocation (15 requests/min limit)
 * - Caches geoip lookups to reduce API calls
 */

const LoginHistory = require('../models/loginHistory.model');
const SecurityIncident = require('../models/securityIncident.model');
const securityMonitorService = require('./securityMonitor.service');
const cacheService = require('./cache.service');
const logger = require('../utils/logger');
const axios = require('axios');

// Configuration from environment variables
const ENABLE_GEO_ANOMALY_DETECTION = process.env.ENABLE_GEO_ANOMALY_DETECTION !== 'false'; // Default: true
const MAX_TRAVEL_SPEED_KMH = parseInt(process.env.MAX_TRAVEL_SPEED_KMH) || 500; // Default: 500 km/h
const ANOMALY_ACTION = process.env.ANOMALY_ACTION || 'verify'; // Options: block, verify, notify, log

// IP-API.com endpoints (free tier: 45 requests/minute)
const GEOIP_API_URL = 'http://ip-api.com/json';

class GeoAnomalyDetectionService {
  /**
   * Detect geographic anomalies for a login attempt
   * @param {String} userId - User ID
   * @param {String} ip - IP address
   * @param {Date} currentTime - Current login timestamp
   * @param {Object} deviceInfo - Device information
   * @returns {Promise<Object>} - Detection result with anomaly details
   */
  async detectAnomalies(userId, ip, currentTime = new Date(), deviceInfo = {}) {
    try {
      // Check if geo anomaly detection is enabled
      if (!ENABLE_GEO_ANOMALY_DETECTION) {
        return {
          anomalous: false,
          action: 'none',
          message: 'Geo anomaly detection is disabled',
        };
      }

      // Get current location from IP
      const currentLocation = await this.getLocationFromIP(ip);

      if (!currentLocation || !currentLocation.lat || !currentLocation.lng) {
        logger.warn('Unable to get location from IP', { ip });
        return {
          anomalous: false,
          action: 'none',
          message: 'Unable to determine location from IP',
          currentLocation: null,
        };
      }

      // Get user's login history with valid coordinates
      const loginHistory = await this.getUserLoginHistory(userId, 10);

      // If no history, this is the first login - not anomalous but worth logging
      if (!loginHistory || loginHistory.length === 0) {
        await this.recordLogin(userId, ip, currentLocation, currentTime, deviceInfo, {
          isAnomalous: false,
          loginStatus: 'success',
        });

        return {
          anomalous: false,
          action: 'none',
          message: 'First login - no history to compare',
          currentLocation,
        };
      }

      // Get the most recent successful login
      const lastLogin = loginHistory[0];

      // Calculate anomaly factors
      const anomalyFactors = [];
      let riskScore = 0;
      let travelSpeed = 0;
      let distance = 0;
      let timeDelta = 0;

      // Factor 1: Impossible travel detection
      const impossibleTravelResult = await this.detectImpossibleTravel(
        userId,
        currentLocation,
        currentTime,
        lastLogin
      );

      if (impossibleTravelResult.isImpossible) {
        anomalyFactors.push('impossible_travel');
        riskScore += 80; // High risk
        travelSpeed = impossibleTravelResult.speed;
        distance = impossibleTravelResult.distance;
        timeDelta = impossibleTravelResult.timeDelta;
      }

      // Factor 2: New country detection
      const isNewCountry = await this.isNewCountry(userId, currentLocation.country);
      if (isNewCountry) {
        anomalyFactors.push('new_country');
        riskScore += 30;
      }

      // Factor 3: VPN/Proxy detection
      if (currentLocation.proxy || currentLocation.hosting) {
        anomalyFactors.push('vpn_or_proxy');
        riskScore += 20;
      }

      // Factor 4: Unusual login time
      const isUnusualTime = this.isUnusualLoginTime(currentTime, currentLocation.timezone);
      if (isUnusualTime) {
        anomalyFactors.push('unusual_time');
        riskScore += 15;
      }

      // Factor 5: New device
      if (deviceInfo.deviceId) {
        const isNewDevice = await this.isNewDevice(userId, deviceInfo.deviceId);
        if (isNewDevice) {
          anomalyFactors.push('new_device');
          riskScore += 25;
        }
      }

      // Determine if anomalous (threshold: 50)
      const isAnomalous = riskScore >= 50;

      // Determine action based on configuration and risk score
      let action = 'none';
      let requiresVerification = false;
      let loginStatus = 'success';

      if (isAnomalous) {
        if (ANOMALY_ACTION === 'block') {
          action = 'block';
          loginStatus = 'blocked';
        } else if (ANOMALY_ACTION === 'verify' || riskScore >= 80) {
          action = 'verify';
          requiresVerification = true;
          loginStatus = 'verification_required';
        } else if (ANOMALY_ACTION === 'notify') {
          action = 'notify';
          loginStatus = 'success';
        } else {
          action = 'log';
          loginStatus = 'success';
        }
      }

      // Record login in history
      const loginRecord = await this.recordLogin(
        userId,
        ip,
        currentLocation,
        currentTime,
        deviceInfo,
        {
          isAnomalous,
          loginStatus,
          requiresVerification,
          anomalyDetails: {
            type: impossibleTravelResult.isImpossible ? 'impossible_travel' :
                  isNewCountry ? 'new_country' : 'suspicious_pattern',
            riskScore,
            travelSpeed,
            distance,
            timeDelta,
            previousLocation: lastLogin ? {
              country: lastLogin.location?.country,
              city: lastLogin.location?.city,
              lat: lastLogin.location?.lat,
              lng: lastLogin.location?.lng,
            } : null,
            factors: anomalyFactors,
          },
          isVPN: currentLocation.proxy || false,
          isProxy: currentLocation.proxy || false,
        }
      );

      // Create security incident for high-risk anomalies
      if (isAnomalous && riskScore >= 70) {
        await this.createSecurityIncident(userId, loginRecord, {
          riskScore,
          anomalyFactors,
          currentLocation,
          lastLogin,
          travelSpeed,
          distance,
          timeDelta,
        });
      }

      return {
        anomalous: isAnomalous,
        action,
        riskScore,
        factors: anomalyFactors,
        currentLocation,
        lastLogin: lastLogin ? {
          country: lastLogin.location?.country,
          city: lastLogin.location?.city,
          timestamp: lastLogin.timestamp,
        } : null,
        travelSpeed,
        distance,
        timeDelta,
        requiresVerification,
        loginRecord,
        message: isAnomalous
          ? `Suspicious login detected: ${anomalyFactors.join(', ')}`
          : 'Login appears normal',
      };
    } catch (error) {
      logger.error('Error in detectAnomalies:', {
        error: error.message,
        userId,
        ip,
      });
      return {
        anomalous: false,
        action: 'none',
        error: error.message,
        message: 'Error detecting anomalies',
      };
    }
  }

  /**
   * Detect impossible travel between two locations
   * @param {String} userId - User ID
   * @param {Object} currentLocation - Current location {lat, lng, country, city}
   * @param {Date} currentTime - Current login time
   * @param {Object} lastLogin - Last login record (optional, will fetch if not provided)
   * @returns {Promise<Object>} - Detection result with speed, distance, and time delta
   */
  async detectImpossibleTravel(userId, currentLocation, currentTime, lastLogin = null) {
    try {
      // Get last login if not provided
      if (!lastLogin) {
        const loginHistory = await this.getUserLoginHistory(userId, 1);
        if (!loginHistory || loginHistory.length === 0) {
          return {
            isImpossible: false,
            message: 'No previous login to compare',
          };
        }
        lastLogin = loginHistory[0];
      }

      // Validate coordinates
      if (!lastLogin.location?.lat || !lastLogin.location?.lng) {
        return {
          isImpossible: false,
          message: 'Previous login has no valid coordinates',
        };
      }

      if (!currentLocation.lat || !currentLocation.lng) {
        return {
          isImpossible: false,
          message: 'Current location has no valid coordinates',
        };
      }

      // Calculate distance between locations (in km)
      const distance = this.calculateDistance(
        lastLogin.location.lat,
        lastLogin.location.lng,
        currentLocation.lat,
        currentLocation.lng
      );

      // Calculate time difference (in seconds)
      const timeDelta = (currentTime - new Date(lastLogin.timestamp)) / 1000;

      // Calculate travel speed (km/h)
      const speed = this.calculateTravelSpeed(
        { lat: lastLogin.location.lat, lng: lastLogin.location.lng },
        { lat: currentLocation.lat, lng: currentLocation.lng },
        timeDelta
      );

      // Determine if impossible (speed > threshold)
      const isImpossible = this.isAnomalous(speed);

      return {
        isImpossible,
        speed: Math.round(speed),
        distance: Math.round(distance),
        timeDelta: Math.round(timeDelta),
        threshold: MAX_TRAVEL_SPEED_KMH,
        message: isImpossible
          ? `Impossible travel: ${Math.round(distance)}km in ${Math.round(timeDelta/60)} minutes (${Math.round(speed)} km/h)`
          : 'Travel speed is plausible',
      };
    } catch (error) {
      logger.error('Error in detectImpossibleTravel:', error);
      return {
        isImpossible: false,
        error: error.message,
      };
    }
  }

  /**
   * Get user's login history with valid coordinates
   * @param {String} userId - User ID
   * @param {Number} limit - Number of records to retrieve
   * @returns {Promise<Array>} - Login history records
   */
  async getUserLoginHistory(userId, limit = 10) {
    try {
      return await LoginHistory.getUserLoginHistory(userId, limit);
    } catch (error) {
      logger.error('Error getting user login history:', error);
      return [];
    }
  }

  /**
   * Calculate travel speed between two locations
   * @param {Object} loc1 - First location {lat, lng}
   * @param {Object} loc2 - Second location {lat, lng}
   * @param {Number} timeDelta - Time difference in seconds
   * @returns {Number} - Speed in km/h
   */
  calculateTravelSpeed(loc1, loc2, timeDelta) {
    try {
      // Calculate distance in km
      const distance = this.calculateDistance(loc1.lat, loc1.lng, loc2.lat, loc2.lng);

      // Convert time from seconds to hours
      const timeHours = timeDelta / 3600;

      // Avoid division by zero
      if (timeHours <= 0) {
        return Infinity;
      }

      // Calculate speed (km/h)
      const speed = distance / timeHours;

      return speed;
    } catch (error) {
      logger.error('Error calculating travel speed:', error);
      return 0;
    }
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   * @param {Number} lat1 - Latitude 1
   * @param {Number} lng1 - Longitude 1
   * @param {Number} lat2 - Latitude 2
   * @param {Number} lng2 - Longitude 2
   * @returns {Number} - Distance in kilometers
   */
  calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Earth's radius in km

    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
      Math.cos(this.toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return distance;
  }

  /**
   * Convert degrees to radians
   * @param {Number} degrees
   * @returns {Number}
   */
  toRad(degrees) {
    return degrees * (Math.PI / 180);
  }

  /**
   * Check if travel speed is anomalous (impossible)
   * @param {Number} speed - Speed in km/h
   * @returns {Boolean}
   */
  isAnomalous(speed) {
    return speed > MAX_TRAVEL_SPEED_KMH;
  }

  /**
   * Get location from IP address using IP-API.com
   * @param {String} ip - IP address
   * @returns {Promise<Object>} - Location data
   */
  async getLocationFromIP(ip) {
    try {
      // Check if localhost/private IP
      if (this.isPrivateIP(ip)) {
        logger.warn('Private IP detected, using default location', { ip });
        return {
          country: 'Unknown',
          countryCode: 'XX',
          region: 'Unknown',
          regionCode: 'XX',
          city: 'Unknown',
          lat: null,
          lng: null,
          timezone: 'UTC',
          proxy: false,
          hosting: false,
        };
      }

      // Check cache first (1 hour TTL)
      const cacheKey = `geoip:${ip}`;
      const cachedLocation = await cacheService.get(cacheKey);

      if (cachedLocation) {
        logger.debug('Using cached geoip lookup', { ip });
        return cachedLocation;
      }

      // Make API request to IP-API.com
      // Fields: country,countryCode,region,regionName,city,lat,lon,timezone,proxy,hosting
      const response = await axios.get(`${GEOIP_API_URL}/${ip}`, {
        params: {
          fields: 'status,message,country,countryCode,region,regionName,city,lat,lon,timezone,proxy,hosting',
        },
        timeout: 5000, // 5 second timeout
      });

      if (response.data.status === 'fail') {
        logger.warn('GeoIP lookup failed', { ip, message: response.data.message });
        return null;
      }

      const location = {
        country: response.data.country,
        countryCode: response.data.countryCode,
        region: response.data.regionName,
        regionCode: response.data.region,
        city: response.data.city,
        lat: response.data.lat,
        lng: response.data.lon,
        timezone: response.data.timezone,
        proxy: response.data.proxy || false,
        hosting: response.data.hosting || false,
      };

      // Cache for 1 hour
      await cacheService.set(cacheKey, location, 3600);

      return location;
    } catch (error) {
      logger.error('Error getting location from IP:', {
        error: error.message,
        ip,
      });
      return null;
    }
  }

  /**
   * Check if IP is private/local
   * @param {String} ip - IP address
   * @returns {Boolean}
   */
  isPrivateIP(ip) {
    // Remove IPv6 prefix if present
    const cleanIP = ip.replace(/^::ffff:/, '');

    // Check for localhost
    if (cleanIP === '127.0.0.1' || cleanIP === 'localhost' || cleanIP === '::1') {
      return true;
    }

    // Check for private IP ranges
    const privateRanges = [
      /^10\./,
      /^172\.(1[6-9]|2\d|3[01])\./,
      /^192\.168\./,
      /^169\.254\./, // Link-local
    ];

    return privateRanges.some(range => range.test(cleanIP));
  }

  /**
   * Check if login is from a new country
   * @param {String} userId - User ID
   * @param {String} country - Country name
   * @returns {Promise<Boolean>}
   */
  async isNewCountry(userId, country) {
    try {
      const loginHistory = await LoginHistory.find({
        userId,
        'location.country': country,
        loginStatus: 'success',
      })
        .limit(1)
        .lean();

      return loginHistory.length === 0;
    } catch (error) {
      logger.error('Error checking new country:', error);
      return false;
    }
  }

  /**
   * Check if login is from a new device
   * @param {String} userId - User ID
   * @param {String} deviceId - Device ID/fingerprint
   * @returns {Promise<Boolean>}
   */
  async isNewDevice(userId, deviceId) {
    try {
      const loginHistory = await LoginHistory.find({
        userId,
        'device.deviceId': deviceId,
        loginStatus: 'success',
      })
        .limit(1)
        .lean();

      return loginHistory.length === 0;
    } catch (error) {
      logger.error('Error checking new device:', error);
      return false;
    }
  }

  /**
   * Check if login time is unusual (outside typical hours)
   * @param {Date} loginTime - Login timestamp
   * @param {String} timezone - User's timezone
   * @returns {Boolean}
   */
  isUnusualLoginTime(loginTime, timezone = 'UTC') {
    try {
      const hour = loginTime.getUTCHours(); // Simple UTC-based check
      // Consider 10 PM - 6 AM as unusual (22:00 - 06:00)
      return hour >= 22 || hour <= 6;
    } catch (error) {
      logger.error('Error checking unusual login time:', error);
      return false;
    }
  }

  /**
   * Record login in history
   * @param {String} userId - User ID
   * @param {String} ip - IP address
   * @param {Object} location - Location data
   * @param {Date} timestamp - Login timestamp
   * @param {Object} deviceInfo - Device information
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} - Login record
   */
  async recordLogin(userId, ip, location, timestamp, deviceInfo = {}, options = {}) {
    try {
      const loginData = {
        userId,
        ip,
        location: {
          country: location.country,
          region: location.region,
          city: location.city,
          lat: location.lat,
          lng: location.lng,
          timezone: location.timezone,
          countryCode: location.countryCode,
          regionCode: location.regionCode,
        },
        device: {
          userAgent: deviceInfo.userAgent,
          deviceType: deviceInfo.deviceType,
          os: deviceInfo.os,
          browser: deviceInfo.browser,
          deviceId: deviceInfo.deviceId,
          fingerprint: deviceInfo.fingerprint,
        },
        timestamp,
        loginStatus: options.loginStatus || 'success',
        isAnomalous: options.isAnomalous || false,
        anomalyDetails: options.anomalyDetails || null,
        isVPN: options.isVPN || false,
        isProxy: options.isProxy || false,
        requiresVerification: options.requiresVerification || false,
        firmId: deviceInfo.firmId || null,
      };

      const loginRecord = await LoginHistory.recordLogin(loginData);
      return loginRecord;
    } catch (error) {
      logger.error('Error recording login:', error);
      throw error;
    }
  }

  /**
   * Create security incident for anomalous login
   * @param {String} userId - User ID
   * @param {Object} loginRecord - Login record
   * @param {Object} anomalyData - Anomaly details
   * @returns {Promise<Object>} - Security incident
   */
  async createSecurityIncident(userId, loginRecord, anomalyData) {
    try {
      const { riskScore, anomalyFactors, currentLocation, lastLogin, travelSpeed, distance, timeDelta } = anomalyData;

      const incidentType = travelSpeed > MAX_TRAVEL_SPEED_KMH ? 'suspicious_login' : 'suspicious_login';
      const severity = riskScore >= 80 ? 'high' : riskScore >= 60 ? 'medium' : 'low';

      const incidentData = {
        type: incidentType,
        severity,
        userId: loginRecord.userId,
        userEmail: null, // Will be populated by security monitor service
        ip: loginRecord.ip,
        userAgent: loginRecord.device?.userAgent,
        location: {
          country: currentLocation.country,
          city: currentLocation.city,
          coordinates: {
            lat: currentLocation.lat,
            lng: currentLocation.lng,
          },
        },
        details: {
          riskScore,
          factors: anomalyFactors,
          travelSpeed: Math.round(travelSpeed),
          distance: Math.round(distance),
          timeDelta: Math.round(timeDelta),
          currentLocation: {
            country: currentLocation.country,
            city: currentLocation.city,
          },
          previousLocation: lastLogin ? {
            country: lastLogin.location?.country,
            city: lastLogin.location?.city,
            timestamp: lastLogin.timestamp,
          } : null,
        },
        description: `Suspicious login detected: ${anomalyFactors.join(', ')}. ` +
                    (travelSpeed > MAX_TRAVEL_SPEED_KMH
                      ? `Impossible travel: ${Math.round(distance)}km in ${Math.round(timeDelta/60)} minutes (${Math.round(travelSpeed)} km/h).`
                      : ''),
        riskScore,
        requiresAttention: severity === 'high' || severity === 'critical',
        firmId: loginRecord.firmId,
      };

      const incident = await securityMonitorService.createIncident(incidentData, {
        firmId: loginRecord.firmId,
      });

      // Link login record to incident
      await loginRecord.linkToIncident(incident._id);

      // Send alerts for high severity incidents
      if (severity === 'high' || severity === 'critical') {
        await securityMonitorService.sendAlerts(incident, {
          firmId: loginRecord.firmId,
        });
      }

      logger.info('Security incident created for anomalous login', {
        incidentId: incident._id,
        userId: loginRecord.userId,
        riskScore,
      });

      return incident;
    } catch (error) {
      logger.error('Error creating security incident:', error);
      throw error;
    }
  }

  /**
   * Get anomaly detection statistics for a user
   * @param {String} userId - User ID
   * @param {Object} dateRange - Date range filter
   * @returns {Promise<Object>} - Statistics
   */
  async getAnomalyStats(userId, dateRange = {}) {
    try {
      const loginStats = await LoginHistory.getLoginStats(userId, dateRange);

      const anomalousLogins = await LoginHistory.getAnomalousLogins(userId, {
        startDate: dateRange.startDate,
        limit: 10,
      });

      return {
        ...loginStats,
        anomalousLogins,
        anomalyRate: loginStats.total > 0
          ? Math.round((loginStats.anomalous / loginStats.total) * 100)
          : 0,
      };
    } catch (error) {
      logger.error('Error getting anomaly stats:', error);
      throw error;
    }
  }
}

module.exports = new GeoAnomalyDetectionService();
