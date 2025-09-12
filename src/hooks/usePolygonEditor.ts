import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Map from "ol/Map";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import { Draw, Modify, Select } from "ol/interaction";
import Feature from "ol/Feature";
import Geometry from "ol/geom/Geometry";
import { Style, Fill, Stroke } from "ol/style";
import MapBrowserEvent from "ol/MapBrowserEvent";

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
  const hoveredFeatureRef = useRef<Feature<Geometry> | null>(null);
  const pointerMoveListenerRef = useRef<((evt: MapBrowserEvent<UIEvent>) => void) | null>(null);
  const clickListenerRef = useRef<((evt: MapBrowserEvent<UIEvent>) => void) | null>(null);

  const ensureOverlay = useCallback(() => {
    if (!mapRef.current) return;
    if (overlayLayerRef.current) return;

    const source = new VectorSource<Feature<Geometry>>({ wrapX: false } as unknown as { wrapX: boolean });

    // Base (unselected) style: subtle blue
    const baseStyle = new Style({
      fill: new Fill({ color: "rgba(59,130,246,0.10)" }), // blue-500 @ 10%
      stroke: new Stroke({ color: "#3b82f6", width: 2 }), // blue-500
    });

    const layer = new VectorLayer({
      source: source as unknown as VectorSource,
      style: baseStyle,
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
    // Selected style: green highlight
    const selectedStyle = new Style({
      fill: new Fill({ color: "rgba(34,197,94,0.15)" }), // green-500 @ 15%
      stroke: new Stroke({ color: "#22c55e", width: 3 }), // green-500
    });

    const select = new Select({ layers: [overlay], style: selectedStyle });
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

    // If a feature becomes selected, clear any hover style so selection style is visible
    selectedCollection.on(["add"], () => {
      if (hoveredFeatureRef.current) {
        try {
          hoveredFeatureRef.current.setStyle(undefined);
        } catch (e) {
          // ignore
        }
        hoveredFeatureRef.current = null;
      }
    });

    // Hover highlight handler
    // Hover style: deeper blue
    const hoverStyle = new Style({
      fill: new Fill({ color: "rgba(29,78,216,0.12)" }), // blue-700 @ 12%
      stroke: new Stroke({ color: "#1d4ed8", width: 3 }), // blue-700
    });
    const handlePointerMove = (evt: MapBrowserEvent<UIEvent>) => {
      if (!mapRef.current || !overlayLayerRef.current) return;
      let hitFeature: Feature<Geometry> | null = null;
      mapRef.current.forEachFeatureAtPixel(
        evt.pixel,
        (f, layer) => {
          if (layer === overlayLayerRef.current) {
            // Ignore temporary bbox features from AI segmentation
            try {
              if ((f as Feature<Geometry>).get && (f as Feature<Geometry>).get("dt_role") === "bbox") {
                return false;
              }
            } catch (e) {
              // ignore
            }
            hitFeature = f as Feature<Geometry>;
            return true;
          }
          return false;
        },
        { hitTolerance: 4 },
      );
      // Do not apply hover style for selected features
      if (hitFeature && selectedCollection.getArray().includes(hitFeature as unknown as Feature<Geometry>)) {
        hitFeature = null;
      }

      if (hoveredFeatureRef.current && hoveredFeatureRef.current !== hitFeature) {
        try {
          hoveredFeatureRef.current.setStyle(undefined);
        } catch (e) {
          // ignore
        }
        hoveredFeatureRef.current = null;
      }

      if (hitFeature && hoveredFeatureRef.current !== hitFeature) {
        hoveredFeatureRef.current = hitFeature as Feature<Geometry>;
        try {
          (hitFeature as Feature<Geometry>).setStyle(hoverStyle);
        } catch (e) {
          // ignore
        }
      }
    };
    mapRef.current.on("pointermove", handlePointerMove);
    pointerMoveListenerRef.current = handlePointerMove;

    // Click outside to clear selection (keeps toolbar in sync)
    const handleMapClick = (evt: MapBrowserEvent<UIEvent>) => {
      if (!mapRef.current || !overlayLayerRef.current || !selectRef.current) return;
      // If drawing, ignore (draw handles clicks)
      if (drawRef.current) return;

      let hitOverlay = false;
      mapRef.current.forEachFeatureAtPixel(
        evt.pixel,
        (_f, layer) => {
          if (layer === overlayLayerRef.current) {
            hitOverlay = true;
            return true;
          }
          return false;
        },
        { hitTolerance: 4 },
      );

      if (!hitOverlay) {
        const coll = selectRef.current.getFeatures();
        if (coll.getLength() > 0) {
          coll.clear();
          setSelection([]);
          if (modifyRef.current) modifyRef.current.setActive(false);
          if (hoveredFeatureRef.current) {
            try {
              hoveredFeatureRef.current.setStyle(undefined);
            } catch (e) {
              // ignore
            }
            hoveredFeatureRef.current = null;
          }
        }
      }
    };
    mapRef.current.on("click", handleMapClick);
    clickListenerRef.current = handleMapClick;

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

    // Remove hover handler and reset hovered style
    if (pointerMoveListenerRef.current && mapRef.current) {
      mapRef.current.un("pointermove", pointerMoveListenerRef.current);
      pointerMoveListenerRef.current = null;
    }
    if (clickListenerRef.current && mapRef.current) {
      mapRef.current.un("click", clickListenerRef.current);
      clickListenerRef.current = null;
    }
    if (hoveredFeatureRef.current) {
      try {
        hoveredFeatureRef.current.setStyle(undefined);
      } catch (e) {
        // ignore
      }
      hoveredFeatureRef.current = null;
    }
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
    // Remove edited ids from hidden set stored on overlay layer for unmasking
    try {
      const layerAny = overlay as unknown as { __hiddenIds?: Set<string | number> };
      if (layerAny.__hiddenIds) layerAny.__hiddenIds.clear();
    } catch (e) {
      // ignore
    }
    source?.clear();
    if (selectRef.current) selectRef.current.getFeatures().clear();
    setSelection([]);
  }, []);

  // Cleanup overlay layer on unmount
  useEffect(() => {
    const map = mapRef.current;
    return () => {
      if (!map) return;
      if (pointerMoveListenerRef.current) {
        map.un("pointermove", pointerMoveListenerRef.current);
        pointerMoveListenerRef.current = null;
      }
      if (clickListenerRef.current) {
        map.un("click", clickListenerRef.current);
        clickListenerRef.current = null;
      }
      if (drawRef.current) map.removeInteraction(drawRef.current);
      if (modifyRef.current) map.removeInteraction(modifyRef.current);
      if (selectRef.current) map.removeInteraction(selectRef.current);
      if (overlayLayerRef.current) {
        try {
          map.removeLayer(overlayLayerRef.current);
        } catch (e) {
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
