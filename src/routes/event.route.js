const express = require('express');
const { userMiddleware } = require('../middlewares');
const {
    createEvent,
    getEvents,
    getEvent,
    updateEvent,
    deleteEvent,
    getUpcomingEvents,
    getEventsByDate,
    getEventsByMonth,
    markEventCompleted
} = require('../controllers/event.controller');

const app = express.Router();

// Create event
app.post('/', userMiddleware, createEvent);

// Get all events (with filters)
app.get('/', userMiddleware, getEvents);

// Get upcoming events (next 7 days)
app.get('/upcoming', userMiddleware, getUpcomingEvents);

// Get events by month
app.get('/month/:year/:month', userMiddleware, getEventsByMonth);

// Get events by specific date
app.get('/date/:date', userMiddleware, getEventsByDate);

// Get single event
app.get('/:id', userMiddleware, getEvent);

// Update event
app.patch('/:id', userMiddleware, updateEvent);

// Delete event
app.delete('/:id', userMiddleware, deleteEvent);

// Mark event as completed
app.post('/:id/complete', userMiddleware, markEventCompleted);

module.exports = app;
