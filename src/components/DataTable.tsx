import React, { useState, useEffect } from "react";

import { Button, Table, Tag, Tooltip } from "antd";
import { useNavigate } from "react-router-dom";
import { useUserDatasets } from "../hooks/useDatasets";
import {
  ClockCircleOutlined,
  CloseCircleOutlined,
  SyncOutlined,
  EnvironmentOutlined,
  PlusOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
import { useDatasetSubscription } from "../hooks/useDatasetSubscription";
import { supabase } from "../hooks/useSupabase";
import { useAuth } from "../hooks/useAuthProvider";

interface Dataset {
  id: number;
  file_name: string;
  aquisition_day?: number;
  aquisition_month?: number;
  aquisition_year?: number;
  platform?: string;
  citation_doi?: string;
  freidata_doi?: string;
  admin_level_1?: string;
  admin_level_2?: string;
  admin_level_3?: string;
  current_status?: string;
  has_error?: boolean;
  error_message?: string;
  is_upload_done?: boolean;
  is_ortho_done?: boolean;
  is_cog_done?: boolean;
  is_thumbnail_done?: boolean;
  is_metadata_done?: boolean;
  isInPublication?: boolean; // Track if dataset is in publication process
}

interface DataTableProps {
  onSelectedRowsChange?: (selectedRows: Dataset[]) => void;
  resetSelection?: boolean; // Flag to reset selection
  onResetSelectionComplete?: () => void; // Callback when reset is complete
}

const DataTable: React.FC<DataTableProps> = ({
  onSelectedRowsChange,
  resetSelection = false,
  onResetSelectionComplete,
}) => {
  useDatasetSubscription();
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const { data: userData, isLoading: isLoadingData } = useUserDatasets();
  const { user } = useAuth();
  const [datasetsInPublication, setDatasetsInPublication] = useState<number[]>([]);

  const nav = useNavigate();

  // Effect to reset selection when requested
  useEffect(() => {
    if (resetSelection) {
      setSelectedRowKeys([]);
      if (onSelectedRowsChange) {
        onSelectedRowsChange([]);
      }
      if (onResetSelectionComplete) {
        onResetSelectionComplete();
      }
    }
  }, [resetSelection, onSelectedRowsChange, onResetSelectionComplete]);

  // Fetch datasets that are in publication process
  useEffect(() => {
    const fetchDatasetsInPublication = async () => {
      if (!user) return;

      try {
        // Get all publications by this user that don't have a DOI yet
        const { data: publications } = await supabase.from("data_publication").select("id, doi").eq("user_id", user.id);

        if (!publications || publications.length === 0) return;

        // Filter publications that don't have a DOI yet
        const pendingPublicationIds = publications.filter((pub) => !pub.doi).map((pub) => pub.id);

        if (pendingPublicationIds.length === 0) return;

        // Get all datasets linked to these pending publications
        const { data: linkedDatasets } = await supabase
          .from("jt_data_publication_datasets")
          .select("dataset_id")
          .in("publication_id", pendingPublicationIds);

        if (!linkedDatasets) return;

        // Extract the dataset IDs
        const pendingDatasetIds = linkedDatasets.map((item) => item.dataset_id);
        setDatasetsInPublication(pendingDatasetIds);
      } catch (error) {
        console.error("Error fetching datasets in publication:", error);
      }
    };

    fetchDatasetsInPublication();
  }, [user]);

  console.log("userData in DataTable", userData);

  const isDatasetComplete = (record: Dataset): boolean => {
    return !!(
      !record.has_error &&
      record.is_upload_done &&
      record.is_ortho_done &&
      record.is_cog_done &&
      record.is_thumbnail_done &&
      record.is_metadata_done
    );
  };

  const handleAddToSelection = (record: Dataset) => {
    const newKeys = [...selectedRowKeys, record.id];
    setSelectedRowKeys(newKeys);

    if (onSelectedRowsChange && userData) {
      const selectedRows = userData.filter((item) => newKeys.includes(item.id));
      onSelectedRowsChange(selectedRows as Dataset[]);
    }
  };

  const columns = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      defaultSortOrder: "descend" as const,
      sorter: (a: Dataset, b: Dataset) => a.id - b.id,
    },
    {
      title: "Date",
      dataIndex: "aquisition_day",
      key: "aquisition_day",
      render: (_: unknown, record: Dataset) => (
        <span>
          {record.aquisition_day && record.aquisition_day + "/"}
          {record.aquisition_month && record.aquisition_month + "/"}
          {record.aquisition_year}
        </span>
      ),
    },
    {
      title: "Publication Status",
      dataIndex: "freidata_doi",
      key: "publication_status",
      render: (freidataDoiValue: string | undefined, record: Dataset) => {
        // Dataset has a FreiDATA DOI
        if (freidataDoiValue) {
          return (
            <Tooltip title="View publication">
              <a href={`https://doi.org/${freidataDoiValue}`} target="_blank" rel="noopener noreferrer">
                <img src={`https://freidata.uni-freiburg.de/badge/DOI/${freidataDoiValue}.svg`} alt="FreiDATA badge" />
              </a>
            </Tooltip>
          );
        }

        // Dataset has a regular DOI (already published elsewhere)
        if (record.citation_doi) {
          return (
            <Tooltip title="View publication">
              <Button
                type="link"
                size="small"
                className="m-0 p-0"
                href={`https://doi.org/${record.citation_doi}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <img src={`https://zenodo.org/badge/DOI/${record.citation_doi}.svg`} alt="Zenodo badge" />
              </Button>
            </Tooltip>
          );
        }

        // Dataset is in publication process but doesn't have a DOI yet
        if (datasetsInPublication.includes(record.id)) {
          return (
            <Tooltip title="Publication in review">
              <Tag color="orange" icon={<SyncOutlined spin />}>
                In Review
              </Tag>
            </Tooltip>
          );
        }

        // Dataset has no DOI, show add button
        return (
          <Button
            type="primary"
            size="small"
            icon={<PlusOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              handleAddToSelection(record);
            }}
            disabled={selectedRowKeys.includes(record.id) || !isDatasetComplete(record)}
          >
            {selectedRowKeys.includes(record.id) ? "Added" : "publish"}
          </Button>
        );
      },
    },
    {
      title: "Platform",
      dataIndex: "platform",
      key: "platform",
      render: (tag: string | undefined) => (tag ? <Tag color="blue">{tag}</Tag> : null),
    },
    {
      title: "Location",
      dataIndex: "id",
      key: "id",
      render: (tag: number) => {
        if (userData?.find((d) => d.id === tag)?.admin_level_1) {
          return (
            <Tooltip title="View data on the map">
              <Tag color="green">
                {userData?.find((d) => d.id === tag)?.admin_level_1},{" "}
                {userData?.find((d) => d.id === tag)?.admin_level_3 ||
                  userData?.find((d) => d.id === tag)?.admin_level_2}
              </Tag>
            </Tooltip>
          );
        } else {
          return <Tag icon={<ClockCircleOutlined />} color="default"></Tag>;
        }
      },
    },
    {
      title: "Status",
      dataIndex: "current_status",
      key: "current_status",
      render: (tag: string | undefined, record: Dataset) => {
        // Check for error state first
        if (record.has_error) {
          return (
            <Tooltip title={record.error_message || "An error occurred during processing"}>
              <Tag icon={<CloseCircleOutlined />} color="error">
                error
              </Tag>
            </Tooltip>
          );
        }

        // Check if processing is complete
        const isComplete = isDatasetComplete(record);

        switch (tag) {
          case "idle":
            return isComplete ? (
              <Tooltip title="Processing complete">
                <Tag color="success" icon={<CheckCircleOutlined />} />
              </Tooltip>
            ) : (
              <Tooltip title="Waiting to start processing">
                <Tag icon={<ClockCircleOutlined />} color="default">
                  idle
                </Tag>
              </Tooltip>
            );
          case "uploading":
            return (
              <Tooltip title="File is being uploaded">
                <Tag icon={<SyncOutlined spin />} color="processing">
                  uploading
                </Tag>
              </Tooltip>
            );
          case "ortho_processing":
            return (
              <Tooltip title="Processing orthophoto">
                <Tag icon={<SyncOutlined spin />} color="processing">
                  ortho processing
                </Tag>
              </Tooltip>
            );
          case "cog_processing":
            return (
              <Tooltip title="Converting to Cloud Optimized GeoTIFF">
                <Tag icon={<SyncOutlined spin />} color="processing">
                  COG processing
                </Tag>
              </Tooltip>
            );
          case "thumbnail_processing":
            return (
              <Tooltip title="Generating thumbnail">
                <Tag icon={<SyncOutlined spin />} color="processing">
                  thumbnail
                </Tag>
              </Tooltip>
            );
          case "deadwood_segmentation":
            return (
              <Tooltip title="Running deadwood detection">
                <Tag icon={<SyncOutlined spin />} color="processing">
                  deadwood detection
                </Tag>
              </Tooltip>
            );
          case "forest_cover_segmentation":
            return (
              <Tooltip title="Analyzing forest cover">
                <Tag icon={<SyncOutlined spin />} color="processing">
                  forest cover
                </Tag>
              </Tooltip>
            );
          case "metadata_processing":
            return (
              <Tooltip title="Processing metadata">
                <Tag icon={<SyncOutlined spin />} color="processing">
                  metadata
                </Tag>
              </Tooltip>
            );
          case "audit_in_progress":
            return (
              <Tooltip title="Quality check in progress">
                <Tag icon={<SyncOutlined spin />} color="warning">
                  audit
                </Tag>
              </Tooltip>
            );
          default:
            return (
              <Tag icon={<ClockCircleOutlined />} color="default">
                {tag}
              </Tag>
            );
        }
      },
    },
    {
      title: "Actions",
      dataIndex: "id",
      key: "id",
      render: (tag: number, record: Dataset) => {
        const isComplete = isDatasetComplete(record);

        return (
          <Button
            size="small"
            type="primary"
            icon={<EnvironmentOutlined />}
            onClick={() => nav(`/dataset/${tag}`)}
            disabled={!isComplete}
          >
            View
          </Button>
        );
      },
    },
  ];

  const handleSelectionChange = (keys: React.Key[], rows: Dataset[]) => {
    setSelectedRowKeys(keys);
    if (onSelectedRowsChange) {
      onSelectedRowsChange(rows);
    }
  };

  return (
    <Table
      rowKey={"id"}
      rowSelection={{
        selectedRowKeys,
        onChange: (selectedRowKeys, selectedRows) => {
          console.log(`selectedRowKeys: ${selectedRowKeys}`, "selectedRows: ", selectedRows);
          handleSelectionChange(selectedRowKeys, selectedRows as Dataset[]);
        },
        getCheckboxProps: (record: Dataset) => ({
          // Disable selection for datasets that already have a DOI or are incomplete
          disabled: !!record.freidata_doi || !!record.citation_doi || !isDatasetComplete(record),
        }),
        renderCell: (checked, record, index, originNode) => {
          const dataset = record as Dataset;
          let tooltipText = "Click to add to publication";

          if (dataset.freidata_doi || dataset.citation_doi) {
            tooltipText = "Already published";
          } else if (!isDatasetComplete(dataset)) {
            tooltipText = "Processing not complete";
          }

          return <Tooltip title={tooltipText}>{originNode}</Tooltip>;
        },
      }}
      dataSource={userData as Dataset[]}
      columns={columns}
      pagination={{ pageSize: 10 }}
      loading={isLoadingData}
    />
  );
};

export default DataTable;
