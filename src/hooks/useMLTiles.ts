import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "./useSupabase";
import { useAuth } from "./useAuthProvider";
import { IMLTile, TileResolution, TileStatus, ITileSession, ITileGenerationProgress } from "../types/mlTiles";

// Fetch all tiles for a dataset
export function useMLTiles(datasetId: number | undefined, resolution?: TileResolution) {
  return useQuery({
    queryKey: ["ml-tiles", datasetId, resolution],
    queryFn: async (): Promise<IMLTile[]> => {
      if (!datasetId) return [];

      let query = supabase.from("ml_training_tiles").select("*").eq("dataset_id", datasetId);

      if (resolution) {
        query = query.eq("resolution_cm", resolution);
      }

      const { data, error } = await query.order("tile_index");

      if (error) throw error;
      return (data || []) as unknown as IMLTile[];
    },
    enabled: !!datasetId,
  });
}

// Fetch tiles by parent
export function useNestedTiles(parentTileId: number | undefined) {
  return useQuery({
    queryKey: ["ml-tiles", "nested", parentTileId],
    queryFn: async (): Promise<IMLTile[]> => {
      if (!parentTileId) return [];

      const { data, error } = await supabase
        .from("ml_training_tiles")
        .select("*")
        .eq("parent_tile_id", parentTileId)
        .order("tile_index");

      if (error) throw error;
      return (data || []) as unknown as IMLTile[];
    },
    enabled: !!parentTileId,
  });
}

// Check session lock
export function useTileSessionLock(datasetId: number | undefined) {
  return useQuery({
    queryKey: ["tile-session-lock", datasetId],
    queryFn: async (): Promise<ITileSession | null> => {
      if (!datasetId) return null;

      const { data, error } = await supabase
        .from("v2_statuses")
        .select("is_in_tile_generation, tile_generation_locked_by, tile_generation_locked_at")
        .eq("dataset_id", datasetId)
        .single();

      if (error) throw error;

      return {
        dataset_id: datasetId,
        is_locked: (data as any).is_in_tile_generation || false,
        locked_by: (data as any).tile_generation_locked_by || null,
        locked_at: (data as any).tile_generation_locked_at || null,
      };
    },
    enabled: !!datasetId,
    // No polling - we only check once on mount
  });
}

// Set session lock
export function useSetTileSessionLock() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (datasetId: number) => {
      // Ensure a statuses row exists; insert minimal row if missing
      const { data: existing, error: selectErr } = await supabase
        .from("v2_statuses")
        .select("id")
        .eq("dataset_id", datasetId)
        .maybeSingle();
      if (selectErr) throw selectErr;

      if (!existing) {
        // Try to create a new statuses row; id is assumed to match dataset_id in this schema
        const { error: insertErr } = await supabase
          .from("v2_statuses")
          .insert({ id: datasetId, dataset_id: datasetId });
        if (insertErr) {
          // If another client created it concurrently, ignore unique violations
          const message = String(insertErr.message || "");
          const isUnique = message.toLowerCase().includes("duplicate") || message.toLowerCase().includes("unique");
          if (!isUnique) throw insertErr;
        }
      }

      const { data, error } = await supabase
        .from("v2_statuses")
        .update({
          is_in_tile_generation: true,
          tile_generation_locked_by: user?.id,
          tile_generation_locked_at: new Date().toISOString(),
        })
        .eq("dataset_id", datasetId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, datasetId) => {
      queryClient.invalidateQueries({ queryKey: ["tile-session-lock", datasetId] });
    },
  });
}

// Clear session lock
export function useClearTileSessionLock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (datasetId: number) => {
      const { data, error } = await supabase
        .from("v2_statuses")
        .update({
          is_in_tile_generation: false,
          tile_generation_locked_by: null,
          tile_generation_locked_at: null,
        })
        .eq("dataset_id", datasetId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, datasetId) => {
      queryClient.invalidateQueries({ queryKey: ["tile-session-lock", datasetId] });
    },
  });
}

