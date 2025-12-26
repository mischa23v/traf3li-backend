const { ConflictCheck, Client, Case, Contact, Organization } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');
const { pickAllowedFields, sanitizeObjectId, sanitizeString, sanitizePagination } = require('../utils/securityUtils');

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1, str2) {
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();
    const track = Array(s2.length + 1).fill(null).map(() =>
        Array(s1.length + 1).fill(null));
    for (let i = 0; i <= s1.length; i += 1) {
        track[0][i] = i;
    }
    for (let j = 0; j <= s2.length; j += 1) {
        track[j][0] = j;
    }
    for (let j = 1; j <= s2.length; j += 1) {
        for (let i = 1; i <= s1.length; i += 1) {
            const indicator = s1[i - 1] === s2[j - 1] ? 0 : 1;
            track[j][i] = Math.min(
                track[j][i - 1] + 1,
                track[j - 1][i] + 1,
                track[j - 1][i - 1] + indicator
            );
        }
    }
    return track[s2.length][s1.length];
}

/**
 * Calculate similarity score (0-100)
 */
function calculateSimilarity(str1, str2) {
    if (!str1 || !str2) return 0;
    const maxLen = Math.max(str1.length, str2.length);
    if (maxLen === 0) return 100;
    const distance = levenshteinDistance(str1, str2);
    return Math.round((1 - distance / maxLen) * 100);
}

/**
 * Run conflict check
 * POST /api/conflict-checks
 */
