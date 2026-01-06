/**
 * HR Full API Contracts
 *
 * HR modules: recruitment, training, attendance, performance, succession,
 * leave management, job positions, onboarding, offboarding, shift, payroll
 *
 * Total: ~365 endpoints
 * @module HRFull
 */

// ═══════════════════════════════════════════════════════════════════════════════
// RECRUITMENT MODULE (39 endpoints)
// ═══════════════════════════════════════════════════════════════════════════════

export namespace Recruitment {
  export type JobStatus = 'draft' | 'published' | 'closed' | 'on_hold';
  export type ApplicantStage = 'new' | 'screening' | 'phone_interview' | 'technical_test' | 'interview' | 'offer' | 'hired' | 'rejected';
  export type OfferStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'negotiating' | 'expired';

  export interface JobPosting {
    _id: string;
    title: string;
    titleAr?: string;
    department: string;
    location: string;
    employmentType: 'full_time' | 'part_time' | 'contract' | 'internship';
    experienceLevel: 'entry' | 'mid' | 'senior' | 'lead' | 'executive';
    salaryRange?: { min: number; max: number; currency: string };
    description: string;
    requirements: string[];
    responsibilities: string[];
    benefits?: string[];
    skills: string[];
    status: JobStatus;
    deadline?: string;
    openings: number;
    applicantCount: number;
    firmId?: string;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
  }

  export interface Applicant {
    _id: string;
    jobId: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    resumeUrl?: string;
    linkedInUrl?: string;
    coverLetter?: string;
    stage: ApplicantStage;
    rating?: number;
    source: string;
    interviews: Interview[];
    assessments: Assessment[];
    offers: Offer[];
    references: Reference[];
    backgroundCheck?: BackgroundCheck;
    notes: ApplicantNote[];
    communications: Communication[];
    inTalentPool: boolean;
    talentPoolTags?: string[];
    firmId?: string;
    createdAt: string;
    updatedAt: string;
  }

  export interface Interview {
    _id: string;
    scheduledAt: string;
    duration: number;
    type: 'phone' | 'video' | 'in_person' | 'technical';
    interviewers: string[];
    location?: string;
    meetingLink?: string;
    status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled';
    feedback?: InterviewFeedback;
  }

  export interface InterviewFeedback {
    rating: number;
    strengths: string[];
    weaknesses: string[];
    recommendation: 'strong_hire' | 'hire' | 'no_hire' | 'strong_no_hire';
    notes: string;
    submittedBy: string;
    submittedAt: string;
  }

  export interface Assessment {
    _id: string;
    type: 'technical' | 'personality' | 'cognitive' | 'skills';
    name: string;
    sentAt: string;
    completedAt?: string;
    score?: number;
    maxScore?: number;
    results?: Record<string, unknown>;
    status: 'pending' | 'in_progress' | 'completed' | 'expired';
  }

  export interface Offer {
    _id: string;
    salary: number;
    currency: string;
    startDate: string;
    benefits: string[];
    status: OfferStatus;
    expiresAt: string;
    sentAt?: string;
    respondedAt?: string;
    negotiationNotes?: string;
  }

  export interface Reference {
    _id: string;
    name: string;
    company: string;
    position: string;
    email?: string;
    phone?: string;
    relationship: string;
    status: 'pending' | 'contacted' | 'completed';
    feedback?: string;
    rating?: number;
    checkedBy?: string;
    checkedAt?: string;
  }

  export interface BackgroundCheck {
    status: 'pending' | 'in_progress' | 'passed' | 'failed';
    provider?: string;
    initiatedAt?: string;
    completedAt?: string;
    results?: Record<string, unknown>;
  }

  export interface ApplicantNote {
    _id: string;
    text: string;
    author: string;
    createdAt: string;
  }

  export interface Communication {
    _id: string;
    type: 'email' | 'phone' | 'meeting';
    subject?: string;
    content: string;
    direction: 'inbound' | 'outbound';
    loggedBy: string;
    loggedAt: string;
  }

