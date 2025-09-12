import { useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button, Space } from "antd";
import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import TileLayerWebGL from "ol/layer/WebGLTile.js";
import { XYZ, GeoTIFF } from "ol/source";
import { Settings } from "../config";
import { useDatasets } from "../hooks/useDatasets";
import usePolygonEditor from "../hooks/usePolygonEditor";
import useAISegmentation from "../hooks/useAISegmentation";

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

  const dataset = (datasets || []).find((d) => d.id.toString() === id);

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
    };
  }, [dataset]);

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
