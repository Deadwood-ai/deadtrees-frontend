import { useEffect, useRef, useState } from "react";
import { BingMaps, TileWMS } from "ol/source";
import TileLayer from "ol/layer/Tile";
import { View, Map, Tile } from "ol";
import GeoJSON from "ol/format/GeoJSON";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";

import { IDataset, ILabels } from "../../types/dataset";
import fetchLabels from "./getLabels";
import DeadwoodCardDetails from "./DeadwoodCardDetails";
import Legend from "../DeadwoodMap/Legend";

const DatasetDetailsMapOL = ({ data }: { data: IDataset }) => {
  const [map, setMap] = useState(null);
  const mapContainer = useRef();
  const [selectedYear, setSelectedYear] = useState<string>("2018");
  const [sliderValueLabels, setSliderValueLabels] = useState<number>(0.6);
  const [sliderValueYear, setSliderValueYear] = useState<number>(1);
  //   const [labels, setLabels] = useState<ILabels | null>(null); // Add state for labels

  useEffect(() => {
    if (!map && data?.file_name) {
      const basemapLayer = new TileLayer({
        source: new BingMaps({
          key: import.meta.env.VITE_BING_MAPS_KEY,
          imagerySet: "RoadOnDemand",
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

      const newMap = new Map({
        target: mapContainer.current,
        layers: [basemapLayer, orthoWmsUrl],
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
      });

      setMap(newMap);
    }
    return () => {
      if (map) {
        map.setTarget(null);
      }
    };
  }, [data]);

  return (
    <div className="h-full w-full">
      <div
        style={{
          width: "100%",
          height: "100%",
        }}
        ref={mapContainer}
      >
        <div className="absolute bottom-6 right-2 z-50 space-y-2">
          <div className="flex justify-end">
            <Legend />
          </div>
          <DeadwoodCardDetails
            year={selectedYear}
            setSelectedYear={setSelectedYear}
            sliderValueLabels={sliderValueLabels}
            setSliderValueLabels={setSliderValueLabels}
            sliderValueYear={sliderValueYear}
            setSliderValueYear={setSliderValueYear}
          />
        </div>
      </div>
    </div>
  );
};

export default DatasetDetailsMapOL;
