import { useState } from "react";
import { Segmented, Slider, Switch, Button, Divider, Checkbox, Tooltip } from "antd";
import { AreaChartOutlined, FlagOutlined, LoginOutlined, InfoCircleOutlined } from "@ant-design/icons";
import { mapColors } from "../../theme/mapColors";
import { palette } from "../../theme/palette";
import MapLegend from "./MapLegend";

interface LayerControlPanelProps {
  // Basemap
  mapStyle: string;
  onMapStyleChange: (style: string) => void;
  // Data layers
  showForest: boolean;
  setShowForest: (show: boolean) => void;
  showDeadwood: boolean;
  setShowDeadwood: (show: boolean) => void;
  // Opacity
  opacity: number;
  setOpacity: (value: number) => void;
  // Polygon stats
  isDrawingPolygon?: boolean;
  onPolygonStatsClick?: () => void;
  // Flags
  showFlagsControls?: boolean;
  isLoggedIn?: boolean;
  isDrawingFlag?: boolean;
  onFlagClick?: () => void;
  onLoginRequired?: () => void;
  showFlagsLayer?: boolean;
  setShowFlagsLayer?: (show: boolean) => void;
  flagsCount?: number;
  clickedValues?: {
    forestPct: number;
    deadwoodPct: number;
  } | null;
  variant?: "floating-card" | "drawer-sheet";
}

// Basemap options: Streets and Satellite
const basemapOptions = [
  { value: "streets-v12", label: "Streets" },
  { value: "wayback", label: "Imagery" },
];

