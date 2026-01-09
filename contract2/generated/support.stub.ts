/**
 * Support API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/support/stats
export interface SupportListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type SupportListResponse = PaginatedResponse<Support>;

// GET /api/support/settings
export interface SupportListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type SupportListResponse = PaginatedResponse<Support>;

// PUT /api/support/settings
export interface UpdateSupportRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateSupportResponse = ApiResponse<Support>;

// GET /api/support/tickets
export interface SupportListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type SupportListResponse = PaginatedResponse<Support>;

// POST /api/support/tickets
export interface CreateSupportRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSupportResponse = ApiResponse<Support>;

// GET /api/support/tickets/:id
export type GetSupportResponse = ApiResponse<Support>;

// PUT /api/support/tickets/:id
export interface UpdateSupportRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateSupportResponse = ApiResponse<Support>;

// DELETE /api/support/tickets/:id
export type DeleteSupportResponse = ApiResponse<{ deleted: boolean }>;

// POST /api/support/tickets/:id/reply
export interface CreateSupportRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSupportResponse = ApiResponse<Support>;

// POST /api/support/tickets/:id/resolve
export interface CreateSupportRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSupportResponse = ApiResponse<Support>;

// POST /api/support/tickets/:id/close
export interface CreateSupportRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSupportResponse = ApiResponse<Support>;

// GET /api/support/slas
export interface SupportListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type SupportListResponse = PaginatedResponse<Support>;

// POST /api/support/slas
export interface CreateSupportRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSupportResponse = ApiResponse<Support>;

// GET /api/support/slas/:id
export type GetSupportResponse = ApiResponse<Support>;

// PUT /api/support/slas/:id
export interface UpdateSupportRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateSupportResponse = ApiResponse<Support>;

// DELETE /api/support/slas/:id
export type DeleteSupportResponse = ApiResponse<{ deleted: boolean }>;
