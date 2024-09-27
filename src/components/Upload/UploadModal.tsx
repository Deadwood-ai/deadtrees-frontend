import { useState } from "react";
import {
  Button,
  Form,
  Radio,
  Space,
  Upload,
  Modal,
  DatePicker,
  Alert,
  Input,
  Select,
} from "antd";
import { UploadOutlined } from "@ant-design/icons";
import { useAuth } from "../../hooks/useAuthProvider";
import addMetadata from "../../api/addMetadata";
import { Settings } from "../../config";
import { ILicense, IPlatform } from "../../types/dataset";
import { useAuthorOptions } from "../../hooks/useAuthorOptions";
import { useFileUpload } from "../../hooks/useFileUpload";
import { useUploadNotification } from "../../hooks/useUploadNotification";
import PickerWithType from "./PickerWithType";
import upload from "../../api/upload";
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
  const options = useAuthorOptions();

  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState("");
  const { updateNotification, showUploadingNotification, showSuccessNotification, showErrorNotification } = useUploadNotification(uploadKey, fileName);

  const handleUpload = async (values: IFormValues) => {
    setUploadStatus("uploading");
    setUploadProgress(0);

    showUploadingNotification(fileName);

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

        const resAddMetadata = await addMetadata(
          resUpload.id,
          metadata,
          session!.access_token
        );
        console.log("resAddMetadata", resAddMetadata);

        setUploadStatus("success");
        showSuccessNotification(fileName);

        // Starting COG build (uncomment if needed)
        // const resBuildThumbnail = await buildThumbnail(resUpload.id, session!.access_token);
        // console.log("resBuildThumbnail", resBuildThumbnail);

        // const resBuildCog = await buildCog(resUpload.id, session!.access_token);
        // console.log("resBuildCog", resBuildCog);
      } else {
        throw new Error("Upload failed to return an ID.");
      }
    } catch (error) {
      console.error("Upload error:", error);
      setUploadStatus("error");
      showErrorNotification(fileName);
    }
  };

  const onFormFinish = (values: IFormValues) => {
    onClose(); // Close the modal immediately
    handleUpload(values); // Start the upload process
  };


  // const customRequest = (options) => {
  //   const { file, onProgress, onSuccess, onError, uploadId } = options;
  //   const CHUNK_SIZE = 50 * 1024 * 1024; // 50 MB
  //   const chunks = Math.ceil(file.size / CHUNK_SIZE);
  //   let currentChunk = 0;

  //   const uploadStartTime = Date.now(); // Set the upload start time

  //   const uploadChunk = (start) => {
  //     const end = Math.min(start + CHUNK_SIZE, file.size);
  //     const chunk = file.slice(start, end);
  //     const copyTime = Math.round((Date.now() - uploadStartTime) / 1000); // Convert to seconds

  //     const formData = new FormData();
  //     formData.append("file", chunk, file.name);
  //     formData.append("chunk", currentChunk.toString());
  //     formData.append("chunks", chunks.toString());
  //     formData.append("filename", file.name);
  //     formData.append("upload_id", uploadId);
  //     formData.append("copy_time", copyTime.toString());

  //     const xhr = new XMLHttpRequest();
  //     xhr.open("POST", `${Settings.API_URL}/datasets/chunk`);
  //     xhr.setRequestHeader("Authorization", `Bearer ${session.access_token}`);

  //     xhr.upload.onprogress = (event) => {
  //       if (event.lengthComputable) {
  //         const percentComplete = Math.round(
  //           ((currentChunk * CHUNK_SIZE + event.loaded) / file.size) * 100
  //         );
  //         onProgress({ percent: percentComplete });
  //       }
  //     };

  //     xhr.onload = () => {
  //       if (xhr.status >= 200 && xhr.status < 300) {
  //         currentChunk++;
  //         if (currentChunk < chunks) {
  //           uploadChunk(currentChunk * CHUNK_SIZE);
  //         } else {
  //           onSuccess(JSON.parse(xhr.response));
  //         }
  //       } else {
  //         onError(new Error(xhr.statusText));
  //       }
  //     };

  //     xhr.onerror = () => {
  //       onError(new Error("Upload failed."));
  //     };

  //     xhr.send(formData);
  //   };

  //   uploadChunk(0);
  // };

  return (
    <Modal title="File Upload" open={isVisible} onCancel={onClose} footer={null}>
      <Form
        layout="vertical"
        onFinish={onFormFinish}
        initialValues={{ platform: "drone", license: "CC BY" }}
      >
        <Form.Item
          label="Orthophoto"
          rules={[{ required: true, message: "Please upload a file" }]}
        >
          <Upload
            fileList={fileList}
            onChange={onFileChange}
            beforeUpload={beforeUpload}
            listType="text"
            maxCount={1}
          >
            <Button icon={<UploadOutlined />}>Select file</Button>
          </Upload>
        </Form.Item>
        <Form.Item
          rules={[{ required: true, message: "Please enter the authors" }]}
          label="Authors of the orthophoto"
          name="author"
        >
          {options.at(0)?.label ? (
            <Select
              mode="tags"
              style={{ width: "100%" }}
              options={options}
              placeholder="Authors"
            />
          ) : (
            <Select mode="tags" style={{ width: "100%" }} placeholder="Authors" />
          )}
        </Form.Item>
        <Form.Item
          label="Acquisition Date (Year, Y/M or Y/M/D if known)"
          name="aquisition_date"
          rules={[{ required: true, message: "Please select a date" }]}
          valuePropName="value"
          getValueFromEvent={(value) => value}
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
      <Alert
        message="Label Upload Coming Soon!"
        description={
          <>
            Label upload is not currently supported, but will be available soon. If you have
            questions, please{" "}
            <a href="mailto:teja.kattenborn@geosense.uni-freiburg.de;janusch.jehle@felis.uni-freiburg.de;clemens.mosig@uni-leipzig.de?subject=deadtrees.earth collaboration">
              contact{" "}
            </a>{" "}
            us.
          </>
        }
        type="info"
        showIcon
      />
    </Modal>
  );
};

export default UploadModal;
