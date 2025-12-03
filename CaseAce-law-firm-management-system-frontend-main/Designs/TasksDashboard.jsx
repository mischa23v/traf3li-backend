import { useState } from 'react'
import { CheckSquare, Clock, AlertCircle, User, Calendar, Filter, Search, Plus, Download, ChevronDown, MoreVertical, Edit, Trash2, Eye, Flag, Briefcase, FileText } from 'lucide-react'

export default function TasksDashboard() {
  const [selectedFilter, setSelectedFilter] = useState('all')
  const [selectedPriority, setSelectedPriority] = useState('all')
  const [selectedAssignee, setSelectedAssignee] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')

  // Summary stats
  const summary = {
    totalTasks: 18,
    pending: 7,
    inProgress: 6,
    completed: 5,
    overdue: 2
  }

  // Tasks data from the image
  const tasks = [
    {
      id: 'CASE-1001',
      title: 'تحضير استراتيجية الدفاع في قضية نزاع الأراضي التجاري',
      client: 'تحضير استراتيجية',
      status: 'pending',
      priority: 'high',
      dueDate: '2024-11-25',
      assignee: 'أحمد السالم',
      caseNumber: 'CASE-1001',
      progress: 0,
      type: 'legal_prep'
    },
    {
      id: 'CASE-1002',
      title: 'مراجعة وتحليل مستندات العقد لشركة لمعرفة',
      client: 'مراجعة مستندات',
      status: 'pending',
      priority: 'high',
      dueDate: '2024-11-26',
      assignee: 'فاطمة الغامدي',
      caseNumber: 'CASE-1002',
      progress: 0,
      type: 'document_review'
    },
    {
      id: 'CASE-1003',
      title: 'استشارة العميل - تحضير لجلسات المحاكمة القادمة فيو',
      client: 'استشارة عميل',
      status: 'in_progress',
      priority: 'medium',
      dueDate: '2024-11-28',
      assignee: 'خالد المري',
      caseNumber: 'CASE-1003',
      progress: 45,
      type: 'consultation'
    },
    {
      id: 'CASE-1004',
      title: 'تقييم ممتلكات - قضية #4521/2024 - قضية دعوى محكمة العدل',
      client: 'تقييم ممتلكات',
      status: 'pending',
      priority: 'high',
      dueDate: '2024-11-22',
      assignee: 'سارة الدوسري',
      caseNumber: 'CASE-1004',
      progress: 0,
      type: 'assessment',
      overdue: true
    },
    {
      id: 'CASE-1005',
      title: 'بحث قانوني عن سوابق قضائية متشابهة للقضية',
      client: 'بحث قانوني',
      status: 'in_progress',
      priority: 'medium',
      dueDate: '2024-11-30',
      assignee: 'محمد العتيبي',
      caseNumber: 'CASE-1005',
      progress: 60,
      type: 'research'
    },
    {
      id: 'CASE-1006',
      title: 'مراجعة دقيقة لعقود شركة الشركة في قضية التجارية',
      client: 'مراجعة مستندات',
      status: 'completed',
      priority: 'medium',
      dueDate: '2024-11-20',
      assignee: 'فاطمة الغامدي',
      caseNumber: 'CASE-1006',
      progress: 100,
      type: 'document_review'
    },
    {
      id: 'CASE-1007',
      title: 'تحضير شهادات الشهود لتقديم الدخول',
      client: 'تحضير استراتيجية',
      status: 'in_progress',
      priority: 'medium',
      dueDate: '2024-12-01',
      assignee: 'أحمد السالم',
      caseNumber: 'CASE-1007',
      progress: 30,
      type: 'legal_prep'
    },
    {
      id: 'CASE-1008',
      title: 'اجتماع مع عميل لمناقشة مع تفاصيل دعوى العرض الشرعية',
      client: 'استشارة عميل',
      status: 'completed',
      priority: 'low',
      dueDate: '2024-11-18',
      assignee: 'خالد المري',
      caseNumber: 'CASE-1008',
      progress: 100,
      type: 'consultation'
    },
    {
      id: 'CASE-1009',
      title: 'بحث قانوني عن تشريعات العمل الصدري 2024',
      client: 'بحث قانوني',
      status: 'pending',
      priority: 'high',
      dueDate: '2024-11-27',
      assignee: 'محمد العتيبي',
      caseNumber: 'CASE-1009',
      progress: 0,
      type: 'research'
    },
    {
      id: 'CASE-1010',
      title: 'تقييم ممتلكات - قضيم للمحكمة موكيل - في انتظار مستندات العميل',
      client: 'تقييم ممتلكات',
      status: 'in_progress',
      priority: 'medium',
      dueDate: '2024-12-05',
      assignee: 'سارة الدوسري',
      caseNumber: 'CASE-1010',
      progress: 20,
      type: 'assessment',
      overdue: true
    },
    {
      id: 'CASE-1011',
      title: 'إعداد مذكرة دفاع في القضية التجارية',
      client: 'مشاري الرابح',
      status: 'in_progress',
      priority: 'high',
      dueDate: '2024-11-24',
      assignee: 'أحمد السالم',
      caseNumber: 'CASE-2025-001',
      progress: 70,
      type: 'legal_prep'
    },
    {
      id: 'CASE-1012',
      title: 'مراجعة العقد وإبداء الملاحظات القانونية',
      client: 'سارة المطيري',
      status: 'pending',
      priority: 'medium',
      dueDate: '2024-11-29',
      assignee: 'فاطمة الغامدي',
      caseNumber: 'CASE-2025-005',
      progress: 0,
      type: 'document_review'
    },
    {
      id: 'CASE-1013',
      title: 'صياغة عقد المقاولة والمراجعة النهائية',
      client: 'شركة البناء الحديثة',
      status: 'completed',
      priority: 'high',
      dueDate: '2024-11-21',
      assignee: 'فاطمة الغامدي',
      caseNumber: 'CASE-2025-012',
      progress: 100,
      type: 'document_review'
    },
    {
      id: 'CASE-1014',
      title: 'البحث القانوني في سوابق قضائية مشابهة',
      client: 'عمر العنزي',
      status: 'in_progress',
      priority: 'medium',
      dueDate: '2024-11-26',
      assignee: 'محمد العتيبي',
      caseNumber: 'CASE-2025-008',
      progress: 55,
      type: 'research'
    },
    {
      id: 'CASE-1015',
      title: 'إعداد صحيفة الدعوى وتقديمها للمحكمة',
      client: 'سارة المطيري',
      status: 'pending',
      priority: 'high',
      dueDate: '2024-11-25',
      assignee: 'فاطمة الغامدي',
      caseNumber: 'CASE-2025-005',
      progress: 0,
      type: 'legal_prep'
    },
    {
      id: 'CASE-1016',
      title: 'تحضير مستندات القضية ورفعها إلكترونياً',
      client: 'المجموعة التجارية الكبرى',
      status: 'in_progress',
      priority: 'high',
      dueDate: '2024-11-23',
      assignee: 'خالد المري',
      caseNumber: 'CASE-2025-018',
      progress: 80,
      type: 'document_review'
    },
    {
      id: 'CASE-1017',
      title: 'متابعة مع العميل بخصوص المستندات الناقصة',
      client: 'مشاري الرابح',
      status: 'completed',
      priority: 'low',
      dueDate: '2024-11-19',
      assignee: 'أحمد السالم',
      caseNumber: 'CASE-2025-001',
      progress: 100,
      type: 'consultation'
    },
    {
      id: 'CASE-1018',
      title: 'مراجعة نهائية للمستندات قبل الجلسة',
      client: 'عمر العنزي',
      status: 'pending',
      priority: 'high',
      dueDate: '2024-11-21',
      assignee: 'أحمد السالم',
      caseNumber: 'CASE-2025-008',
      progress: 0,
      type: 'legal_prep'
    }
  ]

  const getStatusBadge = (status) => {
    switch(status) {
      case 'pending':
        return { label: 'قيد الانتظار', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' }
      case 'in_progress':
        return { label: 'قيد التنفيذ', color: 'bg-blue-100 text-blue-700 border-blue-200' }
      case 'completed':
        return { label: 'مكتملة', color: 'bg-green-100 text-green-700 border-green-200' }
      default:
        return { label: 'غير محدد', color: 'bg-slate-100 text-slate-700 border-slate-200' }
    }
  }

  const getPriorityBadge = (priority) => {
    switch(priority) {
      case 'high':
        return { label: 'عاجل', color: 'bg-red-100 text-red-700 border-red-200', icon: <Flag className="h-3 w-3" /> }
      case 'medium':
        return { label: 'متوسط', color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: <Flag className="h-3 w-3" /> }
      case 'low':
        return { label: 'منخفض', color: 'bg-green-100 text-green-700 border-green-200', icon: <Flag className="h-3 w-3" /> }
      default:
        return { label: 'عادي', color: 'bg-slate-100 text-slate-700 border-slate-200', icon: <Flag className="h-3 w-3" /> }
    }
  }

  const getTypeIcon = (type) => {
    switch(type) {
      case 'legal_prep':
        return <Briefcase className="h-4 w-4" />
      case 'document_review':
        return <FileText className="h-4 w-4" />
      case 'consultation':
        return <User className="h-4 w-4" />
      case 'research':
        return <Search className="h-4 w-4" />
      case 'assessment':
        return <CheckSquare className="h-4 w-4" />
      default:
        return <CheckSquare className="h-4 w-4" />
    }
  }

  const getDaysUntilDue = (dueDate) => {
    const today = new Date()
    const due = new Date(dueDate)
    const diffTime = due - today
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const filteredTasks = tasks.filter(task => {
    const matchesStatus = selectedFilter === 'all' || task.status === selectedFilter
    const matchesPriority = selectedPriority === 'all' || task.priority === selectedPriority
    const matchesAssignee = selectedAssignee === 'all' || task.assignee === selectedAssignee
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.caseNumber.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesStatus && matchesPriority && matchesAssignee && matchesSearch
  })

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      {/* Top Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">المهام القانونية</h1>
            <p className="text-sm text-slate-600">إدارة ومتابعة المهام القانونية للقضايا</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2">
              <Download className="h-4 w-4" />
              تصدير
            </button>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-2">
              <Plus className="h-4 w-4" />
              إنشاء مهمة
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
                <CheckSquare className="h-5 w-5 text-slate-700" />
              </div>
            </div>
            <div className="text-3xl font-bold text-slate-900 mb-1">{summary.totalTasks}</div>
            <div className="text-xs text-slate-600">إجمالي المهام</div>
          </div>

          <div className="bg-gradient-to-br from-yellow-50 to-white border border-yellow-200 rounded-lg p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="h-10 w-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
            </div>
            <div className="text-3xl font-bold text-slate-900 mb-1">{summary.pending}</div>
            <div className="text-xs text-slate-600">قيد الانتظار</div>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-white border border-blue-200 rounded-lg p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <CheckSquare className="h-5 w-5 text-blue-600" />
              </div>
            </div>
            <div className="text-3xl font-bold text-slate-900 mb-1">{summary.inProgress}</div>
            <div className="text-xs text-slate-600">قيد التنفيذ</div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-white border border-green-200 rounded-lg p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                <CheckSquare className="h-5 w-5 text-green-600" />
              </div>
            </div>
            <div className="text-3xl font-bold text-slate-900 mb-1">{summary.completed}</div>
            <div className="text-xs text-slate-600">مكتملة</div>
          </div>

          <div className="bg-gradient-to-br from-red-50 to-white border border-red-200 rounded-lg p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="h-10 w-10 rounded-lg bg-red-100 flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-red-600" />
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
                  placeholder="بحث في المهام..."
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
                  الكل ({tasks.length})
                </button>
                <button
                  onClick={() => setSelectedFilter('pending')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedFilter === 'pending'
                      ? 'bg-yellow-600 text-white'
                      : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
                  }`}
                >
                  انتظار ({tasks.filter(t => t.status === 'pending').length})
                </button>
                <button
                  onClick={() => setSelectedFilter('in_progress')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedFilter === 'in_progress'
                      ? 'bg-blue-600 text-white'
                      : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                  }`}
                >
                  تنفيذ ({tasks.filter(t => t.status === 'in_progress').length})
                </button>
                <button
                  onClick={() => setSelectedFilter('completed')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedFilter === 'completed'
                      ? 'bg-green-600 text-white'
                      : 'bg-green-50 text-green-700 hover:bg-green-100'
                  }`}
                >
                  مكتملة ({tasks.filter(t => t.status === 'completed').length})
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedPriority}
                onChange={(e) => setSelectedPriority(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
              >
                <option value="all">كل الأولويات</option>
                <option value="high">عاجل</option>
                <option value="medium">متوسط</option>
                <option value="low">منخفض</option>
              </select>

              <select
                value={selectedAssignee}
                onChange={(e) => setSelectedAssignee(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
              >
                <option value="all">كل المكلفين</option>
                <option value="أحمد السالم">أحمد السالم</option>
                <option value="فاطمة الغامدي">فاطمة الغامدي</option>
                <option value="خالد المري">خالد المري</option>
                <option value="محمد العتيبي">محمد العتيبي</option>
                <option value="سارة الدوسري">سارة الدوسري</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tasks Grid */}
        <div className="grid grid-cols-1 gap-4">
          {filteredTasks.map((task) => {
            const status = getStatusBadge(task.status)
            const priority = getPriorityBadge(task.priority)
            const daysUntil = getDaysUntilDue(task.dueDate)
            
            return (
              <div
                key={task.id}
                className={`bg-white border-r-4 border-slate-200 rounded-lg p-5 hover:shadow-md transition-all cursor-pointer ${
                  task.priority === 'high' ? 'border-r-red-500' :
                  task.priority === 'medium' ? 'border-r-yellow-500' :
                  'border-r-green-500'
                } ${task.overdue ? 'bg-red-50' : ''}`}
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className={`h-12 w-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    task.status === 'completed' ? 'bg-green-100' :
                    task.status === 'in_progress' ? 'bg-blue-100' :
                    'bg-yellow-100'
                  }`}>
                    <div className={
                      task.status === 'completed' ? 'text-green-600' :
                      task.status === 'in_progress' ? 'text-blue-600' :
                      'text-yellow-600'
                    }>
                      {getTypeIcon(task.type)}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-bold text-slate-900 mb-1">{task.title}</h3>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${status.color}`}>
                            {status.label}
                          </span>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${priority.color}`}>
                            {priority.icon}
                            {priority.label}
                          </span>
                          {task.overdue && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 border border-red-200">
                              <AlertCircle className="h-3 w-3 ml-1" />
                              متأخر
                            </span>
                          )}
                        </div>
                      </div>
                      <button className="p-2 hover:bg-slate-100 rounded-lg">
                        <MoreVertical className="h-5 w-5 text-slate-600" />
                      </button>
                    </div>

                    {/* Progress Bar */}
                    {task.status === 'in_progress' && (
                      <div className="mb-3">
                        <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
                          <span>التقدم</span>
                          <span className="font-semibold">{task.progress}%</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full transition-all"
                            style={{ width: `${task.progress}%` }}
                          ></div>
                        </div>
                      </div>
                    )}

                    {/* Details */}
                    <div className="flex items-center gap-4 text-sm text-slate-600">
                      <div className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        <span>{task.assignee}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {new Date(task.dueDate).toLocaleDateString('ar-SA')}
                          {daysUntil >= 0 && !task.overdue && (
                            <span className="mr-1 text-xs">
                              (بعد {daysUntil} {daysUntil === 1 ? 'يوم' : 'أيام'})
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Briefcase className="h-4 w-4" />
                        <span className="font-mono text-xs">{task.caseNumber}</span>
                      </div>
                    </div>
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
            عرض {filteredTasks.length} من {tasks.length} مهمة
          </div>
          <div className="flex items-center gap-2">
            <span>الصفحة 1 من 1</span>
          </div>
        </div>
      </div>
    </div>
  )
}
