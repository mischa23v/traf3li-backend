const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');
const LegalContractService = require('../services/legalContract.service');

/**
 * Legal Contract Controller
 * Comprehensive controller for managing legal contracts with bilingual support
 * Handles CRUD, parties, signatures, amendments, versions, Najiz integration, enforcement, and more
 */

// ============================================================================
// CRUD Endpoints
// ============================================================================

/**
 * Create a new legal contract
 * POST /api/contracts
 */
const createContract = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;

    const {
        title,
        titleAr,
        contractType,
        parties,
        content,
        financialTerms,
        startDate,
        endDate,
        autoRenewal,
        renewalTerms,
        governingLaw,
        jurisdiction,
        tags,
        clientId,
        caseId,
        relatedDocuments
    } = req.body;

    // Validate required fields
    if (!title || !contractType || !parties || parties.length < 2) {
        throw CustomException(
            'Title, contract type, and at least 2 parties are required',
            400,
            {
                messageAr: 'العنوان ونوع العقد وطرفان على الأقل مطلوبة',
                code: 'VALIDATION_ERROR'
            }
        );
    }

    const contractData = {
        title,
        titleAr,
        contractType,
        parties,
        content,
        financialTerms,
        startDate,
        endDate,
        autoRenewal,
        renewalTerms,
        governingLaw,
        jurisdiction,
        tags,
        clientId,
        caseId,
        relatedDocuments,
        createdBy: userId,
        firmId
    };

    const contract = await LegalContractService.createContract(contractData, userId, firmId);

    res.status(201).json({
        success: true,
        data: contract,
        message: 'Contract created successfully',
        messageAr: 'تم إنشاء العقد بنجاح'
    });
});

/**
 * Get a single contract by ID
 * GET /api/contracts/:contractId
 */
const getContract = asyncHandler(async (req, res) => {
    const { contractId } = req.params;
    const userId = req.userID;
    const firmId = req.firmId;

    if (!contractId) {
        throw CustomException(
            'Contract ID is required',
            400,
            {
                messageAr: 'معرف العقد مطلوب',
                code: 'VALIDATION_ERROR'
            }
        );
    }

    const contract = await LegalContractService.getContractById(contractId, userId, firmId);

    res.status(200).json({
        success: true,
        data: contract
    });
});

/**
 * Update a contract
 * PATCH /api/contracts/:contractId
 */
const updateContract = asyncHandler(async (req, res) => {
    const { contractId } = req.params;
    const userId = req.userID;
    const firmId = req.firmId;
    const updates = req.body;

    if (!contractId) {
        throw CustomException(
            'Contract ID is required',
            400,
            {
                messageAr: 'معرف العقد مطلوب',
                code: 'VALIDATION_ERROR'
            }
        );
    }

    const contract = await LegalContractService.updateContract(contractId, updates, userId, firmId);

    res.status(200).json({
        success: true,
        data: contract,
        message: 'Contract updated successfully',
        messageAr: 'تم تحديث العقد بنجاح'
    });
});

/**
 * Delete (archive) a contract
 * DELETE /api/contracts/:contractId
 */
const deleteContract = asyncHandler(async (req, res) => {
    const { contractId } = req.params;
    const userId = req.userID;
    const firmId = req.firmId;

    if (!contractId) {
        throw CustomException(
            'Contract ID is required',
            400,
            {
                messageAr: 'معرف العقد مطلوب',
                code: 'VALIDATION_ERROR'
            }
        );
    }

    await LegalContractService.deleteContract(contractId, userId, firmId);

    res.status(200).json({
        success: true,
        message: 'Contract archived successfully',
        messageAr: 'تم أرشفة العقد بنجاح'
    });
});

/**
 * List contracts with pagination and filtering
 * GET /api/contracts
 */
