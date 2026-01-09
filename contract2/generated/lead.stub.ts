/**
 * Lead API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/lead/overview
export interface LeadListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type LeadListResponse = PaginatedResponse<Lead>;

// POST /api/lead/bulk-delete
export interface CreateLeadRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateLeadResponse = ApiResponse<Lead>;

// POST /api/lead
export interface CreateLeadRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateLeadResponse = ApiResponse<Lead>;

// GET /api/lead
export interface LeadListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type LeadListResponse = PaginatedResponse<Lead>;

// GET /api/lead/stats
export interface LeadListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type LeadListResponse = PaginatedResponse<Lead>;

// GET /api/lead/follow-up
export interface LeadListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type LeadListResponse = PaginatedResponse<Lead>;

// GET /api/lead/pipeline/:pipelineId?
export interface LeadListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type LeadListResponse = PaginatedResponse<Lead>;

// GET /api/lead/:id
export type GetLeadResponse = ApiResponse<Lead>;

// PUT /api/lead/:id
export interface UpdateLeadRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateLeadResponse = ApiResponse<Lead>;

// DELETE /api/lead/:id
export type DeleteLeadResponse = ApiResponse<{ deleted: boolean }>;

// POST /api/lead/:id/status
export interface CreateLeadRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateLeadResponse = ApiResponse<Lead>;

// POST /api/lead/:id/move
export interface CreateLeadRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateLeadResponse = ApiResponse<Lead>;

// GET /api/lead/:id/conversion-preview
export type GetLeadResponse = ApiResponse<Lead>;

// POST /api/lead/:id/convert
export interface CreateLeadRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateLeadResponse = ApiResponse<Lead>;

// GET /api/lead/:id/activities
export type GetLeadResponse = ApiResponse<Lead>;

// POST /api/lead/:id/activities
export interface CreateLeadRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateLeadResponse = ApiResponse<Lead>;

// POST /api/lead/:id/follow-up
export interface CreateLeadRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateLeadResponse = ApiResponse<Lead>;

// POST /api/lead/:id/verify/wathq
export interface CreateLeadRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateLeadResponse = ApiResponse<Lead>;

// POST /api/lead/:id/verify/absher
export interface CreateLeadRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateLeadResponse = ApiResponse<Lead>;

// POST /api/lead/:id/verify/address
export interface CreateLeadRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateLeadResponse = ApiResponse<Lead>;

// POST /api/lead/:id/conflict-check
export interface CreateLeadRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateLeadResponse = ApiResponse<Lead>;
