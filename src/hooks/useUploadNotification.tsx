import { useRef } from 'react';
import { notification, Progress } from 'antd';

export const useUploadNotification = (uploadKey: string, fileName: string) => {
  const uploadKeyRef = useRef(uploadKey);

  const getNotificationContent = (percent: number, status: string) => {
    return {
      message: (
        <div>
          <div style={{ marginTop: '8px' }}>
            {status === "uploading"
              ? fileName
              : status === "processing"
                ? "Processing " + fileName
                : status === "success"
                  ? "Upload complete"
                  : "Error during upload"}
          </div>
          <Progress
            percent={percent}
            size="small"
            status={status === "error" ? "exception" : undefined}
          />
        </div>
      ),
    };
  };

  const updateNotification = (percent: number, status: string) => {
    const content = getNotificationContent(percent, status);

    notification.info({
      key: uploadKeyRef.current,
      // message: "File Upload " + fileName,
      message: "Uploading",
      description: content.message,
      duration: status === "success" ? 2 : 0,
    });
  };

  const showUploadingNotification = () => {
    const content = getNotificationContent(0, 'uploading');
    notification.info({
      key: uploadKeyRef.current,
      message: `Uploading`,
      description: content.message,
      duration: 0,
    });
  };

  const showSuccessNotification = (fileName: string) => {
    notification.success({
      key: uploadKeyRef.current,
      message: "Upload Successful",
      description: fileName,
      duration: 2,
    });
  };

  const showErrorNotification = (fileName: string) => {
    notification.error({
      key: uploadKeyRef.current,
      message: "Upload Failed",
      description: `An error occurred while uploading "${fileName}". Please try again.`,
      duration: 4,
    });
  };

  return {
    updateNotification,
    showUploadingNotification,
    showSuccessNotification,
    showErrorNotification,
  };
};
