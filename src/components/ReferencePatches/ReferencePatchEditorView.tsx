import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { IDataset } from "../../types/dataset";
import { IReferencePatch, PatchResolution } from "../../types/referencePatches";
import { ILabelData } from "../../types/labels";
import {
  useReferencePatches,
  useCreateReferencePatch,
  useUpdatePatchStatus,
  useDeleteReferencePatch,
} from "../../hooks/useReferencePatches";
import { useSaveReferenceGeometries } from "../../hooks/useReferenceGeometries";
import usePolygonEditor from "../../hooks/usePolygonEditor";
import useAISegmentation from "../../hooks/useAISegmentation";
import { useDatasetAOI } from "../../hooks/useDatasetAudit";
import { supabase } from "../../hooks/useSupabase";
import { message, Button, Alert, Modal } from "antd";
import { PlusOutlined, LockOutlined, EditOutlined, ExclamationCircleOutlined } from "@ant-design/icons";
import { polygon as turfPolygon, multiPolygon as turfMultiPolygon, centroid } from "@turf/turf";
import GeoJSON from "ol/format/GeoJSON";
import type { Map as OLMap } from "ol";
import Feature from "ol/Feature";
import type TileLayerWebGL from "ol/layer/WebGLTile";
import ReferencePatchMap from "./ReferencePatchMap";
import PatchDetailSidebar from "./PatchDetailSidebar";
import LayerRadioButtons, { LayerSelection } from "./LayerRadioButtons";
import EditorToolbar from "./EditorToolbar";

interface Props {
  dataset: IDataset;
  onUnsavedChanges: (hasChanges: boolean) => void;
  isCompleted: boolean;
  onReopenForEditing: () => void;
}

