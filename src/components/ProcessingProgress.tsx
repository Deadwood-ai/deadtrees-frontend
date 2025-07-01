import React from "react";
import { Tooltip, Tag } from "antd";
import { CheckCircleOutlined, SyncOutlined, CloseCircleOutlined } from "@ant-design/icons";
import { calculateProcessingProgress, DatasetProgress } from "../utils/processingSteps";

interface ProcessingProgressProps {
  dataset: DatasetProgress;
  showDetails?: boolean;
}

const ProcessingProgress: React.FC<ProcessingProgressProps> = ({ dataset, showDetails = true }) => {
  const progress = calculateProcessingProgress(dataset);

  // Handle error state
  if (dataset.has_error) {
    return (
      <Tooltip title="An error occurred during processing">
        <Tag icon={<CloseCircleOutlined />} color="error">
          Error
        </Tag>
      </Tooltip>
    );
  }

  // Handle complete state
  if (progress.isComplete) {
    return (
      <Tooltip title="Processing complete">
        <Tag icon={<CheckCircleOutlined />} color="success">
          Complete
        </Tag>
      </Tooltip>
    );
  }

  // Handle processing state - compact single row version
  const progressElement = (
    <div className="flex items-center gap-2">
      <span className="whitespace-nowrap text-sm font-medium">
        Step {progress.currentStep} of {progress.totalSteps}
      </span>
      <div className="h-1 w-16 overflow-hidden rounded-full bg-gray-200">
        <div
          className="h-full rounded-full bg-blue-500 transition-all duration-300"
          style={{ width: `${progress.percentage}%` }}
        />
      </div>
      <SyncOutlined spin />
    </div>
  );

  if (showDetails) {
    return (
      <Tooltip
        title={
          <div>
            <div className="font-medium">{progress.currentStepInfo.label}</div>
            <div className="text-xs opacity-90">{progress.currentStepInfo.description}</div>
          </div>
        }
      >
        {progressElement}
      </Tooltip>
    );
  }

  return progressElement;
};

export default ProcessingProgress;
