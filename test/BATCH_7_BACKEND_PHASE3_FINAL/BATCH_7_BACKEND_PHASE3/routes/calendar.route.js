const express = require('express');
const router = express.Router();
const calendarController = require('../controllers/calendar.controller');
const { authenticate } = require('../middlewares/authenticate');

// Create calendar event
router.post(
  '/events',
  authenticate,
  calendarController.createEvent
);

// Get all events with filters
router.get(
  '/events',
  authenticate,
  calendarController.getEvents
);

// Get upcoming events
router.get(
  '/events/upcoming',
  authenticate,
  calendarController.getUpcomingEvents
);

// Get events by case
router.get(
  '/events/case/:caseId',
  authenticate,
  calendarController.getEventsByCase
);

// Get single event
router.get(
  '/events/:id',
  authenticate,
  calendarController.getEvent
);

// Update event
router.put(
  '/events/:id',
  authenticate,
  calendarController.updateEvent
);

// Delete event
router.delete(
  '/events/:id',
  authenticate,
  calendarController.deleteEvent
);

// Send reminder (for cron job or manual trigger)
router.post(
  '/events/:id/remind',
  authenticate,
  calendarController.sendEventReminder
);

module.exports = router;
