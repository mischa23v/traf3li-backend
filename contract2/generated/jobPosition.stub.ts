/**
 * JobPosition API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/jobPosition/stats
export interface JobPositionListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type JobPositionListResponse = PaginatedResponse<JobPosition>;

// GET /api/jobPosition/vacant
export interface JobPositionListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type JobPositionListResponse = PaginatedResponse<JobPosition>;

// GET /api/jobPosition/org-chart
export interface JobPositionListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type JobPositionListResponse = PaginatedResponse<JobPosition>;

// GET /api/jobPosition/export
export interface JobPositionListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type JobPositionListResponse = PaginatedResponse<JobPosition>;

// GET /api/jobPosition
export interface JobPositionListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type JobPositionListResponse = PaginatedResponse<JobPosition>;

// POST /api/jobPosition
export interface CreateJobPositionRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateJobPositionResponse = ApiResponse<JobPosition>;

// POST /api/jobPosition/bulk-delete
export interface CreateJobPositionRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateJobPositionResponse = ApiResponse<JobPosition>;

// GET /api/jobPosition/department/:departmentId
export interface JobPositionListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type JobPositionListResponse = PaginatedResponse<JobPosition>;

// GET /api/jobPosition/:id
export type GetJobPositionResponse = ApiResponse<JobPosition>;

// PATCH /api/jobPosition/:id
export interface UpdateJobPositionRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateJobPositionResponse = ApiResponse<JobPosition>;

// PUT /api/jobPosition/:id
export interface UpdateJobPositionRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateJobPositionResponse = ApiResponse<JobPosition>;

// DELETE /api/jobPosition/:id
export type DeleteJobPositionResponse = ApiResponse<{ deleted: boolean }>;

// GET /api/jobPosition/:id/hierarchy
export type GetJobPositionResponse = ApiResponse<JobPosition>;

// POST /api/jobPosition/:id/freeze
export interface CreateJobPositionRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateJobPositionResponse = ApiResponse<JobPosition>;

// POST /api/jobPosition/:id/unfreeze
export interface CreateJobPositionRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateJobPositionResponse = ApiResponse<JobPosition>;

// POST /api/jobPosition/:id/eliminate
export interface CreateJobPositionRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateJobPositionResponse = ApiResponse<JobPosition>;

// POST /api/jobPosition/:id/vacant
export interface CreateJobPositionRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateJobPositionResponse = ApiResponse<JobPosition>;

// POST /api/jobPosition/:id/fill
export interface CreateJobPositionRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateJobPositionResponse = ApiResponse<JobPosition>;

// POST /api/jobPosition/:id/vacate
export interface CreateJobPositionRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateJobPositionResponse = ApiResponse<JobPosition>;

// POST /api/jobPosition/:id/clone
export interface CreateJobPositionRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateJobPositionResponse = ApiResponse<JobPosition>;

// PUT /api/jobPosition/:id/responsibilities
export interface UpdateJobPositionRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateJobPositionResponse = ApiResponse<JobPosition>;

// PUT /api/jobPosition/:id/qualifications
export interface UpdateJobPositionRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateJobPositionResponse = ApiResponse<JobPosition>;

// PUT /api/jobPosition/:id/salary-range
export interface UpdateJobPositionRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateJobPositionResponse = ApiResponse<JobPosition>;

// PUT /api/jobPosition/:id/competencies
export interface UpdateJobPositionRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateJobPositionResponse = ApiResponse<JobPosition>;

// POST /api/jobPosition/:id/documents
export interface CreateJobPositionRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateJobPositionResponse = ApiResponse<JobPosition>;
