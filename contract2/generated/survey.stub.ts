/**
 * Survey API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/survey/templates
export interface SurveyListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type SurveyListResponse = PaginatedResponse<Survey>;

// GET /api/survey/templates/:id
export type GetSurveyResponse = ApiResponse<Survey>;

// POST /api/survey/templates
export interface CreateSurveyRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSurveyResponse = ApiResponse<Survey>;

// PATCH /api/survey/templates/:id
export interface UpdateSurveyRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateSurveyResponse = ApiResponse<Survey>;

// DELETE /api/survey/templates/:id
export type DeleteSurveyResponse = ApiResponse<{ deleted: boolean }>;

// GET /api/survey/stats
export interface SurveyListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type SurveyListResponse = PaginatedResponse<Survey>;

// GET /api/survey/my-surveys
export interface SurveyListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type SurveyListResponse = PaginatedResponse<Survey>;

// GET /api/survey
export interface SurveyListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type SurveyListResponse = PaginatedResponse<Survey>;

// GET /api/survey/:id
export type GetSurveyResponse = ApiResponse<Survey>;

// GET /api/survey/:id/results
export type GetSurveyResponse = ApiResponse<Survey>;

// POST /api/survey
export interface CreateSurveyRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSurveyResponse = ApiResponse<Survey>;

// PATCH /api/survey/:id
export interface UpdateSurveyRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateSurveyResponse = ApiResponse<Survey>;

// POST /api/survey/:id/launch
export interface CreateSurveyRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSurveyResponse = ApiResponse<Survey>;

// POST /api/survey/:id/close
export interface CreateSurveyRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSurveyResponse = ApiResponse<Survey>;

// DELETE /api/survey/:id
export type DeleteSurveyResponse = ApiResponse<{ deleted: boolean }>;

// POST /api/survey/:id/respond
export interface CreateSurveyRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSurveyResponse = ApiResponse<Survey>;
