import { useState } from "react";
import { Button } from "antd";
import UploadModal from "./UploadModal";
import { UploadOutlined } from "@ant-design/icons";

const UploadButton = () => {
  const [modals, setModals] = useState<{ key: string; isVisible: boolean }[]>([]);

  const showModal = () => {
    const newKey = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setModals([...modals, { key: newKey, isVisible: true }]);
  };

  const handleClose = (key: string) => {
    setModals(modals.filter((modal) => modal.key !== key));
  };

  return (
    <>
      <Button size="large" icon={<UploadOutlined />} type="primary" onClick={showModal}>
        Upload Data
      </Button>
      {modals.map((modal) => (
        <UploadModal
          key={modal.key}
          isVisible={modal.isVisible}
          onClose={() => handleClose(modal.key)}
          uploadKey={modal.key}
        />
      ))}
    </>
  );
};

export default UploadButton;