export default function ReferencePatchEditorView({
  dataset,
  onUnsavedChanges,
  isCompleted,
  onReopenForEditing,
}: Props) {
  const [selectedResolution, setSelectedResolution] = useState<PatchResolution>(20);
  const [selectedPatchId, setSelectedPatchId] = useState<number | null>(null);
  const [getPatchGeometryFromMap, setGetPatchGeometryFromMap] = useState<
    ((patchId: number) => GeoJSON.Polygon | null) | null
  >(null);
  const [layerSelection, setLayerSelection] = useState<LayerSelection>("deadwood");
  const [editingMode, setEditingMode] = useState<ILabelData | null>(null);

  // Ref for OpenLayers map
  const mapRef = useRef<OLMap | null>(null);
  const [getOrthoLayer, setGetOrthoLayer] = useState<(() => TileLayerWebGL | undefined) | null>(null);

  const { data: allPatches = [], refetch: refetchPatches } = useReferencePatches(dataset.id);
  const { data: aoiData } = useDatasetAOI(dataset.id);
  const { mutateAsync: createPatch } = useCreateReferencePatch();
  const { mutateAsync: updateStatus } = useUpdatePatchStatus();
  const { mutateAsync: deletePatch } = useDeleteReferencePatch();
  const { mutateAsync: saveGeometries } = useSaveReferenceGeometries();

  // Initialize editor hooks (only when map is ready)
  const editor = usePolygonEditor({ mapRef: mapRef as React.MutableRefObject<OLMap | null> });
  const ai = useAISegmentation({
    mapRef: mapRef as React.MutableRefObject<OLMap | null>,
    getOrthoLayer: getOrthoLayer || (() => undefined),
    getTargetVectorSource: () => editor.getOverlayLayer()?.getSource() || null,
    onBeforeAddFeatures: editor.saveHistorySnapshot, // Save history before AI adds features (for undo)
  });

  const geoJson = useMemo(() => new GeoJSON(), []);

  // Keyboard shortcuts for layer selection (1/2/3) - filtered during editing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Determine available layers based on editing mode
      const availableLayers = editingMode
        ? [editingMode === ILabelData.DEADWOOD ? "deadwood" : "forest_cover", "ortho_only"]
        : ["deadwood", "forest_cover", "ortho_only"];

      switch (e.key) {
        case "1":
          if (availableLayers.includes("ortho_only")) {
            setLayerSelection("ortho_only");
          }
          break;
        case "2":
          if (availableLayers.includes("deadwood")) {
            setLayerSelection("deadwood");
          }
          break;
        case "3":
          if (availableLayers.includes("forest_cover")) {
            setLayerSelection("forest_cover");
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [editingMode]);

  // Get base patches (20cm) and calculate AOI centroid
  const basePatches = useMemo(() => allPatches.filter((p) => p.resolution_cm === 20), [allPatches]);

  const aoiCentroid = useMemo(() => {
    if (!aoiData?.geometry) return null;
    try {
      const aoiGeometry = geoJson.readGeometry(aoiData.geometry, {
        dataProjection: "EPSG:4326",
        featureProjection: "EPSG:3857",
      });
      const aoiGeoJSON = geoJson.writeGeometryObject(aoiGeometry) as GeoJSON.Polygon | GeoJSON.MultiPolygon;
      const turfGeom =
        aoiGeoJSON.type === "Polygon"
          ? turfPolygon(aoiGeoJSON.coordinates as GeoJSON.Position[][])
          : turfMultiPolygon(aoiGeoJSON.coordinates as GeoJSON.Position[][][]);
      return centroid(turfGeom).geometry.coordinates as [number, number];
    } catch (error) {
      console.error("Failed to calculate AOI centroid:", error);
      return null;
    }
  }, [aoiData?.geometry, geoJson]);

  // Filter patches for map display
  // Always show base patches (20cm) + patches at selected resolution
  const patchesForResolution = useMemo(() => {
    if (selectedResolution === 20) {
      // If viewing 20cm, only show 20cm patches
      return allPatches.filter((p) => p.resolution_cm === 20);
    } else {
      // If viewing 10cm or 5cm, show base patches (20cm) + the selected resolution
      return allPatches.filter((p) => p.resolution_cm === 20 || p.resolution_cm === selectedResolution);
    }
  }, [allPatches, selectedResolution]);

  // Get the selected patch
  const selectedPatch = useMemo(
    () => allPatches.find((p) => p.id === selectedPatchId) || null,
    [allPatches, selectedPatchId],
  );

  // Get base patch for selected patch
  const selectedBasePatch = useMemo(() => {
    if (!selectedPatch) return null;
    if (selectedPatch.resolution_cm === 20) {
      console.log("[Editor] selectedBasePatch updated (20cm):", {
        id: selectedPatch.id,
        deadwoodLabel: selectedPatch.reference_deadwood_label_id,
        forestCoverLabel: selectedPatch.reference_forest_cover_label_id,
      });
      return selectedPatch;
    }
    // Find parent base patch by parsing patch_index
    const baseIndex = selectedPatch.patch_index.split("_")[0] + "_" + selectedPatch.patch_index.split("_")[1];
    const basePatch = basePatches.find((p) => p.patch_index === baseIndex) || null;
    if (basePatch) {
      console.log("[Editor] selectedBasePatch updated (child patch):", {
        id: basePatch.id,
        deadwoodLabel: basePatch.reference_deadwood_label_id,
        forestCoverLabel: basePatch.reference_forest_cover_label_id,
      });
    }
    return basePatch;
  }, [selectedPatch, basePatches]);

  // Recursively generate nested patches
  const generateNestedPatchesRecursive = useCallback(
    async (parentPatch: IReferencePatch) => {
      const parentGeom = parentPatch.geometry;
      const parentCoords = parentGeom.coordinates[0];
      const [minx, miny] = parentCoords[0];
      const [maxx, maxy] = parentCoords[2];
      const centerX = (minx + maxx) / 2;
      const centerY = (miny + maxy) / 2;
      const halfWidth = (maxx - minx) / 2;
      const halfHeight = (maxy - miny) / 2;

      const childResolution = parentPatch.resolution_cm === 20 ? 10 : 5;
      const positions = [
        [centerX - halfWidth / 2, centerY - halfHeight / 2],
        [centerX + halfWidth / 2, centerY - halfHeight / 2],
        [centerX - halfWidth / 2, centerY + halfHeight / 2],
        [centerX + halfWidth / 2, centerY + halfHeight / 2],
      ];

      // Create all 4 child patches in parallel for better performance
      const patchCreationPromises = positions.map((position, i) => {
        const [cx, cy] = position;
        const childGeometry: GeoJSON.Polygon = {
          type: "Polygon",
          coordinates: [
            [
              [cx - halfWidth / 2, cy - halfHeight / 2],
              [cx + halfWidth / 2, cy - halfHeight / 2],
              [cx + halfWidth / 2, cy + halfHeight / 2],
              [cx - halfWidth / 2, cy + halfHeight / 2],
              [cx - halfWidth / 2, cy - halfHeight / 2],
            ],
          ],
        };

        return createPatch({
          dataset_id: dataset.id,
          resolution_cm: childResolution,
          geometry: childGeometry,
          parent_tile_id: parentPatch.id,
          status: "pending",
          patch_index: `${parentPatch.patch_index}_${i}`,
          bbox_minx: childGeometry.coordinates[0][0][0],
          bbox_miny: childGeometry.coordinates[0][0][1],
          bbox_maxx: childGeometry.coordinates[0][2][0],
          bbox_maxy: childGeometry.coordinates[0][2][1],
          aoi_coverage_percent: null,
          deadwood_prediction_coverage_percent: null,
          forest_cover_prediction_coverage_percent: null,
        });
      });

      const childPatches = await Promise.all(patchCreationPromises);

      // If we just created 10cm patches, recursively create 5cm patches in parallel
      if (childResolution === 10) {
        await Promise.all(childPatches.map((child) => generateNestedPatchesRecursive(child as IReferencePatch)));
      }
    },
    [createPatch, dataset.id],
  );

  // Handle adding a new base patch (without auto-generating children)
  const handleAddBasePatch = useCallback(async () => {
    if (!aoiCentroid) {
      message.warning("AOI required before placing base patches.");
      return;
    }

    const targetSizeMeters = 204.8;
    const patchGeometry: GeoJSON.Polygon = {
      type: "Polygon",
      coordinates: [
        [
          [aoiCentroid[0] - targetSizeMeters / 2, aoiCentroid[1] - targetSizeMeters / 2],
          [aoiCentroid[0] + targetSizeMeters / 2, aoiCentroid[1] - targetSizeMeters / 2],
          [aoiCentroid[0] + targetSizeMeters / 2, aoiCentroid[1] + targetSizeMeters / 2],
          [aoiCentroid[0] - targetSizeMeters / 2, aoiCentroid[1] + targetSizeMeters / 2],
          [aoiCentroid[0] - targetSizeMeters / 2, aoiCentroid[1] - targetSizeMeters / 2],
        ],
      ],
    };

    try {
      // Create base patch in pending state (user will position it, then generate children)
      const newPatch = await createPatch({
        dataset_id: dataset.id,
        resolution_cm: 20,
        geometry: patchGeometry,
        parent_tile_id: null,
        status: "pending",
        patch_index: `20_${Date.now()}`,
        bbox_minx: patchGeometry.coordinates[0][0][0],
        bbox_miny: patchGeometry.coordinates[0][0][1],
        bbox_maxx: patchGeometry.coordinates[0][2][0],
        bbox_maxy: patchGeometry.coordinates[0][2][1],
        aoi_coverage_percent: 100,
        deadwood_prediction_coverage_percent: null,
        forest_cover_prediction_coverage_percent: null,
      });

      // Explicitly refetch to ensure UI updates immediately
      await refetchPatches();

      // Auto-select the newly created patch
      if (newPatch && newPatch.id) {
        setSelectedPatchId(newPatch.id);
        setSelectedResolution(20);
      }

      onUnsavedChanges(true);
      message.success("Base patch created. Drag it to position, then select it to generate sub-patches.");
    } catch (error) {
      console.error(error);
      message.error("Failed to create base patch");
    }
  }, [aoiCentroid, dataset.id, createPatch, onUnsavedChanges, refetchPatches]);

  // Handle patch selection
  const handlePatchSelected = useCallback((patch: IReferencePatch | null) => {
    if (patch) {
      setSelectedPatchId(patch.id);
      setSelectedResolution(patch.resolution_cm);
    } else {
      setSelectedPatchId(null);
    }
  }, []);

  // Handle patch deselection
  const handleDeselect = useCallback(() => {
    setSelectedPatchId(null);
    message.info("Patch deselected");
  }, []);

  // Handle edit layer button click
  const handleEditLayer = useCallback(async () => {
    if (!selectedPatchId || layerSelection === "ortho_only") return;

    console.log("=== Starting Edit Mode ===");
    console.log("Map ref:", mapRef.current);
    console.log("Editor:", editor);

    // Check if map is ready
    if (!mapRef.current) {
      message.error("Map is not ready yet");
      return;
    }

    // Find base patch
    const selectedPatch = allPatches.find((p) => p.id === selectedPatchId);
    if (!selectedPatch) return;

    let basePatch = selectedPatch;
    if (selectedPatch.resolution_cm !== 20) {
      // Walk up to find base patch
      let current = selectedPatch;
      while (current.parent_tile_id) {
        const parent = allPatches.find((p) => p.id === current.parent_tile_id);
        if (!parent) break;
        current = parent;
      }
      basePatch = current;
    }

    const layerType: ILabelData = layerSelection === "deadwood" ? ILabelData.DEADWOOD : ILabelData.FOREST_COVER;

    // Load reference geometries
    try {
      // Fetch geometries from database
      const tableName =
        layerType === "deadwood" ? "reference_patch_deadwood_geometries" : "reference_patch_forest_cover_geometries";

      // Get active label for this patch
      const { data: labelData } = await supabase
        .from("v2_labels")
        .select("id")
        .eq("reference_patch_id", basePatch.id)
        .eq("label_data", layerType)
        .eq("is_active", true)
        .maybeSingle();

      let features: Feature[] = [];

      if (labelData) {
        // Fetch geometries
        const { data: geometries } = await supabase.from(tableName).select("geometry").eq("label_id", labelData.id);

        if (geometries && geometries.length > 0) {
          features = geometries.map((g) => {
            const feature = new Feature(
              geoJson.readGeometry(g.geometry, {
                dataProjection: "EPSG:4326", // Database stores in WGS84
                featureProjection: "EPSG:3857", // Map uses Web Mercator
              }),
            );
            feature.set("label_data", layerType);
            feature.set("patch_id", basePatch.id);
            return feature;
          });
        }
      }

      console.log("Loaded features:", features.length);

      // Enter editing mode FIRST to initialize the overlay layer
      console.log("Starting editor...");
      editor.startEditing();
      setEditingMode(layerType);

      // NOW get the overlay layer (it's been created by startEditing)
      const overlayLayer = editor.getOverlayLayer();
      console.log("Overlay layer after startEditing:", overlayLayer);

      if (!overlayLayer) {
        console.error("Overlay layer not found even after startEditing!");
        message.error("Editor not initialized properly");
        return;
      }

      const source = overlayLayer.getSource();
      if (!source) {
        console.error("Overlay source not found!");
        message.error("Editor source not initialized");
        return;
      }

      // Clear any existing features and add the loaded ones
      source.clear();
      if (features.length > 0) {
        source.addFeatures(features);
        console.log("Added features to overlay, count:", source.getFeatures().length);
      }

      console.log("Editor isEditing:", editor.isEditing);
      console.log("Overlay layer visible:", overlayLayer.getVisible());
      console.log("Overlay layer z-index:", overlayLayer.getZIndex());

      message.info(
        `Editing ${layerType === "deadwood" ? "Deadwood" : "Forest Cover"} - ${features.length} polygons loaded`,
      );
    } catch (error) {
      console.error("Failed to load geometries for editing:", error);
      message.error("Failed to load geometries");
    }
  }, [layerSelection, selectedPatchId, allPatches, editor, geoJson, mapRef]);

  // Handle save edits
  const handleSaveEdits = useCallback(async () => {
    if (!editingMode || !selectedPatchId) return;

    try {
      // Find base patch
      const selectedPatch = allPatches.find((p) => p.id === selectedPatchId);
      if (!selectedPatch) return;

      let basePatch = selectedPatch;
      if (selectedPatch.resolution_cm !== 20) {
        let current = selectedPatch;
        while (current.parent_tile_id) {
          const parent = allPatches.find((p) => p.id === current.parent_tile_id);
          if (!parent) break;
          current = parent;
        }
        basePatch = current;
      }

      // Get features from overlay
      const features = editor.getOverlayLayer()?.getSource()?.getFeatures() || [];

      // Convert to GeoJSON geometries with coordinate transformation
      const geometries = features.map((f: Feature) =>
        geoJson.writeGeometryObject(f.getGeometry()!, {
          dataProjection: "EPSG:4326", // Database stores in WGS84
          featureProjection: "EPSG:3857", // Map uses Web Mercator
        }),
      );

      // Save to database
      await saveGeometries({
        patchId: basePatch.id,
        datasetId: dataset.id,
        layerType: editingMode,
        geometries,
      });

      // Refetch patches to get updated reference label IDs BEFORE exiting editing mode
      // This ensures the map has fresh data when we exit editing
      console.log("[Editor] Before refetch, selectedBasePatch:", selectedBasePatch);
      const refetchResult = await refetchPatches();
      console.log("[Editor] After refetch, patches count:", refetchResult.data?.length);

      const updatedPatch = refetchResult.data?.find((p) => p.id === basePatch.id);
      console.log("[Editor] Updated patch label IDs:", {
        deadwood: updatedPatch?.reference_deadwood_label_id,
        forestCover: updatedPatch?.reference_forest_cover_label_id,
      });

      // NOW clean up and exit editing mode
      // This ensures the reference geometry useEffect fires with the NEW patch data
      editor.stopEditing();
      editor.getOverlayLayer()?.getSource()?.clear();
      setEditingMode(null);

      message.success(`${editingMode === "deadwood" ? "Deadwood" : "Forest Cover"} reference updated!`);
      onUnsavedChanges(true);
    } catch (error) {
      console.error("Failed to save edits:", error);
      message.error("Failed to save changes");
    }
  }, [
    editingMode,
    selectedPatchId,
    allPatches,
    editor,
    geoJson,
    saveGeometries,
    dataset.id,
    refetchPatches,
    onUnsavedChanges,
    selectedBasePatch,
  ]);

  // Handle cancel editing
  const handleCancelEditing = useCallback(() => {
    editor.stopEditing();
    editor.getOverlayLayer()?.getSource()?.clear();
    setEditingMode(null);
    message.info("Editing cancelled - no changes saved");
  }, [editor]);

  // Add Esc key handler for deselection (Phase 4)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === "Escape" && selectedPatchId) {
        handleDeselect();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedPatchId, handleDeselect]);

  // Control overlay visibility based on layer selection during editing
  useEffect(() => {
    if (!editingMode) {
      // Always show overlay when editing (default state)
      editor.setOverlayVisible(true);
      return;
    }

    // When editing and "ortho_only" is selected, hide overlay
    if (layerSelection === "ortho_only") {
      editor.setOverlayVisible(false);
    } else {
      editor.setOverlayVisible(true);
    }
  }, [editingMode, layerSelection, editor]);

  // Keyboard shortcut for undo (Ctrl/Cmd+Z) - only during editing
  useEffect(() => {
    if (!editingMode) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Ctrl+Z (Windows/Linux) or Cmd+Z (Mac)
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault(); // Prevent browser undo
        if (editor.canUndo) {
          editor.undo();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [editingMode, editor]);

  // Keyboard shortcuts for editor actions (s, a, c, d, g) - only during editing
  useEffect(() => {
    if (!editingMode) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Ignore if modifier keys are pressed (except for shortcuts that need them)
      if (e.ctrlKey || e.metaKey || e.altKey) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case "s":
          // Toggle AI segmentation
          e.preventDefault();
          if (ai.isActive) {
            ai.disable();
          } else {
            ai.enable();
          }
          break;
        case "a":
          // Toggle draw polygon
          e.preventDefault();
          editor.toggleDraw();
          break;
        case "c":
          // Cut hole (only if one polygon is selected)
          if (editor.selection && editor.selection.length === 1) {
            e.preventDefault();
            editor.cutHoleWithDrawn();
          }
          break;
        case "d":
          // Delete selected (only if something is selected)
          if (editor.selection && editor.selection.length > 0) {
            e.preventDefault();
            editor.deleteSelected();
          }
          break;
        case "g":
          // Merge (only if exactly 2 polygons are selected)
          if (editor.selection && editor.selection.length === 2) {
            e.preventDefault();
            editor.mergeSelected();
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [editingMode, editor, ai]);

  // Memoize the callback that receives the patch geometry getter
  const handleGetPatchGeometry = useCallback((getter: (patchId: number) => GeoJSON.Polygon | null) => {
    setGetPatchGeometryFromMap(() => getter);
  }, []);

  // Callback to receive map reference from child component
  const handleGetMapRef = useCallback((map: OLMap | null) => {
    mapRef.current = map;
    console.log("Map reference received:", map);
  }, []);

  // Callback to receive ortho layer getter from child component
  const handleGetOrthoLayer = useCallback((getter: () => TileLayerWebGL | undefined) => {
    setGetOrthoLayer(() => getter);
  }, []);

  // Helper: Auto-copy model predictions to create initial reference data
  const autoCopyPredictionsAsReference = useCallback(
    async (basePatch: IReferencePatch) => {
      try {
        // Fetch model prediction labels for deadwood and forest_cover
        const { data: deadwoodLabel } = await supabase
          .from("v2_labels")
          .select("id")
          .eq("dataset_id", dataset.id)
          .eq("label_data", ILabelData.DEADWOOD)
          .eq("label_source", "model_prediction")
          .maybeSingle();

        const { data: forestCoverLabel } = await supabase
          .from("v2_labels")
          .select("id")
          .eq("dataset_id", dataset.id)
          .eq("label_data", ILabelData.FOREST_COVER)
          .eq("label_source", "model_prediction")
          .maybeSingle();

        // Copy deadwood geometries using PostGIS spatial filtering and clipping
        if (deadwoodLabel) {
          console.log("Fetching deadwood geometries for label:", deadwoodLabel.id, "bbox:", {
            minx: basePatch.bbox_minx,
            miny: basePatch.bbox_miny,
            maxx: basePatch.bbox_maxx,
            maxy: basePatch.bbox_maxy,
          });

          const { data: deadwoodGeoms, error } = await supabase.rpc("get_clipped_geometries_for_patch", {
            p_label_id: deadwoodLabel.id,
            p_geometry_table: "v2_deadwood_geometries",
            p_bbox_minx: basePatch.bbox_minx,
            p_bbox_miny: basePatch.bbox_miny,
            p_bbox_maxx: basePatch.bbox_maxx,
            p_bbox_maxy: basePatch.bbox_maxy,
            p_buffer_m: 2.0, // 2 meter buffer
          });

          if (error) {
            console.error("Error clipping deadwood geometries:", error);
            message.warning("Some deadwood geometries could not be clipped due to invalid geometry");
          } else if (deadwoodGeoms && deadwoodGeoms.length > 0) {
            console.log(`Successfully clipped ${deadwoodGeoms.length} deadwood geometries`);
            await saveGeometries({
              patchId: basePatch.id,
              datasetId: dataset.id,
              layerType: ILabelData.DEADWOOD,
              geometries: deadwoodGeoms.map((g: { geometry: unknown }) => g.geometry),
            });
          } else {
            console.log("No deadwood geometries found in patch area");
          }
        }

        // Copy forest cover geometries using PostGIS spatial filtering and clipping
        if (forestCoverLabel) {
          console.log("Fetching forest cover geometries for label:", forestCoverLabel.id, "bbox:", {
            minx: basePatch.bbox_minx,
            miny: basePatch.bbox_miny,
            maxx: basePatch.bbox_maxx,
            maxy: basePatch.bbox_maxy,
          });

          const { data: forestCoverGeoms, error } = await supabase.rpc("get_clipped_geometries_for_patch", {
            p_label_id: forestCoverLabel.id,
            p_geometry_table: "v2_forest_cover_geometries",
            p_bbox_minx: basePatch.bbox_minx,
            p_bbox_miny: basePatch.bbox_miny,
            p_bbox_maxx: basePatch.bbox_maxx,
            p_bbox_maxy: basePatch.bbox_maxy,
            p_buffer_m: 2.0, // 2 meter buffer
          });

          if (error) {
            console.error("Error clipping forest cover geometries:", error);
            message.warning("Some forest cover geometries could not be clipped due to invalid geometry");
          } else if (forestCoverGeoms && forestCoverGeoms.length > 0) {
            console.log(`Successfully clipped ${forestCoverGeoms.length} forest cover geometries`);
            await saveGeometries({
              patchId: basePatch.id,
              datasetId: dataset.id,
              layerType: ILabelData.FOREST_COVER,
              geometries: forestCoverGeoms.map((g: { geometry: unknown }) => g.geometry),
            });
          } else {
            console.log("No forest cover geometries found in patch area");
          }
        }

        console.log("Reference data auto-copied and clipped successfully");
      } catch (error) {
        console.error("Failed to auto-copy predictions:", error);
        // Don't fail the whole operation if this fails
      }
    },
    [dataset.id, saveGeometries],
  );

  // Handle generating sub-patches for a base patch
  const handleGenerateSubPatches = useCallback(
    async (basePatch: IReferencePatch, currentGeometry?: GeoJSON.Polygon) => {
      try {
        message.loading({ content: "Generating nested patches...", key: "generate" });

        // Get current geometry from map if available, otherwise use provided or basePatch geometry
        // This ensures we use the MOVED position if the user translated the patch
        let geometryToUse = currentGeometry || basePatch.geometry;

        if (!currentGeometry && getPatchGeometryFromMap) {
          const mapGeometry = getPatchGeometryFromMap(basePatch.id);
          if (mapGeometry) {
            geometryToUse = mapGeometry;
          }
        }

        const patchToGenerate =
          geometryToUse !== basePatch.geometry ? { ...basePatch, geometry: geometryToUse } : basePatch;

        // Step 1: Auto-copy model predictions as v1 reference data
        await autoCopyPredictionsAsReference(patchToGenerate);

        // Step 2: Generate nested patches
        await generateNestedPatchesRecursive(patchToGenerate);

        // Step 3: Mark base patch as good
        await updateStatus({ patchId: basePatch.id, status: "good" });
        onUnsavedChanges(true);

        message.success({ content: "Patches generated and reference data created!", key: "generate" });

        // Switch to 10cm resolution
        setSelectedResolution(10);

        // Refetch patches to get updated reference label IDs
        await refetchPatches();

        // Small delay to allow React Query to update the patches list
        setTimeout(() => {
          // Auto-select first 10cm patch to start checking
          const firstChild = allPatches.find(
            (p) => p.parent_tile_id === basePatch.id && p.resolution_cm === 10 && p.status === "pending",
          );
          if (firstChild) {
            setSelectedPatchId(firstChild.id);
          }
        }, 100);
      } catch (error) {
        console.error(error);
        message.error({ content: "Failed to generate patches", key: "generate" });
      }
    },
    [
      generateNestedPatchesRecursive,
      updateStatus,
      onUnsavedChanges,
      allPatches,
      getPatchGeometryFromMap,
      autoCopyPredictionsAsReference,
      refetchPatches,
    ],
  );

  return (
    <div className="flex h-full w-full flex-col">
      {/* Completion Status Banner */}
      {isCompleted && (
        <Alert
          message="Dataset Marked as Complete"
          description={
            <div className="flex items-center justify-between">
              <span>
                This dataset has been marked as reference patches complete. To make changes, reopen it for editing.
              </span>
              <Button icon={<EditOutlined />} onClick={onReopenForEditing} size="small">
                Reopen for Editing
              </Button>
            </div>
          }
          type="success"
          icon={<LockOutlined />}
          showIcon
          className="m-4"
        />
      )}

      {/* Main Content: Map + Sidebar */}
      <div className="flex min-h-0 flex-1">
        {/* Map */}
        <div className="relative flex-1">
          <ReferencePatchMap
            datasetId={dataset.id}
            cogPath={dataset.cog_path}
            resolution={selectedResolution}
            patches={patchesForResolution}
            onPatchSelected={handlePatchSelected}
            enableTranslation={true}
            focusPatchId={selectedPatchId}
            onGetPatchGeometry={handleGetPatchGeometry}
            onGetMapRef={handleGetMapRef}
            onGetOrthoLayer={handleGetOrthoLayer}
            layerSelection={layerSelection}
            selectedPatchId={selectedPatchId}
            selectedBasePatch={selectedBasePatch}
            isEditingMode={!!editingMode}
          />

          {/* Layer Radio Buttons (bottom-left) - filtered during editing */}
          <LayerRadioButtons
            value={layerSelection}
            onChange={setLayerSelection}
            position="bottom-left"
            availableLayers={
              editingMode
                ? [editingMode === ILabelData.DEADWOOD ? "deadwood" : "forest_cover", "ortho_only"]
                : undefined // Show all when not editing
            }
          />

          {/* Editor Toolbar - shown during editing mode */}
          {editingMode && (
            <EditorToolbar
              type={editingMode}
              isDrawing={editor.isDrawing}
              hasSelection={!!editor.selection && editor.selection.length > 0}
              selectionCount={editor.selection?.length || 0}
              isAIActive={ai.isActive}
              isAIProcessing={ai.isProcessing}
              onToggleDraw={() => {
                console.log("Toggle draw clicked, current isDrawing:", editor.isDrawing);
                editor.toggleDraw();
                console.log("After toggle, isDrawing:", editor.isDrawing);
              }}
              onCutHole={editor.cutHoleWithDrawn}
              onMerge={editor.mergeSelected}
              onToggleAI={() => {
                console.log("Toggle AI clicked, current isActive:", ai.isActive);
                if (ai.isActive) {
                  ai.disable();
                } else {
                  ai.enable();
                }
                console.log("After toggle, isActive:", ai.isActive);
              }}
              onDeleteSelected={editor.deleteSelected}
              onUndo={editor.undo}
              canUndo={editor.canUndo}
              onSave={handleSaveEdits}
              onCancel={handleCancelEditing}
              position="top-left"
            />
          )}

          {/* Add Base Patch Button (overlay) - show when no patch is selected and not completed and not editing */}
          {!selectedPatch && !isCompleted && !editingMode && (
            <div className="pointer-events-none absolute left-4 top-4 z-10">
              <Button icon={<PlusOutlined />} onClick={handleAddBasePatch} className="pointer-events-auto shadow-lg">
                Add Base Patch
              </Button>
            </div>
          )}
        </div>

        {/* Sidebar (only visible when a patch is selected and not editing) */}
        {selectedPatch && selectedBasePatch && !editingMode && (
          <PatchDetailSidebar
            basePatch={selectedBasePatch}
            selectedPatch={selectedPatch}
            selectedResolution={selectedResolution}
            allPatches={allPatches}
            onResolutionChange={setSelectedResolution}
            onPatchSelect={setSelectedPatchId}
            onStatusUpdate={async (patchId: number, status: "good" | "bad" | "pending") => {
              await updateStatus({ patchId, status });
              onUnsavedChanges(true);
            }}
            currentLayer={layerSelection}
            onEditLayer={handleEditLayer}
            editButtonEnabled={layerSelection !== "ortho_only"}
            onDeselect={handleDeselect}
            onDelete={async (patchId: number) => {
              // Find the patch being deleted
              const patchToDelete = allPatches.find((p) => p.id === patchId);
              if (!patchToDelete) return;

              // Always delete the entire base patch family
              // First, find the base patch (20cm)
              let basePatch: IReferencePatch;
              if (patchToDelete.resolution_cm === 20) {
                basePatch = patchToDelete;
              } else {
                // Walk up the parent chain to find the base patch
                let current = patchToDelete;
                while (current.parent_tile_id) {
                  const parent = allPatches.find((p) => p.id === current.parent_tile_id);
                  if (!parent) break;
                  current = parent;
                }
                basePatch = current;
              }

              // Find all descendants of the base patch
              const patchesToDelete: IReferencePatch[] = [basePatch];

              // Find all direct children (10cm patches)
              const children10cm = allPatches.filter((p) => p.parent_tile_id === basePatch.id);
              patchesToDelete.push(...children10cm);

              // Find all grandchildren (5cm patches)
              for (const child of children10cm) {
                const children5cm = allPatches.filter((p) => p.parent_tile_id === child.id);
                patchesToDelete.push(...children5cm);
              }

              // Show confirmation modal with completion warning if applicable
              const completionWarning = isCompleted
                ? "\n\n⚠️ Warning: Deleting patches will automatically reset this dataset's completion status. You'll need to mark it as complete again after making changes."
                : "";

              Modal.confirm({
                title: "Delete Entire Base Patch?",
                icon: <ExclamationCircleOutlined />,
                content: `This will delete the base patch and all ${patchesToDelete.length - 1} sub-patches.${completionWarning}`,
                okText: "Delete All",
                okType: "danger",
                cancelText: "Cancel",
                onOk: async () => {
                  // Delete all patches in the family in parallel for better performance
                  message.loading({
                    content: `Deleting base patch and ${patchesToDelete.length - 1} sub-patches...`,
                    key: "delete",
                  });

                  await Promise.all(
                    patchesToDelete.map((patch) => deletePatch({ patchId: patch.id, datasetId: dataset.id })),
                  );

                  // If dataset was marked as complete, automatically reset it
                  if (isCompleted) {
                    await onReopenForEditing();
                    message.success({
                      content: "Patches deleted and dataset reopened for editing",
                      key: "delete",
                    });
                  } else {
                    message.success({ content: "All patches deleted successfully!", key: "delete" });
                  }

                  setSelectedPatchId(null);
                  onUnsavedChanges(true);
                },
              });
            }}
            onGenerateSubPatches={handleGenerateSubPatches}
          />
        )}
      </div>
    </div>
  );
}
