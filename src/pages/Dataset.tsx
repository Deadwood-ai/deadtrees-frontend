import { Col, Input, Row, Tag } from "antd";
import { useData } from "../state/DataProvider";
import DataList from "../components/DataList";
import Map from "../components/DatasetMap";

export default function Dataset() {
  const { data, filter } = useData();
  // filter for elements of data with status "processed"
  const processedData = data?.filter((d) => d.status === "processed");

  return (
    <div className="flex h-full ">
      <div className="flex h-full w-96 flex-col  py-4 pr-4 align-middle">
        {filter && <h4>Filtered by: {<Tag color="blue">{filter}</Tag>}</h4>}

        <Input.Search placeholder="Search" />
        {data ? <DataList data={processedData} /> : <div>Loading...</div>}
      </div>
      <div className="flex-1 py-4">
        <Map data={processedData} />
      </div>
    </div>
  );
}
