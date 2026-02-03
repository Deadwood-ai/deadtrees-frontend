import { useState } from "react";
import { Segmented, Slider, Checkbox, Button, Divider, Tooltip } from "antd";
import {
  FlagOutlined,
  EditOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";

type QualityRating = "great" | "sentinel_ok" | "bad" | null | undefined;

interface DatasetLayerControlPanelProps {
  // Basemap
  mapStyle: string;
  onMapStyleChange: (style: string) => void;
  // Data layers
  showForestCover: boolean;
  setShowForestCover: (show: boolean) => void;
  showDeadwood: boolean;
  setShowDeadwood: (show: boolean) => void;
  showDroneImagery: boolean;
  setShowDroneImagery: (show: boolean) => void;
  showAOI?: boolean;
  setShowAOI?: (show: boolean) => void;
  // Layer availability
  hasForestCover: boolean;
  hasDeadwood: boolean;
  hasAOI?: boolean;
  // Quality ratings from audit
  forestCoverQuality?: QualityRating;
  deadwoodQuality?: QualityRating;
  // Opacity (controls forest cover + deadwood layers)
  opacity: number;
  setOpacity: (value: number) => void;
  // Feedback actions
  onReportClick: () => void;
  onEditForestCover?: () => void;
  onEditDeadwood?: () => void;
  isLoggedIn: boolean;
}

// Quality indicator component
const QualityIcon = ({ quality }: { quality: QualityRating }) => {
  if (!quality) return null;

  const config = {
    great: { icon: <CheckCircleOutlined />, color: "text-green-500", tooltip: "Quality: Great" },
    sentinel_ok: { icon: <ExclamationCircleOutlined />, color: "text-yellow-500", tooltip: "Quality: OK for Sentinel" },
    bad: { icon: <WarningOutlined />, color: "text-red-500", tooltip: "Quality: Poor – layer hidden due to audit" },
  };

  const { icon, color, tooltip } = config[quality] || {};
  if (!icon) return null;

  return (
    <Tooltip title={tooltip} placement="left">
      <span className={`ml-1 ${color}`}>{icon}</span>
    </Tooltip>
  );
};

// Basemap options matching DeadtreesMap
const basemapOptions = [
  { value: "streets-v12", label: "Streets" },
  { value: "satellite-streets-v12", label: "Imagery" },
];

const DatasetLayerControlPanel = ({
  mapStyle,
  onMapStyleChange,
  showForestCover,
  setShowForestCover,
  showDeadwood,
  setShowDeadwood,
  showDroneImagery,
  setShowDroneImagery,
  showAOI,
  setShowAOI,
  hasForestCover,
  hasDeadwood,
  hasAOI,
  forestCoverQuality,
  deadwoodQuality,
  opacity,
  setOpacity,
  onReportClick,
  onEditForestCover,
  onEditDeadwood,
  isLoggedIn,
}: DatasetLayerControlPanelProps) => {
  const [showAttributions, setShowAttributions] = useState(false);
  const hasModelInfo = hasDeadwood || hasForestCover;

  return (
    <div
      className="flex w-52 flex-col rounded-lg bg-white/95 p-3 shadow-lg backdrop-blur-sm pointer-events-auto"
      onMouseDown={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
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

      {/* Data Layers */}
      <div className="mb-2 text-xs font-medium text-gray-500">Data Layers</div>
      <div className="flex flex-col gap-1">
        {hasForestCover && (
          <div className="flex items-center justify-between">
            <Checkbox
              checked={showForestCover}
              onChange={(e) => setShowForestCover(e.target.checked)}
              disabled={forestCoverQuality === "bad"}
            >
              <span className={`flex items-center gap-2 ${forestCoverQuality === "bad" ? "opacity-50" : ""}`}>
                <span className="h-3 w-3 rounded-sm bg-green-500" />
                <span className="text-xs text-gray-600">Forest Cover</span>
              </span>
            </Checkbox>
            <QualityIcon quality={forestCoverQuality} />
          </div>
        )}
        {hasDeadwood && (
          <div className="flex items-center justify-between">
            <Checkbox
              checked={showDeadwood}
              onChange={(e) => setShowDeadwood(e.target.checked)}
              disabled={deadwoodQuality === "bad"}
            >
              <span className={`flex items-center gap-2 ${deadwoodQuality === "bad" ? "opacity-50" : ""}`}>
                <span className="h-3 w-3 rounded-sm bg-[#FFB31C]" />
                <span className="text-xs text-gray-600">Deadwood</span>
              </span>
            </Checkbox>
            <QualityIcon quality={deadwoodQuality} />
          </div>
        )}
        <Checkbox
          checked={showDroneImagery}
          onChange={(e) => setShowDroneImagery(e.target.checked)}
        >
          <span className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-sm bg-gray-400" />
            <span className="text-xs text-gray-600">Drone Imagery</span>
          </span>
        </Checkbox>
        {hasAOI && setShowAOI && (
          <Checkbox
            checked={showAOI}
            onChange={(e) => setShowAOI(e.target.checked)}
          >
            <span className="flex items-center gap-2">
              <span style={{ width: 12, height: 12, borderRadius: 2, border: '2px solid #3b82f6', display: 'inline-block' }} />
              <span className="text-xs text-gray-600">Area of Interest</span>
            </span>
          </Checkbox>
        )}
      </div>

      <Divider className="my-3" />

      {/* Opacity - only affects forest cover and deadwood layers */}
      <div className="mb-1 text-xs font-medium text-gray-500">Layer Opacity</div>
      <Slider
        min={0}
        max={1}
        step={0.01}
        value={opacity}
        onChange={setOpacity}
        tooltip={{ formatter: (v) => `${Math.round((v || 0) * 100)}%` }}
        disabled={!showForestCover && !showDeadwood}
      />

      {hasModelInfo && (
        <>
          <Divider className="my-3" />
          <div className="mb-1 text-xs font-medium text-gray-500">Model Info</div>
          <div className="flex items-center gap-2">
            <Tooltip title="View model attributions and papers">
              <Button
                type="link"
                size="small"
                icon={<InfoCircleOutlined />}
                onClick={() => setShowAttributions((prev) => !prev)}
                className="m-0 p-0 text-xs"
              >
                {showAttributions ? "Hide Citations" : "View Citations"}
              </Button>
            </Tooltip>
          </div>
          {showAttributions && (
            <div className="mt-2 space-y-2 rounded bg-gray-50 p-2 text-xs">
              {hasDeadwood && (
                <div>
                  <div className="font-semibold text-gray-800">Deadwood Detection:</div>
                  <a
                    href="https://www.techrxiv.org/users/897974/articles/1273930-global-multi-scale-standing-deadwood-segmentation-in-centimeter-scale-aerial-images"
                    className="text-blue-600 underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Mohring et al., 2025 (ISPRS Open)
                  </a>
                </div>
              )}
              {hasForestCover && (
                <div>
                  <div className="font-semibold text-gray-800">Forest Cover:</div>
                  <a
                    href="https://proceedings.neurips.cc/paper_files/paper/2024/file/58efdd77196fa8159062afa0408245da-Paper-Datasets_and_Benchmarks_Track.pdf"
                    className="text-blue-600 underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Veitch-Michaelis et al. (2024)
                  </a>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Feedback Section */}
      <div className="-mx-3 -mb-3 mt-3 rounded-b-lg bg-blue-50 px-3 pb-3 pt-2">
        <div className="mb-1 text-xs font-medium text-blue-700">Feedback</div>
        <p className="mb-2 text-xs text-blue-600">
          Help improve predictions by editing or reporting issues
        </p>
        <div className="flex flex-col gap-2">
          {/* Report button - always visible for logged-in users */}
          {isLoggedIn && (
            <Button
              size="small"
              icon={<FlagOutlined />}
              onClick={onReportClick}
              block
            >
              Report Issue
            </Button>
          )}

          {/* Contextual edit buttons - only show when corresponding layer is checked */}
          {isLoggedIn && showForestCover && hasForestCover && onEditForestCover && (
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={onEditForestCover}
              block
            >
              Edit Forest Cover
            </Button>
          )}

          {isLoggedIn && showDeadwood && hasDeadwood && onEditDeadwood && (
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={onEditDeadwood}
              block
            >
              Edit Deadwood
            </Button>
          )}

          {/* Prompt for non-logged-in users */}
          {!isLoggedIn && (
            <div className="text-center text-xs text-blue-600">
              <a href="/sign-in" className="text-blue-600 hover:underline">
                Sign in
              </a>
              {" "}to edit predictions
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DatasetLayerControlPanel;
