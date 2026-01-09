/**
 * Competitors API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// POST /api/competitors
export interface CreateCompetitorsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateCompetitorsResponse = ApiResponse<Competitors>;

// GET /api/competitors
export interface CompetitorsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type CompetitorsListResponse = PaginatedResponse<Competitors>;

// GET /api/competitors/:id
export type GetCompetitorsResponse = ApiResponse<Competitors>;

// PUT /api/competitors/:id
export interface UpdateCompetitorsRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateCompetitorsResponse = ApiResponse<Competitors>;

// DELETE /api/competitors/:id
export type DeleteCompetitorsResponse = ApiResponse<{ deleted: boolean }>;

// POST /api/competitors/:id/record-win
export interface CreateCompetitorsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateCompetitorsResponse = ApiResponse<Competitors>;

// POST /api/competitors/:id/record-loss
export interface CreateCompetitorsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateCompetitorsResponse = ApiResponse<Competitors>;
