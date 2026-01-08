/**
 * Skill Matrix & Competency Tracking Controller
 *
 * Enterprise-grade skill management inspired by:
 * - SAP SuccessFactors Competency Matrix
 * - Workday Skills Cloud
 * - LinkedIn Skills Insights
 * - BambooHR Skills Tracking
 *
 * Features:
 * - Skill CRUD with categories
 * - Employee skill assignment with proficiency levels
 * - Skill gap analysis
 * - Team skill matrix view
 * - Competency assessment
 * - Skill verification & endorsements
 * - Training recommendations
 */

const mongoose = require('mongoose');
const { Skill, SkillType, Competency, SkillAssessment, SFIA_LEVELS } = require('../models/skill.model');
const EmployeeSkillMap = require('../models/employeeSkillMap.model');
const Employee = require('../models/employee.model');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');
const logger = require('../utils/logger');

// Helper function to escape regex special characters (ReDoS protection)
const escapeRegex = (str) => {
    if (!str || typeof str !== 'string') return '';
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

// ═══════════════════════════════════════════════════════════════
// SKILL CRUD
// ═══════════════════════════════════════════════════════════════

/**
 * Get all skills with filtering
 * GET /api/hr/skills
 */
const getSkills = async (req, res) => {
    try {
        const {
            category,
            isVerifiable,
            isActive,
            search,
            page = 1,
            limit = 50,
            sortBy = 'name',
            sortOrder = 'asc'
        } = req.query;

        // Input validation
        const pageNum = Math.max(1, parseInt(page) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 50));

        const query = { ...req.firmQuery };

        if (category) query.category = category;
        if (isVerifiable !== undefined) query.isVerifiable = isVerifiable === 'true';
        if (isActive !== undefined) query.isActive = isActive === 'true';

        if (search) {
            const escapedSearch = escapeRegex(search);
            query.$or = [
                { name: { $regex: escapedSearch, $options: 'i' } },
                { nameAr: { $regex: escapedSearch, $options: 'i' } },
                { description: { $regex: escapedSearch, $options: 'i' } }
            ];
        }

        const sortOptions = {};
        sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

        const [skills, total] = await Promise.all([
            Skill.find(query)
                .sort(sortOptions)
                .skip((pageNum - 1) * limitNum)
                .limit(limitNum)
                .lean(),
            Skill.countDocuments(query)
        ]);

        res.json({
            success: true,
            data: skills,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                pages: Math.ceil(total / limitNum)
            }
        });
    } catch (error) {
        logger.error('Error fetching skills:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في جلب المهارات / Error fetching skills',
            error: error.message
        });
    }
};

/**
 * Get single skill
 * GET /api/hr/skills/:id
 */
const getSkillById = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            return res.status(400).json({
                success: false,
                message: 'معرف المهارة غير صالح / Invalid skill ID'
            });
        }

        const skill = await Skill.findOne({
            _id: sanitizedId,
            ...req.firmQuery
        }).populate('relatedTrainings', 'name nameAr duration');

        if (!skill) {
            return res.status(404).json({
                success: false,
                message: 'المهارة غير موجودة / Skill not found'
            });
        }

        res.json({
            success: true,
            data: skill
        });
    } catch (error) {
        logger.error('Error fetching skill:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في جلب المهارة / Error fetching skill',
            error: error.message
        });
    }
};

/**
 * Create skill
 * POST /api/hr/skills
 */
const createSkill = async (req, res) => {
    try {
        const allowedFields = [
            'name', 'nameAr', 'description', 'category', 'subcategory',
            'proficiencyLevels', 'isVerifiable', 'verificationMethod',
            'relatedTrainings', 'isActive'
        ];
        const safeData = pickAllowedFields(req.body, allowedFields);

        // Validate required fields
        if (!safeData.name || !safeData.category) {
            return res.status(400).json({
                success: false,
                message: 'الاسم والفئة مطلوبان / Name and category are required'
            });
        }

        // Check for duplicate skill name
        const existingSkill = await Skill.findOne({
            ...req.firmQuery,
            name: { $regex: `^${escapeRegex(safeData.name)}$`, $options: 'i' }
        });

        if (existingSkill) {
            return res.status(400).json({
                success: false,
                message: 'مهارة بهذا الاسم موجودة بالفعل / Skill with this name already exists'
            });
        }

        const skill = new Skill(req.addFirmId({
            ...safeData,
            createdBy: req.userID
        }));

        await skill.save();

        res.status(201).json({
            success: true,
            message: 'تم إنشاء المهارة بنجاح / Skill created successfully',
            data: skill
        });
    } catch (error) {
        logger.error('Error creating skill:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في إنشاء المهارة / Error creating skill',
            error: error.message
        });
    }
};

/**
 * Update skill
 * PATCH /api/hr/skills/:id
 */
const updateSkill = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            return res.status(400).json({
                success: false,
                message: 'معرف المهارة غير صالح / Invalid skill ID'
            });
        }

        const allowedFields = [
            'name', 'nameAr', 'description', 'category', 'subcategory',
            'proficiencyLevels', 'isVerifiable', 'verificationMethod',
            'relatedTrainings', 'isActive'
        ];
        const safeData = pickAllowedFields(req.body, allowedFields);

        const skill = await Skill.findOneAndUpdate(
            { _id: sanitizedId, ...req.firmQuery },
            {
                $set: {
                    ...safeData,
                    updatedBy: req.userID
                }
            },
            { new: true, runValidators: true }
        );

        if (!skill) {
            return res.status(404).json({
                success: false,
                message: 'المهارة غير موجودة / Skill not found'
            });
        }

        res.json({
            success: true,
            message: 'تم تحديث المهارة بنجاح / Skill updated successfully',
            data: skill
        });
    } catch (error) {
        logger.error('Error updating skill:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في تحديث المهارة / Error updating skill',
            error: error.message
        });
    }
};

/**
 * Delete skill (soft delete)
 * DELETE /api/hr/skills/:id
 */
const deleteSkill = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            return res.status(400).json({
                success: false,
                message: 'معرف المهارة غير صالح / Invalid skill ID'
            });
        }

        // Check if skill is assigned to employees
        const employeeCount = await Employee.countDocuments({
            ...req.firmQuery,
            'skills.skillId': sanitizedId
        });

        if (employeeCount > 0) {
            // Soft delete - just deactivate
            await Skill.findOneAndUpdate(
                { _id: sanitizedId, ...req.firmQuery },
                { $set: { isActive: false, updatedBy: req.userID } }
            );

            return res.json({
                success: true,
                message: `المهارة مخصصة لـ ${employeeCount} موظف(ين). تم إلغاء تفعيلها / Skill is assigned to ${employeeCount} employee(s). It has been deactivated`
            });
        }

        const skill = await Skill.findOneAndDelete({
            _id: sanitizedId,
            ...req.firmQuery
        });

        if (!skill) {
            return res.status(404).json({
                success: false,
                message: 'المهارة غير موجودة / Skill not found'
            });
        }

        res.json({
            success: true,
            message: 'تم حذف المهارة بنجاح / Skill deleted successfully'
        });
    } catch (error) {
        logger.error('Error deleting skill:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في حذف المهارة / Error deleting skill',
            error: error.message
        });
    }
};

