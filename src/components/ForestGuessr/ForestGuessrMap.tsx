
import { useEffect, useRef, useState } from "react";
import { Spin } from "antd";
import "ol/ol.css";
import { Map } from "ol";
import TileLayer from "ol/layer/Tile";
import View from "ol/View";
import TileLayerWebGL from "ol/layer/WebGLTile.js";
import { BingMaps } from "ol/source";
import { fromLonLat } from "ol/proj";
import GeoTIFF from "ol/source/GeoTIFF";

const ForestGuessrMap = ({ cogUrl }) => {
  const mapContainer = useRef();
  const mapRef = useRef(null);
  const [isLoadingOrthophoto, setIsLoadingOrthophoto] = useState(true);

  useEffect(() => {
    setIsLoadingOrthophoto(true); // Reset loading state for each new orthophoto
    if (cogUrl && mapContainer.current) {
      const geotiffSource = new GeoTIFF({
        sources: [
          {
            url: cogUrl,
            nodata: 0,
            bands: [1, 2, 3],
          },
        ],
        convertToRGB: true,
      });

      const geotiffLayer = new TileLayerWebGL({
        source: geotiffSource,
        maxZoom: 23,
        cacheSize: 4096,
        preload: 0,
      });

      const basemapLayer = new TileLayer({
        source: new BingMaps({
          key: import.meta.env.VITE_BING_MAPS_KEY,
          imagerySet: "RoadOnDemand",
          culture: "en-us",
        }),
      });

      // Listen for the 'change' event on the GeoTIFF source
      // When the source state becomes 'ready', it means the data is loaded
      geotiffSource.on('change', () => {
        if (geotiffSource.getState() === 'ready') {
          setIsLoadingOrthophoto(false);
        }
      });

      geotiffSource.getView().then((viewOptions) => {
        if (!viewOptions?.extent) {
          return;
        }

        const MapView = new View({
          center: viewOptions.center,
          zoom: undefined,
          extent: viewOptions.extent,
          maxZoom: 22,
          projection: "EPSG:3857",
          constrainOnlyCenter: true,
        });

        if (mapContainer.current) {
          const newMap = new Map({
            target: mapContainer.current,
            layers: [geotiffLayer],
            view: MapView,
            controls: [],
          });

          MapView.fit(viewOptions.extent);

          mapRef.current = newMap;
        }
      });
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.setTarget(null);
        mapRef.current.dispose();
        mapRef.current = null;
      }
    };
  }, [cogUrl]);

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      {isLoadingOrthophoto && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "rgba(255, 255, 255, 0.7)",
            zIndex: 1000,
          }}
        >
          <Spin size="large" tip="Loading Orthophoto..." />
        </div>
      )}
      <div ref={mapContainer} style={{ width: "100%", height: "100%" }} />
    </div>
  );
};

export default ForestGuessrMap;
