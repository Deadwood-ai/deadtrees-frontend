import { useRef, forwardRef, useImperativeHandle, useState, useEffect } from "react";
import { Form, message, Tag, Tooltip } from "antd";
import { EditOutlined, CheckCircleOutlined } from "@ant-design/icons";
import { IDataset } from "../../types/dataset";
import DatasetDetailsMap, { DatasetDetailsMapHandle, AOIToolbarState } from "../DatasetDetailsMap/DatasetDetailsMap";
import { DatasetDetailsMapProvider, useDatasetDetailsMap } from "../../hooks/useDatasetDetailsMapProvider";
import DatasetLayerControlPanel from "../DatasetDetailsMap/DatasetLayerControlPanel";
import { useAuditDetailState } from "./useAuditDetailState";
import { Settings } from "../../config";
import { isGeonadirDataset } from "../../utils/datasetUtils";
import { DatasetSeasonInfo } from "../../hooks/useSeasonPrompt";
import { useDatasetLabelTypes } from "../../hooks/useDatasetLabelTypes";
import { useApproveCorrection, useRevertCorrection } from "../../hooks/useSaveCorrections";
import { useCorrectionStats, useCorrectionContributors, usePendingCorrectionLocations } from "../../hooks/usePendingCorrections";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../hooks/useAuthProvider";
import { useDatasetEditing } from "../../hooks/useDatasetEditing";
import EditorToolbar from "../PolygonEditor/EditorToolbar";
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

// Inner map component that uses context for layer controls
interface AuditMapWithControlsProps {
	dataset: IDataset;
	onAOIChange: (geometry: GeoJSON.MultiPolygon | GeoJSON.Polygon | null) => void;
	onToolbarStateChange: (state: AOIToolbarState) => void;
	onEditingStateChange?: (isEditing: boolean, layerType: "deadwood" | "forest_cover" | null) => void;
}

