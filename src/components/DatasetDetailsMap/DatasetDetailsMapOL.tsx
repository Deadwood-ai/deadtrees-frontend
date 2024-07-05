import { useEffect, useRef, useState } from "react";
import { BingMaps } from "ol/source";
import TileLayer from "ol/layer/Tile";
import { View, Map } from "ol";
import GeoJSON from "ol/format/GeoJSON";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";

import { IDataset, ILabels } from "../../types/dataset";
import fetchLabels from "./getLabels";

const DatasetDetailsMapOL = ({ data }: { data: IDataset }) => {
  const [map, setMap] = useState(null);
  const mapContainer = useRef();
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

      const newMap = new Map({
        target: mapContainer.current,
        layers: [basemapLayer],
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
        });
        const vectorLayerDeadwood = new VectorLayer({
          source: new VectorSource({
            features: new GeoJSON().readFeatures(labelsData?.standing_deadwood, {
              dataProjection: "EPSG:4326",
              featureProjection: "EPSG:3857",
            }),
          }),
        });
        newMap.addLayer(vectorLayerAOI);
        newMap.addLayer(vectorLayerDeadwood);
        newMap.getView().fit(vectorLayerAOI.getSource().getExtent(), {
          size: newMap.getSize(),
          maxZoom: 18,
        });
      });

      //   newMap.getView().fit([0, 0, 0, 0], newMap.getSize()!);
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
      ></div>
    </div>
  );
};

export default DatasetDetailsMapOL;
