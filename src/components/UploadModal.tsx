// UploadModal.js

import { useState } from "react";
import { Button, Form, Radio, Space, Upload, message, Modal, DatePicker, Alert, Input } from "antd";
import { UploadOutlined } from "@ant-design/icons";

import { useAuth } from "../state/AuthProvider";
import uploadFile from "../api/uploadFile";
import buildCog from "../api/buildCog";
import addMetadata from "../api/addMetadata";
import axios from "axios";
import { set } from "ol/transform";

const UploadModal = ({ isVisible, onClose }: { isVisible: boolean; onClose: () => void }) => {
  const [fileList, setFileList] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { session } = useAuth();
  const [uploadProgress, setUploadProgress] = useState(0);

  const onFormFinish = async (values: { platform: string | Blob; license: string; aquisition_date: Date }) => {
    setIsSubmitting(true);

    try {
      const file = fileList[0]; // Assuming fileList is defined and non-empty

      if (!file) {
        throw new Error("No file selected for upload.");
      }

      const resUpload = await uploadFile(file, session!.access_token);
      console.log("resUpload", resUpload);
      onClose(); // Close the modal

      if (resUpload.id) {
        // Adding metadata
        const metadata = {
          dataset_id: resUpload.id.toString(),
          user_id: session!.user.id,
          name: file.name,
          license: values.license,
          platform: values.platform,
          aquisition_date: values.aquisition_date.toISOString(),
        };

        const resAddMetadata = await addMetadata(resUpload.id, metadata, session!.access_token);
        console.log("resAddMetadata", resAddMetadata);

        message.success("Upload successful");

        // Starting COG build
        const resBuildCog = await buildCog(resUpload.id, session!.access_token);
        console.log("resBuildCog", resBuildCog);
      } else {
        throw new Error("Upload failed to return an ID.");
      }
    } catch (error) {
      console.error("Upload error:", error);
      message.error("Upload failed");
      onClose(); // Close the modal
    } finally {
      setIsSubmitting(false);
    }
  };

  const onFileChange = ({ fileList: newFileList }) => {
    setFileList(newFileList);
    console.log("newFileList", newFileList);
    setUploadProgress(newFileList[0].percent || 0);
  };

  const beforeUpload = (file) => {
    setFileList([file]);
    return Upload.LIST_IGNORE;
  };
  const handleCustomRequest = ({ file }) => {
    console.log("file", file);

    // Ensure the URL has the correct protocol
    const url = "http://localhost:3000/profile";

    axios
      .post(url, file, {
        onUploadProgress: (progressEvent) => {
          console.log(progressEvent);
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          console.log(percentCompleted);
        },
        headers: {
          "Content-Type": file.type, // Set the content type based on the file type
        },
      })
      .then((response) => {
        console.log("Upload response:", response);
        message.success("Upload successful!");
      })
      .catch((error) => {
        console.error("Upload error:", error);
        message.error("Upload failed. Please try again.");
      });
  };

  return (
    <Modal title="File Upload" open={isVisible} onCancel={onClose} footer={null}>
      <Form layout="vertical" onFinish={onFormFinish} initialValues={{ platform: "drone", license: "cc-by" }}>
        <Form.Item label="File" rules={[{ required: true, message: "Please upload a file" }]}>
          {uploadProgress < 100 && (
            <Upload fileList={fileList} onChange={onFileChange} listType="text" maxCount={1}>
              <Button icon={<UploadOutlined />}>Click to upload</Button>
            </Upload>
          )}
          {uploadProgress === 100 && (
            <Upload
              fileList={[
                {
                  uid: "1",
                  name: fileList[0].name,
                  status: "done",
                  // url: "http://www.baidu.com/yyy.png",
                },
              ]}
              listType="text"
              onRemove={() => {
                setFileList([]);
                setUploadProgress(0);
              }}
              maxCount={1}
            >
              <Button icon={<UploadOutlined />}>uploaded {uploadProgress}</Button>
            </Upload>
          )}
        </Form.Item>
        <Form.Item rules={[{ required: true, message: "Please enter the authors" }]} label="Authors" name="author">
          <Input className="w-96" type="name" placeholder="Jon Doe" />
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
        <Form.Item label="DOI" name="doi">
          <Input type="name" placeholder="DOI" />
        </Form.Item>
        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={isSubmitting}>
              Submit
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
            Label upload is not currently supported, but will be available soon. If you have questions, please{" "}
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
