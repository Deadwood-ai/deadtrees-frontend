import VectorTileLayer from "ol/layer/VectorTile";
import VectorTileSource from "ol/source/VectorTile";
import { Fill, Stroke, Style } from "ol/style";
import MVT from "ol/format/MVT";
import { supabase } from "../../hooks/useSupabase";
import { base64ToArrayBuffer } from "../../utils/base64ToArrayBuffer";
import Feature from "ol/Feature";

interface VectorLayerConfig {
  rpcFunctionName: string;
  className: string;
  style: {
    fillColor: string;
    strokeColor: string;
    strokeWidth: number;
  };
}

const createVectorLayer = (config: VectorLayerConfig) => {
  const vectorSource = new VectorTileSource({
    format: new MVT({
      featureClass: Feature,
      geometryName: "geom",
    }),
    tileLoadFunction: async (tile, url) => {
      const [z, x, y] = url.split("/").slice(-3).map(Number);

      try {
        const { data, error } = await supabase.rpc(config.rpcFunctionName, {
          z,
          x,
          y: y,
          resolution: 4096,
        });

        if (error) throw error;

        if (data) {
          const uint8Array = base64ToArrayBuffer(data);
          const format = tile.getFormat();

          const features = format.readFeatures(uint8Array, {
            extent: tile.extent,
            featureProjection: "EPSG:3857",
          });

          tile.setFeatures(features);
        }
      } catch (err) {
        console.error("Error loading tile:", err);
        tile.setState(3); // ERROR
      }
    },
    url: `${config.className}/{z}/{x}/{y}`,
    maxZoom: 22,
    tileSize: 4096,
    cacheSize: 256,
    preload: 1,
    transition: 250,
  });

  const vectorLayer = new VectorTileLayer({
    source: vectorSource,
    style: new Style({
      fill: new Fill({
        color: config.style.fillColor,
      }),
      stroke: new Stroke({
        color: config.style.strokeColor,
        width: config.style.strokeWidth,
      }),
    }),
    maxZoom: 22,
    className: config.className,
    renderMode: "hybrid",
    declutter: false,
    updateWhileAnimating: true,
    updateWhileInteracting: true,
    useInterimTilesOnError: true,
  });

  return vectorLayer;
};

export const createDeadwoodVectorLayer = () =>
  createVectorLayer({
    rpcFunctionName: "get_deadwood_vector_tiles",
    className: "deadwood-vector",
    style: {
      fillColor: "rgba(129, 176, 247, 0.5)",
      strokeColor: "#4285F4",
      strokeWidth: 1,
    },
  });

export const createForestCoverVectorLayer = () =>
  createVectorLayer({
    rpcFunctionName: "get_forest_cover_vector_tiles",
    className: "forest-cover-vector",
    style: {
      fillColor: "rgba(34, 197, 94, 0.5)", // Green with high opacity
      strokeColor: "#16a34a", // Darker green for stroke
      strokeWidth: 1,
    },
  });
