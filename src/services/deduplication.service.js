const Contact = require('../models/contact.model');
const CrmActivity = require('../models/crmActivity.model');
const Case = require('../models/case.model');
const Invoice = require('../models/invoice.model');
const Conversation = require('../models/conversation.model');
const Lead = require('../models/lead.model');
const Client = require('../models/client.model');
const Organization = require('../models/organization.model');
const Referral = require('../models/referral.model');
const mongoose = require('mongoose');
const logger = require('../utils/logger');

/**
 * Contact Deduplication Service
 *
 * Detects and merges duplicate contacts using Jaro-Winkler similarity algorithm
 * and multi-factor matching (name, email, phone, company).
 *
 * Features:
 * - Jaro-Winkler string similarity for fuzzy name matching
 * - Multi-factor weighted scoring (name, email, phone, company)
 * - Bulk duplicate scanning with blocking optimization
 * - Contact merging with reference updates across all models
 * - Auto-merge for high-confidence duplicates
 * - Manual duplicate ignore list
 */

class DeduplicationService {
    // ═══════════════════════════════════════════════════════════════
    // STRING SIMILARITY ALGORITHMS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Jaro-Winkler string similarity algorithm
     * Returns similarity score between 0 (no match) and 1 (perfect match)
     * @param {String} s1 - First string
     * @param {String} s2 - Second string
     * @returns {Number} Similarity score 0-1
     */
    static jaroWinkler(s1, s2) {
        if (!s1 || !s2) return 0;
        if (s1 === s2) return 1;

        s1 = s1.toLowerCase().trim();
        s2 = s2.toLowerCase().trim();

        if (s1 === s2) return 1;

        // Calculate Jaro similarity first
        const jaroScore = this._jaro(s1, s2);

        // Apply Winkler modification
        // Bonus for common prefix (up to 4 characters)
        let prefixLength = 0;
        const maxPrefixLength = Math.min(4, Math.min(s1.length, s2.length));

        for (let i = 0; i < maxPrefixLength; i++) {
            if (s1[i] === s2[i]) {
                prefixLength++;
            } else {
                break;
            }
        }

        const prefixScale = 0.1; // Standard Jaro-Winkler prefix scale
        return jaroScore + (prefixLength * prefixScale * (1 - jaroScore));
    }

    /**
     * Jaro similarity algorithm (helper for Jaro-Winkler)
     * @private
     */
    static _jaro(s1, s2) {
        const len1 = s1.length;
        const len2 = s2.length;

        if (len1 === 0 && len2 === 0) return 1;
        if (len1 === 0 || len2 === 0) return 0;

        // Maximum allowed distance for matching characters
        const matchDistance = Math.floor(Math.max(len1, len2) / 2) - 1;
        if (matchDistance < 0) return 0;

        const s1Matches = new Array(len1).fill(false);
        const s2Matches = new Array(len2).fill(false);

        let matches = 0;
        let transpositions = 0;

        // Find matches
        for (let i = 0; i < len1; i++) {
            const start = Math.max(0, i - matchDistance);
            const end = Math.min(i + matchDistance + 1, len2);

            for (let j = start; j < end; j++) {
                if (s2Matches[j] || s1[i] !== s2[j]) continue;
                s1Matches[i] = true;
                s2Matches[j] = true;
                matches++;
                break;
            }
        }

        if (matches === 0) return 0;

        // Count transpositions
        let k = 0;
        for (let i = 0; i < len1; i++) {
            if (!s1Matches[i]) continue;
            while (!s2Matches[k]) k++;
            if (s1[i] !== s2[k]) transpositions++;
            k++;
        }

        return (
            (matches / len1 +
             matches / len2 +
             (matches - transpositions / 2) / matches) / 3
        );
    }

    // ═══════════════════════════════════════════════════════════════
    // DUPLICATE DETECTION
    // ═══════════════════════════════════════════════════════════════

