import { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
	Table,
	Button,
	Typography,
	message,
	Tag,
	Tooltip,
	Segmented,
	Input,
	Space,
	Checkbox,
	Select,
	Collapse,
	Badge,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
	SearchOutlined,
	MailOutlined,
	FilterOutlined,
	FlagOutlined,
	EditOutlined,
} from "@ant-design/icons";
import { useAuth } from "../hooks/useAuthProvider";
import { useCanAudit } from "../hooks/useUserPrivileges";
import { useDatasets } from "../hooks/useDatasets";
import DatasetAuditDetail from "../components/DatasetAudit/DatasetAuditDetail";
import { IDataset } from "../types/dataset";
import { useDatasetAudits, DatasetAuditUserInfo, useDatasetContributors } from "../hooks/useDatasetAudit";
import { supabase } from "../hooks/useSupabase";
import { useFlaggedDatasets } from "../hooks/useDatasetFlags";
import { useReferenceDatasetIds } from "../hooks/useReferencePatches";
import { useAuditNavigation } from "../hooks/useAuditNavigation";
import { usePendingCorrections } from "../hooks/usePendingCorrections";

const { Title, Text } = Typography;

// Tab structure including edits & flags
type AuditTab = "pending" | "completed" | "reference" | "edits-flags";

// Status sub-filter for completed tab
type CompletedStatusFilter = "all" | "ready" | "fixable" | "excluded" | "needs-review" | "reviewed";

// Month constants for filtering
const MONTHS = [
	{ label: "Jan", value: 1 },
	{ label: "Feb", value: 2 },
	{ label: "Mar", value: 3 },
	{ label: "Apr", value: 4 },
	{ label: "May", value: 5 },
	{ label: "Jun", value: 6 },
	{ label: "Jul", value: 7 },
	{ label: "Aug", value: 8 },
	{ label: "Sep", value: 9 },
	{ label: "Oct", value: 10 },
	{ label: "Nov", value: 11 },
	{ label: "Dec", value: 12 },
];

// Helper function to check if dataset processing is complete
const isProcessingComplete = (dataset: IDataset) => {
	return (
		dataset.is_upload_done &&
		dataset.is_ortho_done &&
		dataset.is_cog_done &&
		dataset.is_thumbnail_done &&
		dataset.is_deadwood_done &&
		dataset.is_metadata_done
	);
};

// Helper to format location
const formatLocation = (dataset: IDataset): string => {
	const parts = [dataset.admin_level_3, dataset.admin_level_1].filter(Boolean);
	return parts.length > 0 ? parts.join(", ") : "Unknown";
};

// Helper to format acquisition date
const formatAcquisitionDate = (dataset: IDataset): string => {
	const { aquisition_year, aquisition_month, aquisition_day } = dataset;
	if (!aquisition_year) return "Unknown";
	const parts = [String(aquisition_year)];
	if (aquisition_month) parts.push(String(aquisition_month).padStart(2, "0"));
	if (aquisition_day) parts.push(String(aquisition_day).padStart(2, "0"));
	return parts.join("-");
};

// Biome badge colors
const BIOME_COLORS: Record<string, { color: string; icon: string }> = {
	"Tropical": { color: "green", icon: "🌴" },
	"Subtropical": { color: "lime", icon: "🌴" },
	"Temperate": { color: "blue", icon: "🌲" },
	"Boreal": { color: "cyan", icon: "🌲" },
	"Mediterranean": { color: "orange", icon: "🌿" },
};

const getBiomeBadge = (biomeName: string | null) => {
	if (!biomeName) return <Tag color="default">Unknown</Tag>;

	// Find matching biome type
	for (const [key, { color, icon }] of Object.entries(BIOME_COLORS)) {
		if (biomeName.toLowerCase().includes(key.toLowerCase())) {
			return (
				<Tooltip title={biomeName}>
					<Tag color={color}>
						{icon} {key}
					</Tag>
				</Tooltip>
			);
		}
	}
	return (
		<Tooltip title={biomeName}>
			<Tag color="default">{biomeName.slice(0, 15)}...</Tag>
		</Tooltip>
	);
};

