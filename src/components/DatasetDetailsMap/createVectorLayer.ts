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
  labelId?: number | null;
}

const createVectorLayer = (config: VectorLayerConfig) => {
  const vectorSource = new VectorTileSource({
    format: new MVT({
      featureClass: Feature,
      geometryName: "geom",
    }),
    tileLoadFunction: async (tile, url) => {
      const [z, x, y] = url.split("/").slice(-3).map(Number);
      // console.log(`[Tile Request] z=${z}, x=${x}, y=${y}`);
      // Skip API call completely if no labelId is provided
      if (!config.labelId) {
        // Set empty features for the tile when no label ID exists
        tile.setFeatures([]);
        return;
      }

      try {
        const startTime = performance.now();
        const { data, error } = await supabase.rpc(config.rpcFunctionName, {
          z,
          x,
          y,
          resolution: 4096,
          filter_label_id: config.labelId || null,
        });
        // const fetchTime = performance.now() - startTime;

        if (error) throw error;

        if (data) {
          // console.log(`[Tile Success] z=${z}, x=${x}, y=${y}, fetch=${fetchTime.toFixed(0)}ms`);
          // const decodeStart = performance.now();
          const uint8Array = base64ToArrayBuffer(data);
          const format = tile.getFormat();

          const features = format.readFeatures(uint8Array, {
            extent: tile.extent,
            featureProjection: "EPSG:3857",
          });

          // const decodeTime = performance.now() - decodeStart;
          // console.log(
          // `[Tile Processed] z=${z}, x=${x}, y=${y}, features=${features.length}, decode=${decodeTime.toFixed(0)}ms`,
          // );

          // Log any extremely large features that might cause issues
          // features.forEach((feature, i) => {
          //   const geom = feature.getGeometry();
          //   if (geom && geom.getType() === "Polygon") {
          //     const coords = geom.getCoordinates();
          //     if (coords[0] && coords[0].length > 1000) {
          //       console.warn(`[Large Geometry] z=${z}, x=${x}, y=${y}, feature=${i}, vertices=${coords[0].length}`);
          //     }
          //   }
          // });

          tile.setFeatures(features);
        } else {
          tile.setState(3); // ERROR
        }
      } catch (err) {
        console.error(`[Tile Error] z=${z}, x=${x}, y=${y}:`, err);
        tile.setState(3); // ERROR
      }
    },
    url: `${config.className}/{z}/{x}/{y}`,
    maxZoom: 22,
    tileSize: 512,
    cacheSize: 256,
    preload: 1,
    maxParallelImageRequests: 6,
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

export const createDeadwoodVectorLayer = (labelId?: number | null) =>
  createVectorLayer({
    rpcFunctionName: "get_deadwood_vector_tiles",
    className: "deadwood-vector",
    style: {
      fillColor: "rgba(129, 176, 247, 0.5)",
      strokeColor: "#4285F4",
      strokeWidth: 1,
    },
    labelId: labelId || undefined,
  });

export const createForestCoverVectorLayer = (labelId?: number) =>
  createVectorLayer({
    rpcFunctionName: "get_forest_cover_vector_tiles",
    className: "forest-cover-vector",
    style: {
      fillColor: "rgba(34, 197, 94, 0.5)", // Green with high opacity
      strokeColor: "#16a34a", // Darker green for stroke
      strokeWidth: 1,
    },
    labelId,
  });
