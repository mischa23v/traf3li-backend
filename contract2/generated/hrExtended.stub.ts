/**
 * HrExtended API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/hrExtended/leave-encashment
export interface HrExtendedListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type HrExtendedListResponse = PaginatedResponse<HrExtended>;

// POST /api/hrExtended/leave-encashment
export interface CreateHrExtendedRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateHrExtendedResponse = ApiResponse<HrExtended>;

// POST /api/hrExtended/leave-encashment/:id/approve
export interface CreateHrExtendedRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateHrExtendedResponse = ApiResponse<HrExtended>;

// GET /api/hrExtended/compensatory-leave
export interface HrExtendedListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type HrExtendedListResponse = PaginatedResponse<HrExtended>;

// POST /api/hrExtended/compensatory-leave
export interface CreateHrExtendedRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateHrExtendedResponse = ApiResponse<HrExtended>;

// GET /api/hrExtended/compensatory-leave/balance/:employeeId
export interface HrExtendedListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type HrExtendedListResponse = PaginatedResponse<HrExtended>;

// POST /api/hrExtended/compensatory-leave/:id/approve
export interface CreateHrExtendedRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateHrExtendedResponse = ApiResponse<HrExtended>;

// GET /api/hrExtended/salary-components
export interface HrExtendedListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type HrExtendedListResponse = PaginatedResponse<HrExtended>;

// POST /api/hrExtended/salary-components
export interface CreateHrExtendedRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateHrExtendedResponse = ApiResponse<HrExtended>;

// POST /api/hrExtended/salary-components/create-defaults
export interface CreateHrExtendedRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateHrExtendedResponse = ApiResponse<HrExtended>;

// PUT /api/hrExtended/salary-components/:id
export interface UpdateHrExtendedRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateHrExtendedResponse = ApiResponse<HrExtended>;

// GET /api/hrExtended/promotions
export interface HrExtendedListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type HrExtendedListResponse = PaginatedResponse<HrExtended>;

// POST /api/hrExtended/promotions
export interface CreateHrExtendedRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateHrExtendedResponse = ApiResponse<HrExtended>;

// POST /api/hrExtended/promotions/:id/approve
export interface CreateHrExtendedRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateHrExtendedResponse = ApiResponse<HrExtended>;

// POST /api/hrExtended/promotions/:id/apply
export interface CreateHrExtendedRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateHrExtendedResponse = ApiResponse<HrExtended>;

// GET /api/hrExtended/transfers
export interface HrExtendedListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type HrExtendedListResponse = PaginatedResponse<HrExtended>;

// POST /api/hrExtended/transfers
export interface CreateHrExtendedRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateHrExtendedResponse = ApiResponse<HrExtended>;

// POST /api/hrExtended/transfers/:id/approve
export interface CreateHrExtendedRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateHrExtendedResponse = ApiResponse<HrExtended>;

// POST /api/hrExtended/transfers/:id/apply
export interface CreateHrExtendedRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateHrExtendedResponse = ApiResponse<HrExtended>;

// GET /api/hrExtended/staffing-plans
export interface HrExtendedListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type HrExtendedListResponse = PaginatedResponse<HrExtended>;

// POST /api/hrExtended/staffing-plans
export interface CreateHrExtendedRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateHrExtendedResponse = ApiResponse<HrExtended>;

// GET /api/hrExtended/staffing-plans/vacancy-summary
export interface HrExtendedListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type HrExtendedListResponse = PaginatedResponse<HrExtended>;

// GET /api/hrExtended/retention-bonuses
export interface HrExtendedListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type HrExtendedListResponse = PaginatedResponse<HrExtended>;

// POST /api/hrExtended/retention-bonuses
export interface CreateHrExtendedRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateHrExtendedResponse = ApiResponse<HrExtended>;

// POST /api/hrExtended/retention-bonuses/:id/vest/:milestone
export interface CreateHrExtendedRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateHrExtendedResponse = ApiResponse<HrExtended>;

// GET /api/hrExtended/incentives
export interface HrExtendedListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type HrExtendedListResponse = PaginatedResponse<HrExtended>;

// POST /api/hrExtended/incentives
export interface CreateHrExtendedRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateHrExtendedResponse = ApiResponse<HrExtended>;

// GET /api/hrExtended/incentives/stats
export interface HrExtendedListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type HrExtendedListResponse = PaginatedResponse<HrExtended>;

// GET /api/hrExtended/vehicles
export interface HrExtendedListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type HrExtendedListResponse = PaginatedResponse<HrExtended>;

// POST /api/hrExtended/vehicles
export interface CreateHrExtendedRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateHrExtendedResponse = ApiResponse<HrExtended>;

// POST /api/hrExtended/vehicles/:id/assign
export interface CreateHrExtendedRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateHrExtendedResponse = ApiResponse<HrExtended>;

// POST /api/hrExtended/vehicles/:id/maintenance
export interface CreateHrExtendedRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateHrExtendedResponse = ApiResponse<HrExtended>;

// GET /api/hrExtended/vehicles/fleet-summary
export interface HrExtendedListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type HrExtendedListResponse = PaginatedResponse<HrExtended>;

// GET /api/hrExtended/skills
export interface HrExtendedListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type HrExtendedListResponse = PaginatedResponse<HrExtended>;

// POST /api/hrExtended/skills
export interface CreateHrExtendedRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateHrExtendedResponse = ApiResponse<HrExtended>;

// GET /api/hrExtended/skills/by-category
export interface HrExtendedListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type HrExtendedListResponse = PaginatedResponse<HrExtended>;

// GET /api/hrExtended/employee-skills/:employeeId
export interface HrExtendedListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type HrExtendedListResponse = PaginatedResponse<HrExtended>;

// POST /api/hrExtended/employee-skills
export interface CreateHrExtendedRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateHrExtendedResponse = ApiResponse<HrExtended>;

// GET /api/hrExtended/employee-skills/matrix
export interface HrExtendedListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type HrExtendedListResponse = PaginatedResponse<HrExtended>;

// GET /api/hrExtended/employee-skills/expiring-certifications
export interface HrExtendedListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type HrExtendedListResponse = PaginatedResponse<HrExtended>;

// GET /api/hrExtended/settings
export interface HrExtendedListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type HrExtendedListResponse = PaginatedResponse<HrExtended>;

// PUT /api/hrExtended/settings
export interface UpdateHrExtendedRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateHrExtendedResponse = ApiResponse<HrExtended>;

// GET /api/hrExtended/settings/leave
export interface HrExtendedListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type HrExtendedListResponse = PaginatedResponse<HrExtended>;

// GET /api/hrExtended/settings/payroll
export interface HrExtendedListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type HrExtendedListResponse = PaginatedResponse<HrExtended>;

// GET /api/hrExtended/setup-wizard
export interface HrExtendedListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type HrExtendedListResponse = PaginatedResponse<HrExtended>;

// GET /api/hrExtended/setup-wizard/progress
export interface HrExtendedListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type HrExtendedListResponse = PaginatedResponse<HrExtended>;

// POST /api/hrExtended/setup-wizard/complete-step/:stepId
export interface CreateHrExtendedRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateHrExtendedResponse = ApiResponse<HrExtended>;

// POST /api/hrExtended/setup-wizard/skip-step/:stepId
export interface CreateHrExtendedRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateHrExtendedResponse = ApiResponse<HrExtended>;

// POST /api/hrExtended/setup-wizard/skip
export interface CreateHrExtendedRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateHrExtendedResponse = ApiResponse<HrExtended>;
