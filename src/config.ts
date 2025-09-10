// const USE_LOCAL_SERVER = false;
// const LOCAL_SERVER_URL = "http://0.0.0.0:8762";
// Allow overriding dev/prod behavior with VITE_MODE to support local frontend using prod services
const DEV = (import.meta.env.VITE_MODE as string | undefined)
  ? import.meta.env.VITE_MODE === "development"
  : import.meta.env.DEV;
//console.log("DEV", DEV);

const STORAGE_SERVER_DEV = "http://localhost:8080";
const STORAGE_SERVER_URL = "https://data2.deadtrees.earth";

const API_URL_DEV = STORAGE_SERVER_DEV + "/api/v1";
const API_URL_PROD = STORAGE_SERVER_URL + "/api/v1";

const API_URL_UPLOAD_ENDPOINT_DEV = API_URL_DEV + "/datasets/chunk";
const API_URL_UPLOAD_ENDPOINT_PROD = API_URL_PROD + "/datasets/chunk";

const COG_BASE_URL_DEV = STORAGE_SERVER_DEV + "/cogs/v1/";
const COG_BASE_URL_PROD = STORAGE_SERVER_URL + "/cogs/v1/";

const THUMBNAIL_URL_DEV = STORAGE_SERVER_DEV + "/thumbnails/v1/";
const THUMBNAIL_URL_PROD = STORAGE_SERVER_URL + "/thumbnails/v1/";

const SUPABASE_URL_DEV = "http://127.0.0.1:54321";
const SUPABASE_URL_PROD = import.meta.env.VITE_SUPABASE_URL;

const SUPABASE_ANON_KEY_DEV = import.meta.env.VITE_SUPABASE_ANON_KEY;
const SUPABASE_ANON_KEY_PROD = import.meta.env.VITE_SUPABASE_ANON_KEY;

// AI Segmentation API (proxy in dev to avoid CORS)
const SAM_API_URL_DEV = "/api/sam";
const SAM_API_URL_PROD = "https://geosense--sam-api-fastapi-app.modal.run";
// Important: keep SAM proxy tied to actual dev server, not VITE_MODE override
const SAM_API_URL = import.meta.env.DEV ? SAM_API_URL_DEV : SAM_API_URL_PROD;

export const Settings = {
  API_URL: DEV ? API_URL_DEV : API_URL_PROD,
  COG_BASE_URL: DEV ? COG_BASE_URL_DEV : COG_BASE_URL_PROD,
  THUMBNAIL_URL: DEV ? THUMBNAIL_URL_DEV : THUMBNAIL_URL_PROD,
  SUPABASE_URL: DEV ? SUPABASE_URL_DEV : SUPABASE_URL_PROD,
  SUPABASE_ANON_KEY: DEV ? SUPABASE_ANON_KEY_DEV : SUPABASE_ANON_KEY_PROD,
  API_URL_UPLOAD_ENDPOINT: DEV ? API_URL_UPLOAD_ENDPOINT_DEV : API_URL_UPLOAD_ENDPOINT_PROD,
  DEV: DEV,
  SAM_API_URL,

  DATA_TABLE_FULL: "v2_full_dataset_view", // For admin/audit use (includes excluded datasets)
  DATA_TABLE_PUBLIC: "v2_full_dataset_view_public", // For public use (excludes excluded datasets)
  THUMBNAILS_TABLE: "v2_thumbnails",
  COLLABORATORS_TABLE: "collaborators",
  LABELS_TABLE: "v2_labels",
  NEWSLETTER_TABLE: "newsletter",
  LOGS_TABLE: "v2_logs",
};

// console.debug("Settings", Settings);
