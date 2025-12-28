/**
 * Conflict of Interest Check Service
 *
 * Server-side conflict detection with:
 * - Automated matching against clients, leads, cases
 * - Multiple matching criteria (name, ID, phone, email)
 * - Configurable rules and severity
 * - Waiver management
 * - Audit trail
 *
 * Backend does 90% of work - frontend just displays
 */

const mongoose = require('mongoose');
const logger = require('../utils/logger');

// Helper for regex safety
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Conflict severity levels
const SEVERITY = {
    BLOCK: 'block',    // Must not proceed without waiver
    WARN: 'warn',      // Proceed with caution
    INFO: 'info'       // Informational only
};

// Match types
const MATCH_TYPE = {
    EXACT: 'exact',
    FUZZY: 'fuzzy',
    PARTIAL: 'partial'
};

class ConflictCheckService {
    // ═══════════════════════════════════════════════════════════
    // CONFLICT CHECK
    // ═══════════════════════════════════════════════════════════

    /**
     * Perform comprehensive conflict check
     * @param {object} entity - Entity to check (lead, client, etc.)
     * @param {object} firmQuery - Firm query for isolation
     * @param {object} options - Check options
     * @returns {object} - Conflict check result
     */
    static async checkConflicts(entity, firmQuery, options = {}) {
        const {
            checkAgainst = ['clients', 'leads', 'cases'],
            matchFields = ['nationalId', 'crNumber', 'phone', 'email', 'companyName'],
            excludeId = null
        } = options;

        const conflicts = [];
        const startTime = Date.now();

        // Build search criteria from entity
        const searchCriteria = this.buildSearchCriteria(entity, matchFields);

        // Check against each entity type
        for (const entityType of checkAgainst) {
            const matches = await this.findMatches(entityType, searchCriteria, firmQuery, excludeId);
            conflicts.push(...matches);
        }

        // Analyze and categorize conflicts
        const categorizedConflicts = this.categorizeConflicts(conflicts, entity);

        // Determine overall severity
        const overallSeverity = this.determineOverallSeverity(categorizedConflicts);

        return {
            hasConflicts: categorizedConflicts.length > 0,
            canProceed: overallSeverity !== SEVERITY.BLOCK,
            requiresWaiver: overallSeverity === SEVERITY.BLOCK,
            overallSeverity,
            conflicts: categorizedConflicts,
            summary: {
                total: categorizedConflicts.length,
                blocking: categorizedConflicts.filter(c => c.severity === SEVERITY.BLOCK).length,
                warnings: categorizedConflicts.filter(c => c.severity === SEVERITY.WARN).length,
                info: categorizedConflicts.filter(c => c.severity === SEVERITY.INFO).length
            },
            checkedAgainst: checkAgainst,
            checkedFields: matchFields,
            checkDuration: Date.now() - startTime,
            checkedAt: new Date()
        };
    }

    /**
     * Build search criteria from entity
     */
    static buildSearchCriteria(entity, matchFields) {
        const criteria = [];

        matchFields.forEach(field => {
            let value = null;

            // Handle nested fields
            if (field.includes('.')) {
                const parts = field.split('.');
                value = parts.reduce((obj, key) => obj?.[key], entity);
            } else {
                value = entity[field];
            }

            if (value && value.toString().trim()) {
                criteria.push({
                    field,
                    value: value.toString().trim(),
                    normalized: this.normalizeValue(value.toString().trim(), field)
                });
            }
        });

        return criteria;
    }

