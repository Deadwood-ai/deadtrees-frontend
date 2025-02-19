import { GeoJSON } from "geojson";

export enum LabelSource {
  MANUAL = "manual",
  AUTOMATIC = "automatic",
  SEMI_AUTOMATIC = "semi_automatic",
}

export enum LabelType {
  DEADWOOD = "deadwood",
  FOREST_COVER = "forest_cover",
}

export interface IAOI {
  id: number;
  dataset_id: number;
  user_id: string;
  geometry: GeoJSON.Geometry;
  is_whole_image: boolean;
  image_quality?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ILabel {
  id: number;
  dataset_id: number;
  aoi_id?: number;
  user_id: string;
  label_source: LabelSource;
  label_type: LabelType;
  label_data: any; // You might want to type this more specifically
  label_quality?: number;
  model_config?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface IDeadwoodGeometry {
  id: number;
  label_id: number;
  geometry: GeoJSON.Geometry;
  properties?: Record<string, any>;
  created_at: string;
}
