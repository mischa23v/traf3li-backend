/**
 * Grievance API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/grievance/stats
export interface GrievanceListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type GrievanceListResponse = PaginatedResponse<Grievance>;

// GET /api/grievance/overdue
export interface GrievanceListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type GrievanceListResponse = PaginatedResponse<Grievance>;

// GET /api/grievance/export
export interface GrievanceListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type GrievanceListResponse = PaginatedResponse<Grievance>;

// GET /api/grievance
export interface GrievanceListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type GrievanceListResponse = PaginatedResponse<Grievance>;

// POST /api/grievance
export interface CreateGrievanceRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateGrievanceResponse = ApiResponse<Grievance>;

// POST /api/grievance/bulk-delete
export interface CreateGrievanceRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateGrievanceResponse = ApiResponse<Grievance>;

// GET /api/grievance/employee/:employeeId
export interface GrievanceListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type GrievanceListResponse = PaginatedResponse<Grievance>;

// GET /api/grievance/:id
export type GetGrievanceResponse = ApiResponse<Grievance>;

// PATCH /api/grievance/:id
export interface UpdateGrievanceRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateGrievanceResponse = ApiResponse<Grievance>;

// DELETE /api/grievance/:id
export type DeleteGrievanceResponse = ApiResponse<{ deleted: boolean }>;

// POST /api/grievance/:id/acknowledge
export interface CreateGrievanceRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateGrievanceResponse = ApiResponse<Grievance>;

// POST /api/grievance/:id/start-investigation
export interface CreateGrievanceRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateGrievanceResponse = ApiResponse<Grievance>;

// POST /api/grievance/:id/complete-investigation
export interface CreateGrievanceRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateGrievanceResponse = ApiResponse<Grievance>;

// POST /api/grievance/:id/resolve
export interface CreateGrievanceRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateGrievanceResponse = ApiResponse<Grievance>;

// POST /api/grievance/:id/escalate
export interface CreateGrievanceRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateGrievanceResponse = ApiResponse<Grievance>;

// POST /api/grievance/:id/withdraw
export interface CreateGrievanceRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateGrievanceResponse = ApiResponse<Grievance>;

// POST /api/grievance/:id/close
export interface CreateGrievanceRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateGrievanceResponse = ApiResponse<Grievance>;

// POST /api/grievance/:id/timeline
export interface CreateGrievanceRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateGrievanceResponse = ApiResponse<Grievance>;

// POST /api/grievance/:id/witnesses
export interface CreateGrievanceRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateGrievanceResponse = ApiResponse<Grievance>;

// POST /api/grievance/:id/evidence
export interface CreateGrievanceRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateGrievanceResponse = ApiResponse<Grievance>;

// POST /api/grievance/:id/interviews
export interface CreateGrievanceRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateGrievanceResponse = ApiResponse<Grievance>;

// POST /api/grievance/:id/appeal
export interface CreateGrievanceRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateGrievanceResponse = ApiResponse<Grievance>;

// POST /api/grievance/:id/appeal/decide
export interface CreateGrievanceRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateGrievanceResponse = ApiResponse<Grievance>;

// POST /api/grievance/:id/labor-office
export interface CreateGrievanceRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateGrievanceResponse = ApiResponse<Grievance>;
