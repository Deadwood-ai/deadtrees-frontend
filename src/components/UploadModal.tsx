// UploadModal.js

import { useState } from "react";
import {
  Button,
  Form,
  Radio,
  Space,
  Upload,
  message,
  Modal,
  DatePicker,
  Alert,
} from "antd";
import { UploadOutlined } from "@ant-design/icons";

import { useAuth } from "../state/AuthProvider";

const UploadModal = ({
  isVisible,
  onClose,
}: {
  isVisible: boolean;
  onClose: () => void;
}) => {
  const [fileList, setFileList] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { session } = useAuth();

  const onFormFinish = async (values: { platform: string | Blob }) => {
    setIsSubmitting(true);
    const formData = new FormData();
    if (fileList.length > 0) {
      const file = fileList[0] as any; // Add type assertion to any
      formData.append("file", file.originFileObj);
    }
    formData.append("platform", values.platform);
    formData.append("aquisition_date", values.aquisition_date.toISOString());
    formData.append("license", values.license);
    try {
      const response = await fetch(
        "https://data.deadtrees.earth/api/dev/upload",
        {
          headers: {
            Authorization: `Bearer ${session!.access_token}`,
          },
          method: "POST",
          body: formData,
        },
      );
      if (response.ok) {
        message.success("Upload successful");
        console.log(response);
        onClose(); // Invoke the onClose callback to close the modal
      } else {
        message.error("Upload failed");
      }
    } catch (error) {
      console.error("Upload error:", error);
      message.error("Upload failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const onFileChange = ({ fileList: newFileList }) => {
    setFileList(newFileList.slice(-1));
  };

  const beforeUpload = (file) => {
    setFileList([file]);
    return false;
  };

  return (
    <Modal
      title="File Upload"
      open={isVisible}
      onCancel={onClose}
      footer={null}
    >
      <Form
        layout="vertical"
        onFinish={onFormFinish}
        initialValues={{ platform: "drone", license: "cc-by" }}
      >
        <Form.Item
          label="File"
          name="file"
          rules={[{ required: true, message: "Please upload a file" }]}
        >
          <Upload
            fileList={fileList}
            onChange={onFileChange}
            beforeUpload={beforeUpload}
            listType="text"
            maxCount={1}
          >
            <Button icon={<UploadOutlined />}>Click to upload</Button>
          </Upload>
        </Form.Item>
        <Form.Item
          label="Aquisitaion Date"
          name="aquisition_date"
          rules={[{ required: true, message: "Select a Date" }]}
        >
          <DatePicker />
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
            <Radio value="cc-by">CC BY</Radio>
            <Radio value="cc-by-sa">CC BY SA</Radio>
          </Radio.Group>
        </Form.Item>
        <Form.Item>
          <Space>
            <Button
              type="primary"
              disabled
              htmlType="submit"
              loading={isSubmitting}
            >
              Submit
            </Button>
            <Button type="default" onClick={onClose}>
              Cancel
            </Button>
          </Space>
        </Form.Item>
      </Form>
      <Alert
        message="Upload is is available soon!"
        description={
          <>
            The upload is not possible yet. It will be available soon. If you
            have any questions, please{" "}
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
