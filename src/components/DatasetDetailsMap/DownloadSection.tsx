import { Button, Tooltip, Checkbox, Space, message } from "antd";
import { DownloadOutlined } from "@ant-design/icons";
import { Settings } from "../../config";
import type { IDataset } from "../../types/dataset";

interface DownloadSectionProps {
  dataset: IDataset;
  isFromGeonadir: boolean;
  labelsOnly: boolean;
  setLabelsOnly: (value: boolean) => void;
  hasLabels: boolean;
  isDownloading: boolean;
  currentDownloadId: string | null;
  startDownload: (id: string) => boolean;
  finishDownload: () => void;
}

export default function DownloadSection({
  dataset,
  isFromGeonadir,
  labelsOnly,
  setLabelsOnly,
  hasLabels,
  isDownloading,
  currentDownloadId,
  startDownload,
  finishDownload,
}: DownloadSectionProps) {
  const handleDownload = () => {
    if (isFromGeonadir && !labelsOnly) {
      message.warning("Dataset download restricted by data provider. You can download labels/predictions only.");
      return;
    }

    if (isDownloading) {
      if (currentDownloadId !== dataset.id.toString()) {
        message.info("A download is already in progress. Please wait.");
      }
      return;
    }

    const downloadStarted = startDownload(dataset.id.toString());
    if (!downloadStarted) return;

    const baseUrl = labelsOnly
      ? `${Settings.API_URL}/download/datasets/${dataset.id}/labels.gpkg`
      : `${Settings.API_URL}/download/datasets/${dataset.id}/dataset.zip`;

    const downloadMsg = message.loading({
      content: `Preparing ${labelsOnly ? "predictions" : "complete dataset"} for download...`,
      duration: 0,
    });

    fetch(baseUrl)
      .then((response) => response.json())
      .then((data) => {
        const jobId = data.job_id;
        const statusEndpoint = labelsOnly
          ? `${Settings.API_URL}/download/datasets/${dataset.id}/labels/status`
          : `${Settings.API_URL}/download/datasets/${jobId}/status`;
        const downloadEndpoint = labelsOnly
          ? `${Settings.API_URL}/download/datasets/${dataset.id}/labels/download`
          : `${Settings.API_URL}/download/datasets/${jobId}/download`;

        const checkStatus = () => {
          fetch(statusEndpoint)
            .then((response) => response.json())
            .then((statusData) => {
              if (statusData.status === "completed") {
                downloadMsg();
                finishDownload();
                window.location.href = downloadEndpoint;
                message.success({
                  content: `${labelsOnly ? "Predictions" : "Dataset"} download started!`,
                  duration: 5,
                });
              } else if (statusData.status === "failed") {
                downloadMsg();
                finishDownload();
                message.error({ content: "Download preparation failed. Please try again.", duration: 5 });
              } else {
                setTimeout(checkStatus, 1000);
              }
            })
            .catch((error) => {
              downloadMsg();
              finishDownload();
              message.error({ content: `Error checking download status: ${error.message}`, duration: 5 });
            });
        };

        checkStatus();
      })
      .catch((error) => {
        downloadMsg();
        finishDownload();
        message.error({ content: `Error initiating download: ${error.message}`, duration: 5 });
      });
  };

  const tooltipTitle = isDownloading
    ? currentDownloadId === dataset.id.toString()
      ? "This dataset is currently being prepared for download..."
      : "Another download is in progress. Only one download can be active at a time."
    : isFromGeonadir && !labelsOnly
      ? "Dataset download restricted by data provider. Labels/predictions are still available."
      : labelsOnly
        ? "Download vector data of tree mortality predictions (GPKG format)"
        : "Download both orthophoto and tree mortality predictions";

  return (
    <div className="shrink-0">
      <div className="rounded-2xl border border-gray-200/60 bg-white p-4 shadow-sm">
        <Space direction="vertical" className="w-full">
          {isDownloading && currentDownloadId !== dataset.id.toString() && (
            <div className="mb-2 text-center text-sm text-orange-500">Another download is in progress</div>
          )}
          <Tooltip title={tooltipTitle}>
            <Button
              type="primary"
              size="large"
              icon={<DownloadOutlined />}
              className="w-full shadow-sm"
              disabled={isDownloading || (isFromGeonadir && !labelsOnly)}
              loading={isDownloading && currentDownloadId === dataset.id.toString()}
              onClick={handleDownload}
            >
              {labelsOnly ? "Download Predictions (GPKG)" : "Download Complete Dataset"}
            </Button>
          </Tooltip>
          {hasLabels && (
            <Tooltip title="Only download the vector data containing tree mortality predictions, without the orthophoto">
              <Checkbox checked={labelsOnly} onChange={(e) => setLabelsOnly(e.target.checked)} className="mt-2 flex justify-center text-gray-600">
                Download predictions only
              </Checkbox>
            </Tooltip>
          )}
        </Space>
      </div>
    </div>
  );
}
