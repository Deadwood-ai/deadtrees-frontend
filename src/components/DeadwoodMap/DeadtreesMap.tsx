import { useEffect, useRef, useState } from "react";
import { Radio } from "antd";
import "ol/ol.css";
import { Map, Overlay } from "ol";
import { fromLonLat, transformExtent } from "ol/proj";
import TileLayer from "ol/layer/Tile";
import { XYZ } from "ol/source";
import { GeoTIFF } from "ol/source";
import TileLayerWebGL from "ol/layer/WebGLTile.js";
import View from "ol/View";
import "@geoapify/geocoder-autocomplete/styles/round-borders.css";
import "./geocoder.css";
import { GeoapifyContext, GeoapifyGeocoderAutocomplete } from "@geoapify/react-geocoder-autocomplete";

import "./popup.css";
import getPixelValueOfCoordinate from "../../utils/getPixelValueOfCoordinate";
import MapStyleSwitchButtons from "./MapStyleSwitchButtons";
import { getDeadwoodCOGUrl, getForestCOGUrl } from "../../utils/getDeadwoodCOGUrl";
import DeadwoodCard from "./DeadwoodCard";
import { useDatasetMap } from "../../hooks/useDatasetMapProvider";

// Helper to create GeoTIFF source for deadwood
const createDeadwoodSource = (year: string) => {
  return new GeoTIFF({
    sources: [{ url: getDeadwoodCOGUrl(year), bands: [1], min: 0, max: 255 }],
    normalize: true,
    interpolate: false,
  });
};

// Helper to create GeoTIFF source for forest
const createForestSource = (year: string) => {
  return new GeoTIFF({
    sources: [{ url: getForestCOGUrl(year), bands: [1], min: 0, max: 255 }],
    normalize: true,
    interpolate: false,
  });
};

const sites = {
  Waldshut: [8.174864507120049, 47.682517904265666],
  Harz: [10.668224826784524, 51.78688853393797],
  Bayern: [13.330993298074588, 49.03963187270776],
};

// Source caches - persist across renders to reuse already-loaded sources
const deadwoodSourceCache: Record<string, GeoTIFF> = {};
const forestSourceCache: Record<string, GeoTIFF> = {};

// Get or create cached deadwood source
const getCachedDeadwoodSource = (year: string): GeoTIFF => {
  if (!deadwoodSourceCache[year]) {
    console.log(`[Cache] Creating new deadwood source for ${year}`);
    deadwoodSourceCache[year] = createDeadwoodSource(year);
  } else {
    console.log(`[Cache] Reusing cached deadwood source for ${year}`);
  }
  return deadwoodSourceCache[year];
};

// Get or create cached forest source
const getCachedForestSource = (year: string): GeoTIFF => {
  if (!forestSourceCache[year]) {
    console.log(`[Cache] Creating new forest source for ${year}`);
    forestSourceCache[year] = createForestSource(year);
  } else {
    console.log(`[Cache] Reusing cached forest source for ${year}`);
  }
  return forestSourceCache[year];
};

