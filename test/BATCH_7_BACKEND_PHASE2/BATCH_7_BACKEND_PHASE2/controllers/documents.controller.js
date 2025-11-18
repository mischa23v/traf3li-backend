const Document = require('../models/document.model');
const Case = require('../models/case.model');
const { encryptFile, decryptFile, generateToken } = require('../utils/encryption');
const multer = require('multer');
const path = require('path');

// Configure file upload
// Option A: AWS S3 (Recommended)
const AWS = require('aws-sdk');
const multerS3 = require('multer-s3');

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'me-south-1',
});

const uploadToS3 = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.AWS_S3_BUCKET,
    acl: 'private', // Files are private by default
    metadata: (req, file, cb) => {
      cb(null, { fieldName: file.fieldname });
    },
    key: (req, file, cb) => {
      const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
      cb(null, `documents/${uniqueName}`);
    },
  }),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allowed file types
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
      'text/plain',
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Allowed: PDF, DOC, DOCX, JPG, PNG, TXT'));
    }
  },
});

// Upload document
exports.uploadDocument = async (req, res) => {
  try {
    // Use multer middleware
    uploadToS3.single('file')(req, res, async (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message,
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded',
        });
      }

      const { category, caseId, description, tags, isConfidential } = req.body;

      // Parse tags if provided as JSON string
      let parsedTags = [];
      if (tags) {
        try {
          parsedTags = JSON.parse(tags);
        } catch (e) {
          parsedTags = tags.split(',').map(t => t.trim());
        }
      }

      // Create document record
      const document = new Document({
        fileName: req.file.key,
        originalName: req.file.originalname,
        fileType: req.file.mimetype,
        fileSize: req.file.size,
        url: req.file.location,
        category: category || 'other',
        caseId: caseId || null,
        description: description || '',
        tags: parsedTags,
        isConfidential: isConfidential === 'true',
        uploadedBy: req.user._id,
      });

      // If confidential, mark for encryption
      if (document.isConfidential || document.category === 'judgment') {
        // Note: Actual file encryption would be done in a background job
        // For now, we mark it and encrypt the URL access
        document.isEncrypted = true;
      }

      await document.save();

      // Update case document count if linked to case
      if (caseId) {
        await Case.findByIdAndUpdate(caseId, {
          $inc: { documentCount: 1 },
        });
      }

      // Populate fields for response
      await document.populate('uploadedBy', 'fullName email');
      if (caseId) {
        await document.populate('caseId', 'caseNumber title');
      }

      res.status(201).json({
        success: true,
        message: 'Document uploaded successfully',
        document,
      });
    });
  } catch (error) {
    console.error('Upload document error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload document',
      error: error.message,
    });
  }
};

// Get all documents with filters
exports.getDocuments = async (req, res) => {
  try {
    const { category, caseId, search, isConfidential, page = 1, limit = 50 } = req.query;

    const filter = { uploadedBy: req.user._id };

    // Apply filters
    if (category) filter.category = category;
    if (caseId) filter.caseId = caseId;
    if (isConfidential !== undefined) filter.isConfidential = isConfidential === 'true';

    // Text search
    if (search) {
      filter.$text = { $search: search };
    }

    const documents = await Document.find(filter)
      .populate('uploadedBy', 'fullName email')
      .populate('caseId', 'caseNumber title')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Document.countDocuments(filter);

    res.json({
      success: true,
      documents,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Get documents error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch documents',
      error: error.message,
    });
  }
};

// Get single document
exports.getDocument = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id)
      .populate('uploadedBy', 'fullName email')
      .populate('caseId', 'caseNumber title');

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found',
      });
    }

    // Check access permissions
    if (!document.isAccessibleBy(req.user._id, req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    // Record access
    await document.recordAccess();

    res.json({
      success: true,
      document,
    });
  } catch (error) {
    console.error('Get document error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch document',
      error: error.message,
    });
  }
};

// Update document metadata
exports.updateDocument = async (req, res) => {
  try {
    const { category, description, tags, isConfidential } = req.body;

    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found',
      });
    }

    // Check permissions
    if (document.uploadedBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    // Update fields
    if (category) document.category = category;
    if (description !== undefined) document.description = description;
    if (tags) document.tags = tags;
    if (isConfidential !== undefined) document.isConfidential = isConfidential;

    await document.save();

    res.json({
      success: true,
      message: 'Document updated successfully',
      document,
    });
  } catch (error) {
    console.error('Update document error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update document',
      error: error.message,
    });
  }
};

// Delete document
exports.deleteDocument = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found',
      });
    }

    // Check permissions
    if (document.uploadedBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    // Delete from S3
    const params = {
      Bucket: process.env.AWS_S3_BUCKET,
      Key: document.fileName,
    };

    await s3.deleteObject(params).promise();

    // Delete from database
    await document.deleteOne();

    // Update case document count
    if (document.caseId) {
      await Case.findByIdAndUpdate(document.caseId, {
        $inc: { documentCount: -1 },
      });
    }

    res.json({
      success: true,
      message: 'Document deleted successfully',
    });
  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete document',
      error: error.message,
    });
  }
};