  export interface RecruitmentStats {
    totalJobs: number;
    activeJobs: number;
    totalApplicants: number;
    applicantsByStage: Record<ApplicantStage, number>;
    hiredThisMonth: number;
    averageTimeToHire: number;
    offerAcceptanceRate: number;
    sourceBreakdown: Record<string, number>;
  }

  export interface CreateJobRequest {
    title: string;
    titleAr?: string;
    department: string;
    location: string;
    employmentType: 'full_time' | 'part_time' | 'contract' | 'internship';
    experienceLevel: 'entry' | 'mid' | 'senior' | 'lead' | 'executive';
    salaryRange?: { min: number; max: number; currency: string };
    description: string;
    requirements: string[];
    responsibilities: string[];
    benefits?: string[];
    skills: string[];
    deadline?: string;
    openings?: number;
  }

  export interface CreateApplicantRequest {
    jobId: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    resumeUrl?: string;
    linkedInUrl?: string;
    coverLetter?: string;
    source: string;
  }

  export interface ScheduleInterviewRequest {
    scheduledAt: string;
    duration: number;
    type: 'phone' | 'video' | 'in_person' | 'technical';
    interviewers: string[];
    location?: string;
    meetingLink?: string;
  }

  export interface CreateOfferRequest {
    salary: number;
    currency: string;
    startDate: string;
    benefits: string[];
    expiresAt: string;
  }

  export interface ApiResponse<T> { success: boolean; data?: T; message?: string; }
  export interface PaginatedResponse<T> extends ApiResponse<T[]> {
    pagination: { page: number; limit: number; total: number; totalPages: number; };
  }

  // API ENDPOINTS (39)
  /** GET /api/hr/recruitment/stats */
  /** GET /api/hr/recruitment/talent-pool */
  /** GET /api/hr/recruitment/jobs/nearing-deadline */
  /** GET /api/hr/recruitment/jobs */
  /** POST /api/hr/recruitment/jobs */
  /** GET /api/hr/recruitment/jobs/:id */
  /** PATCH /api/hr/recruitment/jobs/:id */
  /** DELETE /api/hr/recruitment/jobs/:id */
  /** POST /api/hr/recruitment/jobs/:id/status */
  /** POST /api/hr/recruitment/jobs/:id/publish */
  /** POST /api/hr/recruitment/jobs/:id/clone */
  /** GET /api/hr/recruitment/jobs/:id/pipeline */
  /** POST /api/hr/recruitment/applicants/bulk-stage-update */
  /** POST /api/hr/recruitment/applicants/bulk-reject */
  /** POST /api/hr/recruitment/applicants/bulk-delete */
  /** GET /api/hr/recruitment/applicants/stats */
  /** GET /api/hr/recruitment/applicants */
  /** POST /api/hr/recruitment/applicants */
  /** GET /api/hr/recruitment/applicants/:id */
  /** PATCH /api/hr/recruitment/applicants/:id */
  /** DELETE /api/hr/recruitment/applicants/:id */
  /** POST /api/hr/recruitment/applicants/:id/stage */
  /** POST /api/hr/recruitment/applicants/:id/reject */
  /** POST /api/hr/recruitment/applicants/:id/hire */
  /** PATCH /api/hr/recruitment/applicants/:id/talent-pool */
  /** POST /api/hr/recruitment/applicants/:id/interviews */
  /** PATCH /api/hr/recruitment/applicants/:id/interviews/:interviewId */
  /** POST /api/hr/recruitment/applicants/:id/interviews/:interviewId/feedback */
  /** POST /api/hr/recruitment/applicants/:id/assessments */
  /** PATCH /api/hr/recruitment/applicants/:id/assessments/:assessmentId */
  /** POST /api/hr/recruitment/applicants/:id/offers */
  /** PATCH /api/hr/recruitment/applicants/:id/offers/:offerId */
  /** POST /api/hr/recruitment/applicants/:id/references */
  /** PATCH /api/hr/recruitment/applicants/:id/references/:referenceId */
  /** POST /api/hr/recruitment/applicants/:id/background-check */
  /** PATCH /api/hr/recruitment/applicants/:id/background-check */
  /** POST /api/hr/recruitment/applicants/:id/notes */
  /** POST /api/hr/recruitment/applicants/:id/communications */
}


