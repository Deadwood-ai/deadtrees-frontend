import { supabase } from "../hooks/useSupabase";

const getDeadwoodCOGUrl = (year: string | null) => {
  // const baseUrl = "https://ijuphmnaebfdzsfrnsrn.supabase.co/storage/v1/object/public/COG/DE-";
  const baseUrl = "https://data2.deadtrees.earth/products/v1/DE-";
  const url = `${baseUrl}${year}-COG.tif`;

  // console.log("public URL of COG:", url);
  return url;
};

export default getDeadwoodCOGUrl;
