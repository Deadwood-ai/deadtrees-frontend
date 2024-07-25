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
          table: Settings.DATA_TABLE,
        },
        (payload) => {
          console.log("Change received in DataTalbe!", payload);
          fetchData();
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
    { title: "Date", dataIndex: "aquisition_date", key: "aquisition_date" },
    { title: "File", dataIndex: "file_alias", key: "file_alias" },
    { title: "License", dataIndex: "license", key: "license" },

    {
      title: "Platform",
      dataIndex: "platform",
      key: "platform",
      render: (tag) => <Tag color="blue">{tag}</Tag>,
    },

    {
      title: "Link",
      dataIndex: "id",
      key: "id",
      render: (tag) => {
        if (!tag) {
          return (
            <Tooltip title="Wait for the status: 'processed'">
              <Tag color="green" onClick={() => nav(`/dataset/${tag}`)} icon={<LinkOutlined />}></Tag>
            </Tooltip>
          );
        } else {
          return <Tag icon={<ClockCircleOutlined />} color="default" />;
        }
      },
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (tag) => {
        if (tag === "panding") {
          return (
            <Tag icon={<LoadingOutlined />} color="processing">
              uploading
            </Tag>
          );
        } else if (tag === "processed") {
          return (
            <Tag icon={<CheckCircleOutlined />} color="success">
              {tag}
            </Tag>
          );
        } else if (tag === "processing") {
          return (
            <Tag icon={<SyncOutlined spin />} color="processing">
              {tag}
            </Tag>
          );
        } else {
          return (
            <Tag icon={<CloseCircleOutlined />} color="error">
              {tag}
            </Tag>
          );
        }
      },
      // <Tag color="processing" st>{tag}</Tag>},
    },
  ];

  return <Table rowKey={"id"} dataSource={data} columns={columns} pagination={{ pageSize: 10 }} />;
};

export default DataTable;
