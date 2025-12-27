const { Question, Answer } = require('../models');
const { CustomException } = require('../utils');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');

// Create question
const createQuestion = async (request, response) => {
    try {
        // Mass assignment protection
        const allowedFields = ['title', 'description', 'category', 'tags'];
        const sanitizedData = pickAllowedFields(request.body, allowedFields);

        // Input validation
        if (!sanitizedData.title || typeof sanitizedData.title !== 'string' || sanitizedData.title.trim().length === 0) {
            throw CustomException('Title is required and must be a non-empty string', 400);
        }

        if (!sanitizedData.description || typeof sanitizedData.description !== 'string' || sanitizedData.description.trim().length === 0) {
            throw CustomException('Description is required and must be a non-empty string', 400);
        }

        if (!sanitizedData.category || typeof sanitizedData.category !== 'string' || sanitizedData.category.trim().length === 0) {
            throw CustomException('Category is required and must be a non-empty string', 400);
        }

        if (sanitizedData.title.length > 500) {
            throw CustomException('Title cannot exceed 500 characters', 400);
        }

        if (sanitizedData.description.length > 10000) {
            throw CustomException('Description cannot exceed 10000 characters', 400);
        }

        if (sanitizedData.tags && !Array.isArray(sanitizedData.tags)) {
            throw CustomException('Tags must be an array', 400);
        }

        if (sanitizedData.tags && sanitizedData.tags.length > 20) {
            throw CustomException('Cannot have more than 20 tags', 400);
        }

        const question = new Question({
            userId: request.userID,
            firmId: request.firmId,
            ...sanitizedData
        });

        await question.save();

        return response.status(201).send({
            error: false,
            message: 'Question posted successfully!',
            question
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// Get all questions
const getQuestions = async (request, response) => {
    const { search, category, status } = request.query;
    try {
        const filters = {
            ...request.firmQuery,
            ...(search && { $text: { $search: search } }),
            ...(category && { category }),
            ...(status && { status })
        };

        const questions = await Question.find(filters)
            .populate('userId', 'username image')
            .sort({ createdAt: -1 });

        return response.send({
            error: false,
            questions
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// Get single question
const getQuestion = async (request, response) => {
    try {
        // IDOR protection
        const questionId = sanitizeObjectId(request.params._id);

        const question = await Question.findOne({ _id: questionId, ...request.firmQuery })
            .populate('userId', 'username image')
            .populate({
                path: 'answers',
                populate: {
                    path: 'lawyerId',
                    select: 'username image lawyerProfile'
                }
            });

        if (!question) {
            throw CustomException('Question not found!', 404);
        }

        // Increment views
        question.views += 1;
        await question.save();

        return response.send({
            error: false,
            question
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// Update question
const updateQuestion = async (request, response) => {
    try {
        // IDOR protection
        const questionId = sanitizeObjectId(request.params._id);

        // Mass assignment protection
        const allowedFields = ['title', 'description', 'category', 'tags', 'status'];
        const sanitizedData = pickAllowedFields(request.body, allowedFields);

        // Input validation
        if (Object.keys(sanitizedData).length === 0) {
            throw CustomException('No valid fields to update', 400);
        }

        if (sanitizedData.title !== undefined) {
            if (typeof sanitizedData.title !== 'string' || sanitizedData.title.trim().length === 0) {
                throw CustomException('Title must be a non-empty string', 400);
            }
            if (sanitizedData.title.length > 500) {
                throw CustomException('Title cannot exceed 500 characters', 400);
            }
        }

        if (sanitizedData.description !== undefined) {
            if (typeof sanitizedData.description !== 'string' || sanitizedData.description.trim().length === 0) {
                throw CustomException('Description must be a non-empty string', 400);
            }
            if (sanitizedData.description.length > 10000) {
                throw CustomException('Description cannot exceed 10000 characters', 400);
            }
        }

        if (sanitizedData.category !== undefined) {
            if (typeof sanitizedData.category !== 'string' || sanitizedData.category.trim().length === 0) {
                throw CustomException('Category must be a non-empty string', 400);
            }
        }

        if (sanitizedData.tags !== undefined) {
            if (!Array.isArray(sanitizedData.tags)) {
                throw CustomException('Tags must be an array', 400);
            }
            if (sanitizedData.tags.length > 20) {
                throw CustomException('Cannot have more than 20 tags', 400);
            }
        }

        if (sanitizedData.status !== undefined) {
            const validStatuses = ['open', 'closed', 'answered'];
            if (!validStatuses.includes(sanitizedData.status)) {
                throw CustomException('Invalid status value', 400);
            }
        }

        const question = await Question.findOne({ _id: questionId, ...request.firmQuery });

        if (!question) {
            throw CustomException('Question not found!', 404);
        }

        if (question.userId.toString() !== request.userID) {
            throw CustomException('Question not found!', 404);
        }

        const updatedQuestion = await Question.findOneAndUpdate(
            { _id: questionId, ...request.firmQuery },
            { $set: sanitizedData },
            { new: true, runValidators: true }
        );

        return response.status(202).send({
            error: false,
            message: 'Question updated!',
            question: updatedQuestion
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// Delete question
const deleteQuestion = async (request, response) => {
    try {
        // IDOR protection
        const questionId = sanitizeObjectId(request.params._id);

        const question = await Question.findOne({ _id: questionId, ...request.firmQuery });

        if (!question) {
            throw CustomException('Question not found!', 404);
        }

        if (question.userId.toString() !== request.userID) {
            throw CustomException('Question not found!', 404);
        }

        await Question.deleteOne({ _id: questionId, ...request.firmQuery });
        await Answer.deleteMany({ questionId: questionId, ...request.firmQuery });

        return response.send({
            error: false,
            message: 'Question deleted successfully!'
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

module.exports = {
    createQuestion,
    getQuestions,
    getQuestion,
    updateQuestion,
    deleteQuestion
};
