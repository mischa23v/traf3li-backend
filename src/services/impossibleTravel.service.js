/**
 * Impossible Travel Detection Service
 *
 * Detects physically impossible login patterns based on geographic distance
 * and time between logins. Uses Haversine formula for accurate distance calculation.
 *
 * Enterprise Pattern: AWS GuardDuty, Microsoft Defender, Google Cloud Security
 *
 * Detection criteria:
 * - Travel speed > 500 mph (800 km/h) between logins
 * - Accounts for commercial flight speeds with buffer
 * - Excludes VPN/proxy indicators when possible
 *
 * @see https://docs.aws.amazon.com/guardduty/latest/ug/guardduty_finding-types-iam.html
 */

const logger = require('../utils/logger');
const AuditLog = require('../models/auditLog.model');
const cacheService = require('./cache.service');

// Country coordinates (capital cities as approximation)
// In production, use a proper geolocation service or database
const COUNTRY_COORDINATES = {
    'SA': { lat: 24.7136, lng: 46.6753, name: 'Saudi Arabia' },
    'AE': { lat: 25.2048, lng: 55.2708, name: 'United Arab Emirates' },
    'US': { lat: 38.9072, lng: -77.0369, name: 'United States' },
    'GB': { lat: 51.5074, lng: -0.1278, name: 'United Kingdom' },
    'DE': { lat: 52.5200, lng: 13.4050, name: 'Germany' },
    'FR': { lat: 48.8566, lng: 2.3522, name: 'France' },
    'IN': { lat: 28.6139, lng: 77.2090, name: 'India' },
    'CN': { lat: 39.9042, lng: 116.4074, name: 'China' },
    'JP': { lat: 35.6762, lng: 139.6503, name: 'Japan' },
    'AU': { lat: -35.2809, lng: 149.1300, name: 'Australia' },
    'BR': { lat: -15.7801, lng: -47.9292, name: 'Brazil' },
    'CA': { lat: 45.4215, lng: -75.6972, name: 'Canada' },
    'EG': { lat: 30.0444, lng: 31.2357, name: 'Egypt' },
    'JO': { lat: 31.9454, lng: 35.9284, name: 'Jordan' },
    'KW': { lat: 29.3759, lng: 47.9774, name: 'Kuwait' },
    'QA': { lat: 25.2854, lng: 51.5310, name: 'Qatar' },
    'BH': { lat: 26.0667, lng: 50.5577, name: 'Bahrain' },
    'OM': { lat: 23.5880, lng: 58.3829, name: 'Oman' },
    'PK': { lat: 33.6844, lng: 73.0479, name: 'Pakistan' },
    'TR': { lat: 39.9334, lng: 32.8597, name: 'Turkey' },
    'RU': { lat: 55.7558, lng: 37.6173, name: 'Russia' },
    'ZA': { lat: -25.7479, lng: 28.2293, name: 'South Africa' },
    'SG': { lat: 1.3521, lng: 103.8198, name: 'Singapore' },
    'MY': { lat: 3.1390, lng: 101.6869, name: 'Malaysia' },
    'ID': { lat: -6.2088, lng: 106.8456, name: 'Indonesia' },
    'PH': { lat: 14.5995, lng: 120.9842, name: 'Philippines' },
    'TH': { lat: 13.7563, lng: 100.5018, name: 'Thailand' },
    'VN': { lat: 21.0285, lng: 105.8542, name: 'Vietnam' },
    'KR': { lat: 37.5665, lng: 126.9780, name: 'South Korea' },
    'NL': { lat: 52.3676, lng: 4.9041, name: 'Netherlands' },
    'BE': { lat: 50.8503, lng: 4.3517, name: 'Belgium' },
    'IT': { lat: 41.9028, lng: 12.4964, name: 'Italy' },
    'ES': { lat: 40.4168, lng: -3.7038, name: 'Spain' },
    'PT': { lat: 38.7223, lng: -9.1393, name: 'Portugal' },
    'CH': { lat: 46.9480, lng: 7.4474, name: 'Switzerland' },
    'AT': { lat: 48.2082, lng: 16.3738, name: 'Austria' },
    'SE': { lat: 59.3293, lng: 18.0686, name: 'Sweden' },
    'NO': { lat: 59.9139, lng: 10.7522, name: 'Norway' },
    'DK': { lat: 55.6761, lng: 12.5683, name: 'Denmark' },
    'FI': { lat: 60.1699, lng: 24.9384, name: 'Finland' },
    'PL': { lat: 52.2297, lng: 21.0122, name: 'Poland' },
    'CZ': { lat: 50.0755, lng: 14.4378, name: 'Czech Republic' },
    'GR': { lat: 37.9838, lng: 23.7275, name: 'Greece' },
    'IL': { lat: 31.7683, lng: 35.2137, name: 'Israel' },
    'LB': { lat: 33.8938, lng: 35.5018, name: 'Lebanon' },
    'IQ': { lat: 33.3152, lng: 44.3661, name: 'Iraq' },
    'IR': { lat: 35.6892, lng: 51.3890, name: 'Iran' },
    'AF': { lat: 34.5553, lng: 69.2075, name: 'Afghanistan' },
    'NG': { lat: 9.0765, lng: 7.3986, name: 'Nigeria' },
    'KE': { lat: -1.2921, lng: 36.8219, name: 'Kenya' },
    'MA': { lat: 33.9716, lng: -6.8498, name: 'Morocco' },
    'TN': { lat: 36.8065, lng: 10.1815, name: 'Tunisia' },
    'DZ': { lat: 36.7538, lng: 3.0588, name: 'Algeria' },
    'LY': { lat: 32.8872, lng: 13.1913, name: 'Libya' },
    'SD': { lat: 15.5007, lng: 32.5599, name: 'Sudan' },
    'MX': { lat: 19.4326, lng: -99.1332, name: 'Mexico' },
    'AR': { lat: -34.6037, lng: -58.3816, name: 'Argentina' },
    'CL': { lat: -33.4489, lng: -70.6693, name: 'Chile' },
    'CO': { lat: 4.7110, lng: -74.0721, name: 'Colombia' },
    'PE': { lat: -12.0464, lng: -77.0428, name: 'Peru' },
    'VE': { lat: 10.4806, lng: -66.9036, name: 'Venezuela' },
    'NZ': { lat: -41.2865, lng: 174.7762, name: 'New Zealand' },
    'HK': { lat: 22.3193, lng: 114.1694, name: 'Hong Kong' },
    'TW': { lat: 25.0330, lng: 121.5654, name: 'Taiwan' },
    'BD': { lat: 23.8103, lng: 90.4125, name: 'Bangladesh' },
    'LK': { lat: 6.9271, lng: 79.8612, name: 'Sri Lanka' },
    'NP': { lat: 27.7172, lng: 85.3240, name: 'Nepal' },
    'MM': { lat: 19.7633, lng: 96.0785, name: 'Myanmar' },
    'UA': { lat: 50.4501, lng: 30.5234, name: 'Ukraine' },
    'RO': { lat: 44.4268, lng: 26.1025, name: 'Romania' },
    'HU': { lat: 47.4979, lng: 19.0402, name: 'Hungary' },
    'IE': { lat: 53.3498, lng: -6.2603, name: 'Ireland' },
    'YE': { lat: 15.3694, lng: 44.1910, name: 'Yemen' },
    'SY': { lat: 33.5138, lng: 36.2765, name: 'Syria' }
};