const listContracts = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;

    const {
        page = 1,
        limit = 20,
        status,
        contractType,
        clientId,
        startDate,
        endDate,
        search,
        sortBy = 'createdAt',
        sortOrder = 'desc'
    } = req.query;

    const filters = {
        status,
        contractType,
        clientId,
        startDate,
        endDate,
        search
    };

    const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        sortBy,
        sortOrder
    };

    const result = await LegalContractService.listContracts(filters, options, userId, firmId);

    res.status(200).json({
        success: true,
        data: result.contracts,
        pagination: {
            total: result.total,
            page: result.page,
            pages: result.pages,
            limit: result.limit
        }
    });
});

/**
 * Search contracts
 * GET /api/contracts/search
 */
const searchContracts = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;
    const { q, limit = 20 } = req.query;

    if (!q) {
        throw CustomException(
            'Search query is required',
            400,
            {
                messageAr: 'استعلام البحث مطلوب',
                code: 'VALIDATION_ERROR'
            }
        );
    }

    const results = await LegalContractService.searchContracts(q, parseInt(limit), userId, firmId);

    res.status(200).json({
        success: true,
        data: results
    });
});

// ============================================================================
// Party Endpoints
// ============================================================================

/**
 * Add a party to a contract
 * POST /api/contracts/:contractId/parties
 */
const addParty = asyncHandler(async (req, res) => {
    const { contractId } = req.params;
    const userId = req.userID;
    const firmId = req.firmId;
    const partyData = req.body;

    if (!contractId) {
        throw CustomException(
            'Contract ID is required',
            400,
            {
                messageAr: 'معرف العقد مطلوب',
                code: 'VALIDATION_ERROR'
            }
        );
    }

    if (!partyData.name || !partyData.partyType || !partyData.role) {
        throw CustomException(
            'Party name, type, and role are required',
            400,
            {
                messageAr: 'اسم الطرف والنوع والدور مطلوبة',
                code: 'VALIDATION_ERROR'
            }
        );
    }

    const contract = await LegalContractService.addParty(contractId, partyData, userId, firmId);

    res.status(200).json({
        success: true,
        data: contract,
        message: 'Party added successfully',
        messageAr: 'تم إضافة الطرف بنجاح'
    });
});

/**
 * Update a party in a contract
 * PATCH /api/contracts/:contractId/parties/:partyIndex
 */
const updateParty = asyncHandler(async (req, res) => {
    const { contractId, partyIndex } = req.params;
    const userId = req.userID;
    const firmId = req.firmId;
    const partyData = req.body;

    if (!contractId || partyIndex === undefined) {
        throw CustomException(
            'Contract ID and party index are required',
            400,
            {
                messageAr: 'معرف العقد ورقم الطرف مطلوبان',
                code: 'VALIDATION_ERROR'
            }
        );
    }

    const contract = await LegalContractService.updateParty(
        contractId,
        parseInt(partyIndex),
        partyData,
        userId,
        firmId
    );

    res.status(200).json({
        success: true,
        data: contract,
        message: 'Party updated successfully',
        messageAr: 'تم تحديث الطرف بنجاح'
    });
});

/**
 * Remove a party from a contract
 * DELETE /api/contracts/:contractId/parties/:partyIndex
 */
const removeParty = asyncHandler(async (req, res) => {
    const { contractId, partyIndex } = req.params;
    const userId = req.userID;
    const firmId = req.firmId;

    if (!contractId || partyIndex === undefined) {
        throw CustomException(
            'Contract ID and party index are required',
            400,
            {
                messageAr: 'معرف العقد ورقم الطرف مطلوبان',
                code: 'VALIDATION_ERROR'
            }
        );
    }

    const contract = await LegalContractService.removeParty(
        contractId,
        parseInt(partyIndex),
        userId,
        firmId
    );

    res.status(200).json({
        success: true,
        data: contract,
        message: 'Party removed successfully',
        messageAr: 'تم إزالة الطرف بنجاح'
    });
});

// ============================================================================
// Signature Endpoints
// ============================================================================

/**
 * Initiate signature process
 * POST /api/contracts/:contractId/signatures/initiate
 */
