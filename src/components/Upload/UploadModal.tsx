import { useState, useRef } from "react";
import {
  Button,
  Form,
  Radio,
  Space,
  Upload,
  Modal,
  Alert,
  Input,
  Select,
  Tooltip,
  Divider,
  Checkbox,
  Typography,
  Collapse,
} from "antd";
import { InfoCircleOutlined, UploadOutlined, InboxOutlined } from "@ant-design/icons";
import { useAuth } from "../../hooks/useAuthProvider";
import addMetadata from "../../api/addMetadata";
import { IDataAccess, ILabelObject, ILicense, IPlatform } from "../../types/dataset";
import { useFileUpload } from "../../hooks/useFileUpload";
import { useUploadNotification } from "../../hooks/useUploadNotification";
import PickerWithType from "./PickerWithType";
import uploadOrtho from "../../api/uploadOrtho";
import { useData } from "../../hooks/useDataProvider";
import addProcess from "../../api/addProcess";
import uploadLabelObject from "../../api/uploadLabelObject";
import useLabelsFileUpload from "../../hooks/useLabelsFileUpload";

import logger from "../../utils/logger";
import { isTokenExpiringSoon } from "../../utils/isTokenExpiringSoon";
import { supabase } from "../../hooks/useSupabase";
import { RcFile } from "antd/es/upload";
import Marquee from "react-fast-marquee";
// New interfaces
interface IFormValues {
  license: ILicense;
  platform: IPlatform;
  spectral_properties: string;
  aquisition_date: any;
  author: string[];
  doi: string;
  additional_information: string;
  labels_description: string;
}

interface UploadModalProps {
  isVisible: boolean;
  onClose: () => void;
  uploadKey: string;
}

// Add these types near the top of the file
interface UploadResponse {
  id: string;
  [key: string]: any;
}

interface MetadataPayload {
  dataset_id: string;
  user_id: string;
  name: string;
  license: ILicense;
  data_access: IDataAccess;
  platform: IPlatform;
  spectral_properties: string;
  aquisition_year: number;
  aquisition_month: number | null;
  aquisition_day: number | null;
  authors: string[];
  citation_doi: string;
  additional_information: string;
}

// Add these utility functions before the component
function createMetadataPayload(
  datasetId: string,
  userId: string,
  values: IFormValues,
  fileName: string,
  pickerType: string,
): MetadataPayload {
  let year = null;
  let month = null;
  let day = null;

  if (values.aquisition_date) {
    // Handle different picker types
    switch (pickerType) {
      case "Year":
        year = values.aquisition_date.year();
        break;
      case "Year/Month":
        year = values.aquisition_date.year();
        month = values.aquisition_date.month() + 1; // Adding 1 because months are 0-based
        break;
      case "Year/Month/Day":
        year = values.aquisition_date.year();
        month = values.aquisition_date.month() + 1;
        day = values.aquisition_date.date();
        break;
    }
  }

  return {
    dataset_id: datasetId,
    user_id: userId,
    name: fileName,
    data_access: IDataAccess.public,
    license: ILicense["CC BY"],
    platform: values.platform,
    spectral_properties: "RGB",
    aquisition_year: year,
    aquisition_month: month,
    aquisition_day: day,
    authors: values.author,
    citation_doi: values.doi,
    additional_information: values.additional_information,
  };
}

function createLabelObjectFormData(
  datasetId: string,
  userId: string,
  labelFile: RcFile,
  labelDescription: string,
): FormData {
  const formData = new FormData();
  formData.append("dataset_id", datasetId);
  formData.append("user_id", userId);
  formData.append("file", labelFile);
  formData.append("file_alias", labelFile.name.split(".")[0]);
  formData.append("label_description", labelDescription);
  formData.append("file_type", labelFile.name.split(".")[1]);
  return formData;
}

const TermsLink = () => (
  <Typography.Link href="/terms-of-service" target="_blank">
    terms of service
  </Typography.Link>
);

const PrivacyLink = () => (
  <Typography.Link href="/datenschutzerklaerung" target="_blank">
    privacy policy
  </Typography.Link>
);

