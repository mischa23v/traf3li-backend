import {
  Calendar,
  Clock,
  DollarSign,
  FileText,
  Folder,
  Home,
  MessageSquare,
  Settings,
  Users,
  Briefcase,
} from 'lucide-react';

export interface NavItem {
  title: string;
  url: string;
  icon: any;
  isActive?: boolean;
  items?: NavItem[];
}

export const sidebarData: NavItem[] = [
  {
    title: 'لوحة التحكم',
    url: '/',
    icon: Home,
  },
  {
    title: 'القضايا',
    url: '/cases',
    icon: Briefcase,
  },
  {
    title: 'التقويم',
    url: '/calendar',
    icon: Calendar,
  },
  {
    title: 'تسجيل الوقت',
    url: '/time-tracking',
    icon: Clock,
  },
  {
    title: 'المستندات',
    url: '/documents',
    icon: FileText,
  },
  {
    title: 'الفواتير',
    url: '/invoices',
    icon: FileText,
  },
  {
    title: 'المصروفات',
    url: '/expenses',
    icon: DollarSign,
  },
  {
    title: 'الرسائل',
    url: '/chats',
    icon: MessageSquare,
  },
  {
    title: 'المستخدمون',
    url: '/users',
    icon: Users,
  },
  {
    title: 'الإعدادات',
    url: '/settings',
    icon: Settings,
  },
];
