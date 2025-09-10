import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "./useSupabase";
import { useAuth } from "./useAuthProvider";
import type { DatasetFlag, FlagStatus } from "../types/flags";

// Fetch flags for a single dataset
export function useDatasetFlags(datasetId: number | undefined) {
  return useQuery({
    queryKey: ["dataset-flags", datasetId],
    enabled: !!datasetId,
    queryFn: async (): Promise<DatasetFlag[]> => {
      if (!datasetId) return [];
      const { data, error } = await supabase
        .from("dataset_flags")
        .select("*")
        .eq("dataset_id", datasetId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60_000,
  });
}

// List flags created by current user
export function useMyFlags() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-flags", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<DatasetFlag[]> => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("dataset_flags")
        .select("*")
        .eq("created_by", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

// Create a new flag
export function useCreateFlag() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (payload: {
      dataset_id: number;
      is_ortho_mosaic_issue: boolean;
      is_prediction_issue: boolean;
      description: string;
    }): Promise<DatasetFlag> => {
      if (!user?.id) throw new Error("Not authenticated");
      if (!payload.is_ortho_mosaic_issue && !payload.is_prediction_issue) {
        throw new Error("Select at least one issue type");
      }

      const { data, error } = await supabase
        .from("dataset_flags")
        .insert({
          dataset_id: payload.dataset_id,
          created_by: user.id,
          is_ortho_mosaic_issue: payload.is_ortho_mosaic_issue,
          is_prediction_issue: payload.is_prediction_issue,
          description: payload.description,
          status: "open",
        })
        .select("*")
        .single();

      if (error) throw error;
      return data as DatasetFlag;
    },
    onSuccess: (flag) => {
      queryClient.invalidateQueries({ queryKey: ["dataset-flags", flag.dataset_id] });
      queryClient.invalidateQueries({ queryKey: ["my-flags"] });
      queryClient.invalidateQueries({ queryKey: ["flagged-datasets"] });
    },
  });
}

// Auditor-only: update flag status via RPC transaction
export function useUpdateFlagStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { flag_id: number; dataset_id: number; new_status: FlagStatus }) => {
      const { error } = await supabase.rpc("update_flag_status", {
        p_flag_id: payload.flag_id,
        p_new_status: payload.new_status,
      });
      if (error) throw error;
    },
    onSuccess: (_res, variables) => {
      queryClient.invalidateQueries({ queryKey: ["dataset-flags", variables.dataset_id] });
      queryClient.invalidateQueries({ queryKey: ["my-flags"] });
      queryClient.invalidateQueries({ queryKey: ["flagged-datasets"] });
    },
  });
}

// Aggregated list of datasets that have open/acknowledged flags
export function useFlaggedDatasets() {
  return useQuery({
    queryKey: ["flagged-datasets"],
    queryFn: async (): Promise<
      { dataset_id: number; open_count: number; acknowledged_count: number; latest_status: FlagStatus }[]
    > => {
      // If a view exists, use it; else aggregate client-side from flags
      const { data, error } = await supabase
        .from("dataset_flags")
        .select("dataset_id, status, created_at, updated_at")
        .in("status", ["open", "acknowledged"]);
      if (error) throw error;
      const map = new Map<
        number,
        { dataset_id: number; open_count: number; acknowledged_count: number; latest_status: FlagStatus }
      >();
      for (const row of data ?? []) {
        if (!map.has(row.dataset_id)) {
          map.set(row.dataset_id, {
            dataset_id: row.dataset_id,
            open_count: 0,
            acknowledged_count: 0,
            latest_status: row.status,
          });
        }
        const agg = map.get(row.dataset_id)!;
        if (row.status === "open") agg.open_count += 1;
        if (row.status === "acknowledged") agg.acknowledged_count += 1;
        // latest_status heuristic: if any open → open; else if any acknowledged → acknowledged
        if (row.status === "open") agg.latest_status = "open";
        else if (agg.latest_status !== "open" && row.status === "acknowledged") agg.latest_status = "acknowledged";
      }
      return Array.from(map.values()).filter((r) => r.open_count > 0 || r.acknowledged_count > 0);
    },
    staleTime: 30_000,
  });
}
