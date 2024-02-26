// DataTable.js
"use client";

import { useEffect, useState } from "react";
import { Table, Tag } from "antd";
import { useAuth } from "../state/AuthProvider";

const DataTable = ({ supabase }) => {
  const { user } = useAuth();
  const [data, setData] = useState([]);

  const fetchData = async () => {
    //
    const { data, error } = await supabase.from("upload_files_dev").select("*").eq("user_id", user!.id);
    if (error) {
      console.error("Error fetching data:", error);
    } else {
      setData(data);
    }
  };

  useEffect(() => {
    const channel = supabase
      .channel("metadata")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "upload_files_dev",
        },
        (payload) => {
          console.log("Change received!", payload);
          fetchData();
        }
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
    { title: "File", dataIndex: "file_name", key: "file_name" },
    { title: "Type", dataIndex: "content_type", key: "content_type" },
    { title: "License", dataIndex: "license", key: "license" },

    {
      title: "Platform",
      dataIndex: "platform",
      key: "platform",
      render: (tag) => <Tag color="blue">{tag}</Tag>,
    },

    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (tag) => <Tag color="green">{tag}</Tag>,
    },
  ];

  return <Table rowKey={"id"} dataSource={data} columns={columns} pagination={{ pageSize: 10 }} />;
};

export default DataTable;
