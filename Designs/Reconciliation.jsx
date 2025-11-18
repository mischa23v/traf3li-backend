import { useState } from 'react'
import { Building2, Upload, CheckCircle, AlertCircle, Clock, DollarSign, TrendingUp, TrendingDown, RefreshCw, Download, Plus, Check, X, Filter, Search, Calendar, ArrowRight, ArrowLeft } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export default function Reconciliation() {
  const [selectedMonth, setSelectedMonth] = useState('نوفمبر 2025')
  const [viewMode, setViewMode] = useState('unmatched') // unmatched, matched, all

  // Reconciliation summary
  const summary = {
    bookBalance: 485600,
    bankBalance: 478350,
    difference: 7250,
    unmatchedTransactions: 12,
    matchedTransactions: 145,
    lastReconciled: '31 أكتوبر 2025',
    reconciliationRate: 92.3
  }

  // Unmatched transactions from books
  const unmatchedInBooks = [
    {
      id: 'BK-001',
      date: '15 نوفمبر 2025',
      description: 'فاتورة #INV-2025-001 - مشاري الرابح',
      type: 'income',
      amount: 52900,
      status: 'pending',
      category: 'client_payment'
    },
    {
      id: 'BK-002',
      date: '12 نوفمبر 2025',
      description: 'شيك دفع #CHK-445 - إيجار المكتب',
      type: 'expense',
      amount: -15000,
      status: 'pending',
      category: 'rent'
    },
    {
      id: 'BK-003',
      date: '10 نوفمبر 2025',
      description: 'تحويل من حساب الأمانات',
      type: 'income',
      amount: 25000,
      status: 'pending',
      category: 'transfer'
    },
    {
      id: 'BK-004',
      date: '8 نوفمبر 2025',
      description: 'دفعة للموردين - شركة الخدمات القانونية',
      type: 'expense',
      amount: -8500,
      status: 'pending',
      category: 'supplier'
    }
  ]

  // Unmatched transactions from bank
  const unmatchedInBank = [
    {
      id: 'BANK-001',
      date: '14 نوفمبر 2025',
      description: 'WIRE TRANSFER - SA Manufacturing Co',
      type: 'income',
      amount: 45000,
      status: 'unrecorded',
      category: 'unknown'
    },
    {
      id: 'BANK-002',
      date: '13 نوفمبر 2025',
      description: 'Monthly Service Fee',
      type: 'expense',
      amount: -150,
      status: 'unrecorded',
      category: 'bank_fee'
    },
    {
      id: 'BANK-003',
      date: '11 نوفمبر 2025',
      description: 'Interest Earned',
      type: 'income',
      amount: 320,
      status: 'unrecorded',
      category: 'interest'
    },
    {
      id: 'BANK-004',
      date: '9 نوفمبر 2025',
      description: 'ATM Withdrawal',
      type: 'expense',
      amount: -2000,
      status: 'unrecorded',
      category: 'cash'
    },
    {
      id: 'BANK-005',
      date: '7 نوفمبر 2025',
      description: 'Wire Transfer Fee',
      type: 'expense',
      amount: -50,
      status: 'unrecorded',
      category: 'bank_fee'
    }
  ]

  // Matched transactions
  const matchedTransactions = [
    {
      id: 'M-001',
      date: '16 نوفمبر 2025',
      bookDescription: 'فاتورة #INV-2025-005 - سارة المطيري',
      bankDescription: 'TRANSFER - Sara Al Mutairi',
      amount: 28000,
      matchedBy: 'أحمد السالم',
      matchedDate: '17 نوفمبر 2025'
    },
    {
      id: 'M-002',
      date: '15 نوفمبر 2025',
      bookDescription: 'دفع رواتب الموظفين',
      bankDescription: 'Payroll Transfer',
      amount: -35000,
      matchedBy: 'النظام',
      matchedDate: '16 نوفمبر 2025'
    },
    {
      id: 'M-003',
      date: '14 نوفمبر 2025',
      bookDescription: 'فاتورة #INV-2025-006 - محمد الدوسري',
      bankDescription: 'CHECK DEPOSIT #1245',
      amount: 42000,
      matchedBy: 'فاطمة الغامدي',
      matchedDate: '15 نوفمبر 2025'
    }
  ]

  // Outstanding items summary
  const outstandingItems = [
    { category: 'شيكات معلقة', count: 3, amount: -23500 },
    { category: 'ودائع في الطريق', count: 2, amount: 77900 },
    { category: 'رسوم بنكية', count: 4, amount: -350 },
    { category: 'تحويلات معلقة', count: 3, amount: 25000 }
  ]

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 0
    }).format(Math.abs(amount))
  }

  const getTypeBadge = (type) => {
    return type === 'income' 
      ? <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">إيداع</Badge>
      : <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">سحب</Badge>
  }

  const getStatusBadge = (status) => {
    switch(status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">معلق</Badge>
      case 'unrecorded':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">غير مسجل</Badge>
      case 'matched':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">متطابق</Badge>
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      {/* Top Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between max-w-[1800px] mx-auto">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">التسوية البنكية</h1>
            <p className="text-sm text-slate-600">مطابقة الحسابات مع كشف الحساب البنكي</p>
          </div>
          <div className="flex items-center gap-3">
            <select 
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-4 py-2 border border-slate-200 rounded-lg text-sm"
            >
              <option>نوفمبر 2025</option>
              <option>أكتوبر 2025</option>
              <option>سبتمبر 2025</option>
              <option>أغسطس 2025</option>
            </select>
            <Button variant="outline">
              <Upload className="h-4 w-4 ml-2" />
              رفع كشف حساب
            </Button>
            <Button>
              <Download className="h-4 w-4 ml-2" />
              تصدير التقرير
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-[1800px] mx-auto p-6">
        {/* Balance Comparison */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {/* Book Balance */}
          <Card className="border-slate-200 bg-gradient-to-br from-blue-50 to-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-blue-600" />
                </div>
                <Badge variant="outline" className="text-xs">دفاترنا</Badge>
              </div>
              <div className="text-3xl font-bold text-slate-900 mb-1">{formatCurrency(summary.bookBalance)}</div>
              <div className="text-xs text-slate-600">رصيد الدفاتر</div>
            </CardContent>
          </Card>

          {/* Bank Balance */}
          <Card className="border-slate-200 bg-gradient-to-br from-green-50 to-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-green-600" />
                </div>
                <Badge variant="outline" className="text-xs">البنك</Badge>
              </div>
              <div className="text-3xl font-bold text-slate-900 mb-1">{formatCurrency(summary.bankBalance)}</div>
              <div className="text-xs text-slate-600">رصيد البنك</div>
            </CardContent>
          </Card>

          {/* Difference */}
          <Card className="border-slate-200 bg-gradient-to-br from-yellow-50 to-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="h-10 w-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                </div>
                <Badge variant="outline" className="text-xs bg-yellow-50">الفرق</Badge>
              </div>
              <div className="text-3xl font-bold text-slate-900 mb-1">{formatCurrency(summary.difference)}</div>
              <div className="text-xs text-slate-600">{summary.unmatchedTransactions} معاملة غير متطابقة</div>
            </CardContent>
          </Card>
        </div>

        {/* Reconciliation Progress */}
        <Card className="border-slate-200 mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">تقدم التسوية</h3>
                <p className="text-xs text-slate-600">آخر تسوية: {summary.lastReconciled}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-green-600">{summary.reconciliationRate}%</span>
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-4">
              <div 
                className="bg-green-500 h-4 rounded-full flex items-center justify-end px-2"
                style={{ width: `${summary.reconciliationRate}%` }}
              >
                <span className="text-xs text-white font-semibold">{summary.matchedTransactions} متطابق</span>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-4 mt-4">
              {outstandingItems.map((item, idx) => (
                <div key={idx} className="p-3 bg-slate-50 rounded-lg">
                  <div className="text-xs text-slate-600 mb-1">{item.category}</div>
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-xs">{item.count}</Badge>
                    <span className={`text-sm font-bold ${item.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(item.amount)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* View Mode Tabs */}
        <div className="flex items-center gap-3 mb-6">
          <Button 
            variant={viewMode === 'unmatched' ? 'default' : 'outline'}
            onClick={() => setViewMode('unmatched')}
          >
            <AlertCircle className="h-4 w-4 ml-2" />
            غير متطابقة ({unmatchedInBooks.length + unmatchedInBank.length})
          </Button>
          <Button 
            variant={viewMode === 'matched' ? 'default' : 'outline'}
            onClick={() => setViewMode('matched')}
          >
            <CheckCircle className="h-4 w-4 ml-2" />
            متطابقة ({matchedTransactions.length})
          </Button>
          <Button 
            variant={viewMode === 'all' ? 'default' : 'outline'}
            onClick={() => setViewMode('all')}
          >
            الكل
          </Button>
        </div>

        {/* Unmatched View */}
        {(viewMode === 'unmatched' || viewMode === 'all') && (
          <div className="grid grid-cols-2 gap-6 mb-6">
            {/* In Books but not in Bank */}
            <Card className="border-slate-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">في دفاترنا فقط</h3>
                    <p className="text-xs text-slate-600">معاملات مسجلة لكن لم تظهر في البنك</p>
                  </div>
                  <Badge variant="outline" className="bg-blue-50">{unmatchedInBooks.length}</Badge>
                </div>
                <div className="space-y-3">
                  {unmatchedInBooks.map((transaction) => (
                    <div key={transaction.id} className="p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {getTypeBadge(transaction.type)}
                            <span className="text-xs text-slate-500">{transaction.date}</span>
                          </div>
                          <div className="text-sm font-semibold text-slate-900 mb-1">{transaction.description}</div>
                          <div className="text-xs text-slate-600">#{transaction.id}</div>
                        </div>
                        <div className="text-right">
                          <div className={`text-lg font-bold ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                            {transaction.type === 'income' ? '+' : ''}{formatCurrency(transaction.amount)}
                          </div>
                          {getStatusBadge(transaction.status)}
                        </div>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <Button size="sm" variant="outline" className="flex-1">
                          <Check className="h-3 w-3 ml-1" />
                          مطابقة مع البنك
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1">
                          <X className="h-3 w-3 ml-1" />
                          حذف من الدفاتر
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* In Bank but not in Books */}
            <Card className="border-slate-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">في البنك فقط</h3>
                    <p className="text-xs text-slate-600">معاملات بنكية لم تسجل في دفاترنا</p>
                  </div>
                  <Badge variant="outline" className="bg-green-50">{unmatchedInBank.length}</Badge>
                </div>
                <div className="space-y-3">
                  {unmatchedInBank.map((transaction) => (
                    <div key={transaction.id} className="p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {getTypeBadge(transaction.type)}
                            <span className="text-xs text-slate-500">{transaction.date}</span>
                          </div>
                          <div className="text-sm font-semibold text-slate-900 mb-1">{transaction.description}</div>
                          <div className="text-xs text-slate-600">#{transaction.id}</div>
                        </div>
                        <div className="text-right">
                          <div className={`text-lg font-bold ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                            {transaction.type === 'income' ? '+' : ''}{formatCurrency(transaction.amount)}
                          </div>
                          {getStatusBadge(transaction.status)}
                        </div>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <Button size="sm" variant="outline" className="flex-1">
                          <Plus className="h-3 w-3 ml-1" />
                          إضافة للدفاتر
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1">
                          <Check className="h-3 w-3 ml-1" />
                          مطابقة مع سجل
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Matched View */}
        {(viewMode === 'matched' || viewMode === 'all') && (
          <Card className="border-slate-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">المعاملات المتطابقة</h3>
                  <p className="text-xs text-slate-600">تم مطابقتها بنجاح</p>
                </div>
                <Badge variant="outline" className="bg-green-50">{matchedTransactions.length}</Badge>
              </div>
              <div className="space-y-3">
                {matchedTransactions.map((transaction) => (
                  <div key={transaction.id} className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                        <div className="flex-1">
                          <div className="text-xs text-slate-500 mb-1">{transaction.date}</div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <div className="text-xs text-slate-600 mb-1">في الدفاتر:</div>
                              <div className="text-sm font-semibold text-slate-900">{transaction.bookDescription}</div>
                            </div>
                            <div>
                              <div className="text-xs text-slate-600 mb-1">في البنك:</div>
                              <div className="text-sm font-semibold text-slate-900">{transaction.bankDescription}</div>
                            </div>
                          </div>
                          <div className="text-xs text-slate-500 mt-2">
                            تمت المطابقة بواسطة {transaction.matchedBy} • {transaction.matchedDate}
                          </div>
                        </div>
                      </div>
                      <div className="text-lg font-bold text-green-600 mr-4">
                        {transaction.amount > 0 ? '+' : ''}{formatCurrency(transaction.amount)}
                      </div>
                      <Button size="sm" variant="ghost">
                        <X className="h-4 w-4 text-slate-600" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-slate-600">
            آخر تحديث: 17 نوفمبر 2025 - 2:30 مساءً
          </div>
          <div className="flex gap-3">
            <Button variant="outline">
              <RefreshCw className="h-4 w-4 ml-2" />
              تحديث من البنك
            </Button>
            <Button>
              <CheckCircle className="h-4 w-4 ml-2" />
              إكمال التسوية
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
