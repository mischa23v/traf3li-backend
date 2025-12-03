import { useState } from 'react'
import { Search, Filter, Download, Calendar, TrendingUp, TrendingDown, DollarSign, ArrowUpRight, ArrowDownRight, Receipt, FileText, CreditCard } from 'lucide-react'
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

export default function StatementsDashboard() {
  const [selectedPeriod, setSelectedPeriod] = useState('month')
  const [searchQuery, setSearchQuery] = useState('')

  // Sample transactions data
  const transactions = [
    {
      id: 'TXN-2025-001',
      date: '15 نوفمبر 2025',
      type: 'دخل',
      typeColor: 'text-green-600',
      category: 'فاتورة',
      description: 'دفعة من مشاري الرابح',
      reference: 'INV-2025-001',
      amount: 52900,
      balance: 125400,
      paymentMethod: 'تحويل بنكي',
      status: 'مكتمل'
    },
    {
      id: 'TXN-2025-002',
      date: '15 نوفمبر 2025',
      type: 'مصروف',
      typeColor: 'text-red-600',
      category: 'رسوم قانونية',
      description: 'استئجار قاعة المحكمة',
      reference: 'EXP-2025-001',
      amount: -5652.17,
      balance: 119747.83,
      paymentMethod: 'بطاقة ائتمان',
      status: 'مكتمل'
    },
    {
      id: 'TXN-2025-003',
      date: '14 نوفمبر 2025',
      type: 'دخل',
      typeColor: 'text-green-600',
      category: 'فاتورة',
      description: 'دفعة من عبدالله الغامدي',
      reference: 'INV-2025-002',
      amount: 38000,
      balance: 125400,
      paymentMethod: 'تحويل بنكي',
      status: 'مكتمل'
    },
    {
      id: 'TXN-2025-004',
      date: '14 نوفمبر 2025',
      type: 'مصروف',
      typeColor: 'text-red-600',
      category: 'اشتراكات',
      description: 'اشتراك المكتبة القانونية',
      reference: 'EXP-2025-002',
      amount: -2500,
      balance: 87400,
      paymentMethod: 'تحويل بنكي',
      status: 'مكتمل'
    },
    {
      id: 'TXN-2025-005',
      date: '12 نوفمبر 2025',
      type: 'دخل',
      typeColor: 'text-green-600',
      category: 'فاتورة',
      description: 'دفعة من فاطمة العتيبي',
      reference: 'INV-2025-003',
      amount: 52000,
      balance: 89900,
      paymentMethod: 'شيك',
      status: 'مكتمل'
    },
    {
      id: 'TXN-2025-006',
      date: '12 نوفمبر 2025',
      type: 'مصروف',
      typeColor: 'text-red-600',
      category: 'استشارات',
      description: 'استشارة خبير مالي',
      reference: 'EXP-2025-003',
      amount: -8000,
      balance: 37900,
      paymentMethod: 'نقدي',
      status: 'مكتمل'
    },
    {
      id: 'TXN-2025-007',
      date: '10 نوفمبر 2025',
      type: 'مصروف',
      typeColor: 'text-red-600',
      category: 'مواصلات',
      description: 'وقود السيارة',
      reference: 'EXP-2025-004',
      amount: -450,
      balance: 45900,
      paymentMethod: 'نقدي',
      status: 'مكتمل'
    },
    {
      id: 'TXN-2025-008',
      date: '9 نوفمبر 2025',
      type: 'مصروف',
      typeColor: 'text-red-600',
      category: 'ضيافة',
      description: 'اجتماع عمل مع العميل',
      reference: 'EXP-2025-005',
      amount: -320,
      balance: 46350,
      paymentMethod: 'بطاقة ائتمان',
      status: 'مكتمل'
    },
    {
      id: 'TXN-2025-009',
      date: '8 نوفمبر 2025',
      type: 'مصروف',
      typeColor: 'text-red-600',
      category: 'خدمات',
      description: 'ترجمة مستندات قانونية',
      reference: 'EXP-2025-006',
      amount: -1500,
      balance: 46670,
      paymentMethod: 'تحويل بنكي',
      status: 'معلق'
    },
    {
      id: 'TXN-2025-010',
      date: '1 نوفمبر 2025',
      type: 'مصروف',
      typeColor: 'text-red-600',
      category: 'إيجار',
      description: 'إيجار المكتب - نوفمبر',
      reference: 'EXP-2025-007',
      amount: -15000,
      balance: 48170,
      paymentMethod: 'تحويل بنكي',
      status: 'مكتمل'
    }
  ]

  // Calculate statistics
  const totalIncome = transactions.filter(t => t.type === 'دخل').reduce((sum, t) => sum + t.amount, 0)
  const totalExpenses = Math.abs(transactions.filter(t => t.type === 'مصروف').reduce((sum, t) => sum + t.amount, 0))
  const netProfit = totalIncome - totalExpenses
  const currentBalance = 125400
  const previousBalance = 72500
  const balanceChange = currentBalance - previousBalance
  const balanceChangePercent = ((balanceChange / previousBalance) * 100).toFixed(1)

  // Group transactions by category
  const incomeByCategory = transactions
    .filter(t => t.type === 'دخل')
    .reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount
      return acc
    }, {})

  const expensesByCategory = transactions
    .filter(t => t.type === 'مصروف')
    .reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + Math.abs(t.amount)
      return acc
    }, {})

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      {/* Top Navigation Bar */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="flex items-center justify-between px-6 h-16">
          <div className="flex items-center gap-6">
            <h1 className="text-xl font-bold text-slate-900">كشوف الحساب</h1>
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="بحث في المعاملات..." 
                className="w-80 pr-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              تصدير PDF
            </Button>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              تصدير Excel
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-[1800px] mx-auto p-6">
        {/* Modern Dashboard Overview */}
        <div className="mb-6">
          {/* Top Row - Key Metrics */}
          <div className="grid grid-cols-4 gap-4 mb-4">
            {/* Current Balance */}
            <Card className="border-slate-200 bg-gradient-to-br from-slate-50 to-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center">
                    <DollarSign className="h-5 w-5 text-slate-700" />
                  </div>
                  <Badge variant="outline" className="text-xs">الرصيد</Badge>
                </div>
                <div className="text-3xl font-bold text-slate-900 mb-1">{formatCurrency(currentBalance)}</div>
                <div className="text-xs text-slate-600 flex items-center gap-1">
                  {balanceChange >= 0 ? (
                    <>
                      <ArrowUpRight className="h-3 w-3 text-green-600" />
                      <span className="text-green-600">+{balanceChangePercent}%</span>
                    </>
                  ) : (
                    <>
                      <ArrowDownRight className="h-3 w-3 text-red-600" />
                      <span className="text-red-600">{balanceChangePercent}%</span>
                    </>
                  )}
                  <span>عن الشهر الماضي</span>
                </div>
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
                <div className="text-xs text-green-700">إجمالي الإيرادات</div>
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

            {/* Net Profit */}
            <Card className={`border-${netProfit >= 0 ? 'blue' : 'amber'}-200 bg-gradient-to-br from-${netProfit >= 0 ? 'blue' : 'amber'}-50 to-white`}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className={`h-10 w-10 rounded-lg bg-${netProfit >= 0 ? 'blue' : 'amber'}-100 flex items-center justify-center`}>
                    <DollarSign className={`h-5 w-5 text-${netProfit >= 0 ? 'blue' : 'amber'}-700`} />
                  </div>
                  <Badge className={`bg-${netProfit >= 0 ? 'blue' : 'amber'}-600 text-xs`}>
                    {netProfit >= 0 ? 'ربح' : 'خسارة'}
                  </Badge>
                </div>
                <div className={`text-3xl font-bold text-${netProfit >= 0 ? 'blue' : 'amber'}-900 mb-1`}>
                  {formatCurrency(Math.abs(netProfit))}
                </div>
                <div className={`text-xs text-${netProfit >= 0 ? 'blue' : 'amber'}-700`}>
                  {netProfit >= 0 ? 'صافي الربح' : 'صافي الخسارة'}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Bottom Row - Analytics */}
          <div className="grid grid-cols-3 gap-4">
            {/* Income Breakdown */}
            <Card className="border-slate-200">
              <CardContent className="p-6">
                <h3 className="text-sm font-semibold text-slate-900 mb-4">تفصيل الإيرادات</h3>
                <div className="space-y-3">
                  {Object.entries(incomeByCategory)
                    .sort((a, b) => b[1] - a[1])
                    .map(([category, amount], idx) => (
                      <div key={idx}>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs text-slate-600">{category}</span>
                          <span className="text-xs font-bold text-slate-900">{formatCurrency(amount)}</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2">
                          <div 
                            className="bg-green-500 h-2 rounded-full" 
                            style={{width: `${(amount / totalIncome) * 100}%`}}
                          ></div>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            {/* Expenses Breakdown */}
            <Card className="border-slate-200">
              <CardContent className="p-6">
                <h3 className="text-sm font-semibold text-slate-900 mb-4">تفصيل المصروفات</h3>
                <div className="space-y-3">
                  {Object.entries(expensesByCategory)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 3)
                    .map(([category, amount], idx) => (
                      <div key={idx}>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs text-slate-600">{category}</span>
                          <span className="text-xs font-bold text-slate-900">{formatCurrency(amount)}</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2">
                          <div 
                            className="bg-red-500 h-2 rounded-full" 
                            style={{width: `${(amount / totalExpenses) * 100}%`}}
                          ></div>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            {/* Cash Flow Summary */}
            <Card className="border-slate-200">
              <CardContent className="p-6">
                <h3 className="text-sm font-semibold text-slate-900 mb-4">ملخص التدفق النقدي</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-slate-100 to-slate-50 flex items-center justify-center">
                      <ArrowUpRight className="h-5 w-5 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <div className="text-xs text-slate-600">التدفق الداخل</div>
                      <div className="text-sm font-bold text-green-700">{formatCurrency(totalIncome)}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-slate-100 to-slate-50 flex items-center justify-center">
                      <ArrowDownRight className="h-5 w-5 text-red-600" />
                    </div>
                    <div className="flex-1">
                      <div className="text-xs text-slate-600">التدفق الخارج</div>
                      <div className="text-sm font-bold text-red-700">{formatCurrency(totalExpenses)}</div>
                    </div>
                  </div>
                  <div className="pt-3 border-t border-slate-200">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center">
                        <DollarSign className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <div className="text-xs text-slate-600">الصافي</div>
                        <div className={`text-sm font-bold ${netProfit >= 0 ? 'text-blue-700' : 'text-amber-700'}`}>
                          {formatCurrency(Math.abs(netProfit))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Filters Section */}
        <div className="bg-white rounded-lg border border-slate-200 mb-6">
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-600 mb-2 block text-right">الفترة الزمنية</label>
                <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                  <SelectTrigger className="w-full text-right" dir="rtl">
                    <SelectValue placeholder="اختر..." />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    <SelectItem value="week">هذا الأسبوع</SelectItem>
                    <SelectItem value="month">هذا الشهر</SelectItem>
                    <SelectItem value="quarter">هذا الربع</SelectItem>
                    <SelectItem value="year">هذا العام</SelectItem>
                    <SelectItem value="custom">فترة مخصصة</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 mb-2 block text-right">نوع المعاملة</label>
                <Select>
                  <SelectTrigger className="w-full text-right" dir="rtl">
                    <SelectValue placeholder="الكل" />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    <SelectItem value="all">الكل</SelectItem>
                    <SelectItem value="income">دخل فقط</SelectItem>
                    <SelectItem value="expense">مصروفات فقط</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 mb-2 block text-right">الفئة</label>
                <Select>
                  <SelectTrigger className="w-full text-right" dir="rtl">
                    <SelectValue placeholder="جميع الفئات" />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    <SelectItem value="all">جميع الفئات</SelectItem>
                    <SelectItem value="invoice">فواتير</SelectItem>
                    <SelectItem value="legal">رسوم قانونية</SelectItem>
                    <SelectItem value="subscription">اشتراكات</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 mb-2 block text-right">طريقة الدفع</label>
                <Select>
                  <SelectTrigger className="w-full text-right" dir="rtl">
                    <SelectValue placeholder="الكل" />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    <SelectItem value="all">الكل</SelectItem>
                    <SelectItem value="bank">تحويل بنكي</SelectItem>
                    <SelectItem value="card">بطاقة ائتمان</SelectItem>
                    <SelectItem value="cash">نقدي</SelectItem>
                    <SelectItem value="check">شيك</SelectItem>
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

        {/* Transactions Table */}
        <Card className="border-slate-200">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600">التاريخ</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600">النوع</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600">الفئة</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600">الوصف</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600">المرجع</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600">طريقة الدفع</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600">المبلغ</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600">الرصيد</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((transaction) => (
                    <tr 
                      key={transaction.id} 
                      className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                    >
                      {/* Date */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 justify-end">
                          <span className="text-sm text-slate-700">{transaction.date}</span>
                          <Calendar className="h-4 w-4 text-slate-400" />
                        </div>
                      </td>

                      {/* Type */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 justify-end">
                          <span className={`text-sm font-medium ${transaction.typeColor}`}>
                            {transaction.type}
                          </span>
                          {transaction.type === 'دخل' ? (
                            <ArrowUpRight className="h-4 w-4 text-green-600" />
                          ) : (
                            <ArrowDownRight className="h-4 w-4 text-red-600" />
                          )}
                        </div>
                      </td>

                      {/* Category */}
                      <td className="px-6 py-4">
                        <Badge variant="outline" className="text-xs">
                          {transaction.category}
                        </Badge>
                      </td>

                      {/* Description */}
                      <td className="px-6 py-4">
                        <div className="text-sm text-slate-900 text-right">{transaction.description}</div>
                      </td>

                      {/* Reference */}
                      <td className="px-6 py-4">
                        <div className="text-sm font-mono text-slate-700 text-right">{transaction.reference}</div>
                      </td>

                      {/* Payment Method */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 justify-end">
                          <span className="text-sm text-slate-700">{transaction.paymentMethod}</span>
                          <CreditCard className="h-4 w-4 text-slate-400" />
                        </div>
                      </td>

                      {/* Amount */}
                      <td className="px-6 py-4">
                        <div className={`text-sm font-bold text-right ${transaction.amount >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                          {transaction.amount >= 0 ? '+' : ''}{formatCurrency(transaction.amount)}
                        </div>
                      </td>

                      {/* Balance */}
                      <td className="px-6 py-4">
                        <div className="text-sm font-semibold text-slate-900 text-right">
                          {formatCurrency(transaction.balance)}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        <div className="flex justify-end">
                          <Badge className={transaction.status === 'مكتمل' ? 'bg-green-500' : 'bg-amber-500'}>
                            {transaction.status}
                          </Badge>
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