    /**
     * Find potential duplicates for a contact
     * @param {Object} contact - Contact object or ID
     * @param {ObjectId} firmId - Firm ID
     * @param {Number} threshold - Minimum match score (0-1), default 0.85
     * @returns {Array} Array of duplicate candidates with match scores
     */
    static async findDuplicates(contact, firmId, threshold = 0.85) {
        try {
            // Get contact if ID was passed
            if (typeof contact === 'string' || contact instanceof mongoose.Types.ObjectId) {
                contact = await Contact.findById(contact);
                if (!contact) {
                    throw new Error('Contact not found');
                }
            }

            if (!firmId && !contact.firmId) {
                throw new Error('Firm ID required');
            }

            firmId = firmId || contact.firmId;

            logger.info(`Finding duplicates for contact ${contact._id} with threshold ${threshold}`);

            // Build candidate query using blocking strategy
            const candidateQueries = [];

            // Block 1: Same email domain (if email exists)
            if (contact.email) {
                const emailDomain = contact.email.split('@')[1];
                if (emailDomain) {
                    candidateQueries.push({ email: { $regex: `@${emailDomain}$`, $options: 'i' } });
                }
            }

            // Block 2: Same phone (normalized)
            if (contact.phone) {
                const normalizedPhone = this.normalizePhone(contact.phone);
                if (normalizedPhone) {
                    candidateQueries.push({
                        $or: [
                            { phone: { $regex: normalizedPhone.slice(-8), $options: 'i' } },
                            { alternatePhone: { $regex: normalizedPhone.slice(-8), $options: 'i' } }
                        ]
                    });
                }
            }

            // Block 3: Similar last name (first 3 characters)
            if (contact.lastName && contact.lastName.length >= 3) {
                const lastNamePrefix = contact.lastName.substring(0, 3);
                candidateQueries.push({ lastName: { $regex: `^${lastNamePrefix}`, $options: 'i' } });
            }

            // Block 4: Same company
            if (contact.company) {
                candidateQueries.push({ company: { $regex: contact.company, $options: 'i' } });
            }

            // Block 5: Same national ID or iqama
            if (contact.nationalId) {
                candidateQueries.push({ nationalId: contact.nationalId });
            }
            if (contact.iqamaNumber) {
                candidateQueries.push({ iqamaNumber: contact.iqamaNumber });
            }

            // If no blocking criteria, use first name
            if (candidateQueries.length === 0 && contact.firstName) {
                const firstNamePrefix = contact.firstName.substring(0, 3);
                candidateQueries.push({ firstName: { $regex: `^${firstNamePrefix}`, $options: 'i' } });
            }

            // Get candidates (exclude self and already merged contacts)
            const candidates = candidateQueries.length > 0
                ? await Contact.find({
                    firmId: firmId,
                    _id: { $ne: contact._id },
                    isMaster: true, // Only compare with master records
                    $or: candidateQueries
                }).limit(1000) // Safety limit
                : [];

            logger.info(`Found ${candidates.length} candidate contacts for comparison`);

            // Calculate match score for each candidate
            const duplicates = [];
            for (const candidate of candidates) {
                const score = this.calculateMatchScore(contact, candidate);
                if (score >= threshold) {
                    duplicates.push({
                        contactId: candidate._id,
                        contact: candidate,
                        matchScore: score,
                        matchedFields: this._getMatchedFields(contact, candidate, score)
                    });
                }
            }

            // Sort by score descending
            duplicates.sort((a, b) => b.matchScore - a.matchScore);

            logger.info(`Found ${duplicates.length} duplicates above threshold ${threshold}`);

            return duplicates;
        } catch (error) {
            logger.error('Error finding duplicates:', error);
            throw error;
        }
    }

