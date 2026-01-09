/**
 * Lifecycles API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/lifecycles/workflows
export interface LifecyclesListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type LifecyclesListResponse = PaginatedResponse<Lifecycles>;

// POST /api/lifecycles/workflows
export interface CreateLifecyclesRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateLifecyclesResponse = ApiResponse<Lifecycles>;

// GET /api/lifecycles/workflows/:id
export type GetLifecyclesResponse = ApiResponse<Lifecycles>;

// PUT /api/lifecycles/workflows/:id
export interface UpdateLifecyclesRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateLifecyclesResponse = ApiResponse<Lifecycles>;

// DELETE /api/lifecycles/workflows/:id
export type DeleteLifecyclesResponse = ApiResponse<{ deleted: boolean }>;

// POST /api/lifecycles/initiate
export interface CreateLifecyclesRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateLifecyclesResponse = ApiResponse<Lifecycles>;

// GET /api/lifecycles/:entityType/:entityId
export interface LifecyclesListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type LifecyclesListResponse = PaginatedResponse<Lifecycles>;

// GET /api/lifecycles/instance/:id/progress
export type GetLifecyclesResponse = ApiResponse<Lifecycles>;

// POST /api/lifecycles/instance/:id/advance
export interface CreateLifecyclesRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateLifecyclesResponse = ApiResponse<Lifecycles>;

// POST /api/lifecycles/instance/:id/cancel
export interface CreateLifecyclesRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateLifecyclesResponse = ApiResponse<Lifecycles>;