    /**
     * Normalize value for comparison
     */
    static normalizeValue(value, field) {
        if (!value) return null;

        let normalized = value.toString().toLowerCase().trim();

        // Phone normalization - remove non-digits
        if (field === 'phone') {
            normalized = normalized.replace(/\D/g, '');
            // Handle Saudi phone formats
            if (normalized.startsWith('966')) {
                normalized = normalized.substring(3);
            }
            if (normalized.startsWith('0')) {
                normalized = normalized.substring(1);
            }
        }

        // Email normalization
        if (field === 'email') {
            normalized = normalized.toLowerCase();
        }

        // Company name normalization
        if (field === 'companyName') {
            // Remove common suffixes
            normalized = normalized
                .replace(/\s*(llc|ltd|inc|corp|co|company|مؤسسة|شركة)\s*$/i, '')
                .trim();
        }

        return normalized;
    }

    /**
     * Find matches in a specific entity type
     */
    static async findMatches(entityType, searchCriteria, firmQuery, excludeId) {
        const matches = [];

        for (const criterion of searchCriteria) {
            const Model = this.getModelForType(entityType);
            if (!Model) continue;

            const query = this.buildMatchQuery(criterion, firmQuery, excludeId);
            const results = await Model.find(query).limit(10).lean();

            results.forEach(result => {
                matches.push({
                    entityType,
                    entityId: result._id,
                    matchedField: criterion.field,
                    matchedValue: result[criterion.field] || this.getNestedValue(result, criterion.field),
                    searchValue: criterion.value,
                    matchType: this.determineMatchType(criterion.value, result[criterion.field]),
                    entity: this.sanitizeResult(result, entityType)
                });
            });
        }

        return matches;
    }

    /**
     * Get Mongoose model for entity type
     */
    static getModelForType(entityType) {
        const models = {
            clients: mongoose.model('Client'),
            leads: mongoose.model('Lead'),
            cases: mongoose.model('Case')
        };
        return models[entityType];
    }

    /**
     * Build match query
     */
    static buildMatchQuery(criterion, firmQuery, excludeId) {
        const query = { ...firmQuery };

        // Exclude the entity being checked
        if (excludeId) {
            query._id = { $ne: excludeId };
        }

        // Build field-specific query
        const fieldQuery = {};
        const value = criterion.normalized || criterion.value;

        switch (criterion.field) {
            case 'nationalId':
            case 'crNumber':
                // Exact match for IDs
                fieldQuery[criterion.field] = value;
                break;

            case 'phone':
                // Fuzzy phone match (last 9 digits)
                const phoneDigits = value.replace(/\D/g, '').slice(-9);
                fieldQuery.phone = { $regex: new RegExp(escapeRegex(phoneDigits)), $options: 'i' };
                break;

            case 'email':
                // Case-insensitive email match
                fieldQuery.email = { $regex: new RegExp(`^${escapeRegex(value)}$`, 'i') };
                break;

            case 'companyName':
                // Fuzzy company name match
                fieldQuery.companyName = { $regex: new RegExp(escapeRegex(value), 'i') };
                break;

            default:
                // Default to regex match
                fieldQuery[criterion.field] = { $regex: new RegExp(escapeRegex(value), 'i') };
        }

        return { ...query, ...fieldQuery };
    }

    /**
     * Get nested value from object
     */
    static getNestedValue(obj, path) {
        return path.split('.').reduce((o, k) => o?.[k], obj);
    }

    /**
     * Determine match type
     */
    static determineMatchType(searchValue, foundValue) {
        if (!foundValue) return MATCH_TYPE.PARTIAL;

        const normalizedSearch = searchValue.toString().toLowerCase().trim();
        const normalizedFound = foundValue.toString().toLowerCase().trim();

        if (normalizedSearch === normalizedFound) {
            return MATCH_TYPE.EXACT;
        }

        if (normalizedFound.includes(normalizedSearch) || normalizedSearch.includes(normalizedFound)) {
            return MATCH_TYPE.PARTIAL;
        }

        return MATCH_TYPE.FUZZY;
    }

