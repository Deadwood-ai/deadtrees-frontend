import { Map, View } from "ol";
import "ol/ol.css";

import TileLayer from "ol/layer/Tile";
import OSM from "ol/source/OSM";
import { useEffect, useRef } from "react";
import { BingMaps } from "ol/source";

const DeadtreesMapOL = () => {
  const mapContainer = useRef();
  useEffect(() => {
    const osmLayer = new TileLayer({
      source: new BingMaps({
        
        ,
    });
    const map = new Map({
      target: mapContainer.current,
      layers: [osmLayer],
      view: new View({
        center: [0, 0],
        zoom: 2,
      }),
    });
    return () => map.setTarget(null);
  }, []);

  return (
    <div className="h-full w-full">
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: "8px",
        }}
        ref={mapContainer}
      ></div>
    </div>
  );
};

export default DeadtreesMapOL;
