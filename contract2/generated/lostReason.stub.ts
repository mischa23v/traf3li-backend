/**
 * LostReason API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/lostReason
export interface LostReasonListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type LostReasonListResponse = PaginatedResponse<LostReason>;

// GET /api/lostReason/categories
export interface LostReasonListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type LostReasonListResponse = PaginatedResponse<LostReason>;

// GET /api/lostReason/:id
export type GetLostReasonResponse = ApiResponse<LostReason>;

// POST /api/lostReason
export interface CreateLostReasonRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateLostReasonResponse = ApiResponse<LostReason>;

// POST /api/lostReason/defaults
export interface CreateLostReasonRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateLostReasonResponse = ApiResponse<LostReason>;

// PUT /api/lostReason/:id
export interface UpdateLostReasonRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateLostReasonResponse = ApiResponse<LostReason>;

// DELETE /api/lostReason/:id
export type DeleteLostReasonResponse = ApiResponse<{ deleted: boolean }>;
