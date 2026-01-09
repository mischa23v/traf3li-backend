/**
 * Brokers API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// POST /api/brokers
export interface CreateBrokersRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateBrokersResponse = ApiResponse<Brokers>;

// GET /api/brokers
export interface BrokersListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type BrokersListResponse = PaginatedResponse<Brokers>;

// GET /api/brokers/:id
export type GetBrokersResponse = ApiResponse<Brokers>;

// PATCH /api/brokers/:id
export interface UpdateBrokersRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateBrokersResponse = ApiResponse<Brokers>;

// DELETE /api/brokers/:id
export type DeleteBrokersResponse = ApiResponse<{ deleted: boolean }>;

// POST /api/brokers/:id/set-default
export interface CreateBrokersRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateBrokersResponse = ApiResponse<Brokers>;
