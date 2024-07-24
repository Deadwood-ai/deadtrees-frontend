import { Settings } from "../config";

const uploadFile = async (file: any, token: string) => {
  console.log("file in uploadFile", file);
  const formData = new FormData();
  formData.append("file", file);
  try {
    const res = await fetch(Settings.API_URL + "/datasets", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      method: "POST",
      body: formData,
    });
    console.log("res", res);
    return res;
  } catch (error) {
    console.error("Upload error:", error);
  }
};

export default uploadFile;
