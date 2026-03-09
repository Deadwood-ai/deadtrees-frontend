import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Modal, Input, message } from "antd";
import { ExperimentOutlined, FlagOutlined, InfoCircleOutlined } from "@ant-design/icons";
import "ol/ol.css";
import { Map, Overlay } from "ol";
import { defaults as defaultInteractions } from "ol/interaction";
import { Attribution } from "ol/control";
import { transformExtent, toLonLat } from "ol/proj";
import TileLayer from "ol/layer/Tile";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import { XYZ } from "ol/source";
import { GeoTIFF } from "ol/source";
import TileLayerWebGL from "ol/layer/WebGLTile.js";
import View from "ol/View";
import Feature from "ol/Feature";
import { Polygon, Point } from "ol/geom";
import { getCenter } from "ol/extent";
import { Draw } from "ol/interaction";
import { createBox } from "ol/interaction/Draw";
import { Style, Fill, Stroke, Circle as CircleStyle } from "ol/style";
import type { FeatureLike } from "ol/Feature";

import getPixelValueOfCoordinate from "../../utils/getPixelValueOfCoordinate";
import { getDeadwoodCOGUrl, getForestCOGUrl } from "../../utils/getDeadwoodCOGUrl";
import { getWaybackTileUrl } from "../../utils/waybackVersions";
import LayerControlPanel from "./LayerControlPanel";
import LocationControls from "./LocationControls";
import YearImagerySelector from "./YearImagerySelector";
import PolygonStatsModal from "./PolygonStatsModal";
import { useDatasetMap } from "../../hooks/useDatasetMapProvider";
import { useAuth } from "../../hooks/useAuthProvider";
import { useMapFlags, useCreateMapFlag } from "../../hooks/useMapFlags";
import { useWaybackItemsDebounced } from "../../hooks/useWaybackItems";
import { usePolygonAnalysis } from "../../hooks/usePolygonAnalysis";
import type { IMapFlag } from "../../types/mapFlags";
import { mapColors } from "../../theme/mapColors";
import { palette } from "../../theme/palette";

interface ClickedValues {
  forestPct: number;
  deadwoodPct: number;
}

// Helper to create GeoTIFF source for deadwood
const createDeadwoodSource = (year: string) => {
  return new GeoTIFF({
    sources: [{ url: getDeadwoodCOGUrl(year), bands: [1], min: 0, max: 255 }],
    normalize: true,
    interpolate: false,
  });
};

// Helper to create GeoTIFF source for forest
const createForestSource = (year: string) => {
  return new GeoTIFF({
    sources: [{ url: getForestCOGUrl(year), bands: [1], min: 0, max: 255 }],
    normalize: true,
    interpolate: false,
  });
};

// Source caches - persist across renders to reuse already-loaded sources
const deadwoodSourceCache: Record<string, GeoTIFF> = {};
const forestSourceCache: Record<string, GeoTIFF> = {};

// Get or create cached deadwood source
const getCachedDeadwoodSource = (year: string): GeoTIFF => {
  if (!deadwoodSourceCache[year]) {
    console.debug(`[Cache] Creating new deadwood source for ${year}`);
    deadwoodSourceCache[year] = createDeadwoodSource(year);
  } else {
    console.debug(`[Cache] Reusing cached deadwood source for ${year}`);
  }
  return deadwoodSourceCache[year];
};

// Get or create cached forest source
const getCachedForestSource = (year: string): GeoTIFF => {
  if (!forestSourceCache[year]) {
    console.debug(`[Cache] Creating new forest source for ${year}`);
    forestSourceCache[year] = createForestSource(year);
  } else {
    console.debug(`[Cache] Reusing cached forest source for ${year}`);
  }
  return forestSourceCache[year];
};

