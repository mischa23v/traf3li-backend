/**
 * Employee Survey Controller
 *
 * Enterprise employee engagement survey system
 * Inspired by: Culture Amp, Qualtrics, BambooHR, Peakon, Glint
 *
 * Features:
 * - Survey template management
 * - Survey creation and scheduling
 * - Response collection (anonymous/named)
 * - Analytics and reporting
 * - NPS calculation
 */

const mongoose = require('mongoose');
const { SurveyTemplate, Survey, SurveyResponse } = require('../models/survey.model');
const Employee = require('../models/employee.model');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');
const logger = require('../utils/logger');

// Helper function to escape regex special characters (ReDoS protection)
const escapeRegex = (str) => {
    if (!str || typeof str !== 'string') return '';
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

// ═══════════════════════════════════════════════════════════════
// SURVEY TEMPLATE CRUD
// ═══════════════════════════════════════════════════════════════

/**
 * Get all survey templates
 * GET /api/hr/surveys/templates
 */
const getSurveyTemplates = async (req, res) => {
    try {
        const { surveyType, isActive, search, page = 1, limit = 20 } = req.query;

        const pageNum = Math.max(1, parseInt(page) || 1);
        const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 20));

        const query = { ...req.firmQuery };

        if (surveyType) query.surveyType = surveyType;
        if (isActive !== undefined) query.isActive = isActive === 'true';

        if (search) {
            const escapedSearch = escapeRegex(search);
            query.$or = [
                { name: { $regex: escapedSearch, $options: 'i' } },
                { nameAr: { $regex: escapedSearch, $options: 'i' } }
            ];
        }

        const [templates, total] = await Promise.all([
            SurveyTemplate.find(query)
                .select('-questions')
                .sort({ updatedAt: -1 })
                .skip((pageNum - 1) * limitNum)
                .limit(limitNum)
                .lean(),
            SurveyTemplate.countDocuments(query)
        ]);

        res.json({
            success: true,
            data: templates,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                pages: Math.ceil(total / limitNum)
            }
        });
    } catch (error) {
        logger.error('Error fetching survey templates:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في جلب قوالب الاستبيانات / Error fetching survey templates',
            error: error.message
        });
    }
};

/**
 * Get single survey template
 * GET /api/hr/surveys/templates/:id
 */
const getSurveyTemplateById = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            return res.status(400).json({
                success: false,
                message: 'معرف القالب غير صالح / Invalid template ID'
            });
        }

        const template = await SurveyTemplate.findOne({
            _id: sanitizedId,
            ...req.firmQuery
        });

        if (!template) {
            return res.status(404).json({
                success: false,
                message: 'القالب غير موجود / Template not found'
            });
        }

        res.json({
            success: true,
            data: template
        });
    } catch (error) {
        logger.error('Error fetching survey template:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في جلب القالب / Error fetching template',
            error: error.message
        });
    }
};

/**
 * Create survey template
 * POST /api/hr/surveys/templates
 */
const createSurveyTemplate = async (req, res) => {
    try {
        const allowedFields = [
            'name', 'nameAr', 'description', 'descriptionAr',
            'surveyType', 'questions', 'sections', 'scoring', 'settings',
            'isActive', 'isDefault'
        ];
        const safeData = pickAllowedFields(req.body, allowedFields);

        if (!safeData.name || !safeData.surveyType) {
            return res.status(400).json({
                success: false,
                message: 'الاسم ونوع الاستبيان مطلوبان / Name and survey type are required'
            });
        }

        // Validate questions
        if (safeData.questions && safeData.questions.length > 0) {
            for (let i = 0; i < safeData.questions.length; i++) {
                const q = safeData.questions[i];
                if (!q.questionId) q.questionId = `Q${i + 1}`;
                if (!q.questionText || !q.questionType) {
                    return res.status(400).json({
                        success: false,
                        message: `السؤال ${i + 1}: نص السؤال والنوع مطلوبان / Question ${i + 1}: text and type are required`
                    });
                }
                q.order = i;
            }
        }

        const template = new SurveyTemplate(req.addFirmId({
            ...safeData,
            createdBy: req.userID
        }));

        await template.save();

        res.status(201).json({
            success: true,
            message: 'تم إنشاء القالب بنجاح / Template created successfully',
            data: template
        });
    } catch (error) {
        logger.error('Error creating survey template:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في إنشاء القالب / Error creating template',
            error: error.message
        });
    }
};

/**
 * Update survey template
 * PATCH /api/hr/surveys/templates/:id
 */
