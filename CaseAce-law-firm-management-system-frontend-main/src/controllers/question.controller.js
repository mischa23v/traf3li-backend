const { Question, Answer } = require('../models');
const { CustomException } = require('../utils');

// Create question
const createQuestion = async (request, response) => {
    const { title, description, category, tags } = request.body;
    try {
        const question = new Question({
            userId: request.userID,
            title,
            description,
            category,
            tags
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
    const { _id } = request.params;
    try {
        const question = await Question.findById(_id)
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
    const { _id } = request.params;
    try {
        const question = await Question.findById(_id);

        if (!question) {
            throw CustomException('Question not found!', 404);
        }

        if (question.userId.toString() !== request.userID) {
            throw CustomException('You can only update your own questions!', 403);
        }

        const updatedQuestion = await Question.findByIdAndUpdate(
            _id,
            { $set: request.body },
            { new: true }
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
    const { _id } = request.params;
    try {
        const question = await Question.findById(_id);

        if (!question) {
            throw CustomException('Question not found!', 404);
        }

        if (question.userId.toString() !== request.userID) {
            throw CustomException('You can only delete your own questions!', 403);
        }

        await Question.deleteOne({ _id });
        await Answer.deleteMany({ questionId: _id });

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
