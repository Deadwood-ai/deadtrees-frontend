import { Session } from "@supabase/supabase-js";

/**
 * Creates Authorization headers for download requests when user is authenticated
 * @param session - Current user session from useAuth hook
 * @returns Headers object with Authorization if authenticated, empty object if not
 */
export const createDownloadHeaders = (session: Session | null): Record<string, string> => {
  if (session?.access_token) {
    return {
      Authorization: `Bearer ${session.access_token}`,
    };
  }
  return {};
};

/**
 * Handle authentication errors from download API responses
 * @param response - Fetch response object
 * @param errorMessage - Custom error message function from Ant Design
 */
export const handleDownloadAuthError = (response: Response, errorMessage: (content: string) => void) => {
  if (response.status === 401) {
    errorMessage("Authentication required to download this dataset. Please sign in.");
    return true;
  }

  if (response.status === 403) {
    errorMessage("You don't have permission to download this dataset.");
    return true;
  }

  return false;
};