const updateSurveyTemplate = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            return res.status(400).json({
                success: false,
                message: 'معرف القالب غير صالح / Invalid template ID'
            });
        }

        const allowedFields = [
            'name', 'nameAr', 'description', 'descriptionAr',
            'surveyType', 'questions', 'sections', 'scoring', 'settings',
            'isActive', 'isDefault'
        ];
        const safeData = pickAllowedFields(req.body, allowedFields);

        const template = await SurveyTemplate.findOneAndUpdate(
            { _id: sanitizedId, ...req.firmQuery },
            { $set: { ...safeData, updatedBy: req.userID } },
            { new: true, runValidators: true }
        );

        if (!template) {
            return res.status(404).json({
                success: false,
                message: 'القالب غير موجود / Template not found'
            });
        }

        res.json({
            success: true,
            message: 'تم تحديث القالب بنجاح / Template updated successfully',
            data: template
        });
    } catch (error) {
        logger.error('Error updating survey template:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في تحديث القالب / Error updating template',
            error: error.message
        });
    }
};

/**
 * Delete survey template
 * DELETE /api/hr/surveys/templates/:id
 */
const deleteSurveyTemplate = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            return res.status(400).json({
                success: false,
                message: 'معرف القالب غير صالح / Invalid template ID'
            });
        }

        // Check if template is used in any surveys
        const surveyCount = await Survey.countDocuments({
            ...req.firmQuery,
            templateId: sanitizedId
        });

        if (surveyCount > 0) {
            // Soft delete
            await SurveyTemplate.findOneAndUpdate(
                { _id: sanitizedId, ...req.firmQuery },
                { $set: { isActive: false } }
            );

            return res.json({
                success: true,
                message: `القالب مستخدم في ${surveyCount} استبيان. تم إلغاء تفعيله / Template is used in ${surveyCount} survey(s). It has been deactivated`
            });
        }

        const template = await SurveyTemplate.findOneAndDelete({
            _id: sanitizedId,
            ...req.firmQuery
        });

        if (!template) {
            return res.status(404).json({
                success: false,
                message: 'القالب غير موجود / Template not found'
            });
        }

        res.json({
            success: true,
            message: 'تم حذف القالب بنجاح / Template deleted successfully'
        });
    } catch (error) {
        logger.error('Error deleting survey template:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في حذف القالب / Error deleting template',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// SURVEY CRUD
// ═══════════════════════════════════════════════════════════════

/**
 * Get all surveys
 * GET /api/hr/surveys
 */
const getSurveys = async (req, res) => {
    try {
        const {
            status,
            surveyType,
            startDateFrom,
            startDateTo,
            search,
            page = 1,
            limit = 20
        } = req.query;

        const pageNum = Math.max(1, parseInt(page) || 1);
        const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 20));

        const query = { ...req.firmQuery };

        if (status) query.status = status;
        if (surveyType) query.surveyType = surveyType;

        if (startDateFrom || startDateTo) {
            query.startDate = {};
            if (startDateFrom) query.startDate.$gte = new Date(startDateFrom);
            if (startDateTo) query.startDate.$lte = new Date(startDateTo);
        }

        if (search) {
            const escapedSearch = escapeRegex(search);
            query.$or = [
                { title: { $regex: escapedSearch, $options: 'i' } },
                { titleAr: { $regex: escapedSearch, $options: 'i' } },
                { surveyId: { $regex: escapedSearch, $options: 'i' } }
            ];
        }

        const [surveys, total] = await Promise.all([
            Survey.find(query)
                .select('-questions')
                .populate('templateId', 'name nameAr')
                .sort({ createdAt: -1 })
                .skip((pageNum - 1) * limitNum)
                .limit(limitNum)
                .lean(),
            Survey.countDocuments(query)
        ]);

        res.json({
            success: true,
            data: surveys,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                pages: Math.ceil(total / limitNum)
            }
        });
    } catch (error) {
        logger.error('Error fetching surveys:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في جلب الاستبيانات / Error fetching surveys',
            error: error.message
        });
    }
};

/**
 * Get single survey
 * GET /api/hr/surveys/:id
 */
const getSurveyById = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            return res.status(400).json({
                success: false,
                message: 'معرف الاستبيان غير صالح / Invalid survey ID'
            });
        }

        const survey = await Survey.findOne({
            _id: sanitizedId,
            ...req.firmQuery
        }).populate('templateId', 'name nameAr');

        if (!survey) {
            return res.status(404).json({
                success: false,
                message: 'الاستبيان غير موجود / Survey not found'
            });
        }

        res.json({
            success: true,
            data: survey
        });
    } catch (error) {
        logger.error('Error fetching survey:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في جلب الاستبيان / Error fetching survey',
            error: error.message
        });
    }
};

