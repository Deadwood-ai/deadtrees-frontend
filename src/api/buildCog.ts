import { Settings } from "../config";

const buildCog = async (dataset_id: number, token: string) => {
  try {
    const res = await fetch(
      // `${Settings.API_URL}/datasets/${dataset_id}/build-cog`
      `https://cors-anywhere.herokuapp.com/${Settings.API_URL}/datasets/${dataset_id}/build-cog`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json", // Specify that the content type is JSON
        },
        body: JSON.stringify({
          overviews: 8, // Number of overview layers to generate
          resolution: 0.04, // Target resolution in the COG file
          profile: "webp", // Profile type for the COG (e.g., webp, jpeg, etc.)
          force_recreate: false, // Flag to force recreate the COG if it already exists
        }),
      },
    );

    if (!res.ok) {
      throw new Error(`HTTP error! Status: ${res.status}`);
    }

    const data = await res.json(); // Parse the response body as JSON
    console.log("Build-cog response data:", data);
    return data;
  } catch (error) {
    console.error("Build-cog error:", error);
    throw error;
  }
};

export default buildCog;
