import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Form, message } from "antd";
import { IDataset } from "../../types/dataset";
import {
	useDatasetAudit,
	useSaveDatasetAudit,
	AuditFormValues,
	useSetAuditLock,
	useClearAuditLock,
	useOrthoMetadata,
	useMarkAsReviewed,
} from "../../hooks/useDatasetAudit";
import { useAuth } from "../../hooks/useAuthProvider";
import { useDownload } from "../../hooks/useDownloadProvider";
import { useAuditNavigationGuard } from "../../hooks/useAuditNavigationGuard";
import { useAuditNavigation } from "../../hooks/useAuditNavigation";
import { useDatasetFlags, useUpdateFlagStatus } from "../../hooks/useDatasetFlags";
import { usePhenologyData } from "../../hooks/usePhenologyData";
import { useSeasonPrompt, DatasetSeasonInfo } from "../../hooks/useSeasonPrompt";
import { AOIToolbarState } from "./DatasetAuditMap";

export interface UseAuditDetailStateProps {
	dataset: IDataset;
}

export function useAuditDetailState({ dataset }: UseAuditDetailStateProps) {
	const navigate = useNavigate();
	const [form] = Form.useForm<AuditFormValues>();
	const { user } = useAuth();

	// Download state
	const { isDownloading, startDownload, finishDownload, currentDownloadId } = useDownload();

	// AOI state
	const currentAOIGeometry = useRef<GeoJSON.MultiPolygon | GeoJSON.Polygon | null>(null);
	const [hasAOI, setHasAOI] = useState(false);
	const [isAOILoaded, setIsAOILoaded] = useState(false);

	// AOI toolbar state (reported from map component)
	const [aoiToolbarState, setAoiToolbarState] = useState<AOIToolbarState>({
		isDrawing: false,
		isEditing: false,
		hasAOI: false,
		isAOILoading: true,
		selectedFeatureForEdit: false,
		polygonCount: 0,
	});

	// Data hooks
	const { data: auditData, isLoading: isAuditLoading } = useDatasetAudit(dataset.id);
	const { data: flags = [], isLoading: isFlagsLoading } = useDatasetFlags(dataset.id);
	const { mutateAsync: updateFlagStatus, isPending: isUpdatingFlag } = useUpdateFlagStatus();
	const { mutateAsync: saveAudit, isPending: isSavingAudit } = useSaveDatasetAudit();
	const { mutateAsync: markAsReviewed, isPending: isMarkingReviewed } = useMarkAsReviewed();
	const { data: orthoMetadata, isLoading: isOrthoLoading } = useOrthoMetadata(dataset.id);
	const { data: phenologyData, isLoading: isPhenologyLoading } = usePhenologyData(dataset.id);

	// Navigation context
	const { getNextDatasetId, currentIndex, totalCount } = useAuditNavigation();

	// Audit lock mutations
	const { mutateAsync: setAuditLock } = useSetAuditLock();
	const { mutateAsync: clearAuditLock } = useClearAuditLock();

	// Season prompt
	const { copyPromptWithImage } = useSeasonPrompt();

	// Local state
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [auditLockError, setAuditLockError] = useState<string | null>(null);
	const [isLockingAudit, setIsLockingAudit] = useState(true);
	const [hasFormChanges, setHasFormChanges] = useState(false);
	const [navigateToNext, setNavigateToNext] = useState(false);

	// Navigation guard
	const { showExitConfirmation } = useAuditNavigationGuard({
		isActive: !auditLockError && !isSubmitting,
		onCleanup: async () => {
			if (!auditLockError) {
				await clearAuditLock(dataset.id);
			}
		},
		datasetId: dataset.id,
		hasFormChanges,
	});

	// Reset state and set audit lock when dataset changes
	useEffect(() => {
		setIsLockingAudit(true);
		setAuditLockError(null);
		setHasFormChanges(false);
		setHasAOI(false);
		setIsAOILoaded(false);
		currentAOIGeometry.current = null;
		form.resetFields();

		const lockAudit = async () => {
			try {
				await setAuditLock(dataset.id);
				setAuditLockError(null);
				setIsLockingAudit(false);
				setHasFormChanges(true);
			} catch (error) {
				console.error("Failed to set audit lock:", error);
				const errorMessage = error instanceof Error ? error.message : "Could not lock dataset for audit";
				setAuditLockError(errorMessage);
				setIsLockingAudit(false);
				message.error(errorMessage);
				setTimeout(() => navigate("/dataset-audit"), 2000);
			}
		};

		lockAudit();
	}, [dataset.id, setAuditLock, navigate, form]);

	// Set form values when audit data is loaded
	useEffect(() => {
		if (auditData) {
			const partial: Partial<AuditFormValues> = { ...auditData } as unknown as Partial<AuditFormValues>;
			const toDelete: (keyof Partial<AuditFormValues>)[] = ["audit_date"];
			toDelete.forEach((k) => delete (partial as Record<string, unknown>)[k as string]);
			form.setFieldsValue(partial);
		}
	}, [auditData, form]);

	// Track form changes
	useEffect(() => {
		const handleFormChange = () => setHasFormChanges(true);
		const formElement = document.querySelector(".ant-form");
		if (!formElement) return;
		formElement.addEventListener("change", handleFormChange);
		formElement.addEventListener("input", handleFormChange);
		return () => {
			formElement.removeEventListener("change", handleFormChange);
			formElement.removeEventListener("input", handleFormChange);
		};
	}, []);

	// AOI change handler
	const handleAOIChange = useCallback((geometry: GeoJSON.MultiPolygon | GeoJSON.Polygon | null) => {
		console.debug("AOI changed:", geometry ? "AOI present" : "AOI cleared");
		currentAOIGeometry.current = geometry;
		setHasAOI(!!geometry);
		setIsAOILoaded(true);
	}, []);

	// Form submit handler
	const handleSubmit = async (values: AuditFormValues) => {
		if (!isAOILoaded) {
			message.warning("AOI is still loading, please wait...");
			return;
		}

		if (flags.some((f) => f.status === "open")) {
			message.error("There are open user-reported issues. Please acknowledge them before saving.");
			return;
		}

		if (values.final_assessment === "fixable_issues" && !values.notes?.trim()) {
			message.error("Please provide detailed notes for the fixable issues");
			return;
		}

		if (values.final_assessment === "exclude_completely" && !values.notes?.trim()) {
			message.error("Please provide detailed notes for excluding this dataset");
			return;
		}

		if (values.final_assessment === "no_issues" && !currentAOIGeometry.current) {
			message.error("Please draw an AOI on the map before submitting");
			return;
		}

		try {
			setIsSubmitting(true);

			const auditPayload = {
				...values,
				dataset_id: dataset.id,
				aoi_done: !!currentAOIGeometry.current,
				aoiGeometry: currentAOIGeometry.current || undefined,
			};

			await saveAudit(auditPayload);
			message.success(auditData ? "Audit data updated successfully" : "Audit data saved successfully");

			setHasFormChanges(false);

			setTimeout(() => {
				if (navigateToNext) {
					const nextId = getNextDatasetId(dataset.id);
					if (nextId) {
						navigate(`/dataset-audit/${nextId}`);
					} else {
						message.info("All datasets in filter completed");
						navigate("/dataset-audit");
					}
				} else {
					navigate("/dataset-audit");
				}
				setNavigateToNext(false);
			}, 100);
		} catch (error) {
			console.error("Error saving audit data:", error);
			message.error("Failed to save audit data");
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleSaveAndNext = () => {
		setNavigateToNext(true);
		form.submit();
	};

	const handleCancel = () => {
		showExitConfirmation(() => navigate("/dataset-audit"));
	};

	const handleMarkReviewedAndNext = async () => {
		try {
			await markAsReviewed(dataset.id);
			const nextId = getNextDatasetId(dataset.id);
			if (nextId) {
				navigate(`/dataset-audit/${nextId}`);
			} else {
				message.success("Review complete - returning to list");
				navigate("/dataset-audit");
			}
		} catch (error) {
			console.error("Error marking as reviewed:", error);
			message.error("Failed to mark as reviewed");
		}
	};

	// Computed values
	const isLoading = isAuditLoading || !user || isLockingAudit;
	const isSaving = isSavingAudit || isSubmitting;
	const isPending = !auditData;
	const isReviewed = auditData?.reviewed_at != null;
	const nextDatasetId = getNextDatasetId(dataset.id);
	const hasNextDataset = nextDatasetId !== null;
	const currentDatasetIndex = currentIndex(dataset.id);

	return {
		// Form
		form,
		handleSubmit,
		handleSaveAndNext,
		handleCancel,
		handleMarkReviewedAndNext,

		// State
		isLoading,
		isSaving,
		isPending,
		isReviewed,
		auditLockError,
		isLockingAudit,
		navigateToNext,

		// Data
		user,
		auditData,
		flags,
		isFlagsLoading,
		orthoMetadata,
		isOrthoLoading,
		phenologyData,
		isPhenologyLoading,

		// Flags
		updateFlagStatus,
		isUpdatingFlag,

		// Navigation
		nextDatasetId,
		hasNextDataset,
		currentDatasetIndex,
		totalCount,
		isMarkingReviewed,

		// AOI
		hasAOI,
		isAOILoaded,
		handleAOIChange,
		aoiToolbarState,
		setAoiToolbarState,

		// Download
		isDownloading,
		startDownload,
		finishDownload,
		currentDownloadId,

		// Season prompt
		copyPromptWithImage,
	};
}
