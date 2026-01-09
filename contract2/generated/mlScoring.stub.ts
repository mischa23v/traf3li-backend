/**
 * MlScoring API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/mlScoring/scores
export interface MlScoringListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type MlScoringListResponse = PaginatedResponse<MlScoring>;

// GET /api/mlScoring/scores/:leadId
export interface MlScoringListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type MlScoringListResponse = PaginatedResponse<MlScoring>;

// POST /api/mlScoring/scores/:leadId/calculate
export interface CreateMlScoringRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateMlScoringResponse = ApiResponse<MlScoring>;

// POST /api/mlScoring/scores/batch
export interface CreateMlScoringRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateMlScoringResponse = ApiResponse<MlScoring>;

// GET /api/mlScoring/scores/:leadId/explanation
export interface MlScoringListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type MlScoringListResponse = PaginatedResponse<MlScoring>;

// GET /api/mlScoring/scores/:leadId/hybrid
export interface MlScoringListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type MlScoringListResponse = PaginatedResponse<MlScoring>;

// POST /api/mlScoring/train
export interface CreateMlScoringRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateMlScoringResponse = ApiResponse<MlScoring>;

// GET /api/mlScoring/model/metrics
export interface MlScoringListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type MlScoringListResponse = PaginatedResponse<MlScoring>;

// POST /api/mlScoring/model/export
export interface CreateMlScoringRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateMlScoringResponse = ApiResponse<MlScoring>;

// GET /api/mlScoring/priority-queue
export interface MlScoringListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type MlScoringListResponse = PaginatedResponse<MlScoring>;

// GET /api/mlScoring/priority-queue/workload
export interface MlScoringListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type MlScoringListResponse = PaginatedResponse<MlScoring>;

// POST /api/mlScoring/priority/:leadId/contact
export interface CreateMlScoringRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateMlScoringResponse = ApiResponse<MlScoring>;

// PUT /api/mlScoring/priority/:leadId/assign
export interface UpdateMlScoringRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateMlScoringResponse = ApiResponse<MlScoring>;

// GET /api/mlScoring/sla/metrics
export interface MlScoringListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type MlScoringListResponse = PaginatedResponse<MlScoring>;

// GET /api/mlScoring/sla/breaches
export interface MlScoringListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type MlScoringListResponse = PaginatedResponse<MlScoring>;

// GET /api/mlScoring/analytics/dashboard
export interface MlScoringListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type MlScoringListResponse = PaginatedResponse<MlScoring>;

// GET /api/mlScoring/analytics/feature-importance
export interface MlScoringListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type MlScoringListResponse = PaginatedResponse<MlScoring>;

// GET /api/mlScoring/analytics/score-distribution
export interface MlScoringListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type MlScoringListResponse = PaginatedResponse<MlScoring>;
