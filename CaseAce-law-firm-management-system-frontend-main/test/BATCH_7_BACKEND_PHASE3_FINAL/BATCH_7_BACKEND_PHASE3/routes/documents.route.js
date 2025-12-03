const express = require('express');
const router = express.Router();
const documentsController = require('../controllers/documents.controller');
const { authenticate } = require('../middlewares/authenticate');

// Upload document
router.post(
  '/upload',
  authenticate,
  documentsController.uploadDocument
);

// Get all documents with filters
router.get(
  '/',
  authenticate,
  documentsController.getDocuments
);

// Get document statistics
router.get(
  '/stats',
  authenticate,
  documentsController.getDocumentStats
);

// Get recent documents
router.get(
  '/recent',
  authenticate,
  documentsController.getDocuments // Reuse with limit
);

// Search documents
router.get(
  '/search',
  authenticate,
  documentsController.getDocuments // Uses text search
);

// Get documents by case
router.get(
  '/case/:caseId',
  authenticate,
  documentsController.getDocumentsByCase
);

// Get single document
router.get(
  '/:id',
  authenticate,
  documentsController.getDocument
);

// Update document metadata
router.put(
  '/:id',
  authenticate,
  documentsController.updateDocument
);

// Delete document
router.delete(
  '/:id',
  authenticate,
  documentsController.deleteDocument
);

// Download document
router.get(
  '/:id/download',
  authenticate,
  documentsController.downloadDocument
);

// Share document (generate shareable link)
router.post(
  '/:id/share',
  authenticate,
  documentsController.shareDocument
);

// Encrypt document
router.post(
  '/:id/encrypt',
  authenticate,
  documentsController.encryptDocument
);

// Upload new version
router.post(
  '/:id/version',
  authenticate,
  documentsController.uploadDocumentVersion
);

// Get all versions of a document
router.get(
  '/:id/versions',
  authenticate,
  documentsController.getDocumentVersions
);

// Bulk delete (optional - add to controller if needed)
// router.post(
//   '/bulk-delete',
//   authenticate,
//   documentsController.bulkDeleteDocuments
// );

module.exports = router;
