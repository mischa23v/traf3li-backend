import { useQuery, useMutation, useQueryClient } from '@tantml:react-query';
import api from '@/lib/api';

// Types
interface TimeEntry {
  _id: string;
  description: string;
  caseId: string | { _id: string; caseNumber: string; title: string };
  date: string;
  startTime: string;
  endTime?: string;
  duration: number; // minutes
  hourlyRate: number;
  totalAmount: number;
  isBillable: boolean;
  isBilled: boolean;
  invoiceId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface CreateTimeEntryInput {
  description: string;
  caseId: string;
  date: string;
  startTime: string;
  endTime?: string;
  duration: number;
  hourlyRate: number;
  isBillable: boolean;
  notes?: string;
}

interface UpdateTimeEntryInput extends Partial<CreateTimeEntryInput> {
  isBilled?: boolean;
  invoiceId?: string;
}

interface TimeStats {
  totalMinutes: number;
  billableMinutes: number;
  nonBillableMinutes: number;
  totalAmount: number;
  billedAmount: number;
  unbilledAmount: number;
  byCase: {
    caseId: string;
    caseNumber: string;
    totalMinutes: number;
    totalAmount: number;
  }[];
  byDay: {
    date: string;
    totalMinutes: number;
    totalAmount: number;
  }[];
}

// Fetch all time entries
export const useTimeEntries = (filters?: {
  period?: 'today' | 'week' | 'month' | 'year';
  startDate?: string;
  endDate?: string;
  caseId?: string;
  isBillable?: boolean;
  isBilled?: boolean;
}) => {
  return useQuery({
    queryKey: ['time-entries', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.period) params.append('period', filters.period);
      if (filters?.startDate) params.append('startDate', filters.startDate);
      if (filters?.endDate) params.append('endDate', filters.endDate);
      if (filters?.caseId) params.append('caseId', filters.caseId);
      if (filters?.isBillable !== undefined) {
        params.append('isBillable', String(filters.isBillable));
      }
      if (filters?.isBilled !== undefined) {
        params.append('isBilled', String(filters.isBilled));
      }

      const response = await api.get(`/time-tracking?${params.toString()}`);
      return response.data.timeEntries as TimeEntry[];
    },
  });
};

// Fetch single time entry
export const useTimeEntry = (entryId: string) => {
  return useQuery({
    queryKey: ['time-entry', entryId],
    queryFn: async () => {
      const response = await api.get(`/time-tracking/${entryId}`);
      return response.data.timeEntry as TimeEntry;
    },
    enabled: !!entryId,
  });
};

// Create time entry
export const useCreateTimeEntry = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateTimeEntryInput) => {
      const response = await api.post('/time-tracking', data);
      return response.data.timeEntry as TimeEntry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-entries'] });
      queryClient.invalidateQueries({ queryKey: ['time-stats'] });
    },
  });
};

// Update time entry
export const useUpdateTimeEntry = (entryId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateTimeEntryInput) => {
      const response = await api.put(`/time-tracking/${entryId}`, data);
      return response.data.timeEntry as TimeEntry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-entries'] });
      queryClient.invalidateQueries({ queryKey: ['time-entry', entryId] });
      queryClient.invalidateQueries({ queryKey: ['time-stats'] });
    },
  });
};

// Delete time entry
export const useDeleteTimeEntry = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (entryId: string) => {
      await api.delete(`/time-tracking/${entryId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-entries'] });
      queryClient.invalidateQueries({ queryKey: ['time-stats'] });
    },
  });
};

// Get time tracking statistics
export const useTimeStats = (filters?: {
  period?: 'today' | 'week' | 'month' | 'year';
  startDate?: string;
  endDate?: string;
  caseId?: string;
}) => {
  return useQuery({
    queryKey: ['time-stats', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.period) params.append('period', filters.period);
      if (filters?.startDate) params.append('startDate', filters.startDate);
      if (filters?.endDate) params.append('endDate', filters.endDate);
      if (filters?.caseId) params.append('caseId', filters.caseId);

      const response = await api.get(`/time-tracking/stats?${params.toString()}`);
      return response.data.stats as TimeStats;
    },
  });
};

// Get time entries by case
export const useTimeEntriesByCase = (caseId: string) => {
  return useQuery({
    queryKey: ['time-entries', 'case', caseId],
    queryFn: async () => {
      const response = await api.get(`/time-tracking/case/${caseId}`);
      return response.data.timeEntries as TimeEntry[];
    },
    enabled: !!caseId,
  });
};

// Get unbilled time entries
export const useUnbilledTimeEntries = (caseId?: string) => {
  return useQuery({
    queryKey: ['time-entries', 'unbilled', caseId],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('isBilled', 'false');
      params.append('isBillable', 'true');
      if (caseId) params.append('caseId', caseId);

      const response = await api.get(`/time-tracking?${params.toString()}`);
      return response.data.timeEntries as TimeEntry[];
    },
  });
};

// Mark time entries as billed
export const useMarkTimeEntriesBilled = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      entryIds,
      invoiceId,
    }: {
      entryIds: string[];
      invoiceId: string;
    }) => {
      const response = await api.post('/time-tracking/mark-billed', {
        entryIds,
        invoiceId,
      });
      return response.data.timeEntries as TimeEntry[];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-entries'] });
      queryClient.invalidateQueries({ queryKey: ['time-stats'] });
    },
  });
};

// Export time entries to CSV
export const useExportTimeEntries = () => {
  return useMutation({
    mutationFn: async (filters?: {
      startDate?: string;
      endDate?: string;
      caseId?: string;
    }) => {
      const params = new URLSearchParams();
      if (filters?.startDate) params.append('startDate', filters.startDate);
      if (filters?.endDate) params.append('endDate', filters.endDate);
      if (filters?.caseId) params.append('caseId', filters.caseId);

      const response = await api.get(`/time-tracking/export?${params.toString()}`, {
        responseType: 'blob',
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `time-entries-${new Date().toISOString()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    },
  });
};

// Start active timer (stored in localStorage)
export const useStartTimer = () => {
  return useMutation({
    mutationFn: async ({
      description,
      caseId,
    }: {
      description: string;
      caseId: string;
    }) => {
      const timer = {
        description,
        caseId,
        startTime: new Date().toISOString(),
      };
      localStorage.setItem('activeTimer', JSON.stringify(timer));
      return timer;
    },
  });
};

// Get active timer from localStorage
export const useActiveTimer = () => {
  return useQuery({
    queryKey: ['active-timer'],
    queryFn: () => {
      const timer = localStorage.getItem('activeTimer');
      return timer ? JSON.parse(timer) : null;
    },
    refetchInterval: 1000, // Update every second
  });
};

// Stop active timer
export const useStopTimer = () => {
  const queryClient = useQueryClient();
  const createTimeEntry = useCreateTimeEntry();

  return useMutation({
    mutationFn: async () => {
      const timer = localStorage.getItem('activeTimer');
      if (!timer) throw new Error('No active timer');

      const { description, caseId, startTime } = JSON.parse(timer);
      const endTime = new Date();
      const duration = Math.floor(
        (endTime.getTime() - new Date(startTime).getTime()) / 1000 / 60
      );

      // Create time entry
      await createTimeEntry.mutateAsync({
        description,
        caseId,
        date: startTime,
        startTime: new Date(startTime).toTimeString().slice(0, 5),
        endTime: endTime.toTimeString().slice(0, 5),
        duration,
        hourlyRate: 500, // Should come from settings
        isBillable: true,
      });

      // Remove from localStorage
      localStorage.removeItem('activeTimer');

      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-timer'] });
    },
  });
};
