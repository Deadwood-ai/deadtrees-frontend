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
  aoi_done?: boolean;
  has_cog_issue?: boolean;
  cog_issue_notes?: string;
  has_thumbnail_issue?: boolean;
  thumbnail_issue_notes?: string;
  audited_by?: string;
  audited_by_email?: string;
  notes?: string;
}

export interface AOIData {
  id?: number;
  dataset_id: number;
  user_id?: string;
  geometry: GeoJSON.MultiPolygon | GeoJSON.Polygon;
  is_whole_image: boolean;
  image_quality?: number;
  notes?: string;
  created_at?: string;
  updated_at?: string;
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

      const { data, error } = await supabase
        .from("dataset_audit_user_info")
        .select("*")
        .eq("dataset_id", datasetId)
        .limit(1);

      if (error) throw error;

      // Return the first item if it exists, otherwise null
      return data && data.length > 0 ? data[0] : null;
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

      // Return the first item if it exists, otherwise null
      return data && data.length > 0 ? data[0] : null;
    },
    enabled: !!datasetId,
  });
}

// Hook to save AOI data (supports both insert and update)
export function useSaveDatasetAOI() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (aoiData: AOIData) => {
      const dataToSave = {
        ...aoiData,
        user_id: user?.id,
        updated_at: new Date().toISOString(),
      };

      // Check if AOI already exists for this dataset
      const { data: existingAOI } = await supabase
        .from("v2_aois")
        .select("id")
        .eq("dataset_id", aoiData.dataset_id)
        .limit(1);

      let result;
      if (existingAOI && existingAOI.length > 0) {
        // Update existing AOI
        const { data, error } = await supabase
          .from("v2_aois")
          .update(dataToSave)
          .eq("dataset_id", aoiData.dataset_id)
          .select()
          .single();

        if (error) throw error;
        result = data;
      } else {
        // Insert new AOI record
        const { data, error } = await supabase.from("v2_aois").insert(dataToSave).select().single();

        if (error) throw error;
        result = data;
      }

      return result;
    },
    onSuccess: (_, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["dataset-aoi", variables.dataset_id] });
    },
  });
}

// Hook to save audit data (updated to handle AOI)
export function useSaveDatasetAudit() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (auditData: AuditFormValues & { aoiGeometry?: GeoJSON.MultiPolygon | GeoJSON.Polygon }) => {
      const { aoiGeometry, ...auditFormData } = auditData;

      const dataToSave = {
        ...auditFormData,
        audited_by: user?.id,
        audit_date: new Date().toISOString(),
      };

      // If AOI geometry is provided, save it first
      if (aoiGeometry) {
        const aoiData: AOIData = {
          dataset_id: auditData.dataset_id!,
          user_id: user?.id,
          geometry: aoiGeometry,
          is_whole_image: false, // For now, assume it's not whole image
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const { error: aoiError } = await supabase.from("v2_aois").insert(aoiData);
        if (aoiError) {
          console.error("Failed to save AOI:", aoiError);
          throw new Error("Failed to save AOI data");
        }

        // Mark AOI as done
        dataToSave.aoi_done = true;
      }

      // Check if audit already exists (fixed to not use .single())
      const { data: existingAudits } = await supabase
        .from("dataset_audit")
        .select("dataset_id")
        .eq("dataset_id", auditData.dataset_id)
        .limit(1);

      const existingAudit = existingAudits && existingAudits.length > 0 ? existingAudits[0] : null;

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
      queryClient.invalidateQueries({ queryKey: ["dataset-aoi", variables.dataset_id] });
      queryClient.invalidateQueries({ queryKey: ["datasets"] }); // Refresh datasets to update is_audited status
      queryClient.invalidateQueries({ queryKey: ["v2-datasets"] }); // Also refresh v2_datasets if used
    },
  });
}
