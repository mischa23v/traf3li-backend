import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { DataTable } from '@/components/data-table';
import {
  Upload,
  File,
  FileText,
  Image as ImageIcon,
  FileVideo,
  FileAudio,
  Download,
  Eye,
  Trash2,
  FolderOpen,
  Search,
  Filter,
  Loader2,
  Share2,
  Lock,
  Clock,
} from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { toast } from 'sonner';
import {
  useDocuments,
  useUploadDocument,
  useDeleteDocument,
  useDocumentStats,
} from './hooks/use-documents';

// Types
interface Document {
  _id: string;
  fileName: string;
  originalName: string;
  fileType: string;
  fileSize: number;
  url: string;
  category: 'contract' | 'judgment' | 'evidence' | 'correspondence' | 'pleading' | 'other';
  caseId?: {
    _id: string;
    caseNumber: string;
    title: string;
  };
  description?: string;
  tags?: string[];
  isConfidential: boolean;
  isEncrypted: boolean;
  uploadedBy: {
    _id: string;
    fullName: string;
  };
  version: number;
  parentDocumentId?: string; // For versioning
  createdAt: string;
  updatedAt: string;
}

export default function DocumentsPage() {
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterCase, setFilterCase] = useState<string>('all');
  const queryClient = useQueryClient();

  // Fetch documents
  const { data: documents = [], isLoading } = useDocuments({
    category: filterCategory !== 'all' ? filterCategory : undefined,
    caseId: filterCase !== 'all' ? filterCase : undefined,
    search: searchQuery || undefined,
  });

  // Stats
  const { data: stats } = useDocumentStats();

  // Delete mutation
  const deleteDocumentMutation = useDeleteDocument();

  // Document categories
  const categories = [
    { value: 'contract', label: 'عقد', icon: FileText, color: 'bg-blue-500' },
    { value: 'judgment', label: 'حكم', icon: FileText, color: 'bg-red-500' },
    { value: 'evidence', label: 'دليل', icon: ImageIcon, color: 'bg-purple-500' },
    { value: 'correspondence', label: 'مراسلات', icon: FileText, color: 'bg-green-500' },
    { value: 'pleading', label: 'مذكرة', icon: FileText, color: 'bg-orange-500' },
    { value: 'other', label: 'أخرى', icon: File, color: 'bg-gray-500' },
  ];

  // Get file icon
  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return ImageIcon;
    if (fileType.startsWith('video/')) return FileVideo;
    if (fileType.startsWith('audio/')) return FileAudio;
    if (fileType.includes('pdf')) return FileText;
    return File;
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} بايت`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} ك.ب`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} م.ب`;
  };

  // Category badge
  const CategoryBadge = ({ category }: { category: Document['category'] }) => {
    const config = categories.find((c) => c.value === category);
    return (
      <Badge className={`${config?.color} text-white`}>
        {config?.label}
      </Badge>
    );
  };

  // Handle delete
  const handleDeleteDocument = async (documentId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا المستند؟ لا يمكن التراجع عن هذا الإجراء.')) {
      return;
    }

    try {
      await deleteDocumentMutation.mutateAsync(documentId);
      toast.success('تم حذف المستند بنجاح');
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['document-stats'] });
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'فشل حذف المستند');
    }
  };

  // Handle download
  const handleDownload = (document: Document) => {
    const link = window.document.createElement('a');
    link.href = document.url;
    link.download = document.originalName;
    link.click();
    toast.success('جاري تنزيل المستند...');
  };

  // Table columns
  const columns: ColumnDef<Document>[] = [
    {
      accessorKey: 'fileName',
      header: 'اسم الملف',
      cell: ({ row }) => {
        const Icon = getFileIcon(row.original.fileType);
        return (
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-muted">
              <Icon className="h-4 w-4" />
            </div>
            <div>
              <div className="font-medium">{row.original.originalName}</div>
              <div className="text-xs text-muted-foreground flex items-center gap-2">
                {formatFileSize(row.original.fileSize)}
                {row.original.isConfidential && (
                  <Badge variant="destructive" className="text-xs">
                    <Lock className="h-3 w-3 ml-1" />
                    سري
                  </Badge>
                )}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'category',
      header: 'الفئة',
      cell: ({ row }) => <CategoryBadge category={row.original.category} />,
    },
    {
      accessorKey: 'caseId',
      header: 'القضية',
      cell: ({ row }) => (
        <div className="text-sm">
          {row.original.caseId ? (
            <div>
              <div className="font-medium">{row.original.caseId.caseNumber}</div>
              <div className="text-xs text-muted-foreground">
                {row.original.caseId.title}
              </div>
            </div>
          ) : (
            <span className="text-muted-foreground">غير مرتبط</span>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'uploadedBy',
      header: 'رفع بواسطة',
      cell: ({ row }) => (
        <div className="text-sm">{row.original.uploadedBy.fullName}</div>
      ),
    },
    {
      accessorKey: 'createdAt',
      header: 'تاريخ الرفع',
      cell: ({ row }) => (
        <div className="text-sm">
          {format(new Date(row.original.createdAt), 'dd MMM yyyy', { locale: ar })}
        </div>
      ),
    },
    {
      id: 'actions',
      header: 'الإجراءات',
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => window.open(row.original.url, '_blank')}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleDownload(row.original)}
          >
            <Download className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleDeleteDocument(row.original._id)}
            disabled={deleteDocumentMutation.isPending}
          >
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">المستندات</h1>
          <p className="text-muted-foreground">إدارة وتنظيم ملفات القضايا</p>
        </div>
        <Button onClick={() => setIsUploadDialogOpen(true)}>
          <Upload className="h-4 w-4 ml-2" />
          رفع مستند
        </Button>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>إجمالي المستندات</CardDescription>
              <CardTitle className="text-4xl">{stats.totalDocuments}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>مستندات سرية</CardDescription>
              <CardTitle className="text-4xl text-red-600">
                {stats.confidentialDocuments}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>حجم التخزين</CardDescription>
              <CardTitle className="text-4xl">
                {formatFileSize(stats.totalStorageUsed)}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>هذا الشهر</CardDescription>
              <CardTitle className="text-4xl text-green-600">
                {stats.documentsThisMonth}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>
      )}

      {/* Category Breakdown */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle>المستندات حسب الفئة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {stats.byCategory.map((cat) => {
                const config = categories.find((c) => c.value === cat.category);
                const Icon = config?.icon || File;
                return (
                  <div
                    key={cat.category}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${config?.color}`}>
                        <Icon className="h-4 w-4 text-white" />
                      </div>
                      <span className="font-medium">{config?.label}</span>
                    </div>
                    <span className="text-lg font-bold">{cat.count}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="بحث في المستندات..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-10"
                />
              </div>
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="كل الفئات" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الفئات</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterCase} onValueChange={setFilterCase}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="كل القضايا" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل القضايا</SelectItem>
                {/* Cases will be loaded from API */}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Documents Table */}
      <Card>
        <CardHeader>
          <CardTitle>قائمة المستندات</CardTitle>
          <CardDescription>
            جميع المستندات المرفوعة ({documents.length})
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-8">
              <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchQuery || filterCategory !== 'all' || filterCase !== 'all'
                  ? 'لم يتم العثور على مستندات'
                  : 'لا توجد مستندات بعد'}
              </p>
            </div>
          ) : (
            <DataTable columns={columns} data={documents} />
          )}
        </CardContent>
      </Card>

      {/* Upload Dialog */}
      <UploadDocumentDialog
        open={isUploadDialogOpen}
        onOpenChange={setIsUploadDialogOpen}
        categories={categories}
      />
    </div>
  );
}