/**
 * Get skills by category
 * GET /api/hr/skills/by-category
 */
const getSkillsByCategory = async (req, res) => {
    try {
        const match = { ...req.firmQuery, isActive: true };

        // Convert string firmId/lawyerId to ObjectId for aggregation
        if (match.firmId && typeof match.firmId === 'string') {
            match.firmId = new mongoose.Types.ObjectId(match.firmId);
        }
        if (match.lawyerId && typeof match.lawyerId === 'string') {
            match.lawyerId = new mongoose.Types.ObjectId(match.lawyerId);
        }

        const skillsByCategory = await Skill.aggregate([
            { $match: match },
            {
                $group: {
                    _id: '$category',
                    skills: {
                        $push: {
                            _id: '$_id',
                            skillId: '$skillId',
                            name: '$name',
                            nameAr: '$nameAr',
                            isVerifiable: '$isVerifiable'
                        }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        const categoryLabels = {
            technical: { en: 'Technical', ar: 'تقنية' },
            legal: { en: 'Legal', ar: 'قانونية' },
            language: { en: 'Language', ar: 'لغات' },
            software: { en: 'Software', ar: 'برمجيات' },
            management: { en: 'Management', ar: 'إدارية' },
            communication: { en: 'Communication', ar: 'تواصل' },
            analytical: { en: 'Analytical', ar: 'تحليلية' },
            interpersonal: { en: 'Interpersonal', ar: 'شخصية' },
            industry_specific: { en: 'Industry Specific', ar: 'تخصصية' },
            certification: { en: 'Certification', ar: 'شهادات' },
            other: { en: 'Other', ar: 'أخرى' }
        };

        const enrichedCategories = skillsByCategory.map(cat => ({
            category: cat._id,
            categoryLabel: categoryLabels[cat._id]?.en || cat._id,
            categoryLabelAr: categoryLabels[cat._id]?.ar || cat._id,
            skills: cat.skills,
            count: cat.count
        }));

        res.json({
            success: true,
            data: enrichedCategories
        });
    } catch (error) {
        logger.error('Error fetching skills by category:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في جلب المهارات حسب الفئة / Error fetching skills by category',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// EMPLOYEE SKILL ASSIGNMENT
// ═══════════════════════════════════════════════════════════════

/**
 * Assign skill to employee
 * POST /api/hr/skills/assign
 */
const assignSkillToEmployee = async (req, res) => {
    try {
        const allowedFields = [
            'employeeId', 'skillId', 'proficiencyLevel', 'yearsOfExperience',
            'certificationDate', 'expiryDate', 'notes', 'verified', 'verifiedBy',
            'endorsements'
        ];
        const safeData = pickAllowedFields(req.body, allowedFields);

        const sanitizedEmployeeId = sanitizeObjectId(safeData.employeeId);
        const sanitizedSkillId = sanitizeObjectId(safeData.skillId);

        if (!sanitizedEmployeeId || !sanitizedSkillId) {
            return res.status(400).json({
                success: false,
                message: 'معرفات الموظف والمهارة مطلوبة / Employee and skill IDs are required'
            });
        }

        // Verify employee exists
        const employee = await Employee.findOne({
            _id: sanitizedEmployeeId,
            ...req.firmQuery
        });

        if (!employee) {
            return res.status(404).json({
                success: false,
                message: 'الموظف غير موجود / Employee not found'
            });
        }

        // Verify skill exists
        const skill = await Skill.findOne({
            _id: sanitizedSkillId,
            ...req.firmQuery
        });

        if (!skill) {
            return res.status(404).json({
                success: false,
                message: 'المهارة غير موجودة / Skill not found'
            });
        }

        // Validate proficiency level (1-5)
        const proficiencyLevel = parseInt(safeData.proficiencyLevel) || 1;
        if (proficiencyLevel < 1 || proficiencyLevel > 5) {
            return res.status(400).json({
                success: false,
                message: 'مستوى الإتقان يجب أن يكون بين 1 و 5 / Proficiency level must be between 1 and 5'
            });
        }

        // Check if skill already assigned
        const existingSkillIndex = employee.skills?.findIndex(
            s => s.skillId?.toString() === sanitizedSkillId.toString()
        );

        const skillData = {
            skillId: sanitizedSkillId,
            skillName: skill.name,
            skillNameAr: skill.nameAr,
            category: skill.category,
            proficiencyLevel,
            yearsOfExperience: parseFloat(safeData.yearsOfExperience) || 0,
            certificationDate: safeData.certificationDate ? new Date(safeData.certificationDate) : null,
            expiryDate: safeData.expiryDate ? new Date(safeData.expiryDate) : null,
            verified: safeData.verified || false,
            verifiedBy: safeData.verified ? req.userID : null,
            verifiedDate: safeData.verified ? new Date() : null,
            notes: safeData.notes?.substring(0, 500),
            endorsements: safeData.endorsements || [],
            assignedBy: req.userID,
            assignedAt: new Date()
        };

        if (existingSkillIndex >= 0) {
            // Update existing skill
            employee.skills[existingSkillIndex] = {
                ...employee.skills[existingSkillIndex],
                ...skillData,
                updatedAt: new Date()
            };
        } else {
            // Add new skill
            if (!employee.skills) employee.skills = [];
            employee.skills.push(skillData);
        }

        await employee.save();

        res.json({
            success: true,
            message: existingSkillIndex >= 0
                ? 'تم تحديث مهارة الموظف بنجاح / Employee skill updated successfully'
                : 'تم تعيين المهارة للموظف بنجاح / Skill assigned to employee successfully',
            data: skillData
        });
    } catch (error) {
        logger.error('Error assigning skill to employee:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في تعيين المهارة / Error assigning skill',
            error: error.message
        });
    }
};

/**
 * Remove skill from employee
 * DELETE /api/hr/skills/assign/:employeeId/:skillId
 */
const removeSkillFromEmployee = async (req, res) => {
    try {
        const sanitizedEmployeeId = sanitizeObjectId(req.params.employeeId);
        const sanitizedSkillId = sanitizeObjectId(req.params.skillId);

        if (!sanitizedEmployeeId || !sanitizedSkillId) {
            return res.status(400).json({
                success: false,
                message: 'معرفات الموظف والمهارة مطلوبة / Employee and skill IDs are required'
            });
        }

        const result = await Employee.findOneAndUpdate(
            { _id: sanitizedEmployeeId, ...req.firmQuery },
            { $pull: { skills: { skillId: sanitizedSkillId } } },
            { new: true }
        );

        if (!result) {
            return res.status(404).json({
                success: false,
                message: 'الموظف غير موجود / Employee not found'
            });
        }

        res.json({
            success: true,
            message: 'تم إزالة المهارة من الموظف بنجاح / Skill removed from employee successfully'
        });
    } catch (error) {
        logger.error('Error removing skill from employee:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في إزالة المهارة / Error removing skill',
            error: error.message
        });
    }
};

/**
 * Get employee skills
 * GET /api/hr/skills/employee/:employeeId
 */
const getEmployeeSkills = async (req, res) => {
    try {
        const sanitizedEmployeeId = sanitizeObjectId(req.params.employeeId);
        if (!sanitizedEmployeeId) {
            return res.status(400).json({
                success: false,
                message: 'معرف الموظف غير صالح / Invalid employee ID'
            });
        }

        const employee = await Employee.findOne({
            _id: sanitizedEmployeeId,
            ...req.firmQuery
        }).select('personalInfo.fullNameEnglish personalInfo.fullNameArabic employeeId skills');

        if (!employee) {
            return res.status(404).json({
                success: false,
                message: 'الموظف غير موجود / Employee not found'
            });
        }

        // Group skills by category
        const skillsByCategory = {};
        (employee.skills || []).forEach(skill => {
            const category = skill.category || 'other';
            if (!skillsByCategory[category]) {
                skillsByCategory[category] = [];
            }
            skillsByCategory[category].push(skill);
        });

        // Calculate skill statistics
        const totalSkills = employee.skills?.length || 0;
        const verifiedSkills = employee.skills?.filter(s => s.verified).length || 0;
        const avgProficiency = totalSkills > 0
            ? employee.skills.reduce((sum, s) => sum + (s.proficiencyLevel || 0), 0) / totalSkills
            : 0;

        res.json({
            success: true,
            data: {
                employee: {
                    _id: employee._id,
                    employeeId: employee.employeeId,
                    name: employee.personalInfo?.fullNameEnglish,
                    nameAr: employee.personalInfo?.fullNameArabic
                },
                skills: employee.skills || [],
                skillsByCategory,
                statistics: {
                    totalSkills,
                    verifiedSkills,
                    avgProficiency: parseFloat(avgProficiency.toFixed(2)),
                    completenessRate: totalSkills > 0 ? parseFloat((verifiedSkills / totalSkills * 100).toFixed(1)) : 0
                }
            }
        });
    } catch (error) {
        logger.error('Error fetching employee skills:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في جلب مهارات الموظف / Error fetching employee skills',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// SKILL MATRIX & GAP ANALYSIS
// ═══════════════════════════════════════════════════════════════

/**
 * Get team skill matrix
 * GET /api/hr/skills/matrix
 */
const getSkillMatrix = async (req, res) => {
    try {
        const { departmentId, skillCategory, skillIds } = req.query;

        // Build employee query
        const employeeQuery = {
            ...req.firmQuery,
            'employmentDetails.employmentStatus': 'active'
        };

        if (departmentId) {
            employeeQuery['employmentDetails.departmentId'] = sanitizeObjectId(departmentId);
        }

        // Get employees with skills
        const employees = await Employee.find(employeeQuery)
            .select('personalInfo.fullNameEnglish personalInfo.fullNameArabic employeeId employmentDetails.department skills')
            .lean();

        // Get skills to include in matrix
        const skillQuery = { ...req.firmQuery, isActive: true };
        if (skillCategory) skillQuery.category = skillCategory;
        if (skillIds) {
            const sanitizedIds = skillIds.split(',').map(id => sanitizeObjectId(id)).filter(Boolean);
            if (sanitizedIds.length > 0) {
                skillQuery._id = { $in: sanitizedIds };
            }
        }

        const skills = await Skill.find(skillQuery)
            .select('skillId name nameAr category')
            .sort({ category: 1, name: 1 })
            .lean();

        // Build matrix
        const matrix = employees.map(emp => {
            const skillMap = {};
            (emp.skills || []).forEach(s => {
                skillMap[s.skillId?.toString()] = {
                    proficiencyLevel: s.proficiencyLevel,
                    verified: s.verified
                };
            });

            return {
                employee: {
                    _id: emp._id,
                    employeeId: emp.employeeId,
                    name: emp.personalInfo?.fullNameEnglish,
                    nameAr: emp.personalInfo?.fullNameArabic,
                    department: emp.employmentDetails?.department
                },
                skills: skills.map(skill => ({
                    skillId: skill._id,
                    skillName: skill.name,
                    skillNameAr: skill.nameAr,
                    category: skill.category,
                    proficiencyLevel: skillMap[skill._id.toString()]?.proficiencyLevel || 0,
                    verified: skillMap[skill._id.toString()]?.verified || false,
                    hasSkill: !!skillMap[skill._id.toString()]
                }))
            };
        });

        // Calculate skill coverage statistics
        const skillStats = skills.map(skill => {
            const employeesWithSkill = employees.filter(emp =>
                (emp.skills || []).some(s => s.skillId?.toString() === skill._id.toString())
            ).length;

            const avgProficiency = employees.reduce((sum, emp) => {
                const empSkill = (emp.skills || []).find(s => s.skillId?.toString() === skill._id.toString());
                return sum + (empSkill?.proficiencyLevel || 0);
            }, 0) / (employeesWithSkill || 1);

            return {
                skillId: skill._id,
                skillName: skill.name,
                skillNameAr: skill.nameAr,
                category: skill.category,
                employeesWithSkill,
                coveragePercentage: parseFloat((employeesWithSkill / employees.length * 100).toFixed(1)),
                avgProficiency: parseFloat(avgProficiency.toFixed(2))
            };
        });

        res.json({
            success: true,
            data: {
                matrix,
                skills: skills.map(s => ({
                    _id: s._id,
                    name: s.name,
                    nameAr: s.nameAr,
                    category: s.category
                })),
                skillStats,
                summary: {
                    totalEmployees: employees.length,
                    totalSkills: skills.length,
                    avgSkillsPerEmployee: parseFloat(
                        (employees.reduce((sum, emp) => sum + (emp.skills?.length || 0), 0) / employees.length).toFixed(1)
                    )
                }
            }
        });
    } catch (error) {
        logger.error('Error fetching skill matrix:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في جلب مصفوفة المهارات / Error fetching skill matrix',
            error: error.message
        });
    }
};

/**
 * Get skill gap analysis
 * GET /api/hr/skills/gap-analysis
 */
const getSkillGapAnalysis = async (req, res) => {
    try {
        const { departmentId, roleId, targetProficiency = 3 } = req.query;

        const targetLevel = parseInt(targetProficiency) || 3;

        // Build employee query
        const employeeQuery = {
            ...req.firmQuery,
            'employmentDetails.employmentStatus': 'active'
        };

        if (departmentId) {
            employeeQuery['employmentDetails.departmentId'] = sanitizeObjectId(departmentId);
        }

        // Get all active employees
        const employees = await Employee.find(employeeQuery)
            .select('personalInfo.fullNameEnglish personalInfo.fullNameArabic employeeId employmentDetails skills')
            .lean();

        // Get all active skills
        const skills = await Skill.find({ ...req.firmQuery, isActive: true }).lean();

        // Calculate gaps
        const skillGaps = skills.map(skill => {
            const employeesWithSkill = employees.filter(emp =>
                (emp.skills || []).some(s => s.skillId?.toString() === skill._id.toString())
            );

            const employeesBelowTarget = employees.filter(emp => {
                const empSkill = (emp.skills || []).find(s => s.skillId?.toString() === skill._id.toString());
                return !empSkill || empSkill.proficiencyLevel < targetLevel;
            });

            const avgProficiency = employeesWithSkill.length > 0
                ? employeesWithSkill.reduce((sum, emp) => {
                    const empSkill = (emp.skills || []).find(s => s.skillId?.toString() === skill._id.toString());
                    return sum + (empSkill?.proficiencyLevel || 0);
                }, 0) / employeesWithSkill.length
                : 0;

            const gapScore = ((targetLevel - avgProficiency) / targetLevel) * 100;

            return {
                skill: {
                    _id: skill._id,
                    skillId: skill.skillId,
                    name: skill.name,
                    nameAr: skill.nameAr,
                    category: skill.category
                },
                statistics: {
                    totalEmployees: employees.length,
                    employeesWithSkill: employeesWithSkill.length,
                    employeesBelowTarget: employeesBelowTarget.length,
                    coveragePercentage: parseFloat((employeesWithSkill.length / employees.length * 100).toFixed(1)),
                    avgProficiency: parseFloat(avgProficiency.toFixed(2)),
                    targetProficiency: targetLevel,
                    gapScore: parseFloat(Math.max(0, gapScore).toFixed(1))
                },
                employeesNeedingTraining: employeesBelowTarget.map(emp => ({
                    _id: emp._id,
                    employeeId: emp.employeeId,
                    name: emp.personalInfo?.fullNameEnglish,
                    nameAr: emp.personalInfo?.fullNameArabic,
                    currentLevel: (emp.skills || []).find(s => s.skillId?.toString() === skill._id.toString())?.proficiencyLevel || 0,
                    gap: targetLevel - ((emp.skills || []).find(s => s.skillId?.toString() === skill._id.toString())?.proficiencyLevel || 0)
                }))
            };
        });

        // Sort by gap score (highest gaps first)
        skillGaps.sort((a, b) => b.statistics.gapScore - a.statistics.gapScore);

        // Calculate overall statistics
        const totalGapScore = skillGaps.reduce((sum, sg) => sum + sg.statistics.gapScore, 0) / skillGaps.length;
        const criticalGaps = skillGaps.filter(sg => sg.statistics.gapScore > 50);

        res.json({
            success: true,
            data: {
                skillGaps,
                summary: {
                    totalSkillsAnalyzed: skills.length,
                    totalEmployees: employees.length,
                    targetProficiency: targetLevel,
                    overallGapScore: parseFloat(totalGapScore.toFixed(1)),
                    criticalGapsCount: criticalGaps.length,
                    topGaps: skillGaps.slice(0, 5).map(sg => ({
                        skillName: sg.skill.name,
                        gapScore: sg.statistics.gapScore
                    }))
                },
                recommendations: generateTrainingRecommendations(skillGaps, employees)
            }
        });
    } catch (error) {
        logger.error('Error performing skill gap analysis:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في تحليل فجوات المهارات / Error performing skill gap analysis',
            error: error.message
        });
    }
};

/**
 * Generate training recommendations based on skill gaps
 */
function generateTrainingRecommendations(skillGaps, employees) {
    const recommendations = [];

    // Priority 1: Skills with high gap scores affecting many employees
    const criticalSkills = skillGaps.filter(sg =>
        sg.statistics.gapScore > 40 && sg.statistics.employeesBelowTarget > employees.length * 0.3
    );

    criticalSkills.forEach(sg => {
        recommendations.push({
            priority: 'critical',
            priorityAr: 'حرج',
            type: 'group_training',
            typeAr: 'تدريب جماعي',
            skill: sg.skill.name,
            skillAr: sg.skill.nameAr,
            targetEmployees: sg.statistics.employeesBelowTarget,
            reason: `High gap score (${sg.statistics.gapScore}%) affecting ${sg.statistics.employeesBelowTarget} employees`,
            reasonAr: `فجوة عالية (${sg.statistics.gapScore}%) تؤثر على ${sg.statistics.employeesBelowTarget} موظف`
        });
    });

    // Priority 2: Skills with no coverage
    const uncoveredSkills = skillGaps.filter(sg => sg.statistics.coveragePercentage === 0);
    uncoveredSkills.forEach(sg => {
        recommendations.push({
            priority: 'high',
            priorityAr: 'عالي',
            type: 'hire_or_train',
            typeAr: 'توظيف أو تدريب',
            skill: sg.skill.name,
            skillAr: sg.skill.nameAr,
            targetEmployees: 0,
            reason: 'No employees have this skill',
            reasonAr: 'لا يمتلك أي موظف هذه المهارة'
        });
    });

    return recommendations.slice(0, 10); // Return top 10 recommendations
}

/**
 * Find employees with specific skill
 * GET /api/hr/skills/:skillId/employees
 */
const getEmployeesWithSkill = async (req, res) => {
    try {
        const sanitizedSkillId = sanitizeObjectId(req.params.skillId);
        if (!sanitizedSkillId) {
            return res.status(400).json({
                success: false,
                message: 'معرف المهارة غير صالح / Invalid skill ID'
            });
        }

        const { minProficiency = 1, verified } = req.query;
        const minLevel = parseInt(minProficiency) || 1;

        const skill = await Skill.findOne({ _id: sanitizedSkillId, ...req.firmQuery });
        if (!skill) {
            return res.status(404).json({
                success: false,
                message: 'المهارة غير موجودة / Skill not found'
            });
        }

        const employeeQuery = {
            ...req.firmQuery,
            'skills.skillId': sanitizedSkillId,
            'skills.proficiencyLevel': { $gte: minLevel }
        };

        if (verified === 'true') {
            employeeQuery['skills.verified'] = true;
        }

        const employees = await Employee.find(employeeQuery)
            .select('personalInfo.fullNameEnglish personalInfo.fullNameArabic employeeId employmentDetails.department employmentDetails.jobTitle skills')
            .lean();

        // Extract skill details for each employee
        const results = employees.map(emp => {
            const empSkill = (emp.skills || []).find(s => s.skillId?.toString() === sanitizedSkillId.toString());
            return {
                employee: {
                    _id: emp._id,
                    employeeId: emp.employeeId,
                    name: emp.personalInfo?.fullNameEnglish,
                    nameAr: emp.personalInfo?.fullNameArabic,
                    department: emp.employmentDetails?.department,
                    jobTitle: emp.employmentDetails?.jobTitle
                },
                skillDetails: {
                    proficiencyLevel: empSkill?.proficiencyLevel,
                    yearsOfExperience: empSkill?.yearsOfExperience,
                    verified: empSkill?.verified,
                    certificationDate: empSkill?.certificationDate,
                    expiryDate: empSkill?.expiryDate
                }
            };
        });

        // Sort by proficiency level (highest first)
        results.sort((a, b) => (b.skillDetails.proficiencyLevel || 0) - (a.skillDetails.proficiencyLevel || 0));

        res.json({
            success: true,
            data: {
                skill: {
                    _id: skill._id,
                    skillId: skill.skillId,
                    name: skill.name,
                    nameAr: skill.nameAr,
                    category: skill.category
                },
                employees: results,
                total: results.length
            }
        });
    } catch (error) {
        logger.error('Error finding employees with skill:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في البحث عن الموظفين / Error finding employees',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// SKILL VERIFICATION & ENDORSEMENTS
// ═══════════════════════════════════════════════════════════════

/**
 * Verify employee skill
 * POST /api/hr/skills/verify
 */
const verifySkill = async (req, res) => {
    try {
        const allowedFields = ['employeeId', 'skillId', 'verificationMethod', 'notes', 'attachments'];
        const safeData = pickAllowedFields(req.body, allowedFields);

        const sanitizedEmployeeId = sanitizeObjectId(safeData.employeeId);
        const sanitizedSkillId = sanitizeObjectId(safeData.skillId);

        if (!sanitizedEmployeeId || !sanitizedSkillId) {
            return res.status(400).json({
                success: false,
                message: 'معرفات الموظف والمهارة مطلوبة / Employee and skill IDs are required'
            });
        }

        const employee = await Employee.findOne({
            _id: sanitizedEmployeeId,
            ...req.firmQuery,
            'skills.skillId': sanitizedSkillId
        });

        if (!employee) {
            return res.status(404).json({
                success: false,
                message: 'الموظف أو المهارة غير موجودة / Employee or skill not found'
            });
        }

        const skillIndex = employee.skills.findIndex(s => s.skillId?.toString() === sanitizedSkillId.toString());
        if (skillIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'المهارة غير مخصصة للموظف / Skill not assigned to employee'
            });
        }

        employee.skills[skillIndex].verified = true;
        employee.skills[skillIndex].verifiedBy = req.userID;
        employee.skills[skillIndex].verifiedDate = new Date();
        employee.skills[skillIndex].verificationMethod = safeData.verificationMethod;
        employee.skills[skillIndex].verificationNotes = safeData.notes?.substring(0, 500);

        await employee.save();

        res.json({
            success: true,
            message: 'تم التحقق من المهارة بنجاح / Skill verified successfully',
            data: employee.skills[skillIndex]
        });
    } catch (error) {
        logger.error('Error verifying skill:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في التحقق من المهارة / Error verifying skill',
            error: error.message
        });
    }
};

/**
 * Endorse employee skill (peer endorsement)
 * POST /api/hr/skills/endorse
 */
const endorseSkill = async (req, res) => {
    try {
        const allowedFields = ['employeeId', 'skillId', 'comment'];
        const safeData = pickAllowedFields(req.body, allowedFields);

        const sanitizedEmployeeId = sanitizeObjectId(safeData.employeeId);
        const sanitizedSkillId = sanitizeObjectId(safeData.skillId);

        if (!sanitizedEmployeeId || !sanitizedSkillId) {
            return res.status(400).json({
                success: false,
                message: 'معرفات الموظف والمهارة مطلوبة / Employee and skill IDs are required'
            });
        }

        // Can't endorse own skill
        if (sanitizedEmployeeId.toString() === req.userID) {
            return res.status(400).json({
                success: false,
                message: 'لا يمكنك تأييد مهارتك الخاصة / You cannot endorse your own skill'
            });
        }

        const employee = await Employee.findOne({
            _id: sanitizedEmployeeId,
            ...req.firmQuery,
            'skills.skillId': sanitizedSkillId
        });

        if (!employee) {
            return res.status(404).json({
                success: false,
                message: 'الموظف أو المهارة غير موجودة / Employee or skill not found'
            });
        }

        const skillIndex = employee.skills.findIndex(s => s.skillId?.toString() === sanitizedSkillId.toString());
        if (skillIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'المهارة غير مخصصة للموظف / Skill not assigned to employee'
            });
        }

        // Check if already endorsed by this user
        const existingEndorsement = (employee.skills[skillIndex].endorsements || [])
            .find(e => e.endorsedBy?.toString() === req.userID);

        if (existingEndorsement) {
            return res.status(400).json({
                success: false,
                message: 'لقد قمت بتأييد هذه المهارة مسبقاً / You have already endorsed this skill'
            });
        }

        // Add endorsement
        if (!employee.skills[skillIndex].endorsements) {
            employee.skills[skillIndex].endorsements = [];
        }

        employee.skills[skillIndex].endorsements.push({
            endorsedBy: req.userID,
            endorsedAt: new Date(),
            comment: safeData.comment?.substring(0, 200)
        });

        await employee.save();

        res.json({
            success: true,
            message: 'تم تأييد المهارة بنجاح / Skill endorsed successfully',
            data: {
                endorsementCount: employee.skills[skillIndex].endorsements.length
            }
        });
    } catch (error) {
        logger.error('Error endorsing skill:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في تأييد المهارة / Error endorsing skill',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// STATISTICS
// ═══════════════════════════════════════════════════════════════

/**
 * Get skill statistics
 * GET /api/hr/skills/stats
 */
const getSkillStats = async (req, res) => {
    try {
        const match = { ...req.firmQuery };

        // Convert to ObjectId for aggregation
        if (match.firmId && typeof match.firmId === 'string') {
            match.firmId = new mongoose.Types.ObjectId(match.firmId);
        }
        if (match.lawyerId && typeof match.lawyerId === 'string') {
            match.lawyerId = new mongoose.Types.ObjectId(match.lawyerId);
        }

        const [
            skillStats,
            categoryStats,
            employeeStats
        ] = await Promise.all([
            // Total skills
            Skill.aggregate([
                { $match: match },
                {
                    $group: {
                        _id: null,
                        total: { $sum: 1 },
                        active: { $sum: { $cond: ['$isActive', 1, 0] } },
                        verifiable: { $sum: { $cond: ['$isVerifiable', 1, 0] } }
                    }
                }
            ]),
            // By category
            Skill.aggregate([
                { $match: { ...match, isActive: true } },
                {
                    $group: {
                        _id: '$category',
                        count: { $sum: 1 }
                    }
                },
                { $sort: { count: -1 } }
            ]),
            // Employee skill stats
            Employee.aggregate([
                { $match: { ...match, 'employmentDetails.employmentStatus': 'active' } },
                { $unwind: { path: '$skills', preserveNullAndEmptyArrays: true } },
                {
                    $group: {
                        _id: null,
                        totalEmployees: { $addToSet: '$_id' },
                        employeesWithSkills: {
                            $addToSet: {
                                $cond: [{ $ifNull: ['$skills.skillId', false] }, '$_id', null]
                            }
                        },
                        totalSkillAssignments: {
                            $sum: { $cond: [{ $ifNull: ['$skills.skillId', false] }, 1, 0] }
                        },
                        verifiedAssignments: {
                            $sum: { $cond: ['$skills.verified', 1, 0] }
                        },
                        avgProficiency: { $avg: '$skills.proficiencyLevel' }
                    }
                },
                {
                    $project: {
                        totalEmployees: { $size: '$totalEmployees' },
                        employeesWithSkills: {
                            $size: {
                                $filter: {
                                    input: '$employeesWithSkills',
                                    cond: { $ne: ['$$this', null] }
                                }
                            }
                        },
                        totalSkillAssignments: 1,
                        verifiedAssignments: 1,
                        avgProficiency: 1
                    }
                }
            ])
        ]);

        const skillData = skillStats[0] || { total: 0, active: 0, verifiable: 0 };
        const empData = employeeStats[0] || {
            totalEmployees: 0,
            employeesWithSkills: 0,
            totalSkillAssignments: 0,
            verifiedAssignments: 0,
            avgProficiency: 0
        };

        res.json({
            success: true,
            data: {
                skills: {
                    total: skillData.total,
                    active: skillData.active,
                    verifiable: skillData.verifiable
                },
                categories: categoryStats.map(c => ({
                    category: c._id,
                    count: c.count
                })),
                employees: {
                    totalEmployees: empData.totalEmployees,
                    employeesWithSkills: empData.employeesWithSkills,
                    skillCoverage: empData.totalEmployees > 0
                        ? parseFloat((empData.employeesWithSkills / empData.totalEmployees * 100).toFixed(1))
                        : 0,
                    totalSkillAssignments: empData.totalSkillAssignments,
                    verifiedAssignments: empData.verifiedAssignments,
                    verificationRate: empData.totalSkillAssignments > 0
                        ? parseFloat((empData.verifiedAssignments / empData.totalSkillAssignments * 100).toFixed(1))
                        : 0,
                    avgProficiency: parseFloat((empData.avgProficiency || 0).toFixed(2))
                }
            }
        });
    } catch (error) {
        logger.error('Error fetching skill stats:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في جلب إحصائيات المهارات / Error fetching skill statistics',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// SFIA FRAMEWORK ENDPOINTS
// ═══════════════════════════════════════════════════════════════

/**
 * Get SFIA 7-level proficiency framework
 * GET /api/hr/skills/sfia-levels
 */
const getSfiaLevels = async (req, res) => {
    try {
        res.json({
            success: true,
            data: {
                framework: 'SFIA',
                version: '8',
                description: 'Skills Framework for the Information Age',
                levels: SFIA_LEVELS,
                levelCount: 7
            }
        });
    } catch (error) {
        logger.error('Error fetching SFIA levels:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في جلب مستويات SFIA / Error fetching SFIA levels',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// SKILL TYPE CRUD (Hierarchical Categories)
// ═══════════════════════════════════════════════════════════════

/**
 * Get all skill types (hierarchical)
 * GET /api/hr/skills/types
 */
const getSkillTypes = async (req, res) => {
    try {
        const { classification, flat = 'false' } = req.query;

        const query = { ...req.firmQuery, isActive: true };
        if (classification) query.classification = classification;

        if (flat === 'true') {
            const types = await SkillType.find(query)
                .populate('parentTypeId', 'name nameAr')
                .sort({ displayOrder: 1, name: 1 })
                .lean();

            return res.json({
                success: true,
                data: types
            });
        }

        // Return hierarchical structure
        const hierarchy = await SkillType.getHierarchy(req.firmId || req.lawyerId);

        res.json({
            success: true,
            data: hierarchy
        });
    } catch (error) {
        logger.error('Error fetching skill types:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في جلب أنواع المهارات / Error fetching skill types',
            error: error.message
        });
    }
};

/**
 * Create skill type
 * POST /api/hr/skills/types
 */
const createSkillType = async (req, res) => {
    try {
        const allowedFields = [
            'name', 'nameAr', 'description', 'descriptionAr',
            'parentTypeId', 'classification', 'icon', 'color', 'displayOrder'
        ];
        const safeData = pickAllowedFields(req.body, allowedFields);

        if (!safeData.name) {
            return res.status(400).json({
                success: false,
                message: 'اسم نوع المهارة مطلوب / Skill type name is required'
            });
        }

        // Check for duplicate
        const existingType = await SkillType.findOne({
            ...req.firmQuery,
            name: { $regex: `^${escapeRegex(safeData.name)}$`, $options: 'i' }
        });

        if (existingType) {
            return res.status(400).json({
                success: false,
                message: 'نوع المهارة موجود بالفعل / Skill type already exists'
            });
        }

        const skillType = new SkillType(req.addFirmId({
            ...safeData,
            createdBy: req.userID
        }));

        await skillType.save();

        res.status(201).json({
            success: true,
            message: 'تم إنشاء نوع المهارة بنجاح / Skill type created successfully',
            data: skillType
        });
    } catch (error) {
        logger.error('Error creating skill type:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في إنشاء نوع المهارة / Error creating skill type',
            error: error.message
        });
    }
};

/**
 * Update skill type
 * PATCH /api/hr/skills/types/:id
 */
const updateSkillType = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            return res.status(400).json({
                success: false,
                message: 'معرف نوع المهارة غير صالح / Invalid skill type ID'
            });
        }

        const allowedFields = [
            'name', 'nameAr', 'description', 'descriptionAr',
            'parentTypeId', 'classification', 'icon', 'color', 'displayOrder', 'isActive'
        ];
        const safeData = pickAllowedFields(req.body, allowedFields);

        const skillType = await SkillType.findOneAndUpdate(
            { _id: sanitizedId, ...req.firmQuery },
            { $set: safeData },
            { new: true, runValidators: true }
        );

        if (!skillType) {
            return res.status(404).json({
                success: false,
                message: 'نوع المهارة غير موجود / Skill type not found'
            });
        }

        res.json({
            success: true,
            message: 'تم تحديث نوع المهارة بنجاح / Skill type updated successfully',
            data: skillType
        });
    } catch (error) {
        logger.error('Error updating skill type:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في تحديث نوع المهارة / Error updating skill type',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// COMPETENCY CRUD
// ═══════════════════════════════════════════════════════════════

/**
 * Get all competencies
 * GET /api/hr/skills/competencies
 */
const getCompetencies = async (req, res) => {
    try {
        const { type, cluster, isMandatory, search, page = 1, limit = 50 } = req.query;

        const pageNum = Math.max(1, parseInt(page) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 50));

        const query = { ...req.firmQuery, isActive: true };

        if (type) query.type = type;
        if (cluster) query.cluster = cluster;
        if (isMandatory !== undefined) query.isMandatory = isMandatory === 'true';

        if (search) {
            const escapedSearch = escapeRegex(search);
            query.$or = [
                { name: { $regex: escapedSearch, $options: 'i' } },
                { nameAr: { $regex: escapedSearch, $options: 'i' } },
                { description: { $regex: escapedSearch, $options: 'i' } }
            ];
        }

        const [competencies, total] = await Promise.all([
            Competency.find(query)
                .sort({ type: 1, cluster: 1, name: 1 })
                .skip((pageNum - 1) * limitNum)
                .limit(limitNum)
                .lean(),
            Competency.countDocuments(query)
        ]);

        res.json({
            success: true,
            data: competencies,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                pages: Math.ceil(total / limitNum)
            }
        });
    } catch (error) {
        logger.error('Error fetching competencies:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في جلب الكفاءات / Error fetching competencies',
            error: error.message
        });
    }
};

/**
 * Get single competency
 * GET /api/hr/skills/competencies/:id
 */
const getCompetencyById = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            return res.status(400).json({
                success: false,
                message: 'معرف الكفاءة غير صالح / Invalid competency ID'
            });
        }

        const competency = await Competency.findOne({
            _id: sanitizedId,
            ...req.firmQuery
        });

        if (!competency) {
            return res.status(404).json({
                success: false,
                message: 'الكفاءة غير موجودة / Competency not found'
            });
        }

        res.json({
            success: true,
            data: competency
        });
    } catch (error) {
        logger.error('Error fetching competency:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في جلب الكفاءة / Error fetching competency',
            error: error.message
        });
    }
};

/**
 * Create competency
 * POST /api/hr/skills/competencies
 */
const createCompetency = async (req, res) => {
    try {
        const allowedFields = [
            'name', 'nameAr', 'description', 'descriptionAr',
            'type', 'cluster', 'clusterAr', 'behavioralIndicators',
            'assessmentMethods', 'importance', 'weight',
            'developmentActivities', 'isMandatory'
        ];
        const safeData = pickAllowedFields(req.body, allowedFields);

        if (!safeData.name || !safeData.type) {
            return res.status(400).json({
                success: false,
                message: 'الاسم والنوع مطلوبان / Name and type are required'
            });
        }

        // Check for duplicate
        const existingCompetency = await Competency.findOne({
            ...req.firmQuery,
            name: { $regex: `^${escapeRegex(safeData.name)}$`, $options: 'i' }
        });

        if (existingCompetency) {
            return res.status(400).json({
                success: false,
                message: 'كفاءة بهذا الاسم موجودة بالفعل / Competency with this name already exists'
            });
        }

        const competency = new Competency(req.addFirmId({
            ...safeData,
            createdBy: req.userID
        }));

        await competency.save();

        res.status(201).json({
            success: true,
            message: 'تم إنشاء الكفاءة بنجاح / Competency created successfully',
            data: competency
        });
    } catch (error) {
        logger.error('Error creating competency:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في إنشاء الكفاءة / Error creating competency',
            error: error.message
        });
    }
};

/**
 * Update competency
 * PATCH /api/hr/skills/competencies/:id
 */
const updateCompetency = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            return res.status(400).json({
                success: false,
                message: 'معرف الكفاءة غير صالح / Invalid competency ID'
            });
        }

        const allowedFields = [
            'name', 'nameAr', 'description', 'descriptionAr',
            'type', 'cluster', 'clusterAr', 'behavioralIndicators',
            'assessmentMethods', 'importance', 'weight',
            'developmentActivities', 'isMandatory', 'isActive'
        ];
        const safeData = pickAllowedFields(req.body, allowedFields);

        const competency = await Competency.findOneAndUpdate(
            { _id: sanitizedId, ...req.firmQuery },
            { $set: { ...safeData, updatedBy: req.userID } },
            { new: true, runValidators: true }
        );

        if (!competency) {
            return res.status(404).json({
                success: false,
                message: 'الكفاءة غير موجودة / Competency not found'
            });
        }

        res.json({
            success: true,
            message: 'تم تحديث الكفاءة بنجاح / Competency updated successfully',
            data: competency
        });
    } catch (error) {
        logger.error('Error updating competency:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في تحديث الكفاءة / Error updating competency',
            error: error.message
        });
    }
};