const AuditMapWithControls = forwardRef<DatasetDetailsMapHandle, AuditMapWithControlsProps>(
	({ dataset, onAOIChange, onToolbarStateChange, onEditingStateChange }, ref) => {
		// Internal ref to access map methods (for refreshing after approve/revert)
		const internalMapRef = useRef<DatasetDetailsMapHandle>(null);

		// Forward the ref while keeping internal access
		useImperativeHandle(ref, () => internalMapRef.current!, []);

		// Get current user for editing
		const { user } = useAuth();

		// Get layer control state from context
		const {
			layerControl,
			setMapStyle,
			setShowForestCover,
			setShowDeadwood,
			setShowDroneImagery,
			setShowAOI,
			setLayerOpacity,
		} = useDatasetDetailsMap();

		// Check if labels exist
		const { deadwood, forestCover } = useDatasetLabelTypes({
			datasetId: dataset?.id,
			enabled: !!dataset?.id,
		});

		const hasDeadwood = !!deadwood.data?.id;
		const hasForestCover = !!forestCover.data?.id && !!dataset.is_forest_cover_done;

		// Editing hook for polygon corrections
		const editing = useDatasetEditing({ datasetId: dataset?.id, user });
		const { isEditing, editingLayerType, editor, ai, refreshKey } = editing;

		// Notify parent of editing state changes via useEffect (not during render)
		useEffect(() => {
			onEditingStateChange?.(isEditing, editingLayerType);
		}, [isEditing, editingLayerType, onEditingStateChange]);

		// Correction approval/revert mutations
		const queryClient = useQueryClient();
		const { mutateAsync: approveCorrection } = useApproveCorrection();
		const { mutateAsync: revertCorrection } = useRevertCorrection();

		// Handlers for correction review
		const handleApproveCorrection = async (correctionId: number, _geometryId: number) => {
			try {
				const result = await approveCorrection(correctionId);
				if (result) {
					message.success("Correction approved");
					// Invalidate queries to update counts
					queryClient.invalidateQueries({ queryKey: ["pendingCorrections"] });
					queryClient.invalidateQueries({ queryKey: ["correctionStats", dataset?.id] });
					queryClient.invalidateQueries({ queryKey: ["correctionContributors", dataset?.id] });
					// Refresh MVT tiles to show updated state
					internalMapRef.current?.refreshVectorLayers();
				} else {
					message.error("Failed to approve correction");
				}
			} catch (error) {
				console.error("Error approving correction:", error);
				message.error("Failed to approve correction");
			}
		};

		const handleRevertCorrection = async (correctionId: number, _geometryId: number) => {
			try {
				const result = await revertCorrection(correctionId);
				if (result) {
					message.success("Correction reverted");
					// Invalidate queries to update counts
					queryClient.invalidateQueries({ queryKey: ["pendingCorrections"] });
					queryClient.invalidateQueries({ queryKey: ["correctionStats", dataset?.id] });
					queryClient.invalidateQueries({ queryKey: ["correctionContributors", dataset?.id] });
					// Refresh MVT tiles to show updated state
					internalMapRef.current?.refreshVectorLayers();
				} else {
					message.error("Failed to revert correction");
				}
			} catch (error) {
				console.error("Error reverting correction:", error);
				message.error("Failed to revert correction");
			}
		};

		// Correction stats for this dataset
		const { data: correctionStats } = useCorrectionStats(dataset?.id);
		const { data: contributors } = useCorrectionContributors(dataset?.id);
		const { data: pendingLocations } = usePendingCorrectionLocations(dataset?.id);

		// Calculate layer breakdown from pending locations
		const pendingDeadwood = pendingLocations?.filter(p => p.layerType === "deadwood").length ?? 0;
		const pendingForestCover = pendingLocations?.filter(p => p.layerType === "forest_cover").length ?? 0;

		// Flash and zoom to all pending corrections
		const handleFlashPending = (layerType?: "deadwood" | "forest_cover") => {
			if (!pendingLocations || pendingLocations.length === 0) return;

			const filtered = layerType
				? pendingLocations.filter(p => p.layerType === layerType)
				: pendingLocations;

			if (filtered.length === 0) return;

			// Calculate bounding box of all pending corrections
			const minLon = Math.min(...filtered.map(p => p.minLon));
			const minLat = Math.min(...filtered.map(p => p.minLat));
			const maxLon = Math.max(...filtered.map(p => p.maxLon));
			const maxLat = Math.max(...filtered.map(p => p.maxLat));

			// Zoom to extent
			internalMapRef.current?.zoomToExtent(minLon, minLat, maxLon, maxLat, 50);

			// Flash each location
			filtered.forEach((loc, index) => {
				setTimeout(() => {
					internalMapRef.current?.flashLocation(loc.centroidLon, loc.centroidLat);
				}, index * 200); // Stagger flashes
			});
		};

		return (
			<div className="relative h-full w-full flex-1">
				{/* Correction Stats Indicator - top left (hidden when editing) */}
				{!isEditing && correctionStats && correctionStats.total > 0 && (
					<div className="absolute left-3 top-3 z-50 pointer-events-auto">
						<div className="flex flex-col gap-1.5 rounded-lg bg-white/95 p-2.5 shadow-lg backdrop-blur-sm">
							<div className="text-xs font-medium text-gray-600 mb-1">Edit Review Progress</div>
							{correctionStats.pending > 0 ? (
								<>
									<Tooltip title="Click to zoom and flash all pending edits">
										<Tag
											icon={<EditOutlined />}
											color="orange"
											className="m-0 cursor-pointer hover:opacity-80"
											onClick={() => handleFlashPending()}
										>
											{correctionStats.pending} pending
										</Tag>
									</Tooltip>
									{/* Layer breakdown */}
									<div className="flex flex-col gap-1 ml-2">
										{pendingDeadwood > 0 && (
											<Tooltip title="Click to show pending deadwood edits">
												<div
													className="flex items-center gap-1.5 text-[10px] text-gray-600 cursor-pointer hover:text-orange-600"
													onClick={() => handleFlashPending("deadwood")}
												>
													<span className="h-2 w-2 rounded-sm bg-[#FFB31C]" />
													<span>{pendingDeadwood} deadwood</span>
												</div>
											</Tooltip>
										)}
										{pendingForestCover > 0 && (
											<Tooltip title="Click to show pending forest cover edits">
												<div
													className="flex items-center gap-1.5 text-[10px] text-gray-600 cursor-pointer hover:text-green-600"
													onClick={() => handleFlashPending("forest_cover")}
												>
													<span className="h-2 w-2 rounded-sm bg-green-500" />
													<span>{pendingForestCover} forest cover</span>
												</div>
											</Tooltip>
										)}
									</div>
								</>
							) : (
								<Tooltip title="All edits have been reviewed">
									<Tag
										icon={<CheckCircleOutlined />}
										color="green"
										className="m-0"
									>
										All reviewed
									</Tag>
								</Tooltip>
							)}
							{correctionStats.approved > 0 && (
								<Tooltip title={`${correctionStats.approved} edits approved`}>
									<Tag color="green" className="m-0">
										{correctionStats.approved} approved
									</Tag>
								</Tooltip>
							)}
							{correctionStats.rejected > 0 && (
								<Tooltip title={`${correctionStats.rejected} edits reverted`}>
									<Tag color="default" className="m-0">
										{correctionStats.rejected} reverted
									</Tag>
								</Tooltip>
							)}
							{/* Contributors section */}
							{contributors && contributors.length > 0 && (
								<>
									<div className="border-t border-gray-200 mt-1.5 pt-1.5">
										<div className="text-[10px] text-gray-500 mb-1">Contributors:</div>
										{contributors.slice(0, 3).map((contributor, idx) => (
											<div key={idx} className="text-[10px] text-gray-600 truncate" title={contributor.email}>
												{contributor.email.split('@')[0]} ({contributor.count})
											</div>
										))}
										{contributors.length > 3 && (
											<div className="text-[10px] text-gray-400">
												+{contributors.length - 3} more
											</div>
										)}
									</div>
								</>
							)}
						</div>
					</div>
				)}

				{/* Layer Control Panel - hidden when editing */}
				{!isEditing && (
					<div className="absolute right-3 top-3 z-50 pointer-events-auto">
						<DatasetLayerControlPanel
							mapStyle={layerControl.mapStyle}
							onMapStyleChange={setMapStyle}
							showForestCover={layerControl.showForestCover}
							setShowForestCover={setShowForestCover}
							showDeadwood={layerControl.showDeadwood}
							setShowDeadwood={setShowDeadwood}
							showDroneImagery={layerControl.showDroneImagery}
							setShowDroneImagery={setShowDroneImagery}
							showAOI={layerControl.showAOI}
							setShowAOI={setShowAOI}
							hasForestCover={hasForestCover}
							hasDeadwood={hasDeadwood}
							hasAOI={true}
							opacity={layerControl.layerOpacity}
							setOpacity={setLayerOpacity}
							onReportClick={() => { }} // Not used in audit context
							onEditForestCover={hasForestCover ? () => editing.handleStartEditing("forest_cover") : undefined}
							onEditDeadwood={hasDeadwood ? () => editing.handleStartEditing("deadwood") : undefined}
							isLoggedIn={true}
						/>
					</div>
				)}

				{/* Editor Toolbar - visible when editing */}
				{isEditing && editingLayerType && (
					<EditorToolbar
						type={editingLayerType}
						isDrawing={editor.isDrawing}
						hasSelection={editor.selection.length > 0}
						selectionCount={editor.selection.length}
						isAIActive={ai.isActive}
						isAIProcessing={ai.isProcessing}
						onToggleDraw={() => editor.toggleDraw()}
						onCutHole={editor.cutHoleWithDrawn}
						onMerge={editor.mergeSelected}
						onClip={editor.clipSelected}
						onToggleAI={() => (ai.isActive ? ai.disable() : ai.enable())}
						onDeleteSelected={editor.deleteSelected}
						onUndo={editor.undo}
						canUndo={editor.canUndo}
						onSave={editing.handleSaveEdits}
						onCancel={editing.handleCancelEditing}
						position="top-right"
						title={`Editing ${editingLayerType === "deadwood" ? "Deadwood" : "Forest Cover"}`}
					/>
				)}

				{/* Map */}
				<DatasetDetailsMap
					ref={internalMapRef}
					data={dataset}
					isLoggedIn={true}
					enableAOIEditing={!isEditing} // Disable AOI editing while polygon editing
					onAOIChange={onAOIChange}
					onToolbarStateChange={onToolbarStateChange}
					canReviewCorrections={!isEditing}
					showAOI={layerControl.showAOI}
					onApproveCorrection={handleApproveCorrection}
					onRevertCorrection={handleRevertCorrection}
					showDeadwood={isEditing ? false : layerControl.showDeadwood}
					showForestCover={isEditing ? false : layerControl.showForestCover}
					showDroneImagery={layerControl.showDroneImagery}
					layerOpacity={layerControl.layerOpacity}
					onMapReady={editing.handleMapReady}
					onOrthoLayerReady={editing.handleOrthoLayerReady}
					onEditDeadwood={hasDeadwood ? () => editing.handleStartEditing("deadwood") : undefined}
					onEditForestCover={hasForestCover ? () => editing.handleStartEditing("forest_cover") : undefined}
					refreshKey={refreshKey}
				/>
			</div>
		);
	}
);

