---
description: Component Architecture
globs:
alwaysApply: false
---

# Component Architecture

## Core Approach

- Functional components with TypeScript interfaces
- Ant Design components with consistent patterns
- Proper loading states and error handling

## Reference Implementations

- **Table Component**: `src/components/DataTable.tsx`

  - Column definitions
  - Status rendering
  - Action buttons

- **Form Component**: `src/components/Upload/UploadModal.tsx`

  - Form validation
  - File upload integration
  - Loading states

- **List Component**: `src/components/DataList.tsx`
  - Item rendering
  - Hover states
  - Filter integration

## Key Patterns

- Component prop interfaces from DataTable.tsx
- Form handling from UploadModal.tsx
- Loading/error states from any page component
- Ant Design integration patterns throughout components/

## Layout Patterns

- Navigation structure in `src/components/Navigation.tsx`
- Page layouts in `src/pages/` directory
- Modal patterns from various Modal components
