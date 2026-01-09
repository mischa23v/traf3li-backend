/**
 * Biometric API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// POST /api/biometric/devices
export interface CreateBiometricRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateBiometricResponse = ApiResponse<Biometric>;

// GET /api/biometric/devices
export interface BiometricListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type BiometricListResponse = PaginatedResponse<Biometric>;

// GET /api/biometric/devices/:id
export type GetBiometricResponse = ApiResponse<Biometric>;

// PUT /api/biometric/devices/:id
export interface UpdateBiometricRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateBiometricResponse = ApiResponse<Biometric>;

// DELETE /api/biometric/devices/:id
export type DeleteBiometricResponse = ApiResponse<{ deleted: boolean }>;

// POST /api/biometric/devices/:id/heartbeat
export interface CreateBiometricRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateBiometricResponse = ApiResponse<Biometric>;

// POST /api/biometric/devices/:id/sync
export interface CreateBiometricRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateBiometricResponse = ApiResponse<Biometric>;

// GET /api/biometric/enrollments/stats
export interface BiometricListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type BiometricListResponse = PaginatedResponse<Biometric>;

// POST /api/biometric/enrollments
export interface CreateBiometricRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateBiometricResponse = ApiResponse<Biometric>;

// GET /api/biometric/enrollments
export interface BiometricListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type BiometricListResponse = PaginatedResponse<Biometric>;

// GET /api/biometric/enrollments/:id
export type GetBiometricResponse = ApiResponse<Biometric>;

// GET /api/biometric/enrollments/employee/:employeeId
export interface BiometricListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type BiometricListResponse = PaginatedResponse<Biometric>;

// POST /api/biometric/enrollments/:id/fingerprint
export interface CreateBiometricRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateBiometricResponse = ApiResponse<Biometric>;

// POST /api/biometric/enrollments/:id/facial
export interface CreateBiometricRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateBiometricResponse = ApiResponse<Biometric>;

// POST /api/biometric/enrollments/:id/card
export interface CreateBiometricRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateBiometricResponse = ApiResponse<Biometric>;

// POST /api/biometric/enrollments/:id/pin
export interface CreateBiometricRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateBiometricResponse = ApiResponse<Biometric>;

// POST /api/biometric/enrollments/:id/revoke
export interface CreateBiometricRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateBiometricResponse = ApiResponse<Biometric>;

// POST /api/biometric/verify
export interface CreateBiometricRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateBiometricResponse = ApiResponse<Biometric>;

// POST /api/biometric/identify
export interface CreateBiometricRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateBiometricResponse = ApiResponse<Biometric>;

// POST /api/biometric/checkin-gps
export interface CreateBiometricRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateBiometricResponse = ApiResponse<Biometric>;

// POST /api/biometric/geofence/validate
export interface CreateBiometricRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateBiometricResponse = ApiResponse<Biometric>;

// POST /api/biometric/geofence
export interface CreateBiometricRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateBiometricResponse = ApiResponse<Biometric>;

// GET /api/biometric/geofence
export interface BiometricListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type BiometricListResponse = PaginatedResponse<Biometric>;

// GET /api/biometric/geofence/:id
export type GetBiometricResponse = ApiResponse<Biometric>;

// PUT /api/biometric/geofence/:id
export interface UpdateBiometricRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateBiometricResponse = ApiResponse<Biometric>;

// DELETE /api/biometric/geofence/:id
export type DeleteBiometricResponse = ApiResponse<{ deleted: boolean }>;

// GET /api/biometric/logs/stats
export interface BiometricListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type BiometricListResponse = PaginatedResponse<Biometric>;

// GET /api/biometric/logs/failed
export interface BiometricListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type BiometricListResponse = PaginatedResponse<Biometric>;

// GET /api/biometric/logs/spoofing
export interface BiometricListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type BiometricListResponse = PaginatedResponse<Biometric>;

// GET /api/biometric/logs/daily-summary
export interface BiometricListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type BiometricListResponse = PaginatedResponse<Biometric>;

// POST /api/biometric/logs/process
export interface CreateBiometricRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateBiometricResponse = ApiResponse<Biometric>;

// GET /api/biometric/logs
export interface BiometricListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type BiometricListResponse = PaginatedResponse<Biometric>;
