import { useEffect, useRef, useState } from "react";
import MapboxGeocoder from "@mapbox/mapbox-gl-geocoder";
import "@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css";

// import mapbox-gl-compare
// import MapboxCompare from "mapbox-gl-compare";
// import { EllipsisRasterLayer } from "mapboxgljs-ellipsis";

import mapboxgl from "mapbox-gl";

import { Radio, Slider } from "antd";
import addDeadwoodWMSLayers from "./addDeadwoodWMStoMap";

const DeadtreesMap = () => {
  const [sliderValue, setSliderValue] = useState<number>(1);
  const [selectedYear, setSelectedYear] = useState<string>("2018");
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const [mapStyle, setMapStyle] = useState<string>("satellite");

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
        center: [8.7982700000000008, 48.5131999999999977],
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

      map.on("load", () => {
        addDeadwoodWMSLayers(map);
      });
      map.on("style.load", () => {
        addDeadwoodWMSLayers(map);
      });
      mapContainer.current.mapInstance = map;
    }
  }, []);

  useEffect(() => {
    console.log(selectedYear, "running effect");
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
      mapInstance.setStyle(`mapbox://styles/mapbox/${mapStyle}-v9`);
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
        <div className="absolute left-2 top-2 z-20">
          <Radio.Group
            value={mapStyle}
            onChange={(e) => setMapStyle(e.target.value)}
          >
            <Radio.Button value="satellite">Satellite</Radio.Button>
            <Radio.Button value="streets">Streets</Radio.Button>
          </Radio.Group>
        </div>
        <div className="absolute bottom-8 right-2 z-20 flex max-w-72 flex-col justify-center rounded-md bg-white px-3 py-1 shadow-xl">
          <p className="m-0 py-2 text-lg text-gray-800">
            {" "}
            Dead Trees for the year {selectedYear}
          </p>
          <p className="text-md m-0 text-gray-600">Layer Opacity</p>
          <Slider
            defaultValue={1}
            step={0.01}
            max={1}
            value={sliderValue}
            onChange={(value) => setSliderValue(value as number)}
            min={0}
          />
          <p className="text-md m-0 pb-2 text-gray-600">Year</p>

          <Radio.Group
            className="pb-2"
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
          >
            <Radio.Button value="2018">2018</Radio.Button>
            <Radio.Button value="2019">2019</Radio.Button>
            <Radio.Button value="2020">2020</Radio.Button>
            <Radio.Button value="2021">2021</Radio.Button>
          </Radio.Group>
        </div>
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
