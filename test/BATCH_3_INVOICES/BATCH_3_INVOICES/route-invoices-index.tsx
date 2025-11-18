import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated/invoices/')({
  component: () => <InvoicesPage />,
});

import InvoicesPage from '@/features/invoices';
