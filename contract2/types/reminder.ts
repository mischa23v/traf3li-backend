/**
 * Reminder API Type Definitions
 * Auto-generated from /home/user/traf3li-backend/src/routes/reminder.route.js
 * and /home/user/traf3li-backend/src/controllers/reminder.controller.js
 * and /home/user/traf3li-backend/src/controllers/locationReminder.controller.js
 */

// ═══════════════════════════════════════════════════════════════
// COMMON TYPES
// ═══════════════════════════════════════════════════════════════

export interface BaseResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export type ReminderPriority = 'low' | 'medium' | 'high' | 'urgent';
export type ReminderType = 'general' | 'case' | 'task' | 'appointment' | 'invoice' | 'client' | 'deadline';
export type ReminderStatus = 'pending' | 'completed' | 'snoozed' | 'dismissed';
export type RepeatType = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
export type NotificationChannel = 'push' | 'email' | 'sms' | 'whatsapp';
export type LocationTriggerType = 'enter' | 'exit';
export type LocationType = 'home' | 'office' | 'court' | 'client' | 'custom';

// ═══════════════════════════════════════════════════════════════
// REMINDER MODEL
// ═══════════════════════════════════════════════════════════════

export interface NotificationConfig {
  channels: NotificationChannel[];
  advanceTime?: number; // minutes before dueDate
  sent?: boolean;
  sentAt?: Date;
}

export interface RecurrenceConfig {
  repeatType: RepeatType;
  interval?: number;
  daysOfWeek?: number[]; // 0-6 (Sunday-Saturday)
  dayOfMonth?: number;
  endDate?: Date;
  occurrences?: number;
}

export interface LocationTrigger {
  latitude: number;
  longitude: number;
  radius: number; // meters
  triggerType: LocationTriggerType;
  address?: string;
  lastTriggeredAt?: Date;
  timesTriggered?: number;
}

export interface Reminder {
  _id: string;
  title: string;
  description?: string;
  dueDate?: Date;
  priority: ReminderPriority;
  type: ReminderType;
  status: ReminderStatus;

  // Related entities
  relatedCase?: string;
  relatedTask?: string;
  relatedEvent?: string;
  relatedInvoice?: string;
  clientId?: string;

  // Recurrence
  isRecurring: boolean;
  recurrence?: RecurrenceConfig;

  // Notifications
  notification?: NotificationConfig;

  // Location-based
  locationTrigger?: LocationTrigger;

  // Organization
  tags?: string[];
  notes?: string;