    /**
     * Sanitize result for display
     */
    static sanitizeResult(result, entityType) {
        const sanitized = {
            id: result._id,
            type: entityType
        };

        switch (entityType) {
            case 'clients':
                sanitized.name = `${result.firstName || ''} ${result.lastName || ''}`.trim();
                sanitized.companyName = result.companyName;
                sanitized.email = result.email;
                sanitized.phone = result.phone;
                sanitized.createdAt = result.createdAt;
                break;

            case 'leads':
                sanitized.name = `${result.firstName || ''} ${result.lastName || ''}`.trim();
                sanitized.companyName = result.companyName;
                sanitized.email = result.email;
                sanitized.phone = result.phone;
                sanitized.status = result.status;
                sanitized.createdAt = result.createdAt;
                break;

            case 'cases':
                sanitized.caseNumber = result.caseNumber;
                sanitized.title = result.title;
                sanitized.status = result.status;
                sanitized.clientName = result.clientName;
                sanitized.opposingParty = result.opposingParty;
                break;
        }

        return sanitized;
    }

    /**
     * Categorize conflicts by severity
     */
    static categorizeConflicts(conflicts, originalEntity) {
        return conflicts.map(conflict => {
            // Determine severity based on match type and field
            let severity = SEVERITY.INFO;
            let reason = '';

            if (conflict.matchedField === 'nationalId' && conflict.matchType === MATCH_TYPE.EXACT) {
                severity = SEVERITY.BLOCK;
                reason = 'Exact National ID match - possible duplicate or conflicting party';
            } else if (conflict.matchedField === 'crNumber' && conflict.matchType === MATCH_TYPE.EXACT) {
                severity = SEVERITY.BLOCK;
                reason = 'Exact Commercial Registration match - possible duplicate';
            } else if (conflict.matchedField === 'email' && conflict.matchType === MATCH_TYPE.EXACT) {
                severity = SEVERITY.WARN;
                reason = 'Exact email match - verify relationship';
            } else if (conflict.matchedField === 'phone' && conflict.matchType === MATCH_TYPE.EXACT) {
                severity = SEVERITY.WARN;
                reason = 'Exact phone match - verify relationship';
            } else if (conflict.matchedField === 'companyName') {
                severity = SEVERITY.INFO;
                reason = 'Similar company name - may be related entity';
            } else {
                reason = `${conflict.matchType} match on ${conflict.matchedField}`;
            }

            // Check for opposing party conflict (most serious)
            if (conflict.entityType === 'cases' && conflict.entity.opposingParty) {
                if (this.isOpposingPartyMatch(originalEntity, conflict.entity.opposingParty)) {
                    severity = SEVERITY.BLOCK;
                    reason = 'OPPOSING PARTY CONFLICT - Entity appears as opposing party in an active case';
                }
            }

            return {
                ...conflict,
                severity,
                reason,
                actions: this.getRecommendedActions(severity, conflict)
            };
        });
    }

    /**
     * Check if entity matches opposing party
     */
    static isOpposingPartyMatch(entity, opposingParty) {
        if (!opposingParty) return false;

        const entityName = `${entity.firstName || ''} ${entity.lastName || ''}`.toLowerCase().trim();
        const entityCompany = (entity.companyName || '').toLowerCase().trim();
        const opposing = opposingParty.toLowerCase();

        return opposing.includes(entityName) ||
               opposing.includes(entityCompany) ||
               entityName.includes(opposing) ||
               entityCompany.includes(opposing);
    }

    /**
     * Get recommended actions based on severity
     */
    static getRecommendedActions(severity, conflict) {
        switch (severity) {
            case SEVERITY.BLOCK:
                return [
                    'Review the conflicting record carefully',
                    'Obtain partner/supervisor approval',
                    'Request conflict waiver if proceeding',
                    'Document the conflict and resolution'
                ];

            case SEVERITY.WARN:
                return [
                    'Verify the relationship with the conflicting entity',
                    'Check if this is a legitimate duplicate or related party',
                    'Document any verification performed'
                ];

            case SEVERITY.INFO:
                return [
                    'Review the match to confirm it is not a duplicate',
                    'No action required if entities are distinct'
                ];

            default:
                return [];
        }
    }

