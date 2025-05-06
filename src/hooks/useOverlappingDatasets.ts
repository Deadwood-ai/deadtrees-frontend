import { useQuery } from "@tanstack/react-query";
import { supabase } from "./useSupabase";
import { IDataset } from "../types/dataset";
import { useDatasets } from "./useDatasets";

interface OverlappingDataset {
  dataset_id: number;
  overlap_ratio: number;
}

export function useOverlappingDatasets(datasetId: number | undefined) {
  const { data: allDatasets } = useDatasets();

  const query = useQuery({
    queryKey: ["overlappingDatasets", datasetId],
    queryFn: async (): Promise<IDataset[]> => {
      if (!datasetId || !allDatasets) {
        return [];
      }

      try {
        // Call the database function to get overlapping dataset IDs
        const { data, error } = await supabase.rpc("find_overlapping_datasets", {
          input_dataset_id: datasetId,
          overlap_threshold: 0.5,
        });

        if (error) {
          console.error("Error fetching overlapping datasets:", error);
          return [];
        }

        if (!data || data.length === 0) {
          return [];
        }

        // Include the current dataset in the list for proper navigation
        const datasetIds = new Set([datasetId, ...(data as OverlappingDataset[]).map((item) => item.dataset_id)]);

        // Get full dataset objects from dataset IDs
        const overlappingDatasets = Array.from(datasetIds)
          .map((id) => allDatasets.find((d) => d.id === id))
          .filter(Boolean) as IDataset[];

        // Sort by acquisition date
        return overlappingDatasets.sort((a, b) => {
          const dateA = new Date(
            a.aquisition_year,
            a.aquisition_month ? a.aquisition_month - 1 : 0,
            a.aquisition_day || 1,
          );
          const dateB = new Date(
            b.aquisition_year,
            b.aquisition_month ? b.aquisition_month - 1 : 0,
            b.aquisition_day || 1,
          );
          return dateA.getTime() - dateB.getTime();
        });
      } catch (err) {
        console.error("Error in overlapping datasets query:", err);
        return [];
      }
    },
    enabled: !!datasetId && !!allDatasets,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });

  return query;
}
