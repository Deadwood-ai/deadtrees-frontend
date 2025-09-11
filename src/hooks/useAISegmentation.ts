import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Map from "ol/Map.js";
import Draw, { createBox } from "ol/interaction/Draw.js";
import VectorSource from "ol/source/Vector.js";
import VectorLayer from "ol/layer/Vector.js";
import { Style, Fill, Stroke } from "ol/style";
import Feature from "ol/Feature.js";
import Polygon from "ol/geom/Polygon.js";
import Geometry from "ol/geom/Geometry.js";
import TileLayerWebGL from "ol/layer/WebGLTile.js";
import { GeoTIFF } from "ol/source";
import View from "ol/View";
import { Settings } from "../config";
import ImageLayer from "ol/layer/Image.js";
import ImageStatic from "ol/source/ImageStatic.js";
import BaseLayer from "ol/layer/Base.js";

type GetOrthoLayerFn = () => TileLayerWebGL | undefined;

interface UseAISegmentationParams {
  mapRef: React.MutableRefObject<Map | null>;
  getOrthoLayer: GetOrthoLayerFn;
}

interface UseAISegmentationReturn {
  isActive: boolean;
  isProcessing: boolean;
  error: string | null;
  features: Feature<Geometry>[];
  enable: () => void;
  disable: () => void;
  clear: () => void;
  canUse: boolean;
}

/**
 * AI Segmentation hook (MVP):
 * - Adds a draw-box interaction
 * - Captures ortho-only image from an offscreen OL map (~1200 max dim)
 * - Sends JPEG and bbox (pixels) to SAM endpoint
 * - Converts returned pixel polygons to map coordinates and adds a temp vector layer
 */
