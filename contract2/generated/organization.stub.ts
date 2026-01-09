/**
 * Organization API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/organization/search
export interface OrganizationListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type OrganizationListResponse = PaginatedResponse<Organization>;

// GET /api/organization/client/:clientId
export interface OrganizationListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type OrganizationListResponse = PaginatedResponse<Organization>;

// DELETE /api/organization/bulk
export type DeleteOrganizationResponse = ApiResponse<{ deleted: boolean }>;

// POST /api/organization/bulk-delete
export interface CreateOrganizationRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateOrganizationResponse = ApiResponse<Organization>;

// GET /api/organization
export interface OrganizationListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type OrganizationListResponse = PaginatedResponse<Organization>;

// POST /api/organization
export interface CreateOrganizationRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateOrganizationResponse = ApiResponse<Organization>;

// GET /api/organization/:id
export type GetOrganizationResponse = ApiResponse<Organization>;

// PUT /api/organization/:id
export interface UpdateOrganizationRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateOrganizationResponse = ApiResponse<Organization>;

// PATCH /api/organization/:id
export interface UpdateOrganizationRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateOrganizationResponse = ApiResponse<Organization>;

// DELETE /api/organization/:id
export type DeleteOrganizationResponse = ApiResponse<{ deleted: boolean }>;

// POST /api/organization/:id/link-case
export interface CreateOrganizationRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateOrganizationResponse = ApiResponse<Organization>;

// POST /api/organization/:id/link-client
export interface CreateOrganizationRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateOrganizationResponse = ApiResponse<Organization>;

// POST /api/organization/:id/link-contact
export interface CreateOrganizationRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateOrganizationResponse = ApiResponse<Organization>;
