import { useEffect, useRef } from "react";
import MapboxGeocoder from "@mapbox/mapbox-gl-geocoder";
import "@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css";

import mapboxgl from "mapbox-gl";
// Load the `mapbox-gl-geocoder` plugin.

import { EllipsisRasterLayer } from "mapboxgljs-ellipsis";

const DeadtreesMap = () => {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const pathId = "c4feee8c-05df-4d73-9094-7c65d95aaeb3";
  const token =
    "epat_7JMrvKfzqDGPYY6L15ff2Y1ucJVGL9ayVUuX4DffeVwpY2IuxOJmEU1oTq8iJeaA";
  const timestampID = "be6b89c8-a8d1-44be-9bcf-a9440ae1f6ad";
  const styleID = "1e4d78d9-e224-4b30-bf01-0ee600c591bd";

  useEffect(() => {
    if (mapContainer.current) {
      //   const wms =
      //     "https://api.ellipsis-drive.com/v3/ogc/wms/c4feee8c-05df-4d73-9094-7c65d95aaeb3&token=epat_gpZKfLKq9PIUZe7qClx1Ruq6pyJJPNOa3A92lwVe6WZs1UYCHqj0davlliF4o3vq";
      //   const wms_full = wms + "?requestedEpsg=3857&request=getMap&";
      const map = new mapboxgl.Map({
        container: mapContainer.current,
        // style: "mapbox://styles/mapbox/satellite-v9",
        style: "mapbox://styles/mapbox/streets-v11",
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
        new EllipsisRasterLayer({
          pathId: pathId,
          timestampId: timestampID,
          style: styleID,
          token: token,
        }).addTo(map);
      });
    }
  });

  return (
    <div
      style={{ width: "100%", height: "100%", borderRadius: 8 }}
      ref={mapContainer}
    />
  );
};

export default DeadtreesMap;
