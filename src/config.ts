export const Configuration = {
  USE_LOCAL_SERVER: false,
  LOCAL_SERVER_URL: "http://localhost:3000",
  PRODUCTION_SERVER_URL: "https://api.deadtrees.earth",
};

const DEV = import.meta.env.VITE_MODE === "development";
console.log("DEV", DEV);

export const Settings = {
  COLLABORATORS_TABLE: "collaborators",
  DATA_TABLE: DEV ? "dev_full_dataset" : "v2_full_dataset",
  THUMBNAILS_BUCKET: DEV ? "dev_thumbnails" : "v1_thumbnails",
  LABELS_TABLE: DEV ? "dev_labels" : "v1_labels",
};
