/**
 * CrmActivity API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/crmActivity/timeline
export interface CrmActivityListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type CrmActivityListResponse = PaginatedResponse<CrmActivity>;

// GET /api/crmActivity/stats
export interface CrmActivityListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type CrmActivityListResponse = PaginatedResponse<CrmActivity>;

// GET /api/crmActivity/tasks/upcoming
export interface CrmActivityListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type CrmActivityListResponse = PaginatedResponse<CrmActivity>;

// POST /api/crmActivity/log/call
export interface CreateCrmActivityRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateCrmActivityResponse = ApiResponse<CrmActivity>;

// POST /api/crmActivity/log/email
export interface CreateCrmActivityRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateCrmActivityResponse = ApiResponse<CrmActivity>;

// POST /api/crmActivity/log/meeting
export interface CreateCrmActivityRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateCrmActivityResponse = ApiResponse<CrmActivity>;

// POST /api/crmActivity/log/note
export interface CreateCrmActivityRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateCrmActivityResponse = ApiResponse<CrmActivity>;

// GET /api/crmActivity/entity/:entityType/:entityId
export interface CrmActivityListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type CrmActivityListResponse = PaginatedResponse<CrmActivity>;

// POST /api/crmActivity
export interface CreateCrmActivityRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateCrmActivityResponse = ApiResponse<CrmActivity>;

// GET /api/crmActivity
export interface CrmActivityListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type CrmActivityListResponse = PaginatedResponse<CrmActivity>;

// GET /api/crmActivity/:id
export type GetCrmActivityResponse = ApiResponse<CrmActivity>;

// PUT /api/crmActivity/:id
export interface UpdateCrmActivityRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateCrmActivityResponse = ApiResponse<CrmActivity>;

// DELETE /api/crmActivity/:id
export type DeleteCrmActivityResponse = ApiResponse<{ deleted: boolean }>;

// POST /api/crmActivity/:id/complete
export interface CreateCrmActivityRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateCrmActivityResponse = ApiResponse<CrmActivity>;
