import VectorTileLayer from "ol/layer/VectorTile";
import VectorTileSource from "ol/source/VectorTile";
import { Fill, Stroke, Style } from "ol/style";
import MVT from "ol/format/MVT";
import { supabase } from "../../hooks/useSupabase";
import { base64ToArrayBuffer } from "../../utils/base64ToArrayBuffer";
import Feature from "ol/Feature";
import TileGrid from "ol/tilegrid/TileGrid";

const createDeadwoodVectorLayer = () => {
  console.log("running createDeadwoodVectorLayer init");

  // Define Web Mercator extent and resolutions for a 4096-tile system
  const extent = [-20037508.342789244, -20037508.342789244, 20037508.342789244, 20037508.342789244];
  const worldWidth = 40075016.68557849;
  const tileSize = 4096;
  const resolutions = Array.from({ length: 23 }, (_, i) => worldWidth / (tileSize * Math.pow(2, i)));

  const vectorSource = new VectorTileSource({
    format: new MVT({
      featureClass: Feature,
      geometryName: "geom",
    }),
    tileLoadFunction: async (tile, url) => {
      console.log("Attempting to load tile:", url);
      const [z, x, y] = url.split("/").slice(-3).map(Number);
      console.log("Tile coordinates:", { z, x, y });

      try {
        // Call the Supabase RPC with 4096 tile size
        const { data, error } = await supabase.rpc("get_deadwood_vector_tiles", {
          z,
          x,
          y,
          resolution: tileSize,
        });
        if (error) {
          console.error("Tile fetch error:", error);
          throw error;
        }
        if (data) {
          const uint8Array = base64ToArrayBuffer(data);
          const format = tile.getFormat();
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
          // Adjust coordinates from tile space (4096) to Web Mercator extent
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
    minZoom: 10,
    maxZoom: 22,
    tileSize: tileSize,
    transition: 0,
    cacheSize: 0,
    extent: extent,
    tileGrid: new TileGrid({
      extent: extent,
      resolutions: resolutions,
      tileSize: tileSize,
      minZoom: 10,
      maxZoom: 22,
    }),
  });

  const vectorLayer = new VectorTileLayer({
    source: vectorSource,
    style: new Style({
      fill: new Fill({ color: "rgba(129, 176, 247, 0.5)" }),
      stroke: new Stroke({ color: "#4285F4", width: 1 }),
    }),
    minZoom: 10,
    maxZoom: 22,
    className: "deadwood-vector",
    renderMode: "vector",
    declutter: true,
    preload: 0,
  });
  return vectorLayer;
};

export default createDeadwoodVectorLayer;
