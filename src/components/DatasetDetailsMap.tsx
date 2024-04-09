import React, { useRef, useEffect, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Dataset, Labels } from "../types/dataset";
import parseBBox from "../utils/parseBBox"; // Make sure this utility function is correctly implemented
import { FeatureCollection } from "geojson";
import { supabase } from "./useSupabase";
import { Radio, Slider } from "antd";
import addDeadwoodWMSLayers from "./addDeadwoodWMSToMap";

const DatasetDetailsMap = ({ data }: { data: Dataset }) => {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const [labels, setLabels] = useState<Labels | null>(null); // Add state for labels
  const [sliderValue, setSliderValue] = useState<number>(1);
  const [sliderValueLabels, setSliderValueLabels] = useState<number>(0.6);
  const [selectedYear, setSelectedYear] = useState<string>("2018");

  const mapLayerList = [
    "deadtrees_2018_layer",
    "deadtrees_2019_layer",
    "deadtrees_2020_layer",
    "deadtrees_2021_layer",
  ];

  const fetchLabels = async (file_name: string) => {
    console.log("file_name", file_name);
    const { data, error } = await supabase
      .from("labels_dev_egu")
      .select("id, aoi, standing_deadwood, ortho_file_name")
      .eq("ortho_file_name", file_name);

    if (error) {
      console.error("Error fetching data:", error);
    } else {
      setLabels(data[0]);
      console.log("Data fetched:", data);
    }
  };
  useEffect(() => {
    if (data?.file_name) {
      fetchLabels(data.file_name);
    }
  }, [data]);

  useEffect(() => {
    if (mapContainer.current && labels) {
      // Ensure the container and data are available
      // console.log("data", data);
      const bounds = parseBBox(data.bbox!); // Parse the bounding box
      const params = {
        LAYERS: data.file_id,
        REQUEST: "GetMap",
        SERVICE: "WMS",
        VERSION: "1.1.1",
        WIDTH: 256,
        HEIGHT: 256,
        SRS: "EPSG:3857",
        FORMAT: "image/png",
        transparent: true,
      };

      const baseURL = "https://data.deadtrees.earth/mapserver/"; // Base URL
      const sourceURL = `${baseURL}?${new URLSearchParams(params)}`; // Construct the source URL
      const wmsSourceUrl = `${sourceURL}&BBOX={bbox-epsg-3857}`; // Adding the bounding box manually
      // const wmsSource =
      // "https://data.deadtrees.earth/mapserver/?SERVICE=WMS&VERSION=1.1.1&LAYERS=" +
      // data.file_id +
      // "&REQUEST=GetMap&SRS=EPSG:3857&BBOX={bbox-epsg-3857}&FORMAT=image/png&width=256&HEIGHT=256";
      const map = new mapboxgl.Map({
        container: mapContainer.current,
        style: "mapbox://styles/mapbox/streets-v11",
        center: bounds[0],
        zoom: 14,
      });

      map.on("load", () => {
        map.fitBounds(bounds, {
          padding: { top: 50, bottom: 50, left: 50, right: 50 },
        });
        addDeadwoodWMSLayers(map);

        map.addSource("wms-orthos-source", {
          type: "raster",
          tiles: [wmsSourceUrl],
          tileSize: 256,
        });

        map.addLayer(
          {
            id: "wms-orthos-layer",
            type: "raster",
            source: "wms-orthos-source",
          },
          "building",
        ); // Place layer under labels, roads, and buildings.
        map.addLayer({
          id: "aoi",
          type: "line",
          source: {
            type: "geojson",
            data: labels?.aoi as FeatureCollection,
          },
          paint: {
            "line-color": "#00f",
            "line-width": 2,
          },
        });
        map.addLayer({
          id: "standing_deadwood",
          type: "fill",
          source: {
            type: "geojson",
            data: labels?.standing_deadwood as FeatureCollection,
          },
          paint: {
            "fill-color": "#f00",
            "fill-opacity": 0.6,
          },
        });
      });

      mapContainer.current.mapInstance = map;
      return () => {
        console.log("cleaning up");
        map.remove(); // This properly cleans up the map instance
      };
    }
  }, [data, labels]); // Dnd on `data` to re-initialize the map when it changes

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

  useEffect(() => {
    const mapInstance = mapContainer.current?.mapInstance;
    if (mapInstance && mapInstance.getLayer("standing_deadwood")) {
      mapInstance.setPaintProperty(
        "standing_deadwood",
        "fill-opacity",
        sliderValueLabels,
      );
    }
  }, [sliderValueLabels]);

  return (
    <div
      style={{ width: "100%", height: "100%", borderRadius: 8 }} // Ensure the div has a specified height
      ref={mapContainer}
    >
      <div className="absolute bottom-8 right-2 z-20 flex max-w-72 flex-col justify-center rounded-md bg-white px-3 py-1 shadow-xl">
        <p className="m-0 py-2 text-base text-gray-800">
          {" "}
          Deadwood prediction for {selectedYear}
        </p>
        <p className="text-md m-0 text-gray-600">Label opacity</p>
        <Slider
          defaultValue={0.6}
          step={0.01}
          max={1}
          value={sliderValueLabels}
          onChange={(value) => setSliderValueLabels(value as number)}
          min={0}
        />
        <p className="text-md m-0 text-gray-600">Prediction Opacity</p>
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
  );
};

export default DatasetDetailsMap;
