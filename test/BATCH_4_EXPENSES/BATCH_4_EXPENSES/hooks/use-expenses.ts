import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// Types
interface Expense {
  _id: string;
  description: string;
  amount: number;
  category: 'court_fees' | 'travel' | 'consultation' | 'documents' | 'research' | 'other';
  caseId?: string | { _id: string; caseNumber: string; title: string };
  date: string;
  receiptUrl?: string;
  notes?: string;
  isBillable: boolean;
  isReimbursed: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CreateExpenseInput {
  description: string;
  amount: number;
  category: Expense['category'];
  caseId?: string;
  date: string;
  receiptUrl?: string;
  notes?: string;
  isBillable: boolean;
}

interface UpdateExpenseInput extends Partial<CreateExpenseInput> {
  isReimbursed?: boolean;
}

interface ExpenseStats {
  totalExpenses: number;
  billableExpenses: number;
  nonBillableExpenses: number;
  reimbursedExpenses: number;
  byCategory: {
    category: Expense['category'];
    total: number;
    count: number;
  }[];
  byMonth: {
    month: string;
    total: number;
    count: number;
  }[];
}

// Fetch all expenses
export const useExpenses = (filters?: {
  category?: string;
  caseId?: string;
  startDate?: string;
  endDate?: string;
  isBillable?: boolean;
  isReimbursed?: boolean;
}) => {
  return useQuery({
    queryKey: ['expenses', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.category) params.append('category', filters.category);
      if (filters?.caseId) params.append('caseId', filters.caseId);
      if (filters?.startDate) params.append('startDate', filters.startDate);
      if (filters?.endDate) params.append('endDate', filters.endDate);
      if (filters?.isBillable !== undefined) {
        params.append('isBillable', String(filters.isBillable));
      }
      if (filters?.isReimbursed !== undefined) {
        params.append('isReimbursed', String(filters.isReimbursed));
      }

      const response = await api.get(`/expenses?${params.toString()}`);
      return response.data.expenses as Expense[];
    },
  });
};

// Fetch single expense
export const useExpense = (expenseId: string) => {
  return useQuery({
    queryKey: ['expense', expenseId],
    queryFn: async () => {
      const response = await api.get(`/expenses/${expenseId}`);
      return response.data.expense as Expense;
    },
    enabled: !!expenseId,
  });
};

// Create expense
export const useCreateExpense = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateExpenseInput) => {
      const response = await api.post('/expenses', data);
      return response.data.expense as Expense;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expense-stats'] });
    },
  });
};

// Update expense
export const useUpdateExpense = (expenseId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateExpenseInput) => {
      const response = await api.put(`/expenses/${expenseId}`, data);
      return response.data.expense as Expense;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expense', expenseId] });
      queryClient.invalidateQueries({ queryKey: ['expense-stats'] });
    },
  });
};

// Delete expense
export const useDeleteExpense = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (expenseId: string) => {
      await api.delete(`/expenses/${expenseId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expense-stats'] });
    },
  });
};

// Mark expense as reimbursed
export const useMarkExpenseReimbursed = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (expenseId: string) => {
      const response = await api.post(`/expenses/${expenseId}/reimburse`);
      return response.data.expense as Expense;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expense-stats'] });
    },
  });
};

// Upload receipt
export const useUploadReceipt = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      expenseId,
      file,
    }: {
      expenseId: string;
      file: File;
    }) => {
      const formData = new FormData();
      formData.append('receipt', file);

      const response = await api.post(
        `/expenses/${expenseId}/upload-receipt`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      return response.data.expense as Expense;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
  });
};

// Get expense statistics
export const useExpenseStats = (filters?: {
  startDate?: string;
  endDate?: string;
  caseId?: string;
}) => {
  return useQuery({
    queryKey: ['expense-stats', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.startDate) params.append('startDate', filters.startDate);
      if (filters?.endDate) params.append('endDate', filters.endDate);
      if (filters?.caseId) params.append('caseId', filters.caseId);

      const response = await api.get(`/expenses/stats?${params.toString()}`);
      return response.data.stats as ExpenseStats;
    },
  });
};

// Get expenses by case
export const useExpensesByCase = (caseId: string) => {
  return useQuery({
    queryKey: ['expenses', 'case', caseId],
    queryFn: async () => {
      const response = await api.get(`/expenses/case/${caseId}`);
      return response.data.expenses as Expense[];
    },
    enabled: !!caseId,
  });
};

// Get billable expenses (not yet invoiced)
export const useBillableExpenses = (caseId?: string) => {
  return useQuery({
    queryKey: ['expenses', 'billable', caseId],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('isBillable', 'true');
      params.append('invoiced', 'false');
      if (caseId) params.append('caseId', caseId);

      const response = await api.get(`/expenses?${params.toString()}`);
      return response.data.expenses as Expense[];
    },
  });
};

// Export expenses to CSV
export const useExportExpenses = () => {
  return useMutation({
    mutationFn: async (filters?: {
      startDate?: string;
      endDate?: string;
      category?: string;
    }) => {
      const params = new URLSearchParams();
      if (filters?.startDate) params.append('startDate', filters.startDate);
      if (filters?.endDate) params.append('endDate', filters.endDate);
      if (filters?.category) params.append('category', filters.category);

      const response = await api.get(`/expenses/export?${params.toString()}`, {
        responseType: 'blob',
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `expenses-${new Date().toISOString()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    },
  });
};
