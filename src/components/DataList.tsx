import { Avatar, List, Space, Typography, Button, notification } from "antd";
import { Dataset } from "../types/dataset";
import {
  DownloadOutlined,
  HeartOutlined,
  InfoCircleFilled,
} from "@ant-design/icons";
import { supabase } from "../components/useSupabase";

import { useNavigate } from "react-router-dom";

import { useData } from "../state/DataProvider";
import { useEffect } from "react";

export default function DataList({ data }: { data: Dataset }) {
  const { Text, Link } = Typography;
  const navigate = useNavigate();
  const { setFilter, setFilterTag } = useData();

  const onClickHandler = (item: Dataset) => {
    console.log("clicked item", item);
    if (item.uuid && item.file_size < 1000000000) {
      navigate(`/dataset/${item.uuid}`);
    } else {
      notification.info({
        message: "Coming Soon",
        description: "This dataset is not yet available",
      });
    }
  };

  const getThumbnailURL = (file_name: string) => {
    const url = supabase.storage
      .from("thumbnails")
      .getPublicUrl(file_name.replace("tif", "png"));
    return url.data.publicUrl;
  };

  const onClickFilterHandler = (
    e: React.ChangeEvent,
    filter: string,
    filterTag: string,
  ) => {
    setFilter(filter);
    setFilterTag(filterTag);
    e.stopPropagation();
    console.log(filter);
  };

  return (
    <List
      // make list scrollable
      style={{ overflow: "auto", height: "100%" }}
      itemLayout="vertical"
      dataSource={data.sort((a, b) => (a.uuid ? -1 : 1))}
      renderItem={(item, index) => (
        <List.Item key={index}>
          <div
            key={index}
            className="flex rounded-md bg-white p-3 transition duration-150 ease-in-out hover:bg-gray-200"
            onClick={() => onClickHandler(item)}
          >
            <Avatar
              shape="square"
              size={64}
              src={getThumbnailURL(item.file_name)}
            />
            <div className="flex flex-1 flex-col justify-between pl-3">
              <div className="flex items-baseline">
                <p className="m-0 flex-1 font-semibold">
                  {item.gadm_NAME_3}
                  {", "}
                  {item.gadm_NAME_0}
                </p>
                {/* <p className="text-md m-0 pl-2">{item.gadm_NAME_0}</p> */}
                {item.wms_source === null ||
                  (item.file_size > 1000000000 && <InfoCircleFilled />)}
              </div>
              <div className="flex space-x-1">
                <div className="flex-1">
                  <Button
                    type="default"
                    size="small"
                    onClick={(e) =>
                      onClickFilterHandler(
                        e,
                        item.authors_image,
                        "authors_image",
                      )
                    }
                  >
                    {item.authors_image.slice(0, 16) +
                      (item.authors_image.length > 16 ? "..." : "")}
                  </Button>
                </div>

                <Button
                  className="max-content"
                  type="default"
                  size="small"
                  onClick={(e) =>
                    onClickFilterHandler(e, item.license, "license")
                  }
                >
                  {item.license}
                </Button>
                <Button
                  className="max-content"
                  type="default"
                  size="small"
                  onClick={(e) =>
                    onClickFilterHandler(e, item.platform, "platform")
                  }
                >
                  {item.platform}
                </Button>
              </div>
            </div>
            {/* <div className="flex pr-3">
              <Button
                type="default"
                size="small"
                icon={<HeartOutlined />}
              ></Button>
            </div> */}
          </div>
        </List.Item>
      )}
    />
  );
}
