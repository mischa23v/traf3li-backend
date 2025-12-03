import { useState } from 'react'
import { Calendar, MapPin, Users, Clock, Briefcase, Plus, Filter, Search, Download, Edit, Trash2, Eye, ChevronRight, Building2, Scale, FileText, User, AlertCircle, CheckCircle, Video } from 'lucide-react'

export default function EventsDashboard() {
  const [selectedFilter, setSelectedFilter] = useState('all')
  const [selectedType, setSelectedType] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedEvent, setSelectedEvent] = useState(null)

  // Summary stats
  const summary = {
    totalEvents: 15,
    courtHearings: 6,
    laborOffice: 3,
    meetings: 6,
    upcoming: 10,
    completed: 5
  }

  // Events data - Meetings and Hearings
  const events = [
    {
      id: 1,
      title: 'جلسة المحكمة التجارية - دعوى عقود',
      type: 'court',
      subType: 'commercial_court',
      date: '2025-11-18',
      time: '9:00 ص',
      duration: '2 ساعة',
      location: 'المحكمة التجارية - الرياض',
      locationAddress: 'طريق الملك فهد، الرياض',
      courtRoom: 'القاعة 3',
      caseNumber: 'CASE-2025-012',
      client: 'شركة البناء الحديثة',
      lawyer: 'فاطمة الغامدي',
      judge: 'القاضي عبدالله المطيري',
      sessionType: 'جلسة مرافعة',
      attendees: ['فاطمة الغامدي', 'ممثل الشركة'],
      status: 'upcoming',
      priority: 'high',
      notes: 'إحضار جميع المستندات المتعلقة بالعقد',
      daysUntil: 1
    },
    {
      id: 2,
      title: 'جلسة مكتب العمل - نزاع عمالي',
      type: 'labor_office',
      subType: 'dispute_hearing',
      date: '2025-11-20',
      time: '10:30 ص',
      duration: '1.5 ساعة',
      location: 'مكتب العمل - الرياض',
      locationAddress: 'شارع العليا، الرياض',
      officeNumber: 'المكتب 12',
      caseNumber: 'CASE-2025-001',
      client: 'مشاري الرابح',
      lawyer: 'أحمد السالم',
      official: 'مسؤول التسوية أحمد الغامدي',
      sessionType: 'جلسة تسوية',
      attendees: ['أحمد السالم', 'مشاري الرابح', 'ممثل الشركة'],
      status: 'upcoming',
      priority: 'high',
      notes: 'محاولة التوصل إلى تسوية ودية',
      daysUntil: 3
    },
    {
      id: 3,
      title: 'اجتماع مع المجموعة التجارية الكبرى',
      type: 'meeting',
      subType: 'client_meeting',
      date: '2025-11-28',
      time: '2:00 م',
      duration: '1.5 ساعة',
      location: 'مقر الشركة',
      locationAddress: 'برج الفيصلية، الرياض',
      meetingRoom: 'قاعة الاجتماعات الرئيسية',
      caseNumber: 'CASE-2025-018',
      client: 'المجموعة التجارية الكبرى',
      lawyer: 'أحمد السالم',
      attendees: ['أحمد السالم', 'خالد المري', 'الرئيس التنفيذي', 'المدير القانوني'],
      status: 'upcoming',
      priority: 'medium',
      agenda: ['مراجعة تطورات القضية', 'مناقشة الاستراتيجية القانونية', 'تحديث الموكل'],
      notes: 'تحضير عرض تقديمي للموكل',
      daysUntil: 11
    },
    {
      id: 4,
      title: 'جلسة المرافعة النهائية - قضية عمالية',
      type: 'court',
      subType: 'labor_court',
      date: '2025-11-22',
      time: '10:00 ص',
      duration: '3 ساعة',
      location: 'المحكمة العمالية - الرياض',
      locationAddress: 'شارع التخصصي، الرياض',
      courtRoom: 'القاعة 7',
      caseNumber: 'CASE-2025-008',
      client: 'عمر العنزي',
      lawyer: 'أحمد السالم',
      judge: 'القاضي محمد العتيبي',
      sessionType: 'مرافعة نهائية',
      attendees: ['أحمد السالم', 'عمر العنزي', 'شاهد 1', 'شاهد 2'],
      status: 'upcoming',
      priority: 'urgent',
      notes: 'جلسة حاسمة - تحضير جميع الشهود والمستندات',
      daysUntil: 5
    },
    {
      id: 5,
      title: 'اجتماع استشاري - عميل جديد',
      type: 'meeting',
      subType: 'consultation',
      date: '2025-11-19',
      time: '11:30 ص',
      duration: '45 دقيقة',
      location: 'اجتماع عن بُعد',
      meetingPlatform: 'Zoom',
      meetingLink: 'https://zoom.us/j/123456789',
      lawyer: 'خالد المري',
      attendees: ['خالد المري', 'العميل المحتمل'],
      status: 'upcoming',
      priority: 'medium',
      agenda: ['مناقشة تفاصيل القضية', 'تقييم الوضع القانوني', 'عرض الخدمات'],
      notes: 'استشارة أولية - تحديد إمكانية قبول القضية',
      daysUntil: 2
    },
    {
      id: 6,
      title: 'جلسة محكمة عامة - قضية مدنية',
      type: 'court',
      subType: 'civil_court',
      date: '2025-11-26',
      time: '9:30 ص',
      duration: '2 ساعة',
      location: 'المحكمة العامة - الرياض',
      locationAddress: 'حي السفارات، الرياض',
      courtRoom: 'القاعة 5',
      caseNumber: 'CASE-2025-005',
      client: 'سارة المطيري',
      lawyer: 'فاطمة الغامدي',
      judge: 'القاضي سعد الدوسري',
      sessionType: 'جلسة نظر',
      attendees: ['فاطمة الغامدي', 'سارة المطيري'],
      status: 'upcoming',
      priority: 'medium',
      notes: 'أول جلسة - تقديم صحيفة الدعوى',
      daysUntil: 9
    },
    {
      id: 7,
      title: 'اجتماع فريق العمل الأسبوعي',
      type: 'meeting',
      subType: 'internal_meeting',
      date: '2025-11-24',
      time: '4:00 م',
      duration: '1 ساعة',
      location: 'مكتب المحاماة',
      locationAddress: 'برج المملكة، الرياض',
      meetingRoom: 'قاعة الاجتماعات',
      attendees: ['أحمد السالم', 'فاطمة الغامدي', 'خالد المري', 'محمد العتيبي', 'سارة الدوسري'],
      status: 'upcoming',
      priority: 'low',
      agenda: ['مراجعة القضايا الجارية', 'توزيع المهام الجديدة', 'مناقشة التحديات'],
      notes: 'اجتماع دوري أسبوعي',
      daysUntil: 7
    },
    {
      id: 8,
      title: 'جلسة مكتب العمل - متابعة تنفيذ',
      type: 'labor_office',
      subType: 'follow_up',
      date: '2025-11-25',
      time: '11:00 ص',
      duration: '1 ساعة',
      location: 'مكتب العمل - الرياض',
      locationAddress: 'شارع العليا، الرياض',
      officeNumber: 'المكتب 12',
      caseNumber: 'CASE-2025-004',
      client: 'عبدالله الشمري',
      lawyer: 'محمد العتيبي',
      official: 'مسؤول التنفيذ فهد القحطاني',
      sessionType: 'متابعة تنفيذ',
      attendees: ['محمد العتيبي', 'عبدالله الشمري'],
      status: 'upcoming',
      priority: 'medium',
      notes: 'متابعة تنفيذ قرار مكتب العمل',
      daysUntil: 8
    },
    {
      id: 9,
      title: 'اجتماع تحضيري للمرافعة',
      type: 'meeting',
      subType: 'preparation_meeting',
      date: '2025-11-21',
      time: '3:00 م',
      duration: '2 ساعة',
      location: 'مكتب المحاماة',
      locationAddress: 'برج المملكة، الرياض',
      meetingRoom: 'غرفة الاجتماعات الصغيرة',
      caseNumber: 'CASE-2025-008',
      client: 'عمر العنزي',
      lawyer: 'أحمد السالم',
      attendees: ['أحمد السالم', 'عمر العنزي', 'فريق القضية'],
      status: 'upcoming',
      priority: 'high',
      agenda: ['مراجعة استراتيجية المرافعة', 'تدريب الشهود', 'مراجعة المستندات'],
      notes: 'تحضير نهائي قبل الجلسة الحاسمة',
      daysUntil: 4
    },
    {
      id: 10,
      title: 'جلسة محكمة - دعوى تجارية',
      type: 'court',
      subType: 'commercial_court',
      date: '2025-12-03',
      time: '10:00 ص',
      duration: '2 ساعة',
      location: 'المحكمة التجارية - الرياض',
      locationAddress: 'طريق الملك فهد، الرياض',
      courtRoom: 'القاعة 2',
      caseNumber: 'CASE-2025-018',
      client: 'المجموعة التجارية الكبرى',
      lawyer: 'خالد المري',
      judge: 'القاضي ناصر السعيد',
      sessionType: 'جلسة نظر',
      attendees: ['خالد المري', 'ممثل الشركة'],
      status: 'upcoming',
      priority: 'medium',
      notes: 'جلسة أولى - تقديم المستندات',
      daysUntil: 16
    },
    {
      id: 11,
      title: 'اجتماع مع مستشفى النور الطبي',
      type: 'meeting',
      subType: 'client_meeting',
      date: '2025-11-27',
      time: '10:00 ص',
      duration: '1 ساعة',
      location: 'مستشفى النور الطبي',
      locationAddress: 'حي النخيل، الرياض',
      caseNumber: 'CASE-2025-015',
      client: 'مستشفى النور الطبي',
      lawyer: 'فاطمة الغامدي',
      attendees: ['فاطمة الغامدي', 'المدير العام', 'المدير القانوني'],
      status: 'upcoming',
      priority: 'medium',
      agenda: ['مراجعة العقود الطبية', 'مناقشة الامتثال القانوني'],
      notes: 'اجتماع دوري ربع سنوي',
      daysUntil: 10
    },
    {
      id: 12,
      title: 'جلسة محكمة استئناف',
      type: 'court',
      subType: 'appeal_court',
      date: '2025-12-10',
      time: '11:00 ص',
      duration: '2.5 ساعة',
      location: 'محكمة الاستئناف - الرياض',
      locationAddress: 'طريق الملك عبدالله، الرياض',
      courtRoom: 'القاعة الاستئنافية 1',
      caseNumber: 'CASE-2025-003',
      client: 'شركة التصنيع السعودية',
      lawyer: 'أحمد السالم',
      judge: 'هيئة القضاة',
      sessionType: 'جلسة استئناف',
      attendees: ['أحمد السالم', 'ممثل الشركة', 'الخبير القانوني'],
      status: 'upcoming',
      priority: 'high',
      notes: 'الطعن على حكم الدرجة الأولى',
      daysUntil: 23
    },
    {
      id: 13,
      title: 'جلسة مكتب العمل - نزاع رواتب',
      type: 'labor_office',
      subType: 'salary_dispute',
      date: '2025-11-15',
      time: '9:00 ص',
      duration: '1 ساعة',
      location: 'مكتب العمل - الرياض',
      locationAddress: 'شارع العليا، الرياض',
      officeNumber: 'المكتب 8',
      caseNumber: 'CASE-2025-007',
      client: 'علي الزهراني',
      lawyer: 'محمد العتيبي',
      official: 'مسؤول الشكاوى خالد الشهري',
      sessionType: 'جلسة نظر شكوى',
      attendees: ['محمد العتيبي', 'علي الزهراني'],
      status: 'completed',
      priority: 'medium',
      outcome: 'تم التوصل إلى تسوية',
      notes: 'تمت التسوية بنجاح',
      daysUntil: -2
    },
    {
      id: 14,
      title: 'اجتماع تفاوض - تسوية ودية',
      type: 'meeting',
      subType: 'negotiation',
      date: '2025-11-16',
      time: '1:00 م',
      duration: '2 ساعة',
      location: 'مكتب محايد',
      locationAddress: 'مركز التحكيم، الرياض',
      caseNumber: 'CASE-2025-011',
      client: 'نورة القحطاني',
      lawyer: 'فاطمة الغامدي',
      attendees: ['فاطمة الغامدي', 'نورة القحطاني', 'محامي الطرف الآخر', 'وسيط'],
      status: 'completed',
      priority: 'high',
      outcome: 'تم التوصل إلى اتفاق مبدئي',
      notes: 'جلسة تفاوض ناجحة',
      daysUntil: -1
    },
    {
      id: 15,
      title: 'اجتماع استشاري - توثيق عقود',
      type: 'meeting',
      subType: 'consultation',
      date: '2025-11-14',
      time: '10:00 ص',
      duration: '1 ساعة',
      location: 'مكتب المحاماة',
      locationAddress: 'برج المملكة، الرياض',
      caseNumber: 'CASE-2025-019',
      client: 'مؤسسة البناء المتقدم',
      lawyer: 'خالد المري',
      attendees: ['خالد المري', 'مدير المؤسسة'],
      status: 'completed',
      priority: 'low',
      outcome: 'تم توقيع العقد',
      notes: 'اجتماع ناجح',
      daysUntil: -3
    }
  ]

  const getTypeInfo = (type, subType) => {
    if (type === 'court') {
      return {
        label: 'جلسة محكمة',
        icon: <Scale className="h-4 w-4" />,
        color: 'bg-purple-100 text-purple-700 border-purple-200',
        bgColor: 'bg-purple-50'
      }
    } else if (type === 'labor_office') {
      return {
        label: 'مكتب العمل',
        icon: <Building2 className="h-4 w-4" />,
        color: 'bg-orange-100 text-orange-700 border-orange-200',
        bgColor: 'bg-orange-50'
      }
    } else {
      return {
        label: 'اجتماع',
        icon: <Users className="h-4 w-4" />,
        color: 'bg-blue-100 text-blue-700 border-blue-200',
        bgColor: 'bg-blue-50'
      }
    }
  }

  const getPriorityBadge = (priority) => {
    switch(priority) {
      case 'urgent':
        return { label: 'عاجل', color: 'bg-red-500 text-white' }
      case 'high':
        return { label: 'عالي', color: 'bg-orange-500 text-white' }
      case 'medium':
        return { label: 'متوسط', color: 'bg-yellow-500 text-white' }
      case 'low':
        return { label: 'منخفض', color: 'bg-green-500 text-white' }
      default:
        return { label: 'عادي', color: 'bg-slate-500 text-white' }
    }
  }

  const getStatusBadge = (status) => {
    switch(status) {
      case 'upcoming':
        return { label: 'قادم', color: 'bg-blue-100 text-blue-700 border-blue-200' }
      case 'completed':
        return { label: 'مكتمل', color: 'bg-green-100 text-green-700 border-green-200' }
      case 'cancelled':
        return { label: 'ملغي', color: 'bg-red-100 text-red-700 border-red-200' }
      default:
        return { label: 'غير محدد', color: 'bg-slate-100 text-slate-700 border-slate-200' }
    }
  }

  const filteredEvents = events.filter(event => {
    const matchesFilter = selectedFilter === 'all' || event.status === selectedFilter
    const matchesType = selectedType === 'all' || event.type === selectedType
    const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.client?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.location.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesFilter && matchesType && matchesSearch
  })

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      {/* Top Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">الأحداث والجلسات</h1>
            <p className="text-sm text-slate-600">إدارة جلسات المحاكم والاجتماعات القانونية</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2">
              <Download className="h-4 w-4" />
              تصدير
            </button>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-2">
              <Plus className="h-4 w-4" />
              إضافة حدث
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-6 gap-4 mb-6">
          <div className="bg-gradient-to-br from-slate-50 to-white border border-slate-200 rounded-lg p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-slate-700" />
              </div>
            </div>
            <div className="text-3xl font-bold text-slate-900 mb-1">{summary.totalEvents}</div>
            <div className="text-xs text-slate-600">إجمالي الأحداث</div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-white border border-purple-200 rounded-lg p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <Scale className="h-5 w-5 text-purple-600" />
              </div>
            </div>
            <div className="text-3xl font-bold text-slate-900 mb-1">{summary.courtHearings}</div>
            <div className="text-xs text-slate-600">جلسات محكمة</div>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-white border border-orange-200 rounded-lg p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="h-10 w-10 rounded-lg bg-orange-100 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-orange-600" />
              </div>
            </div>
            <div className="text-3xl font-bold text-slate-900 mb-1">{summary.laborOffice}</div>
            <div className="text-xs text-slate-600">مكتب العمل</div>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-white border border-blue-200 rounded-lg p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
            </div>
            <div className="text-3xl font-bold text-slate-900 mb-1">{summary.meetings}</div>
            <div className="text-xs text-slate-600">اجتماعات</div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-white border border-green-200 rounded-lg p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                <Clock className="h-5 w-5 text-green-600" />
              </div>
            </div>
            <div className="text-3xl font-bold text-slate-900 mb-1">{summary.upcoming}</div>
            <div className="text-xs text-slate-600">قادمة</div>
          </div>

          <div className="bg-gradient-to-br from-teal-50 to-white border border-teal-200 rounded-lg p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="h-10 w-10 rounded-lg bg-teal-100 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-teal-600" />
              </div>
            </div>
            <div className="text-3xl font-bold text-slate-900 mb-1">{summary.completed}</div>
            <div className="text-xs text-slate-600">مكتملة</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white border border-slate-200 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="بحث في الأحداث..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10 pl-4 py-2 border border-slate-200 rounded-lg text-sm w-full"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedFilter('all')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedFilter === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  الكل
                </button>
                <button
                  onClick={() => setSelectedFilter('upcoming')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedFilter === 'upcoming'
                      ? 'bg-blue-600 text-white'
                      : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                  }`}
                >
                  قادمة
                </button>
                <button
                  onClick={() => setSelectedFilter('completed')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedFilter === 'completed'
                      ? 'bg-green-600 text-white'
                      : 'bg-green-50 text-green-700 hover:bg-green-100'
                  }`}
                >
                  مكتملة
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedType('all')}
                className={`px-3 py-2 rounded-lg text-sm font-medium ${
                  selectedType === 'all' ? 'bg-slate-200' : 'bg-slate-100 hover:bg-slate-200'
                }`}
              >
                الكل
              </button>
              <button
                onClick={() => setSelectedType('court')}
                className={`px-3 py-2 rounded-lg text-sm font-medium ${
                  selectedType === 'court' ? 'bg-purple-200 text-purple-900' : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
                }`}
              >
                محاكم
              </button>
              <button
                onClick={() => setSelectedType('labor_office')}
                className={`px-3 py-2 rounded-lg text-sm font-medium ${
                  selectedType === 'labor_office' ? 'bg-orange-200 text-orange-900' : 'bg-orange-50 text-orange-700 hover:bg-orange-100'
                }`}
              >
                مكتب العمل
              </button>
              <button
                onClick={() => setSelectedType('meeting')}
                className={`px-3 py-2 rounded-lg text-sm font-medium ${
                  selectedType === 'meeting' ? 'bg-blue-200 text-blue-900' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                }`}
              >
                اجتماعات
              </button>
            </div>
          </div>
        </div>

        {/* Events Grid */}
        <div className="grid grid-cols-1 gap-4">
          {filteredEvents.map((event) => {
            const typeInfo = getTypeInfo(event.type, event.subType)
            const priority = getPriorityBadge(event.priority)
            const status = getStatusBadge(event.status)
            
            return (
              <div
                key={event.id}
                className={`bg-white border-r-4 rounded-lg p-5 hover:shadow-md transition-all cursor-pointer ${
                  event.type === 'court' ? 'border-r-purple-500' :
                  event.type === 'labor_office' ? 'border-r-orange-500' :
                  'border-r-blue-500'
                }`}
                onClick={() => setSelectedEvent(event)}
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className={`h-12 w-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    event.type === 'court' ? 'bg-purple-100' :
                    event.type === 'labor_office' ? 'bg-orange-100' :
                    'bg-blue-100'
                  }`}>
                    <div className={
                      event.type === 'court' ? 'text-purple-600' :
                      event.type === 'labor_office' ? 'text-orange-600' :
                      'text-blue-600'
                    }>
                      {typeInfo.icon}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-bold text-slate-900 mb-1">{event.title}</h3>
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${typeInfo.color}`}>
                            {typeInfo.icon}
                            {typeInfo.label}
                          </span>
                          {event.sessionType && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                              {event.sessionType}
                            </span>
                          )}
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${priority.color}`}>
                            {priority.label}
                          </span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${status.color}`}>
                            {status.label}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Details */}
                    <div className="grid grid-cols-2 gap-3 text-sm text-slate-600 mb-3">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 flex-shrink-0" />
                        <span>{new Date(event.date).toLocaleDateString('ar-SA')}</span>
                        <span className="font-semibold">{event.time}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 flex-shrink-0" />
                        <span>{event.duration}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">{event.location}</span>
                      </div>
                      {event.client && (
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 flex-shrink-0" />
                          <span className="truncate">{event.client}</span>
                        </div>
                      )}
                      {event.caseNumber && (
                        <div className="flex items-center gap-2">
                          <Briefcase className="h-4 w-4 flex-shrink-0" />
                          <span className="font-mono text-xs">{event.caseNumber}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">{event.attendees?.length || 0} مشارك</span>
                      </div>
                    </div>

                    {/* Days Until */}
                    {event.status === 'upcoming' && (
                      <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${
                        event.daysUntil <= 1 ? 'bg-red-100 text-red-700' :
                        event.daysUntil <= 3 ? 'bg-yellow-100 text-yellow-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        <Clock className="h-3 w-3" />
                        {event.daysUntil === 0 ? 'اليوم' :
                         event.daysUntil === 1 ? 'غداً' :
                         `بعد ${event.daysUntil} أيام`}
                      </div>
                    )}

                    {event.outcome && (
                      <div className="mt-2 text-xs text-green-700 bg-green-50 px-3 py-1 rounded-lg inline-block">
                        <CheckCircle className="h-3 w-3 inline ml-1" />
                        {event.outcome}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-1 flex-shrink-0">
                    <button className="p-2 hover:bg-blue-50 rounded-lg text-blue-600">
                      <Eye className="h-4 w-4" />
                    </button>
                    <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-600">
                      <Edit className="h-4 w-4" />
                    </button>
                    <button className="p-2 hover:bg-red-50 rounded-lg text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Results Info */}
        <div className="mt-6 flex items-center justify-between text-sm text-slate-600">
          <div>
            عرض {filteredEvents.length} من {events.length} حدث
          </div>
        </div>
      </div>

      {/* Event Detail Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedEvent(null)}>
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-slate-900">{selectedEvent.title}</h2>
                <button onClick={() => setSelectedEvent(null)} className="p-2 hover:bg-slate-100 rounded-lg">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-slate-600 mb-1">التاريخ والوقت</div>
                    <div className="text-base font-semibold text-slate-900">
                      {new Date(selectedEvent.date).toLocaleDateString('ar-SA')} - {selectedEvent.time}
                    </div>
                    <div className="text-sm text-slate-600">{selectedEvent.duration}</div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-600 mb-1">الموقع</div>
                    <div className="text-base font-semibold text-slate-900">{selectedEvent.location}</div>
                    {selectedEvent.locationAddress && (
                      <div className="text-sm text-slate-600">{selectedEvent.locationAddress}</div>
                    )}
                  </div>
                </div>

                {selectedEvent.client && (
                  <div>
                    <div className="text-sm text-slate-600 mb-1">العميل</div>
                    <div className="text-base font-semibold text-slate-900">{selectedEvent.client}</div>
                  </div>
                )}

                {selectedEvent.caseNumber && (
                  <div>
                    <div className="text-sm text-slate-600 mb-1">رقم القضية</div>
                    <div className="text-base font-mono font-semibold text-blue-600">{selectedEvent.caseNumber}</div>
                  </div>
                )}

                {selectedEvent.attendees && (
                  <div>
                    <div className="text-sm text-slate-600 mb-2">الحضور</div>
                    <div className="flex flex-wrap gap-2">
                      {selectedEvent.attendees.map((attendee, idx) => (
                        <span key={idx} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
                          {attendee}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {selectedEvent.agenda && (
                  <div>
                    <div className="text-sm text-slate-600 mb-2">جدول الأعمال</div>
                    <ul className="space-y-1">
                      {selectedEvent.agenda.map((item, idx) => (
                        <li key={idx} className="text-sm text-slate-700 flex items-start gap-2">
                          <span className="text-blue-600">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedEvent.notes && (
                  <div>
                    <div className="text-sm text-slate-600 mb-1">ملاحظات</div>
                    <div className="text-sm text-slate-700 bg-yellow-50 p-3 rounded-lg">{selectedEvent.notes}</div>
                  </div>
                )}

                <div className="flex gap-3 pt-4 border-t">
                  <button className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700">
                    تعديل
                  </button>
                  <button className="flex-1 px-4 py-2 border border-slate-300 rounded-lg font-medium text-slate-700 hover:bg-slate-50">
                    إلغاء
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
