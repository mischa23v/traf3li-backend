/**
 * LostReasons API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/lostReasons/stats
export interface LostReasonsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type LostReasonsListResponse = PaginatedResponse<LostReasons>;

// PUT /api/lostReasons/reorder
export interface UpdateLostReasonsRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateLostReasonsResponse = ApiResponse<LostReasons>;

// GET /api/lostReasons
export interface LostReasonsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type LostReasonsListResponse = PaginatedResponse<LostReasons>;

// POST /api/lostReasons
export interface CreateLostReasonsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateLostReasonsResponse = ApiResponse<LostReasons>;

// GET /api/lostReasons/:id
export type GetLostReasonsResponse = ApiResponse<LostReasons>;

// PUT /api/lostReasons/:id
export interface UpdateLostReasonsRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateLostReasonsResponse = ApiResponse<LostReasons>;

// DELETE /api/lostReasons/:id
export type DeleteLostReasonsResponse = ApiResponse<{ deleted: boolean }>;
