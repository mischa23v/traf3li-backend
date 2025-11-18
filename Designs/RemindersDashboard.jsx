import { useState } from 'react'
import { Bell, Calendar, DollarSign, Briefcase, Clock, AlertCircle, CheckCircle, Plus, Filter, Search, X, Edit, Trash2, User, FileText, ChevronRight } from 'lucide-react'

export default function RemindersDashboard() {
  const [selectedFilter, setSelectedFilter] = useState('all')
  const [selectedType, setSelectedType] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)

  // Summary stats
  const summary = {
    totalReminders: 24,
    urgent: 5,
    upcoming: 12,
    completed: 7,
    overdue: 3
  }

  // Reminders data
  const reminders = [
    {
      id: 1,
      title: 'جلسة محكمة - شركة البناء الحديثة',
      description: 'جلسة المحكمة التجارية في قضية CASE-2025-012',
      type: 'court',
      dueDate: '2025-11-18',
      dueTime: '9:00 ص',
      priority: 'urgent',
      status: 'active',
      caseNumber: 'CASE-2025-012',
      client: 'شركة البناء الحديثة',
      assignee: 'فاطمة الغامدي',
      daysUntil: 1,
      notifyBefore: '24 ساعة'
    },
    {
      id: 2,
      title: 'دفعة مستحقة من مشاري الرابح',
      description: 'دفعة قسط شهري بقيمة 20,000 ر.س من خطة الدفع',
      type: 'payment',
      dueDate: '2025-12-01',
      dueTime: '12:00 م',
      priority: 'high',
      status: 'active',
      caseNumber: 'CASE-2025-001',
      client: 'مشاري الرابح',
      amount: '20,000 ر.س',
      daysUntil: 14,
      notifyBefore: '3 أيام'
    },
    {
      id: 3,
      title: 'موعد نهائي - إعداد مذكرة الدفاع',
      description: 'يجب إنهاء مذكرة الدفاع وتقديمها للعميل',
      type: 'task',
      dueDate: '2025-11-24',
      dueTime: '5:00 م',
      priority: 'urgent',
      status: 'active',
      caseNumber: 'CASE-2025-001',
      client: 'مشاري الرابح',
      assignee: 'أحمد السالم',
      daysUntil: 7,
      notifyBefore: '2 أيام'
    },
    {
      id: 4,
      title: 'اجتماع مع المجموعة التجارية الكبرى',
      description: 'اجتماع لمناقشة تطورات القضية وتحضير المستندات',
      type: 'meeting',
      dueDate: '2025-11-28',
      dueTime: '2:00 م',
      priority: 'medium',
      status: 'active',
      caseNumber: 'CASE-2025-018',
      client: 'المجموعة التجارية الكبرى',
      assignee: 'أحمد السالم',
      location: 'مقر الشركة',
      daysUntil: 11,
      notifyBefore: '1 يوم'
    },
    {
      id: 5,
      title: 'تجديد رخصة المحاماة',
      description: 'موعد تجديد رخصة المحاماة السنوية',
      type: 'document',
      dueDate: '2025-12-15',
      dueTime: '11:00 ص',
      priority: 'medium',
      status: 'active',
      assignee: 'إدارة المكتب',
      daysUntil: 28,
      notifyBefore: '1 أسبوع'
    },
    {
      id: 6,
      title: 'جلسة المرافعة النهائية - عمر العنزي',
      description: 'جلسة المرافعة النهائية في المحكمة العامة',
      type: 'court',
      dueDate: '2025-11-22',
      dueTime: '10:00 ص',
      priority: 'urgent',
      status: 'active',
      caseNumber: 'CASE-2025-008',
      client: 'عمر العنزي',
      assignee: 'أحمد السالم',
      daysUntil: 5,
      notifyBefore: '48 ساعة'
    },
    {
      id: 7,
      title: 'تسليم صحيفة الدعوى',
      description: 'تسليم صحيفة الدعوى للمحكمة قبل انتهاء المهلة',
      type: 'deadline',
      dueDate: '2025-11-25',
      dueTime: '3:00 م',
      priority: 'urgent',
      status: 'active',
      caseNumber: 'CASE-2025-005',
      client: 'سارة المطيري',
      assignee: 'فاطمة الغامدي',
      daysUntil: 8,
      notifyBefore: '24 ساعة'
    },
    {
      id: 8,
      title: 'متابعة مع العميل - مستندات ناقصة',
      description: 'متابعة مع العميل للحصول على المستندات المطلوبة',
      type: 'followup',
      dueDate: '2025-11-20',
      dueTime: '11:00 ص',
      priority: 'medium',
      status: 'active',
      caseNumber: 'CASE-2025-001',
      client: 'مشاري الرابح',
      assignee: 'أحمد السالم',
      daysUntil: 3,
      notifyBefore: '12 ساعة'
    },
    {
      id: 9,
      title: 'دفعة مستحقة من شركة البناء',
      description: 'دفعة قسط شهري من خطة الدفع - 45,000 ر.س',
      type: 'payment',
      dueDate: '2025-12-01',
      dueTime: '12:00 م',
      priority: 'high',
      status: 'active',
      caseNumber: 'CASE-2025-012',
      client: 'شركة البناء الحديثة',
      amount: '45,000 ر.س',
      daysUntil: 14,
      notifyBefore: '3 أيام'
    },
    {
      id: 10,
      title: 'اجتماع فريق العمل الأسبوعي',
      description: 'اجتماع دوري لمراجعة القضايا والمهام',
      type: 'meeting',
      dueDate: '2025-11-24',
      dueTime: '4:00 م',
      priority: 'low',
      status: 'active',
      assignee: 'الجميع',
      location: 'قاعة الاجتماعات',
      daysUntil: 7,
      notifyBefore: '2 ساعة'
    },
    {
      id: 11,
      title: 'تقديم المستندات للمحكمة',
      description: 'تقديم مستندات القضية CASE-2025-018 إلكترونياً',
      type: 'deadline',
      dueDate: '2025-11-23',
      dueTime: '12:00 م',
      priority: 'high',
      status: 'active',
      caseNumber: 'CASE-2025-018',
      client: 'المجموعة التجارية الكبرى',
      assignee: 'خالد المري',
      daysUntil: 6,
      notifyBefore: '24 ساعة'
    },
    {
      id: 12,
      title: 'استشارة قانونية مع عميل جديد',
      description: 'اجتماع استشاري أولي لمناقشة القضية',
      type: 'meeting',
      dueDate: '2025-11-19',
      dueTime: '11:30 ص',
      priority: 'medium',
      status: 'completed',
      assignee: 'خالد المري',
      location: 'اجتماع عن بُعد',
      daysUntil: 2,
      notifyBefore: '1 ساعة'
    },
    {
      id: 13,
      title: 'دفعة متأخرة - متابعة عاجلة',
      description: 'دفعة متأخرة منذ 12 يوم - يتطلب متابعة فورية',
      type: 'payment',
      dueDate: '2025-11-05',
      dueTime: '12:00 م',
      priority: 'urgent',
      status: 'overdue',
      caseNumber: 'CASE-2025-006',
      client: 'محمد الدوسري',
      amount: '42,000 ر.س',
      daysUntil: -12,
      notifyBefore: 'فوري'
    }
  ]

  const getTypeInfo = (type) => {
    switch(type) {
      case 'court':
        return { 
          label: 'جلسة محكمة', 
          icon: <Briefcase className="h-4 w-4" />,
          color: 'bg-purple-100 text-purple-700 border-purple-200'
        }
      case 'payment':
        return { 
          label: 'دفعة مالية', 
          icon: <DollarSign className="h-4 w-4" />,
          color: 'bg-green-100 text-green-700 border-green-200'
        }
      case 'task':
        return { 
          label: 'مهمة', 
          icon: <CheckCircle className="h-4 w-4" />,
          color: 'bg-blue-100 text-blue-700 border-blue-200'
        }
      case 'meeting':
        return { 
          label: 'اجتماع', 
          icon: <User className="h-4 w-4" />,
          color: 'bg-blue-100 text-blue-700 border-blue-200'
        }
      case 'deadline':
        return { 
          label: 'موعد نهائي', 
          icon: <Clock className="h-4 w-4" />,
          color: 'bg-red-100 text-red-700 border-red-200'
        }
      case 'document':
        return { 
          label: 'مستند', 
          icon: <FileText className="h-4 w-4" />,
          color: 'bg-yellow-100 text-yellow-700 border-yellow-200'
        }
      case 'followup':
        return { 
          label: 'متابعة', 
          icon: <Bell className="h-4 w-4" />,
          color: 'bg-orange-100 text-orange-700 border-orange-200'
        }
      default:
        return { 
          label: 'تذكير', 
          icon: <Bell className="h-4 w-4" />,
          color: 'bg-slate-100 text-slate-700 border-slate-200'
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
      case 'active':
        return { label: 'نشط', color: 'bg-blue-100 text-blue-700 border-blue-200' }
      case 'completed':
        return { label: 'مكتمل', color: 'bg-green-100 text-green-700 border-green-200' }
      case 'overdue':
        return { label: 'متأخر', color: 'bg-red-100 text-red-700 border-red-200' }
      default:
        return { label: 'غير محدد', color: 'bg-slate-100 text-slate-700 border-slate-200' }
    }
  }

  const getDaysLabel = (days) => {
    if (days < 0) {
      return `متأخر ${Math.abs(days)} يوم`
    } else if (days === 0) {
      return 'اليوم'
    } else if (days === 1) {
      return 'غداً'
    } else if (days <= 7) {
      return `بعد ${days} أيام`
    } else {
      return `بعد ${days} يوم`
    }
  }

  const filteredReminders = reminders.filter(reminder => {
    const matchesFilter = selectedFilter === 'all' || 
                         (selectedFilter === 'urgent' && (reminder.priority === 'urgent' || reminder.status === 'overdue')) ||
                         (selectedFilter === 'upcoming' && reminder.daysUntil >= 0 && reminder.daysUntil <= 7 && reminder.status === 'active') ||
                         reminder.status === selectedFilter
    const matchesType = selectedType === 'all' || reminder.type === selectedType
    const matchesSearch = reminder.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         reminder.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         reminder.client?.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesFilter && matchesType && matchesSearch
  })

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      {/* Top Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">التذكيرات والإشعارات</h1>
            <p className="text-sm text-slate-600">إدارة التذكيرات والمواعيد المهمة</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2">
              <Filter className="h-4 w-4" />
              تصفية متقدمة
            </button>
            <button 
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              إنشاء تذكير
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-5 gap-4 mb-6">
          <div className="bg-gradient-to-br from-slate-50 to-white border border-slate-200 rounded-lg p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center">
                <Bell className="h-5 w-5 text-slate-700" />
              </div>
            </div>
            <div className="text-3xl font-bold text-slate-900 mb-1">{summary.totalReminders}</div>
            <div className="text-xs text-slate-600">إجمالي التذكيرات</div>
          </div>

          <div className="bg-gradient-to-br from-red-50 to-white border border-red-200 rounded-lg p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="h-10 w-10 rounded-lg bg-red-100 flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>
            </div>
            <div className="text-3xl font-bold text-slate-900 mb-1">{summary.urgent}</div>
            <div className="text-xs text-slate-600">عاجلة</div>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-white border border-blue-200 rounded-lg p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
            </div>
            <div className="text-3xl font-bold text-slate-900 mb-1">{summary.upcoming}</div>
            <div className="text-xs text-slate-600">قادمة</div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-white border border-green-200 rounded-lg p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
            </div>
            <div className="text-3xl font-bold text-slate-900 mb-1">{summary.completed}</div>
            <div className="text-xs text-slate-600">مكتملة</div>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-white border border-orange-200 rounded-lg p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="h-10 w-10 rounded-lg bg-orange-100 flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-orange-600" />
              </div>
            </div>
            <div className="text-3xl font-bold text-slate-900 mb-1">{summary.overdue}</div>
            <div className="text-xs text-slate-600">متأخرة</div>
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
                  placeholder="بحث في التذكيرات..."
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
                  onClick={() => setSelectedFilter('urgent')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedFilter === 'urgent'
                      ? 'bg-red-600 text-white'
                      : 'bg-red-50 text-red-700 hover:bg-red-100'
                  }`}
                >
                  عاجلة
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

            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
            >
              <option value="all">كل الأنواع</option>
              <option value="court">جلسات محكمة</option>
              <option value="payment">دفعات مالية</option>
              <option value="task">مهام</option>
              <option value="meeting">اجتماعات</option>
              <option value="deadline">مواعيد نهائية</option>
              <option value="document">مستندات</option>
              <option value="followup">متابعات</option>
            </select>
          </div>
        </div>

        {/* Reminders List */}
        <div className="space-y-4">
          {filteredReminders.map((reminder) => {
            const typeInfo = getTypeInfo(reminder.type)
            const priority = getPriorityBadge(reminder.priority)
            const status = getStatusBadge(reminder.status)
            const daysLabel = getDaysLabel(reminder.daysUntil)
            
            return (
              <div
                key={reminder.id}
                className={`bg-white border-r-4 rounded-lg p-5 hover:shadow-md transition-all ${
                  reminder.status === 'overdue' ? 'border-r-red-500 bg-red-50' :
                  reminder.priority === 'urgent' ? 'border-r-red-500' :
                  reminder.priority === 'high' ? 'border-r-orange-500' :
                  reminder.daysUntil <= 1 ? 'border-r-yellow-500' :
                  'border-r-blue-500'
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className={`h-12 w-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    reminder.status === 'overdue' ? 'bg-red-100' :
                    reminder.priority === 'urgent' ? 'bg-red-100' :
                    'bg-blue-100'
                  }`}>
                    <div className={
                      reminder.status === 'overdue' ? 'text-red-600' :
                      reminder.priority === 'urgent' ? 'text-red-600' :
                      'text-blue-600'
                    }>
                      {typeInfo.icon}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-bold text-slate-900 mb-1">{reminder.title}</h3>
                        <p className="text-sm text-slate-600 mb-2">{reminder.description}</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${typeInfo.color}`}>
                            {typeInfo.icon}
                            {typeInfo.label}
                          </span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${priority.color}`}>
                            {priority.label}
                          </span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${status.color}`}>
                            {status.label}
                          </span>
                          {reminder.status === 'overdue' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-500 text-white">
                              <AlertCircle className="h-3 w-3 ml-1" />
                              {daysLabel}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Details */}
                    <div className="flex items-center gap-4 text-sm text-slate-600 flex-wrap">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>{new Date(reminder.dueDate).toLocaleDateString('ar-SA')}</span>
                        <span className="font-semibold mr-1">{reminder.dueTime}</span>
                      </div>
                      {reminder.client && (
                        <div className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          <span>{reminder.client}</span>
                        </div>
                      )}
                      {reminder.caseNumber && (
                        <div className="flex items-center gap-1">
                          <Briefcase className="h-4 w-4" />
                          <span className="font-mono text-xs">{reminder.caseNumber}</span>
                        </div>
                      )}
                      {reminder.assignee && (
                        <div className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          <span className="text-xs">المكلف: {reminder.assignee}</span>
                        </div>
                      )}
                      {reminder.amount && (
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4" />
                          <span className="font-semibold">{reminder.amount}</span>
                        </div>
                      )}
                      {reminder.status === 'active' && reminder.daysUntil >= 0 && (
                        <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${
                          reminder.daysUntil <= 1 ? 'bg-red-100 text-red-700' :
                          reminder.daysUntil <= 3 ? 'bg-yellow-100 text-yellow-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          <Clock className="h-3 w-3" />
                          <span className="text-xs font-semibold">{daysLabel}</span>
                        </div>
                      )}
                    </div>

                    {/* Notification Settings */}
                    <div className="mt-2 text-xs text-slate-500">
                      <Bell className="h-3 w-3 inline ml-1" />
                      إشعار قبل: {reminder.notifyBefore}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-1 flex-shrink-0">
                    {reminder.status === 'active' && (
                      <button className="p-2 hover:bg-green-50 rounded-lg text-green-600">
                        <CheckCircle className="h-4 w-4" />
                      </button>
                    )}
                    <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-600">
                      <Edit className="h-4 w-4" />
                    </button>
                    <button className="p-2 hover:bg-red-50 rounded-lg text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <button className="p-2 hover:bg-blue-50 rounded-lg text-blue-600">
                      <ChevronRight className="h-4 w-4" />
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
            عرض {filteredReminders.length} من {reminders.length} تذكير
          </div>
        </div>
      </div>
    </div>
  )
}
