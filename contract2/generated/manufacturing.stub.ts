/**
 * Manufacturing API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/manufacturing/stats
export interface ManufacturingListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type ManufacturingListResponse = PaginatedResponse<Manufacturing>;

// GET /api/manufacturing/settings
export interface ManufacturingListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type ManufacturingListResponse = PaginatedResponse<Manufacturing>;

// PUT /api/manufacturing/settings
export interface UpdateManufacturingRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateManufacturingResponse = ApiResponse<Manufacturing>;

// GET /api/manufacturing/boms
export interface ManufacturingListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type ManufacturingListResponse = PaginatedResponse<Manufacturing>;

// GET /api/manufacturing/boms/:id
export type GetManufacturingResponse = ApiResponse<Manufacturing>;

// POST /api/manufacturing/boms
export interface CreateManufacturingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateManufacturingResponse = ApiResponse<Manufacturing>;

// PUT /api/manufacturing/boms/:id
export interface UpdateManufacturingRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateManufacturingResponse = ApiResponse<Manufacturing>;

// DELETE /api/manufacturing/boms/:id
export type DeleteManufacturingResponse = ApiResponse<{ deleted: boolean }>;

// GET /api/manufacturing/workstations
export interface ManufacturingListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type ManufacturingListResponse = PaginatedResponse<Manufacturing>;

// GET /api/manufacturing/workstations/:id
export type GetManufacturingResponse = ApiResponse<Manufacturing>;

// POST /api/manufacturing/workstations
export interface CreateManufacturingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateManufacturingResponse = ApiResponse<Manufacturing>;

// PUT /api/manufacturing/workstations/:id
export interface UpdateManufacturingRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateManufacturingResponse = ApiResponse<Manufacturing>;

// DELETE /api/manufacturing/workstations/:id
export type DeleteManufacturingResponse = ApiResponse<{ deleted: boolean }>;

// GET /api/manufacturing/work-orders
export interface ManufacturingListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type ManufacturingListResponse = PaginatedResponse<Manufacturing>;

// GET /api/manufacturing/work-orders/:id
export type GetManufacturingResponse = ApiResponse<Manufacturing>;

// POST /api/manufacturing/work-orders
export interface CreateManufacturingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateManufacturingResponse = ApiResponse<Manufacturing>;

// PUT /api/manufacturing/work-orders/:id
export interface UpdateManufacturingRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateManufacturingResponse = ApiResponse<Manufacturing>;

// DELETE /api/manufacturing/work-orders/:id
export type DeleteManufacturingResponse = ApiResponse<{ deleted: boolean }>;

// POST /api/manufacturing/work-orders/:id/submit
export interface CreateManufacturingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateManufacturingResponse = ApiResponse<Manufacturing>;

// POST /api/manufacturing/work-orders/:id/start
export interface CreateManufacturingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateManufacturingResponse = ApiResponse<Manufacturing>;

// POST /api/manufacturing/work-orders/:id/complete
export interface CreateManufacturingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateManufacturingResponse = ApiResponse<Manufacturing>;

// POST /api/manufacturing/work-orders/:id/cancel
export interface CreateManufacturingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateManufacturingResponse = ApiResponse<Manufacturing>;

// GET /api/manufacturing/job-cards
export interface ManufacturingListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type ManufacturingListResponse = PaginatedResponse<Manufacturing>;

// GET /api/manufacturing/job-cards/:id
export type GetManufacturingResponse = ApiResponse<Manufacturing>;

// POST /api/manufacturing/job-cards
export interface CreateManufacturingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateManufacturingResponse = ApiResponse<Manufacturing>;

// PUT /api/manufacturing/job-cards/:id
export interface UpdateManufacturingRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateManufacturingResponse = ApiResponse<Manufacturing>;

// POST /api/manufacturing/job-cards/:id/start
export interface CreateManufacturingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateManufacturingResponse = ApiResponse<Manufacturing>;

// POST /api/manufacturing/job-cards/:id/complete
export interface CreateManufacturingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateManufacturingResponse = ApiResponse<Manufacturing>;
