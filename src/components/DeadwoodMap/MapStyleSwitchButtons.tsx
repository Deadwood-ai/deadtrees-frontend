import { Radio } from "antd";

const MapStyleSwitchButtons = ({
  mapStyle,
  setMapStyle,
}: {
  mapStyle: string;
  setMapStyle: React.Dispatch<React.SetStateAction<string>>;
}) => {
  return (
    // <div className="absolute left-8 top-28 z-20">
    <Radio.Group value={mapStyle} onChange={(e) => setMapStyle(e.target.value)}>
      <Radio.Button value="satellite-streets-v12">Satellite</Radio.Button>
      <Radio.Button value="streets-v12">Streets</Radio.Button>
    </Radio.Group>
    // </div>
  );
};

export default MapStyleSwitchButtons;
