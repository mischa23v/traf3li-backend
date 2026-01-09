/**
 * Webauthn API Contracts
 * Auto-generated from Joi validators
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';
import { Webauthn } from './models';

// Standard Response Types
export type WebauthnResponse = ApiResponse<Webauthn>;
export type WebauthnListResponse = PaginatedResponse<Webauthn>;

// From: startAuthenticationSchema
export interface StartAuthenticationRequest {
  email: string;
  username: string;
}

// From: finishAuthenticationSchema
export interface FinishAuthenticationRequest {
  credential: Record<string, any>;
  userId: string;
}

// From: finishRegistrationSchema
export interface FinishRegistrationRequest {
  credential: Record<string, any>;
  credentialName?: string;
}

// From: updateCredentialNameSchema
export interface UpdateCredentialNameRequest {
  name: string;
}

// From: credentialIdParamSchema
export interface CredentialIdParamRequest {
  id: string;
}
