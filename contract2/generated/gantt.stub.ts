/**
 * Gantt API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/gantt/productivity
export interface GanttListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type GanttListResponse = PaginatedResponse<Gantt>;

// POST /api/gantt/data/filter
export interface CreateGanttRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateGanttResponse = ApiResponse<Gantt>;

// GET /api/gantt/data
export interface GanttListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type GanttListResponse = PaginatedResponse<Gantt>;

// GET /api/gantt/data/case/:caseId
export interface GanttListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type GanttListResponse = PaginatedResponse<Gantt>;

// GET /api/gantt/data/assigned/:userId
export interface GanttListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type GanttListResponse = PaginatedResponse<Gantt>;

// GET /api/gantt/hierarchy/:taskId
export interface GanttListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type GanttListResponse = PaginatedResponse<Gantt>;

// PUT /api/gantt/task/:id/dates
export interface UpdateGanttRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateGanttResponse = ApiResponse<Gantt>;

// PUT /api/gantt/task/:id/duration
export interface UpdateGanttRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateGanttResponse = ApiResponse<Gantt>;

// PUT /api/gantt/task/:id/progress
export interface UpdateGanttRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateGanttResponse = ApiResponse<Gantt>;

// PUT /api/gantt/task/:id/parent
export interface UpdateGanttRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateGanttResponse = ApiResponse<Gantt>;

// POST /api/gantt/task/reorder
export interface CreateGanttRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateGanttResponse = ApiResponse<Gantt>;

// GET /api/gantt/dependencies/:taskId
export interface GanttListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type GanttListResponse = PaginatedResponse<Gantt>;

// POST /api/gantt/link
export interface CreateGanttRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateGanttResponse = ApiResponse<Gantt>;

// DELETE /api/gantt/link/:source/:target
export type DeleteGanttResponse = ApiResponse<{ deleted: boolean }>;

// GET /api/gantt/critical-path/:projectId
export interface GanttListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type GanttListResponse = PaginatedResponse<Gantt>;

// GET /api/gantt/slack/:taskId
export interface GanttListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type GanttListResponse = PaginatedResponse<Gantt>;

// GET /api/gantt/bottlenecks/:projectId
export interface GanttListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type GanttListResponse = PaginatedResponse<Gantt>;

// GET /api/gantt/timeline/:projectId
export interface GanttListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type GanttListResponse = PaginatedResponse<Gantt>;

// GET /api/gantt/resources
export interface GanttListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type GanttListResponse = PaginatedResponse<Gantt>;

// GET /api/gantt/resources/conflicts
export interface GanttListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type GanttListResponse = PaginatedResponse<Gantt>;

// POST /api/gantt/resources/suggest
export interface CreateGanttRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateGanttResponse = ApiResponse<Gantt>;

// GET /api/gantt/resources/:userId/workload
export interface GanttListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type GanttListResponse = PaginatedResponse<Gantt>;

// POST /api/gantt/baseline/:projectId
export interface CreateGanttRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateGanttResponse = ApiResponse<Gantt>;

// GET /api/gantt/baseline/:projectId
export interface GanttListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type GanttListResponse = PaginatedResponse<Gantt>;

// GET /api/gantt/baseline/:projectId/compare
export interface GanttListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type GanttListResponse = PaginatedResponse<Gantt>;

// POST /api/gantt/auto-schedule/:projectId
export interface CreateGanttRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateGanttResponse = ApiResponse<Gantt>;

// POST /api/gantt/level-resources/:projectId
export interface CreateGanttRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateGanttResponse = ApiResponse<Gantt>;

// POST /api/gantt/milestone
export interface CreateGanttRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateGanttResponse = ApiResponse<Gantt>;

// GET /api/gantt/milestones/:projectId
export interface GanttListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type GanttListResponse = PaginatedResponse<Gantt>;

// GET /api/gantt/export/:projectId/msproject
export interface GanttListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type GanttListResponse = PaginatedResponse<Gantt>;

// GET /api/gantt/export/:projectId/pdf
export interface GanttListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type GanttListResponse = PaginatedResponse<Gantt>;

// GET /api/gantt/export/:projectId/excel
export interface GanttListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type GanttListResponse = PaginatedResponse<Gantt>;

// GET /api/gantt/collaboration/presence/:resourceId
export interface GanttListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type GanttListResponse = PaginatedResponse<Gantt>;

// POST /api/gantt/collaboration/presence
export interface CreateGanttRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateGanttResponse = ApiResponse<Gantt>;

// GET /api/gantt/collaboration/activities/:firmId
export interface GanttListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type GanttListResponse = PaginatedResponse<Gantt>;

// GET /api/gantt/collaboration/stats
export interface GanttListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type GanttListResponse = PaginatedResponse<Gantt>;
