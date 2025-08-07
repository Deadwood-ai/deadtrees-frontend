import React, { useState, useEffect } from "react";

import { Button, Table, Tag, Tooltip, Dropdown, MenuProps } from "antd";
import { useNavigate } from "react-router-dom";
import { useUserDatasets } from "../hooks/useDatasets";
import {
  SyncOutlined,
  EnvironmentOutlined,
  PlusOutlined,
  DownOutlined,
  EditOutlined,
  MinusOutlined,
} from "@ant-design/icons";
import { supabase } from "../hooks/useSupabase";
import { useAuth } from "../hooks/useAuthProvider";
import EditDatasetModal from "./EditDatasetModal";
import ProcessingProgress from "./ProcessingProgress";
import { isGeonadirDataset } from "../utils/datasetUtils";
import { fixAuthorNamesEncoding, sanitizeText } from "../utils/textUtils";
import { IDataset } from "../types/dataset";

interface Dataset {
  id: number;
  file_name: string;
  aquisition_day?: number;
  aquisition_month?: number;
  aquisition_year?: number;
  platform?: string;
  authors?: string[];
  additional_information?: string;
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
  is_deadwood_done?: boolean;
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
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const { data: userData, isLoading: isLoadingData } = useUserDatasets();
  const { user } = useAuth();
  const [datasetsInPublication, setDatasetsInPublication] = useState<number[]>([]);

