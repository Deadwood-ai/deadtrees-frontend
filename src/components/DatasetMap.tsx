import { useRef, useEffect } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { IDataset } from "../types/dataset";
import { useNavigate } from "react-router-dom";
import parseBBox from "../utils/parseBBox";
import { notification } from "antd";
import getThumbnailURL from "../utils/getThumbnails";

// Your Mapbox access token
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEND!;

const Map = ({ data }: { data: IDataset[] }) => {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!mapContainer.current || !data.length) return;

    // const centroid = JSON.parse(data[0].centroid.replace(/'/g, '"'));

    const geojsonData = {
      type: "FeatureCollection",
      features: data
        .sort((a, b) => (a.id ? 1 : -1))
        .map((dataset) => ({
          type: "Feature",
          properties: {
            id: dataset.id,
            // if has wms_source set dataset.file_name as title else set "coming soon" as title
            // title: dataset.wms_source ? dataset.file_name : "Coming Soon",
            title: dataset.file_name,
            // title: dataset.file_name,
            // has_wms_source: dataset.wms_source !== null,
          },
          geometry: {
            type: "Point",
            // coordinates: parseBBox(dataset.bbox)[0], // Assuming dataset.bbox is [lng, lat]
            coordinates: dataset.centroid
              ? [
                  JSON.parse(dataset.centroid.replace(/'/g, '"'))?.lng,
                  JSON.parse(dataset.centroid.replace(/'/g, '"'))?.lat,
                ]
              : [0, 0],
          },
        })),
    };
    // Convert data to GeoJSON
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

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      // zoom: 4,
      center: bounds.getCenter(),
      style: "mapbox://styles/mapbox/streets-v11",
    });

    map.on("load", () => {
      map.loadImage("assets/custom_marker.png", (error, image) => {
        if (error) throw error;
        map.addImage("custom-marker", image);

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
          type: "circle",
          source: "datasets",
          paint: {
            "circle-opacity": 0.8,
            //  make smaller radius with higher zoom
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 0, 4, 22, 20],

            // "circle-radius": 8,
            // if has_wms_source is true make circle blue else make it red
            "circle-color": ["case", ["==", ["get", "has_wms_source"], true], "#007cbf", "#ff0000"],
            // if wms_source is not null show custom marker else show default marke
            // "icon-image": [
            //   "case",
            //   ["=", "has_wms_source"],
            //   "custom-marker",
            //   "default-marker",
            // ],
            // "icon-image": "custom-marker",
            // allow overlapping icons
            // "icon-allow-overlap": true,
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

          popup
            .setLngLat(coordinates)
            .setHTML(
              description !== "Coming Soon"
                ? `<div style="display: flex; flex-direction: column; align-items: center;">
                  <img width="200" src="${getThumbnailURL(description)}" alt="Image" />
                  <div style="text-align: center;">
                    <h5 style="padding: 0 1px;">${description}</h5>
                    <i>${`click view file`}</i>
                  </div>
                </div>`
                : `<p style="padding: 0 0">${description}</p>`,
            )
            .addTo(map);
        });
        map.on("mouseleave", "markers", () => {
          map.getCanvas().style.cursor = "";
          popup.remove();
        });

        // Navigate on click
        map.on("click", "markers", (e) => {
          const feature = e.features[0];
          const datasetId = feature.properties.id;
          console.log("clicked feature", feature);
          if (feature.properties.id) {
            navigate(`/dataset/${datasetId}`);
          } else {
            notification.info({
              message: "Coming Soon",
              description: "This dataset is not yet available",
            });
          }
        });
      });
    });
    return () => {
      // Cleanup function
      if (map) {
        map.remove(); // This removes the map instance and all associated resources
      }
    };
  }, [data, navigate]);

  return (
    <div
      // className="h-full w-full"
      ref={mapContainer}
      style={{ width: "100%", height: "100%", borderRadius: 8 }}
    >
      {data.length > 0 ? (
        <div className="absolute left-4 top-4 z-50">
          <div className="flex items-center space-x-2">
            <div className="h-4 w-4 rounded-full bg-blue-500"></div>
            <span className="ml-0">Available</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="h-4 w-4 rounded-full bg-red-600"></div>
            <span className="ml-0">Coming Soon </span>
          </div>
        </div>
      ) : (
        // showing loading spinner
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transform">
          <div className="h-32 w-32 animate-spin rounded-full border-b-2 border-t-2 border-gray-900"></div>
        </div>
      )}
    </div>
  );
};

export default Map;
