import { useRef, useEffect } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

// Your Mapbox access token
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEND!;

const Map = ({ lat, lng }: { lat: number; lng: number }) => {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const map = useRef<mapboxgl.Map | null>(null);

  // Initialize map only once
  useEffect(() => {
    if (map.current) return; // If map is already initialized, do nothing
    map.current = new mapboxgl.Map({
      container: mapContainer.current!,
      style: "mapbox://styles/mapbox/streets-v11",
      center: [lat, lng],
      zoom: 9,
    });
  }, [lat, lng]); // Depend on lat and lng to re-center the map

  // Effect to update map center when lat/lng change
  useEffect(() => {
    if (!map.current) return; // Ensure map is initialized
    map.current.flyTo({
      center: [lat, lng],
      essential: true, // This ensures the map smoothly transitions to the new center
    });
  }, [lat, lng]); // Depend on lat and lng to re-center the map

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
      }}
      ref={mapContainer}
      //   className="map-container"
    />
  );
};

export default Map;
