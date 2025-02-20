import { useEffect, useRef, useState } from "react";
import { BingMaps } from "ol/source";
import TileLayer from "ol/layer/Tile";
import { View, Map } from "ol";
import TileLayerWebGL from "ol/layer/WebGLTile.js";
import { GeoTIFF } from "ol/source";
import createDeadwoodVectorLayer from "./createDeadwoodVectorLayer";
import MapStyleSwitchButtons from "../DeadwoodMap/MapStyleSwitchButtons";
import DeadwoodCardDetails from "./DeadwoodCardDetails";
import Legend from "../DeadwoodMap/Legend";
import { Settings } from "../../config";
import { IDataset, ILabels } from "../../types/dataset";

const DatasetDetailsMap = ({ data }: { data: IDataset }) => {
  if (!data) return null;

  const mapRef = useRef<Map | null>(null);
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const [mapStyle, setMapStyle] = useState("RoadOnDemand");
  const [selectedYear, setSelectedYear] = useState("2018");
  const [sliderValueLabels, setSliderValueLabels] = useState(0.6);
  const [sliderValueSatellite, setSliderValueSatellite] = useState(1);
  const [labelsFetched, setLabelsFetched] = useState(false);
  const [labels, setLabels] = useState<ILabels | null>(null);
  const [isLegendVisible, setIsLegendVisible] = useState(false);

  // Store layer references for cleanup
  const layerRefs = useRef<{
    basemap?: TileLayer;
    orthoCog?: TileLayerWebGL;
    vectorLabels?: any;
  }>({});

  useEffect(() => {
    if (!mapRef.current && data?.file_name) {
      // Create ortho layer (COG) using GeoTIFF
      const orthoCogLayer = new TileLayerWebGL({
        source: new GeoTIFF({
          sources: [
            {
              url: Settings.COG_BASE_URL + data.cog_path,
              nodata: 0,
              bands: [1, 2, 3],
            },
          ],
          convertToRGB: "auto",
          normalize: true,
        }),
        maxZoom: 22,
        cacheSize: 8192,
        preload: 8,
      });

      // Create basemap layer using BingMaps
      const basemapLayer = new TileLayer({
        source: new BingMaps({
          key: import.meta.env.VITE_BING_MAPS_KEY,
          imagerySet: mapStyle,
          culture: "en-us",
        }),
      });

      // Once the ortho layer's source is ready, create the map view
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

          const newMap = new Map({
            target: mapContainer.current,
            layers: [basemapLayer, orthoCogLayer],
            view: MapView,
            overlays: [],
            controls: [],
          });

          // Create vector tile layer for labels (using 256-pixel tiles)
          const vectorTileLayer = createDeadwoodVectorLayer();
          newMap.addLayer(vectorTileLayer);

          // Save layer references for later cleanup
          layerRefs.current = {
            basemap: basemapLayer,
            orthoCog: orthoCogLayer,
            vectorLabels: vectorTileLayer,
          };

          MapView.fit(viewOptions.extent);
          mapRef.current = newMap;
        })
        .catch((error) => {
          console.error("Error initializing map:", error);
        });
    }

    // Cleanup on component unmount
    return () => {
      if (mapRef.current) {
        if (layerRefs.current.vectorLabels) {
          mapRef.current.removeLayer(layerRefs.current.vectorLabels);
          const source = layerRefs.current.vectorLabels.getSource();
          if (source) {
            source.clear();
            source.dispose();
          }
          layerRefs.current.vectorLabels.changed();
          layerRefs.current.vectorLabels.dispose();
          layerRefs.current.vectorLabels = undefined;
        }
        Object.keys(layerRefs.current).forEach((key) => {
          layerRefs.current[key] = undefined;
        });
        mapRef.current.setTarget(undefined);
        mapRef.current.dispose();
        mapRef.current = null;
      }
      setLabelsFetched(false);
    };
  }, [data, mapStyle]);

  // (Additional useEffects for slider updates omitted for brevity)

  const legendPosition = labels !== null ? "bottom-60" : "bottom-52";
  return (
    <div className="h-full w-full">
      <div style={{ width: "100%", height: "100%" }} ref={mapContainer}>
        <div className="absolute left-2 top-6 z-20">
          <MapStyleSwitchButtons mapStyle={mapStyle} setMapStyle={setMapStyle} />
        </div>
        {isLegendVisible && data.admin_level_1 === "Germany" && (
          <div className={`absolute ${legendPosition} right-2 z-50`}>
            <Legend />
          </div>
        )}
        <div className="absolute bottom-6 right-2 z-50">
          <DeadwoodCardDetails
            labels={labels}
            year={selectedYear}
            setSelectedYear={setSelectedYear}
            sliderValueLabels={sliderValueLabels}
            setSliderValueLabels={setSliderValueLabels}
            sliderValueYear={sliderValueSatellite}
            setSliderValueYear={setSliderValueSatellite}
            adminLevel1={data.admin_level_1}
            showLegend={setIsLegendVisible}
          />
        </div>
      </div>
    </div>
  );
};

export default DatasetDetailsMap;
