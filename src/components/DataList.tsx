import { Avatar, List, Space, Typography, Button } from "antd";
import { Dataset } from "../types/dataset";
import { DownloadOutlined, HeartOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";

import { useData } from "../state/DataProvider";

export default function DataList({ data }: { data: Dataset }) {
  const { Text, Link } = Typography;
  const navigate = useNavigate();
  const { setFilter } = useData();

  const onClickFilterHandler = (e: React.ChangeEvent, filter: string) => {
    setFilter(filter);
    e.stopPropagation();
    console.log(filter);
  };

  return (
    <List
      // make list scrollable
      style={{ overflow: "auto", height: "100%" }}
      itemLayout="vertical"
      dataSource={data}
      renderItem={(item, index) => (
        <List.Item key={index}>
          <div
            key={index}
            className="flex rounded-md bg-white p-3 transition duration-150 ease-in-out hover:bg-gray-200"
            onClick={() => navigate(`/dataset/${item.uuid}`)}
          >
            <Avatar
              size={64}
              src="https://avatars.githubusercontent.com/u/8186664?v=7"
            />
            <div className="flex flex-1 flex-col justify-between pl-3">
              <p className="m-0 font-semibold">
                {item.file_name.replace(".tif", "")}
              </p>
              <div>
                <Space size="small">
                  <Button
                    type="default"
                    size="small"
                    onClick={(e) => onClickFilterHandler(e, item.content_type)}
                  >
                    {item.content_type}
                  </Button>
                  <Button
                    type="default"
                    size="small"
                    onClick={(e) => onClickFilterHandler(e, item.license)}
                  >
                    {item.license}
                  </Button>
                </Space>
              </div>
            </div>
            <div className="flex pr-3">
              <Button
                type="default"
                size="small"
                icon={<HeartOutlined />}
              ></Button>
            </div>
          </div>
        </List.Item>
      )}
    />
  );
}
