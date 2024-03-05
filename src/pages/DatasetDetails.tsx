import { Button, Col, Row } from "antd";
import { useParams, useNavigate } from "react-router-dom";
import { useData } from "../state/DataProvider";

import Map from "../components/Map";

export default function DatasetDetails() {
  const navigate = useNavigate();
  const { id } = useParams();
  const data = useData();
  const dataset = data.data?.find((d) => d.uuid === id);
  console.log(dataset);
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
        {/* {id} */}
        {dataset ? (
          <div>
            <h1>{dataset.file_name}</h1>
            <p>{dataset.aquisition_date}</p>
            <p>{dataset.file_id}</p>
          </div>
        ) : (
          <div>Loading...</div>
        )}
      </Col>
      <Col className="flex-1">
        <Map lat={37.7749} lng={-7.4194} />
      </Col>
    </Row>
  );
}
