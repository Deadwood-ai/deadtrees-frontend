
import { useEffect, useRef, useState } from "react";
import "ol/ol.css";
import { Map, View } from "ol";
import TileLayer from "ol/layer/Tile";
import { OSM } from "ol/source";
import { useGeographic } from "ol/proj";
import { Feature } from "ol";
import { Point } from "ol/geom";
import { Vector as VectorLayer } from "ol/layer";
import { Vector as VectorSource } from "ol/source";
import { Style, Icon } from "ol/style";

useGeographic();

const GuessingMap = ({ onGuess, clearMarker, disabled, trueLocation }) => {
  const mapContainer = useRef();
  const mapRef = useRef(null);
  const [marker, setMarker] = useState(null);
  const vectorSource = useRef(new VectorSource()).current;

  useEffect(() => {
    const vectorLayer = new VectorLayer({
      source: vectorSource,
    });

    const newMap = new Map({
      target: mapContainer.current,
      layers: [
        new TileLayer({
          source: new OSM(),
        }),
        vectorLayer,
      ],
      view: new View({
        center: [0, 0],
        zoom: 2,
      }),
      controls: [],
    });

    mapRef.current = newMap;

    return () => {
      if (mapRef.current) {
        mapRef.current.setTarget(null);
      }
    };
  }, []); // Map initialization only runs once

  // Effect to manage click listener based on 'disabled' prop
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const clickHandler = (event) => {
      const coords = event.coordinate;
      console.log("Map clicked at:", coords);
      vectorSource.clear(); // Clear existing markers before adding new one
      const newMarker = new Feature({
        geometry: new Point(coords),
      });
      newMarker.setStyle(
        new Style({
          image: new Icon({
            src: "/assets/custom_marker.png",
            anchor: [0.5, 1],
          }),
        })
      );
      vectorSource.addFeature(newMarker);
      setMarker(newMarker);
      onGuess(coords);
    };

    if (!disabled) {
      map.on("click", clickHandler);
    } else {
      map.un("click", clickHandler);
    }

    return () => {
      map.un("click", clickHandler); // Cleanup on unmount or disabled change
    };
  }, [disabled, onGuess, vectorSource]); // Re-run if disabled state or onGuess/vectorSource changes

  // Effect to clear markers when new round starts
  useEffect(() => {
    if (clearMarker) {
      vectorSource.clear(); // Clear all markers when new round starts
      setMarker(null); // Also clear the local marker state
    }
  }, [clearMarker, vectorSource]);

  // Effect to display true location marker
  useEffect(() => {
    if (trueLocation && disabled) { // Only add true location if disabled (i.e., after guess)
      const trueLocationMarker = new Feature({
        geometry: new Point(trueLocation),
      });
      trueLocationMarker.setStyle(
        new Style({
          image: new Icon({
            src: "/assets/custom_marker.png", // You might want a different icon for true location
            color: "red", // Different color for true location
            anchor: [0.5, 1],
          }),
        })
      );
      vectorSource.addFeature(trueLocationMarker);
    }
  }, [trueLocation, disabled, vectorSource]); // Re-run if trueLocation or disabled state changes

  // Effect to manage click listener based on 'disabled' prop
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const clickHandler = (event) => {
      const coords = event.coordinate;
      console.log("Map clicked at:", coords);
      vectorSource.clear(); // Clear existing markers before adding new one
      const newMarker = new Feature({
        geometry: new Point(coords),
      });
      newMarker.setStyle(
        new Style({
          image: new Icon({
            src: "/assets/custom_marker.png",
            anchor: [0.5, 1],
          }),
        })
      );
      vectorSource.addFeature(newMarker);
      setMarker(newMarker);
      onGuess(coords);
    };

    if (!disabled) {
      map.on("click", clickHandler);
    } else {
      map.un("click", clickHandler);
    }

    return () => {
      map.un("click", clickHandler); // Cleanup on unmount or disabled change
    };
  }, [disabled, onGuess, vectorSource]); // Re-run if disabled state or onGuess/vectorSource changes

  // Effect to clear markers when new round starts
  useEffect(() => {
    if (clearMarker) {
      vectorSource.clear(); // Clear all markers when new round starts
      setMarker(null); // Also clear the local marker state
    }
  }, [clearMarker, vectorSource]);

  // Effect to display true location marker
  useEffect(() => {
    if (trueLocation && disabled) { // Only add true location if disabled (i.e., after guess)
      const trueLocationMarker = new Feature({
        geometry: new Point(trueLocation),
      });
      trueLocationMarker.setStyle(
        new Style({
          image: new Icon({
            src: "/assets/custom_marker.png", // You might want a different icon for true location
            color: "red", // Different color for true location
            anchor: [0.5, 1],
          }),
        })
      );
      vectorSource.addFeature(trueLocationMarker);
    }
  }, [trueLocation, disabled, vectorSource]); // Re-run if trueLocation or disabled state changes

  return <div ref={mapContainer} style={{ width: "100%", height: "100%" }} />;
};

export default GuessingMap;
