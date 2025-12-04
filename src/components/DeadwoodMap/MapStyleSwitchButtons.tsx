import { ConfigProvider, Radio } from "antd";

const grayRadioTheme = {
  components: {
    Radio: {
      buttonSolidCheckedBg: "#6b7280",
      buttonSolidCheckedHoverBg: "#4b5563",
      buttonCheckedBg: "#f3f4f6",
      colorPrimary: "#6b7280",
      colorPrimaryHover: "#4b5563",
    },
  },
};

const MapStyleSwitchButtons = ({ mapStyle, onChange }: { mapStyle: string; onChange: (next: string) => void }) => {
  return (
    <ConfigProvider theme={grayRadioTheme}>
      <Radio.Group value={mapStyle} onChange={(e) => onChange(e.target.value)}>
        <Radio.Button value="satellite-streets-v12">Satellite</Radio.Button>
        <Radio.Button value="streets-v12">Streets</Radio.Button>
      </Radio.Group>
    </ConfigProvider>
  );
};

export default MapStyleSwitchButtons;
