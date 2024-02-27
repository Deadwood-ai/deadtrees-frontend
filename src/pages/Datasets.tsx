import { Col, Row } from "antd";
import { useData } from "../state/DataProvider";

export default function Datasets() {
  return (
    <Row
      style={{
        width: "100%",
        height: "100%",
      }}
    >
      <Col
        style={{
          width: "300px",
          backgroundColor: "lightgray",

          paddingRight: "24px",
        }}
      >
        sidebar
      </Col>
      <Col>Map</Col>
    </Row>
  );
}
