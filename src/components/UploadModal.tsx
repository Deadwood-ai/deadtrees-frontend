import { useState } from "react";
import { Button, Form, Radio, Space, Upload, message, Modal, DatePicker, Alert, Input, Select } from "antd";
import { UploadOutlined } from "@ant-design/icons";

import { useAuth } from "../state/AuthProvider";
import uploadFile from "../api/uploadFile";
import buildCog from "../api/buildCog";
import addMetadata from "../api/addMetadata";
import { Settings } from "../config";
import buildThumbnail from "../api/buildThumbnail";

const UploadModal = ({ isVisible, onClose }: { isVisible: boolean; onClose: () => void }) => {
  const pickerTypeOptions = ["date", "month", "year"];

  const [fileList, setFileList] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { session } = useAuth();
  const [pickerType, setPickerType] = useState(pickerTypeOptions[0]);

  // const [uploadProgress, setUploadProgress] = useState(0);

  const onFormFinish = async (values: { platform: string | Blob; license: string; aquisition_date: any }) => {
    setIsSubmitting(true);
    console.log("settings: ", Settings);
    try {
      const file = fileList[0]; // Assuming fileList is defined and non-empty

      if (!file) {
        throw new Error("No file selected for upload.");
      }
      // const formData = new FormData();
      // formData.append("file", file.originFileObj);

      const resUpload = await uploadFile(file, session!.access_token);
      // const resUpload = await fetch("https://data.deadtrees.earth/api/v1/datasets", {
      //   headers: {
      //     Authorization: `Bearer ${session!.access_token}`,
      //   },
      //   method: "POST",
      //   body: formData,
      // });
      console.log("resUpload", resUpload);
      onClose(); // Close the modal

      if (resUpload.id) {
        console.log("values", values);
        // Adding metadata
        const metadata = {
          dataset_id: resUpload.id.toString(),
          user_id: session!.user.id,
          name: file.name,
          license: values.license,
          platform: values.platform,
          aquisition_year: values.aquisition_date.year(),
          aquisition_month: pickerType !== "year" ? values.aquisition_date.month() + 1 : null,
          aquisition_day: pickerType === "date" ? values.aquisition_date.date() : null,
        };

        const resAddMetadata = await addMetadata(resUpload.id, metadata, session!.access_token);
        console.log("resAddMetadata", resAddMetadata);

        message.success("Upload successful");

        // Starting COG build
        const resBuildThumbnail = await buildThumbnail(resUpload.id, session!.access_token);
        console.log("resBuildThumbnail", resBuildThumbnail);
        
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
    setFileList(newFileList.slice(-1));

    // setFileList(newFileList);
    // console.log("newFileList", newFileList);
    // setUploadProgress(newFileList[0].percent || 0);
  };

  const beforeUpload = (file) => {
    setFileList([file]);
    // return Upload.LIST_IGNORE;
    return false;
  };
  // const handlePickerTypeChange = (value) => {
  //   setPickerType(value);
  // };

  const PickerWithType = ({ value, onChange }) => {
    return (
      <Space>
        <Select value={pickerType} onChange={(value) => setPickerType(value)}>
          {pickerTypeOptions.map((option) => (
            <Select.Option key={option} value={option}>
              {option}
            </Select.Option>
          ))}
        </Select>
        <DatePicker picker={pickerType} onChange={onChange} />
      </Space>
    );
  };
  // const handleCustomRequest = ({ file }) => {
  //   console.log("file", file);

  // Ensure the URL has the correct protocol
  // const url = "http://localhost:5173//profile";
  /// const url = "https://deadwood-d4a4b--update-deadwood-api-3yq2nb9e.web.app/profile";

  // axios
  //   .post(url, file, {
  //     onUploadProgress: (progressEvent) => {
  //       console.log(progressEvent);
  //       const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
  //       console.log(percentCompleted);
  //     },
  //     headers: {
  //       "Content-Type": file.type, // Set the content type based on the file type
  //     },
  //   })
  //   .then((response) => {
  //     console.log("Upload response:", response);
  //     message.success("Upload successful!");
  //   })
  //   .catch((error) => {
  //     console.error("Upload error:", error);
  //     message.error("Upload failed. Please try again.");
  //   });
  // };

  return (
    <Modal title="File Upload" open={isVisible} onCancel={onClose} footer={null}>
      <Form layout="vertical" onFinish={onFormFinish} initialValues={{ platform: "drone", license: "cc-by" }}>
        <Form.Item label="Orthophoto" rules={[{ required: true, message: "Please upload a file" }]}>
          <Upload fileList={fileList} onChange={onFileChange} beforeUpload={beforeUpload} listType="text" maxCount={1}>
            <Button icon={<UploadOutlined />}>Click to upload</Button>
          </Upload>
          {/* {uploadProgress < 100 && (
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
          )} */}
        </Form.Item>
        <Form.Item
          rules={[{ required: true, message: "Please enter the authors" }]}
          label="Authors of the orthophoto"
          name="author"
        >
          <Input className="w-96" type="name" placeholder="Jon Doe" />
        </Form.Item>
        <Form.Item
          label="Aquisitaion Date (Year, Y/M or Y/M/D if known)"
          // label={`Aquisition Date (${pickerType})`}
          name="aquisition_date"
          rules={[{ required: true, message: "Select a Date" }]}
          valuePropName="value"
          getValueFromEvent={(value) => value} // This ensures the selected date is captured by the form
        >
          {/* <DatePicker type="" /> */}
          <PickerWithType />
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
              {isSubmitting ? "Uploading..." : "Upload"}
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
