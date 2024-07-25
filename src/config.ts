// const USE_LOCAL_SERVER = false;
const LOCAL_SERVER_URL = "http://0.0.0.0:8762";
const PRODUCTION_SERVER_URL = "https://data.deadtrees.earth/api/v1";

const DEV = import.meta.env.VITE_MODE === "development";
console.log("DEV", DEV);

export const Settings = {
  COLLABORATORS_TABLE: "collaborators",
  DATA_TABLE_FULL: DEV ? "dev_full_dataset" : "v2_full_dataset",
  THUMBNAILS_BUCKET: DEV ? "dev_thumbnails" : "v1_thumbnails",
  LABELS_TABLE: DEV ? "dev_labels" : "v1_labels",
  API_URL: LOCAL_SERVER_URL,
  METADATA_TABLE: DEV ? "dev_metadata" : "v1_metadata",
  DATA_TABLE: DEV ? "dev_dataset" : "v1_dataset",
};
