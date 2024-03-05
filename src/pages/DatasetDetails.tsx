import { Button, Col, Row } from "antd";
import { useParams, useNavigate } from "react-router-dom";

import Map from "../components/Map";

export default function DatasetDetails() {
  const navigate = useNavigate();
  const { id } = useParams();
  return (
    <Row
      style={{
        width: "100%",
        height: "100%",
      }}
    >
      <Col className="flex flex-col align-middle p-3  w-96 pr-4 ">
        <Button onClick={() => navigate(-1)} type="primary">
          Back
        </Button>
      </Col>
      <Col className="flex-1">
        <Map lat={37.7749} lng={-7.4194} />
      </Col>
    </Row>
  );
}
