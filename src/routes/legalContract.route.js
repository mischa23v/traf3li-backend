/**
 * Legal Contract Routes
 *
 * Handles all contract management endpoints including:
 * - CRUD operations
 * - Party management
 * - Signature workflow
 * - Amendments and versioning
 * - Najiz integration (notarization, verification)
 * - Enforcement tracking
 * - Reminders and alerts
 * - Export functionality
 * - Templates
 *
 * Base path: /api/contracts
 */

const express = require('express');
const { userMiddleware, firmFilter } = require('../middlewares');
const { apiRateLimiter } = require('../middlewares/rateLimiter.middleware');
const {
    // CRUD
    createContract,
    getContract,
    updateContract,
    deleteContract,
    listContracts,
    searchContracts,
    // Parties
    addParty,
    updateParty,
    removeParty,
    // Signatures
    initiateSignature,
    recordSignature,
    getSignatureStatus,
    // Amendments
    addAmendment,
    getAmendments,
    // Versions
    createVersion,
    getVersionHistory,
    revertToVersion,
    // Najiz Integration
    recordNotarization,
    verifyNotarization,
    // Enforcement
    recordBreach,
    initiateEnforcement,
    updateEnforcementStatus,
    linkToCase,
    // Reminders
    setReminder,
    getReminders,
    // Reporting
    getExpiringContracts,
    getContractsByClient,
    getContractStatistics,
    // Export
    exportToPdf,
    exportToWord,
    // Templates
    saveAsTemplate,
    getTemplates,
    createFromTemplate
} = require('../controllers/legalContract.controller');

const router = express.Router();

// Apply rate limiting
router.use(apiRateLimiter);

// ============================================
// REPORTING & SEARCH (before :contractId routes)
// ============================================

/**
 * @route   GET /api/contracts/search
 * @desc    Search contracts by text query
 * @access  Private (requires authentication + firm filter)
 * @query   {string} q - Search query string
 * @query   {number} [page=1] - Page number for pagination
 * @query   {number} [limit=20] - Number of results per page
 * @returns {Array<Contract>} Filtered list of contracts matching search criteria
 */
router.get('/search', userMiddleware, firmFilter, searchContracts);

/**
 * @route   GET /api/contracts/expiring
 * @desc    Get contracts expiring within specified number of days
 * @access  Private (requires authentication + firm filter)
 * @query   {number} [days=30] - Number of days to look ahead
 * @query   {number} [page=1] - Page number for pagination
 * @query   {number} [limit=20] - Number of results per page
 * @returns {Array<Contract>} List of contracts expiring soon
 */
router.get('/expiring', userMiddleware, firmFilter, getExpiringContracts);

/**
 * @route   GET /api/contracts/statistics
 * @desc    Get contract statistics and analytics for the firm
 * @access  Private (requires authentication + firm filter)
 * @returns {Object} Statistics including total contracts, by status, by type, expiring soon, etc.
 */
router.get('/statistics', userMiddleware, firmFilter, getContractStatistics);

/**
 * @route   GET /api/contracts/client/:clientId
 * @desc    Get all contracts associated with a specific client
 * @access  Private (requires authentication + firm filter)
 * @param   {string} clientId - Client ID
 * @query   {number} [page=1] - Page number for pagination
 * @query   {number} [limit=20] - Number of results per page
 * @returns {Array<Contract>} List of contracts for the specified client
 */
router.get('/client/:clientId', userMiddleware, firmFilter, getContractsByClient);

// ============================================
// TEMPLATE ROUTES
// ============================================

/**
 * @route   GET /api/contracts/templates
 * @desc    Get all contract templates available for the firm
 * @access  Private (requires authentication + firm filter)
 * @query   {string} [category] - Filter by template category
 * @query   {string} [contractType] - Filter by contract type
 * @returns {Array<Template>} List of contract templates
 */
router.get('/templates', userMiddleware, firmFilter, getTemplates);