/**
 * Delete competency (soft delete)
 * DELETE /api/hr/skills/competencies/:id
 */
const deleteCompetency = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            return res.status(400).json({
                success: false,
                message: 'معرف الكفاءة غير صالح / Invalid competency ID'
            });
        }

        const competency = await Competency.findOneAndUpdate(
            { _id: sanitizedId, ...req.firmQuery },
            { $set: { isActive: false, updatedBy: req.userID } },
            { new: true }
        );

        if (!competency) {
            return res.status(404).json({
                success: false,
                message: 'الكفاءة غير موجودة / Competency not found'
            });
        }

        res.json({
            success: true,
            message: 'تم حذف الكفاءة بنجاح / Competency deleted successfully'
        });
    } catch (error) {
        logger.error('Error deleting competency:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في حذف الكفاءة / Error deleting competency',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// SKILL ASSESSMENT (360-DEGREE)
// ═══════════════════════════════════════════════════════════════

/**
 * Get skill assessments
 * GET /api/hr/skills/assessments
 */
const getSkillAssessments = async (req, res) => {
    try {
        const { employeeId, assessmentType, status, page = 1, limit = 20 } = req.query;

        const pageNum = Math.max(1, parseInt(page) || 1);
        const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 20));

        const query = { ...req.firmQuery };

        if (employeeId) {
            const sanitizedEmployeeId = sanitizeObjectId(employeeId);
            if (sanitizedEmployeeId) query.employeeId = sanitizedEmployeeId;
        }
        if (assessmentType) query.assessmentType = assessmentType;
        if (status) query.status = status;

        const [assessments, total] = await Promise.all([
            SkillAssessment.find(query)
                .populate('employeeId', 'employeeId firstName lastName')
                .sort({ 'assessmentPeriod.startDate': -1 })
                .skip((pageNum - 1) * limitNum)
                .limit(limitNum)
                .lean(),
            SkillAssessment.countDocuments(query)
        ]);

        res.json({
            success: true,
            data: assessments,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                pages: Math.ceil(total / limitNum)
            }
        });
    } catch (error) {
        logger.error('Error fetching skill assessments:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في جلب تقييمات المهارات / Error fetching skill assessments',
            error: error.message
        });
    }
};

