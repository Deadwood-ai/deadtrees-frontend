import { useMemo, useEffect, useCallback, useState } from "react";
import { Button, Card, Progress, Radio, Space, Statistic, Typography, Alert, Tabs } from "antd";
import {
  LeftOutlined,
  RightOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import { IMLTile, TileResolution, TileStatus } from "../../types/mlTiles";

interface Props {
  baseTile: IMLTile;
  selectedTile: IMLTile;
  selectedResolution: TileResolution;
  allTiles: IMLTile[];
  onResolutionChange: (resolution: TileResolution) => void;
  onTileSelect: (tileId: number) => void;
  onStatusUpdate: (tileId: number, status: TileStatus) => Promise<void>;
  onDelete: (tileId: number) => Promise<void>;
  onGenerateSubTiles?: (baseTile: IMLTile) => Promise<void>;
}

export default function MLTileDetailSidebar({
  baseTile,
  selectedTile,
  selectedResolution,
  allTiles,
  onResolutionChange,
  onTileSelect,
  onStatusUpdate,
  onDelete,
  onGenerateSubTiles,
}: Props) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [optimisticStatuses, setOptimisticStatuses] = useState<Map<number, TileStatus>>(new Map());
  const [isDelayingNavigation, setIsDelayingNavigation] = useState(false);
  // Get all tiles for the selected base tile
  const baseTileFamily = useMemo(() => {
    const baseIndex = baseTile.tile_index;
    return allTiles.filter((t) => t.tile_index === baseIndex || t.tile_index.startsWith(baseIndex + "_"));
  }, [allTiles, baseTile.tile_index]);

  // Check if sub-tiles have been generated
  const hasSubTiles = baseTileFamily.length > 1;

  // Get tiles for current resolution
  const tilesForResolution = useMemo(
    () => baseTileFamily.filter((t) => t.resolution_cm === selectedResolution),
    [baseTileFamily, selectedResolution],
  );

  // Sort tiles spatially: top to bottom (descending Y), then left to right (ascending X)
  const sortedTiles = useMemo(() => {
    return [...tilesForResolution].sort((a, b) => {
      // Get center coordinates
      const aCoords = a.geometry.coordinates[0];
      const aCenterY = (aCoords[0][1] + aCoords[2][1]) / 2;
      const aCenterX = (aCoords[0][0] + aCoords[2][0]) / 2;

      const bCoords = b.geometry.coordinates[0];
      const bCenterY = (bCoords[0][1] + bCoords[2][1]) / 2;
      const bCenterX = (bCoords[0][0] + bCoords[2][0]) / 2;

      // Sort by Y (descending - northernmost first)
      const yDiff = bCenterY - aCenterY;
      if (Math.abs(yDiff) > 1) return yDiff > 0 ? -1 : 1;

      // Then by X (ascending - westernmost first)
      return aCenterX - bCenterX;
    });
  }, [tilesForResolution]);

  // Current tile index in sorted list
  const currentIndex = sortedTiles.findIndex((t) => t.id === selectedTile.id);

  // Auto-select first tile if none is selected (e.g., after generating sub-tiles)
  useEffect(() => {
    if (currentIndex === -1 && sortedTiles.length > 0) {
      // No tile is selected but we have tiles - select the first one
      onTileSelect(sortedTiles[0].id);
    }
  }, [currentIndex, sortedTiles, onTileSelect]);

  // Calculate progress for this base tile
  const baseTileProgress = useMemo(() => {
    const tiles10 = baseTileFamily.filter((t) => t.resolution_cm === 10);
    const tiles5 = baseTileFamily.filter((t) => t.resolution_cm === 5);
    const good10 = tiles10.filter((t) => t.status === "good").length;
    const good5 = tiles5.filter((t) => t.status === "good").length;
    const bad10 = tiles10.filter((t) => t.status === "bad").length;
    const bad5 = tiles5.filter((t) => t.status === "bad").length;
    const total = tiles10.length + tiles5.length;
    const completed = good10 + good5 + bad10 + bad5;
    return {
      good10,
      total10: tiles10.length,
      good5,
      total5: tiles5.length,
      percent: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  }, [baseTileFamily]);

  // Find next pending tile
  const findNextPendingTile = useCallback(() => {
    // First priority: look for pending tiles in current resolution after current index
    const nextInResolution = sortedTiles.find((t, idx) => idx > currentIndex && t.status === "pending");
    if (nextInResolution) return nextInResolution;

    // Second priority: look for ANY pending tiles in current resolution (wrap around to beginning)
    const anyPendingInCurrentRes = sortedTiles.find((t) => t.status === "pending");
    if (anyPendingInCurrentRes) return anyPendingInCurrentRes;

    // Third priority: move to next resolution and find first pending tile
    const resolutions: TileResolution[] = [20, 10, 5];
    const currentResIdx = resolutions.indexOf(selectedResolution);
    for (let i = currentResIdx + 1; i < resolutions.length; i++) {
      const nextRes = resolutions[i];
      const tilesInNextRes = baseTileFamily.filter((t) => t.resolution_cm === nextRes);

      // Sort spatially like sortedTiles
      const sortedNextRes = tilesInNextRes.sort((a, b) => {
        const aCoords = a.geometry.coordinates[0];
        const aCenterY = (aCoords[0][1] + aCoords[2][1]) / 2;
        const aCenterX = (aCoords[0][0] + aCoords[2][0]) / 2;

        const bCoords = b.geometry.coordinates[0];
        const bCenterY = (bCoords[0][1] + bCoords[2][1]) / 2;
        const bCenterX = (bCoords[0][0] + bCoords[2][0]) / 2;

        const yDiff = bCenterY - aCenterY;
        if (Math.abs(yDiff) > 1) return yDiff > 0 ? -1 : 1;
        return aCenterX - bCenterX;
      });

      const pendingInNextRes = sortedNextRes.find((t) => t.status === "pending");
      if (pendingInNextRes) {
        onResolutionChange(nextRes);
        return pendingInNextRes;
      }
    }

    return null;
  }, [sortedTiles, currentIndex, selectedResolution, baseTileFamily, onResolutionChange]);

  // Handle navigation
  const handlePrevious = useCallback(() => {
    if (currentIndex > 0) {
      onTileSelect(sortedTiles[currentIndex - 1].id);
    }
  }, [currentIndex, sortedTiles, onTileSelect]);

  const handleNext = useCallback(() => {
    if (currentIndex < sortedTiles.length - 1) {
      onTileSelect(sortedTiles[currentIndex + 1].id);
    }
  }, [currentIndex, sortedTiles, onTileSelect]);

  const handleJumpToNextPending = () => {
    const next = findNextPendingTile();
    if (next) {
      onTileSelect(next.id);
    }
  };

  // Handle generating sub-tiles
  const handleGenerateSubTiles = useCallback(async () => {
    if (!onGenerateSubTiles) return;
    setIsGenerating(true);
    try {
      await onGenerateSubTiles(baseTile);
    } finally {
      setIsGenerating(false);
    }
  }, [baseTile, onGenerateSubTiles]);

  // Get the current display status (optimistic if available, otherwise actual)
  const displayStatus = optimisticStatuses.get(selectedTile.id) || selectedTile.status || "pending";

  // Handle status change from radio button (instant with auto-advance after brief delay)
  const handleRadioStatusChange = useCallback(
    async (status: TileStatus) => {
      const tileIdToUpdate = selectedTile.id;

      // Set optimistic status immediately for instant UI feedback
      setOptimisticStatuses((prev) => {
        const next = new Map(prev);
        next.set(tileIdToUpdate, status);
        return next;
      });

      // Mark that we're delaying navigation to hide the clear button
      setIsDelayingNavigation(true);

      // Wait briefly to show visual feedback, then advance and update
      setTimeout(() => {
        // Auto-advance to next pending tile
        const next = findNextPendingTile();
        if (next) {
          onTileSelect(next.id);
        }

        // Clear the delaying flag after navigation
        setIsDelayingNavigation(false);

        // Update status in background after navigating
        onStatusUpdate(tileIdToUpdate, status).then(() => {
          // Clear optimistic status after DB update completes
          setOptimisticStatuses((prev) => {
            const next = new Map(prev);
            next.delete(tileIdToUpdate);
            return next;
          });
        });
      }, 200); // 200ms delay to show button state change
    },
    [selectedTile, findNextPendingTile, onStatusUpdate, onTileSelect],
  );

  // Handle clear rating (no auto-advance)
  const handleClearRating = useCallback(async () => {
    const tileIdToUpdate = selectedTile.id;

    // Set optimistic status to pending immediately
    setOptimisticStatuses((prev) => {
      const next = new Map(prev);
      next.set(tileIdToUpdate, "pending");
      return next;
    });

    // Mark that we're in a transition state
    setIsDelayingNavigation(true);

    // Update status immediately in background
    onStatusUpdate(tileIdToUpdate, "pending").then(() => {
      // Wait a bit after DB update before clearing optimistic status
      // This ensures the refetch has completed and we have the new data
      setTimeout(() => {
        setIsDelayingNavigation(false);
        setOptimisticStatuses((prev) => {
          const next = new Map(prev);
          next.delete(tileIdToUpdate);
          return next;
        });
      }, 100);
    });
  }, [selectedTile, onStatusUpdate]);

  // Handle status change with auto-advance (for keyboard shortcuts)
  const handleStatusChangeWithAdvance = useCallback(
    async (status: TileStatus) => {
      const tileIdToUpdate = selectedTile.id; // Capture ID before navigation

      // Auto-advance to next pending tile BEFORE updating status
      // This allows the animation to start before the refetch happens
      const next = findNextPendingTile();
      if (next) {
        onTileSelect(next.id);
      }

      // Update status after a small delay to let the animation complete smoothly
      setTimeout(() => {
        onStatusUpdate(tileIdToUpdate, status);
      }, 500); // Delay to allow animation to complete (400ms duration + 100ms buffer)
    },
    [selectedTile, findNextPendingTile, onStatusUpdate, onTileSelect],
  );

  // Check if all tiles are completed
  const isComplete = baseTileProgress.percent === 100;

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return; // Don't trigger shortcuts when typing
      }

      switch (e.key.toLowerCase()) {
        case "g":
          e.preventDefault();
          handleStatusChangeWithAdvance("good");
          break;
        case "b":
          e.preventDefault();
          handleStatusChangeWithAdvance("bad");
          break;
        case "p":
          e.preventDefault();
          handleStatusChangeWithAdvance("pending");
          break;
        case "arrowright":
          e.preventDefault();
          handleNext();
          break;
        case "arrowleft":
          e.preventDefault();
          handlePrevious();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleNext, handlePrevious, handleStatusChangeWithAdvance]);

  return (
    <div className="flex h-full w-96 flex-shrink-0 flex-col border-l bg-white">
      {/* Base Tile Summary */}
      <Card size="small" className="border-0 border-b">
        <div className="mb-3">
          <Typography.Text strong>Base Tile: {baseTile.tile_index}</Typography.Text>
          {isComplete && (
            <div className="mt-2 flex items-center gap-2 text-green-600">
              <CheckCircleOutlined />
              <span className="font-medium">Complete!</span>
            </div>
          )}
        </div>
        {hasSubTiles && (
          <Space direction="vertical" size="small" className="w-full">
            <div className="flex justify-between">
              <Statistic
                title="10cm Good"
                value={baseTileProgress.good10}
                suffix={`/ ${baseTileProgress.total10}`}
                valueStyle={{ fontSize: 16 }}
              />
              <Statistic
                title="5cm Good"
                value={baseTileProgress.good5}
                suffix={`/ ${baseTileProgress.total5}`}
                valueStyle={{ fontSize: 16 }}
              />
            </div>
            <div>
              <div className="mb-1 text-xs text-gray-500">Progress</div>
              <Progress percent={baseTileProgress.percent} />
            </div>
          </Space>
        )}
      </Card>

      {/* Resolution Selector - only show if sub-tiles exist */}
      {hasSubTiles && (
        <Tabs
          activeKey={selectedResolution.toString()}
          onChange={(key) => onResolutionChange(Number(key) as TileResolution)}
          items={[
            ...(baseTile.status === "pending"
              ? [
                  {
                    key: "20",
                    label: "20cm",
                  },
                ]
              : []),
            {
              key: "10",
              label: "10cm",
            },
            {
              key: "5",
              label: "5cm",
            },
          ]}
          size="large"
          centered
        />
      )}

      {/* Action Buttons - only show if sub-tiles exist */}
      {hasSubTiles && (
        <div className="flex-1">
          {/* Row 1: Rating Radio Group */}
          <div className="border-b p-4">
            <div className="mb-2 text-sm text-gray-600">Rate this tile:</div>
            <Radio.Group
              value={displayStatus === "pending" ? undefined : displayStatus}
              onChange={(e) => handleRadioStatusChange(e.target.value as TileStatus)}
              buttonStyle="solid"
              size="large"
              className="w-full"
            >
              <Radio.Button value="good" className="w-1/2 text-center">
                Good (G)
              </Radio.Button>
              <Radio.Button value="bad" className="w-1/2 text-center">
                Bad (B)
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
                disabled={currentIndex === sortedTiles.length - 1}
                className="px-4"
              />
            </div>

            {/* Tile info */}
            <div className="mt-3 text-center">
              <Typography.Text type="secondary" className="text-xs">
                Tile {currentIndex + 1} of {sortedTiles.length} • {selectedTile.tile_index}
              </Typography.Text>
            </div>
          </div>
        </div>
      )}

      {/* Initial Base Tile: Generate Sub-tiles */}
      {!hasSubTiles && selectedTile.resolution_cm === 20 && selectedTile.status === "pending" && onGenerateSubTiles && (
        <div className="flex-1 p-4">
          <Space direction="vertical" size="middle" className="w-full">
            <Alert
              message="Ready to Generate Sub-tiles"
              description="Position the base tile correctly, then generate all nested tiles (4×10cm + 16×5cm). After generation, the tile cannot be moved."
              type="info"
              showIcon
            />
            <Button
              type="primary"
              block
              icon={<ThunderboltOutlined />}
              onClick={handleGenerateSubTiles}
              loading={isGenerating}
            >
              Generate Sub-tiles
            </Button>
          </Space>
        </div>
      )}

      {/* Delete Button - always at bottom */}
      <div className="mt-auto border-t p-4">
        <Button danger block icon={<DeleteOutlined />} onClick={() => onDelete(selectedTile.id)}>
          Delete Tile
        </Button>
      </div>
    </div>
  );
}
