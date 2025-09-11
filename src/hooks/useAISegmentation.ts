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

type GetOrthoLayerFn = () => TileLayerWebGL | undefined;

interface UseAISegmentationParams {
  mapRef: React.MutableRefObject<Map | null>;
  getOrthoLayer: GetOrthoLayerFn;
  mode?: "segment" | "crop-only";
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
export const useAISegmentation = ({
  mapRef,
  getOrthoLayer,
  mode = "segment",
}: UseAISegmentationParams): UseAISegmentationReturn => {
  const [isActive, setIsActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [features, setFeatures] = useState<Feature[]>([]);

  // Store draw interaction and result layer/source
  const drawInteractionRef = useRef<Draw | null>(null);
  const resultSourceRef = useRef<VectorSource | null>(null);
  const resultLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const disabledInteractionsRef = useRef<boolean>(false);
  type HideableLayer = { setVisible: (v: boolean) => void; getVisible: () => boolean };
  const hiddenLayersRef = useRef<Array<{ layer: HideableLayer; prevVisible: boolean }>>([]);

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
  }, []);

  const disable = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    setIsActive(false);
    if (drawInteractionRef.current) {
      map.removeInteraction(drawInteractionRef.current);
      drawInteractionRef.current = null;
    }
    // Re-enable interactions if we disabled them
    if (disabledInteractionsRef.current) {
      map.getInteractions().forEach((i) => i.setActive(true));
      disabledInteractionsRef.current = false;
    }
    // Restore hidden layers
    if (hiddenLayersRef.current.length > 0) {
      hiddenLayersRef.current.forEach(({ layer, prevVisible }) => {
        layer.setVisible(prevVisible);
      });
      hiddenLayersRef.current = [];
      map.renderSync();
    }
    // Remove overlay canvas if present
    if (overlayCanvasRef.current) {
      const parent = overlayCanvasRef.current.parentElement;
      if (parent) parent.removeChild(overlayCanvasRef.current);
      overlayCanvasRef.current = null;
    }
  }, [mapRef]);

  const enable = useCallback(() => {
    const map = mapRef.current;
    if (!map || !canUse) return;
    setError(null);
    setIsActive(true);
    ensureResultLayer();

    // Disable map interactions while active (simplifies pixel math per requirements)
    map.getInteractions().forEach((i) => i.setActive(false));
    disabledInteractionsRef.current = true;

    // Hide all non-ortho layers to avoid CORS taint. Keep our result layer visible.
    const ortho = getOrthoLayer();
    hiddenLayersRef.current = [];
    const layers = map.getLayers().getArray();
    layers.forEach((layer: unknown) => {
      const l = layer as HideableLayer;
      if (layer !== ortho && layer !== resultLayerRef.current && typeof l.setVisible === "function") {
        hiddenLayersRef.current.push({ layer: l, prevVisible: l.getVisible() });
        l.setVisible(false);
      }
    });
    map.renderSync();

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
        const [minX, minY, maxX, maxY] = extent;

        if (mode === "crop-only") {
          // Compute bbox pixels in the CURRENT MAP pixel space (CSS pixels)
          const topLeft = map.getPixelFromCoordinate([minX, maxY]);
          const bottomRight = map.getPixelFromCoordinate([maxX, minY]);
          if (!topLeft || !bottomRight) {
            throw new Error("Failed to compute bbox pixels.");
          }
          const x1 = Math.round(topLeft[0]);
          const y1 = Math.round(topLeft[1]);
          const x2 = Math.round(bottomRight[0]);
          const y2 = Math.round(bottomRight[1]);
          const width = Math.max(1, x2 - x1);
          const height = Math.max(1, y2 - y1);

          // Compose visible map into a single canvas and crop the bbox
          const composite = composeCurrentMapCanvas(map);
          if (!composite) {
            throw new Error("Failed to access map canvas for cropping.");
          }
          const cropped = document.createElement("canvas");
          cropped.width = width;
          cropped.height = height;
          const ctx = cropped.getContext("2d");
          if (!ctx) throw new Error("Failed to get 2D context for crop");
          // Ensure we read pixels after the map has fully rendered with hidden layers
          await new Promise((r) => requestAnimationFrame(() => r(null)));
          ctx.drawImage(composite, x1, y1, width, height, 0, 0, width, height);

          // Place cropped canvas as absolute overlay at exact pixel position
          const parent = map.getTargetElement();
          if (!parent) throw new Error("Map target element not found");
          // Remove previous overlay if any
          if (overlayCanvasRef.current && overlayCanvasRef.current.parentElement) {
            overlayCanvasRef.current.parentElement.removeChild(overlayCanvasRef.current);
          }
          cropped.style.position = "absolute";
          cropped.style.left = `${x1}px`;
          cropped.style.top = `${y1}px`;
          cropped.style.width = `${width}px`;
          cropped.style.height = `${height}px`;
          cropped.style.pointerEvents = "none";
          cropped.style.zIndex = "1000";
          parent.appendChild(cropped);
          // Debug outline to verify placement
          // cropped.style.outline = "1px dashed #0ff";
          overlayCanvasRef.current = cropped;

          // Also render bbox polygon feature with cyan stroke
          const rectCoords = [
            [minX, minY],
            [maxX, minY],
            [maxX, maxY],
            [minX, maxY],
            [minX, minY],
          ];
          const rect = new Polygon([rectCoords]);
          const f = new Feature(rect);
          ensureResultLayer();
          resultSourceRef.current?.addFeature(f);
          setFeatures((prev) => [...prev, f]);

          // Now: send the SAME composite image and bbox to the API and render returned polygons
          const imageBlob: Blob = await canvasToBlob(composite, "image/jpeg", 0.92);
          const file = new File([imageBlob], "view.jpg", { type: "image/jpeg" });
          const form = new FormData();
          form.append("image", file);
          form.append("bboxes", JSON.stringify([x1, y1, x2, y2]));
          form.append("labels", JSON.stringify([1]));

          const response = await fetch(`${Settings.SAM_API_URL}/segment`, {
            method: "POST",
            mode: "cors",
            headers: { Accept: "application/json" },
            body: form,
          });
          if (!response.ok) {
            throw new Error(`Segmentation failed (${response.status})`);
          }
          const raw = await response.json();
          const fc = normalizeToFeatureCollection(raw);
          if (fc && overlayCanvasRef.current) {
            drawPixelGeoJSONOnCanvas(fc, overlayCanvasRef.current, x1, y1);
          }
          const created = fc ? convertPixelGeoJSONToMapFeatures(fc, map) : [];
          ensureResultLayer();
          if (resultSourceRef.current && created.length) {
            resultSourceRef.current.addFeatures(created);
          }
          if (created.length) setFeatures((prev) => [...prev, ...created]);
        } else {
          // SEGMENT MODE (existing pipeline)
          // Build offscreen map with only the ortho layer
          const offscreen = await buildOffscreenOrthoMap(map, getOrthoLayer());
          if (!offscreen) {
            throw new Error("Failed to initialize offscreen map for capture.");
          }
          const { offscreenMap, container, targetSize } = offscreen;

          // Compute bbox in offscreen pixel space
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

          const raw = await response.json();
          const fc = normalizeToFeatureCollection(raw);
          // Convert using the SAME pixel space map as used for image capture
          const created = fc ? convertPixelGeoJSONToMapFeatures(fc, offscreenMap) : [];
          ensureResultLayer();
          if (resultSourceRef.current) {
            resultSourceRef.current.addFeatures(created);
          }
          setFeatures((prev) => [...prev, ...created]);
          // Now we can clean up the offscreen resources
          cleanupOffscreen(offscreenMap, container);
        }
      } catch (e) {
        const message = e instanceof Error ? e.message : "Unknown error";
        setError(message);
      } finally {
        setIsProcessing(false);
      }
    });

    map.addInteraction(draw);
    drawInteractionRef.current = draw;
  }, [canUse, ensureResultLayer, getOrthoLayer, mapRef, mode]);

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

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Failed to encode canvas"));
          } else {
            resolve(blob);
          }
        },
        type,
        quality,
      );
    } catch (e) {
      reject(e);
    }
  });
}

