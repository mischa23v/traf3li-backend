/**
 * Playbook API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/playbook
export interface PlaybookListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type PlaybookListResponse = PaginatedResponse<Playbook>;

// POST /api/playbook
export interface CreatePlaybookRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreatePlaybookResponse = ApiResponse<Playbook>;

// GET /api/playbook/stats
export interface PlaybookListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type PlaybookListResponse = PaginatedResponse<Playbook>;

// POST /api/playbook/match
export interface CreatePlaybookRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreatePlaybookResponse = ApiResponse<Playbook>;

// GET /api/playbook/:id
export type GetPlaybookResponse = ApiResponse<Playbook>;

// PUT /api/playbook/:id
export interface UpdatePlaybookRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdatePlaybookResponse = ApiResponse<Playbook>;

// DELETE /api/playbook/:id
export type DeletePlaybookResponse = ApiResponse<{ deleted: boolean }>;

// POST /api/playbook/execute
export interface CreatePlaybookRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreatePlaybookResponse = ApiResponse<Playbook>;

// GET /api/playbook/executions/stats
export interface PlaybookListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type PlaybookListResponse = PaginatedResponse<Playbook>;

// GET /api/playbook/executions/incident/:incidentId
export interface PlaybookListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type PlaybookListResponse = PaginatedResponse<Playbook>;

// GET /api/playbook/executions/:id
export type GetPlaybookResponse = ApiResponse<Playbook>;

// POST /api/playbook/executions/:id/advance
export interface CreatePlaybookRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreatePlaybookResponse = ApiResponse<Playbook>;

// POST /api/playbook/executions/:id/skip
export interface CreatePlaybookRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreatePlaybookResponse = ApiResponse<Playbook>;

// POST /api/playbook/executions/:id/abort
export interface CreatePlaybookRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreatePlaybookResponse = ApiResponse<Playbook>;

// POST /api/playbook/executions/:id/retry/:stepIndex
export interface CreatePlaybookRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreatePlaybookResponse = ApiResponse<Playbook>;
