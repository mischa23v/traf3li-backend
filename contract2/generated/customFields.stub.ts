/**
 * CustomFields API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/customFields/export
export interface CustomFieldsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type CustomFieldsListResponse = PaginatedResponse<CustomFields>;

// POST /api/customFields/import
export interface CreateCustomFieldsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateCustomFieldsResponse = ApiResponse<CustomFields>;

// POST /api/customFields/search
export interface CreateCustomFieldsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateCustomFieldsResponse = ApiResponse<CustomFields>;

// POST /api/customFields/bulk-update
export interface CreateCustomFieldsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateCustomFieldsResponse = ApiResponse<CustomFields>;

// GET /api/customFields/dependencies/:entityType/:entityId
export interface CustomFieldsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type CustomFieldsListResponse = PaginatedResponse<CustomFields>;

// GET /api/customFields/values/:entityType/:entityId
export interface CustomFieldsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type CustomFieldsListResponse = PaginatedResponse<CustomFields>;

// POST /api/customFields/values/:entityType/:entityId
export interface CreateCustomFieldsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateCustomFieldsResponse = ApiResponse<CustomFields>;

// POST /api/customFields/values/:entityType/:entityId/bulk
export interface CreateCustomFieldsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateCustomFieldsResponse = ApiResponse<CustomFields>;

// DELETE /api/customFields/values/:entityType/:entityId
export type DeleteCustomFieldsResponse = ApiResponse<{ deleted: boolean }>;

// DELETE /api/customFields/values/:entityType/:entityId/:fieldId
export type DeleteCustomFieldsResponse = ApiResponse<{ deleted: boolean }>;

// GET /api/customFields
export interface CustomFieldsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type CustomFieldsListResponse = PaginatedResponse<CustomFields>;

// POST /api/customFields
export interface CreateCustomFieldsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateCustomFieldsResponse = ApiResponse<CustomFields>;

// GET /api/customFields/:id
export type GetCustomFieldsResponse = ApiResponse<CustomFields>;

// PATCH /api/customFields/:id
export interface UpdateCustomFieldsRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateCustomFieldsResponse = ApiResponse<CustomFields>;

// DELETE /api/customFields/:id
export type DeleteCustomFieldsResponse = ApiResponse<{ deleted: boolean }>;

// GET /api/customFields/:id/stats
export type GetCustomFieldsResponse = ApiResponse<CustomFields>;

// POST /api/customFields/:id/validate
export interface CreateCustomFieldsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateCustomFieldsResponse = ApiResponse<CustomFields>;
