import { useEffect, useRef, useState, useMemo } from "react";
import { XYZ } from "ol/source";
import TileLayer from "ol/layer/Tile";
import { View, Map, Overlay } from "ol";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import TileLayerWebGL from "ol/layer/WebGLTile.js";
import { GeoTIFF } from "ol/source";
import VectorTileLayer from "ol/layer/VectorTile";
import { Style, Fill, Stroke } from "ol/style";
import { FeatureLike } from "ol/Feature";
import { Card, Button, Tag, Typography, Space } from "antd";
import { EditOutlined, CloseOutlined } from "@ant-design/icons";

const { Text } = Typography;

import { IDataset } from "../../types/dataset";
import { Settings } from "../../config";
import { getWaybackTileUrl } from "../../utils/waybackVersions";

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
  layerOpacity?: number; // Unified opacity for analysis layers (deadwood + forest cover)
  // Edit callbacks for polygon click interaction
  onEditDeadwood?: () => void;
  onEditForestCover?: () => void;
  isLoggedIn?: boolean;
}

const DatasetDetailsMap = ({ 
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
  layerOpacity,
  // Edit callbacks
  onEditDeadwood,
  onEditForestCover,
  isLoggedIn = false,
}: DatasetDetailsMapProps) => {
  // Move hooks before any conditional returns to fix the React Hook errors
  const mapRef = useRef<Map | null>(null);
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const tooltipOverlayRef = useRef<Overlay | null>(null);
  
  // Internal state
  const [aoiOpacity, setAoiOpacity] = useState<number>(0.8);
  const [hoveredFeature, setHoveredFeature] = useState<FeatureLike | null>(null);
  const [hoveredLabelId, setHoveredLabelId] = useState<number | null>(null);
  const [tooltipContent, setTooltipContent] = useState<{ type: string; status: string } | null>(null);
  
  // Get layer control state from context (for fast basemap switching)
  const { viewport, navigatedFrom, setViewport, layerControl } = useDatasetDetailsMap();
  
  // Click popover state - for persistent interaction
  const clickPopoverRef = useRef<HTMLDivElement | null>(null);
  const clickOverlayRef = useRef<Overlay | null>(null);
  const [clickedPolygonInfo, setClickedPolygonInfo] = useState<{ type: string; status: string; layerType: "deadwood" | "forest_cover" } | null>(null);

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
  }>({});

  // Main map initialization effect
  useEffect(() => {
    if (!mapRef.current && data?.file_name && !isLoadingLabels && !isAOILoading) {
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

      // Create AOI layer if AOI data exists
      const aoiVectorLayer = aoiGeometry
        ? createAOIVectorLayer(aoiGeometry as GeoJSON.MultiPolygon | GeoJSON.Polygon)
        : undefined;

      // Create AOI mask layer if AOI data exists - grays out areas outside AOI
      const aoiMaskLayer = aoiGeometry
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
                        
                        setClickedPolygonInfo({
                          type: displayType,
                          status: correctionStatus,
                          layerType: layerType,
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

              mapRef.current = newMap;
              
              // Notify parent that map and ortho layer are ready
              onMapReady?.(newMap);
              onOrthoLayerReady?.(orthoCogLayer);
              onVectorLayersReady?.(deadwoodVectorLayer, forestCoverVectorLayer);
            }
          })
          .catch(() => {
            // console.error("Error initializing map:", error);
          });
      }
    }

    return () => {
      if (mapRef.current) {
        // Force WebGL context cleanup
        // const target = mapRef.current.getTargetElement();
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
          mapRef.current.removeLayer(layerRefs.current.deadwoodVector);

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
          mapRef.current.removeLayer(layerRefs.current.aoiVector);
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
          mapRef.current.removeLayer(layerRefs.current.aoiMask);
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
            mapRef.current?.removeLayer(layer);
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
        mapRef.current.setTarget(undefined);
        mapRef.current.dispose();
        mapRef.current = null;
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
    if (mapRef.current && layerRefs.current.deadwoodVector) {
      layerRefs.current.deadwoodVector.setVisible(effectiveDeadwoodVisible);
      layerRefs.current.deadwoodVector.setOpacity(effectiveLayerOpacity);
    }
  }, [effectiveDeadwoodVisible, effectiveLayerOpacity]);

  // Update forest cover layer visibility and opacity
  useEffect(() => {
    if (mapRef.current && layerRefs.current.forestCoverVector) {
      layerRefs.current.forestCoverVector.setVisible(effectiveForestCoverVisible);
      layerRefs.current.forestCoverVector.setOpacity(effectiveLayerOpacity);
    }
  }, [effectiveForestCoverVisible, effectiveLayerOpacity]);

  // Update drone imagery (ortho) visibility
  useEffect(() => {
    if (mapRef.current && layerRefs.current.orthoCog) {
      layerRefs.current.orthoCog.setVisible(effectiveDroneImageryVisible);
    }
  }, [effectiveDroneImageryVisible]);

  // Update AOI layer opacity
  useEffect(() => {
    if (mapRef.current && layerRefs.current.aoiVector) {
      layerRefs.current.aoiVector.setOpacity(aoiOpacity);
    }
  }, [aoiOpacity]);

  // Update AOI mask layer opacity (synchronized with AOI boundary)
  useEffect(() => {
    if (mapRef.current && layerRefs.current.aoiMask) {
      // Synchronized with AOI boundary: higher AOI opacity = stronger focus effect
      layerRefs.current.aoiMask.setOpacity(aoiOpacity);
    }
  }, [aoiOpacity]);

  // Refresh vector layers when refreshKey changes (after saving edits)
  useEffect(() => {
    if (refreshKey > 0 && mapRef.current) {
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
    if (mapRef.current && layerRefs.current.basemap) {
      const currentView = mapRef.current.getView();
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
    if (mapRef.current && layerRefs.current.selectionLayer) {
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
                      clickedPolygonInfo.status === "pending" ? "warning" : "success"
                    }
                    className="m-0 text-[10px] leading-4 h-4 px-1 border-none"
                  >
                    {clickedPolygonInfo.status === "original" ? "Prediction" :
                     clickedPolygonInfo.status === "pending" ? "Edited" : "Verified"}
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
                    ? "This polygon has been edited and is awaiting review."
                    : "This polygon has been verified and is considered accurate."}
                </Text>
                
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
};

export default DatasetDetailsMap;
