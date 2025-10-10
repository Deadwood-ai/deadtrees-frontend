import { useState, useCallback, useMemo, useEffect } from "react";
import { IDataset } from "../../types/dataset";
import { IReferencePatch, PatchResolution } from "../../types/referencePatches";
import {
  useReferencePatches,
  useCreateReferencePatch,
  useUpdatePatchStatus,
  useDeleteReferencePatch,
} from "../../hooks/useReferencePatches";
import { useDatasetAOI } from "../../hooks/useDatasetAudit";
import { message, Button, Alert, Modal } from "antd";
import { PlusOutlined, LockOutlined, EditOutlined, ExclamationCircleOutlined } from "@ant-design/icons";
import { polygon as turfPolygon, multiPolygon as turfMultiPolygon, centroid } from "@turf/turf";
import GeoJSON from "ol/format/GeoJSON";
import ReferencePatchMap from "./ReferencePatchMap";
import PatchDetailSidebar from "./PatchDetailSidebar";
import LayerRadioButtons, { LayerSelection } from "./LayerRadioButtons";

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

  const { data: allPatches = [], refetch: refetchPatches } = useReferencePatches(dataset.id);
  const { data: aoiData } = useDatasetAOI(dataset.id);
  const { mutateAsync: createPatch } = useCreateReferencePatch();
  const { mutateAsync: updateStatus } = useUpdatePatchStatus();
  const { mutateAsync: deletePatch } = useDeleteReferencePatch();

  const geoJson = useMemo(() => new GeoJSON(), []);

  // Keyboard shortcuts for layer selection (J/K/L)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case "j":
          setLayerSelection("deadwood");
          break;
        case "k":
          setLayerSelection("forest_cover");
          break;
        case "l":
          setLayerSelection("ortho_only");
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

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
    if (selectedPatch.resolution_cm === 20) return selectedPatch;
    // Find parent base patch by parsing patch_index
    const baseIndex = selectedPatch.patch_index.split("_")[0] + "_" + selectedPatch.patch_index.split("_")[1];
    return basePatches.find((p) => p.patch_index === baseIndex) || null;
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
  const handleEditLayer = useCallback(() => {
    message.info(`Entering edit mode for ${layerSelection === "deadwood" ? "Deadwood" : "Forest Cover"}...`);
    // TODO: Implement actual editing logic in a future phase
  }, [layerSelection]);

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

  // Memoize the callback that receives the patch geometry getter
  const handleGetPatchGeometry = useCallback((getter: (patchId: number) => GeoJSON.Polygon | null) => {
    setGetPatchGeometryFromMap(() => getter);
  }, []);

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

        await generateNestedPatchesRecursive(patchToGenerate);
        // Mark base patch as good
        await updateStatus({ patchId: basePatch.id, status: "good" });
        onUnsavedChanges(true);
        message.success({ content: "All nested patches generated successfully!", key: "generate" });

        // Switch to 10cm resolution
        setSelectedResolution(10);

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
    [generateNestedPatchesRecursive, updateStatus, onUnsavedChanges, allPatches, getPatchGeometryFromMap],
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
            layerSelection={layerSelection}
            selectedPatchId={selectedPatchId}
          />

          {/* Layer Radio Buttons (bottom-left) */}
          <LayerRadioButtons value={layerSelection} onChange={setLayerSelection} position="bottom-left" />

          {/* Add Base Patch Button (overlay) - show when no patch is selected and not completed */}
          {!selectedPatch && !isCompleted && (
            <div className="pointer-events-none absolute left-4 top-4 z-10">
              <Button icon={<PlusOutlined />} onClick={handleAddBasePatch} className="pointer-events-auto shadow-lg">
                Add Base Patch
              </Button>
            </div>
          )}
        </div>

        {/* Sidebar (only visible when a patch is selected) */}
        {selectedPatch && selectedBasePatch && (
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
