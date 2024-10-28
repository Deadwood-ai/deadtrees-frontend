import { DatePicker, Select, Space } from "antd";

const PickerWithType = ({ value, onChange, pickerTypeOptions, pickerType, setPickerType }) => {

    const pickerTypeToAntdPicker = {
        "Year/Month/Day": 'date',
        "Year/Month": 'month',
        Year: 'year'
    }

    return (
        <Space>
            <Select style={{ width: '160px' }} value={pickerType} onChange={(value) => setPickerType(value)}>
                {pickerTypeOptions.map((option) => (
                    <Select.Option key={option} value={option}>
                        {option}
                    </Select.Option>
                ))}
            </Select>
            <DatePicker
                picker={pickerTypeToAntdPicker[pickerType]}
                onChange={(date) => {
                    onChange(date);
                }}
                value={value}
            />
        </Space>
    );
};

export default PickerWithType;