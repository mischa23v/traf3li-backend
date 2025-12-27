const mongoose = require('mongoose');
const Lead = require('../models/lead.model');
const Contact = require('../models/contact.model');
const Client = require('../models/client.model');
const logger = require('../utils/logger');

/**
 * Escape special regex characters to prevent ReDoS attacks
 */
const escapeRegex = (str) => {
    if (typeof str !== 'string') return str;
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Duplicate Detection Service
 * Finds and helps merge duplicate leads, contacts, and clients
 */
class DuplicateDetectionService {
    /**
     * Find potential duplicates for a record
     * @param {string} entityType - 'lead', 'contact', or 'client'
     * @param {Object} data - Record data to check
     * @param {ObjectId} firmId - Firm ID
     * @param {ObjectId} excludeId - ID to exclude from results
     */
    async findDuplicates(entityType, data, firmId, excludeId = null) {
        const Model = this.getModel(entityType);
        const duplicates = [];

        const baseQuery = { firmId };
        if (excludeId) {
            baseQuery._id = { $ne: excludeId };
        }

        // Check by email (exact match - highest confidence)
        if (data.email) {
            const emailMatches = await Model.find({
                ...baseQuery,
                email: data.email.toLowerCase()
            }).limit(5);

            emailMatches.forEach(match => {
                duplicates.push({
                    record: match,
                    matchType: 'email',
                    confidence: 100,
                    field: 'email'
                });
            });
        }

        // Check by phone (normalized - high confidence)
        if (data.phone) {
            const normalizedPhone = this.normalizePhone(data.phone);
            const phoneMatches = await Model.find({
                ...baseQuery,
                $or: [
                    { phone: { $regex: normalizedPhone.slice(-9), $options: 'i' } },
                    { mobile: { $regex: normalizedPhone.slice(-9), $options: 'i' } },
                    { alternatePhone: { $regex: normalizedPhone.slice(-9), $options: 'i' } }
                ]
            }).limit(5);

            phoneMatches.forEach(match => {
                if (!duplicates.find(d => d.record._id.equals(match._id))) {
                    duplicates.push({
                        record: match,
                        matchType: 'phone',
                        confidence: 95,
                        field: 'phone'
                    });
                }
            });
        }

        // Check by national ID (exact - very high confidence)
        if (data.nationalId) {
            const idMatches = await Model.find({
                ...baseQuery,
                nationalId: data.nationalId
            }).limit(5);

            idMatches.forEach(match => {
                if (!duplicates.find(d => d.record._id.equals(match._id))) {
                    duplicates.push({
                        record: match,
                        matchType: 'nationalId',
                        confidence: 100,
                        field: 'nationalId'
                    });
                }
            });
        }

        // Check by CR number for companies
        if (data.crNumber) {
            const crMatches = await Model.find({
                ...baseQuery,
                crNumber: data.crNumber
            }).limit(5);

            crMatches.forEach(match => {
                if (!duplicates.find(d => d.record._id.equals(match._id))) {
                    duplicates.push({
                        record: match,
                        matchType: 'crNumber',
                        confidence: 100,
                        field: 'crNumber'
                    });
                }
            });
        }

        // Check by name similarity (fuzzy - medium confidence)
        const fullName = this.buildFullName(data);
        if (fullName && fullName.length > 3) {
            const nameMatches = await this.findByNameSimilarity(Model, baseQuery, fullName);

            nameMatches.forEach(match => {
                if (!duplicates.find(d => d.record._id.equals(match.record._id))) {
                    duplicates.push(match);
                }
            });
        }

        // Sort by confidence
        duplicates.sort((a, b) => b.confidence - a.confidence);

        return duplicates;
    }

    /**
     * Find by name similarity
     */
    async findByNameSimilarity(Model, baseQuery, fullName) {
        const results = [];
        const nameParts = fullName.split(' ').filter(p => p.length > 2);

        if (nameParts.length === 0) return results;

        // Build regex for each name part with escapeRegex for security
        const nameRegexes = nameParts.map(part => ({
            $or: [
                { firstName: { $regex: escapeRegex(part), $options: 'i' } },
                { lastName: { $regex: escapeRegex(part), $options: 'i' } },
                { companyName: { $regex: escapeRegex(part), $options: 'i' } },
                { fullNameArabic: { $regex: escapeRegex(part), $options: 'i' } }
            ]
        }));

        const matches = await Model.find({
            ...baseQuery,
            $and: nameRegexes.slice(0, 2) // Match at least first two parts
        }).limit(10);

        matches.forEach(match => {
            const matchName = this.buildFullName(match);
            const similarity = this.calculateSimilarity(fullName, matchName);

            if (similarity > 0.7) {
                results.push({
                    record: match,
                    matchType: 'name',
                    confidence: Math.round(similarity * 80), // Max 80% for name matches
                    field: 'name',
                    similarity
                });
            }
        });

        return results;
    }

    /**
     * Calculate string similarity (Jaccard similarity on words)
     */
    calculateSimilarity(str1, str2) {
        if (!str1 || !str2) return 0;

        const words1 = new Set(str1.toLowerCase().split(/\s+/));
        const words2 = new Set(str2.toLowerCase().split(/\s+/));

        const intersection = new Set([...words1].filter(x => words2.has(x)));
        const union = new Set([...words1, ...words2]);

        return intersection.size / union.size;
    }

    /**
     * Calculate overall duplicate score
     */
    calculateDuplicateScore(duplicates) {
        if (duplicates.length === 0) return 0;

        // Weighted average based on match types
        const weights = {
            email: 30,
            nationalId: 30,
            crNumber: 30,
            phone: 20,
            name: 10
        };

        let totalWeight = 0;
        let totalScore = 0;

        duplicates.forEach(d => {
            const weight = weights[d.matchType] || 5;
            totalWeight += weight;
            totalScore += (d.confidence * weight);
        });

        return Math.round(totalScore / totalWeight);
    }

    /**
     * Merge two records (keep master, archive duplicate)
     * @param {string} entityType - Entity type
     * @param {ObjectId} masterId - ID of record to keep
     * @param {ObjectId} duplicateId - ID of record to merge into master
     * @param {ObjectId} firmId - Firm ID
     * @param {ObjectId} userId - User performing merge
     * @param {Object} fieldOverrides - Specific fields to take from duplicate
     */
    async mergeRecords(entityType, masterId, duplicateId, firmId, userId, fieldOverrides = {}) {
        const Model = this.getModel(entityType);

        const [master, duplicate] = await Promise.all([
            Model.findOne({ _id: masterId, firmId }),
            Model.findOne({ _id: duplicateId, firmId })
        ]);

        if (!master || !duplicate) {
            throw new Error('One or both records not found');
        }

        // Merge fields - take non-empty values from duplicate if master is empty
        const mergedData = this.mergeFields(master.toObject(), duplicate.toObject(), fieldOverrides);

        // Update master with merged data
        mergedData.mergedFrom = master.mergedFrom || [];
        mergedData.mergedFrom.push(duplicateId);
        mergedData.updatedBy = userId;

        await Model.findOneAndUpdate(
            { _id: masterId, firmId },
            { $set: mergedData }
        );

        // Archive the duplicate
        await Model.findOneAndUpdate(
            { _id: duplicateId, firmId },
            {
                $set: {
                    status: 'archived',
                    duplicateOf: masterId,
                    isMaster: false,
                    updatedBy: userId
                }
            }
        );

        // Update related records to point to master
        await this.updateRelatedRecords(entityType, duplicateId, masterId, firmId);

        logger.info(`Merged ${entityType} ${duplicateId} into ${masterId}`);

        return Model.findOne({ _id: masterId, firmId });
    }

    /**
     * Merge fields from two objects
     */
    mergeFields(master, duplicate, overrides = {}) {
        const merged = { ...master };

        // Fields to merge (take from duplicate if master is empty)
        const mergeableFields = [
            'phone', 'mobile', 'fax', 'email', 'alternatePhone', 'whatsapp',
            'address', 'nationalAddress', 'website', 'industry',
            'notes', 'tags'
        ];

        mergeableFields.forEach(field => {
            // Use override if specified
            if (overrides[field] === 'duplicate') {
                merged[field] = duplicate[field];
            } else if (!merged[field] && duplicate[field]) {
                // Take from duplicate if master is empty
                merged[field] = duplicate[field];
            }
        });

        // Merge tags arrays
        if (duplicate.tags && Array.isArray(duplicate.tags)) {
            merged.tags = [...new Set([...(master.tags || []), ...duplicate.tags])];
        }

        // Merge notes
        if (duplicate.notes && duplicate.notes !== master.notes) {
            merged.notes = `${master.notes || ''}\n\n--- Merged from duplicate ---\n${duplicate.notes}`;
        }

        return merged;
    }

    /**
     * Update related records after merge
     */
    async updateRelatedRecords(entityType, oldId, newId, firmId) {
        const CrmActivity = mongoose.model('CrmActivity');

        // Update activities
        await CrmActivity.updateMany(
            { firmId, entityType, entityId: oldId },
            { $set: { entityId: newId } }
        );

        // Entity-specific updates
        if (entityType === 'contact') {
            // Update case contacts
            const Case = mongoose.model('Case');
            await Case.updateMany(
                { firmId, 'contacts.contactId': oldId },
                { $set: { 'contacts.$.contactId': newId } }
            );
        }

        if (entityType === 'lead') {
            // Update quotes
            const Quote = mongoose.model('Quote');
            await Quote.updateMany(
                { firmId, leadId: oldId },
                { $set: { leadId: newId } }
            );
        }
    }

    /**
     * Get model by entity type
     */
    getModel(entityType) {
        switch (entityType.toLowerCase()) {
            case 'lead': return Lead;
            case 'contact': return Contact;
            case 'client': return Client;
            default: throw new Error(`Unknown entity type: ${entityType}`);
        }
    }

    /**
     * Normalize phone number
     */
    normalizePhone(phone) {
        if (!phone) return '';
        return phone.replace(/\D/g, '');
    }

    /**
     * Build full name from record
     */
    buildFullName(data) {
        if (data.companyName) return data.companyName;

        const parts = [
            data.firstName,
            data.middleName,
            data.lastName
        ].filter(Boolean);

        return parts.join(' ') || data.fullNameArabic || '';
    }

    /**
     * Scan all records for duplicates (batch job)
     */
    async scanForDuplicates(entityType, firmId, options = {}) {
        const Model = this.getModel(entityType);
        const batchSize = options.batchSize || 100;
        const results = [];

        let skip = 0;
        let hasMore = true;

        while (hasMore) {
            const records = await Model.find({ firmId, status: { $ne: 'archived' } })
                .skip(skip)
                .limit(batchSize)
                .lean();

            if (records.length === 0) {
                hasMore = false;
                continue;
            }

            for (const record of records) {
                const duplicates = await this.findDuplicates(entityType, record, firmId, record._id);

                if (duplicates.length > 0) {
                    results.push({
                        record,
                        duplicates: duplicates.slice(0, 5),
                        score: this.calculateDuplicateScore(duplicates)
                    });
                }
            }

            skip += batchSize;
        }

        // Sort by score and return top duplicates
        return results.sort((a, b) => b.score - a.score);
    }
}

module.exports = new DuplicateDetectionService();
