import { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Table, Button, Typography, message, Tag, Tooltip, Segmented, Input, Space, Checkbox } from "antd";
import type { ColumnsType } from "antd/es/table";
import { SearchOutlined } from "@ant-design/icons";
import { InfoCircleOutlined } from "@ant-design/icons";
import { useAuth } from "../hooks/useAuthProvider";
import { useCanAudit } from "../hooks/useUserPrivileges";
import { useDatasets } from "../hooks/useDatasets";
import DatasetAuditDetail from "../components/DatasetAudit/DatasetAuditDetail";
import { IDataset } from "../types/dataset";
import { useDatasetAudits } from "../hooks/useDatasetAudit";
import { supabase } from "../hooks/useSupabase";
import { useFlaggedDatasets } from "../hooks/useDatasetFlags";
import { useReferenceDatasetIds } from "../hooks/useReferencePatches";

const { Title } = Typography;

type AuditFilter =
  | "needs-audit"
  | "audited"
  | "needs-tiles"
  | "training-ready"
  | "fixable-issues"
  | "excluded"
  | "flagged";

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

// Helper function to check if dataset processing is complete (moved outside component to prevent re-renders)
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

export default function DatasetAudit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // ALL HOOKS MUST BE CALLED FIRST - NO EARLY RETURNS BEFORE THIS POINT
  const { user } = useAuth();
  const isAuthLoading = false;
  const { canAudit, isLoading: isAuditPrivilegeLoading } = useCanAudit();
  const { data: datasets, isLoading: isDatasetLoading } = useDatasets();
  const { data: audits, isLoading: isAuditsLoading } = useDatasetAudits();
  const { data: flaggedAgg = [], isLoading: isFlaggedLoading } = useFlaggedDatasets();
  const { data: referenceDatasetIds = new Set() } = useReferenceDatasetIds();

  // Filter states - initialize from URL params if available
  const initialFilter = (searchParams.get("tab") as AuditFilter) || "needs-audit";
  const [auditFilter, setAuditFilter] = useState<AuditFilter>(initialFilter);
  const [idFilter, setIdFilter] = useState<string>("");
  const [selectedMonths, setSelectedMonths] = useState<number[]>([]);

  // Handler for tab change that updates both state and URL
  const handleTabChange = (value: AuditFilter) => {
    setAuditFilter(value);
    setSearchParams({ tab: value });
  };

  // Add a constant for the minimum dataset ID
  const MIN_AUDIT_DATASET_ID = 2559;
  // Dynamically enable the min-ID filter only if such IDs exist in current dataset list (fixes empty views in dev)
  const hasAboveMinId = useMemo(() => {
    return (datasets || []).some((d) => d.id > MIN_AUDIT_DATASET_ID);
  }, [datasets]);

  // Create a map of dataset_id to audit data for quick lookup
  const auditMap = useMemo(() => {
    if (!audits) return new Map();
    return new Map(audits.map((audit) => [audit.dataset_id, audit]));
  }, [audits]);

  // Filter datasets based on audit status, ID, and months
  const filteredDatasets = useMemo(() => {
    if (!datasets) return [];

    let filtered = datasets;

    // First filter by minimum ID for auditing (skip for Flagged, Tiles Pending, and Training Ready tabs)
    if (
      auditFilter !== "flagged" &&
      auditFilter !== "needs-tiles" &&
      auditFilter !== "training-ready" &&
      hasAboveMinId
    ) {
      filtered = filtered.filter((dataset) => dataset.id > MIN_AUDIT_DATASET_ID);
    }

    if (auditFilter === "needs-audit") {
      filtered = filtered.filter((dataset) => !dataset.is_audited && isProcessingComplete(dataset));
    } else if (auditFilter === "audited") {
      filtered = filtered.filter((dataset) => dataset.is_audited);
    } else if (auditFilter === "needs-tiles") {
      // Show all datasets that are in reference_datasets AND don't have patches yet (regardless of audit status)
      filtered = filtered.filter((dataset) => referenceDatasetIds.has(dataset.id) && !dataset.has_ml_tiles);
    } else if (auditFilter === "training-ready") {
      // Only show datasets that are in reference_datasets AND have patches completed
      filtered = filtered.filter((dataset) => referenceDatasetIds.has(dataset.id) && dataset.has_ml_tiles);
    } else if (auditFilter === "fixable-issues") {
      filtered = filtered.filter((dataset) => {
        const audit = auditMap.get(dataset.id);
        return dataset.is_audited && audit && audit.final_assessment === "fixable_issues";
      });
    } else if (auditFilter === "excluded") {
      filtered = filtered.filter((dataset) => {
        const audit = auditMap.get(dataset.id);
        return dataset.is_audited && audit && audit.final_assessment === "exclude_completely";
      });
    } else if (auditFilter === "flagged") {
      const flaggedSet = new Set(flaggedAgg.map((f) => f.dataset_id));
      filtered = filtered.filter((d) => flaggedSet.has(d.id));
    }

    // Filter by ID if provided
    if (idFilter.trim()) {
      const idNumber = parseInt(idFilter.trim());
      if (!isNaN(idNumber)) {
        filtered = filtered.filter((dataset) => dataset.id === idNumber);
      } else {
        // If not a valid number, show no results
        filtered = [];
      }
    }

    // Filter by selected months if any are selected
    if (selectedMonths.length > 0) {
      filtered = filtered.filter((dataset) => {
        // Handle the aquisition_month field (note: typo in field name is preserved)
        const monthStr = dataset.aquisition_month;
        if (!monthStr) return false; // Skip datasets with no month data

        const month = parseInt(monthStr);
        if (isNaN(month) || month < 1 || month > 12) return false; // Skip invalid months

        return selectedMonths.includes(month);
      });
    }

    return filtered;
  }, [datasets, auditFilter, idFilter, selectedMonths, auditMap, flaggedAgg, hasAboveMinId, referenceDatasetIds]);

  // Update counts to also respect the minimum ID filter
  const needsAuditCount = useMemo(() => {
    if (!datasets) return 0;
    const base = hasAboveMinId ? datasets.filter((d) => d.id > MIN_AUDIT_DATASET_ID) : datasets;
    return base.filter((d) => !d.is_audited && isProcessingComplete(d)).length;
  }, [datasets, hasAboveMinId]);

  const auditedCount = useMemo(() => {
    if (!datasets) return 0;
    const base = hasAboveMinId ? datasets.filter((d) => d.id > MIN_AUDIT_DATASET_ID) : datasets;
    return base.filter((d) => d.is_audited).length;
  }, [datasets, hasAboveMinId]);

  const needsTilesCount = useMemo(() => {
    if (!datasets) return 0;
    // Don't apply minimum ID filter - show ALL reference datasets
    return datasets.filter((d) => referenceDatasetIds.has(d.id) && !d.has_ml_tiles).length;
  }, [datasets, referenceDatasetIds]);

  const trainingReadyCount = useMemo(() => {
    if (!datasets) return 0;
    // Don't apply minimum ID filter - show ALL reference datasets
    return datasets.filter((d) => referenceDatasetIds.has(d.id) && d.has_ml_tiles).length;
  }, [datasets, referenceDatasetIds]);

  const fixableIssuesCount = useMemo(() => {
    if (!datasets || !audits) return 0;
    const base = hasAboveMinId ? datasets.filter((d) => d.id > MIN_AUDIT_DATASET_ID) : datasets;
    return base.filter((d) => {
      const audit = auditMap.get(d.id);
      return d.is_audited && audit && audit.final_assessment === "fixable_issues";
    }).length;
  }, [datasets, audits, auditMap, hasAboveMinId]);

  const excludedCount = useMemo(() => {
    if (!datasets || !audits) return 0;
    const base = hasAboveMinId ? datasets.filter((d) => d.id > MIN_AUDIT_DATASET_ID) : datasets;
    return base.filter((d) => {
      const audit = auditMap.get(d.id);
      return d.is_audited && audit && audit.final_assessment === "exclude_completely";
    }).length;
  }, [datasets, audits, auditMap, hasAboveMinId]);

  const flaggedCount = useMemo(() => flaggedAgg.length, [flaggedAgg]);
  const flaggedMap = useMemo(() => new Map(flaggedAgg.map((r) => [r.dataset_id, r])), [flaggedAgg]);

  // Check if user has audit privileges
  useEffect(() => {
    if (!isAuthLoading && !isAuditPrivilegeLoading && user && !canAudit) {
      message.error("You do not have permission to access this page");
      navigate("/");
    }
  }, [user, isAuthLoading, isAuditPrivilegeLoading, canAudit, navigate]);

  // NOW WE CAN HAVE CONDITIONAL RENDERING AFTER ALL HOOKS ARE CALLED

  // Show loading while checking authentication and privileges
  if (isAuthLoading || isAuditPrivilegeLoading) {
    return <div className="p-6">Loading...</div>;
  }

  // If we're on the detail view, show the audit form
  if (id) {
    const dataset = datasets?.find((d) => d.id.toString() === id);

    if (isDatasetLoading) return <div>Loading dataset...</div>;
    if (!dataset) return <div>Dataset not found</div>;

    return <DatasetAuditDetail dataset={dataset} />;
  }

  const handleStartAudit = async (datasetId: number) => {
    try {
      // Quick check if dataset is in audit before navigating
      const { data, error } = await supabase
        .from("v2_statuses")
        .select("is_in_audit")
        .eq("dataset_id", datasetId)
        .single();

      if (error) {
        console.error("Error checking audit status:", error);
        navigate(`/dataset-audit/${datasetId}`); // Navigate anyway, let the detail page handle it
        return;
      }

      if (data.is_in_audit) {
        message.warning("Dataset is currently being audited by another user");
        return;
      }

      navigate(`/dataset-audit/${datasetId}`);
    } catch (error) {
      console.error("Error checking audit status:", error);
      navigate(`/dataset-audit/${datasetId}`); // Navigate anyway, let the detail page handle it
    }
  };

  // Add Major Issues column for the major-issues filter
  const baseColumns: ColumnsType<IDataset> = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      sorter: (a: IDataset, b: IDataset) => a.id - b.id,
      defaultSortOrder: "descend" as const,
      width: 80,
    },
    {
      title: "User ID",
      dataIndex: "user_id",
      key: "user_id",
      render: (userId: string) => <span className="font-mono text-xs">{userId}</span>,
    },
    {
      title: "Authors",
      dataIndex: "authors",
      key: "authors",
      render: (authors: string[] | null) => {
        if (!authors || authors.length === 0) return <Tag color="default">No authors</Tag>;

        if (authors.length === 1) {
          return <Tag color="blue">{authors[0]}</Tag>;
        }

        return (
          <Tooltip title={authors.join(", ")}>
            <Tag color="blue">
              {authors[0]} +{authors.length - 1}
            </Tag>
          </Tooltip>
        );
      },
    },
    {
      title: "Status",
      dataIndex: "is_audited",
      key: "audit_status",
      render: (isAudited: boolean, record: IDataset) => {
        if (!isAudited) return <Tag color="red">Not Audited</Tag>;

        const audit = auditMap.get(record.id);
        if (!audit) return <Tag color="red">No Audit Data</Tag>;

        switch (audit.final_assessment) {
          case "no_issues":
            return <Tag color="green">✓ Ready</Tag>;
          case "fixable_issues":
            return <Tag color="yellow">🔧 Fixable</Tag>;
          case "exclude_completely":
            return <Tag color="red">🚫 Excluded</Tag>;
          default:
            return <Tag color="default">Unknown</Tag>;
        }
      },
      width: 120,
    },
    {
      title: "Actions",
      key: "actions",
      render: (_: unknown, record: IDataset) => {
        const isComplete = isProcessingComplete(record);

        return (
          <Tooltip
            title={!isComplete ? "Dataset processing must be complete before auditing" : "Start audit for this dataset"}
          >
            <Button type="primary" onClick={() => handleStartAudit(record.id)} disabled={!isComplete} size="small">
              {record.is_audited ? "Re-audit" : "Start Audit"}
            </Button>
          </Tooltip>
        );
      },
      width: 120,
    },
  ];

  // Conditionally include Reference Patches column only for needs-tiles and training-ready tabs
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
    width: 180,
  };

  const columns = [
    ...baseColumns,
    // Only show Reference Patches column in "needs-tiles" and "training-ready" tabs
    ...(auditFilter === "needs-tiles" || auditFilter === "training-ready" ? [referencePatchesColumn] : []),
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <Title level={3} style={{ margin: 0 }}>
          Dataset Audits
        </Title>
        <p className="mt-2 text-gray-600">
          Audit datasets that have completed processing. Only datasets with complete processing pipeline can be audited.
        </p>
      </div>

      {/* Filters */}
      <div className="mb-4 space-y-3">
        <div className="flex items-center justify-between">
          <Space size="large">
            <div>
              <Segmented
                value={auditFilter}
                onChange={(value) => handleTabChange(value as AuditFilter)}
                options={[
                  { label: `Needs Audit (${needsAuditCount})`, value: "needs-audit" },
                  { label: `Audited (${auditedCount})`, value: "audited" },
                  { label: `Reference Pending (${needsTilesCount})`, value: "needs-tiles" },
                  { label: `Reference Ready (${trainingReadyCount})`, value: "training-ready" },
                  { label: `Fixable (${fixableIssuesCount})`, value: "fixable-issues" },
                  { label: `Excluded (${excludedCount})`, value: "excluded" },
                  {
                    label: (
                      <span>
                        Flagged ({flaggedCount}){" "}
                        <Tooltip title="Datasets with user-reported issues visible only to reporters and auditors">
                          <InfoCircleOutlined />
                        </Tooltip>
                      </span>
                    ),
                    value: "flagged",
                  },
                ]}
              />
            </div>

            <div>
              <Input
                placeholder="Filter by ID"
                prefix={<SearchOutlined />}
                value={idFilter}
                onChange={(e) => setIdFilter(e.target.value)}
                style={{ width: 150 }}
                allowClear
              />
            </div>
          </Space>
        </div>

        {/* Month Filter */}
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-gray-600">Filter by Month:</span>
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
      </div>

      <Table
        dataSource={filteredDatasets}
        columns={columns}
        rowKey="id"
        loading={isDatasetLoading || isAuditsLoading || (auditFilter === "flagged" && isFlaggedLoading)}
        pagination={{
          pageSize: 20,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} datasets`,
        }}
        scroll={{ x: 800 }}
      />
    </div>
  );
}
