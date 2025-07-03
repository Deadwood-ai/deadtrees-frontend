import React, { useMemo, useState } from "react";
import { Tooltip } from "antd";
import { PhenologyMetadata } from "../../types/phenology";
import { generatePhenologyGradient, getAcquisitionPeriod, formatPhenologyTooltip } from "../../utils/phenologyUtils";

interface PhenologyBarProps {
  phenologyData?: PhenologyMetadata;
  acquisitionYear: string | number;
  acquisitionMonth?: string | number;
  acquisitionDay?: string | number;
  className?: string;
  showTooltips?: boolean;
}

export default function PhenologyBar({
  phenologyData,
  acquisitionYear,
  acquisitionMonth,
  acquisitionDay,
  className = "",
  showTooltips = true,
}: PhenologyBarProps) {
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);

  // Generate gradient from phenology data
  const gradient = useMemo(() => {
    if (!phenologyData?.phenology_curve) {
      return "linear-gradient(to right, #D2B48C, #D2B48C)";
    }
    return generatePhenologyGradient(phenologyData.phenology_curve);
  }, [phenologyData]);

  // Calculate acquisition period
  const acquisitionPeriod = useMemo(() => {
    return getAcquisitionPeriod(acquisitionYear, acquisitionMonth, acquisitionDay);
  }, [acquisitionYear, acquisitionMonth, acquisitionDay]);

  // Handle mouse events for tooltips
  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!showTooltips || !phenologyData?.phenology_curve) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const relativeX = event.clientX - rect.left;
    const percentage = relativeX / rect.width;
    const dayOfYear = Math.round(percentage * 365) + 1;

    setHoveredDay(Math.min(dayOfYear, 366));
  };

  const handleMouseLeave = () => {
    setHoveredDay(null);
  };

  // Get tooltip content
  const tooltipContent = useMemo(() => {
    if (!hoveredDay || !phenologyData?.phenology_curve) return "";

    const phenologyValue = phenologyData.phenology_curve[hoveredDay - 1] || 0;
    return formatPhenologyTooltip(hoveredDay, phenologyValue);
  }, [hoveredDay, phenologyData]);

  // Calculate acquisition marker position and style
  const acquisitionMarkerStyle = useMemo(() => {
    const { type, startDay, endDay, centerDay } = acquisitionPeriod;

    if (type === "full") {
      // Single day - show arrow marker
      const position = ((centerDay - 1) / 365) * 100;
      return {
        type: "arrow",
        left: `${Math.max(0, Math.min(100, position))}%`,
      };
    } else if (type === "month") {
      // Month range - show highlighted section
      const startPos = ((startDay - 1) / 365) * 100;
      const endPos = ((endDay - 1) / 365) * 100;
      return {
        type: "range",
        left: `${Math.max(0, startPos)}%`,
        width: `${Math.min(100 - Math.max(0, startPos), endPos - startPos)}%`,
      };
    } else {
      // Year only - show entire bar highlighted
      return {
        type: "year",
        left: "0%",
        width: "100%",
      };
    }
  }, [acquisitionPeriod]);

  if (!phenologyData?.phenology_curve) {
    return <div className={`text-xs text-gray-500 ${className}`}>Phenology data not available</div>;
  }

  return (
    <div className={`relative ${className}`}>
      <Tooltip
        title={tooltipContent}
        open={showTooltips && hoveredDay !== null}
        placement="top"
        overlayStyle={{ pointerEvents: "none" }}
      >
        <div
          className="relative h-4 w-full cursor-pointer overflow-hidden rounded-md shadow-sm"
          style={{
            background: gradient,
          }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          role="img"
          aria-label={`Phenology timeline for ${acquisitionYear}${acquisitionMonth ? ` ${acquisitionMonth}` : ""}${acquisitionDay ? ` ${acquisitionDay}` : ""}`}
        >
          {/* Acquisition marker overlay */}
          {acquisitionMarkerStyle.type === "arrow" && (
            <div className="absolute top-0 z-10 h-full w-0.5 bg-red-500" style={{ left: acquisitionMarkerStyle.left }}>
              {/* Arrow pointing down */}
              <div className="absolute -top-1 left-1/2 h-0 w-0 -translate-x-1/2 border-l-2 border-r-2 border-t-2 border-transparent border-t-red-500" />
            </div>
          )}

          {acquisitionMarkerStyle.type === "range" && (
            <div
              className="absolute top-0 z-10 h-full bg-red-500 opacity-30"
              style={{
                left: acquisitionMarkerStyle.left,
                width: acquisitionMarkerStyle.width,
              }}
            />
          )}

          {acquisitionMarkerStyle.type === "year" && (
            <div
              className="absolute top-0 z-10 h-full bg-red-500 opacity-20"
              style={{
                left: acquisitionMarkerStyle.left,
                width: acquisitionMarkerStyle.width,
              }}
            />
          )}
        </div>
      </Tooltip>

      {/* Optional: Add source attribution */}
      {phenologyData.source && <div className="mt-1 text-xs text-gray-400">Source: {phenologyData.source}</div>}
    </div>
  );
}
