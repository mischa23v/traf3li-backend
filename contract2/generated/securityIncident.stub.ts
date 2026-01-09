/**
 * SecurityIncident API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// POST /api/securityIncident/incidents/report
export interface CreateSecurityIncidentRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSecurityIncidentResponse = ApiResponse<SecurityIncident>;

// GET /api/securityIncident/incidents
export interface SecurityIncidentListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type SecurityIncidentListResponse = PaginatedResponse<SecurityIncident>;

// PATCH /api/securityIncident/incidents/:id/status
export interface UpdateSecurityIncidentRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateSecurityIncidentResponse = ApiResponse<SecurityIncident>;

// GET /api/securityIncident/incidents/stats
export interface SecurityIncidentListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type SecurityIncidentListResponse = PaginatedResponse<SecurityIncident>;

// POST /api/securityIncident/vulnerability/report
export interface CreateSecurityIncidentRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSecurityIncidentResponse = ApiResponse<SecurityIncident>;

// POST /api/securityIncident/csp-report
export interface CreateSecurityIncidentRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSecurityIncidentResponse = ApiResponse<SecurityIncident>;

// GET /api/securityIncident/csp-violations
export interface SecurityIncidentListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type SecurityIncidentListResponse = PaginatedResponse<SecurityIncident>;

// DELETE /api/securityIncident/csp-violations
export type DeleteSecurityIncidentResponse = ApiResponse<{ deleted: boolean }>;