/**
 * Create survey
 * POST /api/hr/surveys
 */
const createSurvey = async (req, res) => {
    try {
        const allowedFields = [
            'templateId', 'title', 'titleAr', 'description', 'descriptionAr',
            'surveyType', 'questions', 'sections', 'startDate', 'endDate',
            'reminderFrequency', 'targetAudience', 'settings', 'scoring'
        ];
        const safeData = pickAllowedFields(req.body, allowedFields);

        if (!safeData.title || !safeData.surveyType) {
            return res.status(400).json({
                success: false,
                message: 'العنوان ونوع الاستبيان مطلوبان / Title and survey type are required'
            });
        }

        // If template provided, copy questions from template
        if (safeData.templateId) {
            const sanitizedTemplateId = sanitizeObjectId(safeData.templateId);
            const template = await SurveyTemplate.findOne({
                _id: sanitizedTemplateId,
                ...req.firmQuery
            });

            if (!template) {
                return res.status(404).json({
                    success: false,
                    message: 'القالب غير موجود / Template not found'
                });
            }

            safeData.questions = template.questions;
            safeData.sections = template.sections;
            safeData.scoring = safeData.scoring || template.scoring;
            safeData.settings = { ...template.settings, ...safeData.settings };
        }

        // Validate questions exist
        if (!safeData.questions || safeData.questions.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'يجب أن يحتوي الاستبيان على سؤال واحد على الأقل / Survey must have at least one question'
            });
        }

        // Calculate target audience count
        let totalInvited = 0;
        const employeeQuery = { ...req.firmQuery, 'employmentDetails.employmentStatus': 'active' };

        if (safeData.targetAudience?.type === 'department' && safeData.targetAudience?.departments?.length > 0) {
            employeeQuery['employmentDetails.departmentId'] = { $in: safeData.targetAudience.departments };
        } else if (safeData.targetAudience?.type === 'custom' && safeData.targetAudience?.employeeIds?.length > 0) {
            employeeQuery._id = { $in: safeData.targetAudience.employeeIds };
        }

        totalInvited = await Employee.countDocuments(employeeQuery);

        const survey = new Survey(req.addFirmId({
            ...safeData,
            status: safeData.startDate && new Date(safeData.startDate) > new Date() ? 'scheduled' : 'draft',
            statistics: { totalInvited },
            createdBy: req.userID
        }));

        await survey.save();

        res.status(201).json({
            success: true,
            message: 'تم إنشاء الاستبيان بنجاح / Survey created successfully',
            data: survey
        });
    } catch (error) {
        logger.error('Error creating survey:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في إنشاء الاستبيان / Error creating survey',
            error: error.message
        });
    }
};

/**
 * Update survey
 * PATCH /api/hr/surveys/:id
 */
const updateSurvey = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            return res.status(400).json({
                success: false,
                message: 'معرف الاستبيان غير صالح / Invalid survey ID'
            });
        }

        const survey = await Survey.findOne({ _id: sanitizedId, ...req.firmQuery });
        if (!survey) {
            return res.status(404).json({
                success: false,
                message: 'الاستبيان غير موجود / Survey not found'
            });
        }

        // Cannot update active/closed surveys significantly
        if (['active', 'closed'].includes(survey.status)) {
            const allowedUpdatesForActive = ['endDate', 'reminderFrequency', 'status'];
            const safeData = pickAllowedFields(req.body, allowedUpdatesForActive);

            await Survey.findOneAndUpdate(
                { _id: sanitizedId, ...req.firmQuery },
                { $set: { ...safeData, updatedBy: req.userID } },
                { new: true }
            );

            return res.json({
                success: true,
                message: 'تم تحديث الاستبيان / Survey updated (limited updates for active survey)'
            });
        }

        const allowedFields = [
            'title', 'titleAr', 'description', 'descriptionAr',
            'surveyType', 'questions', 'sections', 'startDate', 'endDate',
            'reminderFrequency', 'targetAudience', 'settings', 'scoring', 'status'
        ];
        const safeData = pickAllowedFields(req.body, allowedFields);

        const updatedSurvey = await Survey.findOneAndUpdate(
            { _id: sanitizedId, ...req.firmQuery },
            { $set: { ...safeData, updatedBy: req.userID } },
            { new: true, runValidators: true }
        );

        res.json({
            success: true,
            message: 'تم تحديث الاستبيان بنجاح / Survey updated successfully',
            data: updatedSurvey
        });
    } catch (error) {
        logger.error('Error updating survey:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في تحديث الاستبيان / Error updating survey',
            error: error.message
        });
    }
};

