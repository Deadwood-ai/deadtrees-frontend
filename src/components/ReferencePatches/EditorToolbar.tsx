import { Button, Card, Space, Divider } from "antd";
import {
  SaveOutlined,
  StopOutlined,
  EditOutlined,
  ScissorOutlined,
  MergeCellsOutlined,
  RobotOutlined,
  DeleteOutlined,
  UndoOutlined,
} from "@ant-design/icons";

interface Props {
  type: "deadwood" | "forest_cover";
  isDrawing: boolean;
  hasSelection: boolean;
  selectionCount: number;
  isAIActive: boolean;
  isAIProcessing: boolean;
  onToggleDraw: () => void;
  onCutHole: () => void;
  onMerge: () => void;
  onToggleAI: () => void;
  onDeleteSelected: () => void;
  onUndo: () => void;
  canUndo: boolean;
  onSave: () => void;
  onCancel: () => void;
  position?: "top-right" | "top-left";
}

export default function EditorToolbar({
  type,
  isDrawing,
  hasSelection,
  selectionCount,
  isAIActive,
  isAIProcessing,
  onToggleDraw,
  onCutHole,
  onMerge,
  onToggleAI,
  onDeleteSelected,
  onUndo,
  canUndo,
  onSave,
  onCancel,
  position = "top-right",
}: Props) {
  return (
    <div className={`absolute ${position === "top-right" ? "right-4" : "left-4"} top-4 z-20`}>
      <Card
        title={`Editing ${type === "deadwood" ? "Deadwood" : "Forest Cover"}`}
        className="shadow-lg"
        style={{ width: 300 }}
        size="small"
      >
        <Space direction="vertical" size="small" className="w-full">
          {/* Draw Toggle */}
          <Button
            icon={isDrawing ? <StopOutlined /> : <EditOutlined />}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleDraw();
            }}
            block
            type={isDrawing ? "primary" : "default"}
            htmlType="button"
            title="Click to draw vertices, or hold Shift for freehand drawing"
          >
            {isDrawing ? "Stop Drawing" : "Draw Polygon"}
          </Button>

          {/* Cut Hole */}
          <Button
            icon={<ScissorOutlined />}
            onClick={onCutHole}
            disabled={!hasSelection || selectionCount !== 1}
            block
            title="Select one polygon, then draw to cut a hole or trim edges. Hold Shift for freehand."
          >
            Cut Hole {hasSelection && selectionCount === 1 ? "(Ready)" : ""}
          </Button>

          {/* Merge */}
          <Button
            icon={<MergeCellsOutlined />}
            onClick={onMerge}
            disabled={!hasSelection || selectionCount !== 2}
            block
            title="Select exactly 2 polygons to merge (works with overlapping or nested polygons)"
          >
            Merge Selected {hasSelection && selectionCount === 2 ? `(${selectionCount})` : ""}
          </Button>

          {/* AI Segmentation */}
          <Button
            icon={<RobotOutlined />}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleAI();
            }}
            loading={isAIProcessing}
            block
            type={isAIActive ? "primary" : "default"}
            title="Draw a box to run AI segmentation"
            htmlType="button"
          >
            {isAIActive ? "AI Active (draw box)" : "AI Segment"}
          </Button>

          {/* Delete */}
          <Button
            icon={<DeleteOutlined />}
            onClick={onDeleteSelected}
            disabled={!hasSelection || selectionCount === 0}
            danger
            block
          >
            Delete Selected {hasSelection && selectionCount > 0 ? `(${selectionCount})` : ""}
          </Button>

          {/* Undo */}
          <Button
            icon={<UndoOutlined />}
            onClick={onUndo}
            disabled={!canUndo}
            block
            title="Undo last action (Ctrl/Cmd+Z)"
          >
            Undo
          </Button>

          <Divider style={{ margin: "8px 0" }} />

          {/* Save/Cancel */}
          <Button type="primary" icon={<SaveOutlined />} onClick={onSave} block size="large" htmlType="button">
            Save Changes
          </Button>

          <Button onClick={onCancel} block htmlType="button">
            Cancel
          </Button>
        </Space>
      </Card>
    </div>
  );
}