// ═══════════════════════════════════════════════════════════════════════════════
// TRAINING MODULE (29 endpoints)
// ═══════════════════════════════════════════════════════════════════════════════

export namespace Training {
  export type ProgramStatus = 'draft' | 'active' | 'completed' | 'cancelled';
  export type EnrollmentStatus = 'enrolled' | 'in_progress' | 'completed' | 'dropped' | 'failed';
  export type TrainingType = 'online' | 'classroom' | 'workshop' | 'certification' | 'on_the_job';

  export interface TrainingProgram {
    _id: string;
    title: string;
    titleAr?: string;
    description: string;
    type: TrainingType;
    category: string;
    duration: number;
    durationUnit: 'hours' | 'days' | 'weeks';
    instructor?: string;
    location?: string;
    maxParticipants?: number;
    prerequisites?: string[];
    objectives: string[];
    materials?: TrainingMaterial[];
    modules?: TrainingModule[];
    status: ProgramStatus;
    startDate?: string;
    endDate?: string;
    cost?: number;
    certificationAwarded?: string;
    firmId?: string;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
  }

  export interface TrainingModule {
    _id: string;
    title: string;
    description?: string;
    duration: number;
    order: number;
    content?: string;
    quiz?: Quiz;
  }

  export interface Quiz {
    questions: QuizQuestion[];
    passingScore: number;
    timeLimit?: number;
  }

  export interface QuizQuestion {
    question: string;
    type: 'multiple_choice' | 'true_false' | 'short_answer';
    options?: string[];
    correctAnswer: string | number;
    points: number;
  }

  export interface TrainingMaterial {
    _id: string;
    title: string;
    type: 'document' | 'video' | 'link' | 'presentation';
    url: string;
    size?: number;
  }

  export interface Enrollment {
    _id: string;
    programId: string;
    userId: string;
    status: EnrollmentStatus;
    progress: number;
    enrolledAt: string;
    startedAt?: string;
    completedAt?: string;
    score?: number;
    certificateUrl?: string;
    feedback?: EnrollmentFeedback;
    moduleProgress: ModuleProgress[];
  }

  export interface ModuleProgress {
    moduleId: string;
    status: 'not_started' | 'in_progress' | 'completed';
    startedAt?: string;
    completedAt?: string;
    quizScore?: number;
  }

  export interface EnrollmentFeedback {
    rating: number;
    comments?: string;
    submittedAt: string;
  }

  export interface TrainingStats {
    totalPrograms: number;
    activePrograms: number;
    totalEnrollments: number;
    completionRate: number;
    averageScore: number;
    popularPrograms: Array<{ programId: string; title: string; enrollments: number }>;
    upcomingPrograms: number;
  }

  export interface CreateProgramRequest {
    title: string;
    titleAr?: string;
    description: string;
    type: TrainingType;
    category: string;
    duration: number;
    durationUnit: 'hours' | 'days' | 'weeks';
    instructor?: string;
    location?: string;
    maxParticipants?: number;
    prerequisites?: string[];
    objectives: string[];
    startDate?: string;
    endDate?: string;
    cost?: number;
    certificationAwarded?: string;
  }

  export interface EnrollRequest {
    userIds: string[];
    notifyUsers?: boolean;
  }

  export interface ApiResponse<T> { success: boolean; data?: T; message?: string; }

  // API ENDPOINTS (29)
  /** GET /api/training/stats */
  /** GET /api/training/pending-approvals */
  /** GET /api/training/upcoming */
  /** GET /api/training/categories */
  /** GET /api/training */
  /** POST /api/training */
  /** GET /api/training/:id */
  /** PUT /api/training/:id */
  /** DELETE /api/training/:id */
  /** POST /api/training/:id/publish */
  /** POST /api/training/:id/cancel */
  /** POST /api/training/:id/clone */
  /** GET /api/training/:id/enrollments */
  /** POST /api/training/:id/enroll */
  /** POST /api/training/:id/bulk-enroll */
  /** DELETE /api/training/:id/enrollments/:enrollmentId */
  /** PATCH /api/training/:id/enrollments/:enrollmentId/progress */
  /** POST /api/training/:id/enrollments/:enrollmentId/complete */
  /** POST /api/training/:id/enrollments/:enrollmentId/feedback */
  /** POST /api/training/:id/modules */
  /** PUT /api/training/:id/modules/:moduleId */
  /** DELETE /api/training/:id/modules/:moduleId */
  /** POST /api/training/:id/modules/:moduleId/quiz/submit */
  /** POST /api/training/:id/materials */
  /** DELETE /api/training/:id/materials/:materialId */
  /** GET /api/training/my-enrollments */
  /** GET /api/training/my-certificates */
  /** GET /api/training/recommendations */
}