const runConflictCheck = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;

    // Mass assignment protection - only allow specific fields
    const allowedFields = ['checkType', 'searchTerms', 'caseId', 'clientId', 'includeArchived', 'threshold'];
    const safeData = pickAllowedFields(req.body, allowedFields);

    // Input validation
    if (!safeData.searchTerms || !Array.isArray(safeData.searchTerms) || safeData.searchTerms.length === 0) {
        throw CustomException('يجب تحديد مصطلحات البحث', 400);
    }

    // Validate and sanitize search terms
    const sanitizedSearchTerms = safeData.searchTerms
        .filter(term => term && typeof term === 'string')
        .map(term => sanitizeString(term))
        .filter(term => term.length > 0);

    if (sanitizedSearchTerms.length === 0) {
        throw CustomException('يجب تحديد مصطلحات بحث صالحة', 400);
    }

    // Validate threshold
    const threshold = safeData.threshold ? parseInt(safeData.threshold, 10) : 80;
    if (isNaN(threshold) || threshold < 0 || threshold > 100) {
        throw CustomException('نسبة التطابق يجب أن تكون بين 0 و 100', 400);
    }

    // Sanitize ObjectIds
    const caseId = safeData.caseId ? sanitizeObjectId(safeData.caseId) : null;
    const clientId = safeData.clientId ? sanitizeObjectId(safeData.clientId) : null;

    if (safeData.caseId && !caseId) {
        throw CustomException('معرف القضية غير صالح', 400);
    }
    if (safeData.clientId && !clientId) {
        throw CustomException('معرف العميل غير صالح', 400);
    }

    // SECURITY: Build query with multi-tenant isolation
    const buildOwnershipQuery = (additionalQuery = {}) => {
        const query = { ...additionalQuery };
        if (firmId) {
            query.firmId = firmId;
        } else {
            query.lawyerId = lawyerId;
        }
        return query;
    };

    // IDOR protection - verify case ownership if caseId provided
    if (caseId) {
        const caseExists = await Case.findOne(buildOwnershipQuery({ _id: caseId }));
        if (!caseExists) {
            throw CustomException('القضية غير موجودة أو غير مصرح لك بالوصول إليها', 403);
        }
    }

    // IDOR protection - verify client ownership if clientId provided
    if (clientId) {
        const clientExists = await Client.findOne(buildOwnershipQuery({ _id: clientId }));
        if (!clientExists) {
            throw CustomException('العميل غير موجود أو غير مصرح لك بالوصول إليه', 403);
        }
    }

    // Create conflict check record
    const conflictCheck = await ConflictCheck.create({
        lawyerId,
        checkType: safeData.checkType || 'new_client',
        searchTerms: sanitizedSearchTerms,
        caseId,
        clientId,
        status: 'running',
        threshold,
        createdBy: lawyerId
    });

    try {
        const matches = [];
        const searchThreshold = threshold;

        // SECURITY: Build base query with multi-tenant isolation
        const baseQuery = firmId ? { firmId } : { lawyerId };
        if (!safeData.includeArchived) {
            baseQuery.isArchived = { $ne: true };
        }

        // Search clients
        const clients = await Client.find(baseQuery).lean();
        for (const client of clients) {
            for (const term of sanitizedSearchTerms) {
                // Check name similarity
                const fullName = `${client.firstName || ''} ${client.lastName || ''}`.trim();
                const nameSimilarity = calculateSimilarity(term, fullName);
                const arabicNameSimilarity = calculateSimilarity(term, client.nameAr || '');
                const companySimilarity = calculateSimilarity(term, client.companyName || '');
                const emailSimilarity = client.email?.toLowerCase() === term.toLowerCase() ? 100 : 0;
                const phoneSimilarity = client.phone === term ? 100 : 0;

                const maxSimilarity = Math.max(
                    nameSimilarity,
                    arabicNameSimilarity,
                    companySimilarity,
                    emailSimilarity,
                    phoneSimilarity
                );

                if (maxSimilarity >= searchThreshold) {
                    matches.push({
                        entityType: 'client',
                        entityId: client._id,
                        entityName: fullName || client.companyName,
                        matchField: getMatchField(maxSimilarity, {
                            name: nameSimilarity,
                            nameAr: arabicNameSimilarity,
                            company: companySimilarity,
                            email: emailSimilarity,
                            phone: phoneSimilarity
                        }),
                        matchValue: term,
                        score: maxSimilarity,
                        relationship: 'client'
                    });
                }
            }
        }

        // Search cases
        const cases = await Case.find(baseQuery).lean();
        for (const caseDoc of cases) {
            for (const term of sanitizedSearchTerms) {
                const titleSimilarity = calculateSimilarity(term, caseDoc.title || '');
                const numberSimilarity = caseDoc.caseNumber?.toLowerCase() === term.toLowerCase() ? 100 : 0;

                // Check parties
                let partySimilarity = 0;
                let matchedParty = null;
                if (caseDoc.parties) {
                    for (const party of caseDoc.parties) {
                        const partyNameSim = calculateSimilarity(term, party.name || '');
                        if (partyNameSim > partySimilarity) {
                            partySimilarity = partyNameSim;
                            matchedParty = party.name;
                        }
                    }
                }

                const maxSimilarity = Math.max(titleSimilarity, numberSimilarity, partySimilarity);

                if (maxSimilarity >= searchThreshold) {
                    matches.push({
                        entityType: 'case',
                        entityId: caseDoc._id,
                        entityName: caseDoc.title || caseDoc.caseNumber,
                        matchField: partySimilarity === maxSimilarity ? 'party' :
                            numberSimilarity === maxSimilarity ? 'caseNumber' : 'title',
                        matchValue: term,
                        score: maxSimilarity,
                        relationship: 'case',
                        details: partySimilarity === maxSimilarity ? { partyName: matchedParty } : undefined
                    });
                }
            }
        }

        // Search contacts
        const contacts = await Contact.find(baseQuery).lean();
        for (const contact of contacts) {
            for (const term of sanitizedSearchTerms) {
                const fullName = `${contact.firstName || ''} ${contact.lastName || ''}`.trim();
                const nameSimilarity = calculateSimilarity(term, fullName);
                const companySimilarity = calculateSimilarity(term, contact.company || '');
                const emailSimilarity = contact.email?.toLowerCase() === term.toLowerCase() ? 100 : 0;

                const maxSimilarity = Math.max(nameSimilarity, companySimilarity, emailSimilarity);

                if (maxSimilarity >= searchThreshold) {
                    matches.push({
                        entityType: 'contact',
                        entityId: contact._id,
                        entityName: fullName || contact.company,
                        matchField: emailSimilarity === maxSimilarity ? 'email' :
                            companySimilarity === maxSimilarity ? 'company' : 'name',
                        matchValue: term,
                        score: maxSimilarity,
                        relationship: contact.type || 'contact'
                    });
                }
            }
        }

        // Search organizations
        const organizations = await Organization.find(baseQuery).lean();
        for (const org of organizations) {
            for (const term of sanitizedSearchTerms) {
                const nameSimilarity = calculateSimilarity(term, org.name || '');
                const arabicNameSimilarity = calculateSimilarity(term, org.nameAr || '');
                const regNumSimilarity = org.registrationNumber === term ? 100 : 0;

                const maxSimilarity = Math.max(nameSimilarity, arabicNameSimilarity, regNumSimilarity);

                if (maxSimilarity >= searchThreshold) {
                    matches.push({
                        entityType: 'organization',
                        entityId: org._id,
                        entityName: org.name || org.nameAr,
                        matchField: regNumSimilarity === maxSimilarity ? 'registrationNumber' :
                            arabicNameSimilarity === maxSimilarity ? 'nameAr' : 'name',
                        matchValue: term,
                        score: maxSimilarity,
                        relationship: 'organization'
                    });
                }
            }
        }

        // Remove duplicates and sort by score
        const uniqueMatches = [];
        const seen = new Set();
        for (const match of matches.sort((a, b) => b.score - a.score)) {
            const key = `${match.entityType}-${match.entityId}`;
            if (!seen.has(key)) {
                seen.add(key);
                uniqueMatches.push(match);
            }
        }

        // Update conflict check with results
        conflictCheck.matches = uniqueMatches;
        conflictCheck.status = uniqueMatches.length > 0 ? 'conflicts_found' : 'clear';
        conflictCheck.completedAt = new Date();
        await conflictCheck.save();

        res.status(200).json({
            success: true,
            message: uniqueMatches.length > 0 ?
                `تم العثور على ${uniqueMatches.length} تطابق محتمل` :
                'لم يتم العثور على تعارضات',
            data: conflictCheck
        });
    } catch (error) {
        conflictCheck.status = 'error';
        conflictCheck.error = error.message;
        await conflictCheck.save();
        throw error;
    }
});

