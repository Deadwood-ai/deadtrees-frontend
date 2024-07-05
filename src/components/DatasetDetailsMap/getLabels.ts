import { ILabels } from "../../types/dataset";
import { supabase } from "../useSupabase";

const fetchLabels = async ({
  file_name,
  // setLabels,
}: {
  file_name: string;
  // setLabels: React.Dispatch<React.SetStateAction<ILabels | null>>;
}): Promise<ILabels | null> => {
  console.log("file_name", file_name);
  const { data, error } = await supabase
    .from("labels_dev_egu")
    .select("id, aoi, standing_deadwood, ortho_file_name")
    .eq("ortho_file_name", file_name);

  if (error) {
    console.error("Error fetching data:", error);
    return null;
  } else {
    // setLabels(data[0]);
    return data[0];
    console.log("Data fetched:", data);
  }
};
export default fetchLabels;