  // State for edit modal
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedDatasetForEdit, setSelectedDatasetForEdit] = useState<Dataset | null>(null);

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
      record.is_metadata_done &&
      record.is_deadwood_done
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

  const handleRemoveFromSelection = (record: Dataset) => {
    const newKeys = selectedRowKeys.filter((key) => key !== record.id);
    setSelectedRowKeys(newKeys);

    if (onSelectedRowsChange && userData) {
      const selectedRows = userData.filter((item) => newKeys.includes(item.id));
      onSelectedRowsChange(selectedRows as Dataset[]);
    }
  };

  const handleEditDataset = (record: Dataset) => {
    setSelectedDatasetForEdit(record);
    setEditModalVisible(true);
  };

  const handleCloseEditModal = () => {
    setEditModalVisible(false);
    setSelectedDatasetForEdit(null);
  };

  const getActionMenuItems = (record: Dataset): MenuProps["items"] => {
    const isComplete = isDatasetComplete(record);
    const isSelected = selectedRowKeys.includes(record.id);
    const isPublished = !!record.freidata_doi || !!record.citation_doi;

    const publishAction = isSelected
      ? {
          key: "remove-publish",
          label: "Remove from Publication",
          icon: <MinusOutlined />,
          onClick: () => handleRemoveFromSelection(record),
        }
      : {
          key: "publish",
          label: "Quick Publish",
          icon: <PlusOutlined />,
          disabled: !isComplete || isPublished,
          onClick: () => handleAddToSelection(record),
        };

    return [
      {
        key: "view",
        label: "View Map",
        icon: <EnvironmentOutlined />,
        disabled: !isComplete,
        onClick: () => nav(`/dataset/${record.id}`),
      },
      {
        key: "edit",
        label: "Edit Metadata",
        icon: <EditOutlined />,
        onClick: () => handleEditDataset(record),
      },
      // Only show publish/remove action if not already published
      ...(!isPublished ? [publishAction] : []),
    ];
  };

  const columns = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      defaultSortOrder: "descend" as const,
      sorter: (a: Dataset, b: Dataset) => a.id - b.id,
      width: 80,
    },
    {
      title: "Date",
      dataIndex: "aquisition_day",
      key: "aquisition_day",
      width: 120,
      sorter: (a: Dataset, b: Dataset) => {
        // Create comparable date values (YYYYMMDD format for sorting)
        const dateA = (a.aquisition_year || 0) * 10000 + (a.aquisition_month || 0) * 100 + (a.aquisition_day || 0);
        const dateB = (b.aquisition_year || 0) * 10000 + (b.aquisition_month || 0) * 100 + (b.aquisition_day || 0);
        return dateA - dateB;
      },
      render: (_: unknown, record: Dataset) => (
        <span>
          {record.aquisition_day && record.aquisition_day + "/"}
          {record.aquisition_month && record.aquisition_month + "/"}
          {record.aquisition_year}
        </span>
      ),
    },
    {
      title: "File Name",
      dataIndex: "file_name",
      key: "file_name",
      width: 200,
      sorter: (a: Dataset, b: Dataset) => {
        // Case-insensitive string comparison
        const fileNameA = a.file_name?.toLowerCase() || "";
        const fileNameB = b.file_name?.toLowerCase() || "";
        return fileNameA.localeCompare(fileNameB);
      },
      render: (fileName: string) => (
        <Tooltip title={fileName}>
          <span className="block max-w-[180px] truncate">{fileName}</span>
        </Tooltip>
      ),
    },
    {
      title: "Platform",
      dataIndex: "platform",
      key: "platform",
      width: 100,
      render: (tag: string | undefined) => (tag ? <Tag color="blue">{tag}</Tag> : null),
    },
    {
      title: "Authors",
      dataIndex: "authors",
      key: "authors",
      width: 200,
      render: (authors: string[] | undefined, record: Dataset) => {
        if (!authors || authors.length === 0) return null;

        // Clean author names to fix encoding issues
        const cleanedAuthors = fixAuthorNamesEncoding(authors);
        if (cleanedAuthors.length === 0) return null;

        const isFromGeonadir = isGeonadirDataset(record as unknown as IDataset);
        const maxVisible = 2;
        const visibleAuthors = cleanedAuthors.slice(0, maxVisible);
        const remainingCount = cleanedAuthors.length - maxVisible;

        return (
          <div className="flex flex-wrap gap-1">
            {visibleAuthors.map((author, index) => (
              <Tag key={index} color="geekblue" className="text-xs">
                {author}
              </Tag>
            ))}
            {remainingCount > 0 && (
              <Tooltip title={`Additional authors: ${cleanedAuthors.slice(maxVisible).join(", ")}`}>
                <Tag color="default" className="text-xs">
                  +{remainingCount} more
                </Tag>
              </Tooltip>
            )}
            {isFromGeonadir && (
              <Tag color="orange" className="text-xs">
                via GeoNadir
              </Tag>
            )}
          </div>
        );
      },
    },
    {
      title: "Info",
      dataIndex: "additional_information",
      key: "additional_information",
      width: 200,
      render: (info: string | undefined) => {
        if (!info) return null;

        // Clean the additional information text to fix encoding issues
        const cleanedInfo = sanitizeText(info);
        if (!cleanedInfo) return null;

        return (
          <Tooltip title={cleanedInfo}>
            <span className="block max-w-[180px] truncate">{cleanedInfo}</span>
          </Tooltip>
        );
      },
    },
    {
      title: "Publication",
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

        // Dataset has no DOI, show add/remove button based on selection state
        const isSelected = selectedRowKeys.includes(record.id);
        const isComplete = isDatasetComplete(record);

        if (isSelected) {
          // Show remove button for selected datasets
          return (
            <Button
              type="default"
              size="small"
              icon={<MinusOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveFromSelection(record);
              }}
            >
              Remove
            </Button>
          );
        } else {
          // Show add button for unselected datasets
          return (
            <Button
              type="primary"
              size="small"
              icon={<PlusOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                handleAddToSelection(record);
              }}
              disabled={!isComplete}
            >
              Publish
            </Button>
          );
        }
      },
    },
    {
      title: "Status",
      dataIndex: "current_status",
      key: "current_status",
      width: 180,
      render: (tag: string | undefined, record: Dataset) => {
        // Handle audit status separately as it's not part of the main processing pipeline
        if (tag === "audit_in_progress") {
          return (
            <Tooltip title="Quality check in progress">
              <Tag icon={<SyncOutlined spin />} color="warning">
                audit
              </Tag>
            </Tooltip>
          );
        }

        // Use ProcessingProgress component for all other statuses
        return <ProcessingProgress dataset={record} />;
      },
    },
    {
      title: "Actions",
      dataIndex: "id",
      key: "id",
      render: (_: number, record: Dataset) => {
        return (
          <Dropdown menu={{ items: getActionMenuItems(record) }} trigger={["click"]} placement="bottomRight">
            <Button size="small">
              Actions <DownOutlined />
            </Button>
          </Dropdown>
        );
      },
    },
  ];

  return (
    <>
      <Table
        rowKey={"id"}
        dataSource={userData as Dataset[]}
        columns={columns}
        pagination={{ pageSize: 50 }}
        loading={isLoadingData}
        rowClassName={(record) => {
          const isSelected = selectedRowKeys.includes(record.id);
          return isSelected ? "bg-blue-50 hover:bg-blue-100" : "";
        }}
      />

      {selectedDatasetForEdit && (
        <EditDatasetModal visible={editModalVisible} onClose={handleCloseEditModal} dataset={selectedDatasetForEdit} />
      )}
    </>
  );
};

export default DataTable;
