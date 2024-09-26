import { useEffect, useState } from "react";
import { Button, Form, Radio, Space, Upload, message, Modal, DatePicker, Alert, Input, Select } from "antd";
import { UploadOutlined } from "@ant-design/icons";

import { useAuth } from "../hooks/useAuthProvider";
import uploadFile from "../api/uploadFile";
import buildCog from "../api/buildCog";
import addMetadata from "../api/addMetadata";
import { Settings } from "../config";
import buildThumbnail from "../api/buildThumbnail";
import { ILicense, IPlatform } from "../types/dataset";
import type { UploadFile } from "antd";
import { useData } from "../hooks/useDataProvider";
import { useAuthorOptions } from "../hooks/useAuthorOptions";


const UploadModal = ({ isVisible, onClose }: { isVisible: boolean; onClose: () => void }) => {
  const pickerTypeOptions = ["date", "month", "year"];

  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { session } = useAuth();
  const data = useData();
  const [pickerType, setPickerType] = useState(pickerTypeOptions[0]);
  const options = useAuthorOptions();
  console.log("options", options);


  interface IFormValues {
    license: ILicense;
    platform: IPlatform;
    aquisition_date: Date;
    author: string;
    doi: string;
    additional_information: string;
  }

  const onFormFinish = async (values: IFormValues) => {
    setIsSubmitting(true);
    console.log("settings: ", Settings);
    try {
      const uploadFile = fileList[0];

      if (!uploadFile || !uploadFile.originFileObj) {
        throw new Error("No file selected for upload.");
      }

      // Execute custom request here
      const resUpload = await new Promise((resolve, reject) => {
        customRequest({
          file: uploadFile.originFileObj,
          onSuccess: (response) => {
            console.log("Upload success:", response);
            resolve(response);
          },
          onError: (error) => {
            console.error("Upload error:", error);
            reject(error);
          },
          onProgress: (event) => {
            console.log("Upload progress:", event);
          },
        });
      });

      console.log("resUpload", resUpload);
      onClose(); // Close the modal

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
          aquisition_month: pickerType !== "year" ? values.aquisition_date.month() + 1 : null,
          aquisition_day: pickerType === "date" ? values.aquisition_date.date() : null,
          authors: values.author.length > 1 ? values.author.join(' and ') : values.author[0],
          citation_doi: values.doi,
          additional_information: values.additional_information,
        };

        const resAddMetadata = await addMetadata(resUpload.id, metadata, session!.access_token);
        console.log("resAddMetadata", resAddMetadata);

        message.success("Upload successful");

        // Starting COG build
        // const resBuildThumbnail = await buildThumbnail(resUpload.id, session!.access_token);
        // console.log("resBuildThumbnail", resBuildThumbnail);

        // const resBuildCog = await buildCog(resUpload.id, session!.access_token);
        // console.log("resBuildCog", resBuildCog);
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
    console.log("newFileList", newFileList);
    setFileList(newFileList.slice(-1));
  };

  const beforeUpload = (file) => {
    setFileList([file]);
    return false;
  };

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
        <DatePicker
          picker={pickerType}
          onChange={(date) => {
            onChange(date);
          }}
          value={value}
        />
      </Space>
    );
  };

  const customRequest = (options) => {
    const { file, onProgress, onSuccess, onError } = options;
    const xhr = new XMLHttpRequest();

    xhr.open('POST', `${Settings.API_URL}/datasets`);
    xhr.setRequestHeader('Authorization', `Bearer ${session.access_token}`);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        onProgress({ percent });
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onSuccess(JSON.parse(xhr.response), xhr);
      } else {
        onError(new Error(xhr.statusText));
      }
    };

    xhr.onerror = () => {
      onError(new Error('Upload failed.'));
    };

    const formData = new FormData();
    formData.append('file', file);
    xhr.send(formData);
  };



  return (
    <Modal title="File Upload" open={isVisible} onCancel={onClose} footer={null}>
      <Form layout="vertical" onFinish={onFormFinish} initialValues={{ platform: "drone", license: "CC BY" }}>
        <Form.Item label="Orthophoto" rules={[{ required: true, message: "Please upload a file" }]}>
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
            <Select mode="tags" style={{ width: "100%" }} options={options} placeholder="Authors" />
          ) : (
            <Select mode="tags" style={{ width: "100%" }} placeholder="Authors" />
          )}
        </Form.Item>
        <Form.Item
          label="Aquisitaion Date (Year, Y/M or Y/M/D if known)"
          name="aquisition_date"
          rules={[{ required: true, message: "Please select a date" }]}
          valuePropName="value"
          getValueFromEvent={(value) => value}
        >
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
          <Input.TextArea autoSize={{ minRows: 2, maxRows: 5 }} placeholder="Additional Information for the Dataset" />
        </Form.Item>
        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={isSubmitting} disabled={fileList.length === 0}>
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
