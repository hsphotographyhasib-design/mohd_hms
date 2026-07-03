# Document Management System (DMS)

> Auto-generated from codebase scan.

## Overview

Enterprise-grade document management with chunked upload (5MB), SHA256 deduplication, versioning, audit trail, and role-based permissions. Supports 12 file types across 10 modules.

## Files

| File | Lines | Purpose |
|------|-------|---------|
| `src/components/modules/documents/document-list.tsx` | ~460 | List view with stats, filters, upload dialog, drag-drop |
| `src/components/modules/documents/document-detail.tsx` | ~440 | Detail view with preview, versions, audit, info sidebar |
| `src/lib/storage/provider.ts` | ~350 | Storage abstraction layer (LocalStorageProvider) |
| `src/app/api/documents/route.ts` | ~150 | GET (list with filters, pagination) |
| `src/app/api/documents/[id]/route.ts` | ~200 | GET (detail), PATCH (update), DELETE (soft delete) |
| `src/app/api/documents/[id]/download/route.ts` | ~100 | GET (stream file download) |
| `src/app/api/documents/[id]/versions/route.ts` | ~150 | GET (list versions), POST (upload new version) |
| `src/app/api/documents/[id]/versions/[versionId]/restore/route.ts` | ~100 | POST (restore version) |
| `src/app/api/documents/audit/route.ts` | ~100 | GET (audit logs with filters) |
| `src/app/api/documents/duplicates/route.ts` | ~50 | POST (check duplicates by checksum) |
| `src/app/api/documents/upload/route.ts` | ~80 | POST (initiate upload session) |
| `src/app/api/documents/upload/chunk/route.ts` | ~80 | POST (upload chunk) |
| `src/app/api/documents/upload/complete/route.ts` | ~100 | POST (complete upload, assemble file) |
| `src/app/api/documents/upload/[sessionId]/route.ts` | ~80 | GET (status), DELETE (cancel) |
| `src/app/api/documents/upload/[sessionId]/pause/route.ts` | ~50 | POST (pause upload) |
| `src/app/api/documents/upload/[sessionId]/resume/route.ts` | ~50 | POST (resume paused upload) |

## Upload Flow

```
1. POST /api/documents/upload → UploadSession created
2. POST /api/documents/upload/chunk (×N) → Each chunk saved
3. POST /api/documents/upload/complete → Assemble chunks → Create Document + DocumentVersion
```

### Chunk Upload Details:
- **Chunk size**: 5MB (`CHUNK_SIZE` constant)
- **Max concurrent**: 3 uploads
- **Max file size**: 100MB (`MAX_FILE_SIZE_DEFAULT`)
- **Checksum**: SHA256 computed client-side, verified server-side
- **Abort support**: AbortController for cancellation
- **Pause/Resume**: Sessions can be paused and resumed

### Session States:
`pending → uploading → paused → completed | failed | cancelled`

## Storage Architecture

```
storage/
  tenants/{tenantId}/
    {module}/
      {folder}/
        {uuid_filename}
```

### Storage Provider Interface (14 methods):
```ts
interface StorageProvider {
  saveFile(path, data): Promise<void>
  readFile(path): Promise<Buffer>
  deleteFile(path): Promise<void>
  fileExists(path): Promise<boolean>
  getStream(path): ReadableStream
  writeFileChunk(path, chunk, offset): Promise<void>
  assembleFile(sessionId, chunks, finalPath): Promise<void>
  copyFile(src, dest): Promise<void>
  moveFile(src, dest): Promise<void>
  listDirectory(path, sort): Promise<FileInfo[]>
  stat(path): Promise<FileInfo>
  createDirectory(path): Promise<void>
  deleteDirectory(path): Promise<void>
  cleanupSession(sessionId): Promise<void>
}
```

Singleton via `getStorageProvider()`.

## Document Modules

| Module | Folder | Description |
|--------|--------|-------------|
| customers | customers | Customer-related docs |
| equipment | equipment | Equipment manuals, specs |
| workorders | workorders | Work order reports |
| quotations | quotations | Quotation documents |
| invoices | invoices | Invoice PDFs |
| reports | reports | Generated reports |
| inspections | inspections | Inspection reports |
| photos | photos | Photo documentation |
| archive | archive | Archived documents |
| general | general | Miscellaneous |

## Allowed File Types

| Extension | MIME Type |
|-----------|-----------|
| .pdf | application/pdf |
| .doc | application/msword |
| .docx | application/vnd.openxmlformats-officedocument.wordprocessingml.document |
| .xls | application/vnd.ms-excel |
| .xlsx | application/vnd.openxmlformats-officedocument.spreadsheetml.sheet |
| .csv | text/csv |
| .jpg | image/jpeg |
| .png | image/png |
| .webp | image/webp |
| .zip | application/zip |
| .dwg | application/dwg |
| .txt | text/plain |

### Blocked Extensions
`.exe, .bat, .cmd, .ps1, .php, .jsp, .sh, .dll, .scr, .msi`

## Versioning

- Each document upload creates initial version (v1)
- New versions via "Upload New Version" on detail page
- Each version stores: fileName, originalName, size, checksum, storagePath, changeNote, createdBy
- Unique constraint: `[documentId, version]`
- Restore: Copies version's storagePath to current document pointer

## Audit Trail

10 action types tracked:
`upload, download, delete, rename, share, restore, move, version_change, archive, unarchive`

Each entry records: documentId, action, fileName, metadata (JSON), performedBy, performedByRole, performedByName, ipAddress, userAgent

## Soft Delete

- `Document.isActive = false` (not actual deletion)
- Can be filtered in list view
- Audit log entry created on delete

## File Type Color Coding (UI)

| Type | Color |
|------|-------|
| PDF | red |
| DOC/DOCX | blue |
| XLS/XLSX | emerald |
| Image (JPG/PNG/WEBP) | purple |
| Archive (ZIP) | amber |

## Utilities (src/lib/storage/provider.ts)

```ts
calculateChecksum(buffer) → Promise<string>     // SHA256
calculateFileChecksum(filePath) → Promise<string>
getFileExtension(filename) → string
getMimeCategory(mimeType) → string
formatFileSize(bytes) → string                  // "2.5 MB"
generateStoragePath(tenantId, module, folder, filename) → string
isFileTypeAllowed(filename, mimeType) → boolean
```