---
description: Authentication & Security
globs:
alwaysApply: false
---

# Authentication & Security

## Core Approach

- Supabase Auth with session management
- Token refresh for long-running operations
- Role-based access control (RBAC)

## Reference Implementations

- **Auth Provider**: `src/hooks/useAuthProvider.tsx`

  - Session state management
  - Auth state changes
  - User identification

- **Token Management**: `src/utils/isTokenExpiringSoon.ts`

  - Token expiration checks
  - Refresh logic in uploadOrtho.ts

- **Permissions**: `src/hooks/useUserPrivileges.ts`
  - Role-based access
  - Permission hooks

## Key Patterns

- Context pattern from useAuthProvider.tsx
- Token refresh in long operations (uploadOrtho.ts)
- Permission checking from useUserPrivileges.ts
- Protected route patterns in page components

## Security Considerations

- Follow token handling in API calls
- User privilege checking before sensitive operations
- Session cleanup on logout
