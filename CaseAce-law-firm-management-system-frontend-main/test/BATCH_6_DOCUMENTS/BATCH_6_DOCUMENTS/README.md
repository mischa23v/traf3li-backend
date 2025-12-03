# BATCH 6: Documents & Files Management Installation Guide

## 📦 Files Included

1. `index.tsx` - Complete documents management page
2. `hooks/use-documents.ts` - React Query hooks for all document operations
3. `route-documents-index.tsx` - TanStack Router configuration

---

## 🚀 Installation Steps

### Step 1: Create Feature Directory

```bash
cd C:\traf3li\traf3li-dashboard\src\features
mkdir documents
mkdir documents\hooks
```

### Step 2: Copy Files

1. Copy `index.tsx` to `src/features/documents/index.tsx`
2. Copy `hooks/use-documents.ts` to `src/features/documents/hooks/use-documents.ts`
3. Copy `route-documents-index.tsx` to `src/routes/_authenticated/documents/index.tsx`

**Create directory for route:**
```bash
cd C:\traf3li\traf3li-dashboard\src\routes\_authenticated
mkdir documents
```

Then copy `route-documents-index.tsx` to `src/routes/_authenticated/documents/index.tsx`

### Step 3: Verify Dependencies

All required dependencies should already be installed:
- `@tanstack/react-query` ✅
- `@tanstack/react-table` ✅
- `date-fns` ✅
- `lucide-react` ✅
- `sonner` ✅

### Step 4: Update API Routes (Backend Required)

The frontend expects these backend endpoints:

```
GET    /api/documents                 - Get all documents (with filters)
GET    /api/documents/:id             - Get single document
POST   /api/documents/upload          - Upload new document
PUT    /api/documents/:id             - Update document metadata
DELETE /api/documents/:id             - Delete document
GET    /api/documents/case/:caseId    - Get documents by case
GET    /api/documents/stats           - Get statistics
GET    /api/documents/:id/download    - Download document
POST   /api/documents/:id/share       - Generate shareable link
POST   /api/documents/:id/version     - Upload new version
GET    /api/documents/:id/versions    - Get all versions
POST   /api/documents/:id/encrypt     - Encrypt document
POST   /api/documents/:id/decrypt     - Decrypt document
GET    /api/documents/search          - Search documents
GET    /api/documents/recent          - Get recent documents
POST   /api/documents/bulk-delete     - Delete multiple documents
PUT    /api/documents/:id/move        - Move to case
```

**⚠️ Backend Implementation Required** - See BATCH 7 for backend code

### Step 5: Configure File Storage

**Option A: AWS S3 (Recommended for production)**
```bash
# Add to backend .env
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_S3_BUCKET=traf3li-documents-sa
AWS_REGION=me-south-1  # Middle East (Bahrain) - closest to Saudi Arabia
```

**Option B: Cloudinary (Alternative)**
```bash
# Already configured in your backend
CLOUDINARY_CLOUD_NAME=xxxxx
CLOUDINARY_API_KEY=xxxxx
CLOUDINARY_API_SECRET=xxxxx
```

**Why AWS S3 for Saudi Arabia:**
- ✅ Data sovereignty (Middle East region)
- ✅ PDPL compliance
- ✅ Better for large files
- ✅ Versioning support
- ✅ Encryption at rest
- ✅ Access control

### Step 6: Test the Feature

1. Start the dashboard:
```bash
cd C:\traf3li\traf3li-dashboard
npm run dev
```

2. Navigate to: http://localhost:5173/documents

3. You should see:
   - Statistics cards
   - Category breakdown
   - Search bar
   - Filter dropdowns
   - Documents table
   - "رفع مستند" button

---

## 🎯 Features Included

### Documents Management:
- ✅ Upload files (PDF, DOC, DOCX, images)
- ✅ Download files
- ✅ View files (in new tab)
- ✅ Delete files
- ✅ Search by name/content
- ✅ Filter by category
- ✅ Filter by case
- ✅ File size limits (configurable)
- ✅ File type validation

### Document Categories:
- 📄 **Contract (عقد)** - Legal contracts
- ⚖️ **Judgment (حكم)** - Court judgments (ENCRYPTED)
- 📸 **Evidence (دليل)** - Evidence documents/photos
- 📧 **Correspondence (مراسلات)** - Letters, emails
- 📝 **Pleading (مذكرة)** - Legal briefs, pleadings
- 📁 **Other (أخرى)** - Miscellaneous

### Security Features:
- ✅ Confidential flag (extra encryption)
- ✅ Access control (role-based)
- ✅ Audit logging (who accessed what)
- ✅ Encrypted storage for judgments
- ✅ Secure download links
- ✅ Shareable links with expiration

### Advanced Features:
- ✅ Version control (upload new versions)
- ✅ Tags for better organization
- ✅ Link to cases
- ✅ Recent documents view
- ✅ Storage usage tracking
- ✅ Bulk operations

