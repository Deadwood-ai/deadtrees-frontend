import { Avatar, List, Space, Typography, Button } from "antd";
import { useState } from "react";
import { Database } from "../types/supabase";
import { DownloadOutlined } from "@ant-design/icons";

export default function DataList({ data }: { data: Database }) {
  const [hovered, setHovered] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState(0);
  const { Text, Link } = Typography;

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
            style={{
              padding: "12px",
              // border: `1px solid`,
              backgroundColor: `${hovered && hoveredIndex === index ? "gray" : "lightgray"}`,
              borderRadius: "4px",
              display: "flex",
            }}
            onMouseEnter={() => {
              setHovered(true);
              setHoveredIndex(index);
            }}
            onMouseLeave={() => setHovered(false)}
          >
            <Avatar size={64} src="https://avatars.githubusercontent.com/u/8186664?v=7" />
            <div
              style={{
                paddingLeft: "12px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                flex: 1,
              }}
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
            <div
              style={{
                paddingLeft: "12px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
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