/**
 * Launch survey (change status to active)
 * POST /api/hr/surveys/:id/launch
 */
const launchSurvey = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            return res.status(400).json({
                success: false,
                message: 'معرف الاستبيان غير صالح / Invalid survey ID'
            });
        }

        const survey = await Survey.findOne({ _id: sanitizedId, ...req.firmQuery });
        if (!survey) {
            return res.status(404).json({
                success: false,
                message: 'الاستبيان غير موجود / Survey not found'
            });
        }

        if (!['draft', 'scheduled', 'paused'].includes(survey.status)) {
            return res.status(400).json({
                success: false,
                message: 'لا يمكن إطلاق الاستبيان في هذه الحالة / Cannot launch survey in current status'
            });
        }

        survey.status = 'active';
        if (!survey.startDate) survey.startDate = new Date();
        survey.updatedBy = req.userID;

        await survey.save();

        // TODO: Send notification emails to target audience

        res.json({
            success: true,
            message: 'تم إطلاق الاستبيان بنجاح / Survey launched successfully',
            data: survey
        });
    } catch (error) {
        logger.error('Error launching survey:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في إطلاق الاستبيان / Error launching survey',
            error: error.message
        });
    }
};

/**
 * Close survey
 * POST /api/hr/surveys/:id/close
 */
const closeSurvey = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            return res.status(400).json({
                success: false,
                message: 'معرف الاستبيان غير صالح / Invalid survey ID'
            });
        }

        const survey = await Survey.findOneAndUpdate(
            { _id: sanitizedId, ...req.firmQuery, status: 'active' },
            {
                $set: {
                    status: 'closed',
                    endDate: new Date(),
                    updatedBy: req.userID
                }
            },
            { new: true }
        );

        if (!survey) {
            return res.status(404).json({
                success: false,
                message: 'الاستبيان غير موجود أو غير نشط / Survey not found or not active'
            });
        }

        res.json({
            success: true,
            message: 'تم إغلاق الاستبيان بنجاح / Survey closed successfully',
            data: survey
        });
    } catch (error) {
        logger.error('Error closing survey:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في إغلاق الاستبيان / Error closing survey',
            error: error.message
        });
    }
};

/**
 * Delete survey
 * DELETE /api/hr/surveys/:id
 */
