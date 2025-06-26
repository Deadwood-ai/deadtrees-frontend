
import { useQuery } from "@tanstack/react-query";
import { supabase } from "./useSupabase";
import { Settings } from "../config";

export function useForestGuessrData(gameKey: number) {
  return useQuery({
    queryKey: ["forest-guessr-data", gameKey],
    queryFn: async () => {
      const { data, error } = await supabase.from(Settings.DATA_TABLE_FULL).select("*");
      if (error) throw error;

      // Shuffle the array and pick the first 5
      const filteredData = data.filter(d => d.cog_path !== null && d.bbox !== null).map(d => {
        const bboxMatch = d.bbox?.match(/BOX\(([^\s]+)\s([^,]+),([^\s]+)\s([^\)]+)\)/);
        if (bboxMatch) {
          const minLon = parseFloat(bboxMatch[1]);
          const minLat = parseFloat(bboxMatch[2]);
          const maxLon = parseFloat(bboxMatch[3]);
          const maxLat = parseFloat(bboxMatch[4]);
          return {
            ...d,
            centroid: { coordinates: [(minLon + maxLon) / 2, (minLat + maxLat) / 2] },
          };
        }
        return d;
      });
      const shuffled = filteredData.sort(() => 0.5 - Math.random());
      return shuffled.slice(0, 5);
    },
    refetchOnWindowFocus: false, // Disable refetching on window focus
    // Removed staleTime and cacheTime to ensure new random data is fetched on each component mount.
  });
}
