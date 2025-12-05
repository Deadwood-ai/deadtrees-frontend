import { useEffect, useRef, useState, useCallback } from "react";
import { Radio, Alert, Button, Modal, Input, message } from "antd";
import { FlagOutlined } from "@ant-design/icons";
import "ol/ol.css";
import { Map, Overlay } from "ol";
import { fromLonLat, transformExtent } from "ol/proj";
import TileLayer from "ol/layer/Tile";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import { XYZ } from "ol/source";
import { GeoTIFF } from "ol/source";
import TileLayerWebGL from "ol/layer/WebGLTile.js";
import View from "ol/View";
import Feature from "ol/Feature";
import { Polygon, Point } from "ol/geom";
import { getCenter } from "ol/extent";
import { Draw } from "ol/interaction";
import { createBox } from "ol/interaction/Draw";
import { Style, Fill, Stroke, Circle as CircleStyle } from "ol/style";
import type { FeatureLike } from "ol/Feature";
import "@geoapify/geocoder-autocomplete/styles/round-borders.css";
import "./geocoder.css";
import { GeoapifyContext, GeoapifyGeocoderAutocomplete } from "@geoapify/react-geocoder-autocomplete";

import "./popup.css";
import getPixelValueOfCoordinate from "../../utils/getPixelValueOfCoordinate";
import MapStyleSwitchButtons from "./MapStyleSwitchButtons";
import { getDeadwoodCOGUrl, getForestCOGUrl } from "../../utils/getDeadwoodCOGUrl";
import DeadwoodCard from "./DeadwoodCard";
import { useDatasetMap } from "../../hooks/useDatasetMapProvider";
import { useAuth } from "../../hooks/useAuthProvider";
import { useMapFlags, useCreateMapFlag } from "../../hooks/useMapFlags";
import type { IMapFlag } from "../../types/mapFlags";

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

  // Flag feature state
  const [isDrawingFlag, setIsDrawingFlag] = useState(false);
  const [flagModalOpen, setFlagModalOpen] = useState(false);
  const [pendingFlagBbox, setPendingFlagBbox] = useState<[number, number, number, number] | null>(null);
  const [flagDescription, setFlagDescription] = useState("");
  const [showFlagsLayer, setShowFlagsLayer] = useState(true);
  const [currentZoom, setCurrentZoom] = useState<number>(DeadwoodMapViewport.zoom || 10);
  const flagsLayerRef = useRef<VectorLayer<VectorSource<Feature<Polygon>>> | null>(null);
  const drawInteractionRef = useRef<Draw | null>(null);
  const flagHoverOverlayRef = useRef<Overlay | null>(null);

  // Auth and flags hooks
  const { user } = useAuth();
  const { data: mapFlags = [] } = useMapFlags();
  const createFlagMutation = useCreateMapFlag();

  // handler functions
  const handleClick = async (event: { coordinate: number[] }, year: string, skipIfDrawing: boolean) => {
    // Skip click handling when drawing flag bbox
    if (skipIfDrawing) return;
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
            [34, 139, 34, 0.6],
            0.3,
            [34, 139, 34, 0.7],
            0.5,
            [34, 139, 34, 0.8],
            0.7,
            [34, 139, 34, 0.9],
            1,
            [0, 100, 0, 1],
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
            0.07,
            [255, 0, 0, 0],
            0.25,
            [255, 0, 0, 0.7],
            0.5,
            [255, 0, 0, 0.8],
            0.75,
            [255, 0, 0, 0.9],
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

      // Create flag hover overlay
      const flagPopupElement = document.createElement("div");
      flagPopupElement.id = "flag-popup";
      flagPopupElement.className = "ol-popup";
      flagPopupElement.style.cssText =
        "background: white; padding: 8px 12px; border-radius: 6px; box-shadow: 0 2px 8px rgba(0,0,0,0.15); font-size: 12px; max-width: 250px; pointer-events: none;";

      const flagHoverOverlay = new Overlay({
        element: flagPopupElement,
        positioning: "bottom-center",
        offset: [0, -10],
      });
      newMap.addOverlay(flagHoverOverlay);
      flagHoverOverlayRef.current = flagHoverOverlay;

      newMap.on("moveend", () => {
        const zoom = newMap.getView().getZoom();
        setDeadwoodMapViewport({
          center: newMap.getView().getCenter(),
          zoom: zoom,
        });
        setCurrentZoom(zoom || 10);
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
      const clickHandler = (event) => handleClick(event, selectedYear, isDrawingFlag);
      mapRef.current.on("click", clickHandler);

      // Clean up function to remove the listener
      return () => {
        if (mapRef.current) {
          mapRef.current.un("click", clickHandler);
        }
      };
    }
  }, [selectedYear, isDrawingFlag]);

  // Update sources when year changes (use cached sources for instant switching)
  useEffect(() => {
    if (forestLayerRef.current && deadwoodLayerRef.current) {
      // Use cached sources - instant if already loaded
      forestLayerRef.current.setSource(getCachedForestSource(selectedYear));
      deadwoodLayerRef.current.setSource(getCachedDeadwoodSource(selectedYear));
    }
  }, [selectedYear]);

  // Zoom threshold for switching between point and bbox display
  const ZOOM_THRESHOLD = 12;

  // Style function for flags - shows point at low zoom, bbox at high zoom
  const getFlagStyle = useCallback(
    (feature: FeatureLike) => {
      const showAsPoint = currentZoom < ZOOM_THRESHOLD;

      if (showAsPoint) {
        // Point style - need to return center point of the polygon geometry
        const geometry = feature.getGeometry();
        const extent = geometry?.getExtent();
        const centerPoint = extent ? new Point(getCenter(extent)) : undefined;

        return new Style({
          geometry: centerPoint, // Render at center point instead of polygon
          image: new CircleStyle({
            radius: 8,
            fill: new Fill({ color: "#1677ff" }),
            stroke: new Stroke({ color: "#ffffff", width: 2 }),
          }),
        });
      } else {
        // Bbox style
        return new Style({
          fill: new Fill({ color: "rgba(22, 119, 255, 0.15)" }),
          stroke: new Stroke({ color: "#1677ff", width: 2 }),
        });
      }
    },
    [currentZoom],
  );

  // Create and update flags layer
  useEffect(() => {
    if (!mapRef.current || !user) return;

    // Create flags layer if it doesn't exist
    if (!flagsLayerRef.current) {
      const flagsSource = new VectorSource<Feature<Polygon>>();
      const flagsLayer = new VectorLayer({
        source: flagsSource,
        style: getFlagStyle,
        zIndex: 100,
      });
      flagsLayerRef.current = flagsLayer;
      mapRef.current.addLayer(flagsLayer);

      // Add hover handler for flags
      mapRef.current.on("pointermove", (evt) => {
        if (!flagHoverOverlayRef.current || !flagsLayerRef.current) return;

        const pixel = evt.pixel;
        const feature = mapRef.current?.forEachFeatureAtPixel(pixel, (f, layer) => {
          if (layer === flagsLayerRef.current) return f;
          return undefined;
        });

        if (feature) {
          const flagId = feature.get("flagId");
          const description = feature.get("description");
          const popupElement = flagHoverOverlayRef.current.getElement();
          if (popupElement) {
            popupElement.innerHTML = `
              <div style="font-family: system-ui, sans-serif;">
                <div style="font-weight: 600; color: #1677ff; margin-bottom: 4px;">Flag #${flagId}</div>
                <div style="color: #374151; line-height: 1.4;">${description}</div>
              </div>
            `;
          }
          flagHoverOverlayRef.current.setPosition(evt.coordinate);
        } else {
          flagHoverOverlayRef.current.setPosition(undefined);
        }
      });
    } else {
      // Update style when zoom changes
      flagsLayerRef.current.setStyle(getFlagStyle);
    }

    // Update flags on the layer
    const source = flagsLayerRef.current.getSource();
    if (source) {
      source.clear();
      mapFlags.forEach((flag: IMapFlag) => {
        const [minLon, minLat, maxLon, maxLat] = flag.bbox;
        // Create polygon from bbox in EPSG:3857
        const extent = transformExtent([minLon, minLat, maxLon, maxLat], "EPSG:4326", "EPSG:3857");
        const polygon = new Polygon([
          [
            [extent[0], extent[1]],
            [extent[2], extent[1]],
            [extent[2], extent[3]],
            [extent[0], extent[3]],
            [extent[0], extent[1]],
          ],
        ]);
        const feature = new Feature({ geometry: polygon });
        feature.set("flagId", flag.id);
        feature.set("description", flag.description);
        // Store center for point rendering
        const centerX = (extent[0] + extent[2]) / 2;
        const centerY = (extent[1] + extent[3]) / 2;
        feature.set("center", [centerX, centerY]);
        source.addFeature(feature);
      });
    }
  }, [mapFlags, user, getFlagStyle]);

  // Toggle flags layer visibility
  useEffect(() => {
    if (flagsLayerRef.current) {
      flagsLayerRef.current.setVisible(showFlagsLayer);
    }
  }, [showFlagsLayer]);

  // Start drawing flag bbox
  const startFlagDrawing = useCallback(() => {
    if (!mapRef.current || isDrawingFlag) return;

    // Set crosshair cursor
    const mapElement = mapRef.current.getTargetElement();
    if (mapElement) {
      mapElement.style.cursor = "crosshair";
    }

    const source = new VectorSource<Feature<Polygon>>();
    const draw = new Draw({
      source,
      type: "Circle",
      geometryFunction: createBox(),
      style: new Style({
        fill: new Fill({ color: "rgba(22, 119, 255, 0.2)" }),
        stroke: new Stroke({ color: "#1677ff", width: 2, lineDash: [5, 5] }),
      }),
    });

    draw.on("drawend", (event) => {
      const geometry = event.feature.getGeometry() as Polygon;
      const extent = geometry.getExtent();
      // Convert extent to EPSG:4326 for storage
      const [minLon, minLat, maxLon, maxLat] = transformExtent(extent, "EPSG:3857", "EPSG:4326");
      setPendingFlagBbox([minLon, minLat, maxLon, maxLat]);
      setFlagModalOpen(true);

      // Remove draw interaction and reset cursor
      if (mapRef.current && drawInteractionRef.current) {
        mapRef.current.removeInteraction(drawInteractionRef.current);
        drawInteractionRef.current = null;
        const mapEl = mapRef.current.getTargetElement();
        if (mapEl) {
          mapEl.style.cursor = "";
        }
      }
      setIsDrawingFlag(false);
    });

    mapRef.current.addInteraction(draw);
    drawInteractionRef.current = draw;
    setIsDrawingFlag(true);
    message.info("Click and drag to draw a rectangle on the map");
  }, [isDrawingFlag]);

  // Cancel flag drawing
  const cancelFlagDrawing = useCallback(() => {
    if (mapRef.current) {
      if (drawInteractionRef.current) {
        mapRef.current.removeInteraction(drawInteractionRef.current);
        drawInteractionRef.current = null;
      }
      // Reset cursor
      const mapElement = mapRef.current.getTargetElement();
      if (mapElement) {
        mapElement.style.cursor = "";
      }
    }
    setIsDrawingFlag(false);
  }, []);

  // Submit flag
  const handleFlagSubmit = useCallback(async () => {
    if (!pendingFlagBbox || !flagDescription.trim()) {
      message.warning("Please enter a description for the flag");
      return;
    }

    try {
      await createFlagMutation.mutateAsync({
        bbox: pendingFlagBbox,
        description: flagDescription.trim(),
        year: selectedYear,
      });
      message.success("Flag added successfully");
      setFlagModalOpen(false);
      setPendingFlagBbox(null);
      setFlagDescription("");
    } catch (error) {
      message.error("Failed to add flag");
      console.error(error);
    }
  }, [pendingFlagBbox, flagDescription, selectedYear, createFlagMutation]);

  // Cancel flag modal
  const handleFlagCancel = useCallback(() => {
    setFlagModalOpen(false);
    setPendingFlagBbox(null);
    setFlagDescription("");
  }, []);

  // components ---------------------------------------------------

  const SideSelectionButtons = () => {
    return (
      <Radio.Group value={selectedSite} onChange={(e) => setSelectedSite(e.target.value)}>
        <Radio.Button value="Harz">Harz National Park</Radio.Button>
        <Radio.Button value="Waldshut">Waldshut</Radio.Button>
        <Radio.Button value="Bayern">Bavarian Forest</Radio.Button>
      </Radio.Group>
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
        <div className="absolute bottom-16 left-1/2 z-40 max-w-xl -translate-x-1/2">
          <Alert
            message="Preview visualization (alpha) — this map will evolve and improve over time."
            type="warning"
            showIcon
            closable
            // banner
          />
        </div>
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
        <div className="absolute left-4 top-24 z-50 flex flex-col gap-2">
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
          {/* Flag button - only show when logged in */}
          {user && (
            <Button
              type={isDrawingFlag ? "primary" : "default"}
              danger={isDrawingFlag}
              icon={<FlagOutlined />}
              onClick={isDrawingFlag ? cancelFlagDrawing : startFlagDrawing}
              title={isDrawingFlag ? "Cancel flagging" : "Flag an area"}
            >
              {isDrawingFlag ? "Cancel" : "Flag Area"}
            </Button>
          )}
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
            showFlagsLayer={showFlagsLayer}
            setShowFlagsLayer={setShowFlagsLayer}
            showFlagsToggle={!!user}
            flagsCount={mapFlags.length}
          />
        </div>
      </div>

      {/* Flag description modal */}
      <Modal
        title="Flag this area"
        open={flagModalOpen}
        onOk={handleFlagSubmit}
        onCancel={handleFlagCancel}
        okText="Submit Flag"
        confirmLoading={createFlagMutation.isPending}
      >
        <div className="flex flex-col gap-4">
          <p className="text-gray-600">
            Describe what you noticed in this area (e.g., incorrect prediction, missing deadwood, etc.)
          </p>
          <Input.TextArea
            value={flagDescription}
            onChange={(e) => setFlagDescription(e.target.value)}
            placeholder="Enter your description..."
            rows={4}
            maxLength={500}
            showCount
          />
          <p className="text-xs text-gray-400">Year: {selectedYear}</p>
        </div>
      </Modal>
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
