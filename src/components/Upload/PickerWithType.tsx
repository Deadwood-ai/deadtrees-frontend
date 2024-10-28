import { DatePicker, Select, Space } from "antd";
import { Dayjs } from "dayjs";

interface PickerWithTypeProps {
    value?: Dayjs | null;
    onChange: (date: Dayjs | null) => void;
    pickerTypeOptions: string[];
    pickerType: string;
    setPickerType: (type: string) => void;
}

const pickerTypeToAntdPicker: Record<string, 'date' | 'month' | 'year'> = {
    "Year/Month/Day": 'date',
    "Year/Month": 'month',
    "Year": 'year'
} as const;

const PickerWithType = ({
    value,
    onChange,
    pickerTypeOptions,
    pickerType,
    setPickerType
}: PickerWithTypeProps) => {
    return (
        <Space>
            <Select
                style={{ width: '160px' }}
                value={pickerType}
                onChange={setPickerType}
            >
                {pickerTypeOptions.map((option) => (
                    <Select.Option key={option} value={option}>
                        {option}
                    </Select.Option>
                ))}
            </Select>
            <DatePicker
                picker={pickerTypeToAntdPicker[pickerType]}
                onChange={onChange}
                value={value}
            />
        </Space>
    );
};

export default PickerWithType;
