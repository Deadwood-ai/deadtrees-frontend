import { Button, Col, Input, Row, Tag } from "antd";
import { useData } from "../state/DataProvider";
import DataList from "../components/DataList";
import Map from "../components/DatasetMap";
import { useState } from "react";
import {
  ArrowDownOutlined,
  ClockCircleOutlined,
  CloseCircleFilled,
  CloseOutlined,
} from "@ant-design/icons";

export default function Dataset() {
  const { data, filter, setFilter } = useData();
  // filter for elements of data with status "processed"
  const processedData = data?.filter(
    (d) => d.status === "processed" || d.status === null,
  );
  const [uuidHovered, setUuidHovered] = useState<string | null>(null);

  return (
    <div className="flex h-full ">
      <div className="flex h-full w-96 flex-col  py-4 pr-4 align-middle">
        {filter ? (
          <div className="flex justify-between pb-2">
            <div className="flex items-center">
              <h4 className="m-0">Filtered by: </h4>
              {
                <Tag className="m-0 ml-1" color="blue">
                  <span className="text-sm font-medium">
                    {filter.slice(0, 10) + (filter.length > 10 ? "..." : "")}
                  </span>
                  <Button
                    className=" ml-2 border-none bg-transparent"
                    size="small"
                    shape="circle"
                    onClick={() => setFilter("")}
                    icon={<CloseOutlined />}
                  />
                </Tag>
              }
            </div>
            <div className="flex items-center">
              <h4 className="m-0 pr-2">Images: </h4>
              <Tag>
                <span>{data?.length}</span>
              </Tag>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-end pb-2">
            <h4 className="m-0 pr-2">Images: </h4>
            <Tag>
              <span>{data?.length}</span>
            </Tag>
          </div>
        )}

        {/* <div className="flex pb-4">
          <Input.Search placeholder="Search" />
          <div className="pl-4">
            <Button icon={<ArrowDownOutlined />} type="primary"></Button>
          </div>
        </div> */}
        {data ? (
          <DataList data={processedData} setUuidHovered={setUuidHovered} />
        ) : (
          <div>Loading...</div>
        )}
      </div>
      <div className="flex-1 py-4">
        <Map data={processedData} uuidHovered={uuidHovered} />
      </div>
    </div>
  );
}
