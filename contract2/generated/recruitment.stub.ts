/**
 * Recruitment API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/recruitment/stats
export interface RecruitmentListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type RecruitmentListResponse = PaginatedResponse<Recruitment>;

// GET /api/recruitment/talent-pool
export interface RecruitmentListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type RecruitmentListResponse = PaginatedResponse<Recruitment>;

// GET /api/recruitment/jobs/nearing-deadline
export interface RecruitmentListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type RecruitmentListResponse = PaginatedResponse<Recruitment>;

// GET /api/recruitment/jobs/stats
export interface RecruitmentListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type RecruitmentListResponse = PaginatedResponse<Recruitment>;

// GET /api/recruitment/jobs
export interface RecruitmentListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type RecruitmentListResponse = PaginatedResponse<Recruitment>;

// POST /api/recruitment/jobs
export interface CreateRecruitmentRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateRecruitmentResponse = ApiResponse<Recruitment>;

// GET /api/recruitment/jobs/:id
export type GetRecruitmentResponse = ApiResponse<Recruitment>;

// PATCH /api/recruitment/jobs/:id
export interface UpdateRecruitmentRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateRecruitmentResponse = ApiResponse<Recruitment>;

// DELETE /api/recruitment/jobs/:id
export type DeleteRecruitmentResponse = ApiResponse<{ deleted: boolean }>;

// POST /api/recruitment/jobs/:id/status
export interface CreateRecruitmentRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateRecruitmentResponse = ApiResponse<Recruitment>;

// POST /api/recruitment/jobs/:id/publish
export interface CreateRecruitmentRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateRecruitmentResponse = ApiResponse<Recruitment>;

// POST /api/recruitment/jobs/:id/clone
export interface CreateRecruitmentRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateRecruitmentResponse = ApiResponse<Recruitment>;

// GET /api/recruitment/jobs/:id/pipeline
export type GetRecruitmentResponse = ApiResponse<Recruitment>;

// POST /api/recruitment/applicants/bulk-stage-update
export interface CreateRecruitmentRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateRecruitmentResponse = ApiResponse<Recruitment>;

// POST /api/recruitment/applicants/bulk-reject
export interface CreateRecruitmentRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateRecruitmentResponse = ApiResponse<Recruitment>;

// POST /api/recruitment/applicants/bulk-delete
export interface CreateRecruitmentRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateRecruitmentResponse = ApiResponse<Recruitment>;

// GET /api/recruitment/applicants/stats
export interface RecruitmentListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type RecruitmentListResponse = PaginatedResponse<Recruitment>;

// GET /api/recruitment/applicants
export interface RecruitmentListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type RecruitmentListResponse = PaginatedResponse<Recruitment>;

// POST /api/recruitment/applicants
export interface CreateRecruitmentRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateRecruitmentResponse = ApiResponse<Recruitment>;

// GET /api/recruitment/applicants/:id
export type GetRecruitmentResponse = ApiResponse<Recruitment>;

// PATCH /api/recruitment/applicants/:id
export interface UpdateRecruitmentRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateRecruitmentResponse = ApiResponse<Recruitment>;

// DELETE /api/recruitment/applicants/:id
export type DeleteRecruitmentResponse = ApiResponse<{ deleted: boolean }>;

// POST /api/recruitment/applicants/:id/stage
export interface CreateRecruitmentRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateRecruitmentResponse = ApiResponse<Recruitment>;

// POST /api/recruitment/applicants/:id/reject
export interface CreateRecruitmentRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateRecruitmentResponse = ApiResponse<Recruitment>;

// POST /api/recruitment/applicants/:id/hire
export interface CreateRecruitmentRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateRecruitmentResponse = ApiResponse<Recruitment>;

// PATCH /api/recruitment/applicants/:id/talent-pool
export interface UpdateRecruitmentRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateRecruitmentResponse = ApiResponse<Recruitment>;

// POST /api/recruitment/applicants/:id/interviews
export interface CreateRecruitmentRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateRecruitmentResponse = ApiResponse<Recruitment>;

// PATCH /api/recruitment/applicants/:id/interviews/:interviewId
export interface UpdateRecruitmentRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateRecruitmentResponse = ApiResponse<Recruitment>;

// POST /api/recruitment/applicants/:id/interviews/:interviewId/feedback
export interface CreateRecruitmentRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateRecruitmentResponse = ApiResponse<Recruitment>;

// POST /api/recruitment/applicants/:id/assessments
export interface CreateRecruitmentRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateRecruitmentResponse = ApiResponse<Recruitment>;

// PATCH /api/recruitment/applicants/:id/assessments/:assessmentId
export interface UpdateRecruitmentRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateRecruitmentResponse = ApiResponse<Recruitment>;

// POST /api/recruitment/applicants/:id/offers
export interface CreateRecruitmentRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateRecruitmentResponse = ApiResponse<Recruitment>;

// PATCH /api/recruitment/applicants/:id/offers/:offerId
export interface UpdateRecruitmentRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateRecruitmentResponse = ApiResponse<Recruitment>;

// POST /api/recruitment/applicants/:id/references
export interface CreateRecruitmentRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateRecruitmentResponse = ApiResponse<Recruitment>;

// PATCH /api/recruitment/applicants/:id/references/:referenceId
export interface UpdateRecruitmentRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateRecruitmentResponse = ApiResponse<Recruitment>;

// POST /api/recruitment/applicants/:id/background-check
export interface CreateRecruitmentRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateRecruitmentResponse = ApiResponse<Recruitment>;

// PATCH /api/recruitment/applicants/:id/background-check
export interface UpdateRecruitmentRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateRecruitmentResponse = ApiResponse<Recruitment>;

// POST /api/recruitment/applicants/:id/notes
export interface CreateRecruitmentRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateRecruitmentResponse = ApiResponse<Recruitment>;

// POST /api/recruitment/applicants/:id/communications
export interface CreateRecruitmentRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateRecruitmentResponse = ApiResponse<Recruitment>;