const initiateSignature = asyncHandler(async (req, res) => {
    const { contractId } = req.params;
    const userId = req.userID;
    const firmId = req.firmId;

    if (!contractId) {
        throw CustomException(
            'Contract ID is required',
            400,
            {
                messageAr: 'معرف العقد مطلوب',
                code: 'VALIDATION_ERROR'
            }
        );
    }

    const contract = await LegalContractService.initiateSignature(contractId, userId, firmId);

    res.status(200).json({
        success: true,
        data: contract,
        message: 'Signature process initiated',
        messageAr: 'تم بدء عملية التوقيع'
    });
});

/**
 * Record a signature for a party
 * POST /api/contracts/:contractId/signatures/:partyIndex
 */
const recordSignature = asyncHandler(async (req, res) => {
    const { contractId, partyIndex } = req.params;
    const userId = req.userID;
    const firmId = req.firmId;
    const { signatureMethod, signatureReference, signedDate } = req.body;

    if (!contractId || partyIndex === undefined) {
        throw CustomException(
            'Contract ID and party index are required',
            400,
            {
                messageAr: 'معرف العقد ورقم الطرف مطلوبان',
                code: 'VALIDATION_ERROR'
            }
        );
    }

    if (!signatureMethod) {
        throw CustomException(
            'Signature method is required',
            400,
            {
                messageAr: 'طريقة التوقيع مطلوبة',
                code: 'VALIDATION_ERROR'
            }
        );
    }

    const signatureData = {
        signatureMethod,
        signatureReference,
        signedDate: signedDate || new Date()
    };

    const contract = await LegalContractService.recordSignature(
        contractId,
        parseInt(partyIndex),
        signatureData,
        userId,
        firmId
    );

    res.status(200).json({
        success: true,
        data: contract,
        message: 'Signature recorded successfully',
        messageAr: 'تم تسجيل التوقيع بنجاح'
    });
});

/**
 * Get signature status
 * GET /api/contracts/:contractId/signatures
 */
const getSignatureStatus = asyncHandler(async (req, res) => {
    const { contractId } = req.params;
    const userId = req.userID;
    const firmId = req.firmId;

    if (!contractId) {
        throw CustomException(
            'Contract ID is required',
            400,
            {
                messageAr: 'معرف العقد مطلوب',
                code: 'VALIDATION_ERROR'
            }
        );
    }

    const status = await LegalContractService.getSignatureStatus(contractId, userId, firmId);

    res.status(200).json({
        success: true,
        data: status
    });
});

// ============================================================================
// Amendment Endpoints
// ============================================================================

/**
 * Add an amendment to a contract
 * POST /api/contracts/:contractId/amendments
 */
const addAmendment = asyncHandler(async (req, res) => {
    const { contractId } = req.params;
    const userId = req.userID;
    const firmId = req.firmId;
    const { description, changes, effectiveDate } = req.body;

    if (!contractId) {
        throw CustomException(
            'Contract ID is required',
            400,
            {
                messageAr: 'معرف العقد مطلوب',
                code: 'VALIDATION_ERROR'
            }
        );
    }

    if (!description || !changes) {
        throw CustomException(
            'Description and changes are required',
            400,
            {
                messageAr: 'الوصف والتغييرات مطلوبة',
                code: 'VALIDATION_ERROR'
            }
        );
    }

    const amendmentData = {
        description,
        changes,
        effectiveDate: effectiveDate || new Date(),
        createdBy: userId
    };

    const contract = await LegalContractService.addAmendment(contractId, amendmentData, userId, firmId);

    res.status(201).json({
        success: true,
        data: contract,
        message: 'Amendment added successfully',
        messageAr: 'تم إضافة التعديل بنجاح'
    });
});

/**
 * Get all amendments for a contract
 * GET /api/contracts/:contractId/amendments
 */
const getAmendments = asyncHandler(async (req, res) => {
    const { contractId } = req.params;
    const userId = req.userID;
    const firmId = req.firmId;

    if (!contractId) {
        throw CustomException(
            'Contract ID is required',
            400,
            {
                messageAr: 'معرف العقد مطلوب',
                code: 'VALIDATION_ERROR'
            }
        );
    }

    const amendments = await LegalContractService.getAmendments(contractId, userId, firmId);

    res.status(200).json({
        success: true,
        data: amendments
    });
});

