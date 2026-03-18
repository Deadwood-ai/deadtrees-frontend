import { UploadType } from "../types/dataset";
import { unzipRaw } from "unzipit";

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
  const MAX_ZIP_SIZE = 30 * 1024 * 1024 * 1024; // 30GB
  const MAX_GEOTIFF_SIZE = 20 * 1024 * 1024 * 1024; // 20GB

  if (uploadType === UploadType.RAW_IMAGES_ZIP && file.size > MAX_ZIP_SIZE) {
    throw new Error("ZIP files must be smaller than 30GB");
  }
  if (uploadType === UploadType.GEOTIFF && file.size > MAX_GEOTIFF_SIZE) {
    throw new Error("GeoTIFF files must be smaller than 20GB");
  }
  return true;
};

const ALLOWED_ZIP_METHODS = new Set([0, 8]); // stored, deflate
const ALLOWED_ZIP_METHODS_TEXT = "stored (method 0), deflate (method 8)";

type ZipEntryWithCompressionMethod = {
  compressionMethod?: number;
};

const methodName = (method: number): string => {
  switch (method) {
    case 0:
      return "stored";
    case 8:
      return "deflate";
    case 9:
      return "deflate64";
    case 12:
      return "bzip2";
    case 14:
      return "lzma";
    default:
      return `method-${method}`;
  }
};

export const validateZipCompressionMethods = async (file: File): Promise<void> => {
  let entries: ZipEntryWithCompressionMethod[] = [];
  try {
    const zipInfo = await unzipRaw(file);
    entries = zipInfo.entries as ZipEntryWithCompressionMethod[];
  } catch {
    throw new Error("Invalid ZIP archive");
  }

  const methodCounts = new Map<number, number>();

  for (const entry of entries) {
    const compressionMethod = entry.compressionMethod;
    if (typeof compressionMethod !== "number") {
      throw new Error("Unable to inspect ZIP compression methods");
    }
    methodCounts.set(compressionMethod, (methodCounts.get(compressionMethod) ?? 0) + 1);
  }

  const unsupported = [...methodCounts.entries()].filter(([method]) => !ALLOWED_ZIP_METHODS.has(method));
  if (unsupported.length > 0) {
    const formatted = unsupported
      .map(([method, count]) => `${methodName(method)} (method ${method}, ${count} file(s))`)
      .join(", ");
    throw new Error(
      `Unsupported ZIP compression method(s): ${formatted}. Please re-compress the ZIP using one of: ${ALLOWED_ZIP_METHODS_TEXT}.`,
    );
  }
};
