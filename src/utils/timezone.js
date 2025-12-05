/**
 * Timezone Utility Module
 *
 * All dates in the system are stored in UTC in MongoDB.
 * This module provides conversion functions between UTC and Saudi timezone (Asia/Riyadh).
 *
 * Default timezone: Asia/Riyadh (UTC+3)
 * Note: Saudi Arabia does not observe Daylight Saving Time
 */

const { format, parseISO, isValid, startOfDay, endOfDay, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, subDays } = require('date-fns');
const { formatInTimeZone, toZonedTime, fromZonedTime } = require('date-fns-tz');

// Default timezone for Saudi Arabia
const DEFAULT_TIMEZONE = 'Asia/Riyadh';

// Supported timezones
const SUPPORTED_TIMEZONES = [
  'Asia/Riyadh',      // Saudi Arabia (UTC+3)
  'Asia/Dubai',       // UAE (UTC+4)
  'Asia/Kuwait',      // Kuwait (UTC+3)
  'Asia/Bahrain',     // Bahrain (UTC+3)
  'Asia/Qatar',       // Qatar (UTC+3)
  'Africa/Cairo',     // Egypt (UTC+2)
  'Europe/London',    // UK (UTC+0/+1 DST)
  'America/New_York', // US Eastern (UTC-5/-4 DST)
  'UTC'               // UTC
];

/**
 * Get the default timezone
 * @returns {string} Default timezone identifier
 */
const getDefaultTimezone = () => DEFAULT_TIMEZONE;

/**
 * Validate if a timezone identifier is supported
 * @param {string} timezone - Timezone identifier
 * @returns {boolean} True if supported
 */
