import { useEffect, useRef, useState, useMemo, forwardRef, useImperativeHandle } from "react";
import { XYZ } from "ol/source";
import TileLayer from "ol/layer/Tile";
import { View, Map, Overlay } from "ol";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import TileLayerWebGL from "ol/layer/WebGLTile.js";
import { GeoTIFF } from "ol/source";
import VectorTileLayer from "ol/layer/VectorTile";
import { Style, Fill, Stroke, Circle as CircleStyle } from "ol/style";
import { FeatureLike } from "ol/Feature";
import Feature from "ol/Feature";
import type { Geometry } from "ol/geom";
import { Card, Button, Tag, Typography, Space, message } from "antd";
import { EditOutlined, CloseOutlined, CheckOutlined, UndoOutlined } from "@ant-design/icons";
import { Draw, Modify, Select } from "ol/interaction";
import { Polygon, MultiPolygon } from "ol/geom";
import GeoJSON from "ol/format/GeoJSON";
import { click } from "ol/events/condition";
import { fromLonLat } from "ol/proj";

const { Text } = Typography;

import { IDataset } from "../../types/dataset";
import { Settings } from "../../config";
import { getWaybackTileUrl } from "../../utils/waybackVersions";

// State exposed to parent for AOI toolbar rendering
export interface AOIToolbarState {
  isDrawing: boolean;
  isEditing: boolean;
  hasAOI: boolean;
  isAOILoading: boolean;
  selectedFeatureForEdit: boolean;
  polygonCount: number;
}

// Handle exposed to parent for AOI toolbar actions
export interface DatasetDetailsMapHandle {
  startDrawing: () => void;
  startEditing: () => void;
  cancelDrawing: () => void;
  cancelEditing: () => void;
  saveEditing: () => void;
  addAnotherPolygon: () => void;
  deleteAOI: () => void;
  deleteSelectedPolygon: () => void;
  refreshVectorLayers: () => void;
  zoomToExtent: (minLon: number, minLat: number, maxLon: number, maxLat: number, padding?: number) => void;
  flashLocation: (lon: number, lat: number) => void;
}

// Latest Wayback release (2024) for satellite imagery
const DEFAULT_WAYBACK_RELEASE = 31144;
import { createDeadwoodVectorLayer } from "./createVectorLayer";
import { useDatasetLabelTypes } from "../../hooks/useDatasetLabelTypes";
import { createForestCoverVectorLayer, createAOIVectorLayer, createAOIMaskLayer } from "./createVectorLayer";
import { useDatasetDetailsMap } from "../../hooks/useDatasetDetailsMapProvider";
import { useDatasetAOI } from "../../hooks/useDatasetAudit";

interface DatasetDetailsMapProps {
  data: IDataset;
  onMapReady?: (map: Map) => void;
  onOrthoLayerReady?: (layer: TileLayerWebGL) => void;
  onVectorLayersReady?: (deadwood: VectorTileLayer | null, forestCover: VectorTileLayer | null) => void;
  hideDeadwoodLayer?: boolean;
  hideForestCoverLayer?: boolean;
  hideDroneImagery?: boolean;
  refreshKey?: number; // Increment to trigger layer refresh
  // Layer visibility props (opacity and mapStyle come from context)
  showDeadwood?: boolean;
  showForestCover?: boolean;
  showDroneImagery?: boolean;
  showAOI?: boolean;
  layerOpacity?: number; // Unified opacity for analysis layers (deadwood + forest cover)
  // Edit callbacks for polygon click interaction
  onEditDeadwood?: () => void;
  onEditForestCover?: () => void;
  isLoggedIn?: boolean;

  // AOI Editing (for audit - privilege-gated)
  enableAOIEditing?: boolean;
  onAOIChange?: (geometry: GeoJSON.MultiPolygon | GeoJSON.Polygon | null) => void;
  onToolbarStateChange?: (state: AOIToolbarState) => void;

  // Correction Review (for auditors - privilege-gated)
  canReviewCorrections?: boolean;
  onApproveCorrection?: (correctionId: number, geometryId: number) => void;
  onRevertCorrection?: (correctionId: number, geometryId: number) => void;
}

