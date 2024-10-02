import { Settings } from "../config";

interface IUploadOptions {
  file: File;
  onProgress: (progress: { percent: number }) => void;
  onSuccess: (response: any) => void;
  onError: (error: Error) => void;
  uploadId: string;
  session: any;
}

const upload = (options: IUploadOptions) => {
  const { file, onProgress, onSuccess, onError, uploadId, session } = options;
  const CHUNK_SIZE = 40 * 1024 * 1024; // 50 MB
  const chunks = Math.ceil(file.size / CHUNK_SIZE);
  let currentChunk = 0;

  const uploadStartTime = Date.now(); // Set the upload start time

  const uploadChunk = (start) => {
    const end = Math.min(start + CHUNK_SIZE, file.size);
    const chunk = file.slice(start, end);
    const copyTime = Math.round((Date.now() - uploadStartTime) / 1000); // Convert to seconds

    const formData = new FormData();
    formData.append("file", chunk, file.name);
    formData.append("chunk_index", currentChunk.toString());
    formData.append("chunks_total", chunks.toString());
    formData.append("filename", file.name);
    formData.append("upload_id", uploadId);
    formData.append("copy_time", copyTime.toString());

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${Settings.API_URL}/datasets/chunk`);
    xhr.setRequestHeader("Authorization", `Bearer ${session.access_token}`);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percentComplete = Math.round(((currentChunk * CHUNK_SIZE + event.loaded) / file.size) * 100);
        onProgress({ percent: percentComplete });
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        currentChunk++;
        if (currentChunk < chunks) {
          uploadChunk(currentChunk * CHUNK_SIZE);
        } else {
          onSuccess(JSON.parse(xhr.response));
        }
      } else {
        onError(new Error(xhr.statusText));
      }
    };

    xhr.onerror = () => {
      onError(new Error("Upload failed."));
    };

    xhr.send(formData);
  };

  uploadChunk(0);
};

export default upload;
