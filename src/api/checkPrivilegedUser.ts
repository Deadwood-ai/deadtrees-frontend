import { supabase } from "../hooks/useSupabase";

export interface PrivilegedUser {
  id: number;
  user_id: string;
  can_upload_private: boolean;
  created_at: string;
}

export async function checkPrivilegedUser(): Promise<PrivilegedUser | null> {
  try {
    const { data, error } = await supabase.from("privileged_users").select("*");

    if (error) {
      throw error;
    }

    // If data exists and has at least one row, return the first row
    // Otherwise return null
    return data && data.length > 0 ? data[0] : null;
  } catch (error) {
    console.error("Error checking privileged user:", error);
    return null;
  }
}