// Download document
exports.downloadDocument = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found',
      });
    }

    // Check permissions
    if (!document.isAccessibleBy(req.user._id, req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    // Get file from S3
    const params = {
      Bucket: process.env.AWS_S3_BUCKET,
      Key: document.fileName,
    };

    // If encrypted, decrypt before sending
    if (document.isEncrypted && document.encryptionIV) {
      const encryptedFile = await s3.getObject(params).promise();
      const decryptedBuffer = decryptFile(
        encryptedFile.Body,
        document.encryptionIV,
        document.encryptionAuthTag
      );

      res.setHeader('Content-Type', document.fileType);
      res.setHeader('Content-Disposition', `attachment; filename="${document.originalName}"`);
      res.send(decryptedBuffer);
    } else {
      // Generate signed URL (valid for 1 hour)
      const url = s3.getSignedUrl('getObject', {
        ...params,
        Expires: 3600,
        ResponseContentDisposition: `attachment; filename="${document.originalName}"`,
      });

      res.json({
        success: true,
        url,
      });
    }

    // Record access
    await document.recordAccess();
  } catch (error) {
    console.error('Download document error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download document',
      error: error.message,
    });
  }
};

// Get documents by case
exports.getDocumentsByCase = async (req, res) => {
  try {
    const { caseId } = req.params;

    const documents = await Document.find({
      caseId,
      uploadedBy: req.user._id,
    })
      .populate('uploadedBy', 'fullName email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      documents,
    });
  } catch (error) {
    console.error('Get documents by case error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch documents',
      error: error.message,
    });
  }
};

// Get document statistics
exports.getDocumentStats = async (req, res) => {
  try {
    const userId = req.user._id;

    // Get storage stats
    const storageStats = await Document.getStorageStats(userId);

    // Get category breakdown
    const categoryBreakdown = await Document.getCategoryBreakdown({ uploadedBy: userId });

    // Get this month's count
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const documentsThisMonth = await Document.countDocuments({
      uploadedBy: userId,
      createdAt: { $gte: startOfMonth },
    });

    res.json({
      success: true,
      stats: {
        totalDocuments: storageStats.totalDocuments,
        confidentialDocuments: storageStats.confidentialCount,
        totalStorageUsed: storageStats.totalSize,
        documentsThisMonth,
        byCategory: categoryBreakdown,
      },
    });
  } catch (error) {
    console.error('Get document stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message,
    });
  }
};

// Encrypt document
exports.encryptDocument = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found',
      });
    }

    // Check permissions
    if (document.uploadedBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    if (document.isEncrypted) {
      return res.status(400).json({
        success: false,
        message: 'Document is already encrypted',
      });
    }

    // Get file from S3
    const params = {
      Bucket: process.env.AWS_S3_BUCKET,
      Key: document.fileName,
    };

    const file = await s3.getObject(params).promise();

    // Encrypt file
    const { encrypted, iv, authTag } = encryptFile(file.Body);

    // Upload encrypted file back to S3
    await s3.putObject({
      ...params,
      Body: encrypted,
    }).promise();

    // Update document record
    document.isEncrypted = true;
    document.encryptionIV = iv;
    document.encryptionAuthTag = authTag;
    await document.save();

    res.json({
      success: true,
      message: 'Document encrypted successfully',
      document,
    });
  } catch (error) {
    console.error('Encrypt document error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to encrypt document',
      error: error.message,
    });
  }
};

// Generate shareable link
exports.shareDocument = async (req, res) => {
  try {
    const { expiresIn = 24 } = req.body; // Hours

    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found',
      });
    }

    // Check permissions
    if (document.uploadedBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    // Generate share token
    const shareToken = generateToken(32);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiresIn);

    document.shareToken = shareToken;
    document.shareExpiresAt = expiresAt;
    await document.save();

    const shareLink = `${process.env.DASHBOARD_URL}/shared/document/${shareToken}`;

    res.json({
      success: true,
      shareLink,
      expiresAt,
    });
  } catch (error) {
    console.error('Share document error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate share link',
      error: error.message,
    });
  }
};

// Upload new version
exports.uploadDocumentVersion = async (req, res) => {
  try {
    const parentDocument = await Document.findById(req.params.id);

    if (!parentDocument) {
      return res.status(404).json({
        success: false,
        message: 'Document not found',
      });
    }

    // Check permissions
    if (parentDocument.uploadedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    // Use multer to upload new file
    uploadToS3.single('file')(req, res, async (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message,
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded',
        });
      }

      // Create new version
      const newVersion = new Document({
        fileName: req.file.key,
        originalName: req.file.originalname,
        fileType: req.file.mimetype,
        fileSize: req.file.size,
        url: req.file.location,
        category: parentDocument.category,
        caseId: parentDocument.caseId,
        description: parentDocument.description,
        tags: parentDocument.tags,
        isConfidential: parentDocument.isConfidential,
        uploadedBy: req.user._id,
        version: parentDocument.version + 1,
        parentDocumentId: parentDocument._id,
      });

      await newVersion.save();

      res.status(201).json({
        success: true,
        message: 'New version uploaded successfully',
        document: newVersion,
      });
    });
  } catch (error) {
    console.error('Upload version error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload version',
      error: error.message,
    });
  }
};

// Get document versions
exports.getDocumentVersions = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found',
      });
    }

    // Get all versions
    const versions = await Document.find({
      $or: [
        { _id: document.parentDocumentId || document._id },
        { parentDocumentId: document.parentDocumentId || document._id },
      ],
    })
      .sort({ version: -1 })
      .populate('uploadedBy', 'fullName email');

    res.json({
      success: true,
      versions,
    });
  } catch (error) {
    console.error('Get versions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch versions',
      error: error.message,
    });
  }
};

module.exports = exports;
