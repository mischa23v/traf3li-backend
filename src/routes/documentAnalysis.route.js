const express = require('express');
const { userMiddleware } = require('../middlewares');
const { apiRateLimiter } = require('../middlewares/rateLimiter.middleware');
const {
  analyzeDocument,
  getAnalysis,
  deleteAnalysis,
  reanalyzeDocument,
  getAnalysisStatus,
  batchAnalyze,
  semanticSearch,
  findSimilar,
  generateReport,
  getAnalysisHistory,
  getStats
} = require('../controllers/documentAnalysis.controller');

const app = express.Router();

app.use(apiRateLimiter);

// Stats and search (must be before :documentId routes)
app.get('/stats', userMiddleware, getStats);
app.get('/search', userMiddleware, semanticSearch);

// Batch operations
app.post('/batch', userMiddleware, batchAnalyze);

// Document-specific operations
app.post('/:documentId', userMiddleware, analyzeDocument);
app.get('/:documentId', userMiddleware, getAnalysis);
app.delete('/:documentId', userMiddleware, deleteAnalysis);

// Re-analyze
app.post('/:documentId/reanalyze', userMiddleware, reanalyzeDocument);

// Status
app.get('/:documentId/status', userMiddleware, getAnalysisStatus);

// History
app.get('/:documentId/history', userMiddleware, getAnalysisHistory);

// Similar documents
app.get('/:documentId/similar', userMiddleware, findSimilar);

// Report generation
app.get('/:documentId/report', userMiddleware, generateReport);

module.exports = app;
