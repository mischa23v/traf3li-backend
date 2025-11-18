import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/data-table';
import { Loader2, Plus, Download, Send, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useInvoices, useCreateInvoice, useSendInvoice } from './hooks/use-invoices';

// Types
interface Invoice {
  _id: string;
  invoiceNumber: string;
  caseId: {
    _id: string;
    caseNumber: string;
    title: string;
  };
  clientId: {
    _id: string;
    fullName: string;
    email: string;
  };
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
  createdAt: string;
  updatedAt: string;
}

export default function InvoicesPage() {
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const queryClient = useQueryClient();

  // Fetch invoices
  const { data: invoices = [], isLoading, error } = useInvoices();

  // Send invoice mutation
  const sendInvoiceMutation = useSendInvoice();

  // Handle send invoice
  const handleSendInvoice = async (invoiceId: string) => {
    try {
      await sendInvoiceMutation.mutateAsync(invoiceId);
      toast.success('تم إرسال الفاتورة بنجاح');
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'فشل إرسال الفاتورة');
    }
  };

  // Status badge component
  const StatusBadge = ({ status }: { status: Invoice['status'] }) => {
    const statusConfig = {
      draft: { label: 'مسودة', variant: 'secondary' as const },
      sent: { label: 'مرسلة', variant: 'default' as const },
      paid: { label: 'مدفوعة', variant: 'success' as const },
      overdue: { label: 'متأخرة', variant: 'destructive' as const },
      cancelled: { label: 'ملغاة', variant: 'outline' as const },
    };

    const config = statusConfig[status];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  // Table columns
  const columns: ColumnDef<Invoice>[] = [
    {
      accessorKey: 'invoiceNumber',
      header: 'رقم الفاتورة',
      cell: ({ row }) => (
        <div className="font-medium">{row.original.invoiceNumber}</div>
      ),
    },
    {
      accessorKey: 'caseId.caseNumber',
      header: 'رقم القضية',
      cell: ({ row }) => (
        <div className="text-sm">{row.original.caseId?.caseNumber || '-'}</div>
      ),
    },
    {
      accessorKey: 'clientId.fullName',
      header: 'اسم العميل',
      cell: ({ row }) => (
        <div className="text-sm">{row.original.clientId?.fullName || '-'}</div>
      ),
    },
    {
      accessorKey: 'amount',
      header: 'المبلغ',
      cell: ({ row }) => (
        <div className="font-medium">
          {row.original.amount.toLocaleString('ar-SA')} ر.س
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'الحالة',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: 'dueDate',
      header: 'تاريخ الاستحقاق',
      cell: ({ row }) => (
        <div className="text-sm">
          {format(new Date(row.original.dueDate), 'dd MMM yyyy', { locale: ar })}
        </div>
      ),
    },
    {
      id: 'actions',
      header: 'الإجراءات',
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSelectedInvoice(row.original)}
          >
            <Eye className="h-4 w-4" />
          </Button>
          {row.original.status === 'draft' && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleSendInvoice(row.original._id)}
              disabled={sendInvoiceMutation.isPending}
            >
              <Send className="h-4 w-4" />
            </Button>
          )}
          <Button variant="ghost" size="icon">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  // Calculate statistics
  const stats = {
    total: invoices.length,
    paid: invoices.filter((inv) => inv.status === 'paid').length,
    pending: invoices.filter((inv) => inv.status === 'sent').length,
    overdue: invoices.filter((inv) => inv.status === 'overdue').length,
    totalAmount: invoices.reduce((sum, inv) => sum + inv.amount, 0),
    paidAmount: invoices
      .filter((inv) => inv.status === 'paid')
      .reduce((sum, inv) => sum + inv.amount, 0),
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>خطأ في تحميل الفواتير</CardTitle>
            <CardDescription>
              {error instanceof Error ? error.message : 'حدث خطأ غير متوقع'}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">الفواتير</h1>
          <p className="text-muted-foreground">إدارة فواتير العملاء</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 ml-2" />
          فاتورة جديدة
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>إجمالي الفواتير</CardDescription>
            <CardTitle className="text-4xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>فواتير مدفوعة</CardDescription>
            <CardTitle className="text-4xl text-green-600">
              {stats.paid}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>فواتير معلقة</CardDescription>
            <CardTitle className="text-4xl text-yellow-600">
              {stats.pending}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>فواتير متأخرة</CardDescription>
            <CardTitle className="text-4xl text-red-600">
              {stats.overdue}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Revenue Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardDescription>إجمالي المبالغ</CardDescription>
            <CardTitle className="text-3xl">
              {stats.totalAmount.toLocaleString('ar-SA')} ر.س
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>المبالغ المحصلة</CardDescription>
            <CardTitle className="text-3xl text-green-600">
              {stats.paidAmount.toLocaleString('ar-SA')} ر.س
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Invoices Table */}
      <Card>
        <CardHeader>
          <CardTitle>قائمة الفواتير</CardTitle>
          <CardDescription>
            جميع الفواتير المُصدرة للعملاء
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              لا توجد فواتير حالياً
            </div>
          ) : (
            <DataTable columns={columns} data={invoices} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
