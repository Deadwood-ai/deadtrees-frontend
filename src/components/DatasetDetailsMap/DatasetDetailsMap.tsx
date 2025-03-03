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

  // Store layer references for cleanup
  const layerRefs = useRef<{
    basemap?: TileLayer<BingMaps>;
    orthoCog?: TileLayerWebGL;
    vectorAOI?: VectorLayer<any>;
    vectorLabels?: VectorLayer<any>;
    deadwoodVector?: VectorTileLayer;
    forestCoverVector?: VectorTileLayer;
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
        preload: 4,
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
      const forestCoverVectorLayer = createForestCoverVectorLayer();

      // Store references
      layerRefs.current = {
        basemap: basemapLayer,
        orthoCog: orthoCogLayer,
        deadwoodVector: deadwoodVectorLayer,
        forestCoverVector: forestCoverVectorLayer,
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
                layers: [basemapLayer, orthoCogLayer, deadwoodVectorLayer, forestCoverVectorLayer],
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
    if (mapRef.current && layerRefs.current.orthoCog) {
      layerRefs.current.orthoCog.setOpacity(satelliteOpacity);
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

  return (
    <div className="h-full w-full">
      <div
        style={{
          width: "100%",
          height: "100%",
        }}
        ref={mapContainer}
      >
        <div className="absolute left-2 top-6 z-20">
          <MapStyleSwitchButtons mapStyle={mapStyle} setMapStyle={setMapStyle} />
        </div>
        <div className="absolute bottom-6 right-2 z-50 ">
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
