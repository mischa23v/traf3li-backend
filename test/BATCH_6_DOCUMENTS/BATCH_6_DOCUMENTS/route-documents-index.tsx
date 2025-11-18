import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated/documents/')({
  component: () => <DocumentsPage />,
});

import DocumentsPage from '@/features/documents';
