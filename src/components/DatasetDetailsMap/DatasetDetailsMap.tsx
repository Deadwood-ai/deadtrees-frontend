import { useEffect, useRef, useState } from "react";
import { BingMaps, XYZ } from "ol/source";
import TileLayer from "ol/layer/Tile";
import { View, Map } from "ol";
import VectorLayer from "ol/layer/Vector";
import TileLayerWebGL from "ol/layer/WebGLTile.js";
import { GeoTIFF } from "ol/source";
import VectorTileLayer from "ol/layer/VectorTile";
import { Style, Fill, Stroke } from "ol/style";
import Feature from "ol/Feature";
import RenderFeature from "ol/render/Feature";
import { FeatureLike } from "ol/Feature";

import { IDataset } from "../../types/dataset";
import DeadwoodCardDetails from "./DeadwoodCardDetails";
import MapStyleSwitchButtons from "../DeadwoodMap/MapStyleSwitchButtons";
import { Settings } from "../../config";
import { createDeadwoodVectorLayer, createForestCoverVectorLayer } from "./createVectorLayer";
import createDeadwoodGeotiffLayer from "../DeadwoodMap/createDeadwoodGeotiffLayer";
import { useDatasetLabels } from "../../hooks/useDatasetLabels";
import { ILabelData } from "../../types/labels";
import { useDatasetDetailsMap } from "../../hooks/useDatasetDetailsMapProvider";

const DatasetDetailsMap = ({ data }: { data: IDataset }) => {
  // Move hooks before any conditional returns to fix the React Hook errors
  const mapRef = useRef<Map | null>(null);
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const [mapStyle, setMapStyle] = useState("RoadOnDemand");
  const [deadwoodOpacity, setDeadwoodOpacity] = useState<number>(1);
  const [droneImageOpacity, setDroneImageOpacity] = useState<number>(1);
  const [forestCoverOpacity, setForestCoverOpacity] = useState<number>(1);
  const [hoveredFeature, setHoveredFeature] = useState<FeatureLike | null>(null);
  const [hoveredLabelId, setHoveredLabelId] = useState<number | null>(null);
  const { viewport, navigatedFrom, setViewport } = useDatasetDetailsMap();

  // Fetch label data for the current dataset
  const { data: labelData, isLoading: isLoadingLabel } = useDatasetLabels({
    datasetId: data?.id,
    labelData: ILabelData.DEADWOOD,
    enabled: !!data?.id,
  });

  // Store layer references for cleanup
  const layerRefs = useRef<{
    basemap?: TileLayer<BingMaps>;
    orthoCog?: TileLayerWebGL;
    vectorAOI?: VectorLayer<any>;
    vectorLabels?: VectorLayer<any>;
    deadwoodVector?: VectorTileLayer;
    forestCoverVector?: VectorTileLayer;
    selectionLayer?: VectorTileLayer;
  }>({});

  if (!data) return null;

  useEffect(() => {
    if (!mapRef.current && data?.file_name && !isLoadingLabel) {
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

      // Create all other layers before map initialization
      const basemapLayer = new TileLayer({
        source: new XYZ({
          url: `https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/tiles/512/{z}/{x}/{y}?access_token=${import.meta.env.VITE_MAPBOX_ACCESS_TOKEN}`,
          attributions: "© Mapbox © OpenStreetMap contributors",
        }),
        // source: new XYZ({
        //   url: `https://api.maptiler.com/maps/satellite/{z}/{x}/{y}.jpg?key=${import.meta.env.VITE_MAPTILER_KEY}`,
        //   attributions: "© MapTiler © OpenStreetMap contributors",
        // }),
      });

      // Only create deadwood vector layer if labels exist
      const deadwoodVectorLayer = createDeadwoodVectorLayer(labelData?.id);

      // Create selection layer for hover effect
      const selectionLayer = new VectorTileLayer({
        source: deadwoodVectorLayer.getSource(),
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
      });

      // Store references
      layerRefs.current = {
        basemap: basemapLayer,
        orthoCog: orthoCogLayer,
        deadwoodVector: deadwoodVectorLayer,
        selectionLayer: selectionLayer,
      };

      // Wait for the source to be ready and create map
      if (orthoCogLayer.getSource()) {
        orthoCogLayer
          .getSource()
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
              maxZoom: 22,
              projection: "EPSG:3857",
              constrainOnlyCenter: true,
            });

            if (mapContainer.current) {
              const newMap = new Map({
                target: mapContainer.current,
                layers: [basemapLayer, orthoCogLayer, deadwoodVectorLayer, selectionLayer],
                view: MapView,
                // maxTilesLoading: 4,
                overlays: [],
                controls: [],
              });

              // Add pointer move event handler
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
          .catch((error) => {
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

        // Clean up layers
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
  }, [data, isLoadingLabel, labelData]);

  // update deadwood layer opacity
  useEffect(() => {
    if (mapRef.current && layerRefs.current.deadwoodVector) {
      layerRefs.current.deadwoodVector.setOpacity(deadwoodOpacity);
    }
  }, [deadwoodOpacity]);

  // update forest cover layer opacity
  useEffect(() => {
    if (mapRef.current && layerRefs.current.forestCoverVector) {
      layerRefs.current.forestCoverVector.setOpacity(forestCoverOpacity);
    }
  }, [forestCoverOpacity]);

  // update satellite layer opacity
  useEffect(() => {
    if (mapRef.current && layerRefs.current.orthoCog) {
      layerRefs.current.orthoCog.setOpacity(droneImageOpacity);
    }
  }, [droneImageOpacity]);

  // Update the map style effect to preserve the viewport
  useEffect(() => {
    if (mapRef.current && layerRefs.current.basemap) {
      const currentView = mapRef.current.getView();
      const currentCenter = currentView.getCenter();
      const currentZoom = currentView.getZoom();

      // Just update the source, don't recreate the map
      layerRefs.current.basemap.setSource(
        new BingMaps({
          key: import.meta.env.VITE_BING_MAPS_KEY,
          imagerySet: mapStyle,
          culture: "en-us",
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

  return (
    <div className="h-full w-full">
      <div
        style={{
          width: "100%",
          height: "100%",
        }}
        ref={mapContainer}
      >
        <div className="absolute left-2 top-4 z-20">
          <MapStyleSwitchButtons mapStyle={mapStyle} setMapStyle={setMapStyle} />
        </div>
        <div className="absolute bottom-4 right-6 z-50 ">
          <DeadwoodCardDetails
            deadwoodOpacity={deadwoodOpacity}
            setDeadwoodOpacity={setDeadwoodOpacity}
            droneImageOpacity={droneImageOpacity}
            setDroneImageOpacity={setDroneImageOpacity}
            showLegend={labelData ? true : false}
          />
        </div>
      </div>
    </div>
  );
};

export default DatasetDetailsMap;
