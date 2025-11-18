import { useState } from 'react'
import { Search, Filter, Download, Calendar, TrendingUp, TrendingDown, DollarSign, ArrowUpRight, ArrowDownRight, Receipt, FileText, CreditCard, Check, Clock, AlertCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export default function AccountActivityDashboard() {
  const [activeTab, setActiveTab] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPeriod, setSelectedPeriod] = useState('month')

  // Sample activities data
  const activities = [
    {
      id: 'ACT-2025-001',
      date: '17 نوفمبر 2025',
      time: '2:30 مساءً',
      type: 'دفعة مستلمة',
      typeIcon: Check,
      typeColor: 'text-green-600',
      bgColor: 'bg-green-50',
      iconBg: 'bg-green-100',
      description: 'تم استلام دفعة من مشاري الرابح',
      reference: 'INV-2025-001',
      caseNumber: '4772077905',
      amount: 52900,
      paymentMethod: 'تحويل بنكي',
      status: 'مكتمل',
      statusColor: 'bg-green-500',
      user: 'أحمد المحامي'
    },
    {
      id: 'ACT-2025-002',
      date: '17 نوفمبر 2025',
      time: '10:30 صباحاً',
      type: 'مصروف جديد',
      typeIcon: Receipt,
      typeColor: 'text-red-600',
      bgColor: 'bg-red-50',
      iconBg: 'bg-red-100',
      description: 'تم إضافة مصروف: استئجار قاعة المحكمة',
      reference: 'EXP-2025-001',
      caseNumber: '4772077905',
      amount: -5652.17,
      paymentMethod: 'بطاقة ائتمان',
      status: 'مكتمل',
      statusColor: 'bg-green-500',
      user: 'أحمد المحامي'
    },
    {
      id: 'ACT-2025-003',
      date: '16 نوفمبر 2025',
      time: '4:15 مساءً',
      type: 'فاتورة مرسلة',
      typeIcon: FileText,
      typeColor: 'text-blue-600',
      bgColor: 'bg-blue-50',
      iconBg: 'bg-blue-100',
      description: 'تم إرسال فاتورة إلى مشاري الرابح',
      reference: 'INV-2025-001',
      caseNumber: '4772077905',
      amount: 52900,
      paymentMethod: 'بريد إلكتروني',
      status: 'معلق',
      statusColor: 'bg-amber-500',
      user: 'سارة المحامية'
    },
    {
      id: 'ACT-2025-004',
      date: '15 نوفمبر 2025',
      time: '9:20 صباحاً',
      type: 'دفعة مستلمة',
      typeIcon: Check,
      typeColor: 'text-green-600',
      bgColor: 'bg-green-50',
      iconBg: 'bg-green-100',
      description: 'تم استلام دفعة من عبدالله الغامدي',
      reference: 'INV-2025-002',
      caseNumber: '4772088016',
      amount: 38000,
      paymentMethod: 'شيك',
      status: 'مكتمل',
      statusColor: 'bg-green-500',
      user: 'أحمد المحامي'
    },
    {
      id: 'ACT-2025-005',
      date: '15 نوفمبر 2025',
      time: '11:00 صباحاً',
      type: 'فاتورة منشأة',
      typeIcon: FileText,
      typeColor: 'text-blue-600',
      bgColor: 'bg-blue-50',
      iconBg: 'bg-blue-100',
      description: 'تم إنشاء فاتورة جديدة لعبدالله الغامدي',
      reference: 'INV-2025-002',
      caseNumber: '4772088016',
      amount: 38000,
      paymentMethod: null,
      status: 'مسودة',
      statusColor: 'bg-slate-500',
      user: 'سارة المحامية'
    },
    {
      id: 'ACT-2025-006',
      date: '14 نوفمبر 2025',
      time: '3:45 مساءً',
      type: 'مصروف جديد',
      typeIcon: Receipt,
      typeColor: 'text-red-600',
      bgColor: 'bg-red-50',
      iconBg: 'bg-red-100',
      description: 'تم إضافة مصروف: اشتراك المكتبة القانونية',
      reference: 'EXP-2025-002',
      caseNumber: null,
      amount: -2500,
      paymentMethod: 'تحويل بنكي',
      status: 'مكتمل',
      statusColor: 'bg-green-500',
      user: 'محمد المحامي'
    },
    {
      id: 'ACT-2025-007',
      date: '14 نوفمبر 2025',
      time: '2:30 مساءً',
      type: 'كشف حساب مرسل',
      typeIcon: FileText,
      typeColor: 'text-purple-600',
      bgColor: 'bg-purple-50',
      iconBg: 'bg-purple-100',
      description: 'تم إرسال كشف حساب لمشاري الرابح',
      reference: 'STMT-2025-001',
      caseNumber: 'متعدد',
      amount: 105807.50,
      paymentMethod: 'بريد إلكتروني',
      status: 'مرسل',
      statusColor: 'bg-blue-500',
      user: 'أحمد المحامي'
    },
    {
      id: 'ACT-2025-008',
      date: '13 نوفمبر 2025',
      time: '10:15 صباحاً',
      type: 'دفعة مستلمة',
      typeIcon: Check,
      typeColor: 'text-green-600',
      bgColor: 'bg-green-50',
      iconBg: 'bg-green-100',
      description: 'تم استلام دفعة من فاطمة العتيبي',
      reference: 'INV-2025-003',
      caseNumber: '4772099127',
      amount: 52000,
      paymentMethod: 'تحويل بنكي',
      status: 'مكتمل',
      statusColor: 'bg-green-500',
      user: 'محمد المحامي'
    },
    {
      id: 'ACT-2025-009',
      date: '12 نوفمبر 2025',
      time: '1:20 مساءً',
      type: 'مصروف جديد',
      typeIcon: Receipt,
      typeColor: 'text-red-600',
      bgColor: 'bg-red-50',
      iconBg: 'bg-red-100',
      description: 'تم إضافة مصروف: استشارة خبير مالي',
      reference: 'EXP-2025-003',
      caseNumber: '4772088016',
      amount: -8000,
      paymentMethod: 'نقدي',
      status: 'مكتمل',
      statusColor: 'bg-green-500',
      user: 'سارة المحامية'
    },
    {
      id: 'ACT-2025-010',
      date: '12 نوفمبر 2025',
      time: '9:00 صباحاً',
      type: 'تذكير دفع',
      typeIcon: AlertCircle,
      typeColor: 'text-amber-600',
      bgColor: 'bg-amber-50',
      iconBg: 'bg-amber-100',
      description: 'تم إرسال تذكير دفع لعبدالله الغامدي',
      reference: 'INV-2025-002',
      caseNumber: '4772088016',
      amount: null,
      paymentMethod: 'بريد إلكتروني',
      status: 'مرسل',
      statusColor: 'bg-blue-500',
      user: 'النظام'
    }
  ]

  // Filter activities
  const filteredActivities = activities.filter(activity => {
    if (activeTab === 'all') return true
    if (activeTab === 'payments') return activity.type === 'دفعة مستلمة'
    if (activeTab === 'invoices') return activity.type.includes('فاتورة')
    if (activeTab === 'expenses') return activity.type === 'مصروف جديد'
    return true
  })

  // Calculate statistics
  const totalIncome = activities.filter(a => a.type === 'دفعة مستلمة').reduce((sum, a) => sum + (a.amount || 0), 0)
  const totalExpenses = Math.abs(activities.filter(a => a.type === 'مصروف جديد').reduce((sum, a) => sum + (a.amount || 0), 0))
  const pendingInvoices = activities.filter(a => a.type === 'فاتورة مرسلة' && a.status === 'معلق').length
  const todayActivities = activities.filter(a => a.date === '17 نوفمبر 2025').length

  const formatCurrency = (amount) => {
    if (!amount) return '-'
    return new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 0
    }).format(Math.abs(amount))
  }

  // Group activities by date
  const groupedActivities = filteredActivities.reduce((groups, activity) => {
    const date = activity.date
    if (!groups[date]) {
      groups[date] = []
    }
    groups[date].push(activity)
    return groups
  }, {})

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      {/* Top Navigation Bar */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="flex items-center justify-between px-6 h-16">
          <div className="flex items-center gap-6">
            <h1 className="text-xl font-bold text-slate-900">نشاط الحساب</h1>
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="بحث في الأنشطة..." 
                className="w-80 pr-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              تصدير
            </Button>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              تصفية
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-[1800px] mx-auto p-6">
        {/* Modern Dashboard Overview */}
        <div className="mb-6">
          {/* Top Row - Key Metrics */}
          <div className="grid grid-cols-4 gap-4 mb-4">
            {/* Today's Activities */}
            <Card className="border-slate-200 bg-gradient-to-br from-slate-50 to-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-slate-700" />
                  </div>
                  <Badge variant="outline" className="text-xs">اليوم</Badge>
                </div>
                <div className="text-3xl font-bold text-slate-900 mb-1">{todayActivities}</div>
                <div className="text-xs text-slate-600">أنشطة اليوم</div>
              </CardContent>
            </Card>

            {/* Total Income */}
            <Card className="border-green-200 bg-gradient-to-br from-green-50 to-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-green-700" />
                  </div>
                  <Badge className="bg-green-600 text-xs">دخل</Badge>
                </div>
                <div className="text-3xl font-bold text-green-900 mb-1">{formatCurrency(totalIncome)}</div>
                <div className="text-xs text-green-700">إجمالي المقبوضات</div>
              </CardContent>
            </Card>

            {/* Total Expenses */}
            <Card className="border-red-200 bg-gradient-to-br from-red-50 to-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="h-10 w-10 rounded-lg bg-red-100 flex items-center justify-center">
                    <TrendingDown className="h-5 w-5 text-red-700" />
                  </div>
                  <Badge variant="destructive" className="text-xs">مصروف</Badge>
                </div>
                <div className="text-3xl font-bold text-red-900 mb-1">{formatCurrency(totalExpenses)}</div>
                <div className="text-xs text-red-700">إجمالي المصروفات</div>
              </CardContent>
            </Card>

            {/* Pending Invoices */}
            <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-amber-700" />
                  </div>
                  <Badge className="bg-amber-600 text-xs">معلق</Badge>
                </div>
                <div className="text-3xl font-bold text-amber-900 mb-1">{pendingInvoices}</div>
                <div className="text-xs text-amber-700">فواتير معلقة</div>
              </CardContent>
            </Card>
          </div>

          {/* Bottom Row - Activity Types */}
          <div className="grid grid-cols-3 gap-4">
            {/* Activity by Type */}
            <Card className="border-slate-200">
              <CardContent className="p-6">
                <h3 className="text-sm font-semibold text-slate-900 mb-4">الأنشطة حسب النوع</h3>
                <div className="space-y-3">
                  {Object.entries(
                    activities.reduce((acc, activity) => {
                      acc[activity.type] = (acc[activity.type] || 0) + 1
                      return acc
                    }, {})
                  )
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 3)
                  .map(([type, count], idx) => (
                    <div key={idx}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-slate-600">{type}</span>
                        <span className="text-xs font-bold text-slate-900">{count}</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full" 
                          style={{width: `${(count / activities.length) * 100}%`}}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Users */}
            <Card className="border-slate-200">
              <CardContent className="p-6">
                <h3 className="text-sm font-semibold text-slate-900 mb-4">المستخدمون النشطون</h3>
                <div className="space-y-3">
                  {Object.entries(
                    activities.reduce((acc, activity) => {
                      acc[activity.user] = (acc[activity.user] || 0) + 1
                      return acc
                    }, {})
                  )
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 3)
                  .map(([user, count], idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-slate-200 to-slate-100 flex items-center justify-center">
                        <span className="text-xs font-bold text-slate-700">{count}</span>
                      </div>
                      <div className="flex-1">
                        <div className="text-xs font-medium text-slate-900">{user}</div>
                        <div className="text-[10px] text-slate-600">{count} نشاط</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card className="border-slate-200">
              <CardContent className="p-6">
                <h3 className="text-sm font-semibold text-slate-900 mb-4">إحصائيات سريعة</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div>
                      <div className="text-xs text-slate-600 mb-1">دفعات مستلمة</div>
                      <div className="text-lg font-bold text-green-900">
                        {activities.filter(a => a.type === 'دفعة مستلمة').length}
                      </div>
                    </div>
                    <Check className="h-8 w-8 text-green-600" />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div>
                      <div className="text-xs text-slate-600 mb-1">فواتير مرسلة</div>
                      <div className="text-lg font-bold text-blue-900">
                        {activities.filter(a => a.type === 'فاتورة مرسلة').length}
                      </div>
                    </div>
                    <FileText className="h-8 w-8 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Tabs and Filters */}
        <div className="bg-white rounded-lg border border-slate-200 mb-6">
          <div className="border-b border-slate-200 px-6 py-3">
            <div className="flex items-center gap-2">
              <Button 
                variant={activeTab === 'all' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab('all')}
                className="rounded-full"
              >
                جميع الأنشطة ({activities.length})
              </Button>
              <Button 
                variant={activeTab === 'payments' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab('payments')}
                className="rounded-full"
              >
                الدفعات ({activities.filter(a => a.type === 'دفعة مستلمة').length})
              </Button>
              <Button 
                variant={activeTab === 'invoices' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab('invoices')}
                className="rounded-full"
              >
                الفواتير ({activities.filter(a => a.type.includes('فاتورة')).length})
              </Button>
              <Button 
                variant={activeTab === 'expenses' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab('expenses')}
                className="rounded-full"
              >
                المصروفات ({activities.filter(a => a.type === 'مصروف جديد').length})
              </Button>
            </div>
          </div>

          {/* Filters */}
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-600 mb-2 block text-right">الفترة الزمنية</label>
                <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                  <SelectTrigger className="w-full text-right" dir="rtl">
                    <SelectValue placeholder="اختر..." />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    <SelectItem value="today">اليوم</SelectItem>
                    <SelectItem value="week">هذا الأسبوع</SelectItem>
                    <SelectItem value="month">هذا الشهر</SelectItem>
                    <SelectItem value="year">هذا العام</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 mb-2 block text-right">نوع النشاط</label>
                <Select>
                  <SelectTrigger className="w-full text-right" dir="rtl">
                    <SelectValue placeholder="الكل" />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    <SelectItem value="all">الكل</SelectItem>
                    <SelectItem value="payment">دفعات</SelectItem>
                    <SelectItem value="invoice">فواتير</SelectItem>
                    <SelectItem value="expense">مصروفات</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 mb-2 block text-right">المستخدم</label>
                <Select>
                  <SelectTrigger className="w-full text-right" dir="rtl">
                    <SelectValue placeholder="الكل" />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    <SelectItem value="all">الكل</SelectItem>
                    <SelectItem value="ahmed">أحمد المحامي</SelectItem>
                    <SelectItem value="sara">سارة المحامية</SelectItem>
                    <SelectItem value="mohammed">محمد المحامي</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 mb-2 block text-right">الحالة</label>
                <Select>
                  <SelectTrigger className="w-full text-right" dir="rtl">
                    <SelectValue placeholder="الكل" />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    <SelectItem value="all">الكل</SelectItem>
                    <SelectItem value="completed">مكتمل</SelectItem>
                    <SelectItem value="pending">معلق</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-4">
              <Button size="sm">تطبيق</Button>
              <Button size="sm" variant="outline">مسح</Button>
            </div>
          </div>
        </div>

        {/* Activity Timeline */}
        <div className="space-y-6">
          {Object.entries(groupedActivities).map(([date, dateActivities]) => (
            <div key={date}>
              {/* Date Header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full">
                  <Calendar className="h-4 w-4 text-slate-600" />
                  <span className="text-sm font-semibold text-slate-900">{date}</span>
                </div>
                <div className="flex-1 h-px bg-slate-200"></div>
              </div>

              {/* Activities for this date */}
              <div className="space-y-3">
                {dateActivities.map((activity) => {
                  const Icon = activity.typeIcon
                  return (
                    <Card key={activity.id} className="border-slate-200 hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          {/* Icon */}
                          <div className={`h-12 w-12 rounded-lg ${activity.iconBg} flex items-center justify-center flex-shrink-0`}>
                            <Icon className={`h-6 w-6 ${activity.typeColor}`} />
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className="text-sm font-bold text-slate-900">{activity.type}</h3>
                                  <Badge className={activity.statusColor} size="sm">{activity.status}</Badge>
                                </div>
                                <p className="text-sm text-slate-700">{activity.description}</p>
                              </div>
                              <div className="text-left">
                                <div className="text-xs text-slate-500 mb-1">{activity.time}</div>
                                {activity.amount && (
                                  <div className={`text-lg font-bold ${activity.amount >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                                    {activity.amount >= 0 ? '+' : ''}{formatCurrency(activity.amount)}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Details */}
                            <div className="flex items-center gap-4 text-xs text-slate-600">
                              {activity.reference && (
                                <div className="flex items-center gap-1">
                                  <span className="text-slate-500">المرجع:</span>
                                  <span className="font-mono">{activity.reference}</span>
                                </div>
                              )}
                              {activity.caseNumber && (
                                <div className="flex items-center gap-1">
                                  <span className="text-slate-500">القضية:</span>
                                  <span className="font-mono">{activity.caseNumber}</span>
                                </div>
                              )}
                              {activity.paymentMethod && (
                                <div className="flex items-center gap-1">
                                  <CreditCard className="h-3 w-3" />
                                  <span>{activity.paymentMethod}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-1">
                                <span className="text-slate-500">بواسطة:</span>
                                <span>{activity.user}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