// ═══════════════════════════════════════════════════════════════════════════════
// ATTENDANCE MODULE (28 endpoints)
// ═══════════════════════════════════════════════════════════════════════════════

export namespace Attendance {
  export type AttendanceStatus = 'present' | 'absent' | 'late' | 'half_day' | 'on_leave' | 'holiday';
  export type CheckType = 'check_in' | 'check_out' | 'break_start' | 'break_end';
  export type ViolationType = 'late' | 'early_leave' | 'absent' | 'overtime_unauthorized';
  export type CorrectionStatus = 'pending' | 'approved' | 'rejected';

  export interface AttendanceRecord {
    _id: string;
    userId: string;
    date: string;
    status: AttendanceStatus;
    checkIn?: string;
    checkOut?: string;
    breaks: BreakRecord[];
    workHours: number;
    overtime?: number;
    location?: AttendanceLocation;
    source: 'manual' | 'biometric' | 'mobile' | 'web';
    notes?: string;
    violations?: Violation[];
    firmId?: string;
    createdAt: string;
    updatedAt: string;
  }

  export interface BreakRecord {
    startTime: string;
    endTime?: string;
    duration?: number;
    type: 'lunch' | 'prayer' | 'personal';
  }

  export interface AttendanceLocation {
    latitude: number;
    longitude: number;
    address?: string;
    accuracy?: number;
  }

  export interface Violation {
    _id: string;
    type: ViolationType;
    description: string;
    severity: 'minor' | 'major';
    acknowledged: boolean;
    acknowledgedAt?: string;
  }

  export interface AttendanceCorrection {
    _id: string;
    attendanceId: string;
    userId: string;
    requestedField: string;
    originalValue: unknown;
    requestedValue: unknown;
    reason: string;
    status: CorrectionStatus;
    reviewedBy?: string;
    reviewedAt?: string;
    reviewNotes?: string;
    createdAt: string;
  }

  export interface AttendancePolicy {
    _id: string;
    name: string;
    workStartTime: string;
    workEndTime: string;
    lateThresholdMinutes: number;
    earlyLeaveThresholdMinutes: number;
    breakDuration: number;
    overtimeThreshold: number;
    requireGeolocation: boolean;
    allowedRadius?: number;
    officeLocation?: AttendanceLocation;
    firmId?: string;
  }

  export interface AttendanceStats {
    totalDays: number;
    presentDays: number;
    absentDays: number;
    lateDays: number;
    averageWorkHours: number;
    totalOvertime: number;
    attendanceRate: number;
    punctualityRate: number;
  }

  export interface CheckInRequest {
    location?: AttendanceLocation;
    notes?: string;
  }

  export interface CorrectionRequest {
    attendanceId: string;
    field: string;
    requestedValue: unknown;
    reason: string;
  }

  export interface ApiResponse<T> { success: boolean; data?: T; message?: string; }

