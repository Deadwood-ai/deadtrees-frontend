import { Slider, Button, Tooltip } from "antd";
import { InfoCircleOutlined } from "@ant-design/icons";
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
  return (
    <div>
      <div className="flex w-80 flex-col justify-center rounded-md bg-white px-3 py-1">
        <p className="m-0 py-2 text-lg text-gray-800">Deadwood Detection</p>

        {/* Deadwood Layer Controls - Only show if data exists */}
        {showLegend && (
          <div className="mb-2 flex w-full items-end border-b pb-1">
            <p className="m-0 w-full text-xs text-gray-600">Deadwood Segmentation</p>
            <div className="w-2/3">
              <p className="m-0 w-full text-xs text-gray-600">opacity</p>
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
          <div className="mb-2 flex w-full items-end border-b pb-1">
            <p className="m-0 w-full text-xs text-gray-600">Forest Cover Segmentation</p>
            <div className="w-2/3">
              <p className="m-0 w-full text-xs text-gray-600">opacity</p>
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
        <div className="mb-1 flex w-full items-end">
          <p className="m-0 w-full text-xs text-gray-600">Drone Imagery</p>
          <div className="w-2/3">
            <p className="m-0 w-full text-xs text-gray-600">opacity</p>
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
          <div className="pt-2">
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
              <div className="mb-4 space-y-2 rounded bg-gray-50 p-2 text-xs">
                {showLegend && (
                  <div>
                    <strong>Deadwood Detection:</strong>
                    <a
                      href="https://www.techrxiv.org/users/897974/articles/1273930-global-multi-scale-standing-deadwood-segmentation-in-centimeter-scale-aerial-images"
                      className="ml-1 text-blue-600 underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Möhring et al. (under review)
                    </a>
                  </div>
                )}
                {showForestCoverLegend && (
                  <div>
                    <strong>Forest Cover:</strong>
                    <a
                      href="https://proceedings.neurips.cc/paper_files/paper/2024/file/58efdd77196fa8159062afa0408245da-Paper-Datasets_and_Benchmarks_Track.pdf"
                      className="ml-1 text-blue-600 underline"
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
      </div>
    </div>
  );
}

export default DeadwoodCardDetails;