/**
 * Get single assessment
 * GET /api/hr/skills/assessments/:id
 */
const getAssessmentById = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            return res.status(400).json({
                success: false,
                message: 'معرف التقييم غير صالح / Invalid assessment ID'
            });
        }

        const assessment = await SkillAssessment.findOne({
            _id: sanitizedId,
            ...req.firmQuery
        })
            .populate('employeeId', 'employeeId firstName lastName email')
            .populate('skillRatings.skillId', 'name nameAr category')
            .populate('competencyRatings.competencyId', 'name nameAr type cluster');

        if (!assessment) {
            return res.status(404).json({
                success: false,
                message: 'التقييم غير موجود / Assessment not found'
            });
        }

        res.json({
            success: true,
            data: assessment
        });
    } catch (error) {
        logger.error('Error fetching assessment:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في جلب التقييم / Error fetching assessment',
            error: error.message
        });
    }
};

/**
 * Create skill assessment
 * POST /api/hr/skills/assessments
 */
const createAssessment = async (req, res) => {
    try {
        const allowedFields = [
            'employeeId', 'assessmentPeriod', 'assessmentType',
            'skillRatings', 'competencyRatings', 'workflow'
        ];
        const safeData = pickAllowedFields(req.body, allowedFields);

        const sanitizedEmployeeId = sanitizeObjectId(safeData.employeeId);
        if (!sanitizedEmployeeId) {
            return res.status(400).json({
                success: false,
                message: 'معرف الموظف مطلوب / Employee ID is required'
            });
        }

        // Verify employee exists
        const employee = await Employee.findOne({
            _id: sanitizedEmployeeId,
            ...req.firmQuery
        });

        if (!employee) {
            return res.status(404).json({
                success: false,
                message: 'الموظف غير موجود / Employee not found'
            });
        }

        // Check for existing active assessment
        const existingAssessment = await SkillAssessment.findOne({
            ...req.firmQuery,
            employeeId: sanitizedEmployeeId,
            assessmentType: safeData.assessmentType,
            status: { $nin: ['completed', 'acknowledged'] }
        });

        if (existingAssessment) {
            return res.status(400).json({
                success: false,
                message: 'يوجد تقييم نشط لهذا الموظف / Active assessment exists for this employee',
                data: { existingAssessmentId: existingAssessment._id }
            });
        }

        const assessment = new SkillAssessment(req.addFirmId({
            ...safeData,
            employeeId: sanitizedEmployeeId,
            status: 'draft',
            createdBy: req.userID
        }));

        await assessment.save();

        res.status(201).json({
            success: true,
            message: 'تم إنشاء التقييم بنجاح / Assessment created successfully',
            data: assessment
        });
    } catch (error) {
        logger.error('Error creating assessment:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في إنشاء التقييم / Error creating assessment',
            error: error.message
        });
    }
};

