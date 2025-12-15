import { EnvironmentOutlined } from "@ant-design/icons";

interface ClickedValues {
  forestPct: number;
  deadwoodPct: number;
}

interface MapLegendProps {
  clickedValues: ClickedValues | null;
}

// Gradient bar with optional value indicator
const GradientBar = ({
  gradientClass,
  value,
  indicatorColor,
}: {
  gradientClass: string;
  value: number | null;
  indicatorColor: string;
}) => (
  <div className="relative h-3 w-full overflow-visible rounded">
    <div className={`h-full w-full rounded ${gradientClass}`} />
    {value !== null && (
      <div
        className="absolute top-[-2px] h-[calc(100%+4px)] w-0.5"
        style={{
          left: `${value}%`,
          backgroundColor: indicatorColor,
          boxShadow: "0 0 2px rgba(0,0,0,0.3)",
        }}
      />
    )}
  </div>
);

const MapLegend = ({ clickedValues }: MapLegendProps) => {
  return (
    <div className="flex w-52 flex-col rounded-lg bg-white/95 p-3 backdrop-blur-sm">
      {/* Header */}
      <div className="mb-3 text-sm font-medium text-gray-700">Fractional Cover</div>

      {/* Tree */}
      <div className="mb-3">
        <div className="mb-1 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-sm bg-green-500" />
            <span className="text-xs text-gray-600">Tree</span>
          </div>
          <span className="text-xs text-gray-400">0–100%</span>
        </div>
        <GradientBar
          gradientClass="bg-gradient-to-r from-green-100 via-green-400 to-green-700"
          value={clickedValues?.forestPct ?? null}
          indicatorColor="#000"
        />
      </div>

      {/* Standing Deadwood */}
      <div className="mb-1">
        <div className="mb-1 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-sm bg-purple-600" />
            <span className="text-xs text-gray-600">Standing Deadwood</span>
          </div>
          <span className="text-xs text-gray-400">0–100%</span>
        </div>
        <GradientBar
          gradientClass="bg-gradient-to-r from-purple-200 via-purple-500 to-purple-900"
          value={clickedValues?.deadwoodPct ?? null}
          indicatorColor="#000"
        />
      </div>

      {/* Clicked Location Values */}
      <div className="mt-3 border-t border-gray-100 pt-3">
        <div className="mb-2 flex items-center gap-1 text-xs font-medium text-gray-500">
          <EnvironmentOutlined />
          <span>Clicked Location</span>
        </div>

        {clickedValues ? (
          <div className="flex justify-between text-xs">
            <div className="flex items-center gap-1">
              <span className="text-gray-500">Tree:</span>
              <span className="font-semibold text-green-600">{clickedValues.forestPct}%</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-gray-500">Deadwood:</span>
              <span className="font-semibold text-purple-600">{clickedValues.deadwoodPct}%</span>
            </div>
          </div>
        ) : (
          <div className="text-center text-xs text-gray-400">Click on map to see values</div>
        )}
      </div>
    </div>
  );
};

export default MapLegend;
