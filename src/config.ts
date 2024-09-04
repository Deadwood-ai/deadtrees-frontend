// const USE_LOCAL_SERVER = false;
const LOCAL_SERVER_URL = "http://0.0.0.0:8762";
// const PRODUCTION_SERVER_URL = "https://data.deadtrees.earth/api/v1";
const PRODUCTION_SERVER_URL = "https://data.deadtrees.earth/";

const DEV = import.meta.env.VITE_MODE === "development";
console.log("DEV", DEV);

export const Settings = {
  COLLABORATORS_TABLE: "collaborators",
  DATA_TABLE_FULL: DEV ? "dev_full_dataset" : "v1_full_dataset_view",
  THUMBNAILS_BUCKET: DEV ? "dev_thumbnails" : "v1_thumbnails",
  LABELS_TABLE: DEV ? "dev_labels" : "v1_labels",
  API_URL: DEV ? LOCAL_SERVER_URL : PRODUCTION_SERVER_URL + "api/v1",
  METADATA_TABLE: DEV ? "dev_metadata" : "v1_metadata",
  DATA_TABLE: DEV ? "dev_dataset" : "v1_datasets",
  COG_BASE_URL: PRODUCTION_SERVER_URL + "cogs/v1",
};
