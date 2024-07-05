import { useEffect, useRef, useState } from "react";
import MapboxGeocoder from "@mapbox/mapbox-gl-geocoder";
import "@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css";

// import mapbox-gl-compare
// import MapboxCompare from "mapbox-gl-compare";
// import { EllipsisRasterLayer } from "mapboxgljs-ellipsis";

import mapboxgl from "mapbox-gl";

import { Radio, Slider } from "antd";
import addDeadwoodWMSLayers from "../archive/addDeadwoodWMSToMap";

const DeadtreesMap = () => {
  const [sliderValue, setSliderValue] = useState<number>(1);
  const [selectedYear, setSelectedYear] = useState<string>("2018");
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const [mapStyle, setMapStyle] = useState<string>("satellite");
  const [selectedSite, setSelectedSite] = useState<string>("Harz");

  const sites = {
    Waldshut: [8.174864507120049, 47.682517904265666],
    Harz: [10.668224826784524, 51.78688853393797],
    Bayern: [13.330993298074588, 49.03963187270776],
  };

  const mapLayerList = [
    "deadtrees_2018_layer",
    "deadtrees_2019_layer",
    "deadtrees_2020_layer",
    "deadtrees_2021_layer",
  ];

  const wmsUrl = useEffect(() => {
    if (mapContainer.current) {
      const map = new mapboxgl.Map({
        container: mapContainer.current,
        style: "mapbox://styles/mapbox/satellite-v9",
        center: sites[selectedSite],
        zoom: 7,
      });

      map.addControl(
        new MapboxGeocoder({
          accessToken: mapboxgl.accessToken,
          mapboxgl: mapboxgl,
          style: {
            backgroundColor: "white",
            color: "black",
          },
        }),
      );
      map.on("click", (e) => {
        console.log(e.lngLat);
      });

      map.on("load", () => {
        addDeadwoodWMSLayers(map);
      });
      map.on("style.load", () => {
        addDeadwoodWMSLayers(map);
      });
      mapContainer.current.mapInstance = map;
      return () => {
        // Cleanup function
        if (map) {
          map.remove(); // This removes the map instance and all associated resources
        }
      };
    }
  }, []);

  useEffect(() => {
    // console.log(selectedYear, "running effect");
    const mapInstance = mapContainer.current?.mapInstance;
    mapLayerList.forEach((layer) => {
      if (mapInstance && mapInstance.getLayer(layer)) {
        mapInstance.setLayoutProperty(
          layer,
          "visibility",
          selectedYear === layer.split("_")[1] ? "visible" : "none",
        );
      }
    });
  }, [selectedYear, mapLayerList]);

  useEffect(() => {
    const mapInstance = mapContainer.current?.mapInstance;
    if (mapInstance) {
      mapInstance.flyTo({
        center: sites[selectedSite],
        zoom: 14,
      });
    }
  }, [selectedSite]);

  useEffect(() => {
    const mapInstance = mapContainer.current?.mapInstance;
    if (mapInstance) {
      if (mapStyle === "satellite") {
        mapInstance.setStyle("mapbox://styles/mapbox/satellite-streets-v12");
      } else {
        mapInstance.setStyle("mapbox://styles/mapbox/streets-v12");
      }
    }
  }, [mapStyle]);

  useEffect(() => {
    const selectedLayer = `deadtrees_${selectedYear}_layer`;
    const mapInstance = mapContainer.current?.mapInstance;
    if (mapInstance && mapInstance.getLayer(selectedLayer)) {
      mapInstance.setPaintProperty(
        selectedLayer,
        "raster-opacity",
        sliderValue,
      );
    }
  }, [sliderValue, selectedYear, mapLayerList]);

  return (
    <div className="h-full w-full">
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: "8px",
        }}
        ref={mapContainer}
      >
        <div className="absolute bottom-56 right-2 z-50 flex flex-col items-end space-x-2 rounded-md bg-slate-100 p-4">
          <p className="m-0 max-w-24 pb-2 text-right text-xs text-gray-500">
            Share of standing deadwood (%)
          </p>
          <div className="flex h-32 space-x-2">
            <div className="flex flex-col items-end justify-between">
              <p className="m-0 text-xs text-gray-600">100% - </p>
              <p className="m-0 text-xs text-gray-600">50% - </p>
              <p className="m-0 text-xs text-gray-600">0% - </p>
            </div>
            <div className="mb-1 mt-1  w-4 rounded-sm bg-gradient-to-b from-sky-500"></div>
          </div>
        </div>

        <div className="absolute left-2 top-2 z-20">
          <Radio.Group
            value={mapStyle}
            onChange={(e) => setMapStyle(e.target.value)}
          >
            <Radio.Button value="satellite">Satellite</Radio.Button>
            <Radio.Button value="streets">Streets</Radio.Button>
          </Radio.Group>
        </div>
        <div className="absolute bottom-2 left-2 z-20">
          <Radio.Group
            value={selectedSite}
            defaultValue={"Harz"}
            onChange={(e) => setSelectedSite(e.target.value)}
          >
            <Radio.Button value="Harz">Harz National Park</Radio.Button>
            <Radio.Button value="Waldshut">Waldshut</Radio.Button>
            <Radio.Button value="Bayern">Bavarian Forest</Radio.Button>
          </Radio.Group>
        </div>
        <
      </div>
    </div>
  );
};

export default DeadtreesMap;

// const pathId = "c4feee8c-05df-4d73-9094-7c65d95aaeb3";
// const token =
//   "epat_7JMrvKfzqDGPYY6L15ff2Y1ucJVGL9ayVUuX4DffeVwpY2IuxOJmEU1oTq8iJeaA";
// const timestampID = "be6b89c8-a8d1-44be-9bcf-a9440ae1f6ad";
// const styleID = "1e4d78d9-e224-4b30-bf01-0ee600c591bd";
// const layerID = "be6b89c8-a8d1-44be-9bcf-a9440ae1f6ad_1e4d78d9-e224-4b30-bf01-0ee600c591bd";
// const wmsUrl = `https://api.ellipsis-drive.com/v3/ogc/wms/c4feee8c-05df-4d73-9094-7c65d95aaeb3/epat_34voDOkIxnajNSwzYTgoxSEyJ5FCEv7ESLn07RWLClxasA8nmiSR1MomhmxvSxT4?SERVICE=WMS&VERSION=1.1.1&LAYERS=${layerID}&REQUEST=GetMap&SRS=EPSG:3857&BBOX={bbox-epsg-3857}&FORMAT=image/png&width=256&HEIGHT=256`;
// const wmsUrl =
// "https://api.ellipsis-drive.com/v3/path/c4feee8c-05df-4d73-9094-7c65d95aaeb3/raster/timestamp/be6b89c8-a8d1-44be-9bcf-a9440ae1f6ad/tile/{z}/{x}/{y}?style=1e4d78d9%2de224%2d4b30%2dbf01%2d0ee600c591bd&token=epat_X7xe09y2UATpZPNghXh2LC9F4TbwZ97nWjiOKEzEUZIDq5m2CNtwtsdkcfKdD1OW";
