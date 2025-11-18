import { useState } from 'react'
import { FileText, Calendar, CheckSquare, DollarSign, Clock, MoreHorizontal, Plus, Upload, User, AlertCircle, CheckCircle, Scale, Building, Mail, Phone, ChevronRight, Search } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'

export default function LegalCaseManagement() {
  const [activeTab, setActiveTab] = useState('overview')

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      {/* Top Navigation Bar */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="flex items-center justify-between px-6 h-16">
          <div className="flex items-center gap-6">
            <h1 className="text-xl font-bold text-slate-900">نظام إدارة القضايا</h1>
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="بحث في القضايا..." 
                className="w-64 pr-10"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto p-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-slate-600 mb-6">
          <span className="hover:text-slate-900 cursor-pointer">القضايا</span>
          <ChevronRight className="h-4 w-4" />
          <span className="hover:text-slate-900 cursor-pointer">القضايا العمالية</span>
          <ChevronRight className="h-4 w-4" />
          <span className="text-slate-900 font-medium">4772077905</span>
        </div>

        {/* Page Header */}
        <div className="bg-white rounded-lg border border-slate-200 mb-6">
          <div className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-lg bg-blue-500 flex items-center justify-center text-white">
                  <Scale className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-2xl font-bold text-slate-900">4772077905</h1>
                    <Badge className="bg-blue-500">قيد النظر</Badge>
                    <Badge variant="outline" className="text-slate-600">عمالية</Badge>
                  </div>
                  <p className="text-lg text-slate-700 mb-2">مشاري بن ناهد بن حسين الرابح ضد المصنع السعودي العربي للمنتجات المعدنية</p>
                  <div className="flex items-center gap-4 text-sm text-slate-600">
                    <div className="flex items-center gap-1">
                      <Building className="h-4 w-4" />
                      <span>المحكمة العمالية - الرياض</span>
                    </div>
                    <span>•</span>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>تاريخ الفتح: 15 يناير 2024</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  إجراء جديد
                </Button>
                <Button variant="outline">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Key Metrics Bar */}
          <div className="border-t border-slate-200 bg-slate-50">
            <div className="grid grid-cols-4 divide-x divide-slate-200">
              <div className="px-6 py-4 text-right">
                <div className="text-sm text-slate-600 mb-1">الجلسة القادمة</div>
                <div className="text-lg font-semibold text-slate-900">20 مارس 2024</div>
                <div className="text-xs text-slate-500">بعد 5 أيام</div>
              </div>
              <div className="px-6 py-4 text-right">
                <div className="text-sm text-slate-600 mb-1">قيمة المطالبة</div>
                <div className="text-lg font-semibold text-slate-900">12,000 ر.س</div>
                <div className="text-xs text-green-600">متوقع الربح: 2,400 ر.س</div>
              </div>
              <div className="px-6 py-4 text-right">
                <div className="text-sm text-slate-600 mb-1">المهام المعلقة</div>
                <div className="text-lg font-semibold text-slate-900">2 مهام</div>
                <div className="text-xs text-amber-600">1 عاجلة</div>
              </div>
              <div className="px-6 py-4 text-right">
                <div className="text-sm text-slate-600 mb-1">نسبة الإنجاز</div>
                <div className="text-lg font-semibold text-slate-900">65%</div>
                <Progress value={65} className="h-1.5 mt-2" />
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-12 gap-6">
          {/* Main Column */}
          <div className="col-span-8">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <div className="flex justify-end">
                <TabsList className="bg-white border border-slate-200 p-1 h-auto inline-flex">
                  <TabsTrigger value="billing" className="data-[state=active]:bg-slate-100">
                    الفواتير
                  </TabsTrigger>
                  <TabsTrigger value="hearings" className="data-[state=active]:bg-slate-100">
                    الجلسات
                  </TabsTrigger>
                  <TabsTrigger value="documents" className="data-[state=active]:bg-slate-100">
                    المستندات
                  </TabsTrigger>
                  <TabsTrigger value="claims" className="data-[state=active]:bg-slate-100">
                    مواضيع الدعوى
                  </TabsTrigger>
                  <TabsTrigger value="parties" className="data-[state=active]:bg-slate-100">
                    الأطراف
                  </TabsTrigger>
                  <TabsTrigger value="activity" className="data-[state=active]:bg-slate-100">
                    السجل الزمني
                  </TabsTrigger>
                  <TabsTrigger value="overview" className="data-[state=active]:bg-slate-100">
                    نظرة عامة
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="mt-6">
                {/* Overview Tab */}
                <TabsContent value="overview" className="mt-0 space-y-6">
                  {/* Case Details */}
                  <Card className="border-slate-200">
                    <CardHeader className="border-b border-slate-200 bg-slate-50">
                      <CardTitle className="text-base font-semibold text-right">تفاصيل القضية</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-4 text-right">
                          <div>
                            <div className="text-xs font-medium text-slate-500 mb-1">رقم القضية - المحكمة العمالية</div>
                            <div className="text-sm font-medium text-slate-900">4772077905</div>
                          </div>
                          <div>
                            <div className="text-xs font-medium text-slate-500 mb-1">رقم القضية - التسوية الودية</div>
                            <div className="text-sm font-medium text-slate-900">144705041170</div>
                          </div>
                          <div>
                            <div className="text-xs font-medium text-slate-500 mb-1">تاريخ الفتح</div>
                            <div className="text-sm text-slate-900">15 يناير 2024</div>
                          </div>
                          <div>
                            <div className="text-xs font-medium text-slate-500 mb-1">الحالة</div>
                            <Badge className="bg-blue-500">قيد النظر</Badge>
                          </div>
                          <div>
                            <div className="text-xs font-medium text-slate-500 mb-1">قيمة المطالبة</div>
                            <div className="text-sm font-semibold text-slate-900">12,000 ر.س</div>
                          </div>
                        </div>
                        <div className="space-y-4 text-right">
                          <div>
                            <div className="text-xs font-medium text-slate-500 mb-1">نوع القضية</div>
                            <Badge variant="outline">قضية عمالية</Badge>
                          </div>
                          <div>
                            <div className="text-xs font-medium text-slate-500 mb-1">المحكمة</div>
                            <div className="text-sm text-slate-900">المحكمة العمالية - الرياض</div>
                          </div>
                          <div>
                            <div className="text-xs font-medium text-slate-500 mb-1">مكتب العمل</div>
                            <div className="text-sm text-slate-900">مكتب عمل الخبر</div>
                          </div>
                        </div>
                      </div>
                      <Separator className="my-6" />
                      <div className="text-right">
                        <div className="text-xs font-medium text-slate-500 mb-2">الوصف</div>
                        <p className="text-sm text-slate-700 leading-relaxed">
                          قضية فصل تعسفي للموظف من شركة XYZ بدون سبب مشروع. تم تقديم الدعوى للمطالبة بالتعويض والرواتب المستحقة.
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Recent Documents */}
                  <Card className="border-slate-200">
                    <CardHeader className="border-b border-slate-200 bg-slate-50">
                      <div className="flex items-center justify-between flex-row-reverse">
                        <CardTitle className="text-base font-semibold">المستندات الأخيرة</CardTitle>
                        <Button variant="ghost" size="sm">عرض الكل</Button>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      {['وكالة شرعية.pdf', 'عقد العمل.pdf', 'خطاب الفصل.pdf'].map((doc, i) => (
                        <div key={i} className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 border-b border-slate-100 last:border-0">
                          <Button variant="ghost" size="sm">تحميل</Button>
                          <div className="flex items-center gap-3 flex-row-reverse">
                            <div className="text-right">
                              <div className="text-sm font-medium text-slate-900">{doc}</div>
                              <div className="text-xs text-slate-500">تم الرفع في 16 يناير 2024</div>
                            </div>
                            <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
                              <FileText className="h-5 w-5 text-blue-600" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  {/* Upcoming Hearings */}
                  <Card className="border-slate-200">
                    <CardHeader className="border-b border-slate-200 bg-slate-50">
                      <div className="flex items-center justify-between flex-row-reverse">
                        <CardTitle className="text-base font-semibold">الجلسات القادمة</CardTitle>
                        <Button variant="ghost" size="sm">
                          <Plus className="h-4 w-4 mr-1" />
                          إضافة جلسة
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="space-y-4">
                        {/* Court Hearing */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <div className="flex items-start justify-between mb-3 gap-3">
                            <div className="text-right flex-1">
                              <div className="font-semibold text-slate-900 mb-1">جلسة مرافعة</div>
                              <div className="text-sm text-slate-600">١٤٤٧/٠٥/٢٦ • 10:35 صباحاً</div>
                              <div className="text-sm text-slate-600">المحكمة العمالية - الدائرة الرابعة</div>
                            </div>
                            <Badge className="bg-blue-500">جديدة</Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm text-right mt-3">
                            <div>
                              <span className="text-slate-500">آلية الانعقاد: </span>
                              <Badge variant="outline" className="text-xs">عن بعد</Badge>
                            </div>
                            <div>
                              <span className="text-slate-500">الدرجة: </span>
                              <span className="text-slate-900">الدرجة الأولى</span>
                            </div>
                          </div>
                          <Separator className="my-3" />
                          <div className="space-y-2">
                            <div className="text-xs font-medium text-slate-600 mb-2">المذكرات المقدمة:</div>
                            <div className="flex items-center justify-between bg-white rounded p-2 hover:bg-slate-50 flex-row-reverse">
                              <div className="flex items-center gap-2">
                                <Badge className="bg-green-500 text-xs">مدعي</Badge>
                                <div className="text-right flex-1 mr-2">
                                  <div className="text-xs font-medium text-slate-900">صحيفة الدعوى</div>
                                  <div className="text-xs text-slate-500">مقدمة من: المدعي • 15 يناير 2024</div>
                                </div>
                              </div>
                              <Button variant="ghost" size="sm" className="text-xs">
                                <FileText className="h-3 w-3 mr-1" />
                                عرض
                              </Button>
                            </div>
                            <div className="flex items-center justify-between bg-white rounded p-2 flex-row-reverse">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700">مدعى عليه</Badge>
                                <div className="text-right flex-1 mr-2">
                                  <div className="text-xs font-medium text-slate-500">مذكرة الدفاع</div>
                                  <div className="text-xs text-slate-400">مقدمة من: المدعى عليه • لم تقدم بعد</div>
                                </div>
                              </div>
                              <Button variant="ghost" size="sm" className="text-xs" disabled>
                                <Clock className="h-3 w-3 mr-1" />
                                منتظر
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Activity Tab */}
                <TabsContent value="activity" className="mt-0">
                  <Card className="border-slate-200">
                    <CardHeader className="border-b border-slate-200 bg-slate-50">
                      <CardTitle className="text-base font-semibold text-right">السجل الزمني</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="space-y-6">
                        {[
                          { action: 'تم تقديم الدعوى للمحكمة', date: '25 يناير 2024', by: 'أحمد المحامي', icon: FileText },
                          { action: 'الشركة رفضت التسوية الودية', date: '20 يناير 2024', by: 'أحمد المحامي', icon: AlertCircle },
                          { action: 'تم التواصل مع العميل', date: '16 يناير 2024', by: 'أحمد المحامي', icon: CheckCircle }
                        ].map((item, i) => (
                          <div key={i} className="flex gap-4">
                            <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                              <item.icon className="h-5 w-5 text-slate-600" />
                            </div>
                            <div className="flex-1 text-right">
                              <div className="text-sm font-medium text-slate-900">{item.action}</div>
                              <div className="text-xs text-slate-500 mt-1">
                                {item.by} • {item.date}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Parties Tab */}
                <TabsContent value="parties" className="mt-0 space-y-6">
                  {/* Plaintiff Information */}
                  <Card className="border-slate-200">
                    <CardHeader className="border-b border-slate-200 bg-slate-50">
                      <CardTitle className="text-base font-semibold text-right">بيانات المدعي</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-4 text-right">
                          <div>
                            <div className="text-xs font-medium text-slate-500 mb-1">الاسم</div>
                            <div className="text-sm text-slate-900">مشاري بن ناهد بن حسين الرابح</div>
                          </div>
                          <div>
                            <div className="text-xs font-medium text-slate-500 mb-1">تاريخ الميلاد (هجري)</div>
                            <div className="text-sm text-slate-900">16/09/1401</div>
                          </div>
                          <div>
                            <div className="text-xs font-medium text-slate-500 mb-1">تاريخ الميلاد (ميلادي)</div>
                            <div className="text-sm text-slate-900">17/07/1981</div>
                          </div>
                          <div>
                            <div className="text-xs font-medium text-slate-500 mb-1">المنطقة</div>
                            <div className="text-sm text-slate-900">المنطقة الشرقية</div>
                          </div>
                          <div>
                            <div className="text-xs font-medium text-slate-500 mb-1">المدينة</div>
                            <div className="text-sm text-slate-900">الخبر</div>
                          </div>
                          <div>
                            <div className="text-xs font-medium text-slate-500 mb-1">المهنة</div>
                            <div className="text-sm text-slate-900">فني ميكانيكي هياكل</div>
                          </div>
                        </div>
                        <div className="space-y-4 text-right">
                          <div>
                            <div className="text-xs font-medium text-slate-500 mb-1">رقم الهوية الوطنية</div>
                            <div className="text-sm font-medium text-slate-900">1008330191</div>
                          </div>
                          <div>
                            <div className="text-xs font-medium text-slate-500 mb-1">الجنسية</div>
                            <Badge variant="outline">العربية السعودية</Badge>
                          </div>
                          <div>
                            <div className="text-xs font-medium text-slate-500 mb-1">الجنس</div>
                            <div className="text-sm text-slate-900">ذكر</div>
                          </div>
                          <div>
                            <div className="text-xs font-medium text-slate-500 mb-1">نوع العامل</div>
                            <Badge variant="outline">عامل</Badge>
                          </div>
                          <div>
                            <div className="text-xs font-medium text-slate-500 mb-1">رقم الهاتف</div>
                            <div className="text-sm text-slate-900">+966501234567</div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Defendant Information - Company/Entity */}
                  <Card className="border-slate-200">
                    <CardHeader className="border-b border-slate-200 bg-slate-50">
                      <CardTitle className="text-base font-semibold text-right">بيانات المدعى عليه</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-4 text-right">
                          <div>
                            <div className="text-xs font-medium text-slate-500 mb-1">اسم الجهة</div>
                            <div className="text-sm text-slate-900">المصنع السعودي العربي للمنتجات المعدنية</div>
                          </div>
                          <div>
                            <div className="text-xs font-medium text-slate-500 mb-1">رقم الملف</div>
                            <div className="text-sm font-medium text-slate-900">4-1187744</div>
                          </div>
                          <div>
                            <div className="text-xs font-medium text-slate-500 mb-1">رقم السجل التجاري</div>
                            <div className="text-sm font-medium text-slate-900">2050037648</div>
                          </div>
                          <div>
                            <div className="text-xs font-medium text-slate-500 mb-1">المنطقة</div>
                            <div className="text-sm text-slate-900">المنطقة الشرقية</div>
                          </div>
                          <div>
                            <div className="text-xs font-medium text-slate-500 mb-1">المدينة</div>
                            <div className="text-sm text-slate-900">الخبر</div>
                          </div>
                        </div>
                        <div className="space-y-4 text-right">
                          <div>
                            <div className="text-xs font-medium text-slate-500 mb-1">نوع المدعى عليه</div>
                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">جهات غير حكومية</Badge>
                          </div>
                          <div>
                            <div className="text-xs font-medium text-slate-500 mb-1">الرقم الوطني الموحد</div>
                            <div className="text-sm font-medium text-slate-900">7013333922</div>
                          </div>
                          <div>
                            <div className="text-xs font-medium text-slate-500 mb-1">رقم الهاتف</div>
                            <div className="text-sm text-slate-900">---</div>
                          </div>
                          <div>
                            <div className="text-xs font-medium text-slate-500 mb-1">البريد الإلكتروني</div>
                            <div className="text-sm text-slate-900">---</div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Work Details */}
                  <Card className="border-slate-200">
                    <CardHeader className="border-b border-slate-200 bg-slate-50">
                      <CardTitle className="text-base font-semibold text-right">بيانات العمل</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-4 text-right">
                          <div>
                            <div className="text-xs font-medium text-slate-500 mb-1">نوع الأجر</div>
                            <Badge variant="outline">شهري</Badge>
                          </div>
                          <div>
                            <div className="text-xs font-medium text-slate-500 mb-1">الراتب الحالي</div>
                            <div className="text-sm font-semibold text-slate-900">5,500 ر.س</div>
                          </div>
                          <div>
                            <div className="text-xs font-medium text-slate-500 mb-1">نوع العقد</div>
                            <Badge variant="outline">غير محدد المدة</Badge>
                          </div>
                          <div>
                            <div className="text-xs font-medium text-slate-500 mb-1">رقم العقد</div>
                            <div className="text-sm text-slate-900">123456789</div>
                          </div>
                          <div>
                            <div className="text-xs font-medium text-slate-500 mb-1">تاريخ بدء العقد (هجري)</div>
                            <div className="text-sm text-slate-900">15/5/1447 هـ</div>
                          </div>
                        </div>
                        <div className="space-y-4 text-right">
                          <div>
                            <div className="text-xs font-medium text-slate-500 mb-1">تاريخ بدء العقد (ميلادي)</div>
                            <div className="text-sm text-slate-900">06 نوفمبر 2025</div>
                          </div>
                          <div>
                            <div className="text-xs font-medium text-slate-500 mb-1">تاريخ أول يوم عمل</div>
                            <div className="text-sm text-slate-900">06 نوفمبر 2025</div>
                          </div>
                          <div>
                            <div className="text-xs font-medium text-slate-500 mb-1">تاريخ آخر يوم عمل</div>
                            <div className="text-sm text-slate-900">17 نوفمبر 2025</div>
                          </div>
                          <div>
                            <div className="text-xs font-medium text-slate-500 mb-1">ما زال على رأس العمل</div>
                            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">لا</Badge>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Workplace Location */}
                  <Card className="border-slate-200">
                    <CardHeader className="border-b border-slate-200 bg-slate-50">
                      <CardTitle className="text-base font-semibold text-right">بيانات مقر العمل</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="grid grid-cols-2 gap-6 text-right">
                        <div>
                          <div className="text-xs font-medium text-slate-500 mb-1">المنطقة</div>
                          <div className="text-sm text-slate-900">المنطقة الشرقية</div>
                        </div>
                        <div>
                          <div className="text-xs font-medium text-slate-500 mb-1">المدينة</div>
                          <div className="text-sm text-slate-900">الخبر</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Claim Topics Tab */}
                <TabsContent value="claims" className="mt-0">
                  <Card className="border-slate-200">
                    <CardHeader className="border-b border-slate-200 bg-slate-50">
                      <div className="flex items-center justify-between flex-row-reverse">
                        <CardTitle className="text-base font-semibold">مواضيع الدعوى</CardTitle>
                        <Button>
                          <Plus className="h-4 w-4 mr-2" />
                          إضافة موضوع
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="p-6 space-y-4">
                      {/* Delayed Wages - Month 1 */}
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Badge className="bg-blue-500">طلب أجر</Badge>
                            <Badge variant="outline">أجر متأخر</Badge>
                          </div>
                          <div className="text-right flex-1 mr-4">
                            <div className="font-semibold text-slate-900 mb-1">أجر متأخر - أكتوبر 2023</div>
                            <div className="text-sm text-slate-600">المبلغ: 4,000 ر.س</div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm text-right">
                          <div>
                            <span className="text-slate-500">من تاريخ (هجري): </span>
                            <span className="text-slate-900">15/03/1445</span>
                          </div>
                          <div>
                            <span className="text-slate-500">من تاريخ (ميلادي): </span>
                            <span className="text-slate-900">01 أكتوبر 2023</span>
                          </div>
                          <div>
                            <span className="text-slate-500">إلى تاريخ (هجري): </span>
                            <span className="text-slate-900">14/04/1445</span>
                          </div>
                          <div>
                            <span className="text-slate-500">إلى تاريخ (ميلادي): </span>
                            <span className="text-slate-900">31 أكتوبر 2023</span>
                          </div>
                        </div>
                      </div>

                      {/* Delayed Wages - Month 2 */}
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Badge className="bg-blue-500">طلب أجر</Badge>
                            <Badge variant="outline">أجر متأخر</Badge>
                          </div>
                          <div className="text-right flex-1 mr-4">
                            <div className="font-semibold text-slate-900 mb-1">أجر متأخر - نوفمبر 2023</div>
                            <div className="text-sm text-slate-600">المبلغ: 4,000 ر.س</div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm text-right">
                          <div>
                            <span className="text-slate-500">من تاريخ (هجري): </span>
                            <span className="text-slate-900">15/04/1445</span>
                          </div>
                          <div>
                            <span className="text-slate-500">من تاريخ (ميلادي): </span>
                            <span className="text-slate-900">01 نوفمبر 2023</span>
                          </div>
                          <div>
                            <span className="text-slate-500">إلى تاريخ (هجري): </span>
                            <span className="text-slate-900">14/05/1445</span>
                          </div>
                          <div>
                            <span className="text-slate-500">إلى تاريخ (ميلادي): </span>
                            <span className="text-slate-900">30 نوفمبر 2023</span>
                          </div>
                        </div>
                      </div>

                      {/* Delayed Wages - Month 3 */}
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Badge className="bg-blue-500">طلب أجر</Badge>
                            <Badge variant="outline">أجر متأخر</Badge>
                          </div>
                          <div className="text-right flex-1 mr-4">
                            <div className="font-semibold text-slate-900 mb-1">أجر متأخر - ديسمبر 2023</div>
                            <div className="text-sm text-slate-600">المبلغ: 4,000 ر.س</div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm text-right">
                          <div>
                            <span className="text-slate-500">من تاريخ (هجري): </span>
                            <span className="text-slate-900">15/05/1445</span>
                          </div>
                          <div>
                            <span className="text-slate-500">من تاريخ (ميلادي): </span>
                            <span className="text-slate-900">01 ديسمبر 2023</span>
                          </div>
                          <div>
                            <span className="text-slate-500">إلى تاريخ (هجري): </span>
                            <span className="text-slate-900">15/06/1445</span>
                          </div>
                          <div>
                            <span className="text-slate-500">إلى تاريخ (ميلادي): </span>
                            <span className="text-slate-900">31 ديسمبر 2023</span>
                          </div>
                        </div>
                      </div>

                      {/* Total Summary */}
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
                        <div className="flex justify-between items-center text-right flex-row-reverse">
                          <div className="text-sm font-semibold text-blue-900">إجمالي المطالبات (3 مواضيع)</div>
                          <div className="text-lg font-bold text-blue-900">12,000 ر.س</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Documents Tab */}
                <TabsContent value="documents" className="mt-0">
                  <Card className="border-slate-200">
                    <CardHeader className="border-b border-slate-200 bg-slate-50">
                      <div className="flex items-center justify-between flex-row-reverse">
                        <CardTitle className="text-base font-semibold">المستندات (7)</CardTitle>
                        <Button>
                          <Upload className="h-4 w-4 mr-2" />
                          رفع مستند
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      {/* Memos Section */}
                      <div className="bg-blue-50 px-6 py-3 border-b border-blue-200">
                        <div className="text-xs font-semibold text-blue-900 text-right">المذكرات القانونية</div>
                      </div>
                      {[
                        { name: 'صحيفة الدعوى.pdf', category: 'صحيفة دعوى', size: '850 KB', date: '15 يناير 2024', party: 'مدعي' },
                        { name: 'طلب التسوية الودية.pdf', category: 'مذكرة', size: '420 KB', date: '20 مارس 2024', party: 'مدعي' },
                        { name: 'مذكرة توضيحية.pdf', category: 'مذكرة', size: '520 KB', date: '10 أبريل 2024', party: 'مدعي' }
                      ].map((doc, i) => (
                        <div key={i} className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 border-b border-slate-100 flex-row-reverse">
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm">معاينة</Button>
                            <Button variant="ghost" size="sm">تحميل</Button>
                          </div>
                          <div className="flex items-center gap-3 flex-row-reverse">
                            <div className="text-right">
                              <div className="flex items-center gap-2 flex-row-reverse">
                                <Badge className={doc.party === 'مدعي' ? 'bg-green-500 text-xs' : 'bg-amber-500 text-xs'}>
                                  {doc.party}
                                </Badge>
                                <div className="text-sm font-medium text-slate-900">{doc.name}</div>
                              </div>
                              <div className="text-xs text-slate-500">{doc.size} • {doc.category} • {doc.date}</div>
                            </div>
                            <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
                              <FileText className="h-5 w-5 text-blue-600" />
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      {/* Evidence Section */}
                      <div className="bg-slate-100 px-6 py-3 border-b border-slate-200">
                        <div className="text-xs font-semibold text-slate-700 text-right">الأدلة والمستندات الداعمة</div>
                      </div>
                      {[
                        { name: 'وكالة شرعية.pdf', category: 'وكالة', size: '2.5 MB', date: '16 يناير 2024' },
                        { name: 'عقد العمل.pdf', category: 'عقد عمل', size: '1.8 MB', date: '16 يناير 2024' },
                        { name: 'خطاب الفصل.pdf', category: 'خطاب فصل', size: '500 KB', date: '17 يناير 2024' },
                        { name: 'مستندات أخرى.zip', category: 'دليل', size: '5.2 MB', date: '20 يناير 2024' }
                      ].map((doc, i) => (
                        <div key={i} className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 border-b border-slate-100 last:border-0 flex-row-reverse">
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm">معاينة</Button>
                            <Button variant="ghost" size="sm">تحميل</Button>
                          </div>
                          <div className="flex items-center gap-3 flex-row-reverse">
                            <div className="text-right">
                              <div className="text-sm font-medium text-slate-900">{doc.name}</div>
                              <div className="text-xs text-slate-500">{doc.size} • {doc.category} • {doc.date}</div>
                            </div>
                            <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center">
                              <FileText className="h-5 w-5 text-slate-600" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Hearings Tab */}
                <TabsContent value="hearings" className="mt-0">
                  <Card className="border-slate-200">
                    <CardHeader className="border-b border-slate-200 bg-slate-50">
                      <div className="flex items-center justify-between flex-row-reverse">
                        <CardTitle className="text-base font-semibold">الجلسات والمذكرات</CardTitle>
                        <Button>
                          <Plus className="h-4 w-4 mr-2" />
                          إضافة موعد
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="p-6 space-y-4">
                      {/* Court Hearing */}
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-3 gap-3">
                          <div className="text-right flex-1">
                            <div className="font-semibold text-slate-900 mb-1">جلسة مرافعة</div>
                            <div className="text-sm text-slate-600">١٤٤٧/٠٥/٢٦ • 10:35 صباحاً</div>
                            <div className="text-sm text-slate-600">المحكمة العمالية - الدائرة الرابعة</div>
                          </div>
                          <Badge className="bg-blue-500">جديدة</Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm text-right mt-3">
                          <div>
                            <span className="text-slate-500">آلية الانعقاد: </span>
                            <Badge variant="outline" className="text-xs">عن بعد</Badge>
                          </div>
                          <div>
                            <span className="text-slate-500">الدرجة: </span>
                            <span className="text-slate-900">الدرجة الأولى</span>
                          </div>
                        </div>
                        <Separator className="my-3" />
                        <div className="space-y-2">
                          <div className="text-xs font-medium text-slate-600 mb-2">المذكرات المقدمة:</div>
                          <div className="flex items-center justify-between bg-white rounded p-2 hover:bg-slate-50 flex-row-reverse">
                            <div className="flex items-center gap-2">
                              <Badge className="bg-green-500 text-xs">مدعي</Badge>
                              <div className="text-right flex-1 mr-2">
                                <div className="text-xs font-medium text-slate-900">صحيفة الدعوى</div>
                                <div className="text-xs text-slate-500">مقدمة من: المدعي • 15 يناير 2024</div>
                              </div>
                            </div>
                            <Button variant="ghost" size="sm" className="text-xs">
                              <FileText className="h-3 w-3 mr-1" />
                              عرض
                            </Button>
                          </div>
                          <div className="flex items-center justify-between bg-white rounded p-2 flex-row-reverse">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700">مدعى عليه</Badge>
                              <div className="text-right flex-1 mr-2">
                                <div className="text-xs font-medium text-slate-500">مذكرة الدفاع</div>
                                <div className="text-xs text-slate-400">مقدمة من: المدعى عليه • لم تقدم بعد</div>
                              </div>
                            </div>
                            <Button variant="ghost" size="sm" className="text-xs" disabled>
                              <Clock className="h-3 w-3 mr-1" />
                              منتظر
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* Labor Office - Second Appointment */}
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-3 gap-3">
                          <div className="text-right flex-1">
                            <div className="font-semibold text-slate-900 mb-1">التسوية الودية</div>
                            <div className="text-sm text-slate-600">١٤٤٧/٠٤/١٥ • 9:00 صباحاً</div>
                            <div className="text-sm text-slate-600">مكتب العمل - الخبر</div>
                          </div>
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            مكتملة
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm text-right mt-3">
                          <div>
                            <span className="text-slate-500">الموعد: </span>
                            <span className="text-slate-900">الموعد الثاني</span>
                          </div>
                          <div>
                            <span className="text-slate-500">النتيجة: </span>
                            <span className="text-slate-900">عدم التوصل لتسوية</span>
                          </div>
                        </div>
                        <Separator className="my-3" />
                        <div className="space-y-2">
                          <div className="text-xs font-medium text-slate-600 mb-2">المذكرات المقدمة:</div>
                          <div className="flex items-center justify-between bg-white rounded p-2 hover:bg-slate-50 flex-row-reverse">
                            <div className="flex items-center gap-2">
                              <Badge className="bg-green-500 text-xs">مدعي</Badge>
                              <div className="text-right flex-1 mr-2">
                                <div className="text-xs font-medium text-slate-900">مذكرة توضيحية</div>
                                <div className="text-xs text-slate-500">مقدمة من: المدعي • 10 أبريل 2024</div>
                              </div>
                            </div>
                            <Button variant="ghost" size="sm" className="text-xs">
                              <FileText className="h-3 w-3 mr-1" />
                              عرض
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* Labor Office - First Appointment */}
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-3 gap-3">
                          <div className="text-right flex-1">
                            <div className="font-semibold text-slate-900 mb-1">التسوية الودية</div>
                            <div className="text-sm text-slate-600">١٤٤٧/٠٣/٢٨ • 10:00 صباحاً</div>
                            <div className="text-sm text-slate-600">مكتب العمل - الخبر</div>
                          </div>
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            مكتملة
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm text-right mt-3">
                          <div>
                            <span className="text-slate-500">الموعد: </span>
                            <span className="text-slate-900">الموعد الأول</span>
                          </div>
                          <div>
                            <span className="text-slate-500">النتيجة: </span>
                            <span className="text-slate-900">تأجيل للموعد الثاني</span>
                          </div>
                        </div>
                        <Separator className="my-3" />
                        <div className="space-y-2">
                          <div className="text-xs font-medium text-slate-600 mb-2">المذكرات المقدمة:</div>
                          <div className="flex items-center justify-between bg-white rounded p-2 hover:bg-slate-50 flex-row-reverse">
                            <div className="flex items-center gap-2">
                              <Badge className="bg-green-500 text-xs">مدعي</Badge>
                              <div className="text-right flex-1 mr-2">
                                <div className="text-xs font-medium text-slate-900">طلب التسوية الودية</div>
                                <div className="text-xs text-slate-500">مقدمة من: المدعي • 20 مارس 2024</div>
                              </div>
                            </div>
                            <Button variant="ghost" size="sm" className="text-xs">
                              <FileText className="h-3 w-3 mr-1" />
                              عرض
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Billing Tab */}
                <TabsContent value="billing" className="mt-0">
                  <div className="space-y-6">
                    <Card className="border-slate-200">
                      <CardHeader className="border-b border-slate-200 bg-slate-50">
                        <CardTitle className="text-base font-semibold text-right">اتفاقية الأتعاب</CardTitle>
                      </CardHeader>
                      <CardContent className="p-6">
                        <div className="grid grid-cols-2 gap-6 mb-6">
                          <div className="text-right">
                            <div className="text-xs font-medium text-slate-500 mb-1">المبلغ المتوقع</div>
                            <div className="text-lg font-semibold text-slate-900">2,400 ر.س</div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs font-medium text-slate-500 mb-1">نوع الأتعاب</div>
                            <Badge variant="outline">نسبة من المبلغ (20%)</Badge>
                          </div>
                        </div>
                        <Separator className="my-6" />
                        <div className="space-y-4">
                          <div className="flex justify-between flex-row-reverse">
                            <span className="text-sm text-slate-600">المدفوع</span>
                            <span className="text-sm font-semibold text-green-600">1,200 ر.س</span>
                          </div>
                          <div className="flex justify-between flex-row-reverse">
                            <span className="text-sm text-slate-600">المتبقي</span>
                            <span className="text-sm font-semibold text-slate-900">1,200 ر.س</span>
                          </div>
                          <Progress value={50} className="h-2" />
                          <div className="text-xs text-center text-slate-500">تم دفع 50% من الأتعاب</div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-slate-200">
                      <CardHeader className="border-b border-slate-200 bg-slate-50">
                        <CardTitle className="text-base font-semibold text-right">المصروفات</CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">
                        {[
                          { desc: 'رسوم المحكمة', amount: '1,000 ر.س', date: '25 يناير 2024', status: 'paid' },
                          { desc: 'رسوم الخبير', amount: '2,500 ر.س', date: '5 فبراير 2024', status: 'pending' }
                        ].map((expense, i) => (
                          <div key={i} className="flex items-center justify-between px-6 py-4 border-b border-slate-100 last:border-0 flex-row-reverse">
                            <div className="text-right">
                              <div className="text-sm font-medium text-slate-900">{expense.desc}</div>
                              <div className="text-xs text-slate-500">{expense.date}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-semibold text-slate-900">{expense.amount}</div>
                              <Badge variant={expense.status === 'paid' ? 'outline' : 'secondary'} className="text-xs">
                                {expense.status === 'paid' ? 'مستردة' : 'معلقة'}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="col-span-4 space-y-6">
            {/* Team Members */}
            <Card className="border-slate-200">
              <CardHeader className="border-b border-slate-200 bg-slate-50">
                <CardTitle className="text-base font-semibold text-right">فريق القضية</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                    أم
                  </div>
                  <div className="flex-1 text-right">
                    <div className="font-medium text-sm text-slate-900">أحمد المحامي</div>
                    <div className="text-xs text-slate-500 mb-2">المحامي المسؤول</div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs text-slate-600 justify-end">
                        <span>ahmed@law.sa</span>
                        <Mail className="h-3 w-3" />
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-600 justify-end">
                        <span>+966501234567</span>
                        <Phone className="h-3 w-3" />
                      </div>
                    </div>
                  </div>
                </div>
                <Separator />
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-green-500 flex items-center justify-center text-white font-bold">
                    مع
                  </div>
                  <div className="flex-1 text-right">
                    <div className="font-medium text-sm text-slate-900">محمد العميل</div>
                    <div className="text-xs text-slate-500 mb-2">العميل</div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs text-slate-600 justify-end">
                        <span>شركة ABC</span>
                        <Building className="h-3 w-3" />
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-600 justify-end">
                        <span>mohamed@email.com</span>
                        <Mail className="h-3 w-3" />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tasks */}
            <Card className="border-slate-200">
              <CardHeader className="border-b border-slate-200 bg-slate-50">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold">المهام</CardTitle>
                  <Button variant="ghost" size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-2">
                {[
                  { task: 'جمع شهادات الشهود', priority: 'high', done: false },
                  { task: 'التواصل مع الخبير القانوني', priority: 'medium', done: false },
                  { task: 'تحضير المذكرة الافتتاحية', priority: 'high', done: true }
                ].map((item, i) => (
                  <div key={i} className={`flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 ${item.done ? 'opacity-50' : ''}`}>
                    <div className="flex-1 text-right">
                      <div className={`text-sm ${item.done ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                        {item.task}
                      </div>
                      {!item.done && (
                        <Badge variant={item.priority === 'high' ? 'destructive' : 'secondary'} className="text-xs mt-1">
                          {item.priority === 'high' ? 'عاجل' : 'متوسط'}
                        </Badge>
                      )}
                    </div>
                    <input type="checkbox" checked={item.done} className="mt-1" readOnly />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card className="border-slate-200">
              <CardHeader className="border-b border-slate-200 bg-slate-50">
                <CardTitle className="text-base font-semibold text-right">إحصائيات سريعة</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="flex justify-between items-center flex-row-reverse">
                  <span className="text-sm text-slate-600">عدد الجلسات</span>
                  <span className="text-lg font-semibold text-slate-900">2</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center flex-row-reverse">
                  <span className="text-sm text-slate-600">المستندات</span>
                  <span className="text-lg font-semibold text-slate-900">4</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center flex-row-reverse">
                  <span className="text-sm text-slate-600">الأيام المفتوحة</span>
                  <span className="text-lg font-semibold text-slate-900">31 يوم</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