export const useAISegmentation = ({ mapRef, getOrthoLayer }: UseAISegmentationParams): UseAISegmentationReturn => {
  const [isActive, setIsActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [features, setFeatures] = useState<Feature[]>([]);

  // Store draw interaction and result layer/source
  const drawInteractionRef = useRef<Draw | null>(null);
  const resultSourceRef = useRef<VectorSource | null>(null);
  const resultLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const debugLayerRef = useRef<BaseLayer | null>(null);
  const debugUrlRef = useRef<string | null>(null);

  const canUse = useMemo(() => !!getOrthoLayer(), [getOrthoLayer]);

  // Ensure result layer exists on the main map
  const ensureResultLayer = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    if (resultLayerRef.current && resultSourceRef.current) return;

    const source = new VectorSource();
    const layer = new VectorLayer<VectorSource>({
      source,
      style: new Style({
        fill: new Fill({ color: "rgba(0, 200, 255, 0.25)" }),
        stroke: new Stroke({ color: "#00c8ff", width: 2 }),
      }),
      className: "ai-segmentation-layer",
    });

    // Append above analysis layers
    map.addLayer(layer);
    resultSourceRef.current = source;
    resultLayerRef.current = layer;
  }, [mapRef]);

  const removeResultLayer = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    if (resultLayerRef.current) {
      map.removeLayer(resultLayerRef.current);
      // dispose and clear
      const src = resultLayerRef.current.getSource();
      if (src) {
        src.clear();
        const maybeDisposable = src as unknown as { dispose?: () => void };
        if (typeof maybeDisposable.dispose === "function") {
          maybeDisposable.dispose();
        }
      }
      const maybeLayerDisposable = resultLayerRef.current as unknown as { dispose?: () => void };
      if (typeof maybeLayerDisposable.dispose === "function") {
        maybeLayerDisposable.dispose();
      }
      resultLayerRef.current = null;
      resultSourceRef.current = null;
    }
  }, [mapRef]);

  const clear = useCallback(() => {
    setError(null);
    setFeatures([]);
    if (resultSourceRef.current) {
      resultSourceRef.current.clear();
    }
    // Remove debug overlay if present
    if (mapRef.current && debugLayerRef.current) {
      mapRef.current.removeLayer(debugLayerRef.current);
      debugLayerRef.current = null;
    }
    if (debugUrlRef.current) {
      URL.revokeObjectURL(debugUrlRef.current);
      debugUrlRef.current = null;
    }
  }, [mapRef]);

  const disable = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    setIsActive(false);
    if (drawInteractionRef.current) {
      map.removeInteraction(drawInteractionRef.current);
      drawInteractionRef.current = null;
    }
  }, [mapRef]);

  const enable = useCallback(() => {
    const map = mapRef.current;
    if (!map || !canUse) return;
    setError(null);
    setIsActive(true);
    ensureResultLayer();

    // Create an invisible target vector layer to host the draw interaction geometry (not added to map)
    const draw = new Draw({
      source: new VectorSource(),
      type: "Circle",
      geometryFunction: createBox(),
      stopClick: true,
    });

    draw.on("drawend", async (evt) => {
      try {
        setIsProcessing(true);
        setError(null);

        // Get extent in map coordinates from the drawn polygon
        const geometry = evt.feature.getGeometry();
        if (!(geometry instanceof Polygon)) {
          setIsProcessing(false);
          return;
        }
        const extent = geometry.getExtent();

        // Build offscreen map with only the ortho layer
        const offscreen = await buildOffscreenOrthoMap(map, getOrthoLayer());
        if (!offscreen) {
          throw new Error("Failed to initialize offscreen map for capture.");
        }

        const { offscreenMap, container, targetSize } = offscreen;

        // Compute bbox pixels in the offscreen map's pixel space
        const [minX, minY, maxX, maxY] = extent;
        const topLeft = offscreenMap.getPixelFromCoordinate([minX, maxY]);
        const bottomRight = offscreenMap.getPixelFromCoordinate([maxX, minY]);
        if (!topLeft || !bottomRight) {
          cleanupOffscreen(offscreenMap, container);
          throw new Error("Failed to compute bbox pixels.");
        }
        const x1 = Math.round(topLeft[0]);
        const y1 = Math.round(topLeft[1]);
        const x2 = Math.round(bottomRight[0]);
        const y2 = Math.round(bottomRight[1]);

        // Render and capture JPEG
        const imageBlob = await exportMapToJPEG(offscreenMap, targetSize[0], targetSize[1]);
        const imageFile = new File([imageBlob], "view.jpg", { type: "image/jpeg" });

        // DEBUG: overlay captured image on the main map to verify alignment
        try {
          const url = URL.createObjectURL(imageBlob);
          debugUrlRef.current = url;
          const captureExtent = offscreenMap.getView().calculateExtent(offscreenMap.getSize());
          const debugLayer = new ImageLayer({
            source: new ImageStatic({
              url,
              imageExtent: captureExtent,
              projection: "EPSG:3857",
            }),
            opacity: 0.4,
            className: "ai-segmentation-debug-capture",
          });
          // Remove previous debug layer, if any
          if (mapRef.current && debugLayerRef.current) {
            mapRef.current.removeLayer(debugLayerRef.current);
          }
          if (mapRef.current) {
            mapRef.current.addLayer(debugLayer);
            debugLayerRef.current = debugLayer;
          }
        } catch (_) {
          // ignore debug overlay errors
        }

        // Build and send request
        const form = new FormData();
        form.append("image", imageFile);
        form.append("bboxes", JSON.stringify([x1, y1, x2, y2]));
        form.append("labels", JSON.stringify([1]));

        const response = await fetch(`${Settings.SAM_API_URL}/segment`, {
          method: "POST",
          mode: "cors",
          headers: {
            Accept: "application/json",
          },
          body: form,
        });

        if (!response.ok) {
          throw new Error(`Segmentation failed (${response.status})`);
        }

        const geojson = await response.json();
        // Convert using the SAME pixel space map as used for image capture
        const created = convertPixelGeoJSONToMapFeatures(geojson, offscreenMap);
        ensureResultLayer();
        if (resultSourceRef.current) {
          resultSourceRef.current.addFeatures(created);
        }
        setFeatures((prev) => [...prev, ...created]);
        // Now we can clean up the offscreen resources
        cleanupOffscreen(offscreenMap, container);
      } catch (e) {
        const message = e instanceof Error ? e.message : "Unknown error";
        setError(message);
      } finally {
        setIsProcessing(false);
      }
    });

    map.addInteraction(draw);
    drawInteractionRef.current = draw;
  }, [canUse, ensureResultLayer, getOrthoLayer, mapRef]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      disable();
      removeResultLayer();
    };
  }, [disable, removeResultLayer]);

  return {
    isActive,
    isProcessing,
    error,
    features,
    enable,
    disable,
    clear,
    canUse,
  };
};