// ============================================================================
// Version Endpoints
// ============================================================================

/**
 * Create a new version of the contract
 * POST /api/contracts/:contractId/versions
 */
const createVersion = asyncHandler(async (req, res) => {
    const { contractId } = req.params;
    const userId = req.userID;
    const firmId = req.firmId;
    const { note } = req.body;

    if (!contractId) {
        throw CustomException(
            'Contract ID is required',
            400,
            {
                messageAr: 'معرف العقد مطلوب',
                code: 'VALIDATION_ERROR'
            }
        );
    }

    const version = await LegalContractService.createVersion(contractId, note, userId, firmId);

    res.status(201).json({
        success: true,
        data: version,
        message: 'Version created successfully',
        messageAr: 'تم إنشاء الإصدار بنجاح'
    });
});

/**
 * Get version history
 * GET /api/contracts/:contractId/versions
 */
const getVersionHistory = asyncHandler(async (req, res) => {
    const { contractId } = req.params;
    const userId = req.userID;
    const firmId = req.firmId;

    if (!contractId) {
        throw CustomException(
            'Contract ID is required',
            400,
            {
                messageAr: 'معرف العقد مطلوب',
                code: 'VALIDATION_ERROR'
            }
        );
    }

    const versions = await LegalContractService.getVersionHistory(contractId, userId, firmId);

    res.status(200).json({
        success: true,
        data: versions
    });
});

/**
 * Revert to a specific version
 * POST /api/contracts/:contractId/versions/:versionNumber/revert
 */
const revertToVersion = asyncHandler(async (req, res) => {
    const { contractId, versionNumber } = req.params;
    const userId = req.userID;
    const firmId = req.firmId;

    if (!contractId || !versionNumber) {
        throw CustomException(
            'Contract ID and version number are required',
            400,
            {
                messageAr: 'معرف العقد ورقم الإصدار مطلوبان',
                code: 'VALIDATION_ERROR'
            }
        );
    }

    const contract = await LegalContractService.revertToVersion(
        contractId,
        parseInt(versionNumber),
        userId,
        firmId
    );

    res.status(200).json({
        success: true,
        data: contract,
        message: 'Reverted to version successfully',
        messageAr: 'تم الرجوع إلى الإصدار بنجاح'
    });
});

// ============================================================================
// Najiz Integration Endpoints
// ============================================================================

/**
 * Record notarization details
 * POST /api/contracts/:contractId/notarization
 */
const recordNotarization = asyncHandler(async (req, res) => {
    const { contractId } = req.params;
    const userId = req.userID;
    const firmId = req.firmId;

    const {
        notarizationType,
        notarizationNumber,
        notarizationDate,
        notaryCity,
        notaryName,
        notaryCertificateNumber,
        najizReferenceNumber,
        najizVerificationCode
    } = req.body;

    if (!contractId) {
        throw CustomException(
            'Contract ID is required',
            400,
            {
                messageAr: 'معرف العقد مطلوب',
                code: 'VALIDATION_ERROR'
            }
        );
    }

    if (!notarizationType || !notarizationNumber || !notarizationDate) {
        throw CustomException(
            'Notarization type, number, and date are required',
            400,
            {
                messageAr: 'نوع التوثيق والرقم والتاريخ مطلوبة',
                code: 'VALIDATION_ERROR'
            }
        );
    }

    const notarizationData = {
        notarizationType,
        notarizationNumber,
        notarizationDate,
        notaryCity,
        notaryName,
        notaryCertificateNumber,
        najizReferenceNumber,
        najizVerificationCode
    };

    const contract = await LegalContractService.recordNotarization(
        contractId,
        notarizationData,
        userId,
        firmId
    );

    res.status(200).json({
        success: true,
        data: contract,
        message: 'Notarization recorded successfully',
        messageAr: 'تم تسجيل التوثيق بنجاح'
    });
});

