import { Col, Input, Row } from "antd";
import { useData } from "../state/DataProvider";
import DataList from "../components/DataList";
import Map from "../components/Map";

export default function Dataset() {
  const { data } = useData();

  // console.log(data);
  return (
    <Row
      style={{
        width: "100%",
        height: "100%",
      }}
    >
      <Col className="flex flex-col align-middle p-3  w-96 pr-4 ">
        <Input.Search placeholder="Search" />
        {data ? <DataList data={data} /> : <div>Loading...</div>}
      </Col>
      <Col className="flex-1">
        <Map lat={37.7749} lng={-7.4194} />
      </Col>
    </Row>
  );
}
