/**
 * Campaigns API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// POST /api/campaigns
export interface CreateCampaignsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateCampaignsResponse = ApiResponse<Campaigns>;

// GET /api/campaigns
export interface CampaignsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type CampaignsListResponse = PaginatedResponse<Campaigns>;

// GET /api/campaigns/:id
export type GetCampaignsResponse = ApiResponse<Campaigns>;

// PUT /api/campaigns/:id
export interface UpdateCampaignsRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateCampaignsResponse = ApiResponse<Campaigns>;

// DELETE /api/campaigns/:id
export type DeleteCampaignsResponse = ApiResponse<{ deleted: boolean }>;

// POST /api/campaigns/:id/launch
export interface CreateCampaignsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateCampaignsResponse = ApiResponse<Campaigns>;

// POST /api/campaigns/:id/pause
export interface CreateCampaignsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateCampaignsResponse = ApiResponse<Campaigns>;

// POST /api/campaigns/:id/resume
export interface CreateCampaignsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateCampaignsResponse = ApiResponse<Campaigns>;

// POST /api/campaigns/:id/complete
export interface CreateCampaignsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateCampaignsResponse = ApiResponse<Campaigns>;

// GET /api/campaigns/:id/stats
export type GetCampaignsResponse = ApiResponse<Campaigns>;

// GET /api/campaigns/:id/leads
export type GetCampaignsResponse = ApiResponse<Campaigns>;

// POST /api/campaigns/:id/duplicate
export interface CreateCampaignsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateCampaignsResponse = ApiResponse<Campaigns>;
