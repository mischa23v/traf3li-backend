// ═══════════════════════════════════════════════════════════════
// SERVICE TYPE STUBS
// ═══════════════════════════════════════════════════════════════
// These are placeholder type definitions for service layer functions.
// You can gradually expand these with more specific types as needed.

import { Types } from 'mongoose';

// ───────────────────────────────────────────────────────────────
// EMAIL SERVICE
// ───────────────────────────────────────────────────────────────
export interface EmailAttachment {
  filename: string;
  content?: Buffer | string;
  path?: string;
  contentType?: string;
}

export interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  attachments?: EmailAttachment[];
  replyTo?: string;
}

export interface EmailResult {
  id: string;
  success: boolean;
  queued?: boolean;
}

// ───────────────────────────────────────────────────────────────
// AUDIT LOG SERVICE
// ───────────────────────────────────────────────────────────────
export interface CreateAuditLogParams {
  userId?: string | Types.ObjectId;
  firmId?: string | Types.ObjectId;
  action: string;
  resource: string;
  resourceId?: string;
  changes?: any;
  ipAddress?: string;
  userAgent?: string;
}

// ───────────────────────────────────────────────────────────────
// CACHE SERVICE
// ───────────────────────────────────────────────────────────────
export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  prefix?: string;
}

// ───────────────────────────────────────────────────────────────
// WEBHOOK SERVICE
// ───────────────────────────────────────────────────────────────
export interface WebhookPayload {
  event: string;
  data: any;
  timestamp: Date | string;
  firmId?: string;
}

export interface WebhookDeliveryResult {
  success: boolean;
  statusCode?: number;
  error?: string;
  attempts?: number;
}

// ───────────────────────────────────────────────────────────────
// NOTIFICATION SERVICE
// ───────────────────────────────────────────────────────────────
export interface NotificationPayload {
  userId: string | Types.ObjectId;
  firmId?: string | Types.ObjectId;
  type: string;
  title: string;
  message: string;
  data?: any;
  channels?: ('email' | 'push' | 'sms' | 'whatsapp' | 'in_app')[];
}

// ───────────────────────────────────────────────────────────────
// ANALYTICS SERVICE
// ───────────────────────────────────────────────────────────────
export interface AnalyticsEvent {
  userId?: string;
  firmId?: string;
  event: string;
  properties?: Record<string, any>;
  timestamp?: Date;
}

// ───────────────────────────────────────────────────────────────
// PDF EXPORT SERVICE
// ───────────────────────────────────────────────────────────────
export interface PDFExportOptions {
  format?: 'A4' | 'Letter';
  orientation?: 'portrait' | 'landscape';
  margin?: {
    top?: string;
    right?: string;
    bottom?: string;
    left?: string;
  };
  headerTemplate?: string;
  footerTemplate?: string;
  displayHeaderFooter?: boolean;
}

export interface PDFExportResult {
  buffer?: Buffer;
  path?: string;
  url?: string;
}

// ───────────────────────────────────────────────────────────────
// QUEUE SERVICE
// ───────────────────────────────────────────────────────────────
export interface QueueJob {
  jobId: string;
  name: string;
  data: any;
  status: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed';
  progress?: number;
  result?: any;
  error?: string;
}

export interface QueueJobOptions {
  delay?: number;
  attempts?: number;
  backoff?: number | { type: string; delay: number };
  priority?: number;
}

// ───────────────────────────────────────────────────────────────
// MFA SERVICE
// ───────────────────────────────────────────────────────────────
export interface MFASetupResult {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

export interface MFAVerifyResult {
  success: boolean;
  isBackupCode?: boolean;
}

// ───────────────────────────────────────────────────────────────
// SAML/SSO SERVICE
// ───────────────────────────────────────────────────────────────
export interface SAMLUserProfile {
  nameID: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  attributes?: Record<string, any>;
}

export interface SSOProviderConfig {
  name: string;
  entityId: string;
  entryPoint: string;
  certificate: string;
  enabled: boolean;
}

// ───────────────────────────────────────────────────────────────
// DOCUMENT ANALYSIS SERVICE (AI)
// ───────────────────────────────────────────────────────────────
export interface DocumentAnalysisResult {
  text?: string;
  summary?: string;
  entities?: Array<{
    type: string;
    value: string;
    confidence?: number;
  }>;
  classification?: string;
  confidence?: number;
}

// ───────────────────────────────────────────────────────────────
// BANK RECONCILIATION SERVICE
// ───────────────────────────────────────────────────────────────
export interface BankTransaction {
  date: Date | string;
  description: string;
  amount: number;
  type: 'debit' | 'credit';
  balance?: number;
  reference?: string;
}

export interface ReconciliationMatch {
  bankTransaction: BankTransaction;
  systemTransaction?: any;
  matchScore: number;
  matchType: 'exact' | 'partial' | 'suggested' | 'none';
}

// ───────────────────────────────────────────────────────────────
// PERMISSION SERVICE
// ───────────────────────────────────────────────────────────────
export interface PermissionCheckParams {
  userId: string | Types.ObjectId;
  firmId?: string | Types.ObjectId;
  action: string;
  resource: string;
  resourceId?: string;
}

export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
}

// ───────────────────────────────────────────────────────────────
// SESSION MANAGER SERVICE
// ───────────────────────────────────────────────────────────────
export interface SessionInfo {
  sessionId: string;
  userId: string;
  expiresAt: Date;
  ipAddress?: string;
  userAgent?: string;
  lastActivity?: Date;
}

// ───────────────────────────────────────────────────────────────
// ENCRYPTION SERVICE
// ───────────────────────────────────────────────────────────────
export interface EncryptionResult {
  encrypted: string;
  iv?: string;
}

export interface DecryptionResult {
  decrypted: string;
}

// ───────────────────────────────────────────────────────────────
// SMART CATEGORIZATION SERVICE (AI)
// ───────────────────────────────────────────────────────────────
export interface CategorizationResult {
  category: string;
  confidence: number;
  suggestedTags?: string[];
}

// ───────────────────────────────────────────────────────────────
// PRICE SERVICE
// ───────────────────────────────────────────────────────────────
export interface PriceCalculation {
  basePrice: number;
  discounts?: Array<{
    type: string;
    amount: number;
  }>;
  taxes?: Array<{
    type: string;
    rate: number;
    amount: number;
  }>;
  total: number;
}

// Make this file a module
export {};
