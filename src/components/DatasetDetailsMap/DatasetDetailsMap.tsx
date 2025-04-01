import { useEffect, useRef, useState } from "react";
import { BingMaps } from "ol/source";
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

const DatasetDetailsMap = ({ data }: { data: IDataset }) => {
  // Move hooks before any conditional returns to fix the React Hook errors
  const mapRef = useRef<Map | null>(null);
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const [mapStyle, setMapStyle] = useState("RoadOnDemand");
  const [selectedYear, setSelectedYear] = useState<string>("2018");
  const [deadwoodOpacity, setDeadwoodOpacity] = useState<number>(1);
  const [satelliteOpacity, setSatelliteOpacity] = useState<number>(0);
  const [forestCoverOpacity, setForestCoverOpacity] = useState<number>(1);
  const [isLegendVisible, setIsLegendVisible] = useState(false);
  const [loadedLayers, setLoadedLayers] = useState<Record<string, boolean>>({});
  const [hoveredFeature, setHoveredFeature] = useState<FeatureLike | null>(null);

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
    geotifLayer2018?: TileLayerWebGL;
    geotifLayer2019?: TileLayerWebGL;
    geotifLayer2020?: TileLayerWebGL;
    geotifLayer2021?: TileLayerWebGL;
    geotifLayer2022?: TileLayerWebGL;
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
        maxZoom: 22,
        cacheSize: 4096,
        // preload: 4,
      });

      // Create all other layers before map initialization
      const basemapLayer = new TileLayer({
        source: new BingMaps({
          key: import.meta.env.VITE_BING_MAPS_KEY,
          imagerySet: mapStyle,
          culture: "en-us",
        }),
      });

      // Only create deadwood vector layer if labels exist
      const deadwoodVectorLayer = createDeadwoodVectorLayer(labelData?.id);

      // Only create 2018 layer initially since it's the default
      const geotifLayer2018 = createDeadwoodGeotiffLayer("2018");

      // Create selection layer for hover effect
      const selectionLayer = new VectorTileLayer({
        source: deadwoodVectorLayer.getSource(),
        style: (feature: FeatureLike) => {
          if (feature === hoveredFeature) {
            return new Style({
              fill: new Fill({
                color: "rgba(129, 176, 247, 0.9)",
              }),
              stroke: new Stroke({
                color: "rgba(129, 176, 247, 1)",
                width: 2,
              }),
            });
          }
          return undefined;
        },
        renderMode: "vector",
      });

      // Store references
      layerRefs.current = {
        basemap: basemapLayer,
        orthoCog: orthoCogLayer,
        deadwoodVector: deadwoodVectorLayer,
        geotifLayer2018: geotifLayer2018,
        selectionLayer: selectionLayer,
      };

      // Wait for the source to be ready and create map
      if (orthoCogLayer.getSource()) {
        orthoCogLayer
          .getSource()
          .getView()
          .then((viewOptions) => {
            if (!viewOptions?.extent) {
              // console.error("No extent found in viewOptions");
              return;
            }

            const MapView = new View({
              center: viewOptions.center,
              extent: viewOptions.extent,
              maxZoom: 22,
              projection: "EPSG:3857",
              constrainOnlyCenter: true,
            });

            if (mapContainer.current) {
              const newMap = new Map({
                target: mapContainer.current,
                layers: [basemapLayer, orthoCogLayer, deadwoodVectorLayer, selectionLayer, geotifLayer2018],
                view: MapView,
                overlays: [],
                controls: [],
              });

              // Add pointer move event handler
              newMap.on("pointermove", (event) => {
                const pixel = newMap.getEventPixel(event.originalEvent);
                const hit = newMap.hasFeatureAtPixel(pixel, {
                  layerFilter: (layer) => layer === deadwoodVectorLayer,
                });

                const targetElement = newMap.getTargetElement();
                if (targetElement) {
                  targetElement.style.cursor = hit ? "pointer" : "";
                }

                if (hit) {
                  // console.log("[Map] pointermove", targetElement.style.cursor);
                  event.preventDefault();
                  event.stopPropagation();

                  deadwoodVectorLayer.getFeatures(pixel).then((features) => {
                    if (features.length > 0) {
                      setHoveredFeature(features[0]);
                    } else {
                      setHoveredFeature(null);
                    }
                  });
                } else {
                  setHoveredFeature(null);
                }
              });

              MapView.fit(viewOptions.extent);
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
  }, [data, mapStyle, isLoadingLabel, labelData]);

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
    if (mapRef.current) {
      // Update orthoCog layer opacity
      // if (layerRefs.current.orthoCog) {
      // layerRefs.current.orthoCog.setOpacity(satelliteOpacity);
      // }

      // Update all geotiff layers opacity
      const years = ["2018", "2019", "2020", "2021", "2022"];
      years.forEach((year) => {
        const layerKey = `geotifLayer${year}` as keyof typeof layerRefs.current;
        if (layerRefs.current[layerKey]) {
          layerRefs.current[layerKey]!.setOpacity(satelliteOpacity);
        }
      });
    }
  }, [satelliteOpacity]);

  // update on mapStyle change
  useEffect(() => {
    if (mapRef.current && layerRefs.current.basemap) {
      layerRefs.current.basemap.setSource(
        new BingMaps({
          key: import.meta.env.VITE_BING_MAPS_KEY,
          imagerySet: mapStyle,
          culture: "en-us",
        }),
      );
    }
  }, [mapStyle]);

  // Update layer loading and visibility logic
  useEffect(() => {
    if (mapRef.current) {
      const years = ["2018", "2019", "2020", "2021", "2022"];

      // Load the selected year's layer if not already loaded
      if (!loadedLayers[selectedYear]) {
        const layerKey = `geotifLayer${selectedYear}` as keyof typeof layerRefs.current;

        if (!layerRefs.current[layerKey]) {
          const newLayer = createDeadwoodGeotiffLayer(selectedYear);
          // Set the opacity to match current satelliteOpacity when creating new layer
          newLayer.setOpacity(satelliteOpacity);
          layerRefs.current[layerKey] = newLayer;
          mapRef.current.addLayer(newLayer);
          setLoadedLayers((prev) => ({ ...prev, [selectedYear]: true }));
        }
      }

      // Update visibility for all layers
      years.forEach((year) => {
        const layerKey = `geotifLayer${year}` as keyof typeof layerRefs.current;
        if (layerRefs.current[layerKey]) {
          layerRefs.current[layerKey]!.setVisible(year === selectedYear);
        }
      });
    }
  }, [selectedYear, loadedLayers, satelliteOpacity]);

  // Add effect to update selection layer style when hover state changes
  useEffect(() => {
    if (mapRef.current && layerRefs.current.selectionLayer) {
      layerRefs.current.selectionLayer.setStyle((feature: FeatureLike) => {
        if (feature === hoveredFeature) {
          return new Style({
            fill: new Fill({
              color: "rgba(129, 176, 247, 0.9)",
            }),
            stroke: new Stroke({
              color: "rgba(129, 176, 247, 1)",
              width: 2,
            }),
          });
        }
        return undefined;
      });
    }
  }, [hoveredFeature]);

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
        <div className="absolute bottom-4 right-4 z-50 ">
          <DeadwoodCardDetails
            year={selectedYear}
            setSelectedYear={setSelectedYear}
            deadwoodOpacity={deadwoodOpacity}
            setDeadwoodOpacity={setDeadwoodOpacity}
            satelliteOpacity={satelliteOpacity}
            setSatelliteOpacity={setSatelliteOpacity}
            forestCoverOpacity={forestCoverOpacity}
            setForestCoverOpacity={setForestCoverOpacity}
            adminLevel1={data.admin_level_1}
            showLegend={setIsLegendVisible}
          />
        </div>
      </div>
    </div>
  );
};

export default DatasetDetailsMap;
