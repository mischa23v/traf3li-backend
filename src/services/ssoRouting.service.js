const crypto = require('crypto');
const dns = require('dns').promises;
const SsoProvider = require('../models/ssoProvider.model');
const cacheService = require('./cache.service');
const oauthService = require('./oauth.service');
const logger = require('../utils/contextLogger');
const { CustomException } = require('../utils');

/**
 * SSO Routing Service
 *
 * Provides domain-based SSO routing to automatically detect which Identity Provider (IdP)
 * to use based on the user's email domain.
 *
 * Features:
 * - Email domain extraction and validation
 * - Provider lookup by domain with priority support
 * - Redis caching for performance (fallback to in-memory)
 * - Domain verification (DNS TXT records)
 * - Authorization URL generation
 * - Multi-tenant support (firm-specific providers)
 *
 * Security:
 * - Domain ownership verification required for auto-redirect
 * - Cache invalidation on provider updates
 * - Input validation and sanitization
 */

class SSORoutingService {
    constructor() {
        // Cache configuration
        this.CACHE_PREFIX = 'sso:domain:';
        this.CACHE_TTL = 600; // 10 minutes
        this.VERIFICATION_CACHE_PREFIX = 'sso:verify:';
        this.VERIFICATION_CACHE_TTL = 300; // 5 minutes
    }

    /**
     * Extract domain from email address
     * @param {String} email - Email address
     * @returns {String|null} Domain or null if invalid
     */
    extractDomain(email) {
        if (!email || typeof email !== 'string') {
            return null;
        }

        // Trim and lowercase
        const normalized = email.trim().toLowerCase();

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(normalized)) {
            return null;
        }

        // Extract domain part
        const parts = normalized.split('@');
        if (parts.length !== 2) {
            return null;
        }

        const domain = parts[1];

        // Validate domain format
        // Allow letters, numbers, dots, hyphens
        const domainRegex = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/;
        if (!domainRegex.test(domain)) {
            return null;
        }

