/**
 * Docusign API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/docusign/auth-url
export interface DocusignListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type DocusignListResponse = PaginatedResponse<Docusign>;

// GET /api/docusign/callback
export interface DocusignListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type DocusignListResponse = PaginatedResponse<Docusign>;

// POST /api/docusign/disconnect
export interface CreateDocusignRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateDocusignResponse = ApiResponse<Docusign>;

// GET /api/docusign/status
export interface DocusignListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type DocusignListResponse = PaginatedResponse<Docusign>;

// POST /api/docusign/envelopes
export interface CreateDocusignRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateDocusignResponse = ApiResponse<Docusign>;

// POST /api/docusign/envelopes/from-template
export interface CreateDocusignRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateDocusignResponse = ApiResponse<Docusign>;

// GET /api/docusign/envelopes
export interface DocusignListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type DocusignListResponse = PaginatedResponse<Docusign>;

// GET /api/docusign/envelopes/:envelopeId
export interface DocusignListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type DocusignListResponse = PaginatedResponse<Docusign>;

// GET /api/docusign/envelopes/:envelopeId/documents
export interface DocusignListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type DocusignListResponse = PaginatedResponse<Docusign>;

// POST /api/docusign/envelopes/:envelopeId/void
export interface CreateDocusignRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateDocusignResponse = ApiResponse<Docusign>;

// POST /api/docusign/envelopes/:envelopeId/resend
export interface CreateDocusignRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateDocusignResponse = ApiResponse<Docusign>;

// POST /api/docusign/envelopes/:envelopeId/signing-url
export interface CreateDocusignRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateDocusignResponse = ApiResponse<Docusign>;

// GET /api/docusign/templates
export interface DocusignListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type DocusignListResponse = PaginatedResponse<Docusign>;

// POST /api/docusign/templates/defaults
export interface CreateDocusignRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateDocusignResponse = ApiResponse<Docusign>;

// DELETE /api/docusign/templates/defaults/:templateId
export type DeleteDocusignResponse = ApiResponse<{ deleted: boolean }>;

// PUT /api/docusign/settings
export interface UpdateDocusignRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateDocusignResponse = ApiResponse<Docusign>;

// POST /api/docusign/webhook
export interface CreateDocusignRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateDocusignResponse = ApiResponse<Docusign>;
