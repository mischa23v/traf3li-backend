/**
 * Okr API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/okr/stats
export interface OkrListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type OkrListResponse = PaginatedResponse<Okr>;

// GET /api/okr/tree
export interface OkrListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type OkrListResponse = PaginatedResponse<Okr>;

// GET /api/okr
export interface OkrListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type OkrListResponse = PaginatedResponse<Okr>;

// GET /api/okr/:id
export type GetOkrResponse = ApiResponse<Okr>;

// POST /api/okr
export interface CreateOkrRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateOkrResponse = ApiResponse<Okr>;

// PATCH /api/okr/:id
export interface UpdateOkrRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateOkrResponse = ApiResponse<Okr>;

// POST /api/okr/:id/activate
export interface CreateOkrRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateOkrResponse = ApiResponse<Okr>;

// PATCH /api/okr/:id/key-results/:keyResultId
export interface UpdateOkrRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateOkrResponse = ApiResponse<Okr>;

// POST /api/okr/:id/check-in
export interface CreateOkrRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateOkrResponse = ApiResponse<Okr>;

// DELETE /api/okr/:id
export type DeleteOkrResponse = ApiResponse<{ deleted: boolean }>;

// GET /api/okr/nine-box/distribution
export interface OkrListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type OkrListResponse = PaginatedResponse<Okr>;

// GET /api/okr/nine-box/succession
export interface OkrListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type OkrListResponse = PaginatedResponse<Okr>;

// GET /api/okr/nine-box/employee/:employeeId
export interface OkrListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type OkrListResponse = PaginatedResponse<Okr>;

// GET /api/okr/nine-box
export interface OkrListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type OkrListResponse = PaginatedResponse<Okr>;

// POST /api/okr/nine-box
export interface CreateOkrRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateOkrResponse = ApiResponse<Okr>;
