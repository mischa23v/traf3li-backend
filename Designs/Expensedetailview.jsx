import { useState } from 'react'
import { ArrowRight, Download, Send, Edit, Trash2, Check, X, Printer, Mail, Phone, MapPin, Calendar, CreditCard, FileText } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export default function InvoiceDetailView() {
  const [showPaymentModal, setShowPaymentModal] = useState(false)

  // Sample invoice data
  const invoice = {
    id: 'INV-2025-001',
    status: 'معلقة',
    statusColor: 'bg-amber-500',
    issueDate: '15 نوفمبر 2025',
    dueDate: '15 ديسمبر 2025',
    
    // Law Firm Info
    firm: {
      name: 'مكتب المحامي أحمد بن سعد للمحاماة',
      licenseNumber: 'رقم الترخيص: 12345',
      address: 'طريق الملك فهد، الرياض 12345، المملكة العربية السعودية',
      phone: '+966 11 234 5678',
      email: 'info@ahmedlawfirm.sa',
      taxNumber: 'الرقم الضريبي: 300123456700003'
    },

    // Client Info
    client: {
      name: 'مشاري بن ناهد الرابح',
      company: 'المصنع السعودي للمنتجات المعدنية',
      address: 'المنطقة الصناعية الثانية، الرياض',
      phone: '+966 50 123 4567',
      email: 'mshari@saudifactory.com',
      taxNumber: '300987654300003'
    },

    // Case Reference
    caseNumber: '4772077905',
    caseTitle: 'نزاع عمالي - مستحقات نهاية الخدمة',

    // Line Items
    items: [
      {
        id: 1,
        description: 'استشارة قانونية ودراسة القضية',
        quantity: 1,
        unit: 'خدمة',
        rate: 15000,
        amount: 15000
      },
      {
        id: 2,
        description: 'صياغة ومراجعة المذكرات القانونية',
        quantity: 3,
        unit: 'مذكرة',
        rate: 5000,
        amount: 15000
      },
      {
        id: 3,
        description: 'حضور جلسات المحكمة',
        quantity: 2,
        unit: 'جلسة',
        rate: 7000,
        amount: 14000
      },
      {
        id: 4,
        description: 'اجتماعات مع العميل',
        quantity: 4,
        unit: 'ساعة',
        rate: 500,
        amount: 2000
      }
    ],

    // Totals
    subtotal: 46000,
    taxRate: 15,
    taxAmount: 6900,
    total: 52900,

    // Payment Info
    bankDetails: {
      bankName: 'البنك الأهلي السعودي',
      accountName: 'مكتب المحامي أحمد بن سعد',
      accountNumber: 'SA12 3456 7890 1234 5678 9012',
      iban: 'SA12 3456 7890 1234 5678 9012'
    },

    // Notes
    notes: 'يرجى السداد خلال 30 يوماً من تاريخ الإصدار. في حالة التأخر عن السداد، سيتم احتساب فائدة تأخير بنسبة 2% شهرياً.',
    
    // Terms
    terms: [
      'الدفع مستحق خلال 30 يوماً من تاريخ الفاتورة',
      'يتم احتساب ضريبة القيمة المضافة بنسبة 15%',
      'في حالة التأخر في السداد، يتم احتساب غرامة تأخير',
      'جميع الأسعار بالريال السعودي'
    ]
  }

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
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm">
              <ArrowRight className="h-4 w-4 ml-2" />
              رجوع للفواتير
            </Button>
            <div className="h-6 w-px bg-slate-200"></div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">{invoice.id}</h1>
              <Badge className={invoice.statusColor}>{invoice.status}</Badge>
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
            <Button variant="outline" size="sm">
              <Edit className="h-4 w-4 ml-2" />
              تعديل
            </Button>
            {invoice.status === 'معلقة' && (
              <Button>
                <Check className="h-4 w-4 ml-2" />
                تسجيل الدفع
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto p-6">
        {/* Alert Banner for Pending/Overdue */}
        {invoice.status === 'معلقة' && (
          <Card className="border-amber-200 bg-amber-50 mb-6">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-amber-700" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-amber-900">فاتورة معلقة</div>
                  <div className="text-xs text-amber-700">الموعد النهائي للدفع: {invoice.dueDate} (باقي 28 يوم)</div>
                </div>
                <Button size="sm" className="bg-amber-600 hover:bg-amber-700">
                  إرسال تذكير
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Invoice Card */}
        <Card className="border-slate-200 mb-6">
          <CardContent className="p-0">
            {/* Invoice Header */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-8">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h1 className="text-3xl font-bold mb-2">فاتورة</h1>
                  <div className="text-slate-300 text-sm">رقم: {invoice.id}</div>
                </div>
                <div className="text-right">
                  <Badge className={invoice.statusColor}>{invoice.status}</Badge>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <div className="text-xs text-slate-400 mb-2">من</div>
                  <div className="text-lg font-bold mb-3">{invoice.firm.name}</div>
                  <div className="space-y-1 text-sm text-slate-300">
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span>{invoice.firm.address}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      <span>{invoice.firm.phone}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      <span>{invoice.firm.email}</span>
                    </div>
                  </div>
                  <div className="text-xs text-slate-400 mt-3">{invoice.firm.licenseNumber}</div>
                  <div className="text-xs text-slate-400">{invoice.firm.taxNumber}</div>
                </div>

                <div>
                  <div className="text-xs text-slate-400 mb-2 text-right">إلى</div>
                  <div className="text-lg font-bold mb-1 text-right">{invoice.client.name}</div>
                  <div className="text-sm text-slate-300 mb-3 text-right">{invoice.client.company}</div>
                  <div className="space-y-1 text-sm text-slate-300">
                    <div className="flex items-start gap-2 justify-end text-right">
                      <span>{invoice.client.address}</span>
                      <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    </div>
                    <div className="flex items-center gap-2 justify-end text-right">
                      <span>{invoice.client.phone}</span>
                      <Phone className="h-4 w-4" />
                    </div>
                    <div className="flex items-center gap-2 justify-end text-right">
                      <span>{invoice.client.email}</span>
                      <Mail className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="text-xs text-slate-400 mt-3 text-right">الرقم الضريبي: {invoice.client.taxNumber}</div>
                </div>
              </div>
            </div>

            {/* Invoice Details Section */}
            <div className="p-8 border-b border-slate-200">
              <div className="grid grid-cols-4 gap-6">
                <div>
                  <div className="text-xs text-slate-500 mb-1">تاريخ الإصدار</div>
                  <div className="font-semibold text-slate-900">{invoice.issueDate}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 mb-1">تاريخ الاستحقاق</div>
                  <div className="font-semibold text-slate-900">{invoice.dueDate}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 mb-1">رقم القضية</div>
                  <div className="font-semibold text-slate-900">{invoice.caseNumber}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 mb-1">موضوع القضية</div>
                  <div className="font-semibold text-slate-900 text-sm">{invoice.caseTitle}</div>
                </div>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="p-8">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-slate-200">
                    <th className="text-right py-3 text-xs font-semibold text-slate-600">#</th>
                    <th className="text-right py-3 text-xs font-semibold text-slate-600">الوصف</th>
                    <th className="text-right py-3 text-xs font-semibold text-slate-600">الكمية</th>
                    <th className="text-right py-3 text-xs font-semibold text-slate-600">السعر</th>
                    <th className="text-right py-3 text-xs font-semibold text-slate-600">المبلغ</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items.map((item, index) => (
                    <tr key={item.id} className="border-b border-slate-100">
                      <td className="py-4 text-slate-500">{index + 1}</td>
                      <td className="py-4">
                        <div className="font-medium text-slate-900">{item.description}</div>
                      </td>
                      <td className="py-4 text-slate-700">{item.quantity} {item.unit}</td>
                      <td className="py-4 text-slate-700">{formatCurrency(item.rate)}</td>
                      <td className="py-4 font-semibold text-slate-900">{formatCurrency(item.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals Section */}
              <div className="mt-8 flex justify-end">
                <div className="w-80">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2">
                      <span className="text-sm text-slate-600">المجموع الفرعي</span>
                      <span className="font-semibold text-slate-900">{formatCurrency(invoice.subtotal)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-sm text-slate-600">ضريبة القيمة المضافة ({invoice.taxRate}%)</span>
                      <span className="font-semibold text-slate-900">{formatCurrency(invoice.taxAmount)}</span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-t-2 border-slate-200">
                      <span className="text-base font-bold text-slate-900">الإجمالي</span>
                      <span className="text-2xl font-bold text-slate-900">{formatCurrency(invoice.total)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Information */}
            <div className="p-8 bg-slate-50 border-t border-slate-200">
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    معلومات الدفع
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">البنك:</span>
                      <span className="font-medium text-slate-900">{invoice.bankDetails.bankName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">اسم الحساب:</span>
                      <span className="font-medium text-slate-900">{invoice.bankDetails.accountName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">رقم الحساب:</span>
                      <span className="font-mono text-slate-900 font-medium">{invoice.bankDetails.accountNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">IBAN:</span>
                      <span className="font-mono text-slate-900 font-medium">{invoice.bankDetails.iban}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    ملاحظات
                  </h3>
                  <p className="text-sm text-slate-700 leading-relaxed">{invoice.notes}</p>
                </div>
              </div>

              {/* Terms and Conditions */}
              <div className="mt-6 pt-6 border-t border-slate-200">
                <h3 className="text-sm font-bold text-slate-900 mb-3">الشروط والأحكام</h3>
                <ul className="space-y-2">
                  {invoice.terms.map((term, index) => (
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

        {/* Activity Timeline */}
        <Card className="border-slate-200">
          <CardContent className="p-6">
            <h3 className="text-sm font-bold text-slate-900 mb-4">سجل الأنشطة</h3>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <FileText className="h-4 w-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-slate-900">تم إنشاء الفاتورة</div>
                  <div className="text-xs text-slate-500">15 نوفمبر 2025، 10:30 صباحاً</div>
                </div>
              </div>
              
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                  <Send className="h-4 w-4 text-green-600" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-slate-900">تم إرسال الفاتورة للعميل</div>
                  <div className="text-xs text-slate-500">15 نوفمبر 2025، 11:15 صباحاً</div>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                  <Mail className="h-4 w-4 text-slate-600" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-slate-900">تم فتح البريد الإلكتروني</div>
                  <div className="text-xs text-slate-500">16 نوفمبر 2025، 9:45 صباحاً</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}