// Upload Document Dialog Component
interface UploadDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: any[];
}

function UploadDocumentDialog({
  open,
  onOpenChange,
  categories,
}: UploadDocumentDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    category: 'other' as Document['category'],
    caseId: '',
    description: '',
    tags: '',
    isConfidential: false,
  });

  const queryClient = useQueryClient();
  const uploadMutation = useUploadDocument();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file) {
      toast.error('الرجاء اختيار ملف');
      return;
    }

    try {
      const uploadData = new FormData();
      uploadData.append('file', file);
      uploadData.append('category', formData.category);
      uploadData.append('description', formData.description);
      uploadData.append('isConfidential', String(formData.isConfidential));
      if (formData.caseId) uploadData.append('caseId', formData.caseId);
      if (formData.tags) {
        const tagsArray = formData.tags.split(',').map((t) => t.trim());
        uploadData.append('tags', JSON.stringify(tagsArray));
      }

      await uploadMutation.mutateAsync(uploadData);
      toast.success('تم رفع المستند بنجاح');
      onOpenChange(false);
      setFile(null);
      setFormData({
        category: 'other',
        caseId: '',
        description: '',
        tags: '',
        isConfidential: false,
      });
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['document-stats'] });
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'فشل رفع المستند');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>رفع مستند جديد</DialogTitle>
          <DialogDescription>
            قم بتحميل مستند وتصنيفه
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* File Input */}
            <div className="grid gap-2">
              <Label htmlFor="file">الملف</Label>
              <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition-colors cursor-pointer">
                <input
                  id="file"
                  type="file"
                  onChange={handleFileChange}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt"
                />
                <label htmlFor="file" className="cursor-pointer">
                  {file ? (
                    <div className="flex items-center justify-center gap-2">
                      <File className="h-6 w-6" />
                      <span className="font-medium">{file.name}</span>
                      <span className="text-sm text-muted-foreground">
                        ({(file.size / 1024).toFixed(1)} ك.ب)
                      </span>
                    </div>
                  ) : (
                    <div>
                      <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        انقر لاختيار ملف أو اسحبه هنا
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        PDF, DOC, DOCX, JPG, PNG (الحد الأقصى 10 م.ب)
                      </p>
                    </div>
                  )}
                </label>
              </div>
            </div>

            {/* Category */}
            <div className="grid gap-2">
              <Label htmlFor="category">الفئة</Label>
              <Select
                value={formData.category}
                onValueChange={(value) =>
                  setFormData({ ...formData, category: value as Document['category'] })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Case (optional) */}
            <div className="grid gap-2">
              <Label htmlFor="caseId">القضية (اختياري)</Label>
              <Select
                value={formData.caseId}
                onValueChange={(value) =>
                  setFormData({ ...formData, caseId: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر قضية" />
                </SelectTrigger>
                <SelectContent>
                  {/* Cases will be loaded from API */}
                  <SelectItem value="">بدون قضية</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div className="grid gap-2">
              <Label htmlFor="description">الوصف (اختياري)</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="وصف مختصر للمستند..."
                rows={3}
              />
            </div>

            {/* Tags */}
            <div className="grid gap-2">
              <Label htmlFor="tags">الوسوم (اختياري)</Label>
              <Input
                id="tags"
                value={formData.tags}
                onChange={(e) =>
                  setFormData({ ...formData, tags: e.target.value })
                }
                placeholder="عقد، عمل، 2024 (افصل بفاصلة)"
              />
            </div>

            {/* Confidential */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isConfidential"
                checked={formData.isConfidential}
                onChange={(e) =>
                  setFormData({ ...formData, isConfidential: e.target.checked })
                }
                className="rounded"
              />
              <Label htmlFor="isConfidential" className="cursor-pointer flex items-center gap-2">
                <Lock className="h-4 w-4 text-red-500" />
                مستند سري (يتطلب تشفيراً إضافياً)
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              إلغاء
            </Button>
            <Button type="submit" disabled={uploadMutation.isPending || !file}>
              {uploadMutation.isPending && (
                <Loader2 className="h-4 w-4 ml-2 animate-spin" />
              )}
              رفع المستند
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
