/**
 * Contact API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/contact/search
export interface ContactListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type ContactListResponse = PaginatedResponse<Contact>;

// GET /api/contact/case/:caseId
export interface ContactListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type ContactListResponse = PaginatedResponse<Contact>;

// GET /api/contact/client/:clientId
export interface ContactListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type ContactListResponse = PaginatedResponse<Contact>;

// DELETE /api/contact/bulk
export type DeleteContactResponse = ApiResponse<{ deleted: boolean }>;

// POST /api/contact/bulk-delete
export interface CreateContactRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateContactResponse = ApiResponse<Contact>;

// GET /api/contact
export interface ContactListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type ContactListResponse = PaginatedResponse<Contact>;

// POST /api/contact
export interface CreateContactRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateContactResponse = ApiResponse<Contact>;

// GET /api/contact/:id
export type GetContactResponse = ApiResponse<Contact>;

// PUT /api/contact/:id
export interface UpdateContactRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateContactResponse = ApiResponse<Contact>;

// PATCH /api/contact/:id
export interface UpdateContactRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateContactResponse = ApiResponse<Contact>;

// DELETE /api/contact/:id
export type DeleteContactResponse = ApiResponse<{ deleted: boolean }>;

// POST /api/contact/:id/link-case
export interface CreateContactRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateContactResponse = ApiResponse<Contact>;

// DELETE /api/contact/:id/unlink-case/:caseId
export type DeleteContactResponse = ApiResponse<{ deleted: boolean }>;

// POST /api/contact/:id/unlink-case
export interface CreateContactRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateContactResponse = ApiResponse<Contact>;

// POST /api/contact/:id/link-client
export interface CreateContactRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateContactResponse = ApiResponse<Contact>;

// DELETE /api/contact/:id/unlink-client/:clientId
export type DeleteContactResponse = ApiResponse<{ deleted: boolean }>;

// POST /api/contact/:id/unlink-client
export interface CreateContactRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateContactResponse = ApiResponse<Contact>;
