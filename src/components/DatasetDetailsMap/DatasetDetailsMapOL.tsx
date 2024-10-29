import { useEffect, useRef, useState } from "react";
import { BingMaps } from "ol/source";
import TileLayer from "ol/layer/Tile";
import { View, Map } from "ol";
import GeoJSON from "ol/format/GeoJSON";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import TileLayerWebGL from "ol/layer/WebGLTile.js";
import { GeoTIFF } from "ol/source";

import { IDataset, ILabels } from "../../types/dataset";
import fetchLabels from "./fetchLabels";
import DeadwoodCardDetails from "./DeadwoodCardDetails";
import Legend from "../DeadwoodMap/Legend";
import createDeadwoodGeotiffLayer from "../DeadwoodMap/createDeadwoodGeotiffLayer";
import MapStyleSwitchButtons from "../DeadwoodMap/MapStyleSwitchButtons";
import { Settings } from "../../config";

const DatasetDetailsMapOL = ({ data }: { data: IDataset }) => {
  const mapRef = useRef<Map | null>(null);
  const mapContainer = useRef();
  const [mapStyle, setMapStyle] = useState("RoadOnDemand");

  const [selectedYear, setSelectedYear] = useState<string>("2018");
  const [sliderValueLabels, setSliderValueLabels] = useState<number>(0.6);
  const [sliderValueSatellite, setSliderValueSatellite] = useState<number>(1);
  const [labelsFetched, setLabelsFetched] = useState<boolean>(false);

  // Store layer references for cleanup
  const layerRefs = useRef<{
    basemap?: TileLayer;
    orthoCog?: TileLayerWebGL;
    geotiff2018?: TileLayerWebGL;
    geotiff2019?: TileLayerWebGL;
    geotiff2020?: TileLayerWebGL;
    geotiff2021?: TileLayerWebGL;
    vectorAOI?: VectorLayer;
    vectorLabels?: VectorLayer;
  }>({});

  useEffect(() => {
    if (!mapRef.current && data?.file_name) {
      // Create base map layer
      const basemapLayer = new TileLayer({
        source: new BingMaps({
          key: import.meta.env.VITE_BING_MAPS_KEY,
          imagerySet: mapStyle,
          culture: "en-us",
        }),
      });
      layerRefs.current.basemap = basemapLayer;

      // Create ortho layer
      const orthoCogLayer = new TileLayerWebGL({
        source: new GeoTIFF({
          sources: [
            {
              url: Settings.COG_BASE_URL + data.cog_url,
              nodata: 0,
            },
          ],
          convertToRGB: true,
        }),
        maxZoom: 20,
        cacheSize: 4096,
        preload: 4,
      });
      layerRefs.current.orthoCog = orthoCogLayer;

      // Create geotiff layers
      const geotifLayer2018 = createDeadwoodGeotiffLayer("2018");
      const geotifLayer2019 = createDeadwoodGeotiffLayer("2019");
      const geotifLayer2020 = createDeadwoodGeotiffLayer("2020");
      const geotifLayer2021 = createDeadwoodGeotiffLayer("2021");

      layerRefs.current.geotiff2018 = geotifLayer2018;
      layerRefs.current.geotiff2019 = geotifLayer2019;
      layerRefs.current.geotiff2020 = geotifLayer2020;
      layerRefs.current.geotiff2021 = geotifLayer2021;

      const newMap = new Map({
        target: mapContainer.current,
        layers: [basemapLayer],
        view: new View({
          center: [0, 0],
          zoom: 2,
          projection: "EPSG:3857",
        }),
        overlays: [],
        controls: [],
      });

      // Add layers to map
      newMap.addLayer(orthoCogLayer);
      newMap.addLayer(geotifLayer2018);
      newMap.addLayer(geotifLayer2019);
      newMap.addLayer(geotifLayer2020);
      newMap.addLayer(geotifLayer2021);
      newMap.setView(orthoCogLayer.getSource().getView());

      // Fetch and add labels
      fetchLabels({ dataset_id: data.dataset_id }).then((labelsData) => {
        if (labelsData && mapRef.current) {
          const vectorLayerAOI = new VectorLayer({
            source: new VectorSource({
              features: new GeoJSON().readFeatures(labelsData?.aoi, {
                dataProjection: "EPSG:4326",
                featureProjection: "EPSG:3857",
              }),
            }),
            style: {
              "stroke-color": "blue",
              "stroke-width": 1,
              "fill-color": "rgba(0, 0, 255, 0)",
            },
          });
          layerRefs.current.vectorAOI = vectorLayerAOI;

          const vectorLayerLabels = new VectorLayer({
            source: new VectorSource({
              features: new GeoJSON().readFeatures(labelsData?.label, {
                dataProjection: "EPSG:4326",
                featureProjection: "EPSG:3857",
              }),
            }),
            className: "labels",
            style: {
              "stroke-color": "red",
              "stroke-width": 1,
              "fill-color": "rgba(255, 0, 0, 0.8)",
            },
          });
          layerRefs.current.vectorLabels = vectorLayerLabels;

          newMap.addLayer(vectorLayerAOI);
          newMap.addLayer(vectorLayerLabels);
          setLabelsFetched(true);
        }
      });

      mapRef.current = newMap;
    }

    // Cleanup function
    return () => {
      if (mapRef.current) {
        // Clean up layers
        Object.values(layerRefs.current).forEach(layer => {
          if (layer) {
            // Remove from map
            mapRef.current?.removeLayer(layer);

            // Clean up source
            const source = layer.getSource();
            if (source) {
              if ('clear' in source) {
                source.clear();
              }
              if ('dispose' in source) {
                source.dispose();
              }
            }

            // Clean up layer
            if ('cleanup' in layer) {
              layer.cleanup();
            } else {
              layer.dispose();
            }
          }
        });

        // Clear layer references
        layerRefs.current = {};

        // Clean up map
        mapRef.current.setTarget(undefined);
        mapRef.current.dispose();
        mapRef.current = null;
        console.log("map disposed");
      }
      setLabelsFetched(false);
    };
  }, [data]);

  // update label opacity on slider change
  useEffect(() => {
    if (mapRef.current && labelsFetched) {
      // const deadwoodLayer = map.getLayers().getArray()[7];
      // get layers with className_ === "labels"
      const labelsLayer = mapRef.current
        .getLayers()
        .getArray()
        .filter((layer) => layer.className_ === "labels")[0];
      labelsLayer.setOpacity(sliderValueLabels);
    }
  }, [sliderValueLabels]);

  // update satellite layer opacity on slider change
  useEffect(() => {
    if (mapRef.current) {
      const layers = mapRef.current.getLayers().getArray();
      layers.forEach((layer, index) => {
        // if has geotif in name
        // console.log("layer", layer.className_);
        if (layer.className_?.includes("geotiff")) {
          // if (layer instanceof TileLayerWebGL) {
          layer.setOpacity(sliderValueSatellite);
        }
      });
    }
  }, [sliderValueSatellite]);

  // update visibility of geotiff layers based on selectedYear
  useEffect(() => {
    if (mapRef.current) {
      const layers = mapRef.current.getLayers().getArray();
      layers.forEach((layer, index) => {
        // if (layer instanceof TileLayerWebGL) {
        if (layer.className_?.includes("geotiff")) {
          layer.setVisible(layer.className_?.includes(selectedYear.toString()));
        }
      });
    }
  }, [selectedYear]);

  // update on mapStyle change
  useEffect(() => {
    if (mapRef.current) {
      const layer = mapRef.current.getLayers().getArray()[0]; // basemap layer
      // console.log(layer);
      layer.setSource(
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
        {" "}
        <div className="absolute left-2 top-6 z-20">
          <MapStyleSwitchButtons mapStyle={mapStyle} setMapStyle={setMapStyle} />
        </div>
        <div className="absolute bottom-52 right-2 z-50">
          <Legend />
        </div>
        <div className="absolute bottom-6 right-2 z-50 ">
          <DeadwoodCardDetails
            year={selectedYear}
            setSelectedYear={setSelectedYear}
            sliderValueLabels={sliderValueLabels}
            setSliderValueLabels={setSliderValueLabels}
            sliderValueYear={sliderValueSatellite}
            setSliderValueYear={setSliderValueSatellite}
          />
        </div>
      </div>
    </div>
  );
};

export default DatasetDetailsMapOL;
