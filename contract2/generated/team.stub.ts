/**
 * Team API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/team/stats
export interface TeamListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type TeamListResponse = PaginatedResponse<Team>;

// GET /api/team/options
export interface TeamListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type TeamListResponse = PaginatedResponse<Team>;

// GET /api/team
export interface TeamListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type TeamListResponse = PaginatedResponse<Team>;

// POST /api/team/invite
export interface CreateTeamRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateTeamResponse = ApiResponse<Team>;

// GET /api/team/:id
export type GetTeamResponse = ApiResponse<Team>;

// PATCH /api/team/:id
export interface UpdateTeamRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateTeamResponse = ApiResponse<Team>;

// DELETE /api/team/:id
export type DeleteTeamResponse = ApiResponse<{ deleted: boolean }>;

// POST /api/team/:id/resend-invite
export interface CreateTeamRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateTeamResponse = ApiResponse<Team>;

// DELETE /api/team/:id/revoke-invite
export type DeleteTeamResponse = ApiResponse<{ deleted: boolean }>;

// PATCH /api/team/:id/permissions
export interface UpdateTeamRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateTeamResponse = ApiResponse<Team>;

// PATCH /api/team/:id/role
export interface UpdateTeamRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateTeamResponse = ApiResponse<Team>;

// POST /api/team/:id/suspend
export interface CreateTeamRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateTeamResponse = ApiResponse<Team>;

// POST /api/team/:id/activate
export interface CreateTeamRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateTeamResponse = ApiResponse<Team>;

// POST /api/team/:id/depart
export interface CreateTeamRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateTeamResponse = ApiResponse<Team>;

// GET /api/team/:id/activity
export type GetTeamResponse = ApiResponse<Team>;
