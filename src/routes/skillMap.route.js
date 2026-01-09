/**
 * Skill Map Routes
 *
 * Routes for managing employee skill maps at /api/hr/skill-maps
 * Follows enterprise security patterns (OWASP, AWS, Google)
 *
 * Security:
 * - Multi-tenant isolation via req.firmQuery
 * - Mass assignment protection via pickAllowedFields
 * - ID sanitization via sanitizeObjectId
 * - Regex injection prevention via escapeRegex
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const EmployeeSkillMap = require('../models/employeeSkillMap.model');
const Skill = require('../models/skill.model');
const { CustomException } = require('../utils');
const { pickAllowedFields, sanitizeObjectId, sanitizePagination } = require('../utils/securityUtils');

// Helper for regex safety
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Allowed fields for mass assignment protection
const ALLOWED_CREATE_FIELDS = [
    'employeeId',
    'skillId',
    'proficiencyLevel',
    'levelProgress',
    'selfAssessedLevel',
    'selfAssessedProgress',
    'selfConfidence',
    'targetLevel',
    'targetDate',
    'yearsOfExperience',
    'acquiredDate',
    'acquiredMethod',
    'isPrimarySkill',
    'usageFrequency',
    'lastUsedDate',
    'hasCertification',
    'certificationName',
    'certificationNameAr',
    'certificationNumber',
    'certificationBody',
    'certificationBodyAr',
    'certificationDate',
    'certificationExpiry',
    'certificationDocumentUrl',
    'cpdRequired',
    'cpdCreditsRequired',
    'cpdPeriodStart',
    'cpdPeriodEnd',
    'developmentPlan',
    'developmentPlanAr',
    'nextReviewDate',
    'reviewCycle',
    'notes',
    'notesAr',
    'attachments'
];

const ALLOWED_UPDATE_FIELDS = [
    'proficiencyLevel',
    'levelProgress',
    'selfAssessedLevel',
    'selfAssessedProgress',
    'selfConfidence',
    'targetLevel',
    'targetDate',
    'yearsOfExperience',
    'isPrimarySkill',
    'usageFrequency',
    'lastUsedDate',
    'hasCertification',
    'certificationName',
    'certificationNameAr',
    'certificationNumber',
    'certificationBody',
    'certificationBodyAr',
    'certificationDate',
    'certificationExpiry',
    'certificationDocumentUrl',
    'cpdRequired',
    'cpdCreditsRequired',
    'cpdPeriodStart',
    'cpdPeriodEnd',
    'developmentPlan',
    'developmentPlanAr',
    'developmentActions',
    'nextReviewDate',
    'reviewCycle',
    'mentorId',
    'mentorshipStartDate',
    'notes',
    'notesAr',
    'attachments',
    'isActive'
];

// Valid values for enums
const VALID_VERIFICATION_METHODS = [
    'certification', 'test', 'assessment', 'portfolio', 'reference',
    'manager_approval', 'peer_endorsement', 'project_evidence', 'none'
];
const VALID_ACQUIRED_METHODS = ['training', 'education', 'self_taught', 'on_job', 'certification', 'prior_experience'];
const VALID_USAGE_FREQUENCIES = ['daily', 'weekly', 'monthly', 'rarely', 'not_used'];
const VALID_REVIEW_CYCLES = ['monthly', 'quarterly', 'semi_annually', 'annually'];

/**
 * GET /api/hr/skill-maps
 * List all skill maps with filtering and pagination
 */
