import { useQuery } from "@tanstack/react-query";
import { supabase } from "./useSupabase";

interface Publication {
  id: number;
  title: string;
  authors: string;
  year: string;
  url: string;
  publication_date: string;
  publisher: string;
  data_url?: string | null;
}

export const usePublications = () => {
  return useQuery({
    queryKey: ["publications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("publications")
        .select("*")
        .order("publication_date", { ascending: false });

      if (error) throw error;
      return data as Publication[];
    },
  });
};
