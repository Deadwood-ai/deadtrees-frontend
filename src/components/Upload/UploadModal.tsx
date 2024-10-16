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
} from "antd";
import { UploadOutlined } from "@ant-design/icons";
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

  const { fileList, fileName, onFileChange, beforeUpload } = useFileUpload();
  const { session } = useAuth();
  const [pickerType, setPickerType] = useState(pickerTypeOptions[0]);

  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState("");
  const { authors } = useData();
  console.log("authors in upload modal", authors);
  const { updateNotification, showUploadingNotification, showSuccessNotification, showErrorNotification } = useUploadNotification(uploadKey, fileName);

  const handleUpload = async (values: IFormValues) => {

    showUploadingNotification(fileName);
    logger({
      user_id: session!.user.id,
      file_name: fileName,
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
              file_name: fileName,
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
            updateNotification(percent, "uploading", fileName);
          },
        });
      });

      console.log("resUpload", resUpload);
      setUploadStatus("processing");
      setUploadProgress(100);

      if (resUpload.id) {
        console.log("values", values);
        // Adding metadata
        const metadata = {
          dataset_id: resUpload.id.toString(),
          user_id: session!.user.id,
          name: uploadFile.name,
          license: values.license,
          platform: values.platform,
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
          file_name: fileName,
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
          file_name: fileName,
          process: "upload",
          level: "info",
          message: "Metadata added",
        });

        setUploadStatus("success");
        showSuccessNotification(fileName);

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
          file_name: fileName,
          process: "upload",
          level: "info",
          message: "Adding process",
        });
        const resAddProcess = await addProcess(resUpload.id, "all", session!.access_token, processCog);
        console.log("resAddProcess", resAddProcess);
        logger({
          user_id: session!.user.id,
          file_name: fileName,
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
        file_name: fileName,
        process: "upload",
        level: "error",
        message: `Upload error ${error}`,
      });
      setUploadStatus("error");
      showErrorNotification(fileName);
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
    >
      <Alert
        message="Upload Guidelines"
        description="Providing the correct acquisition date (year, year/month, or full date) is essential for the performance of our ML pipeline."
        type="info"
        showIcon
        style={{ marginBottom: '16px' }}
      />
      <Form
        layout="vertical"
        onFinish={onFormFinish}
        initialValues={{ platform: "drone", license: "CC BY" }}
      >
        <Form.Item
          label="Orthophoto (GeoTIFF format)"
          rules={[{ required: true, message: "Please upload a GeoTIFF file" }]}
        >
          <Upload
            fileList={fileList}
            onChange={onFileChange}
            beforeUpload={beforeUpload}
            listType="text"
            maxCount={1}
          >
            <Button icon={<UploadOutlined />}>Select GeoTIFF file</Button>
          </Upload>
        </Form.Item>
        <Form.Item
          rules={[{ required: true, message: "Please enter the authors" }]}
          label="Authors of the orthophoto"
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
          label="Acquisition Date (prioritize correctness over precision)"
          name="aquisition_date"
          rules={[{ required: true, message: "Please select a date" }]}
        >
          <PickerWithType pickerTypeOptions={pickerTypeOptions} pickerType={pickerType} setPickerType={setPickerType} />
        </Form.Item>
        <Form.Item label="Platform" name="platform">
          <Radio.Group>
            <Radio value="drone">Drone</Radio>
            <Radio value="airborne">Airborne</Radio>
            <Radio value="satellite">Satellite</Radio>
          </Radio.Group>
        </Form.Item>
        <Form.Item label="License" name="license">
          <Radio.Group>
            <Radio value="CC BY">CC BY</Radio>
            <Radio value="CC BY-SA">CC BY SA</Radio>
            <Radio value="CC BY-NC-SA">CC BY NC SA</Radio>
            <Radio value="MIT">MIT</Radio>
          </Radio.Group>
        </Form.Item>
        <Form.Item label="DOI" name="doi">
          <Input type="name" placeholder="DOI" />
        </Form.Item>
        <Form.Item label="Additional Information" name="additional_information">
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
      </Form>
    </Modal>
  );
};

export default UploadModal;
