import { useQuery } from "@tanstack/react-query";
import { fetchCollaborators } from "../utils/dataFetching";
import { useAuth } from "./useAuthProvider";
import { supabase } from "./useSupabase";
import { Settings } from "../config";

// Base datasets hook
export function useDatasets() {
  return useQuery({
    queryKey: ["datasets"],
    queryFn: async () => {
      const { data, error } = await supabase.from(Settings.DATA_TABLE_FULL).select("*");
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - data is fresh for 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes - keep in cache for 10 minutes
  });
}

// User-specific datasets
export function useUserDatasets() {
  const { session } = useAuth();

  return useQuery({
    queryKey: ["userDatasets", session?.user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from(Settings.DATA_TABLE_FULL).select("*").eq("user_id", session?.user.id);
      if (error) throw error;
      return data;
    },
    enabled: !!session?.user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes - data is fresh for 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes - keep in cache for 10 minutes
  });
}

// Authors list
export function useAuthors() {
  const { data: datasets } = useDatasets();

  return useQuery({
    queryKey: ["authors"],
    enabled: !!datasets,
    queryFn: () => {
      // Flatten all authors arrays and remove duplicates
      const allAuthors = datasets?.flatMap((item) => item.authors || []).filter(Boolean);

      const authorsUnique = [...new Set(allAuthors)];

      return authorsUnique.map((author) => ({
        label: author,
        value: author,
      }));
    },
  });
}

// Collaborators
export function useCollaborators() {
  return useQuery({
    queryKey: ["collaborators"],
    queryFn: fetchCollaborators,
  });
}
