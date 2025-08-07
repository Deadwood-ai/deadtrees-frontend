import { Slider, Button, Tooltip } from "antd";
import { InfoCircleOutlined, UpOutlined, DownOutlined } from "@ant-design/icons";
import { useState } from "react";

interface DeadwoodCardDetailsProps {
  deadwoodOpacity: number;
  setDeadwoodOpacity: React.Dispatch<React.SetStateAction<number>>;
  droneImageOpacity: number;
  setDroneImageOpacity: React.Dispatch<React.SetStateAction<number>>;
  forestCoverOpacity?: number;
  setForestCoverOpacity?: React.Dispatch<React.SetStateAction<number>>;
  showLegend: boolean;
  showForestCoverLegend?: boolean;
}

export function DeadwoodCardDetails({
  deadwoodOpacity,
  setDeadwoodOpacity,
  droneImageOpacity,
  setDroneImageOpacity,
  forestCoverOpacity,
  setForestCoverOpacity,
  showLegend,
  showForestCoverLegend = false,
}: DeadwoodCardDetailsProps) {
  const [showAttributions, setShowAttributions] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  return (
    <div>
      <div className="flex w-72 flex-col justify-center rounded-md bg-white px-4 py-1">
        <div className={`${isCollapsed ? "mb-0" : "mb-2"} flex items-center justify-between py-2`}>
          <p className="m-0 text-base text-gray-800">Analysis Layers</p>
          <Button
            type="text"
            size="small"
            icon={isCollapsed ? <UpOutlined className="text-gray-600" /> : <DownOutlined className="text-gray-600" />}
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="flex items-center justify-center p-1"
          />
        </div>

        {!isCollapsed && (
          <>
            {/* Deadwood Layer Controls - Only show if data exists */}
            {showLegend && (
              <div className="mb-2 flex w-full items-center">
                <p className="m-0 w-2/3 text-xs text-gray-600">Deadwood Segmentation</p>
                <div className="w-1/3 pl-3">
                  <Slider
                    className="m-0 w-full"
                    defaultValue={1}
                    step={0.01}
                    max={1}
                    value={deadwoodOpacity}
                    onChange={(value) => setDeadwoodOpacity(value as number)}
                    min={0}
                  />
                </div>
              </div>
            )}

            {/* Forest Cover Layer Controls - Only show if data exists */}
            {showForestCoverLegend && forestCoverOpacity !== undefined && setForestCoverOpacity && (
              <div className="mb-2 flex w-full items-center">
                <p className="m-0 w-2/3 text-xs text-gray-600">Forest Cover Segmentation</p>
                <div className="w-1/3 pl-3">
                  <Slider
                    className="m-0 w-full"
                    defaultValue={1}
                    step={0.01}
                    max={1}
                    value={forestCoverOpacity}
                    onChange={(value) => setForestCoverOpacity(value as number)}
                    min={0}
                  />
                </div>
              </div>
            )}

            {/* Drone Imagery Controls */}
            <div className="mb-2 flex w-full items-center">
              <p className="m-0 w-2/3 text-xs text-gray-600">Drone Imagery</p>
              <div className="w-1/3 pl-3">
                <Slider
                  className="m-0 w-full"
                  defaultValue={1}
                  step={0.01}
                  max={1}
                  value={droneImageOpacity}
                  onChange={(value) => setDroneImageOpacity(value as number)}
                  min={0}
                />
              </div>
            </div>

            {/* Unified Model Attribution Section */}
            {(showLegend || showForestCoverLegend) && (
              <div className="pt-1">
                <div className="mb-2 flex items-center space-x-2">
                  <p className="m-0 text-xs text-gray-800">Models by:</p>
                  <Tooltip title="View model attributions and papers">
                    <Button
                      type="link"
                      size="small"
                      icon={<InfoCircleOutlined />}
                      onClick={() => setShowAttributions(!showAttributions)}
                      className="m-0 p-0 text-xs"
                    >
                      View Citations
                    </Button>
                  </Tooltip>
                </div>

                {showAttributions && (
                  <div className="mb-4 space-y-3 rounded bg-gray-50 p-2 text-xs">
                    {showLegend && (
                      <div>
                        <div className="font-semibold text-gray-800">Deadwood Detection:</div>
                        <a
                          href="https://www.techrxiv.org/users/897974/articles/1273930-global-multi-scale-standing-deadwood-segmentation-in-centimeter-scale-aerial-images"
                          className="text-blue-600 underline"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Möhring et al. (under review)
                        </a>
                      </div>
                    )}
                    {showForestCoverLegend && (
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
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default DeadwoodCardDetails;