// Create a new tile
export function useCreateMLTile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tile: Omit<IMLTile, "id" | "created_at" | "updated_at" | "user_id">) => {
      const { data, error } = await supabase
        .from("ml_training_tiles")
        .insert({
          ...tile,
          user_id: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as IMLTile;
    },
    onSuccess: (data) => {
      const datasetId = (data as IMLTile).dataset_id;
      queryClient.invalidateQueries({ queryKey: ["ml-tiles", datasetId] });
      queryClient.invalidateQueries({ queryKey: ["tile-progress", datasetId] });
    },
  });
}

// Update tile status
export function useUpdateTileStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tileId, status }: { tileId: number; status: TileStatus }) => {
      const { data, error } = await supabase
        .from("ml_training_tiles")
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", tileId)
        .select()
        .single();

      if (error) throw error;
      return data as IMLTile;
    },
    onSuccess: (data) => {
      const datasetId = (data as IMLTile).dataset_id;
      queryClient.invalidateQueries({ queryKey: ["ml-tiles", datasetId] });
      queryClient.invalidateQueries({ queryKey: ["tile-progress", datasetId] });
    },
  });
}

// Update tile geometry and bbox
export function useUpdateTileGeometry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      tileId,
      geometry,
      bbox,
      aoiCoveragePercent,
    }: {
      tileId: number;
      geometry: GeoJSON.Polygon;
      bbox: { minx: number; miny: number; maxx: number; maxy: number };
      aoiCoveragePercent?: number | null;
    }) => {
      const { data, error } = await supabase
        .from("ml_training_tiles")
        .update({
          geometry,
          bbox_minx: bbox.minx,
          bbox_miny: bbox.miny,
          bbox_maxx: bbox.maxx,
          bbox_maxy: bbox.maxy,
          aoi_coverage_percent: aoiCoveragePercent ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", tileId)
        .select()
        .single();

      if (error) throw error;
      return data as IMLTile;
    },
    onSuccess: (data) => {
      const datasetId = (data as IMLTile).dataset_id;
      queryClient.invalidateQueries({ queryKey: ["ml-tiles", datasetId] });
      queryClient.invalidateQueries({ queryKey: ["tile-progress", datasetId] });
    },
  });
}

// Delete a tile (and its children via CASCADE)
export function useDeleteMLTile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tileId, datasetId }: { tileId: number; datasetId: number }) => {
      const { error } = await supabase.from("ml_training_tiles").delete().eq("id", tileId);

      if (error) throw error;
      return datasetId;
    },
    onSuccess: (datasetId) => {
      queryClient.invalidateQueries({ queryKey: ["ml-tiles", datasetId] });
      queryClient.invalidateQueries({ queryKey: ["tile-progress", datasetId] });
    },
  });
}

// Generate nested tiles (10cm from 20cm, or 5cm from 10cm)
export function useGenerateNestedTiles() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (parentTile: IMLTile) => {
      const childResolution: TileResolution = parentTile.resolution_cm === 20 ? 10 : 5;
      const childTiles: Omit<IMLTile, "id" | "created_at" | "updated_at" | "user_id">[] = [];

      const { bbox_minx, bbox_miny, bbox_maxx, bbox_maxy } = parentTile;
      const midX = (bbox_minx + bbox_maxx) / 2;
      const midY = (bbox_miny + bbox_maxy) / 2;

      const quadrants = [
        { minx: bbox_minx, miny: midY, maxx: midX, maxy: bbox_maxy, idx: 0 }, // Top-left
        { minx: midX, miny: midY, maxx: bbox_maxx, maxy: bbox_maxy, idx: 1 }, // Top-right
        { minx: bbox_minx, miny: bbox_miny, maxx: midX, maxy: midY, idx: 2 }, // Bottom-left
        { minx: midX, miny: bbox_miny, maxx: bbox_maxx, maxy: midY, idx: 3 }, // Bottom-right
      ] as const;

      for (const quad of quadrants) {
        const geometry: GeoJSON.Polygon = {
          type: "Polygon",
          coordinates: [
            [
              [quad.minx, quad.miny],
              [quad.maxx, quad.miny],
              [quad.maxx, quad.maxy],
              [quad.minx, quad.maxy],
              [quad.minx, quad.miny],
            ],
          ],
        };

        childTiles.push({
          dataset_id: parentTile.dataset_id,
          resolution_cm: childResolution,
          geometry,
          parent_tile_id: parentTile.id,
          status: "pending",
          tile_index: `${parentTile.tile_index}_${quad.idx}`,
          bbox_minx: quad.minx,
          bbox_miny: quad.miny,
          bbox_maxx: quad.maxx,
          bbox_maxy: quad.maxy,
          aoi_coverage_percent: null,
          deadwood_prediction_coverage_percent: null,
          forest_cover_prediction_coverage_percent: null,
        });
      }

      const { data, error } = await supabase
        .from("ml_training_tiles")
        .insert(childTiles.map((t) => ({ ...t, user_id: user?.id })))
        .select();

      if (error) throw error;
      return data as IMLTile[];
    },
    onSuccess: (_data, parentTile) => {
      const datasetId = parentTile.dataset_id;
      const parentId = parentTile.id;
      queryClient.invalidateQueries({ queryKey: ["ml-tiles", datasetId] });
      queryClient.invalidateQueries({ queryKey: ["ml-tiles", "nested", parentId] });
      queryClient.invalidateQueries({ queryKey: ["tile-progress", datasetId] });
    },
  });
}

