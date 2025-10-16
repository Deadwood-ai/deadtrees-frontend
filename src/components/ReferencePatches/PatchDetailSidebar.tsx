import { useMemo, useEffect, useCallback, useState, useRef } from "react";
import { Button, Card, Progress, Radio, Space, Typography, Alert, Tabs } from "antd";
import {
  LeftOutlined,
  RightOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  ThunderboltOutlined,
  CloseOutlined,
  EditOutlined,
} from "@ant-design/icons";
import { IReferencePatch, PatchResolution, PatchStatus } from "../../types/referencePatches";
import type { LayerSelection } from "./LayerRadioButtons";
import BatchProgressIndicator from "./BatchProgressIndicator";

interface Props {
  basePatch: IReferencePatch;
  selectedPatch: IReferencePatch;
  selectedResolution: PatchResolution;
  allPatches: IReferencePatch[];
  onResolutionChange: (resolution: PatchResolution) => void;
  onPatchSelect: (patchId: number | null) => void;
  onStatusUpdate: (patchId: number, status: PatchStatus) => Promise<void>;
  onDelete: (patchId: number) => Promise<void>;
  onGenerateSubPatches?: (basePatch: IReferencePatch) => Promise<void>;
  // New props for Phase 3 & 4
  currentLayer: LayerSelection;
  onEditLayer: () => void;
  editButtonEnabled: boolean;
  onDeselect: () => void;
  // Batch progress indicator
  batchProgress?: {
    layer: "deadwood" | "forest_cover" | null;
    current: number;
    total: number;
    percentage: number;
  } | null;
}

