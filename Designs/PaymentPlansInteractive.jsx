import { useState } from 'react'
import { Calendar, DollarSign, Clock, CheckCircle, AlertCircle, Plus, Edit, Trash2, Send, Download, Filter, Search, CreditCard, FileText, User, TrendingUp, Bell, RefreshCw, X } from 'lucide-react'

export default function PaymentPlans() {
  const [selectedFilter, setSelectedFilter] = useState('active')
  const [searchTerm, setSearchTerm] = useState('')
  const [showSchedule, setShowSchedule] = useState(false)

  // Summary stats
  const summary = {
    activePlans: 8,
    totalPlanned: 445000,
    collectedAmount: 198500,
    remainingAmount: 246500,
    upcomingPayments: 5,
    overduePayments: 2,
    completedPlans: 12,
    collectionRate: 44.6
  }

  // Payment plans
  const paymentPlans = [
    {
      id: 'PP-001',
      client: 'مشاري الرابح',
      caseNumber: 'CASE-2025-001',
      totalAmount: 120000,
      paidAmount: 40000,
      remainingAmount: 80000,
      installments: 6,
      paidInstallments: 2,
      monthlyAmount: 20000,
      startDate: '1 سبتمبر 2025',
      endDate: '1 فبراير 2026',
      nextPayment: '1 ديسمبر 2025',
      status: 'active',
      autoInvoice: true,
      interestRate: 0
    },
    {
      id: 'PP-002',
      client: 'شركة البناء الحديثة',
      caseNumber: 'CASE-2025-012',
      totalAmount: 180000,
      paidAmount: 90000,
      remainingAmount: 90000,
      installments: 4,
      paidInstallments: 2,
      monthlyAmount: 45000,
      startDate: '1 أكتوبر 2025',
      endDate: '1 يناير 2026',
      nextPayment: '1 ديسمبر 2025',
      status: 'active',
      autoInvoice: true,
      interestRate: 0
    },
    {
      id: 'PP-003',
      client: 'المجموعة التجارية الكبرى',
      caseNumber: 'CASE-2025-018',
      totalAmount: 85000,
      paidAmount: 25500,
      remainingAmount: 59500,
      installments: 5,
      paidInstallments: 1,
      monthlyAmount: 17000,
      startDate: '15 أكتوبر 2025',
      endDate: '15 فبراير 2026',
      nextPayment: '5 نوفمبر 2025',
      status: 'overdue',
      autoInvoice: true,
      interestRate: 2.5,
      daysOverdue: 12
    },
    {
      id: 'PP-004',
      client: 'مستشفى النور الطبي',
      caseNumber: 'CASE-2025-022',
      totalAmount: 60000,
      paidAmount: 43000,
      remainingAmount: 17000,
      installments: 3,
      paidInstallments: 2,
      monthlyAmount: 20000,
      startDate: '1 سبتمبر 2025',
      endDate: '1 ديسمبر 2025',
      nextPayment: '1 ديسمبر 2025',
      status: 'active',
      autoInvoice: false,
      interestRate: 0
    },
    {
      id: 'PP-006',
      client: 'سارة المطيري',
      caseNumber: 'CASE-2025-005',
      totalAmount: 75000,
      paidAmount: 75000,
      remainingAmount: 0,
      installments: 3,
      paidInstallments: 3,
      monthlyAmount: 25000,
      startDate: '1 أغسطس 2025',
      endDate: '1 أكتوبر 2025',
      nextPayment: '-',
      status: 'completed',
      autoInvoice: true,
      interestRate: 0
    }
  ]

  // Upcoming payments
  const upcomingPayments = [
    { client: 'مشاري الرابح', amount: 20000, dueDate: '1 ديسمبر 2025', daysUntil: 14, planId: 'PP-001' },
    { client: 'شركة البناء الحديثة', amount: 45000, dueDate: '1 ديسمبر 2025', daysUntil: 14, planId: 'PP-002' },
    { client: 'مستشفى النور الطبي', amount: 17000, dueDate: '1 ديسمبر 2025', daysUntil: 14, planId: 'PP-004' },
    { client: 'عبدالله الشمري', amount: 12000, dueDate: '5 ديسمبر 2025', daysUntil: 18, planId: 'PP-007' },
    { client: 'نورة القحطاني', amount: 8500, dueDate: '10 ديسمبر 2025', daysUntil: 23, planId: 'PP-008' }
  ]

  // Installment schedule
  const installmentSchedule = [
    { number: 1, dueDate: '1 سبتمبر 2025', amount: 20000, status: 'paid', paidDate: '28 أغسطس 2025', invoiceId: 'INV-2025-045' },
    { number: 2, dueDate: '1 أكتوبر 2025', amount: 20000, status: 'paid', paidDate: '30 سبتمبر 2025', invoiceId: 'INV-2025-067' },
    { number: 3, dueDate: '1 نوفمبر 2025', amount: 20000, status: 'pending', paidDate: null, invoiceId: 'INV-2025-089' },
    { number: 4, dueDate: '1 ديسمبر 2025', amount: 20000, status: 'scheduled', paidDate: null, invoiceId: null },
    { number: 5, dueDate: '1 يناير 2026', amount: 20000, status: 'scheduled', paidDate: null, invoiceId: null },
    { number: 6, dueDate: '1 فبراير 2026', amount: 20000, status: 'scheduled', paidDate: null, invoiceId: null }
  ]

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const getStatusBadge = (status) => {
    const styles = {
      active: 'bg-blue-50 text-blue-700 border-blue-200',
      overdue: 'bg-red-50 text-red-700 border-red-200',
      completed: 'bg-green-50 text-green-700 border-green-200',
      paused: 'bg-yellow-50 text-yellow-700 border-yellow-200'
    }
    
    const labels = {
      active: 'نشط',
      overdue: 'متأخر',
      completed: 'مكتمل',
      paused: 'متوقف'
    }
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status]}`}>
        {labels[status]}
      </span>
    )
  }

  const getInstallmentStatusBadge = (status) => {
    const styles = {
      paid: 'bg-green-50 text-green-700 border-green-200',
      pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
      scheduled: 'bg-slate-50 text-slate-600 border-slate-200',
      overdue: 'bg-red-50 text-red-700 border-red-200'
    }
    
    const labels = {
      paid: 'مدفوع',
      pending: 'مستحق',
      scheduled: 'مجدول',
      overdue: 'متأخر'
    }
    
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${styles[status]}`}>
        {labels[status]}
      </span>
    )
  }

  const filteredPlans = paymentPlans.filter(plan => {
    const matchesFilter = selectedFilter === 'all' || plan.status === selectedFilter
    const matchesSearch = plan.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         plan.caseNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         plan.id.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesFilter && matchesSearch
  })

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      {/* Top Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">خطط الدفع</h1>
            <p className="text-sm text-slate-600">إدارة جداول الأقساط والدفعات المتكررة</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2">
              <Download className="h-4 w-4" />
              تصدير التقرير
            </button>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-2">
              <Plus className="h-4 w-4" />
              إنشاء خطة دفع
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-br from-blue-50 to-white border border-slate-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-50 text-slate-600 border border-slate-200">نشط</span>
            </div>
            <div className="text-3xl font-bold text-slate-900 mb-1">{summary.activePlans}</div>
            <div className="text-xs text-slate-600">خطة دفع نشطة</div>
          </div>

          <div className="bg-gradient-to-br from-slate-50 to-white border border-slate-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-purple-600" />
              </div>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-50 text-slate-600 border border-slate-200">إجمالي</span>
            </div>
            <div className="text-3xl font-bold text-slate-900 mb-1">{formatCurrency(summary.totalPlanned)}</div>
            <div className="text-xs text-slate-600">قيمة الخطط النشطة</div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-white border border-slate-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">محصل</span>
            </div>
            <div className="text-3xl font-bold text-slate-900 mb-1">{formatCurrency(summary.collectedAmount)}</div>
            <div className="text-xs text-slate-600">تم تحصيله ({summary.collectionRate}%)</div>
          </div>

          <div className="bg-gradient-to-br from-red-50 to-white border border-slate-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="h-10 w-10 rounded-lg bg-red-100 flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">متأخر</span>
            </div>
            <div className="text-3xl font-bold text-slate-900 mb-1">{summary.overduePayments}</div>
            <div className="text-xs text-slate-600">دفعة متأخرة</div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-3 gap-6 mb-6">
          {/* Collection Progress */}
          <div className="bg-white border border-slate-200 rounded-lg p-6">
            <h3 className="text-sm font-bold text-slate-900 mb-4">تقدم التحصيل</h3>
            
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-600">المحصل</span>
                <span className="text-lg font-bold text-green-600">{formatCurrency(summary.collectedAmount)}</span>
              </div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-slate-600">المتبقي</span>
                <span className="text-lg font-bold text-slate-900">{formatCurrency(summary.remainingAmount)}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3">
                <div 
                  className="bg-green-500 h-3 rounded-full"
                  style={{ width: `${summary.collectionRate}%` }}
                ></div>
              </div>
              <div className="text-center text-xs text-slate-600 mt-2">{summary.collectionRate}% من الإجمالي</div>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-blue-600" />
                    <span className="text-xs text-slate-700">دفعات قادمة</span>
                  </div>
                  <span className="text-lg font-bold text-blue-900">{summary.upcomingPayments}</span>
                </div>
              </div>

              <div className="p-3 bg-green-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-xs text-slate-700">خطط مكتملة</span>
                  </div>
                  <span className="text-lg font-bold text-green-900">{summary.completedPlans}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Upcoming Payments */}
          <div className="bg-white border border-slate-200 rounded-lg p-6 col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900">الدفعات القادمة</h3>
              <button className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                <Bell className="h-3 w-3" />
                إرسال تذكير
              </button>
            </div>
            <div className="space-y-3">
              {upcomingPayments.map((payment, idx) => (
                <div key={idx} className="p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <User className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-slate-900">{payment.client}</div>
                        <div className="flex items-center gap-3 text-xs text-slate-600">
                          <span>الاستحقاق: {payment.dueDate}</span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-50 text-slate-600 border border-slate-200">بعد {payment.daysUntil} يوم</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-slate-900">{formatCurrency(payment.amount)}</div>
                      <div className="text-xs text-slate-500">{payment.planId}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white border border-slate-200 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="بحث في الخطط..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10 pl-4 py-2 border border-slate-200 rounded-lg text-sm w-80"
                />
              </div>
              <div className="flex gap-2">
                {['all', 'active', 'overdue', 'completed'].map(filter => (
                  <button
                    key={filter}
                    onClick={() => setSelectedFilter(filter)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                      selectedFilter === filter
                        ? 'bg-blue-600 text-white'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {filter === 'all' && `الكل (${paymentPlans.length})`}
                    {filter === 'active' && `نشط (${paymentPlans.filter(p => p.status === 'active').length})`}
                    {filter === 'overdue' && `متأخر (${paymentPlans.filter(p => p.status === 'overdue').length})`}
                    {filter === 'completed' && `مكتمل (${paymentPlans.filter(p => p.status === 'completed').length})`}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Payment Plans List */}
        <div className="space-y-4">
          {filteredPlans.map((plan) => (
            <div key={plan.id} className="bg-white border border-slate-200 rounded-lg p-6 hover:shadow-md transition-shadow">
              <div className="grid grid-cols-12 gap-6">
                {/* Client Info */}
                <div className="col-span-3">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                      <User className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-900">{plan.client}</div>
                      <div className="text-xs text-slate-600">{plan.caseNumber}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-3 flex-wrap">
                    {getStatusBadge(plan.status)}
                    {plan.autoInvoice && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
                        <RefreshCw className="h-3 w-3 ml-1" />
                        تلقائي
                      </span>
                    )}
                  </div>
                </div>

                {/* Payment Progress */}
                <div className="col-span-4">
                  <div className="mb-2">
                    <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
                      <span>التقدم</span>
                      <span>{plan.paidInstallments} من {plan.installments} أقساط</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${plan.status === 'overdue' ? 'bg-red-500' : 'bg-green-500'}`}
                        style={{ width: `${(plan.paidInstallments / plan.installments) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-3">
                    <div className="text-center p-2 bg-green-50 rounded">
                      <div className="text-xs text-slate-600">مدفوع</div>
                      <div className="text-sm font-bold text-green-700">{formatCurrency(plan.paidAmount)}</div>
                    </div>
                    <div className="text-center p-2 bg-slate-50 rounded">
                      <div className="text-xs text-slate-600">متبقي</div>
                      <div className="text-sm font-bold text-slate-900">{formatCurrency(plan.remainingAmount)}</div>
                    </div>
                    <div className="text-center p-2 bg-blue-50 rounded">
                      <div className="text-xs text-slate-600">القسط</div>
                      <div className="text-sm font-bold text-blue-700">{formatCurrency(plan.monthlyAmount)}</div>
                    </div>
                  </div>
                </div>

                {/* Schedule Info */}
                <div className="col-span-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600">الإجمالي:</span>
                      <span className="font-bold text-slate-900">{formatCurrency(plan.totalAmount)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600">البداية:</span>
                      <span className="text-slate-700">{plan.startDate}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600">النهاية:</span>
                      <span className="text-slate-700">{plan.endDate}</span>
                    </div>
                    {plan.status !== 'completed' && (
                      <div className={`p-2 rounded text-xs ${plan.status === 'overdue' ? 'bg-red-50' : 'bg-blue-50'}`}>
                        <div className="flex items-center justify-between">
                          <span className={plan.status === 'overdue' ? 'text-red-700' : 'text-blue-700'}>
                            الدفعة القادمة:
                          </span>
                          <span className={`font-semibold ${plan.status === 'overdue' ? 'text-red-900' : 'text-blue-900'}`}>
                            {plan.nextPayment}
                          </span>
                        </div>
                        {plan.daysOverdue && (
                          <div className="text-red-600 font-semibold mt-1">متأخر {plan.daysOverdue} يوم</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="col-span-2 flex flex-col gap-2 justify-center">
                  <button 
                    onClick={() => setShowSchedule(!showSchedule)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-2"
                  >
                    <FileText className="h-4 w-4" />
                    عرض الأقساط
                  </button>
                  <button className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-2">
                    <Send className="h-4 w-4" />
                    إرسال تذكير
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Installment Schedule */}
        {showSchedule && (
          <div className="bg-white border border-slate-200 rounded-lg p-6 mt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">جدول الأقساط - مشاري الرابح</h3>
                <p className="text-xs text-slate-600">خطة الدفع PP-001 • 6 أقساط</p>
              </div>
              <button 
                onClick={() => setShowSchedule(false)}
                className="p-2 hover:bg-slate-100 rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600">القسط</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600">تاريخ الاستحقاق</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600">المبلغ</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-slate-600">الحالة</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600">تاريخ الدفع</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600">الفاتورة</th>
                  </tr>
                </thead>
                <tbody>
                  {installmentSchedule.map((installment) => (
                    <tr key={installment.number} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-sm font-bold text-blue-700">{installment.number}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm text-slate-900">{installment.dueDate}</div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm font-bold text-slate-900">{formatCurrency(installment.amount)}</div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        {getInstallmentStatusBadge(installment.status)}
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm text-slate-700">{installment.paidDate || '-'}</div>
                      </td>
                      <td className="px-4 py-4">
                        {installment.invoiceId ? (
                          <div className="text-xs font-mono text-blue-600 hover:underline cursor-pointer">
                            {installment.invoiceId}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