const DatasetDetailsMap = forwardRef<DatasetDetailsMapHandle, DatasetDetailsMapProps>(({
  data,
  onMapReady,
  onOrthoLayerReady,
  onVectorLayersReady,
  hideDeadwoodLayer = false,
  hideForestCoverLayer = false,
  hideDroneImagery = false,
  refreshKey = 0,
  // Layer visibility props
  showDeadwood,
  showForestCover,
  showDroneImagery,
  showAOI = true,
  layerOpacity,
  // Edit callbacks
  onEditDeadwood,
  onEditForestCover,
  isLoggedIn = false,
  // AOI Editing
  enableAOIEditing = false,
  onAOIChange,
  onToolbarStateChange,
  // Correction Review
  canReviewCorrections = false,
  onApproveCorrection,
  onRevertCorrection,
}, ref) => {
  // Move hooks before any conditional returns to fix the React Hook errors
  const mapInstanceRef = useRef<Map | null>(null);
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const tooltipOverlayRef = useRef<Overlay | null>(null);

  // Internal state
  const [aoiOpacity] = useState<number>(0.8);
  const [hoveredFeature, setHoveredFeature] = useState<FeatureLike | null>(null);
  const [hoveredLabelId, setHoveredLabelId] = useState<number | null>(null);
  const [tooltipContent, setTooltipContent] = useState<{ type: string; status: string } | null>(null);

  // AOI Editing state (only used when enableAOIEditing is true)
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [hasAOI, setHasAOI] = useState(false);
  const [selectedFeatureForEdit, setSelectedFeatureForEdit] = useState<FeatureLike | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);

  // AOI interaction refs
  const drawInteractionRef = useRef<Draw | null>(null);
  const modifyInteractionRef = useRef<Modify | null>(null);
  const selectInteractionRef = useRef<Select | null>(null);
  const currentAOIRef = useRef<GeoJSON.MultiPolygon | GeoJSON.Polygon | null>(null);
  // Refs to track drawing/editing state for click handler (closure issue)
  const isDrawingRef = useRef(false);
  const isEditingRef = useRef(false);

  // Get layer control state from context (for fast basemap switching)
  const { viewport, navigatedFrom, setViewport, layerControl } = useDatasetDetailsMap();

  // Click popover state - for persistent interaction
  const clickPopoverRef = useRef<HTMLDivElement | null>(null);
  const clickOverlayRef = useRef<Overlay | null>(null);
  const [clickedPolygonInfo, setClickedPolygonInfo] = useState<{
    type: string;
    status: string;
    layerType: "deadwood" | "forest_cover";
    correctionId?: number;
    geometryId?: number;
    correctionOperation?: string; // 'create', 'modify', 'delete'
  } | null>(null);

  // Use mapStyle from context for fast switching (avoids parent re-renders)
  const mapStyle = layerControl.mapStyle;

  // Compute effective visibility and opacity from props
  // showDeadwood/showForestCover/showDroneImagery control visibility when provided
  // layerOpacity controls opacity of analysis layers when provided
  const effectiveDeadwoodVisible = showDeadwood !== undefined ? showDeadwood : !hideDeadwoodLayer;
  const effectiveForestCoverVisible = showForestCover !== undefined ? showForestCover : !hideForestCoverLayer;
  const effectiveDroneImageryVisible = showDroneImagery !== undefined ? showDroneImagery : !hideDroneImagery;
  const effectiveLayerOpacity = layerOpacity ?? 1;

  // Fetch label data for the current dataset using modular hook
  const {
    deadwood,
    forestCover,
    isLoading: isLoadingLabels,
  } = useDatasetLabelTypes({
    datasetId: data?.id,
    enabled: !!data?.id,
  });

  // Fetch AOI data for the current dataset
  const { data: aoiData, isLoading: isAOILoading } = useDatasetAOI(data?.id);

  // Stabilize AOI geometry to prevent unnecessary rerenders
  const aoiGeometry = useMemo(() => aoiData?.geometry, [aoiData?.id]);

  // Store layer references for cleanup
  const layerRefs = useRef<{
    basemap?: TileLayer<XYZ>;
    orthoCog?: TileLayerWebGL;
    vectorAOI?: VectorLayer<VectorSource>;
    vectorLabels?: VectorLayer<VectorSource>;
    deadwoodVector?: VectorTileLayer;
    forestCoverVector?: VectorTileLayer;
    selectionLayer?: VectorTileLayer;
    aoiVector?: VectorLayer<VectorSource>;
    aoiMask?: VectorLayer<VectorSource>;
    editableAOI?: VectorLayer<VectorSource>; // For AOI editing mode
  }>({});

  // Main map initialization effect
  useEffect(() => {
    if (!mapInstanceRef.current && data?.file_name && !isLoadingLabels && !isAOILoading) {
      // Determine whether to show prediction layers based on audit quality fields from public view
      const allowDeadwoodPredictions = (() => {
        const q: IDataset["deadwood_quality"] | undefined = (data as IDataset).deadwood_quality ?? undefined;
        if (q === undefined || q === null) return true; // no audit info → allow
        if (typeof q === "boolean") return q;
        if (typeof q === "string") return q !== "bad";
        return true;
      })();

      const allowForestCoverPredictions = (() => {
        const q: IDataset["forest_cover_quality"] | undefined = (data as IDataset).forest_cover_quality ?? undefined;
        if (q === undefined || q === null) return true;
        if (typeof q === "boolean") return q;
        if (typeof q === "string") return q !== "bad";
        return true;
      })();
      // Create ortho layer first
      const orthoCogLayer = new TileLayerWebGL({
        source: new GeoTIFF({
          sources: [
            {
              url: Settings.COG_BASE_URL + data.cog_path,
              nodata: 0,
              bands: [1, 2, 3],
            },
          ],
          convertToRGB: true,
        }),
        maxZoom: 23,
        cacheSize: 4096,
        preload: 0,
        // preload: 4,
      });

      // Create basemap layer - Wayback for satellite, OSM for streets
      const basemapLayer = new TileLayer({
        preload: 0,
        source: new XYZ({
          url:
            mapStyle === "satellite-streets-v12"
              ? getWaybackTileUrl(DEFAULT_WAYBACK_RELEASE)
              : "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
          attributions:
            mapStyle === "satellite-streets-v12"
              ? "Imagery © Esri World Imagery Wayback, Maxar, Earthstar Geographics"
              : "© OpenStreetMap contributors",
          maxZoom: 19,
          crossOrigin: "anonymous",
        }),
      });

      // Create vector layers conditionally based on data availability AND audit quality flags
      // Use showCorrectionStyling to enable corrections-aware MVT function for subtle border indicators
      const deadwoodVectorLayer =
        deadwood.data?.id && allowDeadwoodPredictions
          ? createDeadwoodVectorLayer(deadwood.data.id, { showCorrectionStyling: true })
          : undefined;

      // Only create forest cover layer if forest cover processing is done AND labels exist AND audit quality is good
      const forestCoverVectorLayer =
        data.is_forest_cover_done && forestCover.data?.id && allowForestCoverPredictions
          ? createForestCoverVectorLayer(forestCover.data.id, { showCorrectionStyling: true })
          : undefined;

      // Create AOI layer if AOI data exists (skip if editing is enabled - we use editableAOI instead)
      const aoiVectorLayer = (aoiGeometry && !enableAOIEditing)
        ? createAOIVectorLayer(aoiGeometry as GeoJSON.MultiPolygon | GeoJSON.Polygon)
        : undefined;

      // Create AOI mask layer if AOI data exists - grays out areas outside AOI (skip if editing)
      const aoiMaskLayer = (aoiGeometry && !enableAOIEditing)
        ? createAOIMaskLayer(aoiGeometry as GeoJSON.MultiPolygon | GeoJSON.Polygon)
        : undefined;

      // Create selection layer for hover effect (only if deadwood layer exists)
      // Subtle hover - just highlight border, don't change fill
      const selectionLayer = deadwoodVectorLayer
        ? new VectorTileLayer({
          source: deadwoodVectorLayer.getSource()!,
          style: (feature: FeatureLike) => {
            if (feature === hoveredFeature) {
              return new Style({
                stroke: new Stroke({
                  color: "#06b6d4", // Cyan - matches editor hover color
                  width: 3,
                }),
              });
            }
            return undefined;
          },
          renderMode: "vector",
          renderBuffer: 512,
        })
        : undefined;

      // Store references
      layerRefs.current = {
        basemap: basemapLayer,
        orthoCog: orthoCogLayer,
        deadwoodVector: deadwoodVectorLayer || undefined,
        forestCoverVector: forestCoverVectorLayer || undefined,
        selectionLayer: selectionLayer || undefined,
        aoiVector: aoiVectorLayer || undefined,
        aoiMask: aoiMaskLayer || undefined,
      };

      // Wait for the source to be ready and create map
      const orthoCogSource = orthoCogLayer.getSource();
      if (orthoCogSource) {
        orthoCogSource
          .getView()
          .then((viewOptions) => {
            if (!viewOptions?.extent) {
              return;
            }

            // Use viewport from context if available, otherwise use default view
            const MapView = new View({
              center: viewport.center[0] !== 0 ? viewport.center : viewOptions.center,
              zoom: viewport.zoom !== 2 ? viewport.zoom : undefined,
              extent: viewOptions.extent,
              minZoom: 14,
              maxZoom: 23,
              projection: "EPSG:3857",
              constrainOnlyCenter: true,
            });

            if (mapContainer.current) {
              // Create layers array with proper ordering: basemap → ortho → mask → AOI → forest cover → deadwood → selection
              // The mask grays out areas outside AOI, then AOI shows the boundary, then analysis results on top
              const layers: Array<TileLayer<XYZ> | TileLayerWebGL | VectorLayer<VectorSource> | VectorTileLayer> = [
                basemapLayer,
                orthoCogLayer,
              ];
              if (aoiMaskLayer) layers.push(aoiMaskLayer);
              if (aoiVectorLayer) layers.push(aoiVectorLayer);
              if (forestCoverVectorLayer) layers.push(forestCoverVectorLayer);
              if (deadwoodVectorLayer) layers.push(deadwoodVectorLayer);
              if (selectionLayer) layers.push(selectionLayer);

              // Create tooltip overlay (non-interactive, for hover)
              if (tooltipRef.current) {
                const tooltipOverlay = new Overlay({
                  element: tooltipRef.current,
                  positioning: "bottom-center",
                  offset: [0, -10],
                  stopEvent: false,
                });
                tooltipOverlayRef.current = tooltipOverlay;
              }

              // Create click popover overlay (interactive, for click actions)
              if (clickPopoverRef.current) {
                const clickOverlay = new Overlay({
                  element: clickPopoverRef.current,
                  positioning: "bottom-center",
                  offset: [0, -10],
                  stopEvent: true, // Stop events so popover is interactive
                  autoPan: false, // Don't move map when showing popover
                });
                clickOverlayRef.current = clickOverlay;
              }

              const newMap = new Map({
                target: mapContainer.current,
                layers: layers,
                view: MapView,
                // maxTilesLoading: 4,
                overlays: [
                  ...(tooltipOverlayRef.current ? [tooltipOverlayRef.current] : []),
                  ...(clickOverlayRef.current ? [clickOverlayRef.current] : []),
                ],
                controls: [],
              });

              // Add pointer move event handler for deadwood and forest cover
              const vectorLayers = [deadwoodVectorLayer, forestCoverVectorLayer].filter(Boolean);
              if (vectorLayers.length > 0) {
                newMap.on("pointermove", (event) => {
                  // Get current zoom level
                  const currentZoom = MapView.getZoom();
                  // Minimum zoom level for enabling hover selection (adjust as needed)
                  const MIN_HOVER_ZOOM = 16;

                  // Skip hover selection if zoom level is too low
                  if (!currentZoom || currentZoom < MIN_HOVER_ZOOM) {
                    // Reset hover state if we're zoomed out too far
                    if (hoveredFeature || hoveredLabelId) {
                      setHoveredFeature(null);
                      setHoveredLabelId(null);
                      setTooltipContent(null);
                      tooltipOverlayRef.current?.setPosition(undefined);

                      const targetElement = newMap.getTargetElement();
                      if (targetElement) {
                        targetElement.style.cursor = "";
                      }
                    }
                    return;
                  }

                  const pixel = newMap.getEventPixel(event.originalEvent);

                  // Check both deadwood and forest cover layers
                  let hitLayer: VectorTileLayer | null = null;
                  let layerType = "";

                  if (deadwoodVectorLayer && newMap.hasFeatureAtPixel(pixel, { layerFilter: (l) => l === deadwoodVectorLayer })) {
                    hitLayer = deadwoodVectorLayer;
                    layerType = "Deadwood";
                  } else if (forestCoverVectorLayer && newMap.hasFeatureAtPixel(pixel, { layerFilter: (l) => l === forestCoverVectorLayer })) {
                    hitLayer = forestCoverVectorLayer;
                    layerType = "Forest Cover";
                  }

                  const targetElement = newMap.getTargetElement();
                  if (targetElement) {
                    targetElement.style.cursor = hitLayer ? "pointer" : "";
                  }

                  if (hitLayer) {
                    // Don't prevent default or stop propagation - allow panning to continue
                    hitLayer.getFeatures(pixel).then((features) => {
                      if (features.length > 0) {
                        const feature = features[0];
                        setHoveredFeature(feature);
                        const polygonId = feature.get("id");
                        setHoveredLabelId(polygonId);

                        // Get correction status from feature
                        const correctionStatus = feature.get("correction_status") || "original";
                        setTooltipContent({ type: layerType, status: correctionStatus });
                        tooltipOverlayRef.current?.setPosition(event.coordinate);
                      } else {
                        setHoveredFeature(null);
                        setHoveredLabelId(null);
                        setTooltipContent(null);
                        tooltipOverlayRef.current?.setPosition(undefined);
                      }
                    });
                  } else {
                    setHoveredFeature(null);
                    setHoveredLabelId(null);
                    setTooltipContent(null);
                    tooltipOverlayRef.current?.setPosition(undefined);
                  }
                });

                // Add click event handler for polygon click interaction
                newMap.on("click", (event) => {
                  // Skip click handling if user is drawing or editing AOI
                  if (isDrawingRef.current || isEditingRef.current) {
                    return;
                  }

                  // Get current zoom level
                  const currentZoom = MapView.getZoom();
                  const MIN_CLICK_ZOOM = 16;

                  // Skip click selection if zoom level is too low
                  if (!currentZoom || currentZoom < MIN_CLICK_ZOOM) {
                    setClickedPolygonInfo(null);
                    clickOverlayRef.current?.setPosition(undefined);
                    return;
                  }

                  const pixel = newMap.getEventPixel(event.originalEvent);

                  // Check both deadwood and forest cover layers
                  let hitLayer: VectorTileLayer | null = null;
                  let layerType: "deadwood" | "forest_cover" = "deadwood";
                  let displayType = "";

                  if (deadwoodVectorLayer && newMap.hasFeatureAtPixel(pixel, { layerFilter: (l) => l === deadwoodVectorLayer })) {
                    hitLayer = deadwoodVectorLayer;
                    layerType = "deadwood";
                    displayType = "Deadwood";
                  } else if (forestCoverVectorLayer && newMap.hasFeatureAtPixel(pixel, { layerFilter: (l) => l === forestCoverVectorLayer })) {
                    hitLayer = forestCoverVectorLayer;
                    layerType = "forest_cover";
                    displayType = "Forest Cover";
                  }

                  if (hitLayer) {
                    hitLayer.getFeatures(pixel).then((features) => {
                      if (features.length > 0) {
                        const feature = features[0];
                        const correctionStatus = feature.get("correction_status") || "original";
                        // Get correction info for review functionality
                        const correctionId = feature.get("correction_id");
                        const geometryId = feature.get("id");
                        const correctionOperation = feature.get("correction_operation");

                        setClickedPolygonInfo({
                          type: displayType,
                          status: correctionStatus,
                          layerType: layerType,
                          correctionId: correctionId ? Number(correctionId) : undefined,
                          geometryId: geometryId ? Number(geometryId) : undefined,
                          correctionOperation: correctionOperation || undefined,
                        });
                        clickOverlayRef.current?.setPosition(event.coordinate);

                        // Hide hover tooltip when showing click popover
                        setTooltipContent(null);
                        tooltipOverlayRef.current?.setPosition(undefined);
                      } else {
                        // Clicked on empty area - dismiss popover
                        setClickedPolygonInfo(null);
                        clickOverlayRef.current?.setPosition(undefined);
                      }
                    });
                  } else {
                    // Clicked on empty area - dismiss popover
                    setClickedPolygonInfo(null);
                    clickOverlayRef.current?.setPosition(undefined);
                  }
                });
              }

              // Add view change handler
              MapView.on("change", () => {
                const currentZoom = MapView.getZoom();
                // console.log("[Map] Current zoom level:", currentZoom);

                setViewport({
                  center: MapView.getCenter() || [0, 0],
                  zoom: currentZoom || 2,
                  extent: MapView.calculateExtent(newMap.getSize() || [0, 0]),
                });
              });

              // Only fit view if no previous viewport is saved
              if (viewport.center[0] === 0) {
                MapView.fit(viewOptions.extent);
              }

              mapInstanceRef.current = newMap;
              setIsMapReady(true);

              // Notify parent that map and ortho layer are ready
              onMapReady?.(newMap);
              onOrthoLayerReady?.(orthoCogLayer);
              onVectorLayersReady?.(deadwoodVectorLayer ?? null, forestCoverVectorLayer ?? null);
            }
          })
          .catch(() => {
            // console.error("Error initializing map:", error);
          });
      }
    }

    return () => {
      if (mapInstanceRef.current) {
        // Force WebGL context cleanup
        // const target = mapInstanceRef.current.getTargetElement();
        // if (target) {
        //   const canvases = target.querySelectorAll("canvas");
        //   canvases.forEach((canvas) => {
        //     const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
        //     if (gl) {
        //       gl.getExtension("WEBGL_lose_context")?.loseContext();
        //     }
        //   });
        // }
        if (layerRefs.current.deadwoodVector) {
          // Remove from map
          mapInstanceRef.current.removeLayer(layerRefs.current.deadwoodVector);

          // Get and clean the source
          const source = layerRefs.current.deadwoodVector.getSource();
          if (source) {
            // Clear tile cache
            // if (source.tileCache) {
            // source.tileCache.clear();
            // }

            // Clear source
            if (typeof source.clear === "function") {
              source.clear();
            }

            // Dispose source
            if (typeof source.dispose === "function") {
              source.dispose();
            }
          }

          // Dispose layer
          layerRefs.current.deadwoodVector.dispose();
          layerRefs.current.deadwoodVector = undefined;
        }

        // Clean up AOI layer specifically
        if (layerRefs.current.aoiVector) {
          mapInstanceRef.current.removeLayer(layerRefs.current.aoiVector);
          const source = layerRefs.current.aoiVector.getSource();
          if (source) {
            source.clear();
            source.dispose();
          }
          layerRefs.current.aoiVector.dispose();
          layerRefs.current.aoiVector = undefined;
        }

        // Clean up AOI mask layer specifically
        if (layerRefs.current.aoiMask) {
          mapInstanceRef.current.removeLayer(layerRefs.current.aoiMask);
          const source = layerRefs.current.aoiMask.getSource();
          if (source) {
            source.clear();
            source.dispose();
          }
          layerRefs.current.aoiMask.dispose();
          layerRefs.current.aoiMask = undefined;
        }

        // Clean up other layers
        Object.values(layerRefs.current).forEach((layer) => {
          if (layer) {
            mapInstanceRef.current?.removeLayer(layer);
            const source = layer.getSource();
            if (source) {
              if ("clear" in source) {
                source.clear();
              }
              if ("dispose" in source) {
                source.dispose();
              }
            }
            layer.dispose();
          }
        });

        // Clear layer references
        layerRefs.current = {};

        // Clean up map
        mapInstanceRef.current.setTarget(undefined);
        mapInstanceRef.current.dispose();
        mapInstanceRef.current = null;
        setIsMapReady(false);
      }
    };
  }, [
    data?.id,
    data?.file_name,
    data?.cog_path,
    data?.deadwood_quality,
    data?.forest_cover_quality,
    data?.is_forest_cover_done,
    isLoadingLabels,
    isAOILoading,
    deadwood.data?.id,
    forestCover.data?.id,
    aoiGeometry,
  ]);

  // Update deadwood layer visibility and opacity
  useEffect(() => {
    if (mapInstanceRef.current && layerRefs.current.deadwoodVector) {
      layerRefs.current.deadwoodVector.setVisible(effectiveDeadwoodVisible);
      layerRefs.current.deadwoodVector.setOpacity(effectiveLayerOpacity);
    }
  }, [effectiveDeadwoodVisible, effectiveLayerOpacity]);

  // Update forest cover layer visibility and opacity
  useEffect(() => {
    if (mapInstanceRef.current && layerRefs.current.forestCoverVector) {
      layerRefs.current.forestCoverVector.setVisible(effectiveForestCoverVisible);
      layerRefs.current.forestCoverVector.setOpacity(effectiveLayerOpacity);
    }
  }, [effectiveForestCoverVisible, effectiveLayerOpacity]);

  // Update drone imagery (ortho) visibility
  useEffect(() => {
    if (mapInstanceRef.current && layerRefs.current.orthoCog) {
      layerRefs.current.orthoCog.setVisible(effectiveDroneImageryVisible);
    }
  }, [effectiveDroneImageryVisible]);

  // Update AOI layer visibility and opacity
  useEffect(() => {
    if (mapInstanceRef.current && layerRefs.current.aoiVector) {
      layerRefs.current.aoiVector.setVisible(showAOI);
      layerRefs.current.aoiVector.setOpacity(aoiOpacity);
    }
  }, [showAOI, aoiOpacity]);

  // Update AOI mask layer visibility and opacity (synchronized with AOI boundary)
  useEffect(() => {
    if (mapInstanceRef.current && layerRefs.current.aoiMask) {
      layerRefs.current.aoiMask.setVisible(showAOI);
      // Synchronized with AOI boundary: higher AOI opacity = stronger focus effect
      layerRefs.current.aoiMask.setOpacity(aoiOpacity);
    }
  }, [showAOI, aoiOpacity]);

  // Update editable AOI layer visibility (for edit mode)
  useEffect(() => {
    if (mapInstanceRef.current && layerRefs.current.editableAOI) {
      layerRefs.current.editableAOI.setVisible(showAOI);
    }
  }, [showAOI]);

  // Refresh vector layers when refreshKey changes (after saving edits)
  useEffect(() => {
    if (refreshKey > 0 && mapInstanceRef.current) {
      if (layerRefs.current.deadwoodVector) {
        const source = layerRefs.current.deadwoodVector.getSource();
        if (source) {
          source.refresh();
        }
      }
      if (layerRefs.current.forestCoverVector) {
        const source = layerRefs.current.forestCoverVector.getSource();
        if (source) {
          source.refresh();
        }
      }
    }
  }, [refreshKey]);

  // Update the map style effect to preserve the viewport
  useEffect(() => {
    if (mapInstanceRef.current && layerRefs.current.basemap) {
      const currentView = mapInstanceRef.current.getView();
      const currentCenter = currentView.getCenter();
      const currentZoom = currentView.getZoom();

      // Just update the source, don't recreate the map - Wayback for satellite, OSM for streets
      const nextIsSatellite = mapStyle === "satellite-streets-v12";
      layerRefs.current.basemap.setSource(
        new XYZ({
          url: nextIsSatellite
            ? getWaybackTileUrl(DEFAULT_WAYBACK_RELEASE)
            : "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
          attributions: nextIsSatellite
            ? "Imagery © Esri World Imagery Wayback, Maxar, Earthstar Geographics"
            : "© OpenStreetMap contributors",
          maxZoom: 19,
          crossOrigin: "anonymous",
        }),
      );

      // Ensure the viewport stays the same
      if (currentCenter && currentZoom) {
        currentView.setCenter(currentCenter);
        currentView.setZoom(currentZoom);
      }
    }
  }, [mapStyle]);

  // Add effect to update selection layer style when hover state changes
  // Subtle hover - just highlight border with cyan, don't change fill
  useEffect(() => {
    if (mapInstanceRef.current && layerRefs.current.selectionLayer) {
      layerRefs.current.selectionLayer.setStyle((feature: FeatureLike) => {
        // Check if the feature has the same label_id as the currently hovered feature
        if (hoveredLabelId !== null && feature.get("id") === hoveredLabelId) {
          return new Style({
            stroke: new Stroke({
              color: "#06b6d4", // Cyan - matches editor hover color
              width: 3,
            }),
          });
        }
        return undefined;
      });
    }
  }, [hoveredLabelId]);

  // Additional effect to handle navigation source
  useEffect(() => {
    // If navigated from dataset list, reset viewport
    if (navigatedFrom === "dataset") {
      setViewport({
        center: [0, 0],
        zoom: 2,
      });
    }
    // We don't need to do anything special for 'navigation' source
    // as the viewport is already preserved
  }, [navigatedFrom, setViewport]);

  // ============================================
  // AOI EDITING LOGIC (when enableAOIEditing is true)
  // ============================================

  // Helper function to get current geometry from editable AOI layer
  const getCurrentGeometry = (): GeoJSON.MultiPolygon | GeoJSON.Polygon | null => {
    if (!layerRefs.current.editableAOI) return null;
    const source = layerRefs.current.editableAOI.getSource();
    if (!source) return null;

    const features = source.getFeatures();
    if (features.length === 0) return null;

    const format = new GeoJSON();

    if (features.length === 1) {
      const feature = features[0];
      const geometry = feature.getGeometry();

      if (geometry instanceof Polygon) {
        const geoJsonGeometry = format.writeGeometryObject(geometry, {
          dataProjection: "EPSG:4326",
          featureProjection: "EPSG:3857",
        }) as GeoJSON.Polygon;

        return {
          type: "MultiPolygon",
          coordinates: [geoJsonGeometry.coordinates],
        };
      } else if (geometry instanceof MultiPolygon) {
        return format.writeGeometryObject(geometry, {
          dataProjection: "EPSG:4326",
          featureProjection: "EPSG:3857",
        }) as GeoJSON.MultiPolygon;
      }
    } else if (features.length > 1) {
      const polygonCoordinates: number[][][][] = [];

      features.forEach((feature) => {
        const geometry = feature.getGeometry();
        if (geometry instanceof Polygon) {
          const geoJsonGeometry = format.writeGeometryObject(geometry, {
            dataProjection: "EPSG:4326",
            featureProjection: "EPSG:3857",
          }) as GeoJSON.Polygon;
          polygonCoordinates.push(geoJsonGeometry.coordinates);
        }
      });

      if (polygonCoordinates.length > 0) {
        return {
          type: "MultiPolygon",
          coordinates: polygonCoordinates,
        };
      }
    }

    return null;
  };

  // Update AOI state and notify parent
  const updateAOIWithGeometry = (geometry: GeoJSON.MultiPolygon | GeoJSON.Polygon | null, _sourceAction: string) => {
    currentAOIRef.current = geometry;
    setHasAOI(!!geometry);
    onAOIChange?.(geometry);
  };

  // Clear all drawing/editing interactions
  const clearInteractions = () => {
    if (mapInstanceRef.current) {
      if (drawInteractionRef.current) {
        mapInstanceRef.current.removeInteraction(drawInteractionRef.current);
        drawInteractionRef.current = null;
      }
      if (selectInteractionRef.current) {
        mapInstanceRef.current.removeInteraction(selectInteractionRef.current);
        selectInteractionRef.current = null;
      }
      if (modifyInteractionRef.current) {
        mapInstanceRef.current.removeInteraction(modifyInteractionRef.current);
        modifyInteractionRef.current = null;
      }
    }

    // Reset cursor to default
    if (mapContainer.current) {
      mapContainer.current.style.cursor = "";
    }
  };

  // Start drawing a new polygon
  const startDrawing = () => {
    if (!enableAOIEditing) return;
    clearInteractions();
    if (!mapInstanceRef.current || !layerRefs.current.editableAOI) return;
    const source = layerRefs.current.editableAOI.getSource();
    if (!source) return;

    const draw = new Draw({
      source: source,
      type: "Polygon",
      style: new Style({
        stroke: new Stroke({
          color: "#3b82f6",
          width: 2,
          lineDash: [5, 5],
        }),
        fill: new Fill({
          color: "rgba(255, 107, 53, 0.1)",
        }),
      }),
    });

    draw.on("drawend", () => {
      setTimeout(() => {
        clearInteractions();
        setIsDrawing(false);
        const currentGeometry = getCurrentGeometry();
        updateAOIWithGeometry(currentGeometry, "drawEnd");
        message.success("Polygon drawn successfully.");
      }, 10);
    });

    mapInstanceRef.current.addInteraction(draw);
    drawInteractionRef.current = draw;
    setIsDrawing(true);
    setIsEditing(false);

    if (mapContainer.current) {
      mapContainer.current.style.cursor = "crosshair";
    }
  };

  // Add another polygon (same as startDrawing)
  const addAnotherPolygon = () => startDrawing();

  // Cancel drawing
  const cancelDrawing = () => {
    clearInteractions();
    setIsDrawing(false);
    message.info("Drawing cancelled");
  };

  // Setup editing interactions
  const setupEditingInteractions = () => {
    if (!mapInstanceRef.current || !layerRefs.current.editableAOI) return false;
    const source = layerRefs.current.editableAOI.getSource();
    if (!source || source.getFeatures().length === 0) {
      console.warn("setupEditingInteractions: No features in source to edit.");
      return false;
    }

    clearInteractions();

    const select = new Select({
      condition: click,
      layers: [layerRefs.current.editableAOI],
      style: new Style({
        stroke: new Stroke({ color: "#00FFFF", width: 3 }),
        fill: new Fill({ color: "rgba(0, 255, 255, 0.1)" }),
      }),
    });

    select.on("select", (event) => {
      const selectedFeatures = event.target.getFeatures();
      if (selectedFeatures.getLength() > 0) {
        setSelectedFeatureForEdit(selectedFeatures.item(0));
      } else {
        setSelectedFeatureForEdit(null);
      }
    });

    const modify = new Modify({
      features: select.getFeatures(),
      style: new Style({
        image: new CircleStyle({
          radius: 5,
          fill: new Fill({ color: "#00FFFF" }),
          stroke: new Stroke({ color: "white", width: 1 }),
        }),
      }),
    });

    modify.on("modifyend", () => {
      const currentGeometry = getCurrentGeometry();
      if (currentGeometry) {
        updateAOIWithGeometry(currentGeometry, "modifyEndSuccess");
      }
    });

    mapInstanceRef.current.addInteraction(select);
    mapInstanceRef.current.addInteraction(modify);
    selectInteractionRef.current = select;
    modifyInteractionRef.current = modify;
    return true;
  };

  // Delete selected polygon
  const deleteSelectedPolygon = () => {
    if (!selectedFeatureForEdit || !layerRefs.current.editableAOI) {
      message.error("No polygon selected for deletion.");
      return;
    }

    const source = layerRefs.current.editableAOI.getSource();
    if (!source) return;

    source.removeFeature(selectedFeatureForEdit as Feature<Geometry>);
    setSelectedFeatureForEdit(null);

    const currentGeometry = getCurrentGeometry();
    updateAOIWithGeometry(currentGeometry, "deleteSelectedPolygon");

    if (currentGeometry) {
      message.success("Selected polygon deleted.");
    } else {
      setIsEditing(false);
      clearInteractions();
      message.success("Last polygon deleted. Exiting edit mode.");
    }
  };

  // Start editing existing AOI
  const startEditing = () => {
    if (!enableAOIEditing) return;
    if (!hasAOI) {
      message.error("No AOI to edit.");
      return;
    }
    setIsDrawing(false);
    setSelectedFeatureForEdit(null);
    if (setupEditingInteractions()) {
      setIsEditing(true);
      message.info("Click on a polygon to select and edit it.");

      if (mapContainer.current) {
        mapContainer.current.style.cursor = "pointer";
      }
    } else {
      message.error("Could not start editing. AOI feature might be missing.");
    }
  };

  // Save editing (apply changes)
  const saveEditing = () => {
    clearInteractions();
    setIsEditing(false);
    setSelectedFeatureForEdit(null);
    message.success("AOI edits applied. Save audit to persist.");
  };

  // Cancel editing (restore original)
  const cancelEditing = () => {
    clearInteractions();
    setIsEditing(false);
    setSelectedFeatureForEdit(null);

    // Reload original AOI if available
    if (aoiGeometry && layerRefs.current.editableAOI) {
      const source = layerRefs.current.editableAOI.getSource();
      source?.clear();

      try {
        const format = new GeoJSON();
        const loadedGeometry = aoiGeometry as GeoJSON.MultiPolygon | GeoJSON.Polygon;

        if (loadedGeometry.type === "MultiPolygon") {
          loadedGeometry.coordinates.forEach((polygonCoords) => {
            const polygonGeometry: GeoJSON.Polygon = {
              type: "Polygon",
              coordinates: polygonCoords,
            };

            const features = format.readFeatures(polygonGeometry, {
              dataProjection: "EPSG:4326",
              featureProjection: "EPSG:3857",
            });

            features.forEach(f => {
              if (f && f.getGeometry()) {
                source?.addFeature(f);
              }
            });
          });
        } else if (loadedGeometry.type === "Polygon") {
          const features = format.readFeatures(loadedGeometry, {
            dataProjection: "EPSG:4326",
            featureProjection: "EPSG:3857",
          });

          features.forEach(f => {
            if (f && f.getGeometry()) {
              source?.addFeature(f);
            }
          });
        }

        updateAOIWithGeometry(aoiGeometry as GeoJSON.MultiPolygon | GeoJSON.Polygon, "cancelEditingRestore");
      } catch (error) {
        console.error("Error restoring AOI after cancel:", error);
      }
    }

    message.info("Editing cancelled.");
  };

  // Delete entire AOI
  const deleteAOI = () => {
    if (!enableAOIEditing) return;
    clearInteractions();
    const source = layerRefs.current.editableAOI?.getSource();
    source?.clear();
    updateAOIWithGeometry(null, "deleteAOI");
    setIsEditing(false);
    setIsDrawing(false);
    message.success("AOI deleted.");
  };

  // Refresh vector tile layers (e.g., after approve/revert corrections)
  const refreshVectorLayers = () => {
    const deadwoodSource = layerRefs.current.deadwoodVector?.getSource();
    const forestCoverSource = layerRefs.current.forestCoverVector?.getSource();

    if (deadwoodSource) {
      deadwoodSource.refresh();
    }
    if (forestCoverSource) {
      forestCoverSource.refresh();
    }

    // Also dismiss any open popover since the state may have changed
    setClickedPolygonInfo(null);
    clickOverlayRef.current?.setPosition(undefined);
  };

  // Zoom to a geographic extent (in WGS84 coordinates)
  const zoomToExtent = (minLon: number, minLat: number, maxLon: number, maxLat: number, padding = 100) => {
    if (!mapInstanceRef.current) return;

    const minCoord = fromLonLat([minLon, minLat]);
    const maxCoord = fromLonLat([maxLon, maxLat]);

    mapInstanceRef.current.getView().fit(
      [minCoord[0], minCoord[1], maxCoord[0], maxCoord[1]],
      { padding: [padding, padding, padding, padding], duration: 500, maxZoom: 20 }
    );
  };

  // Flash a location with a temporary marker
  const flashLocation = (lon: number, lat: number) => {
    if (!mapInstanceRef.current) return;

    const coord = fromLonLat([lon, lat]);

    // Create a flash overlay
    const flashEl = document.createElement("div");
    flashEl.style.cssText = `
      width: 40px; height: 40px; 
      border-radius: 50%; 
      border: 4px solid #3b82f6;
      background: rgba(59, 130, 246, 0.3);
      animation: flash-pulse 1.5s ease-out;
      pointer-events: none;
      transform: translate(-50%, -50%);
    `;

    // Add animation styles if not already present
    if (!document.getElementById("flash-animation-style")) {
      const style = document.createElement("style");
      style.id = "flash-animation-style";
      style.textContent = `
        @keyframes flash-pulse {
          0% { transform: translate(-50%, -50%) scale(0.5); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(3); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }

    const flashOverlay = new Overlay({
      element: flashEl,
      position: coord,
      positioning: "center-center",
    });

    mapInstanceRef.current.addOverlay(flashOverlay);

    // Remove after animation
    setTimeout(() => {
      mapInstanceRef.current?.removeOverlay(flashOverlay);
    }, 1500);
  };

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    startDrawing,
    startEditing,
    cancelDrawing,
    cancelEditing,
    saveEditing,
    addAnotherPolygon,
    deleteAOI,
    deleteSelectedPolygon,
    refreshVectorLayers,
    zoomToExtent,
    flashLocation,
  }));

  // Sync drawing/editing refs for click handler closure
  useEffect(() => {
    isDrawingRef.current = isDrawing;
    isEditingRef.current = isEditing;
  }, [isDrawing, isEditing]);

  // Report AOI state changes to parent for toolbar rendering
  useEffect(() => {
    if (!enableAOIEditing || !onToolbarStateChange) return;

    const polygonCount = currentAOIRef.current?.type === "MultiPolygon"
      ? currentAOIRef.current.coordinates.length
      : currentAOIRef.current?.type === "Polygon" ? 1 : 0;

    onToolbarStateChange({
      isDrawing,
      isEditing,
      hasAOI,
      isAOILoading,
      selectedFeatureForEdit: !!selectedFeatureForEdit,
      polygonCount,
    });
  }, [enableAOIEditing, isDrawing, isEditing, hasAOI, isAOILoading, selectedFeatureForEdit, onToolbarStateChange]);

  // Create editable AOI layer when enableAOIEditing is true
  useEffect(() => {
    if (!enableAOIEditing || !isMapReady || !mapInstanceRef.current) return;

    // Create editable AOI layer if not already created
    if (!layerRefs.current.editableAOI) {
      const editableAOISource = new VectorSource();
      const editableAOILayer = new VectorLayer({
        source: editableAOISource,
        style: new Style({
          stroke: new Stroke({
            color: "#3b82f6",
            width: 3,
          }),
          fill: new Fill({
            color: "rgba(255, 107, 53, 0.1)",
          }),
        }),
        zIndex: 100, // Ensure it's on top
      });

      mapInstanceRef.current.addLayer(editableAOILayer);
      layerRefs.current.editableAOI = editableAOILayer;

      // Load existing AOI if available
      if (aoiGeometry) {
        try {
          const format = new GeoJSON();
          const loadedGeometry = aoiGeometry as GeoJSON.MultiPolygon | GeoJSON.Polygon;

          if (loadedGeometry.type === "MultiPolygon") {
            loadedGeometry.coordinates.forEach((polygonCoords) => {
              const polygonGeometry: GeoJSON.Polygon = {
                type: "Polygon",
                coordinates: polygonCoords,
              };

              const features = format.readFeatures(polygonGeometry, {
                dataProjection: "EPSG:4326",
                featureProjection: "EPSG:3857",
              });

              features.forEach(f => {
                if (f && f.getGeometry()) {
                  editableAOISource.addFeature(f);
                }
              });
            });
          } else if (loadedGeometry.type === "Polygon") {
            const features = format.readFeatures(loadedGeometry, {
              dataProjection: "EPSG:4326",
              featureProjection: "EPSG:3857",
            });

            features.forEach(f => {
              if (f && f.getGeometry()) {
                editableAOISource.addFeature(f);
              }
            });
          }

          currentAOIRef.current = loadedGeometry;
          setHasAOI(true);
          // Notify parent that AOI was loaded from database
          onAOIChange?.(loadedGeometry);
        } catch (error) {
          console.error("Error loading existing AOI for editing:", error);
        }
      }
    }

    return () => {
      clearInteractions();
    };
  }, [enableAOIEditing, isMapReady, aoiGeometry, onAOIChange]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearInteractions();
    };
  }, []);

  if (!data) return null;

  return (
    <div className="h-full w-full">
      <div
        style={{
          width: "100%",
          height: "100%",
          position: "relative",
        }}
        ref={mapContainer}
        data-rr-ignore
      >
        {/* Hover tooltip overlay element (non-interactive) - minimal design */}
        <div
          ref={tooltipRef}
          className="pointer-events-none rounded bg-gray-900/90 px-2 py-1 shadow-md"
          style={{ display: tooltipContent && !clickedPolygonInfo ? "block" : "none" }}
        >
          {tooltipContent && (
            <div className="flex items-center gap-1.5 text-xs whitespace-nowrap text-white">
              <span
                className="h-2 w-2 rounded-full flex-shrink-0"
                style={{
                  backgroundColor:
                    tooltipContent.status === "original" || !tooltipContent.status || tooltipContent.status === "none"
                      ? "#F59E0B" // orange - default layer color for predictions
                      : tooltipContent.status === "pending"
                        ? "#60A5FA" // light blue - in review
                        : "#34D399", // light green - verified
                }}
              />
              <span>{tooltipContent.type}</span>
              <span className="text-gray-400">·</span>
              <span className="text-gray-300">
                {tooltipContent.status === "original" || !tooltipContent.status || tooltipContent.status === "none"
                  ? "Prediction"
                  : tooltipContent.status === "pending"
                    ? "Edited"
                    : "Verified"}
              </span>
              {isLoggedIn && <span className="text-gray-500">· click to edit</span>}
            </div>
          )}
        </div>

        {/* Click popover overlay element (interactive) - Ant Design Card */}
        <div
          ref={clickPopoverRef}
          style={{ display: clickedPolygonInfo ? "block" : "none" }}
        >
          {clickedPolygonInfo && (
            <Card
              size="small"
              className="shadow-xl border-gray-100"
              style={{ width: 220, borderRadius: 8, overflow: 'hidden' }}
              title={
                <Space size={4}>
                  <Text strong style={{ fontSize: '12px' }}>{clickedPolygonInfo.type}</Text>
                  <Tag
                    color={
                      clickedPolygonInfo.status === "original" ? "default" :
                        clickedPolygonInfo.status === "pending"
                          ? clickedPolygonInfo.correctionOperation === "delete" ? "error" : "warning"
                          : "success"
                    }
                    className="m-0 text-[10px] leading-4 h-4 px-1 border-none"
                  >
                    {clickedPolygonInfo.status === "original" ? "Prediction" :
                      clickedPolygonInfo.status === "pending"
                        ? clickedPolygonInfo.correctionOperation === "create" ? "Added"
                          : clickedPolygonInfo.correctionOperation === "delete" ? "Deleted"
                            : clickedPolygonInfo.correctionOperation === "modify" ? "Modified"
                              : "Edited"
                        : "Verified"}
                  </Tag>
                </Space>
              }
              extra={
                <Button
                  type="text"
                  size="small"
                  className="p-0 h-4 w-4 flex items-center justify-center text-gray-400 hover:text-gray-600"
                  icon={<CloseOutlined style={{ fontSize: 10 }} />}
                  onClick={() => {
                    setClickedPolygonInfo(null);
                    clickOverlayRef.current?.setPosition(undefined);
                  }}
                />
              }
              bodyStyle={{ padding: "10px 12px" }}
            >
              <div className="flex flex-col gap-3">
                <Text type="secondary" style={{ fontSize: '11px', lineHeight: '1.4' }}>
                  {clickedPolygonInfo.status === "original"
                    ? "This is a model prediction. Help improve accuracy by editing."
                    : clickedPolygonInfo.status === "pending"
                      ? clickedPolygonInfo.correctionOperation === "create"
                        ? "This polygon has been added and is awaiting review."
                        : clickedPolygonInfo.correctionOperation === "delete"
                          ? "This polygon has been marked for deletion and is awaiting review."
                          : clickedPolygonInfo.correctionOperation === "modify"
                            ? "This polygon has been modified and is awaiting review."
                            : "This polygon has been edited and is awaiting review."
                      : "This polygon has been verified and is considered accurate."}
                </Text>

                {/* Correction Review Actions (for auditors reviewing pending edits) */}
                {canReviewCorrections && clickedPolygonInfo.status === "pending" && clickedPolygonInfo.correctionId && clickedPolygonInfo.geometryId && (
                  <div className="flex gap-2">
                    <Button
                      type="primary"
                      size="small"
                      icon={<CheckOutlined style={{ fontSize: 11 }} />}
                      onClick={() => {
                        onApproveCorrection?.(clickedPolygonInfo.correctionId!, clickedPolygonInfo.geometryId!);
                        setClickedPolygonInfo(null);
                        clickOverlayRef.current?.setPosition(undefined);
                      }}
                      className="text-xs h-7 flex-1"
                    >
                      Approve
                    </Button>
                    <Button
                      danger
                      size="small"
                      icon={<UndoOutlined style={{ fontSize: 11 }} />}
                      onClick={() => {
                        onRevertCorrection?.(clickedPolygonInfo.correctionId!, clickedPolygonInfo.geometryId!);
                        setClickedPolygonInfo(null);
                        clickOverlayRef.current?.setPosition(undefined);
                      }}
                      className="text-xs h-7 flex-1"
                    >
                      Revert
                    </Button>
                  </div>
                )}

                {/* Edit Action (for logged-in users) */}
                {isLoggedIn ? (
                  <Button
                    type="primary"
                    size="small"
                    block
                    icon={<EditOutlined style={{ fontSize: 11 }} />}
                    onClick={() => {
                      setClickedPolygonInfo(null);
                      clickOverlayRef.current?.setPosition(undefined);
                      if (clickedPolygonInfo.layerType === "deadwood") {
                        onEditDeadwood?.();
                      } else {
                        onEditForestCover?.();
                      }
                    }}
                    className="text-xs h-8 font-medium"
                  >
                    Edit {clickedPolygonInfo.type}
                  </Button>
                ) : (
                  <Button
                    type="default"
                    size="small"
                    block
                    href="/sign-in"
                    className="text-xs h-8"
                  >
                    Sign in to edit
                  </Button>
                )}
              </div>
            </Card>
          )}
        </div>

        {/* MapStyleSwitchButtons removed - basemap selector moved to parent DatasetLayerControlPanel */}
      </div>
    </div>
  );
});

DatasetDetailsMap.displayName = "DatasetDetailsMap";

export default DatasetDetailsMap;