export default function PatchDetailSidebar({
  basePatch,
  selectedPatch,
  selectedResolution,
  allPatches,
  onResolutionChange,
  onPatchSelect,
  onStatusUpdate,
  onDelete,
  onGenerateSubPatches,
  currentLayer,
  onEditLayer,
  editButtonEnabled,
  onDeselect,
  batchProgress,
}: Props) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [optimisticStatuses, setOptimisticStatuses] = useState<Map<number, PatchStatus>>(new Map());
  const [isDelayingNavigation, setIsDelayingNavigation] = useState(false);

  // Ref to always access the latest optimistic statuses (fixes stale closure in setTimeout)
  const optimisticStatusesRef = useRef(optimisticStatuses);
  useEffect(() => {
    optimisticStatusesRef.current = optimisticStatuses;
  }, [optimisticStatuses]);

  // Get all patches for the selected base patch
  const basePatchFamily = useMemo(() => {
    const baseIndex = basePatch.patch_index;
    return allPatches.filter((p) => p.patch_index === baseIndex || p.patch_index.startsWith(baseIndex + "_"));
  }, [allPatches, basePatch.patch_index]);

  // Check if sub-patches have been generated
  const hasSubPatches = basePatchFamily.length > 1;

  // Get patches for current resolution
  const patchesForResolution = useMemo(
    () => basePatchFamily.filter((p) => p.resolution_cm === selectedResolution),
    [basePatchFamily, selectedResolution],
  );

  // Sort patches spatially: top to bottom (ascending Y), then left to right (ascending X)
  const sortedPatches = useMemo(() => {
    return [...patchesForResolution].sort((a, b) => {
      // Get center coordinates
      const aCoords = a.geometry.coordinates[0];
      const aCenterY = (aCoords[0][1] + aCoords[2][1]) / 2;
      const aCenterX = (aCoords[0][0] + aCoords[2][0]) / 2;

      const bCoords = b.geometry.coordinates[0];
      const bCenterY = (bCoords[0][1] + bCoords[2][1]) / 2;
      const bCenterX = (bCoords[0][0] + bCoords[2][0]) / 2;

      // Sort by Y (ascending - southernmost first, which is top-left on screen)
      const yDiff = aCenterY - bCenterY;
      if (Math.abs(yDiff) > 1) return yDiff > 0 ? -1 : 1;

      // Then by X (ascending - westernmost first)
      return aCenterX - bCenterX;
    });
  }, [patchesForResolution]);

  // Current patch index in sorted list
  const currentIndex = sortedPatches.findIndex((p) => p.id === selectedPatch.id);

  // Auto-select first patch if none is selected (e.g., after generating sub-patches)
  // BUT don't auto-select if all patches are already completed
  useEffect(() => {
    if (currentIndex === -1 && sortedPatches.length > 0) {
      // Check if there are any pending patches (considering optimistic statuses)
      const hasPendingPatches = sortedPatches.some((p) => {
        const optimisticStatus = optimisticStatusesRef.current.get(p.id);
        const effectiveStatus = optimisticStatus || p.status || "pending";
        return effectiveStatus === "pending";
      });

      // Only auto-select if there are pending patches
      // This prevents re-selecting when user has completed all patches
      if (hasPendingPatches) {
        onPatchSelect(sortedPatches[0].id);
      }
    }
  }, [currentIndex, sortedPatches, onPatchSelect]);

  // Calculate progress for this base patch (only count 5cm - 10cm is auto-validated)
  const basePatchProgress = useMemo(() => {
    const patches10 = basePatchFamily.filter((p) => p.resolution_cm === 10);
    const patches5 = basePatchFamily.filter((p) => p.resolution_cm === 5);
    const completed10 = patches10.filter((p) => p.status === "good" || p.status === "bad").length;
    const completed5 = patches5.filter((p) => p.status === "good" || p.status === "bad").length;
    const total5 = patches5.length;
    return {
      completed10,
      total10: patches10.length,
      completed5,
      total5: patches5.length,
      percent: total5 > 0 ? Math.round((completed5 / total5) * 100) : 0,
    };
  }, [basePatchFamily]);

  // Find next pending patch
  const findNextPendingPatch = useCallback(() => {
    // Helper to get effective status (optimistic or actual)
    // Use ref to always get the latest optimistic statuses
    const getEffectiveStatus = (patch: IReferencePatch) => {
      return optimisticStatusesRef.current.get(patch.id) || patch.status || "pending";
    };

    // First priority: look for pending patches in current resolution after current index
    const nextInResolution = sortedPatches.find((p, idx) => idx > currentIndex && getEffectiveStatus(p) === "pending");
    if (nextInResolution) return nextInResolution;

    // Second priority: wrap around within current resolution to complete all patches
    // Look for ANY pending patches from the beginning (before current index)
    const wrapAroundInCurrentRes = sortedPatches.find((p) => getEffectiveStatus(p) === "pending");
    if (wrapAroundInCurrentRes) return wrapAroundInCurrentRes;

    // Third priority: current resolution is 100% complete, move to next resolution
    // Skip 10cm since we only QA 5cm patches (10cm is auto-validated)
    const resolutions: PatchResolution[] = [20, 5];
    const currentResIdx = resolutions.indexOf(selectedResolution);
    for (let i = currentResIdx + 1; i < resolutions.length; i++) {
      const nextRes = resolutions[i];
      const patchesInNextRes = basePatchFamily.filter((p) => p.resolution_cm === nextRes);

      // Sort spatially like sortedPatches
      const sortedNextRes = patchesInNextRes.sort((a, b) => {
        const aCoords = a.geometry.coordinates[0];
        const aCenterY = (aCoords[0][1] + aCoords[2][1]) / 2;
        const aCenterX = (aCoords[0][0] + aCoords[2][0]) / 2;

        const bCoords = b.geometry.coordinates[0];
        const bCenterY = (bCoords[0][1] + bCoords[2][1]) / 2;
        const bCenterX = (bCoords[0][0] + bCoords[2][0]) / 2;

        const yDiff = aCenterY - bCenterY;
        if (Math.abs(yDiff) > 1) return yDiff > 0 ? -1 : 1;
        return aCenterX - bCenterX;
      });

      const pendingInNextRes = sortedNextRes.find((p) => getEffectiveStatus(p) === "pending");
      if (pendingInNextRes) {
        onResolutionChange(nextRes);
        return pendingInNextRes;
      }
    }

    // No pending patches found in any resolution - all complete!
    return null;
  }, [sortedPatches, currentIndex, selectedResolution, basePatchFamily, onResolutionChange]);

  // Handle navigation
  const handlePrevious = useCallback(() => {
    if (currentIndex > 0) {
      onPatchSelect(sortedPatches[currentIndex - 1].id);
    }
  }, [currentIndex, sortedPatches, onPatchSelect]);

  const handleNext = useCallback(() => {
    if (currentIndex < sortedPatches.length - 1) {
      onPatchSelect(sortedPatches[currentIndex + 1].id);
    }
  }, [currentIndex, sortedPatches, onPatchSelect]);

  const handleJumpToNextPending = () => {
    const next = findNextPendingPatch();
    if (next) {
      onPatchSelect(next.id);
    }
  };

  // Handle generating sub-patches
  const handleGenerateSubPatches = useCallback(async () => {
    if (!onGenerateSubPatches) return;
    setIsGenerating(true);
    try {
      await onGenerateSubPatches(basePatch);
    } finally {
      setIsGenerating(false);
    }
  }, [basePatch, onGenerateSubPatches]);

  // Clear optimistic status for the current patch when navigating to a different patch
  // This ensures we always show fresh data when selecting a patch
  useEffect(() => {
    // When patch changes, clear any stale optimistic status for the previous patch
    // Keep optimistic statuses only during the brief delay period
    return () => {
      // Cleanup when patch changes
    };
  }, [selectedPatch.id]);

  // Get the current display status (optimistic if available, otherwise actual)
  // Use useMemo to ensure it recalculates when dependencies change
  const displayStatus = useMemo(() => {
    const optimistic = optimisticStatuses.get(selectedPatch.id);
    const actual = selectedPatch.status || "pending";
    return optimistic || actual;
  }, [optimisticStatuses, selectedPatch.id, selectedPatch.status]);

  // Handle status change from radio button (instant with auto-advance after brief delay)
  const handleRadioStatusChange = useCallback(
    async (status: PatchStatus) => {
      const patchIdToUpdate = selectedPatch.id;

      // Set optimistic status immediately for instant UI feedback
      const updatedStatuses = new Map(optimisticStatuses);
      updatedStatuses.set(patchIdToUpdate, status);
      setOptimisticStatuses(updatedStatuses);

      // CRITICAL: Update the ref synchronously so findNextPendingPatch sees the change
      optimisticStatusesRef.current = updatedStatuses;

      // Mark that we're delaying navigation to hide the clear button
      setIsDelayingNavigation(true);

      // Wait briefly to show visual feedback, then advance and update
      setTimeout(() => {
        // Auto-advance to next pending patch
        const next = findNextPendingPatch();
        if (next) {
          onPatchSelect(next.id);
        } else {
          // No more pending patches - all complete! Just deselect immediately
          onPatchSelect(null);
        }

        // Clear the delaying flag after navigation
        setIsDelayingNavigation(false);

        // Update status in background after navigating
        onStatusUpdate(patchIdToUpdate, status).then(() => {
          // Clear optimistic status after DB update completes
          setOptimisticStatuses((prev) => {
            const next = new Map(prev);
            next.delete(patchIdToUpdate);
            return next;
          });
          // Also clear from ref
          optimisticStatusesRef.current.delete(patchIdToUpdate);
        });
      }, 200); // 200ms delay to show button state change
    },
    [selectedPatch, findNextPendingPatch, onStatusUpdate, onPatchSelect, optimisticStatuses],
  );

  // Handle clear rating (no auto-advance)
  const handleClearRating = useCallback(async () => {
    const patchIdToUpdate = selectedPatch.id;

    // Set optimistic status to pending immediately
    const updatedStatuses = new Map(optimisticStatuses);
    updatedStatuses.set(patchIdToUpdate, "pending");
    setOptimisticStatuses(updatedStatuses);

    // Update ref synchronously
    optimisticStatusesRef.current = updatedStatuses;

    // Mark that we're in a transition state
    setIsDelayingNavigation(true);

    // Update status immediately in background
    onStatusUpdate(patchIdToUpdate, "pending").then(() => {
      // Wait a bit after DB update before clearing optimistic status
      // This ensures the refetch has completed and we have the new data
      setTimeout(() => {
        setIsDelayingNavigation(false);
        setOptimisticStatuses((prev) => {
          const next = new Map(prev);
          next.delete(patchIdToUpdate);
          return next;
        });
        // Also clear from ref
        optimisticStatusesRef.current.delete(patchIdToUpdate);
      }, 100);
    });
  }, [selectedPatch, onStatusUpdate, optimisticStatuses]);

  // Handle status change with auto-advance (for keyboard shortcuts)
  const handleStatusChangeWithAdvance = useCallback(
    async (status: PatchStatus) => {
      const patchIdToUpdate = selectedPatch.id; // Capture ID before navigation

      // Set optimistic status immediately for instant UI feedback
      const updatedStatuses = new Map(optimisticStatuses);
      updatedStatuses.set(patchIdToUpdate, status);
      setOptimisticStatuses(updatedStatuses);

      // CRITICAL: Update the ref synchronously so findNextPendingPatch sees the change
      optimisticStatusesRef.current = updatedStatuses;

      // Wait briefly to show visual feedback, then advance
      setTimeout(() => {
        // Auto-advance to next pending patch
        const next = findNextPendingPatch();
        if (next) {
          onPatchSelect(next.id);
        } else {
          // No more pending patches - all complete! Just deselect immediately
          onPatchSelect(null);
        }

        // Update status in background after navigating
        onStatusUpdate(patchIdToUpdate, status).then(() => {
          // Clear optimistic status after DB update completes
          setOptimisticStatuses((prev) => {
            const next = new Map(prev);
            next.delete(patchIdToUpdate);
            return next;
          });
          // Also clear from ref
          optimisticStatusesRef.current.delete(patchIdToUpdate);
        });
      }, 250); // Visual feedback delay - show button selection before navigating
    },
    [selectedPatch, findNextPendingPatch, onStatusUpdate, onPatchSelect, optimisticStatuses],
  );

  // Check if all patches are completed
  const isComplete = basePatchProgress.percent === 100;

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return; // Don't trigger shortcuts when typing
      }

      switch (e.key.toLowerCase()) {
        case "q": // Q key for Good
          e.preventDefault();
          handleStatusChangeWithAdvance("good");
          break;
        case "r": // R key for Bad
          e.preventDefault();
          handleStatusChangeWithAdvance("bad");
          break;
        case "arrowright":
        case "arrowdown":
          e.preventDefault();
          handleNext();
          break;
        case "arrowleft":
        case "arrowup":
          e.preventDefault();
          handlePrevious();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleNext, handlePrevious, handleStatusChangeWithAdvance]);

  return (
    <div className="flex h-full w-96 flex-shrink-0 flex-col border-l bg-gray-50">
      {/* Base Patch Summary */}
      <Card
        size="small"
        className="border-0 border-b border-t p-2"
        extra={
          <Button
            icon={<CloseOutlined />}
            onClick={onDeselect}
            size="small"
            title="Deselect patch (Esc)"
            className="flex items-center gap-1"
          >
            Deselect Patch (Esc)
          </Button>
        }
      >
        <div className="mb-3">
          <Typography.Text strong>Base Patch: {basePatch.patch_index}</Typography.Text>
          {isComplete && (
            <div className="mt-2 flex items-center gap-2 text-green-600">
              <CheckCircleOutlined />
              <span className="font-medium">Complete!</span>
            </div>
          )}
        </div>
        {hasSubPatches && (
          <Space direction="vertical" size="small" className="w-full">
            <div className="flex justify-between gap-4">
              <div className="flex-1">
                <div className="mb-1 text-xs text-gray-500">5cm Patches (QA)</div>
                <div className="text-base">
                  <span className="font-semibold">{basePatchProgress.completed5}</span>{" "}
                  <span className="text-gray-400">/</span>{" "}
                  <span className="text-gray-500">{basePatchProgress.total5}</span>
                </div>
              </div>
              <div className="flex-1">
                <div className="mb-1 text-xs text-gray-500">10cm (Auto)</div>
                <div className="text-base text-gray-400">
                  <span>{basePatchProgress.completed10}</span> <span className="text-gray-300">/</span>{" "}
                  <span>{basePatchProgress.total10}</span>
                </div>
              </div>
            </div>
            <div>
              <div className="mb-1 text-xs text-gray-500">QA Progress</div>
              <Progress percent={basePatchProgress.percent} />
            </div>
          </Space>
        )}
      </Card>

      {/* Batch Progress Indicator */}
      {batchProgress && batchProgress.layer && (
        <div className="border-b bg-white p-3">
          <BatchProgressIndicator
            layer={batchProgress.layer}
            current={batchProgress.current}
            total={batchProgress.total}
            percentage={batchProgress.percentage}
          />
        </div>
      )}

      {/* Resolution Selector - only show 5cm for QA (10cm is auto-validated) */}
      {hasSubPatches && (
        <Tabs
          activeKey={selectedResolution.toString()}
          onChange={(key) => onResolutionChange(Number(key) as PatchResolution)}
          items={[
            ...(basePatch.status === "pending"
              ? [
                  {
                    key: "20",
                    label: "20cm Base",
                  },
                ]
              : []),
            {
              key: "5",
              label: "5cm Patches (QA)",
            },
          ]}
          size="large"
          centered
        />
      )}

      {/* Action Buttons - only show if sub-patches exist */}
      {hasSubPatches && (
        <div className="flex-1">
          {/* Row 1: Rating Radio Group */}
          <div className="border-b p-4">
            <div className="mb-2 text-sm text-gray-600">Rate this patch:</div>
            <Radio.Group
              key={`radio-${selectedPatch.id}-${displayStatus}`}
              value={displayStatus === "pending" ? undefined : displayStatus}
              onChange={(e) => handleRadioStatusChange(e.target.value as PatchStatus)}
              buttonStyle="solid"
              size="large"
              className="w-full"
            >
              <Radio.Button value="good" className="w-1/2 text-center">
                Good (Q)
              </Radio.Button>
              <Radio.Button value="bad" className="w-1/2 text-center">
                Bad (R)
              </Radio.Button>
            </Radio.Group>
            {displayStatus !== "pending" && !isDelayingNavigation && (
              <Button block onClick={handleClearRating} className="mt-3">
                Clear Rating
              </Button>
            )}
          </div>

          {/* Row 2: Navigation Buttons */}
          <div className="flex-1 border-b p-4">
            <div className="flex w-full items-center justify-center gap-2">
              <Button icon={<LeftOutlined />} onClick={handlePrevious} disabled={currentIndex === 0} className="px-4" />
              <Button onClick={handleJumpToNextPending} className="flex-1 px-4">
                Go to Next Pending
              </Button>
              <Button
                icon={<RightOutlined />}
                onClick={handleNext}
                disabled={currentIndex === sortedPatches.length - 1}
                className="px-4"
              />
            </div>

            {/* Patch info */}
            <div className="mt-3 text-center">
              <Typography.Text type="secondary" className="text-xs">
                Patch {currentIndex + 1} of {sortedPatches.length} • {selectedPatch.patch_index}
              </Typography.Text>
            </div>
          </div>

          {/* Row 3: Dynamic Edit Button */}
          <div className="border-b p-4">
            <Button
              type="primary"
              icon={<EditOutlined />}
              onClick={onEditLayer}
              disabled={!editButtonEnabled}
              block
              size="large"
              title={editButtonEnabled ? "Edit current layer (E)" : "Select a layer to edit"}
            >
              Edit {currentLayer === "deadwood" ? "Deadwood" : "Forest Cover"} (E)
            </Button>
            {!editButtonEnabled && (
              <Typography.Text type="secondary" className="mt-2 block text-center text-xs">
                Select a layer to edit (Deadwood or Forest Cover)
              </Typography.Text>
            )}
          </div>
        </div>
      )}

      {/* Initial Base Patch: Generate Sub-patches */}
      {!hasSubPatches &&
        selectedPatch.resolution_cm === 20 &&
        selectedPatch.status === "pending" &&
        onGenerateSubPatches && (
          <div className="flex-1 p-4">
            <Space direction="vertical" size="middle" className="w-full">
              <Alert
                message="Ready to Generate Sub-patches"
                description="Position the base patch correctly, then generate all nested patches (4×10cm + 16×5cm). After generation, the patch cannot be moved."
                type="info"
                showIcon
              />
              <Button
                type="primary"
                block
                size="large"
                icon={<ThunderboltOutlined />}
                onClick={handleGenerateSubPatches}
                loading={isGenerating}
              >
                Generate Sub-patches
              </Button>
            </Space>
          </div>
        )}

      {/* Delete Button - always at bottom */}
      <div className="mt-auto border-t p-4">
        <Button danger block icon={<DeleteOutlined />} onClick={() => onDelete(selectedPatch.id)}>
          Delete Patch
        </Button>
      </div>
    </div>
  );
}
