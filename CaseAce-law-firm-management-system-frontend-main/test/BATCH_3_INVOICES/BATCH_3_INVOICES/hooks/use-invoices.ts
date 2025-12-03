import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// Types
interface Invoice {
  _id: string;
  invoiceNumber: string;
  caseId: string | { _id: string; caseNumber: string; title: string };
  clientId: string | { _id: string; fullName: string; email: string };
  amount: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  dueDate: string;
  issuedDate: string;
  items: {
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }[];
  notes?: string;
  paymentDetails?: {
    paymentMethod?: string;
    transactionId?: string;
    paidAt?: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface CreateInvoiceInput {
  caseId: string;
  clientId: string;
  amount: number;
  dueDate: string;
  items: {
    description: string;
    quantity: number;
    unitPrice: number;
  }[];
  notes?: string;
}

interface UpdateInvoiceInput extends Partial<CreateInvoiceInput> {
  status?: Invoice['status'];
}

// Fetch all invoices
export const useInvoices = (filters?: {
  status?: string;
  caseId?: string;
  clientId?: string;
}) => {
  return useQuery({
    queryKey: ['invoices', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.status) params.append('status', filters.status);
      if (filters?.caseId) params.append('caseId', filters.caseId);
      if (filters?.clientId) params.append('clientId', filters.clientId);

      const response = await api.get(`/invoices?${params.toString()}`);
      return response.data.invoices as Invoice[];
    },
  });
};

// Fetch single invoice
export const useInvoice = (invoiceId: string) => {
  return useQuery({
    queryKey: ['invoice', invoiceId],
    queryFn: async () => {
      const response = await api.get(`/invoices/${invoiceId}`);
      return response.data.invoice as Invoice;
    },
    enabled: !!invoiceId,
  });
};

// Create invoice
export const useCreateInvoice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateInvoiceInput) => {
      const response = await api.post('/invoices', data);
      return response.data.invoice as Invoice;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
};

// Update invoice
export const useUpdateInvoice = (invoiceId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateInvoiceInput) => {
      const response = await api.put(`/invoices/${invoiceId}`, data);
      return response.data.invoice as Invoice;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoice', invoiceId] });
    },
  });
};

// Delete invoice
export const useDeleteInvoice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invoiceId: string) => {
      await api.delete(`/invoices/${invoiceId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
};

// Send invoice to client
export const useSendInvoice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invoiceId: string) => {
      const response = await api.post(`/invoices/${invoiceId}/send`);
      return response.data.invoice as Invoice;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
};

// Mark invoice as paid
export const useMarkInvoicePaid = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      invoiceId,
      paymentDetails,
    }: {
      invoiceId: string;
      paymentDetails: {
        paymentMethod: string;
        transactionId?: string;
      };
    }) => {
      const response = await api.post(`/invoices/${invoiceId}/mark-paid`, paymentDetails);
      return response.data.invoice as Invoice;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
};

// Download invoice PDF
export const useDownloadInvoicePDF = () => {
  return useMutation({
    mutationFn: async (invoiceId: string) => {
      const response = await api.get(`/invoices/${invoiceId}/download`, {
        responseType: 'blob',
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice-${invoiceId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    },
  });
};

// Get invoice statistics
export const useInvoiceStats = () => {
  return useQuery({
    queryKey: ['invoice-stats'],
    queryFn: async () => {
      const response = await api.get('/invoices/stats');
      return response.data.stats as {
        totalInvoices: number;
        paidInvoices: number;
        pendingInvoices: number;
        overdueInvoices: number;
        totalRevenue: number;
        paidRevenue: number;
        pendingRevenue: number;
      };
    },
  });
};
