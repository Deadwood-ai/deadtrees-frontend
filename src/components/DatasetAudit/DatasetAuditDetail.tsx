import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Typography, Form, Radio, Input, Select, message, Tooltip, Card, Space, Image, Checkbox } from "antd";
import { ArrowLeftOutlined, SaveOutlined, InfoCircleOutlined } from "@ant-design/icons";
import { IDataset } from "../../types/dataset";
import DatasetAuditMap from "./DatasetAuditMap";
import {
  useDatasetAudit,
  useSaveDatasetAudit,
  useDatasetAOI,
  AuditFormValues,
  useSetAuditLock,
  useClearAuditLock,
} from "../../hooks/useDatasetAudit";
import { useAuth } from "../../hooks/useAuthProvider";
import { Settings } from "../../config";

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

interface DatasetAuditDetailProps {
  dataset: IDataset;
}

// Helper info content for each audit step
const AUDIT_INFO = {
  georeferencing:
    "Georeferencing accuracy: Good (<15m) means properly aligned with map features. Poor (>15m) should be excluded from analysis.",
  acquisitionDate:
    "Validate if acquisition date matches visual indicators like leaf color, snow cover, or seasonal characteristics. Invalid dates should be excluded.",
  phenology:
    "Assess seasonal appropriateness: In Season means appropriate for the region and time. Out of Season (especially in non-tropical regions) should be excluded from Sentinel training.",
  deadwoodQuality:
    "Rate deadwood segmentation prediction quality: Great = highly accurate, OK = acceptable for Sentinel training, Bad = poor quality predictions.",
  forestCoverQuality:
    "Evaluate forest cover segmentation quality: Great = precise boundaries and classification, OK = acceptable accuracy, Bad = poor segmentation results.",
  cogIssues:
    "Assess Cloud-Optimized GeoTIFF quality: Check transparency, black/white areas, color band consistency, and artifacts. Good = no issues, Issues = problems detected.",
  thumbnailIssues:
    "Evaluate thumbnail quality: Check color accuracy, appropriate zoom level, white background (correct no-data values), and absence of artifacts. Good = meets standards, Issues = problems found.",
  aoi: "Define the area of interest for analysis. Draw a polygon on the map to specify the region that should be analyzed. This is required for the audit to be complete.",
};

