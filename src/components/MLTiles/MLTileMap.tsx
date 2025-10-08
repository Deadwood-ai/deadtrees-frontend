import { useEffect, useMemo, useRef, useCallback } from "react";
import { Map, View } from "ol";
import TileLayer from "ol/layer/Tile";
import { XYZ } from "ol/source";
import TileLayerWebGL from "ol/layer/WebGLTile";
import { GeoTIFF } from "ol/source";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import type Layer from "ol/layer/Layer";
import { Style, Stroke, Fill } from "ol/style";
import Feature from "ol/Feature";
import { Polygon } from "ol/geom";
import GeoJSON from "ol/format/GeoJSON";
import { Translate, Select } from "ol/interaction";
import { click } from "ol/events/condition";
import { polygon as turfPolygon, multiPolygon as turfMultiPolygon, intersect, area } from "@turf/turf";
import { useUpdateTileGeometry } from "../../hooks/useMLTiles";
import "ol/ol.css";
import { message } from "antd";
import { IMLTile, TileResolution } from "../../types/mlTiles";
import { useDatasetAOI } from "../../hooks/useDatasetAudit";
import { Settings } from "../../config";

interface Props {
  datasetId: number;
  cogPath?: string | null;
  resolution?: TileResolution;
  tiles: IMLTile[] | undefined;
  onTileSelected?: (tile: IMLTile | null) => void;
  focusTileId?: number | null;
  enableTranslation?: boolean;
}

const TARGET_TILE_SIZE_M: Record<TileResolution, number> = {
  20: 204.8,
  10: 102.4,
  5: 51.2,
};

