import axios from "axios";
import { Settings } from "../config";
import { supabase } from "../hooks/useSupabase";
import { isTokenExpiringSoon } from "../utils/isTokenExpiringSoon";

interface UploadOptions {
  file: File;
  metadata: {
    license: string;
    platform: string;
    authors: string[];
    project_id?: string;
    aquisition_year?: number;
    aquisition_month?: number;
    aquisition_day?: number;
    additional_information?: string;
    data_access?: string;
    citation_doi?: string;
  };
  onProgress: (progress: { percent: number }) => void;
  onSuccess: (response: any) => void;
  onError: (error: Error) => void;
  uploadId: string;
  session: any;
}

interface ChunkInfo {
  index: number;
  start: number;
  end: number;
  data: Blob;
}

const CHUNK_SIZE = 50 * 1024 * 1024; // 50 MB

// const refreshToken = async () => {
//   const { data, error } = await supabase.auth.refreshSession();
//   if (error) {
//     console.error("Error refreshing token:", error);
//     throw error;
//   }
//   return data.session?.access_token;
// };

const uploadOrtho = async (options: UploadOptions) => {
  const { file, onProgress, onSuccess, onError, uploadId, session } = options;
  const uploadStartTime = Date.now();

  try {
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    const resUpload = await uploadChunks(file, totalChunks, uploadStartTime, options);
    onSuccess(resUpload);
  } catch (error) {
    handleError(error, onError);
  }
};

async function uploadChunks(file: File, totalChunks: number, uploadStartTime: number, options: UploadOptions) {
  let resUpload;
  let currentSession = options.session;

  for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
    // Check if token needs refresh before each chunk upload
    if (isTokenExpiringSoon(currentSession)) {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) {
        console.error("Error refreshing token:", error);
        throw error;
      }
      currentSession = data.session;
      // console.log("Token refreshed");
      // console.log("currentSession", currentSession);
    }

    const chunkInfo = getChunkInfo(file, chunkIndex);
    const formData = createFormData(
      chunkInfo,
      totalChunks,
      file.name,
      options.uploadId,
      uploadStartTime,
      options.metadata,
    );

    resUpload = await uploadSingleChunk(formData, chunkInfo, file.size, {
      ...options,
      session: currentSession,
    });
  }

  return resUpload?.data;
}

function getChunkInfo(file: File, chunkIndex: number): ChunkInfo {
  const start = chunkIndex * CHUNK_SIZE;
  const end = Math.min(start + CHUNK_SIZE, file.size);
  return {
    index: chunkIndex,
    start,
    end,
    data: file.slice(start, end),
  };
}

function createFormData(
  chunkInfo: ChunkInfo,
  totalChunks: number,
  fileName: string,
  uploadId: string,
  startTime: number,
  metadata: {
    license: string;
    platform: string;
    authors: string[];
    project_id?: string;
    aquisition_year?: number;
    aquisition_month?: number;
    aquisition_day?: number;
    additional_information?: string;
    data_access?: string;
    citation_doi?: string;
  },
): FormData {
  const formData = new FormData();
  formData.append("file", chunkInfo.data, fileName);
  formData.append("chunk_index", chunkInfo.index.toString());
  formData.append("chunks_total", totalChunks.toString());
  formData.append("upload_id", uploadId);
  formData.append("copy_time", calculateCopyTime(startTime).toString());

  // Add metadata fields
  formData.append("license", "CC BY");
  formData.append("platform", metadata.platform);

  // Handle authors array
  metadata.authors.forEach((author) => {
    formData.append("authors", author);
  });

  // Optional fields
  if (metadata.project_id) formData.append("project_id", metadata.project_id);
  if (metadata.aquisition_year) formData.append("aquisition_year", metadata.aquisition_year.toString());
  if (metadata.aquisition_month) formData.append("aquisition_month", metadata.aquisition_month.toString());
  if (metadata.aquisition_day) formData.append("aquisition_day", metadata.aquisition_day.toString());
  if (metadata.additional_information) formData.append("additional_information", metadata.additional_information);
  if (metadata.data_access) formData.append("data_access", metadata.data_access);
  if (metadata.citation_doi) formData.append("citation_doi", metadata.citation_doi);

  return formData;
}

function calculateCopyTime(startTime: number): number {
  return Math.round((Date.now() - startTime) / 1000);
}

async function uploadSingleChunk(formData: FormData, chunkInfo: ChunkInfo, fileSize: number, options: UploadOptions) {
  const { session, onProgress } = options;

  // console.log("FormData contents:");
  // for (const pair of formData.entries()) {
  //   console.log(pair[0], pair[1]);
  // }

  try {
    const resUpload = await axios.post(`${Settings.API_URL_UPLOAD_ENDPOINT}`, formData, {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "multipart/form-data",
      },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total) {
          const percentComplete = calculateProgress(chunkInfo, progressEvent, fileSize);
          onProgress({ percent: percentComplete });
        }
      },
      timeout: 1000 * 60 * 10, // 10 minutes
    });
    return resUpload;
  } catch (error) {
    throw new Error(`Failed to upload chunk ${chunkInfo.index}`);
  }
}

function calculateProgress(chunkInfo: ChunkInfo, progressEvent: any, fileSize: number): number {
  const chunkProgress = progressEvent.loaded / progressEvent.total;
  const overallProgress = (chunkInfo.index * CHUNK_SIZE + chunkProgress * (chunkInfo.end - chunkInfo.start)) / fileSize;
  return Math.round(overallProgress * 100);
}

function handleError(error: unknown, onError: (error: Error) => void) {
  onError(error instanceof Error ? error : new Error("Upload failed"));
}

export default uploadOrtho;