/**
 * Update assessment (including ratings)
 * PATCH /api/hr/skills/assessments/:id
 */
const updateAssessment = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            return res.status(400).json({
                success: false,
                message: 'معرف التقييم غير صالح / Invalid assessment ID'
            });
        }

        const allowedFields = [
            'assessmentPeriod', 'skillRatings', 'competencyRatings',
            'overallSummary', 'developmentPlan', 'status', 'workflow'
        ];
        const safeData = pickAllowedFields(req.body, allowedFields);

        const assessment = await SkillAssessment.findOne({
            _id: sanitizedId,
            ...req.firmQuery
        });

        if (!assessment) {
            return res.status(404).json({
                success: false,
                message: 'التقييم غير موجود / Assessment not found'
            });
        }

        // Update fields
        Object.assign(assessment, safeData);
        assessment.updatedBy = req.userID;

        await assessment.save();

        res.json({
            success: true,
            message: 'تم تحديث التقييم بنجاح / Assessment updated successfully',
            data: assessment
        });
    } catch (error) {
        logger.error('Error updating assessment:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في تحديث التقييم / Error updating assessment',
            error: error.message
        });
    }
};

/**
 * Submit self-assessment ratings
 * POST /api/hr/skills/assessments/:id/self-assessment
 */
const submitSelfAssessment = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            return res.status(400).json({
                success: false,
                message: 'معرف التقييم غير صالح / Invalid assessment ID'
            });
        }

        const { skillRatings, competencyRatings } = req.body;

        const assessment = await SkillAssessment.findOne({
            _id: sanitizedId,
            ...req.firmQuery,
            status: { $in: ['draft', 'self_assessment'] }
        });

        if (!assessment) {
            return res.status(404).json({
                success: false,
                message: 'التقييم غير موجود أو لا يمكن تعديله / Assessment not found or cannot be modified'
            });
        }

        // Update skill self-ratings
        if (skillRatings && Array.isArray(skillRatings)) {
            skillRatings.forEach(sr => {
                const existingRating = assessment.skillRatings.find(
                    r => r.skillId?.toString() === sr.skillId
                );
                if (existingRating) {
                    existingRating.selfRating = {
                        level: Math.min(7, Math.max(1, sr.level)),
                        levelProgress: Math.min(100, Math.max(0, sr.levelProgress || 0)),
                        confidence: Math.min(5, Math.max(1, sr.confidence || 3)),
                        notes: sr.notes?.substring(0, 500),
                        ratedAt: new Date()
                    };
                }
            });
        }

        // Update competency self-ratings
        if (competencyRatings && Array.isArray(competencyRatings)) {
            competencyRatings.forEach(cr => {
                const existingRating = assessment.competencyRatings.find(
                    r => r.competencyId?.toString() === cr.competencyId
                );
                if (existingRating) {
                    existingRating.selfRating = {
                        level: Math.min(7, Math.max(1, cr.level)),
                        notes: cr.notes?.substring(0, 500),
                        ratedAt: new Date()
                    };
                }
            });
        }

        assessment.status = 'manager_review';
        assessment.workflow.selfAssessmentCompleted = new Date();
        assessment.updatedBy = req.userID;

        await assessment.save();

        res.json({
            success: true,
            message: 'تم تقديم التقييم الذاتي بنجاح / Self-assessment submitted successfully',
            data: assessment
        });
    } catch (error) {
        logger.error('Error submitting self-assessment:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في تقديم التقييم الذاتي / Error submitting self-assessment',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// EXPIRING CERTIFICATIONS & CPD
// ═══════════════════════════════════════════════════════════════

/**
 * Get expiring certifications
 * GET /api/hr/skills/expiring-certifications
 */
const getExpiringCertifications = async (req, res) => {
    try {
        const { days = 30 } = req.query;
        const daysThreshold = Math.min(365, Math.max(1, parseInt(days) || 30));

        const firmId = req.firmId || req.lawyerId;
        const expiringCerts = await EmployeeSkillMap.getExpiringCertifications(firmId, daysThreshold);

        res.json({
            success: true,
            data: expiringCerts,
            total: expiringCerts.length,
            threshold: daysThreshold
        });
    } catch (error) {
        logger.error('Error fetching expiring certifications:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في جلب الشهادات المنتهية / Error fetching expiring certifications',
            error: error.message
        });
    }
};

/**
 * Get CPD non-compliant employees
 * GET /api/hr/skills/cpd-non-compliant
 */
const getCpdNonCompliant = async (req, res) => {
    try {
        const firmId = req.firmId || req.lawyerId;
        const nonCompliant = await EmployeeSkillMap.getCpdNonCompliant(firmId);

        res.json({
            success: true,
            data: nonCompliant,
            total: nonCompliant.length
        });
    } catch (error) {
        logger.error('Error fetching CPD non-compliant:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في جلب الموظفين غير الممتثلين / Error fetching non-compliant employees',
            error: error.message
        });
    }
};

