import { useState, useEffect } from 'react';
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
import {
  Play,
  Pause,
  Square,
  Clock,
  Plus,
  Trash2,
  DollarSign,
  Calendar as CalendarIcon,
  Loader2,
} from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { toast } from 'sonner';
import {
  useTimeEntries,
  useCreateTimeEntry,
  useUpdateTimeEntry,
  useDeleteTimeEntry,
  useTimeStats,
} from './hooks/use-time-tracking';

// Types
interface TimeEntry {
  _id: string;
  description: string;
  caseId: {
    _id: string;
    caseNumber: string;
    title: string;
  };
  date: string;
  startTime: string;
  endTime?: string;
  duration: number; // minutes
  hourlyRate: number;
  totalAmount: number;
  isBillable: boolean;
  isBilled: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface ActiveTimer {
  description: string;
  caseId: string;
  startTime: string;
  elapsedSeconds: number;
}

export default function TimeTrackingPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [activeTimer, setActiveTimer] = useState<ActiveTimer | null>(null);
  const [filterPeriod, setFilterPeriod] = useState<'today' | 'week' | 'month'>('week');
  const queryClient = useQueryClient();

  // Timer effect
  useEffect(() => {
    if (!activeTimer) return;

    const interval = setInterval(() => {
      setActiveTimer((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          elapsedSeconds: prev.elapsedSeconds + 1,
        };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [activeTimer]);

  // Fetch time entries
  const { data: timeEntries = [], isLoading } = useTimeEntries({
    period: filterPeriod,
  });

  // Stats
  const { data: stats } = useTimeStats({ period: filterPeriod });

  // Create time entry mutation
  const createTimeEntryMutation = useCreateTimeEntry();

  // Delete time entry mutation
  const deleteTimeEntryMutation = useDeleteTimeEntry();

  // Start timer
  const startTimer = (caseId: string, description: string) => {
    setActiveTimer({
      description,
      caseId,
      startTime: new Date().toISOString(),
      elapsedSeconds: 0,
    });
    toast.success('تم بدء المؤقت');
  };

  // Stop timer and create entry
  const stopTimer = async () => {
    if (!activeTimer) return;

    const duration = Math.floor(activeTimer.elapsedSeconds / 60); // Convert to minutes

    try {
      await createTimeEntryMutation.mutateAsync({
        description: activeTimer.description,
        caseId: activeTimer.caseId,
        date: activeTimer.startTime,
        startTime: format(new Date(activeTimer.startTime), 'HH:mm'),
        endTime: format(new Date(), 'HH:mm'),
        duration,
        hourlyRate: 500, // Default rate - should come from settings
        isBillable: true,
      });

      setActiveTimer(null);
      toast.success('تم حفظ الوقت المسجل');
      queryClient.invalidateQueries({ queryKey: ['time-entries'] });
      queryClient.invalidateQueries({ queryKey: ['time-stats'] });
    } catch (error: any) {
      toast.error('فشل حفظ الوقت');
    }
  };

  // Format timer display
  const formatTimer = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Format duration (minutes to hours:minutes)
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}س ${mins}د`;
  };

  // Handle delete time entry
  const handleDeleteTimeEntry = async (entryId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا السجل؟')) return;

    try {
      await deleteTimeEntryMutation.mutateAsync(entryId);
      toast.success('تم حذف السجل');
      queryClient.invalidateQueries({ queryKey: ['time-entries'] });
      queryClient.invalidateQueries({ queryKey: ['time-stats'] });
    } catch (error: any) {
      toast.error('فشل حذف السجل');
    }
  };

  // Table columns
  const columns: ColumnDef<TimeEntry>[] = [
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
          <div className="text-xs text-muted-foreground">
            {row.original.caseId?.caseNumber} - {row.original.caseId?.title}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'duration',
      header: 'المدة',
      cell: ({ row }) => (
        <div className="font-medium">{formatDuration(row.original.duration)}</div>
      ),
    },
    {
      accessorKey: 'startTime',
      header: 'الوقت',
      cell: ({ row }) => (
        <div className="text-sm">
          {row.original.startTime}
          {row.original.endTime && ` - ${row.original.endTime}`}
        </div>
      ),
    },
    {
      accessorKey: 'totalAmount',
      header: 'المبلغ',
      cell: ({ row }) => (
        <div className="font-medium">
          {row.original.totalAmount.toLocaleString('ar-SA')} ر.س
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
      accessorKey: 'isBilled',
      header: 'تم الفوترة',
      cell: ({ row }) => (
        <Badge variant={row.original.isBilled ? 'success' : 'outline'}>
          {row.original.isBilled ? 'نعم' : 'لا'}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: 'الإجراءات',
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => handleDeleteTimeEntry(row.original._id)}
          disabled={deleteTimeEntryMutation.isPending}
        >
          <Trash2 className="h-4 w-4 text-red-500" />
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">تسجيل الوقت</h1>
          <p className="text-muted-foreground">تتبع الساعات القابلة للفوترة</p>
        </div>
        <div className="flex gap-2">
          <Select value={filterPeriod} onValueChange={(v: any) => setFilterPeriod(v)}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">اليوم</SelectItem>
              <SelectItem value="week">هذا الأسبوع</SelectItem>
              <SelectItem value="month">هذا الشهر</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 ml-2" />
            إضافة يدوياً
          </Button>
        </div>
      </div>

      {/* Active Timer */}
      {activeTimer && (
        <Card className="border-2 border-primary">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Clock className="h-6 w-6 text-primary animate-pulse" />
                  </div>
                </div>
                <div>
                  <div className="font-medium">{activeTimer.description}</div>
                  <div className="text-sm text-muted-foreground">
                    المؤقت نشط - بدأ في {format(new Date(activeTimer.startTime), 'HH:mm')}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-4xl font-bold font-mono">
                  {formatTimer(activeTimer.elapsedSeconds)}
                </div>
                <Button onClick={stopTimer} size="lg" variant="destructive">
                  <Square className="h-4 w-4 ml-2" />
                  إيقاف
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Statistics Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>إجمالي الساعات</CardDescription>
              <CardTitle className="text-4xl">
                {formatDuration(stats.totalMinutes)}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>ساعات قابلة للفوترة</CardDescription>
              <CardTitle className="text-4xl text-green-600">
                {formatDuration(stats.billableMinutes)}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>المبلغ المتوقع</CardDescription>
              <CardTitle className="text-4xl">
                {stats.totalAmount.toLocaleString('ar-SA')} ر.س
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>تم الفوترة</CardDescription>
              <CardTitle className="text-4xl text-blue-600">
                {stats.billedAmount.toLocaleString('ar-SA')} ر.س
              </CardTitle>
            </CardHeader>
          </Card>
        </div>
      )}

      {/* Quick Timer Start */}
      {!activeTimer && (
        <Card>
          <CardHeader>
            <CardTitle>بدء تسجيل الوقت</CardTitle>
            <CardDescription>اختر قضية لبدء المؤقت</CardDescription>
          </CardHeader>
          <CardContent>
            <QuickTimerStart onStart={startTimer} />
          </CardContent>
        </Card>
      )}

      {/* Time Entries Table */}
      <Card>
        <CardHeader>
          <CardTitle>سجل الأوقات</CardTitle>
          <CardDescription>جميع الأوقات المسجلة</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : timeEntries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              لا توجد أوقات مسجلة
            </div>
          ) : (
            <DataTable columns={columns} data={timeEntries} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Quick Timer Start Component
interface QuickTimerStartProps {
  onStart: (caseId: string, description: string) => void;
}

function QuickTimerStart({ onStart }: QuickTimerStartProps) {
  const [selectedCase, setSelectedCase] = useState('');
  const [description, setDescription] = useState('');

  const handleStart = () => {
    if (!selectedCase || !description) {
      toast.error('الرجاء اختيار قضية وإدخال وصف');
      return;
    }
    onStart(selectedCase, description);
    setDescription('');
  };

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label>القضية</Label>
          <Select value={selectedCase} onValueChange={setSelectedCase}>
            <SelectTrigger>
              <SelectValue placeholder="اختر قضية" />
            </SelectTrigger>
            <SelectContent>
              {/* Cases will be loaded from API */}
              <SelectItem value="case1">قضية 001 - عقد عمل</SelectItem>
              <SelectItem value="case2">قضية 002 - عقار</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label>الوصف</Label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="مثال: مراجعة عقد، إعداد لائحة..."
          />
        </div>
      </div>

      <Button onClick={handleStart} className="w-full" size="lg">
        <Play className="h-5 w-5 ml-2" />
        بدء المؤقت
      </Button>
    </div>
  );
}