/**
 * Helper to get the field that matched
 */
function getMatchField(maxScore, scores) {
    for (const [field, score] of Object.entries(scores)) {
        if (score === maxScore) return field;
    }
    return 'unknown';
}

/**
 * Get conflict check history
 * GET /api/conflict-checks
 */
const getConflictChecks = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;

    // Sanitize pagination parameters
    const { page, limit, skip } = sanitizePagination(req.query, { maxLimit: 100, defaultLimit: 20 });

    // SECURITY: Build query with multi-tenant isolation
    const query = firmId ? { firmId } : { lawyerId };

    // Input validation for status
    const validStatuses = ['pending', 'cleared', 'flagged', 'waived', 'running', 'conflicts_found', 'clear', 'error', 'resolved'];
    if (req.query.status && validStatuses.includes(req.query.status)) {
        query.status = req.query.status;
    }

    // Input validation for checkType
    const validCheckTypes = ['new_client', 'new_case', 'new_matter', 'client', 'case', 'matter'];
    if (req.query.checkType && validCheckTypes.includes(req.query.checkType)) {
        query.checkType = req.query.checkType;
    }

    const checks = await ConflictCheck.find(query)
        .populate('caseId', 'title caseNumber')
        .populate('clientId', 'firstName lastName companyName')
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .lean();

    const total = await ConflictCheck.countDocuments(query);

    // Sanitize sensitive data in response
    const sanitizedChecks = checks.map(check => ({
        ...check,
        // Remove any internal fields if needed
        __v: undefined
    }));

    res.status(200).json({
        success: true,
        data: sanitizedChecks,
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
        }
    });
});

/**
 * Get single conflict check
 * GET /api/conflict-checks/:id
 */
const getConflictCheck = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;

    // Sanitize and validate ObjectId
    const checkId = sanitizeObjectId(req.params.id);
    if (!checkId) {
        throw CustomException('معرف فحص التعارض غير صالح', 400);
    }

    // SECURITY: Build query with multi-tenant isolation
    const ownershipQuery = firmId ? { firmId } : { lawyerId };

    // IDOR protection - verify ownership
    const check = await ConflictCheck.findOne({ _id: checkId, ...ownershipQuery })
        .populate('caseId', 'title caseNumber')
        .populate('clientId', 'firstName lastName companyName')
        .populate('matches.entityId')
        .lean();

    if (!check) {
        throw CustomException('فحص التعارض غير موجود أو غير مصرح لك بالوصول إليه', 404);
    }

    // Sanitize sensitive data
    const sanitizedCheck = {
        ...check,
        __v: undefined
    };

    res.status(200).json({
        success: true,
        data: sanitizedCheck
    });
});

