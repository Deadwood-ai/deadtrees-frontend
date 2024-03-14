import { Button, Col, Row, Tag, Typography } from "antd";
import { useParams, useNavigate } from "react-router-dom";
import { useData } from "../state/DataProvider";

import { ArrowLeftOutlined, BackwardFilled, EnvironmentFilled, EnvironmentOutlined } from "@ant-design/icons";
import DatasetDetailsMap from "../components/DatasetDetailsMap";

export default function DatasetDetails() {
  const navigate = useNavigate();
  const { id } = useParams();
  const data = useData();
  const dataset = data.data?.find((d) => d.uuid === id);
  console.log(dataset);
  const date = new Date(dataset?.aquisition_date);
  return (
    <Row
      style={{
        width: "100%",
        height: "100%",
      }}
    >
      <Col className="flex flex-col align-middle p-3  w-96 pr-4 ">
        {/* {id} */}
        {dataset ? (
          <div className="p-2">
            <div>
              <Button
                size="large"
                shape="circle"
                onClick={() => navigate(-1)}
                // type="primary"
                icon={<ArrowLeftOutlined />}
              ></Button>
            </div>
            <div className="bg-white p-4 mt-4 rounded-md">
              <div className="flex items-center pb-4">
                <EnvironmentOutlined style={{ fontSize: 24 }} className="pr-2" />
                <Typography.Title style={{ margin: 0 }} level={4}>
                  {dataset.file_name}
                </Typography.Title>
              </div>

              <div className="flex p-1">
                <Typography.Text className="pr-2">Acquisition Date: </Typography.Text>
                <Typography.Text strong>
                  {date.toLocaleString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </Typography.Text>
              </div>
              <div className="flex p-1">
                <Typography.Text className="pr-2">Content Type: </Typography.Text>
                <Typography.Text strong>{dataset.content_type}</Typography.Text>
              </div>
            </div>
            <div className="bg-white p-4 mt-4 rounded-md">
              <div className="flex justify-between p-2">
                <Typography.Text style={{ margin: 0 }}>
                  <Typography.Text className="pr-2">License: </Typography.Text>
                </Typography.Text>
                <Tag color="blue">{dataset.license}</Tag>
              </div>
              <div className="flex justify-between p-2">
                <Typography.Text style={{ margin: 0 }}>
                  <Typography.Text className="pr-2">Platform: </Typography.Text>
                </Typography.Text>
                <Tag color="blue">{dataset.platform}</Tag>
              </div>
              <div className="flex justify-between p-2">
                <Typography.Text style={{ margin: 0 }}>
                  <Typography.Text className="pr-2">Status: </Typography.Text>
                </Typography.Text>
                <Tag color="blue">{dataset.status}</Tag>
              </div>
            </div>
          </div>
        ) : (
          <div>Loading...</div>
        )}
      </Col>
      <Col className="flex-1">
        <DatasetDetailsMap data={dataset} />
      </Col>
    </Row>
  );
}