/**
 * @route   POST /api/contracts/templates/:templateId/use
 * @desc    Create a new contract from an existing template
 * @access  Private (requires authentication + firm filter)
 * @param   {string} templateId - Template ID to use
 * @body    {Object} data - Contract-specific data to populate template
 * @returns {Contract} Newly created contract from template
 */
router.post('/templates/:templateId/use', userMiddleware, firmFilter, createFromTemplate);

// ============================================
// MAIN CRUD ROUTES
// ============================================

/**
 * @route   GET /api/contracts
 * @desc    List contracts with optional filters and pagination
 * @access  Private (requires authentication + firm filter)
 * @query   {number} [page=1] - Page number
 * @query   {number} [limit=20] - Results per page
 * @query   {string} [status] - Filter by status (draft, active, expired, terminated, etc.)
 * @query   {string} [contractType] - Filter by contract type
 * @query   {string} [clientId] - Filter by client ID
 * @query   {string} [startDate] - Filter by start date (ISO format)
 * @query   {string} [endDate] - Filter by end date (ISO format)
 * @query   {string} [sort] - Sort field (e.g., createdAt, startDate)
 * @query   {string} [order] - Sort order (asc, desc)
 * @returns {Object} Paginated list of contracts with metadata
 */
router.get('/', userMiddleware, firmFilter, listContracts);

/**
 * @route   POST /api/contracts
 * @desc    Create a new contract
 * @access  Private (requires authentication + firm filter)
 * @body    {Object} contract - Contract data
 * @body    {string} contract.title - Contract title
 * @body    {string} contract.contractType - Type of contract
 * @body    {string} contract.description - Contract description
 * @body    {Array<Object>} contract.parties - Array of contract parties
 * @body    {Date} contract.startDate - Contract start date
 * @body    {Date} [contract.endDate] - Contract end date
 * @body    {Object} [contract.financialTerms] - Financial terms and conditions
 * @body    {Array<Object>} [contract.clauses] - Contract clauses
 * @returns {Contract} Newly created contract
 */
router.post('/', userMiddleware, firmFilter, createContract);

/**
 * @route   GET /api/contracts/:contractId
 * @desc    Get a single contract by ID with full details
 * @access  Private (requires authentication + firm filter)
 * @param   {string} contractId - Contract ID
 * @returns {Contract} Contract details including parties, signatures, amendments, etc.
 */
router.get('/:contractId', userMiddleware, firmFilter, getContract);

/**
 * @route   PATCH /api/contracts/:contractId
 * @desc    Update contract details
 * @access  Private (requires authentication + firm filter)
 * @param   {string} contractId - Contract ID
 * @body    {Object} updates - Fields to update
 * @returns {Contract} Updated contract
 */
router.patch('/:contractId', userMiddleware, firmFilter, updateContract);

/**
 * @route   DELETE /api/contracts/:contractId
 * @desc    Archive (soft delete) a contract
 * @access  Private (requires authentication + firm filter)
 * @param   {string} contractId - Contract ID
 * @returns {Object} Success message
 */
router.delete('/:contractId', userMiddleware, firmFilter, deleteContract);

// ============================================
// PARTY ROUTES
// ============================================

/**
 * @route   POST /api/contracts/:contractId/parties
 * @desc    Add a new party to the contract
 * @access  Private (requires authentication + firm filter)
 * @param   {string} contractId - Contract ID
 * @body    {Object} party - Party details
 * @body    {string} party.partyType - Type of party (individual, organization, client, etc.)
 * @body    {string} party.name - Party name
 * @body    {string} [party.email] - Party email
 * @body    {string} [party.phone] - Party phone
 * @body    {string} party.role - Role in contract (buyer, seller, lessor, lessee, etc.)
 * @body    {Object} [party.address] - Party address
 * @returns {Contract} Updated contract with new party
 */
router.post('/:contractId/parties', userMiddleware, firmFilter, addParty);

