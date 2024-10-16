import { DatePicker, Select, Space } from "antd";

const PickerWithType = ({ value, onChange, pickerTypeOptions, pickerType, setPickerType }) => {
    return (
        <Space>
            <Select value={pickerType} onChange={(value) => setPickerType(value)}>
                {pickerTypeOptions.map((option) => (
                    <Select.Option key={option} value={option}>
                        {option}
                    </Select.Option>
                ))}
            </Select>
            <DatePicker
                picker={pickerType}
                onChange={(date) => {
                    onChange(date);
                }}
                value={value}
            />
        </Space>
    );
};

export default PickerWithType;