const isValidTimezone = (timezone) => {
  try {
    // Try to use the timezone with Intl API
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch (e) {
    return false;
  }
};

/**
 * Parse a date input to a Date object
 * @param {Date|string|number} date - Date input
 * @returns {Date|null} Parsed Date object or null if invalid
 */
const parseDate = (date) => {
  if (!date) return null;

  if (date instanceof Date) {
    return isValid(date) ? date : null;
  }

  if (typeof date === 'string') {
    const parsed = parseISO(date);
    return isValid(parsed) ? parsed : null;
  }

  if (typeof date === 'number') {
    const parsed = new Date(date);
    return isValid(parsed) ? parsed : null;
  }

  return null;
};

/**
 * Convert a UTC date to a specific timezone
 * @param {Date|string} utcDate - UTC date
 * @param {string} timezone - Target timezone (default: Asia/Riyadh)
 * @returns {Date} Date in the target timezone
 */
const toTimezone = (utcDate, timezone = DEFAULT_TIMEZONE) => {
  const date = parseDate(utcDate);
  if (!date) return null;
  return toZonedTime(date, timezone);
};

/**
 * Convert a local date from a specific timezone to UTC
 * @param {Date|string} localDate - Local date in the specified timezone
 * @param {string} timezone - Source timezone (default: Asia/Riyadh)
 * @returns {Date} UTC date
 */
const toUTC = (localDate, timezone = DEFAULT_TIMEZONE) => {
  const date = parseDate(localDate);
  if (!date) return null;
  return fromZonedTime(date, timezone);
};

/**
 * Format a UTC date in a specific timezone
 * @param {Date|string} utcDate - UTC date
 * @param {string} formatStr - date-fns format string
 * @param {string} timezone - Target timezone (default: Asia/Riyadh)
 * @returns {string} Formatted date string
 */
const formatInTimezone = (utcDate, formatStr, timezone = DEFAULT_TIMEZONE) => {
  const date = parseDate(utcDate);
  if (!date) return '';
  return formatInTimeZone(date, timezone, formatStr);
};

/**
 * Format date for display in Saudi format (Arabic)
 * @param {Date|string} utcDate - UTC date
 * @param {Object} options - Formatting options
 * @param {string} options.timezone - Target timezone (default: Asia/Riyadh)
 * @param {boolean} options.includeTime - Include time in output (default: false)
 * @param {string} options.locale - Locale for formatting (default: 'en-SA')
 * @returns {string} Formatted date string
 */
const formatForDisplay = (utcDate, options = {}) => {
  const {
    timezone = DEFAULT_TIMEZONE,
    includeTime = false,
    locale = 'en-SA'
  } = options;

  const date = parseDate(utcDate);
  if (!date) return '';

  const formatStr = includeTime
    ? 'dd/MM/yyyy HH:mm'
    : 'dd/MM/yyyy';

  return formatInTimeZone(date, timezone, formatStr);
};

/**
 * Format date and time for display
 * @param {Date|string} utcDate - UTC date
 * @param {string} timezone - Target timezone (default: Asia/Riyadh)
 * @returns {string} Formatted date and time string
 */
const formatDateTime = (utcDate, timezone = DEFAULT_TIMEZONE) => {
  return formatForDisplay(utcDate, { timezone, includeTime: true });
};

/**
 * Format date only for display
 * @param {Date|string} utcDate - UTC date
 * @param {string} timezone - Target timezone (default: Asia/Riyadh)
 * @returns {string} Formatted date string
 */
const formatDateOnly = (utcDate, timezone = DEFAULT_TIMEZONE) => {
  return formatForDisplay(utcDate, { timezone, includeTime: false });
};

/**
 * Format time only for display
 * @param {Date|string} utcDate - UTC date
 * @param {string} timezone - Target timezone (default: Asia/Riyadh)
 * @returns {string} Formatted time string (HH:mm)
 */
const formatTimeOnly = (utcDate, timezone = DEFAULT_TIMEZONE) => {
  const date = parseDate(utcDate);
  if (!date) return '';
  return formatInTimeZone(date, timezone, 'HH:mm');
};

/**
 * Get ISO string representation with timezone offset
 * @param {Date|string} utcDate - UTC date
 * @param {string} timezone - Target timezone (default: Asia/Riyadh)
 * @returns {string} ISO string with timezone offset
 */
const toISOWithTimezone = (utcDate, timezone = DEFAULT_TIMEZONE) => {
  const date = parseDate(utcDate);
  if (!date) return '';
  return formatInTimeZone(date, timezone, "yyyy-MM-dd'T'HH:mm:ssXXX");
};

/**
 * Get the current date/time in a specific timezone
 * @param {string} timezone - Target timezone (default: Asia/Riyadh)
 * @returns {Date} Current time in the specified timezone
 */
const nowInTimezone = (timezone = DEFAULT_TIMEZONE) => {
  return toZonedTime(new Date(), timezone);
};

/**
 * Get the current date/time in Saudi Arabia
 * @returns {Date} Current time in Asia/Riyadh
 */
const nowInSaudi = () => nowInTimezone(DEFAULT_TIMEZONE);

/**
 * Get start of day in a specific timezone (returns UTC)
 * @param {Date|string} date - Date
 * @param {string} timezone - Timezone (default: Asia/Riyadh)
 * @returns {Date} UTC date representing start of day in timezone
 */
const startOfDayInTimezone = (date, timezone = DEFAULT_TIMEZONE) => {
  const parsed = parseDate(date);
  if (!parsed) return null;

  // Convert to timezone, get start of day, convert back to UTC
  const zoned = toZonedTime(parsed, timezone);
  const start = startOfDay(zoned);
  return fromZonedTime(start, timezone);
};

/**
 * Get end of day in a specific timezone (returns UTC)
 * @param {Date|string} date - Date
 * @param {string} timezone - Timezone (default: Asia/Riyadh)
 * @returns {Date} UTC date representing end of day in timezone
 */
const endOfDayInTimezone = (date, timezone = DEFAULT_TIMEZONE) => {
  const parsed = parseDate(date);
  if (!parsed) return null;

  const zoned = toZonedTime(parsed, timezone);
  const end = endOfDay(zoned);
  return fromZonedTime(end, timezone);
};

/**
 * Get start of week in a specific timezone (returns UTC)
 * @param {Date|string} date - Date
 * @param {string} timezone - Timezone (default: Asia/Riyadh)
 * @param {Object} options - Options (e.g., { weekStartsOn: 0 } for Sunday)
 * @returns {Date} UTC date representing start of week in timezone
 */
const startOfWeekInTimezone = (date, timezone = DEFAULT_TIMEZONE, options = { weekStartsOn: 0 }) => {
  const parsed = parseDate(date);
  if (!parsed) return null;

  const zoned = toZonedTime(parsed, timezone);
  const start = startOfWeek(zoned, options);
  return fromZonedTime(start, timezone);
};

/**
 * Get end of week in a specific timezone (returns UTC)
 * @param {Date|string} date - Date
 * @param {string} timezone - Timezone (default: Asia/Riyadh)
 * @param {Object} options - Options (e.g., { weekStartsOn: 0 } for Sunday)
 * @returns {Date} UTC date representing end of week in timezone
 */
const endOfWeekInTimezone = (date, timezone = DEFAULT_TIMEZONE, options = { weekStartsOn: 0 }) => {
  const parsed = parseDate(date);
  if (!parsed) return null;

  const zoned = toZonedTime(parsed, timezone);
  const end = endOfWeek(zoned, options);
  return fromZonedTime(end, timezone);
};

/**
 * Get start of month in a specific timezone (returns UTC)
 * @param {Date|string} date - Date
 * @param {string} timezone - Timezone (default: Asia/Riyadh)
 * @returns {Date} UTC date representing start of month in timezone
 */
const startOfMonthInTimezone = (date, timezone = DEFAULT_TIMEZONE) => {
  const parsed = parseDate(date);
  if (!parsed) return null;

  const zoned = toZonedTime(parsed, timezone);
  const start = startOfMonth(zoned);
  return fromZonedTime(start, timezone);
};

/**
 * Get end of month in a specific timezone (returns UTC)
 * @param {Date|string} date - Date
 * @param {string} timezone - Timezone (default: Asia/Riyadh)
 * @returns {Date} UTC date representing end of month in timezone
 */
const endOfMonthInTimezone = (date, timezone = DEFAULT_TIMEZONE) => {
  const parsed = parseDate(date);
  if (!parsed) return null;

  const zoned = toZonedTime(parsed, timezone);
  const end = endOfMonth(zoned);
  return fromZonedTime(end, timezone);
};

/**
 * Check if a date is today in a specific timezone
 * @param {Date|string} date - Date to check
 * @param {string} timezone - Timezone (default: Asia/Riyadh)
 * @returns {boolean} True if date is today in the timezone
 */
const isTodayInTimezone = (date, timezone = DEFAULT_TIMEZONE) => {
  const parsed = parseDate(date);
  if (!parsed) return false;

  const dateFormatted = formatInTimeZone(parsed, timezone, 'yyyy-MM-dd');
  const todayFormatted = formatInTimeZone(new Date(), timezone, 'yyyy-MM-dd');

  return dateFormatted === todayFormatted;
};

/**
 * Check if a date is in the past in a specific timezone
 * @param {Date|string} date - Date to check
 * @param {string} timezone - Timezone (default: Asia/Riyadh)
 * @returns {boolean} True if date is in the past
 */
const isPastInTimezone = (date, timezone = DEFAULT_TIMEZONE) => {
  const parsed = parseDate(date);
  if (!parsed) return false;

  const zonedDate = toZonedTime(parsed, timezone);
  const zonedNow = toZonedTime(new Date(), timezone);

  return zonedDate < zonedNow;
};

/**
 * Check if a date is in the future in a specific timezone
 * @param {Date|string} date - Date to check
 * @param {string} timezone - Timezone (default: Asia/Riyadh)
 * @returns {boolean} True if date is in the future
 */
const isFutureInTimezone = (date, timezone = DEFAULT_TIMEZONE) => {
  const parsed = parseDate(date);
  if (!parsed) return false;

  const zonedDate = toZonedTime(parsed, timezone);
  const zonedNow = toZonedTime(new Date(), timezone);

  return zonedDate > zonedNow;
};

/**
 * Get timezone offset in hours
 * @param {string} timezone - Timezone identifier (default: Asia/Riyadh)
 * @returns {number} Offset in hours (e.g., 3 for UTC+3)
 */
const getTimezoneOffset = (timezone = DEFAULT_TIMEZONE) => {
  const now = new Date();
  const utcDate = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
  const tzDate = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
  return (tzDate - utcDate) / (1000 * 60 * 60);
};

/**
 * Format timezone offset as string (e.g., "+03:00")
 * @param {string} timezone - Timezone identifier (default: Asia/Riyadh)
 * @returns {string} Formatted offset string
 */
const getTimezoneOffsetString = (timezone = DEFAULT_TIMEZONE) => {
  const offset = getTimezoneOffset(timezone);
  const sign = offset >= 0 ? '+' : '-';
  const hours = Math.floor(Math.abs(offset)).toString().padStart(2, '0');
  const minutes = ((Math.abs(offset) % 1) * 60).toString().padStart(2, '0');
  return `${sign}${hours}:${minutes}`;
};

/**
 * Create a date range for querying (returns UTC dates)
 * @param {Date|string} date - Reference date
 * @param {string} range - Range type ('day', 'week', 'month')
 * @param {string} timezone - Timezone (default: Asia/Riyadh)
 * @returns {Object} { startDate, endDate } in UTC
 */
const getDateRangeInTimezone = (date, range, timezone = DEFAULT_TIMEZONE) => {
  const parsed = parseDate(date) || new Date();

  switch (range) {
    case 'day':
      return {
        startDate: startOfDayInTimezone(parsed, timezone),
        endDate: endOfDayInTimezone(parsed, timezone)
      };
    case 'week':
      return {
        startDate: startOfWeekInTimezone(parsed, timezone),
        endDate: endOfWeekInTimezone(parsed, timezone)
      };
    case 'month':
      return {
        startDate: startOfMonthInTimezone(parsed, timezone),
        endDate: endOfMonthInTimezone(parsed, timezone)
      };
    default:
      return {
        startDate: startOfDayInTimezone(parsed, timezone),
        endDate: endOfDayInTimezone(parsed, timezone)
      };
  }
};

/**
 * Transform date fields in an object for API response
 * @param {Object} obj - Object with date fields
 * @param {string[]} dateFields - Array of field names to transform
 * @param {string} timezone - Target timezone (default: Asia/Riyadh)
 * @returns {Object} Object with formatted date fields added
 */
const transformDatesForResponse = (obj, dateFields, timezone = DEFAULT_TIMEZONE) => {
  if (!obj || typeof obj !== 'object') return obj;

  const result = { ...obj };

  dateFields.forEach(field => {
    if (obj[field]) {
      // Keep original UTC date
      result[field] = obj[field];
      // Add formatted version for display
      result[`${field}Formatted`] = formatDateTime(obj[field], timezone);
      // Add date-only version
      result[`${field}Date`] = formatDateOnly(obj[field], timezone);
    }
  });

  return result;
};

module.exports = {
  // Constants
  DEFAULT_TIMEZONE,
  SUPPORTED_TIMEZONES,

  // Core functions
  getDefaultTimezone,
  isValidTimezone,
  parseDate,
  toTimezone,
  toUTC,

  // Formatting
  formatInTimezone,
  formatForDisplay,
  formatDateTime,
  formatDateOnly,
  formatTimeOnly,
  toISOWithTimezone,

  // Current time helpers
  nowInTimezone,
  nowInSaudi,

  // Date range helpers
  startOfDayInTimezone,
  endOfDayInTimezone,
  startOfWeekInTimezone,
  endOfWeekInTimezone,
  startOfMonthInTimezone,
  endOfMonthInTimezone,
  getDateRangeInTimezone,

  // Comparison helpers
  isTodayInTimezone,
  isPastInTimezone,
  isFutureInTimezone,

  // Offset helpers
  getTimezoneOffset,
  getTimezoneOffsetString,

  // Response transformation
  transformDatesForResponse
};
