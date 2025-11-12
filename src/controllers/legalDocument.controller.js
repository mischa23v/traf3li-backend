const { LegalDocument, User } = require('../models');
const { CustomException } = require('../utils');

// Create legal document
const createDocument = async (request, response) => {
    const { title, summary, content, category, type, keywords, fileUrl, author, publicationDate, accessLevel } = request.body;
    try {
        // Check if user is lawyer or admin
        const user = await User.findById(request.userID);
        if (user.role !== 'lawyer' && user.role !== 'admin') {
            throw CustomException('Only lawyers and admins can create legal documents!', 403);
        }

        const document = new LegalDocument({
            title,
            summary,
            content,
            category,
            type,
            keywords,
            fileUrl,
            author: author || user.username,
            publicationDate,
            accessLevel: accessLevel || 'public'
        });

        await document.save();

        return response.status(201).send({
            error: false,
            message: 'Legal document created successfully!',
            document
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// Get all documents
const getDocuments = async (request, response) => {
    const { search, category, type, accessLevel } = request.query;
    try {
        const user = await User.findById(request.userID).catch(() => null);

        const filters = {
            ...(search && { $text: { $search: search } }),
            ...(category && { category }),
            ...(type && { type }),
            ...(accessLevel && { accessLevel })
        };

        // Filter by access level
        if (!user || user.role === 'client') {
            filters.accessLevel = 'public';
        } else if (user.role === 'lawyer') {
            filters.accessLevel = { $in: ['public', 'lawyers-only'] };
        }
        // Admins can see all

        const documents = await LegalDocument.find(filters)
            .sort({ publicationDate: -1, createdAt: -1 })
            .select('-content'); // Don't return full content in list

        return response.send({
            error: false,
            documents
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// Get single document
const getDocument = async (request, response) => {
    const { _id } = request.params;
    try {
        const document = await LegalDocument.findById(_id);

        if (!document) {
            throw CustomException('Document not found!', 404);
        }

        // Check access
        const user = await User.findById(request.userID).catch(() => null);
        
        if (document.accessLevel === 'lawyers-only' && (!user || user.role === 'client')) {
            throw CustomException('This document is only accessible to lawyers!', 403);
        }

        if (document.accessLevel === 'admin-only' && (!user || user.role !== 'admin')) {
            throw CustomException('This document is only accessible to admins!', 403);
        }

        // Increment views
        document.views += 1;
        await document.save();

        return response.send({
            error: false,
            document
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// Update document
const updateDocument = async (request, response) => {
    const { _id } = request.params;
    try {
        // Check if user is admin
        const user = await User.findById(request.userID);
        if (user.role !== 'admin') {
            throw CustomException('Only admins can update legal documents!', 403);
        }

        const document = await LegalDocument.findByIdAndUpdate(
            _id,
            { $set: request.body },
            { new: true }
        );

        if (!document) {
            throw CustomException('Document not found!', 404);
        }

        return response.status(202).send({
            error: false,
            message: 'Document updated successfully!',
            document
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// Delete document
const deleteDocument = async (request, response) => {
    const { _id } = request.params;
    try {
        // Check if user is admin
        const user = await User.findById(request.userID);
        if (user.role !== 'admin') {
            throw CustomException('Only admins can delete legal documents!', 403);
        }

        const document = await LegalDocument.findById(_id);

        if (!document) {
            throw CustomException('Document not found!', 404);
        }

        await LegalDocument.deleteOne({ _id });

        return response.send({
            error: false,
            message: 'Document deleted successfully!'
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// Increment download count
const incrementDownload = async (request, response) => {
    const { _id } = request.params;
    try {
        const document = await LegalDocument.findByIdAndUpdate(
            _id,
            { $inc: { downloads: 1 } },
            { new: true }
        );

        if (!document) {
            throw CustomException('Document not found!', 404);
        }

        return response.status(202).send({
            error: false,
            message: 'Download recorded!',
            document
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

module.exports = {
    createDocument,
    getDocuments,
    getDocument,
    updateDocument,
    deleteDocument,
    incrementDownload
};
