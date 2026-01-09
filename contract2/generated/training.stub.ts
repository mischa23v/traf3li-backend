/**
 * Training API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/training/stats
export interface TrainingListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type TrainingListResponse = PaginatedResponse<Training>;

// GET /api/training/pending-approvals
export interface TrainingListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type TrainingListResponse = PaginatedResponse<Training>;

// GET /api/training/upcoming
export interface TrainingListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type TrainingListResponse = PaginatedResponse<Training>;

// GET /api/training/overdue-compliance
export interface TrainingListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type TrainingListResponse = PaginatedResponse<Training>;

// GET /api/training/calendar
export interface TrainingListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type TrainingListResponse = PaginatedResponse<Training>;

// GET /api/training/providers
export interface TrainingListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type TrainingListResponse = PaginatedResponse<Training>;

// GET /api/training/export
export interface TrainingListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type TrainingListResponse = PaginatedResponse<Training>;

// GET /api/training/policies
export interface TrainingListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type TrainingListResponse = PaginatedResponse<Training>;

// POST /api/training/bulk-delete
export interface CreateTrainingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateTrainingResponse = ApiResponse<Training>;

// GET /api/training/by-employee/:employeeId
export interface TrainingListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type TrainingListResponse = PaginatedResponse<Training>;

// GET /api/training/cle-summary/:employeeId
export interface TrainingListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type TrainingListResponse = PaginatedResponse<Training>;

// GET /api/training
export interface TrainingListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type TrainingListResponse = PaginatedResponse<Training>;

// POST /api/training
export interface CreateTrainingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateTrainingResponse = ApiResponse<Training>;

// GET /api/training/:trainingId
export interface TrainingListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type TrainingListResponse = PaginatedResponse<Training>;

// PATCH /api/training/:trainingId
export interface UpdateTrainingRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateTrainingResponse = ApiResponse<Training>;

// DELETE /api/training/:trainingId
export type DeleteTrainingResponse = ApiResponse<{ deleted: boolean }>;

// POST /api/training/:trainingId/submit
export interface CreateTrainingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateTrainingResponse = ApiResponse<Training>;

// POST /api/training/:trainingId/approve
export interface CreateTrainingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateTrainingResponse = ApiResponse<Training>;

// POST /api/training/:trainingId/reject
export interface CreateTrainingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateTrainingResponse = ApiResponse<Training>;

// POST /api/training/:trainingId/enroll
export interface CreateTrainingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateTrainingResponse = ApiResponse<Training>;

// POST /api/training/:trainingId/start
export interface CreateTrainingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateTrainingResponse = ApiResponse<Training>;

// POST /api/training/:trainingId/complete
export interface CreateTrainingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateTrainingResponse = ApiResponse<Training>;

// POST /api/training/:trainingId/cancel
export interface CreateTrainingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateTrainingResponse = ApiResponse<Training>;

// POST /api/training/:trainingId/attendance
export interface CreateTrainingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateTrainingResponse = ApiResponse<Training>;

// POST /api/training/:trainingId/progress
export interface CreateTrainingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateTrainingResponse = ApiResponse<Training>;

// POST /api/training/:trainingId/assessments
export interface CreateTrainingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateTrainingResponse = ApiResponse<Training>;

// POST /api/training/:trainingId/issue-certificate
export interface CreateTrainingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateTrainingResponse = ApiResponse<Training>;

// POST /api/training/:trainingId/evaluation
export interface CreateTrainingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateTrainingResponse = ApiResponse<Training>;

// POST /api/training/:trainingId/payment
export interface CreateTrainingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateTrainingResponse = ApiResponse<Training>;
