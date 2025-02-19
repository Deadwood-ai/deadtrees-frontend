import VectorTileLayer from "ol/layer/VectorTile";
import VectorTileSource from "ol/source/VectorTile";
import { Fill, Stroke, Style } from "ol/style";
import MVT from "ol/format/MVT";
import { supabase } from "../../hooks/useSupabase";
import { base64ToArrayBuffer } from "../../utils/base64ToArrayBuffer";
import { transformExtent } from "ol/proj";
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

          // Calculate tile extent in EPSG:3857
          const tileSize = 4096;
          const worldWidth = 40075016.68557849;
          const tileWidth = worldWidth / Math.pow(2, z);
          const tileExtent = [
            x * tileWidth - worldWidth / 2,
            worldWidth / 2 - (y + 1) * tileWidth,
            (x + 1) * tileWidth - worldWidth / 2,
            worldWidth / 2 - y * tileWidth,
          ];

          const features = format.readFeatures(uint8Array.buffer, {
            extent: [0, 0, tileSize, tileSize],
            dataProjection: "EPSG:3857",
            featureProjection: "EPSG:3857",
          });

          // Transform feature coordinates from tile space to EPSG:3857
          features.forEach((feature) => {
            const geometry = feature.getGeometry();
            if (geometry) {
              const coords = geometry.getCoordinates();
              const transformedCoords = coords.map((ring) =>
                ring.map((coord) => [
                  tileExtent[0] + (coord[0] / tileSize) * (tileExtent[2] - tileExtent[0]),
                  tileExtent[3] - (coord[1] / tileSize) * (tileExtent[3] - tileExtent[1]),
                ]),
              );
              geometry.setCoordinates(transformedCoords);
            }
          });

          tile.setFeatures(features);
          tile.setState(2); // LOADED
        }
      } catch (err) {
        console.error("Error loading tile:", err);
        tile.setState(3); // ERROR
      }
    },
    url: "deadwood/{z}/{x}/{y}",
    maxZoom: 19,
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
    maxZoom: 19,
    className: "deadwood-vector",
    renderMode: "vector",
    declutter: true,
    updateWhileAnimating: false,
    updateWhileInteracting: false,
  });

  return vectorLayer;
};

export default createDeadwoodVectorLayer;
