import { useRef, useState } from "react";
import { Form, message } from "antd";
import { IDataset } from "../../types/dataset";
import { DatasetDetailsMapProvider } from "../../hooks/useDatasetDetailsMapProvider";
import { useAuditDetailState } from "./useAuditDetailState";
import { Settings } from "../../config";
import { isGeonadirDataset } from "../../utils/datasetUtils";
import { DatasetSeasonInfo } from "../../hooks/useSeasonPrompt";
import EditingSidebar from "../DatasetDetailsMap/EditingSidebar";

// Sub-components
import AuditHeader from "./AuditHeader";
import { AuditFooterFormItem } from "./AuditFooter";
import {
	UserFlagsCard,
	GeoreferencingCard,
	AcquisitionDateCard,
	PhenologyCard,
	PredictionQualityCard,
	COGQualityCard,
	ThumbnailCard,
	AOICard,
	FinalAssessmentCard,
} from "./AuditStepCards";
import AuditMapWithControls, { AuditMapWithControlsHandle } from "./AuditMapWithControls";

interface DatasetAuditDetailProps {
	dataset: IDataset;
}

/**
 * DatasetAuditDetail - Main audit detail view
 * 
 * Refactored to use extracted components:
 * - AuditMapWithControls: Map + layer controls + correction review
 * - AuditStepCards: Individual audit form sections
 * - useAuditDetailState: All state management logic
 */
