import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// Types
interface Document {
  _id: string;
  fileName: string;
  originalName: string;
  fileType: string;
  fileSize: number;
  url: string;
  category: 'contract' | 'judgment' | 'evidence' | 'correspondence' | 'pleading' | 'other';
  caseId?: string | { _id: string; caseNumber: string; title: string };
  description?: string;
  tags?: string[];
  isConfidential: boolean;
  isEncrypted: boolean;
  uploadedBy: string | { _id: string; fullName: string };
  version: number;
  parentDocumentId?: string;
  createdAt: string;
  updatedAt: string;
}

interface DocumentStats {
  totalDocuments: number;
  confidentialDocuments: number;
  totalStorageUsed: number;
  documentsThisMonth: number;
  byCategory: {
    category: Document['category'];
    count: number;
    totalSize: number;
  }[];
  byFileType: {
    fileType: string;
    count: number;
  }[];
}

// Fetch all documents
export const useDocuments = (filters?: {
  category?: string;
  caseId?: string;
  search?: string;
  isConfidential?: boolean;
}) => {
  return useQuery({
    queryKey: ['documents', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.category) params.append('category', filters.category);
      if (filters?.caseId) params.append('caseId', filters.caseId);
      if (filters?.search) params.append('search', filters.search);
      if (filters?.isConfidential !== undefined) {
        params.append('isConfidential', String(filters.isConfidential));
      }

      const response = await api.get(`/documents?${params.toString()}`);
      return response.data.documents as Document[];
    },
  });
};

// Fetch single document
export const useDocument = (documentId: string) => {
  return useQuery({
    queryKey: ['document', documentId],
    queryFn: async () => {
      const response = await api.get(`/documents/${documentId}`);
      return response.data.document as Document;
    },
    enabled: !!documentId,
  });
};

// Upload document
export const useUploadDocument = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await api.post('/documents/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data.document as Document;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['document-stats'] });
    },
  });
};

// Update document metadata
export const useUpdateDocument = (documentId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      category?: Document['category'];
      description?: string;
      tags?: string[];
      isConfidential?: boolean;
    }) => {
      const response = await api.put(`/documents/${documentId}`, data);
      return response.data.document as Document;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['document', documentId] });
    },
  });
};

// Delete document
export const useDeleteDocument = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (documentId: string) => {
      await api.delete(`/documents/${documentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['document-stats'] });
    },
  });
};

// Get documents by case
export const useDocumentsByCase = (caseId: string) => {
  return useQuery({
    queryKey: ['documents', 'case', caseId],
    queryFn: async () => {
      const response = await api.get(`/documents/case/${caseId}`);
      return response.data.documents as Document[];
    },
    enabled: !!caseId,
  });
};

// Get document statistics
export const useDocumentStats = () => {
  return useQuery({
    queryKey: ['document-stats'],
    queryFn: async () => {
      const response = await api.get('/documents/stats');
      return response.data.stats as DocumentStats;
    },
  });
};

// Download document
export const useDownloadDocument = () => {
  return useMutation({
    mutationFn: async (documentId: string) => {
      const response = await api.get(`/documents/${documentId}/download`, {
        responseType: 'blob',
      });

      // Get filename from response headers or use default
      const contentDisposition = response.headers['content-disposition'];
      let fileName = 'document';
      if (contentDisposition) {
        const fileNameMatch = contentDisposition.match(/filename="(.+)"/);
        if (fileNameMatch) fileName = fileNameMatch[1];
      }

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    },
  });
};

// Share document (generate shareable link)
export const useShareDocument = () => {
  return useMutation({
    mutationFn: async ({
      documentId,
      expiresIn,
    }: {
      documentId: string;
      expiresIn?: number; // hours
    }) => {
      const response = await api.post(`/documents/${documentId}/share`, {
        expiresIn,
      });
      return response.data.shareLink as string;
    },
  });
};

// Upload new version of document
export const useUploadDocumentVersion = (documentId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await api.post(
        `/documents/${documentId}/version`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      return response.data.document as Document;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['document', documentId] });
    },
  });
};

// Get document versions
export const useDocumentVersions = (documentId: string) => {
  return useQuery({
    queryKey: ['document-versions', documentId],
    queryFn: async () => {
      const response = await api.get(`/documents/${documentId}/versions`);
      return response.data.versions as Document[];
    },
    enabled: !!documentId,
  });
};

// Encrypt document
export const useEncryptDocument = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (documentId: string) => {
      const response = await api.post(`/documents/${documentId}/encrypt`);
      return response.data.document as Document;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });
};

// Decrypt document
export const useDecryptDocument = () => {
  return useMutation({
    mutationFn: async (documentId: string) => {
      const response = await api.post(`/documents/${documentId}/decrypt`);
      return response.data.decryptedUrl as string;
    },
  });
};

// Search documents with advanced filters
export const useSearchDocuments = (query: string) => {
  return useQuery({
    queryKey: ['documents', 'search', query],
    queryFn: async () => {
      const response = await api.get(`/documents/search?q=${encodeURIComponent(query)}`);
      return response.data.documents as Document[];
    },
    enabled: query.length > 0,
  });
};

// Get recent documents
export const useRecentDocuments = (limit: number = 10) => {
  return useQuery({
    queryKey: ['documents', 'recent', limit],
    queryFn: async () => {
      const response = await api.get(`/documents/recent?limit=${limit}`);
      return response.data.documents as Document[];
    },
  });
};

// Bulk delete documents
export const useBulkDeleteDocuments = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (documentIds: string[]) => {
      await api.post('/documents/bulk-delete', { documentIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['document-stats'] });
    },
  });
};

// Move document to case
export const useMoveDocumentToCase = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      documentId,
      caseId,
    }: {
      documentId: string;
      caseId: string;
    }) => {
      const response = await api.put(`/documents/${documentId}/move`, { caseId });
      return response.data.document as Document;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });
};