export default function DatasetAuditDetail({ dataset }: DatasetAuditDetailProps) {
  const navigate = useNavigate();
  const [form] = Form.useForm<AuditFormValues>();
  const { user } = useAuth();

  // Track current AOI geometry and whether it's loaded
  const currentAOIGeometry = useRef<GeoJSON.MultiPolygon | GeoJSON.Polygon | null>(null);
  const [hasAOI, setHasAOI] = useState(false);
  const [isAOILoaded, setIsAOILoaded] = useState(false);

  // Get existing audit data if available
  const { data: auditData, isLoading: isAuditLoading } = useDatasetAudit(dataset.id);

  // Mutation to save audit data
  const { mutateAsync: saveAudit, isPending: isSavingAudit } = useSaveDatasetAudit();

  // Audit lock mutations
  const { mutateAsync: setAuditLock } = useSetAuditLock();
  const { mutateAsync: clearAuditLock } = useClearAuditLock();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [auditLockError, setAuditLockError] = useState<string | null>(null);
  const [isLockingAudit, setIsLockingAudit] = useState(true);

  // Set audit lock when component mounts
  useEffect(() => {
    const lockAudit = async () => {
      try {
        setIsLockingAudit(true);
        await setAuditLock(dataset.id);
        setAuditLockError(null);
        setIsLockingAudit(false);
      } catch (error) {
        console.error("Failed to set audit lock:", error);
        const errorMessage = error instanceof Error ? error.message : "Could not lock dataset for audit";
        setAuditLockError(errorMessage);
        setIsLockingAudit(false);
        message.error(errorMessage);

        // Navigate back to audit list if can't lock
        setTimeout(() => {
          navigate("/dataset-audit");
        }, 2000);
      }
    };

    lockAudit();

    // Clear audit lock when component unmounts
    return () => {
      if (!auditLockError) {
        clearAuditLock(dataset.id).catch((error) => {
          console.error("Failed to clear audit lock:", error);
        });
      }
    };
  }, [dataset.id, setAuditLock, clearAuditLock, navigate]);

  // Set form values when audit data is loaded
  useEffect(() => {
    if (auditData) {
      form.setFieldsValue(auditData);
    }
  }, [auditData, form]);

  const handleAOIChange = (geometry: GeoJSON.MultiPolygon | GeoJSON.Polygon | null) => {
    console.log("AOI changed in Detail:", geometry ? "AOI present" : "AOI cleared");
    currentAOIGeometry.current = geometry;
    setHasAOI(!!geometry);
    setIsAOILoaded(true);
  };

  const handleSubmit = async (values: AuditFormValues) => {
    // Wait for AOI to be loaded/processed before validating
    if (!isAOILoaded) {
      message.warn("AOI is still loading, please wait...");
      return;
    }

    if (!currentAOIGeometry.current) {
      message.error("Please draw an AOI on the map before submitting");
      return;
    }

    try {
      setIsSubmitting(true);

      const auditPayload = {
        ...values,
        dataset_id: dataset.id,
        aoi_done: true,
        aoiGeometry: currentAOIGeometry.current,
      };

      await saveAudit(auditPayload);
      message.success(auditData ? "Audit data updated successfully" : "Audit data saved successfully");

      // Always navigate back to audit list
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

  const handleCancel = async () => {
    try {
      if (!auditLockError) {
        await clearAuditLock(dataset.id);
      }
    } catch (error) {
      console.error("Failed to clear audit lock:", error);
    }
    navigate("/dataset-audit");
  };

  const isLoading = isAuditLoading || !user || isLockingAudit;
  const isSaving = isSavingAudit || isSubmitting;

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="text-center">
          <div className="mb-2">Loading audit...</div>
          {isLockingAudit && <div className="text-sm text-gray-500">Securing audit lock...</div>}
        </div>
      </div>
    );
  }

  // Show error state
  if (auditLockError) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="text-center">
          <p className="text-red-500">{auditLockError}</p>
          <p className="text-gray-500">Redirecting back to audit list...</p>
        </div>
      </div>
    );
  }

  const InfoIcon = ({ content }: { content: string }) => (
    <Tooltip title={content} placement="right" overlayStyle={{ maxWidth: 300 }}>
      <InfoCircleOutlined className="ml-1 cursor-help text-blue-500" />
    </Tooltip>
  );

  // Generate thumbnail URL
  const thumbnailUrl = dataset.thumbnail_path ? `${Settings.THUMBNAIL_URL}${dataset.thumbnail_path}` : null;

  // Format acquisition date
  const formatAcquisitionDate = () => {
    const day = dataset.aquisition_day;
    const month = dataset.aquisition_month;
    const year = dataset.aquisition_year;

    if (!year) return "Date not available";

    // Create a date object and format it
    if (month) {
      const date = new Date(year, month - 1, day || 1); // month is 0-indexed in Date constructor

      if (day) {
        // Full date: "15 March 2023"
        return date.toLocaleDateString("en-GB", {
          day: "numeric",
          month: "long",
          year: "numeric",
        });
      } else {
        // Month and year: "March 2023"
        return date.toLocaleDateString("en-GB", {
          month: "long",
          year: "numeric",
        });
      }
    }

    return year.toString();
  };

  return (
    <div className="flex h-full w-full overflow-hidden">
      <div className="flex w-96 flex-shrink-0 flex-col overflow-hidden border-r border-slate-200 bg-gray-50">
        {/* Header - Fixed position */}
        <div className="flex-shrink-0 border-b border-slate-200 bg-white p-3 shadow-sm">
          <Button shape="circle" onClick={handleCancel} icon={<ArrowLeftOutlined />} className="mb-2" />
          <div>
            <Title level={5} className="m-0 text-sm">
              Audit: {dataset.id} - {dataset.admin_level_3 || dataset.admin_level_2}
            </Title>
            <Text type="secondary" className="text-xs font-medium">
              Uploaded by: <span className=" text-blue-600">{auditData?.uploaded_by_email}</span>
            </Text>
          </div>
          {auditData?.audited_by && (
            <Text type="secondary" className="mt-1 block text-xs font-medium text-slate-500">
              Last audited by:{" "}
              <span className=" text-blue-600">{auditData.audited_by_email || auditData.audited_by}</span>
            </Text>
          )}
        </div>

        {/* Scrollable Form Container */}
        <div className="flex-1 overflow-y-auto p-2">
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            disabled={isLoading}
            size="small"
            validateTrigger={["onChange", "onBlur"]}
          >
            {/* Step 1: Georeferencing */}
            <Card size="small" className="mb-3 shadow-sm">
              <div className="mb-2 flex items-center">
                <Text strong className="text-xs">
                  1. Georeferencing
                </Text>
                <InfoIcon content={AUDIT_INFO.georeferencing} />
              </div>

              <Form.Item
                name="is_georeferenced"
                className="mb-2"
                rules={[{ required: true, message: "Please select georeferencing status" }]}
              >
                <Radio.Group>
                  <Space size="large">
                    <Radio value={true}>🟢 Good (&lt;15m)</Radio>
                    <Radio value={false}>🔴 Poor (&gt;15m)</Radio>
                  </Space>
                </Radio.Group>
              </Form.Item>
            </Card>

            {/* Step 2: Acquisition Date */}
            <Card size="small" className="mb-3 shadow-sm">
              <div className="mb-2 flex items-center">
                <Text strong className="text-xs">
                  2. Acquisition Date
                </Text>
                <InfoIcon content={AUDIT_INFO.acquisitionDate} />
              </div>

              {/* Display the acquisition date */}
              <div className="mb-2 rounded bg-blue-50 p-2">
                <Text className="text-xs font-medium text-blue-800">
                  📅 Acquisition Date: {formatAcquisitionDate()}
                </Text>
              </div>

              <Form.Item
                name="has_valid_acquisition_date"
                className="mb-2"
                rules={[{ required: true, message: "Please validate acquisition date" }]}
              >
                <Radio.Group>
                  <Space size="large">
                    <Radio value={true}>🟢 Valid</Radio>
                    <Radio value={false}>🔴 Invalid</Radio>
                  </Space>
                </Radio.Group>
              </Form.Item>

              <Form.Item name="acquisition_date_notes" className="mb-0">
                <TextArea rows={2} placeholder="Notes about date inconsistencies..." className="text-xs" />
              </Form.Item>
            </Card>

            {/* Step 3: Phenology */}
            <Card size="small" className="mb-3 shadow-sm">
              <div className="mb-2 flex items-center">
                <Text strong className="text-xs">
                  3. Phenology
                </Text>
                <InfoIcon content={AUDIT_INFO.phenology} />
              </div>

              {/* Display the biome information */}
              {dataset.biome_name && (
                <div className="mb-2 rounded bg-green-50 p-2">
                  <Text className="text-xs font-medium text-green-800">🌿 Biome: {dataset.biome_name}</Text>
                </div>
              )}

              <Form.Item
                name="has_valid_phenology"
                className="mb-2"
                rules={[{ required: true, message: "Please assess phenology" }]}
              >
                <Radio.Group>
                  <Space size="large">
                    <Radio value={true}>🟢 In Season</Radio>
                    <Radio value={false}>🔴 Out of Season</Radio>
                  </Space>
                </Radio.Group>
              </Form.Item>

              <Form.Item name="phenology_notes" className="mb-0">
                <TextArea rows={2} placeholder="Seasonal observations..." className="text-xs" />
              </Form.Item>
            </Card>

            {/* Step 4: Prediction Quality */}
            <Card size="small" className="mb-3 shadow-sm">
              <div className="mb-2 flex items-center">
                <Text strong className="text-xs">
                  4. Prediction Quality
                </Text>
              </div>

              <div className="mb-3">
                <div className="mb-1 flex items-center">
                  <Text className="text-xs font-medium">Deadwood Segmentation</Text>
                  <InfoIcon content={AUDIT_INFO.deadwoodQuality} />
                </div>
                <Form.Item
                  name="deadwood_quality"
                  className="mb-1"
                  rules={[{ required: true, message: "Please rate deadwood quality" }]}
                >
                  <Radio.Group>
                    <Space size="large">
                      <Radio value="great">🟢 Great</Radio>
                      <Radio value="sentinel_ok">🟡 OK</Radio>
                      <Radio value="bad">🔴 Bad</Radio>
                    </Space>
                  </Radio.Group>
                </Form.Item>
                <Form.Item name="deadwood_notes" className="mb-0">
                  <TextArea rows={1} placeholder="Deadwood notes..." className="text-xs" />
                </Form.Item>
              </div>

              <div>
                <div className="mb-1 flex items-center">
                  <Text className="text-xs font-medium">Forest Cover Segmentation</Text>
                  <InfoIcon content={AUDIT_INFO.forestCoverQuality} />
                </div>
                <Form.Item
                  name="forest_cover_quality"
                  className="mb-1"
                  rules={[{ required: true, message: "Please rate forest cover quality" }]}
                >
                  <Radio.Group>
                    <Space size="large">
                      <Radio value="great">🟢 Great</Radio>
                      <Radio value="sentinel_ok">🟡 OK</Radio>
                      <Radio value="bad">🔴 Bad</Radio>
                    </Space>
                  </Radio.Group>
                </Form.Item>
                <Form.Item name="forest_cover_notes" className="mb-0">
                  <TextArea rows={1} placeholder="Forest cover notes..." className="text-xs" />
                </Form.Item>
              </div>
            </Card>

            {/* Step 5: Cloud-Optimized GeoTIFF */}
            <Card size="small" className="mb-3 shadow-sm">
              <div className="mb-2 flex items-center">
                <Text strong className="text-xs">
                  5. Cloud-Optimized GeoTIFF
                </Text>
                <InfoIcon content={AUDIT_INFO.cogIssues} />
              </div>

              <Form.Item
                name="has_cog_issue"
                className="mb-2"
                rules={[{ required: true, message: "Please assess COG quality" }]}
              >
                <Radio.Group>
                  <Space size="large">
                    <Radio value={false}>🟢 Good</Radio>
                    <Radio value={true}>🔴 Issues</Radio>
                  </Space>
                </Radio.Group>
              </Form.Item>

              <Form.Item name="cog_issue_notes" className="mb-0">
                <TextArea
                  rows={2}
                  placeholder="COG issue details (transparency, black/white areas, color bands, artifacts)..."
                  className="text-xs"
                />
              </Form.Item>
            </Card>

            {/* Step 6: Thumbnail */}
            <Card size="small" className="mb-3 shadow-sm">
              <div className="mb-2 flex items-center">
                <Text strong className="text-xs">
                  6. Thumbnail
                </Text>
                <InfoIcon content={AUDIT_INFO.thumbnailIssues} />
              </div>

              {/* Thumbnail Display */}
              {thumbnailUrl && (
                <div className="mb-3 flex justify-center">
                  <Image
                    src={thumbnailUrl}
                    alt="Dataset thumbnail"
                    width={120}
                    height={120}
                    style={{ objectFit: "cover" }}
                    className="rounded border"
                    fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMIAAADDCAYAAADQvc6UAAABRWlDQ1BJQ0MgUHJvZmlsZQAAKJFjYGASSSwoyGFhYGDIzSspCnJ3UoiIjFJgf8LAwSDCIMogwMCcmFxc4BgQ4ANUwgCjUcG3awyMIPqyLsis7PPOq3QdDFcvjV3jOD1boQVTPQrgSkktTgbSf4A4LbmgqISBgTEFyFYuLykAsTuAbJEioKOA7DkgdjqEvQHEToKwj4DVhAQ5A9k3gGyB5IxEoBmML4BsnSQk8XQkNtReEOBxcfXxUQg1Mjc0dyHgXNJBSWpFCYh2zi+oLMpMzyhRcASGUqqCZ16yno6CkYGRAQMDKMwhqj/fAIcloxgHQqxAjIHBEugw5sUIsSQpBobtQPdLciLEVJYzMPBHMDBsayhILEqEO4DxG0txmrERhM29nYGBddr//5/DGRjYNRkY/l7////39v///y4Dmn+LgeHANwDrkl1AuO+pmgAAADhlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAAqACAAQAAAABAAAAwqADAAQAAAABAAAAwwAAAAD9b/HnAAAHlklEQVR4Ae3dP3Ik1RnG4W+FgYxN"
                  />
                </div>
              )}

              <Form.Item
                name="has_thumbnail_issue"
                className="mb-2"
                rules={[{ required: true, message: "Please assess thumbnail quality" }]}
              >
                <Radio.Group>
                  <Space size="large">
                    <Radio value={false}>🟢 Good</Radio>
                    <Radio value={true}>🔴 Issues</Radio>
                  </Space>
                </Radio.Group>
              </Form.Item>

              <Form.Item name="thumbnail_issue_notes" className="mb-0">
                <TextArea
                  rows={2}
                  placeholder="Thumbnail issue details (colors, zoom level, white background, artifacts)..."
                  className="text-xs"
                />
              </Form.Item>
            </Card>

            {/* Step 7: Area of Interest (AOI) - Updated */}
            <Card size="small" className="mb-3 shadow-sm">
              <div className="mb-2 flex items-center">
                <Text strong className="text-xs">
                  7. Area of Interest (AOI)
                </Text>
                <InfoIcon content={AUDIT_INFO.aoi} />
              </div>

              <div className="text-xs">
                {hasAOI ? (
                  <div className="flex items-center text-green-600">
                    <span className="mr-1">✓</span>
                    AOI defined
                  </div>
                ) : (
                  <div className="text-orange-600">AOI required - use the "Draw AOI" button on the map</div>
                )}
              </div>
            </Card>

            {/* Step 8: Additional Notes */}
            <Card size="small" className="mb-3 shadow-sm">
              <div className="mb-2 flex items-center">
                <Text strong className="text-xs">
                  8. Additional Notes
                </Text>
              </div>

              {/* Major Issue Checkbox */}
              <Form.Item name="has_major_issue" className="mb-2" valuePropName="checked">
                <Checkbox className="text-xs">
                  <span className="font-medium text-red-600">🚨 Has Major Issue</span>
                  <Tooltip title="Check this if the dataset has significant issues that require attention or should exclude it from analysis">
                    <InfoCircleOutlined className="ml-1 text-gray-400" />
                  </Tooltip>
                </Checkbox>
              </Form.Item>

              <Form.Item name="notes" className="mb-0">
                <TextArea rows={3} placeholder="Any additional observations..." className="text-xs" />
              </Form.Item>
            </Card>

            {/* Action Buttons - Simplified */}
            <div className="sticky bottom-0 bg-gray-50 pb-2 pt-3">
              <Space className="w-full justify-end">
                <Button onClick={handleCancel}>Cancel</Button>
                <Button
                  type="primary"
                  onClick={() => form.submit()}
                  loading={isSaving}
                  icon={<SaveOutlined />}
                  disabled={!hasAOI}
                >
                  Save Audit
                </Button>
              </Space>
            </div>
          </Form>
        </div>
      </div>

      {/* Map - let it handle ALL AOI logic */}
      <div className="flex-1">
        <DatasetAuditMap dataset={dataset} onAOIChange={handleAOIChange} />
      </div>
    </div>
  );
}
