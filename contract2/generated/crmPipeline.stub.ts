/**
 * CrmPipeline API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// POST /api/crmPipeline
export interface CreateCrmPipelineRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateCrmPipelineResponse = ApiResponse<CrmPipeline>;

// GET /api/crmPipeline
export interface CrmPipelineListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type CrmPipelineListResponse = PaginatedResponse<CrmPipeline>;

// GET /api/crmPipeline/:id
export type GetCrmPipelineResponse = ApiResponse<CrmPipeline>;

// PUT /api/crmPipeline/:id
export interface UpdateCrmPipelineRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateCrmPipelineResponse = ApiResponse<CrmPipeline>;

// DELETE /api/crmPipeline/:id
export type DeleteCrmPipelineResponse = ApiResponse<{ deleted: boolean }>;

// POST /api/crmPipeline/:id/stages
export interface CreateCrmPipelineRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateCrmPipelineResponse = ApiResponse<CrmPipeline>;

// PUT /api/crmPipeline/:id/stages/:stageId
export interface UpdateCrmPipelineRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateCrmPipelineResponse = ApiResponse<CrmPipeline>;

// DELETE /api/crmPipeline/:id/stages/:stageId
export type DeleteCrmPipelineResponse = ApiResponse<{ deleted: boolean }>;

// POST /api/crmPipeline/:id/stages/reorder
export interface CreateCrmPipelineRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateCrmPipelineResponse = ApiResponse<CrmPipeline>;

// GET /api/crmPipeline/:id/stats
export type GetCrmPipelineResponse = ApiResponse<CrmPipeline>;

// POST /api/crmPipeline/:id/default
export interface CreateCrmPipelineRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateCrmPipelineResponse = ApiResponse<CrmPipeline>;

// POST /api/crmPipeline/:id/duplicate
export interface CreateCrmPipelineRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateCrmPipelineResponse = ApiResponse<CrmPipeline>;
