const express = require('express');
const { userMiddleware } = require('../middlewares');
const {
    createEvent,
    getEvents,
    getEvent,
    updateEvent,
    deleteEvent,
    cancelEvent,
    postponeEvent,
    completeEvent,
    addAttendee,
    removeAttendee,
    rsvpEvent,
    addAgendaItem,
    updateAgendaItem,
    deleteAgendaItem,
    addActionItem,
    updateActionItem,
    getCalendarEvents,
    getUpcomingEvents,
    getEventsByDate,
    getEventsByMonth,
    getEventStats,
    checkAvailability
} = require('../controllers/event.controller');

const app = express.Router();

// Static routes (must be before parameterized routes)
app.get('/stats', userMiddleware, getEventStats);
app.get('/calendar', userMiddleware, getCalendarEvents);
app.get('/upcoming', userMiddleware, getUpcomingEvents);
app.get('/month/:year/:month', userMiddleware, getEventsByMonth);
app.get('/date/:date', userMiddleware, getEventsByDate);
app.post('/availability', userMiddleware, checkAvailability);

// Event CRUD
app.post('/', userMiddleware, createEvent);
app.get('/', userMiddleware, getEvents);
app.get('/:id', userMiddleware, getEvent);
app.put('/:id', userMiddleware, updateEvent);
app.patch('/:id', userMiddleware, updateEvent);
app.delete('/:id', userMiddleware, deleteEvent);

// Event actions
app.post('/:id/complete', userMiddleware, completeEvent);
app.post('/:id/cancel', userMiddleware, cancelEvent);
app.post('/:id/postpone', userMiddleware, postponeEvent);

// Attendee management
app.post('/:id/attendees', userMiddleware, addAttendee);
app.delete('/:id/attendees/:attendeeId', userMiddleware, removeAttendee);
app.post('/:id/rsvp', userMiddleware, rsvpEvent);

// Agenda management
app.post('/:id/agenda', userMiddleware, addAgendaItem);
app.put('/:id/agenda/:agendaId', userMiddleware, updateAgendaItem);
app.delete('/:id/agenda/:agendaId', userMiddleware, deleteAgendaItem);

// Action items
app.post('/:id/action-items', userMiddleware, addActionItem);
app.put('/:id/action-items/:itemId', userMiddleware, updateActionItem);

module.exports = app;
