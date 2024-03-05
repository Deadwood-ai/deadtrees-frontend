export interface Dataset {
  aquisition_date: string;
  bbox: unknown | null;
  compress_time: number | null;
  content_type: string;
  copy_time: number;
  created_at: string;
  file_id: string;
  file_name: string;
  file_size: number;
  id: number;
  license: License;
  platform: Platform;
  sha256: string;
  status: Status;
  target_path: string;
  upload_date: string;
  user_id: string;
  uuid: string;
  wms_source: string | null;
}
enum License {
  "cc-by",
  "cc-by-sa",
}
enum Platform {
  "drone",
  "airborne",
  "sattelfite",
}
enum Status {
  "pending",
  "processing",
  "errored",
  "processed",
  "audited",
  "audit_failed",
}
