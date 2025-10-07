export type TileResolution = 5 | 10 | 20;

export type TileStatus = "pending" | "good" | "bad";

export interface IMLTile {
  id: number;
  dataset_id: number;
  user_id: string;
  resolution_cm: TileResolution;
  geometry: GeoJSON.Polygon; // In EPSG:3857
  parent_tile_id: number | null;
  status: TileStatus;
  tile_index: string;

  // Bounding box for export
  bbox_minx: number;
  bbox_miny: number;
  bbox_maxx: number;
  bbox_maxy: number;

  // Coverage statistics
  aoi_coverage_percent: number | null;
  deadwood_prediction_coverage_percent: number | null;
  forest_cover_prediction_coverage_percent: number | null;

  created_at: string;
  updated_at: string;
}

export interface ITileSession {
  dataset_id: number;
  is_locked: boolean;
  locked_by: string | null;
  locked_at: string | null;
}

export interface ITileGenerationProgress {
  dataset_id: number;
  total_20cm: number;
  completed_20cm: number;
  total_10cm: number;
  good_10cm: number;
  bad_10cm: number;
  pending_10cm: number;
  total_5cm: number;
  good_5cm: number;
  bad_5cm: number;
  pending_5cm: number;
}

export interface ITilePlacementDraft {
  resolution_cm: TileResolution;
  center: [number, number];
}

export interface ITilePhaseState {
  hasPlacementTiles: boolean;
  hasPendingQA: boolean;
  completionPercent: number;
}
