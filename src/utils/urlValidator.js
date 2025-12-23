const dns = require('dns').promises;
const { URL } = require('url');
const ipRangeCheck = require('ip-range-check');
const logger = require('./logger');

/**
 * URL Validator Utility for SSRF Protection
 * Prevents Server-Side Request Forgery attacks by validating webhook URLs
 */

// Private IP ranges to block
const PRIVATE_IP_RANGES = [
    '127.0.0.0/8',      // Localhost
    '10.0.0.0/8',       // Private network
    '172.16.0.0/12',    // Private network
    '192.168.0.0/16',   // Private network
    '169.254.0.0/16',   // Link-local (AWS metadata, etc.)
    '0.0.0.0/8',        // Reserved/invalid
    '100.64.0.0/10',    // Shared address space (carrier-grade NAT)
    '192.0.0.0/24',     // IETF Protocol Assignments
    '192.0.2.0/24',     // Documentation (TEST-NET-1)
    '198.51.100.0/24',  // Documentation (TEST-NET-2)
    '203.0.113.0/24',   // Documentation (TEST-NET-3)
    '224.0.0.0/4',      // Multicast
    '240.0.0.0/4',      // Reserved
    '255.255.255.255/32' // Broadcast
];

// Private IPv6 ranges to block
const PRIVATE_IPV6_RANGES = [
    '::1/128',          // Localhost
    'fc00::/7',         // Unique local addresses
    'fe80::/10',        // Link-local
    'ff00::/8',         // Multicast
    '::ffff:0:0/96'     // IPv4-mapped IPv6
];

// Dangerous hostnames to block
const DANGEROUS_HOSTNAMES = [
    'localhost',
    'localhost.localdomain',
    '0.0.0.0',
    '0x7f000001',      // Hex encoded localhost
    '2130706433',      // Decimal encoded localhost
    '0177.0000.0000.0001', // Octal encoded localhost
    'broadcasthost',
    'ip6-localhost',
    'ip6-loopback',
    'ip6-localnet',
    'ip6-mcastprefix',
    'ip6-allnodes',
    'ip6-allrouters',
    'ip6-allhosts'
];

// Cloud metadata endpoints to block
const METADATA_IPS = [
    '169.254.169.254',  // AWS, Azure, Google Cloud metadata
    '169.254.169.253',  // AWS
    'fd00:ec2::254'     // AWS IPv6 metadata
];

/**
 * Check if an IP address is in a private/reserved range
 * @param {string} ip - IP address to check
 * @returns {boolean} - True if IP is private/reserved
 */
function isPrivateIP(ip) {
    if (!ip) return true;

    // Remove brackets from IPv6 addresses
    const cleanIP = ip.replace(/^\[|\]$/g, '');

    // Check for cloud metadata IPs
    if (METADATA_IPS.includes(cleanIP)) {
        return true;
    }

    // Check IPv4 private ranges
    if (cleanIP.includes('.')) {
        try {
            return ipRangeCheck(cleanIP, PRIVATE_IP_RANGES);
        } catch (error) {
            logger.error('Error checking IPv4 range:', error);
            return true; // Err on the side of caution
        }
    }

    // Check IPv6 private ranges
    if (cleanIP.includes(':')) {
        try {
            return ipRangeCheck(cleanIP, PRIVATE_IPV6_RANGES);
        } catch (error) {
            logger.error('Error checking IPv6 range:', error);
            return true; // Err on the side of caution
        }
    }

    // Unknown format, block it
    return true;
}

/**
 * Check if a hostname is dangerous (localhost, internal names, etc.)
 * @param {string} hostname - Hostname to check
 * @returns {boolean} - True if hostname is dangerous
 */
function isDangerousHost(hostname) {
    if (!hostname) return true;

    const lowerHostname = hostname.toLowerCase();

    // Check exact matches
    if (DANGEROUS_HOSTNAMES.includes(lowerHostname)) {
        return true;
    }

    // Check for localhost variations
    if (lowerHostname.endsWith('.localhost') || lowerHostname.startsWith('localhost.')) {
        return true;
    }

    // Check for internal TLDs
    const internalTLDs = ['.local', '.internal', '.private', '.corp', '.home', '.lan'];
    if (internalTLDs.some(tld => lowerHostname.endsWith(tld))) {
        return true;
    }

    // Check if it's an IP address
    const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$|^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;
    if (ipPattern.test(lowerHostname)) {
        return isPrivateIP(lowerHostname);
    }

    return false;
}

/**
 * Resolve hostname to IP addresses and validate them
 * @param {string} hostname - Hostname to resolve
 * @returns {Promise<Array<string>>} - Array of resolved IP addresses
 * @throws {Error} - If resolution fails or IPs are private
 */
async function resolveAndValidateHostname(hostname) {
    try {
        // Try IPv4 resolution first
        let addresses = [];

        try {
            const ipv4Addresses = await dns.resolve4(hostname);
            addresses = addresses.concat(ipv4Addresses);
        } catch (error) {
            // IPv4 resolution failed, not necessarily an error
            logger.info(`IPv4 resolution failed for ${hostname}:`, error.message);
        }

        // Try IPv6 resolution
        try {
            const ipv6Addresses = await dns.resolve6(hostname);
            addresses = addresses.concat(ipv6Addresses);
        } catch (error) {
            // IPv6 resolution failed, not necessarily an error
            logger.info(`IPv6 resolution failed for ${hostname}:`, error.message);
        }

        // If no addresses resolved, throw error
        if (addresses.length === 0) {
            throw new Error(`Failed to resolve hostname: ${hostname}`);
        }

        // Validate all resolved IPs
        const privateIPs = addresses.filter(ip => isPrivateIP(ip));
        if (privateIPs.length > 0) {
            throw new Error(
                `Hostname ${hostname} resolves to private/reserved IP address(es): ${privateIPs.join(', ')}`
            );
        }

        return addresses;
    } catch (error) {
        throw new Error(`DNS resolution failed for ${hostname}: ${error.message}`);
    }
}