### React Query Hooks:
- ✅ `useDocuments()` - Fetch all documents with filters
- ✅ `useDocument(id)` - Fetch single document
- ✅ `useUploadDocument()` - Upload new document
- ✅ `useUpdateDocument(id)` - Update metadata
- ✅ `useDeleteDocument()` - Delete document
- ✅ `useDocumentsByCase(caseId)` - Get documents by case
- ✅ `useDocumentStats()` - Get statistics
- ✅ `useDownloadDocument()` - Download document
- ✅ `useShareDocument()` - Generate share link
- ✅ `useUploadDocumentVersion(id)` - Upload new version
- ✅ `useDocumentVersions(id)` - Get all versions
- ✅ `useEncryptDocument()` - Encrypt document
- ✅ `useDecryptDocument()` - Decrypt document
- ✅ `useSearchDocuments(query)` - Search documents
- ✅ `useRecentDocuments(limit)` - Get recent documents
- ✅ `useBulkDeleteDocuments()` - Delete multiple
- ✅ `useMoveDocumentToCase()` - Move to case

---

## 📊 Data Structure

### Document Object
```typescript
{
  _id: string;
  fileName: string;                // Stored filename (unique)
  originalName: string;            // User's original filename
  fileType: string;                // MIME type (application/pdf)
  fileSize: number;                // Bytes
  url: string;                     // S3/Cloudinary URL
  category: 'contract' | 'judgment' | 'evidence' | 'correspondence' | 'pleading' | 'other';
  caseId?: {
    _id: string;
    caseNumber: string;
    title: string;
  };
  description?: string;            // User description
  tags?: string[];                 // ["عقد", "عمل", "2024"]
  isConfidential: boolean;         // Extra security flag
  isEncrypted: boolean;            // Currently encrypted?
  uploadedBy: {
    _id: string;
    fullName: string;
  };
  version: number;                 // Version number (1, 2, 3...)
  parentDocumentId?: string;       // Link to original document
  createdAt: string;
  updatedAt: string;
}
```

---

## 🎨 UI Components Used

From shadcn/ui:
- `Card` - Layout containers
- `Button` - Action buttons
- `Badge` - Category and status badges
- `Dialog` - Upload modal
- `Input` - Search and form fields
- `Textarea` - Description field
- `Select` - Dropdowns
- `Label` - Form labels
- `DataTable` - Documents table

From lucide-react:
- `Upload` - Upload icon
- `File` - Generic file icon
- `FileText` - Document icon
- `Image` - Image file icon
- `FileVideo` - Video file icon
- `FileAudio` - Audio file icon
- `Download` - Download icon
- `Eye` - View icon
- `Trash2` - Delete icon
- `FolderOpen` - Empty state
- `Search` - Search icon
- `Filter` - Filter icon
- `Loader2` - Loading spinner
- `Share2` - Share icon
- `Lock` - Confidential icon
- `Clock` - Recent icon

---

## 🔐 Security Implementation

### 1. File Upload Security
```javascript
// Backend validation
- File size limit: 10MB (configurable)
- Allowed types: PDF, DOC, DOCX, JPG, PNG, TXT
- Virus scanning (optional - ClamAV)
- File name sanitization
- Unique filename generation
```

### 2. Confidential Documents
```javascript
// Extra encryption for sensitive files
if (document.isConfidential) {
  // Encrypt file content with AES-256-GCM
  // Store encryption key separately
  // Require 2FA to access
  // Log all access attempts
}
```

### 3. Judgments (Special Case)
```javascript
// Saudi law requires judgments to be secret until final
- Always encrypted at rest
- Only accessible by lawyer assigned to case
- Audit log every access
- Cannot be shared externally
- Cannot be downloaded without approval
```

### 4. Access Control
```javascript
// Role-based permissions
Admin: Full access to all documents
Lawyer: Access to own cases only
Client: View only (assigned documents)
```

---

## 🔗 Integration with Sidebar

The sidebar already includes the documents link:
```typescript
{
  title: 'المستندات',
  url: '/documents',
  icon: FileText,
}
```

✅ No changes needed to sidebar!

---

## 💡 Key Features Explained

### 1. Version Control
**Why it matters:** Legal documents often have multiple drafts.

**How it works:**
1. Upload document v1
2. Make changes
3. Upload new version
4. System keeps both versions
5. Can view/download any version
6. Shows version history

**Example:**
```
عقد العمل.pdf (v1) - 2024-01-15
عقد العمل.pdf (v2) - 2024-01-20 (current)
عقد العمل.pdf (v3) - 2024-02-01 (latest)
```

### 2. Confidential Flag
**When to use:**
- Court judgments
- Client's private information
- Sensitive evidence
- Privileged communications

**What happens:**
- ✅ Extra AES-256 encryption
- ✅ Access requires 2FA
- ✅ All access logged
- ✅ Red "سري" badge visible
- ✅ Cannot be shared