const UploadModal: React.FC<UploadModalProps> = ({ isVisible, onClose, uploadKey }) => {
  const pickerTypeOptions = ["Year/Month/Day", "Year/Month", "Year"];
  const [form] = Form.useForm();

  const { fileList, fileName, fileNameFull, onFileChange, beforeUpload } = useFileUpload();
  const { labelsFileList, onLabelsFileChange, beforeLabelsUpload } = useLabelsFileUpload();

  const { session } = useAuth();
  const [pickerType, setPickerType] = useState(pickerTypeOptions[0]);
  const [isUploading, setIsUploading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const { authors } = useData();
  console.log("authors in upload modal", authors);
  const {
    showUploadingNotification,
    updateUploadProgress,
    showSuccessNotification,
    showErrorNotification,
    closeNotification,
  } = useUploadNotification(uploadKey, fileName);

  const [enableLabelUpload, setEnableLabelUpload] = useState(false);

  const uploadOrthophoto = async (file: RcFile, metadata: any): Promise<UploadResponse> => {
    return new Promise((resolve, reject) => {
      // Create a new AbortController for this upload
      abortControllerRef.current = new AbortController();

      uploadOrtho({
        uploadId: uploadKey,
        file,
        session,
        metadata,
        signal: abortControllerRef.current.signal,
        onSuccess: (response) => {
          logger({
            user_id: session!.user.id,
            file_name: fileNameFull,
            process: "upload",
            level: "info",
            message: "Upload success",
          });
          resolve(response);
        },
        onError: (error) => {
          logger({
            user_id: session!.user.id,
            file_name: fileNameFull,
            process: "upload",
            level: "error",
            message: `Upload error: ${error}`,
          });
          reject(error);
        },
        onProgress: (event) => {
          const percent = Math.round(event.percent);
          updateUploadProgress(percent, cancelUpload);
        },
      });
    });
  };

  const getValidAccessToken = async (): Promise<string> => {
    if (isTokenExpiringSoon(session)) {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) throw error;
      return data.session!.access_token;
    }
    return session!.access_token;
  };

  const processDataset = async (datasetId: number, token: string) => {
    logger({
      user_id: session!.user.id,
      file_name: fileNameFull,
      process: "upload",
      level: "info",
      message: "Adding process",
    });

    await addProcess(datasetId, ["cog", "thumbnail", "metadata", "geotiff", "deadwood"], token);
  };

  const cancelUpload = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      logger({
        user_id: session!.user.id,
        file_name: fileNameFull,
        process: "upload",
        level: "info",
        message: "Upload cancelled by user",
      });
      closeNotification();
      setIsUploading(false);
    }
  };

  const handleUpload = async (values: IFormValues) => {
    setIsUploading(true);
    showUploadingNotification(cancelUpload);
    logger({
      user_id: session!.user.id,
      file_name: fileNameFull,
      process: "upload",
      level: "info",
      message: "Upload started",
    });

    try {
      const uploadFile = fileList[0];
      if (!uploadFile?.originFileObj) {
        throw new Error("No file selected for upload.");
      }
      console.log("values.author", values.author);
      // Create metadata object
      const metadata = {
        license: values.license,
        platform: values.platform,
        authors: values.author,
        project_id: undefined,
        aquisition_year: values.aquisition_date?.year(),
        aquisition_month: values.aquisition_date?.month() + 1,
        aquisition_day: values.aquisition_date?.date(),
        additional_information: values.additional_information,
        data_access: "public",
        citation_doi: values.doi,
      };
      console.log("metadata", metadata);

      // Upload orthophoto with metadata
      const uploadResponse = await uploadOrthophoto(uploadFile.originFileObj, metadata);
      if (!uploadResponse.id) {
        throw new Error("Upload failed to return an ID.");
      }

      // Get valid access token
      const validAccessToken = await getValidAccessToken();

      // Upload labels if present
      if (labelsFileList.length > 0) {
        const labelFile = labelsFileList[0].originFileObj;
        if (labelFile) {
          const labelFormData = createLabelObjectFormData(
            uploadResponse.id.toString(),
            session!.user.id,
            labelFile,
            values.labels_description,
          );
          await uploadLabelObject(labelFormData, validAccessToken);
        }
      }

      // Process dataset
      await processDataset(Number(uploadResponse.id), validAccessToken);

      showSuccessNotification();
    } catch (error) {
      // Check if the error was caused by user abortion
      if (error instanceof DOMException && error.name === "AbortError") {
        console.log("Upload was cancelled by the user");
      } else {
        console.error("Upload error:", error);
        logger({
          user_id: session!.user.id,
          file_name: fileNameFull,
          process: "upload",
          level: "error",
          message: `Upload error: ${error}`,
        });
        showErrorNotification();
      }
    } finally {
      setIsUploading(false);
    }
  };

  const onFormFinish = (values: IFormValues) => {
    onClose(); // Close the modal immediately
    handleUpload(values); // Start the upload process
  };

  const handleModalClose = () => {
    if (isUploading) {
      cancelUpload();
    }
    onClose();
  };

  return (
    <Modal
      open={isVisible}
      centered
      onCancel={handleModalClose}
      footer={null}
      style={{ padding: 0, margin: 0 }}
      maskClosable={false}
      width={1200}
    >
      <div className="m-0 px-4 py-0">
        {/* <Alert
          banner
          message={
            <Marquee pauseOnHover gradient={false} speed={50} delay={0} gradientWidth={0} style={{ padding: "2px 0" }}>
              By uploading, you agree to make your data public under the CC BY license. Contributors will be credited.
              For private data,&nbsp;
              <a href="mailto:teja.kattenborn@geosense.uni-freiburg.de;janusch.jehle@felis.uni-freiburg.de;clemens.mosig@uni-leipzig.de?subject=deadtrees.earth private data collaboration">
                contact us
              </a>
              .&nbsp;&nbsp;&nbsp;
            </Marquee>
          }
          className="mb-4"
        /> */}

        <Typography.Title style={{ margin: 0, paddingBottom: 16 }} level={4}>
          Orthophoto Upload
        </Typography.Title>
        <Form
          layout="vertical"
          onFinish={onFormFinish}
          initialValues={{ platform: "drone", agreement: false }}
          variant="filled"
          form={form}
        >
          <div className="flex w-full justify-center space-x-12">
            <div className="w-full">
              <Form.Item label="Orthophoto" rules={[{ required: true, message: "Please upload a GeoTIFF file" }]}>
                <Upload.Dragger
                  fileList={fileList}
                  onChange={onFileChange}
                  beforeUpload={beforeUpload}
                  accept=".tif,.tiff"
                  maxCount={1}
                  className="w-full"
                >
                  <div className="flex">
                    <p className="ant-upload-drag-icon px-8">
                      <InboxOutlined />
                    </p>
                    <div className="text-start">
                      <p className="ant-upload-text mb-0">Click or drag GeoTIFF file to this area</p>
                      <p className="ant-upload-hint mb-0">
                        Upload your orthophoto in GeoTIFF format (.tif, .tiff). This georeferenced image is essential
                        for spatial analysis.
                      </p>
                    </div>
                  </div>
                </Upload.Dragger>
              </Form.Item>
              <Form.Item
                rules={[
                  { required: true, message: "Please enter the authors" },
                  {
                    validator: (_, value) => {
                      if (!value) return Promise.resolve();

                      const hasAndPattern = value.some(
                        (author: string) =>
                          author.toLowerCase().includes(" and ") || author.toLowerCase().includes(","),
                      );

                      if (hasAndPattern) {
                        return Promise.reject(
                          'Please add authors individually instead of using "and" or ",". Use separate entries for each author.',
                        );
                      }
                      return Promise.resolve();
                    },
                  },
                ]}
                label={
                  <div>
                    <Tooltip title="Provide the names of individuals or organizations responsible for capturing the orthophoto. Add authors individually - one entry per author.">
                      <InfoCircleOutlined className="mr-2" />
                    </Tooltip>
                    Authors of the Orthophoto
                  </div>
                }
                name="author"
                // extra="Add each author separately
              >
                {authors?.at(0)?.label ? (
                  <Select
                    mode="tags"
                    style={{ width: "100%" }}
                    options={authors}
                    placeholder="Enter author names separately (e.g. 'John Smith')"
                  />
                ) : (
                  <Select mode="tags" style={{ width: "100%" }} placeholder="Enter authors (one author per entry)" />
                )}
              </Form.Item>
              <Form.Item
                className="mb-1 w-full"
                label={
                  <div>
                    <Tooltip title="Specify the acquisition date of the orthophoto. If you're unsure of the exact date, you can provide a broader timeframe (e.g., month or year).">
                      <InfoCircleOutlined className="mr-2" />
                    </Tooltip>
                    Acquisition Date of the Orthophoto
                  </div>
                }
                name="aquisition_date"
                rules={[{ required: true, message: "Please select a date" }]}
                extra="If you're unsure of the exact date, provide a broader timeframe (e.g., month or year)."
              >
                <PickerWithType
                  pickerTypeOptions={pickerTypeOptions}
                  pickerType={pickerType}
                  setPickerType={setPickerType}
                  onChange={(date) => form.setFieldsValue({ aquisition_date: date })}
                />
              </Form.Item>
              {/* <Typography.Paragraph className="p-0" type="secondary">
                If you're unsure of the exact date, provide a broader timeframe (e.g., month or year).
              </Typography.Paragraph> */}

              <Form.Item
                label={
                  <div>
                    <Tooltip title="Select the platform used for capturing the orthophoto (e.g., Drone, Airborne, or Satellite)">
                      <InfoCircleOutlined className="mr-2" />
                    </Tooltip>
                    Platform
                  </div>
                }
                name="platform"
              >
                <Radio.Group>
                  <Radio value="drone">Drone</Radio>
                  <Radio value="airborne">Airborne</Radio>
                  <Radio value="satellite">Satellite</Radio>
                </Radio.Group>
              </Form.Item>
              <Form.Item
                label="DOI"
                name="doi"
                rules={[
                  {
                    type: "url",
                    message: "Please enter a valid URL",
                  },
                ]}
              >
                <Input placeholder="Enter DOI, URL, or publication reference (if applicable)" />
              </Form.Item>
              <Form.Item label="Additional Information" name="additional_information">
                <Input.TextArea
                  placeholder="Enter project or data information (e.g., project name, data collection context, processing details)"
                  autoSize={{ minRows: 3, maxRows: 6 }}
                />
              </Form.Item>
              <Form.Item>
                <div className="space-y-4">
                  <Form.Item
                    name="agreement"
                    valuePropName="checked"
                    rules={[
                      {
                        validator: (_, value) =>
                          value
                            ? Promise.resolve()
                            : Promise.reject("Please accept the terms of service and privacy policy"),
                      },
                    ]}
                  >
                    <div className="flex items-start">
                      <Checkbox className="mt-1" />
                      <div className="ml-4 text-sm">
                        I agree to the <TermsLink /> and <PrivacyLink />. I confirm that I have the rights to share this
                        data and agree to make it available under the CC BY license.
                      </div>
                    </div>
                  </Form.Item>
                  <Space>
                    <Button type="primary" htmlType="submit" disabled={fileList.length === 0}>
                      Upload
                    </Button>
                    <Button type="default" onClick={onClose}>
                      Cancel
                    </Button>
                  </Space>
                </div>
              </Form.Item>
            </div>
            <div className="w-full">
              <div className="w-full">
                <div>
                  <Form.Item
                    label={
                      <div className="flex items-center justify-between ">
                        <div>Labels</div>
                        <div className="pl-2 text-sm font-bold">(Optional)</div>
                      </div>
                    }
                    name="labels_file"
                    rules={[
                      {
                        required: false,
                        message: "Please upload a labels file in GeoJSON, Shapefile as zip, or GeoPackage format",
                      },
                    ]}
                  >
                    <Upload.Dragger
                      fileList={labelsFileList}
                      onChange={onLabelsFileChange}
                      beforeUpload={beforeLabelsUpload}
                      accept=".geojson,.json,.zip,.gpkg"
                      maxCount={1}
                      className="w-full"
                      style={{ backgroundColor: "white" }}
                    >
                      <div className="flex">
                        <p className="ant-upload-drag-icon px-8 text-center">
                          <InboxOutlined />
                        </p>
                        <div className="text-start">
                          <p className="ant-upload-text mb-0">Click or drag labels file to this area</p>
                          <p className="ant-upload-hint mb-0">
                            Upload standing deadwood labels as GeoJSON, Shapefile (zip) or GeoPackage
                          </p>
                        </div>
                      </div>
                    </Upload.Dragger>
                  </Form.Item>
                  <Form.Item
                    label="Labels Description (required when uploading labels)"
                    name="labels_description"
                    rules={[
                      ({ getFieldValue }) => ({
                        validator(_, value) {
                          if (labelsFileList.length > 0 && !value) {
                            return Promise.reject("Please provide a description for the uploaded labels");
                          }
                          return Promise.resolve();
                        },
                      }),
                    ]}
                  >
                    <Input.TextArea
                      autoSize={{ minRows: 4, maxRows: 10 }}
                      placeholder="Example: Type - Forest Boundaries, Source - XYZ Survey 2023"
                      variant="outlined"
                    />
                  </Form.Item>
                  <div className="mb-6"></div>
                </div>
              </div>
            </div>
          </div>
        </Form>
      </div>
    </Modal>
  );
};

export default UploadModal;
