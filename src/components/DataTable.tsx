import React from "react";

import { Table, Tag, Tooltip } from "antd";
import { useNavigate } from "react-router-dom";
import { useData } from "../hooks/useDataProvider";
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  LinkOutlined,
  SyncOutlined,
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
    { title: "License", dataIndex: "license", key: "license" },

    {
      title: "Platform",
      dataIndex: "platform",
      key: "platform",
      render: (tag) => <Tag color="blue">{tag}</Tag>,
    },

    {
      title: "Map",
      dataIndex: "id",
      key: "id",
      render: (tag) => {
        if (userData?.find((d) => d.id === tag).status == "processed") {
          return (
            <Tooltip title="View data on the map">
              <Tag color="green" onClick={() => nav(`/dataset/${tag}`)} icon={<LinkOutlined />}></Tag>
            </Tooltip>
          );
        } else {
          return (
            <Tooltip title="Data is being processed">
              <Tag icon={<ClockCircleOutlined />} color="default" />
            </Tooltip>
          );
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
              <Tooltip title="Data will be processed once the audit and processing pipeline is ready.">
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
  ];

  return <Table rowKey={"id"} dataSource={userData} columns={columns} pagination={{ pageSize: 10 }} />;
};

export default DataTable;
