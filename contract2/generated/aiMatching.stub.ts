/**
 * AiMatching API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// POST /api/aiMatching/match
export interface CreateAiMatchingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateAiMatchingResponse = ApiResponse<AiMatching>;

// POST /api/aiMatching/batch
export interface CreateAiMatchingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateAiMatchingResponse = ApiResponse<AiMatching>;

// POST /api/aiMatching/auto-match
export interface CreateAiMatchingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateAiMatchingResponse = ApiResponse<AiMatching>;

// POST /api/aiMatching/confirm
export interface CreateAiMatchingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateAiMatchingResponse = ApiResponse<AiMatching>;

// POST /api/aiMatching/reject
export interface CreateAiMatchingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateAiMatchingResponse = ApiResponse<AiMatching>;

// POST /api/aiMatching/unmatch
export interface CreateAiMatchingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateAiMatchingResponse = ApiResponse<AiMatching>;

// GET /api/aiMatching/suggestions
export interface AiMatchingListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type AiMatchingListResponse = PaginatedResponse<AiMatching>;

// POST /api/aiMatching/suggestions/bulk-confirm
export interface CreateAiMatchingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateAiMatchingResponse = ApiResponse<AiMatching>;

// GET /api/aiMatching/stats
export interface AiMatchingListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type AiMatchingListResponse = PaginatedResponse<AiMatching>;

// GET /api/aiMatching/patterns/stats
export interface AiMatchingListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type AiMatchingListResponse = PaginatedResponse<AiMatching>;

// GET /api/aiMatching/patterns
export interface AiMatchingListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type AiMatchingListResponse = PaginatedResponse<AiMatching>;

// POST /api/aiMatching/patterns/cleanup
export interface CreateAiMatchingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateAiMatchingResponse = ApiResponse<AiMatching>;
