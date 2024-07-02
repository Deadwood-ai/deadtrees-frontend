import { useEffect, useRef, useState } from "react";
import "ol/ol.css";
import { Map, View } from "ol";
import { fromLonLat, transformExtent } from "ol/proj";
import TileLayer from "ol/layer/WebGLTile.js";
import { BingMaps, GeoTIFF } from "ol/source";
// import { TileJSON } from "ol/source";

import "@geoapify/geocoder-autocomplete/styles/round-borders.css";
import "./geocoder.css";
import {
  GeoapifyContext,
  GeoapifyGeocoderAutocomplete,
} from "@geoapify/react-geocoder-autocomplete";

import getDeadwoodCOGUrl from "../utils/getDeadwoodCOGUrl";
import { extend } from "ol/extent";

const DeadtreesMapOL = () => {
  const [bounds, setBounds] = useState([0, 0, 0, 0]);
  const mapContainer = useRef();
  useEffect(() => {
    console.log("bounds", bounds);
    const basemapLayer = new TileLayer({
      //   source: new TileJSON({
      //     url: `https://api.maptiler.com/maps/satellite/tiles.json?key=${import.meta.env.VITE_MAPTILER_KEY}`,
      //     crossOrigin: "anonymous",
      //     tileSize: 512,
      //   }),
      source: new BingMaps({
        key: import.meta.env.VITE_BING_MAPS_KEY,
        imagerySet: "AerialWithLabelsOnDemand",
        culture: "en-us",
      }),
      //   source: new OSM(),
    });
    const geotiffSource = new GeoTIFF({
      sources: [
        {
          url: getDeadwoodCOGUrl("2018"),
          min: 400,
          max: 4000,
        },
      ],
      interpolate: false,
      normalize: true,
    });
    const geotiffLayer = new TileLayer({
      source: geotiffSource,
      style: {
        color: [
          "interpolate",
          ["linear"],
          ["band", 1],
          0,
          [129, 176, 247, 0],
          0.4,
          [129, 176, 247, 0.1],
          0.6,
          [129, 176, 247, 0.2],
          0.8,
          [129, 176, 247, 0.4],
          1,
          [129, 176, 247, 0.6],
        ],
      },
      maxZoom: 24,
    });

    const map = new Map({
      target: mapContainer.current,
      layers: [basemapLayer, geotiffLayer],
      //   view: geotiffSource.getView(),
      // view: new View({
      //   center: fromLonLat([10.668224826784524, 51.78688853393797]),
      //   zoom: 15,
      // }),
    });
    // const extent = [fromLonLat([bounds[0], bounds[1]], ));]
    // console.log("extent", extent);
    map.getView().fit(transformExtent(bounds, "EPSG:4326", "EPSG:3857"));

    return () => map.setTarget(null);
  }, [bounds]);

  const handlePlaceSelect = (place) => {
    setBounds(place.bbox);
    console.log(place);
  };

  return (
    <div className="h-full w-full">
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: "8px",
        }}
        ref={mapContainer}
      >
        <div className="absolute right-8 top-28 z-20 w-96 rounded-sm">
          <GeoapifyContext apiKey={import.meta.env.VITE_GEOPIFY_KEY}>
            <GeoapifyGeocoderAutocomplete
              placeholder="Enter address here"
              // value={value}
              // type="city"
              filterByCountryCode={["DE"]}
              placeSelect={handlePlaceSelect}
              // suggestionsChange={handlePlaceSelect}
            />
            {/* Your Geoapify Geocoder Autocomplete components go here */}
          </GeoapifyContext>
        </div>
      </div>
    </div>
  );
};

export default DeadtreesMapOL;