  // API ENDPOINTS (28)
  /** GET /api/attendance/today */
  /** GET /api/attendance/violations */
  /** GET /api/attendance/corrections/pending */
  /** GET /api/attendance/stats */
  /** GET /api/attendance/policy */
  /** PUT /api/attendance/policy */
  /** POST /api/attendance/check-in */
  /** POST /api/attendance/check-out */
  /** POST /api/attendance/break/start */
  /** POST /api/attendance/break/end */
  /** GET /api/attendance */
  /** GET /api/attendance/user/:userId */
  /** GET /api/attendance/date/:date */
  /** GET /api/attendance/range */
  /** GET /api/attendance/:id */
  /** PUT /api/attendance/:id */
  /** DELETE /api/attendance/:id */
  /** POST /api/attendance/:id/acknowledge-violation */
  /** POST /api/attendance/corrections */
  /** GET /api/attendance/corrections */
  /** GET /api/attendance/corrections/:id */
  /** POST /api/attendance/corrections/:id/approve */
  /** POST /api/attendance/corrections/:id/reject */
  /** GET /api/attendance/report/monthly */
  /** GET /api/attendance/report/department */
  /** POST /api/attendance/bulk-import */
  /** GET /api/attendance/export */
}


// ═══════════════════════════════════════════════════════════════════════════════
// PERFORMANCE REVIEW MODULE (28 endpoints)
// ═══════════════════════════════════════════════════════════════════════════════

export namespace PerformanceReview {
  export type ReviewStatus = 'draft' | 'pending_self' | 'pending_manager' | 'pending_hr' | 'completed' | 'cancelled';
  export type ReviewPeriod = 'quarterly' | 'semi_annual' | 'annual';
  export type RatingScale = 1 | 2 | 3 | 4 | 5;

  export interface Review {
    _id: string;
    employeeId: string;
    reviewerId: string;
    period: ReviewPeriod;
    periodStart: string;
    periodEnd: string;
    status: ReviewStatus;
    selfAssessment?: Assessment;
    managerAssessment?: Assessment;
    overallRating?: RatingScale;
    strengths?: string[];
    areasForImprovement?: string[];
    goals: Goal[];
    developmentPlan?: DevelopmentPlan;
    comments?: string;
    acknowledgedByEmployee: boolean;
    acknowledgedAt?: string;
    firmId?: string;
    createdAt: string;
    updatedAt: string;
  }

  export interface Assessment {
    ratings: CompetencyRating[];
    achievements?: string[];
    challenges?: string[];
    comments?: string;
    submittedAt?: string;
  }

  export interface CompetencyRating {
    competencyId: string;
    competencyName: string;
    rating: RatingScale;
    comments?: string;
  }

  export interface Goal {
    _id: string;
    title: string;
    description?: string;
    targetDate?: string;
    status: 'not_started' | 'in_progress' | 'completed' | 'cancelled';
    progress: number;
    weight: number;
    metrics?: string;
    achievedAt?: string;
  }

  export interface DevelopmentPlan {
    objectives: DevelopmentObjective[];
    trainings?: string[];
    mentorId?: string;
    timeline?: string;
  }

  export interface DevelopmentObjective {
    title: string;
    description: string;
    targetDate: string;
    status: 'pending' | 'in_progress' | 'completed';
  }

  export interface ReviewTemplate {
    _id: string;
    name: string;
    period: ReviewPeriod;
    competencies: Competency[];
    goalWeight: number;
    competencyWeight: number;
    isDefault: boolean;
    firmId?: string;
  }

  export interface Competency {
    _id: string;
    name: string;
    description: string;
    category: string;
    weight: number;
  }

  export interface PerformanceStats {
    totalReviews: number;
    pendingReviews: number;
    overdueReviews: number;
    averageRating: number;
    ratingDistribution: Record<RatingScale, number>;
    completionRate: number;
  }

  export interface ApiResponse<T> { success: boolean; data?: T; message?: string; }

  // API ENDPOINTS (28)
  /** GET /api/performance-review/stats */
  /** GET /api/performance-review/overdue */
  /** GET /api/performance-review/templates */
  /** POST /api/performance-review/templates */
  /** GET /api/performance-review/templates/:id */
  /** PUT /api/performance-review/templates/:id */
  /** DELETE /api/performance-review/templates/:id */
  /** GET /api/performance-review/competencies */
  /** POST /api/performance-review/competencies */
  /** GET /api/performance-review */
  /** POST /api/performance-review */
  /** GET /api/performance-review/my-reviews */
  /** GET /api/performance-review/to-review */
  /** GET /api/performance-review/:id */
  /** PUT /api/performance-review/:id */
  /** DELETE /api/performance-review/:id */
  /** POST /api/performance-review/:id/self-assessment */
  /** POST /api/performance-review/:id/manager-assessment */
  /** POST /api/performance-review/:id/submit */
  /** POST /api/performance-review/:id/approve */
  /** POST /api/performance-review/:id/acknowledge */
  /** POST /api/performance-review/:id/goals */
  /** PUT /api/performance-review/:id/goals/:goalId */
  /** DELETE /api/performance-review/:id/goals/:goalId */
  /** PATCH /api/performance-review/:id/goals/:goalId/progress */
  /** POST /api/performance-review/:id/development-plan */
  /** GET /api/performance-review/report/team */
  /** GET /api/performance-review/export */
}