/**
 * @route   PATCH /api/contracts/:contractId/parties/:partyIndex
 * @desc    Update party information
 * @access  Private (requires authentication + firm filter)
 * @param   {string} contractId - Contract ID
 * @param   {number} partyIndex - Index of party in parties array
 * @body    {Object} updates - Party fields to update
 * @returns {Contract} Updated contract
 */
router.patch('/:contractId/parties/:partyIndex', userMiddleware, firmFilter, updateParty);

/**
 * @route   DELETE /api/contracts/:contractId/parties/:partyIndex
 * @desc    Remove a party from the contract
 * @access  Private (requires authentication + firm filter)
 * @param   {string} contractId - Contract ID
 * @param   {number} partyIndex - Index of party in parties array
 * @returns {Contract} Updated contract without removed party
 */
router.delete('/:contractId/parties/:partyIndex', userMiddleware, firmFilter, removeParty);

// ============================================
// SIGNATURE ROUTES
// ============================================

/**
 * @route   POST /api/contracts/:contractId/signatures/initiate
 * @desc    Initiate the signature workflow for the contract
 * @access  Private (requires authentication + firm filter)
 * @param   {string} contractId - Contract ID
 * @body    {Array<number>} [partyIndexes] - Specific parties to request signatures from
 * @body    {Date} [deadline] - Signature deadline
 * @body    {string} [method] - Signature method (digital, wet, najiz, etc.)
 * @returns {Object} Signature workflow details
 */
router.post('/:contractId/signatures/initiate', userMiddleware, firmFilter, initiateSignature);

/**
 * @route   POST /api/contracts/:contractId/signatures/:partyIndex
 * @desc    Record a party's signature on the contract
 * @access  Private (requires authentication + firm filter)
 * @param   {string} contractId - Contract ID
 * @param   {number} partyIndex - Index of party in parties array
 * @body    {string} signatureMethod - Method used (digital, wet, najiz)
 * @body    {string} [signatureData] - Base64 signature image or digital signature
 * @body    {Date} signedAt - Timestamp of signature
 * @body    {string} [ipAddress] - IP address of signer
 * @body    {Object} [metadata] - Additional signature metadata
 * @returns {Contract} Updated contract with signature recorded
 */
router.post('/:contractId/signatures/:partyIndex', userMiddleware, firmFilter, recordSignature);

/**
 * @route   GET /api/contracts/:contractId/signatures
 * @desc    Get signature status for all parties
 * @access  Private (requires authentication + firm filter)
 * @param   {string} contractId - Contract ID
 * @returns {Object} Signature status including signed/pending parties, completion percentage
 */
router.get('/:contractId/signatures', userMiddleware, firmFilter, getSignatureStatus);

// ============================================
// AMENDMENT ROUTES
// ============================================

/**
 * @route   POST /api/contracts/:contractId/amendments
 * @desc    Add an amendment to the contract
 * @access  Private (requires authentication + firm filter)
 * @param   {string} contractId - Contract ID
 * @body    {string} amendmentType - Type of amendment (addendum, modification, cancellation, etc.)
 * @body    {string} description - Description of the amendment
 * @body    {Date} effectiveDate - When amendment takes effect
 * @body    {Object} changes - Specific changes being made
 * @body    {string} [reason] - Reason for amendment
 * @body    {Array<string>} [attachments] - Amendment document attachments
 * @returns {Contract} Updated contract with new amendment
 */
router.post('/:contractId/amendments', userMiddleware, firmFilter, addAmendment);

/**
 * @route   GET /api/contracts/:contractId/amendments
 * @desc    Get all amendments for the contract
 * @access  Private (requires authentication + firm filter)
 * @param   {string} contractId - Contract ID
 * @returns {Array<Amendment>} List of all amendments in chronological order
 */
router.get('/:contractId/amendments', userMiddleware, firmFilter, getAmendments);

// ============================================
// VERSION ROUTES
// ============================================

/**
 * @route   POST /api/contracts/:contractId/versions
 * @desc    Create a version snapshot of the current contract state
 * @access  Private (requires authentication + firm filter)
 * @param   {string} contractId - Contract ID
 * @body    {string} [versionNote] - Note describing this version
 * @returns {Object} Version details including version number
 */
