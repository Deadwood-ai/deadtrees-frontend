import { useEffect, useRef, useState } from "react";
import { Alert, Radio } from "antd";
import "ol/ol.css";
import { Map, Overlay } from "ol";
import { fromLonLat, transformExtent } from "ol/proj";
import TileLayer from "ol/layer/Tile";
import { BingMaps, XYZ } from "ol/source";
import TileLayerWebGL from "ol/layer/WebGLTile.js";
import View from "ol/View";
import "@geoapify/geocoder-autocomplete/styles/round-borders.css";
import "./geocoder.css";
import { GeoapifyContext, GeoapifyGeocoderAutocomplete } from "@geoapify/react-geocoder-autocomplete";

import "./popup.css";
import getPixelValueOfCoordinate from "../../utils/getPixelValueOfCoordinate";
import Legend from "./Legend";
import MapStyleSwitchButtons from "./MapStyleSwitchButtons";
import createDeadwoodGeotiffLayer from "./createDeadwoodGeotiffLayer";
import getDeadwoodCOGUrl from "../../utils/getDeadwoodCOGUrl";
import DeadwoodCard from "./DeadwoodCard";
import { useDatasetMap } from "../../hooks/useDatasetMapProvider";

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
  5: "2022",
};

const DeadtreesMap = () => {
  const [map, setMap] = useState(null);
  const [selectedYear, setSelectedYear] = useState<string>("2022");
  const [bounds, setBounds] = useState([]);
  const [selectedSite, setSelectedSite] = useState<string>("Bayern");
  const [sliderValue, setSliderValue] = useState<number>(1);
  const mapContainer = useRef();
  const mapRef = useRef(null);
  const { DeadwoodMapViewport, setDeadwoodMapViewport, DeadwoodMapStyle, setDeadwoodMapStyle } = useDatasetMap();

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
      // console.log("map not initialized");
    }
  };

  useEffect(() => {
    // console.log(DeadwoodMapViewport);
    if (!map) {
      const initialView = new View({
        // transform to EPSG:3857
        center: DeadwoodMapViewport.center,
        zoom: DeadwoodMapViewport.zoom,
      });
      const basemapLayer = new TileLayer({
        preload: 0,
        source: new XYZ({
          url:
            DeadwoodMapStyle === "satellite-streets-v12"
              ? `https://api.mapbox.com/v4/mapbox.satellite/{z}/{x}/{y}.jpg?access_token=${import.meta.env.VITE_MAPBOX_ACCESS_TOKEN}`
              : "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
          attributions:
            DeadwoodMapStyle === "satellite-streets-v12"
              ? "© Mapbox © OpenStreetMap contributors"
              : "© OpenStreetMap contributors",
          maxZoom: DeadwoodMapStyle === "satellite-streets-v12" ? undefined : 19,
          tileSize: DeadwoodMapStyle === "satellite-streets-v12" ? 512 : 256,
        }),
      });
      const geotifLayer2018 = createDeadwoodGeotiffLayer("2018");
      const geotifLayer2019 = createDeadwoodGeotiffLayer("2019");
      const geotifLayer2020 = createDeadwoodGeotiffLayer("2020");
      const geotifLayer2021 = createDeadwoodGeotiffLayer("2021");
      const geotifLayer2022 = createDeadwoodGeotiffLayer("2022");

      const newMap = new Map({
        target: mapContainer.current,
        layers: [basemapLayer, geotifLayer2018, geotifLayer2019, geotifLayer2020, geotifLayer2021, geotifLayer2022],
        view: initialView,
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

      newMap.on("moveend", () => {
        setDeadwoodMapViewport({
          center: newMap.getView().getCenter(),
          zoom: newMap.getView().getZoom(),
        });
      });

      const closer = popupElement.querySelector("#popup-closer");
      if (closer) {
        closer.onclick = function () {
          overlay.setPosition(undefined);
          closer.blur();
          return false;
        };
      }

      mapRef.current = newMap;
      // if (DeadwoodMapViewport.zoom != 2) {
      // newMap.getView().fit(transformExtent(bounds, "EPSG:4326", "EPSG:3857"));
      // }
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
    if (map && bounds.length > 0) {
      map.getView().fit(transformExtent(bounds, "EPSG:4326", "EPSG:3857"));
    }
  }, [bounds, map]);

  // update on mapStyle change
  useEffect(() => {
    if (map) {
      const layer = map.getLayers().getArray()[0];
      const nextIsSatellite = DeadwoodMapStyle === "satellite-streets-v12";
      if (nextIsSatellite) {
        const zoom = map.getView().getZoom();
        if (!zoom || zoom < 14) {
          return; // gate satellite at >=14
        }
      }
      layer.setSource(
        new XYZ({
          url: nextIsSatellite
            ? `https://api.mapbox.com/v4/mapbox.satellite/{z}/{x}/{y}.jpg?access_token=${import.meta.env.VITE_MAPBOX_ACCESS_TOKEN}`
            : "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
          attributions: nextIsSatellite ? "© Mapbox © OpenStreetMap contributors" : "© OpenStreetMap contributors",
          maxZoom: nextIsSatellite ? undefined : 19,
          tileSize: nextIsSatellite ? 512 : 256,
        }),
      );
    }
  }, [DeadwoodMapStyle, map]);

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

  const SideSelectionButtons = () => {
    return (
      <div>
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
        <div className="absolute right-4 top-24 z-20 w-96 rounded-sm">
          <GeoapifyContext apiKey={import.meta.env.VITE_GEOPIFY_KEY}>
            <GeoapifyGeocoderAutocomplete
              placeholder="Enter address here"
              // type="city"
              filterByCountryCode={["de"]}
              placeSelect={(place) => setBounds(place.bbox)}
            />
          </GeoapifyContext>
          <div className="mt-4">
            <Alert
              message="Prototype Version"
              description="This is a prototype visualization. A much more comprehensive and optimized version is currently in development. Stay tuned for updates!"
              type="info"
              showIcon
              closable
            />
          </div>
        </div>
        <div className="absolute left-4 top-24 z-50">
          <MapStyleSwitchButtons
            mapStyle={DeadwoodMapStyle}
            onChange={(next) => {
              if (next === "satellite-streets-v12" && mapRef.current) {
                const zoom = mapRef.current.getView().getZoom();
                if (!zoom || zoom < 14) {
                  // gate switch below 14
                  return;
                }
              }
              setDeadwoodMapStyle(next);
            }}
          />
        </div>
        <div className="absolute bottom-10 left-4 z-20">
          <SideSelectionButtons />
        </div>
        <div className="absolute bottom-56 right-4 z-50">
          <Legend />
        </div>
        <div className="absolute bottom-10 right-4 z-50">
          <DeadwoodCard
            year={selectedYear}
            sliderValue={sliderValue}
            setSliderValue={setSliderValue}
            setSelectedYear={setSelectedYear}
          />
        </div>
      </div>
    </div>
  );
};

export default DeadtreesMap;

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
