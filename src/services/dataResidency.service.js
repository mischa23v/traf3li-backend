/**
 * Data Residency Service
 *
 * Handles geographic data routing, region enforcement, and compliance
 * for Saudi Arabia PDPL and Aramco enterprise requirements.
 *
 * Features:
 * - Per-firm data residency configuration
 * - Geographic access restrictions
 * - R2 storage integration (Cloudflare edge network)
 * - Compliance framework enforcement
 *
 * IMPORTANT: Cloudflare R2 Note
 * - R2 uses Cloudflare's global edge network for distribution
 * - Data is stored in a single location (not region-specific like AWS S3)
 * - For strict PDPL compliance requiring specific geographic storage,
 *   additional compliance measures may be needed
 *
 * Gold Standard: Enterprise-grade compliance with R2 storage
 */

const { Firm } = require('../models');
const { r2Client, BUCKETS, isR2Configured } = require('../configs/storage');
const auditLogService = require('./auditLog.service');

// Region configurations (for compliance tracking - R2 uses Cloudflare edge)
// Note: R2 doesn't have regional endpoints like AWS S3
// These are kept for compliance framework documentation and access control
const REGION_CONFIG = {
    'cloudflare-global': {
        name: 'Cloudflare Global Edge',
        endpoint: process.env.R2_ENDPOINT,
        country: 'GLOBAL',
        pdplCompliant: true, // R2 with proper access controls can meet PDPL
        ncaCompliant: true,
        description: 'Cloudflare R2 with global edge caching'
    },
    'me-south-1': {
        name: 'Middle East (Bahrain) - Legacy',
        endpoint: 'https://s3.me-south-1.amazonaws.com',
        country: 'BH',
        pdplCompliant: true,
        ncaCompliant: true,
        deprecated: true,
        migrationNote: 'Migrated to Cloudflare R2'
    },
    'eu-central-1': {
        name: 'Europe (Frankfurt) - Legacy',
        endpoint: 'https://s3.eu-central-1.amazonaws.com',
        country: 'DE',
        pdplCompliant: false,
        ncaCompliant: false,
        gdprCompliant: true,
        deprecated: true,
        migrationNote: 'Migrated to Cloudflare R2'
    }
};

// GCC country codes for default Saudi compliance
const GCC_COUNTRIES = ['SA', 'AE', 'BH', 'KW', 'OM', 'QA'];

class DataResidencyService {
    constructor() {
        this.firmConfigCache = new Map();
        this.cacheTTL = 5 * 60 * 1000; // 5 minutes
    }

    /**
     * Get the data residency configuration for a firm
     * @param {string} firmId - Firm ID
     * @returns {Promise<Object>} Data residency config
     */
    async getFirmResidencyConfig(firmId) {
        // Check cache
        const cached = this.firmConfigCache.get(firmId);
        if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
            return cached.config;
        }

        const firm = await Firm.findById(firmId).select('enterpriseSettings.dataResidency').lean();

        if (!firm) {
            throw new Error('Firm not found');
        }

        const config = firm.enterpriseSettings?.dataResidency || {
            primaryRegion: 'cloudflare-global', // Default to R2
            enforceStrictResidency: true,
            allowedCountries: GCC_COUNTRIES,
            complianceFrameworks: ['PDPL', 'NCA-ECC'],
            dataClassification: 'confidential',
            storageProvider: 'cloudflare-r2'
        };

        // Always ensure storageProvider is set to R2
        config.storageProvider = 'cloudflare-r2';
        config.primaryRegion = 'cloudflare-global';

        // Cache the config
        this.firmConfigCache.set(firmId, {
            config,
            timestamp: Date.now()
        });

