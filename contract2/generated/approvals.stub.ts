/**
 * Approvals API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/approvals/workflows
export interface ApprovalsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type ApprovalsListResponse = PaginatedResponse<Approvals>;

// POST /api/approvals/workflows
export interface CreateApprovalsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateApprovalsResponse = ApiResponse<Approvals>;

// GET /api/approvals/workflows/:id
export type GetApprovalsResponse = ApiResponse<Approvals>;

// PUT /api/approvals/workflows/:id
export interface UpdateApprovalsRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateApprovalsResponse = ApiResponse<Approvals>;

// DELETE /api/approvals/workflows/:id
export type DeleteApprovalsResponse = ApiResponse<{ deleted: boolean }>;

// POST /api/approvals/initiate
export interface CreateApprovalsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateApprovalsResponse = ApiResponse<Approvals>;

// GET /api/approvals/pending
export interface ApprovalsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type ApprovalsListResponse = PaginatedResponse<Approvals>;

// POST /api/approvals/:id/decide
export interface CreateApprovalsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateApprovalsResponse = ApiResponse<Approvals>;

// POST /api/approvals/:id/cancel
export interface CreateApprovalsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateApprovalsResponse = ApiResponse<Approvals>;

// POST /api/approvals/:id/delegate
export interface CreateApprovalsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateApprovalsResponse = ApiResponse<Approvals>;

// GET /api/approvals/history/:entityType/:entityId
export interface ApprovalsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type ApprovalsListResponse = PaginatedResponse<Approvals>;