    /**
     * Calculate overall match score between two contacts
     * @param {Object} contact1 - First contact
     * @param {Object} contact2 - Second contact
     * @returns {Number} Match score 0-1
     */
    static calculateMatchScore(contact1, contact2) {
        const weights = {
            name: 0.35,
            email: 0.30,
            phone: 0.20,
            company: 0.15
        };

        let score = 0;

        // 1. Name similarity (Jaro-Winkler on full name)
        const fullName1 = `${contact1.firstName || ''} ${contact1.lastName || ''}`.trim().toLowerCase();
        const fullName2 = `${contact2.firstName || ''} ${contact2.lastName || ''}`.trim().toLowerCase();

        if (fullName1 && fullName2) {
            const nameSimilarity = this.jaroWinkler(fullName1, fullName2);
            score += nameSimilarity * weights.name;
        }

        // Bonus for Arabic name match
        if (contact1.fullNameArabic && contact2.fullNameArabic) {
            const arabicSimilarity = this.jaroWinkler(contact1.fullNameArabic, contact2.fullNameArabic);
            score += arabicSimilarity * 0.1; // Additional 10% weight for Arabic name
        }

        // 2. Email similarity
        if (contact1.email && contact2.email) {
            const email1 = this.normalizeEmail(contact1.email);
            const email2 = this.normalizeEmail(contact2.email);

            if (email1 === email2) {
                score += weights.email; // Perfect match
            } else {
                const emailSimilarity = this.jaroWinkler(email1, email2);
                score += emailSimilarity * weights.email * 0.7; // Partial credit for similar emails
            }
        }

        // 3. Phone similarity (normalized comparison)
        if (contact1.phone && contact2.phone) {
            const phone1 = this.normalizePhone(contact1.phone);
            const phone2 = this.normalizePhone(contact2.phone);

            if (phone1 && phone2) {
                if (phone1 === phone2) {
                    score += weights.phone; // Perfect match
                } else {
                    // Check if last 8 digits match (local number)
                    const last8_1 = phone1.slice(-8);
                    const last8_2 = phone2.slice(-8);
                    if (last8_1 === last8_2 && last8_1.length === 8) {
                        score += weights.phone * 0.9; // Almost perfect
                    }
                }
            }
        }

        // Check alternate phone
        if (contact1.alternatePhone && contact2.phone) {
            const altPhone1 = this.normalizePhone(contact1.alternatePhone);
            const phone2 = this.normalizePhone(contact2.phone);
            if (altPhone1 === phone2) {
                score += weights.phone * 0.5; // Partial credit
            }
        }

        // 4. Company similarity
        if (contact1.company && contact2.company) {
            const companySimilarity = this.jaroWinkler(contact1.company, contact2.company);
            score += companySimilarity * weights.company;
        }

        // Bonus points for identity document matches (very strong signal)
        if (contact1.nationalId && contact2.nationalId && contact1.nationalId === contact2.nationalId) {
            score = 1.0; // Perfect match on national ID = definite duplicate
        }
        if (contact1.iqamaNumber && contact2.iqamaNumber && contact1.iqamaNumber === contact2.iqamaNumber) {
            score = 1.0; // Perfect match on iqama = definite duplicate
        }

        return Math.min(1, score); // Cap at 1.0
    }

    /**
     * Get list of fields that matched between two contacts
     * @private
     */
    static _getMatchedFields(contact1, contact2, score) {
        const matched = [];

        if (contact1.email && contact2.email &&
            this.normalizeEmail(contact1.email) === this.normalizeEmail(contact2.email)) {
            matched.push('email');
        }

        if (contact1.phone && contact2.phone &&
            this.normalizePhone(contact1.phone) === this.normalizePhone(contact2.phone)) {
            matched.push('phone');
        }

        if (contact1.nationalId && contact2.nationalId && contact1.nationalId === contact2.nationalId) {
            matched.push('nationalId');
        }

        if (contact1.iqamaNumber && contact2.iqamaNumber && contact1.iqamaNumber === contact2.iqamaNumber) {
            matched.push('iqamaNumber');
        }

        if (contact1.company && contact2.company &&
            this.jaroWinkler(contact1.company, contact2.company) > 0.9) {
            matched.push('company');
        }

        const fullName1 = `${contact1.firstName || ''} ${contact1.lastName || ''}`.trim();
        const fullName2 = `${contact2.firstName || ''} ${contact2.lastName || ''}`.trim();
        if (fullName1 && fullName2 && this.jaroWinkler(fullName1, fullName2) > 0.9) {
            matched.push('name');
        }

        return matched;
    }

    // ═══════════════════════════════════════════════════════════════
    // BULK DUPLICATE SCANNING
    // ═══════════════════════════════════════════════════════════════

