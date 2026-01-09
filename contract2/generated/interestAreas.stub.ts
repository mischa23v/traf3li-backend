/**
 * InterestAreas API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// POST /api/interestAreas
export interface CreateInterestAreasRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateInterestAreasResponse = ApiResponse<InterestAreas>;

// GET /api/interestAreas/tree
export interface InterestAreasListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type InterestAreasListResponse = PaginatedResponse<InterestAreas>;

// GET /api/interestAreas
export interface InterestAreasListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type InterestAreasListResponse = PaginatedResponse<InterestAreas>;

// GET /api/interestAreas/:id
export type GetInterestAreasResponse = ApiResponse<InterestAreas>;

// PUT /api/interestAreas/:id
export interface UpdateInterestAreasRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateInterestAreasResponse = ApiResponse<InterestAreas>;

// DELETE /api/interestAreas/:id
export type DeleteInterestAreasResponse = ApiResponse<{ deleted: boolean }>;
