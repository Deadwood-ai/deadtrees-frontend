import { Button, Card, Space, Divider } from "antd";
import {
  SaveOutlined,
  StopOutlined,
  EditOutlined,
  ScissorOutlined,
  MergeCellsOutlined,
  RobotOutlined,
  DeleteOutlined,
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
            onClick={onToggleDraw}
            block
            type={isDrawing ? "primary" : "default"}
          >
            {isDrawing ? "Stop Drawing" : "Draw Polygon"}
          </Button>

          {/* Cut Hole */}
          <Button
            icon={<ScissorOutlined />}
            onClick={onCutHole}
            disabled={!hasSelection || selectionCount !== 1}
            block
            title="Select one polygon, then draw a hole to cut"
          >
            Cut Hole {hasSelection && selectionCount === 1 ? "(Ready)" : ""}
          </Button>

          {/* Merge */}
          <Button
            icon={<MergeCellsOutlined />}
            onClick={onMerge}
            disabled={!hasSelection || selectionCount < 2}
            block
            title="Select 2+ polygons to merge"
          >
            Merge Selected {hasSelection && selectionCount >= 2 ? `(${selectionCount})` : ""}
          </Button>

          {/* AI Segmentation */}
          <Button
            icon={<RobotOutlined />}
            onClick={onToggleAI}
            loading={isAIProcessing}
            block
            type={isAIActive ? "primary" : "default"}
            title="Draw a box to run AI segmentation"
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

          <Divider style={{ margin: "8px 0" }} />

          {/* Save/Cancel */}
          <Button type="primary" icon={<SaveOutlined />} onClick={onSave} block size="large">
            Save Changes
          </Button>

          <Button onClick={onCancel} block>
            Cancel
          </Button>
        </Space>
      </Card>
    </div>
  );
}
