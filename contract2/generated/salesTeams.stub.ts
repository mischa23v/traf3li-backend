/**
 * SalesTeams API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// POST /api/salesTeams
export interface CreateSalesTeamsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSalesTeamsResponse = ApiResponse<SalesTeams>;

// GET /api/salesTeams
export interface SalesTeamsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type SalesTeamsListResponse = PaginatedResponse<SalesTeams>;

// GET /api/salesTeams/:id
export type GetSalesTeamsResponse = ApiResponse<SalesTeams>;

// PUT /api/salesTeams/:id
export interface UpdateSalesTeamsRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateSalesTeamsResponse = ApiResponse<SalesTeams>;

// DELETE /api/salesTeams/:id
export type DeleteSalesTeamsResponse = ApiResponse<{ deleted: boolean }>;

// POST /api/salesTeams/:id/members
export interface CreateSalesTeamsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSalesTeamsResponse = ApiResponse<SalesTeams>;

// DELETE /api/salesTeams/:id/members/:userId
export type DeleteSalesTeamsResponse = ApiResponse<{ deleted: boolean }>;

// GET /api/salesTeams/:id/stats
export type GetSalesTeamsResponse = ApiResponse<SalesTeams>;

// GET /api/salesTeams/:id/leaderboard
export type GetSalesTeamsResponse = ApiResponse<SalesTeams>;

// POST /api/salesTeams/:id/default
export interface CreateSalesTeamsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSalesTeamsResponse = ApiResponse<SalesTeams>;
