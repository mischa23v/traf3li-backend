/**
 * SkillMatrix API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/skillMatrix/sfia-levels
export interface SkillMatrixListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type SkillMatrixListResponse = PaginatedResponse<SkillMatrix>;

// GET /api/skillMatrix/types
export interface SkillMatrixListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type SkillMatrixListResponse = PaginatedResponse<SkillMatrix>;

// POST /api/skillMatrix/types
export interface CreateSkillMatrixRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSkillMatrixResponse = ApiResponse<SkillMatrix>;

// PATCH /api/skillMatrix/types/:id
export interface UpdateSkillMatrixRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateSkillMatrixResponse = ApiResponse<SkillMatrix>;

// GET /api/skillMatrix/competencies
export interface SkillMatrixListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type SkillMatrixListResponse = PaginatedResponse<SkillMatrix>;

// GET /api/skillMatrix/competencies/:id
export type GetSkillMatrixResponse = ApiResponse<SkillMatrix>;

// POST /api/skillMatrix/competencies
export interface CreateSkillMatrixRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSkillMatrixResponse = ApiResponse<SkillMatrix>;

// PATCH /api/skillMatrix/competencies/:id
export interface UpdateSkillMatrixRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateSkillMatrixResponse = ApiResponse<SkillMatrix>;

// DELETE /api/skillMatrix/competencies/:id
export type DeleteSkillMatrixResponse = ApiResponse<{ deleted: boolean }>;

// GET /api/skillMatrix/assessments
export interface SkillMatrixListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type SkillMatrixListResponse = PaginatedResponse<SkillMatrix>;

// GET /api/skillMatrix/assessments/:id
export type GetSkillMatrixResponse = ApiResponse<SkillMatrix>;

// POST /api/skillMatrix/assessments
export interface CreateSkillMatrixRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSkillMatrixResponse = ApiResponse<SkillMatrix>;

// PATCH /api/skillMatrix/assessments/:id
export interface UpdateSkillMatrixRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateSkillMatrixResponse = ApiResponse<SkillMatrix>;

// POST /api/skillMatrix/assessments/:id/self-assessment
export interface CreateSkillMatrixRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSkillMatrixResponse = ApiResponse<SkillMatrix>;

// GET /api/skillMatrix/expiring-certifications
export interface SkillMatrixListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type SkillMatrixListResponse = PaginatedResponse<SkillMatrix>;

// GET /api/skillMatrix/cpd-non-compliant
export interface SkillMatrixListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type SkillMatrixListResponse = PaginatedResponse<SkillMatrix>;

// GET /api/skillMatrix/needing-review
export interface SkillMatrixListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type SkillMatrixListResponse = PaginatedResponse<SkillMatrix>;

// GET /api/skillMatrix/by-category
export interface SkillMatrixListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type SkillMatrixListResponse = PaginatedResponse<SkillMatrix>;

// GET /api/skillMatrix/stats
export interface SkillMatrixListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type SkillMatrixListResponse = PaginatedResponse<SkillMatrix>;

// GET /api/skillMatrix/matrix
export interface SkillMatrixListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type SkillMatrixListResponse = PaginatedResponse<SkillMatrix>;

// GET /api/skillMatrix/gap-analysis
export interface SkillMatrixListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type SkillMatrixListResponse = PaginatedResponse<SkillMatrix>;

// GET /api/skillMatrix
export interface SkillMatrixListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type SkillMatrixListResponse = PaginatedResponse<SkillMatrix>;

// GET /api/skillMatrix/:id
export type GetSkillMatrixResponse = ApiResponse<SkillMatrix>;

// POST /api/skillMatrix
export interface CreateSkillMatrixRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSkillMatrixResponse = ApiResponse<SkillMatrix>;

// PATCH /api/skillMatrix/:id
export interface UpdateSkillMatrixRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateSkillMatrixResponse = ApiResponse<SkillMatrix>;

// DELETE /api/skillMatrix/:id
export type DeleteSkillMatrixResponse = ApiResponse<{ deleted: boolean }>;

// POST /api/skillMatrix/assign
export interface CreateSkillMatrixRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSkillMatrixResponse = ApiResponse<SkillMatrix>;

// DELETE /api/skillMatrix/assign/:employeeId/:skillId
export type DeleteSkillMatrixResponse = ApiResponse<{ deleted: boolean }>;

// GET /api/skillMatrix/employee/:employeeId
export interface SkillMatrixListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type SkillMatrixListResponse = PaginatedResponse<SkillMatrix>;

// GET /api/skillMatrix/:skillId/employees
export interface SkillMatrixListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type SkillMatrixListResponse = PaginatedResponse<SkillMatrix>;

// POST /api/skillMatrix/verify
export interface CreateSkillMatrixRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSkillMatrixResponse = ApiResponse<SkillMatrix>;

// POST /api/skillMatrix/endorse
export interface CreateSkillMatrixRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSkillMatrixResponse = ApiResponse<SkillMatrix>;
