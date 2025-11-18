import { useState, useEffect } from 'react'
import { Clock, Play, Pause, Square, Plus, Filter, Download, DollarSign, Calendar, User, FileText, Search, Edit, Trash2, Check, X } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export default function TimeEntries() {
  const [isTimerRunning, setIsTimerRunning] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [selectedFilter, setSelectedFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')

  // Summary stats
  const summary = {
    totalBillableHours: 156.5,
    totalUnbilledHours: 42.3,
    totalBilledHours: 114.2,
    unbilledValue: 169200,
    averageRate: 400,
    thisWeekHours: 38.5
  }

  // Time entries data
  const timeEntries = [
    {
      id: 'TE-001',
      date: '17 نوفمبر 2025',
      client: 'مشاري الرابح',
      caseNumber: 'CASE-2025-001',
      task: 'إعداد مذكرة دفاع في القضية التجارية',
      hours: 3.5,
      rate: 500,
      amount: 1750,
      status: 'unbilled',
      lawyer: 'أحمد السالم',
      billable: true
    },
    {
      id: 'TE-002',
      date: '17 نوفمبر 2025',
      client: 'سارة المطيري',
      caseNumber: 'CASE-2025-005',
      task: 'مراجعة العقد وإبداء الملاحظات القانونية',
      hours: 2.0,
      rate: 450,
      amount: 900,
      status: 'unbilled',
      lawyer: 'فاطمة الغامدي',
      billable: true
    },
    {
      id: 'TE-003',
      date: '16 نوفمبر 2025',
      client: 'محمد الدوسري',
      caseNumber: 'CASE-2025-006',
      task: 'حضور جلسة المحكمة والمرافعة',
      hours: 4.0,
      rate: 600,
      amount: 2400,
      status: 'billed',
      lawyer: 'أحمد السالم',
      billable: true
    },
    {
      id: 'TE-004',
      date: '16 نوفمبر 2025',
      client: 'عمر العنزي',
      caseNumber: 'CASE-2025-008',
      task: 'البحث القانوني في سوابق قضائية مشابهة',
      hours: 5.5,
      rate: 350,
      amount: 1925,
      status: 'unbilled',
      lawyer: 'خالد المري',
      billable: true
    },
    {
      id: 'TE-005',
      date: '15 نوفمبر 2025',
      client: 'مشاري الرابح',
      caseNumber: 'CASE-2025-001',
      task: 'مكالمة هاتفية مع العميل لمناقشة تطورات القضية',
      hours: 0.5,
      rate: 500,
      amount: 250,
      status: 'unbilled',
      lawyer: 'أحمد السالم',
      billable: true
    },
    {
      id: 'TE-006',
      date: '15 نوفمبر 2025',
      client: 'داخلي',
      caseNumber: 'INTERNAL',
      task: 'اجتماع فريق العمل الأسبوعي',
      hours: 1.5,
      rate: 0,
      amount: 0,
      status: 'non-billable',
      lawyer: 'الجميع',
      billable: false
    },
    {
      id: 'TE-007',
      date: '14 نوفمبر 2025',
      client: 'شركة البناء الحديثة',
      caseNumber: 'CASE-2025-012',
      task: 'صياغة عقد المقاولة والمراجعة النهائية',
      hours: 6.0,
      rate: 550,
      amount: 3300,
      status: 'billed',
      lawyer: 'فاطمة الغامدي',
      billable: true
    },
    {
      id: 'TE-008',
      date: '14 نوفمبر 2025',
      client: 'سارة المطيري',
      caseNumber: 'CASE-2025-005',
      task: 'إعداد صحيفة الدعوى وتقديمها للمحكمة',
      hours: 4.5,
      rate: 450,
      amount: 2025,
      status: 'unbilled',
      lawyer: 'فاطمة الغامدي',
      billable: true
    }
  ]

  // Timer effect
  useEffect(() => {
    let interval
    if (isTimerRunning) {
      interval = setInterval(() => {
        setCurrentTime(prev => prev + 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isTimerRunning])

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const getStatusBadge = (status) => {
    switch(status) {
      case 'unbilled':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">لم تفوتر</Badge>
      case 'billed':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">تم الفوترة</Badge>
      case 'non-billable':
        return <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200">غير قابل للفوترة</Badge>
      default:
        return null
    }
  }

  const filteredEntries = timeEntries.filter(entry => {
    const matchesFilter = selectedFilter === 'all' || entry.status === selectedFilter
    const matchesSearch = entry.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         entry.task.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         entry.caseNumber.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesFilter && matchesSearch
  })

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      {/* Top Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between max-w-[1800px] mx-auto">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">تسجيل الساعات</h1>
            <p className="text-sm text-slate-600">تتبع وإدارة ساعات العمل القابلة للفوترة</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline">
              <Download className="h-4 w-4 ml-2" />
              تصدير
            </Button>
            <Button>
              <Plus className="h-4 w-4 ml-2" />
              إضافة وقت يدوياً
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-[1800px] mx-auto p-6">
        {/* Timer Card */}
        <Card className="border-slate-200 mb-6 bg-gradient-to-br from-blue-50 to-white">
          <CardContent className="p-6">
            <div className="grid grid-cols-3 gap-6 items-center">
              {/* Timer Display */}
              <div className="col-span-1">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                    <Clock className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-xs text-slate-600">المؤقت الحالي</div>
                    <div className="text-3xl font-bold text-slate-900 font-mono">{formatTime(currentTime)}</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  {!isTimerRunning ? (
                    <Button onClick={() => setIsTimerRunning(true)} className="flex-1">
                      <Play className="h-4 w-4 ml-2" />
                      بدء
                    </Button>
                  ) : (
                    <Button onClick={() => setIsTimerRunning(false)} variant="outline" className="flex-1">
                      <Pause className="h-4 w-4 ml-2" />
                      إيقاف مؤقت
                    </Button>
                  )}
                  <Button 
                    onClick={() => {
                      setIsTimerRunning(false)
                      setCurrentTime(0)
                    }} 
                    variant="outline"
                    className="flex-1"
                  >
                    <Square className="h-4 w-4 ml-2" />
                    إنهاء وحفظ
                  </Button>
                </div>
              </div>

              {/* Quick Entry Form */}
              <div className="col-span-2 pr-6 border-r border-slate-200">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-slate-600 mb-1 block">العميل</label>
                    <select className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm">
                      <option>اختر العميل</option>
                      <option>مشاري الرابح</option>
                      <option>سارة المطيري</option>
                      <option>محمد الدوسري</option>
                      <option>عمر العنزي</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-600 mb-1 block">رقم القضية</label>
                    <select className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm">
                      <option>اختر القضية</option>
                      <option>CASE-2025-001</option>
                      <option>CASE-2025-005</option>
                      <option>CASE-2025-006</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-slate-600 mb-1 block">وصف المهمة</label>
                    <input 
                      type="text" 
                      placeholder="اكتب وصف للعمل الذي تقوم به..."
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-600 mb-1 block">السعر بالساعة</label>
                    <input 
                      type="number" 
                      placeholder="400"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    />
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" defaultChecked className="rounded" />
                      <span className="text-slate-700">قابل للفوترة</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <Card className="border-slate-200 bg-gradient-to-br from-slate-50 to-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-blue-600" />
                </div>
                <Badge variant="outline" className="text-xs">الإجمالي</Badge>
              </div>
              <div className="text-3xl font-bold text-slate-900 mb-1">{summary.totalBillableHours}</div>
              <div className="text-xs text-slate-600">ساعة قابلة للفوترة</div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-gradient-to-br from-slate-50 to-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="h-10 w-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-yellow-600" />
                </div>
                <Badge variant="outline" className="text-xs bg-yellow-50">لم تفوتر</Badge>
              </div>
              <div className="text-3xl font-bold text-slate-900 mb-1">{summary.totalUnbilledHours}</div>
              <div className="text-xs text-slate-600">ساعة غير مفوترة</div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-gradient-to-br from-slate-50 to-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-green-600" />
                </div>
                <Badge variant="outline" className="text-xs bg-green-50">قيمة</Badge>
              </div>
              <div className="text-3xl font-bold text-slate-900 mb-1">{formatCurrency(summary.unbilledValue)}</div>
              <div className="text-xs text-slate-600">قيمة غير مفوترة</div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-gradient-to-br from-slate-50 to-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-purple-600" />
                </div>
                <Badge variant="outline" className="text-xs">هذا الأسبوع</Badge>
              </div>
              <div className="text-3xl font-bold text-slate-900 mb-1">{summary.thisWeekHours}</div>
              <div className="text-xs text-slate-600">ساعة العمل</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card className="border-slate-200 mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="بحث في السجلات..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pr-10 pl-4 py-2 border border-slate-200 rounded-lg text-sm w-80"
                  />
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant={selectedFilter === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedFilter('all')}
                  >
                    الكل ({timeEntries.length})
                  </Button>
                  <Button 
                    variant={selectedFilter === 'unbilled' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedFilter('unbilled')}
                  >
                    لم تفوتر ({timeEntries.filter(e => e.status === 'unbilled').length})
                  </Button>
                  <Button 
                    variant={selectedFilter === 'billed' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedFilter('billed')}
                  >
                    تم الفوترة ({timeEntries.filter(e => e.status === 'billed').length})
                  </Button>
                  <Button 
                    variant={selectedFilter === 'non-billable' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedFilter('non-billable')}
                  >
                    غير قابل ({timeEntries.filter(e => e.status === 'non-billable').length})
                  </Button>
                </div>
              </div>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 ml-2" />
                المزيد من الفلاتر
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Time Entries Table */}
        <Card className="border-slate-200">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-slate-600">التاريخ</th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-slate-600">العميل</th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-slate-600">القضية</th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-slate-600">المهمة</th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-slate-600">المحامي</th>
                    <th className="text-center px-6 py-3 text-xs font-semibold text-slate-600">الساعات</th>
                    <th className="text-center px-6 py-3 text-xs font-semibold text-slate-600">السعر</th>
                    <th className="text-center px-6 py-3 text-xs font-semibold text-slate-600">المبلغ</th>
                    <th className="text-center px-6 py-3 text-xs font-semibold text-slate-600">الحالة</th>
                    <th className="text-center px-6 py-3 text-xs font-semibold text-slate-600">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEntries.map((entry, idx) => (
                    <tr key={entry.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <div className="text-sm text-slate-900">{entry.date}</div>
                        <div className="text-xs text-slate-500">{entry.id}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-semibold text-slate-900">{entry.client}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-xs font-mono text-slate-600">{entry.caseNumber}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-slate-700 max-w-xs">{entry.task}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center">
                            <User className="h-3 w-3 text-blue-600" />
                          </div>
                          <span className="text-xs text-slate-600">{entry.lawyer}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="text-sm font-bold text-slate-900">{entry.hours}</div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="text-sm text-slate-700">{entry.rate > 0 ? `${entry.rate} ر.س` : '-'}</div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="text-sm font-bold text-slate-900">
                          {entry.amount > 0 ? formatCurrency(entry.amount) : '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {getStatusBadge(entry.status)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-1">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <Edit className="h-4 w-4 text-slate-600" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-slate-600">
            عرض {filteredEntries.length} من {timeEntries.length} سجل
          </div>
          <div className="flex gap-3">
            <Button variant="outline">
              تحويل إلى فاتورة ({timeEntries.filter(e => e.status === 'unbilled').length})
            </Button>
            <Button>
              إنشاء تقرير الساعات
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
