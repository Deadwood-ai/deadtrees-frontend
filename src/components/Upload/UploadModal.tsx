import { useState } from "react";
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
import { InfoCircleOutlined, UploadOutlined } from "@ant-design/icons";
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
  data_access: IDataAccess;
}

interface UploadModalProps {
  isVisible: boolean;
  onClose: () => void;
  uploadKey: string;
}

const UploadModal: React.FC<UploadModalProps> = ({ isVisible, onClose, uploadKey }) => {
  const pickerTypeOptions = ["Year/Month/Day", "Year/Month", "Year"];


  const { fileList, fileName, fileNameFull, onFileChange, beforeUpload } = useFileUpload();
  const { labelsFileList, onLabelsFileChange, beforeLabelsUpload } = useLabelsFileUpload();

  const { session } = useAuth();
  const [pickerType, setPickerType] = useState(pickerTypeOptions[0]);

  const [uploadProgress, setUploadProgress] = useState(0);
  const { authors } = useData();
  console.log("authors in upload modal", authors);
  const {
    showUploadingNotification,
    updateUploadProgress,
    showSuccessNotification,
    showErrorNotification
  } = useUploadNotification(uploadKey, fileName);

  const [enableLabelUpload, setEnableLabelUpload] = useState(false);

  const handleUpload = async (values: IFormValues) => {
    showUploadingNotification();
    logger({
      user_id: session!.user.id,
      file_name: fileNameFull,
      process: "upload",
      level: "info",
      message: "Upload started",
    });

    try {
      const uploadFile = fileList[0];

      if (!uploadFile || !uploadFile.originFileObj) {
        throw new Error("No file selected for upload.");
      }

      // Execute custom request here
      const resUpload = await new Promise<any>((resolve, reject) => {
        uploadOrtho({
          uploadId: uploadKey,
          file: uploadFile.originFileObj,
          session: session,
          onSuccess: (response) => {
            console.log("Upload success:", response);
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
            console.error("Upload error:", error);
            reject(error);
          },
          onProgress: (event) => {
            const percent = Math.round(event.percent);
            setUploadProgress(percent);
            updateUploadProgress(percent);
          },
        });
      });

      console.log("resUpload", resUpload);

      if (resUpload.id) {

        let validAccessToken: string;

        if (isTokenExpiringSoon(session)) {
          const { data, error } = await supabase.auth.refreshSession();
          console.log("refreshed token", data.session);
          if (error) {
            console.error("Error refreshing token:", error);
            throw error;
          }
          validAccessToken = data.session!.access_token;
        } else {
          console.log("using existing token", session);
          validAccessToken = session!.access_token;
        }

        console.log("values", values);
        // Adding metadata
        const metadata = {
          dataset_id: resUpload.id.toString(),
          user_id: session!.user.id,
          name: uploadFile.name,
          data_access: values.data_access,
          platform: values.platform,
          spectral_properties: "RGB",
          aquisition_year: values.aquisition_date.year(),
          aquisition_month:
            pickerType !== "year" ? values.aquisition_date.month() + 1 : null,
          aquisition_day:
            pickerType === "date" ? values.aquisition_date.date() : null,
          authors:
            values.author.length > 1
              ? values.author.join(" and ")
              : values.author[0],
          citation_doi: values.doi,
          additional_information: values.additional_information,
        };
        logger({
          user_id: session!.user.id,
          file_name: fileNameFull,
          process: "upload",
          level: "info",
          message: "Adding metadata",
        });

        const resAddMetadata = await addMetadata(
          resUpload.id,
          metadata,
          validAccessToken
        );
        console.log("resAddMetadata", resAddMetadata);
        logger({
          user_id: session!.user.id,
          file_name: fileNameFull,
          process: "upload",
          level: "info",
          message: "Metadata added",
        });
        console.log("labelsFileList", labelsFileList);
        if (labelsFileList.length > 0) {

          const labelObject = new FormData();
          labelObject.append("dataset_id", resUpload.id.toString());
          labelObject.append("user_id", session!.user.id);
          labelObject.append("file", labelsFileList[0].originFileObj!);
          labelObject.append("file_alias", labelsFileList[0].name.split(".")[0]);
          labelObject.append("label_description", values.labels_description);
          labelObject.append("file_type", labelsFileList[0].name!.split(".")[1]);

          const resUploadLabelObject = await uploadLabelObject(labelObject, validAccessToken);
          console.log("resUploadLabelObject", resUploadLabelObject);
          logger({
            user_id: session!.user.id,
            file_name: fileNameFull,
            process: "upload",
            level: "info",
            message: "Labels uploaded",
          });
        }
        // setUploadStatus("success");
        showSuccessNotification();

        // Starting COG build (uncomment if needed)
        const processCog = {
          resolution: 0.04,
          profile: "jpeg",
          quality: 75,
          force_recreate: true,
          tiling_scheme: "web-optimized",
        }
        logger({
          user_id: session!.user.id,
          file_name: fileNameFull,
          process: "upload",
          level: "info",
          message: "Adding process",
        });
        const resAddProcess = await addProcess(resUpload.id, "all", validAccessToken, processCog);
        console.log("resAddProcess", resAddProcess);
        logger({
          user_id: session!.user.id,
          file_name: fileNameFull,
          process: "upload",
          level: "info",
          message: "Process added",
        });
      } else {
        throw new Error("Upload failed to return an ID.");
      }
    } catch (error) {
      console.error("Upload error:", error);
      logger({
        user_id: session!.user.id,
        file_name: fileNameFull,
        process: "upload",
        level: "error",
        message: `Upload error ${error}`,
      });
      // setUploadStatus("error");
      showErrorNotification();
    }
  };

  const onFormFinish = (values: IFormValues) => {
    onClose(); // Close the modal immediately
    handleUpload(values); // Start the upload process
  };


  return (
    <Modal
      open={isVisible}
      centered
      onCancel={onClose}
      footer={null}
      maskClosable={false}
      width={1000}
    >
      <Form
        layout="vertical"
        onFinish={onFormFinish}
        initialValues={{ platform: "drone", data_access: "public" }}
        variant="filled"
      >
        <div className="flex justify-center space-x-12"> {/* Center the content */}
          <div className="w-full max-w-md"> {/* Limit the form width */}
            <Typography.Title level={4}>Orthophoto Upload</Typography.Title>
            <Typography.Paragraph type="secondary">
              Upload your orthophoto in GeoTIFF format. This georeferenced image is essential for spatial analysis.
            </Typography.Paragraph>
            <Form.Item
              label={
                <div>
                  <Tooltip title="Upload your orthophoto in GeoTIFF format. Accepted formats: .tif, .tiff">
                    <InfoCircleOutlined className="mr-2" />
                  </Tooltip>
                  Orthophoto (GeoTIFF)
                </div>
              }
              rules={[{ required: true, message: "Please upload a GeoTIFF file" }]}
            >
              <Upload
                fileList={fileList}
                onChange={onFileChange}
                beforeUpload={beforeUpload}
                accept=".tif,.tiff"
                listType="text"
                maxCount={1}
              >
                <Button icon={<UploadOutlined />}>Select GeoTIFF file</Button>
              </Upload>
            </Form.Item>
            <Form.Item
              rules={[{ required: true, message: "Please enter the authors" }]}
              label={
                <div>
                  <Tooltip title="Provide the names of individuals or organizations responsible for capturing the orthophoto. You can either select from existing authors or type new names.">
                    <InfoCircleOutlined className="mr-2" />
                  </Tooltip>
                  Authors of the Orthophoto
                </div>
              }
              name="author"
            >
              {authors?.at(0)?.label ? (
                <Select
                  mode="tags"
                  style={{ width: "100%" }}
                  options={authors}
                  placeholder="Enter or select authors"
                />
              ) : (
                <Select mode="tags" style={{ width: "100%" }} placeholder="Authors" />
              )}
            </Form.Item>
            <Form.Item
              className="mb-1"
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
            >
              <PickerWithType pickerTypeOptions={pickerTypeOptions} pickerType={pickerType} setPickerType={setPickerType} />
            </Form.Item>
            <Typography.Paragraph className="p-0" type="secondary">
              If you're unsure of the exact date, provide a broader timeframe (e.g., month or year).
            </Typography.Paragraph>
            <Form.Item label={
              <div>
                <Tooltip title="Select the platform used for capturing the orthophoto (e.g., Drone, Airborne, or Satellite)">
                  <InfoCircleOutlined className="mr-2" />
                </Tooltip>
                Platform
              </div>
            } name="platform">
              <Radio.Group>
                <Radio value="drone">Drone</Radio>
                <Radio value="airborne">Airborne</Radio>
                <Radio value="satellite">Satellite</Radio>
              </Radio.Group>
            </Form.Item>
            <Form.Item
              label={
                <div>
                  <Tooltip title="Public: Data is fully accessible and downloadable. Private: Data is not accessible. Note: All data is used for model training.">
                    <InfoCircleOutlined className="mr-2" />
                  </Tooltip>
                  Data Access
                </div>
              } name="data_access">
              <Radio.Group>
                <Radio value="public">Public</Radio>
                <Radio value="private">Private</Radio>
              </Radio.Group>
            </Form.Item>
            <Form.Item
              label={
                <div>
                  <Tooltip title="Enter the DOI of any associated publication.">
                    <InfoCircleOutlined className="mr-2" />
                  </Tooltip>
                  DOI
                </div>
              }
              name="doi"
            >
              <Input placeholder="Enter DOI (if applicable)" />
            </Form.Item>
            <Form.Item
              label={
                <div>
                  <Tooltip title="Provide any additional context for the orthophoto.">
                    <InfoCircleOutlined className="mr-2" />
                  </Tooltip>
                  Additional Information
                </div>
              }
              name="additional_information"
            >
              <Input.TextArea placeholder="Enter additional information (optional)" />
            </Form.Item>
            {/* </Collapse.Panel> */}
            {/* </Collapse> */}
            <Form.Item>
              <Space className="pt-6">
                <Button
                  type="primary"
                  htmlType="submit"
                  disabled={fileList.length === 0}
                >
                  Upload
                </Button>
                <Button type="default" onClick={onClose}>
                  Cancel
                </Button>
              </Space>
            </Form.Item>
          </div>
          <div className={`${enableLabelUpload ? ' w-full max-w-md' : ''} pt-6`}>
            <div>
              <Checkbox
                checked={enableLabelUpload}
                onChange={(e) => setEnableLabelUpload(e.target.checked)}
                className="text-lg font-semibold"
              >
                Upload Labels (Optional)
              </Checkbox>
            </div>
            <div className="py-3 max-w-md">
              <Typography.Paragraph type="secondary">
                Upload standing deadwood labels (points, polygons, boxes) associated with your orthophoto.
              </Typography.Paragraph>
            </div>

            {enableLabelUpload && (
              <div className="w-full">
                <>
                  <Form.Item
                    label={
                      <div>
                        <Tooltip title="Upload a labels file associated with your orthophoto. Accepted formats: GeoJSON, zipped Shapefile (single file), or GeoPackage.">
                          <InfoCircleOutlined className="mr-2" />
                        </Tooltip>
                        Labels File (GeoJSON, Shapefile (zip), GeoPackage)
                      </div>
                    }
                    name="labels_file"
                    rules={[{ required: true, message: "Please upload a labels file in GeoJSON, Shapefile as zip, or GeoPackage format" }]}
                  >
                    <Upload
                      fileList={labelsFileList}
                      onChange={onLabelsFileChange}
                      beforeUpload={beforeLabelsUpload}
                      accept=".geojson,.json,.zip,.gpkg"
                      listType="text"
                      maxCount={1}
                    >
                      <Button icon={<UploadOutlined />}>Select Labels File</Button>
                    </Upload>
                  </Form.Item>
                  <Form.Item
                    label={
                      <div>
                        <Tooltip title="Provide additional information about the labels, like the type of labels or the source of the labels.">
                          <InfoCircleOutlined className="mr-2" />
                        </Tooltip>
                        Labels Description
                      </div>
                    }
                    name="labels_description"
                    rules={[{ required: true, message: "Please provide additional information about the labels" }]}
                  >
                    <Input.TextArea
                      autoSize={{ minRows: 4, maxRows: 10 }}
                      placeholder="Example: Type - Forest Boundaries, Source - XYZ Survey 2023"
                    />
                  </Form.Item>
                </>
              </div>
            )}
          </div>
        </div>
      </Form>
    </Modal>
  );
};

export default UploadModal;