/**
 * Update conflict check resolution
 * PATCH /api/conflict-checks/:id
 */
const updateConflictCheck = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;

    // Sanitize and validate ObjectId
    const checkId = sanitizeObjectId(req.params.id);
    if (!checkId) {
        throw CustomException('معرف فحص التعارض غير صالح', 400);
    }

    // Mass assignment protection - only allow specific fields
    const allowedFields = ['status', 'resolution', 'notes', 'clearanceNotes'];
    const safeData = pickAllowedFields(req.body, allowedFields);

    // Input validation for status
    const validStatuses = ['pending', 'cleared', 'flagged', 'waived', 'resolved'];
    if (safeData.status && !validStatuses.includes(safeData.status)) {
        throw CustomException('حالة غير صالحة', 400);
    }

    // Sanitize string inputs
    if (safeData.notes) {
        safeData.notes = sanitizeString(safeData.notes);
    }
    if (safeData.clearanceNotes) {
        safeData.clearanceNotes = sanitizeString(safeData.clearanceNotes);
    }

    // SECURITY: Build query with multi-tenant isolation
    const ownershipQuery = firmId ? { firmId } : { lawyerId };

    // IDOR protection - verify ownership
    const check = await ConflictCheck.findOne({ _id: checkId, ...ownershipQuery });

    if (!check) {
        throw CustomException('فحص التعارض غير موجود أو غير مصرح لك بالوصول إليه', 404);
    }

    // Update allowed fields
    if (safeData.status) check.status = safeData.status;
    if (safeData.resolution) check.resolution = safeData.resolution;
    if (safeData.notes) check.notes = safeData.notes;
    if (safeData.clearanceNotes) check.clearanceNotes = safeData.clearanceNotes;

    if (safeData.status === 'resolved' || safeData.status === 'waived') {
        check.resolvedAt = new Date();
        check.resolvedBy = lawyerId;
    }

    await check.save();

    res.status(200).json({
        success: true,
        message: 'تم تحديث فحص التعارض بنجاح',
        data: check
    });
});

/**
 * Resolve a specific match
 * POST /api/conflict-checks/:id/matches/:matchIndex/resolve
 */
const resolveMatch = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;

    // Sanitize and validate ObjectId
    const checkId = sanitizeObjectId(req.params.id);
    if (!checkId) {
        throw CustomException('معرف فحص التعارض غير صالح', 400);
    }

    // Validate matchIndex
    const matchIndex = parseInt(req.params.matchIndex, 10);
    if (isNaN(matchIndex) || matchIndex < 0) {
        throw CustomException('فهرس التطابق غير صالح', 400);
    }

    // Mass assignment protection - only allow specific fields
    const allowedFields = ['resolution', 'notes'];
    const safeData = pickAllowedFields(req.body, allowedFields);

    // Input validation for resolution
    const validResolutions = ['cleared', 'flagged', 'waived'];
    if (safeData.resolution && !validResolutions.includes(safeData.resolution)) {
        throw CustomException('حالة الحل غير صالحة', 400);
    }

    // Sanitize notes
    if (safeData.notes) {
        safeData.notes = sanitizeString(safeData.notes);
    }

    // SECURITY: Build query with multi-tenant isolation
    const ownershipQuery = firmId ? { firmId } : { lawyerId };

    // IDOR protection - verify ownership
    const check = await ConflictCheck.findOne({ _id: checkId, ...ownershipQuery });

    if (!check) {
        throw CustomException('فحص التعارض غير موجود أو غير مصرح لك بالوصول إليه', 404);
    }

    // Validate index against actual matches length
    if (matchIndex >= check.matches.length) {
        throw CustomException('فهرس التطابق غير صالح', 400);
    }

    // Update match resolution
    check.matches[matchIndex].resolved = true;
    check.matches[matchIndex].resolution = safeData.resolution;
    check.matches[matchIndex].resolvedAt = new Date();
    check.matches[matchIndex].resolvedBy = lawyerId;
    check.matches[matchIndex].notes = safeData.notes;

    // Check if all matches are resolved
    const allResolved = check.matches.every(m => m.resolved);
    if (allResolved) {
        check.status = 'resolved';
        check.resolvedAt = new Date();
        check.resolvedBy = lawyerId;
    }

    await check.save();

    res.status(200).json({
        success: true,
        message: 'تم حل التطابق بنجاح',
        data: check
    });
});

