import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button, Space, message } from "antd";
import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import TileLayerWebGL from "ol/layer/WebGLTile.js";
import { XYZ, GeoTIFF } from "ol/source";
import { Settings } from "../config";
import { useDatasets } from "../hooks/useDatasets";
import usePolygonEditor from "../hooks/usePolygonEditor";
import useAISegmentation from "../hooks/useAISegmentation";
import VectorTileLayer from "ol/layer/VectorTile";
import Feature from "ol/Feature";
import Geometry from "ol/geom/Geometry";
import {
  createDeadwoodVectorLayer,
  createForestCoverVectorLayer,
} from "../components/DatasetDetailsMap/createVectorLayer";

export default function DatasetLabelEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: datasets } = useDatasets();

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const editor = usePolygonEditor({ mapRef });
  const ai = useAISegmentation({
    mapRef,
    getOrthoLayer: () => {
      if (!mapRef.current) return undefined;
      const layers = mapRef.current.getLayers().getArray();
      for (const l of layers) {
        if (l instanceof TileLayerWebGL) return l as TileLayerWebGL;
      }
      return undefined;
    },
    getTargetVectorSource: () => editor.getOverlayLayer()?.getSource() || null,
  });

  const [activeLayer] = useState<"deadwood" | "forest_cover">("deadwood");
  const [serverLayerRef, setServerLayerRef] = useState<VectorTileLayer | null>(null);
  const [baseServerStyle, setBaseServerStyle] = useState<((f: Feature<Geometry>) => any) | null>(null);
  const [hiddenIds, setHiddenIds] = useState<Set<string | number>>(new Set());

  const dataset = useMemo(() => (datasets || []).find((d) => d.id.toString() === id), [datasets, id]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current || !dataset) return;

    const basemapLayer = new TileLayer({
      preload: 0,
      source: new XYZ({
        url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
        attributions: "© OpenStreetMap contributors",
        maxZoom: 19,
        tileSize: 256,
      }),
    });

    let orthoCogLayer: TileLayerWebGL | undefined;
    if (dataset.cog_path) {
      orthoCogLayer = new TileLayerWebGL({
        source: new GeoTIFF({
          sources: [
            {
              url: Settings.COG_BASE_URL + dataset.cog_path,
              nodata: 0,
              bands: [1, 2, 3],
            },
          ],
          convertToRGB: true,
        }),
        maxZoom: 23,
        cacheSize: 4096,
        preload: 0,
      });
    }

    const view = new View({
      center: [0, 0],
      zoom: 2,
      maxZoom: 23,
      projection: "EPSG:3857",
    });

    const map = new Map({
      target: mapContainerRef.current,
      layers: orthoCogLayer ? [basemapLayer, orthoCogLayer] : [basemapLayer],
      view,
      controls: [],
    });

    mapRef.current = map;

    if (orthoCogLayer) {
      const source = orthoCogLayer.getSource();
      source
        ?.getView()
        .then((viewOptions) => {
          if (viewOptions?.extent) {
            map.getView().fit(viewOptions.extent);
          }
        })
        .catch(() => {
          // ignore fit errors for MVP
        });
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.setTarget(undefined);
        mapRef.current = null;
      }
      setServerLayerRef(null);
      setBaseServerStyle(null);
    };
  }, [dataset]);

  // Swap prediction layer when activeLayer changes
  useEffect(() => {
    if (!mapRef.current || !dataset) return;
    const map = mapRef.current;

    // Remove existing server layer
    if (serverLayerRef) {
      map.removeLayer(serverLayerRef);
    }

    let newLayer: VectorTileLayer | undefined;
    if (activeLayer === "deadwood") {
      newLayer = createDeadwoodVectorLayer((dataset as any)?.deadwood_label_id || undefined);
    } else {
      newLayer = createForestCoverVectorLayer((dataset as any)?.forest_cover_label_id || undefined);
    }

    if (newLayer) {
      map.addLayer(newLayer);
      setServerLayerRef(newLayer);
      const base = newLayer.getStyleFunction ? newLayer.getStyleFunction() : null;
      setBaseServerStyle(base as any);
    } else {
      setServerLayerRef(null);
      setBaseServerStyle(null);
    }
  }, [activeLayer, dataset]);

  // Style masking to hide features currently checked out in overlay
  useEffect(() => {
    if (!serverLayerRef) return;
    const base = baseServerStyle;
    const layer = serverLayerRef;
    const styleFn = (feature: Feature<Geometry> | any) => {
      const idVal = (feature as Feature<Geometry>).get?.("id");
      if (idVal !== undefined && hiddenIds.has(idVal)) return null as any;
      return base ? (base as any)(feature) : undefined;
    };
    layer.setStyle(styleFn as any);
    return () => {
      if (layer && base) {
        layer.setStyle(base as any);
      }
    };
  }, [serverLayerRef, baseServerStyle, hiddenIds]);

  // Copy-on-select: on single click on server layer, copy feature into overlay and hide it in server layer
  useEffect(() => {
    if (!mapRef.current || !serverLayerRef) return;
    const map = mapRef.current;

    const handleClick = (evt: any) => {
      if (!editor.isEditing) return;
      let picked: Feature<Geometry> | null = null;
      map.forEachFeatureAtPixel(
        evt.pixel,
        (f, layer) => {
          if (layer === serverLayerRef) {
            picked = f as unknown as Feature<Geometry>;
            return true;
          }
          return false;
        },
        { hitTolerance: 3 },
      );

      if (!picked) return;
      const idVal = (picked as Feature<Geometry>).get("id");
      if (idVal === undefined) {
        message.warning("Feature has no id; cannot edit this feature.");
        return;
      }

      const geom = (picked as Feature<Geometry>).getGeometry();
      if (!geom) return;

      const clone = (picked as Feature<Geometry>).clone() as Feature<Geometry>;
      // Preserve original id so delete/clear can unhide
      try {
        clone.set("id", idVal);
      } catch {}
      editor.getOverlayLayer()?.getSource()?.addFeature(clone);

      setHiddenIds((prev) => {
        const next = new Set(prev);
        next.add(idVal);
        return next;
      });
      map.render();
    };

    map.on("click", handleClick);
    return () => {
      map.un("click", handleClick);
    };
  }, [editor, serverLayerRef]);

  if (!dataset) {
    return <div className="p-4">Loading dataset...</div>;
  }

  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex items-center justify-between p-2">
        <div className="text-sm font-medium">Label Editor — Dataset #{dataset.id}</div>
        <div className="flex items-center gap-2">
          <Space size="small">
            {!editor.isEditing ? (
              <Button type="primary" onClick={editor.startEditing} size="small">
                Start Editing
              </Button>
            ) : (
              <>
                <Button size="small" onClick={() => editor.toggleDraw(true)} disabled={editor.isDrawing}>
                  Draw
                </Button>
                <Button size="small" onClick={() => editor.toggleDraw(false)} disabled={!editor.isDrawing}>
                  Stop Draw
                </Button>
                <Button size="small" onClick={ai.enable} disabled={!ai.canUse || ai.isActive || ai.isProcessing}>
                  Segment (Box)
                </Button>
                <Button size="small" onClick={editor.deleteSelected} disabled={editor.selection.length === 0}>
                  Delete Selected
                </Button>
                <Button size="small" onClick={editor.clearAll}>
                  Clear All
                </Button>
                <Button danger size="small" onClick={editor.stopEditing}>
                  Exit Edit
                </Button>
              </>
            )}
            <Button onClick={() => navigate(-1)} size="small">
              Back
            </Button>
          </Space>
        </div>
      </div>
      <div className="flex-1" ref={mapContainerRef} />
    </div>
  );
}