// ═══════════════════════════════════════════════════════════════════════════════
// SUCCESSION PLAN MODULE (27 endpoints)
// ═══════════════════════════════════════════════════════════════════════════════

export namespace SuccessionPlan {
  export type ReadinessLevel = 'ready_now' | 'ready_1_year' | 'ready_2_years' | 'development_needed';
  export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

  export interface SuccessionPlanRecord {
    _id: string;
    positionId: string;
    positionTitle: string;
    currentIncumbentId?: string;
    criticality: RiskLevel;
    riskOfVacancy: RiskLevel;
    successors: Successor[];
    developmentActions: DevelopmentAction[];
    status: 'active' | 'under_review' | 'archived';
    lastReviewDate?: string;
    nextReviewDate: string;
    notes?: string;
    firmId?: string;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
  }

  export interface Successor {
    _id: string;
    userId: string;
    readiness: ReadinessLevel;
    potentialRating: number;
    performanceRating: number;
    gaps: SkillGap[];
    developmentPlan?: string;
    order: number;
    notes?: string;
  }

  export interface SkillGap {
    skill: string;
    currentLevel: number;
    requiredLevel: number;
    developmentNeeded: string;
  }

  export interface DevelopmentAction {
    _id: string;
    successorId: string;
    action: string;
    type: 'training' | 'mentoring' | 'assignment' | 'coaching' | 'certification';
    targetDate: string;
    status: 'pending' | 'in_progress' | 'completed';
    completedAt?: string;
  }

  export interface SuccessionStats {
    totalPlans: number;
    criticalPositions: number;
    highRiskPositions: number;
    averageSuccessorsPerPlan: number;
    readyNowSuccessors: number;
    plansNeedingReview: number;
  }

  export interface ApiResponse<T> { success: boolean; data?: T; message?: string; }

  // API ENDPOINTS (27)
  /** GET /api/succession-plan/stats */
  /** GET /api/succession-plan/review-due */
  /** GET /api/succession-plan/high-risk */
  /** GET /api/succession-plan/critical-positions */
  /** GET /api/succession-plan */
  /** POST /api/succession-plan */
  /** GET /api/succession-plan/:id */
  /** PUT /api/succession-plan/:id */
  /** DELETE /api/succession-plan/:id */
  /** POST /api/succession-plan/:id/successors */
  /** PUT /api/succession-plan/:id/successors/:successorId */
  /** DELETE /api/succession-plan/:id/successors/:successorId */
  /** PATCH /api/succession-plan/:id/successors/reorder */
  /** POST /api/succession-plan/:id/development-actions */
  /** PUT /api/succession-plan/:id/development-actions/:actionId */
  /** DELETE /api/succession-plan/:id/development-actions/:actionId */
  /** PATCH /api/succession-plan/:id/development-actions/:actionId/complete */
  /** POST /api/succession-plan/:id/review */
  /** GET /api/succession-plan/talent-pool */
  /** GET /api/succession-plan/user/:userId/nominations */
  /** GET /api/succession-plan/position/:positionId */
  /** GET /api/succession-plan/report/readiness */
  /** GET /api/succession-plan/report/risk */
  /** GET /api/succession-plan/report/gaps */
  /** GET /api/succession-plan/export */
  /** POST /api/succession-plan/bulk-delete */
}


// ═══════════════════════════════════════════════════════════════════════════════
// LEAVE MANAGEMENT MODULE (26 endpoints)
// ═══════════════════════════════════════════════════════════════════════════════

