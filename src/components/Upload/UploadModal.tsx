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
} from "antd";
import { InfoCircleOutlined, UploadOutlined } from "@ant-design/icons";
import { useAuth } from "../../hooks/useAuthProvider";
import addMetadata from "../../api/addMetadata";
import { ILicense, IPlatform } from "../../types/dataset";
import { useFileUpload } from "../../hooks/useFileUpload";
import { useUploadNotification } from "../../hooks/useUploadNotification";
import PickerWithType from "./PickerWithType";
import upload from "../../api/upload";
import { useData } from "../../hooks/useDataProvider";
import addProcess from "../../api/addProcess";
import logger from "../../utils/logger";
// New interfaces
interface IFormValues {
  license: ILicense;
  platform: IPlatform;
  spectral_properties: string;
  aquisition_date: any;
  author: string[];
  doi: string;
  additional_information: string;
}

interface UploadModalProps {
  isVisible: boolean;
  onClose: () => void;
  uploadKey: string;
}

const UploadModal: React.FC<UploadModalProps> = ({ isVisible, onClose, uploadKey }) => {
  const pickerTypeOptions = ["date", "month", "year"];

  const { fileList, fileName, fileNameFull, onFileChange, beforeUpload } = useFileUpload();
  const { session } = useAuth();
  const [pickerType, setPickerType] = useState(pickerTypeOptions[0]);

  const [uploadProgress, setUploadProgress] = useState(0);
  // const [uploadStatus, setUploadStatus] = useState("");
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
        upload({
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
      // setUploadStatus("processing");
      // setUploadProgress(100);

      if (resUpload.id) {
        console.log("values", values);
        // Adding metadata
        const metadata = {
          dataset_id: resUpload.id.toString(),
          user_id: session!.user.id,
          name: uploadFile.name,
          license: values.license,
          platform: values.platform,
          spectral_properties: values.spectral_properties,
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
          session!.access_token
        );
        console.log("resAddMetadata", resAddMetadata);
        logger({
          user_id: session!.user.id,
          file_name: fileNameFull,
          process: "upload",
          level: "info",
          message: "Metadata added",
        });

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
        const resAddProcess = await addProcess(resUpload.id, "all", session!.access_token, processCog);
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
      title="File Upload"
      open={isVisible}
      onCancel={onClose}
      footer={null}
      maskClosable={false}
      width={1200}
    // width="100%"
    >
      <Form
        layout="vertical"
        onFinish={onFormFinish}
        initialValues={{ platform: "drone", data_access: "public", spectral_properties: "RGB" }}
        // className="space-y-4" // Add vertical spacing between form items
        variant="filled"
      >
        <div className="flex justify-center space-x-16"> {/* Center the content */}

          <div className="w-full max-w-md"> {/* Limit the form width */}
            <Typography.Title level={4}>Orthophoto</Typography.Title>
            <Form.Item
              // label="Orthophoto (GeoTIFF format)"
              label={
                <div>
                  <Tooltip title="Upload an orthophoto in GeoTIFF format. This georeferenced image is essential for our analysis.">
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
              // label="Authors of the orthophoto"
              label={
                <div>
                  <Tooltip title="Select or add authors of the orthophoto. You can choose existing authors or type new names to add them.">
                    <InfoCircleOutlined className="mr-2" />
                  </Tooltip>
                  Authors of the orthophoto
                </div>
              }
              name="author"
            >
              {authors?.at(0)?.label ? (
                <Select
                  mode="tags"
                  style={{ width: "100%" }}
                  options={authors}
                  placeholder="Authors"
                />
              ) : (
                <Select mode="tags" style={{ width: "100%" }} placeholder="Authors" />
              )}
            </Form.Item>
            <Form.Item
              // label="Acquisition Date (prioritize correctness over precision)"
              label={
                <div>
                  <Tooltip title="Specify the orthophoto's acquisition date as accurately as possible. This information is crucial for temporal analysis and model training. If uncertain about the exact date, provide the most precise timeframe you're confident about (e.g., month or year).">
                    <InfoCircleOutlined className="mr-2" />
                  </Tooltip>
                  Acquisition Date
                </div>
              }
              name="aquisition_date"
              rules={[{ required: true, message: "Please select a date" }]}
            >
              <PickerWithType pickerTypeOptions={pickerTypeOptions} pickerType={pickerType} setPickerType={setPickerType} />
            </Form.Item>
            <Divider />
            <Form.Item label={
              <div>
                <Tooltip title="Select the platform used to acquire the orthophoto.">
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
            <Form.Item label={
              <div>
                <Tooltip title="Select the spectral properties of the orthophoto. Either RGB or NIRRGB.">
                  <InfoCircleOutlined className="mr-2" />
                </Tooltip>
                Spectral Properties
              </div>
            } name="spectral_properties">
              <Radio.Group>
                <Radio value="RGB">RGB</Radio>
                <Radio value="NIRRGB">NIRRGB</Radio>
              </Radio.Group>
            </Form.Item>
            <Form.Item
              label={
                <div>
                  <Tooltip title="Public: Data is fully accessible and downloadable. View-Only: Data is visible but not downloadable. Private: Data is not accessible. Note: All data is used for model training.">
                    <InfoCircleOutlined className="mr-2" />
                  </Tooltip>
                  Data Access
                </div>
              } name="data_access">
              <Radio.Group>
                <Radio value="public">Public</Radio>
                <Radio value="viewonly">View Only</Radio>
                <Radio value="private">Private</Radio>
              </Radio.Group>
            </Form.Item>
            <Divider />
            <Form.Item
              label={
                <div>
                  <Tooltip title="Enter the DOI of a related publication.">
                    <InfoCircleOutlined className="mr-2" />
                  </Tooltip>
                  DOI
                </div>
              } name="doi">
              <Input type="name" placeholder="DOI" />
            </Form.Item>
            <Form.Item
              label={
                <div>
                  <Tooltip title="Provide any additional information about the orthophoto.">
                    <InfoCircleOutlined className="mr-2" />
                  </Tooltip>
                  Additional Information
                </div>
              } name="additional_information">
              <Input.TextArea
                autoSize={{ minRows: 2, maxRows: 5 }}
                placeholder="Additional Information for the Dataset"
              />
            </Form.Item>
            <Form.Item>
              <Space>
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
          <div className={`${enableLabelUpload ? ' w-full max-w-md' : ''}`}>
            <Form.Item>
              <Checkbox
                checked={enableLabelUpload}
                onChange={(e) => setEnableLabelUpload(e.target.checked)}
              >
                Enable Label Upload
              </Checkbox>
            </Form.Item>

            {enableLabelUpload && (
              <div className="w-full pt-2">
                <>
                  <Form.Item
                    label={
                      <div>
                        <Tooltip title="Upload a labels file (e.g., GeoJSON) associated with your orthophoto.">
                          <InfoCircleOutlined className="mr-2" />
                        </Tooltip>
                        Labels File (GeoJSON)
                      </div>
                    }
                    name="labels_file"
                    rules={[{ required: true, message: "Please upload a labels file" }]}
                  >
                    <Upload
                      // fileList={labelsFileList}
                      // onChange={onLabelsFileChange}
                      // beforeUpload={beforeLabelsUpload}
                      accept=".geojson,.json"
                      listType="text"
                      maxCount={1}
                    >
                      <Button icon={<UploadOutlined />}>Select Labels File</Button>
                    </Upload>
                  </Form.Item>
                  <Form.Item
                    label={
                      <div>
                        <Tooltip title="Provide additional information about the labels.">
                          <InfoCircleOutlined className="mr-2" />
                        </Tooltip>
                        Labels Description
                      </div>
                    }
                    name="labels_description"
                  >
                    <Input.TextArea
                      autoSize={{ minRows: 4, maxRows: 10 }}
                      placeholder="Additional information about the labels"
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
