import { useEffect, useRef, useState } from "react";
import { Map, View } from "ol";
import { BingMaps } from "ol/source";
import TileLayer from "ol/layer/Tile";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import Feature from "ol/Feature";
import Polygon from "ol/geom/Polygon";
import "ol/ol.css";
import { fromExtent } from "ol/geom/Polygon.js";

import { IDataset } from "../../types/dataset";
import parseBBox from "../../utils/parseBBox";

const DatasetMapOL = ({ data }: { data: IDataset[] }) => {
  const [map, setMap] = useState<Map | null>(null);
  const [mapStyle, setMapStyle] = useState("RoadOnDemand");

  const mapContainer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!map && data.length > 0) {
      const basemapLayer = new TileLayer({
        source: new BingMaps({
          key: import.meta.env.VITE_BING_MAPS_KEY,
          imagerySet: mapStyle,
          culture: "en-us",
        }),
      });

      const newMap = new Map({
        target: mapContainer.current as HTMLElement,
        layers: [basemapLayer],
        view: new View({
          center: [0, 0],
          zoom: 2,
          projection: "EPSG:4326",
        }),
      });

      setMap(newMap);

      // Ensure map reference is set before trying to fit view
      newMap.once("postrender", () => {
        const vectorSource = new VectorSource();
        data.forEach((dataset) => {
          if (dataset.bbox) {
            const feature = new Feature(fromExtent(parseBBox(dataset.bbox)));
            vectorSource.addFeature(feature);
          }
        });

        const vectorLayer = new VectorLayer({
          source: vectorSource,
          dataProjection: "EPSG:4326",
          featureProjection: "EPSG:3857",
        });

        newMap.addLayer(vectorLayer);

        if (vectorSource.getFeatures().length > 0) {
          newMap.getView().fit(vectorSource.getExtent(), {
            size: newMap.getSize(),
            maxZoom: 18,
          });
        }
      });
    }

    return () => {
      if (map) {
        map.setTarget(null);
      }
    };
  }, [map, data, mapStyle]);

  return (
    <div ref={mapContainer} style={{ width: "100%", height: "100%", borderRadius: 8 }}>
      {data.length > 0 ? (
        <div className="absolute left-4 top-4 z-50">
          <div className="flex items-center space-x-2">
            <div className="h-4 w-4 rounded-full bg-blue-500"></div>
            <span className="ml-0">Available</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="h-4 w-4 rounded-full bg-red-600"></div>
            <span className="ml-0">Coming Soon</span>
          </div>
        </div>
      ) : (
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transform">
          <div className="h-32 w-32 animate-spin rounded-full border-b-2 border-t-2 border-gray-900"></div>
        </div>
      )}
    </div>
  );
};

export default DatasetMapOL;
