import axios from "axios";
import { Settings } from "../config";
import { supabase } from "../hooks/useSupabase";
import { isTokenExpiringSoon } from "../utils/isTokenExpiringSoon";

interface UploadOptions {
  file: File;
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

const CHUNK_SIZE = 100 * 1024 * 1024; // 100 MB

const refreshToken = async () => {
  const { data, error } = await supabase.auth.refreshSession();
  if (error) {
    console.error("Error refreshing token:", error);
    throw error;
  }
  return data.session?.access_token;
};

const upload = async (options: UploadOptions) => {
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
      console.log("Token refreshed");
      console.log("currentSession", currentSession);
    }

    const chunkInfo = getChunkInfo(file, chunkIndex);
    const formData = createFormData(chunkInfo, totalChunks, file.name, options.uploadId, uploadStartTime);

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
): FormData {
  const formData = new FormData();
  formData.append("file", chunkInfo.data, fileName);
  formData.append("chunk_index", chunkInfo.index.toString());
  formData.append("chunks_total", totalChunks.toString());
  formData.append("filename", fileName);
  formData.append("upload_id", uploadId);
  formData.append("copy_time", calculateCopyTime(startTime).toString());
  return formData;
}

function calculateCopyTime(startTime: number): number {
  return Math.round((Date.now() - startTime) / 1000);
}

async function uploadSingleChunk(formData: FormData, chunkInfo: ChunkInfo, fileSize: number, options: UploadOptions) {
  const { session, onProgress } = options;

  try {
    const resUpload = await axios.post(`${Settings.API_URL}/datasets/chunk`, formData, {
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

export default upload;