/**
 * Verify notarization with Najiz
 * GET /api/contracts/:contractId/notarization/verify
 */
const verifyNotarization = asyncHandler(async (req, res) => {
    const { contractId } = req.params;
    const userId = req.userID;
    const firmId = req.firmId;

    if (!contractId) {
        throw CustomException(
            'Contract ID is required',
            400,
            {
                messageAr: 'معرف العقد مطلوب',
                code: 'VALIDATION_ERROR'
            }
        );
    }

    const verificationResult = await LegalContractService.verifyNotarization(
        contractId,
        userId,
        firmId
    );

    res.status(200).json({
        success: true,
        data: verificationResult
    });
});

// ============================================================================
// Enforcement Endpoints
// ============================================================================

/**
 * Record a contract breach
 * POST /api/contracts/:contractId/breach
 */
const recordBreach = asyncHandler(async (req, res) => {
    const { contractId } = req.params;
    const userId = req.userID;
    const firmId = req.firmId;

    const {
        breachDate,
        breachingParty,
        breachDescription,
        breachType,
        severity,
        evidenceDocuments
    } = req.body;

    if (!contractId) {
        throw CustomException(
            'Contract ID is required',
            400,
            {
                messageAr: 'معرف العقد مطلوب',
                code: 'VALIDATION_ERROR'
            }
        );
    }

    if (!breachDate || !breachingParty || !breachDescription) {
        throw CustomException(
            'Breach date, breaching party, and description are required',
            400,
            {
                messageAr: 'تاريخ المخالفة والطرف المخالف والوصف مطلوبة',
                code: 'VALIDATION_ERROR'
            }
        );
    }

    const breachData = {
        breachDate,
        breachingParty,
        breachDescription,
        breachType,
        severity,
        evidenceDocuments,
        reportedBy: userId
    };

    const contract = await LegalContractService.recordBreach(contractId, breachData, userId, firmId);

    res.status(200).json({
        success: true,
        data: contract,
        message: 'Breach recorded successfully',
        messageAr: 'تم تسجيل المخالفة بنجاح'
    });
});

/**
 * Initiate enforcement proceedings
 * POST /api/contracts/:contractId/enforcement
 */
const initiateEnforcement = asyncHandler(async (req, res) => {
    const { contractId } = req.params;
    const userId = req.userID;
    const firmId = req.firmId;
    const { court, amount, description } = req.body;

    if (!contractId) {
        throw CustomException(
            'Contract ID is required',
            400,
            {
                messageAr: 'معرف العقد مطلوب',
                code: 'VALIDATION_ERROR'
            }
        );
    }

    const enforcementData = {
        court,
        amount,
        description,
        initiatedBy: userId
    };

    const contract = await LegalContractService.initiateEnforcement(
        contractId,
        enforcementData,
        userId,
        firmId
    );

    res.status(200).json({
        success: true,
        data: contract,
        message: 'Enforcement initiated successfully',
        messageAr: 'تم بدء التنفيذ بنجاح'
    });
});

/**
 * Update enforcement status
 * PATCH /api/contracts/:contractId/enforcement
 */
const updateEnforcementStatus = asyncHandler(async (req, res) => {
    const { contractId } = req.params;
    const userId = req.userID;
    const firmId = req.firmId;
    const { status, details } = req.body;

    if (!contractId) {
        throw CustomException(
            'Contract ID is required',
            400,
            {
                messageAr: 'معرف العقد مطلوب',
                code: 'VALIDATION_ERROR'
            }
        );
    }

    if (!status) {
        throw CustomException(
            'Status is required',
            400,
            {
                messageAr: 'الحالة مطلوبة',
                code: 'VALIDATION_ERROR'
            }
        );
    }

    const contract = await LegalContractService.updateEnforcementStatus(
        contractId,
        status,
        details,
        userId,
        firmId
    );

    res.status(200).json({
        success: true,
        data: contract,
        message: 'Enforcement status updated successfully',
        messageAr: 'تم تحديث حالة التنفيذ بنجاح'
    });
});

