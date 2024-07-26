import { Button, Col, Row, Tag, Typography, notification } from "antd";
import { useParams, useNavigate } from "react-router-dom";
import { useData } from "../state/DataProvider";

import { ArrowLeftOutlined, BackwardFilled, EnvironmentFilled, EnvironmentOutlined } from "@ant-design/icons";
import DatasetDetailsMap from "../archive/DatasetDetailsMap";
import DatasetDetailsMapOL from "../components/DatasetDetailsMap/DatasetDetailsMapOL";

export default function DatasetDetails() {
  const navigate = useNavigate();
  const { id } = useParams();
  const data = useData();
  const dataset = data.data?.find((d) => d.id.toString() === id);
  // notification.info({
  //   message: "Loading data can be slow and could fail",
  //   description: "The Applikation is not optimized yet. We are working on it.",

  //   // placement: "bottomLeft",
  //   // duration: 10,
  // });
  const date = new Date(dataset?.aquisition_date);
  return (
    <Row
      style={{
        width: "100%",
        height: "100%",
      }}
    >
      <Col className="flex w-96 flex-col p-3  pr-4 align-middle ">
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
            <div className="mt-4 rounded-md bg-white p-4">
              <div className="flex items-center pb-4">
                <EnvironmentOutlined style={{ fontSize: 24, color: "#1890ff" }} className="pr-2" />
                <Typography.Title style={{ margin: 0 }} level={5}>
                  {dataset.gadm_NAME_3 ? dataset.gadm_NAME_3 : "Unknown"}
                </Typography.Title>
              </div>

              <div className="flex justify-between  p-1">
                <Typography.Text className="pr-2">Author: </Typography.Text>
                <Typography.Text strong>{dataset.authors_image}</Typography.Text>
              </div>
              {dataset.citation_doi && (
                <div className="flex justify-between p-1">
                  <Typography.Text className="pr-2">DOI: </Typography.Text>
                  <Typography.Text strong>{dataset.citation_doi}</Typography.Text>
                </div>
              )}
              <div className="flex justify-between p-1">
                <Typography.Text className="pr-2">Acquisition Date: </Typography.Text>
                <Typography.Text strong>
                  {date.toLocaleString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </Typography.Text>
              </div>
              <div className="flex justify-between p-1">
                <Typography.Text className="pr-2">Has Labels: </Typography.Text>
                <Typography.Text strong>{dataset.has_labels ? "true" : "false"}</Typography.Text>
              </div>
              {/* <div className="flex justify-between p-1">
                <Typography.Text className="pr-2">Public: </Typography.Text>
                <Typography.Text strong>
                  {dataset.public ? "true" : "false"}
                </Typography.Text>
              </div> */}
            </div>

            <div className="mt-4 rounded-md bg-white p-4">
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
                  <Typography.Text className="pr-2">File Size: </Typography.Text>
                </Typography.Text>
                {(dataset.file_size / 1000000).toFixed(0)} MB
              </div>
              <div className="flex justify-between p-2">
                <Typography.Text style={{ margin: 0 }}>
                  <Typography.Text className="pr-2">Spectral Properties : </Typography.Text>
                </Typography.Text>
                <Tag color="blue">
                  {" "}
                  {dataset.image_spectral_properties ? dataset.image_spectral_properties : "Unknown"}
                </Tag>
              </div>
            </div>
            <div className="mt-4 rounded-md bg-white p-4">
              <div className="flex justify-between p-2">
                <Typography.Text style={{ margin: 0 }}>
                  <Typography.Text className="pr-2">Label Source: </Typography.Text>
                </Typography.Text>
                <Tag color="blue">{dataset.label_source}</Tag>
              </div>
              <div className="flex justify-between p-2">
                <Typography.Text style={{ margin: 0 }}>
                  <Typography.Text className="pr-2">Label Type: </Typography.Text>
                </Typography.Text>
                <Tag color="blue">{dataset.label_type}</Tag>
              </div>
              <div className="flex justify-between p-2">
                <Typography.Text style={{ margin: 0 }}>
                  <Typography.Text className="pr-2">Label Quality: </Typography.Text>
                </Typography.Text>
                <Tag color="blue">{dataset.label_quality}</Tag>
              </div>
            </div>
          </div>
        ) : (
          <div>Loading...</div>
        )}
      </Col>
      <Col className="flex-1 py-4">
        {/* <DatasetDetailsMap data={dataset} /> */}
        <DatasetDetailsMapOL data={dataset} />
      </Col>
    </Row>
  );
}
