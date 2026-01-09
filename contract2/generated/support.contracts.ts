/**
 * Support API Contracts
 * Auto-generated from Joi validators
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';
import { Support } from './models';

// Standard Response Types
export type SupportResponse = ApiResponse<Support>;
export type SupportListResponse = PaginatedResponse<Support>;

// From: createTicketSchema
export interface CreateTicketRequest {
  subject: string;
  description: string;
  priority: string;
  ticketType: string;
  tags: any[];
  attachments: any[];
}

// From: updateTicketSchema
export interface UpdateTicketRequest {
  subject: string;
  description: string;
  status: string;
  priority: string;
  ticketType: string;
  tags: any[];
  internalNotes?: string;
}

// From: replyToTicketSchema
export interface ReplyToTicketRequest {
  content: string;
  isInternal?: boolean;
  attachments: any[];
}

// From: createSLASchema
export interface CreateSLARequest {
  name: string;
  priority: string;
  firstResponseMinutes: number;
  resolutionMinutes: number;
  description?: string;
  isActive?: boolean;
}

// From: updateSLASchema
export interface UpdateSLARequest {
  name: string;
  priority: string;
  firstResponseMinutes: number;
  resolutionMinutes: number;
  description?: string;
  isActive: boolean;
}

// From: updateSettingsSchema
export interface UpdateSettingsRequest {
  onNewTicket: boolean;
  onTicketReply: boolean;
  onTicketAssignment: boolean;
  onTicketStatusChange: boolean;
  onSLABreach: boolean;
  enabled: boolean;
  webhookUrl?: string;
  onNewTicket: boolean;
  onSLABreach: boolean;
  enabled: boolean;
  strategy: string;
  enabled: boolean;
  timezone: string;
  start: string;
  end: string;
  start: string;
  end: string;
  start: string;
  end: string;
  start: string;
  end: string;
  start: string;
  end: string;
  start: string;
  end: string;
  start: string;
  end: string;
  defaultPriority: string;
  enabled: boolean;
  afterDays: number;
}
