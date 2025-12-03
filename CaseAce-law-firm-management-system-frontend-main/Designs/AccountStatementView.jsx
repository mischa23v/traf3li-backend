import { useState } from 'react'
import { ArrowRight, Download, Send, Printer, Mail, Phone, MapPin, Calendar, FileText, Scale, Receipt } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export default function AccountStatementView() {
  // Sample statement data
  const statement = {
    id: 'STMT-2025-001',
    date: '17 نوفمبر 2025',
    period: 'أكتوبر - نوفمبر 2025',
    
    // Client Info
    client: {
      name: 'مشاري بن ناهد الرابح',
      company: 'المصنع السعودي للمنتجات المعدنية',
      address: 'المنطقة الصناعية الثانية، الرياض',
      phone: '+966 50 123 4567',
      email: 'mshari@saudifactory.com',
      taxNumber: '300987654300003'
    },

    // Law Firm Info
    firm: {
      name: 'مكتب المحامي أحمد بن سعد للمحاماة',
      licenseNumber: 'رقم الترخيص: 12345',
      address: 'طريق الملك فهد، الرياض 12345، المملكة العربية السعودية',
      phone: '+966 11 234 5678',
      email: 'info@ahmedlawfirm.sa',
      taxNumber: 'الرقم الضريبي: 300123456700003'
    },

    // Cases included
    cases: [
      {
        caseNumber: '4772077905',
        caseTitle: 'نزاع عمالي - مستحقات نهاية الخدمة',
        invoices: [
          {
            id: 'INV-2025-001',
            date: '15 نوفمبر 2025',
            description: 'خدمات قانونية - قضية نزاع عمالي',
            amount: 45000,
            status: 'معلقة',
            statusColor: 'bg-amber-500'
          }
        ],
        expenses: [
          {
            id: 'EXP-2025-001',
            date: '15 نوفمبر 2025',
            description: 'استئجار قاعة المحكمة',
            amount: 5000
          },
          {
            id: 'EXP-2025-004',
            date: '10 نوفمبر 2025',
            description: 'وقود السيارة - زيارات العميل',
            amount: 450
          }
        ]
      },
      {
        caseNumber: '4772088016',
        caseTitle: 'نزاع تجاري - مطالبة مالية',
        invoices: [
          {
            id: 'INV-2025-002',
            date: '10 نوفمبر 2025',
            description: 'خدمات قانونية - قضية نزاع تجاري',
            amount: 38000,
            status: 'مدفوعة',
            statusColor: 'bg-green-500'
          }
        ],
        expenses: [
          {
            id: 'EXP-2025-003',
            date: '12 نوفمبر 2025',
            description: 'استشارة خبير مالي',
            amount: 8000
          }
        ]
      },
      {
        caseNumber: '4772099127',
        caseTitle: 'قضية تأمينات اجتماعية',
        invoices: [
          {
            id: 'INV-2025-003',
            date: '8 نوفمبر 2025',
            description: 'خدمات قانونية - قضية تأمينات',
            amount: 28000,
            status: 'معلقة',
            statusColor: 'bg-amber-500'
          }
        ],
        expenses: [
          {
            id: 'EXP-2025-005',
            date: '9 نوفمبر 2025',
            description: 'اجتماع عمل مع العميل',
            amount: 320
          },
          {
            id: 'EXP-2025-008',
            date: '7 نوفمبر 2025',
            description: 'طباعة المستندات القانونية',
            amount: 280
          }
        ]
      }
    ],

    // Summary
    summary: {
      totalInvoices: 111000,
      totalExpenses: 14050,
      subtotal: 125050,
      taxRate: 15,
      taxAmount: 18757.50,
      total: 143807.50,
      paid: 38000,
      balance: 105807.50
    },

    // Payment terms
    terms: [
      'الدفع مستحق خلال 30 يوماً من تاريخ الكشف',
      'يتم احتساب ضريبة القيمة المضافة بنسبة 15%',
      'المصروفات المذكورة قابلة للاسترداد',
      'جميع المبالغ بالريال السعودي'
    ],

    notes: 'هذا الكشف يتضمن جميع الفواتير والمصروفات المتعلقة بالقضايا الثلاث المذكورة أعلاه للفترة من أكتوبر إلى نوفمبر 2025.'
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 2
    }).format(amount)
  }

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      {/* Top Navigation Bar */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="flex items-center justify-between px-6 h-16">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm">
              <ArrowRight className="h-4 w-4 ml-2" />
              رجوع للكشوفات
            </Button>
            <div className="h-6 w-px bg-slate-200"></div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">{statement.id}</h1>
              <p className="text-xs text-slate-500">{statement.period}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Printer className="h-4 w-4 ml-2" />
              طباعة
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 ml-2" />
              تحميل PDF
            </Button>
            <Button variant="outline" size="sm">
              <Send className="h-4 w-4 ml-2" />
              إرسال للعميل
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto p-6">
        {/* Main Statement Card */}
        <Card className="border-slate-200 mb-6">
          <CardContent className="p-0">
            {/* Statement Header */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-8">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h1 className="text-3xl font-bold mb-2">كشف حساب</h1>
                  <div className="text-slate-300 text-sm">رقم: {statement.id}</div>
                </div>
                <div className="text-left">
                  <div className="text-sm text-slate-300 mb-1">تاريخ الإصدار</div>
                  <div className="text-lg font-semibold">{statement.date}</div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-8">
                {/* Law Firm */}
                <div>
                  <div className="text-xs text-slate-400 mb-2">من</div>
                  <div className="text-lg font-bold mb-3">{statement.firm.name}</div>
                  <div className="space-y-1 text-sm text-slate-300">
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span>{statement.firm.address}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      <span>{statement.firm.phone}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      <span>{statement.firm.email}</span>
                    </div>
                  </div>
                  <div className="text-xs text-slate-400 mt-3">{statement.firm.licenseNumber}</div>
                  <div className="text-xs text-slate-400">{statement.firm.taxNumber}</div>
                </div>

                {/* Client */}
                <div>
                  <div className="text-xs text-slate-400 mb-2 text-right">إلى</div>
                  <div className="text-lg font-bold mb-1 text-right">{statement.client.name}</div>
                  <div className="text-sm text-slate-300 mb-3 text-right">{statement.client.company}</div>
                  <div className="space-y-1 text-sm text-slate-300">
                    <div className="flex items-start gap-2 justify-end text-right">
                      <span>{statement.client.address}</span>
                      <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    </div>
                    <div className="flex items-center gap-2 justify-end text-right">
                      <span>{statement.client.phone}</span>
                      <Phone className="h-4 w-4" />
                    </div>
                    <div className="flex items-center gap-2 justify-end text-right">
                      <span>{statement.client.email}</span>
                      <Mail className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="text-xs text-slate-400 mt-3 text-right">الرقم الضريبي: {statement.client.taxNumber}</div>
                </div>
              </div>
            </div>

            {/* Balance Summary Alert */}
            <div className="p-6 bg-blue-50 border-b border-blue-100">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-blue-900 mb-1">المبلغ المستحق</div>
                  <div className="text-xs text-blue-700">إجمالي الرصيد المتبقي على جميع القضايا</div>
                </div>
                <div className="text-3xl font-bold text-blue-900">
                  {formatCurrency(statement.summary.balance)}
                </div>
              </div>
            </div>

            {/* Cases Breakdown */}
            <div className="p-8">
              <h2 className="text-lg font-bold text-slate-900 mb-6">تفاصيل القضايا والمصروفات</h2>
              
              {statement.cases.map((case_, caseIdx) => (
                <div key={caseIdx} className="mb-8 last:mb-0">
                  {/* Case Header */}
                  <div className="flex items-center gap-3 mb-4 pb-3 border-b-2 border-slate-200">
                    <Scale className="h-5 w-5 text-slate-600" />
                    <div className="flex-1">
                      <div className="font-bold text-slate-900">{case_.caseTitle}</div>
                      <div className="text-sm text-slate-500">رقم القضية: {case_.caseNumber}</div>
                    </div>
                  </div>

                  {/* Invoices */}
                  <div className="mb-4">
                    <div className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      الفواتير
                    </div>
                    <div className="space-y-2">
                      {case_.invoices.map((invoice, invIdx) => (
                        <div key={invIdx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="text-xs font-mono text-slate-600">{invoice.id}</div>
                            <div className="h-4 w-px bg-slate-300"></div>
                            <div className="text-sm text-slate-700">{invoice.description}</div>
                            <Badge className={invoice.statusColor} size="sm">{invoice.status}</Badge>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-xs text-slate-500">{invoice.date}</div>
                            <div className="text-sm font-bold text-slate-900">{formatCurrency(invoice.amount)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Expenses */}
                  <div>
                    <div className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                      <Receipt className="h-4 w-4" />
                      المصروفات القابلة للاسترداد
                    </div>
                    <div className="space-y-2">
                      {case_.expenses.map((expense, expIdx) => (
                        <div key={expIdx} className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="text-xs font-mono text-slate-600">{expense.id}</div>
                            <div className="h-4 w-px bg-amber-300"></div>
                            <div className="text-sm text-slate-700">{expense.description}</div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-xs text-slate-500">{expense.date}</div>
                            <div className="text-sm font-bold text-amber-900">{formatCurrency(expense.amount)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Case Subtotal */}
                  <div className="flex justify-end mt-4 pt-4 border-t border-slate-200">
                    <div className="text-sm">
                      <span className="text-slate-600 ml-4">مجموع القضية:</span>
                      <span className="font-bold text-slate-900">
                        {formatCurrency(
                          case_.invoices.reduce((sum, inv) => sum + inv.amount, 0) +
                          case_.expenses.reduce((sum, exp) => sum + exp.amount, 0)
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Totals Section */}
            <div className="px-8 pb-8">
              <div className="bg-slate-50 rounded-lg p-6">
                <div className="flex justify-end">
                  <div className="w-96">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center py-2">
                        <span className="text-sm text-slate-600">إجمالي الفواتير</span>
                        <span className="font-semibold text-slate-900">{formatCurrency(statement.summary.totalInvoices)}</span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className="text-sm text-slate-600">إجمالي المصروفات</span>
                        <span className="font-semibold text-slate-900">{formatCurrency(statement.summary.totalExpenses)}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-t border-slate-200">
                        <span className="text-sm text-slate-600">المجموع الفرعي</span>
                        <span className="font-semibold text-slate-900">{formatCurrency(statement.summary.subtotal)}</span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className="text-sm text-slate-600">ضريبة القيمة المضافة ({statement.summary.taxRate}%)</span>
                        <span className="font-semibold text-slate-900">{formatCurrency(statement.summary.taxAmount)}</span>
                      </div>
                      <div className="flex justify-between items-center py-3 border-t-2 border-slate-300">
                        <span className="text-base font-bold text-slate-900">الإجمالي</span>
                        <span className="text-2xl font-bold text-slate-900">{formatCurrency(statement.summary.total)}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-t border-slate-200">
                        <span className="text-sm text-green-700">المدفوع</span>
                        <span className="font-semibold text-green-700">-{formatCurrency(statement.summary.paid)}</span>
                      </div>
                      <div className="flex justify-between items-center py-3 bg-blue-100 rounded-lg px-4 border-2 border-blue-200">
                        <span className="text-base font-bold text-blue-900">الرصيد المستحق</span>
                        <span className="text-2xl font-bold text-blue-900">{formatCurrency(statement.summary.balance)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes Section */}
            <div className="px-8 pb-8">
              <div className="bg-slate-50 rounded-lg p-6">
                <h3 className="text-sm font-bold text-slate-900 mb-3">ملاحظات</h3>
                <p className="text-sm text-slate-700 leading-relaxed mb-4">{statement.notes}</p>
                
                <h3 className="text-sm font-bold text-slate-900 mb-3">الشروط والأحكام</h3>
                <ul className="space-y-2">
                  {statement.terms.map((term, index) => (
                    <li key={index} className="text-xs text-slate-600 flex items-start gap-2">
                      <span className="text-slate-400 mt-0.5">•</span>
                      <span>{term}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 bg-slate-900 text-center">
              <div className="text-sm text-slate-300">
                شكراً لثقتكم في خدماتنا القانونية
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
