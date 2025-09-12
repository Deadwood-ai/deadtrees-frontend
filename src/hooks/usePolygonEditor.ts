import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Map from "ol/Map";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import { Draw, Modify, Select } from "ol/interaction";
import Feature from "ol/Feature";
import Geometry from "ol/geom/Geometry";
import { Style, Fill, Stroke } from "ol/style";

export interface UsePolygonEditorParams {
  mapRef: React.RefObject<Map | null>;
}

export interface UsePolygonEditorReturn {
  isEditing: boolean;
  startEditing: () => void;
  stopEditing: () => void;
  selection: Feature<Geometry>[];
  isDrawing: boolean;
  toggleDraw: (on?: boolean) => void;
  deleteSelected: () => void;
  clearAll: () => void;
  getOverlayLayer: () => VectorLayer<VectorSource> | null;
}

export default function usePolygonEditor({ mapRef }: UsePolygonEditorParams): UsePolygonEditorReturn {
  const [isEditing, setIsEditing] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [selection, setSelection] = useState<Feature<Geometry>[]>([]);

  const overlayLayerRef = useRef<VectorLayer<VectorSource<Feature<Geometry>>> | null>(null);
  const selectRef = useRef<Select | null>(null);
  const modifyRef = useRef<Modify | null>(null);
  const drawRef = useRef<Draw | null>(null);

  const ensureOverlay = useCallback(() => {
    if (!mapRef.current) return;
    if (overlayLayerRef.current) return;

    const source = new VectorSource<Feature<Geometry>>({ wrapX: false } as any);
    const layer = new VectorLayer({
      source: source as unknown as VectorSource,
      style: new Style({
        fill: new Fill({ color: "rgba(0, 153, 255, 0.2)" }),
        stroke: new Stroke({ color: "#0099ff", width: 2 }),
      }),
      updateWhileAnimating: false,
      updateWhileInteracting: false,
    });

    mapRef.current.addLayer(layer);
    overlayLayerRef.current = layer as unknown as VectorLayer<VectorSource<Feature<Geometry>>>;
  }, [mapRef]);

  const startEditing = useCallback(() => {
    if (!mapRef.current || isEditing) return;

    ensureOverlay();

    const overlay = overlayLayerRef.current!;

    // Select interaction limited to overlay layer
    const select = new Select({ layers: [overlay] });
    mapRef.current.addInteraction(select);
    selectRef.current = select;

    // Track selection changes
    const selectedCollection = select.getFeatures();
    const updateSelection = () => setSelection(selectedCollection.getArray() as Feature<Geometry>[]);
    selectedCollection.on(["add", "remove"], updateSelection);

    // Modify interaction, active only when selection exists
    const modify = new Modify({ features: selectedCollection });
    modify.setActive(selectedCollection.getLength() > 0);
    mapRef.current.addInteraction(modify);
    modifyRef.current = modify;

    const updateModifyActive = () => {
      modify.setActive(selectedCollection.getLength() > 0);
      setSelection(selectedCollection.getArray() as Feature<Geometry>[]);
    };
    selectedCollection.on(["add", "remove"], updateModifyActive);

    // Draw interaction created lazily on toggle
    setIsEditing(true);
  }, [ensureOverlay, isEditing, mapRef]);

  const stopEditing = useCallback(() => {
    if (!mapRef.current || !isEditing) return;

    // Remove interactions
    if (drawRef.current) {
      mapRef.current.removeInteraction(drawRef.current);
      drawRef.current = null;
    }
    if (modifyRef.current) {
      mapRef.current.removeInteraction(modifyRef.current);
      modifyRef.current = null;
    }
    if (selectRef.current) {
      mapRef.current.removeInteraction(selectRef.current);
      selectRef.current = null;
    }

    // Keep overlay for now; page unmount clears it. Clear selection/draw flags
    setSelection([]);
    setIsDrawing(false);
    setIsEditing(false);
  }, [isEditing, mapRef]);

  const toggleDraw = useCallback(
    (on?: boolean) => {
      if (!mapRef.current) return;
      ensureOverlay();

      const shouldEnable = typeof on === "boolean" ? on : !isDrawing;
      if (shouldEnable) {
        if (drawRef.current) return;
        const overlay = overlayLayerRef.current!;
        const source = overlay.getSource() as VectorSource<Feature<Geometry>> | null;
        const draw = new Draw({ source: (source as unknown as VectorSource)!, type: "Polygon" });
        mapRef.current.addInteraction(draw);
        drawRef.current = draw;
        setIsDrawing(true);
      } else {
        if (!drawRef.current) return;
        mapRef.current.removeInteraction(drawRef.current);
        drawRef.current = null;
        setIsDrawing(false);
      }
    },
    [ensureOverlay, isDrawing, mapRef],
  );

  const deleteSelected = useCallback(() => {
    const overlay = overlayLayerRef.current;
    const select = selectRef.current;
    if (!overlay || !select) return;
    const source = overlay.getSource() as VectorSource<Feature<Geometry>> | null;
    if (!source) return;

    const features = select.getFeatures().getArray() as Feature<Geometry>[];
    features.forEach((f) => source.removeFeature(f));
    select.getFeatures().clear();
    setSelection([]);
  }, []);

  const clearAll = useCallback(() => {
    const overlay = overlayLayerRef.current;
    if (!overlay) return;
    const source = overlay.getSource() as VectorSource<Feature<Geometry>> | null;
    source?.clear();
    if (selectRef.current) selectRef.current.getFeatures().clear();
    setSelection([]);
  }, []);

  // Cleanup overlay layer on unmount
  useEffect(() => {
    return () => {
      if (!mapRef.current) return;
      if (drawRef.current) mapRef.current.removeInteraction(drawRef.current);
      if (modifyRef.current) mapRef.current.removeInteraction(modifyRef.current);
      if (selectRef.current) mapRef.current.removeInteraction(selectRef.current);
      if (overlayLayerRef.current) {
        try {
          mapRef.current.removeLayer(overlayLayerRef.current);
        } catch (_) {
          // ignore
        }
        overlayLayerRef.current = null;
      }
    };
  }, [mapRef]);

  return useMemo(
    () => ({
      isEditing,
      startEditing,
      stopEditing,
      selection,
      isDrawing,
      toggleDraw,
      deleteSelected,
      clearAll,
      getOverlayLayer: () => (overlayLayerRef.current as unknown as VectorLayer<VectorSource>) || null,
    }),
    [clearAll, deleteSelected, isDrawing, isEditing, selection, startEditing, stopEditing, toggleDraw],
  );
}