// Maximum physically possible travel speeds (km/h)
const MAX_TRAVEL_SPEEDS = {
    // Commercial flight max speed + buffer
    COMMERCIAL_FLIGHT: 900,
    // Supersonic (Concorde was ~2180 km/h) - unlikely but possible for private jets
    SUPERSONIC: 2200,
    // Conservative threshold for alerting
    ALERT_THRESHOLD: 800
};

/**
 * Calculate distance between two points using Haversine formula
 *
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lng1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lng2 - Longitude of point 2
 * @returns {number} - Distance in kilometers
 */
function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = toRadians(lat2 - lat1);
    const dLng = toRadians(lng2 - lng1);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRadians(lat1)) *
            Math.cos(toRadians(lat2)) *
            Math.sin(dLng / 2) *
            Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}

/**
 * Convert degrees to radians
 * @param {number} degrees
 * @returns {number} radians
 */
function toRadians(degrees) {
    return degrees * (Math.PI / 180);
}

/**
 * Get coordinates for a country code
 *
 * @param {string} countryCode - ISO 3166-1 alpha-2 country code
 * @returns {Object|null} - { lat, lng, name } or null if not found
 */
function getCountryCoordinates(countryCode) {
    if (!countryCode) return null;
    return COUNTRY_COORDINATES[countryCode.toUpperCase()] || null;
}

