const express = require('express');
const {
    createEvaluation,
    getEvaluations,
    getEvaluation,
    updateEvaluation,
    addGoal,
    updateGoal,
    addCompetency,
    addFeedback,
    submitSelfAssessment,
    submitEvaluation,
    completeEvaluation,
    acknowledgeEvaluation,
    getEvaluationHistory,
    getPendingEvaluations,
    getEvaluationStats,
    deleteEvaluation
} = require('../controllers/evaluation.controller');
const userMiddleware = require('../middlewares/userMiddleware');

const router = express.Router();

// Stats & special routes (place before :id routes)
router.get('/pending', userMiddleware, getPendingEvaluations);
router.get('/stats', userMiddleware, getEvaluationStats);
router.get('/employee/:employeeId/history', userMiddleware, getEvaluationHistory);

// CRUD operations
router.post('/', userMiddleware, createEvaluation);
router.get('/', userMiddleware, getEvaluations);
router.get('/:id', userMiddleware, getEvaluation);
router.put('/:id', userMiddleware, updateEvaluation);
router.delete('/:id', userMiddleware, deleteEvaluation);

// Goals management
router.post('/:id/goals', userMiddleware, addGoal);
router.patch('/:id/goals/:goalId', userMiddleware, updateGoal);

// Competencies
router.post('/:id/competencies', userMiddleware, addCompetency);

// 360 Feedback
router.post('/:id/feedback', userMiddleware, addFeedback);

// Self assessment
router.post('/:id/self-assessment', userMiddleware, submitSelfAssessment);

// Workflow actions
router.post('/:id/submit', userMiddleware, submitEvaluation);
router.post('/:id/complete', userMiddleware, completeEvaluation);
router.post('/:id/acknowledge', userMiddleware, acknowledgeEvaluation);

module.exports = router;
