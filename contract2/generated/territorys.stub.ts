/**
 * Territorys API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// POST /api/territorys
export interface CreateTerritorysRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateTerritorysResponse = ApiResponse<Territorys>;

// GET /api/territorys
export interface TerritorysListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type TerritorysListResponse = PaginatedResponse<Territorys>;

// GET /api/territorys/:id
export type GetTerritorysResponse = ApiResponse<Territorys>;

// PUT /api/territorys/:id
export interface UpdateTerritorysRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateTerritorysResponse = ApiResponse<Territorys>;

// DELETE /api/territorys/:id
export type DeleteTerritorysResponse = ApiResponse<{ deleted: boolean }>;

// GET /api/territorys/:id/tree
export type GetTerritorysResponse = ApiResponse<Territorys>;

// GET /api/territorys/:id/children
export type GetTerritorysResponse = ApiResponse<Territorys>;

// PUT /api/territorys/:id/move
export interface UpdateTerritorysRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateTerritorysResponse = ApiResponse<Territorys>;

// GET /api/territorys/:id/stats
export type GetTerritorysResponse = ApiResponse<Territorys>;