/**
 * Delete conflict check
 * DELETE /api/conflict-checks/:id
 */
const deleteConflictCheck = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;

    // Sanitize and validate ObjectId
    const checkId = sanitizeObjectId(req.params.id);
    if (!checkId) {
        throw CustomException('معرف فحص التعارض غير صالح', 400);
    }

    // SECURITY: Build query with multi-tenant isolation
    const ownershipQuery = firmId ? { firmId } : { lawyerId };

    // IDOR protection - verify ownership before deletion
    const check = await ConflictCheck.findOneAndDelete({ _id: checkId, ...ownershipQuery });

    if (!check) {
        throw CustomException('فحص التعارض غير موجود أو غير مصرح لك بحذفه', 404);
    }

    res.status(200).json({
        success: true,
        message: 'تم حذف فحص التعارض بنجاح'
    });
});

/**
 * Quick conflict check (simplified)
 * POST /api/conflict-checks/quick
 */
const quickConflictCheck = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;

    // Mass assignment protection - only allow specific fields
    const allowedFields = ['name', 'email', 'phone', 'company'];
    const safeData = pickAllowedFields(req.body, allowedFields);

    // Sanitize and collect search terms
    const searchTerms = [];
    if (safeData.name) searchTerms.push(sanitizeString(safeData.name));
    if (safeData.email) searchTerms.push(sanitizeString(safeData.email).toLowerCase());
    if (safeData.phone) searchTerms.push(sanitizeString(safeData.phone));
    if (safeData.company) searchTerms.push(sanitizeString(safeData.company));

    // Filter out empty strings
    const validSearchTerms = searchTerms.filter(term => term.length > 0);

    if (validSearchTerms.length === 0) {
        throw CustomException('يجب تحديد مصطلح بحث واحد على الأقل', 400);
    }

    // Quick search without creating a record
    const results = [];
    const threshold = 85;

    // SECURITY: Multi-tenant isolation - only search within user's/firm's data
    const ownershipQuery = firmId ? { firmId } : { lawyerId };
    const clients = await Client.find(ownershipQuery).lean();
    for (const client of clients) {
        for (const term of validSearchTerms) {
            const fullName = `${client.firstName || ''} ${client.lastName || ''}`.trim();
            const similarity = Math.max(
                calculateSimilarity(term, fullName),
                calculateSimilarity(term, client.companyName || ''),
                client.email?.toLowerCase() === term.toLowerCase() ? 100 : 0,
                client.phone === term ? 100 : 0
            );

            if (similarity >= threshold) {
                // Sanitize sensitive information in results
                results.push({
                    type: 'client',
                    id: client._id,
                    name: fullName || client.companyName,
                    score: similarity
                });
                break;
            }
        }
    }

    res.status(200).json({
        success: true,
        data: {
            hasConflicts: results.length > 0,
            matches: results
        }
    });
});

/**
 * Get conflict statistics
 * GET /api/conflict-checks/stats
 */
const getConflictStats = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const mongoose = require('mongoose');

    // SECURITY: Build query with multi-tenant isolation
    const ownershipQuery = firmId
        ? { firmId: new mongoose.Types.ObjectId(firmId) }
        : { lawyerId: new mongoose.Types.ObjectId(lawyerId) };

    // SECURITY: Multi-tenant isolation - aggregate only user's/firm's data
    const stats = await ConflictCheck.aggregate([
        { $match: ownershipQuery },
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 }
            }
        }
    ]);

    const countQuery = firmId ? { firmId } : { lawyerId };
    const totalChecks = await ConflictCheck.countDocuments(countQuery);
    const recentChecks = await ConflictCheck.countDocuments({
        ...countQuery,
        createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    });

    res.status(200).json({
        success: true,
        data: {
            byStatus: stats.reduce((acc, s) => {
                acc[s._id] = s.count;
                return acc;
            }, {}),
            totalChecks,
            recentChecks
        }
    });
});

module.exports = {
    runConflictCheck,
    getConflictChecks,
    getConflictCheck,
    updateConflictCheck,
    resolveMatch,
    deleteConflictCheck,
    quickConflictCheck,
    getConflictStats
};
