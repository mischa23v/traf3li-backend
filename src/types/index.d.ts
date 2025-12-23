import { Request } from 'express';
import { Document, Types } from 'mongoose';

// ═══════════════════════════════════════════════════════════════
// EXPRESS REQUEST EXTENSIONS
// ═══════════════════════════════════════════════════════════════
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userID?: string;
      user?: UserDocument;
      firmId?: string;
      isSeller?: boolean;
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// USER TYPES
// ═══════════════════════════════════════════════════════════════
export interface ICourtExperience {
  courtId: string;
  courtName: string;
  caseCount?: string;
}

export interface ILawyerProfile {
  isLicensed?: boolean;
  licenseNumber?: string;
  barAssociation?: string;
  verified?: boolean;
  yearsExperience?: number;
  workType?: string;
  firmName?: string;
  specialization?: string[];
  languages?: string[];
  courts?: ICourtExperience[];
  isRegisteredKhebra?: boolean;
  serviceType?: 'consultation' | 'litigation' | 'both' | null;
  pricingModel?: string[];
  hourlyRateMin?: number;
  hourlyRateMax?: number;
  acceptsRemote?: 'نعم' | 'لا' | 'كلاهما' | null;
  rating?: number;
  totalReviews?: number;
  casesWon?: number;
  casesTotal?: number;
  firmID?: Types.ObjectId;
}

export interface IMFABackupCode {
  code: string;
  used: boolean;
  usedAt?: Date;
}

export interface INotificationChannels {
  email: boolean;
  push: boolean;
  sms: boolean;
  whatsapp: boolean;
  in_app: boolean;
}

export interface INotificationTypes {
  task_reminders: boolean;
  hearing_reminders: boolean;
  case_updates: boolean;
  messages: boolean;
  payments: boolean;
}

export interface INotificationPreferences {
  channels: INotificationChannels;
  types: INotificationTypes;
}

export interface IPushSubscription {
  endpoint?: string;
  keys?: {
    p256dh?: string;
    auth?: string;
  };
}

export interface IPasswordHistory {
  hash: string;
  changedAt: Date;
}

export interface IPasswordExpiryWarnings {
  sevenDayWarning: boolean;
  oneDayWarning: boolean;
  expiredNotification: boolean;
}

export interface IUser {
  _id: Types.ObjectId;
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  image?: string;
  phone: string;
  description?: string;
  country?: string;
  nationality?: string;
  region?: string;
  city?: string;
  timezone?: string;
  isSeller?: boolean;
  role: 'client' | 'lawyer' | 'admin';
  lawyerMode?: 'marketplace' | 'dashboard' | null;
  isSoloLawyer?: boolean;
  lawyerWorkMode?: 'solo' | 'firm_owner' | 'firm_member' | null;
  firmId?: Types.ObjectId;
  firmRole?: 'owner' | 'admin' | 'partner' | 'lawyer' | 'paralegal' | 'secretary' | 'accountant' | 'departed' | null;
  firmStatus?: 'active' | 'departed' | 'suspended' | 'pending' | null;
  departedAt?: Date;
  dataAnonymized?: boolean;
  anonymizedAt?: Date;
  lawyerProfile?: ILawyerProfile;
  pushSubscription?: IPushSubscription;
  notificationPreferences?: INotificationPreferences;
  mfaEnabled?: boolean;
  mfaSecret?: string;
  mfaBackupCodes?: IMFABackupCode[];
  mfaVerifiedAt?: Date;
  isSSOUser?: boolean;
  ssoProvider?: 'azure' | 'okta' | 'google' | 'custom' | null;
  ssoExternalId?: string;
  createdViaSSO?: boolean;
  lastSSOLogin?: Date;
  lastLogin?: Date;
  passwordChangedAt?: Date;
  passwordExpiresAt?: Date;
  mustChangePassword?: boolean;
  mustChangePasswordSetAt?: Date;
  mustChangePasswordSetBy?: Types.ObjectId;
  passwordHistory?: IPasswordHistory[];
  passwordExpiryWarningsSent?: IPasswordExpiryWarnings;
  createdAt?: Date;
  updatedAt?: Date;
}

export type UserDocument = Document<Types.ObjectId> & IUser;

// ═══════════════════════════════════════════════════════════════
// COMMON API RESPONSE TYPES
// ═══════════════════════════════════════════════════════════════
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  message: string;
  code?: string;
  details?: any;
}

// ═══════════════════════════════════════════════════════════════
// PAGINATION & QUERY TYPES
// ═══════════════════════════════════════════════════════════════
export interface PaginationParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface QueryFilter {
  [key: string]: any;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ═══════════════════════════════════════════════════════════════
// JWT PAYLOAD TYPES
// ═══════════════════════════════════════════════════════════════
export interface JWTPayload {
  _id: string;
  email?: string;
  role?: string;
  firmId?: string;
  iat?: number;
  exp?: number;
}

// ═══════════════════════════════════════════════════════════════
// COMMON VALIDATION TYPES
// ═══════════════════════════════════════════════════════════════
export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

// ═══════════════════════════════════════════════════════════════
// FILE UPLOAD TYPES
// ═══════════════════════════════════════════════════════════════
export interface FileUpload {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination?: string;
  filename?: string;
  path?: string;
  buffer?: Buffer;
}

// ═══════════════════════════════════════════════════════════════
// AUDIT LOG TYPES
// ═══════════════════════════════════════════════════════════════
export interface IAuditLog {
  userId?: Types.ObjectId;
  firmId?: Types.ObjectId;
  action: string;
  resource: string;
  resourceId?: string;
  changes?: any;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}

// Make this file a module
export {};
