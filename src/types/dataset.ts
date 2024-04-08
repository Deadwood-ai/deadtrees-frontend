import { FeatureCollection } from "geojson";

export interface Dataset {
  aquisition_date: string;
  bbox: string | null;
  compress_time: number | null;
  content_type: string;
  copy_time: number;
  created_at: string;
  file_id: string;
  file_name: string;
  file_size: number;
  id: number;
  license: string;
  platform: Platform;
  processed_path: string;
  raw_path: string;
  sha256: string;
  status: Status;
  target_path: string;
  upload_date: string;
  user_id: string;
  uuid: string;
  wms_source: string | null;
  // labels
  // aoi: FeatureCollection | null;
  // standing_deadwood: FeatureCollection | null;
  project_id: string | null;
  authors_image: string | null;
  label_type: string | null;
  label_source: string | null;
  image_spectral_properties: string | null;
  citation_doi: string | null;
  label_quality: string | null;
  has_labels: boolean | null;
  public: boolean | null;
  display_filename: string | null;
  gadm_NAME_0: string | null;
  gadm_NAME_1: string | null;
  gadm_NAME_2: string | null;
  gadm_NAME_3: string | null;
}

export interface Labels {
  id: number;
  aoi: FeatureCollection;
  standing_deadwood: FeatureCollection;
  ortho_file_name: string;
}

export enum License {
  "cc-by",
  "cc-by-sa",
}
export enum Platform {
  "drone",
  "airborne",
  "sattelfite",
}
export enum Status {
  "pending",
  "processing",
  "errored",
  "processed",
  "audited",
  "audit_failed",
}
