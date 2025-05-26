import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "./useSupabase";
import { useAuth } from "./useAuthProvider";

// Update the enum type to match your backend
export type PredictionQuality = "great" | "sentinel_ok" | "bad";

export interface AuditFormValues {
  dataset_id?: number;
  audit_date?: string;
  is_georeferenced?: boolean;
  has_valid_acquisition_date?: boolean;
  acquisition_date_notes?: string;
  has_valid_phenology?: boolean;
  phenology_notes?: string;
  deadwood_quality?: PredictionQuality;
  deadwood_notes?: string;
  forest_cover_quality?: PredictionQuality;
  forest_cover_notes?: string;
  has_cog_issue?: boolean;
  cog_issue_notes?: string;
  has_thumbnail_issue?: boolean;
  thumbnail_issue_notes?: string;
  audited_by?: string;
  notes?: string;
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

// Hook to save audit data
export function useSaveDatasetAudit() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (auditData: AuditFormValues) => {
      const dataToSave = {
        ...auditData,
        audited_by: user?.id,
        audit_date: new Date().toISOString(),
      };

      // Check if audit already exists
      const { data: existingAudit } = await supabase
        .from("dataset_audit")
        .select("dataset_id")
        .eq("dataset_id", auditData.dataset_id)
        .single();

      let auditResult;
      if (existingAudit) {
        // Update existing audit
        const { data, error } = await supabase
          .from("dataset_audit")
          .update(dataToSave)
          .eq("dataset_id", auditData.dataset_id)
          .select()
          .single();

        if (error) throw error;
        auditResult = data;
      } else {
        // Insert new audit
        const { data, error } = await supabase.from("dataset_audit").insert(dataToSave).select().single();

        if (error) throw error;
        auditResult = data;
      }

      // Update the v2_statuses table to mark as audited
      const { error: statusError } = await supabase
        .from("v2_statuses")
        .update({
          is_audited: true,
          updated_at: new Date().toISOString(),
        })
        .eq("dataset_id", auditData.dataset_id);

      if (statusError) {
        console.error("Failed to update status:", statusError);
        throw new Error("Failed to update audit status");
      }

      return auditResult;
    },
    onSuccess: (_, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["dataset-audits"] });
      queryClient.invalidateQueries({ queryKey: ["dataset-audit", variables.dataset_id] });
      queryClient.invalidateQueries({ queryKey: ["datasets"] }); // Refresh datasets to update is_audited status
      queryClient.invalidateQueries({ queryKey: ["v2-datasets"] }); // Also refresh v2_datasets if used
    },
  });
}
