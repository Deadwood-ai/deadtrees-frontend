import { useQuery } from "@tanstack/react-query";
import { fetchData, fetchCollaborators } from "../utils/dataFetching";
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
    staleTime: 0,
    cacheTime: 0,
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
    staleTime: 0,
    cacheTime: 0,
  });
}

// Authors list
export function useAuthors() {
  const { data: datasets } = useDatasets();

  return useQuery({
    queryKey: ["authors"],
    enabled: !!datasets,
    queryFn: () => {
      // Flatten all authors arrays and get unique individual authors
      const allAuthors =
        datasets?.reduce((acc: string[], item) => {
          if (item.authors && Array.isArray(item.authors)) {
            acc.push(...item.authors);
          }
          return acc;
        }, []) || [];

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
