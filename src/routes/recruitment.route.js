const express = require('express');
const router = express.Router();
const recruitmentController = require('../controllers/recruitment.controller');
const { verifyToken } = require('../middlewares/jwt');
const { attachFirmContext } = require('../middlewares/firmContext.middleware');
const { apiRateLimiter } = require('../middlewares/rateLimiter.middleware');

/**
 * Recruitment Routes
 * MODULE 7: التوظيف ونظام تتبع المتقدمين (Recruitment & ATS)
 * Base path: /api/hr/recruitment
 */

// Apply authentication middleware to all routes
router.use(verifyToken);
router.use(attachFirmContext);
router.use(apiRateLimiter);

// ═══════════════════════════════════════════════════════════════
// STATISTICS (must be before :id routes)
// ═══════════════════════════════════════════════════════════════

// GET /api/hr/recruitment/stats - Get recruitment statistics
router.get('/stats', recruitmentController.getRecruitmentStats);

// ═══════════════════════════════════════════════════════════════
// TALENT POOL ROUTES (must be before :id routes)
// ═══════════════════════════════════════════════════════════════

// GET /api/hr/recruitment/talent-pool - Get talent pool
router.get('/talent-pool', recruitmentController.getTalentPool);

// ═══════════════════════════════════════════════════════════════
// JOB POSTING SPECIAL ROUTES (must be before :id routes)
// ═══════════════════════════════════════════════════════════════

// GET /api/hr/recruitment/jobs/nearing-deadline - Get jobs nearing deadline
router.get('/jobs/nearing-deadline', recruitmentController.getJobsNearingDeadline);

// GET /api/hr/recruitment/jobs/stats - Alias for frontend (maps to /stats)
router.get('/jobs/stats', recruitmentController.getRecruitmentStats);

// ═══════════════════════════════════════════════════════════════
// JOB POSTING CRUD ROUTES
// ═══════════════════════════════════════════════════════════════

// GET /api/hr/recruitment/jobs - Get all job postings
router.get('/jobs', recruitmentController.getJobPostings);

// POST /api/hr/recruitment/jobs - Create new job posting
router.post('/jobs', recruitmentController.createJobPosting);

// GET /api/hr/recruitment/jobs/:id - Get single job posting
router.get('/jobs/:id', recruitmentController.getJobPostingById);

// PATCH /api/hr/recruitment/jobs/:id - Update job posting
router.patch('/jobs/:id', recruitmentController.updateJobPosting);

// DELETE /api/hr/recruitment/jobs/:id - Delete job posting
router.delete('/jobs/:id', recruitmentController.deleteJobPosting);

// ═══════════════════════════════════════════════════════════════
// JOB POSTING ACTION ROUTES
// ═══════════════════════════════════════════════════════════════

// POST /api/hr/recruitment/jobs/:id/status - Change job status
router.post('/jobs/:id/status', recruitmentController.changeJobStatus);

// POST /api/hr/recruitment/jobs/:id/publish - Publish job
router.post('/jobs/:id/publish', recruitmentController.publishJob);

// POST /api/hr/recruitment/jobs/:id/clone - Clone job posting
router.post('/jobs/:id/clone', recruitmentController.cloneJob);

// GET /api/hr/recruitment/jobs/:id/pipeline - Get job pipeline with applicants
router.get('/jobs/:id/pipeline', recruitmentController.getJobPipeline);

// ═══════════════════════════════════════════════════════════════
// APPLICANT BULK OPERATIONS (must be before :id routes)
// ═══════════════════════════════════════════════════════════════

// POST /api/hr/recruitment/applicants/bulk-stage-update - Bulk update stages
router.post('/applicants/bulk-stage-update', recruitmentController.bulkUpdateStage);

// POST /api/hr/recruitment/applicants/bulk-reject - Bulk reject applicants
router.post('/applicants/bulk-reject', recruitmentController.bulkReject);

// POST /api/hr/recruitment/applicants/bulk-delete - Bulk delete applicants
router.post('/applicants/bulk-delete', recruitmentController.bulkDeleteApplicants);

// GET /api/hr/recruitment/applicants/stats - Get applicant statistics (must be before :id)
router.get('/applicants/stats', recruitmentController.getApplicantStats);

// ═══════════════════════════════════════════════════════════════
// APPLICANT CRUD ROUTES
// ═══════════════════════════════════════════════════════════════

// GET /api/hr/recruitment/applicants - Get all applicants
router.get('/applicants', recruitmentController.getApplicants);

