import { useState } from 'react'
import { TrendingUp, TrendingDown, DollarSign, Users, FileText, Calendar, Download, Filter, BarChart3, PieChart, Activity, Target, Award, AlertCircle, ArrowUpRight, ArrowDownRight, Clock, CheckCircle } from 'lucide-react'

export default function FinancialInsights() {
  const [selectedPeriod, setSelectedPeriod] = useState('6months')
  const [selectedMetric, setSelectedMetric] = useState('revenue')

  // Key Metrics Summary
  const metrics = {
    totalRevenue: 485600,
    revenueGrowth: 23.5,
    totalExpenses: 145800,
    expenseGrowth: -8.2,
    netProfit: 339800,
    profitMargin: 69.9,
    averageInvoice: 45200,
    clientRetention: 87.5,
    collectionRate: 72.5,
    averagePaymentDays: 18
  }

  // Revenue Trend Data (Last 12 months)
  const revenueTrend = [
    { month: 'ديسمبر 2024', revenue: 42000, expenses: 18000, profit: 24000 },
    { month: 'يناير 2025', revenue: 48000, expenses: 19500, profit: 28500 },
    { month: 'فبراير', revenue: 38000, expenses: 17000, profit: 21000 },
    { month: 'مارس', revenue: 52000, expenses: 20000, profit: 32000 },
    { month: 'أبريل', revenue: 45000, expenses: 18500, profit: 26500 },
    { month: 'مايو', revenue: 58000, expenses: 21000, profit: 37000 },
    { month: 'يونيو', revenue: 75000, expenses: 24000, profit: 51000 },
    { month: 'يوليو', revenue: 82000, expenses: 26000, profit: 56000 },
    { month: 'أغسطس', revenue: 68000, expenses: 22000, profit: 46000 },
    { month: 'سبتمبر', revenue: 95000, expenses: 28000, profit: 67000 },
    { month: 'أكتوبر', revenue: 118000, expenses: 30000, profit: 88000 },
    { month: 'نوفمبر', revenue: 125400, expenses: 31000, profit: 94400 }
  ]

  // Practice Area Performance
  const practiceAreas = [
    { 
      name: 'قضايا عمالية', 
      revenue: 185000, 
      percentage: 38,
      cases: 12,
      avgValue: 15417,
      growth: 28.5,
      profit: 128000
    },
    { 
      name: 'قضايا تجارية', 
      revenue: 145000, 
      percentage: 30,
      cases: 8,
      avgValue: 18125,
      growth: 15.2,
      profit: 98000
    },
    { 
      name: 'قضايا مدنية', 
      revenue: 95600, 
      percentage: 20,
      cases: 15,
      avgValue: 6373,
      growth: 32.8,
      profit: 67000
    },
    { 
      name: 'استشارات قانونية', 
      revenue: 60000, 
      percentage: 12,
      cases: 25,
      avgValue: 2400,
      growth: 18.9,
      profit: 46800
    }
  ]

  // Client Profitability Analysis
  const topClients = [
    { 
      name: 'المصنع السعودي للمنتجات',
      revenue: 245000,
      expenses: 58000,
      profit: 187000,
      margin: 76.3,
      cases: 3,
      avgInvoice: 81667,
      paymentSpeed: 12,
      trend: 'up'
    },
    { 
      name: 'شركة البناء الحديثة',
      revenue: 185000,
      expenses: 42000,
      profit: 143000,
      margin: 77.3,
      cases: 2,
      avgInvoice: 92500,
      paymentSpeed: 15,
      trend: 'up'
    },
    { 
      name: 'المجموعة التجارية الكبرى',
      revenue: 142000,
      expenses: 38000,
      profit: 104000,
      margin: 73.2,
      cases: 4,
      avgInvoice: 35500,
      paymentSpeed: 22,
      trend: 'stable'
    },
    { 
      name: 'مستشفى النور الطبي',
      revenue: 98000,
      expenses: 28000,
      profit: 70000,
      margin: 71.4,
      cases: 2,
      avgInvoice: 49000,
      paymentSpeed: 18,
      trend: 'up'
    }
  ]

  // Expense Breakdown
  const expenseCategories = [
    { category: 'رواتب الموظفين', amount: 85000, percentage: 58.3, change: -5.2 },
    { category: 'إيجار المكتب', amount: 24000, percentage: 16.5, change: 0 },
    { category: 'خدمات قانونية', amount: 18000, percentage: 12.3, change: -12.5 },
    { category: 'تسويق وإعلان', amount: 12000, percentage: 8.2, change: 15.8 },
    { category: 'مصاريف إدارية', amount: 6800, percentage: 4.7, change: -8.9 }
  ]

  // Forecasting Data
  const forecast = [
    { month: 'ديسمبر 2025', predicted: 132000, confidence: 'high' },
    { month: 'يناير 2026', predicted: 138000, confidence: 'high' },
    { month: 'فبراير 2026', predicted: 142000, confidence: 'medium' },
    { month: 'مارس 2026', predicted: 148000, confidence: 'medium' }
  ]

  // Collection Performance
  const collectionData = [
    { range: '0-15 يوم', amount: 185000, percentage: 38, count: 25, color: 'green' },
    { range: '16-30 يوم', amount: 142000, percentage: 29, count: 18, color: 'blue' },
    { range: '31-60 يوم', amount: 98000, percentage: 20, count: 12, color: 'yellow' },
    { range: '60+ يوم', amount: 60600, percentage: 13, count: 8, color: 'red' }
  ]

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const maxRevenue = Math.max(...revenueTrend.map(m => m.revenue))

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      {/* Top Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">الرؤى المالية</h1>
            <p className="text-sm text-slate-600">تحليلات متقدمة وتقارير الأداء المالي</p>
          </div>
          <div className="flex items-center gap-3">
            <select 
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-4 py-2 border border-slate-200 rounded-lg text-sm"
            >
              <option value="3months">آخر 3 شهور</option>
              <option value="6months">آخر 6 شهور</option>
              <option value="12months">آخر 12 شهر</option>
              <option value="ytd">من بداية السنة</option>
            </select>
            <button className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2">
              <Download className="h-4 w-4" />
              تصدير التقرير
            </button>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-2">
              <Filter className="h-4 w-4" />
              فلاتر متقدمة
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-5 gap-4 mb-6">
          <div className="bg-gradient-to-br from-green-50 to-white border border-slate-200 rounded-lg p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                <ArrowUpRight className="h-3 w-3 ml-1" />
                +{metrics.revenueGrowth}%
              </span>
            </div>
            <div className="text-2xl font-bold text-slate-900 mb-1">{formatCurrency(metrics.totalRevenue)}</div>
            <div className="text-xs text-slate-600">إجمالي الإيرادات</div>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-white border border-slate-200 rounded-lg p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-blue-600" />
              </div>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                {metrics.profitMargin}%
              </span>
            </div>
            <div className="text-2xl font-bold text-slate-900 mb-1">{formatCurrency(metrics.netProfit)}</div>
            <div className="text-xs text-slate-600">صافي الربح</div>
          </div>

          <div className="bg-gradient-to-br from-red-50 to-white border border-slate-200 rounded-lg p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="h-10 w-10 rounded-lg bg-red-100 flex items-center justify-center">
                <TrendingDown className="h-5 w-5 text-red-600" />
              </div>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                <ArrowDownRight className="h-3 w-3 ml-1" />
                {Math.abs(metrics.expenseGrowth)}%
              </span>
            </div>
            <div className="text-2xl font-bold text-slate-900 mb-1">{formatCurrency(metrics.totalExpenses)}</div>
            <div className="text-xs text-slate-600">إجمالي المصروفات</div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-white border border-slate-200 rounded-lg p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <Users className="h-5 w-5 text-purple-600" />
              </div>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                {metrics.clientRetention}%
              </span>
            </div>
            <div className="text-2xl font-bold text-slate-900 mb-1">{formatCurrency(metrics.averageInvoice)}</div>
            <div className="text-xs text-slate-600">متوسط الفاتورة</div>
          </div>

          <div className="bg-gradient-to-br from-yellow-50 to-white border border-slate-200 rounded-lg p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="h-10 w-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                <CheckCircle className="h-3 w-3 ml-1" />
                جيد
              </span>
            </div>
            <div className="text-2xl font-bold text-slate-900 mb-1">{metrics.averagePaymentDays}</div>
            <div className="text-xs text-slate-600">متوسط أيام الدفع</div>
          </div>
        </div>

        {/* Revenue Trend Chart */}
        <div className="bg-white border border-slate-200 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900">اتجاه الإيرادات والأرباح</h3>
              <p className="text-xs text-slate-600">مقارنة شهرية - آخر 12 شهر</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-slate-800"></div>
                <span>الإيرادات</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span>الأرباح</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-400"></div>
                <span>المصروفات</span>
              </div>
            </div>
          </div>

          <div className="relative h-80">
            <div className="absolute inset-0 flex items-end justify-between gap-2">
              {revenueTrend.slice(-12).map((month, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full flex items-end justify-center gap-0.5" style={{ height: '300px' }}>
                    <div 
                      className="w-full bg-slate-800 rounded-t hover:bg-slate-700 transition-all cursor-pointer relative group"
                      style={{ height: `${(month.revenue / maxRevenue) * 100}%`, minHeight: '8px' }}
                    >
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 whitespace-nowrap">
                        {formatCurrency(month.revenue)}
                      </div>
                    </div>
                    <div 
                      className="w-full bg-blue-500 rounded-t hover:bg-blue-600 transition-all cursor-pointer relative group"
                      style={{ height: `${(month.profit / maxRevenue) * 100}%`, minHeight: '8px' }}
                    >
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-blue-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 whitespace-nowrap">
                        {formatCurrency(month.profit)}
                      </div>
                    </div>
                    <div 
                      className="w-full bg-red-400 rounded-t hover:bg-red-500 transition-all cursor-pointer relative group"
                      style={{ height: `${(month.expenses / maxRevenue) * 100}%`, minHeight: '8px' }}
                    >
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-red-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 whitespace-nowrap">
                        {formatCurrency(month.expenses)}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-slate-600 -rotate-45 origin-top-right w-16 text-right">{month.month}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Practice Areas & Top Clients */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          {/* Practice Area Performance */}
          <div className="bg-white border border-slate-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900">أداء مجالات الممارسة</h3>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-50 text-slate-600 border border-slate-200">
                <BarChart3 className="h-3 w-3 ml-1" />
                تحليل تفصيلي
              </span>
            </div>
            <div className="space-y-4">
              {practiceAreas.map((area, idx) => (
                <div key={idx} className="p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-semibold text-slate-900">{area.name}</span>
                        <span className="text-lg font-bold text-slate-900">{formatCurrency(area.revenue)}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-600">
                        <span>{area.cases} قضية</span>
                        <span>•</span>
                        <span>متوسط: {formatCurrency(area.avgValue)}</span>
                        <span>•</span>
                        <span className="text-green-600 font-semibold">+{area.growth}%</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex-1 bg-slate-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ width: `${area.percentage}%` }}
                      ></div>
                    </div>
                    <span className="text-xs font-semibold text-slate-700">{area.percentage}%</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600">صافي الربح:</span>
                    <span className="font-bold text-green-600">{formatCurrency(area.profit)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Clients Profitability */}
          <div className="bg-white border border-slate-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900">أكثر العملاء ربحية</h3>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                <Award className="h-3 w-3 ml-1" />
                أفضل أداء
              </span>
            </div>
            <div className="space-y-3">
              {topClients.map((client, idx) => (
                <div key={idx} className="p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-bold text-blue-700">#{idx + 1}</span>
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-slate-900 mb-1">{client.name}</div>
                        <div className="flex items-center gap-2 text-xs text-slate-600">
                          <span>{client.cases} قضايا</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {client.paymentSpeed} يوم
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      {client.trend === 'up' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 mb-1">
                          <TrendingUp className="h-3 w-3" />
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-3">
                    <div className="text-center p-2 bg-white rounded border border-slate-200">
                      <div className="text-xs text-slate-600 mb-1">إيرادات</div>
                      <div className="text-sm font-bold text-slate-900">{formatCurrency(client.revenue)}</div>
                    </div>
                    <div className="text-center p-2 bg-green-50 rounded border border-green-200">
                      <div className="text-xs text-slate-600 mb-1">ربح</div>
                      <div className="text-sm font-bold text-green-700">{formatCurrency(client.profit)}</div>
                    </div>
                    <div className="text-center p-2 bg-blue-50 rounded border border-blue-200">
                      <div className="text-xs text-slate-600 mb-1">هامش</div>
                      <div className="text-sm font-bold text-blue-700">{client.margin}%</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Expense Breakdown & Collection Performance */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          {/* Expense Breakdown */}
          <div className="bg-white border border-slate-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900">تفصيل المصروفات</h3>
              <span className="text-lg font-bold text-red-700">{formatCurrency(metrics.totalExpenses)}</span>
            </div>
            <div className="space-y-3">
              {expenseCategories.map((expense, idx) => (
                <div key={idx} className="p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-900">{expense.category}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900">{formatCurrency(expense.amount)}</span>
                      <span className={`text-xs font-semibold ${expense.change < 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {expense.change > 0 ? '+' : ''}{expense.change}%
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-slate-200 rounded-full h-2">
                      <div 
                        className="bg-red-500 h-2 rounded-full"
                        style={{ width: `${expense.percentage}%` }}
                      ></div>
                    </div>
                    <span className="text-xs font-semibold text-slate-700">{expense.percentage}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Collection Performance */}
          <div className="bg-white border border-slate-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900">أداء التحصيل حسب الفترة</h3>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                {metrics.collectionRate}% معدل التحصيل
              </span>
            </div>
            <div className="space-y-3">
              {collectionData.map((data, idx) => (
                <div key={idx} className={`p-4 rounded-lg border-2 ${
                  data.color === 'green' ? 'bg-green-50 border-green-200' :
                  data.color === 'blue' ? 'bg-blue-50 border-blue-200' :
                  data.color === 'yellow' ? 'bg-yellow-50 border-yellow-200' :
                  'bg-red-50 border-red-200'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                        data.color === 'green' ? 'bg-green-100' :
                        data.color === 'blue' ? 'bg-blue-100' :
                        data.color === 'yellow' ? 'bg-yellow-100' :
                        'bg-red-100'
                      }`}>
                        <span className={`text-sm font-bold ${
                          data.color === 'green' ? 'text-green-700' :
                          data.color === 'blue' ? 'text-blue-700' :
                          data.color === 'yellow' ? 'text-yellow-700' :
                          'text-red-700'
                        }`}>{data.count}</span>
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-slate-900">{data.range}</div>
                        <div className="text-xs text-slate-600">{data.count} فاتورة</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-slate-900">{formatCurrency(data.amount)}</div>
                      <div className="text-xs text-slate-600">{data.percentage}%</div>
                    </div>
                  </div>
                  <div className="w-full bg-white rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        data.color === 'green' ? 'bg-green-500' :
                        data.color === 'blue' ? 'bg-blue-500' :
                        data.color === 'yellow' ? 'bg-yellow-500' :
                        'bg-red-500'
                      }`}
                      style={{ width: `${data.percentage}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Revenue Forecast */}
        <div className="bg-gradient-to-br from-purple-50 to-white border border-purple-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Activity className="h-5 w-5 text-purple-600" />
                توقعات الإيرادات
              </h3>
              <p className="text-xs text-slate-600">تنبؤات مبنية على البيانات التاريخية والاتجاهات الحالية</p>
            </div>
            <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700 border border-purple-300">
              <Target className="h-3 w-3 ml-1" />
              توقعات AI
            </span>
          </div>
          <div className="grid grid-cols-4 gap-4">
            {forecast.map((item, idx) => (
              <div key={idx} className="p-4 bg-white rounded-lg border border-purple-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-600">{item.month}</span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    item.confidence === 'high' 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {item.confidence === 'high' ? 'دقة عالية' : 'دقة متوسطة'}
                  </span>
                </div>
                <div className="text-2xl font-bold text-purple-700">{formatCurrency(item.predicted)}</div>
                <div className="text-xs text-slate-600 mt-1">
                  توقع الإيرادات
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