/**
 * Validate a webhook URL for SSRF vulnerabilities
 * @param {string} url - URL to validate
 * @param {Object} options - Validation options
 * @param {boolean} options.allowHttp - Allow HTTP in non-production (default: NODE_ENV !== 'production')
 * @param {boolean} options.resolveDNS - Perform DNS resolution (default: true)
 * @returns {Promise<Object>} - Validation result { valid: boolean, url: string, hostname: string, ips: Array }
 * @throws {Error} - If URL is invalid or dangerous
 */
async function validateWebhookUrl(url, options = {}) {
    const {
        allowHttp = process.env.NODE_ENV !== 'production',
        resolveDNS = true
    } = options;

    // Basic validation
    if (!url || typeof url !== 'string') {
        throw new Error('URL is required and must be a string');
    }

    // Trim whitespace
    url = url.trim();

    // Parse URL
    let parsedUrl;
    try {
        parsedUrl = new URL(url);
    } catch (error) {
        throw new Error(`Invalid URL format: ${error.message}`);
    }

    // Validate protocol
    if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
        throw new Error(`Invalid protocol: ${parsedUrl.protocol}. Only HTTP(S) is allowed`);
    }

    // Enforce HTTPS in production
    if (!allowHttp && parsedUrl.protocol === 'http:') {
        throw new Error('HTTP is not allowed in production. Use HTTPS instead');
    }

    // Validate hostname exists
    if (!parsedUrl.hostname) {
        throw new Error('URL must have a valid hostname');
    }

    // Check for dangerous hostnames
    if (isDangerousHost(parsedUrl.hostname)) {
        throw new Error(
            `Hostname ${parsedUrl.hostname} is not allowed (private/internal/localhost addresses are blocked)`
        );
    }

    // Check if hostname is an IP address and validate it
    const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$|^\[?([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}\]?$/;
    if (ipPattern.test(parsedUrl.hostname)) {
        if (isPrivateIP(parsedUrl.hostname)) {
            throw new Error(
                `IP address ${parsedUrl.hostname} is not allowed (private/reserved ranges are blocked)`
            );
        }
    }

    // Validate username/password not present (can be used for SSRF exploitation)
    if (parsedUrl.username || parsedUrl.password) {
        throw new Error('URLs with username/password are not allowed');
    }

    let resolvedIPs = [];

    // Perform DNS resolution and validation
    if (resolveDNS) {
        try {
            resolvedIPs = await resolveAndValidateHostname(parsedUrl.hostname);
        } catch (error) {
            throw new Error(`URL validation failed: ${error.message}`);
        }
    }

    return {
        valid: true,
        url: parsedUrl.href,
        hostname: parsedUrl.hostname,
        protocol: parsedUrl.protocol,
        ips: resolvedIPs
    };
}

/**
 * Validate URL synchronously (without DNS resolution)
 * Useful for quick checks before async validation
 * @param {string} url - URL to validate
 * @param {Object} options - Validation options
 * @returns {Object} - Validation result { valid: boolean, error: string }
 */
function validateWebhookUrlSync(url, options = {}) {
    try {
        const {
            allowHttp = process.env.NODE_ENV !== 'production'
        } = options;

        if (!url || typeof url !== 'string') {
            return { valid: false, error: 'URL is required and must be a string' };
        }

        url = url.trim();

        let parsedUrl;
        try {
            parsedUrl = new URL(url);
        } catch (error) {
            return { valid: false, error: `Invalid URL format: ${error.message}` };
        }

        if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
            return { valid: false, error: `Invalid protocol: ${parsedUrl.protocol}` };
        }

        if (!allowHttp && parsedUrl.protocol === 'http:') {
            return { valid: false, error: 'HTTP is not allowed in production. Use HTTPS instead' };
        }

        if (!parsedUrl.hostname) {
            return { valid: false, error: 'URL must have a valid hostname' };
        }

        if (isDangerousHost(parsedUrl.hostname)) {
            return {
                valid: false,
                error: `Hostname ${parsedUrl.hostname} is not allowed (private/internal addresses blocked)`
            };
        }

        const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$|^\[?([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}\]?$/;
        if (ipPattern.test(parsedUrl.hostname)) {
            if (isPrivateIP(parsedUrl.hostname)) {
                return {
                    valid: false,
                    error: `IP address ${parsedUrl.hostname} is not allowed (private ranges blocked)`
                };
            }
        }

        if (parsedUrl.username || parsedUrl.password) {
            return { valid: false, error: 'URLs with username/password are not allowed' };
        }

        return { valid: true };
    } catch (error) {
        return { valid: false, error: error.message };
    }
}

module.exports = {
    isPrivateIP,
    isDangerousHost,
    validateWebhookUrl,
    validateWebhookUrlSync,
    resolveAndValidateHostname,
    PRIVATE_IP_RANGES,
    PRIVATE_IPV6_RANGES,
    DANGEROUS_HOSTNAMES,
    METADATA_IPS
};