const LayerControlPanel = ({
  mapStyle,
  onMapStyleChange,
  showForest,
  setShowForest,
  showDeadwood,
  setShowDeadwood,
  opacity,
  setOpacity,
  isDrawingPolygon,
  onPolygonStatsClick,
  showFlagsControls,
  isLoggedIn,
  isDrawingFlag,
  onFlagClick,
  onLoginRequired,
  showFlagsLayer,
  setShowFlagsLayer,
  flagsCount,
  clickedValues = null,
  variant = "floating-card",
}: LayerControlPanelProps) => {
  const [showAttributions, setShowAttributions] = useState(false);
  const [showLegend, setShowLegend] = useState(false);
  const isDrawerSheet = variant === "drawer-sheet";
  const actionButtonSize = "small";
  const controlButtonClass = "";
  const shouldShowLegend = !isDrawerSheet || showLegend;

  return (
    <div
      className={`map-control-panel box-border min-w-0 pointer-events-auto flex flex-col overflow-x-hidden p-4 ${isDrawerSheet ? "map-control-panel--drawer w-full" : "w-52 overflow-hidden rounded-2xl border border-gray-200/60 bg-white/95 shadow-xl backdrop-blur-sm"}`}
    >
      {/* Basemap Selection */}
      <div className="mb-2 text-xs font-medium text-gray-500">Basemap</div>
      <Segmented
        size="small"
        block
        value={mapStyle}
        onChange={(value) => onMapStyleChange(value as string)}
        options={basemapOptions}
      />

      <Divider className="my-3" />

      {/* Data Layers - independent toggles, 0/1/2 layers can be active */}
      <div className="mb-2 text-xs font-medium text-gray-500">Data Layers</div>
      <div className="flex flex-col gap-1">
        <Checkbox checked={showForest} onChange={(e) => setShowForest(e.target.checked)}>
          <span className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: mapColors.forest.fill }} />
            <span className="text-xs text-gray-600">Tree</span>
          </span>
        </Checkbox>
        <Checkbox checked={showDeadwood} onChange={(e) => setShowDeadwood(e.target.checked)}>
          <span className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: mapColors.deadwood.fill }} />
            <span className="text-xs text-gray-600">Standing Deadwood</span>
          </span>
        </Checkbox>
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
        tooltip={{ formatter: (v) => `${Math.round((v || 0) * 100)}%`, placement: "left" }}
      />

      <Divider className="my-3" />
      <div className="mb-1 text-xs font-medium text-gray-500">Model Info</div>
      <Tooltip title="View model attributions and papers">
        <Button
          type="link"
          size="small"
          icon={<InfoCircleOutlined />}
          onClick={() => setShowAttributions((prev) => !prev)}
          className={`m-0 w-fit p-0 text-xs ${controlButtonClass}`}
        >
          {showAttributions ? "Hide Citations" : "View Citations"}
        </Button>
      </Tooltip>
      {showAttributions && (
        <div className="mt-2 space-y-2 rounded bg-gray-50 p-2 text-xs">
          <div>
            <div className="font-semibold text-gray-800">Satellite products (Sentinel maps):</div>
            <a
              href="https://eartharxiv.org/repository/view/11912/"
              className="text-blue-600 underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Mosig et al., 2026 (EarthArXiv preprint)
            </a>
          </div>
        </div>
      )}

      {/* Polygon Stats Section */}
      {onPolygonStatsClick && (
        <>
          <Divider className="my-3" />
          <div className="mb-1 text-xs font-medium text-gray-500">Analytics</div>
          <Button
            size={actionButtonSize}
            type={isDrawingPolygon ? "primary" : "default"}
            danger={isDrawingPolygon}
            icon={<AreaChartOutlined />}
            onClick={onPolygonStatsClick}
            block
            className={controlButtonClass}
            style={
              !isDrawingPolygon
                ? { borderColor: palette.primary[500], color: palette.primary[500] }
                : undefined
            }
          >
            {isDrawingPolygon ? "Cancel Drawing" : "Analyze Area"}
          </Button>
          <p className="mt-1 text-xs leading-5 text-gray-400">
            Draw a polygon to see time-series stats
          </p>
        </>
      )}

      {/* Flags Section - shown to all users */}
      {showFlagsControls && (
        <>
          <div className={`${isDrawerSheet ? "mt-3 -mx-4 border-t border-gray-100 bg-[#F8FAF9] px-4 pb-4 pt-3" : "-mx-4 -mb-4 mt-3 border-t border-gray-100 bg-[#F8FAF9] px-4 pb-4 pt-3"}`}>
            <div className="mb-1 text-xs font-medium text-gray-500">Feedback</div>
            <p className="mb-2 text-xs leading-5 text-gray-500">
              Help improve our AI by flagging incorrect predictions
            </p>
            {isLoggedIn ? (
              <>
                <Button
                  size={actionButtonSize}
                  type={isDrawingFlag ? "primary" : "default"}
                  danger={isDrawingFlag}
                  icon={<FlagOutlined />}
                  onClick={onFlagClick}
                  block
                  className={controlButtonClass}
                >
                  {isDrawingFlag ? "Cancel" : "Flag Area"}
                </Button>
                {setShowFlagsLayer && (
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs text-blue-600">
                      Show Flags {flagsCount !== undefined && flagsCount > 0 && `(${flagsCount})`}
                    </span>
                    <Switch size="small" checked={showFlagsLayer} onChange={setShowFlagsLayer} />
                  </div>
                )}
              </>
            ) : (
              <Button
                size={actionButtonSize}
                type="primary"
                icon={<LoginOutlined />}
                onClick={onLoginRequired}
                block
                className={controlButtonClass}
              >
                Sign in to flag areas
              </Button>
            )}

            {isDrawerSheet && (
              <Button
                type="link"
                size="small"
                className="mt-2 h-auto p-0 text-xs font-medium"
                onClick={() => setShowLegend((prev) => !prev)}
              >
                {showLegend ? "Hide legend" : "Show legend"}
              </Button>
            )}

            {shouldShowLegend && (
              <div className="mt-3 border-t border-gray-200/80 pt-3">
                <MapLegend
                  clickedValues={clickedValues}
                  showForest={showForest}
                  showDeadwood={showDeadwood}
                  embedded={true}
                />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default LayerControlPanel;
