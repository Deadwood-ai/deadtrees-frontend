import { Col, Input, Row, Tag } from "antd";
import { useData } from "../state/DataProvider";
import DataList from "../components/DataList";
import Map from "../components/DatasetMap";

export default function Dataset() {
  const { data, filter } = useData();
  // filter for elements of data with status "processed"
  const processedData = data?.filter((d) => d.status === "processed");

  return (
    <Row
      style={{
        width: "100%",
        height: "100%",
      }}
    >
      <Col className="flex w-96 flex-col p-3  pr-4 align-middle ">
        <div>
          {filter && <h4>Filtered by: {<Tag color="blue">{filter}</Tag>}</h4>}
        </div>
        <Input.Search placeholder="Search" />
        {data ? <DataList data={processedData} /> : <div>Loading...</div>}
      </Col>
      <Col className="flex-1">
        <Map data={processedData} />
      </Col>
    </Row>
  );
}
