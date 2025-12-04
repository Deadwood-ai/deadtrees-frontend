import { Radio } from "antd";

const MapStyleSwitchButtons = ({ mapStyle, onChange }: { mapStyle: string; onChange: (next: string) => void }) => {
  return (
    <Radio.Group value={mapStyle} onChange={(e) => onChange(e.target.value)}>
      <Radio.Button value="satellite-streets-v12">Satellite</Radio.Button>
      <Radio.Button value="streets-v12">Streets</Radio.Button>
    </Radio.Group>
  );
};

export default MapStyleSwitchButtons;
