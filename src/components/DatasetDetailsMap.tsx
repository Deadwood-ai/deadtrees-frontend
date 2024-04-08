import React, { useRef, useEffect, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Dataset } from "../types/dataset";
import parseBBox from "../utils/parseBBox"; // Make sure this utility function is correctly implemented
import { FeatureCollection } from "geojson";
import { supabase } from "./useSupabase";

const DatasetDetailsMap = ({ data }: { data: Dataset }) => {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const [aoi, setAoi] = useState<FeatureCollection>([]); // Add state for labels
  const [standingDeadwood, setStandingDeadwood] = useState<FeatureCollection>(
    [],
  ); // Add state for labels

  const fetchLabes = async (file_name: { file_name: string }) => {
    console.log("file_name", file_name);
    const { data, error } = await supabase
      .from("labels_dev_egu")
      .select("*")
      // .limit(1);
      .eq("ortho_file_name", file_name);

    if (error) {
      console.error("Error fetching data:", error);
    } else {
      // setStandingDeadwood(data[0].standing_deadwood);
      // setAoi(data.aoi);
      console.log("Data fetched:", data);
    }
  };
  useEffect(() => {
    if (data) {
      fetchLabes({ file_name: data.file_name });
    }
  }, [data]);

  useEffect(() => {
    if (mapContainer.current && data) {
      // Ensure the container and data are available
      console.log("aoi", aoi);
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
            paint: {},
          },
          "building",
        ); // Place layer under labels, roads, and buildings.
      });
    }
  }, [data]); // Depend on `data` to re-initialize the map when it changes

  return (
    <div
      style={{ width: "100%", height: "100%", borderRadius: 8 }} // Ensure the div has a specified height
      ref={mapContainer}
    />
  );
};

export default DatasetDetailsMap;