export default function MLTileMap({
  datasetId,
  cogPath,
  resolution = 20,
  tiles,
  onTileSelected,
  focusTileId,
  enableTranslation = false,
}: Props) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const tileLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const orthoLayerRef = useRef<TileLayerWebGL | null>(null);
  const aoiLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const translateRef = useRef<Translate | null>(null);
  const selectRef = useRef<Select | null>(null);
  const hasInitialFitRef = useRef<boolean>(false);
  const tilesRef = useRef<IMLTile[] | undefined>(tiles);
  const { mutate: updateTileGeometry } = useUpdateTileGeometry();
  const { data: aoiData } = useDatasetAOI(datasetId);

  // Keep tilesRef in sync with tiles prop
  useEffect(() => {
    tilesRef.current = tiles;
  }, [tiles]);

  const geoJsonFormatter = useMemo(() => new GeoJSON(), []);
  const aoiGeometry = useMemo(() => {
    if (!aoiData?.geometry) return null;
    try {
      return geoJsonFormatter.readGeometry(aoiData.geometry, {
        dataProjection: "EPSG:4326",
        featureProjection: "EPSG:3857",
      });
    } catch (err) {
      console.warn("Failed to parse AOI geometry", err);
      return null;
    }
  }, [aoiData?.geometry, geoJsonFormatter]);

  const aoiTurf = useMemo(() => {
    if (!aoiGeometry) return null;
    const geoObject = geoJsonFormatter.writeGeometryObject(aoiGeometry) as GeoJSON.Geometry;
    if (geoObject.type === "Polygon") {
      return turfPolygon(geoObject.coordinates as GeoJSON.Position[][]);
    }
    if (geoObject.type === "MultiPolygon") {
      return turfMultiPolygon(geoObject.coordinates as GeoJSON.Position[][][]);
    }
    return null;
  }, [aoiGeometry, geoJsonFormatter]);

  const validatePlacementAgainstAOI = useCallback(
    (tileGeom: GeoJSON.Polygon) => {
      if (!aoiTurf) return { ok: true, overlapPercent: null };
      const tilePoly = turfPolygon(tileGeom.coordinates as GeoJSON.Position[][]);
      // @ts-expect-error - turf types are incompatible but runtime works correctly
      const overlap = intersect(tilePoly, aoiTurf);
      if (!overlap) {
        return { ok: false, message: "Tile must intersect the AOI." };
      }
      const overlapPercent = (area(overlap) / area(tilePoly)) * 100;
      if (overlapPercent < 60) {
        return { ok: false, message: `AOI coverage is ${overlapPercent.toFixed(1)}%. Minimum is 60%.` };
      }
      return { ok: true, overlapPercent };
    },
    [aoiTurf],
  );

  const hasOverlapWithExistingTiles = useCallback(
    (tileGeom: GeoJSON.Polygon, excludeId?: number) => {
      if (!tiles?.length) return false;
      const candidate = turfPolygon(tileGeom.coordinates as GeoJSON.Position[][]);
      return tiles.some((t) => {
        if (excludeId && t.id === excludeId) return false;
        const existing = turfPolygon((t.geometry as GeoJSON.Polygon).coordinates as GeoJSON.Position[][]);
        // @ts-expect-error - turf types are incompatible but runtime works correctly
        return !!intersect(candidate, existing);
      });
    },
    [tiles],
  );

  // Initialize OL map and vector layers
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const basemap = new TileLayer({
      source: new XYZ({ url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png" }),
    });

    const vector = new VectorLayer({
      source: new VectorSource(),
      style: (feature) => {
        const status = feature.get("status") as string;
        const isSelected = feature.get("isSelected") as boolean;
        let fillColor = "rgba(156,163,175,0.15)"; // gray for pending
        let strokeColor = "#9ca3af"; // gray
        let strokeWidth = 2;

        if (status === "good") {
          fillColor = "rgba(34,197,94,0.15)"; // green
          strokeColor = "#22c55e";
        } else if (status === "bad") {
          fillColor = "rgba(239,68,68,0.15)"; // red
          strokeColor = "#ef4444";
        }

        // Highlight selected tile
        if (isSelected) {
          strokeColor = "#1890ff"; // blue
          strokeWidth = 4;
          fillColor = fillColor.replace("0.15", "0.25"); // slightly more opaque
        }

        return new Style({
          fill: new Fill({ color: fillColor }),
          stroke: new Stroke({ color: strokeColor, width: strokeWidth }),
        });
      },
    });

    const aoiLayer = new VectorLayer({
      source: new VectorSource(),
      style: new Style({
        fill: new Fill({ color: "rgba(0,0,0,0.05)" }),
        stroke: new Stroke({ color: "#444", width: 1 }),
      }),
    });
    aoiLayerRef.current = aoiLayer;

    const view = new View({ center: [0, 0], zoom: 2, projection: "EPSG:3857" });

    const layers: (TileLayer<XYZ> | TileLayerWebGL | VectorLayer<VectorSource>)[] = [basemap];
    if (cogPath) {
      const ortho = new TileLayerWebGL({
        source: new GeoTIFF({
          sources: [
            {
              url: Settings.COG_BASE_URL + cogPath,
              nodata: 0,
              bands: [1, 2, 3],
            },
          ],
          convertToRGB: true,
        }),
        maxZoom: 23,
        cacheSize: 1024,
        preload: 0,
      });
      orthoLayerRef.current = ortho;
      layers.push(ortho);
    }
    layers.push(aoiLayer, vector);

    const map = new Map({
      target: mapContainerRef.current,
      layers,
      view,
      controls: [],
    });

    setTimeout(() => map.updateSize(), 0);
    const handleResize = () => map.updateSize();
    window.addEventListener("resize", handleResize);
    const ro = new ResizeObserver(() => map.updateSize());
    ro.observe(mapContainerRef.current);

    const select = new Select({ condition: click, layers: [vector] as Layer[] });
    map.addInteraction(select);
    select.on("select", (e) => {
      const f = e.selected?.[0] as Feature<Polygon> | undefined;
      if (!f) {
        onTileSelected?.(null);
        return;
      }
      const tileId = f.get("tileId") as number | undefined;
      // Use tilesRef.current to access the latest tiles array
      const tile = tilesRef.current?.find((t) => t.id === tileId) || null;
      onTileSelected?.(tile || null);
    });
    selectRef.current = select;

    // Only enable translation if explicitly allowed and only for base tiles (20cm) with pending status
    const translate = new Translate({
      layers: [vector] as Layer[],
      filter: (feature) => {
        if (!enableTranslation) return false;
        // Use tilesRef.current to access the latest tiles array
        const tile = tilesRef.current?.find((t) => t.id === feature.get("tileId"));
        if (!tile) return false;
        // Only allow translation of base tiles (20cm) that are pending
        return tile.resolution_cm === 20 && tile.status === "pending";
      },
    });
    map.addInteraction(translate);
    translate.on("translateend", (evt) => {
      const feature = evt.features?.item(0) as Feature<Polygon> | undefined;
      if (!feature) return;
      const tileId = feature.get("tileId") as number | undefined;
      if (!tileId) return;
      const geom = feature.getGeometry();
      if (!geom) return;

      const corrected = enforceTileDimensions(geom as Polygon, resolution);
      feature.setGeometry(corrected);
      const gjCorrected = geoJsonFormatter.writeGeometryObject(corrected) as GeoJSON.Polygon;

      const placementValidation = validatePlacementAgainstAOI(gjCorrected);
      if (!placementValidation.ok) {
        message.error(placementValidation.message || "Tile placement invalid");
        return;
      }
      if (hasOverlapWithExistingTiles(gjCorrected, tileId)) {
        message.error("Tile overlaps an existing tile");
        return;
      }

      updateTileGeometry({
        tileId,
        geometry: gjCorrected,
        bbox: polygonToBBoxShort(gjCorrected),
        aoiCoveragePercent: placementValidation.overlapPercent ? Math.round(placementValidation.overlapPercent) : null,
      });
      // Use tilesRef.current to access the latest tiles array
      onTileSelected?.(tilesRef.current?.find((t) => t.id === tileId) || null);
    });

    mapRef.current = map;
    tileLayerRef.current = vector;
    translateRef.current = translate;

    return () => {
      map.setTarget(undefined);
      window.removeEventListener("resize", handleResize);
      ro.disconnect();
      mapRef.current = null;
      tileLayerRef.current = null;
      translateRef.current = null;
      selectRef.current = null;
    };
  }, []);

  // Render features when tiles change
  useEffect(() => {
    const layer = tileLayerRef.current;
    const map = mapRef.current;
    const select = selectRef.current;
    if (!layer || !map) return;
    const src = layer.getSource();
    if (!src) return;

    src.clear();

    // Re-add all features
    const newFeatures: Feature[] = [];
    (tiles || []).forEach((t) => {
      const feature = new Feature({
        geometry: geoJsonFormatter.readGeometry(t.geometry, {
          dataProjection: "EPSG:3857",
          featureProjection: "EPSG:3857",
        }) as Polygon,
      });
      feature.set("tileId", t.id);
      feature.set("status", t.status);
      feature.set("isSelected", t.id === focusTileId);
      src.addFeature(feature);
      newFeatures.push(feature);
    });

    // Sync selection with focusTileId if it exists
    if (select && focusTileId) {
      const featureToSelect = newFeatures.find((f) => f.get("tileId") === focusTileId);
      if (featureToSelect) {
        select.getFeatures().clear();
        select.getFeatures().push(featureToSelect);
      }
    }

    // Only auto-fit on first load if tiles exist and we haven't done initial fit yet
    if (tiles && tiles.length > 0 && !hasInitialFitRef.current) {
      const extent = src.getExtent();
      map.getView().fit(extent, { padding: [50, 50, 50, 50], maxZoom: 18, duration: 500 });
      hasInitialFitRef.current = true;
    }
  }, [tiles, geoJsonFormatter, focusTileId]);

  // Render AOI and fit view
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    const aoiLayer = aoiLayerRef.current;
    if (!aoiLayer) return;
    const src = aoiLayer.getSource();
    if (!src) return;
    src.clear();
    if (aoiGeometry) {
      const feature = new Feature({ geometry: aoiGeometry });
      src.addFeature(feature);
      const extent = aoiGeometry.getExtent();
      map.getView().fit(extent, { padding: [20, 20, 20, 20], maxZoom: 19, duration: 200 });
    }
    if (orthoLayerRef.current) {
      const source = orthoLayerRef.current.getSource();
      source
        ?.getView()
        .then((vo) => {
          const viewOptions = vo as { extent?: [number, number, number, number] };
          if (viewOptions?.extent) {
            map.getView().fit(viewOptions.extent, { padding: [20, 20, 20, 20], maxZoom: 19, duration: 200 });
          }
        })
        .catch(() => {});
    }
  }, [aoiGeometry, cogPath]);

  // Zoom to specific tile and sync selection when focusTileId changes
  useEffect(() => {
    if (!mapRef.current || !focusTileId || !tiles) return;

    const tile = tiles.find((t) => t.id === focusTileId);
    if (!tile) return;

    // Sync the OpenLayers Select interaction with focusTileId
    const select = selectRef.current;
    const layer = tileLayerRef.current;
    if (select && layer) {
      const src = layer.getSource();
      if (src) {
        // Find the feature with matching tileId
        const features = src.getFeatures();
        const featureToSelect = features.find((f) => f.get("tileId") === focusTileId);

        if (featureToSelect) {
          // Clear current selection and select the new feature
          select.getFeatures().clear();
          select.getFeatures().push(featureToSelect);

          // Update isSelected property on all features
          features.forEach((f) => {
            f.set("isSelected", f.get("tileId") === focusTileId);
          });
        }
      }
    }

    try {
      const geometry = geoJsonFormatter.readGeometry(tile.geometry, {
        dataProjection: "EPSG:3857",
        featureProjection: "EPSG:3857",
      });
      const extent = geometry.getExtent();
      const view = mapRef.current.getView();

      // Use fit with padding for smooth animation
      view.fit(extent, {
        padding: [80, 80, 80, 80],
        maxZoom: 19,
        duration: 400,
      });
    } catch (error) {
      console.error("Failed to zoom to tile:", error);
    }
  }, [focusTileId, tiles, geoJsonFormatter]);

  return (
    <div className="relative h-full w-full">
      <div ref={mapContainerRef} className="h-full w-full bg-gray-100" />
    </div>
  );
}

function enforceTileDimensions(geometry: Polygon, resolution: TileResolution): Polygon {
  const size = TARGET_TILE_SIZE_M[resolution];
  const extent = geometry.getExtent();
  const cx = (extent[0] + extent[2]) / 2;
  const cy = (extent[1] + extent[3]) / 2;
  const half = size / 2;
  return new Polygon([
    [
      [cx - half, cy - half],
      [cx + half, cy - half],
      [cx + half, cy + half],
      [cx - half, cy + half],
      [cx - half, cy - half],
    ],
  ]);
}

function polygonToBBoxShort(geometry: GeoJSON.Polygon): { minx: number; miny: number; maxx: number; maxy: number } {
  const coords = geometry.coordinates[0];
  const [minx, miny] = coords[0];
  const [maxx, maxy] = coords[2];
  return { minx, miny, maxx, maxy };
}