/**
 * Calculate required travel speed between two logins
 *
 * @param {Object} login1 - First login { country, timestamp }
 * @param {Object} login2 - Second login { country, timestamp }
 * @returns {Object|null} - { distance, timeDiff, speed, isPossible, details }
 */
function calculateTravelSpeed(login1, login2) {
    const coords1 = getCountryCoordinates(login1.country);
    const coords2 = getCountryCoordinates(login2.country);

    if (!coords1 || !coords2) {
        return null; // Cannot calculate without coordinates
    }

    // Same country - no travel
    if (login1.country.toUpperCase() === login2.country.toUpperCase()) {
        return {
            distance: 0,
            timeDiff: 0,
            speed: 0,
            isPossible: true,
            details: 'Same country'
        };
    }

    // Calculate distance
    const distance = calculateDistance(
        coords1.lat,
        coords1.lng,
        coords2.lat,
        coords2.lng
    );

    // Calculate time difference in hours
    const time1 = new Date(login1.timestamp).getTime();
    const time2 = new Date(login2.timestamp).getTime();
    const timeDiffMs = Math.abs(time2 - time1);
    const timeDiffHours = timeDiffMs / (1000 * 60 * 60);

    // Avoid division by zero
    if (timeDiffHours === 0) {
        return {
            distance: Math.round(distance),
            timeDiff: 0,
            timeDiffMinutes: 0,
            speed: Infinity,
            isPossible: false,
            details: 'Simultaneous logins from different countries'
        };
    }

    // Calculate required speed
    const speed = distance / timeDiffHours;

    // Determine if travel is possible
    const isPossible = speed <= MAX_TRAVEL_SPEEDS.ALERT_THRESHOLD;

    return {
        distance: Math.round(distance),
        timeDiff: timeDiffHours,
        timeDiffMinutes: Math.round(timeDiffMs / (1000 * 60)),
        speed: Math.round(speed),
        isPossible,
        fromCountry: coords1.name,
        toCountry: coords2.name,
        details: isPossible
            ? `Travel speed ${Math.round(speed)} km/h is within normal limits`
            : `Required travel speed ${Math.round(speed)} km/h exceeds maximum possible ${MAX_TRAVEL_SPEEDS.ALERT_THRESHOLD} km/h`
    };
}

/**
 * Detect impossible travel for a user
 *
 * @param {string} userId - User ID
 * @param {Object} currentLogin - Current login details { country, ip, timestamp, userAgent }
 * @returns {Object} - Detection result
 */
