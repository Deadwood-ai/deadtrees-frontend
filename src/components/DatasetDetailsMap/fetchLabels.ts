import { Settings } from "../../config";
import { ILabels } from "../../types/dataset";
import { supabase } from "../../useSupabase";

const fetchLabels = async ({
  dataset_id,
  // setLabels,
}: {
  dataset_id: number;
  // setLabels: React.Dispatch<React.SetStateAction<ILabels | null>>;
}): Promise<ILabels | null> => {
  console.log("dataset_id", dataset_id);
  const { data, error } = await supabase.from(Settings.LABELS_TABLE).select("*").eq("dataset_id", dataset_id);

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
