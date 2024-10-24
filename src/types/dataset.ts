import { FeatureCollection } from "geojson";

interface ICentroid {
  lng: number;
  lat: number;
}

export interface IThumbnail {
  file_name: string;
  url: string;
}
export enum IDataAccess {
  "public",
  "private",
  "viewonly",
}

export interface ILabelObject {
  dataset_id: number;
  user_id: string;
  file: File;
  file_alias: string;
  labels_description: string;
  file_type: string;
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
  additional_information: string | null;
  data_access: IDataAccess;
  admin_level_1: string | null;
  admin_level_2: string | null;
  admin_level_3: string | null;
  aquisition_day: string;
  aquisition_month: string;
  aquisition_year: string;
  cog_folder: string | null;
  cog_name: string | null;
  cog_url: string | null;
  label_source: string | null;
  label_quality: string | null;
  label_type: string | null;
  thumbnail_path: string | null;
}

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

export enum ILicense {
  "CC BY",
  "CC BY-SA",
  "CC BY-NC-SA",
  "MIT",
}

export enum IPlatform {
  "drone",
  "airborne",
  "satellite",
}

export enum ISpectralProperties {
  "RGB",
  "NIRRGB",
}

export enum IStatus {
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