async function detectImpossibleTravel(userId, currentLogin) {
    try {
        if (!currentLogin.country) {
            return {
                detected: false,
                reason: 'NO_COUNTRY_DATA',
                details: 'Current login has no country information'
            };
        }

        // Get user's recent logins from cache first
        const cacheKey = `travel:logins:${userId}`;
        let recentLogins = await cacheService.get(cacheKey);

        // If not in cache, fetch from database
        if (!recentLogins) {
            recentLogins = await AuditLog.find({
                userId,
                action: { $in: ['login', 'login_success', 'token_refresh'] },
                'metadata.country': { $exists: true },
                timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
            })
                .sort({ timestamp: -1 })
                .limit(20)
                .select('metadata.country metadata.ip timestamp')
                .lean();

            // Cache for 5 minutes
            await cacheService.set(cacheKey, recentLogins, 300);
        }

        if (!recentLogins || recentLogins.length === 0) {
            return {
                detected: false,
                reason: 'NO_PREVIOUS_LOGINS',
                details: 'No previous login data available for comparison'
            };
        }

        // Check against the most recent login
        const lastLogin = recentLogins[0];
        const lastCountry = lastLogin.metadata?.country;

        if (!lastCountry) {
            return {
                detected: false,
                reason: 'NO_PREVIOUS_COUNTRY',
                details: 'Previous login has no country information'
            };
        }

        // Calculate travel speed
        const travelAnalysis = calculateTravelSpeed(
            { country: lastCountry, timestamp: lastLogin.timestamp },
            { country: currentLogin.country, timestamp: currentLogin.timestamp || new Date() }
        );

        if (!travelAnalysis) {
            return {
                detected: false,
                reason: 'CALCULATION_ERROR',
                details: 'Could not calculate travel speed (unknown country codes)'
            };
        }

        if (!travelAnalysis.isPossible) {
            logger.warn('🚨 Impossible travel detected', {
                userId,
                from: travelAnalysis.fromCountry,
                to: travelAnalysis.toCountry,
                distance: travelAnalysis.distance,
                timeDiff: travelAnalysis.timeDiffMinutes,
                speed: travelAnalysis.speed
            });

            return {
                detected: true,
                reason: 'IMPOSSIBLE_TRAVEL',
                severity: travelAnalysis.speed > MAX_TRAVEL_SPEEDS.SUPERSONIC ? 'critical' : 'high',
                riskScore: Math.min(100, 60 + Math.round((travelAnalysis.speed - MAX_TRAVEL_SPEEDS.ALERT_THRESHOLD) / 50)),
                details: travelAnalysis.details,
                travelAnalysis: {
                    from: {
                        country: lastCountry,
                        countryName: travelAnalysis.fromCountry,
                        timestamp: lastLogin.timestamp,
                        ip: lastLogin.metadata?.ip
                    },
                    to: {
                        country: currentLogin.country,
                        countryName: travelAnalysis.toCountry,
                        timestamp: currentLogin.timestamp || new Date(),
                        ip: currentLogin.ip
                    },
                    distance: travelAnalysis.distance,
                    timeDiffMinutes: travelAnalysis.timeDiffMinutes,
                    requiredSpeed: travelAnalysis.speed,
                    maxPossibleSpeed: MAX_TRAVEL_SPEEDS.ALERT_THRESHOLD
                },
                recommendation: 'REQUIRE_MFA_OR_BLOCK'
            };
        }

        return {
            detected: false,
            reason: 'TRAVEL_POSSIBLE',
            details: travelAnalysis.details,
            travelAnalysis: {
                from: travelAnalysis.fromCountry,
                to: travelAnalysis.toCountry,
                distance: travelAnalysis.distance,
                timeDiffMinutes: travelAnalysis.timeDiffMinutes,
                speed: travelAnalysis.speed
            }
        };
    } catch (error) {
        logger.error('Error in detectImpossibleTravel:', error);
        return {
            detected: false,
            reason: 'ERROR',
            details: error.message
        };
    }
}

/**
 * Middleware to check for impossible travel on login
 *
 * @param {Object} options - Options
 * @param {boolean} options.blockOnDetection - Block the request if impossible travel detected
 * @param {boolean} options.requireMFA - Require MFA verification instead of blocking
 * @returns {Function} - Express middleware
 */
function impossibleTravelMiddleware(options = {}) {
    const { blockOnDetection = false, requireMFA = true } = options;

    return async (req, res, next) => {
        try {
            const userId = req.userID || req.user?._id;
            if (!userId) {
                return next();
            }

            // Get country from Cloudflare header or other geolocation
            const country =
                req.headers['cf-ipcountry'] ||
                req.headers['x-country-code'] ||
                req.geoip?.country;

            if (!country) {
                return next(); // Cannot check without country data
            }

            const result = await detectImpossibleTravel(userId, {
                country,
                ip: req.ip || req.headers['x-forwarded-for']?.split(',')[0],
                timestamp: new Date(),
                userAgent: req.headers['user-agent']
            });

            // Attach result to request for downstream use
            req.impossibleTravelCheck = result;

            if (result.detected) {
                if (blockOnDetection) {
                    return res.status(403).json({
                        error: true,
                        message: 'تم اكتشاف نشاط مشبوه - تم حظر تسجيل الدخول',
                        messageEn: 'Suspicious activity detected - login blocked',
                        code: 'IMPOSSIBLE_TRAVEL_DETECTED',
                        details: process.env.NODE_ENV === 'development' ? result : undefined
                    });
                }

                if (requireMFA) {
                    return res.status(401).json({
                        error: true,
                        message: 'مطلوب التحقق الإضافي',
                        messageEn: 'Additional verification required',
                        code: 'MFA_REQUIRED',
                        reason: 'SUSPICIOUS_LOCATION',
                        details: {
                            from: result.travelAnalysis?.from?.countryName,
                            to: result.travelAnalysis?.to?.countryName
                        }
                    });
                }
            }

            next();
        } catch (error) {
            logger.error('Impossible travel middleware error:', error);
            next(); // Fail open - don't block on errors
        }
    };
}

module.exports = {
    detectImpossibleTravel,
    calculateTravelSpeed,
    calculateDistance,
    getCountryCoordinates,
    impossibleTravelMiddleware,
    COUNTRY_COORDINATES,
    MAX_TRAVEL_SPEEDS
};
