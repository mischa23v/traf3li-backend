/**
 * SalesPerson API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/salesPerson
export interface SalesPersonListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type SalesPersonListResponse = PaginatedResponse<SalesPerson>;

// GET /api/salesPerson/tree
export interface SalesPersonListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type SalesPersonListResponse = PaginatedResponse<SalesPerson>;

// GET /api/salesPerson/:id
export type GetSalesPersonResponse = ApiResponse<SalesPerson>;

// GET /api/salesPerson/:id/stats
export type GetSalesPersonResponse = ApiResponse<SalesPerson>;

// POST /api/salesPerson
export interface CreateSalesPersonRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSalesPersonResponse = ApiResponse<SalesPerson>;

// PUT /api/salesPerson/:id
export interface UpdateSalesPersonRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateSalesPersonResponse = ApiResponse<SalesPerson>;

// DELETE /api/salesPerson/:id
export type DeleteSalesPersonResponse = ApiResponse<{ deleted: boolean }>;
