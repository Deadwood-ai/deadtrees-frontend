import React from "react";

import { Button, Table, Tag, Tooltip } from "antd";
import { useNavigate } from "react-router-dom";
import { useData } from "../hooks/useDataProvider";
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  MapOutlined,
  LinkOutlined,
  SyncOutlined,
  EnvironmentOutlined,
} from "@ant-design/icons";
import { Settings } from "../config";

const DataTable = ({ supabase }) => {
  // const [data, setData] = useState([]);
  const { userData, data, isLoading, isError, authors } = useData();
  const nav = useNavigate();
  console.log("userData", userData);
  console.log("data", data);
  console.log("isLoading", isLoading);
  const columns = [
    { title: "ID", dataIndex: "id", key: "id", defaultSortOrder: 'descend', sorter: (a, b) => a.id - b.id, },
    {
      title: "Date",
      dataIndex: "aquisition_day",
      key: "aquisition_day",
      render: (tag, record) => (
        // create date from aquisition_day, aquisition_month and aquisition_year
        <span>
          {record.aquisition_day && record.aquisition_day + "/"}
          {record.aquisition_month && record.aquisition_month + "/"}
          {record.aquisition_year}
        </span>
      ),
    },
    { title: "File", dataIndex: "file_alias", key: "file_alias" },
    // { title: "License", dataIndex: "license", key: "license" },

    {
      title: "Platform",
      dataIndex: "platform",
      key: "platform",
      render: (tag) => <Tag color="blue">{tag}</Tag>,
    },

    {
      title: "Location",
      dataIndex: "id",
      key: "id",
      render: (tag) => {
        if (userData?.find((d) => d.id === tag)?.admin_level_1) {
          return (
            <Tooltip title="View data on the map">
              <Tag color="green">
                {userData?.find((d) => d.id === tag)?.admin_level_1}, {userData?.find((d) => d.id === tag)?.admin_level_3}
              </Tag>
            </Tooltip>
          );
        } else {
          return (<Tag icon={<ClockCircleOutlined />} color="default"></Tag>);
        }
      },
    },
    {
      title: "Status",
      dataIndex: "current_status",
      key: "current_status",
      render: (tag, record) => {
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

        switch (tag) {
          case "idle":
            return (
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
      render: (tag, record) => {
        const isComplete = !record.has_error &&
          record.is_upload_done &&
          record.is_ortho_done &&
          record.is_cog_done &&
          record.is_thumbnail_done &&
          record.is_metadata_done;

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

  return (
    <Table
      rowKey={"id"}
      dataSource={userData}
      columns={columns}
      pagination={{ pageSize: 6 }}

    // size="small"
    />
  );
};

export default DataTable;