/**
 * Link contract to a case
 * POST /api/contracts/:contractId/link-case
 */
const linkToCase = asyncHandler(async (req, res) => {
    const { contractId } = req.params;
    const userId = req.userID;
    const firmId = req.firmId;
    const { caseId } = req.body;

    if (!contractId || !caseId) {
        throw CustomException(
            'Contract ID and case ID are required',
            400,
            {
                messageAr: 'معرف العقد ومعرف القضية مطلوبان',
                code: 'VALIDATION_ERROR'
            }
        );
    }

    const contract = await LegalContractService.linkToCase(contractId, caseId, userId, firmId);

    res.status(200).json({
        success: true,
        data: contract,
        message: 'Contract linked to case successfully',
        messageAr: 'تم ربط العقد بالقضية بنجاح'
    });
});

// ============================================================================
// Reminder Endpoints
// ============================================================================

/**
 * Set a reminder for the contract
 * POST /api/contracts/:contractId/reminders
 */
const setReminder = asyncHandler(async (req, res) => {
    const { contractId } = req.params;
    const userId = req.userID;
    const firmId = req.firmId;
    const { type, date, message, recipients } = req.body;

    if (!contractId) {
        throw CustomException(
            'Contract ID is required',
            400,
            {
                messageAr: 'معرف العقد مطلوب',
                code: 'VALIDATION_ERROR'
            }
        );
    }

    if (!type || !date) {
        throw CustomException(
            'Reminder type and date are required',
            400,
            {
                messageAr: 'نوع التذكير والتاريخ مطلوبان',
                code: 'VALIDATION_ERROR'
            }
        );
    }

    const reminderData = {
        type,
        date,
        message,
        recipients,
        createdBy: userId
    };

    const reminder = await LegalContractService.setReminder(contractId, reminderData, userId, firmId);

    res.status(201).json({
        success: true,
        data: reminder,
        message: 'Reminder set successfully',
        messageAr: 'تم تعيين التذكير بنجاح'
    });
});

/**
 * Get all reminders for a contract
 * GET /api/contracts/:contractId/reminders
 */
const getReminders = asyncHandler(async (req, res) => {
    const { contractId } = req.params;
    const userId = req.userID;
    const firmId = req.firmId;

    if (!contractId) {
        throw CustomException(
            'Contract ID is required',
            400,
            {
                messageAr: 'معرف العقد مطلوب',
                code: 'VALIDATION_ERROR'
            }
        );
    }

    const reminders = await LegalContractService.getReminders(contractId, userId, firmId);

    res.status(200).json({
        success: true,
        data: reminders
    });
});

// ============================================================================
// Reporting Endpoints
// ============================================================================

/**
 * Get contracts expiring soon
 * GET /api/contracts/expiring
 */
const getExpiringContracts = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;
    const { days = 30 } = req.query;

    const contracts = await LegalContractService.getExpiringContracts(
        parseInt(days),
        userId,
        firmId
    );

    res.status(200).json({
        success: true,
        data: contracts
    });
});

/**
 * Get all contracts for a specific client
 * GET /api/contracts/client/:clientId
 */
const getContractsByClient = asyncHandler(async (req, res) => {
    const { clientId } = req.params;
    const userId = req.userID;
    const firmId = req.firmId;

    if (!clientId) {
        throw CustomException(
            'Client ID is required',
            400,
            {
                messageAr: 'معرف العميل مطلوب',
                code: 'VALIDATION_ERROR'
            }
        );
    }

    const contracts = await LegalContractService.getContractsByClient(clientId, userId, firmId);

    res.status(200).json({
        success: true,
        data: contracts
    });
});

/**
 * Get contract statistics
 * GET /api/contracts/statistics
 */
const getContractStatistics = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;

    const statistics = await LegalContractService.getContractStatistics(userId, firmId);

    res.status(200).json({
        success: true,
        data: statistics
    });
});

