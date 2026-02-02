import { useQuery } from "@tanstack/react-query";
import { fetchCollaborators } from "../utils/dataFetching";
import { useAuth } from "./useAuthProvider";
import { supabase } from "./useSupabase";
import { Settings } from "../config";
import { IDataset } from "../types/dataset";

// Base datasets hook - includes ALL datasets (for admin/audit use)
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

// Public datasets hook - excludes datasets marked as "exclude_completely"
export function usePublicDatasets() {
  return useQuery({
    queryKey: ["public-datasets"],
    queryFn: async () => {
      const { data, error } = await supabase.from(Settings.DATA_TABLE_PUBLIC).select("*");
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - data is fresh for 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes - keep in cache for 10 minutes
  });
}

// Fetch a single dataset by id; minimal fields are enough for Tiles page
export function useDatasetById(datasetId: number | undefined) {
  return useQuery({
    queryKey: ["dataset-by-id", datasetId],
    enabled: !!datasetId,
    queryFn: async () => {
      if (!datasetId) return null;
      const { data, error } = await supabase.from(Settings.DATA_TABLE_FULL).select("*").eq("id", datasetId).single();
      if (error) throw error;
      return data as IDataset;
    },
  });
}

// User-specific datasets - uses public view to exclude excluded and archived datasets
export function useUserDatasets() {
  const { session } = useAuth();

  return useQuery({
    queryKey: ["userDatasets", session?.user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(Settings.DATA_TABLE_PUBLIC)
        .select("*")
        .eq("user_id", session?.user.id)
        .eq("archived", false);
      if (error) throw error;
      return data;
    },
    enabled: !!session?.user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes - data is fresh for 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes - keep in cache for 10 minutes
  });
}

// Authors list - based on public datasets only
export function useAuthors() {
  const { data: datasets } = usePublicDatasets();

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
