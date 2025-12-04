import { Slider } from "antd";
import YearSelectionButtons from "./YearSelectionButtons";

interface DeadwoodCardProps {
  year: string;
  sliderValue: number;
  setSliderValue: React.Dispatch<React.SetStateAction<number>>;
  setSelectedYear: React.Dispatch<React.SetStateAction<string>>;
}

// Horizontal gradient legend item
const LegendItem = ({ label, gradientClass }: { label: string; gradientClass: string }) => (
  <div className="flex items-center">
    <span className="w-28 shrink-0 text-[11px] text-gray-500">{label}</span>
    <div className="flex flex-1 items-center gap-1">
      <span className="text-[9px] text-gray-400">0%</span>
      <div className={`h-2.5 flex-1 rounded ${gradientClass}`} />
      <span className="text-[9px] text-gray-400">100%</span>
    </div>
  </div>
);

const DeadwoodCard = ({ year, sliderValue, setSliderValue, setSelectedYear }: DeadwoodCardProps) => {
  return (
    <div className="flex w-[300px] flex-col rounded-lg bg-white px-4 py-4 shadow-lg">
      {/* Header */}
      <div className="mb-4">
        <h3 className="m-0 text-base font-semibold text-gray-700">Tree & Standing Deadwood Cover</h3>
        <span className="text-[10px] text-gray-400">Fractional cover maps • Sentinel-2</span>
      </div>

      {/* Legend Section */}
      <div className="mb-1 flex flex-col gap-2">
        <LegendItem
          label="Tree Cover"
          gradientClass="bg-gradient-to-r from-green-100/50 via-green-400/60 to-green-600/80"
        />
        <LegendItem
          label="Deadwood Cover"
          gradientClass="bg-gradient-to-r from-red-100/50 via-red-400/60 to-red-500/80"
        />
      </div>

      {/* Divider */}
      <div className="mb-3 border-t border-gray-100" />

      {/* Controls Section */}
      <div className="flex flex-col gap-3">
        {/* Opacity Slider */}
        <div className="flex items-center">
          <span className="w-28 shrink-0 text-[11px] text-gray-500">Opacity</span>
          <div className="flex flex-1 items-center gap-1">
            <span className="text-[9px] text-gray-400">0%</span>
            <Slider
              className="m-0 flex-1"
              defaultValue={1}
              step={0.01}
              max={1}
              value={Number(sliderValue.toFixed(2))}
              onChange={(value) => setSliderValue(value as number)}
              min={0}
              tooltip={{ formatter: (v) => `${Math.round((v || 0) * 100)}%` }}
            />
            <span className="text-[9px] text-gray-400">100%</span>
          </div>
        </div>

        {/* Year Stepper */}
        <YearSelectionButtons year={year} setSelectedYear={setSelectedYear} />
      </div>
    </div>
  );
};

export default DeadwoodCard;
