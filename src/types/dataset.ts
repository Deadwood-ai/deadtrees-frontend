import { FeatureCollection } from "geojson";

interface ICentroid {
  lng: number;
  lat: number;
}

export interface IThumbnail {
  file_name: string;
  url: string;
}

export interface IDataset {
  id: number;
  file_name: string | null;
  file_size: number;
  bbox: string | null;
  status: string | null;
  created_at: string;
  copy_time: number;
  sha256: string;
  file_alias: string | null;
  dataset_id: number;
  user_id: string;
  name: string;
  license: string;
  platform: string;
  project_id: string | null;
  authors: string | null;
  spectral_properties: string | null;
  citation_doi: string | null;
  gadm_NAME_0: string | null;
  gadm_NAME_1: string | null;
  gadm_NAME_2: string | null;
  gadm_NAME_3: string | null;
  aquisition_date: string;
  cog_folder: string | null;
  cog_name: string | null;
  cog_url: string | null;
  label_source: string | null;
  label_quality: string | null;
  label_type: string | null;
}

// export interface Dataset {
//   aquisition_date: string;
//   bbox: string | null;
//   compress_time: number | null;
//   content_type: string;
//   copy_time: number;
//   created_at: string;
//   file_id: string;
//   file_name: string;
//   file_size: number;
//   id: number;
//   license: string;
//   // platform: Platform;
//   platform: string;
//   processed_path: string;
//   raw_path: string;
//   sha256: string;
//   status: Status;
//   target_path: string;
//   upload_date: string;
//   user_id: string;
//   uuid: string;
//   wms_source: string | null;
//   // labels
//   // aoi: FeatureCollection | null;
//   // standing_deadwood: FeatureCollection | null;
//   project_id: string | null;
//   authors_image: string | null;
//   label_type: string | null;
//   label_source: string | null;
//   image_spectral_properties: string | null;
//   citation_doi: string | null;
//   label_quality: string | null;
//   has_labels: boolean | null;
//   public: boolean | null;
//   display_filename: string | null;
//   gadm_NAME_0: string | null;
//   gadm_NAME_1: string | null;
//   gadm_NAME_2: string | null;
//   gadm_NAME_3: string | null;
// }

export interface ILabels {
  id: number;
  dataset_id: number;
  user_id: string;
  aoi: FeatureCollection;
  label: FeatureCollection;
  label_source: string;
  label_quality: number;
  created_at: string;
  label_type: string;
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

export interface IStats {
  id: number;
  created_at: string;
  date: string;
  area_covered: number;
  orthophoto_count: number;
  countries_count: number;
  contributors_count: number;
}

export interface ICollaborators {
  id: number;
  created_at: string;
  collaborator_text: string;
}
