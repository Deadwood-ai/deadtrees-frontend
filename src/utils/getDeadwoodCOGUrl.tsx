import { supabase } from "../components/useSupabase";

const getDeadwoodCOGUrl = (year: string | null) => {
  const url = supabase.storage.from("COG").getPublicUrl(`DE-${year}-COGv2.tif`);
  console.log("public URL of COG:", url);
  return url.data.publicUrl;
};

export default getDeadwoodCOGUrl;
