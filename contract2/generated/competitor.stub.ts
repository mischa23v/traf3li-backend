/**
 * Competitor API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/competitor
export interface CompetitorListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type CompetitorListResponse = PaginatedResponse<Competitor>;

// GET /api/competitor/top-losses
export interface CompetitorListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type CompetitorListResponse = PaginatedResponse<Competitor>;

// GET /api/competitor/:id
export type GetCompetitorResponse = ApiResponse<Competitor>;

// POST /api/competitor
export interface CreateCompetitorRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateCompetitorResponse = ApiResponse<Competitor>;

// PUT /api/competitor/:id
export interface UpdateCompetitorRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateCompetitorResponse = ApiResponse<Competitor>;

// DELETE /api/competitor/:id
export type DeleteCompetitorResponse = ApiResponse<{ deleted: boolean }>;
