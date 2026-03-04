import { useEffect, useRef, useState } from "react";
import { Segmented } from "antd";
import "ol/ol.css";
import { Map, View } from "ol";
import TileLayer from "ol/layer/Tile";
import { XYZ } from "ol/source";
import { GeoTIFF } from "ol/source";
import TileLayerWebGL from "ol/layer/WebGLTile.js";
import { fromLonLat } from "ol/proj";

import { getDeadwoodCOGUrl, getForestCOGUrl } from "../../utils/getDeadwoodCOGUrl";
import { getWaybackTileUrl } from "../../utils/waybackVersions";

const LOCATIONS = [
  { name: "Harz Mountains", center: [10.6682, 51.7868], zoom: 12 },
  { name: "Bavarian Forest", center: [13.3309, 49.0396], zoom: 12 },
  { name: "Black Forest", center: [8.35, 48.55], zoom: 12 },
];

const YEARS = ["2018", "2020", "2022", "2024"];

const MiniSatelliteMap = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<Map | null>(null);
  const forestLayerRef = useRef<TileLayerWebGL | null>(null);
  const deadwoodLayerRef = useRef<TileLayerWebGL | null>(null);

  const [activeLocationIndex, setActiveLocationIndex] = useState(0);
  const [activeYear, setActiveYear] = useState("2024");

  useEffect(() => {
    if (!map && mapContainer.current) {
      const initialView = new View({
        center: fromLonLat(LOCATIONS[0].center),
        zoom: LOCATIONS[0].zoom,
        enableRotation: false,
      });

      const basemapLayer = new TileLayer({
        source: new XYZ({
          url: getWaybackTileUrl(31144),
          maxZoom: 19,
          crossOrigin: "anonymous",
        }),
      });

      const forestLayer = new TileLayerWebGL({
        source: new GeoTIFF({
          sources: [{ url: getForestCOGUrl(activeYear), bands: [1], min: 0, max: 255 }],
          normalize: true,
          interpolate: false,
        }),
        style: {
          color: [
            "interpolate",
            ["linear"],
            ["band", 1],
            0, [144, 238, 144, 0],
            0.1, [144, 238, 144, 0.7],
            0.55, [60, 150, 60, 0.95],
            1, [0, 70, 0, 1],
          ],
        },
      });

      const deadwoodLayer = new TileLayerWebGL({
        source: new GeoTIFF({
          sources: [{ url: getDeadwoodCOGUrl(activeYear), bands: [1], min: 0, max: 255 }],
          normalize: true,
          interpolate: false,
        }),
        style: {
          color: [
            "interpolate",
            ["linear"],
            ["band", 1],
            0, [255, 220, 150, 0],
            0.2, [255, 200, 100, 0.1],
            0.5, [255, 179, 28, 0.4],
            0.8, [204, 130, 20, 0.95],
            1, [40, 10, 60, 1],
          ],
        },
      });

      forestLayerRef.current = forestLayer;
      deadwoodLayerRef.current = deadwoodLayer;

      const newMap = new Map({
        target: mapContainer.current,
        layers: [basemapLayer, forestLayer, deadwoodLayer],
        view: initialView,
        controls: [],
        interactions: [], // keep interactions disabled so the user doesn't get stuck panning it while scrolling the page
      });

      setMap(newMap);
    }

    return () => {
      if (map) {
        map.setTarget(undefined);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Update center when location changes
  useEffect(() => {
    if (map) {
      const loc = LOCATIONS[activeLocationIndex];
      map.getView().animate({
        center: fromLonLat(loc.center),
        zoom: loc.zoom,
        duration: 800
      });
    }
  }, [activeLocationIndex, map]);

  // Update sources when year changes
  useEffect(() => {
    if (forestLayerRef.current && deadwoodLayerRef.current) {
      forestLayerRef.current.setSource(
        new GeoTIFF({
          sources: [{ url: getForestCOGUrl(activeYear), bands: [1], min: 0, max: 255 }],
          normalize: true,
          interpolate: false,
        })
      );
      deadwoodLayerRef.current.setSource(
        new GeoTIFF({
          sources: [{ url: getDeadwoodCOGUrl(activeYear), bands: [1], min: 0, max: 255 }],
          normalize: true,
          interpolate: false,
        })
      );
    }
  }, [activeYear]);

  return (
    <div className="relative h-full w-full">
      <div 
        ref={mapContainer} 
        className="absolute inset-0 h-full w-full pointer-events-none"
      />
      
      {/* Overlay gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/5 to-transparent pointer-events-none"></div>
      
      {/* Controls Container */}
      <div className="absolute inset-0 flex flex-col justify-between p-4 pointer-events-none">
        
        {/* Top Controls */}
        <div className="flex justify-end pointer-events-auto">
          <div className="rounded-lg bg-white/90 p-1 shadow-sm backdrop-blur">
            <Segmented 
              options={YEARS} 
              value={activeYear} 
              onChange={(v) => setActiveYear(v as string)}
              size="small"
            />
          </div>
        </div>

        {/* Bottom Info and Controls */}
        <div className="flex items-end justify-between px-2 pb-2">
          <div className="text-white pointer-events-none">
            <div className="font-semibold tracking-wide">LIVE PREVIEW</div>
            <div className="text-sm font-medium opacity-90">{LOCATIONS[activeLocationIndex].name}, Germany</div>
          </div>
          
          <div className="mb-1 flex gap-2 pointer-events-auto">
            {LOCATIONS.map((loc, idx) => (
              <button
                key={loc.name}
                onClick={() => setActiveLocationIndex(idx)}
                className={`h-2 w-8 rounded-full transition-all duration-300 ${
                  idx === activeLocationIndex ? "bg-[#FFB31C] w-12" : "bg-white/40 hover:bg-white/60"
                }`}
                aria-label={`Go to ${loc.name}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MiniSatelliteMap;
