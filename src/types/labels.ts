import { GeoJSON } from "geojson";

export enum ILabelSource {
  MANUAL = "manual",
  AUTOMATIC = "automatic",
  SEMI_AUTOMATIC = "semi_automatic",
}

export enum ILabelType {
  SEGMENTATION = "segmentation",
  POINT_OBSERVATION = "point_observation",
  INSTANCE_SEGMENTATION = "instance_segmentation",
  SEMANTIC_SEGMENTATION = "semantic_segmentation",
}

export enum ILabelData {
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
  label_source: ILabelSource;
  label_type: ILabelType;
  label_data: ILabelData;
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
