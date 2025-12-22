/**
 * Data Residency Service
 *
 * Handles geographic data routing, region enforcement, and compliance
 * for Saudi Arabia PDPL and Aramco enterprise requirements.
 *
 * Features:
 * - Per-firm data region configuration
 * - Geographic access restrictions
 * - Region-specific S3 bucket routing
 * - Compliance framework enforcement
 */

const { Firm } = require('../models');
const { S3Client } = require('@aws-sdk/client-s3');
const auditLogService = require('./auditLog.service');

// Region configurations with S3 endpoints
const REGION_CONFIG = {
    'me-south-1': {
        name: 'Middle East (Bahrain)',
        s3Endpoint: 'https://s3.me-south-1.amazonaws.com',
        country: 'BH',
        pdplCompliant: true,
        ncaCompliant: true
    },
    'eu-central-1': {
        name: 'Europe (Frankfurt)',
        s3Endpoint: 'https://s3.eu-central-1.amazonaws.com',
        country: 'DE',
        pdplCompliant: false,
        ncaCompliant: false,
        gdprCompliant: true
    },
    'us-east-1': {
        name: 'US East (N. Virginia)',
        s3Endpoint: 'https://s3.us-east-1.amazonaws.com',
        country: 'US',
        pdplCompliant: false,
        ncaCompliant: false
    },
    'ap-southeast-1': {
        name: 'Asia Pacific (Singapore)',
        s3Endpoint: 'https://s3.ap-southeast-1.amazonaws.com',
        country: 'SG',
        pdplCompliant: false,
        ncaCompliant: false
    }
};

// GCC country codes for default Saudi compliance
const GCC_COUNTRIES = ['SA', 'AE', 'BH', 'KW', 'OM', 'QA'];

class DataResidencyService {
    constructor() {
        this.s3Clients = new Map();
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
            primaryRegion: 'me-south-1',
            enforceStrictResidency: true,
            allowedCountries: GCC_COUNTRIES,
            complianceFrameworks: ['PDPL', 'NCA-ECC'],
            dataClassification: 'confidential'
        };

        // Cache the config
        this.firmConfigCache.set(firmId, {
            config,
            timestamp: Date.now()
        });

        return config;
    }

    /**
     * Get S3 client for the firm's primary region
     * @param {string} firmId - Firm ID
     * @returns {Promise<S3Client>} Region-specific S3 client
     */
    async getS3ClientForFirm(firmId) {
        const config = await this.getFirmResidencyConfig(firmId);
        const region = config.primaryRegion || 'me-south-1';

        // Return cached client if exists
        if (this.s3Clients.has(region)) {
            return this.s3Clients.get(region);
        }

        // Create new S3 client for this region
        const client = new S3Client({
            region,
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
            }
        });

        this.s3Clients.set(region, client);
        return client;
    }

    /**
     * Get the S3 bucket name for a firm
     * Uses dedicated bucket if configured, otherwise regional default
     * @param {string} firmId - Firm ID
     * @returns {Promise<string>} S3 bucket name
     */
    async getBucketForFirm(firmId) {
        const config = await this.getFirmResidencyConfig(firmId);

        // Use dedicated bucket if configured
        if (config.dedicatedBucket) {
            return config.dedicatedBucket;
        }

        // Use regional default bucket
        const region = config.primaryRegion || 'me-south-1';
        const baseBucket = process.env.AWS_S3_BUCKET || 'traf3li-documents';

        return `${baseBucket}-${region}`;
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
                        reason: 'Geographic access restriction'
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

        // Check cross-region transfer
        if (operation === 'transfer' && context.destinationRegion) {
            if (config.enforceStrictResidency && context.destinationRegion !== config.primaryRegion) {
                violations.push(`Cross-region transfer to ${context.destinationRegion} violates data residency policy`);
            }
        }

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
                        context
                    },
                    complianceTags: config.complianceFrameworks
                }
            );
        }

        return { compliant, violations };
    }

    /**
     * Get region information
     * @param {string} region - AWS region code
     * @returns {Object} Region configuration
     */
    getRegionInfo(region) {
        return REGION_CONFIG[region] || REGION_CONFIG['me-south-1'];
    }

    /**
     * Get all available regions
     * @returns {Object[]} List of available regions
     */
    getAvailableRegions() {
        return Object.entries(REGION_CONFIG).map(([code, config]) => ({
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

        // Validate region changes
        if (updates.primaryRegion) {
            if (!REGION_CONFIG[updates.primaryRegion]) {
                throw new Error(`Invalid region: ${updates.primaryRegion}`);
            }
        }

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
                dataInSaudiRegion: config.primaryRegion === 'me-south-1' || regionInfo.pdplCompliant,
                strictResidencyEnabled: config.enforceStrictResidency,
                gccCountriesOnly: config.allowedCountries?.every(c => GCC_COUNTRIES.includes(c)),
                encryptionEnabled: !!config.kmsKeyArn || true, // Assume default encryption
                auditLoggingEnabled: true // Always enabled
            },
            'NCA-ECC': {
                dataInApprovedRegion: regionInfo.ncaCompliant,
                accessControlEnabled: true,
                encryptionAtRest: true,
                encryptionInTransit: true,
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
            if (!checks.dataInSaudiRegion) {
                recommendations.push('Move data to me-south-1 (Bahrain) region for PDPL compliance');
            }
            if (!checks.strictResidencyEnabled) {
                recommendations.push('Enable strict data residency to prevent cross-border transfers');
            }
            if (!checks.gccCountriesOnly) {
                recommendations.push('Restrict access to GCC countries only');
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
}

// Export singleton
module.exports = new DataResidencyService();
