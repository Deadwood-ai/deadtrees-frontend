import { Radio, Space, Card } from "antd";

export type LayerSelection = "deadwood" | "forest_cover" | "ortho_only";

interface Props {
  value: LayerSelection;
  onChange: (value: LayerSelection) => void;
  position?: "bottom-left" | "bottom-right";
}

export default function LayerRadioButtons({ value, onChange, position = "bottom-left" }: Props) {
  return (
    <div className={`absolute ${position === "bottom-left" ? "left-2" : "right-2"} bottom-2 z-10`}>
      <Card size="small" className="shadow-lg" bodyStyle={{ padding: "12px" }}>
        <Radio.Group value={value} onChange={(e) => onChange(e.target.value)}>
          <Space direction="vertical" size="small" className="w-full">
            <Radio value="deadwood">
              <span className="flex items-center justify-between">
                Deadwood
                <span className="ml-2 text-xs text-gray-400">(J)</span>
              </span>
            </Radio>
            <Radio value="forest_cover">
              <span className="flex items-center justify-between">
                Forest Cover
                <span className="ml-2 text-xs text-gray-400">(K)</span>
              </span>
            </Radio>
            <Radio value="ortho_only">
              <span className="flex items-center justify-between">
                Ortho Only
                <span className="ml-2 text-xs text-gray-400">(L)</span>
              </span>
            </Radio>
          </Space>
        </Radio.Group>

        {/* AOI always visible indicator */}
        <div className="mt-2 border-t pt-2 text-xs text-gray-500">AOI: Always Visible</div>
      </Card>
    </div>
  );
}
