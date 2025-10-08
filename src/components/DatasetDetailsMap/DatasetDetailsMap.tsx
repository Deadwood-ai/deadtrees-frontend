import { useEffect, useRef, useState, useMemo } from "react";
import { XYZ } from "ol/source";
import TileLayer from "ol/layer/Tile";
import { View, Map } from "ol";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import TileLayerWebGL from "ol/layer/WebGLTile.js";
import { GeoTIFF } from "ol/source";
import VectorTileLayer from "ol/layer/VectorTile";
import { Style, Fill, Stroke } from "ol/style";
import { FeatureLike } from "ol/Feature";

import { IDataset } from "../../types/dataset";
import DeadwoodCardDetails from "./DeadwoodCardDetails";
import MapStyleSwitchButtons from "../DeadwoodMap/MapStyleSwitchButtons";
import { Settings } from "../../config";
import { createDeadwoodVectorLayer } from "./createVectorLayer";
import { useDatasetLabelTypes } from "../../hooks/useDatasetLabelTypes";
import { createForestCoverVectorLayer, createAOIVectorLayer, createAOIMaskLayer } from "./createVectorLayer";
import { useDatasetDetailsMap } from "../../hooks/useDatasetDetailsMapProvider";
import { useDatasetAOI } from "../../hooks/useDatasetAudit";