export default function DatasetAudit() {
	const { id } = useParams();
	const navigate = useNavigate();
	const [searchParams, setSearchParams] = useSearchParams();
	const { setFilteredDatasetIds } = useAuditNavigation();

	// ALL HOOKS MUST BE CALLED FIRST
	const { user } = useAuth();
	const isAuthLoading = false;
	const { canAudit, isLoading: isAuditPrivilegeLoading } = useCanAudit();
	const { data: datasets, isLoading: isDatasetLoading } = useDatasets();
	const { data: audits, isLoading: isAuditsLoading } = useDatasetAudits();
	const { data: flaggedAgg = [], isLoading: isFlaggedLoading } = useFlaggedDatasets();
	const { data: referenceDatasetIds = new Set() } = useReferenceDatasetIds();
	const { data: contributorMap = new Map() } = useDatasetContributors();
	const { data: correctionsMap = new Map(), isLoading: isCorrectionsLoading } = usePendingCorrections();

	// Filter states - initialize from URL params
	const initialTab = (searchParams.get("tab") as AuditTab) || "pending";
	const initialStatus = (searchParams.get("status") as CompletedStatusFilter) || "all";
	const initialBiome = searchParams.get("biome") || "";
	const initialCountry = searchParams.get("country") || "";
	const initialAuditor = searchParams.get("auditor") || "";
	const initialContributor = searchParams.get("contributor") || "";
	const initialHasFlags = searchParams.get("hasFlags") === "true";

	const [activeTab, setActiveTab] = useState<AuditTab>(initialTab);
	const [statusFilter, setStatusFilter] = useState<CompletedStatusFilter>(initialStatus);
	const [idFilter, setIdFilter] = useState<string>(searchParams.get("id") || "");
	const [selectedMonths, setSelectedMonths] = useState<number[]>([]);
	const [biomeFilter, setBiomeFilter] = useState<string>(initialBiome);
	const [countryFilter, setCountryFilter] = useState<string>(initialCountry);
	const [auditorFilter, setAuditorFilter] = useState<string>(initialAuditor);
	const [contributorFilter, setContributorFilter] = useState<string>(initialContributor);
	const [hasFlagsFilter, setHasFlagsFilter] = useState<boolean>(initialHasFlags);
	const [filtersExpanded, setFiltersExpanded] = useState<boolean>(true);

	// Update URL when filters change
	useEffect(() => {
		const params = new URLSearchParams();
		params.set("tab", activeTab);
		if (statusFilter !== "all") params.set("status", statusFilter);
		if (biomeFilter) params.set("biome", biomeFilter);
		if (countryFilter) params.set("country", countryFilter);
		if (auditorFilter) params.set("auditor", auditorFilter);
		if (contributorFilter) params.set("contributor", contributorFilter);
		if (hasFlagsFilter) params.set("hasFlags", "true");
		if (idFilter) params.set("id", idFilter);
		setSearchParams(params, { replace: true });
	}, [activeTab, statusFilter, biomeFilter, countryFilter, auditorFilter, contributorFilter, hasFlagsFilter, idFilter, setSearchParams]);

	// Minimum dataset ID for auditing
	const MIN_AUDIT_DATASET_ID = 2559;
	const hasAboveMinId = useMemo(() => {
		return (datasets || []).some((d) => d.id > MIN_AUDIT_DATASET_ID);
	}, [datasets]);

	// Create maps for quick lookup
	const auditMap = useMemo(() => {
		if (!audits) return new Map<number, DatasetAuditUserInfo>();
		return new Map(audits.map((audit) => [audit.dataset_id, audit as unknown as DatasetAuditUserInfo]));
	}, [audits]);

	const flaggedMap = useMemo(() => new Map(flaggedAgg.map((r) => [r.dataset_id, r])), [flaggedAgg]);

	// Extract unique values for filters
	const uniqueBiomes = useMemo(() => {
		if (!datasets) return [];
		const biomes = new Set(datasets.map((d) => d.biome_name).filter(Boolean));
		return Array.from(biomes).sort();
	}, [datasets]);

	const uniqueCountries = useMemo(() => {
		if (!datasets) return [];
		const countries = new Set(datasets.map((d) => d.admin_level_1).filter(Boolean));
		return Array.from(countries).sort();
	}, [datasets]);

	const uniqueAuditors = useMemo(() => {
		if (!audits) return [];
		const auditors = new Set(
			audits
				.map((a) => (a as unknown as DatasetAuditUserInfo).audited_by_email)
				.filter(Boolean)
		);
		return Array.from(auditors).sort();
	}, [audits]);

	const uniqueContributors = useMemo(() => {
		if (!contributorMap || contributorMap.size === 0) return [];
		const contributors = new Set(Array.from(contributorMap.values()).filter(Boolean));
		return Array.from(contributors).sort() as string[];
	}, [contributorMap]);

	// Filter datasets based on tab and filters
	const filteredDatasets = useMemo(() => {
		if (!datasets) return [];

		let filtered = datasets;

		// Apply minimum ID filter (except for Reference tab)
		if (activeTab !== "reference" && hasAboveMinId) {
			filtered = filtered.filter((dataset) => dataset.id > MIN_AUDIT_DATASET_ID);
		}

		// Tab-based filtering
		if (activeTab === "pending") {
			filtered = filtered.filter((dataset) => !dataset.is_audited && isProcessingComplete(dataset));
		} else if (activeTab === "completed") {
			filtered = filtered.filter((dataset) => dataset.is_audited);

			// Apply status sub-filter
			if (statusFilter !== "all") {
				filtered = filtered.filter((dataset) => {
					const audit = auditMap.get(dataset.id);
					if (!audit) return false;

					switch (statusFilter) {
						case "ready":
							return audit.final_assessment === "no_issues";
						case "fixable":
							return audit.final_assessment === "fixable_issues";
						case "excluded":
							return audit.final_assessment === "exclude_completely";
						case "needs-review":
							return !audit.reviewed_at;
						case "reviewed":
							return !!audit.reviewed_at;
						default:
							return true;
					}
				});
			}
		} else if (activeTab === "reference") {
			filtered = filtered.filter((dataset) => referenceDatasetIds.has(dataset.id));
		} else if (activeTab === "edits-flags") {
			// Filter for datasets with pending corrections OR user flags
			const flaggedSet = new Set(flaggedAgg.map((f) => f.dataset_id));
			filtered = filtered.filter((dataset) =>
				correctionsMap.has(dataset.id) || flaggedSet.has(dataset.id)
			);
		}

		// Apply common filters
		if (idFilter.trim()) {
			const idNumber = parseInt(idFilter.trim());
			if (!isNaN(idNumber)) {
				filtered = filtered.filter((dataset) => dataset.id === idNumber);
			} else {
				filtered = [];
			}
		}

		if (selectedMonths.length > 0) {
			filtered = filtered.filter((dataset) => {
				const month = parseInt(dataset.aquisition_month);
				return !isNaN(month) && selectedMonths.includes(month);
			});
		}

		if (biomeFilter) {
			filtered = filtered.filter((dataset) => dataset.biome_name === biomeFilter);
		}

		if (countryFilter) {
			filtered = filtered.filter((dataset) => dataset.admin_level_1 === countryFilter);
		}

		if (auditorFilter && activeTab === "completed") {
			filtered = filtered.filter((dataset) => {
				const audit = auditMap.get(dataset.id);
				return audit?.audited_by_email === auditorFilter;
			});
		}

		if (contributorFilter) {
			filtered = filtered.filter((dataset) => {
				const email = contributorMap.get(dataset.id) || auditMap.get(dataset.id)?.uploaded_by_email;
				return email === contributorFilter;
			});
		}

		if (hasFlagsFilter) {
			const flaggedSet = new Set(flaggedAgg.map((f) => f.dataset_id));
			filtered = filtered.filter((d) => flaggedSet.has(d.id));
		}

		return filtered;
	}, [
		datasets,
		activeTab,
		statusFilter,
		idFilter,
		selectedMonths,
		biomeFilter,
		countryFilter,
		auditorFilter,
		contributorFilter,
		hasFlagsFilter,
		auditMap,
		contributorMap,
		flaggedAgg,
		hasAboveMinId,
		referenceDatasetIds,
	]);

	// Update navigation context with filtered dataset IDs (sorted by ID descending to match table order)
	const filteredIds = useMemo(
		() => [...filteredDatasets].sort((a, b) => b.id - a.id).map((d) => d.id),
		[filteredDatasets]
	);

	useEffect(() => {
		setFilteredDatasetIds(filteredIds);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [filteredIds.join(",")]);

	// Compute counts for tabs
	const pendingCount = useMemo(() => {
		if (!datasets) return 0;
		const base = hasAboveMinId ? datasets.filter((d) => d.id > MIN_AUDIT_DATASET_ID) : datasets;
		return base.filter((d) => !d.is_audited && isProcessingComplete(d)).length;
	}, [datasets, hasAboveMinId]);

	const completedCount = useMemo(() => {
		if (!datasets) return 0;
		const base = hasAboveMinId ? datasets.filter((d) => d.id > MIN_AUDIT_DATASET_ID) : datasets;
		return base.filter((d) => d.is_audited).length;
	}, [datasets, hasAboveMinId]);

	const referenceCount = useMemo(() => {
		if (!datasets) return 0;
		return datasets.filter((d) => referenceDatasetIds.has(d.id)).length;
	}, [datasets, referenceDatasetIds]);

	const needsReviewCount = useMemo(() => {
		if (!datasets || !audits) return 0;
		return datasets.filter((d) => {
			const audit = auditMap.get(d.id);
			return d.is_audited && audit && !audit.reviewed_at;
		}).length;
	}, [datasets, audits, auditMap]);

	const editsFlagsCount = useMemo(() => {
		if (!datasets) return 0;
		const flaggedSet = new Set(flaggedAgg.map((f) => f.dataset_id));
		return datasets.filter((d) => correctionsMap.has(d.id) || flaggedSet.has(d.id)).length;
	}, [datasets, flaggedAgg, correctionsMap]);

	// Check if user has audit privileges
	useEffect(() => {
		if (!isAuthLoading && !isAuditPrivilegeLoading && user && !canAudit) {
			message.error("You do not have permission to access this page");
			navigate("/");
		}
	}, [user, isAuthLoading, isAuditPrivilegeLoading, canAudit, navigate]);

	// Loading state
	if (isAuthLoading || isAuditPrivilegeLoading) {
		return <div className="p-6">Loading...</div>;
	}

	// Detail view
	if (id) {
		const dataset = datasets?.find((d) => d.id.toString() === id);
		if (isDatasetLoading) return <div>Loading dataset...</div>;
		if (!dataset) return <div>Dataset not found</div>;
		return <DatasetAuditDetail dataset={dataset} />;
	}

	const handleStartAudit = async (datasetId: number) => {
		try {
			const { data, error } = await supabase
				.from("v2_statuses")
				.select("is_in_audit")
				.eq("dataset_id", datasetId)
				.single();

			if (error) {
				console.error("Error checking audit status:", error);
				navigate(`/dataset-audit/${datasetId}`);
				return;
			}

			if (data.is_in_audit) {
				message.warning("Dataset is currently being audited by another user");
				return;
			}

			navigate(`/dataset-audit/${datasetId}`);
		} catch (error) {
			console.error("Error checking audit status:", error);
			navigate(`/dataset-audit/${datasetId}`);
		}
	};

	// Build columns based on active tab
	const baseColumns: ColumnsType<IDataset> = [
		{
			title: "ID",
			dataIndex: "id",
			key: "id",
			sorter: (a, b) => a.id - b.id,
			defaultSortOrder: "descend",
			width: 80,
		},
		{
			title: "Location",
			key: "location",
			render: (_, record) => (
				<Tooltip title={`${record.admin_level_3 || ""}, ${record.admin_level_2 || ""}, ${record.admin_level_1 || ""}`}>
					<span className="text-sm">{formatLocation(record)}</span>
				</Tooltip>
			),
			width: 180,
		},
		{
			title: "Biome",
			key: "biome",
			render: (_, record) => getBiomeBadge(record.biome_name),
			width: 120,
		},
		{
			title: "Acquisition Date",
			key: "date",
			render: (_, record) => <span className="font-mono text-xs">{formatAcquisitionDate(record)}</span>,
			width: 120,
		},
	];

	// Season column - only for Completed tab (season is determined during audit)
	const seasonColumn = {
		title: "Season",
		key: "season",
		render: (_: unknown, record: IDataset) => {
			const audit = auditMap.get(record.id);
			// has_valid_phenology: true = in season, false = out of season, null = not determined
			if (!audit || audit.has_valid_phenology === null) {
				return <Tag color="default">—</Tag>;
			}
			return audit.has_valid_phenology ? (
				<Tag color="green">In Season</Tag>
			) : (
				<Tag color="orange">Out of Season</Tag>
			);
		},
		width: 100,
	};

	// Notes/Description column - only for Completed tab
	const notesColumn = {
		title: "Notes",
		key: "notes",
		render: (_: unknown, record: IDataset) => {
			const audit = auditMap.get(record.id);
			const notes = audit?.notes;
			if (!notes) return <span className="text-gray-400">—</span>;
			const truncated = notes.length > 40 ? notes.slice(0, 40) + "..." : notes;
			return (
				<Tooltip title={notes}>
					<span className="text-sm text-gray-600 cursor-help">{truncated}</span>
				</Tooltip>
			);
		},
		width: 200,
	};

	const flagsColumn = {
		title: "Flags",
		key: "flags",
		render: (_: unknown, record: IDataset) => {
			const flagData = flaggedMap.get(record.id);
			if (!flagData) return null;
			return (
				<Tooltip title={`${flagData.flag_count} user-reported issue(s)`}>
					<Badge count={flagData.flag_count} size="small">
						<FlagOutlined style={{ color: "#faad14" }} />
					</Badge>
				</Tooltip>
			);
		},
		width: 70,
	};

	const correctionsColumn = {
		title: "Pending Edits",
		key: "corrections",
		render: (_: unknown, record: IDataset) => {
			const count = correctionsMap.get(record.id);
			if (!count) return <span className="text-gray-400">—</span>;
			return (
				<Tooltip title={`${count} pending polygon edit(s) awaiting review`}>
					<Badge count={count} size="small" color="#1890ff">
						<EditOutlined style={{ color: "#1890ff" }} />
					</Badge>
				</Tooltip>
			);
		},
		width: 100,
	};

	const contributorColumn = {
		title: "Contributor",
		key: "contributor",
		render: (_: unknown, record: IDataset) => {
			// First try contributor map, then fall back to audit map
			const email = contributorMap.get(record.id) || auditMap.get(record.id)?.uploaded_by_email;
			if (!email) return <span className="text-gray-400">—</span>;
			return (
				<Tooltip title="Click to copy email">
					<Button
						type="link"
						size="small"
						className="p-0 text-xs"
						onClick={() => {
							navigator.clipboard.writeText(email);
							message.success("Email copied to clipboard");
						}}
					>
						{email}
					</Button>
				</Tooltip>
			);
		},
		width: 180,
	};

	const auditorColumn = {
		title: "Auditor",
		key: "auditor",
		render: (_: unknown, record: IDataset) => {
			const audit = auditMap.get(record.id);
			if (!audit?.audited_by_email) return <span className="text-gray-400">—</span>;
			return (
				<Tooltip title="Click to copy email">
					<Button
						type="link"
						size="small"
						className="p-0 text-xs"
						onClick={() => {
							navigator.clipboard.writeText(audit.audited_by_email!);
							message.success("Email copied to clipboard");
						}}
					>
						{audit.audited_by_email}
					</Button>
				</Tooltip>
			);
		},
		width: 180,
	};

	const statusColumn = {
		title: "Status",
		key: "status",
		render: (_: unknown, record: IDataset) => {
			const audit = auditMap.get(record.id);
			if (!audit) return <Tag color="red">No Audit Data</Tag>;

			const isReviewed = !!audit.reviewed_at;
			let statusTag;

			switch (audit.final_assessment) {
				case "no_issues":
					statusTag = <Tag color="green">✓ Ready</Tag>;
					break;
				case "fixable_issues":
					statusTag = <Tag color="yellow">🔧 Fixable</Tag>;
					break;
				case "exclude_completely":
					statusTag = <Tag color="red">🚫 Excluded</Tag>;
					break;
				default:
					statusTag = <Tag color="default">Unknown</Tag>;
			}

			return (
				<Space size="small">
					{statusTag}
					{isReviewed && (
						<Tooltip title={`Reviewed by ${audit.reviewed_by_email}`}>
							<Tag color="blue" className="text-xs">
								✓ Reviewed
							</Tag>
						</Tooltip>
					)}
				</Space>
			);
		},
		width: 180,
	};

	const actionsColumn = {
		title: "Actions",
		key: "actions",
		render: (_: unknown, record: IDataset) => {
			const isComplete = isProcessingComplete(record);
			const buttonLabel = record.is_audited ? "Review" : "Start Audit";
			const tooltipText = !isComplete
				? "Dataset processing must be complete before auditing"
				: record.is_audited
					? "Review this completed audit"
					: "Start audit for this dataset";
			return (
				<Tooltip title={tooltipText}>
					<Button type="primary" onClick={() => handleStartAudit(record.id)} disabled={!isComplete} size="small">
						{buttonLabel}
					</Button>
				</Tooltip>
			);
		},
		width: 120,
	};

	const referencePatchesColumn = {
		title: "Reference Patches",
		key: "reference_patches",
		render: (_: unknown, record: IDataset) => (
			<Tooltip title="Open Reference Patch Editor for this dataset">
				<Button size="small" onClick={() => navigate(`/dataset-audit/${record.id}/reference-patches`)}>
					{record.has_ml_tiles ? "Continue Patches" : "Generate Patches"}
				</Button>
			</Tooltip>
		),
		width: 150,
	};

	// Assemble columns based on tab
	let columns: ColumnsType<IDataset>;
	if (activeTab === "pending") {
		// Pending: no season (determined during audit), include flags and contributor
		columns = [...baseColumns, flagsColumn, contributorColumn, actionsColumn];
	} else if (activeTab === "completed") {
		// Completed: season, notes, flags, status, auditor
		columns = [...baseColumns, seasonColumn, notesColumn, flagsColumn, statusColumn, auditorColumn, actionsColumn];
	} else if (activeTab === "edits-flags") {
		// Edits & Flags: show corrections and flags counts, with review action
		columns = [...baseColumns, correctionsColumn, flagsColumn, statusColumn, actionsColumn];
	} else {
		// Reference tab
		columns = [...baseColumns, referencePatchesColumn, actionsColumn];
	}

	const clearAllFilters = () => {
		setIdFilter("");
		setSelectedMonths([]);
		setBiomeFilter("");
		setCountryFilter("");
		setAuditorFilter("");
		setContributorFilter("");
		setHasFlagsFilter(false);
		setStatusFilter("all");
	};

	const hasActiveFilters =
		idFilter || selectedMonths.length > 0 || biomeFilter || countryFilter || auditorFilter || contributorFilter || hasFlagsFilter || statusFilter !== "all";

	return (
		<div className="p-6">
			{/* Header */}
			<div className="mb-6">
				<Title level={3} style={{ margin: 0 }}>
					Dataset Audits
				</Title>
			</div>

			{/* Tabs with badges */}
			<div className="mb-4">
				<Segmented
					value={activeTab}
					onChange={(value) => {
						setActiveTab(value as AuditTab);
						setStatusFilter("all");
					}}
					options={[
						{
							label: (
								<Space size={6}>
									<span>📋 Pending</span>
									<Badge count={pendingCount} size="small" color="#1890ff" showZero />
								</Space>
							),
							value: "pending",
						},
						{
							label: (
								<Space size={6}>
									<span>✓ Completed</span>
									<Badge count={completedCount} size="small" color="#52c41a" showZero />
								</Space>
							),
							value: "completed",
						},
						{
							label: (
								<Space size={6}>
									<span>🔔 Edits & Flags</span>
									<Badge count={editsFlagsCount} size="small" color="#faad14" showZero />
								</Space>
							),
							value: "edits-flags",
						},
						{
							label: (
								<Space size={6}>
									<span>📌 Reference</span>
									<Badge count={referenceCount} size="small" color="#722ed1" showZero />
								</Space>
							),
							value: "reference",
						},
					]}
					size="large"
				/>
			</div>

			{/* Filters Panel */}
			<Collapse
				activeKey={filtersExpanded ? ["filters"] : []}
				onChange={() => setFiltersExpanded(!filtersExpanded)}
				className="mb-4"
				items={[
					{
						key: "filters",
						label: (
							<Space>
								<FilterOutlined />
								<span>Filters</span>
								{hasActiveFilters && <Badge count="Active" size="small" style={{ backgroundColor: "#1890ff" }} />}
							</Space>
						),
						children: (
							<div className="space-y-4">
								{/* Row 1: Status, ID, Biome, Country */}
								<div className="flex flex-wrap gap-4">
									{activeTab === "completed" && (
										<div>
											<Text type="secondary" className="block mb-1 text-xs">
												Status
											</Text>
											<Select
												value={statusFilter}
												onChange={setStatusFilter}
												style={{ width: 150 }}
												options={[
													{ label: "All", value: "all" },
													{ label: "Ready", value: "ready" },
													{ label: "Fixable", value: "fixable" },
													{ label: "Excluded", value: "excluded" },
													{ label: "Needs Review", value: "needs-review" },
													{ label: "Reviewed", value: "reviewed" },
												]}
											/>
										</div>
									)}

									<div>
										<Text type="secondary" className="block mb-1 text-xs">
											Dataset ID
										</Text>
										<Input
											placeholder="Filter by ID"
											prefix={<SearchOutlined />}
											value={idFilter}
											onChange={(e) => setIdFilter(e.target.value)}
											style={{ width: 130 }}
											allowClear
										/>
									</div>

									<div>
										<Text type="secondary" className="block mb-1 text-xs">
											Biome
										</Text>
										<Select
											value={biomeFilter}
											onChange={setBiomeFilter}
											style={{ width: 200 }}
											allowClear
											placeholder="All biomes"
											showSearch
											options={uniqueBiomes.map((b) => ({ label: b, value: b }))}
										/>
									</div>

									<div>
										<Text type="secondary" className="block mb-1 text-xs">
											Country
										</Text>
										<Select
											value={countryFilter}
											onChange={setCountryFilter}
											style={{ width: 180 }}
											allowClear
											placeholder="All countries"
											showSearch
											options={uniqueCountries.map((c) => ({ label: c, value: c }))}
										/>
									</div>

									{activeTab === "completed" && (
										<div>
											<Text type="secondary" className="block mb-1 text-xs">
												Auditor
											</Text>
											<Select
												value={auditorFilter}
												onChange={setAuditorFilter}
												style={{ width: 180 }}
												allowClear
												placeholder="All auditors"
												showSearch
												options={uniqueAuditors.map((a) => ({ label: a, value: a }))}
											/>
										</div>
									)}

									<div>
										<Text type="secondary" className="block mb-1 text-xs">
											Contributor
										</Text>
										<Select
											value={contributorFilter}
											onChange={setContributorFilter}
											style={{ width: 180 }}
											allowClear
											placeholder="All contributors"
											showSearch
											options={uniqueContributors.map((c) => ({ label: c, value: c }))}
										/>
									</div>

									<div className="flex items-end">
										<Checkbox checked={hasFlagsFilter} onChange={(e) => setHasFlagsFilter(e.target.checked)}>
											Has flags only
										</Checkbox>
									</div>
								</div>

								{/* Row 2: Acquisition Month Filter */}
								<div className="flex items-center gap-4">
									<Text type="secondary" className="text-xs">
										Acquisition Month:
									</Text>
									<Checkbox.Group
										options={MONTHS}
										value={selectedMonths}
										onChange={(checkedValues) => setSelectedMonths(checkedValues as number[])}
									/>
									{selectedMonths.length > 0 && (
										<Button size="small" type="link" onClick={() => setSelectedMonths([])}>
											Clear months
										</Button>
									)}
								</div>

								{/* Clear all button */}
								{hasActiveFilters && (
									<Button size="small" onClick={clearAllFilters}>
										Clear all filters
									</Button>
								)}
							</div>
						),
					},
				]}
			/>

			{/* Table */}
			<Table
				dataSource={filteredDatasets}
				columns={columns}
				rowKey="id"
				loading={isDatasetLoading || isAuditsLoading || isFlaggedLoading || isCorrectionsLoading}
				pagination={{
					pageSize: 20,
					showSizeChanger: true,
					showQuickJumper: true,
					showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} datasets`,
				}}
				scroll={{ x: 1000 }}
			/>
		</div>
	);
}
