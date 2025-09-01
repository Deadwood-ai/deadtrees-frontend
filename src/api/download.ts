import { Settings } from "../config";

interface DownloadOptions {
  onAuthError?: (message: string) => void;
}

const download = async (dataset_id: string, token?: string, options?: DownloadOptions) => {
  try {
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${Settings.API_URL}/download/datasets/${dataset_id}/dataset.zip`, {
      method: "GET",
      headers,
    });

    // Handle authentication errors
    if (response.status === 401 || response.status === 403) {
      const errorMessage =
        response.status === 401
          ? "Authentication required to download this dataset. Please sign in."
          : "You don't have permission to download this dataset.";

      if (options?.onAuthError) {
        options.onAuthError(errorMessage);
      }
      throw new Error(errorMessage);
    }

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    // console.log("Download URL:", url);
    const a = document.createElement("a");
    a.href = url;
    a.download = "dataset.zip"; // Set the filename for the download
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);

    // console.log("Download successful");
  } catch (error) {
    console.error("Download error:", error);
    throw error;
  }
};

export default download;