router.get('/', async (req, res) => {
    try {
        const { employeeId, skillId, isVerified, minLevel, hasCertification, category, isActive } = req.query;
        const { page, limit, skip } = sanitizePagination(req.query, { maxLimit: 100 });

        // Build query with tenant isolation
        const query = { ...req.firmQuery };

        // Filter by employee (sanitize ID)
        if (employeeId) {
            const sanitizedEmployeeId = sanitizeObjectId(employeeId);
            if (!sanitizedEmployeeId) {
                throw CustomException('Invalid employeeId format', 400);
            }
            query.employeeId = sanitizedEmployeeId;
        }

        // Filter by skill (sanitize ID)
        if (skillId) {
            const sanitizedSkillId = sanitizeObjectId(skillId);
            if (!sanitizedSkillId) {
                throw CustomException('Invalid skillId format', 400);
            }
            query.skillId = sanitizedSkillId;
        }

        // Filter by verification status
        if (isVerified !== undefined) {
            query.isVerified = isVerified === 'true';
        }

        // Filter by minimum proficiency level
        if (minLevel) {
            const level = parseInt(minLevel, 10);
            if (!isNaN(level) && level >= 1 && level <= 7) {
                query.proficiencyLevel = { $gte: level };
            }
        }

        // Filter by certification status
        if (hasCertification !== undefined) {
            query.hasCertification = hasCertification === 'true';
            if (hasCertification === 'true') {
                query.isCertificationExpired = false;
            }
        }

        // Filter by active status
        if (isActive !== undefined) {
            query.isActive = isActive === 'true';
        } else {
            query.isActive = true; // Default to active only
        }

        const [skillMaps, total] = await Promise.all([
            EmployeeSkillMap.find(query)
                .populate('employeeId', 'employeeId firstName lastName')
                .populate('skillId', 'name nameAr category proficiencyLevels isCoreSkill')
                .populate('verifiedBy', 'firstName lastName email')
                .populate('mentorId', 'firstName lastName employeeId')
                .skip(skip)
                .limit(limit)
                .sort({ proficiencyLevel: -1, endorsementCount: -1 }),
            EmployeeSkillMap.countDocuments(query)
        ]);

        return res.json({
            success: true,
            count: skillMaps.length,
            data: skillMaps,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/hr/skill-maps/matrix
 * Get skill matrix for department or company
 */
router.get('/matrix', async (req, res) => {
    try {
        const { departmentId } = req.query;
        const sanitizedDepartmentId = departmentId ? sanitizeObjectId(departmentId) : null;

        const firmId = req.firmQuery.firmId || req.firmQuery.lawyerId;
        const matrix = await EmployeeSkillMap.getSkillMatrix(firmId, sanitizedDepartmentId);

        return res.json({
            success: true,
            data: matrix
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/hr/skill-maps/find-by-skill/:skillId
 * Find employees with a specific skill
 */
router.get('/find-by-skill/:skillId', async (req, res) => {
    try {
        const sanitizedSkillId = sanitizeObjectId(req.params.skillId);
        if (!sanitizedSkillId) {
            throw CustomException('Invalid skillId format', 400);
        }

        const { minLevel, isVerified, hasCertification } = req.query;
        const options = {};

        if (minLevel) {
            const level = parseInt(minLevel, 10);
            if (!isNaN(level) && level >= 1 && level <= 7) {
                options.minLevel = level;
            }
        }
        if (isVerified === 'true') options.isVerified = true;
        if (hasCertification === 'true') options.hasCertification = true;

        const firmId = req.firmQuery.firmId || req.firmQuery.lawyerId;
        const employees = await EmployeeSkillMap.findEmployeesWithSkill(firmId, sanitizedSkillId, options);

        return res.json({
            success: true,
            count: employees.length,
            data: employees
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/hr/skill-maps/distribution/:skillId
 * Get skill distribution (level breakdown)
 */
router.get('/distribution/:skillId', async (req, res) => {
    try {
        const sanitizedSkillId = sanitizeObjectId(req.params.skillId);
        if (!sanitizedSkillId) {
            throw CustomException('Invalid skillId format', 400);
        }

        const targetLevel = parseInt(req.query.targetLevel) || 3;
        const firmId = req.firmQuery.firmId || req.firmQuery.lawyerId;
        const distribution = await EmployeeSkillMap.getSkillGapAnalysis(firmId, sanitizedSkillId, targetLevel);

        return res.json({
            success: true,
            data: distribution
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/hr/skill-maps/expiring-certifications
 * Get certifications expiring soon
 */
router.get('/expiring-certifications', async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 30;
        const firmId = req.firmQuery.firmId || req.firmQuery.lawyerId;
        const certifications = await EmployeeSkillMap.getExpiringCertifications(firmId, days);

        return res.json({
            success: true,
            count: certifications.length,
            data: certifications
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/hr/skill-maps/cpd-non-compliant
 * Get skill maps with CPD non-compliance
 */
router.get('/cpd-non-compliant', async (req, res) => {
    try {
        const firmId = req.firmQuery.firmId || req.firmQuery.lawyerId;
        const nonCompliant = await EmployeeSkillMap.getCpdNonCompliant(firmId);

        return res.json({
            success: true,
            count: nonCompliant.length,
            data: nonCompliant
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/hr/skill-maps/needs-review
 * Get skills needing review
 */
router.get('/needs-review', async (req, res) => {
    try {
        const daysPast = parseInt(req.query.daysPast) || 0;
        const firmId = req.firmQuery.firmId || req.firmQuery.lawyerId;
        const needsReview = await EmployeeSkillMap.getSkillsNeedingReview(firmId, daysPast);

        return res.json({
            success: true,
            count: needsReview.length,
            data: needsReview
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/hr/skill-maps/department/:departmentId/summary
 * Get department skill summary
 */
router.get('/department/:departmentId/summary', async (req, res) => {
    try {
        const sanitizedDepartmentId = sanitizeObjectId(req.params.departmentId);
        if (!sanitizedDepartmentId) {
            throw CustomException('Invalid departmentId format', 400);
        }

        const firmId = req.firmQuery.firmId || req.firmQuery.lawyerId;
        const matrix = await EmployeeSkillMap.getSkillMatrix(firmId, sanitizedDepartmentId);

        // Calculate summary statistics
        const summary = {
            totalEmployees: matrix.matrix.length,
            totalSkills: matrix.skills.length,
            coreSkills: matrix.skills.filter(s => s.isCoreSkill).length,
            averageProficiency: matrix.matrix.length > 0
                ? (matrix.matrix.reduce((sum, e) => sum + e.avgProficiency, 0) / matrix.matrix.length).toFixed(2)
                : 0,
            skillsByCategory: matrix.skills.reduce((acc, s) => {
                acc[s.category] = (acc[s.category] || 0) + 1;
                return acc;
            }, {})
        };

        return res.json({
            success: true,
            data: {
                summary,
                matrix
            }
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/hr/skill-maps/department/:departmentId/skill-gaps
 * Analyze skill gaps for a department
 */
router.post('/department/:departmentId/skill-gaps', async (req, res) => {
    try {
        const sanitizedDepartmentId = sanitizeObjectId(req.params.departmentId);
        if (!sanitizedDepartmentId) {
            throw CustomException('Invalid departmentId format', 400);
        }

        const { requiredSkills } = req.body;
        if (!Array.isArray(requiredSkills) || requiredSkills.length === 0) {
            throw CustomException('requiredSkills array is required', 400);
        }

        const firmId = req.firmQuery.firmId || req.firmQuery.lawyerId;
        const gaps = [];

        for (const requirement of requiredSkills) {
            const sanitizedSkillId = sanitizeObjectId(requirement.skillId);
            if (!sanitizedSkillId) continue;

            const targetLevel = requirement.targetLevel || 3;
            const analysis = await EmployeeSkillMap.getSkillGapAnalysis(firmId, sanitizedSkillId, targetLevel);

            gaps.push({
                skillId: sanitizedSkillId,
                skillName: requirement.skillName,
                targetLevel,
                ...analysis
            });
        }

        return res.json({
            success: true,
            data: gaps
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/hr/skill-maps/compare
 * Compare skills between employees
 */
router.post('/compare', async (req, res) => {
    try {
        const { employeeIds } = req.body;

        if (!Array.isArray(employeeIds) || employeeIds.length < 2) {
            throw CustomException('At least 2 employee IDs are required', 400);
        }

        if (employeeIds.length > 10) {
            throw CustomException('Maximum 10 employees per comparison', 400);
        }

        const sanitizedIds = employeeIds.map(id => sanitizeObjectId(id)).filter(Boolean);

        const skillMaps = await EmployeeSkillMap.find({
            ...req.firmQuery,
            employeeId: { $in: sanitizedIds },
            isActive: true
        })
            .populate('employeeId', 'employeeId firstName lastName')
            .populate('skillId', 'name nameAr category')
            .lean();

        // Group by employee
        const byEmployee = {};
        for (const map of skillMaps) {
            const empId = map.employeeId._id.toString();
            if (!byEmployee[empId]) {
                byEmployee[empId] = {
                    employee: map.employeeId,
                    skills: []
                };
            }
            byEmployee[empId].skills.push({
                skillId: map.skillId._id,
                skillName: map.skillId.name,
                category: map.skillId.category,
                proficiencyLevel: map.proficiencyLevel,
                effectiveProficiency: map.effectiveProficiency,
                isVerified: map.isVerified,
                hasCertification: map.hasCertification
            });
        }

        return res.json({
            success: true,
            data: Object.values(byEmployee)
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/hr/skill-maps/:employeeId
 * Get all skills for an employee
 */
router.get('/:employeeId', async (req, res) => {
    try {
        const sanitizedEmployeeId = sanitizeObjectId(req.params.employeeId);
        if (!sanitizedEmployeeId) {
            throw CustomException('Invalid employeeId format', 400);
        }

        const firmId = req.firmQuery.firmId || req.firmQuery.lawyerId;
        const skills = await EmployeeSkillMap.getEmployeeSkills(firmId, sanitizedEmployeeId);

        return res.json({
            success: true,
            count: skills.length,
            data: skills
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/hr/skill-maps/:employeeId/training-recommendations
 * Get training recommendations for an employee
 */
router.get('/:employeeId/training-recommendations', async (req, res) => {
    try {
        const sanitizedEmployeeId = sanitizeObjectId(req.params.employeeId);
        if (!sanitizedEmployeeId) {
            throw CustomException('Invalid employeeId format', 400);
        }

        // Get skills with gaps
        const skillMaps = await EmployeeSkillMap.find({
            ...req.firmQuery,
            employeeId: sanitizedEmployeeId,
            isActive: true,
            targetLevel: { $exists: true }
        })
            .populate('skillId', 'name nameAr category')
            .lean();

        // Filter skills below target level
        const recommendations = skillMaps
            .filter(sm => sm.proficiencyLevel < sm.targetLevel)
            .map(sm => ({
                skillId: sm.skillId._id,
                skillName: sm.skillId.name,
                category: sm.skillId.category,
                currentLevel: sm.proficiencyLevel,
                targetLevel: sm.targetLevel,
                gap: sm.gap,
                developmentPlan: sm.developmentPlan,
                developmentActions: sm.developmentActions?.filter(a => a.status !== 'completed') || [],
                learningProgress: sm.learningProgress || [],
                priority: sm.gap >= 2 ? 'high' : sm.gap === 1 ? 'medium' : 'low'
            }))
            .sort((a, b) => b.gap - a.gap);

        return res.json({
            success: true,
            count: recommendations.length,
            data: recommendations
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/hr/skill-maps/:employeeId/skill-gaps
 * Analyze skill gaps for an employee
 */
router.post('/:employeeId/skill-gaps', async (req, res) => {
    try {
        const sanitizedEmployeeId = sanitizeObjectId(req.params.employeeId);
        if (!sanitizedEmployeeId) {
            throw CustomException('Invalid employeeId format', 400);
        }

        const { requiredSkills } = req.body;
        if (!Array.isArray(requiredSkills)) {
            throw CustomException('requiredSkills array is required', 400);
        }

        // Get employee's current skills
        const employeeSkills = await EmployeeSkillMap.find({
            ...req.firmQuery,
            employeeId: sanitizedEmployeeId,
            isActive: true
        }).lean();

        const skillsMap = {};
        for (const skill of employeeSkills) {
            skillsMap[skill.skillId.toString()] = skill;
        }

        const gaps = requiredSkills.map(req => {
            const sanitizedSkillId = sanitizeObjectId(req.skillId);
            const current = sanitizedSkillId ? skillsMap[sanitizedSkillId] : null;

            return {
                skillId: req.skillId,
                skillName: req.skillName,
                requiredLevel: req.requiredLevel || 3,
                currentLevel: current?.proficiencyLevel || 0,
                gap: (req.requiredLevel || 3) - (current?.proficiencyLevel || 0),
                hasSkill: !!current,
                isVerified: current?.isVerified || false,
                hasCertification: current?.hasCertification || false
            };
        });

        return res.json({
            success: true,
            data: gaps.sort((a, b) => b.gap - a.gap)
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * PUT /api/hr/skill-maps/:employeeId/skills
 * Bulk update/replace skills for an employee
 */
router.put('/:employeeId/skills', async (req, res) => {
    try {
        const sanitizedEmployeeId = sanitizeObjectId(req.params.employeeId);
        if (!sanitizedEmployeeId) {
            throw CustomException('Invalid employeeId format', 400);
        }

        const { skills } = req.body;
        if (!Array.isArray(skills)) {
            throw CustomException('skills array is required', 400);
        }

        if (skills.length > 100) {
            throw CustomException('Maximum 100 skills per update', 400);
        }

        const results = [];
        const errors = [];

        for (let i = 0; i < skills.length; i++) {
            try {
                const skillData = skills[i];
                const sanitizedSkillId = sanitizeObjectId(skillData.skillId);
                if (!sanitizedSkillId) {
                    throw new Error('Invalid skillId');
                }

                const allowedFields = pickAllowedFields(skillData, ALLOWED_CREATE_FIELDS);

                // Upsert skill map
                const skillMap = await EmployeeSkillMap.findOneAndUpdate(
                    {
                        ...req.firmQuery,
                        employeeId: sanitizedEmployeeId,
                        skillId: sanitizedSkillId
                    },
                    {
                        $set: {
                            ...allowedFields,
                            employeeId: sanitizedEmployeeId,
                            skillId: sanitizedSkillId,
                            ...req.addFirmId({}),
                            updatedBy: req.userID
                        },
                        $setOnInsert: {
                            createdBy: req.userID
                        }
                    },
                    { new: true, upsert: true }
                );

                results.push({ index: i, success: true, data: skillMap });
            } catch (error) {
                errors.push({ index: i, success: false, error: error.message });
            }
        }

        return res.json({
            success: true,
            message: `Updated ${results.length} skills, ${errors.length} failed`,
            data: { updated: results, errors }
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/hr/skill-maps/:employeeId/skills
 * Add a new skill for an employee
 */
router.post('/:employeeId/skills', async (req, res) => {
    try {
        const sanitizedEmployeeId = sanitizeObjectId(req.params.employeeId);
        if (!sanitizedEmployeeId) {
            throw CustomException('Invalid employeeId format', 400);
        }

        // Mass assignment protection
        const allowedFields = pickAllowedFields(req.body, ALLOWED_CREATE_FIELDS);

        // Validate required fields
        if (!allowedFields.skillId) {
            throw CustomException('Skill is required', 400);
        }

        const sanitizedSkillId = sanitizeObjectId(allowedFields.skillId);
        if (!sanitizedSkillId) {
            throw CustomException('Invalid skillId format', 400);
        }

        // Check if skill already exists for employee
        const existing = await EmployeeSkillMap.findOne({
            ...req.firmQuery,
            employeeId: sanitizedEmployeeId,
            skillId: sanitizedSkillId
        });

        if (existing) {
            throw CustomException('Skill already mapped to this employee', 400);
        }

        // Create skill map
        const skillMap = await EmployeeSkillMap.create(req.addFirmId({
            ...allowedFields,
            employeeId: sanitizedEmployeeId,
            skillId: sanitizedSkillId,
            createdBy: req.userID
        }));

        const populated = await EmployeeSkillMap.findOne({
            _id: skillMap._id,
            ...req.firmQuery
        })
            .populate('skillId', 'name nameAr category')
            .populate('employeeId', 'employeeId firstName lastName');

        return res.status(201).json({
            success: true,
            message: 'Skill added successfully',
            data: populated
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * PATCH /api/hr/skill-maps/:employeeId/skills/:skillId
 * Update a specific skill for an employee
 */
router.patch('/:employeeId/skills/:skillId', async (req, res) => {
    try {
        const sanitizedEmployeeId = sanitizeObjectId(req.params.employeeId);
        const sanitizedSkillId = sanitizeObjectId(req.params.skillId);

        if (!sanitizedEmployeeId) {
            throw CustomException('Invalid employeeId format', 400);
        }
        if (!sanitizedSkillId) {
            throw CustomException('Invalid skillId format', 400);
        }

        // Mass assignment protection
        const allowedFields = pickAllowedFields(req.body, ALLOWED_UPDATE_FIELDS);

        const skillMap = await EmployeeSkillMap.findOneAndUpdate(
            {
                ...req.firmQuery,
                employeeId: sanitizedEmployeeId,
                skillId: sanitizedSkillId
            },
            {
                $set: {
                    ...allowedFields,
                    updatedBy: req.userID,
                    updatedAt: new Date()
                }
            },
            { new: true }
        )
            .populate('skillId', 'name nameAr category')
            .populate('employeeId', 'employeeId firstName lastName');

        if (!skillMap) {
            throw CustomException('Skill mapping not found', 404);
        }

        return res.json({
            success: true,
            message: 'Skill updated successfully',
            data: skillMap
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * DELETE /api/hr/skill-maps/:employeeId/skills/:skillId
 * Remove a skill from an employee
 */
router.delete('/:employeeId/skills/:skillId', async (req, res) => {
    try {
        const sanitizedEmployeeId = sanitizeObjectId(req.params.employeeId);
        const sanitizedSkillId = sanitizeObjectId(req.params.skillId);

        if (!sanitizedEmployeeId) {
            throw CustomException('Invalid employeeId format', 400);
        }
        if (!sanitizedSkillId) {
            throw CustomException('Invalid skillId format', 400);
        }

        const result = await EmployeeSkillMap.findOneAndDelete({
            ...req.firmQuery,
            employeeId: sanitizedEmployeeId,
            skillId: sanitizedSkillId
        });

        if (!result) {
            throw CustomException('Skill mapping not found', 404);
        }

        return res.json({
            success: true,
            message: 'Skill removed successfully'
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/hr/skill-maps/:employeeId/skills/:skillId/evaluate
 * Record skill evaluation/assessment
 */
router.post('/:employeeId/skills/:skillId/evaluate', async (req, res) => {
    try {
        const sanitizedEmployeeId = sanitizeObjectId(req.params.employeeId);
        const sanitizedSkillId = sanitizeObjectId(req.params.skillId);

        if (!sanitizedEmployeeId) {
            throw CustomException('Invalid employeeId format', 400);
        }
        if (!sanitizedSkillId) {
            throw CustomException('Invalid skillId format', 400);
        }

        const { level, progress, reason, evaluationType } = req.body;

        if (typeof level !== 'number' || level < 1 || level > 7) {
            throw CustomException('Level must be between 1 and 7', 400);
        }

        const levelProgress = typeof progress === 'number' ? Math.min(100, Math.max(0, progress)) : 0;

        const skillMap = await EmployeeSkillMap.findOne({
            ...req.firmQuery,
            employeeId: sanitizedEmployeeId,
            skillId: sanitizedSkillId
        });

        if (!skillMap) {
            throw CustomException('Skill mapping not found', 404);
        }

        // Update based on evaluation type
        if (evaluationType === 'self') {
            skillMap.selfAssessedLevel = level;
            skillMap.selfAssessedProgress = levelProgress;
            skillMap.selfAssessedAt = new Date();
        } else if (evaluationType === 'manager') {
            skillMap.managerAssessedLevel = level;
            skillMap.managerAssessedProgress = levelProgress;
            skillMap.managerAssessedBy = req.userID;
            skillMap.managerAssessedAt = new Date();
        } else {
            // Default: update actual proficiency
            await skillMap.updateProficiency(level, levelProgress, reason || 'Evaluation', req.userID);
            return res.json({
                success: true,
                message: 'Skill evaluated successfully',
                data: skillMap
            });
        }

        skillMap.updatedBy = req.userID;
        await skillMap.save();

        return res.json({
            success: true,
            message: 'Skill evaluation recorded',
            data: skillMap
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/hr/skill-maps/:employeeId/skills/:skillId/verify
 * Verify a skill with evidence
 */
router.post('/:employeeId/skills/:skillId/verify', async (req, res) => {
    try {
        const sanitizedEmployeeId = sanitizeObjectId(req.params.employeeId);
        const sanitizedSkillId = sanitizeObjectId(req.params.skillId);

        if (!sanitizedEmployeeId) {
            throw CustomException('Invalid employeeId format', 400);
        }
        if (!sanitizedSkillId) {
            throw CustomException('Invalid skillId format', 400);
        }

        const { method, details, evidenceUrl, certification } = req.body;

        if (!VALID_VERIFICATION_METHODS.includes(method)) {
            throw CustomException('Invalid verification method', 400);
        }

        const skillMap = await EmployeeSkillMap.findOne({
            ...req.firmQuery,
            employeeId: sanitizedEmployeeId,
            skillId: sanitizedSkillId
        });

        if (!skillMap) {
            throw CustomException('Skill mapping not found', 404);
        }

        await skillMap.verify({
            method,
            details,
            evidenceUrl,
            certification
        }, req.userID);

        return res.json({
            success: true,
            message: 'Skill verified successfully',
            data: skillMap
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/hr/skill-maps/:employeeId/skills/:skillId/cpd
 * Add CPD record for a skill
 */
router.post('/:employeeId/skills/:skillId/cpd', async (req, res) => {
    try {
        const sanitizedEmployeeId = sanitizeObjectId(req.params.employeeId);
        const sanitizedSkillId = sanitizeObjectId(req.params.skillId);

        if (!sanitizedEmployeeId) {
            throw CustomException('Invalid employeeId format', 400);
        }
        if (!sanitizedSkillId) {
            throw CustomException('Invalid skillId format', 400);
        }

        const cpdData = pickAllowedFields(req.body, [
            'activityType',
            'activityName',
            'activityNameAr',
            'provider',
            'providerAr',
            'startDate',
            'endDate',
            'credits',
            'verificationUrl',
            'certificateUrl',
            'description'
        ]);

        if (!cpdData.activityType || !cpdData.activityName || typeof cpdData.credits !== 'number') {
            throw CustomException('Activity type, name, and credits are required', 400);
        }

        const skillMap = await EmployeeSkillMap.findOne({
            ...req.firmQuery,
            employeeId: sanitizedEmployeeId,
            skillId: sanitizedSkillId
        });

        if (!skillMap) {
            throw CustomException('Skill mapping not found', 404);
        }

        await skillMap.addCpdRecord(cpdData, req.userID);

        return res.json({
            success: true,
            message: 'CPD record added successfully',
            data: skillMap
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/hr/skill-maps/:employeeId/skills/:skillId/endorse
 * Add endorsement for a skill
 */
router.post('/:employeeId/skills/:skillId/endorse', async (req, res) => {
    try {
        const sanitizedEmployeeId = sanitizeObjectId(req.params.employeeId);
        const sanitizedSkillId = sanitizeObjectId(req.params.skillId);

        if (!sanitizedEmployeeId) {
            throw CustomException('Invalid employeeId format', 400);
        }
        if (!sanitizedSkillId) {
            throw CustomException('Invalid skillId format', 400);
        }

        const { relationship, comment } = req.body;

        const skillMap = await EmployeeSkillMap.findOne({
            ...req.firmQuery,
            employeeId: sanitizedEmployeeId,
            skillId: sanitizedSkillId
        });

        if (!skillMap) {
            throw CustomException('Skill mapping not found', 404);
        }

        // Get endorser info from req (in production, would fetch from user service)
        const endorserInfo = {
            name: req.userName || 'User',
            role: req.userRole || 'User'
        };

        await skillMap.addEndorsement({
            endorsedBy: req.userID,
            relationship: relationship || 'peer',
            comment
        }, endorserInfo);

        return res.json({
            success: true,
            message: 'Endorsement added successfully',
            data: skillMap
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/hr/skill-maps/:employeeId/trainings
 * Add training record for an employee's skill development
 */
router.post('/:employeeId/trainings', async (req, res) => {
    try {
        const sanitizedEmployeeId = sanitizeObjectId(req.params.employeeId);
        if (!sanitizedEmployeeId) {
            throw CustomException('Invalid employeeId format', 400);
        }

        const trainingData = pickAllowedFields(req.body, [
            'skillId',
            'trainingName',
            'provider',
            'startDate',
            'endDate',
            'status',
            'notes'
        ]);

        if (!trainingData.skillId || !trainingData.trainingName) {
            throw CustomException('Skill ID and training name are required', 400);
        }

        const sanitizedSkillId = sanitizeObjectId(trainingData.skillId);
        if (!sanitizedSkillId) {
            throw CustomException('Invalid skillId format', 400);
        }

        const skillMap = await EmployeeSkillMap.findOne({
            ...req.firmQuery,
            employeeId: sanitizedEmployeeId,
            skillId: sanitizedSkillId
        });

        if (!skillMap) {
            throw CustomException('Skill mapping not found', 404);
        }

        // Add to learning progress
        skillMap.learningProgress.push({
            resourceType: 'course',
            resourceName: trainingData.trainingName,
            provider: trainingData.provider,
            status: trainingData.status || 'in_progress',
            startedAt: trainingData.startDate || new Date(),
            completedAt: trainingData.status === 'completed' ? (trainingData.endDate || new Date()) : null,
            notes: trainingData.notes
        });

        skillMap.updatedBy = req.userID;
        await skillMap.save();

        return res.status(201).json({
            success: true,
            message: 'Training record added successfully',
            data: skillMap
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/hr/skill-maps/:employeeId/skills/:skillId/trends
 * Get skill proficiency trends over time
 */
router.get('/:employeeId/skills/:skillId/trends', async (req, res) => {
    try {
        const sanitizedEmployeeId = sanitizeObjectId(req.params.employeeId);
        const sanitizedSkillId = sanitizeObjectId(req.params.skillId);

        if (!sanitizedEmployeeId) {
            throw CustomException('Invalid employeeId format', 400);
        }
        if (!sanitizedSkillId) {
            throw CustomException('Invalid skillId format', 400);
        }

        const skillMap = await EmployeeSkillMap.findOne({
            ...req.firmQuery,
            employeeId: sanitizedEmployeeId,
            skillId: sanitizedSkillId
        })
            .populate('skillId', 'name nameAr category')
            .lean();

        if (!skillMap) {
            throw CustomException('Skill mapping not found', 404);
        }

        // Extract trends from skill history
        const trends = (skillMap.skillHistory || [])
            .filter(h => h.changeType === 'level_change')
            .map(h => ({
                date: h.date,
                fromLevel: h.fromLevel,
                toLevel: h.toLevel,
                fromProgress: h.fromProgress,
                toProgress: h.toProgress,
                reason: h.reason
            }))
            .sort((a, b) => new Date(a.date) - new Date(b.date));

        return res.json({
            success: true,
            data: {
                skillId: skillMap.skillId._id,
                skillName: skillMap.skillId.name,
                currentLevel: skillMap.proficiencyLevel,
                currentProgress: skillMap.levelProgress,
                trend: skillMap.trend,
                history: trends
            }
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/hr/skill-maps/matrix/export
 * Export skill matrix as CSV
 */
router.get('/matrix/export', async (req, res) => {
    try {
        const { departmentId, format } = req.query;
        const sanitizedDepartmentId = departmentId ? sanitizeObjectId(departmentId) : null;

        const firmId = req.firmQuery.firmId || req.firmQuery.lawyerId;
        const matrix = await EmployeeSkillMap.getSkillMatrix(firmId, sanitizedDepartmentId);

        if (format === 'json') {
            return res.json({
                success: true,
                data: matrix
            });
        }

        // Generate CSV
        const skills = matrix.skills;
        const headers = ['Employee ID', 'Employee Name', ...skills.map(s => s.name), 'Average'];
        const rows = matrix.matrix.map(row => [
            row.employee.employeeId,
            row.employee.name,
            ...skills.map(s => {
                const skill = row.skills[s._id.toString()];
                return skill ? skill.level.toString() : '0';
            }),
            row.avgProficiency.toString()
        ]);

        const csv = [
            headers.join(','),
            ...rows.map(r => r.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=skill-matrix.csv');
        return res.send(csv);
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/hr/skill-maps/skill-gaps/export
 * Export skill gap analysis as CSV
 */
router.get('/skill-gaps/export', async (req, res) => {
    try {
        const { departmentId, targetLevel, format } = req.query;
        const sanitizedDepartmentId = departmentId ? sanitizeObjectId(departmentId) : null;
        const targetLevelNum = parseInt(targetLevel) || 3;

        const firmId = req.firmQuery.firmId || req.firmQuery.lawyerId;

        // Get all skills and analyze gaps
        const Skill = require('../models/skill.model');
        const skills = await Skill.find({
            firmId,
            isActive: true
        }).lean();

        const gaps = [];
        for (const skill of skills) {
            const analysis = await EmployeeSkillMap.getSkillGapAnalysis(firmId, skill._id, targetLevelNum);
            gaps.push({
                skillId: skill._id,
                skillName: skill.name,
                category: skill.category,
                targetLevel: targetLevelNum,
                ...analysis
            });
        }

        if (format === 'json') {
            return res.json({
                success: true,
                data: gaps
            });
        }

        // Generate CSV
        const headers = ['Skill Name', 'Category', 'Target Level', 'Below Target', 'At/Above Target', 'Gap %'];
        const rows = gaps.map(g => [
            g.skillName,
            g.category,
            g.targetLevel.toString(),
            g.belowTarget.toString(),
            g.atOrAboveTarget.toString(),
            g.gapPercentage.toString()
        ]);

        const csv = [
            headers.join(','),
            ...rows.map(r => r.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=skill-gaps.csv');
        return res.send(csv);
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/hr/skill-maps/bulk-update
 * Bulk update skill maps
 */
router.post('/bulk-update', async (req, res) => {
    try {
        const { updates } = req.body;

        if (!Array.isArray(updates) || updates.length === 0) {
            throw CustomException('Array of updates is required', 400);
        }

        if (updates.length > 100) {
            throw CustomException('Maximum 100 updates per request', 400);
        }

        const results = [];
        const errors = [];

        for (let i = 0; i < updates.length; i++) {
            try {
                const update = updates[i];

                const sanitizedEmployeeId = sanitizeObjectId(update.employeeId);
                const sanitizedSkillId = sanitizeObjectId(update.skillId);

                if (!sanitizedEmployeeId || !sanitizedSkillId) {
                    throw new Error('Invalid employeeId or skillId');
                }

                const allowedFields = pickAllowedFields(update, ALLOWED_UPDATE_FIELDS);

                const skillMap = await EmployeeSkillMap.findOneAndUpdate(
                    {
                        ...req.firmQuery,
                        employeeId: sanitizedEmployeeId,
                        skillId: sanitizedSkillId
                    },
                    {
                        $set: {
                            ...allowedFields,
                            updatedBy: req.userID,
                            updatedAt: new Date()
                        }
                    },
                    { new: true }
                );

                if (!skillMap) {
                    throw new Error('Skill mapping not found');
                }

                results.push({ index: i, success: true, data: skillMap });
            } catch (error) {
                errors.push({ index: i, success: false, error: error.message });
            }
        }

        return res.json({
            success: true,
            message: `Updated ${results.length} skill maps, ${errors.length} failed`,
            data: { updated: results, errors }
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

module.exports = router;