const deleteSurvey = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            return res.status(400).json({
                success: false,
                message: 'معرف الاستبيان غير صالح / Invalid survey ID'
            });
        }

        const survey = await Survey.findOne({ _id: sanitizedId, ...req.firmQuery });
        if (!survey) {
            return res.status(404).json({
                success: false,
                message: 'الاستبيان غير موجود / Survey not found'
            });
        }

        // Check for responses
        const responseCount = await SurveyResponse.countDocuments({
            surveyId: sanitizedId,
            status: 'completed'
        });

        if (responseCount > 0) {
            // Archive instead of delete
            await Survey.findOneAndUpdate(
                { _id: sanitizedId, ...req.firmQuery },
                { $set: { status: 'archived', updatedBy: req.userID } }
            );

            return res.json({
                success: true,
                message: `الاستبيان لديه ${responseCount} ردود. تم أرشفته / Survey has ${responseCount} responses. It has been archived`
            });
        }

        // Delete survey and any partial responses
        await Promise.all([
            Survey.findOneAndDelete({ _id: sanitizedId, ...req.firmQuery }),
            SurveyResponse.deleteMany({ surveyId: sanitizedId })
        ]);

        res.json({
            success: true,
            message: 'تم حذف الاستبيان بنجاح / Survey deleted successfully'
        });
    } catch (error) {
        logger.error('Error deleting survey:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في حذف الاستبيان / Error deleting survey',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// SURVEY RESPONSES
// ═══════════════════════════════════════════════════════════════

/**
 * Get employee's active surveys
 * GET /api/hr/surveys/my-surveys
 */
const getMySurveys = async (req, res) => {
    try {
        // Get employee ID from user
        const employee = await Employee.findOne({
            userId: req.userID,
            ...req.firmQuery
        }).select('_id employmentDetails.departmentId');

        if (!employee) {
            return res.status(404).json({
                success: false,
                message: 'الموظف غير موجود / Employee not found'
            });
        }

        // Find active surveys targeting this employee
        const now = new Date();
        const surveyQuery = {
            ...req.firmQuery,
            status: 'active',
            $or: [
                { endDate: null },
                { endDate: { $gte: now } }
            ],
            $and: [
                {
                    $or: [
                        { 'targetAudience.type': 'all' },
                        {
                            'targetAudience.type': 'department',
                            'targetAudience.departments': employee.employmentDetails?.departmentId
                        },
                        {
                            'targetAudience.type': 'custom',
                            'targetAudience.employeeIds': employee._id
                        }
                    ]
                },
                { 'targetAudience.excludedEmployeeIds': { $ne: employee._id } }
            ]
        };

        const surveys = await Survey.find(surveyQuery)
            .select('surveyId title titleAr description descriptionAr surveyType startDate endDate settings.estimatedDuration settings.isAnonymous statistics')
            .lean();

        // Check which surveys have been completed
        const responses = await SurveyResponse.find({
            surveyId: { $in: surveys.map(s => s._id) },
            respondentId: employee._id
        }).select('surveyId status');

        const responseMap = {};
        responses.forEach(r => {
            responseMap[r.surveyId.toString()] = r.status;
        });

        const enrichedSurveys = surveys.map(survey => ({
            ...survey,
            myStatus: responseMap[survey._id.toString()] || 'not_started'
        }));

        res.json({
            success: true,
            data: {
                surveys: enrichedSurveys,
                pending: enrichedSurveys.filter(s => s.myStatus === 'not_started').length,
                inProgress: enrichedSurveys.filter(s => s.myStatus === 'in_progress').length,
                completed: enrichedSurveys.filter(s => s.myStatus === 'completed').length
            }
        });
    } catch (error) {
        logger.error('Error fetching my surveys:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في جلب الاستبيانات / Error fetching surveys',
            error: error.message
        });
    }
};

/**
 * Submit survey response
 * POST /api/hr/surveys/:id/respond
 */
const submitSurveyResponse = async (req, res) => {
    try {
        const sanitizedSurveyId = sanitizeObjectId(req.params.id);
        if (!sanitizedSurveyId) {
            return res.status(400).json({
                success: false,
                message: 'معرف الاستبيان غير صالح / Invalid survey ID'
            });
        }

        const survey = await Survey.findOne({
            _id: sanitizedSurveyId,
            ...req.firmQuery,
            status: 'active'
        });

        if (!survey) {
            return res.status(404).json({
                success: false,
                message: 'الاستبيان غير موجود أو غير متاح / Survey not found or not available'
            });
        }

        // Get employee
        const employee = await Employee.findOne({
            userId: req.userID,
            ...req.firmQuery
        }).select('_id employmentDetails');

        if (!employee) {
            return res.status(404).json({
                success: false,
                message: 'الموظف غير موجود / Employee not found'
            });
        }

        // Check if already responded
        let response = await SurveyResponse.findOne({
            surveyId: sanitizedSurveyId,
            respondentId: employee._id
        });

        const allowedFields = ['answers', 'status'];
        const safeData = pickAllowedFields(req.body, allowedFields);

        // Validate answers
        if (safeData.answers && Array.isArray(safeData.answers)) {
            for (const answer of safeData.answers) {
                if (!answer.questionId) {
                    return res.status(400).json({
                        success: false,
                        message: 'معرف السؤال مطلوب لكل إجابة / Question ID is required for each answer'
                    });
                }

                // Find the question
                const question = survey.questions.find(q => q.questionId === answer.questionId);
                if (!question) {
                    continue; // Skip unknown questions
                }

                // Validate answer type
                switch (question.questionType) {
                    case 'rating':
                    case 'nps':
                    case 'scale':
                        if (answer.rating !== undefined) {
                            const min = question.scaleConfig?.min || 0;
                            const max = question.scaleConfig?.max || (question.questionType === 'nps' ? 10 : 5);
                            if (answer.rating < min || answer.rating > max) {
                                return res.status(400).json({
                                    success: false,
                                    message: `التقييم للسؤال ${question.questionId} يجب أن يكون بين ${min} و ${max}`
                                });
                            }
                        }
                        break;
                    case 'text':
                        if (answer.textResponse) {
                            answer.textResponse = answer.textResponse.substring(0, 2000);
                        }
                        break;
                }

                answer.questionType = question.questionType;
                answer.answeredAt = new Date();
            }
        }

        if (response) {
            // Update existing response
            if (response.status === 'completed') {
                return res.status(400).json({
                    success: false,
                    message: 'لقد أكملت هذا الاستبيان بالفعل / You have already completed this survey'
                });
            }

            response.answers = safeData.answers || response.answers;
            response.status = safeData.status || response.status;
            response.lastActivityAt = new Date();

            if (safeData.status === 'completed') {
                response.completedAt = new Date();
                response.timeSpentSeconds = Math.floor((new Date() - response.startedAt) / 1000);
            }
        } else {
            // Create new response
            response = new SurveyResponse(req.addFirmId({
                surveyId: sanitizedSurveyId,
                respondentId: survey.settings.isAnonymous ? null : employee._id,
                isAnonymous: survey.settings.isAnonymous,
                respondentMetadata: survey.settings.isAnonymous ? {
                    department: employee.employmentDetails?.department,
                    departmentId: employee.employmentDetails?.departmentId
                } : null,
                answers: safeData.answers || [],
                status: safeData.status || 'in_progress',
                startedAt: new Date(),
                completedAt: safeData.status === 'completed' ? new Date() : null
            }));
        }

        // Calculate score if completed
        if (response.status === 'completed') {
            const { totalScore, categoryScores } = calculateResponseScore(survey, response.answers);
            response.totalScore = totalScore;
            response.scorePercentage = survey.scoring?.maxScore
                ? parseFloat((totalScore / survey.scoring.maxScore * 100).toFixed(1))
                : null;
            response.categoryScores = categoryScores;
        }

        await response.save();

        // Update survey statistics
        await updateSurveyStatistics(sanitizedSurveyId);

        res.json({
            success: true,
            message: response.status === 'completed'
                ? 'شكراً لإكمال الاستبيان / Thank you for completing the survey'
                : 'تم حفظ إجاباتك / Your answers have been saved',
            data: {
                responseId: response.responseId,
                status: response.status
            }
        });
    } catch (error) {
        logger.error('Error submitting survey response:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في تقديم الإجابات / Error submitting response',
            error: error.message
        });
    }
};

