/**
 * OrganizationTemplate API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/organizationTemplate/available
export interface OrganizationTemplateListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type OrganizationTemplateListResponse = PaginatedResponse<OrganizationTemplate>;

// GET /api/organizationTemplate/default
export interface OrganizationTemplateListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type OrganizationTemplateListResponse = PaginatedResponse<OrganizationTemplate>;

// GET /api/organizationTemplate/:id/preview
export type GetOrganizationTemplateResponse = ApiResponse<OrganizationTemplate>;

// GET /api/organizationTemplate/admin/stats
export interface OrganizationTemplateListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type OrganizationTemplateListResponse = PaginatedResponse<OrganizationTemplate>;

// GET /api/organizationTemplate/admin
export interface OrganizationTemplateListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type OrganizationTemplateListResponse = PaginatedResponse<OrganizationTemplate>;

// POST /api/organizationTemplate/admin
export interface CreateOrganizationTemplateRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateOrganizationTemplateResponse = ApiResponse<OrganizationTemplate>;

// GET /api/organizationTemplate/admin/:id
export type GetOrganizationTemplateResponse = ApiResponse<OrganizationTemplate>;

// PUT /api/organizationTemplate/admin/:id
export interface UpdateOrganizationTemplateRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateOrganizationTemplateResponse = ApiResponse<OrganizationTemplate>;

// DELETE /api/organizationTemplate/admin/:id
export type DeleteOrganizationTemplateResponse = ApiResponse<{ deleted: boolean }>;

// POST /api/organizationTemplate/admin/:id/clone
export interface CreateOrganizationTemplateRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateOrganizationTemplateResponse = ApiResponse<OrganizationTemplate>;

// POST /api/organizationTemplate/admin/:id/set-default
export interface CreateOrganizationTemplateRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateOrganizationTemplateResponse = ApiResponse<OrganizationTemplate>;

// POST /api/organizationTemplate/admin/:id/apply/:firmId
export interface CreateOrganizationTemplateRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateOrganizationTemplateResponse = ApiResponse<OrganizationTemplate>;

// GET /api/organizationTemplate/admin/:id/compare/:firmId
export type GetOrganizationTemplateResponse = ApiResponse<OrganizationTemplate>;
