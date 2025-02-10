import { supabase } from "../hooks/useSupabase";
import { Settings } from "../config";

export const fetchData = async () => {
  const { data, error } = await supabase.from(Settings.DATA_TABLE_FULL).select("*");
  if (error) throw error;
  return data;
};

export const fetchCollaborators = async () => {
  const { data, error } = await supabase.from("collaborators").select("*");
  if (error) throw error;
  return data;
};