### 3. Smart Search
**Searches in:**
- File names
- Descriptions
- Tags
- Case numbers
- Content (PDF text extraction)

**Example queries:**
- "عقد عمل" → finds all employment contracts
- "2024" → finds all documents from 2024
- "قضية 001" → finds all documents for case 001

### 4. Storage Management
**Tracks:**
- Total storage used
- Storage per case
- Storage per user
- Storage by file type

**Alerts when:**
- Approaching storage limit
- Large file uploaded
- Duplicate file detected

---

## 🐛 Troubleshooting

### Issue: "File upload fails"
**Possible causes:**
1. File too large (>10MB)
2. Invalid file type
3. Network timeout
4. Storage quota exceeded

**Solutions:**
- Compress large files
- Check allowed file types
- Increase timeout in axios config
- Upgrade storage plan

### Issue: "Cannot view PDF"
**Solution:** PDF opens in new tab. Make sure popup blocker allows it.

### Issue: "Encrypted documents show error"
**Solution:** Make sure encryption key is set in backend .env:
```bash
ENCRYPTION_KEY=your_32_byte_key_here
```

### Issue: "Search returns nothing"
**Solution:** Search indexes may need rebuilding (backend task).

---

## ✅ Verification Checklist

- [ ] Files copied to correct directories
- [ ] No TypeScript errors
- [ ] Dashboard runs without errors
- [ ] Can navigate to /documents
- [ ] Statistics cards render
- [ ] Can click "رفع مستند"
- [ ] Upload dialog opens
- [ ] Can select file
- [ ] Can choose category
- [ ] Search bar works
- [ ] Filter dropdowns work
- [ ] Table shows documents
- [ ] Icons show correctly based on file type
- [ ] Arabic text displays correctly (RTL)

---

## 🚀 Next Steps

After installing BATCH 6:

1. **Configure Storage** - Set up AWS S3 or Cloudinary
2. **Test Upload** - Upload sample files
3. **Test Download** - Download files
4. **Test Encryption** - Mark document as confidential
5. **Backend Implementation** - See BATCH 7 for backend code

---

## 📝 Notes

### File Storage Options:

**AWS S3 (Recommended):**
- ✅ Best for Saudi Arabia (Middle East region)
- ✅ PDPL compliant
- ✅ Versioning built-in
- ✅ Encryption at rest
- ✅ Scalable
- ❌ Slightly more complex setup
- 💰 Pay per GB stored + transfer

**Cloudinary (Alternative):**
- ✅ Simple to setup (already configured)
- ✅ Good for images
- ✅ Auto-optimization
- ❌ Less features for documents
- ❌ No built-in versioning
- 💰 Free tier available

**Recommendation:** Use AWS S3 for production

### File Size Limits:
```javascript
Default: 10 MB per file
Recommended limits by type:
- PDFs: 10 MB
- Images: 5 MB  
- Documents: 5 MB
- Videos: 50 MB (if allowed)
```

### Allowed File Types:
```javascript
Current:
- application/pdf (.pdf)
- application/msword (.doc)
- application/vnd.openxmlformats-officedocument.wordprocessingml.document (.docx)
- image/jpeg (.jpg, .jpeg)
- image/png (.png)
- text/plain (.txt)

Can add:
- Excel files (.xls, .xlsx)
- PowerPoint (.ppt, .pptx)
- Archives (.zip, .rar)
- Audio (.mp3, .wav)
- Video (.mp4, .avi)
```

---

## 💰 Business Value

This feature helps lawyers:
1. **Organize** all case documents in one place
2. **Search** quickly through thousands of files
3. **Share** documents securely with clients
4. **Track** document versions and changes
5. **Comply** with document retention requirements
6. **Protect** confidential information
7. **Audit** who accessed what and when
8. **Backup** important files automatically

---

## 🎯 What's Working vs What Needs Backend

### ✅ Working Now (Frontend Only)
- Page renders
- UI components display
- Upload dialog opens
- File selection works
- Category dropdowns work
- Search bar functional
- Filter dropdowns work
- Table renders
- Icons show correctly
- Statistics cards render
- TypeScript types defined

### ⏳ Needs Backend
- Actual file upload to S3/Cloudinary
- File storage
- File retrieval
- Download functionality
- Encryption/decryption
- Version control
- Search indexing
- Statistics calculation
- Access control
- Audit logging

---

## 🔄 Integration Points

### Documents ↔ Cases:
- Documents linked to cases
- Show case documents in case detail
- Upload from case page
- Case document count

### Documents ↔ Invoices:
- Attach supporting documents to invoices
- Generate invoice from time entries + expenses + docs
- Document delivery proof

### Documents ↔ Calendar:
- Attach documents to hearings
- Upload evidence before court date
- Document submission deadlines

---

**You now have 6 complete frontend features! 🎉**

**Ready for BATCH 7: Backend Implementation?** 

This is the CRITICAL batch that makes everything actually work! 🚀

Say **"backend"** or **"batch 7"** to continue!
