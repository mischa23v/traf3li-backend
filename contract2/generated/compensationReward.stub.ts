/**
 * CompensationReward API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/compensationReward/stats
export interface CompensationRewardListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type CompensationRewardListResponse = PaginatedResponse<CompensationReward>;

// GET /api/compensationReward/pending-reviews
export interface CompensationRewardListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type CompensationRewardListResponse = PaginatedResponse<CompensationReward>;

// GET /api/compensationReward/department-summary
export interface CompensationRewardListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type CompensationRewardListResponse = PaginatedResponse<CompensationReward>;

// GET /api/compensationReward/export
export interface CompensationRewardListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type CompensationRewardListResponse = PaginatedResponse<CompensationReward>;

// GET /api/compensationReward/pay-grade-analysis/:payGrade
export interface CompensationRewardListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type CompensationRewardListResponse = PaginatedResponse<CompensationReward>;

// GET /api/compensationReward/employee/:employeeId
export interface CompensationRewardListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type CompensationRewardListResponse = PaginatedResponse<CompensationReward>;

// GET /api/compensationReward
export interface CompensationRewardListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type CompensationRewardListResponse = PaginatedResponse<CompensationReward>;

// POST /api/compensationReward
export interface CreateCompensationRewardRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateCompensationRewardResponse = ApiResponse<CompensationReward>;

// POST /api/compensationReward/bulk-delete
export interface CreateCompensationRewardRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateCompensationRewardResponse = ApiResponse<CompensationReward>;

// GET /api/compensationReward/:id
export type GetCompensationRewardResponse = ApiResponse<CompensationReward>;

// PATCH /api/compensationReward/:id
export interface UpdateCompensationRewardRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateCompensationRewardResponse = ApiResponse<CompensationReward>;

// PUT /api/compensationReward/:id
export interface UpdateCompensationRewardRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateCompensationRewardResponse = ApiResponse<CompensationReward>;

// DELETE /api/compensationReward/:id
export type DeleteCompensationRewardResponse = ApiResponse<{ deleted: boolean }>;

// POST /api/compensationReward/:id/salary-increase
export interface CreateCompensationRewardRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateCompensationRewardResponse = ApiResponse<CompensationReward>;

// POST /api/compensationReward/:id/allowances
export interface CreateCompensationRewardRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateCompensationRewardResponse = ApiResponse<CompensationReward>;

// PATCH /api/compensationReward/:id/allowances/:allowanceId
export interface UpdateCompensationRewardRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateCompensationRewardResponse = ApiResponse<CompensationReward>;

// PUT /api/compensationReward/:id/allowances/:allowanceId
export interface UpdateCompensationRewardRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateCompensationRewardResponse = ApiResponse<CompensationReward>;

// DELETE /api/compensationReward/:id/allowances/:allowanceId
export type DeleteCompensationRewardResponse = ApiResponse<{ deleted: boolean }>;

// POST /api/compensationReward/:id/bonus
export interface CreateCompensationRewardRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateCompensationRewardResponse = ApiResponse<CompensationReward>;

// POST /api/compensationReward/:id/submit-review
export interface CreateCompensationRewardRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateCompensationRewardResponse = ApiResponse<CompensationReward>;

// POST /api/compensationReward/:id/approve-review
export interface CreateCompensationRewardRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateCompensationRewardResponse = ApiResponse<CompensationReward>;

// POST /api/compensationReward/:id/decline-review
export interface CreateCompensationRewardRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateCompensationRewardResponse = ApiResponse<CompensationReward>;

// POST /api/compensationReward/:id/recognition
export interface CreateCompensationRewardRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateCompensationRewardResponse = ApiResponse<CompensationReward>;

// POST /api/compensationReward/:id/total-rewards-statement
export interface CreateCompensationRewardRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateCompensationRewardResponse = ApiResponse<CompensationReward>;
