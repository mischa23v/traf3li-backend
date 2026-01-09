/**
 * ChatterFollowers API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/chatterFollowers/my-followed
export interface ChatterFollowersListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type ChatterFollowersListResponse = PaginatedResponse<ChatterFollowers>;

// GET /api/chatterFollowers/:model/:recordId/followers
export interface ChatterFollowersListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type ChatterFollowersListResponse = PaginatedResponse<ChatterFollowers>;

// POST /api/chatterFollowers/:model/:recordId/followers
export interface CreateChatterFollowersRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateChatterFollowersResponse = ApiResponse<ChatterFollowers>;

// POST /api/chatterFollowers/:model/:recordId/followers/bulk
export interface CreateChatterFollowersRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateChatterFollowersResponse = ApiResponse<ChatterFollowers>;

// DELETE /api/chatterFollowers/:model/:recordId/followers/:id
export type DeleteChatterFollowersResponse = ApiResponse<{ deleted: boolean }>;

// PATCH /api/chatterFollowers/:model/:recordId/followers/:id/preferences
export interface UpdateChatterFollowersRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateChatterFollowersResponse = ApiResponse<ChatterFollowers>;

// POST /api/chatterFollowers/:model/:recordId/toggle-follow
export interface CreateChatterFollowersRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateChatterFollowersResponse = ApiResponse<ChatterFollowers>;