    /**
     * Scan for duplicates in bulk across all contacts in a firm
     * @param {ObjectId} firmId - Firm ID
     * @param {Object} options - Scan options
     * @returns {Array} Array of duplicate pairs with scores
     */
    static async scanForDuplicates(firmId, options = {}) {
        try {
            const {
                threshold = 0.85,
                limit = 100,
                status = 'active'
            } = options;

            logger.info(`Starting bulk duplicate scan for firm ${firmId} with threshold ${threshold}`);

            // Get all active contacts for this firm
            const contacts = await Contact.find({
                firmId: firmId,
                status: status,
                isMaster: true // Only scan master records
            }).limit(limit).lean();

            logger.info(`Scanning ${contacts.length} contacts for duplicates`);

            const duplicatePairs = [];
            const processedPairs = new Set();

            // Compare each contact with others using blocking
            for (let i = 0; i < contacts.length; i++) {
                const contact = contacts[i];

                // Find duplicates for this contact
                const duplicates = await this.findDuplicates(contact, firmId, threshold);

                for (const dup of duplicates) {
                    const pairKey = [contact._id.toString(), dup.contactId.toString()].sort().join('|');

                    if (!processedPairs.has(pairKey)) {
                        processedPairs.add(pairKey);
                        duplicatePairs.push({
                            contact1: {
                                id: contact._id,
                                name: `${contact.firstName} ${contact.lastName}`,
                                email: contact.email,
                                phone: contact.phone
                            },
                            contact2: {
                                id: dup.contactId,
                                name: `${dup.contact.firstName} ${dup.contact.lastName}`,
                                email: dup.contact.email,
                                phone: dup.contact.phone
                            },
                            matchScore: dup.matchScore,
                            matchedFields: dup.matchedFields
                        });
                    }
                }
            }

            // Sort by score descending
            duplicatePairs.sort((a, b) => b.matchScore - a.matchScore);

            logger.info(`Found ${duplicatePairs.length} duplicate pairs`);

            return duplicatePairs;
        } catch (error) {
            logger.error('Error scanning for duplicates:', error);
            throw error;
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // CONTACT MERGING
    // ═══════════════════════════════════════════════════════════════

    /**
     * Merge two contacts
     * Master contact absorbs data from duplicate, all references updated
     * @param {ObjectId} masterId - ID of master contact (will be kept)
     * @param {ObjectId} duplicateId - ID of duplicate contact (will be marked as duplicate)
     * @param {ObjectId} userId - ID of user performing merge
     * @param {ObjectId} firmId - Firm ID
     * @returns {Object} Merged master contact
     */
    static async mergeContacts(masterId, duplicateId, userId, firmId) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            logger.info(`Merging contact ${duplicateId} into ${masterId} by user ${userId}`);

            // Get both contacts
            const master = await Contact.findOne({ _id: masterId, firmId }).session(session);
            const duplicate = await Contact.findOne({ _id: duplicateId, firmId }).session(session);

            if (!master || !duplicate) {
                throw new Error('One or both contacts not found');
            }

            if (master._id.equals(duplicate._id)) {
                throw new Error('Cannot merge contact with itself');
            }

            // Merge data: master takes priority, fill gaps from duplicate
            const mergeFields = [
                'middleName', 'preferredName', 'suffix', 'salutation', 'salutationAr',
                'title', 'department', 'alternatePhone',
                'arabicName', 'fullNameArabic',
                'gender', 'maritalStatus', 'dateOfBirth', 'dateOfBirthHijri', 'placeOfBirth',
                'nationality', 'nationalityCode',
                'nationalId', 'iqamaNumber', 'gccId', 'gccCountry', 'borderNumber', 'visitorId',
                'passportNumber', 'passportCountry', 'passportIssueDate', 'passportExpiryDate',
                'address', 'buildingNumber', 'district', 'city', 'province', 'postalCode', 'country',
                'nationalAddress', 'workAddress', 'poBox',
                'preferredLanguage', 'preferredContactMethod', 'bestTimeToContact',
                'notes', 'conflictNotes',
                'sponsor'
            ];

            for (const field of mergeFields) {
                if (!master[field] && duplicate[field]) {
                    master[field] = duplicate[field];
                }
            }

            // Merge email/phone if master doesn't have one
            if (!master.email && duplicate.email) {
                master.email = duplicate.email;
            }
            if (!master.phone && duplicate.phone) {
                master.phone = duplicate.phone;
            }
            if (!master.company && duplicate.company) {
                master.company = duplicate.company;
            }

            // Merge arrays (emails, phones)
            if (duplicate.emails && duplicate.emails.length > 0) {
                master.emails = master.emails || [];
                for (const email of duplicate.emails) {
                    const exists = master.emails.find(e => e.email === email.email);
                    if (!exists) {
                        master.emails.push(email);
                    }
                }
            }

            if (duplicate.phones && duplicate.phones.length > 0) {
                master.phones = master.phones || [];
                for (const phone of duplicate.phones) {
                    const exists = master.phones.find(p => p.number === phone.number);
                    if (!exists) {
                        master.phones.push(phone);
                    }
                }
            }

            // Merge tags
            if (duplicate.tags && duplicate.tags.length > 0) {
                master.tags = master.tags || [];
                for (const tag of duplicate.tags) {
                    if (!master.tags.includes(tag)) {
                        master.tags.push(tag);
                    }
                }
            }

            // Merge practice areas
            if (duplicate.practiceAreas && duplicate.practiceAreas.length > 0) {
                master.practiceAreas = master.practiceAreas || [];
                for (const area of duplicate.practiceAreas) {
                    if (!master.practiceAreas.includes(area)) {
                        master.practiceAreas.push(area);
                    }
                }
            }

            // Merge linked cases
            if (duplicate.linkedCases && duplicate.linkedCases.length > 0) {
                master.linkedCases = master.linkedCases || [];
                for (const caseId of duplicate.linkedCases) {
                    if (!master.linkedCases.find(c => c.equals(caseId))) {
                        master.linkedCases.push(caseId);
                    }
                }
            }

            // Merge linked clients
            if (duplicate.linkedClients && duplicate.linkedClients.length > 0) {
                master.linkedClients = master.linkedClients || [];
                for (const clientId of duplicate.linkedClients) {
                    if (!master.linkedClients.find(c => c.equals(clientId))) {
                        master.linkedClients.push(clientId);
                    }
                }
            }

            // Update all references across the system
            await this._updateReferences(masterId, duplicateId, session);

            // Mark duplicate as merged
            duplicate.duplicateOf = masterId;
            duplicate.isMaster = false;
            duplicate.mergedAt = new Date();
            duplicate.mergedBy = userId;
            duplicate.status = 'archived'; // Archive the duplicate

            // Add to master's mergedFrom array
            master.mergedFrom = master.mergedFrom || [];
            if (!master.mergedFrom.find(id => id.equals(duplicateId))) {
                master.mergedFrom.push(duplicateId);
            }

            // Update metadata
            master.updatedBy = userId;
            duplicate.updatedBy = userId;

            // Save both contacts
            await master.save({ session });
            await duplicate.save({ session });

            // Log the merge in CRM activities
            await CrmActivity.create([{
                firmId: firmId,
                userId: userId,
                entityType: 'contact',
                entityId: masterId,
                type: 'note',
                noteData: {
                    category: 'merge',
                    content: `Merged contact ${duplicateId} into this contact. Original contact archived.`,
                    visibility: 'internal'
                },
                createdBy: userId
            }], { session });

            await session.commitTransaction();

            logger.info(`Successfully merged contact ${duplicateId} into ${masterId}`);

            return master;
        } catch (error) {
            await session.abortTransaction();
            logger.error('Error merging contacts:', error);
            throw error;
        } finally {
            session.endSession();
        }
    }

