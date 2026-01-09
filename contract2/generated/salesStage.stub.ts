/**
 * SalesStage API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/salesStage
export interface SalesStageListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type SalesStageListResponse = PaginatedResponse<SalesStage>;

// GET /api/salesStage/:id
export type GetSalesStageResponse = ApiResponse<SalesStage>;

// POST /api/salesStage
export interface CreateSalesStageRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSalesStageResponse = ApiResponse<SalesStage>;

// POST /api/salesStage/defaults
export interface CreateSalesStageRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSalesStageResponse = ApiResponse<SalesStage>;

// PUT /api/salesStage/reorder
export interface UpdateSalesStageRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateSalesStageResponse = ApiResponse<SalesStage>;

// PUT /api/salesStage/:id
export interface UpdateSalesStageRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateSalesStageResponse = ApiResponse<SalesStage>;

// DELETE /api/salesStage/:id
export type DeleteSalesStageResponse = ApiResponse<{ deleted: boolean }>;
