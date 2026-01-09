/**
 * Plan API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/plan
export interface PlanListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type PlanListResponse = PaginatedResponse<Plan>;

// GET /api/plan/features
export interface PlanListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type PlanListResponse = PaginatedResponse<Plan>;

// GET /api/plan/current
export interface PlanListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type PlanListResponse = PaginatedResponse<Plan>;

// GET /api/plan/usage
export interface PlanListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type PlanListResponse = PaginatedResponse<Plan>;

// GET /api/plan/limits
export interface PlanListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type PlanListResponse = PaginatedResponse<Plan>;

// POST /api/plan/start-trial
export interface CreatePlanRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreatePlanResponse = ApiResponse<Plan>;

// POST /api/plan/upgrade
export interface CreatePlanRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreatePlanResponse = ApiResponse<Plan>;

// POST /api/plan/cancel
export interface CreatePlanRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreatePlanResponse = ApiResponse<Plan>;
