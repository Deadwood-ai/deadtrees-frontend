# File Upload Patterns

## Core Approach

- Chunked uploads for large files (50MB chunks)
- Progress tracking with Ant Design notifications
- Upload cancellation with AbortController

## Reference Implementations

- **Main Upload Logic**: `src/api/uploadOrtho.ts`

  - Chunked upload implementation
  - Token refresh during upload
  - Progress calculation

- **Upload UI**: `src/components/Upload/UploadModal.tsx`

  - Form integration with file upload
  - Progress notifications
  - Cancellation handling

- **File Handling**: `src/hooks/useFileUpload.ts`
  - File list management
  - Validation patterns

## Key Patterns

- Chunk size and upload logic from uploadOrtho.ts
- Notification patterns from `src/hooks/useUploadNotification.tsx`
- Form validation from UploadModal.tsx
- AbortController usage for cancellation

## File Types

- Support: GeoTIFF (.tif, .tiff), GeoJSON, Shapefile (.zip), GeoPackage (.gpkg)
- Validation patterns in UploadModal.tsx beforeUpload functions
