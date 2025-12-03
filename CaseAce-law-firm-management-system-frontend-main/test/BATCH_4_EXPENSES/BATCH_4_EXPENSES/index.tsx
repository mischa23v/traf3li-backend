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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DataTable } from '@/components/data-table';
import { Loader2, Plus, Receipt, Trash2, Eye, Download } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import {
  useExpenses,
  useCreateExpense,
  useDeleteExpense,
  useExpenseStats,
} from './hooks/use-expenses';

// Types
interface Expense {
  _id: string;
  description: string;
  amount: number;
  category: 'court_fees' | 'travel' | 'consultation' | 'documents' | 'research' | 'other';
  caseId?: {
    _id: string;
    caseNumber: string;
    title: string;
  };
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

export default function ExpensesPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const queryClient = useQueryClient();

  // Fetch expenses
  const { data: expenses = [], isLoading, error } = useExpenses({
    category: filterCategory !== 'all' ? filterCategory : undefined,
  });

  // Stats
  const { data: stats } = useExpenseStats();

  // Create expense mutation
  const createExpenseMutation = useCreateExpense();

  // Delete expense mutation
  const deleteExpenseMutation = useDeleteExpense();

  // Categories config
  const categories = [
    { value: 'court_fees', label: 'رسوم المحكمة', color: 'bg-blue-500' },
    { value: 'travel', label: 'السفر والتنقل', color: 'bg-green-500' },
    { value: 'consultation', label: 'استشارات', color: 'bg-purple-500' },
    { value: 'documents', label: 'مستندات', color: 'bg-yellow-500' },
    { value: 'research', label: 'بحث قانوني', color: 'bg-orange-500' },
    { value: 'other', label: 'أخرى', color: 'bg-gray-500' },
  ];

  // Category badge component
  const CategoryBadge = ({ category }: { category: Expense['category'] }) => {
    const config = categories.find((c) => c.value === category);
    return (
      <Badge variant="outline" className={`${config?.color} text-white`}>
        {config?.label}
      </Badge>
    );
  };

