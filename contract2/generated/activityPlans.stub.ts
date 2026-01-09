/**
 * ActivityPlans API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// POST /api/activityPlans
export interface CreateActivityPlansRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateActivityPlansResponse = ApiResponse<ActivityPlans>;

// GET /api/activityPlans
export interface ActivityPlansListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type ActivityPlansListResponse = PaginatedResponse<ActivityPlans>;

// GET /api/activityPlans/:id
export type GetActivityPlansResponse = ApiResponse<ActivityPlans>;

// PUT /api/activityPlans/:id
export interface UpdateActivityPlansRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateActivityPlansResponse = ApiResponse<ActivityPlans>;

// DELETE /api/activityPlans/:id
export type DeleteActivityPlansResponse = ApiResponse<{ deleted: boolean }>;

// POST /api/activityPlans/:id/duplicate
export interface CreateActivityPlansRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateActivityPlansResponse = ApiResponse<ActivityPlans>;
