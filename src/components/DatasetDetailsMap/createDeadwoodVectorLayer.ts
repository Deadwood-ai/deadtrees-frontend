import VectorTileLayer from "ol/layer/VectorTile";
import VectorTileSource from "ol/source/VectorTile";
import { Fill, Stroke, Style } from "ol/style";
import MVT from "ol/format/MVT";
import { supabase } from "../../hooks/useSupabase";
import { base64ToArrayBuffer } from "../../utils/base64ToArrayBuffer";
import Feature from "ol/Feature";

const createDeadwoodVectorLayer = () => {
  const vectorSource = new VectorTileSource({
    format: new MVT({
      featureClass: Feature,
      geometryName: "geom",
    }),
    tileLoadFunction: async (tile, url) => {
      const [z, x, y] = url.split("/").slice(-3).map(Number);

      try {
        const { data, error } = await supabase.rpc("get_deadwood_vector_tiles", {
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
    url: "deadwood/{z}/{x}/{y}",
    maxZoom: 22,
    tileSize: 4096,
  });

  const vectorLayer = new VectorTileLayer({
    source: vectorSource,
    style: new Style({
      fill: new Fill({
        color: "rgba(129, 176, 247, 0.5)",
      }),
      stroke: new Stroke({
        color: "#4285F4",
        width: 1,
      }),
    }),
    maxZoom: 22,
    className: "deadwood-vector",
    renderMode: "vector",
    declutter: true,
    updateWhileAnimating: false,
    updateWhileInteracting: false,
    preload: 0,
    useInterimTilesOnError: false,
  });

  return vectorLayer;
};

export default createDeadwoodVectorLayer;