const DeadtreesMap = () => {
  const [map, setMap] = useState(null);
  const [selectedYear, setSelectedYear] = useState<string>("2025");
  const [bounds, setBounds] = useState([]);
  const [sliderValue, setSliderValue] = useState<number>(1);
  const mapContainer = useRef();
  const mapRef = useRef(null);
  const forestLayerRef = useRef<TileLayerWebGL | null>(null);
  const deadwoodLayerRef = useRef<TileLayerWebGL | null>(null);
  const hasAutoSelectedImageryRef = useRef(false); // Track if we've done initial auto-selection
  const { DeadwoodMapViewport, setDeadwoodMapViewport, DeadwoodMapStyle, setDeadwoodMapStyle } = useDatasetMap();

  // Flag feature state
  const [isDrawingFlag, setIsDrawingFlag] = useState(false);
  const [flagModalOpen, setFlagModalOpen] = useState(false);
  const [pendingFlagBbox, setPendingFlagBbox] = useState<[number, number, number, number] | null>(null);
  const [flagDescription, setFlagDescription] = useState("");
  const [showFlagsLayer, setShowFlagsLayer] = useState(true);
  const [currentZoom, setCurrentZoom] = useState<number>(DeadwoodMapViewport.zoom || 10);
  const flagsLayerRef = useRef<VectorLayer<VectorSource<Feature<Polygon>>> | null>(null);
  const drawInteractionRef = useRef<Draw | null>(null);
  const flagHoverOverlayRef = useRef<Overlay | null>(null);
  const clickedCellLayerRef = useRef<VectorLayer<VectorSource<Feature<Polygon>>> | null>(null);
  const clickedCellTooltipRef = useRef<Overlay | null>(null);

  // Layer visibility state - both layers visible by default
  const [showForest, setShowForest] = useState(true);
  const [showDeadwood, setShowDeadwood] = useState(true);
  const [deadwoodWarningModalOpen, setDeadwoodWarningModalOpen] = useState(false);

  // Polygon analysis (drawing + stats)
  const polygonAnalysis = usePolygonAnalysis(mapRef);

  // Wayback imagery state - using debounced location-based query
  // Default to a recent Wayback release (31144 = 2024) for immediate satellite display
  // This gets updated when location-specific wayback items load
  const DEFAULT_WAYBACK_RELEASE = 31144;
  const [selectedReleaseNum, setSelectedReleaseNum] = useState<number | null>(DEFAULT_WAYBACK_RELEASE);
  const [autoMatchImagery, setAutoMatchImagery] = useState(true); // Auto-match imagery to prediction year

  // Track map center in lon/lat for location-specific wayback queries
  const [mapCenterLonLat, setMapCenterLonLat] = useState<{ lon: number; lat: number } | null>(() => {
    // Convert initial center from EPSG:3857 to EPSG:4326
    if (DeadwoodMapViewport.center) {
      const [lon, lat] = toLonLat(DeadwoodMapViewport.center);
      return { lon, lat };
    }
    return null;
  });

  // Fetch wayback items with actual imagery changes at current location (fast, no metadata)
  // Uses debouncing: only re-fetches when user moves > 2km or zoom changes > 3 levels
  const { data: localWaybackItems = [], isLoading: isWaybackLoading } = useWaybackItemsDebounced(
    mapCenterLonLat?.lon,
    mapCenterLonLat?.lat,
    currentZoom,
    DeadwoodMapStyle === "wayback", // Only fetch when wayback basemap is active
  );

  // Clicked location values (displayed in legend)
  const [clickedValues, setClickedValues] = useState<ClickedValues | null>(null);

  // Auth and flags hooks
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: mapFlags = [] } = useMapFlags();
  const createFlagMutation = useCreateMapFlag();

  // Handler for anonymous users clicking flag button
  const handleLoginRequired = useCallback(() => {
    // Pass current path as returnTo so user comes back to map after sign-in
    navigate("/sign-in?returnTo=/deadtrees");
  }, [navigate]);

  // handler functions
  const handleClick = async (event: { coordinate: number[] }, year: string, skipIfDrawing: boolean) => {
    // Skip click handling when drawing flag bbox
    if (skipIfDrawing) return;
    if (mapRef.current) {
      // Fetch both deadwood and forest values (forest also gives us the cell bounds)
      const [deadwoodResult, forestResult] = await Promise.all([
        getPixelValueOfCoordinate({
          coordinates: event.coordinate,
          cogUrl: getDeadwoodCOGUrl(year),
        }),
        getPixelValueOfCoordinate({
          coordinates: event.coordinate,
          cogUrl: getForestCOGUrl(year),
        }),
      ]);

      // Use cell bounds from forest raster to create the polygon
      const [minX, minY, maxX, maxY] = forestResult.cellBounds;
      const cellPolygon = new Polygon([
        [
          [minX, minY],
          [maxX, minY],
          [maxX, maxY],
          [minX, maxY],
          [minX, minY],
        ],
      ]);

      // Update clicked cell layer
      if (clickedCellLayerRef.current) {
        const source = clickedCellLayerRef.current.getSource();
        if (source) {
          source.clear();
          const feature = new Feature({ geometry: cellPolygon });
          source.addFeature(feature);
        }
      }

      const dwVal = Number(deadwoodResult.value) || 0;
      const fVal = Number(forestResult.value) || 0;
      // Normalize from 0-255 to 0-100%
      const deadwoodPct = dwVal > 0 ? Math.round((dwVal / 255) * 100) : 0;
      const forestPct = fVal > 0 ? Math.round((fVal / 255) * 100) : 0;

      // Update tooltip over the clicked cell - show active layers
      if (clickedCellTooltipRef.current) {
        const tooltipElement = clickedCellTooltipRef.current.getElement();
        if (tooltipElement) {
          // Build tooltip content based on which layers are active
          const layerParts: string[] = [];
          if (showForest) {
            layerParts.push(`<span style="display: flex; align-items: center; gap: 4px;">
                <span style="width: 8px; height: 8px; border-radius: 2px; background: ${mapColors.forest.fill};"></span>
                <span style="color: ${palette.neutral[700]};">Tree</span>
                <span style="font-weight: 600;">${forestPct}%</span>
              </span>`);
          }
          if (showDeadwood) {
            layerParts.push(`<span style="display: flex; align-items: center; gap: 4px;">
                <span style="width: 8px; height: 8px; border-radius: 2px; background: ${mapColors.deadwood.fill};"></span>
                <span style="color: ${palette.neutral[700]};">Deadwood</span>
                <span style="font-weight: 600;">${deadwoodPct}%</span>
              </span>`);
          }

          tooltipElement.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px; color: ${palette.neutral[800]};">
              ${layerParts.join("")}
              <button id="close-cell-tooltip" style="background: none; border: none; cursor: pointer; color: ${palette.neutral[500]}; font-size: 16px; line-height: 1; padding: 0 0 0 4px;">&times;</button>
            </div>
          `;
          // Add close button handler
          const closeBtn = tooltipElement.querySelector("#close-cell-tooltip");
          if (closeBtn) {
            closeBtn.addEventListener("click", () => {
              clickedCellTooltipRef.current?.setPosition(undefined);
              // Also clear the clicked cell layer
              if (clickedCellLayerRef.current) {
                const source = clickedCellLayerRef.current.getSource();
                if (source) source.clear();
              }
              setClickedValues(null);
            });
          }
        }
        // Position tooltip at top center of the cell
        const centerX = (minX + maxX) / 2;
        clickedCellTooltipRef.current.setPosition([centerX, maxY]);
      }

      // Update state to display in legend panel
      setClickedValues({ forestPct, deadwoodPct });
    }
  };

  useEffect(() => {
    // console.log(DeadwoodMapViewport);
    if (!map) {
      const initialView = new View({
        // transform to EPSG:3857
        center: DeadwoodMapViewport.center,
        zoom: DeadwoodMapViewport.zoom,
      });
      // Initialize with Wayback satellite imagery directly (using default release)
      const basemapLayer = new TileLayer({
        preload: 0,
        source: new XYZ({
          url: getWaybackTileUrl(DEFAULT_WAYBACK_RELEASE),
          attributions: "Imagery © Esri World Imagery Wayback, Maxar, Earthstar Geographics",
          maxZoom: 19,
          crossOrigin: "anonymous",
        }),
      });
      // Create only 2 layers - one for forest, one for deadwood (for current year)
      // Forest layer: Light green → Dark green gradient based on cover intensity
      const forestLayer = new TileLayerWebGL({
        source: getCachedForestSource(selectedYear),
        className: "forest-layer",
        style: {
          color: [
            "interpolate",
            ["linear"],
            ["band", 1],
            0,
            [144, 238, 144, 0], // Transparent
            0.1,
            [144, 238, 144, 0.7], // Light green, semi-transparent
            0.25,
            [124, 205, 124, 0.85], // Pale green
            0.4,
            [86, 180, 86, 0.9], // Medium light green
            0.55,
            [60, 150, 60, 0.95], // Medium green
            0.7,
            [34, 120, 34, 1], // Forest green
            0.85,
            [20, 90, 20, 1], // Dark green
            1,
            [0, 70, 0, 1], // Very dark green
          ],
        },
      });

      // Deadwood layer: selective yellow spectrum with enhanced visibility for high values
      // Low values are more transparent, high values are more visible
      const deadwoodLayer = new TileLayerWebGL({
        source: getCachedDeadwoodSource(selectedYear),
        className: "deadwood-layer",
        visible: true, // Both layers visible by default
        style: {
          color: [
            "interpolate",
            ["linear"],
            ["band", 1],
            0,
            [255, 220, 150, 0], // Fully transparent
            0.1,
            [255, 220, 150, 0], // Still fully transparent (filter noise)
            0.2,
            [255, 200, 100, 0.1], // Very low opacity for low values
            0.3,
            [255, 190, 70, 0.15], // Low opacity
            0.4,
            [255, 179, 50, 0.25], // Still low opacity
            0.5,
            [255, 179, 28, 0.4], // Medium-low opacity - Selective Yellow
            0.6,
            [240, 160, 25, 0.6], // Medium opacity - starts becoming visible
            0.7,
            [220, 145, 22, 0.8], // High opacity - clearly visible
            0.8,
            [204, 130, 20, 0.95], // Very high opacity
            0.9,
            [180, 115, 18, 1], // Fully opaque
            1,
            [40, 10, 60, 1], // Maximum visibility - fully opaque
          ],
        },
      });

      // Store refs
      forestLayerRef.current = forestLayer;
      deadwoodLayerRef.current = deadwoodLayer;

      // Create clicked cell layer for showing selected pixel
      const clickedCellSource = new VectorSource<Feature<Polygon>>();
      const clickedCellLayer = new VectorLayer({
        source: clickedCellSource,
        style: new Style({
          fill: new Fill({ color: mapColors.aoi.fill }),
          stroke: new Stroke({ color: mapColors.aoi.stroke, width: 2 }),
        }),
        zIndex: 50,
      });
      clickedCellLayerRef.current = clickedCellLayer;

      const newMap = new Map({
        target: mapContainer.current,
        // Layer order: basemap -> forest -> deadwood -> clicked cell (on top)
        layers: [basemapLayer, forestLayer, deadwoodLayer, clickedCellLayer],
        view: initialView,
        overlays: [],
        interactions: defaultInteractions({ doubleClickZoom: false }),
        controls: [
          new Attribution({
            collapsible: true,
            collapsed: true,
          }),
        ],
      });

      // Create flag hover overlay
      const flagPopupElement = document.createElement("div");
      flagPopupElement.id = "flag-popup";
      flagPopupElement.className = "ol-popup";
      flagPopupElement.style.cssText =
        "background: white; padding: 8px 12px; border-radius: 6px; box-shadow: 0 2px 8px rgba(0,0,0,0.15); font-size: 12px; max-width: 250px; pointer-events: none;";

      const flagHoverOverlay = new Overlay({
        element: flagPopupElement,
        positioning: "bottom-center",
        offset: [0, -10],
      });
      newMap.addOverlay(flagHoverOverlay);
      flagHoverOverlayRef.current = flagHoverOverlay;

      // Create clicked cell tooltip overlay
      const cellTooltipElement = document.createElement("div");
      cellTooltipElement.id = "cell-tooltip";
      cellTooltipElement.style.cssText =
        "background: white; padding: 6px 10px; border-radius: 6px; box-shadow: 0 2px 6px rgba(0,0,0,0.15); font-size: 12px; white-space: nowrap; font-family: system-ui, sans-serif;";

      const cellTooltipOverlay = new Overlay({
        element: cellTooltipElement,
        positioning: "bottom-center",
        offset: [0, -8],
      });
      newMap.addOverlay(cellTooltipOverlay);
      clickedCellTooltipRef.current = cellTooltipOverlay;

      newMap.on("moveend", () => {
        const view = newMap.getView();
        const zoom = view.getZoom();
        const center = view.getCenter();
        setDeadwoodMapViewport({
          center: center,
          zoom: zoom,
        });
        setCurrentZoom(zoom || 10);

        // Update lon/lat center for wayback queries
        if (center) {
          const [lon, lat] = toLonLat(center);
          setMapCenterLonLat({ lon, lat });
        }
      });

      mapRef.current = newMap;
      // if (DeadwoodMapViewport.zoom != 2) {
      // newMap.getView().fit(transformExtent(bounds, "EPSG:4326", "EPSG:3857"));
      // }
      setMap(newMap);
    }

    return () => {
      if (map) {
        map.setTarget(null);
      }
    };
  }, []);

  // effects -----------------------------------------------------------

  // update on bounds change after geocoder search
  useEffect(() => {
    if (map && bounds.length > 0) {
      map.getView().fit(transformExtent(bounds, "EPSG:4326", "EPSG:3857"));
    }
  }, [bounds, map]);

  // update on mapStyle change
  useEffect(() => {
    if (map) {
      const layer = map.getLayers().getArray()[0];
      const nextIsWayback = DeadwoodMapStyle === "wayback";

      let source: XYZ;
      if (nextIsWayback && selectedReleaseNum) {
        source = new XYZ({
          url: getWaybackTileUrl(selectedReleaseNum),
          attributions: "Imagery © Esri World Imagery Wayback, Maxar, Earthstar Geographics",
          maxZoom: 19,
          crossOrigin: "anonymous",
        });
      } else {
        // Streets basemap (OpenStreetMap)
        source = new XYZ({
          url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
          attributions: "© OpenStreetMap contributors",
          maxZoom: 19,
          crossOrigin: "anonymous",
        });
      }

      layer.setSource(source);
    }
  }, [DeadwoodMapStyle, map, selectedReleaseNum]);

  //update opacity of geotiff layers
  useEffect(() => {
    if (forestLayerRef.current) {
      forestLayerRef.current.setOpacity(sliderValue);
    }
    if (deadwoodLayerRef.current) {
      deadwoodLayerRef.current.setOpacity(sliderValue);
    }
  }, [sliderValue]);

  // update onClick handler when selectedYear changes
  useEffect(() => {
    if (mapRef.current) {
      // Add a new click listener with the current selectedYear
      const clickHandler = (event) => handleClick(event, selectedYear, isDrawingFlag || polygonAnalysis.isDrawing);
      mapRef.current.on("click", clickHandler);

      // Clean up function to remove the listener
      return () => {
        if (mapRef.current) {
          mapRef.current.un("click", clickHandler);
        }
      };
    }
  }, [selectedYear, isDrawingFlag, polygonAnalysis.isDrawing]);

  // Update sources when year changes (use cached sources for instant switching)
  useEffect(() => {
    if (forestLayerRef.current && deadwoodLayerRef.current) {
      // Use cached sources - instant if already loaded
      forestLayerRef.current.setSource(getCachedForestSource(selectedYear));
      deadwoodLayerRef.current.setSource(getCachedDeadwoodSource(selectedYear));
      // Maintain visibility state after source update
      forestLayerRef.current.setVisible(showForest);
      deadwoodLayerRef.current.setVisible(showDeadwood);
    }
  }, [selectedYear, showForest, showDeadwood]);

  // Initialize Wayback style and auto-select best imagery when items first load
  useEffect(() => {
    if (localWaybackItems.length > 0 && !hasAutoSelectedImageryRef.current) {
      hasAutoSelectedImageryRef.current = true;
      // Set to Wayback as default style (already default, but ensure it's set)
      setDeadwoodMapStyle("wayback");
      // Select best version for current year (handled by YearImagerySelector)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localWaybackItems.length]); // Only depend on length to run once when data loads

  // Zoom threshold for switching between point and bbox display
  const ZOOM_THRESHOLD = 1;

  // Style function for flags - shows point at low zoom, bbox at high zoom
  const getFlagStyle = useCallback(
    (feature: FeatureLike) => {
      const showAsPoint = currentZoom < ZOOM_THRESHOLD;

      if (showAsPoint) {
        // Point style - need to return center point of the polygon geometry
        const geometry = feature.getGeometry();
        const extent = geometry?.getExtent();
        const centerPoint = extent ? new Point(getCenter(extent)) : undefined;

        return new Style({
          geometry: centerPoint, // Render at center point instead of polygon
          image: new CircleStyle({
            radius: 8,
            fill: new Fill({ color: mapColors.flag.fill }),
            stroke: new Stroke({ color: palette.neutral[0], width: 2 }),
          }),
        });
      } else {
        // Bbox style
        return new Style({
          fill: new Fill({ color: "rgba(22, 119, 255, 0.15)" }),
          stroke: new Stroke({ color: mapColors.flag.stroke, width: 2 }),
        });
      }
    },
    [currentZoom],
  );

  // Create and update flags layer
  useEffect(() => {
    if (!mapRef.current || !user) return;

    // Create flags layer if it doesn't exist
    if (!flagsLayerRef.current) {
      const flagsSource = new VectorSource<Feature<Polygon>>();
      const flagsLayer = new VectorLayer({
        source: flagsSource,
        style: getFlagStyle,
        zIndex: 100,
      });
      flagsLayerRef.current = flagsLayer;
      mapRef.current.addLayer(flagsLayer);

      // Add hover handler for flags
      mapRef.current.on("pointermove", (evt) => {
        if (!flagHoverOverlayRef.current || !flagsLayerRef.current) return;

        const pixel = evt.pixel;
        const feature = mapRef.current?.forEachFeatureAtPixel(pixel, (f, layer) => {
          if (layer === flagsLayerRef.current) return f;
          return undefined;
        });

        if (feature) {
          const flagId = feature.get("flagId");
          const description = feature.get("description");
          const popupElement = flagHoverOverlayRef.current.getElement();
          if (popupElement) {
            popupElement.innerHTML = `
              <div style="font-family: system-ui, sans-serif;">
                <div style="font-weight: 600; color: ${mapColors.flag.stroke}; margin-bottom: 4px;">Flag #${flagId}</div>
                <div style="color: ${palette.neutral[800]}; line-height: 1.4;">${description}</div>
              </div>
            `;
          }
          flagHoverOverlayRef.current.setPosition(evt.coordinate);
        } else {
          flagHoverOverlayRef.current.setPosition(undefined);
        }
      });
    } else {
      // Update style when zoom changes
      flagsLayerRef.current.setStyle(getFlagStyle);
    }

    // Update flags on the layer
    const source = flagsLayerRef.current.getSource();
    if (source) {
      source.clear();
      mapFlags.forEach((flag: IMapFlag) => {
        const [minLon, minLat, maxLon, maxLat] = flag.bbox;
        // Create polygon from bbox in EPSG:3857
        const extent = transformExtent([minLon, minLat, maxLon, maxLat], "EPSG:4326", "EPSG:3857");
        const polygon = new Polygon([
          [
            [extent[0], extent[1]],
            [extent[2], extent[1]],
            [extent[2], extent[3]],
            [extent[0], extent[3]],
            [extent[0], extent[1]],
          ],
        ]);
        const feature = new Feature({ geometry: polygon });
        feature.set("flagId", flag.id);
        feature.set("description", flag.description);
        // Store center for point rendering
        const centerX = (extent[0] + extent[2]) / 2;
        const centerY = (extent[1] + extent[3]) / 2;
        feature.set("center", [centerX, centerY]);
        source.addFeature(feature);
      });
    }
  }, [mapFlags, user, getFlagStyle]);

  // Toggle flags layer visibility
  useEffect(() => {
    if (flagsLayerRef.current) {
      flagsLayerRef.current.setVisible(showFlagsLayer);
    }
  }, [showFlagsLayer]);

  // Toggle forest layer visibility
  useEffect(() => {
    if (forestLayerRef.current) {
      forestLayerRef.current.setVisible(showForest);
    }
  }, [showForest]);

  // Toggle deadwood layer visibility
  useEffect(() => {
    if (deadwoodLayerRef.current) {
      deadwoodLayerRef.current.setVisible(showDeadwood);
    }
  }, [showDeadwood]);

  // Show preview warning modal on initial load (once per browser session)
  useEffect(() => {
    const hasSeenWarning = sessionStorage.getItem("deadtrees-preview-warning-shown");
    if (!hasSeenWarning) {
      setDeadwoodWarningModalOpen(true);
    }
  }, []);

  // Start drawing flag bbox
  const startFlagDrawing = useCallback(() => {
    if (!mapRef.current || isDrawingFlag) return;

    // Set crosshair cursor
    const mapElement = mapRef.current.getTargetElement();
    if (mapElement) {
      mapElement.style.cursor = "crosshair";
    }

    const source = new VectorSource<Feature<Polygon>>();
    const draw = new Draw({
      source,
      type: "Circle",
      geometryFunction: createBox(),
      style: new Style({
        fill: new Fill({ color: mapColors.aoi.fill }),
        stroke: new Stroke({ color: mapColors.flag.stroke, width: 2, lineDash: [5, 5] }),
      }),
    });

    draw.on("drawend", (event) => {
      const geometry = event.feature.getGeometry() as Polygon;
      const extent = geometry.getExtent();
      // Convert extent to EPSG:4326 for storage
      const [minLon, minLat, maxLon, maxLat] = transformExtent(extent, "EPSG:3857", "EPSG:4326");
      setPendingFlagBbox([minLon, minLat, maxLon, maxLat]);
      setFlagModalOpen(true);

      // Remove draw interaction and reset cursor
      if (mapRef.current && drawInteractionRef.current) {
        mapRef.current.removeInteraction(drawInteractionRef.current);
        drawInteractionRef.current = null;
        const mapEl = mapRef.current.getTargetElement();
        if (mapEl) {
          mapEl.style.cursor = "";
        }
      }
      setIsDrawingFlag(false);
    });

    mapRef.current.addInteraction(draw);
    drawInteractionRef.current = draw;
    setIsDrawingFlag(true);
    message.info("Click and drag to draw a rectangle on the map");
  }, [isDrawingFlag]);

  // Cancel flag drawing
  const cancelFlagDrawing = useCallback(() => {
    if (mapRef.current) {
      if (drawInteractionRef.current) {
        mapRef.current.removeInteraction(drawInteractionRef.current);
        drawInteractionRef.current = null;
      }
      // Reset cursor
      const mapElement = mapRef.current.getTargetElement();
      if (mapElement) {
        mapElement.style.cursor = "";
      }
    }
    setIsDrawingFlag(false);
  }, []);

  // Submit flag
  const handleFlagSubmit = useCallback(async () => {
    if (!pendingFlagBbox || !flagDescription.trim()) {
      message.warning("Please enter a description for the flag");
      return;
    }

    try {
      await createFlagMutation.mutateAsync({
        bbox: pendingFlagBbox,
        description: flagDescription.trim(),
        year: selectedYear,
      });
      message.success("Flag added successfully");
      setFlagModalOpen(false);
      setPendingFlagBbox(null);
      setFlagDescription("");
    } catch (error) {
      message.error("Failed to add flag");
      console.error(error);
    }
  }, [pendingFlagBbox, flagDescription, selectedYear, createFlagMutation]);

  // Cancel flag modal
  const handleFlagCancel = useCallback(() => {
    setFlagModalOpen(false);
    setPendingFlagBbox(null);
    setFlagDescription("");
  }, []);

  // Handle preview warning modal close
  const handleDeadwoodWarningClose = useCallback(() => {
    setDeadwoodWarningModalOpen(false);
    sessionStorage.setItem("deadtrees-preview-warning-shown", "true");
  }, []);

  // Handle map style change
  const handleMapStyleChange = useCallback(
    (style: string) => {
      setDeadwoodMapStyle(style);
    },
    [setDeadwoodMapStyle],
  );

  // Handle flag button click
  const handleFlagClick = useCallback(() => {
    if (isDrawingFlag) {
      cancelFlagDrawing();
    } else {
      startFlagDrawing();
    }
  }, [isDrawingFlag, cancelFlagDrawing, startFlagDrawing]);

  return (
    <div className="h-full w-full">
      <div
        style={{
          width: "100%",
          height: "100%",
        }}
        ref={mapContainer}
      >
        {/* Top Left - Location Controls */}
        <div className="absolute left-4 top-24 z-50">
          <LocationControls onPlaceSelect={setBounds} />
        </div>

        {/* Top Right - Layer Controls */}
        <div className="absolute right-4 top-24 z-50">
          <LayerControlPanel
            mapStyle={DeadwoodMapStyle}
            onMapStyleChange={handleMapStyleChange}
            showForest={showForest}
            setShowForest={setShowForest}
            showDeadwood={showDeadwood}
            setShowDeadwood={setShowDeadwood}
            opacity={sliderValue}
            setOpacity={setSliderValue}
            isDrawingPolygon={polygonAnalysis.isDrawing}
            onPolygonStatsClick={polygonAnalysis.toggle}
            showFlagsControls={true}
            isLoggedIn={!!user}
            isDrawingFlag={isDrawingFlag}
            onFlagClick={handleFlagClick}
            onLoginRequired={handleLoginRequired}
            showFlagsLayer={showFlagsLayer}
            setShowFlagsLayer={setShowFlagsLayer}
            flagsCount={mapFlags.length}
            clickedValues={clickedValues}
          />
        </div>

        {/* Top Center - Processing Stats */}
        {/* <div className="absolute left-1/2 top-24 z-50 -translate-x-1/2">
          <ProcessingStatsBanner />
        </div> */}

        {/* Bottom Center - Combined Year and Imagery Selector */}
        <div className="absolute bottom-2 left-1/2 z-50 -translate-x-1/2">
          <YearImagerySelector
            predictionYear={selectedYear}
            onPredictionYearChange={setSelectedYear}
            selectedReleaseNum={selectedReleaseNum}
            onImageryChange={setSelectedReleaseNum}
            waybackItems={localWaybackItems}
            isLoading={isWaybackLoading}
            isWaybackActive={DeadwoodMapStyle === "wayback"}
            autoMatchImagery={autoMatchImagery}
            onAutoMatchChange={setAutoMatchImagery}
            showForest={showForest}
            showDeadwood={showDeadwood}
          />
        </div>

      </div>

      {/* Flag description modal */}
      <Modal
        title="Flag this area"
        open={flagModalOpen}
        onOk={handleFlagSubmit}
        onCancel={handleFlagCancel}
        okText="Submit Flag"
        confirmLoading={createFlagMutation.isPending}
      >
        <div className="flex flex-col gap-4">
          <p className="text-gray-600">
            Describe what you noticed in this area (e.g., incorrect prediction, missing deadwood, etc.)
          </p>
          <Input.TextArea
            value={flagDescription}
            onChange={(e) => setFlagDescription(e.target.value)}
            placeholder="Enter your description..."
            rows={4}
            maxLength={500}
            showCount
          />
          <p className="text-xs text-gray-400">Year: {selectedYear}</p>
        </div>
      </Modal>

      {/* Deadwood warning modal */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <ExperimentOutlined className="text-orange-500" />
            <span>Preview Visualization Notice</span>
          </div>
        }
        open={deadwoodWarningModalOpen}
        onOk={handleDeadwoodWarningClose}
        onCancel={handleDeadwoodWarningClose}
        okText="I Understand"
        cancelButtonProps={{ style: { display: "none" } }}
        width={480}
      >
        <div className="mt-4 flex flex-col gap-4">
          {/* Alpha Warning */}
          <div className="flex gap-3 rounded-lg bg-orange-50 p-3">
            <InfoCircleOutlined className="mt-0.5 text-lg text-orange-500" />
            <div className="text-gray-700">
              <p className="mb-2 font-medium text-orange-700">Alpha Stage Product</p>
              <p className="text-sm">
                This is a preview visualization, not a final product. This map will evolve, improve, and expand in the
                coming months and years. In its current form, this preview map should not be used to draw conclusions.
              </p>
            </div>
          </div>

          {/* Call to Action */}
          <div className="flex gap-3 rounded-lg bg-blue-50 p-3">
            <FlagOutlined className="mt-0.5 text-lg text-blue-500" />
            <div className="text-gray-700">
              <p className="mb-2 font-medium text-blue-700">Help Us Improve</p>
              <p className="text-sm">
                Consider checking your local forest or study area and reporting feedback after logging in with the{" "}
                <span className="font-semibold text-blue-600">'Flag Area'</span> feature.
              </p>
            </div>
          </div>
        </div>
      </Modal>

      {/* Polygon stats modal */}
      <PolygonStatsModal
        open={polygonAnalysis.modalOpen}
        onClose={polygonAnalysis.closeModal}
        data={polygonAnalysis.stats.data}
        loading={polygonAnalysis.stats.loading}
        error={polygonAnalysis.stats.error}
      />
    </div>
  );
};

export default DeadtreesMap;

// view: geotiffSource.getView(),
// view: new View({
//   center: fromLonLat([10.668224826784524, 51.78688853393797]),
//   zoom: 15,
// }),

//   source: new TileJSON({
//     url: `https://api.maptiler.com/maps/satellite/tiles.json?key=${import.meta.env.VITE_MAPTILER_KEY}`,
//     crossOrigin: "anonymous",
//     tileSize: 512,
//   }),
