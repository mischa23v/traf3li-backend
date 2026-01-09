/**
 * Territory API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/territory
export interface TerritoryListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type TerritoryListResponse = PaginatedResponse<Territory>;

// GET /api/territory/tree
export interface TerritoryListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type TerritoryListResponse = PaginatedResponse<Territory>;

// GET /api/territory/:id
export type GetTerritoryResponse = ApiResponse<Territory>;

// POST /api/territory
export interface CreateTerritoryRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateTerritoryResponse = ApiResponse<Territory>;

// PUT /api/territory/:id
export interface UpdateTerritoryRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateTerritoryResponse = ApiResponse<Territory>;

// DELETE /api/territory/:id
export type DeleteTerritoryResponse = ApiResponse<{ deleted: boolean }>;