router.post('/:contractId/versions', userMiddleware, firmFilter, createVersion);

/**
 * @route   GET /api/contracts/:contractId/versions
 * @desc    Get complete version history for the contract
 * @access  Private (requires authentication + firm filter)
 * @param   {string} contractId - Contract ID
 * @returns {Array<Version>} List of all versions with timestamps and changes
 */
router.get('/:contractId/versions', userMiddleware, firmFilter, getVersionHistory);

/**
 * @route   POST /api/contracts/:contractId/versions/:versionNumber/revert
 * @desc    Revert contract to a previous version
 * @access  Private (requires authentication + firm filter)
 * @param   {string} contractId - Contract ID
 * @param   {number} versionNumber - Version number to revert to
 * @body    {string} [reason] - Reason for reversion
 * @returns {Contract} Contract reverted to specified version
 */
router.post('/:contractId/versions/:versionNumber/revert', userMiddleware, firmFilter, revertToVersion);

// ============================================
// NAJIZ INTEGRATION ROUTES
// ============================================

/**
 * @route   POST /api/contracts/:contractId/notarization
 * @desc    Record Najiz notarization details for the contract
 * @access  Private (requires authentication + firm filter)
 * @param   {string} contractId - Contract ID
 * @body    {string} najizReferenceNumber - Najiz reference/transaction number
 * @body    {Date} notarizationDate - Date of notarization
 * @body    {string} notaryName - Name of notary
 * @body    {string} [notaryLicenseNumber] - Notary license number
 * @body    {string} [certificateUrl] - URL to notarization certificate
 * @body    {Object} [metadata] - Additional Najiz metadata
 * @returns {Contract} Updated contract with notarization details
 */
router.post('/:contractId/notarization', userMiddleware, firmFilter, recordNotarization);

/**
 * @route   GET /api/contracts/:contractId/notarization/verify
 * @desc    Verify notarization status with Najiz system
 * @access  Private (requires authentication + firm filter)
 * @param   {string} contractId - Contract ID
 * @returns {Object} Verification status from Najiz including validity, expiry, etc.
 */
router.get('/:contractId/notarization/verify', userMiddleware, firmFilter, verifyNotarization);

// ============================================
// ENFORCEMENT ROUTES
// ============================================

/**
 * @route   POST /api/contracts/:contractId/breach
 * @desc    Record a contract breach incident
 * @access  Private (requires authentication + firm filter)
 * @param   {string} contractId - Contract ID
 * @body    {string} breachType - Type of breach (material, minor, anticipatory, etc.)
 * @body    {string} description - Description of the breach
 * @body    {Date} breachDate - Date breach occurred or was discovered
 * @body    {number} [partyIndex] - Index of breaching party
 * @body    {Array<string>} [affectedClauses] - Contract clauses that were breached
 * @body    {string} [severity] - Severity level (low, medium, high, critical)
 * @body    {Array<string>} [evidence] - Evidence documents/attachments
 * @returns {Contract} Updated contract with breach record
 */
router.post('/:contractId/breach', userMiddleware, firmFilter, recordBreach);

/**
 * @route   POST /api/contracts/:contractId/enforcement
 * @desc    Initiate enforcement action for contract breach
 * @access  Private (requires authentication + firm filter)
 * @param   {string} contractId - Contract ID
 * @body    {string} enforcementType - Type of enforcement (demand_letter, arbitration, litigation, etc.)
 * @body    {string} description - Description of enforcement action
 * @body    {Date} initiatedDate - Date enforcement initiated
 * @body    {string} [assignedLawyer] - Lawyer handling enforcement
 * @body    {Object} [details] - Additional enforcement details
 * @returns {Contract} Updated contract with enforcement record
 */
router.post('/:contractId/enforcement', userMiddleware, firmFilter, initiateEnforcement);

