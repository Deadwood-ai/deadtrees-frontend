import { Avatar, List, Space, Typography, Button } from "antd";
import { useState } from "react";
import { Dataset } from "../types/dataset";
import { DownloadOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";

export default function DataList({ data }: { data: Dataset }) {
  const { Text, Link } = Typography;
  const navigate = useNavigate();

  return (
    <List
      itemLayout="vertical"
      dataSource={data}
      renderItem={(item, index) => (
        <List.Item
          key={index}
          style={{
            margin: 0,
          }}
        >
          <div
            key={index}
            className="flex p-3 bg-gray-200 rounded-md hover:bg-gray-300 transition duration-150 ease-in-out"
            // onMouseEnter={() => {}}
            onClick={() => navigate(`/dataset/${item.uuid}`)}
          >
            <Avatar size={64} src="https://avatars.githubusercontent.com/u/8186664?v=7" />
            <div
              className="flex flex-1 flex-col justify-between pl-3"
              // style={{
              //   paddingLeft: "12px",
              //   display: "flex",
              //   flexDirection: "column",
              //   justifyContent: "space-between",
              //   flex: 1,
              // }}
            >
              <Text strong>{item.file_name}</Text>
              <div>
                <Space size="small">
                  <Button type="default" size="small">
                    {item.content_type}
                  </Button>
                  <Button type="default" size="small">
                    {item.license}
                  </Button>
                </Space>
              </div>
            </div>
            <div className="flex flex-col justify-between p-3">
              <Button type="default" size="small" icon={<DownloadOutlined />}>
                {/* {item.platform} */}
              </Button>
            </div>
          </div>
        </List.Item>
      )}
    />
  );
}
