/**
 * SuccessionPlan API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/successionPlan/stats
export interface SuccessionPlanListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type SuccessionPlanListResponse = PaginatedResponse<SuccessionPlan>;

// GET /api/successionPlan/review-due
export interface SuccessionPlanListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type SuccessionPlanListResponse = PaginatedResponse<SuccessionPlan>;

// GET /api/successionPlan/high-risk
export interface SuccessionPlanListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type SuccessionPlanListResponse = PaginatedResponse<SuccessionPlan>;

// GET /api/successionPlan/critical-without-successors
export interface SuccessionPlanListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type SuccessionPlanListResponse = PaginatedResponse<SuccessionPlan>;

// GET /api/successionPlan/export
export interface SuccessionPlanListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type SuccessionPlanListResponse = PaginatedResponse<SuccessionPlan>;

// GET /api/successionPlan
export interface SuccessionPlanListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type SuccessionPlanListResponse = PaginatedResponse<SuccessionPlan>;

// POST /api/successionPlan
export interface CreateSuccessionPlanRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSuccessionPlanResponse = ApiResponse<SuccessionPlan>;

// POST /api/successionPlan/bulk-delete
export interface CreateSuccessionPlanRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSuccessionPlanResponse = ApiResponse<SuccessionPlan>;

// GET /api/successionPlan/by-position/:positionId
export interface SuccessionPlanListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type SuccessionPlanListResponse = PaginatedResponse<SuccessionPlan>;

// GET /api/successionPlan/by-incumbent/:incumbentId
export interface SuccessionPlanListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type SuccessionPlanListResponse = PaginatedResponse<SuccessionPlan>;

// GET /api/successionPlan/:id
export type GetSuccessionPlanResponse = ApiResponse<SuccessionPlan>;

// PATCH /api/successionPlan/:id
export interface UpdateSuccessionPlanRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateSuccessionPlanResponse = ApiResponse<SuccessionPlan>;

// DELETE /api/successionPlan/:id
export type DeleteSuccessionPlanResponse = ApiResponse<{ deleted: boolean }>;

// POST /api/successionPlan/:id/submit-for-approval
export interface CreateSuccessionPlanRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSuccessionPlanResponse = ApiResponse<SuccessionPlan>;

// POST /api/successionPlan/:id/approve
export interface CreateSuccessionPlanRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSuccessionPlanResponse = ApiResponse<SuccessionPlan>;

// POST /api/successionPlan/:id/reject
export interface CreateSuccessionPlanRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSuccessionPlanResponse = ApiResponse<SuccessionPlan>;

// POST /api/successionPlan/:id/activate
export interface CreateSuccessionPlanRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSuccessionPlanResponse = ApiResponse<SuccessionPlan>;

// POST /api/successionPlan/:id/archive
export interface CreateSuccessionPlanRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSuccessionPlanResponse = ApiResponse<SuccessionPlan>;

// POST /api/successionPlan/:id/successors
export interface CreateSuccessionPlanRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSuccessionPlanResponse = ApiResponse<SuccessionPlan>;

// PATCH /api/successionPlan/:id/successors/:successorId
export interface UpdateSuccessionPlanRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateSuccessionPlanResponse = ApiResponse<SuccessionPlan>;

// DELETE /api/successionPlan/:id/successors/:successorId
export type DeleteSuccessionPlanResponse = ApiResponse<{ deleted: boolean }>;

// PATCH /api/successionPlan/:id/successors/:successorId/readiness
export interface UpdateSuccessionPlanRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateSuccessionPlanResponse = ApiResponse<SuccessionPlan>;

// PATCH /api/successionPlan/:id/successors/:successorId/development
export interface UpdateSuccessionPlanRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateSuccessionPlanResponse = ApiResponse<SuccessionPlan>;

// POST /api/successionPlan/:id/reviews
export interface CreateSuccessionPlanRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSuccessionPlanResponse = ApiResponse<SuccessionPlan>;

// POST /api/successionPlan/:id/actions
export interface CreateSuccessionPlanRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSuccessionPlanResponse = ApiResponse<SuccessionPlan>;

// PATCH /api/successionPlan/:id/actions/:actionId
export interface UpdateSuccessionPlanRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateSuccessionPlanResponse = ApiResponse<SuccessionPlan>;

// POST /api/successionPlan/:id/documents
export interface CreateSuccessionPlanRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSuccessionPlanResponse = ApiResponse<SuccessionPlan>;