const DeadtreesMap = () => {
  const [map, setMap] = useState(null);
  const [selectedYear, setSelectedYear] = useState<string>("2025");
  const [bounds, setBounds] = useState([]);
  const [selectedSite, setSelectedSite] = useState<string>("Bayern");
  const [sliderValue, setSliderValue] = useState<number>(1);
  const mapContainer = useRef();
  const mapRef = useRef(null);
  const forestLayerRef = useRef<TileLayerWebGL | null>(null);
  const deadwoodLayerRef = useRef<TileLayerWebGL | null>(null);
  const { DeadwoodMapViewport, setDeadwoodMapViewport, DeadwoodMapStyle, setDeadwoodMapStyle } = useDatasetMap();

  // handler functions
  const handleClick = async (event: { coordinate: number[] }, year: string) => {
    if (mapRef.current) {
      // Fetch both deadwood and forest values
      const [deadwoodValue, forestValue] = await Promise.all([
        getPixelValueOfCoordinate({
          coordinates: event.coordinate,
          cogUrl: getDeadwoodCOGUrl(year),
        }),
        getPixelValueOfCoordinate({
          coordinates: event.coordinate,
          cogUrl: getForestCOGUrl(year),
        }),
      ]);

      const popupContent = document.getElementById("popup-content");

      if (popupContent) {
        const dwVal = Number(deadwoodValue) || 0;
        const fVal = Number(forestValue) || 0;
        // Normalize from 0-255 to 0-100%
        const deadwoodPct = dwVal > 0 ? Math.round((dwVal / 255) * 100) : 0;
        const forestPct = fVal > 0 ? Math.round((fVal / 255) * 100) : 0;

        popupContent.innerHTML = `
          <div style="font-family: system-ui, sans-serif; font-size: 12px; padding: 4px 8px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
              <span style="color: #6b7280;">Forest</span>
              <span style="color: #16a34a; font-weight: 600; min-width: 40px; text-align: right;">${forestPct}%</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="color: #6b7280;">Deadwood</span>
              <span style="color: #dc2626; font-weight: 600; min-width: 40px; text-align: right;">${deadwoodPct}%</span>
            </div>
          </div>
        `;
      }
      const overlay = (mapRef.current as Map).getOverlays().getArray()[0];
      overlay.setPosition(event.coordinate);
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
      // Create only 2 layers - one for forest, one for deadwood (for current year)
      const forestLayer = new TileLayerWebGL({
        source: getCachedForestSource(selectedYear),
        className: "forest-layer",
        style: {
          color: [
            "interpolate",
            ["linear"],
            ["band", 1],
            0,
            [34, 139, 34, 0],
            0.1,
            [34, 139, 34, 0.1],
            0.3,
            [34, 139, 34, 0.3],
            0.5,
            [34, 139, 34, 0.5],
            0.7,
            [34, 139, 34, 0.7],
            1,
            [0, 100, 0, 0.9],
          ],
        },
      });

      const deadwoodLayer = new TileLayerWebGL({
        source: getCachedDeadwoodSource(selectedYear),
        className: "deadwood-layer",
        style: {
          color: [
            "interpolate",
            ["linear"],
            ["band", 1],
            0,
            [255, 0, 0, 0],
            0.04,
            [255, 0, 0, 0],
            0.07,
            [255, 0, 0, 0],
            0.25,
            [255, 0, 0, 0.3],
            0.5,
            [255, 0, 0, 0.75],
            1,
            [255, 0, 0, 1],
          ],
        },
      });

      // Store refs
      forestLayerRef.current = forestLayer;
      deadwoodLayerRef.current = deadwoodLayer;

      const newMap = new Map({
        target: mapContainer.current,
        // Layer order: basemap -> forest -> deadwood (deadwood on top)
        layers: [basemapLayer, forestLayer, deadwoodLayer],
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

  //update opacity of geotiff layers
  useEffect(() => {
    if (forestLayerRef.current) {
      forestLayerRef.current.setOpacity(sliderValue);
    }
    if (deadwoodLayerRef.current) {
      deadwoodLayerRef.current.setOpacity(sliderValue);
    }
  }, [sliderValue]);

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
      // Add a new click listener with the current selectedYear
      const clickHandler = (event) => handleClick(event, selectedYear);
      mapRef.current.on("click", clickHandler);

      // Clean up function to remove the listener
      return () => {
        if (mapRef.current) {
          mapRef.current.un("click", clickHandler);
        }
      };
    }
  }, [selectedYear]);

  // Update sources when year changes (use cached sources for instant switching)
  useEffect(() => {
    if (forestLayerRef.current && deadwoodLayerRef.current) {
      // Use cached sources - instant if already loaded
      forestLayerRef.current.setSource(getCachedForestSource(selectedYear));
      deadwoodLayerRef.current.setSource(getCachedDeadwoodSource(selectedYear));
    }
  }, [selectedYear]);

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
        <div className="absolute bottom-2 left-4 z-20">
          <SideSelectionButtons />
        </div>
        <div className="absolute bottom-2 right-4 z-50">
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
