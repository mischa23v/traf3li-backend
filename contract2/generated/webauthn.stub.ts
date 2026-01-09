/**
 * Webauthn API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// POST /api/webauthn/register/start
export interface CreateWebauthnRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWebauthnResponse = ApiResponse<Webauthn>;

// POST /api/webauthn/register/finish
export interface CreateWebauthnRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWebauthnResponse = ApiResponse<Webauthn>;

// POST /api/webauthn/authenticate/start
export interface CreateWebauthnRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWebauthnResponse = ApiResponse<Webauthn>;

// POST /api/webauthn/authenticate/finish
export interface CreateWebauthnRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWebauthnResponse = ApiResponse<Webauthn>;

// GET /api/webauthn/credentials
export interface WebauthnListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type WebauthnListResponse = PaginatedResponse<Webauthn>;

// PATCH /api/webauthn/credentials/:id
export interface UpdateWebauthnRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateWebauthnResponse = ApiResponse<Webauthn>;

// DELETE /api/webauthn/credentials/:id
export type DeleteWebauthnResponse = ApiResponse<{ deleted: boolean }>;