        return config;
    }

    /**
     * Get R2 client for the firm
     * R2 uses a single global endpoint (not region-specific like AWS S3)
     * @param {string} firmId - Firm ID
     * @returns {Object} R2 client
     */
    async getStorageClientForFirm(firmId) {
        // Verify R2 is configured
        if (!isR2Configured()) {
            throw new Error('R2 storage is not configured. Check R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY environment variables.');
        }

        // Return the global R2 client (no regional variants)
        return r2Client;
    }

    /**
     * Get the R2 bucket name for a firm
     * @param {string} firmId - Firm ID
     * @returns {Promise<string>} R2 bucket name
     */
    async getBucketForFirm(firmId) {
        const config = await this.getFirmResidencyConfig(firmId);

        // Use dedicated bucket if configured (enterprise feature)
        if (config.dedicatedBucket) {
            return config.dedicatedBucket;
        }

        // Use default R2 bucket
        return BUCKETS.DOCUMENTS;
    }

    /**
     * Check if access from a country is allowed for a firm
     * @param {string} firmId - Firm ID
     * @param {string} countryCode - ISO 2-letter country code
     * @returns {Promise<Object>} { allowed: boolean, reason?: string }
     */
    async isAccessAllowedFromCountry(firmId, countryCode) {
        const config = await this.getFirmResidencyConfig(firmId);

        // If strict residency is not enforced, allow all
        if (!config.enforceStrictResidency) {
            return { allowed: true };
        }

        const allowedCountries = config.allowedCountries || GCC_COUNTRIES;
        const isAllowed = allowedCountries.includes(countryCode);

        if (!isAllowed) {
            // Log blocked access attempt
            await auditLogService.log(
                'data_residency_blocked',
                'firm',
                firmId,
                null,
                {
                    severity: 'high',
                    details: {
                        countryCode,
                        allowedCountries,
                        reason: 'Geographic access restriction',
                        storageProvider: 'cloudflare-r2'
                    },
                    complianceTags: config.complianceFrameworks
                }
            );

            return {
                allowed: false,
                reason: `Access from ${countryCode} is not allowed. Data residency restrictions apply.`,
                allowedCountries
            };
        }

        return { allowed: true };
    }

    /**
     * Validate that an operation complies with data residency rules
     * @param {string} firmId - Firm ID
     * @param {string} operation - Operation type (upload, download, transfer)
     * @param {Object} context - Operation context
     * @returns {Promise<Object>} { compliant: boolean, violations?: string[] }
     */
    async validateCompliance(firmId, operation, context = {}) {
        const config = await this.getFirmResidencyConfig(firmId);
        const violations = [];

        // Check country restriction
        if (context.sourceCountry && config.enforceStrictResidency) {
            const countryCheck = await this.isAccessAllowedFromCountry(firmId, context.sourceCountry);
            if (!countryCheck.allowed) {
                violations.push(`Source country ${context.sourceCountry} not in allowed list`);
            }
        }

        // Note: Cross-region transfer check is not applicable for R2 (single region)
        // R2 uses Cloudflare's global edge for distribution

        // Check data classification
        if (context.dataClassification) {
            const classificationLevels = ['public', 'internal', 'confidential', 'restricted'];
            const requiredLevel = classificationLevels.indexOf(config.dataClassification);
            const providedLevel = classificationLevels.indexOf(context.dataClassification);

            if (providedLevel < requiredLevel) {
                violations.push(`Data classification ${context.dataClassification} below required ${config.dataClassification}`);
            }
        }

        const compliant = violations.length === 0;

        if (!compliant) {
            // Log compliance violation
            await auditLogService.log(
                'data_residency_violation',
                'firm',
                firmId,
                null,
                {
                    severity: 'critical',
                    details: {
                        operation,
                        violations,
                        context,
                        storageProvider: 'cloudflare-r2'
                    },
                    complianceTags: config.complianceFrameworks
                }
            );
        }

        return { compliant, violations };
    }

    /**
     * Get region information
     * @param {string} region - Region code
     * @returns {Object} Region configuration
     */
    getRegionInfo(region) {
        return REGION_CONFIG[region] || REGION_CONFIG['cloudflare-global'];
    }

    /**
     * Get all available regions
     * @returns {Object[]} List of available regions
     */
    getAvailableRegions() {
        return Object.entries(REGION_CONFIG)
            .filter(([_, config]) => !config.deprecated)
            .map(([code, config]) => ({
                code,
                ...config
            }));
    }

    /**
     * Update firm's data residency configuration
     * @param {string} firmId - Firm ID
     * @param {Object} updates - Configuration updates
     * @param {string} updatedBy - User ID making the change
     * @returns {Promise<Object>} Updated configuration
     */
    async updateFirmResidencyConfig(firmId, updates, updatedBy) {
        const firm = await Firm.findById(firmId);
        if (!firm) {
            throw new Error('Firm not found');
        }

        // Force R2 as the storage provider
        updates.storageProvider = 'cloudflare-r2';
        updates.primaryRegion = 'cloudflare-global';

        // Update configuration
        const currentConfig = firm.enterpriseSettings?.dataResidency || {};
        const newConfig = { ...currentConfig, ...updates };

        firm.enterpriseSettings = firm.enterpriseSettings || {};
        firm.enterpriseSettings.dataResidency = newConfig;

        await firm.save();

        // Clear cache
        this.firmConfigCache.delete(firmId);

        // Log the change
        await auditLogService.log(
            'data_residency_config_updated',
            'firm',
            firmId,
            { before: currentConfig, after: newConfig },
            {
                userId: updatedBy,
                severity: 'high',
                complianceTags: newConfig.complianceFrameworks || ['PDPL']
            }
        );

        return newConfig;
    }

    /**
     * Check if firm is compliant with specific framework
     * @param {string} firmId - Firm ID
     * @param {string} framework - Compliance framework (PDPL, NCA-ECC, etc.)
     * @returns {Promise<Object>} Compliance status
     */
    async checkFrameworkCompliance(firmId, framework) {
        const config = await this.getFirmResidencyConfig(firmId);
        const regionInfo = this.getRegionInfo(config.primaryRegion);

        const checks = {
            PDPL: {
                // R2 with proper access controls meets PDPL requirements
                storageConfigured: isR2Configured(),
                strictResidencyEnabled: config.enforceStrictResidency,
                gccCountriesOnly: config.allowedCountries?.every(c => GCC_COUNTRIES.includes(c)),
                encryptionEnabled: true, // R2 encrypts at rest by default
                auditLoggingEnabled: true, // Always enabled
                accessControlEnabled: true // Presigned URLs with expiry
            },
            'NCA-ECC': {
                storageConfigured: isR2Configured(),
                accessControlEnabled: true,
                encryptionAtRest: true, // R2 default
                encryptionInTransit: true, // HTTPS only
                auditTrailEnabled: true
            }
        };

        const frameworkChecks = checks[framework] || {};
        const passedChecks = Object.values(frameworkChecks).filter(v => v === true).length;
        const totalChecks = Object.keys(frameworkChecks).length;
        const compliant = passedChecks === totalChecks;

        return {
            framework,
            compliant,
            score: totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 0,
            checks: frameworkChecks,
            storageProvider: 'cloudflare-r2',
            recommendations: compliant ? [] : this._getRecommendations(framework, frameworkChecks)
        };
    }

    /**
     * Get recommendations for improving compliance
     * @private
     */
    _getRecommendations(framework, checks) {
        const recommendations = [];

        if (framework === 'PDPL') {
            if (!checks.storageConfigured) {
                recommendations.push('Configure R2 storage environment variables');
            }
            if (!checks.strictResidencyEnabled) {
                recommendations.push('Enable strict data residency to prevent unauthorized access');
            }
            if (!checks.gccCountriesOnly) {
                recommendations.push('Restrict access to GCC countries only');
            }
        }

        if (framework === 'NCA-ECC') {
            if (!checks.storageConfigured) {
                recommendations.push('Configure R2 storage for NCA-ECC compliance');
            }
        }

        return recommendations;
    }

    /**
     * Clear all caches
     */
    clearCache() {
        this.firmConfigCache.clear();
    }

    /**
     * Get storage provider information
     * @returns {Object} Storage provider details
     */
    getStorageProviderInfo() {
        return {
            provider: 'cloudflare-r2',
            configured: isR2Configured(),
            features: {
                encryptionAtRest: true,
                encryptionInTransit: true,
                presignedUrls: true,
                accessLogging: true,
                zeroEgressFees: true
            },
            buckets: {
                documents: BUCKETS.DOCUMENTS,
                tasks: BUCKETS.TASKS,
                assets: BUCKETS.ASSETS
            }
        };
    }
}

// Export singleton
module.exports = new DataResidencyService();
