import VectorTileLayer from "ol/layer/VectorTile";
import VectorTileSource from "ol/source/VectorTile";
import { Fill, Stroke, Style } from "ol/style";
import MVT from "ol/format/MVT";
import { supabase } from "../../hooks/useSupabase";
import { base64ToArrayBuffer } from "../../utils/base64ToArrayBuffer";
import { transformExtent } from "ol/proj";
import Feature from "ol/Feature";
import TileGrid from "ol/tilegrid/TileGrid";

const createDeadwoodVectorLayer = () => {
  console.log("running createDeadwoodVectorLayer init");

  // Define the Web Mercator extent and proper resolutions for 4096 tile size
  const extent = [-20037508.342789244, -20037508.342789244, 20037508.342789244, 20037508.342789244];
  const worldWidth = 40075016.68557849;
  const resolutions = Array.from({ length: 23 }, (_, i) => worldWidth / (4096 * Math.pow(2, i)));

  const vectorSource = new VectorTileSource({
    format: new MVT({
      featureClass: Feature,
      geometryName: "geom",
    }),
    tileLoadFunction: async (tile, url) => {
      console.log("Attempting to load tile:", url);

      // Always check if source is disposed before starting
      if (vectorSource.disposed) {
        console.log("Source disposed before load");
        return;
      }

      const [z, x, y] = url.split("/").slice(-3).map(Number);
      console.log("Tile coordinates:", { z, x, y });

      try {
        console.log("Fetching tile data...");
        const { data, error } = await supabase.rpc("get_deadwood_vector_tiles", {
          z,
          x,
          y: y,
          resolution: 4096,
        });

        if (vectorSource.disposed) {
          console.log("Source disposed during fetch");
          return;
        }

        if (error) {
          console.error("Tile fetch error:", error);
          throw error;
        }

        if (data) {
          console.log("Tile data received, processing...");
          const uint8Array = base64ToArrayBuffer(data);
          const format = tile.getFormat();

          // Log tile extent and features
          const tileSize = 4096;
          const tileWidth = worldWidth / Math.pow(2, z);
          const tileExtent = [
            x * tileWidth - worldWidth / 2,
            worldWidth / 2 - (y + 1) * tileWidth,
            (x + 1) * tileWidth - worldWidth / 2,
            worldWidth / 2 - y * tileWidth,
          ];
          console.log("Tile extent:", tileExtent);

          const features = format.readFeatures(uint8Array.buffer, {
            extent: [0, 0, tileSize, tileSize],
            dataProjection: "EPSG:3857",
            featureProjection: "EPSG:3857",
          });

          console.log("Features read:", features.length);

          // Transform feature coordinates
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
          console.log("Tile features set, state:", tile.getState());
          tile.setState(2); // LOADED
        }
      } catch (err) {
        console.error("Error loading tile:", err);
        if (!vectorSource.disposed) {
          tile.setState(3); // ERROR
        }
      }
    },
    url: "deadwood/{z}/{x}/{y}",
    minZoom: 10,
    maxZoom: 22,
    tileSize: 4096,
    transition: 0,
    cacheSize: 0,
    extent: extent,
    tileGrid: new TileGrid({
      extent: extent,
      resolutions: resolutions,
      tileSize: 4096,
      minZoom: 10,
      maxZoom: 22,
    }),
  });

  console.log("Vector source initial state:", {
    disposed: vectorSource.disposed,
    projection: vectorSource.getProjection(),
    state: vectorSource.getState(),
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
    minZoom: 10,
    maxZoom: 22,
    className: "deadwood-vector",
    renderMode: "vector",
    declutter: true,
    updateWhileAnimating: false,
    updateWhileInteracting: false,
    preload: 0,
  });
  console.log("vectorLayer", vectorLayer);

  // Add a method to force refresh tiles
  vectorLayer.refreshTiles = () => {
    console.log("Forcing tile refresh");
    vectorSource.refresh();
    vectorSource.changed();
    vectorLayer.changed();
  };

  // Store event listener references for cleanup
  const prerenderListener = (event) => {
    const zoom = event.frameState.viewState.zoom;
    // console.log("Current zoom level:", zoom);
    // console.log("Layer visibility:", vectorLayer.getVisible());
    // console.log("Layer opacity:", vectorLayer.getOpacity());

    // Force tile refresh on first render
    if (!vectorLayer.hasLoadedTiles) {
      vectorLayer.refreshTiles();
      vectorLayer.hasLoadedTiles = true;
    }
  };

  vectorLayer.on("prerender", prerenderListener);
  vectorSource.on("tileloadstart", () => console.log("Tile load started"));
  vectorSource.on("tileloadend", () => console.log("Tile load ended"));
  vectorSource.on("tileloaderror", (err) => console.error("Tile load error:", err));

  // Add cleanup method to the layer
  vectorLayer.cleanup = () => {
    // Remove event listeners
    vectorLayer.un("prerender", prerenderListener);
    vectorSource.un("tileloadstart", () => console.log("Tile load started"));
    vectorSource.un("tileloadend", () => console.log("Tile load ended"));
    vectorSource.un("tileloaderror", (err) => console.error("Tile load error:", err));

    // Clear and dispose source
    vectorSource.clear();
    vectorSource.dispose();

    // Dispose layer
    vectorLayer.dispose();
  };

  return vectorLayer;
};

export default createDeadwoodVectorLayer;