export default function DatasetAuditDetail({ dataset }: DatasetAuditDetailProps) {
	// Map ref for map controls (zoom, flash, refresh)
	const mapRef = useRef<AuditMapWithControlsHandle>(null);

	// Editing state (tracked from child map component)
	const [isPolygonEditing, setIsPolygonEditing] = useState(false);
	const [editingLayerType, setEditingLayerType] = useState<"deadwood" | "forest_cover" | null>(null);

	// Handle editing state changes from map component
	const handleEditingStateChange = (isEditing: boolean, layerType: "deadwood" | "forest_cover" | null) => {
		setIsPolygonEditing(isEditing);
		setEditingLayerType(layerType);
	};

	// Use the custom hook for all state and logic
	const {
		form,
		handleSubmit,
		handleSaveAndNext,
		handleCancel,
		handleMarkReviewedAndNext,
		isLoading,
		isSaving,
		isPending,
		isReviewed,
		auditLockError,
		isLockingAudit,
		navigateToNext,
		auditData,
		flags,
		isFlagsLoading,
		orthoMetadata,
		isOrthoLoading,
		phenologyData,
		isPhenologyLoading,
		updateFlagStatus,
		isUpdatingFlag,
		nextDatasetId,
		currentDatasetIndex,
		totalCount,
		isMarkingReviewed,
		hasAOI,
		handleAOIChange,
		aoiToolbarState,
		setAoiToolbarState,
		isDownloading,
		startDownload,
		finishDownload,
		currentDownloadId,
		copyPromptWithImage,
	} = useAuditDetailState({ dataset });

	// Generate thumbnail URL
	const thumbnailUrl = dataset.thumbnail_path ? `${Settings.THUMBNAIL_URL}${dataset.thumbnail_path}` : null;

	// Handle season prompt copy
	const handleCopySeasonPrompt = () => {
		if (!thumbnailUrl) {
			message.warning("No thumbnail available for prompt");
			return;
		}
		const seasonInfo: DatasetSeasonInfo = {
			country: dataset.admin_level_1 || undefined,
			admin_level_2: dataset.admin_level_2 || undefined,
			admin_level_3: dataset.admin_level_3 || undefined,
			biome_name: dataset.biome_name || undefined,
			acquisition_date: dataset.aquisition_year
				? `${dataset.aquisition_year}-${dataset.aquisition_month || "01"}-${dataset.aquisition_day || "01"}`
				: undefined,
		};
		copyPromptWithImage(seasonInfo, thumbnailUrl);
	};

	// Handle orthophoto download
	const handleStartDownload = (ds: IDataset) => {
		if (isGeonadirDataset(ds)) {
			message.warning("Download restricted by data provider.");
			return;
		}

		if (isDownloading) {
			if (currentDownloadId !== `${ds.id}-ortho`) {
				message.info("A download is already in progress. Please wait.");
			}
			return;
		}

		const downloadStarted = startDownload(`${ds.id}-ortho`);
		if (!downloadStarted) return;

		const baseUrl = `${Settings.API_URL}/download/datasets/${ds.id}/dataset.zip`;

		const downloadMsg = message.loading({
			content: "Preparing orthophoto for download...",
			duration: 0,
		});

		fetch(baseUrl)
			.then((response) => response.json())
			.then((data) => {
				const jobId = data.job_id;

				const checkStatus = () => {
					fetch(`${Settings.API_URL}/download/job/${jobId}`)
						.then((response) => response.json())
						.then((statusData) => {
							if (statusData.status === "complete" && statusData.download_url) {
								downloadMsg();
								window.location.href = statusData.download_url;
								message.success("Download started!");
								finishDownload();
							} else if (statusData.status === "error") {
								downloadMsg();
								message.error(`Download failed: ${statusData.error || "Unknown error"}`);
								finishDownload();
							} else {
								setTimeout(checkStatus, 2000);
							}
						})
						.catch(() => {
							downloadMsg();
							message.error("Failed to check download status");
							finishDownload();
						});
				};

				checkStatus();
			})
			.catch(() => {
				downloadMsg();
				message.error("Failed to initiate download");
				finishDownload();
			});
	};

	// Show loading state
	if (isLoading) {
		return (
			<div className="flex h-full w-full items-center justify-center">
				<div className="text-center">
					<div className="mb-2">Loading audit...</div>
					{isLockingAudit && <div className="text-sm text-gray-500">Securing audit lock...</div>}
				</div>
			</div>
		);
	}

	// Show error state
	if (auditLockError) {
		return (
			<div className="flex h-full w-full items-center justify-center">
				<div className="text-center">
					<div className="mb-2 text-red-600">{auditLockError}</div>
					<div className="text-sm text-gray-500">Redirecting to audit list...</div>
				</div>
			</div>
		);
	}

	return (
		<div className="flex h-full w-full overflow-hidden">
			{/* Sidebar */}
			<div className="flex w-96 flex-shrink-0 flex-col overflow-hidden border-r border-slate-200 bg-gray-50">
				{/* Header - hidden when editing */}
				{!isPolygonEditing && (
					<AuditHeader dataset={dataset} auditData={auditData} onCancel={handleCancel} />
				)}

				{/* Scrollable Content */}
				<div className="flex-1 overflow-y-auto p-2">
					{isPolygonEditing && editingLayerType ? (
						<EditingSidebar layerType={editingLayerType} />
					) : (
						<Form
							form={form}
							layout="vertical"
							onFinish={handleSubmit}
							disabled={isLoading}
							size="small"
							validateTrigger={["onChange", "onBlur"]}
						>
							<UserFlagsCard
								flags={flags}
								isFlagsLoading={isFlagsLoading}
								isUpdatingFlag={isUpdatingFlag}
								datasetId={dataset.id}
								onUpdateFlag={updateFlagStatus}
							/>

							<GeoreferencingCard />

							<AcquisitionDateCard dataset={dataset} />

							<PhenologyCard
								dataset={dataset}
								phenologyData={phenologyData}
								isPhenologyLoading={isPhenologyLoading}
								thumbnailUrl={thumbnailUrl}
								onCopySeasonPrompt={handleCopySeasonPrompt}
							/>

							<PredictionQualityCard />

							<COGQualityCard />

							<ThumbnailCard thumbnailUrl={thumbnailUrl} />

							<AOICard aoiToolbarState={aoiToolbarState} mapRef={mapRef} />

							<FinalAssessmentCard
								dataset={dataset}
								orthoMetadata={orthoMetadata}
								isOrthoLoading={isOrthoLoading}
								isDownloading={isDownloading}
								currentDownloadId={currentDownloadId}
								onStartDownload={handleStartDownload}
							/>

							{/* Footer Actions */}
							<div className="sticky bottom-0 z-10 -mx-2 border-t border-slate-200 bg-white p-3">
								<AuditFooterFormItem
									hasAOI={hasAOI}
									isPending={isPending}
									isReviewed={isReviewed}
									reviewedByEmail={auditData?.reviewed_by_email}
									nextDatasetId={nextDatasetId}
									currentDatasetIndex={currentDatasetIndex}
									totalCount={totalCount}
									isSaving={isSaving}
									navigateToNext={navigateToNext}
									isMarkingReviewed={isMarkingReviewed}
									onCancel={handleCancel}
									onSave={() => form.submit()}
									onSaveAndNext={handleSaveAndNext}
									onMarkReviewedAndNext={handleMarkReviewedAndNext}
								/>
							</div>
						</Form>
					)}
				</div>
			</div>

			{/* Map - wrapped in provider for layer controls */}
			<DatasetDetailsMapProvider>
				<AuditMapWithControls
					ref={mapRef}
					dataset={dataset}
					onAOIChange={handleAOIChange}
					onToolbarStateChange={setAoiToolbarState}
					onEditingStateChange={handleEditingStateChange}
				/>
			</DatasetDetailsMapProvider>
		</div>
	);
}
