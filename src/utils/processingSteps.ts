export interface ProcessingStep {
  key: string;
  label: string;
  description: string;
}

export const PROCESSING_STEPS: ProcessingStep[] = [
  {
    key: "upload",
    label: "Uploading",
    description: "Uploading your data to the platform",
  },
  {
    key: "ortho",
    label: "Processing Image",
    description: "Processing and validating your orthophoto",
  },
  {
    key: "metadata",
    label: "Extracting Information",
    description: "Extracting geographic and technical metadata",
  },
  {
    key: "cog",
    label: "Optimizing Data",
    description: "Converting to optimized format for visualization",
  },
  {
    key: "deadwood",
    label: "AI Analysis",
    description: "Running AI analysis for deadwood detection",
  },
];

export interface DatasetProgress {
  is_upload_done?: boolean;
  is_ortho_done?: boolean;
  is_metadata_done?: boolean;
  is_cog_done?: boolean;
  is_deadwood_done?: boolean;
  has_error?: boolean;
  current_status?: string;
}

/**
 * Smart detection for when deadwood processing is actually complete
 * even when is_deadwood_done = false (no deadwood found case)
 */
function isDeadwoodProcessingComplete(dataset: DatasetProgress): boolean {
  // If is_deadwood_done is already true, processing is definitely complete
  if (dataset.is_deadwood_done) {
    return true;
  }

  // If all previous steps are done, status is idle, and no errors,
  // assume deadwood processing completed (just found no results)
  return !!(
    dataset.is_upload_done &&
    dataset.is_ortho_done &&
    dataset.is_metadata_done &&
    dataset.is_cog_done &&
    !dataset.has_error &&
    dataset.current_status === "idle"
  );
}

export function calculateProcessingProgress(dataset: DatasetProgress): {
  currentStep: number;
  totalSteps: number;
  percentage: number;
  currentStepInfo: ProcessingStep;
  isComplete: boolean;
} {
  const totalSteps = PROCESSING_STEPS.length;

  // If there's an error, return error state
  if (dataset.has_error) {
    return {
      currentStep: 0,
      totalSteps,
      percentage: 0,
      currentStepInfo: PROCESSING_STEPS[0],
      isComplete: false,
    };
  }

  // Check completion status for each step with smart deadwood detection
  const stepCompletions = [
    dataset.is_upload_done || false,
    dataset.is_ortho_done || false,
    dataset.is_metadata_done || false,
    dataset.is_cog_done || false,
    isDeadwoodProcessingComplete(dataset), // Smart deadwood completion check
  ];

  // Find the current step (first incomplete step)
  const currentStep = stepCompletions.findIndex((completed) => !completed);

  // If all steps are complete
  if (currentStep === -1) {
    return {
      currentStep: totalSteps,
      totalSteps,
      percentage: 100,
      currentStepInfo: PROCESSING_STEPS[totalSteps - 1],
      isComplete: true,
    };
  }

  // Calculate percentage based on completed steps
  const completedSteps = stepCompletions.filter(Boolean).length;
  const percentage = Math.round((completedSteps / totalSteps) * 100);

  return {
    currentStep: currentStep + 1, // 1-based for display
    totalSteps,
    percentage,
    currentStepInfo: PROCESSING_STEPS[currentStep],
    isComplete: false,
  };
}
