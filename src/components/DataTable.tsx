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
  const { userData } = useData();
  const nav = useNavigate();
  console.log("userData", userData);

  const columns = [
    { title: "ID", dataIndex: "id", key: "id" },
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
      dataIndex: "status",
      key: "status",
      render: (tag) => {
        switch (tag) {
          case "pending":
            return (
              <Tooltip title="Data will be processed shortly">
                <Tag icon={<ClockCircleOutlined />} color="default">
                  waiting for processing
                </Tag>
              </Tooltip>
            );
          case "uploading":
            return (
              <Tag icon={<SyncOutlined spin />} color="processing">
                uploading
              </Tag>
            );
          case "uploaded":
            return (
              <Tooltip title="Data will be processed shortly">
                <Tag icon={<ClockCircleOutlined />} color="default">
                  waiting for processing
                </Tag>
              </Tooltip>
            );
          case "processed":
            return (
              <Tag icon={<CheckCircleOutlined />} color="success">
                {tag}
              </Tag>
            );
          case "processing":
            return (
              <Tag icon={<SyncOutlined spin />} color="processing">
                {tag}
              </Tag>
            );
          case "errored":
            return (
              <Tag icon={<CloseCircleOutlined spin />} color="error">
                {tag}
              </Tag>
            );
          case "cog_processing":
            return (
              <Tag icon={<SyncOutlined spin />} color="processing">
                COG processing
              </Tag>
            );
          case "cog_error":
            return (
              <Tag icon={<CloseCircleOutlined spin />} color="error">
                COG error
              </Tag>
            );
          case "thumbnail_processing":
            return (
              <Tag icon={<SyncOutlined spin />} color="processing">
                Thumbnail processing
              </Tag>
            );
          case "thumbnail_error":
            return (
              <Tag icon={<CloseCircleOutlined spin />} color="error">
                Thumbnail error
              </Tag>
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
      render: (tag) => {
        if (userData?.find((d) => d.id === tag)?.status == "processed") {
          return (
            <Button size="small" type="primary" icon={<EnvironmentOutlined />} onClick={() => nav(`/dataset/${tag}`)}>
              View
            </Button>
          );
        } else {
          return (<Button disabled size="small" type="primary" icon={<EnvironmentOutlined />} onClick={() => nav(`/dataset/${tag}`)}>
            View
          </Button>)
        }
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