/**
 * @route   PATCH /api/contracts/:contractId/enforcement
 * @desc    Update enforcement status and details
 * @access  Private (requires authentication + firm filter)
 * @param   {string} contractId - Contract ID
 * @body    {string} [status] - New enforcement status
 * @body    {Date} [resolvedDate] - Date enforcement resolved
 * @body    {string} [outcome] - Enforcement outcome
 * @body    {Object} [updates] - Other fields to update
 * @returns {Contract} Updated contract with new enforcement status
 */
router.patch('/:contractId/enforcement', userMiddleware, firmFilter, updateEnforcementStatus);

/**
 * @route   POST /api/contracts/:contractId/link-case
 * @desc    Link contract to a related case in the system
 * @access  Private (requires authentication + firm filter)
 * @param   {string} contractId - Contract ID
 * @body    {string} caseId - Case ID to link
 * @body    {string} [relationship] - Nature of relationship (enforcement, dispute, reference, etc.)
 * @returns {Contract} Updated contract with case link
 */
router.post('/:contractId/link-case', userMiddleware, firmFilter, linkToCase);

// ============================================
// REMINDER ROUTES
// ============================================

/**
 * @route   POST /api/contracts/:contractId/reminders
 * @desc    Set a reminder for contract-related action
 * @access  Private (requires authentication + firm filter)
 * @param   {string} contractId - Contract ID
 * @body    {string} reminderType - Type of reminder (expiry, renewal, payment, milestone, etc.)
 * @body    {Date} reminderDate - When to trigger reminder
 * @body    {string} description - Reminder description
 * @body    {Array<string>} [recipients] - User IDs to notify
 * @body    {string} [priority] - Priority level
 * @returns {Object} Created reminder details
 */
router.post('/:contractId/reminders', userMiddleware, firmFilter, setReminder);

/**
 * @route   GET /api/contracts/:contractId/reminders
 * @desc    Get all reminders associated with the contract
 * @access  Private (requires authentication + firm filter)
 * @param   {string} contractId - Contract ID
 * @query   {boolean} [activeOnly=true] - Only return active/pending reminders
 * @returns {Array<Reminder>} List of contract reminders
 */
router.get('/:contractId/reminders', userMiddleware, firmFilter, getReminders);

// ============================================
// EXPORT ROUTES
// ============================================

/**
 * @route   GET /api/contracts/:contractId/export/pdf
 * @desc    Export contract to PDF format
 * @access  Private (requires authentication + firm filter)
 * @param   {string} contractId - Contract ID
 * @query   {boolean} [includeAmendments=true] - Include amendments in export
 * @query   {boolean} [includeSignatures=true] - Include signature pages
 * @query   {string} [template] - PDF template to use
 * @returns {File} PDF file download
 */
router.get('/:contractId/export/pdf', userMiddleware, firmFilter, exportToPdf);

/**
 * @route   GET /api/contracts/:contractId/export/word
 * @desc    Export contract to Word document format
 * @access  Private (requires authentication + firm filter)
 * @param   {string} contractId - Contract ID
 * @query   {boolean} [includeAmendments=true] - Include amendments in export
 * @query   {string} [template] - Word template to use
 * @returns {File} Word document download
 */
router.get('/:contractId/export/word', userMiddleware, firmFilter, exportToWord);

// ============================================
// TEMPLATE SAVE ROUTE
// ============================================

/**
 * @route   POST /api/contracts/:contractId/save-as-template
 * @desc    Save current contract as a reusable template
 * @access  Private (requires authentication + firm filter)
 * @param   {string} contractId - Contract ID
 * @body    {string} templateName - Name for the template
 * @body    {string} [category] - Template category
 * @body    {string} [description] - Template description
 * @body    {Array<string>} [tags] - Template tags for searching
 * @body    {boolean} [isFirmWide=true] - Make template available to entire firm
 * @returns {Template} Created template details
 */
router.post('/:contractId/save-as-template', userMiddleware, firmFilter, saveAsTemplate);

module.exports = router;