AuditMapWithControls.displayName = "AuditMapWithControls";

interface DatasetAuditDetailProps {
	dataset: IDataset;
}

export default function DatasetAuditDetail({ dataset }: DatasetAuditDetailProps) {
	// Map ref for AOI toolbar controls
	const mapRef = useRef<DatasetDetailsMapHandle>(null);

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

				{/* Scrollable Content - switch between audit form and editing sidebar */}
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
							{/* User Flags */}
							<UserFlagsCard
								flags={flags}
								isFlagsLoading={isFlagsLoading}
								isUpdatingFlag={isUpdatingFlag}
								datasetId={dataset.id}
								onUpdateFlag={updateFlagStatus}
							/>

							{/* Step 1: Georeferencing */}
							<GeoreferencingCard />

							{/* Step 2: Acquisition Date */}
							<AcquisitionDateCard dataset={dataset} />

							{/* Step 3: Phenology */}
							<PhenologyCard
								dataset={dataset}
								phenologyData={phenologyData}
								isPhenologyLoading={isPhenologyLoading}
								thumbnailUrl={thumbnailUrl}
								onCopySeasonPrompt={handleCopySeasonPrompt}
							/>

							{/* Step 4: Prediction Quality */}
							<PredictionQualityCard />

							{/* Step 5: COG Quality */}
							<COGQualityCard />

							{/* Step 6: Thumbnail */}
							<ThumbnailCard thumbnailUrl={thumbnailUrl} />

							{/* Step 7: AOI */}
							<AOICard aoiToolbarState={aoiToolbarState} mapRef={mapRef} />

							{/* Step 8: Final Assessment */}
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
