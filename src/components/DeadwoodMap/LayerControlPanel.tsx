import { Segmented, Slider, Switch, Button, Divider } from "antd";
import { FlagOutlined, GlobalOutlined, PictureOutlined } from "@ant-design/icons";

interface LayerControlPanelProps {
  // Basemap
  mapStyle: string;
  onMapStyleChange: (style: string) => void;
  currentZoom: number;
  // Data layers
  showForest: boolean;
  setShowForest: (show: boolean) => void;
  showDeadwood: boolean;
  setShowDeadwood: (show: boolean) => void;
  // Opacity
  opacity: number;
  setOpacity: (value: number) => void;
  // Flags (optional, only for logged-in users)
  showFlagsControls?: boolean;
  isDrawingFlag?: boolean;
  onFlagClick?: () => void;
  showFlagsLayer?: boolean;
  setShowFlagsLayer?: (show: boolean) => void;
  flagsCount?: number;
}

const SATELLITE_MIN_ZOOM = 14;

const LayerControlPanel = ({
  mapStyle,
  onMapStyleChange,
  currentZoom,
  showForest,
  setShowForest,
  showDeadwood,
  setShowDeadwood,
  opacity,
  setOpacity,
  showFlagsControls,
  isDrawingFlag,
  onFlagClick,
  showFlagsLayer,
  setShowFlagsLayer,
  flagsCount,
}: LayerControlPanelProps) => {
  const canShowSatellite = currentZoom >= SATELLITE_MIN_ZOOM;

  // Build basemap options based on zoom level
  const basemapOptions = canShowSatellite
    ? [
        { value: "streets-v12", icon: <GlobalOutlined />, label: "Streets" },
        { value: "satellite-streets-v12", icon: <PictureOutlined />, label: "Satellite" },
      ]
    : [{ value: "streets-v12", icon: <GlobalOutlined />, label: "Streets" }];

  return (
    <div className="flex w-48 flex-col rounded-lg bg-white/95 p-3 backdrop-blur-sm">
      {/* Basemap Selection */}
      <div className="mb-2 text-xs font-medium text-gray-500">Basemap</div>
      <Segmented
        size="small"
        block
        value={mapStyle === "satellite-streets-v12" && !canShowSatellite ? "streets-v12" : mapStyle}
        onChange={(value) => onMapStyleChange(value as string)}
        options={basemapOptions}
      />

      <Divider className="my-3" />

      {/* Data Layers */}
      <div className="mb-2 text-xs font-medium text-gray-500">Data Layers</div>
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-sm bg-green-500" />
            <span className="text-xs text-gray-600">Tree Cover</span>
          </div>
          <Switch size="small" checked={showForest} onChange={setShowForest} />
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-sm bg-red-500" />
            <span className="text-xs text-gray-600">Deadwood</span>
          </div>
          <Switch size="small" checked={showDeadwood} onChange={setShowDeadwood} />
        </div>
      </div>

      <Divider className="my-3" />

      {/* Opacity */}
      <div className="mb-1 text-xs font-medium text-gray-500">Layer Opacity</div>
      <Slider
        min={0}
        max={1}
        step={0.01}
        value={opacity}
        onChange={setOpacity}
        tooltip={{ formatter: (v) => `${Math.round((v || 0) * 100)}%` }}
      />

      {/* Flags Section - only for logged-in users */}
      {showFlagsControls && (
        <>
          <Divider className="my-3" />
          <div className="mb-2 text-xs font-medium text-gray-500">Feedback</div>
          <Button
            size="small"
            type={isDrawingFlag ? "primary" : "default"}
            danger={isDrawingFlag}
            icon={<FlagOutlined />}
            onClick={onFlagClick}
            block
          >
            {isDrawingFlag ? "Cancel" : "Flag Area"}
          </Button>
          {setShowFlagsLayer && (
            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs text-gray-600">
                Show Flags {flagsCount !== undefined && flagsCount > 0 && `(${flagsCount})`}
              </span>
              <Switch size="small" checked={showFlagsLayer} onChange={setShowFlagsLayer} />
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default LayerControlPanel;
