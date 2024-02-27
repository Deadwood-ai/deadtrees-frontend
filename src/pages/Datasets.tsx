import { Col, Input, Row } from "antd";
import { useData } from "../state/DataProvider";
import DataList from "../components/DataList";
import Map from "../components/Map";

export default function Datasets() {
  const { data } = useData();

  console.log(data);
  return (
    <Row
      style={{
        width: "100%",
        height: "100%",
      }}
    >
      <Col
        style={{
          width: "400px",
          //   backgroundColor: "lightgray",
          paddingRight: "24px",
          display: "flex",
          flexDirection: "column",
          alignContent: "center",
          padding: "12px",
          //   justifyContent: "center",
        }}
      >
        <Input.Search placeholder="Search" />
        {data ? <DataList data={data} /> : <div>Loading...</div>}
      </Col>
      <Col
        style={{
          flex: 1, // Make the column fill the remaining space
          //   display: "flex", // This makes its children (the map) also try to fill the available space
          //   flexDirection: "column",
        }}
      >
        <Map lat={37.7749} lng={-7.4194} />
      </Col>
    </Row>
  );
}
