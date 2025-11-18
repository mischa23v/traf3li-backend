import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// Types
interface CalendarEvent {
  _id: string;
  title: string;
  type: 'hearing' | 'meeting' | 'deadline' | 'consultation';
  startDate: string;
  endDate?: string;
  startTime: string;
  endTime?: string;
  location?: string;
  caseId?: string | { _id: string; caseNumber: string; title: string };
  attendees?: string[];
  notes?: string;
  reminderBefore?: number;
  isAllDay: boolean;
  status: 'scheduled' | 'completed' | 'cancelled' | 'postponed';
  createdAt: string;
  updatedAt: string;
}

interface CreateEventInput {
  title: string;
  type: CalendarEvent['type'];
  startDate: string;
  endDate?: string;
  startTime: string;
  endTime?: string;
  location?: string;
  caseId?: string;
  attendees?: string[];
  notes?: string;
  reminderBefore?: number;
  isAllDay?: boolean;
}

interface UpdateEventInput extends Partial<CreateEventInput> {
  status?: CalendarEvent['status'];
}

// Fetch all events
export const useEvents = (filters?: {
  startDate?: string;
  endDate?: string;
  type?: string;
  caseId?: string;
  status?: string;
}) => {
  return useQuery({
    queryKey: ['events', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.startDate) params.append('startDate', filters.startDate);
      if (filters?.endDate) params.append('endDate', filters.endDate);
      if (filters?.type) params.append('type', filters.type);
      if (filters?.caseId) params.append('caseId', filters.caseId);
      if (filters?.status) params.append('status', filters.status);

      const response = await api.get(`/calendar/events?${params.toString()}`);
      return response.data.events as CalendarEvent[];
    },
  });
};

// Fetch single event
export const useEvent = (eventId: string) => {
  return useQuery({
    queryKey: ['event', eventId],
    queryFn: async () => {
      const response = await api.get(`/calendar/events/${eventId}`);
      return response.data.event as CalendarEvent;
    },
    enabled: !!eventId,
  });
};

// Create event
export const useCreateEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateEventInput) => {
      const response = await api.post('/calendar/events', data);
      return response.data.event as CalendarEvent;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
};

// Update event
export const useUpdateEvent = (eventId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateEventInput) => {
      const response = await api.put(`/calendar/events/${eventId}`, data);
      return response.data.event as CalendarEvent;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['event', eventId] });
    },
  });
};

// Delete event
export const useDeleteEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (eventId: string) => {
      await api.delete(`/calendar/events/${eventId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
};

// Get upcoming events
export const useUpcomingEvents = (days: number = 7) => {
  return useQuery({
    queryKey: ['events', 'upcoming', days],
    queryFn: async () => {
      const response = await api.get(`/calendar/events/upcoming?days=${days}`);
      return response.data.events as CalendarEvent[];
    },
  });
};

// Get events by case
export const useEventsByCase = (caseId: string) => {
  return useQuery({
    queryKey: ['events', 'case', caseId],
    queryFn: async () => {
      const response = await api.get(`/calendar/events/case/${caseId}`);
      return response.data.events as CalendarEvent[];
    },
    enabled: !!caseId,
  });
};

// Send reminder
export const useSendEventReminder = () => {
  return useMutation({
    mutationFn: async (eventId: string) => {
      await api.post(`/calendar/events/${eventId}/remind`);
    },
  });
};