function composeCurrentMapCanvas(map: Map): HTMLCanvasElement | null {
  const target = map.getTargetElement();
  if (!target) return null;
  // Draw only the bottom-most map canvas (expected to be the ortho raster)
  const canvasesAll = Array.from(target.querySelectorAll("canvas"));
  const canvases = canvasesAll.length ? [canvasesAll[0]] : [];
  if (!canvases.length) return null;

  const rect = target.getBoundingClientRect();
  const composite = document.createElement("canvas");
  composite.width = Math.max(1, Math.round(rect.width));
  composite.height = Math.max(1, Math.round(rect.height));
  const ctx = composite.getContext("2d");
  if (!ctx) return null;

  canvases.forEach((canvas: HTMLCanvasElement) => {
    if (canvas.width > 0 && canvas.height > 0) {
      ctx.drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, composite.width, composite.height);
    }
  });

  return composite;
}

// (intentionally left out) previously attempted layer-specific canvas detection

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
        // Backend returns (x, -y). Convert back to screen pixel space (top-left origin, y down)
        const tx = x;
        const ty = -y;
        const mapCoord = map.getCoordinateFromPixel([tx, ty]);
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

function drawPixelGeoJSONOnCanvas(
  geojson: PixelFeatureCollection,
  canvas: HTMLCanvasElement,
  offsetX: number,
  offsetY: number,
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Decide sign: if most y values are negative, invert; else keep as-is
  const sign = getYSign(geojson);

  ctx.save();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "#00c8ff";
  ctx.lineWidth = 2;
  ctx.fillStyle = "rgba(0,200,255,0.15)";

  for (const feature of geojson.features) {
    const geometry = feature.geometry;
    if (!geometry || geometry.type !== "Polygon" || !Array.isArray(geometry.coordinates)) continue;
    for (const ring of geometry.coordinates as number[][][]) {
      ctx.beginPath();
      let first = true;
      for (const coord of ring) {
        const [x, y] = coord as [number, number];
        const sx = x - offsetX;
        const sy = sign * y - offsetY; // sign = 1 for y-down, -1 if API sent negative y
        if (first) {
          ctx.moveTo(sx, sy);
          first = false;
        } else {
          ctx.lineTo(sx, sy);
        }
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }
  ctx.restore();
}

function getYSign(fc: PixelFeatureCollection): 1 | -1 {
  let neg = 0;
  let pos = 0;
  outer: for (const f of fc.features) {
    const g = f.geometry;
    if (!g || g.type !== "Polygon") continue;
    for (const ring of g.coordinates as number[][][]) {
      for (const c of ring) {
        const y = c[1] as number;
        if (y < 0) neg++;
        else if (y > 0) pos++;
        if (neg + pos > 200) break outer; // sample first ~200 points
      }
    }
  }
  return neg > pos ? -1 : 1;
}

function normalizeToFeatureCollection(raw: unknown): PixelFeatureCollection | null {
  // Some responses wrap the segmentation under a 'segmentation' key
  const maybe = raw as Record<string, unknown> | null | undefined;
  const direct = maybe as Partial<PixelFeatureCollection> | null | undefined;
  const nested = maybe && typeof maybe === "object" ? (maybe["segmentation"] as Partial<PixelFeatureCollection>) : null;
  const fc = direct && direct.type === "FeatureCollection" ? direct : nested;
  if (fc && fc.type === "FeatureCollection" && Array.isArray(fc.features)) return fc as PixelFeatureCollection;
  return null;
}
