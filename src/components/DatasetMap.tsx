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
      map.loadImage("assets/custom_marker.png", (error, image) => {
        if (error) throw error;
        map.addImage("custom-marker", image);

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
        // fit bounds to geojsonData
        const bounds = geojsonData.features.reduce(
          (bounds, feature) => {
            return bounds.extend(feature.geometry.coordinates);
          },
          new mapboxgl.LngLatBounds(
            geojsonData.features[0].geometry.coordinates,
            geojsonData.features[0].geometry.coordinates,
          ),
        );
        map.fitBounds(bounds, {
          padding: 100,
        });

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
            "icon-image": "custom-marker",
            // allow overlapping icons
            "icon-allow-overlap": true,
          },
        });

        const popup = new mapboxgl.Popup({
          closeButton: false,
          closeOnClick: false,
        });

        // Change cursor to pointer on hover
        map.on("mouseenter", "markers", (e) => {
          map.getCanvas().style.cursor = "pointer";
          const coordinates = e.features[0].geometry.coordinates.slice();
          const description = e.features[0].properties.title;

          // Ensure that if the map is zoomed out such that multiple
          // copies of the feature are visible, the popup appears
          // over the copy being pointed to.
          while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
            coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
          }

          popup.setLngLat(coordinates).setHTML(description).addTo(map);
        });
        map.on("mouseleave", "markers", () => {
          map.getCanvas().style.cursor = "";
          popup.remove();
        });

        // Navigate on click
        map.on("click", "markers", (e) => {
          const datasetId = e.features[0].properties.id;
          console.log(e.features);
          navigate(`/dataset/${datasetId}`);
        });
      });
    });
  }, [data, navigate]);

  return (
    <div
      // className="h-full w-full"
      ref={mapContainer}
      style={{ width: "100%", height: "100%", borderRadius: 8 }}
    />
  );
};

export default Map;