  // System fields
  completedAt?: Date;
  snoozedUntil?: Date;
  firmId?: string;
  lawyerId?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// ═══════════════════════════════════════════════════════════════
// GET /api/reminders
// ═══════════════════════════════════════════════════════════════

export interface ListRemindersQuery {
  page?: number;
  limit?: number;
  status?: ReminderStatus;
  priority?: ReminderPriority;
  type?: ReminderType;
  search?: string;
  from?: string; // ISO date
  to?: string; // ISO date
  clientId?: string;
  relatedCase?: string;
  tags?: string; // comma-separated
  sortBy?: 'dueDate' | 'priority' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export interface ListRemindersResponse extends BaseResponse {
  data: {
    reminders: Reminder[];
    pagination: Pagination;
  };
}

// ═══════════════════════════════════════════════════════════════
// POST /api/reminders
// ═══════════════════════════════════════════════════════════════

export interface CreateReminderRequest {
  title: string;
  description?: string;
  dueDate?: string; // ISO date
  priority?: ReminderPriority;
  type?: ReminderType;
  relatedCase?: string;
  relatedTask?: string;
  relatedEvent?: string;
  relatedInvoice?: string;
  clientId?: string;
  isRecurring?: boolean;
  recurrence?: RecurrenceConfig;
  notification?: NotificationConfig;
  tags?: string[];
  notes?: string;
}

export interface CreateReminderResponse extends BaseResponse {
  data: Reminder;
}

// ═══════════════════════════════════════════════════════════════
// GET /api/reminders/:id
// ═══════════════════════════════════════════════════════════════

export interface GetReminderResponse extends BaseResponse {
  data: Reminder;
}

// ═══════════════════════════════════════════════════════════════
// PUT /api/reminders/:id
// ═══════════════════════════════════════════════════════════════

export interface UpdateReminderRequest {
  title?: string;
  description?: string;
  dueDate?: string; // ISO date
  priority?: ReminderPriority;
  type?: ReminderType;
  status?: ReminderStatus;
  relatedCase?: string;
  relatedTask?: string;
  relatedEvent?: string;
  relatedInvoice?: string;
  clientId?: string;
  isRecurring?: boolean;
  recurrence?: RecurrenceConfig;
  notification?: NotificationConfig;
  tags?: string[];
  notes?: string;
}

export interface UpdateReminderResponse extends BaseResponse {
  data: Reminder;
}

// ═══════════════════════════════════════════════════════════════
// DELETE /api/reminders/:id
// ═══════════════════════════════════════════════════════════════

export interface DeleteReminderResponse extends BaseResponse {}

// ═══════════════════════════════════════════════════════════════
// POST /api/reminders/:id/complete
// ═══════════════════════════════════════════════════════════════

export interface CompleteReminderResponse extends BaseResponse {
  data: Reminder;
}

// ═══════════════════════════════════════════════════════════════
// POST /api/reminders/:id/snooze
// ═══════════════════════════════════════════════════════════════

export interface SnoozeReminderRequest {
  minutes?: number;
  until?: string; // ISO date
}

export interface SnoozeReminderResponse extends BaseResponse {
  data: Reminder;
}

// ═══════════════════════════════════════════════════════════════
// POST /api/reminders/:id/dismiss
// ═══════════════════════════════════════════════════════════════

export interface DismissReminderResponse extends BaseResponse {
  data: Reminder;
}

// ═══════════════════════════════════════════════════════════════
// GET /api/reminders/upcoming?days=7
// ═══════════════════════════════════════════════════════════════

export interface UpcomingRemindersQuery {
  days?: number;
  limit?: number;
}

export interface UpcomingRemindersResponse extends BaseResponse {
  data: {
    reminders: Reminder[];
    count: number;
  };
}

// ═══════════════════════════════════════════════════════════════
// GET /api/reminders/overdue
// ═══════════════════════════════════════════════════════════════

export interface OverdueRemindersQuery {
  limit?: number;
}

export interface OverdueRemindersResponse extends BaseResponse {
  data: {
    reminders: Reminder[];
    count: number;
  };
}

// ═══════════════════════════════════════════════════════════════
// POST /api/reminders/bulk-update
// ═══════════════════════════════════════════════════════════════

export interface BulkUpdateRemindersRequest {
  reminderIds: string[];
  updates: {
    status?: ReminderStatus;
    priority?: ReminderPriority;
    tags?: string[];
  };
}

export interface BulkUpdateRemindersResponse extends BaseResponse {
  data: {
    updatedCount: number;
    failedCount: number;
  };
}

// ═══════════════════════════════════════════════════════════════
// POST /api/reminders/bulk-delete
// ═══════════════════════════════════════════════════════════════

export interface BulkDeleteRemindersRequest {
  reminderIds: string[];
}

export interface BulkDeleteRemindersResponse extends BaseResponse {
  data: {
    deletedCount: number;
  };
}

// ═══════════════════════════════════════════════════════════════
// GET /api/reminders/stats
// ═══════════════════════════════════════════════════════════════

export interface ReminderStatsResponse extends BaseResponse {
  data: {
    total: number;
    byStatus: Record<ReminderStatus, number>;
    byPriority: Record<ReminderPriority, number>;
    byType: Record<ReminderType, number>;
    overdue: number;
    dueToday: number;
    dueThisWeek: number;
  };
}

// ═══════════════════════════════════════════════════════════════
// LOCATION-BASED REMINDER TYPES
// ═══════════════════════════════════════════════════════════════

export interface UserLocation {
  _id: string;
  name: string;
  address?: string;
  lat: number;
  lng: number;
  type: LocationType;
  radius: number; // meters
  isDefault: boolean;
  isActive: boolean;
  firmId?: string;
  lawyerId?: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

// ═══════════════════════════════════════════════════════════════
// POST /api/reminders/location
// ═══════════════════════════════════════════════════════════════

export interface CreateLocationReminderRequest {
  title: string;
  description?: string;
  priority?: ReminderPriority;
  type?: ReminderType;
  relatedCase?: string;
  relatedTask?: string;
  relatedEvent?: string;
  relatedInvoice?: string;
  clientId?: string;
  notification?: NotificationConfig;
  tags?: string[];
  notes?: string;
  locationTrigger: {
    latitude: number;
    longitude: number;
    radius: number;
    triggerType: LocationTriggerType;
    address?: string;
  };
}

export interface CreateLocationReminderResponse extends BaseResponse {
  data: Reminder;
}

// ═══════════════════════════════════════════════════════════════
// POST /api/reminders/location/check
// ═══════════════════════════════════════════════════════════════

export interface CheckLocationTriggersRequest {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export interface CheckLocationTriggersResponse extends BaseResponse {
  data: {
    triggeredReminders: Reminder[];
    count: number;
  };
}

// ═══════════════════════════════════════════════════════════════
// POST /api/reminders/location/nearby
// ═══════════════════════════════════════════════════════════════

export interface GetNearbyRemindersRequest {
  latitude: number;
  longitude: number;
  radius?: number; // meters, default 500
}

export interface GetNearbyRemindersResponse extends BaseResponse {
  data: {
    reminders: Array<Reminder & { distance: number }>;
    count: number;
  };
}

// ═══════════════════════════════════════════════════════════════
// POST /api/reminders/location/save
// ═══════════════════════════════════════════════════════════════

export interface SaveUserLocationRequest {
  name: string;
  address?: string;
  lat: number;
  lng: number;
  type?: LocationType;
  radius?: number;
  isDefault?: boolean;
}

export interface SaveUserLocationResponse extends BaseResponse {
  data: UserLocation;
}

// ═══════════════════════════════════════════════════════════════
// GET /api/reminders/location/locations
// ═══════════════════════════════════════════════════════════════

export interface GetUserLocationsQuery {
  type?: LocationType;
  activeOnly?: 'true' | 'false';
  groupByType?: 'true' | 'false';
}

export interface GetUserLocationsResponse extends BaseResponse {
  data: {
    locations: UserLocation[];
    count: number;
    byType?: Record<LocationType, UserLocation[]>;
  };
}

// ═══════════════════════════════════════════════════════════════
// PUT /api/reminders/location/locations/:locationId
// ═══════════════════════════════════════════════════════════════

export interface UpdateUserLocationRequest {
  name?: string;
  address?: string;
  lat?: number;
  lng?: number;
  type?: LocationType;
  radius?: number;
  isDefault?: boolean;
  isActive?: boolean;
}

export interface UpdateUserLocationResponse extends BaseResponse {
  data: UserLocation;
}

// ═══════════════════════════════════════════════════════════════
// DELETE /api/reminders/location/locations/:locationId
// ═══════════════════════════════════════════════════════════════

export interface DeleteUserLocationResponse extends BaseResponse {}

// ═══════════════════════════════════════════════════════════════
// GET /api/reminders/location/summary
// ═══════════════════════════════════════════════════════════════

export interface LocationRemindersSummaryResponse extends BaseResponse {
  data: {
    totalLocationReminders: number;
    activeLocationReminders: number;
    savedLocations: number;
    recentlyTriggered: number;
  };
}

// ═══════════════════════════════════════════════════════════════
// POST /api/reminders/location/:reminderId/reset
// ═══════════════════════════════════════════════════════════════

export interface ResetLocationTriggerResponse extends BaseResponse {
  data: Reminder;
}

// ═══════════════════════════════════════════════════════════════
// POST /api/reminders/location/distance
// ═══════════════════════════════════════════════════════════════

export interface CalculateDistanceRequest {
  lat1: number;
  lng1: number;
  lat2: number;
  lng2: number;
}

export interface CalculateDistanceResponse extends BaseResponse {
  data: {
    distance: number; // meters (rounded)
    distanceKm: string; // formatted with 2 decimals
    point1: { latitude: number; longitude: number };
    point2: { latitude: number; longitude: number };
  };
}

// ═══════════════════════════════════════════════════════════════
// ENDPOINT SUMMARY
// ═══════════════════════════════════════════════════════════════

export const REMINDER_ENDPOINTS = {
  // Standard Reminder CRUD
  LIST: 'GET /api/reminders',
  CREATE: 'POST /api/reminders',
  GET: 'GET /api/reminders/:id',
  UPDATE: 'PUT /api/reminders/:id',
  DELETE: 'DELETE /api/reminders/:id',

  // Reminder Actions
  COMPLETE: 'POST /api/reminders/:id/complete',
  SNOOZE: 'POST /api/reminders/:id/snooze',
  DISMISS: 'POST /api/reminders/:id/dismiss',

  // Reminder Queries
  UPCOMING: 'GET /api/reminders/upcoming',
  OVERDUE: 'GET /api/reminders/overdue',
  STATS: 'GET /api/reminders/stats',

  // Bulk Operations
  BULK_UPDATE: 'POST /api/reminders/bulk-update',
  BULK_DELETE: 'POST /api/reminders/bulk-delete',

  // Location-Based Reminders
  CREATE_LOCATION: 'POST /api/reminders/location',
  CHECK_LOCATION: 'POST /api/reminders/location/check',
  NEARBY: 'POST /api/reminders/location/nearby',
  SAVE_LOCATION: 'POST /api/reminders/location/save',
  GET_LOCATIONS: 'GET /api/reminders/location/locations',
  UPDATE_LOCATION: 'PUT /api/reminders/location/locations/:locationId',
  DELETE_LOCATION: 'DELETE /api/reminders/location/locations/:locationId',
  LOCATION_SUMMARY: 'GET /api/reminders/location/summary',
  RESET_TRIGGER: 'POST /api/reminders/location/:reminderId/reset',
  CALCULATE_DISTANCE: 'POST /api/reminders/location/distance',
} as const;

// Total endpoints: 24
