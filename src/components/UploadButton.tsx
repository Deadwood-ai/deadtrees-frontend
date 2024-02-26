// ClientSideComponent.js
import { useState } from "react";
import { Button } from "antd";
import UploadModal from "./UploadModal";
import { UploadOutlined } from "@ant-design/icons";

const UploadButton = () => {
  const [isModalVisible, setIsModalVisible] = useState(false);

  const showModal = () => setIsModalVisible(true);
  const handleClose = () => setIsModalVisible(false);

  return (
    <>
      <Button icon={<UploadOutlined />} type="primary" onClick={showModal}>
        Upload
      </Button>
      <UploadModal isVisible={isModalVisible} onClose={handleClose} />
    </>
  );
};

export default UploadButton;
