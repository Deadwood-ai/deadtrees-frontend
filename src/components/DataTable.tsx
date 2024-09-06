// DataTable.js
// "use client";

import { useEffect, useState } from "react";
import { Table, Tag, Tooltip } from "antd";
import { useAuth } from "../state/AuthProvider";
import { useNavigate } from "react-router-dom";
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  LinkOutlined,
  LoadingOutlined,
  SyncOutlined,
} from "@ant-design/icons";
import { Settings } from "../config";

const DataTable = ({ supabase }) => {
  const { user } = useAuth();
  const [data, setData] = useState([]);
  const nav = useNavigate();

  const fetchData = async () => {
    //
    const { data, error } = await supabase.from(Settings.DATA_TABLE_FULL).select("*").eq("user_id", user!.id);
    if (error) {
      console.error("Error fetching data:", error);
    } else {
      setData(data);
      console.log("Profile data:", data);
    }
  };

  useEffect(() => {
    const channel = supabase
      .channel("datasets_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          // table: Settings.DATA_TABLE,
        },
        (payload) => {
          if (payload.table === Settings.DATA_TABLE || payload.table === Settings.METADATA_TABLE) {
            console.log(Settings);
            console.log("Change received in DataTalbe!", payload);
            fetchData();
          }
        },
      )
      .subscribe();

    fetchData();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

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
        if (data.find((d) => d.id === tag).status == "processed") {
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
              <Tag icon={<LoadingOutlined />} color="processing">
                uploading
              </Tag>
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

  return <Table rowKey={"id"} dataSource={data} columns={columns} pagination={{ pageSize: 10 }} />;
};

export default DataTable;
