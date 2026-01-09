/**
 * LeadScoring API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// POST /api/leadScoring/calculate/:leadId
export interface CreateLeadScoringRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateLeadScoringResponse = ApiResponse<LeadScoring>;

// POST /api/leadScoring/calculate-all
export interface CreateLeadScoringRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateLeadScoringResponse = ApiResponse<LeadScoring>;

// POST /api/leadScoring/calculate-batch
export interface CreateLeadScoringRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateLeadScoringResponse = ApiResponse<LeadScoring>;

// GET /api/leadScoring/scores
export interface LeadScoringListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type LeadScoringListResponse = PaginatedResponse<LeadScoring>;

// GET /api/leadScoring/leaderboard
export interface LeadScoringListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type LeadScoringListResponse = PaginatedResponse<LeadScoring>;

// GET /api/leadScoring/distribution
export interface LeadScoringListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type LeadScoringListResponse = PaginatedResponse<LeadScoring>;

// GET /api/leadScoring/top-leads
export interface LeadScoringListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type LeadScoringListResponse = PaginatedResponse<LeadScoring>;

// GET /api/leadScoring/by-grade/:grade
export interface LeadScoringListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type LeadScoringListResponse = PaginatedResponse<LeadScoring>;

// GET /api/leadScoring/insights/:leadId
export interface LeadScoringListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type LeadScoringListResponse = PaginatedResponse<LeadScoring>;

// GET /api/leadScoring/trends
export interface LeadScoringListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type LeadScoringListResponse = PaginatedResponse<LeadScoring>;

// GET /api/leadScoring/conversion-analysis
export interface LeadScoringListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type LeadScoringListResponse = PaginatedResponse<LeadScoring>;

// POST /api/leadScoring/track/email-open
export interface CreateLeadScoringRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateLeadScoringResponse = ApiResponse<LeadScoring>;

// POST /api/leadScoring/track/email-click
export interface CreateLeadScoringRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateLeadScoringResponse = ApiResponse<LeadScoring>;

// POST /api/leadScoring/track/document-view
export interface CreateLeadScoringRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateLeadScoringResponse = ApiResponse<LeadScoring>;

// POST /api/leadScoring/track/website-visit
export interface CreateLeadScoringRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateLeadScoringResponse = ApiResponse<LeadScoring>;

// POST /api/leadScoring/track/form-submit
export interface CreateLeadScoringRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateLeadScoringResponse = ApiResponse<LeadScoring>;

// POST /api/leadScoring/track/meeting
export interface CreateLeadScoringRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateLeadScoringResponse = ApiResponse<LeadScoring>;

// POST /api/leadScoring/track/call
export interface CreateLeadScoringRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateLeadScoringResponse = ApiResponse<LeadScoring>;

// POST /api/leadScoring/process-decay
export interface CreateLeadScoringRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateLeadScoringResponse = ApiResponse<LeadScoring>;
