const LegalContract = require('../models/legalContract.model');
const Case = require('../models/case.model');
const Client = require('../models/client.model');
const mongoose = require('mongoose');

/**
 * Legal Contract Service
 *
 * Comprehensive service for managing legal contracts with features:
 * - CRUD operations
 * - Party management
 * - Signature workflow
 * - Amendments and version control
 * - Najiz integration
 * - Enforcement tracking
 * - Reminders and reporting
 */
class LegalContractService {
    // ═══════════════════════════════════════════════════════════════
    // CRUD OPERATIONS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Create new legal contract
     * @param {Object} data - Contract data
     * @param {String} userId - User creating the contract
     * @param {String} firmId - Firm ID for multi-tenancy
     * @returns {Promise<Object>} Created contract
     */
    static async create(data, userId, firmId) {
        try {
            // Generate contract number using helper
            const contractNumber = await this._generateContractNumber(firmId);

            const contractData = {
                ...data,
                contractNumber,
                firmId,
                createdBy: userId,
                updatedBy: userId,
                lawyerId: data.lawyerId || userId,
                status: data.status || 'draft',
                version: 1
            };

            const contract = await LegalContract.create(contractData);

            return {
                success: true,
                data: await contract.populate([
                    { path: 'createdBy', select: 'name email' },
                    { path: 'lawyerId', select: 'name email' },
                    { path: 'linkedRecords.clientId', select: 'clientNumber fullNameArabic companyName' },
                    { path: 'linkedRecords.caseId', select: 'caseNumber title' }
                ])
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get contract by ID
     * @param {String} contractId - Contract ID
     * @param {String} firmId - Firm ID for authorization
     * @returns {Promise<Object>} Contract with populated references
     */
    static async getById(contractId, firmId) {
        try {
            const contract = await LegalContract.findOne({
                _id: contractId,
                firmId
            }).populate([
                { path: 'createdBy', select: 'name email' },
                { path: 'updatedBy', select: 'name email' },
                { path: 'lawyerId', select: 'name email phone' },
                { path: 'assignedTo', select: 'name email' },
                { path: 'linkedRecords.clientId', select: 'clientNumber fullNameArabic companyName phone email' },
                { path: 'linkedRecords.caseId', select: 'caseNumber title status' },
                { path: 'linkedRecords.invoiceIds', select: 'invoiceNumber totalAmount status' },
                { path: 'workflow.approvers.userId', select: 'name email' },
                { path: 'workflow.steps.assignee', select: 'name email' },
                { path: 'workflow.steps.completedBy', select: 'name email' }
            ]);

            if (!contract) {
                return {
                    success: false,
                    error: 'Contract not found'
                };
            }

            return {
                success: true,
                data: contract
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Update contract
     * @param {String} contractId - Contract ID
     * @param {Object} updates - Fields to update
     * @param {String} userId - User making the update
     * @param {String} firmId - Firm ID for authorization
     * @returns {Promise<Object>} Updated contract
     */
    static async update(contractId, updates, userId, firmId) {
        try {
            const contract = await LegalContract.findOne({
                _id: contractId,
                firmId
            });

            if (!contract) {
                return {
                    success: false,
                    error: 'Contract not found'
                };
            }

            // Check if this is a significant change requiring version tracking
            const significantFields = ['content', 'parties', 'financialTerms', 'clauses'];
            const isSignificantChange = Object.keys(updates).some(key =>
                significantFields.some(field => key.includes(field))
            );

            // If significant change, create version before updating
            if (isSignificantChange && contract.status !== 'draft') {
                await contract.createVersion(userId, 'Auto-save before update');
            }

            // Apply updates
            Object.assign(contract, updates);
            contract.updatedBy = userId;

            await contract.save();

            return {
                success: true,
                data: await contract.populate([
                    { path: 'createdBy', select: 'name email' },
                    { path: 'updatedBy', select: 'name email' },
                    { path: 'lawyerId', select: 'name email' }
                ])
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Soft delete (archive) contract
     * @param {String} contractId - Contract ID
     * @param {String} userId - User deleting the contract
     * @param {String} firmId - Firm ID for authorization
     * @returns {Promise<Object>} Success status
     */
    static async delete(contractId, userId, firmId) {
        try {
            const contract = await LegalContract.findOne({
                _id: contractId,
                firmId
            });

            if (!contract) {
                return {
                    success: false,
                    error: 'Contract not found'
                };
            }

            // Soft delete by archiving
            contract.status = 'archived';
            contract.updatedBy = userId;
            contract.statusHistory.push({
                status: 'archived',
                date: new Date(),
                changedBy: userId,
                reason: 'Archived by user'
            });

            await contract.save();

            return {
                success: true,
                message: 'Contract archived successfully'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * List contracts with pagination and filters
     * @param {String} firmId - Firm ID
     * @param {Object} options - Query options
     * @returns {Promise<Object>} List of contracts with pagination
     */
    static async list(firmId, options = {}) {
        try {
            const {
                page = 1,
                limit = 20,
                status,
                contractType,
                clientId,
                lawyerId,
                startDate,
                endDate,
                search,
                sortBy = 'createdAt',
                sortOrder = 'desc'
            } = options;

            // Build query
            const query = { firmId };

            if (status) {
                query.status = Array.isArray(status) ? { $in: status } : status;
            }

            if (contractType) {
                query.contractType = contractType;
            }

            if (clientId) {
                query['linkedRecords.clientId'] = clientId;
            }

            if (lawyerId) {
                query.lawyerId = lawyerId;
            }

            // Date range filter
            if (startDate || endDate) {
                query.createdAt = {};
                if (startDate) query.createdAt.$gte = new Date(startDate);
                if (endDate) query.createdAt.$lte = new Date(endDate);
            }

            // Text search
            if (search) {
                query.$text = { $search: search };
            }

            // Calculate pagination
            const skip = (page - 1) * limit;
            const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

            // Execute query
            const [contracts, total] = await Promise.all([
                LegalContract.find(query)
                    .populate([
                        { path: 'lawyerId', select: 'name email' },
                        { path: 'linkedRecords.clientId', select: 'clientNumber fullNameArabic companyName' },
                        { path: 'linkedRecords.caseId', select: 'caseNumber title' }
                    ])
                    .sort(sort)
                    .skip(skip)
                    .limit(limit)
                    .lean(),
                LegalContract.countDocuments(query)
            ]);

            return {
                success: true,
                data: contracts,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Full-text search contracts
     * @param {String} firmId - Firm ID
     * @param {String} query - Search query
     * @returns {Promise<Object>} Search results
     */
    static async search(firmId, query) {
        try {
            const contracts = await LegalContract.find({
                firmId,
                $text: { $search: query }
            }, {
                score: { $meta: 'textScore' }
            })
                .populate([
                    { path: 'lawyerId', select: 'name email' },
                    { path: 'linkedRecords.clientId', select: 'clientNumber fullNameArabic companyName' }
                ])
                .sort({ score: { $meta: 'textScore' } })
                .limit(50)
                .lean();

            return {
                success: true,
                data: contracts,
                count: contracts.length
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // PARTY MANAGEMENT
    // ═══════════════════════════════════════════════════════════════

    /**
     * Add party to contract
     * @param {String} contractId - Contract ID
     * @param {Object} partyData - Party information
     * @param {String} userId - User adding the party
     * @param {String} firmId - Firm ID for authorization
     * @returns {Promise<Object>} Updated contract
     */
    static async addParty(contractId, partyData, userId, firmId) {
        try {
            const contract = await LegalContract.findOne({
                _id: contractId,
                firmId
            });

            if (!contract) {
                return {
                    success: false,
                    error: 'Contract not found'
                };
            }

            // Validate party data
            const validation = this._validateParty(partyData);
            if (!validation.valid) {
                return {
                    success: false,
                    error: validation.error
                };
            }

            // Add default signature status
            const party = {
                ...partyData,
                signatureStatus: partyData.signatureStatus || 'pending'
            };

            contract.parties.push(party);
            contract.updatedBy = userId;

            await contract.save();

            return {
                success: true,
                data: contract,
                partyIndex: contract.parties.length - 1
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Update party information
     * @param {String} contractId - Contract ID
     * @param {Number} partyIndex - Index of party in array
     * @param {Object} partyData - Updated party data
     * @param {String} userId - User updating the party
     * @param {String} firmId - Firm ID for authorization
     * @returns {Promise<Object>} Updated contract
     */
    static async updateParty(contractId, partyIndex, partyData, userId, firmId) {
        try {
            const contract = await LegalContract.findOne({
                _id: contractId,
                firmId
            });

            if (!contract) {
                return {
                    success: false,
                    error: 'Contract not found'
                };
            }

            if (!contract.parties[partyIndex]) {
                return {
                    success: false,
                    error: 'Party not found at specified index'
                };
            }

            // Validate party data
            const validation = this._validateParty(partyData);
            if (!validation.valid) {
                return {
                    success: false,
                    error: validation.error
                };
            }

            // Update party
            Object.assign(contract.parties[partyIndex], partyData);
            contract.updatedBy = userId;

            await contract.save();

            return {
                success: true,
                data: contract
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Remove party from contract
     * @param {String} contractId - Contract ID
     * @param {Number} partyIndex - Index of party to remove
     * @param {String} userId - User removing the party
     * @param {String} firmId - Firm ID for authorization
     * @returns {Promise<Object>} Updated contract
     */
    static async removeParty(contractId, partyIndex, userId, firmId) {
        try {
            const contract = await LegalContract.findOne({
                _id: contractId,
                firmId
            });

            if (!contract) {
                return {
                    success: false,
                    error: 'Contract not found'
                };
            }

            if (!contract.parties[partyIndex]) {
                return {
                    success: false,
                    error: 'Party not found at specified index'
                };
            }

            // Only allow removal in draft status
            if (contract.status !== 'draft') {
                return {
                    success: false,
                    error: 'Cannot remove party from non-draft contract'
                };
            }

            contract.parties.splice(partyIndex, 1);
            contract.updatedBy = userId;

            await contract.save();

            return {
                success: true,
                data: contract
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // SIGNATURE WORKFLOW
    // ═══════════════════════════════════════════════════════════════

    /**
     * Initiate signature process
     * @param {String} contractId - Contract ID
     * @param {String} userId - User initiating signature
     * @param {String} firmId - Firm ID for authorization
     * @returns {Promise<Object>} Updated contract
     */
    static async initiateSignature(contractId, userId, firmId) {
        try {
            const contract = await LegalContract.findOne({
                _id: contractId,
                firmId
            });

            if (!contract) {
                return {
                    success: false,
                    error: 'Contract not found'
                };
            }

            // Can only initiate signature from approved status
            if (contract.status !== 'approved' && contract.status !== 'draft') {
                return {
                    success: false,
                    error: `Cannot initiate signature from status: ${contract.status}`
                };
            }

            // Check if contract has parties
            if (!contract.parties || contract.parties.length === 0) {
                return {
                    success: false,
                    error: 'Contract must have at least one party'
                };
            }

            contract.status = 'pending_signature';
            contract.updatedBy = userId;

            await contract.save();

            return {
                success: true,
                data: contract,
                message: 'Signature process initiated'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Record party signature
     * @param {String} contractId - Contract ID
     * @param {Number} partyIndex - Index of signing party
     * @param {Object} signatureData - Signature information
     * @param {String} userId - User recording the signature
     * @param {String} firmId - Firm ID for authorization
     * @returns {Promise<Object>} Updated contract
     */
    static async recordSignature(contractId, partyIndex, signatureData, userId, firmId) {
        try {
            const contract = await LegalContract.findOne({
                _id: contractId,
                firmId
            });

            if (!contract) {
                return {
                    success: false,
                    error: 'Contract not found'
                };
            }

            if (!contract.parties[partyIndex]) {
                return {
                    success: false,
                    error: 'Party not found at specified index'
                };
            }

            const party = contract.parties[partyIndex];

            // Update signature information
            party.signatureStatus = 'signed';
            party.signedDate = signatureData.signedDate || new Date();
            party.signatureMethod = signatureData.signatureMethod || 'electronic';
            party.signatureReference = signatureData.signatureReference;

            contract.updatedBy = userId;

            // Check if all parties have signed
            const allSigned = contract.isFullySigned();

            if (allSigned) {
                contract.status = 'fully_signed';
            } else {
                // Check if at least one signed
                const anySigned = contract.parties.some(p => p.signatureStatus === 'signed');
                if (anySigned) {
                    contract.status = 'partially_signed';
                }
            }

            await contract.save();

            return {
                success: true,
                data: contract,
                allSigned,
                message: allSigned ? 'All parties have signed' : 'Signature recorded'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Check signature status
     * @param {String} contractId - Contract ID
     * @param {String} firmId - Firm ID for authorization
     * @returns {Promise<Object>} Signature status
     */
    static async checkSignatureStatus(contractId, firmId) {
        try {
            const contract = await LegalContract.findOne({
                _id: contractId,
                firmId
            }).select('parties status');

            if (!contract) {
                return {
                    success: false,
                    error: 'Contract not found'
                };
            }

            const signatureStatus = contract.parties.map((party, index) => ({
                partyIndex: index,
                role: party.role,
                partyName: party.fullNameArabic || party.fullNameEnglish || party.companyName,
                signatureStatus: party.signatureStatus,
                signedDate: party.signedDate,
                signatureMethod: party.signatureMethod
            }));

            const totalParties = contract.parties.length;
            const signedCount = contract.parties.filter(p => p.signatureStatus === 'signed').length;
            const pendingCount = contract.parties.filter(p => p.signatureStatus === 'pending').length;
            const allSigned = contract.isFullySigned();

            return {
                success: true,
                data: {
                    contractStatus: contract.status,
                    totalParties,
                    signedCount,
                    pendingCount,
                    allSigned,
                    parties: signatureStatus
                }
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get signature status (alias for controller compatibility)
     * @param {String} contractId - Contract ID
     * @param {String} userId - User ID (not used, for API consistency)
     * @param {String} firmId - Firm ID for authorization
     * @returns {Promise<Object>} Signature status
     */
    static async getSignatureStatus(contractId, userId, firmId) {
        return this.checkSignatureStatus(contractId, firmId);
    }

    // ═══════════════════════════════════════════════════════════════
    // AMENDMENTS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Add contract amendment
     * @param {String} contractId - Contract ID
     * @param {Object} amendmentData - Amendment details
     * @param {String} userId - User adding amendment
     * @param {String} firmId - Firm ID for authorization
     * @returns {Promise<Object>} Updated contract
     */
    static async addAmendment(contractId, amendmentData, userId, firmId) {
        try {
            const contract = await LegalContract.findOne({
                _id: contractId,
                firmId
            });

            if (!contract) {
                return {
                    success: false,
                    error: 'Contract not found'
                };
            }

            // Only allow amendments on active or fully signed contracts
            if (!['active', 'fully_signed'].includes(contract.status)) {
                return {
                    success: false,
                    error: 'Contract must be active or fully signed to add amendments'
                };
            }

            const amendmentNumber = `AMD-${contract.amendments.length + 1}`;

            const amendment = {
                amendmentNumber,
                date: amendmentData.date || new Date(),
                description: amendmentData.description,
                changes: amendmentData.changes || [],
                effectiveDate: amendmentData.effectiveDate,
                signedByAll: amendmentData.signedByAll || false,
                documentUrl: amendmentData.documentUrl
            };

            contract.amendments.push(amendment);
            contract.version += 1;
            contract.updatedBy = userId;

            await contract.save();

            return {
                success: true,
                data: contract,
                amendment: contract.amendments[contract.amendments.length - 1],
                message: 'Amendment added successfully'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get all amendments for a contract
     * @param {String} contractId - Contract ID
     * @param {String} firmId - Firm ID for authorization
     * @returns {Promise<Object>} List of amendments
     */
    static async getAmendments(contractId, firmId) {
        try {
            const contract = await LegalContract.findOne({
                _id: contractId,
                firmId
            }).select('amendments contractNumber title');

            if (!contract) {
                return {
                    success: false,
                    error: 'Contract not found'
                };
            }

            return {
                success: true,
                data: {
                    contractNumber: contract.contractNumber,
                    contractTitle: contract.title,
                    amendments: contract.amendments,
                    totalAmendments: contract.amendments.length
                }
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // VERSION CONTROL
    // ═══════════════════════════════════════════════════════════════

    /**
     * Create version snapshot
     * @param {String} contractId - Contract ID
     * @param {String} note - Version note
     * @param {String} userId - User creating version
     * @param {String} firmId - Firm ID for authorization
     * @returns {Promise<Object>} Updated contract
     */
    static async createVersion(contractId, note, userId, firmId) {
        try {
            const contract = await LegalContract.findOne({
                _id: contractId,
                firmId
            });

            if (!contract) {
                return {
                    success: false,
                    error: 'Contract not found'
                };
            }

            const currentVersion = contract.version;
            await contract.createVersion(userId, note);

            return {
                success: true,
                data: contract,
                previousVersion: currentVersion,
                currentVersion: contract.version,
                message: 'Version created successfully'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get version history
     * @param {String} contractId - Contract ID
     * @param {String} firmId - Firm ID for authorization
     * @returns {Promise<Object>} Version history
     */
    static async getVersionHistory(contractId, firmId) {
        try {
            const contract = await LegalContract.findOne({
                _id: contractId,
                firmId
            })
                .select('version previousVersions contractNumber title')
                .populate('previousVersions.changedBy', 'name email');

            if (!contract) {
                return {
                    success: false,
                    error: 'Contract not found'
                };
            }

            return {
                success: true,
                data: {
                    contractNumber: contract.contractNumber,
                    contractTitle: contract.title,
                    currentVersion: contract.version,
                    versionHistory: contract.previousVersions.map(v => ({
                        version: v.version,
                        changedBy: v.changedBy,
                        changedAt: v.changedAt,
                        changeNote: v.changeNote
                    })),
                    totalVersions: contract.previousVersions.length + 1
                }
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Revert to previous version
     * @param {String} contractId - Contract ID
     * @param {Number} versionNumber - Version to revert to
     * @param {String} userId - User reverting
     * @param {String} firmId - Firm ID for authorization
     * @returns {Promise<Object>} Updated contract
     */
    static async revertToVersion(contractId, versionNumber, userId, firmId) {
        try {
            const contract = await LegalContract.findOne({
                _id: contractId,
                firmId
            });

            if (!contract) {
                return {
                    success: false,
                    error: 'Contract not found'
                };
            }

            // Find the version
            const targetVersion = contract.previousVersions.find(v => v.version === versionNumber);

            if (!targetVersion) {
                return {
                    success: false,
                    error: `Version ${versionNumber} not found`
                };
            }

            // Only allow revert for draft or under_review status
            if (!['draft', 'under_review'].includes(contract.status)) {
                return {
                    success: false,
                    error: 'Can only revert draft or under_review contracts'
                };
            }

            // Save current version before reverting
            await contract.createVersion(userId, `Before reverting to version ${versionNumber}`);

            // Restore content from target version
            contract.content = targetVersion.content;
            contract.updatedBy = userId;

            await contract.save();

            return {
                success: true,
                data: contract,
                message: `Reverted to version ${versionNumber}`,
                currentVersion: contract.version
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // NAJIZ INTEGRATION
    // ═══════════════════════════════════════════════════════════════

    /**
     * Record Najiz notarization
     * @param {String} contractId - Contract ID
     * @param {Object} notarizationData - Notarization details
     * @param {String} userId - User recording notarization
     * @param {String} firmId - Firm ID for authorization
     * @returns {Promise<Object>} Updated contract
     */
    static async recordNotarization(contractId, notarizationData, userId, firmId) {
        try {
            const contract = await LegalContract.findOne({
                _id: contractId,
                firmId
            });

            if (!contract) {
                return {
                    success: false,
                    error: 'Contract not found'
                };
            }

            // Update Najiz integration fields
            if (!contract.najizIntegration) {
                contract.najizIntegration = {};
            }

            contract.najizIntegration.isNotarized = true;
            contract.najizIntegration.notarizationType = notarizationData.notarizationType || 'notary_public';
            contract.najizIntegration.notaryNumber = notarizationData.notaryNumber;
            contract.najizIntegration.notarizationNumber = notarizationData.notarizationNumber;
            contract.najizIntegration.notarizationDate = notarizationData.notarizationDate || new Date();
            contract.najizIntegration.notarizationDateHijri = notarizationData.notarizationDateHijri;
            contract.najizIntegration.notaryCity = notarizationData.notaryCity;
            contract.najizIntegration.notaryBranch = notarizationData.notaryBranch;
            contract.najizIntegration.electronicDeedNumber = notarizationData.electronicDeedNumber;
            contract.najizIntegration.verificationCode = notarizationData.verificationCode;
            contract.najizIntegration.syncStatus = 'synced';
            contract.najizIntegration.lastSyncedAt = new Date();

            // Notarized contracts are enforceable
            if (!contract.enforcement) {
                contract.enforcement = {};
            }
            contract.enforcement.isEnforceable = true;

            contract.updatedBy = userId;

            await contract.save();

            return {
                success: true,
                data: contract,
                message: 'Notarization recorded successfully'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Verify notarization with Najiz (stub for future API integration)
     * @param {String} contractId - Contract ID
     * @param {String} firmId - Firm ID for authorization
     * @returns {Promise<Object>} Verification result
     */
    static async verifyNotarization(contractId, firmId) {
        try {
            const contract = await LegalContract.findOne({
                _id: contractId,
                firmId
            })
                .select('najizIntegration contractNumber title');

            if (!contract) {
                return {
                    success: false,
                    error: 'Contract not found'
                };
            }

            if (!contract.najizIntegration?.isNotarized) {
                return {
                    success: false,
                    error: 'Contract is not notarized'
                };
            }

            // TODO: Implement actual Najiz API verification
            // For now, return stub data
            return {
                success: true,
                verified: true,
                data: {
                    contractNumber: contract.contractNumber,
                    notarizationNumber: contract.najizIntegration.notarizationNumber,
                    electronicDeedNumber: contract.najizIntegration.electronicDeedNumber,
                    verificationCode: contract.najizIntegration.verificationCode,
                    notarizationDate: contract.najizIntegration.notarizationDate,
                    status: 'valid'
                },
                message: 'Verification with Najiz API - Feature pending implementation'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Generate QR verification code
     * @param {String} contractId - Contract ID
     * @param {String} firmId - Firm ID for authorization
     * @returns {Promise<Object>} QR code data
     */
    static async generateVerificationCode(contractId, firmId) {
        try {
            const contract = await LegalContract.findOne({
                _id: contractId,
                firmId
            });

            if (!contract) {
                return {
                    success: false,
                    error: 'Contract not found'
                };
            }

            // Generate verification code if not exists
            if (!contract.najizIntegration?.verificationCode) {
                const verificationCode = `NAJIZ-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

                if (!contract.najizIntegration) {
                    contract.najizIntegration = {};
                }
                contract.najizIntegration.verificationCode = verificationCode;

                await contract.save();
            }

            // Generate QR code data (URL or JSON)
            const qrData = {
                contractNumber: contract.contractNumber,
                verificationCode: contract.najizIntegration.verificationCode,
                notarizationNumber: contract.najizIntegration.notarizationNumber,
                electronicDeedNumber: contract.najizIntegration.electronicDeedNumber,
                verifyUrl: `https://najiz.sa/verify/${contract.najizIntegration.verificationCode}`
            };

            return {
                success: true,
                data: qrData,
                verificationCode: contract.najizIntegration.verificationCode
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // ENFORCEMENT
    // ═══════════════════════════════════════════════════════════════

    /**
     * Record contract breach
     * @param {String} contractId - Contract ID
     * @param {Object} breachData - Breach details
     * @param {String} userId - User recording breach
     * @param {String} firmId - Firm ID for authorization
     * @returns {Promise<Object>} Updated contract
     */
    static async recordBreach(contractId, breachData, userId, firmId) {
        try {
            const contract = await LegalContract.findOne({
                _id: contractId,
                firmId
            });

            if (!contract) {
                return {
                    success: false,
                    error: 'Contract not found'
                };
            }

            if (!contract.enforcement) {
                contract.enforcement = {};
            }

            contract.enforcement.breachDetails = {
                hasBreach: true,
                breachDate: breachData.breachDate || new Date(),
                breachingParty: breachData.breachingParty,
                breachDescription: breachData.breachDescription,
                breachType: breachData.breachType,
                noticeServed: breachData.noticeServed || false,
                noticeDate: breachData.noticeDate,
                cureDeadline: breachData.cureDeadline
            };

            contract.status = 'in_dispute';
            contract.updatedBy = userId;

            await contract.save();

            return {
                success: true,
                data: contract,
                message: 'Breach recorded successfully'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Initiate enforcement
     * @param {String} contractId - Contract ID
     * @param {Object} enforcementData - Enforcement details
     * @param {String} userId - User initiating enforcement
     * @param {String} firmId - Firm ID for authorization
     * @returns {Promise<Object>} Updated contract
     */
    static async initiateEnforcement(contractId, enforcementData, userId, firmId) {
        try {
            const contract = await LegalContract.findOne({
                _id: contractId,
                firmId
            });

            if (!contract) {
                return {
                    success: false,
                    error: 'Contract not found'
                };
            }

            if (!contract.enforcement?.isEnforceable) {
                return {
                    success: false,
                    error: 'Contract is not enforceable. Must be notarized.'
                };
            }

            if (!contract.enforcement.enforcementRequest) {
                contract.enforcement.enforcementRequest = {};
            }

            contract.enforcement.enforcementRequest = {
                hasRequest: true,
                requestNumber: enforcementData.requestNumber,
                requestDate: enforcementData.requestDate || new Date(),
                court: enforcementData.court,
                status: 'pending',
                amount: enforcementData.amount
            };

            contract.status = 'in_enforcement';
            contract.updatedBy = userId;

            await contract.save();

            return {
                success: true,
                data: contract,
                message: 'Enforcement initiated successfully'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Update enforcement status
     * @param {String} contractId - Contract ID
     * @param {String} status - New enforcement status
     * @param {String} details - Status update details
     * @param {String} userId - User updating status
     * @param {String} firmId - Firm ID for authorization
     * @returns {Promise<Object>} Updated contract
     */
    static async updateEnforcementStatus(contractId, status, details, userId, firmId) {
        try {
            const contract = await LegalContract.findOne({
                _id: contractId,
                firmId
            });

            if (!contract) {
                return {
                    success: false,
                    error: 'Contract not found'
                };
            }

            if (!contract.enforcement?.enforcementRequest?.hasRequest) {
                return {
                    success: false,
                    error: 'No enforcement request found'
                };
            }

            const validStatuses = ['pending', 'accepted', 'in_progress', 'completed', 'rejected'];
            if (!validStatuses.includes(status)) {
                return {
                    success: false,
                    error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
                };
            }

            contract.enforcement.enforcementRequest.status = status;
            contract.updatedBy = userId;

            // Update contract status based on enforcement status
            if (status === 'completed') {
                contract.status = 'completed';
            } else if (status === 'rejected') {
                contract.status = 'active';
            }

            await contract.save();

            return {
                success: true,
                data: contract,
                message: `Enforcement status updated to: ${status}`
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Link contract to case
     * @param {String} contractId - Contract ID
     * @param {String} caseId - Case ID
     * @param {String} userId - User linking
     * @param {String} firmId - Firm ID for authorization
     * @returns {Promise<Object>} Updated contract
     */
    static async linkToCase(contractId, caseId, userId, firmId) {
        try {
            const [contract, caseRecord] = await Promise.all([
                LegalContract.findOne({
                    _id: contractId,
                    firmId
                }),
                Case.findOne({
                    _id: caseId,
                    firmId
                })
            ]);

            if (!contract) {
                return {
                    success: false,
                    error: 'Contract not found'
                };
            }

            if (!caseRecord) {
                return {
                    success: false,
                    error: 'Case not found'
                };
            }

            if (!contract.linkedRecords) {
                contract.linkedRecords = {};
            }

            contract.linkedRecords.caseId = caseId;
            contract.updatedBy = userId;

            await contract.save();

            return {
                success: true,
                data: await contract.populate('linkedRecords.caseId', 'caseNumber title status'),
                message: 'Contract linked to case successfully'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // REMINDERS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Set contract reminder
     * @param {String} contractId - Contract ID
     * @param {Object} reminderData - Reminder details
     * @param {String} userId - User setting reminder
     * @param {String} firmId - Firm ID for authorization
     * @returns {Promise<Object>} Updated contract
     */
    static async setReminder(contractId, reminderData, userId, firmId) {
        try {
            const contract = await LegalContract.findOne({
                _id: contractId,
                firmId
            });

            if (!contract) {
                return {
                    success: false,
                    error: 'Contract not found'
                };
            }

            const reminder = {
                type: reminderData.type || 'custom',
                date: reminderData.date,
                daysBefore: reminderData.daysBefore,
                message: reminderData.message,
                recipients: reminderData.recipients || [userId],
                sent: false
            };

            contract.reminders.push(reminder);
            contract.updatedBy = userId;

            await contract.save();

            return {
                success: true,
                data: contract,
                reminder: contract.reminders[contract.reminders.length - 1],
                message: 'Reminder set successfully'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get upcoming reminders
     * @param {String} firmId - Firm ID
     * @param {Number} days - Number of days to look ahead
     * @returns {Promise<Object>} Upcoming reminders
     */
    static async getUpcomingReminders(firmId, days = 30) {
        try {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + days);

            const contracts = await LegalContract.find({
                firmId,
                'reminders.sent': false,
                'reminders.date': { $lte: futureDate, $gte: new Date() }
            })
                .populate('lawyerId', 'name email')
                .populate('linkedRecords.clientId', 'clientNumber fullNameArabic companyName')
                .select('contractNumber title reminders status')
                .lean();

            const reminders = [];

            contracts.forEach(contract => {
                contract.reminders.forEach(reminder => {
                    if (!reminder.sent && reminder.date <= futureDate && reminder.date >= new Date()) {
                        reminders.push({
                            contractId: contract._id,
                            contractNumber: contract.contractNumber,
                            contractTitle: contract.title,
                            reminder
                        });
                    }
                });
            });

            // Sort by date
            reminders.sort((a, b) => new Date(a.reminder.date) - new Date(b.reminder.date));

            return {
                success: true,
                data: reminders,
                count: reminders.length
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get reminders for a contract
     * @param {String} contractId - Contract ID
     * @param {String} userId - User ID (not used, for API consistency)
     * @param {String} firmId - Firm ID for authorization
     * @returns {Promise<Object>} Contract reminders
     */
    static async getReminders(contractId, userId, firmId) {
        try {
            const contract = await LegalContract.findOne({
                _id: contractId,
                firmId
            }).select('reminders contractNumber title');

            if (!contract) {
                return {
                    success: false,
                    error: 'Contract not found'
                };
            }

            return {
                success: true,
                data: contract.reminders
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Mark reminder as sent
     * @param {String} contractId - Contract ID
     * @param {String} reminderId - Reminder ID
     * @param {String} firmId - Firm ID for authorization
     * @returns {Promise<Object>} Updated contract
     */
    static async markReminderSent(contractId, reminderId, firmId) {
        try {
            const contract = await LegalContract.findOne({
                _id: contractId,
                firmId
            });

            if (!contract) {
                return {
                    success: false,
                    error: 'Contract not found'
                };
            }

            const reminder = contract.reminders.id(reminderId);

            if (!reminder) {
                return {
                    success: false,
                    error: 'Reminder not found'
                };
            }

            reminder.sent = true;
            reminder.sentAt = new Date();

            await contract.save();

            return {
                success: true,
                message: 'Reminder marked as sent'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // REPORTING
    // ═══════════════════════════════════════════════════════════════

    /**
     * Get expiring contracts
     * @param {String} firmId - Firm ID
     * @param {Number} days - Days until expiry
     * @returns {Promise<Object>} Expiring contracts
     */
    static async getExpiringContracts(firmId, days = 30) {
        try {
            const contracts = await LegalContract.getExpiringContracts(firmId, days);

            const populated = await LegalContract.populate(contracts, [
                { path: 'lawyerId', select: 'name email' },
                { path: 'linkedRecords.clientId', select: 'clientNumber fullNameArabic companyName phone' }
            ]);

            return {
                success: true,
                data: populated,
                count: populated.length,
                daysRange: days
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get contracts by status
     * @param {String} firmId - Firm ID
     * @param {String} status - Contract status
     * @returns {Promise<Object>} Contracts
     */
    static async getByStatus(firmId, status) {
        try {
            const contracts = await LegalContract.find({
                firmId,
                status
            })
                .populate('lawyerId', 'name email')
                .populate('linkedRecords.clientId', 'clientNumber fullNameArabic companyName')
                .sort({ createdAt: -1 })
                .lean();

            return {
                success: true,
                data: contracts,
                count: contracts.length,
                status
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get contracts by client
     * @param {String} clientId - Client ID
     * @param {String} firmId - Firm ID for authorization
     * @returns {Promise<Object>} Client's contracts
     */
    static async getByClient(clientId, firmId) {
        try {
            const contracts = await LegalContract.find({
                'linkedRecords.clientId': clientId,
                firmId
            });

            const populated = await LegalContract.populate(contracts, [
                { path: 'lawyerId', select: 'name email' },
                { path: 'linkedRecords.caseId', select: 'caseNumber title status' }
            ]);

            return {
                success: true,
                data: populated,
                count: populated.length
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get contracts by client (alias for controller compatibility)
     * @param {String} clientId - Client ID
     * @param {String} userId - User ID (not used, for API consistency)
     * @param {String} firmId - Firm ID for authorization
     * @returns {Promise<Object>} Client's contracts
     */
    static async getContractsByClient(clientId, userId, firmId) {
        return this.getByClient(clientId, firmId);
    }

    /**
     * Get contract statistics
     * @param {String} firmId - Firm ID
     * @returns {Promise<Object>} Statistics
     */
    static async getStatistics(firmId) {
        try {
            // Get statistics by status
            const statusStats = await LegalContract.getStatistics(firmId);

            // Get statistics by type
            const typeStats = await LegalContract.aggregate([
                { $match: { firmId: new mongoose.Types.ObjectId(firmId) } },
                {
                    $group: {
                        _id: '$contractType',
                        count: { $sum: 1 },
                        totalValue: { $sum: '$financialTerms.totalValue' }
                    }
                },
                { $limit: 1000 }
            ]);

            // Get overall counts
            const [
                totalContracts,
                activeContracts,
                draftContracts,
                expiredContracts,
                notarizedContracts
            ] = await Promise.all([
                LegalContract.countDocuments({ firmId }),
                LegalContract.countDocuments({ firmId, status: 'active' }),
                LegalContract.countDocuments({ firmId, status: 'draft' }),
                LegalContract.countDocuments({ firmId, status: 'expired' }),
                LegalContract.countDocuments({ firmId, 'najizIntegration.isNotarized': true })
            ]);

            // Calculate total value
            const valueResult = await LegalContract.aggregate([
                { $match: { firmId: new mongoose.Types.ObjectId(firmId) } },
                {
                    $group: {
                        _id: null,
                        totalValue: { $sum: '$financialTerms.totalValue' }
                    }
                }
            ]);

            const totalValue = valueResult[0]?.totalValue || 0;

            return {
                success: true,
                data: {
                    overview: {
                        totalContracts,
                        activeContracts,
                        draftContracts,
                        expiredContracts,
                        notarizedContracts,
                        totalValue
                    },
                    byStatus: statusStats,
                    byType: typeStats
                }
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // EXPORT (Stubs for future implementation)
    // ═══════════════════════════════════════════════════════════════

    /**
     * Export contract to PDF (stub)
     * @param {String} contractId - Contract ID
     * @param {String} firmId - Firm ID for authorization
     * @returns {Promise<Object>} PDF export result
     */
    static async exportToPdf(contractId, firmId) {
        try {
            const contract = await LegalContract.findOne({
                _id: contractId,
                firmId
            });

            if (!contract) {
                return {
                    success: false,
                    error: 'Contract not found'
                };
            }

            // TODO: Implement PDF generation
            return {
                success: true,
                message: 'PDF export - Feature pending implementation',
                data: {
                    contractNumber: contract.contractNumber,
                    title: contract.title,
                    format: 'pdf'
                }
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Export contract to Word document (stub)
     * @param {String} contractId - Contract ID
     * @param {String} firmId - Firm ID for authorization
     * @returns {Promise<Object>} Word export result
     */
    static async exportToWord(contractId, firmId) {
        try {
            const contract = await LegalContract.findOne({
                _id: contractId,
                firmId
            });

            if (!contract) {
                return {
                    success: false,
                    error: 'Contract not found'
                };
            }

            // TODO: Implement Word document generation
            return {
                success: true,
                message: 'Word export - Feature pending implementation',
                data: {
                    contractNumber: contract.contractNumber,
                    title: contract.title,
                    format: 'docx'
                }
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // HELPER METHODS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Validate party information
     * @param {Object} partyData - Party data to validate
     * @returns {Object} Validation result
     */
    static _validateParty(partyData) {
        if (!partyData.partyType) {
            return { valid: false, error: 'Party type is required' };
        }

        if (!['individual', 'company', 'government'].includes(partyData.partyType)) {
            return { valid: false, error: 'Invalid party type' };
        }

        if (partyData.partyType === 'individual') {
            if (!partyData.fullNameArabic && !partyData.fullNameEnglish && !partyData.firstName) {
                return { valid: false, error: 'Party name is required' };
            }
        }

        if (partyData.partyType === 'company') {
            if (!partyData.companyName) {
                return { valid: false, error: 'Company name is required' };
            }
        }

        return { valid: true };
    }

    /**
     * Calculate next payment due
     * @param {Object} contract - Contract document
     * @returns {Object|null} Next payment or null
     */
    static _calculateNextPayment(contract) {
        if (!contract.financialTerms?.paymentSchedule || contract.financialTerms.paymentSchedule.length === 0) {
            return null;
        }

        const today = new Date();
        const unpaidPayments = contract.financialTerms.paymentSchedule
            .filter(payment => !payment.paid && new Date(payment.dueDate) >= today)
            .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

        return unpaidPayments.length > 0 ? unpaidPayments[0] : null;
    }

    /**
     * Generate unique contract number
     * @param {String} firmId - Firm ID
     * @returns {Promise<String>} Contract number
     */
    static async _generateContractNumber(firmId) {
        try {
            const year = new Date().getFullYear();

            // Count contracts for this firm in current year
            const count = await LegalContract.countDocuments({
                firmId,
                createdAt: {
                    $gte: new Date(`${year}-01-01`),
                    $lt: new Date(`${year + 1}-01-01`)
                }
            });

            const sequenceNumber = String(count + 1).padStart(6, '0');
            return `CTR-${year}-${sequenceNumber}`;
        } catch (error) {
            // Fallback to timestamp-based number
            return `CTR-${Date.now()}`;
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // CONTROLLER COMPATIBILITY ALIASES
    // ═══════════════════════════════════════════════════════════════

    /**
     * Create contract (alias for controller compatibility)
     */
    static async createContract(data, userId, firmId) {
        return this.create(data, userId, firmId);
    }

    /**
     * Get contract by ID (alias for controller compatibility)
     */
    static async getContractById(contractId, userId, firmId) {
        return this.getById(contractId, firmId);
    }

    /**
     * Update contract (alias for controller compatibility)
     */
    static async updateContract(contractId, updates, userId, firmId) {
        return this.update(contractId, updates, userId, firmId);
    }

    /**
     * Delete contract (alias for controller compatibility)
     */
    static async deleteContract(contractId, userId, firmId) {
        return this.delete(contractId, userId, firmId);
    }

    /**
     * List contracts (alias for controller compatibility)
     */
    static async listContracts(filters, options, userId, firmId) {
        return this.list(firmId, { ...filters, ...options });
    }

    /**
     * Search contracts (alias for controller compatibility)
     */
    static async searchContracts(query, limit, userId, firmId) {
        return this.search(firmId, query);
    }

    /**
     * Get contract statistics (alias for controller compatibility)
     */
    static async getContractStatistics(userId, firmId) {
        return this.getStatistics(firmId);
    }
}

module.exports = LegalContractService;
