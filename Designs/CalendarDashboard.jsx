import { useState } from 'react'
import { Calendar, ChevronLeft, ChevronRight, Plus, Filter, Search, Clock, MapPin, Users, FileText, CheckSquare, Briefcase, Bell, MoreVertical, X } from 'lucide-react'

export default function CalendarDashboard() {
  const [currentDate, setCurrentDate] = useState(new Date(2025, 10, 17)) // November 17, 2025
  const [selectedView, setSelectedView] = useState('month') // month, week, day
  const [selectedDate, setSelectedDate] = useState(null)
  const [selectedItem, setSelectedItem] = useState(null)
  const [showSidebar, setShowSidebar] = useState(true)
  const [sidebarTab, setSidebarTab] = useState('timeline') // timeline or notifications

  // System Notifications
  const systemNotifications = [
    {
      id: 1,
      type: 'payment',
      title: 'دفعة مستحقة',
      message: 'دفعة بقيمة 20,000 ر.س من مشاري الرابح مستحقة في 1 ديسمبر',
      time: 'قبل ساعتين',
      read: false,
      priority: 'high',
      caseNumber: 'CASE-2025-001'
    },
    {
      id: 2,
      type: 'court',
      title: 'تذكير بجلسة محكمة',
      message: 'جلسة المحكمة التجارية لشركة البناء الحديثة غداً الساعة 9:00 ص',
      time: 'قبل 3 ساعات',
      read: false,
      priority: 'high',
      caseNumber: 'CASE-2025-012'
    },
    {
      id: 3,
      type: 'task',
      title: 'مهمة متأخرة',
      message: 'مهمة "إعداد مذكرة دفاع" كان من المفترض إنجازها اليوم',
      time: 'قبل 5 ساعات',
      read: false,
      priority: 'medium',
      caseNumber: 'CASE-2025-001'
    },
    {
      id: 4,
      type: 'document',
      title: 'مستندات جديدة',
      message: 'تم رفع مستندات جديدة للقضية CASE-2025-005 من قبل سارة المطيري',
      time: 'أمس',
      read: true,
      priority: 'low',
      caseNumber: 'CASE-2025-005'
    },
    {
      id: 5,
      type: 'payment',
      title: 'تم استلام دفعة',
      message: 'تم استلام دفعة بقيمة 28,000 ر.س من سارة المطيري',
      time: 'أمس',
      read: true,
      priority: 'low',
      caseNumber: 'CASE-2025-005'
    },
    {
      id: 6,
      type: 'meeting',
      title: 'اجتماع قادم',
      message: 'اجتماع مع المجموعة التجارية الكبرى يوم 28 نوفمبر الساعة 2:00 م',
      time: 'منذ يومين',
      read: true,
      priority: 'medium',
      caseNumber: 'CASE-2025-018'
    },
    {
      id: 7,
      type: 'court',
      title: 'تأجيل جلسة',
      message: 'تم تأجيل جلسة المحكمة للقضية CASE-2025-006 إلى 5 ديسمبر',
      time: 'منذ 3 أيام',
      read: true,
      priority: 'medium',
      caseNumber: 'CASE-2025-006'
    },
    {
      id: 8,
      type: 'system',
      title: 'تحديث النظام',
      message: 'تم تحديث نظام إدارة القضايا إلى الإصدار 2.5.1',
      time: 'منذ أسبوع',
      read: true,
      priority: 'low',
      caseNumber: null
    }
  ]

  // Recent cases data (actual data from previous dashboards)
  const recentCases = [
    { id: 1, caseNumber: 'CASE-2025-001', client: 'مشاري الرابح', status: 'active', date: 'اليوم', type: 'قضية عمالية', amount: '52,900 ر.س', active: true },
    { id: 2, caseNumber: 'CASE-2025-012', client: 'شركة البناء الحديثة', status: 'active', date: '15 أكتوبر', type: 'قضية تجارية', amount: '180,000 ر.س', active: false },
    { id: 3, caseNumber: 'CASE-2025-005', client: 'سارة المطيري', status: 'active', date: '10 نوفمبر', type: 'قضية مدنية', amount: '28,000 ر.س', active: false },
    { id: 4, caseNumber: 'CASE-2025-008', client: 'عمر العنزي', status: 'active', date: '5 نوفمبر', type: 'قضية عمالية', amount: '78,000 ر.س', active: false }
  ]

  // Events, Tasks, and Cases data (actual data from previous files)
  const calendarItems = [
    // Events
    {
      id: 1,
      type: 'event',
      title: 'اجتماع مع العميل - مشاري الرابح',
      date: new Date(2025, 10, 17),
      time: '10:00 ص',
      duration: '1 ساعة',
      location: 'مكتب المحاماة - الرياض',
      attendees: ['أحمد السالم', 'فاطمة الغامدي'],
      caseNumber: 'CASE-2025-001',
      color: 'blue',
      status: 'upcoming'
    },
    {
      id: 2,
      type: 'event',
      title: 'استشارة قانونية - عبدالله الشمري',
      date: new Date(2025, 10, 19),
      time: '11:30 ص',
      duration: '45 دقيقة',
      location: 'اجتماع عن بُعد - Zoom',
      attendees: ['خالد المري'],
      color: 'blue',
      status: 'upcoming'
    },
    {
      id: 3,
      type: 'event',
      title: 'اجتماع فريق العمل الأسبوعي',
      date: new Date(2025, 10, 24),
      time: '4:00 م',
      duration: '1 ساعة',
      location: 'قاعة الاجتماعات الرئيسية',
      attendees: ['الجميع'],
      color: 'blue',
      status: 'upcoming'
    },

    // Tasks from Time Entries
    {
      id: 4,
      type: 'task',
      title: 'إعداد مذكرة دفاع في القضية التجارية',
      date: new Date(2025, 10, 17),
      time: '2:00 م',
      priority: 'high',
      assignee: 'أحمد السالم',
      caseNumber: 'CASE-2025-001',
      client: 'مشاري الرابح',
      estimatedHours: 3.5,
      color: 'red',
      status: 'pending'
    },
    {
      id: 5,
      type: 'task',
      title: 'مراجعة العقد وإبداء الملاحظات القانونية',
      date: new Date(2025, 10, 18),
      time: '10:00 ص',
      priority: 'medium',
      assignee: 'فاطمة الغامدي',
      caseNumber: 'CASE-2025-005',
      client: 'سارة المطيري',
      estimatedHours: 2.0,
      color: 'yellow',
      status: 'pending'
    },
    {
      id: 6,
      type: 'task',
      title: 'البحث القانوني في سوابق قضائية مشابهة',
      date: new Date(2025, 10, 20),
      time: '9:00 ص',
      priority: 'medium',
      assignee: 'خالد المري',
      caseNumber: 'CASE-2025-008',
      client: 'عمر العنزي',
      estimatedHours: 5.5,
      color: 'yellow',
      status: 'pending'
    },
    {
      id: 7,
      type: 'task',
      title: 'صياغة عقد المقاولة والمراجعة النهائية',
      date: new Date(2025, 10, 21),
      time: '1:00 م',
      priority: 'high',
      assignee: 'فاطمة الغامدي',
      caseNumber: 'CASE-2025-012',
      client: 'شركة البناء الحديثة',
      estimatedHours: 6.0,
      color: 'red',
      status: 'pending'
    },
    {
      id: 8,
      type: 'task',
      title: 'إعداد صحيفة الدعوى وتقديمها للمحكمة',
      date: new Date(2025, 10, 25),
      time: '10:00 ص',
      priority: 'high',
      assignee: 'فاطمة الغامدي',
      caseNumber: 'CASE-2025-005',
      client: 'سارة المطيري',
      estimatedHours: 4.5,
      color: 'red',
      status: 'pending'
    },

    // Cases (Court Sessions)
    {
      id: 9,
      type: 'case',
      title: 'جلسة المحكمة التجارية - شركة البناء الحديثة',
      date: new Date(2025, 10, 18),
      time: '9:00 ص',
      duration: '2 ساعة',
      court: 'المحكمة التجارية - الرياض',
      caseNumber: 'CASE-2025-012',
      client: 'شركة البناء الحديثة',
      lawyer: 'فاطمة الغامدي',
      sessionType: 'جلسة مرافعة',
      color: 'purple',
      status: 'scheduled'
    },
    {
      id: 10,
      type: 'case',
      title: 'جلسة المرافعة النهائية - عمر العنزي',
      date: new Date(2025, 10, 22),
      time: '10:00 ص',
      duration: '3 ساعة',
      court: 'المحكمة العامة - الرياض',
      caseNumber: 'CASE-2025-008',
      client: 'عمر العنزي',
      lawyer: 'أحمد السالم',
      sessionType: 'مرافعة نهائية',
      color: 'purple',
      status: 'scheduled'
    },
    {
      id: 11,
      type: 'case',
      title: 'جلسة نظر قضية عمالية - مشاري الرابح',
      date: new Date(2025, 10, 26),
      time: '11:00 ص',
      duration: '2 ساعة',
      court: 'المحكمة العمالية - الرياض',
      caseNumber: 'CASE-2025-001',
      client: 'مشاري الرابح',
      lawyer: 'أحمد السالم',
      sessionType: 'جلسة نظر',
      color: 'purple',
      status: 'scheduled'
    },

    // More Events
    {
      id: 12,
      type: 'event',
      title: 'لقاء مع المجموعة التجارية الكبرى',
      date: new Date(2025, 10, 28),
      time: '2:00 م',
      duration: '1.5 ساعة',
      location: 'مقر الشركة',
      attendees: ['أحمد السالم', 'خالد المري'],
      caseNumber: 'CASE-2025-018',
      color: 'blue',
      status: 'upcoming'
    },

    // Additional Tasks
    {
      id: 13,
      type: 'task',
      title: 'تحضير مستندات القضية ورفعها إلكترونياً',
      date: new Date(2025, 10, 23),
      time: '3:00 م',
      priority: 'high',
      assignee: 'خالد المري',
      caseNumber: 'CASE-2025-018',
      client: 'المجموعة التجارية الكبرى',
      estimatedHours: 3.0,
      color: 'red',
      status: 'pending'
    },
    {
      id: 14,
      type: 'task',
      title: 'متابعة مع العميل بخصوص المستندات الناقصة',
      date: new Date(2025, 10, 27),
      time: '11:00 ص',
      priority: 'medium',
      assignee: 'أحمد السالم',
      caseNumber: 'CASE-2025-001',
      client: 'مشاري الرابح',
      estimatedHours: 1.0,
      color: 'yellow',
      status: 'pending'
    }
  ]

  const monthNames = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
  ]

  const dayNames = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']

  const getDaysInMonth = (date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()
    
    const days = []
    
    // Previous month days
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push({ day: '', isCurrentMonth: false })
    }
    
    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ day: i, isCurrentMonth: true, date: new Date(year, month, i) })
    }
    
    // Next month days to complete the grid
    const remainingDays = 42 - days.length
    for (let i = 1; i <= remainingDays; i++) {
      days.push({ day: '', isCurrentMonth: false })
    }
    
    return days
  }

  const getItemsForDate = (date) => {
    if (!date) return []
    return calendarItems.filter(item => 
      item.date.toDateString() === date.toDateString()
    )
  }

  const changeMonth = (direction) => {
    const newDate = new Date(currentDate)
    newDate.setMonth(currentDate.getMonth() + direction)
    setCurrentDate(newDate)
  }

  const isToday = (date) => {
    if (!date) return false
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  const getTypeIcon = (type) => {
    switch(type) {
      case 'event':
        return <Calendar className="h-4 w-4" />
      case 'task':
        return <CheckSquare className="h-4 w-4" />
      case 'case':
        return <Briefcase className="h-4 w-4" />
      default:
        return null
    }
  }

  const getNotificationIcon = (type) => {
    switch(type) {
      case 'payment':
        return <DollarSign className="h-5 w-5" />
      case 'court':
        return <Briefcase className="h-5 w-5" />
      case 'task':
        return <CheckSquare className="h-5 w-5" />
      case 'document':
        return <FileText className="h-5 w-5" />
      case 'meeting':
        return <Users className="h-5 w-5" />
      case 'system':
        return <Bell className="h-5 w-5" />
      default:
        return <Bell className="h-5 w-5" />
    }
  }

  const getTypeLabel = (type) => {
    switch(type) {
      case 'event':
        return 'حدث'
      case 'task':
        return 'مهمة'
      case 'case':
        return 'قضية'
      default:
        return ''
    }
  }

  const getTypeBadgeColor = (type) => {
    switch(type) {
      case 'event':
        return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'task':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200'
      case 'case':
        return 'bg-purple-100 text-purple-700 border-purple-200'
      default:
        return 'bg-slate-100 text-slate-700'
    }
  }

  const days = getDaysInMonth(currentDate)

  return (
    <div className="min-h-screen bg-slate-50 flex" dir="rtl">
      {/* Main Content */}
      <div className="flex-1">
        {/* Top Header */}
        <div className="bg-white border-b border-slate-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">التقويم</h1>
              <p className="text-sm text-slate-600">إدارة الأحداث والمهام والقضايا</p>
            </div>
            <div className="flex items-center gap-3">
              <button className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                <Filter className="h-4 w-4" />
                تصفية
              </button>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-2">
                <Plus className="h-4 w-4" />
                إضافة جديد
              </button>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Calendar Header */}
          <div className="bg-white border border-slate-200 rounded-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <h2 className="text-2xl font-bold text-slate-900">
                  {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                </h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => changeMonth(-1)}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <ChevronRight className="h-5 w-5 text-slate-600" />
                  </button>
                  <button
                    onClick={() => changeMonth(1)}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <ChevronLeft className="h-5 w-5 text-slate-600" />
                  </button>
                </div>
                <button
                  onClick={() => setCurrentDate(new Date())}
                  className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg"
                >
                  اليوم
                </button>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1">
              {/* Day Headers */}
              {dayNames.map(day => (
                <div key={day} className="text-center py-3 text-sm font-semibold text-slate-600 bg-slate-50 rounded-lg">
                  {day}
                </div>
              ))}

              {/* Calendar Days */}
              {days.map((dayObj, idx) => {
                const itemsOnThisDay = dayObj.date ? getItemsForDate(dayObj.date) : []
                const isCurrentDay = dayObj.date && isToday(dayObj.date)
                
                return (
                  <button
                    key={idx}
                    onClick={() => dayObj.date && setSelectedDate(dayObj.date)}
                    className={`min-h-32 p-2 border rounded-lg text-right hover:bg-slate-50 transition-colors ${
                      !dayObj.isCurrentMonth ? 'bg-slate-50 opacity-40' : 'bg-white'
                    } ${
                      selectedDate && dayObj.date && selectedDate.toDateString() === dayObj.date.toDateString()
                        ? 'border-blue-500 border-2 bg-blue-50'
                        : 'border-slate-200'
                    } ${
                      isCurrentDay ? 'ring-2 ring-blue-400' : ''
                    }`}
                    disabled={!dayObj.isCurrentMonth}
                  >
                    {dayObj.day && (
                      <>
                        <div className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-semibold mb-1 ${
                          isCurrentDay 
                            ? 'bg-blue-600 text-white' 
                            : 'text-slate-900'
                        }`}>
                          {dayObj.day}
                        </div>
                        
                        <div className="space-y-1">
                          {itemsOnThisDay.slice(0, 3).map(item => (
                            <div
                              key={item.id}
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedItem(item)
                              }}
                              className={`text-xs px-2 py-1 rounded truncate cursor-pointer ${
                                item.type === 'event' ? 'bg-blue-100 text-blue-800 hover:bg-blue-200' :
                                item.type === 'task' ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200' :
                                'bg-purple-100 text-purple-800 hover:bg-purple-200'
                              }`}
                            >
                              {item.time} {item.title}
                            </div>
                          ))}
                          {itemsOnThisDay.length > 3 && (
                            <div className="text-xs text-slate-500 text-center">
                              +{itemsOnThisDay.length - 3} المزيد
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Upcoming Events Summary */}
          <div className="bg-white border border-slate-200 rounded-lg p-6 mb-6">
            <h4 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Bell className="h-4 w-4 text-blue-600" />
              الأحداث القادمة
            </h4>
            
            {/* Today's Events */}
            {calendarItems.filter(i => {
              const today = new Date()
              return i.date.toDateString() === today.toDateString()
            }).length > 0 && (
              <div className="mb-4">
                <div className="text-xs font-semibold text-slate-600 mb-2">اليوم</div>
                <div className="space-y-2">
                  {calendarItems.filter(i => {
                    const today = new Date()
                    return i.date.toDateString() === today.toDateString()
                  }).map((event, idx) => (
                    <div 
                      key={idx} 
                      onClick={() => setSelectedItem(event)}
                      className={`flex items-center justify-between text-sm p-3 rounded-lg cursor-pointer transition-colors ${
                        event.type === 'event' ? 'bg-blue-50 hover:bg-blue-100' :
                        event.type === 'task' ? 'bg-yellow-50 hover:bg-yellow-100' :
                        'bg-purple-50 hover:bg-purple-100'
                      }`}
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className={`h-2 w-2 rounded-full flex-shrink-0 ${
                          event.type === 'event' ? 'bg-blue-500' :
                          event.type === 'task' ? 'bg-yellow-500' :
                          'bg-purple-500'
                        }`}></div>
                        <span className="text-slate-700 truncate">{event.title}</span>
                      </div>
                      <span className="font-semibold text-slate-900 text-xs ml-2">{event.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Next 3 Upcoming Events */}
            <div>
              <div className="text-xs font-semibold text-slate-600 mb-2">الأسبوع القادم</div>
              <div className="space-y-2">
                {calendarItems
                  .filter(i => {
                    const today = new Date()
                    today.setHours(0, 0, 0, 0)
                    return i.date > today
                  })
                  .sort((a, b) => a.date - b.date)
                  .slice(0, 3)
                  .map((event, idx) => (
                    <div 
                      key={idx} 
                      onClick={() => setSelectedItem(event)}
                      className={`flex items-center justify-between text-sm p-3 rounded-lg cursor-pointer transition-colors ${
                        event.type === 'event' ? 'bg-blue-50 hover:bg-blue-100' :
                        event.type === 'task' ? 'bg-yellow-50 hover:bg-yellow-100' :
                        'bg-purple-50 hover:bg-purple-100'
                      }`}
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className={`h-2 w-2 rounded-full flex-shrink-0 ${
                          event.type === 'event' ? 'bg-blue-500' :
                          event.type === 'task' ? 'bg-yellow-500' :
                          'bg-purple-500'
                        }`}></div>
                        <div className="flex-1 min-w-0">
                          <div className="text-slate-700 truncate">{event.title}</div>
                          <div className="text-xs text-slate-500">
                            {event.date.getDate()} {monthNames[event.date.getMonth()]}
                          </div>
                        </div>
                      </div>
                      <span className="font-semibold text-slate-900 text-xs ml-2">{event.time}</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* Items List for Selected Date */}
          {selectedDate && (
            <div className="bg-white border border-slate-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-900">
                  {dayNames[selectedDate.getDay()]} - {selectedDate.getDate()} {monthNames[selectedDate.getMonth()]} {selectedDate.getFullYear()}
                </h3>
                <button
                  onClick={() => setSelectedDate(null)}
                  className="p-2 hover:bg-slate-100 rounded-lg"
                >
                  <X className="h-5 w-5 text-slate-600" />
                </button>
              </div>
              
              {getItemsForDate(selectedDate).length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <Calendar className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                  <p className="text-sm">لا توجد أحداث أو مهام في هذا اليوم</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {getItemsForDate(selectedDate).map(item => (
                    <div
                      key={item.id}
                      onClick={() => setSelectedItem(item)}
                      className={`p-4 rounded-lg border-2 hover:shadow-md cursor-pointer transition-all ${
                        item.type === 'event' ? 'bg-blue-50 border-blue-200 hover:border-blue-300' :
                        item.type === 'task' ? 'bg-yellow-50 border-yellow-200 hover:border-yellow-300' :
                        'bg-purple-50 border-purple-200 hover:border-purple-300'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2.5 rounded-lg ${
                          item.type === 'event' ? 'bg-blue-100' :
                          item.type === 'task' ? 'bg-yellow-100' :
                          'bg-purple-100'
                        }`}>
                          {getTypeIcon(item.type)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-bold text-slate-900">{item.title}</h4>
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getTypeBadgeColor(item.type)}`}>
                              {getTypeLabel(item.type)}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600 mb-2">
                            <span className="flex items-center gap-1 font-semibold text-slate-900">
                              <Clock className="h-4 w-4" />
                              {item.time}
                            </span>
                            {item.duration && (
                              <span className="text-xs bg-slate-100 px-2 py-0.5 rounded">
                                {item.duration}
                              </span>
                            )}
                            {item.location && (
                              <span className="flex items-center gap-1 text-xs">
                                <MapPin className="h-3 w-3" />
                                {item.location}
                              </span>
                            )}
                            {item.court && (
                              <span className="flex items-center gap-1 text-xs">
                                <MapPin className="h-3 w-3" />
                                {item.court}
                              </span>
                            )}
                          </div>
                          {item.client && (
                            <div className="text-xs text-slate-600">
                              العميل: <span className="font-semibold text-slate-900">{item.client}</span>
                            </div>
                          )}
                          {item.caseNumber && (
                            <div className="text-xs text-slate-600 mt-1">
                              <span className="font-mono text-blue-600 font-semibold">{item.caseNumber}</span>
                            </div>
                          )}
                          {item.priority && (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mt-2 ${
                              item.priority === 'high' ? 'bg-red-100 text-red-700' :
                              'bg-yellow-100 text-yellow-700'
                            }`}>
                              أولوية {item.priority === 'high' ? 'عالية' : 'متوسطة'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Sidebar - Timeline & Notifications with Tabs */}
      {showSidebar && (
        <div className="w-96 bg-white border-r border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-900">
              {sidebarTab === 'timeline' ? 'الخط الزمني' : 'التنبيهات'}
            </h3>
            <button
              onClick={() => setShowSidebar(false)}
              className="p-2 hover:bg-slate-100 rounded-lg"
            >
              <X className="h-5 w-5 text-slate-600" />
            </button>
          </div>

          {/* Tabs */}
          <div className="mb-4 flex gap-2">
            <button
              onClick={() => setSidebarTab('timeline')}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                sidebarTab === 'timeline'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              الخط الزمني
            </button>
            <button
              onClick={() => setSidebarTab('notifications')}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors relative ${
                sidebarTab === 'notifications'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              التنبيهات
              {systemNotifications.filter(n => !n.read).length > 0 && (
                <span className="absolute -top-1 -left-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {systemNotifications.filter(n => !n.read).length}
                </span>
              )}
            </button>
          </div>

          {/* Timeline Tab - Shows items from selected date */}
          {sidebarTab === 'timeline' && (
            <>
              {(() => {
                const displayDate = selectedDate || new Date()
                const itemsForDate = calendarItems.filter(item => 
                  item.date.toDateString() === displayDate.toDateString()
                )
                
                return itemsForDate.length > 0 ? (
                  <>
                    <div className="mb-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="text-sm font-bold text-blue-900">
                        {selectedDate ? (
                          `${dayNames[displayDate.getDay()]} - ${displayDate.getDate()} ${monthNames[displayDate.getMonth()]}`
                        ) : (
                          'اليوم'
                        )}
                      </div>
                      <div className="text-xs text-blue-700 mt-0.5">
                        {itemsForDate.length} {itemsForDate.length === 1 ? 'حدث' : 'أحداث'}
                      </div>
                    </div>
                    <div className="space-y-3 max-h-[calc(100vh-400px)] overflow-y-auto">
                      {itemsForDate
                        .sort((a, b) => {
                          // Sort by time
                          const timeA = parseInt(a.time.split(':')[0])
                          const timeB = parseInt(b.time.split(':')[0])
                          return timeA - timeB
                        })
                        .map((item) => (
                          <div
                            key={item.id}
                            className={`p-4 rounded-lg border cursor-pointer hover:shadow-md transition-all ${
                              item.type === 'event' ? 'bg-blue-50 border-blue-200' :
                              item.type === 'task' ? 'bg-yellow-50 border-yellow-200' :
                              'bg-purple-50 border-purple-200'
                            }`}
                            onClick={() => setSelectedItem(item)}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-3">
                                <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                                  item.type === 'event' ? 'bg-blue-500' :
                                  item.type === 'task' ? 'bg-yellow-500' :
                                  'bg-purple-500'
                                }`}>
                                  {item.type === 'event' && <Calendar className="h-5 w-5 text-white" />}
                                  {item.type === 'task' && <CheckSquare className="h-5 w-5 text-white" />}
                                  {item.type === 'case' && <Briefcase className="h-5 w-5 text-white" />}
                                </div>
                                <div>
                                  <div className="text-xs font-semibold text-slate-900">{item.time}</div>
                                  {item.duration && (
                                    <div className="text-xs text-slate-500">{item.duration}</div>
                                  )}
                                </div>
                              </div>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                item.type === 'event' ? 'bg-blue-100 text-blue-700' :
                                item.type === 'task' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-purple-100 text-purple-700'
                              }`}>
                                {item.type === 'event' ? 'حدث' : item.type === 'task' ? 'مهمة' : 'قضية'}
                              </span>
                            </div>
                            <div className="text-sm font-semibold text-slate-900 mb-2 line-clamp-2">
                              {item.title}
                            </div>
                            <div className="flex items-center justify-between text-xs flex-wrap gap-2">
                              {item.client && <span className="text-slate-600">{item.client}</span>}
                              {item.caseNumber && (
                                <span className="font-mono text-slate-500">{item.caseNumber}</span>
                              )}
                              {item.priority && (
                                <span className={`px-2 py-0.5 rounded-full font-medium ${
                                  item.priority === 'high' ? 'bg-red-100 text-red-700' :
                                  'bg-yellow-100 text-yellow-700'
                                }`}>
                                  {item.priority === 'high' ? 'عاجل' : 'متوسط'}
                                </span>
                              )}
                            </div>
                            {item.location && (
                              <div className="flex items-center gap-1 text-xs text-slate-600 mt-2">
                                <MapPin className="h-3 w-3" />
                                <span>{item.location}</span>
                              </div>
                            )}
                            {item.court && (
                              <div className="flex items-center gap-1 text-xs text-slate-600 mt-2">
                                <MapPin className="h-3 w-3" />
                                <span>{item.court}</span>
                              </div>
                            )}
                          </div>
                        ))}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12 text-slate-500">
                    <Calendar className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                    <p className="text-sm font-semibold mb-1">لا توجد أحداث</p>
                    <p className="text-xs">
                      {selectedDate ? (
                        `في ${dayNames[displayDate.getDay()]} ${displayDate.getDate()} ${monthNames[displayDate.getMonth()]}`
                      ) : (
                        'لهذا اليوم'
                      )}
                    </p>
                  </div>
                )
              })()}
            </>
          )}

          {/* Notifications Tab - Shows notifications for selected date */}
          {sidebarTab === 'notifications' && (
            <>
              {(() => {
                const displayDate = selectedDate || new Date()
                // Filter notifications related to events on the selected date
                const relatedNotifications = systemNotifications.filter(notification => {
                  // Check if notification is related to an item on the selected date
                  if (notification.caseNumber) {
                    return calendarItems.some(item => 
                      item.caseNumber === notification.caseNumber && 
                      item.date.toDateString() === displayDate.toDateString()
                    )
                  }
                  // For today, show all unread notifications
                  if (!selectedDate) {
                    return !notification.read
                  }
                  return false
                })

                return (
                  <>
                    <div className="mb-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="text-sm font-bold text-blue-900">
                        {selectedDate ? (
                          `تنبيهات - ${dayNames[displayDate.getDay()]} ${displayDate.getDate()} ${monthNames[displayDate.getMonth()]}`
                        ) : (
                          'التنبيهات الجديدة'
                        )}
                      </div>
                      <div className="text-xs text-blue-700 mt-0.5">
                        {relatedNotifications.length} {relatedNotifications.length === 1 ? 'تنبيه' : 'تنبيهات'}
                      </div>
                    </div>
                    
                    {relatedNotifications.length > 0 ? (
                      <div className="space-y-3 max-h-[calc(100vh-400px)] overflow-y-auto">
                        {relatedNotifications.map((notification) => (
                          <div
                            key={notification.id}
                            className={`p-4 rounded-lg border cursor-pointer hover:shadow-md transition-all ${
                              !notification.read
                                ? 'bg-blue-50 border-blue-200'
                                : 'bg-slate-50 border-slate-200'
                            }`}
                            onClick={() => {
                              // Mark as read and open related item if applicable
                            }}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                                notification.priority === 'high' ? 'bg-red-100' :
                                notification.priority === 'medium' ? 'bg-yellow-100' :
                                'bg-slate-100'
                              }`}>
                                <div className={
                                  notification.priority === 'high' ? 'text-red-600' :
                                  notification.priority === 'medium' ? 'text-yellow-600' :
                                  'text-slate-600'
                                }>
                                  {getNotificationIcon(notification.type)}
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between mb-1">
                                  <h4 className="text-sm font-bold text-slate-900">
                                    {notification.title}
                                  </h4>
                                  {!notification.read && (
                                    <div className="h-2 w-2 bg-blue-600 rounded-full flex-shrink-0 mt-1"></div>
                                  )}
                                </div>
                                <p className="text-xs text-slate-600 mb-2 line-clamp-2">
                                  {notification.message}
                                </p>
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-slate-500">{notification.time}</span>
                                  {notification.caseNumber && (
                                    <span className="text-xs font-mono text-blue-600 font-semibold">
                                      {notification.caseNumber}
                                    </span>
                                  )}
                                </div>
                                {notification.priority === 'high' && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 mt-2">
                                    عاجل
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 text-slate-500">
                        <Bell className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                        <p className="text-sm font-semibold mb-1">لا توجد تنبيهات</p>
                        <p className="text-xs">
                          {selectedDate ? (
                            `لهذا اليوم`
                          ) : (
                            'جميع التنبيهات مقروءة'
                          )}
                        </p>
                      </div>
                    )}
                  </>
                )
              })()}
            </>
          )}

          {/* Quick Stats */}
          <div className="mt-6 p-4 bg-slate-50 rounded-lg">
            <h4 className="text-sm font-semibold text-slate-900 mb-3">إحصائيات سريعة</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">أحداث هذا الشهر</span>
                <span className="font-bold text-blue-600">{calendarItems.filter(i => i.type === 'event').length}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">مهام معلقة</span>
                <span className="font-bold text-yellow-600">{calendarItems.filter(i => i.type === 'task').length}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">قضايا قادمة</span>
                <span className="font-bold text-purple-600">{calendarItems.filter(i => i.type === 'case').length}</span>
              </div>
              <div className="flex items-center justify-between text-sm pt-2 border-t border-slate-200">
                <span className="text-slate-600">تنبيهات غير مقروءة</span>
                <span className="font-bold text-red-600">{systemNotifications.filter(n => !n.read).length}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Item Detail Modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setSelectedItem(null)}>
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${
                  selectedItem.type === 'event' ? 'bg-blue-100' :
                  selectedItem.type === 'task' ? 'bg-yellow-100' :
                  'bg-purple-100'
                }`}>
                  {getTypeIcon(selectedItem.type)}
                </div>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getTypeBadgeColor(selectedItem.type)}`}>
                  {getTypeLabel(selectedItem.type)}
                </span>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="p-2 hover:bg-slate-100 rounded-lg"
              >
                <X className="h-5 w-5 text-slate-600" />
              </button>
            </div>

            <h2 className="text-2xl font-bold text-slate-900 mb-4">{selectedItem.title}</h2>

            <div className="space-y-4">
              <div className="flex items-center gap-3 text-slate-700">
                <Clock className="h-5 w-5 text-slate-500" />
                <span>{selectedItem.time} {selectedItem.duration && `- ${selectedItem.duration}`}</span>
              </div>

              {selectedItem.location && (
                <div className="flex items-center gap-3 text-slate-700">
                  <MapPin className="h-5 w-5 text-slate-500" />
                  <span>{selectedItem.location}</span>
                </div>
              )}

              {selectedItem.court && (
                <div className="flex items-center gap-3 text-slate-700">
                  <MapPin className="h-5 w-5 text-slate-500" />
                  <span>{selectedItem.court}</span>
                </div>
              )}

              {selectedItem.attendees && (
                <div className="flex items-start gap-3 text-slate-700">
                  <Users className="h-5 w-5 text-slate-500 mt-0.5" />
                  <div>
                    <div className="text-sm text-slate-600 mb-1">الحضور:</div>
                    <div className="flex flex-wrap gap-2">
                      {selectedItem.attendees.map((attendee, idx) => (
                        <span key={idx} className="px-3 py-1 bg-slate-100 rounded-full text-sm">
                          {attendee}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {selectedItem.caseNumber && (
                <div className="flex items-center gap-3 text-slate-700">
                  <FileText className="h-5 w-5 text-slate-500" />
                  <span>رقم القضية: <span className="font-mono font-semibold">{selectedItem.caseNumber}</span></span>
                </div>
              )}

              {selectedItem.client && (
                <div className="flex items-center gap-3 text-slate-700">
                  <Users className="h-5 w-5 text-slate-500" />
                  <span>العميل: <span className="font-semibold">{selectedItem.client}</span></span>
                </div>
              )}

              {selectedItem.lawyer && (
                <div className="flex items-center gap-3 text-slate-700">
                  <Users className="h-5 w-5 text-slate-500" />
                  <span>المحامي: <span className="font-semibold">{selectedItem.lawyer}</span></span>
                </div>
              )}

              {selectedItem.assignee && (
                <div className="flex items-center gap-3 text-slate-700">
                  <Users className="h-5 w-5 text-slate-500" />
                  <span>المكلف: <span className="font-semibold">{selectedItem.assignee}</span></span>
                </div>
              )}

              {selectedItem.estimatedHours && (
                <div className="flex items-center gap-3 text-slate-700">
                  <Clock className="h-5 w-5 text-slate-500" />
                  <span>الوقت المقدر: <span className="font-semibold">{selectedItem.estimatedHours} ساعة</span></span>
                </div>
              )}

              {selectedItem.sessionType && (
                <div className="flex items-center gap-3 text-slate-700">
                  <FileText className="h-5 w-5 text-slate-500" />
                  <span>نوع الجلسة: <span className="font-semibold">{selectedItem.sessionType}</span></span>
                </div>
              )}

              {selectedItem.priority && (
                <div className="flex items-center gap-3">
                  <Bell className="h-5 w-5 text-slate-500" />
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    selectedItem.priority === 'high' ? 'bg-red-100 text-red-700' :
                    selectedItem.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-green-100 text-green-700'
                  }`}>
                    أولوية {selectedItem.priority === 'high' ? 'عالية' : selectedItem.priority === 'medium' ? 'متوسطة' : 'منخفضة'}
                  </span>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700">
                تعديل
              </button>
              <button className="flex-1 px-4 py-2 border border-slate-300 rounded-lg font-medium text-slate-700 hover:bg-slate-50">
                حذف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