/**
 * Calculate response score
 */
function calculateResponseScore(survey, answers) {
    let totalScore = 0;
    const categoryScores = {};

    for (const answer of answers) {
        if (answer.skipped) continue;

        const question = survey.questions.find(q => q.questionId === answer.questionId);
        if (!question) continue;

        let score = 0;

        switch (question.questionType) {
            case 'rating':
            case 'scale':
                if (answer.rating !== undefined) {
                    const max = question.scaleConfig?.max || 5;
                    score = (answer.rating / max) * 20; // Normalize to 0-20
                }
                break;
            case 'nps':
                if (answer.rating !== undefined) {
                    score = answer.rating; // NPS is 0-10
                }
                break;
            case 'multiple_choice':
                if (answer.selectedOptions?.length > 0) {
                    const option = question.options?.find(o => o.value === answer.selectedOptions[0]);
                    score = option?.weight || 0;
                }
                break;
            case 'yes_no':
                if (answer.value === 'yes') score = 10;
                break;
        }

        totalScore += score;

        // Track category scores
        const category = question.category || 'custom';
        if (!categoryScores[category]) {
            categoryScores[category] = { score: 0, maxScore: 0, count: 0 };
        }
        categoryScores[category].score += score;
        categoryScores[category].maxScore += 20;
        categoryScores[category].count += 1;
    }

    const formattedCategoryScores = Object.entries(categoryScores).map(([category, data]) => ({
        category,
        score: data.score,
        maxScore: data.maxScore,
        percentage: data.maxScore > 0 ? parseFloat((data.score / data.maxScore * 100).toFixed(1)) : 0
    }));

    return { totalScore, categoryScores: formattedCategoryScores };
}

/**
 * Update survey statistics
 */
