/**
 * CaseNotion API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/caseNotion/notion/cases
export interface CaseNotionListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type CaseNotionListResponse = PaginatedResponse<CaseNotion>;

// GET /api/caseNotion/cases/:caseId/notion/pages
export interface CaseNotionListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type CaseNotionListResponse = PaginatedResponse<CaseNotion>;

// GET /api/caseNotion/cases/:caseId/notion/pages/:pageId
export interface CaseNotionListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type CaseNotionListResponse = PaginatedResponse<CaseNotion>;

// POST /api/caseNotion/cases/:caseId/notion/pages
export interface CreateCaseNotionRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateCaseNotionResponse = ApiResponse<CaseNotion>;

// PATCH /api/caseNotion/cases/:caseId/notion/pages/:pageId
export interface UpdateCaseNotionRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateCaseNotionResponse = ApiResponse<CaseNotion>;

// DELETE /api/caseNotion/cases/:caseId/notion/pages/:pageId
export type DeleteCaseNotionResponse = ApiResponse<{ deleted: boolean }>;

// POST /api/caseNotion/cases/:caseId/notion/pages/:pageId/archive
export interface CreateCaseNotionRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateCaseNotionResponse = ApiResponse<CaseNotion>;

// POST /api/caseNotion/cases/:caseId/notion/pages/:pageId/restore
export interface CreateCaseNotionRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateCaseNotionResponse = ApiResponse<CaseNotion>;

// POST /api/caseNotion/cases/:caseId/notion/pages/:pageId/duplicate
export interface CreateCaseNotionRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateCaseNotionResponse = ApiResponse<CaseNotion>;

// POST /api/caseNotion/cases/:caseId/notion/pages/:pageId/favorite
export interface CreateCaseNotionRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateCaseNotionResponse = ApiResponse<CaseNotion>;

// POST /api/caseNotion/cases/:caseId/notion/pages/:pageId/pin
export interface CreateCaseNotionRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateCaseNotionResponse = ApiResponse<CaseNotion>;

// POST /api/caseNotion/cases/:caseId/notion/pages/merge
export interface CreateCaseNotionRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateCaseNotionResponse = ApiResponse<CaseNotion>;

// GET /api/caseNotion/cases/:caseId/notion/pages/:pageId/blocks
export interface CaseNotionListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type CaseNotionListResponse = PaginatedResponse<CaseNotion>;

// POST /api/caseNotion/cases/:caseId/notion/pages/:pageId/blocks
export interface CreateCaseNotionRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateCaseNotionResponse = ApiResponse<CaseNotion>;

// PATCH /api/caseNotion/cases/:caseId/notion/blocks/:blockId
export interface UpdateCaseNotionRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateCaseNotionResponse = ApiResponse<CaseNotion>;

// DELETE /api/caseNotion/cases/:caseId/notion/blocks/:blockId
export type DeleteCaseNotionResponse = ApiResponse<{ deleted: boolean }>;

// POST /api/caseNotion/cases/:caseId/notion/blocks/:blockId/move
export interface CreateCaseNotionRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateCaseNotionResponse = ApiResponse<CaseNotion>;

// POST /api/caseNotion/cases/:caseId/notion/blocks/:blockId/lock
export interface CreateCaseNotionRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateCaseNotionResponse = ApiResponse<CaseNotion>;

// POST /api/caseNotion/cases/:caseId/notion/blocks/:blockId/unlock
export interface CreateCaseNotionRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateCaseNotionResponse = ApiResponse<CaseNotion>;

// POST /api/caseNotion/cases/:caseId/notion/synced-blocks
export interface CreateCaseNotionRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateCaseNotionResponse = ApiResponse<CaseNotion>;

// GET /api/caseNotion/cases/:caseId/notion/synced-blocks/:blockId
export interface CaseNotionListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type CaseNotionListResponse = PaginatedResponse<CaseNotion>;

// POST /api/caseNotion/cases/:caseId/notion/synced-blocks/:blockId/unsync
export interface CreateCaseNotionRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateCaseNotionResponse = ApiResponse<CaseNotion>;

// GET /api/caseNotion/cases/:caseId/notion/blocks/:blockId/comments
export interface CaseNotionListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type CaseNotionListResponse = PaginatedResponse<CaseNotion>;

// POST /api/caseNotion/cases/:caseId/notion/blocks/:blockId/comments
export interface CreateCaseNotionRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateCaseNotionResponse = ApiResponse<CaseNotion>;

// POST /api/caseNotion/cases/:caseId/notion/comments/:commentId/resolve
export interface CreateCaseNotionRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateCaseNotionResponse = ApiResponse<CaseNotion>;

// DELETE /api/caseNotion/cases/:caseId/notion/comments/:commentId
export type DeleteCaseNotionResponse = ApiResponse<{ deleted: boolean }>;

// GET /api/caseNotion/cases/:caseId/notion/pages/:pageId/activity
export interface CaseNotionListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type CaseNotionListResponse = PaginatedResponse<CaseNotion>;

// GET /api/caseNotion/cases/:caseId/notion/search
export interface CaseNotionListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type CaseNotionListResponse = PaginatedResponse<CaseNotion>;

// GET /api/caseNotion/cases/:caseId/notion/pages/:pageId/export/pdf
export interface CaseNotionListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type CaseNotionListResponse = PaginatedResponse<CaseNotion>;

// GET /api/caseNotion/cases/:caseId/notion/pages/:pageId/export/markdown
export interface CaseNotionListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type CaseNotionListResponse = PaginatedResponse<CaseNotion>;

// GET /api/caseNotion/cases/:caseId/notion/pages/:pageId/export/html
export interface CaseNotionListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type CaseNotionListResponse = PaginatedResponse<CaseNotion>;

// GET /api/caseNotion/notion/templates
export interface CaseNotionListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type CaseNotionListResponse = PaginatedResponse<CaseNotion>;

// POST /api/caseNotion/cases/:caseId/notion/pages/:pageId/apply-template
export interface CreateCaseNotionRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateCaseNotionResponse = ApiResponse<CaseNotion>;

// POST /api/caseNotion/cases/:caseId/notion/pages/:pageId/save-as-template
export interface CreateCaseNotionRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateCaseNotionResponse = ApiResponse<CaseNotion>;

// POST /api/caseNotion/cases/:caseId/notion/blocks/:blockId/link-task
export interface CreateCaseNotionRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateCaseNotionResponse = ApiResponse<CaseNotion>;

// POST /api/caseNotion/cases/:caseId/notion/blocks/:blockId/unlink-task
export interface CreateCaseNotionRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateCaseNotionResponse = ApiResponse<CaseNotion>;

// POST /api/caseNotion/cases/:caseId/notion/blocks/:blockId/create-task
export interface CreateCaseNotionRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateCaseNotionResponse = ApiResponse<CaseNotion>;

// PATCH /api/caseNotion/cases/:caseId/notion/blocks/:blockId/position
export interface UpdateCaseNotionRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateCaseNotionResponse = ApiResponse<CaseNotion>;

// PATCH /api/caseNotion/cases/:caseId/notion/blocks/:blockId/size
export interface UpdateCaseNotionRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateCaseNotionResponse = ApiResponse<CaseNotion>;

// PATCH /api/caseNotion/cases/:caseId/notion/blocks/:blockId/color
export interface UpdateCaseNotionRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateCaseNotionResponse = ApiResponse<CaseNotion>;

// PATCH /api/caseNotion/cases/:caseId/notion/blocks/:blockId/priority
export interface UpdateCaseNotionRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateCaseNotionResponse = ApiResponse<CaseNotion>;

// POST /api/caseNotion/cases/:caseId/notion/blocks/:blockId/link-event
export interface CreateCaseNotionRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateCaseNotionResponse = ApiResponse<CaseNotion>;

// POST /api/caseNotion/cases/:caseId/notion/blocks/:blockId/link-hearing
export interface CreateCaseNotionRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateCaseNotionResponse = ApiResponse<CaseNotion>;

// POST /api/caseNotion/cases/:caseId/notion/blocks/:blockId/link-document
export interface CreateCaseNotionRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateCaseNotionResponse = ApiResponse<CaseNotion>;

// DELETE /api/caseNotion/cases/:caseId/notion/blocks/:blockId/unlink
export type DeleteCaseNotionResponse = ApiResponse<{ deleted: boolean }>;

// GET /api/caseNotion/cases/:caseId/notion/pages/:pageId/connections
export interface CaseNotionListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type CaseNotionListResponse = PaginatedResponse<CaseNotion>;

// POST /api/caseNotion/cases/:caseId/notion/pages/:pageId/connections
export interface CreateCaseNotionRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateCaseNotionResponse = ApiResponse<CaseNotion>;

// PATCH /api/caseNotion/cases/:caseId/notion/connections/:connectionId
export interface UpdateCaseNotionRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateCaseNotionResponse = ApiResponse<CaseNotion>;

// DELETE /api/caseNotion/cases/:caseId/notion/connections/:connectionId
export type DeleteCaseNotionResponse = ApiResponse<{ deleted: boolean }>;

// PATCH /api/caseNotion/cases/:caseId/notion/pages/:pageId/view-mode
export interface UpdateCaseNotionRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateCaseNotionResponse = ApiResponse<CaseNotion>;

// PATCH /api/caseNotion/cases/:caseId/notion/pages/:pageId/whiteboard-config
export interface UpdateCaseNotionRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateCaseNotionResponse = ApiResponse<CaseNotion>;

// POST /api/caseNotion/cases/:caseId/notion/pages/:pageId/shapes
export interface CreateCaseNotionRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateCaseNotionResponse = ApiResponse<CaseNotion>;

// POST /api/caseNotion/cases/:caseId/notion/pages/:pageId/arrows
export interface CreateCaseNotionRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateCaseNotionResponse = ApiResponse<CaseNotion>;

// POST /api/caseNotion/cases/:caseId/notion/pages/:pageId/frames
export interface CreateCaseNotionRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateCaseNotionResponse = ApiResponse<CaseNotion>;

// PATCH /api/caseNotion/cases/:caseId/notion/blocks/:blockId/z-index
export interface UpdateCaseNotionRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateCaseNotionResponse = ApiResponse<CaseNotion>;

// PATCH /api/caseNotion/cases/:caseId/notion/pages/:pageId/batch-update
export interface UpdateCaseNotionRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateCaseNotionResponse = ApiResponse<CaseNotion>;

// GET /api/caseNotion/cases/:caseId/notion/blocks/:blockId/connections
export interface CaseNotionListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type CaseNotionListResponse = PaginatedResponse<CaseNotion>;

// PATCH /api/caseNotion/cases/:caseId/notion/blocks/:blockId/rotation
export interface UpdateCaseNotionRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateCaseNotionResponse = ApiResponse<CaseNotion>;

// PATCH /api/caseNotion/cases/:caseId/notion/blocks/:blockId/opacity
export interface UpdateCaseNotionRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateCaseNotionResponse = ApiResponse<CaseNotion>;

// PATCH /api/caseNotion/cases/:caseId/notion/blocks/:blockId/style
export interface UpdateCaseNotionRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateCaseNotionResponse = ApiResponse<CaseNotion>;

// POST /api/caseNotion/cases/:caseId/notion/frames/:frameId/children
export interface CreateCaseNotionRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateCaseNotionResponse = ApiResponse<CaseNotion>;

// DELETE /api/caseNotion/cases/:caseId/notion/frames/:frameId/children/:elementId
export type DeleteCaseNotionResponse = ApiResponse<{ deleted: boolean }>;

// GET /api/caseNotion/cases/:caseId/notion/frames/:frameId/children
export interface CaseNotionListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type CaseNotionListResponse = PaginatedResponse<CaseNotion>;

// POST /api/caseNotion/cases/:caseId/notion/frames/:frameId/auto-detect
export interface CreateCaseNotionRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateCaseNotionResponse = ApiResponse<CaseNotion>;

// PATCH /api/caseNotion/cases/:caseId/notion/frames/:frameId/move
export interface UpdateCaseNotionRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateCaseNotionResponse = ApiResponse<CaseNotion>;

// POST /api/caseNotion/cases/:caseId/notion/pages/:pageId/undo
export interface CreateCaseNotionRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateCaseNotionResponse = ApiResponse<CaseNotion>;

// POST /api/caseNotion/cases/:caseId/notion/pages/:pageId/redo
export interface CreateCaseNotionRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateCaseNotionResponse = ApiResponse<CaseNotion>;

// GET /api/caseNotion/cases/:caseId/notion/pages/:pageId/history-status
export interface CaseNotionListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type CaseNotionListResponse = PaginatedResponse<CaseNotion>;

// POST /api/caseNotion/cases/:caseId/notion/pages/:pageId/duplicate
export interface CreateCaseNotionRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateCaseNotionResponse = ApiResponse<CaseNotion>;

// DELETE /api/caseNotion/cases/:caseId/notion/pages/:pageId/bulk-delete
export type DeleteCaseNotionResponse = ApiResponse<{ deleted: boolean }>;

// POST /api/caseNotion/cases/:caseId/notion/pages/:pageId/group
export interface CreateCaseNotionRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateCaseNotionResponse = ApiResponse<CaseNotion>;

// POST /api/caseNotion/cases/:caseId/notion/pages/:pageId/ungroup
export interface CreateCaseNotionRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateCaseNotionResponse = ApiResponse<CaseNotion>;

// POST /api/caseNotion/cases/:caseId/notion/pages/:pageId/align
export interface CreateCaseNotionRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateCaseNotionResponse = ApiResponse<CaseNotion>;

// POST /api/caseNotion/cases/:caseId/notion/pages/:pageId/distribute
export interface CreateCaseNotionRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateCaseNotionResponse = ApiResponse<CaseNotion>;
