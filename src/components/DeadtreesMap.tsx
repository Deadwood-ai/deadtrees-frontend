import { useEffect, useRef, useState } from "react";
import MapboxGeocoder from "@mapbox/mapbox-gl-geocoder";
import "@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css";
// import mapbox-gl-compare
// import MapboxCompare from "mapbox-gl-compare";
// import { EllipsisRasterLayer } from "mapboxgljs-ellipsis";

import mapboxgl from "mapbox-gl";

import { Slider } from "antd";

const DeadtreesMap = () => {
  const [sliderValue2021, setSliderValue2021] = useState<number>(1);
  const [sliderValue2020, setSliderValue2020] = useState<number>(1);
  const [sliderValue2019, setSliderValue2019] = useState<number>(1);
  const [sliderValue2018, setSliderValue2018] = useState<number>(1);

  const mapContainer = useRef<HTMLDivElement | null>(null);
  // const pathId = "c4feee8c-05df-4d73-9094-7c65d95aaeb3";
  // const token =
  //   "epat_7JMrvKfzqDGPYY6L15ff2Y1ucJVGL9ayVUuX4DffeVwpY2IuxOJmEU1oTq8iJeaA";
  // const timestampID = "be6b89c8-a8d1-44be-9bcf-a9440ae1f6ad";
  // const styleID = "1e4d78d9-e224-4b30-bf01-0ee600c591bd";
  // const layerID = "be6b89c8-a8d1-44be-9bcf-a9440ae1f6ad_1e4d78d9-e224-4b30-bf01-0ee600c591bd";
  // const wmsUrl = `https://api.ellipsis-drive.com/v3/ogc/wms/c4feee8c-05df-4d73-9094-7c65d95aaeb3/epat_34voDOkIxnajNSwzYTgoxSEyJ5FCEv7ESLn07RWLClxasA8nmiSR1MomhmxvSxT4?SERVICE=WMS&VERSION=1.1.1&LAYERS=${layerID}&REQUEST=GetMap&SRS=EPSG:3857&BBOX={bbox-epsg-3857}&FORMAT=image/png&width=256&HEIGHT=256`;
  // const wmsUrl =
  // "https://api.ellipsis-drive.com/v3/path/c4feee8c-05df-4d73-9094-7c65d95aaeb3/raster/timestamp/be6b89c8-a8d1-44be-9bcf-a9440ae1f6ad/tile/{z}/{x}/{y}?style=1e4d78d9%2de224%2d4b30%2dbf01%2d0ee600c591bd&token=epat_X7xe09y2UATpZPNghXh2LC9F4TbwZ97nWjiOKEzEUZIDq5m2CNtwtsdkcfKdD1OW";
  const baseURL =
    "https://data.waldklick.de/geoserver/waldklick/wms?&service=WMS&request=GetMap&format=image/png&version=1.1.1&SRS=EPSG:3857&BBOX={bbox-epsg-3857}&width=256&HEIGHT=256&transparent=true&authkey=eedde8df-05df-48c5-864e-c571ba188f64";
  const wmsURL2021 = `${baseURL}&layers=waldklick:pred_BW_2021_3035`;
  const wmsURL2020 = `${baseURL}&layers=waldklick:pred_BW_2020_3035`;
  const wmsURL2019 = `${baseURL}&layers=waldklick:pred_BW_2019_3035`;
  const wmsURL2018 = `${baseURL}&layers=waldklick:pred_BW_2018_3035`;

  const wmsUrl = useEffect(() => {
    if (mapContainer.current) {
      const map = new mapboxgl.Map({
        container: mapContainer.current,
        style: "mapbox://styles/mapbox/satellite-v9",
        // style: "mapbox://styles/mapbox/streets-v11",
        center: [8.7982700000000008, 48.5131999999999977],
        zoom: 7,
      });

      map.addControl(
        new MapboxGeocoder({
          accessToken: mapboxgl.accessToken,
          mapboxgl: mapboxgl,
        }),
      );

      map.on("load", () => {
        map.addSource("deadtrees_2018", {
          type: "raster",
          tiles: [wmsURL2018],
          tileSize: 256,
        });
        map.addLayer({
          id: "deadtrees_2018_layer",
          type: "raster",
          source: "deadtrees_2018",
          paint: {},
        });
        map.addSource("deadtrees_2019", {
          type: "raster",
          tiles: [wmsURL2019],
          tileSize: 256,
        });
        map.addLayer({
          id: "deadtrees_2019_layer",
          type: "raster",
          source: "deadtrees_2019",
          paint: {},
        });
        map.addSource("deadtrees_2020", {
          type: "raster",
          tiles: [wmsURL2020],
          tileSize: 256,
        });
        map.addLayer({
          id: "deadtrees_2020_layer",
          type: "raster",
          source: "deadtrees_2020",
          paint: {},
        });
        map.addSource("deadtrees_2021", {
          type: "raster",
          tiles: [wmsURL2021],
          tileSize: 256,
        });
        map.addLayer({
          id: "deadtrees_2021_layer",
          type: "raster",
          source: "deadtrees_2021",
          paint: {},
        });
      });

      mapContainer.current.mapInstance = map;
    }
  }, []);

  useEffect(() => {
    const mapInstance = mapContainer.current?.mapInstance;
    if (mapInstance && mapInstance.getLayer("deadtrees_2018_layer")) {
      mapInstance.setPaintProperty(
        "deadtrees_2018_layer",
        "raster-opacity",
        sliderValue2018,
      );
    }
  }, [sliderValue2018]);

  useEffect(() => {
    const mapInstance = mapContainer.current?.mapInstance;
    if (mapInstance && mapInstance.getLayer("deadtrees_2019_layer")) {
      mapInstance.setPaintProperty(
        "deadtrees_2019_layer",
        "raster-opacity",
        sliderValue2019,
      );
    }
  }, [sliderValue2019]);

  useEffect(() => {
    const mapInstance = mapContainer.current?.mapInstance;
    if (mapInstance && mapInstance.getLayer("deadtrees_2020_layer")) {
      mapInstance.setPaintProperty(
        "deadtrees_2020_layer",
        "raster-opacity",
        sliderValue2020,
      );
    }
  }, [sliderValue2020]);

  useEffect(() => {
    const mapInstance = mapContainer.current?.mapInstance;
    if (mapInstance && mapInstance.getLayer("deadtrees_2021_layer")) {
      mapInstance.setPaintProperty(
        "deadtrees_2021_layer",
        "raster-opacity",
        sliderValue2021,
      );
    }
  }, [sliderValue2021]);

  return (
    <div className="h-full w-full">
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: "8px",
        }}
        ref={mapContainer}
      />
      <div className="absolute bottom-24 right-8 w-48 rounded-md bg-white px-3 py-1 shadow-xl">
        <p className="text-gl m-0 pl-1 pt-1 font-semibold ">2021</p>
        <Slider
          defaultValue={0}
          step={0.01}
          max={1}
          value={sliderValue2021}
          onChange={(value) => setSliderValue2021(value as number)}
          min={0}
        />
        <p className="text-gl m-0 pl-1 pt-1 font-semibold ">2020</p>
        <Slider
          defaultValue={0}
          step={0.01}
          max={1}
          value={sliderValue2020}
          onChange={(value) => setSliderValue2020(value as number)}
          min={0}
        />
        <p className="text-gl m-0 pl-1 pt-1 font-semibold ">2019</p>
        <Slider
          defaultValue={0}
          step={0.01}
          max={1}
          value={sliderValue2019}
          onChange={(value) => setSliderValue2019(value as number)}
          min={0}
        />
        <p className="text-gl m-0 pl-1 pt-1 font-semibold ">2018</p>
        <Slider
          defaultValue={0}
          step={0.01}
          max={1}
          value={sliderValue2018}
          onChange={(value) => setSliderValue2018(value as number)}
          min={0}
        />
      </div>
    </div>
  );
};

export default DeadtreesMap;
