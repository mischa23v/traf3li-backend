const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');
const LegalContractService = require('../services/legalContract.service');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');
const { sanitizeFilename } = require('../utils/sanitize');

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

    // Mass assignment protection - only allow specific fields
    const allowedFields = pickAllowedFields(req.body, [
        'title',
        'titleAr',
        'contractType',
        'parties',
        'content',
        'financialTerms',
        'startDate',
        'endDate',
        'autoRenewal',
        'renewalTerms',
        'governingLaw',
        'jurisdiction',
        'tags',
        'clientId',
        'caseId',
        'relatedDocuments'
    ]);

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
    } = allowedFields;

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

    // Validate dates
    if (startDate && isNaN(Date.parse(startDate))) {
        throw CustomException(
            'Invalid start date format',
            400,
            {
                messageAr: 'تنسيق تاريخ البدء غير صالح',
                code: 'VALIDATION_ERROR'
            }
        );
    }

    if (endDate && isNaN(Date.parse(endDate))) {
        throw CustomException(
            'Invalid end date format',
            400,
            {
                messageAr: 'تنسيق تاريخ الانتهاء غير صالح',
                code: 'VALIDATION_ERROR'
            }
        );
    }

    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
        throw CustomException(
            'Start date cannot be after end date',
            400,
            {
                messageAr: 'لا يمكن أن يكون تاريخ البدء بعد تاريخ الانتهاء',
                code: 'VALIDATION_ERROR'
            }
        );
    }

    // Validate financial amounts
    if (financialTerms) {
        if (financialTerms.totalValue !== undefined) {
            const totalValue = parseFloat(financialTerms.totalValue);
            if (isNaN(totalValue) || totalValue < 0) {
                throw CustomException(
                    'Invalid total value amount',
                    400,
                    {
                        messageAr: 'قيمة إجمالية غير صالحة',
                        code: 'VALIDATION_ERROR'
                    }
                );
            }
        }
        if (financialTerms.advancePayment !== undefined) {
            const advancePayment = parseFloat(financialTerms.advancePayment);
            if (isNaN(advancePayment) || advancePayment < 0) {
                throw CustomException(
                    'Invalid advance payment amount',
                    400,
                    {
                        messageAr: 'مبلغ دفعة مقدمة غير صالح',
                        code: 'VALIDATION_ERROR'
                    }
                );
            }
        }
    }

    // Sanitize IDs
    const sanitizedClientId = clientId ? sanitizeObjectId(clientId) : undefined;
    const sanitizedCaseId = caseId ? sanitizeObjectId(caseId) : undefined;

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
        clientId: sanitizedClientId,
        caseId: sanitizedCaseId,
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

    // Sanitize contract ID
    const sanitizedContractId = sanitizeObjectId(contractId);

    const result = await LegalContractService.getContractById(sanitizedContractId, userId, firmId);

    if (!result.success) {
        throw CustomException(
            result.error || 'Contract not found',
            404,
            {
                messageAr: 'العقد غير موجود',
                code: 'NOT_FOUND'
            }
        );
    }

    res.status(200).json({
        success: true,
        data: result.data
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

    // Mass assignment protection - only allow specific fields to be updated
    const updates = pickAllowedFields(req.body, [
        'title',
        'titleAr',
        'contractType',
        'parties',
        'content',
        'financialTerms',
        'startDate',
        'endDate',
        'autoRenewal',
        'renewalTerms',
        'governingLaw',
        'jurisdiction',
        'tags',
        'clientId',
        'caseId',
        'relatedDocuments',
        'status'
    ]);

    // Validate dates if provided
    if (updates.startDate && isNaN(Date.parse(updates.startDate))) {
        throw CustomException(
            'Invalid start date format',
            400,
            {
                messageAr: 'تنسيق تاريخ البدء غير صالح',
                code: 'VALIDATION_ERROR'
            }
        );
    }

    if (updates.endDate && isNaN(Date.parse(updates.endDate))) {
        throw CustomException(
            'Invalid end date format',
            400,
            {
                messageAr: 'تنسيق تاريخ الانتهاء غير صالح',
                code: 'VALIDATION_ERROR'
            }
        );
    }

    if (updates.startDate && updates.endDate && new Date(updates.startDate) > new Date(updates.endDate)) {
        throw CustomException(
            'Start date cannot be after end date',
            400,
            {
                messageAr: 'لا يمكن أن يكون تاريخ البدء بعد تاريخ الانتهاء',
                code: 'VALIDATION_ERROR'
            }
        );
    }

    // Validate financial amounts if provided
    if (updates.financialTerms) {
        if (updates.financialTerms.totalValue !== undefined) {
            const totalValue = parseFloat(updates.financialTerms.totalValue);
            if (isNaN(totalValue) || totalValue < 0) {
                throw CustomException(
                    'Invalid total value amount',
                    400,
                    {
                        messageAr: 'قيمة إجمالية غير صالحة',
                        code: 'VALIDATION_ERROR'
                    }
                );
            }
        }
        if (updates.financialTerms.advancePayment !== undefined) {
            const advancePayment = parseFloat(updates.financialTerms.advancePayment);
            if (isNaN(advancePayment) || advancePayment < 0) {
                throw CustomException(
                    'Invalid advance payment amount',
                    400,
                    {
                        messageAr: 'مبلغ دفعة مقدمة غير صالح',
                        code: 'VALIDATION_ERROR'
                    }
                );
            }
        }
    }

    // Sanitize IDs
    const sanitizedContractId = sanitizeObjectId(contractId);
    if (updates.clientId) {
        updates.clientId = sanitizeObjectId(updates.clientId);
    }
    if (updates.caseId) {
        updates.caseId = sanitizeObjectId(updates.caseId);
    }

    const contract = await LegalContractService.updateContract(sanitizedContractId, updates, userId, firmId);

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

    // Sanitize contract ID
    const sanitizedContractId = sanitizeObjectId(contractId);

    await LegalContractService.deleteContract(sanitizedContractId, userId, firmId);

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

    // Sanitize clientId if provided
    const sanitizedClientId = clientId ? sanitizeObjectId(clientId) : undefined;

    const filters = {
        status,
        contractType,
        clientId: sanitizedClientId,
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

    // Validate limit
    const parsedLimit = parseInt(limit);
    if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
        throw CustomException(
            'Limit must be between 1 and 100',
            400,
            {
                messageAr: 'يجب أن يكون الحد بين 1 و 100',
                code: 'VALIDATION_ERROR'
            }
        );
    }

    const results = await LegalContractService.searchContracts(q, parsedLimit, userId, firmId);

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

    // Mass assignment protection for party data
    const partyData = pickAllowedFields(req.body, [
        'name',
        'nameAr',
        'partyType',
        'role',
        'nationalId',
        'commercialRegistration',
        'email',
        'phone',
        'address',
        'representative',
        'clientId'
    ]);

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

    // Sanitize IDs
    const sanitizedContractId = sanitizeObjectId(contractId);
    if (partyData.clientId) {
        partyData.clientId = sanitizeObjectId(partyData.clientId);
    }

    const contract = await LegalContractService.addParty(sanitizedContractId, partyData, userId, firmId);

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

    // Mass assignment protection for party data
    const partyData = pickAllowedFields(req.body, [
        'name',
        'nameAr',
        'partyType',
        'role',
        'nationalId',
        'commercialRegistration',
        'email',
        'phone',
        'address',
        'representative',
        'clientId'
    ]);

    // Sanitize IDs
    const sanitizedContractId = sanitizeObjectId(contractId);
    if (partyData.clientId) {
        partyData.clientId = sanitizeObjectId(partyData.clientId);
    }

    const contract = await LegalContractService.updateParty(
        sanitizedContractId,
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

    // Sanitize contract ID
    const sanitizedContractId = sanitizeObjectId(contractId);

    const contract = await LegalContractService.removeParty(
        sanitizedContractId,
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

    // Sanitize contract ID
    const sanitizedContractId = sanitizeObjectId(contractId);

    const contract = await LegalContractService.initiateSignature(sanitizedContractId, userId, firmId);

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

    // Mass assignment protection
    const allowedFields = pickAllowedFields(req.body, [
        'signatureMethod',
        'signatureReference',
        'signedDate'
    ]);

    const { signatureMethod, signatureReference, signedDate } = allowedFields;

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

    // Validate signedDate if provided
    if (signedDate && isNaN(Date.parse(signedDate))) {
        throw CustomException(
            'Invalid signed date format',
            400,
            {
                messageAr: 'تنسيق تاريخ التوقيع غير صالح',
                code: 'VALIDATION_ERROR'
            }
        );
    }

    const signatureData = {
        signatureMethod,
        signatureReference,
        signedDate: signedDate || new Date()
    };

    // Sanitize contract ID
    const sanitizedContractId = sanitizeObjectId(contractId);

    const contract = await LegalContractService.recordSignature(
        sanitizedContractId,
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

    // Sanitize contract ID
    const sanitizedContractId = sanitizeObjectId(contractId);

    const status = await LegalContractService.getSignatureStatus(sanitizedContractId, userId, firmId);

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

    // Mass assignment protection
    const allowedFields = pickAllowedFields(req.body, [
        'description',
        'descriptionAr',
        'changes',
        'effectiveDate'
    ]);

    const { description, descriptionAr, changes, effectiveDate } = allowedFields;

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

    // Validate effectiveDate if provided
    if (effectiveDate && isNaN(Date.parse(effectiveDate))) {
        throw CustomException(
            'Invalid effective date format',
            400,
            {
                messageAr: 'تنسيق تاريخ السريان غير صالح',
                code: 'VALIDATION_ERROR'
            }
        );
    }

    const amendmentData = {
        description,
        descriptionAr,
        changes,
        effectiveDate: effectiveDate || new Date(),
        createdBy: userId
    };

    // Sanitize contract ID
    const sanitizedContractId = sanitizeObjectId(contractId);

    const contract = await LegalContractService.addAmendment(sanitizedContractId, amendmentData, userId, firmId);

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

    // Sanitize contract ID
    const sanitizedContractId = sanitizeObjectId(contractId);

    const amendments = await LegalContractService.getAmendments(sanitizedContractId, userId, firmId);

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

    // Mass assignment protection
    const allowedFields = pickAllowedFields(req.body, ['note', 'noteAr']);
    const { note, noteAr } = allowedFields;

    // Sanitize contract ID
    const sanitizedContractId = sanitizeObjectId(contractId);

    const version = await LegalContractService.createVersion(sanitizedContractId, note || noteAr, userId, firmId);

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

    // Sanitize contract ID
    const sanitizedContractId = sanitizeObjectId(contractId);

    const versions = await LegalContractService.getVersionHistory(sanitizedContractId, userId, firmId);

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

    // Validate version number
    const parsedVersionNumber = parseInt(versionNumber);
    if (isNaN(parsedVersionNumber) || parsedVersionNumber < 1) {
        throw CustomException(
            'Invalid version number',
            400,
            {
                messageAr: 'رقم الإصدار غير صالح',
                code: 'VALIDATION_ERROR'
            }
        );
    }

    // Sanitize contract ID
    const sanitizedContractId = sanitizeObjectId(contractId);

    const contract = await LegalContractService.revertToVersion(
        sanitizedContractId,
        parsedVersionNumber,
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

    // Mass assignment protection
    const allowedFields = pickAllowedFields(req.body, [
        'notarizationType',
        'notarizationNumber',
        'notarizationDate',
        'notaryCity',
        'notaryName',
        'notaryCertificateNumber',
        'najizReferenceNumber',
        'najizVerificationCode'
    ]);

    const {
        notarizationType,
        notarizationNumber,
        notarizationDate,
        notaryCity,
        notaryName,
        notaryCertificateNumber,
        najizReferenceNumber,
        najizVerificationCode
    } = allowedFields;

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

    // Validate notarization date
    if (isNaN(Date.parse(notarizationDate))) {
        throw CustomException(
            'Invalid notarization date format',
            400,
            {
                messageAr: 'تنسيق تاريخ التوثيق غير صالح',
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

    // Sanitize contract ID
    const sanitizedContractId = sanitizeObjectId(contractId);

    const contract = await LegalContractService.recordNotarization(
        sanitizedContractId,
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

    // Sanitize contract ID
    const sanitizedContractId = sanitizeObjectId(contractId);

    const verificationResult = await LegalContractService.verifyNotarization(
        sanitizedContractId,
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

    // Mass assignment protection
    const allowedFields = pickAllowedFields(req.body, [
        'breachDate',
        'breachingParty',
        'breachDescription',
        'breachDescriptionAr',
        'breachType',
        'severity',
        'evidenceDocuments'
    ]);

    const {
        breachDate,
        breachingParty,
        breachDescription,
        breachDescriptionAr,
        breachType,
        severity,
        evidenceDocuments
    } = allowedFields;

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

    // Validate breach date
    if (isNaN(Date.parse(breachDate))) {
        throw CustomException(
            'Invalid breach date format',
            400,
            {
                messageAr: 'تنسيق تاريخ المخالفة غير صالح',
                code: 'VALIDATION_ERROR'
            }
        );
    }

    const breachData = {
        breachDate,
        breachingParty,
        breachDescription,
        breachDescriptionAr,
        breachType,
        severity,
        evidenceDocuments,
        reportedBy: userId
    };

    // Sanitize contract ID
    const sanitizedContractId = sanitizeObjectId(contractId);

    const contract = await LegalContractService.recordBreach(sanitizedContractId, breachData, userId, firmId);

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

    // Mass assignment protection
    const allowedFields = pickAllowedFields(req.body, [
        'court',
        'amount',
        'description',
        'descriptionAr'
    ]);

    const { court, amount, description, descriptionAr } = allowedFields;

    // Validate amount if provided
    if (amount !== undefined) {
        const enforcementAmount = parseFloat(amount);
        if (isNaN(enforcementAmount) || enforcementAmount < 0) {
            throw CustomException(
                'Invalid enforcement amount',
                400,
                {
                    messageAr: 'مبلغ التنفيذ غير صالح',
                    code: 'VALIDATION_ERROR'
                }
            );
        }
    }

    const enforcementData = {
        court,
        amount,
        description,
        descriptionAr,
        initiatedBy: userId
    };

    // Sanitize contract ID
    const sanitizedContractId = sanitizeObjectId(contractId);

    const contract = await LegalContractService.initiateEnforcement(
        sanitizedContractId,
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

    // Mass assignment protection
    const allowedFields = pickAllowedFields(req.body, [
        'status',
        'details',
        'detailsAr'
    ]);

    const { status, details, detailsAr } = allowedFields;

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

    // Sanitize contract ID
    const sanitizedContractId = sanitizeObjectId(contractId);

    const contract = await LegalContractService.updateEnforcementStatus(
        sanitizedContractId,
        status,
        details || detailsAr,
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

    // Mass assignment protection
    const allowedFields = pickAllowedFields(req.body, ['caseId']);
    const { caseId } = allowedFields;

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

    // Sanitize IDs
    const sanitizedContractId = sanitizeObjectId(contractId);
    const sanitizedCaseId = sanitizeObjectId(caseId);

    const contract = await LegalContractService.linkToCase(sanitizedContractId, sanitizedCaseId, userId, firmId);

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

    // Mass assignment protection
    const allowedFields = pickAllowedFields(req.body, [
        'type',
        'date',
        'message',
        'messageAr',
        'recipients'
    ]);

    const { type, date, message, messageAr, recipients } = allowedFields;

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

    // Validate reminder date
    if (isNaN(Date.parse(date))) {
        throw CustomException(
            'Invalid reminder date format',
            400,
            {
                messageAr: 'تنسيق تاريخ التذكير غير صالح',
                code: 'VALIDATION_ERROR'
            }
        );
    }

    const reminderData = {
        type,
        date,
        message,
        messageAr,
        recipients,
        createdBy: userId
    };

    // Sanitize contract ID
    const sanitizedContractId = sanitizeObjectId(contractId);

    const reminder = await LegalContractService.setReminder(sanitizedContractId, reminderData, userId, firmId);

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

    // Sanitize contract ID
    const sanitizedContractId = sanitizeObjectId(contractId);

    const reminders = await LegalContractService.getReminders(sanitizedContractId, userId, firmId);

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

    // Sanitize client ID
    const sanitizedClientId = sanitizeObjectId(clientId);

    const contracts = await LegalContractService.getContractsByClient(sanitizedClientId, userId, firmId);

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

    // Sanitize contract ID
    const sanitizedContractId = sanitizeObjectId(contractId);

    const pdfBuffer = await LegalContractService.exportToPdf(sanitizedContractId, userId, firmId);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${sanitizeFilename(`contract-${sanitizedContractId}.pdf`)}"`);
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

    // Sanitize contract ID
    const sanitizedContractId = sanitizeObjectId(contractId);

    const docBuffer = await LegalContractService.exportToWord(sanitizedContractId, userId, firmId);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${sanitizeFilename(`contract-${sanitizedContractId}.docx`)}"`);
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

    // Mass assignment protection
    const allowedFields = pickAllowedFields(req.body, [
        'templateName',
        'templateNameAr',
        'templateDescription',
        'templateDescriptionAr',
        'category'
    ]);

    const { templateName, templateNameAr, templateDescription, templateDescriptionAr, category } = allowedFields;

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

    // Sanitize contract ID
    const sanitizedContractId = sanitizeObjectId(contractId);

    const template = await LegalContractService.saveAsTemplate(
        sanitizedContractId,
        { templateName, templateNameAr, templateDescription, templateDescriptionAr, category },
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

    // Mass assignment protection
    const contractData = pickAllowedFields(req.body, [
        'title',
        'titleAr',
        'parties',
        'content',
        'financialTerms',
        'startDate',
        'endDate',
        'autoRenewal',
        'renewalTerms',
        'governingLaw',
        'jurisdiction',
        'tags',
        'clientId',
        'caseId'
    ]);

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

    // Validate dates if provided
    if (contractData.startDate && isNaN(Date.parse(contractData.startDate))) {
        throw CustomException(
            'Invalid start date format',
            400,
            {
                messageAr: 'تنسيق تاريخ البدء غير صالح',
                code: 'VALIDATION_ERROR'
            }
        );
    }

    if (contractData.endDate && isNaN(Date.parse(contractData.endDate))) {
        throw CustomException(
            'Invalid end date format',
            400,
            {
                messageAr: 'تنسيق تاريخ الانتهاء غير صالح',
                code: 'VALIDATION_ERROR'
            }
        );
    }

    // Sanitize IDs
    const sanitizedTemplateId = sanitizeObjectId(templateId);
    if (contractData.clientId) {
        contractData.clientId = sanitizeObjectId(contractData.clientId);
    }
    if (contractData.caseId) {
        contractData.caseId = sanitizeObjectId(contractData.caseId);
    }

    const contract = await LegalContractService.createFromTemplate(
        sanitizedTemplateId,
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
