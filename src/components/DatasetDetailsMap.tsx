import React, { useRef, useEffect } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Dataset } from "../types/dataset";
import parseBBox from "../utils/parseBBox"; // Make sure this utility function is correctly implemented

const DatasetDetailsMap = ({ data }: { data: Dataset }) => {
  const mapContainer = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (mapContainer.current && data) {
      // Ensure the container and data are available
      console.log("data", data);
      const bounds = parseBBox(data.bbox!); // Parse the bounding box
      console.log("bounds", bounds);

      // const wmsSourceUrl =
      //   "https://data.deadtrees.earth/mapserver/?SERVICE=WMS&VERSION=1.1.1&LAYERS=62fd732e-9209-4efb-826c-ae30486fdb09_uavforsat_KAB003_ortho.tif&REQUEST=GetMap&SRS=EPSG:3857&BBOX={bbox-epsg-3857}&FORMAT=image/png&width=256&HEIGHT=256";
      const wmsSource =
        "https://data.deadtrees.earth/mapserver/?SERVICE=WMS&VERSION=1.1.1&LAYERS=" +
        data.file_id +
        "&REQUEST=GetMap&SRS=EPSG:3857&BBOX={bbox-epsg-3857}&FORMAT=image/png&width=256&HEIGHT=256";
      console.log("wms", wmsSource);
      console.log("file_id", data.file_id);
      const map = new mapboxgl.Map({
        container: mapContainer.current,
        style: "mapbox://styles/mapbox/streets-v11",
        // bounds: bounds,
        // center: [8.6982700000000008, 49.0131999999999977],
        center: bounds[0],

        zoom: 14,
      });

      map.on("load", () => {
        map.fitBounds(bounds, {
          padding: { top: 50, bottom: 50, left: 50, right: 50 },
        });

        map.addSource("wms-test-source", {
          type: "raster",
          tiles: [wmsSource],
          // tiles: [wmsSourceUrl],
          tileSize: 256,
        });

        map.addLayer(
          {
            id: "wms-test-layer",
            type: "raster",
            source: "wms-test-source",
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
