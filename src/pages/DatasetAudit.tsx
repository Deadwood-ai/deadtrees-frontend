import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Table, Button, Typography, message, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { useAuth } from "../hooks/useAuth";
import { useDatasets } from "../hooks/useDatasets";
import { useDatasetAudits, AuditFormValues } from "../hooks/useDatasetAudit";
import DatasetAuditDetail from "../components/DatasetAudit/DatasetAuditDetail";
import { SortOrder } from "antd/es/table/interface";

const { Title } = Typography;

export default function DatasetAudit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isLoading: isAuthLoading } = useAuth();
  const { data: datasets, isLoading: isDatasetLoading } = useDatasets();
  const { data: auditData, isLoading: isAuditLoading } = useDatasetAudits();
  const [isStartingNewAudit, setIsStartingNewAudit] = useState(false);

  // Check if user has processor role
  useEffect(() => {
    if (!isAuthLoading && user && user.role !== "processor") {
      message.error("You do not have permission to access this page");
      navigate("/");
    }
  }, [user, isAuthLoading, navigate]);

  // Handle "new" audit navigation in useEffect to avoid React Router warning
  useEffect(() => {
    // Only run this if we're on the "new" route and we haven't started a new audit yet
    if (id === "new" && !isStartingNewAudit && datasets && auditData) {
      setIsStartingNewAudit(true);

      const datasetIdsWithAudits = auditData.map((audit) => audit.dataset_id) || [];
      const datasetsWithoutAudits = datasets.filter((dataset) => !datasetIdsWithAudits.includes(dataset.id)) || [];

      if (datasetsWithoutAudits.length === 0) {
        message.info("All datasets have been audited");
        navigate("/dataset-audit");
      } else {
        // Select the first dataset without an audit
        const nextDatasetId = datasetsWithoutAudits[0].id;
        navigate(`/dataset-audit/${nextDatasetId}`);
      }
    }
  }, [id, isStartingNewAudit, datasets, auditData, navigate]);

  // If we're on the detail view (but not the "new" view), show the audit form
  if (id && id !== "new") {
    const dataset = datasets?.find((d) => d.id.toString() === id);

    if (isDatasetLoading) return <div>Loading dataset...</div>;
    if (!dataset) return <div>Dataset not found</div>;

    return <DatasetAuditDetail dataset={dataset} />;
  }

  // If we're waiting for the "new" audit to process, show a loading state
  if (id === "new") {
    return <div className="p-6">Finding unaudited dataset...</div>;
  }

  // Define table columns
  const columns: ColumnsType<AuditFormValues> = [
    {
      title: "ID",
      dataIndex: "dataset_id",
      key: "dataset_id",
    },
    {
      title: "Location",
      dataIndex: "dataset_id",
      key: "location",
      render: (datasetId: number) => {
        const dataset = datasets?.find((d) => d.id === datasetId);
        return dataset
          ? `${dataset.admin_level_2 || dataset.admin_level_3 || ""}, ${dataset.admin_level_1 || "Unknown"}`
          : "Unknown";
      },
    },
    {
      title: "Audit Date",
      dataIndex: "audit_date",
      key: "audit_date",
      render: (date: string) => new Date(date).toLocaleDateString(),
      sorter: (a: AuditFormValues, b: AuditFormValues) => {
        return new Date(a.audit_date || 0).getTime() - new Date(b.audit_date || 0).getTime();
      },
      defaultSortOrder: "descend" as SortOrder,
    },
    {
      title: "Deadwood Quality",
      dataIndex: "deadwood_quality",
      key: "deadwood_quality",
      render: (quality: string) => {
        if (!quality) return <Tag color="default">Not Audited</Tag>;

        const colors = {
          great: "green",
          sentinel_ok: "blue",
          bad: "red",
        };

        return <Tag color={colors[quality as keyof typeof colors] || "default"}>{quality}</Tag>;
      },
      filters: [
        { text: "Great", value: "great" },
        { text: "Sentinel OK", value: "sentinel_ok" },
        { text: "Bad", value: "bad" },
        { text: "Not Audited", value: "" }, // Empty string instead of null
      ],
      onFilter: (value, record) => {
        if (value === "") return !record.deadwood_quality;
        return record.deadwood_quality === value;
      },
    },
    {
      title: "AOI Done",
      dataIndex: "aoi_done",
      key: "aoi_done",
      render: (done: boolean) => (done ? <Tag color="green">Yes</Tag> : <Tag color="red">No</Tag>),
      filters: [
        { text: "Yes", value: true },
        { text: "No", value: false },
      ],
      onFilter: (value, record) => record.aoi_done === value,
    },
    {
      title: "Actions",
      key: "actions",
      render: (_: unknown, record: AuditFormValues) => (
        <Button type="primary" onClick={() => navigate(`/dataset-audit/${record.dataset_id}`)}>
          Audit
        </Button>
      ),
    },
  ];

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center">
          <Button shape="circle" icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)} className="mr-4" />
          <Title level={3} style={{ margin: 0 }}>
            Dataset Audits
          </Title>
        </div>
        <Button type="primary" onClick={() => navigate("/dataset-audit/new")}>
          Start New Audit
        </Button>
      </div>

      <Table
        dataSource={auditData || []}
        columns={columns}
        rowKey="dataset_id"
        loading={isAuditLoading}
        pagination={{ pageSize: 10 }}
      />
    </div>
  );
}