/**
 * Get skills needing review
 * GET /api/hr/skills/needing-review
 */
const getSkillsNeedingReview = async (req, res) => {
    try {
        const { days = 0 } = req.query;
        const daysPast = parseInt(days) || 0;

        const firmId = req.firmId || req.lawyerId;
        const needingReview = await EmployeeSkillMap.getSkillsNeedingReview(firmId, daysPast);

        res.json({
            success: true,
            data: needingReview,
            total: needingReview.length
        });
    } catch (error) {
        logger.error('Error fetching skills needing review:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في جلب المهارات التي تحتاج مراجعة / Error fetching skills needing review',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

module.exports = {
    // Skill CRUD
    getSkills,
    getSkillById,
    createSkill,
    updateSkill,
    deleteSkill,
    getSkillsByCategory,

    // Employee skill assignment
    assignSkillToEmployee,
    removeSkillFromEmployee,
    getEmployeeSkills,

    // Matrix & Gap Analysis
    getSkillMatrix,
    getSkillGapAnalysis,
    getEmployeesWithSkill,

    // Verification & Endorsement
    verifySkill,
    endorseSkill,

    // Statistics
    getSkillStats,

    // SFIA Framework
    getSfiaLevels,

    // Skill Types
    getSkillTypes,
    createSkillType,
    updateSkillType,

    // Competencies
    getCompetencies,
    getCompetencyById,
    createCompetency,
    updateCompetency,
    deleteCompetency,

    // Assessments (360-Degree)
    getSkillAssessments,
    getAssessmentById,
    createAssessment,
    updateAssessment,
    submitSelfAssessment,

    // Certifications & CPD
    getExpiringCertifications,
    getCpdNonCompliant,
    getSkillsNeedingReview
};