    /**
     * Determine overall severity
     */
    static determineOverallSeverity(conflicts) {
        if (conflicts.some(c => c.severity === SEVERITY.BLOCK)) {
            return SEVERITY.BLOCK;
        }
        if (conflicts.some(c => c.severity === SEVERITY.WARN)) {
            return SEVERITY.WARN;
        }
        if (conflicts.length > 0) {
            return SEVERITY.INFO;
        }
        return null;
    }

    // ═══════════════════════════════════════════════════════════
    // WAIVER MANAGEMENT
    // ═══════════════════════════════════════════════════════════

    /**
     * Request conflict waiver
     * @param {object} conflictCheck - Conflict check result
     * @param {object} waiverData - Waiver request data
     * @param {object} firmQuery - Firm query
     * @returns {object} - Waiver request
     */
    static async requestWaiver(conflictCheck, waiverData, firmQuery) {
        // This would create a waiver request document
        // For now, return the request structure

        return {
            id: new mongoose.Types.ObjectId(),
            status: 'pending',
            requestedBy: waiverData.requestedBy,
            requestedAt: new Date(),
            conflictCheckId: conflictCheck.id,
            conflicts: conflictCheck.conflicts,
            justification: waiverData.justification,
            approvers: waiverData.approvers || [],
            attachments: waiverData.attachments || [],
            firmId: firmQuery.firmId
        };
    }

    /**
     * Approve waiver
     */
    static async approveWaiver(waiverId, approverId, comments, firmQuery) {
        return {
            id: waiverId,
            status: 'approved',
            approvedBy: approverId,
            approvedAt: new Date(),
            comments
        };
    }

    /**
     * Reject waiver
     */
    static async rejectWaiver(waiverId, rejecterId, reason, firmQuery) {
        return {
            id: waiverId,
            status: 'rejected',
            rejectedBy: rejecterId,
            rejectedAt: new Date(),
            reason
        };
    }

    // ═══════════════════════════════════════════════════════════
    // BATCH OPERATIONS
    // ═══════════════════════════════════════════════════════════

    /**
     * Batch check multiple entities
     * @param {Array} entities - Entities to check
     * @param {object} firmQuery - Firm query
     * @param {object} options - Check options
     * @returns {object} - Batch check results
     */
    static async batchCheck(entities, firmQuery, options = {}) {
        const results = [];

        for (const entity of entities) {
            try {
                const result = await this.checkConflicts(entity, firmQuery, {
                    ...options,
                    excludeId: entity._id
                });

                results.push({
                    entityId: entity._id,
                    success: true,
                    ...result
                });
            } catch (error) {
                results.push({
                    entityId: entity._id,
                    success: false,
                    error: error.message
                });
            }
        }

        return {
            checked: results.length,
            withConflicts: results.filter(r => r.hasConflicts).length,
            blocking: results.filter(r => r.overallSeverity === SEVERITY.BLOCK).length,
            results
        };
    }

    // ═══════════════════════════════════════════════════════════
    // ANALYTICS
    // ═══════════════════════════════════════════════════════════

    /**
     * Get conflict check statistics
     * @param {object} firmQuery - Firm query
     * @param {object} dateRange - Date range
     * @returns {object} - Statistics
     */
    static async getStatistics(firmQuery, dateRange = {}) {
        // This would query a conflict check history collection
        // For now, return sample structure

        return {
            totalChecks: 0,
            checksWithConflicts: 0,
            blockingConflicts: 0,
            waiversRequested: 0,
            waiversApproved: 0,
            waiversRejected: 0,
            avgCheckDuration: 0,
            mostCommonFields: [],
            period: dateRange
        };
    }
}

module.exports = ConflictCheckService;
module.exports.SEVERITY = SEVERITY;
module.exports.MATCH_TYPE = MATCH_TYPE;
