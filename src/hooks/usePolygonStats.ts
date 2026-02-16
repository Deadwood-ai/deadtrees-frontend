import { useState } from "react";
import axios from "axios";
import { Settings } from "../config";

export interface YearStats {
  year: number;
  deadwood_mean_pct: number | null;
  deadwood_pixel_count: number | null;
  deadwood_area_ha: number | null;
  forest_mean_pct: number | null;
  forest_pixel_count: number | null;
  forest_area_ha: number | null;
}

export interface PolygonStatsResponse {
  polygon_area_km2: number;
  available_years: number[];
  stats: YearStats[];
}

export function usePolygonStats() {
  const [data, setData] = useState<PolygonStatsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async (polygon: GeoJSON.Polygon) => {
    setLoading(true);
    setError(null);
    setData(null);

    try {
      console.debug("[PolygonStats] POST", `${Settings.API_URL}/dte-stats/polygon`);
      console.debug("[PolygonStats] Polygon:", JSON.stringify(polygon));
      const response = await axios.post<PolygonStatsResponse>(
        `${Settings.API_URL}/dte-stats/polygon`,
        { polygon },
      );
      console.debug("[PolygonStats] Response:", JSON.stringify(response.data));
      setData(response.data);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const detail = err.response?.data?.detail;
        setError(typeof detail === "string" ? detail : err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to fetch polygon statistics");
      }
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setData(null);
    setError(null);
    setLoading(false);
  };

  return { data, loading, error, fetchStats, reset };
}
