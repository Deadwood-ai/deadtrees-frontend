import { useRef, useEffect } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Dataset } from "../types/dataset";
import { useNavigate } from "react-router-dom";
import parseBBox from "../utils/parseBBox";

// Your Mapbox access token
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEND!;

const Map = ({ data }: { data: Dataset[] }) => {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!mapContainer.current || !data.length) return;
    console.log(data);

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v11",
    });

    map.on("load", () => {
      // Convert data to GeoJSON
      const geojsonData = {
        type: "FeatureCollection",
        features: data.map((dataset) => ({
          type: "Feature",
          properties: {
            id: dataset.uuid,
            title: dataset.file_name,
          },
          geometry: {
            type: "Point",
            coordinates: parseBBox(dataset.bbox)[0], // Assuming dataset.bbox is [lng, lat]
          },
        })),
      };
      console.log(geojsonData);

      // Add data as a source
      map.addSource("datasets", {
        type: "geojson",
        data: geojsonData,
      });

      // Add markers as a layer
      map.addLayer({
        id: "markers",
        type: "symbol",
        source: "datasets",
        layout: {
          // "icon-image": "{icon}", // Specify an icon image, make sure you have this in your style or use a default one
          "text-field": "{title}",
          "text-offset": [0, 1.2],
          "text-anchor": "top",
        },
      });
      // adding point layer
      map.addLayer({
        id: "points",
        type: "circle",
        source: "datasets",
        paint: {
          "circle-radius": 10,
          "circle-color": "#007cbf",
        },
      });

      // Change cursor to pointer on hover
      map.on("mouseenter", "points", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "points", () => {
        map.getCanvas().style.cursor = "";
      });

      // Navigate on click
      map.on("click", "points", (e) => {
        const datasetId = e.features[0].properties.id;
        console.log(e.features);
        navigate(`/dataset/${datasetId}`);
      });
    });
  }, [data, navigate]);

  return <div ref={mapContainer} style={{ width: "100%", height: "100%" }} />;
};

export default Map;
