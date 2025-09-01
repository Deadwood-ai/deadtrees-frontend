import { UploadType } from "../types/dataset";

export const detectUploadType = (fileName: string): UploadType => {
  const ext = fileName.toLowerCase().split(".").pop();
  if (["tif", "tiff"].includes(ext || "")) {
    return UploadType.GEOTIFF;
  } else if (ext === "zip") {
    return UploadType.RAW_IMAGES_ZIP;
  }
  throw new Error(`Unsupported file type: ${ext}`);
};

export const validateFileSize = (file: File, uploadType: UploadType): boolean => {
  const MAX_ZIP_SIZE = 20 * 1024 * 1024 * 1024; // 20GB
  const MAX_GEOTIFF_SIZE = 16 * 1024 * 1024 * 1024; // 16GB

  if (uploadType === UploadType.RAW_IMAGES_ZIP && file.size > MAX_ZIP_SIZE) {
    throw new Error("ZIP files must be smaller than 20GB");
  }
  if (uploadType === UploadType.GEOTIFF && file.size > MAX_GEOTIFF_SIZE) {
    throw new Error("GeoTIFF files must be smaller than 16GB");
  }
  return true;
};
