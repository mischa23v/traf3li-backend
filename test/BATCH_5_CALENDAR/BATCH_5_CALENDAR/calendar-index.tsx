import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Plus,
  Users,
  FileText,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, isToday, isSameDay } from 'date-fns';
import { ar } from 'date-fns/locale';
import { toast } from 'sonner';
import {
  useEvents,
  useCreateEvent,
  useUpdateEvent,
  useDeleteEvent,
} from './hooks/use-calendar';

// Types
interface CalendarEvent {
  _id: string;
  title: string;
  type: 'hearing' | 'meeting' | 'deadline' | 'consultation';
  startDate: string;
  endDate?: string;
  startTime: string;
  endTime?: string;
  location?: string;
  caseId?: {
    _id: string;
    caseNumber: string;
    title: string;
  };
  attendees?: string[];
  notes?: string;
  reminderBefore?: number; // minutes
  isAllDay: boolean;
  status: 'scheduled' | 'completed' | 'cancelled' | 'postponed';
  createdAt: string;
  updatedAt: string;
}

export default function CalendarPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');

  // Fetch events for selected month
  const startDate = startOfMonth(selectedDate);
  const endDate = endOfMonth(selectedDate);

  const { data: events = [], isLoading } = useEvents({
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  });

  // Event type config
  const eventTypes = [
    { value: 'hearing', label: 'جلسة محكمة', icon: FileText, color: 'bg-red-500' },
    { value: 'meeting', label: 'اجتماع', icon: Users, color: 'bg-blue-500' },
    { value: 'deadline', label: 'موعد نهائي', icon: AlertCircle, color: 'bg-orange-500' },
    { value: 'consultation', label: 'استشارة', icon: Clock, color: 'bg-green-500' },
  ];

  // Get events for selected date
  const selectedDateEvents = events.filter((event) =>
    isSameDay(new Date(event.startDate), selectedDate)
  );

  // Get upcoming events (next 7 days)
  const upcomingEvents = events
    .filter((event) => new Date(event.startDate) >= new Date())
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
    .slice(0, 5);

  // Event type badge
  const EventTypeBadge = ({ type }: { type: CalendarEvent['type'] }) => {
    const config = eventTypes.find((t) => t.value === type);
    const Icon = config?.icon || CalendarIcon;
    return (
      <Badge className={`${config?.color} text-white`}>
        <Icon className="h-3 w-3 ml-1" />
        {config?.label}
      </Badge>
    );
  };

  // Status badge
  const StatusBadge = ({ status }: { status: CalendarEvent['status'] }) => {
    const statusConfig = {
      scheduled: { label: 'مجدولة', variant: 'default' as const },
      completed: { label: 'مكتملة', variant: 'success' as const },
      cancelled: { label: 'ملغاة', variant: 'destructive' as const },
      postponed: { label: 'مؤجلة', variant: 'secondary' as const },
    };
    const config = statusConfig[status];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  // Check if date has events
  const dateHasEvents = (date: Date) => {
    return events.some((event) => isSameDay(new Date(event.startDate), date));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">التقويم</h1>
          <p className="text-muted-foreground">إدارة الجلسات والمواعيد</p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 ml-2" />
          حدث جديد
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Calendar Section */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>
                  {format(selectedDate, 'MMMM yyyy', { locale: ar })}
                </span>
                <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
                  <TabsList>
                    <TabsTrigger value="month">شهر</TabsTrigger>
                    <TabsTrigger value="week">أسبوع</TabsTrigger>
                    <TabsTrigger value="day">يوم</TabsTrigger>
                  </TabsList>
                </Tabs>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                locale={ar}
                className="rounded-md border"
                modifiers={{
                  hasEvents: (date) => dateHasEvents(date),
                }}
                modifiersStyles={{
                  hasEvents: {
                    fontWeight: 'bold',
                    textDecoration: 'underline',
                  },
                }}
              />
            </CardContent>
          </Card>

          {/* Selected Date Events */}
          <Card>
            <CardHeader>
              <CardTitle>
                أحداث يوم {format(selectedDate, 'dd MMMM yyyy', { locale: ar })}
              </CardTitle>
              <CardDescription>
                {selectedDateEvents.length === 0
                  ? 'لا توجد أحداث في هذا اليوم'
                  : `${selectedDateEvents.length} حدث مجدول`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : selectedDateEvents.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  لا توجد أحداث مجدولة
                </div>
              ) : (
                <div className="space-y-4">
                  {selectedDateEvents.map((event) => (
                    <EventCard
                      key={event._id}
                      event={event}
                      onSelect={() => setSelectedEvent(event)}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Today's Events */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">أحداث اليوم</CardTitle>
            </CardHeader>
            <CardContent>
              {events
                .filter((event) => isToday(new Date(event.startDate)))
                .map((event) => (
                  <div
                    key={event._id}
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted cursor-pointer mb-2"
                    onClick={() => setSelectedEvent(event)}
                  >
                    <Clock className="h-4 w-4 text-muted-foreground mt-1" />
                    <div className="flex-1">
                      <div className="font-medium">{event.title}</div>
                      <div className="text-sm text-muted-foreground">
                        {event.startTime}
                        {event.location && (
                          <span className="flex items-center gap-1 mt-1">
                            <MapPin className="h-3 w-3" />
                            {event.location}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
            </CardContent>
          </Card>

          {/* Upcoming Events */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">الأحداث القادمة</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {upcomingEvents.map((event) => (
                  <div
                    key={event._id}
                    className="p-3 border rounded-lg hover:bg-muted cursor-pointer"
                    onClick={() => setSelectedEvent(event)}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="font-medium text-sm">{event.title}</div>
                      <EventTypeBadge type={event.type} />
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <CalendarIcon className="h-3 w-3" />
                      {format(new Date(event.startDate), 'dd MMM', { locale: ar })}
                      <Clock className="h-3 w-3 mr-2" />
                      {event.startTime}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">إحصائيات</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">هذا الشهر</span>
                  <span className="font-bold">{events.length} حدث</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">جلسات محكمة</span>
                  <span className="font-bold">
                    {events.filter((e) => e.type === 'hearing').length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">اجتماعات</span>
                  <span className="font-bold">
                    {events.filter((e) => e.type === 'meeting').length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">مواعيد نهائية</span>
                  <span className="font-bold text-orange-600">
                    {events.filter((e) => e.type === 'deadline').length}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Create Event Dialog */}
      <CreateEventDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        eventTypes={eventTypes}
      />

      {/* Event Detail Dialog */}
      {selectedEvent && (
        <EventDetailDialog
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
        />
      )}
    </div>
  );
}

// Event Card Component
interface EventCardProps {
  event: CalendarEvent;
  onSelect: () => void;
}

function EventCard({ event, onSelect }: EventCardProps) {
  const eventTypes = [
    { value: 'hearing', label: 'جلسة محكمة', icon: FileText, color: 'bg-red-500' },
    { value: 'meeting', label: 'اجتماع', icon: Users, color: 'bg-blue-500' },
    { value: 'deadline', label: 'موعد نهائي', icon: AlertCircle, color: 'bg-orange-500' },
    { value: 'consultation', label: 'استشارة', icon: Clock, color: 'bg-green-500' },
  ];

  const config = eventTypes.find((t) => t.value === event.type);
  const Icon = config?.icon || CalendarIcon;

  return (
    <div
      className="p-4 border rounded-lg hover:bg-muted cursor-pointer transition-colors"
      onClick={onSelect}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-lg ${config?.color}`}>
            <Icon className="h-4 w-4 text-white" />
          </div>
          <div>
            <div className="font-medium">{event.title}</div>
            {event.caseId && (
              <div className="text-xs text-muted-foreground">
                {event.caseId.caseNumber} - {event.caseId.title}
              </div>
            )}
          </div>
        </div>
        <Badge variant="outline">{event.status === 'scheduled' ? 'مجدولة' : event.status}</Badge>
      </div>

      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {event.startTime}
          {event.endTime && ` - ${event.endTime}`}
        </div>
        {event.location && (
          <div className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {event.location}
          </div>
        )}
      </div>
    </div>
  );
}

// Create Event Dialog Component
interface CreateEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventTypes: any[];
}

function CreateEventDialog({ open, onOpenChange, eventTypes }: CreateEventDialogProps) {
  // Implementation similar to expenses dialog
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>إضافة حدث جديد</DialogTitle>
          <DialogDescription>أدخل تفاصيل الحدث أو الموعد</DialogDescription>
        </DialogHeader>
        {/* Form fields here */}
      </DialogContent>
    </Dialog>
  );
}

// Event Detail Dialog Component
interface EventDetailDialogProps {
  event: CalendarEvent;
  onClose: () => void;
}

function EventDetailDialog({ event, onClose }: EventDetailDialogProps) {
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{event.title}</DialogTitle>
        </DialogHeader>
        {/* Event details here */}
      </DialogContent>
    </Dialog>
  );
}