async function updateSurveyStatistics(surveyId) {
    const stats = await SurveyResponse.aggregate([
        { $match: { surveyId: new mongoose.Types.ObjectId(surveyId) } },
        {
            $group: {
                _id: null,
                totalResponses: { $sum: 1 },
                completedResponses: {
                    $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
                },
                partialResponses: {
                    $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] }
                },
                avgScore: {
                    $avg: {
                        $cond: [
                            { $and: [{ $eq: ['$status', 'completed'] }, { $ne: ['$scorePercentage', null] }] },
                            '$scorePercentage',
                            null
                        ]
                    }
                },
                lastResponseAt: { $max: '$completedAt' }
            }
        }
    ]);

    const surveyStats = stats[0] || {
        totalResponses: 0,
        completedResponses: 0,
        partialResponses: 0,
        avgScore: null,
        lastResponseAt: null
    };

    const survey = await Survey.findById(surveyId);
    const responseRate = survey.statistics.totalInvited > 0
        ? parseFloat((surveyStats.completedResponses / survey.statistics.totalInvited * 100).toFixed(1))
        : 0;

    // Calculate NPS if applicable
    let npsScore = null;
    if (survey.surveyType === 'engagement' || survey.questions.some(q => q.questionType === 'nps')) {
        const npsResponses = await SurveyResponse.aggregate([
            { $match: { surveyId: new mongoose.Types.ObjectId(surveyId), status: 'completed' } },
            { $unwind: '$answers' },
            { $match: { 'answers.questionType': 'nps' } },
            {
                $group: {
                    _id: null,
                    promoters: { $sum: { $cond: [{ $gte: ['$answers.rating', 9] }, 1, 0] } },
                    detractors: { $sum: { $cond: [{ $lte: ['$answers.rating', 6] }, 1, 0] } },
                    total: { $sum: 1 }
                }
            }
        ]);

        if (npsResponses.length > 0 && npsResponses[0].total > 0) {
            const { promoters, detractors, total } = npsResponses[0];
            npsScore = Math.round(((promoters - detractors) / total) * 100);
        }
    }

    await Survey.findByIdAndUpdate(surveyId, {
        $set: {
            'statistics.totalResponses': surveyStats.totalResponses,
            'statistics.completedResponses': surveyStats.completedResponses,
            'statistics.partialResponses': surveyStats.partialResponses,
            'statistics.responseRate': responseRate,
            'statistics.avgScore': surveyStats.avgScore ? parseFloat(surveyStats.avgScore.toFixed(1)) : null,
            'statistics.npsScore': npsScore,
            'statistics.lastResponseAt': surveyStats.lastResponseAt
        }
    });
}

// ═══════════════════════════════════════════════════════════════
// SURVEY ANALYTICS
// ═══════════════════════════════════════════════════════════════

/**
 * Get survey results/analytics
 * GET /api/hr/surveys/:id/results
 */
const getSurveyResults = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            return res.status(400).json({
                success: false,
                message: 'معرف الاستبيان غير صالح / Invalid survey ID'
            });
        }

        const survey = await Survey.findOne({
            _id: sanitizedId,
            ...req.firmQuery
        });

        if (!survey) {
            return res.status(404).json({
                success: false,
                message: 'الاستبيان غير موجود / Survey not found'
            });
        }

        // Get all completed responses
        const responses = await SurveyResponse.find({
            surveyId: sanitizedId,
            status: 'completed'
        }).lean();

        // Calculate question-level analytics
        const questionResults = survey.questions.map(question => {
            const questionAnswers = responses
                .map(r => r.answers.find(a => a.questionId === question.questionId))
                .filter(Boolean);

            const result = {
                questionId: question.questionId,
                questionText: question.questionText,
                questionTextAr: question.questionTextAr,
                questionType: question.questionType,
                category: question.category,
                totalResponses: questionAnswers.length,
                skippedCount: questionAnswers.filter(a => a.skipped).length
            };

            switch (question.questionType) {
                case 'rating':
                case 'scale':
                case 'nps':
                    const ratings = questionAnswers.filter(a => a.rating !== undefined).map(a => a.rating);
                    if (ratings.length > 0) {
                        result.avgRating = parseFloat((ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(2));
                        result.minRating = Math.min(...ratings);
                        result.maxRating = Math.max(...ratings);
                        result.distribution = {};
                        ratings.forEach(r => {
                            result.distribution[r] = (result.distribution[r] || 0) + 1;
                        });
                    }
                    break;

                case 'multiple_choice':
                case 'checkbox':
                    result.optionCounts = {};
                    questionAnswers.forEach(a => {
                        (a.selectedOptions || []).forEach(opt => {
                            result.optionCounts[opt] = (result.optionCounts[opt] || 0) + 1;
                        });
                    });
                    break;

                case 'yes_no':
                    result.yesCount = questionAnswers.filter(a => a.value === 'yes').length;
                    result.noCount = questionAnswers.filter(a => a.value === 'no').length;
                    result.yesPercentage = questionAnswers.length > 0
                        ? parseFloat((result.yesCount / questionAnswers.length * 100).toFixed(1))
                        : 0;
                    break;

                case 'text':
                    result.textResponses = questionAnswers
                        .filter(a => a.textResponse)
                        .map(a => a.textResponse)
                        .slice(0, 50); // Limit to 50 responses
                    break;
            }

            return result;
        });

        // Category-level aggregation
        const categoryResults = {};
        questionResults.forEach(qr => {
            const cat = qr.category || 'custom';
            if (!categoryResults[cat]) {
                categoryResults[cat] = {
                    category: cat,
                    questionCount: 0,
                    avgScore: 0,
                    scores: []
                };
            }
            categoryResults[cat].questionCount++;
            if (qr.avgRating !== undefined) {
                categoryResults[cat].scores.push(qr.avgRating);
            }
        });

        Object.values(categoryResults).forEach(cat => {
            if (cat.scores.length > 0) {
                cat.avgScore = parseFloat((cat.scores.reduce((a, b) => a + b, 0) / cat.scores.length).toFixed(2));
            }
            delete cat.scores;
        });

        res.json({
            success: true,
            data: {
                survey: {
                    _id: survey._id,
                    surveyId: survey.surveyId,
                    title: survey.title,
                    titleAr: survey.titleAr,
                    surveyType: survey.surveyType,
                    status: survey.status,
                    startDate: survey.startDate,
                    endDate: survey.endDate
                },
                statistics: survey.statistics,
                questionResults,
                categoryResults: Object.values(categoryResults),
                responseCount: responses.length
            }
        });
    } catch (error) {
        logger.error('Error fetching survey results:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في جلب نتائج الاستبيان / Error fetching survey results',
            error: error.message
        });
    }
};

