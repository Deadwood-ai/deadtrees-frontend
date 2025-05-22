import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "./useSupabase";
import { useAuth } from "./useAuth";

export interface AuditFormValues {
  dataset_id: number;
  is_georeferenced?: boolean;
  has_valid_acquisition_date?: boolean;
  acquisition_date_notes?: string;
  has_valid_phenology?: boolean;
  phenology_notes?: string;
  deadwood_quality?: "great" | "sentinel_ok" | "bad" | null;
  deadwood_notes?: string;
  forest_cover_quality?: "great" | "sentinel_ok" | "bad" | null;
  forest_cover_notes?: string;
  aoi_done?: boolean;
  has_cog_issue?: boolean;
  cog_issue_notes?: string;
  has_thumbnail_issue?: boolean;
  thumbnail_issue_notes?: string;
  notes?: string;
  audit_date?: string;
}

export interface AOIData {
  dataset_id: number;
  geometry: GeoJSON.MultiPolygon;
  is_whole_image: boolean;
  image_quality?: number;
  notes?: string;
}

// Hook to get all dataset audits
export function useDatasetAudits() {
  return useQuery({
    queryKey: ["dataset-audits"],
    queryFn: async () => {
      const { data, error } = await supabase.from("dataset_audit").select("*");

      if (error) throw error;
      return data;
    },
  });
}

// Hook to get a specific dataset audit
export function useDatasetAudit(datasetId: number | undefined) {
  return useQuery({
    queryKey: ["dataset-audit", datasetId],
    queryFn: async () => {
      if (!datasetId) return null;

      const { data, error } = await supabase.from("dataset_audit").select("*").eq("dataset_id", datasetId).single();

      if (error && error.code !== "PGRST116") {
        // PGRST116 is "No rows returned"
        throw error;
      }

      return data;
    },
    enabled: !!datasetId,
  });
}

// Hook to get AOI data for a dataset
export function useDatasetAOI(datasetId: number | undefined) {
  return useQuery({
    queryKey: ["dataset-aoi", datasetId],
    queryFn: async () => {
      if (!datasetId) return null;

      const { data, error } = await supabase
        .from("v2_aois")
        .select("*")
        .eq("dataset_id", datasetId)
        .order("created_at", { ascending: false })
        .limit(1);

      if (error) throw error;
      return data && data.length > 0 ? data[0] : null;
    },
    enabled: !!datasetId,
  });
}

// Hook to save dataset audit data
export function useSaveDatasetAudit() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (auditData: AuditFormValues) => {
      // Add audited_by field with current user ID
      const dataToSave = {
        ...auditData,
        audited_by: user?.id,
        audit_date: new Date().toISOString(),
      };

      // Check if a record already exists
      const { data: existingData } = await supabase
        .from("dataset_audit")
        .select("dataset_id")
        .eq("dataset_id", auditData.dataset_id)
        .maybeSingle();

      let result;

      if (existingData) {
        // Update existing record
        const { data, error } = await supabase
          .from("dataset_audit")
          .update(dataToSave)
          .eq("dataset_id", auditData.dataset_id)
          .select()
          .single();

        if (error) throw error;
        result = data;
      } else {
        // Insert new record
        const { data, error } = await supabase.from("dataset_audit").insert(dataToSave).select().single();

        if (error) throw error;
        result = data;
      }

      return result;
    },
    onSuccess: (_, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["dataset-audit", variables.dataset_id] });
      queryClient.invalidateQueries({ queryKey: ["dataset-audits"] });
    },
  });
}

// Hook to save AOI data
export function useSaveDatasetAOI() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (aoiData: AOIData) => {
      const dataToSave = {
        ...aoiData,
        user_id: user?.id,
      };

      // Insert new AOI record
      const { data, error } = await supabase.from("v2_aois").insert(dataToSave).select().single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["dataset-aoi", variables.dataset_id] });
    },
  });
}