    /**
     * Update all references from duplicate to master across all models
     * @private
     */
    static async _updateReferences(masterId, duplicateId, session) {
        try {
            logger.info(`Updating references from ${duplicateId} to ${masterId}`);

            // Update CRM Activities
            await CrmActivity.updateMany(
                { entityType: 'contact', entityId: duplicateId },
                { $set: { entityId: masterId } },
                { session }
            );

            // Update Cases (contact references)
            await Case.updateMany(
                { 'contacts.contactId': duplicateId },
                { $set: { 'contacts.$.contactId': masterId } },
                { session }
            );

            // Update Leads (contact reference)
            await Lead.updateMany(
                { contactId: duplicateId },
                { $set: { contactId: masterId } },
                { session }
            );

            // Update Clients (contact reference)
            await Client.updateMany(
                { contactId: duplicateId },
                { $set: { contactId: masterId } },
                { session }
            );

            // Update Organizations (primary contact)
            await Organization.updateMany(
                { primaryContactId: duplicateId },
                { $set: { primaryContactId: masterId } },
                { session }
            );

            // Update Referrals
            await Referral.updateMany(
                { $or: [{ referrerId: duplicateId }, { referredContactId: duplicateId }] },
                { $set: { referrerId: masterId, referredContactId: masterId } },
                { session }
            );

            // Update Invoices (if they have contact reference)
            await Invoice.updateMany(
                { contactId: duplicateId },
                { $set: { contactId: masterId } },
                { session }
            );

            // Update Conversations
            await Conversation.updateMany(
                { contactId: duplicateId },
                { $set: { contactId: masterId } },
                { session }
            );

            logger.info('All references updated successfully');
        } catch (error) {
            logger.error('Error updating references:', error);
            throw error;
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // AUTO-MERGE
    // ═══════════════════════════════════════════════════════════════

    /**
     * Auto-merge high-confidence duplicates
     * @param {ObjectId} firmId - Firm ID
     * @param {Number} threshold - Minimum match score for auto-merge (default 0.95)
     * @param {Boolean} dryRun - If true, only return what would be merged
     * @returns {Object} Merge results
     */
    static async autoMerge(firmId, threshold = 0.95, dryRun = false) {
        try {
            logger.info(`Auto-merge scan for firm ${firmId} with threshold ${threshold}, dryRun: ${dryRun}`);

            // Find duplicate pairs with high confidence
            const duplicatePairs = await this.scanForDuplicates(firmId, {
                threshold: threshold,
                limit: 500
            });

            const results = {
                merged: 0,
                pairs: [],
                errors: []
            };

            for (const pair of duplicatePairs) {
                if (dryRun) {
                    results.pairs.push({
                        master: pair.contact1,
                        duplicate: pair.contact2,
                        matchScore: pair.matchScore,
                        wouldMerge: true
                    });
                } else {
                    try {
                        // Auto-merge: choose contact with more data as master
                        const contact1 = await Contact.findById(pair.contact1.id);
                        const contact2 = await Contact.findById(pair.contact2.id);

                        const score1 = this._getDataCompletenessScore(contact1);
                        const score2 = this._getDataCompletenessScore(contact2);

                        const masterId = score1 >= score2 ? pair.contact1.id : pair.contact2.id;
                        const duplicateId = score1 >= score2 ? pair.contact2.id : pair.contact1.id;

                        await this.mergeContacts(masterId, duplicateId, null, firmId);

                        results.merged++;
                        results.pairs.push({
                            master: masterId,
                            duplicate: duplicateId,
                            matchScore: pair.matchScore,
                            merged: true
                        });
                    } catch (error) {
                        logger.error(`Error auto-merging pair ${pair.contact1.id} and ${pair.contact2.id}:`, error);
                        results.errors.push({
                            contact1: pair.contact1.id,
                            contact2: pair.contact2.id,
                            error: error.message
                        });
                    }
                }
            }

            logger.info(`Auto-merge complete: ${results.merged} merged, ${results.errors.length} errors`);

            return results;
        } catch (error) {
            logger.error('Error in auto-merge:', error);
            throw error;
        }
    }

    /**
     * Calculate data completeness score for a contact
     * Used to determine which contact should be the master
     * @private
     */
    static _getDataCompletenessScore(contact) {
        let score = 0;

        const fields = [
            'email', 'phone', 'alternatePhone', 'company', 'title', 'department',
            'nationalId', 'iqamaNumber', 'passportNumber',
            'address', 'city', 'postalCode',
            'notes', 'arabicName', 'fullNameArabic'
        ];

        for (const field of fields) {
            if (contact[field]) score++;
        }

        if (contact.emails && contact.emails.length > 0) score += contact.emails.length;
        if (contact.phones && contact.phones.length > 0) score += contact.phones.length;
        if (contact.tags && contact.tags.length > 0) score += contact.tags.length;
        if (contact.linkedCases && contact.linkedCases.length > 0) score += contact.linkedCases.length * 2;

        return score;
    }

    // ═══════════════════════════════════════════════════════════════
    // DUPLICATE SUGGESTIONS & MANAGEMENT
    // ═══════════════════════════════════════════════════════════════

    /**
     * Get duplicate suggestions for manual review
     * @param {ObjectId} firmId - Firm ID
     * @param {Number} limit - Maximum number of suggestions
     * @returns {Array} Duplicate suggestions
     */
    static async getDuplicateSuggestions(firmId, limit = 50) {
        try {
            logger.info(`Getting duplicate suggestions for firm ${firmId}`);

            const duplicatePairs = await this.scanForDuplicates(firmId, {
                threshold: 0.75, // Lower threshold for suggestions
                limit: limit * 2 // Scan more to get enough after filtering
            });

            // Filter out pairs that have been marked as "not duplicate"
            // (This would require a NotDuplicate model/collection - to be implemented)

            return duplicatePairs.slice(0, limit);
        } catch (error) {
            logger.error('Error getting duplicate suggestions:', error);
            throw error;
        }
    }

    /**
     * Mark two contacts as not duplicates (ignore future suggestions)
     * @param {ObjectId} contactId1 - First contact ID
     * @param {ObjectId} contactId2 - Second contact ID
     * @param {ObjectId} userId - User ID
     * @param {ObjectId} firmId - Firm ID
     * @returns {Object} Success result
     */
    static async markNotDuplicate(contactId1, contactId2, userId, firmId) {
        try {
            logger.info(`Marking contacts ${contactId1} and ${contactId2} as not duplicates`);

            // Store in CRM activity as a note for now
            // In a production system, you might want a dedicated NotDuplicate collection
            await CrmActivity.create({
                firmId: firmId,
                userId: userId,
                entityType: 'contact',
                entityId: contactId1,
                type: 'note',
                noteData: {
                    category: 'duplicate_ignore',
                    content: `Marked contact ${contactId2} as NOT a duplicate of this contact`,
                    metadata: {
                        otherContactId: contactId2,
                        markedAt: new Date()
                    },
                    visibility: 'internal'
                },
                createdBy: userId
            });

            return {
                success: true,
                message: 'Contacts marked as not duplicates'
            };
        } catch (error) {
            logger.error('Error marking contacts as not duplicates:', error);
            throw error;
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // NORMALIZATION HELPERS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Normalize phone number for comparison
     * Removes all non-digits, handles country codes
     * @param {String} phone - Phone number
     * @returns {String} Normalized phone number
     */
    static normalizePhone(phone) {
        if (!phone) return '';

        // Remove all non-digits
        let normalized = phone.replace(/\D/g, '');

        // Handle Saudi Arabia country code
        if (normalized.startsWith('966')) {
            normalized = normalized.substring(3);
        } else if (normalized.startsWith('00966')) {
            normalized = normalized.substring(5);
        } else if (normalized.startsWith('+966')) {
            normalized = normalized.substring(4);
        }

        // Remove leading zero
        if (normalized.startsWith('0')) {
            normalized = normalized.substring(1);
        }

        return normalized;
    }

    /**
     * Normalize email for comparison
     * Handles gmail dots and plus addressing
     * @param {String} email - Email address
     * @returns {String} Normalized email
     */
    static normalizeEmail(email) {
        if (!email) return '';

        email = email.toLowerCase().trim();

        const [localPart, domain] = email.split('@');
        if (!domain) return email;

        let normalizedLocal = localPart;

        // Gmail-specific normalization
        if (domain === 'gmail.com' || domain === 'googlemail.com') {
            // Remove dots (ignored by Gmail)
            normalizedLocal = normalizedLocal.replace(/\./g, '');

            // Remove plus addressing (everything after +)
            const plusIndex = normalizedLocal.indexOf('+');
            if (plusIndex !== -1) {
                normalizedLocal = normalizedLocal.substring(0, plusIndex);
            }
        }

        // For other providers, just remove plus addressing
        else {
            const plusIndex = normalizedLocal.indexOf('+');
            if (plusIndex !== -1) {
                normalizedLocal = normalizedLocal.substring(0, plusIndex);
            }
        }

        return `${normalizedLocal}@${domain}`;
    }
}

// Export as singleton
module.exports = DeduplicationService;
