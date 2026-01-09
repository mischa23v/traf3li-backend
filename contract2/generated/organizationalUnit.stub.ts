/**
 * OrganizationalUnit API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/organizationalUnit/stats
export interface OrganizationalUnitListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type OrganizationalUnitListResponse = PaginatedResponse<OrganizationalUnit>;

// GET /api/organizationalUnit/tree
export interface OrganizationalUnitListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type OrganizationalUnitListResponse = PaginatedResponse<OrganizationalUnit>;

// GET /api/organizationalUnit/export
export interface OrganizationalUnitListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type OrganizationalUnitListResponse = PaginatedResponse<OrganizationalUnit>;

// GET /api/organizationalUnit
export interface OrganizationalUnitListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type OrganizationalUnitListResponse = PaginatedResponse<OrganizationalUnit>;

// POST /api/organizationalUnit
export interface CreateOrganizationalUnitRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateOrganizationalUnitResponse = ApiResponse<OrganizationalUnit>;

// POST /api/organizationalUnit/bulk-delete
export interface CreateOrganizationalUnitRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateOrganizationalUnitResponse = ApiResponse<OrganizationalUnit>;

// GET /api/organizationalUnit/:id
export type GetOrganizationalUnitResponse = ApiResponse<OrganizationalUnit>;

// PATCH /api/organizationalUnit/:id
export interface UpdateOrganizationalUnitRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateOrganizationalUnitResponse = ApiResponse<OrganizationalUnit>;

// DELETE /api/organizationalUnit/:id
export type DeleteOrganizationalUnitResponse = ApiResponse<{ deleted: boolean }>;

// GET /api/organizationalUnit/:id/children
export type GetOrganizationalUnitResponse = ApiResponse<OrganizationalUnit>;

// GET /api/organizationalUnit/:id/path
export type GetOrganizationalUnitResponse = ApiResponse<OrganizationalUnit>;

// POST /api/organizationalUnit/:id/move
export interface CreateOrganizationalUnitRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateOrganizationalUnitResponse = ApiResponse<OrganizationalUnit>;

// POST /api/organizationalUnit/:id/dissolve
export interface CreateOrganizationalUnitRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateOrganizationalUnitResponse = ApiResponse<OrganizationalUnit>;

// POST /api/organizationalUnit/:id/activate
export interface CreateOrganizationalUnitRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateOrganizationalUnitResponse = ApiResponse<OrganizationalUnit>;

// POST /api/organizationalUnit/:id/deactivate
export interface CreateOrganizationalUnitRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateOrganizationalUnitResponse = ApiResponse<OrganizationalUnit>;

// PATCH /api/organizationalUnit/:id/headcount
export interface UpdateOrganizationalUnitRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateOrganizationalUnitResponse = ApiResponse<OrganizationalUnit>;

// PATCH /api/organizationalUnit/:id/budget
export interface UpdateOrganizationalUnitRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateOrganizationalUnitResponse = ApiResponse<OrganizationalUnit>;

// POST /api/organizationalUnit/:id/kpis
export interface CreateOrganizationalUnitRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateOrganizationalUnitResponse = ApiResponse<OrganizationalUnit>;

// PATCH /api/organizationalUnit/:id/kpis/:kpiId
export interface UpdateOrganizationalUnitRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateOrganizationalUnitResponse = ApiResponse<OrganizationalUnit>;

// DELETE /api/organizationalUnit/:id/kpis/:kpiId
export type DeleteOrganizationalUnitResponse = ApiResponse<{ deleted: boolean }>;

// POST /api/organizationalUnit/:id/leadership
export interface CreateOrganizationalUnitRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateOrganizationalUnitResponse = ApiResponse<OrganizationalUnit>;

// PATCH /api/organizationalUnit/:id/leadership/:positionId
export interface UpdateOrganizationalUnitRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateOrganizationalUnitResponse = ApiResponse<OrganizationalUnit>;

// DELETE /api/organizationalUnit/:id/leadership/:positionId
export type DeleteOrganizationalUnitResponse = ApiResponse<{ deleted: boolean }>;

// POST /api/organizationalUnit/:id/documents
export interface CreateOrganizationalUnitRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateOrganizationalUnitResponse = ApiResponse<OrganizationalUnit>;
