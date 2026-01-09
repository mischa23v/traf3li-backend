/**
 * IncomeTaxSlab API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/incomeTaxSlab/countries
export interface IncomeTaxSlabListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type IncomeTaxSlabListResponse = PaginatedResponse<IncomeTaxSlab>;

// POST /api/incomeTaxSlab/initialize-defaults
export interface CreateIncomeTaxSlabRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateIncomeTaxSlabResponse = ApiResponse<IncomeTaxSlab>;

// POST /api/incomeTaxSlab/calculate-by-country
export interface CreateIncomeTaxSlabRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateIncomeTaxSlabResponse = ApiResponse<IncomeTaxSlab>;

// GET /api/incomeTaxSlab
export interface IncomeTaxSlabListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type IncomeTaxSlabListResponse = PaginatedResponse<IncomeTaxSlab>;

// POST /api/incomeTaxSlab
export interface CreateIncomeTaxSlabRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateIncomeTaxSlabResponse = ApiResponse<IncomeTaxSlab>;

// GET /api/incomeTaxSlab/:id
export type GetIncomeTaxSlabResponse = ApiResponse<IncomeTaxSlab>;

// PUT /api/incomeTaxSlab/:id
export interface UpdateIncomeTaxSlabRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateIncomeTaxSlabResponse = ApiResponse<IncomeTaxSlab>;

// DELETE /api/incomeTaxSlab/:id
export type DeleteIncomeTaxSlabResponse = ApiResponse<{ deleted: boolean }>;

// POST /api/incomeTaxSlab/:id/calculate
export interface CreateIncomeTaxSlabRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateIncomeTaxSlabResponse = ApiResponse<IncomeTaxSlab>;
