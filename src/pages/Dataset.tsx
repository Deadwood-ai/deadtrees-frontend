import { useState } from "react";
import { Button, Col, Row, Tag, Input } from "antd";
import { ArrowDownOutlined } from "@ant-design/icons";

import { useData } from "../state/DataProvider";
import DataList from "../components/DataList";
import DatasetMapOL from "../components/DatasetMap/DatasetMapOL";
import { CloseOutlined } from "@ant-design/icons";

export default function Dataset() {
  const { data, filter, setFilter } = useData();
  const [hoveredItem, setHoveredItem] = useState<number | null>(null);
  // filter for elements of data with status "processed"
  // console.log("data in Dataset", data);

  const processedData = data?.filter((d) => d.status === "processed" && d.admin_level_1);
  // console.log("processedData in Dataset", processedData);
  // const [uuidHovered, setUuidHovered] = useState<string | null>(null);

  return (
    <Row
      style={{
        width: "100%",
        height: "100%",
      }}
    >
      <Col className="flex h-full w-96 flex-col  py-4 pr-4 align-middle">
        {filter ? (
          <div className="flex justify-between pb-2">
            <div className="flex items-center">
              <h4 className="m-0">Filtered by: </h4>
              {
                <Tag className="m-0 ml-1" color="blue">
                  <span className="text-sm font-medium">{filter.slice(0, 10) + (filter.length > 10 ? "..." : "")}</span>
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
                <span>{processedData?.length}</span>
              </Tag>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-end pb-2">
            <h4 className="m-0 pr-2">Images: </h4>
            <Tag>
              <span>{processedData?.length}</span>
            </Tag>
          </div>
        )}

        {/* <div className="flex pb-4">
          <Input.Search placeholder="Search" />
          <div className="pl-4">
            <Button icon={<ArrowDownOutlined />} type="primary"></Button>
          </div>
        </div> */}
        {processedData ? (
          <DataList data={processedData} hoveredItem={hoveredItem} setHoveredItem={setHoveredItem} />
        ) : (
          // <div>test</div>
          <div>Loading...</div>
        )}
      </Col>
      <Col className="flex-1 py-4">
        {/* <Map data={processedData} uuidHovered={uuidHovered} /> */}

        {processedData && processedData.length > 0 ? (
          <DatasetMapOL data={processedData} hoveredItem={hoveredItem} setHoveredItem={setHoveredItem} />
        ) : (
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transform">
            <div className="h-32 w-32 animate-spin rounded-full border-b-2 border-t-2 border-gray-900"></div>
          </div>
        )}
      </Col>
    </Row>
  );
}