// Get progress summary
export function useTileProgress(datasetId: number | undefined) {
  return useQuery({
    queryKey: ["tile-progress", datasetId],
    queryFn: async (): Promise<ITileGenerationProgress | null> => {
      if (!datasetId) return null;

      const { data, error } = await supabase
        .from("ml_training_tiles")
        .select("resolution_cm, status")
        .eq("dataset_id", datasetId);

      if (error) throw error;
      if (!data) return null;

      const tiles = data as unknown as Pick<IMLTile, "resolution_cm" | "status">[];

      const progress: ITileGenerationProgress = {
        dataset_id: datasetId,
        total_20cm: tiles.filter((t) => t.resolution_cm === 20).length,
        completed_20cm: tiles.filter((t) => t.resolution_cm === 20 && t.status !== "pending").length,
        total_10cm: tiles.filter((t) => t.resolution_cm === 10).length,
        good_10cm: tiles.filter((t) => t.resolution_cm === 10 && t.status === "good").length,
        bad_10cm: tiles.filter((t) => t.resolution_cm === 10 && t.status === "bad").length,
        pending_10cm: tiles.filter((t) => t.resolution_cm === 10 && t.status === "pending").length,
        total_5cm: tiles.filter((t) => t.resolution_cm === 5).length,
        good_5cm: tiles.filter((t) => t.resolution_cm === 5 && t.status === "good").length,
        bad_5cm: tiles.filter((t) => t.resolution_cm === 5 && t.status === "bad").length,
        pending_5cm: tiles.filter((t) => t.resolution_cm === 5 && t.status === "pending").length,
      };

      return progress;
    },
    enabled: !!datasetId,
  });
}

// Mark dataset as tile generation complete
export function useCompleteTileGeneration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (datasetId: number) => {
      const { data, error } = await supabase
        .from("v2_statuses")
        .update({
          has_ml_tiles: true,
          ml_tiles_completed_at: new Date().toISOString(),
          is_in_tile_generation: false,
          tile_generation_locked_by: null,
          tile_generation_locked_at: null,
        })
        .eq("dataset_id", datasetId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: async (_data, datasetId) => {
      // Invalidate all dataset-related queries to ensure UI updates
      await queryClient.invalidateQueries({ queryKey: ["datasets"] });
      await queryClient.invalidateQueries({ queryKey: ["dataset-by-id", datasetId] });
      await queryClient.invalidateQueries({ queryKey: ["tile-session-lock", datasetId] });
      await queryClient.invalidateQueries({ queryKey: ["userDatasets"] });
      await queryClient.invalidateQueries({ queryKey: ["public-datasets"] });

      // Force refetch to ensure fresh data
      await queryClient.refetchQueries({ queryKey: ["datasets"] });
    },
  });
}
