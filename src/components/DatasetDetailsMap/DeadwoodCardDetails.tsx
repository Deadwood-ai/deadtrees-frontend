import { Slider } from "antd";
import YearSelectionButtons from "../DeadwoodMap/YearSelectionButtons";
import { useEffect } from "react";

interface DeadwoodCardDetailsProps {
  year: string;
  deadwoodOpacity: number;
  setDeadwoodOpacity: React.Dispatch<React.SetStateAction<number>>;
  satelliteOpacity: number;
  setSatelliteOpacity: React.Dispatch<React.SetStateAction<number>>;
  setSelectedYear: React.Dispatch<React.SetStateAction<string>>;
  adminLevel1: string | null | undefined;
  showLegend: (show: boolean) => void;
  forestCoverOpacity: number;
  setForestCoverOpacity: React.Dispatch<React.SetStateAction<number>>;
}

export function DeadwoodCardDetails({
  year,
  deadwoodOpacity,
  setDeadwoodOpacity,
  satelliteOpacity,
  setSatelliteOpacity,
  setSelectedYear,
  adminLevel1,
  showLegend,
  forestCoverOpacity,
  setForestCoverOpacity,
}: DeadwoodCardDetailsProps) {
  const isGermany = adminLevel1 === "Germany";

  useEffect(() => {
    showLegend(isGermany);
  }, [isGermany, showLegend]);

  // if (!adminLevel1) return null;

  return (
    <div>
      <div className="flex w-80 flex-col justify-center rounded-md bg-white px-3 py-1">
        <p className="m-0 py-2 text-lg text-gray-800">Deadwood for {year}</p>

        {/* Satellite Layer Controls */}
        <div className="mb-1 flex w-full items-end border-b pb-1">
          <p className="m-0 w-full text-xs text-gray-600">Satellite Image</p>
          <div className="w-2/3">
            <p className="m-0 w-full text-xs text-gray-600">opacity</p>
            <Slider
              className="m-0 w-full"
              defaultValue={1}
              step={0.01}
              max={1}
              value={satelliteOpacity.toFixed(1)}
              onChange={(value) => setSatelliteOpacity(value as number)}
              min={0}
            />
          </div>
        </div>

        {/* Forest Cover Layer Controls */}
        {/* <div className="mb-2 flex w-full items-end border-b pb-2">
          <p className="m-0 w-full text-xs text-gray-600">Forest Cover</p>
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
        </div> */}

        {/* Deadwood Layer Controls */}
        <div className="mb-2 flex w-full items-end">
          <p className="m-0 w-full text-xs text-gray-600">Deadwood</p>
          <div className="w-2/3">
            <p className="m-0 w-full text-xs text-gray-600">opacity</p>
            <Slider
              className="m-0 w-full"
              defaultValue={1}
              step={0.01}
              max={1}
              value={deadwoodOpacity.toFixed(1)}
              onChange={(value) => setDeadwoodOpacity(value as number)}
              min={0}
            />
          </div>
        </div>

        {isGermany && (
          <>
            {/* <p className="m-0 w-full text-xs text-gray-600">Deadwood</p> */}
            <YearSelectionButtons year={year} setSelectedYear={setSelectedYear} />
            <div className="mb-4 flex items-center space-x-2">
              <p className="m-0 text-xs text-gray-800">Method prototype by:</p>
              <a
                className="m-0 italic underline"
                href="https://www.sciencedirect.com/science/article/pii/S2667393223000054?via%3Dihub"
              >
                Schiefer et al., 2023
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default DeadwoodCardDetails;
