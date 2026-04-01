// ============================================================================
// DEPRECATED: This file is kept for backward compatibility.
// Use hooks/useReferencePatches.ts for new code.
// ============================================================================

import { useCallback, useMemo } from "react";
import type { IMLTile, TileResolution, TileStatus } from "../types/mlTiles";
import { mlTileToReferencePatch, referencePatchToMLTile } from "../types/mlTiles";
import type { ReferencePatchDraft } from "../types/referencePatches";
import {
  useReferencePatches,
  useNestedPatches,
  usePatchSessionLock,
  useSetPatchSessionLock,
  useClearPatchSessionLock,
  useCreateReferencePatch,
  useUpdatePatchStatus,
  useUpdatePatchGeometry,
  useDeleteReferencePatch,
  useGenerateNestedPatches,
  usePatchProgress,
  useCompletePatchGeneration,
  useReopenPatchGeneration,
} from "./useReferencePatches";

type NewMLTile = Omit<ReferencePatchDraft, "patch_index"> & {
  patch_index?: string;
  tile_index: string;
};

const toMLTiles = (tiles: ReturnType<typeof useReferencePatches>["data"]): IMLTile[] =>
  (tiles ?? []).map(referencePatchToMLTile);

export function useMLTiles(datasetId: number | undefined, resolution?: TileResolution) {
  const query = useReferencePatches(datasetId, resolution);
  const data = useMemo(() => toMLTiles(query.data), [query.data]);

  return {
    ...query,
    data,
  };
}

export function useNestedTiles(parentTileId: number | undefined) {
  const query = useNestedPatches(parentTileId);
  const data = useMemo(() => toMLTiles(query.data), [query.data]);

  return {
    ...query,
    data,
  };
}

export const useTileSessionLock = usePatchSessionLock;
export const useSetTileSessionLock = useSetPatchSessionLock;
export const useClearTileSessionLock = useClearPatchSessionLock;
export const useTileProgress = usePatchProgress;
export const useCompleteTileGeneration = useCompletePatchGeneration;
export const useReopenTileGeneration = useReopenPatchGeneration;

export function useCreateMLTile() {
  const mutation = useCreateReferencePatch();

  const mutate = useCallback(
    (tile: NewMLTile) => {
      const { tile_index, patch_index, ...rest } = tile;
      mutation.mutate({
        ...rest,
        patch_index: patch_index ?? tile_index,
      });
    },
    [mutation],
  );

  const mutateAsync = useCallback(
    async (tile: NewMLTile) => {
      const { tile_index, patch_index, ...rest } = tile;
      const createdTile = await mutation.mutateAsync({
        ...rest,
        patch_index: patch_index ?? tile_index,
      });

      return referencePatchToMLTile(createdTile);
    },
    [mutation],
  );

  return {
    ...mutation,
    mutate,
    mutateAsync,
  };
}

export function useUpdateTileStatus() {
  const mutation = useUpdatePatchStatus();

  const mutate = useCallback(
    (variables: { tileId: number; status: TileStatus }) => {
      mutation.mutate({ patchId: variables.tileId, status: variables.status });
    },
    [mutation],
  );

  const mutateAsync = useCallback(
    async (variables: { tileId: number; status: TileStatus }) => {
      const updatedTile = await mutation.mutateAsync({
        patchId: variables.tileId,
        status: variables.status,
      });

      return referencePatchToMLTile(updatedTile);
    },
    [mutation],
  );

  return {
    ...mutation,
    mutate,
    mutateAsync,
  };
}

export function useUpdateTileGeometry() {
  const mutation = useUpdatePatchGeometry();

  const mutate = useCallback(
    (variables: {
      tileId: number;
      geometry: GeoJSON.Polygon;
      bbox: { minx: number; miny: number; maxx: number; maxy: number };
      aoiCoveragePercent?: number | null;
    }) => {
      mutation.mutate({
        patchId: variables.tileId,
        geometry: variables.geometry,
        bbox: variables.bbox,
        aoiCoveragePercent: variables.aoiCoveragePercent,
      });
    },
    [mutation],
  );

  const mutateAsync = useCallback(
    async (variables: {
      tileId: number;
      geometry: GeoJSON.Polygon;
      bbox: { minx: number; miny: number; maxx: number; maxy: number };
      aoiCoveragePercent?: number | null;
    }) => {
      const updatedTile = await mutation.mutateAsync({
        patchId: variables.tileId,
        geometry: variables.geometry,
        bbox: variables.bbox,
        aoiCoveragePercent: variables.aoiCoveragePercent,
      });

      return referencePatchToMLTile(updatedTile);
    },
    [mutation],
  );

  return {
    ...mutation,
    mutate,
    mutateAsync,
  };
}

export function useDeleteMLTile() {
  const mutation = useDeleteReferencePatch();

  const mutate = useCallback(
    (variables: { tileId: number; datasetId: number }) => {
      mutation.mutate({ patchId: variables.tileId, datasetId: variables.datasetId });
    },
    [mutation],
  );

  const mutateAsync = useCallback(
    (variables: { tileId: number; datasetId: number }) =>
      mutation.mutateAsync({ patchId: variables.tileId, datasetId: variables.datasetId }),
    [mutation],
  );

  return {
    ...mutation,
    mutate,
    mutateAsync,
  };
}

export function useGenerateNestedTiles() {
  const mutation = useGenerateNestedPatches();

  const mutate = useCallback(
    (tile: IMLTile) => {
      mutation.mutate(mlTileToReferencePatch(tile));
    },
    [mutation],
  );

  const mutateAsync = useCallback(
    async (tile: IMLTile) => {
      const childTiles = await mutation.mutateAsync(mlTileToReferencePatch(tile));
      return childTiles.map(referencePatchToMLTile);
    },
    [mutation],
  );

  return {
    ...mutation,
    mutate,
    mutateAsync,
  };
}
