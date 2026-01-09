/**
 * ContactLists API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// POST /api/contactLists
export interface CreateContactListsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateContactListsResponse = ApiResponse<ContactLists>;

// GET /api/contactLists
export interface ContactListsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type ContactListsListResponse = PaginatedResponse<ContactLists>;

// GET /api/contactLists/:id
export type GetContactListsResponse = ApiResponse<ContactLists>;

// PUT /api/contactLists/:id
export interface UpdateContactListsRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateContactListsResponse = ApiResponse<ContactLists>;

// DELETE /api/contactLists/:id
export type DeleteContactListsResponse = ApiResponse<{ deleted: boolean }>;

// POST /api/contactLists/:id/members
export interface CreateContactListsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateContactListsResponse = ApiResponse<ContactLists>;

// DELETE /api/contactLists/:id/members/:memberId
export type DeleteContactListsResponse = ApiResponse<{ deleted: boolean }>;

// GET /api/contactLists/:id/members
export type GetContactListsResponse = ApiResponse<ContactLists>;

// POST /api/contactLists/:id/refresh
export interface CreateContactListsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateContactListsResponse = ApiResponse<ContactLists>;

// POST /api/contactLists/:id/duplicate
export interface CreateContactListsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateContactListsResponse = ApiResponse<ContactLists>;
