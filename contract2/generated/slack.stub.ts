/**
 * Slack API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/slack/auth-url
export interface SlackListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type SlackListResponse = PaginatedResponse<Slack>;

// GET /api/slack/callback
export interface SlackListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type SlackListResponse = PaginatedResponse<Slack>;

// GET /api/slack/status
export interface SlackListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type SlackListResponse = PaginatedResponse<Slack>;

// POST /api/slack/disconnect
export interface CreateSlackRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSlackResponse = ApiResponse<Slack>;

// POST /api/slack/test
export interface CreateSlackRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSlackResponse = ApiResponse<Slack>;

// POST /api/slack/message
export interface CreateSlackRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSlackResponse = ApiResponse<Slack>;

// GET /api/slack/channels
export interface SlackListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type SlackListResponse = PaginatedResponse<Slack>;

// POST /api/slack/channels
export interface CreateSlackRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSlackResponse = ApiResponse<Slack>;

// GET /api/slack/settings
export interface SlackListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type SlackListResponse = PaginatedResponse<Slack>;

// PUT /api/slack/settings
export interface UpdateSlackRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateSlackResponse = ApiResponse<Slack>;

// POST /api/slack/webhook
export interface CreateSlackRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSlackResponse = ApiResponse<Slack>;

// GET /api/slack/users/:slackUserId
export interface SlackListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type SlackListResponse = PaginatedResponse<Slack>;