// POST /api/hr/recruitment/applicants - Create new applicant
router.post('/applicants', recruitmentController.createApplicant);

// GET /api/hr/recruitment/applicants/:id - Get single applicant
router.get('/applicants/:id', recruitmentController.getApplicantById);

// PATCH /api/hr/recruitment/applicants/:id - Update applicant
router.patch('/applicants/:id', recruitmentController.updateApplicant);

// DELETE /api/hr/recruitment/applicants/:id - Delete applicant
router.delete('/applicants/:id', recruitmentController.deleteApplicant);

// ═══════════════════════════════════════════════════════════════
// APPLICANT PIPELINE ROUTES
// ═══════════════════════════════════════════════════════════════

// POST /api/hr/recruitment/applicants/:id/stage - Update applicant stage
router.post('/applicants/:id/stage', recruitmentController.updateApplicantStage);

// POST /api/hr/recruitment/applicants/:id/reject - Reject applicant
router.post('/applicants/:id/reject', recruitmentController.rejectApplicant);

// POST /api/hr/recruitment/applicants/:id/hire - Hire applicant
router.post('/applicants/:id/hire', recruitmentController.hireApplicant);

// ═══════════════════════════════════════════════════════════════
// APPLICANT TALENT POOL ROUTES
// ═══════════════════════════════════════════════════════════════

// PATCH /api/hr/recruitment/applicants/:id/talent-pool - Update talent pool status
router.patch('/applicants/:id/talent-pool', recruitmentController.updateTalentPoolStatus);

// ═══════════════════════════════════════════════════════════════
// INTERVIEW ROUTES
// ═══════════════════════════════════════════════════════════════

// POST /api/hr/recruitment/applicants/:id/interviews - Schedule interview
router.post('/applicants/:id/interviews', recruitmentController.scheduleInterview);

// PATCH /api/hr/recruitment/applicants/:id/interviews/:interviewId - Update interview
router.patch('/applicants/:id/interviews/:interviewId', recruitmentController.updateInterview);

// POST /api/hr/recruitment/applicants/:id/interviews/:interviewId/feedback - Submit interview feedback
router.post('/applicants/:id/interviews/:interviewId/feedback', recruitmentController.submitInterviewFeedback);

// ═══════════════════════════════════════════════════════════════
// ASSESSMENT ROUTES
// ═══════════════════════════════════════════════════════════════

// POST /api/hr/recruitment/applicants/:id/assessments - Send assessment
router.post('/applicants/:id/assessments', recruitmentController.sendAssessment);

// PATCH /api/hr/recruitment/applicants/:id/assessments/:assessmentId - Update assessment result
router.patch('/applicants/:id/assessments/:assessmentId', recruitmentController.updateAssessmentResult);

// ═══════════════════════════════════════════════════════════════
// OFFER ROUTES
// ═══════════════════════════════════════════════════════════════

// POST /api/hr/recruitment/applicants/:id/offers - Create offer
router.post('/applicants/:id/offers', recruitmentController.createOffer);

// PATCH /api/hr/recruitment/applicants/:id/offers/:offerId - Update offer
router.patch('/applicants/:id/offers/:offerId', recruitmentController.updateOffer);

// ═══════════════════════════════════════════════════════════════
// REFERENCE CHECK ROUTES
// ═══════════════════════════════════════════════════════════════

// POST /api/hr/recruitment/applicants/:id/references - Add reference
router.post('/applicants/:id/references', recruitmentController.addReference);

// PATCH /api/hr/recruitment/applicants/:id/references/:referenceId - Update reference check
router.patch('/applicants/:id/references/:referenceId', recruitmentController.updateReferenceCheck);

// ═══════════════════════════════════════════════════════════════
// BACKGROUND CHECK ROUTES
// ═══════════════════════════════════════════════════════════════

// POST /api/hr/recruitment/applicants/:id/background-check - Initiate background check
router.post('/applicants/:id/background-check', recruitmentController.initiateBackgroundCheck);

// PATCH /api/hr/recruitment/applicants/:id/background-check - Update background check
router.patch('/applicants/:id/background-check', recruitmentController.updateBackgroundCheck);

// ═══════════════════════════════════════════════════════════════
// NOTES & COMMUNICATION ROUTES
// ═══════════════════════════════════════════════════════════════

// POST /api/hr/recruitment/applicants/:id/notes - Add note
router.post('/applicants/:id/notes', recruitmentController.addNote);

// POST /api/hr/recruitment/applicants/:id/communications - Log communication
router.post('/applicants/:id/communications', recruitmentController.logCommunication);

module.exports = router;
