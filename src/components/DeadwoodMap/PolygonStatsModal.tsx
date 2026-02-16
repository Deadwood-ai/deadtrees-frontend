import { Modal, Spin, Alert } from "antd";
import { AreaChartOutlined, ArrowUpOutlined, ArrowDownOutlined, MinusOutlined } from "@ant-design/icons";
import { Line } from "@ant-design/charts";
import type { PolygonStatsResponse } from "../../hooks/usePolygonStats";
import { palette } from "../../theme/palette";

interface PolygonStatsModalProps {
  open: boolean;
  onClose: () => void;
  data: PolygonStatsResponse | null;
  loading: boolean;
  error: string | null;
}

function computeChange(first: number | null, last: number | null): { pct: number; direction: "up" | "down" | "flat" } | null {
  if (first === null || last === null || first === 0) return null;
  const pct = ((last - first) / first) * 100;
  const direction = pct > 0.5 ? "up" : pct < -0.5 ? "down" : "flat";
  return { pct, direction };
}

const ChangeIndicator = ({ change }: { change: { pct: number; direction: "up" | "down" | "flat" } }) => {
  const icon = change.direction === "up" ? <ArrowUpOutlined /> : change.direction === "down" ? <ArrowDownOutlined /> : <MinusOutlined />;
  const color = change.direction === "up" ? palette.forest[600] : change.direction === "down" ? palette.state.error : palette.neutral[500];
  return (
    <span style={{ color, fontSize: 13, fontWeight: 500 }}>
      {icon} {change.pct > 0 ? "+" : ""}{change.pct.toFixed(1)}%
      <span style={{ color: palette.neutral[500], fontWeight: 400 }}> since 2017</span>
    </span>
  );
};

const PolygonStatsModal = ({ open, onClose, data, loading, error }: PolygonStatsModalProps) => {
  const threshold = data?.cover_threshold_pct ?? 20;

  // Transform data for area chart (hectares over time)
  const chartData = data?.stats
    .filter((s) => s.tree_cover_area_ha !== null || s.deadwood_area_ha !== null)
    .flatMap((s) => {
      const items: { year: string; value: number; category: string }[] = [];
      if (s.tree_cover_area_ha !== null) {
        items.push({ year: String(s.year), value: s.tree_cover_area_ha, category: "Tree Cover" });
      }
      if (s.deadwood_area_ha !== null) {
        items.push({ year: String(s.year), value: s.deadwood_area_ha, category: "Standing Deadwood" });
      }
      return items;
    }) ?? [];

  // Compute summary values
  const firstStats = data?.stats[0] ?? null;
  const latestStats = data?.stats[data.stats.length - 1] ?? null;
  const treeCoverChange = computeChange(firstStats?.tree_cover_area_ha ?? null, latestStats?.tree_cover_area_ha ?? null);
  const deadwoodChange = computeChange(firstStats?.deadwood_area_ha ?? null, latestStats?.deadwood_area_ha ?? null);

  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          <AreaChartOutlined style={{ color: palette.primary[500] }} />
          <span>Area Statistics</span>
        </div>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={720}
      destroyOnClose
    >
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Spin size="large" tip="Computing statistics from COG data..." />
        </div>
      )}

      {error && (
        <Alert
          type="error"
          message="Error"
          description={error}
          showIcon
          className="mb-4"
        />
      )}

      {data && !loading && (
        <div className="flex flex-col gap-4">
          {/* Summary stats */}
          <div
            className="grid grid-cols-3 gap-4 rounded-lg p-4"
            style={{ background: palette.neutral[50], border: `1px solid ${palette.neutral[100]}` }}
          >
            {/* Area */}
            <div>
              <div className="text-xs" style={{ color: palette.neutral[500] }}>Selected Area</div>
              <div className="text-lg font-semibold" style={{ color: palette.neutral[800] }}>
                {data.polygon_area_km2.toFixed(2)} km²
              </div>
              <span style={{ color: palette.neutral[400], fontSize: 12 }}>
                threshold: &gt;{threshold}% cover
              </span>
            </div>
            {/* Tree Cover */}
            <div>
              <div className="text-xs" style={{ color: palette.forest[600] }}>Tree Cover</div>
              <div className="text-lg font-semibold" style={{ color: palette.forest[600] }}>
                {latestStats?.tree_cover_area_ha !== null ? `${latestStats!.tree_cover_area_ha.toFixed(1)} ha` : "–"}
              </div>
              {treeCoverChange && <ChangeIndicator change={treeCoverChange} />}
            </div>
            {/* Standing Deadwood */}
            <div>
              <div className="text-xs" style={{ color: palette.deadwood[500] }}>Standing Deadwood</div>
              <div className="text-lg font-semibold" style={{ color: palette.deadwood[500] }}>
                {latestStats?.deadwood_area_ha !== null ? `${latestStats!.deadwood_area_ha.toFixed(1)} ha` : "–"}
              </div>
              {deadwoodChange && <ChangeIndicator change={deadwoodChange} />}
            </div>
          </div>

          {/* No data message */}
          {chartData.length === 0 && (
            <Alert
              type="info"
              message="No coverage data available"
              description="The drawn polygon does not overlap with any coverage data. Try drawing in an area where the tree cover / deadwood layers are visible on the map."
              showIcon
            />
          )}

          {/* Coverage area over time chart */}
          {chartData.length > 0 && (
            <Line
              data={chartData}
              xField="year"
              yField="value"
              colorField="category"
              height={300}
              autoFit
              shapeField="smooth"
              style={{ lineWidth: 2.5 }}
              point={{ shapeField: "circle", sizeField: 4 }}
              scale={{ color: { range: [palette.forest[600], palette.deadwood[500]] } }}
              axis={{
                y: { title: "Area (ha)", titleFontSize: 12 },
                x: { title: false },
              }}
              legend={{ color: { position: "top" } }}
              area={{
                style: { fillOpacity: 0.15 },
              }}
            />
          )}
        </div>
      )}
    </Modal>
  );
};

export default PolygonStatsModal;
