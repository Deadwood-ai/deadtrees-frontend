import { useState } from "react";
import type { UploadFile, UploadProps } from "antd";
import type { RcFile } from "antd/es/upload";

const useLabelsFileUpload = () => {
  const [labelsFileList, setLabelsFileList] = useState<UploadFile[]>([]);
  const onLabelsFileChange: UploadProps["onChange"] = ({ fileList: newFileList }) => {
    setLabelsFileList(newFileList.slice(-1));
  };

  const beforeLabelsUpload = (file: RcFile) => {
    setLabelsFileList([file]);
    return false;
  };

  return { labelsFileList, onLabelsFileChange, beforeLabelsUpload };
};

export default useLabelsFileUpload;