export namespace LeaveManagement {
  export type LeaveType = 'annual' | 'sick' | 'maternity' | 'paternity' | 'bereavement' | 'unpaid' | 'hajj' | 'marriage';
  export type AccrualMethod = 'annual' | 'monthly' | 'per_period';

  export interface LeavePeriod {
    _id: string;
    name: string;
    startDate: string;
    endDate: string;
    isActive: boolean;
    isCurrent: boolean;
    carryOverLimit?: number;
    expirationPolicy?: { enabled: boolean; expiresAfterMonths: number };
    firmId?: string;
    createdAt: string;
  }

  export interface LeavePolicy {
    _id: string;
    leaveType: LeaveType;
    name: string;
    nameAr?: string;
    description?: string;
    daysPerYear: number;
    accrualMethod: AccrualMethod;
    carryOverAllowed: boolean;
    maxCarryOver?: number;
    requiresApproval: boolean;
    minNoticeDays?: number;
    maxConsecutiveDays?: number;
    applicableTo: 'all' | 'specific';
    applicableRoles?: string[];
    isPaid: boolean;
    firmId?: string;
  }

  export interface LeaveBalance {
    _id: string;
    userId: string;
    periodId: string;
    leaveType: LeaveType;
    entitled: number;
    used: number;
    pending: number;
    available: number;
    carriedOver: number;
    adjustments: BalanceAdjustment[];
  }

  export interface BalanceAdjustment {
    _id: string;
    days: number;
    reason: string;
    adjustedBy: string;
    adjustedAt: string;
  }

  export interface LeaveStats {
    totalRequests: number;
    pendingRequests: number;
    approvedRequests: number;
    byType: Record<LeaveType, { used: number; pending: number }>;
    upcomingLeaves: number;
    teamOnLeave: number;
  }

  export interface ApiResponse<T> { success: boolean; data?: T; message?: string; }

  // API ENDPOINTS (26)
  /** GET /api/leave-management/leave-periods */
  /** GET /api/leave-management/leave-periods/current */
  /** GET /api/leave-management/leave-periods/:id */
  /** POST /api/leave-management/leave-periods */
  /** PUT /api/leave-management/leave-periods/:id */
  /** DELETE /api/leave-management/leave-periods/:id */
  /** POST /api/leave-management/leave-periods/:id/activate */
  /** GET /api/leave-management/policies */
  /** POST /api/leave-management/policies */
  /** GET /api/leave-management/policies/:id */
  /** PUT /api/leave-management/policies/:id */
  /** DELETE /api/leave-management/policies/:id */
  /** GET /api/leave-management/balances */
  /** GET /api/leave-management/balances/user/:userId */
  /** GET /api/leave-management/balances/:id */
  /** POST /api/leave-management/balances/:id/adjust */
  /** POST /api/leave-management/balances/recalculate */
  /** GET /api/leave-management/stats */
  /** GET /api/leave-management/calendar */
  /** GET /api/leave-management/team-calendar */
  /** GET /api/leave-management/holidays */
  /** POST /api/leave-management/holidays */
  /** DELETE /api/leave-management/holidays/:id */
  /** GET /api/leave-management/report/usage */
  /** GET /api/leave-management/export */
}


// ═══════════════════════════════════════════════════════════════════════════════
// ADDITIONAL HR MODULES (Condensed)
// ═══════════════════════════════════════════════════════════════════════════════

export namespace JobPosition {
  export interface Position {
    _id: string;
    title: string;
    titleAr?: string;
    department: string;
    level: string;
    reportsTo?: string;
    isVacant: boolean;
    headcount: number;
    filledCount: number;
    description?: string;
    requirements?: string[];
    salaryRange?: { min: number; max: number };
    firmId?: string;
  }

  // 25 endpoints: stats, vacant, org-chart, CRUD, etc.
}

export namespace Onboarding {
  export type OnboardingStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

  export interface OnboardingRecord {
    _id: string;
    employeeId: string;
    templateId?: string;
    status: OnboardingStatus;
    startDate: string;
    targetCompletionDate: string;
    tasks: OnboardingTask[];
    mentor?: string;
    progress: number;
    firmId?: string;
  }