/**
 * Get survey statistics overview
 * GET /api/hr/surveys/stats
 */
const getSurveyStats = async (req, res) => {
    try {
        const match = { ...req.firmQuery };

        // Convert to ObjectId for aggregation
        if (match.firmId && typeof match.firmId === 'string') {
            match.firmId = new mongoose.Types.ObjectId(match.firmId);
        }
        if (match.lawyerId && typeof match.lawyerId === 'string') {
            match.lawyerId = new mongoose.Types.ObjectId(match.lawyerId);
        }

        const [surveyStats, typeStats, recentSurveys] = await Promise.all([
            Survey.aggregate([
                { $match: match },
                {
                    $group: {
                        _id: null,
                        total: { $sum: 1 },
                        active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
                        scheduled: { $sum: { $cond: [{ $eq: ['$status', 'scheduled'] }, 1, 0] } },
                        closed: { $sum: { $cond: [{ $eq: ['$status', 'closed'] }, 1, 0] } },
                        draft: { $sum: { $cond: [{ $eq: ['$status', 'draft'] }, 1, 0] } },
                        avgResponseRate: { $avg: '$statistics.responseRate' },
                        avgNpsScore: { $avg: '$statistics.npsScore' }
                    }
                }
            ]),
            Survey.aggregate([
                { $match: match },
                {
                    $group: {
                        _id: '$surveyType',
                        count: { $sum: 1 },
                        avgResponseRate: { $avg: '$statistics.responseRate' }
                    }
                },
                { $sort: { count: -1 } }
            ]),
            Survey.find(match)
                .select('surveyId title status surveyType statistics.responseRate statistics.npsScore startDate')
                .sort({ startDate: -1 })
                .limit(5)
                .lean()
        ]);

        const stats = surveyStats[0] || {
            total: 0,
            active: 0,
            scheduled: 0,
            closed: 0,
            draft: 0,
            avgResponseRate: 0,
            avgNpsScore: null
        };

        res.json({
            success: true,
            data: {
                overview: {
                    total: stats.total,
                    active: stats.active,
                    scheduled: stats.scheduled,
                    closed: stats.closed,
                    draft: stats.draft,
                    avgResponseRate: stats.avgResponseRate ? parseFloat(stats.avgResponseRate.toFixed(1)) : 0,
                    avgNpsScore: stats.avgNpsScore ? Math.round(stats.avgNpsScore) : null
                },
                byType: typeStats.map(t => ({
                    type: t._id,
                    count: t.count,
                    avgResponseRate: t.avgResponseRate ? parseFloat(t.avgResponseRate.toFixed(1)) : 0
                })),
                recentSurveys
            }
        });
    } catch (error) {
        logger.error('Error fetching survey stats:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في جلب إحصائيات الاستبيانات / Error fetching survey statistics',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

module.exports = {
    // Templates
    getSurveyTemplates,
    getSurveyTemplateById,
    createSurveyTemplate,
    updateSurveyTemplate,
    deleteSurveyTemplate,

    // Surveys
    getSurveys,
    getSurveyById,
    createSurvey,
    updateSurvey,
    launchSurvey,
    closeSurvey,
    deleteSurvey,

    // Responses
    getMySurveys,
    submitSurveyResponse,

    // Analytics
    getSurveyResults,
    getSurveyStats
};
