import { useState } from 'react'
import { Search, Filter, Calendar, Clock, Scale, Plus, Eye, Edit, ChevronDown, AlertCircle, CheckCircle, XCircle, FileText } from 'lucide-react'
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

export default function CasesDashboard() {
  const [activeTab, setActiveTab] = useState('today')
  const [searchQuery, setSearchQuery] = useState('')
  const [showOnlyMyCases, setShowOnlyMyCases] = useState(false)

  // Today's cases
  const todayCases = [
    {
      id: '4772077905',
      plaintiff: 'مشاري بن ناهد الرابح',
      defendant: 'المصنع السعودي للمنتجات المعدنية',
      nextHearingDate: '17 نوفمبر 2025',
      nextHearingTime: '10:35 صباحاً',
      nextHearingHijri: '١٤٤٧/٠٥/٢٦',
      hearingType: 'جلسة مرافعة',
      nextEvent: 'اجتماع مع العميل',
      nextTask: 'تحضير المستندات',
      nextTaskDue: '25 نوفمبر',
      status: 'قيد النظر',
      statusColor: 'bg-blue-500',
      statusUpdate: 'تم الإنشاء في 13 نوفمبر، 6:03 صباحاً',
      court: 'المحكمة العمالية - الرياض',
      lawyer: 'أحمد المحامي'
    },
    {
      id: '4772088016',
      plaintiff: 'عبدالله بن سعد الغامدي',
      defendant: 'شركة البناء الحديثة',
      nextHearingDate: '17 نوفمبر 2025',
      nextHearingTime: '2:00 مساءً',
      nextHearingHijri: '١٤٤٧/٠٥/١٦',
      hearingType: 'جلسة مرافعة',
      nextEvent: 'تقديم المذكرات',
      nextTask: 'مراجعة المستندات',
      nextTaskDue: '20 نوفمبر',
      status: 'قيد النظر',
      statusColor: 'bg-blue-500',
      statusUpdate: 'تم الإنشاء في 15 نوفمبر، 9:20 صباحاً',
      court: 'المحكمة العمالية - جدة',
      lawyer: 'سارة المحامية'
    },
    {
      id: '4772099127',
      plaintiff: 'فاطمة بنت محمد العتيبي',
      defendant: 'مستشفى النور الطبي',
      nextHearingDate: '17 نوفمبر 2025',
      nextHearingTime: '4:30 مساءً',
      nextHearingHijri: '١٤٤٧/٠٥/١٦',
      hearingType: 'تسوية ودية - الموعد الأول',
      nextEvent: 'اجتماع تسوية',
      nextTask: 'تحضير العرض',
      nextTaskDue: '17 نوفمبر',
      status: 'تسوية ودية',
      statusColor: 'bg-amber-500',
      statusUpdate: 'تم الإنشاء في 16 نوفمبر، 2:45 مساءً',
      court: 'مكتب العمل - الرياض',
      lawyer: 'محمد المحامي'
    }
  ]

  // Ongoing cases
  const ongoingCases = [
    {
      id: '4772100238',
      plaintiff: 'خالد بن عبدالرحمن القحطاني',
      defendant: 'شركة التقنية المتقدمة',
      nextHearingDate: '25 نوفمبر 2025',
      nextHearingTime: '11:00 صباحاً',
      nextHearingHijri: '١٤٤٧/٠٥/٢٤',
      hearingType: 'جلسة مرافعة',
      nextEvent: 'جلسة شهود',
      nextTask: 'جمع الشهادات',
      nextTaskDue: '23 نوفمبر',
      status: 'قيد النظر',
      statusColor: 'bg-blue-500',
      statusUpdate: 'تم التحديث في 10 نوفمبر، 3:15 مساءً',
      court: 'المحكمة العمالية - الدمام',
      lawyer: 'أحمد المحامي',
      daysUntil: 8
    },
    {
      id: '4772111349',
      plaintiff: 'سارة بنت أحمد المطيري',
      defendant: 'المجموعة التجارية الكبرى',
      nextHearingDate: '28 نوفمبر 2025',
      nextHearingTime: '9:30 صباحاً',
      nextHearingHijri: '١٤٤٧/٠٥/٢٧',
      hearingType: 'جلسة مرافعة',
      nextEvent: 'تقديم مذكرة',
      nextTask: 'كتابة المذكرة',
      nextTaskDue: '26 نوفمبر',
      status: 'قيد النظر',
      statusColor: 'bg-blue-500',
      statusUpdate: 'تم التحديث في 12 نوفمبر، 11:30 صباحاً',
      court: 'المحكمة العمالية - الرياض',
      lawyer: 'فاطمة المحامية',
      daysUntil: 11
    },
    {
      id: '4772122450',
      plaintiff: 'محمد بن يوسف الدوسري',
      defendant: 'شركة النقل السريع',
      nextHearingDate: '20 نوفمبر 2025',
      nextHearingTime: '10:00 صباحاً',
      nextHearingHijri: '١٤٤٧/٠٥/١٩',
      hearingType: 'تسوية ودية - الموعد الثاني',
      nextEvent: 'اجتماع تسوية',
      nextTask: 'مراجعة العرض',
      nextTaskDue: '19 نوفمبر',
      status: 'تسوية ودية',
      statusColor: 'bg-amber-500',
      statusUpdate: 'تم التحديث في 15 نوفمبر، 4:20 مساءً',
      court: 'مكتب العمل - جدة',
      lawyer: 'سارة المحامية',
      daysUntil: 3
    },
    {
      id: '4772133561',
      plaintiff: 'نورة بنت خالد الشمري',
      defendant: 'مركز التدريب الوطني',
      nextHearingDate: '5 ديسمبر 2025',
      nextHearingTime: '2:30 مساءً',
      nextHearingHijri: '١٤٤٧/٠٦/٠٤',
      hearingType: 'جلسة مرافعة',
      nextEvent: 'جلسة إثبات',
      nextTask: 'تجهيز الأدلة',
      nextTaskDue: '3 ديسمبر',
      status: 'قيد النظر',
      statusColor: 'bg-blue-500',
      statusUpdate: 'تم التحديث في 8 نوفمبر، 1:45 مساءً',
      court: 'المحكمة العمالية - الخبر',
      lawyer: 'محمد المحامي',
      daysUntil: 18
    },
    {
      id: '4772144672',
      plaintiff: 'عمر بن فهد العنزي',
      defendant: 'الشركة الصناعية المتحدة',
      nextHearingDate: '2 ديسمبر 2025',
      nextHearingTime: '11:30 صباحاً',
      nextHearingHijri: '١٤٤٧/٠٦/٠١',
      hearingType: 'جلسة استئناف - الأولى',
      nextEvent: 'جلسة استئناف',
      nextTask: 'تحضير الاستئناف',
      nextTaskDue: '30 نوفمبر',
      status: 'استئناف',
      statusColor: 'bg-purple-500',
      statusUpdate: 'تم التحديث في 14 نوفمبر، 10:10 صباحاً',
      court: 'محكمة الاستئناف - الرياض',
      lawyer: 'أحمد المحامي',
      daysUntil: 15
    },
    {
      id: '4772155783',
      plaintiff: 'ريم بنت ماجد الحربي',
      defendant: 'مؤسسة الخدمات اللوجستية',
      nextHearingDate: '22 نوفمبر 2025',
      nextHearingTime: '1:00 مساءً',
      nextHearingHijri: '١٤٤٧/٠٥/٢١',
      hearingType: 'جلسة مرافعة',
      nextEvent: 'جلسة مناقشة',
      nextTask: 'إعداد الأسئلة',
      nextTaskDue: '21 نوفمبر',
      status: 'قيد النظر',
      statusColor: 'bg-blue-500',
      statusUpdate: 'تم التحديث في 11 نوفمبر، 5:30 مساءً',
      court: 'المحكمة العمالية - جدة',
      lawyer: 'فاطمة المحامية',
      daysUntil: 5
    }
  ]

  const currentCases = activeTab === 'today' ? todayCases : ongoingCases

  // Calculate statistics
  const totalCases = todayCases.length + ongoingCases.length
  const todayHearings = todayCases.length
  const urgentCases = ongoingCases.filter(c => c.daysUntil <= 5).length

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      {/* Top Navigation Bar */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="flex items-center justify-between px-6 h-16">
          <div className="flex items-center gap-6">
            <h1 className="text-xl font-bold text-slate-900">القضايا</h1>
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="بحث في القضايا..." 
                className="w-80 pr-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              تصفية
            </Button>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              قضية جديدة
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-[1800px] mx-auto p-6">
        {/* Modern Dashboard Overview */}
        <div className="mb-6">
          {/* Top Row - Key Metrics */}
          <div className="grid grid-cols-4 gap-4 mb-4">
            {/* Total Cases */}
            <Card className="border-slate-200 bg-gradient-to-br from-slate-50 to-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center">
                    <Scale className="h-5 w-5 text-slate-700" />
                  </div>
                  <Badge variant="outline" className="text-xs">إجمالي</Badge>
                </div>
                <div className="text-3xl font-bold text-slate-900 mb-1">{totalCases}</div>
                <div className="text-xs text-slate-600">إجمالي القضايا</div>
              </CardContent>
            </Card>

            {/* Today's Hearings */}
            <Card className="border-green-200 bg-gradient-to-br from-green-50 to-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-green-700" />
                  </div>
                  <Badge className="bg-green-600 text-xs">اليوم</Badge>
                </div>
                <div className="text-3xl font-bold text-green-900 mb-1">{todayHearings}</div>
                <div className="text-xs text-green-700">جلسات اليوم</div>
              </CardContent>
            </Card>

            {/* Urgent Cases */}
            <Card className="border-red-200 bg-gradient-to-br from-red-50 to-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="h-10 w-10 rounded-lg bg-red-100 flex items-center justify-center">
                    <AlertCircle className="h-5 w-5 text-red-700" />
                  </div>
                  <Badge variant="destructive" className="text-xs">عاجل</Badge>
                </div>
                <div className="text-3xl font-bold text-red-900 mb-1">{urgentCases}</div>
                <div className="text-xs text-red-700">خلال 5 أيام</div>
              </CardContent>
            </Card>

            {/* Ongoing Cases */}
            <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-blue-700" />
                  </div>
                  <Badge className="bg-blue-600 text-xs">نشط</Badge>
                </div>
                <div className="text-3xl font-bold text-blue-900 mb-1">{ongoingCases.length}</div>
                <div className="text-xs text-blue-700">القضايا الجارية</div>
              </CardContent>
            </Card>
          </div>

          {/* Bottom Row - Visual Analytics */}
          <div className="grid grid-cols-3 gap-4">
            {/* Status Distribution */}
            <Card className="border-slate-200 col-span-1">
              <CardContent className="p-6">
                <h3 className="text-sm font-semibold text-slate-900 mb-4">توزيع الحالات</h3>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-slate-600">قيد النظر</span>
                      <span className="text-xs font-bold text-slate-900">
                        {currentCases.filter(c => c.status === 'قيد النظر').length}
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full" 
                        style={{width: `${(currentCases.filter(c => c.status === 'قيد النظر').length / currentCases.length) * 100}%`}}
                      ></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-slate-600">تسوية ودية</span>
                      <span className="text-xs font-bold text-slate-900">
                        {currentCases.filter(c => c.status === 'تسوية ودية').length}
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div 
                        className="bg-amber-500 h-2 rounded-full" 
                        style={{width: `${(currentCases.filter(c => c.status === 'تسوية ودية').length / currentCases.length) * 100}%`}}
                      ></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-slate-600">استئناف</span>
                      <span className="text-xs font-bold text-slate-900">
                        {currentCases.filter(c => c.status === 'استئناف').length}
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div 
                        className="bg-purple-500 h-2 rounded-full" 
                        style={{width: `${(currentCases.filter(c => c.status === 'استئناف').length / currentCases.length) * 100}%`}}
                      ></div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Upcoming Timeline */}
            <Card className="border-slate-200 col-span-1">
              <CardContent className="p-6">
                <h3 className="text-sm font-semibold text-slate-900 mb-4">الجدول الزمني</h3>
                <div className="space-y-3">
                  {ongoingCases.filter(c => c.daysUntil !== undefined).slice(0, 3).sort((a, b) => a.daysUntil - b.daysUntil).map((case_, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-gradient-to-br from-slate-100 to-slate-50 flex items-center justify-center">
                        <div className="text-center">
                          <div className="text-lg font-bold text-slate-900">{case_.daysUntil}</div>
                          <div className="text-[8px] text-slate-600">يوم</div>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-slate-900 truncate">{case_.plaintiff}</div>
                        <div className="text-[10px] text-slate-600 truncate">{case_.court}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Lawyer Workload */}
            <Card className="border-slate-200 col-span-1">
              <CardContent className="p-6">
                <h3 className="text-sm font-semibold text-slate-900 mb-4">توزيع القضايا</h3>
                <div className="space-y-3">
                  {Object.entries(
                    [...todayCases, ...ongoingCases].reduce((acc, case_) => {
                      acc[case_.lawyer] = (acc[case_.lawyer] || 0) + 1;
                      return acc;
                    }, {})
                  ).map(([lawyer, count], idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-slate-200 to-slate-100 flex items-center justify-center">
                        <span className="text-xs font-bold text-slate-700">{count}</span>
                      </div>
                      <div className="flex-1">
                        <div className="text-xs font-medium text-slate-900">{lawyer}</div>
                        <div className="text-[10px] text-slate-600">{count} قضية</div>
                      </div>
                      <div className="w-16 bg-slate-100 rounded-full h-1.5">
                        <div 
                          className="bg-slate-600 h-1.5 rounded-full" 
                          style={{width: `${(count / totalCases) * 100}%`}}
                        ></div>
                      </div>
                    </div>
                  ))}
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
                variant={activeTab === 'today' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab('today')}
                className="rounded-full"
              >
                جلسات اليوم ({todayCases.length})
              </Button>
              <Button 
                variant={activeTab === 'ongoing' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab('ongoing')}
                className="rounded-full"
              >
                القضايا الجارية ({ongoingCases.length})
              </Button>
            </div>
          </div>

          {/* Filters */}
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-600 mb-2 block text-right">نوع القضية</label>
                <Select>
                  <SelectTrigger className="w-full text-right" dir="rtl">
                    <SelectValue placeholder="اختر..." />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    <SelectItem value="labor">عمالية</SelectItem>
                    <SelectItem value="commercial">تجارية</SelectItem>
                    <SelectItem value="civil">مدنية</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 mb-2 block text-right">المحامي المسؤول</label>
                <Select>
                  <SelectTrigger className="w-full text-right" dir="rtl">
                    <SelectValue placeholder="اختر..." />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    <SelectItem value="ahmed">أحمد المحامي</SelectItem>
                    <SelectItem value="sara">سارة المحامية</SelectItem>
                    <SelectItem value="fatima">فاطمة المحامية</SelectItem>
                    <SelectItem value="mohammed">محمد المحامي</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 mb-2 block text-right">الحالة</label>
                <Select>
                  <SelectTrigger className="w-full text-right" dir="rtl">
                    <SelectValue placeholder="اختر..." />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    <SelectItem value="review">قيد النظر</SelectItem>
                    <SelectItem value="settlement">تسوية ودية</SelectItem>
                    <SelectItem value="appeal">استئناف</SelectItem>
                    <SelectItem value="closed">مغلقة</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={showOnlyMyCases}
                    onChange={(e) => setShowOnlyMyCases(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300"
                  />
                  <span className="text-sm text-slate-700">قضاياي فقط</span>
                </label>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-4">
              <Button size="sm">تطبيق</Button>
              <Button size="sm" variant="outline">مسح</Button>
            </div>
          </div>
        </div>

        {/* Cases Table */}
        <Card className="border-slate-200">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600 w-[100px]">رقم القضية</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600 min-w-[180px]">المدعي</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600 min-w-[200px]">المدعى عليه</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600">التاريخ والوقت</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600">نوع الجلسة</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600">الحالة</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600">الحدث القادم</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600">المهمة القادمة</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600">آخر تحديث</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600 w-[100px]">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {currentCases.map((case_) => (
                    <tr 
                      key={case_.id} 
                      className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                    >
                      {/* Case Number */}
                      <td className="px-6 py-4">
                        <div className="text-right">
                          <div className="text-sm font-bold text-slate-900">{case_.id}</div>
                        </div>
                      </td>

                      {/* Plaintiff */}
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-slate-900 text-right">{case_.plaintiff}</div>
                      </td>

                      {/* Defendant */}
                      <td className="px-6 py-4">
                        <div className="text-sm text-slate-900 text-right">{case_.defendant}</div>
                      </td>

                      {/* Date and Time */}
                      <td className="px-6 py-4">
                        <div className="text-right">
                          <div className="flex items-center gap-2 justify-end mb-1">
                            <span className="text-sm font-medium text-slate-900">{case_.nextHearingDate}</span>
                            <Calendar className="h-4 w-4 text-slate-400" />
                          </div>
                          <div className="flex items-center gap-2 justify-end mb-1">
                            <span className="text-sm text-slate-600">{case_.nextHearingTime}</span>
                            <Clock className="h-4 w-4 text-slate-400" />
                          </div>
                          <div className="text-xs text-slate-500">{case_.nextHearingHijri} هـ</div>
                          {case_.daysUntil !== undefined && case_.daysUntil <= 5 && (
                            <Badge variant="destructive" className="text-xs mt-1">
                              {case_.daysUntil === 0 ? 'اليوم' : `بعد ${case_.daysUntil} أيام`}
                            </Badge>
                          )}
                        </div>
                      </td>

                      {/* Hearing Type and Location */}
                      <td className="px-6 py-4">
                        <div className="text-right">
                          <div className="text-sm text-slate-900 font-medium mb-1">{case_.hearingType}</div>
                          <div className="text-xs text-slate-600">{case_.court}</div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        <div className="flex justify-end">
                          <Badge className={case_.statusColor}>{case_.status}</Badge>
                        </div>
                      </td>

                      {/* Next Event */}
                      <td className="px-6 py-4">
                        <div className="text-sm text-slate-900 text-right">{case_.nextEvent}</div>
                      </td>

                      {/* Next Task */}
                      <td className="px-6 py-4">
                        <div className="text-right">
                          <div className="text-sm font-medium text-slate-900 mb-1">{case_.nextTask}</div>
                          <Badge variant="outline" className="text-xs">
                            <Clock className="h-3 w-3 ml-1" />
                            {case_.nextTaskDue}
                          </Badge>
                        </div>
                      </td>

                      {/* Status Update */}
                      <td className="px-6 py-4">
                        <div className="text-xs text-slate-600 text-right">{case_.statusUpdate}</div>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 justify-end">
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
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
      </div>
    </div>
  )
}
