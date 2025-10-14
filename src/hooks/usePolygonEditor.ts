import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Map from "ol/Map";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import { Draw, Modify, Select } from "ol/interaction";
import { click, shiftKeyOnly } from "ol/events/condition";
import Feature from "ol/Feature";
import Geometry from "ol/geom/Geometry";
import { Style, Fill, Stroke } from "ol/style";
import MapBrowserEvent from "ol/MapBrowserEvent";
import type { FeatureLike } from "ol/Feature";
import GeoJSON from "ol/format/GeoJSON";
import { union as geomUnion, difference as geomDifference } from "../utils/geometry";
import { message } from "antd";

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
  setOverlayVisible: (visible: boolean) => void;
  mergeSelected: () => void;
  cutHoleWithDrawn: () => void;
  undo: () => void;
  canUndo: boolean;
  saveHistorySnapshot: () => void; // Exposed for AI segmentation
}

export default function usePolygonEditor({ mapRef }: UsePolygonEditorParams): UsePolygonEditorReturn {
  const [isEditing, setIsEditing] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [selection, setSelection] = useState<Feature<Geometry>[]>([]);
  const [canUndo, setCanUndo] = useState(false);

  // History stack for undo (max 20 actions)
  const historyRef = useRef<string[]>([]); // Store GeoJSON strings of feature collections
  const MAX_HISTORY = 20;

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

    // Define styles for different states
    // Default: Blue, thin stroke
    const baseStyle = new Style({
      fill: new Fill({ color: "rgba(59,130,246,0.05)" }), // blue-500 @ 5% - very light
      stroke: new Stroke({ color: "#3b82f6", width: 2 }), // blue-500, thin
    });

    // Hover: Cyan, medium stroke
    const hoverStyle = new Style({
      fill: new Fill({ color: "rgba(6,182,212,0.05)" }), // cyan-500 @ 5% - very light
      stroke: new Stroke({ color: "#06b6d4", width: 3 }), // cyan-500, medium
    });

    // Selected: Orange, thick stroke
    const selectedStyle = new Style({
      fill: new Fill({ color: "rgba(249,115,22,0.05)" }), // orange-500 @ 5% - very light
      stroke: new Stroke({ color: "#f97316", width: 4 }), // orange-500, thick
    });

    // Style function that checks feature state
    const styleFunction = (feature: FeatureLike) => {
      const isSelected = feature.get("dt_selected") === true;
      const isHovered = feature.get("dt_hovered") === true;

      if (isSelected) {
        return selectedStyle;
      } else if (isHovered) {
        return hoverStyle;
      } else {
        return baseStyle;
      }
    };

    const layer = new VectorLayer({
      source: source as unknown as VectorSource,
      style: styleFunction,
      updateWhileAnimating: false,
      updateWhileInteracting: false,
    });

    try {
      layer.setVisible(true);
      layer.setZIndex(2000);
    } catch (e) {
      // ignore
    }

    mapRef.current.addLayer(layer);
    overlayLayerRef.current = layer as unknown as VectorLayer<VectorSource<Feature<Geometry>>>;
  }, [mapRef]);

  // Save current state to history before modifications
  const saveHistory = useCallback(() => {
    const overlay = overlayLayerRef.current;
    if (!overlay) return;
    const source = overlay.getSource();
    if (!source) return;

    const features = source.getFeatures();
    const geoJsonFormatter = new GeoJSON();

    // Serialize all features to GeoJSON (excluding temporary features like AI bbox)
    const featuresGeoJSON = features
      .filter((f) => {
        // Exclude temporary features (like AI segmentation bbox)
        const role = f.get("dt_role");
        return role !== "bbox";
      })
      .map((f) => {
        const geomGeoJSON = geoJsonFormatter.writeGeometryObject(f.getGeometry()!, {
          dataProjection: "EPSG:3857",
          featureProjection: "EPSG:3857",
        });
        return {
          geometry: geomGeoJSON,
          properties: {
            label_data: f.get("label_data"),
            patch_id: f.get("patch_id"),
          },
        };
      });

    const snapshot = JSON.stringify(featuresGeoJSON);

    // Add to history (limit to MAX_HISTORY)
    historyRef.current.push(snapshot);
    if (historyRef.current.length > MAX_HISTORY) {
      historyRef.current.shift(); // Remove oldest
    }

    setCanUndo(true);
  }, [MAX_HISTORY]);

  // Undo last operation
  const undo = useCallback(() => {
    if (historyRef.current.length === 0) return;

    const overlay = overlayLayerRef.current;
    if (!overlay) return;
    const source = overlay.getSource();
    if (!source) return;

    // Pop last snapshot from history
    const snapshot = historyRef.current.pop();
    if (!snapshot) return;

    // Restore features from snapshot
    const featuresData = JSON.parse(snapshot);
    const geoJsonFormatter = new GeoJSON();

    // Clear current features
    source.clear();

    // Restore features
    featuresData.forEach((featureData: { geometry: unknown; properties: Record<string, unknown> }) => {
      const geometry = geoJsonFormatter.readGeometry(featureData.geometry, {
        dataProjection: "EPSG:3857",
        featureProjection: "EPSG:3857",
      });
      const feature = new Feature(geometry);
      feature.set("label_data", featureData.properties.label_data);
      feature.set("patch_id", featureData.properties.patch_id);
      source.addFeature(feature);
    });

    // Clear selection
    if (selectRef.current) {
      selectRef.current.getFeatures().clear();
    }
    setSelection([]);

    // Update canUndo state
    setCanUndo(historyRef.current.length > 0);

    message.success("Undo successful");
  }, []);

  const startEditing = useCallback(() => {
    console.log("[usePolygonEditor] startEditing called, mapRef.current:", !!mapRef.current, "isEditing:", isEditing);
    if (!mapRef.current || isEditing) {
      console.log("[usePolygonEditor] Returning early from startEditing");
      return;
    }

    console.log("[usePolygonEditor] Ensuring overlay...");
    ensureOverlay();
    const overlay = overlayLayerRef.current!;
    console.log("[usePolygonEditor] Overlay layer:", !!overlay);

    // Select interaction limited to overlay layer
    // Use null style - styling handled by layer's style function
    const select = new Select({
      layers: [overlay],
      style: null, // Don't apply custom style, use layer's style function
      multi: true,
      condition: click,
      addCondition: click,
      removeCondition: click,
      toggleCondition: click,
    });
    mapRef.current.addInteraction(select);
    selectRef.current = select;

    // Track selection changes and update feature properties
    const selectedCollection = select.getFeatures();
    const updateSelection = () => {
      const allFeatures = overlay.getSource()?.getFeatures() || [];
      const selectedFeatures = selectedCollection.getArray() as Feature<Geometry>[];

      // Update dt_selected property on all features
      allFeatures.forEach((f) => {
        f.set("dt_selected", selectedFeatures.includes(f));
      });

      setSelection(selectedFeatures);
    };
    selectedCollection.on(["add", "remove"], updateSelection);

    // Modify interaction, active only when selection exists
    const modify = new Modify({ features: selectedCollection });
    modify.setActive(selectedCollection.getLength() > 0);
    mapRef.current.addInteraction(modify);
    modifyRef.current = modify;

    // Save history before modification starts
    modify.on("modifystart", () => {
      saveHistory();
    });

    const updateModifyActive = () => {
      modify.setActive(selectedCollection.getLength() > 0);
      const allFeatures = overlay.getSource()?.getFeatures() || [];
      const selectedFeatures = selectedCollection.getArray() as Feature<Geometry>[];

      // Update dt_selected property on all features
      allFeatures.forEach((f) => {
        f.set("dt_selected", selectedFeatures.includes(f));
      });

      setSelection(selectedFeatures);
    };
    selectedCollection.on(["add", "remove"], updateModifyActive);

    // If a feature becomes selected, clear any hover state
    selectedCollection.on(["add"], () => {
      if (hoveredFeatureRef.current) {
        hoveredFeatureRef.current.set("dt_hovered", false);
        hoveredFeatureRef.current = null;
      }
    });

    // Hover highlight handler - use feature properties instead of setStyle
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

      // Clear hover state from previous feature
      if (hoveredFeatureRef.current && hoveredFeatureRef.current !== hitFeature) {
        hoveredFeatureRef.current.set("dt_hovered", false);
        hoveredFeatureRef.current = null;
      }

      // Set hover state on new feature
      if (hitFeature && hoveredFeatureRef.current !== hitFeature) {
        hoveredFeatureRef.current = hitFeature as Feature<Geometry>;
        (hitFeature as Feature<Geometry>).set("dt_hovered", true);
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
          // Clear dt_selected from all features
          const allFeatures = overlayLayerRef.current?.getSource()?.getFeatures() || [];
          allFeatures.forEach((f) => f.set("dt_selected", false));

          coll.clear();
          setSelection([]);
          if (modifyRef.current) modifyRef.current.setActive(false);
          if (hoveredFeatureRef.current) {
            hoveredFeatureRef.current.set("dt_hovered", false);
            hoveredFeatureRef.current = null;
          }
        }
      }
    };
    mapRef.current.on("click", handleMapClick);
    clickListenerRef.current = handleMapClick;

    // Draw interaction created lazily on toggle
    setIsEditing(true);
    console.log("[usePolygonEditor] startEditing completed, interactions added");
  }, [ensureOverlay, isEditing, mapRef, saveHistory]);

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

    // Clear history (fresh start for next editing session)
    historyRef.current = [];
    setCanUndo(false);

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
      hoveredFeatureRef.current.set("dt_hovered", false);
      hoveredFeatureRef.current = null;
    }
    // Clear overlay features on exit to restore base layer visibility via listeners upstream
    if (overlayLayerRef.current) {
      const src = overlayLayerRef.current.getSource() as VectorSource<Feature<Geometry>> | null;
      src?.clear();
    }
  }, [isEditing, mapRef]);

  const toggleDraw = useCallback(
    (on?: boolean) => {
      console.log("[usePolygonEditor] toggleDraw called, mapRef.current:", !!mapRef.current, "isDrawing:", isDrawing);
      if (!mapRef.current) {
        console.log("[usePolygonEditor] No map ref, returning");
        return;
      }
      ensureOverlay();

      const shouldEnable = typeof on === "boolean" ? on : !isDrawing;
      console.log("[usePolygonEditor] shouldEnable:", shouldEnable);
      if (shouldEnable) {
        if (drawRef.current) {
          console.log("[usePolygonEditor] Draw already active, returning");
          return;
        }
        const overlay = overlayLayerRef.current!;
        const source = overlay.getSource() as VectorSource<Feature<Geometry>> | null;
        console.log("[usePolygonEditor] Creating draw interaction, overlay:", !!overlay, "source:", !!source);

        // Style for the sketch (polygon being drawn) - very visible
        const sketchStyle = new Style({
          fill: new Fill({ color: "rgba(255, 200, 0, 0.05)" }), // Bright yellow-orange @ 60% - highly visible for labeling
          stroke: new Stroke({ color: "#FFA500", width: 4 }), // Orange, thick stroke
        });

        const draw = new Draw({
          source: (source as unknown as VectorSource)!,
          type: "Polygon",
          freehand: false, // Standard click-to-draw by defaulta
          freehandCondition: shiftKeyOnly, // Enable freehand when Shift is held
          style: sketchStyle, // Apply bright style to sketch
        });
        mapRef.current.addInteraction(draw);
        drawRef.current = draw;
        setIsDrawing(true);
        console.log("[usePolygonEditor] Draw interaction added to map");

        // Save history when drawing starts (before new feature is added)
        draw.once("drawstart", () => {
          saveHistory();
        });

        // Auto-exit draw mode after polygon completion
        draw.once("drawend", () => {
          if (!mapRef.current || !drawRef.current) return;
          mapRef.current.removeInteraction(drawRef.current);
          drawRef.current = null;
          setIsDrawing(false);
        });
      } else {
        if (!drawRef.current) return;
        mapRef.current.removeInteraction(drawRef.current);
        drawRef.current = null;
        setIsDrawing(false);
        console.log("[usePolygonEditor] Draw interaction removed from map");
      }
    },
    [ensureOverlay, isDrawing, mapRef, saveHistory],
  );

  const deleteSelected = useCallback(() => {
    const overlay = overlayLayerRef.current;
    const select = selectRef.current;
    if (!overlay || !select) return;
    const source = overlay.getSource() as VectorSource<Feature<Geometry>> | null;
    if (!source) return;

    // Save history before deleting
    saveHistory();

    const featuresToDelete = [...(select.getFeatures().getArray() as Feature<Geometry>[])];
    featuresToDelete.forEach((f) => source.removeFeature(f));
    select.getFeatures().clear();
    setSelection([]);
  }, [saveHistory]);

  const mergeSelected = useCallback(() => {
    const overlay = overlayLayerRef.current;
    const select = selectRef.current;
    if (!overlay || !select) return;
    const source = overlay.getSource() as VectorSource<Feature<Geometry>> | null;
    if (!source) return;
    const selected = select.getFeatures().getArray() as Feature<Geometry>[];
    if (selected.length !== 2) {
      message.warning("Select exactly two polygons to merge.");
      return;
    }
    const [a, b] = selected;
    const ga = a.getGeometry();
    const gb = b.getGeometry();
    if (!ga || !gb) return;

    // Save history before merging
    saveHistory();

    // Union handles all cases: intersecting, containing, or separate polygons
    const merged = geomUnion(ga, gb);
    if (!merged) {
      message.error("Failed to merge polygons.");
      return;
    }
    // keep id from first feature
    a.setGeometry(merged);
    source.removeFeature(b);
    select.getFeatures().clear();
    select.getFeatures().push(a);
    setSelection([a]);
  }, [saveHistory]);

  // Cut hole / trim edges: user draws a polygon, then we subtract from single selected feature
  const cutHoleWithDrawn = useCallback(() => {
    if (!mapRef.current) return;
    ensureOverlay();
    const select = selectRef.current;
    if (!select) return;
    const selected = select.getFeatures().getArray() as Feature<Geometry>[];
    if (selected.length !== 1) {
      message.warning("Select a single polygon, then draw a shape to cut out or trim.");
      return;
    }
    const target = selected[0];
    const targetGeom = target.getGeometry();
    if (!targetGeom) return;

    // temporary draw for the hole/trim polygon
    if (drawRef.current) {
      mapRef.current.removeInteraction(drawRef.current);
      drawRef.current = null;
    }
    // Use a temporary in-memory source that is NOT the overlay
    const tempSource = new VectorSource<Feature<Geometry>>();

    // Style for the sketch (polygon being drawn) - very visible
    const sketchStyle = new Style({
      fill: new Fill({ color: "rgba(255, 200, 0, 0.6)" }), // Bright yellow-orange @ 60% - highly visible for labeling
      stroke: new Stroke({ color: "#FFA500", width: 4 }), // Orange, thick stroke
    });

    const draw = new Draw({
      source: tempSource as unknown as VectorSource,
      type: "Polygon",
      freehand: false, // Standard click-to-draw by default
      freehandCondition: shiftKeyOnly, // Enable freehand when Shift is held
      style: sketchStyle, // Apply bright style to sketch
    });
    mapRef.current.addInteraction(draw);
    drawRef.current = draw;
    setIsDrawing(true);

    draw.once("drawend", (evt) => {
      const cutFeature = evt.feature as Feature<Geometry>;
      const cutGeom = cutFeature.getGeometry();
      if (cutGeom) {
        // Save history before cutting
        saveHistory();

        // Perform difference operation - works for holes, edge trimming, and no-ops if no overlap
        const diff = geomDifference(targetGeom, cutGeom);
        if (!diff) {
          message.error("Failed to cut polygon. Result would be empty.");
        } else {
          target.setGeometry(diff);
          // Clear temp source; cut feature was never added to overlay
          tempSource.clear();
          message.success("Polygon cut successfully!");
        }
      }
      if (drawRef.current) {
        mapRef.current?.removeInteraction(drawRef.current);
        drawRef.current = null;
      }
      setIsDrawing(false);
    });
  }, [ensureOverlay, mapRef, saveHistory]);

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

  const setOverlayVisible = useCallback((visible: boolean) => {
    const overlay = overlayLayerRef.current;
    if (!overlay) return;
    overlay.setVisible(visible);
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
      getOverlayLayer: () => {
        const layer = (overlayLayerRef.current as unknown as VectorLayer<VectorSource>) || null;
        console.log("[Editor] getOverlayLayer called, layer =", !!layer, "source =", !!layer?.getSource());
        return layer;
      },
      setOverlayVisible,
      mergeSelected,
      cutHoleWithDrawn,
      undo,
      canUndo,
      saveHistorySnapshot: saveHistory,
    }),
    [
      clearAll,
      deleteSelected,
      isDrawing,
      isEditing,
      selection,
      startEditing,
      stopEditing,
      toggleDraw,
      setOverlayVisible,
      mergeSelected,
      cutHoleWithDrawn,
      undo,
      canUndo,
      saveHistory,
    ],
  );
}