const DatasetDetailsMap = ({ data }: { data: IDataset }) => {
  // Move hooks before any conditional returns to fix the React Hook errors
  const mapRef = useRef<Map | null>(null);
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const [mapStyle, setMapStyle] = useState("streets-v12");
  const [deadwoodOpacity, setDeadwoodOpacity] = useState<number>(1);
  const [droneImageOpacity, setDroneImageOpacity] = useState<number>(1);
  const [forestCoverOpacity, setForestCoverOpacity] = useState<number>(1);
  const [aoiOpacity, setAoiOpacity] = useState<number>(0.8);
  const [hoveredFeature, setHoveredFeature] = useState<FeatureLike | null>(null);
  const [hoveredLabelId, setHoveredLabelId] = useState<number | null>(null);
  const { viewport, navigatedFrom, setViewport } = useDatasetDetailsMap();

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

      // Create all other layers before map initialization - Raster API for satellite, Static API for streets
      const basemapLayer = new TileLayer({
        preload: 0,
        source: new XYZ({
          url:
            mapStyle === "satellite-streets-v12"
              ? `https://api.mapbox.com/v4/mapbox.satellite/{z}/{x}/{y}.jpg?access_token=${import.meta.env.VITE_MAPBOX_ACCESS_TOKEN}`
              : "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
          attributions:
            mapStyle === "satellite-streets-v12"
              ? "© Mapbox © OpenStreetMap contributors"
              : "© OpenStreetMap contributors",
          maxZoom: mapStyle === "satellite-streets-v12" ? undefined : 19,
          tileSize: mapStyle === "satellite-streets-v12" ? 512 : 256,
        }),
      });

      // Create vector layers conditionally based on data availability AND audit quality flags
      const deadwoodVectorLayer =
        deadwood.data?.id && allowDeadwoodPredictions ? createDeadwoodVectorLayer(deadwood.data.id) : undefined;

      // Only create forest cover layer if forest cover processing is done AND labels exist AND audit quality is good
      const forestCoverVectorLayer =
        data.is_forest_cover_done && forestCover.data?.id && allowForestCoverPredictions
          ? createForestCoverVectorLayer(forestCover.data.id)
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
      const selectionLayer = deadwoodVectorLayer
        ? new VectorTileLayer({
            source: deadwoodVectorLayer.getSource()!,
            style: (feature: FeatureLike) => {
              if (feature === hoveredFeature) {
                return new Style({
                  fill: new Fill({
                    color: "rgba(255, 100, 100, 0.9)",
                  }),
                  stroke: new Stroke({
                    color: "rgba(255, 255, 255, 1)",
                    width: 2.5,
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

              const newMap = new Map({
                target: mapContainer.current,
                layers: layers,
                view: MapView,
                // maxTilesLoading: 4,
                overlays: [],
                controls: [],
              });

              // Add pointer move event handler (only if deadwood layer exists)
              if (deadwoodVectorLayer) {
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

                      const targetElement = newMap.getTargetElement();
                      if (targetElement) {
                        targetElement.style.cursor = "";
                      }
                    }
                    return;
                  }

                  const pixel = newMap.getEventPixel(event.originalEvent);
                  const hit = newMap.hasFeatureAtPixel(pixel, {
                    layerFilter: (layer) => layer === deadwoodVectorLayer,
                  });

                  const targetElement = newMap.getTargetElement();
                  if (targetElement) {
                    targetElement.style.cursor = hit ? "pointer" : "";
                  }

                  if (hit) {
                    event.preventDefault();
                    event.stopPropagation();

                    deadwoodVectorLayer.getFeatures(pixel).then((features) => {
                      if (features.length > 0) {
                        const feature = features[0];
                        setHoveredFeature(feature);
                        // Store the label_id of the hovered feature
                        const polygonId = feature.get("id");
                        setHoveredLabelId(polygonId);
                      } else {
                        setHoveredFeature(null);
                        setHoveredLabelId(null);
                      }
                    });
                  } else {
                    setHoveredFeature(null);
                    setHoveredLabelId(null);
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

  // update deadwood layer opacity
  useEffect(() => {
    if (mapRef.current && layerRefs.current.deadwoodVector) {
      layerRefs.current.deadwoodVector.setOpacity(deadwoodOpacity);
    }
  }, [deadwoodOpacity]);

  // update satellite layer opacity
  useEffect(() => {
    if (mapRef.current && layerRefs.current.orthoCog) {
      layerRefs.current.orthoCog.setOpacity(droneImageOpacity);
    }
  }, [droneImageOpacity]);

  // update forest cover layer opacity
  useEffect(() => {
    if (mapRef.current && layerRefs.current.forestCoverVector) {
      layerRefs.current.forestCoverVector.setOpacity(forestCoverOpacity);
    }
  }, [forestCoverOpacity]);

  // update AOI layer opacity
  useEffect(() => {
    if (mapRef.current && layerRefs.current.aoiVector) {
      layerRefs.current.aoiVector.setOpacity(aoiOpacity);
    }
  }, [aoiOpacity]);

  // update AOI mask layer opacity (synchronized with AOI boundary)
  useEffect(() => {
    if (mapRef.current && layerRefs.current.aoiMask) {
      // Synchronized with AOI boundary: higher AOI opacity = stronger focus effect
      layerRefs.current.aoiMask.setOpacity(aoiOpacity);
    }
  }, [aoiOpacity]);

  // Update the map style effect to preserve the viewport
  useEffect(() => {
    if (mapRef.current && layerRefs.current.basemap) {
      const currentView = mapRef.current.getView();
      const currentCenter = currentView.getCenter();
      const currentZoom = currentView.getZoom();

      // Just update the source, don't recreate the map - Raster API for satellite, Static API for streets
      const nextIsSatellite = mapStyle === "satellite-streets-v12";
      layerRefs.current.basemap.setSource(
        new XYZ({
          url: nextIsSatellite
            ? `https://api.mapbox.com/v4/mapbox.satellite/{z}/{x}/{y}.jpg?access_token=${import.meta.env.VITE_MAPBOX_ACCESS_TOKEN}`
            : "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
          attributions: nextIsSatellite ? "© Mapbox © OpenStreetMap contributors" : "© OpenStreetMap contributors",
          maxZoom: nextIsSatellite ? undefined : 19,
          tileSize: nextIsSatellite ? 512 : 256,
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
  useEffect(() => {
    if (mapRef.current && layerRefs.current.selectionLayer) {
      layerRefs.current.selectionLayer.setStyle((feature: FeatureLike) => {
        // Check if the feature has the same label_id as the currently hovered feature
        if (hoveredLabelId !== null && feature.get("id") === hoveredLabelId) {
          return new Style({
            fill: new Fill({
              color: "rgba(255, 100, 100, 0.9)",
            }),
            stroke: new Stroke({
              color: "rgba(255, 100, 100, 1)",
              width: 2.5,
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
        <div className="absolute left-2 top-4 z-20">
          <MapStyleSwitchButtons
            mapStyle={mapStyle}
            onChange={(next) => {
              if (next === "satellite-streets-v12" && mapRef.current) {
                const zoom = mapRef.current.getView().getZoom();
                if (!zoom || zoom < 14) {
                  return;
                }
              }
              setMapStyle(next);
            }}
          />
        </div>

        <div className="absolute bottom-4 right-6 z-50 ">
          <DeadwoodCardDetails
            deadwoodOpacity={deadwoodOpacity}
            setDeadwoodOpacity={setDeadwoodOpacity}
            droneImageOpacity={droneImageOpacity}
            setDroneImageOpacity={setDroneImageOpacity}
            forestCoverOpacity={forestCoverOpacity}
            setForestCoverOpacity={setForestCoverOpacity}
            aoiOpacity={aoiOpacity}
            setAoiOpacity={setAoiOpacity}
            showLegend={
              !!deadwood.data &&
              (() => {
                const q: IDataset["deadwood_quality"] | undefined = (data as IDataset).deadwood_quality ?? undefined;
                if (q === undefined || q === null) return true;
                if (typeof q === "boolean") return q;
                if (typeof q === "string") return q !== "bad";
                return true;
              })()
            }
            showForestCoverLegend={
              !!forestCover.data &&
              !!data.is_forest_cover_done &&
              (() => {
                const q: IDataset["forest_cover_quality"] | undefined =
                  (data as IDataset).forest_cover_quality ?? undefined;
                if (q === undefined || q === null) return true;
                if (typeof q === "boolean") return q;
                if (typeof q === "string") return q !== "bad";
                return true;
              })()
            }
            showAOI={!!aoiData}
          />
        </div>
      </div>
    </div>
  );
};

export default DatasetDetailsMap;
