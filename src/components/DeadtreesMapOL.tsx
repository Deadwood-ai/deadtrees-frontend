import { useEffect, useRef, useState } from "react";
import "ol/ol.css";
import { Map, View } from "ol";
import { fromLonLat, transformExtent } from "ol/proj";
import TileLayerWebGL from "ol/layer/WebGLTile.js";
import TileLayer from "ol/layer/Tile";
import { BingMaps, GeoTIFF } from "ol/source";
// import { TileJSON } from "ol/source";

import "@geoapify/geocoder-autocomplete/styles/round-borders.css";
import "./geocoder.css";
import {
  GeoapifyContext,
  GeoapifyGeocoderAutocomplete,
} from "@geoapify/react-geocoder-autocomplete";

import getDeadwoodCOGUrl from "../utils/getDeadwoodCOGUrl";
import { Radio, Slider } from "antd";

const sites = {
  Waldshut: [8.174864507120049, 47.682517904265666],
  Harz: [10.668224826784524, 51.78688853393797],
  Bayern: [13.330993298074588, 49.03963187270776],
};

const DeadtreesMapOL = () => {
  const [map, setMap] = useState(null);
  const [selectedYear, setSelectedYear] = useState<string>("2018");
  const [bounds, setBounds] = useState([5.86, 47.27, 15.04, 55.09]);
  const [mapStyle, setMapStyle] = useState("RoadOnDemand");
  const [selectedSite, setSelectedSite] = useState<string>();
  const [sliderValue, setSliderValue] = useState<number>(1);
  const mapContainer = useRef();

  // layers ---------------------------------------------------

  useEffect(() => {
    if (!map) {
      const geotiffLayer = new TileLayerWebGL({
        source: new GeoTIFF({
          sources: [
            {
              url: getDeadwoodCOGUrl("2018"),
              min: 400,
              max: 4000,
            },
          ],
          interpolate: false,
          normalize: true,
        }),
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
      });
      const basemapLayer = new TileLayer({
        source: new BingMaps({
          key: import.meta.env.VITE_BING_MAPS_KEY,
          imagerySet: mapStyle,
          culture: "en-us",
        }),
      });
      const newMap = new Map({
        target: mapContainer.current,
        layers: [basemapLayer, geotiffLayer],
        controls: [],
      });
      newMap.getView().fit(transformExtent(bounds, "EPSG:4326", "EPSG:3857"));
      setMap(newMap);
    }

    return () => {
      if (map) {
        map.setTarget(null);
      }
    };
  }, []);

  // update on bounds change
  useEffect(() => {
    if (map) {
      map.getView().fit(transformExtent(bounds, "EPSG:4326", "EPSG:3857"));
    }
  }, [bounds, map]);

  // update on mapStyle change
  useEffect(() => {
    if (map) {
      const layer = map.getLayers().getArray()[0]; // basemap layer
      console.log(layer);
      layer.setSource(
        new BingMaps({
          key: import.meta.env.VITE_BING_MAPS_KEY,
          imagerySet: mapStyle,
          culture: "en-us",
        }),
      );
    }
  }, [mapStyle, map]);

  // update on selectedSite change
  useEffect(() => {
    if (map && selectedSite) {
      const view = map.getView();
      view.setCenter(fromLonLat(sites[selectedSite]));
      view.setZoom(15);
    }
  }, [selectedSite, map]);

  // handlers ---------------------------------------------------

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
          // borderRadius: "8px",
        }}
        ref={mapContainer}
      >
        <div className="absolute right-8 top-28 z-20 w-96 rounded-sm">
          <GeoapifyContext apiKey={import.meta.env.VITE_GEOPIFY_KEY}>
            <GeoapifyGeocoderAutocomplete
              placeholder="Enter address here"
              // type="city"
              filterByCountryCode={["de"]}
              placeSelect={handlePlaceSelect}
            />
          </GeoapifyContext>
        </div>
        <div className="absolute left-8 top-28 z-20">
          <Radio.Group
            value={mapStyle}
            onChange={(e) => setMapStyle(e.target.value)}
          >
            <Radio.Button value="AerialWithLabelsOnDemand">
              Satellite
            </Radio.Button>
            <Radio.Button value="RoadOnDemand">Streets</Radio.Button>
          </Radio.Group>
        </div>
        <div className="absolute bottom-12 left-8 z-20">
          <Radio.Group
            value={selectedSite}
            // defaultValue={"Harz"}
            defaultValue={false}
            onChange={(e) => setSelectedSite(e.target.value)}
          >
            <Radio.Button value="Harz">Harz National Park</Radio.Button>
            <Radio.Button value="Waldshut">Waldshut</Radio.Button>
            <Radio.Button value="Bayern">Bavarian Forest</Radio.Button>
          </Radio.Group>
        </div>
        <div className="absolute bottom-12 right-8 z-20 flex w-80 flex-col justify-center rounded-md bg-white px-3 py-1">
          <p className="m-0 py-2 text-lg text-gray-800">
            {" "}
            Deadwood for {selectedYear}
          </p>
          <div className="mb-2 flex w-full items-end ">
            <p className="m-0 w-full text-xs text-gray-600">
              Satellite-based prediction
            </p>
            <div className="w-2/3">
              <p className="m-0 w-full text-xs text-gray-600">opacity</p>
              <Slider
                className="m-0 w-full"
                defaultValue={1}
                step={0.01}
                max={1}
                value={sliderValue}
                onChange={(value) => setSliderValue(value as number)}
                min={0}
              />
            </div>
          </div>
          <div className="mb-6 flex items-center space-x-2">
            <p className="m-0 text-xs text-gray-800">Method prototype by:</p>
            <a
              className="m-0 italic underline"
              href="https://www.sciencedirect.com/science/article/pii/S2667393223000054?via%3Dihub"
            >
              Schiefer et al., 2023
            </a>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-md m-0 pb-2 text-gray-600">Year</p>
            <Radio.Group
              className="pb-2"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
            >
              <Radio.Button value="2018">2018</Radio.Button>
              <Radio.Button value="2019">2019</Radio.Button>
              <Radio.Button value="2020">2020</Radio.Button>
              <Radio.Button value="2021">2021</Radio.Button>
            </Radio.Group>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeadtreesMapOL;

// view: geotiffSource.getView(),
// view: new View({
//   center: fromLonLat([10.668224826784524, 51.78688853393797]),
//   zoom: 15,
// }),

//   source: new TileJSON({
//     url: `https://api.maptiler.com/maps/satellite/tiles.json?key=${import.meta.env.VITE_MAPTILER_KEY}`,
//     crossOrigin: "anonymous",
//     tileSize: 512,
//   }),
