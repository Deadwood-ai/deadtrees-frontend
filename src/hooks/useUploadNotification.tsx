import { useRef } from 'react';
import { notification, Progress } from 'antd';

export const useUploadNotification = (uploadKey: string, fileName: string) => {
  const uploadKeyRef = useRef(uploadKey);

  const showNotification = (type: 'info' | 'success' | 'error', status: string, percent?: number) => {
    const config = {
      key: uploadKeyRef.current,
      message: status === 'uploading'
        ? (percent === 100 ? 'Processing data...' : 'Uploading')
        : status === 'success'
          ? 'Upload Successful'
          : 'Upload Failed',
      description: (
        <div>
          <div className="mt-2">{fileName}</div>
          {percent !== undefined && (
            <Progress
              percent={percent}
              size="small"
              status={status === "error" ? "exception" : undefined}
            />
          )}
        </div>
      ),
      duration: status === 'uploading' ? 0 : status === 'success' ? 2 : 4,
    };

    notification[type](config);
  };

  return {
    showUploadingNotification: () => showNotification('info', 'uploading', 0),
    updateUploadProgress: (percent: number) => showNotification('info', 'uploading', percent),
    showSuccessNotification: () => showNotification('success', 'success'),
    showErrorNotification: () => showNotification('error', 'error'),
  };
};
