/**
 * Slas API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/slas/stats
export interface SlasListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type SlasListResponse = PaginatedResponse<Slas>;

// GET /api/slas
export interface SlasListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type SlasListResponse = PaginatedResponse<Slas>;

// POST /api/slas
export interface CreateSlasRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSlasResponse = ApiResponse<Slas>;

// GET /api/slas/:id
export type GetSlasResponse = ApiResponse<Slas>;

// PUT /api/slas/:id
export interface UpdateSlasRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateSlasResponse = ApiResponse<Slas>;

// DELETE /api/slas/:id
export type DeleteSlasResponse = ApiResponse<{ deleted: boolean }>;

// POST /api/slas/:id/apply/:ticketId
export interface CreateSlasRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSlasResponse = ApiResponse<Slas>;

// GET /api/slas/instance/:ticketId
export interface SlasListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type SlasListResponse = PaginatedResponse<Slas>;

// POST /api/slas/instance/:id/pause
export interface CreateSlasRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSlasResponse = ApiResponse<Slas>;

// POST /api/slas/instance/:id/resume
export interface CreateSlasRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSlasResponse = ApiResponse<Slas>;
