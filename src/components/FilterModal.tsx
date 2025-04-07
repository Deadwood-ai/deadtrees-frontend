import { useState, useEffect } from "react";
import { Modal, Form, Checkbox, Select, Radio, Slider, Button, Divider, Typography, Space } from "antd";
import { IBiome } from "../types/dataset";
import { useData } from "../hooks/useDataProvider";

const { Title } = Typography;

interface FilterModalProps {
  isVisible: boolean;
  onClose: () => void;
  onApplyFilters: (filters: AdvancedFilters) => void;
  currentFilters: AdvancedFilters;
}

export interface AdvancedFilters {
  hasDeadwoodPrediction: boolean;
  biome: string | null;
  authors: string[];
  platform: string | null;
  dateRange: [number, number] | null;
}

const FilterModal: React.FC<FilterModalProps> = ({ isVisible, onClose, onApplyFilters, currentFilters }) => {
  const { authors } = useData();
  const [form] = Form.useForm();

  const [localFilters, setLocalFilters] = useState<AdvancedFilters>(currentFilters);

  // Reset form when modal is opened
  useEffect(() => {
    if (isVisible) {
      form.setFieldsValue({
        hasDeadwoodPrediction: currentFilters.hasDeadwoodPrediction,
        biome: currentFilters.biome,
        authors: currentFilters.authors,
        platform: currentFilters.platform,
        dateRange: currentFilters.dateRange,
      });
      setLocalFilters(currentFilters);
    }
  }, [isVisible, form, currentFilters]);

  const handleFormChange = (changedValues: any, allValues: any) => {
    setLocalFilters({
      ...localFilters,
      ...changedValues,
    });
  };

  const handleApply = () => {
    form.validateFields().then((values) => {
      onApplyFilters(values as AdvancedFilters);
      onClose();
    });
  };

  const clearFilters = () => {
    const resetFilters: AdvancedFilters = {
      hasDeadwoodPrediction: false,
      biome: null,
      authors: [],
      platform: null,
      dateRange: null,
    };
    setLocalFilters(resetFilters);
    form.setFieldsValue(resetFilters);
  };

  // Get all Biome options from the enum
  const biomeOptions = Object.entries(IBiome).map(([key, value]) => ({
    label: value,
    value: value,
  }));
  biomeOptions.unshift({ label: "All", value: "" });

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 2010 + 1 }, (_, i) => 2010 + i);

  return (
    <Modal
      open={isVisible}
      onCancel={onClose}
      footer={null}
      title="Advanced Filters"
      width={600}
      centered
      maskClosable={true}
    >
      <Form form={form} layout="vertical" onValuesChange={handleFormChange} initialValues={currentFilters}>
        <Form.Item name="hasDeadwoodPrediction" valuePropName="checked">
          <Checkbox>Has Deadwood Prediction</Checkbox>
        </Form.Item>

        <Divider />

        <Form.Item name="biome" label="Biome">
          <Select placeholder="Select a biome" allowClear options={biomeOptions} style={{ width: "100%" }} />
        </Form.Item>

        <Form.Item name="authors" label="Authors">
          <Select
            mode="multiple"
            placeholder="Select authors"
            allowClear
            options={authors}
            style={{ width: "100%" }}
            optionFilterProp="label"
          />
        </Form.Item>

        <Form.Item name="platform" label="Platform">
          <Radio.Group>
            <Radio value="">All</Radio>
            <Radio value="drone">Drone</Radio>
            <Radio value="airborne">Airborne</Radio>
            <Radio value="satellite">Satellite</Radio>
          </Radio.Group>
        </Form.Item>

        <Form.Item name="dateRange" label="Acquisition Date Range">
          <Slider
            range
            min={2010}
            max={currentYear}
            marks={{
              2010: "2010",
              [currentYear]: currentYear.toString(),
            }}
          />
        </Form.Item>

        <Divider />

        <div className="flex justify-between">
          <Button onClick={clearFilters}>Reset</Button>
          <Space>
            <Button onClick={onClose}>Cancel</Button>
            <Button type="primary" onClick={handleApply}>
              Apply
            </Button>
          </Space>
        </div>
      </Form>
    </Modal>
  );
};

export default FilterModal;
