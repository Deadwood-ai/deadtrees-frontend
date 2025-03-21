import { useEffect, useRef, useState } from "react";
import { BingMaps } from "ol/source";
import TileLayer from "ol/layer/Tile";
import { View, Map } from "ol";
import VectorLayer from "ol/layer/Vector";
import TileLayerWebGL from "ol/layer/WebGLTile.js";
import { GeoTIFF } from "ol/source";
import VectorTileLayer from "ol/layer/VectorTile";

import { IDataset } from "../../types/dataset";
import DeadwoodCardDetails from "./DeadwoodCardDetails";
import MapStyleSwitchButtons from "../DeadwoodMap/MapStyleSwitchButtons";
import { Settings } from "../../config";
import { createDeadwoodVectorLayer, createForestCoverVectorLayer } from "./createVectorLayer";
import createDeadwoodGeotiffLayer from "../DeadwoodMap/createDeadwoodGeotiffLayer";

const DatasetDetailsMap = ({ data }: { data: IDataset }) => {
  // Move hooks before any conditional returns to fix the React Hook errors
  const mapRef = useRef<Map | null>(null);
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const [mapStyle, setMapStyle] = useState("RoadOnDemand");
  const [selectedYear, setSelectedYear] = useState<string>("2018");
  const [deadwoodOpacity, setDeadwoodOpacity] = useState<number>(1);
  const [satelliteOpacity, setSatelliteOpacity] = useState<number>(1);
  const [forestCoverOpacity, setForestCoverOpacity] = useState<number>(1);
  const [isLegendVisible, setIsLegendVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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
  }>({});

  if (!data) return null;

  useEffect(() => {
    if (!mapRef.current && data?.file_name) {
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

      const deadwoodVectorLayer = createDeadwoodVectorLayer();
      // const forestCoverVectorLayer = createForestCoverVectorLayer();

      const geotifLayer2018 = createDeadwoodGeotiffLayer("2018");
      const geotifLayer2019 = createDeadwoodGeotiffLayer("2019");
      const geotifLayer2020 = createDeadwoodGeotiffLayer("2020");
      const geotifLayer2021 = createDeadwoodGeotiffLayer("2021");
      const geotifLayer2022 = createDeadwoodGeotiffLayer("2022");

      // Store references
      layerRefs.current = {
        basemap: basemapLayer,
        orthoCog: orthoCogLayer,
        deadwoodVector: deadwoodVectorLayer,
        // forestCoverVector: forestCoverVectorLayer,
        geotifLayer2018: geotifLayer2018,
        geotifLayer2019: geotifLayer2019,
        geotifLayer2020: geotifLayer2020,
        geotifLayer2021: geotifLayer2021,
        geotifLayer2022: geotifLayer2022,
      };

      // Wait for the source to be ready and create map
      if (orthoCogLayer.getSource()) {
        orthoCogLayer
          .getSource()
          .getView()
          .then((viewOptions) => {
            if (!viewOptions?.extent) {
              console.error("No extent found in viewOptions");
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
                layers: [
                  basemapLayer,
                  orthoCogLayer,
                  deadwoodVectorLayer,
                  // forestCoverVectorLayer,
                  geotifLayer2018,
                  geotifLayer2019,
                  geotifLayer2020,
                  geotifLayer2021,
                  geotifLayer2022,
                ],
                view: MapView,
                overlays: [],
                controls: [],
              });

              MapView.fit(viewOptions.extent);
              mapRef.current = newMap;
            }
          })
          .catch((error) => {
            console.error("Error initializing map:", error);
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
  }, [data, mapStyle]);

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

  // update deadwood geotiff layer visibility based on selected year
  useEffect(() => {
    if (mapRef.current) {
      // Hide all geotiff layers first
      const years = ["2018", "2019", "2020", "2021", "2022"];
      years.forEach((year) => {
        const layerKey = `geotifLayer${year}` as keyof typeof layerRefs.current;
        if (layerRefs.current[layerKey]) {
          layerRefs.current[layerKey]!.setVisible(year === selectedYear);
        }
      });
    }
  }, [selectedYear]);

  // useEffect(() => {
  //   if (mapRef.current && layerRefs.current.deadwoodVector) {
  //     const source = layerRefs.current.deadwoodVector.getSource();

  //     const loadStartHandler = () => setIsLoading(true);
  //     const loadEndHandler = () => setIsLoading(false);

  //     source.on("tileloadstart", loadStartHandler);
  //     source.on("tileloadend", loadEndHandler);
  //     source.on("tileloaderror", loadEndHandler);

  //     return () => {
  //       source.un("tileloadstart", loadStartHandler);
  //       source.un("tileloadend", loadEndHandler);
  //       source.un("tileloaderror", loadEndHandler);
  //     };
  //   }
  // }, []);

  // useEffect(() => {
  //   if (mapRef.current) {
  //     // Track rendering performance
  //     mapRef.current.on("prerender", () => {
  //       console.log("[Map] prerender", new Date().toISOString());
  //     });

  //     mapRef.current.on("postrender", () => {
  //       console.log("[Map] postrender", new Date().toISOString());
  //     });

  //     // Track interactions
  //     mapRef.current.on("movestart", () => console.log("[Map] movestart"));
  //     mapRef.current.on("moveend", () => console.log("[Map] moveend"));

  //     // Track WebGL context
  //     const checkWebGLContext = () => {
  //       const target = mapRef.current?.getTargetElement();
  //       if (!target) return;

  //       const canvases = target.querySelectorAll("canvas");
  //       canvases.forEach((canvas, i) => {
  //         const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
  //         if (gl) {
  //           const isLost = gl.isContextLost?.() || false;
  //           console.log(`[WebGL] Canvas ${i}: context ${isLost ? "LOST" : "ok"}`);
  //         }
  //       });
  //     };

  //     // Check WebGL context periodically
  //     const intervalId = setInterval(checkWebGLContext, 5000);

  //     return () => {
  //       clearInterval(intervalId);
  //       mapRef.current?.un("prerender");
  //       mapRef.current?.un("postrender");
  //       mapRef.current?.un("movestart");
  //       mapRef.current?.un("moveend");
  //     };
  //   }
  // }, [mapRef.current]);

  // useEffect(() => {
  //   if (!mapRef.current || !layerRefs.current.deadwoodVector) return;

  //   const source = layerRefs.current.deadwoodVector.getSource();

  //   // Monitor tile loading events
  //   const tileLoadStart = (evt) => {
  //     console.log("[Source] tileloadstart", evt.tile.tileCoord.join("/"));
  //   };

  //   const tileLoadEnd = (evt) => {
  //     console.log("[Source] tileloadend", evt.tile.tileCoord.join("/"));
  //   };

  //   const tileLoadError = (evt) => {
  //     console.log("[Source] tileloaderror", evt.tile.tileCoord.join("/"));
  //   };

  //   source.on("tileloadstart", tileLoadStart);
  //   source.on("tileloadend", tileLoadEnd);
  //   source.on("tileloaderror", tileLoadError);

  //   // Log source state periodically
  //   const logSourceState = () => {
  //     const tileCache = source.tileCache;
  //     if (tileCache) {
  //       console.log(`[Source] Cache stats: size=${tileCache.getCount()}, max=${tileCache.highWaterMark}`);
  //     }
  //   };

  //   const stateIntervalId = setInterval(logSourceState, 5000);

  //   return () => {
  //     clearInterval(stateIntervalId);
  //     source.un("tileloadstart", tileLoadStart);
  //     source.un("tileloadend", tileLoadEnd);
  //     source.un("tileloaderror", tileLoadError);
  //   };
  // }, [layerRefs.current.deadwoodVector]);

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