// Build an offscreen map that shares the same View as the main map and contains only the ortho layer
async function buildOffscreenOrthoMap(
  mainMap: Map,
  orthoLayer?: TileLayerWebGL,
): Promise<{ offscreenMap: Map; container: HTMLDivElement; targetSize: [number, number] } | null> {
  if (!orthoLayer) return null;
  const mainSize = mainMap.getSize();
  if (!mainSize) return null;

  const maxDim = 1200;
  const [w, h] = mainSize;
  const scale = Math.min(maxDim / w, maxDim / h, 1);
  const targetWidth = Math.max(1, Math.round(w * scale));
  const targetHeight = Math.max(1, Math.round(h * scale));

  const container = document.createElement("div");
  container.style.position = "absolute";
  container.style.left = "-10000px";
  container.style.top = "0";
  container.style.width = `${targetWidth}px`;
  container.style.height = `${targetHeight}px`;
  document.body.appendChild(container);

  // Reuse the same source for consistency (safe for read-only capture)
  const source = orthoLayer.getSource();
  const offscreenOrtho = new TileLayerWebGL({
    source: source ?? new GeoTIFF({ sources: [] }),
  });

  // Clone view state to avoid affecting the main map while matching center/zoom/rotation
  const mainView = mainMap.getView();
  const offscreenView = new View({
    center: mainView.getCenter() ?? [0, 0],
    zoom: mainView.getZoom() ?? 2,
    rotation: mainView.getRotation() ?? 0,
    projection: mainView.getProjection(),
    constrainOnlyCenter: true,
  });
  const offscreenMap = new Map({
    target: container,
    layers: [offscreenOrtho],
    view: offscreenView,
    controls: [],
    overlays: [],
  });

  // Wait a frame for layout
  await new Promise((resolve) => setTimeout(resolve, 0));
  offscreenMap.setSize([targetWidth, targetHeight]);

  return { offscreenMap, container, targetSize: [targetWidth, targetHeight] };
}

function cleanupOffscreen(offscreenMap: Map, container: HTMLDivElement) {
  try {
    offscreenMap.setTarget(undefined as unknown as HTMLElement);
    const maybeDisposable = offscreenMap as unknown as { dispose?: () => void };
    if (typeof maybeDisposable.dispose === "function") {
      maybeDisposable.dispose();
    }
  } finally {
    if (container && container.parentElement) {
      container.parentElement.removeChild(container);
    }
  }
}

async function exportMapToJPEG(map: Map, width: number, height: number): Promise<Blob> {
  const blob: Blob = await new Promise((resolve, reject) => {
    const mapCanvas = document.createElement("canvas");
    mapCanvas.width = width;
    mapCanvas.height = height;
    const mapContext = mapCanvas.getContext("2d");
    if (!mapContext) {
      reject(new Error("Failed to create canvas context"));
      return;
    }

    const finalize = () => {
      try {
        mapCanvas.toBlob(
          (b) => {
            if (!b) {
              reject(new Error("Failed to encode JPEG"));
            } else {
              resolve(b);
            }
          },
          "image/jpeg",
          0.92,
        );
      } catch (e) {
        reject(e);
      }
    };

    const drawLayers = () => {
      const target = map.getTargetElement();
      if (!target) {
        finalize();
        return;
      }
      const canvases = target.querySelectorAll("canvas");
      canvases.forEach((canvas: HTMLCanvasElement) => {
        if (canvas.width > 0 && canvas.height > 0) {
          mapContext.drawImage(canvas, 0, 0);
        }
      });
      finalize();
    };

    map.once("rendercomplete", drawLayers);
    map.renderSync();
  });

  return blob;
}

type PixelPolygon = { type: "Polygon"; coordinates: number[][][] };
type PixelFeature = { type: "Feature"; geometry: PixelPolygon; properties?: Record<string, unknown> };
type PixelFeatureCollection = { type: "FeatureCollection"; features: PixelFeature[] };

function convertPixelGeoJSONToMapFeatures(geojson: unknown, map: Map): Feature[] {
  const created: Feature[] = [];
  const collection = geojson as Partial<PixelFeatureCollection>;
  if (!collection || collection.type !== "FeatureCollection" || !Array.isArray(collection.features)) {
    return created;
  }
  for (const feature of collection.features) {
    const geometry = feature.geometry;
    if (!geometry || geometry.type !== "Polygon" || !Array.isArray(geometry.coordinates)) continue;
    const rings = geometry.coordinates;
    const transformedRings: number[][][] = [];
    for (const ring of rings) {
      const transformedRing: number[][] = [];
      for (const coord of ring) {
        const [x, y] = coord as [number, number];
        const mapCoord = map.getCoordinateFromPixel([x, y]);
        if (mapCoord) transformedRing.push(mapCoord);
      }
      if (transformedRing.length > 2) transformedRings.push(transformedRing);
    }
    if (transformedRings.length > 0) {
      const poly = new Polygon(transformedRings);
      const f = new Feature(poly);
      created.push(f);
    }
  }
  return created;
}

export default useAISegmentation;
