import VectorTileLayer from "ol/layer/VectorTile";
import VectorTileSource from "ol/source/VectorTile";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import { Fill, Stroke, Style } from "ol/style";
import MVT from "ol/format/MVT";
import GeoJSON from "ol/format/GeoJSON";
import { Polygon } from "ol/geom";
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
    cacheSize: 1024,
    transition: 250,
    // transition: 1,
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
    maxZoom: 23,
    className: config.className,
    renderMode: "vector",
    renderBuffer: 256,
    declutter: false,
    updateWhileAnimating: false,
    updateWhileInteracting: false,
    useInterimTilesOnError: true,
    preload: 0,
  });

  return vectorLayer;
};

export const createDeadwoodVectorLayer = (labelId?: number | null) =>
  createVectorLayer({
    rpcFunctionName: "get_deadwood_vector_tiles_perf1",
    className: "deadwood-vector",
    style: {
      fillColor: "rgba(255, 50, 50, 0.8)",
      strokeColor: "rgba(200, 50, 0, 1)",
      strokeWidth: 1.5,
    },
    labelId: labelId || undefined,
  });

export const createForestCoverVectorLayer = (labelId?: number) =>
  createVectorLayer({
    rpcFunctionName: "get_forest_cover_vector_tiles_perf",
    className: "forest-cover-vector",
    style: {
      fillColor: "rgba(34, 197, 94, 0.5)", // Green with high opacity
      strokeColor: "#16a34a", // Darker green for stroke
      strokeWidth: 1,
    },
    labelId,
  });

export const createAOIVectorLayer = (geometry: GeoJSON.MultiPolygon | GeoJSON.Polygon) => {
  const aoiSource = new VectorSource();
  const format = new GeoJSON();

  try {
    // Handle MultiPolygon by creating separate features for each polygon
    if (geometry.type === "MultiPolygon") {
      geometry.coordinates.forEach((polygonCoords) => {
        const polygonGeometry: GeoJSON.Polygon = {
          type: "Polygon",
          coordinates: polygonCoords,
        };

        const feature = format.readFeature(polygonGeometry, {
          dataProjection: "EPSG:4326",
          featureProjection: "EPSG:3857",
        });

        if (feature && !Array.isArray(feature) && feature.getGeometry()) {
          aoiSource.addFeature(feature);
        }
      });
    } else if (geometry.type === "Polygon") {
      // Handle single Polygon
      const feature = format.readFeature(geometry, {
        dataProjection: "EPSG:4326",
        featureProjection: "EPSG:3857",
      });

      if (feature && !Array.isArray(feature) && feature.getGeometry()) {
        aoiSource.addFeature(feature);
      }
    }
  } catch (error) {
    console.error("Error processing AOI geometry:", error);
  }

  return new VectorLayer({
    source: aoiSource,
    style: new Style({
      stroke: new Stroke({
        color: "#ff6b35", // Orange stroke to match audit workflow
        width: 2,
      }),
      fill: new Fill({
        color: "rgba(255, 107, 53, 0.15)", // Light orange fill
      }),
    }),
    className: "aoi-vector",
  });
};

export const createAOIMaskLayer = (geometry: GeoJSON.MultiPolygon | GeoJSON.Polygon) => {
  const maskSource = new VectorSource();
  const format = new GeoJSON();

  try {
    // Create a large polygon covering the entire world
    const worldExtent = [-20037508, -20037508, 20037508, 20037508]; // Web Mercator world bounds

    // Convert AOI geometry to Web Mercator coordinates for hole creation
    const holes: number[][][] = [];

    if (geometry.type === "MultiPolygon") {
      // For MultiPolygon, each polygon becomes a hole
      geometry.coordinates.forEach((polygonCoords) => {
        const polygonGeometry: GeoJSON.Polygon = {
          type: "Polygon",
          coordinates: polygonCoords,
        };

        const tempFeature = format.readFeature(polygonGeometry, {
          dataProjection: "EPSG:4326",
          featureProjection: "EPSG:3857",
        });

        if (tempFeature && !Array.isArray(tempFeature)) {
          const geom = tempFeature.getGeometry();
          if (geom && geom.getType() === "Polygon") {
            // @ts-expect-error - OpenLayers Polygon type
            const coords = geom.getCoordinates();
            if (coords && coords[0]) {
              holes.push(coords[0]);
            }
          }
        }
      });
    } else if (geometry.type === "Polygon") {
      // For single Polygon, it becomes the hole
      const tempFeature = format.readFeature(geometry, {
        dataProjection: "EPSG:4326",
        featureProjection: "EPSG:3857",
      });

      if (tempFeature && !Array.isArray(tempFeature)) {
        const geom = tempFeature.getGeometry();
        if (geom && geom.getType() === "Polygon") {
          // @ts-expect-error - OpenLayers Polygon type
          const coords = geom.getCoordinates();
          if (coords && coords[0]) {
            holes.push(coords[0]);
          }
        }
      }
    }

    // Create the mask polygon: world extent with AOI holes
    const maskCoordinates = [
      [
        [worldExtent[0], worldExtent[1]], // bottom-left
        [worldExtent[2], worldExtent[1]], // bottom-right
        [worldExtent[2], worldExtent[3]], // top-right
        [worldExtent[0], worldExtent[3]], // top-left
        [worldExtent[0], worldExtent[1]], // close
      ],
      ...holes, // Add all AOI areas as holes
    ];

    // Create the mask feature directly in Web Mercator
    const maskFeature = new Feature({
      geometry: new Polygon(maskCoordinates),
    });

    maskSource.addFeature(maskFeature);
  } catch (error) {
    console.error("Error creating AOI mask:", error);
  }

  return new VectorLayer({
    source: maskSource,
    style: new Style({
      fill: new Fill({
        color: "rgba(0, 0, 0, 0.5)", // Stronger black mask for better focus effect
      }),
      stroke: new Stroke({
        color: "transparent",
        width: 0,
      }),
    }),
    className: "aoi-mask",
  });
};
