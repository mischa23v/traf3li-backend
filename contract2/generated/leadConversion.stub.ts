/**
 * LeadConversion API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// POST /api/leadConversion/:id/convert
export interface CreateLeadConversionRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateLeadConversionResponse = ApiResponse<LeadConversion>;

// GET /api/leadConversion/:id/cases
export type GetLeadConversionResponse = ApiResponse<LeadConversion>;

// PUT /api/leadConversion/case/:caseId/stage
export interface UpdateLeadConversionRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateLeadConversionResponse = ApiResponse<LeadConversion>;

// PUT /api/leadConversion/case/:caseId/won
export interface UpdateLeadConversionRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateLeadConversionResponse = ApiResponse<LeadConversion>;

// PUT /api/leadConversion/case/:caseId/lost
export interface UpdateLeadConversionRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateLeadConversionResponse = ApiResponse<LeadConversion>;

// GET /api/leadConversion/case/:caseId/quotes
export interface LeadConversionListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type LeadConversionListResponse = PaginatedResponse<LeadConversion>;