  // Handle create expense
  const handleCreateExpense = async (data: CreateExpenseInput) => {
    try {
      await createExpenseMutation.mutateAsync(data);
      toast.success('تم إضافة المصروف بنجاح');
      setIsCreateDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expense-stats'] });
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'فشل إضافة المصروف');
    }
  };

  // Handle delete expense
  const handleDeleteExpense = async (expenseId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا المصروف؟')) return;

    try {
      await deleteExpenseMutation.mutateAsync(expenseId);
      toast.success('تم حذف المصروف بنجاح');
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expense-stats'] });
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'فشل حذف المصروف');
    }
  };

  // Table columns
  const columns: ColumnDef<Expense>[] = [
    {
      accessorKey: 'date',
      header: 'التاريخ',
      cell: ({ row }) => (
        <div className="text-sm">
          {format(new Date(row.original.date), 'dd MMM yyyy', { locale: ar })}
        </div>
      ),
    },
    {
      accessorKey: 'description',
      header: 'الوصف',
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.description}</div>
          {row.original.caseId && (
            <div className="text-xs text-muted-foreground">
              القضية: {row.original.caseId.caseNumber}
            </div>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'category',
      header: 'الفئة',
      cell: ({ row }) => <CategoryBadge category={row.original.category} />,
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
      accessorKey: 'isBillable',
      header: 'قابل للفوترة',
      cell: ({ row }) => (
        <Badge variant={row.original.isBillable ? 'default' : 'secondary'}>
          {row.original.isBillable ? 'نعم' : 'لا'}
        </Badge>
      ),
    },
    {
      accessorKey: 'isReimbursed',
      header: 'تم الاسترداد',
      cell: ({ row }) => (
        <Badge variant={row.original.isReimbursed ? 'success' : 'outline'}>
          {row.original.isReimbursed ? 'نعم' : 'لا'}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: 'الإجراءات',
      cell: ({ row }) => (
        <div className="flex gap-2">
          {row.original.receiptUrl && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => window.open(row.original.receiptUrl, '_blank')}
            >
              <Receipt className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSelectedExpense(row.original)}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleDeleteExpense(row.original._id)}
            disabled={deleteExpenseMutation.isPending}
          >
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      ),
    },
  ];

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>خطأ في تحميل المصروفات</CardTitle>
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
          <h1 className="text-3xl font-bold">المصروفات</h1>
          <p className="text-muted-foreground">تتبع وإدارة المصروفات المهنية</p>
        </div>
        <div className="flex gap-2">
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="كل الفئات" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الفئات</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 ml-2" />
            مصروف جديد
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>إجمالي المصروفات</CardDescription>
              <CardTitle className="text-4xl">
                {stats.totalExpenses.toLocaleString('ar-SA')} ر.س
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>قابل للفوترة</CardDescription>
              <CardTitle className="text-4xl text-green-600">
                {stats.billableExpenses.toLocaleString('ar-SA')} ر.س
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>غير قابل للفوترة</CardDescription>
              <CardTitle className="text-4xl text-orange-600">
                {stats.nonBillableExpenses.toLocaleString('ar-SA')} ر.س
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>تم الاسترداد</CardDescription>
              <CardTitle className="text-4xl text-blue-600">
                {stats.reimbursedExpenses.toLocaleString('ar-SA')} ر.س
              </CardTitle>
            </CardHeader>
          </Card>
        </div>
      )}

      {/* Category Breakdown */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle>المصروفات حسب الفئة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {stats.byCategory.map((cat) => {
                const config = categories.find((c) => c.value === cat.category);
                return (
                  <div
                    key={cat.category}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${config?.color}`} />
                      <span className="font-medium">{config?.label}</span>
                    </div>
                    <span className="text-lg font-bold">
                      {cat.total.toLocaleString('ar-SA')} ر.س
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Expenses Table */}
      <Card>
        <CardHeader>
          <CardTitle>قائمة المصروفات</CardTitle>
          <CardDescription>جميع المصروفات المسجلة</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : expenses.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              لا توجد مصروفات مسجلة
            </div>
          ) : (
            <DataTable columns={columns} data={expenses} />
          )}
        </CardContent>
      </Card>

      {/* Create Expense Dialog */}
      <CreateExpenseDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSubmit={handleCreateExpense}
        isLoading={createExpenseMutation.isPending}
        categories={categories}
      />
    </div>
  );
}

// Create Expense Dialog Component
interface CreateExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateExpenseInput) => void;
  isLoading: boolean;
  categories: { value: string; label: string; color: string }[];
}

function CreateExpenseDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
  categories,
}: CreateExpenseDialogProps) {
  const [formData, setFormData] = useState<CreateExpenseInput>({
    description: '',
    amount: 0,
    category: 'other',
    date: new Date().toISOString().split('T')[0],
    isBillable: false,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>إضافة مصروف جديد</DialogTitle>
          <DialogDescription>أدخل تفاصيل المصروف المهني</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="description">الوصف</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="مثال: رسوم محكمة، تذاكر طيران..."
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="amount">المبلغ (ر.س)</Label>
                <Input
                  id="amount"
                  type="number"
                  value={formData.amount}
                  onChange={(e) =>
                    setFormData({ ...formData, amount: Number(e.target.value) })
                  }
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="date">التاريخ</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) =>
                    setFormData({ ...formData, date: e.target.value })
                  }
                  required
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="category">الفئة</Label>
              <Select
                value={formData.category}
                onValueChange={(value) =>
                  setFormData({ ...formData, category: value as Expense['category'] })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="notes">ملاحظات (اختياري)</Label>
              <Textarea
                id="notes"
                value={formData.notes || ''}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                placeholder="أي تفاصيل إضافية..."
                rows={3}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isBillable"
                checked={formData.isBillable}
                onChange={(e) =>
                  setFormData({ ...formData, isBillable: e.target.checked })
                }
                className="rounded"
              />
              <Label htmlFor="isBillable" className="cursor-pointer">
                هذا المصروف قابل للفوترة على العميل
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              إلغاء
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 ml-2 animate-spin" />}
              إضافة المصروف
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