  export interface OnboardingTask {
    _id: string;
    title: string;
    description?: string;
    assignedTo: string;
    dueDate?: string;
    status: 'pending' | 'completed';
    completedAt?: string;
    order: number;
  }

  // 22 endpoints: stats, upcoming-reviews, templates, CRUD, etc.
}

export namespace Offboarding {
  export type OffboardingStatus = 'pending' | 'in_progress' | 'completed';

  export interface OffboardingRecord {
    _id: string;
    employeeId: string;
    lastWorkingDay: string;
    reason: 'resignation' | 'termination' | 'retirement' | 'contract_end';
    status: OffboardingStatus;
    exitInterviewDate?: string;
    exitInterviewNotes?: string;
    clearances: Clearance[];
    settlement?: Settlement;
    firmId?: string;
  }

  export interface Clearance {
    department: string;
    status: 'pending' | 'cleared';
    clearedBy?: string;
    clearedAt?: string;
    notes?: string;
  }

  export interface Settlement {
    finalSalary: number;
    leaveEncashment: number;
    gratuity: number;
    deductions: number;
    netPayable: number;
    status: 'pending' | 'processed' | 'paid';
  }

  // 21 endpoints: stats, pending-clearances, pending-settlements, CRUD, etc.
}

export namespace Shift {
  export interface ShiftType {
    _id: string;
    name: string;
    startTime: string;
    endTime: string;
    breakDuration: number;
    workingHours: number;
    isDefault: boolean;
    firmId?: string;
  }

  export interface ShiftAssignment {
    _id: string;
    userId: string;
    shiftTypeId: string;
    startDate: string;
    endDate?: string;
    isRecurring: boolean;
    daysOfWeek?: number[];
  }

  // 17 endpoints: shift-types, assignments, schedules, etc.
}

export namespace Payroll {
  export interface PayrollRecord {
    _id: string;
    employeeId: string;
    periodStart: string;
    periodEnd: string;
    basicSalary: number;
    allowances: { name: string; amount: number }[];
    deductions: { name: string; amount: number }[];
    overtime: number;
    grossSalary: number;
    netSalary: number;
    status: 'draft' | 'pending' | 'approved' | 'paid';
    firmId?: string;
  }

  // 13 endpoints: stats, generate, approve, process, etc.
}

export namespace PayrollRun {
  export interface PayrollRunRecord {
    _id: string;
    periodStart: string;
    periodEnd: string;
    status: 'draft' | 'calculating' | 'pending_approval' | 'approved' | 'processing' | 'completed';
    employeeCount: number;
    totalGross: number;
    totalNet: number;
    createdBy: string;
    approvedBy?: string;
    firmId?: string;
  }

  // 20 endpoints: stats, bulk-delete, CRUD, calculate, approve, etc.
}

export namespace LeaveRequest {
  export type LeaveRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

  export interface LeaveRequestRecord {
    _id: string;
    userId: string;
    leaveType: string;
    startDate: string;
    endDate: string;
    days: number;
    reason?: string;
    status: LeaveRequestStatus;
    approvedBy?: string;
    approvedAt?: string;
    rejectionReason?: string;
    attachments?: string[];
    firmId?: string;
  }

  // 20 endpoints: types, stats, calendar, CRUD, approve, reject, etc.
}


/**
 * HR FULL API CONTRACTS SUMMARY
 *
 * Total Modules: 14
 * Total Endpoints: ~365
 *
 * Breakdown:
 * - Recruitment: 39 endpoints
 * - Training: 29 endpoints
 * - Attendance: 28 endpoints
 * - PerformanceReview: 28 endpoints
 * - SuccessionPlan: 27 endpoints
 * - LeaveManagement: 26 endpoints
 * - JobPosition: 25 endpoints
 * - Onboarding: 22 endpoints
 * - Offboarding: 21 endpoints
 * - PayrollRun: 20 endpoints
 * - LeaveRequest: 20 endpoints
 * - Shift: 17 endpoints
 * - Payroll: 13 endpoints
 * - HRExtended: 49 endpoints (documented in finance-hr-extended.ts)
 */
