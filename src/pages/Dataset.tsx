import { Button, Col, Input, Row, Tag } from "antd";
import { useData } from "../state/DataProvider";
import DataList from "../components/DataList";
import Map from "../components/DatasetMap";
import { useState } from "react";
import { ArrowDownOutlined, CloseCircleFilled } from "@ant-design/icons";

export default function Dataset() {
  const { data, filter, setFilter } = useData();
  // filter for elements of data with status "processed"
  const processedData = data?.filter((d) => d.status === "processed");
  const [uuidHovered, setUuidHovered] = useState<string | null>(null);

  return (
    <div className="flex h-full ">
      <div className="flex h-full w-96 flex-col  py-4 pr-4 align-middle">
        {filter && (
          <h4>
            Filtered by:{" "}
            {
              <Tag className="m-0" color="blue">
                {filter}
                <Button
                  className="ml-2 border-none bg-transparent"
                  size="small"
                  onClick={() => setFilter("")}
                  icon={<CloseCircleFilled />}
                />
              </Tag>
            }
          </h4>
        )}

        <div className="flex pb-4">
          <Input.Search placeholder="Search" />
          <div className="pl-4">
            <Button icon={<ArrowDownOutlined />} type="primary"></Button>
          </div>
        </div>
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