// ============================================================================
// Export Endpoints
// ============================================================================

/**
 * Export contract to PDF
 * GET /api/contracts/:contractId/export/pdf
 */
const exportToPdf = asyncHandler(async (req, res) => {
    const { contractId } = req.params;
    const userId = req.userID;
    const firmId = req.firmId;

    if (!contractId) {
        throw CustomException(
            'Contract ID is required',
            400,
            {
                messageAr: 'معرف العقد مطلوب',
                code: 'VALIDATION_ERROR'
            }
        );
    }

    const pdfBuffer = await LegalContractService.exportToPdf(contractId, userId, firmId);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="contract-${contractId}.pdf"`);
    res.send(pdfBuffer);
});

/**
 * Export contract to Word
 * GET /api/contracts/:contractId/export/word
 */
const exportToWord = asyncHandler(async (req, res) => {
    const { contractId } = req.params;
    const userId = req.userID;
    const firmId = req.firmId;

    if (!contractId) {
        throw CustomException(
            'Contract ID is required',
            400,
            {
                messageAr: 'معرف العقد مطلوب',
                code: 'VALIDATION_ERROR'
            }
        );
    }

    const docBuffer = await LegalContractService.exportToWord(contractId, userId, firmId);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="contract-${contractId}.docx"`);
    res.send(docBuffer);
});

// ============================================================================
// Template Endpoints
// ============================================================================

/**
 * Save contract as a template
 * POST /api/contracts/:contractId/save-as-template
 */
const saveAsTemplate = asyncHandler(async (req, res) => {
    const { contractId } = req.params;
    const userId = req.userID;
    const firmId = req.firmId;
    const { templateName, templateDescription, category } = req.body;

    if (!contractId) {
        throw CustomException(
            'Contract ID is required',
            400,
            {
                messageAr: 'معرف العقد مطلوب',
                code: 'VALIDATION_ERROR'
            }
        );
    }

    if (!templateName) {
        throw CustomException(
            'Template name is required',
            400,
            {
                messageAr: 'اسم القالب مطلوب',
                code: 'VALIDATION_ERROR'
            }
        );
    }

    const template = await LegalContractService.saveAsTemplate(
        contractId,
        { templateName, templateDescription, category },
        userId,
        firmId
    );

    res.status(201).json({
        success: true,
        data: template,
        message: 'Contract saved as template successfully',
        messageAr: 'تم حفظ العقد كقالب بنجاح'
    });
});

/**
 * Get all contract templates
 * GET /api/contracts/templates
 */
const getTemplates = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;
    const { category } = req.query;

    const templates = await LegalContractService.getTemplates(category, userId, firmId);

    res.status(200).json({
        success: true,
        data: templates
    });
});

/**
 * Create a contract from a template
 * POST /api/contracts/templates/:templateId/use
 */
const createFromTemplate = asyncHandler(async (req, res) => {
    const { templateId } = req.params;
    const userId = req.userID;
    const firmId = req.firmId;
    const contractData = req.body;

    if (!templateId) {
        throw CustomException(
            'Template ID is required',
            400,
            {
                messageAr: 'معرف القالب مطلوب',
                code: 'VALIDATION_ERROR'
            }
        );
    }

    if (!contractData.title || !contractData.parties) {
        throw CustomException(
            'Title and parties are required',
            400,
            {
                messageAr: 'العنوان والأطراف مطلوبة',
                code: 'VALIDATION_ERROR'
            }
        );
    }

    const contract = await LegalContractService.createFromTemplate(
        templateId,
        contractData,
        userId,
        firmId
    );

    res.status(201).json({
        success: true,
        data: contract,
        message: 'Contract created from template successfully',
        messageAr: 'تم إنشاء العقد من القالب بنجاح'
    });
});

// ============================================================================
// Exports
// ============================================================================

module.exports = {
    // CRUD
    createContract,
    getContract,
    updateContract,
    deleteContract,
    listContracts,
    searchContracts,

    // Party Management
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
};
