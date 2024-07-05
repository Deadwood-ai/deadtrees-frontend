import { useEffect, useRef, useState } from "react";
import { BingMaps, TileWMS } from "ol/source";
import TileLayer from "ol/layer/Tile";
import { View, Map, Tile } from "ol";
import GeoJSON from "ol/format/GeoJSON";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import TileLayerWebGL from "ol/layer/WebGLTile.js";

import { IDataset, ILabels } from "../../types/dataset";
import fetchLabels from "./getLabels";
import DeadwoodCardDetails from "./DeadwoodCardDetails";
import Legend from "../DeadwoodMap/Legend";
import createDeadwoodGeotiffLayer from "../DeadwoodMap/createDeadwoodGeotiffLayer";
import MapStyleSwitchButtons from "../DeadwoodMap/MapStyleSwitchButtons";

const yearByIndex = {
  2: "2018",
  3: "2019",
  4: "2020",
  5: "2021",
};

const DatasetDetailsMapOL = ({ data }: { data: IDataset }) => {
  const [map, setMap] = useState(null);
  const mapContainer = useRef();
  const [mapStyle, setMapStyle] = useState("RoadOnDemand");

  const [selectedYear, setSelectedYear] = useState<string>("2018");
  const [sliderValueLabels, setSliderValueLabels] = useState<number>(0.6);
  const [sliderValueSatellite, setSliderValueSatellite] = useState<number>(1);
  const [labelsFetched, setLabelsFetched] = useState<boolean>(false);

  useEffect(() => {
    if (!map && data?.file_name) {
      const basemapLayer = new TileLayer({
        source: new BingMaps({
          key: import.meta.env.VITE_BING_MAPS_KEY,
          imagerySet: mapStyle,
          culture: "en-us",
        }),
      });
      const orthoWmsUrl = new TileLayer({
        source: new TileWMS({
          url: "https://data.deadtrees.earth/mapserver",
          params: {
            LAYERS: data.file_id,
            TILED: true,
            SRS: "EPSG:3857",
            format: "image/png",
            transparent: true,
          },
        }),
      });
      const geotifLayer2018 = createDeadwoodGeotiffLayer("2018");
      const geotifLayer2019 = createDeadwoodGeotiffLayer("2019");
      const geotifLayer2020 = createDeadwoodGeotiffLayer("2020");
      const geotifLayer2021 = createDeadwoodGeotiffLayer("2021");

      const newMap = new Map({
        target: mapContainer.current,
        layers: [basemapLayer, orthoWmsUrl, geotifLayer2018, geotifLayer2019, geotifLayer2020, geotifLayer2021],
        view: new View({
          center: [0, 0],
          zoom: 2,
        }),
        overlays: [],
        controls: [],
      });

      fetchLabels({ file_name: data.file_name }).then((labelsData) => {
        console.log("labelsData", labelsData);
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
        const vectorLayerDeadwood = new VectorLayer({
          source: new VectorSource({
            features: new GeoJSON().readFeatures(labelsData?.standing_deadwood, {
              dataProjection: "EPSG:4326",
              featureProjection: "EPSG:3857",
            }),
          }),
          style: {
            "stroke-color": "red",
            "stroke-width": 1,
            "fill-color": "rgba(255, 0, 0, 0.8)",
          },
        });
        newMap.addLayer(vectorLayerAOI);
        newMap.addLayer(vectorLayerDeadwood);
        newMap.getView().fit(vectorLayerAOI.getSource().getExtent(), {
          size: newMap.getSize(),
          maxZoom: 18,
        });
        setLabelsFetched(true);
      });

      setMap(newMap);
    }
    return () => {
      if (map) {
        map.setTarget(null);
      }
    };
  }, [data]);

  // update label opacity on slider change
  useEffect(() => {
    if (map && labelsFetched) {
      const deadwoodLayer = map.getLayers().getArray()[7];
      deadwoodLayer.setOpacity(sliderValueLabels);
    }
  }, [sliderValueLabels, map]);

  // update satellite layer opacity on slider change
  useEffect(() => {
    if (map) {
      const layers = map.getLayers().getArray();
      layers.forEach((layer, index) => {
        if (layer instanceof TileLayerWebGL) {
          layer.setOpacity(sliderValueSatellite);
        }
      });
    }
  }, [sliderValueSatellite, map]);

  // update visibility of geotiff layers based on selectedYear
  useEffect(() => {
    if (map) {
      const layers = map.getLayers().getArray();
      layers.forEach((layer, index) => {
        if (layer instanceof TileLayerWebGL) {
          layer.setVisible(yearByIndex[index] === selectedYear);
        }
      });
    }
  }, [selectedYear, map]);

  // update on mapStyle change
  useEffect(() => {
    if (map) {
      const layer = map.getLayers().getArray()[0]; // basemap layer
      console.log(layer);
      layer.setSource(
        new BingMaps({
          key: import.meta.env.VITE_BING_MAPS_KEY,
          imagerySet: mapStyle,
          culture: "en-us",
        }),
      );
    }
  }, [mapStyle, map]);

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
        <div className="absolute bottom-6 right-2 z-50 space-y-2">
          <div className="flex justify-end">
            <Legend />
          </div>
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
