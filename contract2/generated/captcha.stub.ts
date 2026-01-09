/**
 * Captcha API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// POST /api/captcha/verify-captcha
export interface CreateCaptchaRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateCaptchaResponse = ApiResponse<Captcha>;

// GET /api/captcha/captcha/providers
export interface CaptchaListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type CaptchaListResponse = PaginatedResponse<Captcha>;

// GET /api/captcha/captcha/status/:provider
export interface CaptchaListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type CaptchaListResponse = PaginatedResponse<Captcha>;
