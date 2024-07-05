import { useEffect, useRef, useState } from "react";
import "ol/ol.css";
import { Map, View, Overlay } from "ol";
import { fromLonLat, transformExtent } from "ol/proj";
import TileLayerWebGL from "ol/layer/WebGLTile.js";
import TileLayer from "ol/layer/Tile";
import { BingMaps, GeoTIFF } from "ol/source";

import "@geoapify/geocoder-autocomplete/styles/round-borders.css";
import "./geocoder.css";
import { GeoapifyContext, GeoapifyGeocoderAutocomplete } from "@geoapify/react-geocoder-autocomplete";

import getDeadwoodCOGUrl from "../utils/getDeadwoodCOGUrl";
import { Radio, Slider } from "antd";
import getPixelValueOfCoordinate from "../utils/getPixelValueOfCoordinate";
import "./popup.css";

const sites = {
  Waldshut: [8.174864507120049, 47.682517904265666],
  Harz: [10.668224826784524, 51.78688853393797],
  Bayern: [13.330993298074588, 49.03963187270776],
};

const yearByIndex = {
  1: "2018",
  2: "2019",
  3: "2020",
  4: "2021",
};

const DeadtreesMapOL = () => {
  const [map, setMap] = useState(null);
  const [selectedYear, setSelectedYear] = useState<string>("2018");
  const [bounds, setBounds] = useState([5.86, 47.27, 15.04, 55.09]);
  const [mapStyle, setMapStyle] = useState("RoadOnDemand");
  const [selectedSite, setSelectedSite] = useState<string>();
  const [sliderValue, setSliderValue] = useState<number>(1);
  const mapContainer = useRef();
  const mapRef = useRef(null);

  let overlay; // Declare overlay at the top-level scope

  // layers ---------------------------------------------------

  const createGeotiffLayer = (year) => {
    const geotiffLayer = new TileLayerWebGL({
      source: new GeoTIFF({
        sources: [
          {
            url: getDeadwoodCOGUrl(year),
            min: 0,
            max: 10000,
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
          0.2,
          [129, 176, 247, 0.2],
          0.4,
          [129, 176, 247, 0.3],
          0.6,
          [129, 176, 247, 0.6],
          0.8,
          [129, 176, 247, 0.8],
          1,
          [129, 176, 247, 1],
        ],
      },
    });
    return geotiffLayer;
  };

  // handler functions
  const handleClick = async (event, year) => {
    if (mapRef.current) {
      const value = await getPixelValueOfCoordinate({
        coordinates: event.coordinate,
        cogUrl: getDeadwoodCOGUrl(year),
      });

      const popupContent = document.getElementById("popup-content");

      if (popupContent) {
        if (value > 0) {
          popupContent.innerHTML = `Deadwood ${(value / 100).toFixed(0)} %`;
        } else {
          popupContent.innerHTML = `No deadwood`;
        }
      }
      const overlay = mapRef.current.getOverlays().getArray()[0];
      overlay.setPosition(event.coordinate);
    } else {
      console.log("map not initialized");
    }
  };

  useEffect(() => {
    if (!map) {
      const basemapLayer = new TileLayer({
        source: new BingMaps({
          key: import.meta.env.VITE_BING_MAPS_KEY,
          imagerySet: mapStyle,
          culture: "en-us",
        }),
      });
      const geotifLayer2018 = createGeotiffLayer("2018");
      const geotifLayer2019 = createGeotiffLayer("2019");
      const geotifLayer2020 = createGeotiffLayer("2020");
      const geotifLayer2021 = createGeotiffLayer("2021");

      const newMap = new Map({
        target: mapContainer.current,
        layers: [basemapLayer, geotifLayer2018, geotifLayer2019, geotifLayer2020, geotifLayer2021],
        overlays: [],
        controls: [],
      });
      const popupElement = document.createElement("div");
      popupElement.id = "popup";
      popupElement.className = "ol-popup";
      popupElement.innerHTML = `
        <div id="popup-content"></div>
        <a href="#" id="popup-closer" class="ol-popup-closer"></a>
      `;

      const overlay = new Overlay({
        element: popupElement,
        autoPan: true,
        autoPanAnimation: {
          duration: 0,
        },
      });

      newMap.addOverlay(overlay);

      const closer = popupElement.querySelector("#popup-closer");
      if (closer) {
        closer.onclick = function () {
          overlay.setPosition(undefined);
          closer.blur();
          return false;
        };
      }

      mapRef.current = newMap;
      newMap.getView().fit(transformExtent(bounds, "EPSG:4326", "EPSG:3857"));
      setMap(newMap);
    }

    return () => {
      if (map) {
        map.setTarget(null);
      }
    };
  }, []);

  // effects -----------------------------------------------------------

  // update on bounds change after geocoder search
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

  //update opacity of geotiff layer
  useEffect(() => {
    if (map) {
      const layers = map.getLayers().getArray();
      layers.forEach((layer, index) => {
        if (layer instanceof TileLayerWebGL) {
          layer.setOpacity(sliderValue);
        }
      });
    }
  }, [sliderValue, map]);

  // update on selectedSite change
  useEffect(() => {
    if (map && selectedSite) {
      const view = map.getView();
      view.setCenter(fromLonLat(sites[selectedSite]));
      view.setZoom(15);
    }
  }, [selectedSite, map]);

  // update onClick handler when selectedYear changes
  useEffect(() => {
    if (mapRef.current) {
      // Remove the old click listener
      mapRef.current.un("click", handleClick);

      // Add a new click listener with the current selectedYear
      const clickHandler = (event) => handleClick(event, selectedYear);
      mapRef.current.on("click", clickHandler);

      // Clean up function to remove the listener when the component unmounts or selectedYear changes
      return () => {
        if (mapRef.current) {
          mapRef.current.un("click", clickHandler);
        }
      };
    }
  }, [selectedYear]);

  // update visibility of geotiff layers based on selectedYear
  useEffect(() => {
    if (map) {
      const layers = map.getLayers().getArray();
      // console.log(layers);
      layers.forEach((layer, index) => {
        if (layer instanceof TileLayerWebGL) {
          layer.setVisible(yearByIndex[index] === selectedYear);
        }
      });
      // update onclick listerer
    }
  }, [selectedYear, map]);

  // components ---------------------------------------------------

  const YearSelectionButtons = () => {
    return (
      <div className="flex items-center justify-between">
        <p className="text-md m-0 pb-2 text-gray-600">Year</p>
        <Radio.Group className="pb-2" value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>
          <Radio.Button value="2018">2018</Radio.Button>
          <Radio.Button value="2019">2019</Radio.Button>
          <Radio.Button value="2020">2020</Radio.Button>
          <Radio.Button value="2021">2021</Radio.Button>
        </Radio.Group>
      </div>
    );
  };
  const MapStyleSwitchButtons = () => {
    return (
      <div className="absolute left-8 top-28 z-20">
        <Radio.Group value={mapStyle} onChange={(e) => setMapStyle(e.target.value)}>
          <Radio.Button value="AerialWithLabelsOnDemand">Satellite</Radio.Button>
          <Radio.Button value="RoadOnDemand">Streets</Radio.Button>
        </Radio.Group>
      </div>
    );
  };
  const SideSelectionButtons = () => {
    return (
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
    );
  };

  const Legend = () => {
    return (
      <div className="absolute bottom-56 right-8 z-50 flex flex-col items-end space-x-2 rounded-md bg-white p-4">
        <p className="m-0 max-w-24 pb-2 text-center text-xs text-gray-500">Share of standing deadwood (%)</p>
        <div className="flex h-32 space-x-2">
          <div className="flex flex-col items-end justify-between">
            <p className="m-0 text-xs text-gray-600">100% - </p>
            <p className="m-0 text-xs text-gray-600">50% - </p>
            <p className="m-0 text-xs text-gray-600">0% - </p>
          </div>
          <div className="mb-1 mt-1  w-4 rounded-sm bg-gradient-to-b from-sky-500"></div>
        </div>
      </div>
    );
  };

  // const DeadwoodCard = ({ year, sliderValue }: { year: string; sliderValue: number }) => {
  const DeadwoodCard = (year: string, sliderValue: number) => {
    return (
      <div>
        <div className="absolute bottom-12 right-8 z-20 flex w-80 flex-col justify-center rounded-md bg-white px-3 py-1">
          <p className="m-0 py-2 text-lg text-gray-800"> Deadwood for {year}</p>
          <div className="mb-2 flex w-full items-end ">
            <p className="m-0 w-full text-xs text-gray-600">Satellite-based prediction</p>
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
          <YearSelectionButtons />
        </div>
      </div>
    );
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
        {/* <CogValuePopup /> */}
        <div className="absolute right-8 top-28 z-20 w-96 rounded-sm">
          <GeoapifyContext apiKey={import.meta.env.VITE_GEOPIFY_KEY}>
            <GeoapifyGeocoderAutocomplete
              placeholder="Enter address here"
              // type="city"
              filterByCountryCode={["de"]}
              placeSelect={(place) => setBounds(place.bbox)}
            />
          </GeoapifyContext>
        </div>
        <MapStyleSwitchButtons />
        <SideSelectionButtons />
        <Legend />
        {DeadwoodCard(selectedYear, sliderValue)}
        {/* if rendering as regular jsx, interaction selects everything, this approach does not. No idea why ?*/}
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