        return domain;
    }

    /**
     * Get cache key for domain lookup
     * @param {String} domain - Email domain
     * @param {String} firmId - Optional firm ID
     * @returns {String} Cache key
     */
    getCacheKey(domain, firmId = null) {
        const firmPart = firmId || 'global';
        return `${this.CACHE_PREFIX}${firmPart}:${domain}`;
    }

    /**
     * Detect SSO provider from email address
     * @param {String} email - Email address
     * @param {String} firmId - Optional firm ID for firm-specific providers
     * @param {String} returnUrl - Optional return URL after authentication
     * @returns {Promise<Object>} Detection result with provider info and auth URL
     */
    async detectProvider(email, firmId = null, returnUrl = '/') {
        // Extract and validate domain
        const domain = this.extractDomain(email);
        if (!domain) {
            logger.warn('Invalid email format for SSO detection', { email: email?.substring(0, 3) + '***' });
            return {
                detected: false,
                message: 'Invalid email format',
                messageAr: 'صيغة البريد الإلكتروني غير صحيحة'
            };
        }

        // Try cache first
        const cacheKey = this.getCacheKey(domain, firmId);
        try {
            const cached = await cacheService.get(cacheKey);
            if (cached) {
                logger.info('SSO provider found in cache', { domain, firmId });

                // Generate fresh auth URL
                if (cached.provider) {
                    const authUrl = await oauthService.getAuthorizationUrl(
                        cached.provider.id,
                        returnUrl,
                        firmId
                    );
                    cached.authUrl = authUrl;
                }

                return cached;
            }
        } catch (error) {
            logger.error('Cache lookup failed for SSO routing', { error: error.message, domain });
            // Continue with database lookup
        }

        // Database lookup
        const provider = await SsoProvider.getProviderForDomain(domain, firmId);

        if (!provider) {
            logger.info('No SSO provider found for domain', { domain, firmId });

            const result = {
                detected: false,
                message: 'No SSO provider configured for this email domain',
                messageAr: 'لا يوجد موفر SSO مهيأ لنطاق البريد الإلكتروني هذا',
                domain
            };

            // Cache negative result for shorter time (1 minute)
            await cacheService.set(cacheKey, result, 60);

            return result;
        }

        // Generate authorization URL
        const authUrl = await oauthService.getAuthorizationUrl(
            provider._id.toString(),
            returnUrl,
            firmId
        );

        // Determine provider type (SAML or OIDC/OAuth)
        const providerType = this.getProviderProtocol(provider.providerType);

        // Build result
        const result = {
            detected: true,
            provider: {
                id: provider._id.toString(),
                name: provider.name,
                type: providerType,
                providerType: provider.providerType,
                autoRedirect: provider.autoRedirect && provider.domainVerified,
                domainVerified: provider.domainVerified,
                priority: provider.priority
            },
            authUrl,
            message: `Sign in with your ${this.getDomainName(domain)} account`,
            messageAr: `تسجيل الدخول باستخدام حساب ${this.getDomainName(domain)} الخاص بك`,
            domain
        };

        // Cache the result
        await cacheService.set(cacheKey, result, this.CACHE_TTL);

        logger.info('SSO provider detected successfully', {
            domain,
            provider: provider.name,
            autoRedirect: result.provider.autoRedirect
        });

        return result;
    }

    /**
     * Get provider protocol type (saml or oidc)
     * @param {String} providerType - Provider type
     * @returns {String} Protocol type
     */
    getProviderProtocol(providerType) {
        const samlProviders = ['okta', 'azure', 'auth0']; // Can use SAML
        const oidcProviders = ['google', 'microsoft', 'facebook', 'apple', 'twitter', 'linkedin', 'github'];

        if (samlProviders.includes(providerType)) {
            return 'saml'; // Note: These can also be oidc, but default to saml for enterprise
        } else if (oidcProviders.includes(providerType)) {
            return 'oidc';
        }

        return 'oidc'; // Default to oidc for custom providers
    }

    /**
     * Get friendly domain name for display
     * @param {String} domain - Email domain
     * @returns {String} Friendly name
     */
    getDomainName(domain) {
        // Map common domains to friendly names
        const domainMap = {
            'gmail.com': 'Google',
            'outlook.com': 'Microsoft',
            'hotmail.com': 'Microsoft',
            'live.com': 'Microsoft',
            'yahoo.com': 'Yahoo',
            'icloud.com': 'Apple'
        };

        return domainMap[domain] || domain;
    }

    /**
     * Get SSO configuration for a specific domain (admin use)
     * @param {String} domain - Email domain
     * @param {String} firmId - Optional firm ID
     * @returns {Promise<Object>} Domain configuration
     */
    async getDomainConfig(domain, firmId = null) {
        // Validate domain
        if (!domain || typeof domain !== 'string') {
            throw CustomException('Invalid domain format', 400);
        }

        const normalizedDomain = domain.toLowerCase().trim();

        // Find all providers for this domain
        const providers = await SsoProvider.findByDomain(normalizedDomain, firmId);

        if (providers.length === 0) {
            throw CustomException('No SSO providers configured for this domain', 404);
        }

        // Return provider information (sanitized)
        return {
            domain: normalizedDomain,
            providers: providers.map(p => ({
                id: p._id.toString(),
                name: p.name,
                providerType: p.providerType,
                priority: p.priority,
                autoRedirect: p.autoRedirect,
                domainVerified: p.domainVerified,
                verificationMethod: p.verificationMethod,
                verifiedAt: p.verifiedAt,
                isEnabled: p.isEnabled,
                firmId: p.firmId?.toString() || null
            })),
            primaryProvider: providers[0] ? {
                id: providers[0]._id.toString(),
                name: providers[0].name,
                providerType: providers[0].providerType
            } : null
        };
    }

    /**
     * Generate domain verification token
     * @param {String} providerId - SSO provider ID
     * @param {String} domain - Domain to verify
     * @returns {Promise<Object>} Verification instructions
     */
    async generateVerificationToken(providerId, domain, firmId) {
        const provider = await SsoProvider.findOne({ _id: providerId, firmId });
        if (!provider) {
            throw CustomException('SSO provider not found', 404);
        }

        // Validate domain is in allowedDomains
        if (!provider.allowedDomains.includes(domain.toLowerCase())) {
            throw CustomException('Domain not in provider allowed domains list', 400);
        }

        // Generate verification token
        const token = crypto.randomBytes(32).toString('hex');
        const verificationString = `traf3li-verify=${token}`;

        // Save to provider
        provider.verificationToken = token;
        provider.verificationMethod = 'dns';
        provider.domainVerified = false;
        await provider.save();

        // Invalidate cache
        await this.invalidateDomainCache(domain, provider.firmId);

        logger.info('Domain verification token generated', {
            providerId,
            domain,
            method: 'dns'
        });

        return {
            domain,
            verificationMethod: 'dns',
            txtRecord: {
                host: `_traf3li.${domain}`,
                type: 'TXT',
                value: verificationString,
                ttl: 3600
            },
            instructions: [
                `Add a DNS TXT record to your domain ${domain}`,
                `Host/Name: _traf3li.${domain} or _traf3li (depending on your DNS provider)`,
                `Type: TXT`,
                `Value: ${verificationString}`,
                `TTL: 3600 (or default)`,
                'Wait for DNS propagation (can take up to 48 hours)',
                'Click "Verify Domain" to complete verification'
            ],
            token
        };
    }

    /**
     * Verify domain ownership via DNS TXT record
     * @param {String} providerId - SSO provider ID
     * @param {String} domain - Domain to verify
     * @param {String} userId - Admin user performing verification
     * @returns {Promise<Object>} Verification result
     */
    async verifyDomain(providerId, domain, userId, firmId) {
        const provider = await SsoProvider.findOne({ _id: providerId, firmId });
        if (!provider) {
            throw CustomException('SSO provider not found', 404);
        }

        if (!provider.verificationToken) {
            throw CustomException('No verification token found. Generate one first.', 400);
        }

        // Check cache to prevent excessive DNS lookups
        const cacheKey = `${this.VERIFICATION_CACHE_PREFIX}${domain}`;
        const cachedResult = await cacheService.get(cacheKey);

        if (cachedResult === 'verified') {
            // Already verified in cache
            provider.domainVerified = true;
            provider.verifiedAt = new Date();
            provider.verifiedBy = userId;
            await provider.save();

            await this.invalidateDomainCache(domain, provider.firmId);

            return {
                verified: true,
                message: 'Domain verified successfully',
                messageAr: 'تم التحقق من النطاق بنجاح'
            };
        }

        // Perform DNS lookup
        try {
            const expectedValue = `traf3li-verify=${provider.verificationToken}`;
            const txtHost = `_traf3li.${domain}`;

            logger.info('Attempting DNS verification', { domain, txtHost });

            const records = await dns.resolveTxt(txtHost);

            // Flatten TXT records (DNS returns array of arrays)
            const flatRecords = records.map(record => record.join(''));

            logger.info('DNS TXT records retrieved', {
                domain,
                txtHost,
                recordCount: flatRecords.length,
                records: flatRecords
            });

            // Check if verification string is present
            const verified = flatRecords.some(record =>
                record.trim() === expectedValue
            );

            if (verified) {
                // Update provider
                provider.domainVerified = true;
                provider.verifiedAt = new Date();
                provider.verifiedBy = userId;
                await provider.save();

                // Cache successful verification
                await cacheService.set(cacheKey, 'verified', this.VERIFICATION_CACHE_TTL);

                // Invalidate domain cache
                await this.invalidateDomainCache(domain, provider.firmId);

                logger.info('Domain verified successfully', {
                    providerId,
                    domain,
                    method: 'dns'
                });

                return {
                    verified: true,
                    message: 'Domain verified successfully',
                    messageAr: 'تم التحقق من النطاق بنجاح',
                    verifiedAt: provider.verifiedAt
                };
            } else {
                logger.warn('Domain verification failed - TXT record not found', {
                    domain,
                    txtHost,
                    expected: expectedValue,
                    found: flatRecords
                });

                return {
                    verified: false,
                    message: 'Verification TXT record not found. Please ensure the DNS record is correctly configured and propagated.',
                    messageAr: 'لم يتم العثور على سجل TXT للتحقق. يرجى التأكد من تكوين سجل DNS بشكل صحيح ونشره.',
                    expectedRecord: {
                        host: txtHost,
                        type: 'TXT',
                        value: expectedValue
                    },
                    foundRecords: flatRecords
                };
            }
        } catch (error) {
            logger.error('DNS verification error', {
                domain,
                error: error.message,
                code: error.code
            });

            if (error.code === 'ENOTFOUND' || error.code === 'ENODATA') {
                return {
                    verified: false,
                    message: 'DNS TXT record not found. Please add the TXT record and wait for DNS propagation (can take up to 48 hours).',
                    messageAr: 'لم يتم العثور على سجل DNS TXT. يرجى إضافة سجل TXT والانتظار حتى نشر DNS (قد يستغرق ما يصل إلى 48 ساعة).',
                    dnsError: error.code
                };
            }

            throw CustomException('Failed to verify domain: ' + error.message, 500);
        }
    }

    /**
     * Manually verify domain (admin override)
     * @param {String} providerId - SSO provider ID
     * @param {String} domain - Domain to verify
     * @param {String} userId - Admin user performing verification
     * @returns {Promise<Object>} Verification result
     */
    async manualVerifyDomain(providerId, domain, userId, firmId) {
        const provider = await SsoProvider.findOne({ _id: providerId, firmId });
        if (!provider) {
            throw CustomException('SSO provider not found', 404);
        }

        // Validate domain is in allowedDomains
        if (!provider.allowedDomains.includes(domain.toLowerCase())) {
            throw CustomException('Domain not in provider allowed domains list', 400);
        }

        // Mark as verified
        provider.domainVerified = true;
        provider.verificationMethod = 'manual';
        provider.verifiedAt = new Date();
        provider.verifiedBy = userId;
        await provider.save();

        // Invalidate cache
        await this.invalidateDomainCache(domain, provider.firmId);

        logger.info('Domain verified manually', {
            providerId,
            domain,
            userId,
            method: 'manual'
        });

        return {
            verified: true,
            message: 'Domain verified manually by administrator',
            messageAr: 'تم التحقق من النطاق يدويًا من قبل المسؤول',
            verifiedAt: provider.verifiedAt,
            verificationMethod: 'manual'
        };
    }

    /**
     * Invalidate domain cache
     * @param {String} domain - Domain to invalidate
     * @param {String} firmId - Optional firm ID
     */
    async invalidateDomainCache(domain, firmId = null) {
        const cacheKey = this.getCacheKey(domain, firmId);
        await cacheService.del(cacheKey);

        logger.info('Domain cache invalidated', { domain, firmId });
    }

    /**
     * Invalidate all domain caches for a provider
     * @param {String} providerId - Provider ID
     */
    async invalidateProviderCache(providerId, firmId = null) {
        try {
            const query = firmId ? { _id: providerId, firmId } : { _id: providerId };
            const provider = await SsoProvider.findOne(query);
            if (!provider) {
                return;
            }

            // Invalidate cache for all allowed domains
            const invalidationPromises = provider.allowedDomains.map(domain =>
                this.invalidateDomainCache(domain, provider.firmId)
            );

            await Promise.all(invalidationPromises);

            logger.info('Provider cache invalidated', {
                providerId,
                domainsInvalidated: provider.allowedDomains.length
            });
        } catch (error) {
            logger.error('Failed to invalidate provider cache', {
                providerId,
                error: error.message
            });
        }
    }
}

module.exports = new SSORoutingService();
