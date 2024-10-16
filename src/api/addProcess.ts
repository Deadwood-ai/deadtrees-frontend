import { Settings } from "../config";

interface IProcessCOG {
  resolution: number;
  profile: string;
  quality: number;
  force_recreate: boolean;
  tiling_scheme: string;
}

const addProcess = async (dataset_id: number, task_type: string, token: string, build_args: IProcessCOG) => {
  try {
    const res = await fetch(`${Settings.API_URL}/datasets/${dataset_id}/process?task_type=${task_type}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json", // Specify that the content type is JSON
      },
      body: JSON.stringify(build_args),
    });
    if (!res.ok) {
      throw new Error(`HTTP error! Status: ${res.status}`);
    }

    const data = await res.json(); // Parse the response body as JSON
    console.log("Add process response data:", data);
    return data;
  } catch (error) {
    console.error("Add process error:", error);
    throw error;
  }
};

export default addProcess;
