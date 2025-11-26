const { ConflictCheck, Client, Case, Contact, Organization } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');

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
    const {
        checkType, searchTerms, caseId, clientId,
        includeArchived, threshold
    } = req.body;
    const lawyerId = req.userID;

    if (!searchTerms || searchTerms.length === 0) {
        throw new CustomException('يجب تحديد مصطلحات البحث', 400);
    }

    // Create conflict check record
    const conflictCheck = await ConflictCheck.create({
        lawyerId,
        checkType: checkType || 'new_client',
        searchTerms,
        caseId,
        clientId,
        status: 'running',
        threshold: threshold || 80,
        createdBy: lawyerId
    });

    try {
        const matches = [];
        const searchThreshold = threshold || 80;

        // Build base query
        const baseQuery = { lawyerId };
        if (!includeArchived) {
            baseQuery.isArchived = { $ne: true };
        }

        // Search clients
        const clients = await Client.find(baseQuery).lean();
        for (const client of clients) {
            for (const term of searchTerms) {
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
            for (const term of searchTerms) {
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
            for (const term of searchTerms) {
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
            for (const term of searchTerms) {
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
    const { status, checkType, page = 1, limit = 20 } = req.query;
    const lawyerId = req.userID;

    const query = { lawyerId };
    if (status) query.status = status;
    if (checkType) query.checkType = checkType;

    const checks = await ConflictCheck.find(query)
        .populate('caseId', 'title caseNumber')
        .populate('clientId', 'firstName lastName companyName')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await ConflictCheck.countDocuments(query);

    res.status(200).json({
        success: true,
        data: checks,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
        }
    });
});

/**
 * Get single conflict check
 * GET /api/conflict-checks/:id
 */
const getConflictCheck = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;

    const check = await ConflictCheck.findOne({ _id: id, lawyerId })
        .populate('caseId', 'title caseNumber')
        .populate('clientId', 'firstName lastName companyName')
        .populate('matches.entityId');

    if (!check) {
        throw new CustomException('فحص التعارض غير موجود', 404);
    }

    res.status(200).json({
        success: true,
        data: check
    });
});

/**
 * Update conflict check resolution
 * PATCH /api/conflict-checks/:id
 */
const updateConflictCheck = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status, resolution, notes } = req.body;
    const lawyerId = req.userID;

    const check = await ConflictCheck.findOne({ _id: id, lawyerId });

    if (!check) {
        throw new CustomException('فحص التعارض غير موجود', 404);
    }

    if (status) check.status = status;
    if (resolution) check.resolution = resolution;
    if (notes) check.notes = notes;

    if (status === 'resolved' || status === 'waived') {
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
    const { id, matchIndex } = req.params;
    const { resolution, notes } = req.body;
    const lawyerId = req.userID;

    const check = await ConflictCheck.findOne({ _id: id, lawyerId });

    if (!check) {
        throw new CustomException('فحص التعارض غير موجود', 404);
    }

    const index = parseInt(matchIndex);
    if (index < 0 || index >= check.matches.length) {
        throw new CustomException('فهرس التطابق غير صالح', 400);
    }

    check.matches[index].resolved = true;
    check.matches[index].resolution = resolution;
    check.matches[index].resolvedAt = new Date();
    check.matches[index].resolvedBy = lawyerId;
    check.matches[index].notes = notes;

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
    const { id } = req.params;
    const lawyerId = req.userID;

    const check = await ConflictCheck.findOneAndDelete({ _id: id, lawyerId });

    if (!check) {
        throw new CustomException('فحص التعارض غير موجود', 404);
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
    const { name, email, phone, company } = req.body;
    const lawyerId = req.userID;

    const searchTerms = [name, email, phone, company].filter(Boolean);

    if (searchTerms.length === 0) {
        throw new CustomException('يجب تحديد مصطلح بحث واحد على الأقل', 400);
    }

    // Quick search without creating a record
    const results = [];
    const threshold = 85;

    // Search clients
    const clients = await Client.find({ lawyerId }).lean();
    for (const client of clients) {
        for (const term of searchTerms) {
            const fullName = `${client.firstName || ''} ${client.lastName || ''}`.trim();
            const similarity = Math.max(
                calculateSimilarity(term, fullName),
                calculateSimilarity(term, client.companyName || ''),
                client.email?.toLowerCase() === term.toLowerCase() ? 100 : 0,
                client.phone === term ? 100 : 0
            );

            if (similarity >= threshold) {
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

    const stats = await ConflictCheck.aggregate([
        { $match: { lawyerId: lawyerId } },
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 }
            }
        }
    ]);

    const totalChecks = await ConflictCheck.countDocuments({ lawyerId });
    const recentChecks = await ConflictCheck.countDocuments({
        lawyerId,
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
