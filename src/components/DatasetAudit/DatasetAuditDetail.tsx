import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Typography, Form, Switch, Input, Select, message, Space } from "antd";
import { ArrowLeftOutlined, SaveOutlined } from "@ant-design/icons";
import { IDataset } from "../../types/dataset";
import DatasetAuditMap from "./DatasetAuditMap";
import {
  useDatasetAudit,
  useSaveDatasetAudit,
  useSaveDatasetAOI,
  useDatasetAOI,
  AuditFormValues,
  AOIData,
} from "../../hooks/useDatasetAudit";
import { useAuth } from "../../hooks/useAuth";
import { useAOI } from "../../contexts/AOIContext";

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

interface DatasetAuditDetailProps {
  dataset: IDataset;
}

export default function DatasetAuditDetail({ dataset }: DatasetAuditDetailProps) {
  const navigate = useNavigate();
  const [form] = Form.useForm<AuditFormValues>();
  const { user } = useAuth();

  // Use AOI context instead of local state
  const { currentAOI, setCurrentAOI, setDatasetId, hasUnsavedChanges, setHasUnsavedChanges } = useAOI();

  // Get existing audit data if available
  const { data: auditData, isLoading: isAuditLoading } = useDatasetAudit(dataset.id);

  // Get existing AOI data if available
  const { data: savedAOI, isLoading: isAOILoading } = useDatasetAOI(dataset.id);

  // Mutations to save audit data and AOI
  const { mutateAsync: saveAudit, isPending: isSavingAudit } = useSaveDatasetAudit();

  const { mutateAsync: saveAOI, isPending: isSavingAOI } = useSaveDatasetAOI();

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Set dataset ID in context when component mounts
  useEffect(() => {
    if (dataset.id) {
      setDatasetId(dataset.id);
    }

    // Clean up when component unmounts
    return () => {
      setDatasetId(null);
    };
  }, [dataset.id, setDatasetId]);

  // Set form values when audit data is loaded
  useEffect(() => {
    if (auditData) {
      form.setFieldsValue(auditData);
    }
  }, [auditData, form]);

  // Load saved AOI data when available
  useEffect(() => {
    if (savedAOI && savedAOI.geometry) {
      setCurrentAOI(savedAOI.geometry as GeoJSON.MultiPolygon);
      form.setFieldsValue({ aoi_done: true });
      setHasUnsavedChanges(false);
    }
  }, [savedAOI, form, setCurrentAOI, setHasUnsavedChanges]);

  const handleSubmit = async (values: AuditFormValues) => {
    try {
      setIsSubmitting(true);

      // First, save the audit data
      const auditPayload: AuditFormValues = {
        ...values,
        dataset_id: dataset.id,
      };

      await saveAudit(auditPayload);

      // Then, if there's AOI data, save it
      if (currentAOI && currentAOI.coordinates && currentAOI.coordinates.length > 0) {
        // Create a stable copy of the AOI to prevent any modifications during the save process
        const aoiPayload: AOIData = {
          dataset_id: dataset.id,
          geometry: JSON.parse(JSON.stringify(currentAOI)), // Create a deep copy to prevent mutation issues
          is_whole_image: false, // Could be updated based on UI if needed
          image_quality: 1, // Default value, could be changed if there's UI for it
          notes: values.notes || "",
        };

        try {
          await saveAOI(aoiPayload);
          setHasUnsavedChanges(false);
          message.success("Audit data and Area of Interest saved successfully");
        } catch (aoiError) {
          console.error("Error saving AOI data:", aoiError);
          message.warning("Audit data saved, but there was an issue saving the Area of Interest");
          // Continue execution - don't block overall save if AOI fails
        }
      } else {
        message.success("Audit data saved successfully");
      }

      // Use setTimeout to ensure state updates complete before navigation
      setTimeout(() => {
        navigate("/dataset-audit");
      }, 100);
    } catch (error) {
      console.error("Error saving audit data:", error);
      message.error("Failed to save audit data");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAOIChange = (multiPolygon: GeoJSON.MultiPolygon) => {
    try {
      // Validate the multiPolygon before updating state
      if (!multiPolygon || typeof multiPolygon !== "object") {
        console.warn("Invalid multiPolygon received:", multiPolygon);
        return;
      }

      // Create a clean copy of the multiPolygon to prevent reference issues
      const validatedAOI = {
        type: "MultiPolygon" as const,
        coordinates: multiPolygon.coordinates || [],
      };

      // Update the context with the validated polygon
      console.log("validatedAOI", validatedAOI);
      setCurrentAOI(validatedAOI);
      setHasUnsavedChanges(true);

      // Update aoi_done in form when a valid AOI is drawn
      if (validatedAOI.coordinates.length > 0) {
        form.setFieldsValue({ aoi_done: true });
      } else {
        form.setFieldsValue({ aoi_done: false });
      }
    } catch (error) {
      console.error("Error handling AOI change:", error);
    }
  };

  const handleCancel = () => {
    if (hasUnsavedChanges) {
      // If there's an unsaved AOI, show a confirmation dialog
      if (window.confirm("You have an unsaved Area of Interest. Are you sure you want to leave?")) {
        navigate("/dataset-audit");
      }
    } else {
      // Otherwise just navigate
      navigate("/dataset-audit");
    }
  };

  const isLoading = isAuditLoading || isAOILoading || !user;
  const isSaving = isSavingAudit || isSavingAOI || isSubmitting;

  return (
    <div className="flex h-full w-full overflow-hidden">
      <div className="flex w-80 flex-shrink-0 flex-col overflow-hidden border-r border-slate-200">
        {/* Header - Fixed position */}
        <div className="flex-shrink-0 border-b border-slate-200 bg-white p-3 shadow-sm">
          <Button size="middle" shape="circle" onClick={handleCancel} icon={<ArrowLeftOutlined />} className="mb-2" />
          <Title level={5} className="m-0">
            Audit Dataset: {dataset.admin_level_3 || dataset.admin_level_2}, {dataset.admin_level_1}
          </Title>
        </div>

        {/* Scrollable Form Container */}
        <div className="flex-1 overflow-y-auto p-1">
          <Form
            form={form}
            layout="horizontal"
            onFinish={handleSubmit}
            disabled={isLoading}
            className="space-y-2"
            labelCol={{ span: 16 }}
            wrapperCol={{ span: 8 }}
            labelAlign="left"
            colon={false}
            size="small"
          >
            <div className="rounded-md bg-white p-2 shadow-sm">
              <Title level={5} className="my-2  text-sm">
                Georeference & Date
              </Title>

              <Form.Item name="is_georeferenced" label="Is Georeferenced" valuePropName="checked">
                <Switch size="small" />
              </Form.Item>

              <Form.Item name="has_valid_acquisition_date" label="Has Valid Acquisition Date" valuePropName="checked">
                <Switch size="small" />
              </Form.Item>

              <Form.Item
                name="acquisition_date_notes"
                label="Date Notes"
                labelCol={{ span: 24 }}
                wrapperCol={{ span: 24 }}
              >
                <TextArea rows={2} placeholder="Optional notes about acquisition date" />
              </Form.Item>
            </div>

            <div className="rounded-md bg-white p-2 shadow-sm">
              <Title level={5} className="my-2 text-sm">
                Phenology
              </Title>

              <Form.Item name="has_valid_phenology" label="Has Valid Phenology" valuePropName="checked">
                <Switch size="small" />
              </Form.Item>

              <Form.Item
                name="phenology_notes"
                label="Phenology Notes"
                labelCol={{ span: 24 }}
                wrapperCol={{ span: 24 }}
              >
                <TextArea rows={2} placeholder="Optional notes about phenology" />
              </Form.Item>
            </div>

            <div className="rounded-md bg-white p-3 shadow-sm">
              <Title level={5} className="my-2 text-sm">
                Prediction Quality
              </Title>

              <Form.Item
                name="deadwood_quality"
                label="Deadwood Quality"
                labelCol={{ span: 24 }}
                wrapperCol={{ span: 24 }}
              >
                <Select placeholder="Select quality" size="small">
                  <Option value="great">Great</Option>
                  <Option value="sentinel_ok">Sentinel OK</Option>
                  <Option value="bad">Bad</Option>
                </Select>
              </Form.Item>

              <Form.Item name="deadwood_notes" label="Deadwood Notes" labelCol={{ span: 24 }} wrapperCol={{ span: 24 }}>
                <TextArea rows={2} placeholder="Optional notes about deadwood detection" />
              </Form.Item>

              <Form.Item
                name="forest_cover_quality"
                label="Forest Cover Quality"
                labelCol={{ span: 24 }}
                wrapperCol={{ span: 24 }}
              >
                <Select placeholder="Select quality" size="small">
                  <Option value="great">Great</Option>
                  <Option value="sentinel_ok">Sentinel OK</Option>
                  <Option value="bad">Bad</Option>
                </Select>
              </Form.Item>

              <Form.Item
                name="forest_cover_notes"
                label="Forest Cover Notes"
                labelCol={{ span: 24 }}
                wrapperCol={{ span: 24 }}
              >
                <TextArea rows={2} placeholder="Optional notes about forest cover" />
              </Form.Item>
            </div>

            <div className="rounded-md bg-white p-3 shadow-sm">
              <Title level={5} className="my-2 text-sm">
                AOI & Issues
              </Title>

              <Form.Item name="aoi_done" label="AOI Completed" valuePropName="checked">
                <Switch size="small" disabled={true} />
              </Form.Item>

              <Text type="secondary" className="mb-2 block text-xs">
                Use the drawing tools on the map to define the Area of Interest
              </Text>

              <Form.Item name="has_cog_issue" label="Has COG Issue" valuePropName="checked">
                <Switch size="small" />
              </Form.Item>

              <Form.Item
                name="cog_issue_notes"
                label="COG Issue Notes"
                labelCol={{ span: 24 }}
                wrapperCol={{ span: 24 }}
              >
                <TextArea rows={2} placeholder="Optional notes about COG issues" />
              </Form.Item>

              <Form.Item name="has_thumbnail_issue" label="Has Thumbnail Issue" valuePropName="checked">
                <Switch size="small" />
              </Form.Item>

              <Form.Item
                name="thumbnail_issue_notes"
                label="Thumbnail Issue Notes"
                labelCol={{ span: 24 }}
                wrapperCol={{ span: 24 }}
              >
                <TextArea rows={2} placeholder="Optional notes about thumbnail issues" />
              </Form.Item>
            </div>

            <div className="rounded-md bg-white p-3 shadow-sm">
              <Title level={5} className="my-2 text-sm">
                Additional Notes
              </Title>

              <Form.Item name="notes" label="General Notes" labelCol={{ span: 24 }} wrapperCol={{ span: 24 }}>
                <TextArea rows={3} placeholder="Any additional observations or notes" />
              </Form.Item>
            </div>

            <Space className="mb-4 mt-4 w-full justify-end">
              <Button onClick={handleCancel} size="small">
                Cancel
              </Button>
              <Button type="primary" htmlType="submit" loading={isSaving} icon={<SaveOutlined />} size="small">
                Save Audit
              </Button>
            </Space>
          </Form>
        </div>
      </div>

      <div className="h-full flex-1">
        <DatasetAuditMap dataset={dataset} onAOIChange={handleAOIChange} initialAOI={currentAOI} />
      </div>
    </div>
  );
}
