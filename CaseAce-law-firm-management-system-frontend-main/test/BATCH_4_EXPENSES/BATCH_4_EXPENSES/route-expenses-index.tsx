import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated/expenses/')({
  component: () => <ExpensesPage />,
});

import ExpensesPage from '@/features/expenses';
