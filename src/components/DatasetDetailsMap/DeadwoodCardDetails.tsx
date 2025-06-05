import { Slider } from "antd";

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
  return (
    <div>
      <div className="flex w-80 flex-col justify-center rounded-md bg-white px-3 py-1">
        <p className="m-0 py-2 text-lg text-gray-800">Deadwood Detection</p>

        {/* Drone Imagery Controls */}
        <div className="mb-1 flex w-full items-end border-b pb-1">
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

        {showLegend && (
          <div>
            {/* Deadwood Layer Controls */}
            <div className="mb-2 flex w-full items-end">
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

            {!showForestCoverLegend && (
              <div className="mb-4 flex items-center space-x-2 pt-2">
                <p className="m-0 text-xs text-gray-800">Method by:</p>
                <a
                  className="m-0 italic underline"
                  href="https://www.techrxiv.org/users/897974/articles/1273930-global-multi-scale-standing-deadwood-segmentation-in-centimeter-scale-aerial-images"
                >
                  Möhring et al. (under review)
                </a>
              </div>
            )}
          </div>
        )}

        {/* Forest Cover Layer Controls - Only show if forest cover data exists */}
        {showForestCoverLegend && forestCoverOpacity !== undefined && setForestCoverOpacity && (
          <div>
            <div className="mb-2 flex w-full items-end border-t pt-2">
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
          </div>
        )}
      </div>
    </div>
  );
}

export default DeadwoodCardDetails;
